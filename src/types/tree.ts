import type React from 'react';

export type Gender = 'male' | 'female';
export type RelationshipType = 'parent-child' | 'partner';

export interface PersonNode {
  id: string;
  firstName?: string;
  lastName?: string;
  maidenName?: string;
  birthDate?: string;
  deathDate?: string;
  bio?: string;
  gender: Gender;
  avatar?: string;
  x: number;
  y: number;
}

export type NodePosition = Pick<PersonNode, 'x' | 'y'>;
export type NewPersonNode = Omit<PersonNode, 'id'>;

export interface TreeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
}

export type NodeMap = Record<string, PersonNode>;
export type EdgeMap = Record<string, TreeEdge>;

export interface TreeData {
  nodes: NodeMap;
  edges: EdgeMap;
}

export interface TreeDocument extends TreeData {
  version: string;
}

export type SaveStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error' | 'conflict';

export interface TreeContextValue extends TreeData {
  version: string | null;
  saveStatus: SaveStatus;
  lastError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  selectedNodeId: string | null;
  isPanelOpen: boolean;
  canvasScale: number;
  dragPositions: Record<string, NodePosition>;
  focusNodeId: string | null;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCanvasScale: React.Dispatch<React.SetStateAction<number>>;
  setDragPosition: (id: string, pos: NodePosition) => void;
  clearDragPosition: (id: string) => void;
  setFocusNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  addNode: (nodeData: NewPersonNode) => string;
  updateNode: (id: string, updates: Partial<PersonNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (sourceId: string, targetId: string, type: RelationshipType) => boolean;
  removeEdge: (id: string) => void;
  undo: () => void;
  redo: () => void;
  applyAutoLayout: () => void;
  setNodes: React.Dispatch<React.SetStateAction<NodeMap>>;
  setEdges: React.Dispatch<React.SetStateAction<EdgeMap>>;
  replaceTree: (data: TreeData, nextVersion?: string | null) => void;
}
