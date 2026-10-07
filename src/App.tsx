import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './layout/Layout';
import ReportsListPage from './pages/ReportsListPage';
import ReportFillPage from './pages/ReportFillPage';
import BuilderPage from './pages/BuilderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ReportsListPage />} />
          <Route path="/reports" element={<ReportsListPage />} />
          <Route path="/reports/new" element={<BuilderPage />} />
          <Route path="/reports/:templateId" element={<ReportFillPage />} />
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/builder/:templateId" element={<BuilderPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}