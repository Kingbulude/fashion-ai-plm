import { supabase } from "@/lib/db/client";

// 记录操作日志
export async function logOperation(params: {
  userId: string;
  companyId?: string | null;
  brandId?: string | null;
  action: string; // create/update/delete/export/login/permission_change
  targetTable: string;
  targetId?: string | null;
  beforeData?: any;
  afterData?: any;
  request?: Request;
}) {
  try {
    const ipAddress = params.request?.headers.get("x-forwarded-for") || null;
    const userAgent = params.request?.headers.get("user-agent") || null;

    await supabase.from("operation_logs").insert({
      user_id: params.userId,
      company_id: params.companyId || null,
      brand_id: params.brandId || null,
      action: params.action,
      target_table: params.targetTable,
      target_id: params.targetId || null,
      before_data: params.beforeData || null,
      after_data: params.afterData || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error("Failed to log operation:", error);
  }
}

// 记录数据版本
export async function recordVersion(params: {
  tableName: string;
  recordId: string;
  data: any;
  changedBy: string;
  changeReason?: string;
}) {
  try {
    // 获取当前最大版本号
    const { data: versions } = await supabase
      .from("data_versions")
      .select("version")
      .eq("table_name", params.tableName)
      .eq("record_id", params.recordId)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = (versions && versions.length > 0 ? versions[0].version : 0) + 1;

    await supabase.from("data_versions").insert({
      table_name: params.tableName,
      record_id: params.recordId,
      version: nextVersion,
      data: params.data,
      changed_by: params.changedBy,
      change_reason: params.changeReason || null,
    });
  } catch (error) {
    console.error("Failed to record version:", error);
  }
}

// 获取数据历史版本
export async function getVersions(tableName: string, recordId: string) {
  const { data, error } = await supabase
    .from("data_versions")
    .select("*")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("version", { ascending: false });

  if (error) return [];
  return data || [];
}
