// 款式衍生 Skill Handler
// 基于参考图与约束生成多个款式方案 + BOM 草案

import { AISkillHandler, SkillContext, SkillOutput } from "./types";

function parseJsonSafe(raw: string): any {
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function extractReferenceImageUrl(message: string): string | undefined {
  // 支持 Markdown 图片 ![alt](url) 或裸 URL
  const markdownMatch = message.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);
  if (markdownMatch) return markdownMatch[1];
  const urlMatch = message.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif))/i);
  if (urlMatch) return urlMatch[1];
  return undefined;
}

export interface StyleDerivativeDesign {
  id: string;
  name: string;
  description: string;
  category?: string;
  referenceImageUrl?: string;
  targetPrice?: number;
  targetCost?: number;
  colors?: string[];
  tags?: string[];
  bom: {
    materialName: string;
    materialType: "fabric" | "accessory" | "packaging";
    specification?: string;
    unitConsumption: number;
    unitPrice?: number;
    totalCost?: number;
  }[];
}

export const styleDerivativeHandler: AISkillHandler = {
  key: "style-derivative",
  name: "款式衍生",
  description: "基于参考图与风格/面料/价格带约束生成多个款式方案与 BOM 草案",
  processNode: "design",

  async buildContext(ctx: SkillContext, userMessage: string) {
    const { supabase, seasonId, companyId, brandIds } = ctx;

    let seasonInfo = "";
    let brandInfo = "";
    let stylesInfo = "";
    let fabricsInfo = "";

    if (seasonId) {
      const { data: season } = await supabase
        .from("seasons")
        .select("name, year, season_type")
        .eq("id", seasonId)
        .single();
      if (season) {
        seasonInfo = `季节：${season.name}（${season.year}${season.season_type}）\n`;
      }
    }

    if (brandIds.length > 0) {
      const { data: brands } = await supabase
        .from("brands")
        .select("name")
        .in("id", brandIds)
        .limit(5);
      if (brands && brands.length > 0) {
        brandInfo = `品牌：${brands.map((b) => b.name).join("、")}\n`;
      }

      const { data: styles } = await supabase
        .from("styles")
        .select("name, category, description")
        .in("brand_id", brandIds)
        .eq(companyId ? "company_id" : "id", companyId || brandIds[0])
        .limit(8);
      if (styles && styles.length > 0) {
        stylesInfo =
          "本品牌已有款式：\n" + styles.map((s) => `- ${s.name}（${s.category || ""}）`).join("\n") + "\n";
      }

      const { data: fabrics } = await supabase
        .from("fabrics")
        .select("name, composition, price_per_meter")
        .in("brand_id", brandIds)
        .limit(8);
      if (fabrics && fabrics.length > 0) {
        fabricsInfo =
          "可用面料：\n" +
          fabrics.map((f) => `- ${f.name} ${f.composition ? "（" + f.composition + "）" : ""}`).join("\n") +
          "\n";
      }
    }

    const referenceImageUrl = extractReferenceImageUrl(userMessage);

    return [
      "你是资深服装设计师与商品企划专家。请基于以下参考图与约束，生成多个可落地的款式衍生方案。",
      "",
      brandInfo,
      seasonInfo,
      stylesInfo,
      fabricsInfo,
      referenceImageUrl ? `参考图 URL：${referenceImageUrl}` : "",
      `用户输入：${userMessage}`,
      "",
      "请严格以 JSON 格式输出，包含字段：",
      '- summary: 对生成方案的总体说明（字符串）',
      '- designs: 方案数组，每个方案包含 id（字符串，唯一标识）, name（方案名）, description（设计说明）, category（款式类别）, referenceImageUrl（参考图 URL，可复用用户输入）, targetPrice（建议零售价，数字）, targetCost（目标成本，数字）, colors（推荐色数组，每个元素是 hex 字符串）, tags（工艺/风格标签数组）, bom（BOM 草案数组，每个元素包含 materialName, materialType[fabric/accessory/packaging], specification, unitConsumption, unitPrice, totalCost）',
      "",
      "要求：",
      "1. 生成 3 个差异明显的方案（覆盖不同风格或面料组合）。",
      "2. 每个方案必须有清晰的商品定位与可执行 BOM。",
      "3. targetCost 与 targetPrice 必须合理，且 BOM 总成本不超过 targetCost。",
    ]
      .filter(Boolean)
      .join("\n");
  },

  parseOutput(raw: string): SkillOutput {
    const parsed = parseJsonSafe(raw);
    if (!parsed || !Array.isArray(parsed.designs)) {
      return {
        summary: "AI 返回了非结构化内容，以下是原始回复：",
        data: { raw },
      };
    }

    const designs: StyleDerivativeDesign[] = parsed.designs;
    return {
      summary: parsed.summary || `已生成 ${designs.length} 个款式衍生方案`,
      data: { designs },
      actions: designs.map((design) => ({
        label: `采纳「${design.name}」并创建款式草稿`,
        action: "adopt_design",
        payload: { designId: design.id },
      })),
    };
  },
};
