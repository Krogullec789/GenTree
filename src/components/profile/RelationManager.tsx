import { ChevronDown, ChevronUp, Link2, UserPlus, X } from 'lucide-react';
import type { PersonNode, TreeEdge } from '../../types/tree';

export type RelationKind = 'parent' | 'child' | 'partner';

interface RelationItem {
  edge: TreeEdge;
  person: PersonNode;
}

interface RelationManagerProps {
  node: PersonNode;
  nodes: Record<string, PersonNode>;
  edges: Record<string, TreeEdge>;
  linkMode: RelationKind | null;
  linkSearch: string;
  onAddNew: (relationType: RelationKind) => void;
  onToggleLink: (relationType: RelationKind) => void;
  onLinkNode: (personId: string) => void;
  onRemoveRelation: (edgeId: string) => void;
  onSearchChange: (search: string) => void;
}

const LINK_LABELS: Record<RelationKind, string> = {
  parent: 'Wybierz istniejącego rodzica:',
  child: 'Wybierz istniejące dziecko:',
  partner: 'Wybierz istniejącego partnera:',
};

const personLabel = (person: PersonNode) =>
  `${person.firstName || ''} ${person.lastName || ''}`.trim() || '(brak imienia)';

const collectRelations = (
  node: PersonNode,
  nodes: Record<string, PersonNode>,
  edges: Record<string, TreeEdge>,
) => {
  const parents: RelationItem[] = [];
  const children: RelationItem[] = [];
  const partners: RelationItem[] = [];

  Object.values(edges).forEach(edge => {
    if (edge.type === 'parent-child') {
      if (edge.targetId === node.id && nodes[edge.sourceId]) {
        parents.push({ edge, person: nodes[edge.sourceId] });
      } else if (edge.sourceId === node.id && nodes[edge.targetId]) {
        children.push({ edge, person: nodes[edge.targetId] });
      }
    } else if (edge.type === 'partner') {
      if (edge.sourceId === node.id && nodes[edge.targetId]) {
        partners.push({ edge, person: nodes[edge.targetId] });
      } else if (edge.targetId === node.id && nodes[edge.sourceId]) {
        partners.push({ edge, person: nodes[edge.sourceId] });
      }
    }
  });

  return { parents, children, partners };
};

const connectedIdsFor = (
  node: PersonNode,
  edges: Record<string, TreeEdge>,
) => {
  const ids = new Set([node.id]);
  Object.values(edges).forEach(edge => {
    if (edge.sourceId === node.id) ids.add(edge.targetId);
    if (edge.targetId === node.id) ids.add(edge.sourceId);
  });
  return ids;
};

const RelationChip = ({ label, onDelete }: { label: string; onDelete: () => void }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  }}>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
      {label}
    </span>
    <button
      aria-label={`Usuń powiązanie: ${label}`}
      onClick={onDelete}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#ef4444',
        marginLeft: '8px',
        padding: '2px',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      <X size={14} />
    </button>
  </div>
);

interface RelationGroupProps {
  title: string;
  items: RelationItem[];
  relType: RelationKind;
  isLinkOpen: boolean;
  linkSearch: string;
  availableNodes: PersonNode[];
  onAddNew: () => void;
  onToggleLink: () => void;
  onLinkNode: (personId: string) => void;
  onRemoveRelation: (edgeId: string) => void;
  onSearchChange: (search: string) => void;
}

const RelationGroup = ({
  title,
  items,
  relType,
  isLinkOpen,
  linkSearch,
  availableNodes,
  onAddNew,
  onToggleLink,
  onLinkNode,
  onRemoveRelation,
  onSearchChange,
}: RelationGroupProps) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--text-muted, #6b7280)',
      marginBottom: '6px',
    }}>
      {title}
    </div>

    {items.length === 0 && (
      <div style={{ fontSize: '12px', color: 'var(--text-muted, #6b7280)', fontStyle: 'italic', marginBottom: '6px' }}>
        brak
      </div>
    )}

    {items.map(({ edge, person }) => (
      <div key={edge.id} style={{ marginBottom: '4px' }}>
        <RelationChip label={personLabel(person)} onDelete={() => onRemoveRelation(edge.id)} />
      </div>
    ))}

    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
      <button
        className="btn secondary"
        aria-label={`Dodaj nową osobę jako ${relType}`}
        style={{ flex: 1, fontSize: '12px', padding: '6px 8px', justifyContent: 'center' }}
        onClick={onAddNew}
      >
        <UserPlus size={13} /> Nowa osoba
      </button>
      <button
        className="btn secondary"
        aria-label={isLinkOpen ? 'Anuluj powiązanie' : `Powiąż istniejącą osobę (${relType})`}
        style={{ flex: 1, fontSize: '12px', padding: '6px 8px', justifyContent: 'center' }}
        onClick={onToggleLink}
      >
        <Link2 size={13} />
        {isLinkOpen ? 'Anuluj' : 'Istniejąca'}
        {isLinkOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
    </div>

    {isLinkOpen && (
      <div style={{
        marginTop: '8px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        padding: '10px',
        animation: 'fadeIn 0.15s ease',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          {LINK_LABELS[relType]}
        </div>
        <input
          type="text"
          placeholder="Szukaj osoby..."
          value={linkSearch}
          onChange={e => onSearchChange(e.target.value)}
          style={{ width: '100%', marginBottom: '8px', fontSize: '13px' }}
        />
        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {availableNodes.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #6b7280)', fontStyle: 'italic' }}>
              Brak pasujących osób
            </div>
          ) : (
            availableNodes.map(person => (
              <button
                key={person.id}
                className="btn secondary"
                style={{ justifyContent: 'flex-start', fontSize: '12px', padding: '6px 10px' }}
                onClick={() => onLinkNode(person.id)}
              >
                {personLabel(person)}
                {person.birthDate ? ` (ur. ${person.birthDate.slice(0, 4)})` : ''}
              </button>
            ))
          )}
        </div>
      </div>
    )}
  </div>
);

const RelationManager = ({
  node,
  nodes,
  edges,
  linkMode,
  linkSearch,
  onAddNew,
  onToggleLink,
  onLinkNode,
  onRemoveRelation,
  onSearchChange,
}: RelationManagerProps) => {
  const { parents, children, partners } = collectRelations(node, nodes, edges);
  const excluded = connectedIdsFor(node, edges);
  const availableNodes = Object.values(nodes).filter(person => {
    if (excluded.has(person.id)) return false;
    if (!linkSearch.trim()) return true;
    return personLabel(person).toLowerCase().includes(linkSearch.toLowerCase());
  });

  const groupProps = (relType: RelationKind) => ({
    relType,
    isLinkOpen: linkMode === relType,
    linkSearch,
    availableNodes,
    onAddNew: () => onAddNew(relType),
    onToggleLink: () => onToggleLink(relType),
    onLinkNode,
    onRemoveRelation,
    onSearchChange,
  });

  return (
    <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Link2 size={16} color="var(--accent-color)" /> Powiązania
      </div>

      <RelationGroup title="Rodzice" items={parents} {...groupProps('parent')} />
      <RelationGroup title="Partnerzy" items={partners} {...groupProps('partner')} />
      <RelationGroup title="Dzieci" items={children} {...groupProps('child')} />
    </div>
  );
};

export default RelationManager;
