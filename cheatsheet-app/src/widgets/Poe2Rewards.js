import React, { useState } from 'react';
import { useCsv } from '../lib/csv';

const SORTS = {
  act: (rows) => rows,
  reward: (rows) => [...rows].sort((a, b) => a[4].localeCompare(b[4])),
};

// CSV columns: Act, Location, Task, Reward, Tags. "By Reward Type" groups rows by Tags.
function Poe2Rewards({ csv }) {
  const { rows, error } = useCsv(csv);
  const [sort, setSort] = useState('act');

  if (error) return <p className="error">Could not load {csv}</p>;
  if (!rows) return null;

  return (
    <>
      <div className="expand-buttons">
        <button className="styled-button" aria-pressed={sort === 'act'} onClick={() => setSort('act')}>
          By Act
        </button>
        <button className="styled-button" aria-pressed={sort === 'reward'} onClick={() => setSort('reward')}>
          By Reward Type
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Act</th>
              <th>Location</th>
              <th>Task</th>
              <th>Reward</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {SORTS[sort](rows.filter((r) => r.length >= 5)).map((row, i) => (
              <tr key={i}>
                {row.slice(0, 5).map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Poe2Rewards;
