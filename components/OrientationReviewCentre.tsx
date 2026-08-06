"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import { auditAction } from "../lib/auditAction";

type Props = {
  user: any;
};

type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected";

type OrientationChecklist = {
  divisionalNotebookCreated?: boolean;
  uniformAndEquipmentChecks?: boolean;
  missionRowFamiliarisation?: boolean;
  radioSetup?: boolean;
  vehicleChecks?: boolean;
  teamspeakBinds?: boolean;
  vehicleSpawning?: boolean;
  generalFactionCommands?: boolean;
};

type OrientationReport = {
  id: string;
  trainee_id: string;
  completing_officer_id:
    | string
    | null;
  completing_officer_name: string;
  completing_officer_badge: string;
  patrol_date: string;
  start_time: string;
  end_time: string;
  duration: string;
  checklist:
    | OrientationChecklist
    | null;
  incidents_tasks: string;
  bbcode: string;
  created_at: string;
  status: ReviewStatus;
  reviewed_by:
    | string
    | null;
  reviewed_at:
    | string
    | null;
  rejection_reason:
    | string
    | null;
  traineeName: string;
  traineeBadge: string;
};

const checklistLabels: {
  key:
    keyof OrientationChecklist;
  label: string;
}[] = [
  {
    key:
      "divisionalNotebookCreated",
    label:
      "Probationer's Divisional Notebook Created",
  },
  {
    key:
      "uniformAndEquipmentChecks",
    label:
      "Uniform and Equipment Checks",
  },
  {
    key:
      "missionRowFamiliarisation",
    label:
      "Mission Row Familiarisation",
  },
  {
    key:
      "radioSetup",
    label:
      "Radio Setup",
  },
  {
    key:
      "vehicleChecks",
    label:
      "Vehicle Checks",
  },
  {
    key:
      "teamspeakBinds",
    label:
      "TeamSpeak Binds",
  },
  {
    key:
      "vehicleSpawning",
    label:
      "Vehicle Spawning",
  },
  {
    key:
      "generalFactionCommands",
    label:
      "General Faction Commands",
  },
];

export default function OrientationReviewCentre({
  user,
}: Props) {
  const [
    reports,
    setReports,
  ] = useState<
    OrientationReport[]
  >([]);

  const [
    activeStatus,
    setActiveStatus,
  ] = useState<ReviewStatus>(
    "pending"
  );

  const [
    selectedReport,
    setSelectedReport,
  ] = useState<
    OrientationReport |
    null
  >(null);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

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
    message,
    setMessage,
  ] = useState("");

  const visibleReports =
    useMemo(
      () =>
        reports.filter(
          (report) =>
            report.status ===
            activeStatus
        ),
      [
        reports,
        activeStatus,
      ]
    );

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const {
        data:
          reportRows,
        error:
          reportError,
      } = await supabase
        .from(
          "orientation_reports"
        )
        .select(`
          id,
          trainee_id,
          completing_officer_id,
          completing_officer_name,
          completing_officer_badge,
          patrol_date,
          start_time,
          end_time,
          duration,
          checklist,
          incidents_tasks,
          bbcode,
          created_at,
          status,
          reviewed_by,
          reviewed_at,
          rejection_reason
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (reportError) {
        throw reportError;
      }

      const rows =
        reportRows ?? [];

      const traineeIds = [
        ...new Set(
          rows.map(
            (report) =>
              report.trainee_id
          )
        ),
      ];

      let traineeRows: {
        id: string;
        profile_id:
          | string
          | null;
      }[] = [];

      if (
        traineeIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from("trainees")
          .select(`
            id,
            profile_id
          `)
          .in(
            "id",
            traineeIds
          );

        if (error) {
          throw error;
        }

        traineeRows =
          data ?? [];
      }

      const profileIds = [
        ...new Set(
          traineeRows
            .map(
              (trainee) =>
                trainee.profile_id
            )
            .filter(
              (
                profileId
              ): profileId is string =>
                Boolean(
                  profileId
                )
            )
        ),
      ];

      let profiles: {
        id: string;
        name:
          | string
          | null;
        badge_number:
          | string
          | null;
      }[] = [];

      if (
        profileIds.length > 0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            name,
            badge_number
          `)
          .in(
            "id",
            profileIds
          );

        if (error) {
          throw error;
        }

        profiles =
          data ?? [];
      }

      setReports(
        rows.map(
          (report) => {
            const trainee =
              traineeRows.find(
                (item) =>
                  item.id ===
                  report.trainee_id
              );

            const profile =
              profiles.find(
                (item) =>
                  item.id ===
                  trainee
                    ?.profile_id
              );

            return {
              ...report,
              status:
                (report.status ??
                  "pending") as ReviewStatus,
              traineeName:
                profile?.name ??
                "Unknown Officer",
              traineeBadge:
                profile?.badge_number ??
                "N/A",
            };
          }
        )
      );
    } catch (loadError) {
      console.error(
        "LOAD ORIENTATION REVIEWS ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Orientation reports could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function reviewReport(
    report:
      OrientationReport,
    action:
      | "approve"
      | "reject"
  ) {
    if (
      action === "reject" &&
      !rejectionReason.trim()
    ) {
      setError(
        "Enter a rejection reason before rejecting this report."
      );
      return;
    }

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      const reviewedAt =
        new Date().toISOString();

      const nextStatus:
        ReviewStatus =
        action === "approve"
          ? "approved"
          : "rejected";

      await auditAction({
        user,

        action:
          action === "approve"
            ? "APPROVE_ORIENTATION_REPORT"
            : "REJECT_ORIENTATION_REPORT",

        category:
          "Orientations",

        entityType:
          "orientation_report",

        entityId:
          report.id,

        targetName:
          report.traineeName,

        oldData: {
          status:
            report.status,
          reviewed_by:
            report.reviewed_by,
          reviewed_at:
            report.reviewed_at,
          rejection_reason:
            report.rejection_reason,
        },

        newData: {
          status:
            nextStatus,
          reviewed_by:
            user.id,
          reviewed_at:
            reviewedAt,
          rejection_reason:
            action === "reject"
              ? rejectionReason.trim()
              : null,
        },

        reason:
          action === "reject"
            ? rejectionReason.trim()
            : undefined,

        execute:
          async () => {
            const {
              error:
                updateError,
            } = await supabase
              .from(
                "orientation_reports"
              )
              .update({
                status:
                  nextStatus,
                reviewed_by:
                  user.id,
                reviewed_at:
                  reviewedAt,
                rejection_reason:
                  action === "reject"
                    ? rejectionReason.trim()
                    : null,
              })
              .eq(
                "id",
                report.id
              );

            if (
              updateError
            ) {
              throw updateError;
            }

            return {
              status:
                nextStatus,
              reviewedAt,
            };
          },
      });

      setReports(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              report.id
                ? {
                    ...item,
                    status:
                      nextStatus,
                    reviewed_by:
                      user.id,
                    reviewed_at:
                      reviewedAt,
                    rejection_reason:
                      action ===
                      "reject"
                        ? rejectionReason.trim()
                        : null,
                  }
                : item
          )
      );

      setSelectedReport(
        null
      );
      setRejectionReason("");

      setMessage(
        action === "approve"
          ? `${report.traineeName}'s Orientation Report has been approved.`
          : `${report.traineeName}'s Orientation Report has been rejected.`
      );
    } catch (reviewError) {
      console.error(
        "REVIEW ORIENTATION REPORT ERROR",
        reviewError
      );

      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "The Orientation Report could not be reviewed."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function copyBBCode(
    report:
      OrientationReport
  ) {
    try {
      await navigator.clipboard.writeText(
        report.bbcode
      );

      setMessage(
        "Orientation BBCode copied."
      );
    } catch (copyError) {
      console.error(
        "COPY ORIENTATION BBCODE ERROR",
        copyError
      );

      setError(
        "The Orientation BBCode could not be copied."
      );
    }
  }

  return (
    <div style={pageStyle}>
      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {message && (
        <div style={successStyle}>
          {message}
        </div>
      )}

      <section style={panelStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>
              Orientation Reports
            </h3>

            <p style={sectionTextStyle}>
              Review public Orientation Patrol submissions before they count as completed.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadReports()
            }
            style={secondaryButtonStyle}
          >
            Refresh
          </button>
        </div>

        <div style={tabsStyle}>
          {(
            [
              "pending",
              "approved",
              "rejected",
            ] as ReviewStatus[]
          ).map(
            (status) => {
              const count =
                reports.filter(
                  (report) =>
                    report.status ===
                    status
                ).length;

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setActiveStatus(
                      status
                    )
                  }
                  style={{
                    ...tabStyle,
                    ...(activeStatus ===
                    status
                      ? activeTabStyle
                      : {}),
                  }}
                >
                  {capitalise(
                    status
                  )}

                  <span style={countStyle}>
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {loading ? (
          <div style={emptyStyle}>
            Loading Orientation Reports...
          </div>
        ) : visibleReports.length ===
          0 ? (
          <div style={emptyStyle}>
            No {activeStatus} Orientation Reports.
          </div>
        ) : (
          <div style={listStyle}>
            {visibleReports.map(
              (report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => {
                    setSelectedReport(
                      report
                    );
                    setRejectionReason(
                      report.rejection_reason ??
                      ""
                    );
                    setError("");
                    setMessage("");
                  }}
                  style={reportCardStyle}
                >
                  <div>
                    <span style={metaStyle}>
                      ORIENTATION REPORT
                    </span>

                    <h3 style={cardTitleStyle}>
                      {report.traineeName}
                    </h3>

                    <p style={secondaryStyle}>
                      Completed by {report.completing_officer_name}
                      {" • "}
                      {formatDate(
                        report.patrol_date
                      )}
                      {" • "}
                      {report.duration}
                    </p>
                  </div>

                  <span style={viewStyle}>
                    Review Report
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </section>

      {selectedReport && (
        <div
          style={modalOverlayStyle}
          onClick={() =>
            setSelectedReport(
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
                <p style={metaStyle}>
                  ORIENTATION REPORT
                </p>

                <h2 style={modalTitleStyle}>
                  {selectedReport.traineeName}
                </h2>

                <p style={secondaryStyle}>
                  Submitted {formatDateTime(
                    selectedReport.created_at
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedReport(
                    null
                  )
                }
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <div style={detailsGridStyle}>
              <Detail
                label="Probationary Officer"
                value={
                  selectedReport.traineeName
                }
              />

              <Detail
                label="P1 Serial"
                value={
                  selectedReport.traineeBadge
                }
              />

              <Detail
                label="Completing Officer"
                value={
                  selectedReport.completing_officer_name
                }
              />

              <Detail
                label="Officer Serial"
                value={
                  selectedReport.completing_officer_badge
                }
              />

              <Detail
                label="Date"
                value={formatDate(
                  selectedReport.patrol_date
                )}
              />

              <Detail
                label="Time"
                value={`${selectedReport.start_time} - ${selectedReport.end_time}`}
              />

              <Detail
                label="Duration"
                value={
                  selectedReport.duration
                }
              />

              <Detail
                label="Status"
                value={capitalise(
                  selectedReport.status
                )}
              />
            </div>

            <div style={contentSectionStyle}>
              <h3>
                Orientation Checklist
              </h3>

              <div style={checklistStyle}>
                {checklistLabels.map(
                  (item) => {
                    const complete =
                      selectedReport
                        .checklist
                        ?.[
                          item.key
                        ] ?? false;

                    return (
                      <div
                        key={item.key}
                        style={checklistRowStyle}
                      >
                        <span
                          style={{
                            ...checklistIconStyle,
                            color:
                              complete
                                ? "#bbf7d0"
                                : "#fecaca",
                            borderColor:
                              complete
                                ? "#166534"
                                : "#991b1b",
                            backgroundColor:
                              complete
                                ? "rgba(20,83,45,.35)"
                                : "rgba(127,29,29,.3)",
                          }}
                        >
                          {complete
                            ? "✓"
                            : "✕"}
                        </span>

                        <span>
                          {item.label}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div style={contentSectionStyle}>
              <h3>
                Incidents / Tasks
              </h3>

              <p style={reportTextStyle}>
                {selectedReport.incidents_tasks}
              </p>
            </div>

            {selectedReport.rejection_reason && (
              <div style={rejectionStyle}>
                <strong>
                  Rejection reason
                </strong>

                <span>
                  {selectedReport.rejection_reason}
                </span>
              </div>
            )}

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() =>
                  void copyBBCode(
                    selectedReport
                  )
                }
                style={secondaryButtonStyle}
              >
                Copy BBCode
              </button>

              {selectedReport.status ===
                "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void reviewReport(
                        selectedReport,
                        "approve"
                      )
                    }
                    disabled={
                      processing
                    }
                    style={approveButtonStyle}
                  >
                    {processing
                      ? "Processing..."
                      : "Approve"}
                  </button>
                </>
              )}
            </div>

            {selectedReport.status ===
              "pending" && (
              <div style={rejectPanelStyle}>
                <label style={labelStyle}>
                  Rejection reason
                </label>

                <textarea
                  value={
                    rejectionReason
                  }
                  onChange={(event) =>
                    setRejectionReason(
                      event.target.value
                    )
                  }
                  placeholder="Required when rejecting an Orientation Report."
                  disabled={
                    processing
                  }
                  style={textareaStyle}
                />

                <button
                  type="button"
                  onClick={() =>
                    void reviewReport(
                      selectedReport,
                      "reject"
                    )
                  }
                  disabled={
                    processing
                  }
                  style={rejectButtonStyle}
                >
                  Reject Orientation Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
    <div style={detailStyle}>
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function capitalise(
  value: string
) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function formatDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00Z`
  ).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}

function formatDateTime(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }
  );
}

const pageStyle = {
  display: "grid",
  gap: "16px",
};

const panelStyle = {
  padding: "22px",
  backgroundColor: "#111827",
  border:
    "1px solid #29364c",
  borderRadius: "14px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const sectionTitleStyle = {
  margin: "0 0 6px",
};

const sectionTextStyle = {
  margin: 0,
  color: "#94a3b8",
};

const tabsStyle = {
  display: "flex",
  gap: "9px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const tabStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 14px",
  color: "#cbd5e1",
  backgroundColor: "#1e293b",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#334155",
  borderRadius: "8px",
  cursor: "pointer",
};

const activeTabStyle = {
  color: "white",
  backgroundColor: "#1d4ed8",
  borderColor: "#3b82f6",
};

const countStyle = {
  minWidth: "22px",
  padding: "2px 6px",
  backgroundColor:
    "rgba(15,23,42,.5)",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const listStyle = {
  display: "grid",
  gap: "12px",
};

const reportCardStyle = {
  width: "100%",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "18px",
  color: "white",
  textAlign: "left" as const,
  backgroundColor: "#0f172a",
  border:
    "1px solid #334155",
  borderLeft:
    "4px solid #3b82f6",
  borderRadius: "10px",
  cursor: "pointer",
};

const metaStyle = {
  margin: 0,
  color: "#60a5fa",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const cardTitleStyle = {
  margin: "6px 0",
};

const secondaryStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.5,
};

const viewStyle = {
  color: "#60a5fa",
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
};

const emptyStyle = {
  padding: "28px",
  color: "#64748b",
  textAlign: "center" as const,
};

const errorStyle = {
  padding: "13px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127,29,29,.3)",
  border:
    "1px solid #991b1b",
  borderRadius: "9px",
};

const successStyle = {
  padding: "13px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20,83,45,.3)",
  border:
    "1px solid #166534",
  borderRadius: "9px",
};

const secondaryButtonStyle = {
  padding: "9px 12px",
  color: "#e2e8f0",
  backgroundColor: "#334155",
  border:
    "1px solid #475569",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const approveButtonStyle = {
  padding: "10px 14px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20,83,45,.35)",
  border:
    "1px solid #166534",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const rejectButtonStyle = {
  padding: "10px 14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127,29,29,.3)",
  border:
    "1px solid #991b1b",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const modalOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 1000,
  display: "grid",
  placeItems: "center",
  padding: "24px",
  backgroundColor:
    "rgba(2,6,23,.88)",
};

const modalStyle = {
  width: "100%",
  maxWidth: "960px",
  maxHeight: "92vh",
  overflowY: "auto" as const,
  padding: "26px",
  color: "white",
  backgroundColor: "#111827",
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
  marginBottom: "20px",
};

const modalTitleStyle = {
  margin: "5px 0 6px",
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
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};

const detailStyle = {
  display: "grid",
  gap: "5px",
  padding: "12px",
  backgroundColor: "#0f172a",
  borderRadius: "8px",
  fontSize: "12px",
};

const contentSectionStyle = {
  padding: "18px 0",
  borderBottom:
    "1px solid #334155",
};

const checklistStyle = {
  display: "grid",
  gap: "9px",
};

const checklistRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  padding: "10px",
  backgroundColor: "#0f172a",
  borderRadius: "8px",
};

const checklistIconStyle = {
  width: "24px",
  height: "24px",
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: "999px",
  fontWeight: 900,
};

const reportTextStyle = {
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.6,
};

const rejectionStyle = {
  display: "grid",
  gap: "6px",
  padding: "13px",
  marginTop: "16px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127,29,29,.25)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
};

const rejectPanelStyle = {
  display: "grid",
  gap: "10px",
  paddingTop: "18px",
  marginTop: "18px",
  borderTop:
    "1px solid #334155",
};

const labelStyle = {
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: 700,
};

const textareaStyle = {
  width: "100%",
  minHeight: "110px",
  boxSizing: "border-box" as const,
  padding: "12px",
  color: "white",
  backgroundColor: "#020617",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
};

const buttonRowStyle = {
  display: "flex",
  justifyContent:
    "flex-end",
  gap: "10px",
  marginTop: "20px",
  flexWrap: "wrap" as const,
};