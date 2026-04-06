import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const TreeContext = createContext();

export const useTreeInfo = () => useContext(TreeContext);

// Initial empty state
const initialState = {
  nodes: [], // { id, firstName, lastName, birthDate, deathDate, bio, avatar, gender, x, y }
  edges: [], // { id, sourceId, targetId, type: 'parent-child' | 'partner' }
};

export const TreeProvider = ({ children }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Load from REST API
  useEffect(() => {
    fetch('http://localhost:3001/api/tree')
      .then(res => res.json())
      .then(data => {
        if (data.nodes && data.nodes.length > 0) {
          setNodes(data.nodes);
          setEdges(data.edges || []);
        } else {
          // Create first node if empty
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
      .catch(e => console.error("Failed to fetch tree data", e));
  }, []);

  // Save to REST API on change (debounce could be added, but works for now)
  useEffect(() => {
    if (nodes.length > 0) {
      fetch('http://localhost:3001/api/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      }).catch(e => console.error("Failed to save tree data", e));
    }
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
    // avoid duplicates
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
        setSelectedNodeId,
        setIsPanelOpen,
        addNode,
        updateNode,
        removeNode,
        addEdge,
        removeEdge,
        setNodes,
        setEdges
      }}
    >
      {children}
    </TreeContext.Provider>
  );
};
