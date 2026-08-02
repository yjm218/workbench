/* ===== 模块：备份 / 云端同步 ===== */
App.registerModule({
  id: 'sync',
  title: '备份同步',
  emoji: '☁️',
  async render(view) {
    const cfg = (await App.dbapi.get('sync', 'config'))?.v || { provider: 'none' };
    const last = cfg.lastSync ? new Date(cfg.lastSync).toLocaleString('zh-CN') : '从未';

    let h = `<div class="page-head"><h1>☁️ 备份与同步</h1><span class="sub">离线本机 + 可选云端</span></div>`;

    h += `<div class="card"><h2>📦 本机备份（最稳妥，支持 AirDrop/文件App）</h2>
      <p class="muted">把全部数据导出成一个 JSON，换手机或重装时再导入即可。云端同步失败时的兜底方案。</p>
      <div class="row"><button class="btn" id="exp">⬇️ 导出备份</button><button class="btn soft" id="imp">⬆️ 导入备份</button>
      <input type="file" id="file" accept="application/json" style="display:none"></div></div>`;

    h += `<div class="card"><h2>🔗 云端同步</h2>
      <p class="muted">最近同步：${last}</p>
      <div class="field"><label>同步方式</label><select id="prov">
        <option value="none" ${cfg.provider === 'none' ? 'selected' : ''}>不启用（仅本机）</option>
        <option value="gist" ${cfg.provider === 'gist' ? 'selected' : ''}>GitHub Gist（免费，需Token）</option>
        <option value="webdav" ${cfg.provider === 'webdav' ? 'selected' : ''}>WebDAV（如坚果云）</option></select></div>
      <div id="provBox"></div>
      <div class="row"><button class="btn green" id="saveCfg">保存配置</button>
        <button class="btn" id="up">⬆️ 上传到云端</button><button class="btn soft" id="down">⬇️ 从云端下载</button></div>
      <p class="muted" id="syncMsg"></p></div>`;

    view.innerHTML = h;
    view.querySelector('#exp').onclick = () => this._exportAll();
    view.querySelector('#imp').onclick = () => view.querySelector('#file').click();
    view.querySelector('#file').onchange = (e) => this._importAll(e.target.files[0]);
    view.querySelector('#prov').onchange = (e) => this._provBox(view, e.target.value, cfg);
    this._provBox(view, cfg.provider, cfg);
    view.querySelector('#saveCfg').onclick = async () => {
      const c = this._readCfg(view); await App.dbapi.put('sync', { k: 'config', v: c });
      App.util.toast('配置已保存'); this.render(view);
    };
    view.querySelector('#up').onclick = () => this._upload(view);
    view.querySelector('#down').onclick = () => this._download(view);
  },
  _provBox(view, prov, cfg) {
    const box = view.querySelector('#provBox');
    if (prov === 'gist') {
      box.innerHTML = `<div class="field"><label>GitHub Token（仅本地保存，不上传他人）</label><input id="g_token" type="password" value="${cfg.gist?.token || ''}" placeholder="ghp_xxx"></div>
        <div class="field"><label>Gist ID（首次留空会自动新建）</label><input id="g_id" value="${cfg.gist?.gistId || ''}" placeholder="首次留空"></div>
        <p class="muted">在 GitHub → Settings → Developer settings → Personal access tokens 生成（勾选 gist 权限）。</p>`;
    } else if (prov === 'webdav') {
      box.innerHTML = `<div class="field"><label>WebDAV 地址</label><input id="w_url" value="${cfg.webdav?.url || ''}" placeholder="https://dav.jianguoyun.com/dav/"></div>
        <div class="field"><label>用户名</label><input id="w_user" value="${cfg.webdav?.user || ''}"></div>
        <div class="field"><label>密码/授权码</label><input id="w_pass" type="password" value="${cfg.webdav?.pass || ''}"></div>
        <p class="muted">坚果云需在官网开启 WebDAV 并生成授权码。注意：部分运营商可能限制浏览器跨域。</p>`;
    } else box.innerHTML = '';
  },
  _readCfg(view) {
    const prov = view.querySelector('#prov').value;
    const c = { provider: prov, lastSync: null };
    if (prov === 'gist') c.gist = { token: view.querySelector('#g_token').value.trim(), gistId: view.querySelector('#g_id').value.trim() };
    if (prov === 'webdav') c.webdav = { url: view.querySelector('#w_url').value.trim(), user: view.querySelector('#w_user').value.trim(), pass: view.querySelector('#w_pass').value.trim() };
    return c;
  },
  async _gather() {
    const out = { app: 'workbench', version: App.version, exportedAt: Date.now() };
    for (const s of ['tasks', 'finance', 'weight', 'plans', 'lessonplans']) out[s] = await App.dbapi.getAll(s);
    out.settings = await App.setting.all();
    return out;
  },
  async _exportAll() {
    const data = await this._gather();
    App.util.download('workbench-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(data, null, 2));
    App.util.toast('已导出备份 💾');
  },
  async _importAll(file) {
    if (!file) return;
    try {
      const text = await App.util.readFile(file);
      const data = JSON.parse(text);
      for (const s of ['tasks', 'finance', 'weight', 'plans', 'lessonplans']) {
        if (Array.isArray(data[s])) { await App.dbapi.clear(s); for (const it of data[s]) await App.dbapi.put(s, it); }
      }
      if (data.settings) { await App.dbapi.clear('settings'); for (const k in data.settings) await App.setting.set(k, data.settings[k]); }
      App.util.toast('导入成功 ✅'); this.render(document.getElementById('view'));
    } catch (e) { App.util.toast('导入失败：文件格式错误'); }
  },
  async _upload(view) {
    const cfg = (await App.dbapi.get('sync', 'config'))?.v;
    if (!cfg || cfg.provider === 'none') { App.util.toast('请先选择并保存同步方式'); return; }
    const data = await this._gather();
    const json = JSON.stringify(data);
    try {
      if (cfg.provider === 'gist') {
        const head = { Authorization: 'token ' + cfg.gist.token, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' };
        if (!cfg.gist.gistId) {
          const r = await fetch('https://api.github.com/gists', { method: 'POST', headers: head, body: JSON.stringify({ description: 'workbench backup', public: false, files: { 'workbench-backup.json': { content: json } } }) });
          const j = await r.json(); cfg.gist.gistId = j.id;
        } else {
          await fetch('https://api.github.com/gists/' + cfg.gist.gistId, { method: 'PATCH', headers: head, body: JSON.stringify({ files: { 'workbench-backup.json': { content: json } } }) });
        }
        cfg.lastSync = Date.now(); await App.dbapi.put('sync', { k: 'config', v: cfg });
        view.querySelector('#syncMsg').textContent = '✅ 已上传到 GitHub Gist';
      } else if (cfg.provider === 'webdav') {
        const url = cfg.webdav.url.replace(/\/$/, '') + '/workbench-backup.json';
        const auth = 'Basic ' + btoa(cfg.webdav.user + ':' + cfg.webdav.pass);
        const r = await fetch(url, { method: 'PUT', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: json });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        cfg.lastSync = Date.now(); await App.dbapi.put('sync', { k: 'config', v: cfg });
        view.querySelector('#syncMsg').textContent = '✅ 已上传到 WebDAV';
      }
      App.util.toast('云端上传成功 ☁️'); this.render(view);
    } catch (e) { view.querySelector('#syncMsg').textContent = '❌ 上传失败：' + e.message + '（可改用本机导出）'; }
  },
  async _download(view) {
    const cfg = (await App.dbapi.get('sync', 'config'))?.v;
    if (!cfg || cfg.provider === 'none') { App.util.toast('请先选择同步方式'); return; }
    try {
      let data;
      if (cfg.provider === 'gist') {
        const r = await fetch('https://api.github.com/gists/' + cfg.gist.gistId, { headers: { Authorization: 'token ' + cfg.gist.token, Accept: 'application/vnd.github+json' } });
        const j = await r.json(); data = j.files['workbench-backup.json'].content;
      } else {
        const url = cfg.webdav.url.replace(/\/$/, '') + '/workbench-backup.json';
        const auth = 'Basic ' + btoa(cfg.webdav.user + ':' + cfg.webdav.pass);
        const r = await fetch(url, { headers: { Authorization: auth } }); data = await r.text();
      }
      const obj = JSON.parse(data);
      for (const s of ['tasks', 'finance', 'weight', 'plans', 'lessonplans']) {
        if (Array.isArray(obj[s])) { await App.dbapi.clear(s); for (const it of obj[s]) await App.dbapi.put(s, it); }
      }
      if (obj.settings) { await App.dbapi.clear('settings'); for (const k in obj.settings) await App.setting.set(k, obj.settings[k]); }
      cfg.lastSync = Date.now(); await App.dbapi.put('sync', { k: 'config', v: cfg });
      App.util.toast('已从云端下载并恢复 ☁️'); this.render(document.getElementById('view'));
    } catch (e) { view.querySelector('#syncMsg').textContent = '❌ 下载失败：' + e.message; }
  },
});
