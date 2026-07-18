import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function GET() {
  try {
    const { data: brands, error } = await supabase.from("brands").select("*");
    if (error || !brands) {
      return NextResponse.json(
        [{ id: "00000000-0000-0000-0000-000000000001", name: "TEPNIX步戌" }],
        { status: 200 }
      );
    }
    return NextResponse.json(brands);
  } catch (error) {
    return NextResponse.json(
      [{ id: "00000000-0000-0000-0000-000000000001", name: "TEPNIX步戌" }],
      { status: 200 }
    );
  }
}
