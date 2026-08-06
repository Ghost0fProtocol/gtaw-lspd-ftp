"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getTrainees,
} from "../lib/trainees";

import TraineeProfile from "./TraineeProfile";
import CreateTrainee from "./CreateTrainee";

import type {
  NotebookSection,
  Trainee,
  TrainingStage,
} from "../lib/types";

type RecordsProps = {
  user: any;
  openDOR: (
    traineeId: string
  ) => void;
};

type RecordsTab =
  | "active"
  | "archived";

type RecordTrainee =
  Trainee & {
    archived: boolean;
    archivedAt:
      | string
      | null;
  };

function calculateProgress(
  notebook: NotebookSection[] = []
) {
  const items =
    notebook.flatMap(
      (section) =>
        section.items ?? []
    );

  if (items.length === 0) {
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

function formatTrainee(
  trainee: any
): RecordTrainee {
  const notebook =
    (
      trainee.notebook ??
      []
    ) as NotebookSection[];

  return {
    id: trainee.id,

    profileId:
      trainee.profile_id ??
      trainee.profile?.id ??
      undefined,

    name:
      trainee.profile?.name ??
      "Unknown",

    reference:
      trainee.profile?.reference ??
      "N/A",

    status:
      trainee.status ??
      "Unknown",

    progress:
      calculateProgress(
        notebook
      ),

    reports: 0,

    lastActivity:
      "No activity",

    ftm:
      trainee.ftm?.name ??
      "",

    assignedFtmId:
      trainee.assigned_ftm ??
      trainee.ftm?.id ??
      null,

    notebook,

    trainingStage:
      (
        trainee.training_stage ??
        "Week 1"
      ) as TrainingStage,

    week1PPOWEROutcome:
      trainee.week_1_ppower_outcome ??
      null,

    week2PPOWEROutcome:
      trainee.week_2_ppower_outcome ??
      null,

    week1PPOWERCompletedAt:
      trainee.week_1_ppower_completed_at ??
      null,

    week2PPOWERCompletedAt:
      trainee.week_2_ppower_completed_at ??
      null,

    fppStartedAt:
      trainee.fpp_started_at ??
      null,

    finalEvaluationUnlockedAt:
      trainee.final_evaluation_unlocked_at ??
      null,

    finalEvaluationCompletedAt:
      trainee.final_evaluation_completed_at ??
      null,

    finalEvaluationDORId:
      trainee.final_evaluation_dor_id ??
      null,

    progressionUpdatedAt:
      trainee.progression_updated_at ??
      null,

    progressionUpdatedBy:
      trainee.progression_updated_by ??
      null,

    promotedToP2At:
      trainee.promoted_to_p2_at ??
      null,

    promotedToP2By:
      trainee.promoted_to_p2_by ??
      null,

    archived:
      trainee.archived ===
      true,

    archivedAt:
      trainee.archived_at ??
      null,
  };
}

export default function Records({
  user,
  openDOR,
}: RecordsProps) {
  const [
    traineeRecords,
    setTraineeRecords,
  ] = useState<RecordTrainee[]>([]);

  const [
    activeTab,
    setActiveTab,
  ] = useState<RecordsTab>(
    "active"
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    selectedTrainee,
    setSelectedTrainee,
  ] =
    useState<RecordTrainee | null>(
      null
    );

  const [
    creatingRecord,
    setCreatingRecord,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  async function loadTrainees() {
    setLoading(true);
    setError("");

    try {
      const data =
        await getTrainees();

      const formatted =
        data.map(
          formatTrainee
        );

      setTraineeRecords(
        formatted
      );

      setSelectedTrainee(
        (current) => {
          if (!current) {
            return null;
          }

          return (
            formatted.find(
              (trainee) =>
                trainee.id ===
                current.id
            ) ?? null
          );
        }
      );
    } catch (loadError) {
      console.error(
        "LOAD TRAINING RECORDS ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Training records could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrainees();
  }, []);

  const normalisedSearch =
    searchTerm
      .trim()
      .toLowerCase();

  const activeCount =
    traineeRecords.filter(
      (trainee) =>
        !trainee.archived
    ).length;

  const archivedCount =
    traineeRecords.filter(
      (trainee) =>
        trainee.archived
    ).length;

  const filteredTrainees =
    traineeRecords
      .filter(
        (trainee) =>
          activeTab ===
          "active"
            ? !trainee.archived
            : trainee.archived
      )
      .filter(
        (trainee) => {
          const searchableText = [
            trainee.name,
            trainee.reference,
            trainee.status,
            trainee.trainingStage,
            trainee.ftm,
            trainee.archivedAt,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            normalisedSearch ===
              "" ||
            searchableText.includes(
              normalisedSearch
            )
          );
        }
      );

  if (selectedTrainee) {
    return (
      <TraineeProfile
        trainee={
          selectedTrainee
        }
        user={user}
        openDOR={openDOR}
        readOnly={
          selectedTrainee.archived
        }
        onBack={() =>
          setSelectedTrainee(
            null
          )
        }
        onUpdate={(
          updatedTrainee
        ) => {
          const updatedRecord: RecordTrainee = {
            ...updatedTrainee,
            archived:
              selectedTrainee.archived,
            archivedAt:
              selectedTrainee.archivedAt,
          };

          setTraineeRecords(
            (current) =>
              current.map(
                (trainee) =>
                  trainee.id ===
                  updatedRecord.id
                    ? updatedRecord
                    : trainee
              )
          );

          setSelectedTrainee(
            updatedRecord
          );
        }}
      />
    );
  }

  if (creatingRecord) {
    return (
      <CreateTrainee
        onCancel={() =>
          setCreatingRecord(
            false
          )
        }
        onCreate={async (
          newTrainee
        ) => {
          console.log(
            "CREATE TRAINEE REQUEST:",
            newTrainee
          );

          setCreatingRecord(
            false
          );

          await loadTrainees();
        }}
      />
    );
  }

  return (
    <div>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>
            Training Records
          </h2>

          <p style={subtitleStyle}>
            {activeTab ===
              "active"
              ? "Select an active probationer to open their complete FTP record."
              : "Browse completed and archived probationer records in read-only mode."}
          </p>
        </div>

        <div style={headerButtonsStyle}>
          <button
            type="button"
            onClick={() =>
              void loadTrainees()
            }
            style={
              refreshButtonStyle
            }
          >
            Refresh
          </button>

          {activeTab ===
            "active" && (
            <button
              type="button"
              onClick={() =>
                setCreatingRecord(
                  true
                )
              }
              style={
                addButtonStyle
              }
            >
              Add Record
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div style={tabsStyle}>
        <button
          type="button"
          onClick={() =>
            setActiveTab(
              "active"
            )
          }
          style={{
            ...tabButtonStyle,
            ...(activeTab ===
            "active"
              ? activeTabButtonStyle
              : {}),
          }}
        >
          Active Records
          <span style={tabCountStyle}>
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab(
              "archived"
            )
          }
          style={{
            ...tabButtonStyle,
            ...(activeTab ===
            "archived"
              ? activeTabButtonStyle
              : {}),
          }}
        >
          Archived Records
          <span style={tabCountStyle}>
            {archivedCount}
          </span>
        </button>
      </div>

      <input
        value={searchTerm}
        onChange={(event) =>
          setSearchTerm(
            event.target.value
          )
        }
        placeholder={
          activeTab ===
          "active"
            ? "Search active records by name, reference, stage, status or FTM..."
            : "Search archived records by name, reference, stage, status or FTM..."
        }
        style={searchInputStyle}
      />

      <div style={recordsCardStyle}>
        <div style={tableHeaderStyle}>
          <strong>
            Officer
          </strong>

          <strong>
            Stage
          </strong>

          <strong>
            Checklist
          </strong>

          <strong>
            FTM
          </strong>
        </div>

        {loading ? (
          <p style={emptyStyle}>
            Loading training
            records...
          </p>
        ) : filteredTrainees.length ===
          0 ? (
          <p style={emptyStyle}>
            {activeTab ===
              "active"
              ? "No active trainee records found."
              : "No archived trainee records found."}
          </p>
        ) : (
          filteredTrainees.map(
            (trainee) => (
              <button
                key={trainee.id}
                type="button"
                onClick={() =>
                  setSelectedTrainee(
                    trainee
                  )
                }
                style={recordRowStyle}
              >
                <div>
                  <strong>
                    {trainee.name}
                  </strong>

                  <p style={rowMetaStyle}>
                    {trainee.reference}
                  </p>
                </div>

                <div>
                  <StageBadge
                    stage={
                      trainee.archived
                        ? "Completed"
                        : trainee.trainingStage
                    }
                  />

                  <p style={rowMetaStyle}>
                    {trainee.archived
                      ? trainee.archivedAt
                        ? `Archived ${formatArchiveDate(
                            trainee.archivedAt
                          )}`
                        : "Archived"
                      : trainee.status}
                  </p>
                </div>

                <div>
                  <strong>
                    {trainee.progress}%
                  </strong>

                  <div style={progressTrackStyle}>
                    <div
                      style={{
                        ...progressFillStyle,
                        width:
                          `${trainee.progress}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <strong>
                    {trainee.ftm ||
                      "Unassigned"}
                  </strong>
                </div>
              </button>
            )
          )
        )}
      </div>
    </div>
  );
}

function formatArchiveDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function StageBadge({
  stage,
}: {
  stage: TrainingStage;
}) {
  return (
    <span
      style={{
        ...stageBadgeStyle,
        ...getStageStyle(
          stage
        ),
      }}
    >
      {stage}
    </span>
  );
}

function getStageStyle(
  stage: TrainingStage
) {
  switch (stage) {
    case "Week 1":
      return {
        color: "#bfdbfe",
        backgroundColor:
          "rgba(30, 64, 175, 0.3)",
        borderColor:
          "#2563eb",
      };

    case "Week 2":
      return {
        color: "#ddd6fe",
        backgroundColor:
          "rgba(91, 33, 182, 0.3)",
        borderColor:
          "#7c3aed",
      };

    case "FPP":
      return {
        color: "#fde68a",
        backgroundColor:
          "rgba(120, 53, 15, 0.3)",
        borderColor:
          "#a16207",
      };

    case "Final Evaluation":
      return {
        color: "#fed7aa",
        backgroundColor:
          "rgba(154, 52, 18, 0.3)",
        borderColor:
          "#ea580c",
      };

    case "Completed":
    case "P2":
      return {
        color: "#bbf7d0",
        backgroundColor:
          "rgba(20, 83, 45, 0.35)",
        borderColor:
          "#166534",
      };

    default:
      return {
        color: "#cbd5e1",
        backgroundColor:
          "#334155",
        borderColor:
          "#475569",
      };
  }
}

const tabsStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const tabButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  padding: "10px 14px",
  color: "#cbd5e1",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const activeTabButtonStyle = {
  color: "white",
  backgroundColor: "#2563eb",
  border: "1px solid #3b82f6",
};

const tabCountStyle = {
  minWidth: "24px",
  padding: "3px 7px",
  textAlign: "center" as const,
  backgroundColor:
    "rgba(15, 23, 42, 0.55)",
  borderRadius: "999px",
  fontSize: "12px",
};

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "22px",
  flexWrap: "wrap" as const,
};

const titleStyle = {
  margin: "0 0 6px",
};

const subtitleStyle = {
  margin: 0,
  color: "#94a3b8",
};

const headerButtonsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const refreshButtonStyle = {
  padding: "11px 16px",
  color: "white",
  backgroundColor:
    "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const addButtonStyle = {
  padding: "11px 16px",
  color: "white",
  backgroundColor:
    "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const searchInputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "13px",
  marginBottom: "20px",
  color: "white",
  backgroundColor:
    "#1e293b",
  border:
    "1px solid #475569",
  borderRadius: "8px",
};

const recordsCardStyle = {
  overflow: "hidden",
  backgroundColor:
    "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "12px",
};

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns:
    "2fr 1fr 1fr 1.25fr",
  gap: "16px",
  padding: "14px 18px",
  color: "#94a3b8",
  backgroundColor:
    "#0f172a",
  fontSize: "12px",
  textTransform:
    "uppercase" as const,
  letterSpacing:
    "0.06em",
};

const recordRowStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns:
    "2fr 1fr 1fr 1.25fr",
  alignItems: "center",
  gap: "16px",
  padding: "18px",
  color: "white",
  backgroundColor:
    "transparent",
  border: "none",
  borderTop:
    "1px solid #334155",
  textAlign: "left" as const,
  cursor: "pointer",
};

const rowMetaStyle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "12px",
};

const stageBadgeStyle = {
  display: "inline-block",
  padding: "5px 9px",
  border: "1px solid",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
};

const progressTrackStyle = {
  width: "100%",
  maxWidth: "120px",
  height: "6px",
  marginTop: "8px",
  overflow: "hidden",
  backgroundColor:
    "#334155",
  borderRadius: "999px",
};

const progressFillStyle = {
  height: "100%",
  backgroundColor:
    "#3b82f6",
  borderRadius: "999px",
};

const emptyStyle = {
  padding: "20px",
  margin: 0,
  color: "#94a3b8",
};

const errorStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
};