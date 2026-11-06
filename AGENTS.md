# Working on Ember Courier

- Keep the original game identity, protagonist 烛羽, three chapters, save keys and finite ending.
- This is a dependency-free native HTML/ES-module Canvas game. Keep `dist/` directly deployable under either a root or subdirectory; all runtime paths must remain relative.
- Rules live in `dist/core.mjs` with no DOM dependency. UI and audio must not leak into the simulation.
- Run `node --test tests/*.test.mjs` and `node scripts/check.mjs` for gameplay/runtime changes. Complete-journey tests must use actual collection, lamp costs, enemy damage and exits; do not teleport or bypass the boss to make them pass.
- Preserve safe pause behavior, pointer cancellation, keyboard controls, mobile layout and local-save compatibility. Increment the save schema only with a migration or deliberate old-save rejection.
- Every new runtime asset belongs in the offline precache. Bump the service-worker cache name for any runtime release; never activate mixed-version modules in an active run.
- Original code-drawn visuals and synthesized audio are part of the product. Do not introduce copyrighted external art or samples.
- `.openai/hosting.json` identifies the existing private preview. Preserve its project ID and audience. CI does not independently deploy to that preview.
- v1.1.0 adds data in `content.mjs`, pure expedition transitions in `systems.mjs`, idempotent metaprogression in `progress.mjs`, and UI in `hub.mjs`. Keep rewards atomic and world interactions proximity-checked.
- Save schema 2 migrates schema 1 rather than dropping it. Keep the existing run/stat keys and the separate profile key. Talents snapshot at launch; equipment recalculates from source data without healing exploits.
- Full expansion journeys must exercise residents, paid choices, real equipment/shops/forges, delivery, actual enemies, save/resume and distinct endings. Preserve the direct original route.
