/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { canAddRelationship, validateTreeData } from '../utils/treeData';
import { layoutTree } from '../utils/treeLayout';
import type {
  EdgeMap,
  NewPersonNode,
  NodeMap,
  PersonNode,
  RelationKind,
  RelationshipType,
  SaveStatus,
  TreeContextValue,
  TreeData,
} from '../types/tree';

import { SaveQueue } from './saveQueue';
import { treeStorage, DEMO_MODE } from './treeStorage';
import { createDemoTree } from '../utils/demoTree';
import { DragProvider } from './DragContext';

const TreeContext = createContext<TreeContextValue | null>(null);

export const useTreeInfo = (): TreeContextValue => {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error('useTreeInfo must be used within TreeProvider');
  }
  return context;
};

const createId = () => crypto.randomUUID();

interface TreeProviderProps {
  children: React.ReactNode;
}

export const TreeProvider = ({ children }: TreeProviderProps) => {
  const [nodes, setNodes] = useState<NodeMap>({});
  const [edges, setEdges] = useState<EdgeMap>({});
  const [version, setVersion] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading');
  const [lastError, setLastError] = useState<string | null>(null);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [fitViewRequest, setFitViewRequest] = useState(0);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const queueRef = useRef<SaveQueue | null>(null);
  const loadedRef = useRef(false);
  const historyIndexRef = useRef(0);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const historyRef = useRef<TreeData[]>([]);
  const currentTreeRef = useRef<TreeData>({ nodes: {}, edges: {} });

  const snapshot = useCallback((data: TreeData): TreeData => ({
    nodes: Object.fromEntries(Object.entries(data.nodes).map(([id, node]) => [id, { ...node }])),
    edges: Object.fromEntries(Object.entries(data.edges).map(([id, edge]) => [id, { ...edge }])),
  }), []);

  const setTreeState = useCallback((data: TreeData) => {
    currentTreeRef.current = data;
    setNodes(data.nodes);
    setEdges(data.edges);
  }, []);

  const resetHistory = useCallback((data: TreeData) => {
    const next = snapshot(data);
    currentTreeRef.current = next;
    historyRef.current = [next];
    historyIndexRef.current = 0;
    setHistoryIndex(0);
    setHistoryLength(1);
  }, [snapshot]);

  const commitTree = useCallback((data: TreeData) => {
    if (!loadedRef.current) return false;
    const validation = validateTreeData(data);
    if (!validation.valid) {
      setLastError(validation.errors[0]);
      return false;
    }
    const next = snapshot(validation.data);
    const nextHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), next].slice(-50);
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistoryIndex(nextHistory.length - 1);
    setHistoryLength(nextHistory.length);
    setTreeState(next);
    queueRef.current?.enqueue(next);
    return true;
  }, [setTreeState, snapshot]);

  useEffect(() => {
    let active = true;
    loadedRef.current = false;
    treeStorage.load().then(document => {
      if (!active) return;
      const tree = { nodes: document.nodes, edges: document.edges };
      setTreeState(tree);
      resetHistory(tree);
      setVersion(document.version);
      setLastError(null);
      setSaveStatus('saved');
      setFitViewRequest(request => request + 1);
      loadedRef.current = true;
      queueRef.current = new SaveQueue(document.version, treeStorage.save, (status, error, nextVersion) => {
        setSaveStatus(status);
        setLastError(error);
        setVersion(nextVersion);
      });
    }).catch(error => {
      if (!active) return;
      setSaveStatus('error');
      setLastError(error instanceof Error ? error.message : 'Nie udało się wczytać drzewa.');
    });
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!queueRef.current?.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => {
      active = false;
      queueRef.current?.dispose();
      queueRef.current = null;
      window.removeEventListener('beforeunload', warnBeforeLeaving);
    };
  }, [loadAttempt, resetHistory, setTreeState]);

  const retrySave = useCallback(() => {
    if (loadedRef.current) queueRef.current?.retry();
    else { setSaveStatus('loading'); setLoadAttempt(attempt => attempt + 1); }
  }, []);

  const reloadTree = useCallback(() => {
    loadedRef.current = false;
    queueRef.current?.dispose();
    queueRef.current = null;
    setSelectedNodeId(null);
    setIsPanelOpen(false);
    setSaveStatus('loading');
    setLoadAttempt(attempt => attempt + 1);
  }, []);

  const addNode = useCallback((nodeData: NewPersonNode) => {
    const current = currentTreeRef.current;
    const id = createId();
    const newNode = { id, ...nodeData };
    return commitTree({ nodes: { ...current.nodes, [id]: newNode }, edges: current.edges }) ? id : null;
  }, [commitTree]);

  const addRelative = useCallback((personId: string, kind: RelationKind, nodeData: NewPersonNode) => {
    const current = currentTreeRef.current;
    const id = createId();
    const edgeId = createId();
    const next: TreeData = {
      nodes: { ...current.nodes, [id]: { ...nodeData, id } },
      edges: {
        ...current.edges,
        [edgeId]: {
          id: edgeId,
          sourceId: kind === 'parent' ? id : personId,
          targetId: kind === 'parent' ? personId : id,
          type: kind === 'partner' ? 'partner' : 'parent-child',
        },
      },
    };
    return commitTree(next) ? id : null;
  }, [commitTree]);

  const updateNode = useCallback((id: string, updates: Partial<PersonNode>) => {
    const current = currentTreeRef.current;
    if (!current.nodes[id]) return;
    if (Object.entries(updates).every(([key, value]) => current.nodes[id][key as keyof PersonNode] === value)) return;

    commitTree({
      nodes: {
        ...current.nodes,
        [id]: { ...current.nodes[id], ...updates },
      },
      edges: current.edges,
    });
  }, [commitTree]);

  const removeNode = useCallback((id: string) => {
    const current = currentTreeRef.current;
    const newNodes = { ...current.nodes };
    delete newNodes[id];

    const newEdges = { ...current.edges };
    for (const edgeId in newEdges) {
      if (newEdges[edgeId].sourceId === id || newEdges[edgeId].targetId === id) {
        delete newEdges[edgeId];
      }
    }

    commitTree({ nodes: newNodes, edges: newEdges });

    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      setIsPanelOpen(false);
    }
  }, [commitTree, selectedNodeId]);

  const addEdge = useCallback((sourceId: string, targetId: string, type: RelationshipType) => {
    const current = currentTreeRef.current;
    const exists = Object.values(current.edges).some(
      edge =>
        (edge.sourceId === sourceId && edge.targetId === targetId && edge.type === type) ||
        (type === 'partner' && edge.sourceId === targetId && edge.targetId === sourceId && edge.type === type),
    );
    if (exists) return false;

    const check = canAddRelationship(current.nodes, current.edges, { sourceId, targetId, type });
    if (!check.ok) {
      setLastError(check.error);
      return false;
    }

    const id = createId();
    commitTree({ nodes: current.nodes, edges: { ...current.edges, [id]: { id, sourceId, targetId, type } } });
    return true;
  }, [commitTree]);

  const removeEdge = useCallback((id: string) => {
    const current = currentTreeRef.current;
    const newEdges = { ...current.edges };
    delete newEdges[id];
    commitTree({ nodes: current.nodes, edges: newEdges });
  }, [commitTree]);

  const undo = useCallback(() => {
    if (!loadedRef.current) return;
    const nextIndex = historyIndexRef.current - 1;
    const next = historyRef.current[nextIndex];
    if (!next) return;

    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setTreeState(snapshot(next));
    queueRef.current?.enqueue(next);
  }, [setTreeState, snapshot]);

  const redo = useCallback(() => {
    if (!loadedRef.current) return;
    const nextIndex = historyIndexRef.current + 1;
    const next = historyRef.current[nextIndex];
    if (!next) return;

    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setTreeState(snapshot(next));
    queueRef.current?.enqueue(next);
  }, [setTreeState, snapshot]);

  const applyAutoLayout = useCallback(() => {
    commitTree(layoutTree(currentTreeRef.current));
    setFitViewRequest(request => request + 1);
  }, [commitTree]);

  const replaceTree = useCallback((data: TreeData) => {
    const validation = validateTreeData(data);
    if (!validation.valid) {
      setSaveStatus('error');
      setLastError(validation.errors[0] || 'Invalid tree data');
      return;
    }

    commitTree(validation.data);
    setFitViewRequest(request => request + 1);
    setSelectedNodeId(null);
    setIsPanelOpen(false);
  }, [commitTree]);

  const resetDemo = useCallback(() => replaceTree(createDemoTree()), [replaceTree]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  const value = useMemo<TreeContextValue>(() => ({
    nodes,
    edges,
    version,
    saveStatus,
    lastError,
    canUndo,
    canRedo,
    selectedNodeId,
    isPanelOpen,
    focusNodeId,
    fitViewRequest,
    setSelectedNodeId,
    setIsPanelOpen,
    setFocusNodeId,
    addNode,
    addRelative,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    undo,
    redo,
    applyAutoLayout,
    replaceTree,
    isDemo: DEMO_MODE,
    retrySave,
    reloadTree,
    resetDemo,
  }), [
    nodes,
    edges,
    version,
    saveStatus,
    lastError,
    canUndo,
    canRedo,
    selectedNodeId,
    isPanelOpen,
    focusNodeId,
    fitViewRequest,
    addNode,
    addRelative,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    undo,
    redo,
    applyAutoLayout,
    replaceTree,
    retrySave,
    reloadTree,
    resetDemo,
  ]);

  return (
    <TreeContext.Provider value={value}>
      <DragProvider>{children}</DragProvider>
    </TreeContext.Provider>
  );
};
