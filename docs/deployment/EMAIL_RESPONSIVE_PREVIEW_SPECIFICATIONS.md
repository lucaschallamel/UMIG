# Email Responsive Design Preview Specifications

**Version**: 1.0  
**Date**: 2025-08-26  
**Context**: US-039 Enhanced Email Notifications - Responsive Design Preview

## Overview

This document provides detailed specifications for mobile and desktop email preview layouts, demonstrating how the enhanced mobile-responsive email templates adapt across different screen sizes and email clients.

## Device Breakpoints and Layouts

### Desktop Layout (600px+)

#### Viewport: 1920x1080 (Standard Desktop)
```
┌─────────────────────────────────────────────────────────┐
│                    Email Client UI                      │
├─────────────────────────────────────────────────────────┤
│           ┌───────────────────────────────┐             │
│           │     Email Wrapper (100%)     │             │
│           │  ┌─────────────────────────┐  │             │
│           │  │   Email Container       │  │             │
│           │  │     (600px max)         │  │             │
│           │  │ ┌─────────────────────┐ │  │             │
│           │  │ │      Header         │ │  │             │
│           │  │ │   Gradient Blue     │ │  │             │
│           │  │ │  📋 STEP-001-NAME   │ │  │             │
│           │  │ │ Migration › Iter    │ │  │             │
│           │  │ └─────────────────────┘ │  │             │
│           │  │ ┌─────────────────────┐ │  │             │
│           │  │ │   Step Details      │ │  │             │
│           │  │ │  📊 Step Summary    │ │  │             │
│           │  │ │ ┌─────┐ ┌─────────┐ │ │  │             │
│           │  │ │ │Label│ │ Value   │ │ │  │             │
│           │  │ │ │Label│ │ Value   │ │ │  │             │
│           │  │ │ └─────┘ └─────────┘ │ │  │             │
│           │  │ └─────────────────────┘ │  │             │
│           │  │ ┌─────────────────────┐ │  │             │
│           │  │ │   Instructions      │ │  │             │
│           │  │ │  📝 Instructions    │ │  │             │
│           │  │ │ ┌─┐ Instruction 1   │ │  │             │
│           │  │ │ ┌✓┐ Instruction 2   │ │  │             │
│           │  │ │ ┌─┐ Instruction 3   │ │  │             │
│           │  │ └─────────────────────┘ │  │             │
│           │  │ ┌─────────────────────┐ │  │             │
│           │  │ │   🔗 View in        │ │  │             │
│           │  │ │    Confluence       │ │  │             │
│           │  │ └─────────────────────┘ │  │             │
│           │  │ ┌─────────────────────┐ │  │             │
│           │  │ │      Footer         │ │  │             │
│           │  │ │   UMIG System       │ │  │             │
│           │  │ │  Links | Help       │ │  │             │
│           │  │ └─────────────────────┘ │  │             │
│           │  └─────────────────────────┘  │             │
│           └───────────────────────────────┘             │
└─────────────────────────────────────────────────────────┘

Measurements:
- Email Container: 600px width, centered
- Content Padding: 32px (left/right), 32px (top/bottom)
- Section Margins: 32px between major sections
- Card Padding: 24px internal padding
- Button Height: 56px (desktop optimal)
- Button Width: 200px minimum
```

#### Typography Scale (Desktop)
- **Header Title**: 28px, font-weight 700
- **Section Titles**: 20px, font-weight 600
- **Body Text**: 16px, line-height 1.4
- **Metadata Labels**: 14px, font-weight 600
- **Button Text**: 16px, font-weight 600
- **Footer Text**: 14px, line-height 1.5

### Tablet Layout (481px - 600px)

#### Viewport: 768x1024 (iPad Portrait)
```
┌─────────────────────────────────────┐
│         Email Client UI             │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │    Email Wrapper (100%)      │  │
│  │ ┌───────────────────────────┐ │  │
│  │ │   Email Container         │ │  │
│  │ │    (100% - 20px)          │ │  │
│  │ │ ┌───────────────────────┐ │ │  │
│  │ │ │      Header           │ │ │  │
│  │ │ │    Gradient Blue      │ │ │  │
│  │ │ │  📋 STEP-001-NAME     │ │ │  │
│  │ │ │ Migration › Iteration │ │ │  │
│  │ │ └───────────────────────┘ │ │  │
│  │ │ ┌───────────────────────┐ │ │  │
│  │ │ │   Step Details        │ │ │  │
│  │ │ │  📊 Step Summary      │ │ │  │
│  │ │ │ Status: [BADGE]       │ │ │  │
│  │ │ │ Duration: 30 minutes  │ │ │  │
│  │ │ │ Team: Infrastructure  │ │ │  │
│  │ │ └───────────────────────┘ │ │  │
│  │ │ ┌───────────────────────┐ │ │  │
│  │ │ │   Instructions        │ │ │  │
│  │ │ │  📝 3 instructions    │ │ │  │
│  │ │ │ [Instructions List]   │ │ │  │
│  │ │ └───────────────────────┘ │ │  │
│  │ │ ┌───────────────────────┐ │ │  │
│  │ │ │  🔗 View in Confluence│ │ │  │
│  │ │ │     (80% width)       │ │ │  │
│  │ │ └───────────────────────┘ │ │  │
│  │ │ ┌───────────────────────┐ │ │  │
│  │ │ │      Footer           │ │ │  │
│  │ │ └───────────────────────┘ │ │  │
│  │ └───────────────────────────┘ │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘

Adaptations:
- Container: 10px margin on sides
- Content Padding: 24px (reduced from 32px)
- Button Width: 80% of container
- Font sizes remain desktop scale
```

### Mobile Layout (320px - 480px)

#### Viewport: 375x812 (iPhone 12 Portrait)
```
┌───────────────────────────┐
│    Mobile Email Client    │
├───────────────────────────┤
│┌─────────────────────────┐│
││   Email Wrapper (100%)  ││
││┌───────────────────────┐││
│││   Email Container     │││
│││    (100% - 10px)      │││
│││┌─────────────────────┐│││
││││      Header         ││││
││││   Gradient Blue     ││││
││││  📋 STEP-001        ││││
││││   (Truncated)       ││││
││││ Migration › Iter    ││││
│││└─────────────────────┘│││
│││┌─────────────────────┐│││
││││   Step Summary      ││││
││││  📊 (18px title)    ││││
││││ Status:             ││││
││││ [BADGE]             ││││
││││                     ││││
││││ Duration:           ││││
││││ 30 minutes          ││││
││││                     ││││
││││ Team:               ││││
││││ Infrastructure      ││││
│││└─────────────────────┘│││
│││┌─────────────────────┐│││
││││   Instructions      ││││
││││  📝 3 instructions  ││││
││││                     ││││
││││ ┌─┐ Step 1: Brief   ││││
││││    description      ││││
││││                     ││││
││││ ┌✓┐ Step 2: Done    ││││
││││                     ││││
││││ ┌─┐ Step 3: Next    ││││
│││└─────────────────────┘│││
│││┌─────────────────────┐│││
││││  🔗 View in         ││││
││││   Confluence        ││││
││││   (90% width)       ││││
│││└─────────────────────┘│││
│││┌─────────────────────┐│││
││││     Footer          ││││
││││   Links stacked     ││││
││││   vertically        ││││
│││└─────────────────────┘│││
││└───────────────────────┘││
│└─────────────────────────┘│
└───────────────────────────┘

Mobile Adaptations:
- Container: 5px margin on sides
- Content Padding: 20px → 16px
- Section Margins: 32px → 24px → 20px
- Header Title: 28px → 24px → 22px
- Section Titles: 20px → 18px
- Body Text: 16px → 15px → 14px
- Button: 90% width, 44px+ height
- Touch targets: 44px minimum
- Footer links: Stacked vertically
```

## Email Client Specific Adaptations

### Gmail (Web/Mobile)
```
Desktop (Gmail Web):
┌────────────────────────────────────┐
│ Gmail Interface                    │
│ ┌────────────────────────────────┐ │
│ │ Email Preview Pane             │ │
│ │ ┌────────────────────────────┐ │ │
│ │ │ UMIG Email Container       │ │ │
│ │ │ [Full responsive design]   │ │ │
│ │ └────────────────────────────┘ │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘

Mobile (Gmail App):
┌──────────────────┐
│ Gmail App        │
│ ┌──────────────┐ │
│ │ Email Thread │ │
│ │ ┌──────────┐ │ │
│ │ │ UMIG     │ │ │
│ │ │ Email    │ │ │
│ │ │ [Mobile  │ │ │
│ │ │  Layout] │ │ │
│ │ └──────────┘ │ │
│ └──────────────┘ │
└──────────────────┘
```

### Apple Mail (iOS)
```
iPhone (Portrait):
┌─────────────────────┐
│    📧 Mail App      │
├─────────────────────┤
│ ◁ Inbox    Edit    │
├─────────────────────┤
│ From: UMIG System   │
│ Subject: Step...    │
├─────────────────────┤
│┌───────────────────┐│
││ Email Content     ││
││ [Optimized for    ││
││  native iOS       ││
││  rendering with   ││
││  touch-friendly   ││
││  elements]        ││
│└───────────────────┘│
│ ⌨️ Reply  📤 Forward│
└─────────────────────┘

iPad (Landscape):
┌──────────────────────────────────────────────┐
│              📧 Mail App                     │
├──────────────────┬───────────────────────────┤
│ Inbox            │ From: UMIG System         │
│ ┌──────────────┐ │ Subject: Step Status...   │
│ │ [Email List] │ ├───────────────────────────┤
│ │              │ │┌─────────────────────────┐│
│ │              │ ││ Email Content           ││
│ │              │ ││ [Tablet optimized       ││
│ │              │ ││  with wider layout]     ││
│ │              │ │└─────────────────────────┘│
│ └──────────────┘ │                           │
└──────────────────┴───────────────────────────┘
```

### Outlook (Various Platforms)

#### Outlook Desktop (Windows)
```
┌─────────────────────────────────────────────────┐
│ Microsoft Outlook                               │
├─────────────────────────────────────────────────┤
│ File  Home  Send/Receive  Folder  View  Help   │
├──────────────┬──────────────────────────────────┤
│ Folder Pane  │ Reading Pane                     │
│ ┌──────────┐ │ ┌──────────────────────────────┐ │
│ │ Inbox    │ │ │ UMIG Email                   │ │
│ │ Drafts   │ │ │ [Table-based layout for      │ │
│ │ Sent     │ │ │  maximum compatibility       │ │
│ │          │ │ │  with Outlook rendering]     │ │
│ └──────────┘ │ └──────────────────────────────┘ │
└──────────────┴──────────────────────────────────┘
```

#### Outlook Mobile (iOS/Android)
```
┌────────────────────┐
│ Outlook Mobile     │
├────────────────────┤
│ 📧 Inbox     ⚙️    │
├────────────────────┤
│ UMIG System        │
│ Step Status Chang..│
├────────────────────┤
│┌──────────────────┐│
││ Email Content    ││
││ [Mobile-first    ││
││  responsive      ││
││  design with     ││
││  touch elements] ││
│└──────────────────┘│
├────────────────────┤
│ 💬 Reply  📤 More │
└────────────────────┘
```

## Responsive Component Behavior

### Header Section

**Desktop (600px+)**
```
┌─────────────────────────────────────┐
│        Gradient Background          │
│                                     │
│    📋 STEP-001 - Database Migration │ (28px)
│                                     │
│   Migration-Alpha › Iteration-1 ›   │ (16px)
│     Plan-DB › Sequence-Core ›       │
│        Phase-Preparation            │
│                                     │
│ Generated on Aug 26, 2025 at 14:30 │ (14px)
│        by John Smith                │
│   Complete step details for         │
│        offline viewing              │
└─────────────────────────────────────┘
```

**Mobile (480px and below)**
```
┌─────────────────────────┐
│   Gradient Background   │
│                         │
│ 📋 STEP-001 - DB...     │ (22px)
│                         │
│ Migration-Alpha ›       │ (14px)
│ Iteration-1 › Plan-DB   │
│                         │
│ Generated Aug 26, 2025  │ (12px)
│ at 14:30 by John Smith  │
│ Complete step details   │
└─────────────────────────┘
```

### Metadata Grid

**Desktop Layout**
```
┌────────────────────────────────────┐
│ Status        [IN PROGRESS BADGE]  │
├────────────────────────────────────┤
│ Duration      30 minutes           │
├────────────────────────────────────┤
│ Assigned Team Infrastructure       │
├────────────────────────────────────┤
│ Environment   Production           │
└────────────────────────────────────┘
```

**Mobile Layout**
```
┌─────────────────────────┐
│ STATUS                  │
│ [IN PROGRESS BADGE]     │
├─────────────────────────┤
│ DURATION                │
│ 30 minutes              │
├─────────────────────────┤
│ ASSIGNED TEAM           │
│ Infrastructure          │
├─────────────────────────┤
│ ENVIRONMENT             │
│ Production              │
└─────────────────────────┘
```

### Instructions List

**Desktop View**
```
┌─────────────────────────────────────────────┐
│ 📝 Instructions (3)                         │
├─────────────────────────────────────────────┤
│ ┌─┐ 1. Backup current database               │
│     Estimated duration: 15 minutes          │
├─────────────────────────────────────────────┤
│ ┌✓┐ 2. Stop application services             │
│     Completed - Estimated: 5 minutes        │
├─────────────────────────────────────────────┤
│ ┌─┐ 3. Execute migration scripts             │
│     Estimated duration: 10 minutes          │
└─────────────────────────────────────────────┘
```

**Mobile View**
```
┌─────────────────────────┐
│ 📝 Instructions (3)     │
├─────────────────────────┤
│ ┌─┐ 1. Backup current   │
│     database            │
│     15 minutes          │
├─────────────────────────┤
│ ┌✓┐ 2. Stop app         │
│     services            │
│     Completed (5 min)   │
├─────────────────────────┤
│ ┌─┐ 3. Execute          │
│     migration scripts   │
│     10 minutes          │
└─────────────────────────┘
```

### CTA Button Evolution

**Desktop (600px+)**
```
┌─────────────────────────────────────┐
│                                     │
│    ┌─────────────────────────┐      │
│    │  🔗 View in Confluence  │      │
│    │      (200px x 56px)     │      │
│    └─────────────────────────┘      │
│                                     │
│ Click to view with live updates     │
│    and collaboration features       │
└─────────────────────────────────────┘
```

**Tablet (481px - 600px)**
```
┌───────────────────────────┐
│                           │
│ ┌───────────────────────┐ │
│ │ 🔗 View in Confluence │ │
│ │     (80% width)       │ │
│ └───────────────────────┘ │
│                           │
│ Click to view with live   │
│ updates and collaboration │
└───────────────────────────┘
```

**Mobile (320px - 480px)**
```
┌───────────────────┐
│                   │
│┌─────────────────┐│
││ 🔗 View in      ││
││  Confluence     ││
││  (90% width)    ││
│└─────────────────┘│
│                   │
│ Click to view     │
│ with live updates │
└───────────────────┘
```

## Testing Scenarios

### Multi-Device Testing Matrix

| Device Type | Screen Size | Email Client | Test Scenarios |
|-------------|-------------|--------------|----------------|
| **Desktop** | 1920x1080 | Outlook 2019 | Full template rendering |
| **Desktop** | 1366x768 | Gmail Web | Responsive containers |
| **Tablet** | 768x1024 | Apple Mail | Touch interactions |
| **Mobile** | 375x812 | Gmail App | Single column layout |
| **Mobile** | 320x568 | Outlook Mobile | Minimum width handling |

### Interaction Testing

1. **Touch Targets**
   - CTA buttons: 44x44px minimum
   - Footer links: Adequate spacing
   - Status badges: Non-interactive but readable

2. **Text Readability**
   - Minimum 14px font size on mobile
   - Adequate line height (1.4-1.5)
   - Proper contrast ratios

3. **Content Adaptation**
   - Text truncation handling
   - Image scaling behavior
   - Table responsiveness

## Performance Specifications

### File Size Targets
- **Total HTML**: < 102KB (Gmail clipping limit)
- **Inline CSS**: < 20KB
- **Images**: None (using Unicode emojis)
- **External Resources**: Zero dependencies

### Loading Performance
- **Template Processing**: < 500ms
- **Email Rendering**: < 2s on 3G connection
- **Interactive Elements**: Immediate response

---

**Implementation Ready**: Mobile-responsive email templates with comprehensive device adaptation specifications for US-039 Phase 0 deployment.