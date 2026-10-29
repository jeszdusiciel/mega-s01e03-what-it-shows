# S01E03 · incident 4471 review

Two accepted tickets cover 412 unique reports: [parser · 379](https://github.com/jeszdusiciel/mega-s01e03-what-it-shows/issues/1)
and [hint · 33](https://github.com/jeszdusiciel/mega-s01e03-what-it-shows/issues/2).
The course's engineering update closes #4471 on 5 October: parser fixed;
hint won't fix because booking-v3 was retired. These are distinct outcomes.

- [Signed review source](src/routes/kb/incidents/4471-review/+page.svx)
- [Rendered desk page](rendered/kb/incidents/4471-review/index.html)
- [Replacement triage decision](src/routes/kb/decisions/0002-dedupe-by-cause/+page.svx)
- [Auditable report assignments](evidence/assignments.json)
- [Build instructions](BUILDING.md)

The original export's README follows.

# kb — the support knowledge base

**kb** = knowledge base. What the support desk knows about how our products break, written
down where the code can keep it honest.

One desk takes reports for every product we run: `sched-prod` (calendar invites for about
300k people) and the rest. When something
goes wrong, the reports reach the desk first. This kb is how the desk triages them, what each
incident turned out to be, and why we decided what we decided.

## What's here

```
src/routes/kb/      the pages (.svx: Markdown with components)
  triage/           how the desk handles incoming reports
  incidents/        one page per big ticket
  decisions/        numbered decision records
src/lib/kb/         components and the logic they run
src/lib/layouts/    the frame every page shares
src/lib/data/       exports from the ticket system
```

## Conventions

- Words in the page, logic in `src/lib` (imported as `#lib/…`). A number that can be computed belongs in a component.
- Every page starts with frontmatter: `title`, `owner`, `status`, `reviewed`.
- A decision is never edited after it is accepted. A new record replaces it.
- A page you add is signed: its frontmatter carries your `signature` and it ends with `<RenderStamp {signature} />`, so the desk knows who wrote it.

## Owners

Support desk. Decision records: whoever signed them.

---

Exported 2026-10-04 from the `support` repo, `apps/kb/` → `src/`.
