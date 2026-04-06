import React, { useState } from 'react';
import { useTreeInfo } from '../store/TreeContext';
import { User, GripHorizontal } from 'lucide-react';

const PersonNode = ({ node }) => {
  const { selectedNodeId, setSelectedNodeId, setIsPanelOpen, updateNode } = useTreeInfo();
  const isSelected = selectedNodeId === node.id;

  const [isDraggingNode, setIsDraggingNode] = useState(false);

  const formatYear = (dateStr) => {
    if (!dateStr) return '?';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr.substring(0,4) : d.getFullYear();
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isDraggingNode) {
      setSelectedNodeId(node.id);
      setIsPanelOpen(true);
    }
  };

  // Node Dragging logic
  const handleDragStart = (e) => {
    e.stopPropagation();
    setIsDraggingNode(true);
    // Add logic here to drag visually using top/left updates directly on DOM to be smooth
    // For now simple state updates work, but can be chuggy if canvas is huge.
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = node.x;
    const initialY = node.y;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      updateNode(node.id, { x: initialX + dx, y: initialY + dy });
    };

    const handleMouseUp = () => {
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
        left: node.x,
        top: node.y,
        width: 'var(--node-width)',
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
        backgroundColor: node.gender === 'female' ? 'rgba(236,72,153, 0.1)' : 'rgba(59,130,246, 0.1)'
      }}
    >
      <div 
        onMouseDown={handleDragStart}
        style={{
          position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--node-border)', borderRadius: '10px', padding: '2px 8px',
          cursor: 'grab', display: 'flex', alignItems: 'center'
        }}
      >
        <GripHorizontal size={14} color="var(--text-secondary)" />
      </div>

      <div style={{
        width: '56px', height: '56px', borderRadius: '50%', background: 'var(--node-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
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
          {formatYear(node.birthDate)} - {formatYear(node.deathDate)}
        </p>
      </div>
    </div>
  );
};

export default PersonNode;
