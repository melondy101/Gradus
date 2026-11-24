(() => {
  const toast = document.querySelector(".toast");
  let toastTimer;
  let activeTask = null;
  const notify = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  };

  const style = document.createElement("style");
  style.textContent = `
    .proto-backdrop{position:fixed;inset:0;background:#07100dcc;backdrop-filter:blur(6px);z-index:100;display:none;place-items:center;padding:22px}
    .proto-backdrop.open{display:grid}
    .proto-dialog{width:min(520px,100%);background:#f5f2e9;color:#191a17;border:1px solid #191a17;box-shadow:10px 10px 0 #72f4d0;padding:26px;font-family:Arial,"Microsoft YaHei",sans-serif}
    .proto-dialog .proto-kicker{font:10px monospace;letter-spacing:2px;color:#65665f}
    .proto-dialog h2{font-size:23px;line-height:1.4;margin:14px 0 8px}
    .proto-dialog .proto-state{font-size:12px;color:#6b6c64;margin-bottom:22px}
    .proto-levels{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:18px 0 24px}
    .proto-levels span{font:9px monospace;text-align:center;color:#74766e}
    .proto-levels i{display:block;height:7px;background:#d5d2c8;margin-bottom:7px}
    .proto-levels span.reached i{background:#623cea}
    .proto-dialog .proto-actions{display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid #bbb8ae;padding-top:18px}
    .proto-dialog button{border:1px solid #191a17;background:#191a17;color:#fff;padding:10px 13px;font-size:11px;cursor:pointer}
    .proto-dialog button.secondary{background:transparent;color:#191a17}
    .proto-dialog button:hover{transform:translateY(-1px)}
    [data-task]{position:relative}
    [data-task] .num,[data-task] .check{cursor:pointer}
  `;
  document.head.appendChild(style);

  const backdrop = document.createElement("div");
  backdrop.className = "proto-backdrop";
  backdrop.innerHTML = `
    <section class="proto-dialog" role="dialog" aria-modal="true" aria-labelledby="proto-title">
      <div class="proto-kicker">TASK DETAIL / 认知阶梯</div>
      <h2 id="proto-title"></h2>
      <div class="proto-state"></div>
      <div class="proto-levels" aria-label="Bloom 认知层级">
        <span><i></i>L1 记忆</span><span class="reached"><i></i>L2 理解</span>
        <span class="reached"><i></i>L3 应用</span><span class="reached"><i></i>L4 分析</span>
        <span><i></i>L5 评价</span><span><i></i>L6 创造</span>
      </div>
      <div class="proto-actions">
        <button data-modal-toggle>标记完成</button>
        <button class="secondary" data-modal-postpone>顺延一天</button>
        <button class="secondary" data-modal-skip>跳过本次</button>
        <button class="secondary" data-modal-close>关闭</button>
      </div>
    </section>`;
  document.body.appendChild(backdrop);

  const openTask = (task) => {
    activeTask = task;
    backdrop.querySelector("h2").textContent = task.querySelector("h3")?.textContent || "学习任务";
    backdrop.querySelector(".proto-state").textContent = task.querySelector("p")?.textContent || "今日学习";
    backdrop.querySelector("[data-modal-toggle]").textContent = task.classList.contains("done") ? "恢复待完成" : "标记完成";
    backdrop.classList.add("open");
    backdrop.querySelector("[data-modal-toggle]").focus();
  };
  const closeTask = () => {
    backdrop.classList.remove("open");
    activeTask = null;
  };
  const toggleTask = (task) => {
    task.classList.toggle("done");
    task.classList.remove("skipped");
    const state = task.classList.contains("done") ? "已完成，向上一阶" : "已恢复为待完成";
    notify(`${task.querySelector("h3")?.textContent || "任务"} · ${state}`);
  };

  document.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-filter]");
    if (filter) {
      const pending = filter.dataset.filter === "pending";
      document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button === filter));
      document.querySelectorAll("[data-task]").forEach((task) => {
        task.style.display = pending && task.classList.contains("done") ? "none" : "";
      });
      notify(pending ? "已收起完成任务，只保留今天要做的事" : "已显示今日全部任务");
      return;
    }
    const apply = event.target.closest("[data-apply]");
    if (apply) {
      apply.textContent = "✓ 已应用";
      apply.classList.add("applied");
      apply.disabled = true;
      notify("修订已应用，后续排期已同步更新");
      return;
    }
    const later = event.target.closest("[data-later]");
    if (later) {
      later.textContent = "已稍后";
      later.disabled = true;
      notify("这条建议已保留到稍后处理");
      return;
    }
    const tab = event.target.closest("[data-tab]");
    if (tab) {
      const group = tab.parentElement;
      if (group) group.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button === tab));
      notify(`${tab.dataset.tab} · 视觉原型已响应`);
      return;
    }
    const task = event.target.closest("[data-task]");
    if (task) {
      if (event.target.closest(".check,.num")) toggleTask(task);
      else openTask(task);
    }
  });

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop || event.target.closest("[data-modal-close]")) closeTask();
    if (!activeTask) return;
    if (event.target.closest("[data-modal-toggle]")) {
      toggleTask(activeTask);
      closeTask();
    }
    if (event.target.closest("[data-modal-postpone]")) {
      const state = activeTask.querySelector("p");
      if (state) state.textContent = "已顺延 · 明天 20:30";
      notify("任务已顺延一天，后续计划已自动接续");
      closeTask();
    }
    if (event.target.closest("[data-modal-skip]")) {
      activeTask.classList.add("done");
      const state = activeTask.querySelector("p");
      if (state) state.textContent = "已跳过 · 不计入本周完成率";
      notify("本次已跳过，可在任务详情中恢复");
      closeTask();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTask();
  });

  document.querySelectorAll("[data-goal-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("[data-goal-input]");
      const button = form.querySelector("[data-goal-submit]");
      const goal = input?.value.trim();
      if (!goal) {
        input?.focus();
        notify("先写下一个具体目标，AI 才能开始拆解");
        return;
      }
      const original = button.textContent;
      button.textContent = "分析中…";
      button.disabled = true;
      setTimeout(() => {
        button.textContent = "✓ 已生成";
        notify(`已为「${goal}」生成 6 阶认知计划`);
        setTimeout(() => {
          button.textContent = original;
          button.disabled = false;
          input.value = "";
        }, 1800);
      }, 700);
    });
  });
})();
