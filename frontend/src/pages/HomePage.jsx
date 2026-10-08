import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Heart, Wind, Thermometer, Zap, Activity, AlertTriangle,
  CheckCircle2, User, Clock, ArrowRight, Cpu, Radio, Terminal
} from 'lucide-react';

export default function HomePage({ state, logs, onScenarioChange, onSimulateTool }) {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);

  const snapshot = state?.snapshot || {};
  const vitals = snapshot.bee_wearable_vitals || {};
  const profile = state?.resident_profile || {};
  const scenario = snapshot.active_scenario || 'nominal_morning';

  const scenarioMeta = {
    nominal_morning:        { label: 'NOMINAL MORNING', urgency: 'NOMINAL',   score: 8,  color: 'matrix' },
    missed_kitchen_routine: { label: 'MISSED KITCHEN',  urgency: 'MEDIUM',    score: 72, color: 'warn' },
    bathroom_fall_dwell:    { label: 'NIGHT FALL DWELL',urgency: 'CRITICAL',  score: 94, color: 'danger' },
    cardiovascular_drift:   { label: 'CARDIO DRIFT',    urgency: 'HIGH',      score: 81, color: 'orange' },
  };
  const sm = scenarioMeta[scenario] || scenarioMeta.nominal_morning;

  const urgencyStyle = {
    matrix:  { text: 'text-matrix', border: 'border-matrix', bg: 'bg-matrix/10', bar: 'bg-matrix', glow: '0 0 15px rgba(0,255,65,0.5)' },
    warn:    { text: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-400/10', bar: 'bg-yellow-400', glow: '0 0 15px rgba(255,215,0,0.4)' },
    danger:  { text: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500/10', bar: 'bg-red-500', glow: '0 0 15px rgba(255,49,49,0.5)' },
    orange:  { text: 'text-orange-400', border: 'border-orange-400', bg: 'bg-orange-400/10', bar: 'bg-orange-400', glow: '0 0 15px rgba(251,146,60,0.4)' },
  };
  const us = urgencyStyle[sm.color];

  const activeRooms = Object.entries(snapshot.room_motion_sensors || {})
    .filter(([, d]) => d.state === 'ACTIVE')
    .map(([r]) => r.replace('_', ' ').toUpperCase());

  const recentActivity = logs.slice(0, 8);

  const handleRunAssessment = async () => {
    setRunning(true);
    try {
      await onSimulateTool('eval_anomaly_risk', { focus_area: 'overall_wellbeing' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-terminal-black text-matrix font-mono">
      <div className="max-w-screen-2xl mx-auto px-4 py-8 space-y-8">

        {/* ── HERO HEADER ─────────────────────────────── */}
        <div className="relative text-center py-10 border border-terminal-border overflow-hidden"
          style={{ boxShadow: 'inset 0 0 40px rgba(0,255,65,0.04)' }}>
          {/* Corner decorators */}
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
            <span key={i} className={`absolute ${pos} w-4 h-4 border-matrix ${
              i === 0 ? 'border-t-2 border-l-2' : i === 1 ? 'border-t-2 border-r-2' :
              i === 2 ? 'border-b-2 border-l-2' : 'border-b-2 border-r-2'}`}
            />
          ))}

          {/* Decorative sparkles */}
          <div className="absolute top-4 left-8 text-matrix opacity-40 text-xl select-none">✦</div>
          <div className="absolute top-6 right-12 text-matrix opacity-30 text-sm select-none">✦</div>
          <div className="absolute bottom-5 left-1/4 text-matrix opacity-20 text-xs select-none">✦</div>

          <div className="font-pixel text-matrix text-glow leading-relaxed"
            style={{ fontSize: 'clamp(14px, 4vw, 32px)', letterSpacing: '0.1em' }}
            data-text="AMBIENT GUARDIAN">
            AMBIENT GUARDIAN
          </div>
          <div className="mt-3 text-[11px] font-mono text-terminal-muted tracking-widest uppercase">
            {'>'} Proactive Health & Safety Intelligence System
          </div>
          <div className="mt-1 text-[10px] font-mono text-terminal-muted tracking-widest">
            Alexa+ MCP Spec 2025-11-25&nbsp; // &nbsp;AWS Bedrock AgentCore&nbsp; // &nbsp;Amazon Hackathon 2026
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-[10px] text-terminal-muted">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-matrix rounded-full animate-pulse"/> RING SENSORS: ACTIVE</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-matrix rounded-full animate-pulse"/> BEE WEARABLE: STREAMING</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"/> BEDROCK: AGENTCORE</span>
          </div>
        </div>

        {/* ── THREE MAIN CARDS ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Card 1: Resident Profile */}
          <div className="border border-terminal-border bg-terminal-panel p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-matrix" />
            <div className="flex items-center gap-2 text-[10px] text-terminal-muted uppercase tracking-widest">
              <User className="w-3 h-3 text-matrix" />
              <span>// Resident Profile</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="font-pixel text-matrix text-glow text-[10px]">{profile.first_name || 'Eleanor'} {profile.last_name || 'Vance'}</div>
                <div className="text-[10px] text-terminal-muted mt-1">AGE: {profile.age || 78} // ID: {profile.resident_id || 'RES-8821'}</div>
              </div>
              <div className="border-t border-terminal-border pt-3 space-y-1.5 text-[11px]">
                {(profile.medical_notes || [
                  'Hypertension (Lisinopril before 09:00)',
                  'Mild Cognitive Impairment',
                  'Elevated fall risk (osteopenia)',
                ]).map((note, i) => (
                  <div key={i} className="flex gap-2 text-terminal-muted">
                    <span className="text-matrix flex-shrink-0">{'>'}</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-terminal-border pt-3 text-[10px] space-y-1">
                <div className="text-terminal-muted">CAREGIVER // Dr. Sarah Vance</div>
                <div className="text-matrix">+1-555-019-2831</div>
              </div>
            </div>
          </div>

          {/* Card 2: Real-time Vitals */}
          <div className="border border-terminal-border bg-terminal-panel p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-matrix" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-terminal-muted uppercase tracking-widest">
                <Activity className="w-3 h-3 text-matrix" />
                <span>// Bee Wearable Vitals</span>
              </div>
              <span className="text-[9px] font-mono text-matrix animate-pulse">● LIVE</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'HEART RATE', value: `${vitals.heart_rate_bpm || 72}`, unit: 'BPM', icon: Heart, alert: (vitals.heart_rate_bpm || 72) > 100, color: 'text-red-400' },
                { label: 'SpO2', value: `${vitals.spo2_percent || 98}`, unit: '%', icon: Wind, alert: (vitals.spo2_percent || 98) < 92, color: 'text-blue-400' },
                { label: 'SKIN TEMP', value: `${vitals.skin_temp_c || 36.6}`, unit: '°C', icon: Thermometer, alert: (vitals.skin_temp_c || 36.6) > 37.8, color: 'text-yellow-400' },
                { label: 'PEAK IMPACT', value: `${vitals.accelerometer_peak_g || 1.05}`, unit: 'G', icon: Zap, alert: (vitals.accelerometer_peak_g || 1.05) > 3.0, color: 'text-purple-400' },
              ].map(({ label, value, unit, icon: Icon, alert, color }) => (
                <div key={label} className={`border p-3 ${alert ? 'border-red-500/60 bg-red-500/5' : 'border-terminal-border bg-terminal-black'}`}
                  style={alert ? { boxShadow: '0 0 8px rgba(255,49,49,0.3)' } : {}}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className={`w-3 h-3 ${alert ? 'text-red-400 animate-pulse' : color}`} />
                    <span className="text-[9px] text-terminal-muted uppercase">{label}</span>
                  </div>
                  <div className={`font-pixel text-[12px] ${alert ? 'text-red-400 text-glow-danger' : 'text-matrix text-glow'}`}>
                    {value}<span className="text-[8px] ml-1 text-terminal-muted">{unit}</span>
                  </div>
                  {alert && <div className="text-[9px] text-red-400 mt-1 animate-pulse">⚠ ALERT</div>}
                </div>
              ))}
            </div>
            <div className="text-[10px] text-terminal-muted border-t border-terminal-border pt-2">
              STEPS: {vitals.step_count || 1840} // BATTERY: {vitals.battery_pct || 88}%
              {vitals.fall_detected && <span className="ml-2 text-red-400 font-bold animate-pulse">// FALL DETECTED!</span>}
            </div>
          </div>

          {/* Card 3: Anomaly Score */}
          <div className={`border ${us.border} bg-terminal-panel p-5 space-y-4 relative overflow-hidden`}
            style={{ boxShadow: us.glow }}>
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${us.bar}`} />
            <div className="flex items-center gap-2 text-[10px] text-terminal-muted uppercase tracking-widest">
              <Cpu className="w-3 h-3 text-matrix" />
              <span>// Bedrock Triage</span>
            </div>

            <div className="text-center py-4 space-y-2">
              <div className={`font-pixel text-[28px] ${us.text}`} style={{ textShadow: us.glow.replace('box', 'text') }}>
                {sm.score}%
              </div>
              <div className={`font-pixel text-[10px] ${us.text} uppercase tracking-widest`}>
                {sm.urgency}
              </div>
            </div>

            {/* Block progress bar */}
            <div>
              <div className="flex gap-0.5">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className={`flex-1 h-4 ${i < Math.round(sm.score / 5) ? us.bar : 'bg-terminal-border'}`} />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-terminal-muted mt-1">
                <span>NOMINAL</span><span>CRITICAL</span>
              </div>
            </div>

            <div className="border-t border-terminal-border pt-3 text-[10px] text-terminal-muted space-y-1">
              <div>SCENARIO: <span className="text-matrix">{sm.label}</span></div>
              <div>MODEL: <span className="text-matrix">Claude 3.5 Sonnet v2</span></div>
              <div>LATENCY: <span className="text-matrix">~380ms</span></div>
            </div>
          </div>
        </div>

        {/* ── ACTIVE SENSOR STATUS ──────────────────────── */}
        <div className="border border-terminal-border bg-terminal-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[10px] text-terminal-muted uppercase tracking-widest">
              <Radio className="w-3 h-3 text-matrix" />
              <span>// Ring PIR Sensor Grid — Live Occupancy</span>
            </div>
            <button onClick={() => navigate('/sensors')} className="btn-pixel text-[10px] flex items-center gap-1">
              CONTROL <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(snapshot.room_motion_sensors || {
              bedroom: { state: 'INACTIVE', sensor_id: 'ring_mot_bed_01' },
              bathroom: { state: 'INACTIVE', sensor_id: 'ring_mot_bath_01' },
              kitchen: { state: 'ACTIVE', sensor_id: 'ring_mot_kitch_01' },
              living_room: { state: 'INACTIVE', sensor_id: 'ring_mot_liv_01' },
              hallway: { state: 'INACTIVE', sensor_id: 'ring_mot_hall_01' },
              front_door: { state: 'INACTIVE', sensor_id: 'ring_mot_entry_01' },
            }).map(([room, data]) => {
              const isActive = data.state === 'ACTIVE';
              return (
                <div key={room} className={`border p-3 text-center ${isActive ? 'border-yellow-500/70 bg-yellow-500/5' : 'border-terminal-border'}`}
                  style={isActive ? { boxShadow: '0 0 8px rgba(255,215,0,0.25)' } : {}}>
                  <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${isActive ? 'bg-yellow-400 animate-pulse' : 'bg-terminal-muted'}`} />
                  <div className="text-[9px] font-mono uppercase text-terminal-muted">{room.replace('_', ' ')}</div>
                  <div className={`text-[9px] font-bold mt-1 ${isActive ? 'text-yellow-400' : 'text-terminal-muted'}`}>
                    {isActive ? 'MOTION' : 'CLEAR'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── QUICK ACTIONS + ACTIVITY ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Quick Actions */}
          <div className="border border-terminal-border bg-terminal-panel p-5 space-y-4">
            <div className="text-[10px] text-terminal-muted uppercase tracking-widest">// Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleRunAssessment} disabled={running}
                className="btn-pixel-solid text-[11px] py-3 flex items-center justify-center gap-2">
                <Cpu className="w-3.5 h-3.5" />
                {running ? 'ANALYZING...' : 'RUN ASSESSMENT'}
              </button>
              <button onClick={() => navigate('/sensors')}
                className="btn-pixel text-[11px] py-3 flex items-center justify-center gap-2">
                <Radio className="w-3.5 h-3.5" />
                SENSOR CTRL
              </button>
              <button onClick={() => navigate('/console')}
                className="btn-pixel text-[11px] py-3 flex items-center justify-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                MCP CONSOLE
              </button>
              <button onClick={() => onSimulateTool('trigger_voice_nudge', { resident_id: 'RES-8821', tone: 'gentle' })}
                className="btn-pixel text-[11px] py-3 flex items-center justify-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                VOICE NUDGE
              </button>
            </div>
            <div className="border-t border-terminal-border pt-3 space-y-1 text-[10px]">
              <div className="text-terminal-muted">Load Preset Scenario:</div>
              <div className="grid grid-cols-2 gap-1">
                {(state?.available_scenarios || []).map(sc => (
                  <button key={sc.id} onClick={() => onScenarioChange(sc.id)}
                    className={`text-left px-2 py-1.5 border text-[10px] font-mono transition-all ${
                      snapshot.active_scenario === sc.id
                        ? 'border-matrix text-matrix bg-matrix/5'
                        : 'border-terminal-border text-terminal-muted hover:border-matrix/40 hover:text-matrix/60'
                    }`}>
                    {'>'} {sc.urgency} // {sc.id.replace(/_/g,' ').toUpperCase().slice(0,18)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="border border-terminal-border bg-terminal-panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-terminal-muted uppercase tracking-widest">// Activity Feed</div>
              <button onClick={() => navigate('/console')} className="text-[10px] text-matrix hover:underline">
                VIEW ALL →
              </button>
            </div>
            <div className="space-y-1 h-52 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="text-[10px] text-terminal-muted py-4">{'>'} Awaiting events... <span className="cursor" /></div>
              ) : recentActivity.map(log => (
                <div key={log.id} className="flex gap-2 text-[10px] animate-slide-in border-b border-terminal-border/30 pb-1">
                  <span className="text-terminal-muted flex-shrink-0">
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '??:??:??'}
                  </span>
                  <span className="text-terminal-muted">//</span>
                  <span className={
                    log.direction?.includes('SECURITY') ? 'text-red-400' :
                    log.direction?.includes('NUDGE') ? 'text-blue-400' :
                    log.tool ? 'text-yellow-400' : 'text-matrix/80'
                  }>
                    {log.tool ? `tools/${log.tool}` : log.category || log.direction || 'event'}
                    {log.execution_ms ? ` (${log.execution_ms}ms)` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────── */}
        <div className="border-t border-terminal-border pt-4 flex items-center justify-between text-[9px] text-terminal-muted font-mono">
          <span>PROJECT AMBIENT GUARDIAN // BUILD, SHIP, SHAPE 2026 // MIT LICENSE</span>
          <span>MCP SPEC 2025-11-25 // STREAMABLE HTTP/SSE // BEDROCK AGENTCORE</span>
        </div>
      </div>
    </div>
  );
}
