# ScriptRunner Cache Refresh Guide

## Overview

ScriptRunner for Confluence caches compiled Groovy classes to improve performance. When you modify Groovy files, ScriptRunner may continue using the old cached versions until you force a refresh.

**Symptom**: Code changes in `.groovy` files don't take effect even after saving.

---

## Method 1: UI-Based Cache Clear (RECOMMENDED - Fastest)

### Step 1: Navigate to ScriptRunner Console
1. Open Confluence: http://localhost:8090
2. Click **Settings** (gear icon) → **Manage apps**
3. In left sidebar, click **Script Console** (under SCRIPTRUNNER section)

### Step 2: Clear Script Cache
In the Script Console, run this code:

```groovy
import com.onresolve.scriptrunner.runner.ScriptRunnerImpl

// Clear all cached scripts
ScriptRunnerImpl.getInstance().clearCaches()

return "✅ ScriptRunner caches cleared successfully"
```

Click **Run** button.

### Step 3: Verify Cache Cleared
You should see: `✅ ScriptRunner caches cleared successfully`

---

## Method 2: Restart ScriptRunner Plugin (More Thorough)

### Via Manage Apps UI:
1. Open Confluence: http://localhost:8090
2. Click **Settings** (gear icon) → **Manage apps**
3. Find **ScriptRunner for Confluence** in the app list
4. Click **Disable** → Wait 5 seconds → Click **Enable**

### Expected Time: ~30 seconds

---

## Method 3: Restart Confluence Container (Nuclear Option)

**⚠️ WARNING**: This will restart the entire Confluence instance. Use only if Methods 1-2 don't work.

```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
npm run restart:confluence
```

**Expected Time**: ~2-3 minutes for Confluence to fully restart

---

## Method 4: Restart Entire Stack (Complete Reset)

**⚠️ WARNING**: This restarts all containers (Confluence + PostgreSQL). Last resort only.

```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
npm stop
npm start
```

**Expected Time**: ~3-5 minutes

---

## Verification After Cache Refresh

### 1. Check Confluence Logs
```bash
cd /Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup
npm run logs:confluence | grep "EnhancedEmailService"
```

**Look for**:
- `🔧 [EnhancedEmailService] 🔍 DIAGNOSTIC:` messages
- Recent timestamps (after your cache refresh)

### 2. Trigger Test Email
1. Change a step status in Admin GUI
2. Check MailHog: http://localhost:8025
3. Check Confluence logs for diagnostic output

### 3. Expected Log Output (After Cache Refresh)
```
🔧 [EnhancedEmailService] ================== START sendStepStatusChangedNotificationWithUrl ==================
🔧 [EnhancedEmailService] ENRICHMENT: Fetching complete step data for email template
🔧 [EnhancedEmailService] 🔍 DIAGNOSTIC: Calling getEnhancedStepInstanceForEmail with UUID: 821ccc8f-1e4f-4986-8478-96cc2ce4ecd0
🔧 [EnhancedEmailService] 🔍 DIAGNOSTIC: enrichedData = NOT NULL
🔧 [EnhancedEmailService] ✅ Enhanced data retrieved - DETAILED INSPECTION:
🔧 [EnhancedEmailService]   🔍 step_code: 'TRT-004' (empty=false)
🔧 [EnhancedEmailService]   🔍 sti_name: 'socius vester amiculum sursum amita'
🔧 [EnhancedEmailService]   🔍 environment_name: 'Production'
🔧 [EnhancedEmailService]   🔍 Instructions count: 4
🔧 [EnhancedEmailService]   🔍 Comments count: 1
```

**If you DON'T see these logs**: Cache refresh didn't work or logs are not being captured.

---

## Troubleshooting

### Issue: Method 1 doesn't work
**Solution**: Try Method 2 (restart ScriptRunner plugin)

### Issue: Still seeing old behavior after all methods
**Possible Causes**:
1. Browser cache - Hard refresh (Cmd+Shift+R on Mac)
2. Files not saved - Check file timestamps
3. Syntax errors preventing compilation - Check Confluence logs for errors
4. Wrong files being modified - Verify file paths

**Debug Steps**:
```bash
# Check if files were actually saved
ls -lh /Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/utils/EnhancedEmailService.groovy
stat /Users/lucaschallamel/Documents/GitHub/UMIG/src/groovy/umig/utils/EnhancedEmailService.groovy

# Check for Groovy compilation errors
npm run logs:confluence | grep -i "error\|exception" | tail -50
```

### Issue: No logs appearing at all
**Possible Causes**:
1. Log level too high - ScriptRunner may filter println statements
2. Confluence not capturing stdout - Check log configuration
3. Wrong log file - ScriptRunner may use separate log file

**Solution**: Check all log files
```bash
# Check atlassian-confluence.log
docker exec umig-confluence tail -100 /var/atlassian/application-data/confluence/logs/atlassian-confluence.log

# Check all logs
docker exec umig-confluence ls -lh /var/atlassian/application-data/confluence/logs/
```

---

## Best Practices

1. **Always use Method 1 first** - It's fastest and non-disruptive
2. **Check logs immediately after cache clear** - Verify refresh worked
3. **Use diagnostic scripts** - Test enrichment method standalone
4. **Document changes** - Note which method worked for future reference

---

## Quick Reference Card

| Method | Time | Disruption | When to Use |
|--------|------|------------|-------------|
| Method 1: Script Console | 5 sec | None | First try (90% success rate) |
| Method 2: Plugin Restart | 30 sec | Minimal | If Method 1 fails |
| Method 3: Confluence Restart | 2-3 min | Medium | If Methods 1-2 fail |
| Method 4: Full Stack Restart | 3-5 min | High | Last resort only |

---

## Related Files

- Enhanced logging: `/src/groovy/umig/utils/EnhancedEmailService.groovy`
- Enrichment method: `/src/groovy/umig/repository/StepRepository.groovy`
- Diagnostic script: `/local-dev-setup/diagnostic-scripts/test-email-enrichment.groovy`
- SQL verification: `/local-dev-setup/diagnostic-scripts/verify-step-instance-data.sql`

---

## Next Steps After Cache Refresh

1. Run diagnostic script to verify enrichment works:
   ```bash
   groovy local-dev-setup/diagnostic-scripts/test-email-enrichment.groovy
   ```

2. Trigger test email by changing step status

3. Check MailHog for email with populated data:
   - http://localhost:8025

4. Verify Confluence logs show detailed diagnostic output

---

**Last Updated**: 2025-10-01
**Related Issue**: Empty email data despite database having correct values
**Root Cause**: ScriptRunner caching old code after bug fix
