**Tree / Retrieval**
- Disabled lorebook entries were still being retrieved.
  Fix: filtered disabled entries out of TunnelVision search/retrieval paths and deduped retrieved UIDs in search.js.

- Root-level entries were effectively unmanageable in the tree editor.
  Fix: added an explicit Root row as a selectable/droppable target in ui-controller.js.

- The Unassigned Entries UI existed but was mostly a shell.
  Fix: rendered the real list and made assignment-to-root / reassignment work in ui-controller.js.

- Collapse state was split between ad-hoc _collapsed state and persisted collapsed, which could drift.
  Fix: normalized collapse handling onto the persisted field in tree-store.js.

- Unified collapsed multi-book search lost lorebook provenance when categories had the same name.
  Fix: preserved lorebook attribution in collapsed-mode retrieval/rendering in search.js.

**Commands / Memory / Summaries**
- !ingest was firing too late and could not reliably suppress a normal assistant generation.
  Fix: moved it to a true no-generation action path in commands.js.

- !forget and parts of !search/tracker prompting did not match the real tool contracts.
  Fix: updated command prompts and tool-call shaping in commands.js.

- Multi-book ingest/search could target the wrong lorebook by assuming activeBooks[0].
  Fix: made commands resolve the explicit or current lorebook instead in commands.js.

- Auto-summary reset its counter before a summary was actually created.
  Fix: switched to a per-chat pending state and only reset after a successful summarize save in auto-summary.js and summarize.js.

- Tracker reminders never really activated because normal workflows were not populating trackerUids.
  Fix: added a real tracker lifecycle, including migration/seeding and sync on entry changes, in tree-store.js, entry-manager.js, and ui-controller.js.

- Summary generation ignored contentLimit, so node-summary prompts could oversend entry content.
  Fix: honored contentLimit in the LLM formatting/build path in tree-builder.js.

**Profiles / Diagnostics**
- Connection profiles were stored by mutable profile name, so rename/delete flows were brittle.
  Fix: migrated storage to stable profile IDs, with compatibility migration for old saved names, in tree-store.js and ui-controller.js.

- Diagnostics auto-fixes were not persisted.
  Fix: made diagnostics persist the repaired settings state in diagnostics.js.

- Tracker validation in diagnostics was mostly placeholder logic.
  Fix: replaced it with real existence/staleness checks in diagnostics.js.

- Tool-registration diagnostics were unreliable.
  Fix: first made diagnostics actively re-register tools when needed, then replaced the check with real runtime validation in diagnostics.js and tool-registry.js.

- TunnelVision was not re-registering tools when active lorebooks changed via settings updates.
  Fix: wired the missing lifecycle/event path and made registration awaited in index.js.

- The warning No TunnelVision tools are registered was also producing a false negative because diagnostics read the wrong tool name field.
  Fix: switched diagnostics to use the real registered OpenAI function name in diagnostics.js.

**Feed / Observability**
- Tool-call unread counts and summaries in the feed were incomplete/mismatched to real TunnelVision args.
  Fix: corrected tool parsing/summaries in activity-feed.js.

- The feed only showed searched nodes, not the actual entries picked and injected.
  Fix: parsed real retrieval headers and rendered exact retrieved entry chips in activity-feed.js.

- The Entries tab was empty for TunnelVision retrievals because it only tracked native WORLD_INFO_ACTIVATED events.
  Fix: changed the feed model so Entries includes both native activations and TunnelVision-injected entries in activity-feed.js and style.css.

**Hide Mode / Tool Runtime**
- The Hide all tool calls from chat toggle was implemented by mapping TunnelVision to ST stealth, which caused only one tool call and then stopped recursion.
  Fix: removed ST stealth from TunnelVision tool registration and redefined the setting as visual chat hiding only in tool-registry.js, ui-controller.js, settings.html, and diagnostics.js.

- Even after that, hide mode could still leave runtime tool availability in a bad state.
  Fix: added a shared runtime inspector plus generation-start preflight/repair that verifies registered tools, no ST stealth flags, and next-generation eligibility before ST assembles the request in tool-registry.js, index.js, and diagnostics.js.

- Hide mode itself needed to be strictly render-time so it never touched registration again.
  Fix: made the toggle only save the setting and re-hide pure TunnelVision tool-call messages already rendered in chat, with the actual hide logic living in ui-controller.js and activity-feed.js.
