import { createRoot } from 'react-dom/client';
import { App } from './App';
import './ui/tokens.css';
import './style.css';
import './ui/foundation.css';
import './ui/chat.css';
import './ui/product-experience.css';

createRoot(document.getElementById('root')!).render(<App />);
