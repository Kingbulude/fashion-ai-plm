#!/usr/bin/env bash
# ============================================================
# TRAE Auto-Verify Script
# 自验证脚本：tsc + build + start + curl + 白屏检测
# ============================================================
# 用法：bash /workspace/.trae/verify.sh
# 退出码：0 = 全部通过；非 0 = 有失败
# ============================================================
set -u

ROOT="${1:-/workspace}"
cd "$ROOT" || exit 1

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
FAILED_STEPS=()

color() {
  local c="$1"; shift
  case "$c" in
    red)    echo -e "\033[31m$*\033[0m" ;;
    green)  echo -e "\033[32m$*\033[0m" ;;
    yellow) echo -e "\033[33m$*\033[0m" ;;
    blue)   echo -e "\033[34m$*\033[0m" ;;
    cyan)   echo -e "\033[36m$*\033[0m" ;;
    *)      echo "$*" ;;
  esac
}

step()  { color blue "\n▶ $1"; }
pass()  { color green "  ✓ $1"; PASS_COUNT=$((PASS_COUNT+1)); }
fail()  { color red   "  ✗ $1"; FAIL_COUNT=$((FAIL_COUNT+1)); FAILED_STEPS+=("$1"); }
warn()  { color yellow "  ⚠ $1"; WARN_COUNT=$((WARN_COUNT+1)); }

# ----------------------------------------------------------
# 0. 环境检查
# ----------------------------------------------------------
step "0. 环境检查"
if [ ! -f "package.json" ]; then
  fail "package.json 不存在，请确认工作目录正确"
  exit 1
fi
pass "package.json 存在"
if [ ! -d "node_modules" ]; then
  warn "node_modules 不存在，建议 npm install"
fi

# ----------------------------------------------------------
# 1. TypeScript 类型检查
# ----------------------------------------------------------
step "1. TypeScript 类型检查 (npx tsc --noEmit)"
if npx tsc --noEmit 2>&1 | tee /tmp/tsc.log | tail -n 50; then
  if [ -s /tmp/tsc.log ] && grep -qE "error TS[0-9]+" /tmp/tsc.log; then
    fail "TypeScript 检查发现错误，详见上方日志"
  else
    pass "TypeScript 检查通过"
  fi
else
  fail "TypeScript 检查命令执行失败"
fi

# ----------------------------------------------------------
# 2. 占位 URL / 占位环境变量检测（防白屏）
# ----------------------------------------------------------
step "2. 占位 URL / 占位环境变量检测"
PLACEHOLDER_HITS=$(grep -rn "placeholder.supabase.co" src/ app/ 2>/dev/null | grep -v node_modules | grep -v ".next/" || true)
if [ -n "$PLACEHOLDER_HITS" ]; then
  fail "发现占位 Supabase URL，会导致 next-server 死循环："
  echo "$PLACEHOLDER_HITS" | head -5
else
  pass "未发现占位 Supabase URL"
fi
PLACEHOLDER_ENV_HITS=$(grep -rnE "your-supabase-url|your-anon-key|placeholder-key" src/ app/ 2>/dev/null | grep -v node_modules | grep -v ".next/" | grep -v "app/api/health/route.ts" || true)
if [ -n "$PLACEHOLDER_ENV_HITS" ]; then
  fail "发现占位环境变量："
  echo "$PLACEHOLDER_ENV_HITS" | head -5
else
  pass "未发现占位环境变量"
fi

# ----------------------------------------------------------
# 3. Next.js 构建
# ----------------------------------------------------------
step "3. Next.js 构建 (npm run build)"
BUILD_LOG="/tmp/build.log"
if npm run build > "$BUILD_LOG" 2>&1; then
  if grep -qE "Failed to compile|error" "$BUILD_LOG"; then
    fail "构建报告错误，详见 $BUILD_LOG"
  else
    pass "Next.js 构建成功"
  fi
else
  fail "Next.js 构建失败，详见 $BUILD_LOG"
fi

# ----------------------------------------------------------
# 4. 启动 next start 并验证页面
# ----------------------------------------------------------
step "4. 启动 next start 并验证页面/API"

# 清理可能残留的进程
pkill -f "next start" 2>/dev/null || true
sleep 1

nohup npx next start -p 3000 > /tmp/next.log 2>&1 &
NEXT_PID=$!
sleep 10

# 检查进程是否还活着
if ! kill -0 $NEXT_PID 2>/dev/null; then
  fail "next start 启动失败，查看 /tmp/next.log："
  tail -20 /tmp/next.log
else
  pass "next start 已启动 (PID=$NEXT_PID)"

  # 验证页面
  PAGES=( "/" "/dashboard" "/styles" "/todos" "/analytics" "/suppliers" "/production" "/brands" "/ai-review" )
  for p in "${PAGES[@]}"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:3000$p" 2>/dev/null || echo "000")
    if [ "$CODE" = "200" ]; then
      pass "页面 $p -> 200"
    elif [ "$CODE" = "000" ]; then
      fail "页面 $p -> 无响应（超时）"
    else
      warn "页面 $p -> $CODE（非 200，请人工检查）"
    fi
  done

  # 验证 API
  APIS=( "/api/styles" "/api/todos" "/api/brands" "/api/production" "/api/ai-review" )
  for a in "${APIS[@]}"; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:3000$a" 2>/dev/null || echo "000")
    if [ "$CODE" = "200" ] || [ "$CODE" = "401" ] || [ "$CODE" = "400" ]; then
      pass "API $a -> $CODE（业务正常）"
    elif [ "$CODE" = "500" ]; then
      fail "API $a -> 500（服务器错误，需修复）"
    else
      warn "API $a -> $CODE"
    fi
  done

  # 白屏检测
  step "5. 白屏检测"
  for p in "/dashboard" "/styles"; do
    HTML=$(curl -s --max-time 10 "http://localhost:3000$p" 2>/dev/null || echo "")
    if echo "$HTML" | grep -q "Application error\|Internal Server Error\|500 -"; then
      fail "页面 $p 返回错误页（白屏风险）"
    elif echo "$HTML" | grep -q "<!DOCTYPE\|<html"; then
      pass "页面 $p 返回有效 HTML（无白屏）"
    else
      warn "页面 $p 返回内容异常"
    fi
  done

  # 关闭服务
  kill $NEXT_PID 2>/dev/null || true
  sleep 1
fi

# ----------------------------------------------------------
# 汇总
# ----------------------------------------------------------
echo ""
color cyan "============================================================"
color cyan "  自验证结果汇总"
color cyan "============================================================"
color green "  通过：$PASS_COUNT"
color yellow "  警告：$WARN_COUNT"
color red   "  失败：$FAIL_COUNT"
if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
  color red "  失败步骤："
  for s in "${FAILED_STEPS[@]}"; do
    color red "    - $s"
  done
fi
color cyan "============================================================"

if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
fi
exit 0
