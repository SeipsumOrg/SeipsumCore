/**
 * seipsum-tts.js — drop-in "Listen" audio playback for page sections.
 * Uses the browser's built-in Web Speech API (speechSynthesis).
 *
 * Features:
 *   - Play / Pause / Resume button on every content section
 *   - Reading speed selector (persisted per visitor)
 *   - "Listen to whole page" button (reads all sections in order)
 *   - Voice picker, auto-matched to the page language (html lang="...")
 *     and remembered per language
 *
 * Usage:
 *   <script src="/js/seipsum-tts.js" defer></script>
 *
 * By default it adds buttons to every element with class "section".
 * Change SELECTOR below to match your markup.
 *
 * The control bar (voice + speed + whole page) is inserted right above
 * the first section, or use <div id="tts-bar"></div> to place it yourself.
 */

(function () {
  'use strict';

  var SELECTOR = '.section';

  // --- labels ---
  var PLAY_LABEL = '\u25B6 Listen';
  var PAUSE_LABEL = '\u23F8 Pause';
  var RESUME_LABEL = '\u25B6 Resume';
  var STOP_LABEL = '\u23F9 Stop';
  var PAGE_LABEL = '\u25B6 Listen to whole page';
  var PAGE_PAUSE_LABEL = '\u23F8 Pause page';
  var PAGE_STOP_LABEL = '\u23F9 Stop playback';

  var BAR_ID = 'tts-bar';

  // --- language handling ---
  var LANG_PREFS = { en: 'en-US', ro: 'ro-RO' };
  var DEFAULT_LANG = 'en';

  function pageLang() {
    var lang = (document.documentElement.lang || DEFAULT_LANG).toLowerCase();
    return LANG_PREFS[lang] ? lang : DEFAULT_LANG;
  }

  function storageKey(kind, lang) {
    return 'seipsum-tts-' + kind + '-' + lang;
  }

  // --- reading speed ---
  var SPEEDS = [0.75, 0.9, 1, 1.1, 1.25, 1.5];
  var rate = 0.95; // fallback; replaced by saved/default at init
  var rateSelect = null;

  // --- state ---
  var synth = window.speechSynthesis;
  var CUR_LANG = 'en';
  var PREFERRED_LANG = 'en-US';
  var chosenVoiceURI = {};  // per language: { en: 'voiceURI', ro: '...' }

  // A playback session = ordered sentence chunks + a position.
  // kind: 'section' | 'page'
  var session = null;
  // { kind, chunks:[{text, sectionEl}], idx, paused, playing,
  //   button, isPageButton }
  var pageButton = null;

  // ---------- text preparation ----------

  // Split text into sentence-ish chunks (with section reference).
  function splitChunks(text, sectionEl) {
    var parts = text
      .replace(/([.!?])\s+/g, '$1\u0001')
      .replace(/([:;])\s+/g, '$1\u0001')
      .split('\u0001');
    var chunks = [];
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i].trim();
      if (!t) continue;
      // merge very short fragments into the previous chunk
      if (chunks.length && t.length < 20) {
        chunks[chunks.length - 1].text += ' ' + t;
      } else {
        chunks.push({ text: t, sectionEl: sectionEl });
      }
    }
    return chunks;
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

  // ---------- voices ----------

  function scoreVoice(v) {
    var s = 0;
    if (v.lang && v.lang.toLowerCase() === PREFERRED_LANG.toLowerCase()) s += 10;
    if (/google/i.test(v.name)) s += 5;
    if (/natural|neural|premium|enhanced/i.test(v.name)) s += 5;
    if (v.localService) s += 3;
    return s;
  }

  function pickVoice(voices) {
    var ranked = voices.filter(function (v) {
      return v.lang && v.lang.toLowerCase().indexOf(CUR_LANG) === 0;
    });
    if (!ranked.length) ranked = voices.filter(function (v) {
      return v.lang && v.lang.toLowerCase().indexOf(PREFERRED_LANG) === 0;
    });
    if (!ranked.length) return null;
    return ranked.slice().sort(function (a, b) {
      return scoreVoice(b) - scoreVoice(a);
    })[0];
  }

  function currentVoice() {
    var voices = synth.getVoices();
    if (!voices.length) return null;
    var saved = chosenVoiceURI[CUR_LANG];
    if (saved) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].voiceURI === saved) return voices[i];
      }
    }
    return pickVoice(voices);
  }

  // ---------- session engine ----------

  function stopAll() {
    synth.cancel();
    session = null;
    clearHighlight();
    syncButtons();
  }

  function clearHighlight() {
    var prev = document.querySelector('.tts-active');
    if (prev) prev.classList.remove('tts-active');
  }

  function highlightSection(el) {
    if (!el) return;
    if (!el.classList.contains('tts-active')) {
      clearHighlight();
      el.classList.add('tts-active');
    }
  }

  // Speak the chunk at session.idx, then advance.
  function speakCurrent() {
    if (!session) return;
    if (session.idx >= session.chunks.length) {
      // finished
      var wasPage = session.kind === 'page';
      stopAll();
      return;
    }
    var chunk = session.chunks[session.idx];
    highlightSection(chunk.sectionEl);

    var u = new SpeechSynthesisUtterance(chunk.text);
    var voice = currentVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = PREFERRED_LANG;
    }
    u.rate = rate;
    u.onend = function () {
      if (!session || session.paused) return;
      session.idx++;
      speakCurrent();
    };
    u.onerror = function () {
      if (!session) return;
      session.idx = session.chunks.length; // don't loop on error
      stopAll();
    };
    synth.speak(u);
  }

  function startSession(chunks, kind, button) {
    synth.cancel();
    clearHighlight();
    session = {
      kind: kind,
      chunks: chunks,
      idx: 0,
      paused: false,
      playing: true,
      button: button || null,
      isPageButton: kind === 'page'
    };
    syncButtons();
    speakCurrent();
  }

  function playSection(section, button) {
    var text = sectionText(section);
    if (!text) return;
    startSession(splitChunks(text, section), 'section', button);
  }

  function playWholePage(sections) {
    var chunks = [];
    sections.forEach(function (section) {
      var text = sectionText(section);
      if (text) chunks = chunks.concat(splitChunks(text, section));
    });
    if (!chunks.length) return;
    startSession(chunks, 'page', pageButton);
  }

  // Pause / resume
  function togglePause() {
    if (!session) return;
    if (session.paused) {
      session.paused = false;
      synth.resume();
      // Some browsers forget the queue on resume; if nothing is
      // speaking, re-speak the current chunk from its start.
      if (!synth.speaking) speakCurrent();
    } else {
      session.paused = true;
      synth.pause();
    }
    syncButtons();
  }

  // ---------- button labels ----------

  function syncButtons() {
    // Section buttons: reset everything first
    document.querySelectorAll('.tts-btn.tts-play').forEach(function (b) {
      b.textContent = PLAY_LABEL;
    });
    if (session && session.button && !session.isPageButton) {
      session.button.textContent = session.paused ? RESUME_LABEL
        : (session.idx >= session.chunks.length ? PLAY_LABEL : PAUSE_LABEL);
    }
    if (pageButton) {
      pageButton.textContent = PAGE_LABEL;
    }
    if (session && session.isPageButton && pageButton) {
      pageButton.textContent = session.paused ? RESUME_LABEL : PAGE_PAUSE_LABEL;
    }
  }

  // ---------- control bar ----------

  function buildVoicePicker(select) {
    function fill() {
      var voices = synth.getVoices();
      var mine = voices.filter(function (v) {
        return v.lang && v.lang.toLowerCase().indexOf(CUR_LANG) === 0;
      });
      var others = voices.filter(function (v) { return mine.indexOf(v) === -1; });

      select.innerHTML = '';
      mine.forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.textContent = v.name + ' (' + v.lang + ')';
        select.appendChild(opt);
      });
      if (others.length) {
        var sep = document.createElement('option');
        sep.disabled = true;
        sep.textContent = '--- other languages ---';
        select.appendChild(sep);
        others.forEach(function (v) {
          var opt = document.createElement('option');
          opt.value = v.voiceURI;
          opt.textContent = v.name + ' (' + v.lang + ')';
          select.appendChild(opt);
        });
      }
      var cur = currentVoice();
      if (cur) select.value = cur.voiceURI;
    }
    fill();
    if (typeof synth.onvoiceschanged !== 'undefined') {
      synth.onvoiceschanged = fill;
    }
    select.addEventListener('change', function () {
      chosenVoiceURI[CUR_LANG] = select.value;
      try {
        localStorage.setItem(storageKey('voice', CUR_LANG), select.value);
      } catch (e) {}
      if (session) {
        // re-speak the current sentence with the new voice
        synth.cancel();
        speakCurrent();
      }
    });
  }

  function buildRateSelect() {
    rateSelect = document.createElement('select');
    rateSelect.className = 'tts-rate-select';
    rateSelect.setAttribute('aria-label', 'Reading speed');
    SPEEDS.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = String(s);
      opt.textContent = s + '\u00D7';
      rateSelect.appendChild(opt);
    });
    rateSelect.value = String(rate);
    rateSelect.addEventListener('change', function () {
      rate = parseFloat(rateSelect.value);
      try {
        localStorage.setItem('seipsum-tts-rate', String(rate));
      } catch (e) {}
      if (session && !session.paused) {
        // apply immediately: re-speak the current sentence at new speed
        synth.cancel();
        speakCurrent();
      }
    });
    return rateSelect;
  }

  function buildBar(sections) {
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

    var rateLabel = document.createElement('span');
    rateLabel.className = 'tts-voice-label';
    rateLabel.textContent = 'Speed:';
    bar.appendChild(rateLabel);
    bar.appendChild(buildRateSelect());

    pageButton = document.createElement('button');
    pageButton.type = 'button';
    pageButton.className = 'tts-btn tts-page-btn';
    pageButton.textContent = PAGE_LABEL;
    pageButton.setAttribute('aria-label', 'Listen to the whole page');
    pageButton.addEventListener('click', function () {
      if (!session) {
        playWholePage(sections);
      } else if (session.isPageButton) {
        // playing the whole page: first click pauses, second stops
        if (session.paused) {
          togglePause();
        } else if (session.stopArmed) {
          stopAll();
        } else {
          togglePause();
          session.stopArmed = true;
          pageButton.textContent = STOP_LABEL;
        }
      } else {
        // a section is playing; switch to whole page
        playWholePage(sections);
      }
    });
    bar.appendChild(pageButton);
  }

  // ---------- init ----------

  function init() {
    if (!('speechSynthesis' in window)) return;

    CUR_LANG = pageLang();
    PREFERRED_LANG = LANG_PREFS[CUR_LANG];

    try {
      chosenVoiceURI[CUR_LANG] =
        localStorage.getItem(storageKey('voice', CUR_LANG));
      var savedRate = parseFloat(localStorage.getItem('seipsum-tts-rate'));
      rate = SPEEDS.indexOf(savedRate) !== -1 ? savedRate : 0.95;
    } catch (e) { rate = 0.95; }

    synth.getVoices();

    // Only top-level sections (skip sections nested in sections)
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
      var controls = document.createElement('div');
      controls.className = 'tts-controls';

      var play = document.createElement('button');
      play.type = 'button';
      play.className = 'tts-btn tts-play';
      play.textContent = PLAY_LABEL;
      play.setAttribute('aria-label', 'Listen to this section');
      play.addEventListener('click', function () {
        if (session && !session.isPageButton && session.button === play) {
          if (session.idx >= session.chunks.length) {
            playSection(section, play); // finished: start over
          } else {
            togglePause();
          }
        } else {
          playSection(section, play);
        }
      });

      controls.appendChild(play);
      section.insertBefore(controls, section.firstChild);
    });

    buildBar(sections);

    window.addEventListener('beforeunload', function () { synth.cancel(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
