/* ===== 小含有点甜 · 工作台 核心层 ===== */
window.App = {
  version: '1.0.0',
  modules: {},
  settings: {},
  db: null,
};

/* ---------- 本地数据库 (IndexedDB) ---------- */
(function () {
  const DB_NAME = 'workbench_db';
  const DB_VER = 1;
  const STORES = ['tasks', 'finance', 'weight', 'plans', 'lessonplans', 'concerts', 'feeds', 'memos', 'fanphotos', 'fanwishes', 'settings', 'cache', 'sync'];

  function open() {
    return new Promise((resolve, reject) => {
      if (App.db) return resolve(App.db);
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        STORES.forEach((s) => {
          if (!db.objectStoreNames.contains(s)) {
            if (s === 'settings' || s === 'cache' || s === 'sync') db.createObjectStore(s, { keyPath: 'k' });
            else db.createObjectStore(s, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = (e) => { App.db = e.target.result; resolve(App.db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  const db = {
    async ready() { await open(); },
    async getAll(store) {
      await open();
      return new Promise((res, rej) => {
        const tx = App.db.transaction(store, 'readonly');
        const r = tx.objectStore(store).getAll();
        r.onsuccess = () => res(r.result || []);
        r.onerror = () => rej(r.error);
      });
    },
    async get(store, key) {
      await open();
      return new Promise((res, rej) => {
        const tx = App.db.transaction(store, 'readonly');
        const r = tx.objectStore(store).get(key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    },
    async put(store, val, key) {
      await open();
      return new Promise((res, rej) => {
        const tx = App.db.transaction(store, 'readwrite');
        const os = tx.objectStore(store);
        if (key !== undefined) os.put(val, key); else os.put(val);
        tx.oncomplete = () => res(val);
        tx.onerror = () => rej(tx.error);
      });
    },
    async del(store, key) {
      await open();
      return new Promise((res, rej) => {
        const tx = App.db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    },
    async clear(store) {
      await open();
      return new Promise((res, rej) => {
        const tx = App.db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    },
  };
  App.dbapi = db;
})();

/* ---------- 工具函数 ---------- */
App.util = {
  $(s, r = document) { return r.querySelector(s); },
  $$(s, r = document) { return Array.from(r.querySelectorAll(s)); },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  fmtDate(d) {
    const x = new Date(d);
    return `${x.getMonth() + 1}月${x.getDate()}日`;
  },
  fmtDateFull(d) {
    const x = new Date(d);
    const w = ['日', '一', '二', '三', '四', '五', '六'][x.getDay()];
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')} 周${w}`;
  },
  fmtMoney(n) {
    const v = Number(n) || 0;
    return (v < 0 ? '-' : '') + '¥' + Math.abs(v).toFixed(2);
  },
  timeSeg(hour) {
    if (hour < 11) return '早';
    if (hour < 14) return '中';
    if (hour < 18) return '晚';
    return '夜';
  },
  debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
  },
  download(name, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  async readFile(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsText(file);
    });
  },
  // 简易 SVG 折线/柱状图
  sparkline(values, opts = {}) {
    const w = opts.w || 300, h = opts.h || 120, pad = 18;
    const max = Math.max(...values, 1), min = Math.min(...values, 0);
    const range = (max - min) || 1;
    const step = (w - pad * 2) / Math.max(values.length - 1, 1);
    const pts = values.map((v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${h - pad} L${pts[0][0].toFixed(1)} ${h - pad} Z`;
    const color = opts.color || '#ff6fa5';
    const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="${color}"/>`).join('');
    const labels = opts.labels ?
      opts.labels.map((l, i) => `<text x="${pts[i][0].toFixed(1)}" y="${h - 3}" font-size="9" fill="#8a7080" text-anchor="middle">${l}</text>`).join('') : '';
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity=".25"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#g1)"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}${labels}
    </svg>`;
  },
  bars(data, opts = {}) {
    const w = opts.w || 300, h = opts.h || 140, pad = 16;
    const max = Math.max(...data.map((d) => Math.abs(d.v)), 1);
    const bw = (w - pad * 2) / data.length;
    const color = opts.color || '#ff6fa5';
    const rects = data.map((d, i) => {
      const bh = (Math.abs(d.v) / max) * (h - pad * 2);
      const x = pad + i * bw + 4;
      const y = d.v >= 0 ? (h - pad - bh) : (h / 2);
      const rectH = d.v >= 0 ? bh : bh;
      return `<rect x="${x}" y="${y.toFixed(1)}" width="${bw - 8}" height="${rectH.toFixed(1)}" rx="4" fill="${d.v < 0 ? '#6aa8ff' : color}"/>
        <text x="${(x + (bw - 8) / 2).toFixed(1)}" y="${h - 3}" font-size="9" fill="#8a7080" text-anchor="middle">${d.l}</text>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${rects}</svg>`;
  },
};

/* ---------- 模块注册 ---------- */
App.registerModule = function (mod) {
  App.modules[mod.id] = mod;
};

/* ---------- 路由 ---------- */
App.router = {
  current: null,
  go(id) {
    if (location.hash !== '#/' + id) location.hash = '#/' + id;
    else this.render(id);
  },
  render(id) {
    const mod = App.modules[id];
    if (!mod) return;
    App.router.current = id;
    const view = document.getElementById('view');
    // 高亮导航
    App.util.$$('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.id === id));
    App.util.$$('.bottomnav .bi').forEach((n) => n.classList.toggle('on', n.dataset.id === id));
    view.scrollTop = 0;
    try { mod.render(view); } catch (e) { view.innerHTML = '<div class="empty">出错了：' + App.util.esc(e.message) + '</div>'; console.error(e); }
    App.refreshBadges();
  },
};

App.refreshBadges = function () {
  Object.values(App.modules).forEach((m) => {
    if (m.badge) {
      const v = m.badge();
      const navEl = App.util.$(`.nav-item[data-id="${m.id}"] .badge`);
      const botEl = App.util.$(`.bottomnav .bi[data-id="${m.id}"] .badge`);
      [navEl, botEl].forEach((el) => {
        if (!el) return;
        if (v) { el.style.display = ''; el.textContent = v; } else el.style.display = 'none';
      });
    }
  });
};

/* ---------- 导航构建 ---------- */
App.buildNav = function () {
  const order = ['tasks', 'exercise', 'fandom', 'lessonplan', 'finance', 'news', 'research', 'sync'];
  const ids = Object.keys(App.modules).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const nav = document.getElementById('nav');
  const bottom = document.getElementById('bottomnav');
  nav.innerHTML = ''; bottom.innerHTML = '';
  ids.forEach((id, i) => {
    const m = App.modules[id];
    const item = document.createElement('div');
    item.className = 'nav-item'; item.dataset.id = id;
    item.innerHTML = `<span class="emoji">${m.emoji}</span><span>${m.title}</span><span class="badge" style="display:none"></span>`;
    item.onclick = () => { App.router.go(id); App.closeDrawer(); };
    nav.appendChild(item);
    if (i < 4) {
      const b = document.createElement('div');
      b.className = 'bi'; b.dataset.id = id;
      b.innerHTML = `<span class="e">${m.emoji}</span><span>${m.title.replace('清单', '').replace('锻炼', '锻炼')}</span><span class="badge" style="display:none"></span>`;
      b.onclick = () => App.router.go(id);
      bottom.appendChild(b);
    }
  });
};

App.openDrawer = function () { document.getElementById('sidebar').classList.add('open'); document.getElementById('scrim').classList.add('show'); };
App.closeDrawer = function () { document.getElementById('sidebar').classList.remove('open'); document.getElementById('scrim').classList.remove('show'); };

/* ---------- 弹层 ---------- */
App.modal = function (html, onShow) {
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = `<div class="modal"><span class="close">×</span>${html}</div>`;
  document.body.appendChild(mask);
  requestAnimationFrame(() => mask.classList.add('show'));
  mask.querySelector('.close').onclick = () => App.closeModal(mask);
  mask.onclick = (e) => { if (e.target === mask) App.closeModal(mask); };
  if (onShow) onShow(mask.querySelector('.modal'));
  return mask;
};
App.closeModal = function (mask) { mask.classList.remove('show'); setTimeout(() => mask.remove(), 200); };

/* ---------- 缓存(联网内容) ---------- */
App.cache = {
  async get(key) { return App.dbapi.get('cache', key); },
  async set(key, val) { await App.dbapi.put('cache', { k: key, data: val, ts: Date.now() }); },
};

/* ---------- 设置（键值） ---------- */
App.setting = {
  async get(key) { const r = await App.dbapi.get('settings', key); return r ? r.v : null; },
  async set(key, val) { await App.dbapi.put('settings', { k: key, v: val }); },
  async all() { const a = await App.dbapi.getAll('settings'); const o = {}; a.forEach((x) => (o[x.k] = x.v)); return o; },
};
