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
  const koText = document.getElementById("koText");
  const levelText = document.getElementById("levelText");
  const xpReadout = document.getElementById("xpReadout");
  const xpText = document.getElementById("xpText");
  const kitReadout = document.getElementById("kitReadout");
  const kitText = document.getElementById("kitText");
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
  const questLog = document.getElementById("questLog");
  const questLogItems = document.getElementById("questLogItems");
  const questMap = document.getElementById("questMap");
  const questMapCtx = questMap.getContext("2d");
  const secondaryTouchButton = document.querySelector("[data-touch-action='block']");
  const potionTouchButton = document.querySelector("[data-touch-action='potion']");

  if (!THREE) {
    overlayCopy.textContent = "The 3D renderer could not be loaded.";
    startButton.hidden = true;
    return;
  }

  const TAU = Math.PI * 2;
  const arenaRadius = 25;
  const EXPLORATION_NPC_UPDATE_DISTANCE_SQ = 70 * 70;
  const EXPLORATION_NPC_VISIBLE_DISTANCE_SQ = 145 * 145;
  const EXPLORATION_ITEM_VISIBLE_DISTANCE_SQ = 92 * 92;
  const EXPLORATION_ENEMY_DETAIL_DISTANCE_SQ = 85 * 85;
  const EXPLORATION_ENEMY_SEPARATION_DISTANCE = 46;
  const QUEST_MAP_UPDATE_INTERVAL = 0.16;
  const tmpVec = new THREE.Vector3();
  const tmpVec2 = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const clock = new THREE.Clock();
  const keys = new Set();
  let progression = null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  root.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x82bee8);
  scene.fog = new THREE.FogExp2(0x9ac7e8, 0.018);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 520);
  camera.position.set(0, 6, 10);

  const materials = {
    grass: new THREE.MeshStandardMaterial({ color: 0x394736, roughness: 0.92 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x6a5740, roughness: 0.98 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x646865, roughness: 0.88, metalness: 0.02 }),
    darkStone: new THREE.MeshStandardMaterial({ color: 0x3e4544, roughness: 0.94 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xbfc8c5, metalness: 0.82, roughness: 0.34 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x727d7d, metalness: 0.7, roughness: 0.44 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd5aa50, metalness: 0.55, roughness: 0.42 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xd9cfb1, roughness: 0.7 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2d5f78, roughness: 0.68 }),
    royalBlue: new THREE.MeshStandardMaterial({ color: 0x173f5c, roughness: 0.72 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x8d3430, roughness: 0.82 }),
    wizardRobe: new THREE.MeshStandardMaterial({ color: 0x273f78, roughness: 0.78 }),
    wizardTrim: new THREE.MeshStandardMaterial({ color: 0x7ae8ff, roughness: 0.46, metalness: 0.14 }),
    wizardHat: new THREE.MeshStandardMaterial({ color: 0x1f2f5f, roughness: 0.76 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb77a55, roughness: 0.72 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x593822, roughness: 0.86 }),
    darkLeather: new THREE.MeshStandardMaterial({ color: 0x2f1c13, roughness: 0.9 }),
    fur: new THREE.MeshStandardMaterial({ color: 0x2e2118, roughness: 0.95 }),
    warPaint: new THREE.MeshBasicMaterial({ color: 0x2d5f78 }),
    emberEye: new THREE.MeshBasicMaterial({ color: 0xffce73 }),
    dragonScale: new THREE.MeshStandardMaterial({ color: 0x2f6154, roughness: 0.74, metalness: 0.08 }),
    dragonBelly: new THREE.MeshStandardMaterial({ color: 0x9a7d4d, roughness: 0.82 }),
    dragonWing: new THREE.MeshStandardMaterial({ color: 0x28443e, roughness: 0.86, side: THREE.DoubleSide }),
    dragonEye: new THREE.MeshBasicMaterial({ color: 0xffd15f }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4326, roughness: 0.9 }),
    paleWood: new THREE.MeshStandardMaterial({ color: 0x9b7650, roughness: 0.84 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xa66f48, roughness: 0.94 }),
    rope: new THREE.MeshStandardMaterial({ color: 0xb8965c, roughness: 0.96 }),
    basket: new THREE.MeshStandardMaterial({ color: 0x8a6339, roughness: 0.95 }),
    lampGlow: new THREE.MeshBasicMaterial({ color: 0xffd889, transparent: true, opacity: 0.86 }),
    cityBannerRed: new THREE.MeshStandardMaterial({ color: 0x7f2d2d, roughness: 0.86 }),
    crowdRed: new THREE.MeshStandardMaterial({ color: 0x8d3430, roughness: 0.8 }),
    crowdBlue: new THREE.MeshStandardMaterial({ color: 0x2d5f78, roughness: 0.8 }),
    crowdGreen: new THREE.MeshStandardMaterial({ color: 0x4f6f4a, roughness: 0.8 }),
    crowdGold: new THREE.MeshStandardMaterial({ color: 0xb28a3d, roughness: 0.78 }),
    remoteAlly: new THREE.MeshStandardMaterial({ color: 0x43b7d8, roughness: 0.7 }),
    remoteEnemy: new THREE.MeshStandardMaterial({ color: 0xc65444, roughness: 0.72 }),
    meadow: new THREE.MeshStandardMaterial({ color: 0x466b3c, roughness: 0.96 }),
    desert: new THREE.MeshStandardMaterial({ color: 0xb99158, roughness: 0.98 }),
    mountainGround: new THREE.MeshStandardMaterial({ color: 0x5a625e, roughness: 0.96 }),
    cactus: new THREE.MeshStandardMaterial({ color: 0x356c48, roughness: 0.92 }),
    dryBrush: new THREE.MeshStandardMaterial({ color: 0x8d7140, roughness: 0.96 }),
    adobe: new THREE.MeshStandardMaterial({ color: 0xc69b67, roughness: 0.92 }),
    mountainPlaster: new THREE.MeshStandardMaterial({ color: 0x91948a, roughness: 0.9 }),
    swampGround: new THREE.MeshStandardMaterial({ color: 0x314f3a, roughness: 0.98 }),
    bogWater: new THREE.MeshStandardMaterial({ color: 0x254f49, roughness: 0.34, metalness: 0.02, transparent: true, opacity: 0.68 }),
    reed: new THREE.MeshStandardMaterial({ color: 0x607747, roughness: 0.94 }),
    willowLeaf: new THREE.MeshStandardMaterial({ color: 0x2d5d3f, roughness: 0.9 }),
    swampPlank: new THREE.MeshStandardMaterial({ color: 0x5b4932, roughness: 0.95 }),
    thatch: new THREE.MeshStandardMaterial({ color: 0x77623f, roughness: 0.96 }),
    spiderCarapace: new THREE.MeshStandardMaterial({ color: 0x2d221c, roughness: 0.78, metalness: 0.03 }),
    spiderMarking: new THREE.MeshBasicMaterial({ color: 0xd9a648 }),
    wisp: new THREE.MeshBasicMaterial({ color: 0x5effbd, transparent: true, opacity: 0.48, depthWrite: false }),
    wispCore: new THREE.MeshBasicMaterial({ color: 0xd8fff1, transparent: true, opacity: 0.94 }),
    cityWall: new THREE.MeshStandardMaterial({ color: 0xb8b7aa, roughness: 0.88 }),
    cityRoof: new THREE.MeshStandardMaterial({ color: 0x435260, roughness: 0.86 }),
    stainedGlass: new THREE.MeshBasicMaterial({ color: 0x7ae8ff, transparent: true, opacity: 0.72 }),
    horseCoat: new THREE.MeshStandardMaterial({ color: 0x7b4a2a, roughness: 0.86 }),
    horseMane: new THREE.MeshStandardMaterial({ color: 0x2f1b12, roughness: 0.9 }),
    saddle: new THREE.MeshStandardMaterial({ color: 0x49301f, roughness: 0.88 }),
    path: new THREE.MeshStandardMaterial({ color: 0x8f774f, roughness: 0.98 }),
    water: new THREE.MeshStandardMaterial({ color: 0x3f9ec5, roughness: 0.26, metalness: 0.02, transparent: true, opacity: 0.72 }),
    pine: new THREE.MeshStandardMaterial({ color: 0x214f35, roughness: 0.9 }),
    broadleaf: new THREE.MeshStandardMaterial({ color: 0x4d7d3d, roughness: 0.86 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x6f2f2b, roughness: 0.88 }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xd0bc91, roughness: 0.9 }),
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
    hit: new THREE.MeshBasicMaterial({ color: 0xffe1a6, transparent: true, opacity: 0.0, depthWrite: false })
  };

  const modelScale = {
    npc: 1.04,
    barbarianBase: 1.08,
    dragonBase: 1.32,
    spiderBase: 1.42
  };

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
    saveTimer: 0,
    menuPhase: "landing",
    pausedFromPlay: false,
    selectedCharacter: "knight",
    mode: "exploration",
    arenaGroup: null,
    explorationGroup: null,
    npcs: [],
    questItems: [],
    quests: [],
    activeNpc: null,
    dialogNpc: null,
    dialogActionIndex: 0,
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
      roads: [],
      city: null,
      arenaCity: null,
      horse: null,
      discovered: new Set(),
      completed: false,
      arenaActivity: defaultArenaActivity(),
      spawn: new THREE.Vector3(180, 0, 1.6)
    }
  };

  const online = {
    localId: (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2),
    client: null,
    topic: "",
    connected: false,
    role: null,
    flow: "join",
    roomCode: "",
    lastRoomCode: "",
    lastRoomMode: "exploration",
    hostId: "",
    sendTimer: 0,
    worldSendTimer: 0,
    effectSeq: 0,
    presenceTimer: 0,
    remotePlayers: new Map(),
    kickedIds: new Set()
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
    hurtTimer: 0,
    walkTime: 0
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
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

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = hashString(seed || "ironhold");
    return () => {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
    game.exploration.colliders.push({
      x: game.exploration.origin.x + localX,
      z: game.exploration.origin.z + localZ,
      radius,
      kind
    });
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

  function defaultCharacterProgress(character) {
    const key = character === "wizard" ? "wizard" : "knight";
    const weapon = defaultWeaponByCharacter[key];
    return {
      xp: 0,
      equipment: { weapon },
      unlockedEquipment: [weapon],
      perks: []
    };
  }

  function validEquipmentForCharacter(character, equipmentId) {
    const key = character === "wizard" ? "wizard" : "knight";
    const definition = equipmentDefs[equipmentId];
    return !!definition && definition.character === key;
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
    normalized.equipment.weapon = normalized.unlockedEquipment.includes(weapon) ? weapon : normalized.equipment.weapon;
    normalized.perks = Array.isArray(entry.perks)
      ? entry.perks.filter(id => !!perkDefs[id]).filter((id, index, values) => values.indexOf(id) === index)
      : [];
    return normalized;
  }

  function characterProgressNeedsMigration(entry, character) {
    const key = character === "wizard" ? "wizard" : "knight";
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
    const key = character === "wizard" ? "wizard" : "knight";
    const progress = getCharacterProgress(key);
    const weapon = progress.equipment && progress.equipment.weapon;
    return validEquipmentForCharacter(key, weapon) ? weapon : defaultWeaponByCharacter[key];
  }

  function hasPerk(id, character = player.character) {
    return (getCharacterProgress(character).perks || []).includes(id);
  }

  function sanitizedCombatProfile(character, weaponId, perks = []) {
    const key = character === "wizard" ? "wizard" : "knight";
    const fallbackWeapon = defaultWeaponByCharacter[key];
    const safeWeapon = validEquipmentForCharacter(key, weaponId) ? weaponId : fallbackWeapon;
    const safePerks = Array.isArray(perks)
      ? perks.filter(id => !!perkDefs[id]).filter((id, index, values) => values.indexOf(id) === index).slice(0, 8)
      : [];
    return { character: key, weaponId: safeWeapon, perks: safePerks };
  }

  function combatTuningFor(character = player.character, options = {}) {
    const key = character === "wizard" ? "wizard" : "knight";
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
    const key = character === "wizard" ? "wizard" : "knight";
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
        grantPerkToCharacter("wizard", "crownford_drill")
      ]) {
        if (message) {
          unlocked.push(message);
        }
      }
    }
    return unlocked;
  }

  function currentKitText() {
    const weapon = equipmentDefs[equippedWeapon()];
    const perks = getCharacterProgress().perks || [];
    const perkName = perks.includes("crownford_drill") ? " + Drill" : "";
    return (weapon ? weapon.name : "Starter Kit") + perkName;
  }

  function defaultProgression() {
    return {
      version: 3,
      activeGame: null,
      characters: {
        knight: defaultCharacterProgress("knight"),
        wizard: defaultCharacterProgress("wizard")
      },
      exploration: {
        quests: {},
        discovered: [],
        completed: false,
        horseUnlocked: false,
        boons: { health: 0, guard: 0, mana: 0 },
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

  function normalizeProgression(raw) {
    const base = defaultProgression();
    const source = raw && typeof raw === "object" ? raw : {};
    const sourceCharacters = source.characters && typeof source.characters === "object" ? source.characters : {};
    for (const character of ["knight", "wizard"]) {
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
    base.exploration.completed = !!sourceExploration.completed;
    base.exploration.horseUnlocked = !!sourceExploration.horseUnlocked;
    const sourceBoons = sourceExploration.boons && typeof sourceExploration.boons === "object" ? sourceExploration.boons : {};
    base.exploration.boons.health = Math.max(0, Math.floor(numberOrZero(sourceBoons.health)));
    base.exploration.boons.guard = Math.max(0, Math.floor(numberOrZero(sourceBoons.guard)));
    base.exploration.boons.mana = Math.max(0, Math.floor(numberOrZero(sourceBoons.mana)));
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
        character: sourceExploration.resources.character === "wizard" ? "wizard" : "knight",
        health: numberOrZero(sourceExploration.resources.health),
        guard: numberOrZero(sourceExploration.resources.guard),
        mana: numberOrZero(sourceExploration.resources.mana)
      };
    }
    base.exploration.guidanceSeen = !!sourceExploration.guidanceSeen;

    const sourceActive = source.activeGame && typeof source.activeGame === "object" ? source.activeGame : null;
    if (sourceActive && sourceActive.mode === "exploration") {
      base.activeGame = {
        mode: "exploration",
        character: sourceActive.character === "wizard" ? "wizard" : "knight",
        updatedAt: Math.max(0, Math.floor(numberOrZero(sourceActive.updatedAt)))
      };
    } else if (base.exploration.position || base.exploration.resources) {
      base.activeGame = {
        mode: "exploration",
        character: base.exploration.resources && base.exploration.resources.character === "wizard" ? "wizard" : "knight",
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
      character: progression.activeGame.character === "wizard" ? "wizard" : "knight",
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
    const key = character === "wizard" ? "wizard" : "knight";
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
    return getCharacterLevel(character) >= abilityUnlockLevel(ability);
  }

  function showAbilityLocked(ability) {
    showBanner(abilityDisplayName(ability) + " unlocks at level " + abilityUnlockLevel(ability), 2.3);
  }

  function nextUnlockText(character = player.character) {
    const level = getCharacterLevel(character);
    const unlocks = character === "wizard"
      ? [{ level: 3, name: "Arcane burst" }, { level: 5, name: "Potion drop" }]
      : [{ level: 3, name: "Shield bash" }];
    const next = unlocks.find(unlock => unlock.level > level);
    return next ? next.name + " at level " + next.level : "Stats improve each level";
  }

  function levelRewardText(level, character = player.character) {
    const unlocks = character === "wizard"
      ? [{ level: 3, name: "Arcane burst" }, { level: 5, name: "Potion drop" }]
      : [{ level: 3, name: "Shield bash" }];
    const unlocked = unlocks.filter(unlock => unlock.level === level).map(unlock => unlock.name);
    return unlocked.length ? unlocked.join(" and ") + " unlocked" : "Stats increased";
  }

  function progressionStatsFor(character = player.character) {
    const level = getCharacterLevel(character);
    const steps = Math.max(0, level - 1);
    const boons = progression.exploration.boons || { health: 0, guard: 0, mana: 0 };
    if (character === "wizard") {
      return {
        maxHealth: 62 + steps * 5 + (boons.health || 0),
        maxGuard: 0,
        maxMana: 72 + steps * 8 + (boons.mana || 0),
        manaRegen: 16.5 + steps * 0.65,
        potionCooldownMax: Math.max(10, 18 - (progression.exploration.potionCooldownBonus || 0))
      };
    }
    return {
      maxHealth: 78 + steps * 6 + (boons.health || 0),
      maxGuard: 68 + steps * 7 + (boons.guard || 0),
      maxMana: 0,
      manaRegen: 0,
      potionCooldownMax: 18
    };
  }

  function applyProgressionStats(resetVitals = false) {
    const stats = progressionStatsFor(player.character);
    const healthRatio = player.maxHealth > 0 ? clamp(player.health / player.maxHealth, 0, 1) : 1;
    const guardRatio = player.maxGuard > 0 ? clamp(player.guard / player.maxGuard, 0, 1) : 1;
    const manaRatio = player.maxMana > 0 ? clamp(player.mana / player.maxMana, 0, 1) : 1;
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
      exploration.completed = !!game.exploration.completed;
      exploration.horseUnlocked = exploration.horseUnlocked || !!game.exploration.horse;
    }
    if (game.mode === "exploration" && game.state === "playing" && !localPlayerInArenaActivity()) {
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
    }
    game.exploration.discovered = new Set(Array.isArray(saved.discovered) ? saved.discovered : []);
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

  function explorationGuidanceText() {
    const level = getCharacterLevel();
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
      startedBy: "",
      nextWaveIn: 0,
      exitOpen: false,
      endedReason: null,
      returnPosition: null,
      infirmaryPosition: null,
      localReturnPosition: null,
      localOptOutActivityId: ""
    };
  }

  function arenaActivityActive() {
    return game.mode === "exploration" && !!game.exploration.arenaActivity.active;
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

  function resetArenaActivityState() {
    game.exploration.arenaActivity = defaultArenaActivity();
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
      startedBy: activity.startedBy,
      nextWaveIn: activity.nextWaveIn,
      exitOpen: !!activity.exitOpen,
      endedReason: activity.endedReason
    };
  }

  function arenaParticipantsForRoom() {
    const participants = new Set([online.localId]);
    for (const id of online.remotePlayers.keys()) {
      participants.add(id);
    }
    return Array.from(participants).slice(0, 8);
  }

  function removeArenaParticipant(id) {
    const activity = game.exploration.arenaActivity;
    if (!activity.active || !id) {
      return false;
    }
    const nextParticipants = activity.participants.filter(participant => participant !== id);
    if (nextParticipants.length === activity.participants.length) {
      return false;
    }
    activity.participants = nextParticipants;
    if (activity.participants.length === 0 || (activity.participants.length === 1 && activity.participants[0] === online.localId && online.role !== "host")) {
      endCrownringArenaActivity("yield");
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
    showBanner("Crownring opened - press Y to yield", 3);
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
    showBanner(defeated ? "Recovered at Crownford infirmary" : "Yielded from the Crownring", 2.6);
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
    const localReturnPosition = activity.localReturnPosition;
    const localOptOutActivityId = activity.localOptOutActivityId;
    activity.active = !!snapshot.active;
    activity.phase = snapshot.phase || (activity.active ? "wave" : "idle");
    activity.activityId = snapshot.activityId || "";
    activity.localReturnPosition = previousActivityId === activity.activityId ? localReturnPosition : null;
    activity.localOptOutActivityId = previousActivityId === activity.activityId ? localOptOutActivityId : "";
    activity.wave = Math.max(0, Math.floor(numberOrZero(snapshot.wave)));
    activity.center = snapshot.center || { x: 0, z: 0 };
    activity.radius = Math.max(8, numberOrZero(snapshot.radius) || arenaRadius);
    activity.participants = Array.isArray(snapshot.participants) ? snapshot.participants.slice(0, 8) : [];
    activity.startedBy = snapshot.startedBy || "";
    activity.nextWaveIn = Math.max(0, numberOrZero(snapshot.nextWaveIn));
    activity.exitOpen = !!snapshot.exitOpen;
    activity.endedReason = snapshot.endedReason || null;
    const nowLocal = localPlayerInArenaActivity();
    if (nowLocal && !wasLocal) {
      enterLocalArenaActivity();
    } else if (!nowLocal && wasLocal) {
      exitLocalArenaActivity(activity.endedReason || "yield");
    } else {
      setArenaVisible(nowLocal);
    }
    if (!nowLocal && activity.active && !wasLocal) {
      showBanner("Crownring match in progress", 2.2);
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
    if (isJoinedClient()) {
      sendOnlineMessage({ kind: "arenaStartRequest", state: serializePlayerState() });
      showBanner("Ask the host to open the Crownring");
      closeQuestDialog();
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
    showBanner("Crownring opened - press Y to yield", 3);
    sendOnlineMessage({ kind: "state", state: serializePlayerState() });
    sendWorldSnapshot(true);
    updateHud();
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
    if (xp > 0) {
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
    game.exploration.roads.length = 0;
    game.exploration.city = null;
    game.exploration.arenaCity = null;
    game.exploration.discovered = new Set();
    game.exploration.completed = false;
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
    }
    saveProgress();
    updateHud();
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

  function explorationTerrainHeight(localX, localZ, seed = game.exploration.seed || "explore-local") {
    const distance = Math.hypot(localX, localZ);
    const edgeRise = game.exploration.radius * 0.78;
    const roll = Math.sin(localX * 0.13 + hashString(seed) * 0.0001) * 0.08 + Math.cos(localZ * 0.11) * 0.07;
    return distance > edgeRise ? roll + (distance - edgeRise) * 0.012 : roll;
  }

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
      const y = explorationTerrainHeight(cx, cz) + 0.06;
      positions.push(
        cx + nx * width * 0.5, y, cz + nz * width * 0.5,
        cx - nx * width * 0.5, y, cz - nz * width * 0.5
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

  function createRoadRibbonGeometry(points, width) {
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
      const y = explorationTerrainHeight(point.x, point.z) + 0.074;
      positions.push(
        point.x + normalX * edge, y, point.z + normalZ * edge,
        point.x - normalX * edge, y, point.z - normalZ * edge
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
    const positions = [x, explorationTerrainHeight(x, z) + 0.062, z];
    const uvs = [0.5, 0.5];
    const indices = [];
    const steps = 28;
    for (let i = 0; i <= steps; i += 1) {
      const angle = (i / steps) * TAU;
      const px = x + Math.cos(angle) * radius;
      const pz = z + Math.sin(angle) * radius;
      positions.push(px, explorationTerrainHeight(px, pz) + 0.064, pz);
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
    const junction = new THREE.Mesh(createRoadJunctionGeometry(x, z, width * 0.62), materials.path);
    junction.receiveShadow = true;
    group.add(junction);
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
      return { spacing: 42, maxOffset: 1.35, strength: 0.055 };
    }
    if (style === "lane") {
      return { spacing: 24, maxOffset: 2.45, strength: 0.1 };
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
    return { spacing: 30, maxOffset: 4.8, strength: 0.15 };
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

  function addExplorationRoad(group, points, width = 2.8, style = "wild") {
    const winding = addWindingRoadPoints(points, style);
    const routed = routeRoadAroundLakes(winding, width);
    addExplorationRoadRibbon(group, routed, width);
    for (const point of points) {
      addExplorationRoadJunction(group, point.x, point.z, width * 0.82);
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

    addExplorationRoad(group, [homeDoor, homeJunction, { x: -7, z: 18 }, { x: 4, z: 43 }, { x: -5, z: 66 }, northFork], 3.15, "wild");

    const city = game.exploration.city;
    if (city) {
      const cityGate = city.roadAnchor || { x: city.localX, z: city.localZ - 44 };
      addExplorationRoad(group, [northFork, { x: -4, z: northFork.z + 18 }, { x: cityGate.x * 0.45, z: cityGate.z - 27 }, { x: cityGate.x - 4, z: cityGate.z - 12 }, cityGate], 3.25, "formal");
    }
    const arenaCity = game.exploration.arenaCity;
    if (arenaCity) {
      const arenaGate = arenaCity.roadAnchor || { x: arenaCity.localX - 34, z: arenaCity.localZ - 18 };
      addExplorationRoad(group, [northFork, { x: 34, z: 100 }, { x: 72, z: 91 }, { x: arenaGate.x - 18, z: arenaGate.z - 9 }, arenaGate], 3.05, "formal");
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
        addExplorationRoad(group, [northFork, { x: 24, z: 99 }, { x: 56, z: 122 }, mountainFork, { x: mountainFork.x + 17, z: mountainFork.z + 8 }, entrance], 2.85, "mountain");
      } else if (village.biome === "desert") {
        entrance = roadEntranceForVillage(village, desertFork);
        addExplorationRoad(group, [homeJunction, { x: -18, z: -42 }, { x: -48, z: -58 }, desertFork, { x: desertFork.x - 28, z: desertFork.z - 15 }, entrance], 2.75, "desert");
      } else if (village.biome === "swamp") {
        entrance = roadEntranceForVillage(village, swampFork);
        addExplorationRoad(group, [northFork, { x: -28, z: 104 }, { x: -66, z: 124 }, swampFork, { x: swampFork.x - 24, z: swampFork.z + 10 }, entrance], 2.65, "swamp");
      } else if (localX >= 0) {
        entrance = roadEntranceForVillage(village, meadowEastFork);
        addExplorationRoad(group, [homeJunction, { x: 18, z: -31 }, { x: 43, z: -58 }, meadowEastFork, entrance], 2.75, "wild");
      } else {
        entrance = roadEntranceForVillage(village, meadowWestFork);
        addExplorationRoad(group, [homeJunction, { x: -22, z: 3 }, { x: -46, z: 30 }, meadowWestFork, entrance], 2.75, "wild");
      }
      addExplorationRoad(group, [entrance, { x: localX, z: localZ }], 2.2, "lane");
    }
    addRoadsideWayfindingDecor(group);
  }

  function makeDecorGroup(group, x, z, rotation = 0, scale = 1) {
    const decor = new THREE.Group();
    decor.position.set(x, 0, z);
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

  function addRoadsideWayfindingDecor(group) {
    addSignpost(group, 4.7, -18.0, -0.18, 0.95, materials.flower);
    addLanternPost(group, -4.6, -19.2, 0.24, 0.86);
    addSignpost(group, -5.2, 87.4, -0.5, 1.0, materials.cityRoof);
    addLanternPost(group, 5.0, 83.8, -0.15, 0.88);
    addSignpost(group, 53.5, -52.0, 0.68, 0.92, materials.broadleaf);
    addSignpost(group, -59.0, 47.0, -0.82, 0.92, materials.broadleaf);
    addSignpost(group, 75.0, 117.5, 0.9, 0.96, materials.darkStone);
    addLanternPost(group, 82.5, 107.8, 0.5, 0.82);
    addSignpost(group, -64.5, -70.8, -0.95, 0.96, materials.dryBrush);
    addBucket(group, -61.4, -77.0, 0.2, 0.92);
    addSignpost(group, -98.5, 132.0, -0.5, 0.96, materials.reed);
    addLanternPost(group, -88.6, 123.4, -0.7, 0.78);

    const city = game.exploration.city;
    if (city) {
      const gate = city.roadAnchor || { x: city.localX, z: city.localZ - 44 };
      addBannerPole(group, gate.x - 7.4, gate.z - 2.8, 0.12, 0.96);
      addBannerPole(group, gate.x + 7.4, gate.z - 2.8, -0.12, 0.96);
      addCrateStack(group, gate.x - 10.2, gate.z + 4.4, 0.18, 0.84);
      addBarrel(group, gate.x + 10.2, gate.z + 4.6, -0.12, 0.84);
    }
    const arenaCity = game.exploration.arenaCity;
    if (arenaCity) {
      const gate = arenaCity.roadAnchor || { x: arenaCity.localX - 34, z: arenaCity.localZ - 18 };
      addBannerPole(group, gate.x - 5.8, gate.z - 2.1, 0.08, 0.88);
      addBannerPole(group, gate.x + 5.8, gate.z - 2.1, -0.08, 0.88);
      addLanternPost(group, gate.x - 8.2, gate.z + 1.7, 0.18, 0.78);
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
    stable.position.set(x, 0, z);
    const postPositions = [
      [-1.8, 0, -1.2],
      [1.8, 0, -1.2],
      [-1.8, 0, 1.2],
      [1.8, 0, 1.2]
    ];
    for (const [px, py, pz] of postPositions) {
      stable.add(makeBox(0.18, 1.85, 0.18, materials.wood, px, 0.92 + py, pz));
    }
    const roofA = makeBox(4.4, 0.26, 1.75, materials.roof, 0, 2.02, -0.52);
    const roofB = makeBox(4.4, 0.26, 1.75, materials.roof, 0, 2.02, 0.52);
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
    ctx.fillStyle = desert ? "#b99258" : mountain ? "#5d635f" : swamp ? "#31513a" : "#45683b";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 850; i += 1) {
      const x = random() * 256;
      const y = random() * 256;
      const r = 0.8 + random() * (desert ? 3.2 : swamp ? 5.4 : 4.8);
      ctx.fillStyle = desert
        ? (random() > 0.52 ? "rgba(236, 196, 122, 0.2)" : "rgba(111, 79, 42, 0.14)")
        : swamp
          ? (random() > 0.48 ? "rgba(108, 132, 75, 0.2)" : "rgba(13, 35, 31, 0.22)")
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
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(desert ? 6 : swamp ? 4 : 5, desert ? 6 : swamp ? 4 : 5);
    return texture;
  }

  function createBiomePatchGeometry(biome, seed) {
    const random = seededRandom(seed + "-patch-" + biome.id);
    const phaseA = random() * TAU;
    const phaseB = random() * TAU;
    const rotation = biome.rotation || 0;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const points = [];
    const steps = 112;
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / steps) * TAU;
      const wobble = 1
        + Math.sin(angle * 3 + phaseA) * 0.045
        + Math.sin(angle * 5 + phaseB) * 0.03
        + (random() - 0.5) * 0.018;
      const x = Math.cos(angle) * biome.rx * wobble;
      const z = Math.sin(angle) * biome.rz * wobble;
      points.push(new THREE.Vector2(x * cos - z * sin, x * sin + z * cos));
    }
    return new THREE.ShapeGeometry(new THREE.Shape(points));
  }

  function addBiomePatch(group, biome, seed) {
    const baseMaterial = biome.id === "desert" ? materials.desert : biome.id === "swamp" ? materials.swampGround : materials.mountainGround;
    const material = baseMaterial.clone();
    material.map = createBiomeTexture(seed, biome.id);
    const patch = new THREE.Mesh(createBiomePatchGeometry(biome, seed), material);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(biome.x, 0.019, biome.z);
    patch.receiveShadow = true;
    group.add(patch);
  }

  function addDesertHouse(group, x, z, scale, variant) {
    const house = new THREE.Group();
    house.position.set(x, 0, z);
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
    const flatRoof = makeBox(5.55, 0.28, 4.86, roofMat, 0, 2.18, 0);
    const shade = makeBox(2.2, 0.08, 1.0, materials.cloth, 0, 1.54, -2.42);
    shade.rotation.x = -0.18;
    const dome = makeCylinder(0.1, 0.76, 0.5, 18, walls, variant % 2 ? -1.2 : 1.1, 2.5, 0.85);
    const door = makeBox(0.82, 1.25, 0.08, materials.darkLeather, 0, 0.68, -2.16);
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
    house.position.set(x, 0, z);
    house.scale.setScalar(scale);
    const wall = variant % 2 ? materials.mountainPlaster : materials.stone;
    const floor = makeBox(5.0, 0.16, 4.4, materials.darkStone, 0, 0.08, 0);
    const back = makeBox(5.0, 2.18, 0.28, wall, 0, 1.18, 2.08);
    const left = makeBox(0.28, 2.18, 4.4, wall, -2.36, 1.18, 0);
    const right = makeBox(0.28, 2.18, 4.4, wall, 2.36, 1.18, 0);
    const frontLeft = makeBox(1.7, 2.18, 0.28, wall, -1.62, 1.18, -2.08);
    const frontRight = makeBox(1.7, 2.18, 0.28, wall, 1.62, 1.18, -2.08);
    const lintel = makeBox(1.35, 0.34, 0.3, materials.wood, 0, 2.08, -2.08);
    const roofA = makeBox(6.05, 0.4, 2.95, materials.darkStone, 0, 2.66, -0.9);
    const roofB = makeBox(6.05, 0.4, 2.95, materials.darkStone, 0, 2.66, 0.9);
    roofA.rotation.x = -0.6;
    roofB.rotation.x = 0.6;
    const beam = makeBox(5.9, 0.14, 0.14, materials.wood, 0, 2.44, -2.2);
    const chimney = makeBox(0.48, 1.0, 0.48, materials.darkStone, 1.32, 3.08, 0.42);
    const door = makeBox(0.82, 1.34, 0.08, materials.wood, 0, 0.72, -2.25);
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
    house.position.set(x, 0, z);
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
    const door = makeBox(0.74, 1.16, 0.08, materials.darkLeather, 0, 1.18, -1.86);
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
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    house.scale.setScalar(scale);
    const floor = makeBox(5.2, 0.12, 4.6, materials.paleWood, 0, 0.06, 0);
    const back = makeBox(5.2, 2.25, 0.24, materials.plaster, 0, 1.18, 2.18);
    const left = makeBox(0.24, 2.25, 4.6, materials.plaster, -2.48, 1.18, 0);
    const right = makeBox(0.24, 2.25, 4.6, materials.plaster, 2.48, 1.18, 0);
    const frontLeft = makeBox(1.8, 2.25, 0.24, materials.plaster, -1.7, 1.18, -2.18);
    const frontRight = makeBox(1.8, 2.25, 0.24, materials.plaster, 1.7, 1.18, -2.18);
    const lintel = makeBox(1.25, 0.34, 0.26, materials.plaster, 0, 2.13, -2.18);
    const roofA = makeBox(6.05, 0.36, 3.0, materials.roof, 0, 2.6, -0.92);
    const roofB = makeBox(6.05, 0.36, 3.0, materials.roof, 0, 2.6, 0.92);
    roofA.rotation.x = -0.5;
    roofB.rotation.x = 0.5;
    const chimney = makeBox(0.44, 0.92, 0.44, materials.darkStone, 1.42, 2.96, 0.65);
    const door = makeBox(0.86, 1.4, 0.08, materials.wood, 0, 0.76, -2.34);
    const windowMat = materials.lightningCore.clone();
    windowMat.color.setHex(0xffd889);
    windowMat.opacity = 0.72;
    const windowA = makeBox(0.62, 0.48, 0.07, windowMat, -1.4, 1.42, -2.35);
    const windowB = makeBox(0.62, 0.48, 0.07, windowMat.clone(), 1.4, 1.42, -2.35);
    if (variant % 2 === 1) {
      house.rotation.y = Math.PI / 2;
    }
    house.add(floor, back, left, right, frontLeft, frontRight, lintel, roofA, roofB, chimney, door, windowA, windowB);
    group.add(house);
    addExplorationCollider(x, z, scale * 3.4, "structure");
    return house;
  }

  function addExplorationTree(group, x, z, random) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    const height = 2.3 + random() * 2.0;
    const trunk = makeCylinder(0.16, 0.22, height, 8, materials.wood, 0, height / 2, 0);
    tree.add(trunk);
    if (random() > 0.42) {
      const leafA = makeCone(1.05 + random() * 0.35, 1.85, 12, materials.pine, 0, height + 0.3, 0);
      const leafB = makeCone(0.8 + random() * 0.28, 1.55, 12, materials.pine, 0, height + 1.08, 0);
      tree.add(leafA, leafB);
    } else {
      const crown = makeSphere(1.0 + random() * 0.34, materials.broadleaf, 0, height + 0.42, 0);
      crown.scale.set(1.08, 0.9, 1.05);
      const crownB = makeSphere(0.72, materials.broadleaf, -0.42, height + 0.34, 0.2);
      tree.add(crown, crownB);
    }
    tree.rotation.y = random() * TAU;
    if (Math.hypot(x, z) > 92) {
      tree.traverse(child => {
        if (child.isMesh) {
          child.castShadow = false;
        }
      });
    }
    group.add(tree);
    addExplorationCollider(x, z, 0.62, "tree");
  }

  function addMountainPine(group, x, z, random) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    const height = 2.9 + random() * 2.4;
    const trunk = makeCylinder(0.14, 0.22, height, 8, materials.wood, 0, height / 2, 0);
    const leafA = makeCone(1.08 + random() * 0.25, 1.95, 12, materials.pine, 0, height + 0.1, 0);
    const leafB = makeCone(0.86 + random() * 0.2, 1.7, 12, materials.pine, 0, height + 0.88, 0);
    const leafC = makeCone(0.62 + random() * 0.18, 1.35, 12, materials.pine, 0, height + 1.55, 0);
    tree.add(trunk, leafA, leafB, leafC);
    tree.rotation.y = random() * TAU;
    if (Math.hypot(x, z) > 92) {
      tree.traverse(child => {
        if (child.isMesh) {
          child.castShadow = false;
        }
      });
    }
    group.add(tree);
    addExplorationCollider(x, z, 0.66, "tree");
  }

  function addDesertCactus(group, x, z, random) {
    const cactus = new THREE.Group();
    cactus.position.set(x, 0, z);
    const height = 1.35 + random() * 1.35;
    const trunk = makeCylinder(0.16, 0.2, height, 9, materials.cactus, 0, height / 2, 0);
    cactus.add(trunk);
    if (random() > 0.28) {
      const armY = height * (0.48 + random() * 0.22);
      const side = random() > 0.5 ? 1 : -1;
      const arm = makeCylinder(0.07, 0.09, 0.72 + random() * 0.36, 8, materials.cactus, side * 0.3, armY, 0);
      arm.rotation.z = Math.PI / 2;
      const lift = makeCylinder(0.07, 0.085, 0.46 + random() * 0.34, 8, materials.cactus, side * 0.64, armY + 0.18, 0);
      cactus.add(arm, lift);
    }
    cactus.rotation.y = random() * TAU;
    group.add(cactus);
    addExplorationCollider(x, z, 0.48, "tree");
  }

  function addDryBush(group, x, z, random) {
    const bush = new THREE.Group();
    bush.position.set(x, 0.08, z);
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
    reeds.position.set(x, 0, z);
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
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    const height = 2.2 + random() * 1.4;
    const trunk = makeCylinder(0.18, 0.3, height, 8, materials.wood, 0, height / 2, 0);
    trunk.rotation.z = (random() - 0.5) * 0.18;
    tree.add(trunk);
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * TAU + random() * 0.4;
      const crown = makeSphere(0.82 + random() * 0.28, materials.willowLeaf, Math.cos(angle) * 0.42, height + 0.34 + random() * 0.24, Math.sin(angle) * 0.42);
      crown.scale.set(1.0, 0.62 + random() * 0.16, 1.08);
      tree.add(crown);
    }
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * TAU + random() * 0.35;
      const length = 0.82 + random() * 0.72;
      const vine = makeCylinder(0.012, 0.018, length, 5, materials.reed, Math.cos(angle) * (0.55 + random() * 0.32), height + 0.1 - length / 2, Math.sin(angle) * (0.55 + random() * 0.32));
      vine.rotation.x = (random() - 0.5) * 0.35;
      vine.rotation.z = (random() - 0.5) * 0.35;
      vine.castShadow = false;
      tree.add(vine);
    }
    tree.rotation.y = random() * TAU;
    if (Math.hypot(x, z) > 92) {
      tree.traverse(child => {
        if (child.isMesh) {
          child.castShadow = false;
        }
      });
    }
    group.add(tree);
    addExplorationCollider(x, z, 0.72, "tree");
  }

  function addBogPool(group, x, z, rx, rz, random) {
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.045, 36), materials.bogWater.clone());
    pool.position.set(x, 0.046, z);
    pool.scale.set(rx, 1, rz);
    pool.rotation.y = random() * TAU;
    pool.receiveShadow = true;
    group.add(pool);
    for (let i = 0; i < 7; i += 1) {
      const angle = random() * TAU;
      const radius = 0.92 + random() * 0.2;
      addReeds(group, x + Math.cos(angle) * rx * radius, z + Math.sin(angle) * rz * radius, random, 3 + Math.floor(random() * 4));
    }
  }

  function addExplorationRock(group, x, z, random, large = false) {
    const radius = large ? 1.15 + random() * 1.6 : 0.35 + random() * 0.85;
    const geometry = new THREE.DodecahedronGeometry(radius, 0);
    const rock = new THREE.Mesh(geometry, materials.stone);
    rock.position.set(x, large ? radius * 0.34 : 0.22, z);
    rock.scale.set(1.2 + random() * 1.4, 0.55 + random() * 0.55, 0.8 + random() * 1.2);
    rock.rotation.set(random() * 0.4, random() * TAU, random() * 0.28);
    addShadow(rock);
    rock.castShadow = large;
    group.add(rock);
    addExplorationCollider(x, z, large ? radius * 1.15 : Math.max(0.42, radius * 0.82), "rock");
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
      matrix.compose(new THREE.Vector3(point.x, 0.16, point.z), quaternion, scale);
      flowers.setMatrixAt(i, matrix);
    }
    group.add(flowers);
  }

  function randomPointInBiome(random, biomeId, padding = 7) {
    const biome = game.exploration.biomes.find(entry => entry.id === biomeId);
    if (!biome) {
      return randomExplorationPoint(random, 20, game.exploration.radius - 12);
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
      return { x, z };
    }
    return { x: biome.x, z: biome.z };
  }

  function addExplorationLake(group, x, z, rx, rz, random) {
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.055, 48), materials.water.clone());
    lake.position.set(x, 0.04, z);
    lake.scale.set(rx, 1, rz);
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

  function createFriendlyNpc(x, z, random, homeRadius = 5.5, name = "Villager", questId = null, biome = "meadow") {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(modelScale.npc);
    const cloth = materials.npcCloth.clone();
    if (biome === "desert") {
      cloth.color.setHex(0xb8894f);
    } else if (biome === "mountain") {
      cloth.color.setHex(0x596b77);
    } else if (biome === "city") {
      cloth.color.setHex(0x3f5370);
    } else if (biome === "swamp") {
      cloth.color.setHex(0x365f4a);
    }
    const hoodMat = biome === "desert" ? materials.adobe : biome === "mountain" ? materials.darkStone : biome === "city" ? materials.cityRoof : biome === "swamp" ? materials.reed : materials.paleWood;
    const body = makeCylinder(0.21, 0.26, 0.76, 12, cloth, 0, 0.76, 0);
    const head = makeSphere(0.17, materials.skin, 0, 1.28, 0);
    const hood = makeCone(0.23, 0.31, 12, hoodMat, 0, 1.49, 0);
    const leftLeg = makeBox(0.11, 0.4, 0.13, materials.darkLeather, -0.1, 0.21, 0);
    const rightLeg = makeBox(0.11, 0.4, 0.13, materials.darkLeather, 0.1, 0.21, 0);
    const leftArm = makeBox(0.09, 0.48, 0.09, materials.skin, -0.25, 0.82, 0);
    const rightArm = makeBox(0.09, 0.48, 0.09, materials.skin, 0.25, 0.82, 0);
    if (biome === "desert") {
      const scarf = makeCylinder(0.19, 0.22, 0.12, 12, materials.dryBrush, 0, 1.18, 0);
      group.add(scarf);
    } else if (biome === "city") {
      const collar = makeCylinder(0.2, 0.24, 0.1, 12, materials.gold, 0, 1.18, 0);
      group.add(collar);
    } else if (biome === "swamp") {
      const reedWrap = makeCylinder(0.19, 0.22, 0.1, 12, materials.reed, 0, 1.18, 0);
      const satchel = makeBox(0.18, 0.24, 0.08, materials.darkLeather, -0.25, 0.78, -0.2);
      group.add(reedWrap, satchel);
    }
    const questMarker = makeSphere(0.11, materials.fullPotionLiquid.clone(), 0, 2.02, 0);
    questMarker.visible = !!questId;
    group.add(body, head, hood, leftLeg, rightLeg, leftArm, rightArm, questMarker);
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
      home: new THREE.Vector3(x, 0, z),
      target: new THREE.Vector3(x, 0, z),
      homeRadius,
      walkTime: random() * 10,
      retarget: 0.5 + random() * 2,
      healCooldown: 0,
      biome,
      friendly: true
    };
  }

  function createQuest(id, title, giver, body, objective, reward, type, target, options = {}) {
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
      dialogue: options.dialogue && typeof options.dialogue === "object" ? options.dialogue : {},
      conversationTags: Array.isArray(options.conversationTags) ? options.conversationTags.slice(0, 8) : [type]
    };
  }

  function getQuest(id) {
    return game.quests.find(quest => quest.id === id) || null;
  }

  function createQuestItem(group, questId, x, z, random, options = {}) {
    const itemGroup = new THREE.Group();
    itemGroup.position.set(x, 0.12, z);
    const color = options.color || 0x9fffd1;
    const stem = makeCylinder(0.025, 0.035, 0.35, 8, options.stemMaterial || materials.broadleaf, 0, 0.18, 0);
    const bloomMaterial = materials.questGlow.clone();
    bloomMaterial.color.setHex(color);
    const bloom = makeSphere(options.radius || 0.12, bloomMaterial, 0, 0.42, 0);
    const ringMaterial = materials.questGlow.clone();
    ringMaterial.color.setHex(color);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 18), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    const light = new THREE.PointLight(color, 0.75, 3.6, 1.8);
    light.position.y = 0.35;
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
      respawnTimer: 0,
      visibleActive: false,
      position: new THREE.Vector3(game.exploration.origin.x + x, 0, game.exploration.origin.z + z),
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

  function createHorseModel() {
    const group = new THREE.Group();
    const body = makeBox(0.86, 0.62, 1.62, materials.horseCoat, 0, 1.02, 0);
    body.scale.set(1.05, 1, 1.08);
    const chest = makeBox(0.76, 0.64, 0.72, materials.horseCoat.clone(), 0, 1.08, -0.58);
    const neck = makeCylinder(0.16, 0.24, 0.78, 10, materials.horseCoat.clone(), 0, 1.38, -0.86);
    neck.rotation.x = -0.66;
    const head = makeBox(0.42, 0.36, 0.58, materials.horseCoat.clone(), 0, 1.58, -1.25);
    head.rotation.x = -0.12;
    const muzzle = makeBox(0.34, 0.22, 0.28, materials.paleWood, 0, 1.48, -1.55);
    const leftEar = makeCone(0.07, 0.22, 8, materials.horseCoat.clone(), -0.13, 1.82, -1.28);
    const rightEar = makeCone(0.07, 0.22, 8, materials.horseCoat.clone(), 0.13, 1.82, -1.28);
    const leftEye = makeSphere(0.032, materials.emberEye, -0.16, 1.63, -1.52);
    const rightEye = makeSphere(0.032, materials.emberEye.clone(), 0.16, 1.63, -1.52);
    const mane = makeBox(0.12, 0.46, 0.78, materials.horseMane, 0, 1.5, -0.78);
    mane.rotation.x = -0.36;
    const saddle = makeBox(0.74, 0.18, 0.74, materials.saddle, 0, 1.38, 0.02);
    const saddleTrim = makeBox(0.82, 0.055, 0.82, materials.gold, 0, 1.5, 0.02);
    const tail = makeCylinder(0.06, 0.1, 0.78, 8, materials.horseMane, 0, 0.92, 0.95);
    tail.rotation.x = 0.92;

    const legs = [];
    const legData = [
      [-0.28, 0.44, -0.52],
      [0.28, 0.44, -0.52],
      [-0.28, 0.44, 0.58],
      [0.28, 0.44, 0.58]
    ];
    for (const [x, y, z] of legData) {
      const leg = new THREE.Group();
      leg.position.set(x, y + 0.33, z);
      const upper = makeCylinder(0.07, 0.09, 0.72, 8, materials.horseCoat.clone(), 0, -0.36, 0);
      const hoof = makeBox(0.18, 0.11, 0.2, materials.darkLeather, 0, -0.72, -0.02);
      leg.add(upper, hoof);
      legs.push(leg);
      group.add(leg);
    }

    group.add(body, chest, neck, head, muzzle, leftEar, rightEar, leftEye, rightEye, mane, saddle, saddleTrim, tail);
    return { group, body, legs, tail };
  }

  function createHorse(x, z) {
    const model = createHorseModel();
    const horse = {
      ...model,
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      mounted: false,
      walkTime: Math.random() * 10,
      followDistance: 5.8,
      minFollowDistance: 3.6,
      mountDistance: 2.8
    };
    horse.group.position.copy(horse.position);
    scene.add(horse.group);
    return horse;
  }

  function spawnHorseNearPlayer(showEffects = true) {
    if (game.exploration.horse) {
      scene.remove(game.exploration.horse.group);
    }
    const side = rightFromYaw(player.yaw, tmpVec).multiplyScalar(-2.2);
    const position = tmpVec2.copy(player.position).add(side);
    game.exploration.horse = createHorse(position.x, position.z);
    progression.exploration.horseUnlocked = true;
    if (showEffects) {
      spawnImpact(position, 0xffd889, 24);
      saveProgress();
    }
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

  function updateHorseAnimation(horse, dt) {
    const speed = horse.velocity.length();
    horse.walkTime += dt * (1.4 + speed * 1.5);
    const moving = Math.min(1, speed / 7.5);
    const bob = Math.sin(horse.walkTime * 2.2) * 0.045 * moving;
    horse.group.position.set(horse.position.x, bob, horse.position.z);
    horse.group.rotation.y = horse.yaw;
    for (let i = 0; i < horse.legs.length; i += 1) {
      const phase = Math.sin(horse.walkTime * 5.2 + i * 0.85) * 0.34 * moving;
      horse.legs[i].rotation.x = phase;
    }
    horse.tail.rotation.z = Math.sin(clock.elapsedTime * 3.2) * 0.12;
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
    if (distance > 32) {
      horse.position.copy(player.position).addScaledVector(toPlayer, -horse.followDistance);
      horse.velocity.set(0, 0, 0);
    } else if (distance > horse.followDistance) {
      const desiredSpeed = distance > 11 ? 7.2 : 5.4;
      horse.velocity.x = lerp(horse.velocity.x, toPlayer.x * desiredSpeed, 1 - Math.pow(0.012, dt));
      horse.velocity.z = lerp(horse.velocity.z, toPlayer.z * desiredSpeed, 1 - Math.pow(0.012, dt));
      horse.yaw = yawFromDirection(toPlayer);
    } else if (distance < horse.minFollowDistance) {
      horse.velocity.x = lerp(horse.velocity.x, -toPlayer.x * 1.8, 1 - Math.pow(0.02, dt));
      horse.velocity.z = lerp(horse.velocity.z, -toPlayer.z * 1.8, 1 - Math.pow(0.02, dt));
      horse.yaw = yawFromDirection(toPlayer);
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

  function syncVillageQuestProgress({ silent = true } = {}) {
    reconcileQuestProgress(getQuest("villages"), { silent });
  }

  function questProgressText(quest) {
    return quest.objective + " " + Math.min(quest.progress, quest.target) + "/" + quest.target;
  }

  function updateQuestItems(dt) {
    for (const item of game.questItems) {
      if (item.collected) {
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
      item.group.position.y = 0.12 + Math.sin(clock.elapsedTime * 2.8 + item.bobSeed) * 0.06;
      item.bloom.scale.setScalar(0.9 + Math.sin(clock.elapsedTime * 5.5 + item.bobSeed) * 0.14);
      item.ring.rotation.z += dt * 1.5;
      item.light.intensity = 0.58 + Math.sin(clock.elapsedTime * 4.2 + item.bobSeed) * 0.18;
      if (distanceSq < 1.25 * 1.25) {
        item.collected = true;
        item.respawnTimer = 22 + (item.bobSeed % 7);
        item.visibleActive = false;
        item.group.visible = false;
        spawnImpact(item.position, item.color || 0x9fffd1, 12);
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
        if (npc.questMarker && npcOffersCrownringService(npc)) {
          npc.questMarker.visible = !arenaActivityActive();
          npc.questMarker.scale.setScalar(1.22);
          npc.questMarker.material.color.setHex(0xffd889);
        }
        continue;
      }
      const quest = getQuest(npc.questId);
      npc.questMarker.visible = !!quest && quest.state !== "done";
      if (quest) {
        npc.questMarker.scale.setScalar(quest.state === "ready" ? 1.45 : 1);
        npc.questMarker.material.color.setHex(quest.state === "ready" ? 0xffd889 : 0x9fffd1);
      }
    }
  }

  function updateTalkPrompt() {
    if (game.mode !== "exploration" || game.state !== "playing" || !questDialog.hidden) {
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
    keys.clear();
    player.blockHeld = false;
    refreshQuestDialog();
    questDialog.hidden = false;
    actionDock.hidden = true;
    talkPrompt.hidden = true;
  }

  function closeQuestDialog() {
    questDialog.hidden = true;
    actionDock.hidden = false;
    game.dialogNpc = null;
    updateDialogSelection(0);
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
    updateDialogSelection(game.dialogActionIndex + direction);
  }

  function activateSelectedDialogAction() {
    const button = dialogActionButtons()[game.dialogActionIndex];
    if (button === questAcceptButton) {
      acceptCurrentQuest();
    } else if (button === questClaimButton) {
      claimCurrentQuest();
    } else if (button === questServiceButton) {
      startCrownringArenaActivity();
    } else {
      closeQuestDialog();
    }
  }

  function handleQuestDialogKey(event) {
    if (questDialog.hidden) {
      return false;
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

  function questStatusLine(quest) {
    if (quest.state === "available") {
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

  function refreshQuestDialog() {
    const npc = game.dialogNpc;
    if (!npc) {
      return;
    }
    const quest = npc.questId ? getQuest(npc.questId) : null;
    questDialogTitle.textContent = npc.name;
    questAcceptButton.hidden = true;
    questClaimButton.hidden = true;
    questServiceButton.hidden = !npcOffersCrownringService(npc) || arenaActivityActive();

    if (!quest) {
      if (npcOffersCrownringService(npc)) {
        questDialogBody.textContent = "The Crownring is open to any sworn traveler. Step through the steward's gate, fight as many waves as you dare, then yield before pride empties your flask.";
        questDialogStatus.textContent = arenaActivityActive() ? "The Crownring is already active." : "Press Enter on the service button to enter the Crownring.";
        questServiceButton.hidden = arenaActivityActive();
        questServiceButton.textContent = "Enter Crownring";
      } else if (npc.biome === "desert") {
        questDialogBody.textContent = "The dunes shift by the hour. Walk near the cactus shade and listen for legs under the sand.";
      } else if (npc.biome === "mountain") {
        questDialogBody.textContent = "Smoke over the ridges means dragons are awake. Keep low when the wind goes warm.";
      } else if (npc.biome === "city") {
        questDialogBody.textContent = "Keep to the paved streets near the ring. The castle bells make it easy to find your way back.";
      } else if (npc.biome === "swamp") {
        questDialogBody.textContent = "Mistfen paths are safest on the planks. If a pale light drifts against the wind, keep your weapon ready.";
      } else {
        questDialogBody.textContent = "The road is long today. Keep an eye on the tree line and come back if you need a friendly face.";
      }
      questDialogStatus.textContent = "Nearby villagers can mend small wounds when you stand close.";
      updateDialogSelection(0);
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
    if (npcOffersCrownringService(npc) && !arenaActivityActive()) {
      questServiceButton.hidden = false;
      questServiceButton.textContent = "Enter Crownring";
    }
    updateDialogSelection(0);
  }

  function acceptCurrentQuest() {
    const npc = game.dialogNpc;
    const quest = npc && npc.questId ? getQuest(npc.questId) : null;
    if (!quest || quest.state !== "available") {
      return;
    }
    quest.state = "active";
    reconcileQuestProgress(quest, { silent: true });
    showBanner(quest.state === "ready" ? quest.title + " complete" : "Quest started");
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
    } else if (quest.id === "bogRelics") {
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
      game.potions.push(createHealthPotion(player.position.x - 1.4, player.position.z - 1.2, { kind: "full" }));
      trimPotionDrops();
    } else if (quest.id === "horse") {
      spawnHorseNearPlayer();
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
    }
    awardExplorationXp(quest.rewardXp);
    spawnImpact(player.position, 0xffd889, 24);
    showBanner(unlocks.length ? "Unlocked " + unlocks.join(" and ") : "Reward claimed");
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
      bogRelics: { hex: "#b9ffd5", fill: "rgba(185, 255, 213, 0.17)", stroke: "rgba(185, 255, 213, 0.78)" },
      cityWrits: { hex: "#f7df9a", fill: "rgba(247, 223, 154, 0.16)", stroke: "rgba(247, 223, 154, 0.76)" },
      citySanctuary: { hex: "#7ae8ff", fill: "rgba(122, 232, 255, 0.17)", stroke: "rgba(122, 232, 255, 0.78)" }
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
      bogRelics: "Mistfen pools",
      cityWrits: "Crownford beacon",
      citySanctuary: "church district"
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
        .filter(enemy => !enemy.dead && enemy.type === "barbarian")
        .map(enemy => enemy.position);
      const area = aggregateQuestArea(positions, 40, 58, 150);
      return area ? [{ ...area, color }] : [{ x: game.exploration.origin.x, z: game.exploration.origin.z, radius: 130, color }];
    }
    if (quest.id === "villages") {
      return game.exploration.villages
        .filter(village => !game.exploration.discovered.has(village.id))
        .map(village => ({ x: village.x, z: village.z, radius: village.radius + 24, color }));
    }
    if (quest.id === "spiders" || quest.id === "dragons" || quest.id === "wisps") {
      const biomeId = quest.id === "spiders" ? "desert" : quest.id === "dragons" ? "mountain" : "swamp";
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

  function updateQuestMap() {
    const visibleQuests = game.quests.filter(quest => quest.state === "active" || quest.state === "ready");
    const visible = game.mode === "exploration" && visibleQuests.length > 0;
    questMap.hidden = !visible;
    if (!visible) {
      return;
    }
    const ctx = questMapCtx;
    const size = questMap.width;
    const center = size / 2;
    const mapRadius = size * 0.43;
    const scale = mapRadius / game.exploration.radius;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, mapRadius + 8, 0, TAU);
    ctx.clip();
    ctx.fillStyle = "rgba(6, 12, 13, 0.82)";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, mapRadius, 0, TAU);
    ctx.stroke();
    for (const quest of visibleQuests) {
      for (const area of questMapAreas(quest)) {
        drawQuestMapArea(ctx, area, size, center, scale);
      }
    }
    const playerPoint = projectQuestMapPoint(player.position.x, player.position.z, size, center, scale);
    ctx.fillStyle = "#f4efe4";
    ctx.strokeStyle = "rgba(5, 9, 10, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(playerPoint.x, playerPoint.y, 4.2, 0, TAU);
    ctx.stroke();
    ctx.fill();
    ctx.strokeStyle = "#f4efe4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playerPoint.x, playerPoint.y);
    ctx.lineTo(playerPoint.x - Math.sin(player.yaw) * 10, playerPoint.y - Math.cos(player.yaw) * 10);
    ctx.stroke();
    ctx.restore();
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
        "Class travel kit, guard and magica boons plus XP",
        "hunt",
        8
      ),
      createQuest(
        "villages",
        "Map the Hearths",
        "Sella",
        "There are more settlements beyond the old hills. Find them, mark the routes, and the whole valley gets smaller.",
        "Discover villages",
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
        "cityWrits",
        "The Beacon Writs",
        "Marshal Rowan Vale",
        "Crownford's Wayfinder Beacon keeps the old roads honest. Read the four carved waystones and I will mark you as a sworn guide of the high city.",
        "Inspect beacon waystones",
        "Crownford Drill perk, cheaper bash/burst, boons plus XP",
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
      )
    );
  }

  function addExplorationVillage(group, x, z, random, index, biome = "meadow") {
    const village = {
      id: "village-" + index,
      x: game.exploration.origin.x + x,
      z: game.exploration.origin.z + z,
      localX: x,
      localZ: z,
      radius: biome === "desert" ? 17.5 : biome === "swamp" ? 18.5 : 15.5,
      biome
    };
    game.exploration.villages.push(village);
    const houses = [];
    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * TAU + random() * 0.45;
      const hx = x + Math.cos(angle) * (5.0 + random() * 4.0);
      const hz = z + Math.sin(angle) * (5.0 + random() * 4.0);
      const houseScale = 0.94 + random() * 0.18;
      const house = addExplorationHouse(group, hx, hz, houseScale, i, biome);
      house.rotation.y += angle + Math.PI;
      houses.push({ x: hx, z: hz, rotation: house.rotation.y, scale: houseScale });
    }
    const wellMaterial = biome === "desert" ? materials.adobe : biome === "mountain" ? materials.darkStone : biome === "swamp" ? materials.swampPlank : materials.stone;
    const well = makeCylinder(0.62, 0.72, 0.62, 16, wellMaterial, x, 0.31, z);
    const beam = makeBox(1.8, 0.16, 0.18, biome === "mountain" ? materials.darkStone : biome === "swamp" ? materials.swampPlank : materials.wood, x, 1.1, z);
    const postA = makeBox(0.16, 1.2, 0.16, materials.wood, x - 0.72, 0.75, z);
    const postB = makeBox(0.16, 1.2, 0.16, materials.wood, x + 0.72, 0.75, z);
    group.add(well, beam, postA, postB);
    addExplorationCollider(x, z, 1.15, "structure");
    const names = biome === "desert"
      ? ["Amara", "Sahir", "Nima", "Tarek", "Zala", "Omid"]
      : biome === "mountain"
        ? ["Kael", "Brunna", "Sten", "Yrsa", "Hald", "Runa"]
        : biome === "swamp"
          ? ["Mirel", "Noll", "Vessa", "Orrin", "Sable", "Fen"]
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
      }
      const name = questId === "spiders" ? "Amara" : questId === "dragons" ? "Kael" : questId === "wisps" ? "Mirel" : questId === "bogRelics" ? "Noll" : names[(index * 3 + i) % names.length];
      game.npcs.push(createFriendlyNpc(
        game.exploration.origin.x + x + Math.cos(angle) * (2.5 + random() * 5),
        game.exploration.origin.z + z + Math.sin(angle) * (2.5 + random() * 5),
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
    const paving = makeBox(width, 0.055, depth, materials.darkStone, x, 0.032, z);
    paving.rotation.y = rotation;
    paving.receiveShadow = true;
    group.add(paving);
    return paving;
  }

  function addCityHouse(group, x, z, scale, variant, rotation = 0) {
    const house = new THREE.Group();
    house.position.set(x, 0, z);
    house.rotation.y = rotation;
    house.scale.setScalar(scale);
    const wall = variant % 2 ? materials.cityWall : materials.stone;
    const floor = makeBox(4.6, 0.12, 4.0, materials.darkStone, 0, 0.06, 0);
    const back = makeBox(4.6, 2.6, 0.24, wall, 0, 1.35, 1.88);
    const left = makeBox(0.24, 2.6, 4.0, wall, -2.18, 1.35, 0);
    const right = makeBox(0.24, 2.6, 4.0, wall, 2.18, 1.35, 0);
    const frontLeft = makeBox(1.48, 2.6, 0.24, wall, -1.56, 1.35, -1.88);
    const frontRight = makeBox(1.48, 2.6, 0.24, wall, 1.56, 1.35, -1.88);
    const door = makeBox(0.82, 1.36, 0.08, materials.wood, 0, 0.74, -2.04);
    const roofA = makeBox(5.45, 0.34, 2.64, materials.cityRoof, 0, 3.02, -0.8);
    const roofB = makeBox(5.45, 0.34, 2.64, materials.cityRoof, 0, 3.02, 0.8);
    roofA.rotation.x = -0.52;
    roofB.rotation.x = 0.52;
    const sign = makeBox(1.0, 0.32, 0.08, variant % 2 ? materials.gold : materials.blue, 0, 1.55, -2.07);
    const windowA = makeBox(0.54, 0.42, 0.06, materials.stainedGlass.clone(), -1.28, 1.58, -2.06);
    const windowB = makeBox(0.54, 0.42, 0.06, materials.stainedGlass.clone(), 1.28, 1.58, -2.06);
    house.add(floor, back, left, right, frontLeft, frontRight, door, roofA, roofB, sign, windowA, windowB);
    group.add(house);
    addExplorationCollider(x, z, scale * 3.05, "structure");
    return house;
  }

  function addCityCastle(group, x, z) {
    const castle = new THREE.Group();
    castle.position.set(x, 0, z);
    const base = makeBox(14, 0.18, 10.5, materials.darkStone, 0, 0.09, 0);
    const keep = makeBox(7.2, 6.75, 6.2, materials.cityWall, 0, 3.48, 0.6);
    const gate = makeBox(1.55, 2.3, 0.12, materials.wood, 0, 1.18, -2.58);
    const lintel = makeBox(2.1, 0.3, 0.18, materials.darkStone, 0, 2.42, -2.62);
    castle.add(base, keep, gate, lintel);
    const towerPositions = [
      [-4.6, -3.4],
      [4.6, -3.4],
      [-4.6, 4.4],
      [4.6, 4.4]
    ];
    for (const [tx, tz] of towerPositions) {
      const tower = makeCylinder(0.92, 1.08, 7.25, 18, materials.cityWall, tx, 3.62, tz);
      const cap = makeCone(1.28, 1.7, 18, materials.cityRoof, tx, 8.1, tz);
      castle.add(tower, cap);
    }
    for (let i = 0; i < 5; i += 1) {
      castle.add(makeBox(0.62, 0.54, 0.48, materials.darkStone, -2.7 + i * 1.35, 7.15, -2.55));
    }
    const banner = makeBox(0.1, 1.45, 0.86, materials.blue, -3.7, 4.6, -2.72);
    castle.add(banner);
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
    church.position.set(x, 0, z);
    const nave = makeBox(7.2, 3.25, 11.2, materials.cityWall, 0, 1.72, 0);
    const apse = makeCylinder(1.8, 2.0, 3.3, 18, materials.cityWall, 0, 1.7, 6.1);
    apse.rotation.x = Math.PI / 2;
    const roofA = makeBox(7.9, 0.44, 6.8, materials.cityRoof, 0, 3.72, -1.7);
    const roofB = makeBox(7.9, 0.44, 6.8, materials.cityRoof, 0, 3.72, 1.7);
    roofA.rotation.x = -0.62;
    roofB.rotation.x = 0.62;
    const tower = makeBox(3.0, 6.5, 3.0, materials.cityWall, 0, 3.28, -5.55);
    const spire = makeCone(1.82, 3.95, 24, materials.cityRoof, 0, 8.38, -5.55);
    const door = makeBox(1.0, 1.7, 0.08, materials.wood, 0, 0.9, -7.1);
    const glass = makeBox(0.74, 1.2, 0.08, materials.stainedGlass.clone(), 0, 3.72, -7.12);
    const crossV = makeBox(0.16, 1.22, 0.14, materials.gold, 0, 10.26, -5.55);
    const crossH = makeBox(0.82, 0.14, 0.14, materials.gold, 0, 10.42, -5.55);
    church.add(nave, apse, roofA, roofB, tower, spire, door, glass, crossV, crossH);
    group.add(church);
    addExplorationCollider(x, z, 4.9, "structure");
    addExplorationCollider(x, z - 5.55, 2.15, "structure");
    return church;
  }

  function addWayfinderBeacon(group, x, z, random) {
    const plaza = makeBox(24, 0.075, 24, materials.darkStone, x, 0.04, z);
    const crossA = makeBox(34, 0.06, 5.2, materials.cityWall, x, 0.08, z);
    const crossB = makeBox(5.2, 0.06, 34, materials.cityWall, x, 0.085, z);
    group.add(plaza, crossA, crossB);

    const dais = makeCylinder(4.8, 5.6, 0.62, 8, materials.cityWall, x, 0.34, z);
    dais.rotation.y = Math.PI / 8;
    const upper = makeCylinder(2.25, 2.85, 0.45, 8, materials.darkStone, x, 0.88, z);
    upper.rotation.y = Math.PI / 8;
    const shaft = makeCylinder(0.34, 0.68, 5.7, 6, materials.stone, x, 3.85, z);
    shaft.rotation.y = Math.PI / 6;
    const cap = makeCone(0.76, 1.35, 6, materials.cityRoof, x, 7.42, z);
    cap.rotation.y = Math.PI / 6;
    const glowMaterial = materials.questGlow.clone();
    glowMaterial.opacity = 0.68;
    const beacon = makeSphere(0.48, glowMaterial, x, 6.95, z);
    const light = new THREE.PointLight(0x9fffd1, 1.45, 18, 1.8);
    light.position.set(x, 6.95, z);
    group.add(dais, upper, shaft, cap, beacon, light);
    addExplorationCollider(x, z, 5.25, "structure");

    const waystoneOffsets = [
      [0, -9.3, 0],
      [9.3, 0, Math.PI / 2],
      [0, 9.3, Math.PI],
      [-9.3, 0, -Math.PI / 2]
    ];
    for (const [dx, dz, rotation] of waystoneOffsets) {
      const stone = makeCylinder(0.28, 0.46, 2.25, 5, materials.cityWall, x + dx, 1.18, z + dz);
      stone.rotation.y = rotation + Math.PI / 5;
      const rune = makeBox(0.09, 0.82, 0.055, materials.stainedGlass.clone(), 0, 0.25, -0.35);
      rune.material.opacity = 0.86;
      stone.add(rune);
      const foot = makeCylinder(0.74, 0.86, 0.25, 5, materials.darkStone, x + dx, 0.16, z + dz);
      foot.rotation.y = rotation;
      group.add(stone, foot);
      addExplorationCollider(x + dx, z + dz, 0.92, "structure");
    }

    const mapTable = makeBox(5.2, 0.24, 2.35, materials.paleWood, x, 1.08, z - 5.9);
    const mapTop = makeBox(4.7, 0.035, 1.8, materials.stainedGlass.clone(), x, 1.23, z - 5.9);
    mapTop.material.opacity = 0.5;
    const tableLegs = [
      [-2.15, -0.82],
      [2.15, -0.82],
      [-2.15, 0.82],
      [2.15, 0.82]
    ].map(([lx, lz]) => makeBox(0.18, 1.0, 0.18, materials.wood, x + lx, 0.57, z - 5.9 + lz));
    group.add(mapTable, mapTop, ...tableLegs);
    addExplorationCollider(x, z - 5.9, 2.8, "structure");

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
        radius: 0.105
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
      const wall = makeBox(ww, 2.45, wd, materials.cityWall, x + wx, 1.23, z + wz);
      group.add(wall);
      addExplorationLineColliders(x + wx, z + wz, ww, wd, "structure");
    }
    for (let i = 0; i < 4; i += 1) {
      const sx = i % 2 ? 37 : -37;
      const sz = i > 1 ? 37 : -37;
      const tower = makeCylinder(1.05, 1.2, 3.75, 16, materials.cityWall, x + sx, 1.88, z + sz);
      const roof = makeCone(1.48, 1.55, 16, materials.cityRoof, x + sx, 4.52, z + sz);
      group.add(tower, roof);
      addExplorationCollider(x + sx, z + sz, 1.55, "structure");
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
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x + x - 23, game.exploration.origin.z + z + 8, random, 9.5, "Mason Vale", null, "city"));
  }

  function addCrownringCity(group, x, z, random) {
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
      const wall = makeBox(ww, 2.12, wd, materials.cityWall, x + wx, 1.06, z + wz);
      group.add(wall);
      addExplorationLineColliders(x + wx, z + wz, ww, wd, "structure");
    }
    for (const [tx, tz] of [[-29, -24], [29, -24], [-29, 24], [29, 24]]) {
      const tower = makeCylinder(0.85, 1.0, 3.4, 14, materials.cityWall, x + tx, 1.7, z + tz);
      const cap = makeCone(1.15, 1.25, 14, materials.cityRoof, x + tx, 3.98, z + tz);
      group.add(tower, cap);
      addExplorationCollider(x + tx, z + tz, 1.28, "structure");
    }

    const court = makeCylinder(8.6, 8.9, 0.14, 32, materials.darkStone, x, 0.11, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(7.35, 0.24, 8, 56), materials.cityWall);
    ring.position.set(x, 0.32, z);
    ring.rotation.x = Math.PI / 2;
    addShadow(ring);
    const sand = makeCylinder(6.85, 6.95, 0.055, 32, materials.sand, x, 0.2, z);
    group.add(court, ring, sand);
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * TAU;
      const px = x + Math.cos(angle) * 9.8;
      const pz = z + Math.sin(angle) * 9.8;
      const post = makeCylinder(0.07, 0.1, 1.15, 7, materials.wood, px, 0.68, pz);
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
      const bench = makeBox(sw, 0.74, sd, materials.wood, x + sx, 0.54, z + sz);
      const base = makeBox(sw + 0.6, 0.22, sd + 0.5, materials.darkStone, x + sx, 0.18, z + sz);
      group.add(base, bench);
      addExplorationLineColliders(x + sx, z + sz, sw, sd, "structure");
    }

    addCityHouse(group, x - 19, z + 12, 0.82, 8, -Math.PI / 2);
    addCityHouse(group, x + 20, z + 12, 0.86, 9, Math.PI / 2);
    addStable(group, x - 20, z - 11);
    addBannerPole(group, x - 24, z - 20, 0.16, 0.92);
    addBannerPole(group, x + 24, z - 20, -0.16, 0.92);
    addLanternPost(group, x - 10, z - 18, 0.2, 0.82);
    addLanternPost(group, x + 10, z - 18, -0.2, 0.82);
    addCart(group, x + 21, z - 8, -0.35, 0.86);
    addCrateStack(group, x + 23, z - 4, 0.2, 0.78);
    addBarrel(group, x - 22, z - 4, -0.2, 0.82);
    addBucket(group, x - 17, z + 7, 0.4, 0.82);

    const steward = createFriendlyNpc(game.exploration.origin.x + x - 3.4, game.exploration.origin.z + z - 11.6, random, 8.5, "Steward Bryn", null, "city");
    steward.serviceType = "crownring";
    steward.questMarker.visible = true;
    steward.questMarker.material.color.setHex(0xffd889);
    game.npcs.push(steward);
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x + x - 19, game.exploration.origin.z + z + 8.5, random, 7.5, "Physicker Maud", null, "city"));
    game.npcs.push(createFriendlyNpc(game.exploration.origin.x + x + 18.5, game.exploration.origin.z + z + 8.0, random, 7.5, "Quartermaster Pell", null, "city"));
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
    for (const collider of game.exploration.colliders) {
      const spacing = collider.kind === "tree" ? 1.15 : collider.kind === "rock" ? 1.25 : collider.kind === "decor" ? 0.85 : 2.1;
      if (Math.hypot(worldX - collider.x, worldZ - collider.z) < collider.radius + spacing) {
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
    game.exploration.biomes.push(mountain, desert, swamp);
    addBiomePatch(group, desert, seed);
    addBiomePatch(group, mountain, seed);
    addBiomePatch(group, swamp, seed);
  }

  function seedExplorationEnemy(enemy, world, random, awareness, homeRadius = 9) {
    enemy.exploration = true;
    enemy.home = world.clone();
    enemy.homeRadius = homeRadius;
    enemy.awareness = awareness;
    enemy.patrolTarget = world.clone();
    enemy.state = "patrol";
    enemy.cooldown = 0.8 + random() * 1.8;
    game.enemies.push(enemy);
    return enemy;
  }

  function addMountainRoost(group, biome, random) {
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU + random() * 0.35;
      const radius = 16 + random() * 34;
      const x = biome.x + Math.cos(angle) * radius;
      const z = biome.z + Math.sin(angle) * radius;
      const spire = makeCone(1.4 + random() * 1.6, 4.8 + random() * 5.8, 7, materials.darkStone, x, 2.4 + random() * 1.8, z);
      spire.rotation.y = random() * TAU;
      spire.scale.x *= 0.7 + random() * 0.45;
      group.add(spire);
      addExplorationCollider(x, z, 1.15, "rock");
    }
    const nest = new THREE.Group();
    nest.position.set(biome.x + 8, 0.24, biome.z - 6);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.16, 8, 32), materials.darkStone);
    ring.rotation.x = Math.PI / 2;
    const ember = makeSphere(0.22, materials.fireCore.clone(), 0, 0.34, 0);
    ember.material.opacity = 0.7;
    nest.add(ring, ember);
    group.add(nest);
    addExplorationCollider(biome.x + 8, biome.z - 6, 4.2, "structure");
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
    oasis.position.set(biome.x - 22, 0.045, biome.z + 18);
    oasis.scale.set(6.5, 1, 3.4);
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
    const boardwalk = makeBox(19, 0.12, 1.15, materials.swampPlank, biome.x - 4, 0.18, biome.z + 3);
    boardwalk.rotation.y = -0.34;
    group.add(boardwalk);
    for (let i = 0; i < 7; i += 1) {
      const offset = -8.4 + i * 2.8;
      const postA = makeCylinder(0.055, 0.08, 0.86, 6, materials.wood, biome.x - 4 + Math.cos(boardwalk.rotation.y) * offset - Math.sin(boardwalk.rotation.y) * 0.62, 0.43, biome.z + 3 + Math.sin(boardwalk.rotation.y) * offset + Math.cos(boardwalk.rotation.y) * 0.62);
      const postB = makeCylinder(0.055, 0.08, 0.86, 6, materials.wood, biome.x - 4 + Math.cos(boardwalk.rotation.y) * offset + Math.sin(boardwalk.rotation.y) * 0.62, 0.43, biome.z + 3 + Math.sin(boardwalk.rotation.y) * offset - Math.cos(boardwalk.rotation.y) * 0.62);
      group.add(postA, postB);
    }
    for (let i = 0; i < 5; i += 1) {
      const point = randomPointInBiome(random, "swamp", 10);
      addBogPool(group, point.x, point.z, 2.8 + random() * 3.0, 1.8 + random() * 2.0, random);
    }
    const shrine = new THREE.Group();
    shrine.position.set(biome.x + 9, 0, biome.z - 10);
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

    const groundMaterial = materials.meadow.clone();
    groundMaterial.map = createExplorationTexture(seed);
    const groundGeometry = new THREE.PlaneGeometry(760, 760, 112, 112);
    const pos = groundGeometry.attributes.position;
    const edgeRise = game.exploration.radius * 0.78;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const distance = Math.hypot(x, y);
      const roll = Math.sin(x * 0.13 + hashString(seed) * 0.0001) * 0.08 + Math.cos(y * 0.11) * 0.07;
      pos.setZ(i, distance > edgeRise ? roll + (distance - edgeRise) * 0.012 : roll);
    }
    groundGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);

    setupExplorationBiomes(group, random, seed);
    const mountainBiome = game.exploration.biomes.find(biome => biome.id === "mountain");
    const desertBiome = game.exploration.biomes.find(biome => biome.id === "desert");
    const swampBiome = game.exploration.biomes.find(biome => biome.id === "swamp");

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
    addCrownfordCity(group, 12 + random() * 5, 132 + random() * 6, random);
    addCrownringCity(group, 158 + random() * 7, 48 + random() * 6, random);
    syncVillageQuestProgress({ silent: true });
    addSwampQuestItems(group, swampBiome, random);

    for (let i = 0; i < 64; i += 1) {
      const angle = (i / 64) * TAU + (random() - 0.5) * 0.16;
      const radius = game.exploration.radius - 26 + random() * 44;
      const mountain = makeCone(4.2 + random() * 5.6, 7.5 + random() * 10, 7 + Math.floor(random() * 3), materials.darkStone, Math.cos(angle) * radius, 3.8 + random() * 3.6, Math.sin(angle) * radius);
      mountain.rotation.y = random() * TAU;
      mountain.scale.x *= 0.82 + random() * 0.6;
      mountain.castShadow = false;
      group.add(mountain);
      addExplorationCollider(Math.cos(angle) * radius, Math.sin(angle) * radius, 4.2, "rock");
      if (i % 2 === 0) {
        addExplorationRock(group, Math.cos(angle) * (radius - 6), Math.sin(angle) * (radius - 6), random, true);
      }
    }
    addMountainRoost(group, mountainBiome, random);
    addDesertMarkers(group, desertBiome, random);
    addSwampMarkers(group, swampBiome, random);
    addExplorationRoadNetwork(group);

    for (let i = 0; i < 240; i += 1) {
      const point = randomExplorationPoint(random, 16, game.exploration.radius - 28, (x, z) => biomeAt(x, z) === "meadow");
      addExplorationTree(group, point.x, point.z, random);
    }
    for (let i = 0; i < 132; i += 1) {
      const point = randomPointInBiome(random, "mountain", 5);
      if (random() > 0.42) {
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
    for (let i = 0; i < 116; i += 1) {
      const point = randomPointInBiome(random, "swamp", 6);
      if (random() > 0.62) {
        addSwampWillow(group, point.x, point.z, random);
      } else if (random() > 0.22) {
        addReeds(group, point.x, point.z, random);
      } else {
        addBogPool(group, point.x, point.z, 1.3 + random() * 1.6, 0.8 + random() * 1.1, random);
      }
    }
    for (let i = 0; i < 152; i += 1) {
      const point = randomExplorationPoint(random, 13, game.exploration.radius - 24, (x, z) => {
        const biome = biomeAt(x, z);
        return biome !== "desert" && biome !== "swamp";
      });
      addExplorationRock(group, point.x, point.z, random, random() > 0.82);
    }
    addExplorationFlowers(group, random, 160);

    for (let i = 0; i < 34; i += 1) {
      const point = randomExplorationPoint(random, 35, game.exploration.radius - 32, (x, z) => biomeAt(x, z) === "meadow");
      const world = explorationToWorld(point.x, point.z);
      const mob = createBarbarian(world.x, world.z, 1 + Math.floor(random() * 3));
      mob.health *= 0.82;
      mob.maxHealth = mob.health;
      seedExplorationEnemy(mob, world, random, 11 + random() * 7, 9.5);
    }
    for (let i = 0; i < 13; i += 1) {
      const point = randomPointInBiome(random, "desert", 13);
      const world = explorationToWorld(point.x, point.z);
      const spider = createSpider(world.x, world.z, 1 + Math.floor(random() * 2));
      seedExplorationEnemy(spider, world, random, 10 + random() * 5, 7.5);
    }
    for (let i = 0; i < 5; i += 1) {
      const point = randomPointInBiome(random, "mountain", 16);
      const world = explorationToWorld(point.x, point.z);
      const dragon = createDragon(world.x, world.z, 1 + Math.floor(random() * 2));
      dragon.health *= 0.72;
      dragon.maxHealth = dragon.health;
      dragon.hoverHeight = 2.75 + random() * 0.45;
      dragon.desiredRange = 9.2 + random() * 2.0;
      seedExplorationEnemy(dragon, world, random, 18 + random() * 7, 18);
    }
    for (let i = 0; i < 11; i += 1) {
      const point = randomPointInBiome(random, "swamp", 12);
      const world = explorationToWorld(point.x, point.z);
      const wisp = createWisp(world.x, world.z, 1 + Math.floor(random() * 2));
      seedExplorationEnemy(wisp, world, random, 12 + random() * 5, 9.5);
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

  function setArenaVisible(visible) {
    if (game.arenaGroup) {
      game.arenaGroup.visible = visible;
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
    const plume = makeBox(0.12, 0.56, 0.1, materials.cloth, 0, 2.67, 0.08);
    plume.rotation.x = 0.32;
    const leftLeg = makeBox(0.22, 0.78, 0.24, materials.iron, -0.22, 0.34, 0);
    const rightLeg = makeBox(0.22, 0.78, 0.24, materials.iron, 0.22, 0.34, 0);
    const leftKnee = makeSphere(0.13, materials.steel, -0.22, 0.55, -0.11);
    leftKnee.scale.set(1, 0.62, 0.72);
    const rightKnee = makeSphere(0.13, materials.steel, 0.22, 0.55, -0.11);
    rightKnee.scale.set(1, 0.62, 0.72);
    const leftBoot = makeBox(0.29, 0.2, 0.35, materials.darkLeather, -0.22, -0.03, -0.05);
    const rightBoot = makeBox(0.29, 0.2, 0.35, materials.darkLeather, 0.22, -0.03, -0.05);
    const leftArm = makeBox(0.2, 0.78, 0.22, materials.iron, -0.58, 1.34, 0);
    const rightArm = makeBox(0.2, 0.78, 0.22, materials.iron, 0.58, 1.34, 0);
    const leftPauldron = makeCylinder(0.18, 0.28, 0.2, 14, materials.steel, -0.58, 1.76, 0);
    const rightPauldron = makeCylinder(0.18, 0.28, 0.2, 14, materials.steel, 0.58, 1.76, 0);
    leftPauldron.rotation.z = Math.PI / 2;
    rightPauldron.rotation.z = Math.PI / 2;
    const leftGauntlet = makeCylinder(0.12, 0.13, 0.2, 10, materials.steel, -0.58, 1.0, -0.02);
    const rightGauntlet = makeCylinder(0.12, 0.13, 0.2, 10, materials.steel, 0.58, 1.0, -0.02);
    leftGauntlet.rotation.z = Math.PI / 2;
    rightGauntlet.rotation.z = Math.PI / 2;

    const swordPivot = new THREE.Group();
    swordPivot.position.set(0.7, 1.27, -0.05);
    const grip = makeCylinder(0.055, 0.055, 0.45, 8, materials.wood, 0, 0, -0.1);
    grip.rotation.x = Math.PI / 2;
    const blade = makeBox(0.09, 0.09, 1.55, materials.steel, 0, 0, -0.88);
    const bladeFuller = makeBox(0.025, 0.015, 1.04, materials.iron, 0, 0.052, -0.86);
    const bladeTip = makeCylinder(0.0, 0.075, 0.24, 4, materials.steel, 0, 0, -1.78);
    bladeTip.rotation.x = Math.PI / 2;
    bladeTip.rotation.z = Math.PI / 4;
    const guard = makeBox(0.46, 0.08, 0.08, materials.gold, 0, 0, -0.26);
    const pommel = makeSphere(0.09, materials.gold, 0, 0, 0.17);
    swordPivot.add(grip, blade, bladeFuller, bladeTip, guard, pommel);
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
      head, visor, visorSlit, helmet, helmetBand, crownRidge, plume,
      leftLeg, rightLeg, leftKnee, rightKnee, leftBoot, rightBoot,
      leftArm, rightArm, leftPauldron, rightPauldron, leftGauntlet, rightGauntlet,
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
    player.swordBlade = blade;
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
    const frontTrim = makeBox(0.12, 1.28, 0.05, materials.wizardTrim.clone(), 0, 0.98, -0.62);
    const shoulderWrap = makeBox(1.16, 0.18, 0.5, materials.wizardTrim.clone(), 0, 1.75, -0.03);
    const cape = makeBox(0.92, 1.24, 0.06, materials.royalBlue, 0, 1.12, 0.49);
    cape.rotation.x = -0.12;

    const head = makeSphere(0.26, materials.skin, 0, 2.02, 0);
    const beard = makeBox(0.32, 0.36, 0.08, materials.bone, 0, 1.84, -0.23);
    const leftEye = makeSphere(0.032, materials.lightningCore.clone(), -0.08, 2.06, -0.24);
    const rightEye = makeSphere(0.032, materials.lightningCore.clone(), 0.08, 2.06, -0.24);
    const hatBrim = makeCylinder(0.43, 0.43, 0.08, 24, materials.wizardHat.clone(), 0, 2.23, 0);
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.82, 24), materials.wizardHat.clone());
    hatCone.position.set(0.02, 2.67, 0.02);
    hatCone.rotation.z = -0.1;
    addShadow(hatCone);
    const hatBand = makeCylinder(0.27, 0.3, 0.08, 18, materials.gold, 0, 2.35, 0);

    const leftLeg = makeBox(0.22, 0.58, 0.22, materials.darkLeather, -0.22, 0.2, 0);
    const rightLeg = makeBox(0.22, 0.58, 0.22, materials.darkLeather, 0.22, 0.2, 0);
    const leftBoot = makeBox(0.29, 0.18, 0.34, materials.darkLeather, -0.22, -0.04, -0.05);
    const rightBoot = makeBox(0.29, 0.18, 0.34, materials.darkLeather, 0.22, -0.04, -0.05);
    const leftArm = makeBox(0.2, 0.72, 0.22, materials.wizardRobe.clone(), -0.58, 1.33, 0);
    const rightArm = makeBox(0.2, 0.72, 0.22, materials.wizardRobe.clone(), 0.58, 1.33, 0);
    const leftHand = makeSphere(0.105, materials.skin, -0.58, 0.94, -0.03);
    const rightHand = makeSphere(0.105, materials.skin, 0.58, 0.94, -0.03);
    const leftCuff = makeCylinder(0.13, 0.14, 0.16, 12, materials.wizardTrim.clone(), -0.58, 1.02, -0.02);
    const rightCuff = makeCylinder(0.13, 0.14, 0.16, 12, materials.wizardTrim.clone(), 0.58, 1.02, -0.02);
    leftCuff.rotation.z = Math.PI / 2;
    rightCuff.rotation.z = Math.PI / 2;

    const staffPivot = new THREE.Group();
    staffPivot.position.set(0.64, 1.02, -0.08);
    const staffShaft = makeCylinder(0.045, 0.055, 1.86, 10, materials.wood, 0, 0.24, 0);
    const staffCap = makeCylinder(0.16, 0.1, 0.2, 12, materials.gold, 0, 1.2, 0);
    const crystal = makeSphere(0.18, materials.lightningCore.clone(), 0, 1.38, 0);
    const crystalRing = makeCylinder(0.22, 0.22, 0.035, 18, materials.wizardTrim.clone(), 0, 1.26, 0);
    crystalRing.rotation.x = Math.PI / 2;
    const staffGlow = new THREE.PointLight(0x7ae8ff, 1.35, 6, 1.8);
    staffGlow.position.set(0, 1.38, 0);
    staffPivot.add(staffShaft, staffCap, crystal, crystalRing, staffGlow);
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
      robeLower, robeUpper, sash, frontTrim, shoulderWrap, cape,
      head, beard, leftEye, rightEye, hatBrim, hatCone, hatBand,
      leftLeg, rightLeg, leftBoot, rightBoot,
      leftArm, rightArm, leftHand, rightHand, leftCuff, rightCuff,
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

  function setPlayerCharacter(character, resetVitals = true) {
    game.selectedCharacter = character;
    player.character = character;
    if (player.group) {
      scene.remove(player.group);
    }

    if (character === "wizard") {
      createWizard();
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
    const wizard = player.character === "wizard";
    setAbilityLock(attackIcon, wizard ? "lightning" : "slash");
    setAbilityLock(blockIcon, wizard ? "burst" : "block");
    setAbilityLock(potionIcon, wizard ? "potion" : "bash");
  }

  function getStartButtonText() {
    const className = player.character === "wizard" ? "Wizard" : "Knight";
    const prefix = online.role === "join" ? "Join" : "Start";
    return prefix + " Exploration as " + className;
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
    const wizard = player.character === "wizard";
    hud.classList.toggle("wizard-mode", wizard);
    classLabel.textContent = wizard ? "Wizard" : "Knight";
    resourceLabel.textContent = wizard ? "Magica" : "Guard";
    statusPanel.setAttribute("aria-label", wizard ? "Wizard status" : "Knight status");
    startButton.textContent = getStartButtonText();
    blockIcon.innerHTML = abilityMarkup(wizard
      ? '<svg viewBox="0 0 32 32"><path d="M16 4v5M16 23v5M4 16h5M23 16h5M8.5 8.5l3.5 3.5M20 20l3.5 3.5M23.5 8.5L20 12M12 20l-3.5 3.5"/><circle cx="16" cy="16" r="5"/></svg>'
      : '<svg viewBox="0 0 32 32"><path d="M16 3l10 4v7c0 7-4 12-10 15C10 26 6 21 6 14V7z"/><path d="M16 7v17"/></svg>',
      "RMB / K");
    attackIcon.innerHTML = abilityMarkup(wizard
      ? '<svg viewBox="0 0 32 32"><path d="M17 2L7 17h7l-2 13 12-17h-8z"/></svg>'
      : '<svg viewBox="0 0 32 32"><path d="M22 4l6 6M18 8l6 6M4 28l6-2 15-15-4-4L6 22zM6 22l4 4"/></svg>',
      "LMB / Space");
    potionIcon.innerHTML = abilityMarkup(wizard
      ? '<svg viewBox="0 0 32 32"><path d="M12 3h8M14 3v7l-5 8a7 7 0 0 0 6 11h2a7 7 0 0 0 6-11l-5-8V3"/><path d="M10 21h12"/></svg>'
      : '<svg viewBox="0 0 32 32"><path d="M15 3l9 4v7c0 6-3.5 10.5-9 13-5.5-2.5-9-7-9-13V7z"/><path d="M15 8v14M9.5 15h11M24 12l5 4-5 4"/></svg>',
      wizard ? "MMB / H" : "J / MMB");
    potionIcon.hidden = false;
    if (secondaryTouchButton) {
      secondaryTouchButton.setAttribute("aria-label", wizard ? "Arcane burst" : "Block");
    }
    if (potionTouchButton) {
      potionTouchButton.hidden = false;
      potionTouchButton.setAttribute("aria-label", wizard ? "Potion" : "Shield bash");
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

  function roomIsOpen() {
    return !!online.topic && (online.connected || online.role === "host");
  }

  function setSessionNote(text) {
    sessionNote.textContent = text || "";
    sessionNote.hidden = !text;
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
      addRosterRow(remote.nameTag ? remote.nameTag.text : "Player", remote.character === "wizard" ? "Wizard" : "Knight", id);
    }
    const showRoster = !overlay.classList.contains("hidden")
      && (game.menuPhase === "hostSetup" || game.menuPhase === "joinReady" || game.menuPhase === "pause" || online.remotePlayers.size > 0)
      && (roomIsOpen() || online.remotePlayers.size > 0);
    roomRoster.hidden = !showRoster;
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

    overlay.dataset.phase = phase;
    overlay.classList.toggle("active-session-menu", activeSessionMenu);
    onlinePanel.classList.toggle("session-management", activeSessionMenu);
    sessionSelect.hidden = phase !== "landing" || activeSessionMenu;
    sessionSelect.classList.toggle("has-resume", !!activeGame);
    resumeGameButton.hidden = !activeGame;
    if (activeGame) {
      const className = activeGame.character === "wizard" ? "Wizard" : "Knight";
      resumeGameSummary.textContent = "Continue Exploration as " + className + ".";
    }
    backMenuButton.hidden = phase === "landing" || pausePhase;
    onlinePanel.hidden = !showOnlinePanel;
    characterSelect.hidden = activeSessionMenu || !(hostPhase || joinReady);
    startButton.hidden = activeSessionMenu || !(hostPhase || joinReady);
    resumeButton.hidden = !pausePhase;
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
      setSessionNote(online.roomCode ? "Room " + online.roomCode + " - " + modeDisplayName() : "Creating room");
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
      overlayCopy.textContent = "Connected to the host world. Saved progress carries into the room.";
      setSessionNote("Room " + (online.roomCode || "----") + " - " + modeDisplayName());
    } else if (pausePhase) {
      overlayCopy.textContent = online.role === "join"
        ? "Session paused. Leave returns you to the menu and remembers this room code for rejoining."
        : "Session paused. Closing saves progress and shuts this room for everyone.";
      if (online.role === "host" && online.roomCode) {
        setSessionNote("Room " + online.roomCode + " - " + modeDisplayName());
      } else if (online.role === "join" && online.roomCode) {
        setSessionNote("Joined room " + online.roomCode + " - " + modeDisplayName());
      } else {
        setSessionNote(modeDisplayName());
      }
    }

    startButton.textContent = getStartButtonText();
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
    saveProgress();
    game.state = "paused";
    game.pausedFromPlay = true;
    keys.clear();
    player.blockHeld = false;
    player.blocking = false;
    overlay.classList.remove("hidden");
    document.exitPointerLock?.();
    setMenuPhase("pause");
  }

  function pauseForControlLoss() {
    if (game.state === "playing") {
      openSessionMenu();
    }
  }

  function resumeSession() {
    if (game.state !== "paused") {
      return;
    }
    game.state = "playing";
    overlay.classList.add("hidden");
    roomRoster.hidden = true;
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
      } else {
        online.lastRoomCode = "";
        roomCodeInput.value = "";
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
      character: player.character,
      name: player.name,
      weaponId: equippedWeapon(),
      perks: getCharacterProgress().perks.slice(0, 8),
      health: player.health,
      maxHealth: player.maxHealth,
      x: player.position.x,
      z: player.position.z,
      yaw: player.yaw,
      hasHorse: !!horse,
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
      activityType: enemy.activityType || "",
      activityId: enemy.activityId || ""
    };
  }

  function serializeFireballState(fireball) {
    return {
      fireballId: fireball.netId,
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
      fullHeal: !!potion.fullHeal,
      activityType: potion.activityType || "",
      activityId: potion.activityId || ""
    };
  }

  function serializeWorldSnapshot() {
    return {
      wave: game.wave,
      kills: game.kills,
      nextWaveIn: game.nextWaveIn,
      arenaActivity: serializeArenaActivityState(),
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

  function createEnemyFromSnapshot(state) {
    const wave = Math.max(1, game.wave || 1);
    let enemy;
    if (state.type === "dragon") {
      enemy = createDragon(state.x, state.z, wave);
    } else if (state.type === "spider") {
      enemy = createSpider(state.x, state.z, wave);
    } else if (state.type === "wisp") {
      enemy = createWisp(state.x, state.z, wave);
    } else {
      enemy = createBarbarian(state.x, state.z, wave);
    }
    enemy.remoteControlled = true;
    assignEnemyId(enemy, state.enemyId);
    game.enemies.push(enemy);
    return enemy;
  }

  function applyEnemySnapshot(enemy, state, firstSeen = false) {
    enemy.remoteControlled = true;
    enemy.networkTargetPosition = enemy.networkTargetPosition || new THREE.Vector3();
    enemy.networkTargetPosition.set(state.x || 0, 0, state.z || 0);
    enemy.networkTargetY = state.y || 0;
    enemy.networkTargetYaw = state.yaw || 0;
    enemy.type = state.type || enemy.type;
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
    enemy.activityType = state.activityType || "";
    enemy.activityId = state.activityId || "";
    enemy.lastWorldSeen = clock.elapsedTime;
    if (enemy.group) {
      enemy.group.scale.setScalar(enemy.scale);
    }
    if (firstSeen) {
      enemy.position.copy(enemy.networkTargetPosition);
      enemy.yaw = enemy.networkTargetYaw;
      if (enemy.group) {
        enemy.group.position.set(state.x || 0, state.y || 0, state.z || 0);
        enemy.group.rotation.y = enemy.yaw;
      }
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

  function createFireballVisual(state) {
    const group = new THREE.Group();
    group.position.set(state.x || 0, state.y || 0.9, state.z || 0);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 12), materials.fire.clone());
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), materials.fireCore.clone());
    const glow = new THREE.PointLight(0xff7b2e, 2.6, 9, 1.7);
    shell.castShadow = true;
    group.add(shell, core, glow);
    scene.add(group);
    return assignFireballId({
      group,
      shell,
      core,
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
    potion.position.set(state.x || 0, 0, state.z || 0);
    potion.group.position.x = potion.position.x;
    potion.group.position.z = potion.position.z;
    potion.healAmount = state.healAmount || potion.healAmount;
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
    game.wave = world.wave ?? game.wave;
    game.kills = world.kills ?? 0;
    game.nextWaveIn = world.nextWaveIn ?? 0;
    applyArenaActivitySnapshot(world.arenaActivity);

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
      enemy.yaw = lerp(enemy.yaw || 0, enemy.networkTargetYaw || 0, 1 - Math.pow(0.0001, dt));
      if (enemy.healthRoot) {
        enemy.healthRoot.lookAt(camera.position);
      }
      if (enemy.hpFill) {
        enemy.hpFill.scale.x = clamp(enemy.health / enemy.maxHealth, 0, 1);
        enemy.hpFill.position.x = (enemy.type === "dragon" ? -0.505 : -0.41) * (1 - enemy.hpFill.scale.x);
      }
      if (enemy.telegraph) {
        enemy.telegraph.visible = enemy.state === "attack" || enemy.state === "lunge" || enemy.state === "pulse";
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
        } else {
          enemy.walkTime += enemy.velocity.length() * dt;
          const legSwing = Math.sin(enemy.walkTime * 6.5) * Math.min(0.38, enemy.velocity.length() * 0.08);
          enemy.leftLeg.rotation.x = legSwing;
          enemy.rightLeg.rotation.x = -legSwing;
          enemy.chest.rotation.x = enemy.stunned > 0 ? -0.22 : 0;
        }
      }
      enemy.group.rotation.y = enemy.yaw;
    }

    for (const fireball of game.fireballs) {
      if (!fireball.remoteControlled) {
        continue;
      }
      const target = fireball.networkTargetPosition || fireball.group.position;
      fireball.group.position.lerp(target, 1 - Math.pow(0.00005, dt));
      fireball.shell.rotation.y += dt * 7.5;
      fireball.shell.rotation.x += dt * 5.8;
      const pulse = 1 + Math.sin(clock.elapsedTime * 18) * 0.14;
      fireball.shell.scale.setScalar(pulse);
      fireball.core.scale.setScalar(1.08 + Math.sin(clock.elapsedTime * 24) * 0.2);
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
      spawnImpact(new THREE.Vector3(effect.x || 0, effect.y || 0, effect.z || 0), effect.color || 0xffffff, effect.count || 10);
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
    if (!remote || !potion || remote.health >= remote.maxHealth) {
      return;
    }
    const remotePosition = remote.targetPosition || remote.group.position;
    const distance = Math.hypot(remotePosition.x - potion.position.x, remotePosition.z - potion.position.z);
    if (distance > potion.pickupRadius + 1.0) {
      return;
    }
    removePotionById(potion.netId);
    sendOnlineMessage({
      kind: "potionPicked",
      targetId: message.id,
      potionId: message.potionId,
      healAmount: potion.healAmount,
      fullHeal: potion.fullHeal
    });
    broadcastOnlineEffect({ type: "impact", x: potion.position.x, y: 0, z: potion.position.z, color: 0xff7f96, count: 16 });
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
    const inArena = message.activityType === "arena" && arenaActivityActive();
    game.potions.push(createHealthPotion(x, z, {
      kind: "wizard",
      healAmount: 28,
      activityType: inArena ? "arena" : "",
      activityId: inArena ? game.exploration.arenaActivity.activityId : ""
    }));
    trimPotionDrops();
    broadcastOnlineEffect({ type: "impact", ownerId: message.id, x, y: 0, z, color: 0x7ae8ff, count: 12 });
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
    const beforeHeal = player.health;
    player.health = message.fullHeal ? player.maxHealth : Math.min(player.maxHealth, player.health + (message.healAmount || 0));
    const healed = Math.ceil(player.health - beforeHeal);
    spawnImpact(player.position, 0xff7f96, 18);
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
    return enemy.type === "dragon" ? 28 : enemy.type === "wisp" ? 14 : enemy.type === "spider" ? 10 : 12;
  }

  function explorationProgressForEnemy(enemy) {
    const progress = ["raiders"];
    if (enemy.type === "spider") {
      progress.push("spiders");
    } else if (enemy.type === "dragon") {
      progress.push("dragons");
    } else if (enemy.type === "wisp") {
      progress.push("wisps");
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
    if (message.kind === "host" && (!message.sentAt || Date.now() - message.sentAt > 45000)) {
      return;
    }
    if (message.kind === "host") {
      online.hostId = message.id || online.hostId;
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
    const plume = makeBox(0.12, 0.56, 0.1, capeMat, 0, 2.67, 0.08);
    plume.rotation.x = 0.32;
    const leftLeg = makeBox(0.22, 0.78, 0.24, materials.iron, -0.22, 0.34, 0);
    const rightLeg = makeBox(0.22, 0.78, 0.24, materials.iron, 0.22, 0.34, 0);
    const leftKnee = makeSphere(0.13, materials.steel.clone(), -0.22, 0.55, -0.11);
    leftKnee.scale.set(1, 0.62, 0.72);
    const rightKnee = makeSphere(0.13, materials.steel.clone(), 0.22, 0.55, -0.11);
    rightKnee.scale.set(1, 0.62, 0.72);
    const leftBoot = makeBox(0.29, 0.2, 0.35, materials.darkLeather, -0.22, -0.03, -0.05);
    const rightBoot = makeBox(0.29, 0.2, 0.35, materials.darkLeather, 0.22, -0.03, -0.05);
    const leftArm = makeBox(0.2, 0.78, 0.22, materials.iron, -0.58, 1.34, 0);
    const rightArm = makeBox(0.2, 0.78, 0.22, materials.iron, 0.58, 1.34, 0);
    const leftPauldron = makeCylinder(0.18, 0.28, 0.2, 14, materials.steel.clone(), -0.58, 1.76, 0);
    const rightPauldron = makeCylinder(0.18, 0.28, 0.2, 14, materials.steel.clone(), 0.58, 1.76, 0);
    leftPauldron.rotation.z = Math.PI / 2;
    rightPauldron.rotation.z = Math.PI / 2;
    const leftGauntlet = makeCylinder(0.12, 0.13, 0.2, 10, materials.steel.clone(), -0.58, 1.0, -0.02);
    const rightGauntlet = makeCylinder(0.12, 0.13, 0.2, 10, materials.steel.clone(), 0.58, 1.0, -0.02);
    leftGauntlet.rotation.z = Math.PI / 2;
    rightGauntlet.rotation.z = Math.PI / 2;

    const swordPivot = new THREE.Group();
    swordPivot.position.set(0.7, 1.27, -0.05);
    const grip = makeCylinder(0.055, 0.055, 0.45, 8, materials.wood, 0, 0, -0.1);
    grip.rotation.x = Math.PI / 2;
    const blade = makeBox(0.09, 0.09, 1.55, materials.steel.clone(), 0, 0, -0.88);
    const bladeFuller = makeBox(0.025, 0.015, 1.04, materials.iron, 0, 0.052, -0.86);
    const bladeTip = makeCylinder(0.0, 0.075, 0.24, 4, materials.steel.clone(), 0, 0, -1.78);
    bladeTip.rotation.x = Math.PI / 2;
    bladeTip.rotation.z = Math.PI / 4;
    const guard = makeBox(0.46, 0.08, 0.08, trim, 0, 0, -0.26);
    const pommel = makeSphere(0.09, trim, 0, 0, 0.17);
    swordPivot.add(grip, blade, bladeFuller, bladeTip, guard, pommel);
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
      head, visor, visorSlit, helmet, helmetBand, crownRidge, plume,
      leftLeg, rightLeg, leftKnee, rightKnee, leftBoot, rightBoot,
      leftArm, rightArm, leftPauldron, rightPauldron, leftGauntlet, rightGauntlet,
      swordPivot, shieldPivot
    );
    return { body: chest, leftLeg, rightLeg, leftArm, rightArm, nameTagY: 3.22 };
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

    const head = makeSphere(0.26, materials.skin, 0, 2.02, 0);
    const beard = makeBox(0.32, 0.36, 0.08, materials.bone, 0, 1.84, -0.23);
    const leftEye = makeSphere(0.032, glow, -0.08, 2.06, -0.24);
    const rightEye = makeSphere(0.032, glow.clone(), 0.08, 2.06, -0.24);
    const hatBrim = makeCylinder(0.43, 0.43, 0.08, 24, hatMat, 0, 2.23, 0);
    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.82, 24), hatMat.clone());
    hatCone.position.set(0.02, 2.67, 0.02);
    hatCone.rotation.z = -0.1;
    addShadow(hatCone);
    const hatBand = makeCylinder(0.27, 0.3, 0.08, 18, trim, 0, 2.35, 0);

    const leftLeg = makeBox(0.22, 0.58, 0.22, materials.darkLeather, -0.22, 0.2, 0);
    const rightLeg = makeBox(0.22, 0.58, 0.22, materials.darkLeather, 0.22, 0.2, 0);
    const leftBoot = makeBox(0.29, 0.18, 0.34, materials.darkLeather, -0.22, -0.04, -0.05);
    const rightBoot = makeBox(0.29, 0.18, 0.34, materials.darkLeather, 0.22, -0.04, -0.05);
    const leftArm = makeBox(0.2, 0.72, 0.22, robe.clone(), -0.58, 1.33, 0);
    const rightArm = makeBox(0.2, 0.72, 0.22, robe.clone(), 0.58, 1.33, 0);
    const leftHand = makeSphere(0.105, materials.skin, -0.58, 0.94, -0.03);
    const rightHand = makeSphere(0.105, materials.skin, 0.58, 0.94, -0.03);
    const leftCuff = makeCylinder(0.13, 0.14, 0.16, 12, trim, -0.58, 1.02, -0.02);
    const rightCuff = makeCylinder(0.13, 0.14, 0.16, 12, trim, 0.58, 1.02, -0.02);
    leftCuff.rotation.z = Math.PI / 2;
    rightCuff.rotation.z = Math.PI / 2;

    const staffPivot = new THREE.Group();
    staffPivot.position.set(0.64, 1.02, -0.08);
    const staffShaft = makeCylinder(0.045, 0.055, 1.86, 10, materials.wood, 0, 0.24, 0);
    const staffCap = makeCylinder(0.16, 0.1, 0.2, 12, trim, 0, 1.2, 0);
    const crystal = makeSphere(0.18, glow.clone(), 0, 1.38, 0);
    const crystalRing = makeCylinder(0.22, 0.22, 0.035, 18, trim, 0, 1.26, 0);
    crystalRing.rotation.x = Math.PI / 2;
    const staffGlow = new THREE.PointLight(palette.glow, 1.15, 6, 1.8);
    staffGlow.position.set(0, 1.38, 0);
    staffPivot.add(staffShaft, staffCap, crystal, crystalRing, staffGlow);
    staffPivot.rotation.set(0.08, 0, -0.16);

    group.add(
      robeLower, robeUpper, sash, frontTrim, shoulderWrap, cape,
      head, beard, leftEye, rightEye, hatBrim, hatCone, hatBand,
      leftLeg, rightLeg, leftBoot, rightBoot,
      leftArm, rightArm, leftHand, rightHand, leftCuff, rightCuff,
      staffPivot
    );
    return { body: robeUpper, leftLeg, rightLeg, leftArm, rightArm, nameTagY: 3.36 };
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
      character,
      modeKey: game.mode,
      targetPosition: new THREE.Vector3(),
      lastPosition: new THREE.Vector3(),
      health: 100,
      maxHealth: 100,
      walkTime: 0
    };
  }

  function createNameTag(text, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(2.8, 0.7, 1);
    const tag = { canvas, texture, sprite, text: "", color };
    updateNameTag(tag, text);
    return tag;
  }

  function updateNameTag(tag, text) {
    const label = sanitizePlayerName(text);
    if (tag.text === label) {
      return;
    }
    tag.text = label;
    const ctx = tag.canvas.getContext("2d");
    ctx.clearRect(0, 0, tag.canvas.width, tag.canvas.height);
    ctx.fillStyle = "rgba(5, 9, 11, 0.68)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 3;
    roundRect(ctx, 14, 10, 228, 42, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#" + tag.color.toString(16).padStart(6, "0");
    ctx.font = "900 23px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 128, 32, 206);
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
      remote.group.position.copy(previousPosition || new THREE.Vector3(state.x || 0, 0, state.z || 0));
      remote.targetPosition.copy(remote.group.position);
      remote.horse.group.position.copy(previousHorsePosition || new THREE.Vector3(state.horseX ?? state.x ?? 0, 0, state.horseZ ?? state.z ?? 0));
      remote.horseTargetPosition = remote.horse.group.position.clone();
      if (previousTarget) {
        remote.targetPosition.copy(previousTarget);
      }
      remote.walkTime = previousWalk;
    }
    if (remote.nameTag) {
      updateNameTag(remote.nameTag, state.name || "Player");
    }
    remote.health = state.health ?? remote.health;
    remote.maxHealth = state.maxHealth ?? remote.maxHealth;
    const claimedProfile = sanitizedCombatProfile(nextCharacter, state.weaponId, state.perks);
    if (!remote.combatProfile || remote.combatProfile.character !== claimedProfile.character) {
      remote.combatProfile = claimedProfile;
    }
    remote.weaponId = remote.combatProfile.weaponId;
    remote.perks = remote.combatProfile.perks.slice();
    remote.targetPosition.set(state.x || 0, 0, state.z || 0);
    remote.targetYaw = state.yaw || 0;
    remote.hasHorse = !!state.hasHorse && game.mode === "exploration";
    remote.mounted = !!state.mounted && remote.hasHorse;
    if (!remote.horseTargetPosition) {
      remote.horseTargetPosition = new THREE.Vector3();
    }
    remote.horseTargetPosition.set(state.horseX ?? state.x ?? 0, 0, state.horseZ ?? state.z ?? 0);
    remote.horseTargetYaw = state.horseYaw ?? state.yaw ?? 0;
    remote.lastSeen = clock.elapsedTime;
    updateRoomRoster();
  }

  function updateRemotePlayers(dt) {
    for (const [id, remote] of online.remotePlayers) {
      const before = remote.group.position.clone();
      remote.group.position.lerp(remote.targetPosition, 1 - Math.pow(0.0002, dt));
      remote.group.rotation.y = lerp(remote.group.rotation.y, remote.targetYaw || 0, 1 - Math.pow(0.00005, dt));
      const moved = remote.group.position.distanceTo(before);
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
          remote.horse.group.position.y = updateHorseModelLocalAnimation(remote.horse, horseSpeed, dt);
          remote.horse.group.rotation.y = lerp(remote.horse.group.rotation.y, remote.horseTargetYaw || 0, 1 - Math.pow(0.00005, dt));
        }
      }
      remote.marker.rotation.z += dt * 0.9;
      if (clock.elapsedTime - (remote.lastSeen || 0) > 12) {
        removeRemotePlayer(remote);
        online.remotePlayers.delete(id);
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
    const distance = toTarget.length();
    if (distance > range || distance < 0.001) {
      return false;
    }
    toTarget.y = 0;
    toTarget.normalize();
    return forward.dot(toTarget) >= minDot;
  }

  function applyRemoteAction(action, state, options = {}) {
    const source = new THREE.Vector3(state.x || 0, 0, state.z || 0);
    const forward = forwardFromYaw(state.yaw || 0, new THREE.Vector3());
    const actionColor = action === "bash" ? 0xffd889 : game.mode === "exploration" ? 0x7ae8ff : 0xff705c;
    spawnImpact(source, actionColor, action === "burst" ? 18 : action === "bash" ? 14 : 10);
    if (action === "lightning") {
      spawnRemoteLightningVisual(source, state.yaw || 0);
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
    const remote = sourceId !== online.localId ? online.remotePlayers.get(sourceId) : null;
    const profile = remote && remote.combatProfile
      ? remote.combatProfile
      : sanitizedCombatProfile(state.character, state.weaponId, state.perks);
    const tuning = combatTuningFor(profile.character, {
      weaponId: profile.weaponId,
      perks: profile.perks
    });
    if (action === "burst") {
      for (const enemy of game.enemies) {
        if (!enemy.dead && enemy.position.distanceTo(source) < 3.45 + enemy.radius) {
          const direction = enemy.position.clone().sub(source).normalize();
          damageEnemy(enemy, Math.max(16, tuning.burstDamageMin - 4), direction, 0.55, sourceId);
        }
      }
      return;
    }

    if (action === "bash") {
      for (const enemy of game.enemies) {
        if (enemy.dead || !pointInAttackCone(source, yaw, enemy.position.clone(), 2.55 + enemy.radius, 0.24)) {
          continue;
        }
        damageEnemy(enemy, tuning.bashDamageMin, forward, tuning.bashKnockback, sourceId);
        enemy.velocity.addScaledVector(forward, tuning.bashVelocity);
      }
      return;
    }

    let best = null;
    let bestDistance = Infinity;
    const range = action === "lightning" ? tuning.remoteLightningRange : tuning.slashRange + 0.15;
    const minDot = action === "lightning" ? 0.34 : 0.18;
    for (const enemy of game.enemies) {
      if (enemy.dead || !pointInAttackCone(source, yaw, enemy.position.clone(), range + enemy.radius, minDot)) {
        continue;
      }
      const distance = enemy.position.distanceTo(source);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }
    if (best) {
      const damage = action === "lightning"
        ? tuning.lightningDamageMin + tuning.lightningDamageBonus - 1
        : tuning.slashDamageMin + tuning.slashDamageBonus - 4;
      damageEnemy(best, damage, forward, action === "lightning" ? 0.35 : tuning.slashKnockback, sourceId);
    }
  }

  function applyRemoteActionToPlayer(action, source, yaw, forward) {
    if (player.health <= 0) {
      return;
    }
    let hit = false;
    if (action === "burst") {
      hit = player.position.distanceTo(source) < 3.35;
    } else {
      const range = action === "lightning" ? 14.0 : action === "bash" ? 2.55 : 2.7;
      const minDot = action === "lightning" ? 0.55 : action === "bash" ? 0.24 : 0.18;
      hit = pointInAttackCone(source, yaw, player.position.clone(), range, minDot);
    }
    if (!hit) {
      return;
    }
    const damage = action === "lightning" ? 22 : action === "burst" ? 18 : action === "bash" ? 14 : 24;
    const guardDamage = action === "bash" ? 36 : damage + 12;
    applyPlayerDamage(damage, guardDamage, forward, action === "bash" ? 0.32 : action === "burst" ? 0.18 : 0.08);
  }

  function combatTargets() {
    const targets = [{
      id: online.localId,
      local: true,
      position: player.position,
      health: player.health,
      maxHealth: player.maxHealth
    }];
    if (online.role === "host") {
      for (const [id, remote] of online.remotePlayers) {
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
    const fur = makeBox(1.12, 0.24, 0.66, materials.fur, 0, 1.84, 0);
    const head = makeSphere(0.28, materials.skin, 0, 2.1, 0);
    const beard = makeBox(0.36, 0.3, 0.12, materials.fur, 0, 1.96, -0.22);
    const hair = makeCylinder(0.22, 0.29, 0.24, 12, materials.fur, 0, 2.33, 0);
    const leftEye = makeSphere(0.035, materials.emberEye, -0.09, 2.14, -0.24);
    const rightEye = makeSphere(0.035, materials.emberEye, 0.09, 2.14, -0.24);
    const nose = makeBox(0.06, 0.09, 0.08, materials.skin, 0, 2.07, -0.28);
    const warPaint = makeBox(0.38, 0.035, 0.025, materials.warPaint, 0, 2.18, -0.27);
    const helmetBand = makeCylinder(0.31, 0.31, 0.12, 16, materials.iron, 0, 2.28, 0);
    const hornLeft = makeCylinder(0.018, 0.082, 0.36, 8, materials.bone, -0.26, 2.34, -0.08);
    const hornRight = makeCylinder(0.018, 0.082, 0.36, 8, materials.bone, 0.26, 2.34, -0.08);
    hornLeft.rotation.set(-0.18, -0.34, 1.0);
    hornRight.rotation.set(-0.18, 0.34, -1.0);
    const leftLeg = makeBox(0.23, 0.7, 0.25, materials.leather, -0.23, 0.3, 0);
    const rightLeg = makeBox(0.23, 0.7, 0.25, materials.leather, 0.23, 0.3, 0);
    const leftBoot = makeBox(0.28, 0.18, 0.34, materials.darkLeather, -0.22, -0.04, -0.04);
    const rightBoot = makeBox(0.28, 0.18, 0.34, materials.darkLeather, 0.22, -0.04, -0.04);
    const leftArm = makeBox(0.2, 0.68, 0.2, materials.skin, -0.58, 1.25, 0);
    const rightArm = makeBox(0.2, 0.68, 0.2, materials.skin, 0.58, 1.25, 0);
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
    weaponPivot.add(haft, axe, axeSpike, gripWrapTop, gripWrapBottom);
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
      hips, chest, fur, head, beard, hair, leftEye, rightEye, nose, warPaint, helmetBand, hornLeft, hornRight,
      leftLeg, rightLeg, leftBoot, rightBoot, leftArm, rightArm, belt, buckle, leftShoulder, rightShoulder,
      leftBracer, rightBracer, weaponPivot, healthRoot, telegraph
    );

    return { group, weaponPivot, healthRoot, hpFill, telegraph, leftLeg, rightLeg, chest };
  }

  function makeWing(side) {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0.04, 0,
      side * 3.05, 0.26, -0.48,
      side * 1.34, -0.18, -1.98,
      side * 0.28, -0.02, -0.82
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 3, 1, 2, 3]);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, materials.dragonWing);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function createDragonModel(scale) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const body = makeCylinder(0.54, 0.76, 2.05, 18, materials.dragonScale, 0, 0, 0);
    body.rotation.x = Math.PI / 2;
    const belly = makeBox(0.64, 0.12, 1.36, materials.dragonBelly, 0, -0.31, -0.12);
    const neck = makeCylinder(0.24, 0.36, 0.86, 14, materials.dragonScale, 0, 0.36, -1.02);
    neck.rotation.x = 0.7;
    const head = makeSphere(0.42, materials.dragonScale, 0, 0.68, -1.54);
    head.scale.set(1.18, 0.88, 1.12);
    const snout = makeBox(0.54, 0.26, 0.54, materials.dragonScale, 0, 0.58, -1.96);
    const upperJaw = makeBox(0.5, 0.14, 0.58, materials.dragonScale, 0, 0.64, -2.12);
    const lowerJaw = makeBox(0.48, 0.11, 0.48, materials.dragonBelly, 0, 0.45, -2.1);
    const leftEye = makeSphere(0.06, materials.dragonEye, -0.2, 0.75, -1.9);
    const rightEye = makeSphere(0.06, materials.dragonEye, 0.2, 0.75, -1.9);
    const hornLeft = makeCylinder(0.022, 0.085, 0.56, 8, materials.bone || materials.gold, -0.21, 0.98, -1.46);
    const hornRight = makeCylinder(0.022, 0.085, 0.56, 8, materials.bone || materials.gold, 0.21, 0.98, -1.46);
    hornLeft.rotation.set(-0.82, -0.22, -0.18);
    hornRight.rotation.set(-0.82, 0.22, 0.18);

    const tail = makeCylinder(0.09, 0.36, 1.92, 12, materials.dragonScale, 0, -0.04, 1.48);
    tail.rotation.x = Math.PI / 2 + 0.18;
    const tailTip = makeCylinder(0.035, 0.13, 0.66, 10, materials.dragonScale, 0, 0.08, 2.48);
    tailTip.rotation.x = Math.PI / 2 + 0.42;

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

    group.add(body, belly, neck, head, snout, upperJaw, lowerJaw, leftEye, rightEye, hornLeft, hornRight, tail, tailTip, leftWing, rightWing, leftClaw, rightClaw, rearLeftLeg, rearRightLeg, rearLeftFoot, rearRightFoot, spineSpikes, mouthGlow, healthRoot);

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
        const leg = makeCylinder(0.032, 0.045, 0.95, 7, materials.spiderCarapace.clone(), side * 0.47, 0.42, z);
        leg.rotation.z = side * (Math.PI / 2.35);
        leg.rotation.x = (i - 1.5) * 0.16;
        const shin = makeCylinder(0.026, 0.036, 0.74, 7, materials.spiderCarapace.clone(), side * 0.96, 0.24, z + (i - 1.5) * 0.1);
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
    const shell = makeSphere(0.42, materials.wisp.clone(), 0, 0, 0);
    shell.scale.set(1.0, 1.18, 1.0);
    const core = makeSphere(0.16, materials.wispCore.clone(), 0, 0, 0);
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.014, 8, 28), materials.wispCore.clone());
    ringA.rotation.x = Math.PI / 2;
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 8, 24), materials.wisp.clone());
    ringB.rotation.y = Math.PI / 2;
    const sparks = [];
    for (let i = 0; i < 4; i += 1) {
      const spark = makeSphere(0.055, materials.wispCore.clone(), 0, 0, 0);
      sparks.push(spark);
      floatRoot.add(spark);
    }
    const glow = new THREE.PointLight(0x8affd2, 1.25, 5.5, 1.9);
    floatRoot.add(shell, core, ringA, ringB, glow);

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
    return { group, floatRoot, shell, core, ringA, ringB, sparks, healthRoot, hpFill, telegraph };
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
      health: 70 + wave * 12,
      maxHealth: 70 + wave * 12,
      speed: 2.05 + Math.random() * 0.42 + Math.min(wave * 0.035, 0.4),
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

  function createDragon(x, z, wave) {
    const scale = modelScale.dragonBase + Math.random() * 0.16 + Math.min(wave * 0.012, 0.14);
    const model = createDragonModel(scale);
    const enemy = {
      ...model,
      type: "dragon",
      position: new THREE.Vector3(x, 0, z),
      velocity: new THREE.Vector3(),
      yaw: 0,
      scale,
      hoverHeight: 2.9 + Math.random() * 0.42,
      desiredRange: 8.8 + Math.random() * 2.2,
      health: 92 + wave * 14,
      maxHealth: 92 + wave * 14,
      speed: 2.8 + Math.min(wave * 0.035, 0.44),
      radius: 1.5 * scale,
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
    const scale = modelScale.spiderBase + Math.random() * 0.16;
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
      speed: 2.9 + Math.random() * 0.45,
      radius: 0.72 * scale,
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
      speed: 2.5 + Math.random() * 0.34,
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
      scene.fog.density = 0.0065;
      setupExplorationWorld();
      if (isJoinedClient()) {
        clearSharedWorldActors({ enemies: true, fireballs: true, potions: true });
      }
      player.position.copy(savedExplorationWorldPosition() || game.exploration.spawn);
      game.cameraYaw = Math.PI;
    } else {
      setArenaVisible(true);
      scene.fog.density = 0.018;
      clearExplorationWorld();
      player.position.set(0, 0, 0);
    }
    player.velocity.set(0, 0, 0);
    player.yaw = 0;
    setPlayerCharacter(game.selectedCharacter, true);
    if (game.mode === "exploration") {
      restoreSavedResources();
      if (progression.exploration.horseUnlocked) {
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
    const group = new THREE.Group();
    group.position.set(x, 0.1, z);
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
      position: new THREE.Vector3(x, 0, z),
      kind: options.kind,
      healAmount,
      fullHeal,
      activityType: options.activityType || "",
      activityId: options.activityId || "",
      pickupRadius: fullHeal ? 1.25 : 0.9,
      bobSeed: Math.random() * 10
    }, options.netId);
  }

  function dropWaveHealthPotion() {
    const forward = forwardFromYaw(player.yaw, tmpVec);
    const dropPosition = tmpVec2.copy(player.position).addScaledVector(forward, 2.4);
    const dist = Math.hypot(dropPosition.x, dropPosition.z);
    if (dist > arenaRadius - 2.8) {
      dropPosition.multiplyScalar((arenaRadius - 2.8) / dist);
    }
    game.potions.push(createHealthPotion(dropPosition.x, dropPosition.z, {
      kind: "full",
      activityType: arenaActivityActive() ? "arena" : "",
      activityId: arenaActivityActive() ? game.exploration.arenaActivity.activityId : ""
    }));
    trimPotionDrops();
  }

  function dropDragonHealthPotion(enemy) {
    const dropPosition = enemy.position.clone();
    if (game.mode !== "exploration" || localPlayerInArenaActivity()) {
      const dist = Math.hypot(dropPosition.x, dropPosition.z);
      if (dist > arenaRadius - 2.2) {
        dropPosition.multiplyScalar((arenaRadius - 2.2) / dist);
      }
    }
    game.potions.push(createHealthPotion(dropPosition.x, dropPosition.z, {
      kind: "small",
      healAmount: 18,
      activityType: arenaActivityActive() ? "arena" : "",
      activityId: arenaActivityActive() ? game.exploration.arenaActivity.activityId : ""
    }));
    trimPotionDrops();
  }

  function dropWizardHealthPotion() {
    if (game.state !== "playing" || !questDialog.hidden || isPlayerMounted() || player.character !== "wizard" || player.potionCooldown > 0) {
      return false;
    }
    if (!hasAbility("potion")) {
      showAbilityLocked("potion");
      return false;
    }
    const behind = forwardFromYaw(player.yaw, tmpVec).multiplyScalar(-0.9);
    const dropPosition = tmpVec2.copy(player.position).add(behind);
    if (game.mode !== "exploration" || localPlayerInArenaActivity()) {
      const dist = Math.hypot(dropPosition.x, dropPosition.z);
      if (dist > arenaRadius - 2.2) {
        dropPosition.multiplyScalar((arenaRadius - 2.2) / dist);
      }
    }
    if (isJoinedClient()) {
      const inArena = arenaActivityActive();
      sendOnlineMessage({
        kind: "dropPotion",
        x: dropPosition.x,
        z: dropPosition.z,
        activityType: inArena ? "arena" : "",
        activityId: inArena ? game.exploration.arenaActivity.activityId : "",
        state: serializePlayerState()
      });
      player.potionCooldown = player.potionCooldownMax;
      spawnImpact(dropPosition, 0x7ae8ff, 12);
      showBanner("Potion dropped");
      return true;
    }
    game.potions.push(createHealthPotion(dropPosition.x, dropPosition.z, {
      kind: "wizard",
      healAmount: 28,
      activityType: arenaActivityActive() ? "arena" : "",
      activityId: arenaActivityActive() ? game.exploration.arenaActivity.activityId : ""
    }));
    trimPotionDrops();
    player.potionCooldown = player.potionCooldownMax;
    spawnImpact(dropPosition, 0x7ae8ff, 12);
    broadcastOnlineEffect({ type: "impact", x: dropPosition.x, y: 0, z: dropPosition.z, color: 0x7ae8ff, count: 12 });
    showBanner("Potion dropped");
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

  function resolveExplorationPosition(position, velocity, radius) {
    if (!game.exploration.colliders.length) {
      return;
    }
    for (let pass = 0; pass < 2; pass += 1) {
      for (const collider of game.exploration.colliders) {
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
    resolveExplorationPosition(player.position, player.velocity, isPlayerMounted() ? 1.08 : 0.62);
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
    const activity = game.exploration.arenaActivity;
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
    player.hurtTimer = Math.max(0, player.hurtTimer - dt);
    if (player.character === "wizard") {
      player.mana = Math.min(player.maxMana, player.mana + dt * player.manaRegen);
      player.potionCooldown = Math.max(0, player.potionCooldown - dt);
      player.blocking = false;
    } else {
      const wantsBlock = !mounted && (player.blockHeld || keys.has("KeyK"));
      player.blocking = wantsBlock && player.guard > 2 && !player.attacking;
      if (player.blocking) {
        player.guard = Math.max(0, player.guard - dt * 8);
      } else if (!(player.attacking && player.attackKind === "bash")) {
        player.guard = Math.min(player.maxGuard, player.guard + dt * 22);
      }
    }
    if (mounted) {
      player.blocking = false;
      player.blockHeld = false;
    }

    const inputX = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    const inputZ = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    tmpVec.set(0, 0, 0);
    if (inputX || inputZ) {
      const f = forwardFromYaw(game.cameraYaw, tmpVec2);
      const r = rightFromYaw(game.cameraYaw, new THREE.Vector3());
      tmpVec.addScaledVector(f, -inputZ);
      tmpVec.addScaledVector(r, inputX);
      tmpVec.normalize();
      const speed = mounted
        ? 10.4
        : player.character === "wizard"
        ? (player.attacking ? 4.45 : 6.65)
        : (player.blocking ? 3.1 : player.attacking ? 3.8 : 5.8);
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
      player.velocity.addScaledVector(forward, dt * (player.character === "wizard" ? 2.0 : 4.8));
    }

    player.position.addScaledVector(player.velocity, dt);
    if (localPlayerInArenaActivity()) {
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
      } else if (player.attackKind === "bash") {
        player.swordPivot.rotation.set(-0.28 + swing * 0.2, -0.58 + swing * 0.22, -0.86 + swing * 0.28);
        player.slashArc.visible = false;
      } else {
        player.swordPivot.rotation.set(-0.48 + swing * 1.0, -0.95 + swing * 1.85, -0.85 + swing * 1.2);
        player.slashArc.visible = true;
        player.slashArc.material.opacity = Math.max(0, 0.72 * Math.sin(clamp((t - 0.1) / 0.6, 0, 1) * Math.PI));
        player.slashArc.rotation.z = -1.3 + swing * 1.9;
      }

      const hitFrame = player.attackKind === "lightning" ? t > 0.28 : player.attackKind === "burst" ? t > 0.36 : player.attackKind === "bash" ? t > 0.26 : t > 0.34 && t < 0.68;
      if (!player.attackHitDone && hitFrame) {
        player.attackHitDone = true;
        if (player.attackKind === "lightning") {
          launchLightningBall();
        } else if (player.attackKind === "burst") {
          performWizardBurst();
        } else if (player.attackKind === "bash") {
          performShieldBash();
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
    if (mounted) {
      const horse = game.exploration.horse;
      const rideBob = horse ? Math.sin(horse.walkTime * 2.2) * 0.04 : 0;
      player.group.position.set(player.position.x, 1.2 + rideBob, player.position.z);
    } else {
      player.group.position.set(player.position.x, walkBob, player.position.z);
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
      const burst = player.attackKind === "burst";
      player.burstRing.visible = burst;
      if (burst) {
        const scale = 0.75 + smoothstep(0.12, 0.92, t) * 3.45;
        player.burstRing.scale.set(scale, scale, scale);
        player.burstRing.material.opacity = 0.72 * (1 - smoothstep(0.42, 1, t));
      }
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
    } else {
      player.attackKind = "slash";
      player.attackDuration = 0.42;
      player.attackCooldown = 0.54;
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
    sendOnlineAction("bash");
    return true;
  }

  function performPlayerAttack() {
    const forward = forwardFromYaw(player.yaw, tmpVec);
    const tuning = combatTuningFor("knight");
    let hitAny = false;
    if (!canSimulateSharedWorld()) {
      return;
    }
    for (const enemy of game.enemies) {
      if (enemy.dead || enemy.stunned > 0.2) {
        continue;
      }
      tmpVec2.copy(enemy.position).sub(player.position);
      const distance = tmpVec2.length();
      if (distance > tuning.slashRange) {
        continue;
      }
      tmpVec2.y = 0;
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
      if (enemy.dead) {
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

  function launchLightningBall() {
    const source = player.group.localToWorld(new THREE.Vector3(0.55, 1.55, -0.72));
    const direction = forwardFromYaw(player.yaw, new THREE.Vector3());
    const velocity = direction.clone().multiplyScalar(12.8);
    const tuning = combatTuningFor("wizard");
    game.playerProjectiles.push(createLightningProjectile(source, velocity, {
      damage: tuning.lightningDamageMin + tuning.lightningDamageBonus + Math.floor(Math.random() * tuning.lightningDamageSpread),
      turnRate: tuning.lightningTurnRate,
      life: tuning.lightningLife,
      visualOnly: !canSimulateSharedWorld()
    }));
  }

  function spawnRemoteLightningVisual(source, yaw) {
    const start = source.clone();
    const direction = forwardFromYaw(yaw, new THREE.Vector3());
    start.y = 1.45;
    start.addScaledVector(direction, 0.72);
    game.playerProjectiles.push(createLightningProjectile(start, direction.multiplyScalar(12.8), {
      visualOnly: true,
      life: 1.35,
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
        if (enemy.dead) {
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
    if (enemy.type === "wisp") {
      return out.set(enemy.position.x, 1.05, enemy.position.z);
    }
    return out.set(enemy.position.x, 1.08, enemy.position.z);
  }

  function findLightningTarget(projectile) {
    let best = null;
    let bestScore = Infinity;
    const currentDirection = projectile.velocity.clone().normalize();
    for (const enemy of game.enemies) {
      if (enemy.dead) {
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

      const target = projectile.visualOnly ? null : findLightningTarget(projectile);
      if (target) {
        const desired = target.sub(projectile.group.position);
        if (desired.lengthSq() > 0.0001) {
          desired.normalize();
          const current = projectile.velocity.clone().normalize();
          current.lerp(desired, clamp(projectile.turnRate * dt, 0, 0.035)).normalize();
          projectile.velocity.copy(current).multiplyScalar(projectile.speed);
        }
      }

      projectile.group.position.addScaledVector(projectile.velocity, dt);
      projectile.shell.rotation.y += dt * 9.0;
      projectile.shell.rotation.x += dt * 7.4;
      projectile.ringA.rotation.z += dt * 8.5;
      projectile.ringB.rotation.x -= dt * 7.2;
      const pulse = 1 + Math.sin(clock.elapsedTime * 20 + i) * 0.12;
      projectile.core.scale.setScalar(1.08 + Math.sin(clock.elapsedTime * 28 + i) * 0.18);
      projectile.shell.scale.setScalar(pulse);

      let consumed = false;
      if (!projectile.visualOnly && canSimulateSharedWorld()) {
        for (const enemy of game.enemies) {
          if (enemy.dead) {
            continue;
          }
          const targetPosition = getEnemyAimPosition(enemy, tmpVec);
          if (projectile.group.position.distanceTo(targetPosition) > enemy.radius + projectile.radius) {
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
          spawnImpact(projectile.group.position, 0x7ae8ff, 16);
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
        spawnImpact(projectile.group.position, 0x7ae8ff, 10);
        scene.remove(projectile.group);
        game.playerProjectiles.splice(i, 1);
      }
    }
  }

  function damageEnemy(enemy, damage, direction, stun, sourceId = online.localId) {
    if (!canSimulateSharedWorld()) {
      return;
    }
    enemy.health -= damage;
    enemy.stunned = Math.max(enemy.stunned, stun);
    enemy.velocity.addScaledVector(direction, 4.3);
    const impactPosition = enemy.type === "dragon" ? enemy.group.position : enemy.type === "wisp" ? tmpVec.set(enemy.position.x, 1.05, enemy.position.z) : enemy.position;
    const impactColor = enemy.type === "dragon" ? 0xffb15d : enemy.type === "spider" ? 0xd9a648 : enemy.type === "wisp" ? 0x8affd2 : 0xffd19b;
    spawnImpact(impactPosition, impactColor, enemy.type === "dragon" ? 14 : 10);
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
      } else if (game.mode === "exploration" && !arenaActivityActive() && Math.random() < (enemy.type === "spider" ? 0.2 : enemy.type === "wisp" ? 0.24 : 0.3)) {
        game.potions.push(createHealthPotion(enemy.position.x, enemy.position.z, { kind: "small", healAmount: 18 }));
        trimPotionDrops();
      }
      scene.remove(enemy.group);
      game.kills += 1;
      if (game.mode === "exploration" && enemy.exploration) {
        applyExplorationEnemyReward(enemy, sourceId);
      }
    }
  }

  function chooseExplorationPatrolTarget(enemy) {
    const angle = Math.random() * TAU;
    const radius = 2.5 + Math.random() * (enemy.homeRadius || 9.5);
    enemy.patrolTarget.set(
      enemy.home.x + Math.cos(angle) * radius,
      0,
      enemy.home.z + Math.sin(angle) * radius
    );
    const local = explorationLocalPosition(enemy.patrolTarget, tmpVec);
    const maxRadius = game.exploration.radius - 4;
    const distance = Math.hypot(local.x, local.z);
    if (distance > maxRadius) {
      local.multiplyScalar(maxRadius / Math.max(0.001, distance));
      enemy.patrolTarget.x = game.exploration.origin.x + local.x;
      enemy.patrolTarget.z = game.exploration.origin.z + local.z;
    }
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
      enemy.group.position.set(enemy.position.x, enemy.hoverHeight, enemy.position.z);
      enemy.group.rotation.y = enemy.yaw;
      updateDragonAnimation(enemy, dt);
      return;
    }
    const active = playerDistance < enemy.awareness || ((enemy.state === "chase" || enemy.state === "fire") && playerDistance < enemy.awareness * 1.75);
    if (active) {
      if (enemy.state === "patrol") {
        enemy.state = "chase";
      }
      enemy.yaw = yawFromDirection(playerDirection);
      updateDragonEnemy(enemy, dt, playerDistance, playerDirection);
    } else {
      enemy.state = "patrol";
      if (!enemy.patrolTarget || enemy.position.distanceTo(enemy.patrolTarget) < 1.2) {
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
    enemy.group.position.set(enemy.position.x, hover, enemy.position.z);
    enemy.group.rotation.y = enemy.yaw;
    updateDragonAnimation(enemy, dt);
  }

  function beginSpiderAttack(enemy) {
    enemy.state = "lunge";
    enemy.attackTimer = 0;
    enemy.attackHitDone = false;
    enemy.attackDuration = 0.58;
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = 0.42;
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
      if (playerDistance < 2.05) {
        const hitDirection = forwardFromYaw(enemy.yaw, tmpVec2);
        applyCombatTargetDamage(combatTargetById(enemy.targetId) || nearestCombatTarget(enemy), 16, 22, hitDirection, 0.18);
      }
    }
    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.cooldown = 1.05 + Math.random() * 0.75;
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

  function updateExplorationSpiderEnemy(enemy, dt, playerDistance, playerDirection) {
    if (enemy.stunned > 0) {
      enemy.velocity.multiplyScalar(Math.pow(0.06, dt));
      enemy.telegraph.visible = false;
    } else if (enemy.state === "lunge") {
      enemy.yaw = yawFromDirection(playerDirection);
      updateSpiderAttack(enemy, dt, playerDistance, playerDirection);
    } else {
      const shouldChase = playerDistance < enemy.awareness || (enemy.state === "chase" && playerDistance < enemy.awareness * 1.55);
      if (shouldChase) {
        enemy.state = "chase";
        enemy.yaw = yawFromDirection(playerDirection);
        if (playerDistance < 2.1 && enemy.cooldown <= 0) {
          beginSpiderAttack(enemy);
        } else {
          const desired = playerDirection.multiplyScalar(enemy.speed * 1.02);
          enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.018, dt));
          enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.018, dt));
        }
      } else {
        enemy.state = "patrol";
        if (!enemy.patrolTarget || enemy.position.distanceTo(enemy.patrolTarget) < 0.65) {
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
    enemy.group.position.copy(enemy.position);
    enemy.group.rotation.y = enemy.yaw;
    updateSpiderAnimation(enemy, dt);
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
        applyCombatTargetDamage(combatTargetById(enemy.targetId) || nearestCombatTarget(enemy), 15, 24, hitDirection, 0.16);
        spawnImpact(tmpVec.set(enemy.position.x, 1.0, enemy.position.z), 0x8affd2, 16);
      }
    }
    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.cooldown = 1.35 + Math.random() * 0.9;
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
    enemy.ringA.rotation.z += dt * 2.7;
    enemy.ringB.rotation.x -= dt * 3.6;
    for (let i = 0; i < enemy.sparks.length; i += 1) {
      const angle = time * (1.2 + i * 0.18) + i * TAU / enemy.sparks.length;
      const radius = 0.42 + Math.sin(time * 2.1 + i) * 0.06;
      enemy.sparks[i].position.set(Math.cos(angle) * radius, Math.sin(time * 3.8 + i) * 0.12, Math.sin(angle) * radius);
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
    } else {
      const shouldChase = playerDistance < enemy.awareness || (enemy.state === "chase" && playerDistance < enemy.awareness * 1.7);
      if (shouldChase) {
        enemy.state = "chase";
        enemy.yaw = yawFromDirection(playerDirection);
        if (playerDistance < 2.7 && enemy.cooldown <= 0) {
          beginWispAttack(enemy);
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
        if (!enemy.patrolTarget || enemy.position.distanceTo(enemy.patrolTarget) < 0.75) {
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
    enemy.group.position.copy(enemy.position);
    enemy.group.rotation.y = enemy.yaw;
    updateWispAnimation(enemy, dt);
  }

  function updateExplorationNpcs(dt) {
    for (const npc of game.npcs) {
      const dx = player.position.x - npc.group.position.x;
      const dz = player.position.z - npc.group.position.z;
      const playerDistanceSq = dx * dx + dz * dz;
      npc.group.visible = playerDistanceSq < EXPLORATION_NPC_VISIBLE_DISTANCE_SQ;
      npc.healCooldown = Math.max(0, npc.healCooldown - dt);
      if (playerDistanceSq > EXPLORATION_NPC_UPDATE_DISTANCE_SQ) {
        continue;
      }
      npc.retarget -= dt;
      const targetDx = npc.group.position.x - npc.target.x;
      const targetDz = npc.group.position.z - npc.target.z;
      if (npc.retarget <= 0 || targetDx * targetDx + targetDz * targetDz < 0.45 * 0.45) {
        const angle = Math.random() * TAU;
        const radius = Math.random() * npc.homeRadius;
        npc.target.set(npc.home.x + Math.cos(angle) * radius, 0, npc.home.z + Math.sin(angle) * radius);
        npc.retarget = 2 + Math.random() * 3.5;
      }
      const toTarget = tmpVec.copy(npc.target).sub(npc.group.position);
      const distance = Math.hypot(toTarget.x, toTarget.z);
      if (distance > 0.08) {
        toTarget.multiplyScalar(1 / Math.max(0.001, distance));
        npc.group.position.addScaledVector(toTarget, dt * 1.05);
        npc.group.rotation.y = yawFromDirection(toTarget);
        npc.walkTime += dt * 2.8;
      }
      const swing = Math.sin(npc.walkTime * 5.8) * 0.18;
      npc.leftLeg.rotation.x = swing;
      npc.rightLeg.rotation.x = -swing;
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
    if (arenaActivityActive()) {
      return;
    }
    for (const village of game.exploration.villages) {
      if (game.exploration.discovered.has(village.id)) {
        continue;
      }
      const distance = Math.hypot(player.position.x - village.x, player.position.z - village.z);
      if (distance < village.radius) {
        game.exploration.discovered.add(village.id);
        spawnImpact(new THREE.Vector3(village.x, 0, village.z), 0xffd889, 24);
        showBanner("Village found " + game.exploration.discovered.size + "/" + game.exploration.villages.length);
        awardExplorationXp(20);
        syncVillageQuestProgress({ silent: false });
        saveProgress();
      }
    }

    if (!game.exploration.completed && game.exploration.villages.length > 0 && game.exploration.discovered.size === game.exploration.villages.length && game.enemies.length === 0) {
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
      const playerDistance = Math.max(0.001, toPlayer.length());
      const playerDirection = toPlayer.multiplyScalar(1 / playerDistance);
      const detailed = playerDistance * playerDistance < EXPLORATION_ENEMY_DETAIL_DISTANCE_SQ || enemy.state === "attack" || enemy.state === "lunge" || enemy.state === "pulse" || enemy.state === "fire" || enemy.stunned > 0;
      if (detailed) {
        enemy.healthRoot.lookAt(camera.position);
        enemy.hpFill.scale.x = clamp(enemy.health / enemy.maxHealth, 0, 1);
        enemy.hpFill.position.x = (enemy.type === "dragon" ? -0.505 : -0.41) * (1 - enemy.hpFill.scale.x);
      }

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

      if (enemy.stunned > 0) {
        enemy.velocity.multiplyScalar(Math.pow(0.06, dt));
        enemy.telegraph.visible = false;
      } else if (enemy.state === "attack") {
        enemy.yaw = yawFromDirection(playerDirection);
        updateEnemyAttack(enemy, dt, playerDistance, playerDirection);
      } else {
        const shouldChase = playerDistance < enemy.awareness || (enemy.state === "chase" && playerDistance < enemy.awareness * 1.65);
        if (shouldChase) {
          enemy.state = "chase";
          enemy.yaw = yawFromDirection(playerDirection);
          if (playerDistance < 2.15 && enemy.cooldown <= 0) {
            beginEnemyAttack(enemy, Math.random() < 0.24 ? "heavy" : "slash");
          } else {
            const desired = playerDirection.multiplyScalar(enemy.speed * 0.86);
            enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.015, dt));
            enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.015, dt));
            enemy.walkTime += dt * enemy.speed;
          }
        } else {
          enemy.state = "patrol";
          if (!enemy.patrolTarget || enemy.position.distanceTo(enemy.patrolTarget) < 0.65) {
            chooseExplorationPatrolTarget(enemy);
          }
          const toPatrol = tmpVec2.copy(enemy.patrolTarget).sub(enemy.position);
          const patrolDistance = Math.max(0.001, Math.hypot(toPatrol.x, toPatrol.z));
          toPatrol.multiplyScalar(1 / patrolDistance);
          enemy.yaw = yawFromDirection(toPatrol);
          const desired = toPatrol.multiplyScalar(enemy.speed * 0.42);
          enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.02, dt));
          enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.02, dt));
          enemy.walkTime += dt * enemy.speed * 0.45;
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
      enemy.group.position.copy(enemy.position);
      enemy.group.rotation.y = enemy.yaw;
      const legSwing = Math.sin(enemy.walkTime * 6.5) * Math.min(0.38, enemy.velocity.length() * 0.08);
      enemy.leftLeg.rotation.x = legSwing;
      enemy.rightLeg.rotation.x = -legSwing;
      enemy.chest.rotation.x = enemy.stunned > 0 ? -0.22 : 0;
    }

    game.enemies = game.enemies.filter(enemy => !enemy.dead);
    updateExplorationGoals();
  }

  function updateEnemies(dt) {
    if (game.mode === "exploration" && !arenaActivityActive()) {
      updateExplorationEnemies(dt);
      return;
    }
    for (const enemy of game.enemies) {
      if (enemy.dead) {
        continue;
      }

      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      enemy.stunned = Math.max(0, enemy.stunned - dt);
      enemy.healthRoot.lookAt(camera.position);
      enemy.hpFill.scale.x = clamp(enemy.health / enemy.maxHealth, 0, 1);
      enemy.hpFill.position.x = (enemy.type === "dragon" ? -0.505 : -0.41) * (1 - enemy.hpFill.scale.x);

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
          if (distance < 2.15 && enemy.cooldown <= 0) {
            beginEnemyAttack(enemy, Math.random() < 0.37 ? "heavy" : "slash");
          } else {
            const desired = direction.multiplyScalar(enemy.speed);
            enemy.velocity.x = lerp(enemy.velocity.x, desired.x, 1 - Math.pow(0.01, dt));
            enemy.velocity.z = lerp(enemy.velocity.z, desired.z, 1 - Math.pow(0.01, dt));
            enemy.walkTime += dt * enemy.speed;
          }
        } else {
          updateEnemyAttack(enemy, dt, distance, direction);
        }
      }

      for (const other of game.enemies) {
        if (other === enemy || other.dead || (enemy.entering && enemy.entryDelay > 0)) {
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
      const dist = Math.hypot(enemy.position.x, enemy.position.z);
      if (!enemy.entering && dist > arenaRadius - 1.2) {
        enemy.position.multiplyScalar((arenaRadius - 1.2) / dist);
      }
      if (enemy.type === "dragon") {
        const hover = enemy.hoverHeight + Math.sin(clock.elapsedTime * 3.4 + enemy.bobSeed) * 0.28;
        enemy.group.position.set(enemy.position.x, hover, enemy.position.z);
      } else {
        enemy.group.position.copy(enemy.position);
      }
      enemy.group.rotation.y = enemy.yaw;
      if (enemy.type === "dragon") {
        updateDragonAnimation(enemy, dt);
      } else {
        const legSwing = Math.sin(enemy.walkTime * 6.5) * Math.min(0.38, enemy.velocity.length() * 0.08);
        enemy.leftLeg.rotation.x = legSwing;
        enemy.rightLeg.rotation.x = -legSwing;
        enemy.chest.rotation.x = enemy.stunned > 0 ? -0.22 : 0;
      }
    }

    game.enemies = game.enemies.filter(enemy => !enemy.dead);
    if (game.enemies.length === 0 && game.state === "playing") {
      if (game.nextWaveIn <= 0) {
        dropWaveHealthPotion();
        game.nextWaveIn = arenaActivityActive() ? 6.0 : 4.0;
        if (arenaActivityActive()) {
          const activity = game.exploration.arenaActivity;
          activity.phase = "intermission";
          activity.nextWaveIn = game.nextWaveIn;
          activity.exitOpen = true;
          const xp = grantCrownringWaveReward(game.wave);
          showBanner("Crownring wave " + game.wave + " cleared +" + xp + " XP - press Y to yield", 3);
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
    enemy.attackDuration = 1.18;
    enemy.velocity.multiplyScalar(0.22);
  }

  function updateDragonAttack(enemy, dt, distance, direction) {
    enemy.attackTimer += dt;
    if (!enemy.attackHitDone && enemy.attackTimer > enemy.attackDuration * 0.58) {
      enemy.attackHitDone = true;
      launchFireball(enemy);
    }
    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.cooldown = 1.8 + Math.random() * 1.3;
    }
    if (distance > enemy.desiredRange + 2.5) {
      enemy.velocity.addScaledVector(direction, dt * enemy.speed * 0.55);
    }
  }

  function launchFireball(enemy) {
    const source = enemy.group.localToWorld(new THREE.Vector3(0, 0.28, -2.02));
    const targetInfo = combatTargetById(enemy.targetId) || nearestCombatTarget(enemy);
    const target = tmpVec.copy(targetInfo.position);
    target.y = 0.86;
    const speed = 5.1 + Math.min(game.wave * 0.12, 1.1);
    const velocity = target.sub(source).normalize().multiplyScalar(speed);

    const fireball = createFireballVisual({
      x: source.x,
      y: source.y,
      z: source.z,
      vx: velocity.x,
      vy: velocity.y,
      vz: velocity.z,
      speed,
      turnRate: 0.82,
      life: 4.2,
      damage: 24 + Math.min(game.wave * 2, 12),
      guardDamage: 36 + Math.min(game.wave * 2, 14),
      targetId: targetInfo.id
    });
    if (enemy.activityType === "arena") {
      fireball.activityType = "arena";
      fireball.activityId = enemy.activityId || game.exploration.arenaActivity.activityId;
    }
    fireball.remoteControlled = false;
    game.fireballs.push(fireball);
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
  }

  function updateEnemyAttack(enemy, dt, distance, direction) {
    enemy.attackTimer += dt;
    const t = enemy.attackTimer / enemy.attackDuration;
    const heavy = enemy.attackType === "heavy";
    enemy.telegraph.visible = true;
    enemy.telegraph.material.opacity = heavy ? 0.46 * (1 - smoothstep(0.58, 1, t)) : 0.34 * (1 - smoothstep(0.55, 1, t));

    if (heavy) {
      const wind = clamp(t / 0.58, 0, 1);
      const strike = smoothstep(0.58, 0.76, t);
      enemy.weaponPivot.rotation.set(-1.25 + strike * 2.25, -0.18, -0.62 + wind * 0.74);
      if (!enemy.attackHitDone && t > 0.58) {
        enemy.attackHitDone = true;
        tryHitPlayer(enemy, 34, 47, 2.45, 0.22);
      }
    } else {
      const wind = clamp(t / 0.36, 0, 1);
      const strike = Math.sin(clamp((t - 0.24) / 0.32, 0, 1) * Math.PI);
      enemy.weaponPivot.rotation.set(-0.18 + strike * 0.7, -0.45 + strike * 1.65, -0.72 + wind * 0.38);
      if (!enemy.attackHitDone && t > 0.34) {
        enemy.attackHitDone = true;
        tryHitPlayer(enemy, 17, 23, 2.05, 0.0);
      }
    }

    if (enemy.attackTimer >= enemy.attackDuration) {
      enemy.state = "chase";
      enemy.attackType = null;
      enemy.cooldown = heavy ? 1.2 + Math.random() * 0.7 : 0.72 + Math.random() * 0.55;
      enemy.telegraph.visible = false;
      enemy.weaponPivot.rotation.set(-0.12, -0.3, -0.7);
    }

    if (distance > 3.0) {
      enemy.velocity.addScaledVector(direction, dt * 1.1);
    }
  }

  function tryHitPlayer(enemy, damage, guardDamage, range, extraPush) {
    const target = combatTargetById(enemy.targetId) || nearestCombatTarget(enemy);
    const toPlayer = tmpVec.copy(target.position).sub(enemy.position);
    const distance = toPlayer.length();
    if (distance > range) {
      return;
    }
    toPlayer.y = 0;
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
    } else {
      spawnImpact(player.position, 0xff6350, 12);
    }

    player.health = Math.max(0, player.health - finalDamage);
    player.hurtTimer = 0.42;
    player.velocity.addScaledVector(direction, 4.4 + extraPush * 7);
    if (player.health <= 0) {
      handlePlayerDefeat();
    }
  }

  function handlePlayerDefeat() {
    if (localPlayerInArenaActivity()) {
      endCrownringArenaActivity("defeat");
      return;
    }
    if (game.mode === "exploration" || online.connected) {
      player.health = player.maxHealth;
      player.guard = player.maxGuard;
      player.mana = player.maxMana;
      if (game.mode === "exploration") {
        player.position.copy(game.exploration.spawn);
        if (game.exploration.horse) {
          game.exploration.horse.mounted = false;
          game.exploration.horse.position.copy(player.position).add(new THREE.Vector3(2.4, 0, 2.2));
          game.exploration.horse.velocity.set(0, 0, 0);
        }
      } else {
        const angle = Math.random() * TAU;
        const radius = 7 + Math.random() * 9;
        player.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      }
      player.velocity.set(0, 0, 0);
      player.hurtTimer = 0;
      player.group.position.copy(player.position);
      spawnImpact(player.position, 0xf7df9a, 22);
      showBanner("Respawned");
      if (game.mode === "exploration") {
        saveProgress();
      }
      sendOnlineMessage({ kind: "state", state: serializePlayerState() });
      return;
    }
    endGame();
  }

  function updateFireballs(dt) {
    for (let i = game.fireballs.length - 1; i >= 0; i -= 1) {
      const fireball = game.fireballs[i];
      fireball.life -= dt;
      const targetInfo = combatTargetById(fireball.targetId) || combatTargetById(online.localId);
      const homingTarget = tmpVec.copy(targetInfo.position);
      homingTarget.y = 0.92;
      const desiredDirection = homingTarget.sub(fireball.group.position);
      if (desiredDirection.lengthSq() > 0.0001) {
        desiredDirection.normalize();
        const currentDirection = tmpVec2.copy(fireball.velocity).normalize();
        currentDirection.lerp(desiredDirection, clamp(fireball.turnRate * dt, 0, 0.055)).normalize();
        fireball.velocity.copy(currentDirection).multiplyScalar(fireball.speed);
      }
      fireball.group.position.addScaledVector(fireball.velocity, dt);
      fireball.shell.rotation.y += dt * 7.5;
      fireball.shell.rotation.x += dt * 5.8;
      const pulse = 1 + Math.sin(clock.elapsedTime * 18 + i) * 0.14;
      fireball.shell.scale.setScalar(pulse);
      fireball.core.scale.setScalar(1.08 + Math.sin(clock.elapsedTime * 24 + i) * 0.2);

      const target = tmpVec.copy(targetInfo.position);
      target.y = 0.92;
      if (fireball.group.position.distanceTo(target) < 0.78) {
        const hitDirection = tmpVec2.copy(fireball.velocity);
        hitDirection.y = 0;
        if (hitDirection.lengthSq() > 0.0001) {
          hitDirection.normalize();
        } else {
          hitDirection.copy(forwardFromYaw(player.yaw, hitDirection)).multiplyScalar(-1);
        }
        applyCombatTargetDamage(targetInfo, fireball.damage, fireball.guardDamage, hitDirection, 0.16);
        spawnImpact(fireball.group.position, 0xff7b2e, 18);
        broadcastOnlineEffect({ type: "impact", x: fireball.group.position.x, y: fireball.group.position.y, z: fireball.group.position.z, color: 0xff7b2e, count: 18 });
        scene.remove(fireball.group);
        game.fireballs.splice(i, 1);
        continue;
      }

      if (fireball.life <= 0 || fireball.group.position.y < 0.16) {
        spawnImpact(fireball.group.position, 0xff9f42, 10);
        broadcastOnlineEffect({ type: "impact", x: fireball.group.position.x, y: fireball.group.position.y, z: fireball.group.position.z, color: 0xff9f42, count: 10 });
        scene.remove(fireball.group);
        game.fireballs.splice(i, 1);
      }
    }
  }

  function updatePotions(dt) {
    for (let i = game.potions.length - 1; i >= 0; i -= 1) {
      const potion = game.potions[i];
      const bob = Math.sin(clock.elapsedTime * 4.2 + potion.bobSeed) * 0.08;
      potion.group.position.y = 0.1 + bob;
      potion.group.rotation.y += dt * 1.4;
      potion.marker.material.opacity = 0.36 + Math.sin(clock.elapsedTime * 5.3 + potion.bobSeed) * 0.12;
      potion.glow.intensity = 0.85 + Math.sin(clock.elapsedTime * 6.1 + potion.bobSeed) * 0.18;

      if (player.health >= player.maxHealth) {
        continue;
      }

      const distance = Math.hypot(player.position.x - potion.position.x, player.position.z - potion.position.z);
      if (distance < potion.pickupRadius) {
        if (isJoinedClient()) {
          if (!potion.pickupRequested) {
            potion.pickupRequested = true;
            sendOnlineMessage({
              kind: "potionPickup",
              potionId: potion.netId,
              state: serializePlayerState()
            });
          }
          continue;
        }
        const beforeHeal = player.health;
        player.health = potion.fullHeal ? player.maxHealth : Math.min(player.maxHealth, player.health + potion.healAmount);
        const healed = Math.ceil(player.health - beforeHeal);
        spawnImpact(player.position, 0xff7f96, 18);
        broadcastOnlineEffect({ type: "impact", x: player.position.x, y: 0, z: player.position.z, color: 0xff7f96, count: 18 });
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
    const desired = tmpVec.copy(player.position).add(shoulder);
    camera.position.lerp(desired, 1 - Math.pow(0.00004, dt));
    const look = tmpVec2.copy(player.position);
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
    const wizard = player.character === "wizard";
    const resourceValue = wizard ? player.mana : player.guard;
    const resourceMax = wizard ? player.maxMana : player.maxGuard;
    const guardPct = clamp(resourceValue / resourceMax, 0, 1);
    healthFill.style.transform = "scaleX(" + hpPct.toFixed(3) + ")";
    guardFill.style.transform = "scaleX(" + guardPct.toFixed(3) + ")";
    healthText.textContent = Math.ceil(player.health);
    guardText.textContent = Math.ceil(resourceValue);
    waveLabel.textContent = localPlayerInArenaActivity()
      ? "Crownring " + Math.max(1, game.wave)
      : game.mode === "exploration" ? "Explore" : "Wave " + Math.max(1, game.wave);
    koText.textContent = game.kills;
    const level = getCharacterLevel();
    levelText.textContent = level;
    xpReadout.hidden = game.mode !== "exploration";
    kitReadout.hidden = game.mode !== "exploration";
    if (saveHint) {
      saveHint.hidden = game.mode !== "exploration";
    }
    if (game.mode === "exploration") {
      const xp = getCharacterProgress().xp;
      const levelBaseXp = xpForLevel(level);
      const nextLevelXp = xpForLevel(level + 1);
      xpText.textContent = Math.max(0, xp - levelBaseXp) + "/" + Math.max(1, nextLevelXp - levelBaseXp);
      kitText.textContent = currentKitText();
    } else {
      xpText.textContent = "0";
      kitText.textContent = "";
    }
    const tuning = combatTuningFor();
    updateAbilityLocks();
    attackIcon.classList.toggle("active", player.attacking && (player.attackKind === "slash" || player.attackKind === "lightning"));
    blockIcon.classList.toggle("active", wizard ? player.attacking && player.attackKind === "burst" : player.blocking);
    blockIcon.classList.toggle("ready", wizard && hasAbility("burst") && !player.attacking && player.secondaryCooldown <= 0 && player.mana >= tuning.burstManaCost);
    potionIcon.classList.toggle("active", !wizard && player.attacking && player.attackKind === "bash");
    potionIcon.classList.toggle("ready", wizard ? hasAbility("potion") && player.potionCooldown <= 0 : hasAbility("bash") && !player.attacking && player.attackCooldown <= 0 && player.guard >= tuning.bashGuardCost);
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
        if (!localPlayerInArenaActivity()) {
          updateQuestItems(dt);
          updateHorse(dt);
          updateTalkPrompt();
          game.questMapTimer -= dt;
          if (game.questMapTimer <= 0) {
            game.questMapTimer = QUEST_MAP_UPDATE_INTERVAL;
            updateQuestMap();
          }
        } else {
          talkPrompt.hidden = true;
        }
        game.saveTimer += dt;
        if (game.saveTimer >= 4) {
          game.saveTimer = 0;
          saveProgress();
        }
      }
      updateParticles(dt);
      updateOnline(dt);
      updateCamera(dt);
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
    window.addEventListener("keydown", event => {
      if (event.repeat && event.code !== "Space" && questDialog.hidden) return;
      if (!questDialog.hidden) {
        handleQuestDialogKey(event);
        return;
      }
      if (event.code === "Escape") {
        event.preventDefault();
        if (game.state === "playing") {
          openSessionMenu();
        } else if (game.state === "paused") {
          resumeSession();
        }
        return;
      }
      if (game.state !== "playing") {
        return;
      }
      if (event.code === "KeyY" && localPlayerInArenaActivity()) {
        event.preventDefault();
        endCrownringArenaActivity("yield");
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
        } else {
          startAttack();
        }
      }
      if (event.code === "KeyK") {
        event.preventDefault();
        startSecondaryAbility();
      }
      if (event.code === "KeyH" || event.code === "KeyL") {
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
      if (game.state !== "playing" || !questDialog.hidden) return;
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

    window.addEventListener("mousemove", event => {
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
    questServiceButton.addEventListener("click", startCrownringArenaActivity);
    questCloseButton.addEventListener("click", closeQuestDialog);

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
