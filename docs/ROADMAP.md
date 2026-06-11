# Ironhold Living Roadmap

This roadmap is intentionally alive. Update it when priorities shift, systems mature, or playtesting changes the shape of the game.

## Current Product Pillars

- A fantasy action game that supports both arena waves and open-world exploration.
- Desktop-first gameplay with third-person movement, combat, quests, mounts, and online rooms. Touch and small-screen support are deferred until desktop systems are more stable.
- Host-authoritative multiplayer today, with a path toward Firebase-backed identity and persistence.
- Procedural geometry and lightweight deployment, with Firebase Hosting as the primary production target.
- Sound should make combat, exploration, quests, and biomes easier to read while keeping the game lightweight.
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
- Move arena waves into Exploration as a host-authoritative Crownford activity instead of a top-level game mode.

### Quest And Progression Quality

- Make early exploration flow clear: homestead, first NPCs, village discovery, herbs, road threats, horse quest.
- Ensure discovered locations, collected items, and quest rewards survive reloads.
- Prevent double rewards in both solo and online sessions.
- Keep leveling fast enough that one or two quests matter.
- Add Crownford arena rewards that support Exploration without replacing quest progression.
- Define first-pass RPG systems: equipment slots, weapon identities, passive perks, temporary buffs, loot sources, and inventory boundaries.
- Make every reward answer a player question: stronger now, new option, better survival, faster travel, access, or story/world recognition.

### UI And Onboarding

- Add contextual desktop prompts for interact, attack, block/burst, mount, quest tracker, and map.
- Keep touch controls and small-screen layout out of active scope for now; revisit once the desktop Exploration loop, arena activity, and progression are steadier.
- Keep prompts sparse and state-aware.
- Improve quest tracker and minimap/marker usefulness without removing exploration challenge.
- Keep pause/session menus separate from start/join flows.

### Audio Foundation

- Add a small audio manager with mute, master volume, SFX volume, music volume, and browser autoplay recovery.
- Start with procedural or very small generated sounds for combat hits, blocks, magic, fireballs, potions, level-ups, UI selection, and quest completion.
- Add simple spatial audio rules for enemies, projectiles, mounts, villages, water, caves, and settlement ambience.
- Establish volume hierarchy so enemy tells and player feedback cut through ambience and music.

## Next

### Content Expansion

- Add Crownford, a civic city hub with the Crownring arena district, Marshal Rowan Vale, an infirmary, and non-arena city hooks.
- Briarfall Woods is now a shipped biome slice: mossy old-growth terrain, a timber village, thornbound raiders, Briarfall gear kits, Pathcraft perk, ambient barks, and a road-clearing quest.
- Expand roads and world decor so settlements feel lived-in: gently winding roads/trails, carts, buckets, brooms, lanterns, market clutter, training props, and biome-specific clutter.
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

### RPG Mechanics Foundation

- Define class growth for knight and wizard beyond raw stats.
- Add equipment concepts carefully: weapon, offhand/focus, armor/robe, trinket, mount tack, and consumables.
- Give weapons identities rather than only numbers: reach, timing, cleave, stun, resource gain, elemental effects, or defensive utility.
- Add temporary buffs from potions, shrines, food, arena boons, NPC blessings, and biome discoveries.
- Add lightweight inventory before adding many item types; first version can cap stackable consumables/materials and avoid complex drag-and-drop.
- Add upgrade benches or trainers in settlements so growth feels grounded in the world.
- Keep loot sparse and readable: quests and POIs should be stronger reward sources than random enemy drops.
- Ensure multiplayer reward grants are host-authoritative and persistence-safe.

### Texture And Asset Pipeline

- Use `docs/ASSET_POLICY.md` for generated and external assets.
- Prefer procedural/generated stylized textures before external downloads.
- Use CC0-first external sources only when they clearly improve the game.
- Start with Crownford materials, arena sand, banners, stone, timber, roofs, shields, capes, dragon scales, and spider markings.
- Keep textures lightweight enough for Firebase-hosted browser play.

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

### Audio Identity

- Give each major biome an ambience palette and danger layer.
- Add distinct enemy tells for barbarians, dragons, spiders, and future biome-specific mobs.
- Add short musical stingers for discovery, quest completion, level-up, wave cleared, and boss arrival.
- Add city, village, church, castle, wilderness, mountain, desert, and future biome sound beds.

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
- Defer landscape handheld/tablet and portrait-orientation checks until small-screen support returns to scope.
- Confirm roofs, horns, collision, terrain blending, water, fog, and shadows.
- Confirm NPC, player, house, dragon, spider, and barbarian proportions follow the scale targets in `docs/ACTIVE_TASKS.md`.
- Confirm generated or external textures follow `docs/ASSET_POLICY.md`.
- Screenshot pass for villages, POIs, arena, mount state, and quest panel.

### Performance Gate

- Target stable 60 FPS desktop on mid-range hardware.
- Track draw calls, shadow cost, particles, enemy counts, and foliage density.
- Stress-test max waves, mounted traversal, village NPCs, and online sessions.
- Add internal FPS/memory overlay if needed.
- Treat performance as a required review note for every feature that adds repeated objects, per-frame logic, network messages, particles, lights, or audio voices.

### Audio Gate

- Mute and volume controls work before and during gameplay.
- Browser autoplay restrictions recover gracefully after the first interaction.
- Combat-critical cues remain audible over ambience.
- Repeated attacks, footsteps, and UI sounds do not fatigue during a 30-minute playtest.
- Audio pooling prevents unbounded sound instances during heavy waves and multiplayer sessions.

### Release Gate

- `node --check` for the module script.
- `git diff --check`.
- Browser smoke test without console errors.
- Firebase deploy succeeds.
- Live Firebase URL returns 200 and expected title.

## Current Deployment

- Production: `https://ironhold-game.web.app/`
- Internal Firebase project: `ironhold-waves`
- Public game name: `Ironhold`
