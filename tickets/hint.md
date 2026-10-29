# booking-v3 date hint contradicts day-first form interpretation

Reports covered: **33 unique reports** from #4471.

booking-v3 prints MM/DD/YYYY while day-first tenants' forms read their local day-first format. A user following the hint can enter 04/07/2026 intending 7 April and get 4 July. Fix the hint and form interpretation together using one tenant-format source; a parser fix alone does not address this UI failure. Check v3 form submissions for alder.physio (de-DE), copper.studio (es-ES) and pale.harbour (pt-PT); keep v2 forms and app/email as separate regression cases.

## Evidence and counting

Supplied export: 427 rows, 412 unique IDs, all merged into #4471. Deduplicate by ID, join tenant records, derive day-first order with Intl.DateTimeFormat, then use causes.ts: day-first + form + booking-v3 gives hint; other day-first paths give parser. Intake tags and browser locale are not authoritative. This group spans 3 tenants, 2026-04-17 to 2026-09-22. Intake tags: {"parser":15,"hint":18}. The other ticket covers 379 reports.

## Desk action

Keep this issue separate from the other failing path. Replace subject-only merging with cause-based triage; unknown tenants and contradictory symptoms need investigation. Track received time separately from merge time. The 2 July batch is a merge event, not the onset of the incident, and reports continue through 4 October.

See src/routes/kb/incidents/4471-review/+page.svx and rendered/kb/incidents/4471-review/index.html. No production fix is claimed.

## Report IDs

R-41230, R-41241, R-41251, R-41259, R-41262, R-41275, R-41294, R-41305, R-41308, R-41366, R-41372, R-41384, R-41387, R-41396, R-41400, R-41406, R-41415, R-41416, R-41418, R-41428, R-41439, R-41441, R-41449, R-41453, R-41456, R-41460, R-41472, R-41485, R-41493, R-41539, R-41572, R-41582, R-41584
