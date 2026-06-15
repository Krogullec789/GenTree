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
import { canAddRelationship, normalizeTreeDocument, validateTreeData } from '../utils/treeData';
import { layoutTree } from '../utils/treeLayout';
import type {
  EdgeMap,
  NewPersonNode,
  NodeMap,
  NodePosition,
  PersonNode,
  RelationshipType,
  SaveStatus,
  TreeContextValue,
  TreeData,
} from '../types/tree';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

const TreeContext = createContext<TreeContextValue | null>(null);

export const useTreeInfo = (): TreeContextValue => {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error('useTreeInfo must be used within TreeProvider');
  }
  return context;
};

const createId = () => crypto.randomUUID();

const apiHeaders = (extra: Record<string, string> = {}) => ({
  ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
  ...extra,
});

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
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [dragPositions, setDragPositions] = useState<Record<string, NodePosition>>({});
  const [canvasScale, setCanvasScale] = useState(1);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSkipCountRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const versionRef = useRef<string | null>(null);
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

  const setCurrentVersion = useCallback((nextVersion: string | null) => {
    versionRef.current = nextVersion;
    setVersion(nextVersion);
  }, []);

  const resetHistory = useCallback((data: TreeData) => {
    const next = snapshot(data);
    currentTreeRef.current = next;
    historyRef.current = [next];
    setHistoryIndex(0);
    setHistoryLength(1);
  }, [snapshot]);

  const commitTree = useCallback((data: TreeData) => {
    const next = snapshot(data);
    const nextHistory = [...historyRef.current.slice(0, historyIndex + 1), next].slice(-50);
    historyRef.current = nextHistory;
    setHistoryIndex(nextHistory.length - 1);
    setHistoryLength(nextHistory.length);
    setTreeState(next);
    setLastError(null);
    setSaveStatus('idle');
  }, [historyIndex, setTreeState, snapshot]);

  useEffect(() => {
    fetch(`${API_URL}/api/tree`, { headers: apiHeaders() })
      .then(async res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        const normalizedData = normalizeTreeDocument(data);
        if (!normalizedData) {
          throw new Error('Server returned invalid tree data. Local state was not replaced.');
        }

        const loadedNodes = normalizedData.nodes;
        const loadedEdges = normalizedData.edges;
        setCurrentVersion(normalizedData.version);
        hasLoadedRef.current = true;

        if (Object.keys(loadedNodes).length > 0) {
          saveSkipCountRef.current = 1;
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          resetHistory({ nodes: loadedNodes, edges: loadedEdges });
          setSaveStatus('saved');
        } else {
          const rootId = createId();
          const rootNode: PersonNode = {
            id: rootId,
            firstName: 'Jan',
            lastName: 'Kowalski',
            maidenName: '',
            birthDate: '',
            deathDate: '',
            bio: 'Podstawowy zarys drzewa.',
            gender: 'male',
            avatar: '',
            x: window.innerWidth / 2 - 120,
            y: window.innerHeight / 2 - 50,
          };
          const rootTree = { nodes: { [rootId]: rootNode }, edges: {} };
          setNodes(rootTree.nodes);
          setEdges(rootTree.edges);
          resetHistory(rootTree);
          setSelectedNodeId(rootId);
          setIsPanelOpen(true);
          setSaveStatus('idle');
        }
      })
      .catch(e => {
        console.error('Failed to fetch tree data', e);
        hasLoadedRef.current = false;
        setSaveStatus('error');
        setLastError(e instanceof Error ? e.message : 'Failed to fetch tree data');
      });
  }, [resetHistory, setCurrentVersion]);

  useEffect(() => {
    const expectedVersion = versionRef.current;
    if (!hasLoadedRef.current || !expectedVersion || Object.keys(nodes).length === 0) return;

    if (saveSkipCountRef.current > 0) {
      saveSkipCountRef.current -= 1;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      fetch(`${API_URL}/api/tree`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json', 'If-Match': expectedVersion }),
        body: JSON.stringify({ nodes, edges }),
      })
        .then(async res => {
          const body = await res.json().catch(() => ({}));
          if (res.status === 409) {
            setSaveStatus('conflict');
            setLastError('Dane zmieniły się w innym oknie. Odśwież stronę przed kolejnym zapisem.');
            return;
          }
          if (!res.ok) throw new Error(body.error || `Server returned ${res.status}`);
          if (typeof body.version === 'string') setCurrentVersion(body.version);
          setSaveStatus('saved');
          setLastError(null);
        })
        .catch(e => {
          console.error('Failed to save tree data', e);
          setSaveStatus('error');
          setLastError(e instanceof Error ? e.message : 'Failed to save tree data');
        });
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges, setCurrentVersion]);

  const setDragPosition = useCallback((id: string, pos: NodePosition) => {
    setDragPositions(prev => ({ ...prev, [id]: pos }));
  }, []);

  const clearDragPosition = useCallback((id: string) => {
    setDragPositions(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const addNode = useCallback((nodeData: NewPersonNode) => {
    const current = currentTreeRef.current;
    const id = createId();
    const newNode = { id, ...nodeData };
    commitTree({ nodes: { ...current.nodes, [id]: newNode }, edges: current.edges });
    return id;
  }, [commitTree]);

  const updateNode = useCallback((id: string, updates: Partial<PersonNode>) => {
    const current = currentTreeRef.current;
    if (!current.nodes[id]) return;

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
    setLastError(null);
    return true;
  }, [commitTree]);

  const removeEdge = useCallback((id: string) => {
    const current = currentTreeRef.current;
    const newEdges = { ...current.edges };
    delete newEdges[id];
    commitTree({ nodes: current.nodes, edges: newEdges });
  }, [commitTree]);

  const undo = useCallback(() => {
    const nextIndex = historyIndex - 1;
    const next = historyRef.current[nextIndex];
    if (!next) return;

    setHistoryIndex(nextIndex);
    setTreeState(snapshot(next));
    setLastError(null);
    setSaveStatus('idle');
  }, [historyIndex, setTreeState, snapshot]);

  const redo = useCallback(() => {
    const nextIndex = historyIndex + 1;
    const next = historyRef.current[nextIndex];
    if (!next) return;

    setHistoryIndex(nextIndex);
    setTreeState(snapshot(next));
    setLastError(null);
    setSaveStatus('idle');
  }, [historyIndex, setTreeState, snapshot]);

  const applyAutoLayout = useCallback(() => {
    commitTree(layoutTree(currentTreeRef.current));
  }, [commitTree]);

  const replaceTree = useCallback((data: TreeData, nextVersion: string | null = null) => {
    const validation = validateTreeData(data);
    if (!validation.valid) {
      setSaveStatus('error');
      setLastError(validation.errors[0] || 'Invalid tree data');
      return;
    }

    saveSkipCountRef.current = 0;
    commitTree(validation.data);
    if (nextVersion) setCurrentVersion(nextVersion);
    setSelectedNodeId(null);
    setIsPanelOpen(false);
    setLastError(null);
    setSaveStatus('idle');
  }, [commitTree, setCurrentVersion]);

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
    canvasScale,
    dragPositions,
    focusNodeId,
    setSelectedNodeId,
    setIsPanelOpen,
    setCanvasScale,
    setDragPosition,
    clearDragPosition,
    setFocusNodeId,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    undo,
    redo,
    applyAutoLayout,
    setNodes,
    setEdges,
    replaceTree,
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
    canvasScale,
    dragPositions,
    focusNodeId,
    setDragPosition,
    clearDragPosition,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    undo,
    redo,
    applyAutoLayout,
    replaceTree,
  ]);

  return (
    <TreeContext.Provider value={value}>
      {children}
    </TreeContext.Provider>
  );
};
