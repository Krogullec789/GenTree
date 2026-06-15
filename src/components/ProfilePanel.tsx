import { Info, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useTreeInfo } from '../store/TreeContext';
import ConfirmModal from './ConfirmModal';
import PersonForm from './profile/PersonForm';
import RelationManager, { type RelationKind } from './profile/RelationManager';

interface ProfilePanelProps {
  isOpen: boolean;
}

interface LinkState {
  nodeId: string | null;
  mode: RelationKind | null;
  search: string;
}

const ProfilePanel = ({ isOpen }: ProfilePanelProps) => {
  const {
    nodes,
    edges,
    selectedNodeId,
    setIsPanelOpen,
    updateNode,
    addNode,
    addEdge,
    removeNode,
    removeEdge,
  } = useTreeInfo();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkState, setLinkState] = useState<LinkState>({
    nodeId: selectedNodeId,
    mode: null,
    search: '',
  });

  const node = selectedNodeId ? nodes[selectedNodeId] : null;
  const isCurrentLinkState = linkState.nodeId === selectedNodeId;
  const linkMode = isCurrentLinkState ? linkState.mode : null;
  const linkSearch = isCurrentLinkState ? linkState.search : '';

  if (!isOpen || !node) {
    return (
      <div className="glass-panel profile-panel" style={{
        width: 'min(380px, 100vw)',
        height: '100%',
        position: 'absolute',
        right: '-400px',
        top: 0,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
      }} />
    );
  }

  const handleAddNew = (relationType: RelationKind) => {
    const isParent = relationType === 'parent';
    const isPartner = relationType === 'partner';
    const offsetX = isPartner ? 280 : 0;
    const offsetY = isParent ? -150 : (relationType === 'child' ? 150 : 0);

    const newNodeId = addNode({
      firstName: 'Nowa',
      lastName: 'Osoba',
      maidenName: '',
      birthDate: '',
      deathDate: '',
      bio: '',
      gender: isPartner ? (node.gender === 'male' ? 'female' : 'male') : 'male',
      x: node.x + offsetX,
      y: node.y + offsetY,
    });

    if (isParent) addEdge(newNodeId, node.id, 'parent-child');
    else if (isPartner) addEdge(node.id, newNodeId, 'partner');
    else addEdge(node.id, newNodeId, 'parent-child');
  };

  const handleLinkNode = (personId: string) => {
    if (!linkMode) return;
    if (linkMode === 'parent') addEdge(personId, node.id, 'parent-child');
    if (linkMode === 'child') addEdge(node.id, personId, 'parent-child');
    if (linkMode === 'partner') addEdge(node.id, personId, 'partner');
    setLinkState({ nodeId: selectedNodeId, mode: null, search: '' });
  };

  const handleToggleLink = (relationType: RelationKind) => {
    setLinkState(prev => ({
      nodeId: selectedNodeId,
      mode: prev.nodeId === selectedNodeId && prev.mode === relationType ? null : relationType,
      search: prev.nodeId === selectedNodeId ? prev.search : '',
    }));
  };

  return (
    <>
      <div className="glass-panel profile-panel" style={{
        width: 'min(380px, 100vw)',
        height: '100%',
        position: 'absolute',
        right: 0,
        top: 0,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} color="var(--accent-color)" /> Profil osoby
          </h2>
          <button aria-label="Zamknij panel" className="btn icon-only secondary" onClick={() => setIsPanelOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <PersonForm node={node} onChange={updates => updateNode(node.id, updates)} />

          <RelationManager
            node={node}
            nodes={nodes}
            edges={edges}
            linkMode={linkMode}
            linkSearch={linkSearch}
            onAddNew={handleAddNew}
            onToggleLink={handleToggleLink}
            onLinkNode={handleLinkNode}
            onRemoveRelation={removeEdge}
            onSearchChange={search => setLinkState(prev => ({
              nodeId: selectedNodeId,
              mode: prev.nodeId === selectedNodeId ? prev.mode : null,
              search,
            }))}
          />

          <div style={{ marginTop: '32px' }}>
            <button
              className="btn"
              aria-label={`Usuń osobę ${node.firstName} ${node.lastName}`}
              style={{
                width: '100%',
                justifyContent: 'center',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={16} /> Usuń osobę
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
