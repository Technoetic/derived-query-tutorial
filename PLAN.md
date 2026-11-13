# Derived Query tutorial implementation plan

Goal: Build a Korean interactive tutorial for Martin Fowler's Replace Derived Variable with Query and publish it to Technoetic/derived-query-tutorial GitHub Pages.

Architecture: Dependency-free native modules with class-based screens/services and layered CSS. Reuse reviewed generic navigation/version/storage infrastructure from the user's prior Rename Field tutorial, then implement a new domain model, content and visual experience. Hash routes preserve GitHub Pages direct links. Build-specific module/CSS identities and retained prior assets support clean full-document A-to-B navigation.

User constraints: Apply the installed webapp6 canonical six rules and real-app matrix. Never create/register/upload/deploy to Sites/chatgpt.site. Aside only for browser automation; no Playwright. No private vault data, credentials or existing learner storage is copied. User explicitly authorized new GitHub Pages publication.

Ruling: A new repository and directory provide isolation. Use a single cafe order theme, seven screens and six exercises, following the user's existing tutorial context without asking for routine choices. The new experience is a tutorial, not an arcade game.

Learning contract: A stored derived total can drift after a source edit. Distinguish demonstrating/fixing that bug from behavior-preserving refactoring. In the lab, first resynchronize an already incorrect stored total, then replace it with a pure query only when the values agree. Query mode has no duplicate cached total in its snapshot. Reading is pure; query here means obtaining a value, not necessarily SQL or a server call. Historical finalized receipts and measured performance-sensitive caches are counterexamples to blind removal.

Screens: /, /story, /lab, /proof, /practice, /code, /summary. Unknown hashes get a missing-screen view. Six answerable exercises and a note are explicitly saved only to this browser. Independent lab/practice snapshots, saved revisions and in-flight protection preserve edits made during saving.

Domain/UI interface: OrderSession from src/tutorial/order-model.js: constructor(draft?), snapshot(), updateItem(id, patch), addItem(item?), removeItem(id), synchronize(), refactor(), restartStored(), reset(), total(), expectedTotal(), matches(), markSaved(snapshot,savedAt), discardChanges(), getters dirty and mode. snapshot: {schema:1,mode:'stored'|'query',items:[{id,name,price,quantity}],cachedTotal?}; cachedTotal only in stored mode. Optional savedAt only in persisted shape. DEFAULT_ITEMS has espresso3500x2 and latte4500x1. Strict integer price/quantity bounds, no invalid or unsafe values. Export validateLabDraft(value), runProofCases() with labeled steps and before/after/query values; content/practice/code validators and PracticeSession stay in separate modules.

Tasks:
- [x] Domain/content: verify original catalog via Aside; write meaningful failing model tests, implement source-vs-derived model and six exercises, code and three JSON data files. Own src/tutorial/* and data/* plus corresponding tests.
- [x] Platform: adapt generic services/shared routes/build/server/Pages workflow/storage keys to derived-query-tutorial and /proof; retain meaningful async/race/navigation/storage/build tests. Own scripts/*, services/*, shared/routes*, route-table, shell-copy, generic screen.js and infrastructure tests. No commits/push by implementers.
- [x] Root UI: original QUERY / CAFE visual design, semantic HTML and CSS layers, home/story/lab/proof/code/summary and adapted practice/widgets, entry/screen table. Keyboard, reduced motion and narrow screens.
- [x] Integrate and independently review all tests, build, content accuracy and dependency directions. Fix demonstrated issues.
- [x] Actual Aside local interactions/deep links/history/narrow layout, load failure/stale data, draft/save and A/B update matrix; document exact coverage and untested rows.
- [ ] Publish A to a new explicitly authorized public GitHub repository with Pages. Open A, deploy a small verified B change, use next clean route navigation to prove real public full-document update. Verify public hashes, direct links and genuine asset/API errors.
- [ ] Final six-field handoff, local vault index/log/own notes commit, URL handoff. Never push the private D:/NS vault.
