/* ===== 启动 ===== */
(function () {
  function start() {
    // 顶部日期
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });

    // 导航
    App.buildNav();

    // 抽屉
    document.getElementById('menuBtn').onclick = () => App.openDrawer();
    document.getElementById('scrim').onclick = () => App.closeDrawer();

    // 在线状态点
    const dot = document.getElementById('syncDot');
    function upd() { dot.classList.toggle('off', !navigator.onLine); dot.title = navigator.onLine ? '在线' : '离线（显示缓存）'; }
    upd(); window.addEventListener('online', upd); window.addEventListener('offline', upd);

    // 路由
    window.addEventListener('hashchange', () => route());
    function route() {
      const id = (location.hash || '').replace('#/', '') || 'tasks';
      App.router.render(id);
    }

    // 初始化数据库后渲染
    App.dbapi.ready().then(() => {
      if (!location.hash) location.hash = '#/tasks'; else route();
    });

    // Service Worker（离线）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW 注册失败', e));
    }

    // iOS 安装引导（一次性）
    if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !localStorage.getItem('ios_tip_done')) {
      const b = document.createElement('div');
      b.className = 'ios-tip';
      b.style.cssText = 'position:fixed;left:10px;right:10px;top:60px;z-index:38';
      b.innerHTML = `<span>🍓</span><div style="flex:1"><b>iPhone 使用小贴士</b><br>用 Safari 打开本页 → 点底部「分享」→「添加到主屏幕」，就能像 App 一样离线使用啦！<br><a id="iosHelp" style="color:var(--pink-deep);font-weight:700">查看图文教程</a></div><button id="iosClose" style="background:none;border:none;font-size:18px;color:var(--ink-soft)">×</button>`;
      document.body.appendChild(b);
      b.querySelector('#iosClose').onclick = () => { b.remove(); localStorage.setItem('ios_tip_done', '1'); };
      b.querySelector('#iosHelp').onclick = showIosHelp;
    }
  }

  function showIosHelp() {
    const html = `<h3>📲 安装到 iPhone 主屏幕</h3>
      <ol>
        <li>用 <b>Safari</b> 浏览器打开本工作台网址（其他浏览器如微信内置浏览器不支持添加到主屏幕）。</li>
        <li>点击底部中间的 <b>分享</b> 图标（方框加箭头）。</li>
        <li>向上滑动找到并点击「<b>添加到主屏幕</b>」。</li>
        <li>可修改名称，点「添加」。桌面上会出现 🌸 图标。</li>
        <li>以后从桌面打开即可<b>离线使用</b>；联网时会自动更新新闻/文献缓存。</li>
      </ol>
      <p class="muted">⚠️ iOS 对网页通知限制较多，任务提醒以「应用内角标+打开即提醒」方式兜底，请确保常用时打开一次。</p>
      <div class="row"><button class="btn" id="c">知道了</button></div>`;
    const mask = App.modal(html, (m) => m.querySelector('#c').onclick = () => App.closeModal(mask));
  }
  App.showIosHelp = showIosHelp;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
