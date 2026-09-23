/* Reader mode.
   A small e-reader laid over the page: typeface, size, measure, leading,
   alignment, page tint, collapsible sidebars, and a paragraph-at-a-time
   focus mode. Everything is remembered in the browser; nothing is sent
   anywhere and nothing is needed from the network except the webfonts the
   reader actually picks. */
(function () {
  'use strict';

  var KEY = 'sikhlit.reader.v1';
  var POS = 'sikhlit.pos.';
  var root = document.documentElement;

  /* ---------------------------------------------------------------- fonts */

  var FONTS = [
    { id: 'lora',        name: 'Lora',                      family: 'Lora',
      v2: 'Lora:ital,wght@0,400;0,600;1,400;1,600', v1: 'Lora:400,400i,700,700i' },
    { id: 'literata',    name: 'Literata  ·  Play Books',   family: 'Literata',
      v2: 'Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400;1,7..72,600', v1: 'Literata:400,400i,700,700i' },
    { id: 'garamond',    name: 'EB Garamond',               family: 'EB Garamond',
      v2: 'EB+Garamond:ital,wght@0,400;0,600;1,400;1,600', v1: 'EB+Garamond:400,400i,700,700i' },
    { id: 'goudy',       name: 'Sorts Mill Goudy',          family: 'Sorts Mill Goudy',
      v2: 'Sorts+Mill+Goudy:ital@0;1', v1: 'Sorts+Mill+Goudy:400,400i' },
    { id: 'crimson',     name: 'Crimson Pro',               family: 'Crimson Pro',
      v2: 'Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600', v1: 'Crimson+Pro:400,400i,700,700i' },
    { id: 'newsreader',  name: 'Newsreader',                family: 'Newsreader',
      v2: 'Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400;1,6..72,600', v1: 'Newsreader:400,400i,700,700i' },
    { id: 'sourceserif', name: 'Source Serif',              family: 'Source Serif 4',
      v2: 'Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400;1,8..60,600', v1: 'Source+Serif+4:400,400i,700,700i' },
    { id: 'baskerville', name: 'Libre Baskerville',         family: 'Libre Baskerville',
      v2: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400', v1: 'Libre+Baskerville:400,400i,700' },
    { id: 'georgia',     name: 'Georgia  ·  no download',   family: 'Georgia' },
    { id: 'inter',       name: 'Inter  ·  sans',            family: 'Inter', sans: true,
      v2: 'Inter:ital,opsz,wght@0,14..32,400;0,14..32,600;1,14..32,400;1,14..32,600', v1: 'Inter:400,400i,700,700i' },
    { id: 'atkinson',    name: 'Atkinson Hyperlegible  ·  sans', family: 'Atkinson Hyperlegible', sans: true,
      v2: 'Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700', v1: 'Atkinson+Hyperlegible:400,400i,700,700i' },
    { id: 'system',      name: 'System sans  ·  no download', family: 'system-ui', sans: true, bare: true }
  ];

  var loaded = {};

  function loadFont(f) {
    if (!f.v2 || loaded[f.id]) return;
    loaded[f.id] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + f.v2 + '&display=swap';
    /* Google's v2 endpoint is strict about axis names. If it refuses the
       request, fall back to the older, laxer endpoint before giving up. */
    link.onerror = function () {
      if (!f.v1) return;
      var alt = document.createElement('link');
      alt.rel = 'stylesheet';
      alt.href = 'https://fonts.googleapis.com/css?family=' + f.v1 + '&display=swap';
      document.head.appendChild(alt);
    };
    document.head.appendChild(link);
  }

  function stack(f) {
    var tail = f.sans
      ? '"Noto Serif Gurmukhi", system-ui, -apple-system, "Segoe UI", sans-serif'
      : '"Noto Serif Gurmukhi", Georgia, serif';
    return (f.bare ? f.family : '"' + f.family + '"') + ', ' + tail;
  }

  function fontById(id) {
    for (var i = 0; i < FONTS.length; i++) if (FONTS[i].id === id) return FONTS[i];
    return FONTS[0];
  }

  /* -------------------------------------------------------------- settings */

  var DEFAULTS = {
    font: 'lora',
    scale: 100,      // per cent
    measure: 42,     // rem
    leading: 185,    // hundredths
    align: 'left',
    theme: 'auto',   // auto | day | sepia | night
    nav: true,
    toc: true,
    para: false
  };

  var S = load();

  function load() {
    var out = {}, k;
    for (k in DEFAULTS) out[k] = DEFAULTS[k];
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      for (k in DEFAULTS) if (raw[k] !== undefined && raw[k] !== null) out[k] = raw[k];
    } catch (e) { /* private mode, blocked storage — defaults are fine */ }
    return out;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

  function applyTheme() {
    var b = document.body;
    if (S.theme === 'auto') { b.removeAttribute('data-reader-tint'); return; }
    if (S.theme === 'sepia') {
      b.setAttribute('data-md-color-scheme', 'default');
      b.setAttribute('data-reader-tint', 'sepia');
    } else {
      b.removeAttribute('data-reader-tint');
      b.setAttribute('data-md-color-scheme', S.theme === 'night' ? 'slate' : 'default');
    }
  }

  function apply() {
    var f = fontById(S.font);
    loadFont(f);
    root.style.setProperty('--reader-stack', stack(f));
    root.style.setProperty('--reader-scale', (S.scale / 100).toFixed(2));
    root.style.setProperty('--reader-measure', S.measure >= 99 ? '100%' : S.measure + 'rem');
    root.style.setProperty('--reader-grid', S.measure >= 99 ? '100%' : (S.measure + 26) + 'rem');
    root.style.setProperty('--reader-leading', (S.leading / 100).toFixed(2));
    root.style.setProperty('--reader-align', S.align === 'justify' ? 'justify' : 'left');
    document.body.setAttribute('data-reader-align', S.align);
    document.body.classList.toggle('reader-no-nav', !S.nav);
    document.body.classList.toggle('reader-no-toc', !S.toc);
    applyTheme();
  }

  /* Paint the stored settings before first paint, so nothing reflows. */
  apply();

  /* ------------------------------------------------------------ paragraph */

  var units = [], at = 0, para = false;
  var bar, count, prevBtn, nextBtn, progress, tapPrev, tapNext;

  function article() { return document.querySelector('article.md-content__inner'); }

  function buildUnits() {
    units = [];
    var host = article();
    if (!host) return;
    var buf = [];
    var kids = host.children;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i];
      var tag = el.tagName.toLowerCase();
      if (tag === 'hr' || el.classList.contains('footnote') ||
          el.classList.contains('md-source-file') || el.classList.contains('rdr-unit-on')) {
        el.classList.remove('rdr-unit-on');
      }
      if (tag === 'hr' || el.classList.contains('footnote') || el.classList.contains('md-source-file')) continue;
      if (!el.textContent.trim()) continue;
      var gm = isGurmukhi(el);
      el.classList.toggle('rdr-gm', gm);
      buf.push(el);
      /* Headings, metre labels and Gurmukhi verses lead into the block that
         follows them, so a verse and its translation share one slide. */
      if (!/^h[1-6]$/.test(tag) && !gm && !isLabel(el)) { units.push(buf); buf = []; }
    }
    if (buf.length) units.push(buf);
  }

  /* A paragraph written mostly in Gurmukhi script. */
  function isGurmukhi(el) {
    if (el.tagName.toLowerCase() !== 'p') return false;
    var t = el.textContent;
    var g = (t.match(/[\u0A00-\u0A7F]/g) || []).length;
    var l = (t.match(/[A-Za-z]/g) || []).length;
    return g > 0 && g > l;
  }

  /* A short line that is nothing but italics, e.g. *Dohra* or *Chaupai*. */
  function isLabel(el) {
    if (el.tagName.toLowerCase() !== 'p' || el.children.length !== 1) return false;
    var c = el.children[0];
    return c.tagName.toLowerCase() === 'em' &&
           c.textContent.trim() === el.textContent.trim() &&
           el.textContent.trim().length < 40;
  }

  function show(i) {
    if (!units.length) return;
    at = Math.max(0, Math.min(units.length - 1, i));
    var host = article();
    host.querySelectorAll('.rdr-unit-on').forEach(function (e) { e.classList.remove('rdr-unit-on', 'rdr-unit-first'); });
    units[at].forEach(function (e) { e.classList.add('rdr-unit-on'); });
    units[at][0].classList.add('rdr-unit-first');
    count.textContent = (at + 1) + ' / ' + units.length;
    prevBtn.disabled = at === 0;
    nextBtn.disabled = at === units.length - 1;
    progress.style.width = ((at + 1) / units.length * 100) + '%';
    window.scrollTo(0, 0);
    try { localStorage.setItem(POS + location.pathname, String(at)); } catch (e) {}
  }

  function paraAvailable() { buildUnits(); return units.length >= 3; }

  function setPara(on) {
    if (on && !paraAvailable()) on = false;
    para = on;
    document.body.classList.toggle('rdr-para', on);
    bar.hidden = !on;
    progress.hidden = !on;
    tapPrev.hidden = !on;
    tapNext.hidden = !on;
    if (on) {
      var start = 0;
      try { start = parseInt(localStorage.getItem(POS + location.pathname) || '0', 10) || 0; } catch (e) {}
      show(start);
    } else {
      var keep = units.length ? units[at][0] : null;
      article().querySelectorAll('.rdr-unit-on').forEach(function (e) { e.classList.remove('rdr-unit-on', 'rdr-unit-first'); });
      if (keep) keep.scrollIntoView({ block: 'center' });
    }
    return on;
  }

  /* ---------------------------------------------------------------- panel */

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function seg(name, opts, get, set) {
    var html = '<div class="rdr-seg">';
    opts.forEach(function (o) {
      html += '<button type="button" data-v="' + o[0] + '">' + o[1] + '</button>';
    });
    html += '</div>';
    var node = el(html);
    function paint() {
      node.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.v === String(get())));
      });
    }
    node.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      set(b.dataset.v);
      paint();
    });
    paint();
    node.repaint = paint;
    return node;
  }

  function row(label, value, control) {
    var r = el('<div class="rdr-row"><div class="rdr-label"><span>' + label +
              '</span><span class="rdr-val">' + (value || '') + '</span></div></div>');
    r.appendChild(control);
    return r;
  }

  function slider(min, max, step, get, set, fmt, valueNode) {
    var i = el('<input type="range" min="' + min + '" max="' + max + '" step="' + step + '">');
    i.value = get();
    i.addEventListener('input', function () {
      set(parseInt(i.value, 10));
      if (valueNode) valueNode.textContent = fmt(parseInt(i.value, 10));
    });
    i.sync = function () { i.value = get(); if (valueNode) valueNode.textContent = fmt(get()); };
    return i;
  }

  function build() {
    if (document.querySelector('.rdr-fab')) return;

    /* floating buttons */
    var fab = el('<div class="rdr-fab"></div>');
    var navBtn = el('<button type="button" class="rdr-navbtn" title="Sidebars" aria-label="Toggle sidebars">' +
      '<svg viewBox="0 0 24 24"><path d="M3 5h18v2H3V5m0 6h18v2H3v-2m0 6h18v2H3v-2Z"/></svg></button>');
    var aaBtn = el('<button type="button" title="Reader settings" aria-label="Reader settings">Aa</button>');
    fab.appendChild(navBtn);
    fab.appendChild(aaBtn);
    document.body.appendChild(fab);

    /* paragraph-mode furniture */
    progress = el('<div class="rdr-progress" hidden></div>');
    bar = el('<div class="rdr-bar" hidden></div>');
    prevBtn = el('<button type="button" aria-label="Previous paragraph">&#8592;</button>');
    count = el('<span class="rdr-count"></span>');
    nextBtn = el('<button type="button" aria-label="Next paragraph">&#8594;</button>');
    var exit = el('<button type="button" class="rdr-exit">Exit</button>');
    bar.appendChild(prevBtn); bar.appendChild(count); bar.appendChild(nextBtn); bar.appendChild(exit);
    tapPrev = el('<button type="button" class="rdr-tap rdr-tap--prev" aria-label="Previous paragraph" hidden></button>');
    tapNext = el('<button type="button" class="rdr-tap rdr-tap--next" aria-label="Next paragraph" hidden></button>');
    document.body.appendChild(progress);
    document.body.appendChild(bar);
    document.body.appendChild(tapPrev);
    document.body.appendChild(tapNext);

    /* the panel */
    var panel = el('<div class="rdr-panel" hidden role="dialog" aria-label="Reader settings"></div>');

    panel.appendChild(row('Page', '', seg('theme', [
      ['auto', 'Auto'], ['day', 'Day'], ['sepia', 'Sepia'], ['night', 'Night']
    ], function () { return S.theme; }, function (v) { S.theme = v; apply(); save(); })));

    var sel = el('<select aria-label="Typeface"></select>');
    FONTS.forEach(function (f) {
      var o = document.createElement('option');
      o.value = f.id; o.textContent = f.name;
      sel.appendChild(o);
    });
    sel.value = S.font;
    sel.addEventListener('change', function () { S.font = sel.value; apply(); save(); });
    panel.appendChild(row('Typeface', '', sel));

    var sizeRow = row('Text size', S.scale + '%', document.createComment(''));
    var sizeVal = sizeRow.querySelector('.rdr-val');
    var sizeIn = slider(80, 170, 5, function () { return S.scale; },
      function (v) { S.scale = v; apply(); save(); }, function (v) { return v + '%'; }, sizeVal);
    sizeRow.appendChild(sizeIn);
    panel.appendChild(sizeRow);

    var widthRow = row('Page width', '', document.createComment(''));
    var widthVal = widthRow.querySelector('.rdr-val');
    var fmtW = function (v) { return v >= 99 ? 'full' : v + 'rem'; };
    var widthIn = slider(28, 99, 1, function () { return S.measure; },
      function (v) { S.measure = v; apply(); save(); }, fmtW, widthVal);
    widthVal.textContent = fmtW(S.measure);
    widthRow.appendChild(widthIn);
    panel.appendChild(widthRow);

    var leadRow = row('Line spacing', '', document.createComment(''));
    var leadVal = leadRow.querySelector('.rdr-val');
    var fmtL = function (v) { return (v / 100).toFixed(2); };
    var leadIn = slider(130, 260, 5, function () { return S.leading; },
      function (v) { S.leading = v; apply(); save(); }, fmtL, leadVal);
    leadVal.textContent = fmtL(S.leading);
    leadRow.appendChild(leadIn);
    panel.appendChild(leadRow);

    panel.appendChild(row('Alignment', '', seg('align', [['left', 'Ragged'], ['justify', 'Justified']],
      function () { return S.align; }, function (v) { S.align = v; apply(); save(); })));

    panel.appendChild(el('<hr class="rdr-hr rdr-desktop">'));

    function sw(label, get, set) {
      var l = el('<label class="rdr-switch"><span>' + label + '</span><input type="checkbox"></label>');
      var box = l.querySelector('input');
      box.checked = get();
      box.addEventListener('change', function () { set(box.checked); });
      l.sync = function () { box.checked = get(); };
      return l;
    }

    var navSw = sw('Navigation sidebar', function () { return S.nav; },
      function (v) { S.nav = v; apply(); save(); });
    var tocSw = sw('Contents sidebar', function () { return S.toc; },
      function (v) { S.toc = v; apply(); save(); });
    navSw.classList.add('rdr-desktop');
    tocSw.classList.add('rdr-desktop');
    panel.appendChild(navSw);
    panel.appendChild(tocSw);

    var paraSw = sw('Paragraph mode', function () { return para; }, function (v) {
      var on = setPara(v);
      S.para = on; save();
      paraSw.sync();
      if (v && !on) note.textContent = 'This page is too short for paragraph mode.';
      if (on) panel.hidden = true;
    });
    panel.appendChild(paraSw);
    var note = el('<p class="rdr-note">One block of text at a time. Move with &#8592; &#8594;, space, the side of the screen, or a swipe.</p>');
    panel.appendChild(note);

    var reset = el('<button type="button" class="rdr-reset">Reset to defaults</button>');
    reset.addEventListener('click', function () {
      for (var k in DEFAULTS) S[k] = DEFAULTS[k];
      apply(); save();
      setPara(false);
      sel.value = S.font;
      sizeIn.sync(); widthIn.sync(); leadIn.sync();
      navSw.sync(); tocSw.sync(); paraSw.sync();
      panel.querySelectorAll('.rdr-seg').forEach(function (n) { if (n.repaint) n.repaint(); });
    });
    panel.appendChild(reset);

    document.body.appendChild(panel);

    aaBtn.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      aaBtn.setAttribute('aria-pressed', String(!panel.hidden));
    });
    navBtn.addEventListener('click', function () {
      var on = !(S.nav && S.toc);
      S.nav = on; S.toc = on; apply(); save();
      navSw.sync(); tocSw.sync();
      navBtn.setAttribute('aria-pressed', String(!on));
    });
    navBtn.setAttribute('aria-pressed', String(!(S.nav && S.toc)));

    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (e.target.closest('.rdr-panel') || e.target.closest('.rdr-fab')) return;
      panel.hidden = true;
      aaBtn.setAttribute('aria-pressed', 'false');
    });

    /* paragraph-mode wiring */
    prevBtn.addEventListener('click', function () { show(at - 1); });
    nextBtn.addEventListener('click', function () { show(at + 1); });
    tapPrev.addEventListener('click', function () { show(at - 1); });
    tapNext.addEventListener('click', function () { show(at + 1); });
    exit.addEventListener('click', function () { setPara(false); S.para = false; save(); paraSw.sync(); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; return; }
      if (!para) return;
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); show(at + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault(); show(at - 1);
      } else if (e.key === 'Home') { e.preventDefault(); show(0); }
      else if (e.key === 'End') { e.preventDefault(); show(units.length - 1); }
      else if (e.key === 'Escape') { setPara(false); S.para = false; save(); paraSw.sync(); }
    });

    var tx = 0, ty = 0;
    document.addEventListener('touchstart', function (e) {
      if (!para || e.touches.length !== 1) return;
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (!para || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(at + (dx < 0 ? 1 : -1));
    }, { passive: true });

    /* Only offer paragraph mode where there is something to page through. */
    if (!paraAvailable()) {
      paraSw.style.display = 'none';
      note.style.display = 'none';
    } else if (S.para) {
      setPara(true);
      paraSw.sync();
    }

    /* Keep our tint in step if the theme's own day/night toggle is used. */
    new MutationObserver(function () {
      if (S.theme === 'auto') return;
      var now = document.body.getAttribute('data-md-color-scheme');
      var want = S.theme === 'night' ? 'slate' : 'default';
      if (now !== want) {
        S.theme = now === 'slate' ? 'night' : 'day';
        applyTheme(); save();
        panel.querySelectorAll('.rdr-seg').forEach(function (n) { if (n.repaint) n.repaint(); });
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
