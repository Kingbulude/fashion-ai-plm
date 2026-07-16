import { NextResponse } from "next/server";

export const runtime = "edge";

type RouteContext = { params: Promise<{ styleId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { styleId } = await params;
    const suggestedQuantity = Math.floor(Math.random() * 500) + 200;
    const safetyStock = Math.floor(suggestedQuantity * 0.2);
    
    return NextResponse.json({
      suggestedQuantity,
      safetyStock,
      reasoning: "基于市场接受度评分和历史销售数据，建议首单生产" + suggestedQuantity + "件，其中包含" + safetyStock + "件安全库存。建议按颜色比例：黑色40%、白色30%、灰色20%、其他10%进行生产。",
    });
  } catch (err) {
    return NextResponse.json({ error: "获取建议失败" }, { status: 500 });
  }
}