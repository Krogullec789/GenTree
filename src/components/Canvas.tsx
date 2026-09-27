import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useTreeInfo } from '../store/TreeContext';
import RelationshipLines from './RelationshipLines';
import { useCanvasScale } from '../store/DragContext';
import PersonNode from './PersonNode';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants/layout';

const Canvas = () => {
  const { nodes, edges, saveStatus, addNode, fitViewRequest, focusNodeId, setFocusNodeId, setSelectedNodeId, setIsPanelOpen } = useTreeInfo();

  const { setCanvasScale } = useCanvasScale();
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Keep context scale in sync whenever local transform.scale changes
  useEffect(() => {
    setCanvasScale(transform.scale);
  }, [transform.scale, setCanvasScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateViewport = () => {
      const rect = canvas.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
    };
    updateViewport();

    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, []);

  // Center canvas on a node when focusNodeId changes
  useEffect(() => {
    if (!focusNodeId || !nodes[focusNodeId] || !canvasRef.current) return;
    const node = nodes[focusNodeId];
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = transform.scale;
    const newX = rect.width  / 2 - (node.x + NODE_WIDTH  / 2) * scale;
    const newY = rect.height / 2 - (node.y + NODE_HEIGHT / 2) * scale;
    setTransform(prev => ({ ...prev, x: newX, y: newY }));
    setFocusNodeId(null);
  }, [focusNodeId, nodes, setFocusNodeId, transform.scale]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0 || (e.target as Element).closest('.person-node, button, .canvas-controls, .empty-tree')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    setSelectedNodeId(null);
    setIsPanelOpen(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  // Zoom correctly towards the mouse cursor position
  // Using useCallback with no deps so the event listener is registered only once.
  // Functional setState form (prev =>) gives us current state without needing it as a dep.
  const handleWheel = useCallback((e: WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform(prev => {
      const zoomSensitivity = 0.001;
      let newScale = prev.scale - e.deltaY * zoomSensitivity;
      newScale = Math.min(Math.max(0.2, newScale), 3);

      // Scale the canvas origin so the point under the cursor stays fixed
      const scaleRatio = newScale / prev.scale;
      const newX = mouseX - scaleRatio * (mouseX - prev.x);
      const newY = mouseY - scaleRatio * (mouseY - prev.y);

      return { x: newX, y: newY, scale: newScale };
    });
  }, []); // stable — no captured state, uses functional updater

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (canvas) canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const visibleNodes = useMemo(() => {
    const allNodes = Object.values(nodes);
    if (viewport.width === 0 || viewport.height === 0) return allNodes;

    const margin = 500;
    const minX = (-transform.x / transform.scale) - margin;
    const minY = (-transform.y / transform.scale) - margin;
    const maxX = ((viewport.width - transform.x) / transform.scale) + margin;
    const maxY = ((viewport.height - transform.y) / transform.scale) + margin;

    return allNodes.filter(node =>
      node.x + NODE_WIDTH >= minX &&
      node.x <= maxX &&
      node.y + NODE_HEIGHT >= minY &&
      node.y <= maxY,
    );
  }, [nodes, transform, viewport]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(node => node.id)), [visibleNodes]);


  const zoom = (factor: number) => {
    setTransform(prev => {
      const scale = Math.min(3, Math.max(0.2, prev.scale * factor));
      const ratio = scale / prev.scale;
      return { scale, x: viewport.width / 2 - (viewport.width / 2 - prev.x) * ratio, y: viewport.height / 2 - (viewport.height / 2 - prev.y) * ratio };
    });
  };

  const fitTree = useCallback(() => {
    const people = Object.values(nodes);
    if (!people.length) return;
    const minX = Math.min(...people.map(node => node.x));
    const minY = Math.min(...people.map(node => node.y));
    const width = Math.max(...people.map(node => node.x + NODE_WIDTH)) - minX;
    const height = Math.max(...people.map(node => node.y + NODE_HEIGHT)) - minY;
    const scale = Math.min(1.5, Math.max(0.05, Math.min((viewport.width - 48) / width, (viewport.height - 100) / height)));
    setTransform({ scale, x: (viewport.width - width * scale) / 2 - minX * scale, y: (viewport.height - height * scale) / 2 - minY * scale });
  }, [nodes, viewport]);

  const lastFitRequest = useRef(-1);
  useEffect(() => {
    if (lastFitRequest.current === fitViewRequest || viewport.width === 0 || viewport.height === 0 || Object.keys(nodes).length === 0) return;
    // Fit after the browser has measured the initial canvas, before interaction.
    const frame = requestAnimationFrame(() => { lastFitRequest.current = fitViewRequest; fitTree(); });
    return () => cancelAnimationFrame(frame);
  }, [fitTree, fitViewRequest, nodes, viewport]);

  const addFirstPerson = () => {
    const id = addNode({ firstName: 'Nowa', lastName: 'Osoba', gender: 'male', x: 80, y: 80 });
    if (!id) return;
    setSelectedNodeId(id);
    setIsPanelOpen(true);
    setFocusNodeId(id);
  };

  return (
    <div
      ref={canvasRef}
      aria-label="Obszar drzewa"
      data-testid="tree-canvas"
      style={{
        flex: 1,
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        overflow: 'hidden',
        background: 'transparent',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {Object.keys(nodes).length === 0 && (
        <div className="empty-tree">
          <h2>{saveStatus === 'loading' ? 'Wczytywanie drzewa…' : 'Tutaj zaczyna się Twoja historia'}</h2>
          <p>Dodaj pierwszą osobę, a następnie połącz ją z rodziną.</p>
          <button className="btn" disabled={saveStatus === 'loading' || saveStatus === 'error'} onClick={addFirstPerson}>Dodaj pierwszą osobę</button>
        </div>
      )}
      <div className="canvas-controls" role="group" aria-label="Widok drzewa">
        <button className="btn secondary" aria-label="Pomniejsz" onClick={() => zoom(1 / 1.25)}>−</button>
        <output aria-label="Powiększenie">{Math.round(transform.scale * 100)}%</output>
        <button className="btn secondary" aria-label="Powiększ" onClick={() => zoom(1.25)}>+</button>
        <button className="btn secondary" onClick={fitTree}>Pokaż całe drzewo</button>
      </div>
      <div style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        transition: isDragging ? 'none' : 'transform 0.12s ease-out',
      }}>
        {/* SVG layer for relationship lines */}
        <svg style={{
          position: 'absolute',
          width: '10000px',
          height: '10000px',
          pointerEvents: 'none',
          top: -5000,
          left: -5000,
          overflow: 'visible',
        }}>
          <g transform="translate(5000, 5000)">
            <RelationshipLines nodes={nodes} edges={edges} visibleNodeIds={visibleNodeIds} />
          </g>
        </svg>

        {/* HTML layer for nodes */}
        {visibleNodes.map(node => (
          <PersonNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
