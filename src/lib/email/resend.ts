/**
 * Resend 邮件服务集成
 * 免费额度：每月 3,000 封，每日 100 封
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmailViaResend(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  // 如果未配置 RESEND_API_KEY，且处于开发/演示环境，则在控制台打印并模拟成功
  if (!apiKey) {
    console.log(
      `\n[Email - Dev/Fallback Mode] 目标: ${options.to}\n主题: ${options.subject}\n未检测到 RESEND_API_KEY，邮件未真实投递。\n`
    );
    return { ok: true, id: `mock-${Date.now()}` };
  }

  const from =
    process.env.EMAIL_FROM?.trim() || "拾级 Gradus <onboarding@resend.dev>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: { message?: string };
    };

    if (!res.ok) {
      const errorMsg =
        data.message || data.error?.message || `Resend HTTP ${res.status}`;
      console.error("[Email] Resend API error:", errorMsg);
      return { ok: false, error: errorMsg };
    }

    return { ok: true, id: data.id };
  } catch (err) {
    console.error("[Email] Send exception:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "邮件网络请求异常",
    };
  }
}

/**
 * 发送 6 位注册/登录邮箱验证码模板邮件
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

  return sendEmailViaResend({
    to: email,
    subject,
    html,
    text,
  });
}
