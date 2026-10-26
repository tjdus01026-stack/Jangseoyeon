/* =========================================================
   MEMO MART — stock your memos like groceries, price them,
   and come back later to re-price and rate them.
   - Everything saves instantly to the browser's localStorage.
   - Prices are stored in cents (integer).
   ========================================================= */
(() => {
  'use strict';

  /* ---------- constants ---------- */
  const KEY = 'memo-mart-v3';
  const DAY = 86400000;
  const DUSTY_DAYS = 14;

  // each aisle has its own package color → no separate color picker needed
  const CATS = [
    { id: 'idea',  label: 'Ideas',    aisle: 'Produce',       icon: '💡', tag: 'Farm Fresh',         bg: '#fff04a', bg2: '#ffc400', ink: '#0d1b6e' },
    { id: 'todo',  label: 'To-Do',    aisle: 'Household',     icon: '✅', tag: 'Everyday Essential', bg: '#2fd15a', bg2: '#0f8f34', ink: '#ffffff' },
    { id: 'study', label: 'Study',    aisle: 'Books & Study', icon: '📚', tag: 'Smart Choice',       bg: '#3f8cff', bg2: '#1340c9', ink: '#ffffff' },
    { id: 'daily', label: 'Daily',    aisle: 'Deli',          icon: '☕', tag: 'Made Daily',         bg: '#ffa41f', bg2: '#ff6200', ink: '#ffffff' },
    { id: 'feel',  label: 'Feelings', aisle: 'Bakery',        icon: '💭', tag: 'Baked with Love',    bg: '#ff4a9a', bg2: '#d6005f', ink: '#ffffff' },
    { id: 'etc',   label: 'Misc.',    aisle: 'General Merch', icon: '📦', tag: 'Odds & Ends',        bg: '#a55bff', bg2: '#6a1fd1', ink: '#ffffff' },
  ];

  const STICKER_COLORS = {
    new:  { bg: '#ffe500', fg: '#e30a1b' },
    down: { bg: '#e8101e', fg: '#ffffff' },
    up:   { bg: '#7dff9e', fg: '#0b6b27' },
    best: { bg: '#0d1b6e', fg: '#ffe600' },
    free: { bg: '#e8101e', fg: '#ffffff' },
    dust: { bg: '#e4dfcf', fg: '#6e6857' },
  };

  // cereal-box colorways for combo packs (white sunburst rays on a bold color)
  const RAYS = 'repeating-conic-gradient(from 0deg at 50% 36%, rgba(255,255,255,.8) 0 6deg, transparent 6deg 14deg)';
  const BOXES = [
    { bx: `${RAYS}, radial-gradient(circle at 50% 36%, #fff8b0, #ffe600 45%, #ffc400)`, tf: '#e8101e', te: '#1a46d8', bt2: '#0d1b6e' },
    { bx: `${RAYS}, radial-gradient(circle at 50% 36%, #6af0f5, #0aa3b0 55%, #067a85)`, tf: '#ffffff', te: '#e8101e', bt2: '#ffffff' },
    { bx: `${RAYS}, radial-gradient(circle at 50% 36%, #ff6a5a, #e8101e 55%, #a3000c)`, tf: '#ffe600', te: '#0d1b6e', bt2: '#ffffff' },
    { bx: `${RAYS}, radial-gradient(circle at 50% 36%, #5f9bff, #1a46d8 55%, #0d1b6e)`, tf: '#ffe600', te: '#e8101e', bt2: '#ffffff' },
  ];

  const THEMES = {
    box:     { label: 'Box Ad' },
    sticker: { label: 'Bumper Sticker' },
    coupon:  { label: 'Coupon' },
  };

  const TABS = [
    { id: 'manual',  label: 'Shelf' },
    { id: 'popular', label: 'Best Sellers' },
    { id: 'high',    label: 'Priciest' },
    { id: 'dusty',   label: 'Collecting Dust' },
  ];

  // ▲/▼ step: small prices move in dimes, bigger prices in dollars
  const nudge = (c, dir) => {
    const step = c < 100 || (dir < 0 && c <= 100) ? 10 : c < 100000 ? 100 : 1000;
    return Math.max(0, Math.min(99999999, c + dir * step));
  };

  /* ---------- utils ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const now = () => Date.now();
  const uid = () => Math.random().toString(36).slice(2, 9) + now().toString(36).slice(-4);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const catOf = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
  const aisleNo = (id) => CATS.indexOf(catOf(id)) + 1;
  const colorVars = (catId) => { const c = catOf(catId); return `--c:${c.bg};--c2:${c.bg2};--ci:${c.ink}`; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const fmtDate = (t) => { const d = new Date(t); return `${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
  const md = (t) => { const d = new Date(t); return `${DOW[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`; };
  const shortDate = (t) => { const d = new Date(t); return `${MON[d.getMonth()]} ${d.getDate()}`; };
  const ago = (t) => {
    const d = now() - t;
    if (d < 60000) return 'just now';
    if (d < 3600000) return `${Math.floor(d / 60000)} min ago`;
    if (d < DAY) return `${Math.floor(d / 3600000)} hr ago`;
    if (d < 2 * DAY) return 'yesterday';
    if (d < 60 * DAY) return `${Math.floor(d / DAY)} days ago`;
    return fmtDate(t);
  };
  const starStr = (v) => { const n = Math.max(0, Math.min(5, Math.round(v))); return '★'.repeat(n) + '☆'.repeat(5 - n); };
  const starHTML = (v) => { const n = Math.max(0, Math.min(5, Math.round(v))); return `<span class="on">${'★'.repeat(n)}</span><span class="off">${'★'.repeat(5 - n)}</span>`; };

  // money (cents)
  const usd = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const priceText = (c) => (!c ? 'FREE' : c < 100 ? `${c}¢` : usd(c));
  const toCents = (v) => Math.max(0, Math.min(99999999, Math.round((Number(v) || 0) * 100)));
  const toDollars = (c) => (c / 100).toFixed(2);
  // "charm" pricing: everything ends in 9
  const charm = (c) => {
    if (c <= 0) return 0;
    if (c < 100) return Math.max(9, Math.round(c / 10) * 10 - 1);
    return Math.max(99, Math.round(c / 100) * 100 - 1);
  };

  /* ---------- data ---------- */
  function mk(o) {
    const t = o.createdAt ?? now();
    const price = o.price ?? 199;
    return {
      id: uid(),
      title: o.title,
      body: o.body || '',
      cat: o.cat || 'etc',
      price,
      priceHistory: o.priceHistory || [{ price, at: t }],
      views: o.views || 0,
      reviews: o.reviews || [],
      img: o.img || null,          // drawing (PNG data URL) shown as the product photo
      owner: o.owner ?? ME.uid,    // who may edit / re-price / delete it (cloud mode)
      createdAt: t,
      lastViewedAt: o.lastViewedAt ?? t,
    };
  }

  function seed() {
    const t = now();
    const m1 = mk({
      title: '과제 아이디어: 동네 소리 지도',
      body: '동네 곳곳의 소리를 녹음해서 지도에 핀으로 꽂아두는 웹 프로젝트.\n버스 정류장, 시장, 놀이터, 새벽 편의점…\n소리로 기억하는 동네!',
      cat: 'idea', price: 1199,
      priceHistory: [{ price: 2999, at: t - 9 * DAY }, { price: 1199, at: t - 2 * DAY, note: '범위가 너무 큼. 한 학기 안에 못 할 듯' }],
      views: 7,
      reviews: [{ stars: 2, text: '다시 생각해 보니 별로인 듯', at: t - 2 * DAY }],
      createdAt: t - 9 * DAY, lastViewedAt: t - 2 * DAY,
    });
    const m2 = mk({
      title: '새벽 3시의 깨달음',
      body: '하기 싫은 일은 "딱 5분만 하자"라고 생각하면 30분은 하게 된다.',
      cat: 'feel', price: 9999,
      priceHistory: [{ price: 4999, at: t - 12 * DAY }, { price: 9999, at: t - 3 * DAY, note: '볼 때마다 맞는 말이라서' }],
      views: 15,
      reviews: [{ stars: 5, text: '이건 진짜 명언', at: t - 3 * DAY }, { stars: 4, text: '오늘도 이걸로 과제 시작함', at: t - DAY }],
      createdAt: t - 12 * DAY, lastViewedAt: t - DAY,
    });
    const m3 = mk({
      title: '장보기 목록',
      body: '두부, 대파, 계란 한 판, 우유, 고양이 모래',
      cat: 'todo', price: 99, views: 3,
      createdAt: t - DAY, lastViewedAt: t - 5 * 3600000,
    });
    const m4 = mk({
      title: '디자인 수업 메모 — 그리드',
      body: '여백도 정보다.\n정렬 기준선은 3개 이하로.\n큰 것은 더 크게, 작은 것은 더 작게 — 대비가 위계를 만든다.',
      cat: 'study', price: 2499, views: 9,
      reviews: [{ stars: 5, text: '시험 전에 꼭 다시 볼 것', at: t - 18 * DAY }],
      createdAt: t - 20 * DAY, lastViewedAt: t - 18 * DAY,
    });
    const m5 = mk({
      title: '언젠가 가볼 곳',
      body: '강릉 안목해변 커피거리\n군산 철길마을\n제주 비자림 (아침 일찍)',
      cat: 'daily', price: 499, views: 1,
      createdAt: t - 30 * DAY, lastViewedAt: t - 30 * DAY,
    });
    const m6 = mk({
      title: '친구한테 하고 싶었던 말',
      body: '그때 이사 도와줘서 정말 고마웠다고.\n말로 하기 쑥스러워서 여기 적어둠.',
      cat: 'feel', price: 100000, views: 4,
      createdAt: t - 6 * DAY, lastViewedAt: t - 4 * DAY,
    });
    return {
      memos: [m2, m1, m6, m3, m4, m5],
      sets: [{ id: uid(), name: '과제 준비 기획 세트', items: [m1.id, m4.id], price: 2999, box: 1, createdAt: t - DAY }],
      basket: [],
    };
  }

  /* =========================================================
     SHARED STORE (Firebase) — everyone sees every memo;
     only the author can edit, re-price or delete their own.
     Without a config in js/firebase-config.js the app stays
     local (this browser only), exactly as before.
     ========================================================= */
  const ME = { uid: null };
  const CFG = window.MEMO_MART_FIREBASE;
  const CLOUD = !!(window.firebase && CFG && CFG.apiKey && !/PASTE|YOUR_/i.test(CFG.apiKey));
  const LOCAL_KEY = KEY + '-local';   // per-browser bits in cloud mode: cart + shelf order
  const isMine = (o) => !CLOUD || !o || o.owner === ME.uid;
  const reviewMine = (r) => !CLOUD || !r.by || r.by === ME.uid;

  function load() {
    if (CLOUD) {
      let local = {};
      try { local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch (e) { /* ignore */ }
      return { memos: [], sets: [], basket: Array.isArray(local.basket) ? local.basket : [], order: Array.isArray(local.order) ? local.order : [] };
    }
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.memos)) {
          return { memos: d.memos, sets: Array.isArray(d.sets) ? d.sets : [], basket: Array.isArray(d.basket) ? d.basket : [] };
        }
      }
    } catch (e) { /* storage unavailable → demo data */ }
    return seed();
  }

  function save() {
    if (CLOUD) {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ basket: S.basket, order: S.order })); } catch (e) { /* ignore */ }
      Cloud.push();
      return true;
    }
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) {
      const t = document.getElementById('toast');
      if (t) { t.textContent = 'Storage is full — try a smaller drawing'; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); }
      return false;
    }
  }

  const S = load();
  const UI = { sort: 'manual', q: '', anim: {}, stockCat: 'idea', stockPrice: 199, loaded: !CLOUD, liveItem: null };
  const byId = (id) => S.memos.find((m) => m.id === id);

  const Cloud = (() => {
    if (!CLOUD) return { push() {}, start() {}, ready: Promise.resolve() };
    const app = firebase.initializeApp(CFG);
    const db = firebase.firestore(app);
    const FV = firebase.firestore.FieldValue;
    const synced = { memos: new Map(), sets: new Map() };   // id -> last JSON we know the server has
    const MEMO_KEYS = ['id', 'title', 'body', 'cat', 'price', 'priceHistory', 'views', 'reviews', 'img', 'owner', 'createdAt', 'lastViewedAt'];
    const SET_KEYS = ['id', 'name', 'maker', 'items', 'price', 'box', 'owner', 'createdAt'];
    const pick = (o, keys) => { const r = {}; keys.forEach((k) => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
    const rj = (r) => JSON.stringify(r);
    let timer = null;
    let onRemote = () => {};

    function fail(e) {
      console.error('[memo-mart] cloud write failed', e);
      toast(e && e.code === 'permission-denied' ? 'Only the author can change that' : 'Couldn\'t save online — check your connection');
    }

    function pushMemos() {
      const live = new Set();
      S.memos.forEach((m) => {
        live.add(m.id);
        const now = pick(m, MEMO_KEYS);
        const j = JSON.stringify(now);
        const prevJ = synced.memos.get(m.id);
        if (prevJ === j) return;
        const prev = prevJ ? JSON.parse(prevJ) : null;
        const ref = db.collection('memos').doc(m.id);
        if (!prev) {
          if (!isMine(m)) return;
          ref.set(now).catch(fail);
        } else {
          if (isMine(prev)) {
            const { views, reviews, ...rest } = now;
            ref.set(rest, { merge: true }).catch(fail);
          } else if (now.lastViewedAt !== prev.lastViewedAt) {
            ref.update({ lastViewedAt: now.lastViewedAt }).catch(fail);
          }
          // views: increments, so simultaneous visitors don't overwrite each other
          const dv = (now.views || 0) - (prev.views || 0);
          if (dv) ref.update({ views: FV.increment(dv) }).catch(fail);
          // reviews: add/remove individual reviews instead of overwriting the list
          const before = new Set((prev.reviews || []).map(rj)), after = new Set((now.reviews || []).map(rj));
          const removed = (prev.reviews || []).filter((r) => !after.has(rj(r)));
          const added = (now.reviews || []).filter((r) => !before.has(rj(r)));
          const go = removed.length ? ref.update({ reviews: FV.arrayRemove(...removed) }) : Promise.resolve();
          if (added.length) go.then(() => ref.update({ reviews: FV.arrayUnion(...added) })).catch(fail);
          else go.catch(fail);
        }
        synced.memos.set(m.id, j);
      });
      [...synced.memos.keys()].forEach((id) => {
        if (live.has(id)) return;
        const prev = JSON.parse(synced.memos.get(id));
        synced.memos.delete(id);
        if (isMine(prev)) db.collection('memos').doc(id).delete().catch(fail);
      });
    }

    function pushSets() {
      const live = new Set();
      S.sets.forEach((st) => {
        live.add(st.id);
        /* combos are shared: anyone may edit */
        const now = pick(st, SET_KEYS);
        const j = JSON.stringify(now);
        if (synced.sets.get(st.id) === j) return;
        synced.sets.set(st.id, j);
        db.collection('sets').doc(st.id).set(now).catch(fail);
      });
      [...synced.sets.keys()].forEach((id) => {
        if (live.has(id)) return;
        const prev = JSON.parse(synced.sets.get(id));
        synced.sets.delete(id);
        db.collection('sets').doc(id).delete().catch(fail);
      });
    }

    function push() {
      clearTimeout(timer);
      timer = setTimeout(() => { if (ME.uid) { pushMemos(); pushSets(); } }, 250);
    }

    // apply server data in place, so open views keep working with the same objects
    function apply(list, map, docs, keys) {
      const seen = new Set();
      docs.forEach((d) => {
        const data = d.data();
        data.id = d.id;
        seen.add(d.id);
        const j = JSON.stringify(pick(data, keys));
        const local = list.find((x) => x.id === d.id);
        if (local) {
          const localJ = JSON.stringify(pick(local, keys));
          const pending = map.has(d.id) && localJ !== map.get(d.id);   // local edit not yet pushed
          map.set(d.id, j);
          if (!pending) { Object.keys(local).forEach((k) => { if (!(k in data)) delete local[k]; }); Object.assign(local, data); }
        } else {
          map.set(d.id, j);
          list.push(data);
        }
      });
      // drop items deleted on the server (but keep brand-new local ones not pushed yet)
      for (let i = list.length - 1; i >= 0; i--) {
        const id = list[i].id;
        if (!seen.has(id) && map.has(id)) { map.delete(id); list.splice(i, 1); }
      }
    }

    function sortMemos() {
      const pos = new Map((S.order || []).map((id, i) => [id, i]));
      S.memos.sort((a, b) => {
        const pa = pos.has(a.id) ? pos.get(a.id) : -1, pb = pos.has(b.id) ? pos.get(b.id) : -1;
        if (pa !== pb) return pa - pb;                 // not yet arranged by this visitor → newest first, on top
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      S.sets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    let readyResolve;
    const ready = new Promise((r) => { readyResolve = r; });

    function start(onChange) {
      onRemote = onChange;
      firebase.auth().onAuthStateChanged((u) => {
        if (!u) return;
        ME.uid = u.uid;
        db.collection('memos').onSnapshot((snap) => {
          apply(S.memos, synced.memos, snap.docs, MEMO_KEYS);
          S.memos.forEach((m) => { m.reviews = m.reviews || []; m.priceHistory = m.priceHistory || [{ price: m.price, at: m.createdAt }]; });
          sortMemos();
          readyResolve();
          onRemote();
        }, (e) => { console.error(e); toast('Couldn\'t load the shared shelf'); readyResolve(); });
        db.collection('sets').onSnapshot((snap) => {
          apply(S.sets, synced.sets, snap.docs, SET_KEYS);
          sortMemos();
          onRemote();
        }, (e) => console.error(e));
      });
      firebase.auth().signInAnonymously().catch((e) => { console.error(e); toast('Couldn\'t connect to the shared shelf'); readyResolve(); });
    }

    return { push, start, ready };
  })();

  /* ---------- derived ---------- */
  const avgRating = (m) => { const r = m.reviews.filter((x) => x.stars > 0); return r.length ? r.reduce((a, x) => a + x.stars, 0) / r.length : 0; };
  const prevPrice = (m) => (m.priceHistory.length >= 2 ? m.priceHistory[m.priceHistory.length - 2].price : null);
  const isDusty = (m) => now() - m.lastViewedAt > DUSTY_DAYS * DAY;
  function lastChange(m) {
    const h = m.priceHistory;
    if (h.length < 2) return null;
    const a = h[h.length - 2], b = h[h.length - 1];
    if (a.price === b.price) return null;
    return { dir: b.price > a.price ? 1 : -1, at: b.at };
  }
  const ranking = () => S.memos.filter((m) => m.views > 0).sort((a, b) => b.views - a.views || b.price - a.price).slice(0, 5);

  function sticker(m, rank) {
    if (m.price === 0) return { t: 'FREE!', k: 'free' };
    if (rank === 0 && m.views >= 3) return { t: '#1 SELLER', k: 'best' };
    const ch = lastChange(m);
    if (ch && now() - ch.at < 7 * DAY) return ch.dir < 0 ? { t: 'PRICE DROP!', k: 'down' } : { t: 'VALUE UP!', k: 'up' };
    if (now() - m.createdAt < 3 * DAY) return { t: 'NEW!', k: 'new' };
    if (isDusty(m)) return { t: 'DUSTY', k: 'dust' };
    return null;
  }

  // big red price with superscript cents
  function priceHTML(c, base = 64) {
    if (!c) return `<span class="price" style="--fs:${base}px"><span class="p-free">FREE</span></span>`;
    if (c < 100) {
      return `<span class="price" style="--fs:${base}px"><span class="p-int">${c}</span><span class="p-sup"><span class="p-cents" style="border:0">¢</span><span class="p-unit">ea.</span></span></span>`;
    }
    const s = Math.floor(c / 100).toLocaleString('en-US');
    const cents = String(c % 100).padStart(2, '0');
    const digits = s.replace(/,/g, '').length;
    const eff = digits + 0.35 * (s.length - digits);
    const k = eff <= 2 ? 1 : 2.3 / (eff - 0.3);
    const fs = Math.round(base * Math.min(1, k));
    return `<span class="price" style="--fs:${fs}px"><span class="p-dol">$</span><span class="p-int">${s}</span><span class="p-sup"><span class="p-cents">${cents}</span><span class="p-unit">ea.</span></span></span>`;
  }
  const tagHTML = (c, cls = '', base = 64) => `<div class="tag ${cls}">${priceHTML(c, base)}</div>`;
  function stampTag(holder, c, base) {
    holder.innerHTML = tagHTML(c, 'stamp', base);
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  /* =========================================================
     DRAWING PAD — your doodle becomes the product photo
     ========================================================= */
  const PAD_COLORS = [['#0a1663', 'Navy'], ['#e30a1b', 'Red'], ['#1546d6', 'Blue'], ['#ffd400', 'Yellow'], ['#0f9a3a', 'Green'], ['#8a4b1f', 'Brown'], ['#ff6fb0', 'Pink']];
  const PAD_SIZES = [[9, 'S'], [17, 'M'], [30, 'L']];

  function mountPad(root, { initial = null, onChange = () => {} } = {}) {
    root.innerHTML = `
      <div class="pad-wrap"><canvas class="pad" width="600" height="450"></canvas><span class="pad-hint">✏️ Draw</span></div>
      <div class="pad-tools">
        <div class="pad-colors">${PAD_COLORS.map(([c, n], i) => `<button type="button" class="pad-col ${i ? '' : 'on'}" data-col="${c}" style="--pc:${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div>
        <div class="pad-sizes">${PAD_SIZES.map(([z, n], i) => `<button type="button" class="pad-size ${i === 1 ? 'on' : ''}" data-size="${z}" aria-label="Brush ${n}">${n}</button>`).join('')}<button type="button" class="pad-size" data-eraser aria-label="Eraser" title="Eraser">⌫</button></div>
        <div class="pad-acts"><button type="button" data-undo>Undo</button><button type="button" data-clear>Clear</button></div>
      </div>`;
    const cv = $('canvas', root);
    const g = cv.getContext('2d');
    const hint = $('.pad-hint', root);
    const st = { color: PAD_COLORS[0][0], size: 17, eraser: false, drawing: false, last: null, undo: [] };

    const scan = () => {
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y += 2) {
        for (let x = 0; x < cv.width; x += 2) {
          if (d[(y * cv.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
      }
      return x1 < 0 ? null : { x0, y0, x1, y1 };
    };
    const changed = () => { hint.hidden = !!scan(); onChange(); };

    if (initial) {
      const im = new Image();
      im.onload = () => {
        const k = Math.min((cv.width - 40) / im.width, (cv.height - 40) / im.height, 1.6);
        const w = im.width * k, h = im.height * k;
        g.drawImage(im, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
        changed();
      };
      im.src = initial;
    }

    const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };

    // puffy "3D pen" tube: soft drop shadow, dark rim, then lighter cores shifted up-left
    const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const mix = (c, t, to = 255) => `rgb(${hex(c).map((v) => Math.round(v + (to - v) * t)).join(',')})`;
    function trace(pts, dx, dy) {
      g.beginPath();
      g.moveTo(pts[0].x + dx, pts[0].y + dy);
      if (pts.length === 1) { g.lineTo(pts[0].x + dx + 0.01, pts[0].y + dy); return; }
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        g.quadraticCurveTo(pts[i].x + dx, pts[i].y + dy, mx + dx, my + dy);
      }
      const l = pts[pts.length - 1];
      g.lineTo(l.x + dx, l.y + dy);
    }
    function tube(pts, color, size) {
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = 'rgba(10, 22, 99, .25)'; g.lineWidth = size * 1.05; trace(pts, size * 0.2, size * 0.3); g.stroke();
      g.strokeStyle = mix(color, 0.45, 0); g.lineWidth = size * 1.1; trace(pts, 0, 0); g.stroke();
      const N = 8;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        g.strokeStyle = mix(color, Math.pow(t, 1.6) * 0.82);
        g.lineWidth = Math.max(1, size * (1 - 0.86 * t));
        trace(pts, -size * 0.17 * t, -size * 0.22 * t);
        g.stroke();
      }
    }

    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      const snap = g.getImageData(0, 0, cv.width, cv.height);
      st.undo.push(snap);
      if (st.undo.length > 20) st.undo.shift();
      st.drawing = true;
      st.base = snap;
      st.pts = [pt(e)];
      st.last = st.pts[0];
      if (st.eraser) {
        g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(st.last.x, st.last.y, st.size, 0, Math.PI * 2); g.fill();
      } else {
        tube(st.pts, st.color, st.size);
      }
      hint.hidden = true;
    });
    cv.addEventListener('pointermove', (e) => {
      if (!st.drawing) return;
      const p = pt(e);
      if (st.eraser) {
        g.lineWidth = st.size * 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(st.last.x, st.last.y); g.lineTo(p.x, p.y); g.stroke();
        st.last = p;
        return;
      }
      const l = st.pts[st.pts.length - 1];
      if (Math.hypot(p.x - l.x, p.y - l.y) < 2) return;
      st.pts.push(p);
      g.putImageData(st.base, 0, 0);
      tube(st.pts, st.color, st.size);
    });
    // closed loop → inflated 3D surface (shaded fill + highlight), outline re-drawn on top
    function puff(pts, color, size) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pts.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
      const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(w, h) * 0.75;
      g.save();
      trace(pts, size * 0.35, size * 0.5); g.closePath();
      g.fillStyle = 'rgba(10, 22, 99, .25)'; g.fill();
      trace(pts, 0, 0); g.closePath();
      const rg = g.createRadialGradient(cx - w * 0.22, cy - h * 0.26, 0, cx, cy, R);
      rg.addColorStop(0, mix(color, 0.85));
      rg.addColorStop(0.28, mix(color, 0.35));
      rg.addColorStop(0.65, color);
      rg.addColorStop(1, mix(color, 0.4, 0));
      g.fillStyle = rg; g.fill();
      g.clip();
      // glossy spot
      g.beginPath();
      g.ellipse(cx - w * 0.2, cy - h * 0.24, Math.max(4, w * 0.16), Math.max(3, h * 0.09), -0.5, 0, Math.PI * 2);
      g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
      g.restore();
      tube(pts, color, size);
    }
    const end = () => {
      if (!st.drawing) return;
      st.drawing = false;
      g.globalCompositeOperation = 'source-over';
      if (!st.eraser && st.pts.length > 8) {
        const a = st.pts[0], z = st.pts[st.pts.length - 1];
        let len = 0;
        for (let i = 1; i < st.pts.length; i++) len += Math.hypot(st.pts[i].x - st.pts[i - 1].x, st.pts[i].y - st.pts[i - 1].y);
        if (Math.hypot(a.x - z.x, a.y - z.y) < Math.max(26, st.size * 2) && len > 80) {
          g.putImageData(st.base, 0, 0);
          puff(st.pts, st.color, st.size);
        }
      }
      changed();
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);

    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.col) { st.color = b.dataset.col; st.eraser = false; $$('.pad-col', root).forEach((x) => x.classList.toggle('on', x === b)); $('[data-eraser]', root).classList.remove('on'); }
      else if (b.dataset.size) { st.size = Number(b.dataset.size); $$('[data-size]', root).forEach((x) => x.classList.toggle('on', x === b)); }
      else if ('eraser' in b.dataset) { st.eraser = !st.eraser; b.classList.toggle('on', st.eraser); }
      else if ('undo' in b.dataset) { const d = st.undo.pop(); if (d) { g.putImageData(d, 0, 0); changed(); } }
      else if ('clear' in b.dataset) { st.undo.push(g.getImageData(0, 0, cv.width, cv.height)); g.clearRect(0, 0, cv.width, cv.height); changed(); }
    });

    return {
      isEmpty: () => !scan(),
      clear: () => { g.clearRect(0, 0, cv.width, cv.height); st.undo = []; changed(); },
      // crop to the drawing (like a cut-out product shot) and keep it small for storage
      export: () => {
        const b = scan();
        if (!b) return null;
        const m = 14;
        const sx = Math.max(0, b.x0 - m), sy = Math.max(0, b.y0 - m);
        const sw = Math.min(cv.width, b.x1 + m) - sx, sh = Math.min(cv.height, b.y1 + m) - sy;
        const k = Math.min(1, 380 / Math.max(sw, sh));
        const out = document.createElement('canvas');
        out.width = Math.max(1, Math.round(sw * k)); out.height = Math.max(1, Math.round(sh * k));
        out.getContext('2d').drawImage(cv, sx, sy, sw, sh, 0, 0, out.width, out.height);
        return out.toDataURL('image/png');
      },
    };
  }

  /* =========================================================
     1) QUICK STOCK — write a memo the moment the page opens
     ========================================================= */
  const memoInput = $('#memo-input');
  const stockPriceInput = $('#stock-price');
  const stockGo = $('#stock-go');

  function renderStockForm() {
    $('#aisle-pick').innerHTML = CATS.map((c) =>
      `<button type="button" role="radio" aria-checked="${c.id === UI.stockCat}" data-cat="${c.id}" style="${colorVars(c.id)}">${c.icon} ${c.label}</button>`
    ).join('');
    $('#stock-tag').innerHTML = tagHTML(UI.stockPrice);
  }

  function setStockPrice(c, fromInput) {
    UI.stockPrice = c;
    if (!fromInput) stockPriceInput.value = toDollars(c);
    stampTag($('#stock-tag'), c);
  }

  // first line → product name, the rest → memo body
  function splitMemo(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    const first = (lines.shift() || '').trim();
    let title = first, body = lines.join('\n').trim();
    if (first.length > 80) { title = first.slice(0, 80).trimEnd(); body = (first.slice(80) + '\n' + body).trim(); }
    return { title, body };
  }

  const stockPad = mountPad($('#stock-pad'), { onChange: () => refreshGo() });
  function refreshGo() { stockGo.disabled = !memoInput.value.trim() && stockPad.isEmpty(); }

  function submitStock() {
    const text = memoInput.value;
    const img = stockPad.export();
    if (!text.trim() && !img) { memoInput.focus(); return; }
    if (CLOUD && !ME.uid) { toast('Connecting to the shared shelf…'); return; }
    let { title, body } = splitMemo(text);
    if (!title) title = 'Untitled Doodle';
    const nm = mk({ title, body, cat: UI.stockCat, price: UI.stockPrice, img });
    S.memos.unshift(nm);
    save();
    memoInput.value = '';
    stockPad.clear();
    stockGo.disabled = true;
    UI.anim[nm.id] = 'drop-in';
    UI.q = ''; $('#q').value = '';
    if (UI.sort !== 'manual') { UI.sort = 'manual'; renderTabs(); }
    renderShelf(); renderRank();
    toast('📦 On the shelf!');
    memoInput.focus();
  }

  $('#stock-form').addEventListener('submit', (e) => { e.preventDefault(); submitStock(); });
  memoInput.addEventListener('input', () => refreshGo());
  memoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submitStock(); }
  });
  $('#aisle-pick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    UI.stockCat = b.dataset.cat;
    $$('#aisle-pick button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    memoInput.focus();
  });
  $('.stock-price .stepper').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (b) setStockPrice(nudge(UI.stockPrice, Number(b.dataset.step)));
  });
  stockPriceInput.addEventListener('input', () => setStockPrice(toCents(stockPriceInput.value), true));
  stockPriceInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitStock(); } });

  /* =========================================================
     2) SHELF
     ========================================================= */
  const shelf = $('#shelf');
  const basketEl = $('#basket');

  function renderAll() {
    renderTabs();
    renderShelf();
    renderSets();
    renderRank();
    renderBasket();
  }

  function renderTabs() {
    $('#tabs').innerHTML = TABS.map((t) =>
      `<button type="button" role="tab" aria-selected="${UI.sort === t.id}" data-sort="${t.id}">${t.label}</button>`
    ).join('');
  }

  const canReorder = () => UI.sort === 'manual' && !UI.q.trim();

  function visibleMemos() {
    let list = S.memos.slice();
    const q = UI.q.trim().toLowerCase();
    if (q) list = list.filter((m) => `${m.title} ${m.body} ${m.reviews.map((r) => r.text).join(' ')}`.toLowerCase().includes(q));
    const by = {
      popular: (a, b) => b.views - a.views,
      high: (a, b) => b.price - a.price,
      dusty: (a, b) => a.lastViewedAt - b.lastViewedAt,
    }[UI.sort];
    if (by) list.sort(by);
    return list;
  }

  function cardHTML(m, rank) {
    const cat = catOf(m.cat);
    const st = sticker(m, rank);
    const avg = avgRating(m);
    const prev = prevPrice(m);
    return `
<article class="product ${m.img ? 'has-img' : ''} ${UI.anim[m.id] || ''}" data-id="${m.id}" style="${colorVars(m.cat)}" tabindex="0" aria-label="${esc(m.title)}, ${priceText(m.price)}. Open">
  <button type="button" class="grip" aria-label="Pick up and move" title="Drag to rearrange, or drop into the cart"></button>
  <div class="face">
    <div class="cat-band"><span>${cat.icon} ${cat.label}</span>${st ? `<span class="sticker ${st.k}"><b>${st.t}</b></span>` : ''}</div>
    ${m.img ? `<div class="p-img"><img src="${esc(m.img)}" alt="" draggable="false"></div>` : ''}
    <h3 class="p-title">${esc(m.title)}</h3>
    <div class="meta-line">
      ${prev != null && prev !== m.price ? `<span class="prev">was <s>${priceText(prev)}</s></span>` : ''}
      <span class="stars" aria-label="Rating ${avg.toFixed(1)}">${starHTML(avg)}</span>
      <span>👁 ${m.views} ${m.views === 1 ? 'view' : 'views'}</span>
    </div>
    ${tagHTML(m.price)}
  </div>
</article>`;
  }

  function renderShelf() {
    const list = visibleMemos();
    const rankIds = ranking().map((m) => m.id);
    shelf.innerHTML = list.map((m) => cardHTML(m, rankIds.indexOf(m.id))).join('');
    UI.anim = {};
    const empty = $('#empty');
    empty.hidden = list.length > 0;
    if (!list.length) {
      empty.innerHTML = S.memos.length
        ? 'Nothing matches that search.<small>Try a different word.</small>'
        : 'The shelf is empty!<small>Write your first memo in the box above.</small>';
    }
  }

  function boxOf(s) {
    if (typeof s.box === 'number') return BOXES[s.box % BOXES.length];
    let h = 0;
    for (const ch of s.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return BOXES[h % BOXES.length];
  }

  function renderSets() {
    if (!CLOUD) {
      S.sets.forEach((s) => { s.items = s.items.filter((id) => byId(id)); });
      S.sets = S.sets.filter((s) => s.items.length >= 2);
    }
    // shared mode: only display what's complete; never rewrite other people's combos
    const shown = S.sets.filter((s) => s.items.filter((id) => byId(id)).length >= 2);
    const el = $('#sets');
    if (!shown.length) {
      el.innerHTML = '<div class="sets-empty">No combo packs yet. Open a memo and tap <b>🛒 Add to cart</b> on two or more, then hit <b>Make a Combo</b>.</div>';
      return;
    }
    el.innerHTML = shown.map((s) => {
      const ms = s.items.map(byId).filter(Boolean);
      const sum = ms.reduce((a, m) => a + m.price, 0);
      const diff = sum - s.price;
      const saveTxt = diff > 0 ? `YOU SAVE ${usd(diff)}!` : diff < 0 ? `PREMIUM +${usd(-diff)}` : 'REGULAR PRICE';
      const b = boxOf(s);
      return `
<article class="set-card" data-set="${s.id}">
  <div class="box" style="--bx:${b.bx};--tf:${b.tf};--te:${b.te};--bt2:${b.bt2}">
    <span class="box-cost">${ms.length}-PACK COMBO · EXTRA SIZE</span>
    <span class="brand-oval">Memo Mart's</span>
    <h3 class="box-title" data-setpage role="button" tabindex="0" title="See everything in this combo">${esc(s.name)}</h3>
    ${s.maker ? `<div class="box-maker">PACKED BY ${esc(s.maker)}</div>` : ''}
    <div class="prize">
      <div class="prize-h">FREE INSIDE!</div>
      <ul class="set-items">${ms.map((m) => `<li data-open="${m.id}" style="${colorVars(m.cat)}" title="${esc(m.title)}">${esc(m.title)}</li>`).join('')}</ul>
    </div>
    <div class="box-net">Reg. <s>${priceText(sum)}</s><span class="save">${saveTxt}</span></div>
    ${tagHTML(s.price, '', 60)}
  </div>
  <div class="set-actions">
    <button type="button" class="btn sm btn-red" data-sact="flyer">📰 Make a flyer</button>
    ${`<button type="button" class="btn sm btn-yellow" data-sact="price">🏷 Re-price</button>
    <button type="button" class="btn sm" data-sact="undo">✂ Unbox</button>`}
  </div>
</article>`;
    }).join('');
  }

  function renderRank() {
    const r = ranking();
    $('#rank').innerHTML = r.length
      ? r.map((m, i) => `<li data-open="${m.id}" title="${esc(m.title)}"><span class="rk">#${i + 1}</span><span class="rt">${esc(m.title)}</span><span class="rv">👁 ${m.views}<b>${priceText(m.price)}</b></span></li>`).join('')
      : '<li class="rank-empty">Open your memos to rack up views — the most-read ones land here.</li>';
  }

  function renderBasket() {
    const items = S.basket.map(byId).filter(Boolean);
    if (UI.loaded) S.basket = items.map((m) => m.id);
    basketEl.classList.toggle('show', items.length > 0);
    basketEl.innerHTML = `
  <div class="b-icon" aria-hidden="true">🛒<b>${items.length}</b></div>
  <div class="b-items">
    <span class="b-drop">DROP IT IN THE CART! ⬇</span>
    ${items.map((m) => `<span class="b-chip" style="${colorVars(m.cat)}"><span>${esc(m.title)}</span><button type="button" data-brm="${m.id}" aria-label="Remove ${esc(m.title)}">✕</button></span>`).join('')}
  </div>
  <div class="b-actions">
    <button type="button" class="btn btn-yellow" data-bact="set" ${items.length < 2 ? 'disabled' : ''}>🎁 Make a Combo</button>
    <button type="button" class="btn" data-bact="flyer" ${items.length ? '' : 'disabled'}>📰 Flyer</button>
    <button type="button" class="btn" data-bact="clear" aria-label="Empty cart">✕</button>
  </div>`;
  }

  /* ---------- drag to rearrange / drop in cart ---------- */
  const drag = { pending: null, active: null, justEnded: false };

  shelf.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const card = e.target.closest('.product');
    if (!card) return;
    const onGrip = !!e.target.closest('.grip');
    // mouse can drag from anywhere; touch only from the handle so scrolling still works
    if (!onGrip && e.pointerType !== 'mouse') return;
    drag.pending = { card, id: card.dataset.id, x0: e.clientX, y0: e.clientY };
    if (onGrip) { e.preventDefault(); startDrag(e); }
  });
  window.addEventListener('pointermove', (e) => {
    if (drag.active) { e.preventDefault(); moveDrag(e); return; }
    const p = drag.pending;
    if (p && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 7) startDrag(e);
  }, { passive: false });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  function startDrag(e) {
    const p = drag.pending;
    if (!p) return;
    drag.pending = null;
    const card = p.card;
    const r = card.getBoundingClientRect();
    const ghost = card.cloneNode(true);
    ghost.classList.add('ghost');
    ghost.removeAttribute('tabindex');
    Object.assign(ghost.style, { width: `${r.width}px`, height: `${r.height}px`, left: `${r.left}px`, top: `${r.top}px` });
    document.body.appendChild(ghost);
    card.classList.add('placeholder');
    document.body.classList.add('dragging');
    drag.active = {
      card, id: p.id, ghost,
      dx: p.x0 - r.left, dy: p.y0 - r.top,
      reorder: canReorder(), overBasket: false,
      order0: $$('.product', shelf).map((c) => c.dataset.id).join(),
    };
    moveDrag(e);
  }

  function moveDrag(e) {
    const a = drag.active;
    const x = e.clientX, y = e.clientY;
    a.ghost.style.left = `${x - a.dx}px`;
    a.ghost.style.top = `${y - a.dy}px`;
    const el = document.elementFromPoint(x, y);
    a.overBasket = !!(el && el.closest('#basket'));
    basketEl.classList.toggle('hover', a.overBasket);
    // dropping onto a combo pack adds the memo to it
    const setEl = !a.overBasket && el ? el.closest('#sets .set-card') : null;
    if (a.overSet !== setEl) {
      if (a.overSet) a.overSet.classList.remove('drop-hover', 'drop-no');
      a.overSet = setEl;
      if (setEl) {
        const st = S.sets.find((x) => x.id === setEl.dataset.set);
        setEl.classList.add(st && !st.items.includes(a.id) ? 'drop-hover' : 'drop-no');
      }
    }
    if (!a.overBasket && !setEl && a.reorder && el) {
      const over = el.closest('#shelf .product');
      if (over && over !== a.card) {
        const r = over.getBoundingClientRect();
        const ref = x < r.left + r.width / 2 ? over : over.nextSibling;
        if (ref !== a.card && a.card.nextSibling !== ref) shelf.insertBefore(a.card, ref);
      }
    }
    if (y < 70) window.scrollBy(0, -14);
    else if (y > innerHeight - 130) window.scrollBy(0, 14);
  }

  function endDrag() {
    drag.pending = null;
    const a = drag.active;
    if (!a) return;
    drag.active = null;
    drag.justEnded = true;
    setTimeout(() => { drag.justEnded = false; }, 80);
    document.body.classList.remove('dragging');
    basketEl.classList.remove('hover');

    if (a.overSet) {
      const setEl = a.overSet;
      setEl.classList.remove('drop-hover', 'drop-no');
      const st = S.sets.find((x) => x.id === setEl.dataset.set);
      if (st && !st.items.includes(a.id)) {
        const br = setEl.getBoundingClientRect();
        a.ghost.style.transition = 'left .3s ease-in, top .3s ease-in, transform .3s ease-in, opacity .3s';
        a.ghost.style.left = `${br.left + br.width / 2 - a.ghost.offsetWidth / 2}px`;
        a.ghost.style.top = `${br.top + br.height / 2 - a.ghost.offsetHeight / 2}px`;
        a.ghost.style.transform = 'scale(.15) rotate(-20deg)';
        a.ghost.style.opacity = '0';
        setTimeout(() => a.ghost.remove(), 320);
        const m = byId(a.id);
        st.items.push(a.id);
        if (m) st.price += m.price;           // combo price grows by the added item's price
        save();
        renderShelf(); renderSets();
        const card = $(`#sets .set-card[data-set="${st.id}"] .box`);
        if (card) { card.classList.add('bump'); setTimeout(() => card.classList.remove('bump'), 500); }
        toast(`🎁 Added to “${st.name}”`);
        return;
      }
      toast(st ? 'Already in this combo' : 'Combo not found');
    }

    if (a.overBasket) {
      const br = basketEl.getBoundingClientRect();
      a.ghost.style.transition = 'left .3s ease-in, top .3s ease-in, transform .3s ease-in, opacity .3s';
      a.ghost.style.left = `${br.left + br.width / 2 - a.ghost.offsetWidth / 2}px`;
      a.ghost.style.top = `${br.top - a.ghost.offsetHeight / 2}px`;
      a.ghost.style.transform = 'scale(.12) rotate(25deg)';
      a.ghost.style.opacity = '0';
      setTimeout(() => a.ghost.remove(), 320);
      addToBasket(a.id);
      renderShelf();
      return;
    }

    const r = a.card.getBoundingClientRect();
    a.ghost.style.transition = 'left .22s ease-out, top .22s ease-out, transform .22s ease-out';
    a.ghost.style.left = `${r.left}px`;
    a.ghost.style.top = `${r.top}px`;
    a.ghost.style.transform = 'none';
    setTimeout(() => {
      a.ghost.remove();
      a.card.classList.remove('placeholder');
      a.card.classList.add('settle');
      setTimeout(() => a.card.classList.remove('settle'), 400);
    }, 220);

    if (a.reorder) {
      const ids = $$('.product', shelf).map((c) => c.dataset.id);
      if (ids.join() !== a.order0) {
        const map = new Map(S.memos.map((m) => [m.id, m]));
        S.memos = ids.map((id) => map.get(id)).filter(Boolean);
        if (CLOUD) S.order = S.memos.map((m) => m.id);
        save();
      }
    }
  }

  /* ---------- cart ---------- */
  function addToBasket(id) {
    if (!S.basket.includes(id)) { S.basket.push(id); save(); toast('🛒 Added to cart'); }
    renderBasket();
    basketEl.classList.remove('bump');
    void basketEl.offsetWidth;
    basketEl.classList.add('bump');
  }
  function removeFromBasket(id) {
    S.basket = S.basket.filter((x) => x !== id);
    save();
    renderBasket();
  }

  /* ---------- modal ---------- */
  const modal = $('#modal');
  let onModalClose = null;
  function head(title, cls = '', style = '') {
    return `<div class="m-head ${cls}" style="${style}"><span>${title}</span><button type="button" class="m-x" data-close aria-label="Close">✕</button></div>`;
  }
  function openModal(html, cls = '', onClose = null) {
    if (onModalClose) { const f = onModalClose; onModalClose = null; f(); }
    modal.innerHTML = `<div class="modal-card ${cls}" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    onModalClose = onClose;
    const mc = modal.firstElementChild;
    const f = mc.querySelector('[autofocus]');
    (f || mc).focus({ preventScroll: true });
    return mc;
  }
  function closeModal() {
    if (onModalClose) { const f = onModalClose; onModalClose = null; f(); }
    modal.hidden = true;
    modal.innerHTML = '';
    document.body.style.overflow = '';
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) closeModal();
  });

  /* ---------- reusable price editor: every tap saves right away ---------- */
  function mountPriceEditor(root, { get, set, base = 72, withNote = false, onNote }) {
    root.innerHTML = `
      <div class="iv-tag">${tagHTML(get(), '', base)}</div>
      <div class="stepper">
        <button type="button" class="step-btn" data-step="-1" aria-label="Lower price">▼</button>
        <label class="price-field"><b>$</b><input type="number" min="0" step="0.01" value="${toDollars(get())}" inputmode="decimal" aria-label="Price in dollars"></label>
        <button type="button" class="step-btn" data-step="1" aria-label="Raise price">▲</button>
      </div>
      ${withNote ? '<div class="iv-note"><input maxlength="60" placeholder="Why? (optional)"></div>' : ''}`;
    const input = $('.price-field input', root);
    const commit = (v) => {
      if (v === get()) return;
      set(v);
      input.value = toDollars(v);
      stampTag($('.iv-tag', root), v, base);
      const note = $('.iv-note', root);
      if (note) note.classList.add('show');
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-step]');
      if (!b) return;
      commit(nudge(get(), Number(b.dataset.step)));
    });
    input.addEventListener('change', () => commit(toCents(input.value)));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
    if (withNote) $('.iv-note input', root).addEventListener('input', (e) => onNote && onNote(e.target.value.trim()));
  }

  /* =========================================================
     3) ITEM VIEW — read, edit, re-price and rate in one place
     ========================================================= */
  function refreshBehind() { renderShelf(); renderRank(); renderSets(); }

  function countView(m) {
    m.views++;
    m.lastViewedAt = now();
    save();
  }

  function openItem(id, opts = {}) {
    const m = byId(id);
    if (!m) return;
    countView(m);
    refreshBehind();
    const cat = catOf(m.cat);
    const session = { price: null, review: null };

    const mc = openModal(`${head(`${cat.icon} ${cat.label} · Aisle ${aisleNo(m.cat)}`, 'band', colorVars(m.cat))}
<div class="m-body iv-page">
  <div class="iv-hero">
    <div class="iv-media"><div class="iv-photo" id="iv-photo"></div><div class="iv-bigtag" id="iv-bigtag">${tagHTML(m.price, '', 84)}</div></div>
    <div class="iv-info">
      <div class="iv-crumb">${cat.icon} ${cat.label} · Aisle ${aisleNo(m.cat)}</div>
      <h2 class="iv-title editable" data-edit="title" spellcheck="false">${esc(m.title)}</h2>
      <div class="iv-body iv-desc editable" data-edit="body">${esc(m.body)}</div>
      <div class="iv-avg" id="iv-avg"></div>
      <div class="iv-buy">
        <button type="button" class="btn btn-red big" id="iv-cart"></button>
        <button type="button" class="btn" id="iv-flyer">📰 Flyer</button>
      </div>
      <div class="iv-meta">${shortDate(m.createdAt)} · 👁 ${m.views}</div>
    </div>
  </div>

  <div class="iv-sec"><h4>Price</h4></div>
  <div class="iv-price" id="iv-price"></div>

  <div class="iv-sec"><h4>Reviews</h4><span class="rate-saved" id="iv-saved">✓ Saved</span></div>
  <div class="review-box">
    <div class="star-input" role="radiogroup" aria-label="Rate this memo">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
    <input id="iv-comment" maxlength="200" placeholder="Write a review…" aria-label="Review">
    <button type="button" class="btn btn-red" id="iv-post" aria-label="Post review">↵</button>
  </div>
  <ul class="reviews" id="iv-reviews"></ul>

  <div class="iv-sec"><h4>Price history</h4></div>
  <div id="iv-history"></div>

  <div class="iv-foot">
    <button type="button" class="btn ghost" id="iv-del">Remove</button>
  </div>
</div>`, 'item', () => {
      UI.liveItem = null;
      // don't lose a half-typed review when the view closes
      const c = $('#iv-comment', mc);
      if (c && c.value.trim()) addComment(c.value.trim());
      refreshBehind();
    });

    const mine = isMine(m);
    mc.classList.toggle('not-mine', !mine);
    const backSet = opts.backSet && S.sets.find((x) => x.id === opts.backSet);
    if (backSet) {
      const bk = document.createElement('button');
      bk.type = 'button'; bk.className = 'btn iv-back'; bk.textContent = `← ${backSet.name}`;
      bk.addEventListener('click', () => openSetPage(backSet));
      $('.iv-foot', mc).prepend(bk);
    }
    // live refresh when someone else reviews / views this item
    UI.liveItem = { id: m.id, refresh: () => { renderReviews(); renderHistory(); } };

    // --- inline editing (saved on blur) — author only ---
    $$('.editable', mc).forEach((el) => {
      if (!mine) { el.classList.remove('editable'); return; }
      el.contentEditable = 'plaintext-only';
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
      el.addEventListener('keydown', (e) => {
        if (el.dataset.edit === 'title' && e.key === 'Enter') { e.preventDefault(); el.blur(); }
      });
      el.addEventListener('blur', () => {
        const v = el.innerText.replace(/\n+$/, '');
        if (el.dataset.edit === 'title') {
          const t = v.trim();
          if (!t) { el.textContent = m.title; return; }
          if (t !== m.title) { m.title = t; save(); flashSaved(); }
        } else if (v !== m.body) { m.body = v.trim(); save(); flashSaved(); }
      });
    });

    // --- product photo (drawing) ---
    const photo = $('#iv-photo', mc);
    function renderPhoto() {
      photo.innerHTML = m.img
        ? `<div class="iv-shot"><img src="${esc(m.img)}" alt="Drawing of ${esc(m.title)}"></div>`
        : `<div class="iv-shot iv-noimg"><span>${cat.icon}</span></div>`;
    }
    renderPhoto();

    // --- price (instant) — author only ---
    if (mine) mountPriceEditor($('#iv-price', mc), {
      get: () => m.price,
      set: (v) => {
        if (session.price) session.price.price = v;
        else { session.price = { price: v, at: now() }; m.priceHistory.push(session.price); }
        m.price = v;
        save();
        stampTag($('#iv-bigtag', mc), v, 84);
        renderHistory();
        flashSaved();
      },
      withNote: true,
      onNote: (txt) => { if (session.price) { session.price.note = txt; save(); renderHistory(); } },
    });

    // --- rating (instant) ---
    const si = $('.star-input', mc);
    let picked = 0;
    const paintStars = (n) => $$('button', si).forEach((b) => b.classList.toggle('on', Number(b.dataset.star) <= n));
    si.addEventListener('mouseover', (e) => { const b = e.target.closest('[data-star]'); if (b) paintStars(Number(b.dataset.star)); });
    si.addEventListener('mouseleave', () => paintStars(picked));
    si.addEventListener('click', (e) => {
      const b = e.target.closest('[data-star]');
      if (!b) return;
      const n = Number(b.dataset.star);
      picked = n;
      if (session.review) session.review.stars = n;
      else { session.review = { id: uid(), by: ME.uid, stars: n, text: '', at: now() }; m.reviews.push(session.review); }
      save();
      paintStars(n);
      si.classList.remove('pop'); void si.offsetWidth; si.classList.add('pop');
      renderReviews();
      flashSaved();
    });
    function addComment(text) {
      if (session.review && !session.review.text) session.review.text = text;
      else { session.review = { id: uid(), by: ME.uid, stars: 0, text, at: now() }; m.reviews.push(session.review); }
      save();
    }
    const comment = $('#iv-comment', mc);
    function post() {
      const t = comment.value.trim();
      if (!t && !session.review) { comment.focus(); return; }
      if (t) addComment(t);
      comment.value = '';
      session.review = null;      // next stars/text start a new review
      picked = 0; paintStars(0);
      renderReviews();
      flashSaved();
      comment.focus();
    }
    comment.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      post();
    });
    $('#iv-post', mc).addEventListener('click', post);

    function renderReviews() {
      const avg = avgRating(m);
      $('#iv-avg', mc).innerHTML = avg ? `<span class="rv-stars">${starHTML(avg)}</span> <b>${avg.toFixed(1)}</b> <small>(${m.reviews.filter((r) => r.stars).length})</small>` : '';
      const ul = $('#iv-reviews', mc);
      ul.innerHTML = m.reviews.length
        ? m.reviews.map((r, i) => ({ r, i })).reverse().map(({ r, i }) =>
          `<li>${r.stars ? `<span class="rv-stars">${starHTML(r.stars)}</span>` : ''}${r.text ? `<span class="rv-text">${esc(r.text)}</span>` : ''}<span class="rv-date">${ago(r.at)}${CLOUD && r.by === ME.uid ? ' · you' : ''}</span>${reviewMine(r) ? `<button type="button" class="rv-del" data-rdel="${i}" aria-label="Delete review">✕</button>` : ''}</li>`
        ).join('')
        : '<li class="no-reviews" style="background:none;border:0;box-shadow:none;padding:0"></li>';
    }
    $('#iv-reviews', mc).addEventListener('click', (e) => {
      const d = e.target.closest('[data-rdel]');
      if (!d) return;
      const r = m.reviews[Number(d.dataset.rdel)];
      if (!reviewMine(r)) return;
      m.reviews.splice(Number(d.dataset.rdel), 1);
      if (r === session.review) { session.review = null; paintStars(0); }
      save();
      renderReviews();
    });

    function renderHistory() {
      const h = m.priceHistory;
      const show = h.slice(-5);
      $('#iv-history', mc).innerHTML = `
        <ul class="history">${show.map((x, i) => `${i ? '<span class="arrow">→</span>' : ''}<li class="${x === h[h.length - 1] ? 'now' : ''}"><span class="h-price">${priceText(x.price)}</span><span class="h-date">${shortDate(x.at)}</span></li>`).join('')}</ul>
        <ul class="h-notes">${h.filter((x) => x.note).slice(-3).reverse().map((x) => `<li>“${esc(x.note)}” <small style="color:#999;font-family:var(--f-body)">— ${shortDate(x.at)}</small></li>`).join('')}</ul>`;
    }

    // --- footer ---
    const cartBtn = $('#iv-cart', mc);
    const paintCart = () => {
      const inCart = S.basket.includes(m.id);
      cartBtn.textContent = inCart ? '✓ In cart' : '🛒 Add to cart';
      cartBtn.classList.toggle('in', inCart);
    };
    cartBtn.addEventListener('click', () => {
      if (S.basket.includes(m.id)) removeFromBasket(m.id); else addToBasket(m.id);
      paintCart();
    });
    $('#iv-flyer', mc).addEventListener('click', () => openFlyer([m.id], { title: m.title }));
    $('#iv-del', mc).addEventListener('click', () => {
      if (!mine) return;
      if (!confirm(`Remove “${m.title}” from the shelf?\nIts reviews and price history go with it.`)) return;
      removeMemo(m.id);
      onModalClose = null;
      closeModal();
      renderAll();
      toast('🗑 Removed');
    });

    let savedTimer;
    function flashSaved() {
      const s = $('#iv-saved', mc);
      if (!s) return;
      s.classList.add('show');
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => s.classList.remove('show'), 1200);
    }

    renderReviews();
    renderHistory();
    paintCart();
  }

  function removeMemo(id) {
    S.memos = S.memos.filter((m) => m.id !== id);
    S.basket = S.basket.filter((x) => x !== id);
    S.sets.forEach((s) => { s.items = s.items.filter((x) => x !== id); });
    S.sets = S.sets.filter((s) => s.items.length >= 2);
    save();
  }

  /* ---------- combo pack station ---------- */
  function openSetMaker() {
    const items = S.basket.map(byId).filter(Boolean);
    if (items.length < 2) return;
    const sum = items.reduce((a, m) => a + m.price, 0);
    const mc = openModal(`${head('🎁 Make a Combo Pack', 'yellow')}
<form class="m-body" id="f-set" autocomplete="off">
  <ul class="pack-list">${items.map((m) => `<li style="${colorVars(m.cat)}"><span>${esc(m.title)}</span><b>${priceText(m.price)}</b></li>`).join('')}</ul>
  <div class="pack-sum">Regular total <b>${priceText(sum)}</b></div>
  <label>Name your combo<input name="name" maxlength="40" required autofocus></label>
  <label>Your name<input name="maker" maxlength="24" required value="${esc(lastMaker())}"></label>
  <div class="m-actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn btn-red big">Box It Up!</button></div>
</form>`);
    const f = $('#f-set', mc);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = f.elements.namedItem('name').value.trim();
      const maker = f.elements.namedItem('maker').value.trim();
      if (!name || !maker) return;
      try { localStorage.setItem(KEY + '-maker', maker); } catch (err) { /* ignore */ }
      S.sets.unshift({ id: uid(), name, maker, items: items.map((m) => m.id), price: charm(sum * 0.8), box: Math.floor(Math.random() * BOXES.length), owner: ME.uid, createdAt: now() });
      S.basket = [];
      save(); closeModal(); renderAll();
      toast('🎁 Combo pack is out!');
      $('#sets').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function lastMaker() { try { return localStorage.getItem(KEY + '-maker') || ''; } catch (e) { return ''; } }

  /* ---------- combo page: every item in the pack ---------- */
  function openSetPage(s) {
    const ms = s.items.map(byId).filter(Boolean);
    const sum = ms.reduce((a, m) => a + m.price, 0);
    const diff = sum - s.price;
    const mc = openModal(`${head(`🎁 ${ms.length}-Pack Combo`, '')}
<div class="m-body combo-page">
  <div class="cp-hero">
    <div class="cp-info">
      <h2 class="cp-title">${esc(s.name)}</h2>
      ${s.maker ? `<div class="cp-maker">PACKED BY <b>${esc(s.maker)}</b></div>` : ''}
      <div class="cp-save">REG. <s>${priceText(sum)}</s> ${diff > 0 ? `· YOU SAVE ${usd(diff)}!` : ''}</div>
    </div>
    <div class="cp-tag">${tagHTML(s.price, '', 80)}</div>
  </div>
  <ul class="cp-list">${ms.map((m) => `
    <li data-cp="${m.id}" style="${colorVars(m.cat)}" tabindex="0" role="button" aria-label="Open ${esc(m.title)}">
      <div class="cp-img">${m.img ? `<img src="${esc(m.img)}" alt="">` : `<span>${catOf(m.cat).icon}</span>`}</div>
      <div class="cp-text">
        <span class="cp-cat">${catOf(m.cat).icon} ${catOf(m.cat).label}</span>
        <b class="cp-name">${esc(m.title)}</b>
        <span class="cp-stars">${starHTML(avgRating(m))} <small>👁 ${m.views}</small></span>
      </div>
      <div class="cp-price">${priceText(m.price)}</div>
    </li>`).join('')}</ul>
  <div class="m-actions"><button type="button" class="btn btn-red" data-cpflyer>📰 Make a flyer</button><button type="button" class="btn" data-close>Close</button></div>
</div>`, 'wide combo');
    const go = (el) => { if (el) openItem(el.dataset.cp, { backSet: s.id }); };
    mc.addEventListener('click', (e) => {
      if (e.target.closest('[data-cpflyer]')) { openFlyer(s.items, { title: s.name, set: s }); return; }
      go(e.target.closest('[data-cp]'));
    });
    mc.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(e.target.closest('[data-cp]')); });
  }

  function openSetPrice(s) {
    const mc = openModal(`${head('🏷 Re-price Combo', 'yellow')}
<div class="m-body">
  <p class="hint" style="text-align:center;font-weight:700;color:var(--blue)">${esc(s.name)}</p>
  <div class="iv-price" id="sp"></div>
  <div class="m-actions"><button type="button" class="btn btn-red" data-close>Done</button></div>
</div>`, '', () => renderSets());
    mountPriceEditor($('#sp', mc), { get: () => s.price, set: (v) => { s.price = v; save(); } });
  }

  /* ---------- weekly ad flyer (canvas → PNG) ---------- */
  const NAVY = '#0a1663', HOT = '#e30a1b', BLUE = '#1546d6', DEEP = '#8a0010', YEL = '#ffe500';
  // same type system as the site
  const F = {
    cond: '"Anton", "Noto Sans KR", Impact, sans-serif',
    slab: '"Alfa Slab One", "Noto Sans KR", Georgia, serif',
    body: '"Nunito", "Noto Sans KR", sans-serif',
    script: '"Lobster", "Noto Sans KR", cursive',
    hand: '"Nunito", "Noto Sans KR", sans-serif',
    pop: '"Anton", "Noto Sans KR", Impact, sans-serif',
    groovy: '"Anton", "Noto Sans KR", Impact, sans-serif',
  };
  let fontsReady = null;
  function loadFonts() {
    if (!fontsReady) {
      const list = ['900 30px "Nunito"', '800 30px "Nunito"', '700 30px "Nunito"', '40px "Anton"', '40px "Alfa Slab One"', '30px "Lobster"', '900 30px "Noto Sans KR"', '700 30px "Noto Sans KR"'];
      fontsReady = document.fonts
        ? Promise.all(list.map((f) => document.fonts.load(f, 'Memo Mart $0123 메모'))).catch(() => {})
        : Promise.resolve();
    }
    return fontsReady;
  }

  const flyerImgs = new Map();
  function loadFlyerImages(memos) {
    return Promise.all(memos.filter((m) => m.img).map((m) => new Promise((res) => {
      const im = new Image();
      im.onload = () => { flyerImgs.set(m.id, im); res(); };
      im.onerror = () => res();
      im.src = m.img;
    })));
  }

  function openFlyer(ids, opt = {}) {
    const memos = ids.map(byId).filter(Boolean);
    if (!memos.length) return;
    const st = { title: opt.title || 'Hot Thoughts This Week!', theme: 'box', set: opt.set || null };
    const mc = openModal(`${head('📰 Print a Flyer', 'blue')}
<div class="m-body">
  <div class="flyer-opts">
    <label>Headline<input id="ft" maxlength="34" value="${esc(st.title)}"></label>
    <div class="field"><span>Style</span><div class="seg">${Object.entries(THEMES).map(([k, v]) => `<label><input type="radio" name="theme" value="${k}" ${k === 'box' ? 'checked' : ''}><span>${v.label}</span></label>`).join('')}</div></div>
  </div>
  ${memos.length > 12 ? '<p class="hint">One flyer fits up to 12 items.</p>' : ''}
  <div class="flyer-preview"><canvas id="fc" role="img" aria-label="Flyer preview"></canvas></div>
  <div class="m-actions"><button type="button" class="btn" data-close>Close</button><button type="button" class="btn btn-red big" id="fdl">⬇ Save as image</button></div>
</div>`, 'wide');
    const cv = $('#fc', mc);
    let seq = 0;
    const imgsReady = loadFlyerImages(memos);
    const redraw = () => { const my = ++seq; Promise.all([loadFonts(), imgsReady]).then(() => { if (my === seq) drawFlyer(cv, memos, st); }); };
    redraw();
    $('#ft', mc).addEventListener('input', (e) => { st.title = e.target.value; redraw(); });
    mc.addEventListener('change', (e) => { if (e.target.name === 'theme') { st.theme = e.target.value; redraw(); } });
    $('#fdl', mc).addEventListener('click', () => {
      cv.toBlob((blob) => {
        if (!blob) { toast('Couldn\'t create the image'); return; }
        const a = document.createElement('a');
        const d = new Date();
        a.href = URL.createObjectURL(blob);
        a.download = `memo-mart-flyer-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
        toast('📰 Flyer saved');
      }, 'image/png');
    });
  }

  /* --- canvas helpers --- */
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function grad(g, x0, y0, x1, y1, stops) {
    const lg = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => lg.addColorStop(o, c));
    return lg;
  }
  const indigo = (g, x, w) => grad(g, x, 0, x + w, 0, [[0, '#0d1b6e'], [0.6, '#1a46d8'], [1, '#2a63f0']]);
  const redGrad = (g, y, h) => grad(g, 0, y, 0, y + h, [[0, '#ff4a3d'], [0.55, '#e8101e'], [1, '#c4000d']]);
  // cereal-box sunburst: radial color + white rays
  function cereal(g, x, y, w, h, cx, cy, c0 = '#fff8b0', c1 = '#ffe600', c2 = '#ffc400') {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    const R = Math.hypot(w, h);
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.6);
    rg.addColorStop(0, c0); rg.addColorStop(0.4, c1); rg.addColorStop(1, c2);
    g.fillStyle = rg; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,.85)';
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a0 = (i * 2 * Math.PI) / n, a1 = a0 + Math.PI / n * 0.85;
      g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath(); g.fill();
    }
    g.restore();
  }
  // 3D extruded text (cereal box / infomercial)
  function extruded(g, text, x, y, { fill, ext, depth = 7, stroke = '#fff', sw = 10, shadow = NAVY }) {
    g.fillStyle = shadow; g.fillText(text, x + depth + 2, y + depth + 3);
    g.lineWidth = sw; g.strokeStyle = ext;
    for (let i = depth; i >= 1; i--) { g.fillStyle = ext; g.fillText(text, x + i, y + i); g.strokeText(text, x + i, y + i); }
    g.lineWidth = sw; g.strokeStyle = stroke; g.strokeText(text, x, y);
    g.fillStyle = fill; g.fillText(text, x, y);
  }
  function sparkle(g, cx, cy, r) {
    g.save();
    g.fillStyle = '#fff';
    g.shadowColor = '#fff';
    g.shadowBlur = r * 0.7;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rad = i % 2 ? r * 0.17 : r;
      const px = cx + rad * Math.cos(a), py = cy + rad * Math.sin(a);
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath();
    g.fill();
    g.restore();
  }
  function spikyEllipse(g, rx, ry, n = 22, inner = 0.8) {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? inner : 1;
      const a = (Math.PI * i) / n;
      const px = rx * r * Math.cos(a), py = ry * r * Math.sin(a);
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath();
  }
  // irregular blob, like a hand-cut price splat
  function blobPath(g, cx, cy, rx, ry) {
    const k = [1, 0.95, 1.04, 0.96, 1.02, 0.93, 1.05, 0.97, 1.01, 0.95];
    const n = k.length;
    const p = k.map((s, i) => {
      const a = (i / n) * Math.PI * 2;
      return [cx + rx * s * Math.cos(a), cy + ry * s * Math.sin(a)];
    });
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    g.beginPath();
    const m0 = mid(p[n - 1], p[0]);
    g.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const m = mid(p[i], p[(i + 1) % n]);
      g.quadraticCurveTo(p[i][0], p[i][1], m[0], m[1]);
    }
    g.closePath();
  }
  // glossy yellow blob (drawn around 0,0)
  function glossyBlob(g, rx, ry) {
    blobPath(g, 0, 0, rx, ry);
    const rg = g.createRadialGradient(-rx * 0.3, -ry * 0.4, 0, 0, 0, rx * 1.1);
    rg.addColorStop(0, '#fff7a0');
    rg.addColorStop(0.4, '#ffe600');
    rg.addColorStop(1, '#ffb800');
    g.fillStyle = rg;
    g.fill();
    g.save();
    g.translate(-rx * 0.45, -ry * 0.52);
    g.rotate(-0.35);
    g.beginPath();
    g.ellipse(0, 0, rx * 0.2, ry * 0.12, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.fill();
    g.restore();
  }

  // hot-pink price with superscript cents
  function drawPrice(g, c, cx, cy, maxW, fs0, color = HOT) {
    g.save();
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillStyle = color;
    const ext = (on) => { g.shadowColor = on ? DEEP : 'transparent'; g.shadowOffsetX = on ? Math.max(2, fs0 / 30) : 0; g.shadowOffsetY = g.shadowOffsetX; g.shadowBlur = 0; };
    ext(true);
    if (!c) {
      let fs = fs0 * 0.8;
      g.font = `${fs}px ${F.cond}`;
      while (g.measureText('FREE').width > maxW && fs > 12) { fs -= 2; g.font = `${fs}px ${F.cond}`; }
      const m = g.measureText('FREE');
      g.fillText('FREE', cx - m.width / 2, cy + (m.actualBoundingBoxAscent || fs * 0.72) / 2);
      g.restore();
      return;
    }
    const small = c < 100;
    const dol = small ? '' : '$';
    const int = small ? String(c) : Math.floor(c / 100).toLocaleString('en-US');
    const cents = small ? '¢' : String(c % 100).padStart(2, '0');
    const unit = 'ea.';
    let fs = fs0, wi, wd, wc, ws, asc, fsD, fsC, fsU;
    for (;;) {
      g.font = `${fs}px ${F.cond}`;
      const mi = g.measureText(int);
      wi = mi.width; asc = mi.actualBoundingBoxAscent || fs * 0.72;
      fsD = fs * 0.42; g.font = `${fsD}px ${F.cond}`; wd = dol ? g.measureText(dol).width + 3 : 0;
      fsC = fs * 0.46; g.font = `${fsC}px ${F.cond}`; wc = g.measureText(cents).width;
      fsU = Math.max(12, fs * 0.17); g.font = `900 ${fsU}px ${F.body}`;
      ws = Math.max(wc, g.measureText(unit).width);
      if (wd + wi + 5 + ws <= maxW || fs <= 14) break;
      fs -= 2;
    }
    const total = wd + wi + 5 + ws;
    const x0 = cx - total / 2;
    const base = cy + asc / 2;
    const top = base - asc;
    if (dol) {
      g.font = `${fsD}px ${F.cond}`;
      g.fillText(dol, x0, top + (g.measureText(dol).actualBoundingBoxAscent || fsD * 0.8) * 0.92);
    }
    g.font = `${fs}px ${F.cond}`;
    g.fillText(int, x0 + wd, base);
    const sx = x0 + wd + wi + 5 + ws / 2;
    g.textAlign = 'center';
    g.font = `${fsC}px ${F.cond}`;
    const ascC = g.measureText(cents).actualBoundingBoxAscent || fsC * 0.72;
    g.fillText(cents, sx, top + ascC);
    if (!small) g.fillRect(sx - wc / 2, top + ascC + fsC * 0.08, wc, Math.max(2, fsC * 0.1));
    ext(false);
    g.font = `900 ${fsU}px ${F.body}`;
    g.fillStyle = NAVY;
    g.fillText(unit, sx, top + ascC + fsC * 0.2 + fsU * 0.95);
    g.restore();
  }

  function wrap(g, text, maxW, maxLines) {
    const widthAt = typeof maxW === 'function' ? maxW : () => maxW;
    const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const out = [];
    let line = '', truncated = false;
    const push = (l) => { out.push(l); return out.length >= maxLines; };
    outer: for (let wi = 0; wi < words.length; wi++) {
      let w = words[wi];
      const t = line ? `${line} ${w}` : w;
      if (g.measureText(t).width <= widthAt(out.length)) { line = t; continue; }
      if (line) {
        if (push(line)) { truncated = true; break; }
        line = '';
      }
      while (g.measureText(w).width > widthAt(out.length)) {
        let cut = 1;
        while (cut < w.length && g.measureText(w.slice(0, cut + 1)).width <= widthAt(out.length)) cut++;
        if (push(w.slice(0, cut))) { truncated = true; break outer; }
        w = w.slice(cut);
      }
      line = w;
    }
    if (!truncated && line) {
      if (out.length < maxLines) out.push(line);
      else truncated = true;
    }
    if (truncated && out.length) {
      const i = out.length - 1;
      let last = out[i];
      while (last && g.measureText(last + '…').width > widthAt(i)) last = last.slice(0, -1);
      out[i] = last.trimEnd() + '…';
    }
    return out;
  }

  function fitLine(g, text, maxW) {
    if (g.measureText(text).width <= maxW) return text;
    let t = text;
    while (t && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  function strike(g, text, x, y, color = HOT) {
    g.fillText(text, x, y);
    const w = g.measureText(text).width;
    const left = g.textAlign === 'right' ? x - w : g.textAlign === 'center' ? x - w / 2 : x;
    g.fillStyle = color;
    g.fillRect(left - 2, y - 2, w + 4, 3.5);
  }

  // blue "ice-cream board" background with light streaks + glints
  function water(g, x, y, w, h) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#1c4fe0'], [0.45, '#0f37b8'], [1, '#0a2590']]);
    g.fillRect(x, y, w, h);
    const glow = g.createRadialGradient(x + w / 2, y, 0, x + w / 2, y, w * 0.7);
    glow.addColorStop(0, 'rgba(90,170,255,.5)'); glow.addColorStop(1, 'rgba(90,170,255,0)');
    g.fillStyle = glow; g.fillRect(x, y, w, h);
    g.translate(x, y);
    g.rotate(-0.38);
    for (let i = -h; i < w + h; i += 150) {
      g.fillStyle = 'rgba(120,200,255,.13)'; g.fillRect(i, -h, 22, h * 4);
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(i + 80, -h, 7, h * 4);
    }
    g.restore();
    g.fillStyle = '#fff';
    [[0.07, 0.2], [0.93, 0.15], [0.7, 0.75], [0.22, 0.85], [0.52, 0.1]].forEach(([fx, fy]) => { g.beginPath(); g.arc(x + w * fx, y + h * fy, 2.6, 0, Math.PI * 2); g.fill(); });
  }

  // drawing as a die-cut sticker: white outline + navy drop shadow
  function cutout(g, im, dx, dy, dw, dh) {
    const o = Math.max(4, Math.round(Math.min(dw, dh) * 0.035));
    const c = document.createElement('canvas');
    c.width = Math.ceil(dw + o * 2); c.height = Math.ceil(dh + o * 2);
    const cg = c.getContext('2d');
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      cg.drawImage(im, o + Math.cos(ang) * o, o + Math.sin(ang) * o, dw, dh);
    }
    cg.globalCompositeOperation = 'source-in';
    cg.fillStyle = '#fff'; cg.fillRect(0, 0, c.width, c.height);
    cg.globalCompositeOperation = 'source-over';
    cg.drawImage(im, o, o, dw, dh);
    g.save();
    g.shadowColor = 'rgba(10, 22, 99, .45)'; g.shadowOffsetX = o * 1.4; g.shadowOffsetY = o * 1.8; g.shadowBlur = o * 0.8;
    g.drawImage(c, dx - o, dy - o);
    g.restore();
  }

  function burstTag(g, cx, cy, rx, ry, c) {
    g.save();
    g.translate(cx, cy);
    g.rotate(-0.12);
    g.save(); g.translate(5, 6); spikyEllipse(g, rx, ry, 18, 0.76); g.fillStyle = NAVY; g.fill(); g.restore();
    spikyEllipse(g, rx, ry, 18, 0.76);
    g.fillStyle = YEL; g.fill();
    g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    drawPrice(g, c, 0, 2, rx * 1.25, ry * 1.05);
    g.restore();
  }

  /* ---- shared bits for the three flyer layouts ---- */
  const isLatin = (t) => /^[\x00-\x7F]*$/.test(t);
  function fitText(g, text, maxW, maxH, fsMax, fsMin, maxLines, weight = '900 ') {
    const t = isLatin(text) ? text.toUpperCase() : text;
    for (let fs = fsMax; fs >= fsMin; fs -= 2) {
      g.font = `${weight}${fs}px ${F.cond}`;
      const lines = wrap(g, t, maxW, maxLines);
      const cut = lines.length && lines[lines.length - 1].endsWith('…');
      if (lines.length * fs * 1.02 <= maxH && (!cut || fs === fsMin)) return { lines, fs };
    }
    g.font = `${weight}${fsMin}px ${F.cond}`;
    return { lines: wrap(g, t, maxW, maxLines), fs: fsMin };
  }
  function outlined(g, lines, fs, x, y, align, fill, stroke, lh = 1.0) {
    g.save();
    g.textAlign = align; g.textBaseline = 'top'; g.lineJoin = 'round';
    lines.forEach((l, i) => {
      const yy = y + i * fs * lh;
      g.fillStyle = NAVY; g.fillText(l, x + 4, yy + 5);
      if (stroke) { g.lineWidth = Math.max(4, fs * 0.1); g.strokeStyle = stroke; g.strokeText(l, x, yy); }
      g.fillStyle = fill; g.fillText(l, x, yy);
    });
    g.restore();
  }
  function product(g, m, x, y, w, h) {
    const pic = m.img ? flyerImgs.get(m.id) : null;
    if (pic) {
      const k = Math.min(w / pic.width, h / pic.height, 3);
      const dw = pic.width * k, dh = pic.height * k;
      cutout(g, pic, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      return { x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh };
    } else {
      const fs = Math.min(w, h) * 0.62;
      g.save();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `${fs}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      g.shadowColor = 'rgba(10,22,99,.4)'; g.shadowOffsetX = 8; g.shadowOffsetY = 10;
      g.fillText(catOf(m.cat).icon, x + w / 2, y + h / 2);
      g.restore();
      return { x: x + (w - fs) / 2, y: y + (h - fs) / 2, w: fs, h: fs };
    }
  }
  // price tag stuck on the product's bottom-right corner
  // price tag stuck on the product's top-left corner
  function stickPrice(g, r, price, size, minLeft = -Infinity, minTop = -Infinity) {
    const rx = size, ry = size * 0.78;
    const cx = Math.max(r.x + rx * 0.25, minLeft + rx * 1.05);
    const cy = Math.max(r.y + ry * 0.35, minTop + ry * 1.05);
    burstTag(g, cx, cy, rx, ry, price);
  }
  function whiteBurst(g, cx, cy, r, text, rot = 0.12) {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.save(); g.translate(5, 6); spikyEllipse(g, r, r * 0.8, 20, 0.8); g.fillStyle = NAVY; g.fill(); g.restore();
    spikyEllipse(g, r, r * 0.8, 20, 0.8); g.fillStyle = '#fff'; g.fill();
    g.lineWidth = 3; g.strokeStyle = NAVY; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = HOT;
    let fs = r * 0.62; g.font = `${fs}px ${F.cond}`;
    while (g.measureText(text).width > r * 1.4 && fs > 10) { fs -= 2; g.font = `${fs}px ${F.cond}`; }
    g.fillText(text, 0, 2);
    g.restore();
  }
  function dealText(m, rank) {
    const prev = prevPrice(m);
    if (prev && prev > m.price && m.price > 0) return `${Math.round((1 - m.price / prev) * 100)}% OFF`;
    const st = sticker(m, rank);
    return st ? st.t : 'FRESH!';
  }

  /* ---- typography for flyer items: italic title, roomier tracking, full memo text ---- */
  const TL = 1.2, BL = 1.45;
  const titleFont = (g, fs) => { g.font = `900 ${fs}px ${F.cond}`; g.letterSpacing = `${(fs * 0.045).toFixed(1)}px`; };
  const bodyFont = (g, fs) => { g.font = `800 ${fs}px ${F.body}`; g.letterSpacing = `${(fs * 0.03).toFixed(1)}px`; };
  function titleBlock(g, text, maxW, fsMax, fsMin, maxLines = 3) {
    const t = isLatin(text) ? text.toUpperCase() : text;
    let fs = fsMax, lines = [];
    for (; fs >= fsMin; fs -= 2) { titleFont(g, fs); lines = wrap(g, t, maxW - fs * 0.2, 99); if (lines.length <= maxLines) break; }
    if (fs < fsMin) { fs = fsMin; titleFont(g, fs); lines = wrap(g, t, maxW - fs * 0.2, 99); }
    g.letterSpacing = '0px';
    return { lines, fs, h: lines.length * fs * TL };
  }
  function bodyBlock(g, text, maxW, fs) {
    if (!text || !text.trim()) return { lines: [], fs, h: 0 };
    bodyFont(g, fs);
    const lines = [];
    String(text).trim().split('\n').forEach((para) => { if (!para.trim()) lines.push(''); else lines.push(...wrap(g, para, maxW, 999)); });
    g.letterSpacing = '0px';
    return { lines, fs, h: lines.length * fs * BL };
  }
  function titleInk(g, tb) {
    g.save(); titleFont(g, tb.fs); g.textBaseline = 'top';
    let top = Infinity, bot = -Infinity;
    tb.lines.forEach((l, i) => {
      const mt = g.measureText(l);
      top = Math.min(top, i * tb.fs * TL - mt.actualBoundingBoxAscent);
      bot = Math.max(bot, i * tb.fs * TL + mt.actualBoundingBoxDescent);
    });
    g.restore();
    return { top, h: bot - top };
  }
  function drawTitle(g, tb, x, y, align, fill, stroke) {
    g.save(); titleFont(g, tb.fs); g.textAlign = align; g.textBaseline = 'top'; g.lineJoin = 'round';
    const SK = 0.24; // true oblique for every script (Korean fonts have no italic)
    tb.lines.forEach((l, i) => {
      const base = y + i * tb.fs * TL + tb.fs;   // slant around the line's bottom
      g.save();
      g.translate(x, base);
      g.transform(1, 0, -SK, 1, 0, 0);
      g.translate(align === 'right' ? -tb.fs * SK : 0, -tb.fs);
      g.fillStyle = NAVY; g.fillText(l, 4, 5);
      g.lineWidth = Math.max(4, tb.fs * 0.1); g.strokeStyle = stroke; g.strokeText(l, 0, 0);
      g.fillStyle = fill; g.fillText(l, 0, 0);
      g.restore();
    });
    g.restore();
  }
  function drawBody(g, bb, x, y, align, color) {
    g.save(); bodyFont(g, bb.fs); g.textAlign = align; g.textBaseline = 'top'; g.fillStyle = color;
    bb.lines.forEach((l, i) => g.fillText(l, x, y + i * bb.fs * BL));
    g.restore();
  }
  function frame(g, x, y, w, h, fill, inner) {
    g.fillStyle = 'rgba(5,12,60,.55)'; g.fillRect(x + 10, y + 12, w, h);
    g.fillStyle = fill; g.fillRect(x, y, w, h);
    g.lineWidth = 6; g.strokeStyle = NAVY; g.strokeRect(x, y, w, h);
    if (inner) { g.lineWidth = 3; g.strokeStyle = inner; g.strokeRect(x + 10, y + 10, w - 20, h - 20); }
  }

  /* layout A — box ad: price burst top-left, italic title top-right, memo, product, deal burst */
  function boxAd(g, m, x, y, w, rank, draw, hOverride) {
    const p = Math.round(w * 0.07);
    const tb = titleBlock(g, m.title, w - p * 2, Math.round(w * 0.14), 24, 3);
    const bb = bodyBlock(g, m.body, w - p * 2, Math.max(18, Math.round(w * 0.036)));
    const gap = Math.round(tb.fs * 0.45) + 18;          // clear space between title and memo
    const by = y + p + tb.h + gap;
    const textBottom = by + bb.h;
    const tag = w * 0.15, tagRy = tag * 0.78;
    // leave room above the drawing for the part of the price tag that sticks out
    const iy = textBottom + tagRy * 0.8 + 24;
    const imgH = w * 0.6;
    const need = iy - y + imgH + p;
    const h = hOverride || need;
    if (!draw) return need;
    frame(g, x, y, w, h, grad(g, 0, y, 0, y + h, [[0, '#ff4a4a'], [0.55, HOT], [1, '#b00012']]), YEL);
    drawTitle(g, tb, x + w - p, y + p, 'right', YEL, NAVY);
    drawBody(g, bb, x + p, by, 'left', '#fff');
    const r = product(g, m, x + p + tag * 0.5, iy, w * 0.62, y + h - p - iy);
    stickPrice(g, r, m.price, tag, x + 14, textBottom + 14);   // never rises into the memo text
    return h;
  }

  /* layout B — bumper-sticker banner */
  const STRIPS = [
    { bg: YEL, title: HOT, stroke: NAVY },
    { bg: BLUE, title: YEL, stroke: NAVY },
    { bg: HOT, title: '#fff', stroke: NAVY },
  ];
  function stickerAd(g, m, x, y, w, i, draw) {
    // bumper-sticker banner: huge italic title, product cut-out at the right end, price stuck on its corner
    const c = STRIPS[i % STRIPS.length];
    const h = 340;
    if (!draw) return h;
    frame(g, x, y, w, h, c.bg, '#fff');
    const imgW = 300;
    const tx = x + 44, tw = w - imgW - 44 - 110;
    const tb = titleBlock(g, m.title, tw, 170, 40, 2);
    while (tb.h > h - 70 && tb.fs > 40) Object.assign(tb, titleBlock(g, m.title, tw, tb.fs - 6, 40, 2));
    const ink = titleInk(g, tb);
    drawTitle(g, tb, tx, y + (h - ink.h) / 2 - ink.top, 'left', c.title, c.stroke);
    const r = product(g, m, x + w - imgW - 40, y + 30, imgW - 20, h - 80);
    stickPrice(g, r, m.price, 76, tx + tw + 4, y + 14);
    return h;
  }

  /* layout C — coupon: product left, red SAVE panel with italic title + memo, price bursts in corners */
  function couponAd(g, m, x, y, w, draw) {
    // coupon: big product on the left, big title + memo filling the right, no inner box
    const p = 40;
    const imgW = w * 0.42;
    const tx = x + p + imgW + 30, tw = w - (tx - x) - p;
    const tb = titleBlock(g, m.title, tw, 108, 34, 2);
    const bb = bodyBlock(g, m.body, tw, 26);
    const ink = titleInk(g, tb);
    const tgap = Math.round(tb.fs * 0.35) + 20;
    const textH = ink.h + (bb.h ? tgap + bb.h : 0);
    const h = Math.max(440, textH + p * 2 + 20);
    if (!draw) return h;
    g.fillStyle = 'rgba(5,12,60,.55)'; g.fillRect(x + 10, y + 12, w, h);
    g.fillStyle = '#fff8dc'; g.fillRect(x, y, w, h);
    g.save(); g.setLineDash([16, 10]); g.lineWidth = 4; g.strokeStyle = NAVY; g.strokeRect(x + 2, y + 2, w - 4, h - 4); g.restore();
    const r = product(g, m, x + p, y + p, imgW, h - p * 2);
    stickPrice(g, r, m.price, 84, x + 14, y + 14);
    const ty = y + (h - textH) / 2;
    drawTitle(g, tb, tx, ty - ink.top, 'left', HOT, NAVY);
    if (bb.h) drawBody(g, bb, tx, ty + ink.h + tgap, 'left', NAVY);
    return h;
  }

  function drawFlyer(cv, memos, st) {
    const theme = THEMES[st.theme] ? st.theme : 'box';
    const items = memos.slice(0, 12);
    const n = items.length;
    const W = 1080, pad = 44, gap = 34;
    const cols = theme === 'box' && n > 1 ? 2 : 1;
    const cw = (W - pad * 2 - gap * (cols - 1)) / cols;
    const g = cv.getContext('2d');
    const rankIds = ranking().map((m) => m.id);
    const measure = (m, i) => theme === 'box' ? boxAd(g, m, 0, 0, cw, 0, false)
      : theme === 'sticker' ? stickerAd(g, m, 0, 0, cw, i, false) : couponAd(g, m, 0, 0, cw, false);
    const rowH = [];
    items.forEach((m, i) => { const r = Math.floor(i / cols); rowH[r] = Math.max(rowH[r] || 0, measure(m, i)); });
    const topY = 78;
    const H = topY + rowH.reduce((a2, b2) => a2 + b2, 0) + gap * Math.max(0, rowH.length - 1) + 70;
    cv.width = W; cv.height = H;
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    const t0 = now();

    water(g, 0, 0, W, H);

    // small print only: store name, dates, combo info
    g.font = `900 24px ${F.cond}`; g.letterSpacing = '1px';
    g.textAlign = 'left'; g.fillStyle = YEL;
    let cap = 'MEMO MART';
    if (st.set) {
      const sum = memos.reduce((s2, m) => s2 + m.price, 0);
      cap += `  ·  COMBO: ${st.set.name}  ${priceText(st.set.price)}${sum > st.set.price ? `  (SAVE ${usd(sum - st.set.price)})` : ''}`;
    }
    g.fillText(fitLine(g, cap, W - pad * 2 - 300), pad, 40);
    g.textAlign = 'right'; g.fillStyle = '#fff';
    g.fillText(`${md(t0)} – ${md(t0 + 6 * DAY)}`, W - pad, 40);
    g.letterSpacing = '0px';

    let yy = topY;
    rowH.forEach((rh, r) => {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (i >= n) break;
        const m = items[i], x = pad + c * (cw + gap);
        if (theme === 'box') boxAd(g, m, x, yy, cw, rankIds.indexOf(m.id), true, rh);
        else if (theme === 'sticker') stickerAd(g, m, x, yy, cw, i, true);
        else couponAd(g, m, x, yy, cw, true);
      }
      yy += rh + gap;
    });

    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `700 16px ${F.body}`;
    g.fillText(`Memo Mart · Prices change with your mind · ${fmtDate(t0)}`, W / 2, H - 32);
  }

  function drawCell(g, m, x, y, w, h, rank) {
    const cat = catOf(m.cat);
    const big = w > 600, mid = w > 400;
    const bandH = big ? 64 : 54;
    const pad = big ? 26 : 18;
    const pic = m.img ? flyerImgs.get(m.id) : null;

    // card: navy shadow, white rim, navy keyline, white→blue face (same as the site)
    g.fillStyle = 'rgba(5,12,60,.55)'; g.fillRect(x + 10, y + 10, w, h);
    g.fillStyle = '#fff'; g.fillRect(x - 6, y - 6, w + 12, h + 12);
    g.lineWidth = 4; g.strokeStyle = NAVY; g.strokeRect(x - 8, y - 8, w + 16, h + 16);
    g.fillStyle = grad(g, 0, y, 0, y + h, [[0, '#ffffff'], [0.42, '#ffffff'], [0.62, '#dceaff'], [0.82, '#6ea2ff'], [1, BLUE]]);
    g.fillRect(x, y, w, h);

    // red label band, yellow condensed caps
    g.fillStyle = grad(g, 0, y, 0, y + bandH, [[0, '#ff5a5a'], [0.5, HOT], [1, '#b00012']]);
    g.fillRect(x, y, w, bandH);
    g.fillStyle = '#fff'; g.fillRect(x, y + bandH - 3, w, 3);
    g.textAlign = 'left';
    g.fillStyle = YEL; g.font = `${big ? 32 : 26}px ${F.cond}`;
    g.fillText(`${cat.icon} ${cat.label.toUpperCase()}`, x + pad - 4, y + bandH / 2 + 1);
    const stk = sticker(m, rank);
    if (stk) {
      const c = STICKER_COLORS[stk.k];
      const bw = big ? 300 : 230, bh = big ? 46 : 38;
      g.save();
      g.beginPath(); g.rect(x, y, w, h); g.clip();
      g.translate(x + w - bw * 0.3, y + bw * 0.3);
      g.rotate(Math.PI / 4);
      g.fillStyle = 'rgba(5,12,60,.45)'; g.fillRect(-bw / 2 + 4, -bh / 2 + 5, bw, bh);
      g.fillStyle = c.bg; g.fillRect(-bw / 2, -bh / 2, bw, bh);
      g.fillStyle = NAVY; g.fillRect(-bw / 2, -bh / 2, bw, 4); g.fillRect(-bw / 2, bh / 2 - 4, bw, 4);
      g.fillStyle = c.fg; g.textAlign = 'center'; g.font = `${big ? 26 : 21}px ${F.cond}`;
      g.fillText(stk.t, 0, 1);
      g.restore();
      g.textAlign = 'left';
    }

    // price burst geometry (bottom-right, overlaps the product like a real ad)
    const rx = Math.min(w * (big ? 0.2 : mid ? 0.23 : 0.27), 150), ry = rx * 0.78;
    const pcx = x + w - rx - 4, pcy = y + h - ry - 6;

    let cy = y + bandH + 10;
    // product photo first
    if (pic) {
      const boxH = h * (big ? 0.46 : 0.42);
      const boxW = w - pad * 2;
      const k = Math.min(boxW / pic.width, boxH / pic.height, 3);
      const dw = pic.width * k, dh = pic.height * k;
      cutout(g, pic, x + (w - dw) / 2, cy + (boxH - dh) / 2 + 4, dw, dh);
      cy += boxH + 10;
    } else {
      cy += 6;
    }

    // name
    const tfs = big ? 66 : mid ? 50 : 40;
    g.font = `900 ${tfs}px ${F.cond}`;
    g.fillStyle = BLUE;
    const tl = wrap(g, m.title.toUpperCase(), w - pad * 2, pic ? 2 : 3);
    tl.forEach((l, i) => g.fillText(l, x + pad, cy + tfs / 2 + i * tfs * 1.05));
    cy += tl.length * tfs * 1.05 + 6;

    // copy
    const bfs = big ? 27 : mid ? 23 : 20;
    const lh = bfs * 1.35;
    const avail = (pcy - ry * 0.7) - cy;
    const maxLines = Math.max(0, Math.min(pic ? 2 : 4, Math.floor(avail / lh)));
    g.font = `700 ${bfs}px ${F.body}`;
    g.fillStyle = '#1b2350';
    if (maxLines && m.body) wrap(g, m.body, w - pad * 2 - (pic ? 0 : rx * 0.4), maxLines).forEach((l, i) => g.fillText(l, x + pad, cy + lh / 2 + i * lh));

    // bottom-left: was / stars / views (white on the blue part)
    const prev = prevPrice(m);
    const avg = avgRating(m);
    const nOn = Math.round(avg);
    let by = y + h - (big ? 30 : 24);
    g.font = `800 ${big ? 22 : 17}px ${F.body}`;
    g.fillStyle = '#fff';
    g.fillText(`👁 ${m.views} VIEW${m.views === 1 ? '' : 'S'}`, x + pad, by);
    by -= big ? 36 : 30;
    g.font = `${big ? 28 : 22}px ${F.body}`;
    g.fillStyle = YEL; g.fillText('★'.repeat(nOn), x + pad, by);
    const onW = g.measureText('★'.repeat(nOn)).width;
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillText('★'.repeat(5 - nOn), x + pad + onW, by);
    if (prev != null && prev !== m.price) {
      by -= big ? 36 : 30;
      g.font = `800 ${big ? 22 : 18}px ${F.body}`;
      g.fillStyle = '#fff';
      strike(g, `WAS ${priceText(prev)}`, x + pad, by, YEL);
    }

    burstTag(g, pcx, pcy, rx, ry, m.price);
  }

  /* ---------- pull an old memo (rediscover) ---------- */
  function dig() {
    if (!S.memos.length) { toast('The shelf is empty'); return; }
    const pool = S.memos.slice().sort((a, b) => a.lastViewedAt - b.lastViewedAt).slice(0, 3);
    const m = pool[Math.floor(Math.random() * pool.length)];
    const days = Math.floor((now() - m.lastViewedAt) / DAY);
    toast(days > 1 ? `🕸 Untouched for ${days} days!` : '🎲 Here\'s one');
    openWithFlip(m.id);
  }

  // the card flips over, then opens as the item view
  function openWithFlip(id) {
    const card = shelf.querySelector(`.product[data-id="${id}"]`);
    if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) { openItem(id); return; }
    card.classList.add('flipping');
    setTimeout(() => { card.classList.remove('flipping'); openItem(id); }, 200);
  }

  /* ---------- wiring ---------- */
  $('#btn-dig').addEventListener('click', dig);
  $('#q').addEventListener('input', (e) => { UI.q = e.target.value; renderShelf(); });
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sort]');
    if (!b) return;
    UI.sort = b.dataset.sort;
    renderTabs(); renderShelf();
  });

  shelf.addEventListener('click', (e) => {
    if (drag.justEnded || e.target.closest('.grip')) return;
    const card = e.target.closest('.product');
    if (card) openWithFlip(card.dataset.id);
  });
  shelf.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('product')) {
      e.preventDefault();
      openItem(e.target.dataset.id);
    }
  });

  $('#sets').addEventListener('keydown', (e) => {
    const sp = e.key === 'Enter' && e.target.closest('[data-setpage]');
    if (sp) { const st = S.sets.find((x) => x.id === sp.closest('[data-set]').dataset.set); if (st) openSetPage(st); }
  });
  $('#sets').addEventListener('click', (e) => {
    const sp = e.target.closest('[data-setpage]');
    if (sp) { const st = S.sets.find((x) => x.id === sp.closest('[data-set]').dataset.set); if (st) openSetPage(st); return; }
    const li = e.target.closest('[data-open]');
    if (li) { openItem(li.dataset.open); return; }
    const b = e.target.closest('[data-sact]');
    if (!b) return;
    const s = S.sets.find((x) => x.id === b.closest('[data-set]').dataset.set);
    if (!s) return;
    const act = b.dataset.sact;
    if (act === 'flyer') openFlyer(s.items, { title: s.name, set: s });
    else if (act === 'price') openSetPrice(s);
    else if (act === 'undo') {
      if (!confirm(`Unbox “${s.name}”? The memos stay on the shelf.`)) return;
      S.sets = S.sets.filter((x) => x !== s);
      save(); renderSets(); toast('✂ Unboxed');
    }
  });

  $('#rank').addEventListener('click', (e) => {
    const li = e.target.closest('[data-open]');
    if (li) openItem(li.dataset.open);
  });

  basketEl.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-brm]');
    if (rm) { removeFromBasket(rm.dataset.brm); return; }
    const b = e.target.closest('[data-bact]');
    if (!b) return;
    const act = b.dataset.bact;
    if (act === 'set') openSetMaker();
    else if (act === 'flyer') openFlyer(S.basket.slice());
    else if (act === 'clear') { S.basket = []; save(); renderBasket(); }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  /* ---------- boot ---------- */
  (function setBurstShape() {
    const n = 18, inner = 0.82, pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? inner : 1;
      const a = (Math.PI * i) / n - Math.PI / 2;
      pts.push(`${(50 + 50 * r * Math.cos(a)).toFixed(2)}% ${(50 + 50 * r * Math.sin(a)).toFixed(2)}%`);
    }
    document.documentElement.style.setProperty('--burst', `polygon(${pts.join(',')})`);
  })();

  renderStockForm();
  renderAll();
  if (!CLOUD) save();
  memoInput.focus({ preventScroll: true });

  if (CLOUD) {
    document.body.classList.add('cloud');
    $('#shelf').innerHTML = '<div class="empty">Loading the shared shelf…</div>';
    Cloud.start(() => {
      UI.loaded = true;
      if (drag.active) return;          // don't yank cards out from under a drag
      renderShelf(); renderSets(); renderRank(); renderBasket();
      if (UI.liveItem && byId(UI.liveItem.id)) UI.liveItem.refresh();
    });
  }
})();
