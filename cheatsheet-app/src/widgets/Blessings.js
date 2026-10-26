import React, { useState } from 'react';
import { useCsv } from '../lib/csv';

// CSV columns: Name (timeline), Blessing, Effect.
function Blessings({ csv }) {
  const { rows, error } = useCsv(csv);
  const [filter, setFilter] = useState('');

  if (error) return <p className="error">Could not load {csv}</p>;
  if (!rows) return null;

  const query = filter.trim().toLowerCase();
  const shown = query ? rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(query))) : rows;

  return (
    <>
      <input
        type="search"
        className="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search for blessings..."
        aria-label="Search for blessings"
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Blessing</th>
              <th>Effect</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(([name, blessing, effect]) => (
              <tr key={blessing}>
                <td>{name}</td>
                <td>{blessing}</td>
                <td>{effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Blessings;
