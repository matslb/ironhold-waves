export const TAU = Math.PI * 2;
export const arenaRadius = 25;

export const DUNGEON_RADIUS = 16.5;
export const BELLWATER_DUNGEON_ID = "bellwaterUnderworks";
export const BELLWATER_DUNGEON_NAME = "Bellwater Underworks";
export const BELLWATER_DUNGEON_CLEAR_XP = 80;
export const SILTWELL_DUNGEON_ID = "siltwellCistern";
export const SILTWELL_DUNGEON_NAME = "Siltwell Cistern";
export const SILTWELL_DUNGEON_CLEAR_XP = 90;

export const ROADWARDEN_TACK_ID = "roadwarden_tack";
export const ROADWARDEN_TACK_NAME = "Roadwarden Tack";
export const ROADWARDEN_TACK_QUEST_ID = "roadwardenTack";

export const EXPLORATION_NPC_UPDATE_DISTANCE_SQ = 70 * 70;
export const EXPLORATION_NPC_VISIBLE_DISTANCE_SQ = 145 * 145;
export const EXPLORATION_ITEM_VISIBLE_DISTANCE_SQ = 92 * 92;
export const EXPLORATION_ENEMY_DETAIL_DISTANCE_SQ = 85 * 85;
export const EXPLORATION_ENEMY_SEPARATION_DISTANCE = 46;

// Global tuning knob applied to every enemy's base speed at spawn. Bumping this
// scales chase, patrol, and kiting movement together. 1.0 = original speeds.
export const ENEMY_SPEED_MULTIPLIER = 1.25;

// Slow field recovery: recent damage, active attacks/projectiles, nearby
// enemies, and shared combat activities hold this delay instead of healing.
export const PLAYER_REGEN_DELAY = 7.5;
export const PLAYER_REGEN_RATE = 1.8;
export const PLAYER_REGEN_THREAT_RADIUS = 18;
export const POTION_INVENTORY_CAPACITY = 3;
export const POTION_SLOT_UNLOCK_LEVELS = [2, 5, 8];
// Gatherable valley herbs: personal counted material capped low so the pouch
// stays a light first inventory boundary instead of loot spam.
export const HERB_POUCH_CAP = 9;
// A wizard Healing Draught must sit on the ground this long before a
// full-health player may pocket it, so the caster cannot vacuum a support
// drop back up the moment it lands.
export const WIZARD_DRAUGHT_POCKET_DELAY = 2;

// Host-only Wilds Director: killed enemies schedule timed refills at their seed
// point, applied by a budgeted round-robin tick that stays far from players.
export const WILDS_RESPAWN_DELAY = 240;
export const WILDS_RESPAWN_JITTER = 75;
export const WILDS_TIER_DELAY_MUL = [1.35, 0.95, 0.75];
export const WILDS_CLEARED_ZONE_RADIUS = 42;
export const WILDS_CLEARED_ZONE_BONUS = 75;
export const WILDS_CLEARED_ZONE_MAX_BONUS = 180;
export const WILDS_MIN_PLAYER_DISTANCE = 80;
export const WILDS_ENEMY_CAP = 96;
export const WILDS_AREA_CAP = 10;
export const WILDS_AREA_RADIUS = 48;
export const WILDS_DIRECTOR_INTERVAL = 1.25;
export const WILDS_CHECKS_PER_TICK = 12;
export const WILDS_SPAWNS_PER_TICK = 1;

// Player-count population scaling (T-020): the host scales respawn pacing by
// the number of room members actually playing in the overworld (host + remote
// `playing` members, excluding arena/dungeon participants and queue). All
// knobs are neutral at one player so solo pacing is unchanged.
// Refill waits are multiplied by 1 / (1 + FACTOR * (count - 1)) and re-read
// every director tick, so joins/leaves mid-wait take effect immediately.
export const WILDS_PLAYER_COUNT_MAX = 4;
export const WILDS_PLAYER_REFILL_FACTOR = 0.45;
export const WILDS_PLAYER_SPAWNS_PER_TICK = 1;
export const WILDS_SPAWNS_PER_TICK_MAX = 3;
export const WILDS_PLAYER_AREA_CAP_BONUS = 1;
export const WILDS_AREA_CAP_MAX = 13;

export const QUEST_MAP_UPDATE_INTERVAL = 0.16;
export const MINIMAP_LOGICAL_SIZE = 176;
export const MINIMAP_DPR = 2;

export const AUDIO_MASTER_VOLUME = 1.0;
export const AUDIO_SFX_VOLUME = 1.0;
export const AUDIO_AMBIENCE_VOLUME = 0.22;
export const AUDIO_MUSIC_VOLUME = 0.64;
