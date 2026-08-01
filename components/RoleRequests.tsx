"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import {
  formatMinutes,
  parseFTOFile,
} from "../lib/parseFTOFile";

type Props = {
  user: any;
};

type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

type OfficerProfile = {
  id: string;
  name: string | null;
  rank: string | null;
  badge_number: string | null;
  work_number: string | null;
  role: string | null;
  requested_role: string | null;
  role_request_status: string | null;
};

type FTOImportRequest = {
  id: string;
  profile_id: string;
  original_bbcode: string;
  parsed_data: Record<string, unknown> | null;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string | null;
  profile?: OfficerProfile;
};

const allowedReviewerRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "STAFF",
  "LSPD STAFF",
];

export default function RoleRequests({
  user,
}: Props) {
  const [
    requests,
    setRequests,
  ] = useState<FTOImportRequest[]>([]);

  const [
    selectedRequest,
    setSelectedRequest,
  ] = useState<FTOImportRequest | null>(
    null
  );

  const [
    reviewerNotes,
    setReviewerNotes,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<
    "all" | RequestStatus
  >("pending");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const parsedPreview =
    selectedRequest
      ? parseFTOFile(
          selectedRequest.original_bbcode
        )
      : null;

  const canReview =
    allowedReviewerRoles.includes(
      user?.role
    );

  useEffect(() => {
    void loadRequests();
  }, []);

  useEffect(() => {
    setReviewerNotes(
      selectedRequest?.reviewer_notes ??
      ""
    );
  }, [selectedRequest]);

  const filteredRequests =
    useMemo(() => {
      if (
        statusFilter === "all"
      ) {
        return requests;
      }

      return requests.filter(
        (request) =>
          request.status ===
          statusFilter
      );
    }, [
      requests,
      statusFilter,
    ]);

  async function loadRequests() {
    setLoading(true);
    setError("");

    try {
      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from(
          "fto_import_requests"
        )
        .select("*")
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (requestError) {
        throw requestError;
      }

      const rows =
        (requestData ??
          []) as FTOImportRequest[];

      const profileIds = [
        ...new Set(
          rows.map(
            (request) =>
              request.profile_id
          )
        ),
      ];

      let profiles:
        OfficerProfile[] = [];

      if (
        profileIds.length > 0
      ) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            name,
            rank,
            badge_number,
            work_number,
            role,
            requested_role,
            role_request_status
          `)
          .in(
            "id",
            profileIds
          );

        if (profileError) {
          throw profileError;
        }

        profiles =
          (profileData ??
            []) as OfficerProfile[];
      }

      const combined =
        rows.map(
          (request) => ({
            ...request,
            profile:
              profiles.find(
                (profile) =>
                  profile.id ===
                  request.profile_id
              ),
          })
        );

      setRequests(combined);
    } catch (loadError) {
      console.error(
        "LOAD ROLE REQUESTS ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Role requests could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function importApprovedFTOFile(
    request: FTOImportRequest
  ) {
    const parsed =
      parseFTOFile(
        request.original_bbcode
      );

    if (
      !parsed.officerName ||
      !parsed.serialNumber
    ) {
      throw new Error(
        "The submitted FTO file could not be approved because the officer name or serial number could not be parsed."
      );
    }

    const {
      data: ftoFile,
      error: ftoFileError,
    } = await supabase
      .from("fto_files")
      .upsert(
        {
          profile_id:
            request.profile_id,
          division:
            parsed.division ||
            null,
          induction_date:
            parsed.inductionDate,
          final_evaluation_date:
            parsed.finalEvaluationDate,
          probationary_passed_date:
            parsed.probationaryPassedDate,
          total_instruction_minutes:
            parsed.resolvedTotalInstructionMinutes,
          original_bbcode:
            request.original_bbcode,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "profile_id",
        }
      )
      .select("id")
      .single();

    if (ftoFileError) {
      throw ftoFileError;
    }

    const {
      error: deleteEntriesError,
    } = await supabase
      .from("fto_log_entries")
      .delete()
      .eq(
        "fto_file_id",
        ftoFile.id
      );

    if (deleteEntriesError) {
      throw deleteEntriesError;
    }

    if (
      parsed.entries.length > 0
    ) {
      const rows =
        parsed.entries.map(
          (entry) => ({
            fto_file_id:
              ftoFile.id,
            entry_date:
              entry.date,
            duration_minutes:
              entry.durationMinutes,
            subject_name:
              entry.subjectName,
            entry_type:
              entry.entryType,
            source_url:
              entry.sourceUrl,
            source_month:
              entry.sourceMonth,
          })
        );

      const {
        error: insertEntriesError,
      } = await supabase
        .from("fto_log_entries")
        .insert(rows);

      if (insertEntriesError) {
        throw insertEntriesError;
      }
    }

    const {
      error: parsedDataError,
    } = await supabase
      .from(
        "fto_import_requests"
      )
      .update({
        parsed_data:
          parsed,
      })
      .eq(
        "id",
        request.id
      );

    if (parsedDataError) {
      throw parsedDataError;
    }

    return parsed;
  }

  async function reviewRequest(
    outcome:
      | "approved"
      | "rejected"
      | "changes_requested"
  ) {
    if (
      !selectedRequest
    ) {
      return;
    }

    if (!canReview) {
      setError(
        "You do not have permission to review role requests."
      );

      return;
    }

    if (
      (
        outcome === "rejected" ||
        outcome ===
          "changes_requested"
      ) &&
      !reviewerNotes.trim()
    ) {
      setError(
        "Please add reviewer notes before rejecting or requesting changes."
      );

      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    try {
      const reviewedAt =
        new Date().toISOString();

      if (
        outcome === "approved"
      ) {
        await importApprovedFTOFile(
          selectedRequest
        );
      }

      const {
        error: requestUpdateError,
      } = await supabase
        .from(
          "fto_import_requests"
        )
        .update({
          status: outcome,
          reviewed_by:
            user.id,
          reviewed_at:
            reviewedAt,
          reviewer_notes:
            reviewerNotes.trim() ||
            null,
          updated_at:
            reviewedAt,
        })
        .eq(
          "id",
          selectedRequest.id
        );

      if (
        requestUpdateError
      ) {
        throw requestUpdateError;
      }

      const profileUpdates =
        outcome === "approved"
          ? {
              role:
                "Field Training Officer",
              requested_role:
                "Field Training Officer",
              role_request_status:
                "approved",
            }
          : {
              requested_role:
                "Field Training Officer",
              role_request_status:
                outcome,
            };

      const {
        error: profileUpdateError,
      } = await supabase
        .from("profiles")
        .update(
          profileUpdates
        )
        .eq(
          "id",
          selectedRequest.profile_id
        );

      if (
        profileUpdateError
      ) {
        throw profileUpdateError;
      }

      const officerName =
        selectedRequest.profile?.name ??
        "The officer";

      setSuccess(
        outcome === "approved"
          ? `${officerName} has been approved as a Field Training Officer and their FTO file has been imported.`
          : outcome === "rejected"
            ? `${officerName}'s FTO request has been rejected.`
            : `Changes have been requested from ${officerName}.`
      );

      setSelectedRequest(
        null
      );

      setReviewerNotes("");

      await loadRequests();
    } catch (reviewError) {
      console.error(
        "REVIEW FTO REQUEST ERROR",
        reviewError
      );

      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "The request could not be updated."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (!canReview) {
    return (
      <div style={errorBoxStyle}>
        You do not have permission
        to review FTO role requests.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        Loading FTO role
        requests...
      </div>
    );
  }

  return (
    <div>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>
            FTO Role Requests
          </h2>

          <p style={subtitleStyle}>
            Review existing FTO
            files and approve,
            reject or request
            changes.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadRequests()
          }
          style={
            secondaryButtonStyle
          }
        >
          Refresh
        </button>
      </div>

      <div style={filterRowStyle}>
        {(
          [
            [
              "pending",
              "Pending",
            ],
            [
              "changes_requested",
              "Changes Requested",
            ],
            [
              "approved",
              "Approved",
            ],
            [
              "rejected",
              "Rejected",
            ],
            [
              "all",
              "All",
            ],
          ] as const
        ).map(
          ([
            value,
            label,
          ]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setStatusFilter(
                  value
                )
              }
              style={{
                ...filterButtonStyle,
                backgroundColor:
                  statusFilter ===
                  value
                    ? "#2563eb"
                    : "#1e293b",
                borderColor:
                  statusFilter ===
                  value
                    ? "#3b82f6"
                    : "#475569",
              }}
            >
              {label}
            </button>
          )
        )}
      </div>

      {error && (
        <div style={errorBoxStyle}>
          {error}
        </div>
      )}

      {success && (
        <div style={successBoxStyle}>
          {success}
        </div>
      )}

      {filteredRequests.length ===
      0 ? (
        <div style={emptyStateStyle}>
          No role requests match
          this filter.
        </div>
      ) : (
        <div style={requestListStyle}>
          {filteredRequests.map(
            (request) => (
              <button
                key={
                  request.id
                }
                type="button"
                onClick={() => {
                  setSelectedRequest(
                    request
                  );

                  setError("");
                  setSuccess("");
                }}
                style={
                  requestCardStyle
                }
              >
                <div>
                  <div style={nameRowStyle}>
                    <strong>
                      {request.profile
                        ?.name ??
                        "Unknown Officer"}
                    </strong>

                    <StatusBadge
                      status={
                        request.status
                      }
                    />
                  </div>

                  <div style={metaStyle}>
                    {request.profile
                      ?.rank ??
                      "Unknown Rank"}
                    {" • "}
                    Badge{" "}
                    {request.profile
                      ?.badge_number ??
                      "N/A"}
                    {" • "}
                    Submitted{" "}
                    {formatDateTime(
                      request.created_at
                    )}
                  </div>
                </div>

                <span style={viewStyle}>
                  Review Request
                </span>
              </button>
            )
          )}
        </div>
      )}

      {selectedRequest && (
        <div
          style={modalOverlayStyle}
          onClick={() =>
            setSelectedRequest(
              null
            )
          }
        >
          <div
            style={modalStyle}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2
                  style={{
                    margin:
                      "0 0 6px",
                  }}
                >
                  FTO Role Request
                </h2>

                <p
                  style={{
                    ...subtitleStyle,
                    margin: 0,
                  }}
                >
                  {selectedRequest
                    .profile?.name ??
                    "Unknown Officer"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
                style={
                  closeButtonStyle
                }
              >
                ×
              </button>
            </div>

            <div style={detailsGridStyle}>
              <Detail
                label="Officer"
                value={
                  selectedRequest
                    .profile?.name ??
                  "Unknown"
                }
              />

              <Detail
                label="Police Rank"
                value={
                  selectedRequest
                    .profile?.rank ??
                  "Unknown"
                }
              />

              <Detail
                label="Badge / Serial"
                value={
                  selectedRequest
                    .profile
                    ?.badge_number ??
                  "N/A"
                }
              />

              <Detail
                label="Work Number"
                value={
                  selectedRequest
                    .profile
                    ?.work_number ??
                  "N/A"
                }
              />

              <Detail
                label="Current Portal Role"
                value={
                  selectedRequest
                    .profile?.role ??
                  "Unknown"
                }
              />

              <Detail
                label="Submitted"
                value={formatDateTime(
                  selectedRequest.created_at
                )}
              />
            </div>

            {parsedPreview && (
              <div style={previewCardStyle}>
                <div style={previewHeaderStyle}>
                  <div>
                    <h3
                      style={{
                        margin:
                          "0 0 6px",
                      }}
                    >
                      Parsed Import Preview
                    </h3>

                    <p
                      style={{
                        ...subtitleStyle,
                        margin: 0,
                      }}
                    >
                      Review what will be imported before approval.
                    </p>
                  </div>

                  <span style={entryCountStyle}>
                    {
                      parsedPreview.entries.length
                    }{" "}
                    entries
                  </span>
                </div>

                <div style={detailsGridStyle}>
                  <Detail
                    label="Parsed Officer"
                    value={
                      parsedPreview.officerName ||
                      "Not found"
                    }
                  />

                  <Detail
                    label="Parsed Serial"
                    value={
                      parsedPreview.serialNumber ||
                      "Not found"
                    }
                  />

                  <Detail
                    label="Division"
                    value={
                      parsedPreview.division ||
                      "Not found"
                    }
                  />

                  <Detail
                    label="Stated Total"
                    value={
                      parsedPreview.statedTotalInstructionText ||
                      "Not found"
                    }
                  />

                  <Detail
                    label="Calculated Total"
                    value={formatMinutes(
                      parsedPreview.calculatedTotalInstructionMinutes
                    )}
                  />

                  <Detail
                    label="Monthly Sections"
                    value={String(
                      parsedPreview.monthlyLogs.length
                    )}
                  />
                </div>

                {parsedPreview.repairs.length > 0 && (
                  <div style={repairBoxStyle}>
                    <strong>
                      Automatic repairs
                    </strong>

                    <ul style={warningListStyle}>
                      {parsedPreview.repairs.map(
                        (
                          repair,
                          index
                        ) => (
                          <li key={index}>
                            {repair}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {parsedPreview.warnings.length > 0 && (
                  <div style={warningBoxStyle}>
                    <strong>
                      Parser warnings
                    </strong>

                    <ul style={warningListStyle}>
                      {parsedPreview.warnings.map(
                        (
                          warning,
                          index
                        ) => (
                          <li key={index}>
                            {warning}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <label style={labelStyle}>
              Submitted FTO File
              BBCode
            </label>

            <textarea
              value={
                selectedRequest.original_bbcode
              }
              readOnly
              style={
                bbcodeStyle
              }
            />

            <label style={labelStyle}>
              Reviewer Notes
            </label>

            <textarea
              value={
                reviewerNotes
              }
              onChange={(event) =>
                setReviewerNotes(
                  event.target.value
                )
              }
              placeholder="Add notes for the applicant, especially when rejecting or requesting changes."
              disabled={
                processing
              }
              style={
                notesStyle
              }
            />

            <div style={actionRowStyle}>
              <button
                type="button"
                onClick={() =>
                  void reviewRequest(
                    "changes_requested"
                  )
                }
                disabled={
                  processing
                }
                style={
                  changesButtonStyle
                }
              >
                Request Changes
              </button>

              <button
                type="button"
                onClick={() =>
                  void reviewRequest(
                    "rejected"
                  )
                }
                disabled={
                  processing
                }
                style={
                  rejectButtonStyle
                }
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() =>
                  void reviewRequest(
                    "approved"
                  )
                }
                disabled={
                  processing
                }
                style={
                  approveButtonStyle
                }
              >
                {processing
                  ? "Processing..."
                  : "Approve FTO"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: RequestStatus;
}) {
  const labels:
    Record<
      RequestStatus,
      string
    > = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    changes_requested:
      "Changes Requested",
  };

  return (
    <span
      style={{
        ...statusBadgeStyle,
        backgroundColor:
          getStatusBackground(
            status
          ),
        color:
          getStatusText(
            status
          ),
      }}
    >
      {labels[status]}
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p style={detailLabelStyle}>
        {label}
      </p>

      <p style={detailValueStyle}>
        {value}
      </p>
    </div>
  );
}

function getStatusBackground(
  status: RequestStatus
) {
  switch (status) {
    case "approved":
      return "rgba(20, 83, 45, 0.4)";

    case "rejected":
      return "rgba(127, 29, 29, 0.4)";

    case "changes_requested":
      return "rgba(120, 53, 15, 0.4)";

    default:
      return "rgba(30, 64, 175, 0.4)";
  }
}

function getStatusText(
  status: RequestStatus
) {
  switch (status) {
    case "approved":
      return "#bbf7d0";

    case "rejected":
      return "#fecaca";

    case "changes_requested":
      return "#fde68a";

    default:
      return "#bfdbfe";
  }
}

function formatDateTime(
  value: string
) {
  if (!value) {
    return "Unknown";
  }

  return new Date(
    value
  ).toLocaleString(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }
  );
}

const cardStyle = {
  padding: "24px",
  color: "white",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "12px",
};

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "18px",
  marginBottom: "22px",
  flexWrap: "wrap" as const,
};

const titleStyle = {
  margin: "0 0 6px",
};

const subtitleStyle = {
  color: "#94a3b8",
};

const filterRowStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
};

const filterButtonStyle = {
  padding: "9px 13px",
  color: "white",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const requestListStyle = {
  display: "grid",
  gap: "12px",
};

const requestCardStyle = {
  width: "100%",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "18px",
  color: "white",
  textAlign: "left" as const,
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "10px",
  cursor: "pointer",
};

const nameRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const metaStyle = {
  marginTop: "7px",
  color: "#94a3b8",
  fontSize: "13px",
};

const viewStyle = {
  color: "#60a5fa",
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
};

const statusBadgeStyle = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const errorBoxStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
};

const successBoxStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border:
    "1px solid #166534",
  borderRadius: "8px",
};

const emptyStateStyle = {
  padding: "24px",
  color: "#94a3b8",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "10px",
};

const modalOverlayStyle = {
  position:
    "fixed" as const,
  inset: 0,
  display: "flex",
  justifyContent:
    "center",
  alignItems: "center",
  padding: "24px",
  backgroundColor:
    "rgba(2, 6, 23, 0.88)",
  zIndex: 1000,
};

const modalStyle = {
  width: "100%",
  maxWidth: "1000px",
  maxHeight: "92vh",
  overflowY:
    "auto" as const,
  padding: "28px",
  color: "white",
  backgroundColor: "#1e293b",
  border:
    "1px solid #475569",
  borderRadius: "14px",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "20px",
  marginBottom: "22px",
};

const closeButtonStyle = {
  padding: "0 8px",
  color: "white",
  backgroundColor:
    "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "30px",
  lineHeight: 1,
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "16px",
  padding: "18px",
  marginBottom: "20px",
  backgroundColor: "#0f172a",
  borderRadius: "10px",
};

const detailLabelStyle = {
  margin: "0 0 5px",
  color: "#94a3b8",
  fontSize: "13px",
};

const detailValueStyle = {
  margin: 0,
  fontWeight: 700,
};

const labelStyle = {
  display: "block",
  margin:
    "18px 0 8px",
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: 700,
};

const bbcodeStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  minHeight: "330px",
  padding: "14px",
  color: "white",
  backgroundColor: "#0f172a",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
  fontFamily: "monospace",
  lineHeight: 1.5,
};

const notesStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  minHeight: "110px",
  padding: "12px",
  color: "white",
  backgroundColor: "#0f172a",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
};

const actionRowStyle = {
  display: "flex",
  justifyContent:
    "flex-end",
  gap: "12px",
  marginTop: "22px",
  flexWrap: "wrap" as const,
};

const changesButtonStyle = {
  padding: "11px 16px",
  color: "white",
  backgroundColor: "#a16207",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const rejectButtonStyle = {
  padding: "11px 16px",
  color: "white",
  backgroundColor: "#b91c1c",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const approveButtonStyle = {
  padding: "11px 16px",
  color: "white",
  backgroundColor: "#16a34a",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};


const previewCardStyle = {
  padding: "18px",
  marginBottom: "20px",
  backgroundColor: "#172033",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const previewHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const entryCountStyle = {
  padding: "6px 10px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.18)",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 800,
};

const warningBoxStyle = {
  padding: "14px",
  color: "#fde68a",
  backgroundColor:
    "rgba(120, 53, 15, 0.3)",
  border: "1px solid #a16207",
  borderRadius: "8px",
};

const warningListStyle = {
  margin: "10px 0 0",
  paddingLeft: "20px",
  lineHeight: 1.5,
};


const repairBoxStyle = {
  padding: "14px",
  marginBottom: "12px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
};