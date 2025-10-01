# 🚀 Quick Start Guide - Email Enrichment Fix

**TL;DR**: Email showing empty data → ScriptRunner cache needs refresh

---

## ⚡ Fastest Fix (5 seconds)

### Step 1: Clear Cache
1. Open: http://localhost:8090
2. Settings (⚙️) → Manage apps → **Script Console**
3. Paste & Run:
```groovy
import com.onresolve.scriptrunner.runner.ScriptRunnerImpl
ScriptRunnerImpl.getInstance().clearCaches()
return "✅ Caches cleared"
```

### Step 2: Check Logs
```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
npm run logs:confluence | grep "DIAGNOSTIC" | tail -50
```

**Look for**:
```
🔍 DIAGNOSTIC: enrichedData = NOT NULL
🔍 step_code: 'TRT-004' (empty=false)
```

### Step 3: Test Email
1. Change a step status in Admin GUI
2. Check MailHog: http://localhost:8025
3. Email should now show:
   - `TRT-004: Step Name` in header (NOT `: Step 4:`)
   - Environment name populated
   - Instructions list (4 items)
   - Comments section (1 item)

---

## 🔍 Verification Commands

### Database Check
```bash
docker exec -it umig-postgres psql -U umig_app_user -d umig_app_db -c "SELECT stm.stt_code, stm.stm_number, CONCAT(stm.stt_code, '-', LPAD(stm.stm_number::text, 3, '0')) as step_code FROM steps_instance_sti sti JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id WHERE sti.sti_id = '821ccc8f-1e4f-4986-8478-96cc2ce4ecd0';"
```

**Expected**: `TRT | 4 | TRT-004`

### Enrichment Test
```bash
groovy local-dev-setup/diagnostic-scripts/test-email-enrichment.groovy
```

**Expected**: `step_code: 'TRT-004' ✅`

---

## 📚 Full Documentation

| File | Purpose |
|------|---------|
| `INVESTIGATION_SUMMARY.md` | Complete analysis |
| `SCRIPTRUNNER_CACHE_REFRESH.md` | Cache refresh methods |
| `TEMPLATE_VARIABLE_MAPPING.md` | Variable flow analysis |
| `test-email-enrichment.groovy` | Standalone test |
| `verify-step-instance-data.sql` | Database verification |

---

## 🆘 If Cache Clear Doesn't Work

### Try Plugin Restart (30 seconds)
1. Settings → Manage apps
2. Find "ScriptRunner for Confluence"
3. **Disable** → Wait 5 sec → **Enable**

### Try Confluence Restart (2-3 min)
```bash
npm run restart:confluence
```

### Check for Errors
```bash
npm run logs:confluence | grep -i "error\|exception" | tail -50
```

---

## ✅ Success Indicators

**Email Header**:
- ❌ BAD: `📋 : Step 4: socius vester...`
- ✅ GOOD: `📋 TRT-004: socius vester...`

**Logs**:
- ❌ BAD: No "DIAGNOSTIC" messages
- ✅ GOOD: `🔍 DIAGNOSTIC: enrichedData = NOT NULL`

---

**Last Updated**: 2025-10-01
**Estimated Fix Time**: 5 minutes
**Root Cause**: ScriptRunner cache (90% confidence)
