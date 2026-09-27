import { useEffect, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent } from 'react';
import type { PersonNode } from '../../types/tree';
import { isValidDate } from '../../utils/treeData';

type FieldName = 'firstName' | 'lastName' | 'maidenName' | 'birthDate' | 'deathDate' | 'gender' | 'bio' | 'avatar';
type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface PersonFormProps {
  node: PersonNode;
  onChange: (updates: Partial<PersonNode>) => void;
}

const fieldError = (node: PersonNode, name: FieldName, value: string): string | null => {
  if (name === 'firstName' && !value.trim()) return 'Podaj imię. Pusta wartość nie zostanie zapisana.';
  if (name === 'birthDate' || name === 'deathDate') {
    if (!isValidDate(value)) return 'Podaj poprawną datę.';
    const birth = name === 'birthDate' ? value : node.birthDate;
    const death = name === 'deathDate' ? value : node.deathDate;
    if (birth && death && death < birth) return 'Data śmierci nie może być wcześniejsza niż data urodzenia.';
  }
  return null;
};

// The key supplied by PersonForm resets a draft when undo/redo changes its saved value.
const DraftField = ({ node, name, label, onChange, type = 'text', placeholder }: PersonFormProps & {
  name: FieldName;
  label: string;
  type?: 'text' | 'date';
  placeholder?: string;
}) => {
  const savedValue = node[name] || '';
  const [value, setValue] = useState(savedValue);
  const [nativeInvalid, setNativeInvalid] = useState(false);
  const error = nativeInvalid ? 'Podaj pełną, poprawną datę.' : fieldError(node, name, value);
  const dirty = value !== savedValue || nativeInvalid;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const change = (event: ChangeEvent<FieldElement>) => {
    setValue(event.target.value);
    setNativeInvalid(event.target.validity.badInput);
  };
  const blur = (event: FocusEvent<FieldElement>) => {
    const invalid = event.currentTarget.validity.badInput;
    setNativeInvalid(invalid);
    if (dirty && !invalid && !error) {
      const next = ['firstName', 'lastName', 'maidenName'].includes(name) ? value.trim() : value;
      setValue(next);
      if (next !== savedValue) onChange({ [name]: next });
    }
  };
  const keyDown = (event: KeyboardEvent<FieldElement>) => {
    if (event.key === 'Escape') {
      setValue(savedValue);
      setNativeInvalid(false);
      event.preventDefault();
    } else if (event.key === 'Enter' && name !== 'bio') {
      event.currentTarget.blur();
      event.preventDefault();
    }
  };
  const props = {
    id: name, name, value, onChange: change, onBlur: blur, onKeyDown: keyDown,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${name}-error` : dirty ? `${name}-draft` : undefined,
  };

  return (
    <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
      <label htmlFor={name}>{label}</label>
      {name === 'gender' ? (
        <select {...props}>
          <option value="male">Mężczyzna</option>
          <option value="female">Kobieta</option>
        </select>
      ) : name === 'bio' ? (
        <textarea {...props} rows={3} placeholder={placeholder} />
      ) : (
        <input {...props} type={type} placeholder={placeholder} required={name === 'firstName'} />
      )}
      {error ? <p id={`${name}-error`} className="field-error" role="alert">{error} Zachowano ostatni poprawny zapis.</p>
        : dirty ? <p id={`${name}-draft`} className="field-hint">Opuść pole, aby zapisać zmianę.</p> : null}
    </div>
  );
};

const PersonForm = ({ node, onChange }: PersonFormProps) => {
  const field = (name: FieldName, label: string, type: 'text' | 'date' = 'text', placeholder?: string) => (
    <DraftField key={JSON.stringify([node.id, name, node[name]])} node={node} onChange={onChange}
      name={name} label={label} type={type} placeholder={placeholder} />
  );
  return (
    <>
      <p className="field-hint">Zmiany zapisują się po opuszczeniu pola. Escape przywraca zapisaną wartość.</p>
      <div style={{ display: 'flex', gap: '12px' }}>
        {field('firstName', 'Imię')}
        {field('lastName', 'Nazwisko')}
      </div>
      {field('maidenName', 'Nazwisko rodowe', 'text', 'Opcjonalne')}
      <div style={{ display: 'flex', gap: '12px' }}>
        {field('birthDate', 'Data ur.', 'date')}
        {field('deathDate', 'Data śm.', 'date')}
      </div>
      {field('gender', 'Płeć')}
      {field('bio', 'Biografia', 'text', 'Krótki życiorys...')}
      {field('avatar', 'URL avatara', 'text', 'https://...')}
    </>
  );
};

export default PersonForm;
