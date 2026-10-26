import React, { useMemo, useState } from 'react';

const money = (n) => `$${n.toFixed(2)}`;

// Packs in a series are upgrades: buying the 3rd costs its price minus the 2nd's.
export function withPricePaid(series) {
  return series.flatMap(({ series: name, packs }) =>
    packs.map((pack, i) => ({
      key: `${name}|${i}`,
      series: name,
      index: i,
      name: pack.name,
      price: pack.price,
      paid: pack.price - (i > 0 ? packs[i - 1].price : 0),
    }))
  );
}

// Click a row to select it and every cheaper pack in the same series; tick a box to toggle just that pack.
function SupporterPacks({ series }) {
  const rows = useMemo(() => withPricePaid(series), [series]);
  const [owned, setOwned] = useState(() => new Set());

  const toggleOne = (key) =>
    setOwned((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleUpTo = (row) =>
    setOwned((prev) => {
      const next = new Set(prev);
      const select = !prev.has(row.key);
      rows
        .filter((r) => r.series === row.series && r.index <= row.index)
        .forEach((r) => (select ? next.add(r.key) : next.delete(r.key)));
      return next;
    });

  const total = rows.filter((r) => owned.has(r.key)).reduce((sum, r) => sum + r.paid, 0);

  return (
    <>
      <p>Select the supporter packs you own to calculate the total cost:</p>
      <p className="total">Total Lifetime Cost: {money(total)}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Supporter Pack Series</th>
              <th>Pack Name</th>
              <th>Price (USD)</th>
              <th>Price Paid (USD)</th>
              <th>Select</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={owned.has(row.key) ? 'selected clickable' : 'clickable'}
                onClick={() => toggleUpTo(row)}
              >
                <td>{row.series}</td>
                <td>{row.name}</td>
                <td>{money(row.price)}</td>
                <td>{money(row.paid)}</td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`${row.series} ${row.name}`}
                    checked={owned.has(row.key)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleOne(row.key)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default SupporterPacks;
