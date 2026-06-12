import { defaultCombatTuning } from "./rpg.js";

export const helpClassGuide = [
  {
    character: "knight",
    tagline: "Frontline duelist with sword and shield. Guard absorbs hits while blocking and recovers between fights.",
    abilities: [
      { id: "slash", keys: "LMB / Space" },
      { id: "block", keys: "Hold RMB / K" },
      { id: "bash", keys: "MMB / J" },
      { id: "resolve", keys: "F" },
      { id: "sweep", keys: "C" }
    ]
  },
  {
    character: "wizard",
    tagline: "Healer-support caster. Drops a shared Healing Draught the whole party can grab - it heals more, recharges faster, and reaches farther as you level. Backs it with light magic and crowd control. Lightly built - support from the back line.",
    abilities: [
      { id: "potion", keys: "MMB / H" },
      { id: "lightning", keys: "LMB / Space / J" },
      { id: "burst", keys: "RMB / K" },
      { id: "frostbind", keys: "F" },
      { id: "stormcrown", keys: "C" }
    ]
  },
  {
    character: "ranger",
    tagline: "Skirmisher with bow, Flaming Arrow, and a Focus-powered dodge. Lightly armored; win by spacing, timing, and clean lanes.",
    abilities: [
      { id: "arrow", keys: "LMB / Space", note: "cheap single-target arrow." },
      { id: "roll", keys: "RMB / K", note: "spend Focus to dodge in your movement direction; it does not block hits." },
      { id: "pierce", keys: "MMB / J", note: "fires an ember-tipped arrow that punches through a narrow line of enemies." },
      { id: "parting", keys: "F" },
      { id: "heartseeker", keys: "C" }
    ]
  }
];

const helpTuningLabels = {
  slashRange: "Slash reach",
  slashDamageMin: "Slash base damage",
  slashDamageSpread: "Slash damage spread",
  slashDamageBonus: "Slash damage bonus",
  slashKnockback: "Slash knockback",
  guardOnSlashHit: "Guard on slash hit",
  bashGuardCost: "Shield bash guard cost",
  bashDamageMin: "Shield bash base damage",
  bashDamageSpread: "Shield bash damage spread",
  bashKnockback: "Shield bash knockback",
  bashVelocity: "Shield bash lunge",
  lightningManaCost: "Lightning magica cost",
  lightningDamageMin: "Lightning base damage",
  lightningDamageSpread: "Lightning damage spread",
  lightningDamageBonus: "Lightning damage bonus",
  lightningTurnRate: "Lightning homing",
  lightningLife: "Lightning duration",
  remoteLightningRange: "Remote lightning range",
  burstManaCost: "Arcane burst magica cost",
  burstDamageMin: "Arcane burst base damage",
  burstDamageSpread: "Arcane burst damage spread",
  arrowFocusCost: "Quick Shot focus cost",
  arrowDamageMin: "Quick Shot base damage",
  arrowDamageSpread: "Quick Shot damage spread",
  arrowDamageBonus: "Quick Shot damage bonus",
  arrowSpeed: "Quick Shot speed",
  arrowLife: "Quick Shot duration",
  pierceFocusCost: "Flaming Arrow focus cost",
  pierceDamageMin: "Flaming Arrow base damage",
  pierceDamageSpread: "Flaming Arrow damage spread",
  rollFocusCost: "Roll focus cost",
  resolveCooldown: "Resolve cooldown",
  resolveDuration: "Resolve duration",
  resolveDamageTaken: "Resolve damage taken",
  sweepGuardCost: "Sweeping Cut guard cost",
  sweepCooldown: "Sweeping Cut cooldown",
  sweepRange: "Sweeping Cut range",
  sweepDamageMin: "Sweeping Cut base damage",
  sweepDamageSpread: "Sweeping Cut damage spread",
  sweepStun: "Sweeping Cut stun",
  frostbindManaCost: "Frostbind magica cost",
  frostbindCooldown: "Frostbind cooldown",
  frostbindDamageMin: "Frostbind base damage",
  frostbindDamageSpread: "Frostbind damage spread",
  frostbindStun: "Frostbind bind time",
  stormcrownManaCost: "Crown of Storms magica cost",
  stormcrownCooldown: "Crown of Storms cooldown",
  stormcrownRadius: "Crown of Storms radius",
  stormcrownDamageMin: "Crown of Storms base damage",
  stormcrownDamageSpread: "Crown of Storms damage spread",
  partingFocusCost: "Parting Shot focus cost",
  partingCooldown: "Parting Shot cooldown",
  partingDamageMin: "Parting Shot base damage",
  partingDamageSpread: "Parting Shot damage spread",
  heartseekerFocusCost: "Heartseeker focus cost",
  heartseekerCooldown: "Heartseeker cooldown",
  heartseekerDamageMin: "Heartseeker base damage",
  heartseekerDamageSpread: "Heartseeker damage spread",
  kitHealthBonus: "Max health",
  kitGuardBonus: "Max guard",
  kitManaBonus: "Max magica/focus",
  kitManaRegenMul: "Magica/focus regen",
  kitMoveSpeedMul: "Move speed"
};

export const helpSourceLabels = {
  knight_arming_sword: "starting kit",
  wizard_oak_staff: "starting kit",
  ranger_ash_bow: "starting kit",
  knight_roadwarden_blade: "Quiet the Road",
  wizard_wayfinder_focus: "Quiet the Road",
  knight_crownring_maul: "First Bell of the Crownring",
  wizard_stormcall_rod: "First Bell of the Crownring",
  ranger_crownring_recurve: "First Bell of the Crownring",
  knight_briarfall_hookblade: "Rootmaws on the Timber Road",
  wizard_briar_focus: "Rootmaws on the Timber Road",
  ranger_briarstring_bow: "Rootmaws on the Timber Road",
  crownford_drill: "The Beacon Writs",
  briarfall_pathcraft: "Rootmaws on the Timber Road"
};

export const helpPermanentRewardItems = [
  { label: "Greenfire Remedies", text: "+12 max health, full heal, and XP." },
  { label: "Quiet the Road", text: "Roadwarden Blade for knights, Wayfinder Focus for wizards, +8 max guard, +8 max magica/focus, and XP." },
  { label: "Map the Hearths", text: "Full recovery potion, -4s wizard potion-drop cooldown, and XP." },
  { label: "Silk in the Sand", text: "+6 max health, field potion, and XP." },
  { label: "Smoke on the Peaks", text: "+10 max magica/focus, +6 max guard, and XP." },
  { label: "Lights in the Mist", text: "+8 max magica/focus, +5 max health, and XP." },
  { label: "Rootmaws on the Timber Road", text: "Briarfall kits for all classes, Briarfall Pathcraft perk, +4 max health, +5 max guard, +5 max magica/focus, field potion, and XP." },
  { label: "Relics Under Reed", text: "Full recovery potion, full restore, and XP." },
  { label: "Hooves for the Long Road", text: "Loyal horse mount and XP." },
  { label: "Shoes for the Long Road", text: "Roadwarden Tack, faster mounted travel, and XP." },
  { label: "The Beacon Writs", text: "Crownford Drill perk, +6 max guard, +6 max magica/focus, and XP." },
  { label: "Sanctuary Lamps", text: "+8 max health, field potion, and XP." },
  { label: "First Bell of the Crownring", text: "Crownring kits for all classes, +5 max health, +5 max guard, +5 max magica/focus, field potion, and XP." },
  { label: "Bellwater Underworks", text: "+3 max health, +3 max guard, +3 max magica/focus on first clear, plus shared XP." },
  { label: "Siltwell Cistern", text: "+4 max health, +2 max guard, +2 max magica/focus on first clear, plus shared XP." }
];

function formatHelpNumber(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return String(value);
  }
  if (Math.abs(value - Math.round(value)) < 0.001) {
    return String(Math.round(value));
  }
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatTuningValue(key, value) {
  const amount = formatHelpNumber(value);
  if (key.endsWith("Mul")) {
    return "x" + amount;
  }
  if (key.endsWith("Cooldown") || key.endsWith("Duration") || key.endsWith("Stun") || key.endsWith("Life")) {
    return amount + "s";
  }
  if (key.endsWith("Range") || key.endsWith("Radius")) {
    return amount + "m";
  }
  return amount;
}

function formatTuningLine(key, value) {
  const label = helpTuningLabels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, char => char.toUpperCase());
  const base = defaultCombatTuning[key];
  const valueText = formatTuningValue(key, value);
  if (base !== undefined && base !== value) {
    return label + " " + valueText + " (base " + formatTuningValue(key, base) + ")";
  }
  return label + " " + valueText;
}

export function formatTuningSummary(tuning) {
  const entries = Object.entries(tuning || {});
  if (!entries.length) {
    return "standard tuning";
  }
  return entries.map(([key, value]) => formatTuningLine(key, value)).join("; ");
}
