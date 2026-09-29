"""Mock Telemetry and State Management for Ring Sensors and Bee Wearables.

Simulates ambient smart home telemetry for elderly care monitoring:
- Multi-room Ring PIR Motion sensors (kitchen, bathroom, bedroom, living room, hallway, front door)
- Bee Wearable biometrics (heart rate, SpO2, skin temp, 3-axis accelerometer, fall flag, battery)
- Circadian profile baselines for anomaly inference
- Dynamic scenario injection for live hackathon evaluation
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel, Field


class RingMotionEvent(BaseModel):
    """Event schema representing a simulated Ring motion sensor activation."""
    sensor_id: str
    room: str
    motion_state: str = Field(..., description="'ACTIVE' or 'INACTIVE'")
    timestamp: str
    duration_seconds: int = 15
    confidence: float = 0.98


class BeeWearableTelemetry(BaseModel):
    """Event schema representing Bee continuous biometric and inertial telemetry."""
    timestamp: str
    heart_rate_bpm: int = 72
    spo2_percent: int = 98
    skin_temp_c: float = 36.6
    step_count: int = 1420
    accelerometer_peak_g: float = 1.05
    fall_detected: bool = False
    battery_pct: int = 89


class ResidentProfile(BaseModel):
    """Clinical and behavioral circadian profile for resident anomaly baselining."""
    resident_id: str = "RES-8821"
    first_name: str = "Eleanor"
    age: int = 78
    medical_notes: List[str] = [
        "Hypertension (requires daily Lisinopril with morning tea before 09:00 AM)",
        "Mild Cognitive Impairment (prone to wandering or forgetting hydration)",
        "History of osteopenia (elevated fall risk)",
    ]
    circadian_baseline: Dict[str, Any] = {
        "wake_time": "07:30",
        "morning_bathroom_dwell_mins": 15,
        "kitchen_tea_routine": "08:15",
        "medication_cutoff": "09:00",
        "afternoon_rest": "14:00 - 15:30",
        "bedtime": "22:00",
    }
    caregiver: Dict[str, str] = {
        "name": "Dr. Sarah Vance (Daughter)",
        "relationship": "Primary Caregiver / Healthcare Proxy",
        "contact_phone": "+1-555-019-2831",
        "escalation_policy": "SMS on MEDIUM, Phone Call on HIGH/CRITICAL",
    }


class TelemetryStore:
    """Thread-safe state store for simulated ambient sensors and wearable streams."""

    def __init__(self) -> None:
        self.profile = ResidentProfile()
        self.lock = asyncio.Lock()
        self.subscribers: List[Callable[[Dict[str, Any]], None]] = []

        # Current sensor snapshot
        self.room_motion: Dict[str, Dict[str, Any]] = {
            "bedroom": {"state": "INACTIVE", "last_active": "07:35:00Z", "sensor_id": "ring_mot_bed_01"},
            "bathroom": {"state": "INACTIVE", "last_active": "07:55:00Z", "sensor_id": "ring_mot_bath_01"},
            "kitchen": {"state": "ACTIVE", "last_active": "08:22:00Z", "sensor_id": "ring_mot_kitch_01"},
            "living_room": {"state": "INACTIVE", "last_active": "08:10:00Z", "sensor_id": "ring_mot_liv_01"},
            "hallway": {"state": "INACTIVE", "last_active": "08:15:00Z", "sensor_id": "ring_mot_hall_01"},
            "front_door": {"state": "INACTIVE", "last_active": "Yesterday", "sensor_id": "ring_mot_entry_01"},
        }

        self.wearable = BeeWearableTelemetry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            heart_rate_bpm=72,
            spo2_percent=98,
            skin_temp_c=36.6,
            step_count=1840,
            accelerometer_peak_g=1.04,
            fall_detected=False,
            battery_pct=88,
        )

        self.motion_history: List[Dict[str, Any]] = []
        self.wearable_history: List[Dict[str, Any]] = []
        self.active_scenario: str = "nominal_morning"
        self._init_history()

    def _init_history(self) -> None:
        """Seed 60 minutes of nominal baseline history."""
        now = datetime.now(timezone.utc)
        self.motion_history.clear()
        self.wearable_history.clear()

        # Generate realistic chronological progression
        events = [
            (now - timedelta(minutes=55), "bedroom", "ACTIVE", 45),
            (now - timedelta(minutes=50), "hallway", "ACTIVE", 20),
            (now - timedelta(minutes=45), "bathroom", "ACTIVE", 900),  # 15 mins dwell
            (now - timedelta(minutes=25), "hallway", "ACTIVE", 30),
            (now - timedelta(minutes=20), "kitchen", "ACTIVE", 600),   # Tea prep
        ]

        for ts, room, state, dur in events:
            self.motion_history.append({
                "timestamp": ts.isoformat(),
                "sensor_id": self.room_motion.get(room, {}).get("sensor_id", f"ring_{room}"),
                "room": room,
                "motion_state": state,
                "duration_seconds": dur,
            })

        for i in range(12):
            ts = now - timedelta(minutes=i * 5)
            self.wearable_history.append({
                "timestamp": ts.isoformat(),
                "heart_rate_bpm": 70 + (i % 4),
                "spo2_percent": 98,
                "skin_temp_c": 36.6,
                "accelerometer_peak_g": 1.05 if i % 2 == 0 else 1.15,
                "fall_detected": False,
            })

    def subscribe(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Registers a callback to receive real-time state broadcast events."""
        self.subscribers.append(callback)

    def _broadcast(self, event_type: str, data: Any) -> None:
        payload = {
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data,
        }
        for cb in self.subscribers:
            try:
                cb(payload)
            except Exception:
                pass

    def record_motion(self, room: str, state: str, duration_sec: int = 15) -> Dict[str, Any]:
        """Records a new Ring sensor event and updates active room occupancy."""
        room_lower = room.lower()
        now_iso = datetime.now(timezone.utc).isoformat()

        if room_lower not in self.room_motion:
            self.room_motion[room_lower] = {
                "state": state,
                "last_active": now_iso,
                "sensor_id": f"ring_mot_{room_lower}_01",
            }
        else:
            self.room_motion[room_lower]["state"] = state
            if state == "ACTIVE":
                self.room_motion[room_lower]["last_active"] = now_iso

        event = {
            "sensor_id": self.room_motion[room_lower]["sensor_id"],
            "room": room_lower,
            "motion_state": state,
            "timestamp": now_iso,
            "duration_seconds": duration_sec,
            "confidence": 0.98,
        }
        self.motion_history.append(event)
        # Keep window bounded to last 200 events
        if len(self.motion_history) > 200:
            self.motion_history.pop(0)

        self._broadcast("sensor_motion", event)
        return event

    def update_wearable(
        self,
        heart_rate: Optional[int] = None,
        spo2: Optional[int] = None,
        skin_temp: Optional[float] = None,
        fall_detected: Optional[bool] = None,
        accelerometer_peak_g: Optional[float] = None,
    ) -> BeeWearableTelemetry:
        """Updates continuous Bee biometric telemetry."""
        now_iso = datetime.now(timezone.utc).isoformat()

        if heart_rate is not None:
            self.wearable.heart_rate_bpm = heart_rate
        if spo2 is not None:
            self.wearable.spo2_percent = spo2
        if skin_temp is not None:
            self.wearable.skin_temp_c = skin_temp
        if fall_detected is not None:
            self.wearable.fall_detected = fall_detected
        if accelerometer_peak_g is not None:
            self.wearable.accelerometer_peak_g = accelerometer_peak_g
        self.wearable.timestamp = now_iso

        snapshot = self.wearable.model_dump()
        self.wearable_history.append(snapshot)
        if len(self.wearable_history) > 200:
            self.wearable_history.pop(0)

        self._broadcast("wearable_telemetry", snapshot)
        return self.wearable

    def get_current_snapshot(self) -> Dict[str, Any]:
        """Synthesizes instant multi-modal ambient snapshot for Alexa+ MCP tools."""
        # Determine likely current room based on most recent ACTIVE sensor
        active_rooms = [r for r, d in self.room_motion.items() if d["state"] == "ACTIVE"]
        current_room = active_rooms[0] if active_rooms else "unknown (stationary / sleeping)"

        return {
            "snapshot_timestamp": datetime.now(timezone.utc).isoformat(),
            "resident": {
                "id": self.profile.resident_id,
                "first_name": self.profile.first_name,
                "age": self.profile.age,
                "current_room": current_room,
            },
            "room_motion_sensors": self.room_motion,
            "bee_wearable_vitals": self.wearable.model_dump(),
            "active_scenario": self.active_scenario,
        }

    def get_history(self, minutes: int = 60) -> Dict[str, Any]:
        """Retrieves chronological window of telemetry for Bedrock reasoning."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)
        filtered_motion = [
            m for m in self.motion_history
            if datetime.fromisoformat(m["timestamp"]) >= cutoff
        ]
        filtered_wearable = [
            w for w in self.wearable_history
            if datetime.fromisoformat(w["timestamp"]) >= cutoff
        ]
        return {
            "query_window_minutes": minutes,
            "motion_events": filtered_motion,
            "wearable_events": filtered_wearable,
            "resident_circadian_baseline": self.profile.circadian_baseline,
        }

    def load_scenario(self, scenario_name: str) -> Dict[str, Any]:
        """Loads a predetermined clinical scenario for hackathon evaluation."""
        self.active_scenario = scenario_name
        now = datetime.now(timezone.utc)

        if scenario_name == "nominal_morning":
            # Scenario 1: Normal Morning Routine
            self._init_history()
            for r in self.room_motion:
                self.room_motion[r]["state"] = "INACTIVE"
            self.room_motion["kitchen"]["state"] = "ACTIVE"
            self.room_motion["kitchen"]["last_active"] = now.isoformat()
            self.wearable = BeeWearableTelemetry(
                timestamp=now.isoformat(),
                heart_rate_bpm=72,
                spo2_percent=98,
                skin_temp_c=36.6,
                step_count=1840,
                accelerometer_peak_g=1.06,
                fall_detected=False,
                battery_pct=88,
            )

        elif scenario_name == "missed_kitchen_routine":
            # Scenario 2: Missed Morning Kitchen & Medication Routine
            # Resident woke up, went to bathroom, went back to bedroom/living room,
            # but has NOT entered the kitchen for 90+ minutes past expected 08:15 routine.
            self.motion_history.clear()
            self.motion_history.append({
                "timestamp": (now - timedelta(minutes=110)).isoformat(),
                "sensor_id": "ring_mot_bed_01",
                "room": "bedroom",
                "motion_state": "ACTIVE",
                "duration_seconds": 60,
            })
            self.motion_history.append({
                "timestamp": (now - timedelta(minutes=95)).isoformat(),
                "sensor_id": "ring_mot_bath_01",
                "room": "bathroom",
                "motion_state": "ACTIVE",
                "duration_seconds": 600,
            })
            self.motion_history.append({
                "timestamp": (now - timedelta(minutes=70)).isoformat(),
                "sensor_id": "ring_mot_liv_01",
                "room": "living_room",
                "motion_state": "ACTIVE",
                "duration_seconds": 120,
            })
            for r in self.room_motion:
                self.room_motion[r]["state"] = "INACTIVE"
            self.room_motion["living_room"]["state"] = "INACTIVE"
            self.room_motion["kitchen"]["state"] = "INACTIVE"
            self.room_motion["kitchen"]["last_active"] = (now - timedelta(hours=14)).isoformat()

            # Mild dehydration / sluggish biometrics
            self.wearable = BeeWearableTelemetry(
                timestamp=now.isoformat(),
                heart_rate_bpm=84,
                spo2_percent=96,
                skin_temp_c=36.4,
                step_count=320,
                accelerometer_peak_g=0.98,
                fall_detected=False,
                battery_pct=82,
            )

        elif scenario_name == "bathroom_fall_dwell":
            # Scenario 3: Night-time Bathroom Entry, 3.4G Impact Spike, and Prolonged Immobility
            self.motion_history.clear()
            self.motion_history.append({
                "timestamp": (now - timedelta(minutes=48)).isoformat(),
                "sensor_id": "ring_mot_bath_01",
                "room": "bathroom",
                "motion_state": "ACTIVE",
                "duration_seconds": 30,
            })
            for r in self.room_motion:
                self.room_motion[r]["state"] = "INACTIVE"
            self.room_motion["bathroom"]["state"] = "INACTIVE"
            self.room_motion["bathroom"]["last_active"] = (now - timedelta(minutes=48)).isoformat()

            # High impact spike 3.4G recorded 47 minutes ago, zero motion since, heart rate tachycardic
            self.wearable = BeeWearableTelemetry(
                timestamp=now.isoformat(),
                heart_rate_bpm=115,  # Stress / pain tachycardia
                spo2_percent=94,
                skin_temp_c=35.9,    # Peripheral cooling on floor
                step_count=210,
                accelerometer_peak_g=3.42,  # Hard fall threshold exceeded
                fall_detected=True,
                battery_pct=76,
            )

        elif scenario_name == "cardiovascular_drift":
            # Scenario 4: Resting Tachycardia & Hypoxia with Low Mobility
            for r in self.room_motion:
                self.room_motion[r]["state"] = "INACTIVE"
            self.room_motion["living_room"]["state"] = "ACTIVE"
            self.room_motion["living_room"]["last_active"] = now.isoformat()

            self.wearable = BeeWearableTelemetry(
                timestamp=now.isoformat(),
                heart_rate_bpm=118,  # Acute resting tachycardia
                spo2_percent=90,     # Hypoxic desaturation (<92%)
                skin_temp_c=38.2,    # Febrile spike
                step_count=450,
                accelerometer_peak_g=1.01,
                fall_detected=False,
                battery_pct=85,
            )

        snapshot = self.get_current_snapshot()
        self._broadcast("scenario_loaded", {"scenario": scenario_name, "snapshot": snapshot})
        return snapshot


# Singleton instance shared across FastAPI server
telemetry_store = TelemetryStore()
