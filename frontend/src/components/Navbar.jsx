import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Wifi, WifiOff } from 'lucide-react';
import AnnouncementTicker from './AnnouncementTicker.jsx';

export default function Navbar({ connectionStatus, activeScenario }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scenarioLabel = {
    nominal_morning:        { text: 'NOMINAL',  color: '#00FF41' },
    missed_kitchen_routine: { text: 'MEDIUM',   color: '#FFD700' },
    bathroom_fall_dwell:    { text: 'CRITICAL', color: '#FF3131' },
    cardiovascular_drift:   { text: 'HIGH',     color: '#FB923C' },
  }[activeScenario] || { text: 'NOMINAL', color: '#00FF41' };

  return (
    <header
      style={{
        background: scrolled
          ? 'rgba(18,18,18,0.92)'
          : 'rgba(18,18,18,0.75)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        transition: 'background 0.3s',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Ticker */}
      <AnnouncementTicker />

      {/* Main nav bar */}
      <div
        className="max-w-screen-xl mx-auto flex items-center justify-between px-6"
        style={{ height: 60 }}
      >
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 no-underline">
          <div
            className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg,#F399B3 0%,#643F49 100%)',
              boxShadow: '0 0 18px rgba(243,153,179,0.4)',
            }}
          >
            <Shield size={14} color="#fff" />
          </div>
          <div>
            <div
              className="sw-heading text-white"
              style={{ fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1.1 }}
            >
              Ambient Guardian
            </div>
            <div
              className="sw-body"
              style={{ fontSize: 10, color: '#999', marginTop: 1 }}
            >
              Life & Safety AI
            </div>
          </div>
        </NavLink>

        {/* Status pills */}
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full sw-body text-xs"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: connectionStatus === 'connected' ? '#00FF41' : '#FF3131',
            }}
          >
            {connectionStatus === 'connected'
              ? <Wifi size={11} />
              : <WifiOff size={11} />}
            {connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
          </div>

          {/* Urgency badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full sw-body text-xs font-medium"
            style={{
              background: `${scenarioLabel.color}14`,
              border: `1px solid ${scenarioLabel.color}44`,
              color: scenarioLabel.color,
            }}
          >
            <span
              className="animate-pulse inline-block rounded-full"
              style={{ width: 6, height: 6, background: scenarioLabel.color }}
            />
            {scenarioLabel.text}
          </div>
        </div>
      </div>
    </header>
  );
}
