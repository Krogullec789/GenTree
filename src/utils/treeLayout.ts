import { NODE_HEIGHT, NODE_WIDTH } from '../constants/layout';
import type { NodeMap, TreeData } from '../types/tree';

const HORIZONTAL_GAP = 120;
const PARTNER_GAP = 80;
const VERTICAL_GAP = 150;
const START_X = 80;
const START_Y = 80;

interface LayoutUnit {
  id: string;
  memberIds: string[];
  level: number;
}

const byName = (a: string, b: string, nodes: NodeMap) => {
  const left = `${nodes[a]?.firstName || ''} ${nodes[a]?.lastName || ''} ${a}`;
  const right = `${nodes[b]?.firstName || ''} ${nodes[b]?.lastName || ''} ${b}`;
  return left.localeCompare(right);
};

const byBirthThenName = (a: string, b: string, nodes: NodeMap) => {
  const leftBirth = nodes[a]?.birthDate?.trim() || '9999-12-31';
  const rightBirth = nodes[b]?.birthDate?.trim() || '9999-12-31';
  const birthOrder = leftBirth.localeCompare(rightBirth);
  return birthOrder || byName(a, b, nodes);
};

const addToSetMap = <TValue>(map: Map<string, Set<TValue>>, key: string, value: TValue) => {
  const set = map.get(key) || new Set<TValue>();
  set.add(value);
  map.set(key, set);
};

const getGroupWidth = (memberCount: number) =>
  memberCount * NODE_WIDTH + Math.max(0, memberCount - 1) * PARTNER_GAP;

export const layoutTree = (tree: TreeData): TreeData => {
  const nodes = { ...tree.nodes };
  const edges = Object.values(tree.edges);
  const ids = Object.keys(nodes).sort((a, b) => byBirthThenName(a, b, nodes));

  const childrenByParent = new Map<string, Set<string>>();
  const parentsByChild = new Map<string, Set<string>>();
  const partnerByNode = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (edge.type === 'parent-child') {
      addToSetMap(childrenByParent, edge.sourceId, edge.targetId);
      addToSetMap(parentsByChild, edge.targetId, edge.sourceId);
    }

    if (edge.type === 'partner') {
      addToSetMap(partnerByNode, edge.sourceId, edge.targetId);
      addToSetMap(partnerByNode, edge.targetId, edge.sourceId);
    }
  }

  const levelByNode = new Map<string, number>();
  const roots = ids.filter(id => !parentsByChild.has(id));
  const queue = roots.length > 0 ? [...roots] : [...ids];

  for (const root of queue) {
    if (!levelByNode.has(root)) levelByNode.set(root, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const nextLevel = (levelByNode.get(current) || 0) + 1;

    for (const child of childrenByParent.get(current) || []) {
      if (!levelByNode.has(child) || nextLevel > (levelByNode.get(child) || 0)) {
        levelByNode.set(child, nextLevel);
        queue.push(child);
      }
    }
  }

  for (const id of ids) {
    if (!levelByNode.has(id)) levelByNode.set(id, 0);
  }

  for (let pass = 0; pass < ids.length + edges.length; pass++) {
    let changed = false;

    for (const edge of edges) {
      if (edge.type !== 'partner') continue;

      const nextLevel = Math.max(levelByNode.get(edge.sourceId) || 0, levelByNode.get(edge.targetId) || 0);
      if ((levelByNode.get(edge.sourceId) || 0) < nextLevel) {
        levelByNode.set(edge.sourceId, nextLevel);
        changed = true;
      }
      if ((levelByNode.get(edge.targetId) || 0) < nextLevel) {
        levelByNode.set(edge.targetId, nextLevel);
        changed = true;
      }
    }

    for (const edge of edges) {
      if (edge.type !== 'parent-child') continue;

      const nextLevel = (levelByNode.get(edge.sourceId) || 0) + 1;
      if ((levelByNode.get(edge.targetId) || 0) < nextLevel) {
        levelByNode.set(edge.targetId, nextLevel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  const visited = new Set<string>();
  const units: LayoutUnit[] = [];
  const unitByNode = new Map<string, string>();

  for (const id of ids) {
    if (visited.has(id)) continue;

    const members = new Set<string>();
    const stack = [id];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;

      visited.add(current);
      members.add(current);

      for (const partnerId of partnerByNode.get(current) || []) {
        if (!visited.has(partnerId)) stack.push(partnerId);
      }
    }

    const membersWithKnownParents = [...members]
      .filter(memberId => parentsByChild.has(memberId))
      .sort((a, b) => byBirthThenName(a, b, nodes));
    const membersWithoutKnownParents = [...members]
      .filter(memberId => !parentsByChild.has(memberId))
      .sort((a, b) => byBirthThenName(a, b, nodes));
    const memberIds = membersWithKnownParents.length > 0
      ? [...membersWithKnownParents, ...membersWithoutKnownParents]
      : membersWithoutKnownParents;
    const level = Math.max(...memberIds.map(memberId => levelByNode.get(memberId) || 0));
    const unit: LayoutUnit = {
      id: memberIds.join('|'),
      memberIds,
      level,
    };

    units.push(unit);
    for (const memberId of memberIds) {
      unitByNode.set(memberId, unit.id);
    }
  }

  const unitById = new Map(units.map(unit => [unit.id, unit]));
  const parentUnitCandidatesByChild = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (edge.type !== 'parent-child') continue;

    const parentUnitId = unitByNode.get(edge.sourceId);
    const childUnitId = unitByNode.get(edge.targetId);
    if (!parentUnitId || !childUnitId || parentUnitId === childUnitId) continue;

    addToSetMap(parentUnitCandidatesByChild, childUnitId, parentUnitId);
  }

  const compareUnitsNaturally = (leftId: string, rightId: string) => {
    const left = unitById.get(leftId);
    const right = unitById.get(rightId);
    if (!left || !right) return leftId.localeCompare(rightId);

    const leftAnchor = left.memberIds.find(memberId => parentsByChild.has(memberId)) || left.memberIds[0];
    const rightAnchor = right.memberIds.find(memberId => parentsByChild.has(memberId)) || right.memberIds[0];
    return byBirthThenName(leftAnchor, rightAnchor, nodes);
  };

  const primaryParentByUnit = new Map<string, string>();

  for (const [childUnitId, parentUnitIds] of parentUnitCandidatesByChild.entries()) {
    const sortedParents = [...parentUnitIds].sort((a, b) => {
      const leftLevel = unitById.get(a)?.level || 0;
      const rightLevel = unitById.get(b)?.level || 0;
      const levelOrder = rightLevel - leftLevel;
      return levelOrder || compareUnitsNaturally(a, b);
    });

    if (sortedParents[0]) primaryParentByUnit.set(childUnitId, sortedParents[0]);
  }

  const childUnitsByParent = new Map<string, Set<string>>();

  for (const [childUnitId, parentUnitId] of primaryParentByUnit.entries()) {
    addToSetMap(childUnitsByParent, parentUnitId, childUnitId);
  }

  const childAnchorForParent = (parentUnitId: string, childUnitId: string) => {
    const parentUnit = unitById.get(parentUnitId);
    const childUnit = unitById.get(childUnitId);
    if (!parentUnit || !childUnit) return childUnitId;

    const parentMembers = new Set(parentUnit.memberIds);
    return childUnit.memberIds
      .filter(memberId => [...(parentsByChild.get(memberId) || [])].some(parentId => parentMembers.has(parentId)))
      .sort((a, b) => byBirthThenName(a, b, nodes))[0] || childUnit.memberIds[0];
  };

  const childrenForUnit = (unitId: string) =>
    [...(childUnitsByParent.get(unitId) || [])].sort((a, b) => {
      const anchorOrder = byBirthThenName(childAnchorForParent(unitId, a), childAnchorForParent(unitId, b), nodes);
      return anchorOrder || compareUnitsNaturally(a, b);
    });

  const widthByUnit = new Map<string, number>();
  const resolvingWidth = new Set<string>();

  const measureUnit = (unitId: string): number => {
    const cachedWidth = widthByUnit.get(unitId);
    if (cachedWidth) return cachedWidth;

    const unit = unitById.get(unitId);
    if (!unit) return NODE_WIDTH;
    if (resolvingWidth.has(unitId)) return getGroupWidth(unit.memberIds.length);

    resolvingWidth.add(unitId);

    const groupWidth = getGroupWidth(unit.memberIds.length);
    const children = childrenForUnit(unitId);
    const childrenWidth = children.reduce((total, childUnitId, index) => (
      total + measureUnit(childUnitId) + (index > 0 ? HORIZONTAL_GAP : 0)
    ), 0);
    const width = Math.max(groupWidth, childrenWidth);

    resolvingWidth.delete(unitId);
    widthByUnit.set(unitId, width);
    return width;
  };

  const nextNodes: NodeMap = { ...nodes };
  const placedUnits = new Set<string>();

  const placeUnit = (unitId: string, leftX: number) => {
    const unit = unitById.get(unitId);
    if (!unit || placedUnits.has(unitId)) return;

    placedUnits.add(unitId);
    const subtreeWidth = measureUnit(unitId);
    const groupWidth = getGroupWidth(unit.memberIds.length);
    const groupX = leftX + (subtreeWidth - groupWidth) / 2;
    const y = START_Y + unit.level * (NODE_HEIGHT + VERTICAL_GAP);

    unit.memberIds.forEach((id, index) => {
      nextNodes[id] = {
        ...nextNodes[id],
        x: groupX + index * (NODE_WIDTH + PARTNER_GAP),
        y,
      };
    });

    let childX = leftX;

    for (const childUnitId of childrenForUnit(unitId)) {
      placeUnit(childUnitId, childX);
      childX += measureUnit(childUnitId) + HORIZONTAL_GAP;
    }
  };

  const rootUnitIds = units
    .filter(unit => !primaryParentByUnit.has(unit.id))
    .map(unit => unit.id)
    .sort(compareUnitsNaturally);
  let cursorX = START_X;

  for (const unitId of rootUnitIds) {
    placeUnit(unitId, cursorX);
    cursorX += measureUnit(unitId) + HORIZONTAL_GAP;
  }

  return {
    nodes: nextNodes,
    edges: tree.edges,
  };
};
