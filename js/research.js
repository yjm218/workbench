/* ===== 模块：科研（真实文献：Europe PMC + 内置真实论文总结） ===== */
App.registerModule({
  id: 'research',
  title: '科研',
  emoji: '🔬',
  _topic: '推荐',
  async render(view) {
    let cached = await App.cache.get('research');
    const seed = App.data.researchSeed;
    let papers = cached ? cached.data : seed.slice();
    if (!cached) papers = seed.slice(); // 初始用真实种子
    const ts = cached?.ts;
    // 定时刷新：在线且缓存过期（>6h 或跨天）时后台自动拉取真实文献
    this._maybeAutoRefresh(view, ts);

    const topics = ['推荐', '训练', '课堂', '康复', '体态'];
    const seg = `<div class="seg" id="rtop">` + topics.map((t) => `<button data-t="${t}" class="${this._topic === t ? 'on' : ''}">${t}</button>`).join('') + `</div>`;

    // 每日5篇：全部合并后按日轮转
    const all = papers.slice();
    const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
    let daily = all;
    if (this._topic === '推荐') {
      daily = [];
      for (let i = 0; i < 5; i++) daily.push(all[(doy + i) % all.length]);
    } else {
      daily = all.filter((p) => (p.topic || '').includes(this._topic) || (this._topic === '课堂' && (p.topic || '').includes('课堂')));
      if (!daily.length) daily = all;
    }

    let h = `<div class="page-head"><h1>🔬 科研 · 每日文献</h1><span class="sub">真实文献 · 每日固定 5 篇 · 在线定时刷新</span>
      <span class="spacer"></span><button class="btn" id="rfetch">🔄 联网拉取真实文献</button></div>`;
    h += `<div style="margin-bottom:12px">${seg}</div>`;
    if (ts) h += `<p class="muted">📥 缓存于 ${new Date(ts).toLocaleString('zh-CN')}${navigator.onLine ? '（在线：每3小时自动更新）' : '（当前离线，显示缓存）'}</p>`;

    h += `<div class="card" style="border-color:var(--pink)"><h2>⭐ 今日推荐 ${daily.length} 篇</h2>` +
      daily.map((p) => this._card(p)).join('') + `</div>`;

    view.innerHTML = h;
    App.util.$$('#rtop button', view).forEach((b) => b.onclick = () => { this._topic = b.dataset.t; this.render(view); });
    view.querySelector('#rfetch').onclick = () => this._fetch(view);
  },
  _card(p) {
    const summary = (p.method || p.result || p.conclusion)
      ? `<div class="summ"><b>方法：</b>${App.util.esc(p.method || '—')}<br><b>结果：</b>${App.util.esc(p.result || '—')}<br><b>结论：</b>${App.util.esc(p.conclusion || '—')}</div>`
      : `<div class="summ">本篇为联网真实文献，摘要见下；方法/结果/结论可由你在备课时摘录，或点击来源阅读全文。</div>`;
    const absId = 'abs_' + p.id;
    return `<div class="paper">
      <h3>${App.util.esc(p.title)}</h3>
      <div class="meta">${App.util.esc(p.authors || '')} · ${App.util.esc(p.journal || '')} ${p.year || ''} · <span class="chip" style="background:#ff6fa5;color:#fff">${App.util.esc(p.topic || '综合')}</span></div>
      <div class="abs" id="${absId}">${App.util.esc(p.abstract || '（暂无摘要）')}</div>
      ${summary}
      <div class="row" style="margin-top:8px">
        <button class="btn ghost sm" onclick="document.getElementById('${absId}').classList.toggle('open')">展开/收起摘要</button>
        ${p.link ? `<a class="btn soft sm" href="${p.link}" target="_blank" rel="noopener">查看来源 ↗</a>` : ''}
      </div></div>`;
  },
  async _fetch(view, silent) {
    if (!silent) App.util.toast('正在从 Europe PMC 拉取真实文献…');
    const queries = [
      '"resistance training" AND muscle',
      'ACL reconstruction AND rehabilitation AND exercise',
      '"physical education" AND students AND activity',
      'posture AND exercise AND adolescents',
      'aerobic training AND body composition',
      'high intensity interval training AND fitness',
    ];
    let got = [];
    for (const q of queries) {
      try {
        const url = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=' +
          encodeURIComponent(q) + '&resultType=core&format=json&pageSize=5';
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const j = await res.json();
        (j.resultList?.result || []).forEach((it) => {
          if (!it.abstractText) return;
          const authors = it.authorString || (it.authorList?.author || []).slice(0, 3).map((a) => a.fullName || a.lastName).join(', ');
          const journal = it.journalInfo?.journal?.title || it.bookOrReportDetails?.publisher || '';
          const link = it.pmcid ? 'https://europepmc.org/article/PMC/' + it.pmcid : (it.doi ? 'https://doi.org/' + it.doi : '');
          got.push({
            id: 'epmc_' + (it.id || it.pmcid || App.util.uid()),
            topic: this._topicOf(q), title: it.title, authors, journal,
            year: it.pubYear || (it.firstPublicationDate || '').slice(0, 4),
            abstract: it.abstractText.replace(/<[^>]+>/g, ''), link,
          });
        });
      } catch (e) { /* 忽略单源错误 */ }
    }
    if (got.length) {
      // 合并去重（按标题）
      const seen = new Set(); const merged = [];
      App.data.researchSeed.forEach((p) => { seen.add(p.title); merged.push(p); });
      got.forEach((p) => { if (!seen.has(p.title)) { seen.add(p.title); merged.push(p); } });
      await App.cache.set('research', merged);
      if (!silent) App.util.toast('已拉取 ' + got.length + ' 篇真实文献 🎉');
    } else if (!silent) {
      App.util.toast('联网拉取失败（可能离线），显示缓存');
    }
    if (view) this.render(view);
  },
  // 在线且缓存过期（>6h 或跨天）自动后台拉取；会话内每 3 小时刷新一次
  _maybeAutoRefresh(view, ts) {
    if (!navigator.onLine) return;
    const now = Date.now();
    const stale = !ts || (now - ts) > 6 * 3600e3 || (ts && !this._sameDay(ts, now));
    if (stale) this._fetch(null, true);
    if (!App._researchTimer) {
      App._researchTimer = setInterval(() => { if (navigator.onLine) this._fetch(null, true); }, 3 * 3600e3);
    }
  },
  _sameDay(a, b) {
    const x = new Date(a), y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  },
  _topicOf(q) {
    if (q.includes('resistance') || q.includes('interval')) return '训练';
    if (q.includes('ACL') || q.includes('rehabilitation')) return '康复';
    if (q.includes('physical education')) return '课堂';
    if (q.includes('posture')) return '体态';
    return '训练';
  },
});
