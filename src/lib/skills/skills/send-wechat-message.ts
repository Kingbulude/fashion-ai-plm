// 微信通信 Skill
//
// 通过企业微信群机器人 Webhook 发送消息
// 后续可扩展企业微信应用 API（私聊、审批集成等）

import { SkillDefinition, SkillRiskLevel } from "../types";
import { registerSkill } from "../registry";

const WECHAT_WEBHOOK_URL = process.env.WECHAT_WEBHOOK_URL || "";

// ─── 发送企业微信消息 ───
async function sendViaWebhook(
  content: string,
  mentionedList: string[] = []
): Promise<boolean> {
  if (!WECHAT_WEBHOOK_URL) {
    console.warn("[wechat] WECHAT_WEBHOOK_URL 未配置，跳过发送");
    return false;
  }

  const body = {
    msgtype: "markdown",
    markdown: {
      content,
      mentioned_list: mentionedList, // ["@all"] 或 ["userId1", "userId2"]
    },
  };

  try {
    const response = await fetch(WECHAT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(
        `[wechat] webhook 发送失败: ${response.status}`,
        await response.text()
      );
      return false;
    }

    const result = await response.json();
    if (result.errcode !== 0) {
      console.error(`[wechat] webhook 返回错误:`, result.errmsg);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[wechat] webhook 异常:", err);
    return false;
  }
}

// ─── Skill 定义：发送微信消息 ───
const sendWechatMessageSkill: SkillDefinition = {
  id: "send-wechat-message",
  name: "发送微信消息",
  description: "通过企业微信群机器人发送 Markdown 消息。用于简短通知、进度同步、催促提醒。",
  riskLevel: SkillRiskLevel.AUTO,
  params: [
    {
      name: "content",
      label: "消息内容",
      type: "string",
      required: true,
      description: "Markdown 格式的消息正文",
    },
    {
      name: "mentionAll",
      label: "@所有人",
      type: "boolean",
      required: false,
      description: "是否 @所有人",
      defaultValue: false,
    },
  ],
  execute: async (params) => {
    const { content, mentionAll } = params as {
      content: string;
      mentionAll?: boolean;
    };

    const mentionedList = mentionAll ? ["@all"] : [];
    const sent = await sendViaWebhook(content, mentionedList);

    return {
      success: sent,
      error: sent
        ? undefined
        : "微信消息发送失败（可能是 Webhook 未配置）",
    };
  },
};

// 注册 Skill
registerSkill(sendWechatMessageSkill);
