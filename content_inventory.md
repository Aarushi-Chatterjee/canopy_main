# Canopy Production Content Inventory (Source of Truth)

This inventory establishes the classification for every visible record, claim, and statistic across the Canopy platform.

## Status Definitions
- **Real**: Verified, founder-approved, permissioned, and operationally supported.
- **Illustrative**: Clearly labeled example demonstrating product loop mechanics; non-deceptive; does not accept live actions.
- **Private Beta Only**: Available only to authenticated, approved cohort collaborators.
- **Pending Review**: Submitted records awaiting administrator/moderator evaluation.
- **Archived**: Historical records retained for audit but hidden from discovery.

---

## 1. The Single Illustrative Product-Loop Example

Per the One-Example Rule, Canopy maintains exactly one end-to-end illustrative demonstration:

| Record Type | Title | Location | Status | Action Allowed | Label / Disclaimer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Build Call** | Groundwater contamination sensor optical probe | `match.html`, `index.html` | **Illustrative** | View only (no live application) | "Illustrative Example — This workspace demonstrates how Canopy works. It is not a live opportunity and is not accepting applications." |
| **Sprint Squad** | Groundwater contamination sensor calibration squad | `sprint.html` | **Illustrative** | View only (no shovel join) | "Illustrative Example — This workspace demonstrates how Canopy works." |
| **Lab Notebook Entry** | Field calibration benchmarks under high turbidity | `notebook.html` | **Illustrative** | View only | "Illustrative Example — Field notes and post-mortem demonstration." |

---

## 2. Page-by-Page Content Classification

### Homepage (`index.html`)
| Item / Section | Current Copy / Claim | Status | Action |
| :--- | :--- | :--- | :--- |
| **Brand Identity** | Canopy: Build · Connect · Ship | Real | Retained |
| **Mission & Problem Statement** | "The Gap: Capable people want to build things that matter..." | Real | Retained |
| **Problem Marketplace Deck** | Dynamic build call carousel | Real / Connected to API | Live API feed |
| **Founder Quote** | Aarushi Chatterjee, Founder quote | Real | Retained |
| **Activity Statistics** | Dynamic counters | Real | Sourced from actual database counts |

### Match Sandbox (`match.html`)
| Item / Section | Current Copy / Claim | Status | Action |
| :--- | :--- | :--- | :--- |
| **Sandbox Banner** | Collaborative sandbox for vetted problem holders & builders | Real | Retained |
| **Illustrative Call** | Groundwater sensor | Illustrative | Labeled with `ExampleNotice` badge |
| **Collaborator Profiles** | Approved beta member profiles | Private Beta Only | Rendered only for authenticated users; empty state for visitors |
| **Handshake Action** | "Request Connection" | Real | Requires authentication; triggers mutual contact consent |

### Sprint Board (`sprint.html`)
| Item / Section | Current Copy / Claim | Status | Action |
| :--- | :--- | :--- | :--- |
| **Board Columns** | Forming, Building, Shipped | Real | Live database stages |
| **Illustrative Sprint** | Groundwater sensor sprint squad | Illustrative | Labeled with `ExampleNotice` badge |
| **Shovel Action** | "Grab a shovel" | Real | Real backend join transaction with capacity check |
| **Shipped Artifact** | Prototype release links | Real | Requires real artifact link |

### Lab Notebook (`notebook.html`)
| Item / Section | Current Copy / Claim | Status | Action |
| :--- | :--- | :--- | :--- |
| **Notebook Feed** | Field notes, post-mortems, reflections | Real | Live database entries |
| **Illustrative Entry** | Groundwater sensor calibration benchmarks | Illustrative | Labeled with `ExampleNotice` badge |
| **Branch Action** | "Grow this entry" | Real | Real backend branch mutation |

### Intake & Post Forms (`apply.html`, `post-call.html`)
| Item / Section | Current Copy / Claim | Status | Action |
| :--- | :--- | :--- | :--- |
| **SLA Promise** | "Reviewed by Canopy curators within 24 hours" | Updated | Changed to: "Reviewed by our team on a rolling basis" |
| **Application Submission** | New collaborator intake | Real | Saved to database with `pending_review` status |
| **Build Call Submission** | Problem holder intake | Real | Saved to database with `pending_review` status |

### Legal Pages (`privacy.html`, `terms.html`)
| Item / Section | Current Copy / Claim | Status | Action |
| :--- | :--- | :--- | :--- |
| **Processors & Storage** | Encryption & infrastructure claims | Real | Reconciled with Supabase PostgreSQL & Node runtime |
| **User Rights & Deletion** | Export & deletion instructions | Real | Reconciled with privacy contact procedure (`privacy@canopy.earth`) |
