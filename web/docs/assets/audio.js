/* Audio reading player.
   If a reading has a recording (docs/audio/<same path as the .md>.m4a, see
   README), the build hook appends a plain <audio> element to the page. This
   turns it into a slim bar that floats at the bottom of the screen while the
   text scrolls: play/pause, back 5 s, forward 5 s, a seek bar and volume.
   It remembers where each recording was left off. No dependencies. */
(function () {
  'use strict';

  var POS = 'sikhlit.audio.';
  var SKIP = 5;

  var ICON = {
    play:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.14v13.72L19 12 8 5.14Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7V5m6 0h4v14h-4V5Z"/></svg>',
    back:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z"/><text x="12" y="16.2" text-anchor="middle">5</text></svg>',
    fwd:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8Z"/><text x="12" y="16.2" text-anchor="middle">5</text></svg>',
    vol:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3m13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.47 4.47 0 0 0 16.5 12M14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23Z"/></svg>',
    mute:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3m13.59 3L19 9.59 20.41 11 18 13.41 20.41 15.82 19 17.24l-2.41-2.42-2.42 2.42-1.41-1.42L15.17 13.41 12.76 11l1.41-1.41L16.59 12Z"/></svg>'
  };

  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    t = Math.floor(t);
    var h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60;
    var ss = (s < 10 ? '0' : '') + s;
    return h ? h + ':' + (m < 10 ? '0' : '') + m + ':' + ss : m + ':' + ss;
  }

  function node(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function build() {
    var audio = document.querySelector('audio.aud-src');
    if (!audio || document.querySelector('.aud-bar')) return;

    /* Lift the element out of the article so paragraph mode can't hide it. */
    audio.removeAttribute('controls');
    audio.hidden = true;
    document.body.appendChild(audio);

    var bar = node(
      '<div class="aud-bar" role="region" aria-label="Audio reading">' +
        '<div class="aud-inner">' +
          '<button type="button" class="aud-btn aud-back" title="Back 5 seconds" aria-label="Back 5 seconds">' + ICON.back + '</button>' +
          '<button type="button" class="aud-btn aud-play" title="Play" aria-label="Play">' + ICON.play + '</button>' +
          '<button type="button" class="aud-btn aud-fwd" title="Forward 5 seconds" aria-label="Forward 5 seconds">' + ICON.fwd + '</button>' +
          '<span class="aud-time aud-cur">0:00</span>' +
          '<input type="range" class="aud-seek" min="0" max="1000" step="1" value="0" aria-label="Position">' +
          '<span class="aud-time aud-dur">0:00</span>' +
          '<span class="aud-volwrap">' +
            '<button type="button" class="aud-btn aud-mute" title="Mute" aria-label="Mute">' + ICON.vol + '</button>' +
            '<input type="range" class="aud-vol" min="0" max="100" step="1" value="100" aria-label="Volume">' +
          '</span>' +
        '</div>' +
      '</div>');
    document.body.appendChild(bar);
    document.body.classList.add('has-audio');

    var play = bar.querySelector('.aud-play');
    var back = bar.querySelector('.aud-back');
    var fwd = bar.querySelector('.aud-fwd');
    var seek = bar.querySelector('.aud-seek');
    var cur = bar.querySelector('.aud-cur');
    var dur = bar.querySelector('.aud-dur');
    var mute = bar.querySelector('.aud-mute');
    var vol = bar.querySelector('.aud-vol');
    var dragging = false;
    var key = POS + location.pathname;

    function paintPlay() {
      var on = !audio.paused && !audio.ended;
      play.innerHTML = on ? ICON.pause : ICON.play;
      play.title = on ? 'Pause' : 'Play';
      play.setAttribute('aria-label', play.title);
      bar.classList.toggle('is-playing', on);
    }

    function paintTime() {
      var d = audio.duration;
      cur.textContent = fmt(audio.currentTime);
      dur.textContent = fmt(d);
      if (!dragging && isFinite(d) && d > 0) {
        seek.value = String(Math.round(audio.currentTime / d * 1000));
      }
      seek.style.setProperty('--aud-fill', (seek.value / 10) + '%');
    }

    function paintVol() {
      var v = audio.muted ? 0 : audio.volume;
      vol.value = String(Math.round(v * 100));
      vol.style.setProperty('--aud-fill', vol.value + '%');
      mute.innerHTML = v === 0 ? ICON.mute : ICON.vol;
      mute.title = audio.muted ? 'Unmute' : 'Mute';
      mute.setAttribute('aria-label', mute.title);
    }

    function nudge(by) {
      var d = audio.duration;
      var t = audio.currentTime + by;
      if (isFinite(d)) t = Math.min(t, d);
      audio.currentTime = Math.max(0, t);
      paintTime();
    }

    play.addEventListener('click', function () {
      if (audio.paused || audio.ended) {
        var p = audio.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        audio.pause();
      }
    });
    back.addEventListener('click', function () { nudge(-SKIP); });
    fwd.addEventListener('click', function () { nudge(SKIP); });

    seek.addEventListener('input', function () {
      dragging = true;
      var d = audio.duration;
      seek.style.setProperty('--aud-fill', (seek.value / 10) + '%');
      if (isFinite(d)) cur.textContent = fmt(seek.value / 1000 * d);
    });
    seek.addEventListener('change', function () {
      var d = audio.duration;
      if (isFinite(d)) audio.currentTime = seek.value / 1000 * d;
      dragging = false;
      paintTime();
    });

    vol.addEventListener('input', function () {
      audio.volume = vol.value / 100;
      audio.muted = audio.volume === 0;
    });
    mute.addEventListener('click', function () {
      if (audio.muted || audio.volume === 0) {
        if (audio.volume === 0) audio.volume = 1;
        audio.muted = false;
      } else {
        audio.muted = true;
      }
    });

    audio.addEventListener('play', paintPlay);
    audio.addEventListener('pause', paintPlay);
    audio.addEventListener('ended', function () {
      paintPlay();
      try { localStorage.removeItem(key); } catch (e) {}
    });
    audio.addEventListener('timeupdate', paintTime);
    audio.addEventListener('durationchange', paintTime);
    audio.addEventListener('volumechange', paintVol);
    audio.addEventListener('error', function () {
      bar.classList.add('is-error');
      cur.textContent = '';
      dur.textContent = 'Audio unavailable';
    }, true);

    /* Resume where the listener left off on this page. */
    var saved = 0;
    try { saved = parseFloat(localStorage.getItem(key) || '0') || 0; } catch (e) {}
    if (saved > 3) {
      var resume = function () {
        if (isFinite(audio.duration) && saved < audio.duration - 3) audio.currentTime = saved;
        paintTime();
      };
      if (audio.readyState >= 1) resume();
      else audio.addEventListener('loadedmetadata', resume, { once: true });
    }
    var last = 0;
    audio.addEventListener('timeupdate', function () {
      var now = Date.now();
      if (now - last < 3000) return;
      last = now;
      try { localStorage.setItem(key, String(audio.currentTime)); } catch (e) {}
    });
    audio.addEventListener('pause', function () {
      try { localStorage.setItem(key, String(audio.currentTime)); } catch (e) {}
    });

    /* Lock-screen / headphone controls where the browser supports them. */
    if ('mediaSession' in navigator) {
      try {
        var h1 = document.querySelector('article h1');
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: h1 ? h1.textContent.replace(/\s*¶\s*$/, '').trim() : document.title,
          artist: 'Sikh Literature'
        });
        navigator.mediaSession.setActionHandler('seekbackward', function () { nudge(-SKIP); });
        navigator.mediaSession.setActionHandler('seekforward', function () { nudge(SKIP); });
      } catch (e) {}
    }

    /* iPhone and iPad ignore script volume (the hardware buttons own it);
       don't show a slider that does nothing. */
    audio.volume = 0.5;
    if (Math.abs(audio.volume - 0.5) > 0.01) bar.classList.add('no-volume');
    audio.volume = 1;

    paintPlay();
    paintTime();
    paintVol();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
