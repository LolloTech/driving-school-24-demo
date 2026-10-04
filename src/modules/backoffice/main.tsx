import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Backoffice from './Backoffice';
import './backoffice.css';
document.title = 'Via Libera · Backoffice';
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Backoffice />
    </BrowserRouter>
  </StrictMode>,
);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
