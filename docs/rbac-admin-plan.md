# 后台权限管理（RBAC）计划文档

## 背景
StyleForge 目前使用 Supabase Auth 做邮箱/密码登录，但缺少一个总控制后台。用户需要一个"超级管理员"角色，可以为其他人开通账号并分配功能权限，且权限按品牌隔离。

## 目标
1. 建立统一的身份与权限体系（RBAC）。
2. 提供一个"后台管理"入口，供超级管理员/品牌管理员管理成员。
3. 支持按品牌（brand_id）隔离数据，同一品牌内的成员共享数据。
4. 未登录用户访问受保护页面时自动跳转到登录页。

## 角色设计

| 角色 | 英文名 | 权限范围 | 典型使用人 |
|------|--------|----------|------------|
| 超级管理员 | super_admin | 创建/管理品牌、管理所有品牌管理员、查看全局数据 | 平台运营/创始人 |
| 品牌管理员 | brand_admin | 管理本品牌成员、分配角色、查看/编辑本品牌全部数据 | 品牌主理人 |
| 企划经理 | planning_manager | 企划中心、知识库、AI Skill 全部权限 | 企划负责人 |
| 设计师 | designer | 款式设计、工艺包、BOM、打样相关 | 设计人员 |
| 采购专员 | procurement_specialist | 供应商、采购订单、物料管理 | 采购人员 |
| 生产专员 | production_specialist | 生产排期、质检、入库、备货管理 | 生产人员 |
| 销售专员 | sales_specialist | 测款结果、销售数据、售后反馈查看 | 销售人员 |
| 只读成员 | viewer | 仅查看本品牌数据，不可编辑 | 外部协作者 |

## 权限矩阵（模块级别）

| 模块 | super_admin | brand_admin | planning_manager | designer | procurement_specialist | production_specialist | sales_specialist | viewer |
|------|:-----------:|:-----------:|:----------------:|:--------:|:----------------------:|:---------------------:|:----------------:|:------:|
| 总后台（品牌/成员管理） | 读写 | 读成员 | - | - | - | - | - | - |
| 首页 PERT 图 | 读 | 读写 | 读写 | 读 | 读 | 读 | 读 | 读 |
| 企划中心 | 读 | 读写 | 读写 | 读 | - | - | 读 | 读 |
| 设计/款式 | 读 | 读写 | 读 | 读写 | 读 | 读 | 读 | 读 |
| 采购中心 | 读 | 读写 | 读 | 读 | 读写 | 读 | 读 | 读 |
| 生产/备货 | 读 | 读写 | 读 | 读 | 读 | 读写 | 读 | 读 |
| 销售/售后 | 读 | 读写 | 读 | - | - | - | 读写 | 读 |

> "读写"包含查看和编辑；"读"仅查看；"-"无权限或隐藏入口。

## 数据模型扩展

### 1. brands（品牌表）
```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. brand_members（品牌成员关联表）
```sql
CREATE TABLE brand_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'active', -- active / invited / disabled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, user_id)
);
```

### 3. 现有业务表增加 brand_id
所有业务表（styles、process_links、process_nodes、color_trends 等）统一增加 `brand_id` 字段，并在 RLS 策略中按 `brand_id` 过滤。

## 后台管理功能

### 1. 品牌管理（仅 super_admin）
- 创建品牌
- 编辑品牌信息
- 指定品牌管理员
- 查看品牌列表

### 2. 成员管理（super_admin / brand_admin）
- 邀请新成员（输入邮箱，选择角色）
- 发送邀请邮件（或生成邀请链接）
- 修改成员角色
- 启用/禁用成员
- 移除成员

### 3. 个人中心（所有登录用户）
- 修改个人信息
- 修改密码
- 查看所属品牌

## 技术实现要点

1. **认证**：继续使用 Supabase Auth。
2. **鉴权**：
   - 前端：通过 `brand_members` 查询当前用户角色，控制菜单和按钮显示。
   - 后端：所有 API 通过 `supabase.auth.getUser()` 获取 user_id，再查 `brand_members` 验证权限。
   - 数据库：RLS 策略按 `brand_id` + 用户角色过滤。
3. **邀请流程**：
   - brand_admin 输入邮箱 → 调用 Edge Function / API 创建 auth.users（临时密码）+ brand_members 记录。
   - 发送邮件通知用户设置密码（可用 Supabase 邮件模板或自定义邮件服务）。
4. **默认品牌**：
   - 注册第一个账号时，自动创建默认品牌并设为 brand_admin。
   - 已有账号登录后，如果没有 brand_members 记录，可引导加入或创建品牌。

## 开发优先级

1. P0：数据表扩展（brands、brand_members）和 RLS 策略。
2. P0：登录/登出/受保护路由中间件。
3. P1：后台管理页面（品牌管理、成员管理）。
4. P1：现有业务表增加 brand_id 并按品牌隔离。
5. P2：角色控制前端菜单和按钮显隐。
6. P2：邀请邮件/链接流程优化。

## 待决策事项

- 是否允许一个用户同时属于多个品牌？
- 邀请新成员时，如果对方已有账号，是自动加入还是发送确认邮件？
- 是否需要操作日志（谁邀请了谁、角色变更记录）？
