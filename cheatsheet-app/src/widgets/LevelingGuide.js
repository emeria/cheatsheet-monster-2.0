import React, { Fragment, useMemo, useRef, useState } from 'react';
import Collapsible from '../components/Collapsible';
import ImageSheet from '../components/ImageSheet';
import JumpLink from '../components/JumpLink';
import { useCsv } from '../lib/csv';
import { asset } from '../lib/assets';
import { setAllOpen } from '../lib/reveal';

const REWARDS = ['Passive', 'Idol', 'Experience', 'Gold', 'Unique', 'Mastery', 'Attributes'];
const MAIN_REWARDS = ['Passive', 'Idol'];

// CSV columns: Chapter (or Act), Step, Task, Reward ("Experience,Gold,Passive").
// Step 0 rows are chapter tips; the TLDR table shows them as headings.
function toStep([chapter = '', step = '', task = '', rewards = '']) {
  return {
    chapter,
    number: parseInt(chapter.match(/\d+/)?.[0] ?? '0', 10),
    step,
    task,
    rewards: rewards ? rewards.split(',').map((r) => r.trim()) : [],
  };
}

function byChapterThenStep(a, b) {
  return a.number - b.number || Number(a.step) - Number(b.step);
}

function RewardIcons({ rewards, iconDir }) {
  if (!iconDir) return rewards.join(', ');
  return rewards
    .filter((r) => REWARDS.includes(r))
    .map((r) => (
      <img key={r} className="reward-icon" src={asset(`${iconDir}/${r.toLowerCase()}-icon.png`)} alt={`${r} Reward`} />
    ));
}

// Leveling: legend, TLDR, campaign skip and one collapsible per chapter/act with its map and steps.
function LevelingGuide({ unit, csv, chapters, iconDir, legend, tldr, skipCsv, credit }) {
  const ref = useRef(null);
  const { rows, error } = useCsv(csv);
  const steps = useMemo(() => rows?.map(toStep), [rows]);
  const key = unit.toLowerCase();

  return (
    <div ref={ref}>
      <p>
        By {unit}:{' '}
        {chapters.map((_, i) => (
          <Fragment key={i}>
            {i > 0 && ' | '}
            <JumpLink id={`${key}${i + 1}`}>[{i + 1}]</JumpLink>
          </Fragment>
        ))}
      </p>
      {(tldr || skipCsv) && (
        <p>
          Alt Leveling: {tldr && <JumpLink id={`${key}LevelingTLDR`}>[TLDR]</JumpLink>}
          {tldr && skipCsv && ' | '}
          {skipCsv && <JumpLink id={`${key}LevelingSkip`}>[Campaign Skip]</JumpLink>}
        </p>
      )}
      <div className="expand-buttons">
        <button className="styled-button" onClick={() => setAllOpen(ref.current, false)}>
          [-] Collapse {unit}s
        </button>
        <button className="styled-button" onClick={() => setAllOpen(ref.current, true)}>
          [+] Expand {unit}s
        </button>
      </div>

      {error && <p className="error">Could not load {csv}</p>}

      {legend && (
        <Collapsible id={`${key}LevelingLegend`} title="Legend" open>
          <ImageSheet images={[{ src: legend }]} title="Leveling Legend" />
        </Collapsible>
      )}
      {tldr && (
        <Collapsible id={`${key}LevelingTLDR`} title="TLDR">
          {steps && <RewardTable steps={steps} iconDir={iconDir} mode="tldr" />}
        </Collapsible>
      )}
      {skipCsv && (
        <Collapsible id={`${key}LevelingSkip`} title="Campaign Skip">
          <CampaignSkip csv={skipCsv} iconDir={iconDir} />
        </Collapsible>
      )}

      {chapters.map((chapter, i) => {
        const name = `${unit} ${i + 1}`;
        const title = (
          <>
            {name} - {chapter.title}
            {chapter.resistances && iconDir && (
              <span className="resistances">
                Resistances:{' '}
                {chapter.resistances.map((r) => (
                  <img
                    key={r}
                    className="reward-icon"
                    src={asset(`${iconDir}/Resistance${r}.png`)}
                    alt={`${r.toLowerCase()} resistance`}
                    title={r}
                  />
                ))}
              </span>
            )}
          </>
        );
        return (
          <Collapsible key={name} id={`${key}${i + 1}`} title={title}>
            <ImageSheet images={[{ src: chapter.image }]} title={`Leveling ${name}`} />
            {steps && <StepTable steps={steps.filter((s) => s.chapter === name)} iconDir={iconDir} />}
          </Collapsible>
        );
      })}

      {credit && <p className="credit">[{credit}]</p>}
    </div>
  );
}

function StepTable({ steps, iconDir }) {
  if (steps.length === 0) return null;
  return (
    <>
      <p className="hint">Step numbers on the cheatsheet do not line up with this table</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>Task</th>
              <th>Reward</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => (
              <tr key={i}>
                <td>{s.step}</td>
                <td>{s.task}</td>
                <td>
                  <RewardIcons rewards={s.rewards} iconDir={iconDir} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CampaignSkip({ csv, iconDir }) {
  const { rows, error } = useCsv(csv);
  const steps = useMemo(() => rows?.map(toStep), [rows]);
  if (error) return <p className="error">Could not load {csv}</p>;
  return steps ? <RewardTable steps={steps} iconDir={iconDir} mode="skip" /> : null;
}

// Rewards per step with a running count of each reward type.
// mode "tldr": only steps with rewards, step 0 tips as headings, original step numbers.
// mode "skip": every row, numbered 1..n across the whole route.
function RewardTable({ steps, iconDir, mode }) {
  const [showAll, setShowAll] = useState(false);
  const columns = showAll ? REWARDS : MAIN_REWARDS;

  const body = [];
  const counts = Object.fromEntries(REWARDS.map((r) => [r, 0]));
  let chapter = null;
  let routeStep = 0;

  [...steps].sort(byChapterThenStep).forEach((s, i) => {
    const isTip = mode === 'tldr' && Number(s.step) === 0;
    if (mode === 'tldr' && !isTip && s.rewards.length === 0) return;

    if (isTip) {
      chapter = s.chapter;
      body.push(heading(`tip${i}`, `${s.chapter}: ${s.task}`, columns));
      return;
    }
    if (s.chapter !== chapter) {
      chapter = s.chapter;
      body.push(heading(`ch${i}`, s.chapter, columns));
    }

    routeStep++;
    const cells = columns.map((r) => {
      if (!s.rewards.includes(r)) return <td key={r} />;
      return (
        <td key={r}>
          <RewardIcons rewards={[r]} iconDir={iconDir} />
          <span className="reward-count">{counts[r] + 1}</span>
        </td>
      );
    });
    REWARDS.forEach((r) => s.rewards.includes(r) && counts[r]++);

    body.push(
      <tr key={i}>
        <td>{mode === 'skip' ? routeStep : s.step}</td>
        <td>{s.task}</td>
        {cells}
      </tr>
    );
  });

  return (
    <>
      <label className="toggle">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Additional Rewards
      </label>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Step</th>
              <th>Task</th>
              {columns.map((r) => (
                <th key={r}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
    </>
  );
}

function heading(key, text, columns) {
  return (
    <tr key={key} className="group-row">
      <td colSpan={2 + columns.length}>
        <b>{text}</b>
      </td>
    </tr>
  );
}

export default LevelingGuide;
