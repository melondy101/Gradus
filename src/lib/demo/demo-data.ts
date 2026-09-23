import {
  createSubtasks,
  createTask,
  getTasksByUser,
  updateTaskSeedFields,
  type SubtaskInsert,
} from "@/lib/db/queries";
import { getBeijingDateString } from "@/lib/membership/quota";

/**
 * 演示数据 —— 访客「点进去就直接能看」的那份学习进度。
 *
 * 设计约束：
 *   - 每位访客经 middleware 拿到全新临时账号（src/middleware.ts → createTempAccount），
 *     所以演示数据必须在建号时按账号灌入，线上才看得到效果。
 *   - 只灌 1 个任务：免费档 maxTasks = 2，必须留一个槽位给访客创建自己的目标。
 *   - 连续学习天数由 subtasks.completedAt 按东八区日期聚合（/api/user/stats），
 *     因此完成时间全部用显式 +08:00 时间戳回填，与服务器时区无关。
 *   - 任务开始于「今天 − 8 天」：过去 8 天每天各有一次完成（streak 从今天起算），
 *     今天另留一项待办，未来 12 天还有排期，甘特图三态齐全。
 */

const DAYS_BEFORE_TODAY = 8;

interface DemoSubtask extends SubtaskInsert {
  /** 存在即建号时直接落「已完成」，值为东八区锚定的完成时刻 */
  completedAt?: Date | null;
}

export interface DemoPlan {
  title: string;
  rawInput: string;
  tags: string[];
  startDate: Date;
  totalDays: number;
  subtasks: DemoSubtask[];
}

/** 「今天（东八区）± offsetDays」的 "YYYY-MM-DD" */
function beijingDateString(offsetDays: number, now: Date): string {
  return getBeijingDateString(new Date(now.getTime() + offsetDays * 86_400_000));
}

/** 把 "YYYY-MM-DD" 还原成东八区当天的确定时刻（默认正午，任何服务器时区都不会跨日） */
function beijingMoment(dateStr: string, hour = 12, minute = 0): Date {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${dateStr}T${hh}:${mm}:00+08:00`);
}

const RESOURCES_NUMPY = JSON.stringify([
  {
    type: "doc",
    title: "NumPy 官方快速入门教程",
    url: "https://numpy.org/doc/stable/user/quickstart.html",
    platform: "numpy.org",
    trust_level: "verified",
    authority_score: 9.2,
    url_status: "ok",
  },
  {
    type: "article",
    title: "100 道 NumPy 向量化练习题（含答案）",
    searchQuery: "numpy vectorization exercises 100",
    trust_level: "search_only",
  },
]);

const RESOURCES_PANDAS = JSON.stringify([
  {
    type: "doc",
    title: "Pandas 十分钟入门 · User Guide",
    url: "https://pandas.pydata.org/docs/user_guide/10min.html",
    platform: "pandas.pydata.org",
    trust_level: "verified",
    authority_score: 9.4,
    url_status: "ok",
  },
  {
    type: "video",
    title: "Pandas 数据清洗实战演示",
    searchQuery: "pandas 数据清洗 实战 视频",
    trust_level: "search_only",
  },
]);

const RESOURCES_PROJECT = JSON.stringify([
  {
    type: "dataset",
    title: "Sample Superstore 销售数据集（Kaggle）",
    url: "https://www.kaggle.com/datasets/bravehart101/sample-supermarket-dataset",
    platform: "kaggle.com",
    trust_level: "verified",
    authority_score: 8.1,
    url_status: "ok",
  },
]);

export function buildDemoPlan(now: Date = new Date()): DemoPlan {
  const startDate = beijingMoment(beijingDateString(-DAYS_BEFORE_TODAY, now));

  /** startDay = k 的子任务排在第 k 天；完成时刻取排期日当天 */
  const doneAt = (startDay: number, hour = 10, minute = 0): Date =>
    beijingMoment(beijingDateString(startDay - DAYS_BEFORE_TODAY, now), hour, minute);

  const subtasks: DemoSubtask[] = [
    {
      sortOrder: 0,
      startDay: 0,
      title: "环境搭建：Anaconda 与 Jupyter 上手",
      description:
        "安装 Anaconda 并创建独立环境 py310-data；\n跑通第一个 Notebook，熟悉单元格 / Markdown / 快捷键；\n用 pip 固定 numpy、pandas、matplotlib 版本。",
      durationDays: 1,
      topic: "编程",
      bloomLevel: 1,
      deepWorkHours: 1.5,
      keywords: JSON.stringify(["环境配置", "Jupyter"]),
      completedAt: doneAt(0),
    },
    {
      sortOrder: 1,
      startDay: 1,
      title: "Python 基础语法：变量、类型与运算符",
      description:
        "过一遍数字 / 字符串 / 布尔与类型转换；\n整理 20 个易错点笔记（整除、浮点误差、可变默认值）；\n完成 15 道语法小练习。",
      durationDays: 2,
      topic: "编程",
      bloomLevel: 1,
      deepWorkHours: 2,
      keywords: JSON.stringify(["语法基础", "数据类型"]),
      completedAt: doneAt(1),
    },
    {
      sortOrder: 2,
      startDay: 2,
      title: "数据结构：列表、字典与推导式",
      description:
        "掌握增删改查与切片语义；\n把 10 段 for 循环改写成推导式并对比可读性；\n实现一个简易词频统计。",
      durationDays: 2,
      topic: "编程",
      bloomLevel: 2,
      deepWorkHours: 2.5,
      keywords: JSON.stringify(["列表", "字典", "推导式"]),
      completedAt: doneAt(2),
    },
    {
      sortOrder: 3,
      startDay: 3,
      title: "流程控制与函数封装",
      description:
        "条件分支 / 循环 / 异常处理各写 3 个场景；\n把重复代码抽成带默认参数的函数；\n给函数补类型注解与 docstring。",
      durationDays: 2,
      topic: "编程",
      bloomLevel: 2,
      deepWorkHours: 3,
      keywords: JSON.stringify(["函数", "异常处理"]),
      completedAt: doneAt(3),
    },
    {
      sortOrder: 4,
      startDay: 4,
      title: "NumPy：数组与向量化运算",
      description:
        "理解 ndarray 的形状、dtype 与广播机制；\n用向量化重写 5 个循环案例并计时对比；\n掌握布尔索引与花式索引。",
      durationDays: 2,
      topic: "数据",
      bloomLevel: 3,
      deepWorkHours: 4,
      urgency: 4,
      importance: 5,
      keywords: JSON.stringify(["NumPy", "向量化", "广播"]),
      resources: RESOURCES_NUMPY,
      completedAt: doneAt(4),
    },
    {
      sortOrder: 5,
      startDay: 5,
      title: "Pandas：Series 与 DataFrame",
      description:
        "掌握 loc / iloc 选行选列与条件筛选；\n练习读取 CSV / Excel 并做类型规整；\n输出一份字段说明清单。",
      durationDays: 2,
      topic: "数据",
      bloomLevel: 3,
      deepWorkHours: 4.5,
      urgency: 4,
      importance: 5,
      keywords: JSON.stringify(["Pandas", "DataFrame"]),
      resources: RESOURCES_PANDAS,
      completedAt: doneAt(5),
    },
    {
      sortOrder: 6,
      startDay: 6,
      title: "数据清洗：缺失值、重复值与类型转换",
      description:
        "对同一份脏数据分别用删除 / 填充 / 插值三种策略处理并记录取舍；\n处理重复行与异常值；\n沉淀一份清洗检查清单。",
      durationDays: 2,
      topic: "数据",
      bloomLevel: 3,
      deepWorkHours: 3.5,
      keywords: JSON.stringify(["数据清洗", "缺失值"]),
      completedAt: doneAt(6),
    },
    {
      sortOrder: 7,
      startDay: 7,
      title: "Matplotlib 基础图表",
      description:
        "画折线 / 柱状 / 散点各两张并调好标题、轴标签与图例；\n同一数据用两种图表表达，写清各自适用场景。",
      durationDays: 1,
      topic: "数据",
      bloomLevel: 3,
      deepWorkHours: 2.5,
      keywords: JSON.stringify(["可视化", "Matplotlib"]),
      completedAt: doneAt(7),
    },
    {
      sortOrder: 8,
      startDay: 8,
      title: "Seaborn 分布与关系图",
      description:
        "用 distplot / pairplot 看单变量与多变量分布；\n挑一个真实数据集输出两张图并写解读。",
      durationDays: 1,
      topic: "数据",
      bloomLevel: 4,
      deepWorkHours: 3,
      keywords: JSON.stringify(["Seaborn", "分布分析"]),
      completedAt: doneAt(8, 9, 30),
    },
    {
      sortOrder: 9,
      startDay: 8,
      title: "数据分组聚合：groupby 实战",
      description:
        "掌握分组、聚合、透视表三件套；\n对销售数据按「地区 × 月份」汇总销售额；\n解释两个反直觉的聚合结果。",
      durationDays: 1,
      topic: "数据",
      bloomLevel: 4,
      deepWorkHours: 2.5,
      urgency: 3,
      importance: 4,
      keywords: JSON.stringify(["groupby", "透视表"]),
    },
    {
      sortOrder: 10,
      startDay: 10,
      title: "时间序列与日期重采样",
      description:
        "解析日期列并设为索引；\n按周 / 月重采样看趋势与季节性；\n计算 7 日移动平均并绘图。",
      durationDays: 2,
      topic: "数据",
      bloomLevel: 4,
      deepWorkHours: 3,
      keywords: JSON.stringify(["时间序列", "重采样"]),
    },
    {
      sortOrder: 11,
      startDay: 12,
      title: "真实数据集练习：城市空气质量",
      description:
        "下载空气质量公开数据集；\n完成清洗、聚合、可视化全流程；\n输出三条带数据支撑的结论。",
      durationDays: 3,
      topic: "数据",
      bloomLevel: 5,
      deepWorkHours: 5,
      urgency: 3,
      importance: 4,
      keywords: JSON.stringify(["开放数据", "案例分析"]),
    },
    {
      sortOrder: 12,
      startDay: 15,
      title: "综合项目：销售数据看板（上）",
      description:
        "确定分析问题与指标口径；\n搭建数据管道：读取 → 清洗 → 宽表；\n产出 4 张核心图表。",
      durationDays: 3,
      topic: "数据",
      bloomLevel: 5,
      deepWorkHours: 6,
      urgency: 2,
      importance: 5,
      keywords: JSON.stringify(["项目实战", "指标设计"]),
      resources: RESOURCES_PROJECT,
    },
    {
      sortOrder: 13,
      startDay: 18,
      title: "综合项目：销售数据看板（下）",
      description:
        "补上交互筛选与异常下钻；\n写一段自动生成结论的摘要逻辑；\n自查图表是否误导（坐标轴 / 配色 / 样本量）。",
      durationDays: 3,
      topic: "数据",
      bloomLevel: 6,
      deepWorkHours: 6,
      urgency: 2,
      importance: 5,
      keywords: JSON.stringify(["项目实战", "数据叙事"]),
    },
    {
      sortOrder: 14,
      startDay: 20,
      title: "复盘与输出：一篇数据分析博客",
      description:
        "把 30 天笔记整理成时间线；\n写一篇 2000 字博客，含图表与踩坑记录；\n列出下一阶段学习清单。",
      durationDays: 2,
      topic: "数据",
      bloomLevel: 6,
      deepWorkHours: 3,
      keywords: JSON.stringify(["复盘", "写作输出"]),
    },
  ];

  return {
    title: "30 天入门 Python 数据分析",
    rawInput: "30 天入门 Python 数据分析",
    tags: ["编程", "数据"],
    startDate,
    totalDays: 24,
    subtasks,
  };
}

/**
 * 给指定用户灌入演示数据（幂等：已有任务的用户跳过）。
 * 返回是否实际执行了播种。
 *
 * 全程只有 3 次数据库往返（查重 / 建任务 / 建子任务）。历史完成时间直接写进
 * 建子任务那条 INSERT，不再回头 UPDATE——这段跑在 middleware 建临时账号的
 * 关键路径上，每多一次往返就直接加到新访客首屏的白屏时间上。
 */
export async function seedDemoDataForUser(
  userId: string,
  now: Date = new Date()
): Promise<boolean> {
  const existing = await getTasksByUser(userId);
  if (existing.length > 0) return false;

  const plan = buildDemoPlan(now);

  const task = await createTask(userId, plan.title, plan.tags);
  await updateTaskSeedFields(task.id, {
    title: plan.title,
    rawInput: plan.rawInput,
    startDate: plan.startDate,
    totalDays: plan.totalDays,
  });
  await createSubtasks(task.id, plan.subtasks);

  return true;
}
