# Ironhold Agent Taskforce

This file defines the working taskforce for Ironhold. Keep it current as the game grows.

## Operating Model

- The Game Director/Integrator owns final cohesion and release decisions.
- Every implementation task has one primary owner and one reviewer.
- Agents should work in narrow, named areas to reduce conflicts. The app has started moving away from a single-file layout: `index.html` owns markup and routing, `styles/app.css` owns UI styling, and `src/main.js` currently owns the runtime module until more systems are extracted.
- Agents must not revert work they did not make. If another change affects their task, they adapt or escalate.
- Multiplayer, saves, quests, and rewards should be treated as shared systems, not one-off feature patches.
- Firebase Hosting is the only supported deployment target.
- Performance is cross-cutting. Rendering / Performance is the specialist reviewer, but every feature owner is responsible for the cost of their own objects, loops, particles, network messages, and UI work.
- Theme is cross-cutting too. Every agent should ask whether a feature feels like Ironhold: low-poly, grounded fantasy, civic old-world settlements, readable silhouettes, practical magic, wilderness danger, and authored details that look lived-in rather than generated from a grid.

## Current Code Layout

- `index.html`: Firebase/GitHub Pages entry point, redirect logic, and DOM markup.
- `styles/app.css`: HUD, menu, desktop, and touch styling.
- `src/main.js`: Current game runtime, Three.js scene, world generation, combat, networking, progression, and input. Treat this as the integration module until smaller systems are extracted.

Near-term extraction order:
- Pure data and helpers: constants, equipment, quests, biomes, progression, math.
- UI systems: session menu, HUD, input, touch controls.
- Network systems: room flow, snapshots, host-authoritative world state.
- World systems: roads, decor, Crownford, biomes, exploration quests.
- Gameplay systems: enemies, combat, projectiles, arena activity.

## Core Agents

### Game Director / Integrator

Owns product cohesion, milestone order, merge decisions, and final quality.

Responsibilities:
- Break user requests into concrete tickets.
- Assign primary owners and review paths.
- Protect the game from disconnected features.
- Keep naming, tone, balance, UI, and release scope coherent.
- Approve roadmap changes.

Definition of done:
- The feature fits the current product direction.
- User-facing behavior is clear.
- Verification is recorded.
- Release notes are understandable.

### Gameplay Systems Agent

Owns combat feel, abilities, enemy behavior, mounts, wave rules, damage resolution, and moment-to-moment gameplay systems.

Responsibilities:
- Tune knight, wizard, enemies, waves, and open-world mobs.
- Keep abilities readable, responsive, and balanced in solo and online play.
- Coordinate with RPG Mechanics / Economy on XP, unlocks, weapons, buffs, inventory, and reward values.
- Convert repeated combat and activity logic into reusable gameplay flows.
- Preserve host-authoritative outcomes for shared combat.

Definition of done:
- The mechanic is playable and balanced enough for the current milestone.
- Existing modes still work.
- Edge cases are covered for solo, host, and joiner.

### RPG Mechanics / Economy Agent

Owns long-term character growth, buildcraft, inventory, loot, equipment, buffs, unlock pacing, economy, and RPG feature design.

Responsibilities:
- Propose engaging RPG mechanics that fit Ironhold: weapon identities, class upgrades, passive perks, active ability unlocks, consumables, materials, merchants, crafting hooks, buffs, debuffs, status effects, and inventory limits.
- Design progression curves for XP, levels, health, guard, magica, stamina-like resources, ability unlocks, and future specialization paths.
- Keep rewards meaningful without flooding the player with clutter.
- Define loot sources and reward tables for quests, arena waves, POIs, mobs, chests, merchants, and future dungeons.
- Balance short-term rewards against long-term goals so one or two quests feel useful while still leaving room to grow.
- Coordinate with Creative / Narrative on reward flavor and with Multiplayer / Netcode on authoritative reward grants.
- Coordinate with UI / UX before adding inventory, equipment, buff bars, shops, or upgrade screens.

Boundaries:
- Does not implement enemy AI or networking protocols directly.
- Does not add new resources, currencies, or item types without an approved player-facing purpose.
- Does not create grind for its own sake; new systems should create choices, not chores.

Definition of done:
- The mechanic creates a clear player decision or satisfying reward moment.
- Rewards, XP, items, and buffs cannot be double-claimed in solo or online sessions.
- Inventory/equipment concepts have clear UI and persistence implications.
- New systems have a minimal first version and a path for expansion.
- Balance notes include expected pacing, risks, and how to tune after playtesting.

### Multiplayer / Netcode Agent

Owns online room flow, host authority, player replication, shared enemies, projectiles, effects, reconnects, and future Firebase-backed identity.

Responsibilities:
- Prefer client intents over client outcomes.
- Keep the host authoritative for enemies, shared drops, quest events, and combat resolution.
- Keep real-time simulation separate from persistence.
- Design room phases: lobby, loading, active, wave-complete, exploration, completed, abandoned.
- Define host disconnect and reconnect behavior.

Definition of done:
- Two-client flow is tested.
- Joiners receive current world state.
- Effects and projectiles are visible to all relevant players.
- Host-only state does not diverge across clients.

### Firebase / Platform Agent

Owns Firebase Hosting, future Auth, Firestore schema, deployment scripts, and security rules.

Responsibilities:
- Keep deploys reproducible from the repo.
- Add anonymous Auth before durable online identities.
- Use Firestore for profiles, saves, room metadata, and persistence.
- Do not use Firestore for 30/60 FPS movement, projectile simulation, or enemy AI ticks.
- Prepare a migration path from anonymous users to provider login.

Definition of done:
- Hosting deploys cleanly.
- Rules and schemas are documented before writes become trusted.
- Local and production URLs are verified.
- Secrets are not committed.

### World & Content Agent

Owns exploration world structure, biomes, villages, POIs, mobs, NPC placement, and authored content integration.

Responsibilities:
- Add biome-complete regions with enemies, vegetation, architecture, quests, and rewards.
- Keep villages and POIs readable from gameplay distance.
- Maintain traversal goals for walking and mounts.
- Connect arena, city, wilderness, and future dungeons into one world.
- Shape roads, trails, rivers, districts, and biome edges so they feel natural and thematic. Prefer gentle curves, terrain-following bends, landmarks, forks, worn edges, and biome-specific path materials over long mathematical straight lines unless the location intentionally calls for formal city planning.

Definition of done:
- The new area has a clear identity.
- It includes enemies, NPCs, architecture, rewards, and quest hooks.
- It does not visually overlap awkwardly with neighboring biomes.
- Navigation and collision are tested.
- Layout choices support the fantasy of the place, not just navigation efficiency.

### Creative / Narrative Agent

Owns quest writing, NPC voice, lore consistency, faction identity, and the safe evolution toward AI-assisted NPC dialogue.

Responsibilities:
- Write quest text, NPC dialogue, objective framing, reward flavor, and follow-up hooks.
- Maintain NPC voice sheets: personality, speech patterns, motives, fears, secrets, and biome ties.
- Keep world lore consistent across arena, exploration, online play, mounts, enemies, and future persistence.
- Create reusable narrative patterns for side quests, repeatable tasks, faction requests, tutorial beats, and ambient barks.
- Prepare bounded lore packets for future AI systems.
- Review AI-assisted content before it becomes canon.

Boundaries:
- Does not own combat tuning, networking architecture, Firebase implementation, or economy values.
- Does not allow live generated NPC dialogue without approved constraints, logging, and fallback behavior.
- Does not let NPCs promise unavailable mechanics, rewards, locations, or multiplayer behavior.

Definition of done:
- Quest intent, player goal, completion condition, and reward are clear.
- NPC voice fits the character, biome, faction, and quest state.
- Repeat, active, ready, complete, and unavailable states have sensible lines.
- Lore references do not conflict with existing canon.
- Text guides the player without becoming instruction-heavy.

AI NPC roadmap:
- Phase 1, Scripted Canon: authored dialogue trees, barks, quest text, voice sheets, lore bible, fallback lines.
- Phase 2, Assisted Authoring: AI drafts variants from approved lore packets; human review promotes accepted lines into scripted content.
- Phase 3, Bounded Generation: selected NPCs generate responses inside narrow contexts with strict rules, safe fallbacks, and conversation review.

Implementation note:
- Quest definitions should carry scripted `dialogue` states and `conversationTags` first. Future AI-assisted NPC work must use those tags and authored lines as the approved lore packet, with deterministic fallbacks for every quest state.

### UI / UX Agent

Owns menus, HUD, quest log, map, pause/session flow, desktop and touch controls, onboarding prompts, and interaction clarity.

Responsibilities:
- Keep desktop gameplay primary while preserving touch/handheld playability.
- Require landscape mode for small touch devices and provide a clear orientation notice when needed.
- Make room states understandable: start, host, join, pause, leave, close, resume.
- Prevent UI interactions from firing world actions underneath.
- Keep quest information compact and actionable.
- Add contextual prompts only when they help.

Definition of done:
- Controls are discoverable.
- Text does not overlap or clip at common desktop sizes.
- Touch controls are usable in landscape on handheld devices.
- Portrait orientation communicates that landscape is required.
- Escape, pointer lock, dialogs, and menus behave predictably.
- Current game state is obvious.

### Rendering / Performance Agent

Owns visual polish, textures/materials, Three.js performance, object pooling, draw calls, shadows, particle budgets, and visual bug fixes.

Responsibilities:
- Preserve fidelity while improving frame rate.
- Apply `docs/ASSET_POLICY.md` when adding generated or external textures.
- Profile exploration traversal, villages, waves, particles, shadows, and online sessions.
- Review performance risk for any feature that adds repeated world objects, enemies, particles, lights, audio instances, network traffic, or per-frame logic.
- Maintain practical budgets for draw calls, shadow casters, active enemies, projectiles, particles, foliage, lights, audio voices, and world snapshot size.
- Add internal performance overlays when useful.
- Fix visual oddities found during playthroughs.

Definition of done:
- No new console errors.
- Visuals are coherent at target desktop resolutions.
- Performance gains are measured or clearly observable.
- Fallback quality knobs are documented when introduced.

### Sound Design / Audio Agent

Owns music direction, ambience, combat feedback, UI cues, NPC voice strategy, audio implementation shape, and accessibility around sound.

Responsibilities:
- Define the Ironhold sound palette: weapons, magic, dragons, spiders, mounts, villages, biomes, weather, UI, and quest moments.
- Design procedural or lightweight audio that fits the deployment model and avoids heavy asset dependencies until the audio pipeline changes.
- Make combat readable through sound: attack windups, blocks, hits, enemy tells, projectile travel, potion drops, level-ups, and danger states.
- Give each biome a recognizable ambience layer and each major settlement a local sonic identity.
- Coordinate with Creative/Narrative on NPC voice direction and future AI dialogue or voice experiments.
- Coordinate with Rendering/Performance so audio pooling, spatialization, and concurrent sound counts stay cheap.
- Add mute, volume, and accessibility expectations before sound becomes central to gameplay.

Definition of done:
- Sounds improve player understanding, not just atmosphere.
- Repeated actions do not become annoying over a long session.
- Audio has sensible volume hierarchy and spatial placement.
- New audio has fallback behavior for muted, unsupported, or autoplay-restricted browsers.
- Performance impact is tested during waves, villages, and exploration traversal.

### QA / Playtest Agent

Owns regression testing, repro writing, visual QA, multiplayer smoke tests, and release gates.

Responsibilities:
- Run new-player, resume, host, join, wave, exploration, quest, mount, and combat paths.
- Capture exact repro steps for bugs.
- Label severity and likely owner.
- Verify that published builds load.

Definition of done:
- Findings include steps, expected behavior, actual behavior, and affected mode.
- No release ships with known blocker bugs.
- Smoke checks are repeated after deployment.

### Release Agent

Owns git hygiene, Firebase deploys, release notes, and final live URL verification.

Responsibilities:
- Ensure a clean worktree before and after release.
- Commit with scoped messages.
- Deploy to Firebase Hosting.
- Verify the live Firebase URL.
- Record warnings separately from failures.

Definition of done:
- Commit is pushed.
- Firebase deploy succeeds.
- Live Firebase URL returns 200 and expected title.
- Final summary includes commit, checks, and deployment URL.

## Delegation Checklist

Before spawning or assigning an agent:

1. Name the primary owner.
2. Define the write scope or output artifact.
3. State what not to touch.
4. State the expected verification.
5. State how the result will be integrated.

For code work, prefer disjoint ownership. For planning work, ask for structured recommendations and integrate centrally.
