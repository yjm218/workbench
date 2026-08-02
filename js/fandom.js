/* ===== 模块：追星日记（华晨宇 · 火星演唱会） ===== */
App.registerModule({
  id: 'fandom',
  title: '追星日记',
  emoji: '🔥',
  _tab: 'home',
  async render(view) {
    const seg = `<div class="seg" id="fanTabs">
      <button data-t="home" class="${this._tab === 'home' ? 'on' : ''}">🔥 火星首页</button>
      <button data-t="concert" class="${this._tab === 'concert' ? 'on' : ''}">🎤 演唱会</button>
      <button data-t="feed" class="${this._tab === 'feed' ? 'on' : ''}">📱 花花动态</button>
      <button data-t="album" class="${this._tab === 'album' ? 'on' : ''}">📸 票根·相册</button>
      <button data-t="memo" class="${this._tab === 'memo' ? 'on' : ''}">💖 火星心情</button></div>`;
    let html = `<div class="page-head"><h1>🔥 追星日记</h1><span class="sub">华晨宇 · 火星演唱会 · 花花</span></div>
      <div style="margin-bottom:12px">${seg}</div>`;
    view.innerHTML = html;
    App.util.$$('#fanTabs button', view).forEach((b) => b.onclick = () => { this._tab = b.dataset.t; this.render(view); });
    if (this._tab === 'home') await this._renderHome(view);
    else if (this._tab === 'concert') await this._renderConcert(view);
    else if (this._tab === 'feed') await this._renderFeed(view);
    else if (this._tab === 'album') await this._renderAlbum(view);
    else await this._renderMemo(view);
  },

  /* ---------- 火星首页：倒计时 + 快捷入口 ---------- */
  async _renderHome(view) {
    const seed = [
      { id:'c1', title:'火星演唱会 · 合肥站', date:'2026-05-17', city:'合肥', venue:'合肥体育中心体育场', status:'past', note:'「向阳而生」大合唱', songs:['向阳而生','好想爱这个世界啊','新世界'], outfit:'红色亮片外套', support:'红色荧光手环' },
      { id:'c2', title:'火星演唱会 · 武汉站', date:'2026-05-31', city:'武汉', venue:'武汉体育中心主体育场', status:'past', note:'六一见花', songs:['齐天','烟火里的尘埃','国王与乞丐'], outfit:'黑色皮衣', support:'火星能量棒' },
      { id:'c3', title:'火星演唱会 · 上海站', date:'2026-07-12', city:'上海', venue:'上海体育场', status:'upcoming', note:'家门口！带望远镜', songs:['未知，待更新'], outfit:'待定', support:'红色发光手环+望远镜' },
      { id:'c4', title:'火星演唱会 · 北京站', date:'2026-08-09', city:'北京', venue:'国家体育场（鸟巢）', status:'upcoming', note:'待定，先存钱', songs:['待公布'], outfit:'待定', support:'火星能量棒+润喉糖' },
    ];
    const stored = await App.dbapi.getAll('concerts');
    const map = new Map(); seed.forEach((c) => map.set(c.id, c)); stored.forEach((c) => map.set(c.id, c));
    const list = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    const now = new Date().toISOString().slice(0, 10);
    const upcoming = list.filter((c) => c.date >= now && c.status !== 'past');
    const next = upcoming[0];
    const d = next ? Math.ceil((new Date(next.date + 'T00:00:00') - new Date(now + 'T00:00:00')) / 864e5) : null;

    const today = new Date();
    const birthday = new Date(today.getFullYear(), 1, 7); // 2月7日
    if (birthday < today) birthday.setFullYear(today.getFullYear() + 1);
    const bdayD = Math.ceil((birthday - today) / 864e5);

    let h = `<div class="card" style="background:linear-gradient(135deg,var(--pink),var(--pink-deep));color:#fff;border:none">
      <div style="font-size:42px">🌸</div>
      <h2 style="margin:6px 0">华晨宇 · 火星日记</h2>
      <p>记录每一次奔赴火星的感动与心动。</p></div>`;

    if (next) {
      h += `<div class="card" style="text-align:center;border:2px dashed var(--pink)">
        <div class="muted">距离下一场火星演唱会</div>
        <div style="font-size:48px;font-weight:900;color:var(--pink-deep);line-height:1">${d}</div>
        <div style="font-size:14px;color:var(--ink-soft)">天 · ${App.util.esc(next.title)} · ${next.date}</div>
        <div style="margin-top:10px"><button class="btn" data-tab="concert">查看详情</button></div>
      </div>`;
    }

    h += `<div class="grid c2">
      <div class="card" style="text-align:center"><div style="font-size:32px">🎂</div><div style="font-weight:800">花花生日倒计时</div><div style="font-size:24px;color:var(--pink-deep);font-weight:700">${bdayD} 天</div><div class="muted">2月7日</div></div>
      <div class="card" style="text-align:center"><div style="font-size:32px">🎫</div><div style="font-weight:800">已记录场次</div><div style="font-size:24px;color:var(--pink-deep);font-weight:700">${list.length}</div><div class="muted"> upcoming ${upcoming.length} 场</div></div>
    </div>`;

    const wishes = await App.dbapi.getAll('fanwishes');
    h += `<div class="card"><h3>💖 今日火星心情</h3>
      ${wishes.length ? `<p class="muted">已收藏 ${wishes.length} 条心动瞬间</p>` : '<p class="muted">写下一句想对花花说的话吧～</p>'}
      <button class="btn soft sm" data-tab="memo">写心情</button></div>`;

    const wrap = document.createElement('div'); wrap.innerHTML = h; view.appendChild(wrap);
    App.util.$$('[data-tab]', wrap).forEach((b) => b.onclick = () => { this._tab = b.dataset.tab; this.render(view); });
  },

  /* ---------- 演唱会日程（含详情：歌单/穿搭/应援/座位/票根） ---------- */
  async _renderConcert(view) {
    const stored = await App.dbapi.getAll('concerts');
    const seed = [
      { id:'c1', title:'火星演唱会 · 合肥站', date:'2026-05-17', city:'合肥', venue:'合肥体育中心体育场', status:'past', note:'「向阳而生」大合唱', songs:['向阳而生','好想爱这个世界啊','新世界'], outfit:'红色亮片外套', support:'红色荧光手环', seat:'A区3排12号' },
      { id:'c2', title:'火星演唱会 · 武汉站', date:'2026-05-31', city:'武汉', venue:'武汉体育中心主体育场', status:'past', note:'六一见花', songs:['齐天','烟火里的尘埃','国王与乞丐'], outfit:'黑色皮衣', support:'火星能量棒', seat:'B区5排8号' },
      { id:'c3', title:'火星演唱会 · 上海站', date:'2026-07-12', city:'上海', venue:'上海体育场', status:'upcoming', note:'家门口！带望远镜', songs:['未知，待更新'], outfit:'待定', support:'红色发光手环+望远镜', seat:'待定' },
      { id:'c4', title:'火星演唱会 · 北京站', date:'2026-08-09', city:'北京', venue:'国家体育场（鸟巢）', status:'upcoming', note:'待定，先存钱', songs:['待公布'], outfit:'待定', support:'火星能量棒+润喉糖', seat:'待定' },
    ];
    const map = new Map(); seed.forEach((c) => map.set(c.id, c)); stored.forEach((c) => map.set(c.id, c));
    const list = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));

    const now = new Date().toISOString().slice(0, 10);
    const upcoming = list.filter((c) => c.date >= now && c.status !== 'past');
    const past = list.filter((c) => c.date < now || c.status === 'past');

    let h = `<div class="card" style="background:linear-gradient(135deg,#fff0f2,#ffe0e5);border:none">
      <h2>🎸 火星演唱会日程</h2>
      <p class="muted">记录场次、歌单、穿搭、应援、座位与票根，留住每一次火星之旅。</p>
      <button class="btn sm" id="addConcert">＋ 添加场次</button></div>`;

    const renderCard = (c, isUp) => {
      const d = Math.ceil((new Date(c.date + 'T00:00:00') - new Date(now + 'T00:00:00')) / 864e5);
      return `<div class="card" style="${isUp ? 'border-left:5px solid var(--pink)' : 'opacity:.95'}">
        <div class="row" style="align-items:flex-start">
          <div style="font-size:34px">${isUp ? '🎤' : '💿'}</div>
          <div style="flex:1">
            <div style="font-weight:800;font-size:16px">${App.util.esc(c.title)}</div>
            <div class="todo-meta"><span>📅 ${c.date}</span><span>📍 ${App.util.esc(c.city)} · ${App.util.esc(c.venue)}</span></div>
            ${c.seat && c.seat !== '待定' ? `<div style="margin-top:4px;font-size:13px">🎫 座位：${App.util.esc(c.seat)}</div>` : ''}
            ${c.songs && c.songs.length ? `<div style="margin-top:6px"><span class="chip">🎵 ${c.songs.slice(0,3).join(' / ')}</span></div>` : ''}
            ${c.outfit && c.outfit !== '待定' ? `<div style="margin-top:4px;font-size:13px;color:var(--ink-soft)">👕 穿搭：${App.util.esc(c.outfit)}</div>` : ''}
            ${c.support && c.support !== '待定' ? `<div style="margin-top:4px;font-size:13px;color:var(--ink-soft)">💫 应援：${App.util.esc(c.support)}</div>` : ''}
            ${c.note ? `<div style="margin-top:4px;font-size:13px;color:var(--ink-soft)">💬 ${App.util.esc(c.note)}</div>` : ''}
            ${isUp ? `<div style="margin-top:8px"><span class="chip" style="background:var(--pink);color:#fff">${d <= 0 ? '今天！' : '还有 ' + d + ' 天'}</span></div>` : ''}
          </div>
          <div class="todo-actions"><button class="btn ghost sm" data-ce="${c.id}">编辑</button><button class="btn ghost sm" data-cd="${c.id}">删</button></div>
        </div>
      </div>`;
    };

    if (upcoming.length) { h += `<h3 style="color:var(--pink-deep)">🔥 即将开唱（${upcoming.length}）</h3>`; upcoming.forEach((c) => h += renderCard(c, true)); }
    if (past.length) { h += `<h3 style="color:var(--ink-soft)">💫 已结束（${past.length}）</h3>`; past.forEach((c) => h += renderCard(c, false)); }

    const wrap = document.createElement('div'); wrap.innerHTML = h; view.appendChild(wrap);
    wrap.querySelector('#addConcert').onclick = () => this._concertForm(view, null);
    App.util.$$('[data-ce]', wrap).forEach((b) => b.onclick = async () => {
      const c = (await App.dbapi.getAll('concerts')).find((x) => x.id === b.dataset.ce) || seed.find((x) => x.id === b.dataset.ce);
      this._concertForm(view, c || { id: b.dataset.ce });
    });
    App.util.$$('[data-cd]', wrap).forEach((b) => b.onclick = async () => {
      if (!confirm('删除这场演唱会记录？')) return; await App.dbapi.del('concerts', b.dataset.cd); this.render(view);
    });
  },
  _concertForm(view, c) {
    const isEdit = !!c?.date;
    const songs = (c?.songs || []).join('\n');
    const html = `<h3>${isEdit ? '编辑场次' : '添加场次'}</h3>
      <div class="field"><label>场次名称</label><input id="ctitle" value="${App.util.esc(c?.title || '')}" placeholder="如：火星演唱会 · 上海站"></div>
      <div class="row"><div class="field" style="flex:1"><label>日期</label><input type="date" id="cdate" value="${c?.date || ''}"></div>
      <div class="field" style="flex:1"><label>城市</label><input id="ccity" value="${App.util.esc(c?.city || '')}" placeholder="上海"></div></div>
      <div class="field"><label>场馆</label><input id="cvenue" value="${App.util.esc(c?.venue || '')}" placeholder="上海体育场"></div>
      <div class="field"><label>座位</label><input id="cseat" value="${App.util.esc(c?.seat || '')}" placeholder="如：A区3排12号"></div>
      <div class="field"><label>歌单（每行一首）</label><textarea id="csongs" placeholder="向阳而生\n好想爱这个世界啊">${App.util.esc(songs)}</textarea></div>
      <div class="row"><div class="field" style="flex:1"><label>穿搭</label><input id="coutfit" value="${App.util.esc(c?.outfit || '')}" placeholder="红色卫衣"></div>
      <div class="field" style="flex:1"><label>应援物</label><input id="csupport" value="${App.util.esc(c?.support || '')}" placeholder="火星能量棒"></div></div>
      <div class="field"><label>备注</label><input id="cnote" value="${App.util.esc(c?.note || '')}" placeholder="抢票提醒/搭子/行程"></div>
      <div class="row"><button class="btn" id="csave">保存</button><button class="btn ghost" id="ccancel">取消</button></div>`;
    const mask = App.modal(html, (m) => {
      m.querySelector('#csave').onclick = async () => {
        const obj = { id: c?.id || App.util.uid(), title: m.querySelector('#ctitle').value.trim() || '火星演唱会', date: m.querySelector('#cdate').value, city: m.querySelector('#ccity').value.trim(), venue: m.querySelector('#cvenue').value.trim(), seat: m.querySelector('#cseat').value.trim(), songs: m.querySelector('#csongs').value.split('\n').map((s) => s.trim()).filter(Boolean), outfit: m.querySelector('#coutfit').value.trim(), support: m.querySelector('#csupport').value.trim(), note: m.querySelector('#cnote').value.trim() };
        await App.dbapi.put('concerts', obj); App.closeModal(mask); this.render(view);
      };
      m.querySelector('#ccancel').onclick = () => App.closeModal(mask);
    });
  },

  /* ---------- 微博/小红书/工作室/饭拍动态 ---------- */
  async _renderFeed(view) {
    const feeds = await App.dbapi.getAll('feeds');
    const seed = [
      { id:'f1', platform:'微博', author:'华晨宇', time:'2026-07-28 14:20', content:'新专辑筹备中，火星人们再等等我❤️', link:'https://weibo.com/u/1234567890', note:'示例：可替换为真实链接', tags:['营业'] },
      { id:'f2', platform:'小红书', author:'华晨宇工作室', time:'2026-07-29 10:00', content:'上海站彩排花絮🎸', link:'', note:'示例动态', tags:['花絮'] },
      { id:'f3', platform:'工作室', author:'华晨宇工作室', time:'2026-07-30 12:00', content:'上海站观演须知与交通指南', link:'', note:'官方通知', tags:['公告'] },
      { id:'f4', platform:'饭拍', author:'火星饭拍bot', time:'2026-05-18 00:30', content:'合肥站「向阳而生」全场大合唱 4K 直拍', link:'', note:'珍藏', tags:['直拍'] },
    ];
    const map = new Map(); seed.forEach((f) => map.set(f.id, f)); feeds.forEach((f) => map.set(f.id, f));
    const list = Array.from(map.values()).sort((a, b) => b.time.localeCompare(a.time));
    const filter = this._feedFilter || '全部';
    const platforms = ['全部', '微博', '小红书', '工作室', '饭拍'];
    let h = `<div class="card" style="background:linear-gradient(135deg,#fff0f2,#ffe0e5);border:none">
      <h2>📱 花花动态收录</h2>
      <p class="muted">微博、小红书、工作室公告、饭拍直拍……手动保存你看到的所有心动。</p>
      <button class="btn sm" id="addFeed">＋ 添加动态</button></div>
      <div class="seg sm" id="feedFilter">` + platforms.map((p) => `<button data-p="${p}" class="${filter === p ? 'on' : ''}">${p}</button>`).join('') + `</div>`;
    const show = filter === '全部' ? list : list.filter((f) => f.platform === filter);
    if (!show.length) h += `<div class="empty"><div class="big">🔥</div>还没有${filter === '全部' ? '' : filter}动态，看到花花就贴过来吧～</div>`;
    else {
      show.forEach((f) => {
        const icons = { '微博':'🔴', '小红书':'📕', '工作室':'🎙️', '饭拍':'📸' };
        const icon = icons[f.platform] || '🔥';
        h += `<div class="card">
          <div class="row" style="align-items:center;margin-bottom:6px"><span style="font-size:20px">${icon}</span>
            <span style="font-weight:700">${App.util.esc(f.author)}</span><span class="muted">${App.util.esc(f.platform)} · ${f.time}</span></div>
          <div style="font-size:14px;line-height:1.6">${App.util.esc(f.content)}</div>
          ${f.tags && f.tags.length ? `<div style="margin-top:6px">${f.tags.map((t) => `<span class="chip" style="background:var(--pink-soft);color:var(--pink-deep)">${t}</span>`).join(' ')}</div>` : ''}
          ${f.link ? `<div style="margin-top:8px"><a href="${App.util.esc(f.link)}" target="_blank" rel="noopener" class="btn soft sm">打开原帖</a></div>` : ''}
          ${f.note ? `<div class="muted" style="margin-top:6px">📝 ${App.util.esc(f.note)}</div>` : ''}
          <div class="todo-actions" style="margin-top:8px"><button class="btn ghost sm" data-fe="${f.id}">编辑</button><button class="btn ghost sm" data-fd="${f.id}">删</button></div>
        </div>`;
      });
    }
    const wrap = document.createElement('div'); wrap.innerHTML = h; view.appendChild(wrap);
    wrap.querySelector('#addFeed').onclick = () => this._feedForm(view, null);
    wrap.querySelector('#feedFilter').onclick = (e) => { if (e.target.dataset.p) { this._feedFilter = e.target.dataset.p; this.render(view); } };
    App.util.$$('[data-fe]', wrap).forEach((b) => b.onclick = async () => {
      const f = (await App.dbapi.getAll('feeds')).find((x) => x.id === b.dataset.fe) || seed.find((x) => x.id === b.dataset.fe);
      this._feedForm(view, f || { id: b.dataset.fe });
    });
    App.util.$$('[data-fd]', wrap).forEach((b) => b.onclick = async () => {
      if (!confirm('删除这条动态？')) return; await App.dbapi.del('feeds', b.dataset.fd); this.render(view);
    });
  },
  _feedForm(view, f) {
    const tags = (f?.tags || []).join(' ');
    const html = `<h3>${f?.time ? '编辑动态' : '添加花花动态'}</h3>
      <div class="row"><div class="field" style="flex:1"><label>平台</label><select id="fplat"><option ${f?.platform === '微博' ? 'selected' : ''}>微博</option><option ${f?.platform === '小红书' ? 'selected' : ''}>小红书</option><option ${f?.platform === '工作室' ? 'selected' : ''}>工作室</option><option ${f?.platform === '饭拍' ? 'selected' : ''}>饭拍</option></select></div>
      <div class="field" style="flex:1"><label>作者</label><input id="fauthor" value="${App.util.esc(f?.author || '华晨宇')}"></div></div>
      <div class="field"><label>发布时间</label><input type="datetime-local" id="ftime" value="${f?.time ? f.time.replace(' ', 'T') : ''}"></div>
      <div class="field"><label>内容/文案</label><textarea id="fcontent" placeholder="粘贴动态文案">${App.util.esc(f?.content || '')}</textarea></div>
      <div class="field"><label>标签（空格分隔）</label><input id="ftags" value="${App.util.esc(tags)}" placeholder="营业 花絮 公告 直拍"></div>
      <div class="field"><label>链接（可选）</label><input id="flink" value="${App.util.esc(f?.link || '')}" placeholder="https://weibo.com/... 或 https://xiaohongshu.com/..."></div>
      <div class="field"><label>备注（可选）</label><input id="fnote" value="${App.util.esc(f?.note || '')}" placeholder="截图存了/已转发/要买同款"></div>
      <div class="row"><button class="btn" id="fsave">保存</button><button class="btn ghost" id="fcancel">取消</button></div>`;
    const mask = App.modal(html, (m) => {
      m.querySelector('#fsave').onclick = async () => {
        const t = m.querySelector('#ftime').value.replace('T', ' ');
        const obj = { id: f?.id || App.util.uid(), platform: m.querySelector('#fplat').value, author: m.querySelector('#fauthor').value.trim(), time: t || new Date().toLocaleString('zh-CN'), content: m.querySelector('#fcontent').value.trim(), tags: m.querySelector('#ftags').value.split(/\s+/).filter(Boolean), link: m.querySelector('#flink').value.trim(), note: m.querySelector('#fnote').value.trim() };
        await App.dbapi.put('feeds', obj); App.closeModal(mask); this.render(view);
      };
      m.querySelector('#fcancel').onclick = () => App.closeModal(mask);
    });
  },

  /* ---------- 票根·相册 ---------- */
  async _renderAlbum(view) {
    const photos = await App.dbapi.getAll('fanphotos');
    let h = `<div class="card" style="background:linear-gradient(135deg,#fff0f2,#ffe0e5);border:none">
      <h2>📸 票根 · 现场 · 收藏</h2>
      <p class="muted">上传票根照片、现场截图、应援物合影（图片以 base64 存储在手机本地）。</p>
      <button class="btn sm" id="addPhoto">＋ 添加照片/票根</button></div>`;
    if (!photos.length) h += `<div class="empty"><div class="big">🎫</div>还没有票根，第一场演唱会后记得来存档！</div>`;
    else {
      h += `<div class="grid c2">`;
      photos.slice().reverse().forEach((p) => {
        h += `<div class="card" style="padding:8px">
          <div style="aspect-ratio:1;background:#f8f8f8;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center">
            ${p.data ? `<img src="${p.data}" style="width:100%;height:100%;object-fit:cover">` : `<div class="big">🖼️</div>`}
          </div>
          <div style="font-size:13px;font-weight:700;margin-top:6px">${App.util.esc(p.title || '未命名')}</div>
          <div class="todo-meta">${App.util.esc(p.date || '')} · ${App.util.esc(p.type || '照片')}</div>
          ${p.note ? `<div class="muted" style="font-size:12px">${App.util.esc(p.note)}</div>` : ''}
          <div class="todo-actions" style="margin-top:6px"><button class="btn ghost sm" data-pe="${p.id}">编辑</button><button class="btn ghost sm" data-pd="${p.id}">删</button></div>
        </div>`;
      });
      h += `</div>`;
    }
    const wrap = document.createElement('div'); wrap.innerHTML = h; view.appendChild(wrap);
    wrap.querySelector('#addPhoto').onclick = () => this._photoForm(view, null);
    App.util.$$('[data-pe]', wrap).forEach((b) => b.onclick = async () => {
      const p = (await App.dbapi.getAll('fanphotos')).find((x) => x.id === b.dataset.pe);
      this._photoForm(view, p);
    });
    App.util.$$('[data-pd]', wrap).forEach((b) => b.onclick = async () => {
      if (!confirm('删除这张照片？')) return; await App.dbapi.del('fanphotos', b.dataset.pd); this.render(view);
    });
  },
  _photoForm(view, p) {
    const html = `<h3>${p ? '编辑照片' : '添加票根/照片'}</h3>
      <div class="field"><label>标题</label><input id="ptitle" value="${App.util.esc(p?.title || '')}" placeholder="上海站票根"></div>
      <div class="row"><div class="field" style="flex:1"><label>类型</label><select id="ptype"><option ${p?.type === '票根' ? 'selected' : ''}>票根</option><option ${p?.type === '现场' ? 'selected' : ''}>现场</option><option ${p?.type === '应援' ? 'selected' : ''}>应援</option><option ${p?.type === '截图' ? 'selected' : ''}>截图</option></select></div>
      <div class="field" style="flex:1"><label>日期</label><input type="date" id="pdate" value="${p?.date || ''}"></div></div>
      <div class="field"><label>图片</label><input type="file" id="pfile" accept="image/*" ${p?.data ? 'data-has="1"' : ''}></div>
      ${p?.data ? '<p class="muted">不重新选择则保留原图</p>' : ''}
      <div class="field"><label>备注</label><input id="pnote" value="${App.util.esc(p?.note || '')}" placeholder="珍藏/想打印/想发圈"></div>
      <div class="row"><button class="btn" id="psave">保存</button><button class="btn ghost" id="pcancel">取消</button></div>`;
    const mask = App.modal(html, (m) => {
      m.querySelector('#psave').onclick = async () => {
        const file = m.querySelector('#pfile').files[0];
        let data = p?.data || '';
        if (file) {
          try {
            data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
            if (data.length > 2_000_000) { App.util.toast('图片太大，请压缩后重试'); return; }
          } catch (err) { App.util.toast('读取图片失败'); return; }
        }
        const obj = { id: p?.id || App.util.uid(), title: m.querySelector('#ptitle').value.trim() || '未命名', type: m.querySelector('#ptype').value, date: m.querySelector('#pdate').value, note: m.querySelector('#pnote').value.trim(), data };
        await App.dbapi.put('fanphotos', obj); App.closeModal(mask); this.render(view);
      };
      m.querySelector('#pcancel').onclick = () => App.closeModal(mask);
    });
  },

  /* ---------- 火星心情/愿望清单 ---------- */
  async _renderMemo(view) {
    const wishes = await App.dbapi.getAll('fanwishes') || [];
    let h = `<div class="card" style="background:linear-gradient(135deg,#fff0f2,#ffe0e5);border:none">
      <h2>💖 火星心情 & 愿望清单</h2>
      <p class="muted">想对花花说的话、想带的应援、想抢的票、想学的歌、心动瞬间……</p>
      <button class="btn sm" id="addWish">＋ 写一句</button></div>`;
    if (!wishes.length) h += `<div class="empty"><div class="big">💖</div>还没有火星碎片，写一句吧～</div>`;
    else {
      h += `<div class="grid c2">`;
      wishes.slice().reverse().forEach((m) => {
        const moodEmoji = { '超开心':'🥰', '感动':'😭', '期待':'✨', '紧张':'😣', '平静':'🌸' }[m.mood] || '💖';
        h += `<div class="card" style="position:relative">
          <div style="font-size:28px;position:absolute;right:12px;top:10px">${moodEmoji}</div>
          <div style="font-size:12px;color:var(--pink-deep);font-weight:700;margin-bottom:4px">${App.util.esc(m.category || '心情')}</div>
          <div style="font-size:14px;line-height:1.6;white-space:pre-wrap">${App.util.esc(m.text)}</div>
          <div class="todo-meta" style="margin-top:8px">${App.util.fmtDate(new Date(m.created))}</div>
          <div class="todo-actions" style="margin-top:8px"><button class="btn ghost sm" data-we="${m.id}">编辑</button><button class="btn ghost sm" data-wd="${m.id}">删</button></div>
        </div>`;
      });
      h += `</div>`;
    }
    const wrap = document.createElement('div'); wrap.innerHTML = h; view.appendChild(wrap);
    wrap.querySelector('#addWish').onclick = () => this._wishForm(view, null);
    App.util.$$('[data-we]', wrap).forEach((b) => b.onclick = async () => {
      const m = (await App.dbapi.getAll('fanwishes')).find((x) => x.id === b.dataset.we);
      this._wishForm(view, m);
    });
    App.util.$$('[data-wd]', wrap).forEach((b) => b.onclick = async () => {
      if (!confirm('删除这条心情？')) return; await App.dbapi.del('fanwishes', b.dataset.wd); this.render(view);
    });
  },
  _wishForm(view, m) {
    const html = `<h3>${m ? '编辑火星心情' : '写一句火星话'}</h3>
      <div class="row"><div class="field" style="flex:1"><label>分类</label><select id="wcat"><option ${m?.category === '心情' ? 'selected' : ''}>心情</option><option ${m?.category === '愿望' ? 'selected' : ''}>愿望</option><option ${m?.category === '应援' ? 'selected' : ''}>应援</option><option ${m?.category === '歌单' ? 'selected' : ''}>歌单</option></select></div>
      <div class="field" style="flex:1"><label>心情</label><select id="wmood"><option ${m?.mood === '超开心' ? 'selected' : ''}>超开心</option><option ${m?.mood === '感动' ? 'selected' : ''}>感动</option><option ${m?.mood === '期待' ? 'selected' : ''}>期待</option><option ${m?.mood === '紧张' ? 'selected' : ''}>紧张</option><option ${m?.mood === '平静' ? 'selected' : ''}>平静</option></select></div></div>
      <div class="field"><label>内容</label><textarea id="wtxt" placeholder="例如：上海场我要带红色发光手环！" style="min-height:120px">${App.util.esc(m?.text || '')}</textarea></div>
      <div class="row"><button class="btn" id="wsave">保存</button><button class="btn ghost" id="wcancel">取消</button></div>`;
    const mask = App.modal(html, (modal) => {
      modal.querySelector('#wsave').onclick = async () => {
        const text = modal.querySelector('#wtxt').value.trim(); if (!text) { App.util.toast('写点什么吧'); return; }
        await App.dbapi.put('fanwishes', { id: m?.id || App.util.uid(), category: modal.querySelector('#wcat').value, mood: modal.querySelector('#wmood').value, text, created: m?.created || Date.now() });
        App.closeModal(mask); this.render(view);
      };
      modal.querySelector('#wcancel').onclick = () => App.closeModal(mask);
    });
  },
});
