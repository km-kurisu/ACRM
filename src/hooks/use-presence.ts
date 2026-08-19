"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PresenceStatus } from "@/lib/presence";

const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds
const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export function usePresence() {
  const [status, setStatus] = useState<PresenceStatus>("offline");
  const [lastActiveAt, setLastActiveAt] = useState<string | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch("/api/presence/heartbeat", { method: "POST" });
      lastInteractionRef.current = Date.now();
    } catch (error) {
      console.error("Heartbeat failed:", error);
    }
  }, []);

  const updateStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/presence");
      const data = await response.json();
      setStatus(data.status);
      setLastActiveAt(data.last_active_at);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  }, []);

  const handleActivity = useCallback(() => {
    lastInteractionRef.current = Date.now();
    sendHeartbeat();
  }, [sendHeartbeat]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      handleActivity();
    }
  }, [handleActivity]);

  useEffect(() => {
    // Set up activity listeners
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set up heartbeat interval
    heartbeatTimerRef.current = setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceLastInteraction < IDLE_TIMEOUT) {
        sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);

    // Set up idle detection
    idleTimerRef.current = setInterval(() => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      if (timeSinceLastInteraction >= IDLE_TIMEOUT && status !== "offline") {
        setStatus("inactive");
      }
    }, 60 * 1000); // Check every minute

    // Initial heartbeat and status fetch
    sendHeartbeat();
    updateStatus();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [handleActivity, handleVisibilityChange, sendHeartbeat, updateStatus, status]);

  return { status, lastActiveAt };
}
