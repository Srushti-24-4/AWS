import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import SensorPage from './pages/SensorPage.jsx';
import MCPPage from './pages/MCPPage.jsx';
import Navbar from './components/Navbar.jsx';
import BottomDock from './components/BottomDock.jsx';
import axios from 'axios';


// ------------------------------------------------------------------
// Auth token handling – pull from environment or ask the user once.
// ------------------------------------------------------------------
const DEFAULT_TOKEN = import.meta.env.VITE_MCP_TOKEN || 'ambient-guardian-secret-token-2026';
let token = DEFAULT_TOKEN;
if (!token) {
  // Prompt the user for a token (only on first load). This value will be stored
  // in localStorage for subsequent reloads.
  const stored = localStorage.getItem('MCP_TOKEN');
  if (stored) {
    token = stored;
  } else {
    token = prompt('Enter the MCP Bearer token (provided by the backend):');
    if (token) localStorage.setItem('MCP_TOKEN', token);
  }
}
// Apply the header globally for all axios calls.
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;


// Central state sync with MCP server via SSE
export default function App() {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [logs, setLogs] = useState([]);
  const [recentNudge, setRecentNudge] = useState(null);

  // SSE connection for live updates
  useEffect(() => {
    const evtSource = new EventSource(`/mcp/v1/sse?token=${token}`);
    evtSource.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'state') setState(data.payload);
        else if (data.type === 'log') setLogs(prev => [data.payload, ...prev].slice(0, 200));
        else if (data.type === 'nudge') setRecentNudge(data.payload);
      } catch (_) {}
    };
    evtSource.onerror = () => evtSource.close();
    return () => evtSource.close();
  }, []);

  // Helper to call MCP tools via backend proxy
  const simulateTool = async (tool, args) => {
    const req = { jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { tool, arguments: args } };
    const res = await axios.post('/mcp/v1/messages', req);
    if (res.data.error) console.error(res.data.error);
    else setLogs(prev => [{ id: Date.now(), direction: 'TOOL', tool, timestamp: new Date().toISOString(), payload: res.data.result }, ...prev]);
  };

  // Send resident free-form response to backend for further processing
  const sendResponse = async (text) => {
    await simulateTool('trigger_voice_nudge', { resident_id: 'RES-8821', custom_response: text });
  };

  // Scenario switch
  const changeScenario = async (scenarioId, shouldNavigate = false) => {
    await axios.post('/api/simulator/set-scenario', { scenario_id: scenarioId });
    // force refresh state
    const res = await axios.get('/api/simulator/state');
    setState(res.data);
    if (shouldNavigate) navigate('/');
  };

  // Refresh state manually (used after sensor toggles)
  const refreshState = async () => {
    const res = await axios.get('/api/simulator/state');
    setState(res.data);
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#121212', color: '#fff' }}>
      <Navbar connectionStatus="connected" activeScenario={state?.snapshot?.active_scenario} />
      <main className="flex-1 overflow-hidden pb-28">
        <Routes>
          <Route path="/" element={<HomePage state={state} logs={logs} onScenarioChange={changeScenario} onSimulateTool={simulateTool} />} />
          <Route path="/sensors" element={<SensorPage state={state} logs={logs} onScenarioChange={changeScenario} onRefreshState={refreshState} />} />
          <Route path="/console" element={<MCPPage state={state} logs={logs} recentNudge={recentNudge} onSimulateTool={simulateTool} onSendResponse={sendResponse} />} />
          <Route path="*" element={<div className='p-8 sw-body' style={{color:'#999'}}>404 – Page not found</div>} />
        </Routes>
      </main>
      <BottomDock />
    </div>
  );
}

