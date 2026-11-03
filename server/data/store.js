const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'canopy-db.json');

const INITIAL_DATA = {
  users: [],
  profiles: [],
  build_calls: [
    {
      id: 'call_groundwater',
      creatorId: 'usr_canopy_illustrative',
      title: 'Groundwater contamination sensor optical probe',
      orgName: 'Community Hydrology Initiative (Illustrative)',
      problemStatement: 'Illustrative Example: Build an optical sensor that flags chemical contamination in real time. This is a reference demonstration of a Canopy Build Call.',
      domain: 'climate',
      targetDeliverable: 'Open-source spectrophotometric probe schematic and telemetry firmware.',
      pilotBudget: 'Sample deployment budget (demonstration only)',
      datasetAccessUrl: 'https://data.canopy.internal/sets/gw-sensor-sample',
      neededSkills: ['Hardware', 'Embedded C', 'Spectroscopy'],
      status: 'illustrative_sample',
      isIllustrative: true,
      createdAt: '2026-08-20T10:00:00Z'
    }
  ],
  matches: [],
  sprints: [
    {
      id: 'sp_groundwater_sample',
      buildCallId: 'call_groundwater',
      title: 'Groundwater optical probe calibration squad',
      description: 'Illustrative Demonstration: Assembling optical probe enclosure, testing ADC response curves, and validating telemetry.',
      domain: 'climate',
      stage: 'forming',
      teamCapacity: 3,
      members: [
        { userId: 'usr_illustrative_1', squadRole: 'Hardware Lead', displayName: 'Field Engineer (Sample)', avatarSeed: 'gw-1' }
      ],
      skillTags: ['Climate', 'Hardware'],
      startDate: '2026-08-25',
      endDate: '2026-09-08',
      daysTotal: 14,
      daysLeft: 9,
      progressPct: 33,
      isIllustrative: true,
      statusHint: 'Illustrative demonstration cycle'
    }
  ],
  notebook_entries: [
    {
        "id": "entry_groundwater",
        "authorId": "usr_priya_nandan",
        "userId": "usr_priya_nandan",
        "authorName": "Priya Nandan",
        "sprintId": null,
        "parentEntryId": null,
        "grownFromLabel": "Sprint: Groundwater Sensor",
        "title": "Why my groundwater model kept overfitting on rainy days",
        "content": "### The Problem\nWhen evaluating our groundwater aquifer prediction model across 14 monitoring boreholes, we noticed validation loss plummeted during dry weeks but spiked violently by +380% during heavy precipitation events.\n\n### The Root Cause\nInspection of raw sensor telemetry revealed that three optical turbidity probes had cracked rubber seals. Rainwater seepage caused micro-droplets on the lens, creating synthetic high-turbidity pulses that the gradient boosting model interpreted as dramatic aquifer recharge events.\n\n```python\n# Isolated drift script snippet\nimport pandas as pd\nimport numpy as np\n\ndef check_turbidity_residual(df):\n    rain_mask = df['precip_mm'] > 5.0\n    return df.loc[rain_mask, 'turbidity_ntu'].std() / df.loc[~rain_mask, 'turbidity_ntu'].std()\n```\n\n### Resolution & Takeaway\nWe replaced the optical seals with vulcanized nitrile O-rings and added an automated drift rejection filter that discards single-point spikes that violate physical flow dynamics. The model stabilized with RMSE < 0.08 m across all weather conditions.",
        "bodyMarkdown": "### The Problem\nWhen evaluating our groundwater aquifer prediction model across 14 monitoring boreholes, we noticed validation loss plummeted during dry weeks but spiked violently by +380% during heavy precipitation events.\n\n### The Root Cause\nInspection of raw sensor telemetry revealed that three optical turbidity probes had cracked rubber seals. Rainwater seepage caused micro-droplets on the lens, creating synthetic high-turbidity pulses that the gradient boosting model interpreted as dramatic aquifer recharge events.\n\n```python\n# Isolated drift script snippet\nimport pandas as pd\nimport numpy as np\n\ndef check_turbidity_residual(df):\n    rain_mask = df['precip_mm'] > 5.0\n    return df.loc[rain_mask, 'turbidity_ntu'].std() / df.loc[~rain_mask, 'turbidity_ntu'].std()\n```\n\n### Resolution & Takeaway\nWe replaced the optical seals with vulcanized nitrile O-rings and added an automated drift rejection filter that discards single-point spikes that violate physical flow dynamics. The model stabilized with RMSE < 0.08 m across all weather conditions.",
        "summarySnippet": "Turns out three optical sensors were miscalibrated after heavy storms and I was training on noise. Here is how I caught and isolated the drift.",
        "teaser": "rmse_by_weather.py:14 → std(residual | rain) >> std(residual | dry)",
        "domain": "climate",
        "entryType": "post-mortem",
        "tags": [
            "optical-sensors",
            "drift",
            "groundwater",
            "python"
        ],
        "branches": [],
        "moderationStatus": "approved",
        "isPublic": true,
        "isIllustrative": false,
        "coverImageUrl": null,
        "readingTimeMinutes": 3,
        "viewCount": 142,
        "isFeatured": false,
        "isFounderPost": false,
        "status": "published",
        "createdAt": "2026-09-18T14:30:00Z",
        "updatedAt": null
    },
    {
        "id": "entry_thermal_vent",
        "authorId": "usr_ines_falk",
        "userId": "usr_ines_falk",
        "authorName": "Ines Falk",
        "sprintId": null,
        "parentEntryId": null,
        "grownFromLabel": "Sprint: Decentralized Fault Detection",
        "title": "First failed prototype of the fault-detection board",
        "content": "### Prototype Teardown\nOur team field-tested Rev A of the grid fault detector in an unconditioned solar inverter bay in Phoenix. Ambient temperatures inside the metal junction box exceeded 48°C.\n\n### Failure Analysis\nBecause our rapid prototype housing was printed with solid PETG walls and no convection chimney, heat generated by the onboard 24V step-down buck converter had nowhere to dissipate. Junction temperatures on the ADS1115 analog-to-digital converter reached 84°C after six hours, triggering thermal shutdown.\n\n### Rev B Modifications\n1. Added staggered hexagonal vent chimneys at top and bottom of the housing.\n2. Coupled the regulator to an anodized aluminum spreader plate with thermal pad interface.\n3. Swapped to high-Tg polycarbonate-CF blend.\n\nTemperature plateaued safely at 54°C in torture chamber validation.",
        "bodyMarkdown": "### Prototype Teardown\nOur team field-tested Rev A of the grid fault detector in an unconditioned solar inverter bay in Phoenix. Ambient temperatures inside the metal junction box exceeded 48°C.\n\n### Failure Analysis\nBecause our rapid prototype housing was printed with solid PETG walls and no convection chimney, heat generated by the onboard 24V step-down buck converter had nowhere to dissipate. Junction temperatures on the ADS1115 analog-to-digital converter reached 84°C after six hours, triggering thermal shutdown.\n\n### Rev B Modifications\n1. Added staggered hexagonal vent chimneys at top and bottom of the housing.\n2. Coupled the regulator to an anodized aluminum spreader plate with thermal pad interface.\n3. Swapped to high-Tg polycarbonate-CF blend.\n\nTemperature plateaued safely at 54°C in torture chamber validation.",
        "summarySnippet": "The 3D-printed enclosure trapped ambient heat and cooked the ADC sensor by hour six. Redesigned the vent pattern and swapped to an aluminum heat spreader.",
        "teaser": "thermal_log.csv → 84°C at t+6h, spec max 65°C",
        "domain": "hardware",
        "entryType": "teardown",
        "tags": [
            "hardware",
            "pcb",
            "thermal",
            "cad"
        ],
        "branches": [],
        "moderationStatus": "approved",
        "isPublic": true,
        "isIllustrative": false,
        "coverImageUrl": null,
        "readingTimeMinutes": 4,
        "viewCount": 98,
        "isFeatured": false,
        "isFounderPost": false,
        "status": "published",
        "createdAt": "2026-09-22T09:15:00Z",
        "updatedAt": null
    },
    {
        "id": "entry_budget_drift",
        "authorId": "usr_tariq_vance",
        "userId": "usr_tariq_vance",
        "authorName": "Tariq Vance",
        "sprintId": null,
        "parentEntryId": null,
        "grownFromLabel": "Sprint: City Budget Explorer",
        "title": "A dataset that surprised me: the line-items don't sum to the total",
        "content": "### The Anomaly\nWhile parsing open data extracts for the City Budget Explorer, our automated checksum pipeline threw continuous balance validation errors. The declared municipal total was $58.4M, but summing the departmental sub-tables produced only $56.1M.\n\n### The Investigation\nAfter auditing each capital allocation line item, we discovered that off-balance contingency fund expenditures were included in the summary headline figure but excluded from the department-level breakdown CSV.\n\n```javascript\n// Automated reconciliation validator\nconst subtotal = rows.reduce((acc, r) => acc + Number(r.amount), 0);\nconst discrepancy = Math.abs(subtotal - summaryTotal);\nif (discrepancy > 1000) {\n  reportDiscrepancy({ expected: summaryTotal, actual: subtotal, delta: discrepancy });\n}\n```\n\n### Public Impact\nWe published our automated reconciliation audit to the city comptroller's public comments desk. Two weeks later, the data portal released an amended export format documenting the capital reserve lines.",
        "bodyMarkdown": "### The Anomaly\nWhile parsing open data extracts for the City Budget Explorer, our automated checksum pipeline threw continuous balance validation errors. The declared municipal total was $58.4M, but summing the departmental sub-tables produced only $56.1M.\n\n### The Investigation\nAfter auditing each capital allocation line item, we discovered that off-balance contingency fund expenditures were included in the summary headline figure but excluded from the department-level breakdown CSV.\n\n```javascript\n// Automated reconciliation validator\nconst subtotal = rows.reduce((acc, r) => acc + Number(r.amount), 0);\nconst discrepancy = Math.abs(subtotal - summaryTotal);\nif (discrepancy > 1000) {\n  reportDiscrepancy({ expected: summaryTotal, actual: subtotal, delta: discrepancy });\n}\n```\n\n### Public Impact\nWe published our automated reconciliation audit to the city comptroller's public comments desk. Two weeks later, the data portal released an amended export format documenting the capital reserve lines.",
        "summarySnippet": "The city's published budget PDF and its open data export disagree by 4%. Wrote an automated reconciliation script before touching any user interface.",
        "teaser": "reconcile.js → drift: +$2.3M unattributed capital allocations",
        "domain": "civic",
        "entryType": "field-report",
        "tags": [
            "civic-data",
            "open-data",
            "budget",
            "audit"
        ],
        "branches": [],
        "moderationStatus": "approved",
        "isPublic": true,
        "isIllustrative": false,
        "coverImageUrl": null,
        "readingTimeMinutes": 3,
        "viewCount": 165,
        "isFeatured": false,
        "isFounderPost": false,
        "status": "published",
        "createdAt": "2026-09-25T11:45:00Z",
        "updatedAt": null
    },
    {
        "id": "entry_screen_touch",
        "authorId": "usr_marcus_webb",
        "userId": "usr_marcus_webb",
        "authorName": "Marcus Webb",
        "sprintId": null,
        "parentEntryId": null,
        "grownFromLabel": "Sprint: Adaptive Reading Tutor",
        "title": "The small fix that made the tutor usable on a cracked screen",
        "content": "### Field Testing Reality\nIn lab testing on iPads and Chrome simulated touch displays, our phonics exercise buttons passed all accessibility guidelines. But when we deployed to a public primary school in Nairobi with 20 donated 7-inch Android tablets, half had hairline cracks across the lower digitizer glass.\n\n### The Fix\nInstead of requiring users to hit exact visual bounding boxes, we implemented touch slop expansion using CSS pseudo-elements and an invisible 48px hit grid. Even with partial touch latency, tap targets register cleanly.\n\n```css\n.phonics-target {\n  position: relative;\n  min-height: 48px !important;\n}\n.phonics-target::after {\n  content: \"\";\n  position: absolute;\n  inset: -10px;\n}\n```\n\nLesson learned: Always test educational software on low-cost and refurbished hardware under actual classroom lighting.",
        "bodyMarkdown": "### Field Testing Reality\nIn lab testing on iPads and Chrome simulated touch displays, our phonics exercise buttons passed all accessibility guidelines. But when we deployed to a public primary school in Nairobi with 20 donated 7-inch Android tablets, half had hairline cracks across the lower digitizer glass.\n\n### The Fix\nInstead of requiring users to hit exact visual bounding boxes, we implemented touch slop expansion using CSS pseudo-elements and an invisible 48px hit grid. Even with partial touch latency, tap targets register cleanly.\n\n```css\n.phonics-target {\n  position: relative;\n  min-height: 48px !important;\n}\n.phonics-target::after {\n  content: \"\";\n  position: absolute;\n  inset: -10px;\n}\n```\n\nLesson learned: Always test educational software on low-cost and refurbished hardware under actual classroom lighting.",
        "summarySnippet": "Touch targets were fine in the desktop simulator but unusable on donated classroom tablets with damaged digitizers. Expanding target hitboxes solved it.",
        "teaser": "tutor.css:212 → min-height: 48px !important; margin: 8px;",
        "domain": "education",
        "entryType": "field-report",
        "tags": [
            "accessibility",
            "tablets",
            "education",
            "css"
        ],
        "branches": [],
        "moderationStatus": "approved",
        "isPublic": true,
        "isIllustrative": false,
        "coverImageUrl": null,
        "readingTimeMinutes": 3,
        "viewCount": 112,
        "isFeatured": false,
        "isFounderPost": false,
        "status": "published",
        "createdAt": "2026-09-28T08:00:00Z",
        "updatedAt": null
    },
    {
        "id": "entry_offline_conflict",
        "authorId": "usr_dr__rohan_malhotra",
        "userId": "usr_dr__rohan_malhotra",
        "authorName": "Dr. Rohan Malhotra",
        "sprintId": null,
        "parentEntryId": null,
        "grownFromLabel": "Sprint: Pediatric Spirometer",
        "title": "Post-mortem: our offline sync merge conflicts in rural clinics",
        "content": "### Incident Summary\nDuring field trials across three sub-district clinics without reliable cellular coverage, nurses recorded pediatric spirometry measurements on battery-powered field terminals. When clinics reconnected to the central server in the evening, last-write-wins timestamp replication silently overwrote afternoon inhalation flow curves.\n\n### Architectural Migration\nWe replaced timestamp-based REST sync with Automerge Conflict-Free Replicated Data Types (CRDTs). Every spirometry run is represented as an append-only delta event with cryptographic vector clocks.\n\n### Results\nMerge conflicts dropped from an average of 40 per day to zero. Even when two nurses enter patient vitals simultaneously while disconnected, both observations merge cleanly without data loss.",
        "bodyMarkdown": "### Incident Summary\nDuring field trials across three sub-district clinics without reliable cellular coverage, nurses recorded pediatric spirometry measurements on battery-powered field terminals. When clinics reconnected to the central server in the evening, last-write-wins timestamp replication silently overwrote afternoon inhalation flow curves.\n\n### Architectural Migration\nWe replaced timestamp-based REST sync with Automerge Conflict-Free Replicated Data Types (CRDTs). Every spirometry run is represented as an append-only delta event with cryptographic vector clocks.\n\n### Results\nMerge conflicts dropped from an average of 40 per day to zero. Even when two nurses enter patient vitals simultaneously while disconnected, both observations merge cleanly without data loss.",
        "summarySnippet": "Two clinic nurses editing the same patient trial record offline with no network coordinator. Migrated to deterministic conflict-free replicated data types.",
        "teaser": "sync.md → conflicts/day dropped from 40 to 0 after CRDT migration",
        "domain": "health",
        "entryType": "post-mortem",
        "tags": [
            "crdt",
            "offline-first",
            "health",
            "sync"
        ],
        "branches": [],
        "moderationStatus": "approved",
        "isPublic": true,
        "isIllustrative": false,
        "coverImageUrl": null,
        "readingTimeMinutes": 3,
        "viewCount": 6,
        "isFeatured": false,
        "isFounderPost": false,
        "status": "published",
        "createdAt": "2026-09-05T16:20:00Z",
        "updatedAt": null
    },
    {
        "id": "entry_radar_speckle",
        "authorId": "usr_deshi_osei",
        "userId": "usr_deshi_osei",
        "authorName": "Deshi Osei",
        "sprintId": null,
        "parentEntryId": null,
        "grownFromLabel": "Sprint: SAR Canopy Change Detection",
        "title": "Filtering speckle noise in Sentinel-1 dual-pol backscatter over flooded mangroves",
        "content": "### Technical Bottleneck\nSynthetic Aperture Radar (SAR) Sentinel-1 C-band backscatter penetrates cloud cover but suffers from severe speckle noise in intertidal mangrove forests. High tides create specular reflectance surfaces that simulate complete canopy clearance in automated threshold classifiers.\n\n### Implementation\nWe built an adaptive spatial Lee filter combined with a localized tidal elevation mask derived from the Copernicus digital elevation model. If the backscatter drop coincides with lunar peak high tide, the change detector dampens sensitivity.\n\n```python\n# Enhanced Lee speckle suppression\ndef lee_filter(img, win_size=5):\n    mean = uniform_filter(img, win_size)\n    var = uniform_filter(img**2, win_size) - mean**2\n    weight = var / (var + np.mean(var))\n    return mean + weight * (img - mean)\n```\n\nFalse-positive mangrove clearing alerts were reduced by 72% across the Niger Delta test corridor.",
        "bodyMarkdown": "### Technical Bottleneck\nSynthetic Aperture Radar (SAR) Sentinel-1 C-band backscatter penetrates cloud cover but suffers from severe speckle noise in intertidal mangrove forests. High tides create specular reflectance surfaces that simulate complete canopy clearance in automated threshold classifiers.\n\n### Implementation\nWe built an adaptive spatial Lee filter combined with a localized tidal elevation mask derived from the Copernicus digital elevation model. If the backscatter drop coincides with lunar peak high tide, the change detector dampens sensitivity.\n\n```python\n# Enhanced Lee speckle suppression\ndef lee_filter(img, win_size=5):\n    mean = uniform_filter(img, win_size)\n    var = uniform_filter(img**2, win_size) - mean**2\n    weight = var / (var + np.mean(var))\n    return mean + weight * (img - mean)\n```\n\nFalse-positive mangrove clearing alerts were reduced by 72% across the Niger Delta test corridor.",
        "summarySnippet": "Water specular reflections caused false-positive canopy drop alerts in tidal zones. Implemented an enhanced Lee filter with adaptive spatial windowing.",
        "teaser": "sar_filter.py → false alarm rate reduced by 72% in intertidal zones",
        "domain": "forestry",
        "entryType": "sprint-update",
        "tags": [
            "sar",
            "radar",
            "mangroves",
            "gis",
            "python"
        ],
        "branches": [],
        "moderationStatus": "approved",
        "isPublic": true,
        "isIllustrative": false,
        "coverImageUrl": null,
        "readingTimeMinutes": 4,
        "viewCount": 189,
        "isFeatured": false,
        "isFounderPost": false,
        "status": "published",
        "createdAt": "2026-10-05T10:10:00Z",
        "updatedAt": null
    }
],
  applications: [],
  moderation_queue: [],
  audit_events: [],
  user_roles: [],
  content_items: [
      {
          "id": "cnt_hero_headline",
          "contentKey": "home.hero.headline",
          "contentType": "statement",
          "title": "Home Hero Headline",
          "body": "Where Capable People Build What Matters.",
          "summary": "Main landing page bold mission headline",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 1,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_hero_subheadline",
          "contentKey": "home.hero.subheadline",
          "contentType": "statement",
          "title": "Home Hero Subheadline",
          "body": "Canopy connects engineers, researchers, and field specialists to scope, staff, and ship open climate & civic hardware and software.",
          "summary": "Landing page secondary explanation copy",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 2,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_beta_announcement",
          "contentKey": "home.private_beta_banner",
          "contentType": "announcement",
          "title": "Private Beta Announcement Banner",
          "body": "\ud83c\udf31 Private Beta Open: Cohort 1 submissions are being reviewed on a rolling basis.",
          "summary": "Banner appearing across all marketing headers",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 3,
          "version": 1,
          "publishedAt": "2026-08-15T00:00:00Z",
          "createdAt": "2026-08-15T00:00:00Z"
      },
      {
          "id": "cnt_founder_quote",
          "contentKey": "home.founder_quote",
          "contentType": "statement",
          "title": "Founder Perspective Quote",
          "body": "I kept hearing the same frustration from brilliant people: they wanted to work on things that genuinely mattered, but the machinery of grants, committee approvals, and credentialism kept them waiting. So I started Canopy to close that gap \u2014 one Build Call, one sprint, one shipped project at a time.",
          "summary": "Quote attributed to founder Aarushi Chatterjee",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 4,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_sprint_headline",
          "contentKey": "sprint.hero.headline",
          "contentType": "statement",
          "title": "Sprint Hero Headline",
          "body": "The clock is already ticking.",
          "summary": "Primary headline for Sprint countdown hero",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 5,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_sprint_subheadline",
          "contentKey": "sprint.hero.subheadline",
          "contentType": "statement",
          "title": "Sprint Hero Subheadline",
          "body": "A real team. A visible deadline. A shipped prototype at the end. No month-long email chains.",
          "summary": "Secondary lede beneath sprint clock",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 6,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_sprint_lede",
          "contentKey": "sprint.lede",
          "contentType": "statement",
          "title": "Sprint Lede Statement",
          "body": "Two to four weeks, a visible clock, and a real squad.",
          "summary": "Sprint section narrative lede",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 7,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_notebook_headline",
          "contentKey": "notebook.hero.headline",
          "contentType": "statement",
          "title": "Lab Notebook Hero Headline",
          "body": "The Lab Notebook",
          "summary": "Notebook hero title",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 8,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_notebook_lede",
          "contentKey": "notebook.lede",
          "contentType": "statement",
          "title": "Lab Notebook Lede",
          "body": "Every sprint ships something. The Notebook is where it lives \u2014 teardowns, field notes, and open schematics.",
          "summary": "Notebook narrative lede",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 9,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_match_headline",
          "contentKey": "match.hero.headline",
          "contentType": "statement",
          "title": "Match Directory Hero Headline",
          "body": "Find your squad. Build what matters.",
          "summary": "Match sandbox hero title",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 10,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_match_lede",
          "contentKey": "match.lede",
          "contentType": "statement",
          "title": "Match Directory Lede",
          "body": "Match with intent, sprint with a team, and ship prototypes that matter.",
          "summary": "Match directory overview lede",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 11,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_gw_notice",
          "contentKey": "match.illustrative_example",
          "contentType": "example_notice",
          "title": "Illustrative Example Notice",
          "body": "Illustrative Example \u2014 This workspace demonstrates how Canopy works. It is not a live opportunity and is not accepting applications.",
          "summary": "Disclaimer badge on illustrative product loop demo",
          "status": "published",
          "visibility": "public",
          "isIllustrative": true,
          "sortOrder": 12,
          "version": 1,
          "publishedAt": "2026-08-20T00:00:00Z",
          "createdAt": "2026-08-20T00:00:00Z"
      },
      {
          "id": "cnt_apply_headline",
          "contentKey": "apply.hero.headline",
          "contentType": "statement",
          "title": "Application Hero Headline",
          "body": "Join the Canopy Fellowship",
          "summary": "Application page hero title",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 13,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_footer_motto",
          "contentKey": "footer.motto",
          "contentType": "statement",
          "title": "Footer Motto",
          "body": "Canopy: Connect. Collaborate. Ship things that matter.",
          "summary": "Site-wide footer mission motto",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 14,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      },
      {
          "id": "cnt_footer_charter",
          "contentKey": "footer.charter",
          "contentType": "statement",
          "title": "Footer Charter Statement",
          "body": "We believe public problems deserve modern engineering velocity.",
          "summary": "Site-wide footer charter statement",
          "status": "published",
          "visibility": "public",
          "isIllustrative": false,
          "sortOrder": 15,
          "version": 1,
          "publishedAt": "2026-08-01T00:00:00Z",
          "createdAt": "2026-08-01T00:00:00Z"
      }
  ],
  platform_settings: [
    {
      key: 'listing_limits',
      value: { calls: 20, sprints: 20, notebook: 30 },
      description: 'Default card pagination and listing limits for public directories',
      updatedBy: 'system_bootstrap',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z'
    },
    {
      key: 'feature_flags',
      value: {
        allowPublicNotebookPublishing: true,
        showIllustrativeItems: true,
        requireModerationForCalls: true
      },
      description: 'Platform operational feature flags and moderation controls',
      updatedBy: 'system_bootstrap',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z'
    }
  ]
};

const os = require('os');

const TMP_DB_FILE = path.join(os.tmpdir(), 'canopy-db.json');
const STORAGE_BUCKET = 'canopy_store';
const STORAGE_FILE = 'canopy-db.json';

let inMemoryDb = null;
let lastRemoteSync = 0;
const SYNC_THROTTLE_MS = 2500;

function isIsolated() {
  return process.env.CANOPY_ISOLATE_STORE === 'true' || process.env.NODE_ENV === 'test';
}

function readDb() {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  // 1. Check if TMP_DB_FILE exists and is strictly newer than DB_FILE (e.g. written by serverless runtime)
  let useTmp = false;
  if (fs.existsSync(TMP_DB_FILE)) {
    try {
      if (fs.existsSync(DB_FILE)) {
        useTmp = fs.statSync(TMP_DB_FILE).mtimeMs > fs.statSync(DB_FILE).mtimeMs;
      } else {
        useTmp = true;
      }
    } catch (_) {}
  }

  if (useTmp) {
    try {
      const raw = fs.readFileSync(TMP_DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(raw);
      for (const [col, defaultVal] of Object.entries(INITIAL_DATA)) {
        if (!Array.isArray(inMemoryDb[col])) {
          inMemoryDb[col] = JSON.parse(JSON.stringify(defaultVal));
        }
      }
      return inMemoryDb;
    } catch (_) {}
  }

  // 2. Primary Source of Truth: Read from repo DB_FILE (canopy-db.json)
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(raw);
      for (const [col, defaultVal] of Object.entries(INITIAL_DATA)) {
        if (!Array.isArray(inMemoryDb[col])) {
          inMemoryDb[col] = JSON.parse(JSON.stringify(defaultVal));
        }
      }
      return inMemoryDb;
    }
  } catch (err) {
    console.error('[Canopy Store] DB_FILE read error:', err.message);
  }

  // 3. Fallback to INITIAL_DATA
  inMemoryDb = JSON.parse(JSON.stringify(INITIAL_DATA));
  return inMemoryDb;
}

function writeDb(data) {
  inMemoryDb = data;
  const jsonStr = JSON.stringify(data, null, 2);

  // Write to primary DB_FILE if writable
  try {
    fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');
  } catch (_) {
    // Expected on read-only serverless filesystems (e.g. AWS Lambda / Vercel)
  }

  // Always write to OS tmpdir for local container durability
  try {
    fs.writeFileSync(TMP_DB_FILE, jsonStr, 'utf-8');
  } catch (_) {}

  // Asynchronously sync to Supabase Storage if configured
  try {
    const { supabase, isConfigured } = require('../config/supabase');
    if (isConfigured() && supabase) {
      supabase.storage
        .from(STORAGE_BUCKET)
        .upload(STORAGE_FILE, jsonStr, { contentType: 'application/json', upsert: true })
        .then(() => {
          lastRemoteSync = Date.now();
        })
        .catch(err => {
          console.warn('[Canopy Store:AsyncUpload:Warn]', err.message);
        });
    }
  } catch (_) {}

  return true;
}

const store = {
  resetTestDb() {
    inMemoryDb = JSON.parse(JSON.stringify(INITIAL_DATA));
  },

  async ensureSynced(force = false) {
    if (isIsolated()) {
      return inMemoryDb || readDb();
    }
    const now = Date.now();
    if (!force && lastRemoteSync && (now - lastRemoteSync) < SYNC_THROTTLE_MS) {
      return inMemoryDb || readDb();
    }
    try {
      const { supabase, isConfigured } = require('../config/supabase');
      if (isConfigured() && supabase) {
        const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(STORAGE_FILE);
        if (!error && data) {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            // MERGE: Preserve any local in-memory users and profiles that are newer or not yet synced
            if (inMemoryDb && Array.isArray(inMemoryDb.users)) {
              if (!Array.isArray(parsed.users)) parsed.users = [];
              for (const localUser of inMemoryDb.users) {
                const remoteIdx = parsed.users.findIndex(u => 
                  u.id === localUser.id || 
                  (u.email && localUser.email && u.email.toLowerCase() === localUser.email.toLowerCase())
                );
                if (remoteIdx === -1) {
                  parsed.users.unshift(localUser);
                } else if (localUser.isVerified && !parsed.users[remoteIdx].isVerified) {
                  parsed.users[remoteIdx] = localUser;
                }
              }
            }
            if (inMemoryDb && Array.isArray(inMemoryDb.profiles)) {
              if (!Array.isArray(parsed.profiles)) parsed.profiles = [];
              for (const localProf of inMemoryDb.profiles) {
                if (!parsed.profiles.some(p => p.id === localProf.id || p.userId === localProf.userId)) {
                  parsed.profiles.unshift(localProf);
                }
              }
            }
            for (const [col, defaultVal] of Object.entries(INITIAL_DATA)) {
              if (!Array.isArray(parsed[col])) {
                parsed[col] = inMemoryDb && Array.isArray(inMemoryDb[col]) 
                  ? inMemoryDb[col] 
                  : JSON.parse(JSON.stringify(defaultVal));
              }
            }

            inMemoryDb = parsed;
            lastRemoteSync = now;
            try {
              fs.writeFileSync(TMP_DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
            } catch (_) {}
            try {
              fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
            } catch (_) {}
            return inMemoryDb;
          }
        }
      }
    } catch (err) {
      // Remote download graceful fallback
    }
    lastRemoteSync = now;
    return inMemoryDb || readDb();
  },

  async persistRemote() {
    const db = inMemoryDb || readDb();
    try {
      const { supabase, isConfigured } = require('../config/supabase');
      if (isConfigured() && supabase) {
        const payload = JSON.stringify(db, null, 2);
        const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(STORAGE_FILE, payload, {
          contentType: 'application/json',
          upsert: true
        });
        if (error) {
          console.warn('[Canopy Store] Remote upload warning:', error.message);
        } else {
          lastRemoteSync = Date.now();
        }
      }
    } catch (err) {
      console.warn('[Canopy Store] Remote upload warning:', err.message);
    }
    return db;
  },

  getCollection(name) {
    const db = readDb();
    if (!Array.isArray(db[name])) {
      db[name] = INITIAL_DATA[name] ? JSON.parse(JSON.stringify(INITIAL_DATA[name])) : [];
    }
    return db[name];
  },

  getItem(name, predicate) {
    const coll = this.getCollection(name);
    return coll.find(predicate) || null;
  },

  addItem(name, item) {
    const db = readDb();
    if (!db[name]) db[name] = [];
    db[name].unshift(item);
    writeDb(db);
    return item;
  },

  updateItem(name, predicate, updates) {
    const db = readDb();
    if (!db[name]) return null;
    const index = db[name].findIndex(predicate);
    if (index === -1) return null;
    db[name][index] = { ...db[name][index], ...updates, updatedAt: new Date().toISOString() };
    writeDb(db);
    return db[name][index];
  },

  deleteItem(name, predicate) {
    const db = readDb();
    if (!db[name]) return false;
    const initialLen = db[name].length;
    db[name] = db[name].filter(item => !predicate(item));
    writeDb(db);
    return db[name].length < initialLen;
  },

  // Supabase Live Client & Query Helpers
  supabase: require('../config/supabase').supabase,
  isLiveDb: () => require('../config/supabase').isConfigured(),

  async fromSupabase(table) {
    const { supabase, isConfigured } = require('../config/supabase');
    if (!isConfigured() || !supabase) {
      return null;
    }
    return supabase.from(table);
  }
};

module.exports = { store };
