"use client";

import {
  useEffect,
  useState,
} from "react";

import BBCodeRecord from "./BBCodeRecord";
import { supabase } from "../lib/supabase";

import {
  Trainee,
  NotebookSection,
} from "../lib/types";

import {
  updateTrainee,
} from "../lib/trainees";

type TraineeProfileProps = {
  trainee: Trainee;
  onBack: () => void;
  onUpdate: (
    updatedTrainee: Trainee
  ) => void;
};

type DORRecord = {
  id: string;
  trainee_id: string;
  fto_id: string;
  patrol_number: number;
  patrol_date: string;
  start_time: string;
  end_time: string;
  duration: string;
  incidents: string;
  below_standard:
    | string
    | null;
  above_standard:
    | string
    | null;
  learning_goals:
    | string
    | null;
  roleplay_remarks:
    | string
    | null;
  ratings:
    | Record<
        string,
        string
      >
    | null;
  bbcode: string;
  created_at: string;
  ftoName: string;
};

const evaluationLabels:
  Record<string, string> = {
  "1": "General Appearance",
  "2":
    "Attitude towards the Job and Feedback",
  "3":
    "Department Policies/Procedures",
  "4":
    "Law, Penal Code, Search and Seizure",
  "5":
    "Driving Skill: General",
  "6":
    "Driving Skill: Orientation and Response Time to Calls",
  "7":
    "Report Writing: Accuracy/Grammar/Organisation",
  "8":
    "Field Performance",
  "9":
    "Self-Initiated Field Activities",
  "10":
    "Field Activities: Traffic Stop",
  "11":
    "Field Activities: Arrest Procedure",
  "12":
    "Officer Safety Principles",
  "13":
    "Control of Conflict: Voice Command/Physical Skill",
  "14":
    "Use of Common Sense and Good Judgement",
  "15":
    "Radio/MDC: Use of Mobile Data Computer",
  "16":
    "Radio: Articulation of Transmissions",
  "17":
    "With Citizens/Employees in General",
};

export default function TraineeProfile({
  trainee,
  onBack,
  onUpdate,
}: TraineeProfileProps) {
  const [
    editing,
    setEditing,
  ] = useState(false);

  const [
    name,
    setName,
  ] = useState(
    trainee.name
  );

  const [
    reference,
    setReference,
  ] = useState(
    trainee.reference
  );

  const [
    status,
    setStatus,
  ] = useState(
    trainee.status
  );

  const [
    ftm,
    setFtm,
  ] = useState(
    trainee.ftm
  );

  const [
    dors,
    setDors,
  ] = useState<
    DORRecord[]
  >([]);

  const [
    selectedDOR,
    setSelectedDOR,
  ] = useState<
    DORRecord | null
  >(null);

  const [
    loadingDORs,
    setLoadingDORs,
  ] = useState(true);

  const [
    dorError,
    setDorError,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  useEffect(() => {
    setName(
      trainee.name
    );

    setReference(
      trainee.reference
    );

    setStatus(
      trainee.status
    );

    setFtm(
      trainee.ftm
    );

    loadDORs();
  }, [trainee]);

  function calculateProgress(
    notebook:
      NotebookSection[]
  ) {
    const items =
      notebook.flatMap(
        (section) =>
          section.items
      );

    if (
      items.length === 0
    ) {
      return 0;
    }

    const completed =
      items.filter(
        (item) =>
          item.completed
      ).length;

    return Math.round(
      (
        completed /
        items.length
      ) * 100
    );
  }

  async function loadDORs() {
    setLoadingDORs(true);
    setDorError("");

    try {
      const {
        data: dorData,
        error: dorLoadError,
      } = await supabase
        .from("dors")
        .select("*")
        .eq(
          "trainee_id",
          trainee.id
        )
        .order(
          "patrol_number",
          {
            ascending: false,
          }
        );

      if (dorLoadError) {
        throw dorLoadError;
      }

      const dorRows =
        dorData ?? [];

      const ftoIds = [
        ...new Set(
          dorRows
            .map(
              (dor) =>
                dor.fto_id
            )
            .filter(Boolean)
        ),
      ];

      let ftoProfiles: {
        id: string;
        name:
          | string
          | null;
      }[] = [];

      if (
        ftoIds.length > 0
      ) {
        const {
          data: ftoData,
          error:
            ftoLoadError,
        } = await supabase
          .from("profiles")
          .select(
            "id, name"
          )
          .in(
            "id",
            ftoIds
          );

        if (ftoLoadError) {
          throw ftoLoadError;
        }

        ftoProfiles =
          ftoData ?? [];
      }

      const combined =
        dorRows.map(
          (
            dor
          ): DORRecord => ({
            ...dor,
            ftoName:
              ftoProfiles.find(
                (
                  profile
                ) =>
                  profile.id ===
                  dor.fto_id
              )?.name ??
              "Unknown FTO",
          })
        );

      setDors(combined);
    } catch (error) {
      console.error(
        "DOR HISTORY LOAD ERROR:",
        error
      );

      setDorError(
        error instanceof Error
          ? error.message
          : "DOR history could not be loaded."
      );
    } finally {
      setLoadingDORs(false);
    }
  }

  async function saveProfile() {
    try {
      await updateTrainee(
        trainee.id,
        {
          status,
        }
      );

      onUpdate({
        ...trainee,
        status,
      });

      setEditing(false);
    } catch (error) {
      console.error(
        "Failed saving profile:",
        error
      );
    }
  }

  async function toggleNotebookItem(
    sectionName: string,
    itemId: string
  ) {
    const currentNotebook =
      trainee.notebook ??
      [];

    const updatedNotebook =
      currentNotebook.map(
        (section) => {
          if (
            section.section !==
            sectionName
          ) {
            return section;
          }

          return {
            ...section,
            items:
              section.items.map(
                (item) => {
                  if (
                    item.id !==
                    itemId
                  ) {
                    return item;
                  }

                  return {
                    ...item,
                    completed:
                      !item.completed,
                  };
                }
              ),
          };
        }
      );

    const updatedTrainee = {
      ...trainee,
      notebook:
        updatedNotebook,
      progress:
        calculateProgress(
          updatedNotebook
        ),
    };

    try {
      await updateTrainee(
        trainee.id,
        {
          notebook:
            updatedNotebook,
        }
      );

      onUpdate(
        updatedTrainee
      );
    } catch (error) {
      console.error(
        "Failed updating notebook:",
        error
      );
    }
  }

  async function copyBBCode() {
    if (!selectedDOR) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        selectedDOR.bbcode
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "COPY DOR BBCODE ERROR:",
        error
      );
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={backButtonStyle}
      >
        ← Back to Records
      </button>

      <div style={cardStyle}>
        {!editing ? (
          <div
            style={
              profileHeaderStyle
            }
          >
            <div>
              <p style={mutedStyle}>
                {trainee.reference}
              </p>

              <h2>
                {trainee.name}
              </h2>

              <p style={mutedStyle}>
                Field Training
                Manager:{" "}
                {trainee.ftm ||
                  "Not Assigned"}
              </p>
            </div>

            <button
              onClick={() =>
                setEditing(true)
              }
              style={buttonStyle}
            >
              Edit Profile
            </button>
          </div>
        ) : (
          <>
            <h2>
              Edit Profile
            </h2>

            <input
              value={name}
              disabled
              style={inputStyle}
            />

            <input
              value={reference}
              disabled
              style={inputStyle}
            />

            <input
              value={ftm}
              disabled
              style={inputStyle}
            />

            <input
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value
                )
              }
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
        <h3>
          Training Information
        </h3>

        <div style={infoGridStyle}>
          <Detail
            label="Status"
            value={
              trainee.status
            }
          />

          <Detail
            label="Progress"
            value={`${trainee.progress}%`}
          />

          <Detail
            label="Reports"
            value={String(
              trainee.reports
            )}
          />

          <Detail
            label="Saved DORs"
            value={String(
              dors.length
            )}
          />
        </div>
      </div>

      <div style={cardStyle}>
        <h3>
          Structured Learning
          Checklist
        </h3>

        {(trainee.notebook ??
          []).map(
          (section) => (
            <div
              key={
                section.section
              }
              style={{
                marginBottom:
                  "20px",
              }}
            >
              <h4
                style={{
                  color:
                    "#93c5fd",
                }}
              >
                {
                  section.section
                }
              </h4>

              {section.items.map(
                (item) => (
                  <label
                    key={item.id}
                    style={
                      checklistItemStyle
                    }
                  >
                    <input
                      type="checkbox"
                      checked={
                        item.completed
                      }
                      onChange={() =>
                        toggleNotebookItem(
                          section.section,
                          item.id
                        )
                      }
                    />

                    {" "}

                    {item.label}
                  </label>
                )
              )}
            </div>
          )
        )}
      </div>

      <div style={cardStyle}>
        <div
          style={
            sectionHeaderStyle
          }
        >
          <div>
            <h3
              style={{
                margin:
                  "0 0 6px",
              }}
            >
              DOR History
            </h3>

            <p
              style={{
                ...mutedStyle,
                margin: 0,
              }}
            >
              Saved Daily
              Observation Reports
              for this trainee.
            </p>
          </div>

          <span
            style={
              countBadgeStyle
            }
          >
            {dors.length} DOR
            {dors.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        {loadingDORs ? (
          <p style={mutedStyle}>
            Loading DOR
            history...
          </p>
        ) : dorError ? (
          <div style={errorBoxStyle}>
            Unable to load DOR
            history: {dorError}
          </div>
        ) : dors.length ===
          0 ? (
          <div style={emptyStateStyle}>
            No DORs have been
            submitted for this
            trainee yet.
          </div>
        ) : (
          <div style={dorListStyle}>
            {dors.map(
              (dor) => (
                <button
                  key={dor.id}
                  type="button"
                  onClick={() =>
                    setSelectedDOR(
                      dor
                    )
                  }
                  style={
                    dorCardStyle
                  }
                >
                  <div>
                    <strong>
                      Patrol{" "}
                      {
                        dor.patrol_number
                      }
                    </strong>

                    <div
                      style={
                        dorMetaStyle
                      }
                    >
                      {formatDate(
                        dor.patrol_date
                      )}
                      {" • "}
                      {dor.ftoName}
                      {" • "}
                      {dor.duration}
                    </div>
                  </div>

                  <span
                    style={
                      viewLinkStyle
                    }
                  >
                    View full DOR
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      <BBCodeRecord
        trainee={trainee}
      />

      {selectedDOR && (
        <div
          style={
            modalOverlayStyle
          }
          onClick={() =>
            setSelectedDOR(
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
            <div
              style={
                modalHeaderStyle
              }
            >
              <div>
                <h2
                  style={{
                    margin:
                      "0 0 6px",
                  }}
                >
                  DOR Patrol{" "}
                  {
                    selectedDOR.patrol_number
                  }
                </h2>

                <p
                  style={{
                    ...mutedStyle,
                    margin: 0,
                  }}
                >
                  {formatDate(
                    selectedDOR.patrol_date
                  )}
                  {" • "}
                  {
                    selectedDOR.ftoName
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDOR(
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

            <div
              style={
                modalInfoGridStyle
              }
            >
              <Detail
                label="Patrol Number"
                value={String(
                  selectedDOR.patrol_number
                )}
              />

              <Detail
                label="Date"
                value={formatDate(
                  selectedDOR.patrol_date
                )}
              />

              <Detail
                label="Start Time"
                value={
                  selectedDOR.start_time
                }
              />

              <Detail
                label="End Time"
                value={
                  selectedDOR.end_time
                }
              />

              <Detail
                label="Duration"
                value={
                  selectedDOR.duration
                }
              />

              <Detail
                label="FTO"
                value={
                  selectedDOR.ftoName
                }
              />
            </div>

            <ReportSection
              title="Incidents / Tasks"
              value={
                selectedDOR.incidents
              }
            />

            <ReportSection
              title="Below Standard Performance"
              value={
                selectedDOR.below_standard ||
                "None"
              }
            />

            <ReportSection
              title="Above Standard Performance"
              value={
                selectedDOR.above_standard ||
                "None"
              }
            />

            <ReportSection
              title="Learning Goals"
              value={
                selectedDOR.learning_goals ||
                "None"
              }
            />

            <ReportSection
              title="Roleplay Remarks"
              value={
                selectedDOR.roleplay_remarks ||
                "None"
              }
            />

            <div
              style={
                reportSectionStyle
              }
            >
              <h3>
                Evaluation Ratings
              </h3>

              <div
                style={
                  ratingGridStyle
                }
              >
                {Object.entries(
                  selectedDOR.ratings ??
                    {}
                )
                  .sort(
                    (
                      [first],
                      [second]
                    ) =>
                      Number(first) -
                      Number(second)
                  )
                  .map(
                    ([
                      category,
                      rating,
                    ]) => (
                      <div
                        key={
                          category
                        }
                        style={
                          ratingItemStyle
                        }
                      >
                        <div>
                          <strong>
                            {category}.{" "}
                            {
                              evaluationLabels[
                                category
                              ]
                            }
                          </strong>
                        </div>

                        <span
                          style={
                            ratingBadgeStyle
                          }
                        >
                          {rating}
                        </span>
                      </div>
                    )
                  )}
              </div>
            </div>

            <div
              style={
                modalButtonsStyle
              }
            >
              <button
                type="button"
                onClick={
                  copyBBCode
                }
                style={
                  copyButtonStyle
                }
              >
                {copied
                  ? "Copied!"
                  : "Copy BBCode"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedDOR(
                    null
                  )
                }
                style={
                  secondaryButtonStyle
                }
              >
                Close
              </button>
            </div>
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
    <div>
      <p
        style={
          detailLabelStyle
        }
      >
        {label}
      </p>

      <p
        style={
          detailValueStyle
        }
      >
        {value}
      </p>
    </div>
  );
}

function ReportSection({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={
        reportSectionStyle
      }
    >
      <h3>{title}</h3>

      <p
        style={
          reportTextStyle
        }
      >
        {value}
      </p>
    </div>
  );
}

function formatDate(
  date: string
) {
  if (!date) {
    return "Unknown date";
  }

  const [
    year,
    month,
    day,
  ] = date.split("-");

  return `${day}/${month}/${year}`;
}

const cardStyle = {
  padding: "24px",
  marginBottom: "22px",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "12px",
};

const backButtonStyle = {
  marginBottom: "22px",
  padding: "10px 14px",
  backgroundColor: "#1e293b",
  color: "white",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  cursor: "pointer",
};

const profileHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "20px",
  flexWrap: "wrap" as const,
};

const mutedStyle = {
  color: "#94a3b8",
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "12px",
  marginBottom: "12px",
  backgroundColor: "#0f172a",
  color: "white",
  border:
    "1px solid #475569",
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

const secondaryButtonStyle = {
  padding: "10px 16px",
  backgroundColor: "#475569",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const infoGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "20px",
};

const checklistItemStyle = {
  display: "block",
  marginBottom: "8px",
  cursor: "pointer",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "18px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
};

const countBadgeStyle = {
  padding: "6px 10px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.18)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 700,
};

const dorListStyle = {
  display: "grid",
  gap: "10px",
};

const dorCardStyle = {
  width: "100%",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "15px",
  color: "white",
  textAlign:
    "left" as const,
  backgroundColor: "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: "9px",
  cursor: "pointer",
};

const dorMetaStyle = {
  marginTop: "6px",
  color: "#94a3b8",
  fontSize: "13px",
};

const viewLinkStyle = {
  color: "#60a5fa",
  fontWeight: 700,
  whiteSpace:
    "nowrap" as const,
};

const emptyStateStyle = {
  padding: "18px",
  color: "#94a3b8",
  backgroundColor: "#0f172a",
  borderRadius: "8px",
};

const errorBoxStyle = {
  padding: "14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
};

const detailLabelStyle = {
  margin: "0 0 5px",
  color: "#94a3b8",
  fontSize: "14px",
};

const detailValueStyle = {
  margin: 0,
  fontSize: "16px",
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
    "rgba(2, 6, 23, 0.86)",
  zIndex: 1000,
};

const modalStyle = {
  width: "100%",
  maxWidth: "950px",
  maxHeight: "90vh",
  overflowY:
    "auto" as const,
  padding: "28px",
  color: "white",
  backgroundColor:
    "#1e293b",
  border:
    "1px solid #475569",
  borderRadius: "14px",
  boxShadow:
    "0 24px 60px rgba(0, 0, 0, 0.45)",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "20px",
  marginBottom: "24px",
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

const modalInfoGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "16px",
  padding: "18px",
  marginBottom: "20px",
  backgroundColor: "#0f172a",
  borderRadius: "10px",
};

const reportSectionStyle = {
  padding: "18px 0",
  borderBottom:
    "1px solid #334155",
};

const reportTextStyle = {
  marginBottom: 0,
  whiteSpace:
    "pre-wrap" as const,
  lineHeight: 1.6,
};

const ratingGridStyle = {
  display: "grid",
  gap: "10px",
};

const ratingItemStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "12px",
  backgroundColor: "#0f172a",
  borderRadius: "8px",
};

const ratingBadgeStyle = {
  minWidth: "48px",
  padding: "6px 9px",
  textAlign:
    "center" as const,
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.18)",
  border:
    "1px solid #2563eb",
  borderRadius: "7px",
  fontWeight: 800,
};

const modalButtonsStyle = {
  display: "flex",
  justifyContent:
    "flex-end",
  gap: "12px",
  marginTop: "24px",
  flexWrap: "wrap" as const,
};

const copyButtonStyle = {
  padding: "10px 16px",
  backgroundColor: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};