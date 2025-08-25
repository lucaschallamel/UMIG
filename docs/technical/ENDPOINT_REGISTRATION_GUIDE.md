# ScriptRunner Endpoint Registration Guide

## Manual Endpoint Registration Required

For US-031 Admin GUI Complete Integration, the following endpoints need to be manually registered in ScriptRunner UI:

### Endpoints Requiring Registration

1. **Phases Endpoint**
   - File: `/src/groovy/umig/api/v2/PhasesApi.groovy`
   - Path: `/rest/scriptrunner/latest/custom/phases`
   - Method: GET
   - Groups: `confluence-users`, `confluence-administrators`

2. **Controls Endpoint**
   - File: `/src/groovy/umig/api/v2/ControlsApi.groovy`
   - Path: `/rest/scriptrunner/latest/custom/controls`
   - Method: GET
   - Groups: `confluence-users`, `confluence-administrators`

3. **Status Endpoint**
   - File: `/src/groovy/umig/api/v2/StatusApi.groovy`
   - Path: `/rest/scriptrunner/latest/custom/status`
   - Method: GET
   - Groups: `confluence-users`, `confluence-administrators`

### Registration Steps

1. **Access ScriptRunner Admin**
   - Navigate to: http://localhost:8090
   - Login as admin
   - Go to: Confluence Administration → ScriptRunner → REST Endpoints

2. **Create New REST Endpoint**
   - Click "Add New Item" → "Custom endpoint"
   - Select "Inline" script type

3. **For Phases Endpoint:**
   ```groovy
   // Point to the PhasesApi.groovy file
   File: /src/groovy/umig/api/v2/PhasesApi.groovy
   ```

4. **For Controls Endpoint:**
   ```groovy
   // Point to the ControlsApi.groovy file
   File: /src/groovy/umig/api/v2/ControlsApi.groovy
   ```

5. **For Status Endpoint:**
   ```groovy
   // Point to the StatusApi.groovy file
   File: /src/groovy/umig/api/v2/StatusApi.groovy
   ```

6. **Configure Permissions**
   - Groups: Add `confluence-users` and `confluence-administrators`
   - Save and enable the endpoint

### Verification

After registration, verify endpoints are working:

```bash
# Test phases endpoint
curl -u admin:admin http://localhost:8090/rest/scriptrunner/latest/custom/phases

# Test controls endpoint
curl -u admin:admin http://localhost:8090/rest/scriptrunner/latest/custom/controls

# Test status endpoint
curl -u admin:admin "http://localhost:8090/rest/scriptrunner/latest/custom/status?entityType=Iteration"

# Run integration test
groovy src/groovy/umig/tests/integration/AdminGuiAllEndpointsTest.groovy
```

### Current Status (August 22, 2025)

- **Working Endpoints (11/13):**
  ✅ users, teams, environments, applications, labels
  ✅ iterations, migrations, plans, sequences
  ✅ steps, instructions

- **Requiring Manual Registration (3/14):**
  ❌ phases - Needs ScriptRunner UI registration
  ❌ controls - Needs ScriptRunner UI registration
  ❌ status - Needs ScriptRunner UI registration (NEW for iterations dropdown fix)

### Notes

- Endpoint registration **cannot be automated** due to ScriptRunner architecture
- Must be done manually through the Confluence UI
- Registration persists across container restarts
- Files are already created and ready for registration

## References

- ADR-011: ScriptRunner REST Endpoint Configuration
- ADR-007: Plugin & Dependency Management
- US-031: Admin GUI Complete Integration