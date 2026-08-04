"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type AuditRow = {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  category: string;
  entity_type: string | null;
  target_name: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reason: string | null;
  correlation_id: string;
  created_at: string;
};

const allowedRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

const categories = [
  "All", "Accounts", "Probationers", "DORs", "Notebook",
  "FTP Files", "Intakes", "Permissions", "Settings",
  "Imports", "EVOC", "System",
];

export default function AuditLog({ user }: { user: any }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const canView = allowedRoles.includes(user?.role);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    void loadRows();
  }, [canView]);

  async function loadRows() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setMessage(`❌ ${error.message}`);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesCategory = category === "All" || row.category === category;
      const text = [
        row.actor_name,
        row.actor_role,
        row.action,
        row.category,
        row.target_name,
        row.entity_type,
        row.reason,
      ].filter(Boolean).join(" ").toLowerCase();

      return matchesCategory && (!q || text.includes(q));
    });
  }, [rows, search, category]);

  if (!canView) {
    return <div style={notice}>You do not have permission to view audit logs.</div>;
  }

  return (
    <div style={page}>
      <section style={hero}>
        <div>
          <p style={eyebrow}>STAFF OVERSIGHT</p>
          <h1 style={title}>Audit Centre</h1>
          <p style={subtitle}>Review administrative activity across the FTP portal.</p>
        </div>
        <button type="button" onClick={loadRows} style={button}>Refresh</button>
      </section>

      <section style={filters}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search actor, action, target or reason..."
          style={input}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={grid}>
        <div style={card}>
          <div style={header}>
            <strong>Activity</strong>
            <span style={muted}>{filtered.length} entries</span>
          </div>

          {loading ? (
            <div style={empty}>Loading audit activity...</div>
          ) : filtered.length === 0 ? (
            <div style={empty}>No matching audit entries.</div>
          ) : (
            <div style={list}>
              {filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelected(row)}
                  style={{
                    ...entry,
                    borderColor: selected?.id === row.id ? "#3b82f6" : "#334155",
                  }}
                >
                  <div style={top}>
                    <strong>{humanise(row.action)}</strong>
                    <span style={date}>{formatDate(row.created_at)}</span>
                  </div>
                  <p style={summary}>
                    {row.actor_name || "Unknown user"}
                    {row.target_name ? ` · ${row.target_name}` : ""}
                  </p>
                  <span style={badge}>{row.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside style={detail}>
          {!selected ? (
            <div style={empty}>Select an entry to inspect the full change.</div>
          ) : (
            <>
              <p style={eyebrow}>AUDIT ENTRY</p>
              <h2 style={{ marginTop: 0 }}>{humanise(selected.action)}</h2>
              <Detail label="Performed by" value={selected.actor_name || "Unknown user"} />
              <Detail label="Role" value={selected.actor_role || "Unknown"} />
              <Detail
                label="Target"
                value={selected.target_name || selected.entity_type || "Not recorded"}
              />
              <Detail label="Time" value={formatDate(selected.created_at)} />
              {selected.reason && <Detail label="Reason" value={selected.reason} />}
              <JsonPanel label="Previous value" value={selected.old_data} />
              <JsonPanel label="New value" value={selected.new_data} />
              <Detail label="Correlation ID" value={selected.correlation_id} />
            </>
          )}
        </aside>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailRow}>
      <span style={muted}>{label}</span>
      <strong style={{ overflowWrap: "anywhere" }}>{value}</strong>
    </div>
  );
}

function JsonPanel({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown> | null;
}) {
  if (!value) return null;

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
      <span style={muted}>{label}</span>
      <pre style={pre}>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function humanise(value: string) {
  return value.toLowerCase().split("_").map(
    (part) => part.charAt(0).toUpperCase() + part.slice(1)
  ).join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const page = { display: "grid", gap: 20 };
const hero = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  gap: 20, padding: 28, color: "white", background: "#172554",
  borderRadius: 16, flexWrap: "wrap" as const,
};
const eyebrow = { margin: "0 0 7px", color: "#60a5fa", fontSize: 12, fontWeight: 900 };
const title = { margin: 0, fontSize: 32 };
const subtitle = { marginBottom: 0, color: "#cbd5e1" };
const filters = {
  display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(180px, 260px)",
  gap: 12, padding: 16, background: "#172033", border: "1px solid #334155",
  borderRadius: 12,
};
const input = {
  width: "100%", boxSizing: "border-box" as const, padding: 12, color: "white",
  background: "#0f172a", border: "1px solid #475569", borderRadius: 8,
};
const grid = {
  display: "grid", gridTemplateColumns: "minmax(420px, 1.35fr) minmax(320px, .65fr)",
  gap: 20,
};
const card = { overflow: "hidden", background: "#172033", border: "1px solid #334155", borderRadius: 14 };
const detail = { alignSelf: "start", padding: 22, color: "white", background: "#172033", border: "1px solid #334155", borderRadius: 14 };
const header = { display: "flex", justifyContent: "space-between", padding: "18px 20px", color: "white", borderBottom: "1px solid #334155" };
const list = { display: "grid", gap: 10, padding: 14 };
const entry = { padding: 16, textAlign: "left" as const, color: "white", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, cursor: "pointer" };
const top = { display: "flex", justifyContent: "space-between", gap: 14 };
const summary = { margin: "8px 0", color: "#cbd5e1" };
const badge = { display: "inline-block", padding: "4px 8px", color: "#bfdbfe", background: "rgba(37,99,235,.2)", border: "1px solid #2563eb", borderRadius: 999, fontSize: 11, fontWeight: 800 };
const date = { color: "#94a3b8", fontSize: 12 };
const muted = { color: "#94a3b8" };
const empty = { padding: 28, color: "#94a3b8", textAlign: "center" as const };
const notice = { padding: 15, color: "white", background: "#172033", border: "1px solid #334155", borderRadius: 10 };
const button = { padding: "11px 17px", color: "white", background: "#334155", border: "1px solid #475569", borderRadius: 8, cursor: "pointer", fontWeight: 800 };
const detailRow = { display: "grid", gap: 5, padding: "13px 0", borderBottom: "1px solid #334155" };
const pre = { overflowX: "auto" as const, margin: 0, padding: 13, color: "#cbd5e1", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 };