import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Use env variable — falls back to localhost for local dev
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TreeContext = createContext();

export const useTreeInfo = () => useContext(TreeContext);

export const TreeProvider = ({ children }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  // Shared canvas scale so PersonNode can correct drag delta at zoom != 1
  const [canvasScale, setCanvasScale] = useState(1);

  const saveTimerRef = useRef(null);
  // Tracks how many effect invocations to skip (used to prevent re-saving data just loaded from server)
  const saveSkipCountRef = useRef(0);

  // Load from REST API on mount
  useEffect(() => {
    fetch(`${API_URL}/api/tree`)
      .then(res => res.json())
      .then(data => {
        if (data.nodes && data.nodes.length > 0) {
          // Skip saving the very next effect run — we just loaded this data, no need to POST it back
          saveSkipCountRef.current = 1;
          setNodes(data.nodes);
          setEdges(data.edges || []);
        } else {
          // Empty DB — create a root node and let it save normally
          const rootId = uuidv4();
          const rootNode = {
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
          setNodes([rootNode]);
          setSelectedNodeId(rootId);
          setIsPanelOpen(true);
        }
      })
      .catch(e => console.error('Failed to fetch tree data', e));
  }, []);

  // Debounced auto-save — 500ms after last change, batch all edits into a single request
  useEffect(() => {
    if (nodes.length === 0) return;

    if (saveSkipCountRef.current > 0) {
      saveSkipCountRef.current -= 1;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      fetch(`${API_URL}/api/tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      }).catch(e => console.error('Failed to save tree data', e));
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges]);

  const addNode = (nodeData) => {
    const newNode = { id: uuidv4(), ...nodeData };
    setNodes((prev) => [...prev, newNode]);
    return newNode.id;
  };

  const updateNode = (id, updates) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const removeNode = (id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.sourceId !== id && e.targetId !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      setIsPanelOpen(false);
    }
  };

  const addEdge = (sourceId, targetId, type) => {
    const exists = edges.some(
      (e) =>
        (e.sourceId === sourceId && e.targetId === targetId && e.type === type) ||
        (type === 'partner' && e.sourceId === targetId && e.targetId === sourceId && e.type === type)
    );
    if (!exists) {
      setEdges((prev) => [...prev, { id: uuidv4(), sourceId, targetId, type }]);
    }
  };

  const removeEdge = (id) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <TreeContext.Provider
      value={{
        nodes,
        edges,
        selectedNodeId,
        isPanelOpen,
        canvasScale,
        setSelectedNodeId,
        setIsPanelOpen,
        setCanvasScale,
        addNode,
        updateNode,
        removeNode,
        addEdge,
        removeEdge,
        setNodes,
        setEdges,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
};
