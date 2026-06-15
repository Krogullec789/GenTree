import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useTreeInfo } from '../store/TreeContext';
import PersonNode from './PersonNode';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants/layout';

const Canvas = () => {
  const { nodes, edges, dragPositions, focusNodeId, setFocusNodeId, setSelectedNodeId, setIsPanelOpen, setCanvasScale } = useTreeInfo();

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
    if ((e.target as HTMLElement).closest('.person-node')) return;
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

  const renderEdges = () => {
    return Object.values(edges).map((edge) => {
      if (!visibleNodeIds.has(edge.sourceId) && !visibleNodeIds.has(edge.targetId)) return null;

      const sourceNode = nodes[edge.sourceId];
      const targetNode = nodes[edge.targetId];

      if (!sourceNode || !targetNode) return null;

      // Use live drag position if this node is being dragged, otherwise use stored position
      const sPos = dragPositions[edge.sourceId] || sourceNode;
      const tPos = dragPositions[edge.targetId] || targetNode;

      const nodeW = NODE_WIDTH;
      const nodeH = NODE_HEIGHT;

      let startX, startY, endX, endY;

      if (edge.type === 'parent-child') {
        startX = sPos.x + nodeW / 2;
        startY = sPos.y + nodeH;
        endX = tPos.x + nodeW / 2;
        endY = tPos.y;
      } else {
        if (sPos.x < tPos.x) {
          startX = sPos.x + nodeW;
          startY = sPos.y + nodeH / 2;
          endX = tPos.x;
          endY = tPos.y + nodeH / 2;
        } else {
          startX = sPos.x;
          startY = sPos.y + nodeH / 2;
          endX = tPos.x + nodeW;
          endY = tPos.y + nodeH / 2;
        }
      }

      let pathData = '';
      if (edge.type === 'parent-child') {
        pathData = `M ${startX} ${startY} C ${startX} ${(startY + endY) / 2}, ${endX} ${(startY + endY) / 2}, ${endX} ${endY}`;
      } else {
        pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
      }

      return (
        <path
          key={edge.id}
          d={pathData}
          fill="none"
          stroke={edge.type === 'partner' ? 'var(--accent-color)' : 'var(--line-color)'}
          strokeWidth="3"
          strokeDasharray={edge.type === 'partner' ? '5,5' : 'none'}
        />
      );
    });
  };

  return (
    <div
      ref={canvasRef}
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
            {renderEdges()}
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
