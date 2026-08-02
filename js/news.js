/* ===== 模块：体育新闻（国家+上海，每日推荐，联网更新+离线缓存） ===== */
App.registerModule({
  id: 'news',
  title: '体育新闻',
  emoji: '📰',
  _src: '全部',
  async render(view) {
    let items = await App.cache.get('news');
    items = items ? items.data : App.data.newsSeed.slice();
    const ts = (await App.cache.get('news'))?.ts;
    // 每日推荐：按一年中的第几天轮换取3条
    const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
    const rec = items.length ? [items[doy % items.length], items[(doy + 1) % items.length], items[(doy + 2) % items.length]] : [];

    const seg = `<div class="seg" id="nsrc">
      <button data-s="全部" class="${this._src === '全部' ? 'on' : ''}">全部</button>
      <button data-s="国家" class="${this._src === '国家' ? 'on' : ''}">国家</button>
      <button data-s="上海" class="${this._src === '上海' ? 'on' : ''}">上海</button></div>`;

    let h = `<div class="page-head"><h1>📰 体育新闻</h1><span class="sub">国家 · 上海 · 每日推荐</span>
      <span class="spacer"></span><button class="btn" id="refresh">🔄 联网更新</button></div>`;
    h += `<div style="margin-bottom:12px">${seg}</div>`;

    if (ts) h += `<p class="muted">📥 缓存于 ${new Date(ts).toLocaleString('zh-CN')}；离线时显示最近缓存${navigator.onLine ? '' : '（当前离线）'}</p>`;

    h += `<div class="card" style="border-color:var(--pink)"><h2>⭐ 今日推荐</h2><div class="list">` +
      rec.map((n) => this._card(n, true)).join('') + `</div></div>`;

    const list = items.filter((n) => this._src === '全部' || n.src === this._src);
    h += `<div class="list">` + list.map((n) => this._card(n, false)).join('') + `</div>`;
    if (!list.length) h += `<div class="empty">暂无该来源新闻</div>`;

    view.innerHTML = h;
    App.util.$$('#nsrc button', view).forEach((b) => b.onclick = () => { this._src = b.dataset.s; this.render(view); });
    view.querySelector('#refresh').onclick = () => this._fetch(view);
  },
  _card(n, big) {
    return `<div class="paper" style="margin-bottom:10px">
      <div><span class="chip" style="background:${n.src === '上海' ? '#6aa8ff' : '#ff6fa5'};color:#fff">${n.src}</span>
      <span class="tag">${App.util.esc(n.tag)}</span><span class="muted">${App.util.esc(n.date)}</span></div>
      <h3 style="margin:6px 0">${App.util.esc(n.title)}</h3>
      <div class="abs" style="max-height:none">${App.util.esc(n.sum)}</div></div>`;
  },
  async _fetch(view) {
    App.util.toast('正在联网获取最新新闻…');
    const feeds = [
      { src: '国家', url: 'http://www.chinanews.com/rss/sports.xml' },
      { src: '上海', url: 'https://www.shanghai.gov.cn/nw12344/index.html' },
    ];
    const proxy = (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u);
    let got = [];
    for (const f of feeds) {
      try {
        const res = await fetch(proxy(f.url), { cache: 'no-store' });
        if (!res.ok) continue;
        const txt = await res.text();
        const xml = new DOMParser().parseFromString(txt, 'text/xml');
        const nodes = Array.from(xml.querySelectorAll('item, entry')).slice(0, 6);
        nodes.forEach((it) => {
          const title = it.querySelector('title')?.textContent || '';
          const desc = it.querySelector('description, summary')?.textContent || '';
          const date = it.querySelector('pubDate, updated')?.textContent || '';
          if (title) got.push({ id: App.util.uid(), src: f.src, tag: '资讯', title: title.slice(0, 60), date: (date || '').slice(0, 10), sum: desc.replace(/<[^>]+>/g, '').slice(0, 120) || title });
        });
      } catch (e) { /* 单源失败忽略 */ }
    }
    if (got.length) {
      const merged = got.concat(App.data.newsSeed);
      await App.cache.set('news', merged);
      App.util.toast('已更新 ' + got.length + ' 条 🎉');
    } else {
      App.util.toast('联网更新失败，显示缓存内容');
    }
    this.render(view);
  },
});
