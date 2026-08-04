"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  batchId: string;
};

type Profile = {
  id: string;
  name: string | null;
  badge_number: string | null;
  role: string | null;
};

type Assignment = {
  id: string;
  assignment_type: string;
  profile: Profile | null;
};

export default function FTMAssignmentPanel({
  batchId,
}: Props) {
  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [availableFTMs, setAvailableFTMs] =
    useState<Profile[]>([]);

  const [selectedFTM, setSelectedFTM] =
    useState("");

  const [assignmentType, setAssignmentType] =
    useState("Primary");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    void loadData();
  }, [batchId]);

  async function loadData() {
    setLoading(true);
    setError("");

    const { data: assignmentData, error: assignmentError } =
      await supabase
        .from("ftp_batch_ftm_assignments")
        .select(`
          id,
          assignment_type,
          profile:ftm_profile_id (
            id,
            name,
            badge_number,
            role
          )
        `)
        .eq("batch_id", batchId);

    if (assignmentError) {
      setError(assignmentError.message);
    }

    const { data: ftmData } =
      await supabase
        .from("profiles")
        .select(`
          id,
          name,
          badge_number,
          role
        `)
        .in("role", [
          "Field Training Manager",
          "Field Training Supervisor",
          "STAFF",
          "LSPD STAFF",
        ]);

    setAssignments(
      (assignmentData ?? []).map((item: any) => ({
        id: item.id,
        assignment_type: item.assignment_type,
        profile: Array.isArray(item.profile)
          ? item.profile[0] ?? null
          : item.profile ?? null,
      }))
    );

    setAvailableFTMs(
      (ftmData ?? []) as Profile[]
    );

    setLoading(false);
  }

  async function addAssignment() {
    if (!selectedFTM) return;

    if (
      assignmentType === "Primary" &&
      assignments.some(
        (item) =>
          item.assignment_type === "Primary"
      )
    ) {
      setError(
        "This batch already has a Primary FTM."
      );
      return;
    }

    if (
      assignments.some(
        (item) =>
          item.profile?.id === selectedFTM
      )
    ) {
      setError(
        "This FTM is already assigned."
      );
      return;
    }

    const { error: insertError } =
      await supabase
        .from("ftp_batch_ftm_assignments")
        .insert({
          batch_id: batchId,
          ftm_profile_id: selectedFTM,
          assignment_type: assignmentType,
        });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSelectedFTM("");
    await loadData();
  }

  async function removeAssignment(id: string) {
    await supabase
      .from("ftp_batch_ftm_assignments")
      .delete()
      .eq("id", id);

    await loadData();
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        Loading FTM oversight...
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            BATCH MANAGEMENT
          </p>
          <h2 style={titleStyle}>
            FTM Oversight
          </h2>
          <p style={subtitleStyle}>
            Assign management responsibility for this FTP intake.
          </p>
        </div>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div style={assignmentGrid}>
        {assignments.length === 0 && (
          <div style={emptyStyle}>
            No FTMs assigned to this batch.
          </div>
        )}

        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            style={assignmentCard}
          >
            <div>
              <span style={badgeStyle}>
                {assignment.assignment_type}
              </span>

              <h3 style={nameStyle}>
                {assignment.profile?.name ??
                  "Unknown"}
              </h3>

              <p style={detailStyle}>
                {assignment.profile?.role ??
                  "Unknown role"}
              </p>

              {assignment.profile?.badge_number && (
                <p style={detailStyle}>
                  Badge: {assignment.profile.badge_number}
                </p>
              )}
            </div>

            <button
              style={removeButton}
              type="button"
              onClick={() =>
                void removeAssignment(
                  assignment.id
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div style={formStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Assignment Type
          </label>

          <select
            style={inputStyle}
            value={assignmentType}
            onChange={(e) =>
              setAssignmentType(
                e.target.value
              )
            }
          >
            <option value="Primary">
              Primary FTM
            </option>

            <option value="Assistant">
              Supporting FTM
            </option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Select FTM
          </label>

          <select
            style={inputStyle}
            value={selectedFTM}
            onChange={(e) =>
              setSelectedFTM(
                e.target.value
              )
            }
          >
            <option value="">
              Choose FTM...
            </option>

            {availableFTMs.map((ftm) => (
              <option
                key={ftm.id}
                value={ftm.id}
              >
                {ftm.name} - {ftm.role}
              </option>
            ))}
          </select>
        </div>

        <button
          style={addButton}
          type="button"
          onClick={() =>
            void addAssignment()
          }
        >
          + Assign FTM
        </button>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#111827",
  border: "1px solid #243244",
  borderRadius: "16px",
  padding: "24px",
  color: "white",
};

const headerStyle = {
  marginBottom: "20px",
};

const eyebrowStyle = {
  color: "#60a5fa",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "1px",
};

const titleStyle = {
  margin: "4px 0",
};

const subtitleStyle = {
  color: "#94a3b8",
};

const assignmentGrid = {
  display: "grid",
  gap: "12px",
};

const assignmentCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#172033",
  padding: "16px",
  borderRadius: "12px",
};

const badgeStyle = {
  background: "#2563eb",
  padding: "4px 10px",
  borderRadius: "20px",
  fontSize: "12px",
};

const nameStyle = {
  margin: "10px 0 4px",
};

const detailStyle = {
  color: "#94a3b8",
  margin: "2px 0",
};

const emptyStyle = {
  color: "#94a3b8",
};

const formStyle = {
  marginTop: "24px",
  display: "flex",
  gap: "12px",
  alignItems: "end",
  flexWrap: "wrap" as const,
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
};

const labelStyle = {
  fontSize: "13px",
  color: "#94a3b8",
};

const inputStyle = {
  background: "#0f172a",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "8px",
  padding: "10px",
};

const addButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "12px 18px",
  cursor: "pointer",
};

const removeButton = {
  background: "#7f1d1d",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
};

const errorStyle = {
  background: "#450a0a",
  border: "1px solid #991b1b",
  padding: "12px",
  borderRadius: "8px",
  marginBottom: "15px",
};