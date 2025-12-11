
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard, Login, Intake, Editor, Admin } from './pages';

export const AppRoutes = () => (
  <div className="app-layout">
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/intake" element={<Intake />} />
      <Route path="/draft/:id" element={<Editor />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
