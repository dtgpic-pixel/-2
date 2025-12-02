import React from 'react';
import { Scene } from './components/Scene';
import { UI } from './components/UI';
import { StoreProvider } from './store';

const App: React.FC = () => {
  return (
    <StoreProvider>
      <div className="relative w-full h-screen bg-luxury-dark overflow-hidden select-none">
        <Scene />
        <UI />
      </div>
    </StoreProvider>
  );
};

export default App;