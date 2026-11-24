import { expect, test } from "bun:test";

import {
  detectEnrollmentStatus,
  enrollmentPlatformOf,
  isUnlearnable,
  stripHtml,
} from "@/lib/resource-enrollment";

/** FB-05：链接活着 ≠ 内容能学 */
test("平台名单：icourse163 结课文案判为 ended", () => {
  const html = `<html><body><div class="status">当前开课已结束</div><p>老师已关闭该学期，无法查看</p></body></html>`;
  const check = detectEnrollmentStatus("https://www.icourse163.org/course-abc", html);
  expect(check.status).toBe("ended");
  expect(check.platform).toBe("icourse163");
  expect(isUnlearnable(check.status)).toBe(true);
});

test("平台名单：icourse163 正在开课判为 available", () => {
  const check = detectEnrollmentStatus(
    "https://www.icourse163.org/course-abc",
    "<div>正在开课</div><button>立即加入</button>",
  );
  expect(check.status).toBe("available");
  expect(isUnlearnable(check.status)).toBe(false);
});

test("平台名单：只提到往期结课不算当前课程结课（避免误杀）", () => {
  const check = detectEnrollmentStatus(
    "https://www.icourse163.org/course-abc",
    "<div>正在开课</div><span>往期开课已结束</span>",
  );
  expect(check.status).toBe("available");
});

test("通用文案兜底：名单外域名也能识别结课", () => {
  const check = detectEnrollmentStatus(
    "https://example.com/course/1",
    "<p>该课程已结束，下期开课通知我</p>",
  );
  expect(check.status).toBe("ended");
});

test("通用兜底：结课与在开信号同时出现时保持 unknown（不确定就不误判）", () => {
  const check = detectEnrollmentStatus(
    "https://example.com/course/1",
    "<p>课程已结束</p><p>报名中</p>",
  );
  expect(check.status).toBe("unknown");
});

test("没有任何相关文案时保持 unknown", () => {
  expect(detectEnrollmentStatus("https://example.com/a", "<p>一篇普通文章</p>").status).toBe("unknown");
  expect(detectEnrollmentStatus("https://example.com/a", "").status).toBe("unknown");
});

test("平台识别覆盖名单内的站点", () => {
  expect(enrollmentPlatformOf("https://www.icourse163.org/course-abc")).toBe("icourse163");
  expect(enrollmentPlatformOf("https://www.xuetangx.com/course/abc")).toBe("xuetangx");
  expect(enrollmentPlatformOf("https://www.coursera.org/learn/x")).toBe("coursera");
  expect(enrollmentPlatformOf("https://www.edx.org/course/x")).toBe("edx");
  expect(enrollmentPlatformOf("https://www.bilibili.com/video/BV1")).toBe("bilibili");
  expect(enrollmentPlatformOf("https://example.com/x")).toBeNull();
});

test("stripHtml 去标签后仍能命中文案", () => {
  expect(stripHtml("<p>当前开课已结束</p>")).toContain("当前开课已结束");
});
