import React, { useRef, useState } from 'react';
import { GripHorizontal, User } from 'lucide-react';
import { NODE_WIDTH } from '../constants/layout';
import { useTreeInfo } from '../store/TreeContext';
import type { NodePosition, PersonNode as PersonNodeType } from '../types/tree';

interface PersonNodeProps {
  node: PersonNodeType;
}

const PersonNode = ({ node }: PersonNodeProps) => {
  const {
    selectedNodeId,
    setSelectedNodeId,
    setIsPanelOpen,
    updateNode,
    canvasScale,
    setDragPosition,
    clearDragPosition,
  } = useTreeInfo();
  const isSelected = selectedNodeId === node.id;

  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [localPos, setLocalPos] = useState({ x: node.x, y: node.y });
  const localPosRef = useRef(localPos);

  const displayX = isDraggingNode ? localPos.x : node.x;
  const displayY = isDraggingNode ? localPos.y : node.y;

  const formatYear = (dateStr: string) => {
    if (!dateStr) return '?';
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? dateStr.substring(0, 4) : date.getFullYear();
  };

  const openProfile = () => {
    setSelectedNodeId(node.id);
    setIsPanelOpen(true);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!isDraggingNode) openProfile();
  };

  const handleNodeKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    openProfile();
  };

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingNode(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = node.x;
    const initialY = node.y;
    const scale = canvasScale;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      const newPos = { x: initialX + dx, y: initialY + dy };
      setLocalPos(newPos);
      localPosRef.current = newPos;
      setDragPosition(node.id, newPos);
    };

    const handlePointerUp = () => {
      updateNode(node.id, localPosRef.current);
      clearDragPosition(node.id);
      setTimeout(() => setIsDraggingNode(false), 50);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleKeyboardMove = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 50 : 10;
    const moves: Record<string, NodePosition> = {
      ArrowUp: { x: node.x, y: node.y - step },
      ArrowRight: { x: node.x + step, y: node.y },
      ArrowDown: { x: node.x, y: node.y + step },
      ArrowLeft: { x: node.x - step, y: node.y },
    };

    const nextPosition = moves[e.key];
    if (!nextPosition) return;

    e.preventDefault();
    e.stopPropagation();
    setLocalPos(nextPosition);
    localPosRef.current = nextPosition;
    updateNode(node.id, nextPosition);
  };

  return (
    <div
      className={`person-node glass ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onKeyDown={handleNodeKeyDown}
      role="button"
      aria-label={`Otwórz profil: ${node.firstName || ''} ${node.lastName || ''}`.trim()}
      tabIndex={0}
      style={{
        position: 'absolute',
        left: displayX,
        top: displayY,
        width: `${NODE_WIDTH}px`,
        minHeight: '90px',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
        boxShadow: isSelected ? '0 0 20px rgba(59,130,246,0.45)' : 'var(--glass-shadow)',
        transition: isDraggingNode ? 'none' : 'box-shadow 0.3s, border 0.3s',
        zIndex: isSelected ? 50 : 10,
        backgroundColor: node.gender === 'female' ? 'rgba(236,72,153, 0.1)' : 'rgba(59,130,246, 0.1)',
      }}
    >
      <div
        onPointerDown={handleDragStart}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyboardMove}
        role="button"
        aria-label="Przesuń osobę"
        tabIndex={0}
        style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--node-border)',
          borderRadius: '8px',
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
          {node.birthDate ? formatYear(node.birthDate) : '?'}{node.deathDate ? ` - ${formatYear(node.deathDate)}` : ''}
        </p>
      </div>
    </div>
  );
};

export default React.memo(PersonNode);
