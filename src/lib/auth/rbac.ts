// RBAC 权限系统定义

// 角色层级枚举
export enum RoleLevel {
  BOSS = "boss",                    // 老板（全权限）
  ADMIN = "admin",                  // 公司管理员
  BRAND_MANAGER = "brand_manager",  // 品牌负责人
  PROCESS_OWNER = "process_owner",  // 工序负责人
  EXECUTOR = "executor",            // 执行者
}

// 角色中文显示名
export const RoleLevelLabels: Record<string, string> = {
  [RoleLevel.BOSS]: "老板",
  [RoleLevel.ADMIN]: "公司管理员",
  [RoleLevel.BRAND_MANAGER]: "品牌负责人",
  [RoleLevel.PROCESS_OWNER]: "工序负责人",
  [RoleLevel.EXECUTOR]: "执行者",
};

// 工序枚举
export enum ProcessNode {
  PLANNING = "planning",       // 企划
  DESIGN = "design",           // 设计
  SAMPLING = "sampling",       // 打样
  TESTING = "testing",         // 测款
  PROCUREMENT = "procurement", // 采购
  STOCKING = "stocking",       // 备货
  SALES = "sales",             // 销售
  AFTERSALES = "aftersales",   // 售后
}

// 权限动作枚举
export enum Permission {
  VIEW = "view",         // 查看
  EDIT = "edit",         // 编辑
  DELETE = "delete",     // 删除
  EXPORT = "export",     // 导出
  ASSIGN = "assign",     // 分配权限
  APPROVE = "approve",   // 审批
}

// 角色权限矩阵
export const RolePermissions: Record<string, Permission[]> = {
  [RoleLevel.BOSS]: [
    Permission.VIEW, Permission.EDIT, Permission.DELETE,
    Permission.EXPORT, Permission.ASSIGN, Permission.APPROVE,
  ],
  [RoleLevel.ADMIN]: [
    Permission.VIEW, Permission.ASSIGN,
  ],
  [RoleLevel.BRAND_MANAGER]: [
    Permission.VIEW, Permission.EDIT, Permission.EXPORT, Permission.APPROVE,
  ],
  [RoleLevel.PROCESS_OWNER]: [
    Permission.VIEW, Permission.EDIT, Permission.EXPORT, Permission.APPROVE,
  ],
  [RoleLevel.EXECUTOR]: [
    Permission.VIEW, Permission.EDIT,
  ],
};

// 检查角色是否拥有权限
export function hasPermission(roleLevel: string, permission: Permission): boolean {
  const permissions = RolePermissions[roleLevel] || [];
  return permissions.includes(permission);
}

// 检查是否为管理角色（老板/管理员/品牌负责人）
export function isManagerRole(roleLevel: string): boolean {
  return [
    RoleLevel.BOSS,
    RoleLevel.ADMIN,
    RoleLevel.BRAND_MANAGER,
  ].includes(roleLevel as RoleLevel);
}

// 检查是否可以跨工序查看
export function canCrossProcess(roleLevel: string): boolean {
  return isManagerRole(roleLevel);
}

// 获取角色在AI架构中对应的级别
export function getAIRoleLevel(roleLevel: string): string {
  switch (roleLevel) {
    case RoleLevel.BOSS:
    case RoleLevel.BRAND_MANAGER:
      return "ai_master"; // AI总控
    case RoleLevel.PROCESS_OWNER:
      return "ai_specialist"; // AI工序专员
    case RoleLevel.EXECUTOR:
      return "ai_assistant"; // AI执行助手
    default:
      return "ai_assistant";
  }
}
