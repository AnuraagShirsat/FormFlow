# Contract Change Requests

This document tracks proposed modifications, additions, and clarifications to the shared data contracts in `/contracts/`.

> **CRITICAL WORKFLOW RULE:**  
> Only **Anuraag** is authorized to edit `/contracts/contract.md` and `/contracts/contract.json`.  
> Teammates (**Himani**, **Kartik**, **Ivan**) must submit change requests here using the template below. Once reviewed and accepted by Anuraag, the changes will be integrated into the central contract.

---

## Change Request Template

```markdown
### CR-[Number]: [Short Title]
- **Requested By:** [Himani / Kartik / Ivan / Anuraag]
- **Date:** YYYY-MM-DD
- **Target Section:** [e.g. FormField, /extract-document, Profile Schema, etc.]
- **Proposed Change:** [Describe what needs to change]
- **Reason / Use Case:** [Why is this necessary for your component?]
- **Backward Compatibility:** [Does this break existing implementations?]
- **Status:** [Proposed | Under Review | Approved | Rejected | Implemented]
```

---

## Active & Historical Requests

### CR-001: Extended Student Profile Keys
- **Requested By:** Anuraag (Core)
- **Date:** 2026-11-28
- **Target Section:** Profile Schema (`contracts/contract.md`, `contracts/contract.json`)
- **Proposed Change:** Add `state`, `district`, `rollNumber`, and `bankName` to `Profile` schema.
- **Reason / Use Case:** Required by state and central scholarship portals (e.g. SSP Karnataka, NSP) for DBT validation and academic eligibility.
- **Backward Compatibility:** Fully backward compatible; all new fields default to `null`.
- **Status:** Implemented (v1.1.0)

### CR-002: Three-Tier Fill Plan Status & Amber Approval Flag
- **Requested By:** Shared (Anuraag, Himani, Kartik)
- **Date:** 2026-11-28
- **Target Section:** FillPlanItem Schema
- **Proposed Change:** Expand `status` enum to `"green" | "amber" | "red"`. Add optional `approved` boolean flag for amber items.
- **Reason / Use Case:** Allows human-in-the-loop review for moderate-confidence matches before writing to the DOM.
- **Backward Compatibility:** Existing green/red logic remains intact; amber provides safe intermediary tier.
- **Status:** Implemented (v1.1.0)

### CR-003: Full-Plan Execution & missingCount in fillFields Return Shape
- **Requested By:** Shared (Kartik, Himani, Anuraag)
- **Date:** 2026-11-28
- **Target Section:** window.FormFlow.fillFields Interface
- **Proposed Change:** `window.FormFlow.fillFields(plan)` receives full plan, fills green and approved amber items, outlines red items and scrolls to the first red field. Returns `{ filledCount, skippedCount, missingCount, errors: [] }`.
- **Reason / Use Case:** Full transparency in review dialog showing accurate counts of filled, skipped, and missing inputs.
- **Backward Compatibility:** Callers checking `filledCount` continue to function; adds `missingCount` metric.
- **Status:** Implemented (v1.1.0)
