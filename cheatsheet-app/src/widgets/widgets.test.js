import { aldorScryer, cenarion } from './wowReputation';
import { rotationDay } from './Dungeons';
import { withPricePaid } from './SupporterPacks';

const noTokens = { t1: 0, t2: 0, t3: 0 };

test('Aldor/Scryer from Neutral uses Kil\'jaeden up to Honored, then either token', () => {
  const r = aldorScryer({ level: 'neutral', points: 0, owned: noTokens, double: false, skipFirstTier: false });
  expect(r.needed).toBe(42000);
  expect(r.ranks.map((x) => x.rank)).toEqual(['Friendly', 'Honored', 'Revered', 'Exalted']);
  expect(r.ranks[0].lines).toEqual([
    ["Mark of Kil'jaeden / Firewing Signet", 120],
    ['Mark of Sargeras / Sunfury Signet OR Fel Armament / Arcane Tome', 'Not needed'],
  ]);
  expect(r.ranks[3].lines).toEqual([
    ['Mark of Sargeras / Sunfury Signet OR Fel Armament / Arcane Tome', '840 Marks/Signet OR 60 Armament/Tome'],
  ]);
});

test("owned Kil'jaeden marks still count towards the rank", () => {
  const r = aldorScryer({ level: 'neutral', points: 0, owned: { ...noTokens, t1: 120 }, double: false, skipFirstTier: false });
  expect(r.ranks[0].lines[0]).toEqual(["Mark of Kil'jaeden / Firewing Signet", 0]);
  expect(r.ranks[0].lines[1][1]).toBe('Not needed');
});

test('double reputation halves the tokens and Exalted short-circuits', () => {
  const r = aldorScryer({ level: 'revered', points: 0, owned: noTokens, double: true, skipFirstTier: false });
  expect(r.ranks[0].lines[0][1]).toBe('420 Marks/Signet OR 30 Armament/Tome');
  expect(aldorScryer({ level: 'revered', points: 21000, owned: noTokens }).exalted).toBe(true);
});

test('Cenarion uses plant parts to Friendly then Coilfang Armaments', () => {
  const r = cenarion({ level: 'neutral', points: 0, owned: { plantParts: 20, coilfang: 0 } });
  expect(r.totals).toEqual([
    ['Unidentified Plant Parts', 100],
    ['Coilfang Armaments', 520],
  ]);
});

test('dungeon rotation wraps around the cycle', () => {
  const start = '2024-02-20';
  expect(rotationDay({ cycle: 9, start }, new Date('2024-02-20T12:00:00Z'))).toBe(2);
  expect(rotationDay({ cycle: 9, start }, new Date('2024-02-28T12:00:00Z'))).toBe(1);
  expect(rotationDay({ cycle: 1, start }, new Date('2026-10-25T12:00:00Z'))).toBe(1);
});

test('supporter packs charge only the upgrade over the previous pack', () => {
  const rows = withPricePaid([{ series: 'S', packs: [{ name: 'A', price: 60 }, { name: 'B', price: 100 }] }]);
  expect(rows.map((r) => r.paid)).toEqual([60, 40]);
});
