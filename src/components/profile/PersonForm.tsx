import React from 'react';
import type { PersonNode } from '../../types/tree';

interface PersonFormProps {
  node: PersonNode;
  onChange: (updates: Partial<PersonNode>) => void;
}

const PersonForm = ({ node, onChange }: PersonFormProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="firstName">Imię</label>
          <input id="firstName" type="text" name="firstName" value={node.firstName || ''} onChange={handleChange} required />
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
        <textarea id="bio" name="bio" rows={3} value={node.bio || ''} onChange={handleChange} placeholder="Krótki życiorys..." />
      </div>

      <div className="form-group">
        <label htmlFor="avatar">URL avatara</label>
        <input id="avatar" type="text" name="avatar" value={node.avatar || ''} onChange={handleChange} placeholder="https://..." />
      </div>
    </>
  );
};

export default PersonForm;
