// Nessoo combined landing page.
// Behaviour is ported from the live designs, one block per origin:
//   v3 (nav, film hero, reveals, FAQ, final film)
//   v1 (floating verified cards)
//   v2 (pinned phone walkthrough, neighborhoods row, matches collage)
//   v5 (Homey chat drawer, search pill, "apartments want you" sheet)
import { n as gsap, t as ScrollTrigger } from './vendor/gsap.js';

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
const root = document.documentElement;

// Shared scroll lock (drawer, sheets, mobile menu)
let locks = 0;
const lock = () => { if (locks++ === 0) root.classList.add('s-locked'); };
const unlock = () => { locks = Math.max(0, locks - 1); if (locks === 0) root.classList.remove('s-locked'); };

function trapTab(e, panel) {
  if (e.key !== 'Tab') return;
  const f = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', panel).filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ------------------------------------------------------------------ v3 nav */
function nav() {
  const bar = $('[data-nav]'), menu = $('[data-menu]'), open = $('[data-menu-open]'), close = $('[data-menu-close]');
  if (bar) {
    let last = scrollY, ticking = false;
    const media = () => $('[data-nav-media]');
    const update = () => {
      ticking = false;
      const y = scrollY, m = media();
      const overMedia = m ? m.getBoundingClientRect().bottom > bar.offsetHeight : false;
      const down = y > last + 2, up = y < last - 2;
      if (y < 8) bar.removeAttribute('data-hidden');
      else if (down && y > 120) bar.setAttribute('data-hidden', '');
      else if (up) bar.removeAttribute('data-hidden');
      overMedia || y < 8 ? bar.removeAttribute('data-solid') : bar.setAttribute('data-solid', '');
      bar.setAttribute('data-tone', overMedia ? 'light' : 'dark');
      last = y;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
  if (menu && open && close) {
    const show = () => {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      open.setAttribute('aria-expanded', 'true');
      lock();
      close.focus();
    };
    const hide = (refocus = true) => {
      menu.classList.remove('is-open');
      open.setAttribute('aria-expanded', 'false');
      unlock();
      setTimeout(() => { menu.hidden = true; }, 300);
      if (refocus) open.focus();
    };
    open.addEventListener('click', show);
    close.addEventListener('click', () => hide());
    $$('[data-menu-link]', menu).forEach((a) => a.addEventListener('click', () => hide(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) hide(); });
    menu.addEventListener('keydown', (e) => trapTab(e, menu));
  }
}

/* ------------------------------------------------------------------ v3 film hero */
const CHAPTERS = [
  { id: 'city', start: 0, end: 6.93, rep: 6.1 },
  { id: 'stoop', start: 6.93, end: 12.1, rep: 11.3 },
  { id: 'key', start: 12.1, end: 13.97, rep: 13.6 },
  { id: 'door', start: 13.97, end: 20, rep: 18.4 },
];
const FILM_LEN = 20;
const FILM = {
  wide: { video: '/shared/hero.mp4', poster: '/shared/hero-poster.jpg' },
  tall: { video: '/shared/video/hero-vertical.mp4', poster: '/shared/video/hero-vertical-poster.jpg' },
};

function hero() {
  const sec = $('[data-hero]');
  if (!sec) return;
  const video = $('[data-hero-video]', sec), still = $('[data-hero-still]', sec), frame = $('[data-hero-frame]', sec);
  const content = $('.ly-hero__content', sec);
  const anns = $$('[data-ann]', sec), tabs = $$('[data-chapter]', sec);
  const pauseBtn = $('[data-hero-pause]', sec), ring = $('[data-hero-ring]', sec);
  const tallMQ = matchMedia('(max-width: 767px) and (orientation: portrait)');
  let mode = tallMQ.matches ? 'tall' : 'wide';
  const layers = anns.map((el) => ({
    el,
    tin: parseFloat(el.dataset.in || '0'),
    tout: parseFloat(el.dataset.out || String(FILM_LEN)),
    parts: $$('[data-part]', el).map((p) => ({ el: p, tin: parseFloat(p.dataset.in || '0'), tout: parseFloat(p.dataset.out || '21') })),
  }));
  let source = 'video', clock = reduce ? CHAPTERS[1].rep : 0, running = false, t0 = performance.now();
  let paused = false, inView = true, raf = 0, stillSrc = '';
  const now = () => (source === 'video' ? video.currentTime || 0 : clock);
  const chapterAt = (t) => CHAPTERS.find((c) => t >= c.start && t < c.end) || CHAPTERS[CHAPTERS.length - 1];

  function loadSource() {
    const s = FILM[mode];
    sec.dataset.mode = mode;
    if (!video.src.endsWith(s.video)) {
      const t = video.currentTime || 0;
      video.poster = s.poster;
      video.src = s.video;
      video.load();
      if (t) video.addEventListener('loadedmetadata', () => { video.currentTime = t; }, { once: true });
    }
  }
  function showStill(ch) {
    const src = `/layer/img/still-${ch.id}-${mode}.jpg`;
    if (src !== stillSrc) { stillSrc = src; still.src = src; }
  }
  function render(t) {
    const ch = chapterAt(t);
    if (sec.dataset.ch !== ch.id) {
      sec.dataset.ch = ch.id;
      tabs.forEach((b) => b.setAttribute('aria-selected', b.dataset.chapter === ch.id ? 'true' : 'false'));
    }
    if (source === 'stills') showStill(ch);
    for (const l of layers) {
      l.el.classList.toggle('is-on', t >= l.tin && t < l.tout);
      for (const p of l.parts) p.el.classList.toggle('is-on', t >= p.tin && t < p.tout);
    }
    if (ring) ring.style.strokeDashoffset = String(125.66 * (1 - Math.min(1, t / FILM_LEN)));
  }
  function tick() {
    raf = 0;
    const n = performance.now();
    if (source === 'stills' && running && !paused) clock = (clock + (n - t0) / 1e3) % FILM_LEN;
    t0 = n;
    render(now());
    if (inView && (!paused || source === 'video')) raf = requestAnimationFrame(tick);
  }
  const startLoop = () => { if (!raf) { t0 = performance.now(); raf = requestAnimationFrame(tick); } };
  const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  function play() {
    if (source !== 'video') { running = true; startLoop(); return; }
    const p = video.play();
    if (p && p.catch) p.catch(() => { source = 'stills'; sec.setAttribute('data-stills', ''); clock = video.currentTime || clock; running = true; startLoop(); });
    startLoop();
  }
  function pause() { if (source === 'video') video.pause(); running = false; render(now()); }
  function seek(t) { if (source === 'video') { try { video.currentTime = t; } catch {} } clock = t; render(t); }
  function place() {
    const s = sec.getBoundingClientRect(), f = frame.getBoundingClientRect();
    const ox = f.left - s.left, oy = f.top - s.top, w = f.width, h = f.height;
    const top = innerWidth < 768 ? 56 : 72;
    const floor = ($('h1', content) || content).getBoundingClientRect().top - s.top - 14;
    const pad = innerWidth < 768 ? 14 : 24;
    for (const l of layers) {
      const d = l.el.dataset;
      const fx = parseFloat((mode === 'tall' ? d.mx : d.x) || '0'), fy = parseFloat((mode === 'tall' ? d.my : d.y) || '0');
      const ew = l.el.offsetWidth, eh = l.el.offsetHeight;
      let x = ox + fx * w, y = oy + fy * h;
      x = Math.max(pad, Math.min(x, s.width - ew - pad));
      y = Math.max(top + 10, Math.min(y, floor - eh));
      l.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    }
  }
  tabs.forEach((b) => b.addEventListener('click', () => {
    const ch = CHAPTERS.find((c) => c.id === b.dataset.chapter);
    seek(reduce || paused ? ch.rep : ch.start + 0.02);
    if (!paused && !reduce) play();
  }));
  tabs.forEach((b, i) => b.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); n.click();
  }));
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.setAttribute('aria-label', paused ? 'Play film' : 'Pause film');
    paused ? pause() : play();
  });
  new IntersectionObserver((es) => {
    inView = es[0].isIntersecting;
    if (reduce) return;
    if (inView && !paused) play();
    else if (!inView) { if (source === 'video') video.pause(); stopLoop(); }
  }, { threshold: 0.05 }).observe(sec);
  document.addEventListener('visibilitychange', () => {
    if (reduce) return;
    if (document.hidden) { if (source === 'video') video.pause(); }
    else if (inView && !paused) play();
  });
  new ResizeObserver(() => place()).observe(sec);
  tallMQ.addEventListener('change', () => {
    mode = tallMQ.matches ? 'tall' : 'wide';
    source === 'video' ? loadSource() : showStill(chapterAt(now()));
    stillSrc = '';
    requestAnimationFrame(place);
    if (!paused && !reduce) play();
  });
  video.addEventListener('timeupdate', () => { if (!raf) render(now()); });
  video.addEventListener('error', () => {
    if (source === 'stills') return;
    source = 'stills'; sec.setAttribute('data-stills', ''); clock = 0; running = !paused && !reduce;
    showStill(chapterAt(clock)); startLoop();
  });
  video.addEventListener('seeked', () => render(now()));
  if (reduce) {
    sec.setAttribute('data-reduced', ''); sec.setAttribute('data-stills', '');
    source = 'stills'; showStill(chapterAt(clock)); render(clock);
  } else {
    video.muted = true; video.defaultMuted = true;
    video.setAttribute('muted', ''); video.setAttribute('autoplay', '');
    loadSource(); play(); render(0);
  }
  place();
  sec.setAttribute('data-ready', '');
  if (document.fonts) document.fonts.ready.then(place);
}

/* ------------------------------------------------------------------ reveals (each system keeps its own hook) */
function reveals() {
  const groups = [
    { els: $$('[data-reveal]'), margin: '0px 0px -6% 0px' },   // v3
    { els: $$('.m-reveal'), margin: '0px 0px -8% 0px' },        // v1
    { els: $$('[data-preveal]'), margin: '0px 0px -8% 0px' },   // v2
    { els: $$('.s-reveal'), margin: '0px 0px -8% 0px' },        // v5
  ];
  for (const g of groups) {
    if (reduce || !('IntersectionObserver' in window)) { g.els.forEach((e) => e.classList.add('is-in')); continue; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: g.margin, threshold: 0.08 });
    g.els.forEach((e) => io.observe(e));
  }
}

/* ------------------------------------------------------------------ v2 autoplaying clips */
function autoVideos() {
  const vids = $$('video[data-auto]');
  vids.forEach((v) => { v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); });
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es) => es.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting && !reduce) { if (v.preload !== 'auto') v.preload = 'auto'; v.play()?.catch?.(() => {}); }
    else if (!v.paused) v.pause();
  }), { threshold: 0.2 });
  vids.forEach((v) => io.observe(v));
}

/* ------------------------------------------------------------------ v1 floating verified cards */
function floats() {
  if (reduce) return;
  $$('[data-float]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed || '1'), rot = parseFloat(el.dataset.rot || '0');
    gsap.fromTo(el, { yPercent: 18 * speed, rotate: rot * 1.35 }, {
      yPercent: -18 * speed, rotate: rot * 0.75, ease: 'none',
      scrollTrigger: { trigger: el.closest('[data-floats]') || el, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
    });
  });
}


/* ------------------------------------------------------------------ v1 trust tiles: hovered tile widens, lifts into color, shows its side notes */
function trustTiles() {
  const grid = $('[data-tiles]');
  if (!grid) return;
  const tiles = $$('[data-tile]', grid);
  const wide = matchMedia('(min-width: 992px)');
  const open = (t) => tiles.forEach((x) => {
    const on = x === t;
    x.classList.toggle('is-open', on);
    x.querySelector('button')?.setAttribute('aria-expanded', String(on));
  });
  tiles.forEach((t) => {
    const btn = t.querySelector('button');
    t.addEventListener('mouseenter', () => { if (wide.matches) open(t); });
    btn.addEventListener('focus', () => { if (wide.matches) open(t); });
    btn.addEventListener('click', () => open(t.classList.contains('is-open') && !wide.matches ? null : t));
  });
  grid.addEventListener('mouseleave', () => { if (wide.matches) open(null); });
}

/* ------------------------------------------------------------------ v2 pinned phone walkthrough */
const LAST_STEP = 6, STEPS_AT = 2.3, SETTLE = 0.6, STAGE_LEN = 8.9;

function stage() {
  const sec = $('[data-stage]'), pin = $('[data-pin]'), card = $('[data-card]'), shadow = $('[data-shadow]');
  const copy = $('[data-hero-copy]'), phone = $('[data-phone]');
  if (!sec || !pin || !card || !shadow || !copy || !phone) return () => {};
  const screens = $$('[data-stack] > .p-ui', sec), copies = $$('[data-copy]', sec), atmos = $$('[data-atmo]', sec);
  const gotos = $$('[data-goto]', sec), giants = $$('[data-giant]', sec);
  const cssNum = (v, d) => parseFloat(getComputedStyle(root).getPropertyValue(v)) || d;
  const gutter = () => cssNum('--gutter', 64), radius = () => cssNum('--r-card', 45);
  let cur = -1;
  const setStep = (s) => {
    if (s === cur) return;
    cur = s;
    sec.dataset.step = String(s);
    const n = typeof s === 'number' ? s : 0;
    screens.forEach((el) => {
      const i = Number(el.dataset.step);
      el.classList.toggle('is-active', i === n);
      el.classList.toggle('is-before', i < n);
      el.classList.toggle('is-after', i > n);
      el.setAttribute('aria-hidden', i === n ? 'false' : 'true');
    });
    copies.forEach((c) => c.classList.toggle('is-on', Number(c.dataset.copy) === s));
    atmos.forEach((a) => a.classList.toggle('is-on', a.dataset.atmo === String(s)));
    gotos.forEach((g) => {
      const on = typeof s === 'number' && Number(g.dataset.goto) === Math.min(5, s);
      g.classList.toggle('is-on', on);
      on ? g.setAttribute('aria-current', 'step') : g.removeAttribute('aria-current');
    });
  };
  setStep(0);
  const phoneStart = () => {
    const h = phone.offsetHeight, rest = pin.offsetHeight - h + 0.0215 * h, below = copy.offsetTop + copy.offsetHeight;
    return Math.max(0, below + 44 - rest);
  };
  const vh = () => innerHeight;
  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  tl.fromTo(card, { clipPath: () => `inset(100px ${gutter()}px 0px ${gutter()}px round ${radius()}px)` },
    { clipPath: 'inset(0px 0px 60px 0px round 0px)', duration: 0.75, ease: 'power2.inOut' }, 0)
    .fromTo(shadow, { opacity: 1 }, { opacity: 0, duration: 0.4 }, 0)
    .fromTo(copy, { y: 0, opacity: 1 }, { y: () => -vh() * 0.42, opacity: 0, duration: 0.6, ease: 'power1.in' }, 0)
    .fromTo(phone, { y: phoneStart }, { y: 0, duration: 1, ease: 'power2.inOut' }, 0);
  giants.forEach((g, i) => {
    tl.fromTo(g, { y: () => vh() * 0.9, visibility: 'visible' }, { y: () => -vh() * 0.9, duration: 1.15, ease: 'none' }, 0.7 + i * 0.55);
  });
  tl.to(card, { clipPath: () => `inset(0px ${gutter()}px 60px ${gutter()}px round ${radius()}px)`, duration: SETTLE, ease: 'power2.inOut' }, 8.3)
    .fromTo(shadow, { top: 100, bottom: -60 }, { top: 0, bottom: 0, opacity: 1, duration: SETTLE, immediateRender: false }, 8.3)
    .set({}, {}, STAGE_LEN);
  const stepAt = (t) => (t < 0.9 ? 0 : t < 2.15 ? 'w' : Math.max(1, Math.min(LAST_STEP, Math.floor(t - STEPS_AT + 1.15))));
  tl.eventCallback('onUpdate', () => setStep(stepAt(tl.time())));
  const st = ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => '+=' + Math.round(vh() * 7.1),
    pin, scrub: 0.6, animation: tl, invalidateOnRefresh: true,
  });
  const goTo = (n) => {
    const y = st.start + ((STEPS_AT + n - 1 + 0.4) / STAGE_LEN) * (st.end - st.start);
    scrollTo({ top: Math.round(y), behavior: 'smooth' });
  };
  const onGoto = (e) => goTo(Number(e.currentTarget.dataset.goto));
  gotos.forEach((g) => g.addEventListener('click', onGoto));
  const jump = $('[data-jump-steps]');
  const onJump = (e) => { e.preventDefault(); goTo(1); };
  jump?.addEventListener('click', onJump);
  return () => {
    gotos.forEach((g) => g.removeEventListener('click', onGoto));
    jump?.removeEventListener('click', onJump);
    screens.forEach((el) => {
      const i = Number(el.dataset.step);
      el.classList.toggle('is-active', i === 0);
      el.classList.toggle('is-after', i > 0);
      el.classList.remove('is-before');
    });
    delete sec.dataset.step;
  };
}

function collage() {
  const wrap = $('[data-collage]'), phone = $('[data-collage-phone]');
  if (!wrap) return () => {};
  if (phone) gsap.fromTo(phone, { yPercent: 38 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top 80%', end: 'bottom 85%', scrub: 0.6 } });
  if (matchMedia('(min-width: 761px)').matches) {
    const g = parseFloat(getComputedStyle(root).getPropertyValue('--gutter')) || 64;
    gsap.fromTo(wrap, { clipPath: `inset(0px ${g}px 0px ${g}px round 45px)` }, {
      clipPath: 'inset(0px 0px 0px 0px round 0px)', ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top 90%', end: 'top 20%', scrub: 0.6 },
    });
  }
  return () => {};
}

function hoodRow() {
  const row = $('[data-hoodrow]');
  if (!row) return;
  const step = () => { const c = row.querySelector('.p-tc'); return c ? c.offsetWidth + 24 : 300; };
  $('[data-hood-prev]')?.addEventListener('click', () => row.scrollBy({ left: -step() * 2, behavior: reduce ? 'auto' : 'smooth' }));
  $('[data-hood-next]')?.addEventListener('click', () => row.scrollBy({ left: step() * 2, behavior: reduce ? 'auto' : 'smooth' }));
}

function scrollScenes() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px) and (min-height: 560px) and (prefers-reduced-motion: no-preference)', () => {
    root.classList.add('p-can-pin');
    const a = stage(), b = collage();
    return () => { a(); b(); root.classList.remove('p-can-pin'); };
  });
  mm.add('(max-width: 760px) and (prefers-reduced-motion: no-preference)', () => collage());
  addEventListener('load', () => ScrollTrigger.refresh());
}

/* ------------------------------------------------------------------ v5 search pill, matching sheet, Homey drawer */
const money = (n) => '$' + n.toLocaleString('en-US');
const SHORT = { 'Long Island City': 'LIC', 'Jersey City (Paulus Hook)': 'Jersey City', 'Upper West Side': 'UWS' };
const want = { hoods: [], month: null, budget: null };

function homeyAndMatching() {
  const isMobile = () => matchMedia('(max-width: 960px)').matches;

  /* --- wants state + pill labels */
  const hoodLabel = () => {
    if (!want.hoods.length) return '';
    if (want.hoods.length === 1) return want.hoods[0];
    const s = want.hoods.map((h) => SHORT[h] || h);
    return s.length === 2 ? s.join(', ') : `${s[0]}, ${s[1]} +${s.length - 2}`;
  };
  const labels = () => ({ hood: hoodLabel(), month: want.month || '', budget: want.budget ? `Up to ${money(want.budget)}` : '' });
  const paintRange = (input) => {
    const v = +input.value, min = +input.min, max = +input.max;
    input.style.setProperty('--pct', ((v - min) / (max - min)) * 100 + '%');
    const t = v >= max ? '$6,000+' : money(v);
    input.setAttribute('aria-valuetext', `${t} per month`);
    input.closest('.s-pop, .s-mcard__panel')?.querySelectorAll('[data-budget-out]').forEach((o) => { o.textContent = t; });
  };
  const sync = () => {
    const l = labels();
    $$('[data-value]').forEach((el) => {
      const v = l[el.dataset.value];
      el.textContent = v || el.dataset.empty || '';
      el.classList.toggle('has-value', !!v);
    });
    $$('[data-clear]').forEach((b) => { b.hidden = !l[b.dataset.clear]; });
    $$('[data-mvalue]').forEach((el) => {
      const k = el.dataset.mvalue;
      el.textContent = l[k] || (k === 'hood' ? 'Add neighborhoods' : k === 'month' ? 'Add month' : 'Add budget');
    });
    $$('[data-hood]').forEach((b) => { if (b.classList.contains('s-fchip')) b.setAttribute('aria-pressed', String(want.hoods.includes(b.dataset.hood))); });
    $$('.s-month').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.month === want.month)));
    $$('[data-budget]').forEach((r) => { if (want.budget) r.value = String(want.budget); paintRange(r); });
  };

  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.s-fchip[data-hood]');
    if (chip) {
      const h = chip.dataset.hood;
      want.hoods = want.hoods.includes(h) ? want.hoods.filter((x) => x !== h) : [...want.hoods, h];
      sync();
      return;
    }
    const m = e.target.closest('.s-month');
    if (m) {
      want.month = want.month === m.dataset.month ? null : m.dataset.month;
      sync();
      if (want.month && m.closest('[data-pill]')) setTimeout(() => openSeg('budget'), reduce ? 0 : 260);
    }
  });
  $$('[data-budget]').forEach((r) => { paintRange(r); r.addEventListener('input', () => { want.budget = +r.value; sync(); }); });
  $$('.s-months').forEach((grid) => grid.addEventListener('keydown', (e) => {
    const opts = $$('.s-month', grid), i = opts.indexOf(document.activeElement);
    if (i < 0) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (!d) return;
    e.preventDefault();
    const n = opts[Math.max(0, Math.min(opts.length - 1, i + d))];
    opts.forEach((o) => { o.tabIndex = -1; });
    n.tabIndex = 0; n.focus();
  }));

  /* --- desktop pill */
  const pill = $('[data-pill]');
  let openKey = null;
  function openSeg(key) {
    if (!pill) return;
    openKey = key;
    if (key === 'budget' && want.budget == null) { const r = $('#stay-budget'); if (r) { want.budget = +r.value; sync(); } }
    pill.classList.toggle('is-active', !!key);
    $$('.s-pill__seg', pill).forEach((seg) => {
      const on = seg.dataset.seg === key;
      seg.classList.toggle('is-open', on);
      $('.s-pill__btn', seg).setAttribute('aria-expanded', String(on));
      $('.s-pop', seg).hidden = !on;
    });
  }
  if (pill) {
    $$('.s-pill__seg', pill).forEach((seg) => $('.s-pill__btn', seg).addEventListener('click', () => openSeg(openKey === seg.dataset.seg ? null : seg.dataset.seg)));
    $$('[data-clear]', pill).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const k = b.dataset.clear;
      if (k === 'hood') want.hoods = [];
      if (k === 'month') want.month = null;
      if (k === 'budget') { want.budget = null; $$('[data-budget]').forEach((r) => { r.value = '3100'; paintRange(r); }); }
      sync();
    }));
    document.addEventListener('pointerdown', (e) => { if (openKey && !pill.contains(e.target)) openSeg(null); });
    pill.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openKey) { const k = openKey; openSeg(null); $(`[data-seg="${k}"] .s-pill__btn`, pill)?.focus(); }
    });
    pill.addEventListener('submit', (e) => { e.preventDefault(); openSeg(null); openSheet(); });
  }

  /* --- mobile search sheet */
  const msheet = $('[data-msheet]');
  let msheetReturn = null;
  const mcard = (key) => {
    if (key === 'budget' && want.budget == null) { want.budget = 3100; sync(); }
    $$('[data-mcard]', msheet).forEach((c) => {
      const on = c.dataset.mcard === key;
      c.classList.toggle('is-open', on);
      $('[data-mcard-toggle]', c)?.setAttribute('aria-expanded', String(on));
    });
  };
  const openMsheet = (key = 'hood') => {
    if (!msheet) return;
    msheetReturn = document.activeElement;
    msheet.hidden = false; lock(); mcard(key);
    $('[data-msheet-close]', msheet)?.focus({ preventScroll: true });
  };
  const closeMsheet = (refocus = true) => {
    if (!msheet || msheet.hidden) return;
    msheet.hidden = true; unlock();
    if (refocus) msheetReturn?.focus({ preventScroll: true });
  };
  $$('[data-open-search]').forEach((b) => b.addEventListener('click', () => openMsheet()));
  if (msheet) {
    $$('[data-mcard-toggle]', msheet).forEach((b) => b.addEventListener('click', () => mcard(b.closest('[data-mcard]').dataset.mcard)));
    $('[data-msheet-close]', msheet)?.addEventListener('click', () => closeMsheet());
    $('[data-msheet-clear]', msheet)?.addEventListener('click', () => {
      want.hoods = []; want.month = null; want.budget = null;
      $$('[data-budget]').forEach((r) => { r.value = '3100'; paintRange(r); });
      sync(); mcard('hood');
    });
    $('[data-msheet-go]', msheet)?.addEventListener('click', () => { closeMsheet(false); openSheet(); });
    msheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMsheet(); });
    $$('.s-month', msheet).forEach((b) => b.addEventListener('click', () => { if (want.month) setTimeout(() => mcard('budget'), reduce ? 0 : 280); }));
  }

  /* --- "apartments want you" sheet */
  const sheet = $('[data-sheet]'), panel = $('[data-sheet-panel]'), title = $('[data-sheet-title]'), tpl = $('[data-sheet-cards]');
  let timers = [], sheetReturn = null;
  const pickCards = () => {
    const all = Array.from(tpl.content.querySelectorAll('[data-card]'));
    const short = want.hoods.map((h) => SHORT[h] || h), cap = want.budget ?? 3100;
    const ranked = all.map((c, i) => {
      const rent = +c.dataset.rent, hood = c.dataset.hood;
      let s = 0;
      if (short.includes(hood) || want.hoods.some((h) => h === hood)) s += 4;
      s += rent <= cap ? 2 : -Math.min(3, (rent - cap) / 150);
      return { c, s: s - i * 0.01 };
    }).sort((a, b) => b.s - a.s);
    const out = [], per = {};
    for (const { c } of ranked) {
      const h = c.dataset.hood;
      if ((per[h] || 0) >= 2) continue;
      per[h] = (per[h] || 0) + 1;
      out.push(c);
      if (out.length === 3) break;
    }
    return out;
  };
  function openSheet() {
    if (!sheet || !tpl) return;
    timers.forEach(clearTimeout); timers = [];
    sheetReturn = document.activeElement;
    const month = want.month || 'Nov 2026', mon = month.split(' ')[0];
    const where = want.hoods.length
      ? (want.hoods.length > 2 ? `${want.hoods.slice(0, 2).join(', ')} and ${want.hoods.length - 2} more` : want.hoods.join(' and '))
      : 'every neighborhood you could qualify for';
    $('[data-step-hood]', sheet).textContent = want.hoods.length ? `Looking in ${where}` : `Looking across ${where}`;
    $('[data-step-month]', sheet).textContent = `Matching units free for a ${month} move-in`;
    $('[data-step-budget]', sheet).textContent = `Keeping rent under ${money(want.budget ?? 3100)} a month`;
    const matching = $('[data-phase="matching"]', sheet), results = $('[data-phase="results"]', sheet), grid = $('[data-results]', sheet);
    matching.hidden = false; results.hidden = true; grid.innerHTML = '';
    sheet.dataset.phase = 'matching';
    title.textContent = 'Homey is matching your profile…';
    const steps = $$('[data-step]', sheet);
    steps.forEach((s) => s.classList.remove('is-active', 'is-done'));
    sheet.classList.remove('is-closing');
    sheet.hidden = false; lock();
    panel?.focus({ preventScroll: true });
    const reveal = () => {
      const cards = pickCards();
      cards.forEach((c, i) => {
        const n = c.cloneNode(true);
        n.style.setProperty('--d', `${i * 90}ms`);
        const av = n.querySelector('[data-card-avail]');
        if (av) av.textContent = `Available ${mon} 1`;
        const why = n.querySelector('[data-card-reason]');
        if (why && /move-in/.test(why.textContent || '')) why.textContent = `Fits your ${mon} 1 move-in`;
        grid.appendChild(n);
      });
      bindCards(grid);
      matching.hidden = true; results.hidden = false;
      $('.s-sheet__body', sheet)?.scrollTo({ top: 0 });
      title.textContent = `${cards.length} apartments want you`;
      sheet.dataset.phase = 'results';
    };
    if (reduce) { steps.forEach((s) => s.classList.add('is-done')); reveal(); return; }
    steps.forEach((s, i) => {
      timers.push(setTimeout(() => s.classList.add('is-active'), 250 + i * 520));
      timers.push(setTimeout(() => { s.classList.remove('is-active'); s.classList.add('is-done'); }, 250 + i * 520 + 460));
    });
    timers.push(setTimeout(reveal, 250 + steps.length * 520 + 380));
  }
  function closeSheet(refocus = true) {
    if (!sheet || sheet.hidden) return;
    timers.forEach(clearTimeout); timers = [];
    const done = () => {
      sheet.hidden = true; sheet.dataset.phase = 'closed'; sheet.classList.remove('is-closing'); unlock();
      if (refocus) sheetReturn?.focus({ preventScroll: true });
    };
    if (reduce) return done();
    sheet.classList.add('is-closing');
    setTimeout(done, 260);
  }
  if (sheet) {
    $$('[data-sheet-close]', sheet).forEach((b) => b.addEventListener('click', () => closeSheet()));
    sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); trapTab(e, panel); });
    $('[data-sheet-adjust]', sheet)?.addEventListener('click', () => {
      closeSheet(false);
      setTimeout(() => {
        if (isMobile()) return openMsheet('hood');
        pill?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
        openSeg('hood');
        $('[data-seg="hood"] .s-pill__btn')?.focus({ preventScroll: true });
      }, reduce ? 0 : 280);
    });
  }
  $$('[data-open-matches]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openSheet(); }));

  function bindCards(scope) {
    $$('[data-card]', scope).forEach((card) => {
      if (card.dataset.bound) return;
      card.dataset.bound = '1';
      const track = $('[data-track]', card), dots = $$('.s-card__dots span', card);
      const prev = $('[data-prev]', card), next = $('[data-next]', card), count = dots.length;
      const idx = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      const paint = () => {
        const i = idx();
        dots.forEach((d, n) => d.classList.toggle('is-on', n === i));
        prev.disabled = i <= 0; next.disabled = i >= count - 1;
      };
      track.addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
      const go = (d) => track.scrollTo({ left: (idx() + d) * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
      prev.addEventListener('click', () => go(-1));
      next.addEventListener('click', () => go(1));
      paint();
      $('.s-heart', card)?.addEventListener('click', (e) => {
        const h = e.currentTarget;
        h.setAttribute('aria-pressed', String(h.getAttribute('aria-pressed') !== 'true'));
      });
    });
  }

  /* --- Homey drawer + demo replies */
  const launcher = $('[data-launcher]'), drawer = $('[data-drawer]'), dpanel = $('[data-drawer-panel]'), log = $('[data-chat]');
  let drawerReturn = null, busy = false;
  const tick = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const unit = (img, t, m) => `<div class="s-why__top"><img src="/stay/img/${img}.jpg" alt="" width="48" height="46"><div><p class="s-why__t">${t}</p><p class="s-why__m">${m}</p></div></div>`;
  const REPLIES = {
    'Apartments I can move on this week': `<p>Two of your matches are ready to sign this week, for a Nov 1 move-in. Both landlords accept your verification as-is, so there’s nothing new to send.</p>
      <div class="s-why">${unit('c-kitchen', '1BR in Greenpoint', '$2,875 month · Laundry in unit')}${unit('c-prewar', 'Studio in Fort Greene', '$2,400 month · Prewar, south light')}</div>
      <p style="margin-top:10px">Want me to ask both for viewing times?</p>`,
    'Why did you pick this one?': `<p>The 2BR in Long Island City, because it clears every line you gave me:</p>
      <div class="s-why">${unit('c-lic-window', '2BR in Long Island City', '$3,050 month · Available Nov 1')}
      <ul><li>${tick}Rent is 28% of verified income</li><li>${tick}Fits your Nov 1 move-in</li><li>${tick}14 min to your office</li><li>${tick}Landlord accepts your verification as-is</li></ul></div>
      <p style="margin-top:10px">Your call. I can book a viewing if you want one.</p>`,
    'Compare the two LIC units': `<p>Side by side:</p>
      <div class="s-why"><table><thead><tr><th></th><th>2BR</th><th>1BR</th></tr></thead><tbody>
      <tr><th>Rent</th><td>$3,050</td><td>$2,780</td></tr>
      <tr><th>Available</th><td>Nov 1</td><td>Dec 1</td></tr>
      <tr><th>Of your income</th><td>28%</td><td>26%</td></tr>
      <tr><th>Why it fits</th><td>12 min to Midtown</td><td>Skyline view, lower rent</td></tr></tbody></table></div>
      <p style="margin-top:10px">If Nov 1 matters, take the 2BR. If you can wait a month, the 1BR leaves more room in your budget.</p>`,
    'Find similar under $3,100': `<p>Three that keep the same feel and stay under $3,100. All three already accept your verification.</p>
      <div class="s-why">${unit('c-kitchen', '1BR in Greenpoint', '$2,875 month')}${unit('c-windowsill', '1BR in Long Island City', '$2,780 month')}${unit('c-corner', '1BR in Hoboken', '$2,650 month')}</div>`,
    "What's blocking this one?": `<p>Nothing on your side. Your profile is complete.</p><p style="margin-top:8px">The landlord for the 2BR in Hoboken reached out but hasn’t confirmed a viewing time. I’ve followed up, and I’ll tell you the moment they answer.</p>`,
    'Share with my roommates': `<p>I can share your shortlist with your roommates: the apartments and why each one matched. Your verified details stay yours unless you choose to share them.</p><p class="s-why__note" style="padding:8px 0 0">Demo: nothing is sent.</p>`,
  };
  const FALLBACK = '<p>In the real app I’d answer that from your verified profile and your live matches. In this demo, try one of the suggestions below.</p>';
  const addMsg = (html, who) => {
    const el = document.createElement('div');
    el.className = `s-msg s-msg--${who}`;
    if (who === 'me') { el.innerHTML = '<p></p>'; el.querySelector('p').textContent = html; } else el.innerHTML = html;
    log.appendChild(el);
    log.scrollTo({ top: log.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    return el;
  };
  const ask = (q) => {
    if (!log || busy) return;
    busy = true;
    addMsg(q, 'me');
    $$('[data-prompt]').forEach((b) => { if (b.dataset.prompt === q) b.classList.add('is-used'); });
    const typing = document.createElement('div');
    typing.className = 's-msg s-msg--homey';
    typing.innerHTML = '<span class="s-typing" aria-label="Homey is typing"><span></span><span></span><span></span></span>';
    setTimeout(() => { log.appendChild(typing); log.scrollTo({ top: log.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); }, reduce ? 0 : 200);
    setTimeout(() => { typing.remove(); addMsg(REPLIES[q] || FALLBACK, 'homey'); busy = false; }, reduce ? 0 : 950);
  };
  const heroEl = $('[data-hero]');
  const openDrawer = (q) => {
    if (!drawer) return;
    if (drawer.hidden) {
      drawerReturn = document.activeElement;
      drawer.classList.remove('is-closing');
      drawer.hidden = false; lock();
      launcher?.classList.remove('is-shown');
      dpanel?.focus({ preventScroll: true });
    }
    if (q) setTimeout(() => ask(q), reduce ? 0 : 320);
  };
  const closeDrawer = () => {
    if (!drawer || drawer.hidden) return;
    const done = () => {
      drawer.hidden = true; drawer.classList.remove('is-closing'); unlock();
      if (heroEl && heroEl.getBoundingClientRect().bottom < 0) launcher?.classList.add('is-shown');
      drawerReturn?.focus({ preventScroll: true });
    };
    if (reduce) return done();
    drawer.classList.add('is-closing');
    setTimeout(done, 240);
  };
  $$('[data-open-homey]').forEach((b) => b.addEventListener('click', () => openDrawer()));
  document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-prompt]');
    if (p) drawer?.hidden ? openDrawer(p.dataset.prompt) : ask(p.dataset.prompt);
  });
  $$('[data-drawer-close]').forEach((b) => b.addEventListener('click', closeDrawer));
  drawer?.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); trapTab(e, dpanel); });
  $('[data-composer]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#homey-input'), q = input.value.trim();
    if (q) { input.value = ''; ask(q); }
  });
  // "Ask Homey" launcher appears once the film hero is out of view
  if (heroEl && launcher && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      launcher.classList.toggle('is-shown', !e.isIntersecting && (!drawer || drawer.hidden));
    }, { threshold: 0.12 }).observe(heroEl);
  }

  sync();
}


/* ------------------------------------------------------------------ v2 Homey chat card (in-phone demo) */
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const list = (items) => `<ul>${items.map((t) => `<li>${TICK}<span>${t}</span></li>`).join('')}</ul>`;
const CARD_REPLIES = [
  `Two matches can start this week, and both landlords accept your verification as-is:${list(['<strong>1BR · Greenpoint</strong>, $2,875/mo, laundry in unit', '<strong>Studio · Fort Greene</strong>, $2,400/mo'])}Want me to book viewings?`,
  `<strong>2BR · Long Island City</strong> is your best fit because:${list(['Rent is 28% of verified income', 'Fits your Nov 1 move-in', '12 min to Midtown', 'Landlord accepts your verification as-is'])}`,
  `Both fit your budget, but timing decides it:${list(['<strong>Unit A</strong>: $3,050/mo, available Nov 1, 12 min to Midtown', '<strong>Unit B</strong>: $2,990/mo, available Dec 1, a month after your move-in'])}I'd take A. You choose.`,
  `Two more you can qualify for, both under $3,100:${list(['<strong>1BR · Greenpoint</strong>, $2,875/mo', '<strong>Studio · Fort Greene</strong>, $2,400/mo'])}I'll let both landlords know you're verified.`,
  `<strong>2BR · Hoboken</strong> asks for rental history, which you haven't added yet. Your identity, income and assets are already verified. Add it and I'll send your profile.`,
  `Done. I made a link for your roommates with the three matches and why each one fits. It shares the listings, not your documents.`,
];

function homeyCard() {
  const log = $('[data-chat-log]'), input = $('[data-chat-input]'), prompts = $$('[data-pprompt]');
  if (!log || !input || !prompts.length) return;
  let busy = false;
  const toEnd = () => log.scrollTo({ top: log.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  const bubble = (cls, html) => {
    const el = document.createElement('div');
    el.className = `p-b ${cls}`;
    el.innerHTML = html;
    log.appendChild(el);
    toEnd();
    return el;
  };
  prompts.forEach((btn) => btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    prompts.forEach((b) => b.setAttribute('aria-busy', 'true'));
    const q = (btn.textContent || '').trim();
    if (!reduce) {
      input.classList.add('is-typed');
      for (let i = 1; i <= q.length; i += 2) { input.textContent = q.slice(0, i); await wait(16); }
      input.textContent = q;
      await wait(220);
    }
    input.textContent = 'Message Homey';
    input.classList.remove('is-typed');
    bubble('is-me', q.replace(/</g, '&lt;'));
    const typing = bubble('is-h p-typing', '<i></i><i></i><i></i>');
    typing.setAttribute('aria-label', 'Homey is typing');
    await wait(950);
    typing.remove();
    bubble('is-h', CARD_REPLIES[Number(btn.dataset.pprompt)] || '');
    btn.classList.add('is-used');
    prompts.forEach((b) => b.removeAttribute('aria-busy'));
    busy = false;
  }));
}

/* ------------------------------------------------------------------ in-page anchors */
function anchors() {
  $$('a[href^="#"]').forEach((a) => {
    if (a.hasAttribute('data-jump-steps')) return;
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      scrollTo({ top: t.getBoundingClientRect().top + scrollY - 72, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });
}

/* ------------------------------------------------------------------ v3 FAQ + closing film */
function faq() {
  $$('[data-faq-item]').forEach((item) => {
    const q = $('.ly-faq__q', item);
    q.addEventListener('click', () => {
      const open = !item.hasAttribute('data-open');
      item.toggleAttribute('data-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });
}

function finalFilm() {
  const v = $('[data-final-video]');
  if (!v || reduce) return;
  v.muted = true;
  let loaded = false;
  new IntersectionObserver((es) => {
    if (es[0].isIntersecting) { if (!loaded) { v.src = v.dataset.src; loaded = true; } v.play().catch(() => {}); }
    else if (loaded) v.pause();
  }, { rootMargin: '200px 0px' }).observe(v);
}

/* ------------------------------------------------------------------ reels row: muted previews in view, tap to watch with sound */
function reels() {
  const row = $('[data-reels]');
  const modal = $('[data-reel-modal]');
  if (!row || !modal) return;
  const cards = $$('[data-reel]', row);
  const player = $('video', modal);
  const ig = $('.rl-modal-ig', modal);
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach(({ target, isIntersecting }) => {
      const v = $('video', target);
      if (isIntersecting) { v.preload = 'auto'; v.play()?.catch?.(() => {}); }
      else if (!v.paused) v.pause();
    }), { threshold: 0.35 });
    cards.forEach((c) => io.observe(c));
  }
  let last = null;
  const close = () => {
    player.pause();
    player.removeAttribute('src');
    player.load();
    modal.hidden = true;
    unlock();
    last?.focus();
  };
  cards.forEach((c) => c.addEventListener('click', () => {
    last = c;
    player.src = c.dataset.src;
    player.poster = $('video', c).poster;
    player.muted = false;
    ig.hidden = !c.dataset.url;
    if (c.dataset.url) ig.href = c.dataset.url;
    modal.hidden = false;
    lock();
    player.play()?.catch?.(() => {});
    $('[data-reel-close]', modal).focus();
  }));
  $('[data-reel-close]', modal).addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
}

nav();
hero();
reveals();
autoVideos();
floats();
trustTiles();
scrollScenes();
hoodRow();
homeyCard();
homeyAndMatching();
reels();
anchors();
faq();
finalFilm();
