/**
 * seipsum-tts.js — drop-in "Listen" audio playback for page sections.
 * Uses the browser's built-in Web Speech API (speechSynthesis).
 *
 * Usage:
 *   <script src="/js/seipsum-tts.js" defer></script>
 *
 * By default it adds a 🔊 Listen button to every element with
 * class "section". Change SELECTOR below to match your markup, e.g.
 * 'section', 'article', '.post', 'main > div'.
 */

(function () {
  'use strict';

  var SELECTOR = '.section';               // which page sections get a button
  var BUTTON_LABEL = '\u{1F50A} Listen';   // shown before playback
  var STOP_LABEL = '\u26A0 Stop';          // shown during playback
  var PREFERRED_LANG = 'en-US';            // voice language preference

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

  function speak(text, button) {
    var synth = window.speechSynthesis;

    // Stop anything already playing (one section at a time)
    synth.cancel();

    var u = new SpeechSynthesisUtterance(text);
    u.lang = PREFERRED_LANG;
    var voice = pickVoice(synth.getVoices());
    if (voice) u.voice = voice;
    u.rate = 0.95; // slightly slower reads better for dense prose

    var done = function () {
      button.textContent = BUTTON_LABEL;
      button.dataset.speaking = 'false';
    };
    u.onend = done;
    u.onerror = done;
    button.textContent = STOP_LABEL;
    button.dataset.speaking = 'true';

    synth.speak(u);
  }

  function toggle(section, button) {
    var synth = window.speechSynthesis;
    if (button.dataset.speaking === 'true' && synth.speaking) {
      synth.cancel();
      button.textContent = BUTTON_LABEL;
      button.dataset.speaking = 'false';
    } else {
      // Strip buttons/nav from the spoken text
      var clone = section.cloneNode(true);
      Array.prototype.forEach.call(
        clone.querySelectorAll('button, nav, .no-tts'),
        function (el) { el.remove(); }
      );
      var text = (clone.innerText || clone.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) speak(text, button);
    }
  }

  function init() {
    if (!('speechSynthesis' in window)) return; // browser too old: hide feature

    // Some browsers load voices asynchronously; prime the list early.
    window.speechSynthesis.getVoices();

    document.querySelectorAll(SELECTOR).forEach(function (section) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tts-btn';
      btn.textContent = BUTTON_LABEL;
      btn.setAttribute('aria-label', 'Listen to this section');
      btn.dataset.speaking = 'false';
      btn.addEventListener('click', function () { toggle(section, btn); });
      section.insertBefore(btn, section.firstChild);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
