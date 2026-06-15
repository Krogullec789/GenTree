import React, { useEffect, useRef, useState } from 'react';
import { Download, GitBranch, Redo2, Search, Undo2, Upload, X } from 'lucide-react';
import { useTreeInfo } from '../store/TreeContext';
import { normalizeTreeData } from '../utils/treeData';
import ConfirmModal from './ConfirmModal';
import type { PersonNode, TreeData } from '../types/tree';

const Header = () => {
  const {
    nodes,
    edges,
    saveStatus,
    lastError,
    canUndo,
    canRedo,
    undo,
    redo,
    applyAutoLayout,
    replaceTree,
    setSelectedNodeId,
    setIsPanelOpen,
    setFocusNodeId,
  } = useTreeInfo();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [pendingImport, setPendingImport] = useState<TreeData | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const personLabel = (node: PersonNode) => {
    const name = `${node.firstName || ''} ${node.lastName || ''}`.trim() || '(brak imienia)';
    const year = node.birthDate ? node.birthDate.slice(0, 4) : null;
    return { name, year };
  };

  const results = query.trim().length === 0 ? [] : Object.values(nodes).filter(node => {
    const q = query.toLowerCase();
    const full = `${node.firstName || ''} ${node.lastName || ''} ${node.maidenName || ''}`.toLowerCase();
    return full.includes(q);
  }).slice(0, 8);

  const handleSelect = (node: PersonNode) => {
    setQuery('');
    setIsOpen(false);
    setActiveResultIndex(0);
    setSelectedNodeId(node.id);
    setIsPanelOpen(true);
    setFocusNodeId(node.id);
  };

  const downloadTree = (data: TreeData, fileName: string) => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  };

  const handleExport = () => {
    downloadTree({ nodes, edges }, 'gentree-export.json');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');

    const reader = new FileReader();
    reader.onload = event => {
      try {
        if (typeof event.target?.result !== 'string') throw new Error('Invalid file content');
        const normalizedData = normalizeTreeData(JSON.parse(event.target.result));
        if (!normalizedData) throw new Error('Invalid tree data');
        setPendingImport(normalizedData);
      } catch (error) {
        console.error('Błąd importu:', error);
        setImportError('Nieprawidłowy plik z danymi drzewa.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadTree({ nodes, edges }, `gentree-backup-before-import-${stamp}.json`);
    replaceTree(pendingImport);
    setPendingImport(null);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveResultIndex(index => Math.min(index + 1, results.length - 1));
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveResultIndex(index => Math.max(index - 1, 0));
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[activeResultIndex]);
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && e.target instanceof Node && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      <header className="glass app-header">
        <div className="app-brand">
          <img src="/logNew2.webp" alt="GenTree Logo" className="app-logo" />
          <div>
            <h1>GenTree</h1>
            <span>Premium Family Tree</span>
          </div>
        </div>

        <div ref={searchRef} className="app-search">
          <div className={`app-search-box ${isOpen ? 'is-open' : ''}`}>
            <Search size={15} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
            <input
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls="person-search-results"
              aria-activedescendant={isOpen && results[activeResultIndex] ? `person-search-${results[activeResultIndex].id}` : undefined}
              placeholder="Szukaj osoby..."
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setIsOpen(true);
                setActiveResultIndex(0);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleSearchKeyDown}
            />
            {query && (
              <button
                aria-label="Wyczyść wyszukiwanie"
                onClick={() => { setQuery(''); setIsOpen(false); }}
                className="icon-button"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {isOpen && results.length > 0 && (
            <div id="person-search-results" role="listbox" className="search-dropdown">
              {results.map((node, index) => {
                const { name, year } = personLabel(node);
                return (
                  <button
                    key={node.id}
                    id={`person-search-${node.id}`}
                    role="option"
                    aria-selected={activeResultIndex === index}
                    className={activeResultIndex === index ? 'is-active' : ''}
                    onClick={() => handleSelect(node)}
                  >
                    <div className={`search-avatar ${node.gender === 'female' ? 'female' : 'male'}`}>
                      {node.gender === 'female' ? '♀' : '♂'}
                    </div>
                    <div>
                      <div className="search-name">{name}</div>
                      {year && <div className="search-year">ur. {year}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {isOpen && query.trim().length > 0 && results.length === 0 && (
            <div className="search-empty">Nie znaleziono osoby</div>
          )}
        </div>

        <div className="app-actions">
          {(importError || lastError) && (
            <span role="status" className="sync-status error">{importError || lastError}</span>
          )}
          {!importError && !lastError && saveStatus !== 'idle' && (
            <span role="status" className="sync-status">
              {saveStatus === 'saving' ? 'Zapisywanie...' : saveStatus === 'saved' ? 'Zapisano' : saveStatus === 'conflict' ? 'Konflikt zapisu' : ''}
            </span>
          )}
          <div className="history-actions" aria-label="Historia i układ drzewa">
            <button className="btn secondary icon-only" onClick={undo} disabled={!canUndo} aria-label="Cofnij zmianę" title="Cofnij zmianę">
              <Undo2 size={18} />
            </button>
            <button className="btn secondary icon-only" onClick={redo} disabled={!canRedo} aria-label="Ponów zmianę" title="Ponów zmianę">
              <Redo2 size={18} />
            </button>
            <button className="btn secondary" onClick={applyAutoLayout} aria-label="Ułóż drzewo automatycznie">
              <GitBranch size={18} />
              <span>Ułóż drzewo</span>
            </button>
          </div>
          <label className="btn secondary import-button">
            <Upload size={18} />
            <span>Importuj JSON</span>
            <input aria-label="Importuj JSON" type="file" accept=".json" onChange={handleImport} />
          </label>
          <button className="btn" onClick={handleExport}>
            <Download size={18} />
            <span>Eksportuj</span>
          </button>
        </div>
      </header>

      <ConfirmModal
        isOpen={pendingImport !== null}
        title="Zastąpić obecne drzewo?"
        message="Import podmieni całe obecne drzewo. Przed zmianą zostanie pobrana kopia bezpieczeństwa aktualnych danych."
        confirmLabel="Importuj"
        danger
        onConfirm={confirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </>
  );
};

export default Header;
