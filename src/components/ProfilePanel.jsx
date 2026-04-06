import React, { useState, useEffect } from 'react';
import { X, UserPlus, Info, Trash2 } from 'lucide-react';
import { useTreeInfo } from '../store/TreeContext';
import ConfirmModal from './ConfirmModal';

const ProfilePanel = ({ isOpen }) => {
  const { nodes, selectedNodeId, setIsPanelOpen, updateNode, addNode, addEdge, removeNode } = useTreeInfo();
  const [formData, setFormData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      setFormData(node);
    } else {
      setFormData(null);
    }
  }, [selectedNodeId, nodes]);

  if (!isOpen || !formData) {
    return (
      <div className="glass-panel" style={{
        width: '380px', height: '100%', position: 'absolute', right: '-400px', top: 0,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 100,
      }} />
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    updateNode(formData.id, { [name]: value });
  };

  const handleAddRelative = (relationType) => {
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
      gender: isPartner ? (formData.gender === 'male' ? 'female' : 'male') : 'male',
      x: formData.x + offsetX,
      y: formData.y + offsetY,
    });

    if (isParent) {
      addEdge(newNodeId, formData.id, 'parent-child');
    } else if (isPartner) {
      addEdge(formData.id, newNodeId, 'partner');
    } else {
      addEdge(formData.id, newNodeId, 'parent-child');
    }
  };

  const handleDeleteConfirmed = () => {
    setShowDeleteModal(false);
    removeNode(formData.id);
  };

  return (
    <>
      <div className="glass-panel" style={{
        width: '380px', height: '100%', position: 'absolute', right: 0, top: 0,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 100,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--glass-border)',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} color="var(--accent-color)" /> Profil Osoby
          </h2>
          <button className="btn icon-only secondary" onClick={() => setIsPanelOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Imię</label>
              <input type="text" name="firstName" value={formData.firstName || ''} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Nazwisko</label>
              <input type="text" name="lastName" value={formData.lastName || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label>Nazwisko rodowe</label>
            <input type="text" name="maidenName" value={formData.maidenName || ''} onChange={handleChange} placeholder="Opcjonalne" />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Data ur.</label>
              <input type="date" name="birthDate" value={formData.birthDate || ''} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Data śm.</label>
              <input type="date" name="deathDate" value={formData.deathDate || ''} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label>Płeć</label>
            <select name="gender" value={formData.gender || 'male'} onChange={handleChange}>
              <option value="male">Mężczyzna</option>
              <option value="female">Kobieta</option>
            </select>
          </div>

          <div className="form-group">
            <label>Biografia</label>
            <textarea name="bio" rows="4" value={formData.bio || ''} onChange={handleChange} placeholder="Krótki życiorys..." />
          </div>

          <div className="form-group">
            <label>URL Avatara</label>
            <input type="text" name="avatar" value={formData.avatar || ''} onChange={handleChange} placeholder="https://..." />
          </div>

          <div style={{ marginTop: '32px' }}>
            <label style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '16px' }}>
              Powiązania
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleAddRelative('parent')}>
                <UserPlus size={16} /> Dodaj Rodzica
              </button>
              <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleAddRelative('partner')}>
                <UserPlus size={16} /> Dodaj Partnera
              </button>
              <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleAddRelative('child')}>
                <UserPlus size={16} /> Dodaj Dziecko
              </button>
            </div>
          </div>

          <div style={{ marginTop: '48px' }}>
            <button
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'center',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.5)',
              }}
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={16} /> Usuń Osobę
            </button>
          </div>
        </div>
      </div>

      {/* Custom modal — replaces window.confirm() */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Usuń osobę"
        message={`Czy na pewno chcesz usunąć ${formData.firstName} ${formData.lastName}? Tej operacji nie można cofnąć.`}
        confirmLabel="Usuń"
        danger
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
};

export default ProfilePanel;
