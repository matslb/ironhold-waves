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

### T-009 system state report (Cursor agent, branch `feat/npc-input-dialogue`)

State of the AI dialogue system as found on master HEAD `f922a96`:
- WORKS (wired & live): Phase 1 scripted canon. `mergeQuestDialogueOptions()` feeds authored dialogue/tags into `createQuest()`; `refreshQuestDialog()` shows authored quest lines per state and uses `ambientLineFor()` for quest-less NPCs. Deterministic, multiplayer-safe (no messages), keyboard-driven dialog UI.
- SCAFFOLDING ONLY (defined, not called by the game before this slice): `buildLorePacket()` (bounded, secrets excluded), `validateAssistedLine()` (canon/mechanics/meta guardrails + deterministic fallback), and the bounded `logAssistedConversation()` review log. These were complete and unit-tested but had no caller — nothing consumed player input, so NPCs could not respond to free input.
- MISSING for player-input dialogue: (a) any UI to enter/select input in a conversation, (b) a responder that turns input into an approved line through the packet/validation path, (c) a call site that logs the exchange. The "assisted/generated" path was always intended to flow input -> lore packet -> validation -> safe line, with NO live LLM in the shipped client.

### What this slice wired (player-input-driven dialogue, local & offline)

- `src/content/dialogue.js` (additive routing only — NO canon data changed): added `respondToPlayerInput(input, context)`, a LOCAL deterministic responder. It builds the bounded lore packet, scores the player's input against approved canon (authored quest line for the live state, public lore facts by tag/keyword, tagged ambient barks by mood via `ambientLineFor`, and the NPC voice-sheet role), runs the chosen candidate through `validateAssistedLine()`, and falls back to the packet's deterministic line on no-match or validation failure. Every exchange is recorded via `logAssistedConversation()`. Also added `suggestedTopicsFor(context)` (intent chips) and a config-gated, inert-by-default future-generator hook (`assistedDialogueConfig.enableExternalGenerator` + `setAssistedDialogueGenerator()`) — no network, no secrets; the shipped default is the local responder.
- `src/main.js`: imported `respondToPlayerInput`/`suggestedTopicsFor`; added `dialogContextForNpc()`, `renderDialogTopics()`, `setDialogAskActive()`, and `askDialogueQuestion()`; rendered topic chips in `finishQuestDialogRefresh()`; extended `handleQuestDialogKey()` with a typing mode (input focused: Enter sends, Esc cancels typing), a `T` shortcut to open the free-text box, and `1`-`4` to quick-ask a suggested topic; reset the ask box on open/close; and closed the dialog from `openSessionMenu()` so a pointer-lock Esc never leaves the dialog behind the pause menu.
- `index.html` / `styles/app.css`: added a compact keyboard-first ask block inside `#questDialog` (topic chips `#dialogueTopics`, text input `#dialogueInput`, hint `#dialogueHint`) styled to match the quest dialog.

Player input -> response mapping (deterministic): task/quest words -> live authored quest line; specific lore nouns (spiders, dragons, Crownford, roads...) -> matching public lore fact; greeting/rumor/danger/advice -> the biome's greeting/rumor/warning bark; "where/place" -> the world canon line; "who are you" -> the voice-sheet role; anything off-canon, economy/meta, or unmatched -> the safe deterministic fallback. The player's words are NEVER echoed into a response; only validated canon lines are emitted.

UX: keyboard-first (pointer lock stays engaged during dialog, so the box is focused via `T`, not the mouse); typing suppresses all gameplay/movement keys because an open dialog already routes every key into `handleQuestDialogKey`; Esc cancels typing then closes the dialog cleanly. Desktop-first; the ask block shares the existing quest-dialog panel.

Verification: `npm run check` green; module smoke test of the responder; in-browser smoke (talk to Mira -> topic chips, free-text, off-canon fallback, conversation log in localStorage, Esc layering) with no console errors.

FLAGGED FOR CREATIVE / NARRATIVE AGENT (canon owner): the `dialogue.js` change is routing logic only and leaves all voice sheets, lore facts, barks, packs, and fallbacks untouched — please review the matching/keyword heuristics, intent buckets, and the `suggestedTopicsFor` labels, and consider whether some intents (e.g. "who are you") should template richer voice-sheet text (kept to the public `role` only here to stay inside the existing guardrails). The optional generator hook is inert and needs a backend; see follow-ups.

COORDINATION NOTE for Codex and Cursor: `src/content/dialogue.js` and `docs/LORE_BIBLE.md` are owned by the Creative / Narrative (Claude) session — please keep them out of your write scopes and route canon/dialogue changes through that ownership. The `src/main.js` hooks in this slice touch only the `createQuest` options line, one import line, the quest-less NPC branch of `refreshQuestDialog`, and the new dialogue-ask helpers/key handling; they do not overlap with the netcode or weapon-kit changes. Nothing in this slice touches `src/content/rpg.js` or networking. The chat feature (separate worktree) also adds a text input + MQTT message kind — this dialogue ask box is local-only and adds NO message kind, so the two should merge without protocol collision; just reconcile any shared input-focus / key-suppression helpers.

Acceptance:
- Every quest has authored lines for available, active, ready, and done flows with deterministic fallbacks, plus prerequisite-unavailable handling.
- Dialogue is tagged by NPC, biome, quest state, faction, mood, and availability.
- Future assisted/generated dialogue can only consume lore packets, must pass validation, falls back deterministically, and is logged for review.
- No AI generation runs in the shipped game until Phase 3 preconditions in `docs/LORE_BIBLE.md` are signed off.

### T-010: Briarfall Woods Biome And Gear Slice

Primary owner: World & Content Agent

Reviewer: RPG Mechanics / Economy Agent, Multiplayer / Netcode Agent

Status: `[x] Done`

Done evidence:
- Briarfall Woods now generates as a fourth exploration biome with mossy terrain texture, low basin/ridge shaping, flat village pads, a winding woodland lane, minimap biome color, and collision-enabled oaks/brambles/charcoal/standing-stone props in `src/main.js`.
- A Briarfall timber village spawns with timber/moss house architecture, Briarfall-styled NPCs, and the quest giver Edda Thorn.
- The new quest `briarStalkers` gives map hints, quest tracker progress, XP, boons, a field potion, Briarfall class kits, and the Briarfall Pathcraft perk.
- Briarback rootmaws (`briarBeast`) are a distinct non-humanoid monster type with Briarfall visuals, quadruped animation, XP/reward mapping, quest progress, host snapshot creation, shared damage/death path, and tier scaling compatibility.
- Gear expansion shipped in `src/content/rpg.js`: `knight_briarfall_hookblade`, `wizard_briar_focus`, `ranger_briarstring_bow`, `briarfall_pathcraft`, Crownring Recurve unlock, and ranger-relevant Crownford Drill tuning.
- Multiplayer polish: remote player combat profiles now refresh on weapon/perk changes, not only character changes.
- Verification: `/usr/local/bin/node --check src/main.js`, `/usr/local/bin/node --check src/content/rpg.js`, `/usr/local/bin/node --check src/content/dialogue.js`, `git diff --check`, and in-browser local Exploration resume smoke passed. Browser smoke confirmed active Exploration HUD and no new console errors after fixes.

Coordination note:
- `src/content/dialogue.js` received only a small Briarfall ambient-bark addition. Creative / Narrative Agent should review/adopt/refine this into the fuller canon pass.

Remaining work:
- Playtest travel to Briarfall, complete `briarStalkers`, and verify the reward loop with each class.
- Two-client smoke test for host-owned briarbacks and kit display after gear switching.

### T-011: Player Room Chat

Primary owner: UI / UX Agent (Cursor session)

Reviewer: Multiplayer / Netcode Agent

Status: `[~] Active`

Done evidence:
- Peer-broadcast text chat between players in the same online room, built on the existing MQTT layer. No host authority: every client renders the messages it receives, and the local sender echoes its own message at send time (the central `handleOnlineMessage` drops self-id messages, so the echo is added in `submitChatInput`).
- New message kind on the shared transport. `sendOnlineMessage` already stamps `id`, `mode`, `roomPhase`, and `sentAt`, so the chat payload only adds the chat-specific fields:

```js
// kind === "chat"
{
  kind: "chat",
  name,   // sanitized display name (sanitizePlayerName)
  text,   // sanitized body, trimmed, control chars/angle brackets stripped, <= 140 chars
  color,  // integer 0xRRGGBB, the speaker's remotePalette(id).glow (minimap/nametag color)
  ts      // Date.now() at send
}
```

- Handled in `handleOnlineMessage` as an early `if (message.kind === "chat")` branch (added alongside the existing kinds, no refactor of the dispatch). Incoming text is re-sanitized, dropped if empty, and lightly rate-limited per sender (`chatSenderAllowed`: max 5 messages / 5s per `id`); local sends are additionally gap-limited (700ms). Sender color falls back to `remotePalette(id).glow` if the payload color is missing/invalid; name falls back to the known remote player name then "Player".
- UX: compact transient log fixed in the UPPER-LEFT, below the status panel (`#chatPanel`/`#chatLog` in `index.html`, `.chat-panel` in `styles/app.css`). This corner is clear in both play (kit lower-left, minimap lower-right) and pause (buffs lower-left, roster lower-right), avoiding all existing HUD collisions. Shows the last 5 messages; lines fade out ~6.5s after arrival during play, and the backlog stays fully visible while the chat input is open or while paused. Panel only appears when `online.connected`, hidden in solo play, hidden on sub-720px touch layouts like the other corner panels.
- Input: `Enter` opens a one-line input during play (Enter was unbound for gameplay; quest dialogue uses Enter only when a dialogue is open, and chat is gated on `questDialog.hidden`). While the input is focused, the global keydown handler early-returns so WASD/Space/abilities are suppressed, and combat mouse + camera look are gated on `chat.open`. Enter sends, Escape cancels; closing re-grabs pointer lock and a short `suppressPauseUntil` window keeps the Escape-driven pointer-lock drop from bouncing into the pause menu (`pauseForControlLoss`). Pointer lock is kept while typing, so sending with Enter returns to play seamlessly.
- Help panel: the Movement & Controls list documents the `Enter` chat key.

COORDINATION NOTE for Codex and Claude: the `"chat"` kind is additive and host-agnostic; it does not touch host authority, world snapshots, or any existing kind. If you add roster/presence UI, incoming chat names are available via `online.remotePlayers.get(id).name`. Keep the payload shape above stable for cross-agent compatibility.

Remaining work:
- Two-client smoke test of send/receive, fade timing, rate-limit, and Escape-to-cancel pointer-lock return.
- Optional: surface a subtle "new message" cue when the log is faded, and optional roster integration.

### T-012: Bellwater Shared Dungeon Slice

Primary owner: Game Director / Integrator

Support: World & Content, Gameplay Systems, RPG Mechanics / Economy, Multiplayer / Netcode, UI / UX, Creative / Narrative, Rendering / Performance, Sound, QA / Playtest, Release

Status: `[~] Active`

Done evidence:
- Bellwater Underworks now exists as a compact shared dungeon POI near Crownford, with terrain/road support, an entrance facade, scout NPC, and Mason Vale as a Crownford service NPC.
- Entering the Underworks starts a host-authoritative shared activity modeled after the Crownring: current room members are pulled into a hidden dungeon chamber, late joiners queue outside, and `Y` rings out.
- Dungeon actors carry `activityType: "dungeon"` / activity id tags through enemy, fireball, potion, and world snapshot paths.
- Clearing the first chamber grants shared XP and a once-per-player first-clear boon (`+3` health/guard/magica-focus), using local progression state so a veteran host does not consume a new player's first clear.
- Dungeon defeat uses the normal current-level XP wipe only, restores the player at the Bellwater grate, and keeps the online room alive.
- Help and dialogue service copy now mention shared dungeons, and the former Crownring-only service button is generalized for service NPCs.

Remaining work:
- Two-client smoke test for host start, joiner start request, queued late joiner, reward idempotency, defeat, and yield.
- Visual/browser pass for Bellwater entrance readability and dungeon room framing.
- Future dungeon expansion should add multiple chambers, authored boss/loot hooks, and a clearer in-world return bell object.

Acceptance:
- A solo player can enter Bellwater Underworks, clear the chamber, receive XP/boon once, and return to the overworld.
- Online players already in the room enter together and resolve rewards from the host.
- Late joiners and defeated/yielding players do not receive the current clear reward.
- Crownring arena behavior remains unchanged.

### T-018: Siltwell Cistern Shared Dungeon

Primary owner: World & Content

Support: Game Director / Integrator, Gameplay Systems, RPG Mechanics / Economy, Multiplayer / Netcode, UI / UX, Creative / Narrative, Rendering / Performance, Sound, QA / Playtest, Release

Status: `[~] Active`

Done evidence:
- Siltwell Cistern is being added as a second shared dungeon at the northeast fringe of Amber Dunes, with its own service NPC, road spur, minimap marker, recovery point, encounter mix, clear XP, and first-clear boon.
- Dungeon activity start, clear reward, recovery, HUD, help, and multiplayer messages are being generalized by `dungeonId` so Bellwater and Siltwell share the same host-authoritative flow.

Remaining work:
- Solo browser smoke for Siltwell discovery, entry, clear, reward, and recovery.
- Bellwater regression pass after the shared dungeon path generalization.
- Two-client smoke for requested `dungeonId`, late join queue, defeat/yield, and reward idempotency.

Acceptance:
- Bellwater and Siltwell each start from the correct NPC/entrance and use their own copy, reward XP, first-clear boon, and recovery point.
- Clearing one dungeon does not consume the other dungeon's first-clear boon.
- Host/join reward messages validate dungeon id, activity id, participants, and claim id.
- Siltwell reads visually as a practical desert cistern entrance, not a village house or unannounced loot vault.

### T-013: Field Recovery, Town Checkpoints, Wilds Pressure, And Death Penalty Patch

Primary owner: Gameplay Systems Agent

Support: RPG Mechanics / Economy, Multiplayer / Netcode, QA / Playtest, Release

Status: `[x] Done`

Done evidence:
- Players slowly regenerate health while exploring out of combat. Recent damage, active attacks/projectiles, nearby enemies, and shared combat activities suppress the regen delay.
- Entering a town now sets that town center as the ordinary exploration death respawn point. The checkpoint persists by town id plus local fallback coordinates, and is restored when the exploration world is rebuilt.
- Wilds respawn pacing is faster: base refill delay, jitter, tier delay multipliers, and cleared-zone bonus caps were reduced so emptied areas recover sooner.
- Death now wipes only XP earned inside the current level. The player never drops a level, and unlocked stats/abilities remain stable.
- Crownring reward notes were corrected: online Crownring combat uses shared wave-clear XP, not per-kill payouts. Exploration enemy kill credit remains host-resolved by final damage source.
- Verification: `npm run check`, `git diff --check`, stale reward/death-copy grep, and local browser startup smoke passed.

Acceptance:
- Out-of-combat exploration healing occurs only after combat pressure clears.
- Entering a different town changes the exploration death respawn point to that town center.
- Wilds feel busier over time without respawning directly on players.
- Dying at any level never reduces the character level.
- Online kill/reward copy matches host-authoritative behavior.

### T-014: First Multi-Agent Code Boundaries

Primary owner: Game Director / Integrator

Support: Gameplay Systems, UI / UX, World & Content, Multiplayer / Netcode, Sound, QA / Playtest

Status: `[x] Done`

Done evidence:
- Shared gameplay constants now live in `src/config/gameplay.js`.
- Pure math/random helpers now live in `src/core/math.js`.
- Help-panel data and tuning formatting now live in `src/content/help.js`.
- Town checkpoint/death-respawn logic now lives in `src/systems/townRespawn.js`.
- `docs/AGENT_EDITING_GUIDE.md` documents current file ownership and suggested future extraction targets.
- `npm run check` now syntax-checks the extracted modules as well as the legacy files.

Acceptance:
- Future agents can edit tuning, help content, and town respawn logic without touching `src/main.js`.
- The game still loads through the browser after extraction.
- The extraction preserves existing progression keys and runtime behavior.

### T-015: Local God Mode Testing Unlocks

Primary owner: Gameplay Systems Agent

Support: QA / Playtest, UI / UX

Status: `[x] Done`

Done evidence:
- Local runs (`localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, or `file:`) enable god mode automatically.
- God mode grants runtime access to every class kit, both mounts, Roadwarden tack, and all ability gates without forcing XP/level changes.
- Clean local saves spawn a test mount immediately, and mount-gated quest content is available for testing.
- God-mode test mounts do not mark mounts as permanently unlocked unless the player completes the real mount quest reward flow.
- The pause/status effects list and exploration guidance banner identify local god mode when active.

Acceptance:
- On a local server, pressing `G` cycles through all valid kits for the current class.
- On a local server, pressing `M` can switch between horse and Skyhatched Drake.
- Level-gated abilities are usable on local runs regardless of current XP.
- Non-local runs keep normal progression gates.

### T-016: Potion Pouch Inventory

Primary owner: RPG Mechanics / Economy Agent

Support: UI / UX, Multiplayer / Netcode, QA / Playtest

Status: `[x] Done`

Done evidence:
- Exploration progression now stores a compact three-slot potion pouch, with slots unlocking at levels 2, 5, and 8.
- Ordinary field/full potions picked up at full health are stored when an unlocked slot is open; wounded players still consume pickups immediately.
- Wizard Healing Draughts remain shared support drops that can be consumed by the caster or any wounded player, and are not pocketed at full health.
- Stored potions render in fixed HUD slots with vial icons, locked slot labels, and `H`/click use.
- Online pickup requests now support host-approved storage so shared drops are removed once and acknowledged as stored or consumed.

Acceptance:
- Full-health pickup with an unlocked empty slot stores the potion instead of wasting it.
- Wounded pickup heals immediately instead of being stored.
- Full-health pickup with no unlocked empty slot leaves the potion on the ground.
- Locked pouch slots show their unlock level and cannot be used until earned.
- Stored potions survive local save/load through exploration progression.
- Wizard support draught behavior remains immediate/shared for the caster and all players.

### T-017: NPC Reward Hint Topics

Primary owner: Creative / Narrative Agent

Support: World & Content, RPG Mechanics / Economy, UI / UX, QA / Playtest

Status: `[x] Done`

Done evidence:
- NPC dialogue now includes an authored `Rewards nearby` topic for local kits, perks, mounts, and boons.
- Typed questions about kits, gear, buffs, boons, perks, training, rewards, mounts, or tack route to mechanics-safe reward hints instead of generic quest prose.
- Named NPCs have specific hints for their reward source; unnamed villagers fall back to biome-level area guidance.
- Quest reward copy now matches actual grants for Quiet the Road and First Bell of the Crownring.
- Hints avoid unsupported economy/crafting promises and refer only to shipped quest, Crownring, shared dungeon, and mount rewards.

Acceptance:
- Asking Torren about kits points to Roadwarden Blade and Wayfinder Focus, not a nonexistent ranger road kit.
- Asking Edda Thorn about rewards points to Briarfall kits and Pathcraft.
- Asking Steward Bryn about rewards points to Crownring class kits and the first-bell training boon.
- Asking generic Briarfall or city villagers about rewards returns area-level guidance.

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
- [x] Wave clear XP is awarded once per eligible participant.
- [x] Crownring uses shared wave-clear XP rather than individual mid-wave kill payouts.
- [~] Milestone rewards can land every three waves.
- [x] Dying or yielding mid-wave does not claim the current wave clear bonus.
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

Shipped slice: grassland cottages + friendly NPC model detail (owner: Cursor agent, worktree branch `feat/grassland-houses-npc-detail`)
- Grassland/meadow houses rebuilt in `src/main.js`. `addExplorationHouse`'s default (meadow) branch now delegates to a new `addMeadowHouse()` that adds: a stone foundation course, half-timbered plaster walls (corner posts, sill/top plate, mid rails, diagonal braces in dark timber over the plaster infill), a true pitched/gabled roof (overhanging eaves + filled gable ends via a new cached `makeGable()` helper + a ridge beam), a capped stone chimney, a framed plank door with stone threshold + handle, framed/shuttered windows with cross mullions + sills + flower planters (front pair + one side window), and per-variant footprint variety (front porch awning OR a side lean-to woodshed with stacked logs). Four shared style presets (`meadowHouseStyles`) mix cream/ochre/sage/rose plaster with thatch / red-tile / slate roofs. Footprint (5.2 x 4.6) and the `scale*3.4` structure collider are unchanged, so collision and the village well/decor layout are untouched. Mountain/desert/swamp/briar houses are NOT touched (the new build is gated to the meadow branch only).
- Friendly NPCs (`createFriendlyNpc`, used by ALL quest-givers/villagers incl. Marshal Rowan Vale, Steward Bryn, Quartermaster Pell, roost-keeper Brunna, Sister Edda, city/biome villagers) raised to the player/horse quality bar: hip-pivoted legs with boots, shoulder-pivoted sleeved arms with cuffs + hands, a tapered torso with flared tunic hem, belt + buckle + yoke, a head with eyes/brows/nose/ears, and per-NPC hair (short/long/bun/bald) + optional beard + optional hood or brimmed hat. Appearance is deterministic per `name+biome` (`npcAppearance`) drawing from shared palettes (garment-by-biome, skin tone, hair color, trim, leg leather, body girth), so a crowd reads as individuals without per-NPC textures. The animation/API contract is preserved exactly: returned `group`, `leftLeg`/`rightLeg` (walk swing via `rotation.x`), `leftArm`/`rightArm` (heal gesture via `rotation.z`), `questMarker` at y 2.16, `name`/`questId`/`home`/`target`/`homeRadius`/`walkTime`/`healCooldown`/`biome`/`friendly`, plus a new `head` field. `serviceType` and the quest-marker visibility logic set by callers still work. Existing biome accessories (desert scarf, city gold collar, swamp reed-wrap + satchel, briar moss-wrap + wood token) are retained and repositioned to the new body.
- Procedural textures only (per `docs/ASSET_POLICY.md`): added cheap `skin` and `linen` styles to `createMaterialDetailTexture`; new shared materials reuse the existing plaster/wood/thatch/roof/stone/leather/hide styles at 256x256. All cottage + NPC palette materials are module-level singletons reused across every instance, and all primitive geometry stays in the shared `cachedPrimitiveGeometry` cache (NPC girth varies via a frame x/z scale, not new geometry; the new `gable` geometry is cached by dimension). Performance note: with only ~10 grassland houses (2 meadow villages x 5) and ~30-40 NPCs total, mesh count per instance roughly doubled but draw calls reuse shared materials/geometry; no per-instance textures or extra lights were added. Verified with `npm run check` (green) + `git diff --check` clean + in-browser smoke (new session -> Exploration spawn): cottage, gables, chimney, planters, and individualized NPCs render with no console errors and the "E Talk" interaction prompt still aligns with NPC positions.
- COORDINATION NOTE for lore/world agents: `addExplorationVillage`, `addExplorationHouse`, and `createFriendlyNpc` signatures/return shapes are unchanged; the only additive return field is `npc.head`. Mountain/desert/swamp/briar house builders and `addVillageDecor`/`addBiomeVillageProp` are untouched.

Remaining work:
- Add a focused character/enemy readability pass only where it helps at third-person camera distance.
- Track any future external assets under `docs/ASSET_POLICY.md`.
- Screenshot QA pass for the meadow village houses and biome NPC variants from travel distance.

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

Shipped slice: enemy tiers + class kit expansion to 5 abilities (owner: Cursor agent)
- Distance-based exploration enemy tiers in `src/main.js` (`applyEnemyTier`, hooked into `seedExplorationEnemy`): tier 1 near the homestead spawn, tier 2 "veteran" past 34% of the map radius (1.45x HP, 1.4x damage, 1.12x speed, amber HP bar, +8% scale, 1.6x XP), tier 3 "dread" past 62% (2.1x HP, 1.85x damage, 1.22x speed, red HP bar, +16% scale, 2.4x XP). Tier replicates to joiners via the enemy snapshot `tier` field. Baseline enemy contact damage was also raised ~15-20% (barbarian 20/38, spider 19, wisp 18, dragon fireball base 26).
- Ranger DPS reined in after playtest feedback: arrow 18+1d6 at 16 focus, 0.55s cooldown; pierce cooldown 1.1s; focus regen 13.5 +0.5/level.
- Every class now has 5 abilities. Two shared keybind slots: F = utility (level 5-6), C = payoff (level 7-9). All tuning in `src/content/rpg.js` (`resolve*`, `sweep*`, `frostbind*`, `stormcrown*`, `parting*`, `heartseeker*`), all replicate via the existing single-action broadcast:
  - Knight: Warden's Resolve (F, lvl 5: 4s of 35% damage reduction + guard regen while blocking, 16s cd) and Sweeping Cut (C, lvl 8: 24 guard, 150-degree cone, 22+1d6, 0.45s stun + shove, 6s cd).
  - Wizard: Frostbind Bolt (F, lvl 6: 36 mana, straight piercing bolt, 12+1d4, 1.5s stun corridor, 5s cd) and Crown of Storms (C, lvl 9: 56 mana, radius 5.2 nuke, 36+1d8, 0.6s stun + knockback, 9s cd).
  - Ranger: Parting Shot (F, lvl 5: 24 focus, point-blank cone 14+1d4 with heavy shove + backward spring, 5s cd) and Heartseeker (C, lvl 7: 40 focus, 0.7s draw, single arrow 48+2d6, 4s cd).
- Help panel: `helpClassGuide` and the controls list now include the F/C slots (the ability names/levels flow in automatically from `rpg.js`).
- Design rationale captured by the creative-design pass: each class got one defensive/utility tool and one offensive payoff; the level 1-3 kit stays the bread and butter.

Shipped slice: visible kit identity + sword tip geometry fix (owner: Cursor agent)
- Every weapon kit now has a distinct held model, built procedurally by a shared factory in `src/main.js` (`buildWeaponModel` -> `buildKnightWeapon` / `buildWizardWeapon` / `buildRangerWeapon`). Local models, remote player models, and kit swaps all use it:
  - Knight: Arming Sword (classic), Roadwarden Blade (longer slim blade, blue fuller), Crownring Maul (haft + banded iron head), Briarfall Hookblade (short blade with a hook, green fittings).
  - Wizard: Oak Staff (classic), Wayfinder Focus (pale staff, double gold rings, warm light), Briar Focus (thorned staff with a green wisp orb), Stormcall Rod (short iron rod, storm orb + spikes).
  - Ranger: Ash Bow (classic), Crownring Recurve (dark thicker limbs, gold tips), Briarstring Bow (green limbs, rope string, thorn studs).
- Swapping with G rebuilds the local mesh (`refreshLocalWeaponModel`, called from `cycleEquippedWeapon` and auto-equip quest rewards). Remote players swap via the existing `weaponId` in the replicated state (`upsertRemotePlayer` rebuilds `remote.weaponPivot` when it changes); no new message types.
- Kit stat identity: each non-starter kit carries 1-2 small sidegrade stat modifiers in `src/content/rpg.js` via new tuning keys `kitHealthBonus`, `kitGuardBonus`, `kitManaBonus`, `kitManaRegenMul`, `kitMoveSpeedMul` (defaults in `defaultCombatTuning`). Applied in `progressionStatsFor`/`applyProgressionStats`; move speed multiplier is cached on `player.kitMoveSpeedMul` and skipped while mounted. Numbers are deliberately small (6-10 flat resource, 1.07-1.08x regen, 0.96-1.04x speed).
- UI: the lower-left kit panel got a second muted line with the kit's `summary` tag string (e.g. "+dmg +HP / -reach -speed") and a hover tooltip listing the kit's exact tuning overrides vs base values. Panel is now hoverable (combat mouse input is on `window`, so it does not eat clicks); still hidden sub-720px. The Help panel kit list shows the same summary tags.
- Geometry fix: the knight sword `bladeTip` cone was both inverted (apex pointed at the hilt) and mis-rotated 45 degrees off-axis, reading as a floating diamond. `buildSwordTip` now spins the 4-sided cone about its own axis first (`rotation.y = PI/4`), points the apex forward (`rotation.x = -PI/2`), sizes the base to the blade cross-section (radius = halfWidth * sqrt2), and joins flush at the blade end z. Same fix applied to the arrow projectile head, which had the same inversion.

Shipped slice: wizard/ranger health nerf + minimap allies + Help audit (owner: Cursor agent)
- Balance: wizard base health cut from 62 +5/level to 48 +4/level, ranger from 68 +5/level to 54 +4/level in `progressionStatsFor` (`src/main.js`). Knight unchanged at 78 +6/level. Kit `kitHealthBonus` and exploration health boons still stack on top, so Crownring Maul / Briar Focus remain meaningful picks. Rationale: both ranged classes were too durable for their damage output after the earlier DPS nerfs.
- Minimap: the dynamic blit pass in `updateQuestMap` now draws one palette-tinted dot (the remote's `remotePalette(id).glow` color, dark outline) per connected remote player, skipping non-playing remotes and clamping far-away allies to the map rim. Cheap per-frame cost: a couple of arcs every 0.16s tick.
- Help panel audit vs tonight's shipped state: added a minimap paragraph (terrain/quests/compass/ally dots), "lightly built/armored" warnings to the wizard and ranger taglines, an expanded Weapon Kits paragraph covering visible weapon swaps + stat sidegrades + the hover tooltip, and a new "Dangers Of The Valley" section explaining the enemy tier system (white prowler / amber veteran 1.6x XP / red dread 2.4x XP, tougher farther from the homestead). Class ability lists and kit summaries were already data-driven and correct.
- Help panel progression audit (Codex, user-requested): Help now includes a "Leveling And Upgrades" section with XP thresholds and per-class stat growth, expands every weapon kit row with exact tuning/stat overrides from `equipmentDefs`, and adds "Perks And Permanent Buffs" with every shipped perk plus all permanent quest boons, horse/tack rewards, field/full potion rewards, and Crownring/Briarfall/Roadwarden kit sources. Keep future progression rewards reflected in this section when adding new quest reward hooks.
- Multiplayer readability slice (Codex, user-requested): remote player name tags now render a compact health bar and current/max HP in the same hovering billboard. The bar updates from synced player state, host-side predicted enemy/player damage, and host-approved shared potion pickups.

Shipped slice: Beacon Writs world bug fixes (owner: Cursor agent)
- North waystone unblocked: the wayfinder map table in `addWayfinderBeacon` moved from (x, z-5.9) to the east flank (x+5.8, z-3.8) and its collider shrank 2.8 -> 1.35, so the path to the north `cityWrits` pickup at (x, z-7.6) is clear. Verified in-browser: walked straight from the plaza edge to the north waystone.
- Ground conforming: the beacon plaza/cross/dais/shaft/beacon, all four waystones + feet, the map table, `addCityPavement` paving, and Crownring's court/ring/sand/pennant posts/stands now use `explorationGroundLocalY` instead of hardcoded Y, so cobble and carved stones sit on the rendered terrain.
- Root cause of the castle-yard hover: `addCrownfordCity`/`addCrownringCity` registered runtime `registerExplorationFlatZone`s AFTER the terrain mesh was baked, desyncing ground queries from the rendered mesh (conformed props floated). Removed both duplicates - the preset landmark zones at (12,132) r53 and (158,48) r46 in `setupExplorationFlatZones` fully cover both city footprints incl. spawn randomization (verified: max offset + city radius < flat radius). Do NOT re-add runtime flat zones after the bake at world build; villages/lakes still do this (smaller strength/deltas) and could get the same treatment later.
- `createQuestItem` accepts a `groundOffset` option (default 0.12); `cityWrits` sigils use 0.22 so the bloom sits above the plaza cobble top (~ground+0.0775).
- Verified in-browser at Crownford: plaza + waystones grounded and visible, north arm walkable, castle-yard slab and paving flush with terrain. Crownring pieces conform with the same pattern.

Shipped slice: horse model polish + Skyhatched Drake mount quest + M mount cycling (owner: Cursor agent)
- Horse model rework in `createHorseModel` (`src/main.js`), same API/animation contract (`group`, `body`, `legs[]`, `tail`, `saddle`, `tackDetails`, `walkTime`): rounded cylinder barrel with shaped chest/hindquarters, tapered neck with boxier head/muzzle/jaw/blaze/nostrils, crest mane segments + forelock, arched tail root + falling skirt, and jointed legs (upper, knee, dark cannon "sock", fetlock, cylindrical hoof). New procedural detail styles in `createMaterialDetailTexture`: `hide` (dappled patches + short brush strokes, applied to `horseCoat`/`horseMane`/`horseSock`) and `scales` (overlapping arc rows). `saddle` now uses the leather detail map. Local mount, remote ally mounts, and Roadwarden tack visuals all share the rework.
- New quest `skyDrake` ("The Skyhatched Brood", giver Brunna): a roost-keeper NPC and three teal egg pickups spawn around the Dragonspine roost in `addMountainRoost` (eggs placed inside the spire ring radius so colliders can't trap them). Collect 3 warm drake eggs -> reward unlocks the Skyhatched Drake mount (`drakeUnlocked` + `activeMountId` in `progression.exploration`), 80 XP. Quest colors/hints/map area wired (`questColor`, `questLocationHint`, `questMapAreas` -> mountain biome). Dialogue is inline in the quest def per the `briarStalkers` pattern - LORE/DIALOGUE AGENT: please review Brunna's voice lines and migrate/extend into `questDialoguePacks` + voice sheets if desired (Hearthfolk, Dragonspine Peaks, wind-and-rock pragmatic register; no new factions introduced).
- Drake mount: `createDrakeMountModel` reuses the dragon look (drakeScale/drakeBelly materials, `makeWing` membranes folded along the flanks, spine spikes, talon feet, saddle + girth straps) in the horse contract, so all riding plumbing (follow AI, mount/dismount on R, camera, footstep audio) is untouched. Wings flutter with speed via `animateMountWings` (local + remote). Drake rides marginally faster: `mountedMoveSpeed()` 11.6 vs horse 10.4 / tacked 11.2, same handling.
- M cycles owned mounts during exploration (not in dialogue/menus; M was unbound before): swaps the live mount in place (preserves position/yaw/mounted state via `rebuildActiveMount`), banner "Mount: Skyhatched Drake", persists `activeMountId`, replicates immediately. Single-mount owners get a "No other mount to switch to" banner.
- Replication: `serializePlayerState` now carries `mountId` (sanitized to horse/drake on receipt); `upsertRemotePlayer` rebuilds the remote mount model when a teammate swaps. Persistence: `drakeUnlocked`/`activeMountId` normalized in `normalizeProgression`; `captureExplorationProgress` no longer back-fills `horseUnlocked` while a drake is the live mount; spawn-on-load handles drake-only saves.
- Help panel: controls list updated (R text generalized, new M row). NOTE: the in-flight Codex Help expansion (`helpPermanentRewardItems`, kit tuning rows) was uncommitted foreign work, so the quest-rewards list does NOT yet mention the Skyhatched Brood - whoever owns that block should add: "The Skyhatched Brood: Skyhatched Drake mount, slightly faster than a horse, and XP."
- Verified: `npm run check` green; user playtested live - quest completes, drake is granted and rides, M swaps mounts.

Shipped slice: difficulty tuning pass + pause-menu Active Effects panel (owner: Cursor agent)
- Difficulty pass (user: "still too easy", explicitly no enemy-count increases). All changes are tuning values in `src/main.js`:
  - Tier bands moved inward in `applyEnemyTier`: veteran now starts at 25% of the map radius (was 34%), dread at 50% (was 62%). Tier damage multipliers now COMPOSE with any base `damageMul` (`(enemy.damageMul || 1) * 1.4/1.85`) instead of overwriting it.
  - Awareness radii on seeded exploration enemies (in the world-build `seedExplorationEnemy` calls): barbarians 11+0-7 -> 14+0-8, spiders 10+0-5 -> 13+0-6, dragons 18+0-7 -> 21+0-8, wisps 12+0-5 -> 15+0-6, briarbeasts 11+0-6 -> 14+0-7.
  - Lock-on: chase-drop ranges widened — humanoid 1.65x -> 2.0x awareness, spider 1.55x -> 1.9x, wisp 1.7x -> 2.0x, dragon 1.75x -> 2.1x.
  - Post-attack cooldowns shortened: humanoid heavy 1.2+0-0.7 -> 0.95+0-0.55, slash 0.72+0-0.55 -> 0.55+0-0.45; spider lunge 1.05+0-0.75 -> 0.8+0-0.6; wisp pulse 1.35+0-0.9 -> 1.05+0-0.7; dragon fire 1.8+0-1.3 -> 1.4+0-1.0.
  - Fewer freebies: exploration kill-drop chance 0.3/0.24/0.2 -> 0.2 (humanoid) / 0.16 (wisp) / 0.13 (spider); small-potion heal 18 -> 14. Open-world dragon potion drop is no longer guaranteed (60% chance); arena dragons still always drop (wave sustain), but at 14 heal.
  - Arena wave scaling: barbarian HP 70+12/wave -> 70+16/wave, dragon 92+14/wave -> 92+19/wave; per-wave speed growth 0.035 (cap 0.4/0.44) -> 0.05 (cap 0.55/0.6); both now gain a wave damage multiplier (barbarian 1+0.045/wave cap 1.65, dragon 1+0.04/wave cap 1.6). Arena intermission 6.0s -> 4.5s.
  - Knight sanity check: a blocked veteran heavy still chunks guard (52 base guard damage x 1.4+), so guard breaks fast under tier pressure; Warden's Resolve remains a 4s window, not a permanent buff. Wizard 48HP / ranger 54HP means unblocked dread heavies are near-lethal — intended.
- Active Effects panel (user request): the pause menu now shows a compact lower-left `.buffs-panel` (`#buffsPanel` in `index.html`) listing: timed buffs with remaining seconds (Warden's Resolve damage reduction), the equipped kit's sidegrade summary tag (skipped for "Balanced" starter kits), exploration boon totals (+HP/+guard/+magica), potion-cooldown training, perk names, and the active mount bonus while mounted. Built by `activeEffectEntries()`/`updateActiveBuffsPanel()` in `src/main.js`, refreshed only from `updateSessionMenu` when the pause phase opens (no per-frame cost), hidden when empty, on other menu phases, and sub-720px (same pattern as the kit/minimap panels). It sits opposite the bottom-right room roster, so no collision.

Shipped slice: two creatures per biome + biome distance attackers (owner: Codex agent, branch `codex/biome-creature-roster`)
- Goal: every wilderness biome now has two distinct hostile creatures, at least one of which engages from range with a replicated projectile. All four new creatures match the recently reworked horse model quality (jointed/animated parts, layered silhouette, shared procedural `createMaterialDetailTexture` maps — no new texture style was needed; reused cloth/leather/scales/hide/metal). All changes are in `src/main.js`; no external assets (follows `docs/ASSET_POLICY.md`).
- Shared projectile pipeline: `createFireballVisual`/`serializeFireballState` now carry a `variant` field (`fire` | `arrow` | `venom` | `hex`) plus a per-variant impact color/sfx. `arrow` is a non-glowing shaft oriented to its velocity; `venom`/`hex` are colored orbs (hex adds a ring). A new `launchEnemyOrb(enemy, config)` helper reuses the exact host-authoritative, MQTT-replicated fire-orb path the drake uses, so all new distance attacks sync in co-op. `updateFireballs`/`updateRemoteWorldActors` were made variant-safe (guard `shell`/`core`, orient arrows).
- MEADOW — **Bandit Archer** (`banditArcher`, ranged): hooded leather road-raider that kites at ~9.5u and looses straight arrows. Tuning: arrow speed 20, turnRate 0 (straight), life 1.7, 16 dmg / 22 guard (x damageMul x tier), draw 0.92s, cadence 1.6-2.5s, fire window 3.2-16u. HP 50 +8/wave, speed ~2.55. Brawler (`barbarian`) kept.
- DESERT — **Sand Viper** (`sandViper`, ranged): low slithering serpent that rears and spits a slightly-homing venom orb. Tuning: orb speed 11, turnRate 0.5, life 2.8, 18 dmg / 24 guard, telegraph 0.86s, cadence 1.3-2.1s, fire window 2.6-14u, kite ~8u. HP 44 +7/wave, speed ~2.95. Spider kept.
- MOUNTAIN — **Bonewarden** (`bonewarden`, close): reanimated bone soldier with a notched falchion; reuses the humanoid melee state machine (slash/heavy via `beginEnemyAttack`/`updateEnemyAttack`). HP 72 +12/wave (tanky), speed ~2.0, damageMul 1.05. Drake kept.
- SWAMP — wisp distance attack: the existing `wisp` gained a `hex` ranged state that launches a homing teal hex orb (variant `hex`, speed 8.5, turnRate 1.1, life 3.4, 16 dmg / 24 guard) at 4.2-16u; the close pulse is retained for <2.7u. **DESIGN DECISION (flagged):** the user only explicitly requested the wisp's distance attack for swamp. To satisfy the "two creatures per biome" goal I also added a second, close-range swamp creature, the **Bog Lurker** (`bogLurker`): a hunched mossy mire beast with grasping clawed arms, reusing the humanoid melee state machine. HP 78 +12/wave, speed ~1.95, damageMul 1.1. This swamp close-range addition is the one creature beyond the literal wisp-only request — revert just the Bog Lurker seeding/model if a swamp second-creature is unwanted.
- Counts kept roughly flat by converting existing spawns (the user said overall count is good): meadow 34 -> 22 barbarian + 12 archer; desert 13 -> 8 spider + 5 viper; swamp 11 -> 6 wisp + 5 bog lurker; mountain 5 -> 3 drake + 4 bonewarden (the only net change, +2, since mountain was very sparse and bonewardens are low-threat melee).
- Quests/rewards: new creatures advance only the general `raiders` "Defeat roaming threats" quest (like the barbarian); the biome hunt quests (`spiders` 5, `dragons` 2, `wisps` 4) intentionally still require their named creature and remain completable (8 spiders / 3 drakes / 6 wisps still spawn). XP: archer 14, viper 13, bonewarden 16, bog lurker 15 (x tier `xpMul`). All scale via `applyEnemyTier`.
- Registered at every dispatch/switch point: `createX` factories + model builders, `modelScale`, `updateExplorationEnemies` dispatch, `createEnemyFromSnapshot`, `updateRemoteWorldActors` (animation + telegraph states `draw`/`spit`/`hex`), `serializeEnemyState`/`applyEnemySnapshot` (generic, already type-driven), `damageEnemy` impact color/pos, `explorationRewardForEnemy`, `getEnemyAimPosition`, `playEnemyStateSound`.
- Coordination note for Codex/Cursor/Claude: this slice is confined to `src/main.js` (one materials block, the fireball pipeline, four model+factory blocks before `createBarbarian`, the new behavior fns before `updateExplorationNpcs`, the wisp-hex hook, and the seeding loops). It does not touch `index.html`, `styles/app.css`, `src/content/rpg.js`, or `src/content/dialogue.js`, so it should not collide with the name/health-bar, help-panel, or creature-variant-rework branches.
- Performance note: new creatures reuse shared materials (a handful of cloned `MeshStandard`/`MeshBasic` mats) and the existing pooled `game.fireballs`/`game.enemies` arrays and per-enemy detail/separation gating; no new per-frame scans, lights (the wisp keeps its one existing PointLight), or network message kinds. Projectile count is bounded by enemy cadence as before.
- Verification: `npm run check` (node --check on all three JS files) green; no linter errors. In-browser/two-client smoke still TODO.

Remaining work:
- Playtest the new difficulty numbers, especially wizard/ranger survival in veteran bands that now start at 25% radius.
- Playtest kit balance (maul vs blade, rod vs focus) in Crownring waves, now including the new kit stat modifiers.
- Playtest wizard/ranger survivability after the health cut, especially against tier 2/3 packs and dragon fireballs.
- Two-client smoke test: remote weapon model swap when a teammate presses G mid-session, ally dots on the minimap, and the remote drake model after a teammate presses M.
- Playtest tier thresholds/multipliers and the six new abilities (especially Frostbind stun duration and Crown of Storms cost) against tier 2/3 packs.
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
- Pause-menu Help slice (Claude session, user-requested): the pause menu now has a Help button that opens a scrollable "How Ironhold Works" panel (`#helpPanel`/`#helpBody`/`#helpButton`/`#helpBackButton` in `index.html`, `.help-card`/`.help-body`/`.help-key` in `styles/app.css`). Sections: The Game, Movement & Controls, Classes & Abilities, Weapon Kits, The Crownring Arena. The Classes and Kits sections are generated at open time from `abilityDisplayNames`/`abilityUnlockLevels`/`equipmentDefs`/`defaultWeaponByCharacter` in `src/content/rpg.js`, so new kits and unlock-level changes appear automatically (the just-added Briar kits already show). COORDINATION NOTE for Codex and Cursor: when adding kits or abilities, keep `equipmentDefs[*].name`/`.character` and the `abilityDisplayNames`/`abilityUnlockLevels` entries accurate — the Help panel reads them directly. Hand-written key bindings live in `helpClassGuide` and the controls list inside `buildHelpContent()` in `src/main.js`; update those if bindings change. Escape layering: Esc closes Help back to the pause card before resuming play; leaving the pause phase auto-closes Help. Verified in-browser: open/close via button and Esc, all five sections render, 11 kits listed across three classes, no console errors.

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
