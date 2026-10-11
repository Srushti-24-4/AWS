import React, { useState, useEffect } from 'react';

/**
 * VoiceCommand component – captures spoken input using the Web Speech API
 * and forwards the transcript to the MCP backend as a custom `voice_command`
 * tool call. The backend can later route this to Gemini or any other service.
 */
const VoiceCommand = ({ onResult }) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  // Browser support check and SpeechRecognition instance creation
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  useEffect(() => {
    if (!recognition) {
      setError('Web Speech API not supported in this browser.');
      return;
    }
    // Configure recognition
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setTranscript(speechResult);
      // Forward to backend as a tool call
      sendVoiceCommand(speechResult);
    };

    recognition.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };
  }, []);

  const startListening = () => {
    if (recognition) {
      setError(null);
      setListening(true);
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && listening) {
      recognition.stop();
    }
  };

  const sendVoiceCommand = async (text) => {
    try {
      const token = localStorage.getItem('mcp_token'); // token handling already in App.jsx
      const response = await fetch('/mcp/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tool_name: 'voice_command',
          arguments: { command: text },
        }),
      });
      const data = await response.json();
      if (onResult) onResult(data);
    } catch (e) {
      console.error('Failed to send voice command:', e);
    }
  };

  return (
    <div className="voice-command">
      <button
        onClick={listening ? stopListening : startListening}
        className={`mic-btn ${listening ? 'listening' : ''}`}
        aria-pressed={listening}
        aria-label="Toggle voice command"
      >
        {listening ? '🔴 Stop' : '🎤 Speak'}
      </button>
      {transcript && <p className="transcript">You said: {transcript}</p>}
      {error && <p className="error" style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default VoiceCommand;
