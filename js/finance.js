/* ===== 模块：记账 ===== */
App.registerModule({
  id: 'finance',
  title: '记账',
  emoji: '💰',
  _ym: (function () { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })(),
  async render(view) {
    const all = await App.dbapi.getAll('finance');
    const ym = this._ym;
    const monthRecs = all.filter((r) => (r.date || '').slice(0, 7) === ym).sort((a, b) => (b.date < a.date ? -1 : 1));
    const exp = monthRecs.filter((r) => r.type === 'exp').reduce((s, r) => s + r.amount, 0);
    const inc = monthRecs.filter((r) => r.type === 'inc').reduce((s, r) => s + r.amount, 0);
    const budget = Number((await App.setting.get('budget')) || 0);

    // 分类统计
    const byCat = {};
    monthRecs.filter((r) => r.type === 'exp').forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + r.amount; });
    const catData = Object.keys(byCat).map((k) => ({ l: k, v: byCat[k] })).sort((a, b) => b.v - a.v);

    // 年份各月
    const y = ym.slice(0, 4);
    const monthExp = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      return { l: (i + 1) + '月', v: all.filter((r) => r.type === 'exp' && (r.date || '').slice(0, 7) === y + '-' + m).reduce((s, r) => s + r.amount, 0) };
    });

    let html = `<div class="page-head"><h1>💰 记账</h1><span class="spacer"></span>
      <button class="btn ghost sm" id="prevM">‹</button>
      <b id="ymLabel">${ym}</b>
      <button class="btn ghost sm" id="nextM">›</button>
      <button class="btn" id="addRec">＋ 记一笔</button></div>`;

    html += `<div class="grid c3">
      <div class="stat"><div class="v">${App.util.fmtMoney(exp)}</div><div class="k">本月支出</div></div>
      <div class="stat"><div class="v" style="color:var(--ok)">${App.util.fmtMoney(inc)}</div><div class="k">本月收入</div></div>
      <div class="stat"><div class="v" style="color:${inc - exp < 0 ? 'var(--bad)' : 'var(--pink-deep)'}">${App.util.fmtMoney(inc - exp)}</div><div class="k">本月结余</div></div>
    </div>`;

    html += `<div class="card"><h2>📊 本月支出分类</h2>`;
    if (catData.length) {
      html += App.util.bars(catData, { color: '#ff6fa5' });
      html += `<div class="legend">` + catData.map((c) => `<span><i style="background:#ff6fa5"></i>${c.l} ${App.util.fmtMoney(c.v)}</span>`).join('') + `</div>`;
    } else html += `<div class="muted">本月还没有支出记录～</div>`;
    html += `</div>`;

    // 预算
    html += `<div class="card"><h2>🎯 月度预算</h2>`;
    if (budget > 0) {
      const pct = Math.min(100, (exp / budget) * 100);
      html += `<div class="bar"><i style="width:${pct}%"></i></div>
        <p class="muted">已用 ${pct.toFixed(0)}% · ${App.util.fmtMoney(exp)} / ${App.util.fmtMoney(budget)}
        ${exp > budget ? '<b style="color:var(--bad)"> ⚠️ 已超预算！</b>' : ''}</p>`;
    } else html += `<p class="muted">未设置预算</p>`;
    html += `<button class="btn soft sm" id="setBudget">设置/修改预算</button></div>`;

    // 全年趋势
    html += `<div class="card"><h2>📈 ${y} 年各月支出</h2>` + App.util.bars(monthExp, { color: '#6aa8ff' }) + `</div>`;

    // 记录列表（按日）
    html += `<div class="card"><h2>🧾 本月明细（${monthRecs.length}）</h2>`;
    if (monthRecs.length) {
      const byDay = {};
      monthRecs.forEach((r) => { (byDay[r.date] = byDay[r.date] || []).push(r); });
      html += `<div class="list">`;
      Object.keys(byDay).sort((a, b) => (b < a ? -1 : 1)).forEach((d) => {
        byDay[d].forEach((r) => {
          html += `<div class="todo">
            <div class="chk" style="border-color:${r.type === 'inc' ? 'var(--ok)' : 'var(--pink)'};background:${r.type === 'inc' ? 'var(--ok)' : 'transparent'};color:#fff">${r.type === 'inc' ? '+' : '−'}</div>
            <div class="todo-main" data-id="${r.id}"><div class="todo-title">${App.util.esc(r.category)} ${r.note ? '· ' + App.util.esc(r.note) : ''}</div>
            <div class="todo-meta"><span>📅 ${App.util.fmtDate(d)}</span></div></div>
            <div class="todo-actions"><b style="color:${r.type === 'inc' ? 'var(--ok)' : 'var(--bad)'}">${r.type === 'inc' ? '+' : '−'}${App.util.fmtMoney(r.amount).replace('¥', '')}</b>
            <button class="btn ghost sm" data-del="${r.id}">删</button></div></div>`;
        });
      });
      html += `</div>`;
    } else html += `<div class="muted">暂无记录</div>`;
    html += `</div>`;

    view.innerHTML = html;
    this._bind(view);
  },
  _bind(view) {
    view.querySelector('#addRec').onclick = () => this._form(view);
    view.querySelector('#prevM').onclick = () => { this._ym = this._shift(this._ym, -1); App.router.render('finance'); };
    view.querySelector('#nextM').onclick = () => { this._ym = this._shift(this._ym, 1); App.router.render('finance'); };
    view.querySelector('#setBudget').onclick = async () => {
      const cur = await App.dbapi.get('settings', 'budget');
      const v = prompt('设置本月预算（元）：', cur || '');
      if (v != null && v !== '') { await App.setting.set('budget', Number(v)); App.router.render('finance'); }
    };
    App.util.$$('[data-del]', view).forEach((b) => b.onclick = async () => {
      if (!confirm('删除该记录？')) return; await App.dbapi.del('finance', b.dataset.del); App.router.render('finance');
    });
  },
  _shift(ym, d) {
    let [y, m] = ym.split('-').map(Number); m += d; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    return y + '-' + String(m).padStart(2, '0');
  },
  _form(view) {
    const cats = ['餐饮', '交通', '购物', '居住', '教育', '医疗', '运动', '娱乐', '其他'];
    const html = `<h3>记一笔</h3>
      <div class="field"><label>类型</label><div class="seg" id="f_type">
        <button class="on" data-v="exp">支出</button><button data-v="inc">收入</button></div></div>
      <div class="field"><label>金额（元）</label><input type="number" id="f_amt" placeholder="0.00" step="0.01"></div>
      <div class="field"><label>分类</label><select id="f_cat">${cats.map((c) => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label>日期</label><input type="date" id="f_date" value="${new Date().toISOString().slice(0, 10)}"></div>
      <div class="field"><label>备注</label><input id="f_note" placeholder="可选"></div>
      <div class="row"><button class="btn" id="save">保存</button><button class="btn ghost" id="cancel">取消</button></div>`;
    const mask = App.modal(html, (m) => {
      let type = 'exp';
      m.querySelectorAll('#f_type button').forEach((b) => b.onclick = () => {
        m.querySelectorAll('#f_type button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); type = b.dataset.v;
      });
      m.querySelector('#save').onclick = async () => {
        const amount = parseFloat(m.querySelector('#f_amt').value);
        if (!amount || amount <= 0) { App.util.toast('请输入金额'); return; }
        const rec = { id: App.util.uid(), type, amount, category: m.querySelector('#f_cat').value, date: m.querySelector('#f_date').value, note: m.querySelector('#f_note').value.trim() };
        await App.dbapi.put('finance', rec); App.closeModal(mask); App.router.render('finance');
      };
      m.querySelector('#cancel').onclick = () => App.closeModal(mask);
    });
  },
});
