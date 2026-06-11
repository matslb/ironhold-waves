# Ironhold Active Task Brief

Branch: `codex/exploration-arena-rework`

This brief converts the current creative direction into implementation tasks. Agents may propose creative details inside their ownership area, but implementation choices must preserve the approved direction below.

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

## Phase 1: Remove Arena As A Top-Level Mode

Primary owner: UI / UX Agent

Support: Gameplay Systems Agent, Release Agent

Tasks:
- Remove the visible Arena Waves mode card from the start flow.
- Default new sessions to Exploration.
- Keep Start Session, Join Session, and Resume Game as the main entry choices.
- Ensure joined users inherit the host world and do not choose modes.
- Update menu copy so it explains Exploration as the full game frame.
- Keep old arena code available temporarily for reuse, but stop exposing it as a top-level mode.

Acceptance:
- A new player cannot select standalone arena waves from the menu.
- Starting a session always enters Exploration.
- Joining a session still works with the four digit code flow.
- Existing local saves still resume into Exploration.

## Phase 2: Crownford And Crownring

Primary owner: World & Content Agent

Support: Creative / Narrative Agent, Rendering / Performance Agent

Tasks:
- Replace or evolve the current arena-city concept into Crownford.
- Add a city layout that reads as a place first, not just an arena launcher.
- Include castle ward, church/infirmary, stable yard, market/guild hints, houses, walls, and the Crownring at the outer edge.
- Add Marshal Rowan Vale near the Crownring entrance.
- Add an infirmary recovery point beside the church or arena barracks.
- Add a yield bell or steward object inside the arena.
- Add Crownford to discovery/progression without breaking the village discovery quest edge cases.

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

Tasks:
- Keep the Exploration road network continuous, aligned to settlement entrances, and clear of major lakes.
- Keep later tree, rock, and clutter placement off the main roads.
- Expand deterministic low-poly decor around villages, Crownford, and biome landmarks.
- Add carts, buckets, brooms, barrels, crates, benches, lantern posts, market clutter, training props, and biome-specific props.
- Use mostly static meshes and glow materials; reserve real lights for a small bounded list.
- Add colliders only for large decor such as carts, stalls, lamp posts, racks, and piles.

Acceptance:
- Roads read as a connected travel network rather than disconnected patches.
- Village and city road entries line up with gates, wells, streets, and doors.
- Decor improves lived-in readability without blocking NPCs, quest items, or main travel routes.
- Crownford decor feels civic and disciplined, while biome decor matches local architecture and threats.

## Phase 3: Arena Activity System

Primary owner: Gameplay Systems Agent

Support: Multiplayer / Netcode Agent, UI / UX Agent

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

Tasks:
- Add a scoped arena activity state under `game.exploration`.
- Start arena waves from Marshal Rowan Vale dialogue/service actions.
- Do not call `resetGame()` to start arena waves.
- Teleport participants into the Crownring, dismount players, and park horses outside.
- Spawn arena waves from Crownring gates.
- Tag arena enemies, projectiles, fireballs, effects, and potions with `activityType: "arena"` and `activityId`.
- Make arena cleanup remove only matching activity actors.
- Keep roaming Exploration mobs, quests, mounts, saves, and NPCs intact.
- Add intermission behavior where players can claim winnings and leave.
- Add mid-wave yield behavior with reduced current-wave reward.
- On arena defeat, stop the activity, clear arena actors, restore the player at the infirmary, and continue Exploration.

Rewards:
- Kill XP remains small and immediate.
- Wave clear XP is awarded once per eligible participant.
- Milestone rewards can land every three waves.
- Dying or yielding mid-wave keeps earned kill XP but no current wave clear bonus.
- Future progression state should support `bestWave`, `completions`, and `rank`.

Acceptance:
- Starting arena waves does not reset the Exploration world.
- Dying in arena never opens the game-over flow.
- Leaving arena never closes the online room.
- Arena actors do not mingle with normal Exploration completion logic.
- Wizard-dropped potions in arena are shared like other online potions.

## Phase 4: Host-Authoritative Online Arena

Primary owner: Multiplayer / Netcode Agent

Support: Gameplay Systems Agent, QA / Playtest Agent

Tasks:
- Host owns arena activity phase, wave number, enemy spawning, enemy health/death, shared drops, fireballs, reward events, and end transitions.
- Joiners send intents/requests only.
- Add message kinds or equivalents:
  - `arenaStartRequest`
  - `arenaLeaveRequest`
  - `arenaDefeated`
  - `arenaState`
  - `arenaReward`
- Include arena activity state in host world snapshots or an equivalent single source of truth message.
- Late joiners spawn at Crownford/infirmary as spectators or pending participants, then join at the next intermission.
- If a joiner leaves mid-arena, remove that player from participants and continue if others remain.
- If host closes/leaves, current room-close behavior wins. No host migration in this pass.

Acceptance:
- Two desktop clients see the same arena enemies, projectiles, fireballs, effects, and potions.
- Host can start arena; joiner can request arena start through the NPC.
- Late joiners do not break an active arena.
- Room close/leave behavior remains predictable.

## Phase 5: Model Scale And Proportion Cleanup

Primary owner: Rendering / Performance Agent

Support: World & Content Agent, QA / Playtest Agent

Scale targets:
- Player body reads as roughly `2.2-2.4` world units tall. Plume/hat may reach about `3.0`.
- Friendly NPCs are adult-scale, with head/hood around `2.05-2.25` and quest marker above `2.6`.
- Barbarians are near-player scale and broad, with horns angled outward/up.
- Dragons should feel dangerous, with wingspan around `6-7.5` and body length around `4.5-5.5`.
- Spiders are man-sized giants: low and wide, carapace top around `1.1-1.3`, leg span around `2.5-3.0`.
- Doors should be at least `1.75` units high; eaves should clear player head.

Tasks:
- Fix any remaining roof inversion and horn orientation issues.
- Normalize friendly NPC proportions and quest marker height.
- Increase village/city house scales where doors and walls look too small.
- Update structure colliders after model scale changes.
- Resize dragons and spiders, then update radius, health bar height, hover height, and attack ranges.
- Verify remote player and enemy scale snapshots still match host state.

Acceptance:
- NPCs no longer look child-sized beside the player.
- Houses look habitable by the player/NPC scale.
- Dragons read larger and more threatening from the default camera.
- Spiders remain giant/man-sized, not tiny pests.
- Collision still feels fair around trees, rocks, houses, and city structures.

## Phase 5B: Texture And Material Pass

Primary owner: Rendering / Performance Agent

Support: World & Content Agent, Sound Design / Audio Agent, QA / Playtest Agent

Policy:
- Follow `docs/ASSET_POLICY.md`.
- Prefer procedural or generated stylized textures first.
- Use external free textures only when the license is clear and the visual gain is worth the asset cost.
- CC0 sources are preferred. Mixed-license libraries require per-asset checks.

Tasks:
- Add a focused Crownford material pass after scale/proportion cleanup.
- Prioritize stone, roof tile, timber, banners, roads, arena sand, church/castle accents, and shield/cape detail.
- Add character/enemy texture details only where they improve recognition from the default third-person camera.
- Track any committed external asset source, license, and attribution requirement.
- Keep texture sizes small and reuse atlases/materials where practical.

Acceptance:
- Textures improve readability without pushing the game toward photorealism.
- Firebase load remains quick.
- Crownford and arena waves remain smooth.
- Every external asset has documented licensing.

## RPG Mechanics Backlog

Primary owner: RPG Mechanics / Economy Agent

Support: Gameplay Systems Agent, Creative / Narrative Agent, UI / UX Agent, Multiplayer / Netcode Agent

Purpose:
- Turn Ironhold from a set of activities into a satisfying RPG loop with meaningful choices, rewards, and character growth.

Candidate systems:
- Equipment slots: weapon, offhand or focus, armor or robe, trinket, mount tack, consumables.
- Weapon identities: sword, axe, mace, spear, staff, wand, spell focus, and future rare variants.
- Passive perks: class-specific and general upgrades unlocked through levels, trainers, quests, arena rank, or biome discoveries.
- Buffs and debuffs: food, potions, shrine blessings, NPC blessings, arena boons, poison, burn, slow, guard break, storm charge.
- Inventory: lightweight stackable consumables/materials first, then equipment once UI and persistence are ready.
- Loot sources: quests, POIs, arena milestones, chests, merchants, elite mobs, and future dungeons.
- Economy: small coin/material model only when there are clear sinks such as repairs, upgrades, shops, crafting, stables, or training.
- Buildcraft: knight and wizard should have distinct choices without requiring complicated menus.

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

Tasks:
- Keep desktop controls first-class, but make handheld/touch play a supported control surface.
- Require landscape mode on small touch devices and show a clear orientation notice in portrait.
- Ensure touch movement, camera control, attack, secondary ability, potion/bash, interact, mount, yield, and pause have usable controls.
- Add keyboard-first arena service dialogue:
  - `E` interact/advance
  - `Up/Down` or `W/S` select
  - `Enter` choose
  - `Esc` or `Backspace` close
- Add contextual prompts:
  - `E Talk`
  - `Hold E Leave Arena`
  - `Hold R Yield`
  - `Enter Select`
- During arena activity, temporarily show arena wave/status in the quest tracker area.
- Keep ability boxes and desktop key labels visible.
- Add future audio hooks for arena start, wave clear, yield, defeat, victory, crowd ambience, city ambience, UI selection, and confirm/cancel.
- Ensure audio hooks respect future mute/volume settings.

Acceptance:
- Dialogue can be completed without mouse interaction.
- Core Exploration and Crownring arena play can be completed on a landscape touch device.
- Portrait mode on handheld devices shows a clear landscape-required notice instead of a cramped broken game.
- Touch controls do not overlap critical HUD, quest tracker, arena status, or ability boxes.
- Escape closes the correct layer in dialogue, arena, pause, and normal exploration.
- Arena status is visible without hiding core health/resource information.
- Sound hooks are named and ready even if full audio implementation lands later.

## Performance Stewardship

Performance does not need to become a separate decision-making agent yet, but it is a required review concern for every implementation slice.

Specialist owner: Rendering / Performance Agent

Feature owner duties:
- Call out expected performance impact before implementation.
- Prefer pooled/reused objects for projectiles, particles, potions, markers, and short-lived effects.
- Avoid adding per-frame scans over large arrays unless the list is bounded or spatially filtered.
- Keep lights, shadow casters, particles, and animated props intentional in Crownford and the Crownring.
- Keep texture count, resolution, and material variety intentional.
- Keep multiplayer snapshots compact when adding arena activity state.
- Preserve low-poly procedural style before adding geometry detail.

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
- Touch/handheld checks: landscape phone-sized viewport, landscape tablet-sized viewport, portrait orientation notice, touch movement/camera/attack/interact/pause.
- Performance check during Crownford traversal and active arena waves.

## Implementation Policy

- Keep the feature branch approach.
- Avoid parallel code edits to `index.html` unless write scopes are very clear.
- Prefer a first implementation slice that makes local single-player Crownford arena work, then harden multiplayer.
- Preserve Firebase Hosting as the supported deployment target.
