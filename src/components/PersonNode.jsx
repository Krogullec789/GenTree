import React, { useState, useRef } from 'react';
import { useTreeInfo } from '../store/TreeContext';
import { User, GripHorizontal } from 'lucide-react';
import { NODE_WIDTH } from '../constants/layout';

const PersonNode = ({ node }) => {
  const { selectedNodeId, setSelectedNodeId, setIsPanelOpen, updateNode, canvasScale, setDragPosition, clearDragPosition } = useTreeInfo();
  const isSelected = selectedNodeId === node.id;

  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [localPos, setLocalPos] = useState({ x: node.x, y: node.y });
  const localPosRef = useRef(localPos);

  const displayX = isDraggingNode ? localPos.x : node.x;
  const displayY = isDraggingNode ? localPos.y : node.y;

  const formatYear = (dateStr) => {
    if (!dateStr) return '?';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr.substring(0, 4) : d.getFullYear();
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isDraggingNode) {
      setSelectedNodeId(node.id);
      setIsPanelOpen(true);
    }
  };

  const handleDragStart = (e) => {
    e.stopPropagation();
    setIsDraggingNode(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = node.x;
    const initialY = node.y;
    // Capture scale at drag start — dividing screen-space pixels by scale converts
    // them to canvas-space pixels, so dragging is accurate at any zoom level.
    const scale = canvasScale;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      const newPos = { x: initialX + dx, y: initialY + dy };
      setLocalPos(newPos);
      localPosRef.current = newPos;
      setDragPosition(node.id, newPos);
    };

    const handleMouseUp = () => {
      updateNode(node.id, localPosRef.current);
      clearDragPosition(node.id);
      setTimeout(() => setIsDraggingNode(false), 50);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`person-node glass ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: displayX,
        top: displayY,
        width: `${NODE_WIDTH}px`,
        minHeight: '90px',
        borderRadius: '16px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
        boxShadow: isSelected ? '0 0 20px rgba(59,130,246,0.5)' : 'var(--glass-shadow)',
        transition: isDraggingNode ? 'none' : 'box-shadow 0.3s, border 0.3s',
        zIndex: isSelected ? 50 : 10,
        backgroundColor: node.gender === 'female' ? 'rgba(236,72,153, 0.1)' : 'rgba(59,130,246, 0.1)',
      }}
    >
      <div
        onMouseDown={handleDragStart}
        role="button"
        aria-label="Przesuń osobę"
        tabIndex={0}
        style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--node-border)',
          borderRadius: '10px',
          padding: '2px 8px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <GripHorizontal size={14} color="var(--text-secondary)" />
      </div>

      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: 'var(--node-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {node.avatar ? (
          <img src={node.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable="false" />
        ) : (
          <User size={28} color="var(--text-secondary)" />
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {node.firstName} {node.lastName} {node.maidenName ? `(z d. ${node.maidenName})` : ''}
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {node.birthDate ? formatYear(node.birthDate) : '?'}{node.deathDate ? ` – ${formatYear(node.deathDate)}` : ''}
        </p>
      </div>
    </div>
  );
};

export default PersonNode;
