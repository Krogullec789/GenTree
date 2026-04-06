import React, { useRef, useState, useEffect } from 'react';
import { useTreeInfo } from '../store/TreeContext';
import PersonNode from './PersonNode';

const Canvas = () => {
  const { nodes, edges, updateNode, setSelectedNodeId, setIsPanelOpen } = useTreeInfo();
  
  // Transform state: [x, y, scale]
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Handle panning
  const handleMouseDown = (e) => {
    // If clicking on a node, don't pan canvas
    if (e.target.closest('.person-node')) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    setSelectedNodeId(null);
    setIsPanelOpen(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setTransform({
      ...transform,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zooming
  const handleWheel = (e) => {
    // Math logic to zoom to mouse position
    const zoomSensitivity = 0.001;
    let newScale = transform.scale - e.deltaY * zoomSensitivity;
    newScale = Math.min(Math.max(0.2, newScale), 3); // clamp scale
    
    // Simplistic zoom to center for now. For true mouse-centered zoom:
    // Need cursor relative to canvas
    setTransform((prev) => ({
      ...prev,
      scale: newScale
    }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: true });
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
    };
  }, [transform.scale]);

  // Edges drawing logic
  // A simplistic SVG overlay underneath nodes
  const renderEdges = () => {
    return edges.map((edge) => {
      const sourceNode = nodes.find(n => n.id === edge.sourceId);
      const targetNode = nodes.find(n => n.id === edge.targetId);
      
      if (!sourceNode || !targetNode) return null;

      // Node dimensions
      const nodeW = 240;
      const nodeH = 100;

      let startX, startY, endX, endY;

      if (edge.type === 'parent-child') {
        // Source is Parent, Target is Child
        startX = sourceNode.x + nodeW / 2;
        startY = sourceNode.y + nodeH;
        endX = targetNode.x + nodeW / 2;
        endY = targetNode.y;
      } else {
        // Partner (horizontal)
        if (sourceNode.x < targetNode.x) {
          startX = sourceNode.x + nodeW;
          startY = sourceNode.y + nodeH / 2;
          endX = targetNode.x;
          endY = targetNode.y + nodeH / 2;
        } else {
          startX = sourceNode.x;
          startY = sourceNode.y + nodeH / 2;
          endX = targetNode.x + nodeW;
          endY = targetNode.y + nodeH / 2;
        }
      }

      // Bezier curve magic
      let pathData = '';
      if (edge.type === 'parent-child') {
        pathData = `M ${startX} ${startY} C ${startX} ${(startY+endY)/2}, ${endX} ${(startY+endY)/2}, ${endX} ${endY}`;
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
        background: 'transparent'
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
        top: 0, left: 0,
        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
      }}>
        {/* SVG layer for relationship lines */}
        <svg style={{ position: 'absolute', width: '10000px', height: '10000px', pointerEvents: 'none', top: -5000, left: -5000, overflow: 'visible' }}>
          <g transform={`translate(5000, 5000)`}>
            {renderEdges()}
          </g>
        </svg>

        {/* HTML layer for nodes */}
        {nodes.map(node => (
          <PersonNode 
            key={node.id} 
            node={node} 
          />
        ))}
      </div>
    </div>
  );
};

export default Canvas;
