/* ===== 模块：体育备课（贴合上海上教版 · 单元问题链+学习进程表+三核心素养） ===== */
App.registerModule({
  id: 'lessonplan',
  title: '体育备课',
  emoji: '📚',
  _view: 'home',
  async render(view) {
    if (this._view === 'unit') return this._renderUnit(view);
    if (this._view === 'lesson') return this._renderLesson(view);
    return this._renderHome(view);
  },

  async _renderHome(view) {
    const saved = await App.dbapi.getAll('lessonplans');
    let h = `<div class="page-head"><h1>📚 体育备课</h1><span class="sub">上海高中 · 上教版 · 单元+课时</span>
      <span class="spacer"></span>
      <button class="btn" id="newUnit">＋ 大单元</button>
      <button class="btn soft" id="newLesson">＋ 课时计划</button></div>`;

    h += `<div class="card"><h2>🎯 专项库（★为你的任教专项）</h2><div class="grid c3">` +
      App.data.specialties.map((s) => `<div class="exo" data-spec="${s.id}">${s.emoji}<div class="nm">${s.name}${s.focus ? ' ★' : ''}</div>
        <div class="mt">${s.units.length} 个模块</div></div>`).join('') + `</div></div>`;

    h += `<div class="card"><h2>🗂️ 已生成教案（${saved.length}）</h2>`;
    if (saved.length) {
      h += `<div class="list">` + saved.slice().reverse().map((p) => `<div class="todo">
        <div class="chk" style="border-color:transparent;background:var(--pink-bg);color:var(--pink-deep)">${p.kind === 'unit' ? '📘' : '📄'}</div>
        <div class="todo-main" data-open="${p.id}"><div class="todo-title">${App.util.esc(p.name)}</div>
        <div class="todo-meta"><span>${p.kind === 'unit' ? '大单元' : '课时计划'}</span><span>${App.util.fmtDate(new Date(p.created))}</span></div></div>
        <button class="btn ghost sm" data-exp="${p.id}">导出</button><button class="btn ghost sm" data-delp="${p.id}">删</button></div>`).join('') + `</div>`;
    } else h += `<div class="muted">还没有生成教案，点上方按钮开始～</div>`;
    h += `</div>`;

    view.innerHTML = h;
    App.util.$$('[data-spec]', view).forEach((el) => el.onclick = () => { this._view = 'unit'; this._renderUnit(view, true, el.dataset.spec); });
    view.querySelector('#newUnit').onclick = () => { this._view = 'unit'; this._renderUnit(view, true); };
    view.querySelector('#newLesson').onclick = () => { this._view = 'lesson'; this._renderLesson(view, true); };
    App.util.$$('[data-open]', view).forEach((el) => el.onclick = async () => {
      const p = (await App.dbapi.getAll('lessonplans')).find((x) => x.id === el.dataset.open);
      if (p) {
        if (p.kind === 'unit') { this._unitParams = { spec: p.data.specId, grade: p.data.grade, total: p.data.total }; this._view = 'unit'; this._renderUnit(view); }
        else { this._lessonParams = { spec: p.data.specId, grade: p.data.grade, cls: p.data.cls, num: p.data.num, teacher: p.data.teacher, orgForm: p.data.orgForm, week: p.data.week, no: p.data.no, date: p.data.date, topic: p.data.topic }; this._view = 'lesson'; this._renderLesson(view); }
      }
    });
    App.util.$$('[data-exp]', view).forEach((el) => el.onclick = async () => {
      const p = (await App.dbapi.getAll('lessonplans')).find((x) => x.id === el.dataset.exp); if (p) this._export(p);
    });
    App.util.$$('[data-delp]', view).forEach((el) => el.onclick = async () => {
      if (!confirm('删除该教案？')) return; await App.dbapi.del('lessonplans', el.dataset.delp); this.render(view);
    });
  },

  /* ---------- 大单元 ---------- */
  async _renderUnit(view, form, prefill) {
    if (form || !this._unitParams) {
      const sp = App.data.specialties;
      const html = `<h3>新建大单元教学设计</h3>
        <div class="field"><label>专项</label><select id="u_spec">${sp.map((s) => `<option value="${s.id}" ${(prefill ? s.id === prefill : s.focus) ? 'selected' : ''}>${s.name}${s.focus ? ' ★任教' : ''}</option>`).join('')}</select></div>
        <div class="row"><div class="field" style="flex:1"><label>年级</label><select id="u_grade"><option>高中一年级</option><option>高中二年级</option><option>高中三年级</option></select></div>
        <div class="field" style="flex:1"><label>总课时</label><input type="number" id="u_total" value="18" min="6" max="36"></div></div>
        <div class="row"><button class="btn" id="u_gen">✨ 生成</button><button class="btn ghost" id="u_back">返回</button></div>`;
      const mask = App.modal(html, (m) => {
        m.querySelector('#u_gen').onclick = () => {
          this._unitParams = { spec: m.querySelector('#u_spec').value, grade: m.querySelector('#u_grade').value, total: +m.querySelector('#u_total').value || 18 };
          App.closeModal(mask); this._renderUnit(view);
        };
        m.querySelector('#u_back').onclick = () => { this._view = 'home'; App.closeModal(mask); this.render(view); };
      });
      return;
    }
    const spec = App.data.specialties.find((s) => s.id === this._unitParams.spec);
    const plan = this._buildUnit(spec, this._unitParams.grade, this._unitParams.total);
    const saved = { id: App.util.uid(), kind: 'unit', name: plan.name, created: Date.now(), data: plan };
    this._cur = saved;
    let h = `<div class="page-head"><h1>📘 ${App.util.esc(plan.name)}</h1><span class="spacer"></span>
      <button class="btn" id="u_save">💾 保存</button><button class="btn soft" id="u_exp">导出Word</button>
      <button class="btn ghost" id="u_back2">返回</button></div>`;
    h += this._unitHTML(plan);
    view.innerHTML = h;
    view.querySelector('#u_save').onclick = async () => { await App.dbapi.put('lessonplans', saved); App.util.toast('已保存 💾'); };
    view.querySelector('#u_exp').onclick = () => this._export(saved);
    view.querySelector('#u_back2').onclick = () => { this._view = 'home'; this.render(view); };
  },

  _buildUnit(spec, grade, total) {
    const name = spec.name + '（' + grade + '）大单元教学设计';
    const units = spec.units;
    const per = Math.max(1, Math.floor(total / units.length));
    let remain = total;
    const sched = [];
    units.forEach((u, i) => {
      const n = i === units.length - 1 ? remain : per; remain -= n;
      for (let k = 1; k <= n; k++) sched.push({ no: sched.length + 1, title: u + (k > 1 ? '②'.repeat(0) + '①'.repeat(0) : '') + (k === 1 ? '①' : (k === 2 ? '②' : '③')), raw: u });
    });
    const cnt = {};
    sched.forEach((s) => { cnt[s.raw] = (cnt[s.raw] || 0) + 1; s.title = s.raw + (['①', '②', '③', '④', '⑤', '⑥'][cnt[s.raw] - 1] || ''); });

    const basicQ = '如何在' + spec.name + '学练中提升运动能力、养成健康行为并彰显体育品德，理解运动与科学、人文、艺术的关联？';
    const keyQs = [
      '如何理解与运用' + spec.name + '的基本技术与练习方法，建立正确的动作概念？',
      '如何在学练中发展体能、保障安全并预防运动损伤，理解运动中的生物力学与生理知识？',
      '如何在展示与比赛中遵守规则、团队协作、正确看待胜负，并体现体育精神与审美表达？',
    ];
    const third = Math.ceil(sched.length / 3);

    // 跨学科主题：每个专项匹配1-2个学科
    const inter = this._interDiscipline(spec);

    const procs = [
      { name: '学习进程一：体能发展与基本技能学练', lessons: sched.slice(0, third), goals: this._goals(spec, '基础'), act: `◆关键问题：${keyQs[0]}\n◆情境任务：以“运动技能进阶卡”为驱动，通过微课视频、教师示范、同伴互助，掌握基本动作。\n◆活动实施：情境导入→分解示范→模仿练习→分组学练→即时反馈，跨${third}课时。\n◆评价要点：动作姿势正确率≥70%、参与态度积极、安全热身到位。\n◆工具和技术：iPad视频示范、心率监测、动作自评表。\n◆跨学科链接：${inter.stage1}` },
      { name: '学习进程二：技战术运用与组合', lessons: sched.slice(third, third * 2), goals: this._goals(spec, '运用'), act: `◆关键问题：${keyQs[1]}\n◆情境任务：以“小组挑战赛/战术设计单”为驱动，在组合练习与对抗中运用技术。\n◆活动实施：复习衔接→组合练习→小组对抗→纠错反馈→战术小结。\n◆评价要点：技术连贯性、安全习惯、负荷自我监控（心率/主观疲劳）。\n◆工具和技术：战术板、运动手环、学习单。\n◆跨学科链接：${inter.stage2}` },
      { name: '学习进程三：展示比赛与综合评价', lessons: sched.slice(third * 2), goals: this._goals(spec, '比赛'), act: `◆关键问题：${keyQs[2]}\n◆情境任务：以“班级联赛/成果展演”为载体，展示学习成果。\n◆活动实施：教学比赛/成果展示→自评互评→总结颁奖→课后锻炼布置。\n◆评价要点：规则意识、体育品德、体能变化、审美表现。\n◆工具和技术：评分表、班级联赛记录、学习档案袋。\n◆跨学科链接：${inter.stage3}` },
    ];
    return { name, spec: spec.name, specId: spec.id, grade, total, basicQ, keyQs, procs, sched, inter };
  },
  _interDiscipline(spec) {
    const m = {
      track: { subject: '物理+生物', stage1: '物理：分析跑/跳/投中的力与运动、重心控制；生物：了解肌肉收缩与供能系统。', stage2: '生物：心率、呼吸与运动强度的关系；物理：投掷/跳跃中的角度与远度。', stage3: '语文/艺术：撰写运动感悟、设计班级运动会宣传海报与颁奖词。' },
      pingpong: { subject: '物理+心理', stage1: '物理：旋转、弧线、反弹角度；心理：专注与反应时。', stage2: '物理：击球力量、拍面角度与落点控制；心理：比赛中的情绪调节。', stage3: '语文/艺术：撰写赛况报道、设计比赛海报。' },
      basketball: { subject: '物理+地理', stage1: '物理：抛物线、反弹与力的作用；地理：篮球场地的空间利用。', stage2: '物理：传球力量与角度；地理/数学：跑位线路与区域覆盖。', stage3: '语文/艺术：解说词、班级篮球联赛海报。' },
      gym: { subject: '物理+艺术', stage1: '物理：重心、支撑面与平衡；艺术：体操动作的姿态美。', stage2: '物理：翻转中的角动量与缓冲；艺术：动作的节奏与表现力。', stage3: '语文/艺术：编排解说、音乐与动作创编。' },
      wushu: { subject: '历史+艺术', stage1: '历史：武术文化起源与礼仪；艺术：动作造型与精气神。', stage2: '历史：传统套路的文化内涵；艺术：动作节奏与音乐配合。', stage3: '语文/艺术：武术文化小论文、汇报展演。' },
      swim: { subject: '物理+生物', stage1: '物理：浮力、阻力与流线型；生物：呼吸与心肺适应。', stage2: '物理：划水角度与推进力；生物：能量供应与乳酸。', stage3: '语文/地理：水上安全宣传、救生知识科普。' },
      soccer: { subject: '物理+地理', stage1: '物理：脚触球的力与旋转；地理：场地空间利用。', stage2: '物理：长传弧线与落点；地理/数学：阵型与区域防守。', stage3: '语文/艺术：赛况报道、足球文化海报。' },
      volleyball: { subject: '物理+心理', stage1: '物理：垫球/发球中的力与角度；心理：团队沟通。', stage2: '物理：扣球力量与过网角度；心理：比赛压力应对。', stage3: '语文/艺术：排球赛事解说、班级联赛海报。' },
      badminton: { subject: '物理+心理', stage1: '物理：高远球/吊球的轨迹与空气阻力；心理：快速决策。', stage2: '物理：杀球速度与落点；心理：比分落后时的调整。', stage3: '语文/艺术：羽毛球比赛报道、战术漫画。' },
      tennis: { subject: '物理+艺术', stage1: '物理：旋转球（上旋/下旋）的轨迹；艺术：击球姿态美。', stage2: '物理：发球角度与力量分配；艺术：比赛节奏与礼仪。', stage3: '语文/艺术：赛事解说、网球礼仪宣传。' },
      aerobics: { subject: '音乐+生物', stage1: '音乐：节奏与节拍；生物：有氧运动与心肺。', stage2: '音乐：动作与音乐的配合；生物：运动强度与能量消耗。', stage3: '语文/艺术：创编说明、成果展演。' },
      dance: { subject: '音乐+艺术', stage1: '音乐：舞曲节奏与风格；艺术：身体姿态与架型。', stage2: '音乐：节奏处理与情感表达；艺术：双人配合与舞台表现。', stage3: '语文/艺术：舞蹈文化介绍、汇报演出。' },
      taekwondo: { subject: '历史+生物', stage1: '历史：跆拳道礼仪与精神；生物：踢腿肌群与柔韧性。', stage2: '物理：踢腿中的力与速度；生物：反应与爆发力。', stage3: '语文/历史：跆拳道精神小论文、汇报展示。' },
      fencing: { subject: '物理+心理', stage1: '物理：剑的刺击速度与距离；心理：专注与预判。', stage2: '物理：攻防中的距离控制；心理：比赛中的冷静决策。', stage3: '语文/历史：击剑文化介绍、礼仪展示。' },
      orient: { subject: '地理+数学', stage1: '地理：地图符号与方位；数学：比例尺与距离估算。', stage2: '地理：地形与路线选择；数学：最优路径规划。', stage3: '语文/地理：定向活动总结、户外安全宣传。' },
      yoga: { subject: '生物+心理', stage1: '生物：呼吸与副交感神经；心理：专注与放松。', stage2: '生物：肌肉拉伸与关节活动度；心理：情绪调节。', stage3: '语文/艺术：瑜伽心得、舒缓音乐创编。' },
      pickleball: { subject: '物理+心理', stage1: '物理：球的飞行与反弹；心理：反应与判断。', stage2: '物理：截击力量与落点；心理：双打配合与沟通。', stage3: '语文/艺术：匹克球赛事报道、规则宣传。' },
      baseball: { subject: '物理+地理', stage1: '物理：击球中的力与旋转；地理：场地布局。', stage2: '物理：传球轨迹与跑垒时机；地理/数学：防守阵型。', stage3: '语文/历史：棒垒球文化、赛况报道。' },
      fitness: { subject: '生物+物理', stage1: '生物：肌肉工作原理；物理：力量训练中的杠杆。', stage2: '生物：心肺耐力与能量代谢；物理：运动中的功与功率。', stage3: '数学/语文：体能数据分析、运动处方设计。' },
    };
    return m[spec.id] || { subject: '体育', stage1: '体育与健康：动作技能学习', stage2: '体育与健康：体能发展与安全', stage3: '体育与健康：比赛与品德' };
  },
  _goals(spec, stage) {
    const m = {
      '基础': ['了解' + spec.name + '基本知识与安全规范，做出正确基本动作', '主动参与学练，做好热身与放松', '遵守练习秩序，虚心请教'],
      '运用': ['在组合/对抗中合理运用技术，提升协调与灵敏', '科学安排负荷，及时消除疲劳', '尊重对手，公平竞争'],
      '比赛': ['在展示/比赛中稳定发挥，体现战术意识', '坚持锻炼，形成健康生活习惯', '正确看待胜负，展现体育精神'],
    };
    const arr = m[stage] || m['基础'];
    return { 运动能力: arr[0], 健康行为: arr[1], 体育品德: arr[2] };
  },
  _unitHTML(p) {
    let h = `<div class="card"><h2>一、单元基本信息</h2>
      <table class="lp"><tr><th>学科</th><td>体育与健康</td><th>学段/年级</th><td>${App.util.esc(p.grade)}</td></tr>
      <tr><th>单元名称</th><td colspan="3">${App.util.esc(p.spec)}</td></tr>
      <tr><th>总课时</th><td>${p.total}</td><th>设计者</th><td>你的姓名（上师大青浦附中）</td></tr></table></div>`;
    h += `<div class="card"><h2>二、单元问题链</h2>
      <p><b>单元基本问题：</b>${App.util.esc(p.basicQ)}</p>
      <p><b>关键问题：</b></p><ol>${p.keyQs.map((q) => `<li>${App.util.esc(q)}</li>`).join('')}</ol>
      <p><b>跨学科主题：</b>${App.util.esc(p.inter.subject || '体育与健康')}</p>
      <p><b>跨学科链接：</b></p><ul><li>进程一：${App.util.esc(p.inter.stage1)}</li><li>进程二：${App.util.esc(p.inter.stage2)}</li><li>进程三：${App.util.esc(p.inter.stage3)}</li></ul></div>`;
    h += `<div class="card"><h2>三、单元学习进程</h2>`;
    p.procs.forEach((pr) => {
      h += `<h3>${App.util.esc(pr.name)}</h3>
        <table class="lp"><tr><th>课时</th><td colspan="3">${pr.lessons.map((l) => l.title).join(' / ')}</td></tr>
        <tr><th>运动能力</th><td colspan="3">${App.util.esc(pr.goals.运动能力)}</td></tr>
        <tr><th>健康行为</th><td colspan="3">${App.util.esc(pr.goals.健康行为)}</td></tr>
        <tr><th>体育品德</th><td colspan="3">${App.util.esc(pr.goals.体育品德)}</td></tr>
        <tr><th>主要内容</th><td colspan="3">${pr.lessons.map((l) => l.title).join('、')}</td></tr>
        <tr><th>学习活动与评价</th><td colspan="3"><pre class="pre">${App.util.esc(pr.act)}</pre></td></tr></table>`;
    });
    h += `</div>`;
    h += `<div class="card"><h2>四、课时安排（${p.sched.length}）</h2><div class="list">` +
      p.sched.map((s) => `<div class="todo"><div class="chk" style="border-color:transparent;background:var(--pink-bg);color:var(--pink-deep)">${s.no}</div>
      <div class="todo-main"><div class="todo-title">${App.util.esc(s.title)}</div><div class="todo-meta"><span>第 ${s.no}/${p.total} 课时</span></div></div></div>`).join('') + `</div></div>`;
    return h;
  },

  /* ---------- 课时计划 ---------- */
  async _renderLesson(view, form) {
    if (form || !this._lessonParams) {
      const sp = App.data.specialties;
      const today = new Date().toISOString().slice(0, 10);
      const html = `<h3>新建课时计划（对齐学校模板）</h3>
        <div class="row"><div class="field" style="flex:1"><label>专项</label><select id="l_spec">${sp.map((s) => `<option value="${s.id}" ${s.focus ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
        <div class="field" style="flex:1"><label>年级</label><select id="l_grade"><option>高中一年级</option><option>高中二年级</option><option>高中三年级</option></select></div>
        <div class="field" style="flex:1"><label>班级</label><input id="l_cls" value="1班"></div></div>
        <div class="row"><div class="field" style="flex:1"><label>人数</label><input type="number" id="l_num" value="40"></div>
        <div class="field" style="flex:1"><label>执教</label><input id="l_teacher" placeholder="你的姓名"></div>
        <div class="field" style="flex:1"><label>组班形式</label><select id="l_org"><option>行政班</option><option>男女合班</option><option>选项班</option><option>走班</option></select></div></div>
        <div class="row"><div class="field" style="flex:1"><label>周次</label><input type="number" id="l_week" value="1" min="1"></div>
        <div class="field" style="flex:1"><label>第几课时</label><input type="number" id="l_no" value="1" min="1"></div>
        <div class="field" style="flex:1"><label>日期</label><input type="date" id="l_date" value="${today}"></div></div>
        <div class="field"><label>教学内容主题</label><input id="l_topic" placeholder="如：快速跑——起跑与加速"></div>
        <div class="row"><button class="btn" id="l_gen">✨ 生成</button><button class="btn ghost" id="l_back">返回</button></div>`;
      const mask = App.modal(html, (m) => {
        m.querySelector('#l_gen').onclick = () => {
          this._lessonParams = {
            spec: m.querySelector('#l_spec').value, grade: m.querySelector('#l_grade').value,
            cls: m.querySelector('#l_cls').value, num: +m.querySelector('#l_num').value || 40,
            teacher: m.querySelector('#l_teacher').value.trim(), orgForm: m.querySelector('#l_org').value,
            week: +m.querySelector('#l_week').value || 1, no: +m.querySelector('#l_no').value || 1,
            date: m.querySelector('#l_date').value || today, topic: m.querySelector('#l_topic').value.trim() || '技术学练',
          };
          App.closeModal(mask); this._renderLesson(view);
        };
        m.querySelector('#l_back').onclick = () => { this._view = 'home'; App.closeModal(mask); this.render(view); };
      });
      return;
    }
    const spec = App.data.specialties.find((s) => s.id === this._lessonParams.spec);
    const lp = this._buildLesson(spec, this._lessonParams);
    const saved = { id: App.util.uid(), kind: 'lesson', name: '课时计划·' + lp.topic, created: Date.now(), data: lp };
    this._cur = saved;
    let h = `<div class="page-head"><h1>📄 ${App.util.esc(lp.topic)}</h1><span class="spacer"></span>
      <button class="btn" id="l_save">💾 保存</button><button class="btn soft" id="l_exp">导出Word</button>
      <button class="btn ghost" id="l_back2">返回</button></div>`;
    h += this._lessonHTML(lp);
    view.innerHTML = h;
    view.querySelector('#l_save').onclick = async () => { await App.dbapi.put('lessonplans', saved); App.util.toast('已保存 💾'); };
    view.querySelector('#l_exp').onclick = () => this._export(saved);
    view.querySelector('#l_back2').onclick = () => { this._view = 'home'; this.render(view); };
  },
  _buildLesson(spec, p) {
    const topic = p.topic;
    const stage = p.no <= 6 ? '基础' : (p.no <= 12 ? '运用' : '比赛');
    const kpDiff = this._keyDiff(spec, topic);
    const warm = this._warmContent(spec);
    const main = this._mainContent(spec, topic, p.no);
    const resource = this._resource(spec);
    const safety = this._safety(spec);
    const fitness = this._fitnessContent(spec, stage);
    const keyQuestion = this._keyQuestion(spec, topic);
    return {
      school: '上海市**学校',
      spec: spec.name, specId: spec.id, grade: p.grade, cls: p.cls, num: p.num,
      teacher: p.teacher || '（你的姓名）', orgForm: p.orgForm || '行政班',
      week: p.week || 1, no: p.no, date: p.date || new Date().toISOString().slice(0, 10),
      topic,
      goals: this._goals(spec, stage),
      keyPoint: kpDiff.keyPoint,
      diffPoint: kpDiff.diffPoint,
      keyQuestion,
      structure: [
        { seq: '开始部分', time: '3\'', content: '①体育委员整队、报告人数；②师生问好；③宣布本课内容、目标与评价标准；④检查服装、安排见习生；⑤情境导入/关键问题呈现', count: '1', itime: '3\'', hr: '80-90', activity: '教师：口令清晰，情境导入激发兴趣，提出关键问题，明确安全与评价；学生：快静齐集合，认真听讲，进入学习状态', formation: '四列横队' },
        { seq: '准备部分', time: '8\'', content: warm.content, count: '1', itime: '8\'', hr: '100-120', activity: warm.activity, formation: warm.formation },
        { seq: '基本部分一', time: '7\'', content: main[0].content, count: main[0].count, itime: '7\'', hr: '120-140', activity: main[0].activity, formation: main[0].formation },
        { seq: '基本部分二', time: '12\'', content: main[1].content, count: main[1].count, itime: '12\'', hr: '140-160', activity: main[1].activity, formation: main[1].formation },
        { seq: '基本部分三', time: '8\'', content: fitness.content + '；' + (main[2] ? main[2].content : '巩固展示/小组比赛'), count: '2-3', itime: '8\'', hr: '150-170', activity: fitness.activity + (main[2] ? '；' + main[2].activity : ''), formation: fitness.formation },
        { seq: '结束部分', time: '2\'', content: '①放松拉伸：' + this._coolContent(spec) + '；②课堂小结：围绕关键问题回顾；③学生自评互评；④回收器材；⑤布置课后锻炼作业；⑥师生再见', count: '1', itime: '2\'', hr: '90-100', activity: '教师：带领放松，引导学生围绕关键问题总结，布置分层作业；学生：静态拉伸，积极自评互评，整理器材', formation: '散点集合' },
      ],
      resource,
      safety,
      load: { density: '≥55%', avgHR: '135-150次/分', groupDensity: '≥55%', indDensity: '≥45%' },
      reflect: '（课后填写：①目标达成度；②学生参与度与分层目标达成；③运动负荷是否适宜；④关键问题解决情况；⑤改进措施）',
    };
  },
  _keyQuestion(spec, topic) {
    return '本课关键问题：如何在' + topic + '的学练中做到“' + (spec.id === 'track' ? '蹬摆协调、用力顺序正确' : spec.id === 'pingpong' ? '拍面控制与步法移动协调' : '动作规范、安全有效') + '”？';
  },

  _keyDiff(spec, topic) {
    const m = {
      track: { keyPoint: '重点：正确的跑/跳/投基本技术动作（蹬摆协调、重心平稳、安全投掷）', diffPoint: '难点：快速跑动中上下肢协调配合、跳跃起跳蹬摆时机、投掷自下而上发力顺序' },
      pingpong: { keyPoint: '重点：正手攻球/反手推挡的正确拍形、击球时机与击球部位', diffPoint: '难点：步法移动与手法的协调配合，连续击球中的节奏控制' },
      basketball: { keyPoint: '重点：运球手按拍球的后上方，传球准确到位，投篮基本手型', diffPoint: '难点：运球中抬头观察，行进间投篮的步法与出手衔接' },
      gym: { keyPoint: '重点：前滚翻团身紧、支撑跳跃推手快，体操姿态挺拔', diffPoint: '难点：滚翻方向正、推手有力，克服恐惧心理' },
      wushu: { keyPoint: '重点：手型、步型规范，动作路线清晰，精神饱满', diffPoint: '难点：身法、步法、手法的协调配合，体现武术精气神' },
      swim: { keyPoint: '重点：呼吸节奏与蛙泳腿蹬夹动作', diffPoint: '难点：手臂、腿部与呼吸的完整配合' },
      soccer: { keyPoint: '重点：脚内侧传球/脚背正面运球的基本动作', diffPoint: '难点：传球力量、方向控制与跑位意识' },
      volleyball: { keyPoint: '重点：正面双手垫球的手型、击球部位与准备姿势', diffPoint: '难点：移动取位与垫球手臂角度的控制' },
      badminton: { keyPoint: '重点：正手握拍、高远球挥拍轨迹', diffPoint: '难点：步法移动与击球点的空间判断' },
      tennis: { keyPoint: '重点：东方式/半西方式握拍与正手击球动作', diffPoint: '难点：转体发力与击球时机的把握' },
      aerobics: { keyPoint: '重点：健美操基本步伐规范、手臂路线清晰、节奏准确', diffPoint: '难点：上下肢协调配合与动作表现力' },
      dance: { keyPoint: '重点：体育舞蹈基本站位、架型与身体姿态', diffPoint: '难点：双人配合、重心升降与节奏处理' },
      taekwondo: { keyPoint: '重点：基本礼仪、前踢与横踢技术路线', diffPoint: '难点：转髋发力与支撑脚旋转的配合' },
      fencing: { keyPoint: '重点：基本步法、持剑姿势与简单攻防', diffPoint: '难点：距离判断与出手时机的控制' },
      orient: { keyPoint: '重点：地图方位识别、指北针使用与路线选择', diffPoint: '难点：快速决策与野外安全判断' },
      yoga: { keyPoint: '重点：瑜伽基础体式的正位与呼吸配合', diffPoint: '难点：身体控制、专注力与呼吸节奏的统一' },
      pickleball: { keyPoint: '重点：匹克球正反手颠球、击球动作与基本站位', diffPoint: '难点：控制击球力量与落点，网前截击反应' },
      baseball: { keyPoint: '重点：传接球、击球与跑垒的基本方法', diffPoint: '难点：击球时机判断与场上配合意识' },
      fitness: { keyPoint: '重点：力量、速度、灵敏等体能训练方法正确', diffPoint: '难点：科学安排负荷与动作质量监控' },
    };
    return m[spec.id] || { keyPoint: '重点：' + spec.name + '基本动作要领与身体姿态', diffPoint: '难点：动作连贯协调与发力顺序' };
  },

  _warmContent(spec) {
    const m = {
      track: { content: '慢跑400米；动态拉伸（弓步走、侧向弓步、最伟大拉伸）；专项辅助：小步跑30米×2、高抬腿30米×2、后蹬跑30米×2', activity: '教师：领跑并口令指挥，强调动作幅度与呼吸节奏；学生：跟随完成，关节活动充分', formation: '四列横队→一路纵队绕场' },
      pingpong: { content: '慢跑+徒手操；持拍手腕/肩环绕；原地颠球20次×2；托球走10米×2', activity: '教师：示范领做，提示握拍放松；学生：熟悉球性，控制拍面', formation: '四列横队→散点' },
      basketball: { content: '慢跑+球性练习（绕环、拨球）；原地高、低运球各30秒×2；行进间直线运球20米×2', activity: '教师：领做并纠正手型；学生：控制按拍球部位与力量', formation: '四列横队→体操队形' },
      gym: { content: '慢跑；颈/肩/腰/踝环绕；垫上滚动辅助练习（团身抱膝前后滚动3-5次）', activity: '教师：示范保护与帮助方法；学生：体会团身与滚动感觉', formation: '四列横队→体操队形' },
      wushu: { content: '慢跑；武术基本手型/步型练习（拳、掌、勾、弓步、马步、仆步）各8次；正压腿、侧压腿各2×8拍', activity: '教师：口令洪亮，示范标准；学生：精神饱满，动作到位', formation: '四列横队→体操队形' },
      swim: { content: '陆上模仿：蛙泳腿俯卧模仿20次；扶池边打水/呼吸练习；熟悉水性慢跑', activity: '教师：陆上示范，水中分组保护；学生：陆上模仿→水中尝试', formation: '池边集合→分组下水' },
      soccer: { content: '慢跑+动态拉伸；球性练习（脚内侧左右拨球、脚底拉球）各30秒；短距离直线运球20米×2', activity: '教师：示范球性练习，提示触球部位；学生：控制球，抬头观察', formation: '散点→一路纵队' },
      volleyball: { content: '慢跑+肩/腕环绕；原地自传/自垫球各20次；移动步法练习（并步、交叉步）各10米×2', activity: '教师：示范手型与移动步法；学生：固定手型，移动到位', formation: '四列横队→散点' },
      badminton: { content: '慢跑+肩/腕拉伸；握拍练习；原地颠球/高抛低接各20次；步法摸线练习', activity: '教师：检查握拍，示范步法；学生：熟悉球性，启动迅速', formation: '四列横队→散点' },
      tennis: { content: '慢跑+动态拉伸；握拍与挥空拍练习20次；原地颠球/拍球控制练习', activity: '教师：示范东方式握拍与转体挥拍；学生：体会转腰发力', formation: '四列横队→散点' },
      aerobics: { content: '慢跑+关节操；健美操基本步伐组合（踏步、并步、V字步、开合跳）2×8拍×2组；上肢拉伸', activity: '教师：领做并配合口令/音乐；学生：节奏准确，动作到位', formation: '四列横队→体操队形' },
      dance: { content: '慢跑+姿态练习；体育舞蹈基本站位与架型；原地重心升降练习；华尔兹/恰恰基本步慢速练习', activity: '教师：示范架型与升降；学生：保持身体挺拔，配合音乐', formation: '双人成对站位' },
      taekwondo: { content: '慢跑+关节操；基本礼仪练习；前踢/横踢提膝控腿各10秒×2；压腿、踢腿各2×8拍', activity: '教师：强调礼仪与发力顺序；学生：口令响亮，动作有力', formation: '四列横队→体操队形' },
      fencing: { content: '慢跑+肩/腕拉伸；基本持剑姿势保持30秒×2；原地步法（前进、后退、弓步）练习', activity: '教师：示范持剑与步法；学生：姿态端正，重心平稳', formation: '四列横队→二路纵队' },
      orient: { content: '慢跑+动态拉伸；指北针使用方法复习；原地转体定向小游戏（快速指北）', activity: '教师：讲解器材使用，组织游戏；学生：积极参与，巩固识图', formation: '四列横队→分组散点' },
      yoga: { content: '调息静坐2分钟；颈部、肩部、脊柱热身；猫牛式、下犬式动态练习', activity: '教师：语言引导呼吸与动作；学生：专注呼吸，动作舒缓', formation: '散点坐垫' },
      pickleball: { content: '慢跑+关节操；持拍绕环/腕部拉伸；原地正反手颠球各20次；网前步伐移动练习', activity: '教师：示范颠球与网前步伐；学生：控制拍面，脚步灵活', formation: '四列横队→散点' },
      baseball: { content: '慢跑+肩/腕拉伸；抛接球练习（两人一组10米）20次；徒手挥棒模仿15次', activity: '教师：示范传接球手型与挥棒；学生：注意传接稳、挥棒路线正', formation: '四列横队→两人一组' },
      fitness: { content: '慢跑400米；动态拉伸；开合跳、高抬腿各30秒×2；俯卧撑/跪卧撑10次×2', activity: '教师：讲解动作标准与呼吸；学生：控制动作质量，不过度追求速度', formation: '四列横队→体操队形' },
    };
    return m[spec.id] || { content: '慢跑+动态拉伸；专项辅助练习', activity: '教师：领做并提示安全；学生：充分热身', formation: '四列横队→体操队形' };
  },

  _mainContent(spec, topic, no) {
    const m = {
      track: [
        { content: '复习衔接与诱导练习：小步跑→高抬腿→后蹬跑各30米×2组；原地快速摆臂20秒×3组；关键问题“如何让蹬摆更协调？”导入', count: '2-3', activity: '教师：带领复习，分解示范摆臂与蹬地，提出关键问题，个别纠错；学生：积极模仿，体会蹬摆配合，自我对照', formation: '分组同时进行' },
        { content: topic + '新授学练：①教师完整示范1-2次并慢动作分解；②学生无器械/轻器械模仿练习各6-8次；③分组分层完整练习（距离/高度递进）10-12次；④“学练任务卡”自评互评', count: '6-12', activity: '教师：精讲多练，设置A/B/C三层任务，巡回指导，即时反馈；学生：观察→模仿→学练→互相纠错，选择适合难度', formation: '分组/圆圈站位' },
        { content: '巩固运用：小组接力/教学比赛/达标测试（如30米计时、跳远丈量、投掷远度）', count: '3-4', activity: '教师：组织比赛，强调规则与安全，记录成绩，引导学生正确看待胜负；学生：积极参与，遵守规则，为同伴加油', formation: '分组比赛队形' },
      ],
      pingpong: [
        { content: '复习衔接：正反手颠球各30次×2；托球绕台走1圈×2；徒手模仿攻球/推挡动作20次；关键问题“拍面与落点如何控制？”', count: '2-3', activity: '教师：示范并个别纠错；学生：控制拍面与力度，体会动作', formation: '散点' },
        { content: topic + '新授学练：①多球练习（一人供球、一人击球）约5分钟；②两人对练：正手攻球/反手推挡连续20板×3组；③分层任务：初级稳定5板，中级连续15板，高级变化落点', count: '3-5', activity: '教师：巡回指导，提示击球时机、拍形与步法；学生：移动到位，连续击球，互相计数反馈', formation: '两人一张球台' },
        { content: '巩固运用：3分制单打/双打循环赛3-4局', count: '3-4', activity: '教师：裁判与点评；学生：运用技术，尊重对手', formation: '球台分组' },
      ],
      basketball: [
        { content: '复习衔接：原地运球（高、低、变向）各1分钟；两人传接球20次×2；关键问题“如何在移动中保持控制？”', count: '2-3', activity: '教师：纠正手型与用力顺序；学生：抬头观察，传接准确', formation: '散点→两人一组' },
        { content: topic + '新授学练：①教师示范讲解；②原地/行进间分解练习各8-10次；③分组分层练习（如投篮分层：近距离→中距离→接球投篮）；④3对3半场对抗约6分钟', count: '3-5', activity: '教师：精讲多练，设置分层目标，巡回纠错；学生：分组学练，互相配合，选择适合自己的挑战', formation: '分组半场' },
        { content: '巩固运用：5分钟教学比赛2-3场，强调规则与防守脚步', count: '2-3', activity: '教师：组织比赛，及时暂停讲解战术；学生：积极拼抢，遵守规则', formation: '半场/全场分组' },
      ],
      gym: [
        { content: '复习衔接：团身抱膝滚动5-8次；俯卧撑/推小车10次×2；跳箱上一步跳下5次；关键问题“如何保证安全与动作质量？”', count: '2-3', activity: '教师：保护与帮助示范；学生：克服恐惧，动作规范', formation: '体操队形' },
        { content: topic + '新授学练：①完整示范与保护帮助方法讲解；②分解练习各5-8次；③在保护与帮助下完整练习6-10次；④分层挑战：完成→连贯→优美', count: '5-10', activity: '教师：分组保护，强调安全，个别辅导；学生：互帮互学，有序练习，敢于挑战', formation: '分组轮流' },
        { content: '巩固运用：小组展示1次+核心力量（平板支撑、仰卧举腿）各30秒×2', count: '2-3', activity: '教师：点评鼓励，强调动作质量；学生：自信展示，认真完成素质', formation: '分组展示区' },
      ],
      wushu: [
        { content: '复习衔接：手型、步型、手法、腿法各2×8拍；正/侧压腿、踢腿各10次；关键问题“如何体现武术的精气神？”', count: '2-3', activity: '教师：口令指挥，纠正规格；学生：动作到位，发声洪亮', formation: '体操队形' },
        { content: topic + '新授学练：①教师镜面示范1-2次；②分解教动作，学生跟练8-10次；③连贯练习5-8次；④攻防含义讲解与小组互帮', count: '5-10', activity: '教师：镜面示范，讲解攻防含义，纠正劲力；学生：模仿练习，体会劲力，互相提醒', formation: '四列横队→分组' },
        { content: '巩固运用：分组演练→推选代表展示→集体配乐完整演练2次', count: '2-3', activity: '教师：点评精气神与动作规格；学生：自信展示，互相欣赏', formation: '展示队形' },
      ],
      swim: [
        { content: '复习衔接：扶池边呼吸练习20次；漂浮与站立10次；蹬边滑行5次；关键问题“呼吸与动作如何配合？”', count: '2-3', activity: '教师：水中示范与保护；学生：克服怕水心理，按步骤练习', formation: '池边分组' },
        { content: topic + '新授学练：①陆上模仿3分钟；②水中分解练习（如蛙泳腿蹬夹10次×3、手臂划水10次×3）；③配合游15-20米×3；④分层：扶板→徒手→完整配合', count: '3-5', activity: '教师：分组指导，强调安全，个别辅助；学生：循序渐进，互相保护，自我监控', formation: '分道练习' },
        { content: '巩固运用：连续游25米（或力所能及距离）2次；水中安全小游戏', count: '2', activity: '教师：记录进步，强调安全；学生：挑战自我，注意同伴安全', formation: '分道' },
      ],
      soccer: [
        { content: '复习衔接：脚内侧拨球1分钟×2；脚背正面直线运球20米×3；原地脚内侧传球10次×2；关键问题“如何做到抬头观察？”', count: '2-3', activity: '教师：示范触球部位，纠正脚型；学生：控制球，抬头观察', formation: '散点→一路纵队' },
        { content: topic + '新授学练：①教师示范讲解；②两人一组传接球15次×3；③绕杆运球20米×3；④小场地3对3比赛约6分钟', count: '3-5', activity: '教师：设置练习路线，巡回指导，提示跑位；学生：传球准确，积极跑动，互相呼应', formation: '两人一组/小场地' },
        { content: '巩固运用：5人制小场地比赛2-3场，每场5分钟', count: '2-3', activity: '教师：裁判与技战术提示；学生：遵守规则，团队协作', formation: '小场地分组' },
      ],
      volleyball: [
        { content: '复习衔接：徒手垫球模仿20次；自垫球20次×2；两人一组一抛一垫15次×2；关键问题“如何稳定垫球？”', count: '2-3', activity: '教师：检查手型与击球点；学生：手臂夹紧，击球准确', formation: '散点→两人一组' },
        { content: topic + '新授学练：①移动垫球练习（前后左右）各10次；②两人对垫20次×3；③发球练习10次×2；④分层：自垫→对垫→移动垫', count: '3-5', activity: '教师：示范移动步法，设置不同来球，个别辅导；学生：移动到位，稳定垫球，互相鼓励', formation: '两人一组/发球区' },
        { content: '巩固运用：3-4人一组小场地比赛2-3局', count: '2-3', activity: '教师：组织比赛，强调轮转；学生：运用技术，互相鼓励', formation: '小场地分组' },
      ],
      badminton: [
        { content: '复习衔接：原地颠球30次×2；抛球挥拍击打20次；步法摸线5次×2；关键问题“如何控制击球落点？”', count: '2-3', activity: '教师：纠正握拍与挥拍路线；学生：体会拍面控制', formation: '散点' },
        { content: topic + '新授学练：①高远球挥空拍20次；②两人对打高远球约6分钟；③吊球/挑球练习各10次；④分层：原地→移动→变化落点', count: '3-5', activity: '教师：多球喂球，个别纠错；学生：移动击球，控制落点，自我评价', formation: '两人一片场地' },
        { content: '巩固运用：单打/双打教学比赛7分制2-3局', count: '2-3', activity: '教师：裁判与战术提示；学生：积极跑动，尊重对手', formation: '场地分组' },
      ],
      tennis: [
        { content: '复习衔接：拍球控制30次；颠球20次；正反手挥空拍各15次；关键问题“如何借助转体发力？”', count: '2-3', activity: '教师：示范握拍与转体；学生：控制球，动作完整', formation: '散点' },
        { content: topic + '新授学练：①原地正/反手击球练习约6分钟；②隔网对打20次×3；③发球抛球练习10次；④分层：定点击球→移动击球→变化方向', count: '3-5', activity: '教师：喂球指导，强调击球点与转体；学生：移动到位，控制过网', formation: '两人一片场地' },
        { content: '巩固运用：教学比赛短盘2-3局', count: '2-3', activity: '教师：裁判与点评；学生：运用技术，遵守规则', formation: '场地分组' },
      ],
      aerobics: [
        { content: '复习衔接：踏步、并步、V字步、开合跳、吸腿跳各2×8拍；手臂组合练习；关键问题“动作如何与音乐节奏配合？”', count: '2-3', activity: '教师：领做并纠正路线；学生：节奏准确，动作规范', formation: '体操队形' },
        { content: topic + '新授学练：①分段教动作，每段4×8拍，各重复4-6次；②配合音乐完整串联2-3遍；③小组创编4×8拍动作', count: '3-5', activity: '教师：示范讲解，鼓励创编，点评表现力；学生：学练结合，积极表现', formation: '体操队形→分组' },
        { content: '巩固运用：小组展示与互评，依据节奏、力度、表现力打分', count: '1-2', activity: '教师：组织展示，点评亮点；学生：欣赏他人，客观评价', formation: '展示队形' },
      ],
      dance: [
        { content: '复习衔接：姿态与架型练习；基本步原地练习各2×8拍；重心升降练习；关键问题“如何与舞伴配合默契？”', count: '2-3', activity: '教师：个别纠正架型；学生：身体挺拔，配合默契', formation: '双人成对' },
        { content: topic + '新授学练：①教师示范并讲解舞步路线；②双人慢速配合练习；③音乐中完整练习3-5遍；④分层：原地→移动→带音乐', count: '3-5', activity: '教师：播放音乐，提示节奏与配合；学生：关注舞伴，保持架型', formation: '双人成对→绕场' },
        { content: '巩固运用：小组展示，评选最佳配合奖', count: '1-2', activity: '教师：点评配合与表现力；学生：自信展示，礼貌欣赏', formation: '展示队形' },
      ],
      taekwondo: [
        { content: '复习衔接：前踢/横踢提膝控腿10秒×3；步法各10次；踢靶固定路线练习；关键问题“发力顺序是什么？”', count: '2-3', activity: '教师：示范发力顺序；学生：动作规范，发力集中', formation: '体操队形' },
        { content: topic + '新授学练：①分解动作练习各10次；②踢靶/沙袋练习左右各10次×2；③组合动作（前踢+横踢）练习；④分层：空击→踢靶→组合', count: '3-5', activity: '教师：纠正支撑脚与转髋，强调礼仪；学生：互相持靶，注意安全', formation: '两人一组' },
        { content: '巩固运用：小组品势演练或指定攻防练习', count: '2-3', activity: '教师：强调礼仪与控制；学生：尊重对手，点到为止', formation: '分组练习区' },
      ],
      fencing: [
        { content: '复习衔接：前进、后退、弓步各10米×2；持剑姿势保持30秒×2；原地刺靶10次；关键问题“如何控制距离？”', count: '2-3', activity: '教师：示范规范姿势；学生：重心低，移动稳', formation: '二路纵队' },
        { content: topic + '新授学练：①原地刺/劈练习各15次；②移动中简单攻防10次×2；③双人条件实战（指定区域刺中得分）；④分层：原地→移动→对抗', count: '3-5', activity: '教师：强调安全距离与器材使用；学生：轻触即止，遵守规则', formation: '剑道分组' },
        { content: '巩固运用：小组循环赛，每局1分钟，3局', count: '3', activity: '教师：裁判与保护；学生：尊重裁判，礼仪行礼', formation: '剑道分组' },
      ],
      orient: [
        { content: '复习衔接：地图符号识别小测试；指北针定向练习5点；关键问题“如何选择最优路线？”', count: '2-3', activity: '教师：讲解图例与使用方法；学生：小组合作，快速识别', formation: '分组散点' },
        { content: topic + '新授学练：①校园/公园短距离定向（5-8点）练习；②路线选择讨论与复盘；③积分定向挑战；④分层：短距离→长距离→积分赛', count: '2-3', activity: '教师：布点、计时、指导读图；学生：分工协作，快速决策', formation: '分组出发' },
        { content: '巩固运用：成绩汇总与经验分享', count: '1', activity: '教师：引导总结；学生：反思提升', formation: '集合' },
      ],
      yoga: [
        { content: '复习衔接：猫牛式8次；下犬式保持5次呼吸；战士一式左右各保持3次呼吸；关键问题“呼吸如何带动动作？”', count: '1-2', activity: '教师：语言引导呼吸与正位；学生：配合呼吸，不勉强', formation: '散点坐垫' },
        { content: topic + '新授学练：①详细讲解体式正位与进退阶；②学生独立练习并调整；③串联成小序列练习2遍；④分层：辅具→标准→加深', count: '2-3', activity: '教师：个别辅助，提醒呼吸；学生：专注身体感受，尊重极限', formation: '散点坐垫' },
        { content: '巩固运用：平衡体式挑战（树式、战士三式）+同伴保护', count: '2', activity: '教师：强调安全与专注；学生：互相帮助，不攀比', formation: '散点坐垫' },
      ],
      pickleball: [
        { content: '复习衔接：正反手颠球各30次；原地对墙击球20次；网前脚步移动练习；关键问题“如何控制力量与落点？”', count: '2-3', activity: '教师：示范握拍与拍面；学生：控制力量，熟悉球性', formation: '散点→两人一组' },
        { content: topic + '新授学练：①两人对颠/对打约6分钟；②发球练习10次×2；③网前截击练习15次×2；④分层：对颠→隔网→截击', count: '3-5', activity: '教师：分组指导，强调非截击区规则；学生：控制落点，脚步到位', formation: '两人一片场地' },
        { content: '巩固运用：双打11分制教学比赛2-3局', count: '2-3', activity: '教师：裁判与规则讲解；学生：运用技术，配合默契', formation: '场地分组' },
      ],
      baseball: [
        { content: '复习衔接：两人一组10米传接20次；地滚球/高飞球接传各10次；徒手挥棒模仿15次；关键问题“如何做到全身协调发力？”', count: '2-3', activity: '教师：纠正手型与挥棒路线；学生：传接稳，挥棒协调', formation: '两人一组' },
        { content: topic + '新授学练：①掷准/击球练习15次；②跑垒练习3次；③防守站位练习；④分层：徒手→T座→抛击', count: '3-5', activity: '教师：设置练习场景，强调安全；学生：分工练习，轮换体验', formation: '分组轮换' },
        { content: '巩固运用：简化规则比赛2-3局', count: '2-3', activity: '教师：裁判与战术提示；学生：遵守规则，团队协作', formation: '球场分组' },
      ],
      fitness: [
        { content: '复习衔接：深蹲、俯卧撑、弓步、平板支撑各10次/20秒；关键问题“如何科学安排运动负荷？”', count: '1-2', activity: '教师：示范标准动作，强调呼吸；学生：动作规范，量力而行', formation: '体操队形' },
        { content: topic + '新授学练：①讲解动作要领与呼吸；②力量/速度/灵敏循环练习（4-6站点，每站30-45秒，循环2轮）；③心率监测与自我疲劳感知', count: '2-3', activity: '教师：讲解站点任务，监控负荷；学生：按能力选择难度，坚持完成', formation: '循环站点' },
        { content: '巩固运用：1分钟跳绳/仰卧起坐挑战；记录成绩，对比进步', count: '1-2', activity: '教师：计时记录，鼓励突破；学生：挑战自我，科学恢复', formation: '分组测试' },
      ],
    };
    return m[spec.id] || [
      { content: topic + '复习衔接：复习已学技术，提出关键问题导入', count: '2-3', activity: '教师：带领复习，情境导入；学生：积极回忆，进入状态', formation: '分组' },
      { content: topic + '新授学练：示范→分解练习→完整练习→分层任务→互评纠错', count: '3-5', activity: '教师：精讲多练，巡回指导；学生：观察模仿，分组学练', formation: '分组/圆圈站位' },
      { content: '巩固运用：小组展示/教学比赛/达标测试', count: '2-3', activity: '教师：组织评价；学生：积极参与', formation: '分组' },
    ];
  },
  _fitnessContent(spec, stage) {
    const base = {
      track: { content: '体能训练：核心力量（平板支撑30秒×2、仰卧举腿10次×2）+下肢力量（弓步蹲/深蹲15次×2）+速度灵敏（折返跑5米×3次×2）', activity: '教师：讲解动作标准与负荷，强调动作质量；学生：按能力选择难度，认真完成，记录心率', formation: '体操队形→分组轮换' },
      pingpong: { content: '体能训练：手腕肩环绕+原地快速小步跑30秒×2+侧向移动摸线10次×2+平板支撑30秒×2', activity: '教师：结合乒乓球移动特点设计；学生：控制节奏，体会专项体能', formation: '体操队形' },
      basketball: { content: '体能训练：滑步防守30秒×2+原地纵跳摸高8次×2+折返跑5-10-5×2+核心（登山者30秒×2）', activity: '教师：结合篮球防守与弹跳需求；学生：全力以赴，注意落地缓冲', formation: '半场分组' },
      gym: { content: '体能训练：俯卧撑/跪卧撑10次×2+仰卧举腿10次×2+背起12次×2+静力控腿20秒×2', activity: '教师：强调核心与肩带力量；学生：动作规范，保护腰椎', formation: '体操队形' },
      wushu: { content: '体能训练：正踢腿/里合腿各10次×2+马步静力30秒×2+俯卧撑10次×2+柔韧压腿', activity: '教师：结合武术柔韧与力量需求；学生：发力集中，呼吸配合', formation: '体操队形' },
      swim: { content: '体能训练：池边俯卧撑10次×2+仰卧收腹举腿10次×2+扶池边打腿30秒×2', activity: '教师：结合游泳专项力量；学生：注意呼吸，不逞强', formation: '池边' },
      soccer: { content: '体能训练：原地高抬腿30秒×2+侧向滑步30秒×2+单脚平衡20秒×2+核心（死虫式10次×2）', activity: '教师：结合足球移动与控球需求；学生：控制身体，避免碰撞', formation: '散点' },
      volleyball: { content: '体能训练：原地纵跳8次×2+侧向移动摸线10次×2+肩带力量（面拉/YTWL）15次×2+平板支撑30秒×2', activity: '教师：结合排球弹跳与肩带需求；学生：注意落地与肩袖保护', formation: '体操队形' },
      badminton: { content: '体能训练：前后左右步法移动各10次×2+原地快速跳绳1分钟×2+侧桥30秒×2+手腕肩环绕', activity: '教师：结合羽毛球步法与爆发力；学生：保持低重心，动作敏捷', formation: '场地分组' },
      tennis: { content: '体能训练：侧向移动摸线10次×2+原地纵跳8次×2+药球/实心球转体10次×2+平板支撑30秒×2', activity: '教师：结合网球移动与旋转发力；学生：控制重心，转体发力', formation: '场地分组' },
      aerobics: { content: '体能训练：开合跳30秒×2、高抬腿30秒×2、俯卧撑10次×2、仰卧卷腹15次×2、拉伸', activity: '教师：配合音乐节奏；学生：动作有力，节奏准确', formation: '体操队形' },
      dance: { content: '体能训练：姿态站立1分钟×2+小腿提踵20次×2+核心（平板支撑30秒×2）+柔韧拉伸', activity: '教师：结合舞蹈姿态与核心稳定；学生：保持挺拔，控制呼吸', formation: '双人成对' },
      taekwondo: { content: '体能训练：提膝控腿20秒×2+快速踢腿20次×2+俯卧撑10次×2+核心（仰卧举腿10次×2）', activity: '教师：结合跆拳道踢腿与核心需求；学生：动作有力，注意保护', formation: '体操队形' },
      fencing: { content: '体能训练：弓步静力20秒×2+前后快速移动30秒×2+核心（侧桥30秒×2）+手腕力量', activity: '教师：结合击剑下肢与核心需求；学生：保持低重心，稳定持剑', formation: '剑道分组' },
      orient: { content: '体能训练：原地高抬腿30秒×2+折返跑5-10-5×2+核心（登山者30秒×2）+下肢拉伸', activity: '教师：结合定向奔跑与变向需求；学生：注意安全，控制节奏', formation: '分组散点' },
      yoga: { content: '体能训练：平板支撑30秒×2+船式保持15秒×2+臀桥15次×2+仰卧放松', activity: '教师：结合瑜伽核心与稳定需求；学生：配合呼吸，不强迫', formation: '散点坐垫' },
      pickleball: { content: '体能训练：前后移动摸线10次×2+侧向滑步30秒×2+原地快速小步跑30秒×2+核心（俄罗斯转体15次×2）', activity: '教师：结合匹克球网前移动需求；学生：脚步灵活，控制重心', formation: '场地分组' },
      baseball: { content: '体能训练：投掷臂肩环绕+药球/实心球转体10次×2+弓步蹲15次×2+折返跑5米×3次×2', activity: '教师：结合棒垒球投掷与跑动需求；学生：注意发力顺序，避免受伤', formation: '分组轮换' },
      fitness: { content: '体能训练：TABATA组合（深蹲、俯卧撑、开合跳、登山者各20秒，间歇10秒，2轮）', activity: '教师：带领节奏，监控心率；学生：量力而行，记录疲劳感', formation: '循环站点' },
    };
    return base[spec.id] || { content: '体能训练：开合跳、深蹲、平板支撑、弓步蹲各30秒/12次×2', activity: '教师：讲解动作要领；学生：按能力完成', formation: '体操队形' };
  },

  _coolContent(spec) {
    const m = {
      track: '慢走+下肢静态拉伸（股四头、腘绳、小腿）',
      pingpong: '肩/腕拉伸+呼吸调整',
      basketball: '慢走+下肢拉伸',
      gym: '垫上放松拉伸',
      wushu: '整理运动+下肢拉伸',
      swim: '慢游放松+呼吸调整',
      soccer: '慢走+下肢拉伸',
      volleyball: '肩/臂拉伸',
      badminton: '肩/臂/腿拉伸',
      tennis: '全身静态拉伸',
      aerobics: '拉伸组合+呼吸调整',
      dance: '慢走+双人拉伸',
      taekwondo: '整理运动+压腿放松',
      fencing: '慢走+握剑臂拉伸',
      orient: '慢走+腿部拉伸',
      yoga: '仰卧放松术（Savasana）',
      pickleball: '肩/臂/腿拉伸',
      baseball: '慢走+投掷臂拉伸',
      fitness: '全身静态拉伸+深呼吸',
    };
    return m[spec.id] || '全身静态拉伸';
  },

  _resource(spec) {
    const m = {
      track: '田径场、起跑器、标志桶、秒表、皮尺、垒球/铅球/标枪、跳高架、海绵垫、音响',
      pingpong: '乒乓球台、乒乓球拍、乒乓球、多球筐、捡球器、计分牌',
      basketball: '篮球场、篮球、标志桶、秒表、音响',
      gym: '体操垫、跳箱、踏板、海绵垫、保护与帮助腰带、音响',
      wushu: '武术垫、音响、多媒体（示范视频）',
      swim: '游泳池、救生浮标、打水板、浮背、哨子',
      soccer: '足球场、足球、标志桶、标志盘、球门、口哨',
      volleyball: '排球场、排球、排球网、标志杆',
      badminton: '羽毛球场地、羽毛球拍、羽毛球、球网',
      tennis: '网球场、网球拍、网球、球网、捡球器',
      aerobics: '健美操房/体育馆、音响、多媒体、瑜伽垫',
      dance: '舞蹈房/体育馆、音响、多媒体',
      taekwondo: '跆拳道垫、脚靶、沙袋、护具、音响',
      fencing: '剑道、佩剑/花剑、面罩、护具、电子裁判器（可选）',
      orient: '校园/公园场地、定向地图、指北针、打卡器/点标旗',
      yoga: '瑜伽垫、瑜伽砖、伸展带、音响、香薰（可选）',
      pickleball: '匹克球场地/羽毛球场地、匹克球拍、匹克球、球网',
      baseball: '棒垒球场、手套、球棒、垒球、安全帽、标志桶',
      fitness: '体育馆、哑铃、跳绳、标志桶、秒表、心率带/运动手环、音响',
    };
    return m[spec.id] || spec.name + '场地器材、标志桶、秒表、音响、多媒体设备';
  },

  _safety(spec) {
    const m = {
      track: '充分热身；跑道分道练习避免碰撞；投掷项目设置安全区并统一捡器材；跳高/跳远检查沙坑与助跑区；关注体弱学生',
      pingpong: '检查球台边角；禁止挥拍打闹；拾球时注意周围同学',
      basketball: '充分热身；保持间距防碰撞；篮下争抢注意保护；检查篮球气压',
      gym: '严格保护与帮助制度；一人练习一人保护；跳箱/支撑跳跃按顺序进行；身体不适立即停止',
      wushu: '保持安全间距；器械（刀/枪）使用前检查；对练点到为止；身体不适报告',
      swim: '下水前淋浴；遵守泳池安全规定；不会游泳者佩戴浮具；教师全程岸上/水中保护',
      soccer: '充分热身；禁止铲球；注意脚下；穿运动鞋禁止穿钉鞋伤人',
      volleyball: '保持间距；发球/扣球时注意前方无人；手臂有伤适度参与',
      badminton: '检查拍线；禁止随意挥拍；注意前后左右间距',
      tennis: '检查拍线；发球时注意对方准备；捡球时注意安全',
      aerobics: '充分热身；注意地面平整；动作幅度循序渐进；心脏不适者减量',
      dance: '保持间距；旋转时注意周围；身体不适及时报告',
      taekwondo: '穿戴护具；对练控制力度；踢靶时持靶者规范；身体不适停止',
      fencing: '必须佩戴面罩与护具；剑尖朝下行走；点到为止，禁止危险动作',
      orient: '提前踩点排除危险区域；分组行动；携带通讯设备；遵守交通规则',
      yoga: '量力而行，不强迫体式；关节有伤者告知教师；使用辅具保护',
      pickleball: '检查拍面；注意非截击区规则；禁止挥拍打闹',
      baseball: '必须在指定区域击球；跑垒注意来往球棒；佩戴头盔；统一发令',
      fitness: '动作标准优先于速度；负荷循序渐进；关注心率与主观疲劳；身体不适立即停止',
    };
    return m[spec.id] || '充分热身；保持间距防碰撞；器材安全检查；关注体弱与不适学生，及时处置';
  },

  _lessonHTML(lp) {
    let h = `<div class="card"><h2>课时计划</h2><table class="lp">
      <tr><th>学校</th><td colspan="5">${App.util.esc(lp.school)}</td></tr>
      <tr><th>年级</th><td>${App.util.esc(lp.grade)}</td><th>班级</th><td>${App.util.esc(lp.cls)}</td><th>人数</th><td>${lp.num}</td></tr>
      <tr><th>执教</th><td>${App.util.esc(lp.teacher)}</td><th>组班形式</th><td>${App.util.esc(lp.orgForm)}</td><th>周次</th><td>第${lp.week}周</td></tr>
      <tr><th>第几课时</th><td>${lp.no}</td><th>日期</th><td>${lp.date}</td><th>专项</th><td>${App.util.esc(lp.spec)}</td></tr>
      <tr><th>内容主题</th><td colspan="5">${App.util.esc(lp.topic)}</td></tr>
      <tr><th>学习目标<br>（三核心素养）</th><td colspan="5">运动能力：${App.util.esc(lp.goals.运动能力)}<br>健康行为：${App.util.esc(lp.goals.健康行为)}<br>体育品德：${App.util.esc(lp.goals.体育品德)}</td></tr>
      <tr><th>重点</th><td colspan="5">${App.util.esc(lp.keyPoint)}</td></tr>
      <tr><th>难点</th><td colspan="5">${App.util.esc(lp.diffPoint)}</td></tr>
      <tr><th>关键问题</th><td colspan="5">${App.util.esc(lp.keyQuestion)}</td></tr></table></div>`;
    h += `<div class="card"><h2>课的部分与内容</h2><table class="lp">
      <tr><th rowspan="2">课序</th><th rowspan="2">时间</th><th rowspan="2">课的内容</th><th colspan="3">运动负荷（个体）</th><th rowspan="2">教与学活动</th><th rowspan="2">组织与队形</th></tr>
      <tr><th>次数</th><th>时间</th><th>心率</th></tr>` +
      lp.structure.map((s) => `<tr><td>${s.seq}</td><td>${s.time}</td><td>${App.util.esc(s.content)}</td><td>${s.count}</td><td>${s.itime}</td><td>${s.hr}</td><td>${App.util.esc(s.activity)}</td><td>${App.util.esc(s.formation)}</td></tr>`).join('') +
      `</table></div>`;
    h += `<div class="card"><h2>资源支持 / 安全保障 / 预计运动负荷 / 课后反思</h2>
      <p><b>资源支持：</b>${App.util.esc(lp.resource)}</p><p><b>安全保障：</b>${App.util.esc(lp.safety)}</p>
      <p><b>预计运动负荷：</b>运动密度 ${App.util.esc(lp.load.density)}；平均心率 ${App.util.esc(lp.load.avgHR)}；群体运动密度 ${App.util.esc(lp.load.groupDensity)}；个体运动密度 ${App.util.esc(lp.load.indDensity)}</p>
      <p><b>课后反思：</b>${App.util.esc(lp.reflect)}</p></div>`;
    return h;
  },

  /* ---------- 导出 Word（.doc，Word/WPS 可直接打开） ---------- */
  _export(p) {
    let body = '';
    if (p.kind === 'unit') {
      const d = p.data;
      body = `<h1>${d.name}</h1>
        <h2>一、单元基本信息</h2>
        <table border="1" cellspacing="0" cellpadding="6"><tr><th>学科</th><td>体育与健康</td><th>学段/年级</th><td>${d.grade}</td></tr>
        <tr><th>单元名称</th><td colspan="3">${d.spec}</td></tr><tr><th>总课时</th><td>${d.total}</td><th>设计者</th><td>你的姓名（上师大青浦附中）</td></tr></table>
        <h2>二、单元问题链</h2><p><b>单元基本问题：</b>${d.basicQ}</p><ol>${d.keyQs.map((q) => `<li>${q}</li>`).join('')}</ol>
        <p><b>跨学科主题：</b>${d.inter.subject || '体育与健康'}</p>
        <p><b>跨学科链接：</b></p><ul><li>进程一：${d.inter.stage1}</li><li>进程二：${d.inter.stage2}</li><li>进程三：${d.inter.stage3}</li></ul>
        <h2>三、单元学习进程</h2>${d.procs.map((pr) => `<h3>${pr.name}</h3><table border="1" cellspacing="0" cellpadding="6">
          <tr><th>课时</th><td colspan="3">${pr.lessons.map((l) => l.title).join(' / ')}</td></tr>
          <tr><th>运动能力</th><td colspan="3">${pr.goals.运动能力}</td></tr>
          <tr><th>健康行为</th><td colspan="3">${pr.goals.健康行为}</td></tr>
          <tr><th>体育品德</th><td colspan="3">${pr.goals.体育品德}</td></tr>
          <tr><th>主要内容</th><td colspan="3">${pr.lessons.map((l) => l.title).join('、')}</td></tr>
          <tr><th>学习活动与评价</th><td colspan="3"><pre>${pr.act}</pre></td></tr></table>`).join('')}
        <h2>四、课时安排（${d.sched.length}）</h2><table border="1" cellspacing="0" cellpadding="6"><tr><th>序号</th><th>课时内容</th></tr>
        ${d.sched.map((s) => `<tr><td>${s.no}</td><td>${s.title}</td></tr>`).join('')}</table>`;
    } else {
      const d = p.data;
      body = `<h1>上海市**学校《体育与健康》课时计划</h1><table border="1" cellspacing="0" cellpadding="6">
        <tr><th>年级</th><td>${d.grade}</td><th>班级</th><td>${d.cls}</td><th>人数</th><td>${d.num}</td></tr>
        <tr><th>执教</th><td>${d.teacher}</td><th>组班形式</th><td>${d.orgForm}</td><th>周次</th><td>第${d.week}周</td></tr>
        <tr><th>第几课时</th><td>${d.no}</td><th>日期</th><td>${d.date}</td><th>专项</th><td>${d.spec}</td></tr>
        <tr><th>内容主题</th><td colspan="5">${d.topic}</td></tr>
        <tr><th>学习目标（三核心素养）</th><td colspan="5">运动能力：${d.goals.运动能力}<br>健康行为：${d.goals.健康行为}<br>体育品德：${d.goals.体育品德}</td></tr>
        <tr><th>重点</th><td colspan="5">${d.keyPoint}</td></tr>
        <tr><th>难点</th><td colspan="5">${d.diffPoint}</td></tr>
        <tr><th>关键问题</th><td colspan="5">${d.keyQuestion}</td></tr></table>
        <h2>课的部分与内容（40分钟）</h2><table border="1" cellspacing="0" cellpadding="6">
        <tr><th rowspan="2">课序</th><th rowspan="2">时间</th><th rowspan="2">课的内容</th><th colspan="3">运动负荷（个体）</th><th rowspan="2">教与学活动</th><th rowspan="2">组织与队形</th></tr>
        <tr><th>次数</th><th>时间</th><th>心率</th></tr>
        ${d.structure.map((s) => `<tr><td>${s.seq}</td><td>${s.time}</td><td>${s.content}</td><td>${s.count}</td><td>${s.itime}</td><td>${s.hr}</td><td>${s.activity}</td><td>${s.formation}</td></tr>`).join('')}
        </table>
        <h2>资源支持 / 安全保障 / 预计运动负荷 / 课后反思</h2>
        <p><b>资源支持：</b>${d.resource}</p><p><b>安全保障：</b>${d.safety}</p>
        <p><b>预计运动负荷：</b>运动密度 ${d.load.density}；平均心率 ${d.load.avgHR}；群体运动密度 ${d.load.groupDensity}；个体运动密度 ${d.load.indDensity}</p>
        <p><b>课后反思：</b>${d.reflect}</p>`;
    }
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${p.name}</title>
      <style>body{font-family:"Microsoft YaHei",sans-serif;color:#333}h1{color:#ff4f93}h2{color:#ff4f93;border-bottom:2px solid #ffd9e8;padding-bottom:4px}table{border-collapse:collapse;width:100%;margin-bottom:10px}th,td{border:1px solid #ccc;padding:6px;font-size:13px}th{background:#fff0f6;text-align:left}pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body>${body}</body></html>`;
    App.util.download(p.name + '.doc', html, 'application/msword');
  },
});
