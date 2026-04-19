/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Use env variable — falls back to localhost for local dev
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TreeContext = createContext();

export const useTreeInfo = () => useContext(TreeContext);

export const TreeProvider = ({ children }) => {
  const [nodes, setNodes] = useState({});
  const [edges, setEdges] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState(null);
  // Temporary drag positions — updated every mousemove without touching global `nodes`
  const [dragPositions, setDragPositions] = useState({});
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
        // Zapewniamy wsparcie dla danych starych (Array) i nowych (Object)
        let loadedNodes = {};
        let loadedEdges = {};

        if (Array.isArray(data.nodes)) {
          data.nodes.forEach(n => loadedNodes[n.id] = n);
        } else {
          loadedNodes = data.nodes || {};
        }

        if (Array.isArray(data.edges)) {
          data.edges.forEach(e => loadedEdges[e.id] = e);
        } else {
          loadedEdges = data.edges || {};
        }

        if (Object.keys(loadedNodes).length > 0) {
          // Skip saving the very next effect run — we just loaded this data, no need to POST it back
          saveSkipCountRef.current = 1;
          setNodes(loadedNodes);
          setEdges(loadedEdges);
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
          setNodes({ [rootId]: rootNode });
          setSelectedNodeId(rootId);
          setIsPanelOpen(true);
        }
      })
      .catch(e => console.error('Failed to fetch tree data', e));
  }, []);

  // Debounced auto-save — 500ms after last change, batch all edits into a single request
  useEffect(() => {
    if (Object.keys(nodes).length === 0) return;

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

  const setDragPosition = (id, pos) => {
    setDragPositions(prev => ({ ...prev, [id]: pos }));
  };

  const clearDragPosition = (id) => {
    setDragPositions(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addNode = (nodeData) => {
    const id = uuidv4();
    const newNode = { id, ...nodeData };
    setNodes((prev) => ({ ...prev, [id]: newNode }));
    return id;
  };

  const updateNode = (id, updates) => {
    setNodes((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], ...updates }
      };
    });
  };

  const removeNode = (id) => {
    setNodes((prev) => {
      const newNodes = { ...prev };
      delete newNodes[id];
      return newNodes;
    });
    setEdges((prev) => {
      const newEdges = { ...prev };
      for (const edgeId in newEdges) {
        if (newEdges[edgeId].sourceId === id || newEdges[edgeId].targetId === id) {
          delete newEdges[edgeId];
        }
      }
      return newEdges;
    });
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      setIsPanelOpen(false);
    }
  };

  const addEdge = (sourceId, targetId, type) => {
    const exists = Object.values(edges).some(
      (e) =>
        (e.sourceId === sourceId && e.targetId === targetId && e.type === type) ||
        (type === 'partner' && e.sourceId === targetId && e.targetId === sourceId && e.type === type)
    );
    if (!exists) {
      const id = uuidv4();
      setEdges((prev) => ({ ...prev, [id]: { id, sourceId, targetId, type } }));
    }
  };

  const removeEdge = (id) => {
    setEdges((prev) => {
      const newEdges = { ...prev };
      delete newEdges[id];
      return newEdges;
    });
  };

  return (
    <TreeContext.Provider
      value={{
        nodes,
        edges,
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
        setNodes,
        setEdges,
      }}
    >
      {children}
    </TreeContext.Provider>
  );
};
