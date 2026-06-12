// Ironhold NPC communication content and helpers.
//
// This module implements the AI-Assisted NPC Communication roadmap:
// - Phase 1, Scripted Canon: authored quest dialogue states, voice sheets,
//   a compact machine-readable lore bible, tagged ambient barks, and
//   deterministic fallback lines for every quest state.
// - Phase 2/3 scaffolding: bounded lore packet builder, assisted-line
//   validation against canon/mechanics rules, and a reviewable conversation
//   log. No live generation happens here; this module only defines the
//   approved inputs, guardrails, and fallbacks that future assisted or
//   generated dialogue must flow through.
//
// Human-readable companion: docs/LORE_BIBLE.md
// Owner: Creative / Narrative Agent. Keep canon changes reviewed.

export const dialogueContentVersion = 1;

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

export const factions = {
  hearthfolk: {
    name: "Hearthfolk",
    summary: "Village families of the valley: farmers, herders, herbalists, and well-keepers who measure safety in open roads and full cisterns."
  },
  roadwardens: {
    name: "Roadwardens",
    summary: "Loose order of riders, quartermasters, and waymark-keepers who keep the long roads passable between settlements."
  },
  crownfordCivic: {
    name: "Crownford Civic Order",
    summary: "The marshals, masons, and clerks who run Crownford by stone, bell, and writ rather than by promise."
  },
  crownringStewards: {
    name: "Crownring Stewards",
    summary: "Keepers of the Crownring arena. They honor courage but respect the yield bell more than the purse."
  },
  sanctuary: {
    name: "Sanctuary of the Lamps",
    summary: "Crownford's church and infirmary folk. They keep lamps lit, beds ready, and the defeated breathing."
  }
};

// ---------------------------------------------------------------------------
// Lore bible (public canon, machine-readable)
// ---------------------------------------------------------------------------
// Facts tagged for lore packet filtering. Everything here is public canon an
// NPC may speak about. Secrets live only in voice sheets and are never
// exported into lore packets.

export const loreBible = {
  world: "Ironhold is a low-poly grounded-fantasy valley. Travel, weather, and danger are practical concerns, not spectacle. Magic exists but behaves like a trade skill.",
  facts: [
    { id: "valley", tags: ["world", "meadow", "starter"], text: "The valley's heart is open meadow with farmsteads, hearth-villages, lakes, and tree lines that hide raiders at dusk." },
    { id: "roads", tags: ["world", "roads", "travel"], text: "Old roads connect the settlements. Carved waymarks and roadside supply stops keep travelers honest and alive." },
    { id: "crownford", tags: ["city", "crownford"], text: "Crownford is a civic river-and-castle city of pale stone, timber upper floors, tiled roofs, and broad disciplined streets." },
    { id: "crownring", tags: ["city", "arena", "crownring"], text: "The Crownring is an arena built into Crownford's outer wall district. Fighters face waves of beasts and raiders, and may yield by bell without shame." },
    { id: "infirmary", tags: ["city", "arena", "sanctuary"], text: "Fighters who fall in the Crownring wake in the Crownford infirmary beside the church. Nobody dies for sport in Crownford." },
    { id: "marshal", tags: ["city", "crownford", "arena"], text: "Marshal Rowan Vale, a former knight, keeps Crownford's roads and writs. He measures people by what they read and ride, not what they boast." },
    { id: "desert", tags: ["desert", "spiders"], text: "The southern dunes hold buried cisterns and well-stones. Man-sized dune spiders web the water paths shut when no one fights back." },
    { id: "siltwell", tags: ["desert", "cistern", "siltwell", "dungeon"], text: "Siltwell Cistern sits at the northeast fringe of Amber Dunes, where a sealed wellstone chamber keeps the road's old waterwork from failing." },
    { id: "mountains", tags: ["mountain", "dragons", "dragonspine"], text: "The Dragonspine Peaks rise in ridges and passes. Dragons roost on the high shelves and circle the passes when their nests stir." },
    { id: "swamp", tags: ["swamp", "mistfen", "wisps"], text: "Mistfen is a plank-road swamp. Pale fen wisps drift against the wind and lure travelers off the boards into black water." },
    { id: "relics", tags: ["swamp", "relics", "shrines"], text: "Old shrine bells sank into Mistfen's pools long ago. Some still glow with leftover blessing when the mist is right." },
    { id: "mounts", tags: ["mount", "travel", "roads"], text: "A good horse makes the valley small. Riders prove their tack on the posted road waymarks before the Roadwardens trust it." },
    { id: "classes", tags: ["world", "combat"], text: "Travelers fight as knights with sword and guard, or wizards with staff and storm. Both bleed the same and both can yield." },
    { id: "villages", tags: ["meadow", "settlements", "starter"], text: "Hearth-villages mark themselves by chimney smoke, bells, and well-stones. Mapping them makes every later journey shorter." }
  ],
  // Topics no NPC line, authored or assisted, may introduce.
  forbiddenTopics: [
    "coin, gold, prices, shops, buying, or selling (no economy is shipped)",
    "crafting, forging, or upgrade materials",
    "unannounced dungeons or unauthored locations",
    "new rewards, items, weapons, or spells beyond authored quest rewards",
    "new factions, gods, kingdoms, or wars (canon additions require review)",
    "implementation details: servers, code, spawning, snapshots, saves, versions",
    "the real world, the player as a player, or the game as a game"
  ]
};

// Patterns that fail assisted-line validation. Kept conservative: these catch
// promises and meta-talk, not ordinary fantasy vocabulary.
const forbiddenLinePatterns = [
  { reason: "economy is not shipped", pattern: /\b(gold|coins?|silver pieces|price|prices|shop|merchant stall|buy|sell|purchase)\b/i },
  { reason: "crafting is not shipped", pattern: /\b(craft|crafting|forge (you|it|one)|smith (you|it|one)|upgrade material)\b/i },
  { reason: "unannounced dungeons require review", pattern: /\b(secret|hidden|unannounced|future)\s+dungeons?\b/i },
  { reason: "implementation details are hidden", pattern: /\b(server|netcode|snapshot|spawn(?:ed|ing)?|respawn|hitbox|save file|localstorage|version \d|patch notes|prompt|token)\b/i },
  { reason: "meta game talk breaks character", pattern: /\b(player|game over|main menu|keyboard|press [a-z] to|fps|lag)\b/i },
  { reason: "unsupported promise of new rewards", pattern: /\b(new (?:reward|item|weapon|spell|mount))|(?:i (?:will|can) (?:give|grant) you (?:a|an|the) (?:legendary|unique|special) )/i }
];

// ---------------------------------------------------------------------------
// NPC voice sheets
// ---------------------------------------------------------------------------
// `secret` is writer-facing canon only. buildLorePacket() never exports it.

export const npcVoiceSheets = {
  "Mira": {
    name: "Mira",
    role: "Hedge herbalist of the starter meadow",
    questId: "herbs",
    biome: "meadow",
    faction: "hearthfolk",
    personality: ["warm", "practical", "quietly stubborn"],
    speechPattern: "Short kitchen-table sentences. Plant names come before pleasantries.",
    motives: "Keep the valley's travelers patched up with better medicine than field kits.",
    fears: "A bad season killing the lakeside greenfire for good.",
    secret: "She learned brewing from a Mistfen shrine keeper and still owes that order a debt.",
    ties: ["Trades remedies to Torren's road traders", "Respects Physicker Maud's infirmary work"]
  },
  "Torren": {
    name: "Torren",
    role: "Meadow trade-road organizer",
    questId: "raiders",
    biome: "meadow",
    faction: "hearthfolk",
    personality: ["blunt", "fair", "tired of burying carters"],
    speechPattern: "Talks in cargo and casualties. Counts things out loud.",
    motives: "Open trade roads so villages argue about prices instead of funerals.",
    fears: "The raiders getting organized under one banner.",
    secret: "He rode with a raider band as a boy and recognizes some of their knots.",
    ties: ["Coordinates with Quartermaster Pell on road supplies", "Buys remedies from Mira"]
  },
  "Sella": {
    name: "Sella",
    role: "Hearth-map cartographer",
    questId: "villages",
    biome: "meadow",
    faction: "hearthfolk",
    personality: ["curious", "precise", "optimistic"],
    speechPattern: "Speaks in routes and landmarks. Loves giving names to nameless places.",
    motives: "Put every settlement on one trustworthy map so the valley feels smaller.",
    fears: "Her maps sending someone down a road that no longer exists.",
    secret: "Whole stretches of her old maps are educated guesses she has never walked.",
    ties: ["Sells route notes to the Roadwardens", "Marks Crownford's waystones as fixed points"]
  },
  "Rowan": {
    name: "Rowan",
    role: "Meadow horse trainer",
    questId: "horse",
    biome: "meadow",
    faction: "hearthfolk",
    personality: ["patient", "dry-humored", "horse-first"],
    speechPattern: "Talks to people the way he talks to horses: calm, brief, no sudden moves.",
    motives: "Match good horses with riders who will not waste them.",
    fears: "Seeing one of his horses ridden lame by a careless rider.",
    secret: "He names every horse after someone he misses and tells no one.",
    ties: ["Sends proven riders to Quartermaster Pell for tack", "No relation to Marshal Rowan Vale, which both find tiresome"]
  },
  "Amara": {
    name: "Amara",
    role: "Desert well-keeper",
    questId: "spiders",
    biome: "desert",
    faction: "hearthfolk",
    personality: ["steady", "economical", "dune-wise"],
    speechPattern: "Measures words like water. Speaks of the dunes as a living neighbor.",
    motives: "Keep the cistern paths open so the dune villages drink.",
    fears: "A webbed-over season turning her village into a ruin on Sella's map.",
    secret: "She keeps a spider's fang from the year the wells failed, as a reminder.",
    ties: ["Trades water rights news with passing Roadwardens"]
  },
  "Ilyas": {
    name: "Ilyas",
    role: "Siltwell cistern-keeper",
    biome: "desert",
    faction: "hearthfolk",
    personality: ["spare", "watchful", "infrastructure-minded"],
    speechPattern: "Counts water, shade, steps, and risk. Sentences are dry, practical, and a little anxious.",
    motives: "Keep Siltwell open enough that road travelers and fringe wells do not fail together.",
    fears: "The sealed chamber turning from a waterwork into a story people stop trying to fix.",
    secret: "He sleeps badly when the well bell is quiet too long.",
    ties: ["Respects Amara's village cistern work", "Warns road travelers before they mistake shade for safety"]
  },
  "Kael": {
    name: "Kael",
    role: "Mountain herder and pass-watcher",
    questId: "dragons",
    biome: "mountain",
    faction: "hearthfolk",
    personality: ["watchful", "terse", "weather-reading"],
    speechPattern: "Reads wind and smoke first, talks second. Sentences arrive like reports.",
    motives: "Keep the high passes safe enough to drive flocks through.",
    fears: "A roost shelf above the village going active in lambing season.",
    secret: "He once watched a dragon pass him by at arm's length and never told the village how close it was.",
    ties: ["Sends ridge-smoke warnings down to the valley roads"]
  },
  "Mirel": {
    name: "Mirel",
    role: "Mistfen plank-road warden",
    questId: "wisps",
    biome: "swamp",
    faction: "hearthfolk",
    personality: ["calm", "superstition-proof", "protective"],
    speechPattern: "Quiet, even voice. Gives survival rules as gifts, not warnings.",
    motives: "Keep the dusk crossings honest so travelers arrive where they meant to.",
    fears: "A night when the wisps learn to hold still like true lanterns.",
    secret: "She lost her brother to the lights and walks the planks every dusk because of it.",
    ties: ["Works the same crossings Noll fishes for relics"]
  },
  "Noll": {
    name: "Noll",
    role: "Mistfen relic-fisher and trader of favors",
    questId: "bogRelics",
    biome: "swamp",
    faction: "hearthfolk",
    personality: ["wry", "debt-keeping", "older than he acts"],
    speechPattern: "Talks in trades and owed favors. Jokes to cover reverence.",
    motives: "Raise the sunken shrine bells and settle old debts with their blessing.",
    fears: "Pulling up a bell that has gone dark and angry.",
    secret: "One of the sunken shrines was his family's, and the debt he repays is his own.",
    ties: ["Pays Mirel in field medicine for safe crossings"]
  },
  "Quartermaster Pell": {
    name: "Quartermaster Pell",
    role: "Crownford roadwarden quartermaster",
    questId: "roadwardenTack",
    biome: "city",
    faction: "roadwardens",
    personality: ["exacting", "dry", "secretly proud of good riders"],
    speechPattern: "Inspects while talking. Compliments arrive disguised as inventory notes.",
    motives: "Make sure no rider leaves Crownford on straps that will fail in the hills.",
    fears: "Hearing that tack he fitted gave out on a mountain road.",
    secret: "He keeps a ledger of every rider he has fitted and checks the road reports for their names.",
    ties: ["Reports road conditions to Marshal Rowan Vale", "Receives Rowan's proven riders"]
  },
  "Marshal Rowan Vale": {
    name: "Marshal Rowan Vale",
    role: "Marshal of Crownford, former knight, keeper of the writs",
    questId: "cityWrits",
    biome: "city",
    faction: "crownfordCivic",
    personality: ["disciplined", "fair", "unimpressed by boasting"],
    speechPattern: "Measured and formal, with a soldier's economy. Quotes the waystones from memory.",
    motives: "Keep Crownford's roads honest with stone, bell, and sworn guides.",
    fears: "The city trusting promises over stone the way the old kingdoms did.",
    secret: "His knighthood ended over a refusal to follow an order he still believes was wrong.",
    ties: ["Commands the civic order", "Respects the Crownring stewards' yield bell", "Receives Pell's road reports"]
  },
  "Sister Edda": {
    name: "Sister Edda",
    role: "Keeper of the sanctuary lamps",
    questId: "citySanctuary",
    biome: "city",
    faction: "sanctuary",
    personality: ["gentle", "unhurried", "immovable on hospitality"],
    speechPattern: "Soft, deliberate sentences. Speaks of light the way masons speak of stone.",
    motives: "Keep the sanctuary lit so no traveler stops knocking on a dark door.",
    fears: "A storm season long enough to outlast the lamp oil.",
    secret: "She shelters arena fighters who are too proud to be seen resting.",
    ties: ["Works beside Physicker Maud in the infirmary", "Hosts Crownring fighters after defeats"]
  },
  "Steward Bryn": {
    name: "Steward Bryn",
    role: "Steward of the Crownring",
    questId: "crownringTrial",
    biome: "city",
    faction: "crownringStewards",
    personality: ["seasoned", "wry", "protective behind the gruffness"],
    speechPattern: "Arena cadence: short rules, long pauses, the occasional grim joke.",
    motives: "Send fighters home tired instead of carried. The bell matters more than the purse.",
    fears: "A crowd that starts wanting blood more than skill.",
    secret: "He rings the yield bell a heartbeat early for fighters he likes.",
    ties: ["Answers to Crownford's civic order", "Sends the fallen to Sister Edda's infirmary"]
  },
  "Mason Vale": {
    name: "Mason Vale",
    role: "Crownford stone-mason",
    questId: null,
    biome: "city",
    faction: "crownfordCivic",
    personality: ["proud of the walls", "talkative about stone only"],
    speechPattern: "Every subject becomes masonry within two sentences.",
    motives: "Keep Crownford's pale stone standing another three hundred years.",
    fears: "River damp getting into the wall footings.",
    secret: "He carved his initials somewhere on the Crownring and dares anyone to find them.",
    ties: ["Cousin to Marshal Rowan Vale", "Maintains the arena walls for the stewards"]
  },
  "Physicker Maud": {
    name: "Physicker Maud",
    role: "Crownford infirmary physicker",
    questId: null,
    biome: "city",
    faction: "sanctuary",
    personality: ["brisk", "unshockable", "kind in deeds not words"],
    speechPattern: "Triage speech: symptoms first, sympathy implied.",
    motives: "Patch up arena fighters and road travelers faster than the valley can break them.",
    fears: "Running out of Mira's greenfire stock in a bad week.",
    secret: "She bets small sums on Crownring fighters she has stitched, and usually wins.",
    ties: ["Buys remedies brewed from Mira's greenfire", "Receives every Crownring defeat"]
  }
};

// Generic voices for unnamed villagers so ambient barks can stay in character.
export const biomeVillagerVoices = {
  meadow: { faction: "hearthfolk", speechPattern: "Friendly, unhurried farm talk: weather, roads, and who has been seen on them." },
  desert: { faction: "hearthfolk", speechPattern: "Spare, shade-seeking speech. Water and footing before anything else." },
  mountain: { faction: "hearthfolk", speechPattern: "Wind-shortened sentences. Everything is measured against the ridge line." },
  swamp: { faction: "hearthfolk", speechPattern: "Low, practical voice. Rules of the planks recited like old rhymes." },
  city: { faction: "crownfordCivic", speechPattern: "Civic and brisk. Directions given by bells, gates, and districts." }
};

// ---------------------------------------------------------------------------
// Quest dialogue packs (Phase 1 scripted canon)
// ---------------------------------------------------------------------------
// Supplemental authored dialogue for quests that do not yet carry dialogue
// states in src/main.js. Shapes match createQuest options: `dialogue` keys are
// quest states plus readyStatus/doneStatus, `conversationTags` feed lore
// packets. mergeQuestDialogueOptions() never overrides lines already authored
// at the createQuest call site.

export const questDialoguePacks = {
  herbs: {
    conversationTags: ["starter", "herbalism", "lakes", "medicine"],
    dialogue: {
      available: "Greenfire only opens its leaves near cold lake water, so mind your footing on the stones. Bring me six good stems and I will brew you something the field kits cannot match.",
      active: "Look for the green glow low along the lake edges. If a stem comes up grey, you picked too far from the water.",
      ready: "Fresh, cold-rooted, and not one bruised leaf. Stand still a moment — this batch will be strong.",
      readyStatus: "Greenfire gathered",
      done: "That brew should sit warm in your blood for a long while. If you find more greenfire out there, think of me before you trample it.",
      doneStatus: "Mira's greenfire remedy is already working through you."
    }
  },
  raiders: {
    conversationTags: ["starter", "roads", "raiders", "trade"],
    dialogue: {
      available: "I am not asking you to empty the wilds. Just thin the raiders enough that a cart can pass without a prayer and an axe in both hands.",
      active: "They keep to the road bends and the tall grass past the fields. Hit them where they wait for carts, and watch your back at dusk.",
      ready: "The road went quiet two days back, and quiet is the finest sound a trader knows. That was you.",
      readyStatus: "Roads thinned",
      done: "Carts are moving again, and folk are arguing about trade instead of holding funerals. That is what better looks like out here.",
      doneStatus: "Torren has spread word that the roads are safer."
    }
  },
  spiders: {
    conversationTags: ["desert", "spiders", "wells", "water"],
    dialogue: {
      available: "The cistern paths are webbed shut and my buckets come up dry. Clear the dune spiders and the wells can breathe again.",
      active: "They nest where the sand stays cool — rock shade and the old well-stones. You will see legs before you see eyes.",
      ready: "The webs are already tearing loose in the wind. The wells will fill, and the dunes owe you water.",
      readyStatus: "Cisterns cleared",
      done: "We drew clean water this morning, first time in a season. Drink your fill before you cross the dunes again.",
      doneStatus: "Amara has reopened the cistern paths."
    }
  },
  dragons: {
    conversationTags: ["mountain", "dragons", "passes", "dragonspine"],
    dialogue: {
      available: "Two dragons have taken to circling the passes. Bring them down before they decide the roads are a hunting ground.",
      active: "Watch the ridge smoke and keep the wind in your face. If the air turns warm, you are closer than you want to be.",
      ready: "The peaks went quiet last night. First clean sky in weeks, and it was your doing.",
      readyStatus: "Peaks quieted",
      done: "The herders are driving flocks through the high pass again. They will tell stories about you that get less true every winter.",
      doneStatus: "Kael has passed word that the high passes are safe."
    }
  },
  wisps: {
    conversationTags: ["swamp", "wisps", "mistfen", "planks"],
    dialogue: {
      available: "The fen lights have learned to circle the plank roads, and travelers follow them into the black water. Banish enough and the dusk crossings are ours again.",
      active: "Trust the planks, not the lights. A true lantern holds still. A wisp drifts against the wind.",
      ready: "The crossings stayed dark and honest last night. Out here, dark is the good news.",
      readyStatus: "Crossings cleared",
      done: "Folk are crossing Mistfen by lantern again and arriving where they meant to. That is rarer than you would think.",
      doneStatus: "Mirel has reopened the dusk crossings."
    }
  },
  bogRelics: {
    conversationTags: ["swamp", "relics", "shrines", "mistfen"],
    dialogue: {
      available: "Old shrine bells went under the black pools years back, and some still glow when the mist is right. Bring the bright ones up and our best field medicine is yours.",
      active: "Feel for the glow under the reed beds. If the water hums against your boots, you are standing on one.",
      ready: "Three bells, still warm with old blessing. The shrine keepers would have wept. I will settle for paying my debts.",
      readyStatus: "Relics recovered",
      done: "The bells are drying over my hearth, and the fen feels easier around them. Take the medicine — you carried the weight.",
      doneStatus: "Noll keeps the recovered shrine bells over his hearth."
    }
  },
  horse: {
    conversationTags: ["starter", "mount", "oats", "travel"],
    dialogue: {
      available: "Boots will get you across this valley, but a horse will get you back before the bread cools. Gather wild oats and I will saddle one that already likes your shadow.",
      active: "The oats grow wild along the field edges and the sunny banks. Pick them ripe — she can tell the difference, and she holds grudges.",
      ready: "She has been watching you cross the yard all week. Hand over those oats and go meet your horse.",
      readyStatus: "Oats gathered",
      done: "Treat her well and keep your seat through the rough ground. The whole valley just got smaller for you.",
      doneStatus: "Rowan still asks after the horse whenever you pass."
    }
  },
  cityWrits: {
    conversationTags: ["city", "crownford", "waystones", "writs"],
    dialogue: {
      available: "Crownford keeps its roads honest with stone, not promises. Read the four carved waystones in the Wayfinder Beacon's reach and I will mark you a sworn guide of the high city.",
      active: "The waystones stand where the old roads bend. Read them properly — the carvings are oaths, not decoration.",
      ready: "Four stones, four oaths, all read with your own eyes. That is how Crownford takes the measure of someone.",
      readyStatus: "Waystones read",
      done: "You carry a guide's writ now. Walk like the roads are partly yours, because as of today they are.",
      doneStatus: "Marshal Vale has recorded you as a sworn guide of Crownford."
    }
  },
  citySanctuary: {
    conversationTags: ["city", "sanctuary", "lamps", "church"],
    dialogue: {
      available: "The storm took our lamps, and a dark sanctuary is a door people stop knocking on. Relight them, and Crownford will always keep a bed ready for you.",
      active: "The lamps stand in the sanctuary's quiet corners. Take your time with each one. Light that is rushed never lasts.",
      ready: "The sanctuary is glowing again, and the first travelers have already found their way in by it.",
      readyStatus: "Lamps relit",
      done: "There is a bed here with your name over it, as promised. Even sworn guides need somewhere the wind cannot follow.",
      doneStatus: "Sister Edda keeps a sanctuary bed ready for you."
    }
  }
};

// ---------------------------------------------------------------------------
// Ambient barks (tagged by biome, mood, availability)
// ---------------------------------------------------------------------------
// moods: greeting | smalltalk | rumor | warning
// when: "always" or "questActive" (any quest active in that biome)
// The first warning line per biome preserves the previously hardcoded
// refreshQuestDialog fallback text so the swap-over is behavior-safe.

export const ambientBarks = [
  // Meadow
  { biome: "meadow", mood: "warning", when: "always", text: "The road is long today. Keep an eye on the tree line and come back if you need a friendly face." },
  { biome: "meadow", mood: "greeting", when: "always", text: "Fair roads to you. The well water is sweet this week, if you are filling up." },
  { biome: "meadow", mood: "smalltalk", when: "always", text: "Hay is in, weather held, and nobody has seen raiders since market day. I will take that." },
  { biome: "meadow", mood: "rumor", when: "always", text: "A carter swears the road past the lakes glows green at dusk. Mira says that is just her herbs growing where they should." },
  { biome: "meadow", mood: "rumor", when: "questActive", text: "Word is somebody has been making the roads safer. Whoever they are, the traders are drinking to them." },
  // Desert
  { biome: "desert", mood: "warning", when: "always", text: "The dunes shift by the hour. Walk near the cactus shade and listen for legs under the sand." },
  { biome: "desert", mood: "greeting", when: "always", text: "Shade and water to you, traveler. Both are worth more than a painted sunset out here." },
  { biome: "desert", mood: "smalltalk", when: "always", text: "The wind buried the south path again last night. The dunes like to redraw Sella's maps for her." },
  { biome: "desert", mood: "rumor", when: "always", text: "Old folk say the well-stones hum when the cisterns run full. Nobody young has heard it yet." },
  // Mountain
  { biome: "mountain", mood: "warning", when: "always", text: "Smoke over the ridges means dragons are awake. Keep low when the wind goes warm." },
  { biome: "mountain", mood: "greeting", when: "always", text: "You climbed the right day. The passes are clear and the wind is only half-trying." },
  { biome: "mountain", mood: "smalltalk", when: "always", text: "Kael reads the ridge smoke like a letter. When he stops talking and starts watching, we bring the flocks in." },
  { biome: "mountain", mood: "rumor", when: "always", text: "A herder swears there is a roost shelf up the Dragonspine with bones older than the valley roads." },
  // Swamp
  { biome: "swamp", mood: "warning", when: "always", text: "Mistfen paths are safest on the planks. If a pale light drifts against the wind, keep your weapon ready." },
  { biome: "swamp", mood: "greeting", when: "always", text: "Dry boots still? Then you have been listening to Mirel. Good." },
  { biome: "swamp", mood: "smalltalk", when: "always", text: "The reeds are thick this season. Noll says that means the pools are keeping their secrets close." },
  { biome: "swamp", mood: "rumor", when: "always", text: "On still nights you can hear a bell under the black water. Some say blessing, some say warning. Nobody wades out to check." },
  // Briarfall
  { biome: "briar", mood: "warning", when: "always", text: "The woods remember every shortcut. Stay on the timber road unless you know which roots are sleeping." },
  { biome: "briar", mood: "greeting", when: "always", text: "Smoke and shade to you. If you smell charcoal, you are close enough to shout for help." },
  { biome: "briar", mood: "smalltalk", when: "always", text: "The moss roofs held through last night's rain. That means the old oaks approve of us for one more day." },
  { biome: "briar", mood: "rumor", when: "questActive", text: "Edda says the briarbacks have stopped testing the lane. The next charcoal burn may have a road again." },
  // City
  { biome: "city", mood: "warning", when: "always", text: "Keep to the paved streets near the ring. The castle bells make it easy to find your way back." },
  { biome: "city", mood: "greeting", when: "always", text: "Welcome to Crownford. Mind the cart lanes, trust the bells, and the city will treat you fairly." },
  { biome: "city", mood: "smalltalk", when: "always", text: "Mason Vale will talk your ear off about wall footings if you let him. The walls are worth it, mind." },
  { biome: "city", mood: "rumor", when: "always", text: "They say Steward Bryn rings the yield bell early for fighters he likes. He says the bell rings when it rings." },
  { biome: "city", mood: "rumor", when: "questActive", text: "The Crownring crowd has been loud lately. New blood in the sand, the stewards say." }
];

// ---------------------------------------------------------------------------
// Local reward hints
// ---------------------------------------------------------------------------
// Authored, mechanics-safe hints for nearby kits, perks, mounts, and permanent
// boons. These are intentionally prose-only: they point players toward shipped
// quest sources without granting rewards or inventing unavailable systems.

const genericRewardHint = "Most lasting advantages in Ironhold come from named work: take local tasks, finish the objective, then return to the giver for the kit, perk, mount, or boon they promised.";

export const npcRewardHints = {
  "Mira": {
    text: "Greenfire by the cold lakes makes a sturdy health brew. Bring me enough and you will carry the benefit longer than any field potion lasts.",
    ready: "Those herbs are enough for the health brew. Hand them over and let the remedy settle in.",
    done: "You already carry my greenfire remedy. For sharper gear, Torren watches the trade road."
  },
  "Torren": {
    text: "If you want travel gear, clear the raiders from the meadow roads. I can put a Roadwarden Blade in a knight's hand and a Wayfinder Focus in a wizard's pack.",
    ready: "The roads are quiet enough. Come settle the work and I will pass over the road gear.",
    done: "You have the road gear I can offer. Crownford and Briarfall hold the next lessons."
  },
  "Sella": {
    text: "Map the hearth-villages and I can improve your field routine: a full recovery potion now, and faster wizard draught practice for later.",
    ready: "Those route marks are clean. Bring them here and I will make the map work worth your while.",
    done: "Your hearth-map is official. If you want weapons, ask Torren, Edda Thorn, or the Crownring steward."
  },
  "Rowan": {
    text: "Gather wild oats if you want a horse that trusts you. After that, Quartermaster Pell in Crownring can fit proper Roadwarden Tack.",
    ready: "The oats are right. Let me saddle the horse before she changes her mind about you.",
    done: "You have a horse now. Take it to Pell near the Crownring if you want road-fit tack."
  },
  "Amara": {
    text: "Clear the dune spiders from the cistern paths and the desert will repay you with a health boon and field medicine.",
    ready: "The wells can breathe. Come claim the desert's thanks before the sand changes the subject.",
    done: "You have the desert's health lesson. Other boons wait in Mistfen, the peaks, and Crownford."
  },
  "Kael": {
    text: "Bring down the dragons over the passes and the mountain folk can teach steadier guard and stronger magica.",
    ready: "The ridge is quiet. I have the mountain lesson ready for your hands.",
    done: "The pass lesson is yours. Brunna's roost higher up holds a different prize: a skyhatched mount."
  },
  "Brunna": {
    text: "Warm drake eggs sit in the roost wind-shadows. Bring three back and the strongest hatchling can learn your saddle.",
    ready: "The clutch is warm. Stay close while I choose the hatchling that has already chosen you.",
    done: "Your drake knows your shadow. Switch mounts as the road demands."
  },
  "Mirel": {
    text: "Banish the fen wisps from the plank roads and Mistfen can teach you a hardier body and steadier focus.",
    ready: "The dusk crossings are honest again. Come take the lesson while the mist is quiet.",
    done: "Mistfen has already paid you in health and magica. Noll still watches the reed pools for old shrine medicine."
  },
  "Noll": {
    text: "The bright shrine bells under the reeds buy our best field medicine: a full restore and a full recovery potion.",
    ready: "Those bells still hum. Set them down and I will settle the debt.",
    done: "You took the fen's old medicine already. If you want a perk, Briarfall and Crownford both teach better habits."
  },
  "Edda Thorn": {
    text: "Break the rootmaw packs on the timber road and Briarfall opens its kit chest: hookblade, briar focus, briarstring bow, and the Pathcraft perk.",
    ready: "The timber road breathed easier this morning. Come claim the Briarfall kits and Pathcraft lesson.",
    done: "Briarfall gear favors control over swagger. Crownring gear favors risk, and Crownford drill trims ability costs."
  },
  "Marshal Rowan Vale": {
    text: "Read Crownford's four waystones around the beacon. Do it properly and I will record you for Crownford Drill: cleaner bash, burst, pierce, and parting-shot habits.",
    ready: "Four waystones, four oaths. Come be recorded and take the drill.",
    done: "Crownford Drill is already in your stance. For weapons, see the Crownring or Briarfall."
  },
  "Sister Edda": {
    text: "Relight the sanctuary lamps and the city will keep a bed ready for you, with a health boon and field potion for the road.",
    ready: "The lamps are lit again. Come in from the wind and take the sanctuary's blessing.",
    done: "The sanctuary bed is yours when you need it. The ring nearby teaches harsher lessons."
  },
  "Steward Bryn": {
    text: "Clear the first Crownring wave and return upright. I can mark you Crownring-proven with class kits, a training boon, and a field potion.",
    ready: "You answered the first bell. Come claim the Crownring mark before pride asks for another bruise.",
    done: "Crownring kits hit harder and ask more of you. Keep using the yield bell when the lesson turns sour."
  },
  "Quartermaster Pell": {
    text: "Bring a horse first, then ride the road waymarks from this gate. Prove the saddle and I will fit Roadwarden Tack for faster travel.",
    ready: "The route is proven. Bring the horse close and I will fit the tack.",
    done: "Roadwarden Tack is already fitted. Keep to the marked roads and it will earn its keep."
  },
  "Mason Vale": {
    text: "The Bellwater Underworks are not a kit chest, but clearing a chamber teaches a small first-clear boon. Stone remembers careful parties.",
    done: "If you want named gear, ask the people with named work: Bryn for the ring, Edda Thorn for Briarfall, and the marshal for drill."
  },
  "Bellwater Scout": {
    text: "The Bellwater Underworks are not a kit chest, but clearing a chamber teaches a small first-clear boon. Stone remembers careful parties.",
    done: "If you want named gear, ask the people with named work: Bryn for the ring, Edda Thorn for Briarfall, and the marshal for drill."
  },
  "Ilyas": {
    text: "Siltwell is not a kit chest. Clear the cistern chamber for shared XP and a small once-per-player first-clear boon. The desert pays in endurance, not treasure.",
    done: "Siltwell has taught you what it can. Amara still handles the village cistern paths, and the Crownring teaches different risks."
  },
  "Physicker Maud": {
    text: "I mend what the Crownring breaks. Bryn handles the arena kits; Sister Edda handles sanctuary blessings; I handle keeping fools breathing long enough to enjoy either."
  }
};

export const biomeRewardHints = {
  meadow: "Meadow rewards start close: Mira brews a health boon, Sella improves potion practice, Rowan offers a horse, and Torren unlocks road gear for knights and wizards.",
  desert: "The desert's lasting lessons come from waterwork: Amara's spider-clearing grants health and field medicine, while Siltwell Cistern grants shared XP and a small first-clear endurance boon.",
  mountain: "The peaks hold two prizes: Kael's dragon hunt teaches guard and magica, while Brunna's roost can earn a Skyhatched Drake mount.",
  swamp: "Mistfen pays in survival: Mirel's wisp work grants health and magica, and Noll's shrine bells bring a full restore and recovery potion.",
  briar: "Briarfall is the clearest kit road: rootmaws unlock Briarfall kits for every class plus the Pathcraft perk and mixed boons.",
  city: "Crownford rewards discipline: the marshal grants Crownford Drill, the sanctuary grants health, Pell fits Roadwarden Tack, and Bryn's Crownring trial unlocks arena kits."
};

export function rewardHintForContext(context = {}) {
  const npcHint = context.npcName ? npcRewardHints[context.npcName] : null;
  const biomeHint = biomeRewardHints[context.biome || ""] || genericRewardHint;
  const hint = npcHint || { text: biomeHint };
  const state = context.questState || "generic";
  if (state === "ready" && hint.ready) {
    return hint.ready;
  }
  if (state === "done" && hint.done) {
    return hint.done;
  }
  return hint.text || biomeHint;
}

// ---------------------------------------------------------------------------
// Deterministic fallbacks (required for every quest state)
// ---------------------------------------------------------------------------

export const stateFallbackLines = {
  available: "I have work that needs doing, if you have the legs for it.",
  active: "The task is the same as when you took it. Steady on.",
  ready: "That is done and done well. Let me settle what I owe you.",
  done: "Good to see you upright. The valley is a little easier thanks to you.",
  unavailable: "Not yet, traveler. Come back when you are readier for it.",
  generic: "Fair roads to you. Stay close to the lights after dark."
};

function hashString(text) {
  let hash = 2166136261;
  const source = String(text || "");
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function fallbackLineFor(state, npcName = "") {
  if (Object.prototype.hasOwnProperty.call(stateFallbackLines, state)) {
    return stateFallbackLines[state];
  }
  return stateFallbackLines.generic;
}

export function npcVoiceSheetFor(name) {
  return npcVoiceSheets[name] || null;
}

export function questDialoguePackFor(questId) {
  return questDialoguePacks[questId] || null;
}

// Merge helper for src/main.js createQuest(): fills in authored dialogue and
// conversationTags for quests that do not define them at the call site.
// Call-site authored lines always win over pack lines.
export function mergeQuestDialogueOptions(questId, options = {}) {
  const pack = questDialoguePacks[questId];
  if (!pack) {
    return options;
  }
  const merged = Object.assign({}, options);
  merged.dialogue = Object.assign({}, pack.dialogue, options.dialogue || {});
  if (!Array.isArray(options.conversationTags) || options.conversationTags.length === 0) {
    merged.conversationTags = pack.conversationTags.slice();
  }
  return merged;
}

// Deterministic ambient line selection. Same npc/biome/mood/seed always yields
// the same line, so hosts and joiners render identical barks without messages.
export function ambientLineFor(context = {}) {
  const biome = context.biome || "meadow";
  const mood = context.mood || null;
  const when = context.questActive ? null : "always";
  let matches = ambientBarks.filter(bark =>
    (bark.biome === biome) &&
    (!mood || bark.mood === mood) &&
    (!when || bark.when === "always")
  );
  if (matches.length === 0) {
    matches = ambientBarks.filter(bark => bark.biome === biome && bark.when === "always");
  }
  if (matches.length === 0) {
    return stateFallbackLines.generic;
  }
  const seed = hashString((context.npcName || "") + "|" + biome + "|" + (mood || "") + "|" + (context.seed || 0));
  return matches[seed % matches.length].text;
}

// ---------------------------------------------------------------------------
// Phase 2/3 scaffolding: bounded lore packets, validation, and logging
// ---------------------------------------------------------------------------

function loreFactsForTags(tags) {
  const wanted = new Set(tags || []);
  return loreBible.facts
    .filter(fact => fact.tags.some(tag => wanted.has(tag)) || fact.tags.includes("world"))
    .map(fact => fact.text);
}

// Builds the only approved context bundle for assisted authoring (Phase 2)
// or bounded generation (Phase 3). Voice sheet secrets and fears are
// deliberately excluded: packets carry public lore only.
export function buildLorePacket(context = {}) {
  const sheet = context.npcName ? npcVoiceSheets[context.npcName] : null;
  const pack = context.questId ? questDialoguePacks[context.questId] : null;
  const tags = []
    .concat(sheet ? [sheet.biome] : [])
    .concat(pack ? pack.conversationTags : [])
    .concat(Array.isArray(context.extraTags) ? context.extraTags : []);
  const questState = context.questState || "generic";
  return {
    packetVersion: dialogueContentVersion,
    npc: sheet
      ? {
          name: sheet.name,
          role: sheet.role,
          biome: sheet.biome,
          faction: factions[sheet.faction] ? factions[sheet.faction].name : sheet.faction,
          personality: sheet.personality.slice(),
          speechPattern: sheet.speechPattern,
          motives: sheet.motives,
          ties: sheet.ties.slice()
        }
      : null,
    world: loreBible.world,
    publicLore: loreFactsForTags(tags),
    questContext: pack
      ? {
          questId: context.questId,
          questState,
          conversationTags: pack.conversationTags.slice(),
          authoredLines: Object.assign({}, pack.dialogue)
        }
      : null,
    rewardHint: rewardHintForContext(context),
    allowedTopics: tags.length > 0 ? Array.from(new Set(tags)) : ["travel", "weather", "roads"],
    forbiddenTopics: loreBible.forbiddenTopics.slice(),
    fallbackLine: fallbackLineFor(questState, context.npcName || ""),
    rules: [
      "Stay in the NPC voice described by speechPattern and personality.",
      "Reference only publicLore facts and authoredLines; invent no new canon.",
      "Never promise rewards, items, locations, or mechanics beyond authoredLines.",
      "Keep lines under 360 characters and free of meta or implementation talk.",
      "When uncertain, return the fallbackLine unchanged."
    ]
  };
}

// Safety/canon gate for any assisted or generated line. Returns the line when
// it passes, otherwise the packet's deterministic fallback plus reasons.
export function validateAssistedLine(text, packet) {
  const fallback = packet && packet.fallbackLine ? packet.fallbackLine : stateFallbackLines.generic;
  const reasons = [];
  const line = typeof text === "string" ? text.trim() : "";
  if (!line) {
    reasons.push("empty line");
  }
  if (line.length > 360) {
    reasons.push("line exceeds 360 characters");
  }
  for (const rule of forbiddenLinePatterns) {
    if (rule.pattern.test(line)) {
      reasons.push(rule.reason);
    }
  }
  const ok = reasons.length === 0;
  return { ok, reasons, line: ok ? line : fallback };
}

// Review log for assisted/generated conversations (Phase 3 requirement).
// Bounded, local-only, and safe in non-browser environments.
const assistedLogStorageKey = "ironholdAssistedDialogueLogV1";
const assistedLogLimit = 40;
const memoryAssistedLog = [];

function assistedLogStorage() {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      return localStorage;
    }
  } catch (error) {
    // Storage blocked (private mode or non-browser); fall back to memory.
  }
  return null;
}

export function readAssistedConversationLog() {
  const storage = assistedLogStorage();
  if (!storage) {
    return memoryAssistedLog.slice();
  }
  try {
    const raw = storage.getItem(assistedLogStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export function logAssistedConversation(entry) {
  const record = {
    at: new Date().toISOString(),
    npcName: entry && entry.npcName ? String(entry.npcName) : "",
    questId: entry && entry.questId ? String(entry.questId) : "",
    questState: entry && entry.questState ? String(entry.questState) : "",
    requested: entry && entry.requested ? String(entry.requested).slice(0, 360) : "",
    delivered: entry && entry.delivered ? String(entry.delivered).slice(0, 360) : "",
    usedFallback: !!(entry && entry.usedFallback),
    reasons: entry && Array.isArray(entry.reasons) ? entry.reasons.slice(0, 6) : []
  };
  const storage = assistedLogStorage();
  if (!storage) {
    memoryAssistedLog.push(record);
    if (memoryAssistedLog.length > assistedLogLimit) {
      memoryAssistedLog.splice(0, memoryAssistedLog.length - assistedLogLimit);
    }
    return record;
  }
  try {
    const log = readAssistedConversationLog();
    log.push(record);
    storage.setItem(assistedLogStorageKey, JSON.stringify(log.slice(-assistedLogLimit)));
  } catch (error) {
    // Storage write failed; the record still returns for caller-side review.
  }
  return record;
}

export function clearAssistedConversationLog() {
  memoryAssistedLog.length = 0;
  const storage = assistedLogStorage();
  if (storage) {
    try {
      storage.removeItem(assistedLogStorageKey);
    } catch (error) {
      // Ignore storage failures on clear.
    }
  }
}

// ---------------------------------------------------------------------------
// Local deterministic responder (player-input-driven dialogue)
// ---------------------------------------------------------------------------
// Routes free player input through the bounded lore packet + canon/mechanics
// validation, then answers by SELECTING from already-approved canon: authored
// quest lines, tagged ambient barks, public lore facts, and the voice sheet
// role. It never invents new prose. When nothing matches confidently, it
// returns the packet's deterministic fallback. This is the shipped default and
// works fully offline with no backend, no API keys, and no network calls.

// Optional, config-gated hook for a future real generator. Inert by default:
// no generator is registered and the flag is off, so the local responder runs.
// A future backend-backed slice can call setAssistedDialogueGenerator() and
// flip enableExternalGenerator; any generated line still passes through
// validateAssistedLine() and falls back deterministically on failure/throw.
export const assistedDialogueConfig = {
  enableExternalGenerator: false
};

let externalAssistedGenerator = null;

export function setAssistedDialogueGenerator(generator) {
  externalAssistedGenerator = typeof generator === "function" ? generator : null;
}

const responderStopWords = new Set([
  "the", "a", "an", "is", "are", "am", "be", "do", "does", "did", "you", "i",
  "me", "my", "we", "us", "to", "of", "and", "or", "so", "it", "its", "on",
  "in", "at", "for", "with", "any", "have", "has", "had", "can", "could",
  "would", "will", "shall", "please", "tell", "about", "this", "that", "these",
  "those", "here", "there", "your", "yours", "but", "if", "then", "now", "get",
  "got", "give", "want", "know", "say", "said", "more", "some", "go", "going",
  // Question/filler words: kept out of lore-fact matching so generic words
  // ("what", "who"...) that also appear inside fact text never trigger a match.
  // Intent detection runs on raw tokens, so these still classify the question.
  "what", "whats", "who", "whos", "where", "wheres", "when", "why", "how",
  "which", "whom", "whose"
]);

const responderIntentTriggers = {
  reward: ["reward", "rewards", "kit", "kits", "weapon", "weapons", "gear", "buff", "buffs", "boon", "boons", "perk", "perks", "training", "upgrade", "upgrades", "stronger", "obtain", "earn", "find", "unlock", "unlocks", "mount", "tack"],
  quest: ["quest", "task", "job", "work", "help", "need", "mission", "objective", "reward", "again", "errand", "deed"],
  greeting: ["hello", "hi", "hey", "greetings", "morning", "evening", "afternoon", "day", "well", "fare", "luck"],
  self: ["who", "name", "named", "yourself", "role", "stranger", "doing"],
  danger: ["danger", "dangerous", "safe", "safety", "enemy", "enemies", "monster", "monsters", "beast", "beasts", "threat", "careful", "attack", "raider", "raiders", "spider", "spiders", "dragon", "dragons", "wisp", "wisps", "fight", "afraid", "scared"],
  rumor: ["rumor", "rumors", "rumour", "rumours", "news", "heard", "gossip", "story", "stories", "tale", "talk", "happening", "new"],
  place: ["where", "place", "area", "road", "roads", "city", "crownford", "town", "village", "villages", "valley", "desert", "dunes", "siltwell", "cistern", "cisterns", "dungeon", "dungeons", "mountain", "mountains", "swamp", "mistfen", "forest", "woods", "briar", "biome", "lake", "lakes", "way", "around"],
  advice: ["advice", "tip", "tips", "should", "how", "survive", "best", "wise"]
};

function responderTokens(text) {
  return (String(text || "").toLowerCase().match(/[a-z']+/g) || []);
}

function responderKeywords(text) {
  return responderTokens(text).filter(word => word.length > 2 && !responderStopWords.has(word));
}

function responderOverlap(inputKeywords, candidateWords) {
  const pool = new Set(candidateWords);
  let score = 0;
  for (const word of inputKeywords) {
    if (pool.has(word)) {
      score += 1;
    }
  }
  return score;
}

function responderBestFact(inputKeywords, packet) {
  const allowed = new Set((packet && packet.allowedTopics) || []);
  let best = null;
  let bestScore = 0;
  for (const fact of loreBible.facts) {
    const words = responderKeywords(fact.text).concat(fact.tags);
    let score = responderOverlap(inputKeywords, words);
    if (score > 0 && fact.tags.some(tag => allowed.has(tag))) {
      score += 0.5; // prefer facts that fit this NPC's topics on ties
    }
    if (score > bestScore) {
      bestScore = score;
      best = fact;
    }
  }
  return { fact: best, score: bestScore };
}

function responderBestIntent(inputKeywords) {
  let bestIntent = null;
  let bestScore = 0;
  for (const intent of Object.keys(responderIntentTriggers)) {
    const score = responderOverlap(inputKeywords, responderIntentTriggers[intent]);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }
  return { intent: bestIntent, score: bestScore };
}

function responderQuestLine(context, packet) {
  if (context && typeof context.questLine === "string" && context.questLine.trim()) {
    return context.questLine.trim();
  }
  const state = context && context.questState ? context.questState : "generic";
  const authored = packet && packet.questContext ? packet.questContext.authoredLines : null;
  if (authored && typeof authored[state] === "string") {
    return authored[state];
  }
  return fallbackLineFor(state, context && context.npcName ? context.npcName : "");
}

function responderRoleLine(context) {
  const sheet = context && context.npcName ? npcVoiceSheets[context.npcName] : null;
  if (sheet && sheet.role) {
    return sheet.role + ".";
  }
  return null;
}

// Picks an unvalidated candidate line from approved canon for the given input.
function selectCanonResponse(input, context, packet) {
  const inputKeywords = responderKeywords(input);
  const biome = (context && context.biome) || (packet && packet.npc && packet.npc.biome) || "meadow";
  const seed = input;
  const { intent, score: intentScore } = responderBestIntent(responderTokens(input));
  const { fact, score: factScore } = responderBestFact(inputKeywords, packet);
  const hasQuest = !!(context && (context.questLine || (packet && packet.questContext)));

  // 1) Kit / buff / perk / reward questions use authored local opportunity
  // hints, not generic quest prose.
  if (intent === "reward" && intentScore >= 1) {
    return { text: rewardHintForContext(context), matched: "reward" };
  }
  // 2) Direct quest/task question wins when a quest is in play.
  if (intent === "quest" && intentScore >= 1 && hasQuest) {
    return { text: responderQuestLine(context, packet), matched: "quest" };
  }
  // 3) A specific lore noun (spiders, Crownford, roads, dragons...) → public fact.
  if (factScore >= 1) {
    return { text: fact.text, matched: "lore:" + fact.id };
  }
  // 4) Otherwise route by intent into the right approved bark / role line.
  if (intentScore >= 1) {
    if (intent === "greeting") {
      return { text: ambientLineFor({ npcName: context.npcName, biome, mood: "greeting", seed }), matched: "bark:greeting" };
    }
    if (intent === "rumor") {
      return { text: ambientLineFor({ npcName: context.npcName, biome, mood: "rumor", seed }), matched: "bark:rumor" };
    }
    if (intent === "danger" || intent === "advice") {
      return { text: ambientLineFor({ npcName: context.npcName, biome, mood: "warning", seed }), matched: "bark:warning" };
    }
    if (intent === "place") {
      return { text: (packet && packet.world) || loreBible.world, matched: "world" };
    }
    if (intent === "self") {
      const role = responderRoleLine(context);
      if (role) {
        return { text: role, matched: "role" };
      }
    }
    if (intent === "quest" && hasQuest) {
      return { text: responderQuestLine(context, packet), matched: "quest" };
    }
  }
  // 5) Nothing confident: deterministic fallback.
  return { text: null, matched: "fallback" };
}

// Main entry point. Returns a validated, lore-safe response record for a free
// player utterance directed at an NPC. `context`: { npcName, questId,
// questState, biome, questLine }.
export function respondToPlayerInput(input, context = {}) {
  const packet = buildLorePacket({
    npcName: context.npcName,
    questId: context.questId,
    questState: context.questState,
    extraTags: context.extraTags
  });
  const requested = typeof input === "string" ? input.trim() : "";

  let candidate = null;
  let source = "local";
  let matched = "fallback";

  // Optional future generator path: config-gated, inert by default.
  if (assistedDialogueConfig.enableExternalGenerator && externalAssistedGenerator) {
    try {
      const generated = externalAssistedGenerator(requested, packet, context);
      if (typeof generated === "string" && generated.trim()) {
        candidate = generated;
        source = "generator";
        matched = "generator";
      }
    } catch (error) {
      candidate = null; // any failure falls through to the local responder
    }
  }

  if (candidate === null) {
    const local = selectCanonResponse(requested, context, packet);
    candidate = local.text;
    matched = local.matched;
  }

  // Empty/no-match candidates resolve to the deterministic fallback line, which
  // is itself validated for consistency.
  const toValidate = candidate && candidate.trim() ? candidate : packet.fallbackLine;
  const result = validateAssistedLine(toValidate, packet);
  const usedFallback = matched === "fallback" || !candidate || !result.ok;
  const delivered = result.line;

  const record = logAssistedConversation({
    npcName: context.npcName,
    questId: context.questId,
    questState: context.questState,
    requested,
    delivered,
    usedFallback,
    reasons: result.ok ? [] : result.reasons
  });

  return {
    text: delivered,
    usedFallback,
    matched,
    source,
    reasons: record.reasons,
    packetVersion: packet.packetVersion
  };
}

// Suggested intent topics for the dialogue UI. Deterministic, lore-safe labels
// the player can pick instead of typing. Each maps to a natural-language query
// the responder already understands.
export function suggestedTopicsFor(context = {}) {
  const topics = [];
  if (context && (context.questId || context.questLine)) {
    topics.push({ label: "The task", query: "what is the task you need" });
  } else {
    topics.push({ label: "This place", query: "where are we, tell me about this place" });
  }
  topics.push({ label: "Rewards nearby", query: "what kits perks buffs or boons can I find nearby" });
  topics.push({ label: "Dangers", query: "what dangers are nearby, is it safe" });
  topics.push({ label: "Any rumors?", query: "any rumors or news you have heard" });
  return topics.slice(0, 4);
}
