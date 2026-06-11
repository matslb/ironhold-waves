export const knightBashGuardCost = 30;
export const wizardLightningManaCost = 42;
export const wizardBurstManaCost = 32;
export const progressStorageKey = "ironholdProgressV2";

export const defaultWeaponByCharacter = {
  knight: "knight_arming_sword",
  wizard: "wizard_oak_staff"
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
  burstDamageSpread: 6
};

export const abilityUnlockLevels = {
  slash: 1,
  lightning: 1,
  block: 1,
  bash: 3,
  burst: 3,
  potion: 5
};

export const abilityDisplayNames = {
  slash: "Sword slash",
  lightning: "Lightning ball",
  block: "Shield block",
  bash: "Shield bash",
  burst: "Arcane burst",
  potion: "Potion drop"
};

export function xpForLevel(level) {
  const steps = Math.max(0, Math.floor(level) - 1);
  return steps * 65 + (steps * (steps - 1) / 2) * 20;
}
