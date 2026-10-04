import { isIP } from "node:net";
export { safeFetch } from "./safe-fetch";

/** 把可能是十进制/十六进制/八进制的单个 IPv4 octet 或整段归一化为点分十进制；无法识别返回 null */
function normalizeIpv4(host: string): string | null {
  const h = host.trim();

  // 已是标准点分四段
  const dotted = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (dotted) {
    const octets = dotted.slice(1).map(Number);
    if (octets.every((o) => o >= 0 && o <= 255)) return octets.join(".");
    return null;
  }

  // 单一整数形式：十进制 2130706433 / 十六进制 0x7f000001 / 八进制 017700000001
  let n: number | null = null;
  if (/^0x[0-9a-f]+$/i.test(h)) n = parseInt(h, 16);
  else if (/^0[0-7]+$/.test(h)) n = parseInt(h, 8);
  else if (/^\d+$/.test(h)) n = parseInt(h, 10);
  if (n !== null && Number.isFinite(n) && n >= 0 && n <= 0xffffffff) {
    return [
      (n >>> 24) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 8) & 0xff,
      n & 0xff,
    ].join(".");
  }

  // 含有十六进制/八进制分段的点分形式，如 0x7f.0.0.1 / 0177.0.0.1
  const parts = h.split(".");
  if (parts.length === 4) {
    const nums = parts.map((p) => {
      if (/^0x[0-9a-f]+$/i.test(p)) return parseInt(p, 16);
      if (/^0[0-7]+$/.test(p)) return parseInt(p, 8);
      if (/^\d+$/.test(p)) return parseInt(p, 10);
      return NaN;
    });
    if (nums.every((x) => Number.isFinite(x) && x >= 0 && x <= 255)) {
      return nums.join(".");
    }
  }

  return null;
}

/** 判断点分十进制 IPv4 是否落在私网/环回/link-local/保留/CGNAT 段 */
function isPrivateIpv4Dotted(ipv4: string): boolean {
  const m = ipv4.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;                       // 10.0.0.0/8
  if (a === 127) return true;                      // 127.0.0.0/8 环回
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true;         // 192.168.0.0/16
  if (a === 169 && b === 254) return true;         // 169.254.0.0/16 link-local（云元数据）
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 0) return true;                        // 0.0.0.0/8
  if (a >= 224) return true;                       // 224.0.0.0/4 组播 + 240/4 保留
  return false;
}

/** 判断一个 IPv4/IPv6 字面量是否落在私网/环回/link-local/保留段 */
function isPrivateIp(host: string): boolean {
  // IPv6 环回 / 未指定 / link-local / unique-local
  const v6 = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (isIP(v6) === 6 && !/^[23][0-9a-f]{3}:/.test(v6)) return true;
  if (v6.startsWith("2002:") || /^2001:0{1,4}:/.test(v6)) return true;

  // IPv4-mapped IPv6，两种写法都要还原为点分 IPv4 后判定：
  //   点分：   ::ffff:169.254.169.254
  //   压缩十六进制：::ffff:a9fe:a9fe （URL 解析后常见形式）
  let rawCandidate = host;
  const mappedDotted = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const mappedHex = v6.match(/::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedDotted) {
    rawCandidate = mappedDotted[1];
  } else if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    rawCandidate = [
      (hi >> 8) & 0xff,
      hi & 0xff,
      (lo >> 8) & 0xff,
      lo & 0xff,
    ].join(".");
  }

  // 归一化各种数字进制表示后再判定网段
  const normalized = normalizeIpv4(rawCandidate);
  if (normalized) return isPrivateIpv4Dotted(normalized);
  return false;
}

/** 危险的本地主机名 */
function isLocalHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.+$/, "");
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "metadata.google.internal"
  );
}

/**
 * 校验 URL 是否可安全地由服务端抓取。
 * @returns 安全 → true；应拒绝 → false
 */
export function isSafePublicUrl(rawUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  // 只允许 http / https
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname;
  if (!host || u.username || u.password) return false;
  if (isLocalHostname(host)) return false;
  if (isPrivateIp(host)) return false;
  return true;
}
