import { createRoot } from 'react-dom/client';
import { App } from './App';
import './ui/tokens.css';
import './style.css';
import './ui/foundation.css';

createRoot(document.getElementById('root')!).render(<App />);
