import type { Metadata } from "next";

import { BrandPageShell } from "@/components/task/brand-page-shell";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { REPO_URL } from "@/components/landing/links";

export const metadata: Metadata = {
  title: "服务条款",
  description:
    "拾级 Gradus 服务条款：服务性质、账号与访客身份、数据所有权、AI 生成内容免责、会员与兑换码、责任限制与条款变更说明。",
};

const UPDATED_AT = "2026 年 9 月 22 日";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "一、服务的性质",
    body: [
      "拾级 Gradus（以下简称「本产品」）是一款以开源形式发布的学习任务规划工具，采用「自带模型密钥（BYOK）+ 自托管数据库」的架构。你使用到的实例由部署者自行运营，本产品按「现状」提供，不对特定用途的适用性、可用性或及时性作出任何明示或默示的担保。",
      "本产品生成的计划、排期与资源推荐仅供学习参考，不构成任何教育、考试或职业方面的承诺。",
    ],
  },
  {
    title: "二、账号与访客身份",
    body: [
      "首次访问时，本产品会为你自动创建一个匿名访客账号，用于在本地会话中保存你的任务与进度。访客账号无需密码，仅在当前浏览器会话内有效。为便于快速体验，访客账号会自动载入一份**演示学习计划**（其中的打卡记录与进度为预置的示例数据，非真实学习历史），你可以随时删除它，或直接创建自己的学习目标。",
      "你可以随时通过邮箱注册正式账号。注册成功后，访客账号下的任务与学习记录将自动合并至新账号；合并完成后原访客账号即被删除，该过程不可撤销。",
      "请妥善保管你的账号凭据。因凭据外泄、共享或浏览器环境被他人使用造成的后果，由你自行承担。",
    ],
  },
  {
    title: "三、内容与数据所有权",
    body: [
      "你在本产品中创建的任务、子任务、备注与学习记录归你（或你所使用的自托管实例的管理者）所有。本产品不主张对这些内容的所有权。",
      "本产品不将你的学习数据用于模型训练，不进行用户画像或营销用途的数据挖掘。页面访问统计（如部署者启用了分析工具）仅用于统计访问量，可随时关闭。",
      "你可以随时通过产品界面删除任务，或通过数据库直接导出、迁移全部数据；删除操作即时生效且不可恢复。",
    ],
  },
  {
    title: "四、AI 生成内容",
    body: [
      "计划拆解、排期建议与资源推荐由第三方大语言模型生成。尽管本产品会对资源链接做存活与权威性校验，仍可能出现过时、失效或不准确的内容。",
      "在依据任何推荐资源进行学习、付费或做出其他决定前，请自行核实其内容与来源。本产品不对 AI 生成内容的准确性、完整性或由此产生的任何损失承担责任。",
      "请注意避免在任务描述中输入个人敏感信息（身份证号、密码、住址等）。",
    ],
  },
  {
    title: "五、会员与兑换码",
    body: [
      "本产品提供免费档与付费档（专业版 / 尊享版），差异主要体现在任务数量与每日 AI 使用配额。兑换码一经使用即与账号绑定，不支持退换、转让或反向恢复。",
      "付费档会员资格在有效期内的配额调整以产品内公示为准。若会员资格因到期失效，你的任务与历史数据不会被删除，仅配额恢复至免费档水平。",
    ],
  },
  {
    title: "六、可接受的使用",
    body: [
      "你同意不将本产品用于任何违法或侵权用途，包括但不限于：利用自动化手段刷取接口或配额、规避频率限制、上传或分发恶意代码、侵犯他人知识产权或隐私。",
      "部署者有权对明显滥用行为（如异常流量、暴力请求）采取限流、封禁账号等必要措施。",
    ],
  },
  {
    title: "七、责任限制",
    body: [
      "在法律允许的最大范围内，本产品不对任何间接、附带、特殊或惩罚性损失承担责任，包括但不限于数据丢失、收益损失或学习进度受损，即使部署者已被告知此类损失的可能性。",
      "本产品依赖的第三方服务（模型提供商、邮件服务、对象存储等）发生故障或政策变更时，相关功能可能不可用，部署者将尽力恢复但不作时效保证。",
    ],
  },
  {
    title: "八、条款变更",
    body: [
      "本条款可能随产品功能调整而更新，更新后将在本页面公示并标注生效日期。你在更新生效后继续使用本产品，即视为接受修订后的条款。",
      "如修订涉及重大变更（如数据使用范围），我们将尽可能通过产品内通知或邮件提前告知。",
    ],
  },
  {
    title: "九、联系我们",
    body: [
      `如对本条款有任何疑问、意见或投诉，请通过 GitHub Issues 与我们联系：${REPO_URL}/issues。`,
    ],
  },
];

export default function TermsPage() {
  return (
    <BrandPageShell maxWidth={860} railLabel="TERMS OF SERVICE">
      <Eyebrow>Terms of Service</Eyebrow>
      <Heading level={1} spec="page" className="mt-1.5">
        服务条款
      </Heading>
      <p className="mt-2 text-[13px] text-text-2">
        最近更新：{UPDATED_AT} · 适用于拾级 Gradus 的全部部署实例
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <h2 className="text-[17px] font-bold">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 12)} className="text-[14.5px] leading-[26px] text-text-2">
                {paragraph}
              </p>
            ))}
          </Card>
        ))}
      </div>

      <p className="mt-6 text-[12.5px] leading-[22px] text-text-3">
        本产品以自托管方式提供：你的任务与学习数据保存在当前实例的数据库中，
        实例管理者可通过数据库直接导出或迁移全部内容。隐私相关的数据实践详见落地页「隐私政策」一节。
      </p>
    </BrandPageShell>
  );
}
