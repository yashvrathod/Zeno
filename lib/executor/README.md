# Code Executor Module

Simple, free code execution for your AI mentor platform.

## What It Does

- **JavaScript/TypeScript**: Runs in the browser (instant, $0 cost)
- **Python/C++/Java**: Uses Piston API (free tier, ~3 sec latency)
- **AI Quota Guard**: Prevents runaway costs with daily/monthly limits

## Setup

1. Copy environment variables:
```bash
cp .env.local.example .env.local
```

2. Set your limits:
```
AI_DAILY_LIMIT=50       # Messages per day per user
AI_MONTHLY_BUDGET=20    # Dollar cap per month
```

## How It Works

### Browser Executor (JavaScript)
```typescript
// code runs instantly in sandboxed iframe
const result = await executeCode(jsCode, 'javascript', testCases);
// result: { passed: true, tests: [...], runtime: 50 }
```

### Piston API (Python/C++/Java)
```typescript
// Code runs on free public API
const result = await executeCode(pyCode, 'python', testCases);
// result: { passed: false, error: 'NameError...', tests: [...] }
```

### AI Quota Guard
```typescript
// Before calling AI, check quota
const quota = await checkAIQuota(userId);
if (!quota.allowed) {
  return { error: quota.reason }; // Don't call AI
}
```

## Cost Breakdown

| Action | Cost | Latency |
|--------|------|---------|
| JS execution | $0 | <100ms |
| Python (browser) | $0 | 3-5s cold start |
| C++/Java (Piston) | $0 | ~3s |
| AI message (Haiku) | $0.005 | ~1s |
| AI message (Sonnet) | $0.03 | ~2s |

**Typical monthly cost (1000 users)**: $15-25 with quotas enabled

## Files

- `codeExecutor.ts` - Main execution logic
- `aiQuota.ts` - Cost guardrails
- `__tests__/codeExecutor.test.ts` - Tests

## Next Steps (Optional)

1. **Add Pyodide** for browser-based Python (removes Piston dependency)
2. **Self-host Piston** if you hit rate limits (Docker, ~$5/mo)
3. **Add Groq API** for free unlimited AI during beta
