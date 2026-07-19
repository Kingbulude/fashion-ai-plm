// 工艺单生成 Skill
// AI 根据款式信息自动生成工艺包（尺寸表、工艺说明、缝制标准、印花绣花、BOM建议）
// 直接调用已有的 cloudflare-ai.ts 的 generateTechPack

import { SkillDefinition, SkillRiskLevel } from "../types";
import { registerSkill } from "../registry";
import { generateTechPack } from "@/lib/ai/cloudflare-ai";
import { dbAdmin } from "@/lib/db/client";
import { safeJsonParse } from "@/lib/pipeline/steps";

const generateTechPackSkill: SkillDefinition = {
  id: "generate-tech-pack",
  name: "AI 生成工艺单",
  description:
    "根据款式名称和描述，AI 自动生成工艺包内容（尺寸表、工艺说明、缝制标准、印花绣花、BOM建议），并写入 tech_packs 表。",
  riskLevel: SkillRiskLevel.AUTO,
  params: [
    {
      name: "styleId",
      label: "款式 ID",
      type: "string",
      required: true,
    },
    {
      name: "styleName",
      label: "款式名称",
      type: "string",
      required: true,
    },
    {
      name: "description",
      label: "款式描述",
      type: "string",
      required: false,
    },
  ],
  execute: async (params) => {
    const { styleId, styleName, description } = params as {
      styleId: string;
      styleName: string;
      description?: string;
    };

    try {
      // 调用 AI 生成工艺包
      const rawResult = await generateTechPack(styleName, description || "");
      const techPack = safeJsonParse(rawResult);

      if (!techPack) {
        return {
          success: false,
          error: "AI 工艺包输出解析失败",
        };
      }

      // 写入 tech_packs 表
      const { data, error } = await dbAdmin
        .from("tech_packs")
        .insert({
          style_id: styleId,
          version: 1,
          size_chart: techPack.sizeChart || null,
          process_notes: techPack.processNotes || null,
          sewing_standard: techPack.sewingStandard || null,
          print_embroidery: techPack.printEmbroidery || null,
          ai_generated: true,
          approved: false,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `写入工艺包失败：${error.message}`,
        };
      }

      return {
        success: true,
        data: {
          techPackId: data?.id,
          version: 1,
          bomSuggestion: techPack.bomSuggestion || [],
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `工艺单生成异常：${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};

registerSkill(generateTechPackSkill);
