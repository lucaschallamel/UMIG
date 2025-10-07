# UMIG Documentation Organization Policy

**Effective Date**: October 7, 2025
**Policy Owner**: UMIG Development Team

## Purpose

This policy establishes clear separation between **documentation** and **development infrastructure** to maintain repository clarity and improve developer experience.

---

## Directory Structure

### `/docs/` - All Documentation

**Purpose**: Central location for ALL project documentation

**Subdirectories**:

| Directory          | Purpose                                              | Contents                                                            |
| ------------------ | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `architecture/`    | Architecture decisions, design, implementation notes | ADRs, design documents, technical analysis                          |
| `development/`     | Developer guides, references, testing docs           | Authentication guides, PowerShell references, testing documentation |
| `operations/`      | Runbooks, procedures, maintenance guides             | Cache refresh procedures, backup procedures                         |
| `troubleshooting/` | Bugfixes, investigations, debug guides               | Historical bugfixes, investigation reports, debugging procedures    |
| `testing/`         | Test documentation, strategies, reports              | Test completion reports, test summaries, testing strategies         |
| `security/`        | Security assessments, standards                      | Security reviews, compliance documentation                          |
| `roadmap/`         | Sprint planning, user stories, backlog               | Sprint documentation, user stories, technical debt                  |
| `api/`             | API documentation, OpenAPI specs                     | API reference, OpenAPI YAML specifications                          |
| `deployment/`      | Deployment guides, release notes                     | UAT deployment, production deployment guides                        |

---

### `/local-dev-setup/` - Development Infrastructure ONLY

**Purpose**: Executable code and configuration for local development environment

#### ✅ **ALLOWED**

| Type                   | Examples                                                                  |
| ---------------------- | ------------------------------------------------------------------------- |
| **Scripts**            | `*.sh`, `*.groovy`, `*.js`, `*.sql`, `*.py`                               |
| **Configuration**      | `*.json`, `*.yml`, `.env.example`, `docker-compose.yml`, `jest.config.js` |
| **Test Files**         | `*Test.js`, `*Test.groovy`, `*.spec.js`                                   |
| **Package Management** | `package.json`, `package-lock.json`, `node_modules/`                      |
| **Build Artifacts**    | `coverage/`, `dist/`, `build/` (should be gitignored)                     |
| **README Files**       | `README.md` in any subdirectory                                           |

#### ❌ **NOT ALLOWED**

| Type                                       | Why                           | Where It Goes                             |
| ------------------------------------------ | ----------------------------- | ----------------------------------------- |
| **Documentation** (\*.md except README.md) | Separates docs from code      | `/docs/` subdirectories                   |
| **Investigation Reports**                  | Not executable infrastructure | `/docs/troubleshooting/investigations/`   |
| **Troubleshooting Guides**                 | User-facing documentation     | `/docs/troubleshooting/guides/`           |
| **Architecture Decisions**                 | Design documentation          | `/docs/architecture/`                     |
| **Bugfix Documentation**                   | Historical records            | `/docs/troubleshooting/bugfixes/`         |
| **Design Specifications**                  | Requirements documentation    | `/docs/architecture/` or `/docs/roadmap/` |

---

## Exception: README.md Files

README.md files are **allowed and encouraged** in `/local-dev-setup/` subdirectories.

### Purpose of README.md in `/local-dev-setup/`

**Operational documentation** explaining:

- What scripts do and how to run them
- Prerequisites and dependencies
- Expected outputs and success criteria
- Troubleshooting script execution errors
- Quick reference for common operations

### What README.md Should NOT Contain

- ❌ Comprehensive architecture explanations (→ `/docs/architecture/`)
- ❌ Historical investigation reports (→ `/docs/troubleshooting/`)
- ❌ Detailed troubleshooting procedures (→ `/docs/troubleshooting/guides/`)
- ❌ API documentation (→ `/docs/api/`)
- ❌ User stories or requirements (→ `/docs/roadmap/`)

**Rule of Thumb**: If README.md exceeds 200 lines, content should probably be split into `/docs/`

---

## Migration History

### October 7, 2025 - Documentation Reorganization

**Reason**: Enforce separation of concerns - documentation vs. executable code
**Impact**: 12 documentation files relocated from `/local-dev-setup/` to `/docs/`

| Source (local-dev-setup)                                             | Destination (docs)                                                               |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `SESSION_AUTH_UTILITIES.md`                                          | `development/authentication/session-auth-utilities.md`                           |
| `diagnostic-scripts/INVESTIGATION_SUMMARY.md`                        | `troubleshooting/investigations/email-enrichment-investigation.md`               |
| `diagnostic-scripts/QUICK_START_GUIDE.md`                            | `troubleshooting/guides/email-enrichment-quick-fix.md`                           |
| `diagnostic-scripts/SCRIPTRUNNER_CACHE_REFRESH.md`                   | `operations/procedures/scriptrunner-cache-refresh.md`                            |
| `diagnostic-scripts/TEMPLATE_VARIABLE_MAPPING.md`                    | `architecture/implementation-notes/email-template-variable-mapping.md`           |
| `diagnostics/componentlocator-environment-detection-fix.md`          | `troubleshooting/bugfixes/componentlocator-environment-detection.md`             |
| `diagnostics/uat-stepview-configuration-fix.md`                      | `troubleshooting/bugfixes/uat-stepview-configuration.md`                         |
| `diagnostics/uat-browser-debug-guide.md`                             | `troubleshooting/guides/uat-browser-debugging.md`                                |
| `data-utils/Confluence_Importer/PowerShell_Quote_Guidelines.md`      | `development/references/powershell-quote-handling.md`                            |
| `__tests__/.../InstructionRepositoryComprehensiveTest_COMPLETION.md` | `testing/groovy/test-completion-reports/instruction-repository-comprehensive.md` |
| `__tests__/unit/StatusProvider.test.SUMMARY.md`                      | `testing/unit/test-summaries/status-provider-test.md`                            |
| `test_infrastructure_analysis.md`                                    | `testing/test-infrastructure-analysis.md`                                        |

---

## Guidelines for New Documentation

### Decision Tree: Where Does This Documentation Go?

```
Is this a README.md for a directory in /local-dev-setup/?
├─ YES → Keep in /local-dev-setup/[subdirectory]/README.md
└─ NO → Continue...

Is this executable code (script, test, configuration)?
├─ YES → /local-dev-setup/
└─ NO → Continue...

Is this documentation?
└─ YES → Determine subdirectory in /docs/:
    ├─ Architecture decision or design? → /docs/architecture/
    ├─ Developer guide or reference? → /docs/development/
    ├─ Operations procedure or runbook? → /docs/operations/
    ├─ Bugfix, investigation, or debug guide? → /docs/troubleshooting/
    ├─ Test documentation or report? → /docs/testing/
    ├─ API documentation? → /docs/api/
    ├─ Sprint planning or user story? → /docs/roadmap/
    └─ Deployment or release documentation? → /docs/deployment/
```

---

## Enforcement

### Automated Validation (Recommended)

Add to `.github/workflows/` or git pre-commit hooks:

```bash
#!/bin/bash
# Validate no documentation in local-dev-setup (except README.md)

violations=$(find local-dev-setup -type f -name "*.md" ! -name "README.md" \
  ! -path "*/node_modules/*" ! -path "*/_releases/*")

if [ -n "$violations" ]; then
  echo "❌ POLICY VIOLATION: Documentation files found in /local-dev-setup/"
  echo "$violations"
  echo ""
  echo "Please move documentation to /docs/ subdirectories."
  echo "See: /docs/DOCUMENTATION_ORGANIZATION.md"
  exit 1
fi

echo "✅ Documentation organization policy: PASS"
```

### Manual Review

During code reviews, verify:

- ✅ New .md files (except README.md) are in `/docs/`
- ✅ README.md files in `/local-dev-setup/` are concise (<200 lines)
- ✅ Cross-references point to correct `/docs/` locations

---

## Benefits

**For Developers**:

- ✅ Clear separation: code vs. documentation
- ✅ Easy discovery: all docs in `/docs/`
- ✅ Reduced confusion: no ambiguity about where content belongs
- ✅ Better navigation: consistent structure

**For Repository**:

- ✅ Cleaner organization
- ✅ Easier maintenance
- ✅ Better git history (docs changes don't mix with code changes)
- ✅ Scalable structure

**For New Team Members**:

- ✅ Obvious documentation location
- ✅ Clear development infrastructure
- ✅ Self-documenting repository structure

---

## Questions & Answers

**Q: What if I need to document a script in `/local-dev-setup/`?**
A: Use README.md in that script's directory. Keep it operational and concise.

**Q: Where do I put comprehensive troubleshooting guides?**
A: `/docs/troubleshooting/guides/`

**Q: What about historical bug investigation reports?**
A: `/docs/troubleshooting/investigations/`

**Q: Where does API documentation go?**
A: `/docs/api/` (OpenAPI specs, endpoint documentation)

**Q: Can I put a CHANGELOG.md in `/local-dev-setup/`?**
A: No - use `/CHANGELOG.md` at project root or `/docs/CHANGELOG.md`

**Q: What if my README.md is getting too long?**
A: Split content into `/docs/` and link from README.md. Keep README operational and concise.

---

## Contact

**Questions about this policy?**

- Review this document: `/docs/DOCUMENTATION_ORGANIZATION.md`
- Check examples in `/docs/` subdirectories
- Consult with team lead or senior developer

**Policy Updates**:
Propose changes via pull request with clear rationale and team discussion.

---

**Last Updated**: October 7, 2025
**Version**: 1.0
**Status**: ACTIVE
