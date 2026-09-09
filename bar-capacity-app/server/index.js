import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

// Railway injects DATABASE_URL automatically when you attach a Postgres plugin
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway")
    ? { rejectUnauthorized: false }
    : false,
});

const app = express();
app.use(express.json());
app.use(
  cors({
    // Set this to your Netlify site URL once deployed, e.g. https://your-bar-app.netlify.app
    origin: process.env.ALLOWED_ORIGIN || "*",
  })
);

// Health check — useful for confirming Railway deployed correctly
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Save a completed shift (called when door staff taps "Reset shift")
app.post("/api/shifts", async (req, res) => {
  const { venue, closedBy, peakCount, closingCount, entries } = req.body;

  if (!venue || !closedBy || !Array.isArray(entries)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const totalIn = entries
    .filter((e) => e.delta > 0)
    .reduce((sum, e) => sum + e.delta, 0);
  const totalOut = entries
    .filter((e) => e.delta < 0)
    .reduce((sum, e) => sum + Math.abs(e.delta), 0);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const shiftResult = await client.query(
      `INSERT INTO shifts (venue, closed_by, peak_count, total_in, total_out, closing_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, venue, closed_by, closed_at, peak_count, total_in, total_out, closing_count`,
      [venue, closedBy, peakCount, totalIn, totalOut, closingCount]
    );
    const shift = shiftResult.rows[0];

    for (const entry of entries) {
      await client.query(
        `INSERT INTO shift_entries (shift_id, staff_name, delta, occurred_at)
         VALUES ($1, $2, $3, $4)`,
        [shift.id, entry.name, entry.delta, entry.time]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ ...shift, entries });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to save shift" });
  } finally {
    client.release();
  }
});

// List past shifts for the manager view, most recent first
app.get("/api/shifts", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

  try {
    const shiftsResult = await pool.query(
      `SELECT id, venue, closed_by, closed_at, peak_count, total_in, total_out, closing_count
       FROM shifts
       ORDER BY closed_at DESC
       LIMIT $1`,
      [limit]
    );
    const shifts = shiftsResult.rows;

    if (shifts.length === 0) return res.json([]);

    const ids = shifts.map((s) => s.id);
    const entriesResult = await pool.query(
      `SELECT shift_id, staff_name, delta, occurred_at
       FROM shift_entries
       WHERE shift_id = ANY($1)
       ORDER BY occurred_at DESC`,
      [ids]
    );

    const entriesByShift = {};
    for (const row of entriesResult.rows) {
      if (!entriesByShift[row.shift_id]) entriesByShift[row.shift_id] = [];
      entriesByShift[row.shift_id].push({
        name: row.staff_name,
        delta: row.delta,
        time: row.occurred_at,
      });
    }

    res.json(
      shifts.map((s) => ({
        ...s,
        entries: entriesByShift[s.id] || [],
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Door count API listening on port ${PORT}`);
});