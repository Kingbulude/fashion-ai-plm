// 主题企划助手 Skill Handler
// 基于季节、品牌和现有款式生成主题企划方向

import { AISkillHandler, SkillContext, SkillOutput } from "./types";

function parseJsonSafe(raw: string): any {
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export const themePlannerHandler: AISkillHandler = {
  key: "theme-planner",
  name: "主题企划助手",
  description: "基于季节、品牌和现有款式生成主题企划方向",
  processNode: "planning",

  async buildContext(ctx: SkillContext, userMessage: string) {
    const { supabase, seasonId, companyId } = ctx;

    let seasonInfo = "";
    let planningInfo = "";
    let stylesInfo = "";

    if (seasonId) {
      const { data: season } = await supabase
        .from("seasons")
        .select("name, year, season_type, start_date, end_date")
        .eq("id", seasonId)
        .single();
      if (season) {
        seasonInfo = `季节：${season.name}（${season.year}${season.season_type}）\n`;
      }

      const { data: plannings } = await supabase
        .from("planning")
        .select("title, description, target_audience, themes")
        .eq("season_id", seasonId)
        .eq("company_id", companyId)
        .limit(3);
      if (plannings && plannings.length > 0) {
        planningInfo =
          "现有企划：\n" +
          plannings.map((p) => `- ${p.title || ""}: ${p.description || ""}`).join("\n") +
          "\n";
      }

      const { data: styles } = await supabase
        .from("styles")
        .select("name, category, description")
        .eq("season_id", seasonId)
        .limit(10);
      if (styles && styles.length > 0) {
        stylesInfo =
          "已有款式：\n" + styles.map((s) => `- ${s.name}（${s.category || ""}）`).join("\n") + "\n";
      }
    }

    return [
      "你是服装品牌企划专家。请基于以下信息生成主题企划方向。",
      "",
      seasonInfo,
      planningInfo,
      stylesInfo,
      `用户补充需求：${userMessage}`,
      "",
      "请严格以 JSON 格式输出，包含字段 themes（数组，每个主题包含 name, concept, categories, colors, fabrics, reasoning）。",
    ]
      .filter(Boolean)
      .join("\n");
  },

  parseOutput(raw: string): SkillOutput {
    const parsed = parseJsonSafe(raw);
    if (!parsed || !Array.isArray(parsed.themes)) {
      return {
        summary: "AI 返回了非结构化内容，以下是原始回复：",
        data: { raw },
      };
    }
    return {
      summary: `已生成 ${parsed.themes.length} 个主题方向`,
      data: parsed,
      actions: [
        {
          label: "写入企划备注",
          action: "append_planning_note",
          payload: { note: parsed.themes },
        },
      ],
    };
  },
};
