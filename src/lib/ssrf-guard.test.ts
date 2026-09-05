import { describe, expect, test } from "bun:test";
import { isSafePublicUrl } from "./ssrf-guard";

describe("isSafePublicUrl — 协议", () => {
  test("允许 http/https", () => {
    expect(isSafePublicUrl("http://example.com")).toBe(true);
    expect(isSafePublicUrl("https://example.com/path?q=1")).toBe(true);
  });
  test("拒绝危险协议", () => {
    expect(isSafePublicUrl("file:///etc/passwd")).toBe(false);
    expect(isSafePublicUrl("ftp://example.com")).toBe(false);
    expect(isSafePublicUrl("gopher://example.com")).toBe(false);
  });
  test("拒绝非法 URL", () => {
    expect(isSafePublicUrl("not a url")).toBe(false);
    expect(isSafePublicUrl("")).toBe(false);
  });
});

describe("isSafePublicUrl — 本地主机名", () => {
  test("拒绝 localhost 及本地后缀", () => {
    expect(isSafePublicUrl("http://localhost/")).toBe(false);
    expect(isSafePublicUrl("http://foo.localhost/")).toBe(false);
    expect(isSafePublicUrl("http://svc.local/")).toBe(false);
    expect(isSafePublicUrl("http://api.internal/")).toBe(false);
    expect(isSafePublicUrl("http://metadata.google.internal/")).toBe(false);
  });
});

describe("isSafePublicUrl — 点分私网/保留段", () => {
  test("拒绝各私网段", () => {
    expect(isSafePublicUrl("http://10.0.0.1/")).toBe(false);
    expect(isSafePublicUrl("http://127.0.0.1/")).toBe(false);
    expect(isSafePublicUrl("http://172.16.5.4/")).toBe(false);
    expect(isSafePublicUrl("http://192.168.1.1/")).toBe(false);
    expect(isSafePublicUrl("http://169.254.169.254/")).toBe(false); // 云元数据
    expect(isSafePublicUrl("http://0.0.0.0/")).toBe(false);
  });
  test("拒绝 CGNAT 100.64.0.0/10", () => {
    expect(isSafePublicUrl("http://100.64.0.1/")).toBe(false);
    expect(isSafePublicUrl("http://100.127.255.1/")).toBe(false);
  });
  test("拒绝组播/保留高段", () => {
    expect(isSafePublicUrl("http://224.0.0.1/")).toBe(false);
    expect(isSafePublicUrl("http://240.0.0.1/")).toBe(false);
  });
  test("允许公网 IP", () => {
    expect(isSafePublicUrl("http://8.8.8.8/")).toBe(true);
    expect(isSafePublicUrl("http://1.1.1.1/")).toBe(true);
    // 100.63 与 100.128 在 CGNAT 段之外
    expect(isSafePublicUrl("http://100.63.0.1/")).toBe(true);
    expect(isSafePublicUrl("http://100.128.0.1/")).toBe(true);
  });
});

describe("isSafePublicUrl — 数字进制 IP 绕过防护", () => {
  test("拒绝十进制整数形式的 127.0.0.1 (2130706433)", () => {
    expect(isSafePublicUrl("http://2130706433/")).toBe(false);
  });
  test("拒绝十六进制形式 0x7f000001", () => {
    expect(isSafePublicUrl("http://0x7f000001/")).toBe(false);
  });
  test("拒绝八进制分段 0177.0.0.1", () => {
    expect(isSafePublicUrl("http://0177.0.0.1/")).toBe(false);
  });
  test("拒绝十六进制分段 0x7f.0.0.1", () => {
    expect(isSafePublicUrl("http://0x7f.0.0.1/")).toBe(false);
  });
  test("拒绝十进制整数形式的元数据地址 (2852039166)", () => {
    // 169.254.169.254 == 2852039166
    expect(isSafePublicUrl("http://2852039166/")).toBe(false);
  });
});

describe("isSafePublicUrl — IPv6", () => {
  test("拒绝环回/link-local/ULA", () => {
    expect(isSafePublicUrl("http://[::1]/")).toBe(false);
    expect(isSafePublicUrl("http://[fe80::1]/")).toBe(false);
    expect(isSafePublicUrl("http://[fd00::1]/")).toBe(false);
  });
  test("拒绝 IPv4-mapped 元数据地址", () => {
    expect(isSafePublicUrl("http://[::ffff:169.254.169.254]/")).toBe(false);
  });
});

describe("isSafePublicUrl — 正常公开地址", () => {
  test("允许常见学习资源域名", () => {
    expect(isSafePublicUrl("https://github.com/foo/bar")).toBe(true);
    expect(isSafePublicUrl("https://docs.python.org/3/")).toBe(true);
    expect(isSafePublicUrl("https://arxiv.org/abs/1234.5678")).toBe(true);
  });
});
