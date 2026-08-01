// 采纳 AI 建议中的某个设计方案
// 创建 styles 草稿、关联 design_assets、写入 bom_items、生成设计师待办

import { NextResponse } from "next/server";
import { requireApiAuth, withTenant } from "@/lib/auth/tenant-helpers";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

function generateStyleNo() {
  const ts = Date.now().toString(36).toUpperCase();
  return `AI-${ts}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;

    const { user, supabase, tenant } = ctx;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { designId } = body;

    if (!tenant.company_id || !tenant.brand_id) {
      return NextResponse.json({ error: "缺少公司或品牌上下文" }, { status: 400 });
    }

    // 读取 recommendation
    const { data: rec, error: recError } = await supabase
      .from("ai_recommendations")
      .select("*")
      .eq("id", id)
      .single();

    if (recError || !rec) {
      return NextResponse.json({ error: "建议不存在" }, { status: 404 });
    }

    const result = rec.result || {};
    const designs = Array.isArray(result.designs) ? result.designs : [];
    const design = designId
      ? designs.find((d: any) => d.id === designId)
      : designs[0];

    if (!design) {
      return NextResponse.json({ error: "未找到对应设计方案" }, { status: 400 });
    }

    const styleNo = generateStyleNo();
    const styleName = design.name || `${rec.process_node || "AI"}衍生款`;

    // 创建 styles 草稿
    const { data: style, error: styleError } = await supabase
      .from("styles")
      .insert(
        withTenant(
          {
            style_no: styleNo,
            name: styleName,
            category: design.category || null,
            description: design.description || null,
            target_cost: design.targetCost ? Number(design.targetCost) : null,
            status: "planning",
            ai_tags: {
              source: "style-derivative",
              recommendationId: id,
              designId: design.id,
              tags: design.tags || [],
            },
            ai_color_palette: design.colors || [],
            created_by: user.id,
          },
          tenant
        )
      )
      .select()
      .single();

    if (styleError || !style) {
      console.error("[adopt] 创建款式失败:", styleError);
      return NextResponse.json({ error: "创建款式失败" }, { status: 500 });
    }

    // 创建设计资产（ai_derivative）
    if (design.referenceImageUrl) {
      await supabase.from("design_assets").insert(
        withTenant(
          {
            style_id: style.id,
            type: "ai_derivative",
            file_name: `${styleName}.jpg`,
            file_url: design.referenceImageUrl,
            thumbnail_url: design.referenceImageUrl,
            ai_tags: {
              source: "style-derivative",
              designId: design.id,
            },
          },
          tenant
        )
      );
    }

    // 创建 BOM 草案
    const bomItems = Array.isArray(design.bom) ? design.bom : [];
    if (bomItems.length > 0) {
      const validTypes = ["fabric", "accessory", "packaging"];
      const bomInserts = bomItems
        .filter((item: any) => item && item.materialName && item.materialType)
        .map((item: any) =>
          withTenant(
            {
              style_id: style.id,
              material_name: item.materialName,
              material_type: validTypes.includes(item.materialType) ? item.materialType : "fabric",
              specification: item.specification || null,
              unit_consumption: Number(item.unitConsumption) || 1,
              loss_rate: 0,
              unit_price: item.unitPrice ? Number(item.unitPrice) : null,
              total_cost: item.totalCost ? Number(item.totalCost) : null,
              ai_suggested: true,
            },
            tenant
          )
        );

      if (bomInserts.length > 0) {
        const { error: bomError } = await supabase.from("bom_items").insert(bomInserts);
        if (bomError) {
          console.error("[adopt] 创建 BOM 失败:", bomError);
        }
      }
    }

    // 生成设计师待办
    await supabase.from("todos").insert(
      withTenant(
        {
          type: "task",
          title: `完善 AI 衍生款：${styleName}`,
          description: `AI 已根据建议 #${id} 生成款式草稿（款号 ${styleNo}），请设计师补充工艺细节并推进到设计阶段。`,
          target_table: "styles",
          target_id: style.id,
          priority: "medium",
          status: "pending",
          assigned_to: user.id,
          created_by: user.id,
        },
        tenant
      )
    );

    // 更新 recommendation 状态
    const { data: updatedRec, error: updateError } = await supabase
      .from("ai_recommendations")
      .update({ status: "adopted", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[adopt] 更新建议状态失败:", updateError);
    }

    // 更新 skill metrics
    await incrementSkillMetrics(supabase, rec.skill_id, tenant, "adopted");

    return NextResponse.json({
      recommendation: toCamelCase(updatedRec || rec),
      style: toCamelCase(style),
    });
  } catch (error: any) {
    console.error("[adopt] error:", error);
    return NextResponse.json({ error: error?.message || "采纳失败" }, { status: 500 });
  }
}

async function incrementSkillMetrics(
  supabase: any,
  skillId: string | null,
  tenant: { company_id: string; brand_id: string; season_id: string | null },
  action: "adopted" | "rejected" | "modified"
) {
  if (!skillId || !tenant.company_id || !tenant.brand_id) return;

  const { data: existing } = await supabase
    .from("ai_skill_metrics")
    .select("id, total_recommendations, adopted_count, rejected_count, modified_count")
    .eq("skill_id", skillId)
    .eq("company_id", tenant.company_id)
    .eq("brand_id", tenant.brand_id)
    .is("season_id", tenant.season_id || null)
    .maybeSingle();

  if (existing) {
    const updates: any = {
      total_recommendations: (existing.total_recommendations || 0) + 1,
    };
    if (action === "adopted") updates.adopted_count = (existing.adopted_count || 0) + 1;
    if (action === "rejected") updates.rejected_count = (existing.rejected_count || 0) + 1;
    if (action === "modified") updates.modified_count = (existing.modified_count || 0) + 1;

    await supabase.from("ai_skill_metrics").update(updates).eq("id", existing.id);
  } else {
    await supabase.from("ai_skill_metrics").insert({
      skill_id: skillId,
      company_id: tenant.company_id,
      brand_id: tenant.brand_id,
      season_id: tenant.season_id,
      total_recommendations: 1,
      adopted_count: action === "adopted" ? 1 : 0,
      rejected_count: action === "rejected" ? 1 : 0,
      modified_count: action === "modified" ? 1 : 0,
    });
  }
}
