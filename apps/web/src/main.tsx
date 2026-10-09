import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, loadThemePref, resolveTheme } from './theme';
import './styles.css';

applyTheme(resolveTheme(loadThemePref()));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
