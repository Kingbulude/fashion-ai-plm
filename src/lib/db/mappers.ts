// 数据库字段映射工具：将 snake_case 转 camelCase（用于 API 返回前端的统一字段命名）

// 通用：将 snake_case 字符串转 camelCase
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// 通用：递归将对象的 key 从 snake_case 转 camelCase
export function toCamelCase<T>(row: unknown): T | null {
  if (row === null || row === undefined) return null;
  if (Array.isArray(row)) return row.map((r) => toCamelCase<T>(r)) as unknown as T;
  if (typeof row !== "object") return row as T;

  const obj = row as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamel(key);
    const value = obj[key];
    // 数组中的对象也递归处理
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
      result[camelKey] = value.map((v) => toCamelCase(v));
    } else if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      result[camelKey] = toCamelCase(value);
    } else {
      result[camelKey] = value;
    }
  }
  return result as T;
}
