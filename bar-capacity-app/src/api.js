const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function saveShift({ venue, closedBy, peakCount, closingCount, entries }) {
  const res = await fetch(`${API_BASE}/api/shifts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      venue,
      closedBy,
      peakCount,
      closingCount,
      entries: entries.map((e) => ({
        name: e.name,
        delta: e.delta,
        time: e.time instanceof Date ? e.time.toISOString() : e.time,
      })),
    }),
  });
  if (!res.ok) throw new Error("Failed to save shift");
  return res.json();
}

export async function fetchShifts(limit = 30) {
  const res = await fetch(`${API_BASE}/api/shifts?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch shifts");
  return res.json();
}

// --- Live, shared shift-in-progress state (polled by every door device) ---

export async function fetchLiveState() {
  const res = await fetch(`${API_BASE}/api/live`);
  if (!res.ok) throw new Error("Failed to fetch live state");
  return res.json();
}

export async function addLiveEntry({ name, delta }) {
  const res = await fetch(`${API_BASE}/api/live/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, delta }),
  });
  if (!res.ok) throw new Error("Failed to record entry");
  return res.json();
}

export async function undoLatestLiveEntry() {
  const res = await fetch(`${API_BASE}/api/live/entries/latest`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to undo entry");
  return res.json();
}

export async function resetLiveShift({ venue, closedBy }) {
  const res = await fetch(`${API_BASE}/api/live/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ venue, closedBy }),
  });
  if (!res.ok) throw new Error("Failed to reset shift");
  return res.json();
}

// Real-time push of the shared live state via Server-Sent Events — every
// connected device gets updated the instant anyone adds/removes/undoes/
// resets, no polling required. Returns an unsubscribe function.
export function subscribeLiveState({ onMessage, onError, onOpen }) {
  const source = new EventSource(`${API_BASE}/api/live/stream`);

  source.onopen = () => {
    onOpen?.();
  };

  source.onmessage = (event) => {
    try {
      const liveState = JSON.parse(event.data);
      onMessage(liveState);
    } catch (err) {
      console.error("Bad live-state payload", err);
    }
  };

  source.onerror = (err) => {
    // EventSource retries the connection on its own — this just surfaces
    // the "we're momentarily disconnected" state to the UI.
    onError?.(err);
  };

  return () => source.close();
}