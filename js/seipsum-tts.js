/**
 * seipsum-tts.js — drop-in "Listen" audio playback for page sections.
 * Uses the browser's built-in Web Speech API (speechSynthesis).
 *
 * Features:
 *   - Listen / Stop button on every content section
 *   - "Listen to whole page" button (reads all sections in order)
 *   - Voice picker dropdown (remembers the visitor's choice via localStorage)
 *
 * Usage:
 *   <script src="/js/seipsum-tts.js" defer></script>
 *
 * By default it adds buttons to every element with class "section".
 * Change SELECTOR below to match your markup, e.g.
 * 'section', 'article', '.post', 'main > div'.
 *
 * The voice picker and "whole page" button are inserted in a bar
 * right above the first section. Alternatively, place
 *   <div id="tts-bar"></div>
 * anywhere on the page to choose the bar's location yourself.
 */

(function () {
  'use strict';

  var SELECTOR = '.section';
  var BUTTON_LABEL = '\uD83D\uDD0A Listen';        // loudspeaker emoji
  var STOP_LABEL = '\u23F9 Stop';                   // stop button emoji
  var PAGE_LABEL = '\u25B6 Listen to whole page';   // play triangle
  var PAGE_STOP_LABEL = '\u23F9 Stop playback';
  var PREFERRED_LANG = 'en-US';
  var STORAGE_KEY = 'seipsum-tts-voice';
  var BAR_ID = 'tts-bar';

  var synth = window.speechSynthesis;
  var activeButton = null;
  var pageButton = null;
  var pageMode = false;
  var pageQueue = [];
  var chosenVoiceURI = null;

  // ---- voice selection: pick the best available, don't hardcode one ----
  function pickVoice(voices) {
    var ranked = voices.filter(function (v) {
      return v.lang && v.lang.indexOf(PREFERRED_LANG.slice(0, 2)) === 0;
    });
    if (!ranked.length) return null;
    var score = function (v) {
      var s = 0;
      if (v.lang === PREFERRED_LANG) s += 10;
      if (/google/i.test(v.name)) s += 5;
      if (/natural|neural|premium|enhanced/i.test(v.name)) s += 5;
      if (v.localService) s += 3;
      return s;
    };
    return ranked.slice().sort(function (a, b) { return score(b) - score(a); })[0];
  }

  // The voice to actually use: the user's pick if valid, else the best one.
  function currentVoice() {
    var voices = synth.getVoices();
    if (!voices.length) return null;
    if (chosenVoiceURI) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].voiceURI === chosenVoiceURI) return voices[i];
      }
    }
    return pickVoice(voices);
  }

  function resetButtonState() {
    if (activeButton) {
      activeButton.textContent = BUTTON_LABEL;
      activeButton.dataset.speaking = 'false';
      activeButton = null;
    }
    if (pageButton) {
      pageButton.textContent = PAGE_LABEL;
      pageButton.dataset.speaking = 'false';
    }
    pageMode = false;
    pageQueue = [];
  }

  // Extract the readable text of a section (strip buttons/nav).
  function sectionText(section) {
    var clone = section.cloneNode(true);
    Array.prototype.forEach.call(
      clone.querySelectorAll('button, nav, select, .no-tts'),
      function (el) { el.remove(); }
    );
    return (clone.innerText || clone.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function speak(text, onDone) {
    // Stop anything already playing (one section at a time)
    synth.cancel();

    var u = new SpeechSynthesisUtterance(text);
    u.lang = PREFERRED_LANG;
    var voice = currentVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = 0.95; // slightly slower reads better for dense prose

    u.onend = onDone || null;
    u.onerror = onDone || null;

    synth.speak(u);
  }

  // ---------- section playback ----------

  function playSection(section, button) {
    synth.cancel();
    resetButtonState();
    activeButton = button;
    button.textContent = STOP_LABEL;
    button.dataset.speaking = 'true';
    var text = sectionText(section);
    if (text) {
      speak(text, resetButtonState);
    } else {
      resetButtonState();
    }
  }

  function toggle(section, button) {
    if (button.dataset.speaking === 'true' && synth.speaking) {
      synth.cancel();
      resetButtonState();
    } else {
      playSection(section, button);
    }
  }

  // ---------- whole page playback ----------

  function playWholePage(sections) {
    synth.cancel();
    resetButtonState();
    pageMode = true;
    if (pageButton) {
      pageButton.textContent = PAGE_STOP_LABEL;
      pageButton.dataset.speaking = 'true';
    }
    pageQueue = Array.prototype.slice.call(sections);

    function next() {
      if (!pageMode || !pageQueue.length) {
        resetButtonState();
        return;
      }
      var section = pageQueue.shift();
      // highlight the section currently being read
      var prev = document.querySelector('.tts-active');
      if (prev) prev.classList.remove('tts-active');
      section.classList.add('tts-active');
      var text = sectionText(section);
      if (text) {
        speak(text, next);
      } else {
        next();
      }
    }
    next();
  }

  function togglePage(sections) {
    if (pageMode) {
      synth.cancel();
      resetButtonState();
    } else {
      playWholePage(sections);
    }
  }

  // ---------- control bar (voice picker + whole page button) ----------

  function buildVoicePicker(select) {
    function fill() {
      var voices = synth.getVoices();
      select.innerHTML = '';
      voices.forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = v.name + ' (' + v.lang + ')';
        select.appendChild(opt);
      });
      var cur = currentVoice();
      if (cur) select.value = cur.voiceURI;
    }
    fill();
    // Chrome populates the voice list asynchronously
    if (typeof synth.onvoiceschanged !== 'undefined') {
      synth.onvoiceschanged = fill;
    }
    select.addEventListener('change', function () {
      chosenVoiceURI = select.value;
      try {
        localStorage.setItem(STORAGE_KEY, chosenVoiceURI);
      } catch (e) { /* private mode etc. */ }
      // stop current playback; press Listen again for the new voice
      if (synth.speaking) {
        synth.cancel();
        resetButtonState();
      }
    });
  }

  function buildBar(sections) {
    // Use an existing <div id="tts-bar"> if present, else create one
    var bar = document.getElementById(BAR_ID);
    if (!bar) {
      bar = document.createElement('div');
      bar.id = BAR_ID;
      sections[0].parentNode.insertBefore(bar, sections[0]);
    }

    var label = document.createElement('span');
    label.className = 'tts-voice-label';
    label.textContent = 'Voice:';
    bar.appendChild(label);

    var select = document.createElement('select');
    select.className = 'tts-voice-select';
    select.setAttribute('aria-label', 'Choose reading voice');
    buildVoicePicker(select);
    bar.appendChild(select);

    pageButton = document.createElement('button');
    pageButton.type = 'button';
    pageButton.className = 'tts-btn tts-page-btn';
    pageButton.textContent = PAGE_LABEL;
    pageButton.setAttribute('aria-label', 'Listen to the whole page');
    pageButton.dataset.speaking = 'false';
    pageButton.addEventListener('click', function () { togglePage(sections); });
    bar.appendChild(pageButton);
  }

  function init() {
    if (!('speechSynthesis' in window)) return; // browser too old: hide feature

    // Restore the visitor's saved voice choice
    try {
      chosenVoiceURI = localStorage.getItem(STORAGE_KEY);
    } catch (e) { chosenVoiceURI = null; }

    // Some browsers load voices asynchronously; prime the list early.
    synth.getVoices();

    // Only top-level sections: skip sections nested inside another section,
    // so a "section in section" gets exactly one button and is read once.
    var all = document.querySelectorAll(SELECTOR);
    var sections = [];
    for (var i = 0; i < all.length; i++) {
      if (!all[i].parentElement ||
          !all[i].parentElement.closest(SELECTOR)) {
        sections.push(all[i]);
      }
    }
    if (!sections.length) return;

    sections.forEach(function (section) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tts-btn';
      btn.textContent = BUTTON_LABEL;
      btn.setAttribute('aria-label', 'Listen to this section');
      btn.dataset.speaking = 'false';
      btn.addEventListener('click', function () { toggle(section, btn); });
      section.insertBefore(btn, section.firstChild);
    });

    buildBar(sections);

    // Stop reading if the visitor leaves the page
    window.addEventListener('beforeunload', function () { synth.cancel(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
