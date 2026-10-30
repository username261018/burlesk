/* Motion engine: reveal, words, stacks, lane, glow, panel, menu, map. Vanilla, no deps. */
(function () {
  var d = document, H = d.documentElement, W = window;
  var motion = H.classList.contains('m-on');
  var fine = W.matchMedia('(hover:hover) and (pointer:fine)').matches;
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* top bar height -> --top-h */
  var top = d.querySelector('.topbar');
  function setTop() { if (top) H.style.setProperty('--top-h', top.offsetHeight + 'px'); }
  setTop();
  if (top && 'ResizeObserver' in W) new ResizeObserver(setTop).observe(top);

  /* mobile menu */
  var burger = d.querySelector('.burger'), menu = d.getElementById('menu');
  if (burger && menu) {
    var setOpen = function (o) {
      burger.setAttribute('aria-expanded', o ? 'true' : 'false');
      menu.classList.toggle('open', o);
    };
    burger.addEventListener('click', function (e) { e.preventDefault(); setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { setOpen(false); burger.focus(); } });
  }

  /* map: click-to-load */
  $$('[data-map]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var box = a.closest('.map'), f = d.createElement('iframe');
      f.src = a.getAttribute('data-map'); f.title = 'Карта: Бурлеск, Казань, ул. Пушкина, 29А';
      f.loading = 'lazy'; f.setAttribute('allowfullscreen', '');
      box.innerHTML = ''; box.appendChild(f); box.classList.add('loaded');
    });
  });

  /* price accordion: all open by default (JS off); below 900 groups start folded */
  var acc = $$('details.pg'), accWide = null;
  function fitAcc() {
    var wide = W.innerWidth >= 900;
    if (wide === accWide) return; accWide = wide;
    acc.forEach(function (x) { x.open = wide; });
  }
  fitAcc(); W.addEventListener('resize', fitAcc);

  if (!motion) return;

  /* split headings into words */
  $$('[data-split]').forEach(function (h) {
    var txt = h.textContent.replace(/\s+/g, ' ').trim();
    h.setAttribute('aria-label', txt);
    var step = h.tagName === 'H1' ? 70 : 60, i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(' ')); return; }
            var w = d.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            var wi = d.createElement('span'); wi.className = 'wi'; wi.textContent = p;
            wi.style.transitionDelay = (i++ * step) + 'ms';
            w.appendChild(wi); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) { walk(n); }
      });
    };
    walk(h);
  });

  /* stagger index for groups */
  $$('[data-stg]').forEach(function (g) {
    $$(':scope > *', g).forEach(function (c, i) { c.style.setProperty('--i', i % 8); });
  });

  /* glow paragraph: split words */
  var glows = $$('[data-glow]').map(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    words.forEach(function (w, i) {
      var s = d.createElement('span'); s.className = 'gw'; s.textContent = w;
      p.appendChild(s); if (i < words.length - 1) p.appendChild(d.createTextNode(' '));
    });
    return { el: p, w: $$('.gw', p) };
  });

  /* reveal */
  var items = $$('[data-rv]');
  var pendingHero = $$('[data-hero]');
  function show(el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    if (el.getAttribute('data-rv') === 'cur') {
      var img = el.querySelector('img');
      var done = function (e) { if (e && e.target !== img) return; el.classList.add('done'); };
      if (img) img.addEventListener('transitionend', done); setTimeout(function () { el.classList.add('done'); }, 1700);
    }
    if (el.getAttribute('data-rv') === 'mk') scramble(el);
  }
  var heroLock = true;
  function sweep() {
    var vh = W.innerHeight;
    items.forEach(function (el) {
      if (el.classList.contains('in')) return;
      if (heroLock && el.hasAttribute('data-hero')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh && (r.bottom > -vh * 50)) show(el);
    });
  }
  var io = 'IntersectionObserver' in W ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting && !(heroLock && e.target.hasAttribute('data-hero'))) { show(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  items.forEach(function (el) { if (io) io.observe(el); });

  /* hero chain */
  function chain() {
    setTimeout(function () {
      $$('[data-hero="1"]').forEach(show);
      setTimeout(function () { $$('[data-hero="2"]').forEach(show); }, 200);
      setTimeout(function () { $$('[data-hero="3"]').forEach(show); heroLock = false; sweep(); }, 500);
    }, 300);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', chain); else chain();

  /* marks scramble (T4 captions) */
  var noise = 'абвгдеёжзиклмнопрстуфхцчшщыэюя#/+=*';
  function scramble(el) {
    var t = el.querySelector('.mk-t'), n = el.querySelector('.mk-n');
    if (!t || !n) return;
    var src = t.textContent, t0 = performance.now(), dur = 700;
    el.classList.add('scr');
    (function f(now) {
      var k = clamp((now - t0) / dur, 0, 1), out = '';
      for (var i = 0; i < src.length; i++) {
        out += (src[i] === ' ' || i < k * src.length) ? src[i] : noise[(Math.random() * noise.length) | 0];
      }
      n.textContent = out;
      if (k < 1) requestAnimationFrame(f); else el.classList.remove('scr');
    })(t0);
  }

  /* stacks: equalise card heights so one quote covers the previous */
  var stacks = $$('[data-stack]');
  function fitStacks() {
    var th = top ? top.offsetHeight : 0;
    stacks.forEach(function (s) {
      var cards = $$(':scope > *', s);
      s.classList.remove('stk');
      cards.forEach(function (c) { c.style.minHeight = ''; });
      var minW = parseFloat(s.getAttribute('data-stack')) || 0;
      if (W.innerWidth < minW || s.closest('.lane-on')) return;
      var m = 0; cards.forEach(function (c) { m = Math.max(m, c.offsetHeight); });
      if (m > W.innerHeight - th - 32) return;
      cards.forEach(function (c, i) { c.style.minHeight = m + 'px'; c.style.setProperty('--k', i); });
      s.classList.add('stk');
    });
  }

  /* lane (one per page, >=900) */
  var lane = d.querySelector('[data-lane]'), laneT, laneS, laneP, laneDist = 0, laneLen = 0;
  function fitLane() {
    if (!lane) return;
    laneT = lane.querySelector('.lane-track'); laneS = lane.querySelector('.lane-stage'); laneP = lane.querySelector('.lane-bar i');
    var on = W.innerWidth >= 900;
    lane.classList.toggle('lane-on', on);
    lane.style.height = '';
    if (laneT) laneT.style.transform = '';
    if (!on) return;
    laneDist = Math.max(0, laneT.scrollWidth - laneS.clientWidth);
    var cap = parseFloat(lane.getAttribute('data-lane')) || 0;
    laneLen = cap ? Math.min(laneDist, cap * W.innerHeight) : laneDist;
    lane.style.height = (laneS.offsetHeight + laneLen) + 'px';
  }

  var ticking = false, motto = $$('[data-motto]'), panels = $$('[data-panel]');
  function frame() {
    ticking = false;
    var vh = W.innerHeight;
    sweep();
    if (lane && lane.classList.contains('lane-on')) {
      var r = lane.getBoundingClientRect();
      var p = laneLen ? clamp(-r.top / laneLen, 0, 1) : 0;
      laneT.style.transform = 'translate3d(' + (-p * laneDist).toFixed(1) + 'px,0,0)';
      if (laneP) laneP.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    glows.forEach(function (g) {
      var r = g.el.getBoundingClientRect();
      var p = clamp((vh * 0.88 - r.top) / (vh * 0.5), 0, 1), n = Math.round(p * g.w.length);
      g.w.forEach(function (s, i) { s.classList.toggle('lit', i < n); });
    });
    motto.forEach(function (m) {
      var r = m.getBoundingClientRect(), p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      m.style.transform = 'translate3d(' + ((p - 0.5) * -60).toFixed(1) + 'px,0,0)';
    });
    panels.forEach(function (pn) {
      var r = pn.getBoundingClientRect(), p = clamp((vh - r.top) / (vh * 0.6), 0, 1);
      pn.style.setProperty('--fx', ((1 - p) * 48).toFixed(1) + 'px');
    });
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  /* cursor: tilt + light spot (fine pointer only) */
  if (fine) {
    var spot = d.querySelector('.spot'), tilts = $$('[data-tilt]'), mx = 0, my = 0, cx = 0, cy = 0, run = false;
    var loop = function () {
      cx += (mx - cx) * 0.12; cy += (my - cy) * 0.12;
      if (spot) spot.style.transform = 'translate3d(' + (cx - 300).toFixed(1) + 'px,' + (cy - 300).toFixed(1) + 'px,0)';
      tilts.forEach(function (t) {
        var r = t.getBoundingClientRect();
        var dx = clamp((cx - (r.left + r.width / 2)) / W.innerWidth, -0.5, 0.5), dy = clamp((cy - (r.top + r.height / 2)) / W.innerHeight, -0.5, 0.5);
        t.style.transform = 'perspective(900px) rotateY(' + (dx * 10).toFixed(2) + 'deg) rotateX(' + (-dy * 8).toFixed(2) + 'deg)';
      });
      if (Math.abs(mx - cx) + Math.abs(my - cy) > 0.5) requestAnimationFrame(loop); else run = false;
    };
    d.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (spot) spot.classList.add('on');
      if (!run) { run = true; requestAnimationFrame(loop); }
    }, { passive: true });
  }

  function layout() { setTop(); fitStacks(); fitLane(); req(); }
  W.addEventListener('scroll', req, { passive: true });
  var lw = W.innerWidth, lh = W.innerHeight;
  W.addEventListener('resize', function () {
    var coarse = !fine && Math.abs(W.innerHeight - lh) < 160 && W.innerWidth === lw;
    lw = W.innerWidth; lh = W.innerHeight;
    if (coarse) { req(); return; }
    layout();
  });
  W.addEventListener('load', layout);
  W.addEventListener('hashchange', function () { setTimeout(sweep, 50); });
  W.addEventListener('beforeprint', function () { items.forEach(show); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(layout);
  layout();
  H.classList.add('m-ready');
})();
