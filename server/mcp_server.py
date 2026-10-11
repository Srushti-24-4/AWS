"""Project Ambient Guardian: MCP Server (Spec 2025-11-25) over Streamable HTTP/SSE.

Implements:
- Streamable HTTP Transport with Server-Sent Events (SSE) compliance for Alexa+.
- HTTP Bearer Token authentication on all /mcp/v1/* routes.
- Input sanitization and prompt injection defense on all tool arguments.
- Real-time event broadcasting for the multi-modal frontend simulator.
- Tools:
    1. get_ambient_status
    2. eval_anomaly_risk
    3. trigger_voice_nudge
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from typing import Any, AsyncGenerator, Dict, List, Optional
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel, Field

from server.security import (
    DEFAULT_MCP_TOKEN,
    SecurityValidationError,
    sanitize_tool_arguments,
    verify_bearer_token,
)
from server.mock_telemetry import telemetry_store
from server.aws_bedrock_agent import bedrock_agent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ambient_guardian.mcp")

# MCP Specification Constants
MCP_PROTOCOL_VERSION = "2025-11-25"
SERVER_NAME = "Project Ambient Guardian MCP Server"
SERVER_VERSION = "1.0.0"

app = FastAPI(
    title=SERVER_NAME,
    description="Proactive Context-Aware Health and Safety MCP Server for Alexa+ & AWS Bedrock",
    version=SERVER_VERSION,
)

# Enable CORS for Vite frontend simulator
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory log buffer and SSE broadcasters for the web simulator
simulator_subscribers: List[asyncio.Queue] = []
notification_subscribers: List[asyncio.Queue] = []
mcp_sessions: Dict[str, asyncio.Queue] = {}
recent_logs: List[Dict[str, Any]] = []


def broadcast_log(log_entry: Dict[str, Any]) -> None:
    """Dispatches a log event to connected frontend simulator SSE streams."""
    log_entry["id"] = str(uuid.uuid4())
    log_entry["timestamp"] = datetime.now(timezone.utc).isoformat()
    recent_logs.append(log_entry)
    if len(recent_logs) > 300:
        recent_logs.pop(0)

    for q in list(simulator_subscribers):
        try:
            q.put_nowait(log_entry)
        except Exception:
            pass


# Forward telemetry store events to simulator logs
def on_telemetry_event(event: Dict[str, Any]) -> None:
    broadcast_log({
        "direction": "TELEMETRY",
        "category": event.get("type", "telemetry"),
        "payload": event.get("data", {}),
    })

telemetry_store.subscribe(on_telemetry_event)


# ============================================================================
# TOOL DEFINITIONS (MCP Spec 2025-11-25)
# ============================================================================

MCP_TOOLS = [
    {
        "name": "get_ambient_status",
        "description": (
            "Retrieve the current multi-modal ambient snapshot including Ring motion sensors, "
            "room occupancy, and Bee wearable biometrics for the resident."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "include_wearable": {
                    "type": "boolean",
                    "description": "Whether to include real-time Bee biometric telemetry (HR, SpO2, temp).",
                    "default": True,
                },
                "history_window_minutes": {
                    "type": "integer",
                    "description": "Minutes of historical sensor activity to include for trend analysis.",
                    "default": 60,
                },
            },
        },
    },
    {
        "name": "eval_anomaly_risk",
        "description": (
            "Evaluates multi-modal ambient telemetry and biometric trends against circadian baselines "
            "using AWS Bedrock AgentCore to identify falls, inactivity, or routine deviations."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "focus_area": {
                    "type": "string",
                    "enum": ["overall_wellbeing", "fall_detection", "medication_adherence", "circadian_routine"],
                    "description": "Specific clinical or behavioral focus area for Bedrock assessment.",
                    "default": "overall_wellbeing",
                },
                "urgency_threshold": {
                    "type": "string",
                    "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                    "description": "Filter actions to only those meeting or exceeding this threshold.",
                    "default": "LOW",
                },
            },
        },
    },
    {
        "name": "trigger_voice_nudge",
        "description": (
            "Triggers a proactive, empathetic Alexa voice check-in script for the resident with "
            "optional caregiver notification escalation."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "resident_id": {
                    "type": "string",
                    "description": "Unique identifier of the resident (e.g. RES-8821).",
                    "default": "RES-8821",
                },
                "tone": {
                    "type": "string",
                    "enum": ["gentle", "inquisitive", "urgent", "emergency"],
                    "description": "Conversational tone of the Alexa+ voice utterance.",
                    "default": "gentle",
                },
                "custom_context": {
                    "type": "string",
                    "description": "Optional contextual prompt parameter explaining the trigger reason.",
                },
                "allow_escalation": {
                    "type": "boolean",
                    "description": "Whether to queue a notification to the primary caregiver if resident does not respond.",
                    "default": True,
                },
            },
            "required": ["resident_id"],
        },
    },
,
    {
        "name": "voice_command",
        "description": "Accepts spoken user input and optional Gemini API key, forwards to decision service.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Transcribed user speech."},
                "gemini_key": {"type": "string", "description": "Google Gemini API key supplied by the front‑end."}
            },
            "required": ["command"]
        }
    }
]


# ============================================================================
# TOOL EXECUTION HANDLERS
# ============================================================================

def handle_get_ambient_status(args: Dict[str, Any]) -> Dict[str, Any]:
    include_wearable = args.get("include_wearable", True)
    window = args.get("history_window_minutes", 60)

    snapshot = telemetry_store.get_current_snapshot()
    if not include_wearable:
        snapshot.pop("bee_wearable_vitals", None)

    history = telemetry_store.get_history(minutes=window)
    return {
        "status": "success",
        "snapshot": snapshot,
        "timeline_events_count": len(history.get("motion_events", [])),
    }


def handle_eval_anomaly_risk(args: Dict[str, Any]) -> Dict[str, Any]:
    focus = args.get("focus_area", "overall_wellbeing")
    threshold = args.get("urgency_threshold", "LOW")

    snapshot = telemetry_store.get_current_snapshot()
    history = telemetry_store.get_history(minutes=60)
    profile = telemetry_store.profile.model_dump()

    # Invoke AWS Bedrock AgentCore
    assessment = bedrock_agent.evaluate_telemetry(
        snapshot=snapshot,
        history=history,
        resident_profile=profile,
        focus_area=focus,
    )

    return {
        "status": "success",
        "assessment": assessment.model_dump(),
        "requires_intervention": assessment.anomaly_score >= 0.5,
    }


def handle_trigger_voice_nudge(args: Dict[str, Any]) -> Dict[str, Any]:
    resident_id = args.get("resident_id", "RES-8821")
    tone = args.get("tone", "gentle")
    context = args.get("custom_context")
    allow_escalation = args.get("allow_escalation", True)

    snapshot = telemetry_store.get_current_snapshot()
    scenario = snapshot.get("active_scenario", "nominal_morning")

    # Generate empathetic Alexa utterance based on tone and context
    prompts = {
        "gentle": f"Good morning Eleanor. I noticed you haven't made your morning tea yet. Are you feeling alright?",
        "inquisitive": f"Hi Eleanor, just checking in. I see you've been resting in the living room for a while. Need any water or help?",
        "urgent": f"Eleanor, this is Alexa. Your wearable detected an unusual reading. Please let me know if you can hear me.",
        "emergency": f"Eleanor! I detected an impact in the bathroom. Please say 'I'm okay' or tap the screen. Contacting Dr. Sarah Vance in 30 seconds.",
    }

    voice_prompt = context or prompts.get(tone, prompts["gentle"])
    escalation_queued = allow_escalation and tone in ["urgent", "emergency"]

    nudge_payload = {
        "resident_id": resident_id,
        "target_device": "Echo Show 10 (Living Room / Kitchen Ambient Hub)",
        "tone": tone,
        "voice_script": voice_prompt,
        "screen_display_text": voice_prompt,
        "action_buttons": ["I'm Okay", "I Need Assistance", "Snooze 10m"],
        "caregiver_escalation_queued": escalation_queued,
        "escalation_contacts": telemetry_store.profile.escalation_contacts if escalation_queued else [],
        "dispatched_at": datetime.now(timezone.utc).isoformat(),
    }

    # Broadcast to simulator so frontend Echo display immediately reacts
    broadcast_log({
        "direction": "ALEXA_PROACTIVE_NUDGE",
        "category": "voice_nudge",
        "payload": nudge_payload,
    })

    return {"status": "dispatched", "nudge": nudge_payload}


# Module-level Gemini API key (set via POST /gemini/key)
GEMINI_API_KEY: Optional[str] = None


def handle_voice_command(args: Dict[str, Any]) -> Dict[str, Any]:
    """Handle spoken user commands, forwarding to Gemini for decision-making if key available."""
    command = args.get("command", "").strip()
    # Accept key passed inline from frontend, or fall back to globally stored one
    gemini_key = args.get("gemini_key") or GEMINI_API_KEY

    broadcast_log({
        "direction": "VOICE_COMMAND",
        "category": "user_voice",
        "payload": {"command": command, "gemini_active": bool(gemini_key)},
    })

    if not command:
        return {"status": "error", "message": "Empty voice command received."}

    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            system_ctx = (
                "You are an AI health safety assistant for an elderly resident named Eleanor Vance (age 78). "
                "She has hypertension, mild cognitive impairment, and elevated fall risk. "
                "When her caregiver or a family member gives a voice command, analyse it and respond with: "
                "1) A plain-English summary of what action to take, and 2) Whether to trigger a voice nudge "
                "(NUDGE: YES/NO) and at what tone (gentle/inquisitive/urgent/emergency). "
                "Keep the response under 100 words."
            )
            response = model.generate_content(f"{system_ctx}\n\nVoice command: {command}")
            decision = response.text.strip()
            broadcast_log({
                "direction": "GEMINI_DECISION",
                "category": "ai_decision",
                "payload": {"command": command, "decision": decision},
            })
            return {"status": "success", "source": "gemini", "command": command, "decision": decision}
        except Exception as exc:
            logger.error("Gemini API error: %s", exc)
            return {"status": "error", "source": "gemini", "message": str(exc)}
    else:
        # No Gemini key — echo the command back with a placeholder
        placeholder = (
            f"Received: '{command}'. "
            "Gemini key not configured — add your key via Settings to enable AI decision-making."
        )
        return {"status": "success", "source": "echo", "command": command, "decision": placeholder}


def dispatch_tool(tool_name: str, arguments: Dict[str, Any]) -> Any:
    """Dispatches execution to the corresponding tool handler."""
    if tool_name == "get_ambient_status":
        return handle_get_ambient_status(arguments)
    elif tool_name == "eval_anomaly_risk":
        return handle_eval_anomaly_risk(arguments)
    elif tool_name == "trigger_voice_nudge":
        return handle_trigger_voice_nudge(arguments)
    elif tool_name == "voice_command":
        return handle_voice_command(arguments)
    else:
        raise ValueError(f"Unknown MCP tool: '{tool_name}'")


# ============================================================================
# MCP SPEC 2025-11-25 STREAMABLE HTTP / SSE ENDPOINTS
# ============================================================================

@app.get("/mcp/v1/sse")
async def mcp_sse_endpoint(
    request: Request,
    token: str = Depends(verify_bearer_token),
) -> EventSourceResponse:
    """Initiates an MCP Streamable HTTP session via Server-Sent Events (SSE).

    Conforming to MCP Spec 2025-11-25:
    1. Generates a unique sessionId.
    2. Emits an initial 'endpoint' event containing the POST URI.
    3. Keeps the connection open for server-to-client notifications.
    """
    session_id = str(uuid.uuid4())
    session_queue: asyncio.Queue = asyncio.Queue()
    mcp_sessions[session_id] = session_queue

    logger.info("New MCP Streamable HTTP SSE session opened: %s", session_id)
    broadcast_log({
        "direction": "INCOMING_SSE_CONNECT",
        "category": "mcp_connection",
        "sessionId": session_id,
        "payload": {"status": "connected", "protocol": MCP_PROTOCOL_VERSION},
    })

    async def event_generator() -> AsyncGenerator[Dict[str, str], None]:
        try:
            # 1. First event required by MCP HTTP Streamable spec: 'endpoint'
            post_endpoint = f"/mcp/v1/messages?sessionId={session_id}"
            yield {
                "event": "endpoint",
                "data": post_endpoint,
            }

            # 2. Stream subsequent messages or keep-alives
            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Wait for message in session queue or heartbeat
                    message = await asyncio.wait_for(session_queue.get(), timeout=15.0)
                    yield {
                        "event": "message",
                        "data": json.dumps(message),
                    }
                except asyncio.TimeoutError:
                    # Heartbeat comment to keep HTTP connection alive
                    yield {
                        "comment": f"keepalive {datetime.now(timezone.utc).isoformat()}",
                    }
        finally:
            mcp_sessions.pop(session_id, None)
            logger.info("MCP SSE session closed: %s", session_id)

    return EventSourceResponse(event_generator())


@app.post("/mcp/v1/messages")
async def mcp_messages_endpoint(
    request: Request,
    sessionId: Optional[str] = Query(None),
    token: str = Depends(verify_bearer_token),
) -> JSONResponse:
    """Processes incoming JSON-RPC 2.0 messages from Alexa+ or MCP clients.

    Handles:
    - 'initialize'
    - 'notifications/initialized'
    - 'tools/list'
    - 'tools/call'
    - 'ping'
    """
    try:
        body = await request.json()
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": f"Parse error: {e}"}},
        )

    req_id = body.get("id")
    method = body.get("method")
    params = body.get("params", {})

    broadcast_log({
        "direction": "INCOMING_JSON_RPC",
        "sessionId": sessionId,
        "method": method,
        "id": req_id,
        "payload": body,
    })

    # 1. PING
    if method == "ping":
        response = {"jsonrpc": "2.0", "id": req_id, "result": {}}
        return JSONResponse(content=response)

    # 2. INITIALIZE
    if method == "initialize":
        client_version = params.get("protocolVersion", "unknown")
        response = {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": {
                    "tools": {"listChanged": True},
                    "logging": {},
                },
                "serverInfo": {
                    "name": SERVER_NAME,
                    "version": SERVER_VERSION,
                },
                "instructions": (
                    "Project Ambient Guardian provides context-aware elderly care tools for Alexa+. "
                    "Use get_ambient_status for sensor snapshot, eval_anomaly_risk for Bedrock analysis, "
                    "and trigger_voice_nudge for proactive speech output."
                ),
            },
        }
        broadcast_log({
            "direction": "OUTGOING_JSON_RPC",
            "sessionId": sessionId,
            "method": method,
            "id": req_id,
            "payload": response,
        })
        return JSONResponse(content=response)

    # 3. NOTIFICATIONS / INITIALIZED
    if method == "notifications/initialized":
        # Client acknowledges initialization; no response needed for JSON-RPC notification
        return JSONResponse(content={"jsonrpc": "2.0", "result": "acknowledged"})

    # 4. TOOLS/LIST
    if method == "tools/list":
        response = {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": MCP_TOOLS,
            },
        }
        broadcast_log({
            "direction": "OUTGOING_JSON_RPC",
            "sessionId": sessionId,
            "method": method,
            "id": req_id,
            "payload": response,
        })
        return JSONResponse(content=response)

    # 5. TOOLS/CALL
    if method == "tools/call":
        tool_name = params.get("name")
        raw_args = params.get("arguments", {})

        # Security check: Sanitize tool arguments against Prompt Injection & Jailbreaks
        try:
            sanitized_args = sanitize_tool_arguments(raw_args)
        except SecurityValidationError as sec_err:
            logger.warning("Prompt injection defense blocked tool execution: %s", sec_err.detail)
            error_response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32602,
                    "message": f"Security validation rejected arguments: {sec_err.detail}",
                },
            }
            broadcast_log({
                "direction": "SECURITY_ALERT",
                "sessionId": sessionId,
                "method": method,
                "id": req_id,
                "payload": error_response,
            })
            return JSONResponse(status_code=400, content=error_response)

        start_time = time.time()
        try:
            tool_output = dispatch_tool(tool_name, sanitized_args)
            latency_ms = int((time.time() - start_time) * 1000)

            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(tool_output, indent=2),
                        }
                    ],
                    "isError": False,
                    "_metadata": {
                        "execution_time_ms": latency_ms,
                        "tool": tool_name,
                    },
                },
            }
            broadcast_log({
                "direction": "OUTGOING_JSON_RPC",
                "sessionId": sessionId,
                "method": method,
                "id": req_id,
                "tool": tool_name,
                "execution_ms": latency_ms,
                "payload": response,
            })
            return JSONResponse(content=response)

        except Exception as ex:
            logger.error("Error executing tool %s: %s", tool_name, ex, exc_info=True)
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": f"Error executing tool: {str(ex)}"}],
                    "isError": True,
                },
            }
            return JSONResponse(content=response)

    # Unknown method
    return JSONResponse(
        status_code=400,
        content={
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Method '{method}' not found"},
        },
    )


# ============================================================================
# SIMULATOR & DEMO API ENDPOINTS (FOR REACT FRONTEND)
# ============================================================================

@app.get("/api/simulator/logs/sse")
async def simulator_logs_sse(request: Request) -> EventSourceResponse:
    """Streams live MCP traffic and sensor events to the React frontend."""
    queue: asyncio.Queue = asyncio.Queue()
    simulator_subscribers.append(queue)

    async def log_generator() -> AsyncGenerator[Dict[str, str], None]:
        try:
            # Yield cached recent logs first
            for item in recent_logs[-20:]:
                yield {"event": "log", "data": json.dumps(item)}

            while True:
                if await request.is_disconnected():
                    break
                try:
                    entry = await asyncio.wait_for(queue.get(), timeout=10.0)
                    yield {"event": "log", "data": json.dumps(entry)}
                except asyncio.TimeoutError:
                    yield {"comment": "ping"}
        finally:
            if queue in simulator_subscribers:
                simulator_subscribers.remove(queue)

    return EventSourceResponse(log_generator())


@app.get("/api/simulator/state")
async def get_simulator_state() -> Dict[str, Any]:
    """Returns current multi-modal ambient snapshot for the frontend."""
    return {
        "status": "online",
        "mcp_version": MCP_PROTOCOL_VERSION,
        "bedrock_model": bedrock_agent.model_id,
        "is_bedrock_mock": bedrock_agent.client is None,
        "snapshot": telemetry_store.get_current_snapshot(),
        "resident_profile": telemetry_store.profile.model_dump(),
        "available_scenarios": [
            {
                "id": "nominal_morning",
                "title": "Scenario 1: Nominal Morning Routine",
                "description": "Resident wake-up, bathroom visit, and kitchen tea prep within circadian window.",
                "urgency": "NOMINAL",
            },
            {
                "id": "missed_kitchen_routine",
                "title": "Scenario 2: Missed Kitchen & Meds",
                "description": "Awake for 90+ minutes without entering kitchen; missed Lisinopril medication cutoff.",
                "urgency": "MEDIUM",
            },
            {
                "id": "bathroom_fall_dwell",
                "title": "Scenario 3: Night Fall & Dwell",
                "description": "3.42G impact in bathroom at 02:15, 45+ mins no motion, acute tachycardia (115 bpm).",
                "urgency": "CRITICAL",
            },
            {
                "id": "cardiovascular_drift",
                "title": "Scenario 4: Cardiovascular Drift",
                "description": "Resting tachycardia (118 bpm), SpO2 90% desaturation, low mobility in living room.",
                "urgency": "HIGH",
            },
        ],
    }


class ScenarioRequest(BaseModel):
    scenario_id: str


@app.post("/api/simulator/scenario")
async def set_simulator_scenario(req: ScenarioRequest) -> Dict[str, Any]:
    """Loads a clinical preset scenario."""
    snapshot = telemetry_store.load_scenario(req.scenario_id)
    return {"status": "scenario_loaded", "active_scenario": req.scenario_id, "snapshot": snapshot}


class MotionToggleRequest(BaseModel):
    room: str
    state: str  # 'ACTIVE' or 'INACTIVE'


@app.post("/api/simulator/toggle-motion")
async def toggle_motion(req: MotionToggleRequest) -> Dict[str, Any]:
    """Manually triggers a simulated Ring motion sensor in a room."""
    event = telemetry_store.record_motion(req.room, req.state)
    return {"status": "ok", "event": event}


class BiometricUpdateRequest(BaseModel):
    heart_rate: Optional[int] = None
    spo2: Optional[int] = None
    skin_temp: Optional[float] = None
    fall_detected: Optional[bool] = None
    accelerometer_g: Optional[float] = None


@app.post("/api/simulator/update-wearable")
async def update_wearable(req: BiometricUpdateRequest) -> Dict[str, Any]:
    """Manually updates simulated Bee wearable biometrics."""
    res = telemetry_store.update_wearable(
        heart_rate=req.heart_rate,
        spo2=req.spo2,
        skin_temp=req.skin_temp,
        fall_detected=req.fall_detected,
        accelerometer_peak_g=req.accelerometer_g,
    )
    return {"status": "ok", "wearable": res.model_dump()}


class ResidentResponseRequest(BaseModel):
    response_text: str


@app.post("/api/simulator/resident-response")
async def submit_resident_response(req: ResidentResponseRequest) -> Dict[str, Any]:
    """Simulates the resident speaking back to Alexa+ in response to a proactive nudge."""
    broadcast_log({
        "direction": "RESIDENT_VOICE_INPUT",
        "category": "voice_response",
        "payload": {
            "utterance": req.response_text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    })
    return {"status": "received", "utterance": req.response_text}


class TriggerToolSimulationRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)


@app.post("/api/simulator/call-tool")
async def simulate_tool_call(req: TriggerToolSimulationRequest) -> Dict[str, Any]:
    """Allows the web frontend to execute an MCP tool directly as if Alexa+ invoked it."""
    # Validate through security defense
    sanitized = sanitize_tool_arguments(req.arguments)
    start_time = time.time()
    output = dispatch_tool(req.tool_name, sanitized)
    elapsed = int((time.time() - start_time) * 1000)

    simulated_rpc = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": req.tool_name, "arguments": sanitized},
        "response": output,
        "elapsed_ms": elapsed,
    }
    broadcast_log({
        "direction": "SIMULATED_ALEXA_TOOL_CALL",
        "category": "tool_execution",
        "tool": req.tool_name,
        "execution_ms": elapsed,
        "payload": simulated_rpc,
    })
    return {"status": "success", "result": output, "elapsed_ms": elapsed}


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": SERVER_NAME,
        "version": SERVER_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
