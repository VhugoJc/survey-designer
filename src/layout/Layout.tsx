// ──────────────────────────────────────────────
// Layout — Top Bar + Responsive Hamburger Sidebar + Outlet
// ──────────────────────────────────────────────

import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, FileText } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const closeSidebar = () => setSidebarOpen(false);

  const navItems = [
    { label: 'Reportes / Galería', icon: FileText, href: '/reports' },
  ];

  return (
    <div className="app-shell">
      {/* ── Overlay for mobile sidebar ── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* ── Top Navigation Bar ── */}
      <header className="top-bar">
        <div className="top-bar-left">
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu size={20} />
          </button>
          <span
            className="top-bar-title cursor-pointer"
            onClick={() => { closeSidebar(); navigate('/reports'); }}
          >
            FEVISA — Sistema de Mantenimiento y Inspección
          </span>
        </div>
        <div className="top-bar-right">
          <span className="env-badge">⚙️ Demo</span>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <nav className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Navegación</span>
          <button
            type="button"
            className="sidebar-close"
            onClick={closeSidebar}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>
        <ul className="sidebar-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = window.location.pathname === item.href;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                  onClick={() => { navigate(item.href); closeSidebar(); }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="sidebar-footer">
          <span className="text-[10px] text-slate-500">FEVISA v1.0</span>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}