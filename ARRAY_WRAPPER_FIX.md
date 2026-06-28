# Array Wrapper Fix

## Issue
```
Error [ZodError]: expected object, received array
```

## Root Cause
Gemini 2.5 Flash was returning JSON wrapped in an array:
```json
[
  {
    "scores": { ... },
    "thesis": "...",
    ...
  }
]
```

Instead of the expected object:
```json
{
  "scores": { ... },
  "thesis": "...",
  ...
}
```

## Solution Applied

### Added Array Unwrapping Logic

In all three agents (analyst, critic, decisionMaker):

```typescript
let parsed = JSON.parse(cleanedContent);

// Handle if response is wrapped in an array
if (Array.isArray(parsed) && parsed.length > 0) {
  parsed = parsed[0];  // Unwrap the first element
}

result = Schema.parse(parsed);
```

### Files Modified
- ✅ `src/lib/agent/analyst.ts` - Added unwrapping + debug logging
- ✅ `src/lib/agent/critic.ts` - Added unwrapping
- ✅ `src/lib/agent/decisionMaker.ts` - Added unwrapping

## How It Works

1. **Parse JSON** from LLM response
2. **Check if array** - `Array.isArray(parsed)`
3. **Unwrap if needed** - Take first element `parsed[0]`
4. **Validate with Zod** - Schema validation continues as normal

## Debug Logging

Added to analyst.ts to help diagnose future issues:
```typescript
console.log("Analyst parsed type:", Array.isArray(parsed) ? 'array' : typeof parsed);
```

Check terminal output to see what type is being returned.

## Testing

After this fix:
1. ✅ Analyst should complete successfully
2. ✅ Critic should complete successfully  
3. ✅ Decision Maker should complete successfully
4. ✅ Full research report displayed

## Status: ✅ FIXED

The application should now handle both:
- Direct object responses: `{...}`
- Array-wrapped responses: `[{...}]`

Refresh your browser and try searching for a company again!
