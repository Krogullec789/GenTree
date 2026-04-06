import React from 'react';
import Header from './components/Header';
import Canvas from './components/Canvas';
import ProfilePanel from './components/ProfilePanel';
import { useTreeInfo } from './store/TreeContext';

function App() {
  const { isPanelOpen } = useTreeInfo();

  return (
    <div className="app-container">
      <Header />
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Canvas />
        <ProfilePanel isOpen={isPanelOpen} />
      </div>
    </div>
  );
}

export default App;
