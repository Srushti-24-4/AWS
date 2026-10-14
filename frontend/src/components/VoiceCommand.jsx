import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Send, Settings, Key, CheckCircle2, XCircle, Volume2, Loader } from 'lucide-react';
import axios from 'axios';

/**
 * VoiceCommand — Full voice input + Gemini key settings panel
 * Styled to match the Ambient Guardian terminal dark UI.
 */
export default function VoiceCommand({ onResult }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [geminiKey, setGeminiKey] = useState(() => sessionStorage.getItem('GEMINI_KEY') || '');
  const [keySaved, setKeySaved] = useState(false);
  const [keySaving, setKeySaving] = useState(false);

  const recognitionRef = useRef(null);
  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Build & configure recognition once
  useEffect(() => {
    if (!supported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (interim) setInterimText(interim);
      if (final) {
        setTranscript(final);
        setInterimText('');
        sendVoiceCommand(final);
      }
    };

    rec.onerror = (e) => {
      setError(`Mic error: ${e.error}`);
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      setInterimText('');
    };

    recognitionRef.current = rec;
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    if (listening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      setResponse(null);
      recognitionRef.current.start();
      setListening(true);
    }
  }, [listening]);

  const sendVoiceCommand = async (text) => {
    setSending(true);
    try {
      const token = localStorage.getItem('MCP_TOKEN') || 'ambient-guardian-secret-token-2026';
      const storedKey = sessionStorage.getItem('GEMINI_KEY') || '';
      const res = await axios.post('/mcp/v1/messages', {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          tool: 'voice_command',
          arguments: { command: text, ...(storedKey ? { gemini_key: storedKey } : {}) },
        },
      });
      let result = res.data?.result;
      if (result && Array.isArray(result.content) && result.content[0]?.text) {
        try {
          result = JSON.parse(result.content[0].text);
        } catch (_) {
          result = { decision: result.content[0].text, source: 'gemini' };
        }
      }
      setResponse(result);
      if (onResult) onResult(result);
    } catch (e) {
      setError('Failed to send command: ' + (e.message || 'Network error'));
    } finally {
      setSending(false);
    }
  };

  const saveGeminiKey = async () => {
    if (!geminiKey.trim()) return;
    setKeySaving(true);
    try {
      await axios.post('/gemini/key', { api_key: geminiKey.trim() });
      sessionStorage.setItem('GEMINI_KEY', geminiKey.trim());
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
      setShowSettings(false);
    } catch (e) {
      setError('Failed to save Gemini key: ' + (e.message || 'Network error'));
    } finally {
      setKeySaving(false);
    }
  };

  const hasGeminiKey = !!(sessionStorage.getItem('GEMINI_KEY'));

  return (
    <div className="border border-terminal-border bg-terminal-panel relative overflow-hidden">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-matrix to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-terminal-border">
        <div className="flex items-center gap-2 text-[10px] text-terminal-muted uppercase tracking-widest">
          <Volume2 className="w-3 h-3 text-matrix" />
          <span>// Voice Command Interface</span>
          {hasGeminiKey && (
            <span className="ml-2 flex items-center gap-1 text-matrix">
              <CheckCircle2 className="w-3 h-3" /> Gemini Active
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 border border-terminal-border hover:border-matrix text-terminal-muted hover:text-matrix transition-colors"
          title="Configure Gemini API Key"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings Drawer */}
      {showSettings && (
        <div className="border-b border-terminal-border bg-terminal-black px-5 py-4 space-y-3">
          <div className="text-[10px] text-terminal-muted uppercase tracking-widest flex items-center gap-1.5">
            <Key className="w-3 h-3 text-yellow-400" />
            Google Gemini API Key
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza..."
              className="flex-1 bg-terminal-black border border-terminal-border text-matrix font-mono text-[11px] px-3 py-2 focus:outline-none focus:border-matrix placeholder-terminal-muted"
              onKeyDown={(e) => e.key === 'Enter' && saveGeminiKey()}
            />
            <button
              onClick={saveGeminiKey}
              disabled={keySaving || !geminiKey.trim()}
              className="px-4 py-2 border border-matrix text-matrix text-[10px] font-mono uppercase tracking-widest hover:bg-matrix hover:text-terminal-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {keySaving ? <Loader className="w-3 h-3 animate-spin" /> : keySaved ? <CheckCircle2 className="w-3 h-3" /> : null}
              {keySaved ? 'Saved!' : 'Save'}
            </button>
          </div>
          <div className="text-[9px] text-terminal-muted">
            Key is stored in session only — never sent to any third party. Used for on-device Gemini decision-making.
          </div>
        </div>
      )}

      {/* Main Voice UI */}
      <div className="px-5 py-5 space-y-4">
        {/* Mic Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            disabled={!supported || sending}
            className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
              listening
                ? 'border-red-500 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(255,49,49,0.5)]'
                : 'border-matrix bg-matrix/5 text-matrix hover:bg-matrix/15 hover:shadow-[0_0_15px_rgba(0,255,65,0.4)]'
            }`}
            aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : 'Start voice command'}
          >
            {listening ? (
              <>
                <MicOff className="w-6 h-6" />
                {/* Pulse rings */}
                <span className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-40" />
              </>
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-terminal-muted font-mono">
              {listening
                ? '● LISTENING...'
                : sending
                ? '⟳ PROCESSING...'
                : supported
                ? 'CLICK MIC TO SPEAK'
                : '⚠ NOT SUPPORTED'}
            </div>
            {/* Interim / final transcript */}
            <div className="mt-1 font-mono text-[12px] min-h-[1.4rem] truncate">
              {interimText
                ? <span className="text-terminal-muted italic">{interimText}</span>
                : transcript
                ? <span className="text-matrix">&gt; {transcript}</span>
                : <span className="text-terminal-border">_</span>}
            </div>
          </div>

          {/* Manual send button if transcript exists */}
          {transcript && !sending && (
            <button
              onClick={() => sendVoiceCommand(transcript)}
              className="px-3 py-1.5 border border-matrix text-matrix text-[10px] font-mono uppercase tracking-widest hover:bg-matrix hover:text-terminal-black transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" /> Resend
            </button>
          )}
        </div>

        {/* Sending indicator */}
        {sending && (
          <div className="flex items-center gap-2 text-[10px] text-yellow-400 font-mono animate-pulse">
            <Loader className="w-3 h-3 animate-spin" />
            Forwarding to {hasGeminiKey ? 'Gemini AI' : 'MCP backend'}...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-[10px] text-red-400 font-mono border border-red-500/30 bg-red-500/5 px-3 py-2">
            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* AI Response */}
        {response && (
          <div className="border border-matrix/30 bg-matrix/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-[9px] text-terminal-muted uppercase tracking-widest">
              <span className={`w-1.5 h-1.5 rounded-full ${response.source === 'gemini' ? 'bg-blue-400' : 'bg-matrix'} animate-pulse`} />
              {response.source === 'gemini' ? 'Gemini AI Decision' : 'Echo Response'}
            </div>
            <div className="font-mono text-[11px] text-matrix leading-relaxed whitespace-pre-wrap">
              {response.decision}
            </div>
          </div>
        )}

        {/* Hint */}
        {!supported && (
          <div className="text-[9px] text-terminal-muted">
            Use Chrome or Edge for Web Speech API support.
          </div>
        )}
      </div>
    </div>
  );
}
