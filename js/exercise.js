/* ===== 模块：锻炼身体 ===== */
App.registerModule({
  id: 'exercise',
  title: '锻炼身体',
  emoji: '💪',
  _tab: 'lib',
  _cat: '全部',
  _part: '全部',
  _age: '通用',
  _q: '',
  _plan: null,
  async render(view) {
    const seg = `<div class="seg" id="tabs">
      <button data-t="lib" class="${this._tab === 'lib' ? 'on' : ''}">📚 动作库</button>
      <button data-t="track" class="${this._tab === 'track' ? 'on' : ''}">🏃 田径专项</button>
      <button data-t="plan" class="${this._tab === 'plan' ? 'on' : ''}">🗓️ 计划生成</button>
      <button data-t="weight" class="${this._tab === 'weight' ? 'on' : ''}">⚖️ 体重监控</button></div>`;
    let html = `<div class="page-head"><h1>💪 锻炼身体</h1></div><div style="margin-bottom:12px">${seg}</div>`;
    view.innerHTML = html;
    App.util.$$('#tabs button', view).forEach((b) => b.onclick = () => { this._tab = b.dataset.t; this.render(view); });
    if (this._tab === 'lib') this._renderLib(view);
    else if (this._tab === 'track') this._renderTrack(view);
    else if (this._tab === 'plan') this._renderPlan(view);
    else this._renderWeight(view);
  },

  /* ---------- 动作库 ---------- */
  async _renderLib(view) {
    const cats = ['全部', '体态', '有氧', '无氧', '体能', '田径'];
    const parts = ['全部', '腿', '臀', '背', '胸', '肩', '手臂', '核心'];
    const ages = ['通用', '儿童', '青少年', '成人', '老年'];
    const partSel = this._cat === '无氧' ? `<div class="seg sm" id="partF" style="margin:8px 0">` + parts.map((p) => `<button data-p="${p}" class="${this._part === p ? 'on' : ''}">${p}</button>`).join('') + `</div>` : '';
    let h = `<div class="seg" id="catF">` + cats.map((c) => `<button data-c="${c}" class="${this._cat === c ? 'on' : ''}">${c}</button>`).join('') + `</div>
      ${partSel}
      <div class="row" style="margin:10px 0;align-items:center">
      <select id="ageF" style="max-width:140px">` + ages.map((a) => `<option ${this._age === a ? 'selected' : ''}>${a}</option>`).join('') + `</select>
      <input id="qF" placeholder="搜索动作…" value="${App.util.esc(this._q)}" style="flex:1">
      <button class="btn soft sm" id="srch">搜索</button></div>
      <div class="grid c3" id="libGrid"></div>`;
    const card = document.createElement('div'); card.className = 'card'; card.style.marginTop = '12px';
    card.innerHTML = h; view.appendChild(card);

    const draw = () => {
      let list = App.data.exercises.slice();
      if (this._cat !== '全部') list = list.filter((e) => e.cat === this._cat);
      if (this._cat === '无氧' && this._part && this._part !== '全部') list = list.filter((e) => e.part === this._part);
      if (this._age !== '通用') list = list.filter((e) => e.age.includes('通用') || e.age.includes(this._age));
      if (this._q) list = list.filter((e) => (e.name + e.target + (e.part || '')).includes(this._q));
      const g = card.querySelector('#libGrid');
      g.innerHTML = list.length ? list.map((e) => `<div class="exo" data-id="${e.id}">
        <div class="face">${e.face}</div><div class="nm">${App.util.esc(e.name)}</div>
        <div class="mt">${e.cat}${e.part ? '·' + e.part : ''} · ${e.target} · ${e.level}</div></div>`).join('')
        : `<div class="empty">没找到动作，换个筛选试试</div>`;
      App.util.$$('.exo', g).forEach((el) => el.onclick = () => this._detail(el.dataset.id));
    };
    draw();
    card.querySelector('#catF').onclick = (e) => { if (e.target.dataset.c) { this._cat = e.target.dataset.c; this.render(view); } };
    const partF = card.querySelector('#partF');
    if (partF) partF.onclick = (e) => { if (e.target.dataset.p) { this._part = e.target.dataset.p; draw(); } };
    card.querySelector('#ageF').onchange = (e) => { this._age = e.target.value; draw(); };
    card.querySelector('#srch').onclick = () => { this._q = card.querySelector('#qF').value.trim(); draw(); };
    card.querySelector('#qF').onkeydown = (e) => { if (e.key === 'Enter') { this._q = e.target.value.trim(); draw(); } };
  },
  _detail(id) {
    const e = App.data.exercises.find((x) => x.id === id); if (!e) return;
    const html = `<h3>${e.face} ${App.util.esc(e.name)}</h3>
      <div style="margin:6px 0">${['体态', '有氧', '无氧', '体能', '田径'].map((c) => `<span class="chip ${e.cat === c ? 'b' : ''}" style="${e.cat === c ? 'background:var(--pink);color:#fff' : ''}">${c}</span>`).join('')}
        ${e.part ? `<span class="tag" style="background:var(--pink-soft);color:var(--pink-deep)">${e.part}</span>` : ''}
        <span class="tag">难度：${e.level}</span><span class="tag">器械：${e.equip}</span><span class="tag">适合：${e.age.join('/')}</span></div>
      <p><b>目标部位：</b>${App.util.esc(e.target)}</p>
      <h3>动作步骤</h3><ol>${e.steps.map((s) => `<li>${App.util.esc(s)}</li>`).join('')}</ol>
      <p class="muted">💡 ${App.util.esc(e.tips)}</p>
      <div class="row"><button class="btn" id="close">知道了</button></div>`;
    const mask = App.modal(html, (m) => { m.querySelector('#close').onclick = () => App.closeModal(mask); });
  },

  /* ---------- 田径运动员专项体能训练版块 ---------- */
  async _renderTrack(view) {
    const groups = {
      '核心稳定': ['ex_deadbug2','ex_pallof','ex_plankdrag','ex_hollow'],
      '下肢力量': ['ex_nordic','ex_rdl','ex_backsquat','ex_boxsquat','ex_trapjump','ex_legcurl'],
      '髋踝专项': ['ex_anklehop','ex_pogos','ex_hurdlehop','ex_hiplock','ex_copenhage'],
      '速度与灵敏': ['ex_accelerate2','ex_fly','ex_hillsprint','ex_ladder','ex_shuttle2','ex_bound'],
      '速度耐力': ['ex_tempo2','ex_interval200','ex_fartlek2','ex_temporun'],
      '恢复再生': ['ex_foamroll','ex_staticstretch','ex_breathing'],
    };
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = `<h2>🏃 田径运动员专项体能</h2>
      <p class="muted">按核心/下肢/髋踝/速度灵敏/速度耐力/恢复再生分类，可直接用于田径队训练或课后自主练习。</p>`;
    Object.keys(groups).forEach((gname) => {
      const ids = groups[gname];
      const items = ids.map((id) => App.data.exercises.find((e) => e.id === id)).filter(Boolean);
      let sec = `<h3 style="color:var(--pink-deep);margin-top:16px">${gname}</h3><div class="grid c3">`;
      sec += items.map((e) => `<div class="exo" data-id="${e.id}"><div class="face">${e.face}</div><div class="nm">${App.util.esc(e.name)}</div><div class="mt">${e.target} · ${e.level}</div></div>`).join('');
      sec += `</div>`;
      const d = document.createElement('div'); d.innerHTML = sec; card.appendChild(d);
    });
    view.appendChild(card);
    App.util.$$('.exo', card).forEach((el) => el.onclick = () => this._detail(el.dataset.id));
  },

  /* ---------- 计划生成器 ---------- */
  async _renderPlan(view) {
    this._plan = (await App.dbapi.getAll('plans')).sort((a, b) => b.created - a.created)[0] || null;
    let h = `<div class="card"><h2>🗓️ 智能计划生成</h2>
      <div class="field"><label>训练目标</label><select id="goal">
        <option value="fat">🔥 减脂塑形</option><option value="muscle">💪 增肌力量</option>
        <option value="posture">🧍 体态矫正（圆肩/驼背/脖子前倾）</option>
        <option value="fit">⚡ 体能提升</option><option value="rehab">🌿 康复/温和恢复</option></select></div>
      <div class="row">
        <div class="field" style="flex:1"><label>周期（周）</label><input type="number" id="weeks" value="4" min="1" max="12"></div>
        <div class="field" style="flex:1"><label>每周天数</label><input type="number" id="days" value="3" min="1" max="6"></div>
      </div>
      <button class="btn" id="gen">✨ 生成我的计划</button></div>`;
    const wrap = document.createElement('div'); wrap.innerHTML = h; view.appendChild(wrap);

    if (this._plan) {
      const p = this._plan;
      let ph = `<div class="card"><h2>📋 当前计划：${App.util.esc(p.name)}</h2>
        <p class="muted">${p.weeks}周 · 每周${p.days}天 · 生成于 ${App.util.fmtDate(new Date(p.created))}
        <button class="btn ghost sm" id="delPlan" style="margin-left:8px">删除</button></p>`;
      p.days.forEach((d) => {
        ph += `<h3>${App.util.esc(d.label)}</h3><div class="list">` + d.items.map((eid) => {
          const e = App.data.exercises.find((x) => x.id === eid); if (!e) return '';
          return `<div class="todo"><div class="chk" style="border-color:transparent;background:var(--pink-bg);color:var(--pink-deep)">${e.face}</div>
            <div class="todo-main"><div class="todo-title">${App.util.esc(e.name)}</div><div class="todo-meta"><span>${e.cat}·${e.level}</span></div></div>
            <button class="btn ghost sm" data-swap="${eid}" data-day="${d.label}">换动作</button></div>`;
        }).join('') + `</div>`;
      });
      ph += `</div>`;
      const pc = document.createElement('div'); pc.innerHTML = ph; view.appendChild(pc);
      pc.querySelector('#delPlan').onclick = async () => { await App.dbapi.del('plans', p.id); this._plan = null; this.render(view); };
      App.util.$$('[data-swap]', pc).forEach((b) => b.onclick = () => this._swap(b.dataset.day, b.dataset.swap, view));
    }
    wrap.querySelector('#gen').onclick = () => this._generate(view);
  },
  _pick(cats, n, avoid) {
    let pool = App.data.exercises.filter((e) => cats.includes(e.cat));
    if (avoid) pool = pool.filter((e) => !avoid.includes(e.id));
    const out = [];
    const copy = pool.slice();
    while (out.length < n && copy.length) { out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0].id); }
    return out;
  },
  _generate(view) {
    const goal = view.querySelector('#goal').value;
    const weeks = Math.max(1, Math.min(12, +view.querySelector('#weeks').value || 4));
    const days = Math.max(1, Math.min(6, +view.querySelector('#days').value || 3));
    const map = {
      fat: { name: '减脂塑形计划', cats: ['有氧', '体能', '无氧'], n: 5 },
      muscle: { name: '增肌力量计划', cats: ['无氧', '无氧', '有氧'], n: 5 },
      posture: { name: '体态矫正计划', cats: ['体态', '无氧', '有氧'], n: 4 },
      fit: { name: '体能提升计划', cats: ['体能', '有氧', '无氧'], n: 5 },
      rehab: { name: '温和康复计划', cats: ['体态', '有氧', '体能'], n: 4 },
    };
    const cfg = map[goal];
    const weekPlan = [];
    for (let i = 1; i <= days; i++) weekPlan.push({ label: '第' + i + '天', items: this._pick(cfg.cats, cfg.n) });
    const plan = { id: App.util.uid(), name: cfg.name, goal, weeks, days, created: Date.now(), days: weekPlan };
    App.dbapi.put('plans', plan).then(() => { this._plan = plan; this.render(view); App.util.toast('计划已生成 🎉'); });
  },
  _swap(dayLabel, eid, view) {
    const cur = App.data.exercises.find((x) => x.id === eid);
    const pool = App.data.exercises.filter((e) => e.cat === cur.cat && e.id !== eid);
    const html = `<h3>替换「${App.util.esc(cur.name)}」</h3><p class="muted">同类型（${cur.cat}）可选：</p><div class="grid c2" id="pool">` +
      pool.map((e) => `<div class="exo" data-pick="${e.id}">${e.face}<div class="nm">${App.util.esc(e.name)}</div><div class="mt">${e.level}·${e.target}</div></div>`).join('') + `</div>`;
    const mask = App.modal(html, (m) => {
      App.util.$$('[data-pick]', m).forEach((el) => el.onclick = () => {
        const p = this._plan; const d = p.days.find((x) => x.label === dayLabel);
        const idx = d.items.indexOf(eid); if (idx >= 0) d.items[idx] = el.dataset.pick;
        App.dbapi.put('plans', p).then(() => { App.closeModal(mask); this.render(view); App.util.toast('已替换 ✅'); });
      });
    });
  },

  /* ---------- 体重监控 ---------- */
  async _renderWeight(view) {
    const recs = (await App.dbapi.getAll('weight')).sort((a, b) => new Date(a.date) - new Date(b.date));
    const goal = await App.setting.get('weightGoal');
    const vals = recs.map((r) => r.weight);
    let h = `<div class="card"><h2>⚖️ 体重 & 身体数据</h2>
      <div class="row" style="align-items:flex-end">
        <div class="field" style="flex:1"><label>今日体重（kg）</label><input type="number" id="w" step="0.1" placeholder="如 62.5"></div>
        <div class="field" style="flex:1"><label>腰围（cm，可选）</label><input type="number" id="waist" step="0.1" placeholder="如 80"></div>
        <div class="field" style="flex:1"><label>日期</label><input type="date" id="wd" value="${new Date().toISOString().slice(0, 10)}"></div>
        <button class="btn" id="addW">记录</button>
      </div>
      <div class="row" style="margin-top:8px">
        <div class="field" style="flex:1"><label>目标体重（kg）</label><input type="number" id="wg" step="0.1" value="${goal || ''}" placeholder="如 58"></div>
        <button class="btn soft sm" id="setGoal">设目标</button>
      </div></div>`;
    view.appendChild(document.createElement('div')).innerHTML = h;
    const c = view.lastChild;

    if (recs.length) {
      const last = recs[recs.length - 1].weight;
      const first = recs[0].weight;
      const diff = (last - first).toFixed(1);
      const labels = recs.map((r) => (r.date || '').slice(5));
      const stat = `<div class="grid c3" style="margin-bottom:12px">
        <div class="stat"><div class="v">${last}</div><div class="k">最新体重kg</div></div>
        <div class="stat"><div class="v" style="color:${diff <= 0 ? 'var(--ok)' : 'var(--bad)'}">${diff > 0 ? '+' : ''}${diff}</div><div class="k">较首次变化</div></div>
        <div class="stat"><div class="v">${goal ? (last - goal).toFixed(1) : '—'}</div><div class="k">距目标</div></div></div>`;
      const chart = `<div class="card"><h2>📉 体重曲线</h2>${App.util.sparkline(vals, { labels, color: '#ff6fa5' })}</div>`;
      const rec = `<div class="card"><h2>🧾 记录（${recs.length}）</h2><div class="list">` + recs.slice().reverse().map((r) =>
        `<div class="todo"><div class="chk" style="border-color:transparent;background:var(--pink-bg);color:var(--pink-deep)">⚖️</div>
        <div class="todo-main"><div class="todo-title">${r.weight} kg${r.waist ? ' · 腰围 ' + r.waist + ' cm' : ''}</div>
        <div class="todo-meta"><span>📅 ${App.util.fmtDate(r.date)}</span></div></div>
        <button class="btn ghost sm" data-wdel="${r.id}">删</button></div>`).join('') + `</div></div>`;
      const wc = document.createElement('div'); wc.innerHTML = stat + chart + rec; view.appendChild(wc);
      App.util.$$('[data-wdel]', wc).forEach((b) => b.onclick = async () => { await App.dbapi.del('weight', b.dataset.wdel); this.render(view); });
    } else {
      view.appendChild(document.createElement('div')).className = 'empty', view.lastChild.innerHTML = '<div class="big">⚖️</div>记录第一笔体重，开始数据化监控吧';
    }
    c.querySelector('#addW').onclick = async () => {
      const w = parseFloat(c.querySelector('#w').value);
      if (!w) { App.util.toast('请输入体重'); return; }
      await App.dbapi.put('weight', { id: App.util.uid(), weight: w, waist: parseFloat(c.querySelector('#waist').value) || null, date: c.querySelector('#wd').value });
      this.render(view);
    };
    c.querySelector('#setGoal').onclick = async () => {
      const g = parseFloat(c.querySelector('#wg').value); if (!g) return;
      await App.setting.set('weightGoal', g); this.render(view);
    };
  },
});
