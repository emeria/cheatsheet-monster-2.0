// Path of Building export: an lmg-tree-kit build -> a PoB build code holding just the passive tree.
// Importing PoB codes is pobBuild.js's job.
//
// The Spec attributes follow PoB's PassiveSpec.lua Save: classId, ascendClassId and
// secondaryAscendClassId use the official tree link's numbering (the tree's ext.poe1 tables),
// nodes="id,..." and masteryEffects="{node,effect},...". Items, gems and config are left out; PoB
// fills in defaults. targetVersion="3_0" stops PoB offering to convert the build from 2.x.

import { deflatePobXml } from './pobBuild';

const escapeXml = (s) => String(s).replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`);
const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join('');

export function buildToPobXml(build, tree, { title } = {}) {
  const ext = tree.ext?.poe1;
  if (!ext) throw new Error('PoB export only supports Path of Exile 1 trees.');
  const classId = ext.classes.findIndex((c) => c.start === build.start);
  if (classId < 0) throw new Error(`Build start ${build.start} is not a class start.`);
  const cls = ext.classes[classId];
  const asc = build.picks?.ascendancy ? cls.ascendancies.indexOf(build.picks.ascendancy) + 1 : 0;
  const bloodline = build.picks?.bloodline ? ext.bloodlines.indexOf(build.picks.bloodline) + 1 : 0;
  if (build.picks?.ascendancy && !asc) throw new Error(`${build.picks.ascendancy} is not a ${cls.name} ascendancy.`);
  if (build.picks?.bloodline && !bloodline) throw new Error(`Unknown bloodline ${build.picks.bloodline}.`);

  // Cluster nodes are left out: PoB drops them unless the cluster jewel is in the build too.
  const warnings = [];
  if (build.ext?.poe1?.clusterNodes?.length) warnings.push('Cluster jewel nodes are not exported.');
  const nodes = Object.keys(build.ranks || {})
    .filter((id) => build.ranks[id] > 0)
    .sort((a, b) => a - b);
  const masteries = Object.entries(build.options || {})
    .sort(([a], [b]) => a - b)
    .map(([node, effect]) => `{${node},${effect}}`);

  const buildAttrs = {
    level: build.context?.level ?? tree.context?.level?.max ?? 1,
    targetVersion: '3_0',
    className: cls.name,
    ascendClassName: asc ? tree.sections.find((s) => s.id === build.picks.ascendancy)?.name : 'None',
    viewMode: 'TREE',
  };
  const spec = {
    title: title ?? build.name,
    treeVersion: tree.patch.split('.').slice(0, 2).join('_'),
    classId,
    ascendClassId: asc,
    secondaryAscendClassId: bloodline,
    nodes: nodes.join(','),
    masteryEffects: masteries.join(','),
  };
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<PathOfBuilding>',
    `\t<Build${attrs(buildAttrs)}/>`,
    '\t<Tree activeSpec="1">',
    `\t\t<Spec${attrs(spec)}/>`,
    '\t</Tree>',
    '</PathOfBuilding>',
    '',
  ].join('\n');
  return { xml, warnings };
}

export async function encodePobCode(build, tree, opts) {
  const { xml, warnings } = buildToPobXml(build, tree, opts);
  return { code: await deflatePobXml(xml), warnings };
}
