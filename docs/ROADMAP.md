# Ironhold Living Roadmap

This roadmap is intentionally alive. Update it when priorities shift, systems mature, or playtesting changes the shape of the game.

## Current Product Pillars

- A fantasy action game that supports both arena waves and open-world exploration.
- Desktop-first gameplay with third-person movement, combat, quests, mounts, and online rooms.
- Host-authoritative multiplayer today, with a path toward Firebase-backed identity and persistence.
- Procedural geometry and lightweight deployment, with Firebase Hosting as the primary production target.
- A cohesive world called Ironhold, not just an arena mode.

## Now

### Production Structure

- Maintain `docs/AGENTS.md`.
- Keep this roadmap updated after meaningful feature decisions.
- Use the Game Director/Integrator role for all cross-system changes.
- Keep Firebase Hosting deploys green.

### Multiplayer Stability

- Continue hardening host-owned enemies, projectiles, effects, potions, and rewards.
- Convert more online actions into intent messages rather than client-applied outcomes.
- Add explicit room phases: lobby, loading, active, wave-complete, exploration, abandoned.
- Define host disconnect behavior clearly. First version can fail closed instead of migrating host.

### Quest And Progression Quality

- Make early exploration flow clear: homestead, first NPCs, village discovery, herbs, road threats, horse quest.
- Ensure discovered locations, collected items, and quest rewards survive reloads.
- Prevent double rewards in both solo and online sessions.
- Keep leveling fast enough that one or two quests matter.

### UI And Onboarding

- Add contextual desktop prompts for interact, attack, block/burst, mount, quest tracker, and map.
- Keep prompts sparse and state-aware.
- Improve quest tracker and minimap/marker usefulness without removing exploration challenge.
- Keep pause/session menus separate from start/join flows.

## Next

### Content Expansion

- Add one main quest beat per major biome.
- Add three side quests per village: combat, discovery/delivery, and lore.
- Add one repeatable hub task per major settlement later, once inventory/currency exists.
- Prioritize short early quests, roughly two to five minutes each.

Candidate biomes:
- Pine Marches: misty wetlands, ruined causeways, ambush paths.
- Ashen Foothills: volcanic ridges, mining camps, lava-lit caves.
- Frostbarrow Reach: snowfields, burial mounds, visibility hazards.

Priority POIs:
- Full village hub with stable, forge, healer, trader, and quest board.
- Bandit roadblock encounter.
- Abandoned watchtower with vertical exploration.
- Cave or dungeon micro-zone with wave-style room locks.
- Mount corral and mounted traversal challenge.

### Systems Refactor

- Define a single combat event pipeline:
  input intent -> validation -> hit resolution -> damage/status -> XP/loot -> replicated result.
- Separate quest definitions from quest instance state.
- Move content toward data definitions where practical: quests, NPCs, enemies, waves, biomes, rewards.
- Add shared world event names such as `EnemyKilled`, `ItemCollected`, `NpcTalked`, `AreaDiscovered`, `WaveCleared`, and `BossDefeated`.

### Firebase Path

- Phase 1: Hosting only.
- Phase 2: anonymous Auth for room identity, display names, ownership, and reconnect.
- Phase 3: Firestore for durable player profiles, character saves, quest state, inventory, and room metadata.
- Phase 4: account upgrade from anonymous user to provider login.

Firestore should support:
- `/users/{uid}`
- `/users/{uid}/characters/{characterId}`
- `/users/{uid}/questState/{questId}`
- `/rooms/{roomId}`
- `/rooms/{roomId}/members/{uid}`
- `/rooms/{roomId}/questState/{questId}`
- `/contentVersions/{versionId}`

Firestore should not handle:
- per-frame movement sync
- projectile simulation
- hit validation
- enemy AI ticks

## Later

### AI-Assisted NPC Communication

Phase 1, Scripted Canon:
- Author dialogue trees, barks, quest text, repeat lines, and fallback lines.
- Create NPC voice sheets and a compact lore bible.
- Tag dialogue by NPC, biome, quest state, faction, mood, and availability.

Phase 2, Assisted Authoring:
- Use AI to draft variants, rumors, ambient lines, and quest flavor from approved lore packets.
- Human review is required before shipping.
- Accepted lines become scripted content.
- Add checks for unsupported mechanics, tone mismatch, and canon conflicts.

Phase 3, Bounded Generated Dialogue:
- Allow selected NPCs to generate responses only within curated contexts.
- Provide voice guide, public lore, current quest state, and allowed topics.
- Forbid new rewards, new canon, hidden implementation details, or unsupported promises.
- Use deterministic fallback lines when confidence or safety checks fail.
- Log generated conversations for review and promotion into authored canon.

### Persistence And Accounts

- Anonymous login by default.
- Upgrade path to Google/email provider login.
- Cloud saves for characters, progress, mounts, inventory, and settings.
- Room rejoin with identity continuity.
- Account-safe display names and moderation hooks.

### Deeper Online Play

- Shared exploration quests and world events.
- Late joiner state hydration.
- Reconnect after browser refresh.
- Host migration only after current host-authority model is stable.
- Eventually evaluate dedicated authority if browser-host limits become visible.

## Quality Gates

### Combat Gate

- Deterministic damage checks.
- Ability cooldown checks.
- XP reward checks.
- Enemy death and loot checks.

### Multiplayer Gate

- Two-client host/join smoke test.
- Shared enemies and projectiles visible to both players.
- Shared potion drops and pickups replicated.
- Host disconnect behavior confirmed.
- Late joiner receives current world state.

### Quest Gate

- Quest cannot be double-claimed.
- Already completed objectives are reconciled when accepting a quest.
- Active quest tracker and map point to useful areas.
- Repeat, active, ready, complete, and unavailable dialogue states exist.

### Visual Gate

- Check each biome at common desktop sizes: 1366x768, 1440x900, 1920x1080, ultrawide.
- Confirm roofs, horns, collision, terrain blending, water, fog, and shadows.
- Screenshot pass for villages, POIs, arena, mount state, and quest panel.

### Performance Gate

- Target stable 60 FPS desktop on mid-range hardware.
- Track draw calls, shadow cost, particles, enemy counts, and foliage density.
- Stress-test max waves, mounted traversal, village NPCs, and online sessions.
- Add internal FPS/memory overlay if needed.

### Release Gate

- `node --check` for the module script.
- `git diff --check`.
- Browser smoke test without console errors.
- Firebase deploy succeeds.
- Live Firebase URL returns 200 and expected title.
- GitHub Pages mirror checked while it remains enabled.

## Current Deployment

- Primary: `https://ironhold-game.web.app/`
- Mirror: `https://matslb.github.io/ironhold-waves/`
- Internal Firebase project: `ironhold-waves`
- Public game name: `Ironhold`
