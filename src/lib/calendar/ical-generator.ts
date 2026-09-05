import type { SubtaskWithTask } from "@/lib/db/queries/tasks";

export interface IcalOptions {
  startHour?: number; // 默认 20 (即 20:00)
  startMinute?: number; // 默认 0
  includeCompleted?: boolean; // 是否包含已完成的任务
  includeReviews?: boolean; // 是否包含艾宾浩斯复习提醒
  reminderMinutes?: number; // 提前提醒分钟数，默认 15 (0 为不提醒)
  calendarName?: string;
  baseUrl?: string;
}

const BLOOM_LEVEL_NAMES: Record<number, string> = {
  1: "识记 (Remember)",
  2: "理解 (Understand)",
  3: "应用 (Apply)",
  4: "分析 (Analyze)",
  5: "评价 (Evaluate)",
  6: "创造 (Create)",
};

/**
 * 将 Date 对象格式化为 iCalendar 规范的 UTC 或本地时间格式：YYYYMMDDTHHmmss
 */
function formatIcsDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * 将 Date 对象格式化为 iCalendar UTC 时间：YYYYMMDDTHHmmssZ
 */
function formatIcsUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * 转义 iCalendar 文本特殊字符
 */
function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * 解析 resources JSON 字符串为可读文本
 */
function parseResourcesText(resourcesJson?: string | null): string {
  if (!resourcesJson) return "";
  try {
    const list = JSON.parse(resourcesJson);
    if (!Array.isArray(list) || list.length === 0) return "";

    const lines: string[] = ["\\n📚 推荐学习资源:"];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const title = item.title || item.name || "参考资料";
      const url = item.url || (item.searchQuery ? `https://www.google.com/search?q=${encodeURIComponent(item.searchQuery)}` : "");
      if (url) {
        lines.push(`${i + 1}. ${title}: ${url}`);
      } else {
        lines.push(`${i + 1}. ${title}`);
      }
    }
    return lines.join("\\n");
  } catch {
    return "";
  }
}

/**
 * 根据子任务列表生成标准 RFC 5545 iCalendar (.ics) 字符串
 */
export function generateIcalString(
  subtasks: SubtaskWithTask[],
  options: IcalOptions = {}
): string {
  const {
    startHour = 20,
    startMinute = 0,
    includeCompleted = true,
    includeReviews = true,
    reminderMinutes = 15,
    calendarName = "拾级 · 学习规划",
    baseUrl = "https://talk-task.vercel.app",
  } = options;

  const now = new Date();
  const nowUtc = formatIcsUtc(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//拾级 Gradus//AI Cognitive Task Planner//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "X-WR-TIMEZONE:Asia/Shanghai",
    "X-WR-CALDESC:拾级(Gradus) AI 智能拆解与认知负荷排期",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  // 过滤已完成
  const filtered = subtasks.filter((s) => includeCompleted || !s.completed);

  for (const item of filtered) {
    const baseDate = item.taskStartDate ? new Date(item.taskStartDate) : new Date(item.taskCreatedAt);
    const eventDate = new Date(baseDate.getTime());
    eventDate.setDate(eventDate.getDate() + (item.startDay || 0));

    // 设置开始时间
    eventDate.setHours(startHour, startMinute, 0, 0);
    const startDateStr = formatIcsDateTime(eventDate);

    // 计算时长（小时），最少 1 小时
    const durationHours = Math.max(0.75, item.deepWorkHours || item.durationDays * 1.5 || 1.5);
    const endDate = new Date(eventDate.getTime() + durationHours * 60 * 60 * 1000);
    const endDateStr = formatIcsDateTime(endDate);

    const bloomText = item.bloomLevel ? BLOOM_LEVEL_NAMES[item.bloomLevel] || `L${item.bloomLevel}` : "基础认知";
    const resourcesText = parseResourcesText(item.resources);
    const statusText = item.completed ? "已完成 ✓" : "待学习";
    const taskLink = `${baseUrl}/task/${item.taskId}`;

    const description = [
      `🎯 阶段目标: ${item.title}`,
      `📂 所属计划: ${item.taskTitle}`,
      `🧠 认知阶梯: L${item.bloomLevel || 1} ${bloomText}`,
      `⏱️ 预估深度工作: ${item.deepWorkHours || 1.5} 小时`,
      item.topic ? `🏷️ 主题领域: ${item.topic}` : "",
      item.description ? `📋 阶段详情: ${item.description}` : "",
      resourcesText,
      `\\n✅ 状态: ${statusText}`,
      `🔗 拾级详情页: ${taskLink}`,
    ]
      .filter(Boolean)
      .join("\\n");

    const summaryPrefix = item.completed ? "[已完成] " : "[拾级] ";
    const summary = `${summaryPrefix}${item.title} (${item.taskTitle})`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:gradus-subtask-${item.id}@gradus.app`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART;TZID=Asia/Shanghai:${startDateStr}`);
    lines.push(`DTEND;TZID=Asia/Shanghai:${endDateStr}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push(`URL:${taskLink}`);
    lines.push(`STATUS:${item.completed ? "CONFIRMED" : "TENTATIVE"}`);
    lines.push("CATEGORIES:学习,拾级,规划");

    // 提醒
    if (reminderMinutes > 0) {
      lines.push("BEGIN:VALARM");
      lines.push(`TRIGGER:-PT${reminderMinutes}M`);
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:准备开始学习：${escapeIcsText(item.title)}`);
      lines.push("END:VALARM");
    }

    lines.push("END:VEVENT");

    // 艾宾浩斯复习提醒节点 (Spaced Repetition Review Nodes)
    // 为较高认知层级 (Bloom >= 3) 或重点阶段，在 +2天 / +7天 分配 20 分钟轻量复习
    if (includeReviews && (item.bloomLevel || 0) >= 2 && !item.completed) {
      const reviewIntervals = [
        { daysAfter: 2, label: "第一次复习 (+2天)" },
        { daysAfter: 7, label: "第二次巩固 (+7天)" },
      ];

      for (const rev of reviewIntervals) {
        const revDate = new Date(eventDate.getTime());
        revDate.setDate(revDate.getDate() + rev.daysAfter);
        // 复习安排在学习开始前 30 分钟或上午 09:00
        revDate.setHours(Math.max(8, startHour - 1), 30, 0, 0);

        const revStart = formatIcsDateTime(revDate);
        const revEnd = formatIcsDateTime(new Date(revDate.getTime() + 25 * 60 * 1000)); // 25分钟番茄钟

        const revSummary = `[复习提醒] ${item.title} · ${rev.label}`;
        const revDesc = [
          `💡 艾宾浩斯间隔复习: ${rev.label}`,
          `🎯 目标内容: ${item.title} (来自计划《${item.taskTitle}》)`,
          `🧠 认知要求: 尝试闭卷回忆核心概念，或快速浏览先前笔记与参考资料。`,
          `⏱️ 建议用时: 20~25 分钟`,
          `🔗 计划链接: ${taskLink}`,
        ].join("\\n");

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:gradus-review-${item.id}-${rev.daysAfter}d@gradus.app`);
        lines.push(`DTSTAMP:${nowUtc}`);
        lines.push(`DTSTART;TZID=Asia/Shanghai:${revStart}`);
        lines.push(`DTEND;TZID=Asia/Shanghai:${revEnd}`);
        lines.push(`SUMMARY:${escapeIcsText(revSummary)}`);
        lines.push(`DESCRIPTION:${escapeIcsText(revDesc)}`);
        lines.push("CATEGORIES:复习,艾宾浩斯,拾级");
        if (reminderMinutes > 0) {
          lines.push("BEGIN:VALARM");
          lines.push(`TRIGGER:-PT10M`);
          lines.push("ACTION:DISPLAY");
          lines.push(`DESCRIPTION:间隔复习提醒：${escapeIcsText(item.title)}`);
          lines.push("END:VALARM");
        }
        lines.push("END:VEVENT");
      }
    }
  }

  lines.push("END:VCALENDAR");

  // 使用 \r\n 行尾以严格符合 RFC 5545 规范
  return lines.join("\r\n");
}
