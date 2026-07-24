import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { getTenantFromHeaders } from "@/lib/auth/tenant-helpers";
import { getSession } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 1) {
      return NextResponse.json({ styles: [], suppliers: [], todos: [] });
    }

    const tenant = getTenantFromHeaders(request);
    const brandId = tenant?.brand_id;

    if (!brandId) {
      return NextResponse.json({ styles: [], suppliers: [], todos: [] });
    }

    const results: { styles: any[]; suppliers: any[]; todos: any[] } = {
      styles: [],
      suppliers: [],
      todos: [],
    };

    try {
      const { data: styleData, error: styleErr } = await supabase
        .from("styles")
        .select("id, style_no, name, category, status, cover_image, target_cost")
        .eq("brand_id", brandId)
        .or(`style_no.ilike.%${q}%,name.ilike.%${q}%,category.ilike.%${q}%`)
        .order("updated_at", { ascending: false })
        .limit(8);

      if (!styleErr && styleData) {
        results.styles = (toCamelCase(styleData) as any[]) || [];
      }
    } catch (e) {
      console.warn("search styles failed:", e);
    }

    try {
      const { data: supplierData, error: supErr } = await supabase
        .from("suppliers")
        .select("id, name, type, contact, phone")
        .eq("company_id", tenant?.company_id || "")
        .or(`name.ilike.%${q}%,type.ilike.%${q}%,contact.ilike.%${q}%`)
        .order("updated_at", { ascending: false })
        .limit(6);

      if (!supErr && supplierData) {
        results.suppliers = (toCamelCase(supplierData) as any[]) || [];
      }
    } catch (e) {
      console.warn("search suppliers failed:", e);
    }

    try {
      const { data: todoData, error: todoErr } = await supabase
        .from("todos")
        .select("id, title, status, priority, due_date, target_table, target_id")
        .eq("brand_id", brandId)
        .ilike("title", `%${q}%`)
        .order("created_at", { ascending: false })
        .limit(6);

      if (!todoErr && todoData) {
        results.todos = (toCamelCase(todoData) as any[]) || [];
      }
    } catch (e) {
      console.warn("search todos failed:", e);
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("global search error:", err);
    return NextResponse.json({ styles: [], suppliers: [], todos: [] });
  }
}
