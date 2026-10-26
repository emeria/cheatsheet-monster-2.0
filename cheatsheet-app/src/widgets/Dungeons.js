import React from 'react';
import Collapsible from '../components/Collapsible';
import { useCsv } from '../lib/csv';

const DAY_MS = 1000 * 60 * 60 * 24;

// Which row (1-based, in CSV order) of a tier is active today.
export function rotationDay({ cycle, start }, today = new Date()) {
  const days = Math.ceil(Math.abs(today - new Date(start)) / DAY_MS);
  return (days % cycle) + 1;
}

function capitalize(text) {
  return text.replace(/[a-z]/i, (c) => c.toUpperCase());
}

// CSV columns: dungeon, tier, reward, mod, reward increase, day.
// Rows rotate per tier using the cycle/start settings in the content file.
function Dungeons({ csv, dungeons }) {
  const { rows, error } = useCsv(csv);
  if (error) return <p className="error">Could not load {csv}</p>;
  if (!rows) return null;

  return dungeons.map(({ name, tiers }) => {
    const today = Object.entries(tiers).map(([tier, rotation]) => {
      const tierRows = rows.filter(([dungeon, t]) => dungeon === name && t === tier);
      return [tier, tierRows[rotationDay(rotation) - 1]];
    });

    return (
      <Collapsible key={name} id={`dungeon${name.replace(/\s/g, '')}`} title={name} open>
        <div className="table-wrap">
          <table className="dungeon-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Reward</th>
                <th>Enemy Mods</th>
                <th>Reward Scaling</th>
              </tr>
            </thead>
            <tbody>
              {today.map(([tier, row]) => (
                <tr key={tier}>
                  <td>{tier}</td>
                  <td>{row ? capitalize(row[2]) : 'Not in schedule'}</td>
                  <td>{row?.[3]}</td>
                  <td>{row?.[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Collapsible>
    );
  });
}

export default Dungeons;
