import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Shield, Radio, Cpu, Terminal, Wifi, WifiOff } from 'lucide-react';

export default function Navbar({ connectionStatus, activeScenario }) {
  const [time, setTime] = useState(new Date());
  const location = useLocation();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const urgencyFromScenario = {
    nominal_morning: { label: 'NOMINAL', color: 'text-matrix' },
    missed_kitchen_routine: { label: 'MEDIUM', color: 'text-warn-DEFAULT' },
    bathroom_fall_dwell: { label: 'CRITICAL', color: 'text-danger-DEFAULT' },
    cardiovascular_drift: { label: 'HIGH', color: 'text-orange-400' },
  };
  const urgency = urgencyFromScenario[activeScenario] || { label: 'NOMINAL', color: 'text-matrix' };

  const navItems = [
    { to: '/',        label: '// HOME',    icon: Shield },
    { to: '/sensors', label: '// SENSORS', icon: Radio },
    { to: '/console', label: '// CONSOLE', icon: Terminal },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-terminal-border bg-terminal-black/95 backdrop-blur">
      {/* Top bar: decorative */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-matrix to-transparent" />

      <div className="max-w-screen-2xl mx-auto px-4 flex items-center justify-between h-14">

        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative w-8 h-8 flex items-center justify-center border border-matrix"
            style={{ boxShadow: '0 0 10px rgba(0,255,65,0.4)' }}>
            <Shield className="w-4 h-4 text-matrix" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-matrix animate-pulse" />
          </div>
          <div>
            <div className="font-pixel text-matrix text-[9px] leading-tight text-glow">
              AMBIENT<br />GUARDIAN
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-terminal-border mx-2" />
          <div className="hidden sm:block text-[10px] font-mono text-terminal-muted">
            v1.0.0 // MCP 2025-11-25
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-all border-b-2 ${
                  isActive
                    ? 'text-matrix border-matrix text-glow'
                    : 'text-terminal-muted border-transparent hover:text-matrix/70 hover:border-matrix/40'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Right Status Cluster */}
        <div className="flex items-center gap-3 text-[10px] font-mono flex-shrink-0">
          {/* Active Scenario */}
          <div className="hidden md:flex items-center gap-1.5 border border-terminal-border px-2 py-1">
            <span className="text-terminal-muted">SCENARIO:</span>
            <span className={`font-bold ${urgency.color}`}>{urgency.label}</span>
          </div>

          {/* SSE Status */}
          <div className={`flex items-center gap-1.5 border px-2 py-1 ${
            connectionStatus === 'connected'
              ? 'border-matrix/50 text-matrix'
              : 'border-danger-DEFAULT/50 text-danger-DEFAULT'
          }`}>
            {connectionStatus === 'connected'
              ? <><span className="w-1.5 h-1.5 rounded-full bg-matrix animate-pulse" /><span>LIVE</span></>
              : <><span className="w-1.5 h-1.5 rounded-full bg-danger-DEFAULT" /><span>OFFLINE</span></>
            }
          </div>

          {/* Clock */}
          <div className="hidden lg:block text-terminal-muted border border-terminal-border px-2 py-1 font-pixel text-[8px]">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </div>

      {/* Active page indicator bar */}
      <div className="h-px bg-terminal-border" />
    </nav>
  );
}
