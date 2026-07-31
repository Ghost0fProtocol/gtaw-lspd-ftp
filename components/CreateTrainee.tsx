"use client";

import { useState } from "react";

type CreateTraineeProps = {
  onCreate: (trainee: {
    name: string;
    reference: string;
    status: string;
    progress: number;
    reports: number;
    lastActivity: string;
    notebook: any[];
  }) => void;

  onCancel: () => void;
};

export default function CreateTrainee({
  onCreate,
  onCancel,
}: CreateTraineeProps) {
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [division, setDivision] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!name || !serial) {
      return;
    }

    onCreate({
      name,
      reference: serial,
      status: "Active",
      progress: 0,
      reports: 0,
      lastActivity: "Today",
      notebook: [
        {
          section: "MANDATORY COURSES",
          items: [
            {
              id: "basic_first_aid",
              label: "(BFA) Basic First Aid",
              completed: false,
            },
            {
              id: "evoc",
              label: "(EVOC) Emergency Vehicle Operators Course",
              completed: false,
            },
          ],
        },
        {
          section: "TRAFFIC ENFORCEMENT",
          items: [
            {
              id: "enforcement_equipment",
              label: "Enforcement Equipment",
              completed: false,
            },
            {
              id: "traffic_stops",
              label: "Traffic Stops",
              completed: false,
            },
          ],
        },
        {
          section: "FIELD PROCEDURES",
          items: [
            {
              id: "police_records_database",
              label: "Police Records Database",
              completed: false,
            },
            {
              id: "departmental_radio",
              label: "Departmental Radio",
              completed: false,
            },
            {
              id: "preliminary_investigations",
              label: "Preliminary Investigations",
              completed: false,
            },
            {
              id: "pursuits",
              label: "Pursuits",
              completed: false,
            },
          ],
        },
        {
          section: "ARREST PROCEDURE",
          items: [
            {
              id: "booking",
              label: "Booking",
              completed: false,
            },
            {
              id: "report",
              label: "Report",
              completed: false,
            },
          ],
        },
        {
          section: "STATE LAW",
          items: [
            {
              id: "reasonable_suspicion",
              label: "Reasonable Suspicion / Probable Cause",
              completed: false,
            },
            {
              id: "penal_code",
              label: "Penal Code",
              completed: false,
            },
            {
              id: "search_seizure",
              label: "Search & Seizure",
              completed: false,
            },
            {
              id: "constitution",
              label: "U.S. Constitution",
              completed: false,
            },
          ],
        },
      ],
    });
  }

  return (
    <div
      style={{
        padding: "28px",
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "12px",
      }}
    >
      <h2 style={{ margin: "0 0 8px" }}>
        Create Probationer Notebook
      </h2>

      <p style={{ color: "#94a3b8" }}>
        Field Training Manager can be assigned later.
      </p>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Probationary Officer"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Serial Number"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Division"
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: "12px" }}>
          <button type="submit" style={buttonStyle}>
            Create Notebook
          </button>

          <button
            type="button"
            onClick={onCancel}
            style={{
              ...buttonStyle,
              backgroundColor: "#475569",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  marginBottom: "14px",
  backgroundColor: "#0f172a",
  color: "white",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const buttonStyle = {
  padding: "12px 18px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};