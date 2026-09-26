import { memo } from 'react';
import { useDragPositions } from '../store/DragContext';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants/layout';
import type { TreeData } from '../types/tree';

const RelationshipLines = ({ nodes, edges, visibleNodeIds }: TreeData & { visibleNodeIds: Set<string> }) => {
  const dragPositions = useDragPositions();
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
export default memo(RelationshipLines);
