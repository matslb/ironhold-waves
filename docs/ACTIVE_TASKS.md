# Ironhold Active Task Brief

Branch: `master` with short-lived `codex/*` feature branches.

This brief converts the current creative direction into implementation tasks. Agents may propose creative details inside their ownership area, but implementation choices must preserve the approved direction below.

## Task Status System

Use this file as the single source of truth for implementation status.

Status legend:
- `[x] Done` means the task is implemented in repo code/docs, has passed the relevant local checks for its risk level, and has no known blocker.
- `[~] Active` means a usable slice exists, but the task still has known gaps, missing verification, or follow-up work.
- `[ ] Todo` means approved and ready to pick up.
- `[?] Needs decision` means the product/design/technical direction is not settled enough for implementation.
- `[!] Blocked` means implementation cannot continue until a named dependency changes.

Completion rules:
- Agents may propose completion, but the Game Director / Integrator marks `[x] Done`.
- A task is not done only because its acceptance criteria were written; it needs implementation evidence.
- Done evidence should be a short note such as a commit, shipped slice, smoke test, or code location.
- If a task is partially shipped, keep it `[~] Active` and list the exact remaining work.

## Approved Direction

- Exploration is the primary frame of the game.
- The standalone Arena Waves mode will be removed from the start menu.
- Arena waves become a repeatable Exploration activity inside a new city.
- The new city is **Crownford**, a civic river/castle city with the **Crownring** arena built into an outer wall district.
- The arena NPC is **Marshal Rowan Vale**, a former knight and practical arena master.
- The player starts/enters the arena by talking to Marshal Rowan Vale.
- Voluntary arena exit happens through an in-world **yield bell** or steward/gate interaction, not by leaving the session.
- Arena defeat means the player is pulled out and wakes at a Crownford infirmary. The online room/session remains alive.
- Arena rewards support Exploration with XP, supplies, future reputation, and unlock hooks. They should not replace exploration quest rewards.
- Model proportions should be normalized around the player as the scale anchor.

## Newly Specced Tasks From Roadmap

These are ready-to-delegate tasks extracted from `docs/ROADMAP.md`.

### T-001: Combat Event Pipeline Prep

Primary owner: Gameplay Systems Agent

Reviewer: Multiplayer / Netcode Agent

Status: `[ ] Todo`

Scope:
- Define a compact event shape for `input intent -> validation -> hit resolution -> damage/status -> XP/loot -> replicated result`.
- Start by documenting the event names and payloads before moving code.
- Identify the first two call sites to migrate: player melee/projectile hit and enemy death reward.

Acceptance:
- Event names cover player attacks, enemy attacks, projectile hits, enemy death, item collection, wave clear, and quest reward.
- Host-authoritative online behavior is preserved.
- The first migration can be done without rewriting all combat at once.

### T-002: Quest Definitions Extraction

Primary owner: Creative / Narrative Agent

Reviewer: World & Content Agent

Status: `[ ] Todo`

Scope:
- Move quest definition data toward a structured table or module while leaving quest runtime state in progression.
- Preserve current quest IDs and local saves.
- Add explicit dialogue states for unavailable, available, active, ready, and done.

Acceptance:
- No local save migration breakage.
- Existing herbs, villages, horse, biome, city, Roadwarden Tack, and Crownring quests still work.
- Future AI-assisted NPC work can use `conversationTags` and authored lines as lore packets.

### T-003: Audio Manager And Ambience Slice

Primary owner: Sound Design / Audio Agent

Reviewer: Rendering / Performance Agent

Status: `[~] Active`

Scope:
- Keep the louder procedural mix.
- Add explicit master/SFX/ambience volume controls before adding many new loops.
- Add one lightweight settlement ambience and one wilderness ambience prototype with hard limits on concurrent voices.

Done evidence:
- Audio now routes through master, SFX, ambience, and music buses.
- Procedural ambience no longer uses continuous noise beds after user feedback that they read as distracting hum. Current shipped procedural ambience is sparse bird one-shots only.
- Procedural music, player/remote footsteps, horse hooves, enemy movement, enemy attack tells, fireballs, and remote potion/impact cues are in `src/main.js`.
- User feedback pass: ambience/noise beds were too loud, so ambience bus and all ambience layer targets were pulled down substantially. Hit effects are in a good range; walking/hoof/enemy footstep movement cues have been lowered after later feedback.
- Music direction updated toward simple procedural 8-bit adventure motifs: short square/triangle phrases, settlement-specific themes, and no sustained music drones.
- Second ambience feedback pass: continuous ambience was still too loud and engine-like; a quieter wind-texture attempt was superseded by removing continuous procedural ambience entirely.
- Third ambience feedback pass: removed the continuous procedural ambience/hum entirely. Future ambience should either remain sparse one-shots or use vetted free-to-use assets with documented licenses.
- Music hum feedback pass: removed persistent low/fifth/high music oscillators; music is now scheduled one-shot phrases and brief bass ticks only.
- Composition pass: added procedural motif themes for the homestead, meadow villages, mountain village, desert village, swamp village, Crownford, Crownring, wilderness biomes, and skirmishes.
- Pause/menu pass: music bus now fades out while gameplay is paused or in menus and resumes from a fresh phrase when play continues.
- Dialogue pass: NPC conversations now trigger subtle short procedural voice blips, with pitch profiles varied by NPC biome/name.
- Footstep mix pass: player, horse, remote-player, enemy, and spider walking cues were lowered heavily while leaving attacks, hits, and UI cues unchanged. Keep steps as low background texture unless later playtests ask for more presence.

Remaining work:
- Add visible master/SFX/ambience/music controls.
- Playtest and tune mix levels against real combat encounters.

Acceptance:
- Mute and volume changes work before and during gameplay.
- Combat-critical SFX remain audible over ambience.
- Ambience does not spawn unbounded audio nodes.

### T-004: Room Phases And Rejoin Behavior

Primary owner: Multiplayer / Netcode Agent

Reviewer: UI / UX Agent

Status: `[~] Active`

Done evidence:
- Host messages and world snapshots now include room phase labels.
- Four digit room codes and stable local member ids are remembered in local storage for refresh/rejoin continuity.
- Active Crownring late joiners queue at the infirmary and are admitted at intermission instead of entering mid-wave.

Remaining work:
- Document host disconnect, kicked-user, and stale retained-room edge cases in one concise flow table.
- Run a two-client refresh/rejoin smoke test.

Scope:
- Formalize room phases: lobby, loading, exploration, arena-active, arena-intermission, closing, abandoned.
- Define browser refresh/rejoin behavior for host and joiner.
- Keep first implementation fail-closed for host disconnect; no host migration yet.

Acceptance:
- Pause menu copy and buttons match the room phase.
- Joiners can rejoin a still-open room with the remembered four digit code.
- Host disconnect and kicked-user behavior are predictable and documented.

### T-005: First Lightweight Inventory Boundary

Primary owner: RPG Mechanics / Economy Agent

Reviewer: UI / UX Agent

Status: `[?] Needs decision`

Scope:
- Propose the smallest useful inventory: stackable consumables/materials only, or equipment plus consumables.
- Define persistence, UI surface, online authority, and reward sources.
- Avoid random loot spam until comparison/equipment UI exists.

Acceptance:
- The proposal names concrete first items and where they come from.
- The player benefit is obvious without opening a large menu system.
- Multiplayer double-claim risks are addressed.

### T-006: Next POI Slice

Primary owner: World & Content Agent

Reviewer: Creative / Narrative Agent

Status: `[ ] Todo`

Scope:
- Add one compact POI from the roadmap: bandit roadblock, abandoned watchtower, cave/micro-dungeon, or mount corral challenge.
- Include a small quest hook or reward.
- Keep collision, roads, terrain, and performance budgets in scope.

Acceptance:
- The POI has a readable silhouette from travel distance.
- It connects to a nearby road/trail naturally.
- It adds either combat, traversal, discovery, or reward variety.

### T-007: Firebase Anonymous Identity Design

Primary owner: Firebase / Platform Agent

Reviewer: Multiplayer / Netcode Agent

Status: `[ ] Todo`

Scope:
- Draft the anonymous Auth and Firestore profile plan without implementing writes yet.
- Document collections, security rules assumptions, and migration from local saves.
- Keep real-time simulation out of Firestore.

Acceptance:
- Schema plan covers users, characters, quest state, rooms, members, and content versions.
- The plan says what remains local/MQTT-only.
- No secrets or production rule changes are committed in this design slice.

### T-008: Internal Performance Overlay

Primary owner: Rendering / Performance Agent

Reviewer: QA / Playtest Agent

Status: `[ ] Todo`

Scope:
- Add a developer-only overlay or toggle for FPS-ish frame timing, active enemies, particles, projectiles, potions, remote players, and draw-risk notes.
- Keep it hidden by default.

Acceptance:
- The overlay can be enabled without changing gameplay.
- It helps compare Crownford traversal, mounted exploration, and active Crownring waves.
- It does not create meaningful overhead when hidden.

### T-009: AI-Assisted NPC Communication (Phase 1 Canon + Phase 2/3 Scaffolding)

Primary owner: Creative / Narrative Agent (Claude session)

Reviewer: Game Director / Integrator

Status: `[~] Active`

Done evidence:
- `src/content/dialogue.js` ships Phase 1 scripted canon: NPC voice sheets for all 14 named NPCs, a machine-readable lore bible with factions, authored dialogue packs (available/active/ready/done + status lines + `conversationTags`) for the nine quests that lacked dialogue states (`herbs`, `raiders`, `spiders`, `dragons`, `wisps`, `bogRelics`, `horse`, `cityWrits`, `citySanctuary`), tagged ambient barks per biome/mood/availability, and deterministic fallback lines for every quest state.
- Phase 2/3 scaffolding: `buildLorePacket()` (bounded packets, secrets excluded), `validateAssistedLine()` (canon/mechanics/meta guardrails with deterministic fallback), and a bounded `logAssistedConversation()` review log. No live generation is wired in.
- `docs/LORE_BIBLE.md` documents canon, voice sheets, tagging scheme, hard content rules, and the Phase 2 review workflow / Phase 3 preconditions.
- Verified with `node --check` plus a module smoke test covering pack completeness, merge precedence, deterministic bark selection, packet secrecy, validation failures, and log bounds.
- Existing authored dialogue in `src/main.js` (`villages`, Roadwarden Tack, `crownringTrial`) is untouched and always wins over pack lines via `mergeQuestDialogueOptions()`.

Integration status: the three `src/main.js` hooks landed once the arena netcode (50e3361) and weapon kit (ac0a627) slices were committed and the file was free:
1. `import { ambientLineFor, mergeQuestDialogueOptions } from "./content/dialogue.js";` added to the imports.
2. `createQuest()` now calls `options = mergeQuestDialogueOptions(id, options);` first, so the nine quests pick up their authored dialogue states and tags. Call-site authored dialogue always wins.
3. `refreshQuestDialog()` now uses `ambientLineFor({ npcName: npc.name, biome: npc.biome })` for quest-less NPCs. The previous per-biome lines are preserved verbatim in the bark pool, and selection is deterministic per NPC.

Remaining work:
- Quest-state-aware barks (`when: "questActive"`) are authored but not yet driven by live quest state in `refreshQuestDialog()`.
- Phase 2 assisted authoring has not produced its first reviewed batch yet; the workflow is documented in `docs/LORE_BIBLE.md`.
- Phase 3 bounded generation stays disabled until the Game Director signs off the preconditions in `docs/LORE_BIBLE.md`.

COORDINATION NOTE for Codex and Cursor: `src/content/dialogue.js` and `docs/LORE_BIBLE.md` are owned by the Creative / Narrative (Claude) session — please keep them out of your write scopes and route canon/dialogue changes through that ownership. The `src/main.js` hooks in this slice touch only the `createQuest` options line, one import line, and the quest-less NPC branch of `refreshQuestDialog`; they do not overlap with the netcode or weapon-kit changes. Nothing in this slice touches `src/content/rpg.js` or networking.

Acceptance:
- Every quest has authored lines for available, active, ready, and done flows with deterministic fallbacks, plus prerequisite-unavailable handling.
- Dialogue is tagged by NPC, biome, quest state, faction, mood, and availability.
- Future assisted/generated dialogue can only consume lore packets, must pass validation, falls back deterministically, and is logged for review.
- No AI generation runs in the shipped game until Phase 3 preconditions in `docs/LORE_BIBLE.md` are signed off.

## Phase 1: Remove Arena As A Top-Level Mode

Primary owner: UI / UX Agent

Support: Gameplay Systems Agent, Release Agent

Status: `[x] Done`

Done evidence:
- Start menu now exposes Start New Session, Resume Game, and Join Session; visible standalone Arena Waves mode is gone.
- `modeDisplayName()` returns Exploration and session copy explains that Crownring waves are found in the world.

Task checklist:
- [x] Remove the visible Arena Waves mode card from the start flow.
- [x] Default new sessions to Exploration.
- [x] Keep Start Session, Join Session, and Resume Game as the main entry choices.
- [x] Ensure joined users inherit the host world and do not choose modes.
- [x] Update menu copy so it explains Exploration as the full game frame.
- [x] Keep old arena code available temporarily for reuse, but stop exposing it as a top-level mode.

Acceptance:
- A new player cannot select standalone arena waves from the menu.
- Starting a session always enters Exploration.
- Joining a session still works with the four digit code flow.
- Existing local saves still resume into Exploration.

## Phase 2: Crownford And Crownring

Primary owner: World & Content Agent

Support: Creative / Narrative Agent, Rendering / Performance Agent

Status: `[~] Active`

Done evidence:
- `addCrownfordCity()` and `addCrownringCity()` create Crownford, Crownring, walls, houses, castle/church/stable elements, city NPCs, and city quest items.
- `crownfordInfirmaryPosition()` and arena defeat recovery are implemented.
- Steward Bryn opens the Crownring activity from world dialogue.

Remaining work:
- Resolve the design mismatch between "Marshal Rowan Vale starts the arena" and the current implementation where Steward Bryn is the Crownring service NPC.
- Add a more explicit in-world yield bell/steward/gate object if keyboard-only `Y` yield feels too abstract.

Task checklist:
- [x] Replace or evolve the current arena-city concept into Crownford.
- [x] Add a city layout that reads as a place first, not just an arena launcher.
- [x] Include castle ward, church/infirmary, stable yard, market/guild hints, houses, walls, and the Crownring at the outer edge.
- [~] Add Marshal Rowan Vale near the Crownring entrance.
- [x] Add an infirmary recovery point beside the church or arena barracks.
- [~] Add a yield bell or steward object inside the arena.
- [x] Add Crownford to discovery/progression without breaking the village discovery quest edge cases.

Creative constraints:
- Crownford should feel civic, old, and disciplined: pale stone, timber upper floors, tiled roofs, banners, fountains/gardens, and broad streets.
- The Crownring is important but not the center of the world.
- Crownford quests should send the player back into the wilds.

Acceptance:
- Crownford is discoverable in Exploration.
- The city has readable districts and collision on major structures.
- Marshal Rowan Vale can be found without relying on UI text walls.
- The Crownring and yield interaction are visible from normal camera distance.

## Phase 2B: Roads And World Decor

Primary owner: World & Content Agent

Support: Rendering / Performance Agent, QA / Playtest Agent

Status: `[x] Done`

Done evidence:
- Roads use deduped junction patches, stronger winding rules, lake detours, and deterministic roadside supply/decor stops at forks, gates, biome thresholds, villages, and Crownring/Crownford entries.
- Large trees, rocks, structures, and decor now use exploration colliders/spatial checks.

Follow-up tasks should be opened as new POI/world-decor tickets rather than keeping this first pass open.

Task checklist:
- [x] Keep the Exploration road network continuous, aligned to settlement entrances, and clear of major lakes.
- [x] Avoid overly straight wilderness roads with bends, forks, landmark turns, terrain-aware detours, and worn edges.
- [x] Let formal places be formal while wilderness/village/biome paths feel natural.
- [x] Keep later tree, rock, and clutter placement off the main roads.
- [x] Expand deterministic low-poly decor around villages, Crownford, and biome landmarks.
- [x] Add carts, buckets, brooms, barrels, crates, benches, lantern posts, market clutter, training props, and biome-specific props.
- [x] Use mostly static meshes and glow materials; reserve real lights for a small bounded list.
- [x] Add colliders only for large decor such as carts, stalls, lamp posts, racks, and piles.

Acceptance:
- Roads read as a connected travel network rather than disconnected patches.
- Wilderness roads and trails feel natural and thematic, not like ruler-straight debug geometry.
- Village and city road entries line up with gates, wells, streets, and doors.
- Decor improves lived-in readability without blocking NPCs, quest items, or main travel routes.
- Crownford decor feels civic and disciplined, while biome decor matches local architecture and threats.

## Phase 2B-R: Roadwarden Tack Slice

Status: `[x] Done`

Done evidence:
- Quartermaster Pell offers "Shoes for the Long Road" after the horse unlock only.
- Four mounted road waymarks grant the personal `roadwarden_tack` reward.

Task checklist:
- [x] The quest does not require Crownring arena completion.
- [x] The reward remains local progression while online player state carries mount tack for remote rendering.
- [x] No currency, shop, timed race, or inventory screen is introduced.

## Phase 2C: Terrain Elevation And Landforms

Primary owner: World & Content Agent

Support: Rendering / Performance Agent, Gameplay Systems Agent, QA / Playtest Agent

Status: `[x] Done`

Done evidence:
- Exploration uses rolling terrain, stronger wilderness ridges/escarpments/valleys, Dragonspine/biome landform variation, terrain-aware camera height, and flat/blended pads for the house spawn, roads, villages, Crownford, Crownring, lakes, and biome landmarks.
- `explorationTerrainHeight()` is now the shared sampler for ground placement and camera anchoring.

Future terrain work should be opened as separate biome/POI tickets.

Task checklist:
- [x] Add broad rolling hills to meadow and wilderness areas without making basic traversal tedious.
- [x] Give Dragonspine Peaks real mountain massing: foothills, ridges, passes, roost shelves, and readable silhouettes.
- [x] Keep roads believable by letting them bend around slopes, climb through passes, and avoid steep terrain where possible.
- [x] Preserve flat enough areas around Crownford, Crownring, villages, house spawn, quest items, lakes, and arena activity spaces.
- [x] Add terrain-aware placement rules so trees, rocks, mobs, NPCs, and decor sit cleanly on or above the ground.
- [x] Review camera height, horse riding, projectile aim, collision, and quest markers after elevation is introduced.

Acceptance:
- The world no longer reads as a mostly flat board.
- Mountain and hill shapes support biome identity and navigation rather than creating visual clutter.
- Roads remain readable and traversable.
- Players, mounts, enemies, NPCs, structures, herbs, and quest markers do not float or sink.
- Performance remains stable in Crownford, Crownring, and mountain traversal.

## Phase 3: Arena Activity System

Primary owner: Gameplay Systems Agent

Support: Multiplayer / Netcode Agent, UI / UX Agent

Status: `[~] Active`

Done evidence:
- `game.exploration.arenaActivity` exists and Crownring waves start from world dialogue without resetting Exploration.
- Arena actors are tagged/cleaned by activity id.
- Defeat returns the player to the infirmary and yield returns them to Exploration.
- Crownring wave XP and the first Crownring quest are implemented.

Remaining work:
- Add a clearer intermission/claim/continue presentation instead of relying mostly on immediate rewards and the `Y` yield prompt.
- Decide whether a physical yield bell/gate object is required for the first shipped arena loop.
- Add persisted arena rank fields such as `bestWave`, `completions`, and `rank`.

Core state:

```js
game.exploration.arenaActivity = {
  active: false,
  phase: "idle",
  activityId: "",
  wave: 0,
  center: { x: 0, z: 0 },
  radius: 24,
  participants: [],
  startedBy: "",
  nextWaveIn: 0,
  exitOpen: false,
  endedReason: null
};
```

Task checklist:
- [x] Add a scoped arena activity state under `game.exploration`.
- [~] Start arena waves from Marshal Rowan Vale dialogue/service actions.
- [x] Do not call `resetGame()` to start arena waves.
- [x] Teleport participants into the Crownring, dismount players, and park horses outside.
- [x] Spawn arena waves from Crownring gates.
- [x] Tag arena enemies, projectiles, fireballs, effects, and potions with `activityType: "arena"` and `activityId`.
- [x] Make arena cleanup remove only matching activity actors.
- [x] Keep roaming Exploration mobs, quests, mounts, saves, and NPCs intact.
- [~] Add intermission behavior where players can claim winnings and leave.
- [x] Add mid-wave yield behavior with reduced current-wave reward.
- [x] On arena defeat, stop the activity, clear arena actors, restore the player at the infirmary, and continue Exploration.

Rewards:
- [x] Kill XP remains small and immediate.
- [x] Wave clear XP is awarded once per eligible participant.
- [~] Milestone rewards can land every three waves.
- [x] Dying or yielding mid-wave keeps earned kill XP but no current wave clear bonus.
- [ ] Future progression state should support `bestWave`, `completions`, and `rank`.

Acceptance:
- Starting arena waves does not reset the Exploration world.
- Dying in arena never opens the game-over flow.
- Leaving arena never closes the online room.
- Arena actors do not mingle with normal Exploration completion logic.
- Wizard-dropped potions in arena are shared like other online potions.

## Phase 4: Host-Authoritative Online Arena

Primary owner: Multiplayer / Netcode Agent

Support: Gameplay Systems Agent, QA / Playtest Agent

Status: `[~] Active`

Done evidence:
- Host snapshots include `arenaActivity`, enemies, fireballs, and potions.
- Joiners apply host world snapshots and render remote enemies/fireballs/potions.
- Arena start, leave, defeat, reward, potion pickup, and wizard potion drop messages exist.
- Room phase labels now ride host messages/world snapshots, remembered room codes and stable local member ids survive refresh, and late joiners are queued outside the Crownring until an intermission admits them.

Remaining work:
- Run/record a two-client host/join smoke test for Crownring waves.
- Decide if `arenaState` remains folded into world snapshots or becomes a separate message.

Task checklist:
- [x] Host owns arena activity phase, wave number, enemy spawning, enemy health/death, shared drops, fireballs, reward events, and end transitions.
- [x] Joiners send intents/requests only.
- [x] Add message kind `arenaStartRequest`.
- [x] Add message kind `arenaLeaveRequest`.
- [x] Add message kind `arenaDefeated`.
- [x] Add message kind or equivalent for `arenaState`.
- [x] Add message kind `arenaReward`.
- [x] Include arena activity state in host world snapshots or an equivalent single source of truth message.
- [x] Late joiners spawn at Crownford/infirmary as spectators or pending participants, then join at the next intermission.
- [x] If a joiner leaves mid-arena, remove that player from participants and continue if others remain.
- [x] If host closes/leaves, current room-close behavior wins. No host migration in this pass.

Acceptance:
- Two desktop clients see the same arena enemies, projectiles, fireballs, effects, and potions.
- Host can start arena; joiner can request arena start through the NPC.
- Late joiners do not break an active arena.
- Room close/leave behavior remains predictable.

## Phase 5: Model Scale And Proportion Cleanup

Primary owner: Rendering / Performance Agent

Support: World & Content Agent, QA / Playtest Agent

Status: `[~] Active`

Done evidence:
- Friendly NPCs, quest marker height, door sizes, village house scale, city wall height, Crownring houses, dragons, and spider footprint have a first normalization pass against the player scale anchor.
- Remote enemy/player snapshots carry scale/radius data for shared visuals.
- Village/city roof eaves were raised, the city church roof was rebuilt along the nave axis, and dragon horn/scale tuning was adjusted.

Remaining work:
- Run a focused screenshot QA pass for all major character/enemy/structure proportions.
- Re-check roofs, dragon horns, and barbarian horns during that pass before marking fully done.

Scale targets:
- Player body reads as roughly `2.2-2.4` world units tall. Plume/hat may reach about `3.0`.
- Friendly NPCs are adult-scale, with head/hood around `2.05-2.25` and quest marker above `2.6`.
- Barbarians are near-player scale and broad, with horns angled outward/up.
- Dragons should feel dangerous, with wingspan around `6-7.5` and body length around `4.5-5.5`.
- Spiders are man-sized giants: low and wide, carapace top around `1.1-1.3`, leg span around `2.5-3.0`.
- Doors should be at least `1.75` units high; eaves should clear player head.

Task checklist:
- [~] Fix any remaining roof inversion and horn orientation issues.
- [x] Normalize friendly NPC proportions and quest marker height.
- [x] Increase village/city house scales where doors and walls look too small.
- [x] Update structure colliders after model scale changes.
- [x] Resize dragons and spiders, then update radius, health bar height, hover height, and attack ranges.
- [x] Verify remote player and enemy scale snapshots still match host state.

Acceptance:
- NPCs no longer look child-sized beside the player.
- Houses look habitable by the player/NPC scale.
- Dragons read larger and more threatening from the default camera.
- Spiders remain giant/man-sized, not tiny pests.
- Collision still feels fair around trees, rocks, houses, and city structures.

## Phase 5B: Texture And Material Pass

Primary owner: Rendering / Performance Agent

Support: World & Content Agent, Sound Design / Audio Agent, QA / Playtest Agent

Status: `[~] Active`

Done evidence:
- Shared low-cost `CanvasTexture` detail covers stone, city wall, slate/roof tile, timber, plaster/adobe, cloth banners, roads, thatch, desert sand, and Crownring arena sand without adding external assets.

Remaining work:
- Add a focused character/enemy readability pass only where it helps at third-person camera distance.
- Track any future external assets under `docs/ASSET_POLICY.md`.

Policy:
- Follow `docs/ASSET_POLICY.md`.
- Prefer procedural or generated stylized textures first.
- Use external free textures only when the license is clear and the visual gain is worth the asset cost.
- CC0 sources are preferred. Mixed-license libraries require per-asset checks.

Task checklist:
- [x] Add a focused Crownford material pass after scale/proportion cleanup.
- [x] Prioritize stone, roof tile, timber, banners, roads, arena sand, church/castle accents, and shield/cape detail.
- [~] Add character/enemy texture details only where they improve recognition from the default third-person camera.
- [x] Track any committed external asset source, license, and attribution requirement. No external texture assets are currently committed.
- [x] Keep texture sizes small and reuse atlases/materials where practical.

Acceptance:
- Textures improve readability without pushing the game toward photorealism.
- Firebase load remains quick.
- Crownford and arena waves remain smooth.
- Every external asset has documented licensing.

## New Class: Ranger

Primary owner: Gameplay Systems Agent (Cursor agent)

Support: RPG Mechanics / Economy Agent, Rendering / Performance Agent, Multiplayer / Netcode Agent

Status: `[x] Done` (playtest/balance follow-up below)

Class identity (approved direction):
- Knight: melee tank. Top health plus guard, shield block/bash, holds the line in coop.
- Wizard: AoE caster and support. Homing lightning, arcane burst, drops potions the whole room shares.
- Ranger: precision skirmisher. Fast straight-flying arrows (skill shots, cheaper and quicker than lightning but no homing), a Tumble Roll instead of a block, and a level-3 Piercing Shot that punches through a line of enemies. Mid health, fast-regenerating small Focus pool, no heals, no block: strongest at range and mobility, weakest when swarmed in melee.

Balance numbers as shipped (tuning knobs in `src/content/rpg.js`):
- Health 68 +5/level (knight 78 +6, wizard 62 +5). Focus 64 +6/level, regen ~18/s (reuses the mana fields/meter; HUD label says "Focus").
- Arrow: 14 focus, 26+1d6 damage, straight, fast (LMB/Space). Lightning stays the heavier homing option at 42 mana.
- Piercing Shot (level 3, J/MMB): 34 focus, 38+1d8 to everything along a narrow corridor; the projectile pierces (per-enemy hit set, no consume).
- Tumble Roll (RMB/K): 22 focus, 0.95s cooldown, impulse toward movement input (falls back to facing).

Done evidence (shipped by Cursor agent):
- `src/content/rpg.js`: ranger weapon defs (Ash Bow default, Crownring Recurve sidegrade), combat tuning, focus costs, ability unlocks (arrow/roll at 1, pierce at 3), display names.
- `index.html`: Ranger character card. `styles/app.css`: ranger HUD tint (green).
- `src/main.js`: `characterKey()` helper replaces all binary knight/wizard idioms; progression defaults + save normalization cover ranger; `progressionStatsFor` ranger branch; `createRanger` local model (hood, mantle, cloak, quiver with arrows, recurve bow with string) and `createRemoteRangerDetails` palette variant; arrow/pierce projectiles share the player-projectile pipeline (no homing, pierce uses hit-set); roll/pierce host-side remote handling in `applyRemoteAction*`; HUD icons/labels/ready-states, roster + resume labels; `arrow`/`pierce`/`roll` procedural SFX; touch buttons mapped (block slot = roll, potion slot = pierce).
- Model polish pass (user request): new `leather` and `metal` procedural texture styles in `createMaterialDetailTexture`; texture maps added to steel/iron/blue/wizardRobe/wizardHat/leather/darkLeather plus ranger cloak/hood/jerkin materials; knight gained tassets, wizard a sash pouch. Local and remote models share the same material upgrades. Follows `docs/ASSET_POLICY.md` (procedural CanvasTexture only).

Remaining follow-up:
- Playtest pass on ranger numbers vs Crownring waves (arrow DPS vs wizard at range, pierce value vs burst, roll cost vs knight block) and remote-ranger PvP cone tuning in legacy waves mode.
- Ranger has no Crownring quest-reward kit hook yet; the Recurve is defined but only obtainable via the same trial claim if added to `grantRpgRewardForQuest` in a future slice.

## RPG Mechanics Backlog

Primary owner: RPG Mechanics / Economy Agent

Support: Gameplay Systems Agent, Creative / Narrative Agent, UI / UX Agent, Multiplayer / Netcode Agent

Status: `[~] Active`

Done evidence:
- Levels, XP, lower starting stats, level-based ability unlocks, equipment definitions, perks, Roadwarden Tack, and quest reward hooks exist.

Shipped slice: Crownring sidegrade weapon kits (owner: Cursor agent / RPG Mechanics, reviewer: Gameplay Systems)
- `knight_crownring_maul` and `wizard_stormcall_rod` are defined in `src/content/rpg.js` as sidegrades, not upgrades: the maul trades reach and guard sustain for damage and knockback; the rod trades mana cost and homing for heavier lightning and burst.
- Acquisition: the Crownring trial quest claim unlocks both kits without auto-equip, so switching stays a player choice.
- `G` cycles the equipped weapon among unlocked kits during exploration, with banner + kit HUD feedback. Persistence reuses `equipment.weapon`/`unlockedEquipment`; multiplayer reuses the existing `weaponId` in player state, so no new messages or storage.
- Balance note: maul/rod tuning values live in `src/content/rpg.js` and should be revisited after a Crownring playtest.
- Balance pass (user feedback): baseline wizard lightning nerfed in `defaultCombatTuning` — `lightningDamageMin` 31 -> 28 and `lightningTurnRate` 0.85 -> 0.7, so homing is more forgiving than auto-tracking and DPS sits closer to the ranger's arrow. Cost stays 42 mana. Stormcall Rod still reads as the low-homing/heavy-hit sidegrade at 0.55 turn rate.

Remaining work:
- Playtest kit balance (maul vs blade, rod vs focus) in Crownring waves.
- Decide and implement the first inventory boundary.
- Add temporary buffs/debuffs once UI and persistence surfaces are clear.

Purpose:
- Turn Ironhold from a set of activities into a satisfying RPG loop with meaningful choices, rewards, and character growth.

Candidate systems:
- [~] Equipment slots: weapon, offhand or focus, armor or robe, trinket, mount tack, consumables.
- [~] Weapon identities: sword, axe, mace, spear, staff, wand, spell focus, and future rare variants.
- [x] Passive perks: class-specific and general upgrades unlocked through levels, trainers, quests, arena rank, or biome discoveries.
- [ ] Buffs and debuffs: food, potions, shrine blessings, NPC blessings, arena boons, poison, burn, slow, guard break, storm charge.
- [ ] Inventory: lightweight stackable consumables/materials first, then equipment once UI and persistence are ready.
- [~] Loot sources: quests, POIs, arena milestones, chests, merchants, elite mobs, and future dungeons.
- [ ] Economy: small coin/material model only when there are clear sinks such as repairs, upgrades, shops, crafting, stables, or training.
- [~] Buildcraft: knight and wizard should have distinct choices without requiring complicated menus.

Design rules:
- A reward should usually give one of: more power, a new option, better survival, faster traversal, access to a place/activity, or world recognition.
- Avoid random loot spam until inventory and comparison UI exist.
- Prefer a small number of memorable items over many tiny stat sticks.
- Keep early leveling fast: one or two quests should noticeably improve the character.
- Do not add a new item type, currency, or upgrade material without a clear first use.
- Online rewards must be host-authoritative and safe from double-claiming.

Acceptance:
- Proposed mechanics include player benefit, acquisition source, UI implications, persistence needs, multiplayer authority, and tuning knobs.
- First versions are small enough to ship and playtest.
- RPG systems support Exploration and Crownford arena instead of turning into a separate menu game.

## Phase 6: UI, Audio, And QA Polish

Primary owner: UI / UX Agent

Support: Sound Design / Audio Agent, QA / Playtest Agent

Status: `[~] Active`

Done evidence:
- Desktop-first scope is explicit; touch/handheld support is deferred.
- Ability boxes show desktop key labels.
- Keyboard-first quest/dialogue controls exist.
- Procedural Web Audio covers player attacks, blocks, hits, potions, quest moments, level-ups, louder master mix, and light compression.
- In the current worktree, additional arena/dialogue cues cover Crownring open, wave entering, wave clear, every-third-wave milestone fanfare, yield, infirmary defeat, dialogue selection movement, and dialogue cancel/close.
- Current audio pass adds bounded biome/city/water/arena ambience, procedural background music, footsteps/hooves, enemy movement sounds, enemy attack tells, fireball launch/impact cues, and remote potion/impact sounds.
- Latest mix note: do not reintroduce continuous procedural hum/noise beds or sustained music drones. Keep ambience to sparse one-shots such as birds unless a vetted free-to-use ambience asset with documented license is added. Music should stay procedural, medieval/adventure flavored, and phrase-based with settlement-specific 8-bit motifs.
- NPC dialogue audio should stay in the short console-style blip lane: quiet, synthetic, and readable as personality, not full speech.
- Minimap slice (Claude session): the map canvas moved out of the quest log into a fixed bottom-right circular minimap (`#minimapPanel` in `index.html`, `.minimap-panel`/`.minimap-canvas` in `styles/app.css`). It now shows the actual world — biome regions, lakes, the road network, discovered settlements (Crownford square, Crownring ring, village dots), a home marker — plus a N/E/S/W compass ring and a heading-rotated player arrow. Quest area overlays and the per-quest colors are unchanged. Visible while playing/paused in Exploration (including during Crownring activity), hidden on menu/landing and on sub-720px layouts so deferred touch controls stay unobstructed. Performance note: the static world layer renders once into an offscreen canvas keyed by seed/roads/villages/discovered-count; the 0.16s refresh only blits it and draws quest areas, the player arrow, and the compass. Verified in-browser: world render, arrow movement, pause/menu visibility transitions, no console errors.
- HUD readout slice (Claude session, user-requested): the KOs kill-count readout is removed entirely (`#koText` no longer exists; `game.kills` is still tracked internally). The XP readout in the top-right is now a progress bar toward the next level (`#xpFill` inside a `.meter`, same fill pattern as HP/Guard, exact numbers available via tooltip `title`) instead of a number. The Kit readout moved out of the top-right panel into a fixed lower-left `#kitReadout` panel (`.kit-panel` in `styles/app.css`); its element ids are unchanged so `kitReadout.hidden`/`kitText` logic in `src/main.js` still applies. Both the kit panel and minimap hide on sub-720px layouts to keep deferred touch controls unobstructed. COORDINATION NOTE for Codex and Cursor: `#koText` and `#xpText` are gone from `index.html` and `src/main.js` — do not reference them in new HUD work; use `#xpFill` (scaleX transform) for XP and the relocated `#kitReadout` for kit display. Verified in-browser with a fresh session: bar at 0/65 XP, kit panel lower-left, no console errors.

Remaining work:
- Add actual master/SFX/ambience volume controls.
- Playtest ambience/music levels across exploration biomes, villages, and Crownring encounters.
- Confirm arena status belongs in quest tracker, wave pill, or both.

Task checklist:
- [x] Keep desktop controls first-class.
- [x] Defer handheld/touch play, landscape enforcement, and portrait notices until the project returns to small-screen support.
- [x] Add keyboard-first arena service dialogue: `E` interact/advance, `Up/Down` or `W/S` select, `Enter` choose, `Esc` or `Backspace` close.
- [~] Add contextual prompts: `E Talk`, `Hold E Leave Arena`, `Hold R Yield`, `Enter Select`.
- [~] During arena activity, temporarily show arena wave/status in the quest tracker area.
- [x] Keep ability boxes and desktop key labels visible.
- [~] Extend procedural audio toward arena start, wave clear, yield, defeat, victory, crowd ambience, city ambience, UI selection, and confirm/cancel.
- [x] Ensure audio hooks respect mute/volume settings.

Acceptance:
- Dialogue can be completed without mouse interaction.
- Escape closes the correct layer in dialogue, arena, pause, and normal exploration.
- Arena status is visible without hiding core health/resource information.
- Desktop SFX works after a user gesture and fails silently when muted or unsupported.

## Performance Stewardship

Performance does not need to become a separate decision-making agent yet, but it is a required review concern for every implementation slice.

Specialist owner: Rendering / Performance Agent

Status: `[~] Active`

Done evidence:
- First structural pass shipped. Exploration colliders now register into a spatial grid so player, horse, and procedural placement checks query nearby obstacles instead of scanning every tree, rock, structure, and decor item.

Remaining work:
- Add the internal performance overlay from task `T-008`.
- Record performance notes in every feature branch summary.

Feature owner duties:
- [ ] Call out expected performance impact before implementation.
- [~] Prefer pooled/reused objects for projectiles, particles, potions, markers, and short-lived effects.
- [x] Avoid adding per-frame scans over large arrays unless the list is bounded or spatially filtered.
- [~] Keep lights, shadow casters, particles, and animated props intentional in Crownford and the Crownring.
- [x] Keep texture count, resolution, and material variety intentional.
- [x] Keep multiplayer snapshots compact when adding arena activity state.
- [x] Preserve low-poly procedural style before adding geometry detail.

Review triggers:
- New city districts or many repeated structures.
- New enemies, arena waves, projectiles, particles, fireballs, or potion drops.
- More NPCs, quest markers, minimap markers, or interactables.
- Any additional shadow-casting lights, spatial audio voices, or retained network messages.
- Any new loop that runs every frame.

Acceptance:
- Feature branches include at least one performance note in their final summary.
- Crownford traversal remains smooth from the default camera.
- Active arena waves do not cause obvious frame drops compared with current exploration combat.
- Host snapshots stay small enough that two-player sessions remain responsive.

## Exploration Terrain Elevation

Primary owner: World Design Agent

Support: Rendering / Performance Agent, QA / Playtest Agent

Status: `[x] Done`

Done evidence:
- Superseded by Phase 2C. Exploration terrain uses a shared sampler for rolling meadow ground, raised Dragonspine mountain mass, dunes, swamp pockets, roads, flat pads, camera anchoring, props, NPCs, enemies, potions, horses, and remote player visuals.

Do not add new work here. Open future terrain requests under Phase 2C follow-up or `T-006` POI/world tasks.

Acceptance:
- Exploration starts from the menu with no console errors.
- The starter area, roads, props, NPCs, player, horse, potions, and enemies do not obviously float or sink.
- Mountain and biome regions read as terrain, not only decorative objects.
- Multiplayer visuals derive height deterministically from the shared world seed and `x/z` positions.
- Local desktop traversal remains smooth from the default camera.

## Verification Plan

- `node --check` on the module script.
- `git diff --check`.
- Browser smoke test on Firebase/local server with no console errors.
- Fresh session: start Exploration, reach Crownford, talk to Marshal Rowan Vale, start arena waves.
- Leave between waves and confirm Exploration resumes.
- Yield mid-wave and confirm arena actors clear while session continues.
- Die in arena and confirm infirmary recovery.
- Host/join smoke: both players see same arena enemies, fireballs, effects, and wizard potions.
- Visual screenshots: starter house, Crownford street, Crownring, infirmary, NPC beside player, meadow village, desert spider, mountain dragon.
- Touch/handheld checks are deferred until small-screen support returns to scope.
- Performance check during Crownford traversal and active arena waves.

## Implementation Policy

- Keep the feature branch approach.
- Avoid parallel code edits to `index.html` unless write scopes are very clear.
- Prefer a first implementation slice that makes local single-player Crownford arena work, then harden multiplayer.
- Preserve Firebase Hosting as the supported deployment target.
