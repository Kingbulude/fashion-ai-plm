// 库存盘活 Skill Handler
// 识别滞销款并给出促销、返单或下架建议

import { AISkillHandler, SkillContext, SkillOutput } from "./types";

function parseJsonSafe(raw: string): any {
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function calcSellThrough(sales: number, inventory: number) {
  if (!inventory) return 0;
  return Math.round((sales / inventory) * 1000) / 10;
}

export const inventoryActivationHandler: AISkillHandler = {
  key: "inventory-activation",
  name: "库存盘活",
  description: "识别滞销款并给出促销、返单或下架建议",
  processNode: "sales",

  async buildContext(ctx: SkillContext, userMessage: string) {
    const { supabase, seasonId, companyId } = ctx;

    let stylesInfo = "";

    if (seasonId) {
      const { data: styles } = await supabase
        .from("styles")
        .select("id, name, category, target_price")
        .eq("season_id", seasonId)
        .eq("company_id", companyId);

      if (styles && styles.length > 0) {
        const styleIds = styles.map((s) => s.id);
        const { data: sales } = await supabase
          .from("sales_records")
          .select("style_id, quantity, revenue")
          .in("style_id", styleIds);

        const { data: inventories } = await supabase
          .from("inventory_records")
          .select("style_id, quantity")
          .in("style_id", styleIds);

        const salesMap = new Map<string, number>();
        (sales || []).forEach((r) => {
          salesMap.set(r.style_id, (salesMap.get(r.style_id) || 0) + (r.quantity || 0));
        });

        const invMap = new Map<string, number>();
        (inventories || []).forEach((r) => {
          invMap.set(r.style_id, (invMap.get(r.style_id) || 0) + (r.quantity || 0));
        });

        stylesInfo = styles
          .map((s) => {
            const sold = salesMap.get(s.id) || 0;
            const inv = invMap.get(s.id) || 0;
            const st = calcSellThrough(sold, inv + sold);
            return `- ${s.name}（${s.category || ""}）：销量 ${sold}，库存 ${inv}，售罄率 ${st}%`;
          })
          .join("\n");
      }
    }

    return [
      "你是库存与商品运营专家。请根据以下款式销售/库存数据，识别滞销款并给出促销、返单、调拨或下架建议。",
      "",
      stylesInfo || "（暂无具体款式数据，请基于通用经验给出建议）",
      "",
      `用户补充需求：${userMessage}`,
      "",
      "请严格以 JSON 格式输出，包含字段 underperformers（数组，每个元素包含 styleId, name, inventoryDays, sellThrough, suggestion, expectedEffect）。",
    ]
      .filter(Boolean)
      .join("\n");
  },

  parseOutput(raw: string): SkillOutput {
    const parsed = parseJsonSafe(raw);
    if (!parsed || !Array.isArray(parsed.underperformers)) {
      return {
        summary: "AI 返回了非结构化内容：",
        data: { raw },
      };
    }
    return {
      summary: `识别到 ${parsed.underperformers.length} 款滞销款`,
      data: parsed,
      actions: parsed.underperformers.slice(0, 3).map((item: any) => ({
        label: `为「${item.name}」创建促销待办`,
        action: "create_todo",
        payload: { title: `促销：${item.name}`, description: item.suggestion },
      })),
    };
  },
};
