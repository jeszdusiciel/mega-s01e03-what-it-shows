<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { groupByCause, uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  const all = reports as Report[];
  const merged = uniqueById(all).filter(r => r.mergedInto === 4471);
  const groups = groupByCause(merged, tenantOf);
  const disputed = merged.filter(r => notes.oneDayMove.includes(r.id));
  const batch = merged.filter(r => r.mergedAt?.slice(0, 10) === '2026-07-02');
  const later = merged.filter(r => r.receivedAt.slice(0, 10) > '2026-07-02');
  const mismatch = groups.reduce((n, g) => n + g.reports.filter(r => r.meta.intakeTag !== g.cause).length, 0);
</script>

<p>{all.length} export rows contain {merged.length} unique reports: {all.length - merged.length} repeated IDs are counted once.
  {mismatch} intake tags disagree with the supplied tenant/channel rule.</p>
<p>{batch.length} reports were merged on 2 July; {later.length} reports arrived after that day.</p>
<h3>Reports requiring investigation</h3>
<table>
  <thead><tr><th>Report</th><th>Tenant / channel</th><th>What the reporter said</th></tr></thead>
  <tbody>{#each disputed as r (r.id)}<tr><td>{r.id}</td><td>{r.tenant} / {r.channel}</td><td>{r.body}</td></tr>{/each}</tbody>
</table>
