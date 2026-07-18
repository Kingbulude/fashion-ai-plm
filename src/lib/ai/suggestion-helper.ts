import { supabase } from "@/lib/db/client";
import {
  AIRoleLevel,
  AISuggestionType,
  AISuggestionPriority,
  AISuggestionStatus,
  AISpecialistType,
  AIAssistantType,
  type AISuggestion,
} from "@/lib/ai/architecture";

// 创建AI建议（供现有AI API调用）
export async function createAISuggestion(params: {
  aiRoleLevel: AIRoleLevel;
  specialistType?: AISpecialistType;
  assistantType?: AIAssistantType;
  brandId?: string;
  processNode?: string;
  type: AISuggestionType;
  priority?: AISuggestionPriority;
  title: string;
  content: string;
  proposedData?: any;
  targetTable?: string;
  targetId?: string;
  expireAt?: string;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("ai_suggestions")
      .insert({
        ai_role_level: params.aiRoleLevel,
        specialist_type: params.specialistType || null,
        assistant_type: params.assistantType || null,
        brand_id: params.brandId || null,
        process_node: params.processNode || null,
        type: params.type,
        priority: params.priority || AISuggestionPriority.MEDIUM,
        title: params.title,
        content: params.content,
        proposed_data: params.proposedData || null,
        target_table: params.targetTable || null,
        target_id: params.targetId || null,
        status: AISuggestionStatus.PENDING,
        created_by: "ai_system",
        expire_at: params.expireAt || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create AI suggestion:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Failed to create AI suggestion:", error);
    return null;
  }
}

// 批量创建AI建议
export async function createAISuggestions(
  suggestions: Array<Parameters<typeof createAISuggestion>[0]>
): Promise<number> {
  let count = 0;
  for (const params of suggestions) {
    const id = await createAISuggestion(params);
    if (id) count++;
  }
  return count;
}

// 将AI分析结果转为建议
export async function analysisToSuggestion(
  analysis: string,
  params: {
    aiRoleLevel: AIRoleLevel;
    specialistType?: AISpecialistType;
    processNode?: string;
    brandId?: string;
    title: string;
  }
): Promise<string | null> {
  return createAISuggestion({
    ...params,
    type: AISuggestionType.ANALYSIS,
    priority: AISuggestionPriority.MEDIUM,
    content: analysis,
  });
}

// 将AI预测结果转为建议
export async function predictionToSuggestion(
  prediction: string,
  params: {
    aiRoleLevel: AIRoleLevel;
    specialistType?: AISpecialistType;
    processNode?: string;
    brandId?: string;
    title: string;
    proposedData?: any;
    targetTable?: string;
    targetId?: string;
  }
): Promise<string | null> {
  return createAISuggestion({
    ...params,
    type: AISuggestionType.PREDICTION,
    priority: AISuggestionPriority.HIGH,
    content: prediction,
    proposedData: params.proposedData,
    targetTable: params.targetTable,
    targetId: params.targetId,
  });
}

// 发送异常提醒
export async function sendAlert(
  alert: string,
  params: {
    aiRoleLevel: AIRoleLevel;
    specialistType?: AISpecialistType;
    processNode?: string;
    brandId?: string;
    title: string;
    priority?: AISuggestionPriority;
  }
): Promise<string | null> {
  return createAISuggestion({
    ...params,
    type: AISuggestionType.ALERT,
    priority: params.priority || AISuggestionPriority.CRITICAL,
    content: alert,
  });
}
