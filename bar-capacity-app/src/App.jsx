import React, { useState, useEffect, useRef } from "react";
import {
  fetchShifts,
  fetchLiveState,
  addLiveEntry,
  undoLatestLiveEntry,
  resetLiveShift,
  subscribeLiveState,
} from "./api.js";

// Backup poll in case the live stream silently drops without firing an
// error event — rare, but cheap insurance. The stream itself is what
// gives near-instant updates.
const LIVE_SAFETY_POLL_MS = 20000;

const MAX_CAPACITY = 200;
const ADD_STAFF_NAME = "Name 1"; // attributed on every "+ Add people" tap
const REMOVE_STAFF_NAME = "Name 2"; // attributed on every "− Remove people" tap
const VENUE_NAME = "The Compass";

function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function stateForPercent(pct) {
  if (pct >= 90) return { label: "At Capacity", color: "#D9483D" };
  if (pct >= 70) return { label: "Near Capacity", color: "#D99A3D" };
  return { label: "Comfortable", color: "#4C9F6E" };
}

function DoorScreen() {
  // count/peak/log all come from the shared backend, not local-only state —
  // every device polls the same live shift so two bouncers on two phones
  // see the same running number.
  const [count, setCount] = useState(0);
  const [peak, setPeak] = useState(0);
  const [log, setLog] = useState([]);
  const [mode, setMode] = useState("add");
  const [custom, setCustom] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const inFlight = useRef(false); // guards against a poll landing mid-action and clobbering it

  const pct = Math.min(100, Math.round((count / MAX_CAPACITY) * 100));
  const state = stateForPercent(pct);

  function applyLiveState(liveState) {
    setCount(liveState.count);
    setPeak(liveState.peak);
    setLog(liveState.entries);
  }

  async function refreshLive() {
    if (inFlight.current) return;
    try {
      const liveState = await fetchLiveState();
      applyLiveState(liveState);
      setSyncError(null);
    } catch (err) {
      console.error(err);
      setSyncError("Can't reach the server — showing the last known count.");
    }
  }

  useEffect(() => {
    // Real-time push instead of polling — every device gets the update the
    // instant anyone taps, and idle devices cost the server nothing (no
    // repeated requests). Falls back to a slow safety-net poll in case the
    // stream drops without a clean error.
    const unsubscribe = subscribeLiveState({
      onMessage: (liveState) => {
        applyLiveState(liveState);
        setSyncError(null);
      },
      onError: () => setSyncError("Live sync lost — reconnecting…"),
      onOpen: () => setSyncError(null),
    });
    const safetyNet = setInterval(refreshLive, LIVE_SAFETY_POLL_MS);
    return () => {
      unsubscribe();
      clearInterval(safetyNet);
    };
  }, []);

  useEffect(() => {
    if (!confirmingReset) return;
    const t = setTimeout(() => setConfirmingReset(false), 3000);
    return () => clearTimeout(t);
  }, [confirmingReset]);

  async function applyDelta(amount) {
    const signed = mode === "add" ? amount : -amount;
    const staffName = mode === "add" ? ADD_STAFF_NAME : REMOVE_STAFF_NAME;
    inFlight.current = true;
    // Optimistic update so the person tapping sees an instant response;
    // gets confirmed (or corrected) by the real server push a moment later.
    setCount((c) => Math.max(0, c + signed));
    try {
      const liveState = await addLiveEntry({ name: staffName, delta: signed });
      applyLiveState(liveState);
      setSyncError(null);
    } catch (err) {
      console.error(err);
      setSyncError("Couldn't sync that tap — reconnecting…");
      refreshLive();
    } finally {
      inFlight.current = false;
    }
  }

  function applyCustom() {
    const n = parseInt(custom, 10);
    if (!n || n <= 0) return;
    applyDelta(n);
    setCustom("");
  }

  async function undoLast() {
    if (log.length === 0) return;
    inFlight.current = true;
    try {
      const liveState = await undoLatestLiveEntry();
      applyLiveState(liveState);
      setSyncError(null);
    } catch (err) {
      console.error(err);
      setSyncError("Couldn't undo — reconnecting…");
      refreshLive();
    } finally {
      inFlight.current = false;
    }
  }

  async function resetShift() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    setConfirmingReset(false);
    setSaving(true);
    setSaveError(null);
    inFlight.current = true;
    try {
      // Whoever is in the active mode at the moment of reset is recorded as
      // closing the shift.
      const closedBy = mode === "add" ? ADD_STAFF_NAME : REMOVE_STAFF_NAME;
      await resetLiveShift({ venue: VENUE_NAME, closedBy });
      setCount(0);
      setPeak(0);
      setLog([]);
    } catch (err) {
      console.error(err);
      setSaveError("Couldn't save shift — check your connection and try again.");
    } finally {
      setSaving(false);
      inFlight.current = false;
    }
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          padding: "18px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #1E212A",
        }}
      >
        <div>
          <div style={{ color: "#F2F0EA", fontWeight: 600, fontSize: 15 }}>
            {VENUE_NAME}
          </div>
          <div style={{ color: "#6B7080", fontSize: 12, marginTop: 2 }}>
            Door count
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#1C2029",
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid #262A34",
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "#4C9F6E",
            }}
          />
          <span style={{ color: "#C9CCD3", fontSize: 13, fontWeight: 500 }}>
            {mode === "add" ? ADD_STAFF_NAME : REMOVE_STAFF_NAME}
          </span>
        </div>
      </div>

      {/* Shift bar */}
      <div
        style={{
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #1E212A",
        }}
      >
        <button
          onClick={undoLast}
          disabled={log.length === 0}
          style={{
            border: "none",
            background: "none",
            color: log.length === 0 ? "#3A3E48" : "#8B8F99",
            fontSize: 13,
            fontWeight: 500,
            cursor: log.length === 0 ? "default" : "pointer",
            padding: "6px 0",
          }}
        >
          ↺ Undo last
        </button>
        <button
          onClick={resetShift}
          disabled={saving}
          style={{
            border: "none",
            background: "none",
            color: confirmingReset ? "#D9483D" : "#8B8F99",
            fontSize: 13,
            fontWeight: confirmingReset ? 700 : 500,
            cursor: saving ? "default" : "pointer",
            padding: "6px 0",
          }}
        >
          {saving
            ? "Saving…"
            : confirmingReset
            ? "Tap again to confirm"
            : "Reset shift"}
        </button>
      </div>

      {(saveError || syncError) && (
        <div
          style={{
            margin: "0 20px",
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(217,72,61,0.12)",
            border: "1px solid rgba(217,72,61,0.3)",
            color: "#D9483D",
            fontSize: 12,
          }}
        >
          {saveError || syncError}
        </div>
      )}

      {/* Count display */}
      <div style={{ padding: "28px 20px 20px", textAlign: "center" }}>
        <div
          style={{
            color: "#F2F0EA",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
          }}
        >
          {count}
        </div>
        <div style={{ color: "#6B7080", fontSize: 15, marginTop: 4 }}>
          of {MAX_CAPACITY} capacity
        </div>

        <div
          style={{
            marginTop: 18,
            height: 8,
            borderRadius: 999,
            background: "#1E212A",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: state.color,
              transition: "width 0.25s ease, background 0.25s ease",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            color: state.color,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {state.label} · {pct}%
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ padding: "4px 20px 0" }}>
        <div
          style={{
            display: "flex",
            background: "#1C2029",
            borderRadius: 12,
            padding: 4,
            border: "1px solid #262A34",
          }}
        >
          <button
            onClick={() => setMode("add")}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 9,
              border: "none",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              background: mode === "add" ? "#4C9F6E" : "transparent",
              color: mode === "add" ? "#0B0D11" : "#8B8F99",
              transition: "all 0.15s ease",
            }}
          >
            + Add people
          </button>
          <button
            onClick={() => setMode("remove")}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 9,
              border: "none",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              background: mode === "remove" ? "#D9483D" : "transparent",
              color: mode === "remove" ? "#0B0D11" : "#8B8F99",
              transition: "all 0.15s ease",
            }}
          >
            − Remove people
          </button>
        </div>
      </div>

      {/* Quick chips */}
      <div style={{ padding: "16px 20px 0", display: "flex", gap: 8 }}>
        {[1, 5, 10, 20].map((n) => (
          <button
            key={n}
            onClick={() => applyDelta(n)}
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 12,
              border: "1px solid #262A34",
              background: "#171A21",
              color: "#F2F0EA",
              fontWeight: 600,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {mode === "add" ? "+" : "−"}
            {n}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div style={{ padding: "10px 20px 22px", display: "flex", gap: 8 }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
          placeholder="Custom amount"
          style={{
            flex: 1,
            background: "#171A21",
            border: "1px solid #262A34",
            borderRadius: 12,
            padding: "12px 14px",
            color: "#F2F0EA",
            fontSize: 15,
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <button
          onClick={applyCustom}
          style={{
            padding: "0 22px",
            borderRadius: 12,
            border: "none",
            background: "#E8A33D",
            color: "#0B0D11",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Go
        </button>
      </div>

      {/* Activity log */}
      <div
        style={{
          borderTop: "1px solid #1E212A",
          padding: "16px 20px 20px",
        }}
      >
        <div
          style={{
            color: "#6B7080",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.03em",
            marginBottom: 10,
          }}
        >
          Activity
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {log.length === 0 && (
            <div style={{ color: "#4B4F5A", fontSize: 13 }}>
              No activity yet tonight
            </div>
          )}
          {log.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 14,
              }}
            >
              <span style={{ color: "#C9CCD3" }}>
                {entry.isReset ? "Shift reset" : entry.name}
              </span>
              {!entry.isReset && (
                <span
                  style={{
                    color: entry.delta > 0 ? "#4C9F6E" : "#D9483D",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {entry.delta > 0 ? "+" : ""}
                  {entry.delta}
                </span>
              )}
              <span style={{ color: "#4B4F5A", fontSize: 12 }}>
                {formatTime(entry.time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function formatShiftDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatShiftTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ManagerScreen() {
  const [openDay, setOpenDay] = useState(0);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchShifts();
        if (!cancelled) setShifts(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Couldn't load shift history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // Poll every 30s so a shift closed on another device shows up without
    // the manager needing to refresh manually.
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <div
        style={{
          padding: "18px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #1E212A",
        }}
      >
        <div>
          <div style={{ color: "#F2F0EA", fontWeight: 600, fontSize: 15 }}>
            {VENUE_NAME}
          </div>
          <div style={{ color: "#6B7080", fontSize: 12, marginTop: 2 }}>
            Audit log
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#1C2029",
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid #262A34",
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: "#E8A33D",
            }}
          />
          <span style={{ color: "#C9CCD3", fontSize: 13, fontWeight: 500 }}>
            Manager
          </span>
        </div>
      </div>

      <div style={{ padding: "16px 20px 24px" }}>
        {loading && (
          <div style={{ color: "#6B7080", fontSize: 13, padding: "12px 4px" }}>
            Loading shift history…
          </div>
        )}
        {error && (
          <div style={{ color: "#D9483D", fontSize: 13, padding: "12px 4px" }}>
            {error}
          </div>
        )}
        {!loading && !error && shifts.length === 0 && (
          <div style={{ color: "#6B7080", fontSize: 13, padding: "12px 4px" }}>
            No shifts recorded yet.
          </div>
        )}
        {shifts.map((shift, i) => {
          const isOpen = openDay === i;
          const adds = shift.entries.filter((e) => e.delta > 0).length;
          const removes = shift.entries.filter((e) => e.delta < 0).length;

          return (
            <div
              key={shift.id}
              style={{
                marginBottom: 10,
                border: "1px solid #23262E",
                borderRadius: 14,
                overflow: "hidden",
                background: "#171A21",
              }}
            >
              <button
                onClick={() => setOpenDay(isOpen ? -1 : i)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "none",
                  background: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: "#F2F0EA", fontWeight: 600, fontSize: 14 }}>
                    {formatShiftDate(shift.closed_at)}
                  </div>
                  <div style={{ color: "#6B7080", fontSize: 12, marginTop: 2 }}>
                    Peak {shift.peak_count} · {adds} in, {removes} out · closed by{" "}
                    {shift.closed_by}
                  </div>
                </div>
                <span
                  style={{
                    color: "#6B7080",
                    fontSize: 14,
                    transform: isOpen ? "rotate(90deg)" : "none",
                    transition: "transform 0.15s ease",
                  }}
                >
                  ›
                </span>
              </button>

              {isOpen && (
                <div
                  style={{
                    borderTop: "1px solid #1E212A",
                    padding: "12px 16px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 9,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      color: "#6B7080",
                      paddingBottom: 4,
                      borderBottom: "1px solid #1E212A",
                    }}
                  >
                    <span>
                      Totals: +{shift.total_in} / −{shift.total_out}
                    </span>
                    <span>Closing count: {shift.closing_count}</span>
                  </div>
                  {shift.entries.map((entry, j) => (
                    <div
                      key={j}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "#C9CCD3" }}>{entry.name}</span>
                      <span
                        style={{
                          color: entry.delta > 0 ? "#4C9F6E" : "#D9483D",
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {entry.delta > 0 ? "+" : ""}
                        {entry.delta}
                      </span>
                      <span style={{ color: "#4B4F5A", fontSize: 12 }}>
                        {formatShiftTime(entry.time)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function BarCapacityMockup() {
  const [view, setView] = useState("door");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0D11",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 12px",
        fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
        gap: 14,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');`}</style>

      {/* Preview switcher — not part of the app itself, just for viewing both roles here */}
      <div
        style={{
          display: "flex",
          background: "#171A21",
          borderRadius: 999,
          padding: 4,
          border: "1px solid #262A34",
        }}
      >
        <button
          onClick={() => setView("door")}
          style={{
            padding: "7px 18px",
            borderRadius: 999,
            border: "none",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: "0.02em",
            cursor: "pointer",
            background: view === "door" ? "#E8A33D" : "transparent",
            color: view === "door" ? "#0B0D11" : "#8B8F99",
          }}
        >
          Door staff view
        </button>
        <button
          onClick={() => setView("manager")}
          style={{
            padding: "7px 18px",
            borderRadius: 999,
            border: "none",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: "0.02em",
            cursor: "pointer",
            background: view === "manager" ? "#E8A33D" : "transparent",
            color: view === "manager" ? "#0B0D11" : "#8B8F99",
          }}
        >
          Manager view
        </button>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#12151A",
          borderRadius: 28,
          border: "1px solid #23262E",
          overflow: "hidden",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: view === "door" ? "block" : "none" }}>
          <DoorScreen />
        </div>
        <div style={{ display: view === "manager" ? "block" : "none" }}>
          <ManagerScreen />
        </div>
      </div>
    </div>
  );
}