import React, { Fragment, useState } from 'react';
import { asset } from '../lib/assets';
import { ALDOR_TOKENS, CENARION_TOKENS, LEVELS, aldorScryer, cenarion } from './wowReputation';

function TokenName({ token }) {
  if (!token.icons) return token.name;
  return token.name.split(' / ').map((part, i) => (
    <Fragment key={part}>
      {i > 0 && ' / '}
      <img className="reward-icon" src={asset(`wow/pics/${token.icons[i]}-icon.png`)} alt="" /> {part}
    </Fragment>
  ));
}

const toNumber = (value) => Math.max(0, parseInt(value, 10) || 0);

// Reputation tiers, token values, a form for where you are now, and live results.
function RepCalculator({ title, tokens, calculate, options = [], notes = [] }) {
  const [level, setLevel] = useState('neutral');
  const [points, setPoints] = useState('0');
  const [owned, setOwned] = useState(() => Object.fromEntries(tokens.map((t) => [t.key, '0'])));
  const [flags, setFlags] = useState(() => Object.fromEntries(options.map((o) => [o.key, false])));

  const result = calculate({
    level,
    points: toNumber(points),
    owned: Object.fromEntries(tokens.map((t) => [t.key, toNumber(owned[t.key])])),
    ...flags,
  });

  return (
    <div className="calculator">
      <h3>{title}</h3>

      <h4>Reputation Tiers</h4>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reputation Level</th>
              <th>Points Required to Reach</th>
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((l) => (
              <tr key={l.name}>
                <td>{l.label}</td>
                <td>{l.points.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Token Contribution</h4>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Reputation Points</th>
              <th>Usable Up To</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <tr key={t.key}>
                <td>
                  <TokenName token={t} />
                </td>
                <td>{t.contribution}</td>
                <td>{t.maxTier.charAt(0).toUpperCase() + t.maxTier.slice(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Where you are now</h4>
      <div className="form-grid">
        <label>
          Current Reputation Level{' '}
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.slice(0, -1).map((l) => (
              <option key={l.name} value={l.name}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Points in Current Level{' '}
          <input type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} />
        </label>
        {tokens.map((t) => (
          <label key={t.key}>
            <TokenName token={t} /> owned{' '}
            <input
              type="number"
              min="0"
              value={owned[t.key]}
              onChange={(e) => setOwned({ ...owned, [t.key]: e.target.value })}
            />
          </label>
        ))}
        {options.map((o) => (
          <label key={o.key}>
            <input
              type="checkbox"
              checked={flags[o.key]}
              onChange={(e) => setFlags({ ...flags, [o.key]: e.target.checked })}
            />{' '}
            {o.label}
          </label>
        ))}
      </div>

      <h4>Results</h4>
      {result.exalted ? (
        <p>You are already at Exalted!</p>
      ) : (
        <div className="results">
          <p>
            Current Reputation: {result.start} / 42000 (Exalted)
            <br />
            Reputation Needed: {result.needed}
          </p>
          {notes.map((note) => (
            <p key={note}>
              <em>{note}</em>
            </p>
          ))}
          <h4>Total Tokens Required</h4>
          {result.totals.map(([name, count]) => (
            <p key={name}>
              {name}: {count}
            </p>
          ))}
          {result.ranks.map(({ rank, lines }) => (
            <details key={rank}>
              <summary>Tokens Required for {rank}</summary>
              {lines.map(([name, value]) => (
                <p key={name}>
                  {name}: {value}
                </p>
              ))}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export function AldorScryer() {
  return (
    <RepCalculator
      title="WoW TBC Reputation Calculator"
      tokens={ALDOR_TOKENS}
      calculate={aldorScryer}
      options={[
        { key: 'double', label: 'Double Reputation Multiplier' },
        { key: 'skipFirstTier', label: "Don't use Kil'jaeden or Firewing" },
      ]}
      notes={[
        "Mark of Kil'jaeden / Firewing Signet should be used first and cannot be used after Honored.",
        'You can use Mark of Sargeras / Sunfury Signet OR Fel Armament / Arcane Tome to reach Exalted.',
      ]}
    />
  );
}

export function Cenarion() {
  return <RepCalculator title="Cenarion Expedition Reputation Calculator" tokens={CENARION_TOKENS} calculate={cenarion} />;
}
