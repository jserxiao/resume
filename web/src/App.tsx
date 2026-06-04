import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import EditorPage from '@/pages/EditorPage';
import TemplateBuilderPage from '@/pages/TemplateBuilderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/template-builder" element={<TemplateBuilderPage />} />
      </Routes>
    </BrowserRouter>
  );
}
