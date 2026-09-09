-- Run this once against your Railway Postgres database
-- (Railway dashboard -> Postgres plugin -> "Query" tab, or via psql using the connection string)

CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  venue TEXT NOT NULL,
  closed_by TEXT NOT NULL,       -- which staff member reset the shift
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  peak_count INTEGER NOT NULL,
  total_in INTEGER NOT NULL,     -- sum of all positive deltas
  total_out INTEGER NOT NULL,    -- sum of all negative deltas (positive number)
  closing_count INTEGER NOT NULL -- count at the moment of reset
);

CREATE TABLE IF NOT EXISTS shift_entries (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  delta INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shift_entries_shift_id ON shift_entries(shift_id);
CREATE INDEX IF NOT EXISTS idx_shifts_closed_at ON shifts(closed_at DESC);