import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, Search, X } from 'lucide-react';
import { useTreeInfo } from '../store/TreeContext';

const Header = () => {
  const { nodes, edges, setNodes, setEdges, setSelectedNodeId, setIsPanelOpen, setFocusNodeId } = useTreeInfo();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  const personLabel = (n) => {
    const name = `${n.firstName || ''} ${n.lastName || ''}`.trim() || '(brak imienia)';
    const year = n.birthDate ? n.birthDate.slice(0, 4) : null;
    return { name, year };
  };

  const results = query.trim().length === 0 ? [] : Object.values(nodes).filter(n => {
    const q = query.toLowerCase();
    const full = `${n.firstName || ''} ${n.lastName || ''} ${n.maidenName || ''}`.toLowerCase();
    return full.includes(q);
  }).slice(0, 8);

  const handleSelect = (node) => {
    setQuery('');
    setIsOpen(false);
    setSelectedNodeId(node.id);
    setIsPanelOpen(true);
    setFocusNodeId(node.id);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify({ nodes, edges }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'gentree-export.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { nodes: newNodes, edges: newEdges } = JSON.parse(event.target.result);
        if (newNodes && newEdges) {
          setNodes(newNodes);
          setEdges(newEdges);
        }
      } catch (error) {
        console.error('Błąd importu:', error);
        alert('Nieprawidłowy plik z danymi drzewa.');
      }
    };
    reader.readAsText(file);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="glass" style={{
      height: 'var(--header-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      zIndex: 200,
      borderBottom: '1px solid var(--glass-border)',
      gap: '16px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <img
          src="/logNew2.webp"
          alt="GenTree Logo"
          style={{ width: '60px', height: '60px', objectFit: 'contain' }}
        />
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
            GenTree
          </h1>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Premium Family Tree</span>
        </div>
      </div>

      {/* Search */}
      <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--glass-border)',
          borderRadius: '10px',
          padding: '0 12px',
          transition: 'border-color 0.2s',
          ...(isOpen ? { borderColor: 'var(--accent-color)' } : {}),
        }}>
          <Search size={15} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Szukaj osoby..."
            value={query}
            onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              padding: '10px 0',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setIsOpen(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-secondary)', lineHeight: 1 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && results.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--glass-bg, rgba(15,20,40,0.97))',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            zIndex: 300,
            animation: 'fadeIn 0.12s ease',
          }}>
            {results.map((node, i) => {
              const { name, year } = personLabel(node);
              return (
                <button
                  key={node.id}
                  onClick={() => handleSelect(node)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    borderBottom: i < results.length - 1 ? '1px solid var(--glass-border)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: node.gender === 'female'
                      ? 'rgba(236,72,153,0.2)' : 'rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', flexShrink: 0,
                  }}>
                    {node.gender === 'female' ? '♀' : '♂'}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{name}</div>
                    {year && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ur. {year}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* No results */}
        {isOpen && query.trim().length > 0 && results.length === 0 && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0, right: 0,
            background: 'var(--glass-bg, rgba(15,20,40,0.97))',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            zIndex: 300,
          }}>
            Nie znaleziono osoby
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
        <label className="btn secondary" style={{ cursor: 'pointer', margin: 0 }}>
          <Upload size={18} />
          <span>Importuj JSON</span>
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </label>
        <button className="btn" onClick={handleExport}>
          <Download size={18} />
          <span>Eksportuj</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
