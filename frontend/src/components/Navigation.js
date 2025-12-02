import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

// Icon components
const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 8L8 2L14 8M8 2V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 4V8L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const ReportsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="10" width="3" height="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <rect x="6.5" y="6" width="3" height="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <rect x="11" y="2" width="3" height="12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </svg>
);

const RemindersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.5 13.5C6.5 14.3 7.2 15 8 15C8.8 15 9.5 14.3 9.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M3 12V7C3 5.3 4.3 4 6 4H10C11.7 4 13 5.3 13 7V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: DashboardIcon },
    { path: '/history', label: 'History', icon: HistoryIcon },
    { path: '/reports', label: 'Reports', icon: ReportsIcon },
    { path: '/budget-planning', label: 'Budget Planning', icon: RemindersIcon },
  ];

  return (
    <nav className="navigation">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const IconComponent = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <IconComponent />
            </span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default Navigation;