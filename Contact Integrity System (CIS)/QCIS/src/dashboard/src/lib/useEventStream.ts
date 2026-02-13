// QwickServices CIS — Real-time Event Stream Hook
// Connects to the backend SSE endpoint and dispatches events to subscribers.

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface StreamEvent {
  id: string;
  type: string;
  timestamp: string;
  correlation_id: string;
  payload: Record<string, unknown>;
}

interface UseEventStreamOptions {
  /** JWT token for authentication */
  token: string | null;
  /** Optional event type filter (comma-separated) */
  eventTypes?: string[];
  /** Called for each incoming event */
  onEvent?: (event: StreamEvent) => void;
  /** Enable/disable the stream */
  enabled?: boolean;
}

export function useEventStream({ token, eventTypes, onEvent, enabled = true }: UseEventStreamOptions) {
  const [connected, setConnected] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    // Close existing connection
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    let url = `${API_BASE}/stream?token=${encodeURIComponent(token)}`;
    if (eventTypes && eventTypes.length > 0) {
      url += `&events=${encodeURIComponent(eventTypes.join(','))}`;
    }

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => {
      setConnected(true);
    };

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as StreamEvent;
        setLastEvent(data);
        setEventCount((c) => c + 1);
        onEventRef.current?.(data);
      } catch {
        // Ignore parse errors (heartbeats, connection events)
      }
    };

    source.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects, no manual retry needed
    };

    return source;
  }, [token, eventTypes, enabled]);

  useEffect(() => {
    const source = connect();
    return () => {
      source?.close();
      setConnected(false);
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setConnected(false);
  }, []);

  return { connected, eventCount, lastEvent, disconnect };
}
