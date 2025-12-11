import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard, Login, Intake, Editor, Admin } from './pages';

/**
 * Main App Component
 * Routes to different pages - each page manages its own header.
 * Styled to match DraftWise theming pattern.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/intake" element={<Intake />} />
        <Route path="/draft/:id" element={<Editor />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
