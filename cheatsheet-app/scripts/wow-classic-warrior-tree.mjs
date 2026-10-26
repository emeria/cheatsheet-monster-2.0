// Writes src/data/trees/wow-classic-warrior.tree.json and its default grid layout (stable-save form).
// The talent tables below are the source of truth: edit them and rerun, never the JSON.
// Checked against the Classic Era client's talent data (wago.tools) and Wowhead's talent calculator.
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] || path.join(import.meta.dirname, '..', 'src', 'data', 'trees');

// [id, name, ranks, tier, col, text, values, tags]
const T = {
  arms: [
    ['improved-heroic-strike', 'Improved Heroic Strike', 3, 1, 1, 'Reduces the cost of Heroic Strike by {0} rage.', [1, 2, 3], ['res:rage']],
    ['deflection', 'Deflection', 5, 1, 2, 'Increases your chance to parry by {0}%.', [1, 2, 3, 4, 5], ['role:defence']],
    ['improved-rend', 'Improved Rend', 3, 1, 3, 'Increases the bleed damage done by Rend by {0}%.', [15, 25, 35], ['dmg:bleed']],
    ['improved-charge', 'Improved Charge', 2, 2, 1, 'Charge generates {0} more rage.', [3, 6], ['res:rage']],
    ['tactical-mastery', 'Tactical Mastery', 5, 2, 2, 'You keep up to {0} rage when you change stances.', [5, 10, 15, 20, 25], ['res:rage']],
    ['improved-thunder-clap', 'Improved Thunder Clap', 3, 2, 4, 'Reduces the cost of Thunder Clap by {0} rage.', [1, 2, 4], ['res:rage']],
    ['improved-overpower', 'Improved Overpower', 2, 3, 1, 'Increases the critical strike chance of Overpower by {0}%.', [25, 50], ['dmg:physical', 'stat:crit']],
    ['anger-management', 'Anger Management', 1, 3, 2, 'Generates 1 rage every 3 sec.', null, ['res:rage']],
    ['deep-wounds', 'Deep Wounds', 3, 3, 3, 'Your critical strikes make the target bleed for {0}% of your weapon\'s average damage over 12 sec.', [20, 40, 60], ['dmg:bleed']],
    ['two-handed-weapon-specialization', 'Two-Handed Weapon Specialization', 5, 4, 2, 'Increases the damage you deal with two-handed weapons by {0}%.', [1, 2, 3, 4, 5], ['dmg:physical', 'weapon:two-hand']],
    ['impale', 'Impale', 2, 4, 3, 'Increases the critical strike damage bonus of your abilities in Battle, Defensive and Berserker stance by {0}%.', [10, 20], ['dmg:physical', 'stat:crit']],
    ['axe-specialization', 'Axe Specialization', 5, 5, 1, 'Increases your chance to get a critical strike with axes by {0}%.', [1, 2, 3, 4, 5], ['stat:crit', 'weapon:axe']],
    ['sweeping-strikes', 'Sweeping Strikes', 1, 5, 2, 'Your next 5 melee attacks strike an additional nearby opponent.', null, ['role:ability', 'dmg:physical']],
    ['mace-specialization', 'Mace Specialization', 5, 5, 3, 'Gives you a {0}% chance to stun your target for 3 sec with a mace.', [1, 2, 3, 4, 6], ['role:control', 'weapon:mace']],
    ['sword-specialization', 'Sword Specialization', 5, 5, 4, 'Gives you a {0}% chance to get an extra attack on the same target after dealing damage with a sword.', [1, 2, 3, 4, 5], ['dmg:physical', 'weapon:sword']],
    ['polearm-specialization', 'Polearm Specialization', 5, 6, 1, 'Increases your chance to get a critical strike with polearms by {0}%.', [1, 2, 3, 4, 5], ['stat:crit', 'weapon:polearm']],
    ['improved-hamstring', 'Improved Hamstring', 3, 6, 3, 'Gives your Hamstring a {0}% chance to immobilize the target for 5 sec.', [5, 10, 15], ['role:control']],
    ['mortal-strike', 'Mortal Strike', 1, 7, 2, 'A vicious strike that deals weapon damage plus 85 and wounds the target, reducing the healing it receives by 50% for 10 sec.', null, ['role:ability', 'role:capstone', 'dmg:physical']],
  ],
  fury: [
    ['booming-voice', 'Booming Voice', 5, 1, 2, 'Increases the area and duration of your Battle Shout and Demoralizing Shout by {0}%.', [10, 20, 30, 40, 50], ['role:shout']],
    ['cruelty', 'Cruelty', 5, 1, 3, 'Increases your chance to get a critical strike with melee weapons by {0}%.', [1, 2, 3, 4, 5], ['stat:crit']],
    ['improved-demoralizing-shout', 'Improved Demoralizing Shout', 5, 2, 2, 'Increases the melee attack power reduction of Demoralizing Shout by {0}%.', [8, 16, 24, 32, 40], ['role:shout', 'role:defence']],
    ['unbridled-wrath', 'Unbridled Wrath', 5, 2, 3, 'Gives you a {0}% chance to generate 1 rage when you deal melee damage.', [8, 16, 24, 32, 40], ['res:rage']],
    ['improved-cleave', 'Improved Cleave', 3, 3, 1, 'Increases the bonus damage done by Cleave by {0}%.', [40, 80, 120], ['dmg:physical']],
    ['piercing-howl', 'Piercing Howl', 1, 3, 2, 'Dazes all enemies within 10 yards, slowing their movement speed by 50% for 6 sec.', null, ['role:ability', 'role:control', 'role:shout']],
    ['blood-craze', 'Blood Craze', 3, 3, 3, 'Regenerates {0}% of your total health over 6 sec after being critically hit.', [1, 2, 3], ['role:defence']],
    ['improved-battle-shout', 'Improved Battle Shout', 5, 3, 4, 'Increases the attack power bonus of Battle Shout by {0}%.', [5, 10, 15, 20, 25], ['role:shout', 'stat:attack-power']],
    ['dual-wield-specialization', 'Dual Wield Specialization', 5, 4, 1, 'Increases the damage done by your off-hand weapon by {0}%.', [5, 10, 15, 20, 25], ['dmg:physical', 'weapon:dual-wield']],
    ['improved-execute', 'Improved Execute', 2, 4, 2, 'Reduces the cost of Execute by {0} rage.', [2, 5], ['res:rage']],
    ['enrage', 'Enrage', 5, 4, 3, 'After being critically hit, you deal {0}% more melee damage for 12 sec or 12 swings.', [5, 10, 15, 20, 25], ['dmg:physical']],
    ['improved-slam', 'Improved Slam', 5, 5, 1, 'Reduces the casting time of Slam by {0} sec.', [0.1, 0.2, 0.3, 0.4, 0.5], ['dmg:physical']],
    ['death-wish', 'Death Wish', 1, 5, 2, 'For 30 sec you deal 20% more physical damage and are immune to Fear, but your armor and all resistances are lowered by 20%.', null, ['role:ability', 'dmg:physical']],
    ['improved-intercept', 'Improved Intercept', 2, 5, 4, 'Reduces the cooldown of Intercept by {0} sec.', [5, 10], ['role:control']],
    ['improved-berserker-rage', 'Improved Berserker Rage', 2, 6, 1, 'Berserker Rage generates {0} rage when used.', [5, 10], ['res:rage']],
    ['flurry', 'Flurry', 5, 6, 3, 'After a critical strike, your next 3 swings are {0}% faster.', [10, 15, 20, 25, 30], ['stat:haste']],
    ['bloodthirst', 'Bloodthirst', 1, 7, 2, 'Instantly attack the target for damage equal to 45% of your attack power. For 8 sec, your next 5 successful melee attacks restore 10 health each.', null, ['role:ability', 'role:capstone', 'dmg:physical']],
  ],
  protection: [
    ['shield-specialization', 'Shield Specialization', 5, 1, 2, [['block', 'Increases your chance to block attacks with a shield by {0}%.', [1, 2, 3, 4, 5]], ['block-rage', 'Gives a {0}% chance to generate 1 rage when you block.', [20, 40, 60, 80, 100]]], null, ['role:defence', 'res:rage']],
    ['anticipation', 'Anticipation', 5, 1, 3, 'Increases your Defense skill by {0}.', [2, 4, 6, 8, 10], ['role:defence']],
    ['improved-bloodrage', 'Improved Bloodrage', 2, 2, 1, 'Bloodrage generates {0} more rage.', [2, 5], ['res:rage']],
    ['toughness', 'Toughness', 5, 2, 3, 'Increases the armor you get from items by {0}%.', [2, 4, 6, 8, 10], ['role:defence']],
    ['iron-will', 'Iron Will', 5, 2, 4, 'Increases your chance to resist stun and charm effects by {0}%.', [3, 6, 9, 12, 15], ['role:defence']],
    ['last-stand', 'Last Stand', 1, 3, 1, 'For 20 sec you gain 30% of your maximum health; it is lost when the effect ends.', null, ['role:ability', 'role:defence']],
    ['improved-shield-block', 'Improved Shield Block', 3, 3, 2, 'Shield Block blocks 1 more attack and lasts {0} sec longer.', [0.5, 1, 2], ['role:defence']],
    ['improved-revenge', 'Improved Revenge', 3, 3, 3, 'Gives Revenge a {0}% chance to stun the target for 3 sec.', [15, 30, 45], ['role:control']],
    ['defiance', 'Defiance', 5, 3, 4, 'Increases the threat you cause in Defensive Stance by {0}%.', [3, 6, 9, 12, 15], ['role:threat']],
    ['improved-sunder-armor', 'Improved Sunder Armor', 3, 4, 1, 'Reduces the cost of Sunder Armor by {0} rage.', [1, 2, 3], ['res:rage', 'role:threat']],
    ['improved-disarm', 'Improved Disarm', 3, 4, 2, 'Increases the duration of Disarm by {0} sec.', [1, 2, 3], ['role:control']],
    ['improved-taunt', 'Improved Taunt', 2, 4, 3, 'Reduces the cooldown of Taunt by {0} sec.', [1, 2], ['role:threat']],
    ['improved-shield-wall', 'Improved Shield Wall', 2, 5, 1, 'Increases the duration of Shield Wall by {0} sec.', [3, 5], ['role:defence']],
    ['concussion-blow', 'Concussion Blow', 1, 5, 2, 'Stuns the target for 5 sec.', null, ['role:ability', 'role:control']],
    ['improved-shield-bash', 'Improved Shield Bash', 2, 5, 3, 'Gives Shield Bash a {0}% chance to silence the target for 3 sec.', [50, 100], ['role:control']],
    ['one-handed-weapon-specialization', 'One-Handed Weapon Specialization', 5, 6, 3, 'Increases the damage you deal with one-handed melee weapons by {0}%.', [2, 4, 6, 8, 10], ['dmg:physical', 'weapon:one-hand']],
    ['shield-slam', 'Shield Slam', 1, 7, 2, 'Slam the target with your shield for 225 to 235 damage plus your shield block value, with a 50% chance to dispel 1 magic effect.', null, ['role:ability', 'role:capstone', 'role:threat']],
  ],
};

// Arrows: the parent must be at max rank (Classic rule).
const ARROWS = [
  ['tactical-mastery', 'anger-management'],
  ['improved-rend', 'deep-wounds'],
  ['deep-wounds', 'impale'],
  ['sweeping-strikes', 'mortal-strike'],
  ['enrage', 'flurry'],
  ['death-wish', 'bloodthirst'],
  ['improved-bloodrage', 'last-stand'],
  ['shield-specialization', 'improved-shield-block'],
  ['concussion-blow', 'shield-slam'],
];

const NAMES = { arms: 'Arms', fury: 'Fury', protection: 'Protection' };

const nodes = [];
for (const [section, rows] of Object.entries(T)) {
  for (const [id, name, ranks, tier, col, text, values, tags] of rows) {
    const n = { id, section, kind: 'talent', name };
    if (ranks !== 1) n.ranks = ranks;
    Object.assign(n, { tier, col, order: tier * 10 + col, tags });
    // A few talents have more than one effect: text is then [[suffix, text, values], ...].
    n.stats = Array.isArray(text)
      ? text.map(([suffix, t, v]) => ({ id: `talent:${id}:${suffix}`, text: t, values: v }))
      : [values ? { id: `talent:${id}`, text, values } : { id: `grant:${id}`, text }];
    nodes.push(n);
  }
}

const tree = {
  app: 'lmg-tree',
  v: 1,
  id: 'wow-classic-warrior',
  name: 'WoW Classic Warrior talents',
  game: 'wow-classic',
  patch: '1.12.1',
  source: 'hand-authored from the public 1.12 talent calculator',
  pools: [{ id: 'talent', name: 'Talent points', budget: { perLevelFrom: [10, 1, 60] } }],
  sections: Object.keys(T).map((id) => ({
    id,
    name: NAMES[id],
    kind: 'tree',
    pool: 'talent',
    connectivity: 'prereq',
    active: 'always',
    tiers: { gate: [0, 5, 10, 15, 20, 25, 30] },
  })),
  nodes,
  edges: ARROWS.map(([from, to]) => ({ from, to, type: 'arrow', minRank: 'max' })),
  context: { level: { min: 10, max: 60 } },
  // Wowhead talent links: the class slug, and the trees in the order the link lists them.
  ext: { wowhead: { class: 'warrior', trees: ['arms', 'fury', 'protection'] } },
};

// Three 4×7 grids side by side.
const cell = 56;
const gutter = 48;
const sectionW = 4 * cell;
const layout = {
  app: 'lmg-tree-layout',
  v: 1,
  tree: 'wow-classic-warrior',
  skin: 'default',
  space: { w: 3 * sectionW + 4 * gutter, h: 48 + 7 * cell + 24, unit: 'px' },
  sections: Object.fromEntries(
    Object.keys(T).map((id, i) => [id, { mode: 'grid', origin: [gutter + i * (sectionW + gutter), 48], cell: [cell, cell], rotate: 0 }]),
  ),
};

const save = (file, x) => fs.writeFileSync(path.join(outDir, file), JSON.stringify(x, null, 1) + '\n');
save('wow-classic-warrior.tree.json', tree);
save('wow-classic-warrior.default.layout.json', layout);
console.log(nodes.length, 'nodes', tree.edges.length, 'arrows');
