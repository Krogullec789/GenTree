import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTreeInfo } from '../store/TreeContext';
import PersonNode from './PersonNode';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants/layout';

const Canvas = () => {
  const { nodes, edges, dragPositions, focusNodeId, setFocusNodeId, setSelectedNodeId, setIsPanelOpen, setCanvasScale } = useTreeInfo();

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFocusing, setIsFocusing] = useState(false);
  const canvasRef = useRef(null);
  const focusTimerRef = useRef(null);

  // Keep context scale in sync whenever local transform.scale changes
  useEffect(() => {
    setCanvasScale(transform.scale);
  }, [transform.scale, setCanvasScale]);

  // Center canvas on a node when focusNodeId changes
  useEffect(() => {
    if (!focusNodeId || !nodes[focusNodeId] || !canvasRef.current) return;
    const node = nodes[focusNodeId];
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = transform.scale;
    const newX = rect.width  / 2 - (node.x + NODE_WIDTH  / 2) * scale;
    const newY = rect.height / 2 - (node.y + NODE_HEIGHT / 2) * scale;
    setIsFocusing(true);
    setTransform(prev => ({ ...prev, x: newX, y: newY }));
    clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => setIsFocusing(false), 450);
    setFocusNodeId(null);
    return () => clearTimeout(focusTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNodeId]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.person-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    setSelectedNodeId(null);
    setIsPanelOpen(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Zoom correctly towards the mouse cursor position
  // Using useCallback with no deps so the event listener is registered only once.
  // Functional setState form (prev =>) gives us current state without needing it as a dep.
  const handleWheel = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      canvas.addEventListener('wheel', handleWheel, { passive: true });
    }
    return () => {
      if (canvas) canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const renderEdges = () => {
    return Object.values(edges).map((edge) => {
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
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: '0 0',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        transition: isDragging ? 'none' : isFocusing ? 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' : 'transform 0.05s ease-out',
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
        {Object.values(nodes).map(node => (
          <PersonNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
