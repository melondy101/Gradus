import nodemailer, { type Transporter } from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  provider?: "qq" | "smtp" | "mock";
  error?: string;
}

/**
 * 检查是否已配置真实 QQ 邮箱 / SMTP 发信服务
 */
export function isRealEmailConfigured(): boolean {
  return Boolean(
    (process.env.QQ_EMAIL_USER?.trim() || process.env.SMTP_USER?.trim()) &&
      (process.env.QQ_EMAIL_PASS?.trim() || process.env.SMTP_PASS?.trim())
  );
}

/**
 * 获取当前启用的邮件驱动类型
 */
export function getEmailProviderType(): "qq" | "smtp" | "mock" {
  const user = process.env.QQ_EMAIL_USER?.trim() || process.env.SMTP_USER?.trim();
  const pass = process.env.QQ_EMAIL_PASS?.trim() || process.env.SMTP_PASS?.trim();
  if (!user || !pass) return "mock";

  const host = process.env.SMTP_HOST?.trim() || "smtp.qq.com";
  if (host.includes("qq.com") || Boolean(process.env.QQ_EMAIL_USER?.trim())) {
    return "qq";
  }
  return "smtp";
}

let cachedTransporter: Transporter | null = null;

function getSmtpTransporter() {
  const user = process.env.SMTP_USER?.trim() || process.env.QQ_EMAIL_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.QQ_EMAIL_PASS?.trim();

  if (!user || !pass) return null;

  if (!cachedTransporter) {
    const host = process.env.SMTP_HOST?.trim() || "smtp.qq.com";
    const port = parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
    const secure = process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return cachedTransporter;
}

/**
 * 格式化发信人字符串，确保兼容 QQ 邮箱的严格校验（from 地址必须等于认证 user）
 */
function getSmtpFromAddress(user: string): string {
  const rawFrom = process.env.EMAIL_FROM?.trim();
  if (!rawFrom) {
    return `"拾级 Gradus" <${user}>`;
  }

  // 如果配置包含了尖括号名称，如 "拾级 <xxx@xxx.com>"
  const match = rawFrom.match(/^(.*?)(?:<.*?>)?$/);
  const displayName = match && match[1]?.trim() ? match[1].trim().replace(/^["']|["']$/g, "") : "拾级 Gradus";
  return `"${displayName}" <${user}>`;
}

/**
 * 通过 QQ 邮箱 / 通用 SMTP 发送邮件
 */
async function sendViaSmtp(options: SendEmailOptions): Promise<SendEmailResult> {
  const user = process.env.SMTP_USER?.trim() || process.env.QQ_EMAIL_USER?.trim();
  if (!user) {
    return { ok: false, error: "未检测到 SMTP 用户名 (SMTP_USER 或 QQ_EMAIL_USER)" };
  }

  const transporter = getSmtpTransporter();
  if (!transporter) {
    return { ok: false, error: "SMTP 发信组件初始化失败" };
  }

  const from = getSmtpFromAddress(user);

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`[Email - SMTP/QQ] 发送成功! 目标: ${options.to}, messageId: ${info.messageId}`);
    return { ok: true, id: info.messageId, provider: "smtp" };
  } catch (err) {
    console.error("[Email - SMTP/QQ] 发送失败:", err);
    const msg = err instanceof Error ? err.message : String(err);
    // 针对 QQ 邮箱常见报错提供清晰指引
    if (msg.includes("535") || msg.includes("Error: authentication failed")) {
      return {
        ok: false,
        error: "QQ 邮箱授权认证失败。请确认使用的是 QQ 邮箱生成的 16 位独立授权码，而非 QQ 密码。",
      };
    }
    if (msg.includes("501") || msg.includes("mail from address must be same")) {
      return {
        ok: false,
        error: "发件人地址与 QQ 邮箱认证账户不匹配，请检查发件人配置。",
      };
    }
    if (
      msg.includes("550") ||
      msg.includes("553") ||
      msg.includes("Invalid recipient") ||
      msg.includes("Mailbox not found") ||
      msg.includes("Domain name not found") ||
      msg.includes("Recipient address rejected") ||
      msg.includes("user not found") ||
      msg.includes("does not exist") ||
      msg.includes("Non-existent domain")
    ) {
      return {
        ok: false,
        error: "目标邮箱地址或域名不存在/不可用，无法投递验证码。请输入真实可收信的邮箱（如 QQ、163、Gmail 等）。",
      };
    }
    if (msg.includes("421") || msg.includes("450") || msg.includes("451")) {
      return {
        ok: false,
        error: "邮件服务暂时繁忙或触发限流，请稍后 1 分钟后再试。",
      };
    }
    return { ok: false, error: `SMTP 邮件发送失败: ${msg}` };
  }
}

/**
 * 统一邮件发送分发入口：
 * 优先级：
 * 1. QQ 邮箱 / SMTP（配置 QQ_EMAIL_USER & QQ_EMAIL_PASS 或 SMTP_USER & SMTP_PASS）
 * 2. 模拟发信（开发/演示模式）
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const provider = getEmailProviderType();

  if (provider === "qq" || provider === "smtp") {
    const res = await sendViaSmtp(options);
    return { ...res, provider };
  }

  // 模拟模式
  console.log(
    `\n[Email - Dev/Fallback Mode] 目标: ${options.to}\n主题: ${options.subject}\n未检测到 QQ 邮箱 / SMTP 环境变量配置 (QQ_EMAIL_USER & QQ_EMAIL_PASS)，已在控制台模拟输出。\n`
  );
  return { ok: true, id: `mock-${Date.now()}`, provider: "mock" };
}

/**
 * 发送 6 位注册/登录验证码邮件模板
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string
): Promise<SendEmailResult> {
  const subject = `【拾级 Gradus】您的验证码：${code}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>验证码</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg, #18181b 0%, #27272a 100%);color:#ffffff;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin:0;font-size:20px;font-weight:700;letter-spacing:-0.02em;">拾级（Gradus）</h1>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#a1a1aa;">面向自主学习者的 AI 阶梯规划器</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px 0;font-size:17px;font-weight:600;color:#18181b;">验证您的电子邮箱</h2>
              <p style="margin:0 0 24px 0;font-size:14px;color:#52525b;line-height:1.6;">
                您好！您正在注册或登录「拾级（Gradus）」。请在验证码输入框中填入以下 6 位数字以完成身份验证：
              </p>
              <!-- Code Card -->
              <div style="background-color:#f4f4f5;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px 0;border:1px dashed #d4d4d8;">
                <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:800;letter-spacing:8px;color:#18181b;display:inline-block;padding-left:8px;">${code}</span>
              </div>
              <p style="margin:0 0 12px 0;font-size:13px;color:#71717a;line-height:1.5;">
                • 验证码有效期为 <strong>10 分钟</strong>，请尽快使用。<br>
                • 如非本人操作，请忽略此邮件，您的账号安全不会受到影响。
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #f4f4f5;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;">
                此为系统自动发送邮件，请勿直接回复。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `【拾级 Gradus】您的验证码为：${code}（10分钟内有效）。如非本人操作请忽略。`;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}
