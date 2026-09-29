import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  AlertTriangle, 
  PhoneCall, 
  User, 
  Sparkles, 
  Send, 
  BrainCircuit, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  ShieldCheck,
  Radio
} from 'lucide-react';

export default function AlexaVoiceSimulator({ state, recentNudge, onSendResponse }) {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [residentInput, setResidentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCoT, setShowCoT] = useState(false);
  const [interactionHistory, setInteractionHistory] = useState([]);

  const profile = state?.resident_profile || {};
  const caregiver = profile.caregiver || {};
  const activeScenario = state?.snapshot?.active_scenario;

  // Track latest nudge
  useEffect(() => {
    if (recentNudge) {
      setInteractionHistory(prev => {
        // avoid duplicate insertion of exact same nudge
        if (prev.length > 0 && prev[prev.length - 1].script === recentNudge.voice_script) {
          return prev;
        }
        return [
          ...prev,
          {
            type: 'alexa',
            tone: recentNudge.tone || 'gentle',
            script: recentNudge.voice_script || recentNudge.screen_display_text,
            timestamp: new Date().toLocaleTimeString(),
            escalation: recentNudge.caregiver_escalation_queued,
          },
        ];
      });

      // Browser TTS audio playback if enabled
      if (ttsEnabled && 'speechSynthesis' in window && recentNudge.voice_script) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(recentNudge.voice_script);
          utterance.rate = 0.95;
          utterance.pitch = 1.05;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('TTS error:', e);
        }
      }
    }
  }, [recentNudge, ttsEnabled]);

  const handleSendUtterance = async (textToSend) => {
    const text = textToSend || residentInput;
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      setInteractionHistory(prev => [
        ...prev,
        {
          type: 'resident',
          script: text,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      await onSendResponse(text);
      setResidentInput('');
    } catch (e) {
      console.error('Error submitting response:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // Determine ambient light ring color based on urgency or scenario
  const isEmergency = activeScenario === 'bathroom_fall_dwell';
  const isHighRisk = activeScenario === 'cardiovascular_drift';
  const isMediumRisk = activeScenario === 'missed_kitchen_routine';

  const ringGlowClass = isEmergency
    ? 'border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.6)] animate-pulse'
    : isHighRisk
    ? 'border-orange-500 shadow-[0_0_35px_rgba(249,115,22,0.5)] animate-pulse'
    : isMediumRisk
    ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)]'
    : 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)]';

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-y-auto p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-base font-semibold uppercase tracking-wider text-slate-200">
            Alexa+ Ambient Voice Hub
          </h2>
        </div>
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs border font-medium transition-all ${
            ttsEnabled
              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
          title="Enable Browser Text-to-Speech"
        >
          {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{ttsEnabled ? 'Voice TTS Active' : 'TTS Muted'}</span>
        </button>
      </div>

      {/* Echo Show 10 Ambient Device Mockup */}
      <div className={`relative rounded-2xl bg-slate-950 p-4 border-2 transition-all duration-700 ${ringGlowClass}`}>
        {/* Device Status Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping-slow" />
            <span className="font-semibold text-slate-300">Echo Show 10</span>
            <span className="text-slate-500">• Living Room Hub</span>
          </div>
          <span className="font-mono text-cyan-400 font-medium">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Ambient Display Screen */}
        <div className="py-4 min-h-[160px] flex flex-col justify-center items-center text-center space-y-2">
          {recentNudge ? (
            <>
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs uppercase font-bold tracking-wider text-cyan-300">
                  Proactive Ambient Nudge ({recentNudge.tone || 'gentle'})
                </span>
              </div>
              <p className="text-sm font-medium text-slate-100 max-w-sm px-2 leading-relaxed">
                "{recentNudge.voice_script || recentNudge.screen_display_text}"
              </p>
            </>
          ) : (
            <div className="text-center text-slate-500 text-xs py-6">
              <Mic className="w-6 h-6 mx-auto mb-2 opacity-40 text-cyan-400" />
              <span>Ambient Guardian is listening passively for routines & safety.</span>
              <p className="text-[10px] text-slate-600 mt-1">
                Trigger a scenario on the left or test a tool to see proactive nudges.
              </p>
            </div>
          )}
        </div>

        {/* Ambient Ring Glow Accent Strip */}
        <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded-full opacity-80" />
      </div>

      {/* Simulated Resident Voice Interaction */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-4 h-4 text-emerald-400" />
          Simulate Resident Response (Eleanor)
        </span>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5">
          {[
            "I'm okay, just reading in the living room.",
            "I'm feeling a little dizzy, can you call Sarah?",
            "Heading to the kitchen for tea right now.",
            "Help, I slipped in the bathroom!",
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendUtterance(prompt)}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-full transition-all text-left"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            placeholder="Type resident voice response..."
            value={residentInput}
            onChange={(e) => setResidentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendUtterance()}
            className="flex-1 bg-slate-900 border border-slate-800 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => handleSendUtterance()}
            disabled={submitting || !residentInput.trim()}
            className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50"
            title="Speak response to Alexa"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bedrock Clinical Assessment Summary Card */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            AWS Bedrock AgentCore Triage
          </span>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-800 px-1.5 py-0.5 rounded">
            Claude 3.5 Sonnet v2
          </span>
        </div>

        {/* Risk meter */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Contextual Anomaly Score</span>
            <span className="font-mono font-bold text-slate-200">
              {isEmergency ? '94% (CRITICAL)' : isHighRisk ? '81% (HIGH)' : isMediumRisk ? '72% (MEDIUM)' : '8% (NOMINAL)'}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isEmergency
                  ? 'bg-rose-500 w-[94%]'
                  : isHighRisk
                  ? 'bg-orange-500 w-[81%]'
                  : isMediumRisk
                  ? 'bg-amber-400 w-[72%]'
                  : 'bg-emerald-500 w-[8%]'
              }`}
            />
          </div>
        </div>

        {/* Findings breakdown */}
        <div className="text-[11px] space-y-1 pt-1 text-slate-300">
          <div className="flex items-start space-x-1.5">
            <span className="text-slate-500 w-24 flex-shrink-0">Circadian Check:</span>
            <span className="text-slate-300">
              {isEmergency
                ? 'Bathroom dwell > 45 mins at 02:15 AM'
                : isMediumRisk
                ? 'Kitchen inactive 95m past 08:15 routine'
                : 'Routine waking & kitchen transition aligned'}
            </span>
          </div>
          <div className="flex items-start space-x-1.5">
            <span className="text-slate-500 w-24 flex-shrink-0">Vitals Stability:</span>
            <span className="text-slate-300">
              {isEmergency
                ? 'Stress Tachycardia (115 bpm) + 3.42G impact'
                : isHighRisk
                ? 'Tachycardia (118 bpm) + SpO2 90% desaturation'
                : 'Stable resting vitals (72 bpm, 98% SpO2)'}
            </span>
          </div>
        </div>

        {/* Chain of thought toggle */}
        <button
          onClick={() => setShowCoT(!showCoT)}
          className="w-full text-left pt-2 flex items-center justify-between text-[11px] text-purple-400 hover:text-purple-300"
        >
          <span>View Bedrock Reasoning Chain</span>
          {showCoT ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showCoT && (
          <div className="p-2.5 bg-slate-900 rounded border border-purple-950 text-[10px] text-slate-300 font-mono space-y-1.5 leading-relaxed">
            <p className="text-purple-300 font-semibold">Sensor Fusion & Clinical Synthesis:</p>
            <p>1. Ingested 60-min sliding window from Ring PIR sensors and Bee continuous biometric telemetry.</p>
            <p>2. Evaluated against resident Eleanor Vance's circadian baseline (08:15 AM tea & Lisinopril medication window).</p>
            <p>3. Applied differential diagnostics: checked for accidental phone-down vs hard fall using 3-axis accelerometer and heart rate delta.</p>
            <p>4. Recommended empathetic proactive voice nudge via closest Echo device with caregiver SMS escalation policy.</p>
          </div>
        )}
      </div>

      {/* Caregiver Escalation Status Card */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <PhoneCall className="w-4 h-4 text-cyan-400" />
            Caregiver Escalation Tier
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              isEmergency
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isEmergency ? 'ESCALATION QUEUED' : 'STANDBY'}
          </span>
        </div>

        <div className="text-[11px] space-y-1 text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-500">Designated Contact:</span>
            <span className="font-semibold text-slate-200">{caregiver.name || 'Dr. Sarah Vance (Daughter)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Phone:</span>
            <span className="font-mono text-cyan-400">{caregiver.contact_phone || '+1-555-019-2831'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Policy:</span>
            <span className="text-slate-400">SMS on Medium, Automated Call on Critical</span>
          </div>
        </div>
      </div>
    </div>
  );
}
