import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { budget, spent, validate } from '../vendor/lmg-tree-kit/tree-core.js';
import { TreeView } from '../vendor/lmg-tree-kit/tree-render.js';
import versions from '../data/trees/versions.json';
import GameContext from '../components/GameContext';
import Loading from '../components/Loading';
import { decodeBuild, encodeBuild } from '../lib/buildCode';
import { importPoeBuild } from '../lib/poeImport';
import { encodeTreeUrl } from '../lib/poeTreeUrl';

// Trees are a few MB each, so each one loads only when a page shows it.
const files = import.meta.glob(['../data/trees/*.tree.json', '../data/trees/*.layout.json']);

async function loadJson(name) {
  const file = files[`../data/trees/${name}`];
  if (!file) throw new Error(`No tree file ${name}`);
  return (await file()).default;
}
export const loadTree = (id) => loadJson(`${id}.tree.json`);
const loadLayout = (id) => loadJson(`${id}.default.layout.json`);

// `tree` is a game with pinned versions (poe1, poe2: its latest tree) or a tree id.
const treeIdFor = (tree) => versions.games[tree]?.latest ?? tree;

function emptyBuild(json, start) {
  const build = {
    app: 'lmg-tree-build',
    v: 1,
    tree: json.id,
    context: { level: json.context?.level?.max ?? 1, flags: (json.context?.flags || []).map((f) => f.id) },
    ranks: {},
  };
  if (start) build.start = start;
  return build;
}

// A build from an import keeps its own level, with every quest done.
const withFlags = (build, json) => ({
  ...build,
  context: { level: json.context?.level?.max ?? 1, ...build.context, flags: (json.context?.flags || []).map((f) => f.id) },
});

// The build in the page's `?b=` share code, when it's for this tree.
function sharedBuild(json) {
  const code = new URLSearchParams(window.location.search).get('b');
  return code ? decodeBuild(code, json) : null;
}

// Links to this tree's page and its read-only embed, both opening `build`.
function shareUrls(game, sectionId, build) {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}${game}`;
  const b = `?b=${encodeBuild(build)}`;
  return { page: `${base}/tools${b}`, embed: `${base}/embed/${sectionId}${b}` };
}

function hasCanvas(canvas) {
  try {
    return !!canvas?.getContext?.('2d');
  } catch {
    return false;
  }
}

// Interactive skill tree on lmg-tree-kit: click a node to take the path to it, right-click to
// refund, drag to pan, wheel to zoom. PoE trees also take an import (tree link, PoB code or file,
// build-site, poeplanner or Maxroll link). `readOnly` (embeds) shows the build without editing.
// A `?b=` share code in the page URL opens that build.
function TalentTree({ tree = 'poe1', importer, readOnly = false, sectionId }) {
  const game = useContext(GameContext);
  const canvasRef = useRef(null);
  const viewRef = useRef(null);
  const [treeId, setTreeId] = useState(() => treeIdFor(tree));
  const [data, setData] = useState(null);
  const [build, setBuild] = useState(null);
  const [error, setError] = useState(null);
  const [noCanvas, setNoCanvas] = useState(false);
  const [imported, setImported] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const classes = data?.json.ext?.poe1?.classes || data?.json.ext?.poe2?.classes;

  useEffect(() => {
    let live = true;
    setData(null);
    Promise.all([loadTree(treeId), loadLayout(treeId)])
      .then(([json, layout]) => {
        if (!live) return;
        setData({ json, layout });
        setBuild((b) => (b?.tree === json.id ? b : sharedBuild(json) ?? emptyBuild(json, (json.ext?.poe1 || json.ext?.poe2)?.classes[0]?.start)));
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [treeId]);

  // One TreeView per loaded tree; builds from the page are pushed into it.
  useEffect(() => {
    if (!data || !build || build.tree !== data.json.id) return undefined;
    if (!hasCanvas(canvasRef.current)) {
      setNoCanvas(true);
      return undefined;
    }
    const view = new TreeView(canvasRef.current, { tree: data.json, layout: data.layout, build, onChange: setBuild, readOnly });
    viewRef.current = view;
    const onResize = () => view.render();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      view.destroy();
      viewRef.current = null;
    };
    // The view is rebuilt only for a new tree; build changes go through setBuild below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && build && view.build !== build && build.tree === data?.json.id) view.setBuild(build, { silent: true });
  }, [build, data]);

  const summary = useMemo(() => {
    if (!data || !build || build.tree !== data.json.id) return null;
    const pools = data.json.pools
      .map((p) => ({ id: p.id, name: p.name || p.id, used: spent(data.json, build, { pool: p.id }), of: budget(data.json, build, p.id) }))
      .filter((p) => p.of > 0 || p.used > 0);
    return { pools, problems: validate(data.json, build).errors };
  }, [data, build]);

  const show = (b) => {
    setTreeId(b.tree);
    setBuild(b);
  };

  async function runImport(input) {
    setBusy(true);
    setError(null);
    try {
      const result = await importPoeBuild(input, { versions, loadTree });
      const trees = {};
      for (const b of result.builds) trees[b.build.tree] ??= await loadTree(b.build.tree);
      const builds = result.builds.map((b) => ({ ...b, build: withFlags(b.build, trees[b.build.tree]) }));
      setImported({ ...result, builds });
      setWarnings(builds[result.active].warnings);
      show(builds[result.active].build);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const pickClass = (start) => data && setBuild({ ...emptyBuild(data.json, start) });
  const pickAscendancy = (id) => setBuild((b) => {
    const picks = { ...b.picks };
    if (id) picks.ascendancy = id;
    else delete picks.ascendancy;
    // Ascendancy nodes of the old pick stay in ranks; validate reports them until refunded.
    return { ...b, picks };
  });
  const cls = classes?.find((c) => c.start === build?.start);

  // `copied` names the button whose text was just copied.
  async function copy(which, text) {
    await navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(false), 1500);
  }
  const urls = game && sectionId && build && !readOnly ? shareUrls(game, sectionId, build) : null;
  const embedCode = urls && `<iframe src="${urls.embed}" title="${data?.json.name ?? 'Skill tree'}" width="100%" height="640" style="border:0" loading="lazy"></iframe>`;

  return (
    <div className={`talent-tree${readOnly ? ' read-only' : ''}`}>
      {importer === 'poe' && !readOnly && (
        <form
          className="tree-import"
          onSubmit={(e) => {
            e.preventDefault();
            runImport(text);
          }}
        >
          <label htmlFor={`${tree}-import`}>Import a build</label>
          <textarea
            id={`${tree}-import`}
            rows={2}
            value={text}
            placeholder="Tree link, PoB code, pobb.in / poe.ninja / Maxroll / poeplanner link"
            onChange={(e) => setText(e.target.value)}
          />
          <div className="tree-import-actions">
            <button className="styled-button" type="submit" disabled={busy || !text.trim()}>
              {busy ? 'Importing…' : 'Import'}
            </button>
            <label className="styled-button tree-file">
              Open PoB file
              <input
                type="file"
                accept=".xml,.txt"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) runImport(await file.text());
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {imported && imported.builds.length > 1 && (
        <label className="tree-field">
          Tree set{' '}
          <select
            value={imported.builds.findIndex((b) => b.build.name === build?.name && b.build.tree === build?.tree)}
            onChange={(e) => {
              const b = imported.builds[Number(e.target.value)];
              setWarnings(b.warnings);
              show(b.build);
            }}
          >
            {imported.builds.map((b, i) => (
              <option key={i} value={i}>
                {b.build.name || `Tree ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}

      {warnings.length > 0 && (
        <ul className="tree-warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {classes && build && readOnly && (
        <p className="tree-summary">
          {cls?.name}
          {build.picks?.ascendancy && ` · ${data.json.sections.find((s) => s.id === build.picks.ascendancy)?.name ?? build.picks.ascendancy}`}
        </p>
      )}

      {classes && build && !readOnly && (
        <div className="tree-controls">
          <label className="tree-field">
            Class{' '}
            <select value={build.start} onChange={(e) => pickClass(e.target.value)}>
              {classes.map((c) => (
                <option key={c.name} value={c.start}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {cls?.ascendancies.length > 0 && (
            <label className="tree-field">
              Ascendancy{' '}
              <select value={build.picks?.ascendancy ?? ''} onChange={(e) => pickAscendancy(e.target.value)}>
                <option value="">None</option>
                {cls.ascendancies.map((id) => (
                  <option key={id} value={id}>
                    {data.json.sections.find((s) => s.id === id)?.name ?? id}
                  </option>
                ))}
              </select>
            </label>
          )}
          {data.json.game === 'poe1' && (
            <button className="styled-button" type="button" onClick={() => copy('tree', encodeTreeUrl(build, data.json))}>
              {copied === 'tree' ? 'Copied' : 'Copy tree link'}
            </button>
          )}
        </div>
      )}

      {data && (
        <div className="tree-controls">
          <input type="search" placeholder="Search nodes" aria-label="Search nodes" onChange={(e) => viewRef.current?.setSearch(e.target.value)} />
          <button className="styled-button" type="button" onClick={() => viewRef.current?.fit()}>
            Fit
          </button>
          {!readOnly && (
            <button className="styled-button" type="button" onClick={() => setBuild(emptyBuild(data.json, build?.start))}>
              Reset
            </button>
          )}
          {urls && (
            <>
              <button className="styled-button" type="button" onClick={() => copy('page', urls.page)}>
                {copied === 'page' ? 'Copied' : 'Copy share link'}
              </button>
              <button className="styled-button" type="button" onClick={() => copy('embed', embedCode)}>
                {copied === 'embed' ? 'Copied' : 'Copy embed code'}
              </button>
            </>
          )}
        </div>
      )}

      {summary && (
        <p className="tree-summary" aria-live="polite">
          {summary.pools.map((p) => `${p.name}: ${p.used} / ${p.of}`).join(' · ')}
          {summary.problems.length > 0 && ` · ${summary.problems.length} problem${summary.problems.length === 1 ? '' : 's'}`}
        </p>
      )}

      {!data && !error && <Loading>Loading the tree…</Loading>}
      {noCanvas ? (
        <p className="tree-help">This browser can't draw the tree.</p>
      ) : (
        <canvas
          ref={canvasRef}
          className="tree-canvas"
          aria-label={`${data?.json.name ?? 'Skill tree'}: drag to pan, scroll to zoom${readOnly ? '' : ', click a node to take it, right-click to refund'}`}
        />
      )}
      <p className="tree-help">{readOnly ? 'Drag to pan, scroll to zoom.' : 'Click a node to take the path to it, right-click to refund. Drag to pan, scroll to zoom.'}</p>
    </div>
  );
}

export default TalentTree;
