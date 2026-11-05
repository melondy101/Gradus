(() => {
  const toast = document.querySelector(".toast");
  let toastTimer;
  const notify = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
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
      task.classList.toggle("done");
      const state = task.classList.contains("done") ? "已完成，向上一阶" : "已恢复为待完成";
      const title = task.querySelector("h3")?.textContent || "任务";
      notify(`${title} · ${state}`);
    }
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
