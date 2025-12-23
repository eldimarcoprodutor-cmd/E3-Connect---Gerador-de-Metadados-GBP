
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("MetaMorph: Iniciando aplicação...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("MetaMorph: Erro crítico - Elemento #root não encontrado.");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("MetaMorph: Renderização concluída.");
} catch (error) {
  console.error("MetaMorph: Erro na renderização inicial:", error);
}
