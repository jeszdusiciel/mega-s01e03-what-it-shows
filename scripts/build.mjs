import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import { compile } from 'svelte/compiler';
import { mdsvex } from 'mdsvex';
import { render } from 'svelte/server';
import { uniqueById, groupByCause } from '../src/lib/kb/causes.ts';

const root = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(p, 'utf8');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const pages = walk(path.join(root,'src/routes')).filter(p => p.endsWith('.svx'));
const tenantFiles = walk(path.join(root,'src/lib/data/tenants')).filter(p => p.endsWith('.json'));
const out = path.join(root,'.build');
fs.mkdirSync(out,{recursive:true});
const compiler = mdsvex({extensions:['.svx'],layout:{runbook:path.join(root,'src/lib/layouts/runbook.svelte').replaceAll('\\','/')}});
const compiled = new Map();

async function moduleFor(file) {
  file = path.resolve(file);
  if (compiled.has(file)) return compiled.get(file);
  const dest = path.join(out,path.relative(root,file).replace(/\.(svx|svelte|ts)$/,'.mjs'));
  compiled.set(file,dest);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  if (file.endsWith('.json')) { fs.copyFileSync(file,dest); return dest; }
  let source = read(file);
  if (file.endsWith('.svx')) source = (await compiler.markup({content:source,filename:file})).code;
  // Expand the export's Vite globs deterministically for the static build.
  if (source.includes('import.meta.glob')) {
    const list = file.endsWith('locales.ts') ? tenantFiles : pages.filter(p => path.relative(root,p).replaceAll('\\','/') !== 'src/routes/kb/+page.svx');
    const imports = list.map((p,i) => `import * as glob${i} from ${JSON.stringify(p.replaceAll('\\','/'))};`).join('\n');
    const eagerDefault = file.endsWith('locales.ts');
    const object = '{'+list.map((p,i) => `${JSON.stringify('/'+path.relative(root,p).replaceAll('\\','/'))}:glob${i}${eagerDefault?'.default':''}`).join(',')+'}';
    source = source.replace(/import\.meta\.glob[^\n]*?\);/, object+(eagerDefault?');':';'));
    if (file.endsWith('.svelte')) source = source.replace(/(<script[^>]*>)/,`$1\n${imports}`);
    else source = imports+'\n'+source;
  }
  if (file.endsWith('.svelte') || file.endsWith('.svx')) {
    const result = compile(source,{filename:file,generate:'server',css:'injected'});
    source = result.js.code;
    const warnings = result.warnings.filter(w => !['slot_element_deprecated','event_directive_deprecated'].includes(w.code));
    if (warnings.length) console.warn(file, warnings.map(w=>w.message).join('\n'));
  } else if (file.endsWith('.ts')) source = stripTypeScriptTypes(source);
  const imports = [...source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)];
  for (const match of imports) {
    const spec = match[1];
    if (!(spec.startsWith('#lib/') || spec.startsWith('.') || path.isAbsolute(spec))) continue;
    let resolved = spec.startsWith('#lib/') ? path.join(root,'src/lib',spec.slice(5)) : path.resolve(path.dirname(file),spec);
    if (!fs.existsSync(resolved)) resolved += '.ts';
    const dep = await moduleFor(resolved);
    const relative = './'+path.relative(path.dirname(dest),dep).replaceAll('\\','/');
    source = source.replaceAll(JSON.stringify(spec),JSON.stringify(relative)).replaceAll("'"+spec+"'",JSON.stringify(relative));
    if (resolved.endsWith('.json')) source = source.replace(new RegExp(`from ${JSON.stringify(relative).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?! with)`,'g'),`from ${JSON.stringify(relative)} with {type:'json'}`);
  }
  fs.writeFileSync(dest,source);
  return dest;
}

for (const file of pages) {
  const mod = await import(pathToFileURL(await moduleFor(file)));
  const {body,head} = await render(mod.default);
  const route = path.relative(path.join(root,'src/routes'),path.dirname(file));
  const dir = path.join(root,'rendered',route);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body>${body}</body></html>`);
}

const all = JSON.parse(read(path.join(root,'src/lib/data/reports-4471.json')));
const tenants = tenantFiles.map(p=>JSON.parse(read(p)));
const reports = uniqueById(all).filter(r=>r.mergedInto===4471);
const groups = groupByCause(reports,r=>tenants.find(t=>t.handle===r.tenant));
fs.mkdirSync(path.join(root,'evidence'),{recursive:true});
fs.writeFileSync(path.join(root,'evidence/assignments.json'),JSON.stringify({rows:all.length,unique:reports.length,groups:groups.map(g=>({...g,reports:g.reports.map(r=>r.id)}))},null,2)+'\n');
const titles = {parser:'Shared month-first parser flips dates for day-first tenants',hint:'booking-v3 date hint contradicts day-first form interpretation'};
const explanation = {
  parser:`The shared parser reads month first for day-first tenants. R-41200 (harbour.dental, en-GB, booking-v2, app) reports 7 April becoming 4 July. A v3 tenant using app/email also follows this path; v3 form submissions are classified separately. Fix parsing to use the tenant's explicit format and reject invalid dates. Check app, email and v2 forms, both form versions' non-form paths, ambiguous dates, and date-only timezone preservation.\n\nFive assigned reports are not confirmed month/day swaps: R-41202, R-41209, R-41236, R-41344 and R-41620. Their bodies describe one-day shifts, June-only failures, an early invite and a cross-timezone discrepancy. Retain their filed associations for count reconciliation; investigate original dates, timezone, event IDs and send timestamps before asserting a cause.`,
  hint:`booking-v3 prints MM/DD/YYYY while day-first tenants' forms read their local day-first format. A user following the hint can enter 04/07/2026 intending 7 April and get 4 July. Fix the hint and form interpretation together using one tenant-format source; a parser fix alone does not address this UI failure. Check v3 form submissions for alder.physio (de-DE), copper.studio (es-ES) and pale.harbour (pt-PT); keep v2 forms and app/email as separate regression cases.`
};
fs.mkdirSync(path.join(root,'tickets'),{recursive:true});
for (const group of groups) {
  const body = `# ${titles[group.cause]}\n\nReports covered: **${group.reports.length} unique reports** from #4471.\n\n${explanation[group.cause]}\n\n## Evidence and counting\n\nSupplied export: 427 rows, 412 unique IDs, all merged into #4471. Deduplicate by ID, join tenant records, derive day-first order with Intl.DateTimeFormat, then use causes.ts: day-first + form + booking-v3 gives hint; other day-first paths give parser. Intake tags and browser locale are not authoritative. This group spans ${group.tenants} tenants, ${group.firstSeen} to ${group.lastSeen}. Intake tags: ${JSON.stringify(group.taggedAs)}. The other ticket covers ${reports.length-group.reports.length} reports.\n\n## Desk action\n\nKeep this issue separate from the other failing path. Replace subject-only merging with cause-based triage; unknown tenants and contradictory symptoms need investigation. Track received time separately from merge time. The 2 July batch is a merge event, not the onset of the incident, and reports continue through 4 October.\n\nSee src/routes/kb/incidents/4471-review/+page.svx and rendered/kb/incidents/4471-review/index.html. No production fix is claimed.\n\n## Report IDs\n\n${group.reports.map(r=>r.id).join(', ')}\n`;
  fs.writeFileSync(path.join(root,'tickets',group.cause+'.md'),body);
}
console.log(`Rendered ${pages.length} pages; ${all.length} rows -> ${reports.length} unique reports; ${groups.map(g=>g.cause+': '+g.reports.length).join(', ')}.`);
