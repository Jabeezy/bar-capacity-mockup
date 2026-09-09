import React, { useState, useEffect } from "react";

const MAX_CAPACITY = 200;
const STAFF_NAME = "Name 1";
const VENUE_NAME = "The Compass";

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function stateForPercent(pct) {
  if (pct >= 90) return { label: "At Capacity", color: "#D9483D" };
  if (pct >= 70) return { label: "Near Capacity", color: "#D99A3D" };
  return { label: "Comfortable", color: "#4C9F6E" };
}

const PAST_SHIFTS = [
  {
    date: "Sat, Sep 6",
    peak: 187,
    closing: 0,
    entries: [
      { name: "Name 1", delta: -187, time: "2:14 AM", isReset: true },
      { name: "Name 2", delta: -12, time: "1:52 AM" },
      { name: "Name 1", delta: -8, time: "1:30 AM" },
      { name: "Name 2", delta: 15, time: "11:40 PM" },
      { name: "Name 1", delta: 20, time: "10:58 PM" },
      { name: "Name 1", delta: 20, time: "10:15 PM" },
    ],
  },
  {
    date: "Fri, Sep 5",
    peak: 203,
    closing: 0,
    entries: [
      { name: "Name 2", delta: -203, time: "2:20 AM", isReset: true },
      { name: "Name 2", delta: -6, time: "9:47 PM" },
      { name: "Name 1", delta: 20, time: "9:42 PM" },
      { name: "Name 1", delta: 8, time: "9:31 PM" },
    ],
  },
  {
    date: "Thu, Sep 4",
    peak: 154,
    closing: 0,
    entries: [
      { name: "Name 1", delta: -154, time: "1:48 AM", isReset: true },
      { name: "Name 1", delta: 10, time: "11:05 PM" },
      { name: "Name 2", delta: 5, time: "10:20 PM" },
    ],
  },
];

function DoorScreen() {
  const [count, setCount] = useState(0);
  const [mode, setMode] = useState("add");
  const [custom, setCustom] = useState("");
  const [log, setLog] = useState([]);
  const [history, setHistory] = useState([]);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const pct = Math.min(100, Math.round((count / MAX_CAPACITY) * 100));
  const state = stateForPercent(pct);

  useEffect(() => {
    if (!confirmingReset) return;
    const t = setTimeout(() => setConfirmingReset(false), 3000);
    return () => clearTimeout(t);
  }, [confirmingReset]);

  function applyDelta(amount) {
    const signed = mode === "add" ? amount : -amount;
    setHistory((h) => [{ count, log }, ...h].slice(0, 20));
    setCount((c) => Math.max(0, c + signed));
    setLog((l) => [{ name: STAFF_NAME, delta: signed, time: new Date() }, ...l].slice(0, 6));
  }

  function applyCustom() {
    const n = parseInt(custom, 10);
    if (!n || n <= 0) return;
    applyDelta(n);
    setCustom("");
  }

  function undoLast() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const [previous, ...rest] = h;
      setCount(previous.count);
      setLog(previous.log);
      return rest;
    });
  }

  function resetShift() {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    setHistory([]);
    setCount(0);
    setLog([{ name: STAFF_NAME, delta: 0, time: new Date(), isReset: true }]);
    setConfirmingReset(false);
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
            {STAFF_NAME}
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
          disabled={history.length === 0}
          style={{
            border: "none",
            background: "none",
            color: history.length === 0 ? "#3A3E48" : "#8B8F99",
            fontSize: 13,
            fontWeight: 500,
            cursor: history.length === 0 ? "default" : "pointer",
            padding: "6px 0",
          }}
        >
          ↺ Undo last
        </button>
        <button
          onClick={resetShift}
          style={{
            border: "none",
            background: "none",
            color: confirmingReset ? "#D9483D" : "#8B8F99",
            fontSize: 13,
            fontWeight: confirmingReset ? 700 : 500,
            cursor: "pointer",
            padding: "6px 0",
          }}
        >
          {confirmingReset ? "Tap again to confirm" : "Reset shift"}
        </button>
      </div>

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

function ManagerScreen() {
  const [openDay, setOpenDay] = useState(0);

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
        {PAST_SHIFTS.map((shift, i) => {
          const isOpen = openDay === i;
          const adds = shift.entries.filter((e) => !e.isReset && e.delta > 0).length;
          const removes = shift.entries.filter((e) => !e.isReset && e.delta < 0).length;

          return (
            <div
              key={shift.date}
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
                    {shift.date}
                  </div>
                  <div style={{ color: "#6B7080", fontSize: 12, marginTop: 2 }}>
                    Peak {shift.peak} · {adds} in, {removes} out
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
                        {entry.time}
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