import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Radio, Terminal, ExternalLink } from 'lucide-react';

const NAV = [
  { to: '/',        label: 'Dashboard',  icon: Home },
  { to: '/sensors', label: 'Sensors',    icon: Radio },
  { to: '/console', label: 'MCP Console',icon: Terminal },
];

export default function BottomDock() {
  return (
    <nav className="sw-dock sw-reveal sw-reveal-delay-3">
      {/* Rose dot */}
      <span className="sw-dock-dot animate-pulse" />

      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `sw-dock-item${isActive ? ' active' : ''}`
          }
        >
          <Icon size={14} />
          {label}
        </NavLink>
      ))}

      <div
        className="w-px self-stretch mx-1"
        style={{ background: 'rgba(255,255,255,0.10)' }}
      />

      <a
        href="https://amazonappdev2026.devpost.com/"
        target="_blank"
        rel="noreferrer"
        className="sw-dock-item text-xs"
        style={{ color: '#F399B3' }}
      >
        <ExternalLink size={12} />
        Hackathon
      </a>
    </nav>
  );
}
