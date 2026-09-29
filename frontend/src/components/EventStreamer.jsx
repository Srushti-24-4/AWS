import React, { useState } from 'react';
import { 
  Activity, 
  Heart, 
  Wind, 
  Thermometer, 
  ShieldAlert, 
  PlayCircle, 
  Home, 
  Coffee, 
  Bath, 
  Bed, 
  DoorClosed, 
  Footprints,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function EventStreamer({ state, onScenarioChange, onRefreshState }) {
  const [updatingWearable, setUpdatingWearable] = useState(false);
  const [motionLoading, setMotionLoading] = useState({});

  // Local wearable form state
  const wearable = state?.snapshot?.bee_wearable_vitals || {};
  const [hr, setHr] = useState(wearable.heart_rate_bpm || 72);
  const [spo2, setSpo2] = useState(wearable.spo2_percent || 98);
  const [temp, setTemp] = useState(wearable.skin_temp_c || 36.6);
  const [fall, setFall] = useState(wearable.fall_detected || false);
  const [peakG, setPeakG] = useState(wearable.accelerometer_peak_g || 1.05);

  const rooms = [
    { id: 'kitchen', name: 'Kitchen', icon: Coffee, desc: 'Tea kettle / breakfast hub' },
    { id: 'bathroom', name: 'Bathroom', icon: Bath, desc: 'High fall-risk zone' },
    { id: 'bedroom', name: 'Bedroom', icon: Bed, desc: 'Sleep / circadian wake' },
    { id: 'living_room', name: 'Living Room', icon: Home, desc: 'Echo Show hub / reading' },
    { id: 'hallway', name: 'Hallway', icon: Footprints, desc: 'Motion transition path' },
    { id: 'front_door', name: 'Front Door', icon: DoorClosed, desc: 'Egress / wander detection' },
  ];

  const handleToggleMotion = async (roomId, currentState) => {
    const nextState = currentState === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setMotionLoading(prev => ({ ...prev, [roomId]: true }));
    try {
      await fetch('/api/simulator/toggle-motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomId, state: nextState }),
      });
      if (onRefreshState) onRefreshState();
    } catch (err) {
      console.error('Failed to toggle motion:', err);
    } finally {
      setMotionLoading(prev => ({ ...prev, [roomId]: false }));
    }
  };

  const handleUpdateWearable = async () => {
    setUpdatingWearable(true);
    try {
      await fetch('/api/simulator/update-wearable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heart_rate: Number(hr),
          spo2: Number(spo2),
          skin_temp: Number(temp),
          fall_detected: Boolean(fall),
          accelerometer_g: Number(peakG),
        }),
      });
      if (onRefreshState) onRefreshState();
    } catch (err) {
      console.error('Failed to update wearable:', err);
    } finally {
      setUpdatingWearable(false);
    }
  };

  const triggerImpact = (gForce, isFall) => {
    setPeakG(gForce);
    setFall(isFall);
  };

  const activeScenario = state?.snapshot?.active_scenario;

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border-r border-slate-800 overflow-y-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-cyan-400">
          <Activity className="w-5 h-5 animate-pulse" />
          <h2 className="text-base font-semibold uppercase tracking-wider text-slate-200">
            Multi-Modal Event Streamer
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Simulate Ring PIR motion events and Bee wearable biometrics in real time.
        </p>
      </div>

      {/* Preset Scenarios Selector */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <PlayCircle className="w-4 h-4 text-cyan-400" />
            Clinical Preset Scenarios
          </span>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-cyan-300 font-mono">
            Hackathon Matrix
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {(state?.available_scenarios || []).map((sc) => {
            const isSelected = activeScenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => onScenarioChange(sc.id)}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-100 shadow-md ring-1 ring-cyan-500/50'
                    : 'border-slate-800/80 bg-slate-900/50 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">{sc.title}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      sc.urgency === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : sc.urgency === 'HIGH'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : sc.urgency === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {sc.urgency}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {sc.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ring Motion Sensors Map */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Home className="w-4 h-4 text-cyan-400" />
            Ring Motion Sensors
          </span>
          <span className="text-[10px] text-slate-400 font-mono">PIR Live</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rooms.map((room) => {
            const Icon = room.icon;
            const sensorData = state?.snapshot?.room_motion_sensors?.[room.id] || {};
            const isActive = sensorData.state === 'ACTIVE';
            const loading = motionLoading[room.id];

            return (
              <button
                key={room.id}
                onClick={() => handleToggleMotion(room.id, sensorData.state)}
                disabled={loading}
                className={`p-2.5 rounded-lg border text-left transition-all relative overflow-hidden group ${
                  isActive
                    ? 'border-amber-500/70 bg-amber-950/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold text-slate-200">{room.name}</span>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-amber-400 ring-4 ring-amber-400/20' : 'bg-slate-600'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/50 text-[10px]">
                  <span className="text-slate-400 font-mono">
                    {isActive ? 'MOTION' : 'CLEAR'}
                  </span>
                  <span className="text-slate-500 text-[9px] group-hover:text-cyan-400">
                    Click to toggle
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bee Continuous Biometrics & Wearable Telemetry */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-400" />
            Bee Wearable Telemetry
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Continuous DSP</span>
        </div>

        {/* Biometrics Controls */}
        <div className="space-y-3 text-xs">
          {/* Heart Rate */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Heart className={`w-3 h-3 text-rose-400 ${hr > 100 ? 'animate-ping-slow' : ''}`} />
                Heart Rate (BPM)
              </span>
              <span className={`font-mono font-bold ${hr > 100 ? 'text-rose-400' : 'text-slate-200'}`}>
                {hr} bpm
              </span>
            </div>
            <input
              type="range"
              min="45"
              max="160"
              value={hr}
              onChange={(e) => setHr(Number(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* SpO2 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Wind className="w-3 h-3 text-cyan-400" />
                SpO2 Saturation (%)
              </span>
              <span className={`font-mono font-bold ${spo2 < 92 ? 'text-rose-400' : 'text-slate-200'}`}>
                {spo2}%
              </span>
            </div>
            <input
              type="range"
              min="85"
              max="100"
              value={spo2}
              onChange={(e) => setSpo2(Number(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Skin Temperature */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-amber-400" />
                Skin Temp (°C)
              </span>
              <span className={`font-mono font-bold ${temp > 37.8 ? 'text-amber-400' : 'text-slate-200'}`}>
                {temp}°C
              </span>
            </div>
            <input
              type="range"
              min="35.0"
              max="39.5"
              step="0.1"
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Accelerometer Impact Preset */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-400">Accelerometer Vector</span>
              <span className={`font-mono font-bold ${peakG > 3.0 ? 'text-rose-400' : 'text-slate-200'}`}>
                {peakG} G
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => triggerImpact(1.05, false)}
                className={`py-1 px-2 rounded text-[10px] font-mono border ${
                  peakG <= 1.2
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                1.0G Nominal
              </button>
              <button
                type="button"
                onClick={() => triggerImpact(2.1, false)}
                className={`py-1 px-2 rounded text-[10px] font-mono border ${
                  peakG > 1.5 && peakG < 3.0
                    ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                2.1G Stumble
              </button>
              <button
                type="button"
                onClick={() => triggerImpact(3.42, true)}
                className={`py-1 px-2 rounded text-[10px] font-mono border ${
                  peakG >= 3.0
                    ? 'border-rose-500 bg-rose-950/40 text-rose-300 animate-pulse'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                3.4G Hard Fall
              </button>
            </div>
          </div>

          {/* Fall Flag Toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className={`w-3.5 h-3.5 ${fall ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
              Fall Detected Flag
            </span>
            <button
              type="button"
              onClick={() => setFall(!fall)}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                fall ? 'bg-rose-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  fall ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Apply Updates Button */}
          <button
            onClick={handleUpdateWearable}
            disabled={updatingWearable}
            className="w-full mt-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{updatingWearable ? 'Broadcasting...' : 'Apply Biometric Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
