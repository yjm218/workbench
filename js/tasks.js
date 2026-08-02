/* ===== 模块：任务清单（升级版） ===== */
App.registerModule({
  id: 'tasks',
  title: '任务清单',
  emoji: '📝',
  _filter: 'all',
  _cat: '全部',
  badge() {
    const t = this._todayUndone || 0;
    return t > 0 ? String(t) : '';
  },
  async render(view) {
    const tasks = await App.dbapi.getAll('tasks');
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayUndone = tasks.filter((t) => !t.done && new Date(t.datetime) >= startOfDay && new Date(t.datetime) < new Date(startOfDay.getTime() + 864e5)).length;
    this._todayUndone = todayUndone;
    const total = tasks.length, doneN = tasks.filter((t) => t.done).length;
    const pct = total ? Math.round((doneN / total) * 100) : 0;

    const cats = ['全部', '工作', '备课', '运动', '生活', '追星', '其他'];
    const catIcon = { 工作:'💼', 备课:'📚', 运动:'💪', 生活:'🏠', 追星:'🔥', 其他:'🗂️' };

    let html = `<div class="page-head"><h1>📝 任务清单</h1><span class="sub">优先级 · 分类 · 子任务 · 完成打钩</span>
      <span class="spacer"></span><button class="btn" id="addTask">＋ 新建任务</button></div>`;

    // 顶部统计+进度
    html += `<div class="card" style="display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#fff,#fff0f2)">
      <div style="position:relative;width:72px;height:72px;flex-shrink:0">
        <svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="#ffd1d9" stroke-width="8"/><circle cx="36" cy="36" r="30" fill="none" stroke="url(#rdg)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${pct * 1.885} 188.5" transform="rotate(-90 36 36)"/><defs><linearGradient id="rdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff1f4b"/><stop offset="1" stop-color="#ff758c"/></linearGradient></defs></svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:var(--pink-deep)">${pct}%</div>
      </div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:16px">${doneN}/${total} 已完成 · 今日待办 ${todayUndone}</div>
        <div class="muted" style="margin-top:2px">${pct === 100 ? '🎉 全部完成啦！' : '加油，一项一项来～'}</div>
        <div class="seg" style="margin-top:8px">${cats.map((c) => `<button data-c="${c}" class="${this._cat === c ? 'on' : ''}">${c === '全部' ? '全部' : catIcon[c] + ' ' + c}</button>`).join('')}</div>
      </div>
    </div>`;

    let list = tasks.slice();
    if (this._cat !== '全部') list = list.filter((t) => t.category === this._cat);
    if (this._filter === 'undone') list = list.filter((t) => !t.done);

    const segs = ['早', '中', '晚', '夜'];
    const groups = {}; segs.forEach((s) => (groups[s] = []));
    const overdue = [], done = [];
    list.forEach((t) => {
      const d = new Date(t.datetime);
      if (t.done) { done.push(t); return; }
      if (d < startOfDay) { overdue.push(t); return; }
      const seg = App.util.timeSeg(d.getHours());
      (groups[seg] || (groups[seg] = [])).push(t);
    });

    const segLabel = { 早: '🌅 早间', 中: '☀️ 午间', 晚: '🌆 晚间', 夜: '🌙 夜间' };

    // 即将到期
    const dueSoon = list.filter((t) => !t.done && new Date(t.datetime) >= now && new Date(t.datetime) <= new Date(now.getTime() + 30 * 6e4)).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    if (dueSoon.length) {
      html += `<div class="card" style="border-color:var(--warn);animation:pulse 1.5s infinite"><h2>⏰ 即将到来（30分钟内）</h2><div class="list">${dueSoon.map((t) => this._row(t)).join('')}</div></div>`;
    }

    if (overdue.length) {
      html += `<div class="card" style="border-color:var(--bad)"><h2>🔥 已逾期（${overdue.length}）</h2><div class="list">${overdue.map((t) => this._row(t)).join('')}</div></div>`;
    }

    segs.forEach((s) => {
      const arr = (groups[s] || []).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      html += `<div class="card"><h2>${segLabel[s]} <span class="muted">${arr.length ? '· ' + arr.length + ' 项' : '· 暂无'}</span></h2>`;
      html += arr.length ? `<div class="list">${arr.map((t) => this._row(t)).join('')}</div>` : `<div class="muted">这一时段很轻松～ ✨</div>`;
      html += `</div>`;
    });

    if (done.length) {
      html += `<div class="card" style="opacity:.95"><h2>✅ 已完成（${done.length}）<button class="btn ghost sm" id="clearDone" style="float:right;margin-top:-4px">清空</button></h2><div class="list">${done.map((t) => this._row(t)).join('')}</div></div>`;
    }

    if (!tasks.length) html += `<div class="empty"><div class="big">🍓</div>还没有任务，点右上角新建吧～</div>`;

    view.innerHTML = html;
    this._bind(view);
  },

  _row(t) {
    const d = new Date(t.datetime);
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const date = d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10) ? '今天' : App.util.fmtDate(d);
    const pri = t.priority || '中';
    const priColor = { 高: '#ff3b5c', 中: '#ffb020', 低: '#34c98a' };
    const catIcon = { 工作:'💼', 备课:'📚', 运动:'💪', 生活:'🏠', 追星:'🔥', 其他:'🗂️' };
    const subs = t.subtasks || [];
    const subDone = subs.filter((s) => s.done).length;
    return `<div class="todo ${t.done ? 'done' : ''}" data-id="${t.id}">
      <div class="chk" data-act="done" data-id="${t.id}">${t.done ? '✓' : '○'}</div>
      <div class="todo-main" data-act="edit" data-id="${t.id}">
        <div class="todo-title">${App.util.esc(t.title)}
          <span class="chip" style="background:${priColor[pri]}15;color:${priColor[pri]};font-size:11px;padding:1px 7px">${pri}优先级</span>
          ${t.category ? `<span class="tag">${catIcon[t.category] || '🗂️'} ${t.category}</span>` : ''}
        </div>
        <div class="todo-meta">
          <span>🕒 ${date} ${time}</span>
          ${t.place ? '<span>📍 ' + App.util.esc(t.place) + '</span>' : ''}
          ${t.repeat && t.repeat !== 'none' ? '<span>🔁 ' + { daily:'每天', weekly:'每周', workday:'工作日' }[t.repeat] + '</span>' : ''}
          ${subs.length ? `<span>📋 子任务 ${subDone}/${subs.length}</span>` : ''}
        </div>
        ${t.note ? `<div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px">📝 ${App.util.esc(t.note)}</div>` : ''}
        ${!t.done && subs.length ? `<div style="margin-top:6px">${subs.map((s, i) => `<label style="font-size:12.5px;color:var(--ink-soft);margin-right:10px;cursor:pointer"><input type="checkbox" class="sub-chk" data-id="${t.id}" data-i="${i}" ${s.done ? 'checked' : ''}> ${App.util.esc(s.text)}</label>`).join('')}</div>` : ''}
      </div>
      <div class="todo-actions"><button class="btn ghost sm" data-act="del" data-id="${t.id}">删</button></div>
    </div>`;
  },

  _bind(view) {
    view.querySelector('#addTask').onclick = () => this._form(view, null);
    const catBtns = view.querySelectorAll('[data-c]');
    catBtns.forEach((b) => b.onclick = () => { this._cat = b.dataset.c; this.render(view); });
    const clearBtn = view.querySelector('#clearDone');
    if (clearBtn) clearBtn.onclick = async () => {
      if (!confirm('清空所有已完成任务？')) return;
      const tasks = await App.dbapi.getAll('tasks');
      for (const t of tasks) if (t.done) await App.dbapi.del('tasks', t.id);
      this.render(view);
    };
    App.util.$$('.chk', view).forEach((el) => el.onclick = async (e) => {
      e.stopPropagation();
      const id = el.dataset.id; const t = (await App.dbapi.getAll('tasks')).find((x) => x.id === id);
      if (t) {
        t.done = !t.done;
        if (t.done) {
          const row = el.closest('.todo');
          row.style.transform = 'scale(1.02)'; row.style.transition = '.2s';
          setTimeout(() => { row.style.transform = 'scale(1)'; }, 180);
        }
        await App.dbapi.put('tasks', t); this.render(view);
      }
    });
    App.util.$$('.sub-chk', view).forEach((el) => el.onclick = async (e) => {
      e.stopPropagation();
      const id = el.dataset.id; const i = +el.dataset.i;
      const t = (await App.dbapi.getAll('tasks')).find((x) => x.id === id);
      if (t && t.subtasks) { t.subtasks[i].done = el.checked; await App.dbapi.put('tasks', t); this.render(view); }
    });
    App.util.$$('[data-act="edit"]', view).forEach((el) => el.onclick = async () => {
      const id = el.dataset.id; const t = (await App.dbapi.getAll('tasks')).find((x) => x.id === id);
      if (t) this._form(view, t);
    });
    App.util.$$('[data-act="del"]', view).forEach((el) => el.onclick = async () => {
      if (!confirm('确定删除该任务？')) return;
      await App.dbapi.del('tasks', el.dataset.id); App.router.render('tasks');
    });
  },

  _form(view, t) {
    const isEdit = !!t;
    const def = t || { title: '', datetime: new Date(Date.now() + 36e5).toISOString().slice(0, 16), place: '', note: '', priority: '中', category: '工作', subtasks: [], repeat: 'none' };
    const catIcon = { 工作:'💼', 备课:'📚', 运动:'💪', 生活:'🏠', 追星:'🔥', 其他:'🗂️' };
    const subHtml = (def.subtasks || []).map((s, i) => `<div class="row" style="margin-bottom:6px"><input value="${App.util.esc(s.text)}" data-sub="${i}" placeholder="子任务" style="flex:1"><label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" data-subdone="${i}" ${s.done ? 'checked' : ''}> 已完成</label></div>`).join('');
    const html = `<h3>${isEdit ? '编辑任务' : '新建任务'} 🍓</h3>
      <div class="field"><label>要做的事</label><input id="f_title" value="${App.util.esc(def.title)}" placeholder="例如：批改田径单元作业"></div>
      <div class="row"><div class="field" style="flex:1"><label>时间</label><input type="datetime-local" id="f_dt" value="${def.datetime}"></div>
      <div class="field" style="flex:1"><label>优先级</label><select id="f_pri"><option ${def.priority === '高' ? 'selected' : ''}>高</option><option ${def.priority === '中' ? 'selected' : ''}>中</option><option ${def.priority === '低' ? 'selected' : ''}>低</option></select></div></div>
      <div class="row"><div class="field" style="flex:1"><label>分类</label><select id="f_cat">${Object.keys(catIcon).map((c) => `<option ${def.category === c ? 'selected' : ''}>${catIcon[c]} ${c}</option>`).join('')}</select></div>
      <div class="field" style="flex:1"><label>重复</label><select id="f_rep"><option value="none" ${def.repeat === 'none' ? 'selected' : ''}>不重复</option><option value="daily" ${def.repeat === 'daily' ? 'selected' : ''}>每天</option><option value="workday" ${def.repeat === 'workday' ? 'selected' : ''}>工作日</option><option value="weekly" ${def.repeat === 'weekly' ? 'selected' : ''}>每周</option></select></div></div>
      <div class="field"><label>地点</label><input id="f_place" value="${App.util.esc(def.place)}" placeholder="例如：体育馆 / 办公室 / 上海体育场"></div>
      <div class="field"><label>备注</label><textarea id="f_note" placeholder="可选">${App.util.esc(def.note)}</textarea></div>
      <div class="field"><label>子任务 <button type="button" class="btn soft sm" id="addSub" style="margin-left:6px">＋ 添加</button></label><div id="subBox">${subHtml}</div></div>
      <div class="row"><button class="btn" id="save">保存</button><button class="btn ghost" id="cancel">取消</button></div>`;
    const mask = App.modal(html, (m) => {
      m.querySelector('#addSub').onclick = () => {
        const box = m.querySelector('#subBox');
        const i = box.children.length;
        const d = document.createElement('div'); d.className = 'row'; d.style.marginBottom = '6px';
        d.innerHTML = `<input data-sub="${i}" placeholder="子任务" style="flex:1"><label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" data-subdone="${i}"> 已完成</label>`;
        box.appendChild(d);
      };
      m.querySelector('#save').onclick = async () => {
        const title = m.querySelector('#f_title').value.trim();
        if (!title) { App.util.toast('请填写事项'); return; }
        const subEls = m.querySelectorAll('#subBox .row');
        const subtasks = [];
        subEls.forEach((row, idx) => {
          const text = row.querySelector(`[data-sub="${idx}"]`).value.trim();
          const done = row.querySelector(`[data-subdone="${idx}"]`).checked;
          if (text) subtasks.push({ text, done });
        });
        const catSel = m.querySelector('#f_cat').value;
        const category = catSel.replace(/^[^\s]+\s*/, '');
        const obj = {
          id: t ? t.id : App.util.uid(), title,
          datetime: m.querySelector('#f_dt').value || new Date().toISOString(),
          place: m.querySelector('#f_place').value.trim(),
          note: m.querySelector('#f_note').value.trim(),
          priority: m.querySelector('#f_pri').value,
          category,
          repeat: m.querySelector('#f_rep').value,
          subtasks,
          done: t ? t.done : false,
        };
        await App.dbapi.put('tasks', obj); App.closeModal(mask); App.router.render('tasks');
      };
      m.querySelector('#cancel').onclick = () => App.closeModal(mask);
    });
  },
});
