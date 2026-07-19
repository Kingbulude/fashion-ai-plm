// 飞书通信 Skill
//
// 支持两种模式：
// 1. Webhook 模式（简单）：通过群机器人 Webhook 发消息
// 2. Bot API 模式（完整）：通过飞书开放平台 API 发私聊/卡片/富交互
//
// Phase 3 先实现 Webhook 模式（零配置，只需 LARK_WEBHOOK_URL 环境变量）
// 后续扩展 Bot API 模式需要飞书应用凭证

import { SkillDefinition, SkillRiskLevel, SkillCategory } from "../types";
import { registerSkill } from "../registry";

const LARK_WEBHOOK_URL = process.env.LARK_WEBHOOK_URL || "";

// ─── Webhook 模式：发送文本消息到飞书群 ───
async function sendViaWebhook(
  title: string,
  content: string,
  extra?: { styleId?: string; suggestionId?: string; link?: string }
): Promise<boolean> {
  if (!LARK_WEBHOOK_URL) {
    console.warn("[lark] LARK_WEBHOOK_URL 未配置，跳过发送");
    return false;
  }

  // 构建飞书消息卡片格式
  const elements: any[] = [
    {
      tag: "markdown",
      content: content.replace(/\n/g, "\n"),
    },
  ];

  // 如果有链接，添加按钮
  if (extra?.link) {
    elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: { tag: "plain_text", content: "查看详情" },
          type: "primary",
          url: extra.link,
        },
      ],
    });
  }

  const body = {
    msg_type: "interactive",
    card: {
      header: {
        title: { tag: "plain_text", content: `🤖 ${title}` },
        template: title.includes("预警") ? "red" : title.includes("审批") ? "orange" : "blue",
      },
      elements,
    },
  };

  try {
    const response = await fetch(LARK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[lark] webhook 发送失败: ${response.status}`, errText);
      return false;
    }

    const result = await response.json();
    if (result.code !== 0) {
      console.error(`[lark] webhook 返回错误:`, result.msg);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[lark] webhook 异常:", err);
    return false;
  }
}

// ─── Skill 定义：发送飞书消息 ───
const sendLarkMessageSkill: SkillDefinition = {
  id: "send-lark-message",
  name: "发送飞书消息",
  description: "通过飞书群机器人发送消息通知，支持 Markdown 格式。用于催进度、推送决策确认、异常预警等。",
  riskLevel: SkillRiskLevel.AUTO,
  params: [
    {
      name: "title",
      label: "消息标题",
      type: "string",
      required: true,
      description: "消息卡片标题（简短）",
    },
    {
      name: "content",
      label: "消息内容",
      type: "string",
      required: true,
      description: "Markdown 格式的消息正文",
    },
    {
      name: "link",
      label: "操作链接",
      type: "string",
      required: false,
      description: "可选的跳转链接（如确认/查看详情页面）",
    },
    {
      name: "styleId",
      label: "款式 ID",
      type: "string",
      required: false,
    },
    {
      name: "suggestionId",
      label: "建议 ID",
      type: "string",
      required: false,
    },
  ],
  execute: async (params) => {
    const { title, content, link, styleId, suggestionId } = params as {
      title: string;
      content: string;
      link?: string;
      styleId?: string;
      suggestionId?: string;
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 如果没有显式传 link，根据 suggestionId 自动生成确认链接
    const actionLink =
      link ||
      (suggestionId
        ? `${appUrl}/ai-review?suggestion=${suggestionId}`
        : styleId
          ? `${appUrl}/styles/${styleId}`
          : undefined);

    const sent = await sendViaWebhook(title, content, {
      styleId,
      suggestionId,
      link: actionLink,
    });

    return {
      success: sent,
      error: sent ? undefined : "飞书消息发送失败（可能是 Webhook 未配置）",
      actionUrl: actionLink,
    };
  },
};

// 注册 Skill
registerSkill(sendLarkMessageSkill);
