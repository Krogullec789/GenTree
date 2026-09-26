import React, { useRef, useState } from 'react';
import { GripHorizontal, User } from 'lucide-react';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants/layout';
import { useCanvasScale, useDragActions } from '../store/DragContext';
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
  } = useTreeInfo();
  const { canvasScale } = useCanvasScale();
  const { setDragPosition, clearDragPosition } = useDragActions();
  const dragRef = useRef<{ pointerId: number; x: number; y: number; initial: NodePosition } | null>(null);
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

  const handleDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || dragRef.current) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const initial = { x: node.x, y: node.y };
    localPosRef.current = initial;
    setLocalPos(initial);
    dragRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, initial };
    setIsDraggingNode(true);
  };

  const handleDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    const position = { x: drag.initial.x + (e.clientX - drag.x) / canvasScale, y: drag.initial.y + (e.clientY - drag.y) / canvasScale };
    localPosRef.current = position;
    setLocalPos(position);
    setDragPosition(node.id, position);
  };

  const finishDrag = (e: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    dragRef.current = null;
    if (!cancelled && (localPosRef.current.x !== drag.initial.x || localPosRef.current.y !== drag.initial.y)) {
      updateNode(node.id, localPosRef.current);
    }
    clearDragPosition(node.id);
    setIsDraggingNode(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleKeyboardMove = (e: React.KeyboardEvent<HTMLButtonElement>) => {
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
      style={{
        position: 'absolute',
        left: displayX,
        top: displayY,
        width: `${NODE_WIDTH}px`,
        height: `${NODE_HEIGHT}px`,
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
      <button
        type="button"
        className="drag-handle"
        onPointerMove={handleDragMove}
        onPointerUp={e => finishDrag(e)}
        onPointerCancel={e => finishDrag(e, true)}
        onLostPointerCapture={e => finishDrag(e, true)}
        onPointerDown={handleDragStart}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyboardMove}
        aria-label="Przesuń osobę"
        tabIndex={0}
        style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--node-border)',
          borderRadius: '8px',
          padding: '6px 12px',
          touchAction: 'none',
          border: 'none',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <GripHorizontal size={14} color="var(--text-secondary)" />
      </button>

      <button type="button" className="person-profile" onClick={openProfile}
        aria-label={`Otwórz profil: ${node.firstName || ''} ${node.lastName || ''}`.trim()}>
      <span style={{
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
      </span>

      <span style={{ flex: 1, overflow: 'hidden' }}>
        <span style={{ margin: 0, fontSize: '15px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {node.firstName} {node.lastName} {node.maidenName ? `(z d. ${node.maidenName})` : ''}
        </span>
        <span style={{ display: 'block', margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {node.birthDate ? formatYear(node.birthDate) : '?'}{node.deathDate ? ` - ${formatYear(node.deathDate)}` : ''}
        </span>
      </span>
      </button>
    </div>
  );
};

export default React.memo(PersonNode);
