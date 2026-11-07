# Working on Ember Courier

- Keep the original game identity, protagonist 烛羽, three chapter themes and save keys. Preserve the finite story journey and its endings; the explicitly requested v1.3 endless mode is the primary menu entry and has no mandatory final floor.
- This is a dependency-free native HTML/ES-module Canvas game. Keep `dist/` directly deployable under either a root or subdirectory; all runtime paths must remain relative.
- Rules live in `dist/core.mjs` with no DOM dependency. UI and audio must not leak into the simulation.
- Run `node --test tests/*.test.mjs` and `node scripts/check.mjs` for gameplay/runtime changes. Complete-journey tests must use actual collection, lamp costs, enemy damage and exits; do not teleport or bypass the boss to make them pass.
- Preserve safe pause behavior, pointer cancellation, keyboard controls, mobile layout and local-save compatibility. Increment the save schema only with a migration or deliberate old-save rejection.
- Every new runtime asset belongs in the offline precache. Bump the service-worker cache name for any runtime release; never activate mixed-version modules in an active run.
- Original code-drawn visuals and synthesized audio are part of the product. Do not introduce copyrighted external art or samples.
- `.openai/hosting.json` identifies the existing hosted game. Preserve its project ID and current audience (public since the authorized v1.1.1 web release). CI does not independently deploy to that preview.
- v1.1.0 adds data in `content.mjs`, pure expedition transitions in `systems.mjs`, idempotent metaprogression in `progress.mjs`, and UI in `hub.mjs`. Keep rewards atomic and world interactions proximity-checked.
- Save schema 3 migrates schemas 1/2 with rulesVersion 111 for legacy runs; only rulesVersion 120 enables the new expedition rules. v1.3 endless state is separately versioned and opt-in in createGame; preserve existing schema 3 story saves. Keep old-run behavior and source-derived stats. Keep the existing run/stat keys and the separate profile key. Talents snapshot at launch; equipment recalculates from source data without healing exploits.
- Full expansion journeys must exercise residents, paid choices, real equipment/shops/forges, delivery, actual enemies, save/resume and distinct endings. Preserve the direct original route.

- v1.2.0 adds radius-aware bounded navigation in routes.mjs and pure expedition hooks in expedition.mjs. Map, combat and loot random streams remain separate. Preserve finite patrol reward reservations and atomic claim state across saves.
- Field upgrade choices stay in the current chapter; chapter choices advance once. Persist offers and their choice kind.
- Fair challenges normalize the starting loadout and talents; the rule/date/condition key owns first rewards and personal bests. Keep eight new achievement rewards as commemorative letters.

- v1.4 new endless runs add `endless.combat.version=1` in combat.mjs. Keep runs without it on v1.3 behavior; real compatibility fixtures must replay identically. Dash hits are once per dash identity and require an unobstructed movement segment. Process queued overdrive damage before death accounting so all kills receive rewards. Charge stops during overdrive; perfect-room rewards use the existing clear latch.
