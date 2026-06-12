# Ironhold Agent Editing Guide

Use these file boundaries when splitting future work across agents. Keep edits scoped to the most specific owner file first, and touch `src/main.js` only for integration glue or behavior that still has no extracted module.

## Current Boundaries

- `src/main.js`: game loop, Three.js scene assembly, runtime state, combat integration, multiplayer integration, and still-unextracted legacy systems.
- `src/config/gameplay.js`: shared gameplay, audio, minimap, Wilds Director, dungeon, arena, and visibility tuning constants.
- `src/core/math.js`: pure math, interpolation, hashing, deterministic random, and geometry-cache sizing helpers.
- `src/content/rpg.js`: RPG progression data, equipment, perks, XP thresholds, and combat tuning tables.
- `src/content/dialogue.js`: NPC dialogue response helpers and authored dialogue merge behavior.
- `src/content/help.js`: help-panel class guide, reward list, tuning labels, and formatting.
- `src/systems/townRespawn.js`: town checkpoint persistence and exploration death respawn resolution.

## Suggested Future Extractions

- Move quest definitions and reward tables out of `setupExplorationQuests()` into a content module.
- Move online room, chat, and world snapshot helpers into a `systems/networking` module.
- Move Crownring/Bellwater shared activity state and rewards into a `systems/activities` module.
- Move enemy factories and Wilds Director behavior into a `systems/enemies` module.
- Move procedural audio and music theme code into a `systems/audio` module.

## Coordination Rules

- Give each agent one extracted module or one clearly bounded region of `src/main.js`.
- If an agent needs a new shared constant, add it to `src/config/gameplay.js` instead of duplicating values.
- If a new helper has no DOM, Three.js object mutation, or global state dependency, prefer `src/core/`.
- Preserve existing quest IDs, progression keys, and online message shapes unless a migration is explicitly planned.
