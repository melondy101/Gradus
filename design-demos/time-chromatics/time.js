(() => {
  const toast = document.querySelector('.toast');
  const modal = document.querySelector('.preview-modal');
  let timer;
  const notify = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('show'), 2400);
  };
  const openModal = (title, description) => {
    if (!modal) return;
    modal.querySelector('h2').textContent = title;
    modal.querySelector('p').textContent = description;
    modal.classList.add('open');
    modal.querySelector('[data-close]')?.focus();
  };
  const closeModal = () => modal?.classList.remove('open');
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  modal?.addEventListener('click', (event) => {
    if (event.target === modal || event.target.closest('[data-close]')) closeModal();
  });

  document.querySelectorAll('[data-plan]').forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      openModal(card.dataset.plan, card.dataset.description);
    });
  });

  const levelNames = {1:'识记',2:'理解',3:'应用',4:'分析',5:'评价',6:'创造'};
  const levelDescriptions = {
    1:'辨认、回忆与复述。先让知识留下可靠的坐标，再进入理解。',
    2:'解释、举例与归纳。能用自己的话讲明白，才算真正读懂。',
    3:'练习、迁移与使用。把理解放进具体情境，完成一次真实动作。',
    4:'拆解、比较与归因。看清知识之间的关系，也看清错误来自哪里。',
    5:'判断、评价与修正。根据标准做取舍，让答案经得起检验。',
    6:'组合、设计与创造。把学过的内容变成属于自己的新作品。'
  };
  let selectedLevel = 'all';
  const updateOverall = () => {
    const tasks = [...document.querySelectorAll('[data-step-task]')];
    if (!tasks.length) return;
    const done = tasks.filter((task) => task.classList.contains('done')).length;
    const pct = Math.round(done / tasks.length * 100);
    document.getElementById('completed-total').textContent = done;
    document.getElementById('overall-pct').textContent = `${pct}%`;
    document.getElementById('overall-copy').textContent = `已完成 ${pct}% 攀登里程`;
    document.getElementById('overall-ring').style.setProperty('--pct', pct);
  };
  document.querySelectorAll('[data-level].level-card').forEach((button) => {
    button.addEventListener('click', () => {
      selectedLevel = selectedLevel === button.dataset.level ? 'all' : button.dataset.level;
      document.querySelectorAll('.level-card').forEach((card) => card.classList.toggle('active', card === button && selectedLevel !== 'all'));
      document.querySelectorAll('[data-step-task]').forEach((task) => {
        task.style.display = selectedLevel === 'all' || task.dataset.level === selectedLevel ? '' : 'none';
      });
      const all = selectedLevel === 'all';
      document.getElementById('level-number').textContent = all ? 'ALL' : `L${selectedLevel}`;
      document.getElementById('level-name').textContent = all ? '全阶任务' : `${levelNames[selectedLevel]}之阶`;
      document.getElementById('level-description').textContent = all ? '从基础识记到终极创造，把宏大目标拆成步步攀升的可行阶梯。再次点击已选台阶可返回全部。' : levelDescriptions[selectedLevel];
      document.getElementById('task-list-title').textContent = all ? '全阶任务清单' : `阶梯 ${selectedLevel} · ${levelNames[selectedLevel]}任务清单`;
      notify(all ? '已显示全部认知层级' : `已筛选 L${selectedLevel} ${levelNames[selectedLevel]}任务`);
    });
  });
  document.querySelectorAll('[data-step-check]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const task = button.closest('[data-step-task]');
      task.classList.toggle('done');
      updateOverall();
      notify(`${task.dataset.stepTask} · ${task.classList.contains('done') ? '已完成' : '已恢复'}`);
    });
  });
  document.querySelectorAll('[data-step-task]').forEach((task) => {
    task.addEventListener('click', () => openModal(task.dataset.stepTask, `${task.querySelector('p').textContent}。${task.querySelector('.meta').textContent}。点击复选框可切换完成状态。`));
  });

  const ganttTasks = [
    {title:'助词用法自测',plan:'日语 N3',level:2,start:0,duration:2},
    {title:'被动与使役辨析',plan:'日语 N3',level:3,start:2,duration:3},
    {title:'高频词遮义自测',plan:'日语 N3',level:1,start:2,duration:2},
    {title:'列表与字典整理',plan:'Python 数据分析',level:2,start:0,duration:2},
    {title:'缺失值清洗',plan:'Python 数据分析',level:4,start:3,duration:3},
    {title:'趋势图轴标签',plan:'Python 数据分析',level:4,start:5,duration:2},
    {title:'第三章观点标记',plan:'每周阅读',level:2,start:0,duration:3},
    {title:'第四章问题记录',plan:'每周阅读',level:3,start:2,duration:2},
    {title:'模拟测验限时训练',plan:'日语 N3',level:5,start:9,duration:2},
    {title:'看板结构与结论',plan:'Python 数据分析',level:6,start:10,duration:3},
    {title:'错题原因分类',plan:'日语 N3',level:5,start:12,duration:1}
  ];
  const colors = {1:'#789888',2:'#b8a65d',3:'#cc8438',4:'#b7432f',5:'#a45b46',6:'#344c67'};
  const header = document.getElementById('gantt-header');
  const body = document.getElementById('gantt-body');
  if (header && body) {
    const start = new Date(2026, 9, 26);
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(start); date.setDate(start.getDate() + i);
      const cell = document.createElement('div');
      cell.className = i === 5 ? 'today' : '';
      cell.innerHTML = `${date.getMonth()+1}/${date.getDate()}<br><span>${['周日','周一','周二','周三','周四','周五','周六'][date.getDay()]}</span>`;
      header.appendChild(cell);
    }
    ganttTasks.forEach((task) => {
      const row = document.createElement('div');
      row.className = 'gantt-row';
      row.dataset.plan = task.plan;
      row.innerHTML = `<div class="gantt-label"><b>${task.title}</b><span>${task.plan} · ${task.duration} 天</span></div>`;
      for (let day = 0; day < 14; day += 1) {
        const cell = document.createElement('div');
        cell.className = `day-cell${day === 5 ? ' today' : ''}`;
        if (day === task.start) {
          const bar = document.createElement('button');
          bar.className = `gantt-bar${task.level < 4 ? ' light' : ''}`;
          bar.style.setProperty('--level-color', colors[task.level]);
          bar.style.width = `calc(${task.duration * 100}% + ${task.duration - 1}px)`;
          bar.textContent = `${task.title} · L${task.level}`;
          bar.addEventListener('click', () => openModal(task.title, `${task.plan} · L${task.level} ${levelNames[task.level]} · 持续 ${task.duration} 天。当前为时间色谱视觉预览。`));
          cell.appendChild(bar);
        }
        row.appendChild(cell);
      }
      body.appendChild(row);
    });
  }
  document.querySelector('[data-plan-filter]')?.addEventListener('change', (event) => {
    const value = event.target.value;
    let visible = 0;
    document.querySelectorAll('.gantt-row').forEach((row) => {
      const show = value === 'all' || row.dataset.plan === value;
      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });
    document.getElementById('timeline-count').textContent = `时间轴 ${visible} 项子任务 · 14 天`;
    notify(value === 'all' ? '已显示全部计划' : `已筛选「${value}」`);
  });
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item === button));
      notify(`已切换至${button.dataset.view}视图 · 当前展示甘特视觉样例`);
    });
  });
  document.querySelectorAll('[data-range]').forEach((button) => {
    button.addEventListener('click', () => {
      const label = document.querySelector('.range-label');
      if (button.dataset.range === 'prev') label.textContent = '10 月 12 日 — 10 月 25 日';
      if (button.dataset.range === 'next') label.textContent = '11 月 9 日 — 11 月 22 日';
      if (button.dataset.range === 'today') label.textContent = '10 月 26 日 — 11 月 8 日';
      notify(button.dataset.range === 'today' ? '已回到当前周期' : '周期标签已切换 · 色条保留当前视觉样例');
    });
  });
})();
