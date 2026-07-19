// 采购单生成 Skill
// 根据 BOM + 供应商匹配结果，自动创建采购记录

import { SkillDefinition, SkillRiskLevel } from "../types";
import { registerSkill } from "../registry";
import { dbAdmin } from "@/lib/db/client";

interface SupplierMatch {
  bomItemName: string;
  supplierName: string;
  supplierId: string;
  estimatedPrice: number;
}

const generateProcurementOrderSkill: SkillDefinition = {
  id: "generate-procurement-order",
  name: "生成采购单",
  description:
    "根据 BOM 物料清单和 AI 供应商匹配结果，批量创建采购记录（material_procurement）。",
  riskLevel: SkillRiskLevel.CONFIRM, // 采购需要确认
  params: [
    {
      name: "styleId",
      label: "款式 ID",
      type: "string",
      required: true,
    },
    {
      name: "matches",
      label: "供应商匹配结果",
      type: "array",
      required: true,
      description: "AI 供应商匹配结果数组",
    },
    {
      name: "orderId",
      label: "生产订单 ID",
      type: "string",
      required: false,
    },
  ],
  execute: async (params) => {
    const { styleId, matches, orderId } = params as {
      styleId: string;
      matches: SupplierMatch[];
      orderId?: string;
    };

    try {
      // 获取 BOM 项
      const { data: bomItems } = await dbAdmin
        .from("bom_items")
        .select("*")
        .eq("style_id", styleId);

      if (!bomItems || bomItems.length === 0) {
        return { success: false, error: "款式无 BOM 物料" };
      }

      // 匹配 BOM 项和供应商
      const procurementRecords: Array<{
        style_id: string;
        bom_item_id: string;
        supplier_id: string | null;
        status: string;
        quantity: number;
        unit_price: number | null;
        order_date: string;
      }> = [];

      for (const match of matches) {
        const bomItem = bomItems.find(
          (b) => b.material_name === match.bomItemName
        );
        if (!bomItem) continue;

        procurementRecords.push({
          style_id: styleId,
          bom_item_id: bomItem.id,
          supplier_id: match.supplierId || null,
          status: "pending",
          quantity: Math.ceil(
            (Number(bomItem.unit_consumption) || 1) * 1.05 // 加 5% 损耗余量
          ),
          unit_price: match.estimatedPrice || bomItem.unit_price,
          order_date: new Date().toISOString().slice(0, 10),
        });
      }

      if (procurementRecords.length === 0) {
        return { success: false, error: "无匹配的 BOM-供应商对" };
      }

      // 批量写入
      const { data, error } = await dbAdmin
        .from("material_procurement")
        .insert(procurementRecords)
        .select();

      if (error) {
        return {
          success: false,
          error: `批量创建采购记录失败：${error.message}`,
        };
      }

      return {
        success: true,
        data: {
          createdCount: procurementRecords.length,
          procurementIds: (data || []).map((d: any) => d.id),
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `采购单生成异常：${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};

registerSkill(generateProcurementOrderSkill);
