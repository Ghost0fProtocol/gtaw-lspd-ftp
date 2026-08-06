"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../lib/supabase";

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

const ELIGIBLE_FTM_ROLES = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

export default function FTMAssignmentPanel({
  batchId,
}: Props) {
  const [
    assignments,
    setAssignments,
  ] = useState<
    Assignment[]
  >([]);

  const [
    availableFTMs,
    setAvailableFTMs,
  ] = useState<
    Profile[]
  >([]);

  const [
    selectedFTM,
    setSelectedFTM,
  ] = useState("");

  const [
    assignmentType,
    setAssignmentType,
  ] = useState(
    "Primary"
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    void loadData();
  }, [batchId]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const {
        data:
          assignmentData,
        error:
          assignmentError,
      } = await supabase
        .from(
          "ftp_batch_ftm_assignments"
        )
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
        .eq(
          "batch_id",
          batchId
        );

      if (
        assignmentError
      ) {
        throw assignmentError;
      }

      const {
        data:
          ftmData,
        error:
          ftmError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          badge_number,
          role
        `)
        .in(
          "role",
          ELIGIBLE_FTM_ROLES
        )
        .order(
          "name",
          {
            ascending: true,
          }
        );

      if (ftmError) {
        throw ftmError;
      }

      setAssignments(
        (
          assignmentData ??
          []
        ).map(
          (
            item: any
          ) => ({
            id:
              item.id,

            assignment_type:
              item.assignment_type,

            profile:
              Array.isArray(
                item.profile
              )
                ? item
                    .profile[0] ??
                  null
                : item
                    .profile ??
                  null,
          })
        )
      );

      setAvailableFTMs(
        (
          ftmData ??
          []
        ) as Profile[]
      );
    } catch (loadError) {
      console.error(
        "FTM ASSIGNMENT LOAD ERROR",
        loadError
      );

      setError(
        loadError instanceof
          Error
          ? loadError.message
          : "The FTM assignment information could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function addAssignment() {
    if (
      !selectedFTM ||
      saving
    ) {
      return;
    }

    if (
      assignmentType ===
        "Primary" &&
      assignments.some(
        (item) =>
          item
            .assignment_type ===
          "Primary"
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
          item.profile
            ?.id ===
          selectedFTM
      )
    ) {
      setError(
        "This person is already assigned to the batch."
      );

      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        error:
          insertError,
      } = await supabase
        .from(
          "ftp_batch_ftm_assignments"
        )
        .insert({
          batch_id:
            batchId,

          ftm_profile_id:
            selectedFTM,

          assignment_type:
            assignmentType,
        });

      if (
        insertError
      ) {
        throw insertError;
      }

      setSelectedFTM("");

      await loadData();
    } catch (
      assignmentError
    ) {
      console.error(
        "FTM ASSIGNMENT ERROR",
        assignmentError
      );

      setError(
        assignmentError instanceof
          Error
          ? assignmentError.message
          : "The FTM could not be assigned."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeAssignment(
    id: string
  ) {
    if (saving) {
      return;
    }

    const confirmed =
      window.confirm(
        "Remove this FTM assignment?"
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const {
        error:
          deleteError,
      } = await supabase
        .from(
          "ftp_batch_ftm_assignments"
        )
        .delete()
        .eq(
          "id",
          id
        );

      if (
        deleteError
      ) {
        throw deleteError;
      }

      await loadData();
    } catch (
      removalError
    ) {
      console.error(
        "FTM ASSIGNMENT REMOVAL ERROR",
        removalError
      );

      setError(
        removalError instanceof
          Error
          ? removalError.message
          : "The FTM assignment could not be removed."
      );
    } finally {
      setSaving(false);
    }
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
            Assign management
            responsibility for this
            FTP intake.
          </p>
        </div>

        <span style={countBadgeStyle}>
          {
            assignments.length
          }{" "}
          assigned
        </span>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div style={assignmentGrid}>
        {assignments.length ===
          0 && (
          <div style={emptyStyle}>
            No FTMs or senior
            FTP staff are assigned
            to this batch.
          </div>
        )}

        {assignments.map(
          (assignment) => (
            <div
              key={
                assignment.id
              }
              style={
                assignmentCard
              }
            >
              <div>
                <span
                  style={
                    badgeStyle
                  }
                >
                  {
                    assignment
                      .assignment_type
                  }
                </span>

                <h3
                  style={
                    nameStyle
                  }
                >
                  {assignment
                    .profile
                    ?.name ??
                    "Unknown"}
                </h3>

                <p
                  style={
                    detailStyle
                  }
                >
                  {assignment
                    .profile
                    ?.role ??
                    "Unknown role"}
                </p>

                {assignment
                  .profile
                  ?.badge_number && (
                  <p
                    style={
                      detailStyle
                    }
                  >
                    Badge:{" "}
                    {
                      assignment
                        .profile
                        .badge_number
                    }
                  </p>
                )}
              </div>

              <button
                style={{
                  ...removeButton,
                  opacity:
                    saving
                      ? 0.6
                      : 1,
                }}
                type="button"
                disabled={saving}
                onClick={() =>
                  void removeAssignment(
                    assignment.id
                  )
                }
              >
                Remove
              </button>
            </div>
          )
        )}
      </div>

      <div style={formStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle}>
            Assignment Type
          </label>

          <select
            style={inputStyle}
            value={
              assignmentType
            }
            onChange={(event) =>
              setAssignmentType(
                event.target
                  .value
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

        <div style={personFieldStyle}>
          <label style={labelStyle}>
            Select FTM or FTP
            Staff
          </label>

          <select
            style={inputStyle}
            value={selectedFTM}
            onChange={(event) =>
              setSelectedFTM(
                event.target
                  .value
              )
            }
          >
            <option value="">
              Choose an eligible
              supervisor...
            </option>

            {availableFTMs.map(
              (ftm) => (
                <option
                  key={ftm.id}
                  value={ftm.id}
                >
                  {ftm.name ??
                    "Unnamed"}{" "}
                  —{" "}
                  {ftm.role ??
                    "Unknown role"}
                </option>
              )
            )}
          </select>
        </div>

        <button
          style={{
            ...addButton,
            opacity:
              !selectedFTM ||
              saving
                ? 0.55
                : 1,
            cursor:
              !selectedFTM ||
              saving
                ? "not-allowed"
                : "pointer",
          }}
          type="button"
          disabled={
            !selectedFTM ||
            saving
          }
          onClick={() =>
            void addAssignment()
          }
        >
          {saving
            ? "Saving..."
            : "+ Assign FTM"}
        </button>
      </div>
    </div>
  );
}

const cardStyle = {
  padding: "24px",
  color: "white",
  background: "#111827",
  border:
    "1px solid #243244",
  borderRadius: "16px",
};

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent:
    "space-between",
  gap: "20px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "1px",
};

const titleStyle = {
  margin: "4px 0",
};

const subtitleStyle = {
  margin: "6px 0 0",
  color: "#94a3b8",
};

const countBadgeStyle = {
  padding: "7px 11px",
  color: "#bfdbfe",
  background:
    "rgba(37, 99, 235, 0.18)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const assignmentGrid = {
  display: "grid",
  gap: "12px",
};

const assignmentCard = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  gap: "20px",
  padding: "16px",
  background: "#172033",
  border:
    "1px solid #2d3b50",
  borderRadius: "12px",
};

const badgeStyle = {
  display: "inline-block",
  padding: "4px 10px",
  color: "#dbeafe",
  background: "#2563eb",
  borderRadius: "20px",
  fontSize: "12px",
};

const nameStyle = {
  margin: "10px 0 4px",
};

const detailStyle = {
  margin: "2px 0",
  color: "#94a3b8",
};

const emptyStyle = {
  padding: "22px",
  color: "#94a3b8",
  textAlign: "center" as const,
  background: "#0f172a",
  border:
    "1px dashed #334155",
  borderRadius: "10px",
};

const formStyle = {
  display: "flex",
  alignItems: "end",
  gap: "12px",
  marginTop: "24px",
  flexWrap: "wrap" as const,
};

const fieldStyle = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "6px",
  minWidth: "180px",
};

const personFieldStyle = {
  display: "flex",
  flex: 1,
  flexDirection:
    "column" as const,
  gap: "6px",
  minWidth: "260px",
};

const labelStyle = {
  color: "#94a3b8",
  fontSize: "13px",
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "11px",
  color: "white",
  background: "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: "8px",
};

const addButton = {
  padding: "12px 18px",
  color: "white",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  fontWeight: 800,
};

const removeButton = {
  padding: "8px 12px",
  color: "white",
  background: "#7f1d1d",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
  cursor: "pointer",
};

const errorStyle = {
  padding: "12px",
  marginBottom: "15px",
  color: "#fecaca",
  background: "#450a0a",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
};