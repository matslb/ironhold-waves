import mqtt from "https://cdn.jsdelivr.net/npm/mqtt@5.15.1/dist/mqtt.esm.js";
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import {
  abilityDisplayNames,
  abilityUnlockLevels,
  defaultCombatTuning,
  defaultWeaponByCharacter,
  equipmentDefs,
  perkDefs,
  progressStorageKey,
  xpForLevel
} from "./content/rpg.js";
import {
  AUDIO_AMBIENCE_VOLUME,
  AUDIO_MASTER_VOLUME,
  AUDIO_MUSIC_VOLUME,
  AUDIO_SFX_VOLUME,
  BELLWATER_DUNGEON_CLEAR_XP,
  BELLWATER_DUNGEON_ID,
  BELLWATER_DUNGEON_NAME,
  DUNGEON_RADIUS,
  ENEMY_SPEED_MULTIPLIER,
  EXPLORATION_ENEMY_SEPARATION_DISTANCE,
  EXPLORATION_ITEM_VISIBLE_DISTANCE_SQ,
  EXPLORATION_NPC_UPDATE_DISTANCE_SQ,
  EXPLORATION_NPC_VISIBLE_DISTANCE_SQ,
  MINIMAP_DPR,
  MINIMAP_LOGICAL_SIZE,
  PLAYER_REGEN_DELAY,
  PLAYER_REGEN_RATE,
  PLAYER_REGEN_THREAT_RADIUS,
  POTION_INVENTORY_CAPACITY,
  POTION_SLOT_UNLOCK_LEVELS,
  QUEST_MAP_UPDATE_INTERVAL,
  ROADWARDEN_TACK_ID,
  ROADWARDEN_TACK_NAME,
  ROADWARDEN_TACK_QUEST_ID,
  SILTWELL_DUNGEON_CLEAR_XP,
  SILTWELL_DUNGEON_ID,
  SILTWELL_DUNGEON_NAME,
  TAU,
  WILDS_AREA_CAP,
  WILDS_AREA_RADIUS,
  WILDS_CHECKS_PER_TICK,
  WILDS_CLEARED_ZONE_BONUS,
  WILDS_CLEARED_ZONE_MAX_BONUS,
  WILDS_CLEARED_ZONE_RADIUS,
  WILDS_DIRECTOR_INTERVAL,
  WILDS_ENEMY_CAP,
  WILDS_MIN_PLAYER_DISTANCE,
  WILDS_RESPAWN_DELAY,
  WILDS_RESPAWN_JITTER,
  WILDS_SPAWNS_PER_TICK,
  WILDS_TIER_DELAY_MUL,
  arenaRadius
} from "./config/gameplay.js";
import {
  formatTuningSummary,
  helpClassGuide,
  helpPermanentRewardItems,
  helpSourceLabels
} from "./content/help.js";
import { ambientLineFor, mergeQuestDialogueOptions, respondToPlayerInput, suggestedTopicsFor } from "./content/dialogue.js";
import { clamp, hashString, lerp, lerpAngle, quantizeStep, seededRandom, smoothstep } from "./core/math.js";
import {
  currentExplorationRespawnPosition as currentTownRespawnPosition,
  normalizeRespawnLocal,
  restoreSavedTownRespawnPoint as restoreTownRespawnPoint,
  setExplorationRespawnTown as setTownRespawnPoint,
  villageDisplayName
} from "./systems/townRespawn.js";

(() => {
  "use strict";
  try {

  const root = document.getElementById("game");
  const hud = document.getElementById("hud");
  const overlay = document.getElementById("overlay");
  const overlayCopy = document.getElementById("overlayCopy");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const statusPanel = document.getElementById("statusPanel");
  const classLabel = document.getElementById("classLabel");
  const waveLabel = document.getElementById("waveLabel");
  const healthFill = document.getElementById("healthFill");
  const guardFill = document.getElementById("guardFill");
  const healthText = document.getElementById("healthText");
  const resourceLabel = document.getElementById("resourceLabel");
  const guardText = document.getElementById("guardText");
  const levelText = document.getElementById("levelText");
  const xpReadout = document.getElementById("xpReadout");
  const xpFill = document.getElementById("xpFill");
  const kitReadout = document.getElementById("kitReadout");
  const kitText = document.getElementById("kitText");
  const kitStats = document.getElementById("kitStats");
  const potionInventory = document.getElementById("potionInventory");
  const potionSlots = document.getElementById("potionSlots");
  const buffsPanel = document.getElementById("buffsPanel");
  const buffsList = document.getElementById("buffsList");
  const saveHint = document.getElementById("saveHint");
  const attackIcon = document.getElementById("attackIcon");
  const blockIcon = document.getElementById("blockIcon");
  const potionIcon = document.getElementById("potionIcon");
  const actionDock = document.querySelector(".action-dock");
  const banner = document.getElementById("banner");
  const sessionSelect = document.getElementById("sessionSelect");
  const startSessionButton = document.getElementById("startSessionButton");
  const resumeGameButton = document.getElementById("resumeGameButton");
  const resumeGameSummary = document.getElementById("resumeGameSummary");
  const joinSessionButton = document.getElementById("joinSessionButton");
  const backMenuButton = document.getElementById("backMenuButton");
  const characterSelect = document.getElementById("characterSelect");
  const characterCards = Array.from(document.querySelectorAll("[data-character]"));
  const onlinePanel = document.getElementById("onlinePanel");
  const joinButton = document.getElementById("joinButton");
  const playerNameInput = document.getElementById("playerNameInput");
  const roomCodeCard = document.getElementById("roomCodeCard");
  const roomCodeText = document.getElementById("roomCodeText");
  const roomCodeInput = document.getElementById("roomCodeInput");
  const joinControls = document.getElementById("joinControls");
  const onlineStatus = document.getElementById("onlineStatus");
  const sessionNote = document.getElementById("sessionNote");
  const resumeButton = document.getElementById("resumeButton");
  const helpButton = document.getElementById("helpButton");
  const helpPanel = document.getElementById("helpPanel");
  const helpBody = document.getElementById("helpBody");
  const helpBackButton = document.getElementById("helpBackButton");
  const startCard = document.querySelector(".start-card");
  const closeRoomButton = document.getElementById("closeRoomButton");
  const leaveRoomButton = document.getElementById("leaveRoomButton");
  const roomRoster = document.getElementById("roomRoster");
  const roomRosterList = document.getElementById("roomRosterList");
  const talkPrompt = document.getElementById("talkPrompt");
  const talkKey = document.getElementById("talkKey");
  const talkAction = document.getElementById("talkAction");
  const talkTarget = document.getElementById("talkTarget");
  const questDialog = document.getElementById("questDialog");
  const questDialogTitle = document.getElementById("questDialogTitle");
  const questDialogBody = document.getElementById("questDialogBody");
  const questDialogStatus = document.getElementById("questDialogStatus");
  const questAcceptButton = document.getElementById("questAcceptButton");
  const questClaimButton = document.getElementById("questClaimButton");
  const questServiceButton = document.getElementById("questServiceButton");
  const questCloseButton = document.getElementById("questCloseButton");
  const dialogueTopics = document.getElementById("dialogueTopics");
  const dialogueHint = document.getElementById("dialogueHint");
  const questLog = document.getElementById("questLog");
  const questLogItems = document.getElementById("questLogItems");
  const questMap = document.getElementById("questMap");
  const questMapCtx = questMap.getContext("2d");
  const minimapPanel = document.getElementById("minimapPanel");
  const chatPanel = document.getElementById("chatPanel");
  const chatLog = document.getElementById("chatLog");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const attackTouchButton = document.querySelector("[data-touch-action='attack']");
  const secondaryTouchButton = document.querySelector("[data-touch-action='block']");
  const potionTouchButton = document.querySelector("[data-touch-action='potion']");

  if (!THREE) {
    overlayCopy.textContent = "The 3D renderer could not be loaded.";
    startButton.hidden = true;
    return;
  }

  const tmpVec = new THREE.Vector3();
  const tmpVec2 = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const clock = new THREE.Clock();
  const keys = new Set();
  let progression = null;

  function isLocalTestingHost() {
    const { hostname, protocol } = window.location;
    return protocol === "file:"
      || hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "::1"
      || hostname === "0.0.0.0";
  }

  const LOCAL_GOD_MODE = isLocalTestingHost();

  function localGodModeEnabled() {
    return LOCAL_GOD_MODE;
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  root.appendChild(renderer.domElement);

  const audio = {
    context: null,
    master: null,
    sfx: null,
    ambience: null,
    music: null,
    compressor: null,
    noise: null,
    ambientState: null,
    musicState: null,
    muted: localStorage.getItem("ironhold-audio-muted") === "true",
    lastPlayed: new Map(),
    playerStepDistance: 0,
    playerLastSurface: "grass",
    remoteStepDistance: new Map(),
    musicTargetVolume: AUDIO_MUSIC_VOLUME
  };

  const MUSIC_THEME_DEFAULT_ID = "meadow-wild";
  const MUSIC_THEMES = {
    "homestead": {
      root: 146.83,
      scale: [0, 2, 4, 5, 7, 9, 11, 12],
      patterns: [[0, 2, 4, 2], [0, 3, 4, 5], [4, 5, 4, 2, 0]],
      bass: [0, 4, 3, 4],
      pace: 0.26,
      restMin: 4.2,
      restMax: 7.4,
      leadGain: 0.010,
      bassGain: 0.005
    },
    "meadow-wild": {
      root: 146.83,
      scale: [0, 2, 3, 5, 7, 9, 10, 12],
      patterns: [[0, 2, 4, 5], [2, 4, 3, 1], [4, 5, 7, 5, 3]],
      bass: [0, 0, 4, 3],
      pace: 0.28,
      restMin: 5.0,
      restMax: 8.6,
      leadGain: 0.010,
      bassGain: 0.0048
    },
    "meadow-village-east": {
      root: 164.81,
      scale: [0, 2, 4, 5, 7, 9, 11, 12],
      patterns: [[0, 2, 4, 7], [5, 4, 2, 0], [2, 4, 5, 4, 2]],
      bass: [0, 4, 5, 4],
      pace: 0.22,
      restMin: 3.4,
      restMax: 5.6,
      leadGain: 0.012,
      bassGain: 0.006
    },
    "meadow-village-west": {
      root: 146.83,
      scale: [0, 2, 3, 5, 7, 8, 10, 12],
      patterns: [[4, 3, 0, 2], [0, 2, 5, 3], [7, 5, 3, 2, 0]],
      bass: [0, 3, 5, 3],
      pace: 0.24,
      restMin: 3.8,
      restMax: 6.1,
      leadGain: 0.011,
      bassGain: 0.0055
    },
    "mountain-village": {
      root: 130.81,
      scale: [0, 3, 5, 7, 10, 12, 15, 17],
      patterns: [[0, 3, 4, 7], [7, 4, 3, 0], [3, 4, 7, 9, 7]],
      bass: [0, 0, -2, 0],
      pace: 0.29,
      restMin: 4.0,
      restMax: 6.8,
      leadGain: 0.011,
      bassGain: 0.0065
    },
    "desert-village": {
      root: 146.83,
      scale: [0, 1, 4, 5, 7, 8, 11, 12],
      patterns: [[0, 1, 4, 5], [7, 5, 4, 1], [4, 5, 8, 7, 5]],
      bass: [0, 4, 1, 4],
      pace: 0.25,
      restMin: 3.7,
      restMax: 6.3,
      leadGain: 0.0105,
      bassGain: 0.0052
    },
    "swamp-village": {
      root: 123.47,
      scale: [0, 2, 3, 6, 7, 10, 12, 14],
      patterns: [[0, 2, 3, 6], [3, 2, 0, -1], [6, 3, 2, 0]],
      bass: [0, -1, 0, 3],
      pace: 0.31,
      restMin: 4.8,
      restMax: 8.8,
      leadGain: 0.0095,
      bassGain: 0.0055
    },
    "briar-village": {
      root: 174.61,
      scale: [0, 2, 3, 5, 7, 10, 12, 14],
      patterns: [[0, 3, 5, 3], [2, 5, 7, 5], [7, 5, 3, 2, 0]],
      bass: [0, -2, 3, 2],
      pace: 0.24,
      restMin: 3.6,
      restMax: 6.2,
      leadGain: 0.0105,
      bassGain: 0.0054
    },
    "crownford": {
      root: 196.00,
      scale: [0, 2, 4, 5, 7, 9, 11, 12],
      patterns: [[0, 2, 4, 7], [7, 9, 7, 4], [5, 4, 2, 0, 2]],
      bass: [-7, 0, 4, 5],
      pace: 0.21,
      restMin: 3.0,
      restMax: 5.2,
      leadGain: 0.0125,
      bassGain: 0.006
    },
    "crownring": {
      root: 110.00,
      scale: [0, 2, 3, 5, 7, 8, 10, 12],
      patterns: [[0, 2, 3, 7], [7, 5, 3, 2], [0, 3, 5, 8, 7]],
      dangerPatterns: [[0, 3, 0, 5], [2, 5, 2, 7], [0, 2, 3, 7, 3]],
      bass: [0, 0, -2, 0],
      pace: 0.22,
      dangerPace: 0.17,
      restMin: 2.6,
      restMax: 4.6,
      leadGain: 0.012,
      bassGain: 0.007
    },
    "skirmish": {
      root: 110.00,
      scale: [0, 2, 3, 5, 7, 8, 10, 12],
      patterns: [[0, 3, 2, 5], [0, 2, 5, 7], [3, 2, 0, -2]],
      bass: [0, -2, 0, 3],
      pace: 0.2,
      dangerPace: 0.16,
      restMin: 2.4,
      restMax: 4.2,
      leadGain: 0.011,
      bassGain: 0.0065
    },
    "mountain-wild": {
      root: 130.81,
      scale: [0, 3, 5, 7, 10, 12, 15, 17],
      patterns: [[0, 3, 4], [7, 4, 3, 0], [3, 7, 9, 7]],
      bass: [0, -2, 0],
      pace: 0.32,
      restMin: 5.2,
      restMax: 9.4,
      leadGain: 0.0095,
      bassGain: 0.0052
    },
    "desert-wild": {
      root: 146.83,
      scale: [0, 1, 4, 5, 7, 8, 11, 12],
      patterns: [[0, 1, 4], [5, 4, 1, 0], [4, 7, 5]],
      bass: [0, 1, 0],
      pace: 0.3,
      restMin: 5.0,
      restMax: 9.0,
      leadGain: 0.009,
      bassGain: 0.0048
    },
    "swamp-wild": {
      root: 123.47,
      scale: [0, 2, 3, 6, 7, 10, 12, 14],
      patterns: [[0, 2, 3], [6, 3, 2, 0], [3, 6, 7, 6]],
      bass: [0, -1, 0],
      pace: 0.34,
      restMin: 6.0,
      restMax: 10.0,
      leadGain: 0.0085,
      bassGain: 0.0048
    },
    "briar-wild": {
      root: 174.61,
      scale: [0, 2, 3, 5, 7, 10, 12, 14],
      patterns: [[0, 2, 3], [5, 3, 2, 0], [2, 5, 7, 5]],
      bass: [0, -2, 0],
      pace: 0.33,
      restMin: 5.4,
      restMax: 9.6,
      leadGain: 0.0088,
      bassGain: 0.0048
    }
  };

  function ensureAudio() {
    if (audio.muted) {
      return null;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    if (!audio.context) {
      audio.context = new AudioContextClass();
      audio.master = audio.context.createGain();
      audio.sfx = audio.context.createGain();
      audio.ambience = audio.context.createGain();
      audio.music = audio.context.createGain();
      audio.compressor = audio.context.createDynamicsCompressor();
      audio.compressor.threshold.value = -10;
      audio.compressor.knee.value = 14;
      audio.compressor.ratio.value = 5;
      audio.compressor.attack.value = 0.004;
      audio.compressor.release.value = 0.18;
      audio.master.gain.value = AUDIO_MASTER_VOLUME;
      audio.sfx.gain.value = AUDIO_SFX_VOLUME;
      audio.ambience.gain.value = AUDIO_AMBIENCE_VOLUME;
      audio.music.gain.value = AUDIO_MUSIC_VOLUME;
      audio.sfx.connect(audio.master);
      audio.ambience.connect(audio.master);
      audio.music.connect(audio.master);
      audio.master.connect(audio.compressor);
      audio.compressor.connect(audio.context.destination);
    }
    if (audio.context.state === "suspended") {
      audio.context.resume().catch(() => {});
    }
    startAmbientAudio();
    startMusicAudio();
    return audio.context;
  }

  function unlockAudio() {
    ensureAudio();
  }

  function setAudioMuted(muted) {
    audio.muted = muted;
    localStorage.setItem("ironhold-audio-muted", muted ? "true" : "false");
    if (!muted) {
      ensureAudio();
    }
    if (audio.master) {
      audio.master.gain.setTargetAtTime(muted ? 0 : AUDIO_MASTER_VOLUME, audio.context.currentTime, 0.02);
    }
    showBanner(muted ? "Sound muted" : "Sound on", 1.5);
  }

  function soundRecentlyPlayed(name, interval = 0.04) {
    const ctx = ensureAudio();
    if (!ctx) {
      return true;
    }
    const last = audio.lastPlayed.get(name) || -Infinity;
    if (ctx.currentTime - last < interval) {
      return true;
    }
    audio.lastPlayed.set(name, ctx.currentTime);
    return false;
  }

  function audioBus(bus) {
    if (bus === "ambience") {
      return audio.ambience || audio.master;
    }
    if (bus === "music") {
      return audio.music || audio.master;
    }
    return audio.sfx || audio.master;
  }

  function setMusicPaused(paused) {
    if (!audio.context || !audio.music) {
      return;
    }
    const target = paused ? 0 : AUDIO_MUSIC_VOLUME;
    if (Math.abs(audio.musicTargetVolume - target) < 0.001) {
      return;
    }
    audio.musicTargetVolume = target;
    audio.music.gain.cancelScheduledValues(audio.context.currentTime);
    audio.music.gain.setTargetAtTime(target, audio.context.currentTime, paused ? 0.035 : 0.16);
  }

  function playTone(frequency, duration, options = {}) {
    const ctx = ensureAudio();
    if (!ctx || !audio.master) {
      return;
    }
    const start = ctx.currentTime + (options.delay || 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = options.type || "sine";
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), start + duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, options.gain || 0.07), start + (options.attack || 0.012));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioBus(options.bus));
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  function noiseBuffer(ctx) {
    if (audio.noise) {
      return audio.noise;
    }
    const length = Math.floor(ctx.sampleRate * 0.36);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    audio.noise = buffer;
    return buffer;
  }

  function playNoise(duration, options = {}) {
    const ctx = ensureAudio();
    if (!ctx || !audio.master) {
      return;
    }
    const start = ctx.currentTime + (options.delay || 0);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = noiseBuffer(ctx);
    filter.type = options.filterType || "bandpass";
    filter.frequency.setValueAtTime(options.frequency || 900, start);
    filter.Q.value = options.q || 1.2;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, options.gain || 0.05), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioBus(options.bus));
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  function startAmbientAudio() {
    const ctx = audio.context;
    if (!ctx || audio.ambientState) {
      return;
    }
    audio.ambientState = {
      nextBirdAt: ctx.currentTime + 2 + Math.random() * 5
    };
  }

  function startMusicAudio() {
    const ctx = audio.context;
    if (!ctx || audio.musicState) {
      return;
    }
    audio.musicState = {
      nextNoteAt: ctx.currentTime + 1.8,
      noteIndex: 0,
      phraseIndex: 0,
      themeId: MUSIC_THEME_DEFAULT_ID
    };
  }

  function audioPositionIntensity(position, maxDistance = 42, floor = 0) {
    if (!position) {
      return 1;
    }
    const listener = player.group ? player.group.position : player.position;
    const dx = (position.x || 0) - listener.x;
    const dz = (position.z || 0) - listener.z;
    const distance = Math.hypot(dx, dz);
    if (distance >= maxDistance) {
      return 0;
    }
    const falloff = 1 - smoothstep(maxDistance * 0.18, maxDistance, distance);
    return clamp(falloff, floor, 1);
  }

  function playPositionalSfx(name, position, intensity = 1, maxDistance = 42) {
    const amount = audioPositionIntensity(position, maxDistance) * intensity;
    if (amount < 0.04) {
      return;
    }
    playSfx(name, amount);
  }

  function currentPlayerSurface() {
    if (isPlayerMounted()) {
      return "horse";
    }
    if (localPlayerInSharedActivity() || game.mode !== "exploration") {
      return "sand";
    }
    const local = explorationLocalPosition(player.position, tmpVec);
    const biome = biomeAt(local.x, local.z);
    if (biome === "desert") {
      return "sand";
    }
    if (biome === "mountain") {
      return "stone";
    }
    if (biome === "swamp") {
      return "mud";
    }
    return "grass";
  }

  function playFootstep(surface, intensity = 1, busName = "player") {
    const throttleName = "step-" + busName + "-" + surface;
    if (soundRecentlyPlayed(throttleName, surface === "horse" ? 0.08 : 0.055)) {
      return;
    }
    const amount = clamp(intensity, 0.08, 1.35);
    if (surface === "horse") {
      playNoise(0.07, { filterType: "lowpass", frequency: 420, gain: 0.011 * amount, q: 0.7 });
      playTone(96, 0.055, { type: "triangle", endFrequency: 64, gain: 0.006 * amount, delay: 0.01 });
    } else if (surface === "sand") {
      playNoise(0.09, { filterType: "bandpass", frequency: 940, gain: 0.0065 * amount, q: 0.55 });
    } else if (surface === "stone") {
      playNoise(0.045, { filterType: "highpass", frequency: 1280, gain: 0.0055 * amount, q: 0.8 });
      playTone(185, 0.04, { type: "triangle", endFrequency: 130, gain: 0.0032 * amount });
    } else if (surface === "mud") {
      playNoise(0.1, { filterType: "lowpass", frequency: 360, gain: 0.0075 * amount, q: 0.8 });
    } else {
      playNoise(0.075, { filterType: "bandpass", frequency: 1250, gain: 0.0052 * amount, q: 0.65 });
    }
  }

  function playBirdChirp(biome) {
    const base = biome === "mountain" ? 1760 : biome === "swamp" ? 1240 : biome === "briar" ? 1380 : 1520;
    const variation = 0.88 + Math.random() * 0.28;
    const first = base * variation;
    const second = first * (1.18 + Math.random() * 0.16);
    const third = first * (0.92 + Math.random() * 0.08);
    playTone(first, 0.085, { type: "sine", endFrequency: second, gain: 0.024, attack: 0.006, bus: "ambience" });
    playTone(second, 0.07, { type: "sine", endFrequency: third, gain: 0.018, attack: 0.006, delay: 0.095, bus: "ambience" });
    if (Math.random() < 0.42) {
      playTone(third * 1.12, 0.06, { type: "triangle", endFrequency: third * 0.96, gain: 0.012, attack: 0.005, delay: 0.19, bus: "ambience" });
    }
  }

  function npcVoiceProfile(npc) {
    const biome = npc && npc.biome ? npc.biome : "meadow";
    if (biome === "mountain") {
      return { root: 180, gain: 0.010, pace: 0.052, type: "triangle", degrees: [0, 3, 5, 3, 0] };
    }
    if (biome === "desert") {
      return { root: 260, gain: 0.009, pace: 0.046, type: "square", degrees: [0, 1, 4, 1, 0] };
    }
    if (biome === "swamp") {
      return { root: 150, gain: 0.008, pace: 0.058, type: "triangle", degrees: [0, 2, -1, 2, 0] };
    }
    if (biome === "briar") {
      return { root: 205, gain: 0.0085, pace: 0.052, type: "triangle", degrees: [0, 2, 3, 5, 2] };
    }
    if (biome === "city") {
      return { root: 240, gain: 0.0095, pace: 0.044, type: "square", degrees: [0, 2, 4, 2, 5] };
    }
    return { root: 230, gain: 0.009, pace: 0.048, type: "square", degrees: [0, 2, 4, 2, 0] };
  }

  function npcVoiceNameOffset(name = "") {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
      hash = (hash * 31 + name.charCodeAt(i)) % 997;
    }
    return (hash % 7) - 3;
  }

  function playNpcVoiceLine(npc, text) {
    const cleanText = String(text || "").replace(/\s+/g, " ").trim();
    if (!cleanText) {
      return;
    }
    const ctx = ensureAudio();
    if (!ctx || !audio.master || audio.muted) {
      return;
    }
    const profile = npcVoiceProfile(npc);
    const offset = npcVoiceNameOffset(npc && npc.name);
    const chirps = clamp(Math.ceil(cleanText.length / 13), 3, 13);
    for (let i = 0; i < chirps; i += 1) {
      const char = cleanText[Math.min(cleanText.length - 1, i * 9)] || " ";
      const punctuationPause = /[,.!?]/.test(char) ? 0.055 : 0;
      const degree = profile.degrees[(i + Math.abs(offset)) % profile.degrees.length] + offset;
      const frequency = profile.root * Math.pow(2, degree / 12);
      const delay = i * profile.pace + punctuationPause;
      const gain = profile.gain * (i % 3 === 0 ? 1.08 : 0.9);
      playTone(frequency, 0.035, {
        type: profile.type,
        endFrequency: frequency * (i % 2 === 0 ? 1.035 : 0.965),
        gain,
        attack: 0.003,
        delay
      });
      if (i % 4 === 0) {
        playTone(frequency * 2, 0.022, {
          type: "sine",
          gain: gain * 0.32,
          attack: 0.002,
          delay: delay + 0.006
        });
      }
    }
  }

  function degreeFrequency(theme, degree, octaveShift = 0) {
    const scale = theme.scale || MUSIC_THEMES[MUSIC_THEME_DEFAULT_ID].scale;
    const wrapped = ((degree % scale.length) + scale.length) % scale.length;
    const octave = Math.floor(degree / scale.length) + octaveShift;
    const semitone = scale[wrapped] + octave * 12;
    return theme.root * Math.pow(2, semitone / 12);
  }

  function musicThemeForVillage(village) {
    if (!village) {
      return MUSIC_THEME_DEFAULT_ID;
    }
    if (village.id === "crownford") {
      return "crownford";
    }
    if (village.id === "crownring") {
      return "crownring";
    }
    if (village.biome === "mountain") {
      return "mountain-village";
    }
    if (village.biome === "desert") {
      return "desert-village";
    }
    if (village.biome === "swamp") {
      return "swamp-village";
    }
    if (village.biome === "briar") {
      return "briar-village";
    }
    return village.id === "village-1" ? "meadow-village-west" : "meadow-village-east";
  }

  function wildernessThemeForBiome(biome) {
    if (biome === "mountain") {
      return "mountain-wild";
    }
    if (biome === "desert") {
      return "desert-wild";
    }
    if (biome === "swamp") {
      return "swamp-wild";
    }
    if (biome === "briar") {
      return "briar-wild";
    }
    return MUSIC_THEME_DEFAULT_ID;
  }

  function currentMusicThemeId(biome, inSharedActivity, danger) {
    if (inSharedActivity) {
      return "crownring";
    }
    if (danger) {
      return "skirmish";
    }
    if (game.mode !== "exploration") {
      return "crownring";
    }
    const local = explorationLocalPosition(player.position, tmpVec);
    if (Math.hypot(local.x, local.z) < 32) {
      return "homestead";
    }
    let nearestVillage = null;
    let nearestDistance = Infinity;
    for (const village of game.exploration.villages || []) {
      const dx = player.position.x - village.x;
      const dz = player.position.z - village.z;
      const distance = Math.hypot(dx, dz);
      const influence = village.id === "crownford" || village.id === "crownring" ? 62 : 42;
      if (distance < (village.radius || 20) + influence && distance < nearestDistance) {
        nearestVillage = village;
        nearestDistance = distance;
      }
    }
    return nearestVillage ? musicThemeForVillage(nearestVillage) : wildernessThemeForBiome(biome);
  }

  function playMusicPluck(frequency, options = {}) {
    const gain = options.gain || 0.016;
    const delay = options.delay || 0;
    const duration = options.duration || 0.24;
    playTone(frequency, duration, {
      type: options.type || "square",
      gain: gain * 0.72,
      attack: 0.004,
      delay,
      bus: "music"
    });
    playTone(frequency * 2.01, Math.min(0.09, duration * 0.42), {
      type: "triangle",
      gain: gain * 0.24,
      attack: 0.004,
      delay: delay + 0.012,
      bus: "music"
    });
  }

  function playMusicBassTick(frequency, delay, gain) {
    playTone(frequency, 0.12, {
      type: "triangle",
      endFrequency: frequency * 0.92,
      gain,
      attack: 0.004,
      delay,
      bus: "music"
    });
  }

  function playMusicPhrase(themeId, danger, music) {
    const theme = MUSIC_THEMES[themeId] || MUSIC_THEMES[MUSIC_THEME_DEFAULT_ID];
    const patterns = danger && theme.dangerPatterns ? theme.dangerPatterns : theme.patterns;
    const pattern = patterns[music.phraseIndex % patterns.length];
    const shiftPattern = danger ? [0, 0, 2, 0] : [0, 2, 0, -1];
    const phraseShift = shiftPattern[music.noteIndex % shiftPattern.length];
    const pace = danger ? (theme.dangerPace || Math.max(0.15, theme.pace * 0.75)) : theme.pace;
    const leadGain = theme.leadGain * (danger ? 1.18 : 1);
    const bassPattern = theme.bass || [0];
    for (let i = 0; i < pattern.length; i += 1) {
      const delay = i * pace;
      const degree = pattern[i];
      if (i % 2 === 0) {
        const bassDegree = bassPattern[(music.phraseIndex + i / 2) % bassPattern.length];
        if (bassDegree !== null && bassDegree !== undefined) {
          playMusicBassTick(degreeFrequency(theme, bassDegree, -1), delay, theme.bassGain * (danger ? 1.25 : 1));
        }
      }
      if (degree === null || degree === undefined) {
        continue;
      }
      playMusicPluck(degreeFrequency(theme, degree + phraseShift), {
        delay,
        duration: danger ? 0.16 : 0.2,
        gain: leadGain * (i === 0 ? 1.12 : 1)
      });
    }
    music.noteIndex += 1;
    music.phraseIndex += 1;
  }

  function updateAmbienceAndMusic(dt) {
    const ctx = ensureAudio();
    if (!ctx || !audio.ambientState || !audio.musicState) {
      return;
    }
    const active = game.state === "playing";
    setMusicPaused(!active);
    if (!active) {
      audio.musicState.nextNoteAt = ctx.currentTime + 0.45;
      return;
    }
    const inSharedActivity = localPlayerInSharedActivity() || (game.mode !== "exploration" && active);
    let biome = "meadow";
    if (game.mode === "exploration") {
      const local = explorationLocalPosition(player.position, tmpVec);
      biome = biomeAt(local.x, local.z);
    }
    if (active && game.mode === "exploration" && !inSharedActivity && ctx.currentTime >= audio.ambientState.nextBirdAt) {
      if (biome !== "desert" && Math.random() < (biome === "swamp" ? 0.38 : 0.72)) {
        playBirdChirp(biome);
      }
      audio.ambientState.nextBirdAt = ctx.currentTime + (biome === "swamp" ? 9 : 6) + Math.random() * 10;
    }

    const music = audio.musicState;
    const danger = inSharedActivity || game.enemies.some(enemy => !enemy.dead && enemy.position.distanceTo(player.position) < 18);
    const themeId = currentMusicThemeId(biome, inSharedActivity, danger);
    if (music.themeId !== themeId) {
      music.themeId = themeId;
      music.noteIndex = 0;
      music.phraseIndex = 0;
      music.nextNoteAt = ctx.currentTime + 0.18;
    }
    if (ctx.currentTime >= music.nextNoteAt) {
      const theme = MUSIC_THEMES[themeId] || MUSIC_THEMES[MUSIC_THEME_DEFAULT_ID];
      playMusicPhrase(themeId, danger, music);
      const restMin = theme.restMin || 4.5;
      const restMax = Math.max(restMin, theme.restMax || restMin + 2);
      music.nextNoteAt = ctx.currentTime + restMin + Math.random() * (restMax - restMin);
    }
  }

  function updatePlayerMovementAudio(dt) {
    if (game.state !== "playing" || !questDialog.hidden) {
      audio.playerStepDistance = 0;
      return;
    }
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    if (speed < 0.55) {
      audio.playerStepDistance = Math.min(audio.playerStepDistance, 0.45);
      return;
    }
    const surface = currentPlayerSurface();
    audio.playerLastSurface = surface;
    const stride = surface === "horse" ? 1.7 : surface === "mud" ? 0.95 : 1.08;
    audio.playerStepDistance += speed * dt;
    if (audio.playerStepDistance >= stride) {
      audio.playerStepDistance %= stride;
      playFootstep(surface, clamp(speed / (surface === "horse" ? 9.4 : 5.8), 0.45, 1.2), "player");
    }
  }

  function enemySurface(enemy) {
    if (enemy.type === "dragon" || enemy.type === "wisp") {
      return "";
    }
    if (localPlayerInSharedActivity() || game.mode !== "exploration") {
      return "sand";
    }
    const local = explorationLocalPosition(enemy.position, tmpVec);
    const biome = biomeAt(local.x, local.z);
    if (biome === "desert") {
      return "sand";
    }
    if (biome === "mountain") {
      return "stone";
    }
    if (biome === "swamp") {
      return "mud";
    }
    return "grass";
  }

  function updateEnemyMovementAudio(enemy, dt) {
    if (!enemy || enemy.dead || enemy.state === "attack" || enemy.state === "lunge" || enemy.state === "pulse") {
      return;
    }
    if (enemy.type === "dragon") {
      const distanceGain = audioPositionIntensity(enemy.group ? enemy.group.position : enemy.position, 58);
      if (distanceGain > 0.05) {
        enemy.audioFlapTimer = (enemy.audioFlapTimer || Math.random() * 0.25) - dt;
        if (enemy.audioFlapTimer <= 0) {
          enemy.audioFlapTimer = enemy.state === "fire" ? 0.28 : 0.42 + Math.random() * 0.18;
          playPositionalSfx("dragonFlap", enemy.group ? enemy.group.position : enemy.position, 0.45 + distanceGain * 0.55, 58);
        }
      }
      return;
    }
    if (enemy.type === "wisp") {
      enemy.audioHumTimer = (enemy.audioHumTimer || 0.8 + Math.random() * 1.2) - dt;
      if (enemy.audioHumTimer <= 0) {
        enemy.audioHumTimer = 1.2 + Math.random() * 1.8;
        playPositionalSfx("wispHum", enemy.position, 0.58, 26);
      }
      return;
    }
    const speed = Math.hypot(enemy.velocity.x, enemy.velocity.z);
    if (speed < 0.45 || audioPositionIntensity(enemy.position, 30) <= 0) {
      return;
    }
    const surface = enemySurface(enemy);
    const stride = enemy.type === "spider" ? 0.72 : enemy.type === "briarBeast" ? 0.84 : surface === "mud" ? 0.95 : 1.08;
    enemy.audioStepDistance = (enemy.audioStepDistance || Math.random() * stride) + speed * dt;
    if (enemy.audioStepDistance >= stride) {
      enemy.audioStepDistance %= stride;
      playPositionalSfx(enemy.type === "spider" ? "spiderStep" : "enemyFoot", enemy.position, clamp(speed / 4.8, 0.35, 1.0), 30);
    }
  }

  function remotePlayerSurface(remote) {
    if (remote.mounted) {
      return "horse";
    }
    if (localPlayerInSharedActivity() || game.mode !== "exploration") {
      return "sand";
    }
    const local = explorationLocalPosition(remote.group.position, tmpVec);
    const biome = biomeAt(local.x, local.z);
    if (biome === "desert") {
      return "sand";
    }
    if (biome === "mountain") {
      return "stone";
    }
    if (biome === "swamp") {
      return "mud";
    }
    return "grass";
  }

  function updateRemoteMovementAudio(remote, id, speed, dt) {
    const distanceGain = remote ? audioPositionIntensity(remote.group.position, 34) : 0;
    if (!remote || !remote.playing || speed < 0.45 || distanceGain <= 0) {
      audio.remoteStepDistance.set(id, 0);
      return;
    }
    const surface = remotePlayerSurface(remote);
    const stride = surface === "horse" ? 1.75 : surface === "mud" ? 1.0 : 1.13;
    const current = (audio.remoteStepDistance.get(id) || 0) + speed * dt;
    if (current >= stride) {
      audio.remoteStepDistance.set(id, current % stride);
      playFootstep(surface, clamp(speed / (surface === "horse" ? 9.4 : 5.8), 0.32, 0.78) * distanceGain, "remote-" + id);
      return;
    }
    audio.remoteStepDistance.set(id, current);
  }

  function playEnemyStateSound(enemy, previousState, previousAttackType) {
    if (!enemy || enemy.dead || previousState === enemy.state && previousAttackType === enemy.attackType) {
      return;
    }
    const position = enemy.group ? enemy.group.position : enemy.position;
    if (enemy.type === "dragon" && previousState !== "fire" && enemy.state === "fire") {
      playPositionalSfx("dragonRoar", position, 1.0, 72);
    } else if (enemy.type === "spider" && previousState !== "lunge" && enemy.state === "lunge") {
      playPositionalSfx("spiderLunge", position, 0.95, 38);
    } else if (enemy.type === "wisp" && previousState !== "pulse" && enemy.state === "pulse") {
      playPositionalSfx("wispPulse", position, 0.9, 42);
    } else if (enemy.type === "wisp" && previousState !== "hex" && enemy.state === "hex") {
      playPositionalSfx("wispPulse", position, 0.8, 44);
    } else if (enemy.type === "banditArcher" && previousState !== "draw" && enemy.state === "draw") {
      playPositionalSfx("arrow", position, 0.6, 42);
    } else if (enemy.type === "sandViper" && previousState !== "spit" && enemy.state === "spit") {
      playPositionalSfx("spiderLunge", position, 0.7, 40);
    } else if ((enemy.type === "barbarian" || enemy.type === "briarBeast" || enemy.type === "bonewarden" || enemy.type === "bogLurker") && enemy.state === "attack" && (previousState !== "attack" || previousAttackType !== enemy.attackType)) {
      playPositionalSfx(enemy.attackType === "heavy" ? "barbarianHeavy" : "barbarianAttack", position, 0.9, 36);
    }
  }

  function updateAudio(dt) {
    if (!audio.context || audio.muted) {
      return;
    }
    updateAmbienceAndMusic(dt);
    updatePlayerMovementAudio(dt);
  }

  function playSfx(name, intensity = 1) {
    const amount = clamp(intensity, 0.05, 1.8);
    if (soundRecentlyPlayed(name, name === "enemyHit" ? 0.055 : name === "hit" ? 0.08 : 0.035)) {
      return;
    }
    if (name === "slash") {
      playNoise(0.14, { frequency: 1450, gain: 0.035 * amount, q: 0.7 });
      playTone(220, 0.08, { type: "triangle", endFrequency: 95, gain: 0.035 * amount, delay: 0.035 });
    } else if (name === "lightning") {
      playTone(760, 0.16, { type: "sawtooth", endFrequency: 1260, gain: 0.045 * amount });
      playTone(1880, 0.08, { type: "square", endFrequency: 520, gain: 0.02 * amount, delay: 0.035 });
    } else if (name === "burst") {
      playTone(170, 0.22, { type: "sine", endFrequency: 92, gain: 0.07 * amount });
      playNoise(0.18, { frequency: 620, gain: 0.035 * amount, q: 0.9 });
    } else if (name === "bash") {
      playNoise(0.13, { filterType: "lowpass", frequency: 520, gain: 0.07 * amount });
      playTone(94, 0.13, { type: "triangle", endFrequency: 58, gain: 0.065 * amount });
    } else if (name === "enemyHit") {
      playNoise(0.1, { frequency: 850, gain: 0.04 * amount });
      playTone(180, 0.08, { type: "triangle", endFrequency: 118, gain: 0.035 * amount });
    } else if (name === "hit") {
      playNoise(0.12, { frequency: 650, gain: 0.052 * amount });
      playTone(122, 0.13, { type: "sawtooth", endFrequency: 72, gain: 0.035 * amount });
    } else if (name === "block") {
      playTone(520, 0.12, { type: "square", endFrequency: 330, gain: 0.045 * amount });
      playTone(910, 0.09, { type: "triangle", endFrequency: 420, gain: 0.025 * amount, delay: 0.02 });
    } else if (name === "potion") {
      playTone(420, 0.1, { type: "sine", endFrequency: 640, gain: 0.04 * amount });
      playTone(700, 0.14, { type: "sine", endFrequency: 980, gain: 0.035 * amount, delay: 0.07 });
    } else if (name === "quest") {
      playTone(520, 0.1, { type: "triangle", gain: 0.04 * amount });
      playTone(780, 0.12, { type: "triangle", gain: 0.035 * amount, delay: 0.08 });
    } else if (name === "level") {
      playTone(392, 0.12, { type: "triangle", gain: 0.045 * amount });
      playTone(523, 0.14, { type: "triangle", gain: 0.04 * amount, delay: 0.1 });
      playTone(784, 0.2, { type: "triangle", gain: 0.04 * amount, delay: 0.22 });
    } else if (name === "ui") {
      playTone(360, 0.055, { type: "triangle", endFrequency: 460, gain: 0.025 * amount });
    } else if (name === "arrow") {
      playNoise(0.08, { frequency: 2400, gain: 0.03 * amount, q: 0.5 });
      playTone(320, 0.1, { type: "triangle", endFrequency: 130, gain: 0.03 * amount, delay: 0.015 });
    } else if (name === "flamingArrow") {
      playNoise(0.08, { frequency: 2400, gain: 0.026 * amount, q: 0.55 });
      playTone(320, 0.1, { type: "triangle", endFrequency: 130, gain: 0.026 * amount, delay: 0.012 });
      playNoise(0.17, { frequency: 1080, gain: 0.024 * amount, q: 0.9, delay: 0.02 });
      playTone(480, 0.08, { type: "triangle", endFrequency: 760, gain: 0.012 * amount, delay: 0.035 });
    } else if (name === "flamingArrowImpact") {
      playNoise(0.1, { filterType: "lowpass", frequency: 640, gain: 0.032 * amount, q: 0.7 });
      playNoise(0.055, { frequency: 2800, gain: 0.018 * amount, q: 1.1, delay: 0.015 });
      playTone(150, 0.075, { type: "triangle", endFrequency: 90, gain: 0.018 * amount });
    } else if (name === "pierce") {
      playNoise(0.12, { frequency: 1900, gain: 0.04 * amount, q: 0.6 });
      playTone(210, 0.18, { type: "sawtooth", endFrequency: 95, gain: 0.04 * amount, delay: 0.02 });
    } else if (name === "roll") {
      playNoise(0.16, { filterType: "lowpass", frequency: 460, gain: 0.045 * amount });
      playTone(140, 0.12, { type: "sine", endFrequency: 90, gain: 0.03 * amount });
    } else if (name === "uiMove") {
      playTone(330, 0.04, { type: "triangle", endFrequency: 385, gain: 0.018 * amount });
    } else if (name === "uiBack") {
      playTone(420, 0.07, { type: "triangle", endFrequency: 250, gain: 0.024 * amount });
    } else if (name === "arenaStart") {
      playTone(262, 0.16, { type: "sawtooth", gain: 0.028 * amount });
      playTone(392, 0.18, { type: "sawtooth", gain: 0.03 * amount, delay: 0.12 });
      playTone(523, 0.3, { type: "triangle", gain: 0.045 * amount, delay: 0.26 });
      playNoise(0.5, { frequency: 320, gain: 0.018 * amount, q: 0.6 });
    } else if (name === "waveStart") {
      playTone(98, 0.18, { type: "triangle", endFrequency: 62, gain: 0.06 * amount });
      playNoise(0.16, { filterType: "lowpass", frequency: 420, gain: 0.04 * amount });
    } else if (name === "waveClear") {
      playTone(587, 0.1, { type: "triangle", gain: 0.04 * amount });
      playTone(880, 0.16, { type: "triangle", gain: 0.038 * amount, delay: 0.09 });
    } else if (name === "arenaMilestone") {
      playTone(523, 0.12, { type: "triangle", gain: 0.045 * amount });
      playTone(659, 0.12, { type: "triangle", gain: 0.042 * amount, delay: 0.11 });
      playTone(784, 0.14, { type: "triangle", gain: 0.04 * amount, delay: 0.22 });
      playTone(1047, 0.24, { type: "triangle", gain: 0.045 * amount, delay: 0.34 });
    } else if (name === "arenaYield") {
      playTone(392, 0.14, { type: "triangle", endFrequency: 294, gain: 0.035 * amount });
      playTone(262, 0.2, { type: "triangle", endFrequency: 196, gain: 0.03 * amount, delay: 0.12 });
    } else if (name === "arenaDefeat") {
      playTone(220, 0.32, { type: "sawtooth", endFrequency: 88, gain: 0.042 * amount });
      playNoise(0.3, { filterType: "lowpass", frequency: 300, gain: 0.048 * amount, delay: 0.05 });
    } else if (name === "enemyFoot") {
      playNoise(0.075, { filterType: "lowpass", frequency: 560, gain: 0.0055 * amount, q: 0.7 });
      playTone(110, 0.045, { type: "triangle", endFrequency: 82, gain: 0.0025 * amount });
    } else if (name === "spiderStep") {
      playNoise(0.045, { filterType: "bandpass", frequency: 1850, gain: 0.0048 * amount, q: 1.35 });
      playTone(155, 0.035, { type: "square", endFrequency: 118, gain: 0.0016 * amount });
    } else if (name === "dragonFlap") {
      playNoise(0.18, { filterType: "lowpass", frequency: 330, gain: 0.04 * amount, q: 0.55 });
      playTone(74, 0.12, { type: "triangle", endFrequency: 52, gain: 0.018 * amount });
    } else if (name === "dragonRoar") {
      playTone(92, 0.46, { type: "sawtooth", endFrequency: 54, gain: 0.052 * amount, attack: 0.035 });
      playNoise(0.5, { filterType: "lowpass", frequency: 420, gain: 0.048 * amount, q: 0.6, delay: 0.03 });
    } else if (name === "dragonFire") {
      playNoise(0.28, { filterType: "bandpass", frequency: 780, gain: 0.055 * amount, q: 0.8 });
      playTone(138, 0.22, { type: "sawtooth", endFrequency: 220, gain: 0.028 * amount });
    } else if (name === "fireballImpact") {
      playNoise(0.2, { filterType: "lowpass", frequency: 520, gain: 0.058 * amount, q: 0.7 });
      playTone(116, 0.16, { type: "triangle", endFrequency: 64, gain: 0.042 * amount });
    } else if (name === "barbarianAttack") {
      playTone(150, 0.16, { type: "sawtooth", endFrequency: 102, gain: 0.036 * amount, attack: 0.018 });
      playNoise(0.1, { filterType: "bandpass", frequency: 760, gain: 0.025 * amount, q: 0.8, delay: 0.03 });
    } else if (name === "barbarianHeavy") {
      playTone(112, 0.3, { type: "sawtooth", endFrequency: 64, gain: 0.048 * amount, attack: 0.025 });
      playNoise(0.16, { filterType: "lowpass", frequency: 420, gain: 0.04 * amount, q: 0.72, delay: 0.08 });
    } else if (name === "spiderLunge") {
      playNoise(0.16, { filterType: "bandpass", frequency: 2100, gain: 0.038 * amount, q: 1.4 });
      playTone(190, 0.09, { type: "square", endFrequency: 122, gain: 0.016 * amount });
    } else if (name === "wispPulse") {
      playTone(520, 0.18, { type: "sine", endFrequency: 860, gain: 0.034 * amount, attack: 0.04 });
      playTone(1040, 0.16, { type: "triangle", endFrequency: 620, gain: 0.018 * amount, delay: 0.05 });
    } else if (name === "wispHum") {
      playTone(392, 0.38, { type: "sine", endFrequency: 415, gain: 0.014 * amount, attack: 0.08 });
      playTone(784, 0.22, { type: "sine", endFrequency: 740, gain: 0.008 * amount, delay: 0.04 });
    } else if (name === "remoteImpact") {
      playNoise(0.12, { filterType: "bandpass", frequency: 720, gain: 0.032 * amount, q: 0.7 });
      playTone(165, 0.08, { type: "triangle", endFrequency: 92, gain: 0.022 * amount });
    }
  }

  function createMaterialDetailTexture(seed, style, repeatX = 1, repeatY = 1) {
    const random = seededRandom("material-" + seed + "-" + style);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4efe2";
    ctx.fillRect(0, 0, 256, 256);

    if (style === "stone") {
      ctx.fillStyle = "#e9e4d6";
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = "rgba(62, 66, 62, 0.24)";
      ctx.lineWidth = 3;
      for (let y = 0; y <= 256; y += 42) {
        ctx.beginPath();
        ctx.moveTo(0, y + (random() - 0.5) * 5);
        ctx.lineTo(256, y + (random() - 0.5) * 5);
        ctx.stroke();
      }
      for (let row = 0; row < 7; row += 1) {
        const offset = row % 2 ? 32 : 0;
        for (let x = offset; x <= 256; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x + (random() - 0.5) * 6, row * 42);
          ctx.lineTo(x + (random() - 0.5) * 6, row * 42 + 42);
          ctx.stroke();
        }
      }
      for (let i = 0; i < 90; i += 1) {
        ctx.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.16)" : "rgba(45,48,45,0.12)";
        ctx.fillRect(random() * 256, random() * 256, 2 + random() * 8, 1 + random() * 4);
      }
    } else if (style === "roof") {
      ctx.fillStyle = "#efe7d4";
      ctx.fillRect(0, 0, 256, 256);
      for (let y = 4; y < 256; y += 22) {
        ctx.fillStyle = y % 44 ? "rgba(70, 32, 30, 0.22)" : "rgba(255, 218, 176, 0.12)";
        ctx.fillRect(0, y, 256, 4);
        for (let x = y % 44 ? 0 : 18; x < 256; x += 36) {
          ctx.fillRect(x, y, 3, 20);
        }
      }
      for (let i = 0; i < 120; i += 1) {
        ctx.fillStyle = random() > 0.55 ? "rgba(255,255,255,0.1)" : "rgba(55,16,20,0.14)";
        ctx.fillRect(random() * 256, random() * 256, 5 + random() * 15, 1 + random() * 3);
      }
    } else if (style === "wood") {
      ctx.fillStyle = "#f2e4c8";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 42; i += 1) {
        const x = random() * 256;
        ctx.strokeStyle = random() > 0.45 ? "rgba(83, 52, 30, 0.22)" : "rgba(255, 232, 181, 0.15)";
        ctx.lineWidth = 1 + random() * 3;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + random() * 24 - 12, 72, x + random() * 30 - 15, 160, x + random() * 20 - 10, 256);
        ctx.stroke();
      }
      for (let i = 0; i < 18; i += 1) {
        ctx.strokeStyle = "rgba(70, 43, 24, 0.24)";
        ctx.lineWidth = 1;
        const y = random() * 256;
        ctx.beginPath();
        ctx.ellipse(random() * 256, y, 8 + random() * 18, 2 + random() * 5, random() * Math.PI, 0, TAU);
        ctx.stroke();
      }
    } else if (style === "cloth") {
      ctx.fillStyle = "#f3ece4";
      ctx.fillRect(0, 0, 256, 256);
      for (let line = 0; line < 256; line += 8) {
        ctx.fillStyle = line % 16 ? "rgba(255,255,255,0.13)" : "rgba(42,30,34,0.16)";
        ctx.fillRect(0, line, 256, 1);
        ctx.fillRect(line, 0, 1, 256);
      }
      for (let i = 0; i < 55; i += 1) {
        ctx.fillStyle = "rgba(35,24,28,0.08)";
        ctx.fillRect(random() * 256, random() * 256, 2 + random() * 8, 1 + random() * 4);
      }
    } else if (style === "sand") {
      ctx.fillStyle = "#f2dfb5";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 24; i += 1) {
        ctx.strokeStyle = random() > 0.45 ? "rgba(156, 112, 55, 0.18)" : "rgba(255, 239, 184, 0.18)";
        ctx.lineWidth = 2 + random() * 3;
        const y = random() * 256;
        ctx.beginPath();
        ctx.moveTo(-10, y);
        ctx.bezierCurveTo(70, y - 16 + random() * 32, 170, y - 18 + random() * 36, 266, y + random() * 22 - 11);
        ctx.stroke();
      }
      for (let i = 0; i < 500; i += 1) {
        ctx.fillStyle = random() > 0.5 ? "rgba(133,91,46,0.12)" : "rgba(255,255,255,0.12)";
        ctx.fillRect(random() * 256, random() * 256, 1.2, 1.2);
      }
    } else if (style === "path") {
      ctx.fillStyle = "#ead6aa";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 28; i += 1) {
        ctx.strokeStyle = random() > 0.5 ? "rgba(98, 70, 42, 0.2)" : "rgba(255, 229, 169, 0.16)";
        ctx.lineWidth = 3 + random() * 5;
        ctx.beginPath();
        const y = random() * 256;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(64, y - 18 + random() * 36, 168, y - 20 + random() * 40, 256, y + random() * 24 - 12);
        ctx.stroke();
      }
      for (let i = 0; i < 320; i += 1) {
        ctx.fillStyle = "rgba(71, 51, 30, 0.14)";
        ctx.beginPath();
        ctx.arc(random() * 256, random() * 256, 0.7 + random() * 1.8, 0, TAU);
        ctx.fill();
      }
    } else if (style === "plaster") {
      ctx.fillStyle = "#f6efd8";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 700; i += 1) {
        ctx.fillStyle = random() > 0.6 ? "rgba(255,255,255,0.14)" : "rgba(122,101,71,0.1)";
        ctx.beginPath();
        ctx.arc(random() * 256, random() * 256, 0.7 + random() * 3.2, 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i < 12; i += 1) {
        ctx.strokeStyle = "rgba(84, 69, 50, 0.16)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        const x = random() * 256;
        const y = random() * 256;
        ctx.moveTo(x, y);
        ctx.lineTo(x + random() * 34 - 17, y + 9 + random() * 22);
        ctx.lineTo(x + random() * 42 - 21, y + 24 + random() * 28);
        ctx.stroke();
      }
    } else if (style === "thatch") {
      ctx.fillStyle = "#efe2b5";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 150; i += 1) {
        ctx.strokeStyle = random() > 0.48 ? "rgba(94, 74, 37, 0.22)" : "rgba(255, 241, 175, 0.18)";
        ctx.lineWidth = 1 + random() * 2;
        const x = random() * 256;
        const y = random() * 256;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 12 + random() * 24, y + 8 + random() * 20);
        ctx.stroke();
      }
    } else if (style === "leather") {
      ctx.fillStyle = "#efe6d8";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 900; i += 1) {
        ctx.fillStyle = random() > 0.5 ? "rgba(82, 56, 32, 0.1)" : "rgba(255, 244, 222, 0.1)";
        ctx.beginPath();
        ctx.arc(random() * 256, random() * 256, 0.6 + random() * 2.2, 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i < 9; i += 1) {
        ctx.strokeStyle = "rgba(64, 42, 24, 0.2)";
        ctx.lineWidth = 1.4;
        const y = 14 + random() * 228;
        ctx.setLineDash([5, 6]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y + random() * 14 - 7);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (let i = 0; i < 16; i += 1) {
        ctx.strokeStyle = "rgba(70, 47, 26, 0.14)";
        ctx.lineWidth = 1;
        const x = random() * 256;
        const y = random() * 256;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + random() * 40 - 20, y + random() * 40 - 20);
        ctx.stroke();
      }
    } else if (style === "metal") {
      ctx.fillStyle = "#f1f3f2";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 120; i += 1) {
        ctx.strokeStyle = random() > 0.5 ? "rgba(255,255,255,0.16)" : "rgba(96, 108, 108, 0.12)";
        ctx.lineWidth = 0.8 + random() * 1.6;
        const y = random() * 256;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y + random() * 6 - 3);
        ctx.stroke();
      }
      for (let i = 0; i < 26; i += 1) {
        ctx.fillStyle = "rgba(74, 84, 84, 0.16)";
        ctx.beginPath();
        ctx.arc(random() * 256, random() * 256, 1 + random() * 1.6, 0, TAU);
        ctx.fill();
      }
    } else if (style === "hide") {
      ctx.fillStyle = "#ecdcc2";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 30; i += 1) {
        ctx.fillStyle = random() > 0.5 ? "rgba(118, 78, 44, 0.08)" : "rgba(64, 40, 24, 0.07)";
        ctx.beginPath();
        ctx.ellipse(random() * 256, random() * 256, 12 + random() * 24, 8 + random() * 15, random() * Math.PI, 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i < 760; i += 1) {
        ctx.strokeStyle = random() > 0.5 ? "rgba(92, 58, 32, 0.1)" : "rgba(255, 240, 212, 0.1)";
        ctx.lineWidth = 0.9;
        const x = random() * 256;
        const y = random() * 256;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 4 + random() * 7, y + (random() - 0.5) * 3.4);
        ctx.stroke();
      }
    } else if (style === "scales") {
      ctx.fillStyle = "#e7ebe2";
      ctx.fillRect(0, 0, 256, 256);
      const scaleSize = 22;
      for (let row = 0; row < 14; row += 1) {
        const offset = row % 2 ? scaleSize / 2 : 0;
        for (let x = -scaleSize; x <= 256 + scaleSize; x += scaleSize) {
          ctx.strokeStyle = "rgba(36, 58, 52, 0.26)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x + offset, row * (scaleSize * 0.78), scaleSize * 0.55, 0.15, Math.PI - 0.15);
          ctx.stroke();
          if (random() > 0.62) {
            ctx.fillStyle = random() > 0.5 ? "rgba(255, 255, 255, 0.08)" : "rgba(30, 52, 48, 0.08)";
            ctx.beginPath();
            ctx.arc(x + offset, row * (scaleSize * 0.78) - scaleSize * 0.2, scaleSize * 0.34, 0, TAU);
            ctx.fill();
          }
        }
      }
    } else if (style === "skin") {
      ctx.fillStyle = "#f0ddc8";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 16; i += 1) {
        ctx.fillStyle = random() > 0.5 ? "rgba(150, 92, 58, 0.05)" : "rgba(255, 242, 224, 0.07)";
        ctx.beginPath();
        ctx.arc(random() * 256, random() * 256, 7 + random() * 16, 0, TAU);
        ctx.fill();
      }
      for (let i = 0; i < 520; i += 1) {
        ctx.fillStyle = random() > 0.5 ? "rgba(148, 94, 60, 0.07)" : "rgba(255, 240, 222, 0.08)";
        ctx.beginPath();
        ctx.arc(random() * 256, random() * 256, 0.5 + random() * 1.8, 0, TAU);
        ctx.fill();
      }
    } else if (style === "linen") {
      ctx.fillStyle = "#efe6d2";
      ctx.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 5) {
        ctx.fillStyle = y % 10 ? "rgba(255,255,255,0.1)" : "rgba(70,58,44,0.13)";
        ctx.fillRect(0, y, 256, 2);
      }
      for (let x = 0; x < 256; x += 5) {
        ctx.fillStyle = x % 10 ? "rgba(255,255,255,0.06)" : "rgba(70,58,44,0.09)";
        ctx.fillRect(x, 0, 2, 256);
      }
      for (let i = 0; i < 70; i += 1) {
        ctx.fillStyle = "rgba(58,47,35,0.07)";
        ctx.fillRect(random() * 256, random() * 256, 2 + random() * 6, 1 + random() * 3);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1);
    return texture;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x82bee8);
  scene.fog = new THREE.FogExp2(0x9ac7e8, 0.018);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 520);
  camera.position.set(0, 6, 10);

  const materials = {
    grass: new THREE.MeshStandardMaterial({ color: 0x394736, roughness: 0.92 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x6a5740, map: createMaterialDetailTexture("dirt", "path", 2, 2), roughness: 0.98 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x646865, map: createMaterialDetailTexture("field-stone", "stone", 1.4, 1.4), roughness: 0.88, metalness: 0.02 }),
    darkStone: new THREE.MeshStandardMaterial({ color: 0x3e4544, map: createMaterialDetailTexture("dark-stone", "stone", 1.25, 1.25), roughness: 0.94 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xbfc8c5, map: createMaterialDetailTexture("brushed-steel", "metal", 1.2, 1.2), metalness: 0.82, roughness: 0.34 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x727d7d, map: createMaterialDetailTexture("worn-iron", "metal", 1.1, 1.1), metalness: 0.7, roughness: 0.44 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd5aa50, metalness: 0.55, roughness: 0.42 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xd9cfb1, roughness: 0.7 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2d5f78, map: createMaterialDetailTexture("blue-cloth", "cloth", 1.2, 1.2), roughness: 0.68 }),
    royalBlue: new THREE.MeshStandardMaterial({ color: 0x173f5c, roughness: 0.72 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x8d3430, map: createMaterialDetailTexture("red-cloth", "cloth", 1.3, 1.3), roughness: 0.82 }),
    wizardRobe: new THREE.MeshStandardMaterial({ color: 0x273f78, map: createMaterialDetailTexture("robe-cloth", "cloth", 1.4, 1.6), roughness: 0.78 }),
    wizardTrim: new THREE.MeshStandardMaterial({ color: 0x7ae8ff, roughness: 0.46, metalness: 0.14 }),
    wizardHat: new THREE.MeshStandardMaterial({ color: 0x1f2f5f, map: createMaterialDetailTexture("hat-cloth", "cloth", 1.2, 1.2), roughness: 0.76 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb77a55, roughness: 0.72 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x593822, map: createMaterialDetailTexture("worn-leather", "leather", 1.2, 1.2), roughness: 0.86 }),
    darkLeather: new THREE.MeshStandardMaterial({ color: 0x2f1c13, map: createMaterialDetailTexture("dark-leather", "leather", 1.1, 1.1), roughness: 0.9 }),
    rangerCloak: new THREE.MeshStandardMaterial({ color: 0x33573b, map: createMaterialDetailTexture("ranger-cloak", "cloth", 1.3, 1.5), roughness: 0.86 }),
    rangerHood: new THREE.MeshStandardMaterial({ color: 0x27452e, map: createMaterialDetailTexture("ranger-hood", "cloth", 1.2, 1.2), roughness: 0.88 }),
    rangerJerkin: new THREE.MeshStandardMaterial({ color: 0x4c3422, map: createMaterialDetailTexture("ranger-jerkin", "leather", 1.25, 1.25), roughness: 0.84 }),
    rangerTrim: new THREE.MeshStandardMaterial({ color: 0x9fdf8a, roughness: 0.5, metalness: 0.1 }),
    fur: new THREE.MeshStandardMaterial({ color: 0x2e2118, roughness: 0.95 }),
    warPaint: new THREE.MeshBasicMaterial({ color: 0x2d5f78 }),
    emberEye: new THREE.MeshBasicMaterial({ color: 0xffce73 }),
    dragonScale: new THREE.MeshStandardMaterial({ color: 0x2f6154, roughness: 0.74, metalness: 0.08 }),
    dragonBelly: new THREE.MeshStandardMaterial({ color: 0x9a7d4d, roughness: 0.82 }),
    dragonWing: new THREE.MeshStandardMaterial({ color: 0x28443e, roughness: 0.86, side: THREE.DoubleSide }),
    dragonEye: new THREE.MeshBasicMaterial({ color: 0xffd15f }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4326, map: createMaterialDetailTexture("dark-wood", "wood", 1, 1.8), roughness: 0.9 }),
    paleWood: new THREE.MeshStandardMaterial({ color: 0x9b7650, map: createMaterialDetailTexture("pale-wood", "wood", 1, 1.6), roughness: 0.84 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xa66f48, roughness: 0.94 }),
    rope: new THREE.MeshStandardMaterial({ color: 0xb8965c, roughness: 0.96 }),
    basket: new THREE.MeshStandardMaterial({ color: 0x8a6339, roughness: 0.95 }),
    lampGlow: new THREE.MeshBasicMaterial({ color: 0xffd889, transparent: true, opacity: 0.86 }),
    cityBannerRed: new THREE.MeshStandardMaterial({ color: 0x7f2d2d, map: createMaterialDetailTexture("crownford-banner", "cloth", 1.4, 1.4), roughness: 0.86 }),
    crowdRed: new THREE.MeshStandardMaterial({ color: 0x8d3430, roughness: 0.8 }),
    crowdBlue: new THREE.MeshStandardMaterial({ color: 0x2d5f78, roughness: 0.8 }),
    crowdGreen: new THREE.MeshStandardMaterial({ color: 0x4f6f4a, roughness: 0.8 }),
    crowdGold: new THREE.MeshStandardMaterial({ color: 0xb28a3d, roughness: 0.78 }),
    remoteAlly: new THREE.MeshStandardMaterial({ color: 0x43b7d8, roughness: 0.7 }),
    remoteEnemy: new THREE.MeshStandardMaterial({ color: 0xc65444, roughness: 0.72 }),
    meadow: new THREE.MeshStandardMaterial({ color: 0x466b3c, roughness: 0.96 }),
    desert: new THREE.MeshStandardMaterial({ color: 0xb99158, map: createMaterialDetailTexture("dry-sand", "sand", 2.2, 2.2), roughness: 0.98 }),
    mountainGround: new THREE.MeshStandardMaterial({ color: 0x5a625e, map: createMaterialDetailTexture("mountain-ground", "stone", 2, 2), roughness: 0.96 }),
    briarGround: new THREE.MeshStandardMaterial({ color: 0x2f5637, map: createMaterialDetailTexture("briar-moss", "grass", 2, 2), roughness: 0.98 }),
    mossRoof: new THREE.MeshStandardMaterial({ color: 0x3f5f35, map: createMaterialDetailTexture("moss-thatch", "thatch", 1.5, 1.5), roughness: 0.96 }),
    rootwood: new THREE.MeshStandardMaterial({ color: 0x4f3322, map: createMaterialDetailTexture("rootwood", "wood", 1.0, 1.7), roughness: 0.93 }),
    briarLeaf: new THREE.MeshStandardMaterial({ color: 0x294f2f, roughness: 0.92 }),
    briarThorn: new THREE.MeshStandardMaterial({ color: 0x6f5f3c, roughness: 0.86 }),
    charcoal: new THREE.MeshStandardMaterial({ color: 0x1f211f, roughness: 0.96 }),
    cactus: new THREE.MeshStandardMaterial({ color: 0x356c48, roughness: 0.92 }),
    dryBrush: new THREE.MeshStandardMaterial({ color: 0x8d7140, roughness: 0.96 }),
    adobe: new THREE.MeshStandardMaterial({ color: 0xc69b67, map: createMaterialDetailTexture("sun-adobe", "plaster", 1.2, 1.2), roughness: 0.92 }),
    mountainPlaster: new THREE.MeshStandardMaterial({ color: 0x91948a, map: createMaterialDetailTexture("mountain-plaster", "plaster", 1.15, 1.15), roughness: 0.9 }),
    swampGround: new THREE.MeshStandardMaterial({ color: 0x314f3a, roughness: 0.98 }),
    bogWater: new THREE.MeshStandardMaterial({ color: 0x254f49, roughness: 0.34, metalness: 0.02, transparent: true, opacity: 0.68, depthWrite: false }),
    reed: new THREE.MeshStandardMaterial({ color: 0x607747, roughness: 0.94 }),
    willowLeaf: new THREE.MeshStandardMaterial({ color: 0x2d5d3f, roughness: 0.9 }),
    swampPlank: new THREE.MeshStandardMaterial({ color: 0x5b4932, map: createMaterialDetailTexture("swamp-plank", "wood", 1, 1.4), roughness: 0.95 }),
    thatch: new THREE.MeshStandardMaterial({ color: 0x77623f, map: createMaterialDetailTexture("thatch", "thatch", 1.6, 1.6), roughness: 0.96 }),
    spiderCarapace: new THREE.MeshStandardMaterial({ color: 0x2d221c, roughness: 0.78, metalness: 0.03 }),
    spiderMarking: new THREE.MeshBasicMaterial({ color: 0xd9a648 }),
    wisp: new THREE.MeshBasicMaterial({ color: 0x5effbd, transparent: true, opacity: 0.48, depthWrite: false }),
    wispCore: new THREE.MeshBasicMaterial({ color: 0xd8fff1, transparent: true, opacity: 0.94 }),
    cityWall: new THREE.MeshStandardMaterial({ color: 0xb8b7aa, map: createMaterialDetailTexture("crownford-stone", "stone", 1.5, 1.5), roughness: 0.88 }),
    cityRoof: new THREE.MeshStandardMaterial({ color: 0x435260, map: createMaterialDetailTexture("crownford-slate", "roof", 1.4, 1.4), roughness: 0.86 }),
    stainedGlass: new THREE.MeshBasicMaterial({ color: 0x7ae8ff, transparent: true, opacity: 0.72 }),
    horseCoat: new THREE.MeshStandardMaterial({ color: 0x7b4a2a, map: createMaterialDetailTexture("horse-hide", "hide", 1.35, 1.35), roughness: 0.86 }),
    horseMane: new THREE.MeshStandardMaterial({ color: 0x2f1b12, map: createMaterialDetailTexture("horse-mane", "hide", 1, 1.6), roughness: 0.92 }),
    horseSock: new THREE.MeshStandardMaterial({ color: 0x4a2d1a, map: createMaterialDetailTexture("horse-sock", "hide", 1, 1), roughness: 0.88 }),
    saddle: new THREE.MeshStandardMaterial({ color: 0x49301f, map: createMaterialDetailTexture("saddle-leather", "leather", 1.1, 1.1), roughness: 0.88 }),
    drakeScale: new THREE.MeshStandardMaterial({ color: 0x4d8b86, map: createMaterialDetailTexture("drake-scale", "scales", 1.2, 1.2), roughness: 0.7, metalness: 0.06 }),
    drakeBelly: new THREE.MeshStandardMaterial({ color: 0xc9b083, map: createMaterialDetailTexture("drake-belly", "leather", 1.1, 1.1), roughness: 0.82 }),
    path: new THREE.MeshStandardMaterial({ color: 0x8f774f, map: createMaterialDetailTexture("travel-road", "path", 2.4, 1.2), roughness: 0.98 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xb99158, map: createMaterialDetailTexture("arena-sand", "sand", 1.6, 1.6), roughness: 0.99 }),
    water: new THREE.MeshStandardMaterial({ color: 0x3f9ec5, roughness: 0.26, metalness: 0.02, transparent: true, opacity: 0.72, depthWrite: false }),
    pine: new THREE.MeshStandardMaterial({ color: 0x214f35, roughness: 0.9 }),
    pineDeep: new THREE.MeshStandardMaterial({ color: 0x17402a, roughness: 0.92 }),
    pineSnow: new THREE.MeshStandardMaterial({ color: 0xdfe7ec, roughness: 0.82 }),
    broadleaf: new THREE.MeshStandardMaterial({ color: 0x4d7d3d, roughness: 0.86 }),
    broadleafLight: new THREE.MeshStandardMaterial({ color: 0x6a9a4a, roughness: 0.84 }),
    broadleafDeep: new THREE.MeshStandardMaterial({ color: 0x355e2c, roughness: 0.88 }),
    rubble: new THREE.MeshStandardMaterial({ color: 0x52564f, map: createMaterialDetailTexture("rubble-stone", "stone", 1.1, 1.1), roughness: 0.95 }),
    sandstone: new THREE.MeshStandardMaterial({ color: 0xa6824c, map: createMaterialDetailTexture("sandstone", "stone", 1.2, 1.2), roughness: 0.96 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x6f2f2b, map: createMaterialDetailTexture("village-roof", "roof", 1.4, 1.4), roughness: 0.88 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xd0bc91, map: createMaterialDetailTexture("village-plaster", "plaster", 1.2, 1.2), roughness: 0.9 }),
    npcCloth: new THREE.MeshStandardMaterial({ color: 0x7d6cb0, roughness: 0.82 }),
    flower: new THREE.MeshBasicMaterial({ color: 0xffe28a }),
    questGlow: new THREE.MeshBasicMaterial({ color: 0x9fffd1, transparent: true, opacity: 0.86 }),
    cloud: new THREE.MeshBasicMaterial({ color: 0xf7fbff, transparent: true, opacity: 0.94, fog: false }),
    sunDisc: new THREE.MeshBasicMaterial({ color: 0xffdf7f, fog: false }),
    danger: new THREE.MeshBasicMaterial({ color: 0xff542e, transparent: true, opacity: 0.36, depthWrite: false }),
    heavyDanger: new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.42, depthWrite: false }),
    fire: new THREE.MeshBasicMaterial({ color: 0xff6a1e }),
    fireCore: new THREE.MeshBasicMaterial({ color: 0xfff1a6 }),
    lightning: new THREE.MeshBasicMaterial({ color: 0x49d8ff, transparent: true, opacity: 0.88 }),
    lightningCore: new THREE.MeshBasicMaterial({ color: 0xf4fdff, transparent: true, opacity: 0.96 }),
    arcane: new THREE.MeshBasicMaterial({ color: 0x83f1ff, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }),
    potionGlass: new THREE.MeshStandardMaterial({ color: 0xbfefff, roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0.36 }),
    potionLiquid: new THREE.MeshBasicMaterial({ color: 0xff4f6d, transparent: true, opacity: 0.9 }),
    wizardPotionLiquid: new THREE.MeshBasicMaterial({ color: 0x7ae8ff, transparent: true, opacity: 0.9 }),
    fullPotionLiquid: new THREE.MeshBasicMaterial({ color: 0xffcf5a, transparent: true, opacity: 0.94 }),
    slash: new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.0, depthWrite: false }),
    hit: new THREE.MeshBasicMaterial({ color: 0xffe1a6, transparent: true, opacity: 0.0, depthWrite: false }),
    // Meadow Bandit Archer: drab road-raider greens/browns with leather and a bow.
    banditTunic: new THREE.MeshStandardMaterial({ color: 0x55613a, map: createMaterialDetailTexture("bandit-tunic", "cloth", 1.2, 1.3), roughness: 0.84 }),
    banditHood: new THREE.MeshStandardMaterial({ color: 0x39432a, map: createMaterialDetailTexture("bandit-hood", "cloth", 1.1, 1.1), roughness: 0.86 }),
    banditMask: new THREE.MeshStandardMaterial({ color: 0x2a2f22, roughness: 0.82 }),
    bowWood: new THREE.MeshStandardMaterial({ color: 0x6e4a27, map: createMaterialDetailTexture("bandit-bow", "wood", 1, 1.7), roughness: 0.82 }),
    // Desert Sand Viper: sandy scaled serpent with a darker dorsal hood and venom sacs.
    viperScale: new THREE.MeshStandardMaterial({ color: 0xc2a25a, map: createMaterialDetailTexture("viper-scale", "scales", 1.5, 1.5), roughness: 0.7, metalness: 0.05 }),
    viperBelly: new THREE.MeshStandardMaterial({ color: 0xe7d8af, map: createMaterialDetailTexture("viper-belly", "leather", 1.1, 1.1), roughness: 0.82 }),
    viperHood: new THREE.MeshStandardMaterial({ color: 0x8a6a32, map: createMaterialDetailTexture("viper-hood", "scales", 1.2, 1.2), roughness: 0.74 }),
    venomGlow: new THREE.MeshBasicMaterial({ color: 0x9be04a, transparent: true, opacity: 0.85 }),
    // Mountain Bonewarden: bleached bone, pitted dark iron plates, necrotic rune-light.
    boneArmor: new THREE.MeshStandardMaterial({ color: 0xc9bd99, roughness: 0.66 }),
    necroticGlow: new THREE.MeshBasicMaterial({ color: 0x8fe6ad }),
    // Swamp Bog Lurker: wet dark-green hide, moss mantle, sodden muck.
    bogHide: new THREE.MeshStandardMaterial({ color: 0x3a4f38, map: createMaterialDetailTexture("bog-hide", "hide", 1.3, 1.3), roughness: 0.92 }),
    bogMoss: new THREE.MeshStandardMaterial({ color: 0x49682f, roughness: 0.94 }),
    bogMuck: new THREE.MeshStandardMaterial({ color: 0x283626, roughness: 0.96 }),
    // Enemy projectile variants reuse the fire-orb pipeline (host-authoritative + replicated).
    venomOrb: new THREE.MeshBasicMaterial({ color: 0x7ec23f }),
    venomOrbCore: new THREE.MeshBasicMaterial({ color: 0xe9ffb0 }),
    hexOrb: new THREE.MeshBasicMaterial({ color: 0x46c7b0, transparent: true, opacity: 0.92 }),
    hexOrbCore: new THREE.MeshBasicMaterial({ color: 0xd8fff1 })
  };

  const modelScale = {
    npc: 1.3,
    barbarianBase: 1.08,
    dragonBase: 1.06,
    spiderBase: 1.32,
    briarBeastBase: 1.18,
    banditBase: 1.02,
    viperBase: 1.05,
    bonewardenBase: 1.06,
    bogLurkerBase: 1.12
  };

  // Shared grassland/meadow cottage materials. Gated to the default house
  // style only (mountain/desert/swamp/briar keep their own palettes), and
  // reused across every meadow house so material/texture count stays bounded.
  const meadowHouse = {
    wallCream: new THREE.MeshStandardMaterial({ color: 0xe7d9b4, map: createMaterialDetailTexture("cottage-cream", "plaster", 1.3, 1.3), roughness: 0.9 }),
    wallOchre: new THREE.MeshStandardMaterial({ color: 0xd6ad74, map: createMaterialDetailTexture("cottage-ochre", "plaster", 1.3, 1.3), roughness: 0.9 }),
    wallSage: new THREE.MeshStandardMaterial({ color: 0xbfc09c, map: createMaterialDetailTexture("cottage-sage", "plaster", 1.3, 1.3), roughness: 0.9 }),
    wallRose: new THREE.MeshStandardMaterial({ color: 0xd7b3a2, map: createMaterialDetailTexture("cottage-rose", "plaster", 1.3, 1.3), roughness: 0.9 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x49321f, map: createMaterialDetailTexture("cottage-timber", "wood", 1, 1.6), roughness: 0.9 }),
    thatch: new THREE.MeshStandardMaterial({ color: 0xb8924f, map: createMaterialDetailTexture("cottage-thatch", "thatch", 1.5, 1.5), roughness: 0.95 }),
    tileRed: new THREE.MeshStandardMaterial({ color: 0x8a3b2f, map: createMaterialDetailTexture("cottage-tile-red", "roof", 1.4, 1.4), roughness: 0.86 }),
    tileSlate: new THREE.MeshStandardMaterial({ color: 0x55615f, map: createMaterialDetailTexture("cottage-tile-slate", "roof", 1.4, 1.4), roughness: 0.86 }),
    foundation: new THREE.MeshStandardMaterial({ color: 0x7c746a, map: createMaterialDetailTexture("cottage-foundation", "stone", 1.6, 0.8), roughness: 0.92 }),
    planter: new THREE.MeshStandardMaterial({ color: 0x6a4a2c, map: createMaterialDetailTexture("cottage-planter", "wood", 1, 1.2), roughness: 0.92 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4f7a3c, roughness: 0.9 }),
    bloomA: new THREE.MeshBasicMaterial({ color: 0xff6f8a }),
    bloomB: new THREE.MeshBasicMaterial({ color: 0xffd23f }),
    bloomC: new THREE.MeshBasicMaterial({ color: 0xd17ce0 })
  };

  const meadowHouseStyles = [
    { wall: meadowHouse.wallCream, roof: meadowHouse.thatch, thatch: true, porch: true, bloom: meadowHouse.bloomA },
    { wall: meadowHouse.wallOchre, roof: meadowHouse.tileRed, thatch: false, porch: false, bloom: meadowHouse.bloomB },
    { wall: meadowHouse.wallSage, roof: meadowHouse.tileSlate, thatch: false, porch: true, bloom: meadowHouse.bloomC },
    { wall: meadowHouse.wallRose, roof: meadowHouse.thatch, thatch: true, porch: false, bloom: meadowHouse.bloomA }
  ];

  // Shared friendly-NPC appearance palettes. Each entry is one material reused
  // across every NPC, so individuality comes from deterministic seed picks
  // rather than per-NPC textures.
  function npcCloth(seed, color) {
    return new THREE.MeshStandardMaterial({ color, map: createMaterialDetailTexture(seed, "linen", 1.1, 1.3), roughness: 0.84 });
  }
  function npcLeather(seed, color) {
    return new THREE.MeshStandardMaterial({ color, map: createMaterialDetailTexture(seed, "leather", 1.1, 1.1), roughness: 0.88 });
  }
  const npcSkinPalette = [
    new THREE.MeshStandardMaterial({ color: 0xe5b48d, map: createMaterialDetailTexture("npc-skin-light", "skin", 1, 1), roughness: 0.74 }),
    new THREE.MeshStandardMaterial({ color: 0xc78f63, map: createMaterialDetailTexture("npc-skin-tan", "skin", 1, 1), roughness: 0.74 }),
    new THREE.MeshStandardMaterial({ color: 0x9c6a42, map: createMaterialDetailTexture("npc-skin-warm", "skin", 1, 1), roughness: 0.74 }),
    new THREE.MeshStandardMaterial({ color: 0x6f4a30, map: createMaterialDetailTexture("npc-skin-deep", "skin", 1, 1), roughness: 0.74 })
  ];
  const npcHairPalette = [
    new THREE.MeshStandardMaterial({ color: 0x2a1d14, map: createMaterialDetailTexture("npc-hair-black", "hide", 1, 1.3), roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: 0x5a3a22, map: createMaterialDetailTexture("npc-hair-brown", "hide", 1, 1.3), roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: 0x8a4b2a, map: createMaterialDetailTexture("npc-hair-auburn", "hide", 1, 1.3), roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: 0xb9a06a, map: createMaterialDetailTexture("npc-hair-blond", "hide", 1, 1.3), roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: 0xc9c4bb, map: createMaterialDetailTexture("npc-hair-grey", "hide", 1, 1.3), roughness: 0.92 })
  ];
  const npcTrimPalette = [
    new THREE.MeshStandardMaterial({ color: 0xb89a52, roughness: 0.6, metalness: 0.12 }),
    new THREE.MeshStandardMaterial({ color: 0x9a4738, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0x3f6f6a, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0xcfc4ad, roughness: 0.7 })
  ];
  const npcGarmentPalettes = {
    meadow: [npcCloth("npc-mead-1", 0x7d6cb0), npcCloth("npc-mead-2", 0x9a4a3e), npcCloth("npc-mead-3", 0x4f7a52), npcCloth("npc-mead-4", 0xc79a52), npcCloth("npc-mead-5", 0x4c6b8a)],
    desert: [npcCloth("npc-des-1", 0xc79a5a), npcCloth("npc-des-2", 0xb87f4a), npcCloth("npc-des-3", 0xa8693f), npcCloth("npc-des-4", 0xd8b06a)],
    mountain: [npcCloth("npc-mtn-1", 0x59707c), npcCloth("npc-mtn-2", 0x6c6f73), npcCloth("npc-mtn-3", 0x4a5a64), npcCloth("npc-mtn-4", 0x7a6b58)],
    city: [npcCloth("npc-city-1", 0x3f5370), npcCloth("npc-city-2", 0x6a3550), npcCloth("npc-city-3", 0x44606f), npcCloth("npc-city-4", 0x6f5f86)],
    swamp: [npcCloth("npc-swp-1", 0x3a5f4a), npcCloth("npc-swp-2", 0x4f6240), npcCloth("npc-swp-3", 0x5b5a3a), npcCloth("npc-swp-4", 0x37544f)],
    briar: [npcCloth("npc-bri-1", 0x4a6235), npcCloth("npc-bri-2", 0x5f6b34), npcCloth("npc-bri-3", 0x6a5a30), npcCloth("npc-bri-4", 0x3f5a3e)]
  };
  const npcLegPalette = [
    npcLeather("npc-leg-1", 0x4a3526),
    npcLeather("npc-leg-2", 0x5a4a36),
    npcLeather("npc-leg-3", 0x3a2c20),
    npcLeather("npc-leg-4", 0x6a5640)
  ];
  const npcApronMaterial = npcLeather("npc-apron", 0x8a6a44);
  const npcBootMaterial = npcLeather("npc-boot", 0x33241a);

  const game = {
    state: "menu",
    wave: 0,
    kills: 0,
    enemies: [],
    fireballs: [],
    playerProjectiles: [],
    potions: [],
    particles: [],
    nextEnemyId: 1,
    nextFireballId: 1,
    nextPotionId: 1,
    nextProjectileId: 1,
    gates: [],
    nextWaveIn: 0,
    bannerTime: 0,
    threat: "Low",
    cameraYaw: 0,
    cameraPitch: -0.22,
    pointerActive: false,
    startedOnce: false,
    suppressControlLossUntil: 0,
    saveTimer: 0,
    menuPhase: "landing",
    pausedFromPlay: false,
    selectedCharacter: "knight",
    mode: "exploration",
    arenaGroup: null,
    dungeonGroup: null,
    explorationGroup: null,
    npcs: [],
    questItems: [],
    quests: [],
    activeNpc: null,
    dialogNpc: null,
    dialogVoiceKey: "",
    dialogActionIndex: 0,
    dialogTopics: [],
    questMapTimer: 0,
    exploration: {
      origin: new THREE.Vector3(180, 0, 0),
      radius: 350,
      seed: "",
      xp: 0,
      lakes: [],
      villages: [],
      biomes: [],
      colliders: [],
      colliderGrid: new Map(),
      colliderCellSize: 8,
      roads: [],
      roadJunctions: [],
      terrainFlatZones: [],
      city: null,
      arenaCity: null,
      dungeonPoi: null,
      dungeonPois: [],
      respawnTownId: "",
      respawnLocal: null,
      respawnPoint: null,
      horse: null,
      discovered: new Set(),
      completed: false,
      arenaActivity: defaultArenaActivity(),
      dungeonActivity: defaultDungeonActivity(),
      dungeonRewardClaimIds: [],
      // Wilds Director state: one record per original enemy seed point
      // (the world's "ecology map"), a tick countdown, and a round-robin
      // cursor into the records. Host-only; never persisted.
      wilds: { seedPoints: [], timer: 0, cursor: 0 },
      spawn: new THREE.Vector3(180, 0, 1.6)
    }
  };

  function stableOnlineId() {
    const makeId = () => (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2);
    try {
      const stored = localStorage.getItem("ironholdClientId");
      if (stored && /^[a-zA-Z0-9_-]{8,64}$/.test(stored)) {
        return stored;
      }
      const nextId = makeId();
      localStorage.setItem("ironholdClientId", nextId);
      return nextId;
    } catch (error) {
      return makeId();
    }
  }

  function storedRoomCode() {
    try {
      return normalizeRoomCode(localStorage.getItem("ironholdLastRoomCode") || "");
    } catch (error) {
      return "";
    }
  }

  function rememberRoomCode(code) {
    const safeCode = normalizeRoomCode(code);
    try {
      if (safeCode) {
        localStorage.setItem("ironholdLastRoomCode", safeCode);
      } else {
        localStorage.removeItem("ironholdLastRoomCode");
      }
    } catch (error) {
      // Storage can be unavailable in private or embedded browser contexts.
    }
  }

  const online = {
    localId: stableOnlineId(),
    client: null,
    topic: "",
    connected: false,
    role: null,
    flow: "join",
    roomCode: "",
    lastRoomCode: storedRoomCode(),
    lastRoomMode: "exploration",
    roomPhase: "lobby",
    hostId: "",
    sendTimer: 0,
    worldSendTimer: 0,
    effectSeq: 0,
    presenceTimer: 0,
    remotePlayers: new Map(),
    kickedIds: new Set()
  };

  // Peer-broadcast room chat. Messages ride the existing MQTT layer as
  // { kind: "chat", name, text, color, ts }; every client renders what it
  // receives and locally echoes its own sends (handleOnlineMessage drops
  // self-id messages, so the echo is added at send time).
  const CHAT_MAX_LEN = 140;
  const CHAT_HISTORY = 5;
  const CHAT_FADE_MS = 6500;
  const CHAT_SEND_GAP_MS = 700;
  const CHAT_BURST_WINDOW_MS = 5000;
  const CHAT_BURST_LIMIT = 5;
  const chat = {
    open: false,
    panelShown: false,
    messages: [],
    lastSentAt: 0,
    suppressPauseUntil: 0,
    senders: new Map()
  };

  const player = {
    character: "knight",
    group: null,
    body: null,
    swordPivot: null,
    shieldPivot: null,
    staffPivot: null,
    leftArm: null,
    rightArm: null,
    leftLeg: null,
    rightLeg: null,
    swordBlade: null,
    weaponGroup: null,
    slashArc: null,
    burstRing: null,
    castGlow: null,
    hitFlash: null,
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(),
    yaw: 0,
    health: 100,
    maxHealth: 100,
    name: "Player",
    guard: 100,
    maxGuard: 100,
    mana: 100,
    maxMana: 100,
    manaRegen: 18,
    potionCooldown: 0,
    potionCooldownMax: 18,
    secondaryCooldown: 0,
    attacking: false,
    attackKind: "slash",
    attackTimer: 0,
    attackDuration: 0.42,
    attackCooldown: 0,
    attackHitDone: false,
    blocking: false,
    blockHeld: false,
    rollTimer: 0,
    hurtTimer: 0,
    combatRegenDelay: 0,
    walkTime: 0,
    bowPivot: null,
    quiver: null,
    utilityCooldown: 0,
    payoffCooldown: 0,
    resolveTimer: 0
  };

  try {
    player.name = sanitizePlayerName(localStorage.getItem("ironholdPlayerName") || "");
  } catch (error) {
    player.name = "Player";
  }
  playerNameInput.value = player.name;

  function sanitizePlayerName(value) {
    const cleaned = (value || "").replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, " ").trim().slice(0, 14);
    return cleaned || "Player";
  }

  function syncPlayerName() {
    player.name = sanitizePlayerName(playerNameInput.value);
    playerNameInput.value = player.name;
    try {
      localStorage.setItem("ironholdPlayerName", player.name);
    } catch (error) {
      // Storage can be unavailable in private or embedded browser contexts.
    }
    sendOnlineMessage({ kind: "state", state: serializePlayerState() });
  }

  function addShadow(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  const primitiveGeometryCache = new Map();

  function primitiveGeometryKey(type, values) {
    return type + ":" + values.map(value => Number(value).toFixed(4)).join(":");
  }

  function cachedPrimitiveGeometry(type, values, factory) {
    const key = primitiveGeometryKey(type, values);
    let geometry = primitiveGeometryCache.get(key);
    if (!geometry) {
      geometry = factory();
      primitiveGeometryCache.set(key, geometry);
    }
    return geometry;
  }

  function makeBox(width, height, depth, material, x, y, z) {
    const mesh = new THREE.Mesh(
      cachedPrimitiveGeometry("box", [width, height, depth], () => new THREE.BoxGeometry(width, height, depth)),
      material
    );
    mesh.position.set(x || 0, y || 0, z || 0);
    return addShadow(mesh);
  }

  function makeCylinder(radiusTop, radiusBottom, height, radialSegments, material, x, y, z) {
    const segments = radialSegments || 16;
    const mesh = new THREE.Mesh(
      cachedPrimitiveGeometry(
        "cylinder",
        [radiusTop, radiusBottom, height, segments],
        () => new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments)
      ),
      material
    );
    mesh.position.set(x || 0, y || 0, z || 0);
    return addShadow(mesh);
  }

  function makeSphere(radius, material, x, y, z) {
    const mesh = new THREE.Mesh(
      cachedPrimitiveGeometry("sphere", [radius, 20, 14], () => new THREE.SphereGeometry(radius, 20, 14)),
      material
    );
    mesh.position.set(x || 0, y || 0, z || 0);
    return addShadow(mesh);
  }

  function makeGroundTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#3b4436";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i += 1) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 1 + Math.random() * 4;
      ctx.fillStyle = Math.random() > 0.55 ? "rgba(115, 98, 67, 0.28)" : "rgba(24, 32, 24, 0.24)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 18; i += 1) {
      ctx.strokeStyle = "rgba(174, 144, 91, 0.18)";
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 256, Math.random() * 256);
      ctx.bezierCurveTo(Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256, Math.random() * 256);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(7, 7);
    return texture;
  }

  function createExplorationTexture(seed) {
    const random = seededRandom(seed + "-meadow");
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#45683b";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2400; i += 1) {
      const x = random() * 512;
      const y = random() * 512;
      const r = 0.7 + random() * 3.6;
      ctx.fillStyle = random() > 0.64 ? "rgba(161, 139, 77, 0.18)" : "rgba(31, 78, 45, 0.2)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 42; i += 1) {
      ctx.fillStyle = random() > 0.5 ? "rgba(255, 226, 138, 0.45)" : "rgba(184, 219, 137, 0.34)";
      ctx.fillRect(random() * 512, random() * 512, 2 + random() * 2, 2 + random() * 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(22, 22);
    return texture;
  }

  function explorationToWorld(localX, localZ, out = new THREE.Vector3()) {
    return out.set(game.exploration.origin.x + localX, 0, game.exploration.origin.z + localZ);
  }

  function explorationLocalPosition(position, out = new THREE.Vector3()) {
    return out.set(position.x - game.exploration.origin.x, 0, position.z - game.exploration.origin.z);
  }

  function addExplorationCollider(localX, localZ, radius, kind = "obstacle") {
    if (!Number.isFinite(localX) || !Number.isFinite(localZ) || !Number.isFinite(radius) || radius <= 0) {
      return;
    }
    const collider = {
      x: game.exploration.origin.x + localX,
      z: game.exploration.origin.z + localZ,
      radius,
      kind
    };
    game.exploration.colliders.push(collider);
    registerExplorationCollider(collider);
  }

  function explorationColliderCell(value) {
    return Math.floor(value / game.exploration.colliderCellSize);
  }

  function explorationColliderCellKey(cx, cz) {
    return cx + ":" + cz;
  }

  function registerExplorationCollider(collider) {
    const padding = collider.radius + 0.25;
    const minX = explorationColliderCell(collider.x - padding);
    const maxX = explorationColliderCell(collider.x + padding);
    const minZ = explorationColliderCell(collider.z - padding);
    const maxZ = explorationColliderCell(collider.z + padding);
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cz = minZ; cz <= maxZ; cz += 1) {
        const key = explorationColliderCellKey(cx, cz);
        let bucket = game.exploration.colliderGrid.get(key);
        if (!bucket) {
          bucket = [];
          game.exploration.colliderGrid.set(key, bucket);
        }
        bucket.push(collider);
      }
    }
  }

  function explorationCollidersNear(worldX, worldZ, radius = 0) {
    if (!game.exploration.colliderGrid.size) {
      return game.exploration.colliders;
    }
    const queryRadius = Math.max(0.1, radius);
    const minX = explorationColliderCell(worldX - queryRadius);
    const maxX = explorationColliderCell(worldX + queryRadius);
    const minZ = explorationColliderCell(worldZ - queryRadius);
    const maxZ = explorationColliderCell(worldZ + queryRadius);
    const colliders = [];
    const seen = new Set();
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cz = minZ; cz <= maxZ; cz += 1) {
        const bucket = game.exploration.colliderGrid.get(explorationColliderCellKey(cx, cz));
        if (!bucket) {
          continue;
        }
        for (const collider of bucket) {
          if (!seen.has(collider)) {
            seen.add(collider);
            colliders.push(collider);
          }
        }
      }
    }
    return colliders;
  }

  function addExplorationLineColliders(localX, localZ, width, depth, kind = "structure") {
    const horizontal = width >= depth;
    const length = Math.max(width, depth);
    const thickness = Math.min(width, depth);
    const count = Math.max(1, Math.ceil(length / 2.6));
    const radius = Math.max(0.55, Math.min(1.55, length / count * 0.55 + thickness * 0.35));
    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : -length / 2 + (i + 0.5) * (length / count);
      addExplorationCollider(
        localX + (horizontal ? offset : 0),
        localZ + (horizontal ? 0 : offset),
        radius,
        kind
      );
    }
  }

  function characterKey(character) {
    return character === "wizard" || character === "ranger" ? character : "knight";
  }

  function defaultCharacterProgress(character) {
    const key = characterKey(character);
    const weapon = defaultWeaponByCharacter[key];
    return {
      xp: 0,
      equipment: { weapon },
      unlockedEquipment: [weapon],
      perks: []
    };
  }

  function validEquipmentForCharacter(character, equipmentId) {
    const key = characterKey(character);
    const definition = equipmentDefs[equipmentId];
    return !!definition && definition.character === key;
  }

  function equipmentIdsForCharacter(character) {
    const key = characterKey(character);
    return Object.entries(equipmentDefs)
      .filter(([, definition]) => definition.character === key)
      .map(([id]) => id);
  }

  function availableEquipmentForCharacter(character) {
    const key = characterKey(character);
    if (localGodModeEnabled()) {
      return equipmentIdsForCharacter(key);
    }
    const progress = getCharacterProgress(key);
    return (progress.unlockedEquipment || []).filter(id => validEquipmentForCharacter(key, id));
  }

  function normalizeCharacterProgress(source, character) {
    const normalized = defaultCharacterProgress(character);
    const entry = source && typeof source === "object" ? source : {};
    normalized.xp = Math.max(0, Math.floor(numberOrZero(entry.xp)));
    const unlocked = Array.isArray(entry.unlockedEquipment)
      ? entry.unlockedEquipment.filter(id => validEquipmentForCharacter(character, id))
      : [];
    for (const id of unlocked) {
      if (!normalized.unlockedEquipment.includes(id)) {
        normalized.unlockedEquipment.push(id);
      }
    }
    const weapon = entry.equipment && validEquipmentForCharacter(character, entry.equipment.weapon)
      ? entry.equipment.weapon
      : normalized.equipment.weapon;
    normalized.equipment.weapon = normalized.unlockedEquipment.includes(weapon) || localGodModeEnabled()
      ? weapon
      : normalized.equipment.weapon;
    normalized.perks = Array.isArray(entry.perks)
      ? entry.perks.filter(id => !!perkDefs[id]).filter((id, index, values) => values.indexOf(id) === index)
      : [];
    return normalized;
  }

  function characterProgressNeedsMigration(entry, character) {
    const key = characterKey(character);
    if (!entry || typeof entry !== "object") {
      return true;
    }
    if (!entry.equipment || !validEquipmentForCharacter(key, entry.equipment.weapon)) {
      return true;
    }
    if (!Array.isArray(entry.unlockedEquipment) || !entry.unlockedEquipment.includes(defaultWeaponByCharacter[key])) {
      return true;
    }
    if (!Array.isArray(entry.perks)) {
      return true;
    }
    return false;
  }

  function equippedWeapon(character = player.character) {
    const key = characterKey(character);
    const progress = getCharacterProgress(key);
    const weapon = progress.equipment && progress.equipment.weapon;
    return validEquipmentForCharacter(key, weapon) ? weapon : defaultWeaponByCharacter[key];
  }

  function cycleEquippedWeapon() {
    const key = characterKey(player.character);
    const progress = getCharacterProgress(key);
    const available = availableEquipmentForCharacter(key);
    if (available.length < 2) {
      showBanner(localGodModeEnabled() ? "No other kit available" : "No other kit unlocked yet", 1.8);
      return false;
    }
    const index = available.indexOf(equippedWeapon(key));
    progress.equipment.weapon = available[(index + 1) % available.length];
    playSfx("ui", 1);
    showBanner("Kit: " + equipmentDefs[progress.equipment.weapon].name + " - G to swap", 2.2);
    applyProgressionStats(false);
    refreshLocalWeaponModel();
    saveProgress();
    sendOnlineMessage({ kind: "state", state: serializePlayerState() });
    updateHud();
    return true;
  }

  function hasPerk(id, character = player.character) {
    return (getCharacterProgress(character).perks || []).includes(id);
  }

  function currentMountTackId() {
    if (localGodModeEnabled()) {
      return ROADWARDEN_TACK_ID;
    }
    return progression && progression.exploration && progression.exploration.mountTackId === ROADWARDEN_TACK_ID
      ? ROADWARDEN_TACK_ID
      : "";
  }

  function hasRoadwardenTack() {
    return currentMountTackId() === ROADWARDEN_TACK_ID;
  }

  const mountDisplayNames = { horse: "Horse", drake: "Skyhatched Drake" };

  function currentMountId() {
    const exploration = progression && progression.exploration;
    return exploration && exploration.activeMountId === "drake" && (exploration.drakeUnlocked || localGodModeEnabled()) ? "drake" : "horse";
  }

  function ownedMountIds() {
    if (localGodModeEnabled()) {
      return ["horse", "drake"];
    }
    const exploration = progression && progression.exploration;
    const owned = [];
    if (exploration && exploration.horseUnlocked) {
      owned.push("horse");
    }
    if (exploration && exploration.drakeUnlocked) {
      owned.push("drake");
    }
    return owned;
  }

  function mountedMoveSpeed() {
    if (currentMountId() === "drake") {
      return 11.6;
    }
    return hasRoadwardenTack() ? 11.2 : 10.4;
  }

  function mountedCollisionRadius() {
    return currentMountId() === "drake" ? 1.08 : hasRoadwardenTack() ? 1.02 : 1.08;
  }

  function sanitizedCombatProfile(character, weaponId, perks = []) {
    const key = characterKey(character);
    const fallbackWeapon = defaultWeaponByCharacter[key];
    const safeWeapon = validEquipmentForCharacter(key, weaponId) ? weaponId : fallbackWeapon;
    const safePerks = Array.isArray(perks)
      ? perks.filter(id => !!perkDefs[id]).filter((id, index, values) => values.indexOf(id) === index).slice(0, 8)
      : [];
    return { character: key, weaponId: safeWeapon, perks: safePerks };
  }

  function combatTuningFor(character = player.character, options = {}) {
    const key = characterKey(character);
    const profile = sanitizedCombatProfile(
      key,
      options.weaponId || equippedWeapon(key),
      Array.isArray(options.perks) ? options.perks : getCharacterProgress(key).perks || []
    );
    const tuning = { ...defaultCombatTuning };
    Object.assign(tuning, equipmentDefs[profile.weaponId].tuning || {});
    for (const perkId of profile.perks) {
      Object.assign(tuning, perkDefs[perkId].tuning || {});
    }
    return tuning;
  }

  function grantEquipmentToCharacter(character, equipmentId, autoEquip = true) {
    const key = characterKey(character);
    if (!validEquipmentForCharacter(key, equipmentId)) {
      return null;
    }
    const progress = getCharacterProgress(key);
    let changed = false;
    if (!progress.unlockedEquipment.includes(equipmentId)) {
      progress.unlockedEquipment.push(equipmentId);
      changed = true;
    }
    if (autoEquip && progress.equipment.weapon !== equipmentId) {
      progress.equipment.weapon = equipmentId;
      changed = true;
    }
    return changed ? equipmentDefs[equipmentId].name : null;
  }

  function grantPerkToCharacter(character, perkId) {
    if (!perkDefs[perkId]) {
      return null;
    }
    const progress = getCharacterProgress(character);
    if (progress.perks.includes(perkId)) {
      return null;
    }
    progress.perks.push(perkId);
    return perkDefs[perkId].name;
  }

  function grantRpgRewardForQuest(questId) {
    const unlocked = [];
    if (questId === "raiders") {
      for (const message of [
        grantEquipmentToCharacter("knight", "knight_roadwarden_blade"),
        grantEquipmentToCharacter("wizard", "wizard_wayfinder_focus")
      ]) {
        if (message) {
          unlocked.push(message);
        }
      }
    } else if (questId === "cityWrits") {
      for (const message of [
        grantPerkToCharacter("knight", "crownford_drill"),
        grantPerkToCharacter("wizard", "crownford_drill"),
        grantPerkToCharacter("ranger", "crownford_drill")
      ]) {
        if (message) {
          unlocked.push(message);
        }
      }
    } else if (questId === "crownringTrial") {
      // Sidegrade kits: unlock without auto-equip so switching stays a choice.
      for (const message of [
        grantEquipmentToCharacter("knight", "knight_crownring_maul", false),
        grantEquipmentToCharacter("wizard", "wizard_stormcall_rod", false),
        grantEquipmentToCharacter("ranger", "ranger_crownring_recurve", false)
      ]) {
        if (message) {
          unlocked.push(message);
        }
      }
    } else if (questId === "briarStalkers") {
      for (const message of [
        grantEquipmentToCharacter("knight", "knight_briarfall_hookblade", false),
        grantEquipmentToCharacter("wizard", "wizard_briar_focus", false),
        grantEquipmentToCharacter("ranger", "ranger_briarstring_bow", false),
        grantPerkToCharacter("knight", "briarfall_pathcraft"),
        grantPerkToCharacter("wizard", "briarfall_pathcraft"),
        grantPerkToCharacter("ranger", "briarfall_pathcraft")
      ]) {
        if (message) {
          unlocked.push(message);
        }
      }
    }
    if (unlocked.length) {
      // Auto-equipped rewards change the held weapon and kit stats.
      applyProgressionStats(false);
      refreshLocalWeaponModel();
    }
    return unlocked;
  }

  function currentKitText() {
    const weapon = equipmentDefs[equippedWeapon()];
    const perks = getCharacterProgress().perks || [];
    const perkName = perks
      .map(perkId => perkDefs[perkId] && perkDefs[perkId].name)
      .filter(Boolean)
      .map(name => name.replace("Crownford ", ""))
      .join(" + ");
    const tackName = hasRoadwardenTack() ? " + Tack" : "";
    return (weapon ? weapon.name : "Starter Kit") + (perkName ? " + " + perkName : "") + tackName;
  }

  function currentKitTooltip() {
    const definition = equipmentDefs[equippedWeapon()];
    if (!definition) {
      return "";
    }
    const lines = Object.entries(definition.tuning || {}).map(([key, value]) => {
      const base = defaultCombatTuning[key];
      return key + ": " + value + (base !== undefined && base !== value ? " (base " + base + ")" : "");
    });
    return definition.name + (lines.length ? "\n" + lines.join("\n") : "\nStandard tuning");
  }

  function defaultProgression() {
    return {
      version: 3,
      activeGame: null,
      characters: {
        knight: defaultCharacterProgress("knight"),
        wizard: defaultCharacterProgress("wizard"),
        ranger: defaultCharacterProgress("ranger")
      },
      exploration: {
        quests: {},
        discovered: [],
        respawnTownId: "",
        respawnLocal: null,
        completed: false,
        horseUnlocked: false,
        drakeUnlocked: false,
        activeMountId: "horse",
        mountTackId: "",
        boons: { health: 0, guard: 0, mana: 0 },
        dungeonClears: {},
        potionInventory: [],
        potionCooldownBonus: 0,
        position: null,
        resources: null,
        guidanceSeen: false
      }
    };
  }

  function numberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizePotionInventoryItem(value) {
    if (!value || typeof value !== "object") {
      return null;
    }
    const kind = value.kind === "full" ? "full" : "small";
    if (kind === "full") {
      return { kind };
    }
    const healAmount = clamp(Math.ceil(numberOrZero(value.healAmount)), 1, 999);
    return { kind, healAmount };
  }

  function normalizePotionInventory(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map(normalizePotionInventoryItem)
      .filter(Boolean)
      .slice(0, POTION_INVENTORY_CAPACITY);
  }

  function normalizeProgression(raw) {
    const base = defaultProgression();
    const source = raw && typeof raw === "object" ? raw : {};
    const sourceCharacters = source.characters && typeof source.characters === "object" ? source.characters : {};
    for (const character of ["knight", "wizard", "ranger"]) {
      base.characters[character] = normalizeCharacterProgress(sourceCharacters[character], character);
    }

    const sourceExploration = source.exploration && typeof source.exploration === "object" ? source.exploration : {};
    if (sourceExploration.quests && typeof sourceExploration.quests === "object") {
      for (const [id, quest] of Object.entries(sourceExploration.quests)) {
        if (!quest || typeof quest !== "object") {
          continue;
        }
        const state = ["available", "active", "ready", "done"].includes(quest.state) ? quest.state : "available";
        base.exploration.quests[id] = { state, progress: Math.max(0, Math.floor(numberOrZero(quest.progress))) };
      }
    }
    base.exploration.discovered = Array.isArray(sourceExploration.discovered)
      ? sourceExploration.discovered.filter(value => typeof value === "string").slice(0, 20)
      : [];
    base.exploration.respawnTownId = typeof sourceExploration.respawnTownId === "string"
      ? sourceExploration.respawnTownId.slice(0, 64)
      : "";
    if (sourceExploration.respawnLocal && typeof sourceExploration.respawnLocal === "object") {
      const x = Number(sourceExploration.respawnLocal.x);
      const z = Number(sourceExploration.respawnLocal.z);
      if (Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x, z) <= 420) {
        base.exploration.respawnLocal = {
          x: Math.round(x * 100) / 100,
          z: Math.round(z * 100) / 100
        };
      }
    }
    base.exploration.completed = !!sourceExploration.completed;
    base.exploration.horseUnlocked = !!sourceExploration.horseUnlocked;
    base.exploration.drakeUnlocked = !!sourceExploration.drakeUnlocked;
    base.exploration.activeMountId = sourceExploration.activeMountId === "drake" ? "drake" : "horse";
    base.exploration.mountTackId = sourceExploration.mountTackId === ROADWARDEN_TACK_ID ? ROADWARDEN_TACK_ID : "";
    const sourceBoons = sourceExploration.boons && typeof sourceExploration.boons === "object" ? sourceExploration.boons : {};
    base.exploration.boons.health = Math.max(0, Math.floor(numberOrZero(sourceBoons.health)));
    base.exploration.boons.guard = Math.max(0, Math.floor(numberOrZero(sourceBoons.guard)));
    base.exploration.boons.mana = Math.max(0, Math.floor(numberOrZero(sourceBoons.mana)));
    if (sourceExploration.dungeonClears && typeof sourceExploration.dungeonClears === "object") {
      for (const [id, cleared] of Object.entries(sourceExploration.dungeonClears)) {
        if (typeof id === "string" && cleared) {
          base.exploration.dungeonClears[id] = true;
        }
      }
    }
    base.exploration.potionInventory = normalizePotionInventory(sourceExploration.potionInventory);
    base.exploration.potionCooldownBonus = clamp(Math.floor(numberOrZero(sourceExploration.potionCooldownBonus)), 0, 8);
    if (sourceExploration.position && typeof sourceExploration.position === "object") {
      const x = numberOrZero(sourceExploration.position.x);
      const z = numberOrZero(sourceExploration.position.z);
      if (Number.isFinite(x) && Number.isFinite(z)) {
        base.exploration.position = { x, z };
      }
    }
    if (sourceExploration.resources && typeof sourceExploration.resources === "object") {
      base.exploration.resources = {
        character: characterKey(sourceExploration.resources.character),
        health: numberOrZero(sourceExploration.resources.health),
        guard: numberOrZero(sourceExploration.resources.guard),
        mana: numberOrZero(sourceExploration.resources.mana)
      };
    }
    base.exploration.guidanceSeen = !!sourceExploration.guidanceSeen;

    if (base.exploration.quests.briarStalkers && base.exploration.quests.briarStalkers.state === "done") {
      const backfillEquipment = {
        knight: "knight_briarfall_hookblade",
        wizard: "wizard_briar_focus",
        ranger: "ranger_briarstring_bow"
      };
      for (const [character, equipmentId] of Object.entries(backfillEquipment)) {
        const progress = base.characters[character];
        if (validEquipmentForCharacter(character, equipmentId) && !progress.unlockedEquipment.includes(equipmentId)) {
          progress.unlockedEquipment.push(equipmentId);
        }
        if (!progress.perks.includes("briarfall_pathcraft")) {
          progress.perks.push("briarfall_pathcraft");
        }
      }
    }

    const sourceActive = source.activeGame && typeof source.activeGame === "object" ? source.activeGame : null;
    if (sourceActive && sourceActive.mode === "exploration") {
      base.activeGame = {
        mode: "exploration",
        character: characterKey(sourceActive.character),
        updatedAt: Math.max(0, Math.floor(numberOrZero(sourceActive.updatedAt)))
      };
    } else if (base.exploration.position || base.exploration.resources) {
      base.activeGame = {
        mode: "exploration",
        character: characterKey(base.exploration.resources && base.exploration.resources.character),
        updatedAt: 0
      };
    }
    return base;
  }

  function loadProgression() {
    try {
      return normalizeProgression(JSON.parse(localStorage.getItem(progressStorageKey) || "null"));
    } catch (error) {
      return defaultProgression();
    }
  }

  progression = loadProgression();

  function savedActiveGame() {
    if (!progression || !progression.activeGame || progression.activeGame.mode !== "exploration") {
      return null;
    }
    if (!progression.exploration.position && !progression.exploration.resources) {
      return null;
    }
    return {
      mode: "exploration",
      character: characterKey(progression.activeGame.character),
      updatedAt: progression.activeGame.updatedAt || 0
    };
  }

  function writeProgressionToStorage() {
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(progression));
      if (saveHint) {
        saveHint.textContent = "Saved locally";
      }
    } catch (error) {
      if (saveHint) {
        saveHint.textContent = "Local save unavailable";
      }
    }
  }

  function resetLocalProgression() {
    progression = defaultProgression();
    game.exploration.xp = 0;
    writeProgressionToStorage();
  }

  function getCharacterProgress(character = player.character) {
    const key = characterKey(character);
    if (characterProgressNeedsMigration(progression.characters[key], key)) {
      progression.characters[key] = normalizeCharacterProgress(progression.characters[key], key);
    }
    return progression.characters[key];
  }

  function levelFromXp(xp) {
    let level = 1;
    const total = Math.max(0, Math.floor(numberOrZero(xp)));
    while (level < 30 && total >= xpForLevel(level + 1)) {
      level += 1;
    }
    return level;
  }

  function getCharacterLevel(character = player.character) {
    return levelFromXp(getCharacterProgress(character).xp);
  }

  function abilityUnlockLevel(ability) {
    return abilityUnlockLevels[ability] || 1;
  }

  function abilityDisplayName(ability) {
    return abilityDisplayNames[ability] || "Ability";
  }

  function hasAbility(ability, character = player.character) {
    if (localGodModeEnabled()) {
      return true;
    }
    return getCharacterLevel(character) >= abilityUnlockLevel(ability);
  }

  function showAbilityLocked(ability) {
    showBanner(abilityDisplayName(ability) + " unlocks at level " + abilityUnlockLevel(ability), 2.3);
  }

  function potionSlotUnlockLevel(index) {
    return POTION_SLOT_UNLOCK_LEVELS[index] || POTION_SLOT_UNLOCK_LEVELS[POTION_SLOT_UNLOCK_LEVELS.length - 1] || 1;
  }

  function potionSlotsUnlockedForLevel(level, { godMode = false } = {}) {
    if (godMode) {
      return POTION_INVENTORY_CAPACITY;
    }
    const safeLevel = Math.max(1, Math.floor(numberOrZero(level)));
    return clamp(
      POTION_SLOT_UNLOCK_LEVELS.filter(unlockLevel => safeLevel >= unlockLevel).length,
      0,
      POTION_INVENTORY_CAPACITY
    );
  }

  function unlockedPotionSlotCount(character = player.character) {
    return potionSlotsUnlockedForLevel(getCharacterLevel(character), { godMode: localGodModeEnabled() });
  }

  function potionSlotUnlocks() {
    return POTION_SLOT_UNLOCK_LEVELS.slice(0, POTION_INVENTORY_CAPACITY).map((level, index) => ({
      level,
      name: "Potion pouch slot " + (index + 1)
    }));
  }

  function sortUnlocks(unlocks) {
    return unlocks.slice().sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }

  function characterLevelUnlocks(character) {
    const pouchSlots = potionSlotUnlocks();
    if (character === "wizard") {
      return sortUnlocks([
        ...pouchSlots,
        { level: 1, name: "Healing Draught" },
        { level: 3, name: "Healing Draught II" },
        { level: 4, name: "Arcane burst" },
        { level: 5, name: "Frostbind Bolt (F)" },
        { level: 7, name: "Healing Draught III" },
        { level: 8, name: "Crown of Storms (C)" }
      ]);
    }
    if (character === "ranger") {
      return sortUnlocks([
        ...pouchSlots,
        { level: 3, name: "Flaming Arrow" },
        { level: 5, name: "Parting Shot (F)" },
        { level: 7, name: "Heartseeker (C)" }
      ]);
    }
    return sortUnlocks([
      ...pouchSlots,
      { level: 3, name: "Shield bash" },
      { level: 5, name: "Warden's Resolve (F)" },
      { level: 8, name: "Sweeping Cut (C)" }
    ]);
  }

  function nextUnlockText(character = player.character) {
    const level = getCharacterLevel(character);
    const next = characterLevelUnlocks(character).find(unlock => unlock.level > level);
    return next ? next.name + " at level " + next.level : "Stats improve each level";
  }

  function levelRewardText(level, character = player.character) {
    const unlocked = characterLevelUnlocks(character).filter(unlock => unlock.level === level).map(unlock => unlock.name);
    return unlocked.length ? unlocked.join(" and ") + " unlocked" : "Stats increased";
  }

  function wizardPotionTier(level = getCharacterLevel("wizard"), tuning = combatTuningFor("wizard")) {
    if (level >= tuning.wizardPotionTier3Level) {
      return { tier: 3, heal: tuning.wizardPotionHealT3, cooldown: tuning.wizardPotionCooldownT3, radius: tuning.wizardPotionRadiusT3, splash: tuning.wizardPotionSplashHeal };
    }
    if (level >= tuning.wizardPotionTier2Level) {
      return { tier: 2, heal: tuning.wizardPotionHealT2, cooldown: tuning.wizardPotionCooldownT2, radius: tuning.wizardPotionRadiusT2, splash: 0 };
    }
    return { tier: 1, heal: tuning.wizardPotionHealT1, cooldown: tuning.wizardPotionCooldownT1, radius: tuning.wizardPotionRadiusT1, splash: 0 };
  }

  function progressionStatsFor(character = player.character) {
    const level = getCharacterLevel(character);
    const steps = Math.max(0, level - 1);
    const boons = progression.exploration.boons || { health: 0, guard: 0, mana: 0 };
    const kit = combatTuningFor(character);
    let stats;
    if (character === "wizard") {
      const potion = wizardPotionTier(level, kit);
      stats = {
        maxHealth: 48 + steps * 4 + (boons.health || 0),
        maxGuard: 0,
        maxMana: 72 + steps * 8 + (boons.mana || 0),
        manaRegen: 14 + steps * 0.55,
        potionCooldownMax: Math.max(kit.wizardPotionCooldownFloor, potion.cooldown - (progression.exploration.potionCooldownBonus || 0))
      };
    } else if (character === "ranger") {
      // Focus reuses the mana fields: small pool, fast regen.
      stats = {
        maxHealth: 54 + steps * 4 + (boons.health || 0),
        maxGuard: 0,
        maxMana: 64 + steps * 6 + (boons.mana || 0),
        manaRegen: 11.5 + steps * 0.45,
        potionCooldownMax: 18
      };
    } else {
      stats = {
        maxHealth: 78 + steps * 6 + (boons.health || 0),
        maxGuard: 68 + steps * 7 + (boons.guard || 0),
        maxMana: 0,
        manaRegen: 0,
        potionCooldownMax: 18
      };
    }
    // Equipped-kit stat identity (small sidegrade modifiers).
    stats.maxHealth += kit.kitHealthBonus || 0;
    if (stats.maxGuard > 0) {
      stats.maxGuard += kit.kitGuardBonus || 0;
    }
    if (stats.maxMana > 0) {
      stats.maxMana += kit.kitManaBonus || 0;
      stats.manaRegen *= kit.kitManaRegenMul || 1;
    }
    return stats;
  }

  function applyProgressionStats(resetVitals = false) {
    const stats = progressionStatsFor(player.character);
    const healthRatio = player.maxHealth > 0 ? clamp(player.health / player.maxHealth, 0, 1) : 1;
    const guardRatio = player.maxGuard > 0 ? clamp(player.guard / player.maxGuard, 0, 1) : 1;
    const manaRatio = player.maxMana > 0 ? clamp(player.mana / player.maxMana, 0, 1) : 1;
    player.kitMoveSpeedMul = combatTuningFor(player.character).kitMoveSpeedMul || 1;
    player.maxHealth = stats.maxHealth;
    player.maxGuard = stats.maxGuard;
    player.maxMana = stats.maxMana;
    player.manaRegen = stats.manaRegen;
    player.potionCooldownMax = stats.potionCooldownMax;
    if (resetVitals) {
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
      player.potionCooldown = 0;
      player.secondaryCooldown = 0;
      player.attackCooldown = 0;
    } else {
      player.health = clamp(Math.max(1, healthRatio * player.maxHealth), 1, player.maxHealth);
      player.guard = player.maxGuard > 0 ? clamp(guardRatio * player.maxGuard, 0, player.maxGuard) : 0;
      player.mana = player.maxMana > 0 ? clamp(manaRatio * player.maxMana, 0, player.maxMana) : 0;
      player.potionCooldown = Math.min(player.potionCooldown, player.potionCooldownMax);
    }
  }

  function addProgressionBoon(boon) {
    const boons = progression.exploration.boons;
    boons.health += Math.max(0, Math.floor(numberOrZero(boon.health)));
    boons.guard += Math.max(0, Math.floor(numberOrZero(boon.guard)));
    boons.mana += Math.max(0, Math.floor(numberOrZero(boon.mana)));
    if (boon.potionCooldown) {
      progression.exploration.potionCooldownBonus = clamp(progression.exploration.potionCooldownBonus + Math.floor(numberOrZero(boon.potionCooldown)), 0, 8);
    }
    applyProgressionStats(false);
  }

  function captureExplorationProgress() {
    if (!progression || !progression.exploration) {
      return;
    }
    const exploration = progression.exploration;
    if (game.mode === "exploration" && game.quests.length > 0) {
      exploration.quests = {};
      for (const quest of game.quests) {
        exploration.quests[quest.id] = { state: quest.state, progress: quest.progress };
      }
      exploration.discovered = Array.from(game.exploration.discovered || []);
      exploration.respawnTownId = game.exploration.respawnTownId || "";
      exploration.respawnLocal = game.exploration.respawnLocal
        ? { x: game.exploration.respawnLocal.x, z: game.exploration.respawnLocal.z }
        : null;
      exploration.potionInventory = normalizePotionInventory(exploration.potionInventory);
      exploration.completed = !!game.exploration.completed;
      if (!localGodModeEnabled()) {
        exploration.horseUnlocked = exploration.horseUnlocked || (!!game.exploration.horse && game.exploration.horse.mountId !== "drake");
      }
    }
    if (game.mode === "exploration" && game.state === "playing" && !localPlayerInSharedActivity()) {
      const local = explorationLocalPosition(player.position, new THREE.Vector3());
      exploration.position = {
        x: Math.round(local.x * 100) / 100,
        z: Math.round(local.z * 100) / 100
      };
      exploration.resources = {
        character: player.character,
        health: Math.round(player.health * 10) / 10,
        guard: Math.round(player.guard * 10) / 10,
        mana: Math.round(player.mana * 10) / 10
      };
      progression.activeGame = {
        mode: "exploration",
        character: player.character,
        updatedAt: Date.now()
      };
    }
  }

  function saveProgress() {
    if (!progression) {
      return;
    }
    captureExplorationProgress();
    writeProgressionToStorage();
  }

  function applySavedExplorationProgress() {
    const saved = progression.exploration;
    for (const quest of game.quests) {
      const savedQuest = saved.quests && saved.quests[quest.id];
      if (!savedQuest) {
        continue;
      }
      quest.state = ["available", "active", "ready", "done"].includes(savedQuest.state) ? savedQuest.state : quest.state;
      quest.progress = clamp(Math.floor(numberOrZero(savedQuest.progress)), 0, quest.target);
      if (quest.progress >= quest.target && quest.state === "active") {
        quest.state = "ready";
      }
      if (quest.id === "horse" && quest.state === "done") {
        saved.horseUnlocked = true;
      }
      if (quest.id === "skyDrake" && quest.state === "done") {
        saved.drakeUnlocked = true;
      }
    }
    game.exploration.discovered = new Set(Array.isArray(saved.discovered) ? saved.discovered : []);
    game.exploration.respawnTownId = typeof saved.respawnTownId === "string" ? saved.respawnTownId : "";
    game.exploration.respawnLocal = normalizeRespawnLocal(saved.respawnLocal, game.exploration.radius);
    game.exploration.respawnPoint = null;
    game.exploration.completed = !!saved.completed;
  }

  function savedExplorationWorldPosition() {
    const position = progression.exploration.position;
    if (!position) {
      return null;
    }
    const x = numberOrZero(position.x);
    const z = numberOrZero(position.z);
    if (!Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x, z) > game.exploration.radius - 3) {
      return null;
    }
    return explorationToWorld(x, z, new THREE.Vector3());
  }

  function restoreSavedResources() {
    const resources = progression.exploration.resources;
    if (!resources || resources.character !== player.character) {
      return;
    }
    player.health = clamp(resources.health, 1, player.maxHealth);
    player.guard = player.maxGuard > 0 ? clamp(resources.guard, 0, player.maxGuard) : 0;
    player.mana = player.maxMana > 0 ? clamp(resources.mana, 0, player.maxMana) : 0;
  }

  function storedPotions() {
    if (!progression || !progression.exploration) {
      return [];
    }
    progression.exploration.potionInventory = normalizePotionInventory(progression.exploration.potionInventory);
    return progression.exploration.potionInventory;
  }

  function storedPotionFromDrop(potion) {
    if (!potion || potion.kind === "wizard") {
      return null;
    }
    return normalizePotionInventoryItem({
      kind: potion.fullHeal || potion.kind === "full" ? "full" : "small",
      healAmount: potion.healAmount
    });
  }

  function storedPotionFromMessage(message) {
    return normalizePotionInventoryItem({
      kind: message.fullHeal || message.kind === "full" ? "full" : "small",
      healAmount: message.healAmount
    });
  }

  function storedPotionLabel(item) {
    if (!item) {
      return "-";
    }
    return item.kind === "full" ? "Full" : "+" + Math.ceil(item.healAmount || 0);
  }

  function storedPotionName(item) {
    if (!item) {
      return "Empty potion slot";
    }
    return item.kind === "full" ? "Full recovery potion" : "Health potion " + storedPotionLabel(item);
  }

  function canStorePotionDrop(potion) {
    return !!storedPotionFromDrop(potion) && storedPotions().length < unlockedPotionSlotCount();
  }

  function potionPickupColor(potion) {
    if (!potion) {
      return 0xff7f96;
    }
    if (potion.kind === "wizard") {
      return 0x7ae8ff;
    }
    return potion.fullHeal ? 0xffd56a : 0xff7f96;
  }

  function storePotionItem(item, { showMessage = true } = {}) {
    const normalized = normalizePotionInventoryItem(item);
    if (!normalized) {
      return false;
    }
    const inventory = storedPotions();
    const unlockedSlots = unlockedPotionSlotCount();
    if (inventory.length >= unlockedSlots) {
      if (showMessage) {
        showBanner(unlockedSlots > 0 ? "Potion pouch full" : "Potion slot unlocks at level " + potionSlotUnlockLevel(0), 1.8);
      }
      return false;
    }
    inventory.push(normalized);
    if (showMessage) {
      showBanner("Stored " + storedPotionName(normalized) + " " + inventory.length + "/" + unlockedSlots, 2.2);
      playSfx("ui", 0.75);
    }
    saveProgress();
    updateHud();
    return true;
  }

  function applyStoredPotion(item) {
    const beforeHeal = player.health;
    player.health = item.kind === "full"
      ? player.maxHealth
      : Math.min(player.maxHealth, player.health + (item.healAmount || 0));
    const healed = Math.ceil(player.health - beforeHeal);
    spawnImpact(player.position, item.kind === "full" ? 0xffd56a : 0xff7f96, 18);
    playSfx("potion", item.kind === "full" ? 1.15 : 0.9);
    showBanner(item.kind === "full" ? "Used full recovery potion" : "Used potion +" + healed);
    sendOnlineMessage({ kind: "state", state: serializePlayerState() });
  }

  function useStoredPotionAtIndex(index = 0) {
    const inventory = storedPotions();
    if (index >= unlockedPotionSlotCount()) {
      showBanner("Potion slot unlocks at level " + potionSlotUnlockLevel(index), 1.8);
      return false;
    }
    const item = inventory[index];
    if (!item) {
      showBanner("No stored potion", 1.6);
      return false;
    }
    if (player.health >= player.maxHealth) {
      showBanner("Health already full", 1.6);
      return false;
    }
    inventory.splice(index, 1);
    applyStoredPotion(item);
    saveProgress();
    updateHud();
    return true;
  }

  function handlePotionHotkey() {
    return useStoredPotionAtIndex(0);
  }

  const potionSlotButtons = [];

  function ensurePotionSlotButtons() {
    if (!potionSlots || potionSlotButtons.length === POTION_INVENTORY_CAPACITY) {
      return;
    }
    potionSlots.replaceChildren();
    potionSlotButtons.length = 0;
    for (let i = 0; i < POTION_INVENTORY_CAPACITY; i += 1) {
      const button = document.createElement("button");
      button.className = "potion-slot";
      button.type = "button";
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "potion-slot-icon");
      icon.setAttribute("viewBox", "0 0 32 32");
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = '<path d="M12 3h8M14 3v7l-5 8a7 7 0 0 0 6 11h2a7 7 0 0 0 6-11l-5-8V3"/><path d="M10 21h12"/>';
      const label = document.createElement("span");
      label.className = "potion-slot-label";
      button.append(icon, label);
      button.addEventListener("click", () => useStoredPotionAtIndex(i));
      potionSlots.appendChild(button);
      potionSlotButtons.push(button);
    }
  }

  function updatePotionInventoryUi() {
    if (!potionInventory || !potionSlots) {
      return;
    }
    const visible = game.mode === "exploration" && !!progression && !!progression.exploration;
    potionInventory.hidden = !visible;
    if (!visible) {
      return;
    }
    ensurePotionSlotButtons();
    const inventory = storedPotions();
    const unlockedSlots = unlockedPotionSlotCount();
    for (let i = 0; i < POTION_INVENTORY_CAPACITY; i += 1) {
      const item = inventory[i] || null;
      const button = potionSlotButtons[i];
      if (!button) {
        continue;
      }
      const locked = i >= unlockedSlots;
      const label = button.querySelector(".potion-slot-label");
      if (label) {
        label.textContent = locked ? "Lv " + potionSlotUnlockLevel(i) : storedPotionLabel(item);
      }
      button.classList.toggle("filled", !!item);
      button.classList.toggle("full", item && item.kind === "full");
      button.classList.toggle("empty", !item && !locked);
      button.classList.toggle("locked", locked);
      button.disabled = locked || !item;
      button.title = locked
        ? "Potion slot unlocks at level " + potionSlotUnlockLevel(i) + (item ? " - " + storedPotionName(item) + " waiting here" : "")
        : item ? storedPotionName(item) + " - use when wounded" : "Empty potion slot";
      button.setAttribute("aria-label", button.title);
    }
  }

  function restoreSavedTownRespawnPoint() {
    return restoreTownRespawnPoint(game.exploration, explorationToWorld);
  }

  function setExplorationRespawnTown(village) {
    return setTownRespawnPoint(game.exploration, village, explorationToWorld);
  }

  function currentExplorationRespawnPosition() {
    return currentTownRespawnPosition(game.exploration, explorationToWorld);
  }

  function explorationGuidanceText() {
    const level = getCharacterLevel();
    if (localGodModeEnabled()) {
      return "Local god mode enabled: all kits, mounts, tack, and abilities are available for testing. Press G for kits and M for mounts.";
    }
    if (!progression.exploration.guidanceSeen) {
      return "Talk to Sella by the homestead to start mapping the valley. Progress saves on this browser.";
    }
    if (player.character === "wizard" && !hasAbility("burst")) {
      return "Level " + level + " wizard. " + nextUnlockText() + ".";
    }
    if (player.character === "knight" && !hasAbility("bash")) {
      return "Level " + level + " knight. " + nextUnlockText() + ".";
    }
    return "Follow quest markers and return to the giver for rewards.";
  }

  function defaultArenaActivity() {
    return {
      active: false,
      phase: "idle",
      activityId: "",
      wave: 0,
      center: { x: 0, z: 0 },
      radius: arenaRadius,
      participants: [],
      pendingParticipants: [],
      optedOutParticipants: [],
      startedBy: "",
      nextWaveIn: 0,
      exitOpen: false,
      endedReason: null,
      returnPosition: null,
      infirmaryPosition: null,
      localReturnPosition: null,
      localOptOutActivityId: "",
      localSpectatorActivityId: "",
      localPendingActivityId: ""
    };
  }

  function defaultDungeonActivity() {
    return {
      active: false,
      phase: "idle",
      activityId: "",
      dungeonId: "",
      name: "",
      center: { x: 0, z: 0 },
      radius: DUNGEON_RADIUS,
      participants: [],
      pendingParticipants: [],
      optedOutParticipants: [],
      defeatedParticipants: [],
      rewardedClaimIds: [],
      startedBy: "",
      endedReason: null,
      returnPosition: null,
      recoveryPosition: null,
      localReturnPosition: null,
      localOptOutActivityId: "",
      localSpectatorActivityId: "",
      localPendingActivityId: "",
      localRewardClaimIds: []
    };
  }

  const dungeonDefinitions = {
    [BELLWATER_DUNGEON_ID]: {
      id: BELLWATER_DUNGEON_ID,
      name: BELLWATER_DUNGEON_NAME,
      shortName: "Underworks",
      serviceLabel: "Enter Underworks",
      clearXp: BELLWATER_DUNGEON_CLEAR_XP,
      firstClearBoon: { health: 3, guard: 3, mana: 3 },
      recoveryFallback: { x: 63, z: 84 },
      encounter: ["barbarian", "bonewarden", "briarBeast", "barbarian", "bogLurker", "barbarian"],
      startCopy: BELLWATER_DUNGEON_NAME + " sealed - clear the chamber",
      activeCopy: BELLWATER_DUNGEON_NAME + " already active",
      requestCopy: "Ask the host to open the Underworks",
      queuedCopy: "The Underworks are sealed - wait for the return bell",
      readyCopy: "Bellwater return bell is open",
      encounterCopy: "Bellwater chamber sealed - clear the sluice",
      clearCopy: "Bellwater chamber cleared",
      defeatCopy: "Recovered at the Bellwater grate",
      completeCopy: "Returned from the Underworks",
      yieldCopy: "Rang out from the Underworks",
      serviceBody: "Crownford's wall has drains under it older than my better hammers. Storm silt jammed the sluices, then things with teeth found the dry ledges. Clear the bell chambers, keep to the stone, and come back with your boots full of water instead of blood.",
      serviceStatusOpen: "The Bellwater grate is open. Clear the sealed chamber, or ring out before the room is clear.",
      serviceStatusBlocked: "The Underworks are sealed until the current activity ends."
    },
    [SILTWELL_DUNGEON_ID]: {
      id: SILTWELL_DUNGEON_ID,
      name: SILTWELL_DUNGEON_NAME,
      shortName: "Siltwell",
      serviceLabel: "Enter Siltwell",
      clearXp: SILTWELL_DUNGEON_CLEAR_XP,
      firstClearBoon: { health: 4, guard: 2, mana: 2 },
      recoveryFallback: { x: -96, z: -116 },
      encounter: ["spider", "spider", "bonewarden", "barbarian", "spider", "bonewarden"],
      startCopy: SILTWELL_DUNGEON_NAME + " sealed - clear the wellstone chamber",
      activeCopy: SILTWELL_DUNGEON_NAME + " already active",
      requestCopy: "Ask the host to open the cistern",
      queuedCopy: "The cistern is sealed - wait by the well bell",
      readyCopy: "Siltwell well bell is open",
      encounterCopy: "Siltwell chamber sealed - clear the wellstone",
      clearCopy: "Siltwell chamber cleared",
      defeatCopy: "Recovered at the Siltwell shade post",
      completeCopy: "Returned from Siltwell Cistern",
      yieldCopy: "Rang out from Siltwell Cistern",
      serviceBody: "The old cistern keeps the desert road alive when the wells run mean. Spiders webbed the rope slots, and bone-things woke where the water should be. If you go in, clear the chamber fast and pull the well bell before the sand changes its mind.",
      serviceStatusOpen: "The Siltwell mouth is open. Clear the wellstone chamber, or ring out before the room is clear.",
      serviceStatusBlocked: "Siltwell is sealed until the current activity ends."
    }
  };

  function dungeonDefinition(dungeonId) {
    return dungeonDefinitions[dungeonId] || dungeonDefinitions[BELLWATER_DUNGEON_ID];
  }

  function activeDungeonDefinition() {
    const activity = game.exploration.dungeonActivity;
    return dungeonDefinition(activity.dungeonId || BELLWATER_DUNGEON_ID);
  }

  function arenaActivityActive() {
    return game.mode === "exploration" && !!game.exploration.arenaActivity.active;
  }

  function dungeonActivityActive() {
    return game.mode === "exploration" && !!game.exploration.dungeonActivity.active;
  }

  function localPlayerInArenaActivity() {
    const activity = game.exploration.arenaActivity;
    if (!arenaActivityActive()) {
      return false;
    }
    if (activity.activityId && activity.localOptOutActivityId === activity.activityId) {
      return false;
    }
    return !activity.participants.length || activity.participants.includes(online.localId);
  }

  function localPlayerInDungeonActivity() {
    const activity = game.exploration.dungeonActivity;
    if (!dungeonActivityActive()) {
      return false;
    }
    if (activity.activityId && activity.localOptOutActivityId === activity.activityId) {
      return false;
    }
    return !activity.participants.length || activity.participants.includes(online.localId);
  }

  function localPlayerInSharedActivity() {
    return localPlayerInArenaActivity() || localPlayerInDungeonActivity();
  }

  function activeCombatActivity() {
    if (arenaActivityActive()) {
      return game.exploration.arenaActivity;
    }
    if (dungeonActivityActive()) {
      return game.exploration.dungeonActivity;
    }
    return null;
  }

  function resetArenaActivityState() {
    game.exploration.arenaActivity = defaultArenaActivity();
  }

  function resetDungeonActivityState() {
    game.exploration.dungeonActivity = defaultDungeonActivity();
  }

  function serializeArenaActivityState() {
    const activity = game.exploration.arenaActivity;
    return {
      active: !!activity.active,
      phase: activity.phase,
      activityId: activity.activityId,
      wave: activity.wave,
      center: activity.center,
      radius: activity.radius,
      participants: activity.participants.slice(0, 8),
      pendingParticipants: activity.pendingParticipants.slice(0, 8),
      startedBy: activity.startedBy,
      nextWaveIn: activity.nextWaveIn,
      exitOpen: !!activity.exitOpen,
      endedReason: activity.endedReason
    };
  }

  function serializeDungeonActivityState() {
    const activity = game.exploration.dungeonActivity;
    return {
      active: !!activity.active,
      phase: activity.phase,
      activityId: activity.activityId,
      dungeonId: activity.dungeonId,
      name: activity.name,
      center: activity.center,
      radius: activity.radius,
      participants: activity.participants.slice(0, 8),
      pendingParticipants: activity.pendingParticipants.slice(0, 8),
      defeatedParticipants: activity.defeatedParticipants.slice(0, 8),
      rewardedClaimIds: activity.rewardedClaimIds.slice(0, 8),
      startedBy: activity.startedBy,
      endedReason: activity.endedReason || null
    };
  }

  function arenaParticipantsForRoom() {
    const participants = new Set([online.localId]);
    for (const [id, remote] of online.remotePlayers) {
      if (remote.playing !== false) {
        participants.add(id);
      }
    }
    return Array.from(participants).slice(0, 8);
  }

  function activityParticipantsForRoom() {
    return arenaParticipantsForRoom();
  }

  function arenaListIncludes(list, id) {
    return Array.isArray(list) && list.includes(id);
  }

  function sendArenaQueueNotice(targetId, ready = false) {
    const activity = game.exploration.arenaActivity;
    if (online.role !== "host" || !targetId || !activity.active) {
      return;
    }
    sendOnlineMessage({
      kind: "arenaQueued",
      targetId,
      activityId: activity.activityId,
      ready,
      phase: activity.phase
    });
  }

  function sendDungeonQueueNotice(targetId, ready = false) {
    const activity = game.exploration.dungeonActivity;
    if (online.role !== "host" || !targetId || !activity.active) {
      return;
    }
    sendOnlineMessage({
      kind: "dungeonQueued",
      targetId,
      activityId: activity.activityId,
      dungeonId: activity.dungeonId,
      ready,
      phase: activity.phase
    });
  }

  function maybeQueueArenaLateParticipant(id, state) {
    const activity = game.exploration.arenaActivity;
    if (online.role !== "host" || !activity.active || !id || id === online.localId) {
      return false;
    }
    if (!state || state.playing !== true) {
      return false;
    }
    if (arenaListIncludes(activity.participants, id) || arenaListIncludes(activity.optedOutParticipants, id)) {
      return false;
    }
    if (activity.phase === "intermission" && activity.exitOpen) {
      activity.participants = Array.from(new Set([...activity.participants, id])).slice(0, 8);
      activity.pendingParticipants = activity.pendingParticipants.filter(participant => participant !== id);
      sendArenaQueueNotice(id, true);
      sendWorldSnapshot(true);
      return true;
    }
    if (!arenaListIncludes(activity.pendingParticipants, id)) {
      activity.pendingParticipants = [...activity.pendingParticipants, id].slice(0, 8);
      sendArenaQueueNotice(id, false);
      sendWorldSnapshot(true);
      return true;
    }
    return false;
  }

  function maybeQueueDungeonLateParticipant(id, state) {
    const activity = game.exploration.dungeonActivity;
    if (online.role !== "host" || !activity.active || !id || id === online.localId) {
      return false;
    }
    if (!state || state.playing !== true) {
      return false;
    }
    if (arenaListIncludes(activity.participants, id) || arenaListIncludes(activity.optedOutParticipants, id)) {
      return false;
    }
    if (!arenaListIncludes(activity.pendingParticipants, id)) {
      activity.pendingParticipants = [...activity.pendingParticipants, id].slice(0, 8);
      sendDungeonQueueNotice(id, false);
      sendWorldSnapshot(true);
      return true;
    }
    return false;
  }

  function promotePendingArenaParticipants() {
    const activity = game.exploration.arenaActivity;
    if (!activity.active || !activity.pendingParticipants.length) {
      return 0;
    }
    const nextParticipants = new Set(activity.participants);
    let promoted = 0;
    for (const id of activity.pendingParticipants) {
      if (!id || arenaListIncludes(activity.optedOutParticipants, id)) {
        continue;
      }
      if (!nextParticipants.has(id)) {
        nextParticipants.add(id);
        promoted += 1;
        sendArenaQueueNotice(id, true);
      }
    }
    activity.participants = Array.from(nextParticipants).slice(0, 8);
    activity.pendingParticipants = [];
    return promoted;
  }

  function removeArenaParticipant(id) {
    const activity = game.exploration.arenaActivity;
    if (!activity.active || !id) {
      return false;
    }
    const pendingBefore = activity.pendingParticipants.length;
    activity.pendingParticipants = activity.pendingParticipants.filter(participant => participant !== id);
    const nextParticipants = activity.participants.filter(participant => participant !== id);
    if (nextParticipants.length === activity.participants.length) {
      if (pendingBefore !== activity.pendingParticipants.length) {
        sendWorldSnapshot(true);
        return true;
      }
      return false;
    }
    activity.participants = nextParticipants;
    activity.optedOutParticipants = Array.from(new Set([...activity.optedOutParticipants, id])).slice(0, 8);
    if (activity.participants.length === 0 || (activity.participants.length === 1 && activity.participants[0] === online.localId && online.role !== "host")) {
      endCrownringArenaActivity("yield");
      return true;
    }
    sendWorldSnapshot(true);
    return true;
  }

  function removeDungeonParticipant(id) {
    const activity = game.exploration.dungeonActivity;
    if (!activity.active || !id) {
      return false;
    }
    const pendingBefore = activity.pendingParticipants.length;
    activity.pendingParticipants = activity.pendingParticipants.filter(participant => participant !== id);
    const nextParticipants = activity.participants.filter(participant => participant !== id);
    if (nextParticipants.length === activity.participants.length) {
      if (pendingBefore !== activity.pendingParticipants.length) {
        sendWorldSnapshot(true);
        return true;
      }
      return false;
    }
    activity.participants = nextParticipants;
    activity.optedOutParticipants = Array.from(new Set([...activity.optedOutParticipants, id])).slice(0, 8);
    if (activity.participants.length === 0 || (activity.participants.length === 1 && activity.participants[0] === online.localId && online.role !== "host")) {
      endDungeonActivity("yield");
      return true;
    }
    sendWorldSnapshot(true);
    return true;
  }

  function enterLocalArenaActivity() {
    const activity = game.exploration.arenaActivity;
    if (!activity.active) {
      return;
    }
    activity.localReturnPosition = { x: player.position.x, z: player.position.z };
    closeQuestDialog();
    restoreGameplayControlAfterActivityEntry();
    parkHorseNear(player.position);
    clearPlayerProjectiles();
    setArenaVisible(true);
    scene.fog.density = 0.018;
    player.position.set(activity.center?.x || 0, 0, activity.center?.z || 0);
    player.velocity.set(0, 0, 0);
    player.yaw = 0;
    player.group.position.copy(player.position);
    player.group.rotation.y = 0;
    game.cameraYaw = 0;
    playSfx("arenaStart", 1);
    showBanner("Crownring opened - press Y to yield", 3);
    updateHud();
  }

  function moveLocalArenaSpectatorToInfirmary() {
    if (game.state !== "playing") {
      return;
    }
    const recovery = crownfordInfirmaryPosition();
    setArenaVisible(false);
    scene.fog.density = 0.0065;
    parkHorseNear(recovery);
    player.position.copy(recovery);
    player.velocity.set(0, 0, 0);
    if (player.group) {
      player.group.position.copy(player.position);
    }
    game.cameraYaw = Math.PI;
    updateHud();
  }

  function exitLocalArenaActivity(reason = "yield") {
    const activity = game.exploration.arenaActivity;
    const defeated = reason === "defeat";
    const returnPosition = defeated
      ? crownfordInfirmaryPosition()
      : new THREE.Vector3(activity.localReturnPosition?.x ?? activity.returnPosition?.x ?? game.exploration.spawn.x, 0, activity.localReturnPosition?.z ?? activity.returnPosition?.z ?? game.exploration.spawn.z);
    setArenaVisible(false);
    scene.fog.density = 0.0065;
    game.wave = 0;
    game.nextWaveIn = 0;
    player.position.copy(returnPosition);
    player.velocity.set(0, 0, 0);
    player.hurtTimer = 0;
    if (defeated) {
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
    }
    player.group.position.copy(player.position);
    player.group.rotation.y = player.yaw;
    parkHorseNear(player.position);
    spawnImpact(player.position, defeated ? 0xffd889 : 0x7ae8ff, 20);
    playSfx(defeated ? "arenaDefeat" : "arenaYield", 1.1);
    showBanner(defeated ? "Recovered at Crownford infirmary" : "Yielded from the Crownring", 2.6);
    saveProgress();
    updateHud();
  }

  function enterLocalDungeonActivity() {
    const activity = game.exploration.dungeonActivity;
    if (!activity.active) {
      return;
    }
    activity.localReturnPosition = { x: player.position.x, z: player.position.z };
    closeQuestDialog();
    restoreGameplayControlAfterActivityEntry();
    parkHorseNear(player.position);
    clearPlayerProjectiles();
    setDungeonVisible(true);
    scene.fog.density = 0.026;
    player.position.set(activity.center?.x || 0, 0, activity.center?.z || 0);
    player.velocity.set(0, 0, 0);
    player.yaw = 0;
    player.group.position.copy(player.position);
    player.group.rotation.y = 0;
    game.cameraYaw = 0;
    playSfx("arenaStart", 0.72);
    showBanner(activeDungeonDefinition().startCopy, 3);
    updateHud();
  }

  function moveLocalDungeonSpectatorToEntrance() {
    if (game.state !== "playing") {
      return;
    }
    const recovery = dungeonRecoveryPosition(game.exploration.dungeonActivity.dungeonId || BELLWATER_DUNGEON_ID);
    setDungeonVisible(false);
    scene.fog.density = 0.0065;
    parkHorseNear(recovery);
    player.position.copy(recovery);
    player.velocity.set(0, 0, 0);
    if (player.group) {
      player.group.position.copy(player.position);
    }
    game.cameraYaw = Math.PI;
    updateHud();
  }

  function exitLocalDungeonActivity(reason = "yield") {
    const activity = game.exploration.dungeonActivity;
    const defeated = reason === "defeat";
    const completed = reason === "complete";
    const def = activeDungeonDefinition();
    const fallback = dungeonRecoveryPosition(def.id);
    const returnPosition = defeated
      ? fallback
      : new THREE.Vector3(activity.localReturnPosition?.x ?? activity.returnPosition?.x ?? fallback.x, 0, activity.localReturnPosition?.z ?? activity.returnPosition?.z ?? fallback.z);
    setDungeonVisible(false);
    scene.fog.density = 0.0065;
    player.position.copy(returnPosition);
    player.velocity.set(0, 0, 0);
    player.hurtTimer = 0;
    if (defeated || completed) {
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
    }
    player.group.position.copy(player.position);
    player.group.rotation.y = player.yaw;
    parkHorseNear(player.position);
    spawnImpact(player.position, defeated ? 0xffd889 : 0x7ae8ff, 20);
    playSfx(defeated ? "arenaDefeat" : completed ? "arenaMilestone" : "arenaYield", 0.95);
    showBanner(defeated ? def.defeatCopy : completed ? def.completeCopy : def.yieldCopy, 2.6);
    saveProgress();
    updateHud();
  }

  function applyArenaActivitySnapshot(snapshot) {
    if (!snapshot || online.role !== "join") {
      return;
    }
    const activity = game.exploration.arenaActivity;
    const wasLocal = localPlayerInArenaActivity();
    const previousActivityId = activity.activityId;
    const nextActivityId = snapshot.activityId || "";
    const sameActivity = previousActivityId === nextActivityId;
    const localReturnPosition = activity.localReturnPosition;
    const localOptOutActivityId = activity.localOptOutActivityId;
    const localSpectatorActivityId = activity.localSpectatorActivityId;
    const localPendingActivityId = activity.localPendingActivityId;
    activity.active = !!snapshot.active;
    activity.phase = snapshot.phase || (activity.active ? "wave" : "idle");
    activity.activityId = nextActivityId;
    activity.localReturnPosition = sameActivity ? localReturnPosition : null;
    activity.localOptOutActivityId = sameActivity ? localOptOutActivityId : "";
    activity.localSpectatorActivityId = sameActivity ? localSpectatorActivityId : "";
    activity.localPendingActivityId = sameActivity ? localPendingActivityId : "";
    activity.wave = Math.max(0, Math.floor(numberOrZero(snapshot.wave)));
    activity.center = snapshot.center || { x: 0, z: 0 };
    activity.radius = Math.max(8, numberOrZero(snapshot.radius) || arenaRadius);
    activity.participants = Array.isArray(snapshot.participants) ? snapshot.participants.slice(0, 8) : [];
    activity.pendingParticipants = Array.isArray(snapshot.pendingParticipants) ? snapshot.pendingParticipants.slice(0, 8) : [];
    activity.optedOutParticipants = sameActivity ? activity.optedOutParticipants : [];
    activity.startedBy = snapshot.startedBy || "";
    activity.nextWaveIn = Math.max(0, numberOrZero(snapshot.nextWaveIn));
    activity.exitOpen = !!snapshot.exitOpen;
    activity.endedReason = snapshot.endedReason || null;
    const nowLocal = localPlayerInArenaActivity();
    const pendingLocal = arenaListIncludes(activity.pendingParticipants, online.localId);
    if (nowLocal && !wasLocal) {
      enterLocalArenaActivity();
    } else if (!nowLocal && wasLocal) {
      exitLocalArenaActivity(activity.endedReason || "yield");
    } else {
      setArenaVisible(nowLocal);
    }
    if (!nowLocal && activity.active) {
      if (game.state === "playing" && activity.localSpectatorActivityId !== activity.activityId && activity.localOptOutActivityId !== activity.activityId) {
        moveLocalArenaSpectatorToInfirmary();
        activity.localSpectatorActivityId = activity.activityId;
      }
      if (pendingLocal && activity.localPendingActivityId !== activity.activityId) {
        activity.localPendingActivityId = activity.activityId;
        showBanner("Queued for the next Crownring bell", 2.4);
      } else if (!wasLocal && !pendingLocal && activity.localSpectatorActivityId === activity.activityId) {
        showBanner("Crownring match in progress", 2.2);
      }
    }
  }

  function applyDungeonActivitySnapshot(snapshot) {
    if (!snapshot || online.role !== "join") {
      return;
    }
    const activity = game.exploration.dungeonActivity;
    const wasLocal = localPlayerInDungeonActivity();
    const previousActivityId = activity.activityId;
    const nextActivityId = snapshot.activityId || "";
    const sameActivity = previousActivityId === nextActivityId;
    const localReturnPosition = activity.localReturnPosition;
    const localOptOutActivityId = activity.localOptOutActivityId;
    const localSpectatorActivityId = activity.localSpectatorActivityId;
    const localPendingActivityId = activity.localPendingActivityId;
    const localRewardClaimIds = activity.localRewardClaimIds;
    activity.active = !!snapshot.active;
    activity.phase = activity.active ? (snapshot.phase || "active") : (snapshot.phase || "idle");
    activity.activityId = nextActivityId;
    activity.dungeonId = snapshot.dungeonId || BELLWATER_DUNGEON_ID;
    const def = dungeonDefinition(activity.dungeonId);
    activity.name = snapshot.name || def.name;
    activity.localReturnPosition = sameActivity ? localReturnPosition : null;
    activity.localOptOutActivityId = sameActivity ? localOptOutActivityId : "";
    activity.localSpectatorActivityId = sameActivity ? localSpectatorActivityId : "";
    activity.localPendingActivityId = sameActivity ? localPendingActivityId : "";
    activity.localRewardClaimIds = sameActivity ? localRewardClaimIds : [];
    activity.center = snapshot.center || { x: 0, z: 0 };
    activity.radius = Math.max(8, numberOrZero(snapshot.radius) || DUNGEON_RADIUS);
    activity.participants = Array.isArray(snapshot.participants) ? snapshot.participants.slice(0, 8) : [];
    activity.pendingParticipants = Array.isArray(snapshot.pendingParticipants) ? snapshot.pendingParticipants.slice(0, 8) : [];
    activity.defeatedParticipants = Array.isArray(snapshot.defeatedParticipants) ? snapshot.defeatedParticipants.slice(0, 8) : [];
    activity.rewardedClaimIds = Array.isArray(snapshot.rewardedClaimIds) ? snapshot.rewardedClaimIds.slice(0, 8) : [];
    activity.startedBy = snapshot.startedBy || "";
    activity.endedReason = snapshot.endedReason || null;
    const nowLocal = localPlayerInDungeonActivity();
    const pendingLocal = arenaListIncludes(activity.pendingParticipants, online.localId);
    if (nowLocal && !wasLocal) {
      enterLocalDungeonActivity();
    } else if (!nowLocal && wasLocal) {
      exitLocalDungeonActivity(activity.phase === "completed" ? "complete" : activity.endedReason || "yield");
    } else {
      setDungeonVisible(nowLocal);
    }
    if (!nowLocal && activity.active) {
      if (game.state === "playing" && activity.localSpectatorActivityId !== activity.activityId && activity.localOptOutActivityId !== activity.activityId) {
        moveLocalDungeonSpectatorToEntrance();
        activity.localSpectatorActivityId = activity.activityId;
      }
      if (pendingLocal && activity.localPendingActivityId !== activity.activityId) {
        activity.localPendingActivityId = activity.activityId;
        showBanner(def.queuedCopy, 2.6);
      }
    }
  }

  function tagArenaActor(actor) {
    const activity = game.exploration.arenaActivity;
    if (!activity.active || !actor) {
      return actor;
    }
    actor.activityType = "arena";
    actor.activityId = activity.activityId;
    return actor;
  }

  function tagDungeonActor(actor) {
    const activity = game.exploration.dungeonActivity;
    if (!activity.active || !actor) {
      return actor;
    }
    actor.activityType = "dungeon";
    actor.activityId = activity.activityId;
    return actor;
  }

  function tagActiveCombatActor(actor) {
    const activity = activeCombatActivity();
    if (!activity || !actor) {
      return actor;
    }
    actor.activityType = activity === game.exploration.dungeonActivity ? "dungeon" : "arena";
    actor.activityId = activity.activityId;
    return actor;
  }

  function enemyMatchesActiveCombat(enemy) {
    const activity = activeCombatActivity();
    return !activity || (enemy && enemy.activityId === activity.activityId);
  }

  function clearPlayerProjectiles() {
    for (const projectile of game.playerProjectiles) {
      scene.remove(projectile.group);
    }
    game.playerProjectiles.length = 0;
  }

  function clearArenaActivityActors(activityId = game.exploration.arenaActivity.activityId) {
    for (const enemy of game.enemies) {
      if (!activityId || enemy.activityId === activityId) {
        scene.remove(enemy.group);
      }
    }
    game.enemies = game.enemies.filter(enemy => activityId && enemy.activityId !== activityId);

    for (const fireball of game.fireballs) {
      if (!activityId || fireball.activityId === activityId) {
        scene.remove(fireball.group);
      }
    }
    game.fireballs = game.fireballs.filter(fireball => activityId && fireball.activityId !== activityId);

    for (const potion of game.potions) {
      if (!activityId || potion.activityId === activityId) {
        scene.remove(potion.group);
      }
    }
    game.potions = game.potions.filter(potion => activityId && potion.activityId !== activityId);
    clearPlayerProjectiles();
  }

  function crownfordInfirmaryPosition() {
    const city = game.exploration.arenaCity || game.exploration.city;
    if (!city) {
      return game.exploration.spawn.clone();
    }
    if (city.infirmaryLocal) {
      return explorationToWorld(city.infirmaryLocal.x, city.infirmaryLocal.z, new THREE.Vector3());
    }
    return explorationToWorld(city.localX + 25, city.localZ - 12, new THREE.Vector3());
  }

  function registerDungeonPoi(poi) {
    if (!poi || !poi.id) {
      return null;
    }
    game.exploration.dungeonPois = (game.exploration.dungeonPois || []).filter(existing => existing.id !== poi.id);
    game.exploration.dungeonPois.push(poi);
    if (poi.id === BELLWATER_DUNGEON_ID) {
      game.exploration.dungeonPoi = poi;
    }
    return poi;
  }

  function dungeonPoiById(dungeonId) {
    const pois = game.exploration.dungeonPois || [];
    return pois.find(poi => poi.id === dungeonId) || (game.exploration.dungeonPoi?.id === dungeonId ? game.exploration.dungeonPoi : null);
  }

  function dungeonRecoveryPosition(dungeonId = BELLWATER_DUNGEON_ID) {
    const def = dungeonDefinition(dungeonId);
    const poi = dungeonPoiById(def.id);
    if (poi && poi.returnLocal) {
      return explorationToWorld(poi.returnLocal.x, poi.returnLocal.z, new THREE.Vector3());
    }
    return explorationToWorld(def.recoveryFallback.x, def.recoveryFallback.z, new THREE.Vector3());
  }

  function bellwaterDungeonRecoveryPosition() {
    return dungeonRecoveryPosition(BELLWATER_DUNGEON_ID);
  }

  function parkHorseNear(position) {
    const horse = game.exploration.horse;
    if (!horse) {
      return;
    }
    horse.mounted = false;
    horse.position.copy(position).add(new THREE.Vector3(2.4, 0, 2.2));
    horse.velocity.set(0, 0, 0);
    horse.group.position.copy(horse.position);
    player.group.visible = true;
  }

  function startCrownringArenaActivity() {
    if (game.mode !== "exploration" || game.state !== "playing") {
      return false;
    }
    if (arenaActivityActive()) {
      showBanner("Crownring already active");
      return false;
    }
    if (dungeonActivityActive()) {
      showBanner(activeDungeonDefinition().activeCopy);
      return false;
    }
    if (isJoinedClient()) {
      sendOnlineMessage({ kind: "arenaStartRequest", state: serializePlayerState() });
      showBanner("Ask the host to open the Crownring");
      closeQuestDialog();
      restoreGameplayControlAfterActivityEntry();
      return false;
    }

    saveProgress();
    const returnPosition = player.position.clone();
    const infirmaryPosition = crownfordInfirmaryPosition();
    const activity = game.exploration.arenaActivity;
    Object.assign(activity, defaultArenaActivity(), {
      active: true,
      phase: "starting",
      activityId: "arena-" + Date.now().toString(36),
      center: { x: 0, z: 0 },
      radius: arenaRadius,
      participants: arenaParticipantsForRoom(),
      startedBy: online.localId,
      returnPosition: { x: returnPosition.x, z: returnPosition.z },
      infirmaryPosition: { x: infirmaryPosition.x, z: infirmaryPosition.z }
    });

    closeQuestDialog();
    restoreGameplayControlAfterActivityEntry();
    parkHorseNear(returnPosition);
    clearSharedWorldActors({ enemies: true, fireballs: true, potions: true });
    clearPlayerProjectiles();
    setArenaVisible(true);
    scene.fog.density = 0.018;
    game.wave = 0;
    game.nextWaveIn = 0;
    player.position.set(0, 0, 0);
    player.velocity.set(0, 0, 0);
    player.yaw = 0;
    player.group.position.copy(player.position);
    player.group.rotation.y = 0;
    game.cameraYaw = 0;
    spawnWave();
    playSfx("arenaStart", 1.1);
    showBanner("Crownring opened - press Y to yield", 3);
    sendOnlineMessage({ kind: "state", state: serializePlayerState() });
    sendWorldSnapshot(true);
    updateHud();
    return true;
  }

  function dungeonRewardClaimId(activity) {
    const def = dungeonDefinition(activity?.dungeonId || BELLWATER_DUNGEON_ID);
    const id = activity && activity.activityId ? activity.activityId : "local";
    return def.id + ":" + id + ":clear";
  }

  function applyDungeonFirstClearBoon(dungeonId) {
    const def = dungeonDefinition(dungeonId);
    const dungeonClears = progression.exploration.dungeonClears || (progression.exploration.dungeonClears = {});
    if (dungeonClears[def.id]) {
      return false;
    }
    dungeonClears[def.id] = true;
    addProgressionBoon(def.firstClearBoon);
    player.health = player.maxHealth;
    player.guard = player.maxGuard;
    player.mana = player.maxMana;
    return true;
  }

  function applyDungeonReward(message) {
    if (!message || game.mode !== "exploration") {
      return false;
    }
    if (online.role === "join" && !messageFromKnownHost(message)) {
      return false;
    }
    const activity = game.exploration.dungeonActivity;
    const dungeonId = message.dungeonId || activity.dungeonId || BELLWATER_DUNGEON_ID;
    const def = dungeonDefinitions[dungeonId];
    if (!def) {
      return false;
    }
    if (!message.activityId || !activity.activityId || message.activityId !== activity.activityId) {
      return false;
    }
    if (activity.dungeonId && activity.dungeonId !== def.id) {
      return false;
    }
    const participants = Array.isArray(message.participants) ? message.participants : [];
    if (!participants.includes(online.localId)) {
      return false;
    }
    if (arenaListIncludes(activity.defeatedParticipants, online.localId) || arenaListIncludes(activity.optedOutParticipants, online.localId)) {
      return false;
    }
    const claimId = message.claimId || dungeonRewardClaimId(activity);
    const sessionClaims = game.exploration.dungeonRewardClaimIds || (game.exploration.dungeonRewardClaimIds = []);
    if (activity.localRewardClaimIds.includes(claimId) || sessionClaims.includes(claimId)) {
      return false;
    }
    game.exploration.dungeonRewardClaimIds = [...sessionClaims, claimId].slice(-16);
    activity.localRewardClaimIds = [...activity.localRewardClaimIds, claimId].slice(-8);
    const xp = Math.max(0, Math.floor(numberOrZero(message.xp) || def.clearXp));
    awardExplorationXp(xp);
    const firstClear = message.firstClearBoon !== false && applyDungeonFirstClearBoon(def.id);
    playSfx("arenaMilestone", 0.95);
    showBanner(def.clearCopy + " +" + xp + " XP" + (firstClear ? " + first-clear boon" : ""), 3);
    saveProgress();
    updateHud();
    return true;
  }

  function grantDungeonReward() {
    if (!dungeonActivityActive()) {
      return 0;
    }
    const activity = game.exploration.dungeonActivity;
    const def = activeDungeonDefinition();
    const claimId = dungeonRewardClaimId(activity);
    if (activity.rewardedClaimIds.includes(claimId)) {
      return 0;
    }
    activity.rewardedClaimIds = [...activity.rewardedClaimIds, claimId].slice(-8);
    const rewardMessage = {
      kind: "dungeonReward",
      claimId,
      activityId: activity.activityId,
      dungeonId: def.id,
      participants: activity.participants.slice(0, 8),
      xp: def.clearXp,
      firstClearBoon: true
    };
    applyDungeonReward(rewardMessage);
    if (online.connected) {
      sendOnlineMessage(rewardMessage);
    }
    return def.clearXp;
  }

  function dungeonEntrance(index) {
    const angles = [-Math.PI / 2, Math.PI * 0.68, Math.PI * 0.18, -Math.PI * 0.82, Math.PI * 0.94, -Math.PI * 0.26];
    const angle = angles[index % angles.length];
    const lane = Math.floor(index / angles.length);
    const startRadius = DUNGEON_RADIUS + 2.8 + lane * 0.6;
    const targetRadius = DUNGEON_RADIUS - 5.5 - lane * 0.25;
    return {
      startX: Math.cos(angle) * startRadius,
      startZ: Math.sin(angle) * startRadius,
      targetX: Math.cos(angle) * targetRadius,
      targetZ: Math.sin(angle) * targetRadius
    };
  }

  function spawnDungeonEncounter() {
    if (!dungeonActivityActive()) {
      return;
    }
    const def = activeDungeonDefinition();
    game.enemies = game.enemies.filter(enemy => {
      if (enemy.activityId === game.exploration.dungeonActivity.activityId) {
        scene.remove(enemy.group);
        return false;
      }
      return true;
    });
    const types = def.encounter;
    for (let i = 0; i < types.length; i += 1) {
      const entrance = dungeonEntrance(i);
      const enemy = createEnemyOfType(types[i], entrance.startX, entrance.startZ, i < 2 ? 2 : 3);
      tagDungeonActor(enemy);
      setEnemyEntrance(enemy, entrance, i * 0.16);
      game.enemies.push(enemy);
    }
    playSfx("waveStart", 0.9);
    showBanner(def.encounterCopy, 3);
  }

  function startDungeonActivity(dungeonId = BELLWATER_DUNGEON_ID) {
    if (game.mode !== "exploration" || game.state !== "playing") {
      return false;
    }
    const def = dungeonDefinitions[dungeonId];
    if (!def) {
      showBanner("Unknown dungeon entrance");
      return false;
    }
    if (dungeonActivityActive()) {
      showBanner(activeDungeonDefinition().activeCopy);
      return false;
    }
    if (arenaActivityActive()) {
      showBanner("Crownring already active");
      return false;
    }
    if (isJoinedClient()) {
      sendOnlineMessage({ kind: "dungeonStartRequest", dungeonId: def.id, state: serializePlayerState() });
      showBanner(def.requestCopy);
      closeQuestDialog();
      restoreGameplayControlAfterActivityEntry();
      return false;
    }

    saveProgress();
    const returnPosition = player.position.clone();
    const recoveryPosition = dungeonRecoveryPosition(def.id);
    const activity = game.exploration.dungeonActivity;
    Object.assign(activity, defaultDungeonActivity(), {
      active: true,
      phase: "active",
      activityId: "dungeon-" + Date.now().toString(36),
      dungeonId: def.id,
      name: def.name,
      center: { x: 0, z: 0 },
      radius: DUNGEON_RADIUS,
      participants: activityParticipantsForRoom(),
      startedBy: online.localId,
      returnPosition: { x: returnPosition.x, z: returnPosition.z },
      recoveryPosition: { x: recoveryPosition.x, z: recoveryPosition.z }
    });

    closeQuestDialog();
    restoreGameplayControlAfterActivityEntry();
    parkHorseNear(returnPosition);
    clearSharedWorldActors({ enemies: true, fireballs: true, potions: true });
    clearPlayerProjectiles();
    setDungeonVisible(true);
    scene.fog.density = 0.026;
    player.position.set(0, 0, 0);
    player.velocity.set(0, 0, 0);
    player.yaw = 0;
    player.group.position.copy(player.position);
    player.group.rotation.y = 0;
    game.cameraYaw = 0;
    spawnDungeonEncounter();
    playSfx("arenaStart", 0.72);
    sendOnlineMessage({ kind: "state", state: serializePlayerState() });
    sendWorldSnapshot(true);
    updateHud();
    return true;
  }

  function startBellwaterDungeonActivity() {
    return startDungeonActivity(BELLWATER_DUNGEON_ID);
  }

  function completeDungeonActivity() {
    const activity = game.exploration.dungeonActivity;
    if (!dungeonActivityActive()) {
      return false;
    }
    const activityId = activity.activityId;
    const def = activeDungeonDefinition();
    grantDungeonReward();
    clearArenaActivityActors(activityId);
    activity.phase = "completed";
    activity.endedReason = "complete";
    exitLocalDungeonActivity("complete");
    resetDungeonActivityState();
    game.exploration.dungeonActivity.activityId = activityId;
    game.exploration.dungeonActivity.dungeonId = def.id;
    game.exploration.dungeonActivity.name = def.name;
    game.exploration.dungeonActivity.phase = "completed";
    game.exploration.dungeonActivity.endedReason = "complete";
    sendWorldSnapshot(true);
    return true;
  }

  function endDungeonActivity(reason = "yield") {
    const activity = game.exploration.dungeonActivity;
    if (!dungeonActivityActive()) {
      return false;
    }
    const defeated = reason === "defeat";
    const activityId = activity.activityId;
    const def = activeDungeonDefinition();
    if (defeated) {
      activity.defeatedParticipants = Array.from(new Set([...activity.defeatedParticipants, online.localId])).slice(0, 8);
    }
    clearArenaActivityActors(activityId);
    exitLocalDungeonActivity(reason);
    resetDungeonActivityState();
    game.exploration.dungeonActivity.activityId = activityId;
    game.exploration.dungeonActivity.dungeonId = def.id;
    game.exploration.dungeonActivity.name = def.name;
    game.exploration.dungeonActivity.endedReason = reason;
    if (isJoinedClient()) {
      game.exploration.dungeonActivity.localOptOutActivityId = activityId;
    }
    sendOnlineMessage({ kind: defeated ? "dungeonDefeated" : "dungeonLeaveRequest", state: serializePlayerState() });
    sendWorldSnapshot(true);
    return true;
  }

  function endCrownringArenaActivity(reason = "yield") {
    const activity = game.exploration.arenaActivity;
    if (!arenaActivityActive()) {
      return false;
    }
    const defeated = reason === "defeat";
    const activityId = activity.activityId;
    clearArenaActivityActors(activity.activityId);
    exitLocalArenaActivity(reason);
    resetArenaActivityState();
    game.exploration.arenaActivity.activityId = activityId;
    game.exploration.arenaActivity.endedReason = reason;
    if (isJoinedClient()) {
      game.exploration.arenaActivity.localOptOutActivityId = activityId;
    }
    sendOnlineMessage({ kind: defeated ? "arenaDefeated" : "arenaLeaveRequest", state: serializePlayerState() });
    sendWorldSnapshot(true);
    return true;
  }

  function crownringWaveXp(wave) {
    return 18 + Math.min(62, Math.max(1, wave) * 8);
  }

  function grantCrownringWaveReward(wave) {
    if (!arenaActivityActive()) {
      return 0;
    }
    const activity = game.exploration.arenaActivity;
    const xp = crownringWaveXp(wave);
    awardExplorationXp(xp);
    updateQuestProgress("crownringTrial", 1);
    if (online.connected) {
      sendOnlineMessage({
        kind: "arenaReward",
        activityId: activity.activityId,
        participants: activity.participants.slice(0, 8),
        wave,
        xp
      });
    }
    return xp;
  }

  function handleArenaReward(message) {
    if (!message || game.mode !== "exploration") {
      return;
    }
    if (!messageFromKnownHost(message)) {
      return;
    }
    const participants = Array.isArray(message.participants) ? message.participants : [];
    if (participants.length && !participants.includes(online.localId)) {
      return;
    }
    if (message.activityId && game.exploration.arenaActivity.activityId && message.activityId !== game.exploration.arenaActivity.activityId) {
      return;
    }
    const xp = Math.max(0, Math.floor(numberOrZero(message.xp)));
    awardExplorationXp(xp);
    updateQuestProgress("crownringTrial", 1);
    if (xp > 0) {
      const wave = Math.max(0, Math.floor(numberOrZero(message.wave)));
      playSfx(wave > 0 && wave % 3 === 0 ? "arenaMilestone" : "waveClear", 1);
      showBanner("Crownring purse +" + xp + " XP", 2.4);
    }
  }

  function clearExplorationWorld() {
    if (game.explorationGroup) {
      scene.remove(game.explorationGroup);
      game.explorationGroup = null;
    }
    for (const npc of game.npcs) {
      scene.remove(npc.group);
    }
    for (const item of game.questItems) {
      if (item.group.parent) {
        item.group.parent.remove(item.group);
      }
    }
    if (game.exploration.horse) {
      scene.remove(game.exploration.horse.group);
      game.exploration.horse = null;
    }
    game.npcs.length = 0;
    game.questItems.length = 0;
    game.quests.length = 0;
    game.activeNpc = null;
    game.dialogNpc = null;
    game.exploration.lakes.length = 0;
    game.exploration.villages.length = 0;
    game.exploration.biomes.length = 0;
    game.exploration.colliders.length = 0;
    game.exploration.colliderGrid.clear();
    game.exploration.roads.length = 0;
    game.exploration.roadJunctions.length = 0;
    game.exploration.terrainFlatZones.length = 0;
    game.exploration.city = null;
    game.exploration.arenaCity = null;
    game.exploration.dungeonPoi = null;
    game.exploration.dungeonPois = [];
    game.exploration.respawnTownId = "";
    game.exploration.respawnLocal = null;
    game.exploration.respawnPoint = null;
    game.exploration.discovered = new Set();
    game.exploration.completed = false;
    game.exploration.dungeonActivity = defaultDungeonActivity();
    game.exploration.wilds.seedPoints.length = 0;
    game.exploration.wilds.timer = 0;
    game.exploration.wilds.cursor = 0;
    resetArenaActivityState();
    game.exploration.xp = getCharacterProgress().xp;
    closeQuestDialog();
    updateQuestLog();
  }

  function explorationSeed() {
    return "explore-" + (online.roomCode || roomCodeInput.value || "local");
  }

  function awardExplorationXp(amount) {
    if (game.mode !== "exploration" || amount <= 0) {
      return;
    }
    const characterProgress = getCharacterProgress();
    const beforeLevel = getCharacterLevel();
    characterProgress.xp += Math.max(0, Math.floor(amount));
    game.exploration.xp = characterProgress.xp;
    const afterLevel = getCharacterLevel();
    if (afterLevel > beforeLevel) {
      applyProgressionStats(true);
      showBanner("Level " + afterLevel + " reached - " + levelRewardText(afterLevel), 3);
      spawnImpact(player.position, 0x7ae8ff, 24);
      playSfx("level", 1.2);
    }
    saveProgress();
    updateHud();
  }

  // Death penalty: dying wipes XP earned inside the current level only. XP
  // falls back to the current level's threshold, so levels and unlocks remain
  // stable. Returns null when nothing was lost (already at the current level
  // floor, or outside exploration progression).
  function applyDeathLevelPenalty() {
    if (game.mode !== "exploration") {
      return null;
    }
    const characterProgress = getCharacterProgress();
    const beforeLevel = levelFromXp(characterProgress.xp);
    const targetXp = xpForLevel(beforeLevel);
    if (characterProgress.xp <= targetXp) {
      return null;
    }
    characterProgress.xp = targetXp;
    game.exploration.xp = characterProgress.xp;
    applyProgressionStats(false);
    updateHud();
    return { level: beforeLevel };
  }

  function makeCone(radius, height, segments, material, x, y, z) {
    const segmentCount = segments || 16;
    const mesh = new THREE.Mesh(
      cachedPrimitiveGeometry(
        "cone",
        [radius, height, segmentCount],
        () => new THREE.ConeGeometry(radius, height, segmentCount)
      ),
      material
    );
    mesh.position.set(x || 0, y || 0, z || 0);
    return addShadow(mesh);
  }

  // Triangular gable end (isoceles), base on local X spanning `width`, apex up
  // at `height`, extruded thin along Z by `depth`. Geometry is cached/shared by
  // dimension so repeated houses reuse one buffer.
  function makeGable(width, height, depth, material, x, y, z) {
    const geometry = cachedPrimitiveGeometry("gable", [width, height, depth], () => {
      const halfW = width / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-halfW, 0);
      shape.lineTo(halfW, 0);
      shape.lineTo(0, height);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      geo.translate(0, 0, -depth / 2);
      return geo;
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x || 0, y || 0, z || 0);
    return addShadow(mesh);
  }

  // A row of merlons (crenellations) running along local +X, centered on the
  // parent origin (offset by options.x). The caller positions/rotates the
  // parent group. Reuses cached box geometry, so a whole battlement is cheap.
  function addMerlonRow(parent, length, options = {}) {
    const merlonW = options.merlonW || 0.52;
    const gap = options.gap || 0.46;
    const height = options.height || 0.5;
    const depth = options.depth || 0.34;
    const material = options.material || materials.cityWall;
    const baseY = options.y || 0;
    const z = options.z || 0;
    const x0 = options.x || 0;
    const unit = merlonW + gap;
    const count = Math.max(1, Math.floor((length + gap) / unit));
    const span = count * unit - gap;
    const start = x0 - span / 2 + merlonW / 2;
    for (let i = 0; i < count; i += 1) {
      parent.add(makeBox(merlonW, height, depth, material, start + i * unit, baseY + height / 2, z));
    }
  }

  // A ring of merlons around the top of a round tower.
  function addCrenelRing(parent, radius, options = {}) {
    const count = options.count || 10;
    const merlonW = options.merlonW || 0.36;
    const height = options.height || 0.44;
    const depth = options.depth || 0.28;
    const material = options.material || materials.cityWall;
    const baseY = options.y || 0;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * TAU;
      const merlon = makeBox(merlonW, height, depth, material, Math.cos(angle) * radius, baseY + height / 2, Math.sin(angle) * radius);
      merlon.rotation.y = angle;
      parent.add(merlon);
    }
  }

  // Curtain wall segment centered on (cx,cz) local. The longer of width/depth is
  // the run; a slightly battered base, a wall-walk body, and crenellated parapets
  // on both faces are added. Ground-conformed and registers line colliders so the
  // existing collision footprint is preserved.
  function addCurtainWall(group, cx, cz, width, depth, options = {}) {
    const material = options.material || materials.cityWall;
    const height = options.height || 3.1;
    const horizontal = width >= depth;
    const length = horizontal ? width : depth;
    const thickness = horizontal ? depth : width;
    const seg = new THREE.Group();
    setExplorationLocalGroundPosition(seg, cx, cz);
    if (!horizontal) {
      seg.rotation.y = Math.PI / 2;
    }
    const base = makeBox(length, height * 0.32, thickness + 0.3, material, 0, height * 0.16, 0);
    const body = makeBox(length, height, thickness, material, 0, height / 2, 0);
    seg.add(base, body);
    // Single centered crenellated parapet keeps the silhouette readable while
    // halving the merlon draw calls vs a double-faced parapet.
    addMerlonRow(seg, length, {
      material,
      y: height,
      z: 0,
      height: 0.54,
      depth: Math.min(thickness + 0.12, 0.62),
      merlonW: 0.62,
      gap: 0.54
    });
    group.add(seg);
    addExplorationLineColliders(cx, cz, width, depth, "structure");
    return seg;
  }

  // Round wall tower with a corbelled, crenellated head and optional conical roof.
  function addWallTower(group, cx, cz, options = {}) {
    const radius = options.radius || 1.1;
    const height = options.height || 4.4;
    const material = options.material || materials.cityWall;
    const roofMaterial = options.roofMaterial || materials.cityRoof;
    const tower = new THREE.Group();
    setExplorationLocalGroundPosition(tower, cx, cz);
    const shaft = makeCylinder(radius, radius * 1.18, height, 14, material, 0, height / 2, 0);
    const corbel = makeCylinder(radius + 0.18, radius + 0.04, 0.3, 14, material, 0, height + 0.15, 0);
    tower.add(shaft, corbel);
    addCrenelRing(tower, radius + 0.06, {
      material,
      y: height + 0.3,
      count: options.merlons || 9,
      merlonW: Math.max(0.26, radius * 0.42),
      height: 0.46,
      depth: 0.26
    });
    if (options.cone !== false) {
      const coneHeight = options.coneHeight || 1.7;
      tower.add(makeCone(radius + 0.22, coneHeight, 14, roofMaterial, 0, height + 0.3 + coneHeight / 2, 0));
      if (options.finial) {
        tower.add(makeSphere(0.12, materials.gold, 0, height + 0.3 + coneHeight + 0.12, 0));
      }
    }
    if (options.banner) {
      const banner = makeBox(0.08, 1.1, 0.62, options.banner, radius + 0.12, height * 0.62, 0);
      tower.add(banner);
    }
    group.add(tower);
    addExplorationCollider(cx, cz, radius + (options.colliderPad || 0.45), "structure");
    return tower;
  }

  // Twin-towered gatehouse with an arched opening, portcullis hint and timber
  // doors. Sits in a wall gap; the flanking towers carry the colliders so the
  // gateway itself stays walkable.
  function addGatehouse(group, cx, cz, options = {}) {
    const material = options.material || materials.cityWall;
    const span = options.span || 6.2;
    const height = options.height || 3.4;
    const rotation = options.rotation || 0;
    const gate = new THREE.Group();
    setExplorationLocalGroundPosition(gate, cx, cz);
    gate.rotation.y = rotation;
    const towerW = 1.8;
    const towerH = height + 1.1;
    const depth = towerW + 0.6;
    for (const side of [-1, 1]) {
      const px = side * (span / 2 + towerW / 2 - 0.15);
      gate.add(makeBox(towerW, towerH, depth, material, px, towerH / 2, 0));
      addMerlonRow(gate, towerW, {
        material, x: px, y: towerH, z: depth / 2 - 0.12, height: 0.46, depth: 0.16, merlonW: 0.4, gap: 0.32
      });
      addMerlonRow(gate, towerW, {
        material, x: px, y: towerH, z: -depth / 2 + 0.12, height: 0.46, depth: 0.16, merlonW: 0.4, gap: 0.32
      });
      addExplorationCollider(cx + Math.cos(rotation) * px, cz - Math.sin(rotation) * px, towerW * 0.72, "structure");
    }
    const lintelY = height - 0.2;
    gate.add(makeBox(span + 0.5, height - lintelY + 0.9, depth - 0.2, material, 0, lintelY + (height - lintelY + 0.9) / 2, 0));
    addMerlonRow(gate, span + 0.2, {
      material, y: towerH, z: depth / 2 - 0.16, height: 0.46, depth: 0.16, merlonW: 0.44, gap: 0.34
    });
    // arched opening hint: a dark recessed reveal + stepped arch shoulders
    const reveal = makeBox(span - 0.3, lintelY, 0.12, materials.darkStone, 0, lintelY / 2, depth / 2 - 0.05);
    gate.add(reveal);
    for (const side of [-1, 1]) {
      const shoulder = makeBox(0.5, 0.5, 0.16, material, side * (span / 2 - 0.5), lintelY - 0.18, depth / 2 - 0.02);
      shoulder.rotation.z = side * 0.6;
      gate.add(shoulder);
    }
    // portcullis hint: iron bars across the opening
    for (let i = 0; i < 4; i += 1) {
      const bx = -span / 2 + 0.55 + i * ((span - 1.1) / 3);
      gate.add(makeBox(0.08, lintelY - 0.3, 0.06, materials.iron, bx, (lintelY - 0.3) / 2 + 0.05, depth / 2 - 0.02));
    }
    gate.add(makeBox(span - 0.4, 0.08, 0.06, materials.iron, 0, lintelY - 0.5, depth / 2 - 0.02));
    // timber leaves recessed behind the portcullis
    gate.add(makeBox(span * 0.46, lintelY - 0.2, 0.08, materials.wood, -span * 0.24, (lintelY - 0.2) / 2, 0.04));
    gate.add(makeBox(span * 0.46, lintelY - 0.2, 0.08, materials.wood, span * 0.24, (lintelY - 0.2) / 2, 0.04));
    if (options.banner) {
      gate.add(makeBox(0.08, 1.3, 0.78, options.banner, 0, height * 0.58, depth / 2 - 0.02));
    }
    group.add(gate);
    return gate;
  }

  // Clustered low-poly tree canopy: a handful of overlapping leaf blobs with
  // quantized radii (cache friendly) and slight per-blob squash for a layered,
  // hand-built look instead of a single sphere.
  function addCanopyCluster(parent, material, cx, cy, cz, baseRadius, random, options = {}) {
    const blobs = options.blobs || 4;
    const spread = options.spread || baseRadius * 0.72;
    const accent = options.accent || null;
    for (let i = 0; i < blobs; i += 1) {
      const radius = quantizeStep(baseRadius * (i === 0 ? 1 : 0.6 + random() * 0.42), 0.1);
      const angle = random() * TAU;
      const dist = i === 0 ? 0 : spread * (0.45 + random() * 0.7);
      const mat = accent && random() > 0.62 ? accent : material;
      const blob = makeSphere(radius, mat,
        cx + Math.cos(angle) * dist,
        cy + (i === 0 ? 0 : (random() - 0.35) * spread * 0.7),
        cz + Math.sin(angle) * dist);
      blob.scale.set(1.05, 0.78 + random() * 0.22, 1.05);
      parent.add(blob);
    }
  }

  function biomeTerrainInfluence(biome, localX, localZ) {
    if (!biome) {
      return 0;
    }
    const dx = localX - biome.x;
    const dz = localZ - biome.z;
    const rotation = -(biome.rotation || 0);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const rx = Math.max(1, biome.rx);
    const rz = Math.max(1, biome.rz);
    const bx = dx * cos - dz * sin;
    const bz = dx * sin + dz * cos;
    const normalized = (bx * bx) / (rx * rx) + (bz * bz) / (rz * rz);
    return clamp(1 - normalized, 0, 1);
  }

  function terrainLineInfluence(localX, localZ, fromX, fromZ, toX, toZ, width) {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq <= 0.0001) {
      return 0;
    }
    const t = clamp(((localX - fromX) * dx + (localZ - fromZ) * dz) / lengthSq, 0, 1);
    const closestX = fromX + dx * t;
    const closestZ = fromZ + dz * t;
    const distance = Math.hypot(localX - closestX, localZ - closestZ);
    return 1 - smoothstep(width * 0.35, width, distance);
  }

  function terrainPeakInfluence(localX, localZ, centerX, centerZ, radius, power = 1.25) {
    const distance = Math.hypot(localX - centerX, localZ - centerZ);
    const normalized = clamp(1 - distance / Math.max(1, radius), 0, 1);
    return Math.pow(smoothstep(0, 1, normalized), power);
  }

  function explorationRawTerrainHeight(localX, localZ, seed = game.exploration.seed || "explore-local") {
    const distance = Math.hypot(localX, localZ);
    const edgeRise = game.exploration.radius * 0.78;
    const seedPhase = hashString(seed) * 0.0001;
    let height = Math.sin(localX * 0.13 + seedPhase) * 0.08 + Math.cos(localZ * 0.11) * 0.07;
    height += Math.sin((localX + localZ) * 0.024 + seedPhase * 0.7) * 0.34;
    height += Math.cos((localX - localZ) * 0.018 - seedPhase * 0.45) * 0.26;

    const wildernessMask = smoothstep(22, 86, distance);
    const meadowRidgeA = terrainLineInfluence(localX, localZ, -44, 10, 112, 118, 38);
    const meadowRidgeB = terrainLineInfluence(localX, localZ, -158, 26, -12, 164, 34);
    const northEscarpment = terrainLineInfluence(localX, localZ, -32, 78, 164, 144, 46);
    const westShoulder = terrainLineInfluence(localX, localZ, -180, -14, -42, 108, 39);
    const southernHollow = terrainLineInfluence(localX, localZ, -120, -118, 82, -18, 42);
    const eastKnoll = terrainPeakInfluence(localX, localZ, 98, -34, 86, 1.18);
    const westKnoll = terrainPeakInfluence(localX, localZ, -112, 12, 76, 1.2);
    const crownVale = terrainPeakInfluence(localX, localZ, 28, 92, 94, 1.05);
    const southVale = terrainPeakInfluence(localX, localZ, -22, -108, 96, 1.08);
    // Rolling hills: stacked swell octaves (two mid-frequency, one broad, plus
    // a very-low-frequency ground swell) carve real valleys and viewpoints
    // into the wilderness while each individual slope stays walkable.
    const rollingSwell = Math.sin(localX * 0.031 - localZ * 0.019 + seedPhase * 0.5) * 0.92
      + Math.cos(localX * 0.018 + localZ * 0.027 - seedPhase * 0.35) * 0.72
      + Math.sin((localX + localZ) * 0.012 + seedPhase * 0.25) * 0.6
      + Math.sin(localX * 0.0082 - localZ * 0.0064 + seedPhase * 0.18) * 1.15;
    // Cliff step stacked on the broad escarpment rise so the north line reads
    // as a real terrace edge rather than a gentle bank.
    const escarpmentCliff = smoothstep(0.3, 0.78, northEscarpment);
    height += wildernessMask * rollingSwell;
    height += wildernessMask * meadowRidgeA * (1.85 + Math.sin(localZ * 0.05 + seedPhase) * 0.34);
    height += wildernessMask * meadowRidgeB * (1.5 + Math.cos(localX * 0.047 - seedPhase) * 0.28);
    height += wildernessMask * northEscarpment * (1.55 + Math.sin(localX * 0.038 + seedPhase) * 0.3);
    height += wildernessMask * escarpmentCliff * 1.7;
    height += wildernessMask * westShoulder * (1.2 + Math.cos(localZ * 0.04 - seedPhase) * 0.24);
    height += wildernessMask * eastKnoll * 2.35;
    height += wildernessMask * westKnoll * 1.95;
    height -= wildernessMask * crownVale * 0.92;
    height -= wildernessMask * southVale * 1.3;
    height -= wildernessMask * southernHollow * (1.15 + Math.sin((localX - localZ) * 0.028) * 0.26);

    const mountain = game.exploration.biomes.find(biome => biome.id === "mountain");
    const desert = game.exploration.biomes.find(biome => biome.id === "desert");
    const swamp = game.exploration.biomes.find(biome => biome.id === "swamp");
    const briar = game.exploration.biomes.find(biome => biome.id === "briar");
    const mountainInfluence = biomeTerrainInfluence(mountain, localX, localZ);
    if (mountainInfluence > 0) {
      const ridge = Math.sin(localX * 0.052 + localZ * 0.018 + seedPhase) * 0.48
        + Math.cos(localZ * 0.064 - seedPhase) * 0.32;
      const crest = Math.pow(Math.max(0, Math.sin((localX - localZ) * 0.038 + seedPhase * 0.55)), 1.45);
      // Sharp parallel ridgelines via a folded (absolute-value) sine, so the
      // Dragonspine reads as serrated peaks rather than one smooth dome. The
      // higher fold exponent narrows each crest into a knife edge.
      const ridgeLine = Math.pow(1 - Math.abs(Math.sin((localX + localZ) * 0.03 + seedPhase * 0.6)), 1.9);
      const pass = terrainLineInfluence(localX, localZ, mountain.x - 34, mountain.z - 48, mountain.x + 58, mountain.z + 16, 22);
      const sidePass = terrainLineInfluence(localX, localZ, mountain.x - 64, mountain.z + 30, mountain.x + 20, mountain.z + 74, 18);
      height += mountainInfluence * (1.2 + ridge * 1.9) + Math.pow(mountainInfluence, 1.75) * 9.8;
      height += Math.pow(mountainInfluence, 1.35) * crest * 3.1;
      height += Math.pow(mountainInfluence, 1.5) * ridgeLine * 3.6;
      // Deep saddles between the serrated crests so the skyline notches hard.
      height -= Math.pow(mountainInfluence, 1.45) * (1 - ridgeLine) * 1.35;
      // Carved passes keep a traversable route through the higher massif;
      // carved deeper to match the taller massing so road grades stay sane.
      height -= pass * mountainInfluence * 3.4;
      height -= sidePass * mountainInfluence * 2.6;
    }
    const desertInfluence = biomeTerrainInfluence(desert, localX, localZ);
    if (desertInfluence > 0) {
      const dune = Math.sin(localX * 0.076 + localZ * 0.024 + seedPhase) * 0.24
        + Math.cos(localZ * 0.088 - seedPhase) * 0.16;
      const duneBand = Math.sin(localX * 0.04 - localZ * 0.018 + seedPhase * 0.7) * 0.28;
      // Long crescent dune crests rolling across the sands for a wind-shaped
      // look; the higher exponent pinches each crest steeper and narrower.
      const crescent = Math.pow(Math.max(0, Math.sin(localX * 0.03 + localZ * 0.05 + seedPhase * 0.4)), 2.6);
      const mesa = terrainPeakInfluence(localX, localZ, desert.x - 26, desert.z + 34, 72, 1.4);
      height += desertInfluence * (dune * 3.3 + duneBand * 2.5);
      height += desertInfluence * crescent * 2.2;
      height += desertInfluence * mesa * 2.6;
    }
    const swampInfluence = biomeTerrainInfluence(swamp, localX, localZ);
    if (swampInfluence > 0) {
      const bogBasin = terrainPeakInfluence(localX, localZ, swamp.x - 12, swamp.z + 18, 82, 1.1);
      height -= swampInfluence * 0.62;
      height -= Math.pow(swampInfluence, 1.5) * 0.6;
      height -= swampInfluence * bogBasin * 0.9;
      height += Math.sin(localX * 0.09 + localZ * 0.04) * swampInfluence * 0.11;
    }
    const briarInfluence = biomeTerrainInfluence(briar, localX, localZ);
    if (briarInfluence > 0) {
      const hollow = terrainPeakInfluence(localX, localZ, briar.x + 8, briar.z - 6, 74, 1.2);
      const rootRidge = Math.sin(localX * 0.07 - localZ * 0.041 + seedPhase) * 0.24
        + Math.cos(localZ * 0.058 + seedPhase * 0.4) * 0.18;
      height -= Math.pow(briarInfluence, 1.2) * hollow * 0.72;
      height += briarInfluence * rootRidge * 1.25;
      height += Math.pow(briarInfluence, 1.65) * 0.7;
    }

    if (distance > edgeRise) {
      height += (distance - edgeRise) * 0.016;
    }
    return height;
  }

  function registerExplorationFlatZone(localX, localZ, radius, blend = 7, height = null, strength = 0.92) {
    const targetHeight = Number.isFinite(height)
      ? height
      : explorationRawTerrainHeight(localX, localZ);
    game.exploration.terrainFlatZones.push({
      x: localX,
      z: localZ,
      radius: Math.max(1, radius),
      blend: Math.max(0.5, blend),
      height: targetHeight,
      strength: clamp(strength, 0, 1)
    });
    return targetHeight;
  }

  function explorationTerrainHeight(localX, localZ, seed = game.exploration.seed || "explore-local") {
    let height = explorationRawTerrainHeight(localX, localZ, seed);
    for (const zone of game.exploration.terrainFlatZones) {
      const distance = Math.hypot(localX - zone.x, localZ - zone.z);
      if (distance >= zone.radius + zone.blend) {
        continue;
      }
      const falloff = 1 - smoothstep(zone.radius, zone.radius + zone.blend, distance);
      height = lerp(height, zone.height, falloff * zone.strength);
    }
    return height;
  }

  function explorationGroundWorldY(worldX, worldZ, offset = 0) {
    const activity = activeCombatActivity();
    if (activity) {
      const centerX = activity.center?.x || 0;
      const centerZ = activity.center?.z || 0;
      const radius = (activity.radius || arenaRadius) + 24;
      if (Math.hypot(worldX - centerX, worldZ - centerZ) <= radius) {
        return offset;
      }
    }
    if (localPlayerInArenaActivity() && Math.hypot(worldX, worldZ) <= arenaRadius + 24) {
      return offset;
    }
    if (game.mode !== "exploration" && !game.explorationGroup) {
      return offset;
    }
    return explorationTerrainHeight(worldX - game.exploration.origin.x, worldZ - game.exploration.origin.z) + offset;
  }

  function explorationGroundLocalY(localX, localZ, offset = 0) {
    return explorationTerrainHeight(localX, localZ) + offset;
  }

  function setExplorationLocalGroundPosition(object, localX, localZ, offset = 0) {
    object.position.set(localX, explorationGroundLocalY(localX, localZ, offset), localZ);
    return object;
  }

  function setupExplorationFlatZones() {
    const mountain = game.exploration.biomes.find(biome => biome.id === "mountain");
    const desert = game.exploration.biomes.find(biome => biome.id === "desert");
    const swamp = game.exploration.biomes.find(biome => biome.id === "swamp");
    const briar = game.exploration.biomes.find(biome => biome.id === "briar");
    const zones = [];
    const landmarkZones = [
      { x: -game.exploration.origin.x, z: -game.exploration.origin.z, radius: arenaRadius + 24, blend: 18, height: 0, strength: 1.0 },
      { x: 0, z: -2, radius: 24, blend: 11, strength: 1.0 },
      { x: 0, z: -17, radius: 6, blend: 6, strength: 0.8 },
      { x: 0, z: 86, radius: 7, blend: 7, strength: 0.75 },
      { x: 58, z: -48, radius: 6, blend: 7, strength: 0.72 },
      { x: -64, z: 42, radius: 6, blend: 7, strength: 0.72 },
      { x: 12, z: 132, radius: 53, blend: 18, strength: 0.98 },
      { x: 158, z: 48, radius: 46, blend: 16, strength: 0.98 },
      { x: 125, z: -92, radius: 32, blend: 14, strength: 0.92 },
      { x: -133, z: 96, radius: 32, blend: 14, strength: 0.92 },
      { x: 63, z: 81, radius: 22, blend: 10, strength: 0.84 },
      { x: -104, z: -78, radius: 18, blend: 9, strength: 0.82 },
      { x: 155, z: -134, radius: 19, blend: 9, strength: 0.82 },
      { x: -209, z: 90, radius: 19, blend: 9, strength: 0.82 },
      { x: 18, z: -207, radius: 16, blend: 8, strength: 0.78 },
      { x: 238, z: 30, radius: 17, blend: 8, strength: 0.78 }
    ];
    const addPathZones = (points, radius = 5.4, blend = 7, strength = 0.54) => {
      for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        const length = Math.max(0.001, Math.hypot(b.x - a.x, b.z - a.z));
        const steps = Math.max(1, Math.ceil(length / 24));
        for (let step = 0; step <= steps; step += 1) {
          const t = step / steps;
          zones.push({
            x: lerp(a.x, b.x, t),
            z: lerp(a.z, b.z, t),
            radius,
            blend,
            strength
          });
        }
      }
    };
    const homeDoor = { x: 0, z: -2.4 };
    const homeJunction = { x: 0, z: -17 };
    const northFork = { x: 0, z: 86 };
    const meadowEastFork = { x: 58, z: -48 };
    const meadowWestFork = { x: -64, z: 42 };
    const mountainFork = { x: 78, z: 112 };
    const desertFork = { x: -58, z: -74 };
    const swampFork = { x: -92, z: 128 };
    const briarFork = { x: 98, z: -72 };
    addPathZones([homeDoor, homeJunction, { x: -7, z: 18 }, { x: 4, z: 43 }, { x: -5, z: 66 }, northFork], 5.8, 7.5, 0.58);
    addPathZones([northFork, { x: -4, z: 104 }, { x: 2, z: 132 }], 6.2, 8, 0.62);
    addPathZones([northFork, { x: 34, z: 100 }, { x: 72, z: 91 }, { x: 124, z: 30 }], 5.8, 7.5, 0.58);
    addPathZones([{ x: 72, z: 91 }, { x: 67, z: 87 }, { x: 63, z: 81 }], 4.7, 6.8, 0.55);
    addPathZones([homeJunction, { x: 18, z: -31 }, { x: 43, z: -58 }, meadowEastFork, { x: 118, z: -86 }], 5.2, 7, 0.54);
    addPathZones([homeJunction, { x: -22, z: 3 }, { x: -46, z: 30 }, meadowWestFork, { x: -126, z: 90 }], 5.2, 7, 0.54);
    if (mountain) {
      addPathZones([northFork, { x: 24, z: 99 }, { x: 56, z: 122 }, mountainFork, { x: mountain.x + 18, z: mountain.z - 24 }], 5.2, 7.5, 0.5);
    }
    if (desert) {
      const siltwell = { x: desert.x + 115, z: desert.z + 45 };
      addPathZones([homeJunction, { x: -18, z: -42 }, { x: -48, z: -58 }, desertFork, { x: desert.x + 10, z: desert.z + 2 }], 5.2, 7.5, 0.5);
      addPathZones([desertFork, { x: -82, z: -92 }, siltwell], 4.6, 7, 0.5);
    }
    if (swamp) {
      addPathZones([northFork, { x: -28, z: 104 }, { x: -66, z: 124 }, swampFork, { x: swamp.x + 7, z: swamp.z - 7 }], 5.2, 7.5, 0.5);
    }
    if (briar) {
      addPathZones([meadowEastFork, { x: 76, z: -62 }, briarFork, { x: briar.x - 8, z: briar.z + 8 }], 4.9, 7.2, 0.5);
    }
    zones.push(...landmarkZones);
    if (mountain) {
      zones.push(
        { x: mountain.x + 22, z: mountain.z - 28, radius: 34, blend: 16, strength: 0.9 },
        { x: mountain.x + 8, z: mountain.z - 6, radius: 15, blend: 10, strength: 0.82 },
        { x: 78, z: 112, radius: 7, blend: 8, strength: 0.72 }
      );
    }
    if (desert) {
      const siltwell = { x: desert.x + 115, z: desert.z + 45 };
      zones.push(
        { x: desert.x + 14, z: desert.z + 6, radius: 34, blend: 16, strength: 0.9 },
        { x: desert.x - 22, z: desert.z + 18, radius: 12, blend: 8, strength: 0.86 },
        { x: siltwell.x, z: siltwell.z, radius: 19, blend: 9, strength: 0.84 },
        { x: -82, z: -92, radius: 6, blend: 7, strength: 0.66 },
        { x: -58, z: -74, radius: 7, blend: 8, strength: 0.72 }
      );
    }
    if (swamp) {
      zones.push(
        { x: swamp.x + 10, z: swamp.z - 10, radius: 35, blend: 17, strength: 0.9 },
        { x: swamp.x - 4, z: swamp.z + 3, radius: 13, blend: 8, strength: 0.86 },
        { x: -92, z: 128, radius: 7, blend: 8, strength: 0.72 }
      );
    }
    if (briar) {
      zones.push(
        { x: briar.x - 8, z: briar.z + 8, radius: 35, blend: 16, strength: 0.9 },
        { x: briar.x + 12, z: briar.z - 10, radius: 15, blend: 9, strength: 0.84 },
        { x: briar.x - 30, z: briar.z + 18, radius: 11, blend: 8, strength: 0.78 },
        { x: 98, z: -72, radius: 7, blend: 8, strength: 0.72 }
      );
    }
    for (const zone of zones) {
      registerExplorationFlatZone(zone.x, zone.z, zone.radius, zone.blend, zone.height ?? null, zone.strength);
    }
  }

  const BIOME_PATCH_LIFT = 0.032;
  const LAKE_SURFACE_LIFT = 0.084;
  const ROAD_SURFACE_LIFT = 0.112;
  const BIOME_PATCH_RENDER_ORDER = 1;
  const LAKE_SURFACE_RENDER_ORDER = 3;
  const ROAD_SURFACE_RENDER_ORDER = 4;

  function createRoadStripGeometry(fromX, fromZ, toX, toZ, width) {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const length = Math.max(0.1, Math.hypot(dx, dz));
    const ux = dx / length;
    const uz = dz / length;
    const nx = -uz;
    const nz = ux;
    const overlap = Math.min(width * 0.42, 1.6);
    const startX = fromX - ux * overlap;
    const startZ = fromZ - uz * overlap;
    const endX = toX + ux * overlap;
    const endZ = toZ + uz * overlap;
    const totalLength = Math.max(0.1, Math.hypot(endX - startX, endZ - startZ));
    const segments = Math.max(2, Math.ceil(totalLength / 7));
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const cx = startX + (endX - startX) * t;
      const cz = startZ + (endZ - startZ) * t;
      // Sample the ground under each edge separately so the strip banks with
      // cross-sloped terrain instead of burying one edge and floating the other.
      const lx = cx + nx * width * 0.5;
      const lz = cz + nz * width * 0.5;
      const rx = cx - nx * width * 0.5;
      const rz = cz - nz * width * 0.5;
      positions.push(
        lx, explorationTerrainHeight(lx, lz) + ROAD_SURFACE_LIFT, lz,
        rx, explorationTerrainHeight(rx, rz) + ROAD_SURFACE_LIFT, rz
      );
      uvs.push(0, t * totalLength / 5, 1, t * totalLength / 5);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  // Subdivide road waypoints so ribbon cross-sections track the terrain at
  // least every maxSpacing units; with the more dramatic relief, waypoint-only
  // sampling would let long spans sink into or float over the ground.
  function densifyRoadPoints(points, maxSpacing = 7) {
    const result = [points[0]];
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.max(1, Math.ceil(length / maxSpacing));
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        result.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      }
    }
    return result;
  }

  function createRoadRibbonGeometry(waypoints, width) {
    const points = densifyRoadPoints(waypoints, 7);
    const positions = [];
    const uvs = [];
    const indices = [];
    let distance = 0;
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      if (i > 0) {
        distance += Math.hypot(point.x - prev.x, point.z - prev.z);
      }

      let normalX = 0;
      let normalZ = 1;
      let miterScale = 1;
      if (i === 0 || i === points.length - 1) {
        const other = i === 0 ? next : prev;
        const dx = i === 0 ? other.x - point.x : point.x - other.x;
        const dz = i === 0 ? other.z - point.z : point.z - other.z;
        const length = Math.max(0.001, Math.hypot(dx, dz));
        normalX = -dz / length;
        normalZ = dx / length;
      } else {
        const prevDx = point.x - prev.x;
        const prevDz = point.z - prev.z;
        const nextDx = next.x - point.x;
        const nextDz = next.z - point.z;
        const prevLength = Math.max(0.001, Math.hypot(prevDx, prevDz));
        const nextLength = Math.max(0.001, Math.hypot(nextDx, nextDz));
        const prevNormalX = -prevDz / prevLength;
        const prevNormalZ = prevDx / prevLength;
        const nextNormalX = -nextDz / nextLength;
        const nextNormalZ = nextDx / nextLength;
        normalX = prevNormalX + nextNormalX;
        normalZ = prevNormalZ + nextNormalZ;
        const normalLength = Math.hypot(normalX, normalZ);
        if (normalLength < 0.001) {
          normalX = nextNormalX;
          normalZ = nextNormalZ;
        } else {
          normalX /= normalLength;
          normalZ /= normalLength;
          const denom = Math.max(0.24, Math.abs(normalX * nextNormalX + normalZ * nextNormalZ));
          miterScale = clamp(1 / denom, 0.72, 1.65);
        }
      }

      const edge = width * 0.5 * miterScale;
      // Per-edge ground samples keep the ribbon hugging cross-sloped terrain.
      const lx = point.x + normalX * edge;
      const lz = point.z + normalZ * edge;
      const rx = point.x - normalX * edge;
      const rz = point.z - normalZ * edge;
      positions.push(
        lx, explorationTerrainHeight(lx, lz) + ROAD_SURFACE_LIFT, lz,
        rx, explorationTerrainHeight(rx, rz) + ROAD_SURFACE_LIFT, rz
      );
      uvs.push(0, distance / 5, 1, distance / 5);
      if (i < points.length - 1) {
        const base = i * 2;
        indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function createRoadJunctionGeometry(x, z, radius) {
    const positions = [x, explorationTerrainHeight(x, z) + ROAD_SURFACE_LIFT, z];
    const uvs = [0.5, 0.5];
    const indices = [];
    const steps = 28;
    for (let i = 0; i <= steps; i += 1) {
      const angle = (i / steps) * TAU;
      const px = x + Math.cos(angle) * radius;
      const pz = z + Math.sin(angle) * radius;
      positions.push(px, explorationTerrainHeight(px, pz) + ROAD_SURFACE_LIFT, pz);
      uvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
      if (i > 0) {
        indices.push(0, i + 1, i);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function addExplorationPath(group, fromX, fromZ, toX, toZ, width) {
    const path = new THREE.Mesh(createRoadStripGeometry(fromX, fromZ, toX, toZ, width), materials.path);
    path.renderOrder = ROAD_SURFACE_RENDER_ORDER;
    path.receiveShadow = true;
    group.add(path);
    game.exploration.roads.push({ fromX, fromZ, toX, toZ, width });
    return path;
  }

  function addExplorationRoadRibbon(group, points, width) {
    if (points.length < 2) {
      return null;
    }
    const path = new THREE.Mesh(createRoadRibbonGeometry(points, width), materials.path);
    path.renderOrder = ROAD_SURFACE_RENDER_ORDER;
    path.receiveShadow = true;
    group.add(path);
    for (let i = 0; i < points.length - 1; i += 1) {
      game.exploration.roads.push({
        fromX: points[i].x,
        fromZ: points[i].z,
        toX: points[i + 1].x,
        toZ: points[i + 1].z,
        width
      });
    }
    return path;
  }

  function addExplorationRoadJunction(group, x, z, width) {
    const radius = width * 0.62;
    const existing = game.exploration.roadJunctions.find(junction => (
      Math.hypot(junction.x - x, junction.z - z) < Math.max(0.7, Math.min(junction.radius, radius) * 0.8)
    ));
    if (existing) {
      return existing.mesh;
    }
    const junction = new THREE.Mesh(createRoadJunctionGeometry(x, z, radius), materials.path);
    junction.renderOrder = ROAD_SURFACE_RENDER_ORDER;
    junction.receiveShadow = true;
    group.add(junction);
    game.exploration.roadJunctions.push({ x, z, radius, mesh: junction });
    return junction;
  }

  function roadLakeLocal(lake) {
    return {
      x: lake.x - game.exploration.origin.x,
      z: lake.z - game.exploration.origin.z,
      rx: lake.rx,
      rz: lake.rz
    };
  }

  function distanceToRoadSegment(localX, localZ, road) {
    const dx = road.toX - road.fromX;
    const dz = road.toZ - road.fromZ;
    const lengthSq = dx * dx + dz * dz;
    if (lengthSq <= 0.0001) {
      return Math.hypot(localX - road.fromX, localZ - road.fromZ);
    }
    const t = clamp(((localX - road.fromX) * dx + (localZ - road.fromZ) * dz) / lengthSq, 0, 1);
    const closestX = road.fromX + dx * t;
    const closestZ = road.fromZ + dz * t;
    return Math.hypot(localX - closestX, localZ - closestZ);
  }

  function roadSegmentTouchesLake(a, b, lake, padding) {
    const steps = Math.max(8, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 5));
    const rx = lake.rx + padding;
    const rz = lake.rz + padding;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = a.x + (b.x - a.x) * t - lake.x;
      const z = a.z + (b.z - a.z) * t - lake.z;
      if ((x * x) / (rx * rx) + (z * z) / (rz * rz) < 1) {
        return true;
      }
    }
    return false;
  }

  function roadDetourPoints(a, b, lake, padding) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    const ux = dx / length;
    const uz = dz / length;
    const nx = -dz / length;
    const nz = dx / length;
    const reach = Math.max(lake.rx, lake.rz) + padding;
    const candidates = [
      { x: lake.x + nx * reach, z: lake.z + nz * reach },
      { x: lake.x - nx * reach, z: lake.z - nz * reach }
    ];
    candidates.sort((left, right) => {
      const leftDistance = Math.hypot(left.x - a.x, left.z - a.z) + Math.hypot(b.x - left.x, b.z - left.z);
      const rightDistance = Math.hypot(right.x - a.x, right.z - a.z) + Math.hypot(b.x - right.x, b.z - right.z);
      return leftDistance - rightDistance;
    });
    const shoulder = Math.min(length * 0.32, reach * 0.7);
    return [
      { x: candidates[0].x - ux * shoulder, z: candidates[0].z - uz * shoulder },
      { x: candidates[0].x + ux * shoulder, z: candidates[0].z + uz * shoulder }
    ];
  }

  function routeRoadAroundLakes(points, width) {
    const routed = [points[0]];
    for (let i = 1; i < points.length; i += 1) {
      const from = routed[routed.length - 1];
      const to = points[i];
      const lake = game.exploration.lakes
        .map(roadLakeLocal)
        .find(candidate => roadSegmentTouchesLake(from, to, candidate, width + 2.2));
      if (lake) {
        routed.push(...roadDetourPoints(from, to, lake, Math.max(width + 5.5, 9.5)));
      }
      routed.push(to);
    }
    return routed;
  }

  function roadWindingSettings(style = "wild") {
    if (style === "formal") {
      return { spacing: 36, maxOffset: 2.15, strength: 0.075 };
    }
    if (style === "lane") {
      return { spacing: 20, maxOffset: 2.75, strength: 0.12 };
    }
    if (style === "mountain") {
      return { spacing: 24, maxOffset: 6.4, strength: 0.2 };
    }
    if (style === "desert") {
      return { spacing: 34, maxOffset: 5.6, strength: 0.17 };
    }
    if (style === "swamp") {
      return { spacing: 20, maxOffset: 6.0, strength: 0.22 };
    }
    if (style === "briar") {
      return { spacing: 18, maxOffset: 6.6, strength: 0.24 };
    }
    return { spacing: 28, maxOffset: 5.35, strength: 0.16 };
  }

  function roadWindingKey(a, b, style, index) {
    return [
      game.exploration.seed || "explore-local",
      style,
      index,
      Math.round(a.x * 10),
      Math.round(a.z * 10),
      Math.round(b.x * 10),
      Math.round(b.z * 10)
    ].join(":");
  }

  function addWindingRoadPoints(points, style = "wild") {
    if (points.length < 2) {
      return points.slice();
    }
    const settings = roadWindingSettings(style);
    const result = [points[0]];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      const steps = Math.max(0, Math.floor(length / settings.spacing));
      const nx = length > 0.001 ? -dz / length : 0;
      const nz = length > 0.001 ? dx / length : 0;
      const random = seededRandom(roadWindingKey(a, b, style, i));
      const phase = random() * TAU;
      const drift = (random() - 0.5) * 2;
      const segmentOffset = Math.min(settings.maxOffset, length * settings.strength);
      for (let step = 1; step <= steps; step += 1) {
        const t = step / (steps + 1);
        const ease = Math.sin(t * Math.PI);
        const wave = Math.sin(t * Math.PI * (1.35 + random() * 0.55) + phase);
        const smallTurn = (random() - 0.5) * 0.75;
        const offset = (wave * 0.62 + drift * 0.28 + smallTurn * 0.2) * segmentOffset * ease;
        result.push({
          x: a.x + dx * t + nx * offset,
          z: a.z + dz * t + nz * offset
        });
      }
      result.push(b);
    }
    return result;
  }

  function addExplorationRoad(group, points, width = 2.8, style = "wild", options = {}) {
    const winding = addWindingRoadPoints(points, style);
    const routed = routeRoadAroundLakes(winding, width);
    addExplorationRoadRibbon(group, routed, width);
    const junctions = [];
    if (options.junctionMode === "all") {
      junctions.push(...points);
    } else if (options.junctionMode !== "none") {
      junctions.push(points[0], points[points.length - 1]);
    }
    if (Array.isArray(options.junctions)) {
      junctions.push(...options.junctions);
    }
    for (const point of points) {
      if (point.junction) {
        junctions.push(point);
      }
    }
    const seen = new Set();
    for (const point of junctions) {
      const key = Math.round(point.x * 4) + ":" + Math.round(point.z * 4);
      if (!seen.has(key)) {
        seen.add(key);
        addExplorationRoadJunction(group, point.x, point.z, width * (point.major ? 1.08 : 0.82));
      }
    }
  }

  function roadEntranceForVillage(village, approach) {
    const localX = village.localX ?? (village.x - game.exploration.origin.x);
    const localZ = village.localZ ?? (village.z - game.exploration.origin.z);
    const dx = approach.x - localX;
    const dz = approach.z - localZ;
    const distance = Math.max(0.001, Math.hypot(dx, dz));
    const inset = Math.max(5.5, village.radius * 0.46);
    return {
      x: localX + (dx / distance) * inset,
      z: localZ + (dz / distance) * inset
    };
  }

  function addExplorationRoadNetwork(group) {
    const homeDoor = { x: 0, z: -2.4 };
    const homeJunction = { x: 0, z: -17 };
    const meadowEastFork = { x: 58, z: -48 };
    const meadowWestFork = { x: -64, z: 42 };
    const northFork = { x: 0, z: 86 };
    const mountainFork = { x: 78, z: 112 };
    const desertFork = { x: -58, z: -74 };
    const swampFork = { x: -92, z: 128 };
    const briarFork = { x: 98, z: -72 };
    const desert = game.exploration.biomes.find(biome => biome.id === "desert");

    addExplorationRoad(group, [
      homeDoor,
      { ...homeJunction, junction: true, major: true },
      { x: -7, z: 18 },
      { x: 4, z: 43 },
      { x: -5, z: 66 },
      { ...northFork, junction: true, major: true }
    ], 3.15, "wild");

    const city = game.exploration.city;
    if (city) {
      const cityGate = city.roadAnchor || { x: city.localX, z: city.localZ - 44 };
      addExplorationRoad(group, [northFork, { x: -4, z: northFork.z + 18 }, { x: cityGate.x * 0.45, z: cityGate.z - 27 }, { x: cityGate.x - 4, z: cityGate.z - 12 }, { ...cityGate, junction: true, major: true }], 3.25, "formal");
    }
    const arenaCity = game.exploration.arenaCity;
    if (arenaCity) {
      const arenaGate = arenaCity.roadAnchor || { x: arenaCity.localX - 34, z: arenaCity.localZ - 18 };
      addExplorationRoad(group, [northFork, { x: 34, z: 100 }, { x: 72, z: 91 }, { x: arenaGate.x - 18, z: arenaGate.z - 9 }, { ...arenaGate, junction: true, major: true }], 3.05, "formal");
    }
    addExplorationRoad(group, [{ x: 72, z: 91, junction: true }, { x: 67, z: 87 }, { x: 63, z: 81, junction: true }], 2.15, "lane");
    if (desert) {
      const siltwell = { x: desert.x + 115, z: desert.z + 45 };
      addExplorationRoad(group, [desertFork, { x: -82, z: -92 }, { ...siltwell, junction: true }], 2.15, "desert");
    }

    for (const village of game.exploration.villages) {
      if (village.id === "crownford" || village.id === "crownring") {
        continue;
      }
      const localX = village.localX ?? (village.x - game.exploration.origin.x);
      const localZ = village.localZ ?? (village.z - game.exploration.origin.z);
      let entrance;
      if (village.biome === "mountain") {
        entrance = roadEntranceForVillage(village, mountainFork);
        addExplorationRoad(group, [northFork, { x: 24, z: 99 }, { x: 56, z: 122 }, { ...mountainFork, junction: true, major: true }, { x: mountainFork.x + 17, z: mountainFork.z + 8 }, entrance], 2.85, "mountain");
      } else if (village.biome === "desert") {
        entrance = roadEntranceForVillage(village, desertFork);
        addExplorationRoad(group, [homeJunction, { x: -18, z: -42 }, { x: -48, z: -58 }, { ...desertFork, junction: true, major: true }, { x: desertFork.x - 28, z: desertFork.z - 15 }, entrance], 2.75, "desert");
      } else if (village.biome === "swamp") {
        entrance = roadEntranceForVillage(village, swampFork);
        addExplorationRoad(group, [northFork, { x: -28, z: 104 }, { x: -66, z: 124 }, { ...swampFork, junction: true, major: true }, { x: swampFork.x - 24, z: swampFork.z + 10 }, entrance], 2.65, "swamp");
      } else if (village.biome === "briar") {
        entrance = roadEntranceForVillage(village, briarFork);
        addExplorationRoad(group, [meadowEastFork, { x: 76, z: -62 }, { ...briarFork, junction: true, major: true }, { x: briarFork.x + 24, z: briarFork.z - 12 }, entrance], 2.55, "briar");
      } else if (localX >= 0) {
        entrance = roadEntranceForVillage(village, meadowEastFork);
        addExplorationRoad(group, [homeJunction, { x: 18, z: -31 }, { x: 43, z: -58 }, { ...meadowEastFork, junction: true, major: true }, entrance], 2.75, "wild");
      } else {
        entrance = roadEntranceForVillage(village, meadowWestFork);
        addExplorationRoad(group, [homeJunction, { x: -22, z: 3 }, { x: -46, z: 30 }, { ...meadowWestFork, junction: true, major: true }, entrance], 2.75, "wild");
      }
      addExplorationRoad(group, [{ ...entrance, junction: true }, { x: localX, z: localZ }], 2.2, "lane");
    }
    addRoadsideWayfindingDecor(group);
  }

  function makeDecorGroup(group, x, z, rotation = 0, scale = 1) {
    const decor = new THREE.Group();
    setExplorationLocalGroundPosition(decor, x, z);
    decor.rotation.y = rotation;
    decor.scale.setScalar(scale);
    group.add(decor);
    return decor;
  }

  function offsetFromFacing(x, z, rotation, forward, side = 0) {
    const fx = -Math.sin(rotation);
    const fz = -Math.cos(rotation);
    const sx = Math.cos(rotation);
    const sz = -Math.sin(rotation);
    return {
      x: x + fx * forward + sx * side,
      z: z + fz * forward + sz * side
    };
  }

  function addCart(group, x, z, rotation, scale = 1) {
    const cart = makeDecorGroup(group, x, z, rotation, scale);
    const bed = makeBox(1.55, 0.28, 0.95, materials.paleWood, 0, 0.42, 0);
    const sideA = makeBox(0.12, 0.38, 1.08, materials.wood, -0.82, 0.62, 0);
    const sideB = makeBox(0.12, 0.38, 1.08, materials.wood, 0.82, 0.62, 0);
    const front = makeBox(1.65, 0.35, 0.1, materials.wood, 0, 0.6, -0.54);
    const handleA = makeBox(0.08, 0.08, 1.05, materials.wood, -0.42, 0.48, -1.0);
    const handleB = makeBox(0.08, 0.08, 1.05, materials.wood, 0.42, 0.48, -1.0);
    handleA.rotation.x = 0.18;
    handleB.rotation.x = 0.18;
    const hay = makeBox(0.9, 0.22, 0.56, materials.dryBrush, 0.08, 0.78, 0.1);
    hay.rotation.y = -0.16;
    const wheelPositions = [
      [-0.86, -0.34],
      [0.86, -0.34],
      [-0.86, 0.36],
      [0.86, 0.36]
    ];
    const wheels = wheelPositions.map(([wx, wz]) => {
      const wheel = makeCylinder(0.22, 0.22, 0.12, 12, materials.darkLeather, wx, 0.26, wz);
      wheel.rotation.z = Math.PI / 2;
      return wheel;
    });
    cart.add(bed, sideA, sideB, front, handleA, handleB, hay, ...wheels);
    addExplorationCollider(x, z, scale * 1.25, "decor");
    return cart;
  }

  function addBucket(group, x, z, rotation = 0, scale = 1) {
    const bucket = makeDecorGroup(group, x, z, rotation, scale);
    const body = makeCylinder(0.2, 0.24, 0.34, 10, materials.clay, 0, 0.18, 0);
    const rim = makeCylinder(0.23, 0.23, 0.035, 10, materials.rope, 0, 0.36, 0);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 16, Math.PI), materials.iron);
    handle.position.set(0, 0.4, 0);
    handle.rotation.x = Math.PI / 2;
    bucket.add(body, rim, handle);
    return bucket;
  }

  function addBroom(group, x, z, rotation = 0, scale = 1) {
    const broom = makeDecorGroup(group, x, z, rotation, scale);
    const handle = makeCylinder(0.025, 0.035, 1.15, 7, materials.rope, 0, 0.58, 0);
    handle.rotation.z = 0.34;
    const brush = makeBox(0.28, 0.34, 0.18, materials.dryBrush, -0.18, 0.12, 0);
    brush.rotation.z = 0.16;
    broom.add(handle, brush);
    return broom;
  }

  function addWoodPile(group, x, z, rotation = 0, scale = 1) {
    const pile = makeDecorGroup(group, x, z, rotation, scale);
    for (let i = 0; i < 5; i += 1) {
      const row = i > 2 ? 1 : 0;
      const log = makeCylinder(0.08, 0.09, 0.86 + (i % 2) * 0.18, 8, materials.wood, -0.28 + (i % 3) * 0.28, 0.12 + row * 0.16, row * 0.18);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i - 2) * 0.06;
      pile.add(log);
    }
    addExplorationCollider(x, z, scale * 0.62, "decor");
    return pile;
  }

  function addTrough(group, x, z, rotation = 0, scale = 1) {
    const trough = makeDecorGroup(group, x, z, rotation, scale);
    const base = makeBox(1.18, 0.2, 0.44, materials.wood, 0, 0.22, 0);
    const sideA = makeBox(1.26, 0.32, 0.1, materials.wood, 0, 0.36, -0.28);
    const sideB = makeBox(1.26, 0.32, 0.1, materials.wood, 0, 0.36, 0.28);
    const water = makeBox(1.04, 0.035, 0.32, materials.water.clone(), 0, 0.54, 0);
    trough.add(base, sideA, sideB, water);
    addExplorationCollider(x, z, scale * 0.78, "decor");
    return trough;
  }

  function addBarrel(group, x, z, rotation = 0, scale = 1) {
    const barrel = makeDecorGroup(group, x, z, rotation, scale);
    const body = makeCylinder(0.34, 0.34, 0.74, 12, materials.wood, 0, 0.38, 0);
    const bandA = makeCylinder(0.355, 0.355, 0.045, 12, materials.iron, 0, 0.22, 0);
    const bandB = makeCylinder(0.355, 0.355, 0.045, 12, materials.iron, 0, 0.55, 0);
    barrel.add(body, bandA, bandB);
    addExplorationCollider(x, z, scale * 0.52, "decor");
    return barrel;
  }

  function addCrateStack(group, x, z, rotation = 0, scale = 1) {
    const stack = makeDecorGroup(group, x, z, rotation, scale);
    const crateA = makeBox(0.72, 0.52, 0.62, materials.paleWood, -0.22, 0.26, 0);
    const crateB = makeBox(0.62, 0.42, 0.56, materials.wood, 0.34, 0.21, 0.14);
    const crateC = makeBox(0.5, 0.36, 0.46, materials.basket, -0.02, 0.72, -0.1);
    crateC.rotation.y = 0.25;
    stack.add(crateA, crateB, crateC);
    addExplorationCollider(x, z, scale * 0.8, "decor");
    return stack;
  }

  function addLanternPost(group, x, z, rotation = 0, scale = 1) {
    const post = makeDecorGroup(group, x, z, rotation, scale);
    const pole = makeCylinder(0.055, 0.075, 1.7, 8, materials.wood, 0, 0.85, 0);
    const arm = makeBox(0.78, 0.07, 0.07, materials.wood, 0.36, 1.52, 0);
    const hook = makeCylinder(0.018, 0.018, 0.28, 6, materials.iron, 0.72, 1.39, 0);
    const lamp = makeSphere(0.13, materials.lampGlow.clone(), 0.72, 1.22, 0);
    post.add(pole, arm, hook, lamp);
    addExplorationCollider(x, z, scale * 0.45, "decor");
    return post;
  }

  function addBench(group, x, z, rotation = 0, scale = 1) {
    const bench = makeDecorGroup(group, x, z, rotation, scale);
    const seat = makeBox(1.35, 0.16, 0.38, materials.paleWood, 0, 0.42, 0);
    const legA = makeBox(0.12, 0.48, 0.12, materials.wood, -0.48, 0.24, -0.08);
    const legB = makeBox(0.12, 0.48, 0.12, materials.wood, 0.48, 0.24, -0.08);
    bench.add(seat, legA, legB);
    return bench;
  }

  function addBannerPole(group, x, z, rotation = 0, scale = 1) {
    const banner = makeDecorGroup(group, x, z, rotation, scale);
    const pole = makeCylinder(0.05, 0.07, 2.1, 8, materials.wood, 0, 1.05, 0);
    const crossbar = makeBox(0.92, 0.06, 0.06, materials.wood, 0.36, 1.8, 0);
    const cloth = makeBox(0.62, 0.74, 0.035, materials.cityBannerRed, 0.46, 1.38, 0);
    cloth.rotation.z = -0.08;
    banner.add(pole, crossbar, cloth);
    addExplorationCollider(x, z, scale * 0.45, "decor");
    return banner;
  }

  function addTrainingDummy(group, x, z, rotation = 0, scale = 1) {
    const dummy = makeDecorGroup(group, x, z, rotation, scale);
    const pole = makeCylinder(0.055, 0.08, 1.55, 8, materials.wood, 0, 0.78, 0);
    const body = makeBox(0.52, 0.72, 0.24, materials.basket, 0, 1.02, 0);
    const arms = makeBox(1.18, 0.08, 0.08, materials.wood, 0, 1.22, 0);
    const helm = makeCylinder(0.24, 0.28, 0.18, 10, materials.iron, 0, 1.48, 0);
    dummy.add(pole, body, arms, helm);
    addExplorationCollider(x, z, scale * 0.72, "decor");
    return dummy;
  }

  function addSignpost(group, x, z, rotation = 0, scale = 1, markerMaterial = materials.paleWood) {
    const sign = makeDecorGroup(group, x, z, rotation, scale);
    const post = makeCylinder(0.055, 0.075, 1.45, 7, materials.wood, 0, 0.72, 0);
    const armA = makeBox(0.92, 0.18, 0.08, materials.paleWood, 0.42, 1.22, 0);
    const armB = makeBox(0.72, 0.16, 0.08, materials.wood, -0.34, 0.96, 0);
    const cap = makeCone(0.14, 0.24, 5, markerMaterial, 0, 1.56, 0);
    armA.rotation.z = -0.08;
    armB.rotation.z = 0.06;
    sign.add(post, armA, armB, cap);
    addExplorationCollider(x, z, scale * 0.44, "decor");
    return sign;
  }

  function addRoadsideSupplyStop(group, x, z, rotation = 0, scale = 1, style = "meadow") {
    const side = offsetFromFacing(x, z, rotation, 0, 1.45 * scale);
    if (style === "desert") {
      addCrateStack(group, x, z, rotation + 0.2, scale * 0.84);
      addBucket(group, side.x, side.z, rotation - 0.4, scale * 1.05);
      addBucket(group, side.x + Math.cos(rotation) * 0.56, side.z - Math.sin(rotation) * 0.56, rotation + 0.18, scale * 0.88);
      addDryBush(group, x - Math.cos(rotation) * 1.15, z + Math.sin(rotation) * 1.15, () => 0.44);
      return;
    }
    if (style === "swamp") {
      addBench(group, x, z, rotation + 0.12, scale * 0.96);
      addBucket(group, side.x, side.z, rotation, scale * 0.95);
      addReeds(group, x - Math.cos(rotation) * 1.2, z + Math.sin(rotation) * 1.2, () => 0.42);
      return;
    }
    if (style === "mountain") {
      addCrateStack(group, x, z, rotation - 0.25, scale * 0.88);
      addBarrel(group, side.x, side.z, rotation + 0.18, scale * 0.9);
      addWoodPile(group, x - Math.cos(rotation) * 1.35, z + Math.sin(rotation) * 1.35, rotation + 0.5, scale * 0.9);
      return;
    }
    addCart(group, x, z, rotation, scale * 0.92);
    addCrateStack(group, side.x, side.z, rotation - 0.18, scale * 0.82);
    addTrough(group, x - Math.cos(rotation) * 1.35, z + Math.sin(rotation) * 1.35, rotation + 0.1, scale * 0.86);
  }

  function addRoadsideWayfindingDecor(group) {
    addSignpost(group, 4.7, -18.0, -0.18, 0.95, materials.flower);
    addLanternPost(group, -4.6, -19.2, 0.24, 0.86);
    addWoodPile(group, 5.9, -13.2, 0.42, 0.86);
    addTrough(group, -5.8, -13.7, -0.24, 0.9);
    addSignpost(group, -5.2, 87.4, -0.5, 1.0, materials.cityRoof);
    addLanternPost(group, 5.0, 83.8, -0.15, 0.88);
    addRoadsideSupplyStop(group, -8.6, 82.2, -0.52, 0.92);
    addSignpost(group, 53.5, -52.0, 0.68, 0.92, materials.broadleaf);
    addRoadsideSupplyStop(group, 60.8, -49.8, 0.72, 0.82);
    addSignpost(group, -59.0, 47.0, -0.82, 0.92, materials.broadleaf);
    addRoadsideSupplyStop(group, -67.4, 43.6, -0.78, 0.82);
    addSignpost(group, 75.0, 117.5, 0.9, 0.96, materials.darkStone);
    addLanternPost(group, 82.5, 107.8, 0.5, 0.82);
    addRoadsideSupplyStop(group, 84.0, 119.8, 0.9, 0.9, "mountain");
    addSignpost(group, -64.5, -70.8, -0.95, 0.96, materials.dryBrush);
    addBucket(group, -61.4, -77.0, 0.2, 0.92);
    addRoadsideSupplyStop(group, -68.8, -79.4, -0.85, 0.92, "desert");
    addSignpost(group, -98.5, 132.0, -0.5, 0.96, materials.reed);
    addLanternPost(group, -88.6, 123.4, -0.7, 0.78);
    addRoadsideSupplyStop(group, -101.2, 124.2, -0.5, 0.88, "swamp");

    const city = game.exploration.city;
    if (city) {
      const gate = city.roadAnchor || { x: city.localX, z: city.localZ - 44 };
      addBannerPole(group, gate.x - 7.4, gate.z - 2.8, 0.12, 0.96);
      addBannerPole(group, gate.x + 7.4, gate.z - 2.8, -0.12, 0.96);
      addCrateStack(group, gate.x - 10.2, gate.z + 4.4, 0.18, 0.84);
      addBarrel(group, gate.x + 10.2, gate.z + 4.6, -0.12, 0.84);
      addBench(group, gate.x - 4.6, gate.z + 7.2, 0.12, 0.92);
      addTrough(group, gate.x + 4.4, gate.z + 7.5, -0.1, 0.88);
    }
    const arenaCity = game.exploration.arenaCity;
    if (arenaCity) {
      const gate = arenaCity.roadAnchor || { x: arenaCity.localX - 34, z: arenaCity.localZ - 18 };
      addBannerPole(group, gate.x - 5.8, gate.z - 2.1, 0.08, 0.88);
      addBannerPole(group, gate.x + 5.8, gate.z - 2.1, -0.08, 0.88);
      addLanternPost(group, gate.x - 8.2, gate.z + 1.7, 0.18, 0.78);
      addTrainingDummy(group, gate.x + 8.4, gate.z + 2.4, -0.25, 0.82);
      addBarrel(group, gate.x + 5.6, gate.z + 5.2, -0.2, 0.78);
    }
  }

  function addBiomeVillageProp(group, village, random) {
    const x = village.localX;
    const z = village.localZ;
    if (village.biome === "desert") {
      addBucket(group, x - 1.6, z + 1.2, random() * TAU, 1.25);
      addBucket(group, x - 2.1, z + 1.55, random() * TAU, 1.05);
      addCrateStack(group, x + 3.3, z - 2.4, 0.35, 0.9);
    } else if (village.biome === "mountain") {
      addCrateStack(group, x + 2.8, z + 2.6, -0.4, 1.0);
      addBarrel(group, x + 3.8, z + 1.7, 0.2, 0.9);
      addLanternPost(group, x - 3.2, z - 2.6, -0.7, 0.92);
    } else if (village.biome === "swamp") {
      addBench(group, x - 2.8, z + 2.4, 0.38, 0.95);
      addBucket(group, x + 1.8, z - 2.6, 0.2, 1.05);
      addLanternPost(group, x + 3.2, z + 0.4, 0.4, 0.88);
    } else if (village.biome === "briar") {
      addCharcoalClamp(group, x + 3.4, z - 2.6, -0.35, 0.96);
      addBench(group, x - 3.2, z + 2.2, 0.52, 0.95);
      addLanternPost(group, x + 0.7, z + 3.6, -0.24, 0.9);
      addBramblePatch(group, x - 4.4, z - 1.6, random, 0.85);
    } else {
      addCart(group, x + 3.7, z - 2.8, -0.65, 0.95);
      addBench(group, x - 3.5, z + 1.7, 0.5, 0.95);
      addLanternPost(group, x + 1.2, z + 3.5, -0.15, 0.95);
    }
  }

  function addVillageDecor(group, village, houses, random) {
    const x = village.localX;
    const z = village.localZ;
    addBucket(group, x + 1.05, z + 0.72, 0.2, 1.05);
    addBucket(group, x + 1.5, z + 0.98, -0.15, 0.9);
    addCrateStack(group, x - 2.6, z - 2.2, random() * TAU, 0.92);
    addBiomeVillageProp(group, village, random);
    for (let i = 0; i < Math.min(2, houses.length); i += 1) {
      const house = houses[i];
      const broomSpot = offsetFromFacing(house.x, house.z, house.rotation, 2.9 * house.scale, (i === 0 ? -1 : 1) * 1.35 * house.scale);
      addBroom(group, broomSpot.x, broomSpot.z, house.rotation + (i === 0 ? -0.2 : 0.24), 0.95);
    }
  }

  function addCrownfordDecor(group, city, random) {
    const x = city.localX;
    const z = city.localZ;
    addCart(group, x - 17.5, z - 27.5, 1.28, 1.05);
    addCrateStack(group, x - 20.5, z - 24.5, -0.24, 1.05);
    addBarrel(group, x - 18.5, z - 22.6, 0.1, 1.0);
    addLanternPost(group, x - 13.5, z - 17.5, -0.2, 1.05);
    addLanternPost(group, x + 13.5, z - 16.5, 0.2, 1.05);
    addLanternPost(group, x + 28.5, z - 8.5, Math.PI / 2, 1.0);
    addBannerPole(group, x - 32.5, z + 15.5, 0.15, 1.05);
    addBannerPole(group, x - 19.0, z + 26.0, -0.18, 1.05);
    addTrainingDummy(group, x - 12.0, z - 15.0, -0.25, 1.05);
    addTrainingDummy(group, x - 15.5, z - 12.6, 0.18, 0.95);
    addBucket(group, x + 27.8, z - 5.5, 0.2, 1.0);
    addBench(group, x + 22.4, z + 6.8, -0.4, 1.0);
  }

  function addStable(group, x, z) {
    const stable = new THREE.Group();
    setExplorationLocalGroundPosition(stable, x, z);
    const postPositions = [
      [-1.8, 0, -1.2],
      [1.8, 0, -1.2],
      [-1.8, 0, 1.2],
      [1.8, 0, 1.2]
    ];
    for (const [px, py, pz] of postPositions) {
      stable.add(makeBox(0.18, 1.85, 0.18, materials.wood, px, 0.92 + py, pz));
    }
    const roofA = makeBox(4.8, 0.28, 1.95, materials.roof, 0, 2.34, -0.58);
    const roofB = makeBox(4.8, 0.28, 1.95, materials.roof, 0, 2.34, 0.58);
    roofA.rotation.x = -0.48;
    roofB.rotation.x = 0.48;
    const railBack = makeBox(3.8, 0.16, 0.14, materials.wood, 0, 0.88, 1.38);
    const railLeft = makeBox(0.14, 0.16, 2.3, materials.wood, -2.0, 0.8, 0);
    const hay = makeBox(1.1, 0.36, 0.78, materials.dryBrush, 0.75, 0.2, 0.8);
    hay.rotation.y = 0.18;
    stable.add(roofA, roofB, railBack, railLeft, hay);
    stable.rotation.y = -0.28;
    group.add(stable);
    addExplorationCollider(x, z, 2.65, "structure");
  }

  function biomeContains(biome, x, z, padding = 0) {
    const dx = x - biome.x;
    const dz = z - biome.z;
    const rotation = -(biome.rotation || 0);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    const rx = Math.max(1, biome.rx - padding);
    const rz = Math.max(1, biome.rz - padding);
    return (localX * localX) / (rx * rx) + (localZ * localZ) / (rz * rz) <= 1;
  }

  function biomeAt(localX, localZ) {
    for (const biome of game.exploration.biomes) {
      if (biome.id !== "meadow" && biomeContains(biome, localX, localZ)) {
        return biome.id;
      }
    }
    return "meadow";
  }

  function createBiomeTexture(seed, biomeId) {
    const random = seededRandom(seed + "-" + biomeId);
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const desert = biomeId === "desert";
    const mountain = biomeId === "mountain";
    const swamp = biomeId === "swamp";
    const briar = biomeId === "briar";
    ctx.fillStyle = desert ? "#b99258" : mountain ? "#5d635f" : swamp ? "#31513a" : briar ? "#2f5637" : "#45683b";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 850; i += 1) {
      const x = random() * 256;
      const y = random() * 256;
      const r = 0.8 + random() * (desert ? 3.2 : swamp ? 5.4 : briar ? 5.8 : 4.8);
      ctx.fillStyle = desert
        ? (random() > 0.52 ? "rgba(236, 196, 122, 0.2)" : "rgba(111, 79, 42, 0.14)")
        : swamp
          ? (random() > 0.48 ? "rgba(108, 132, 75, 0.2)" : "rgba(13, 35, 31, 0.22)")
          : briar
            ? (random() > 0.44 ? "rgba(101, 132, 70, 0.22)" : "rgba(16, 34, 22, 0.25)")
            : (random() > 0.48 ? "rgba(190, 198, 191, 0.17)" : "rgba(31, 38, 36, 0.18)");
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    if (desert) {
      for (let i = 0; i < 22; i += 1) {
        ctx.strokeStyle = "rgba(237, 202, 135, 0.24)";
        ctx.lineWidth = 2 + random() * 3;
        ctx.beginPath();
        const y = random() * 256;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(70, y - 20 + random() * 40, 170, y - 20 + random() * 40, 256, y + random() * 28);
        ctx.stroke();
      }
    } else if (swamp) {
      for (let i = 0; i < 28; i += 1) {
        ctx.strokeStyle = random() > 0.45 ? "rgba(35, 78, 69, 0.28)" : "rgba(112, 131, 74, 0.2)";
        ctx.lineWidth = 2 + random() * 4;
        ctx.beginPath();
        const y = random() * 256;
        ctx.moveTo(-12, y);
        ctx.bezierCurveTo(62, y - 28 + random() * 56, 160, y - 26 + random() * 52, 268, y + random() * 30 - 15);
        ctx.stroke();
      }
    } else if (briar) {
      for (let i = 0; i < 30; i += 1) {
        ctx.strokeStyle = random() > 0.52 ? "rgba(98, 124, 66, 0.22)" : "rgba(24, 49, 28, 0.28)";
        ctx.lineWidth = 2 + random() * 4;
        ctx.beginPath();
        const y = random() * 256;
        ctx.moveTo(-8, y);
        ctx.bezierCurveTo(52, y - 24 + random() * 48, 154, y - 32 + random() * 64, 264, y + random() * 36 - 18);
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(desert ? 6 : swamp ? 4 : briar ? 4 : 5, desert ? 6 : swamp ? 4 : briar ? 4 : 5);
    return texture;
  }

  function createBiomePatchGeometry(biome, seed) {
    const random = seededRandom(seed + "-patch-" + biome.id);
    const phaseA = random() * TAU;
    const phaseB = random() * TAU;
    const rotation = biome.rotation || 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const positions = [0, explorationGroundLocalY(biome.x, biome.z, BIOME_PATCH_LIFT), 0];
    const uvs = [0.5, 0.5];
    const indices = [];
    const rings = 10;
    const segments = 112;
    const boundaryWobbles = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * TAU;
      boundaryWobbles.push(1
        + Math.sin(angle * 3 + phaseA) * 0.045
        + Math.sin(angle * 5 + phaseB) * 0.03
        + (random() - 0.5) * 0.018);
    }
    const vertexIndex = (ring, segment) => 1 + (ring - 1) * segments + (segment % segments);
    for (let ring = 1; ring <= rings; ring += 1) {
      const radial = ring / rings;
      const edgeBlend = smoothstep(0.25, 1, radial);
      for (let i = 0; i < segments; i += 1) {
        const angle = (i / segments) * TAU;
        const wobble = lerp(1, boundaryWobbles[i], edgeBlend);
        const x = Math.cos(angle) * biome.rx * radial * wobble;
        const z = Math.sin(angle) * biome.rz * radial * wobble;
        const localX = x * cos - z * sin;
        const localZ = x * sin + z * cos;
        const worldLocalX = biome.x + localX;
        const worldLocalZ = biome.z + localZ;
        positions.push(localX, explorationGroundLocalY(worldLocalX, worldLocalZ, BIOME_PATCH_LIFT), localZ);
        uvs.push(0.5 + Math.cos(angle) * 0.5 * radial, 0.5 + Math.sin(angle) * 0.5 * radial);
      }
    }
    for (let i = 0; i < segments; i += 1) {
      const next = (i + 1) % segments;
      indices.push(0, vertexIndex(1, next), vertexIndex(1, i));
    }
    for (let ring = 1; ring < rings; ring += 1) {
      for (let i = 0; i < segments; i += 1) {
        const next = (i + 1) % segments;
        const inner = vertexIndex(ring, i);
        const innerNext = vertexIndex(ring, next);
        const outer = vertexIndex(ring + 1, i);
        const outerNext = vertexIndex(ring + 1, next);
        indices.push(inner, innerNext, outer);
        indices.push(innerNext, outerNext, outer);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function addBiomePatch(group, biome, seed) {
    const baseMaterial = biome.id === "desert" ? materials.desert : biome.id === "swamp" ? materials.swampGround : biome.id === "briar" ? materials.briarGround : materials.mountainGround;
    const material = baseMaterial.clone();
    material.map = createBiomeTexture(seed, biome.id);
    material.depthWrite = false;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -0.35;
    material.polygonOffsetUnits = -1;
    const patch = new THREE.Mesh(createBiomePatchGeometry(biome, seed), material);
    patch.position.set(biome.x, 0, biome.z);
    patch.renderOrder = BIOME_PATCH_RENDER_ORDER;
    patch.receiveShadow = true;
    group.add(patch);
  }

  function addDesertHouse(group, x, z, scale, variant) {
    const house = new THREE.Group();
    setExplorationLocalGroundPosition(house, x, z);
    house.scale.setScalar(scale);
    const walls = materials.adobe;
    const roofMat = materials.dryBrush;
    const base = makeBox(4.9, 0.16, 4.2, materials.desert, 0, 0.08, 0);
    const back = makeBox(4.9, 2.0, 0.26, walls, 0, 1.08, 1.98);
    const left = makeBox(0.26, 2.0, 4.2, walls, -2.32, 1.08, 0);
    const right = makeBox(0.26, 2.0, 4.2, walls, 2.32, 1.08, 0);
    const frontLeft = makeBox(1.72, 2.0, 0.26, walls, -1.55, 1.08, -1.98);
    const frontRight = makeBox(1.72, 2.0, 0.26, walls, 1.55, 1.08, -1.98);
    const lintel = makeBox(1.18, 0.3, 0.28, walls, 0, 1.98, -1.98);
    const flatRoof = makeBox(5.55, 0.28, 4.86, roofMat, 0, 2.46, 0);
    const shade = makeBox(2.2, 0.08, 1.0, materials.cloth, 0, 2.06, -2.42);
    shade.rotation.x = -0.18;
    const dome = makeCylinder(0.1, 0.76, 0.5, 18, walls, variant % 2 ? -1.2 : 1.1, 2.78, 0.85);
    const door = makeBox(0.92, 1.86, 0.08, materials.darkLeather, 0, 0.98, -2.16);
    house.add(base, back, left, right, frontLeft, frontRight, lintel, flatRoof, shade, dome, door);
    if (variant % 2 === 1) {
      house.rotation.y = Math.PI / 2;
    }
    group.add(house);
    addExplorationCollider(x, z, scale * 3.35, "structure");
    return house;
  }

  function addMountainHouse(group, x, z, scale, variant) {
    const house = new THREE.Group();
    setExplorationLocalGroundPosition(house, x, z);
    house.scale.setScalar(scale);
    const wall = variant % 2 ? materials.mountainPlaster : materials.stone;
    const floor = makeBox(5.0, 0.16, 4.4, materials.darkStone, 0, 0.08, 0);
    const back = makeBox(5.0, 2.18, 0.28, wall, 0, 1.18, 2.08);
    const left = makeBox(0.28, 2.18, 4.4, wall, -2.36, 1.18, 0);
    const right = makeBox(0.28, 2.18, 4.4, wall, 2.36, 1.18, 0);
    const frontLeft = makeBox(1.7, 2.18, 0.28, wall, -1.62, 1.18, -2.08);
    const frontRight = makeBox(1.7, 2.18, 0.28, wall, 1.62, 1.18, -2.08);
    const lintel = makeBox(1.35, 0.34, 0.3, materials.wood, 0, 2.08, -2.08);
    const roofA = makeBox(6.05, 0.4, 2.95, materials.darkStone, 0, 3.22, -0.9);
    const roofB = makeBox(6.05, 0.4, 2.95, materials.darkStone, 0, 3.22, 0.9);
    roofA.rotation.x = -0.6;
    roofB.rotation.x = 0.6;
    const beam = makeBox(5.9, 0.14, 0.14, materials.wood, 0, 2.72, -2.2);
    const chimney = makeBox(0.48, 1.0, 0.48, materials.darkStone, 1.32, 3.54, 0.42);
    const door = makeBox(0.92, 1.86, 0.08, materials.wood, 0, 0.98, -2.25);
    house.add(floor, back, left, right, frontLeft, frontRight, lintel, roofA, roofB, beam, chimney, door);
    if (variant % 2 === 1) {
      house.rotation.y = Math.PI / 2;
    }
    group.add(house);
    addExplorationCollider(x, z, scale * 3.35, "structure");
    return house;
  }

  function addSwampHouse(group, x, z, scale, variant) {
    const house = new THREE.Group();
    setExplorationLocalGroundPosition(house, x, z);
    house.scale.setScalar(scale);
    const platform = makeBox(5.7, 0.18, 4.8, materials.swampPlank, 0, 0.62, 0);
    const posts = [
      [-2.35, -1.95],
      [2.35, -1.95],
      [-2.35, 1.95],
      [2.35, 1.95]
    ].map(([px, pz]) => makeCylinder(0.08, 0.12, 1.2, 8, materials.wood, px, 0.6, pz));
    const back = makeBox(4.5, 1.72, 0.24, materials.swampPlank, 0, 1.58, 1.72);
    const left = makeBox(0.24, 1.72, 3.7, materials.swampPlank, -2.13, 1.58, 0);
    const right = makeBox(0.24, 1.72, 3.7, materials.swampPlank, 2.13, 1.58, 0);
    const frontLeft = makeBox(1.45, 1.72, 0.24, materials.swampPlank, -1.35, 1.58, -1.72);
    const frontRight = makeBox(1.45, 1.72, 0.24, materials.swampPlank, 1.35, 1.58, -1.72);
    const door = makeBox(0.86, 1.72, 0.08, materials.darkLeather, 0, 1.47, -1.86);
    const roof = makeCone(3.72, 1.0, 4, materials.thatch, 0, 2.78, 0);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.2, 0.76, 1.0);
    const eave = makeBox(5.55, 0.12, 4.72, materials.thatch, 0, 2.34, 0);
    const lanternMat = materials.wispCore.clone();
    lanternMat.opacity = 0.78;
    const lantern = makeSphere(0.095, lanternMat, -1.72, 1.84, -1.9);
    const railA = makeBox(2.3, 0.1, 0.08, materials.wood, -1.62, 0.98, -2.32);
    const railB = makeBox(2.3, 0.1, 0.08, materials.wood, 1.62, 0.98, -2.32);
    house.add(platform, back, left, right, frontLeft, frontRight, door, roof, eave, lantern, railA, railB, ...posts);
    if (variant % 2 === 1) {
      house.rotation.y = Math.PI / 2;
    }
    group.add(house);
    addExplorationCollider(x, z, scale * 3.45, "structure");
    return house;
  }

  function addBriarHouse(group, x, z, scale, variant) {
    const house = new THREE.Group();
    setExplorationLocalGroundPosition(house, x, z);
    house.scale.setScalar(scale);
    const wall = variant % 2 ? materials.rootwood : materials.paleWood;
    const footing = makeBox(5.25, 0.22, 4.45, materials.stone, 0, 0.11, 0);
    const back = makeBox(5.0, 2.05, 0.28, wall, 0, 1.2, 2.03);
    const left = makeBox(0.28, 2.05, 4.25, wall, -2.36, 1.2, 0);
    const right = makeBox(0.28, 2.05, 4.25, wall, 2.36, 1.2, 0);
    const frontLeft = makeBox(1.58, 2.05, 0.28, wall, -1.56, 1.2, -2.03);
    const frontRight = makeBox(1.58, 2.05, 0.28, wall, 1.56, 1.2, -2.03);
    const lintel = makeBox(1.26, 0.24, 0.3, materials.rootwood, 0, 2.02, -2.05);
    const roofA = makeBox(5.95, 0.34, 2.82, materials.mossRoof, 0, 3.04, -0.86);
    const roofB = makeBox(5.95, 0.34, 2.82, materials.mossRoof, 0, 3.04, 0.86);
    roofA.rotation.x = -0.54;
    roofB.rotation.x = 0.54;
    const ridge = makeCylinder(0.07, 0.09, 5.55, 8, materials.rootwood, 0, 3.28, 0);
    ridge.rotation.z = Math.PI / 2;
    const door = makeBox(0.92, 1.72, 0.08, materials.darkLeather, 0, 0.92, -2.2);
    const windowMat = materials.lampGlow.clone();
    windowMat.opacity = 0.64;
    const windowA = makeBox(0.5, 0.44, 0.07, windowMat, -1.38, 1.42, -2.22);
    const rootA = makeCylinder(0.04, 0.08, 1.4, 7, materials.rootwood, -2.34, 0.28, -1.7);
    rootA.rotation.set(0.7, 0.22, -0.46);
    const rootB = makeCylinder(0.035, 0.075, 1.18, 7, materials.rootwood, 2.24, 0.24, 1.56);
    rootB.rotation.set(-0.62, -0.36, 0.52);
    house.add(footing, back, left, right, frontLeft, frontRight, lintel, roofA, roofB, ridge, door, windowA, rootA, rootB);
    if (variant % 2 === 1) {
      house.rotation.y = Math.PI / 2;
    }
    group.add(house);
    addExplorationCollider(x, z, scale * 3.45, "structure");
    return house;
  }

  function addExplorationHouse(group, x, z, scale, variant, biome = "meadow") {
    if (biome === "desert") {
      return addDesertHouse(group, x, z, scale, variant);
    }
    if (biome === "mountain") {
      return addMountainHouse(group, x, z, scale, variant);
    }
    if (biome === "swamp") {
      return addSwampHouse(group, x, z, scale, variant);
    }
    if (biome === "briar") {
      return addBriarHouse(group, x, z, scale, variant);
    }
    return addMeadowHouse(group, x, z, scale, variant);
  }

  // Grassland/meadow cottage: stone-founded, half-timbered plaster walls, a
  // pitched gabled roof with eaves + filled gables + ridge, a capped chimney,
  // framed shuttered windows with flower boxes, and either a front porch or a
  // side lean-to for footprint variety. Footprint (5.2 x 4.6) and the
  // scale*3.4 collider match the previous box house so collision is unchanged.
  function addMeadowHouse(group, x, z, scale, variant) {
    const style = meadowHouseStyles[variant % meadowHouseStyles.length];
    const wallMat = style.wall;
    const roofMat = style.roof;
    const timber = meadowHouse.timber;
    const house = new THREE.Group();
    setExplorationLocalGroundPosition(house, x, z);
    house.scale.setScalar(scale);
    const parts = [];

    const glassMat = materials.lightningCore.clone();
    glassMat.color.setHex(0xffd889);
    glassMat.opacity = 0.72;

    // Stone base course + interior floor.
    parts.push(makeBox(5.46, 0.5, 4.86, meadowHouse.foundation, 0, 0.25, 0));
    parts.push(makeBox(5.2, 0.12, 4.6, materials.paleWood, 0, 0.52, 0));

    // Plaster shell. Front (-z) is split for the doorway.
    parts.push(makeBox(5.2, 2.25, 0.24, wallMat, 0, 1.18, 2.18));
    parts.push(makeBox(0.24, 2.25, 4.6, wallMat, -2.48, 1.18, 0));
    parts.push(makeBox(0.24, 2.25, 4.6, wallMat, 2.48, 1.18, 0));
    parts.push(makeBox(1.8, 2.25, 0.24, wallMat, -1.7, 1.18, -2.18));
    parts.push(makeBox(1.8, 2.25, 0.24, wallMat, 1.7, 1.18, -2.18));
    parts.push(makeBox(1.25, 0.34, 0.26, wallMat, 0, 2.13, -2.18));

    // Half-timber framing over the plaster: sill, top plate, corner posts,
    // a mid rail and a few diagonal braces.
    parts.push(makeBox(5.28, 0.16, 0.16, timber, 0, 0.45, -2.2));
    parts.push(makeBox(5.28, 0.16, 0.16, timber, 0, 0.45, 2.2));
    parts.push(makeBox(5.34, 0.18, 0.2, timber, 0, 2.28, -2.18));
    parts.push(makeBox(5.34, 0.18, 0.2, timber, 0, 2.28, 2.18));
    parts.push(makeBox(0.16, 0.16, 4.62, timber, -2.5, 0.45, 0));
    parts.push(makeBox(0.16, 0.16, 4.62, timber, 2.5, 0.45, 0));
    parts.push(makeBox(0.2, 0.18, 4.7, timber, -2.52, 2.28, 0));
    parts.push(makeBox(0.2, 0.18, 4.7, timber, 2.52, 2.28, 0));
    for (const cx of [-2.52, 2.52]) {
      for (const cz of [-2.18, 2.18]) {
        parts.push(makeBox(0.2, 2.3, 0.2, timber, cx, 1.2, cz));
      }
    }
    // Diagonal braces on the side walls (tilt in the Z-Y plane).
    for (const cx of [-2.51, 2.51]) {
      for (const sign of [-1, 1]) {
        const brace = makeBox(0.14, 1.55, 0.14, timber, cx, 1.3, sign * 1.2);
        brace.rotation.x = sign * 0.62;
        parts.push(brace);
      }
    }
    // Diagonal braces flanking the doorway (tilt in the X-Y plane).
    for (const sign of [-1, 1]) {
      const brace = makeBox(0.14, 1.4, 0.16, timber, sign * 1.7, 1.2, -2.2);
      brace.rotation.z = sign * 0.6;
      parts.push(brace);
    }

    // Pitched, gabled roof. Ridge runs along X; slopes face +/-Z with eaves.
    const wallTop = 2.305;
    const gableH = 1.15;
    const ridgeY = wallTop + gableH;
    const eaveZ = 2.7;
    const roofAngle = Math.atan2(gableH, eaveZ);
    const roofLen = Math.hypot(eaveZ, gableH) + 0.12;
    const roofA = makeBox(5.9, 0.22, roofLen, roofMat, 0, wallTop + gableH / 2, -eaveZ / 2);
    const roofB = makeBox(5.9, 0.22, roofLen, roofMat, 0, wallTop + gableH / 2, eaveZ / 2);
    roofA.rotation.x = -roofAngle;
    roofB.rotation.x = roofAngle;
    parts.push(roofA, roofB);
    // Filled gable ends (so you can't see into the roof from the sides).
    const gableFront = makeGable(4.6, gableH, 0.22, wallMat, -2.48, wallTop, 0);
    gableFront.rotation.y = Math.PI / 2;
    const gableBack = makeGable(4.6, gableH, 0.22, wallMat, 2.48, wallTop, 0);
    gableBack.rotation.y = Math.PI / 2;
    parts.push(gableFront, gableBack);
    // Ridge beam.
    parts.push(makeBox(6.0, 0.16, 0.24, timber, 0, ridgeY + 0.02, 0));

    // Capped chimney rising through the back slope.
    parts.push(makeBox(0.5, 2.0, 0.5, materials.darkStone, 1.55, 2.6, 1.45));
    parts.push(makeBox(0.64, 0.18, 0.64, materials.darkStone, 1.55, 3.62, 1.45));
    parts.push(makeBox(0.16, 0.22, 0.16, materials.darkStone, 1.42, 3.78, 1.45));
    parts.push(makeBox(0.16, 0.22, 0.16, materials.darkStone, 1.68, 3.78, 1.45));

    // Doorway: framed plank door with a stone threshold.
    parts.push(makeBox(0.94, 1.86, 0.1, materials.wood, 0, 0.98, -2.34));
    parts.push(makeBox(0.16, 1.94, 0.14, timber, -0.55, 1.02, -2.36));
    parts.push(makeBox(0.16, 1.94, 0.14, timber, 0.55, 1.02, -2.36));
    parts.push(makeBox(1.26, 0.16, 0.14, timber, 0, 1.99, -2.36));
    parts.push(makeBox(1.1, 0.12, 0.42, meadowHouse.foundation, 0, 0.08, -2.55));
    parts.push(makeSphere(0.05, materials.iron, 0.28, 0.98, -2.42));

    // Framed, shuttered windows with flower boxes. makeWindow builds a panel
    // facing -Z that gets rotated/placed onto each wall.
    const makeWindow = () => {
      const win = new THREE.Group();
      win.add(makeBox(0.58, 0.46, 0.05, glassMat, 0, 0, -0.02));
      win.add(makeBox(0.74, 0.1, 0.1, timber, 0, 0.27, -0.04));
      win.add(makeBox(0.74, 0.1, 0.1, timber, 0, -0.27, -0.04));
      win.add(makeBox(0.1, 0.64, 0.1, timber, -0.36, 0, -0.04));
      win.add(makeBox(0.1, 0.64, 0.1, timber, 0.36, 0, -0.04));
      win.add(makeBox(0.06, 0.52, 0.06, timber, 0, 0, -0.05));
      win.add(makeBox(0.6, 0.06, 0.06, timber, 0, 0, -0.05));
      win.add(makeBox(0.8, 0.08, 0.2, timber, 0, -0.32, -0.08));
      const shutterL = makeBox(0.3, 0.56, 0.05, wallMat, -0.52, 0, -0.08);
      shutterL.rotation.y = 0.5;
      const shutterR = makeBox(0.3, 0.56, 0.05, wallMat, 0.52, 0, -0.08);
      shutterR.rotation.y = -0.5;
      win.add(shutterL, shutterR);
      return win;
    };
    const makePlanter = (px, pz, rotY) => {
      const planter = new THREE.Group();
      planter.add(makeBox(0.78, 0.18, 0.2, meadowHouse.planter, 0, 0, 0));
      planter.add(makeBox(0.74, 0.12, 0.16, meadowHouse.leaf, 0, 0.12, 0));
      for (let i = 0; i < 4; i += 1) {
        const bloom = makeSphere(0.045, style.bloom, -0.27 + i * 0.18, 0.2, 0);
        bloom.castShadow = false;
        planter.add(bloom);
      }
      planter.position.set(px, 0.66, pz);
      planter.rotation.y = rotY;
      return planter;
    };

    const winA = makeWindow();
    winA.position.set(-1.4, 1.45, -2.32);
    const winB = makeWindow();
    winB.position.set(1.4, 1.45, -2.32);
    parts.push(winA, winB);
    parts.push(makePlanter(-1.4, -2.62, 0), makePlanter(1.4, -2.62, 0));
    const winSide = makeWindow();
    winSide.position.set(2.5, 1.5, 0.45);
    winSide.rotation.y = Math.PI / 2;
    parts.push(winSide);

    if (style.porch) {
      parts.push(makeBox(0.13, 1.72, 0.13, timber, -0.66, 0.86, -2.96));
      parts.push(makeBox(0.13, 1.72, 0.13, timber, 0.66, 0.86, -2.96));
      const awning = makeBox(1.78, 0.12, 1.05, roofMat, 0, 1.84, -2.86);
      awning.rotation.x = 0.46;
      parts.push(awning);
      parts.push(makeBox(1.78, 0.12, 0.12, timber, 0, 1.62, -3.06));
    } else {
      // Side lean-to woodshed (kept inside the house collider radius).
      parts.push(makeBox(0.13, 1.3, 0.13, timber, 3.32, 0.65, -0.95));
      parts.push(makeBox(0.13, 1.3, 0.13, timber, 3.32, 0.65, 1.05));
      const shedRoof = makeBox(1.2, 0.12, 2.5, roofMat, 2.96, 1.55, 0.05);
      shedRoof.rotation.z = -0.46;
      parts.push(shedRoof);
      for (let i = 0; i < 4; i += 1) {
        const log = makeCylinder(0.08, 0.09, 0.9, 7, materials.wood, 2.95, 0.18 + (i % 2) * 0.16, -0.55 + Math.floor(i / 2) * 0.34);
        log.rotation.x = Math.PI / 2;
        parts.push(log);
      }
    }

    if (variant % 2 === 1) {
      house.rotation.y = Math.PI / 2;
    }
    for (const part of parts) {
      house.add(part);
    }
    group.add(house);
    addExplorationCollider(x, z, scale * 3.4, "structure");
    return house;
  }

  function addExplorationTree(group, x, z, random) {
    const tree = new THREE.Group();
    setExplorationLocalGroundPosition(tree, x, z);
    const conifer = random() > 0.52;
    if (conifer) {
      // Slim meadow fir: tapered trunk under three stacked, two-tone tiers.
      const height = 2.6 + random() * 2.0;
      tree.add(makeCylinder(0.13, 0.24, height, 7, materials.wood, 0, height / 2, 0));
      const tiers = 3;
      for (let i = 0; i < tiers; i += 1) {
        const t = i / tiers;
        const r = quantizeStep(1.12 - t * 0.46 + random() * 0.14, 0.1);
        const ch = quantizeStep(1.7 - t * 0.32, 0.1);
        const mat = i === tiers - 1 ? materials.broadleafLight : (i % 2 ? materials.pineDeep : materials.pine);
        tree.add(makeCone(r, ch, 9, mat, 0, height - 0.1 + i * ch * 0.6, 0));
      }
    } else {
      // Broadleaf oak: flared trunk, a couple of branch forks, layered canopy.
      const height = 2.0 + random() * 1.6;
      const trunk = makeCylinder(0.16, 0.3, height, 8, materials.wood, 0, height / 2, 0);
      trunk.rotation.z = (random() - 0.5) * 0.08;
      tree.add(trunk, makeCylinder(0.32, 0.5, 0.3, 8, materials.wood, 0, 0.15, 0));
      const forks = 1 + Math.floor(random() * 2);
      for (let i = 0; i < forks; i += 1) {
        const len = quantizeStep(0.8 + random() * 0.5, 0.1);
        const branch = makeCylinder(0.05, 0.1, len, 5, materials.wood, 0, len / 2, 0);
        const pivot = new THREE.Group();
        pivot.position.set(0, height * (0.58 + random() * 0.2), 0);
        pivot.rotation.y = random() * TAU;
        pivot.rotation.z = 0.55 + random() * 0.3;
        pivot.add(branch);
        tree.add(pivot);
      }
      addCanopyCluster(tree, materials.broadleaf, 0, height + 0.5, 0, 1.0 + random() * 0.3, random, {
        blobs: 4,
        accent: random() > 0.5 ? materials.broadleafLight : materials.broadleafDeep
      });
    }
    tree.rotation.y = random() * TAU;
    tree.scale.setScalar(1.2 + random() * 0.32);
    if (Math.hypot(x, z) > 92) {
      tree.traverse(child => {
        if (child.isMesh) {
          child.castShadow = false;
        }
      });
    }
    group.add(tree);
    addExplorationCollider(x, z, 0.82, "tree");
  }

  function addMountainPine(group, x, z, random) {
    // Tall alpine conifer: four narrowing tiers of deep-green boughs, a slight
    // windward lean, and an occasional snow-dusted crown for the high peaks.
    const tree = new THREE.Group();
    setExplorationLocalGroundPosition(tree, x, z);
    const height = 3.0 + random() * 2.6;
    const lean = (random() - 0.5) * 0.1;
    const trunk = makeCylinder(0.13, 0.26, height, 7, materials.wood, 0, height / 2, 0);
    trunk.rotation.z = lean;
    tree.add(trunk);
    const tiers = 4;
    const snow = random() > 0.5;
    for (let i = 0; i < tiers; i += 1) {
      const t = i / (tiers - 1);
      const r = quantizeStep(1.18 - t * 0.74 + random() * 0.12, 0.1);
      const ch = quantizeStep(1.85 - t * 0.4, 0.1);
      const top = i === tiers - 1;
      const mat = snow && top ? materials.pineSnow : (i % 2 ? materials.pineDeep : materials.pine);
      const cone = makeCone(r, ch, 9, mat, 0, height * 0.16 + i * height * 0.22, 0);
      cone.rotation.z = lean;
      tree.add(cone);
    }
    tree.rotation.y = random() * TAU;
    tree.scale.setScalar(1.25 + random() * 0.3);
    if (Math.hypot(x, z) > 92) {
      tree.traverse(child => {
        if (child.isMesh) {
          child.castShadow = false;
        }
      });
    }
    group.add(tree);
    addExplorationCollider(x, z, 0.9, "tree");
  }

  function addDesertCactus(group, x, z, random) {
    const cactus = new THREE.Group();
    setExplorationLocalGroundPosition(cactus, x, z);
    if (random() > 0.78) {
      // Squat barrel cactus clump with a crown bloom.
      const count = 1 + Math.floor(random() * 3);
      for (let i = 0; i < count; i += 1) {
        const r = quantizeStep(0.26 + random() * 0.18, 0.05);
        const h = quantizeStep(0.5 + random() * 0.5, 0.1);
        const bx = (random() - 0.5) * 0.5;
        const bz = (random() - 0.5) * 0.5;
        const barrel = makeCylinder(r * 0.86, r, h, 10, materials.cactus, bx, h / 2, bz);
        cactus.add(barrel);
        if (random() > 0.5) {
          cactus.add(makeSphere(0.08, materials.flower, bx, h + 0.04, bz));
        }
      }
      cactus.rotation.y = random() * TAU;
      group.add(cactus);
      addExplorationCollider(x, z, 0.42, "tree");
      return;
    }
    // Classic saguaro: ribbed column with one or two raised arms and blooms.
    const height = 1.45 + random() * 1.5;
    cactus.add(makeCylinder(0.17, 0.22, height, 9, materials.cactus, 0, height / 2, 0));
    const arms = 1 + Math.floor(random() * 2);
    for (let i = 0; i < arms; i += 1) {
      const side = i === 0 ? (random() > 0.5 ? 1 : -1) : (random() > 0.5 ? 1 : -1);
      const armY = height * (0.42 + random() * 0.26);
      const reach = 0.34 + random() * 0.22;
      const arm = makeCylinder(0.07, 0.09, 0.6 + random() * 0.3, 7, materials.cactus, side * reach, armY, (random() - 0.5) * 0.2);
      arm.rotation.z = Math.PI / 2;
      const lift = makeCylinder(0.065, 0.085, 0.42 + random() * 0.34, 7, materials.cactus, side * (reach + 0.32), armY + 0.22, 0);
      cactus.add(arm, lift);
      if (random() > 0.55) {
        cactus.add(makeSphere(0.08, materials.flower, side * (reach + 0.32), armY + 0.46 + random() * 0.2, 0));
      }
    }
    if (random() > 0.5) {
      cactus.add(makeSphere(0.09, materials.flower, 0, height + 0.05, 0));
    }
    cactus.rotation.y = random() * TAU;
    group.add(cactus);
    addExplorationCollider(x, z, 0.48, "tree");
  }

  function addDryBush(group, x, z, random) {
    const bush = new THREE.Group();
    setExplorationLocalGroundPosition(bush, x, z, 0.08);
    const tuftCount = 3 + Math.floor(random() * 3);
    for (let i = 0; i < tuftCount; i += 1) {
      const tuft = makeCylinder(0.02, 0.08 + random() * 0.05, 0.42 + random() * 0.25, 6, materials.dryBrush, (random() - 0.5) * 0.42, 0.18, (random() - 0.5) * 0.42);
      tuft.rotation.x = (random() - 0.5) * 0.8;
      tuft.rotation.z = (random() - 0.5) * 0.8;
      tuft.castShadow = false;
      bush.add(tuft);
    }
    bush.rotation.y = random() * TAU;
    group.add(bush);
  }

  function addReeds(group, x, z, random, count = 5 + Math.floor(random() * 5)) {
    const reeds = new THREE.Group();
    setExplorationLocalGroundPosition(reeds, x, z);
    for (let i = 0; i < count; i += 1) {
      const height = 0.46 + random() * 0.62;
      const rx = (random() - 0.5) * 0.75;
      const rz = (random() - 0.5) * 0.75;
      const reed = makeCylinder(0.012, 0.026, height, 6, materials.reed, rx, height / 2, rz);
      reed.rotation.x = (random() - 0.5) * 0.42;
      reed.rotation.z = (random() - 0.5) * 0.42;
      reed.castShadow = false;
      reeds.add(reed);
      if (random() > 0.58) {
        const seedHead = makeCylinder(0.016, 0.024, 0.16, 6, materials.dryBrush, rx, height + 0.04, rz);
        seedHead.castShadow = false;
        reeds.add(seedHead);
      }
    }
    reeds.rotation.y = random() * TAU;
    group.add(reeds);
  }

  function addSwampWillow(group, x, z, random) {
    // Leaning willow on a buttressed root flare, a broad drooping canopy, and
    // long trailing withies that sweep toward the water.
    const tree = new THREE.Group();
    setExplorationLocalGroundPosition(tree, x, z);
    const height = 2.2 + random() * 1.5;
    const lean = (random() - 0.5) * 0.22;
    const trunk = makeCylinder(0.18, 0.32, height, 8, materials.wood, 0, height / 2, 0);
    trunk.rotation.z = lean;
    tree.add(trunk, makeCylinder(0.34, 0.54, 0.34, 8, materials.wood, 0, 0.17, 0));
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * TAU + random() * 0.5;
      const knee = makeCylinder(0.07, 0.12, 0.4, 6, materials.wood, Math.cos(angle) * 0.36, 0.2, Math.sin(angle) * 0.36);
      knee.rotation.z = Math.cos(angle) * 0.5;
      knee.rotation.x = -Math.sin(angle) * 0.5;
      tree.add(knee);
    }
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * TAU + random() * 0.4;
      addCanopyCluster(tree, materials.willowLeaf,
        Math.cos(angle) * 0.5, height + 0.28 + random() * 0.22, Math.sin(angle) * 0.5,
        0.78 + random() * 0.22, random, { blobs: 2, spread: 0.4 });
    }
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU + random() * 0.35;
      const length = 0.9 + random() * 0.85;
      const radial = 0.6 + random() * 0.4;
      const vine = makeCylinder(0.012, 0.02, length, 5, materials.willowLeaf, Math.cos(angle) * radial, height + 0.05 - length / 2, Math.sin(angle) * radial);
      vine.rotation.x = (random() - 0.5) * 0.3;
      vine.rotation.z = (random() - 0.5) * 0.3;
      vine.castShadow = false;
      tree.add(vine);
    }
    tree.rotation.y = random() * TAU;
    tree.scale.setScalar(1.22 + random() * 0.3);
    if (Math.hypot(x, z) > 92) {
      tree.traverse(child => {
        if (child.isMesh) {
          child.castShadow = false;
        }
      });
    }
    group.add(tree);
    addExplorationCollider(x, z, 0.95, "tree");
  }

  function addBriarOak(group, x, z, random) {
    // Gnarled briarwood: thick buttressed bole, radiating crooked limbs each
    // carrying a clustered canopy, mossy patches and a few thorn spurs.
    const tree = new THREE.Group();
    setExplorationLocalGroundPosition(tree, x, z);
    const height = 2.2 + random() * 1.9;
    const trunk = makeCylinder(0.26, 0.42, height, 9, materials.rootwood, 0, height / 2, 0);
    trunk.rotation.z = (random() - 0.5) * 0.16;
    tree.add(trunk, makeCylinder(0.44, 0.66, 0.38, 9, materials.rootwood, 0, 0.19, 0));
    const limbs = 4 + Math.floor(random() * 2);
    for (let i = 0; i < limbs; i += 1) {
      const angle = (i / limbs) * TAU + random() * 0.5;
      const len = 1.0 + random() * 0.6;
      const branch = makeCylinder(0.05, 0.12, len, 6, materials.rootwood, 0, len / 2, 0);
      const pivot = new THREE.Group();
      pivot.position.set(0, height * (0.66 + random() * 0.2), 0);
      pivot.rotation.y = angle;
      pivot.rotation.z = 0.7 + random() * 0.3;
      pivot.add(branch);
      tree.add(pivot);
      addCanopyCluster(tree, materials.briarLeaf,
        Math.cos(angle) * (0.7 + random() * 0.4), height + 0.1 + random() * 0.38, Math.sin(angle) * (0.7 + random() * 0.4),
        0.82 + random() * 0.3, random, { blobs: 3, spread: 0.5, accent: materials.broadleafDeep });
      if (random() > 0.6) {
        tree.add(makeCone(0.07, 0.22, 5, materials.briarThorn, Math.cos(angle) * 0.5, height * 0.5, Math.sin(angle) * 0.5));
      }
    }
    const moss = makeSphere(0.58, materials.mossRoof, -0.18, height * 0.42, 0.1);
    moss.scale.set(1.0, 0.28, 0.72);
    tree.add(moss);
    tree.rotation.y = random() * TAU;
    tree.scale.setScalar(1.22 + random() * 0.3);
    if (Math.hypot(x, z) > 92) {
      tree.traverse(child => {
        if (child.isMesh) {
          child.castShadow = false;
        }
      });
    }
    group.add(tree);
    addExplorationCollider(x, z, 1.1, "tree");
  }

  function addBramblePatch(group, x, z, random, scale = 1) {
    const patch = new THREE.Group();
    setExplorationLocalGroundPosition(patch, x, z, 0.08);
    const count = 5 + Math.floor(random() * 5);
    for (let i = 0; i < count; i += 1) {
      const angle = random() * TAU;
      const radius = random() * 0.62 * scale;
      const vine = makeCylinder(0.018, 0.03, (0.46 + random() * 0.48) * scale, 6, materials.rootwood, Math.cos(angle) * radius, 0.18 + random() * 0.08, Math.sin(angle) * radius);
      vine.rotation.set((random() - 0.5) * 0.8, random() * TAU, (random() - 0.5) * 0.8);
      const thorn = makeCone(0.05 * scale, 0.16 * scale, 6, materials.briarThorn, Math.cos(angle) * (radius + 0.1), 0.38 + random() * 0.08, Math.sin(angle) * (radius + 0.1));
      thorn.rotation.z = (random() - 0.5) * 0.8;
      patch.add(vine, thorn);
    }
    patch.rotation.y = random() * TAU;
    group.add(patch);
    addExplorationCollider(x, z, 0.58 * scale, "tree");
  }

  function addCharcoalClamp(group, x, z, rotation = 0, scale = 1) {
    const clamp = makeDecorGroup(group, x, z, rotation, scale);
    const mound = makeCone(0.82, 0.62, 12, materials.charcoal, 0, 0.31, 0);
    mound.scale.set(1.15, 0.82, 0.92);
    const vent = makeCylinder(0.06, 0.08, 0.62, 8, materials.darkStone, 0.16, 0.65, -0.08);
    const logA = makeCylinder(0.07, 0.08, 1.12, 8, materials.rootwood, -0.44, 0.12, 0.52);
    logA.rotation.z = Math.PI / 2;
    const logB = makeCylinder(0.06, 0.08, 0.96, 8, materials.rootwood, 0.42, 0.12, 0.5);
    logB.rotation.z = Math.PI / 2;
    clamp.add(mound, vent, logA, logB);
    addExplorationCollider(x, z, 0.9 * scale, "structure");
  }

  function addBogPool(group, x, z, rx, rz, random) {
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.045, 36), materials.bogWater.clone());
    setExplorationLocalGroundPosition(pool, x, z, LAKE_SURFACE_LIFT);
    pool.scale.set(rx, 1, rz);
    pool.rotation.y = random() * TAU;
    pool.renderOrder = LAKE_SURFACE_RENDER_ORDER;
    pool.receiveShadow = true;
    group.add(pool);
    for (let i = 0; i < 7; i += 1) {
      const angle = random() * TAU;
      const radius = 0.92 + random() * 0.2;
      addReeds(group, x + Math.cos(angle) * rx * radius, z + Math.sin(angle) * rz * radius, random, 3 + Math.floor(random() * 4));
    }
  }

  function addExplorationRock(group, x, z, random, large = false) {
    // Faceted boulder cluster: a main partially-buried mass plus a few smaller
    // chunks around its foot. Tinted per biome and built from cached, quantized
    // icosahedra so the added variety stays cheap.
    const biome = biomeAt(x, z);
    const baseMat = biome === "mountain" ? materials.mountainGround
      : biome === "desert" ? materials.sandstone
      : biome === "swamp" ? materials.darkStone
      : materials.stone;
    const accentMat = biome === "desert" ? materials.stone : materials.rubble;
    const cluster = new THREE.Group();
    setExplorationLocalGroundPosition(cluster, x, z);
    const baseY = explorationGroundLocalY(x, z);
    cluster.rotation.y = random() * TAU;
    const mainRadius = large ? 1.15 + random() * 1.5 : 0.4 + random() * 0.8;
    const addChunk = (radius, material, ox, oz, sink) => {
      const qr = quantizeStep(radius, 0.1);
      const detail = qr > 0.9 ? 1 : 0;
      const geometry = cachedPrimitiveGeometry("rockico", [qr, detail], () => new THREE.IcosahedronGeometry(qr, detail));
      const chunk = new THREE.Mesh(geometry, material);
      const groundDelta = explorationGroundLocalY(x + ox, z + oz) - baseY;
      chunk.position.set(ox, groundDelta + radius * (0.2 - sink), oz);
      chunk.scale.set(1.1 + random() * 0.6, 0.62 + random() * 0.5, 0.86 + random() * 0.55);
      chunk.rotation.set(random() * 0.5, random() * TAU, random() * 0.4);
      addShadow(chunk);
      chunk.castShadow = large;
      cluster.add(chunk);
    };
    addChunk(mainRadius, baseMat, 0, 0, 0.15);
    const satellites = large ? 2 + Math.floor(random() * 2) : (random() > 0.5 ? 1 : 0);
    for (let i = 0; i < satellites; i += 1) {
      const angle = random() * TAU;
      const dist = mainRadius * (0.85 + random() * 0.7);
      const r = mainRadius * (0.3 + random() * 0.4);
      addChunk(r, random() > 0.5 ? baseMat : accentMat, Math.cos(angle) * dist, Math.sin(angle) * dist, 0.35);
    }
    group.add(cluster);
    addExplorationCollider(x, z, large ? mainRadius * 1.08 : Math.max(0.42, mainRadius * 0.82), "rock");
  }

  function addBellwaterUnderworksPoi(group, random) {
    const x = 63;
    const z = 81;
    const rotation = -2.42;
    registerDungeonPoi({
      id: BELLWATER_DUNGEON_ID,
      name: BELLWATER_DUNGEON_NAME,
      localX: x,
      localZ: z,
      entranceLocal: { x, z },
      returnLocal: { x: x - 2.8, z: z + 4.2 },
      radius: 9,
      biome: "city"
    });
    const poi = makeDecorGroup(group, x, z, rotation, 1);
    const interiorMaterial = materials.charcoal.clone();
    interiorMaterial.roughness = 1;

    const apron = makeBox(8.8, 0.14, 7.2, materials.darkStone, 0, 0.07, 0.15);
    const pathLip = makeBox(3.6, 0.12, 3.2, materials.path, 0, 0.14, -2.55);
    apron.receiveShadow = true;
    pathLip.receiveShadow = true;
    poi.add(apron, pathLip);

    const leftPier = makeBox(1.05, 2.65, 1.12, materials.rubble, -1.55, 1.36, -1.55);
    const rightPier = makeBox(1.05, 2.65, 1.12, materials.rubble, 1.55, 1.36, -1.55);
    leftPier.rotation.z = -0.08;
    rightPier.rotation.z = 0.08;
    const lintel = makeBox(3.75, 0.72, 1.08, materials.rubble, 0, 2.72, -1.55);
    const reveal = makeBox(2.25, 2.28, 0.16, interiorMaterial, 0, 1.22, -2.16);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.13, 8, 24, Math.PI), materials.cityWall);
    arch.position.set(0, 1.82, -2.28);
    addShadow(arch);
    poi.add(leftPier, rightPier, lintel, reveal, arch);

    const capA = makeSphere(1.55, materials.darkStone, -1.85, 2.0, 0.05);
    capA.scale.set(1.45, 0.7, 1.08);
    const capB = makeSphere(1.68, materials.rubble, 1.55, 1.85, 0.22);
    capB.scale.set(1.52, 0.78, 1.18);
    const capC = makeSphere(1.35, materials.stone, 0.05, 2.45, 0.52);
    capC.scale.set(1.8, 0.58, 1.0);
    poi.add(capA, capB, capC);

    const tower = new THREE.Group();
    tower.position.set(-3.15, 0, 0.7);
    tower.rotation.y = 0.16;
    tower.add(makeCylinder(1.08, 1.32, 4.05, 14, materials.rubble, 0, 2.02, 0));
    tower.add(makeCylinder(1.28, 1.08, 0.32, 14, materials.rubble, 0, 4.2, 0));
    addCrenelRing(tower, 1.12, { y: 4.36, count: 7, merlonW: 0.36, height: 0.42, depth: 0.22, material: materials.rubble });
    tower.add(makeBox(0.12, 0.95, 0.08, interiorMaterial, 0, 2.65, -1.08));
    tower.add(makeBox(0.95, 0.2, 0.52, materials.cityBannerRed, 0.9, 3.28, -0.2));
    poi.add(tower);

    const landing = makeBox(2.7, 0.18, 1.45, materials.cityWall, 1.9, 0.2, 1.18);
    landing.rotation.y = -0.2;
    const beamA = makeBox(1.8, 0.16, 0.16, materials.wood, 2.55, 0.44, -1.35);
    beamA.rotation.y = 0.42;
    const beamB = makeBox(1.45, 0.14, 0.14, materials.wood, -2.42, 0.48, -1.65);
    beamB.rotation.y = -0.52;
    poi.add(landing, beamA, beamB);

    const lampLeft = offsetFromFacing(x, z, rotation, 3.65, -2.3);
    const lampRight = offsetFromFacing(x, z, rotation, 3.25, 2.2);
    const sign = offsetFromFacing(x, z, rotation, 5.25, -1.05);
    addLanternPost(group, lampLeft.x, lampLeft.z, rotation + 0.4, 0.82);
    addLanternPost(group, lampRight.x, lampRight.z, rotation - 0.4, 0.78);
    addSignpost(group, sign.x, sign.z, rotation + 0.18, 0.9, materials.cityRoof);
    addCrateStack(group, sign.x - 1.25, sign.z + 0.7, rotation - 0.2, 0.76);
    addBarrel(group, sign.x + 1.2, sign.z - 0.55, rotation + 0.32, 0.74);

    const rubbleSpots = [
      [-3.8, -1.7, true],
      [3.4, -1.9, false],
      [-2.4, 2.9, false],
      [2.8, 2.6, true]
    ];
    const worldFromPoi = (localX, localZ) => ({
      x: x + localX * Math.cos(rotation) + localZ * Math.sin(rotation),
      z: z - localX * Math.sin(rotation) + localZ * Math.cos(rotation)
    });
    for (const [rx, rz, large] of rubbleSpots) {
      const point = worldFromPoi(rx, rz);
      addExplorationRock(group, point.x, point.z, random, large);
    }

    const scoutSpot = offsetFromFacing(x, z, rotation, 6.0, 2.7);
    const scout = createFriendlyNpc(
      game.exploration.origin.x + scoutSpot.x,
      game.exploration.origin.z + scoutSpot.z,
      random,
      5.5,
      "Bellwater Scout",
      null,
      "city"
    );
    scout.serviceType = "dungeon";
    scout.dungeonId = BELLWATER_DUNGEON_ID;
    game.npcs.push(scout);

    const wallLeft = offsetFromFacing(x, z, rotation, 0.25, -2.3);
    const wallRight = offsetFromFacing(x, z, rotation, 0.25, 2.3);
    const back = offsetFromFacing(x, z, rotation, -1.45, 0);
    const towerCollider = offsetFromFacing(x, z, rotation, -0.7, -3.15);
    addExplorationCollider(wallLeft.x, wallLeft.z, 1.7, "structure");
    addExplorationCollider(wallRight.x, wallRight.z, 1.7, "structure");
    addExplorationCollider(back.x, back.z, 2.2, "structure");
    addExplorationCollider(towerCollider.x, towerCollider.z, 1.7, "structure");
  }

  function addSiltwellCisternPoi(group, desertBiome, random) {
    if (!desertBiome) {
      return;
    }
    const x = desertBiome.x + 115;
    const z = desertBiome.z + 45;
    const rotation = -2.36;
    const returnLocal = offsetFromFacing(x, z, rotation, 6.7, 2.15);
    registerDungeonPoi({
      id: SILTWELL_DUNGEON_ID,
      name: SILTWELL_DUNGEON_NAME,
      localX: x,
      localZ: z,
      entranceLocal: { x, z },
      returnLocal,
      radius: 10,
      biome: "desert"
    });

    const poi = makeDecorGroup(group, x, z, rotation, 1);
    const darkMaterial = materials.charcoal.clone();
    darkMaterial.roughness = 1;

    const apron = makeBox(8.4, 0.12, 6.2, materials.desert, 0, 0.07, 0.28);
    const pathLip = makeBox(3.15, 0.12, 3.35, materials.path, 0, 0.14, -2.5);
    const buriedSlab = makeBox(5.8, 0.18, 2.1, materials.sandstone, 0.1, 0.21, 1.95);
    buriedSlab.rotation.y = 0.08;
    apron.receiveShadow = true;
    pathLip.receiveShadow = true;
    buriedSlab.receiveShadow = true;
    poi.add(apron, pathLip, buriedSlab);

    const leftPylon = makeBox(0.95, 2.8, 1.0, materials.sandstone, -1.45, 1.4, -1.48);
    const rightPylon = makeBox(0.95, 2.55, 1.0, materials.sandstone, 1.45, 1.28, -1.48);
    leftPylon.rotation.z = -0.05;
    rightPylon.rotation.z = 0.07;
    const lintel = makeBox(3.55, 0.62, 0.98, materials.adobe, 0, 2.58, -1.5);
    const reveal = makeBox(2.1, 2.05, 0.16, darkMaterial, 0, 1.1, -2.1);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.12, 8, 24, Math.PI), materials.sandstone);
    arch.position.set(0, 1.76, -2.2);
    addShadow(arch);
    poi.add(leftPylon, rightPylon, lintel, reveal, arch);

    const wellBase = makeCylinder(1.08, 1.28, 0.34, 18, materials.sandstone, -2.82, 0.24, 1.38);
    const wellDark = makeCylinder(0.78, 0.84, 0.055, 18, darkMaterial, -2.82, 0.44, 1.38);
    const wellPostA = makeCylinder(0.06, 0.08, 1.75, 7, materials.wood, -3.52, 1.22, 1.38);
    const wellPostB = makeCylinder(0.06, 0.08, 1.75, 7, materials.wood, -2.12, 1.22, 1.38);
    const crossbar = makeBox(1.65, 0.13, 0.16, materials.wood, -2.82, 2.08, 1.38);
    const rope = makeCylinder(0.022, 0.022, 1.04, 6, materials.rope, -2.82, 1.5, 1.38);
    const bell = makeCone(0.15, 0.32, 9, materials.bronze || materials.gold, -2.82, 0.92, 1.38);
    bell.rotation.x = Math.PI;
    poi.add(wellBase, wellDark, wellPostA, wellPostB, crossbar, rope, bell);

    const shadePostA = makeCylinder(0.055, 0.07, 1.8, 6, materials.wood, 2.28, 0.98, 1.0);
    const shadePostB = makeCylinder(0.055, 0.07, 1.55, 6, materials.wood, 3.68, 0.86, 0.72);
    const shade = makeBox(2.15, 0.07, 1.24, materials.cloth, 2.98, 1.82, 0.88);
    shade.rotation.z = -0.08;
    shade.rotation.x = 0.08;
    poi.add(shadePostA, shadePostB, shade);

    const jarA = makeCylinder(0.28, 0.34, 0.72, 10, materials.clay, 2.35, 0.46, 2.2);
    const jarNeckA = makeCylinder(0.12, 0.18, 0.18, 10, materials.clay, 2.35, 0.91, 2.2);
    const jarB = makeCylinder(0.2, 0.28, 0.55, 10, materials.clay, 3.05, 0.36, 2.02);
    const webA = makeBox(0.035, 0.035, 2.35, materials.spiderMarking, -1.08, 1.86, -1.92);
    webA.rotation.y = 0.75;
    webA.rotation.z = 0.2;
    const webB = makeBox(0.035, 0.035, 2.0, materials.spiderMarking, 1.12, 1.78, -1.88);
    webB.rotation.y = -0.65;
    webB.rotation.z = -0.16;
    poi.add(jarA, jarNeckA, jarB, webA, webB);

    const ribA = makeCylinder(0.035, 0.055, 1.28, 7, materials.bone, -3.25, 0.55, -0.9);
    const ribB = makeCylinder(0.035, 0.055, 1.05, 7, materials.bone, -3.0, 0.5, -0.56);
    ribA.rotation.z = 0.72;
    ribB.rotation.z = -0.64;
    const stoneA = makeSphere(0.82, materials.sandstone, 2.65, 0.62, -1.46);
    stoneA.scale.set(1.4, 0.52, 0.8);
    const stoneB = makeSphere(0.7, materials.adobe, -2.18, 0.45, -2.4);
    stoneB.scale.set(1.2, 0.48, 0.7);
    poi.add(ribA, ribB, stoneA, stoneB);

    const cactusSpot = offsetFromFacing(x, z, rotation, 5.0, 4.0);
    const bushSpot = offsetFromFacing(x, z, rotation, 4.5, -4.1);
    const crateSpot = offsetFromFacing(x, z, rotation, 5.6, 1.05);
    addDesertCactus(group, cactusSpot.x, cactusSpot.z, random);
    addDryBush(group, bushSpot.x, bushSpot.z, random);
    addCrateStack(group, crateSpot.x, crateSpot.z, rotation + 0.25, 0.64);

    const keeperSpot = offsetFromFacing(x, z, rotation, 6.8, -2.15);
    const keeper = createFriendlyNpc(
      game.exploration.origin.x + keeperSpot.x,
      game.exploration.origin.z + keeperSpot.z,
      random,
      5.8,
      "Ilyas",
      null,
      "desert"
    );
    keeper.serviceType = "dungeon";
    keeper.dungeonId = SILTWELL_DUNGEON_ID;
    game.npcs.push(keeper);

    const worldFromPoi = (localX, localZ) => ({
      x: x + localX * Math.cos(rotation) + localZ * Math.sin(rotation),
      z: z - localX * Math.sin(rotation) + localZ * Math.cos(rotation)
    });
    const colliders = [
      [-1.45, -1.48, 1.18],
      [1.45, -1.48, 1.18],
      [0, -0.55, 1.45],
      [-2.82, 1.38, 1.18],
      [2.95, 0.86, 0.92],
      [2.65, -1.46, 0.9]
    ];
    for (const [cx, cz, radius] of colliders) {
      const point = worldFromPoi(cx, cz);
      addExplorationCollider(point.x, point.z, radius, "structure");
    }
  }

  function addExplorationFlowers(group, random, count) {
    const geometry = new THREE.SphereGeometry(0.09, 8, 6);
    const material = materials.flower.clone();
    const flowers = new THREE.InstancedMesh(geometry, material, count);
    flowers.castShadow = false;
    flowers.receiveShadow = false;
    flowers.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let i = 0; i < count; i += 1) {
      const point = randomExplorationPoint(random, 9, game.exploration.radius - 34, (x, z) => biomeAt(x, z) === "meadow");
      const size = 0.75 + random() * 0.55;
      scale.set(size, 0.82 + random() * 0.45, size);
      matrix.compose(new THREE.Vector3(point.x, explorationGroundLocalY(point.x, point.z, 0.16), point.z), quaternion, scale);
      flowers.setMatrixAt(i, matrix);
    }
    group.add(flowers);
  }

  function randomPointInBiome(random, biomeId, padding = 7, filter = null) {
    const biome = game.exploration.biomes.find(entry => entry.id === biomeId);
    if (!biome) {
      return randomExplorationPoint(random, 20, game.exploration.radius - 12, filter);
    }
    const rotation = biome.rotation || 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const angle = random() * TAU;
      const radius = Math.sqrt(random());
      const localX = Math.cos(angle) * biome.rx * radius;
      const localZ = Math.sin(angle) * biome.rz * radius;
      const x = biome.x + localX * cos - localZ * sin;
      const z = biome.z + localX * sin + localZ * cos;
      if (Math.hypot(x, z) < 16 || Math.hypot(x, z) > game.exploration.radius - padding || !biomeContains(biome, x, z, padding) || isExplorationBlocked(x, z)) {
        continue;
      }
      if (filter && !filter(x, z)) {
        continue;
      }
      return { x, z };
    }
    return { x: biome.x, z: biome.z };
  }

  function addExplorationLake(group, x, z, rx, rz, random) {
    registerExplorationFlatZone(x, z, Math.max(rx, rz) + 2.5, 6.5, null, 0.82);
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.055, 48), materials.water.clone());
    setExplorationLocalGroundPosition(lake, x, z, LAKE_SURFACE_LIFT);
    lake.scale.set(rx, 1, rz);
    lake.renderOrder = LAKE_SURFACE_RENDER_ORDER;
    lake.receiveShadow = true;
    group.add(lake);
    for (let i = 0; i < 14; i += 1) {
      const angle = random() * TAU;
      const radius = 1 + random() * 0.16;
      addExplorationRock(group, x + Math.cos(angle) * rx * radius, z + Math.sin(angle) * rz * radius, random);
    }
    game.exploration.lakes.push({
      x: game.exploration.origin.x + x,
      z: game.exploration.origin.z + z,
      rx,
      rz
    });
  }

  // Deterministic per-NPC appearance so a crowd reads as individuals rather
  // than clones. Everything picks from the shared palettes (no per-NPC
  // textures) and only body girth (x/z scale) varies on the geometry, so the
  // cached primitive buffers stay shared across the whole population.
  function npcAppearance(name, biome) {
    const rand = seededRandom("npc-look::" + name + "::" + biome);
    const pick = arr => arr[Math.floor(rand() * arr.length)];
    const garments = npcGarmentPalettes[biome] || npcGarmentPalettes.meadow;
    const headRoll = rand();
    const headwear = headRoll > 0.8 ? "hat" : headRoll > 0.6 ? "hood" : "none";
    const hairStyle = headwear === "none" ? pick(["short", "long", "bun", "short", "bald"]) : "short";
    return {
      garment: pick(garments),
      leg: pick(npcLegPalette),
      skin: pick(npcSkinPalette),
      hair: pick(npcHairPalette),
      trim: pick(npcTrimPalette),
      girth: 0.9 + rand() * 0.28,
      headwear,
      hairStyle,
      beard: rand() > 0.6,
      apron: rand() > 0.62
    };
  }

  function createFriendlyNpc(x, z, random, homeRadius = 5.5, name = "Villager", questId = null, biome = "meadow") {
    const group = new THREE.Group();
    group.position.set(x, explorationGroundWorldY(x, z), z);
    group.scale.setScalar(modelScale.npc);

    const look = npcAppearance(name, biome);
    const garment = look.garment;
    const skin = look.skin;
    const trim = look.trim;
    // Body girth varies per NPC via the frame's x/z scale; geometry stays shared.
    const frame = new THREE.Group();
    frame.scale.set(look.girth, 1, look.girth);
    group.add(frame);

    // Legs as hip-pivoted groups (walk swing animates rotation.x).
    const makeLeg = side => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.12, 0.62, 0);
      const thigh = makeBox(0.15, 0.52, 0.17, look.leg, 0, -0.28, 0);
      const boot = makeBox(0.18, 0.15, 0.24, npcBootMaterial, 0, -0.58, -0.03);
      leg.add(thigh, boot);
      frame.add(leg);
      return leg;
    };
    const leftLeg = makeLeg(-1);
    const rightLeg = makeLeg(1);

    // Torso, hips, flared tunic hem, belt, yoke.
    const hips = makeCylinder(0.2, 0.24, 0.28, 12, garment, 0, 0.66, 0);
    const skirt = makeCylinder(0.24, 0.31, 0.44, 12, garment, 0, 0.62, 0);
    const torso = makeCylinder(0.19, 0.25, 0.58, 12, garment, 0, 1.02, 0);
    const belt = makeCylinder(0.255, 0.27, 0.1, 12, materials.darkLeather, 0, 0.8, 0);
    const buckle = makeBox(0.1, 0.08, 0.05, trim, 0, 0.8, -0.27);
    const yoke = makeCylinder(0.2, 0.23, 0.14, 12, garment, 0, 1.3, 0);
    frame.add(hips, skirt, torso, belt, buckle, yoke);
    if (look.apron) {
      frame.add(makeBox(0.34, 0.56, 0.06, npcApronMaterial, 0, 0.72, -0.23));
    }

    // Arms as shoulder-pivoted groups (heal gesture animates rotation.z).
    const makeArm = side => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.26, 1.28, 0);
      const upper = makeBox(0.11, 0.5, 0.12, garment, 0, -0.25, 0);
      const cuff = makeBox(0.12, 0.08, 0.13, trim, 0, -0.46, 0);
      const hand = makeSphere(0.07, skin, 0, -0.54, 0);
      arm.add(upper, cuff, hand);
      frame.add(arm);
      return arm;
    };
    const leftArm = makeArm(-1);
    const rightArm = makeArm(1);

    // Head, face, ears.
    const neck = makeCylinder(0.07, 0.08, 0.12, 8, skin, 0, 1.41, 0);
    const head = makeSphere(0.17, skin, 0, 1.55, 0);
    const earL = makeSphere(0.045, skin, -0.165, 1.55, 0.01);
    const earR = makeSphere(0.045, skin, 0.165, 1.55, 0.01);
    const eyeL = makeSphere(0.028, materials.charcoal, -0.07, 1.57, -0.15);
    const eyeR = makeSphere(0.028, materials.charcoal, 0.07, 1.57, -0.15);
    const browL = makeBox(0.07, 0.022, 0.03, look.hair, -0.07, 1.62, -0.155);
    const browR = makeBox(0.07, 0.022, 0.03, look.hair, 0.07, 1.62, -0.155);
    const nose = makeBox(0.05, 0.07, 0.06, skin, 0, 1.54, -0.18);
    frame.add(neck, head, earL, earR, eyeL, eyeR, browL, browR, nose);
    eyeL.castShadow = false;
    eyeR.castShadow = false;

    // Hair / beard.
    if (look.hairStyle !== "bald" || look.headwear !== "none") {
      const cap = makeSphere(0.185, look.hair, 0, 1.6, 0.02);
      cap.scale.set(1.04, 0.82, 1.04);
      frame.add(cap);
    }
    if (look.hairStyle === "long") {
      frame.add(makeBox(0.3, 0.34, 0.13, look.hair, 0, 1.42, 0.14));
    } else if (look.hairStyle === "bun") {
      frame.add(makeSphere(0.075, look.hair, 0, 1.76, 0.07));
    }
    if (look.beard) {
      const beard = makeBox(0.24, 0.18, 0.11, look.hair, 0, 1.43, -0.12);
      frame.add(beard);
    }

    // Headwear.
    const hoodMat = biome === "desert" ? materials.adobe : biome === "mountain" ? materials.darkStone : biome === "city" ? materials.cityRoof : biome === "swamp" ? materials.reed : biome === "briar" ? materials.mossRoof : materials.paleWood;
    if (look.headwear === "hood") {
      const hood = makeCone(0.24, 0.34, 12, hoodMat, 0, 1.68, 0.02);
      const cowl = makeCylinder(0.22, 0.25, 0.18, 12, hoodMat, 0, 1.46, 0.04);
      frame.add(hood, cowl);
    } else if (look.headwear === "hat") {
      const brim = makeCylinder(0.27, 0.27, 0.05, 14, materials.leather, 0, 1.72, 0);
      const crown = makeCone(0.17, 0.24, 12, look.garment, 0, 1.86, 0);
      const band = makeCylinder(0.155, 0.16, 0.06, 12, trim, 0, 1.76, 0);
      frame.add(brim, crown, band);
    }

    // Biome flavor accessories (retained from the original model).
    if (biome === "desert") {
      frame.add(makeCylinder(0.21, 0.24, 0.13, 12, materials.dryBrush, 0, 1.32, 0));
    } else if (biome === "city") {
      frame.add(makeCylinder(0.21, 0.25, 0.1, 12, materials.gold, 0, 1.32, 0));
    } else if (biome === "swamp") {
      frame.add(makeCylinder(0.21, 0.24, 0.1, 12, materials.reed, 0, 1.32, 0));
      frame.add(makeBox(0.2, 0.26, 0.09, materials.darkLeather, -0.26, 0.86, -0.18));
    } else if (biome === "briar") {
      frame.add(makeCylinder(0.21, 0.24, 0.1, 12, materials.mossRoof, 0, 1.32, 0));
      frame.add(makeBox(0.14, 0.19, 0.05, materials.rootwood, 0.26, 0.88, -0.18));
    }

    const questMarker = makeSphere(0.11, materials.fullPotionLiquid.clone(), 0, 2.16, 0);
    questMarker.castShadow = false;
    questMarker.visible = !!questId;
    group.add(questMarker);
    scene.add(group);
    return {
      group,
      name,
      questId,
      questMarker,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      head,
      home: new THREE.Vector3(x, explorationGroundWorldY(x, z), z),
      target: new THREE.Vector3(x, explorationGroundWorldY(x, z), z),
      homeRadius,
      walkTime: random() * 10,
      retarget: 0.5 + random() * 2,
      healCooldown: 0,
      biome,
      friendly: true
    };
  }

  function createQuest(id, title, giver, body, objective, reward, type, target, options = {}) {
    options = mergeQuestDialogueOptions(id, options);
    return {
      id,
      title,
      giver,
      body,
      objective,
      reward,
      type,
      target,
      progress: 0,
      state: "available",
      startMethod: "npc",
      rewardXp: Math.max(0, Math.floor(numberOrZero(options.rewardXp || 50))),
      prerequisite: options.prerequisite || null,
      dialogue: options.dialogue && typeof options.dialogue === "object" ? options.dialogue : {},
      conversationTags: Array.isArray(options.conversationTags) ? options.conversationTags.slice(0, 8) : [type]
    };
  }

  function getQuest(id) {
    return game.quests.find(quest => quest.id === id) || null;
  }

  function questPrerequisiteMet(quest) {
    if (!quest || quest.state !== "available") {
      return true;
    }
    if (quest.prerequisite === "horseUnlocked") {
      return localGodModeEnabled() || !!(progression && progression.exploration && progression.exploration.horseUnlocked) || !!game.exploration.horse;
    }
    return true;
  }

  function questPrerequisiteStatus(quest) {
    if (quest && quest.prerequisite === "horseUnlocked") {
      return "Requires a loyal horse mount.";
    }
    return "";
  }

  function createQuestItem(group, questId, x, z, random, options = {}) {
    const itemGroup = new THREE.Group();
    setExplorationLocalGroundPosition(itemGroup, x, z, numberOrZero(options.groundOffset) || 0.12);
    const color = options.color || 0x9fffd1;
    const stemHeight = options.stemHeight || 0.35;
    const stem = makeCylinder(0.025, 0.035, stemHeight, 8, options.stemMaterial || materials.broadleaf, 0, stemHeight / 2, 0);
    const bloomMaterial = materials.questGlow.clone();
    bloomMaterial.color.setHex(color);
    const bloom = makeSphere(options.radius || 0.12, bloomMaterial, 0, stemHeight + 0.07, 0);
    const ringMaterial = materials.questGlow.clone();
    ringMaterial.color.setHex(color);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(options.ringRadius || 0.22, 0.012, 8, 18), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    const light = new THREE.PointLight(color, options.lightIntensity || 0.75, options.lightDistance || 3.6, 1.8);
    light.position.y = stemHeight;
    itemGroup.add(stem, bloom, ring, light);
    itemGroup.visible = false;
    group.add(itemGroup);
    game.questItems.push({
      group: itemGroup,
      bloom,
      ring,
      light,
      questId,
      color,
      collected: false,
      oneShot: !!options.oneShot,
      requiresMounted: !!options.requiresMounted,
      pickupRadius: Math.max(0.4, numberOrZero(options.pickupRadius) || 1.25),
      respawnTimer: 0,
      visibleActive: false,
      position: new THREE.Vector3(
        game.exploration.origin.x + x,
        explorationGroundLocalY(x, z),
        game.exploration.origin.z + z
      ),
      bobSeed: random() * 10
    });
  }

  function addHerbQuestItems(group, random) {
    for (let i = 0; i < 12; i += 1) {
      const lake = game.exploration.lakes[i % game.exploration.lakes.length];
      const localLakeX = lake.x - game.exploration.origin.x;
      const localLakeZ = lake.z - game.exploration.origin.z;
      const angle = random() * TAU;
      const radius = 1.25 + random() * 0.55;
      createQuestItem(
        group,
        "herbs",
        localLakeX + Math.cos(angle) * lake.rx * radius,
        localLakeZ + Math.sin(angle) * lake.rz * radius,
        random
      );
    }
  }

  function addHorseQuestItems(group, random) {
    for (let i = 0; i < 7; i += 1) {
      const point = randomExplorationPoint(random, 13, 95, (x, z) => biomeAt(x, z) === "meadow" && Math.hypot(x, z) > 18);
      createQuestItem(group, "horse", point.x, point.z, random, {
        color: 0xffd889,
        stemMaterial: materials.dryBrush,
        radius: 0.1
      });
    }
  }

  function roadwardenTackWaymarkPoints() {
    const crownring = game.exploration.arenaCity;
    const crownford = game.exploration.city;
    const crownringGate = crownring && crownring.roadAnchor ? crownring.roadAnchor : { x: 124, z: 30 };
    const crownfordRoad = crownford && crownford.roadAnchor ? crownford.roadAnchor : { x: 12, z: 88 };
    return [
      { x: crownringGate.x + 1.3, z: crownringGate.z + 2.2 },
      { x: crownfordRoad.x - 2.2, z: crownfordRoad.z - 4.4 },
      { x: 58.0, z: -48.0 },
      { x: 82.0, z: 116.5 }
    ];
  }

  function addRoadwardenTackWaymarks(group, random) {
    for (const point of roadwardenTackWaymarkPoints()) {
      createQuestItem(group, ROADWARDEN_TACK_QUEST_ID, point.x, point.z, random, {
        color: 0xffd889,
        stemMaterial: materials.cityRoof,
        radius: 0.14,
        ringRadius: 0.36,
        stemHeight: 0.54,
        lightDistance: 5.4,
        pickupRadius: 2.25,
        requiresMounted: true,
        oneShot: true
      });
    }
  }

  function addSwampQuestItems(group, biome, random) {
    if (!biome) {
      return;
    }
    for (let i = 0; i < 5; i += 1) {
      const point = randomPointInBiome(random, "swamp", 10);
      createQuestItem(group, "bogRelics", point.x, point.z, random, {
        color: 0xb9ffd5,
        stemMaterial: materials.swampPlank,
        radius: 0.105
      });
    }
  }

  function setHorseTack(model, tackId = "") {
    if (!model) {
      return;
    }
    const activeTackId = tackId === ROADWARDEN_TACK_ID ? ROADWARDEN_TACK_ID : "";
    model.tackId = activeTackId;
    if (model.saddle && model.saddle.material && model.saddle.material.color) {
      model.saddle.material.color.setHex(activeTackId ? 0x3b271c : 0x49301f);
    }
    for (const detail of model.tackDetails || []) {
      detail.visible = !!activeTackId;
    }
  }

  function createHorseModel(tackId = "") {
    const group = new THREE.Group();
    // Rounded barrel instead of a single box: cylinder body plus shaped
    // chest and hindquarters so the silhouette reads as a horse from the side.
    const body = makeCylinder(0.4, 0.43, 1.32, 14, materials.horseCoat, 0, 1.04, 0.06);
    body.rotation.x = Math.PI / 2;
    body.scale.set(1.04, 1, 0.92);
    const chest = makeSphere(0.4, materials.horseCoat.clone(), 0, 1.08, -0.62);
    chest.scale.set(0.95, 0.98, 1.05);
    const rump = makeSphere(0.41, materials.horseCoat.clone(), 0, 1.06, 0.68);
    rump.scale.set(1.0, 0.96, 1.05);
    const neck = makeCylinder(0.13, 0.23, 0.92, 12, materials.horseCoat.clone(), 0, 1.45, -0.88);
    neck.rotation.x = -0.72;
    const head = makeBox(0.26, 0.3, 0.46, materials.horseCoat.clone(), 0, 1.74, -1.28);
    head.rotation.x = 0.22;
    const muzzle = makeBox(0.2, 0.22, 0.34, materials.horseCoat.clone(), 0, 1.62, -1.6);
    muzzle.rotation.x = 0.22;
    const nose = makeBox(0.18, 0.14, 0.1, materials.horseSock, 0, 1.57, -1.74);
    const blaze = makeBox(0.07, 0.2, 0.025, materials.bone, 0, 1.74, -1.51);
    blaze.rotation.x = 0.32;
    const jaw = makeBox(0.2, 0.16, 0.24, materials.horseCoat.clone(), 0, 1.58, -1.32);
    const leftEar = makeCone(0.055, 0.2, 7, materials.horseCoat.clone(), -0.11, 1.96, -1.18);
    const rightEar = makeCone(0.055, 0.2, 7, materials.horseCoat.clone(), 0.11, 1.96, -1.18);
    leftEar.rotation.x = -0.25;
    rightEar.rotation.x = -0.25;
    const leftEye = makeSphere(0.035, materials.emberEye, -0.13, 1.79, -1.4);
    const rightEye = makeSphere(0.035, materials.emberEye.clone(), 0.13, 1.79, -1.4);
    // Mane: crest segments following the neck line plus a forelock.
    const maneSegments = [
      [0, 1.93, -1.07, -0.7, 0.3],
      [0, 1.78, -0.86, -0.72, 0.34],
      [0, 1.6, -0.66, -0.74, 0.36],
      [0, 1.42, -0.47, -0.78, 0.34]
    ].map(([x, y, z, tilt, height]) => {
      const tuft = makeBox(0.1, height, 0.16, materials.horseMane, x, y, z);
      tuft.rotation.x = tilt;
      return tuft;
    });
    const forelock = makeBox(0.09, 0.2, 0.1, materials.horseMane, 0, 1.92, -1.32);
    forelock.rotation.x = 0.5;
    const saddle = makeBox(0.6, 0.13, 0.66, materials.saddle.clone(), 0, 1.43, 0.02);
    const saddleRoll = makeCylinder(0.075, 0.075, 0.52, 8, materials.saddle.clone(), 0, 1.5, 0.32);
    saddleRoll.rotation.z = Math.PI / 2;
    const pommel = makeCylinder(0.06, 0.06, 0.48, 8, materials.saddle.clone(), 0, 1.5, -0.26);
    pommel.rotation.z = Math.PI / 2;
    const girth = makeBox(0.95, 0.07, 0.1, materials.darkLeather, 0, 1.02, 0.02);
    girth.rotation.z = Math.PI / 2;
    const saddleBlanket = makeBox(0.84, 0.045, 0.9, materials.cityBannerRed.clone(), 0, 1.36, 0.04);
    const saddleTrim = makeBox(0.68, 0.05, 0.74, materials.gold, 0, 1.51, 0.02);
    const frontStrap = makeBox(0.08, 0.62, 0.12, materials.darkLeather, 0, 1.08, -0.55);
    frontStrap.rotation.z = Math.PI / 2;
    const rearStrap = makeBox(0.08, 0.58, 0.12, materials.darkLeather, 0, 1.06, 0.48);
    rearStrap.rotation.z = Math.PI / 2;
    const leftTrim = makeBox(0.045, 0.13, 0.86, materials.gold, -0.44, 1.41, 0.04);
    const rightTrim = makeBox(0.045, 0.13, 0.86, materials.gold, 0.44, 1.41, 0.04);
    const bridle = makeBox(0.3, 0.04, 0.36, materials.gold, 0, 1.66, -1.52);
    bridle.rotation.x = 0.22;
    // Tail: arched root with a longer falling skirt.
    const tail = new THREE.Group();
    tail.position.set(0, 1.28, 0.98);
    const tailRoot = makeCylinder(0.05, 0.09, 0.36, 8, materials.horseMane, 0, -0.12, 0.08);
    tailRoot.rotation.x = 0.78;
    const tailSkirt = makeCylinder(0.085, 0.035, 0.62, 8, materials.horseMane, 0, -0.5, 0.26);
    tailSkirt.rotation.x = 0.18;
    tail.add(tailRoot, tailSkirt);

    const legs = [];
    const legData = [
      [-0.26, -0.52],
      [0.26, -0.52],
      [-0.28, 0.62],
      [0.28, 0.62]
    ];
    for (const [x, z] of legData) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.82, z);
      // Jointed leg: muscled upper, slim cannon, fetlock, and a hoof that
      // reaches the ground (pivot sits at the hip).
      const upper = makeCylinder(0.075, 0.105, 0.44, 8, materials.horseCoat.clone(), 0, -0.2, 0);
      const knee = makeSphere(0.068, materials.horseCoat.clone(), 0, -0.42, 0.005);
      const cannon = makeCylinder(0.048, 0.058, 0.34, 8, materials.horseSock.clone(), 0, -0.58, 0);
      const fetlock = makeSphere(0.052, materials.horseSock.clone(), 0, -0.73, -0.005);
      const hoof = makeCylinder(0.065, 0.075, 0.1, 8, materials.darkLeather, 0, -0.77, -0.01);
      leg.add(upper, knee, cannon, fetlock, hoof);
      legs.push(leg);
      group.add(leg);
    }

    const tackDetails = [saddleBlanket, saddleTrim, frontStrap, rearStrap, leftTrim, rightTrim, bridle];
    group.add(
      body, chest, rump, neck, head, muzzle, nose, blaze, jaw, leftEar, rightEar, leftEye, rightEye,
      ...maneSegments, forelock, saddle, saddleRoll, pommel, girth,
      saddleBlanket, saddleTrim, frontStrap, rearStrap, leftTrim, rightTrim, bridle, tail
    );
    const model = { group, body, legs, tail, saddle, tackDetails, tackId: "" };
    setHorseTack(model, tackId);
    return model;
  }

  function createDrakeMountModel() {
    const group = new THREE.Group();
    const scaleMat = materials.drakeScale;
    const bellyMat = materials.drakeBelly;

    const body = makeCylinder(0.36, 0.44, 1.55, 14, scaleMat, 0, 1.0, 0.05);
    body.rotation.x = Math.PI / 2;
    const chest = makeSphere(0.42, scaleMat.clone(), 0, 1.02, -0.6);
    chest.scale.set(0.96, 0.95, 1.05);
    const haunch = makeSphere(0.4, scaleMat.clone(), 0, 0.98, 0.66);
    const belly = makeBox(0.52, 0.1, 1.2, bellyMat, 0, 0.66, 0);
    const neck = makeCylinder(0.15, 0.27, 0.95, 12, scaleMat.clone(), 0, 1.42, -0.92);
    neck.rotation.x = -0.66;
    const head = makeSphere(0.26, scaleMat.clone(), 0, 1.74, -1.32);
    head.scale.set(1.1, 0.86, 1.25);
    const snout = makeBox(0.3, 0.17, 0.4, scaleMat.clone(), 0, 1.68, -1.62);
    const lowerJaw = makeBox(0.26, 0.09, 0.32, bellyMat.clone(), 0, 1.57, -1.58);
    const leftEye = makeSphere(0.045, materials.dragonEye, -0.14, 1.81, -1.45);
    const rightEye = makeSphere(0.045, materials.dragonEye, 0.14, 1.81, -1.45);
    const hornLeft = makeCylinder(0.018, 0.06, 0.4, 7, materials.bone, -0.13, 1.95, -1.16);
    const hornRight = makeCylinder(0.018, 0.06, 0.4, 7, materials.bone, 0.13, 1.95, -1.16);
    hornLeft.rotation.set(-0.85, -0.18, 0.14);
    hornRight.rotation.set(-0.85, 0.18, -0.14);

    // Folded wings flutter with speed; the drake runs like a horse rather
    // than flying, so they stay tucked along the flanks.
    const wings = [];
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.34, 1.32, -0.05);
      const membrane = makeWing(side);
      membrane.scale.setScalar(0.56);
      wing.add(membrane);
      wing.rotation.z = side * 0.46;
      wing.rotation.x = 0.3;
      wing.baseFold = side * 0.46;
      wing.side = side;
      wings.push(wing);
      group.add(wing);
    }

    const spikeData = [
      [1.62, -0.78, 0.2],
      [1.52, -0.34, 0.22],
      [1.46, 0.42, 0.2],
      [1.36, 0.82, 0.17]
    ];
    const spikes = spikeData.map(([y, z, height]) => makeCone(0.045, height, 6, materials.bone, 0, y, z));

    const saddle = makeBox(0.6, 0.13, 0.64, materials.saddle.clone(), 0, 1.42, 0.06);
    const girthFront = makeBox(0.92, 0.07, 0.1, materials.darkLeather, 0, 0.98, -0.18);
    girthFront.rotation.z = Math.PI / 2;
    const girthRear = makeBox(0.9, 0.07, 0.1, materials.darkLeather, 0, 0.96, 0.34);
    girthRear.rotation.z = Math.PI / 2;

    const tail = new THREE.Group();
    tail.position.set(0, 1.0, 0.95);
    const tailRoot = makeCylinder(0.07, 0.17, 0.85, 10, scaleMat.clone(), 0, -0.1, 0.42);
    tailRoot.rotation.x = Math.PI / 2 + 0.32;
    const tailTip = makeCone(0.06, 0.3, 6, materials.bone, 0, -0.26, 0.85);
    tailTip.rotation.x = Math.PI / 2 + 0.42;
    tail.add(tailRoot, tailTip);

    const legs = [];
    const legData = [
      [-0.3, -0.5],
      [0.3, -0.5],
      [-0.32, 0.6],
      [0.32, 0.6]
    ];
    for (const [x, z] of legData) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.78, z);
      const upper = makeCylinder(0.075, 0.115, 0.42, 8, scaleMat.clone(), 0, -0.18, 0);
      const shin = makeCylinder(0.05, 0.062, 0.32, 8, scaleMat.clone(), 0, -0.54, 0);
      const foot = makeBox(0.16, 0.09, 0.26, bellyMat.clone(), 0, -0.73, -0.05);
      const talon = makeCone(0.035, 0.12, 5, materials.bone, 0, -0.74, -0.2);
      talon.rotation.x = -Math.PI / 2;
      leg.add(upper, shin, foot, talon);
      legs.push(leg);
      group.add(leg);
    }

    group.add(body, chest, haunch, belly, neck, head, snout, lowerJaw, leftEye, rightEye, hornLeft, hornRight, ...spikes, saddle, girthFront, girthRear, tail);
    const model = { group, body, legs, tail, saddle, wings, tackDetails: [], tackId: "" };
    return model;
  }

  function buildMountModel(mountId, tackId = "") {
    return mountId === "drake" ? createDrakeMountModel() : createHorseModel(tackId);
  }

  function createHorse(x, z) {
    const mountId = currentMountId();
    const model = buildMountModel(mountId, currentMountTackId());
    setHorseTack(model, currentMountTackId());
    model.mountId = mountId;
    const hasTack = model.tackId === ROADWARDEN_TACK_ID;
    const horse = {
      ...model,
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      mounted: false,
      walkTime: Math.random() * 10,
      followDistance: hasTack ? 5.2 : 5.8,
      minFollowDistance: hasTack ? 3.2 : 3.6,
      mountDistance: hasTack ? 3.0 : 2.8
    };
    horse.group.position.copy(horse.position);
    scene.add(horse.group);
    return horse;
  }

  function applyMountTackToHorse(horse = game.exploration.horse) {
    if (!horse) {
      return;
    }
    setHorseTack(horse, currentMountTackId());
    const hasTack = horse.tackId === ROADWARDEN_TACK_ID;
    horse.followDistance = hasTack ? 5.2 : 5.8;
    horse.minFollowDistance = hasTack ? 3.2 : 3.6;
    horse.mountDistance = hasTack ? 3.0 : 2.8;
  }

  function spawnHorseNearPlayer(showEffects = true) {
    if (game.exploration.horse) {
      scene.remove(game.exploration.horse.group);
    }
    const side = rightFromYaw(player.yaw, tmpVec).multiplyScalar(-2.2);
    const position = tmpVec2.copy(player.position).add(side);
    game.exploration.horse = createHorse(position.x, position.z);
    if (showEffects || !localGodModeEnabled()) {
      if (game.exploration.horse.mountId === "drake") {
        progression.exploration.drakeUnlocked = true;
      } else {
        progression.exploration.horseUnlocked = true;
      }
    }
    if (showEffects) {
      spawnImpact(position, 0xffd889, 24);
      saveProgress();
    }
  }

  function rebuildActiveMount() {
    const previous = game.exploration.horse;
    if (!previous) {
      spawnHorseNearPlayer(false);
      return;
    }
    scene.remove(previous.group);
    const next = createHorse(previous.position.x, previous.position.z);
    next.yaw = previous.yaw;
    next.mounted = previous.mounted;
    next.walkTime = previous.walkTime;
    next.velocity.copy(previous.velocity);
    game.exploration.horse = next;
    updateHorseAnimation(next, 0);
  }

  function cycleActiveMount() {
    if (game.mode !== "exploration" || game.state !== "playing") {
      return false;
    }
    const owned = ownedMountIds();
    if (owned.length === 0) {
      return false;
    }
    if (owned.length === 1) {
      showBanner("No other mount to switch to");
      return true;
    }
    const next = owned[(owned.indexOf(currentMountId()) + 1) % owned.length];
    progression.exploration.activeMountId = next;
    rebuildActiveMount();
    spawnImpact(game.exploration.horse.position, 0x9fffd1, 16);
    showBanner("Mount: " + (mountDisplayNames[next] || next));
    playSfx("quest", 0.8);
    saveProgress();
    sendOnlineMessage({ kind: "state", state: serializePlayerState() });
    return true;
  }

  function isPlayerMounted() {
    return game.mode === "exploration" && !!game.exploration.horse && game.exploration.horse.mounted;
  }

  function nearestHorse(maxDistance = 3.2) {
    const horse = game.exploration.horse;
    if (!horse) {
      return null;
    }
    if (horse.mounted) {
      return horse;
    }
    return player.position.distanceTo(horse.position) <= maxDistance ? horse : null;
  }

  function toggleHorseMount() {
    const horse = game.exploration.horse;
    if (!horse || game.mode !== "exploration" || game.state !== "playing") {
      return false;
    }
    if (horse.mounted) {
      horse.mounted = false;
      const dismount = rightFromYaw(player.yaw, tmpVec).multiplyScalar(1.45);
      player.position.copy(horse.position).add(dismount);
      constrainExplorationPlayer();
      player.velocity.multiplyScalar(0.25);
      player.group.visible = true;
      showBanner("Dismounted");
      return true;
    }
    if (player.position.distanceTo(horse.position) > horse.mountDistance) {
      return false;
    }
    horse.mounted = true;
    horse.yaw = player.yaw;
    player.attacking = false;
    player.blockHeld = false;
    player.blocking = false;
    player.position.copy(horse.position);
    player.velocity.multiplyScalar(0.2);
    showBanner("Mounted");
    return true;
  }

  function constrainHorsePosition(horse) {
    const local = explorationLocalPosition(horse.position, tmpVec);
    const distance = Math.hypot(local.x, local.z);
    const maxRadius = game.exploration.radius - 2.5;
    if (distance > maxRadius) {
      local.multiplyScalar(maxRadius / Math.max(0.001, distance));
      horse.position.x = game.exploration.origin.x + local.x;
      horse.position.z = game.exploration.origin.z + local.z;
      horse.velocity.multiplyScalar(0.25);
    }
    for (const lake of game.exploration.lakes) {
      const dx = horse.position.x - lake.x;
      const dz = horse.position.z - lake.z;
      const rx = lake.rx + 1.25;
      const rz = lake.rz + 1.25;
      if ((dx * dx) / (rx * rx) + (dz * dz) / (rz * rz) < 1) {
        const angle = Math.atan2(dz / rz, dx / rx);
        horse.position.x = lake.x + Math.cos(angle) * rx;
        horse.position.z = lake.z + Math.sin(angle) * rz;
        horse.velocity.multiplyScalar(0.25);
      }
    }
    resolveExplorationPosition(horse.position, horse.velocity, 0.95);
  }

  function animateMountWings(model, moving) {
    if (!model.wings) {
      return;
    }
    for (const wing of model.wings) {
      const flutter = Math.sin(model.walkTime * 5.2 + (wing.side > 0 ? Math.PI : 0)) * 0.16 * moving;
      wing.rotation.z = wing.baseFold + wing.side * (moving * 0.22) + wing.side * flutter;
    }
  }

  function updateHorseAnimation(horse, dt) {
    const speed = horse.velocity.length();
    horse.walkTime += dt * (1.4 + speed * 1.5);
    const moving = Math.min(1, speed / 7.5);
    const bob = Math.sin(horse.walkTime * 2.2) * 0.045 * moving;
    horse.group.position.set(horse.position.x, explorationGroundWorldY(horse.position.x, horse.position.z, bob), horse.position.z);
    horse.group.rotation.y = horse.yaw;
    for (let i = 0; i < horse.legs.length; i += 1) {
      const phase = Math.sin(horse.walkTime * 5.2 + i * 0.85) * 0.34 * moving;
      horse.legs[i].rotation.x = phase;
    }
    horse.tail.rotation.z = Math.sin(clock.elapsedTime * 3.2) * 0.12;
    animateMountWings(horse, moving);
  }

  function updateHorse(dt) {
    const horse = game.exploration.horse;
    if (!horse) {
      return;
    }
    if (horse.mounted) {
      horse.velocity.copy(player.velocity);
      horse.position.copy(player.position);
      horse.yaw = player.yaw;
      updateHorseAnimation(horse, dt);
      return;
    }

    const toPlayer = tmpVec.copy(player.position).sub(horse.position);
    const distance = Math.max(0.001, Math.hypot(toPlayer.x, toPlayer.z));
    toPlayer.y = 0;
    toPlayer.multiplyScalar(1 / distance);
    const hasTack = horse.tackId === ROADWARDEN_TACK_ID;
    const followDistance = hasTack ? 5.2 : horse.followDistance;
    const minFollowDistance = hasTack ? 3.2 : horse.minFollowDistance;
    const catchUpTeleportDistance = hasTack ? 38 : 32;
    const yawEase = 1 - Math.pow(hasTack ? 0.0004 : 0.00008, dt);
    if (distance > catchUpTeleportDistance) {
      horse.position.copy(player.position).addScaledVector(toPlayer, -followDistance);
      horse.velocity.set(0, 0, 0);
    } else if (distance > followDistance) {
      const desiredSpeed = distance > 11 ? (hasTack ? 8.0 : 7.2) : (hasTack ? 5.9 : 5.4);
      horse.velocity.x = lerp(horse.velocity.x, toPlayer.x * desiredSpeed, 1 - Math.pow(hasTack ? 0.01 : 0.012, dt));
      horse.velocity.z = lerp(horse.velocity.z, toPlayer.z * desiredSpeed, 1 - Math.pow(hasTack ? 0.01 : 0.012, dt));
      horse.yaw = lerpAngle(horse.yaw, yawFromDirection(toPlayer), yawEase);
    } else if (distance < minFollowDistance) {
      const backoffSpeed = hasTack ? 1.55 : 1.8;
      horse.velocity.x = lerp(horse.velocity.x, -toPlayer.x * backoffSpeed, 1 - Math.pow(0.02, dt));
      horse.velocity.z = lerp(horse.velocity.z, -toPlayer.z * backoffSpeed, 1 - Math.pow(0.02, dt));
      horse.yaw = lerpAngle(horse.yaw, yawFromDirection(toPlayer), yawEase);
    } else {
      horse.velocity.x = lerp(horse.velocity.x, 0, 1 - Math.pow(0.0002, dt));
      horse.velocity.z = lerp(horse.velocity.z, 0, 1 - Math.pow(0.0002, dt));
    }
    horse.position.addScaledVector(horse.velocity, dt);
    horse.velocity.multiplyScalar(Math.pow(0.3, dt));
    constrainHorsePosition(horse);
    updateHorseAnimation(horse, dt);
  }

  function updateQuestProgress(id, amount) {
    const quest = getQuest(id);
    if (!quest || quest.state !== "active") {
      return;
    }
    quest.progress = Math.min(quest.target, quest.progress + amount);
    if (quest.progress >= quest.target) {
      quest.state = "ready";
      showBanner(quest.title + " complete");
      playSfx("quest", 1);
    }
    saveProgress();
    updateQuestLog();
    if (questDialog.hidden === false && game.dialogNpc && game.dialogNpc.questId === id) {
      refreshQuestDialog();
    }
  }

  function discoveredVillageCount() {
    const validVillageIds = new Set(game.exploration.villages.map(village => village.id));
    let count = 0;
    for (const id of game.exploration.discovered) {
      if (validVillageIds.has(id)) {
        count += 1;
      }
    }
    return count;
  }

  function allDiscoverableVillagesFound() {
    return game.exploration.villages.length > 0 && discoveredVillageCount() >= game.exploration.villages.length;
  }

  function reconcileVillageQuestProgress(quest, { silent = true } = {}) {
    if (!quest || quest.state === "done") {
      return false;
    }
    const discovered = discoveredVillageCount();
    const allVillagesFound = allDiscoverableVillagesFound();
    const nextProgress = Math.min(quest.target, discovered);
    const beforeState = quest.state;
    const beforeProgress = quest.progress;
    if (nextProgress > quest.progress) {
      quest.progress = nextProgress;
    }
    if (quest.state === "active" && (quest.progress >= quest.target || allVillagesFound)) {
      quest.progress = quest.target;
      quest.state = "ready";
      if (!silent) {
        showBanner(quest.title + " complete");
      }
    }
    return beforeState !== quest.state || beforeProgress !== quest.progress;
  }

  function reconcileQuestProgress(quest, options = {}) {
    if (!quest || quest.state === "done") {
      return false;
    }
    if (quest.id === "villages") {
      return reconcileVillageQuestProgress(quest, options);
    }
    return false;
  }

  function syncVillageQuestProgress({ silent = true, updateUi = false } = {}) {
    const quest = getQuest("villages");
    const changed = reconcileQuestProgress(quest, { silent });
    if (changed && updateUi) {
      updateQuestLog();
      updateQuestMarkers();
      if (questDialog.hidden === false && game.dialogNpc && game.dialogNpc.questId === "villages") {
        refreshQuestDialog();
      }
    }
    return changed;
  }

  function questProgressText(quest) {
    return quest.objective + " " + Math.min(quest.progress, quest.target) + "/" + quest.target;
  }

  function updateQuestItems(dt) {
    for (const item of game.questItems) {
      if (item.collected) {
        if (item.oneShot) {
          item.visibleActive = false;
          item.group.visible = false;
          continue;
        }
        item.respawnTimer -= dt;
        if (item.respawnTimer <= 0) {
          item.collected = false;
          item.respawnTimer = 0;
        }
      }
      const quest = getQuest(item.questId);
      const active = !item.collected && !!quest && quest.state === "active";
      if (!active) {
        item.visibleActive = false;
        item.group.visible = false;
        continue;
      }
      const dx = player.position.x - item.position.x;
      const dz = player.position.z - item.position.z;
      const distanceSq = dx * dx + dz * dz;
      if (!item.visibleActive) {
        item.visibleActive = true;
        item.group.visible = true;
      }
      if (distanceSq >= EXPLORATION_ITEM_VISIBLE_DISTANCE_SQ) {
        item.light.intensity = 0;
        continue;
      }
      item.group.position.y = item.position.y + 0.12 + Math.sin(clock.elapsedTime * 2.8 + item.bobSeed) * 0.06;
      item.bloom.scale.setScalar(0.9 + Math.sin(clock.elapsedTime * 5.5 + item.bobSeed) * 0.14);
      item.ring.rotation.z += dt * 1.5;
      item.light.intensity = 0.58 + Math.sin(clock.elapsedTime * 4.2 + item.bobSeed) * 0.18;
      const pickupRadius = item.pickupRadius || 1.25;
      if (distanceSq < pickupRadius * pickupRadius && (!item.requiresMounted || isPlayerMounted())) {
        item.collected = true;
        item.respawnTimer = 22 + (item.bobSeed % 7);
        item.visibleActive = false;
        item.group.visible = false;
        spawnImpact(item.position, item.color || 0x9fffd1, 12);
        playSfx("quest", 0.7);
        awardExplorationXp(5);
        updateQuestProgress(item.questId, 1);
      }
    }
  }

  function nearestNpc(maxDistance = 3.4) {
    let nearest = null;
    let nearestDistanceSq = maxDistance * maxDistance;
    for (const npc of game.npcs) {
      const dx = player.position.x - npc.group.position.x;
      const dz = player.position.z - npc.group.position.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < nearestDistanceSq) {
        nearest = npc;
        nearestDistanceSq = distanceSq;
      }
    }
    return nearest;
  }

  function updateQuestMarkers() {
    for (const npc of game.npcs) {
      if (!npc.questMarker || !npc.questId) {
        if (npc.questMarker && npcServiceType(npc)) {
          npc.questMarker.visible = !serviceUnavailable(npcServiceType(npc));
          npc.questMarker.scale.setScalar(1.22);
          npc.questMarker.material.color.setHex(0xffd889);
        }
        continue;
      }
      const quest = getQuest(npc.questId);
      npc.questMarker.visible = !!quest && quest.state !== "done" && questPrerequisiteMet(quest);
      if (quest) {
        npc.questMarker.scale.setScalar(quest.state === "ready" ? 1.45 : 1);
        npc.questMarker.material.color.setHex(quest.state === "ready" ? 0xffd889 : 0x9fffd1);
      }
    }
  }

  function updateTalkPrompt() {
    if (game.mode !== "exploration" || game.state !== "playing" || !questDialog.hidden || localPlayerInSharedActivity()) {
      talkPrompt.hidden = true;
      game.activeNpc = null;
      return;
    }
    if (isPlayerMounted()) {
      game.activeNpc = null;
      talkKey.textContent = "R";
      talkAction.textContent = "Dismount";
      talkTarget.textContent = "Horse";
      talkPrompt.hidden = false;
      return;
    }
    const npc = nearestNpc();
    game.activeNpc = npc;
    if (npc) {
      talkKey.textContent = "E";
      talkAction.textContent = "Talk";
      talkTarget.textContent = npc.name;
      talkPrompt.hidden = false;
      return;
    }
    const horse = nearestHorse();
    if (horse) {
      talkKey.textContent = "R";
      talkAction.textContent = "Ride";
      talkTarget.textContent = "Horse";
      talkPrompt.hidden = false;
      return;
    }
    talkPrompt.hidden = true;
  }

  function openNpcDialog(npc) {
    if (!npc) {
      return;
    }
    game.dialogNpc = npc;
    game.dialogVoiceKey = "";
    keys.clear();
    player.blockHeld = false;
    playSfx("ui", 0.7);
    refreshQuestDialog();
    questDialog.hidden = false;
    actionDock.hidden = true;
    talkPrompt.hidden = true;
  }

  function closeQuestDialog() {
    questDialog.hidden = true;
    actionDock.hidden = false;
    game.dialogNpc = null;
    game.dialogVoiceKey = "";
    game.dialogTopics = [];
    updateDialogSelection(0);
  }

  function restoreGameplayControlAfterActivityEntry() {
    keys.clear();
    player.blockHeld = false;
    player.blocking = false;
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body && typeof activeElement.blur === "function") {
      activeElement.blur();
    }
    if (game.state === "playing") {
      game.suppressControlLossUntil = performance.now() + 1500;
      requestGamePointerLock();
    }
  }

  // ---- Player-input-driven dialogue (local deterministic responder) --------

  function dialogContextForNpc(npc) {
    const quest = npc && npc.questId ? getQuest(npc.questId) : null;
    return {
      npcName: npc ? npc.name : "",
      questId: quest ? quest.id : null,
      questState: quest ? quest.state : "generic",
      biome: npc ? npc.biome : "meadow",
      questLine: quest && questPrerequisiteMet(quest) ? questDialogueLine(quest) : null
    };
  }

  function renderDialogTopics(npc) {
    if (!dialogueTopics) {
      return;
    }
    const context = dialogContextForNpc(npc);
    game.dialogTopics = suggestedTopicsFor(context);
    dialogueTopics.textContent = "";
    game.dialogTopics.forEach((topic, index) => {
      const chip = document.createElement("span");
      chip.className = "ask-chip";
      const key = document.createElement("span");
      key.className = "ask-chip-key";
      key.textContent = String(index + 1);
      chip.appendChild(key);
      chip.appendChild(document.createTextNode(topic.label));
      chip.addEventListener("click", () => askDialogueQuestion(topic.query));
      dialogueTopics.appendChild(chip);
    });
    if (dialogueHint) {
      const count = game.dialogTopics.length;
      if (count > 1) {
        dialogueHint.textContent = "1-" + count + " ask \u00b7 Esc back";
      } else if (count === 1) {
        dialogueHint.textContent = "1 ask \u00b7 Esc back";
      } else {
        dialogueHint.textContent = "Esc back";
      }
    }
  }

  function askDialogueQuestion(rawText) {
    const npc = game.dialogNpc;
    if (!npc) {
      return;
    }
    const text = String(rawText == null ? "" : rawText).trim();
    if (!text) {
      playSfx("uiBack", 0.8);
      return;
    }
    const response = respondToPlayerInput(text, dialogContextForNpc(npc));
    questDialogBody.textContent = response.text;
    const echo = text.length > 90 ? text.slice(0, 87) + "\u2026" : text;
    questDialogStatus.textContent = "You asked: \u201c" + echo + "\u201d";
    game.dialogVoiceKey = "";
    playDialogVoiceIfChanged();
  }

  function dialogActionButtons() {
    return [questAcceptButton, questClaimButton, questServiceButton, questCloseButton].filter(button => !button.hidden);
  }

  function updateDialogSelection(index = game.dialogActionIndex) {
    const buttons = dialogActionButtons();
    if (!buttons.length) {
      game.dialogActionIndex = 0;
      for (const button of [questAcceptButton, questClaimButton, questServiceButton, questCloseButton]) {
        button.classList.remove("selected");
        button.setAttribute("tabindex", "-1");
      }
      return;
    }
    game.dialogActionIndex = (index + buttons.length) % buttons.length;
    for (const button of [questAcceptButton, questClaimButton, questServiceButton, questCloseButton]) {
      const selected = button === buttons[game.dialogActionIndex];
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-current", selected ? "true" : "false");
      button.setAttribute("tabindex", "-1");
    }
  }

  function moveDialogSelection(direction) {
    if (dialogActionButtons().length > 1) {
      playSfx("uiMove", 1);
    }
    updateDialogSelection(game.dialogActionIndex + direction);
  }

  function activateSelectedDialogAction() {
    const button = dialogActionButtons()[game.dialogActionIndex];
    if (button === questAcceptButton) {
      acceptCurrentQuest();
    } else if (button === questClaimButton) {
      claimCurrentQuest();
    } else if (button === questServiceButton) {
      activateCurrentNpcService();
    } else {
      playSfx("uiBack", 1);
      closeQuestDialog();
    }
  }

  function handleQuestDialogKey(event) {
    if (questDialog.hidden) {
      return false;
    }
    // Quick-ask a suggested topic by number.
    if (event.code.length === 6 && event.code.startsWith("Digit")) {
      const topicIndex = Number(event.code.slice(5)) - 1;
      if (topicIndex >= 0 && game.dialogTopics && game.dialogTopics[topicIndex]) {
        event.preventDefault();
        playSfx("uiMove", 1);
        askDialogueQuestion(game.dialogTopics[topicIndex].query);
        return true;
      }
    }
    if (event.code === "ArrowRight" || event.code === "ArrowDown") {
      event.preventDefault();
      moveDialogSelection(1);
      return true;
    }
    if (event.code === "ArrowLeft" || event.code === "ArrowUp") {
      event.preventDefault();
      moveDialogSelection(-1);
      return true;
    }
    if (event.code === "Enter" || event.code === "NumpadEnter") {
      event.preventDefault();
      activateSelectedDialogAction();
      return true;
    }
    if (event.code === "Escape") {
      event.preventDefault();
      playSfx("uiBack", 1);
      closeQuestDialog();
      return true;
    }
    return true;
  }

  function questDialogueLine(quest) {
    const lines = quest.dialogue || {};
    if (quest.id === "villages" && quest.state === "available" && allDiscoverableVillagesFound()) {
      return lines.alreadyComplete || "You've already walked every hearth-road I know. Let me put proper names to your map before the ink dries.";
    }
    return lines[quest.state] || quest.body;
  }

  function playDialogVoiceIfChanged() {
    const npc = game.dialogNpc;
    if (!npc) {
      return;
    }
    const key = npc.name + "|" + questDialogTitle.textContent + "|" + questDialogBody.textContent;
    if (game.dialogVoiceKey === key) {
      return;
    }
    game.dialogVoiceKey = key;
    playNpcVoiceLine(npc, questDialogBody.textContent);
  }

  function finishQuestDialogRefresh() {
    updateDialogSelection(0);
    renderDialogTopics(game.dialogNpc);
    playDialogVoiceIfChanged();
  }

  function questStatusLine(quest) {
    if (quest.state === "available") {
      if (!questPrerequisiteMet(quest)) {
        return questPrerequisiteStatus(quest);
      }
      return quest.objective + ". Reward: " + quest.reward + ".";
    }
    if (quest.state === "active") {
      return questProgressText(quest);
    }
    if (quest.state === "ready") {
      return (quest.dialogue && quest.dialogue.readyStatus ? quest.dialogue.readyStatus : "Objective complete") + ". Reward: " + quest.reward + ".";
    }
    return (quest.dialogue && quest.dialogue.doneStatus) || "Reward claimed. The valley already feels a little friendlier.";
  }

  function npcOffersCrownringService(npc) {
    return !!npc && npc.serviceType === "crownring";
  }

  function npcOffersDungeonService(npc) {
    return !!npc && npc.serviceType === "dungeon";
  }

  function npcServiceType(npc) {
    if (npcOffersCrownringService(npc)) {
      return "crownring";
    }
    if (npcOffersDungeonService(npc)) {
      return "dungeon";
    }
    return "";
  }

  function serviceUnavailable(serviceType) {
    if (serviceType === "crownring") {
      return arenaActivityActive() || dungeonActivityActive();
    }
    if (serviceType === "dungeon") {
      return dungeonActivityActive() || arenaActivityActive();
    }
    return true;
  }

  function serviceButtonLabel(serviceType, npc = game.dialogNpc) {
    if (serviceType === "dungeon") {
      return dungeonDefinition(npc?.dungeonId || BELLWATER_DUNGEON_ID).serviceLabel;
    }
    return "Enter Crownring";
  }

  function activateCurrentNpcService() {
    const serviceType = npcServiceType(game.dialogNpc);
    if (serviceType === "dungeon") {
      return startDungeonActivity(game.dialogNpc?.dungeonId || BELLWATER_DUNGEON_ID);
    }
    if (serviceType === "crownring") {
      return startCrownringArenaActivity();
    }
    return false;
  }

  function refreshQuestDialog() {
    const npc = game.dialogNpc;
    if (!npc) {
      return;
    }
    const quest = npc.questId ? getQuest(npc.questId) : null;
    const serviceType = npcServiceType(npc);
    const serviceBlocked = serviceUnavailable(serviceType);
    questDialogTitle.textContent = npc.name;
    questAcceptButton.hidden = true;
    questClaimButton.hidden = true;
    questServiceButton.hidden = !serviceType || serviceBlocked;
    questServiceButton.textContent = serviceButtonLabel(serviceType, npc);

    if (!quest) {
      if (serviceType === "crownring") {
        questDialogBody.textContent = "The Crownring is open to any sworn traveler. Step through the steward's gate, fight as many waves as you dare, then yield before pride empties your flask.";
        questDialogStatus.textContent = serviceBlocked ? "Another shared activity is already active." : "Press Enter on the service button to enter the Crownring.";
        finishQuestDialogRefresh();
        return;
      }
      if (serviceType === "dungeon") {
        const def = dungeonDefinition(npc.dungeonId || BELLWATER_DUNGEON_ID);
        const activeDef = dungeonActivityActive() ? activeDungeonDefinition() : null;
        questDialogBody.textContent = def.serviceBody;
        questDialogStatus.textContent = serviceBlocked
          ? activeDef
            ? activeDef.id === def.id
              ? def.serviceStatusBlocked
              : activeDef.name + " is active; finish it before opening " + def.shortName + "."
            : "Another shared activity is already active."
          : def.serviceStatusOpen;
        finishQuestDialogRefresh();
        return;
      } else {
        questDialogBody.textContent = ambientLineFor({ npcName: npc.name, biome: npc.biome });
      }
      questDialogStatus.textContent = "Nearby villagers can mend small wounds when you stand close.";
      finishQuestDialogRefresh();
      return;
    }

    if (!questPrerequisiteMet(quest)) {
      questDialogBody.textContent = "Pell looks over the empty stable hook and shakes his head. \"Bring me a loyal horse first. I can fit tack to a mount, not to a promise.\"";
      questDialogStatus.textContent = questPrerequisiteStatus(quest);
      finishQuestDialogRefresh();
      return;
    }

    questDialogTitle.textContent = quest.giver + " - " + quest.title;
    questDialogBody.textContent = questDialogueLine(quest);
    questDialogStatus.textContent = questStatusLine(quest);
    if (quest.state === "available") {
      questAcceptButton.hidden = false;
    } else if (quest.state === "ready") {
      questClaimButton.hidden = false;
    }
    if (serviceType && !serviceBlocked) {
      questServiceButton.hidden = false;
      questServiceButton.textContent = serviceButtonLabel(serviceType, npc);
    }
    finishQuestDialogRefresh();
  }

  function acceptCurrentQuest() {
    const npc = game.dialogNpc;
    const quest = npc && npc.questId ? getQuest(npc.questId) : null;
    if (!quest || quest.state !== "available") {
      return;
    }
    if (!questPrerequisiteMet(quest)) {
      showBanner(questPrerequisiteStatus(quest) || "Quest unavailable", 2.2);
      refreshQuestDialog();
      return;
    }
    quest.state = "active";
    reconcileQuestProgress(quest, { silent: true });
    showBanner(quest.state === "ready" ? quest.title + " complete" : "Quest started");
    playSfx(quest.state === "ready" ? "quest" : "ui", 0.9);
    saveProgress();
    updateQuestLog();
    updateQuestMarkers();
    refreshQuestDialog();
  }

  function claimCurrentQuest() {
    const npc = game.dialogNpc;
    const quest = npc && npc.questId ? getQuest(npc.questId) : null;
    if (!quest || quest.state !== "ready") {
      return;
    }
    quest.state = "done";
    grantQuestReward(quest);
    saveProgress();
    updateQuestLog();
    updateQuestMarkers();
    refreshQuestDialog();
  }

  function grantQuestReward(quest) {
    const unlocks = grantRpgRewardForQuest(quest.id);
    if (quest.id === "herbs") {
      addProgressionBoon({ health: 12 });
      player.health = player.maxHealth;
    } else if (quest.id === "raiders") {
      addProgressionBoon({ guard: 8, mana: 8 });
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
    } else if (quest.id === "spiders") {
      addProgressionBoon({ health: 6 });
      player.health = player.maxHealth;
      game.potions.push(createHealthPotion(player.position.x + 1.2, player.position.z - 1.4, { kind: "small", healAmount: 28 }));
      trimPotionDrops();
    } else if (quest.id === "dragons") {
      addProgressionBoon({ mana: 10, guard: 6 });
      player.mana = player.maxMana;
      player.guard = player.maxGuard;
    } else if (quest.id === "wisps") {
      addProgressionBoon({ mana: 8, health: 5 });
      player.mana = player.maxMana;
      player.health = player.maxHealth;
    } else if (quest.id === "briarStalkers") {
      addProgressionBoon({ health: 4, guard: 5, mana: 5 });
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
      game.potions.push(createHealthPotion(player.position.x + 1.4, player.position.z - 1.0, { kind: "small", healAmount: 32 }));
      trimPotionDrops();
    } else if (quest.id === "bogRelics") {
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
      game.potions.push(createHealthPotion(player.position.x - 1.4, player.position.z - 1.2, { kind: "full" }));
      trimPotionDrops();
    } else if (quest.id === "horse") {
      spawnHorseNearPlayer();
    } else if (quest.id === "skyDrake") {
      progression.exploration.drakeUnlocked = true;
      progression.exploration.activeMountId = "drake";
      spawnHorseNearPlayer();
      unlocks.push("Skyhatched Drake");
      sendOnlineMessage({ kind: "state", state: serializePlayerState() });
    } else if (quest.id === ROADWARDEN_TACK_QUEST_ID) {
      progression.exploration.mountTackId = ROADWARDEN_TACK_ID;
      applyMountTackToHorse();
      unlocks.push(ROADWARDEN_TACK_NAME);
      sendOnlineMessage({ kind: "state", state: serializePlayerState() });
    } else if (quest.id === "villages") {
      addProgressionBoon({ potionCooldown: 4 });
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
      game.potions.push(createHealthPotion(player.position.x + 1.8, player.position.z + 1.2, { kind: "full" }));
      trimPotionDrops();
    } else if (quest.id === "cityWrits") {
      addProgressionBoon({ guard: 6, mana: 6 });
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
    } else if (quest.id === "citySanctuary") {
      addProgressionBoon({ health: 8 });
      player.health = player.maxHealth;
      game.potions.push(createHealthPotion(player.position.x - 1.2, player.position.z + 1.4, { kind: "small", healAmount: 34 }));
      trimPotionDrops();
    } else if (quest.id === "crownringTrial") {
      addProgressionBoon({ health: 5, guard: 5, mana: 5 });
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
      game.potions.push(createHealthPotion(player.position.x + 1.3, player.position.z + 1.1, { kind: "small", healAmount: 32 }));
      trimPotionDrops();
    }
    awardExplorationXp(quest.rewardXp);
    spawnImpact(player.position, 0xffd889, 24);
    showBanner(unlocks.length ? "Unlocked " + unlocks.join(" and ") : "Reward claimed");
    playSfx("quest", 1.15);
    updateHud();
  }

  function updateQuestLog() {
    questLogItems.replaceChildren();
    const visibleQuests = game.quests.filter(quest => quest.state === "active" || quest.state === "ready");
    questLog.hidden = game.mode !== "exploration" || visibleQuests.length === 0;
    for (const quest of visibleQuests) {
      const row = document.createElement("div");
      row.className = "quest-row";
      row.style.setProperty("--quest-color", questColor(quest.id).hex);
      const hint = questLocationHint(quest);
      row.textContent = quest.state === "ready"
        ? quest.title + ": return to " + quest.giver
        : quest.title + ": " + questProgressText(quest) + (hint ? " - " + hint : "");
      questLogItems.appendChild(row);
    }
    updateQuestMap();
  }

  function questColor(id) {
    const colors = {
      herbs: { hex: "#9fffd1", fill: "rgba(159, 255, 209, 0.18)", stroke: "rgba(159, 255, 209, 0.78)" },
      horse: { hex: "#ffd889", fill: "rgba(255, 216, 137, 0.18)", stroke: "rgba(255, 216, 137, 0.78)" },
      raiders: { hex: "#ff9f5d", fill: "rgba(255, 159, 93, 0.16)", stroke: "rgba(255, 159, 93, 0.72)" },
      villages: { hex: "#f7df9a", fill: "rgba(247, 223, 154, 0.16)", stroke: "rgba(247, 223, 154, 0.72)" },
      spiders: { hex: "#d9a648", fill: "rgba(217, 166, 72, 0.17)", stroke: "rgba(217, 166, 72, 0.76)" },
      dragons: { hex: "#ff705c", fill: "rgba(255, 112, 92, 0.16)", stroke: "rgba(255, 112, 92, 0.76)" },
      wisps: { hex: "#8affd2", fill: "rgba(138, 255, 210, 0.17)", stroke: "rgba(138, 255, 210, 0.78)" },
      briarStalkers: { hex: "#b9d678", fill: "rgba(185, 214, 120, 0.17)", stroke: "rgba(185, 214, 120, 0.78)" },
      bogRelics: { hex: "#b9ffd5", fill: "rgba(185, 255, 213, 0.17)", stroke: "rgba(185, 255, 213, 0.78)" },
      skyDrake: { hex: "#7ad9c9", fill: "rgba(122, 217, 201, 0.17)", stroke: "rgba(122, 217, 201, 0.78)" },
      roadwardenTack: { hex: "#ffd889", fill: "rgba(255, 216, 137, 0.17)", stroke: "rgba(255, 216, 137, 0.8)" },
      cityWrits: { hex: "#f7df9a", fill: "rgba(247, 223, 154, 0.16)", stroke: "rgba(247, 223, 154, 0.76)" },
      citySanctuary: { hex: "#7ae8ff", fill: "rgba(122, 232, 255, 0.17)", stroke: "rgba(122, 232, 255, 0.78)" },
      crownringTrial: { hex: "#ffd889", fill: "rgba(255, 216, 137, 0.17)", stroke: "rgba(255, 216, 137, 0.8)" }
    };
    return colors[id] || { hex: "#7ae8ff", fill: "rgba(122, 232, 255, 0.17)", stroke: "rgba(122, 232, 255, 0.76)" };
  }

  function questLocationHint(quest) {
    if (quest.state === "ready") {
      return "return to " + quest.giver;
    }
    const hints = {
      herbs: "lake shores",
      horse: "meadow oats",
      raiders: "open wilds",
      villages: "settlements",
      spiders: "desert",
      dragons: "mountains",
      wisps: "Mistfen",
      briarStalkers: "Briarfall Woods",
      bogRelics: "Mistfen pools",
      skyDrake: "Dragonspine roost",
      roadwardenTack: "road waymarks",
      cityWrits: "Crownford beacon",
      citySanctuary: "church district",
      crownringTrial: "Crownring"
    };
    return hints[quest.id] || "";
  }

  function questGiverPosition(quest) {
    const npc = game.npcs.find(candidate => candidate.questId === quest.id || candidate.name === quest.giver);
    return npc ? { x: npc.group.position.x, z: npc.group.position.z } : null;
  }

  function aggregateQuestArea(positions, padding, minRadius, maxRadius) {
    if (!positions.length) {
      return null;
    }
    let x = 0;
    let z = 0;
    for (const position of positions) {
      x += position.x;
      z += position.z;
    }
    x /= positions.length;
    z /= positions.length;
    let radius = minRadius;
    for (const position of positions) {
      radius = Math.max(radius, Math.hypot(position.x - x, position.z - z) + padding);
    }
    return { x, z, radius: Math.min(radius, maxRadius) };
  }

  function questMapAreas(quest) {
    const color = questColor(quest.id);
    if (quest.state === "ready") {
      const giver = questGiverPosition(quest);
      return giver ? [{ ...giver, radius: 10, color, ready: true }] : [];
    }
    if (quest.id === "herbs") {
      return game.exploration.lakes.map(lake => ({
        x: lake.x,
        z: lake.z,
        rx: lake.rx + 14,
        rz: lake.rz + 14,
        color
      }));
    }
    if (quest.id === "horse") {
      const positions = game.questItems
        .filter(item => item.questId === "horse")
        .map(item => item.position);
      const area = aggregateQuestArea(positions, 28, 38, 92);
      return area ? [{ ...area, color }] : [];
    }
    if (quest.id === "raiders") {
      const positions = game.enemies
        .filter(enemy => !enemy.dead && (enemy.type === "barbarian" || enemy.type === "briarBeast"))
        .map(enemy => enemy.position);
      const area = aggregateQuestArea(positions, 40, 58, 150);
      return area ? [{ ...area, color }] : [{ x: game.exploration.origin.x, z: game.exploration.origin.z, radius: 130, color }];
    }
    if (quest.id === "villages") {
      return game.exploration.villages
        .filter(village => !game.exploration.discovered.has(village.id))
        .map(village => ({ x: village.x, z: village.z, radius: village.radius + 24, color }));
    }
    if (quest.id === "spiders" || quest.id === "dragons" || quest.id === "skyDrake" || quest.id === "wisps" || quest.id === "briarStalkers") {
      const biomeId = quest.id === "spiders" ? "desert" : quest.id === "dragons" || quest.id === "skyDrake" ? "mountain" : quest.id === "wisps" ? "swamp" : "briar";
      const biome = game.exploration.biomes.find(candidate => candidate.id === biomeId);
      return biome
        ? [{
          x: game.exploration.origin.x + biome.x,
          z: game.exploration.origin.z + biome.z,
          rx: biome.rx + 18,
          rz: biome.rz + 18,
          color
        }]
        : [];
    }
    if (quest.id === "bogRelics") {
      const positions = game.questItems
        .filter(item => item.questId === "bogRelics")
        .map(item => item.position);
      const area = aggregateQuestArea(positions, 22, 28, 58);
      return area ? [{ ...area, color }] : [];
    }
    if (quest.id === ROADWARDEN_TACK_QUEST_ID) {
      return game.questItems
        .filter(item => item.questId === ROADWARDEN_TACK_QUEST_ID && !item.collected)
        .map(item => ({ x: item.position.x, z: item.position.z, radius: 14, color }));
    }
    if (quest.id === "cityWrits" || quest.id === "citySanctuary") {
      if (quest.id === "cityWrits") {
        const positions = game.questItems
          .filter(item => item.questId === "cityWrits")
          .map(item => item.position);
        const area = aggregateQuestArea(positions, 18, 22, 48);
        return area ? [{ ...area, color }] : [];
      }
      if (game.exploration.city) {
        return [{
          x: game.exploration.city.x + 25,
          z: game.exploration.city.z - 3,
          radius: 20,
          color
        }];
      }
    }
    if (quest.id === "crownringTrial" && game.exploration.arenaCity) {
      return [{
        x: game.exploration.arenaCity.x,
        z: game.exploration.arenaCity.z,
        radius: game.exploration.arenaCity.radius + 12,
        color
      }];
    }
    return [];
  }

  function projectQuestMapPoint(worldX, worldZ, size, center, scale) {
    return {
      x: center + (worldX - game.exploration.origin.x) * scale,
      y: center + (worldZ - game.exploration.origin.z) * scale
    };
  }

  function drawQuestMapArea(ctx, area, size, center, scale) {
    const point = projectQuestMapPoint(area.x, area.z, size, center, scale);
    ctx.save();
    ctx.beginPath();
    if (area.rx && area.rz) {
      ctx.ellipse(point.x, point.y, Math.max(5, area.rx * scale), Math.max(5, area.rz * scale), 0, 0, TAU);
    } else {
      ctx.arc(point.x, point.y, Math.max(area.ready ? 4 : 7, area.radius * scale), 0, TAU);
    }
    ctx.fillStyle = area.color.fill;
    ctx.strokeStyle = area.color.stroke;
    ctx.lineWidth = area.ready ? 2.4 : 1.4;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  const minimapBase = { key: "", canvas: null };

  function minimapWorldKey() {
    return game.exploration.seed + ":" + game.exploration.biomes.length + ":" + game.exploration.roads.length + ":" + game.exploration.villages.length + ":" + (game.exploration.dungeonPois || []).length + ":" + game.exploration.discovered.size;
  }

  // Static world layer (terrain, lakes, roads, discovered settlements) cached
  // offscreen so the 0.16s refresh only blits and draws dynamic markers.
  function buildMinimapBaseLayer(size, center, mapRadius, scale) {
    if (!minimapBase.canvas) {
      minimapBase.canvas = document.createElement("canvas");
      minimapBase.canvas.width = size * MINIMAP_DPR;
      minimapBase.canvas.height = size * MINIMAP_DPR;
    }
    const ctx = minimapBase.canvas.getContext("2d");
    const originX = game.exploration.origin.x;
    const originZ = game.exploration.origin.z;
    const localPoint = (localX, localZ) => ({ x: center + localX * scale, y: center + localZ * scale });
    ctx.setTransform(MINIMAP_DPR, 0, 0, MINIMAP_DPR, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, mapRadius + 6, 0, TAU);
    ctx.clip();
    ctx.fillStyle = "rgba(24, 38, 28, 0.94)";
    ctx.fillRect(0, 0, size, size);
    const biomeFills = {
      desert: "rgba(208, 174, 110, 0.55)",
      mountain: "rgba(142, 146, 158, 0.6)",
      swamp: "rgba(58, 86, 66, 0.78)",
      briar: "rgba(65, 100, 54, 0.78)"
    };
    for (const biome of game.exploration.biomes) {
      const fill = biomeFills[biome.id];
      if (!fill) {
        continue;
      }
      const point = localPoint(biome.x, biome.z);
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, Math.max(4, biome.rx * scale), Math.max(4, biome.rz * scale), biome.rotation || 0, 0, TAU);
      ctx.fillStyle = fill;
      ctx.fill();
    }
    for (const lake of game.exploration.lakes) {
      const point = localPoint(lake.x - originX, lake.z - originZ);
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, Math.max(2.4, lake.rx * scale), Math.max(2.4, lake.rz * scale), 0, 0, TAU);
      ctx.fillStyle = "rgba(88, 154, 196, 0.8)";
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(206, 184, 138, 0.5)";
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const road of game.exploration.roads) {
      const from = localPoint(road.fromX, road.fromZ);
      const to = localPoint(road.toX, road.toZ);
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    }
    ctx.stroke();
    for (const village of game.exploration.villages) {
      if (!game.exploration.discovered.has(village.id)) {
        continue;
      }
      const point = localPoint(village.x - originX, village.z - originZ);
      if (village.id === "crownford") {
        ctx.fillStyle = "#f7df9a";
        ctx.strokeStyle = "rgba(5, 9, 10, 0.85)";
        ctx.lineWidth = 1;
        ctx.fillRect(point.x - 3.4, point.y - 3.4, 6.8, 6.8);
        ctx.strokeRect(point.x - 3.4, point.y - 3.4, 6.8, 6.8);
      } else if (village.id === "crownring") {
        ctx.strokeStyle = "#ffd889";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3.6, 0, TAU);
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(244, 239, 228, 0.9)";
        ctx.strokeStyle = "rgba(5, 9, 10, 0.85)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.6, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
    for (const poi of game.exploration.dungeonPois || []) {
      const point = localPoint(poi.localX, poi.localZ);
      ctx.fillStyle = poi.biome === "desert" ? "#f2c76a" : "#9fffd1";
      ctx.strokeStyle = "rgba(5, 9, 10, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - 4.2);
      ctx.lineTo(point.x + 3.6, point.y);
      ctx.lineTo(point.x, point.y + 4.2);
      ctx.lineTo(point.x - 3.6, point.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(point.x, point.y + 0.7, 1.7, Math.PI, TAU);
      ctx.strokeStyle = "rgba(5, 9, 10, 0.72)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const home = localPoint(game.exploration.spawn.x - originX, game.exploration.spawn.z - originZ);
    ctx.fillStyle = "#9fffd1";
    ctx.strokeStyle = "rgba(5, 9, 10, 0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(home.x, home.y - 4);
    ctx.lineTo(home.x + 3.2, home.y - 0.6);
    ctx.lineTo(home.x + 2, home.y - 0.6);
    ctx.lineTo(home.x + 2, home.y + 3);
    ctx.lineTo(home.x - 2, home.y + 3);
    ctx.lineTo(home.x - 2, home.y - 0.6);
    ctx.lineTo(home.x - 3.2, home.y - 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, mapRadius, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawMinimapCompass(ctx, center, mapRadius) {
    const labelRadius = mapRadius + 6.5;
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU;
      const isCardinal = i % 2 === 0;
      if (isCardinal) {
        continue;
      }
      const inner = mapRadius - 1;
      const outer = mapRadius + 3;
      ctx.strokeStyle = "rgba(244, 239, 228, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(center + Math.sin(angle) * inner, center - Math.cos(angle) * inner);
      ctx.lineTo(center + Math.sin(angle) * outer, center - Math.cos(angle) * outer);
      ctx.stroke();
    }
    const labels = [
      { text: "N", x: center, y: center - labelRadius, color: "#f7df9a" },
      { text: "E", x: center + labelRadius, y: center, color: "rgba(244, 239, 228, 0.78)" },
      { text: "S", x: center, y: center + labelRadius, color: "rgba(244, 239, 228, 0.78)" },
      { text: "W", x: center - labelRadius, y: center, color: "rgba(244, 239, 228, 0.78)" }
    ];
    ctx.font = "800 9px 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const label of labels) {
      ctx.strokeStyle = "rgba(5, 9, 10, 0.9)";
      ctx.lineWidth = 3;
      ctx.strokeText(label.text, label.x, label.y);
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, label.x, label.y);
    }
  }

  function updateQuestMap() {
    const visible = game.mode === "exploration"
      && (game.state === "playing" || game.state === "paused")
      && !!game.exploration.seed;
    minimapPanel.hidden = !visible;
    if (!visible) {
      return;
    }
    const ctx = questMapCtx;
    const size = MINIMAP_LOGICAL_SIZE;
    const center = size / 2;
    const mapRadius = size / 2 - 12;
    const scale = mapRadius / game.exploration.radius;
    const worldKey = minimapWorldKey();
    if (minimapBase.key !== worldKey) {
      buildMinimapBaseLayer(size, center, mapRadius, scale);
      minimapBase.key = worldKey;
    }
    ctx.setTransform(MINIMAP_DPR, 0, 0, MINIMAP_DPR, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(minimapBase.canvas, 0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, mapRadius + 6, 0, TAU);
    ctx.clip();
    const visibleQuests = game.quests.filter(quest => quest.state === "active" || quest.state === "ready");
    for (const quest of visibleQuests) {
      for (const area of questMapAreas(quest)) {
        drawQuestMapArea(ctx, area, size, center, scale);
      }
    }
    // Allies: one palette-tinted dot per connected remote player, clamped to
    // the map rim so distant teammates pin at the edge. Runs in the cheap
    // blit pass, so keep this to simple arcs.
    if (online.connected && online.remotePlayers.size > 0) {
      const rimDist = mapRadius - 4;
      for (const [remoteId, remote] of online.remotePlayers) {
        if (!remote.playing || !remote.group) {
          continue;
        }
        const point = projectQuestMapPoint(remote.group.position.x, remote.group.position.z, size, center, scale);
        const dx = point.x - center;
        const dy = point.y - center;
        const dist = Math.hypot(dx, dy);
        if (dist > rimDist) {
          point.x = center + (dx / dist) * rimDist;
          point.y = center + (dy / dist) * rimDist;
        }
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3.1, 0, TAU);
        ctx.fillStyle = "#" + remotePalette(remoteId).glow.toString(16).padStart(6, "0");
        ctx.strokeStyle = "rgba(5, 9, 10, 0.9)";
        ctx.lineWidth = 1.3;
        ctx.fill();
        ctx.stroke();
      }
    }
    const playerPoint = projectQuestMapPoint(player.position.x, player.position.z, size, center, scale);
    ctx.translate(playerPoint.x, playerPoint.y);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = "#f4efe4";
    ctx.strokeStyle = "rgba(5, 9, 10, 0.9)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -6.2);
    ctx.lineTo(4.2, 4.6);
    ctx.lineTo(0, 2.4);
    ctx.lineTo(-4.2, 4.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawMinimapCompass(ctx, center, mapRadius);
  }

  function setupExplorationQuests() {
    game.quests.push(
      createQuest(
        "herbs",
        "Greenfire Remedies",
        "Mira",
        "Greenfire grows beside the cold lakes. Bring enough back and I can brew something stronger than ordinary field medicine.",
        "Gather greenfire herbs",
        "Health boon, XP, and a full heal",
        "collect",
        6
      ),
      createQuest(
        "raiders",
        "Quiet the Road",
        "Torren",
        "The tracks are full of raiders and worse things now. Thin them out and the villages can trade again without carrying axes in both hands.",
        "Defeat roaming threats",
        "Roadwarden Blade, Wayfinder Focus, guard and magica boons plus XP",
        "hunt",
        8
      ),
      createQuest(
        "villages",
        "Map the Hearths",
        "Sella",
        "There are more settlements beyond the old hills. Find them, mark the routes, and the whole valley gets smaller.",
        "Discover settlements",
        "A full recovery potion and faster potion cooldown",
        "discover",
        3,
        {
          rewardXp: 65,
          conversationTags: ["starter", "cartography", "settlements", "safe-roads"],
          dialogue: {
            available: "If you want a first road worth walking, take my hearth-map. Mark three settlements and every later journey will feel less like wandering.",
            alreadyComplete: "You've already found the smoke, bells, and well-stones I hoped to mark. Give me a moment and I will make your map official.",
            active: "Follow the road bends and the chimney smoke. I only need three good marks before I can trust the routes.",
            ready: "These marks are clean. Now the valley has names instead of rumors.",
            readyStatus: "Map ready",
            done: "Keep that map close. Roads are braver when someone has named what waits at the end.",
            doneStatus: "Sella has copied your route notes into the hearth-map."
          }
        }
      ),
      createQuest(
        "spiders",
        "Silk in the Sand",
        "Amara",
        "The old wells are webbed over. Clear out enough dune spiders and I can reopen the cistern paths.",
        "Defeat dune spiders",
        "Health boon, XP, and a field potion",
        "hunt",
        5
      ),
      createQuest(
        "dragons",
        "Smoke on the Peaks",
        "Kael",
        "The mountain nests are active again. Bring down a pair of dragons before they start hunting the roads.",
        "Defeat mountain dragons",
        "Magica and guard boons plus XP",
        "hunt",
        2
      ),
      createQuest(
        "wisps",
        "Lights in the Mist",
        "Mirel",
        "The fen lights have started circling the plank roads. Banish enough of them and travelers can cross Mistfen after dusk again.",
        "Banish fen wisps",
        "Magica and health boons plus XP",
        "hunt",
        4
      ),
      createQuest(
        "briarStalkers",
        "Rootmaws on the Timber Road",
        "Edda Thorn",
        "The Briarfall charcoal road is being hunted by briarback rootmaws. Break enough of their packs and the woodcutters can reopen the lane.",
        "Defeat Briarfall rootmaws",
        "Briarfall class kits, Pathcraft perk, boons, and XP",
        "hunt",
        6,
        {
          rewardXp: 70,
          conversationTags: ["briar", "woods", "rootmaws", "gear", "roads"],
          dialogue: {
            available: "Briarfall does not mind honest thorns. It is the rootmaws with teeth that trouble us. Clear six from the timber road and I will show you what our smiths make from rootwood and old iron.",
            active: "They crawl where the lane bends under low branches. Keep your shield close, your spell short, or your bowstring dry.",
            ready: "The road breathed easier this morning. Bring your hands here; I have kits that suit travelers who know how woods fight back.",
            readyStatus: "Timber road cleared",
            done: "Rootwood remembers pressure. So should you. Use the Briarfall kits when control matters more than swagger.",
            doneStatus: "Edda Thorn has reopened the Briarfall timber road."
          }
        }
      ),
      createQuest(
        "bogRelics",
        "Relics Under Reed",
        "Noll",
        "Old shrine bells sank into the black pools years ago. Find the ones still glowing and I will trade you our best field medicine.",
        "Recover sunken relics",
        "A full recovery potion and full restore",
        "collect",
        3
      ),
      createQuest(
        "horse",
        "Hooves for the Long Road",
        "Rowan",
        "A good horse will cross this valley faster than any pair of boots. Gather wild oats, and I will saddle one that already likes your shadow.",
        "Gather wild oats",
        "A loyal horse mount",
        "collect",
        4
      ),
      createQuest(
        ROADWARDEN_TACK_QUEST_ID,
        "Shoes for the Long Road",
        "Quartermaster Pell",
        "A road horse needs more than a saddle and optimism. Ride the posted waymarks from the Crownring gate out across the old roads, and I will fit your tack for real distance.",
        "Ride through road waymarks",
        ROADWARDEN_TACK_NAME + ", faster mounted travel, and XP",
        "collect",
        4,
        {
          rewardXp: 65,
          prerequisite: "horseUnlocked",
          conversationTags: ["mount", "roads", "crownring", "waymarks"],
          dialogue: {
            available: "That horse has legs enough. Now let us find out whether the straps do. Take the Crownring gate, Crownford road, meadow fork, and a threshold marker before the dust settles.",
            active: "Ride the road marks, not the short grass. I need to see how the saddle takes turns, stones, and gate dust.",
            ready: "Good. No slipped cinch, no panicked reins, no dramatic story from a ditch. I can work with that.",
            readyStatus: "Route proven",
            done: "Your tack is roadwarden-fit now. The horse should carry smoother, and other travelers will know you have taken the long road properly.",
            doneStatus: "Roadwarden Tack fitted."
          }
        }
      ),
      createQuest(
        "cityWrits",
        "The Beacon Writs",
        "Marshal Rowan Vale",
        "Crownford's Wayfinder Beacon keeps the old roads honest. Read the four carved waystones and I will mark you as a sworn guide of the high city.",
        "Inspect beacon waystones",
        "Crownford Drill perk, class-cost training, boons plus XP",
        "collect",
        4
      ),
      createQuest(
        "citySanctuary",
        "Sanctuary Lamps",
        "Sister Edda",
        "The church lamps went dark when the last storm rolled over the walls. Relight the sanctuary lamps and the city will keep a bed ready for you.",
        "Relight sanctuary lamps",
        "Health boon, XP, and a field potion",
        "collect",
        3
      ),
      createQuest(
        "crownringTrial",
        "First Bell of the Crownring",
        "Steward Bryn",
        "Every traveler wants the purse. Fewer learn when to yield. Clear the first Crownring wave and come back with your name still attached to you.",
        "Clear one Crownring wave",
        "Crownring class kits, training boon, XP, and a field potion",
        "arena",
        1,
        {
          rewardXp: 55,
          conversationTags: ["arena", "training", "crownring", "waves"],
          dialogue: {
            available: "The first bell is not about glory. It is about proving you can hear a second bell and still choose whether to stay.",
            active: "Enter the Crownring from here, clear one wave, then yield if your knees start writing poetry.",
            ready: "There. You heard the bell and answered it. That makes you more useful than most bold fools.",
            readyStatus: "First bell answered",
            done: "Come back whenever you want a purse, a bruise, or both. The ring remembers regulars.",
            doneStatus: "Steward Bryn has marked you as Crownring proven."
          }
        }
      ),
      createQuest(
        "skyDrake",
        "The Skyhatched Brood",
        "Brunna",
        "A clutch hatched cold on the high shelves after the dread drakes drove the mothers off. Bring me three sun-warmed drake eggs from the roost rocks and the strongest hatchling will learn your saddle instead of the open sky.",
        "Recover warm drake eggs",
        "Skyhatched Drake mount and XP",
        "collect",
        3,
        {
          rewardXp: 80,
          conversationTags: ["mountain", "dragons", "roost", "mount"],
          dialogue: {
            available: "Three eggs still hold their warmth out on the roost shelves. Carry them to my warming pit before the wind takes them, and one hatchling will take your saddle when it stands.",
            active: "Look where the rock holds the sun between the spires. Warm eggs sit in the wind shadows - and so do the drakes that watch them.",
            ready: "All three, still warm. You carried them like mountain-born. The gray one already turns its head when you walk past.",
            readyStatus: "Clutch warming",
            done: "The drake answers to your shadow now. Press M if you would rather keep your horse under saddle some days - it will not take offense.",
            doneStatus: "Brunna's hatchling rides with you."
          }
        }
      )
    );
  }

  function addExplorationVillage(group, x, z, random, index, biome = "meadow") {
    const flatRadius = biome === "desert" ? 24 : biome === "swamp" ? 25 : biome === "briar" ? 26 : biome === "mountain" ? 24 : 23;
    registerExplorationFlatZone(x, z, flatRadius, 12, null, 0.94);
    const villageGroundY = explorationGroundLocalY(x, z);
    const village = {
      id: "village-" + index,
      x: game.exploration.origin.x + x,
      z: game.exploration.origin.z + z,
      localX: x,
      localZ: z,
      radius: biome === "desert" ? 23.5 : biome === "swamp" ? 24.5 : biome === "briar" ? 25.0 : biome === "mountain" ? 23.0 : 22.0,
      biome
    };
    game.exploration.villages.push(village);
    const houses = [];
    const baseHouseRadius = biome === "swamp" ? 10.2 : biome === "desert" ? 10.8 : biome === "briar" ? 10.9 : biome === "mountain" ? 10.4 : 9.8;
    const houseRadiusRange = biome === "swamp" || biome === "briar" ? 5.8 : 5.2;
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * TAU + random() * 0.34;
      const houseRadius = baseHouseRadius + random() * houseRadiusRange;
      const hx = x + Math.cos(angle) * houseRadius;
      const hz = z + Math.sin(angle) * houseRadius;
      const houseScale = 1.02 + random() * 0.16;
      const house = addExplorationHouse(group, hx, hz, houseScale, i, biome);
      house.rotation.y += angle + Math.PI;
      houses.push({ x: hx, z: hz, rotation: house.rotation.y, scale: houseScale });
    }
    const wellMaterial = biome === "desert" ? materials.adobe : biome === "mountain" ? materials.darkStone : biome === "swamp" ? materials.swampPlank : biome === "briar" ? materials.rootwood : materials.stone;
    const well = makeCylinder(0.62, 0.72, 0.62, 16, wellMaterial, x, villageGroundY + 0.31, z);
    const beam = makeBox(1.8, 0.16, 0.18, biome === "mountain" ? materials.darkStone : biome === "swamp" ? materials.swampPlank : biome === "briar" ? materials.rootwood : materials.wood, x, villageGroundY + 1.1, z);
    const postA = makeBox(0.16, 1.2, 0.16, materials.wood, x - 0.72, villageGroundY + 0.75, z);
    const postB = makeBox(0.16, 1.2, 0.16, materials.wood, x + 0.72, villageGroundY + 0.75, z);
    group.add(well, beam, postA, postB);
    addExplorationCollider(x, z, 1.15, "structure");
    const names = biome === "desert"
      ? ["Amara", "Sahir", "Nima", "Tarek", "Zala", "Omid"]
      : biome === "mountain"
        ? ["Kael", "Brunna", "Sten", "Yrsa", "Hald", "Runa"]
        : biome === "swamp"
          ? ["Mirel", "Noll", "Vessa", "Orrin", "Sable", "Fen"]
          : biome === "briar"
            ? ["Edda Thorn", "Moss", "Bran", "Iven", "Hollis", "Wren"]
          : ["Borin", "Nessa", "Calder", "Ira", "Pavel", "Lina", "Oren", "Tamsin", "Rook", "Elia", "Maren", "Voss"];
    for (let i = 0; i < 3; i += 1) {
      const angle = random() * TAU;
      let questId = null;
      if (biome === "desert" && i === 0) {
        questId = "spiders";
      } else if (biome === "mountain" && i === 0) {
        questId = "dragons";
      } else if (biome === "swamp" && i === 0) {
        questId = "wisps";
      } else if (biome === "swamp" && i === 1) {
        questId = "bogRelics";
      } else if (biome === "briar" && i === 0) {
        questId = "briarStalkers";
      }
      const name = questId === "spiders" ? "Amara" : questId === "dragons" ? "Kael" : questId === "wisps" ? "Mirel" : questId === "bogRelics" ? "Noll" : questId === "briarStalkers" ? "Edda Thorn" : names[(index * 3 + i) % names.length];
      const npcRadius = 5.2 + random() * 7.4;
      game.npcs.push(createFriendlyNpc(
        game.exploration.origin.x + x + Math.cos(angle) * npcRadius,
        game.exploration.origin.z + z + Math.sin(angle) * npcRadius,
        random,
        8.5,
        name,
        questId,
        biome
      ));
    }
    addVillageDecor(group, village, houses, random);
  }

  function addCityPavement(group, x, z, width, depth, rotation = 0) {
    const paving = makeBox(width, 0.055, depth, materials.darkStone, x, explorationGroundLocalY(x, z, 0.032), z);
    paving.rotation.y = rotation;
    paving.receiveShadow = true;
    group.add(paving);
    return paving;
  }

  function addCityHouse(group, x, z, scale, variant, rotation = 0) {
    const house = new THREE.Group();
    setExplorationLocalGroundPosition(house, x, z);
    house.rotation.y = rotation;
    house.scale.setScalar(scale);
    const wall = variant % 2 ? materials.cityWall : materials.stone;
    const floor = makeBox(4.6, 0.12, 4.0, materials.darkStone, 0, 0.06, 0);
    const back = makeBox(4.6, 2.6, 0.24, wall, 0, 1.35, 1.88);
    const left = makeBox(0.24, 2.6, 4.0, wall, -2.18, 1.35, 0);
    const right = makeBox(0.24, 2.6, 4.0, wall, 2.18, 1.35, 0);
    const frontLeft = makeBox(1.48, 2.6, 0.24, wall, -1.56, 1.35, -1.88);
    const frontRight = makeBox(1.48, 2.6, 0.24, wall, 1.56, 1.35, -1.88);
    const door = makeBox(0.92, 1.9, 0.08, materials.wood, 0, 1.02, -2.04);
    const doorFrame = makeBox(1.16, 2.16, 0.05, materials.darkStone, 0, 1.1, -2.0);
    const roofA = makeBox(5.45, 0.34, 2.64, materials.cityRoof, 0, 3.2, -0.8);
    const roofB = makeBox(5.45, 0.34, 2.64, materials.cityRoof, 0, 3.2, 0.8);
    roofA.rotation.x = -0.52;
    roofB.rotation.x = 0.52;
    // Filled gable ends + ridge beam so the roof reads as a solid pitched form.
    const gableFront = makeGable(4.6, 1.05, 0.24, wall, 0, 2.6, -1.92);
    const gableBack = makeGable(4.6, 1.05, 0.24, wall, 0, 2.6, 1.92);
    const ridge = makeBox(5.2, 0.18, 0.2, materials.darkStone, 0, 3.56, 0);
    // Capped chimney off the back slope.
    const chimney = makeBox(0.52, 1.5, 0.52, variant % 2 ? materials.cityWall : materials.stone, 1.45, 3.35, 1.15);
    const chimneyCap = makeBox(0.68, 0.2, 0.68, materials.darkStone, 1.45, 4.18, 1.15);
    const sign = makeBox(1.0, 0.32, 0.08, variant % 2 ? materials.gold : materials.blue, 0, 1.55, -2.07);
    const signArm = makeBox(0.06, 0.06, 0.5, materials.wood, 0, 1.92, -2.16);
    const windowA = makeBox(0.54, 0.42, 0.06, materials.stainedGlass.clone(), -1.28, 1.58, -2.06);
    const windowB = makeBox(0.54, 0.42, 0.06, materials.stainedGlass.clone(), 1.28, 1.58, -2.06);
    const windowFrameA = makeBox(0.72, 0.6, 0.05, materials.wood, -1.28, 1.58, -2.02);
    const windowFrameB = makeBox(0.72, 0.6, 0.05, materials.wood, 1.28, 1.58, -2.02);
    house.add(floor, back, left, right, frontLeft, frontRight, door, doorFrame, roofA, roofB,
      gableFront, gableBack, ridge, chimney, chimneyCap, sign, signArm,
      windowFrameA, windowA, windowFrameB, windowB);
    group.add(house);
    addExplorationCollider(x, z, scale * 3.05, "structure");
    return house;
  }

  function addCityCastle(group, x, z) {
    const castle = new THREE.Group();
    setExplorationLocalGroundPosition(castle, x, z);
    const keepW = 7.2;
    const keepD = 6.2;
    const keepH = 6.75;
    const keepZ = 0.6;
    const base = makeBox(14, 0.22, 10.5, materials.darkStone, 0, 0.11, 0);
    const plinth = makeBox(keepW + 0.7, 0.95, keepD + 0.7, materials.cityWall, 0, 0.68, keepZ);
    const keep = makeBox(keepW, keepH, keepD, materials.cityWall, 0, keepH / 2 + 0.25, keepZ);
    castle.add(base, plinth, keep);

    // Battlements around the keep roofline (front/back rows + rotated side rows).
    const topY = keepH + 0.25;
    const merlon = { height: 0.62, depth: 0.24, merlonW: 0.6, gap: 0.5, material: materials.cityWall };
    addMerlonRow(castle, keepW, { ...merlon, y: topY, z: keepZ + keepD / 2 - 0.18 });
    addMerlonRow(castle, keepW, { ...merlon, y: topY, z: keepZ - keepD / 2 + 0.18 });
    for (const sx of [-1, 1]) {
      const row = new THREE.Group();
      row.position.set(sx * (keepW / 2 - 0.18), 0, keepZ);
      row.rotation.y = Math.PI / 2;
      addMerlonRow(row, keepD, { ...merlon, y: topY });
      castle.add(row);
    }
    // Corner buttresses give the keep mass and shadow.
    for (const bx of [-1, 1]) {
      for (const bz of [-1, 1]) {
        castle.add(makeBox(0.72, keepH * 0.82, 0.72, materials.cityWall, bx * (keepW / 2), keepH * 0.41 + 0.25, keepZ + bz * (keepD / 2)));
      }
    }

    // Round corner towers with corbelled, crenellated heads and conical caps.
    const towerPositions = [[-4.6, -3.4], [4.6, -3.4], [-4.6, 4.4], [4.6, 4.4]];
    const towerH = 7.7;
    for (const [tx, tz] of towerPositions) {
      castle.add(makeCylinder(0.95, 1.14, towerH, 16, materials.cityWall, tx, towerH / 2, tz));
      castle.add(makeCylinder(1.16, 1.0, 0.3, 16, materials.cityWall, tx, towerH + 0.15, tz));
      const ring = new THREE.Group();
      ring.position.set(tx, 0, tz);
      addCrenelRing(ring, 1.04, { y: towerH + 0.3, count: 8, merlonW: 0.42, height: 0.44, depth: 0.24 });
      castle.add(ring);
      castle.add(makeCone(1.34, 1.95, 16, materials.cityRoof, tx, towerH + 0.3 + 0.975, tz));
      castle.add(makeSphere(0.12, materials.gold, tx, towerH + 0.3 + 1.95 + 0.1, tz));
    }

    // Arched entrance on the front face with timber doors and a portcullis hint.
    const gateZ = keepZ - keepD / 2 - 0.05;
    castle.add(makeBox(2.1, 2.8, 0.3, materials.darkStone, 0, 1.4, gateZ));
    castle.add(makeBox(2.4, 0.32, 0.22, materials.darkStone, 0, 2.62, gateZ - 0.02));
    for (const side of [-1, 1]) {
      const shoulder = makeBox(0.46, 0.46, 0.18, materials.cityWall, side * 0.78, 2.5, gateZ - 0.02);
      shoulder.rotation.z = side * 0.62;
      castle.add(shoulder);
    }
    castle.add(makeBox(0.8, 2.2, 0.12, materials.wood, -0.42, 1.1, gateZ - 0.12));
    castle.add(makeBox(0.8, 2.2, 0.12, materials.wood, 0.42, 1.1, gateZ - 0.12));
    for (let i = 0; i < 3; i += 1) {
      castle.add(makeBox(0.08, 2.0, 0.06, materials.iron, -0.5 + i * 0.5, 1.0, gateZ - 0.2));
    }

    // Banners flank the gate.
    castle.add(makeBox(0.1, 1.7, 0.9, materials.cityBannerRed, -1.7, 4.5, gateZ + 0.1));
    castle.add(makeBox(0.1, 1.7, 0.9, materials.blue, 1.7, 4.5, gateZ + 0.1));

    group.add(castle);
    addExplorationCollider(x, z, 6.15, "structure");
    addExplorationCollider(x - 4.6, z - 3.4, 1.45, "structure");
    addExplorationCollider(x + 4.6, z - 3.4, 1.45, "structure");
    addExplorationCollider(x - 4.6, z + 4.4, 1.45, "structure");
    addExplorationCollider(x + 4.6, z + 4.4, 1.45, "structure");
    return castle;
  }

  function addCityChurch(group, x, z) {
    const church = new THREE.Group();
    setExplorationLocalGroundPosition(church, x, z);
    const nave = makeBox(7.2, 3.25, 11.2, materials.cityWall, 0, 1.72, 0);
    const apse = makeCylinder(1.8, 2.0, 3.3, 18, materials.cityWall, 0, 1.7, 6.1);
    apse.rotation.x = Math.PI / 2;
    const apseRoof = makeCone(2.25, 1.7, 18, materials.cityRoof, 0, 3.45, 6.1);
    const roofA = makeBox(4.55, 0.44, 12.3, materials.cityRoof, -1.95, 3.88, 0);
    const roofB = makeBox(4.55, 0.44, 12.3, materials.cityRoof, 1.95, 3.88, 0);
    roofA.rotation.z = 0.52;
    roofB.rotation.z = -0.52;
    const ridge = makeBox(0.34, 0.34, 12.4, materials.darkStone, 0, 5.18, 0);
    church.add(nave, apse, apseRoof, roofA, roofB, ridge);

    // Stepped buttresses and tall lancet windows down each nave wall.
    for (const side of [-1, 1]) {
      for (const bz of [-3.6, 0, 3.6]) {
        church.add(makeBox(0.5, 2.8, 0.7, materials.cityWall, side * 3.7, 1.4, bz));
        const cap = makeBox(0.5, 0.55, 0.95, materials.cityWall, side * 3.75, 2.75, bz);
        cap.rotation.x = side * 0;
        church.add(cap);
        const lancet = makeBox(0.06, 1.5, 0.42, materials.stainedGlass.clone(), side * 3.63, 2.0, bz + 1.8);
        church.add(lancet);
      }
    }

    // Bell tower: battlemented head with corner pinnacles under the spire.
    const tower = makeBox(3.0, 6.5, 3.0, materials.cityWall, 0, 3.28, -5.55);
    church.add(tower);
    const towerTop = 6.53;
    addMerlonRow(church, 3.0, { y: towerTop, z: -5.55 + 1.5 - 0.16, height: 0.5, depth: 0.2, merlonW: 0.42, gap: 0.34 });
    addMerlonRow(church, 3.0, { y: towerTop, z: -5.55 - 1.5 + 0.16, height: 0.5, depth: 0.2, merlonW: 0.42, gap: 0.34 });
    for (const sx of [-1, 1]) {
      const row = new THREE.Group();
      row.position.set(sx * (1.5 - 0.16), 0, -5.55);
      row.rotation.y = Math.PI / 2;
      addMerlonRow(row, 3.0, { y: towerTop, height: 0.5, depth: 0.2, merlonW: 0.42, gap: 0.34 });
      church.add(row);
      for (const sz of [-1, 1]) {
        church.add(makeCone(0.34, 1.0, 8, materials.cityRoof, sx * 1.5, towerTop + 0.5, -5.55 + sz * 1.5));
      }
    }
    const spire = makeCone(1.55, 4.2, 24, materials.cityRoof, 0, towerTop + 0.5 + 2.1, -5.55);
    const louvre = makeBox(1.1, 1.3, 0.1, materials.darkStone, 0, 5.4, -7.06);
    const door = makeBox(1.08, 1.88, 0.08, materials.wood, 0, 0.99, -7.1);
    const doorArch = makeCylinder(0.62, 0.62, 0.1, 12, materials.darkStone, 0, 1.95, -7.1);
    doorArch.rotation.x = Math.PI / 2;
    const glass = makeBox(0.74, 1.2, 0.08, materials.stainedGlass.clone(), 0, 3.72, -7.12);
    const crossV = makeBox(0.16, 1.22, 0.14, materials.gold, 0, towerTop + 0.5 + 4.2 + 0.6, -5.55);
    const crossH = makeBox(0.82, 0.14, 0.14, materials.gold, 0, towerTop + 0.5 + 4.2 + 0.76, -5.55);
    church.add(spire, louvre, door, doorArch, glass, crossV, crossH);
    group.add(church);
    addExplorationCollider(x, z, 4.9, "structure");
    addExplorationCollider(x, z - 5.55, 2.15, "structure");
    return church;
  }

  function addWayfinderBeacon(group, x, z, random) {
    // All plaza pieces conform to the terrain height instead of assuming
    // ground level 0, so the cobble and carved stones sit on the rendered
    // terrain at the (randomized, possibly elevated) city center.
    const baseY = explorationGroundLocalY(x, z);
    const plaza = makeBox(24, 0.075, 24, materials.darkStone, x, baseY + 0.04, z);
    const crossA = makeBox(34, 0.06, 5.2, materials.cityWall, x, baseY + 0.08, z);
    const crossB = makeBox(5.2, 0.06, 34, materials.cityWall, x, baseY + 0.085, z);
    group.add(plaza, crossA, crossB);

    const dais = makeCylinder(4.8, 5.6, 0.62, 8, materials.cityWall, x, baseY + 0.34, z);
    dais.rotation.y = Math.PI / 8;
    const upper = makeCylinder(2.25, 2.85, 0.45, 8, materials.darkStone, x, baseY + 0.88, z);
    upper.rotation.y = Math.PI / 8;
    const shaft = makeCylinder(0.34, 0.68, 5.7, 6, materials.stone, x, baseY + 3.85, z);
    shaft.rotation.y = Math.PI / 6;
    const cap = makeCone(0.76, 1.35, 6, materials.cityRoof, x, baseY + 7.42, z);
    cap.rotation.y = Math.PI / 6;
    const glowMaterial = materials.questGlow.clone();
    glowMaterial.opacity = 0.68;
    const beacon = makeSphere(0.48, glowMaterial, x, baseY + 6.95, z);
    const light = new THREE.PointLight(0x9fffd1, 1.45, 18, 1.8);
    light.position.set(x, baseY + 6.95, z);
    group.add(dais, upper, shaft, cap, beacon, light);
    addExplorationCollider(x, z, 5.25, "structure");

    const waystoneOffsets = [
      [0, -9.3, 0],
      [9.3, 0, Math.PI / 2],
      [0, 9.3, Math.PI],
      [-9.3, 0, -Math.PI / 2]
    ];
    for (const [dx, dz, rotation] of waystoneOffsets) {
      const stoneY = explorationGroundLocalY(x + dx, z + dz);
      const stone = makeCylinder(0.28, 0.46, 2.25, 5, materials.cityWall, x + dx, stoneY + 1.18, z + dz);
      stone.rotation.y = rotation + Math.PI / 5;
      const rune = makeBox(0.09, 0.82, 0.055, materials.stainedGlass.clone(), 0, 0.25, -0.35);
      rune.material.opacity = 0.86;
      stone.add(rune);
      const foot = makeCylinder(0.74, 0.86, 0.25, 5, materials.darkStone, x + dx, stoneY + 0.16, z + dz);
      foot.rotation.y = rotation;
      group.add(stone, foot);
      addExplorationCollider(x + dx, z + dz, 0.92, "structure");
    }

    // Map table lives on the east flank of the plaza: its old spot at
    // (x, z - 5.9) with a fat collider blocked the path to the north
    // waystone's quest pickup.
    const tableX = x + 5.8;
    const tableZ = z - 3.8;
    const tableY = explorationGroundLocalY(tableX, tableZ);
    const mapTable = makeBox(5.2, 0.24, 2.35, materials.paleWood, tableX, tableY + 1.08, tableZ);
    const mapTop = makeBox(4.7, 0.035, 1.8, materials.stainedGlass.clone(), tableX, tableY + 1.23, tableZ);
    mapTop.material.opacity = 0.5;
    const tableLegs = [
      [-2.15, -0.82],
      [2.15, -0.82],
      [-2.15, 0.82],
      [2.15, 0.82]
    ].map(([lx, lz]) => makeBox(0.18, 1.0, 0.18, materials.wood, tableX + lx, tableY + 0.57, tableZ + lz));
    group.add(mapTable, mapTop, ...tableLegs);
    addExplorationCollider(tableX, tableZ, 1.35, "structure");

    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TAU + random() * 0.18;
      addExplorationRock(group, x + Math.cos(angle) * (16.8 + random() * 1.4), z + Math.sin(angle) * (16.8 + random() * 1.4), random);
    }
  }

  function addCityQuestItems(group, city, random) {
    const sigilPositions = [
      [city.localX, city.localZ - 7.6],
      [city.localX + 7.6, city.localZ],
      [city.localX, city.localZ + 7.6],
      [city.localX - 7.6, city.localZ]
    ];
    for (const [x, z] of sigilPositions) {
      createQuestItem(group, "cityWrits", x, z, random, {
        color: 0xf7df9a,
        stemMaterial: materials.stone,
        radius: 0.105,
        // Sit above the beacon plaza cobble (~ground + 0.0775) instead of
        // inside it.
        groundOffset: 0.22
      });
    }
    const lampPositions = [
      [city.localX + 24.5, city.localZ - 7.0],
      [city.localX + 29.5, city.localZ - 1.0],
      [city.localX + 22.5, city.localZ + 4.8]
    ];
    for (const [x, z] of lampPositions) {
      createQuestItem(group, "citySanctuary", x, z, random, {
        color: 0x7ae8ff,
        stemMaterial: materials.gold,
        radius: 0.095
      });
    }
  }

  function addCrownfordCity(group, x, z, random) {
    // No runtime flat zone here: the terrain mesh is baked before this runs,
    // so registering one only desyncs ground queries from the rendered
    // terrain (props float). The preset landmark zone at (12, 132) r53 in
    // setupExplorationFlatZones already flattens the whole city footprint.
    const city = {
      id: "crownford",
      name: "Crownford",
      x: game.exploration.origin.x + x,
      z: game.exploration.origin.z + z,
      localX: x,
      localZ: z,
      roadAnchor: { x, z: z - 44 },
      radius: 37,
      biome: "city"
    };
    game.exploration.city = city;
    game.exploration.villages.push(city);

    addCityPavement(group, x, z, 44, 44);
    addCityPavement(group, x, z - 28, 5, 32);
    addCityPavement(group, x - 28, z, 28, 4.2, Math.PI / 2);
    addCityPavement(group, x + 28, z, 28, 4.2, Math.PI / 2);

    const wallSegments = [
      [-22, -37, 30, 0.7],
      [22, -37, 30, 0.7],
      [-22, 37, 30, 0.7],
      [22, 37, 30, 0.7],
      [-37, -22, 0.7, 30],
      [-37, 22, 0.7, 30],
      [37, -22, 0.7, 30],
      [37, 22, 0.7, 30]
    ];
    for (const [wx, wz, ww, wd] of wallSegments) {
      addCurtainWall(group, x + wx, z + wz, ww, wd, { height: 3.1 });
    }
    // South gatehouse straddles the road; short stubs close the gap to the wall.
    addGatehouse(group, x, z - 37, { span: 5.4, height: 3.1, banner: materials.cityBannerRed });
    addCurtainWall(group, x - 5.7, z - 37, 2.7, 0.7, { height: 3.1 });
    addCurtainWall(group, x + 5.7, z - 37, 2.7, 0.7, { height: 3.1 });
    // Corner towers: conical caps, gold finials, alternating banners.
    const cornerBanners = [materials.cityBannerRed, materials.blue, materials.blue, materials.cityBannerRed];
    for (let i = 0; i < 4; i += 1) {
      const sx = i % 2 ? 37 : -37;
      const sz = i > 1 ? 37 : -37;
      addWallTower(group, x + sx, z + sz, {
        radius: 1.1, height: 4.6, coneHeight: 1.9, finial: true, banner: cornerBanners[i], colliderPad: 0.5
      });
    }

    addWayfinderBeacon(group, x, z, random);
    addCityCastle(group, x - 25, z + 18);
    addCityChurch(group, x + 25, z - 3);

    const houseData = [
      [-25, -20, 1.04, 0, 0.2],
      [-13, -25, 1.0, 1, -0.16],
      [13, -24, 1.02, 2, 0.12],
      [25, 20, 1.04, 3, Math.PI],
      [10, 26, 0.98, 4, Math.PI + 0.2],
      [-9, 28, 1.02, 5, Math.PI - 0.18]
    ];
    for (const [hx, hz, scale, variant, rotation] of houseData) {
      addCityHouse(group, x + hx, z + hz, scale, variant, rotation);
    }

    addCityQuestItems(group, city, random);
    addCrownfordDecor(group, city, random);

    game.npcs.push(createFriendlyNpc(game.exploration.origin.x + x - 9, game.exploration.origin.z + z - 12, random, 9.5, "Marshal Rowan Vale", "cityWrits", "city"));
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x + x + 25, game.exploration.origin.z + z - 10, random, 8.5, "Sister Edda", "citySanctuary", "city"));
    const mason = createFriendlyNpc(game.exploration.origin.x + x - 23, game.exploration.origin.z + z + 8, random, 9.5, "Mason Vale", null, "city");
    mason.serviceType = "dungeon";
    mason.dungeonId = BELLWATER_DUNGEON_ID;
    game.npcs.push(mason);
  }

  function addCrownringCity(group, x, z, random) {
    // Same as Crownford: the preset landmark zone at (158, 48) r46 covers
    // this city; a post-bake runtime zone would desync queries from the mesh.
    const city = {
      id: "crownring",
      name: "Crownring",
      x: game.exploration.origin.x + x,
      z: game.exploration.origin.z + z,
      localX: x,
      localZ: z,
      roadAnchor: { x: x - 34, z: z - 18 },
      infirmaryLocal: { x: x - 19, z: z + 12 },
      radius: 31,
      biome: "city"
    };
    game.exploration.arenaCity = city;
    game.exploration.villages.push(city);

    addCityPavement(group, x, z, 52, 38);
    addCityPavement(group, x - 34, z - 18, 19, 4.5, -0.08);

    const wallSegments = [
      [-16, -24, 25, 0.72],
      [16, -24, 25, 0.72],
      [-16, 24, 25, 0.72],
      [16, 24, 25, 0.72],
      [-29, -9, 0.72, 24],
      [-29, 13, 0.72, 18],
      [29, -9, 0.72, 24],
      [29, 13, 0.72, 18]
    ];
    for (const [wx, wz, ww, wd] of wallSegments) {
      addCurtainWall(group, x + wx, z + wz, ww, wd, { height: 2.86 });
    }
    for (const [tx, tz] of [[-29, -24], [29, -24], [-29, 24], [29, 24]]) {
      addWallTower(group, x + tx, z + tz, {
        radius: 0.95, height: 4.05, coneHeight: 1.55, colliderPad: 0.4,
        banner: tx < 0 ? materials.cityBannerRed : materials.blue
      });
    }

    // Court pieces conform to terrain height like the pavement above, so
    // they stay stacked on the cobble instead of sinking when the city sits
    // on elevated ground.
    const courtY = explorationGroundLocalY(x, z);
    const court = makeCylinder(8.6, 8.9, 0.14, 32, materials.darkStone, x, courtY + 0.11, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.35, 0.24, 8, 56), materials.cityWall);
    ring.position.set(x, courtY + 0.32, z);
    ring.rotation.x = Math.PI / 2;
    addShadow(ring);
    const sand = makeCylinder(6.85, 6.95, 0.055, 32, materials.sand, x, courtY + 0.2, z);
    group.add(court, ring, sand);
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * TAU;
      const px = x + Math.cos(angle) * 9.8;
      const pz = z + Math.sin(angle) * 9.8;
      const post = makeCylinder(0.07, 0.1, 1.15, 7, materials.wood, px, explorationGroundLocalY(px, pz, 0.68), pz);
      const pennant = makeBox(0.08, 0.72, 0.42, i % 2 ? materials.cityBannerRed : materials.blue, 0, 0.28, -0.22);
      pennant.rotation.y = angle;
      post.add(pennant);
      group.add(post);
    }
    const stands = [
      [0, -13.4, 16, 2.6],
      [0, 13.4, 16, 2.6],
      [-13.2, 0, 2.6, 14],
      [13.2, 0, 2.6, 14]
    ];
    for (const [sx, sz, sw, sd] of stands) {
      const standY = explorationGroundLocalY(x + sx, z + sz);
      const bench = makeBox(sw, 0.74, sd, materials.wood, x + sx, standY + 0.54, z + sz);
      const base = makeBox(sw + 0.6, 0.22, sd + 0.5, materials.darkStone, x + sx, standY + 0.18, z + sz);
      group.add(base, bench);
      addExplorationLineColliders(x + sx, z + sz, sw, sd, "structure");
    }

    addCityHouse(group, x - 19, z + 12, 1.0, 8, -Math.PI / 2);
    addCityHouse(group, x + 20, z + 12, 1.02, 9, Math.PI / 2);
    addStable(group, x - 20, z - 11);
    addBannerPole(group, x - 24, z - 20, 0.16, 0.92);
    addBannerPole(group, x + 24, z - 20, -0.16, 0.92);
    addLanternPost(group, x - 10, z - 18, 0.2, 0.82);
    addLanternPost(group, x + 10, z - 18, -0.2, 0.82);
    addCart(group, x + 21, z - 8, -0.35, 0.86);
    addCrateStack(group, x + 23, z - 4, 0.2, 0.78);
    addBarrel(group, x - 22, z - 4, -0.2, 0.82);
    addBucket(group, x - 17, z + 7, 0.4, 0.82);

    const steward = createFriendlyNpc(game.exploration.origin.x + x - 3.4, game.exploration.origin.z + z - 11.6, random, 8.5, "Steward Bryn", "crownringTrial", "city");
    steward.serviceType = "crownring";
    steward.questMarker.visible = true;
    steward.questMarker.material.color.setHex(0xffd889);
    game.npcs.push(steward);
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x + x - 19, game.exploration.origin.z + z + 8.5, random, 7.5, "Physicker Maud", null, "city"));
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x + x - 16.4, game.exploration.origin.z + z - 7.2, random, 7.5, "Quartermaster Pell", ROADWARDEN_TACK_QUEST_ID, "city"));
  }

  function isExplorationBlocked(localX, localZ) {
    if (Math.hypot(localX, localZ) < 11) {
      return true;
    }
    for (const lake of game.exploration.lakes) {
      const lx = localX - (lake.x - game.exploration.origin.x);
      const lz = localZ - (lake.z - game.exploration.origin.z);
      if ((lx * lx) / ((lake.rx + 3.2) * (lake.rx + 3.2)) + (lz * lz) / ((lake.rz + 3.2) * (lake.rz + 3.2)) < 1) {
        return true;
      }
    }
    for (const village of game.exploration.villages) {
      if (Math.hypot(game.exploration.origin.x + localX - village.x, game.exploration.origin.z + localZ - village.z) < village.radius + 4) {
        return true;
      }
    }
    for (const road of game.exploration.roads) {
      if (distanceToRoadSegment(localX, localZ, road) < road.width * 0.55 + 1.4) {
        return true;
      }
    }
    const worldX = game.exploration.origin.x + localX;
    const worldZ = game.exploration.origin.z + localZ;
    for (const collider of explorationCollidersNear(worldX, worldZ, 5.2)) {
      const spacing = collider.kind === "tree" ? 0.95 : collider.kind === "rock" ? 1.25 : collider.kind === "decor" ? 0.85 : 2.1;
      if (Math.hypot(worldX - collider.x, worldZ - collider.z) < collider.radius + spacing) {
        return true;
      }
    }
    // Quest pickups don't register colliders, so keep later scatter (trees,
    // rocks) from burying them.
    for (const item of game.questItems) {
      if (Math.hypot(worldX - item.position.x, worldZ - item.position.z) < item.pickupRadius + 1.0) {
        return true;
      }
    }
    return false;
  }

  // Enemy seed points keep ~3x the generic road clearance (~8-10m from the
  // centerlines) so roads aren't lined with ambushes. Patrols may still wander
  // close — only the seed/home point is pushed out.
  function isEnemySeedNearRoad(localX, localZ) {
    for (const road of game.exploration.roads) {
      if (distanceToRoadSegment(localX, localZ, road) < (road.width * 0.55 + 1.4) * 3) {
        return true;
      }
    }
    return false;
  }

  function randomExplorationPoint(random, minRadius, maxRadius, filter = null) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const angle = random() * TAU;
      const radius = minRadius + random() * (maxRadius - minRadius);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (!isExplorationBlocked(x, z) && (!filter || filter(x, z))) {
        return { x, z };
      }
    }
    return { x: minRadius, z: minRadius };
  }

  function setupExplorationBiomes(group, random, seed) {
    const mountain = {
      id: "mountain",
      name: "Dragonspine Peaks",
      x: 198 + random() * 9,
      z: 158 + random() * 9,
      rx: 128,
      rz: 106,
      rotation: -0.26
    };
    const desert = {
      id: "desert",
      name: "Amber Dunes",
      x: -208 - random() * 10,
      z: -158 - random() * 10,
      rx: 132,
      rz: 110,
      rotation: 0.36
    };
    const swamp = {
      id: "swamp",
      name: "Mistfen",
      x: -218 - random() * 10,
      z: 168 + random() * 10,
      rx: 116,
      rz: 96,
      rotation: -0.44
    };
    const briar = {
      id: "briar",
      name: "Briarfall Woods",
      x: 224 + random() * 10,
      z: -118 - random() * 10,
      rx: 112,
      rz: 92,
      rotation: -0.18
    };
    game.exploration.biomes.push(mountain, desert, swamp, briar);
    setupExplorationFlatZones();
    addBiomePatch(group, desert, seed);
    addBiomePatch(group, mountain, seed);
    addBiomePatch(group, swamp, seed);
    addBiomePatch(group, briar, seed);
  }

  // Exploration enemies get tougher the further they roam from the homestead
  // spawn: tier 1 near home, tier 2 (veteran) mid-map, tier 3 (dread) at the rim.
  function applyEnemyTier(enemy, world) {
    const radius = Math.max(1, game.exploration.radius);
    const distance = Math.hypot(world.x - game.exploration.origin.x, world.z - game.exploration.origin.z);
    const danger = distance / radius;
    if (danger < 0.25) {
      enemy.tier = 1;
      return;
    }
    const dread = danger >= 0.5;
    enemy.tier = dread ? 3 : 2;
    enemy.health = Math.round(enemy.health * (dread ? 2.1 : 1.45));
    enemy.maxHealth = enemy.health;
    enemy.speed *= dread ? 1.22 : 1.12;
    enemy.damageMul = (enemy.damageMul || 1) * (dread ? 1.85 : 1.4);
    enemy.xpMul = dread ? 2.4 : 1.6;
    enemy.tierScale = dread ? 1.16 : 1.08;
    enemy.radius *= enemy.tierScale;
    applyEnemyTierVisual(enemy);
  }

  function applyEnemyTierVisual(enemy) {
    if (!enemy.tier || enemy.tier < 2) {
      return;
    }
    enemy.tierVisualApplied = true;
    const dread = enemy.tier === 3;
    enemy.tierScale = dread ? 1.16 : 1.08;
    if (enemy.group) {
      enemy.group.scale.setScalar((enemy.scale || 1) * enemy.tierScale);
    }
    if (enemy.hpFill && enemy.hpFill.material) {
      enemy.hpFill.material.color.setHex(dread ? 0xff705c : 0xffd166);
    }
  }

  function seedExplorationEnemy(enemy, world, random, awareness, homeRadius = 9) {
    enemy.exploration = true;
    world.y = explorationGroundWorldY(world.x, world.z);
    enemy.position.y = world.y;
    enemy.group.position.y = enemy.type === "dragon" ? world.y + numberOrZero(enemy.hoverHeight) : world.y;
    enemy.home = world.clone();
    enemy.homeRadius = homeRadius;
    enemy.awareness = awareness;
    enemy.patrolTarget = world.clone();
    enemy.state = "patrol";
    enemy.cooldown = 0.8 + random() * 1.8;
    // Wilds Director registry: each original (build-time) seed call records
    // its point so the director can refill it after the enemy dies. Captured
    // before applyEnemyTier so baseHealth/baseSpeed are the pre-tier values
    // (they already include factory wave rolls and per-seed mods like the
    // 0.82x barbarian health). Respawned enemies arrive here with a
    // wildsSeedId already set and are not re-registered. Arena enemies never
    // pass through this function, so the registry stays exploration-only.
    if (enemy.wildsSeedId == null) {
      const wilds = game.exploration.wilds;
      enemy.wildsSeedId = wilds.seedPoints.length;
      wilds.seedPoints.push({
        id: enemy.wildsSeedId,
        type: enemy.type,
        x: world.x,
        z: world.z,
        awareness,
        homeRadius,
        baseHealth: enemy.maxHealth,
        baseSpeed: enemy.speed,
        hoverHeight: numberOrZero(enemy.hoverHeight),
        desiredRange: numberOrZero(enemy.desiredRange),
        respawnAt: 0,     // 0 = occupied; >0 = empty, refill at this clock.elapsedTime
        clearedBonus: 0   // cleared-zone pushback already applied (capped)
      });
    }
    applyEnemyTier(enemy, world);
    game.enemies.push(enemy);
    return enemy;
  }

  function addMountainRoost(group, biome, random) {
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU + random() * 0.35;
      const radius = 16 + random() * 34;
      const x = biome.x + Math.cos(angle) * radius;
      const z = biome.z + Math.sin(angle) * radius;
      const height = 4.8 + random() * 5.8;
      const spire = makeCone(1.4 + random() * 1.6, height, 7, materials.darkStone, x, explorationGroundLocalY(x, z, height / 2), z);
      spire.rotation.y = random() * TAU;
      spire.scale.x *= 0.7 + random() * 0.45;
      group.add(spire);
      addExplorationCollider(x, z, 1.15, "rock");
    }
    const nest = new THREE.Group();
    setExplorationLocalGroundPosition(nest, biome.x + 8, biome.z - 6, 0.24);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.16, 8, 32), materials.darkStone);
    ring.rotation.x = Math.PI / 2;
    const ember = makeSphere(0.22, materials.fireCore.clone(), 0, 0.34, 0);
    ember.material.opacity = 0.7;
    nest.add(ring, ember);
    group.add(nest);
    addExplorationCollider(biome.x + 8, biome.z - 6, 4.2, "structure");

    // Roost-keeper and her cold clutch: the Skyhatched Brood quest. Eggs sit
    // in wind shadows around the nest, outside the structure colliders.
    game.npcs.push(createFriendlyNpc(
      game.exploration.origin.x + biome.x + 14.5,
      game.exploration.origin.z + biome.z - 1.5,
      random,
      6.5,
      "Brunna",
      "skyDrake",
      "mountain"
    ));
    const eggSpots = [
      [biome.x + 2, biome.z - 13.5],
      [biome.x + 11, biome.z - 9],
      [biome.x + 9, biome.z + 5]
    ];
    for (const [ex, ez] of eggSpots) {
      createQuestItem(group, "skyDrake", ex + (random() - 0.5) * 2.0, ez + (random() - 0.5) * 2.0, random, {
        color: 0x7ad9c9,
        stemMaterial: materials.bone,
        radius: 0.13,
        groundOffset: 0.16
      });
    }
  }

  function addDesertMarkers(group, biome, random) {
    for (let i = 0; i < 7; i += 1) {
      const point = randomPointInBiome(random, "desert", 12);
      const ribA = makeCylinder(0.035, 0.055, 1.3 + random() * 0.7, 7, materials.bone, point.x, 0.55, point.z);
      const ribB = makeCylinder(0.035, 0.055, 1.0 + random() * 0.5, 7, materials.bone, point.x + 0.35, 0.45, point.z + 0.12);
      ribA.rotation.z = 0.65;
      ribB.rotation.z = -0.65;
      group.add(ribA, ribB);
    }
    const oasis = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.045, 42), materials.water.clone());
    setExplorationLocalGroundPosition(oasis, biome.x - 22, biome.z + 18, LAKE_SURFACE_LIFT);
    oasis.scale.set(6.5, 1, 3.4);
    oasis.renderOrder = LAKE_SURFACE_RENDER_ORDER;
    oasis.receiveShadow = true;
    group.add(oasis);
    game.exploration.lakes.push({
      x: game.exploration.origin.x + oasis.position.x,
      z: game.exploration.origin.z + oasis.position.z,
      rx: 6.5,
      rz: 3.4
    });
  }

  function addSwampMarkers(group, biome, random) {
    if (!biome) {
      return;
    }
    // Stilted plank boardwalk. Every piece samples the current terrain
    // sampler: deck segments pitch to follow the ground line, posts run from
    // the deck underside down past the sampled ground (so they still reach
    // the visible floor where late-registered flat zones shift the sampler),
    // and end ramps grade the walkway flush into the bog. Heights were
    // previously hardcoded for the old, flatter swamp and broke when the
    // terrain was made more rugged.
    const walkYaw = -0.34;
    const walkDirX = Math.cos(walkYaw);
    const walkDirZ = -Math.sin(walkYaw);
    const walkX = biome.x - 4;
    const walkZ = biome.z + 3;
    const walkHalfLength = 9.5;
    const walkGroundAt = (along) => explorationGroundLocalY(walkX + walkDirX * along, walkZ + walkDirZ * along);
    const deckSegments = 7;
    const segmentLength = (walkHalfLength * 2) / deckSegments;
    for (let i = 0; i < deckSegments; i += 1) {
      const along = -walkHalfLength + (i + 0.5) * segmentLength;
      const nearY = walkGroundAt(along - segmentLength * 0.5);
      const farY = walkGroundAt(along + segmentLength * 0.5);
      const deck = makeBox(segmentLength + 0.1, 0.12, 1.15, materials.swampPlank, walkX + walkDirX * along, (nearY + farY) / 2 + 0.18, walkZ + walkDirZ * along);
      deck.rotation.y = walkYaw;
      deck.rotation.z = Math.atan2(farY - nearY, segmentLength);
      group.add(deck);
    }
    for (let i = 0; i < 7; i += 1) {
      const offset = -8.4 + i * 2.8;
      const deckY = walkGroundAt(offset) + 0.18;
      for (const side of [-1, 1]) {
        const postX = walkX + walkDirX * offset - walkDirZ * side * 0.62;
        const postZ = walkZ + walkDirZ * offset + walkDirX * side * 0.62;
        const postTop = deckY - 0.05;
        const postBottom = explorationGroundLocalY(postX, postZ) - 1.4;
        const post = makeCylinder(0.055, 0.08, postTop - postBottom, 6, materials.wood, postX, (postTop + postBottom) / 2, postZ);
        group.add(post);
      }
    }
    const rampLength = 1.7;
    for (const end of [-1, 1]) {
      const deckTopY = walkGroundAt(end * walkHalfLength) + 0.24;
      const rampEndY = walkGroundAt(end * (walkHalfLength + rampLength)) + 0.03;
      const ramp = makeBox(rampLength + 0.12, 0.1, 1.15, materials.swampPlank, walkX + walkDirX * end * (walkHalfLength + rampLength * 0.5), (deckTopY + rampEndY) / 2 - 0.05, walkZ + walkDirZ * end * (walkHalfLength + rampLength * 0.5));
      ramp.rotation.y = walkYaw;
      ramp.rotation.z = Math.atan2((rampEndY - deckTopY) * end, rampLength);
      group.add(ramp);
    }
    for (let i = 0; i < 5; i += 1) {
      const point = randomPointInBiome(random, "swamp", 10);
      addBogPool(group, point.x, point.z, 2.8 + random() * 3.0, 1.8 + random() * 2.0, random);
    }
    const shrine = new THREE.Group();
    setExplorationLocalGroundPosition(shrine, biome.x + 9, biome.z - 10);
    const base = makeBox(2.4, 0.18, 1.8, materials.swampPlank, 0, 0.18, 0);
    const lintel = makeBox(2.0, 0.16, 0.16, materials.reed, 0, 1.72, -0.08);
    const leftPost = makeCylinder(0.07, 0.1, 1.72, 8, materials.wood, -0.78, 0.92, -0.08);
    const rightPost = makeCylinder(0.07, 0.1, 1.72, 8, materials.wood, 0.78, 0.92, -0.08);
    const glow = makeSphere(0.16, materials.wispCore.clone(), 0, 1.1, -0.12);
    shrine.add(base, lintel, leftPost, rightPost, glow);
    shrine.rotation.y = 0.35;
    group.add(shrine);
    addExplorationCollider(biome.x + 9, biome.z - 10, 1.65, "structure");
  }

  function addBriarMarkers(group, biome, random) {
    if (!biome) {
      return;
    }
    const ring = new THREE.Group();
    setExplorationLocalGroundPosition(ring, biome.x + 12, biome.z - 10, 0.08);
    const rootRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.12, 8, 38), materials.rootwood);
    rootRing.rotation.x = Math.PI / 2;
    const standingStoneCount = 6;
    for (let i = 0; i < standingStoneCount; i += 1) {
      const angle = (i / standingStoneCount) * TAU + random() * 0.12;
      const stone = makeBox(0.46, 1.28 + random() * 0.38, 0.32, materials.stone, Math.cos(angle) * 2.75, 0.68, Math.sin(angle) * 2.75);
      stone.rotation.y = -angle + random() * 0.2;
      stone.rotation.z = (random() - 0.5) * 0.18;
      ring.add(stone);
    }
    const glow = makeSphere(0.18, materials.lampGlow.clone(), 0, 0.7, 0);
    ring.add(rootRing, glow);
    group.add(ring);
    addExplorationCollider(biome.x + 12, biome.z - 10, 3.2, "structure");
    addCharcoalClamp(group, biome.x - 30, biome.z + 18, 0.34, 1.2);
    for (let i = 0; i < 10; i += 1) {
      const point = randomPointInBiome(random, "briar", 12);
      if (random() > 0.46) {
        addBramblePatch(group, point.x, point.z, random, 0.9 + random() * 0.45);
      } else {
        addExplorationRock(group, point.x, point.z, random, false);
      }
    }
  }

  function setupExplorationWorld() {
    clearExplorationWorld();
    const seed = explorationSeed();
    const random = seededRandom(seed);
    game.exploration.seed = seed;
    game.exploration.spawn.copy(explorationToWorld(0, -6.8));

    const group = new THREE.Group();
    group.position.copy(game.exploration.origin);
    scene.add(group);
    game.explorationGroup = group;

    setupExplorationBiomes(group, random, seed);
    const mountainBiome = game.exploration.biomes.find(biome => biome.id === "mountain");
    const desertBiome = game.exploration.biomes.find(biome => biome.id === "desert");
    const swampBiome = game.exploration.biomes.find(biome => biome.id === "swamp");
    const briarBiome = game.exploration.biomes.find(biome => biome.id === "briar");

    const groundMaterial = materials.meadow.clone();
    groundMaterial.map = createExplorationTexture(seed);
    const groundGeometry = new THREE.PlaneGeometry(760, 760, 132, 132);
    const pos = groundGeometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, explorationTerrainHeight(x, -y, seed));
    }
    groundGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    setupExplorationQuests();
    applySavedExplorationProgress();
    game.exploration.xp = getCharacterProgress().xp;
    addExplorationHouse(group, 0, 0, 1.05, 0, "meadow");
    addStable(group, -7.1, -1.8);
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x + 7.0, game.exploration.origin.z - 4.4, random, 4.5, "Sella", "villages", "meadow"));
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x - 2.4, game.exploration.origin.z - 5.2, random, 4.5, "Mira", "herbs", "meadow"));
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x + 2.4, game.exploration.origin.z - 5.5, random, 4.5, "Torren", "raiders", "meadow"));
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x - 7.0, game.exploration.origin.z - 4.2, random, 4.5, "Rowan", "horse", "meadow"));

    addExplorationLake(group, 58 + random() * 10, 76 + random() * 9, 17, 10, random);
    addExplorationLake(group, -98 - random() * 10, -72 - random() * 9, 14, 9, random);
    addExplorationLake(group, 148 + random() * 12, -128 - random() * 10, 16, 8.5, random);
    addExplorationLake(group, -202 - random() * 12, 84 + random() * 10, 15, 9.5, random);
    addExplorationLake(group, 12 + random() * 12, -202 - random() * 10, 12, 7.5, random);
    addExplorationLake(group, 232 + random() * 12, 24 + random() * 10, 13, 7.4, random);
    addHerbQuestItems(group, random);
    addHorseQuestItems(group, random);

    addExplorationVillage(group, 118 + random() * 14, -86 - random() * 12, random, 0, "meadow");
    addExplorationVillage(group, -126 - random() * 14, 90 + random() * 12, random, 1, "meadow");
    addExplorationVillage(group, mountainBiome.x + 18 + random() * 8, mountainBiome.z - 24 - random() * 8, random, 2, "mountain");
    addExplorationVillage(group, desertBiome.x + 10 + random() * 8, desertBiome.z + 2 + random() * 8, random, 3, "desert");
    addExplorationVillage(group, swampBiome.x + 7 + random() * 5, swampBiome.z - 7 - random() * 5, random, 4, "swamp");
    addExplorationVillage(group, briarBiome.x - 8 + random() * 7, briarBiome.z + 8 + random() * 7, random, 5, "briar");
    addCrownfordCity(group, 12 + random() * 5, 132 + random() * 6, random);
    addCrownringCity(group, 158 + random() * 7, 48 + random() * 6, random);
    restoreSavedTownRespawnPoint();
    addRoadwardenTackWaymarks(group, random);
    syncVillageQuestProgress({ silent: true });
    addSwampQuestItems(group, swampBiome, random);

    for (let i = 0; i < 64; i += 1) {
      const angle = (i / 64) * TAU + (random() - 0.5) * 0.16;
      const radius = game.exploration.radius - 26 + random() * 44;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 7.5 + random() * 10;
      const mountain = makeCone(4.2 + random() * 5.6, height, 7 + Math.floor(random() * 3), materials.darkStone, x, explorationGroundLocalY(x, z, height / 2), z);
      mountain.rotation.y = random() * TAU;
      mountain.scale.x *= 0.82 + random() * 0.6;
      mountain.castShadow = false;
      group.add(mountain);
      addExplorationCollider(x, z, 4.2, "rock");
      if (i % 2 === 0) {
        addExplorationRock(group, Math.cos(angle) * (radius - 6), Math.sin(angle) * (radius - 6), random, true);
      }
    }
    addMountainRoost(group, mountainBiome, random);
    addDesertMarkers(group, desertBiome, random);
    addSwampMarkers(group, swampBiome, random);
    addBriarMarkers(group, briarBiome, random);
    addExplorationRoadNetwork(group);
    addBellwaterUnderworksPoi(group, random);
    addSiltwellCisternPoi(group, desertBiome, random);

    for (let i = 0; i < 260; i += 1) {
      const point = randomExplorationPoint(random, 16, game.exploration.radius - 28, (x, z) => biomeAt(x, z) === "meadow");
      addExplorationTree(group, point.x, point.z, random);
    }
    // Clustered meadow groves: thicken the woods in dense stands around
    // scattered centers instead of uniformly, so clearings stay open. Points
    // that land on roads, structures, or other trees are simply skipped.
    for (let g = 0; g < 16; g += 1) {
      const center = randomExplorationPoint(random, 26, game.exploration.radius - 40, (x, z) => biomeAt(x, z) === "meadow");
      const stand = 7 + Math.floor(random() * 6);
      for (let i = 0; i < stand; i += 1) {
        const angle = random() * TAU;
        const dist = 2.4 + Math.sqrt(random()) * 8.5;
        const tx = center.x + Math.cos(angle) * dist;
        const tz = center.z + Math.sin(angle) * dist;
        const rim = Math.hypot(tx, tz);
        if (rim < 16 || rim > game.exploration.radius - 28 || biomeAt(tx, tz) !== "meadow" || isExplorationBlocked(tx, tz)) {
          continue;
        }
        addExplorationTree(group, tx, tz, random);
      }
    }
    for (let i = 0; i < 168; i += 1) {
      const point = randomPointInBiome(random, "mountain", 5);
      if (random() > 0.32) {
        addMountainPine(group, point.x, point.z, random);
      } else {
        addExplorationRock(group, point.x, point.z, random, random() > 0.6);
      }
    }
    for (let i = 0; i < 132; i += 1) {
      const point = randomPointInBiome(random, "desert", 6);
      if (random() > 0.42) {
        addDesertCactus(group, point.x, point.z, random);
      } else {
        addDryBush(group, point.x, point.z, random);
      }
    }
    for (let i = 0; i < 136; i += 1) {
      const point = randomPointInBiome(random, "swamp", 6);
      if (random() > 0.5) {
        addSwampWillow(group, point.x, point.z, random);
      } else if (random() > 0.22) {
        addReeds(group, point.x, point.z, random);
      } else {
        addBogPool(group, point.x, point.z, 1.3 + random() * 1.6, 0.8 + random() * 1.1, random);
      }
    }
    for (let i = 0; i < 186; i += 1) {
      const point = randomPointInBiome(random, "briar", 6);
      if (random() > 0.34) {
        addBriarOak(group, point.x, point.z, random);
      } else if (random() > 0.18) {
        addBramblePatch(group, point.x, point.z, random, 0.85 + random() * 0.55);
      } else {
        addCharcoalClamp(group, point.x, point.z, random() * TAU, 0.72 + random() * 0.32);
      }
    }
    for (let i = 0; i < 152; i += 1) {
      const point = randomExplorationPoint(random, 13, game.exploration.radius - 24, (x, z) => {
        const biome = biomeAt(x, z);
        return biome !== "desert" && biome !== "swamp" && biome !== "briar";
      });
      addExplorationRock(group, point.x, point.z, random, random() > 0.82);
    }
    addExplorationFlowers(group, random, 160);

    // Meadow: the roaming brawler stays the staple; some spawns are converted
    // to ranged Bandit Archers so the region has a close + distance pairing.
    const enemySeedFilter = (x, z) => !isEnemySeedNearRoad(x, z);
    for (let i = 0; i < 26; i += 1) {
      const point = randomExplorationPoint(random, 35, game.exploration.radius - 32, (x, z) => biomeAt(x, z) === "meadow" && enemySeedFilter(x, z));
      const world = explorationToWorld(point.x, point.z);
      const mob = createBarbarian(world.x, world.z, 1 + Math.floor(random() * 3));
      mob.health *= 0.82;
      mob.maxHealth = mob.health;
      seedExplorationEnemy(mob, world, random, 14 + random() * 8, 9.5);
    }
    for (let i = 0; i < 14; i += 1) {
      const point = randomExplorationPoint(random, 35, game.exploration.radius - 32, (x, z) => biomeAt(x, z) === "meadow" && enemySeedFilter(x, z));
      const world = explorationToWorld(point.x, point.z);
      const archer = createBanditArcher(world.x, world.z, 1 + Math.floor(random() * 3));
      seedExplorationEnemy(archer, world, random, 16 + random() * 8, 11);
    }
    // Desert: the close-range spider stays; some spawns become Sand Vipers that
    // spit venom orbs from a distance.
    for (let i = 0; i < 10; i += 1) {
      const point = randomPointInBiome(random, "desert", 13, enemySeedFilter);
      const world = explorationToWorld(point.x, point.z);
      const spider = createSpider(world.x, world.z, 1 + Math.floor(random() * 2));
      seedExplorationEnemy(spider, world, random, 13 + random() * 6, 7.5);
    }
    for (let i = 0; i < 6; i += 1) {
      const point = randomPointInBiome(random, "desert", 13, enemySeedFilter);
      const world = explorationToWorld(point.x, point.z);
      const viper = createSandViper(world.x, world.z, 1 + Math.floor(random() * 2));
      seedExplorationEnemy(viper, world, random, 14 + random() * 6, 9);
    }
    // Mountain: the distance drake stays; reanimated Bonewardens give the peaks
    // a close-range melee threat.
    for (let i = 0; i < 3; i += 1) {
      const point = randomPointInBiome(random, "mountain", 16, enemySeedFilter);
      const world = explorationToWorld(point.x, point.z);
      const dragon = createDragon(world.x, world.z, 1 + Math.floor(random() * 2));
      dragon.health *= 0.72;
      dragon.maxHealth = dragon.health;
      dragon.hoverHeight = 2.55 + random() * 0.34;
      dragon.desiredRange = 9.2 + random() * 2.0;
      seedExplorationEnemy(dragon, world, random, 21 + random() * 8, 18);
    }
    for (let i = 0; i < 5; i += 1) {
      const point = randomPointInBiome(random, "mountain", 16, enemySeedFilter);
      const world = explorationToWorld(point.x, point.z);
      const warden = createBonewarden(world.x, world.z, 1 + Math.floor(random() * 3));
      seedExplorationEnemy(warden, world, random, 13 + random() * 7, 10);
    }
    // Swamp: the wisp gains a hex-orb distance attack; the Bog Lurker adds a
    // second, close-range mire threat.
    for (let i = 0; i < 7; i += 1) {
      const point = randomPointInBiome(random, "swamp", 12, enemySeedFilter);
      const world = explorationToWorld(point.x, point.z);
      const wisp = createWisp(world.x, world.z, 1 + Math.floor(random() * 2));
      seedExplorationEnemy(wisp, world, random, 15 + random() * 6, 9.5);
    }
    for (let i = 0; i < 6; i += 1) {
      const point = randomPointInBiome(random, "swamp", 12, enemySeedFilter);
      const world = explorationToWorld(point.x, point.z);
      const lurker = createBogLurker(world.x, world.z, 1 + Math.floor(random() * 3));
      seedExplorationEnemy(lurker, world, random, 13 + random() * 6, 9);
    }
    for (let i = 0; i < 14; i += 1) {
      const point = randomPointInBiome(random, "briar", 12, enemySeedFilter);
      const world = explorationToWorld(point.x, point.z);
      const beast = createBriarBeast(world.x, world.z, 1 + Math.floor(random() * 3));
      seedExplorationEnemy(beast, world, random, 14 + random() * 7, 8.5);
    }
    updateQuestMarkers();
    updateQuestLog();
  }

  function setupLighting() {
    const hemi = new THREE.HemisphereLight(0xd7eeff, 0x3b3328, 1.55);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe3b0, 4.0);
    sun.position.set(-22, 34, -16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 620;
    sun.shadow.camera.left = -320;
    sun.shadow.camera.right = 520;
    sun.shadow.camera.top = 320;
    sun.shadow.camera.bottom = -320;
    sun.shadow.bias = -0.00025;
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x86b6ff, 1.15);
    rim.position.set(14, 10, -18);
    scene.add(rim);

    const torchPositions = [
      [-17, 1.8, -17],
      [17, 1.8, -17],
      [-17, 1.8, 17],
      [17, 1.8, 17]
    ];

    game.torches = torchPositions.map((pos, index) => {
      const post = makeCylinder(0.14, 0.18, 2.7, 10, materials.wood, pos[0], 1.35, pos[2]);
      const bowl = makeCylinder(0.36, 0.25, 0.22, 12, materials.iron, pos[0], 2.72, pos[2]);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.55, 12),
        new THREE.MeshBasicMaterial({ color: index % 2 ? 0xffb548 : 0xff7b36, transparent: true, opacity: 0.92 })
      );
      flame.position.set(pos[0], 3.08, pos[2]);
      const light = new THREE.PointLight(0xff9f4a, 1.9, 17, 1.8);
      light.position.set(pos[0], 3.05, pos[2]);
      light.castShadow = true;
      light.shadow.mapSize.set(512, 512);
      addArenaObject(post);
      addArenaObject(bowl);
      addArenaObject(flame);
      addArenaObject(light);
      return { light, flame, seed: Math.random() * 10 };
    });
  }

  function setupSkyDetails() {
    const sun = new THREE.Mesh(new THREE.SphereGeometry(4.2, 28, 18), materials.sunDisc);
    sun.position.set(29, 14, -38);
    scene.add(sun);

    const cloudData = [
      [-20, 8.5, -28, 1.25],
      [5, 10, -34, 1.5],
      [31, 8.2, -28, 1.15],
      [-42, 15, 4, 1.2],
      [44, 15, 20, 1.0],
      [0, 17, 34, 1.15]
    ];
    for (const [x, y, z, scale] of cloudData) {
      createCloud(x, y, z, scale);
    }
  }

  function createCloud(x, y, z, scale) {
    const cloud = new THREE.Group();
    cloud.position.set(x, y, z);
    const puffPositions = [
      [-1.2, 0, 0, 1.15],
      [-0.35, 0.2, 0.05, 1.35],
      [0.72, 0.08, 0, 1.05],
      [1.45, -0.03, 0.02, 0.82],
      [0.12, -0.14, 0.15, 0.95]
    ];
    for (const [px, py, pz, puffScale] of puffPositions) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.95 * puffScale * scale, 14, 10), materials.cloud);
      puff.position.set(px * scale, py * scale, pz * scale);
      puff.scale.y = 0.55;
      cloud.add(puff);
    }
    cloud.rotation.y = Math.random() * TAU;
    scene.add(cloud);
  }

  function addArenaObject(object) {
    if (!game.arenaGroup) {
      game.arenaGroup = new THREE.Group();
      scene.add(game.arenaGroup);
    }
    game.arenaGroup.add(object);
    return object;
  }

  function addDungeonObject(object) {
    if (!game.dungeonGroup) {
      game.dungeonGroup = new THREE.Group();
      game.dungeonGroup.visible = false;
      scene.add(game.dungeonGroup);
    }
    game.dungeonGroup.add(object);
    return object;
  }

  function setArenaVisible(visible) {
    if (game.arenaGroup) {
      game.arenaGroup.visible = visible;
    }
    if (game.dungeonGroup && visible) {
      game.dungeonGroup.visible = false;
    }
    if (game.explorationGroup) {
      game.explorationGroup.visible = !visible && !localPlayerInDungeonActivity();
    }
  }

  function setDungeonVisible(visible) {
    if (game.dungeonGroup) {
      game.dungeonGroup.visible = visible;
    }
    if (game.arenaGroup && visible) {
      game.arenaGroup.visible = false;
    }
    if (game.explorationGroup) {
      game.explorationGroup.visible = !visible && !localPlayerInArenaActivity();
    }
  }

  function setupDungeonInterior() {
    const floorMaterial = materials.darkStone.clone();
    floorMaterial.roughness = 1;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(DUNGEON_RADIUS + 2.2, 72), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.025;
    floor.receiveShadow = true;
    addDungeonObject(floor);

    const wetCenter = new THREE.Mesh(new THREE.CircleGeometry(4.8, 48), materials.bogWater.clone());
    wetCenter.rotation.x = -Math.PI / 2;
    wetCenter.position.y = 0.005;
    wetCenter.scale.set(1.35, 0.78, 1);
    wetCenter.receiveShadow = true;
    addDungeonObject(wetCenter);

    for (let i = 0; i < 18; i += 1) {
      const angle = (i / 18) * TAU;
      const wall = makeBox(
        3.8,
        3.0 + (i % 3) * 0.35,
        0.72,
        i % 4 === 0 ? materials.rubble : materials.stone,
        Math.cos(angle) * (DUNGEON_RADIUS + 0.8),
        1.5,
        Math.sin(angle) * (DUNGEON_RADIUS + 0.8)
      );
      wall.rotation.y = -angle + Math.PI / 2;
      addDungeonObject(wall);
    }

    const grates = [
      [0, -DUNGEON_RADIUS - 0.2, 0],
      [DUNGEON_RADIUS * 0.78, 5.5, Math.PI / 2],
      [-DUNGEON_RADIUS * 0.78, 5.2, -Math.PI / 2]
    ];
    for (const [x, z, rotation] of grates) {
      const frame = makeBox(4.8, 0.18, 1.45, materials.iron, x, 0.1, z);
      frame.rotation.y = rotation;
      addDungeonObject(frame);
      for (let bar = 0; bar < 5; bar += 1) {
        const rail = makeBox(0.08, 0.78, 1.32, materials.steel.clone(), x - 1.6 + bar * 0.8, 0.46, z);
        rail.rotation.y = rotation;
        addDungeonObject(rail);
      }
    }

    const columns = [
      [-8.4, -5.2],
      [8.0, -5.5],
      [-7.2, 6.8],
      [7.8, 6.4]
    ];
    for (const [x, z] of columns) {
      addDungeonObject(makeCylinder(0.55, 0.74, 3.15, 12, materials.rubble, x, 1.56, z));
      addDungeonObject(makeCylinder(0.82, 0.62, 0.34, 12, materials.cityWall, x, 3.28, z));
    }

    const torchPositions = [
      [-12.2, -1.5],
      [12.2, -1.5],
      [-9.2, 10.0],
      [9.2, 10.0]
    ];
    for (const [x, z] of torchPositions) {
      const post = makeCylinder(0.08, 0.1, 1.45, 8, materials.wood, x, 1.12, z);
      post.rotation.z = Math.PI / 2;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.44, 10), materials.fireCore.clone());
      flame.position.set(x, 1.95, z);
      const light = new THREE.PointLight(0xff9f4a, 0.95, 9, 1.9);
      light.position.copy(flame.position);
      addDungeonObject(post);
      addDungeonObject(flame);
      addDungeonObject(light);
    }

    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * TAU + 0.22;
      const radius = 7.5 + (i % 3) * 1.8;
      const debris = i % 2
        ? makeBox(0.92, 0.32, 1.35, materials.wood, Math.cos(angle) * radius, 0.18, Math.sin(angle) * radius)
        : makeBox(1.15, 0.46, 0.78, materials.rubble, Math.cos(angle) * radius, 0.24, Math.sin(angle) * radius);
      debris.rotation.y = -angle + (i % 2 ? 0.7 : -0.35);
      addDungeonObject(debris);
    }
  }

  function createSpectator(x, y, z, angle, material, cheerPhase) {
    const spectator = new THREE.Group();
    spectator.position.set(x, y, z);
    spectator.rotation.y = angle;
    const body = makeCylinder(0.11, 0.13, 0.34, 8, material, 0, 0.18, 0);
    const head = makeSphere(0.095, materials.skin, 0, 0.43, 0);
    const leftArm = makeBox(0.045, 0.24, 0.045, materials.skin, -0.13, 0.28, 0);
    const rightArm = makeBox(0.045, 0.24, 0.045, materials.skin, 0.13, 0.28, 0);
    leftArm.rotation.z = -0.35 - Math.sin(cheerPhase) * 0.45;
    rightArm.rotation.z = 0.35 + Math.cos(cheerPhase) * 0.45;
    spectator.add(body, head, leftArm, rightArm);
    addArenaObject(spectator);
  }

  function setupGrandstands() {
    const crowdMaterials = [materials.crowdRed, materials.crowdBlue, materials.crowdGreen, materials.crowdGold, materials.leather];
    const sections = 16;
    for (let section = 0; section < sections; section += 1) {
      const angle = (section / sections) * TAU + Math.PI / sections;
      const centerRadius = 41.5;
      const x = Math.cos(angle) * centerRadius;
      const z = Math.sin(angle) * centerRadius;
      const stand = new THREE.Group();
      stand.position.set(x, 0, z);
      stand.rotation.y = -angle + Math.PI / 2;

      const lowerWall = makeBox(12.6, 1.35, 0.5, materials.stone, 0, 0.68, -2.8);
      const concourse = makeBox(12.8, 0.55, 6.4, materials.darkStone, 0, 0.28, 0.15);
      const rearWall = makeBox(12.8, 2.4, 0.52, materials.stone, 0, 2.1, 3.18);
      stand.add(concourse, lowerWall, rearWall);

      for (let arch = 0; arch < 4; arch += 1) {
        const archX = -4.8 + arch * 3.2;
        const leftColumn = makeBox(0.28, 1.42, 0.62, materials.darkStone, archX - 0.74, 0.72, -3.12);
        const rightColumn = makeBox(0.28, 1.42, 0.62, materials.darkStone, archX + 0.74, 0.72, -3.12);
        const archTop = makeBox(1.78, 0.34, 0.64, materials.darkStone, archX, 1.31, -3.14);
        const shadowGap = makeBox(1.1, 0.88, 0.045, materials.fur, archX, 0.66, -3.47);
        stand.add(leftColumn, rightColumn, archTop, shadowGap);
      }

      for (let row = 0; row < 5; row += 1) {
        const y = 0.82 + row * 0.45;
        const zRow = -1.65 + row * 0.82;
        const bench = makeBox(12.2 - row * 0.35, 0.2, 0.38, row % 2 ? materials.paleWood : materials.wood, 0, y, zRow);
        const riser = makeBox(12.35 - row * 0.35, 0.5, 0.3, materials.stone, 0, y - 0.18, zRow + 0.28);
        stand.add(bench, riser);
      }

      for (let merlon = 0; merlon < 7; merlon += 1) {
        const block = makeBox(0.72, 0.58, 0.42, materials.stone, -5.1 + merlon * 1.7, 3.58, 3.15);
        stand.add(block);
      }

      for (let col = 0; col < 11; col += 1) {
        for (let row = 0; row < 5; row += 1) {
          if ((col + row + section) % 6 === 0) {
            continue;
          }
          const lx = -5.0 + col;
          const lz = -1.72 + row * 0.82;
          const local = new THREE.Vector3(lx, 1.02 + row * 0.45, lz);
          local.applyAxisAngle(up, stand.rotation.y);
          const material = crowdMaterials[(col + row + section) % crowdMaterials.length];
          createSpectator(x + local.x, local.y, z + local.z, stand.rotation.y + Math.PI, material, section + col * 0.7 + row);
        }
      }

      addArenaObject(stand);
    }
  }

  function setupArenaGates() {
    game.gates.length = 0;
    const gateAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    for (let i = 0; i < gateAngles.length; i += 1) {
      const angle = gateAngles[i];
      const gate = new THREE.Group();
      const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const centerRadius = arenaRadius + 2.5;
      gate.position.set(radial.x * centerRadius, 0, radial.z * centerRadius);
      gate.rotation.y = -angle + Math.PI / 2;

      const path = makeBox(4.6, 0.06, 11.8, materials.dirt, 0, 0.035, -2.1);
      const tunnelFloor = makeBox(5.3, 0.18, 5.4, materials.darkStone, 0, 0.05, 2.35);
      const leftButtress = makeBox(1.05, 3.65, 5.7, materials.stone, -2.75, 1.84, 1.58);
      const rightButtress = makeBox(1.05, 3.65, 5.7, materials.stone, 2.75, 1.84, 1.58);
      const archTop = makeBox(6.4, 1.18, 1.15, materials.stone, 0, 3.28, -0.76);
      const rearArch = makeBox(6.1, 1.05, 1.0, materials.darkStone, 0, 3.05, 2.98);
      const shadowMouth = makeBox(3.9, 2.55, 0.08, materials.fur, 0, 1.35, -1.32);
      const tunnelDark = makeBox(4.15, 2.25, 0.08, materials.fur, 0, 1.2, 3.28);

      for (let bar = 0; bar < 7; bar += 1) {
        const x = -1.55 + bar * 0.52;
        const portcullis = makeBox(0.08, 2.45, 0.08, materials.iron, x, 1.36, -1.46);
        gate.add(portcullis);
      }

      for (let block = 0; block < 5; block += 1) {
        const merlon = makeBox(0.78, 0.7, 0.8, materials.stone, -2.1 + block * 1.05, 4.16, -0.72);
        gate.add(merlon);
      }

      const torchLeft = makeCylinder(0.08, 0.1, 1.8, 8, materials.wood, -3.1, 1.65, -1.25);
      const torchRight = makeCylinder(0.08, 0.1, 1.8, 8, materials.wood, 3.1, 1.65, -1.25);
      const flameLeft = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 10), materials.fireCore.clone());
      const flameRight = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 10), materials.fireCore.clone());
      flameLeft.position.set(-3.1, 2.75, -1.25);
      flameRight.position.set(3.1, 2.75, -1.25);
      const lightLeft = new THREE.PointLight(0xff9f4a, 1.2, 8, 1.9);
      const lightRight = new THREE.PointLight(0xff9f4a, 1.2, 8, 1.9);
      lightLeft.position.copy(flameLeft.position);
      lightRight.position.copy(flameRight.position);

      gate.add(
        path, tunnelFloor, leftButtress, rightButtress, archTop, rearArch,
        shadowMouth, tunnelDark, torchLeft, torchRight, flameLeft, flameRight, lightLeft, lightRight
      );
      addArenaObject(gate);

      game.gates.push({
        angle,
        startRadius: arenaRadius + 6.3,
        targetRadius: arenaRadius - 7.2
      });
    }
  }

  function setupArena() {
    setupSkyDetails();
    setupGrandstands();

    const groundMaterial = materials.grass.clone();
    groundMaterial.map = makeGroundTexture();
    groundMaterial.roughness = 1;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(arenaRadius + 20, 128), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    addArenaObject(ground);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(arenaRadius - 1.4, arenaRadius - 0.4, 96),
      materials.dirt
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    ring.receiveShadow = true;
    addArenaObject(ring);

    const center = new THREE.Mesh(new THREE.CircleGeometry(6.8, 64), materials.dirt);
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.016;
    center.receiveShadow = true;
    addArenaObject(center);

    setupArenaGates();

    for (let i = 0; i < 20; i += 1) {
      const angle = (i / 20) * TAU;
      const nearGate = game.gates.some(gate => Math.abs(Math.atan2(Math.sin(angle - gate.angle), Math.cos(angle - gate.angle))) < 0.18);
      if (nearGate) {
        continue;
      }
      const radius = arenaRadius + (i % 2 ? 0.25 : -0.15);
      const stone = makeBox(
        1.9 + Math.random() * 0.7,
        0.7 + Math.random() * 0.8,
        1.1 + Math.random() * 0.45,
        i % 3 ? materials.stone : materials.darkStone,
        Math.cos(angle) * radius,
        0.35,
        Math.sin(angle) * radius
      );
      stone.rotation.y = -angle + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      addArenaObject(stone);
    }

    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU + 0.18;
      const radius = 18 + Math.random() * 4;
      const prop = i % 3 === 0
        ? makeCylinder(0.2, 0.3, 1.1 + Math.random() * 0.45, 9, materials.wood)
        : makeBox(0.72 + Math.random() * 0.36, 0.42 + Math.random() * 0.26, 0.72 + Math.random() * 0.32, i % 2 ? materials.wood : materials.stone);
      prop.position.set(Math.cos(angle) * radius, prop.geometry.type === "CylinderGeometry" ? 0.7 : 0.35, Math.sin(angle) * radius);
      prop.rotation.y = Math.random() * TAU;
      addArenaObject(prop);
    }

    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU + 0.2;
      const pole = makeCylinder(0.08, 0.1, 3.8, 8, materials.wood, Math.cos(angle) * 22, 1.9, Math.sin(angle) * 22);
      const bannerMesh = makeBox(0.08, 1.3, 0.78, i % 2 ? materials.cloth : materials.blue, 0, 0.4, 0.42);
      bannerMesh.castShadow = true;
      pole.add(bannerMesh);
      pole.rotation.y = -angle;
      addArenaObject(pole);
    }
  }

  // ---------------------------------------------------------------------
  // Kit weapon factory. Builds the held weapon mesh for a given equipment id
  // in pivot-local space (knight: blade toward -Z; wizard: shaft along +Y;
  // ranger: stave plane Y-Z, string toward +Z). Used by the local player and
  // remote player models so equipped kits are visible to everyone.
  // ---------------------------------------------------------------------
  function buildSwordTip(radiusAcrossFlats, bladeEndZ, material) {
    // 4-sided cone whose square base matches the blade cross-section and
    // whose apex points away from the hilt, joined flush at bladeEndZ.
    const tip = makeCylinder(0.0, radiusAcrossFlats * Math.SQRT2, 0.24, 4, material, 0, 0, bladeEndZ - 0.12);
    tip.rotation.x = -Math.PI / 2;
    tip.rotation.y = Math.PI / 4;
    return tip;
  }

  function buildKnightWeapon(weaponId) {
    const weapon = new THREE.Group();
    if (weaponId === "knight_crownring_maul") {
      const haft = makeCylinder(0.05, 0.055, 1.5, 8, materials.wood, 0, 0, -0.55);
      haft.rotation.x = Math.PI / 2;
      const head = makeBox(0.3, 0.3, 0.42, materials.iron, 0, 0, -1.42);
      const bandFront = makeBox(0.33, 0.33, 0.06, materials.gold, 0, 0, -1.58);
      const bandBack = makeBox(0.33, 0.33, 0.06, materials.gold, 0, 0, -1.26);
      const stud = makeCylinder(0.0, 0.09, 0.16, 4, materials.steel.clone(), 0, 0, -1.71);
      stud.rotation.x = -Math.PI / 2;
      stud.rotation.y = Math.PI / 4;
      const pommel = makeSphere(0.08, materials.iron, 0, 0, 0.17);
      weapon.add(haft, head, bandFront, bandBack, stud, pommel);
      return weapon;
    }
    if (weaponId === "knight_roadwarden_blade") {
      const grip = makeCylinder(0.05, 0.05, 0.45, 8, materials.darkLeather, 0, 0, -0.1);
      grip.rotation.x = Math.PI / 2;
      const blade = makeBox(0.085, 0.085, 1.7, materials.steel, 0, 0, -0.95);
      const fuller = makeBox(0.022, 0.015, 1.2, materials.blue, 0, 0.05, -0.92);
      const tip = buildSwordTip(0.0425, -1.8, materials.steel);
      const guard = makeBox(0.5, 0.075, 0.075, materials.gold, 0, 0, -0.26);
      const pommel = makeSphere(0.085, materials.gold, 0, 0, 0.17);
      weapon.add(grip, blade, fuller, tip, guard, pommel);
      return weapon;
    }
    if (weaponId === "knight_briarfall_hookblade") {
      const grip = makeCylinder(0.052, 0.052, 0.45, 8, materials.leather, 0, 0, -0.1);
      grip.rotation.x = Math.PI / 2;
      const blade = makeBox(0.08, 0.08, 1.25, materials.steel, 0, 0, -0.73);
      const tip = buildSwordTip(0.04, -1.355, materials.steel);
      const hook = makeBox(0.07, 0.26, 0.09, materials.steel.clone(), 0, 0.14, -1.24);
      hook.rotation.x = -0.55;
      const guard = makeBox(0.44, 0.075, 0.075, materials.cactus, 0, 0, -0.26);
      const pommel = makeSphere(0.085, materials.cactus, 0, 0, 0.17);
      weapon.add(grip, blade, tip, hook, guard, pommel);
      return weapon;
    }
    // knight_arming_sword (default)
    const grip = makeCylinder(0.055, 0.055, 0.45, 8, materials.wood, 0, 0, -0.1);
    grip.rotation.x = Math.PI / 2;
    const blade = makeBox(0.09, 0.09, 1.55, materials.steel, 0, 0, -0.88);
    const fuller = makeBox(0.025, 0.015, 1.04, materials.iron, 0, 0.052, -0.86);
    const tip = buildSwordTip(0.045, -1.655, materials.steel);
    const guard = makeBox(0.46, 0.08, 0.08, materials.gold, 0, 0, -0.26);
    const pommel = makeSphere(0.09, materials.gold, 0, 0, 0.17);
    weapon.add(grip, blade, fuller, tip, guard, pommel);
    return weapon;
  }

  function buildWizardWeapon(weaponId) {
    const weapon = new THREE.Group();
    if (weaponId === "wizard_stormcall_rod") {
      const shaft = makeCylinder(0.05, 0.06, 1.35, 10, materials.iron, 0, 0.1, 0);
      const cap = makeCylinder(0.13, 0.09, 0.16, 12, materials.gold, 0, 0.82, 0);
      const orb = makeSphere(0.21, materials.lightningCore.clone(), 0, 1.02, 0);
      for (let i = 0; i < 4; i += 1) {
        const angle = (i / 4) * TAU;
        const spike = makeCylinder(0.0, 0.04, 0.22, 5, materials.iron, Math.cos(angle) * 0.2, 1.06, Math.sin(angle) * 0.2);
        spike.rotation.z = Math.cos(angle) * -0.9;
        spike.rotation.x = Math.sin(angle) * 0.9;
        weapon.add(spike);
      }
      const glow = new THREE.PointLight(0x9fd3ff, 1.8, 7, 1.7);
      glow.position.set(0, 1.02, 0);
      weapon.add(shaft, cap, orb, glow);
      return weapon;
    }
    if (weaponId === "wizard_wayfinder_focus") {
      const shaft = makeCylinder(0.042, 0.052, 1.86, 10, materials.paleWood, 0, 0.24, 0);
      const cap = makeCylinder(0.14, 0.09, 0.18, 12, materials.gold, 0, 1.2, 0);
      const ringA = makeCylinder(0.21, 0.21, 0.03, 18, materials.gold, 0, 1.3, 0);
      ringA.rotation.x = Math.PI / 2;
      const ringB = makeCylinder(0.15, 0.15, 0.025, 16, materials.wizardTrim.clone(), 0, 1.42, 0);
      ringB.rotation.x = Math.PI / 2;
      const crystal = makeSphere(0.13, materials.lightningCore.clone(), 0, 1.42, 0);
      const glow = new THREE.PointLight(0xffd166, 1.3, 6, 1.8);
      glow.position.set(0, 1.42, 0);
      weapon.add(shaft, cap, ringA, ringB, crystal, glow);
      return weapon;
    }
    if (weaponId === "wizard_briar_focus") {
      const shaft = makeCylinder(0.045, 0.058, 1.7, 9, materials.wood, 0, 0.18, 0);
      const orb = makeSphere(0.16, materials.wisp.clone(), 0, 1.26, 0);
      const core = makeSphere(0.07, materials.wispCore.clone(), 0, 1.26, 0);
      for (let i = 0; i < 3; i += 1) {
        const angle = (i / 3) * TAU + 0.5;
        const thorn = makeCylinder(0.0, 0.035, 0.2, 5, materials.wood, Math.cos(angle) * 0.16, 1.14, Math.sin(angle) * 0.16);
        thorn.rotation.z = Math.cos(angle) * -0.85;
        thorn.rotation.x = Math.sin(angle) * 0.85;
        weapon.add(thorn);
      }
      const glow = new THREE.PointLight(0x5effbd, 1.3, 6, 1.8);
      glow.position.set(0, 1.26, 0);
      weapon.add(shaft, orb, core, glow);
      return weapon;
    }
    // wizard_oak_staff (default)
    const shaft = makeCylinder(0.045, 0.055, 1.86, 10, materials.wood, 0, 0.24, 0);
    const cap = makeCylinder(0.16, 0.1, 0.2, 12, materials.gold, 0, 1.2, 0);
    const crystal = makeSphere(0.18, materials.lightningCore.clone(), 0, 1.38, 0);
    const crystalRing = makeCylinder(0.22, 0.22, 0.035, 18, materials.wizardTrim.clone(), 0, 1.26, 0);
    crystalRing.rotation.x = Math.PI / 2;
    const glow = new THREE.PointLight(0x7ae8ff, 1.35, 6, 1.8);
    glow.position.set(0, 1.38, 0);
    weapon.add(shaft, cap, crystal, crystalRing, glow);
    return weapon;
  }

  function buildRangerWeapon(weaponId) {
    const weapon = new THREE.Group();
    const recurve = weaponId === "ranger_crownring_recurve";
    const briar = weaponId === "ranger_briarstring_bow";
    const staveMaterial = recurve ? materials.wood : briar ? materials.cactus : materials.paleWood;
    const tipMaterial = recurve ? materials.gold : materials.rangerTrim.clone();
    const stave = new THREE.Mesh(new THREE.TorusGeometry(0.58, recurve ? 0.042 : 0.035, 8, 20, Math.PI * 0.62), staveMaterial);
    stave.rotation.set(0, Math.PI / 2, -Math.PI * 0.31);
    stave.position.z = 0.48;
    addShadow(stave);
    const grip = makeCylinder(0.05, 0.05, 0.26, 8, materials.leather, 0, 0, -0.1);
    const string = makeBox(0.012, 0.96, 0.012, briar ? materials.rope : materials.bone, 0, 0, 0.15);
    const upperTip = makeSphere(recurve ? 0.055 : 0.045, tipMaterial, 0, 0.48, 0.15);
    const lowerTip = makeSphere(recurve ? 0.055 : 0.045, tipMaterial, 0, -0.48, 0.15);
    weapon.add(stave, grip, string, upperTip, lowerTip);
    if (briar) {
      for (const y of [0.3, -0.3]) {
        const thorn = makeCylinder(0.0, 0.028, 0.12, 5, materials.wood, 0, y, 0.02);
        thorn.rotation.x = -Math.PI / 2;
        weapon.add(thorn);
      }
    }
    return weapon;
  }

  function buildWeaponModel(weaponId) {
    const definition = equipmentDefs[weaponId];
    const character = definition ? definition.character : "knight";
    if (character === "wizard") {
      return buildWizardWeapon(weaponId);
    }
    if (character === "ranger") {
      return buildRangerWeapon(weaponId);
    }
    return buildKnightWeapon(weaponId);
  }

  function localWeaponPivot() {
    return player.swordPivot || player.staffPivot || player.bowPivot;
  }

  function refreshLocalWeaponModel() {
    const pivot = localWeaponPivot();
    if (!pivot) {
      return;
    }
    if (player.weaponGroup) {
      pivot.remove(player.weaponGroup);
    }
    player.weaponGroup = buildWeaponModel(equippedWeapon());
    pivot.add(player.weaponGroup);
  }

  function createKnight() {
    const group = new THREE.Group();
    group.position.copy(player.position);

    const hips = makeCylinder(0.47, 0.55, 0.72, 16, materials.iron, 0, 0.76, 0);
    const chest = makeCylinder(0.58, 0.45, 0.95, 16, materials.steel.clone(), 0, 1.42, 0);
    const tabard = makeBox(0.62, 0.92, 0.07, materials.blue, 0, 1.35, -0.49);
    const tabardTrim = makeBox(0.08, 0.78, 0.03, materials.gold, 0, 1.34, -0.54);
    const belt = makeCylinder(0.53, 0.54, 0.12, 16, materials.darkLeather, 0, 1.02, 0);
    const beltBuckle = makeBox(0.17, 0.12, 0.05, materials.gold, 0, 1.02, -0.49);
    const cape = makeBox(0.88, 1.22, 0.06, materials.cloth, 0, 1.15, 0.48);
    cape.rotation.x = -0.1;
    const capeClaspLeft = makeSphere(0.08, materials.gold, -0.28, 1.86, 0.36);
    const capeClaspRight = makeSphere(0.08, materials.gold, 0.28, 1.86, 0.36);
    const head = makeSphere(0.28, materials.steel, 0, 2.1, 0);
    const visor = makeBox(0.4, 0.08, 0.07, materials.iron, 0, 2.11, -0.25);
    const visorSlit = makeBox(0.3, 0.025, 0.025, materials.fireCore, 0, 2.12, -0.3);
    const helmet = makeCylinder(0.13, 0.3, 0.28, 16, materials.steel, 0, 2.34, 0);
    const helmetBand = makeCylinder(0.31, 0.31, 0.08, 18, materials.gold, 0, 2.25, 0);
    const crownRidge = makeBox(0.09, 0.44, 0.08, materials.gold, 0, 2.48, 0);
    crownRidge.rotation.x = 0.25;
    // Plume: gold finial + three fanned cloth slats instead of a single block.
    const plumeFinial = makeCone(0.07, 0.16, 8, materials.gold, 0, 2.56, 0.04);
    const plumeMid = makeBox(0.11, 0.6, 0.09, materials.cloth, 0, 2.69, 0.09);
    plumeMid.rotation.x = 0.32;
    const plumeLeft = makeBox(0.09, 0.5, 0.07, materials.cloth.clone(), -0.08, 2.64, 0.08);
    plumeLeft.rotation.set(0.34, 0, 0.16);
    const plumeRight = makeBox(0.09, 0.5, 0.07, materials.cloth.clone(), 0.08, 2.64, 0.08);
    plumeRight.rotation.set(0.34, 0, -0.16);
    const leftTasset = makeBox(0.26, 0.34, 0.3, materials.steel.clone(), -0.3, 0.62, 0);
    leftTasset.rotation.z = 0.18;
    const rightTasset = makeBox(0.26, 0.34, 0.3, materials.steel.clone(), 0.3, 0.62, 0);
    rightTasset.rotation.z = -0.18;
    // Second, lower tasset layer deepens the armored hip silhouette.
    const leftTasset2 = makeBox(0.22, 0.26, 0.28, materials.steel.clone(), -0.27, 0.4, 0.02);
    leftTasset2.rotation.z = 0.2;
    const rightTasset2 = makeBox(0.22, 0.26, 0.28, materials.steel.clone(), 0.27, 0.4, 0.02);
    rightTasset2.rotation.z = -0.2;
    // Segmented faulds skirt of steel plates fanning out from the belt.
    const faulds = new THREE.Group();
    faulds.position.set(0, 1.0, 0);
    for (let i = 0; i < 4; i += 1) {
      const angle = (i - 1.5) * 0.46;
      const plate = makeBox(0.24, 0.32, 0.1, materials.steel.clone(), Math.sin(angle) * 0.44, -0.26, -Math.cos(angle) * 0.44);
      plate.rotation.set(0.12, angle, 0);
      faulds.add(plate);
    }
    // Gold rivet row across the breastplate.
    const rivets = new THREE.Group();
    for (let i = 0; i < 4; i += 1) {
      rivets.add(makeSphere(0.03, materials.gold, -0.21 + i * 0.14, 1.62, -0.44));
    }

    // Hip-pivot leg Groups (thigh + knee + shin + boot) so walk/mount rotation.x
    // swings from the top, not the leg's center.
    function makeKnightLeg(x) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.7, 0);
      const thigh = makeCylinder(0.13, 0.14, 0.4, 12, materials.iron, 0, -0.18, 0);
      const knee = makeSphere(0.13, materials.steel.clone(), 0, -0.16, -0.11);
      knee.scale.set(1, 0.62, 0.72);
      const shin = makeCylinder(0.11, 0.12, 0.4, 12, materials.iron.clone(), 0, -0.5, 0.01);
      const boot = makeBox(0.29, 0.2, 0.35, materials.darkLeather, 0, -0.73, -0.05);
      leg.add(thigh, knee, shin, boot);
      return leg;
    }
    const leftLeg = makeKnightLeg(-0.22);
    const rightLeg = makeKnightLeg(0.22);

    // Shoulder-pivot arm Groups (upper + elbow + forearm + gauntlet cuff + fist).
    function makeKnightArm(x) {
      const arm = new THREE.Group();
      arm.position.set(x, 1.72, 0);
      const upper = makeCylinder(0.11, 0.1, 0.4, 12, materials.iron, 0, -0.2, 0);
      const elbow = makeSphere(0.1, materials.steel.clone(), 0, -0.4, 0);
      const forearm = makeCylinder(0.1, 0.11, 0.38, 12, materials.iron.clone(), 0, -0.58, -0.01);
      const gauntlet = makeCylinder(0.12, 0.13, 0.18, 10, materials.steel.clone(), 0, -0.68, -0.02);
      gauntlet.rotation.z = Math.PI / 2;
      const fist = makeSphere(0.12, materials.steel.clone(), 0, -0.8, -0.02);
      arm.add(upper, elbow, forearm, gauntlet, fist);
      return arm;
    }
    const leftArm = makeKnightArm(-0.58);
    const rightArm = makeKnightArm(0.58);
    const leftPauldron = makeCylinder(0.18, 0.28, 0.2, 14, materials.steel, -0.58, 1.76, 0);
    const rightPauldron = makeCylinder(0.18, 0.28, 0.2, 14, materials.steel, 0.58, 1.76, 0);
    leftPauldron.rotation.z = Math.PI / 2;
    rightPauldron.rotation.z = Math.PI / 2;

    const swordPivot = new THREE.Group();
    swordPivot.position.set(0.7, 1.27, -0.05);
    player.weaponGroup = buildWeaponModel(equippedWeapon("knight"));
    swordPivot.add(player.weaponGroup);
    swordPivot.rotation.set(-0.22, -0.24, -0.42);

    const shieldPivot = new THREE.Group();
    shieldPivot.position.set(-0.65, 1.32, -0.08);
    const shield = makeCylinder(0.42, 0.42, 0.12, 24, materials.blue, 0, 0, -0.12);
    shield.rotation.x = Math.PI / 2;
    const shieldBoss = makeCylinder(0.13, 0.13, 0.14, 20, materials.steel, 0, 0, -0.21);
    shieldBoss.rotation.x = Math.PI / 2;
    const shieldCrossV = makeBox(0.08, 0.58, 0.035, materials.gold, 0, 0, -0.29);
    const shieldCrossH = makeBox(0.42, 0.08, 0.035, materials.gold, 0, 0, -0.3);
    const shieldRim = makeCylinder(0.44, 0.44, 0.045, 24, materials.gold, 0, 0, -0.13);
    shieldRim.rotation.x = Math.PI / 2;
    shieldPivot.add(shield, shieldRim, shieldBoss, shieldCrossV, shieldCrossH);
    shieldPivot.rotation.set(0.1, 0.38, 0.0);

    const slashArc = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.025, 8, 28, Math.PI * 1.16),
      materials.slash.clone()
    );
    slashArc.position.set(0, 1.24, -0.86);
    slashArc.rotation.set(1.25, 0, -0.78);
    slashArc.visible = false;

    const hitFlash = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 28), materials.hit.clone());
    hitFlash.position.set(0, 1.55, -0.63);
    hitFlash.rotation.x = Math.PI / 2;
    hitFlash.visible = false;

    group.add(
      hips, chest, tabard, tabardTrim, belt, beltBuckle, cape, capeClaspLeft, capeClaspRight,
      head, visor, visorSlit, helmet, helmetBand, crownRidge, plumeFinial, plumeMid, plumeLeft, plumeRight,
      leftTasset, rightTasset, leftTasset2, rightTasset2, faulds, rivets,
      leftLeg, rightLeg,
      leftArm, rightArm, leftPauldron, rightPauldron,
      swordPivot, shieldPivot, slashArc, hitFlash
    );
    scene.add(group);

    player.group = group;
    player.body = chest;
    player.swordPivot = swordPivot;
    player.shieldPivot = shieldPivot;
    player.staffPivot = null;
    player.leftArm = leftArm;
    player.rightArm = rightArm;
    player.leftLeg = leftLeg;
    player.rightLeg = rightLeg;
    player.swordBlade = null;
    player.slashArc = slashArc;
    player.burstRing = null;
    player.castGlow = null;
    player.hitFlash = hitFlash;
  }

  function createWizard() {
    const group = new THREE.Group();
    group.position.copy(player.position);

    const robeLower = makeCylinder(0.68, 0.9, 1.0, 18, materials.wizardRobe.clone(), 0, 0.58, 0);
    const robeUpper = makeCylinder(0.48, 0.62, 0.92, 18, materials.wizardRobe.clone(), 0, 1.33, 0);
    const sash = makeCylinder(0.56, 0.57, 0.11, 18, materials.gold, 0, 0.96, 0);
    const sashPouch = makeBox(0.2, 0.22, 0.13, materials.leather, 0.4, 0.82, -0.34);
    const frontTrim = makeBox(0.12, 1.28, 0.05, materials.wizardTrim.clone(), 0, 0.98, -0.62);
    const shoulderWrap = makeBox(1.16, 0.18, 0.5, materials.wizardTrim.clone(), 0, 1.75, -0.03);
    const cape = makeBox(0.92, 1.24, 0.06, materials.royalBlue, 0, 1.12, 0.49);
    cape.rotation.x = -0.12;
    // Flared hem ring at the bottom of the robe + vertical fold accents.
    const hemRing = makeCylinder(0.94, 1.02, 0.18, 18, materials.wizardRobe.clone(), 0, 0.12, 0);
    const fold1 = makeBox(0.08, 0.92, 0.1, materials.wizardRobe.clone(), -0.36, 0.5, -0.52);
    fold1.rotation.z = 0.05;
    const fold2 = makeBox(0.08, 0.92, 0.1, materials.wizardRobe.clone(), 0.36, 0.5, -0.52);
    fold2.rotation.z = -0.05;
    const fold3 = makeBox(0.08, 1.0, 0.1, materials.wizardRobe.clone(), 0, 0.48, -0.58);

    const head = makeSphere(0.26, materials.skin, 0, 2.02, 0);
    // Two stacked bone beard boxes + nose + brow ridge for a craggier face.
    const beardTop = makeBox(0.32, 0.22, 0.09, materials.bone, 0, 1.88, -0.22);
    const beardBottom = makeBox(0.24, 0.22, 0.08, materials.bone.clone(), 0, 1.7, -0.2);
    const nose = makeBox(0.06, 0.1, 0.08, materials.skin.clone(), 0, 1.98, -0.26);
    const brow = makeBox(0.3, 0.05, 0.06, materials.skin.clone(), 0, 2.11, -0.24);
    const leftEye = makeSphere(0.032, materials.lightningCore.clone(), -0.08, 2.06, -0.24);
    const rightEye = makeSphere(0.032, materials.lightningCore.clone(), 0.08, 2.06, -0.24);
    const hatBrim = makeCylinder(0.43, 0.43, 0.08, 24, materials.wizardHat.clone(), 0, 2.23, 0);
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.82, 24), materials.wizardHat.clone());
    hatCone.position.set(0.02, 2.67, 0.02);
    hatCone.rotation.z = -0.1;
    addShadow(hatCone);
    // Bent hat tip + gold star emblem on the band.
    const hatTip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 16), materials.wizardHat.clone());
    hatTip.position.set(-0.12, 3.0, 0.05);
    hatTip.rotation.z = 0.66;
    addShadow(hatTip);
    const hatBand = makeCylinder(0.27, 0.3, 0.08, 18, materials.gold, 0, 2.35, 0);
    const hatStar = makeBox(0.1, 0.1, 0.04, materials.gold, 0, 2.4, -0.29);
    hatStar.rotation.z = Math.PI / 4;

    // Hip-pivot leg Groups (thigh + shin + boot) under the robe.
    function makeWizLeg(x) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.5, 0);
      const thigh = makeCylinder(0.11, 0.12, 0.32, 10, materials.darkLeather, 0, -0.15, 0);
      const shin = makeCylinder(0.09, 0.1, 0.3, 10, materials.darkLeather, 0, -0.4, 0.01);
      const boot = makeBox(0.29, 0.18, 0.34, materials.darkLeather, 0, -0.54, -0.05);
      leg.add(thigh, shin, boot);
      return leg;
    }
    const leftLeg = makeWizLeg(-0.22);
    const rightLeg = makeWizLeg(0.22);

    // Shoulder-pivot sleeved arm Groups (neutral rotation 0, since the cast pose
    // lerps back to 0). Flared upper sleeve + forearm, with the hand/cuff/drape
    // as children so they swing with the arm during casting.
    function makeWizArm(x) {
      const arm = new THREE.Group();
      arm.position.set(x, 1.69, 0);
      const upper = makeCylinder(0.14, 0.16, 0.4, 12, materials.wizardRobe.clone(), 0, -0.2, 0);
      const forearm = makeCylinder(0.11, 0.12, 0.36, 12, materials.wizardRobe.clone(), 0, -0.56, 0);
      const cuff = makeCylinder(0.13, 0.14, 0.16, 12, materials.wizardTrim.clone(), 0, -0.67, -0.02);
      cuff.rotation.z = Math.PI / 2;
      const hand = makeSphere(0.105, materials.skin.clone(), 0, -0.78, -0.03);
      const drape = makeBox(0.2, 0.32, 0.06, materials.wizardRobe.clone(), 0, -0.42, 0.08);
      arm.add(upper, forearm, cuff, hand, drape);
      return arm;
    }
    const leftArm = makeWizArm(-0.58);
    const rightArm = makeWizArm(0.58);

    const staffPivot = new THREE.Group();
    staffPivot.position.set(0.64, 1.02, -0.08);
    player.weaponGroup = buildWeaponModel(equippedWeapon("wizard"));
    staffPivot.add(player.weaponGroup);
    staffPivot.rotation.set(0.08, 0, -0.16);

    const castGlow = makeSphere(0.13, materials.lightningCore.clone(), -0.52, 1.05, -0.18);
    castGlow.visible = false;
    const burstRing = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.82, 48), materials.arcane.clone());
    burstRing.rotation.x = Math.PI / 2;
    burstRing.position.y = 0.08;
    burstRing.visible = false;

    const hitFlash = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 28), materials.hit.clone());
    hitFlash.position.set(0, 1.5, -0.62);
    hitFlash.rotation.x = Math.PI / 2;
    hitFlash.visible = false;

    group.add(
      robeLower, robeUpper, sash, sashPouch, frontTrim, shoulderWrap, cape, hemRing, fold1, fold2, fold3,
      head, beardTop, beardBottom, nose, brow, leftEye, rightEye, hatBrim, hatCone, hatTip, hatBand, hatStar,
      leftLeg, rightLeg,
      leftArm, rightArm,
      staffPivot, castGlow, burstRing, hitFlash
    );
    scene.add(group);

    player.group = group;
    player.body = robeUpper;
    player.swordPivot = null;
    player.shieldPivot = null;
    player.staffPivot = staffPivot;
    player.leftArm = leftArm;
    player.rightArm = rightArm;
    player.leftLeg = leftLeg;
    player.rightLeg = rightLeg;
    player.swordBlade = null;
    player.slashArc = null;
    player.burstRing = burstRing;
    player.castGlow = castGlow;
    player.hitFlash = hitFlash;
  }

  function createRanger() {
    const group = new THREE.Group();
    group.position.copy(player.position);

    const leftLeg = makeBox(0.21, 0.74, 0.23, materials.rangerJerkin, -0.21, 0.32, 0);
    const rightLeg = makeBox(0.21, 0.74, 0.23, materials.rangerJerkin, 0.21, 0.32, 0);
    const leftBoot = makeBox(0.27, 0.2, 0.36, materials.darkLeather, -0.21, -0.03, -0.06);
    const rightBoot = makeBox(0.27, 0.2, 0.36, materials.darkLeather, 0.21, -0.03, -0.06);
    const leftKneeWrap = makeCylinder(0.13, 0.14, 0.16, 10, materials.leather, -0.21, 0.55, 0);
    const rightKneeWrap = makeCylinder(0.13, 0.14, 0.16, 10, materials.leather, 0.21, 0.55, 0);

    const hips = makeCylinder(0.44, 0.52, 0.62, 16, materials.rangerJerkin, 0, 0.78, 0);
    const chest = makeCylinder(0.52, 0.42, 0.9, 16, materials.rangerJerkin.clone(), 0, 1.4, 0);
    const belt = makeCylinder(0.49, 0.5, 0.11, 16, materials.darkLeather, 0, 1.0, 0);
    const beltBuckle = makeBox(0.15, 0.1, 0.05, materials.rangerTrim.clone(), 0, 1.0, -0.45);
    const chestStrap = makeBox(0.14, 1.0, 0.06, materials.darkLeather, 0, 1.42, -0.44);
    chestStrap.rotation.z = 0.62;
    const pouch = makeBox(0.22, 0.2, 0.14, materials.leather, -0.36, 0.94, -0.34);

    const cloak = makeBox(0.86, 1.34, 0.06, materials.rangerCloak, 0, 1.08, 0.46);
    cloak.rotation.x = -0.1;
    const shoulderMantle = makeCylinder(0.56, 0.66, 0.34, 16, materials.rangerHood, 0, 1.78, 0);

    const head = makeSphere(0.26, materials.skin, 0, 2.04, 0);
    const leftEye = makeSphere(0.03, materials.emberEye.clone(), -0.08, 2.07, -0.23);
    const rightEye = makeSphere(0.03, materials.emberEye.clone(), 0.08, 2.07, -0.23);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.72, 16), materials.rangerHood.clone());
    hood.position.set(0, 2.32, 0.07);
    hood.rotation.x = 0.34;
    addShadow(hood);
    const hoodRim = makeCylinder(0.33, 0.35, 0.16, 16, materials.rangerHood.clone(), 0, 2.1, 0.04);
    hoodRim.rotation.x = 0.3;

    const leftArm = makeBox(0.19, 0.74, 0.21, materials.rangerCloak.clone(), -0.55, 1.36, 0);
    const rightArm = makeBox(0.19, 0.74, 0.21, materials.rangerCloak.clone(), 0.55, 1.36, 0);
    const leftBracer = makeCylinder(0.12, 0.13, 0.24, 10, materials.leather, -0.55, 1.04, -0.02);
    const rightBracer = makeCylinder(0.12, 0.13, 0.24, 10, materials.leather, 0.55, 1.04, -0.02);
    const leftHand = makeSphere(0.1, materials.skin, -0.55, 0.94, -0.03);
    const rightHand = makeSphere(0.1, materials.skin, 0.55, 0.94, -0.03);

    // Quiver across the back with arrow shafts poking out.
    const quiver = new THREE.Group();
    quiver.position.set(0.3, 1.52, 0.4);
    quiver.rotation.z = 0.42;
    const quiverBody = makeCylinder(0.13, 0.11, 0.78, 10, materials.leather, 0, 0, 0);
    const quiverRim = makeCylinder(0.14, 0.14, 0.06, 10, materials.rangerTrim.clone(), 0, 0.38, 0);
    quiver.add(quiverBody, quiverRim);
    for (let i = 0; i < 3; i += 1) {
      const shaft = makeCylinder(0.018, 0.018, 0.46, 6, materials.wood, -0.05 + i * 0.05, 0.6, (i - 1) * 0.05);
      const fletch = makeBox(0.01, 0.1, 0.07, materials.cloth, -0.05 + i * 0.05, 0.82, (i - 1) * 0.05);
      quiver.add(shaft, fletch);
    }

    // Recurve bow held vertically in the left hand, stave bulging toward -Z.
    // (Torus arc lives in XY; Rz centers it on +X, then Ry(90deg) maps it into
    // the Y-Z plane so the limbs sweep up/down and the belly points forward.)
    const bowPivot = new THREE.Group();
    bowPivot.position.set(-0.56, 1.0, -0.08);
    player.weaponGroup = buildWeaponModel(equippedWeapon("ranger"));
    bowPivot.add(player.weaponGroup);
    bowPivot.rotation.set(0, -0.3, -0.06);

    const hitFlash = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 28), materials.hit.clone());
    hitFlash.position.set(0, 1.5, -0.62);
    hitFlash.rotation.x = Math.PI / 2;
    hitFlash.visible = false;

    group.add(
      leftLeg, rightLeg, leftBoot, rightBoot, leftKneeWrap, rightKneeWrap,
      hips, chest, belt, beltBuckle, chestStrap, pouch, cloak, shoulderMantle,
      head, leftEye, rightEye, hood, hoodRim,
      leftArm, rightArm, leftBracer, rightBracer, leftHand, rightHand,
      quiver, bowPivot, hitFlash
    );
    scene.add(group);

    player.group = group;
    player.body = chest;
    player.swordPivot = null;
    player.shieldPivot = null;
    player.staffPivot = null;
    player.bowPivot = bowPivot;
    player.quiver = quiver;
    player.leftArm = leftArm;
    player.rightArm = rightArm;
    player.leftLeg = leftLeg;
    player.rightLeg = rightLeg;
    player.swordBlade = null;
    player.slashArc = null;
    player.burstRing = null;
    player.castGlow = null;
    player.hitFlash = hitFlash;
  }

  function setPlayerCharacter(character, resetVitals = true) {
    game.selectedCharacter = character;
    player.character = character;
    if (player.group) {
      scene.remove(player.group);
    }
    player.bowPivot = null;
    player.quiver = null;

    if (character === "wizard") {
      createWizard();
    } else if (character === "ranger") {
      createRanger();
    } else {
      createKnight();
    }
    applyProgressionStats(resetVitals);
    game.exploration.xp = getCharacterProgress(character).xp;

    if (resetVitals) {
      player.attacking = false;
      player.attackTimer = 0;
      player.blocking = false;
      player.blockHeld = false;
      player.utilityCooldown = 0;
      player.payoffCooldown = 0;
      player.resolveTimer = 0;
      player.rollTimer = 0;
    }

    updateCharacterUi();
  }

  function abilityMarkup(svg, keybind) {
    return svg + '<span class="keybind">' + keybind + '</span>';
  }

  function setAbilityLock(icon, ability) {
    const locked = !hasAbility(ability);
    icon.classList.toggle("locked", locked);
    icon.dataset.lock = locked ? "LV " + abilityUnlockLevel(ability) : "";
    icon.title = locked ? abilityDisplayName(ability) + " unlocks at level " + abilityUnlockLevel(ability) : abilityDisplayName(ability);
  }

  function updateAbilityLocks() {
    const key = characterKey(player.character);
    setAbilityLock(attackIcon, key === "wizard" ? "lightning" : key === "ranger" ? "arrow" : "slash");
    setAbilityLock(blockIcon, key === "wizard" ? "burst" : key === "ranger" ? "roll" : "block");
    setAbilityLock(potionIcon, key === "wizard" ? "potion" : key === "ranger" ? "pierce" : "bash");
  }

  function characterDisplayName(character = player.character) {
    const key = characterKey(character);
    return key === "wizard" ? "Wizard" : key === "ranger" ? "Ranger" : "Knight";
  }

  function getStartButtonText() {
    const prefix = online.role === "join" ? "Join" : "Start";
    return prefix + " Exploration as " + characterDisplayName();
  }

  function updateModeDescription() {
    overlayCopy.textContent = "Step out from the homestead, meet villagers, take quests, and roam the wilds.";
  }

  function setGameMode(mode) {
    mode = "exploration";
    game.mode = mode;
    startButton.textContent = getStartButtonText();
    updateModeDescription();
    if (online.role === "host" && online.connected) {
      publishHostPresence();
    }
    if (online.connected) {
      updateOnlineStatus("Connected");
    }
    updateSessionMenu();
  }

  function updateCharacterUi() {
    const key = characterKey(player.character);
    const wizard = key === "wizard";
    const ranger = key === "ranger";
    hud.classList.toggle("wizard-mode", wizard);
    hud.classList.toggle("ranger-mode", ranger);
    classLabel.textContent = characterDisplayName();
    resourceLabel.textContent = wizard ? "Magica" : ranger ? "Focus" : "Guard";
    statusPanel.setAttribute("aria-label", characterDisplayName() + " status");
    startButton.textContent = getStartButtonText();
    blockIcon.innerHTML = abilityMarkup(wizard
      ? '<svg viewBox="0 0 32 32"><path d="M16 4v5M16 23v5M4 16h5M23 16h5M8.5 8.5l3.5 3.5M20 20l3.5 3.5M23.5 8.5L20 12M12 20l-3.5 3.5"/><circle cx="16" cy="16" r="5"/></svg>'
      : ranger
      ? '<svg viewBox="0 0 32 32"><path d="M6 16c4-7 16-7 20 0-4 7-16 7-20 0z"/><path d="M10 16h12M16 10v12"/></svg>'
      : '<svg viewBox="0 0 32 32"><path d="M16 3l10 4v7c0 7-4 12-10 15C10 26 6 21 6 14V7z"/><path d="M16 7v17"/></svg>',
      "RMB / K");
    attackIcon.innerHTML = abilityMarkup(wizard
      ? '<svg viewBox="0 0 32 32"><path d="M17 2L7 17h7l-2 13 12-17h-8z"/></svg>'
      : ranger
      ? '<svg viewBox="0 0 32 32"><path d="M8 24C8 13 13 8 24 8"/><path d="M8 24L24 8"/><path d="M24 8l-6 1.5M24 8l-1.5 6"/></svg>'
      : '<svg viewBox="0 0 32 32"><path d="M22 4l6 6M18 8l6 6M4 28l6-2 15-15-4-4L6 22zM6 22l4 4"/></svg>',
      "LMB / Space");
    potionIcon.innerHTML = abilityMarkup(wizard
      ? '<svg viewBox="0 0 32 32"><path d="M12 3h8M14 3v7l-5 8a7 7 0 0 0 6 11h2a7 7 0 0 0 6-11l-5-8V3"/><path d="M10 21h12"/></svg>'
      : ranger
      ? '<svg viewBox="0 0 32 32"><path d="M5 18h19M24 18l-5-4M24 18l-5 4"/><path d="M9 11c2.7 2.1 0.5 4.5 3 6 1.2-2.4 4.6-3.1 5.7-0.2 1.4 3.6-2 6.2-5.2 6.2-3.1 0-5.4-2-5.4-4.8 0-2.1 1-3.6 1.9-7.2z"/><path d="M10 18h7"/></svg>'
      : '<svg viewBox="0 0 32 32"><path d="M15 3l9 4v7c0 6-3.5 10.5-9 13-5.5-2.5-9-7-9-13V7z"/><path d="M15 8v14M9.5 15h11M24 12l5 4-5 4"/></svg>',
      wizard ? "MMB / L" : "J / MMB");
    potionIcon.hidden = false;
    if (attackTouchButton) {
      attackTouchButton.setAttribute("aria-label", wizard ? "Lightning ball" : ranger ? "Quick Shot" : "Attack");
    }
    if (secondaryTouchButton) {
      secondaryTouchButton.setAttribute("aria-label", wizard ? "Arcane burst" : ranger ? "Tumble roll" : "Block");
    }
    if (potionTouchButton) {
      potionTouchButton.hidden = false;
      potionTouchButton.setAttribute("aria-label", wizard ? "Potion" : ranger ? "Flaming Arrow" : "Shield bash");
    }
    characterCards.forEach(card => {
      const selected = card.dataset.character === player.character;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-checked", selected ? "true" : "false");
    });
    updateAbilityLocks();
  }

  function updateOnlineStatus(text) {
    onlineStatus.textContent = text;
  }

  function sessionIsActive() {
    return game.state === "playing" || game.state === "paused" || game.pausedFromPlay;
  }

  function modeDisplayName(mode = game.mode) {
    return "Exploration";
  }

  function sanitizeRoomPhase(phase) {
    return [
      "lobby",
      "loading",
      "exploration",
      "arena-active",
      "arena-intermission",
      "dungeon-active",
      "closing",
      "abandoned"
    ].includes(phase) ? phase : "lobby";
  }

  function currentRoomPhase() {
    if (online.role === "host" && !online.connected && !roomIsOpen()) {
      return "lobby";
    }
    if (arenaActivityActive()) {
      return game.exploration.arenaActivity.phase === "intermission" ? "arena-intermission" : "arena-active";
    }
    if (dungeonActivityActive()) {
      return "dungeon-active";
    }
    if (game.state === "playing" || game.state === "paused") {
      return "exploration";
    }
    if (online.connected) {
      return online.role === "join" ? sanitizeRoomPhase(online.roomPhase) : "lobby";
    }
    return "lobby";
  }

  function roomPhaseLabel(phase = currentRoomPhase()) {
    const safePhase = sanitizeRoomPhase(phase);
    if (safePhase === "arena-active") return "Arena active";
    if (safePhase === "arena-intermission") return "Arena intermission";
    if (safePhase === "dungeon-active") return "Dungeon active";
    if (safePhase === "exploration") return "Exploration";
    if (safePhase === "loading") return "Loading";
    if (safePhase === "closing") return "Closing";
    if (safePhase === "abandoned") return "Host disconnected";
    return "Lobby";
  }

  function roomIsOpen() {
    return !!online.topic && (online.connected || online.role === "host");
  }

  function setSessionNote(text) {
    sessionNote.textContent = text || "";
    sessionNote.hidden = !text;
  }

  function helpSection(title) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);
    helpBody.appendChild(section);
    return section;
  }

  function helpParagraph(section, text) {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    section.appendChild(paragraph);
  }

  function helpList(section, items) {
    const list = document.createElement("ul");
    for (const item of items) {
      const row = document.createElement("li");
      if (item.keys) {
        const key = document.createElement("span");
        key.className = "help-key";
        key.textContent = item.keys;
        row.appendChild(key);
      }
      if (item.label) {
        const label = document.createElement("strong");
        label.textContent = item.label;
        row.appendChild(label);
        row.appendChild(document.createTextNode(item.text ? " - " + item.text : ""));
      } else if (item.text) {
        row.appendChild(document.createTextNode(item.text));
      }
      list.appendChild(row);
    }
    section.appendChild(list);
  }

  function buildHelpContent() {
    helpBody.replaceChildren();

    const basics = helpSection("The Game");
    helpParagraph(basics, "Ironhold is an exploration RPG. Walk the valley, discover villages and Crownford, and take quests by talking to named NPCs. Quests reward XP, boons, perks, and weapon kits.");
    helpParagraph(basics, "Leveling up unlocks new abilities. Progress saves locally on this browser every few seconds. Online sessions share one world: the host owns the room, friends join with the four digit code, and your character progress travels with you. In an online room, press Enter to chat with your party - recent messages appear in the upper left and fade during play.");
    helpParagraph(basics, "The minimap in the lower right shows discovered terrain, roads, quest areas, and a compass. Your arrow sits at the center of attention; online teammates appear as small colored dots, pinned to the rim when they roam far away.");

    const controls = helpSection("Movement & Controls");
    helpList(controls, [
      { keys: "W A S D", text: "Move. Click the game once to capture the mouse for camera look." },
      { keys: "Mouse / Q / E", text: "Turn the camera." },
      { keys: "E", label: "Talk", text: "speak to the nearest villager or quest giver." },
      { keys: "R", label: "Mount", text: "mount or dismount your active mount once a quest grants one." },
      { keys: "M", label: "Switch mount", text: "cycle between owned mounts - the horse from Rowan and the Skyhatched Drake from Brunna's roost quest." },
      { keys: "G", label: "Swap kit", text: "cycle between your unlocked weapon kits." },
      { keys: "F", label: "Utility", text: "class utility ability (unlocks level 5)." },
      { keys: "C", label: "Payoff", text: "class payoff ability (unlocks level 7-8)." },
      { keys: "H", label: "Stored potion", text: "drink the leftmost stored potion when wounded. Slots unlock at levels " + POTION_SLOT_UNLOCK_LEVELS.join(", ") + "; full-health pickups are stored if a slot is open." },
      { keys: "L / MMB", label: "Healing Draught", text: "wizards drop a shared healing draught that the caster or any wounded player can pick up; it grows stronger as the wizard levels." },
      { keys: "V", text: "Mute or unmute audio." },
      { keys: "Enter", label: "Chat", text: "in an online room, open the one-line chat to message your party. Enter sends, Esc cancels. Movement and attacks are paused while you type." },
      { keys: "Esc", text: "Pause, resume, or close dialogue." },
      { keys: "Enter / W / S", text: "Choose and move between dialogue options while talking." }
    ]);

    const classes = helpSection("Classes & Abilities");
    for (const entry of helpClassGuide) {
      helpParagraph(classes, characterDisplayName(entry.character) + " - " + entry.tagline);
      helpList(classes, entry.abilities.map(ability => {
        const unlockLevel = abilityUnlockLevels[ability.id] || 1;
        const unlockText = unlockLevel > 1 ? "Unlocks at level " + unlockLevel : "Available from the start";
        const note = ability.note ? ability.note + " " : "";
        return {
          keys: ability.keys,
          label: abilityDisplayNames[ability.id] || ability.id,
          text: note + unlockText + "."
        };
      }));
    }

    const leveling = helpSection("Leveling And Upgrades");
    helpParagraph(leveling, "XP levels unlock abilities and raise base stats before quest boons, perks, and kit sidegrades are applied.");
    helpList(leveling, [
      { label: "XP thresholds", text: "level 2 at " + xpForLevel(2) + " XP, level 3 at " + xpForLevel(3) + " XP, level 5 at " + xpForLevel(5) + " XP, level 9 at " + xpForLevel(9) + " XP." },
      { label: "Knight growth", text: "+6 max health and +7 max guard per level after level 1." },
      { label: "Wizard growth", text: "+4 max health, +8 max magica, and +0.65 magica regen per level after level 1." },
      { label: "Ranger growth", text: "+4 max health, +6 focus, and +0.5 focus regen per level after level 1." },
      { label: "Potion pouch", text: "storage slots unlock at levels " + POTION_SLOT_UNLOCK_LEVELS.join(", ") + "." },
      { label: "Death penalty", text: "dying wipes XP earned within your current level only. Your level, stats, and unlocked abilities stay stable." }
    ]);

    const kits = helpSection("Weapon Kits");
    helpParagraph(kits, "Kits are sidegrades, not upgrades: each trades something away for a different strength. Earn them from quests and Crownring trials, then press G to swap between unlocked kits. Swapping visibly changes your held weapon and nudges your stats - small health, guard, magica, regen, or speed trade-offs on top of the weapon tuning. Your equipped kit and its trade-offs show in the lower left; hover the panel for exact numbers.");
    for (const entry of helpClassGuide) {
      const kitItems = Object.entries(equipmentDefs)
        .filter(([, def]) => def && def.character === entry.character && def.name)
        .map(([id, def]) => ({
          label: def.name,
          text: (def.summary ? def.summary + " - " : "")
            + (helpSourceLabels[id] || (defaultWeaponByCharacter[entry.character] === id ? "starting kit" : "earned in the world"))
            + "; " + formatTuningSummary(def.tuning)
        }));
      if (kitItems.length > 0) {
        helpParagraph(kits, characterDisplayName(entry.character) + " kits:");
        helpList(kits, kitItems);
      }
    }

    const perks = helpSection("Perks And Permanent Buffs");
    helpParagraph(perks, "Permanent boons stack across characters where the resource exists: health helps everyone, guard helps knights, and magica/focus helps wizards and rangers.");
    helpList(perks, Object.entries(perkDefs).map(([id, def]) => ({
      label: def.name,
      text: (helpSourceLabels[id] || "earned in the world") + "; " + formatTuningSummary(def.tuning)
    })));
    helpParagraph(perks, "Quest rewards:");
    helpList(perks, helpPermanentRewardItems);

    const world = helpSection("Dangers Of The Valley");
    helpParagraph(world, "Enemies grow tougher the farther you roam from the homestead. Near spawn they are prowlers; past the midlands they are veterans with amber health bars, and the far reaches hold dread beasts with red health bars - bigger, faster, harder-hitting, and worth far more XP.");
    helpParagraph(world, "Entering a town sets your ordinary exploration death respawn to that town center. Crownring defeats still recover at the infirmary, and dungeon defeats recover at that dungeon's entrance.");
    helpList(world, [
      { label: "White HP bar", text: "prowler. Safe pickings near home." },
      { label: "Amber HP bar", text: "veteran. Tougher, meaner, 1.6x XP." },
      { label: "Red HP bar", text: "dread. Bring friends or a payoff ability. 2.4x XP." }
    ]);

    const arena = helpSection("The Crownring Arena");
    helpParagraph(arena, "The Crownring is the wave arena built into Crownford's outer wall. Find the steward by the ring and choose Enter Crownring to start. Enemies attack in waves; each cleared wave pays a shared purse, and every third wave lands a milestone reward.");
    helpList(arena, [
      { keys: "Y", label: "Yield", text: "leave mid-wave before the next purse is paid. Yielding is respected, not shameful." },
      { text: "Defeat never ends the game: you wake at the Crownford infirmary and Exploration continues - but like any death, defeat wipes current-level XP progress." },
      { text: "Online, everyone fights the same waves. Joiners arriving mid-wave wait at the infirmary and enter at the next bell." }
    ]);

    const dungeons = helpSection("Shared Dungeons");
    helpParagraph(dungeons, "Shared dungeons are sealed party chambers opened by local service NPCs. Bellwater Underworks starts from Mason Vale in Crownford or the Bellwater scout at the grate; Siltwell Cistern starts from Ilyas at the desert-fringe wellstone.");
    helpList(dungeons, [
      { keys: "Y", label: "Ring out", text: "leave this dungeon without claiming the clear reward." },
      { text: "Online, the host opens the selected entrance for everyone currently in the room. Late joiners wait outside until the return bell." },
      { text: "First clear of each dungeon grants its own small permanent boon once per player, so a veteran host does not consume a new player's first-clear reward." }
    ]);
  }

  function openHelpPanel() {
    buildHelpContent();
    startCard.hidden = true;
    helpPanel.hidden = false;
    playSfx("ui", 0.8);
  }

  function closeHelpPanel() {
    helpPanel.hidden = true;
    startCard.hidden = false;
  }

  function addRosterRow(name, detail, id = "") {
    const row = document.createElement("div");
    row.className = "roster-row";
    const label = document.createElement("span");
    label.textContent = name;
    row.appendChild(label);
    if (online.role === "host" && id) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kick-button";
      button.textContent = "Kick";
      button.addEventListener("click", () => kickRemotePlayer(id));
      row.appendChild(button);
    } else {
      const role = document.createElement("em");
      role.textContent = detail || "";
      row.appendChild(role);
    }
    roomRosterList.appendChild(row);
  }

  function updateRoomRoster() {
    roomRosterList.replaceChildren();
    addRosterRow(player.name || "Player", online.role === "host" ? "Host" : "You");
    for (const [id, remote] of online.remotePlayers) {
      addRosterRow(remote.nameTag ? remote.nameTag.text : "Player", characterDisplayName(remote.character), id);
    }
    const showRoster = !overlay.classList.contains("hidden")
      && (game.menuPhase === "hostSetup" || game.menuPhase === "joinReady" || game.menuPhase === "pause" || online.remotePlayers.size > 0)
      && (roomIsOpen() || online.remotePlayers.size > 0);
    roomRoster.hidden = !showRoster;
  }

  function activeEffectEntries() {
    const entries = [];
    if (localGodModeEnabled()) {
      entries.push({ label: "Local god mode", value: "All kits, mounts, tack, and abilities" });
    }
    if (player.resolveTimer > 0) {
      const reduction = Math.round((1 - combatTuningFor("knight").resolveDamageTaken) * 100);
      entries.push({ label: "Warden's Resolve", value: "-" + reduction + "% damage, " + Math.ceil(player.resolveTimer) + "s" });
    }
    const kit = equipmentDefs[equippedWeapon()];
    if (kit && kit.summary && kit.summary !== "Balanced") {
      entries.push({ label: kit.name, value: kit.summary });
    }
    if (game.mode === "exploration" && progression && progression.exploration) {
      const boons = progression.exploration.boons || {};
      const boonParts = [];
      if (boons.health) {
        boonParts.push("+" + boons.health + " HP");
      }
      if (boons.guard) {
        boonParts.push("+" + boons.guard + " guard");
      }
      if (boons.mana) {
        boonParts.push("+" + boons.mana + " magica");
      }
      if (boonParts.length) {
        entries.push({ label: "Exploration boons", value: boonParts.join(" ") });
      }
      if (progression.exploration.potionCooldownBonus > 0) {
        entries.push({ label: "Potion drill", value: "-" + progression.exploration.potionCooldownBonus + "s potion cooldown" });
      }
      for (const perkId of getCharacterProgress().perks || []) {
        const perk = perkDefs[perkId];
        if (perk) {
          entries.push({ label: perk.name, value: "reduced ability costs" });
        }
      }
      if (isPlayerMounted()) {
        const mountId = (game.exploration.horse && game.exploration.horse.mountId) || currentMountId();
        entries.push({
          label: "Mounted: " + (mountDisplayNames[mountId] || "Horse"),
          value: mountId === "drake" ? "+12% ride speed" : hasRoadwardenTack() ? "+8% ride speed" : "base ride speed"
        });
      }
    }
    return entries;
  }

  // Rebuilt only when the pause menu opens or changes phase; no per-frame cost.
  function updateActiveBuffsPanel(visible) {
    if (!buffsPanel || !buffsList) {
      return;
    }
    const entries = visible ? activeEffectEntries() : [];
    buffsList.textContent = "";
    for (const entry of entries) {
      const row = document.createElement("div");
      row.className = "buff-row";
      const label = document.createElement("span");
      label.textContent = entry.label;
      const value = document.createElement("span");
      value.className = "buff-value";
      value.textContent = entry.value;
      row.append(label, value);
      buffsList.append(row);
    }
    buffsPanel.hidden = entries.length === 0;
  }

  function updateSessionMenu() {
    const phase = game.menuPhase;
    const hostPhase = phase === "hostSetup";
    const joinPhase = phase === "joinSetup";
    const joinReady = phase === "joinReady";
    const pausePhase = phase === "pause";
    const activeSessionMenu = pausePhase && sessionIsActive();
    const showOnlinePanel = hostPhase || joinPhase || joinReady || (pausePhase && roomIsOpen());
    const activeGame = savedActiveGame();
    const roomPhase = currentRoomPhase();
    const roomPhaseText = roomPhaseLabel(roomPhase);

    overlay.dataset.phase = phase;
    overlay.classList.toggle("active-session-menu", activeSessionMenu);
    onlinePanel.classList.toggle("session-management", activeSessionMenu);
    sessionSelect.hidden = phase !== "landing" || activeSessionMenu;
    sessionSelect.classList.toggle("has-resume", !!activeGame);
    resumeGameButton.hidden = !activeGame;
    if (activeGame) {
      const className = characterDisplayName(activeGame.character);
      resumeGameSummary.textContent = "Continue Exploration as " + className + ".";
    }
    backMenuButton.hidden = phase === "landing" || pausePhase;
    onlinePanel.hidden = !showOnlinePanel;
    characterSelect.hidden = activeSessionMenu || !(hostPhase || joinReady);
    startButton.hidden = activeSessionMenu || !(hostPhase || joinReady);
    resumeButton.hidden = !pausePhase;
    helpButton.hidden = !pausePhase;
    if (!pausePhase && !helpPanel.hidden) {
      closeHelpPanel();
    }
    closeRoomButton.hidden = !((online.role === "host" && (pausePhase || hostPhase)) || (pausePhase && !online.role));
    leaveRoomButton.hidden = !(online.role === "join" && (pausePhase || joinReady));
    restartButton.hidden = true;
    closeRoomButton.textContent = pausePhase && online.role !== "host" ? "Close Session" : "Close Room";

    joinControls.hidden = activeSessionMenu || !joinPhase;
    joinButton.textContent = online.connected ? "Retry" : "Join";
    roomCodeCard.hidden = !(online.role === "host" && online.roomCode && (hostPhase || pausePhase));

    if (phase === "landing") {
      overlayCopy.textContent = activeGame
        ? "Resume your exploration save, start fresh, or join a friend's world."
        : "Start a new exploration room or join a friend's world.";
      setSessionNote("");
      updateOnlineStatus(online.lastRoomCode ? "Last room " + online.lastRoomCode + " ready to rejoin" : "Choose start or join");
    } else if (hostPhase) {
      overlayCopy.textContent = "Pick your character, then start Exploration. Crownring waves are found in the world.";
      setSessionNote(online.roomCode ? "Room " + online.roomCode + " - " + roomPhaseText : "Creating room");
      if (!online.connected && online.role === "host") {
        updateOnlineStatus("Opening room");
      }
    } else if (joinPhase) {
      overlayCopy.textContent = "Enter the host's four digit code. Your saved progress stays with you.";
      setSessionNote(online.lastRoomCode ? "Last room " + online.lastRoomCode : "");
      if (!online.connected) {
        updateOnlineStatus("Enter 4 digits");
      }
    } else if (joinReady) {
      if (roomPhase === "arena-active") {
        overlayCopy.textContent = "The Crownring is underway. You will wait at the infirmary and enter at the next bell.";
      } else if (roomPhase === "arena-intermission") {
        overlayCopy.textContent = "The Crownring is between waves. Join now and you can enter with the next bell.";
      } else {
        overlayCopy.textContent = "Connected to the host world. Saved progress carries into the room.";
      }
      setSessionNote("Room " + (online.roomCode || "----") + " - " + roomPhaseText);
    } else if (pausePhase) {
      overlayCopy.textContent = online.role === "join"
        ? "Session paused. Leave returns you to the menu and remembers this room code for rejoining."
        : "Session paused. Closing saves progress and shuts this room for everyone.";
      if (online.role === "host" && online.roomCode) {
        setSessionNote("Room " + online.roomCode + " - " + roomPhaseText);
      } else if (online.role === "join" && online.roomCode) {
        setSessionNote("Joined room " + online.roomCode + " - " + roomPhaseText);
      } else {
        setSessionNote(modeDisplayName());
      }
    }

    startButton.textContent = getStartButtonText();
    updateActiveBuffsPanel(pausePhase);
    updateRoomRoster();
  }

  function setMenuPhase(phase) {
    game.menuPhase = phase;
    updateSessionMenu();
  }

  function startHostSessionFlow() {
    syncPlayerName();
    resetLocalProgression();
    setPlayerCharacter("knight", true);
    setGameMode("exploration");
    setOnlineFlow("host");
    setMenuPhase("hostSetup");
    hostOnlineGame().catch(error => updateOnlineStatus(error.message || "Host failed"));
  }

  function resumeSavedGameFlow() {
    const activeGame = savedActiveGame();
    if (!activeGame) {
      updateOnlineStatus("No saved game");
      updateSessionMenu();
      return;
    }
    syncPlayerName();
    setGameMode(activeGame.mode);
    setPlayerCharacter(activeGame.character, true);
    setOnlineFlow("host");
    hostOnlineGame().catch(error => updateOnlineStatus(error.message || "Host failed"));
    beginPlay();
  }

  function startJoinSessionFlow() {
    syncPlayerName();
    const activeGame = savedActiveGame();
    if (activeGame) {
      setPlayerCharacter(activeGame.character, true);
    }
    setGameMode("exploration");
    setOnlineFlow("join");
    if (!roomCodeInput.value && online.lastRoomCode) {
      roomCodeInput.value = online.lastRoomCode;
    }
    setMenuPhase("joinSetup");
  }

  function backToSessionLanding() {
    if (roomIsOpen()) {
      if (online.role === "host") {
        sendOnlineMessage({ kind: "roomClosed" });
      }
      closeOnlineConnection(true, true, online.role === "join");
    }
    setMenuPhase("landing");
  }

  function openSessionMenu() {
    if (game.state !== "playing") {
      return;
    }
    if (!questDialog.hidden) {
      closeQuestDialog();
    }
    saveProgress();
    game.state = "paused";
    game.pausedFromPlay = true;
    keys.clear();
    player.blockHeld = false;
    player.blocking = false;
    overlay.classList.remove("hidden");
    document.exitPointerLock?.();
    // Stop music here directly: the rAF loop that normally drives setMusicPaused
    // is frozen by the browser when the tab is hidden/blurred, which is the most
    // common way to enter pause, so relying on it would leave music playing.
    setMusicPaused(true);
    setMenuPhase("pause");
  }

  function pauseForControlLoss() {
    if (game.state !== "playing") {
      return;
    }
    // Don't pause for the pointer-lock drop that chat typing/closing causes.
    if (chat.open || performance.now() < chat.suppressPauseUntil) {
      return;
    }
    if (performance.now() < game.suppressControlLossUntil) {
      return;
    }
    openSessionMenu();
  }

  function resumeSession() {
    if (game.state !== "paused") {
      return;
    }
    game.state = "playing";
    overlay.classList.add("hidden");
    roomRoster.hidden = true;
    setMusicPaused(false);
    requestGamePointerLock();
    sendOnlineMessage({ kind: "state", state: serializePlayerState() });
  }

  function returnToLanding(message = "") {
    saveProgress();
    game.state = "menu";
    game.pausedFromPlay = false;
    keys.clear();
    player.blockHeld = false;
    player.blocking = false;
    overlay.classList.remove("hidden");
    document.exitPointerLock?.();
    setMusicPaused(true);
    updateQuestMap();
    setMenuPhase("landing");
    if (message) {
      updateOnlineStatus(message);
    }
  }

  function closeRoomAndReturn() {
    if (online.role === "host") {
      sendOnlineMessage({ kind: "roomClosed" });
    }
    closeOnlineConnection(true, true, false);
    returnToLanding("Room closed. Start New Session opens a fresh room.");
  }

  function leaveRoomToMenu(message = "Left room", preserveCode = true) {
    const previousCode = online.roomCode || online.lastRoomCode || roomCodeInput.value;
    closeOnlineConnection(true, true, preserveCode);
    if (preserveCode && previousCode) {
      roomCodeInput.value = previousCode;
      online.lastRoomCode = previousCode;
      online.lastRoomMode = game.mode;
      message += ". Use Join Session to rejoin " + previousCode + ".";
    }
    returnToLanding(message);
  }

  function kickRemotePlayer(id) {
    if (online.role !== "host" || !id) {
      return;
    }
    online.kickedIds.add(id);
    sendOnlineMessage({ kind: "kick", targetId: id });
    const remote = online.remotePlayers.get(id);
    if (remote) {
      removeRemotePlayer(remote);
      online.remotePlayers.delete(id);
    }
    updateRoomRoster();
  }

  function setOnlineFlow(flow, closeCurrent = false) {
    const nextFlow = flow === "host" ? "host" : "join";
    if (closeCurrent && online.role && online.role !== nextFlow) {
      closeOnlineConnection();
    }
    online.flow = nextFlow;
    if (!online.connected) {
      updateOnlineStatus(online.flow === "host" ? "Create a room" : "Enter 4 digits");
    }
    updateSessionMenu();
  }

  function normalizeRoomCode(value) {
    return (value || "").replace(/\D/g, "").slice(0, 4);
  }

  function randomRoomCode() {
    return String(1000 + Math.floor(Math.random() * 9000));
  }

  function topicForRoom(code) {
    return "ironhold-waves/rooms/" + code;
  }

  function ensureMqttLibrary() {
    if (mqtt && typeof mqtt.connect === "function") {
      return true;
    }
    updateOnlineStatus("Network library unavailable");
    return false;
  }

  function showRoomCode(code) {
    online.roomCode = code || "";
    roomCodeText.textContent = code || "----";
    if (code) {
      online.lastRoomCode = code;
      online.lastRoomMode = game.mode;
      roomCodeInput.value = code;
      rememberRoomCode(code);
    }
    updateSessionMenu();
  }

  function stopHostPresence() {
    if (online.presenceTimer) {
      window.clearInterval(online.presenceTimer);
      online.presenceTimer = 0;
    }
  }

  function publishHostPresence() {
    if (online.role !== "host") {
      return;
    }
    sendOnlineMessage({ kind: "host", state: serializePlayerState() }, true);
  }

  function startHostPresence() {
    stopHostPresence();
    publishHostPresence();
    online.presenceTimer = window.setInterval(publishHostPresence, 5000);
  }

  function closeOnlineConnection(removeRemotes = true, clearRoom = true, preserveCode = false) {
    const wasHost = online.role === "host";
    const previousTopic = online.topic;
    const previousCode = online.roomCode || online.lastRoomCode || roomCodeInput.value;
    stopHostPresence();
    if (online.client) {
      if (wasHost && previousTopic && online.connected) {
        online.client.publish(previousTopic, "", { qos: 1, retain: true });
      }
      online.client.end(false);
    }
    online.client = null;
    online.topic = "";
    online.connected = false;
    online.role = null;
    online.hostId = "";
    online.worldSendTimer = 0;
    if (clearRoom) {
      showRoomCode("");
      if (preserveCode && previousCode) {
        online.lastRoomCode = previousCode;
        online.lastRoomMode = game.mode;
        roomCodeInput.value = previousCode;
        rememberRoomCode(previousCode);
      } else {
        online.lastRoomCode = "";
        roomCodeInput.value = "";
        rememberRoomCode("");
      }
    }
    if (removeRemotes) {
      for (const remote of online.remotePlayers.values()) {
        removeRemotePlayer(remote);
      }
      online.remotePlayers.clear();
    }
    updateOnlineStatus("Not connected");
    updateSessionMenu();
  }

  function connectRoom(code, role) {
    if (!ensureMqttLibrary()) {
      return;
    }
    closeOnlineConnection(false, false);
    online.role = role;
    online.topic = topicForRoom(code);
    online.hostId = role === "host" ? online.localId : "";
    online.lastRoomCode = code;
    online.lastRoomMode = game.mode;
    if (role === "host") {
      online.kickedIds.clear();
    }
    showRoomCode(code);
    updateOnlineStatus(role === "host" ? "Opening room" : "Joining room");
    const safeId = online.localId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
    const clientOptions = {
      clean: true,
      connectTimeout: 5000,
      forceNativeWebSocket: true,
      reconnectPeriod: 1500,
      clientId: "ironhold_" + safeId + "_" + Math.floor(Math.random() * 10000)
    };
    if (role === "host") {
      clientOptions.will = { topic: online.topic, payload: "", qos: 0, retain: true };
    }
    const client = mqtt.connect("wss://broker.emqx.io:8084/mqtt", clientOptions);
    online.client = client;

    client.on("connect", () => {
      if (online.client !== client) {
        return;
      }
      online.connected = true;
      client.subscribe(online.topic, error => {
        if (online.client !== client) {
          return;
        }
        if (error) {
          updateOnlineStatus("Room failed");
          return;
        }
        updateOnlineStatus(role === "host" ? "Give code to friend" : "Looking for host");
        if (role === "host") {
          startHostPresence();
        } else {
          sendOnlineMessage({ kind: "hello", state: serializePlayerState() });
        }
        updateSessionMenu();
      });
    });

    client.on("message", (topic, payload) => {
      if (online.client === client && topic === online.topic) {
        handleOnlineMessage(payload.toString());
      }
    });

    client.on("reconnect", () => {
      if (online.client === client) {
        online.connected = false;
        updateOnlineStatus("Reconnecting");
        updateSessionMenu();
      }
    });

    client.on("close", () => {
      if (online.client === client) {
        online.connected = false;
        updateOnlineStatus("Disconnected");
        updateSessionMenu();
      }
    });

    client.on("error", () => {
      if (online.client === client) {
        updateOnlineStatus("Connection error");
      }
    });
  }

  async function hostOnlineGame() {
    if (!ensureMqttLibrary()) {
      return;
    }
    setOnlineFlow("host");
    connectRoom(randomRoomCode(), "host");
  }

  async function joinOnlineGame() {
    if (!ensureMqttLibrary()) {
      return;
    }
    setOnlineFlow("join");
    const code = normalizeRoomCode(roomCodeInput.value);
    roomCodeInput.value = code;
    if (code.length !== 4) {
      updateOnlineStatus("Enter 4 digits");
      return;
    }
    connectRoom(code, "join");
  }

  function serializePlayerState() {
    const horse = game.mode === "exploration" ? game.exploration.horse : null;
    return {
      id: online.localId,
      mode: game.mode,
      playing: game.state === "playing" || game.state === "paused",
      character: player.character,
      name: player.name,
      weaponId: equippedWeapon(),
      perks: getCharacterProgress().perks.slice(0, 8),
      level: getCharacterLevel(),
      health: player.health,
      maxHealth: player.maxHealth,
      x: player.position.x,
      z: player.position.z,
      yaw: player.yaw,
      hasHorse: !!horse,
      mountTackId: currentMountTackId(),
      mountId: horse ? horse.mountId || "horse" : currentMountId(),
      mounted: !!horse && horse.mounted,
      horseX: horse ? horse.position.x : null,
      horseZ: horse ? horse.position.z : null,
      horseYaw: horse ? horse.yaw : player.yaw
    };
  }

  function sendOnlineMessage(message, retain = false) {
    if (!online.client || !online.connected || !online.topic) {
      return;
    }
    const payload = {
      ...message,
      id: online.localId,
      mode: game.mode,
      roomPhase: currentRoomPhase(),
      sentAt: Date.now()
    };
    online.client.publish(online.topic, JSON.stringify(payload), { qos: retain ? 1 : 0, retain });
  }

  function sendOnlineAction(action) {
    if (!online.connected || !online.topic) {
      return;
    }
    sendOnlineMessage({
      kind: "action",
      action,
      state: serializePlayerState()
    });
  }

  function sanitizeChatText(value) {
    if (typeof value !== "string") {
      return "";
    }
    // Strip control chars and angle brackets (rendering already uses
    // textContent, so this is defense in depth), collapse whitespace, trim,
    // and hard-cap the length so a peer cannot spam a wall of text.
    return value
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, CHAT_MAX_LEN);
  }

  function chatColorFor(id, preferredColor) {
    if (typeof preferredColor === "number" && Number.isFinite(preferredColor)) {
      return Math.max(0, Math.min(0xffffff, Math.floor(preferredColor)));
    }
    // Same glow used for minimap ally dots and nametags, so a speaker reads
    // as the same color everywhere.
    return remotePalette(id || "remote").glow;
  }

  function chatColorToCss(color) {
    return "#" + (color & 0xffffff).toString(16).padStart(6, "0");
  }

  function chatSenderAllowed(id, now) {
    const key = id || "anon";
    const recent = (chat.senders.get(key) || []).filter(ts => now - ts < CHAT_BURST_WINDOW_MS);
    if (recent.length >= CHAT_BURST_LIMIT) {
      chat.senders.set(key, recent);
      return false;
    }
    recent.push(now);
    chat.senders.set(key, recent);
    return true;
  }

  function pushChatMessage(name, text, color, ts) {
    chat.messages.push({
      name: name || "Player",
      text,
      color: color & 0xffffff,
      ts: ts || Date.now()
    });
    if (chat.messages.length > 40) {
      chat.messages.splice(0, chat.messages.length - 40);
    }
    renderChatLog();
  }

  function renderChatLog() {
    if (!chatLog) {
      return;
    }
    const visible = chat.messages.slice(-CHAT_HISTORY);
    chatLog.replaceChildren();
    for (const message of visible) {
      const row = document.createElement("div");
      row.className = "chat-msg";
      row.dataset.ts = String(message.ts);
      const name = document.createElement("span");
      name.className = "chat-name";
      name.style.color = chatColorToCss(message.color);
      name.textContent = message.name;
      const body = document.createElement("span");
      body.textContent = message.text;
      row.appendChild(name);
      row.appendChild(body);
      chatLog.appendChild(row);
    }
    refreshChatFade();
  }

  function refreshChatFade() {
    if (!chatLog) {
      return;
    }
    // Full backlog stays visible while the input is open or while paused;
    // during live play each line fades a few seconds after arrival.
    const holdOpen = chat.open || game.state === "paused";
    const now = Date.now();
    for (const row of chatLog.children) {
      const ts = Number(row.dataset.ts) || 0;
      const faded = !holdOpen && now - ts > CHAT_FADE_MS;
      row.classList.toggle("chat-msg--faded", faded);
    }
  }

  function chatAvailable() {
    return online.connected && (game.state === "playing" || game.state === "paused");
  }

  function refreshChatPanel() {
    if (!chatPanel) {
      return;
    }
    if (!chatAvailable()) {
      if (chat.open) {
        closeChatInput(true);
      }
      if (chat.messages.length && !online.connected) {
        chat.messages.length = 0;
        chat.senders.clear();
        renderChatLog();
      }
      if (chat.panelShown) {
        chatPanel.hidden = true;
        chat.panelShown = false;
      }
      return;
    }
    if (!chat.panelShown) {
      chatPanel.hidden = false;
      chat.panelShown = true;
    }
    refreshChatFade();
  }

  function openChatInput() {
    if (!chatAvailable() || chat.open || !chatForm || !chatInput) {
      return;
    }
    chat.open = true;
    chatPanel.hidden = false;
    chat.panelShown = true;
    chatForm.hidden = false;
    chatInput.value = "";
    // Drop any held movement/attack so typing never leaks into gameplay.
    keys.clear();
    player.blockHeld = false;
    refreshChatFade();
    window.setTimeout(() => {
      try {
        chatInput.focus({ preventScroll: true });
      } catch (error) {
        chatInput.focus();
      }
    }, 0);
  }

  function closeChatInput(silent = false) {
    if (!chat.open) {
      return;
    }
    chat.open = false;
    if (chatForm) {
      chatForm.hidden = true;
    }
    if (chatInput) {
      chatInput.value = "";
      chatInput.blur();
    }
    refreshChatFade();
    if (!silent && game.state === "playing") {
      // Escape force-drops pointer lock; re-grab control and keep the
      // resulting pointerlockchange from bouncing us into the pause menu.
      chat.suppressPauseUntil = performance.now() + 1500;
      requestGamePointerLock();
    }
  }

  function submitChatInput() {
    if (!chatInput) {
      return;
    }
    const text = sanitizeChatText(chatInput.value);
    chatInput.value = "";
    if (!text) {
      closeChatInput();
      return;
    }
    const now = Date.now();
    if (now - chat.lastSentAt < CHAT_SEND_GAP_MS || !chatSenderAllowed(online.localId, now)) {
      closeChatInput();
      return;
    }
    chat.lastSentAt = now;
    const name = sanitizePlayerName(player.name);
    const color = chatColorFor(online.localId);
    pushChatMessage(name, text, color, now);
    sendOnlineMessage({ kind: "chat", name, text, color, ts: now });
    closeChatInput();
  }

  function handleIncomingChat(message) {
    const text = sanitizeChatText(message && message.text);
    if (!text) {
      return;
    }
    const now = Date.now();
    if (!chatSenderAllowed(message.id, now)) {
      return;
    }
    const remote = online.remotePlayers.get(message.id);
    const remoteName = remote && remote.nameTag ? remote.nameTag.text : "";
    const name = sanitizePlayerName(message.name || remoteName || "Player");
    const color = chatColorFor(message.id, message.color);
    pushChatMessage(name, text, color, now);
    refreshChatPanel();
  }

  function messageFromKnownHost(message) {
    return online.role !== "join" || (!!online.hostId && message.id === online.hostId);
  }

  function isJoinedClient() {
    return online.role === "join" && !!online.topic;
  }

  function canSimulateSharedWorld() {
    return online.role !== "join";
  }

  function nextNetworkId(prefix) {
    if (prefix === "enemy") {
      return "e" + game.nextEnemyId++;
    }
    if (prefix === "fireball") {
      return "f" + game.nextFireballId++;
    }
    if (prefix === "potion") {
      return "p" + game.nextPotionId++;
    }
    return "x" + game.nextProjectileId++;
  }

  function assignEnemyId(enemy, id = "") {
    enemy.netId = id || enemy.netId || nextNetworkId("enemy");
    return enemy;
  }

  function assignFireballId(fireball, id = "") {
    fireball.netId = id || fireball.netId || nextNetworkId("fireball");
    return fireball;
  }

  function assignPotionId(potion, id = "") {
    potion.netId = id || potion.netId || nextNetworkId("potion");
    return potion;
  }

  function clearSharedWorldActors({ enemies = true, fireballs = true, potions = true } = {}) {
    if (enemies) {
      for (const enemy of game.enemies) {
        scene.remove(enemy.group);
      }
      game.enemies.length = 0;
    }
    if (fireballs) {
      for (const fireball of game.fireballs) {
        scene.remove(fireball.group);
      }
      game.fireballs.length = 0;
    }
    if (potions) {
      for (const potion of game.potions) {
        scene.remove(potion.group);
      }
      game.potions.length = 0;
    }
  }

  function serializeEnemyState(enemy) {
    const groupY = enemy.group ? enemy.group.position.y : 0;
    return {
      enemyId: enemy.netId,
      type: enemy.type,
      x: enemy.position.x,
      z: enemy.position.z,
      y: groupY,
      yaw: enemy.yaw || 0,
      scale: enemy.scale || 1,
      radius: enemy.radius || 0.7,
      health: Math.max(0, enemy.health),
      maxHealth: enemy.maxHealth,
      speed: enemy.speed,
      state: enemy.state,
      attackType: enemy.attackType || "",
      attackTimer: enemy.attackTimer || 0,
      attackDuration: enemy.attackDuration || 0,
      cooldown: enemy.cooldown || 0,
      stunned: enemy.stunned || 0,
      entering: !!enemy.entering,
      hoverHeight: enemy.hoverHeight || 0,
      desiredRange: enemy.desiredRange || 0,
      exploration: !!enemy.exploration,
      tier: enemy.tier || 1,
      activityType: enemy.activityType || "",
      activityId: enemy.activityId || ""
    };
  }

  function serializeFireballState(fireball) {
    return {
      fireballId: fireball.netId,
      variant: fireball.variant || "fire",
      x: fireball.group.position.x,
      y: fireball.group.position.y,
      z: fireball.group.position.z,
      vx: fireball.velocity.x,
      vy: fireball.velocity.y,
      vz: fireball.velocity.z,
      speed: fireball.speed,
      turnRate: fireball.turnRate,
      life: fireball.life,
      damage: fireball.damage,
      guardDamage: fireball.guardDamage,
      targetId: fireball.targetId || online.localId,
      activityType: fireball.activityType || "",
      activityId: fireball.activityId || ""
    };
  }

  function serializePotionState(potion) {
    return {
      potionId: potion.netId,
      x: potion.position.x,
      z: potion.position.z,
      kind: potion.kind || (potion.fullHeal ? "full" : "small"),
      healAmount: potion.healAmount,
      pickupRadius: potion.pickupRadius,
      fullHeal: !!potion.fullHeal,
      activityType: potion.activityType || "",
      activityId: potion.activityId || ""
    };
  }

  function serializeWorldSnapshot() {
    return {
      roomPhase: currentRoomPhase(),
      wave: game.wave,
      kills: game.kills,
      nextWaveIn: game.nextWaveIn,
      arenaActivity: serializeArenaActivityState(),
      dungeonActivity: serializeDungeonActivityState(),
      enemies: game.enemies.filter(enemy => !enemy.dead).map(serializeEnemyState),
      fireballs: game.fireballs.map(serializeFireballState),
      potions: game.potions.map(serializePotionState)
    };
  }

  function sendWorldSnapshot(force = false) {
    if (online.role !== "host" || !online.connected || game.state !== "playing") {
      return;
    }
    if (!force && online.remotePlayers.size === 0) {
      return;
    }
    sendOnlineMessage({ kind: "world", world: serializeWorldSnapshot() });
  }

  function normalizeEnemyType(type) {
    return type === "briarRaider" ? "briarBeast" : type;
  }

  // Single factory dispatch shared by the joiner snapshot path and the host
  // Wilds Director respawns, so the two stay in sync by construction.
  function createEnemyOfType(rawType, x, z, wave) {
    const type = normalizeEnemyType(rawType);
    if (type === "dragon") {
      return createDragon(x, z, wave);
    }
    if (type === "spider") {
      return createSpider(x, z, wave);
    }
    if (type === "wisp") {
      return createWisp(x, z, wave);
    }
    if (type === "briarBeast") {
      return createBriarBeast(x, z, wave);
    }
    if (type === "banditArcher") {
      return createBanditArcher(x, z, wave);
    }
    if (type === "sandViper") {
      return createSandViper(x, z, wave);
    }
    if (type === "bonewarden") {
      return createBonewarden(x, z, wave);
    }
    if (type === "bogLurker") {
      return createBogLurker(x, z, wave);
    }
    return createBarbarian(x, z, wave);
  }

  function createEnemyFromSnapshot(state) {
    const wave = Math.max(1, game.wave || 1);
    const enemy = createEnemyOfType(state.type, state.x, state.z, wave);
    enemy.remoteControlled = true;
    assignEnemyId(enemy, state.enemyId);
    game.enemies.push(enemy);
    return enemy;
  }

  function applyEnemySnapshot(enemy, state, firstSeen = false) {
    enemy.remoteControlled = true;
    const previousState = enemy.state;
    const previousAttackType = enemy.attackType;
    enemy.networkTargetPosition = enemy.networkTargetPosition || new THREE.Vector3();
    enemy.networkTargetPosition.set(state.x || 0, 0, state.z || 0);
    enemy.networkTargetY = state.y || 0;
    enemy.networkTargetYaw = state.yaw || 0;
    enemy.type = normalizeEnemyType(state.type) || enemy.type;
    enemy.scale = state.scale || enemy.scale || 1;
    enemy.radius = state.radius || enemy.radius;
    enemy.health = state.health ?? enemy.health;
    enemy.maxHealth = state.maxHealth || enemy.maxHealth;
    enemy.speed = state.speed || enemy.speed;
    enemy.state = state.state || enemy.state;
    enemy.attackType = state.attackType || null;
    enemy.attackTimer = state.attackTimer || 0;
    enemy.attackDuration = state.attackDuration || enemy.attackDuration || 0;
    enemy.cooldown = state.cooldown || 0;
    enemy.stunned = state.stunned || 0;
    enemy.entering = !!state.entering;
    enemy.hoverHeight = state.hoverHeight || enemy.hoverHeight || 0;
    enemy.desiredRange = state.desiredRange || enemy.desiredRange || 0;
    enemy.exploration = !!state.exploration;
    enemy.tier = state.tier || enemy.tier || 1;
    enemy.activityType = state.activityType || "";
    enemy.activityId = state.activityId || "";
    enemy.lastWorldSeen = clock.elapsedTime;
    if (enemy.group) {
      enemy.group.scale.setScalar(enemy.scale);
    }
    applyEnemyTierVisual(enemy);
    if (firstSeen) {
      enemy.position.copy(enemy.networkTargetPosition);
      enemy.yaw = enemy.networkTargetYaw;
      if (enemy.group) {
        enemy.group.position.set(state.x || 0, state.y || 0, state.z || 0);
        enemy.group.rotation.y = enemy.yaw;
      }
    }
    if (!firstSeen) {
      playEnemyStateSound(enemy, previousState, previousAttackType);
    }
  }

  function upsertEnemySnapshot(state) {
    if (!state || !state.enemyId) {
      return null;
    }
    let enemy = game.enemies.find(candidate => candidate.netId === state.enemyId);
    const firstSeen = !enemy;
    if (!enemy) {
      enemy = createEnemyFromSnapshot(state);
    }
    applyEnemySnapshot(enemy, state, firstSeen);
    return enemy;
  }

  // Visual/impact palette per enemy-projectile variant. All variants ride the
  // same replicated fireball pipeline; only the look and impact cue differ.
  function fireballVariantStyle(variant) {
    if (variant === "venom") {
      return { shellMat: materials.venomOrb, coreMat: materials.venomOrbCore, glow: 0x8fd94a, impact: 0x9be04a, impactSfx: "spiderLunge" };
    }
    if (variant === "hex") {
      return { shellMat: materials.hexOrb, coreMat: materials.hexOrbCore, glow: 0x6ff0cf, impact: 0x8affd2, impactSfx: "wispPulse" };
    }
    return { shellMat: materials.fire, coreMat: materials.fireCore, glow: 0xff7b2e, impact: 0xff7b2e, impactSfx: "fireballImpact" };
  }

  function createFireballVisual(state) {
    const variant = state.variant || "fire";
    const group = new THREE.Group();
    group.position.set(state.x || 0, state.y || 0.9, state.z || 0);
    let shell = null;
    let core = null;
    let style;
    if (variant === "arrow") {
      // Reuses the fireball pipeline but reads as a loosed arrow: a straight,
      // non-glowing shaft that the joiner sees replicated like any projectile.
      const shaft = makeCylinder(0.024, 0.024, 0.82, 6, materials.bowWood, 0, 0, 0);
      shaft.rotation.x = Math.PI / 2;
      const head = makeCylinder(0.0, 0.05, 0.16, 6, materials.steel.clone(), 0, 0, -0.47);
      head.rotation.x = -Math.PI / 2;
      const fletch = makeBox(0.014, 0.1, 0.16, materials.banditTunic, 0, 0, 0.34);
      group.add(shaft, head, fletch);
      style = { impact: 0xe7d4a6, impactSfx: "fireballImpact" };
    } else {
      style = fireballVariantStyle(variant);
      shell = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 12), style.shellMat.clone());
      core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), style.coreMat.clone());
      const glow = new THREE.PointLight(style.glow, variant === "hex" ? 2.2 : 2.6, 9, 1.7);
      shell.castShadow = true;
      group.add(shell, core, glow);
      if (variant === "hex") {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 8, 22), style.coreMat.clone());
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      }
    }
    scene.add(group);
    return assignFireballId({
      group,
      shell,
      core,
      variant,
      impactColor: style.impact,
      impactSfx: style.impactSfx,
      velocity: new THREE.Vector3(state.vx || 0, state.vy || 0, state.vz || 0),
      speed: state.speed || 5.1,
      turnRate: state.turnRate || 0.82,
      life: state.life || 4.2,
      damage: state.damage || 24,
      guardDamage: state.guardDamage || 36,
      targetId: state.targetId || online.localId,
      activityType: state.activityType || "",
      activityId: state.activityId || "",
      remoteControlled: true
    }, state.fireballId);
  }

  function upsertFireballSnapshot(state) {
    if (!state || !state.fireballId) {
      return null;
    }
    let fireball = game.fireballs.find(candidate => candidate.netId === state.fireballId);
    const firstSeen = !fireball;
    if (!fireball) {
      fireball = createFireballVisual(state);
      game.fireballs.push(fireball);
      playPositionalSfx("dragonFire", fireball.group.position, 0.75, 70);
    }
    fireball.remoteControlled = true;
    fireball.networkTargetPosition = fireball.networkTargetPosition || new THREE.Vector3();
    fireball.networkTargetPosition.set(state.x || 0, state.y || 0.9, state.z || 0);
    fireball.velocity.set(state.vx || 0, state.vy || 0, state.vz || 0);
    fireball.speed = state.speed || fireball.speed;
    fireball.turnRate = state.turnRate || fireball.turnRate;
    fireball.life = state.life || fireball.life;
    fireball.damage = state.damage || fireball.damage;
    fireball.guardDamage = state.guardDamage || fireball.guardDamage;
    fireball.targetId = state.targetId || fireball.targetId;
    fireball.activityType = state.activityType || "";
    fireball.activityId = state.activityId || "";
    fireball.lastWorldSeen = clock.elapsedTime;
    if (firstSeen) {
      fireball.group.position.copy(fireball.networkTargetPosition);
    }
    return fireball;
  }

  function upsertPotionSnapshot(state) {
    if (!state || !state.potionId) {
      return null;
    }
    let potion = game.potions.find(candidate => candidate.netId === state.potionId);
    if (!potion) {
      const kind = state.fullHeal ? "full" : state.kind || "small";
      potion = createHealthPotion(state.x || 0, state.z || 0, {
        kind,
        healAmount: state.healAmount,
        netId: state.potionId,
        activityType: state.activityType || "",
        activityId: state.activityId || ""
      });
      potion.remoteControlled = true;
      game.potions.push(potion);
    }
    potion.position.set(state.x || 0, explorationGroundWorldY(state.x || 0, state.z || 0), state.z || 0);
    potion.group.position.x = potion.position.x;
    potion.group.position.z = potion.position.z;
    potion.healAmount = state.healAmount || potion.healAmount;
    if (numberOrZero(state.pickupRadius) > 0) {
      potion.pickupRadius = state.pickupRadius;
    }
    potion.fullHeal = !!state.fullHeal;
    potion.kind = state.kind || potion.kind;
    potion.activityType = state.activityType || "";
    potion.activityId = state.activityId || "";
    potion.lastWorldSeen = clock.elapsedTime;
    return potion;
  }

  function removeActorsMissingFromSnapshot(collection, ids, idKey = "netId") {
    for (let i = collection.length - 1; i >= 0; i -= 1) {
      const actor = collection[i];
      if (!actor[idKey] || ids.has(actor[idKey])) {
        continue;
      }
      scene.remove(actor.group);
      collection.splice(i, 1);
    }
  }

  function applyWorldSnapshot(world) {
    if (!world || online.role !== "join") {
      return;
    }
    online.roomPhase = sanitizeRoomPhase(world.roomPhase || online.roomPhase);
    game.wave = world.wave ?? game.wave;
    game.kills = world.kills ?? 0;
    game.nextWaveIn = world.nextWaveIn ?? 0;
    applyArenaActivitySnapshot(world.arenaActivity);
    applyDungeonActivitySnapshot(world.dungeonActivity);

    const enemyIds = new Set();
    for (const enemyState of world.enemies || []) {
      enemyIds.add(enemyState.enemyId);
      upsertEnemySnapshot(enemyState);
    }
    removeActorsMissingFromSnapshot(game.enemies, enemyIds);

    const fireballIds = new Set();
    for (const fireballState of world.fireballs || []) {
      fireballIds.add(fireballState.fireballId);
      upsertFireballSnapshot(fireballState);
    }
    removeActorsMissingFromSnapshot(game.fireballs, fireballIds);

    const potionIds = new Set();
    for (const potionState of world.potions || []) {
      potionIds.add(potionState.potionId);
      upsertPotionSnapshot(potionState);
    }
    removeActorsMissingFromSnapshot(game.potions, potionIds);
  }

  function updateRemoteWorldActors(dt) {
    for (const enemy of game.enemies) {
      if (!enemy.remoteControlled) {
        continue;
      }
      const previous = enemy.position.clone();
      const target = enemy.networkTargetPosition || enemy.position;
      enemy.position.lerp(target, 1 - Math.pow(0.0001, dt));
      enemy.velocity.copy(enemy.position).sub(previous).multiplyScalar(1 / Math.max(0.001, dt));
      enemy.yaw = lerpAngle(enemy.yaw || 0, enemy.networkTargetYaw || 0, 1 - Math.pow(0.0001, dt));
      updateEnemyHealthBillboard(enemy);
      if (enemy.telegraph) {
        enemy.telegraph.visible = enemy.state === "attack" || enemy.state === "lunge" || enemy.state === "pulse"
          || enemy.state === "draw" || enemy.state === "spit" || enemy.state === "hex";
      }
      if (enemy.type === "dragon") {
        const targetY = enemy.networkTargetY || enemy.hoverHeight || 2.2;
        const y = lerp(enemy.group.position.y, targetY, 1 - Math.pow(0.0001, dt));
        enemy.group.position.set(enemy.position.x, y, enemy.position.z);
        updateDragonAnimation(enemy, dt);
      } else {
        enemy.group.position.copy(enemy.position);
        if (enemy.type === "spider") {
          updateSpiderAnimation(enemy, dt);
        } else if (enemy.type === "wisp") {
          updateWispAnimation(enemy, dt);
        } else if (enemy.type === "briarBeast") {
          updateBriarBeastAnimation(enemy, dt);
        } else if (enemy.type === "sandViper") {
          updateViperAnimation(enemy, dt);
        } else if (enemy.leftLeg && enemy.rightLeg) {
          enemy.walkTime += enemy.velocity.length() * dt;
          const legSwing = Math.sin(enemy.walkTime * 6.5) * Math.min(0.38, enemy.velocity.length() * 0.08);
          enemy.leftLeg.rotation.x = legSwing;
          enemy.rightLeg.rotation.x = -legSwing;
          if (enemy.chest) {
            enemy.chest.rotation.x = enemy.stunned > 0 ? -0.22 : 0;
          }
        }
      }
      applyEnemyVisualYaw(enemy, dt);
      updateEnemyMovementAudio(enemy, dt);
    }

    for (const fireball of game.fireballs) {
      if (!fireball.remoteControlled) {
        continue;
      }
      const target = fireball.networkTargetPosition || fireball.group.position;
      fireball.group.position.lerp(target, 1 - Math.pow(0.00005, dt));
      if (fireball.shell) {
        fireball.shell.rotation.y += dt * 7.5;
        fireball.shell.rotation.x += dt * 5.8;
        const pulse = 1 + Math.sin(clock.elapsedTime * 18) * 0.14;
        fireball.shell.scale.setScalar(pulse);
        fireball.core.scale.setScalar(1.08 + Math.sin(clock.elapsedTime * 24) * 0.2);
      } else {
        fireball.group.rotation.y = Math.atan2(-fireball.velocity.x, -fireball.velocity.z);
        fireball.group.rotation.x = Math.atan2(fireball.velocity.y, Math.hypot(fireball.velocity.x, fireball.velocity.z));
      }
    }
  }

  function broadcastOnlineEffect(effect) {
    if (online.role !== "host" || !online.connected || !online.topic) {
      return;
    }
    online.effectSeq += 1;
    sendOnlineMessage({
      kind: "effect",
      effect: {
        ...effect,
        effectId: online.localId + "-" + online.effectSeq
      }
    });
  }

  function applyOnlineEffect(effect) {
    if (!effect || effect.ownerId === online.localId) {
      return;
    }
    if (effect.type === "impact") {
      const position = new THREE.Vector3(effect.x || 0, effect.y || 0, effect.z || 0);
      spawnImpact(position, effect.color || 0xffffff, effect.count || 10);
      playPositionalSfx(effect.sfx || "remoteImpact", position, effect.sfxIntensity || 0.8, effect.sfxDistance || 42);
      return;
    }
    if (effect.type === "action" && effect.state) {
      applyRemoteAction(effect.action, effect.state, { damageEnemies: false, broadcast: false });
    }
  }

  function removePotionById(potionId) {
    const index = game.potions.findIndex(potion => potion.netId === potionId);
    if (index < 0) {
      return null;
    }
    const [potion] = game.potions.splice(index, 1);
    scene.remove(potion.group);
    return potion;
  }

  function handlePotionPickupRequest(message) {
    if (online.role !== "host" || !message.potionId || !message.state) {
      return;
    }
    upsertRemotePlayer(message.state);
    const remote = online.remotePlayers.get(message.id);
    const potion = game.potions.find(candidate => candidate.netId === message.potionId);
    const remoteUnlockedSlots = potionSlotsUnlockedForLevel(remote ? remote.level : message.state.level);
    const remotePotionCount = clamp(Math.floor(numberOrZero(message.inventoryCount)), 0, POTION_INVENTORY_CAPACITY);
    const wantsStore = !!message.store
      && remotePotionCount < remoteUnlockedSlots
      && !!storedPotionFromDrop(potion);
    // No owner gate here: wizard Healing Draughts are shared party pickups,
    // including for the wizard who dropped them.
    if (!remote || !potion || (!wantsStore && remote.health >= remote.maxHealth)) {
      return;
    }
    const remotePosition = remote.targetPosition || remote.group.position;
    const distance = Math.hypot(remotePosition.x - potion.position.x, remotePosition.z - potion.position.z);
    if (distance > potion.pickupRadius + 1.0) {
      return;
    }
    removePotionById(potion.netId);
    if (!wantsStore) {
      remote.health = potion.fullHeal ? remote.maxHealth : Math.min(remote.maxHealth, remote.health + (potion.healAmount || 0));
      if (remote.nameTag) {
        updateNameTag(remote.nameTag, remote.nameTag.text || "Player", remote.health, remote.maxHealth);
      }
    }
    sendOnlineMessage({
      kind: "potionPicked",
      targetId: message.id,
      potionId: message.potionId,
      stored: wantsStore,
      kind: potion.kind,
      healAmount: potion.healAmount,
      fullHeal: potion.fullHeal
    });
    broadcastOnlineEffect({ type: "impact", x: potion.position.x, y: 0, z: potion.position.z, color: potionPickupColor(potion), count: 16, sfx: "potion", sfxIntensity: 0.9, sfxDistance: 36 });
  }

  function handleRemotePotionDrop(message) {
    if (online.role !== "host" || !message.state) {
      return;
    }
    upsertRemotePlayer(message.state);
    const remote = online.remotePlayers.get(message.id);
    if (!remote) {
      return;
    }
    const remotePosition = remote.targetPosition || remote.group.position;
    const x = Number.isFinite(message.x) ? message.x : remotePosition.x;
    const z = Number.isFinite(message.z) ? message.z : remotePosition.z;
    if (Math.hypot(remotePosition.x - x, remotePosition.z - z) > 4.0) {
      return;
    }
    const inArena = message.activityType === "arena"
      && arenaActivityActive()
      && arenaListIncludes(game.exploration.arenaActivity.participants, message.id);
    const inDungeon = message.activityType === "dungeon"
      && dungeonActivityActive()
      && arenaListIncludes(game.exploration.dungeonActivity.participants, message.id);
    // Host authority: clamp the requester's claimed heal/radius to the Tier III
    // maxima so a client cannot author an over-heal.
    const healCap = defaultCombatTuning.wizardPotionHealT3;
    const radiusCap = defaultCombatTuning.wizardPotionRadiusT3;
    const reqHeal = clamp(numberOrZero(message.healAmount) || defaultCombatTuning.wizardPotionHealT1, 1, healCap);
    const reqRadius = clamp(numberOrZero(message.pickupRadius) || defaultCombatTuning.wizardPotionRadiusT1, 0.9, radiusCap);
    game.potions.push(createHealthPotion(x, z, {
      kind: "wizard",
      healAmount: reqHeal,
      pickupRadius: reqRadius,
      activityType: inDungeon ? "dungeon" : inArena ? "arena" : "",
      activityId: inDungeon ? game.exploration.dungeonActivity.activityId : inArena ? game.exploration.arenaActivity.activityId : ""
    }));
    trimPotionDrops();
    playSfx("potion", 0.85);
    broadcastOnlineEffect({ type: "impact", ownerId: message.id, x, y: 0, z, color: 0x7ae8ff, count: 12, sfx: "potion", sfxIntensity: 0.85, sfxDistance: 36 });
    sendWorldSnapshot(true);
  }

  function handlePotionPicked(message) {
    if (!message || !message.potionId) {
      return;
    }
    removePotionById(message.potionId);
    if (message.targetId !== online.localId) {
      return;
    }
    if (message.stored) {
      storePotionItem(storedPotionFromMessage(message));
      return;
    }
    const beforeHeal = player.health;
    player.health = message.fullHeal ? player.maxHealth : Math.min(player.maxHealth, player.health + (message.healAmount || 0));
    const healed = Math.ceil(player.health - beforeHeal);
    spawnImpact(player.position, 0xff7f96, 18);
    playSfx("potion", message.fullHeal ? 1.15 : 0.9);
    showBanner(message.fullHeal ? "Fully recovered" : "Recovered +" + healed);
  }

  function handlePlayerDamageMessage(message) {
    if (!message || message.targetId !== online.localId) {
      return;
    }
    const direction = new THREE.Vector3(message.dx || 0, 0, message.dz || 0);
    if (direction.lengthSq() < 0.0001) {
      direction.copy(forwardFromYaw(player.yaw, direction)).multiplyScalar(-1);
    } else {
      direction.normalize();
    }
    applyPlayerDamage(message.damage || 0, message.guardDamage || 0, direction, message.extraPush || 0);
  }

  function explorationRewardForEnemy(enemy) {
    // Dragons pay out like the group encounter they now are (was 28).
    const base = enemy.type === "dragon" ? 60
      : enemy.type === "wisp" ? 14
      : enemy.type === "spider" ? 10
      : enemy.type === "briarBeast" ? 13
      : enemy.type === "banditArcher" ? 14
      : enemy.type === "sandViper" ? 13
      : enemy.type === "bonewarden" ? 16
      : enemy.type === "bogLurker" ? 15
      : 12;
    return Math.round(base * (enemy.xpMul || 1));
  }

  function explorationProgressForEnemy(enemy) {
    const progress = ["raiders"];
    if (enemy.type === "spider") {
      progress.push("spiders");
    } else if (enemy.type === "dragon") {
      progress.push("dragons");
    } else if (enemy.type === "wisp") {
      progress.push("wisps");
    } else if (enemy.type === "briarBeast") {
      progress.push("briarStalkers");
    }
    return progress;
  }

  function applyExplorationEnemyReward(enemy, sourceId) {
    const xp = explorationRewardForEnemy(enemy);
    const progress = explorationProgressForEnemy(enemy);
    if (sourceId === online.localId || !online.connected) {
      awardExplorationXp(xp);
      for (const questType of progress) {
        updateQuestProgress(questType, 1);
      }
      return;
    }
    sendOnlineMessage({
      kind: "enemyReward",
      targetId: sourceId,
      xp,
      progress
    });
  }

  function handleEnemyReward(message) {
    if (!message || message.targetId !== online.localId || game.mode !== "exploration") {
      return;
    }
    if (!messageFromKnownHost(message)) {
      return;
    }
    awardExplorationXp(message.xp || 0);
    for (const questType of message.progress || []) {
      updateQuestProgress(questType, 1);
    }
  }

  function handleOnlineMessage(raw) {
    const text = typeof raw === "string" ? raw.trim() : raw;
    if (!text) {
      if (online.role === "join" && online.hostId) {
        leaveRoomToMenu("Host disconnected", true);
      } else if (online.role === "join") {
        updateOnlineStatus("No active host yet");
      }
      return;
    }
    let message;
    try {
      message = typeof text === "string" ? JSON.parse(text) : text;
    } catch (error) {
      return;
    }
    if (!message || message.id === online.localId) {
      return;
    }
    if (online.role === "host" && message.id && online.kickedIds.has(message.id)) {
      sendOnlineMessage({ kind: "kick", targetId: message.id });
      return;
    }
    if (message.kind === "chat") {
      handleIncomingChat(message);
      return;
    }
    if (message.kind === "host" && (!message.sentAt || Date.now() - message.sentAt > 45000)) {
      return;
    }
    if (message.kind === "host") {
      online.hostId = message.id || online.hostId;
    }
    if (online.role === "join" && message.roomPhase && (message.kind === "host" || message.id === online.hostId)) {
      online.roomPhase = sanitizeRoomPhase(message.roomPhase);
      updateSessionMenu();
    }
    if (message.state && message.id) {
      message.state.id = message.id;
    }
    if (message.kind === "kick" && message.targetId === online.localId) {
      leaveRoomToMenu("Removed by host", false);
      return;
    }
    if (message.kind === "roomClosed" && online.role === "join") {
      leaveRoomToMenu("Room closed", false);
      return;
    }
    if (message.kind === "playerDamage") {
      if (!messageFromKnownHost(message)) {
        return;
      }
      handlePlayerDamageMessage(message);
      return;
    }
    if (message.kind === "enemyReward") {
      handleEnemyReward(message);
      return;
    }
    if (message.kind === "arenaReward") {
      handleArenaReward(message);
      return;
    }
    if (message.kind === "dungeonReward") {
      if (online.role === "join") {
        applyDungeonReward(message);
      }
      return;
    }
    if (message.kind === "arenaQueued") {
      if (!messageFromKnownHost(message) || message.targetId !== online.localId) {
        return;
      }
      if (message.ready) {
        showBanner("Crownring bell is open", 2.2);
      } else {
        showBanner("Queued for the next Crownring bell", 2.4);
      }
      return;
    }
    if (message.kind === "dungeonQueued") {
      if (!messageFromKnownHost(message) || message.targetId !== online.localId) {
        return;
      }
      const def = dungeonDefinition(message.dungeonId || BELLWATER_DUNGEON_ID);
      showBanner(message.ready ? def.readyCopy : def.queuedCopy, 2.6);
      return;
    }
    if (message.kind === "potionPickup") {
      handlePotionPickupRequest(message);
      return;
    }
    if (message.kind === "dropPotion") {
      handleRemotePotionDrop(message);
      return;
    }
    if (message.kind === "arenaStartRequest") {
      if (online.role !== "host" || game.mode !== "exploration" || game.state !== "playing") {
        return;
      }
      if (message.state) {
        upsertRemotePlayer(message.state);
      }
      startCrownringArenaActivity();
      return;
    }
    if (message.kind === "dungeonStartRequest") {
      if (online.role !== "host" || game.mode !== "exploration" || game.state !== "playing") {
        return;
      }
      if (message.state) {
        upsertRemotePlayer(message.state);
      }
      startDungeonActivity(message.dungeonId || BELLWATER_DUNGEON_ID);
      return;
    }
    if (message.kind === "arenaLeaveRequest" || message.kind === "arenaDefeated") {
      if (online.role !== "host") {
        return;
      }
      if (message.state) {
        upsertRemotePlayer(message.state);
      }
      removeArenaParticipant(message.id);
      return;
    }
    if (message.kind === "dungeonLeaveRequest" || message.kind === "dungeonDefeated") {
      if (online.role !== "host") {
        return;
      }
      if (message.state) {
        upsertRemotePlayer(message.state);
      }
      removeDungeonParticipant(message.id);
      return;
    }
    if (message.kind === "potionPicked") {
      if (!messageFromKnownHost(message)) {
        return;
      }
      handlePotionPicked(message);
      return;
    }
    if (message.kind === "world") {
      if (!messageFromKnownHost(message)) {
        return;
      }
      applyWorldSnapshot(message.world);
      return;
    }
    if (message.kind === "effect") {
      if (!messageFromKnownHost(message)) {
        return;
      }
      applyOnlineEffect(message.effect);
      return;
    }
    if (online.role === "join" && (message.kind === "host" || message.kind === "welcome") && message.mode && game.state !== "playing" && game.mode !== message.mode) {
      setGameMode(message.mode);
    }
    if (message.state) {
      upsertRemotePlayer(message.state);
      if (online.role === "host") {
        maybeQueueArenaLateParticipant(message.id, message.state);
        maybeQueueDungeonLateParticipant(message.id, message.state);
      }
      updateOnlineStatus(online.role === "host" ? "Player joined" : "Joined room");
      if (online.role === "join" && (game.menuPhase === "joinSetup" || game.menuPhase === "landing")) {
        setMenuPhase("joinReady");
      } else {
        updateSessionMenu();
      }
    }
    if (message.kind === "hello" && online.role === "host") {
      sendOnlineMessage({ kind: "welcome", state: serializePlayerState() });
      sendWorldSnapshot(true);
      updateSessionMenu();
    }
    if (message.kind === "state" && !message.state) {
      upsertRemotePlayer(message);
    }
    if (message.kind === "action" && message.state) {
      if (online.role === "host") {
        applyRemoteAction(message.action, message.state, { damageEnemies: true, broadcast: true });
        sendWorldSnapshot(true);
      } else if (message.id === online.hostId) {
        applyRemoteAction(message.action, message.state, { damageEnemies: false, broadcast: false });
      }
    }
  }

  function remotePalette(id) {
    const schemes = [
      { primary: 0x2d5f78, cape: 0x8d3430, trim: 0xd5aa50, robe: 0x273f78, hat: 0x1f2f5f, glow: 0x7ae8ff },
      { primary: 0x3f7f58, cape: 0x5c2d78, trim: 0xffd166, robe: 0x2d5f50, hat: 0x183d34, glow: 0x9fffd1 },
      { primary: 0x7a486f, cape: 0x255f73, trim: 0xf4a261, robe: 0x50316f, hat: 0x2b1945, glow: 0xb38cff },
      { primary: 0x7d5534, cape: 0x334f8a, trim: 0xe9c46a, robe: 0x6d3d2d, hat: 0x3b2418, glow: 0xffd889 },
      { primary: 0x526370, cape: 0x7a2f2f, trim: 0x9fd3ff, robe: 0x36506a, hat: 0x1f3345, glow: 0x9fd3ff }
    ];
    return schemes[hashString(id || "remote") % schemes.length];
  }

  function paletteMaterial(color, roughness = 0.72, metalness = 0.06) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }

  function paletteGlow(color) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  }

  function createRemoteKnightDetails(group, palette) {
    const primary = paletteMaterial(palette.primary, 0.72, 0.12);
    const capeMat = paletteMaterial(palette.cape, 0.82, 0.02);
    const trim = paletteMaterial(palette.trim, 0.42, 0.48);
    const glow = paletteGlow(palette.glow);

    const hips = makeCylinder(0.47, 0.55, 0.72, 16, materials.iron, 0, 0.76, 0);
    const chest = makeCylinder(0.58, 0.45, 0.95, 16, materials.steel.clone(), 0, 1.42, 0);
    const tabard = makeBox(0.62, 0.92, 0.07, primary, 0, 1.35, -0.49);
    const tabardTrim = makeBox(0.08, 0.78, 0.03, trim, 0, 1.34, -0.54);
    const belt = makeCylinder(0.53, 0.54, 0.12, 16, materials.darkLeather, 0, 1.02, 0);
    const beltBuckle = makeBox(0.17, 0.12, 0.05, trim, 0, 1.02, -0.49);
    const cape = makeBox(0.88, 1.22, 0.06, capeMat, 0, 1.15, 0.48);
    cape.rotation.x = -0.1;
    const capeClaspLeft = makeSphere(0.08, trim, -0.28, 1.86, 0.36);
    const capeClaspRight = makeSphere(0.08, trim, 0.28, 1.86, 0.36);
    const head = makeSphere(0.28, materials.steel.clone(), 0, 2.1, 0);
    const visor = makeBox(0.4, 0.08, 0.07, materials.iron, 0, 2.11, -0.25);
    const visorSlit = makeBox(0.3, 0.025, 0.025, glow, 0, 2.12, -0.3);
    const helmet = makeCylinder(0.13, 0.3, 0.28, 16, materials.steel.clone(), 0, 2.34, 0);
    const helmetBand = makeCylinder(0.31, 0.31, 0.08, 18, trim, 0, 2.25, 0);
    const crownRidge = makeBox(0.09, 0.44, 0.08, trim, 0, 2.48, 0);
    crownRidge.rotation.x = 0.25;
    // Plume: trim finial + three fanned cape-colored slats (mirrors local knight).
    const plumeFinial = makeCone(0.07, 0.16, 8, trim, 0, 2.56, 0.04);
    const plumeMid = makeBox(0.11, 0.6, 0.09, capeMat, 0, 2.69, 0.09);
    plumeMid.rotation.x = 0.32;
    const plumeLeft = makeBox(0.09, 0.5, 0.07, capeMat, -0.08, 2.64, 0.08);
    plumeLeft.rotation.set(0.34, 0, 0.16);
    const plumeRight = makeBox(0.09, 0.5, 0.07, capeMat, 0.08, 2.64, 0.08);
    plumeRight.rotation.set(0.34, 0, -0.16);
    const leftTasset = makeBox(0.26, 0.34, 0.3, materials.steel.clone(), -0.3, 0.62, 0);
    leftTasset.rotation.z = 0.18;
    const rightTasset = makeBox(0.26, 0.34, 0.3, materials.steel.clone(), 0.3, 0.62, 0);
    rightTasset.rotation.z = -0.18;
    const leftTasset2 = makeBox(0.22, 0.26, 0.28, materials.steel.clone(), -0.27, 0.4, 0.02);
    leftTasset2.rotation.z = 0.2;
    const rightTasset2 = makeBox(0.22, 0.26, 0.28, materials.steel.clone(), 0.27, 0.4, 0.02);
    rightTasset2.rotation.z = -0.2;
    const faulds = new THREE.Group();
    faulds.position.set(0, 1.0, 0);
    for (let i = 0; i < 4; i += 1) {
      const angle = (i - 1.5) * 0.46;
      const plate = makeBox(0.24, 0.32, 0.1, materials.steel.clone(), Math.sin(angle) * 0.44, -0.26, -Math.cos(angle) * 0.44);
      plate.rotation.set(0.12, angle, 0);
      faulds.add(plate);
    }
    const rivets = new THREE.Group();
    for (let i = 0; i < 4; i += 1) {
      rivets.add(makeSphere(0.03, trim, -0.21 + i * 0.14, 1.62, -0.44));
    }

    function makeKnightLeg(x) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.7, 0);
      const thigh = makeCylinder(0.13, 0.14, 0.4, 12, materials.iron, 0, -0.18, 0);
      const knee = makeSphere(0.13, materials.steel.clone(), 0, -0.16, -0.11);
      knee.scale.set(1, 0.62, 0.72);
      const shin = makeCylinder(0.11, 0.12, 0.4, 12, materials.iron.clone(), 0, -0.5, 0.01);
      const boot = makeBox(0.29, 0.2, 0.35, materials.darkLeather, 0, -0.73, -0.05);
      leg.add(thigh, knee, shin, boot);
      return leg;
    }
    const leftLeg = makeKnightLeg(-0.22);
    const rightLeg = makeKnightLeg(0.22);

    function makeKnightArm(x) {
      const arm = new THREE.Group();
      arm.position.set(x, 1.72, 0);
      const upper = makeCylinder(0.11, 0.1, 0.4, 12, materials.iron, 0, -0.2, 0);
      const elbow = makeSphere(0.1, materials.steel.clone(), 0, -0.4, 0);
      const forearm = makeCylinder(0.1, 0.11, 0.38, 12, materials.iron.clone(), 0, -0.58, -0.01);
      const gauntlet = makeCylinder(0.12, 0.13, 0.18, 10, materials.steel.clone(), 0, -0.68, -0.02);
      gauntlet.rotation.z = Math.PI / 2;
      const fist = makeSphere(0.12, materials.steel.clone(), 0, -0.8, -0.02);
      arm.add(upper, elbow, forearm, gauntlet, fist);
      return arm;
    }
    const leftArm = makeKnightArm(-0.58);
    const rightArm = makeKnightArm(0.58);
    const leftPauldron = makeCylinder(0.18, 0.28, 0.2, 14, materials.steel.clone(), -0.58, 1.76, 0);
    const rightPauldron = makeCylinder(0.18, 0.28, 0.2, 14, materials.steel.clone(), 0.58, 1.76, 0);
    leftPauldron.rotation.z = Math.PI / 2;
    rightPauldron.rotation.z = Math.PI / 2;

    const swordPivot = new THREE.Group();
    swordPivot.position.set(0.7, 1.27, -0.05);
    swordPivot.add(buildWeaponModel(defaultWeaponByCharacter.knight));
    swordPivot.rotation.set(-0.22, -0.24, -0.42);

    const shieldPivot = new THREE.Group();
    shieldPivot.position.set(-0.65, 1.32, -0.08);
    const shield = makeCylinder(0.42, 0.42, 0.12, 24, primary, 0, 0, -0.12);
    shield.rotation.x = Math.PI / 2;
    const shieldBoss = makeCylinder(0.13, 0.13, 0.14, 20, materials.steel.clone(), 0, 0, -0.21);
    shieldBoss.rotation.x = Math.PI / 2;
    const shieldCrossV = makeBox(0.08, 0.58, 0.035, trim, 0, 0, -0.29);
    const shieldCrossH = makeBox(0.42, 0.08, 0.035, trim, 0, 0, -0.3);
    const shieldRim = makeCylinder(0.44, 0.44, 0.045, 24, trim, 0, 0, -0.13);
    shieldRim.rotation.x = Math.PI / 2;
    shieldPivot.add(shield, shieldRim, shieldBoss, shieldCrossV, shieldCrossH);
    shieldPivot.rotation.set(0.1, 0.38, 0.0);

    group.add(
      hips, chest, tabard, tabardTrim, belt, beltBuckle, cape, capeClaspLeft, capeClaspRight,
      head, visor, visorSlit, helmet, helmetBand, crownRidge, plumeFinial, plumeMid, plumeLeft, plumeRight,
      leftTasset, rightTasset, leftTasset2, rightTasset2, faulds, rivets,
      leftLeg, rightLeg,
      leftArm, rightArm, leftPauldron, rightPauldron,
      swordPivot, shieldPivot
    );
    return { body: chest, leftLeg, rightLeg, leftArm, rightArm, weaponPivot: swordPivot, nameTagY: 3.22 };
  }

  function createRemoteWizardDetails(group, palette) {
    const robe = paletteMaterial(palette.robe, 0.78, 0.02);
    const hatMat = paletteMaterial(palette.hat, 0.76, 0.04);
    const trim = paletteMaterial(palette.trim, 0.46, 0.14);
    const capeMat = paletteMaterial(palette.cape, 0.78, 0.04);
    const glow = paletteGlow(palette.glow);

    const robeLower = makeCylinder(0.68, 0.9, 1.0, 18, robe, 0, 0.58, 0);
    const robeUpper = makeCylinder(0.48, 0.62, 0.92, 18, robe.clone(), 0, 1.33, 0);
    const sash = makeCylinder(0.56, 0.57, 0.11, 18, trim, 0, 0.96, 0);
    const frontTrim = makeBox(0.12, 1.28, 0.05, trim, 0, 0.98, -0.62);
    const shoulderWrap = makeBox(1.16, 0.18, 0.5, trim, 0, 1.75, -0.03);
    const cape = makeBox(0.92, 1.24, 0.06, capeMat, 0, 1.12, 0.49);
    cape.rotation.x = -0.12;
    const hemRing = makeCylinder(0.94, 1.02, 0.18, 18, robe.clone(), 0, 0.12, 0);
    const fold1 = makeBox(0.08, 0.92, 0.1, robe.clone(), -0.36, 0.5, -0.52);
    fold1.rotation.z = 0.05;
    const fold2 = makeBox(0.08, 0.92, 0.1, robe.clone(), 0.36, 0.5, -0.52);
    fold2.rotation.z = -0.05;
    const fold3 = makeBox(0.08, 1.0, 0.1, robe.clone(), 0, 0.48, -0.58);

    const head = makeSphere(0.26, materials.skin, 0, 2.02, 0);
    const beardTop = makeBox(0.32, 0.22, 0.09, materials.bone, 0, 1.88, -0.22);
    const beardBottom = makeBox(0.24, 0.22, 0.08, materials.bone.clone(), 0, 1.7, -0.2);
    const nose = makeBox(0.06, 0.1, 0.08, materials.skin, 0, 1.98, -0.26);
    const brow = makeBox(0.3, 0.05, 0.06, materials.skin, 0, 2.11, -0.24);
    const leftEye = makeSphere(0.032, glow, -0.08, 2.06, -0.24);
    const rightEye = makeSphere(0.032, glow.clone(), 0.08, 2.06, -0.24);
    const hatBrim = makeCylinder(0.43, 0.43, 0.08, 24, hatMat, 0, 2.23, 0);
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.82, 24), hatMat.clone());
    hatCone.position.set(0.02, 2.67, 0.02);
    hatCone.rotation.z = -0.1;
    addShadow(hatCone);
    const hatTip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.36, 16), hatMat.clone());
    hatTip.position.set(-0.12, 3.0, 0.05);
    hatTip.rotation.z = 0.66;
    addShadow(hatTip);
    const hatBand = makeCylinder(0.27, 0.3, 0.08, 18, trim, 0, 2.35, 0);
    const hatStar = makeBox(0.1, 0.1, 0.04, trim, 0, 2.4, -0.29);
    hatStar.rotation.z = Math.PI / 4;

    function makeWizLeg(x) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.5, 0);
      const thigh = makeCylinder(0.11, 0.12, 0.32, 10, materials.darkLeather, 0, -0.15, 0);
      const shin = makeCylinder(0.09, 0.1, 0.3, 10, materials.darkLeather, 0, -0.4, 0.01);
      const boot = makeBox(0.29, 0.18, 0.34, materials.darkLeather, 0, -0.54, -0.05);
      leg.add(thigh, shin, boot);
      return leg;
    }
    const leftLeg = makeWizLeg(-0.22);
    const rightLeg = makeWizLeg(0.22);

    function makeWizArm(x) {
      const arm = new THREE.Group();
      arm.position.set(x, 1.69, 0);
      const upper = makeCylinder(0.14, 0.16, 0.4, 12, robe.clone(), 0, -0.2, 0);
      const forearm = makeCylinder(0.11, 0.12, 0.36, 12, robe.clone(), 0, -0.56, 0);
      const cuff = makeCylinder(0.13, 0.14, 0.16, 12, trim, 0, -0.67, -0.02);
      cuff.rotation.z = Math.PI / 2;
      const hand = makeSphere(0.105, materials.skin, 0, -0.78, -0.03);
      const drape = makeBox(0.2, 0.32, 0.06, robe.clone(), 0, -0.42, 0.08);
      arm.add(upper, forearm, cuff, hand, drape);
      return arm;
    }
    const leftArm = makeWizArm(-0.58);
    const rightArm = makeWizArm(0.58);

    const staffPivot = new THREE.Group();
    staffPivot.position.set(0.64, 1.02, -0.08);
    staffPivot.add(buildWeaponModel(defaultWeaponByCharacter.wizard));
    staffPivot.rotation.set(0.08, 0, -0.16);

    group.add(
      robeLower, robeUpper, sash, frontTrim, shoulderWrap, cape, hemRing, fold1, fold2, fold3,
      head, beardTop, beardBottom, nose, brow, leftEye, rightEye, hatBrim, hatCone, hatTip, hatBand, hatStar,
      leftLeg, rightLeg,
      leftArm, rightArm,
      staffPivot
    );
    return { body: robeUpper, leftLeg, rightLeg, leftArm, rightArm, weaponPivot: staffPivot, nameTagY: 3.36 };
  }

  function createRemoteRangerDetails(group, palette) {
    const cloakMat = paletteMaterial(palette.cape, 0.86, 0.02);
    const hoodMat = paletteMaterial(palette.hat, 0.88, 0.02);
    const jerkin = paletteMaterial(palette.primary, 0.84, 0.04);
    const trim = paletteMaterial(palette.trim, 0.5, 0.1);
    const glow = paletteGlow(palette.glow);

    const leftLeg = makeBox(0.21, 0.74, 0.23, jerkin, -0.21, 0.32, 0);
    const rightLeg = makeBox(0.21, 0.74, 0.23, jerkin.clone(), 0.21, 0.32, 0);
    const leftBoot = makeBox(0.27, 0.2, 0.36, materials.darkLeather, -0.21, -0.03, -0.06);
    const rightBoot = makeBox(0.27, 0.2, 0.36, materials.darkLeather, 0.21, -0.03, -0.06);

    const hips = makeCylinder(0.44, 0.52, 0.62, 16, jerkin.clone(), 0, 0.78, 0);
    const chest = makeCylinder(0.52, 0.42, 0.9, 16, jerkin.clone(), 0, 1.4, 0);
    const belt = makeCylinder(0.49, 0.5, 0.11, 16, materials.darkLeather, 0, 1.0, 0);
    const beltBuckle = makeBox(0.15, 0.1, 0.05, trim, 0, 1.0, -0.45);
    const chestStrap = makeBox(0.14, 1.0, 0.06, materials.darkLeather, 0, 1.42, -0.44);
    chestStrap.rotation.z = 0.62;
    const cloak = makeBox(0.86, 1.34, 0.06, cloakMat, 0, 1.08, 0.46);
    cloak.rotation.x = -0.1;
    const shoulderMantle = makeCylinder(0.56, 0.66, 0.34, 16, hoodMat, 0, 1.78, 0);

    const head = makeSphere(0.26, materials.skin, 0, 2.04, 0);
    const leftEye = makeSphere(0.03, glow, -0.08, 2.07, -0.23);
    const rightEye = makeSphere(0.03, glow.clone(), 0.08, 2.07, -0.23);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.72, 16), hoodMat.clone());
    hood.position.set(0, 2.32, 0.07);
    hood.rotation.x = 0.34;
    addShadow(hood);
    const hoodRim = makeCylinder(0.33, 0.35, 0.16, 16, hoodMat.clone(), 0, 2.1, 0.04);
    hoodRim.rotation.x = 0.3;

    const leftArm = makeBox(0.19, 0.74, 0.21, cloakMat.clone(), -0.55, 1.36, 0);
    const rightArm = makeBox(0.19, 0.74, 0.21, cloakMat.clone(), 0.55, 1.36, 0);
    const leftHand = makeSphere(0.1, materials.skin, -0.55, 0.94, -0.03);
    const rightHand = makeSphere(0.1, materials.skin, 0.55, 0.94, -0.03);

    const quiver = new THREE.Group();
    quiver.position.set(0.3, 1.52, 0.4);
    quiver.rotation.z = 0.42;
    const quiverBody = makeCylinder(0.13, 0.11, 0.78, 10, materials.leather, 0, 0, 0);
    const quiverRim = makeCylinder(0.14, 0.14, 0.06, 10, trim.clone(), 0, 0.38, 0);
    quiver.add(quiverBody, quiverRim);
    for (let i = 0; i < 3; i += 1) {
      const shaft = makeCylinder(0.018, 0.018, 0.46, 6, materials.wood, -0.05 + i * 0.05, 0.6, (i - 1) * 0.05);
      const fletch = makeBox(0.01, 0.1, 0.07, cloakMat.clone(), -0.05 + i * 0.05, 0.82, (i - 1) * 0.05);
      quiver.add(shaft, fletch);
    }

    const bowPivot = new THREE.Group();
    bowPivot.position.set(-0.56, 1.0, -0.08);
    bowPivot.add(buildWeaponModel(defaultWeaponByCharacter.ranger));
    bowPivot.rotation.set(0, -0.3, -0.06);

    group.add(
      leftLeg, rightLeg, leftBoot, rightBoot,
      hips, chest, belt, beltBuckle, chestStrap, cloak, shoulderMantle,
      head, leftEye, rightEye, hood, hoodRim,
      leftArm, rightArm, leftHand, rightHand,
      quiver, bowPivot
    );

    return { leftLeg, rightLeg, leftArm, rightArm, body: chest, weaponPivot: bowPivot, nameTagY: 3.0 };
  }

  function createRemotePlayerModel(character, id) {
    const group = new THREE.Group();
    const rider = new THREE.Group();
    const allyMode = game.mode === "exploration";
    const palette = remotePalette(id);
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.52, 0.58, 32),
      new THREE.MeshBasicMaterial({ color: allyMode ? 0x7ae8ff : 0xff705c, transparent: true, opacity: 0.5, depthWrite: false })
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.y = 0.03;
    group.add(marker, rider);
    const details = character === "wizard"
      ? createRemoteWizardDetails(rider, palette)
      : character === "ranger"
      ? createRemoteRangerDetails(rider, palette)
      : createRemoteKnightDetails(rider, palette);
    const nameTag = createNameTag("", allyMode ? palette.glow : palette.trim);
    nameTag.sprite.position.set(0, details.nameTagY, 0);
    rider.add(nameTag.sprite);
    const horse = createHorseModel();
    horse.group.visible = false;
    horse.walkTime = Math.random() * 10;
    scene.add(horse.group);
    scene.add(group);
    return {
      group,
      rider,
      horse,
      marker,
      nameTag,
      leftLeg: details.leftLeg,
      rightLeg: details.rightLeg,
      leftArm: details.leftArm,
      rightArm: details.rightArm,
      body: details.body,
      weaponPivot: details.weaponPivot,
      renderedWeaponId: defaultWeaponByCharacter[characterKey(character)],
      character,
      modeKey: game.mode,
      targetPosition: new THREE.Vector3(),
      lastPosition: new THREE.Vector3(),
      health: 100,
      maxHealth: 100,
      mountTackId: "",
      renderedMountId: "horse",
      walkTime: 0
    };
  }

  function createNameTag(text, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 112;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(3.15, 1.1, 1);
    const tag = { canvas, texture, sprite, text: "", color, health: -1, maxHealth: -1 };
    updateNameTag(tag, text, 1, 1);
    return tag;
  }

  function updateNameTag(tag, text, health = tag.health, maxHealth = tag.maxHealth) {
    const label = sanitizePlayerName(text);
    const safeMaxHealth = Math.max(1, numberOrZero(maxHealth) || 1);
    const safeHealth = clamp(numberOrZero(health), 0, safeMaxHealth);
    const roundedHealth = Math.round(safeHealth);
    const roundedMaxHealth = Math.round(safeMaxHealth);
    if (tag.text === label && tag.health === roundedHealth && tag.maxHealth === roundedMaxHealth) {
      return;
    }
    tag.text = label;
    tag.health = roundedHealth;
    tag.maxHealth = roundedMaxHealth;
    const healthRatio = clamp(safeHealth / safeMaxHealth, 0, 1);
    const ctx = tag.canvas.getContext("2d");
    ctx.clearRect(0, 0, tag.canvas.width, tag.canvas.height);
    ctx.fillStyle = "rgba(5, 9, 11, 0.72)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 3;
    roundRect(ctx, 28, 10, 264, 44, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#" + tag.color.toString(16).padStart(6, "0");
    ctx.font = "900 23px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 160, 32, 236);

    const barX = 46;
    const barY = 68;
    const barWidth = 228;
    const barHeight = 16;
    ctx.fillStyle = "rgba(7, 12, 12, 0.74)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    roundRect(ctx, barX, barY, barWidth, barHeight, 8);
    ctx.fill();
    ctx.stroke();
    const fillWidth = Math.max(4, (barWidth - 6) * healthRatio);
    ctx.fillStyle = healthRatio > 0.55 ? "#63f28f" : healthRatio > 0.28 ? "#ffd166" : "#ff6350";
    roundRect(ctx, barX + 3, barY + 3, fillWidth, barHeight - 6, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
    ctx.font = "800 10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(roundedHealth + "/" + roundedMaxHealth, barX + barWidth - 8, barY + barHeight / 2, 78);
    tag.texture.needsUpdate = true;
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function removeRemotePlayer(remote) {
    scene.remove(remote.group);
    if (remote.horse) {
      scene.remove(remote.horse.group);
    }
  }

  function updateHorseModelLocalAnimation(model, speed, dt) {
    model.walkTime += dt * (1.4 + speed * 1.5);
    const moving = Math.min(1, speed / 7.5);
    const bob = Math.sin(model.walkTime * 2.2) * 0.045 * moving;
    for (let i = 0; i < model.legs.length; i += 1) {
      const phase = Math.sin(model.walkTime * 5.2 + i * 0.85) * 0.34 * moving;
      model.legs[i].rotation.x = phase;
    }
    model.tail.rotation.z = Math.sin(clock.elapsedTime * 3.2) * 0.12;
    animateMountWings(model, moving);
    return bob;
  }

  function upsertRemotePlayer(state) {
    let remote = online.remotePlayers.get(state.id);
    const nextCharacter = state.character || "knight";
    if (!remote || remote.character !== nextCharacter || remote.modeKey !== game.mode) {
      const previous = remote;
      const previousPosition = previous ? previous.group.position.clone() : null;
      const previousTarget = previous ? previous.targetPosition.clone() : null;
      const previousWalk = previous ? previous.walkTime : 0;
      const previousHorsePosition = previous && previous.horse ? previous.horse.group.position.clone() : null;
      if (previous) {
        removeRemotePlayer(previous);
      }
      remote = createRemotePlayerModel(nextCharacter, state.id);
      online.remotePlayers.set(state.id, remote);
      remote.group.position.copy(previousPosition || new THREE.Vector3(
        state.x || 0,
        explorationGroundWorldY(state.x || 0, state.z || 0),
        state.z || 0
      ));
      remote.targetPosition.copy(remote.group.position);
      const horseX = state.horseX ?? state.x ?? 0;
      const horseZ = state.horseZ ?? state.z ?? 0;
      remote.horse.group.position.copy(previousHorsePosition || new THREE.Vector3(
        horseX,
        explorationGroundWorldY(horseX, horseZ),
        horseZ
      ));
      remote.horseTargetPosition = remote.horse.group.position.clone();
      if (previousTarget) {
        remote.targetPosition.copy(previousTarget);
      }
      remote.walkTime = previousWalk;
    }
    remote.playing = state.playing === true;
    remote.health = state.health ?? remote.health;
    remote.maxHealth = state.maxHealth ?? remote.maxHealth;
    remote.level = clamp(Math.floor(numberOrZero(state.level) || 1), 1, 30);
    if (remote.nameTag) {
      updateNameTag(remote.nameTag, state.name || "Player", remote.health, remote.maxHealth);
    }
    const claimedProfile = sanitizedCombatProfile(nextCharacter, state.weaponId, state.perks);
    remote.combatProfile = claimedProfile;
    remote.weaponId = remote.combatProfile.weaponId;
    remote.perks = remote.combatProfile.perks.slice();
    if (remote.weaponPivot && remote.renderedWeaponId !== remote.weaponId) {
      remote.renderedWeaponId = remote.weaponId;
      remote.weaponPivot.clear();
      remote.weaponPivot.add(buildWeaponModel(remote.weaponId));
    }
    remote.targetPosition.set(
      state.x || 0,
      explorationGroundWorldY(state.x || 0, state.z || 0),
      state.z || 0
    );
    remote.targetYaw = state.yaw || 0;
    remote.hasHorse = !!state.hasHorse && game.mode === "exploration";
    remote.mountTackId = state.mountTackId === ROADWARDEN_TACK_ID ? ROADWARDEN_TACK_ID : "";
    const nextMountId = state.mountId === "drake" ? "drake" : "horse";
    if (remote.horse && remote.renderedMountId !== nextMountId) {
      const mountPosition = remote.horse.group.position.clone();
      const mountYaw = remote.horse.group.rotation.y;
      const mountWalk = remote.horse.walkTime || 0;
      scene.remove(remote.horse.group);
      remote.horse = buildMountModel(nextMountId, remote.mountTackId);
      remote.horse.walkTime = mountWalk;
      remote.horse.group.position.copy(mountPosition);
      remote.horse.group.rotation.y = mountYaw;
      remote.horse.group.visible = !!remote.hasHorse;
      scene.add(remote.horse.group);
      remote.renderedMountId = nextMountId;
    }
    setHorseTack(remote.horse, remote.mountTackId);
    remote.mounted = !!state.mounted && remote.hasHorse;
    if (!remote.horseTargetPosition) {
      remote.horseTargetPosition = new THREE.Vector3();
    }
    const targetHorseX = state.horseX ?? state.x ?? 0;
    const targetHorseZ = state.horseZ ?? state.z ?? 0;
    remote.horseTargetPosition.set(
      targetHorseX,
      explorationGroundWorldY(targetHorseX, targetHorseZ),
      targetHorseZ
    );
    remote.horseTargetYaw = state.horseYaw ?? state.yaw ?? 0;
    remote.lastSeen = clock.elapsedTime;
    updateRoomRoster();
  }

  function updateRemotePlayers(dt) {
    for (const [id, remote] of online.remotePlayers) {
      const before = remote.group.position.clone();
      remote.group.position.lerp(remote.targetPosition, 1 - Math.pow(0.0002, dt));
      remote.group.position.y = explorationGroundWorldY(remote.group.position.x, remote.group.position.z);
      remote.group.rotation.y = lerpAngle(remote.group.rotation.y, remote.targetYaw || 0, 1 - Math.pow(0.00005, dt));
      const moved = remote.group.position.distanceTo(before);
      const remoteSpeed = moved / Math.max(0.001, dt);
      updateRemoteMovementAudio(remote, id, remoteSpeed, dt);
      remote.walkTime += moved * 2.8;
      const riderEase = 1 - Math.pow(0.0001, dt);
      if (remote.rider) {
        remote.rider.position.y = lerp(remote.rider.position.y, remote.mounted ? 1.2 : 0, riderEase);
      }
      const swing = Math.sin(remote.walkTime * 7.2) * Math.min(0.28, moved * 8);
      if (remote.leftLeg && remote.rightLeg) {
        if (remote.mounted) {
          remote.leftLeg.rotation.x = lerp(remote.leftLeg.rotation.x, -0.95, riderEase);
          remote.rightLeg.rotation.x = lerp(remote.rightLeg.rotation.x, -0.95, riderEase);
        } else {
          remote.leftLeg.rotation.x = swing;
          remote.rightLeg.rotation.x = -swing;
        }
      }
      if (remote.horse) {
        remote.horse.group.visible = !!remote.hasHorse;
        if (remote.hasHorse) {
          const previousHorseX = remote.horse.group.position.x;
          const previousHorseZ = remote.horse.group.position.z;
          const horseTarget = remote.horseTargetPosition || remote.targetPosition;
          remote.horse.group.position.x = lerp(remote.horse.group.position.x, horseTarget.x, 1 - Math.pow(0.0002, dt));
          remote.horse.group.position.z = lerp(remote.horse.group.position.z, horseTarget.z, 1 - Math.pow(0.0002, dt));
          const horseMoved = Math.hypot(remote.horse.group.position.x - previousHorseX, remote.horse.group.position.z - previousHorseZ);
          const horseSpeed = horseMoved / Math.max(0.001, dt);
          remote.horse.group.position.y = explorationGroundWorldY(
            remote.horse.group.position.x,
            remote.horse.group.position.z,
            updateHorseModelLocalAnimation(remote.horse, horseSpeed, dt)
          );
          remote.horse.group.rotation.y = lerpAngle(remote.horse.group.rotation.y, remote.horseTargetYaw || 0, 1 - Math.pow(0.00005, dt));
        }
      }
      remote.marker.rotation.z += dt * 0.9;
      if (clock.elapsedTime - (remote.lastSeen || 0) > 12) {
        removeRemotePlayer(remote);
        online.remotePlayers.delete(id);
        if (online.role === "host") {
          removeArenaParticipant(id);
          removeDungeonParticipant(id);
        }
        updateRoomRoster();
      }
    }
  }

  function updateOnline(dt) {
    if (!online.connected || !online.topic) {
      return;
    }
    online.sendTimer -= dt;
    if (online.sendTimer <= 0) {
      online.sendTimer = 0.08;
      sendOnlineMessage({ kind: "state", state: serializePlayerState() });
    }
    if (online.role === "host") {
      online.worldSendTimer -= dt;
      if (online.worldSendTimer <= 0) {
        online.worldSendTimer = 0.12;
        sendWorldSnapshot();
      }
    }
    updateRemotePlayers(dt);
  }

  function pointInAttackCone(source, yaw, target, range, minDot) {
    const forward = forwardFromYaw(yaw, new THREE.Vector3());
    const toTarget = target.clone().sub(source);
    // Horizontal check: remote action sources arrive with y=0 while enemies
    // carry a terrain-height y, so a 3D distance would shrink (or kill) the
    // range on elevated ground. Local melee/ability checks are horizontal too.
    toTarget.y = 0;
    const distance = toTarget.length();
    if (distance > range || distance < 0.001) {
      return false;
    }
    toTarget.normalize();
    return forward.dot(toTarget) >= minDot;
  }

  function applyRemoteAction(action, state, options = {}) {
    const source = new THREE.Vector3(state.x || 0, 0, state.z || 0);
    const forward = forwardFromYaw(state.yaw || 0, new THREE.Vector3());
    const actionColor = action === "bash" ? 0xffd889 : action === "pierce" ? 0xff7b2e : game.mode === "exploration" ? 0x7ae8ff : 0xff705c;
    spawnImpact(source, actionColor, action === "burst" ? 18 : action === "bash" ? 14 : 10);
    if (action === "lightning" || action === "frostbind") {
      playPositionalSfx("lightning", source, 0.82, 42);
    } else if (action === "burst" || action === "stormcrown") {
      playPositionalSfx("burst", source, action === "stormcrown" ? 1.0 : 0.82, 36);
    } else if (action === "bash") {
      playPositionalSfx("bash", source, 0.82, 32);
    } else if (action === "arrow" || action === "pierce" || action === "heartseeker" || action === "parting") {
      playPositionalSfx(action === "pierce" ? "flamingArrow" : action === "heartseeker" ? "pierce" : "arrow", source, 0.8, 36);
    } else if (action === "roll") {
      playPositionalSfx("roll", source, 0.7, 24);
    } else if (action === "resolve") {
      playPositionalSfx("block", source, 0.8, 28);
    } else {
      playPositionalSfx("slash", source, 0.78, 30);
    }
    if (action === "lightning" || action === "frostbind") {
      spawnRemoteLightningVisual(source, state.yaw || 0);
    } else if (action === "arrow" || action === "pierce" || action === "heartseeker") {
      spawnRemoteArrowVisual(source, state.yaw || 0, action === "pierce" ? "flaming" : action === "heartseeker" ? "heartseeker" : "arrow");
    }
    if (options.broadcast) {
      broadcastOnlineEffect({ type: "action", ownerId: state.id || "", action, state });
    }

    if (options.damageEnemies && game.mode === "exploration") {
      applyRemoteActionToEnemies(action, source, state.yaw || 0, forward, state);
    }
  }

  function applyRemoteActionToEnemies(action, source, yaw, forward, state = {}) {
    const sourceId = state.id || online.localId;
    const activity = activeCombatActivity();
    if (activity && !arenaListIncludes(activity.participants, sourceId)) {
      return;
    }
    const matchesActivity = enemy => !activity || enemy.activityId === activity.activityId;
    const remote = sourceId !== online.localId ? online.remotePlayers.get(sourceId) : null;
    const profile = remote && remote.combatProfile
      ? remote.combatProfile
      : sanitizedCombatProfile(state.character, state.weaponId, state.perks);
    const tuning = combatTuningFor(profile.character, {
      weaponId: profile.weaponId,
      perks: profile.perks
    });
    if (action === "burst" || action === "stormcrown") {
      const crown = action === "stormcrown";
      const radius = crown ? tuning.stormcrownRadius + 0.1 : 3.45;
      for (const enemy of game.enemies) {
        if (!enemy.dead && matchesActivity(enemy) && Math.hypot(enemy.position.x - source.x, enemy.position.z - source.z) < radius + enemy.radius) {
          const direction = enemy.position.clone().sub(source);
          direction.y = 0;
          direction.normalize();
          const damage = crown ? tuning.stormcrownDamageMin : Math.max(16, tuning.burstDamageMin - 4);
          damageEnemy(enemy, damage, direction, crown ? 0.6 : 0.55, sourceId);
          if (crown) {
            enemy.velocity.addScaledVector(direction, 3.5);
          }
        }
      }
      return;
    }

    if (action === "resolve") {
      return;
    }

    if (action === "sweep" || action === "parting") {
      const sweep = action === "sweep";
      const range = sweep ? tuning.sweepRange : 2.5;
      const minDot = sweep ? 0.26 : 0.5;
      for (const enemy of game.enemies) {
        if (enemy.dead || !matchesActivity(enemy) || !pointInAttackCone(source, yaw, enemy.position.clone(), range + enemy.radius, minDot)) {
          continue;
        }
        const damage = sweep ? tuning.sweepDamageMin : tuning.partingDamageMin;
        damageEnemy(enemy, damage, forward, sweep ? tuning.sweepStun : 0.4, sourceId);
        enemy.velocity.addScaledVector(forward, sweep ? 4.6 : 7.5);
      }
      return;
    }

    if (action === "frostbind") {
      for (const enemy of game.enemies) {
        if (enemy.dead || !matchesActivity(enemy) || !pointInAttackCone(source, yaw, enemy.position.clone(), 16 + enemy.radius, 0.86)) {
          continue;
        }
        damageEnemy(enemy, tuning.frostbindDamageMin, forward, tuning.frostbindStun, sourceId);
      }
      return;
    }

    if (action === "bash") {
      for (const enemy of game.enemies) {
        if (enemy.dead || !matchesActivity(enemy) || !pointInAttackCone(source, yaw, enemy.position.clone(), 2.55 + enemy.radius, 0.24)) {
          continue;
        }
        damageEnemy(enemy, tuning.bashDamageMin, forward, tuning.bashKnockback, sourceId);
        enemy.velocity.addScaledVector(forward, tuning.bashVelocity);
      }
      return;
    }

    if (action === "roll") {
      return;
    }

    if (action === "pierce") {
      // Flaming Arrow keeps the legacy `pierce` action id for compatibility.
      for (const enemy of game.enemies) {
        if (enemy.dead || !matchesActivity(enemy) || !pointInAttackCone(source, yaw, enemy.position.clone(), 16 + enemy.radius, 0.86)) {
          continue;
        }
        damageEnemy(enemy, tuning.pierceDamageMin, forward, 0.4, sourceId);
        spawnImpact(enemy.group ? enemy.group.position : enemy.position, 0xff7b2e, 8);
        playPositionalSfx("flamingArrowImpact", enemy.group ? enemy.group.position : enemy.position, 0.55, 34);
      }
      return;
    }

    let best = null;
    let bestDistance = Infinity;
    const range = action === "lightning" ? tuning.remoteLightningRange
      : action === "arrow" ? 15
      : action === "heartseeker" ? 18
      : tuning.slashRange + 0.15;
    const minDot = action === "lightning" ? 0.34 : action === "arrow" ? 0.6 : action === "heartseeker" ? 0.85 : 0.18;
    for (const enemy of game.enemies) {
      if (enemy.dead || !matchesActivity(enemy) || !pointInAttackCone(source, yaw, enemy.position.clone(), range + enemy.radius, minDot)) {
        continue;
      }
      const distance = Math.hypot(enemy.position.x - source.x, enemy.position.z - source.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }
    if (best) {
      const damage = action === "lightning"
        ? tuning.lightningDamageMin + tuning.lightningDamageBonus - 1
        : action === "arrow"
        ? tuning.arrowDamageMin + tuning.arrowDamageBonus - 2
        : action === "heartseeker"
        ? tuning.heartseekerDamageMin
        : tuning.slashDamageMin + tuning.slashDamageBonus - 4;
      damageEnemy(best, damage, forward, action === "lightning" ? 0.35 : action === "arrow" ? 0.25 : action === "heartseeker" ? 0.8 : tuning.slashKnockback, sourceId);
    }
  }

  function applyRemoteActionToPlayer(action, source, yaw, forward) {
    if (player.health <= 0) {
      return;
    }
    let hit = false;
    if (action === "roll" || action === "resolve") {
      return;
    }
    if (action === "burst" || action === "stormcrown") {
      hit = player.position.distanceTo(source) < (action === "stormcrown" ? 5.2 : 3.35);
    } else {
      const range = action === "lightning" ? 14.0
        : action === "arrow" ? 13.0
        : action === "pierce" || action === "frostbind" ? 15.0
        : action === "heartseeker" ? 16.0
        : action === "bash" ? 2.55
        : action === "sweep" ? 3.2
        : action === "parting" ? 2.5
        : 2.7;
      const minDot = action === "lightning" ? 0.55
        : action === "arrow" || action === "pierce" || action === "frostbind" ? 0.72
        : action === "heartseeker" ? 0.85
        : action === "bash" ? 0.24
        : action === "sweep" ? 0.26
        : action === "parting" ? 0.5
        : 0.18;
      hit = pointInAttackCone(source, yaw, player.position.clone(), range, minDot);
    }
    if (!hit) {
      return;
    }
    const damage = action === "lightning" ? 22
      : action === "burst" ? 18
      : action === "arrow" ? 17
      : action === "pierce" ? 24
      : action === "bash" ? 14
      : action === "sweep" ? 16
      : action === "frostbind" ? 10
      : action === "stormcrown" ? 26
      : action === "parting" ? 10
      : action === "heartseeker" ? 32
      : 24;
    const guardDamage = action === "bash" ? 36 : damage + 12;
    applyPlayerDamage(damage, guardDamage, forward, action === "bash" ? 0.32 : action === "burst" ? 0.18 : 0.08);
  }

  function playerHasNearbyCombatThreat() {
    const threatRadiusSq = PLAYER_REGEN_THREAT_RADIUS * PLAYER_REGEN_THREAT_RADIUS;
    for (const enemy of game.enemies) {
      if (!enemy || enemy.dead) {
        continue;
      }
      const dx = player.position.x - enemy.position.x;
      const dz = player.position.z - enemy.position.z;
      if (dx * dx + dz * dz <= threatRadiusSq) {
        return true;
      }
    }
    return false;
  }

  function playerHasActiveCombatIntent() {
    return player.attacking
      || player.rollTimer > 0
      || game.playerProjectiles.some(projectile => !projectile.visualOnly);
  }

  function updatePlayerHealthRegen(dt) {
    if (game.state !== "playing" || player.health <= 0 || player.health >= player.maxHealth || player.maxHealth <= 0) {
      return;
    }
    const inCombat = game.mode !== "exploration"
      || localPlayerInSharedActivity()
      || playerHasActiveCombatIntent()
      || playerHasNearbyCombatThreat();
    if (inCombat) {
      player.combatRegenDelay = PLAYER_REGEN_DELAY;
      return;
    }
    if (player.combatRegenDelay > 0) {
      player.combatRegenDelay = Math.max(0, player.combatRegenDelay - dt);
      return;
    }
    player.health = Math.min(player.maxHealth, player.health + PLAYER_REGEN_RATE * dt);
  }

  function combatTargets() {
    const activity = activeCombatActivity();
    const activityActive = !!activity;
    const targets = [];
    if (!activityActive || arenaListIncludes(activity.participants, online.localId)) {
      targets.push({
        id: online.localId,
        local: true,
        position: player.position,
        health: player.health,
        maxHealth: player.maxHealth
      });
    }
    if (online.role === "host") {
      for (const [id, remote] of online.remotePlayers) {
        if (activityActive && !arenaListIncludes(activity.participants, id)) {
          continue;
        }
        targets.push({
          id,
          local: false,
          position: remote.targetPosition || remote.group.position,
          health: remote.health,
          maxHealth: remote.maxHealth
        });
      }
    }
    return targets.filter(target => target.health > 0);
  }

  function combatTargetById(id) {
    const activity = activeCombatActivity();
    if (activity && !arenaListIncludes(activity.participants, id || online.localId)) {
      return null;
    }
    if (!id || id === online.localId) {
      return {
        id: online.localId,
        local: true,
        position: player.position,
        health: player.health,
        maxHealth: player.maxHealth
      };
    }
    const remote = online.remotePlayers.get(id);
    if (!remote) {
      return null;
    }
    return {
      id,
      local: false,
      position: remote.targetPosition || remote.group.position,
      health: remote.health,
      maxHealth: remote.maxHealth
    };
  }

  // Ground (feet) height for a combat target. The local player's logical
  // position keeps y = 0 while the body rides the terrain, whereas remote
  // player target positions already carry a terrain-anchored y. Enemy
  // projectiles must aim/test against this anchor, not absolute world heights.
  function combatTargetGroundY(target) {
    if (!target || target.local) {
      return explorationGroundWorldY(player.position.x, player.position.z);
    }
    return target.position.y;
  }

  function nearestCombatTarget(enemy) {
    let best = null;
    let bestDistance = Infinity;
    for (const target of combatTargets()) {
      const distance = enemy.position.distanceTo(target.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = target;
      }
    }
    return best || combatTargetById(online.localId);
  }

  function applyCombatTargetDamage(target, damage, guardDamage, direction, extraPush) {
    if (!target) {
      return;
    }
    if (target.local) {
      applyPlayerDamage(damage, guardDamage, direction, extraPush);
      return;
    }
    sendOnlineMessage({
      kind: "playerDamage",
      targetId: target.id,
      damage,
      guardDamage,
      dx: direction.x,
      dz: direction.z,
      extraPush
    });
    const remote = online.remotePlayers.get(target.id);
    if (remote) {
      remote.health = Math.max(0, remote.health - damage);
      if (remote.nameTag) {
        updateNameTag(remote.nameTag, remote.nameTag.text || "Player", remote.health, remote.maxHealth);
      }
    }
    const impact = target.position.clone();
    spawnImpact(impact, 0xff6350, 12);
    broadcastOnlineEffect({ type: "impact", x: impact.x, y: 0, z: impact.z, color: 0xff6350, count: 12 });
  }

  function createBarbarianModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const hips = makeCylinder(0.44, 0.52, 0.62, 14, materials.leather, 0, 0.68, 0);
    const chest = makeCylinder(0.55, 0.45, 0.92, 14, materials.skin, 0, 1.34, 0);
    // Defined ab/chest plate sits on the front of the torso for muscle relief.
    const abPlate = makeBox(0.6, 0.62, 0.16, materials.skin.clone(), 0, 1.2, -0.34);
    const fur = makeBox(1.12, 0.24, 0.66, materials.fur, 0, 1.84, 0);
    // Back fur cape flap hangs off the shoulders.
    const capeFlap = makeBox(0.84, 0.98, 0.1, materials.fur.clone(), 0, 1.4, 0.34);
    capeFlap.rotation.x = 0.12;
    // Tunic skirt flares under the belt over the hips.
    const tunicSkirt = makeCylinder(0.5, 0.66, 0.5, 14, materials.leather.clone(), 0, 0.74, 0);

    const head = makeSphere(0.28, materials.skin, 0, 2.1, 0);
    const cheekL = makeBox(0.11, 0.11, 0.12, materials.skin.clone(), -0.18, 2.05, -0.18);
    const cheekR = makeBox(0.11, 0.11, 0.12, materials.skin.clone(), 0.18, 2.05, -0.18);
    // Braided beard built from three stacked, tapering fur boxes.
    const beard1 = makeBox(0.38, 0.2, 0.13, materials.fur, 0, 1.98, -0.22);
    const beard2 = makeBox(0.3, 0.18, 0.11, materials.fur.clone(), 0, 1.82, -0.2);
    const beard3 = makeBox(0.18, 0.16, 0.09, materials.fur.clone(), 0, 1.67, -0.18);
    const hair = makeCylinder(0.22, 0.29, 0.24, 12, materials.fur, 0, 2.33, 0);
    const leftEye = makeSphere(0.035, materials.emberEye, -0.09, 2.14, -0.24);
    const rightEye = makeSphere(0.035, materials.emberEye, 0.09, 2.14, -0.24);
    const nose = makeBox(0.06, 0.09, 0.08, materials.skin, 0, 2.07, -0.28);
    const warPaint = makeBox(0.38, 0.035, 0.025, materials.warPaint, 0, 2.18, -0.27);
    const warPaint2 = makeBox(0.3, 0.03, 0.025, materials.warPaint.clone(), 0, 2.01, -0.26);
    const helmetBand = makeCylinder(0.31, 0.31, 0.12, 16, materials.iron, 0, 2.28, 0);
    const hornLeft = makeCylinder(0.03, 0.11, 0.42, 8, materials.bone, -0.26, 2.34, -0.08);
    const hornRight = makeCylinder(0.03, 0.11, 0.42, 8, materials.bone, 0.26, 2.34, -0.08);
    hornLeft.rotation.set(-0.18, -0.34, 1.0);
    hornRight.rotation.set(-0.18, 0.34, -1.0);

    // Hip-pivot leg Group: origin at the hip so the generic melee state machine's
    // per-frame rotation.x swings the whole leg from the top, not the middle.
    function makeLeg(x) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.66, 0);
      const thigh = makeCylinder(0.14, 0.16, 0.42, 10, materials.leather.clone(), 0, -0.21, 0);
      const loin = makeBox(0.26, 0.28, 0.16, materials.fur.clone(), 0, -0.06, -0.12);
      const shin = makeCylinder(0.1, 0.12, 0.4, 10, materials.darkLeather, 0, -0.58, 0.01);
      const boot = makeBox(0.28, 0.18, 0.34, materials.darkLeather, 0, -0.78, -0.04);
      leg.add(thigh, loin, shin, boot);
      return leg;
    }
    const leftLeg = makeLeg(-0.23);
    const rightLeg = makeLeg(0.23);

    // Shoulder-pivot arms with upper-arm, forearm, and a fist. Not animated by the
    // melee state machine, but structured to match the quality bar.
    function makeArm(x) {
      const arm = new THREE.Group();
      arm.position.set(x, 1.6, 0);
      const upper = makeCylinder(0.12, 0.11, 0.4, 10, materials.skin.clone(), 0, -0.2, 0);
      const forearm = makeCylinder(0.11, 0.1, 0.38, 10, materials.skin.clone(), 0, -0.56, 0);
      const fist = makeSphere(0.13, materials.skin.clone(), 0, -0.78, 0);
      arm.add(upper, forearm, fist);
      return arm;
    }
    const leftArm = makeArm(-0.58);
    const rightArm = makeArm(0.58);

    const belt = makeCylinder(0.5, 0.52, 0.12, 14, materials.darkLeather, 0, 0.98, 0);
    const buckle = makeBox(0.18, 0.12, 0.06, materials.gold, 0, 0.98, -0.44);
    const leftShoulder = makeCylinder(0.17, 0.24, 0.18, 12, materials.iron, -0.56, 1.68, 0);
    const rightShoulder = makeCylinder(0.17, 0.24, 0.18, 12, materials.iron, 0.56, 1.68, 0);
    leftShoulder.rotation.z = Math.PI / 2;
    rightShoulder.rotation.z = Math.PI / 2;
    const leftBracer = makeCylinder(0.12, 0.12, 0.18, 10, materials.darkLeather, -0.58, 1.02, -0.01);
    const rightBracer = makeCylinder(0.12, 0.12, 0.18, 10, materials.darkLeather, 0.58, 1.02, -0.01);
    leftBracer.rotation.z = Math.PI / 2;
    rightBracer.rotation.z = Math.PI / 2;

    const weaponPivot = new THREE.Group();
    weaponPivot.position.set(0.63, 1.36, -0.04);
    const haft = makeCylinder(0.045, 0.045, 1.44, 8, materials.wood, 0, 0, -0.52);
    haft.rotation.x = Math.PI / 2;
    const axe = makeBox(0.56, 0.4, 0.08, materials.iron, 0, 0.18, -1.15);
    axe.rotation.z = 0.26;
    const axeSpike = makeCylinder(0.025, 0.08, 0.34, 8, materials.iron, 0, 0.42, -1.12);
    axeSpike.rotation.z = Math.PI;
    const gripWrapTop = makeCylinder(0.052, 0.052, 0.12, 8, materials.darkLeather, 0, 0, -0.2);
    const gripWrapBottom = makeCylinder(0.052, 0.052, 0.12, 8, materials.darkLeather, 0, 0, -0.78);
    gripWrapTop.rotation.x = Math.PI / 2;
    gripWrapBottom.rotation.x = Math.PI / 2;
    // Leather thong dangling from the haft.
    const haftThong = makeBox(0.012, 0.16, 0.05, materials.darkLeather.clone(), 0, -0.1, -0.46);
    weaponPivot.add(haft, axe, axeSpike, gripWrapTop, gripWrapBottom, haftThong);
    weaponPivot.rotation.set(-0.12, -0.3, -0.7);

    const healthRoot = new THREE.Group();
    healthRoot.position.set(0, 2.7, 0);
    const hpBack = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.08), new THREE.MeshBasicMaterial({ color: 0x240c0b, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.045), new THREE.MeshBasicMaterial({ color: 0xff6a5d, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    hpFill.position.z = 0.003;
    hpFill.position.x = 0;
    healthRoot.add(hpBack, hpFill);

    const telegraph = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.8, 32), materials.danger.clone());
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = 0.025;
    telegraph.visible = false;

    group.add(
      hips, chest, abPlate, fur, capeFlap, tunicSkirt,
      head, cheekL, cheekR, beard1, beard2, beard3, hair, leftEye, rightEye, nose, warPaint, warPaint2,
      helmetBand, hornLeft, hornRight,
      leftLeg, rightLeg, leftArm, rightArm, belt, buckle, leftShoulder, rightShoulder,
      leftBracer, rightBracer, weaponPivot, healthRoot, telegraph
    );

    return { group, weaponPivot, healthRoot, hpFill, telegraph, leftLeg, rightLeg, chest };
  }

  function makeWing(side) {
    const wing = new THREE.Group();
    // Wing keypoints: root at the shoulder, fanning to the wingtip and trailing edge.
    const root = [0, 0.04, 0];
    const tip = [side * 3.05, 0.26, -0.48];
    const mid = [side * 1.96, 0.04, -1.18];
    const trailFar = [side * 1.34, -0.18, -1.98];
    const trailNear = [side * 0.28, -0.02, -0.82];
    // Membrane split into three panels for a bat-wing silhouette instead of a flat quad.
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([...root, ...tip, ...mid, ...trailFar, ...trailNear]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 2, 0, 2, 4, 2, 3, 4]);
    geometry.computeVertexNormals();
    const membrane = new THREE.Mesh(geometry, materials.dragonWing);
    membrane.castShadow = true;
    membrane.receiveShadow = true;
    wing.add(membrane);

    // Bone finger-struts fanning out from the root along the membrane ribs.
    const rootV = new THREE.Vector3(root[0], root[1], root[2]);
    for (const finger of [tip, mid, trailFar]) {
      const dir = new THREE.Vector3(finger[0], finger[1], finger[2]).sub(rootV);
      const len = dir.length();
      const strut = makeCylinder(0.028, 0.016, len, 6, materials.bone, 0, 0, 0);
      strut.position.copy(rootV).addScaledVector(dir, 0.5);
      strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      wing.add(strut);
    }
    return wing;
  }

  function createDragonModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const body = makeCylinder(0.54, 0.76, 2.05, 18, materials.dragonScale, 0, 0, 0);
    body.rotation.x = Math.PI / 2;
    const belly = makeBox(0.64, 0.12, 1.36, materials.dragonBelly, 0, -0.31, -0.12);
    // Three tapered, curving neck segments so the head reaches forward to the
    // mouth point (~z -2.0) that launchFireball reads via group.localToWorld.
    const neck1 = makeCylinder(0.3, 0.36, 0.52, 14, materials.dragonScale, 0, 0.16, -0.76);
    neck1.rotation.x = 0.5;
    const neck2 = makeCylinder(0.25, 0.3, 0.48, 14, materials.dragonScale, 0, 0.42, -1.12);
    neck2.rotation.x = 0.74;
    const neck3 = makeCylinder(0.21, 0.26, 0.44, 14, materials.dragonScale, 0, 0.62, -1.42);
    neck3.rotation.x = 0.96;
    const head = makeSphere(0.42, materials.dragonScale, 0, 0.68, -1.54);
    head.scale.set(1.18, 0.88, 1.12);
    const snout = makeBox(0.54, 0.26, 0.54, materials.dragonScale, 0, 0.58, -1.96);
    const upperJaw = makeBox(0.5, 0.14, 0.58, materials.dragonScale, 0, 0.64, -2.12);
    const lowerJaw = makeBox(0.48, 0.11, 0.48, materials.dragonBelly, 0, 0.45, -2.1);
    // Lower-jaw teeth ride as children so they swing open with the jaw hinge.
    for (let i = -1; i <= 1; i += 1) {
      const tooth = makeCone(0.028, 0.13, 5, materials.bone, i * 0.15, 0.07, -0.18);
      lowerJaw.add(tooth);
    }
    const leftEye = makeSphere(0.06, materials.dragonEye, -0.2, 0.75, -1.9);
    const rightEye = makeSphere(0.06, materials.dragonEye, 0.2, 0.75, -1.9);
    // Brow ridges over the eyes and nostril dots on the snout for a meaner head.
    const browLeft = makeBox(0.18, 0.06, 0.16, materials.dragonScale, -0.2, 0.84, -1.9);
    browLeft.rotation.set(0.1, 0, 0.22);
    const browRight = makeBox(0.18, 0.06, 0.16, materials.dragonScale, 0.2, 0.84, -1.9);
    browRight.rotation.set(0.1, 0, -0.22);
    const nostrilLeft = makeSphere(0.035, materials.dragonScale, -0.11, 0.62, -2.2);
    const nostrilRight = makeSphere(0.035, materials.dragonScale, 0.11, 0.62, -2.2);
    const hornLeft = makeCylinder(0.022, 0.085, 0.56, 8, materials.bone || materials.gold, -0.21, 0.98, -1.46);
    const hornRight = makeCylinder(0.022, 0.085, 0.56, 8, materials.bone || materials.gold, 0.21, 0.98, -1.46);
    hornLeft.rotation.set(-0.82, -0.22, 0.18);
    hornRight.rotation.set(-0.82, 0.22, -0.18);

    // Segmented tail: four decreasing cylinders sweeping back to a cone tip, each
    // crowned with a bone spike so the ridge runs the full length of the dragon.
    const tailSegmentsGroup = new THREE.Group();
    const tailSegData = [
      [0.34, 0.4, 0.52, 1.18, 0.12],
      [0.26, 0.32, 0.5, 1.62, 0.24],
      [0.18, 0.24, 0.48, 2.04, 0.36],
      [0.1, 0.17, 0.44, 2.4, 0.48]
    ];
    for (const [rt, rb, h, z, droop] of tailSegData) {
      const seg = makeCylinder(rt, rb, h, 12, materials.dragonScale, 0, -0.02 - droop * 0.12, z);
      seg.rotation.x = Math.PI / 2 + droop;
      const spike = makeCylinder(0.012, 0.05, 0.16, 6, materials.bone, 0, 0.18 - droop * 0.1, z - 0.04);
      spike.rotation.x = -0.2;
      tailSegmentsGroup.add(seg, spike);
    }
    const tailTip = makeCone(0.12, 0.5, 10, materials.dragonScale, 0, -0.28, 2.78);
    tailTip.rotation.x = -(Math.PI / 2 + 0.6);

    const leftWing = new THREE.Group();
    leftWing.position.set(-0.48, 0.3, -0.2);
    leftWing.add(makeWing(-1));
    const rightWing = new THREE.Group();
    rightWing.position.set(0.48, 0.3, -0.2);
    rightWing.add(makeWing(1));

    const leftClaw = makeBox(0.2, 0.15, 0.64, materials.dragonScale, -0.38, -0.38, -0.58);
    const rightClaw = makeBox(0.2, 0.15, 0.64, materials.dragonScale, 0.38, -0.38, -0.58);
    leftClaw.rotation.x = -0.5;
    rightClaw.rotation.x = -0.5;
    const rearLeftLeg = makeBox(0.2, 0.56, 0.2, materials.dragonScale, -0.45, -0.46, 0.52);
    const rearRightLeg = makeBox(0.2, 0.56, 0.2, materials.dragonScale, 0.45, -0.46, 0.52);
    const rearLeftFoot = makeBox(0.28, 0.13, 0.5, materials.dragonBelly, -0.45, -0.78, 0.3);
    const rearRightFoot = makeBox(0.28, 0.13, 0.5, materials.dragonBelly, 0.45, -0.78, 0.3);
    rearLeftLeg.rotation.x = 0.18;
    rearRightLeg.rotation.x = 0.18;
    rearLeftFoot.rotation.x = -0.18;
    rearRightFoot.rotation.x = -0.18;

    const spineSpikes = new THREE.Group();
    const spikePositions = [
      [0, 0.66, -1.42, 0.14],
      [0, 0.74, -1.1, 0.18],
      [0, 0.9, -1.18, 0.22],
      [0, 0.68, -0.72, 0.26],
      [0, 0.58, -0.18, 0.3],
      [0, 0.5, 0.36, 0.26],
      [0, 0.42, 0.88, 0.22],
      [0, 0.32, 1.34, 0.18],
      [0, 0.24, 1.76, 0.14]
    ];
    for (const [x, y, z, height] of spikePositions) {
      const spike = makeCylinder(0.015, height * 0.32, height, 8, materials.bone, x, y, z);
      spike.rotation.x = z > 1 ? -0.3 : z < -0.9 ? 0.42 : 0.08;
      spineSpikes.add(spike);
    }

    const mouthGlow = makeSphere(0.13, materials.fireCore.clone(), 0, 0.52, -2.24);
    mouthGlow.material.transparent = true;
    mouthGlow.visible = false;

    const healthRoot = new THREE.Group();
    healthRoot.position.set(0, 1.58, 0.16);
    const hpBack = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.08), new THREE.MeshBasicMaterial({ color: 0x240c0b, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(1.01, 0.045), new THREE.MeshBasicMaterial({ color: 0xffa35d, transparent: true, opacity: 0.94, side: THREE.DoubleSide }));
    hpFill.position.z = 0.003;
    healthRoot.add(hpBack, hpFill);

    group.add(body, belly, neck1, neck2, neck3, head, snout, upperJaw, lowerJaw, leftEye, rightEye, browLeft, browRight, nostrilLeft, nostrilRight, hornLeft, hornRight, tailSegmentsGroup, tailTip, leftWing, rightWing, leftClaw, rightClaw, rearLeftLeg, rearRightLeg, rearLeftFoot, rearRightFoot, spineSpikes, mouthGlow, healthRoot);

    return { group, body, leftWing, rightWing, lowerJaw, mouthGlow, healthRoot, hpFill };
  }

  function createSpiderModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const abdomen = makeSphere(0.44, materials.spiderCarapace, 0, 0.54, 0.24);
    abdomen.scale.set(1.18, 0.7, 1.3);
    const thorax = makeSphere(0.32, materials.spiderCarapace.clone(), 0, 0.55, -0.32);
    thorax.scale.set(1.04, 0.66, 0.92);
    const head = makeSphere(0.22, materials.spiderCarapace.clone(), 0, 0.52, -0.69);
    head.scale.set(1.05, 0.78, 0.8);
    const marking = makeBox(0.34, 0.035, 0.18, materials.spiderMarking, 0, 0.84, 0.3);
    const leftEye = makeSphere(0.04, materials.emberEye, -0.09, 0.64, -0.83);
    const rightEye = makeSphere(0.04, materials.emberEye, 0.09, 0.64, -0.83);
    const leftFang = makeCone(0.045, 0.18, 8, materials.bone, -0.08, 0.36, -0.87);
    const rightFang = makeCone(0.045, 0.18, 8, materials.bone, 0.08, 0.36, -0.87);
    leftFang.rotation.x = Math.PI;
    rightFang.rotation.x = Math.PI;

    const legs = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 4; i += 1) {
        const z = -0.46 + i * 0.25;
        const leg = makeCylinder(0.032, 0.045, 0.78, 7, materials.spiderCarapace.clone(), side * 0.42, 0.42, z);
        leg.rotation.z = side * (Math.PI / 2.35);
        leg.rotation.x = (i - 1.5) * 0.16;
        const shin = makeCylinder(0.026, 0.036, 0.56, 7, materials.spiderCarapace.clone(), side * 0.78, 0.24, z + (i - 1.5) * 0.1);
        shin.rotation.z = side * (Math.PI / 2.7);
        shin.rotation.x = (i - 1.5) * 0.22;
        legs.push(leg, shin);
        group.add(leg, shin);
      }
    }

    const healthRoot = new THREE.Group();
    healthRoot.position.set(0, 1.26, 0);
    const hpBack = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.08), new THREE.MeshBasicMaterial({ color: 0x240c0b, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.045), new THREE.MeshBasicMaterial({ color: 0xd9a648, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    hpFill.position.z = 0.003;
    healthRoot.add(hpBack, hpFill);

    const telegraph = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.73, 32), materials.danger.clone());
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = 0.025;
    telegraph.visible = false;

    group.add(abdomen, thorax, head, marking, leftEye, rightEye, leftFang, rightFang, healthRoot, telegraph);
    return { group, body: abdomen, legs, healthRoot, hpFill, telegraph };
  }

  function createWispModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const floatRoot = new THREE.Group();
    floatRoot.position.y = 0.98;
    // Nested translucent shells produce a layered glow falloff (outer -> core).
    const outerShell = makeSphere(0.58, materials.wisp.clone(), 0, 0, 0);
    outerShell.material.opacity = 0.16;
    outerShell.scale.set(1.0, 1.14, 1.0);
    const shell = makeSphere(0.42, materials.wisp.clone(), 0, 0, 0);
    shell.scale.set(1.0, 1.18, 1.0);
    const midHalo = makeSphere(0.27, materials.wisp.clone(), 0, 0, 0);
    midHalo.material.opacity = 0.3;
    const core = makeSphere(0.16, materials.wispCore.clone(), 0, 0, 0);
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.014, 8, 28), materials.wispCore.clone());
    ringA.rotation.x = Math.PI / 2;
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 8, 24), materials.wisp.clone());
    ringB.rotation.y = Math.PI / 2;
    const ringC = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.01, 8, 26), materials.wispCore.clone());
    ringC.rotation.set(Math.PI / 3, 0, Math.PI / 4);
    const sparks = [];
    for (let i = 0; i < 4; i += 1) {
      const spark = makeSphere(0.055, materials.wispCore.clone(), 0, 0, 0);
      sparks.push(spark);
      floatRoot.add(spark);
    }
    // Trailing wake of shrinking motes dragged behind the wisp by its velocity.
    const trail = [];
    for (let i = 0; i < 5; i += 1) {
      const mote = makeSphere(0.05, materials.wispCore.clone(), 0, 0, 0);
      mote.material.opacity = Math.max(0.06, 0.5 - i * 0.1);
      trail.push(mote);
      floatRoot.add(mote);
    }
    // Slow-drifting ember motes that flicker for extra ethereal life.
    const embers = [];
    for (let i = 0; i < 3; i += 1) {
      const ember = makeSphere(0.03, materials.wispCore.clone(), 0, 0, 0);
      embers.push(ember);
      floatRoot.add(ember);
    }
    const glow = new THREE.PointLight(0x8affd2, 1.25, 5.5, 1.9);
    floatRoot.add(outerShell, shell, midHalo, core, ringA, ringB, ringC, glow);

    const healthRoot = new THREE.Group();
    healthRoot.position.set(0, 1.72, 0);
    const hpBack = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.08), new THREE.MeshBasicMaterial({ color: 0x081713, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.045), new THREE.MeshBasicMaterial({ color: 0x8affd2, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    hpFill.position.z = 0.003;
    healthRoot.add(hpBack, hpFill);

    const telegraph = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.04, 34), materials.danger.clone());
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = 0.026;
    telegraph.visible = false;

    group.add(floatRoot, healthRoot, telegraph);
    return { group, floatRoot, shell, core, ringA, ringB, ringC, sparks, trail, embers, healthRoot, hpFill, telegraph };
  }

  function makeCreatureHealthBar(yOffset, fillColor, backColor = 0x1c150a, width = 0.86) {
    const healthRoot = new THREE.Group();
    healthRoot.position.set(0, yOffset, 0);
    const hpBack = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.08), new THREE.MeshBasicMaterial({ color: backColor, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.045), new THREE.MeshBasicMaterial({ color: fillColor, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    hpFill.position.z = 0.003;
    healthRoot.add(hpBack, hpFill);
    return { healthRoot, hpFill };
  }

  // Meadow Bandit Archer: a lean hooded road-raider that looses arrows from a
  // distance. Quality target is the horse model: jointed limbs, layered cloth,
  // and shared procedural textures.
  function createBanditArcherModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const hips = makeCylinder(0.28, 0.34, 0.46, 12, materials.leather, 0, 0.84, 0);
    const chest = makeCylinder(0.38, 0.3, 0.78, 12, materials.banditTunic, 0, 1.42, 0);
    const jerkin = makeCylinder(0.4, 0.32, 0.5, 12, materials.leather.clone(), 0, 1.3, 0);
    jerkin.scale.set(1.02, 1, 0.86);
    const belt = makeCylinder(0.34, 0.36, 0.12, 12, materials.darkLeather, 0, 1.02, 0);
    const buckle = makeBox(0.12, 0.1, 0.05, materials.gold, 0, 1.02, -0.34);
    const cloak = makeBox(0.66, 0.86, 0.12, materials.banditHood.clone(), 0, 1.42, 0.26);
    cloak.rotation.x = 0.08;

    const neck = makeCylinder(0.1, 0.12, 0.16, 8, materials.skin, 0, 1.86, 0);
    const head = makeSphere(0.2, materials.skin, 0, 2.0, -0.02);
    const hood = makeSphere(0.27, materials.banditHood, 0, 2.04, 0);
    hood.scale.set(1.05, 1.1, 1.12);
    const hoodPeak = makeCone(0.16, 0.34, 7, materials.banditHood.clone(), 0, 2.12, 0.18);
    hoodPeak.rotation.x = 0.95;
    const mask = makeBox(0.28, 0.14, 0.1, materials.banditMask, 0, 1.92, -0.2);
    const leftEye = makeSphere(0.028, materials.emberEye, -0.07, 2.0, -0.22);
    const rightEye = makeSphere(0.028, materials.emberEye, 0.07, 2.0, -0.22);

    const quiver = makeCylinder(0.08, 0.1, 0.5, 8, materials.darkLeather, 0.16, 1.5, 0.3);
    quiver.rotation.set(0.3, 0, -0.4);
    const arrowsInQuiver = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const a = makeCylinder(0.012, 0.012, 0.36, 5, materials.bowWood, 0.13 + i * 0.045, 1.78, 0.34);
      a.rotation.set(0.3, 0, -0.4);
      const f = makeBox(0.01, 0.07, 0.07, materials.banditTunic, 0.13 + i * 0.045, 1.92, 0.4);
      arrowsInQuiver.add(a, f);
    }

    function makeLeg(x) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.84, 0);
      const thigh = makeCylinder(0.1, 0.12, 0.46, 8, materials.banditTunic.clone(), 0, -0.22, 0);
      const shin = makeCylinder(0.07, 0.09, 0.42, 8, materials.darkLeather, 0, -0.6, 0.015);
      const boot = makeBox(0.18, 0.14, 0.3, materials.darkLeather, 0, -0.84, -0.05);
      leg.add(thigh, shin, boot);
      return leg;
    }
    const leftLeg = makeLeg(-0.16);
    const rightLeg = makeLeg(0.16);

    const bowArmL = new THREE.Group();
    bowArmL.position.set(-0.4, 1.62, 0);
    bowArmL.add(
      makeCylinder(0.07, 0.08, 0.4, 8, materials.banditTunic.clone(), 0, -0.18, 0),
      makeCylinder(0.055, 0.065, 0.4, 8, materials.skin.clone(), 0, -0.5, 0)
    );
    bowArmL.rotation.x = -0.9;

    const bowArmR = new THREE.Group();
    bowArmR.position.set(0.4, 1.62, 0);
    bowArmR.add(
      makeCylinder(0.07, 0.08, 0.4, 8, materials.banditTunic.clone(), 0, -0.18, 0),
      makeCylinder(0.055, 0.065, 0.4, 8, materials.skin.clone(), 0, -0.5, 0)
    );
    bowArmR.rotation.x = -0.55;

    const bowPivot = new THREE.Group();
    bowPivot.position.set(0, -0.66, 0);
    const grip = makeCylinder(0.035, 0.035, 0.22, 7, materials.darkLeather, 0, 0, 0);
    const upperLimb = makeCylinder(0.016, 0.03, 0.5, 6, materials.bowWood, 0, 0.32, 0.06);
    upperLimb.rotation.x = -0.4;
    const lowerLimb = makeCylinder(0.03, 0.016, 0.5, 6, materials.bowWood.clone(), 0, -0.32, 0.06);
    lowerLimb.rotation.x = 0.4;
    const string = makeCylinder(0.005, 0.005, 0.92, 4, materials.bone, 0, 0, -0.14);
    bowPivot.add(grip, upperLimb, lowerLimb, string);
    bowArmL.add(bowPivot);

    const bars = makeCreatureHealthBar(2.42, 0xe0c06a);
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.74, 32), materials.danger.clone());
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = 0.025;
    telegraph.visible = false;

    group.add(
      hips, chest, jerkin, belt, buckle, cloak, neck, head, hood, hoodPeak, mask, leftEye, rightEye,
      quiver, arrowsInQuiver, leftLeg, rightLeg, bowArmL, bowArmR, bars.healthRoot, telegraph
    );
    return { group, leftLeg, rightLeg, chest, bowArmL, bowArmR, weaponPivot: bowArmR, healthRoot: bars.healthRoot, hpFill: bars.hpFill, telegraph };
  }

  // Desert Sand Viper: a low serpentine creature that rears up and spits a
  // venom orb from range. The body slithers via segment undulation.
  function createSandViperModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const segments = [];
    const segData = [
      [1.5, 0.1, 0.13],
      [1.12, 0.12, 0.16],
      [0.74, 0.13, 0.19],
      [0.36, 0.14, 0.2],
      [-0.02, 0.14, 0.2],
      [-0.32, 0.13, 0.18]
    ];
    for (const [z, y, r] of segData) {
      const seg = makeSphere(r, materials.viperScale.clone(), 0, y, z);
      seg.scale.set(1.0, 0.78, 1.12);
      const belly = makeBox(r * 1.1, 0.04, r * 1.6, materials.viperBelly, 0, -r * 0.7, 0);
      seg.add(belly);
      segments.push(seg);
      group.add(seg);
    }
    const tailTip = makeCone(0.08, 0.5, 7, materials.viperScale.clone(), 0, 0.1, 1.9);
    tailTip.rotation.x = Math.PI / 2;

    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.16, -0.5);
    const neck = makeCylinder(0.12, 0.16, 0.6, 10, materials.viperScale.clone(), 0, 0.26, -0.04);
    neck.rotation.x = -0.5;
    const hoodL = makeBox(0.04, 0.34, 0.3, materials.viperHood, -0.16, 0.5, -0.16);
    hoodL.rotation.z = 0.5;
    const hoodR = makeBox(0.04, 0.34, 0.3, materials.viperHood.clone(), 0.16, 0.5, -0.16);
    hoodR.rotation.z = -0.5;
    const head = makeSphere(0.18, materials.viperScale.clone(), 0, 0.62, -0.3);
    head.scale.set(1.1, 0.8, 1.3);
    const snout = makeBox(0.16, 0.1, 0.2, materials.viperScale.clone(), 0, 0.58, -0.46);
    const leftEye = makeSphere(0.035, materials.emberEye, -0.09, 0.66, -0.4);
    const rightEye = makeSphere(0.035, materials.emberEye, 0.09, 0.66, -0.4);
    const leftFang = makeCone(0.02, 0.1, 5, materials.bone, -0.05, 0.5, -0.5);
    const rightFang = makeCone(0.02, 0.1, 5, materials.bone, 0.05, 0.5, -0.5);
    leftFang.rotation.x = Math.PI;
    rightFang.rotation.x = Math.PI;
    const tongue = makeBox(0.02, 0.02, 0.18, materials.cloth, 0, 0.55, -0.6);
    tongue.visible = false;
    const mouthGlow = makeSphere(0.08, materials.venomGlow.clone(), 0, 0.55, -0.48);
    mouthGlow.visible = false;
    neckPivot.add(neck, hoodL, hoodR, head, snout, leftEye, rightEye, leftFang, rightFang, tongue, mouthGlow);
    neckPivot.rotation.x = -0.2;

    const bars = makeCreatureHealthBar(1.2, 0xc9b06a, 0x2a2410);
    bars.healthRoot.position.z = -0.3;
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 30), materials.danger.clone());
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = 0.02;
    telegraph.visible = false;

    group.add(tailTip, neckPivot, bars.healthRoot, telegraph);
    return { group, segments, neckPivot, mouthGlow, tongue, healthRoot: bars.healthRoot, hpFill: bars.hpFill, telegraph };
  }

  // Mountain Bonewarden: a reanimated bone soldier with a notched falchion. It
  // reuses the humanoid melee state machine (weaponPivot + leg swing).
  function createBonewardenModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const pelvis = makeBox(0.34, 0.18, 0.22, materials.bone, 0, 0.92, 0);
    const spine = makeCylinder(0.05, 0.05, 0.52, 6, materials.bone, 0, 1.28, -0.02);
    const ribCage = makeCylinder(0.26, 0.2, 0.5, 10, materials.boneArmor, 0, 1.34, 0);
    ribCage.scale.set(1.0, 1, 0.72);
    const ribs = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.23 - i * 0.024, 0.022, 6, 16, Math.PI), materials.bone.clone());
      rib.position.set(0, 1.2 + i * 0.16, -0.04);
      rib.rotation.x = Math.PI / 2;
      ribs.add(rib);
    }
    const breastplate = makeBox(0.42, 0.46, 0.18, materials.darkStone, 0, 1.34, -0.16);
    breastplate.scale.set(1, 1, 0.7);
    const plateRune = makeBox(0.14, 0.2, 0.02, materials.necroticGlow, 0, 1.36, -0.27);

    // Oversized skull with shadowed sockets so the undead head reads at
    // gameplay distance; the glow eyes sit inside dark recesses.
    const skull = makeSphere(0.2, materials.bone.clone(), 0, 1.93, -0.02);
    skull.scale.set(1, 1.12, 1.05);
    const jaw = makeBox(0.21, 0.11, 0.18, materials.bone.clone(), 0, 1.79, -0.07);
    const helm = makeCylinder(0.22, 0.23, 0.17, 10, materials.iron, 0, 2.08, 0);
    const nasal = makeBox(0.05, 0.2, 0.05, materials.iron.clone(), 0, 1.94, -0.2);
    const socketL = makeSphere(0.06, materials.darkStone.clone(), -0.08, 1.95, -0.17);
    const socketR = makeSphere(0.06, materials.darkStone.clone(), 0.08, 1.95, -0.17);
    const leftEye = makeSphere(0.042, materials.necroticGlow, -0.08, 1.95, -0.2);
    const rightEye = makeSphere(0.042, materials.necroticGlow, 0.08, 1.95, -0.2);

    const leftShoulder = makeCylinder(0.14, 0.2, 0.18, 10, materials.darkStone.clone(), -0.4, 1.66, 0);
    const rightShoulder = makeCylinder(0.14, 0.2, 0.18, 10, materials.darkStone.clone(), 0.4, 1.66, 0);
    leftShoulder.rotation.z = Math.PI / 2;
    rightShoulder.rotation.z = Math.PI / 2;

    const leftArm = makeBox(0.1, 0.62, 0.1, materials.bone.clone(), -0.44, 1.32, 0);

    const weaponPivot = new THREE.Group();
    weaponPivot.position.set(0.46, 1.5, -0.02);
    const armBone = makeCylinder(0.05, 0.06, 0.5, 7, materials.bone.clone(), 0, -0.18, 0);
    const grip = makeCylinder(0.04, 0.04, 0.5, 7, materials.darkLeather, 0, 0, -0.4);
    grip.rotation.x = Math.PI / 2;
    const guard = makeBox(0.34, 0.06, 0.1, materials.iron.clone(), 0, 0.02, -0.62);
    const blade = makeBox(0.12, 0.05, 1.0, materials.steel.clone(), 0, 0.04, -1.16);
    const bladeTip = makeCone(0.085, 0.26, 4, materials.steel.clone(), 0, 0.04, -1.78);
    bladeTip.rotation.set(-Math.PI / 2, Math.PI / 4, 0);
    const notch = makeBox(0.06, 0.06, 0.18, materials.iron.clone(), 0.05, 0.04, -1.4);
    weaponPivot.add(armBone, grip, guard, blade, bladeTip, notch);
    weaponPivot.rotation.set(-0.12, -0.3, -0.7);

    function makeLeg(x) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.9, 0);
      const femur = makeCylinder(0.06, 0.07, 0.46, 7, materials.bone.clone(), 0, -0.24, 0);
      const tibia = makeCylinder(0.045, 0.055, 0.44, 7, materials.bone.clone(), 0, -0.62, 0.01);
      const foot = makeBox(0.16, 0.1, 0.3, materials.darkStone.clone(), 0, -0.86, -0.05);
      leg.add(femur, tibia, foot);
      return leg;
    }
    const leftLeg = makeLeg(-0.16);
    const rightLeg = makeLeg(0.16);

    const bars = makeCreatureHealthBar(2.5, 0xbfeccd, 0x12211a);
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(0.65, 0.8, 32), materials.danger.clone());
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = 0.025;
    telegraph.visible = false;

    group.add(
      pelvis, spine, ribCage, ribs, breastplate, plateRune, skull, jaw, helm, nasal, socketL, socketR, leftEye, rightEye,
      leftShoulder, rightShoulder, leftArm, weaponPivot, leftLeg, rightLeg, bars.healthRoot, telegraph
    );
    return { group, weaponPivot, leftLeg, rightLeg, chest: ribCage, healthRoot: bars.healthRoot, hpFill: bars.hpFill, telegraph };
  }

  // Swamp Bog Lurker: a hunched swamp troll whose silhouette is built around a
  // massive shoulder hump, a low jutting head under a heavy brow, and long
  // dangling arms with oversized bone claws. Moss drapes and weed strands hang
  // off the hump. Reuses the humanoid melee state machine: hip-pivot legs,
  // rotatable chest for the stun lean, and a clawed weaponPivot arm whose rest
  // rotation matches what updateEnemyAttack restores after a swing.
  function createBogLurkerModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    // Short stubby legs under the bulk (hip pivots; rotation.x = walk swing).
    function makeLeg(x) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.66, 0.14);
      const thigh = makeCylinder(0.15, 0.18, 0.36, 8, materials.bogHide.clone(), 0, -0.16, 0);
      const shin = makeCylinder(0.11, 0.14, 0.32, 8, materials.bogHide.clone(), 0, -0.44, -0.05);
      const foot = makeBox(0.34, 0.12, 0.44, materials.bogMuck, 0, -0.6, -0.13);
      leg.add(thigh, shin, foot);
      return leg;
    }
    const leftLeg = makeLeg(-0.3);
    const rightLeg = makeLeg(0.3);

    // Hunched mass: belly low, chest leaning forward, hump towering at the rear.
    const belly = makeSphere(0.5, materials.bogMuck.clone(), 0, 0.82, -0.08);
    belly.scale.set(1.15, 0.85, 1.0);
    const chest = makeSphere(0.5, materials.bogHide.clone(), 0, 1.08, -0.28);
    chest.scale.set(1.25, 0.9, 1.05);
    const hump = makeSphere(0.58, materials.bogHide, 0, 1.46, 0.2);
    hump.scale.set(1.3, 0.95, 1.3);
    // Bone spine nubs breaking through the hump moss.
    const spineNubs = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const nub = makeCone(0.07, 0.2, 6, materials.bone, 0, 1.96 - i * 0.13, 0.02 + i * 0.3);
      nub.rotation.x = 0.3 + i * 0.28;
      spineNubs.add(nub);
    }

    // Moss growth over the hump: rounded patches sunk into the hide (spheres
    // read organic at distance; a flat box looked like a carried slab) plus
    // moss curtains hanging down both flanks.
    const mossMantle = makeSphere(0.52, materials.bogMoss, 0, 1.62, 0.2);
    mossMantle.scale.set(1.32, 0.55, 1.32);
    const mossPatch = makeSphere(0.3, materials.bogMoss.clone(), 0.22, 1.58, -0.22);
    mossPatch.scale.set(1.2, 0.5, 1.1);
    mossPatch.rotation.z = -0.2;
    const drapeL = makeBox(0.16, 0.62, 0.9, materials.bogMoss.clone(), -0.64, 1.42, 0.22);
    drapeL.rotation.z = 0.3;
    const drapeR = makeBox(0.16, 0.62, 0.9, materials.bogMoss.clone(), 0.64, 1.42, 0.22);
    drapeR.rotation.z = -0.3;
    // Dripping weed strands swinging off the mantle edges (fixed dims so the
    // geometry cache shares them; variation comes from rotation/position).
    const weeds = new THREE.Group();
    const weedSpots = [
      [-0.5, 1.6, -0.34, 0.3], [0.52, 1.62, -0.3, -0.26],
      [-0.34, 1.7, 0.62, 0.18], [0.38, 1.68, 0.6, -0.2]
    ];
    for (const [wx, wy, wz, tilt] of weedSpots) {
      const strand = makeCylinder(0.014, 0.03, 0.46, 5, materials.reed, wx, wy - 0.2, wz);
      strand.rotation.set((Math.random() - 0.5) * 0.2, 0, tilt + (Math.random() - 0.5) * 0.15);
      weeds.add(strand);
    }

    // Low head jutting forward from under the hump: heavy brow, ember eyes in
    // its shadow, wide underbite jaw with upward tusks.
    const neck = makeCylinder(0.18, 0.24, 0.4, 8, materials.bogHide.clone(), 0, 1.06, -0.62);
    neck.rotation.x = 1.12;
    const head = makeSphere(0.3, materials.bogHide.clone(), 0, 1.02, -0.86);
    head.scale.set(1.2, 0.85, 1.15);
    const brow = makeBox(0.6, 0.16, 0.34, materials.bogMuck.clone(), 0, 1.18, -0.9);
    brow.rotation.x = -0.18;
    const leftEye = makeSphere(0.06, materials.emberEye, -0.16, 1.06, -1.04);
    const rightEye = makeSphere(0.06, materials.emberEye, 0.16, 1.06, -1.04);
    const jaw = makeBox(0.5, 0.15, 0.42, materials.bogMuck.clone(), 0, 0.84, -0.92);
    const tuskL = makeCone(0.05, 0.24, 6, materials.bone, -0.18, 0.96, -1.08);
    tuskL.rotation.set(-0.35, 0, 0.18);
    const tuskR = makeCone(0.05, 0.24, 6, materials.bone, 0.18, 0.96, -1.08);
    tuskR.rotation.set(-0.35, 0, -0.18);

    // Long grasping arms: shoulders high on the hump, oversized muck-ball
    // hands with bone claws reaching to knee height. Both arms share dims.
    function buildArmMeshes(target, clawTiltX) {
      target.add(
        makeCylinder(0.15, 0.17, 0.54, 8, materials.bogHide.clone(), 0, -0.25, -0.02),
        makeCylinder(0.11, 0.14, 0.52, 8, materials.bogHide.clone(), 0, -0.7, -0.06),
        makeSphere(0.19, materials.bogMuck.clone(), 0, -1.0, -0.1)
      );
      for (const cx of [-0.11, 0, 0.11]) {
        const claw = makeCone(0.04, 0.3, 6, materials.bone.clone(), cx, -1.08, -0.24);
        claw.rotation.x = clawTiltX;
        target.add(claw);
      }
    }
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.68, 1.34, -0.06);
    buildArmMeshes(leftArm, -2.6);
    leftArm.rotation.set(0.16, 0, 0.14);

    const weaponPivot = new THREE.Group();
    weaponPivot.position.set(0.68, 1.34, -0.06);
    buildArmMeshes(weaponPivot, -2.2);
    weaponPivot.rotation.set(-0.12, -0.3, -0.7);

    const bars = makeCreatureHealthBar(2.45, 0x8fcf6a, 0x132011);
    const telegraph = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.92, 32), materials.danger.clone());
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = 0.025;
    telegraph.visible = false;

    group.add(
      leftLeg, rightLeg, belly, chest, hump, spineNubs, mossMantle, mossPatch, drapeL, drapeR, weeds,
      neck, head, brow, leftEye, rightEye, jaw, tuskL, tuskR,
      leftArm, weaponPivot, bars.healthRoot, telegraph
    );
    return { group, weaponPivot, leftLeg, rightLeg, chest, healthRoot: bars.healthRoot, hpFill: bars.hpFill, telegraph };
  }

  function createBanditArcher(x, z, wave) {
    const scale = modelScale.banditBase + Math.random() * 0.1 + Math.min(wave * 0.008, 0.07);
    const model = createBanditArcherModel(scale);
    const enemy = {
      ...model,
      type: "banditArcher",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      desiredRange: 9.5 + Math.random() * 1.8,
      health: 50 + wave * 8,
      maxHealth: 50 + wave * 8,
      speed: (2.55 + Math.random() * 0.35 + Math.min(wave * 0.04, 0.4)) * ENEMY_SPEED_MULTIPLIER,
      damageMul: 1 + Math.min(wave * 0.04, 0.55),
      radius: 0.55 * scale,
      cooldown: 1.0 + Math.random() * 1.4,
      state: "patrol",
      attackType: null,
      attackTimer: 0,
      attackDuration: 0,
      attackHitDone: false,
      stunned: 0,
      dead: false,
      walkTime: Math.random() * 10
    };
    assignEnemyId(enemy);
    enemy.group.position.copy(enemy.position);
    scene.add(enemy.group);
    return enemy;
  }

  function createSandViper(x, z, wave) {
    const scale = modelScale.viperBase + Math.random() * 0.12;
    const model = createSandViperModel(scale);
    const enemy = {
      ...model,
      type: "sandViper",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      desiredRange: 8.0 + Math.random() * 1.6,
      health: 44 + wave * 7,
      maxHealth: 44 + wave * 7,
      speed: (2.95 + Math.random() * 0.4) * ENEMY_SPEED_MULTIPLIER,
      damageMul: 1 + Math.min(wave * 0.04, 0.5),
      radius: 0.6 * scale,
      cooldown: 0.9 + Math.random() * 1.2,
      state: "patrol",
      attackType: null,
      attackTimer: 0,
      attackDuration: 0,
      attackHitDone: false,
      stunned: 0,
      dead: false,
      walkTime: Math.random() * 10
    };
    assignEnemyId(enemy);
    enemy.group.position.copy(enemy.position);
    scene.add(enemy.group);
    return enemy;
  }

  function createBonewarden(x, z, wave) {
    const scale = modelScale.bonewardenBase + Math.random() * 0.12 + Math.min(wave * 0.008, 0.08);
    const model = createBonewardenModel(scale);
    const enemy = {
      ...model,
      type: "bonewarden",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      health: 72 + wave * 12,
      maxHealth: 72 + wave * 12,
      speed: (2.5 + Math.random() * 0.32 + Math.min(wave * 0.04, 0.4)) * ENEMY_SPEED_MULTIPLIER,
      damageMul: 1.05 + Math.min(wave * 0.045, 0.6),
      radius: 0.62 * scale,
      cooldown: 0.7 + Math.random() * 1.1,
      state: "patrol",
      attackType: null,
      attackTimer: 0,
      attackDuration: 0,
      attackHitDone: false,
      stunned: 0,
      dead: false,
      walkTime: Math.random() * 10
    };
    assignEnemyId(enemy);
    enemy.group.position.copy(enemy.position);
    scene.add(enemy.group);
    return enemy;
  }

  function createBogLurker(x, z, wave) {
    const scale = modelScale.bogLurkerBase + Math.random() * 0.12 + Math.min(wave * 0.008, 0.08);
    const model = createBogLurkerModel(scale);
    const enemy = {
      ...model,
      type: "bogLurker",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      health: 78 + wave * 12,
      maxHealth: 78 + wave * 12,
      speed: (1.95 + Math.random() * 0.3 + Math.min(wave * 0.035, 0.36)) * ENEMY_SPEED_MULTIPLIER,
      damageMul: 1.1 + Math.min(wave * 0.045, 0.6),
      radius: 0.78 * scale,
      cooldown: 0.8 + Math.random() * 1.1,
      state: "patrol",
      attackType: null,
      attackTimer: 0,
      attackDuration: 0,
      attackHitDone: false,
      stunned: 0,
      dead: false,
      walkTime: Math.random() * 10
    };
    assignEnemyId(enemy);
    enemy.group.position.copy(enemy.position);
    scene.add(enemy.group);
    return enemy;
  }

  function createBarbarian(x, z, wave) {
    const scale = modelScale.barbarianBase + Math.random() * 0.14 + Math.min(wave * 0.01, 0.1);
    const model = createBarbarianModel(scale);
    const enemy = {
      ...model,
      type: "barbarian",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      health: 70 + wave * 16,
      maxHealth: 70 + wave * 16,
      speed: (2.05 + Math.random() * 0.42 + Math.min(wave * 0.05, 0.55)) * ENEMY_SPEED_MULTIPLIER,
      damageMul: 1 + Math.min(wave * 0.045, 0.65),
      radius: 0.65 * scale,
      cooldown: 0.6 + Math.random() * 1.2,
      state: "chase",
      attackType: null,
      attackTimer: 0,
      attackDuration: 0,
      attackHitDone: false,
      stunned: 0,
      dead: false,
      walkTime: Math.random() * 10
    };
    assignEnemyId(enemy);
    enemy.group.position.copy(enemy.position);
    scene.add(enemy.group);
    return enemy;
  }

  function createBriarBeastModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const body = makeSphere(0.54, materials.rootwood, 0, 0.72, 0.1);
    body.scale.set(1.18, 0.58, 1.52);
    const chest = makeSphere(0.42, materials.rootwood, 0, 0.78, -0.58);
    chest.scale.set(1.04, 0.68, 1.06);
    const haunch = makeSphere(0.42, materials.rootwood, 0, 0.64, 0.82);
    haunch.scale.set(0.98, 0.62, 1.04);
    const mossBack = makeBox(0.86, 0.08, 1.56, materials.briarLeaf.clone(), 0, 1.08, 0.08);
    mossBack.rotation.x = -0.04;
    const tail = makeCylinder(0.035, 0.11, 0.86, 7, materials.rootwood, 0, 0.68, 1.34);
    tail.rotation.x = Math.PI / 2 - 0.26;

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.92, -1.0);
    const skull = makeSphere(0.34, materials.rootwood, 0, 0.0, -0.12);
    skull.scale.set(1.02, 0.72, 1.02);
    const snout = makeBox(0.48, 0.22, 0.48, materials.rootwood, 0, -0.03, -0.45);
    const lowerJaw = makeBox(0.42, 0.09, 0.36, materials.briarThorn, 0, -0.18, -0.48);
    const leftEye = makeSphere(0.045, materials.emberEye, -0.14, 0.11, -0.44);
    const rightEye = makeSphere(0.045, materials.emberEye, 0.14, 0.11, -0.44);
    const leftFang = makeCone(0.045, 0.18, 7, materials.bone, -0.12, -0.22, -0.62);
    const rightFang = makeCone(0.045, 0.18, 7, materials.bone, 0.12, -0.22, -0.62);
    leftFang.rotation.x = Math.PI;
    rightFang.rotation.x = Math.PI;
    const leftHorn = makeCone(0.065, 0.36, 7, materials.briarThorn, -0.21, 0.24, -0.12);
    const rightHorn = makeCone(0.065, 0.36, 7, materials.briarThorn, 0.21, 0.24, -0.12);
    leftHorn.rotation.set(-0.72, -0.24, -0.32);
    rightHorn.rotation.set(-0.72, 0.24, 0.32);
    headPivot.add(skull, snout, lowerJaw, leftEye, rightEye, leftFang, rightFang, leftHorn, rightHorn);

    const legs = [];
    function makeBriarLeg(x, z, front) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.58, z);
      const upper = makeCylinder(0.08, 0.12, front ? 0.5 : 0.56, 7, materials.rootwood, 0, -0.22, 0);
      upper.rotation.x = front ? -0.08 : 0.1;
      const hoof = makeBox(0.2, 0.12, 0.24, materials.darkLeather, 0, -0.52, front ? -0.04 : 0.04);
      const thornKnee = makeCone(0.045, 0.18, 6, materials.briarThorn, x > 0 ? 0.11 : -0.11, -0.22, 0.01);
      thornKnee.rotation.z = x > 0 ? -Math.PI / 2 : Math.PI / 2;
      leg.add(upper, hoof, thornKnee);
      legs.push(leg);
      return leg;
    }
    const frontLeft = makeBriarLeg(-0.34, -0.54, true);
    const frontRight = makeBriarLeg(0.34, -0.54, true);
    const rearLeft = makeBriarLeg(-0.34, 0.58, false);
    const rearRight = makeBriarLeg(0.34, 0.58, false);

    const spine = new THREE.Group();
    for (let i = 0; i < 7; i += 1) {
      const z = -0.72 + i * 0.28;
      const height = 0.22 + Math.sin(i * 0.8) * 0.04;
      const spike = makeCone(0.06, height, 7, materials.briarThorn, 0, 1.22, z);
      spike.rotation.x = z < -0.2 ? -0.18 : 0.16;
      spine.add(spike);
    }

    const healthRoot = new THREE.Group();
    healthRoot.position.set(0, 1.72, -0.05);
    const hpBack = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.08), new THREE.MeshBasicMaterial({ color: 0x13200f, transparent: true, opacity: 0.82, side: THREE.DoubleSide }));
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.045), new THREE.MeshBasicMaterial({ color: 0xb9d678, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    hpFill.position.z = 0.003;
    healthRoot.add(hpBack, hpFill);

    const telegraph = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.88, 32), materials.danger.clone());
    telegraph.rotation.x = -Math.PI / 2;
    telegraph.position.y = 0.025;
    telegraph.visible = false;

    group.add(body, chest, haunch, mossBack, tail, headPivot, frontLeft, frontRight, rearLeft, rearRight, spine, healthRoot, telegraph);
    return {
      group,
      weaponPivot: headPivot,
      headPivot,
      body,
      chest,
      healthRoot,
      hpFill,
      telegraph,
      leftLeg: frontLeft,
      rightLeg: frontRight,
      quadrupedLegs: legs
    };
  }

  function createBriarBeast(x, z, wave) {
    const scale = modelScale.briarBeastBase + Math.random() * 0.12 + Math.min(wave * 0.008, 0.08);
    const model = createBriarBeastModel(scale);
    const enemy = {
      ...model,
      type: "briarBeast",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      health: 66 + wave * 10,
      maxHealth: 66 + wave * 10,
      speed: (2.32 + Math.random() * 0.34 + Math.min(wave * 0.03, 0.32)) * ENEMY_SPEED_MULTIPLIER,
      radius: 0.82 * scale,
      cooldown: 0.75 + Math.random() * 1.1,
      state: "chase",
      attackType: null,
      attackTimer: 0,
      attackDuration: 0,
      attackHitDone: false,
      stunned: 0,
      dead: false,
      walkTime: Math.random() * 10
    };
    assignEnemyId(enemy);
    enemy.group.position.copy(enemy.position);
    scene.add(enemy.group);
    return enemy;
  }

  function createDragon(x, z, wave) {
    const scale = modelScale.dragonBase + Math.random() * 0.07 + Math.min(wave * 0.008, 0.05);
    const model = createDragonModel(scale);
    const enemy = {
      ...model,
      type: "dragon",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      hoverHeight: 2.68 + Math.random() * 0.36,
      desiredRange: 8.8 + Math.random() * 2.2,
      // Dragons are a multi-player-tier encounter: ~2.4x the old 92 + wave*19
      // durability so a solo at-level player struggles and duos/trios shine.
      // Tier scaling (applyEnemyTier) and arena wave scaling compose on top.
      health: 225 + wave * 32,
      maxHealth: 225 + wave * 32,
      speed: (2.8 + Math.min(wave * 0.05, 0.6)) * ENEMY_SPEED_MULTIPLIER,
      damageMul: 1 + Math.min(wave * 0.04, 0.6),
      radius: 1.38 * scale,
      cooldown: 1.0 + Math.random() * 1.4,
      state: "chase",
      attackTimer: 0,
      attackDuration: 1.26,
      attackHitDone: false,
      stunned: 0,
      dead: false,
      wingTime: Math.random() * 10,
      bobSeed: Math.random() * 10
    };
    assignEnemyId(enemy);
    enemy.group.position.set(enemy.position.x, enemy.hoverHeight, enemy.position.z);
    scene.add(enemy.group);
    return enemy;
  }

  function createSpider(x, z, wave) {
    const scale = modelScale.spiderBase + Math.random() * 0.12;
    const model = createSpiderModel(scale);
    const enemy = {
      ...model,
      type: "spider",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      health: 48 + wave * 7,
      maxHealth: 48 + wave * 7,
      speed: (2.9 + Math.random() * 0.45) * ENEMY_SPEED_MULTIPLIER,
      radius: 0.82 * scale,
      cooldown: 0.45 + Math.random() * 1.0,
      state: "patrol",
      attackTimer: 0,
      attackDuration: 0,
      attackHitDone: false,
      stunned: 0,
      dead: false,
      walkTime: Math.random() * 10
    };
    assignEnemyId(enemy);
    enemy.group.position.copy(enemy.position);
    scene.add(enemy.group);
    return enemy;
  }

  function createWisp(x, z, wave) {
    const scale = 0.9 + Math.random() * 0.18;
    const model = createWispModel(scale);
    const enemy = {
      ...model,
      type: "wisp",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      health: 40 + wave * 6,
      maxHealth: 40 + wave * 6,
      speed: (2.5 + Math.random() * 0.34) * ENEMY_SPEED_MULTIPLIER,
      radius: 0.62 * scale,
      cooldown: 0.8 + Math.random() * 1.2,
      state: "patrol",
      attackTimer: 0,
      attackDuration: 0,
      attackHitDone: false,
      stunned: 0,
      dead: false,
      bobSeed: Math.random() * 10
    };
    assignEnemyId(enemy);
    enemy.group.position.copy(enemy.position);
    scene.add(enemy.group);
    return enemy;
  }

  function getGateEntrance(index, type) {
    if (!game.gates.length) {
      const angle = (index / 4) * TAU;
      return {
        startX: Math.cos(angle) * (arenaRadius - 1.5),
        startZ: Math.sin(angle) * (arenaRadius - 1.5),
        targetX: Math.cos(angle) * (arenaRadius - 7.5),
        targetZ: Math.sin(angle) * (arenaRadius - 7.5)
      };
    }

    const gate = game.gates[index % game.gates.length];
    const lane = Math.floor(index / game.gates.length);
    const laneOffset = ((lane % 4) - 1.5) * (type === "dragon" ? 0.9 : 0.72);
    const tangent = tmpVec.set(Math.cos(gate.angle + Math.PI / 2), 0, Math.sin(gate.angle + Math.PI / 2));
    const startRadius = gate.startRadius + (type === "dragon" ? 1.2 : 0) + Math.floor(lane / 4) * 1.1;
    const targetRadius = gate.targetRadius - (type === "dragon" ? 0.8 : 0) - Math.floor(lane / 4) * 0.55;
    return {
      startX: Math.cos(gate.angle) * startRadius + tangent.x * laneOffset,
      startZ: Math.sin(gate.angle) * startRadius + tangent.z * laneOffset,
      targetX: Math.cos(gate.angle) * targetRadius + tangent.x * laneOffset,
      targetZ: Math.sin(gate.angle) * targetRadius + tangent.z * laneOffset
    };
  }

  function setEnemyEntrance(enemy, entrance, delay) {
    enemy.entering = true;
    enemy.entryDelay = delay;
    enemy.entryTarget = new THREE.Vector3(entrance.targetX, 0, entrance.targetZ);
    enemy.state = "entering";
    enemy.cooldown = Math.max(enemy.cooldown, delay + 0.8);
    const entryDirection = tmpVec.copy(enemy.entryTarget).sub(enemy.position);
    if (entryDirection.lengthSq() > 0.0001) {
      enemy.yaw = yawFromDirection(entryDirection.normalize());
      enemy.group.rotation.y = enemy.yaw;
    }
  }

  function spawnWave() {
    game.wave += 1;
    game.nextWaveIn = 0;
    if (arenaActivityActive()) {
      const activity = game.exploration.arenaActivity;
      activity.phase = "wave";
      activity.wave = game.wave;
      activity.nextWaveIn = 0;
      activity.exitOpen = false;
    }
    const count = Math.min(5 + Math.floor(game.wave * 1.6), 18);
    const dragonCount = Math.min(Math.max(1, Math.floor(game.wave / 2)), Math.floor(count * 0.38));
    for (let i = 0; i < count; i += 1) {
      const entrance = getGateEntrance(i, i < dragonCount ? "dragon" : "barbarian");
      const delay = (i % 4) * 0.18 + Math.floor(i / 4) * 0.32;
      if (i < dragonCount) {
        const dragon = createDragon(entrance.startX, entrance.startZ, game.wave);
        tagArenaActor(dragon);
        setEnemyEntrance(dragon, entrance, delay);
        game.enemies.push(dragon);
      } else {
        const offset = i - dragonCount;
        const barbarian = createBarbarian(entrance.startX, entrance.startZ, game.wave);
        tagArenaActor(barbarian);
        setEnemyEntrance(barbarian, entrance, delay + offset * 0.05);
        game.enemies.push(barbarian);
      }
    }
    if (arenaActivityActive() && game.wave > 1) {
      playSfx("waveStart", 1);
    }
    showBanner(arenaActivityActive() ? "Crownring wave " + game.wave + " entering" : "Wave " + game.wave + " entering");
  }

  function updateEnemyEntrance(enemy, dt) {
    enemy.entryDelay = Math.max(0, enemy.entryDelay - dt);
    if (enemy.telegraph) {
      enemy.telegraph.visible = false;
    }

    if (enemy.entryDelay > 0) {
      enemy.velocity.multiplyScalar(Math.pow(0.05, dt));
      return;
    }

    const toTarget = tmpVec2.copy(enemy.entryTarget).sub(enemy.position);
    const distance = toTarget.length();
    if (distance < 0.45) {
      enemy.entering = false;
      enemy.state = "chase";
      enemy.entryTarget = null;
      enemy.cooldown = Math.max(enemy.cooldown, 0.7 + Math.random() * 0.45);
      enemy.velocity.multiplyScalar(0.35);
      return;
    }

    const direction = toTarget.multiplyScalar(1 / Math.max(distance, 0.001));
    const speed = enemy.speed * (enemy.type === "dragon" ? 1.15 : 1.32);
    enemy.yaw = yawFromDirection(direction);
    enemy.velocity.x = lerp(enemy.velocity.x, direction.x * speed, 1 - Math.pow(0.01, dt));
    enemy.velocity.z = lerp(enemy.velocity.z, direction.z * speed, 1 - Math.pow(0.01, dt));
    if (enemy.type === "barbarian") {
      enemy.walkTime += dt * speed;
    }
  }

  function resetGame() {
    for (const enemy of game.enemies) {
      scene.remove(enemy.group);
    }
    for (const fireball of game.fireballs) {
      scene.remove(fireball.group);
    }
    for (const projectile of game.playerProjectiles) {
      scene.remove(projectile.group);
    }
    for (const potion of game.potions) {
      scene.remove(potion.group);
    }
    for (const particle of game.particles) {
      scene.remove(particle.mesh);
    }
    game.enemies.length = 0;
    game.fireballs.length = 0;
    game.playerProjectiles.length = 0;
    game.potions.length = 0;
    game.particles.length = 0;
    game.nextEnemyId = 1;
    game.nextFireballId = 1;
    game.nextPotionId = 1;
    game.nextProjectileId = 1;
    online.worldSendTimer = 0;
    game.wave = 0;
    game.kills = 0;
    game.nextWaveIn = 0;
    game.state = "playing";
    game.cameraYaw = 0;
    game.saveTimer = 0;
    game.startedOnce = true;
    if (game.mode === "exploration") {
      setArenaVisible(false);
      setDungeonVisible(false);
      scene.fog.density = 0.0065;
      setupExplorationWorld();
      if (isJoinedClient()) {
        clearSharedWorldActors({ enemies: true, fireballs: true, potions: true });
      }
      player.position.copy(savedExplorationWorldPosition() || game.exploration.spawn);
      game.cameraYaw = Math.PI;
    } else {
      setArenaVisible(true);
      setDungeonVisible(false);
      scene.fog.density = 0.018;
      clearExplorationWorld();
      player.position.set(0, 0, 0);
    }
    player.velocity.set(0, 0, 0);
    player.yaw = 0;
    setPlayerCharacter(game.selectedCharacter, true);
    if (game.mode === "exploration") {
      restoreSavedResources();
      if (localGodModeEnabled() || progression.exploration.horseUnlocked || progression.exploration.drakeUnlocked) {
        spawnHorseNearPlayer(false);
      }
    }
    player.hurtTimer = 0;
    player.group.position.copy(player.position);
    player.group.rotation.y = 0;
    overlay.classList.add("hidden");
    roomRoster.hidden = true;
    startButton.hidden = true;
    restartButton.hidden = true;
    if (game.mode === "exploration") {
      showBanner(explorationGuidanceText(), 3.2);
      progression.exploration.guidanceSeen = true;
      saveProgress();
    } else {
      if (canSimulateSharedWorld()) {
        spawnWave();
      } else {
        showBanner("Syncing room", 2.2);
      }
    }
    sendOnlineMessage({ kind: "state", state: serializePlayerState() });
    sendWorldSnapshot(true);
    updateHud();
  }

  function showBanner(text, duration = 1.8) {
    banner.textContent = text;
    banner.classList.add("visible");
    game.bannerTime = duration;
  }

  function spawnImpact(position, color, count) {
    for (let i = 0; i < count; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.045 + Math.random() * 0.045, 8, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      mesh.position.copy(position);
      mesh.position.y += 0.8 + Math.random() * 0.8;
      scene.add(mesh);
      game.particles.push({
        mesh,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 3.8, 1.3 + Math.random() * 2.2, (Math.random() - 0.5) * 3.8),
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8
      });
    }
  }

  function createHealthPotion(x, z, options) {
    const fullHeal = options.kind === "full";
    const wizardPotion = options.kind === "wizard";
    const scale = fullHeal ? 1.55 : wizardPotion ? 0.9 : 0.82;
    const healAmount = fullHeal ? player.maxHealth : options.healAmount;
    const groundY = explorationGroundWorldY(x, z);
    const group = new THREE.Group();
    group.position.set(x, groundY + 0.1, z);
    group.scale.setScalar(scale);

    const bottle = makeCylinder(0.18, 0.24, 0.42, 14, materials.potionGlass.clone(), 0, 0.28, 0);
    const liquidMaterial = fullHeal
      ? materials.fullPotionLiquid.clone()
      : wizardPotion ? materials.wizardPotionLiquid.clone() : materials.potionLiquid.clone();
    const liquid = makeCylinder(0.15, 0.2, 0.25, 14, liquidMaterial, 0, 0.2, 0);
    const neck = makeCylinder(0.08, 0.1, 0.22, 12, materials.potionGlass.clone(), 0, 0.6, 0);
    const cork = makeCylinder(0.065, 0.075, 0.1, 10, materials.wood, 0, 0.77, 0);
    const potionColor = fullHeal ? 0xffd56a : wizardPotion ? 0x7ae8ff : 0xff5d78;
    const glow = new THREE.PointLight(potionColor, fullHeal ? 1.7 : 0.95, fullHeal ? 6.5 : 3.6, 1.8);
    glow.position.set(0, 0.34, 0);

    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(fullHeal ? 0.52 : 0.36, 0.018, 8, 28),
      new THREE.MeshBasicMaterial({ color: potionColor, transparent: true, opacity: 0.5, depthWrite: false })
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.y = 0.025;

    group.add(marker, bottle, liquid, neck, cork, glow);
    scene.add(group);

    return assignPotionId({
      group,
      glow,
      marker,
      position: new THREE.Vector3(x, groundY, z),
      kind: options.kind,
      healAmount,
      fullHeal,
      activityType: options.activityType || "",
      activityId: options.activityId || "",
      pickupRadius: numberOrZero(options.pickupRadius) > 0 ? options.pickupRadius : (fullHeal ? 1.25 : 0.9),
      bobSeed: Math.random() * 10
    }, options.netId);
  }

  function dropWaveHealthPotion() {
    const forward = forwardFromYaw(player.yaw, tmpVec);
    const dropPosition = tmpVec2.copy(player.position).addScaledVector(forward, 2.4);
    const activity = activeCombatActivity();
    const radius = activity ? activity.radius || arenaRadius : arenaRadius;
    const dist = Math.hypot(dropPosition.x, dropPosition.z);
    if (dist > radius - 2.8) {
      dropPosition.multiplyScalar((radius - 2.8) / dist);
    }
    game.potions.push(createHealthPotion(dropPosition.x, dropPosition.z, {
      kind: "full",
      activityType: activity ? (activity === game.exploration.dungeonActivity ? "dungeon" : "arena") : "",
      activityId: activity ? activity.activityId : ""
    }));
    trimPotionDrops();
    playSfx("potion", 1);
  }

  function dropDragonHealthPotion(enemy) {
    // Dragons are now group-tier fights: every kill pays out a potion so the
    // post-fight sustain matches the much higher durability/threat.
    const dropPosition = enemy.position.clone();
    const activity = activeCombatActivity();
    if (game.mode !== "exploration" || localPlayerInSharedActivity()) {
      const radius = activity ? activity.radius || arenaRadius : arenaRadius;
      const dist = Math.hypot(dropPosition.x, dropPosition.z);
      if (dist > radius - 2.2) {
        dropPosition.multiplyScalar((radius - 2.2) / dist);
      }
    }
    game.potions.push(createHealthPotion(dropPosition.x, dropPosition.z, {
      kind: "small",
      healAmount: 14,
      activityType: activity ? (activity === game.exploration.dungeonActivity ? "dungeon" : "arena") : "",
      activityId: activity ? activity.activityId : ""
    }));
    trimPotionDrops();
    playSfx("potion", 0.8);
  }

  function dropWizardHealthPotion() {
    if (game.state !== "playing" || !questDialog.hidden || isPlayerMounted() || player.character !== "wizard" || player.potionCooldown > 0) {
      return false;
    }
    if (!hasAbility("potion")) {
      showAbilityLocked("potion");
      return false;
    }
    const tier = wizardPotionTier();
    const behind = forwardFromYaw(player.yaw, tmpVec).multiplyScalar(-0.9);
    const dropPosition = tmpVec2.copy(player.position).add(behind);
    const activity = activeCombatActivity();
    if (game.mode !== "exploration" || localPlayerInSharedActivity()) {
      const radius = activity ? activity.radius || arenaRadius : arenaRadius;
      const dist = Math.hypot(dropPosition.x, dropPosition.z);
      if (dist > radius - 2.2) {
        dropPosition.multiplyScalar((radius - 2.2) / dist);
      }
    }
    // Tier III: instant top-up on the (squishy) wizard. Local authority over
    // own HP; the new value rides serializePlayerState() to the host.
    if (tier.splash > 0 && player.health < player.maxHealth) {
      player.health = Math.min(player.maxHealth, player.health + tier.splash);
    }
    if (isJoinedClient()) {
      const activityType = localPlayerInDungeonActivity() ? "dungeon" : localPlayerInArenaActivity() ? "arena" : "";
      sendOnlineMessage({
        kind: "dropPotion",
        x: dropPosition.x,
        z: dropPosition.z,
        healAmount: tier.heal,
        pickupRadius: tier.radius,
        activityType,
        activityId: activity ? activity.activityId : "",
        state: serializePlayerState()
      });
      player.potionCooldown = player.potionCooldownMax;
      spawnImpact(dropPosition, 0x7ae8ff, 12);
      showBanner("Healing Draught dropped");
      playSfx("potion", 0.85);
      return true;
    }
    game.potions.push(createHealthPotion(dropPosition.x, dropPosition.z, {
      kind: "wizard",
      healAmount: tier.heal,
      pickupRadius: tier.radius,
      activityType: activity ? (activity === game.exploration.dungeonActivity ? "dungeon" : "arena") : "",
      activityId: activity ? activity.activityId : ""
    }));
    trimPotionDrops();
    player.potionCooldown = player.potionCooldownMax;
    spawnImpact(dropPosition, 0x7ae8ff, 12);
    broadcastOnlineEffect({ type: "impact", x: dropPosition.x, y: 0, z: dropPosition.z, color: 0x7ae8ff, count: 12, sfx: "potion", sfxIntensity: 0.85, sfxDistance: 36 });
    showBanner("Healing Draught dropped");
    playSfx("potion", 0.85);
    return true;
  }

  function trimPotionDrops() {
    while (game.potions.length > 8) {
      const oldPotion = game.potions.shift();
      scene.remove(oldPotion.group);
    }
  }

  function forwardFromYaw(yaw, out) {
    out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    return out.normalize();
  }

  function rightFromYaw(yaw, out) {
    out.set(Math.cos(yaw), 0, -Math.sin(yaw));
    return out.normalize();
  }

  function yawFromDirection(direction) {
    return Math.atan2(-direction.x, -direction.z);
  }

  function horizontalDistanceSq(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
  }

  function patrolTargetReached(enemy, radius) {
    return !enemy.patrolTarget || horizontalDistanceSq(enemy.position, enemy.patrolTarget) < radius * radius;
  }

  function actorYawEase(dt, settle = 0.0002) {
    return 1 - Math.pow(settle, dt);
  }

  function applyActorVisualYaw(group, targetYaw, dt, { snap = false, settle = 0.0002 } = {}) {
    if (!group) {
      return;
    }
    group.rotation.y = snap ? targetYaw : lerpAngle(group.rotation.y || 0, targetYaw || 0, actorYawEase(dt, settle));
  }

  function enemyVisualYawShouldSnap(enemy) {
    return enemy.entering
      || enemy.state === "attack"
      || enemy.state === "lunge"
      || enemy.state === "pulse"
      || enemy.state === "fire"
      || enemy.state === "draw"
      || enemy.state === "spit"
      || enemy.state === "hex";
  }

  function applyEnemyVisualYaw(enemy, dt) {
    applyActorVisualYaw(enemy.group, enemy.yaw || 0, dt, { snap: enemyVisualYawShouldSnap(enemy) });
  }

  function updateEnemyHealthBillboard(enemy) {
    if (enemy.healthRoot) {
      enemy.healthRoot.lookAt(camera.position);
    }
    if (enemy.hpFill) {
      enemy.hpFill.scale.x = clamp(enemy.health / enemy.maxHealth, 0, 1);
      enemy.hpFill.position.x = (enemy.type === "dragon" ? -0.505 : -0.41) * (1 - enemy.hpFill.scale.x);
    }
  }

  function updateEnemyHealthBillboards() {
    for (const enemy of game.enemies) {
      if (!enemy.dead) {
        updateEnemyHealthBillboard(enemy);
      }
    }
  }

  function resolveExplorationPosition(position, velocity, radius) {
    if (!game.exploration.colliders.length) {
      return;
    }
    for (let pass = 0; pass < 2; pass += 1) {
      for (const collider of explorationCollidersNear(position.x, position.z, radius + 7.0)) {
        const minDistance = collider.radius + radius;
        const dx = position.x - collider.x;
        const dz = position.z - collider.z;
        const distanceSq = dx * dx + dz * dz;
        if (distanceSq >= minDistance * minDistance) {
          continue;
        }
        const distance = Math.sqrt(Math.max(0.0001, distanceSq));
        const nx = distance > 0.001 ? dx / distance : 1;
        const nz = distance > 0.001 ? dz / distance : 0;
        position.x = collider.x + nx * minDistance;
        position.z = collider.z + nz * minDistance;
        const inwardSpeed = velocity.x * nx + velocity.z * nz;
        if (inwardSpeed < 0) {
          velocity.x -= nx * inwardSpeed;
          velocity.z -= nz * inwardSpeed;
        }
      }
    }
  }

  function resolveExplorationColliders() {
    resolveExplorationPosition(player.position, player.velocity, isPlayerMounted() ? mountedCollisionRadius() : 0.62);
  }

  function constrainExplorationPlayer() {
    const local = explorationLocalPosition(player.position, tmpVec);
    const distance = Math.hypot(local.x, local.z);
    const maxRadius = game.exploration.radius;
    if (distance > maxRadius) {
      local.multiplyScalar(maxRadius / Math.max(0.001, distance));
      player.position.x = game.exploration.origin.x + local.x;
      player.position.z = game.exploration.origin.z + local.z;
    }

    for (const lake of game.exploration.lakes) {
      const dx = player.position.x - lake.x;
      const dz = player.position.z - lake.z;
      const rx = lake.rx + 0.85;
      const rz = lake.rz + 0.85;
      const normalized = (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz);
      if (normalized < 1) {
        const angle = Math.atan2(dz / rz, dx / rx);
        player.position.x = lake.x + Math.cos(angle) * rx;
        player.position.z = lake.z + Math.sin(angle) * rz;
        player.velocity.multiplyScalar(0.35);
      }
    }
    resolveExplorationColliders();
  }

  function constrainArenaPlayer() {
    const activity = activeCombatActivity() || game.exploration.arenaActivity;
    const centerX = activity.center?.x || 0;
    const centerZ = activity.center?.z || 0;
    const radius = Math.max(8, (activity.radius || arenaRadius) - 1.6);
    const dx = player.position.x - centerX;
    const dz = player.position.z - centerZ;
    const distance = Math.hypot(dx, dz);
    if (distance > radius) {
      const scale = radius / Math.max(0.001, distance);
      player.position.x = centerX + dx * scale;
      player.position.z = centerZ + dz * scale;
      player.velocity.multiplyScalar(0.35);
    }
  }

  function updatePlayer(dt) {
    const mounted = isPlayerMounted();
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.secondaryCooldown = Math.max(0, player.secondaryCooldown - dt);
    player.utilityCooldown = Math.max(0, player.utilityCooldown - dt);
    player.payoffCooldown = Math.max(0, player.payoffCooldown - dt);
    player.resolveTimer = Math.max(0, player.resolveTimer - dt);
    player.hurtTimer = Math.max(0, player.hurtTimer - dt);
    player.rollTimer = Math.max(0, player.rollTimer - dt);
    if (player.character === "wizard" || player.character === "ranger") {
      player.mana = Math.min(player.maxMana, player.mana + dt * player.manaRegen);
      player.potionCooldown = Math.max(0, player.potionCooldown - dt);
      player.blocking = false;
    } else {
      const wantsBlock = !mounted && (player.blockHeld || keys.has("KeyK"));
      player.blocking = wantsBlock && player.guard > 2 && !player.attacking;
      if (player.blocking && player.resolveTimer <= 0) {
        player.guard = Math.max(0, player.guard - dt * 8);
      } else if (player.resolveTimer > 0 || !(player.attacking && player.attackKind === "bash")) {
        // Warden's Resolve keeps guard regenerating even while blocking.
        player.guard = Math.min(player.maxGuard, player.guard + dt * 22);
      }
    }
    if (mounted) {
      player.blocking = false;
      player.blockHeld = false;
    }
    updatePlayerHealthRegen(dt);

    const inputX = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const inputZ = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    tmpVec.set(0, 0, 0);
    if (inputX || inputZ) {
      const f = forwardFromYaw(game.cameraYaw, tmpVec2);
      const r = rightFromYaw(game.cameraYaw, new THREE.Vector3());
      tmpVec.addScaledVector(f, -inputZ);
      tmpVec.addScaledVector(r, inputX);
      tmpVec.normalize();
      const baseSpeed = mounted
        ? mountedMoveSpeed()
        : player.character === "wizard"
        ? (player.attacking ? 4.45 : 6.65)
        : player.character === "ranger"
        ? (player.attacking ? 4.9 : 6.9)
        : (player.blocking ? 3.1 : player.attacking ? 3.8 : 5.8);
      const speed = mounted ? baseSpeed : baseSpeed * (player.kitMoveSpeedMul || 1);
      player.velocity.x = lerp(player.velocity.x, tmpVec.x * speed, 1 - Math.pow(0.001, dt));
      player.velocity.z = lerp(player.velocity.z, tmpVec.z * speed, 1 - Math.pow(0.001, dt));
      player.yaw = yawFromDirection(tmpVec);
      player.walkTime += dt * speed * (mounted ? 0.4 : 1);
    } else {
      player.velocity.x = lerp(player.velocity.x, 0, 1 - Math.pow(0.0001, dt));
      player.velocity.z = lerp(player.velocity.z, 0, 1 - Math.pow(0.0001, dt));
    }

    if (player.attacking) {
      const forward = forwardFromYaw(player.yaw, tmpVec2);
      player.velocity.addScaledVector(forward, dt * (player.character === "wizard" ? 2.0 : player.character === "ranger" ? 0.6 : 4.8));
    }

    player.position.addScaledVector(player.velocity, dt);
    if (localPlayerInSharedActivity()) {
      constrainArenaPlayer();
    } else if (game.mode === "exploration") {
      constrainExplorationPlayer();
    } else {
      const dist = Math.hypot(player.position.x, player.position.z);
      if (dist > arenaRadius - 1.6) {
        player.position.multiplyScalar((arenaRadius - 1.6) / dist);
      }
    }

    if (player.attacking) {
      player.attackTimer += dt;
      const t = player.attackTimer / player.attackDuration;
      const swing = Math.sin(clamp(t, 0, 1) * Math.PI);

      if (player.character === "wizard") {
        updateWizardCastAnimation(t, swing);
      } else if (player.character === "ranger") {
        updateRangerDrawAnimation(t, swing);
      } else if (player.attackKind === "bash") {
        player.swordPivot.rotation.set(-0.28 + swing * 0.2, -0.58 + swing * 0.22, -0.86 + swing * 0.28);
        player.slashArc.visible = false;
      } else {
        player.swordPivot.rotation.set(-0.48 + swing * 1.0, -0.95 + swing * 1.85, -0.85 + swing * 1.2);
        player.slashArc.visible = true;
        player.slashArc.material.opacity = Math.max(0, 0.72 * Math.sin(clamp((t - 0.1) / 0.6, 0, 1) * Math.PI));
        player.slashArc.rotation.z = -1.3 + swing * 1.9;
      }

      const hitFrame = player.attackKind === "lightning" ? t > 0.28
        : player.attackKind === "burst" ? t > 0.36
        : player.attackKind === "bash" ? t > 0.26
        : player.attackKind === "arrow" ? t > 0.3
        : player.attackKind === "pierce" ? t > 0.42
        : player.attackKind === "frostbind" ? t > 0.32
        : player.attackKind === "stormcrown" ? t > 0.45
        : player.attackKind === "heartseeker" ? t > 0.6
        : player.attackKind === "sweep" ? t > 0.4
        : t > 0.34 && t < 0.68;
      if (!player.attackHitDone && hitFrame) {
        player.attackHitDone = true;
        if (player.attackKind === "lightning") {
          launchLightningBall();
        } else if (player.attackKind === "burst") {
          performWizardBurst();
        } else if (player.attackKind === "bash") {
          performShieldBash();
        } else if (player.attackKind === "frostbind") {
          launchFrostbindBolt();
        } else if (player.attackKind === "stormcrown") {
          performCrownOfStorms();
        } else if (player.attackKind === "sweep") {
          performSweepingCut();
        } else if (player.attackKind === "arrow" || player.attackKind === "pierce" || player.attackKind === "heartseeker") {
          launchArrow(player.attackKind);
        } else {
          performPlayerAttack();
        }
      }

      if (player.attackTimer >= player.attackDuration) {
        player.attacking = false;
        if (player.slashArc) {
          player.slashArc.visible = false;
        }
        if (player.burstRing) {
          player.burstRing.visible = false;
        }
        if (player.castGlow) {
          player.castGlow.visible = false;
        }
      }
    } else if (player.character === "wizard") {
      resetWizardCastPose(dt);
    } else if (player.character === "ranger") {
      resetRangerDrawPose(dt);
    } else {
      player.swordPivot.rotation.x = lerp(player.swordPivot.rotation.x, -0.22, 1 - Math.pow(0.00001, dt));
      player.swordPivot.rotation.y = lerp(player.swordPivot.rotation.y, -0.24, 1 - Math.pow(0.00001, dt));
      player.swordPivot.rotation.z = lerp(player.swordPivot.rotation.z, -0.42, 1 - Math.pow(0.00001, dt));
    }

    if (player.character === "knight") {
      const bashing = player.attacking && player.attackKind === "bash";
      const shieldTargetY = bashing ? -0.42 : player.blocking ? -0.15 : 0.38;
      const shieldTargetZ = bashing ? -0.78 : player.blocking ? -0.42 : 0;
      const shieldTargetPosZ = bashing ? -0.58 : player.blocking ? -0.42 : -0.08;
      player.shieldPivot.rotation.y = lerp(player.shieldPivot.rotation.y, shieldTargetY, 1 - Math.pow(0.00001, dt));
      player.shieldPivot.rotation.z = lerp(player.shieldPivot.rotation.z, shieldTargetZ, 1 - Math.pow(0.00001, dt));
      player.shieldPivot.position.z = lerp(player.shieldPivot.position.z, shieldTargetPosZ, 1 - Math.pow(0.00001, dt));
    }

    const walkBob = Math.sin(player.walkTime * 8) * Math.min(0.05, player.velocity.length() * 0.009);
    const playerGroundY = game.mode === "exploration" && !localPlayerInSharedActivity()
      ? explorationGroundWorldY(player.position.x, player.position.z)
      : 0;
    if (mounted) {
      const horse = game.exploration.horse;
      const rideBob = horse ? Math.sin(horse.walkTime * 2.2) * 0.04 : 0;
      player.group.position.set(player.position.x, playerGroundY + 1.2 + rideBob, player.position.z);
    } else {
      player.group.position.set(player.position.x, playerGroundY + walkBob, player.position.z);
    }
    player.group.rotation.y = player.yaw;
    if (mounted) {
      updateMountedPlayerPose(dt);
    } else {
      animatePlayerWalk(dt);
    }
    const hurt = player.hurtTimer > 0 ? 1 : 0;
    player.body.material.emissive = player.body.material.emissive || new THREE.Color(0x000000);
    player.body.material.emissive.setRGB(0.4 * hurt, 0.02 * hurt, 0.02 * hurt);

    player.hitFlash.visible = player.hurtTimer > 0;
    player.hitFlash.material.opacity = player.hurtTimer > 0 ? player.hurtTimer * 1.3 : 0;
  }

  function updateWizardCastAnimation(t, swing) {
    if (player.staffPivot) {
      player.staffPivot.rotation.x = 0.08 - swing * 0.34;
      player.staffPivot.rotation.y = swing * 0.2;
      player.staffPivot.rotation.z = -0.16 - swing * 0.2;
    }
    if (player.leftArm) {
      player.leftArm.rotation.x = -swing * 0.78;
      player.leftArm.rotation.z = -swing * 0.36;
    }
    if (player.rightArm) {
      player.rightArm.rotation.x = -swing * 0.42;
      player.rightArm.rotation.z = swing * 0.28;
    }
    if (player.castGlow) {
      player.castGlow.visible = true;
      player.castGlow.scale.setScalar(0.7 + swing * (player.attackKind === "burst" ? 2.2 : 1.35));
      player.castGlow.material.opacity = 0.28 + swing * 0.7;
    }
    if (player.burstRing) {
      const burst = player.attackKind === "burst" || player.attackKind === "stormcrown";
      player.burstRing.visible = burst;
      if (burst) {
        const reach = player.attackKind === "stormcrown" ? 5.8 : 3.45;
        const scale = 0.75 + smoothstep(0.12, 0.92, t) * reach;
        player.burstRing.scale.set(scale, scale, scale);
        player.burstRing.material.opacity = 0.72 * (1 - smoothstep(0.42, 1, t));
      }
    }
  }

  function updateRangerDrawAnimation(t, swing) {
    if (player.bowPivot) {
      player.bowPivot.rotation.y = lerp(player.bowPivot.rotation.y, -1.25, swing);
      player.bowPivot.rotation.z = -0.06 - swing * 0.1;
    }
    if (player.leftArm) {
      player.leftArm.rotation.x = -swing * 1.25;
      player.leftArm.rotation.z = swing * 0.2;
    }
    if (player.rightArm) {
      player.rightArm.rotation.x = -swing * 1.1;
      player.rightArm.rotation.z = -swing * 0.45;
    }
  }

  function resetRangerDrawPose(dt) {
    const ease = 1 - Math.pow(0.00001, dt);
    if (player.bowPivot) {
      player.bowPivot.rotation.y = lerp(player.bowPivot.rotation.y, -0.3, ease);
      player.bowPivot.rotation.z = lerp(player.bowPivot.rotation.z, -0.06, ease);
    }
  }

  function resetWizardCastPose(dt) {
    if (player.staffPivot) {
      player.staffPivot.rotation.x = lerp(player.staffPivot.rotation.x, 0.08, 1 - Math.pow(0.00001, dt));
      player.staffPivot.rotation.y = lerp(player.staffPivot.rotation.y, 0, 1 - Math.pow(0.00001, dt));
      player.staffPivot.rotation.z = lerp(player.staffPivot.rotation.z, -0.16, 1 - Math.pow(0.00001, dt));
    }
    if (player.leftArm) {
      player.leftArm.rotation.x = lerp(player.leftArm.rotation.x, 0, 1 - Math.pow(0.00001, dt));
      player.leftArm.rotation.z = lerp(player.leftArm.rotation.z, 0, 1 - Math.pow(0.00001, dt));
    }
    if (player.rightArm) {
      player.rightArm.rotation.x = lerp(player.rightArm.rotation.x, 0, 1 - Math.pow(0.00001, dt));
      player.rightArm.rotation.z = lerp(player.rightArm.rotation.z, 0, 1 - Math.pow(0.00001, dt));
    }
    if (player.castGlow) {
      player.castGlow.visible = false;
    }
    if (player.burstRing) {
      player.burstRing.visible = false;
    }
  }

  function animatePlayerWalk(dt) {
    if (!player.leftLeg || !player.rightLeg) {
      return;
    }
    const swing = Math.sin(player.walkTime * 7.2) * Math.min(0.32, player.velocity.length() * 0.055);
    player.leftLeg.rotation.x = lerp(player.leftLeg.rotation.x, swing, 1 - Math.pow(0.0001, dt));
    player.rightLeg.rotation.x = lerp(player.rightLeg.rotation.x, -swing, 1 - Math.pow(0.0001, dt));
  }

  function updateMountedPlayerPose(dt) {
    if (!player.leftLeg || !player.rightLeg) {
      return;
    }
    const ease = 1 - Math.pow(0.0001, dt);
    player.leftLeg.rotation.x = lerp(player.leftLeg.rotation.x, -0.95, ease);
    player.rightLeg.rotation.x = lerp(player.rightLeg.rotation.x, -0.95, ease);
    if (player.leftArm) {
      player.leftArm.rotation.x = lerp(player.leftArm.rotation.x, -0.18, ease);
      player.leftArm.rotation.z = lerp(player.leftArm.rotation.z, -0.08, ease);
    }
    if (player.rightArm) {
      player.rightArm.rotation.x = lerp(player.rightArm.rotation.x, -0.18, ease);
      player.rightArm.rotation.z = lerp(player.rightArm.rotation.z, 0.08, ease);
    }
  }

  function startAttack() {
    if (game.state !== "playing" || !questDialog.hidden || isPlayerMounted() || player.attacking || player.attackCooldown > 0 || player.blocking) {
      return;
    }
    if (player.character === "wizard") {
      if (!hasAbility("lightning")) {
        showAbilityLocked("lightning");
        return;
      }
      const cost = combatTuningFor().lightningManaCost;
      if (player.mana < cost) {
        showBanner("Not enough magica");
        return;
      }
      player.mana -= cost;
      player.attackKind = "lightning";
      player.attackDuration = 0.46;
      player.attackCooldown = 0.52;
      playSfx("lightning", 0.95);
    } else if (player.character === "ranger") {
      if (!hasAbility("arrow")) {
        showAbilityLocked("arrow");
        return;
      }
      const cost = combatTuningFor().arrowFocusCost;
      if (player.mana < cost) {
        showBanner("Not enough focus");
        return;
      }
      player.mana -= cost;
      player.attackKind = "arrow";
      player.attackDuration = 0.34;
      player.attackCooldown = 0.65;
      playSfx("arrow", 0.95);
    } else {
      player.attackKind = "slash";
      player.attackDuration = 0.42;
      player.attackCooldown = 0.54;
      playSfx("slash", 0.9);
    }
    player.attacking = true;
    player.attackTimer = 0;
    player.attackHitDone = false;
    sendOnlineAction(player.attackKind);
  }

  function startSecondaryAbility() {
    if (!questDialog.hidden || isPlayerMounted()) {
      return;
    }
    if (player.character === "knight") {
      player.blockHeld = true;
      return;
    }
    if (player.character === "ranger") {
      startRangerRoll();
      return;
    }
    if (game.state !== "playing" || player.attacking || player.secondaryCooldown > 0) {
      return;
    }
    if (!hasAbility("burst")) {
      showAbilityLocked("burst");
      return;
    }
    const cost = combatTuningFor().burstManaCost;
    if (player.mana < cost) {
      showBanner("Not enough magica");
      return;
    }
    player.mana -= cost;
    player.attacking = true;
    player.attackKind = "burst";
    player.attackTimer = 0;
    player.attackDuration = 0.58;
    player.attackHitDone = false;
    player.attackCooldown = Math.max(player.attackCooldown, 0.25);
    player.secondaryCooldown = 1.15;
    playSfx("burst", 1.05);
    sendOnlineAction("burst");
  }

  function startKnightBash() {
    if (game.state !== "playing" || !questDialog.hidden || isPlayerMounted() || player.character !== "knight" || player.attacking || player.attackCooldown > 0) {
      return false;
    }
    if (!hasAbility("bash")) {
      showAbilityLocked("bash");
      return false;
    }
    const cost = combatTuningFor().bashGuardCost;
    if (player.guard < cost) {
      showBanner("Not enough guard");
      return false;
    }
    player.guard -= cost;
    player.blockHeld = false;
    player.blocking = false;
    player.attacking = true;
    player.attackKind = "bash";
    player.attackTimer = 0;
    player.attackDuration = 0.5;
    player.attackCooldown = 0.72;
    player.attackHitDone = false;
    playSfx("bash", 1.05);
    sendOnlineAction("bash");
    return true;
  }

  function startRangerRoll() {
    if (game.state !== "playing" || player.character !== "ranger" || player.secondaryCooldown > 0 || player.rollTimer > 0) {
      return false;
    }
    if (!hasAbility("roll")) {
      showAbilityLocked("roll");
      return false;
    }
    const cost = combatTuningFor().rollFocusCost;
    if (player.mana < cost) {
      showBanner("Not enough focus");
      return false;
    }
    player.mana -= cost;
    player.rollTimer = 0.38;
    player.secondaryCooldown = 0.95;
    // Roll toward current input direction, falling back to facing.
    const inputX = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const inputZ = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    tmpVec.set(0, 0, 0);
    if (inputX || inputZ) {
      const f = forwardFromYaw(game.cameraYaw, tmpVec2);
      const r = rightFromYaw(game.cameraYaw, new THREE.Vector3());
      tmpVec.addScaledVector(f, -inputZ);
      tmpVec.addScaledVector(r, inputX);
      tmpVec.normalize();
    } else {
      forwardFromYaw(player.yaw, tmpVec);
    }
    player.velocity.addScaledVector(tmpVec, 16.5);
    player.yaw = yawFromDirection(tmpVec);
    playSfx("roll", 1);
    sendOnlineAction("roll");
    return true;
  }

  function startRangerPierce() {
    if (game.state !== "playing" || !questDialog.hidden || isPlayerMounted() || player.character !== "ranger" || player.attacking || player.attackCooldown > 0) {
      return false;
    }
    if (!hasAbility("pierce")) {
      showAbilityLocked("pierce");
      return false;
    }
    const cost = combatTuningFor().pierceFocusCost;
    if (player.mana < cost) {
      showBanner("Not enough focus");
      return false;
    }
    player.mana -= cost;
    player.attacking = true;
    player.attackKind = "pierce";
    player.attackTimer = 0;
    player.attackDuration = 0.52;
    player.attackCooldown = 1.1;
    player.attackHitDone = false;
    playSfx("flamingArrow", 1.05);
    sendOnlineAction("pierce");
    return true;
  }

  function abilityReadyForUse() {
    return game.state === "playing" && questDialog.hidden && !isPlayerMounted();
  }

  // Utility slot (F): Warden's Resolve / Frostbind Bolt / Parting Shot.
  function startUtilityAbility() {
    if (!abilityReadyForUse() || player.utilityCooldown > 0) {
      return false;
    }
    const tuning = combatTuningFor();
    if (player.character === "knight") {
      if (!hasAbility("resolve")) {
        showAbilityLocked("resolve");
        return false;
      }
      player.resolveTimer = tuning.resolveDuration;
      player.utilityCooldown = tuning.resolveCooldown;
      spawnImpact(player.position, 0xffd889, 18);
      showBanner("Warden's Resolve", 1.6);
      playSfx("block", 1.15);
      sendOnlineAction("resolve");
      return true;
    }
    if (player.character === "wizard") {
      if (player.attacking) {
        return false;
      }
      if (!hasAbility("frostbind")) {
        showAbilityLocked("frostbind");
        return false;
      }
      if (player.mana < tuning.frostbindManaCost) {
        showBanner("Not enough magica");
        return false;
      }
      player.mana -= tuning.frostbindManaCost;
      player.utilityCooldown = tuning.frostbindCooldown;
      player.attacking = true;
      player.attackKind = "frostbind";
      player.attackTimer = 0;
      player.attackDuration = 0.5;
      player.attackCooldown = 0.6;
      player.attackHitDone = false;
      playSfx("lightning", 0.8);
      sendOnlineAction("frostbind");
      return true;
    }
    if (player.character === "ranger") {
      if (!hasAbility("parting")) {
        showAbilityLocked("parting");
        return false;
      }
      if (player.mana < tuning.partingFocusCost) {
        showBanner("Not enough focus");
        return false;
      }
      player.mana -= tuning.partingFocusCost;
      player.utilityCooldown = tuning.partingCooldown;
      performPartingShot(tuning);
      return true;
    }
    return false;
  }

  // Payoff slot (C): Sweeping Cut / Crown of Storms / Heartseeker.
  function startPayoffAbility() {
    if (!abilityReadyForUse() || player.payoffCooldown > 0 || player.attacking || player.attackCooldown > 0) {
      return false;
    }
    const tuning = combatTuningFor();
    if (player.character === "knight") {
      if (!hasAbility("sweep")) {
        showAbilityLocked("sweep");
        return false;
      }
      if (player.guard < tuning.sweepGuardCost) {
        showBanner("Not enough guard");
        return false;
      }
      player.guard -= tuning.sweepGuardCost;
      player.payoffCooldown = tuning.sweepCooldown;
      player.blockHeld = false;
      player.blocking = false;
      player.attacking = true;
      player.attackKind = "sweep";
      player.attackTimer = 0;
      player.attackDuration = 0.62;
      player.attackCooldown = 0.7;
      player.attackHitDone = false;
      playSfx("slash", 1.15);
      sendOnlineAction("sweep");
      return true;
    }
    if (player.character === "wizard") {
      if (!hasAbility("stormcrown")) {
        showAbilityLocked("stormcrown");
        return false;
      }
      if (player.mana < tuning.stormcrownManaCost) {
        showBanner("Not enough magica");
        return false;
      }
      player.mana -= tuning.stormcrownManaCost;
      player.payoffCooldown = tuning.stormcrownCooldown;
      player.attacking = true;
      player.attackKind = "stormcrown";
      player.attackTimer = 0;
      player.attackDuration = 0.62;
      player.attackCooldown = 0.7;
      player.attackHitDone = false;
      playSfx("burst", 1.2);
      sendOnlineAction("stormcrown");
      return true;
    }
    if (player.character === "ranger") {
      if (!hasAbility("heartseeker")) {
        showAbilityLocked("heartseeker");
        return false;
      }
      if (player.mana < tuning.heartseekerFocusCost) {
        showBanner("Not enough focus");
        return false;
      }
      player.mana -= tuning.heartseekerFocusCost;
      player.payoffCooldown = tuning.heartseekerCooldown;
      player.attacking = true;
      player.attackKind = "heartseeker";
      player.attackTimer = 0;
      player.attackDuration = 0.7;
      player.attackCooldown = 0.85;
      player.attackHitDone = false;
      playSfx("pierce", 1.1);
      sendOnlineAction("heartseeker");
      return true;
    }
    return false;
  }

  function performPartingShot(tuning = combatTuningFor("ranger")) {
    const forward = forwardFromYaw(player.yaw, tmpVec);
    if (canSimulateSharedWorld()) {
      for (const enemy of game.enemies) {
        if (enemy.dead || !enemyMatchesActiveCombat(enemy)) {
          continue;
        }
        tmpVec2.copy(enemy.position).sub(player.position);
        const distance = Math.max(0.001, Math.hypot(tmpVec2.x, tmpVec2.z));
        if (distance > 2.5 + enemy.radius) {
          continue;
        }
        tmpVec2.y = 0;
        tmpVec2.multiplyScalar(1 / distance);
        if (forward.dot(tmpVec2) < 0.5) {
          continue;
        }
        damageEnemy(enemy, tuning.partingDamageMin + Math.floor(Math.random() * tuning.partingDamageSpread), forward, 0.4);
        enemy.velocity.addScaledVector(forward, 7.5);
      }
    }
    spawnImpact(player.position.clone().addScaledVector(forward, 1.2), 0xd6c08a, 14);
    // Spring backward, away from facing.
    player.velocity.addScaledVector(forward, -10);
    player.rollTimer = Math.max(player.rollTimer, 0.3);
    playSfx("arrow", 1.05);
    sendOnlineAction("parting");
  }

  function performSweepingCut() {
    const forward = forwardFromYaw(player.yaw, tmpVec);
    const tuning = combatTuningFor("knight");
    let hitAny = false;
    if (canSimulateSharedWorld()) {
      for (const enemy of game.enemies) {
        if (enemy.dead || !enemyMatchesActiveCombat(enemy)) {
          continue;
        }
        tmpVec2.copy(enemy.position).sub(player.position);
        const distance = Math.max(0.001, Math.hypot(tmpVec2.x, tmpVec2.z));
        if (distance > tuning.sweepRange + enemy.radius) {
          continue;
        }
        tmpVec2.y = 0;
        tmpVec2.multiplyScalar(1 / distance);
        // Wide ~150 degree arc.
        if (forward.dot(tmpVec2) < 0.26) {
          continue;
        }
        damageEnemy(enemy, tuning.sweepDamageMin + Math.floor(Math.random() * tuning.sweepDamageSpread), tmpVec2.clone(), tuning.sweepStun);
        enemy.velocity.addScaledVector(tmpVec2, 4.6);
        hitAny = true;
      }
    }
    spawnImpact(player.position.clone().addScaledVector(forward, 1.1), hitAny ? 0xffd889 : 0xc7d3d3, hitAny ? 18 : 10);
  }

  function performCrownOfStorms() {
    const tuning = combatTuningFor("wizard");
    let hitAny = false;
    if (canSimulateSharedWorld()) {
      for (const enemy of game.enemies) {
        if (enemy.dead || !enemyMatchesActiveCombat(enemy)) {
          continue;
        }
        const direction = tmpVec2.copy(enemy.position).sub(player.position);
        const distance = Math.max(0.001, Math.hypot(direction.x, direction.z));
        if (distance > tuning.stormcrownRadius + enemy.radius) {
          continue;
        }
        direction.y = 0;
        direction.multiplyScalar(1 / distance);
        damageEnemy(enemy, tuning.stormcrownDamageMin + Math.floor(Math.random() * tuning.stormcrownDamageSpread), direction.clone(), 0.6);
        enemy.velocity.addScaledVector(direction, 3.5);
        hitAny = true;
      }
    }
    spawnImpact(player.position, hitAny ? 0x7ae8ff : 0xbff8ff, hitAny ? 34 : 20);
  }

  function launchFrostbindBolt() {
    const source = player.group.localToWorld(new THREE.Vector3(0.55, 1.55, -0.72));
    const direction = forwardFromYaw(player.yaw, new THREE.Vector3());
    const tuning = combatTuningFor("wizard");
    const projectile = createLightningProjectile(source, direction.multiplyScalar(22), {
      life: 1.6,
      damage: tuning.frostbindDamageMin + Math.floor(Math.random() * tuning.frostbindDamageSpread),
      stun: tuning.frostbindStun,
      turnRate: 0
    });
    projectile.pierce = true;
    projectile.hitIds = new Set();
    // Icy tint to read differently from lightning.
    if (projectile.shell) {
      projectile.shell.material = materials.wisp.clone();
      projectile.core.material = materials.wispCore.clone();
    }
    game.playerProjectiles.push(tagActiveCombatActor(projectile));
  }

  function performPlayerAttack() {
    const forward = forwardFromYaw(player.yaw, tmpVec);
    const tuning = combatTuningFor("knight");
    let hitAny = false;
    if (!canSimulateSharedWorld()) {
      return;
    }
    for (const enemy of game.enemies) {
      if (enemy.dead || enemy.stunned > 0.2 || !enemyMatchesActiveCombat(enemy)) {
        continue;
      }
      tmpVec2.copy(enemy.position).sub(player.position);
      // Horizontal range: player.position.y stays 0 while exploration enemies
      // keep a terrain-height y, so a 3D distance breaks melee on high ground.
      tmpVec2.y = 0;
      const distance = tmpVec2.length();
      if (distance > tuning.slashRange) {
        continue;
      }
      tmpVec2.normalize();
      const dot = forward.dot(tmpVec2);
      if (dot < 0.18) {
        continue;
      }
      const damage = tuning.slashDamageMin + tuning.slashDamageBonus + Math.floor(Math.random() * tuning.slashDamageSpread);
      damageEnemy(enemy, damage, forward, tuning.slashKnockback);
      hitAny = true;
    }
    if (hitAny) {
      player.guard = Math.min(player.maxGuard, player.guard + tuning.guardOnSlashHit);
    }
  }

  function performShieldBash() {
    const forward = forwardFromYaw(player.yaw, tmpVec);
    const tuning = combatTuningFor("knight");
    const impactPosition = player.position.clone().addScaledVector(forward, 1.25);
    let hitAny = false;
    if (!canSimulateSharedWorld()) {
      spawnImpact(impactPosition, 0xc7d3d3, 8);
      return;
    }
    for (const enemy of game.enemies) {
      if (enemy.dead || !enemyMatchesActiveCombat(enemy)) {
        continue;
      }
      tmpVec2.copy(enemy.position).sub(player.position);
      const distance = Math.max(0.001, Math.hypot(tmpVec2.x, tmpVec2.z));
      if (distance > 2.35 + enemy.radius) {
        continue;
      }
      tmpVec2.y = 0;
      tmpVec2.multiplyScalar(1 / distance);
      if (forward.dot(tmpVec2) < 0.26) {
        continue;
      }
      damageEnemy(enemy, tuning.bashDamageMin + Math.floor(Math.random() * tuning.bashDamageSpread), forward, tuning.bashKnockback);
      enemy.velocity.addScaledVector(forward, tuning.bashVelocity);
      hitAny = true;
    }
    spawnImpact(impactPosition, hitAny ? 0xffd889 : 0xc7d3d3, hitAny ? 16 : 8);
  }

  function createLightningProjectile(source, velocity, options = {}) {
    const group = new THREE.Group();
    group.position.copy(source);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 12), materials.lightning.clone());
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), materials.lightningCore.clone());
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.015, 8, 22), materials.lightning.clone());
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 20), materials.lightningCore.clone());
    ringA.rotation.x = Math.PI / 2;
    ringB.rotation.y = Math.PI / 2;
    const glow = new THREE.PointLight(0x7ae8ff, 2.4, 10, 1.7);
    group.add(shell, core, ringA, ringB, glow);
    scene.add(group);
    return {
      netId: options.netId || nextNetworkId("projectile"),
      type: "lightning",
      group,
      shell,
      core,
      ringA,
      ringB,
      velocity,
      speed: 12.8,
      turnRate: options.turnRate ?? 0.85,
      life: options.life || 2.45,
      damage: options.damage ?? (31 + Math.floor(Math.random() * 6)),
      stun: options.stun ?? 0.36,
      radius: 0.56,
      visualOnly: !!options.visualOnly
    };
  }

  function createArrowProjectile(source, velocity, options = {}) {
    const group = new THREE.Group();
    group.position.copy(source);
    const flaming = !!options.flaming;
    const shaft = makeCylinder(0.022, 0.022, 0.78, 6, materials.wood, 0, 0, 0);
    shaft.rotation.x = Math.PI / 2;
    // Apex toward -Z (direction of travel): cylinder +Y maps to -Z with Rx(-90deg).
    const head = makeCylinder(0.0, 0.045, 0.14, 6, materials.steel.clone(), 0, 0, -0.45);
    head.rotation.x = -Math.PI / 2;
    const fletch = makeBox(0.012, 0.09, 0.14, materials.cloth, 0, 0, 0.34);
    group.add(shaft, head, fletch);
    const flameParts = [];
    if (flaming) {
      const flameMaterial = materials.fire.clone();
      flameMaterial.transparent = true;
      flameMaterial.opacity = 0.82;
      flameMaterial.depthWrite = false;
      const coreMaterial = materials.fireCore.clone();
      coreMaterial.transparent = true;
      coreMaterial.opacity = 0.92;
      coreMaterial.depthWrite = false;
      const flame = makeCylinder(0.0, 0.075, 0.28, 8, flameMaterial, 0, 0, -0.55);
      flame.rotation.x = -Math.PI / 2;
      const core = makeCylinder(0.0, 0.032, 0.18, 8, coreMaterial, 0, 0, -0.59);
      core.rotation.x = -Math.PI / 2;
      const ember = makeSphere(0.035, coreMaterial.clone(), 0, 0, -0.22);
      group.add(flame, core, ember);
      flameParts.push(flame, core, ember);
    }
    group.rotation.y = Math.atan2(-velocity.x, -velocity.z);
    scene.add(group);
    return {
      netId: options.netId || nextNetworkId("projectile"),
      type: "arrow",
      group,
      shell: null,
      core: null,
      ringA: null,
      ringB: null,
      velocity,
      speed: velocity.length(),
      turnRate: 0,
      life: options.life || 1.5,
      damage: options.damage ?? 28,
      stun: options.stun ?? 0.22,
      radius: 0.42,
      pierce: !!options.pierce,
      hitIds: options.pierce ? new Set() : null,
      flaming,
      flameParts,
      impactColor: options.impactColor || (flaming ? 0xff7b2e : null),
      impactCount: options.impactCount ?? (flaming ? 14 : 16),
      expireImpactCount: options.expireImpactCount ?? (flaming ? 6 : null),
      impactSfx: options.impactSfx || (flaming ? "flamingArrowImpact" : ""),
      visualOnly: !!options.visualOnly
    };
  }

  function launchArrow(kind = "arrow") {
    const source = player.group.localToWorld(new THREE.Vector3(0.32, 1.5, -0.62));
    const direction = forwardFromYaw(player.yaw, new THREE.Vector3());
    const tuning = combatTuningFor("ranger");
    const pierce = kind === "pierce";
    const heartseeker = kind === "heartseeker";
    const speedMul = heartseeker ? 1.23 : pierce ? 1.15 : 1;
    const velocity = direction.clone().multiplyScalar(tuning.arrowSpeed * speedMul);
    const damage = heartseeker
      ? tuning.heartseekerDamageMin + Math.floor(Math.random() * tuning.heartseekerDamageSpread)
      : pierce
      ? tuning.pierceDamageMin + Math.floor(Math.random() * tuning.pierceDamageSpread)
      : tuning.arrowDamageMin + tuning.arrowDamageBonus + Math.floor(Math.random() * tuning.arrowDamageSpread);
    game.playerProjectiles.push(tagActiveCombatActor(createArrowProjectile(source, velocity, {
      damage,
      pierce,
      flaming: pierce,
      impactColor: pierce ? 0xff7b2e : undefined,
      impactCount: pierce ? 14 : 16,
      expireImpactCount: pierce ? 6 : undefined,
      impactSfx: pierce ? "flamingArrowImpact" : "",
      stun: heartseeker ? 0.8 : pierce ? 0.4 : 0.22,
      life: heartseeker ? 1.9 : pierce ? 1.7 : tuning.arrowLife
    })));
  }

  function launchLightningBall() {
    const source = player.group.localToWorld(new THREE.Vector3(0.55, 1.55, -0.72));
    const direction = forwardFromYaw(player.yaw, new THREE.Vector3());
    const velocity = direction.clone().multiplyScalar(12.8);
    const tuning = combatTuningFor("wizard");
    game.playerProjectiles.push(tagActiveCombatActor(createLightningProjectile(source, velocity, {
      damage: tuning.lightningDamageMin + tuning.lightningDamageBonus + Math.floor(Math.random() * tuning.lightningDamageSpread),
      turnRate: tuning.lightningTurnRate,
      life: tuning.lightningLife,
      visualOnly: !canSimulateSharedWorld()
    })));
  }

  function spawnRemoteLightningVisual(source, yaw) {
    const start = source.clone();
    const direction = forwardFromYaw(yaw, new THREE.Vector3());
    start.y = (game.mode === "exploration" ? explorationGroundWorldY(start.x, start.z) : 0) + 1.45;
    start.addScaledVector(direction, 0.72);
    game.playerProjectiles.push(createLightningProjectile(start, direction.multiplyScalar(12.8), {
      visualOnly: true,
      life: 1.35,
      damage: 0,
      stun: 0
    }));
  }

  function spawnRemoteArrowVisual(source, yaw, variant = "arrow") {
    const start = source.clone();
    const direction = forwardFromYaw(yaw, new THREE.Vector3());
    const flaming = variant === "flaming";
    const heavy = flaming || variant === "heartseeker";
    start.y = (game.mode === "exploration" ? explorationGroundWorldY(start.x, start.z) : 0) + 1.5;
    start.addScaledVector(direction, 0.62);
    game.playerProjectiles.push(createArrowProjectile(start, direction.multiplyScalar(26 * (heavy ? 1.15 : 1)), {
      visualOnly: true,
      flaming,
      impactColor: flaming ? 0xff7b2e : undefined,
      impactSfx: flaming ? "flamingArrowImpact" : "",
      life: heavy ? 1.0 : 0.85,
      damage: 0,
      stun: 0
    }));
  }

  function performWizardBurst() {
    const radius = 3.35;
    const tuning = combatTuningFor("wizard");
    let hitAny = false;
    if (canSimulateSharedWorld()) {
      for (const enemy of game.enemies) {
        if (enemy.dead || !enemyMatchesActiveCombat(enemy)) {
          continue;
        }
        const direction = tmpVec2.copy(enemy.position).sub(player.position);
        const distance = Math.max(0.001, Math.hypot(direction.x, direction.z));
        if (distance > radius + enemy.radius) {
          continue;
        }
        direction.y = 0;
        direction.multiplyScalar(1 / distance);
        damageEnemy(enemy, tuning.burstDamageMin + Math.floor(Math.random() * tuning.burstDamageSpread), direction, 0.78);
        enemy.velocity.addScaledVector(direction, 2.4);
        hitAny = true;
      }
    }
    spawnImpact(player.position, hitAny ? 0x7ae8ff : 0xbff8ff, hitAny ? 26 : 16);
  }

  function getEnemyAimPosition(enemy, out) {
    if (enemy.type === "dragon") {
      return out.copy(enemy.group.position);
    }
    // Anchor aim height to the rendered base (terrain in exploration, 0 in the
    // arena) so elevated enemies are targeted at their actual body, not at a
    // fixed world height tuned for flat ground.
    const baseY = enemy.group.position.y;
    if (enemy.type === "wisp") {
      return out.set(enemy.position.x, baseY + 1.05, enemy.position.z);
    }
    if (enemy.type === "sandViper") {
      return out.set(enemy.position.x, baseY + 0.65, enemy.position.z);
    }
    return out.set(enemy.position.x, baseY + 1.08, enemy.position.z);
  }

  function enemyBodyHeight(enemy) {
    const scale = enemy.scale || 1;
    if (enemy.type === "sandViper") {
      return 1.1 * scale;
    }
    if (enemy.type === "spider") {
      return 1.3 * scale;
    }
    if (enemy.type === "wisp") {
      return 1.75 * scale;
    }
    return 2.2 * scale;
  }

  // Swept hit test: the projectile's travel segment this frame is tested against
  // the enemy's actual body volume (a terrain-anchored vertical cylinder, or a
  // sphere around the dragon's hovering body). This makes elevated shots connect
  // and prevents fast arrows from tunneling past a target between frames.
  function projectileSegmentHitsEnemy(projectile, enemy, fromX, fromY, fromZ) {
    const to = projectile.group.position;
    const hitRadius = enemy.radius + projectile.radius;
    if (enemy.type === "dragon") {
      const center = enemy.group.position;
      const dx = to.x - fromX;
      const dy = to.y - fromY;
      const dz = to.z - fromZ;
      const lengthSq = dx * dx + dy * dy + dz * dz;
      const t = lengthSq < 0.000001
        ? 0
        : clamp(((center.x - fromX) * dx + (center.y - fromY) * dy + (center.z - fromZ) * dz) / lengthSq, 0, 1);
      const cx = fromX + dx * t - center.x;
      const cy = fromY + dy * t - center.y;
      const cz = fromZ + dz * t - center.z;
      return cx * cx + cy * cy + cz * cz <= hitRadius * hitRadius;
    }
    const baseY = enemy.group.position.y;
    const minY = baseY - projectile.radius;
    const maxY = baseY + enemyBodyHeight(enemy) + projectile.radius;
    const dx = to.x - fromX;
    const dz = to.z - fromZ;
    const fx = fromX - enemy.position.x;
    const fz = fromZ - enemy.position.z;
    const a = dx * dx + dz * dz;
    const b = 2 * (fx * dx + fz * dz);
    const c = fx * fx + fz * fz - hitRadius * hitRadius;
    let tMin = 0;
    let tMax = 1;
    if (a < 0.000001) {
      if (c > 0) {
        return false;
      }
    } else {
      const disc = b * b - 4 * a * c;
      if (disc < 0) {
        return false;
      }
      const sqrtDisc = Math.sqrt(disc);
      tMin = Math.max(0, (-b - sqrtDisc) / (2 * a));
      tMax = Math.min(1, (-b + sqrtDisc) / (2 * a));
      if (tMin > tMax) {
        return false;
      }
    }
    const dy = to.y - fromY;
    if (Math.abs(dy) < 0.000001) {
      return fromY >= minY && fromY <= maxY;
    }
    let tEnter = (minY - fromY) / dy;
    let tExit = (maxY - fromY) / dy;
    if (tEnter > tExit) {
      const swap = tEnter;
      tEnter = tExit;
      tExit = swap;
    }
    return Math.max(tMin, tEnter) <= Math.min(tMax, tExit);
  }

  function findLightningTarget(projectile) {
    let best = null;
    let bestScore = Infinity;
    const currentDirection = projectile.velocity.clone().normalize();
    for (const enemy of game.enemies) {
      if (enemy.dead || !enemyMatchesActiveCombat(enemy)) {
        continue;
      }
      const targetPosition = getEnemyAimPosition(enemy, new THREE.Vector3());
      const toTarget = targetPosition.clone().sub(projectile.group.position);
      const distance = toTarget.length();
      if (distance > 11.5 || distance < 0.001) {
        continue;
      }
      const aim = currentDirection.dot(toTarget.clone().normalize());
      if (aim < 0.24) {
        continue;
      }
      const score = distance - aim * 3.0;
      if (score < bestScore) {
        bestScore = score;
        best = targetPosition;
      }
    }
    return best;
  }

  function updatePlayerProjectiles(dt) {
    for (let i = game.playerProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = game.playerProjectiles[i];
      projectile.life -= dt;

      const target = projectile.visualOnly || projectile.turnRate <= 0 ? null : findLightningTarget(projectile);
      if (target) {
        const desired = target.sub(projectile.group.position);
        if (desired.lengthSq() > 0.0001) {
          desired.normalize();
          const current = projectile.velocity.clone().normalize();
          current.lerp(desired, clamp(projectile.turnRate * dt, 0, 0.035)).normalize();
          projectile.velocity.copy(current).multiplyScalar(projectile.speed);
        }
      }

      const fromX = projectile.group.position.x;
      const fromY = projectile.group.position.y;
      const fromZ = projectile.group.position.z;
      projectile.group.position.addScaledVector(projectile.velocity, dt);
      if (projectile.shell) {
        projectile.shell.rotation.y += dt * 9.0;
        projectile.shell.rotation.x += dt * 7.4;
        projectile.ringA.rotation.z += dt * 8.5;
        projectile.ringB.rotation.x -= dt * 7.2;
        const pulse = 1 + Math.sin(clock.elapsedTime * 20 + i) * 0.12;
        projectile.core.scale.setScalar(1.08 + Math.sin(clock.elapsedTime * 28 + i) * 0.18);
        projectile.shell.scale.setScalar(pulse);
      }
      if (projectile.flaming && projectile.flameParts) {
        const flicker = 1 + Math.sin(clock.elapsedTime * 34 + i * 1.7) * 0.18;
        projectile.flameParts.forEach((part, index) => {
          const base = index === 1 ? 0.82 : index === 2 ? 0.68 : 1.0;
          part.scale.setScalar(base * flicker);
          if (part.material && part.material.opacity != null) {
            part.material.opacity = index === 2 ? 0.55 + (flicker - 1) * 0.8 : 0.78 + (flicker - 1) * 0.7;
          }
        });
      }
      const impactColor = projectile.impactColor || (projectile.type === "arrow" ? 0xd6c08a : 0x7ae8ff);

      let consumed = false;
      if (!projectile.visualOnly && canSimulateSharedWorld()) {
        for (const enemy of game.enemies) {
          if (enemy.dead || !enemyMatchesActiveCombat(enemy)) {
            continue;
          }
          if (projectile.hitIds && projectile.hitIds.has(enemy)) {
            continue;
          }
          if (!projectileSegmentHitsEnemy(projectile, enemy, fromX, fromY, fromZ)) {
            continue;
          }
          const hitDirection = projectile.velocity.clone();
          hitDirection.y = 0;
          if (hitDirection.lengthSq() > 0.0001) {
            hitDirection.normalize();
          } else {
            hitDirection.copy(forwardFromYaw(player.yaw, hitDirection));
          }
          damageEnemy(enemy, projectile.damage, hitDirection, projectile.stun);
          spawnImpact(projectile.group.position, impactColor, projectile.impactCount ?? 16);
          if (projectile.impactSfx) {
            playPositionalSfx(projectile.impactSfx, projectile.group.position, 0.62, 34);
          }
          if (projectile.pierce) {
            projectile.hitIds.add(enemy);
            continue;
          }
          scene.remove(projectile.group);
          game.playerProjectiles.splice(i, 1);
          consumed = true;
          break;
        }
      }

      if (consumed) {
        continue;
      }

      const dist = game.mode === "exploration"
        ? projectile.group.position.distanceTo(game.exploration.origin)
        : Math.hypot(projectile.group.position.x, projectile.group.position.z);
      const maxProjectileDistance = game.mode === "exploration" ? game.exploration.radius + 28 : arenaRadius + 14;
      if (projectile.life <= 0 || dist > maxProjectileDistance) {
        spawnImpact(projectile.group.position, impactColor, projectile.expireImpactCount ?? (projectile.type === "arrow" ? 6 : 10));
        if (projectile.impactSfx && projectile.flaming) {
          playPositionalSfx(projectile.impactSfx, projectile.group.position, 0.4, 30);
        }
        scene.remove(projectile.group);
        game.playerProjectiles.splice(i, 1);
      }
    }
  }

  function damageEnemy(enemy, damage, direction, stun, sourceId = online.localId) {
    if (!canSimulateSharedWorld()) {
      return;
    }
    const activity = activeCombatActivity();
    if (activity && enemy.activityId !== activity.activityId) {
      return;
    }
    enemy.health -= damage;
    enemy.stunned = Math.max(enemy.stunned, stun);
    enemy.velocity.addScaledVector(direction, 4.3);
    const impactPosition = enemy.type === "dragon" ? enemy.group.position : enemy.type === "wisp" ? tmpVec.set(enemy.position.x, 1.05, enemy.position.z) : enemy.type === "briarBeast" ? tmpVec.set(enemy.position.x, 0.85, enemy.position.z) : enemy.type === "sandViper" ? tmpVec.set(enemy.position.x, 0.6, enemy.position.z) : enemy.position;
    const impactColor = enemy.type === "dragon" ? 0xffb15d : enemy.type === "spider" ? 0xd9a648 : enemy.type === "wisp" ? 0x8affd2 : enemy.type === "briarBeast" ? 0xb9d678 : enemy.type === "banditArcher" ? 0xd9c08a : enemy.type === "sandViper" ? 0xc9b06a : enemy.type === "bonewarden" ? 0xe6e0c8 : enemy.type === "bogLurker" ? 0x86b06a : 0xffd19b;
    spawnImpact(impactPosition, impactColor, enemy.type === "dragon" ? 14 : 10);
    playSfx("enemyHit", enemy.type === "dragon" ? 1.2 : 0.9);
    broadcastOnlineEffect({
      type: "impact",
      x: impactPosition.x,
      y: impactPosition.y || 0,
      z: impactPosition.z,
      color: impactColor,
      count: enemy.type === "dragon" ? 14 : 10
    });
    if (enemy.health <= 0) {
      enemy.dead = true;
      if (enemy.type === "dragon") {
        dropDragonHealthPotion(enemy);
      } else if (game.mode === "exploration" && !arenaActivityActive() && !dungeonActivityActive() && Math.random() < (enemy.type === "spider" ? 0.13 : enemy.type === "wisp" ? 0.16 : 0.2)) {
        game.potions.push(createHealthPotion(enemy.position.x, enemy.position.z, { kind: "small", healAmount: 14 }));
        trimPotionDrops();
      }
      scene.remove(enemy.group);
      game.kills += 1;
      if (game.mode === "exploration" && enemy.exploration) {
        applyExplorationEnemyReward(enemy, sourceId);
        scheduleWildsRespawn(enemy);
      }
    }
  }

  // --- Wilds Director (Phase 1): timed far-from-player respawns at the
  // original exploration seed points. Runs only where updateExplorationEnemies
  // runs (host/solo, never during Crownring activity); joiners receive the
  // respawned enemies through the regular world snapshots.

  function wildsTierDelayMultiplier(tier) {
    const index = clamp((tier || 1) - 1, 0, WILDS_TIER_DELAY_MUL.length - 1);
    return WILDS_TIER_DELAY_MUL[index];
  }

  // Tier band a respawn at this world position would land in (mirrors the
  // distance-from-origin banding in applyEnemyTier).
  function wildsTierAt(worldX, worldZ) {
    const radius = Math.max(1, game.exploration.radius);
    const danger = Math.hypot(worldX - game.exploration.origin.x, worldZ - game.exploration.origin.z) / radius;
    if (danger < 0.25) {
      return 1;
    }
    return danger >= 0.5 ? 3 : 2;
  }

  function scheduleWildsRespawn(enemy, tier = enemy.tier) {
    const wilds = game.exploration.wilds;
    const record = Number.isInteger(enemy.wildsSeedId) ? wilds.seedPoints[enemy.wildsSeedId] : null;
    if (!record || record.respawnAt > 0) {
      return;
    }
    const delay = (WILDS_RESPAWN_DELAY + Math.random() * WILDS_RESPAWN_JITTER) * wildsTierDelayMultiplier(tier);
    record.respawnAt = clock.elapsedTime + delay;
    record.clearedBonus = 0;
    // Cleared-zone pushback: every kill delays already-empty neighbor points,
    // so a fought-over battlefield stays clear noticeably longer than a lone
    // kill. Capped per record so timers can't run away.
    for (const other of wilds.seedPoints) {
      if (other === record || other.respawnAt <= 0) {
        continue;
      }
      const dx = other.x - record.x;
      const dz = other.z - record.z;
      if (dx * dx + dz * dz > WILDS_CLEARED_ZONE_RADIUS * WILDS_CLEARED_ZONE_RADIUS) {
        continue;
      }
      const bonus = Math.min(WILDS_CLEARED_ZONE_BONUS, WILDS_CLEARED_ZONE_MAX_BONUS - other.clearedBonus);
      if (bonus > 0) {
        other.clearedBonus += bonus;
        other.respawnAt += bonus;
      }
    }
  }

  function spawnWildsEnemy(record) {
    const enemy = createEnemyOfType(record.type, record.x, record.z, 1 + Math.floor(Math.random() * 3));
    // Restore the recorded pre-tier stats so the respawn matches the original
    // seed (factory wave rolls and per-seed health mods included); the
    // seedExplorationEnemy call below re-applies the distance tier on top.
    enemy.health = record.baseHealth;
    enemy.maxHealth = record.baseHealth;
    enemy.speed = record.baseSpeed;
    if (record.hoverHeight > 0) {
      enemy.hoverHeight = record.hoverHeight;
    }
    if (record.desiredRange > 0) {
      enemy.desiredRange = record.desiredRange;
    }
    enemy.wildsSeedId = record.id;
    seedExplorationEnemy(enemy, new THREE.Vector3(record.x, 0, record.z), Math.random, record.awareness, record.homeRadius);
    record.respawnAt = 0;
    record.clearedBonus = 0;
    return enemy;
  }

  function updateWildsDirector(dt) {
    const wilds = game.exploration.wilds;
    const total = wilds.seedPoints.length;
    if (!total) {
      return;
    }
    wilds.timer -= dt;
    if (wilds.timer > 0) {
      return;
    }
    wilds.timer = WILDS_DIRECTOR_INTERVAL;
    const now = clock.elapsedTime;
    // One pass over live enemies per tick (not per frame): global cap count
    // plus the set of seed points that still have their enemy alive.
    let liveCount = 0;
    const liveSeedIds = new Set();
    for (const enemy of game.enemies) {
      if (!enemy.exploration || enemy.dead) {
        continue;
      }
      liveCount += 1;
      if (Number.isInteger(enemy.wildsSeedId)) {
        liveSeedIds.add(enemy.wildsSeedId);
      }
    }
    const targets = combatTargets();
    const checks = Math.min(WILDS_CHECKS_PER_TICK, total);
    let spawns = 0;
    for (let i = 0; i < checks && spawns < WILDS_SPAWNS_PER_TICK; i += 1) {
      const record = wilds.seedPoints[wilds.cursor % total];
      wilds.cursor = (wilds.cursor + 1) % total;
      if (record.respawnAt <= 0) {
        // Self-heal: occupied on paper but no live enemy. Happens when shared
        // actors are wiped without deaths (e.g. the host opening the
        // Crownring clears all enemies); schedule a normal refill.
        if (!liveSeedIds.has(record.id)) {
          record.clearedBonus = 0;
          record.respawnAt = now + (WILDS_RESPAWN_DELAY + Math.random() * WILDS_RESPAWN_JITTER) * wildsTierDelayMultiplier(wildsTierAt(record.x, record.z));
        }
        continue;
      }
      if (now < record.respawnAt || liveCount >= WILDS_ENEMY_CAP) {
        continue;
      }
      // Never spawn in sight: the point must be far from EVERY player
      // (local + remotes). Leaving respawnAt untouched means a camped point
      // simply stays suppressed until players move on.
      let tooClose = false;
      for (const target of targets) {
        const dx = target.position.x - record.x;
        const dz = target.position.z - record.z;
        if (dx * dx + dz * dz < WILDS_MIN_PLAYER_DISTANCE * WILDS_MIN_PLAYER_DISTANCE) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) {
        continue;
      }
      // Area cap: don't pile spawns into a pocket that is already crowded.
      let nearby = 0;
      for (const enemy of game.enemies) {
        if (!enemy.exploration || enemy.dead) {
          continue;
        }
        const dx = enemy.position.x - record.x;
        const dz = enemy.position.z - record.z;
        if (dx * dx + dz * dz < WILDS_AREA_RADIUS * WILDS_AREA_RADIUS) {
          nearby += 1;
          if (nearby >= WILDS_AREA_CAP) {
            break;
          }
        }
      }
      if (nearby >= WILDS_AREA_CAP) {
        continue;
      }
      // Re-validate the point at spawn time. Seed points already passed the
      // build-time road-clearance + blocked checks and colliders are static,
      // but this keeps the invariant explicit and cheap.
      if (isExplorationBlocked(record.x - game.exploration.origin.x, record.z - game.exploration.origin.z)) {
        continue;
      }
      spawnWildsEnemy(record);
      spawns += 1;
      liveCount += 1;
    }
  }

  function chooseExplorationPatrolTarget(enemy) {
    const angle = Math.random() * TAU;
    const radius = 2.5 + Math.random() * (enemy.homeRadius || 9.5);
    const targetX = enemy.home.x + Math.cos(angle) * radius;
    const targetZ = enemy.home.z + Math.sin(angle) * radius;
    enemy.patrolTarget.set(
      targetX,
      explorationGroundWorldY(targetX, targetZ),
      targetZ
    );
    const local = explorationLocalPosition(enemy.patrolTarget, tmpVec);
    const maxRadius = game.exploration.radius - 4;
    const distance = Math.hypot(local.x, local.z);
    if (distance > maxRadius) {
      local.multiplyScalar(maxRadius / Math.max(0.001, distance));
      enemy.patrolTarget.x = game.exploration.origin.x + local.x;
      enemy.patrolTarget.z = game.exploration.origin.z + local.z;
    }
    enemy.patrolTarget.y = explorationGroundWorldY(enemy.patrolTarget.x, enemy.patrolTarget.z);
  }

  function constrainExplorationEnemy(enemy) {
    const local = explorationLocalPosition(enemy.position, tmpVec);
    const maxRadius = game.exploration.radius - 2.5;
    const distance = Math.hypot(local.x, local.z);
    if (distance > maxRadius) {
      local.multiplyScalar(maxRadius / Math.max(0.001, distance));
      enemy.position.x = game.exploration.origin.x + local.x;
      enemy.position.z = game.exploration.origin.z + local.z;
      enemy.velocity.multiplyScalar(0.25);
    }
  }

  function updateExplorationDragonEnemy(enemy, dt, playerDistance, playerDirection) {
    if (enemy.stunned > 0) {
      enemy.velocity.multiplyScalar(Math.pow(0.08, dt));
      enemy.position.addScaledVector(enemy.velocity, dt);
      enemy.velocity.multiplyScalar(Math.pow(0.24, dt));
      constrainExplorationEnemy(enemy);
      enemy.group.position.set(
        enemy.position.x,
        explorationGroundWorldY(enemy.position.x, enemy.position.z, enemy.hoverHeight),
        enemy.position.z
      );
      applyEnemyVisualYaw(enemy, dt);
      updateDragonAnimation(enemy, dt);
      updateEnemyMovementAudio(enemy, dt);
      return;
    }
    const active = playerDistance < enemy.awareness || ((enemy.state === "chase" || enemy.state === "fire") && playerDistance < enemy.awareness * 2.1);
    if (active) {
      if (enemy.state === "patrol") {
        enemy.state = "chase";
      }
      enemy.yaw = yawFromDirection(playerDirection);
      updateDragonEnemy(enemy, dt, playerDistance, playerDirection);
    } else {
      enemy.state = "patrol";
      if (patrolTargetReached(enemy, 1.2)) {
        chooseExplorationPatrolTarget(enemy);
      }
      const toPatrol = tmpVec2.copy(enemy.patrolTarget).sub(enemy.position);
      const patrolDistance = Math.max(0.001, Math.hypot(toPatrol.x, toPatrol.z));
      toPatrol.multiplyScalar(1 / patrolDistance);
      enemy.yaw = yawFromDirection(toPatrol);
      const desired = toPatrol.multiplyScalar(enemy.speed * 0.5);
      enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.018, dt));
      enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.018, dt));
    }

    enemy.position.addScaledVector(enemy.velocity, dt);
    enemy.velocity.multiplyScalar(Math.pow(0.24, dt));
    constrainExplorationEnemy(enemy);
    const hover = enemy.hoverHeight + Math.sin(clock.elapsedTime * 3.4 + enemy.bobSeed) * 0.28;
    enemy.group.position.set(enemy.position.x, explorationGroundWorldY(enemy.position.x, enemy.position.z, hover), enemy.position.z);
    applyEnemyVisualYaw(enemy, dt);
    updateDragonAnimation(enemy, dt);
    updateEnemyMovementAudio(enemy, dt);
  }

  function beginSpiderAttack(enemy) {
    enemy.state = "lunge";
    enemy.attackTimer = 0;
    enemy.attackHitDone = false;
    enemy.attackDuration = 0.58;
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = 0.42;
    playPositionalSfx("spiderLunge", enemy.position, 0.95, 38);
  }

  function updateSpiderAttack(enemy, dt, playerDistance, playerDirection) {
    enemy.attackTimer += dt;
    const t = enemy.attackTimer / enemy.attackDuration;
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = 0.42 * (1 - smoothstep(0.45, 1, t));
    if (t < 0.64) {
      enemy.velocity.addScaledVector(playerDirection, dt * enemy.speed * 3.2);
    }
    if (!enemy.attackHitDone && t > 0.38) {
      enemy.attackHitDone = true;
      if (playerDistance < 1.3 + enemy.radius) {
        const hitDirection = forwardFromYaw(enemy.yaw, tmpVec2);
        const mul = enemy.damageMul || 1;
        applyCombatTargetDamage(combatTargetById(enemy.targetId) || nearestCombatTarget(enemy), Math.round(19 * mul), Math.round(25 * mul), hitDirection, 0.18);
      }
    }
    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.cooldown = 0.6 + Math.random() * 0.45;
      enemy.telegraph.visible = false;
    }
  }

  function updateSpiderAnimation(enemy, dt) {
    const speed = Math.min(1, enemy.velocity.length() / Math.max(0.001, enemy.speed));
    enemy.walkTime += dt * enemy.speed * (0.8 + speed * 1.4);
    for (let i = 0; i < enemy.legs.length; i += 1) {
      const leg = enemy.legs[i];
      const side = leg.position.x < 0 ? -1 : 1;
      const phase = Math.sin(enemy.walkTime * 5.4 + i * 0.78) * 0.18 * (0.35 + speed);
      leg.rotation.z = side * (Math.PI / (i % 2 ? 2.75 : 2.35)) + phase * side;
    }
    enemy.body.rotation.x = enemy.stunned > 0 ? -0.18 : Math.sin(enemy.walkTime * 2.8) * 0.035;
  }

  function updateBriarBeastAnimation(enemy, dt) {
    const speed = Math.min(1, enemy.velocity.length() / Math.max(0.001, enemy.speed || 1));
    enemy.walkTime += dt * (enemy.speed || 2.3) * (0.75 + speed * 1.25);
    const legs = enemy.quadrupedLegs || [];
    for (let i = 0; i < legs.length; i += 1) {
      const leg = legs[i];
      const phase = Math.sin(enemy.walkTime * 5.9 + i * Math.PI * 0.92) * 0.34 * speed;
      leg.rotation.x = phase;
    }
    if (enemy.body) {
      enemy.body.rotation.x = enemy.stunned > 0 ? -0.12 : Math.sin(enemy.walkTime * 2.6) * 0.035 * speed;
    }
    if (enemy.chest) {
      enemy.chest.rotation.x = enemy.stunned > 0 ? -0.18 : Math.sin(enemy.walkTime * 3.0) * 0.04 * speed;
    }
    if (enemy.headPivot && enemy.state !== "attack") {
      const settle = 1 - Math.pow(0.0002, dt);
      enemy.headPivot.rotation.x = lerp(enemy.headPivot.rotation.x, Math.sin(enemy.walkTime * 2.4) * 0.05, settle);
      enemy.headPivot.rotation.y = lerp(enemy.headPivot.rotation.y, 0, settle);
      enemy.headPivot.rotation.z = lerp(enemy.headPivot.rotation.z, 0, settle);
    }
  }

  function updateExplorationSpiderEnemy(enemy, dt, playerDistance, playerDirection) {
    if (enemy.stunned > 0) {
      enemy.velocity.multiplyScalar(Math.pow(0.06, dt));
      enemy.telegraph.visible = false;
    } else if (enemy.state === "lunge") {
      enemy.yaw = yawFromDirection(playerDirection);
      updateSpiderAttack(enemy, dt, playerDistance, playerDirection);
    } else {
      const shouldChase = playerDistance < enemy.awareness || (enemy.state === "chase" && playerDistance < enemy.awareness * 1.9);
      if (shouldChase) {
        enemy.state = "chase";
        enemy.yaw = yawFromDirection(playerDirection);
        // Pounce from arm's length; the lunge itself closes the remaining gap.
        if (playerDistance < 1.45 + enemy.radius && enemy.cooldown <= 0) {
          beginSpiderAttack(enemy);
        } else {
          const desired = playerDirection.multiplyScalar(enemy.speed * 1.02);
          enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.018, dt));
          enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.018, dt));
        }
      } else {
        enemy.state = "patrol";
        if (patrolTargetReached(enemy, 0.65)) {
          chooseExplorationPatrolTarget(enemy);
        }
        const toPatrol = tmpVec2.copy(enemy.patrolTarget).sub(enemy.position);
        const patrolDistance = Math.max(0.001, Math.hypot(toPatrol.x, toPatrol.z));
        toPatrol.multiplyScalar(1 / patrolDistance);
        enemy.yaw = yawFromDirection(toPatrol);
        const desired = toPatrol.multiplyScalar(enemy.speed * 0.36);
        enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.02, dt));
        enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.02, dt));
        enemy.telegraph.visible = false;
      }
    }

    enemy.position.addScaledVector(enemy.velocity, dt);
    enemy.velocity.multiplyScalar(Math.pow(0.22, dt));
    constrainExplorationEnemy(enemy);
    enemy.group.position.set(enemy.position.x, explorationGroundWorldY(enemy.position.x, enemy.position.z), enemy.position.z);
    applyEnemyVisualYaw(enemy, dt);
    updateSpiderAnimation(enemy, dt);
    updateEnemyMovementAudio(enemy, dt);
  }

  function beginWispAttack(enemy) {
    enemy.state = "pulse";
    enemy.attackTimer = 0;
    enemy.attackHitDone = false;
    enemy.attackDuration = 0.76;
    enemy.velocity.multiplyScalar(0.25);
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = 0.38;
    enemy.telegraph.scale.setScalar(0.82);
    playPositionalSfx("wispPulse", enemy.position, 0.9, 42);
  }

  function updateWispAttack(enemy, dt, playerDistance, playerDirection) {
    enemy.attackTimer += dt;
    const t = enemy.attackTimer / enemy.attackDuration;
    enemy.telegraph.visible = true;
    enemy.telegraph.scale.setScalar(0.82 + smoothstep(0, 0.72, t) * 1.15);
    enemy.telegraph.material.opacity = 0.4 * (1 - smoothstep(0.45, 1, t));
    enemy.floatRoot.scale.setScalar(1 + Math.sin(clamp(t, 0, 1) * Math.PI) * 0.22);
    if (!enemy.attackHitDone && t > 0.5) {
      enemy.attackHitDone = true;
      if (playerDistance < 2.65) {
        const hitDirection = forwardFromYaw(enemy.yaw, tmpVec2);
        const mul = enemy.damageMul || 1;
        applyCombatTargetDamage(combatTargetById(enemy.targetId) || nearestCombatTarget(enemy), Math.round(18 * mul), Math.round(27 * mul), hitDirection, 0.16);
        spawnImpact(tmpVec.set(enemy.position.x, explorationGroundWorldY(enemy.position.x, enemy.position.z, 1.0), enemy.position.z), 0x8affd2, 16);
      }
    }
    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.cooldown = 0.8 + Math.random() * 0.55;
      enemy.telegraph.visible = false;
      enemy.floatRoot.scale.setScalar(1);
    }
  }

  function updateWispAnimation(enemy, dt) {
    const time = clock.elapsedTime + enemy.bobSeed;
    const bob = Math.sin(time * 3.2) * 0.16;
    enemy.floatRoot.position.y = 0.98 + bob;
    enemy.shell.scale.setScalar(1.02 + Math.sin(time * 5.1) * 0.08);
    enemy.core.scale.setScalar(1.0 + Math.sin(time * 7.2) * 0.16);
    enemy.core.material.opacity = 0.82 + Math.sin(time * 9.4) * 0.14;
    enemy.ringA.rotation.z += dt * 2.7;
    enemy.ringB.rotation.x -= dt * 3.6;
    if (enemy.ringC) {
      enemy.ringC.rotation.y += dt * 1.8;
    }
    for (let i = 0; i < enemy.sparks.length; i += 1) {
      const angle = time * (1.2 + i * 0.18) + i * TAU / enemy.sparks.length;
      const radius = 0.42 + Math.sin(time * 2.1 + i) * 0.06;
      enemy.sparks[i].position.set(Math.cos(angle) * radius, Math.sin(time * 3.8 + i) * 0.12, Math.sin(angle) * radius);
    }
    if (enemy.trail && enemy.trail.length) {
      // Trail in floatRoot-local space: convert world velocity into the group's
      // local frame so the wake streams out directly behind the direction of travel.
      const back = tmpVec.copy(enemy.velocity);
      back.y = 0;
      const sp = back.length();
      if (sp > 0.001 && enemy.group) {
        back.normalize().applyQuaternion(enemy.group.quaternion.clone().invert());
      } else {
        back.set(0, 0, 0);
      }
      for (let i = 0; i < enemy.trail.length; i += 1) {
        const dist = (i + 1) * 0.24;
        enemy.trail[i].position.set(
          -back.x * dist,
          Math.sin(time * 4.0 + i) * 0.05 - i * 0.015,
          -back.z * dist
        );
        enemy.trail[i].scale.setScalar(Math.max(0.22, 1 - i * 0.16));
      }
    }
    if (enemy.embers && enemy.embers.length) {
      for (let i = 0; i < enemy.embers.length; i += 1) {
        const rise = (time * 0.6 + i * 0.4) % 1;
        const angle = time * 0.8 + i * TAU / enemy.embers.length;
        enemy.embers[i].position.set(Math.cos(angle) * 0.18, -0.2 + rise * 0.7, Math.sin(angle) * 0.18);
        enemy.embers[i].material.opacity = 0.7 * (1 - rise);
      }
    }
  }

  function updateExplorationWispEnemy(enemy, dt, playerDistance, playerDirection) {
    if (enemy.stunned > 0) {
      enemy.velocity.multiplyScalar(Math.pow(0.07, dt));
      enemy.telegraph.visible = false;
      enemy.floatRoot.scale.setScalar(1);
    } else if (enemy.state === "pulse") {
      enemy.yaw = yawFromDirection(playerDirection);
      updateWispAttack(enemy, dt, playerDistance, playerDirection);
    } else if (enemy.state === "hex") {
      enemy.yaw = yawFromDirection(playerDirection);
      updateWispHexAttack(enemy, dt);
    } else {
      const shouldChase = playerDistance < enemy.awareness || ((enemy.state === "chase" || enemy.state === "hex") && playerDistance < enemy.awareness * 2.0);
      if (shouldChase) {
        enemy.state = "chase";
        enemy.yaw = yawFromDirection(playerDirection);
        if (playerDistance < 2.7 && enemy.cooldown <= 0) {
          beginWispAttack(enemy);
        } else if (playerDistance >= 4.2 && playerDistance < 16 && enemy.cooldown <= 0) {
          beginWispHexAttack(enemy);
        } else {
          const desired = tmpVec2.set(0, 0, 0);
          if (playerDistance > 4.8) {
            desired.copy(playerDirection).multiplyScalar(enemy.speed);
          } else if (playerDistance < 3.2) {
            desired.copy(playerDirection).multiplyScalar(-enemy.speed * 0.78);
          } else {
            desired.set(-playerDirection.z, 0, playerDirection.x).multiplyScalar(enemy.speed * 0.5);
          }
          enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.017, dt));
          enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.017, dt));
          enemy.telegraph.visible = false;
        }
      } else {
        enemy.state = "patrol";
        if (patrolTargetReached(enemy, 0.75)) {
          chooseExplorationPatrolTarget(enemy);
        }
        const toPatrol = tmpVec2.copy(enemy.patrolTarget).sub(enemy.position);
        const patrolDistance = Math.max(0.001, Math.hypot(toPatrol.x, toPatrol.z));
        toPatrol.multiplyScalar(1 / patrolDistance);
        enemy.yaw = yawFromDirection(toPatrol);
        const desired = toPatrol.multiplyScalar(enemy.speed * 0.32);
        enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.022, dt));
        enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.022, dt));
        enemy.telegraph.visible = false;
      }
    }

    enemy.position.addScaledVector(enemy.velocity, dt);
    enemy.velocity.multiplyScalar(Math.pow(0.25, dt));
    constrainExplorationEnemy(enemy);
    enemy.group.position.set(enemy.position.x, explorationGroundWorldY(enemy.position.x, enemy.position.z), enemy.position.z);
    applyEnemyVisualYaw(enemy, dt);
    updateWispAnimation(enemy, dt);
    updateEnemyMovementAudio(enemy, dt);
  }

  // Shared patrol wander used by the ground/serpent ranged attackers.
  function explorationPatrolStep(enemy, dt, speedMul, settle = 0.02) {
    if (patrolTargetReached(enemy, 0.7)) {
      chooseExplorationPatrolTarget(enemy);
    }
    const toPatrol = tmpVec2.copy(enemy.patrolTarget).sub(enemy.position);
    const distance = Math.max(0.001, Math.hypot(toPatrol.x, toPatrol.z));
    toPatrol.multiplyScalar(1 / distance);
    enemy.yaw = yawFromDirection(toPatrol);
    const desired = toPatrol.multiplyScalar(enemy.speed * speedMul);
    enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(settle, dt));
    enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(settle, dt));
  }

  // Kiting movement: hold a preferred firing range, back off when crowded, and
  // strafe when in the pocket. Mirrors the drake's range-keeping logic.
  function rangedKiterMove(enemy, dt, distance, direction, strafeMul = 0.4) {
    const range = enemy.desiredRange || 9;
    const desired = tmpVec2.set(0, 0, 0);
    if (distance > range + 1.6) {
      desired.copy(direction).multiplyScalar(enemy.speed);
    } else if (distance < range - 1.8) {
      desired.copy(direction).multiplyScalar(-enemy.speed * 0.82);
    } else {
      desired.set(-direction.z, 0, direction.x).multiplyScalar(enemy.speed * strafeMul);
    }
    enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.016, dt));
    enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.016, dt));
  }

  function beginBanditAttack(enemy) {
    enemy.state = "draw";
    enemy.attackTimer = 0;
    enemy.attackHitDone = false;
    enemy.attackDuration = 0.92;
    enemy.velocity.multiplyScalar(0.3);
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = 0.34;
    enemy.telegraph.scale.setScalar(0.9);
  }

  function updateBanditAttack(enemy, dt) {
    enemy.attackTimer += dt;
    const t = enemy.attackTimer / enemy.attackDuration;
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = 0.34 * (1 - smoothstep(0.6, 1, t));
    const draw = clamp(t / 0.62, 0, 1);
    if (enemy.bowArmR) {
      enemy.bowArmR.rotation.x = -0.55 - draw * 0.55;
    }
    if (enemy.bowArmL) {
      enemy.bowArmL.rotation.x = -0.9 - draw * 0.06;
    }
    if (!enemy.attackHitDone && t > 0.62) {
      enemy.attackHitDone = true;
      launchEnemyOrb(enemy, {
        variant: "arrow",
        speed: 20,
        turnRate: 0,
        life: 1.7,
        damage: 16,
        guardDamage: 22,
        aimHeight: 1.0,
        sourceLocal: new THREE.Vector3(-0.5, 1.55, -0.5),
        launchSfx: "arrow",
        launchVolume: 0.7,
        launchDistance: 46
      });
    }
    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.cooldown = 1.25 + Math.random() * 0.7;
      enemy.telegraph.visible = false;
      if (enemy.bowArmR) {
        enemy.bowArmR.rotation.x = -0.55;
      }
      if (enemy.bowArmL) {
        enemy.bowArmL.rotation.x = -0.9;
      }
    }
  }

  function updateExplorationBanditEnemy(enemy, dt, playerDistance, playerDirection) {
    if (enemy.stunned > 0) {
      enemy.velocity.multiplyScalar(Math.pow(0.07, dt));
      enemy.telegraph.visible = false;
    } else if (enemy.state === "draw") {
      enemy.yaw = yawFromDirection(playerDirection);
      updateBanditAttack(enemy, dt);
    } else {
      const shouldChase = playerDistance < enemy.awareness || (enemy.state === "chase" && playerDistance < enemy.awareness * 2.0);
      if (shouldChase) {
        enemy.state = "chase";
        enemy.yaw = yawFromDirection(playerDirection);
        if (playerDistance < 16 && playerDistance > 3.2 && enemy.cooldown <= 0) {
          beginBanditAttack(enemy);
        } else {
          rangedKiterMove(enemy, dt, playerDistance, playerDirection, 0.36);
          enemy.walkTime += dt * enemy.speed * (enemy.velocity.length() > 0.3 ? 1 : 0.4);
          enemy.telegraph.visible = false;
        }
      } else {
        enemy.state = "patrol";
        explorationPatrolStep(enemy, dt, 0.42);
        enemy.walkTime += dt * enemy.speed * 0.45;
        enemy.telegraph.visible = false;
      }
    }

    enemy.position.addScaledVector(enemy.velocity, dt);
    enemy.velocity.multiplyScalar(Math.pow(0.24, dt));
    constrainExplorationEnemy(enemy);
    enemy.group.position.set(enemy.position.x, explorationGroundWorldY(enemy.position.x, enemy.position.z), enemy.position.z);
    applyEnemyVisualYaw(enemy, dt);
    const legSwing = Math.sin(enemy.walkTime * 6.5) * Math.min(0.4, enemy.velocity.length() * 0.09);
    enemy.leftLeg.rotation.x = legSwing;
    enemy.rightLeg.rotation.x = -legSwing;
    updateEnemyMovementAudio(enemy, dt);
  }

  function updateViperAnimation(enemy, dt) {
    const speed = Math.min(1, enemy.velocity.length() / Math.max(0.001, enemy.speed));
    enemy.walkTime += dt * (1.6 + speed * 4);
    const segments = enemy.segments || [];
    for (let i = 0; i < segments.length; i += 1) {
      segments[i].position.x = Math.sin(enemy.walkTime - i * 0.6) * (0.16 + i * 0.02) * (0.4 + speed);
    }
    if (enemy.tongue) {
      enemy.tongue.visible = enemy.state !== "spit" && Math.sin(enemy.walkTime * 3) > 0.7;
    }
    if (enemy.neckPivot && enemy.state !== "spit") {
      enemy.neckPivot.rotation.x = lerp(enemy.neckPivot.rotation.x, -0.2 + Math.sin(enemy.walkTime * 0.8) * 0.05, 1 - Math.pow(0.002, dt));
    }
  }

  function beginViperAttack(enemy) {
    enemy.state = "spit";
    enemy.attackTimer = 0;
    enemy.attackHitDone = false;
    enemy.attackDuration = 0.86;
    enemy.velocity.multiplyScalar(0.25);
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = 0.4;
    enemy.telegraph.scale.setScalar(0.85);
    playPositionalSfx("spiderLunge", enemy.position, 0.7, 40);
  }

  function updateViperAttack(enemy, dt) {
    enemy.attackTimer += dt;
    const t = enemy.attackTimer / enemy.attackDuration;
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = 0.4 * (1 - smoothstep(0.5, 1, t));
    const rear = Math.sin(clamp(t, 0, 1) * Math.PI);
    if (enemy.neckPivot) {
      enemy.neckPivot.rotation.x = -0.2 - rear * 0.55;
    }
    if (enemy.mouthGlow) {
      enemy.mouthGlow.visible = t > 0.3 && t < 0.85;
      enemy.mouthGlow.scale.setScalar(0.7 + rear * 1.4);
    }
    if (!enemy.attackHitDone && t > 0.55) {
      enemy.attackHitDone = true;
      launchEnemyOrb(enemy, {
        variant: "venom",
        speed: 11,
        turnRate: 0.5,
        life: 2.8,
        damage: 18,
        guardDamage: 24,
        aimHeight: 0.9,
        sourceLocal: new THREE.Vector3(0, 0.75, -0.85),
        launchSfx: "wispPulse",
        launchVolume: 0.7,
        launchDistance: 44
      });
    }
    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.cooldown = 1.0 + Math.random() * 0.6;
      enemy.telegraph.visible = false;
      if (enemy.mouthGlow) {
        enemy.mouthGlow.visible = false;
      }
    }
  }

  function updateExplorationViperEnemy(enemy, dt, playerDistance, playerDirection) {
    if (enemy.stunned > 0) {
      enemy.velocity.multiplyScalar(Math.pow(0.07, dt));
      enemy.telegraph.visible = false;
    } else if (enemy.state === "spit") {
      enemy.yaw = yawFromDirection(playerDirection);
      updateViperAttack(enemy, dt);
    } else {
      const shouldChase = playerDistance < enemy.awareness || (enemy.state === "chase" && playerDistance < enemy.awareness * 1.9);
      if (shouldChase) {
        enemy.state = "chase";
        enemy.yaw = yawFromDirection(playerDirection);
        if (playerDistance < 14 && playerDistance > 2.6 && enemy.cooldown <= 0) {
          beginViperAttack(enemy);
        } else {
          rangedKiterMove(enemy, dt, playerDistance, playerDirection, 0.46);
          enemy.telegraph.visible = false;
        }
      } else {
        enemy.state = "patrol";
        explorationPatrolStep(enemy, dt, 0.4);
        enemy.telegraph.visible = false;
      }
    }

    enemy.position.addScaledVector(enemy.velocity, dt);
    enemy.velocity.multiplyScalar(Math.pow(0.22, dt));
    constrainExplorationEnemy(enemy);
    enemy.group.position.set(enemy.position.x, explorationGroundWorldY(enemy.position.x, enemy.position.z), enemy.position.z);
    applyEnemyVisualYaw(enemy, dt);
    updateViperAnimation(enemy, dt);
    updateEnemyMovementAudio(enemy, dt);
  }

  function beginWispHexAttack(enemy) {
    enemy.state = "hex";
    enemy.attackTimer = 0;
    enemy.attackHitDone = false;
    enemy.attackDuration = 0.82;
    enemy.velocity.multiplyScalar(0.3);
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = 0.42;
    enemy.telegraph.scale.setScalar(0.95);
    playPositionalSfx("wispPulse", enemy.position, 0.8, 44);
  }

  function updateWispHexAttack(enemy, dt) {
    enemy.attackTimer += dt;
    const t = enemy.attackTimer / enemy.attackDuration;
    enemy.telegraph.visible = true;
    enemy.telegraph.scale.setScalar(0.95 + smoothstep(0, 0.7, t) * 0.6);
    enemy.telegraph.material.opacity = 0.42 * (1 - smoothstep(0.5, 1, t));
    enemy.floatRoot.scale.setScalar(1 + Math.sin(clamp(t, 0, 1) * Math.PI) * 0.2);
    if (!enemy.attackHitDone && t > 0.5) {
      enemy.attackHitDone = true;
      launchEnemyOrb(enemy, {
        variant: "hex",
        speed: 8.5,
        turnRate: 1.1,
        life: 3.4,
        damage: 16,
        guardDamage: 24,
        aimHeight: 0.95,
        sourceLocal: new THREE.Vector3(0, 1.0, 0),
        launchSfx: "wispPulse",
        launchVolume: 0.85,
        launchDistance: 46
      });
    }
    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.cooldown = 1.15 + Math.random() * 0.7;
      enemy.telegraph.visible = false;
      enemy.floatRoot.scale.setScalar(1);
    }
  }

  function settleFriendlyNpcPose(npc, dt) {
    const ease = 1 - Math.pow(0.0004, dt);
    npc.leftLeg.rotation.x = lerp(npc.leftLeg.rotation.x, 0, ease);
    npc.rightLeg.rotation.x = lerp(npc.rightLeg.rotation.x, 0, ease);
    npc.leftArm.rotation.z = lerp(npc.leftArm.rotation.z, 0, ease);
    npc.rightArm.rotation.z = lerp(npc.rightArm.rotation.z, 0, ease);
  }

  function updateExplorationNpcs(dt) {
    for (const npc of game.npcs) {
      const dx = player.position.x - npc.group.position.x;
      const dz = player.position.z - npc.group.position.z;
      const playerDistanceSq = dx * dx + dz * dz;
      npc.group.visible = playerDistanceSq < EXPLORATION_NPC_VISIBLE_DISTANCE_SQ;
      npc.healCooldown = Math.max(0, npc.healCooldown - dt);
      if (playerDistanceSq > EXPLORATION_NPC_UPDATE_DISTANCE_SQ) {
        settleFriendlyNpcPose(npc, dt);
        continue;
      }
      npc.retarget -= dt;
      const targetDx = npc.group.position.x - npc.target.x;
      const targetDz = npc.group.position.z - npc.target.z;
      if (npc.retarget <= 0 || targetDx * targetDx + targetDz * targetDz < 0.45 * 0.45) {
        const angle = Math.random() * TAU;
        const radius = Math.random() * npc.homeRadius;
        const targetX = npc.home.x + Math.cos(angle) * radius;
        const targetZ = npc.home.z + Math.sin(angle) * radius;
        npc.target.set(targetX, explorationGroundWorldY(targetX, targetZ), targetZ);
        npc.retarget = 2 + Math.random() * 3.5;
      }
      const toTarget = tmpVec.copy(npc.target).sub(npc.group.position);
      const distance = Math.hypot(toTarget.x, toTarget.z);
      if (distance > 0.08) {
        toTarget.multiplyScalar(1 / Math.max(0.001, distance));
        npc.group.position.addScaledVector(toTarget, dt * 1.05);
        npc.group.position.y = explorationGroundWorldY(npc.group.position.x, npc.group.position.z);
        applyActorVisualYaw(npc.group, yawFromDirection(toTarget), dt, { settle: 0.0003 });
        npc.walkTime += dt * 2.8;
      }
      if (distance > 0.08) {
        const swing = Math.sin(npc.walkTime * 5.8) * 0.18;
        npc.leftLeg.rotation.x = swing;
        npc.rightLeg.rotation.x = -swing;
      } else {
        settleFriendlyNpcPose(npc, dt);
      }
      if (playerDistanceSq < 3.0 * 3.0 && npc.healCooldown <= 0 && player.health < player.maxHealth) {
        player.health = Math.min(player.maxHealth, player.health + 10);
        npc.healCooldown = 16;
        npc.leftArm.rotation.z = -1.2;
        npc.rightArm.rotation.z = 1.2;
        spawnImpact(player.position, 0xffd889, 12);
        showBanner("Villager aid");
      } else {
        npc.leftArm.rotation.z = lerp(npc.leftArm.rotation.z, 0, 1 - Math.pow(0.0003, dt));
        npc.rightArm.rotation.z = lerp(npc.rightArm.rotation.z, 0, 1 - Math.pow(0.0003, dt));
      }
    }
  }

  function updateExplorationGoals() {
    if (localPlayerInSharedActivity()) {
      return;
    }
    for (const village of game.exploration.villages) {
      const distance = Math.hypot(player.position.x - village.x, player.position.z - village.z);
      if (distance >= village.radius) {
        continue;
      }
      const alreadyDiscovered = game.exploration.discovered.has(village.id);
      const respawnChanged = setExplorationRespawnTown(village);
      if (!alreadyDiscovered) {
        game.exploration.discovered.add(village.id);
        spawnImpact(new THREE.Vector3(village.x, explorationGroundWorldY(village.x, village.z), village.z), 0xffd889, 24);
        showBanner(villageDisplayName(village) + " found " + discoveredVillageCount() + "/" + game.exploration.villages.length + " - respawn set");
        awardExplorationXp(20);
        syncVillageQuestProgress({ silent: false, updateUi: true });
        saveProgress();
      } else if (respawnChanged) {
        showBanner("Respawn set: " + villageDisplayName(village), 2.3);
        saveProgress();
      }
    }

    if (!game.exploration.completed && allDiscoverableVillagesFound() && game.enemies.length === 0) {
      game.exploration.completed = true;
      game.potions.push(createHealthPotion(player.position.x + 1.8, player.position.z + 1.2, { kind: "full" }));
      trimPotionDrops();
      showBanner("Expedition secured");
      saveProgress();
    }
  }

  function updateExplorationEnemies(dt) {
    updateExplorationNpcs(dt);
    for (const enemy of game.enemies) {
      if (enemy.dead) {
        continue;
      }

      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      enemy.stunned = Math.max(0, enemy.stunned - dt);

      const target = nearestCombatTarget(enemy);
      enemy.targetId = target.id;
      const toPlayer = tmpVec.copy(target.position).sub(enemy.position);
      // Horizontal plane only: the local player's logical y stays 0 while
      // seeded exploration enemies keep their spawn terrain-height y, so a 3D
      // distance never drops below melee initiation range on high ground
      // (mountain Bonewardens could never attack) and the stale y component
      // also bleeds chase speed out of the x/z axes.
      toPlayer.y = 0;
      const playerDistance = Math.max(0.001, toPlayer.length());
      const playerDirection = toPlayer.multiplyScalar(1 / playerDistance);
      if (enemy.type === "dragon") {
        updateExplorationDragonEnemy(enemy, dt, playerDistance, playerDirection);
        continue;
      }
      if (enemy.type === "spider") {
        updateExplorationSpiderEnemy(enemy, dt, playerDistance, playerDirection);
        continue;
      }
      if (enemy.type === "wisp") {
        updateExplorationWispEnemy(enemy, dt, playerDistance, playerDirection);
        continue;
      }
      if (enemy.type === "banditArcher") {
        updateExplorationBanditEnemy(enemy, dt, playerDistance, playerDirection);
        continue;
      }
      if (enemy.type === "sandViper") {
        updateExplorationViperEnemy(enemy, dt, playerDistance, playerDirection);
        continue;
      }

      if (enemy.stunned > 0) {
        enemy.velocity.multiplyScalar(Math.pow(0.06, dt));
        enemy.telegraph.visible = false;
      } else if (enemy.state === "attack") {
        enemy.yaw = yawFromDirection(playerDirection);
        updateEnemyAttack(enemy, dt, playerDistance, playerDirection);
      } else {
        const shouldChase = playerDistance < enemy.awareness || (enemy.state === "chase" && playerDistance < enemy.awareness * 2.0);
        if (shouldChase) {
          enemy.state = "chase";
          enemy.yaw = yawFromDirection(playerDirection);
          // Engage at arm's length, scaled by body size, instead of walking
          // into the player first (bigger types like briarBeast swing sooner).
          if (playerDistance < 1.6 + enemy.radius && enemy.cooldown <= 0) {
            beginEnemyAttack(enemy, Math.random() < 0.24 ? "heavy" : "slash");
          } else {
            const desired = playerDirection.multiplyScalar(enemy.speed * 0.86);
            enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.015, dt));
            enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.015, dt));
            if (enemy.type !== "briarBeast") {
              enemy.walkTime += dt * enemy.speed;
            }
          }
        } else {
          enemy.state = "patrol";
          if (patrolTargetReached(enemy, 0.65)) {
            chooseExplorationPatrolTarget(enemy);
          }
          const toPatrol = tmpVec2.copy(enemy.patrolTarget).sub(enemy.position);
          const patrolDistance = Math.max(0.001, Math.hypot(toPatrol.x, toPatrol.z));
          toPatrol.multiplyScalar(1 / patrolDistance);
          enemy.yaw = yawFromDirection(toPatrol);
          const desired = toPatrol.multiplyScalar(enemy.speed * 0.42);
          enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.02, dt));
          enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.02, dt));
          if (enemy.type !== "briarBeast") {
            enemy.walkTime += dt * enemy.speed * 0.45;
          }
          enemy.telegraph.visible = false;
        }
      }

      if (playerDistance < EXPLORATION_ENEMY_SEPARATION_DISTANCE || enemy.state !== "patrol") {
        for (const other of game.enemies) {
          if (other === enemy || other.dead) {
            continue;
          }
          const dx = enemy.position.x - other.position.x;
          const dz = enemy.position.z - other.position.z;
          const d2 = dx * dx + dz * dz;
          const minDistance = enemy.radius + other.radius + 0.2;
          if (d2 > 0.0001 && d2 < minDistance * minDistance) {
            const d = Math.sqrt(d2);
            const push = (minDistance - d) * 0.45;
            enemy.velocity.x += (dx / d) * push * 2.4;
            enemy.velocity.z += (dz / d) * push * 2.4;
          }
        }
      }

      enemy.position.addScaledVector(enemy.velocity, dt);
      enemy.velocity.multiplyScalar(Math.pow(0.24, dt));
      constrainExplorationEnemy(enemy);
      enemy.group.position.set(enemy.position.x, explorationGroundWorldY(enemy.position.x, enemy.position.z), enemy.position.z);
      applyEnemyVisualYaw(enemy, dt);
      if (enemy.type === "briarBeast") {
        updateBriarBeastAnimation(enemy, dt);
      } else {
        const legSwing = Math.sin(enemy.walkTime * 6.5) * Math.min(0.38, enemy.velocity.length() * 0.08);
        enemy.leftLeg.rotation.x = legSwing;
        enemy.rightLeg.rotation.x = -legSwing;
        enemy.chest.rotation.x = enemy.stunned > 0 ? -0.22 : 0;
      }
      updateEnemyMovementAudio(enemy, dt);
    }

    game.enemies = game.enemies.filter(enemy => !enemy.dead);
    updateWildsDirector(dt);
  }

  function updateEnemies(dt) {
    const activity = activeCombatActivity();
    if (game.mode === "exploration" && !activity) {
      updateExplorationEnemies(dt);
      return;
    }
    const activityId = activity ? activity.activityId : "";
    const activityCenterX = activity ? activity.center?.x || 0 : 0;
    const activityCenterZ = activity ? activity.center?.z || 0 : 0;
    const activityRadius = Math.max(8, activity ? activity.radius || arenaRadius : arenaRadius);
    for (const enemy of game.enemies) {
      if (enemy.dead || (activityId && enemy.activityId !== activityId)) {
        continue;
      }

      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      enemy.stunned = Math.max(0, enemy.stunned - dt);

      const target = nearestCombatTarget(enemy);
      enemy.targetId = target.id;
      const toPlayer = tmpVec.copy(target.position).sub(enemy.position);
      const distance = Math.max(0.001, toPlayer.length());
      const direction = toPlayer.multiplyScalar(1 / distance);
      enemy.yaw = yawFromDirection(direction);

      if (enemy.entering) {
        updateEnemyEntrance(enemy, dt);
      } else if (enemy.type === "dragon") {
        updateDragonEnemy(enemy, dt, distance, direction);
      } else {
        if (enemy.stunned > 0) {
          enemy.velocity.multiplyScalar(Math.pow(0.06, dt));
          enemy.telegraph.visible = false;
        } else if (enemy.state === "chase") {
          if (distance < 1.6 + enemy.radius && enemy.cooldown <= 0) {
            beginEnemyAttack(enemy, Math.random() < 0.37 ? "heavy" : "slash");
          } else {
            const desired = direction.multiplyScalar(enemy.speed);
            enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.01, dt));
            enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.01, dt));
            if (enemy.type !== "briarBeast") {
              enemy.walkTime += dt * enemy.speed;
            }
          }
        } else {
          updateEnemyAttack(enemy, dt, distance, direction);
        }
      }

      for (const other of game.enemies) {
        if (other === enemy || other.dead || (activityId && other.activityId !== activityId) || (enemy.entering && enemy.entryDelay > 0)) {
          continue;
        }
        const dx = enemy.position.x - other.position.x;
        const dz = enemy.position.z - other.position.z;
        const d2 = dx * dx + dz * dz;
        const minDistance = enemy.radius + other.radius + 0.18;
        if (d2 > 0.0001 && d2 < minDistance * minDistance) {
          const d = Math.sqrt(d2);
          const push = (minDistance - d) * 0.5;
          enemy.velocity.x += (dx / d) * push * 3.2;
          enemy.velocity.z += (dz / d) * push * 3.2;
        }
      }

      enemy.position.addScaledVector(enemy.velocity, dt);
      enemy.velocity.multiplyScalar(Math.pow(0.24, dt));
      const dist = Math.hypot(enemy.position.x - activityCenterX, enemy.position.z - activityCenterZ);
      if (!enemy.entering && dist > activityRadius - 1.2) {
        const scale = (activityRadius - 1.2) / Math.max(0.001, dist);
        enemy.position.x = activityCenterX + (enemy.position.x - activityCenterX) * scale;
        enemy.position.z = activityCenterZ + (enemy.position.z - activityCenterZ) * scale;
      }
      if (enemy.type === "dragon") {
        const hover = enemy.hoverHeight + Math.sin(clock.elapsedTime * 3.4 + enemy.bobSeed) * 0.28;
        enemy.group.position.set(enemy.position.x, hover, enemy.position.z);
      } else {
        enemy.group.position.copy(enemy.position);
      }
      applyEnemyVisualYaw(enemy, dt);
      if (enemy.type === "dragon") {
        updateDragonAnimation(enemy, dt);
      } else if (enemy.type === "briarBeast") {
        updateBriarBeastAnimation(enemy, dt);
      } else {
        const legSwing = Math.sin(enemy.walkTime * 6.5) * Math.min(0.38, enemy.velocity.length() * 0.08);
        enemy.leftLeg.rotation.x = legSwing;
        enemy.rightLeg.rotation.x = -legSwing;
        enemy.chest.rotation.x = enemy.stunned > 0 ? -0.22 : 0;
      }
      updateEnemyMovementAudio(enemy, dt);
    }

    game.enemies = game.enemies.filter(enemy => !enemy.dead);
    const remainingActivityEnemies = activityId
      ? game.enemies.some(enemy => !enemy.dead && enemy.activityId === activityId)
      : game.enemies.length > 0;
    if (!remainingActivityEnemies && game.state === "playing") {
      if (dungeonActivityActive()) {
        completeDungeonActivity();
        return;
      }
      if (game.nextWaveIn <= 0) {
        dropWaveHealthPotion();
        game.nextWaveIn = arenaActivityActive() ? 4.5 : 4.0;
        if (arenaActivityActive()) {
          const activity = game.exploration.arenaActivity;
          activity.phase = "intermission";
          activity.nextWaveIn = game.nextWaveIn;
          activity.exitOpen = true;
          const xp = grantCrownringWaveReward(game.wave);
          const joinedAtBell = promotePendingArenaParticipants();
          playSfx(game.wave % 3 === 0 ? "arenaMilestone" : "waveClear", 1.1);
          showBanner("Crownring wave " + game.wave + " cleared +" + xp + " XP" + (joinedAtBell ? " - allies joined" : " - press Y to yield"), 3);
          sendWorldSnapshot(true);
        } else {
          showBanner("Wave " + game.wave + " cleared");
        }
      } else {
        game.nextWaveIn -= dt;
        if (arenaActivityActive()) {
          game.exploration.arenaActivity.nextWaveIn = game.nextWaveIn;
        }
        if (game.nextWaveIn <= 0) {
          spawnWave();
        }
      }
    }
  }

  function updateDragonEnemy(enemy, dt, distance, direction) {
    if (enemy.stunned > 0) {
      enemy.state = "chase";
      enemy.attackHitDone = false;
      enemy.velocity.multiplyScalar(Math.pow(0.08, dt));
      return;
    }

    if (enemy.state === "chase") {
      const desired = tmpVec2.set(0, 0, 0);
      if (distance > enemy.desiredRange + 1.2) {
        desired.copy(direction).multiplyScalar(enemy.speed);
      } else if (distance < enemy.desiredRange - 1.4) {
        desired.copy(direction).multiplyScalar(-enemy.speed * 0.74);
      } else {
        desired.set(-direction.z, 0, direction.x).multiplyScalar(enemy.speed * 0.34);
      }
      enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.012, dt));
      enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.012, dt));
      if (distance < 14 && distance > 3.8 && enemy.cooldown <= 0) {
        beginDragonAttack(enemy);
      }
    } else {
      updateDragonAttack(enemy, dt, distance, direction);
    }
  }

  function updateDragonAnimation(enemy, dt) {
    const moving = Math.min(1, enemy.velocity.length() / Math.max(0.001, enemy.speed));
    const attackT = enemy.state === "fire" ? clamp(enemy.attackTimer / enemy.attackDuration, 0, 1) : 0;
    enemy.wingTime += dt * (enemy.state === "fire" ? 13 : 8 + moving * 5);
    const flap = Math.sin(enemy.wingTime) * (0.42 + moving * 0.24);
    enemy.leftWing.rotation.set(0.16, 0.08, 0.52 + flap);
    enemy.rightWing.rotation.set(0.16, -0.08, -0.52 - flap);
    enemy.body.rotation.z = lerp(enemy.body.rotation.z, clamp(-enemy.velocity.x * 0.035, -0.26, 0.26), 1 - Math.pow(0.0004, dt));

    const mouthOpen = enemy.state === "fire" ? Math.sin(attackT * Math.PI) : 0;
    enemy.lowerJaw.rotation.x = lerp(enemy.lowerJaw.rotation.x, mouthOpen * 0.82, 1 - Math.pow(0.0001, dt));
    enemy.mouthGlow.visible = mouthOpen > 0.08;
    enemy.mouthGlow.scale.setScalar(0.8 + mouthOpen * 1.8);
    enemy.mouthGlow.material.opacity = 0.35 + mouthOpen * 0.65;
  }

  function beginDragonAttack(enemy) {
    enemy.state = "fire";
    enemy.attackTimer = 0;
    enemy.attackHitDone = false;
    enemy.volleyCount = 0;
    enemy.attackDuration = 1.18;
    enemy.velocity.multiplyScalar(0.22);
    playPositionalSfx("dragonRoar", enemy.group ? enemy.group.position : enemy.position, 1.0, 72);
  }

  // Center orb first (full homing), then two flanking orbs with a horizontal
  // spread and gentle tracking. The roar/mouth-glow telegraph still leads the
  // first launch, so the burst stays readable and dodgeable by moving lateral.
  const DRAGON_VOLLEY_TIMES = [0.5, 0.68, 0.86];
  const DRAGON_VOLLEY_SPREAD = [0, 0.2, -0.2];

  function updateDragonAttack(enemy, dt, distance, direction) {
    enemy.attackTimer += dt;
    const volleyCount = enemy.volleyCount ?? (enemy.attackHitDone ? DRAGON_VOLLEY_TIMES.length : 0);
    enemy.volleyCount = volleyCount;
    while (enemy.volleyCount < DRAGON_VOLLEY_TIMES.length
      && enemy.attackTimer > enemy.attackDuration * DRAGON_VOLLEY_TIMES[enemy.volleyCount]) {
      launchFireball(enemy, DRAGON_VOLLEY_SPREAD[enemy.volleyCount]);
      enemy.volleyCount += 1;
      enemy.attackHitDone = true;
    }
    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.cooldown = 1.1 + Math.random() * 0.75;
    }
    if (distance > enemy.desiredRange + 2.5) {
      enemy.velocity.addScaledVector(direction, dt * enemy.speed * 0.55);
    }
  }

  function launchFireball(enemy, spreadAngle = 0) {
    const source = enemy.group.localToWorld(new THREE.Vector3(0, 0.28, -2.02));
    const targetInfo = combatTargetById(enemy.targetId) || nearestCombatTarget(enemy);
    const target = tmpVec.copy(targetInfo.position);
    // Aim at the target's torso on the terrain they actually stand on, not an
    // absolute world height (dragons hover ~2.7u above ground and shoot down).
    target.y = combatTargetGroundY(targetInfo) + 0.86;
    const speed = 5.1 + Math.min(game.wave * 0.12, 1.1);
    const velocity = target.sub(source).normalize().multiplyScalar(speed);
    if (spreadAngle) {
      velocity.applyAxisAngle(up, spreadAngle);
    }

    const fireball = createFireballVisual({
      x: source.x,
      y: source.y,
      z: source.z,
      vx: velocity.x,
      vy: velocity.y,
      vz: velocity.z,
      speed,
      // Side orbs of a volley track gently so the spread stays sidesteppable.
      turnRate: spreadAngle ? 0.3 : 0.82,
      life: 4.2,
      damage: Math.round((34 + Math.min(game.wave * 2, 12)) * (enemy.damageMul || 1)),
      guardDamage: Math.round((48 + Math.min(game.wave * 2, 14)) * (enemy.damageMul || 1)),
      targetId: targetInfo.id
    });
    if (enemy.activityType) {
      fireball.activityType = enemy.activityType;
      fireball.activityId = enemy.activityId || (activeCombatActivity() ? activeCombatActivity().activityId : "");
    }
    fireball.remoteControlled = false;
    game.fireballs.push(fireball);
    playPositionalSfx("dragonFire", source, 1.0, 70);
  }

  // Shared launcher for ground/serpent/wisp distance attackers. Reuses the same
  // host-authoritative, replicated fireball pipeline as the drake's fire orb so
  // arrows, venom orbs, and hex orbs all sync in MQTT co-op.
  function launchEnemyOrb(enemy, config) {
    const sourceLocal = config.sourceLocal || new THREE.Vector3(0, 1.1, -0.6);
    const source = enemy.group.localToWorld(sourceLocal.clone());
    const targetInfo = combatTargetById(enemy.targetId) || nearestCombatTarget(enemy);
    const target = tmpVec.copy(targetInfo.position);
    target.y = combatTargetGroundY(targetInfo) + (config.aimHeight ?? 0.95);
    const speed = config.speed || 9;
    const velocity = target.sub(source).normalize().multiplyScalar(speed);
    const mul = enemy.damageMul || 1;
    const projectile = createFireballVisual({
      variant: config.variant || "fire",
      x: source.x,
      y: source.y,
      z: source.z,
      vx: velocity.x,
      vy: velocity.y,
      vz: velocity.z,
      speed,
      turnRate: config.turnRate ?? 0,
      life: config.life || 3.0,
      damage: Math.round((config.damage || 20) * mul),
      guardDamage: Math.round((config.guardDamage || 26) * mul),
      targetId: targetInfo.id
    });
    if (enemy.activityType) {
      projectile.activityType = enemy.activityType;
      projectile.activityId = enemy.activityId || (activeCombatActivity() ? activeCombatActivity().activityId : "");
    }
    projectile.remoteControlled = false;
    game.fireballs.push(projectile);
    if (config.launchSfx) {
      playPositionalSfx(config.launchSfx, source, config.launchVolume || 0.9, config.launchDistance || 48);
    }
    return projectile;
  }

  function beginEnemyAttack(enemy, type) {
    enemy.state = "attack";
    enemy.attackType = type;
    enemy.attackTimer = 0;
    enemy.attackHitDone = false;
    enemy.velocity.set(0, 0, 0);
    enemy.attackDuration = type === "heavy" ? 1.38 : 0.82;
    enemy.telegraph.visible = true;
    enemy.telegraph.material = type === "heavy" ? materials.heavyDanger.clone() : materials.danger.clone();
    enemy.telegraph.scale.setScalar(type === "heavy" ? 1.45 : 1.05);
    playPositionalSfx(type === "heavy" ? "barbarianHeavy" : "barbarianAttack", enemy.position, 0.9, 36);
  }

  function updateEnemyAttack(enemy, dt, distance, direction) {
    enemy.attackTimer += dt;
    const t = enemy.attackTimer / enemy.attackDuration;
    const heavy = enemy.attackType === "heavy";
    // Hit reach tracks the radius-scaled initiation range (1.6 + radius) with
    // a small cushion so a swing that starts in range still lands.
    const reach = 1.6 + (enemy.radius || 0.65);
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = heavy ? 0.46 * (1 - smoothstep(0.58, 1, t)) : 0.34 * (1 - smoothstep(0.55, 1, t));

    if (heavy) {
      const wind = clamp(t / 0.58, 0, 1);
      const strike = smoothstep(0.58, 0.76, t);
      enemy.weaponPivot.rotation.set(-1.25 + strike * 2.25, -0.18, -0.62 + wind * 0.74);
      if (!enemy.attackHitDone && t > 0.58) {
        enemy.attackHitDone = true;
        const mul = enemy.damageMul || 1;
        tryHitPlayer(enemy, Math.round(38 * mul), Math.round(52 * mul), reach + 0.55, 0.22);
      }
    } else {
      const wind = clamp(t / 0.36, 0, 1);
      const strike = Math.sin(clamp((t - 0.24) / 0.32, 0, 1) * Math.PI);
      enemy.weaponPivot.rotation.set(-0.18 + strike * 0.7, -0.45 + strike * 1.65, -0.72 + wind * 0.38);
      if (!enemy.attackHitDone && t > 0.34) {
        enemy.attackHitDone = true;
        const mul = enemy.damageMul || 1;
        tryHitPlayer(enemy, Math.round(20 * mul), Math.round(26 * mul), reach + 0.25, 0.0);
      }
    }

    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.attackType = null;
      enemy.cooldown = heavy ? 0.75 + Math.random() * 0.42 : 0.42 + Math.random() * 0.35;
      enemy.telegraph.visible = false;
      if (enemy.type === "briarBeast") {
        enemy.weaponPivot.rotation.set(0, 0, 0);
      } else {
        enemy.weaponPivot.rotation.set(-0.12, -0.3, -0.7);
      }
    }

    if (distance > 3.0) {
      enemy.velocity.addScaledVector(direction, dt * 1.1);
    }
  }

  function tryHitPlayer(enemy, damage, guardDamage, range, extraPush) {
    const target = combatTargetById(enemy.targetId) || nearestCombatTarget(enemy);
    const toPlayer = tmpVec.copy(target.position).sub(enemy.position);
    // Horizontal range, matching the initiation check: exploration enemies
    // carry a terrain-height y while the local player's logical y stays 0.
    toPlayer.y = 0;
    const distance = toPlayer.length();
    if (distance > range) {
      return;
    }
    toPlayer.normalize();
    const enemyForward = forwardFromYaw(enemy.yaw, tmpVec2);
    if (enemyForward.dot(toPlayer) < 0.2) {
      return;
    }
    applyCombatTargetDamage(target, damage, guardDamage, enemyForward, extraPush);
  }

  function applyPlayerDamage(damage, guardDamage, direction, extraPush) {
    const playerForward = forwardFromYaw(player.yaw, new THREE.Vector3());
    const attackerInFront = playerForward.dot(direction.clone().multiplyScalar(-1)) > -0.08;
    let finalDamage = damage;
    if (player.blocking && attackerInFront && player.guard > 0) {
      player.guard = Math.max(0, player.guard - guardDamage);
      finalDamage = Math.ceil(damage * (player.guard <= 0 ? 0.55 : 0.18));
      spawnImpact(player.position, 0x99ddff, 8);
      playSfx("block", 1);
    } else {
      spawnImpact(player.position, 0xff6350, 12);
      playSfx("hit", 1);
    }

    if (player.resolveTimer > 0) {
      finalDamage = Math.ceil(finalDamage * combatTuningFor("knight").resolveDamageTaken);
    }
    player.combatRegenDelay = PLAYER_REGEN_DELAY;
    player.health = Math.max(0, player.health - finalDamage);
    player.hurtTimer = 0.42;
    player.velocity.addScaledVector(direction, 4.4 + extraPush * 7);
    if (player.health <= 0) {
      handlePlayerDefeat();
    }
  }

  function handlePlayerDefeat() {
    // Apply XP progress loss before the recovery flows below restore vitals.
    const penalty = applyDeathLevelPenalty();
    if (localPlayerInArenaActivity()) {
      endCrownringArenaActivity("defeat");
      if (penalty) {
        showBanner("Recovered at Crownford infirmary - level " + penalty.level + " progress lost", 3.2);
      }
      return;
    }
    if (localPlayerInDungeonActivity()) {
      const def = activeDungeonDefinition();
      endDungeonActivity("defeat");
      if (penalty) {
        showBanner(def.defeatCopy + " - level " + penalty.level + " progress lost", 3.2);
      }
      return;
    }
    if (game.mode === "exploration" || online.connected) {
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
      if (game.mode === "exploration") {
        player.position.copy(currentExplorationRespawnPosition());
        constrainExplorationPlayer();
        parkHorseNear(player.position);
      } else {
        const angle = Math.random() * TAU;
        const radius = 7 + Math.random() * 9;
        player.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      }
      player.velocity.set(0, 0, 0);
      player.hurtTimer = 0;
      player.group.position.copy(player.position);
      spawnImpact(player.position, 0xf7df9a, 22);
      showBanner(penalty
        ? "Respawned - level " + penalty.level + " progress lost"
        : "Respawned", penalty ? 3 : 1.8);
      if (game.mode === "exploration") {
        saveProgress();
      }
      sendOnlineMessage({ kind: "state", state: serializePlayerState() });
      return;
    }
    endGame();
  }

  // Swept hit test for enemy projectiles vs a player: the projectile's travel
  // segment this frame is tested against a vertical capsule anchored at the
  // target's actual ground height (mirrors projectileSegmentHitsEnemy for
  // player arrows). Fixes elevated-terrain misses and inter-frame tunneling.
  function fireballSegmentHitsTarget(fireball, targetPosition, groundY, fromX, fromY, fromZ) {
    const to = fireball.group.position;
    const hitRadius = 0.78;
    const minY = groundY - 0.25;
    const maxY = groundY + 2.35;
    const dx = to.x - fromX;
    const dz = to.z - fromZ;
    const fx = fromX - targetPosition.x;
    const fz = fromZ - targetPosition.z;
    const a = dx * dx + dz * dz;
    const b = 2 * (fx * dx + fz * dz);
    const c = fx * fx + fz * fz - hitRadius * hitRadius;
    let tMin = 0;
    let tMax = 1;
    if (a < 0.000001) {
      if (c > 0) {
        return false;
      }
    } else {
      const disc = b * b - 4 * a * c;
      if (disc < 0) {
        return false;
      }
      const sqrtDisc = Math.sqrt(disc);
      tMin = Math.max(0, (-b - sqrtDisc) / (2 * a));
      tMax = Math.min(1, (-b + sqrtDisc) / (2 * a));
      if (tMin > tMax) {
        return false;
      }
    }
    const dy = to.y - fromY;
    if (Math.abs(dy) < 0.000001) {
      return fromY >= minY && fromY <= maxY;
    }
    let tEnter = (minY - fromY) / dy;
    let tExit = (maxY - fromY) / dy;
    if (tEnter > tExit) {
      const swap = tEnter;
      tEnter = tExit;
      tExit = swap;
    }
    return Math.max(tMin, tEnter) <= Math.min(tMax, tExit);
  }

  function updateFireballs(dt) {
    const activity = activeCombatActivity();
    for (let i = game.fireballs.length - 1; i >= 0; i -= 1) {
      const fireball = game.fireballs[i];
      if (activity && fireball.activityId !== activity.activityId) {
        continue;
      }
      fireball.life -= dt;
      const targetInfo = combatTargetById(fireball.targetId) || combatTargetById(online.localId);
      if (!targetInfo) {
        continue;
      }
      const targetGroundY = combatTargetGroundY(targetInfo);
      const homingTarget = tmpVec.copy(targetInfo.position);
      homingTarget.y = targetGroundY + 0.92;
      const desiredDirection = homingTarget.sub(fireball.group.position);
      if (desiredDirection.lengthSq() > 0.0001) {
        desiredDirection.normalize();
        const currentDirection = tmpVec2.copy(fireball.velocity).normalize();
        currentDirection.lerp(desiredDirection, clamp(fireball.turnRate * dt, 0, 0.055)).normalize();
        fireball.velocity.copy(currentDirection).multiplyScalar(fireball.speed);
      }
      const fromX = fireball.group.position.x;
      const fromY = fireball.group.position.y;
      const fromZ = fireball.group.position.z;
      fireball.group.position.addScaledVector(fireball.velocity, dt);
      if (fireball.shell) {
        fireball.shell.rotation.y += dt * 7.5;
        fireball.shell.rotation.x += dt * 5.8;
        const pulse = 1 + Math.sin(clock.elapsedTime * 18 + i) * 0.14;
        fireball.shell.scale.setScalar(pulse);
        fireball.core.scale.setScalar(1.08 + Math.sin(clock.elapsedTime * 24 + i) * 0.2);
      } else {
        fireball.group.rotation.y = Math.atan2(-fireball.velocity.x, -fireball.velocity.z);
        fireball.group.rotation.x = Math.atan2(fireball.velocity.y, Math.hypot(fireball.velocity.x, fireball.velocity.z));
      }
      const impactColor = fireball.impactColor || 0xff7b2e;
      const impactSfx = fireball.impactSfx || "fireballImpact";

      if (fireballSegmentHitsTarget(fireball, targetInfo.position, targetGroundY, fromX, fromY, fromZ)) {
        const hitDirection = tmpVec2.copy(fireball.velocity);
        hitDirection.y = 0;
        if (hitDirection.lengthSq() > 0.0001) {
          hitDirection.normalize();
        } else {
          hitDirection.copy(forwardFromYaw(player.yaw, hitDirection)).multiplyScalar(-1);
        }
        applyCombatTargetDamage(targetInfo, fireball.damage, fireball.guardDamage, hitDirection, 0.16);
        spawnImpact(fireball.group.position, impactColor, 18);
        playPositionalSfx(impactSfx, fireball.group.position, 1.0, 70);
        broadcastOnlineEffect({ type: "impact", x: fireball.group.position.x, y: fireball.group.position.y, z: fireball.group.position.z, color: impactColor, count: 18, sfx: impactSfx, sfxIntensity: 1.0, sfxDistance: 70 });
        scene.remove(fireball.group);
        game.fireballs.splice(i, 1);
        continue;
      }

      // Ground expiry against the terrain under the projectile, not absolute
      // y = 0 (which let shots fly invisibly beneath elevated landforms).
      if (fireball.life <= 0 || fireball.group.position.y < explorationGroundWorldY(fireball.group.position.x, fireball.group.position.z) + 0.16) {
        spawnImpact(fireball.group.position, impactColor, 10);
        playPositionalSfx(impactSfx, fireball.group.position, 0.7, 58);
        broadcastOnlineEffect({ type: "impact", x: fireball.group.position.x, y: fireball.group.position.y, z: fireball.group.position.z, color: impactColor, count: 10, sfx: impactSfx, sfxIntensity: 0.7, sfxDistance: 58 });
        scene.remove(fireball.group);
        game.fireballs.splice(i, 1);
      }
    }
  }

  function updatePotions(dt) {
    const activity = activeCombatActivity();
    for (let i = game.potions.length - 1; i >= 0; i -= 1) {
      const potion = game.potions[i];
      if (activity && potion.activityId !== activity.activityId) {
        continue;
      }
      const bob = Math.sin(clock.elapsedTime * 4.2 + potion.bobSeed) * 0.08;
      potion.position.y = explorationGroundWorldY(potion.position.x, potion.position.z);
      potion.group.position.y = potion.position.y + 0.1 + bob;
      potion.group.rotation.y += dt * 1.4;
      potion.marker.material.opacity = 0.36 + Math.sin(clock.elapsedTime * 5.3 + potion.bobSeed) * 0.12;
      potion.glow.intensity = 0.85 + Math.sin(clock.elapsedTime * 6.1 + potion.bobSeed) * 0.18;

      const distance = Math.hypot(player.position.x - potion.position.x, player.position.z - potion.position.z);
      if (distance < potion.pickupRadius) {
        const wantsStore = player.health >= player.maxHealth && !!storedPotionFromDrop(potion);
        if (wantsStore && !canStorePotionDrop(potion)) {
          if (!potion.storageNoticeCooldown || potion.storageNoticeCooldown <= 0) {
            potion.storageNoticeCooldown = 1.8;
            const unlockedSlots = unlockedPotionSlotCount();
            showBanner(unlockedSlots > 0 ? "Potion pouch full" : "Potion slot unlocks at level " + potionSlotUnlockLevel(0), 1.4);
          } else {
            potion.storageNoticeCooldown -= dt;
          }
          continue;
        }
        if (player.health >= player.maxHealth && !wantsStore) {
          continue;
        }
        if (isJoinedClient()) {
          if (!potion.pickupRequested) {
            potion.pickupRequested = true;
            sendOnlineMessage({
              kind: "potionPickup",
              potionId: potion.netId,
              store: wantsStore,
              inventoryCount: storedPotions().length,
              state: serializePlayerState()
            });
          }
          continue;
        }
        if (wantsStore) {
          const item = storedPotionFromDrop(potion);
          if (!storePotionItem(item)) {
            continue;
          }
          spawnImpact(potion.position, potionPickupColor(potion), 12);
          scene.remove(potion.group);
          game.potions.splice(i, 1);
          continue;
        }
        const beforeHeal = player.health;
        player.health = potion.fullHeal ? player.maxHealth : Math.min(player.maxHealth, player.health + potion.healAmount);
        const healed = Math.ceil(player.health - beforeHeal);
        spawnImpact(player.position, potionPickupColor(potion), 18);
        playSfx("potion", potion.fullHeal ? 1.25 : 0.95);
        broadcastOnlineEffect({ type: "impact", x: player.position.x, y: 0, z: player.position.z, color: potionPickupColor(potion), count: 18 });
        showBanner(potion.fullHeal ? "Fully recovered" : "Recovered +" + healed);
        scene.remove(potion.group);
        game.potions.splice(i, 1);
      } else if (isJoinedClient()) {
        potion.pickupRequested = false;
      }
    }
  }

  function endGame() {
    game.state = "over";
    overlayCopy.textContent = "The ring is quiet. Your stand ended on wave " + game.wave + ".";
    startButton.hidden = true;
    restartButton.hidden = false;
    overlay.classList.remove("hidden");
    document.exitPointerLock?.();
    updateQuestMap();
  }

  function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i -= 1) {
      const particle = game.particles[i];
      particle.life -= dt;
      particle.velocity.y -= dt * 5;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.material.opacity = clamp(particle.life / particle.maxLife, 0, 1);
      if (particle.life <= 0) {
        scene.remove(particle.mesh);
        game.particles.splice(i, 1);
      }
    }
  }

  function updateCamera(dt) {
    if (!game.pointerActive) {
      if (keys.has("KeyQ")) game.cameraYaw += dt * 1.8;
      if (keys.has("KeyE")) game.cameraYaw -= dt * 1.8;
    }
    const mounted = isPlayerMounted();
    const shoulder = new THREE.Vector3(0.95, mounted ? 4.9 : 4.1, mounted ? 9.2 : 7.7);
    shoulder.applyAxisAngle(up, game.cameraYaw);
    const cameraAnchor = tmpVec.copy(player.position);
    if (game.mode === "exploration") {
      cameraAnchor.y = explorationGroundWorldY(player.position.x, player.position.z);
    }
    const desired = cameraAnchor.add(shoulder);
    camera.position.lerp(desired, 1 - Math.pow(0.00004, dt));
    const look = tmpVec2.copy(player.position);
    if (game.mode === "exploration") {
      look.y = explorationGroundWorldY(player.position.x, player.position.z);
    }
    look.y += mounted ? 1.85 : 1.35;
    camera.lookAt(look);
  }

  function updateLights(dt, elapsed) {
    for (const torch of game.torches) {
      const flicker = 0.85 + Math.sin(elapsed * 7.5 + torch.seed) * 0.11 + Math.sin(elapsed * 15.7 + torch.seed * 1.8) * 0.05;
      torch.light.intensity = 1.8 * flicker;
      torch.flame.scale.set(1 + (flicker - 1) * 0.6, 0.82 + flicker * 0.18, 1 + (flicker - 1) * 0.6);
    }
  }

  function updateHud() {
    const hpPct = clamp(player.health / player.maxHealth, 0, 1);
    const key = characterKey(player.character);
    const wizard = key === "wizard";
    const ranger = key === "ranger";
    const usesMana = wizard || ranger;
    const resourceValue = usesMana ? player.mana : player.guard;
    const resourceMax = usesMana ? player.maxMana : player.maxGuard;
    const guardPct = clamp(resourceValue / resourceMax, 0, 1);
    healthFill.style.transform = "scaleX(" + hpPct.toFixed(3) + ")";
    guardFill.style.transform = "scaleX(" + guardPct.toFixed(3) + ")";
    healthText.textContent = Math.ceil(player.health);
    guardText.textContent = Math.ceil(resourceValue);
    waveLabel.textContent = localPlayerInArenaActivity()
      ? "Crownring " + Math.max(1, game.wave)
      : localPlayerInDungeonActivity()
      ? activeDungeonDefinition().shortName
      : game.mode === "exploration" ? "Explore" : "Wave " + Math.max(1, game.wave);
    const level = getCharacterLevel();
    levelText.textContent = level;
    xpReadout.hidden = game.mode !== "exploration";
    kitReadout.hidden = game.mode !== "exploration";
    if (saveHint) {
      saveHint.hidden = game.mode !== "exploration";
    }
    updatePotionInventoryUi();
    if (game.mode === "exploration") {
      const xp = getCharacterProgress().xp;
      const levelBaseXp = xpForLevel(level);
      const nextLevelXp = xpForLevel(level + 1);
      const xpIntoLevel = Math.max(0, xp - levelBaseXp);
      const xpSpan = Math.max(1, nextLevelXp - levelBaseXp);
      const xpPct = Number.isFinite(xpSpan) ? clamp(xpIntoLevel / xpSpan, 0, 1) : 1;
      xpFill.style.transform = "scaleX(" + xpPct.toFixed(3) + ")";
      xpReadout.title = xpIntoLevel + " / " + xpSpan + " XP to level " + (level + 1);
      kitText.textContent = currentKitText();
      const kitDefinition = equipmentDefs[equippedWeapon()];
      if (kitStats) {
        kitStats.hidden = !kitDefinition || !kitDefinition.summary;
        kitStats.textContent = kitDefinition && kitDefinition.summary ? kitDefinition.summary : "";
      }
      kitReadout.title = currentKitTooltip();
    } else {
      xpFill.style.transform = "scaleX(0)";
      kitText.textContent = "";
      if (kitStats) {
        kitStats.hidden = true;
        kitStats.textContent = "";
      }
      kitReadout.title = "";
    }
    const tuning = combatTuningFor();
    updateAbilityLocks();
    attackIcon.classList.toggle("active", player.attacking && (player.attackKind === "slash" || player.attackKind === "lightning" || player.attackKind === "arrow"));
    blockIcon.classList.toggle("active", wizard ? player.attacking && player.attackKind === "burst" : ranger ? player.rollTimer > 0 : player.blocking);
    blockIcon.classList.toggle("ready", (wizard && hasAbility("burst") && !player.attacking && player.secondaryCooldown <= 0 && player.mana >= tuning.burstManaCost)
      || (ranger && hasAbility("roll") && player.secondaryCooldown <= 0 && player.mana >= tuning.rollFocusCost));
    potionIcon.classList.toggle("active", player.attacking && (wizard ? false : ranger ? player.attackKind === "pierce" : player.attackKind === "bash"));
    potionIcon.classList.toggle("ready", wizard
      ? hasAbility("potion") && player.potionCooldown <= 0
      : ranger
      ? hasAbility("pierce") && !player.attacking && player.attackCooldown <= 0 && player.mana >= tuning.pierceFocusCost
      : hasAbility("bash") && !player.attacking && player.attackCooldown <= 0 && player.guard >= tuning.bashGuardCost);
  }

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.034);
    const elapsed = clock.elapsedTime;

    if (game.state === "playing") {
      const joinedWorld = isJoinedClient();
      updatePlayer(dt);
      if (joinedWorld) {
        if (game.mode === "exploration") {
          updateExplorationNpcs(dt);
        }
        updateRemoteWorldActors(dt);
      } else {
        updateEnemies(dt);
      }
      updatePlayerProjectiles(dt);
      if (!joinedWorld) {
        updateFireballs(dt);
      }
      updatePotions(dt);
      if (game.mode === "exploration") {
        if (!localPlayerInSharedActivity()) {
          updateExplorationGoals();
          updateQuestItems(dt);
          updateHorse(dt);
          updateTalkPrompt();
        } else {
          talkPrompt.hidden = true;
        }
        game.questMapTimer -= dt;
        if (game.questMapTimer <= 0) {
          game.questMapTimer = QUEST_MAP_UPDATE_INTERVAL;
          updateQuestMap();
        }
        game.saveTimer += dt;
        if (game.saveTimer >= 4) {
          game.saveTimer = 0;
          saveProgress();
        }
      }
      updateParticles(dt);
      updateOnline(dt);
      updateAudio(dt);
      updateCamera(dt);
      updateEnemyHealthBillboards();
      updateHud();
      if (game.bannerTime > 0) {
        game.bannerTime -= dt;
        if (game.bannerTime <= 0) {
          banner.classList.remove("visible");
        }
      }
    } else {
      talkPrompt.hidden = true;
      updateParticles(dt);
      updateAudio(dt);
      updateCamera(dt);
    }
    updateLights(dt, elapsed);
    renderer.render(scene, camera);
  }

  function beginPlay() {
    syncPlayerName();
    if (online.role === "join" && !online.connected) {
      updateOnlineStatus("Join a room first");
      return;
    }
    game.pausedFromPlay = false;
    requestGamePointerLock();
    resetGame();
  }

  function requestGamePointerLock() {
    if (!document.body.requestPointerLock) {
      return;
    }
    try {
      const lockRequest = document.body.requestPointerLock();
      if (lockRequest && typeof lockRequest.catch === "function") {
        lockRequest.catch(() => {});
      }
    } catch (error) {
      // Browsers can reject pointer lock in automation or constrained contexts.
    }
  }

  function setupInput() {
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    window.addEventListener("keydown", event => {
      if (chat.open) {
        // Chat input is focused: let it own the keyboard so typing never
        // moves, attacks, or triggers abilities. The input's own listener
        // handles Enter/Escape.
        return;
      }
      if (event.repeat && event.code !== "Space" && questDialog.hidden) return;
      if (!questDialog.hidden) {
        handleQuestDialogKey(event);
        return;
      }
      if ((event.code === "Enter" || event.code === "NumpadEnter")
        && game.state === "playing" && online.connected && questDialog.hidden) {
        event.preventDefault();
        openChatInput();
        return;
      }
      if (event.code === "Escape") {
        event.preventDefault();
        if (game.state === "playing") {
          openSessionMenu();
        } else if (game.state === "paused") {
          if (!helpPanel.hidden) {
            closeHelpPanel();
          } else {
            resumeSession();
          }
        }
        return;
      }
      if (game.state !== "playing") {
        return;
      }
      if (event.code === "KeyV") {
        event.preventDefault();
        setAudioMuted(!audio.muted);
        return;
      }
      if (event.code === "KeyY" && localPlayerInArenaActivity()) {
        event.preventDefault();
        endCrownringArenaActivity("yield");
        return;
      }
      if (event.code === "KeyY" && localPlayerInDungeonActivity()) {
        event.preventDefault();
        endDungeonActivity("yield");
        return;
      }
      if (event.code === "KeyG" && game.mode === "exploration" && game.state === "playing" && questDialog.hidden) {
        event.preventDefault();
        cycleEquippedWeapon();
        return;
      }
      if (event.code === "KeyM" && game.mode === "exploration" && game.state === "playing" && questDialog.hidden) {
        event.preventDefault();
        cycleActiveMount();
        return;
      }
      if (event.code === "KeyR" && game.mode === "exploration" && game.state === "playing" && questDialog.hidden) {
        if (toggleHorseMount()) {
          event.preventDefault();
          return;
        }
      }
      if (event.code === "KeyE" && game.mode === "exploration" && game.state === "playing" && questDialog.hidden && !isPlayerMounted()) {
        const npc = nearestNpc();
        if (npc) {
          event.preventDefault();
          openNpcDialog(npc);
          return;
        }
      }
      keys.add(event.code);
      if (event.code === "Space") {
        event.preventDefault();
        startAttack();
      }
      if (event.code === "KeyJ") {
        event.preventDefault();
        if (player.character === "knight") {
          startKnightBash();
        } else if (player.character === "ranger") {
          startRangerPierce();
        } else {
          startAttack();
        }
      }
      if (event.code === "KeyF") {
        event.preventDefault();
        startUtilityAbility();
      }
      if (event.code === "KeyC") {
        event.preventDefault();
        startPayoffAbility();
      }
      if (event.code === "KeyK") {
        event.preventDefault();
        startSecondaryAbility();
      }
      if (event.code === "KeyH") {
        event.preventDefault();
        handlePotionHotkey();
      }
      if (event.code === "KeyL") {
        event.preventDefault();
        dropWizardHealthPotion();
      }
    });

    window.addEventListener("keyup", event => {
      keys.delete(event.code);
      if (event.code === "KeyK") {
        player.blockHeld = false;
      }
    });

    window.addEventListener("mousedown", event => {
      if (game.state !== "playing" || !questDialog.hidden || chat.open) return;
      if (event.button === 0) {
        startAttack();
      }
      if (event.button === 2) {
        startSecondaryAbility();
      }
      if (event.button === 1) {
        event.preventDefault();
        if (player.character === "knight") {
          startKnightBash();
        } else if (player.character === "ranger") {
          startRangerPierce();
        } else {
          dropWizardHealthPotion();
        }
      }
    });

    window.addEventListener("mouseup", event => {
      if (event.button === 2) {
        player.blockHeld = false;
      }
    });

    window.addEventListener("contextmenu", event => event.preventDefault());

    if (chatForm && chatInput) {
      chatForm.addEventListener("submit", event => {
        event.preventDefault();
        submitChatInput();
      });
      chatInput.addEventListener("keydown", event => {
        // Keep typing local to the input; gameplay/global handlers stay quiet.
        event.stopPropagation();
        if (event.code === "Escape") {
          event.preventDefault();
          closeChatInput();
        } else if (event.code === "Enter" || event.code === "NumpadEnter") {
          event.preventDefault();
          submitChatInput();
        }
      });
      chatInput.addEventListener("blur", () => {
        if (chat.open) {
          closeChatInput(true);
        }
      });
      window.setInterval(refreshChatPanel, 450);
    }

    window.addEventListener("mousemove", event => {
      if (chat.open) return;
      if (document.pointerLockElement === document.body) {
        game.cameraYaw -= event.movementX * 0.0026;
        game.cameraPitch = clamp(game.cameraPitch - event.movementY * 0.0014, -0.45, -0.05);
      }
    });

    document.addEventListener("pointerlockchange", () => {
      const wasPointerActive = game.pointerActive;
      game.pointerActive = document.pointerLockElement === document.body;
      if (!game.pointerActive && game.state === "playing" && (wasPointerActive || game.startedOnce)) {
        pauseForControlLoss();
      }
    });

    window.addEventListener("blur", pauseForControlLoss);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        pauseForControlLoss();
      }
    });

    renderer.domElement.addEventListener("click", () => {
      if (game.state === "playing" && document.pointerLockElement !== document.body) {
        requestGamePointerLock();
      }
    });

    for (const button of document.querySelectorAll("[data-touch-key]")) {
      const code = button.dataset.touchKey;
      const down = event => {
        event.preventDefault();
        keys.add(code);
      };
      const upTouch = event => {
        event.preventDefault();
        keys.delete(code);
      };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", upTouch);
      button.addEventListener("pointercancel", upTouch);
      button.addEventListener("pointerleave", upTouch);
    }

    for (const button of document.querySelectorAll("[data-touch-action]")) {
      const action = button.dataset.touchAction;
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        if (action === "attack") startAttack();
        if (action === "block") startSecondaryAbility();
        if (action === "potion") {
          if (player.character === "knight") {
            startKnightBash();
          } else if (player.character === "ranger") {
            startRangerPierce();
          } else {
            dropWizardHealthPotion();
          }
        }
      });
      button.addEventListener("pointerup", event => {
        event.preventDefault();
        if (action === "block" && player.character === "knight") player.blockHeld = false;
      });
      button.addEventListener("pointercancel", () => {
        if (action === "block" && player.character === "knight") player.blockHeld = false;
      });
    }

    for (const card of characterCards) {
      card.addEventListener("click", () => {
        setPlayerCharacter(card.dataset.character, true);
        updateHud();
      });
    }

    startSessionButton.addEventListener("click", startHostSessionFlow);
    resumeGameButton.addEventListener("click", resumeSavedGameFlow);
    joinSessionButton.addEventListener("click", startJoinSessionFlow);
    backMenuButton.addEventListener("click", backToSessionLanding);
    resumeButton.addEventListener("click", resumeSession);
    helpButton.addEventListener("click", openHelpPanel);
    helpBackButton.addEventListener("click", closeHelpPanel);
    closeRoomButton.addEventListener("click", closeRoomAndReturn);
    leaveRoomButton.addEventListener("click", () => leaveRoomToMenu());

    joinButton.addEventListener("click", () => {
      joinOnlineGame().catch(error => updateOnlineStatus(error.message || "Join failed"));
    });

    playerNameInput.addEventListener("input", () => {
      playerNameInput.value = playerNameInput.value.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 14);
      player.name = sanitizePlayerName(playerNameInput.value);
      updateRoomRoster();
    });

    playerNameInput.addEventListener("change", syncPlayerName);
    playerNameInput.addEventListener("blur", syncPlayerName);
    questAcceptButton.addEventListener("click", acceptCurrentQuest);
    questClaimButton.addEventListener("click", claimCurrentQuest);
    questServiceButton.addEventListener("click", activateCurrentNpcService);
    questCloseButton.addEventListener("click", () => {
      playSfx("uiBack", 1);
      closeQuestDialog();
    });

    roomCodeInput.addEventListener("input", () => {
      roomCodeInput.value = normalizeRoomCode(roomCodeInput.value);
    });

    roomCodeInput.addEventListener("keydown", event => {
      if (event.code === "Enter") {
        event.preventDefault();
        joinOnlineGame().catch(error => updateOnlineStatus(error.message || "Join failed"));
      }
    });

    startButton.addEventListener("click", beginPlay);
    restartButton.addEventListener("click", beginPlay);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  }

  setupLighting();
  setupArena();
  setupDungeonInterior();
  setPlayerCharacter("knight", true);
  setGameMode("exploration");
  setMenuPhase("landing");
  setupInput();
  window.addEventListener("resize", onResize);
  window.addEventListener("beforeunload", saveProgress);
  updateHud();
  tick();
  } catch (error) {
    console.error("Ironhold init failed", error);
    const copy = document.getElementById("overlayCopy");
    const button = document.getElementById("startButton");
    if (copy) copy.textContent = "The 3D arena could not initialize.";
    if (button) button.hidden = true;
  }
})();
