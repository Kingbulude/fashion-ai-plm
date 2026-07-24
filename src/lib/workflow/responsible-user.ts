// 工序节点负责人解析
// 规则：
// 1. 正向/关键流程：由目标节点的主管负责
// 2. 反馈流程（如售后→企划）：由起始节点的主管负责
// 3. 未设置主管时，回退到当前品牌负责人（brand_manager）
// 4. 仍无时，返回 null（调用方可继续使用触发人兜底）

import { supabase } from "@/lib/db/client";
import { RoleLevel } from "@/lib/auth/rbac";

interface ResponsibleUserResult {
  userId: string;
  name: string;
  role: string;
  source: "process_owner" | "brand_manager" | "fallback";
}

/**
 * 根据工序节点解析负责人
 * @param node 工序节点ID，如 planning / design / aftersales
 * @param brandId 当前品牌ID
 * @returns 负责人信息，未找到返回 null
 */
export async function resolveResponsibleUserByNode(
  node: string,
  brandId?: string | null
): Promise<ResponsibleUserResult | null> {
  if (!node) return null;

  // 1. 查找覆盖该节点的工序主管类型
  const { data: scopes } = await supabase
    .from("process_owner_scopes")
    .select("id, key, name, process_nodes")
    .eq("is_active", true);

  const matchedScope = (scopes || []).find(
    (s) => Array.isArray(s.process_nodes) && s.process_nodes.includes(node)
  );

  if (matchedScope) {
    // 2. 查找该主管类型下、对应当前品牌的负责人
    let assignmentQuery = supabase
      .from("user_process_owner_scopes")
      .select("user_id")
      .eq("scope_id", matchedScope.id);

    if (brandId) {
      assignmentQuery = assignmentQuery.or(`brand_id.eq.${brandId},brand_id.is.null`);
    } else {
      assignmentQuery = assignmentQuery.is("brand_id", null);
    }

    const { data: assignments } = await assignmentQuery.limit(1);
    const assignment = assignments?.[0];

    if (assignment?.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("user_id", assignment.user_id)
        .single();

      if (profile?.name) {
        return {
          userId: profile.user_id,
          name: profile.name,
          role: matchedScope.name || "主管",
          source: "process_owner",
        };
      }
    }
  }

  // 3. 回退到品牌负责人
  return resolveBrandManager(brandId);
}

/**
 * 解析流程连线的负责人
 * @param fromNode 起始节点
 * @param toNode 目标节点
 * @param linkType 连线类型：critical / parallel / feedback
 * @param brandId 当前品牌ID
 */
export async function resolveResponsibleUserByLink(
  fromNode: string,
  toNode: string,
  linkType: string,
  brandId?: string | null
): Promise<ResponsibleUserResult | null> {
  const responsibleNode = linkType === "feedback" ? fromNode : toNode;
  return resolveResponsibleUserByNode(responsibleNode, brandId);
}

async function resolveBrandManager(brandId?: string | null): Promise<ResponsibleUserResult | null> {
  // 优先从 user_brands 中查找当前品牌的 brand_manager
  if (brandId) {
    const { data: userBrand } = await supabase
      .from("user_brands")
      .select("user_id")
      .eq("brand_id", brandId)
      .eq("role_level", RoleLevel.BRAND_MANAGER)
      .limit(1);

    const userId = userBrand?.[0]?.user_id;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("user_id", userId)
        .single();

      if (profile?.name) {
        return {
          userId: profile.user_id,
          name: profile.name,
          role: "品牌负责人",
          source: "brand_manager",
        };
      }
    }
  }

  // 其次从 profiles 中查找 brand_manager 且 brand_id 匹配
  let profileQuery = supabase
    .from("profiles")
    .select("user_id, name")
    .eq("role_level", RoleLevel.BRAND_MANAGER);

  if (brandId) {
    profileQuery = profileQuery.or(`brand_id.eq.${brandId},brand_id.is.null`);
  } else {
    profileQuery = profileQuery.is("brand_id", null);
  }

  const { data: profile } = await profileQuery.limit(1).single();

  if (profile?.name) {
    return {
      userId: profile.user_id,
      name: profile.name,
      role: "品牌负责人",
      source: "brand_manager",
    };
  }

  return null;
}
