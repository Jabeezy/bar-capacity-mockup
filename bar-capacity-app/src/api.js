const API_BASE = import.meta.env.VITE_API_URL || "https://bar-capacity-mockup-production.up.railway.app";

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