import React from 'react';

const MESSAGES = [
  '⬤  AMBIENT GUARDIAN — Life & Safety Intelligence System',
  '⬤  Alexa+ MCP Spec 2025-11-25  //  AWS Bedrock AgentCore',
  '⬤  LIVE: Ring PIR sensors · Bee wearable · Multi-contact escalation',
  '⬤  Voice commands powered by Gemini AI — configure your key in Settings',
  '⬤  Emergency escalation: Dr. Sarah Vance + Neighbour Margaret Chen',
  '⬤  Amazon Hackathon 2026 — Best Life & Safety Innovation',
];

export default function AnnouncementTicker() {
  const repeated = [...MESSAGES, ...MESSAGES]; // duplicate for seamless loop

  return (
    <div
      className="w-full overflow-hidden py-2.5"
      style={{
        background: 'rgba(243,153,179,0.07)',
        borderBottom: '1px solid rgba(243,153,179,0.15)',
      }}
    >
      <div className="ticker-track flex gap-12 whitespace-nowrap">
        {repeated.map((msg, i) => (
          <span
            key={i}
            className="sw-body text-xs flex-shrink-0"
            style={{ color: '#F399B3', letterSpacing: '0.04em' }}
          >
            {msg}
          </span>
        ))}
      </div>
    </div>
  );
}
