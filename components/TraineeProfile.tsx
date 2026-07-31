"use client";

import { useEffect, useState } from "react";
import BBCodeRecord from "./BBCodeRecord";

type NotebookItem = {
  id: string;
  label: string;
  completed: boolean;
};

type NotebookSection = {
  section: string;
  items: NotebookItem[];
};

type Trainee = {
  id: number;
  name: string;
  reference: string;
  status: string;
  progress: number;
  reports: number;
  lastActivity: string;
  ftm: string;
  notebook: NotebookSection[];
};

type TraineeProfileProps = {
  trainee: Trainee;
  onBack: () => void;
  onUpdate: (updatedTrainee: Trainee) => void;
};

export default function TraineeProfile({
  trainee,
  onBack,
  onUpdate,
}: TraineeProfileProps) {
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState(trainee.name);
  const [reference, setReference] = useState(trainee.reference);
  const [status, setStatus] = useState(trainee.status);
  const [ftm, setFtm] = useState(trainee.ftm);

  useEffect(() => {
    setName(trainee.name);
    setReference(trainee.reference);
    setStatus(trainee.status);
    setFtm(trainee.ftm);
  }, [trainee]);

  function calculateProgress(
    notebook: NotebookSection[],
  ) {
    const items = notebook.flatMap(
      (section) => section.items,
    );

    const completed = items.filter(
      (item) => item.completed,
    ).length;

    if (items.length === 0) {
      return 0;
    }

    return Math.round(
      (completed / items.length) * 100,
    );
  }

  function saveProfile() {
    onUpdate({
      ...trainee,
      name,
      reference,
      status,
      ftm,
      progress: calculateProgress(
        trainee.notebook,
      ),
    });

    setEditing(false);
  }

  function toggleNotebookItem(
    sectionName: string,
    itemId: string,
  ) {
    const updatedNotebook = trainee.notebook.map(
      (section) => {
        if (section.section !== sectionName) {
          return section;
        }

        return {
          ...section,
          items: section.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  completed: !item.completed,
                }
              : item,
          ),
        };
      },
    );

    onUpdate({
      ...trainee,
      notebook: updatedNotebook,
      progress: calculateProgress(
        updatedNotebook,
      ),
    });
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          marginBottom: "22px",
          padding: "10px 14px",
          backgroundColor: "#1e293b",
          color: "white",
          border: "1px solid #475569",
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        ← Back to Records
      </button>

      <div style={cardStyle}>
        {!editing ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <p style={mutedStyle}>
                {trainee.reference}
              </p>

              <h2 style={{ margin: 0 }}>
                {trainee.name}
              </h2>

              <p style={mutedStyle}>
                Field Training Manager:{" "}
                {trainee.ftm || "Not Assigned"}
              </p>
            </div>

            <button
              onClick={() => setEditing(true)}
              style={buttonStyle}
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <>
            <h2>Edit Profile</h2>

            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Name"
              style={inputStyle}
            />

            <input
              value={reference}
              onChange={(e) =>
                setReference(e.target.value)
              }
              placeholder="Serial Number"
              style={inputStyle}
            />

            <input
              value={ftm}
              onChange={(e) =>
                setFtm(e.target.value)
              }
              placeholder="Field Training Manager"
              style={inputStyle}
            />

            <input
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              placeholder="Status"
              style={inputStyle}
            />

            <button
              onClick={saveProfile}
              style={buttonStyle}
            >
              Save
            </button>
          </>
        )}
      </div>

      <div style={cardStyle}>
        <h3>Training Information</h3>

        <p>
          Status: {trainee.status}
        </p>

        <p>
          Progress: {trainee.progress}%
        </p>

        <p>
          Reports Completed: {trainee.reports}
        </p>
      </div>

      <div style={cardStyle}>
        <h3>
          Structured Learning Content Checklist
        </h3>

        {trainee.notebook.map((section) => (
          <div
            key={section.section}
            style={{
              marginBottom: "18px",
            }}
          >
            <h4
              style={{
                color: "#93c5fd",
              }}
            >
              {section.section}
            </h4>

            {section.items.map((item) => (
              <label
                key={item.id}
                style={{
                  display: "block",
                  marginBottom: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() =>
                    toggleNotebookItem(
                      section.section,
                      item.id,
                    )
                  }
                />{" "}
                {item.label}
              </label>
            ))}
          </div>
        ))}
      </div>

      <BBCodeRecord trainee={trainee} />
    </div>
  );
}

const cardStyle = {
  padding: "24px",
  marginBottom: "22px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const mutedStyle = {
  color: "#94a3b8",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  marginBottom: "12px",
  backgroundColor: "#0f172a",
  color: "white",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const buttonStyle = {
  padding: "10px 16px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};