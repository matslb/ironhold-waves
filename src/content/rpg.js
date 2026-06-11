export const knightBashGuardCost = 30;
export const wizardLightningManaCost = 42;
export const wizardBurstManaCost = 32;
export const rangerArrowFocusCost = 14;
export const rangerPierceFocusCost = 34;
export const rangerRollFocusCost = 22;
export const progressStorageKey = "ironholdProgressV2";

export const defaultWeaponByCharacter = {
  knight: "knight_arming_sword",
  wizard: "wizard_oak_staff",
  ranger: "ranger_ash_bow"
};

export const equipmentDefs = {
  knight_arming_sword: {
    character: "knight",
    name: "Arming Sword",
    tuning: {}
  },
  knight_roadwarden_blade: {
    character: "knight",
    name: "Roadwarden Blade",
    tuning: {
      slashRange: 2.75,
      slashDamageBonus: 2,
      guardOnSlashHit: 8
    }
  },
  knight_crownring_maul: {
    character: "knight",
    name: "Crownring Maul",
    // Sidegrade vs Roadwarden Blade: raw damage and knockback, but shorter
    // reach and no guard recovery on hit.
    tuning: {
      slashRange: 2.4,
      slashDamageBonus: 7,
      slashKnockback: 0.62,
      guardOnSlashHit: 0,
      bashDamageMin: 22,
      bashKnockback: 1.3
    }
  },
  wizard_oak_staff: {
    character: "wizard",
    name: "Oak Staff",
    tuning: {}
  },
  wizard_wayfinder_focus: {
    character: "wizard",
    name: "Wayfinder Focus",
    tuning: {
      lightningDamageBonus: 2
    }
  },
  ranger_ash_bow: {
    character: "ranger",
    name: "Ash Bow",
    tuning: {}
  },
  ranger_crownring_recurve: {
    character: "ranger",
    name: "Crownring Recurve",
    // Sidegrade vs Ash Bow: harder-hitting, costlier arrows.
    tuning: {
      arrowDamageBonus: 5,
      arrowFocusCost: 18,
      pierceDamageMin: 44
    }
  },
  wizard_stormcall_rod: {
    character: "wizard",
    name: "Stormcall Rod",
    // Sidegrade vs Wayfinder Focus: heavier lightning and burst, but costlier
    // casts and much weaker projectile homing.
    tuning: {
      lightningDamageBonus: 5,
      lightningManaCost: 50,
      lightningTurnRate: 0.55,
      burstDamageMin: 28
    }
  }
};

export const perkDefs = {
  crownford_drill: {
    name: "Crownford Drill",
    tuning: {
      bashGuardCost: 25,
      burstManaCost: 28
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
  lightningDamageMin: 31,
  lightningDamageSpread: 6,
  lightningDamageBonus: 0,
  lightningTurnRate: 0.85,
  lightningLife: 2.45,
  remoteLightningRange: 14.5,
  burstManaCost: wizardBurstManaCost,
  burstDamageMin: 24,
  burstDamageSpread: 6,
  arrowFocusCost: rangerArrowFocusCost,
  arrowDamageMin: 26,
  arrowDamageSpread: 6,
  arrowDamageBonus: 0,
  arrowSpeed: 26,
  arrowLife: 1.5,
  pierceFocusCost: rangerPierceFocusCost,
  pierceDamageMin: 38,
  pierceDamageSpread: 8,
  rollFocusCost: rangerRollFocusCost
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
  potion: 5
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
  potion: "Potion drop"
};

export function xpForLevel(level) {
  const steps = Math.max(0, Math.floor(level) - 1);
  return steps * 65 + (steps * (steps - 1) / 2) * 20;
}
