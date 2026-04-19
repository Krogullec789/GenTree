import React, { useState } from 'react';
import { X, UserPlus, Info, Trash2, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTreeInfo } from '../store/TreeContext';
import ConfirmModal from './ConfirmModal';

/* ─────────────────────────────────────────────────────────────────────────────
   RelationChip — a single existing relation with a remove button
   Declared at module level to avoid re-creation on every parent render.
───────────────────────────────────────────────────────────────────────────── */
const RelationChip = ({ label, onDelete }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
    borderRadius: '8px', padding: '6px 10px', fontSize: '13px',
    color: 'var(--text-secondary)',
  }}>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
      {label}
    </span>
    <button
      aria-label={`Usuń powiązanie: ${label}`}
      onClick={onDelete}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#ef4444', marginLeft: '8px', padding: '2px', lineHeight: 1, flexShrink: 0,
      }}
    >
      <X size={14} />
    </button>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   RelationGroup — collapsible section for one relation type (parent/child/partner).
   Receives all data and callbacks as props — no closure over ProfilePanel state.
───────────────────────────────────────────────────────────────────────────── */
const LINK_LABELS = {
  parent:  'Wybierz istniejącego rodzica:',
  child:   'Wybierz istniejące dziecko:',
  partner: 'Wybierz istniejącego partnera:',
};

const personLabel = (p) =>
  `${p.firstName || ''} ${p.lastName || ''}`.trim() || '(brak imienia)';

const RelationGroup = ({
  title,
  items,
  relType,
  isLinkOpen,
  onAddNew,
  onToggleLink,
  onLinkNode,
  onRemoveRelation,
  linkSearch,
  onSearchChange,
  availableNodes,
}) => (
  <div style={{ marginBottom: '16px' }}>
    <div style={{
      fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--text-muted, #6b7280)', marginBottom: '6px',
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
        marginTop: '8px', background: 'rgba(0,0,0,0.3)',
        border: '1px solid var(--glass-border)', borderRadius: '10px',
        padding: '10px', animation: 'fadeIn 0.15s ease',
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
            availableNodes.map(p => (
              <button
                key={p.id}
                className="btn secondary"
                style={{ justifyContent: 'flex-start', fontSize: '12px', padding: '6px 10px' }}
                onClick={() => onLinkNode(p.id)}
              >
                {personLabel(p)}
                {p.birthDate ? ` (ur. ${p.birthDate.slice(0, 4)})` : ''}
              </button>
            ))
          )}
        </div>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   ProfilePanel — main side panel.
   Reads node data directly from context instead of duplicating it in local state.
───────────────────────────────────────────────────────────────────────────── */
const ProfilePanel = ({ isOpen }) => {
  const {
    nodes, edges,
    selectedNodeId, setIsPanelOpen,
    updateNode, addNode, addEdge, removeNode, removeEdge,
  } = useTreeInfo();

  // Pure UI state — not derived from node data
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkMode, setLinkMode]   = useState(null); // 'parent'|'child'|'partner'|null
  const [linkSearch, setLinkSearch] = useState('');

  const [prevNodeId, setPrevNodeId] = useState(selectedNodeId);
  if (selectedNodeId !== prevNodeId) {
    setPrevNodeId(selectedNodeId);
    setLinkMode(null);
    setLinkSearch('');
  }

  // Read node data directly from context (single source of truth)
  const node = selectedNodeId ? nodes[selectedNodeId] : null;

  if (!isOpen || !node) {
    return (
      <div className="glass-panel" style={{
        width: '380px', height: '100%', position: 'absolute', right: '-400px', top: 0,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 100,
      }} />
    );
  }

  /* ── Form handler — writes directly to context, no local state copy ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    updateNode(node.id, { [name]: value });
  };

  /* ── Relation helpers ── */
  const getRelations = () => {
    const parents  = [];
    const children = [];
    const partners = [];

    Object.values(edges).forEach(edge => {
      if (edge.type === 'parent-child') {
        if (edge.targetId === node.id && nodes[edge.sourceId])
          parents.push({ edge, person: nodes[edge.sourceId] });
        else if (edge.sourceId === node.id && nodes[edge.targetId])
          children.push({ edge, person: nodes[edge.targetId] });
      } else if (edge.type === 'partner') {
        if (edge.sourceId === node.id && nodes[edge.targetId])
          partners.push({ edge, person: nodes[edge.targetId] });
        else if (edge.targetId === node.id && nodes[edge.sourceId])
          partners.push({ edge, person: nodes[edge.sourceId] });
      }
    });

    return { parents, children, partners };
  };

  const getConnectedIds = () => {
    const ids = new Set([node.id]);
    Object.values(edges).forEach(edge => {
      if (edge.sourceId === node.id) ids.add(edge.targetId);
      if (edge.targetId === node.id) ids.add(edge.sourceId);
    });
    return ids;
  };

  const handleAddNew = (relationType) => {
    const isParent  = relationType === 'parent';
    const isPartner = relationType === 'partner';
    const offsetX = isPartner ? 280 : 0;
    const offsetY = isParent ? -150 : (relationType === 'child' ? 150 : 0);

    const newNodeId = addNode({
      firstName: 'Nowa', lastName: 'Osoba',
      maidenName: '', birthDate: '', deathDate: '', bio: '',
      gender: isPartner ? (node.gender === 'male' ? 'female' : 'male') : 'male',
      x: node.x + offsetX,
      y: node.y + offsetY,
    });

    if (isParent)      addEdge(newNodeId, node.id, 'parent-child');
    else if (isPartner) addEdge(node.id, newNodeId, 'partner');
    else                addEdge(node.id, newNodeId, 'parent-child');
  };

  const handleLinkNode = (personId) => {
    if (!linkMode) return;
    if (linkMode === 'parent')  addEdge(personId, node.id, 'parent-child');
    if (linkMode === 'child')   addEdge(node.id, personId, 'parent-child');
    if (linkMode === 'partner') addEdge(node.id, personId, 'partner');
    setLinkMode(null);
    setLinkSearch('');
  };

  const { parents, children, partners } = getRelations();
  const excluded = getConnectedIds();

  const availableForLink = Object.values(nodes).filter(n => {
    if (excluded.has(n.id)) return false;
    if (!linkSearch.trim()) return true;
    return personLabel(n).toLowerCase().includes(linkSearch.toLowerCase());
  });

  // Factory — builds props for each RelationGroup to avoid repetition
  const groupProps = (relType) => ({
    relType,
    isLinkOpen:     linkMode === relType,
    onAddNew:       () => handleAddNew(relType),
    onToggleLink:   () => setLinkMode(prev => prev === relType ? null : relType),
    onLinkNode:     handleLinkNode,
    onRemoveRelation: removeEdge,
    linkSearch,
    onSearchChange: setLinkSearch,
    availableNodes: availableForLink,
  });

  /* ── JSX ── */
  return (
    <>
      <div className="glass-panel" style={{
        width: '380px', height: '100%', position: 'absolute', right: 0, top: 0,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 100,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} color="var(--accent-color)" /> Profil Osoby
          </h2>
          <button aria-label="Zamknij panel" className="btn icon-only secondary" onClick={() => setIsPanelOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>

          {/* Basic info */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="firstName">Imię</label>
              <input id="firstName" type="text" name="firstName" value={node.firstName || ''} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="lastName">Nazwisko</label>
              <input id="lastName" type="text" name="lastName" value={node.lastName || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="maidenName">Nazwisko rodowe</label>
            <input id="maidenName" type="text" name="maidenName" value={node.maidenName || ''} onChange={handleChange} placeholder="Opcjonalne" />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="birthDate">Data ur.</label>
              <input id="birthDate" type="date" name="birthDate" value={node.birthDate || ''} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="deathDate">Data śm.</label>
              <input id="deathDate" type="date" name="deathDate" value={node.deathDate || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gender">Płeć</label>
            <select id="gender" name="gender" value={node.gender || 'male'} onChange={handleChange}>
              <option value="male">Mężczyzna</option>
              <option value="female">Kobieta</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="bio">Biografia</label>
            <textarea id="bio" name="bio" rows="3" value={node.bio || ''} onChange={handleChange} placeholder="Krótki życiorys..." />
          </div>

          <div className="form-group">
            <label htmlFor="avatar">URL Avatara</label>
            <input id="avatar" type="text" name="avatar" value={node.avatar || ''} onChange={handleChange} placeholder="https://..." />
          </div>

          {/* Relations */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
            <div style={{
              fontSize: '14px', fontWeight: 600, marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Link2 size={16} color="var(--accent-color)" /> Powiązania
            </div>

            <RelationGroup title="Rodzice"   items={parents}  {...groupProps('parent')}  />
            <RelationGroup title="Partnerzy" items={partners} {...groupProps('partner')} />
            <RelationGroup title="Dzieci"    items={children} {...groupProps('child')}   />
          </div>

          {/* Delete */}
          <div style={{ marginTop: '32px' }}>
            <button
              className="btn"
              aria-label={`Usuń osobę ${node.firstName} ${node.lastName}`}
              style={{
                width: '100%', justifyContent: 'center',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={16} /> Usuń Osobę
            </button>
          </div>

        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Usuń osobę"
        message={`Czy na pewno chcesz usunąć ${node.firstName} ${node.lastName}? Tej operacji nie można cofnąć.`}
        confirmLabel="Usuń"
        danger
        onConfirm={() => { setShowDeleteModal(false); removeNode(node.id); }}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
};

export default ProfilePanel;
