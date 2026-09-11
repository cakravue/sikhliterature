/* Footnote popups.
   Turns the numbered footnotes at the bottom of the page into a small panel
   that opens where the reader is, so a gloss never costs them their place.
   No dependencies, nothing loaded from the internet: works offline. */
(function () {
  'use strict';

  var open = null;

  function close() {
    if (open) { open.remove(); open = null; }
    document.querySelectorAll('.fn-open').forEach(function (e) {
      e.classList.remove('fn-open');
    });
  }

  function contentFor(id) {
    var li = document.getElementById(id);
    if (!li) return null;
    var clone = li.cloneNode(true);
    clone.querySelectorAll('.footnote-backref').forEach(function (b) { b.remove(); });
    return clone.innerHTML.trim();
  }

  function place(pop, ref) {
    var r = ref.getBoundingClientRect();
    var margin = 12;
    var top = window.scrollY + r.bottom + 8;
    pop.style.top = top + 'px';

    var width = pop.offsetWidth;
    var left = window.scrollX + r.left + r.width / 2 - width / 2;
    left = Math.max(window.scrollX + margin, left);
    left = Math.min(left, window.scrollX + document.documentElement.clientWidth - width - margin);
    pop.style.left = left + 'px';

    // If it would fall off the bottom of the viewport, flip it above the marker.
    var overflow = top + pop.offsetHeight - (window.scrollY + window.innerHeight);
    if (overflow > 0 && r.top > pop.offsetHeight + 16) {
      pop.style.top = (window.scrollY + r.top - pop.offsetHeight - 8) + 'px';
    }
  }

  function show(ref) {
    var href = ref.getAttribute('href') || '';
    if (href.charAt(0) !== '#') return;
    var html = contentFor(href.slice(1));
    if (!html) return;

    close();
    var pop = document.createElement('div');
    pop.className = 'fn-popup';
    pop.setAttribute('role', 'dialog');
    pop.innerHTML = html;
    document.body.appendChild(pop);
    open = pop;
    ref.classList.add('fn-open');
    place(pop, ref);
  }

  document.addEventListener('click', function (e) {
    var ref = e.target.closest('a.footnote-ref, .footnote-ref a, sup[id^="fnref"] a');
    if (ref) {
      e.preventDefault();
      if (ref.classList.contains('fn-open')) { close(); } else { show(ref); }
      return;
    }
    if (open && !e.target.closest('.fn-popup')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  window.addEventListener('resize', close);
})();
