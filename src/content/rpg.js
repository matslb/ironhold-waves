export const knightBashGuardCost = 30;
export const wizardLightningManaCost = 46;
export const wizardBurstManaCost = 36;
export const rangerArrowFocusCost = 18;
export const rangerPierceFocusCost = 38;
export const rangerRollFocusCost = 22;
export const sentinelShoveVigorCost = 16;
export const sentinelMoulinetVigorCost = 26;
export const progressStorageKey = "ironholdProgressV2";

export const defaultWeaponByCharacter = {
  knight: "knight_arming_sword",
  wizard: "wizard_oak_staff",
  ranger: "ranger_ash_bow",
  sentinel: "sentinel_ironshod_halberd"
};

// Each kit has combat tuning plus at most 1-2 light stat modifiers (kit*
// keys) so swapping kits is a build choice. `summary` is the compact UI tag
// line shown in the kit readout; keep it short.
export const equipmentDefs = {
  knight_arming_sword: {
    character: "knight",
    name: "Arming Sword",
    summary: "Balanced",
    tuning: {}
  },
  knight_roadwarden_blade: {
    character: "knight",
    name: "Roadwarden Blade",
    summary: "+reach +guard on hit",
    tuning: {
      slashRange: 2.75,
      slashDamageBonus: 2,
      guardOnSlashHit: 8,
      kitGuardBonus: 6
    }
  },
  knight_crownring_maul: {
    character: "knight",
    name: "Crownring Maul",
    summary: "+dmg +HP / -reach -speed",
    // Sidegrade vs Roadwarden Blade: raw damage and knockback, but shorter
    // reach and no guard recovery on hit.
    tuning: {
      slashRange: 2.4,
      slashDamageBonus: 7,
      slashKnockback: 0.62,
      guardOnSlashHit: 0,
      bashDamageMin: 22,
      bashKnockback: 1.3,
      kitHealthBonus: 8,
      kitMoveSpeedMul: 0.96
    }
  },
  knight_briarfall_hookblade: {
    character: "knight",
    name: "Briarfall Hookblade",
    summary: "+bash +speed / -reach",
    // Woodland sidegrade: more control and bash value, less raw reach than the
    // Roadwarden Blade.
    tuning: {
      slashRange: 2.58,
      slashDamageBonus: 1,
      slashKnockback: 0.7,
      bashDamageMin: 21,
      bashKnockback: 1.42,
      kitMoveSpeedMul: 1.04
    }
  },
  wizard_oak_staff: {
    character: "wizard",
    name: "Oak Staff",
    summary: "Balanced",
    tuning: {}
  },
  wizard_wayfinder_focus: {
    character: "wizard",
    name: "Wayfinder Focus",
    summary: "+bolt dmg +regen",
    tuning: {
      lightningDamageBonus: 2,
      kitManaRegenMul: 1.08
    }
  },
  wizard_briar_focus: {
    character: "wizard",
    name: "Briar Focus",
    summary: "+burst +HP / costlier bolts",
    // Converts some long-range efficiency into stronger close magic.
    tuning: {
      lightningManaCost: 46,
      lightningDamageBonus: 1,
      burstManaCost: 28,
      burstDamageMin: 29,
      kitHealthBonus: 6
    }
  },
  ranger_ash_bow: {
    character: "ranger",
    name: "Ash Bow",
    summary: "Balanced",
    tuning: {}
  },
  ranger_crownring_recurve: {
    character: "ranger",
    name: "Crownring Recurve",
    summary: "+flame dmg +focus / costlier -speed",
    // Sidegrade vs Ash Bow: harder-hitting, costlier arrows.
    tuning: {
      arrowDamageBonus: 5,
      arrowFocusCost: 21,
      pierceDamageMin: 38,
      kitManaBonus: 8,
      kitMoveSpeedMul: 0.97
    }
  },
  ranger_briarstring_bow: {
    character: "ranger",
    name: "Briarstring Bow",
    summary: "+range +regen / cheap rolls +flame",
    tuning: {
      arrowDamageBonus: 2,
      arrowLife: 1.75,
      pierceFocusCost: 34,
      rollFocusCost: 20,
      kitManaRegenMul: 1.07
    }
  },
  sentinel_ironshod_halberd: {
    character: "sentinel",
    name: "Ironshod Halberd",
    summary: "Balanced",
    tuning: {}
  },
  sentinel_crownring_partisan: {
    character: "sentinel",
    name: "Crownring Partisan",
    summary: "+thrust dmg +reach +HP / costlier shove -speed",
    // Sidegrade vs Ironshod Halberd: a longer, heavier parade-ground point.
    // More reach and thrust damage, but the haft work costs more and slows you.
    tuning: {
      thrustDamageBonus: 4,
      thrustRange: 3.9,
      shoveVigorCost: 20,
      skewerDamageMin: 38,
      kitHealthBonus: 6,
      kitMoveSpeedMul: 0.97
    }
  },
  wizard_stormcall_rod: {
    character: "wizard",
    name: "Stormcall Rod",
    summary: "+dmg +magica / costlier -homing",
    // Sidegrade vs Wayfinder Focus: heavier lightning and burst, but costlier
    // casts and much weaker projectile homing.
    tuning: {
      lightningDamageBonus: 5,
      lightningManaCost: 54,
      lightningTurnRate: 0.55,
      burstDamageMin: 25,
      kitManaBonus: 10,
      kitMoveSpeedMul: 0.97
    }
  }
};

export const perkDefs = {
  crownford_drill: {
    name: "Crownford Drill",
    tuning: {
      bashGuardCost: 25,
      burstManaCost: 32,
      pierceFocusCost: 35,
      partingFocusCost: 22,
      shoveVigorCost: 14
    }
  },
  briarfall_pathcraft: {
    name: "Briarfall Pathcraft",
    tuning: {
      bashGuardCost: 27,
      burstManaCost: 33,
      rollFocusCost: 20,
      moulinetVigorCost: 23
    }
  }
};

export const defaultCombatTuning = {
  slashRange: 2.55,
  slashDamageMin: 32,
  slashDamageSpread: 8,
  slashDamageBonus: 0,
  slashKnockback: 0.42,
  guardOnSlashHit: 6,
  bashGuardCost: knightBashGuardCost,
  bashDamageMin: 18,
  bashDamageSpread: 5,
  bashKnockback: 1.16,
  bashVelocity: 6.4,
  lightningManaCost: wizardLightningManaCost,
  lightningDamageMin: 25,
  lightningDamageSpread: 6,
  lightningDamageBonus: 0,
  lightningTurnRate: 0.7,
  lightningLife: 2.45,
  remoteLightningRange: 14.5,
  burstManaCost: wizardBurstManaCost,
  burstDamageMin: 24,
  burstDamageSpread: 6,
  arrowFocusCost: rangerArrowFocusCost,
  arrowDamageMin: 14,
  arrowDamageSpread: 6,
  arrowDamageBonus: 0,
  arrowSpeed: 26,
  arrowLife: 1.5,
  pierceFocusCost: rangerPierceFocusCost,
  pierceDamageMin: 30,
  pierceDamageSpread: 8,
  // Flaming Arrow burn: a short ember tick on each enemy the shaft passes
  // through. Total burn (ticks * tick damage) plus the base shift above keeps
  // the ability near its old single-target value while honoring the fire
  // fantasy. Host-authoritative; ticks resolve through damageEnemy.
  pierceBurnTicks: 3,
  pierceBurnTickDamage: 2,
  pierceBurnTickInterval: 0.8,
  rollFocusCost: rangerRollFocusCost,
  // Sentinel halberd kit. Vigor reuses the mana fields. Thrust is the free
  // bread-and-butter poke; everything else spends vigor.
  thrustRange: 3.6,
  thrustDamageMin: 24,
  thrustDamageSpread: 6,
  thrustDamageBonus: 0,
  thrustKnockback: 0.35,
  shoveVigorCost: sentinelShoveVigorCost,
  shoveDamageMin: 8,
  shoveDamageSpread: 4,
  shoveStun: 0.35,
  shoveVelocity: 7.5,
  moulinetVigorCost: sentinelMoulinetVigorCost,
  moulinetRadius: 3.0,
  moulinetDamageMin: 18,
  moulinetDamageSpread: 6,
  moulinetCooldown: 1.15,
  hookVigorCost: 22,
  hookCooldown: 7,
  hookRange: 7.5,
  hookDamageMin: 8,
  hookDamageSpread: 4,
  hookStun: 0.7,
  hookPull: 6.5,
  skewerVigorCost: 34,
  skewerCooldown: 8,
  skewerRange: 6.0,
  skewerDamageMin: 34,
  skewerDamageSpread: 9,
  // Level 5-9 kit expansion. Utility slot (F key): resolve / frostbind / parting / hook.
  // Payoff slot (C key): sweep / stormcrown / heartseeker / skewer.
  resolveCooldown: 16,
  resolveDuration: 4,
  resolveDamageTaken: 0.65,
  sweepGuardCost: 24,
  sweepCooldown: 6,
  sweepRange: 3.2,
  sweepDamageMin: 22,
  sweepDamageSpread: 6,
  sweepStun: 0.45,
  frostbindManaCost: 36,
  frostbindCooldown: 5,
  frostbindDamageMin: 12,
  frostbindDamageSpread: 4,
  frostbindStun: 1.5,
  stormcrownManaCost: 62,
  stormcrownCooldown: 9,
  stormcrownRadius: 5.2,
  stormcrownDamageMin: 36,
  stormcrownDamageSpread: 8,
  partingFocusCost: 24,
  partingCooldown: 5,
  partingDamageMin: 14,
  partingDamageSpread: 4,
  heartseekerFocusCost: 44,
  heartseekerCooldown: 4,
  heartseekerDamageMin: 44,
  heartseekerDamageSpread: 12,
  // Wizard healer identity: the Healing Draught drop is the wizard's first
  // upgradable ability. Tiers are gated by character level (host-authoritative
  // heal/cooldown/radius replicate via the existing potion drop + snapshot).
  wizardPotionHealT1: 24,
  wizardPotionHealT2: 32,
  wizardPotionHealT3: 42,
  wizardPotionCooldownT1: 16,
  wizardPotionCooldownT2: 13,
  wizardPotionCooldownT3: 10,
  wizardPotionRadiusT1: 1.0,
  wizardPotionRadiusT2: 1.4,
  wizardPotionRadiusT3: 1.8,
  wizardPotionTier2Level: 3,
  wizardPotionTier3Level: 7,
  wizardPotionSplashHeal: 14,
  wizardPotionCooldownFloor: 7,
  // Kit stat identity defaults (overridden per kit in equipmentDefs).
  kitHealthBonus: 0,
  kitGuardBonus: 0,
  kitManaBonus: 0,
  kitManaRegenMul: 1,
  kitMoveSpeedMul: 1
};

export const abilityUnlockLevels = {
  slash: 1,
  lightning: 1,
  arrow: 1,
  thrust: 1,
  block: 1,
  roll: 1,
  shove: 1,
  potion: 1,
  bash: 3,
  pierce: 3,
  moulinet: 3,
  burst: 4,
  resolve: 5,
  parting: 5,
  frostbind: 5,
  hook: 5,
  heartseeker: 7,
  sweep: 8,
  stormcrown: 8,
  skewer: 8
};

export const abilityDisplayNames = {
  slash: "Sword slash",
  lightning: "Lightning ball",
  arrow: "Quick Shot",
  block: "Shield block",
  roll: "Tumble roll",
  bash: "Shield bash",
  burst: "Arcane burst",
  pierce: "Flaming Arrow",
  potion: "Healing Draught",
  resolve: "Warden's Resolve",
  sweep: "Sweeping Cut",
  frostbind: "Frostbind Bolt",
  stormcrown: "Crown of Storms",
  parting: "Parting Shot",
  heartseeker: "Heartseeker",
  thrust: "Halberd Thrust",
  shove: "Haft Shove",
  moulinet: "Moulinet",
  hook: "Billhook Pull",
  skewer: "Skewer Charge"
};

// One-line help descriptions, keyed by ability id. Mechanics first, flavor
// second; describe behavior, not tuning values (exact numbers live in the
// Help panel's kit tuning readout and shift during balance passes). New
// abilities should land here alongside their abilityDisplayNames entry.
export const abilityDescriptions = {
  slash: "Quick sword arc that bites everything in front of you; every clean hit steadies your guard.",
  block: "Hold to raise the shield: frontal blows wear down guard instead of health, though guard drains while you hold the wall.",
  bash: "Spend guard to slam the shield forward, knocking enemies back hard and buying the line a breath.",
  resolve: "Plant your feet for a few seconds of hardened resolve: every blow lands softer and guard keeps recovering even while you block.",
  sweep: "Spend guard on a wide waist-high cut that staggers and pushes back everything across your front.",
  lightning: "Hurl a crackling bolt that bends toward its mark mid-flight and jolts whatever it strikes.",
  burst: "Detonate raw magic around your own body, throwing back everything that crowds the caster.",
  potion: "Set a healing draught at your heels that you or any wounded companion can claim; it heals more, recharges faster, and reaches farther as you level.",
  frostbind: "Loose a straight bolt of binding frost that pierces through a line of enemies and holds each one in place for a breath.",
  stormcrown: "Call the storm down in a crown around the caster, blasting and scattering every enemy near you.",
  arrow: "Loose a cheap, fast arrow dead straight along your aim - no homing, just your eye.",
  roll: "Spend focus to tumble in your movement direction; it repositions your feet but stops no blows.",
  pierce: "Drive an ember-tipped shaft through a whole line of enemies, leaving each one burning for a moment.",
  parting: "Fire a point-blank shot that kicks nearby enemies away while springing you backward out of reach.",
  heartseeker: "Draw a single heavy arrow that flies faster and hits far harder than a Quick Shot - one precise, staggering payoff.",
  thrust: "Free long-reaching jab down the haft line - narrow as a fence rail, so square your point first.",
  shove: "Push the haft wide at arm's length, staggering and shoving back whatever presses in - your space-maker.",
  moulinet: "Whirl the halberd in a full circle, cutting everything around you; the answer to being surrounded.",
  hook: "Catch the nearest enemy along your spear-line with the billhook and drag it onto your point, briefly stunned.",
  skewer: "Lunge forward on a burst of speed, skewering everything caught along the charge line."
};

export function xpForLevel(level) {
  const steps = Math.max(0, Math.floor(level) - 1);
  return steps * 65 + (steps * (steps - 1) / 2) * 20;
}
