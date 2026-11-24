import { describe, expect, test } from "bun:test";

import { buildEnvReport, byokReady, resolveProviderMode } from "./env-check";

const BASE = {
  DATABASE_URL: "postgresql://user:pass@ep-x-pooler.aws.neon.tech/neondb?sslmode=require",
  AUTH_SECRET: "0123456789abcdef0123456789abcdef",
  AI_PROVIDER_BASE_URL: "https://api.deepseek.com/v1",
  AI_PROVIDER_API_KEY: "sk-test",
  AI_PROVIDER_MODEL: "deepseek-chat",
};

function statusOf(report: { items: { id: string }[] }, id: string): string | undefined {
  return (report.items.find((i) => i.id === id) as { status?: string } | undefined)?.status;
}

describe("环境变量自检规则", () => {
  test("生产口径下缺失 DATABASE_URL 是阻断项", () => {
    const report = buildEnvReport({ ...BASE, DATABASE_URL: "" }, "production");
    expect(statusOf(report, "DB-01")).toBe("error");
    expect(report.ready).toBe(false);
  });

  test("非 postgres 连接串是阻断项", () => {
    const report = buildEnvReport({ ...BASE, DATABASE_URL: "not-a-url" }, "production");
    expect(statusOf(report, "DB-02")).toBe("error");
  });

  test("占位连接串被判为阻断项", () => {
    const report = buildEnvReport({ ...BASE, DATABASE_URL: "postgresql://your-user:your-pass@host/db" }, "production");
    expect(statusOf(report, "DB-03")).toBe("error");
  });

  test("AUTH_SECRET 少于 32 字符是阻断项，本地口径也仍然阻断", () => {
    expect(statusOf(buildEnvReport({ ...BASE, AUTH_SECRET: "short" }, "production"), "AUTH-02")).toBe("error");
    expect(statusOf(buildEnvReport({ ...BASE, AUTH_SECRET: "short" }, "local"), "AUTH-02")).toBe("error");
  });

  test("AUTH_SECRET 缺失：生产阻断、本地只警告", () => {
    expect(statusOf(buildEnvReport({ ...BASE, AUTH_SECRET: "" }, "production"), "AUTH-01")).toBe("error");
    expect(statusOf(buildEnvReport({ ...BASE, AUTH_SECRET: "" }, "local"), "AUTH-01")).toBe("warn");
  });

  test("AUTH_SECRET_ALLOW_INSECURE=1 在生产是警告", () => {
    const report = buildEnvReport({ ...BASE, AUTH_SECRET_ALLOW_INSECURE: "1" }, "production");
    expect(statusOf(report, "AUTH-03")).toBe("warn");
  });

  test("AI 未配置是阻断项", () => {
    const report = buildEnvReport({ ...BASE, AI_PROVIDER_API_KEY: "", AI_PROVIDER_MODEL: "", AI_PROVIDER_BASE_URL: "" }, "production");
    expect(statusOf(report, "AI-01")).toBe("error");
  });

  test("AI 分支判定与 resolveProvider 一致", () => {
    expect(resolveProviderMode(BASE)).toBe("byok");
    expect(
      resolveProviderMode({ ...BASE, AI_PROVIDER_API_KEY: "", AI_PROVIDER_MODEL: "", AI_PROVIDER_BASE_URL: "", GEMINI_API_KEY: "k" }),
    ).toBe("gemini");
    // 两者同时配置时，实际走 Gemini（BYOK 被闲置）
    expect(resolveProviderMode({ ...BASE, GEMINI_API_KEY: "k" })).toBe("gemini");
    expect(byokReady(BASE)).toBe(true);
  });

  test("显式指定 gemini 却没给密钥是阻断项", () => {
    const report = buildEnvReport({ ...BASE, AI_PROVIDER_MODE: "gemini", GEMINI_API_KEY: "" }, "production");
    expect(statusOf(report, "AI-05")).toBe("error");
  });

  test("显式指定 byok 但三件套不齐是阻断项", () => {
    const report = buildEnvReport({ ...BASE, AI_PROVIDER_MODE: "byok", AI_PROVIDER_MODEL: "" }, "production");
    expect(statusOf(report, "AI-06")).toBe("error");
  });

  test("BASE_URL 没写到 /v1 会给出警告", () => {
    const report = buildEnvReport({ ...BASE, AI_PROVIDER_BASE_URL: "https://api.deepseek.com" }, "production");
    expect(statusOf(report, "AI-03")).toBe("warn");
  });

  test("收款默认关闭不报错", () => {
    const report = buildEnvReport(BASE, "production");
    expect(statusOf(report, "PAY-01")).toBe("info");
    expect(report.ready).toBe(true);
  });

  test("收款开启但缺服务端 Key 是阻断项", () => {
    const report = buildEnvReport(
      { ...BASE, GRADUS_COMMERCE_ENABLED: "true", GRADUS_PAYMENT_PROVIDER: "watcha", GRADUS_PUBLIC_ORIGIN: "https://x.dev" },
      "production",
    );
    expect(statusOf(report, "PAY-02")).toBe("error");
  });

  test("收款开启且配置齐全时通过", () => {
    const report = buildEnvReport(
      {
        ...BASE,
        GRADUS_COMMERCE_ENABLED: "true",
        GRADUS_PAYMENT_PROVIDER: "watcha",
        GRADUS_PUBLIC_ORIGIN: "https://x.dev",
        WATCHA_PAY_API_KEY: "k",
        WATCHA_PAY_PACK10_ENTITLEMENT_ID: "e10",
        WATCHA_PAY_PACK30_ENTITLEMENT_ID: "e30",
      },
      "production",
    );
    expect(statusOf(report, "PAY-03")).toBe("ok");
    expect(report.ready).toBe(true);
  });

  test("报告里不含任何密钥原文", () => {
    const report = buildEnvReport(BASE, "production");
    const dumped = JSON.stringify(report);
    expect(dumped).not.toContain("sk-test");
    expect(dumped).not.toContain("0123456789abcdef0123456789abcdef");
    expect(dumped).not.toContain("ep-x-pooler");
  });
});
