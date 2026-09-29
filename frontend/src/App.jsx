import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Terminal, 
  Radio, 
  Cpu, 
  Award, 
  Wifi, 
  WifiOff, 
  Sparkles,
  HeartPulse
} from 'lucide-react';
import EventStreamer from './components/EventStreamer';
import MCPLogViewer from './components/MCPLogViewer';
import AlexaVoiceSimulator from './components/AlexaVoiceSimulator';

export default function App() {
  const [simulatorState, setSimulatorState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [recentNudge, setRecentNudge] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const eventSourceRef = useRef(null);

  // Fetch initial simulator state
  const fetchState = async () => {
    try {
      const res = await fetch('/api/simulator/state');
      if (res.ok) {
        const data = await res.json();
        setSimulatorState(data);
      }
    } catch (err) {
      console.error('Failed to fetch simulator state:', err);
    }
  };

  useEffect(() => {
    fetchState();

    // Establish live SSE stream for MCP logs and ambient events
    const sse = new EventSource('/api/simulator/logs/sse');
    eventSourceRef.current = sse;

    sse.onopen = () => {
      setConnectionStatus('connected');
    };

    sse.addEventListener('log', (event) => {
      try {
        const item = JSON.parse(event.data);
        setLogs(prev => [item, ...prev].slice(0, 200));

        // If this is a proactive nudge, pass to Alexa component
        if (item.direction === 'ALEXA_PROACTIVE_NUDGE' && item.payload) {
          setRecentNudge(item.payload);
        }

        // Auto-refresh state if sensor or scenario changed
        if (item.direction === 'TELEMETRY' || item.category === 'scenario_loaded') {
          fetchState();
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    });

    sse.onerror = () => {
      setConnectionStatus('disconnected');
    };

    return () => {
      sse.close();
    };
  }, []);

  const handleScenarioChange = async (scenarioId) => {
    try {
      const res = await fetch('/api/simulator/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      if (res.ok) {
        await fetchState();
        // Also trigger evaluation tool to showcase immediate Bedrock response
        handleSimulateTool('eval_anomaly_risk', { focus_area: 'overall_wellbeing' });
      }
    } catch (err) {
      console.error('Failed to change scenario:', err);
    }
  };

  const handleSimulateTool = async (toolName, args = {}) => {
    try {
      const res = await fetch('/api/simulator/call-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_name: toolName, arguments: args }),
      });
      const data = await res.json();

      // If tool is trigger_voice_nudge or returned suggested_voice_prompt, notify Alexa
      if (toolName === 'trigger_voice_nudge' && data.result?.nudge) {
        setRecentNudge(data.result.nudge);
      } else if (toolName === 'eval_anomaly_risk' && data.result?.assessment?.suggested_voice_prompt) {
        const assessment = data.result.assessment;
        if (assessment.suggested_voice_prompt) {
          setRecentNudge({
            voice_script: assessment.suggested_voice_prompt,
            tone: assessment.urgency_level.toLowerCase(),
            caregiver_escalation_queued: assessment.anomaly_score >= 0.8,
          });
        }
      }

      await fetchState();
      return data;
    } catch (err) {
      console.error('Failed to execute simulated tool:', err);
      throw err;
    }
  };

  const handleSendResponse = async (text) => {
    try {
      await fetch('/api/simulator/resident-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_text: text }),
      });
    } catch (err) {
      console.error('Failed to send resident utterance:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Universal App Header */}
      <header className="h-16 bg-slate-950/90 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                Project Ambient Guardian
              </h1>
              <span className="text-[10px] uppercase font-bold bg-cyan-950/80 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded-full">
                Hackathon 2026
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Context-Aware Health & Safety Intelligence • Alexa+ (MCP) & AWS Bedrock AgentCore
            </p>
          </div>
        </div>

        {/* Center: Resident Context Pill */}
        <div className="hidden lg:flex items-center bg-slate-900/90 border border-slate-800 rounded-full px-4 py-1.5 space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Monitored Resident:</span>
            <span className="font-semibold text-slate-200">Eleanor Vance (Age 78)</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1 text-slate-400">
            <span>Morning Tea Baseline:</span>
            <span className="text-cyan-400 font-mono">08:15 AM</span>
          </div>
        </div>

        {/* Right: Hackathon Tracks & Protocol Status */}
        <div className="flex items-center space-x-3">
          {/* Target Track Badges */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[10px] font-mono bg-cyan-950/70 border border-cyan-700/80 text-cyan-300 px-2 py-1 rounded flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              Primary: Alexa+ MCP 2025-11-25
            </span>
            <span className="text-[10px] font-mono bg-purple-950/70 border border-purple-700/80 text-purple-300 px-2 py-1 rounded flex items-center gap-1">
              <HeartPulse className="w-3 h-3 text-purple-400" />
              AWS Bedrock AgentCore
            </span>
          </div>

          {/* SSE Connection Status */}
          <div className="flex items-center space-x-1.5 text-xs font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                <span className="text-emerald-400">SSE LIVE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping-slow" />
                <span className="text-rose-400">OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main 3-Column Studio Grid */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Column (3.5 cols): Event Streamer (Ring + Bee) */}
        <section className="md:col-span-4 lg:col-span-3 h-full overflow-hidden">
          <EventStreamer
            state={simulatorState}
            onScenarioChange={handleScenarioChange}
            onRefreshState={fetchState}
          />
        </section>

        {/* Center Column (5 cols): MCP Server Live Inspector */}
        <section className="md:col-span-4 lg:col-span-5 h-full overflow-hidden">
          <MCPLogViewer
            logs={logs}
            onClearLogs={() => setLogs([])}
            onSimulateTool={handleSimulateTool}
          />
        </section>

        {/* Right Column (3.5 cols): Alexa+ Voice & Caregiver Hub */}
        <section className="md:col-span-4 lg:col-span-4 h-full overflow-hidden">
          <AlexaVoiceSimulator
            state={simulatorState}
            recentNudge={recentNudge}
            onSendResponse={handleSendResponse}
          />
        </section>
      </main>
    </div>
  );
}
