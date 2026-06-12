# Ironhold Lore Bible And NPC Voice Guide

Owner: Creative / Narrative Agent.

This is the human-readable companion to `src/content/dialogue.js`, which holds the machine-readable canon. If the two disagree, fix the module — it is what the game and future AI systems actually consume. Canon changes require Creative / Narrative review before merging.

## How This Maps To The Roadmap

`docs/ROADMAP.md` section "AI-Assisted NPC Communication":

- **Phase 1, Scripted Canon** — shipped by `src/content/dialogue.js`: authored quest dialogue states for every quest, NPC voice sheets, this lore bible, tagged ambient barks, and deterministic fallback lines for every quest state.
- **Phase 2, Assisted Authoring** — supported, not yet in use: `buildLorePacket()` produces the only approved input bundle for drafting variant lines. Drafts must pass `validateAssistedLine()` and human review before being added to `questDialoguePacks` or `ambientBarks` as scripted content.
- **Phase 3, Bounded Generation** — scaffolded, not enabled: lore packets carry voice guide, public lore, quest state, allowed topics, and forbidden topics; `validateAssistedLine()` falls back deterministically; `logAssistedConversation()` records exchanges for review and promotion into authored canon. No live generation is wired into the game.

## World Canon

Ironhold is a low-poly, grounded-fantasy valley. Travel, weather, and danger are practical concerns, not spectacle. Magic exists but behaves like a trade skill.

- The valley's heart is open **meadow**: farmsteads, hearth-villages, lakes, and tree lines that hide raiders at dusk.
- **Old roads** connect the settlements. Carved waymarks and roadside supply stops keep travelers honest and alive.
- **Crownford** is a civic river-and-castle city — pale stone, timber upper floors, tiled roofs, broad disciplined streets. It runs on stone, bell, and writ rather than promise.
- The **Crownring** is an arena built into Crownford's outer wall district. Fighters face waves and may yield by bell without shame. The fallen wake in the **infirmary** beside the church; nobody dies for sport in Crownford.
- The southern **dunes** hold buried cisterns and well-stones; man-sized dune spiders web the water paths shut.
- **Siltwell Cistern** sits on the northeast fringe of Amber Dunes: a practical road waterwork with a sealed wellstone chamber, not a treasure vault or temple.
- The **Dragonspine Peaks** rise in ridges and passes; dragons roost on the high shelves.
- **Mistfen** is a plank-road swamp where pale wisps drift against the wind to lure travelers off the boards. Old shrine bells glow in its sunken pools.
- Travelers fight as **knights** (sword and guard) or **wizards** (staff and storm). A good **horse** makes the valley small.

## Factions

| Faction | Identity |
| --- | --- |
| Hearthfolk | Village families: farmers, herders, herbalists, well-keepers. Safety means open roads and full cisterns. |
| Roadwardens | Riders, quartermasters, and waymark-keepers who keep the long roads passable. |
| Crownford Civic Order | Marshals, masons, and clerks who run Crownford by stone, bell, and writ. |
| Crownring Stewards | Arena keepers. They honor courage but respect the yield bell more than the purse. |
| Sanctuary of the Lamps | Church and infirmary folk. Lamps lit, beds ready, the defeated breathing. |

## NPC Voice Sheets (Summary)

Full sheets, including writer-only secrets, live in `npcVoiceSheets` in `src/content/dialogue.js`. Secrets are never exported into lore packets.

| NPC | Quest | Biome | Faction | Voice in one line |
| --- | --- | --- | --- | --- |
| Mira | herbs | meadow | Hearthfolk | Warm kitchen-table sentences; plant names before pleasantries. |
| Torren | raiders | meadow | Hearthfolk | Blunt; talks in cargo and casualties, counts out loud. |
| Sella | villages | meadow | Hearthfolk | Precise and curious; speaks in routes and landmarks. |
| Rowan | horse | meadow | Hearthfolk | Calm, brief, no sudden moves — talks to people like horses. |
| Amara | spiders | desert | Hearthfolk | Measures words like water; the dunes are a living neighbor. |
| Kael | dragons | mountain | Hearthfolk | Reads wind and smoke first; sentences arrive like reports. |
| Mirel | wisps | swamp | Hearthfolk | Quiet, even; gives survival rules as gifts, not warnings. |
| Noll | bogRelics | swamp | Hearthfolk | Wry; talks in trades and owed favors, jokes to cover reverence. |
| Quartermaster Pell | roadwardenTack | city | Roadwardens | Exacting; compliments disguised as inventory notes. |
| Marshal Rowan Vale | cityWrits | city | Civic Order | Measured, formal, soldier's economy; quotes waystones. |
| Sister Edda | citySanctuary | city | Sanctuary | Soft, deliberate; speaks of light like masons speak of stone. |
| Steward Bryn | crownringTrial | city | Crownring Stewards | Arena cadence: short rules, long pauses, grim jokes. |
| Mason Vale | — | city | Civic Order | Every subject becomes masonry within two sentences. |
| Physicker Maud | — | city | Sanctuary | Triage speech: symptoms first, sympathy implied. |

Unnamed villagers use the per-biome voices in `biomeVillagerVoices`.

## Dialogue Tagging Scheme

- **Quest dialogue** is keyed by quest state — `available`, `active`, `ready`, `done` — plus `readyStatus` / `doneStatus` for the status line, matching what `questDialogueLine()` / `questStatusLine()` in `src/main.js` consume. `conversationTags` (max 8) tie a quest to lore facts.
- **Ambient barks** carry `biome` (meadow/desert/mountain/swamp/city), `mood` (`greeting`, `smalltalk`, `rumor`, `warning`), and `when` (`always` or `questActive`).
- **Lore facts** carry tags matched against voice-sheet biome + quest `conversationTags` when building packets.
- Selection is deterministic (`ambientLineFor` hashes npc/biome/mood/seed), so host and joiner render identical barks without extra network messages.

## Hard Rules For All NPC Lines (Authored Or Assisted)

NPC lines must never introduce:

- Coin, prices, shops, buying, or selling — no economy is shipped.
- Crafting, forging, or upgrade materials.
- Dungeons or unannounced locations.
- New rewards, items, weapons, spells, or mounts beyond authored quest rewards.
- New factions, gods, kingdoms, or wars without canon review.
- Implementation details (servers, spawning, saves, versions) or meta game talk.

These rules are encoded in `loreBible.forbiddenTopics` and enforced mechanically by `validateAssistedLine()`.

## Phase 2 Workflow: Assisted Authoring

1. Build the packet: `buildLorePacket({ npcName, questId, questState })`.
2. Draft variants with AI using **only** the packet contents as context.
3. Run each draft through `validateAssistedLine(draft, packet)`; discard failures.
4. Creative / Narrative reviews survivors for voice, tone, and canon fit.
5. Accepted lines are committed into `questDialoguePacks` / `ambientBarks` — they become ordinary scripted content. Nothing ships unreviewed.

## Phase 3 Preconditions: Bounded Generation

Live generated dialogue stays out of the game until all of these hold:

- Only selected NPCs, only within curated contexts (packet-provided topics).
- Every quest state keeps its deterministic fallback (`stateFallbackLines`); validation failure or low confidence always returns the fallback.
- Every exchange is recorded via `logAssistedConversation()` (bounded local log) and periodically reviewed for promotion into authored canon.
- Approved constraints, logging, and fallback behavior are signed off by the Game Director — per `docs/AGENTS.md`, Creative / Narrative does not enable this unilaterally.
