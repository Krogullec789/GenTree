import type { EdgeMap, Gender, NodeMap, PersonNode, RelationshipType, TreeData, TreeDocument, TreeEdge } from '../types/tree';

const VALID_EDGE_TYPES = new Set(['parent-child', 'partner']);
const VALID_GENDERS = new Set(['male', 'female']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const collectionToRecord = <T extends { id: string }>(collection: unknown): Record<string, T> | null => {
  if (Array.isArray(collection)) {
    return collection.reduce<Record<string, T>>((record, item) => {
      if (isRecord(item) && typeof item.id === 'string') {
        record[item.id] = item as T;
      }
      return record;
    }, {});
  }

  return isRecord(collection) ? collection as Record<string, T> : null;
};

const asString = (value: unknown) => typeof value === 'string' ? value : '';

const isValidDate = (value: unknown): value is string => {
  if (value === undefined || value === '') return true;
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const normalizeNode = (node: unknown, id: string, errors: string[]): PersonNode | null => {
  if (!isRecord(node)) {
    errors.push(`Node ${id} must be an object.`);
    return null;
  }

  if (node.id !== id || typeof node.id !== 'string' || node.id.trim().length === 0) {
    errors.push(`Node ${id} has an invalid id.`);
  }

  const firstName = node.firstName;
  const normalizedFirstName = typeof firstName === 'string' ? firstName.trim() : '';

  if (normalizedFirstName.length === 0) {
    errors.push(`Node ${id} must have a non-empty first name.`);
  }

  if (typeof node.gender !== 'string' || !VALID_GENDERS.has(node.gender)) {
    errors.push(`Node ${id} must have gender male or female.`);
  }

  if (!Number.isFinite(node.x)) {
    errors.push(`Node ${id} must have a finite x position.`);
  }

  if (!Number.isFinite(node.y)) {
    errors.push(`Node ${id} must have a finite y position.`);
  }

  if (!isValidDate(node.birthDate)) {
    errors.push(`Node ${id} has an invalid birth date.`);
  }

  if (!isValidDate(node.deathDate)) {
    errors.push(`Node ${id} has an invalid death date.`);
  }

  if (
    typeof node.birthDate === 'string' &&
    typeof node.deathDate === 'string' &&
    node.birthDate !== '' &&
    node.deathDate !== '' &&
    node.deathDate < node.birthDate
  ) {
    errors.push(`Node ${id} death date cannot be before birth date.`);
  }

  if (errors.length > 0) return null;

  return {
    id,
    firstName: normalizedFirstName,
    lastName: asString(node.lastName).trim(),
    maidenName: asString(node.maidenName).trim(),
    birthDate: asString(node.birthDate),
    deathDate: asString(node.deathDate),
    bio: asString(node.bio),
    gender: node.gender as Gender,
    avatar: asString(node.avatar),
    x: node.x as number,
    y: node.y as number,
  };
};

const normalizeEdge = (edge: unknown, id: string, nodes: NodeMap, errors: string[]): TreeEdge | null => {
  if (!isRecord(edge)) {
    errors.push(`Edge ${id} must be an object.`);
    return null;
  }

  if (edge.id !== id || typeof edge.id !== 'string' || edge.id.trim().length === 0) {
    errors.push(`Edge ${id} has an invalid id.`);
  }

  if (typeof edge.sourceId !== 'string' || !nodes[edge.sourceId]) {
    errors.push(`Edge ${id} has an unknown source.`);
  }

  if (typeof edge.targetId !== 'string' || !nodes[edge.targetId]) {
    errors.push(`Edge ${id} has an unknown target.`);
  }

  if (typeof edge.type !== 'string' || !VALID_EDGE_TYPES.has(edge.type)) {
    errors.push(`Edge ${id} has an invalid relationship type.`);
  }

  if (edge.sourceId === edge.targetId) {
    errors.push(`Edge ${id} cannot connect a person to themselves.`);
  }

  if (errors.length > 0) return null;

  return {
    id,
    sourceId: edge.sourceId as string,
    targetId: edge.targetId as string,
    type: edge.type as RelationshipType,
  };
};

const validateRelationshipRules = (nodes: NodeMap, edges: EdgeMap, errors: string[]) => {
  const parentCounts = new Map<string, number>();
  const parentGraph = new Map<string, string[]>();
  const seen = new Set<string>();

  for (const edge of Object.values(edges)) {
    const key = edge.type === 'partner'
      ? `partner:${[edge.sourceId, edge.targetId].sort().join(':')}`
      : `${edge.type}:${edge.sourceId}:${edge.targetId}`;

    if (seen.has(key)) {
      errors.push(`Edge ${edge.id} duplicates an existing relationship.`);
    }
    seen.add(key);

    if (edge.type !== 'parent-child') continue;

    parentCounts.set(edge.targetId, (parentCounts.get(edge.targetId) || 0) + 1);
    parentGraph.set(edge.sourceId, [...(parentGraph.get(edge.sourceId) || []), edge.targetId]);

    const reciprocal = Object.values(edges).some(other =>
      other.id !== edge.id &&
      other.type === 'parent-child' &&
      other.sourceId === edge.targetId &&
      other.targetId === edge.sourceId
    );

    if (reciprocal) {
      errors.push('Parent-child relationships cannot be reciprocal.');
    }
  }

  for (const [nodeId, count] of parentCounts.entries()) {
    if (count > 2) errors.push(`Node ${nodeId} cannot have more than two parents.`);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  let hasCycle = false;

  const visit = (nodeId: string) => {
    if (visiting.has(nodeId)) {
      hasCycle = true;
      return;
    }
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    for (const childId of parentGraph.get(nodeId) || []) visit(childId);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const nodeId of Object.keys(nodes)) visit(nodeId);
  if (hasCycle) errors.push('Parent-child relationships cannot form cycles.');
};

export type TreeValidationResult =
  | { valid: true; data: TreeData; errors: [] }
  | { valid: false; data: null; errors: string[] };

export const validateTreeData = (data: unknown): TreeValidationResult => {
  const errors: string[] = [];
  if (!isRecord(data)) {
    return { valid: false, data: null, errors: ['Tree data must be an object.'] };
  }

  const dataRecord = isRecord(data.data) ? data.data : data;

  const rawNodes = collectionToRecord<PersonNode>(dataRecord.nodes);
  const rawEdges = collectionToRecord<TreeEdge>(dataRecord.edges);

  if (!rawNodes || !rawEdges) {
    return { valid: false, data: null, errors: ['Tree data must include nodes and edges.'] };
  }

  const nodes: NodeMap = {};

  for (const [id, node] of Object.entries(rawNodes)) {
    const nodeErrors: string[] = [];
    const normalizedNode = normalizeNode(node, id, nodeErrors);
    errors.push(...nodeErrors);
    if (normalizedNode) nodes[id] = normalizedNode;
  }

  const edges: EdgeMap = {};

  for (const [id, edge] of Object.entries(rawEdges)) {
    const edgeErrors: string[] = [];
    const normalizedEdge = normalizeEdge(edge, id, nodes, edgeErrors);
    errors.push(...edgeErrors);
    if (normalizedEdge) edges[id] = normalizedEdge;
  }

  validateRelationshipRules(nodes, edges, errors);

  if (errors.length > 0) {
    return { valid: false, data: null, errors: [...new Set(errors)] };
  }

  return { valid: true, data: { nodes, edges }, errors: [] };
};

export const normalizeTreeData = (data: unknown): TreeData | null => {
  const result = validateTreeData(data);
  return result.valid ? result.data : null;
};

export const isValidTreeData = (data: unknown): data is TreeData => normalizeTreeData(data) !== null;

export const normalizeTreeDocument = (data: unknown): TreeDocument | null => {
  if (!isRecord(data) || typeof data.version !== 'string') return null;

  const normalized = normalizeTreeData(data);
  if (!normalized) return null;

  return { ...normalized, version: data.version };
};

export const canAddRelationship = (
  nodes: NodeMap,
  edges: EdgeMap,
  edge: Omit<TreeEdge, 'id'>,
): { ok: true } | { ok: false; error: string } => {
  const probe = {
    nodes,
    edges: {
      ...edges,
      __probe__: { id: '__probe__', ...edge },
    },
  };
  const result = validateTreeData(probe);

  if (result.valid) return { ok: true };
  return { ok: false, error: result.errors[0] || 'Invalid relationship.' };
};
