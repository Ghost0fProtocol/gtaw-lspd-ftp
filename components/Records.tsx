"use client";

import { useState } from "react";
import TraineeProfile from "./TraineeProfile";
import CreateTrainee from "./CreateTrainee";

const defaultNotebook = [
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
];

const initialTrainees = [
  {
    id: 1,
    name: "Alex Smith",
    reference: "TRN-001",
    status: "Active",
    progress: 72,
    reports: 8,
    lastActivity: "Today",
    ftm: "",
    notebook: defaultNotebook,
  },
  {
    id: 2,
    name: "Jordan Lee",
    reference: "TRN-002",
    status: "Review",
    progress: 48,
    reports: 5,
    lastActivity: "Yesterday",
    ftm: "",
    notebook: defaultNotebook,
  },
  {
    id: 3,
    name: "Taylor Brown",
    reference: "TRN-003",
    status: "Active",
    progress: 31,
    reports: 3,
    lastActivity: "3 days ago",
    ftm: "",
    notebook: defaultNotebook,
  },
];

type Trainee = (typeof initialTrainees)[number];

export default function Records() {
  const [traineeRecords, setTraineeRecords] =
    useState(initialTrainees);

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedTrainee, setSelectedTrainee] =
    useState<Trainee | null>(null);

  const [creatingRecord, setCreatingRecord] =
    useState(false);

  const filteredTrainees = traineeRecords.filter((trainee) =>
    trainee.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  if (selectedTrainee) {
    return (
      <TraineeProfile
        trainee={selectedTrainee}
        onBack={() => setSelectedTrainee(null)}
        onUpdate={(updatedTrainee) => {
          setTraineeRecords((current) =>
            current.map((trainee) =>
              trainee.id === updatedTrainee.id
                ? updatedTrainee
                : trainee,
            ),
          );

          setSelectedTrainee(updatedTrainee);
        }}
      />
    );
  }

  if (creatingRecord) {
    return (
      <CreateTrainee
        onCancel={() => setCreatingRecord(false)}
        onCreate={(newTrainee) => {
          setTraineeRecords((current) => [
            ...current,
            {
              id: current.length + 1,
              ...newTrainee,
              ftm: "",
              notebook: defaultNotebook,
            },
          ]);

          setCreatingRecord(false);
        }}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "22px",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 6px" }}>
            Training Records
          </h2>

          <p style={{ color: "#94a3b8" }}>
            Select a record to view its profile.
          </p>
        </div>

        <button
          onClick={() => setCreatingRecord(true)}
          style={{
            padding: "11px 16px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Add Record
        </button>
      </div>

      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search records..."
        style={{
          width: "100%",
          padding: "13px",
          marginBottom: "20px",
          backgroundColor: "#1e293b",
          color: "white",
          border: "1px solid #475569",
          borderRadius: "8px",
        }}
      />

      <div
        style={{
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
        }}
      >
        {filteredTrainees.map((trainee) => (
          <button
            key={trainee.id}
            onClick={() => {
              const latest =
                traineeRecords.find(
                  (record) =>
                    record.id === trainee.id,
                );

              if (latest) {
                setSelectedTrainee(latest);
              }
            }}
            style={{
              width: "100%",
              display: "grid",
              gridTemplateColumns:
                "2fr 1fr 1fr 1fr",
              padding: "18px",
              backgroundColor: "transparent",
              color: "white",
              border: "none",
              borderTop:
                "1px solid #334155",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <strong>{trainee.name}</strong>
            <span>{trainee.status}</span>
            <span>{trainee.progress}%</span>
            <span>{trainee.reports}</span>
          </button>
        ))}
      </div>
    </div>
  );
}