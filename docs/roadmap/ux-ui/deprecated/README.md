# Deprecated Email Templates

**Status**: ❌ DEPRECATED
**Date Deprecated**: September 30, 2025
**Superseded By**: `/docs/roadmap/ux-ui/canonical/enhanced-mobile-email-template.html`

---

## ⚠️ DO NOT USE THESE TEMPLATES

The templates in this directory have been deprecated and should **NOT** be used for new development or production deployments. They are retained for historical reference only.

### Deprecated Templates

| Template              | Lines | Size    | Deprecated Reason                                                           | Superseded By                                   |
| --------------------- | ----- | ------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| `email-template.html` | 752   | 24.0 KB | Missing mobile-responsive design, dark mode, print styles, comments section | `canonical/enhanced-mobile-email-template.html` |

### Why These Templates Were Deprecated

1. **Missing Mobile-Responsive CSS**: No breakpoints for mobile (320px-600px), tablet (601px-768px), desktop (769px-1000px)
2. **No Dark Mode Support**: Missing `@media (prefers-color-scheme: dark)` styles
3. **No Print Optimization**: Missing `@media print` styles for professional printing
4. **Limited Outlook Compatibility**: Partial MSO support, not suitable for Outlook 2007-2019
5. **Missing Comments Section**: No collaboration context via `recentComments`
6. **Basic CTA Buttons**: Not WCAG 2.1 compliant (< 44px touch target)
7. **Incomplete Variable Coverage**: Only 18/35 variables (51% missing)

### Migration Path

If you are currently using `email-template.html`:

1. **Replace** all references with `/docs/roadmap/ux-ui/canonical/enhanced-mobile-email-template.html`
2. **Update** database templates via Liquibase migration `028_consolidate_canonical_email_templates.sql`
3. **Test** email rendering in Gmail, Outlook, Apple Mail
4. **Verify** all 35 variables populate correctly via MailHog testing

### Historical Context

- **Created**: Early 2025 (pre-mobile enhancement)
- **Used**: January-September 2025
- **Replaced**: Sprint 8 (TD-015 Email Template Consistency Finalization)
- **Phase 1 Score**: 10/20 features (50% complete)

---

**For current template:** See `/docs/roadmap/ux-ui/canonical/enhanced-mobile-email-template.html`
**For template selection guide:** See `/docs/roadmap/ux-ui/README.md`
