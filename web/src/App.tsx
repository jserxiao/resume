import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EditorPage from '@/pages/EditorPage';
import DecorationEditorPage from '@/pages/DecorationEditorPage';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/decoration-editor" element={<DecorationEditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
