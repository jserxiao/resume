import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import EditorPage from '@/pages/EditorPage';
import DecorationEditorPage from '@/pages/DecorationEditorPage';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/decoration-editor" element={<DecorationEditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
