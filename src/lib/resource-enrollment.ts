/**
 * 资源「是否还学得了」判定（FB-05）
 *
 * 起因：一条中国大学 MOOC 的《英语语言学概论》被标成 VERIFIED，链接也能打开，
 * 但页面写着「当前开课已结束」「老师已关闭该学期，无法查看」——链接活着不等于内容能学。
 * 原来的资源校验只看 HTTP 状态码（HEAD 200 → ok），完全看不见页面正文里的结课提示。
 *
 * 判定两层：
 *   ① 平台名单：icourse163 / xuetangx / imooc / coursera / edx / bilibili 各有确定的
 *      开课状态文案，按平台规则判定更准。
 *   ② 通用文案兜底：名单外的域名，用去标签正文做保守匹配。
 *
 * 铁律：**不确定即 unknown**。宁可标「未知」，也不要把还能学的资源误判成「已结束」——
 * 误杀一条好资源比漏判一条坏资源更伤用户信任。
 */

export type EnrollmentStatus = "available" | "ended" | "closed" | "unknown";

export interface EnrollmentCheck {
  status: EnrollmentStatus;
  /** 命中的原文片段（用于给用户解释「为什么说它学不了」） */
  evidence?: string;
  /** 命中的平台标识；通用兜底命中时为 undefined */
  platform?: string;
}

interface PlatformRule {
  id: string;
  /** hostname 后缀（含子域） */
  hosts: string[];
  /** 结课信号 */
  ended: RegExp[];
  /** 内容被关闭 / 删除信号 */
  closed: RegExp[];
  /** 正在开课 / 可加入信号 */
  available: RegExp[];
}

/**
 * 平台名单（v1）。
 * 文案尽量挑「指向本课程当前学期」的表述，避开「往期开课已结束」这类会误伤的句子。
 */
const PLATFORM_RULES: PlatformRule[] = [
  {
    id: "icourse163",
    hosts: ["icourse163.org"],
    ended: [/当前开课已结束/, /已关闭该学期/, /该学期已关闭/, /课程已下架/],
    closed: [/无法查看/],
    available: [/正在开课/, /立即加入/, /报名中/, /选课已开放/],
  },
  {
    id: "xuetangx",
    hosts: ["xuetangx.com"],
    ended: [/课程已结束/, /本期已结束/, /已结课/],
    closed: [/课程已下架/, /无法学习/],
    available: [/正在开课/, /立即加入/, /报名中/, /加入学习/],
  },
  {
    id: "imooc",
    hosts: ["imooc.com"],
    ended: [/课程已结束/, /已结课/],
    closed: [/已下架/, /无法查看/],
    available: [/立即参与/, /加入学习/, /报名中/],
  },
  {
    id: "coursera",
    hosts: ["coursera.org"],
    ended: [/this course is no longer available/i, /course has ended/i, /not currently enrolling/i],
    closed: [/page not found/i],
    available: [/enroll for free/i, /currently enrolling/i, /start learning/i],
  },
  {
    id: "edx",
    hosts: ["edx.org"],
    ended: [/course is not available/i, /course has ended/i, /not currently available/i],
    closed: [/page not found/i],
    available: [/enroll now/i, /enroll for free/i, /start learning/i],
  },
  {
    id: "bilibili",
    hosts: ["bilibili.com"],
    ended: [/视频不存在/, /已失效/],
    closed: [/稿件不可见/, /已删除/],
    available: [/播放/],
  },
];

/** 通用兜底：名单外域名 */
const GENERIC_ENDED: RegExp[] = [
  /当前开课已结束/,
  /课程已结束/,
  /本课程已结束/,
  /老师已关闭该学期/,
  /已下架/,
  /已失效/,
  /该内容已被删除/,
  /视频不存在/,
];
const GENERIC_CLOSED: RegExp[] = [/无法查看该课程/, /无法学习/];
const GENERIC_AVAILABLE: RegExp[] = [
  /正在开课/,
  /开课中/,
  /立即加入/,
  /报名中/,
  /免费加入/,
  /enroll for free/i,
  /currently enrolling/i,
];

/** 去标签 + 折叠空白，得到可做文案匹配的纯文本 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** 该 URL 命中哪个平台规则；命中返回平台 id */
export function enrollmentPlatformOf(url: string): string | null {
  const host = hostnameOf(url);
  if (!host) return null;
  for (const rule of PLATFORM_RULES) {
    if (rule.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return rule.id;
  }
  return null;
}

function matchEvidence(text: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const idx = m.index ?? 0;
      const start = Math.max(0, idx - 20);
      return text.slice(start, idx + m[0].length + 30).trim();
    }
  }
  return undefined;
}

/**
 * 判定资源的开课状态。
 *
 * @param url 资源地址
 * @param bodyText 页面正文（HTML 或纯文本均可，内部会自己去标签）
 */
export function detectEnrollmentStatus(url: string, bodyText: string): EnrollmentCheck {
  const text = stripHtml(bodyText ?? "");
  if (!text) return { status: "unknown" };

  const platform = enrollmentPlatformOf(url);
  const platformId = platform ?? undefined;
  const rule = platform ? PLATFORM_RULES.find((r) => r.id === platform) : undefined;

  if (rule) {
    // 平台规则：结课/关闭信号优先（这些文案指向本课程当前学期）
    const closed = matchEvidence(text, rule.closed);
    const ended = matchEvidence(text, rule.ended);
    if (ended) return { status: "ended", evidence: ended, platform: platformId };
    if (closed) return { status: "closed", evidence: closed, platform: platformId };
    const available = matchEvidence(text, rule.available);
    if (available) return { status: "available", evidence: available, platform: platformId };
    return { status: "unknown", platform: platformId };
  }

  // 通用兜底：两类信号同时出现时判 unknown（宁可不确定，不要误杀）
  const ended = matchEvidence(text, GENERIC_ENDED);
  const closed = matchEvidence(text, GENERIC_CLOSED);
  const available = matchEvidence(text, GENERIC_AVAILABLE);
  if (ended && !available) return { status: "ended", evidence: ended };
  if (closed && !available) return { status: "closed", evidence: closed };
  if (available && !ended && !closed) return { status: "available", evidence: available };
  return { status: "unknown" };
}

/** 内容已不可学（已结课 / 已关闭）——UI 用它决定要不要警示 */
export function isUnlearnable(status: EnrollmentStatus): boolean {
  return status === "ended" || status === "closed";
}
