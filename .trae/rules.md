# TRAE 自验证规则（Auto Verification Rules）

> **核心原则：能自己做的，绝不抛给用户。**
> 本文件定义了所有修改完成后必须由 Agent 自动完成的自验证流程与硬性规则。

---

## 0. 最高原则

| 原则 | 说明 |
|------|------|
| **自验证优先** | 凡是 Agent 在沙箱内能执行的验证步骤（类型检查、构建、启动服务、curl 页面、调用 API、解析 HTML），必须**全部由 Agent 自动完成**，不能省略、不能跳过、不能仅口头承诺。 |
| **失败即阻断** | 任何一步验证不通过 → 立即修复 → 重新验证 → 通过后才进入下一环节。**严禁"先提交再修"**。 |
| **透明报告** | 验证结果必须显式输出（PASS/FAIL/WARN），让用户能一眼看到当前代码状态。 |
| **白屏零容忍** | 任何能导致白屏的问题（未定义变量、缺 import、拼写错误、占位 URL）都必须被规则拦截。 |

---

## 1. 修改后强制执行的验证流程

每次完成代码修改后，**严格按照以下顺序**执行验证：

### 1.1 TypeScript 类型检查（必做，无绕过）

```bash
cd /workspace
npx tsc --noEmit
```

- ✅ 通过 → 进入下一步
- ❌ 失败 → **立即停止**，修复所有错误后重跑
- **绝对禁止**用 `// @ts-ignore`、`any`、注释掉错误等方式绕过

### 1.2 Next.js 构建检查（必做）

```bash
cd /workspace
npm run build
```

- ✅ 构建成功 → 进入下一步
- ❌ 失败 → 修复后重跑
- 注意：Cloudflare 部署使用 `npx @cloudflare/next-on-pages`，但本地构建以 `next build` 为准

### 1.3 启动本地服务并验证页面（必做）

```bash
# 启动 next start（后台）
nohup npx next start -p 3000 > /tmp/next.log 2>&1 &
NEXT_PID=$!
sleep 8

# 验证关键页面（HTTP 200 + HTML 包含预期关键字）
for path in / /dashboard /styles /todos /analytics /suppliers /production /brands /ai-review; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  if [ "$HTTP_CODE" != "200" ]; then
    echo "FAIL: $path returned $HTTP_CODE"
  fi
done

# 验证 API 端点
for api in /api/styles /api/todos /api/brands /api/production /api/ai-review; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$api")
  echo "API $api -> $HTTP_CODE"
done

# 关闭服务
kill $NEXT_PID 2>/dev/null
```

- ✅ 所有页面返回 200 → 进入下一步
- ⚠️ 某个页面返回 500/404 → **必须修复**（可能是数据问题、占位 URL、env 缺失）
- 💡 API 返回 4xx 通常是正常的（认证/数据缺失），但 5xx 视为错误

### 1.4 白屏检测（必做）

```bash
# 检查返回的 HTML 是否包含 React 根节点 + 实际内容
HTML=$(curl -s "http://localhost:3000/dashboard")
echo "$HTML" | grep -q '<div id="__next"' || echo "$HTML" | grep -q 'data-reactroot' || echo "WARN: 可能的白屏"
echo "$HTML" | grep -q 'Application error' && echo "FAIL: Application error"
echo "$HTML" | grep -q 'Internal Server Error' && echo "FAIL: Internal Server Error"
```

### 1.5 环境变量与占位 URL 检测（必做）

```bash
# 检测占位 URL（会导致无限重试/CPU 死锁）
grep -rn "placeholder.supabase.co" src/ app/ 2>/dev/null && echo "FAIL: 发现占位 Supabase URL"
grep -rn "your-supabase-url\|your-anon-key" src/ app/ 2>/dev/null && echo "FAIL: 发现占位环境变量"
```

---

## 2. Git 流程（强制）

### 2.1 分支策略

- 所有修改最终**必须**合并到 `main` 分支
- 禁止只在临时分支（如 `trae/agent-*`）上提交而不合并
- 改完后流程：
  ```bash
  git checkout main
  git merge <当前分支> --no-ff
  ```

### 2.2 推送远程

- 合并到 main 后**必须**推送：
  ```bash
  git push origin main
  ```
- **必须明确告知用户**：「已推送到 main 分支，等待部署」

### 2.3 部署提醒

- 推送后必须提醒用户：
  - 部署平台（Cloudflare Pages / Vercel / Netlify 等）
  - 预计等待时间（通常 2-3 分钟）
  - 部署完成后用户可访问的 URL

---

## 3. 类型安全硬性约束（防白屏）

### 3.1 变量必须显式导入

- ❌ **禁止**：直接使用未导入的变量
- ❌ **禁止**：依赖全局变量
- ❌ **禁止**：用 `any` 绕过类型检查
- ✅ **必须**：所有依赖显式 `import`
- ✅ **必须**：`tsc --noEmit` 通过

### 3.2 Supabase 数据返回类型处理

由于 `toCamelCase` 可能返回 `null` 或 `unknown`，所有数据列表必须用以下模式：

```typescript
const rawItems = toCamelCase(data);
const items: any[] = Array.isArray(rawItems) ? rawItems : [];
```

### 3.3 Object.entries 类型断言

```typescript
Object.entries(stats.stageStats as Record<string, number>)
```

---

## 4. 组件开发规范

| 项 | 规则 |
|----|------|
| 变量导入 | 文件顶部必须有对应 `import` |
| 全局依赖 | 禁止依赖全局变量，必须显式导入 |
| `any` 使用 | 禁止用 `any` 绕过类型检查（数据处理中转型除外） |
| 未定义变量 | 禁止使用，tsc 会拦截 |
| 拼写错误 | tsc 会拦截 |
| 死代码 | 立即删除，不要 `// removed` 注释 |

---

## 5. 部署前最终检查清单（Checklist）

- [ ] `npx tsc --noEmit` 通过
- [ ] `npm run build` 通过
- [ ] `next start` 启动成功
- [ ] 所有关键页面 curl 返回 200
- [ ] API 端点至少返回非 5xx 状态
- [ ] 无占位 URL / 占位环境变量
- [ ] 无白屏（HTML 含实际内容，无 "Application error"）
- [ ] 已合并到 main 分支
- [ ] 已推送到 origin/main
- [ ] 已告知用户「等待部署」

---

## 6. 自验证脚本

执行一键验证：

```bash
bash /workspace/.trae/verify.sh
```

脚本会依次执行：tsc → build → start → curl → 白屏检测 → 占位检测。

---

## 7. 限制与免责

以下事项**无法**由 Agent 自动验证，必须由用户或部署环境提供：

- **真实 Supabase 凭据**：Agent 在沙箱内没有 Supabase 项目的 URL/Key
- **Cloudflare 部署状态**：需要登录 Cloudflare Dashboard 查看
- **真实业务数据**：需要生产数据库连接
- **跨浏览器兼容性**：仅在沙箱内单一 Chrome/Node 环境

对于这些限制，Agent 必须：
1. 主动告知用户「以下项目需要你配置/确认」
2. 给出具体的配置步骤或排查路径
3. 绝不假装已验证

---

## 8. 违规处理

| 违规 | 处理 |
|------|------|
| 跳过 tsc | 视为严重违规，必须立即补做 |
| 跳过 build | 视为严重违规 |
| 跳过页面验证 | 视为严重违规 |
| 用 `any` 绕过类型 | 视为严重违规，必须改回 |
| 未导入变量导致的白屏 | 视为严重违规 |
| 未合并 main 直接推送 | 视为严重违规 |
| 未推送却告知用户已推送 | 视为严重违规 |

---

**最后更新**：2026-07-21
**适用范围**：本项目所有 Next.js 15 + TypeScript + Supabase 代码
