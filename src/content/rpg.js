export const knightBashGuardCost = 30;
export const wizardLightningManaCost = 42;
export const wizardBurstManaCost = 32;
export const rangerArrowFocusCost = 16;
export const rangerPierceFocusCost = 34;
export const rangerRollFocusCost = 22;
export const progressStorageKey = "ironholdProgressV2";

export const defaultWeaponByCharacter = {
  knight: "knight_arming_sword",
  wizard: "wizard_oak_staff",
  ranger: "ranger_ash_bow"
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
    summary: "+dmg +focus / costlier -speed",
    // Sidegrade vs Ash Bow: harder-hitting, costlier arrows.
    tuning: {
      arrowDamageBonus: 5,
      arrowFocusCost: 18,
      pierceDamageMin: 44,
      kitManaBonus: 8,
      kitMoveSpeedMul: 0.97
    }
  },
  ranger_briarstring_bow: {
    character: "ranger",
    name: "Briarstring Bow",
    summary: "+range +regen / cheap rolls",
    tuning: {
      arrowDamageBonus: 2,
      arrowLife: 1.75,
      pierceFocusCost: 30,
      rollFocusCost: 20,
      kitManaRegenMul: 1.07
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
      lightningManaCost: 50,
      lightningTurnRate: 0.55,
      burstDamageMin: 28,
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
      burstManaCost: 28,
      pierceFocusCost: 31,
      partingFocusCost: 22
    }
  },
  briarfall_pathcraft: {
    name: "Briarfall Pathcraft",
    tuning: {
      bashGuardCost: 27,
      burstManaCost: 29,
      rollFocusCost: 20
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
  lightningDamageMin: 28,
  lightningDamageSpread: 6,
  lightningDamageBonus: 0,
  lightningTurnRate: 0.7,
  lightningLife: 2.45,
  remoteLightningRange: 14.5,
  burstManaCost: wizardBurstManaCost,
  burstDamageMin: 24,
  burstDamageSpread: 6,
  arrowFocusCost: rangerArrowFocusCost,
  arrowDamageMin: 18,
  arrowDamageSpread: 6,
  arrowDamageBonus: 0,
  arrowSpeed: 26,
  arrowLife: 1.5,
  pierceFocusCost: rangerPierceFocusCost,
  pierceDamageMin: 38,
  pierceDamageSpread: 8,
  rollFocusCost: rangerRollFocusCost,
  // Level 5-9 kit expansion. Utility slot (F key): resolve / frostbind / parting.
  // Payoff slot (C key): sweep / stormcrown / heartseeker.
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
  stormcrownManaCost: 56,
  stormcrownCooldown: 9,
  stormcrownRadius: 5.2,
  stormcrownDamageMin: 36,
  stormcrownDamageSpread: 8,
  partingFocusCost: 24,
  partingCooldown: 5,
  partingDamageMin: 14,
  partingDamageSpread: 4,
  heartseekerFocusCost: 40,
  heartseekerCooldown: 4,
  heartseekerDamageMin: 48,
  heartseekerDamageSpread: 12,
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
  block: 1,
  roll: 1,
  bash: 3,
  burst: 3,
  pierce: 3,
  potion: 5,
  resolve: 5,
  parting: 5,
  frostbind: 6,
  heartseeker: 7,
  sweep: 8,
  stormcrown: 9
};

export const abilityDisplayNames = {
  slash: "Sword slash",
  lightning: "Lightning ball",
  arrow: "Arrow shot",
  block: "Shield block",
  roll: "Tumble roll",
  bash: "Shield bash",
  burst: "Arcane burst",
  pierce: "Piercing shot",
  potion: "Potion drop",
  resolve: "Warden's Resolve",
  sweep: "Sweeping Cut",
  frostbind: "Frostbind Bolt",
  stormcrown: "Crown of Storms",
  parting: "Parting Shot",
  heartseeker: "Heartseeker"
};

export function xpForLevel(level) {
  const steps = Math.max(0, Math.floor(level) - 1);
  return steps * 65 + (steps * (steps - 1) / 2) * 20;
}
