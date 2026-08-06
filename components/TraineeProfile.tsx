"use client";

import {
  useEffect,
  useState,
} from "react";

import BBCodeRecord from "./BBCodeRecord";
import PPOWERForm from "./PPOWERForm";
import CommentCardsSection from "./CommentCardsSection";
import { supabase } from "../lib/supabase";
import { auditAction } from "../lib/auditAction";

import {
  Trainee,
  NotebookSection,
  TrainingStage,
} from "../lib/types";

import {
  updateTrainee,
} from "../lib/trainees";

type TraineeProfileProps = {
  trainee: Trainee;
  user: any;
  openDOR: (
    id: string
  ) => void;
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
  status?: string | null;
  patrol_type?: string | null;
  ftoName: string;
};

type PPOWERRecord = {
  id: string;
  trainee_id: string;
  ftm_id: string;
  week_number: number;
  attempt_number: number;
  ratings:
    | Record<string, string>
    | null;
  strengths_discussed: boolean;
  weaknesses_discussed: boolean;
  remedial_required: boolean;
  remedial_training:
    | string
    | null;
  summary_comments:
    | string
    | null;
  outcome: string;
  bbcode: string;
  created_at: string;
  ftmName: string;
};

type DatabaseNotebookItem = {
  id: string;
  trainee_id: string;
  section: string;
  item_label: string;
  completed: boolean;
  completion_date?: string | null;
  evidence_link?: string | null;
  completion_source?: string | null;
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
  user,
  openDOR,
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

  const [
    ppowers,
    setPpowers,
  ] = useState<
    PPOWERRecord[]
  >([]);

  const [
    selectedPPOWER,
    setSelectedPPOWER,
  ] = useState<
    PPOWERRecord | null
  >(null);

  const [
    loadingPPOWERs,
    setLoadingPPOWERs,
  ] = useState(true);

  const [
    ppowerError,
    setPpowerError,
  ] = useState("");

  const [
    notebookItems,
    setNotebookItems,
  ] = useState<DatabaseNotebookItem[]>([]);

  const [
    loadingNotebook,
    setLoadingNotebook,
  ] = useState(true);

  const [
    notebookError,
    setNotebookError,
  ] = useState("");

  const [
    progressionBusy,
    setProgressionBusy,
  ] = useState(false);

  const [
    progressionError,
    setProgressionError,
  ] = useState("");

  const [
    progressionSuccess,
    setProgressionSuccess,
  ] = useState("");

  const [
    activePPOWERWeek,
    setActivePPOWERWeek,
  ] = useState<1 | 2 | null>(
    null
  );

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
    loadPPOWERs();
    loadNotebookItems();
  }, [trainee]);

  async function loadNotebookItems() {
    setLoadingNotebook(true);
    setNotebookError("");

    try {
      const {
        data,
        error,
      } = await supabase
        .from("notebook_items")
        .select(`
          id,
          trainee_id,
          section,
          item_label,
          completed,
          completion_date,
          evidence_link,
          completion_source
        `)
        .eq(
          "trainee_id",
          trainee.id
        )
        .order(
          "section",
          {
            ascending: true,
          }
        )
        .order(
          "item_label",
          {
            ascending: true,
          }
        );

      if (error) {
        throw error;
      }

      setNotebookItems(
        (data ?? []) as DatabaseNotebookItem[]
      );
    } catch (error) {
      console.error(
        "NOTEBOOK ITEMS LOAD ERROR",
        error
      );

      setNotebookError(
        error instanceof Error
          ? error.message
          : "The structured learning checklist could not be loaded."
      );
    } finally {
      setLoadingNotebook(false);
    }
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

  async function loadPPOWERs() {
    setLoadingPPOWERs(true);
    setPpowerError("");

    try {
      const {
        data: ppowerData,
        error: ppowerLoadError,
      } = await supabase
        .from("ppowers")
        .select(`
          id,
          trainee_id,
          ftm_id,
          week_number,
          attempt_number,
          ratings,
          strengths_discussed,
          weaknesses_discussed,
          remedial_required,
          remedial_training,
          summary_comments,
          outcome,
          bbcode,
          created_at
        `)
        .eq(
          "trainee_id",
          trainee.id
        )
        .order(
          "week_number",
          {
            ascending: true,
          }
        )
        .order(
          "attempt_number",
          {
            ascending: true,
          }
        );

      if (ppowerLoadError) {
        throw ppowerLoadError;
      }

      const rows =
        ppowerData ?? [];

      const ftmIds = [
        ...new Set(
          rows
            .map(
              (ppower) =>
                ppower.ftm_id
            )
            .filter(Boolean)
        ),
      ];

      let ftmProfiles: {
        id: string;
        name:
          | string
          | null;
      }[] = [];

      if (ftmIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select("id, name")
          .in(
            "id",
            ftmIds
          );

        if (error) {
          throw error;
        }

        ftmProfiles =
          data ?? [];
      }

      setPpowers(
        rows.map(
          (ppower) => ({
            ...ppower,
            ftmName:
              ftmProfiles.find(
                (profile) =>
                  profile.id ===
                  ppower.ftm_id
              )?.name ??
              "Unknown FTM",
          })
        )
      );
    } catch (error) {
      console.error(
        "PPOWER HISTORY LOAD ERROR",
        error
      );

      setPpowerError(
        error instanceof Error
          ? error.message
          : "PPOWER history could not be loaded."
      );
    } finally {
      setLoadingPPOWERs(false);
    }
  }

  async function saveProfile() {
    try {
      await auditAction({
        user,

        action:
          "UPDATE_TRAINEE_STATUS",

        category:
          "Probationers",

        entityType:
          "trainee",

        entityId:
          trainee.id,

        targetName:
          trainee.name,

        oldData: {
          status:
            trainee.status,
        },

        newData: {
          status,
        },

        execute:
          async () => {
            await updateTrainee(
              trainee.id,
              {
                status,
              }
            );

            return {
              status,
            };
          },
      });

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

  async function runFTPAction(
    action:
      | "progressToFPP"
      | "unlockFinalEvaluation"
      | "promoteToP2"
  ) {
    setProgressionBusy(true);
    setProgressionError("");
    setProgressionSuccess("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData.session
          ?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your login session could not be found. Please log in again."
        );
      }

      const auditActionName =
        action === "progressToFPP"
          ? "PROGRESS_TO_FPP"
          : action === "unlockFinalEvaluation"
            ? "UNLOCK_FINAL_EVALUATION"
            : "PROMOTE_TO_P2";

      const expectedStage =
        action === "progressToFPP"
          ? "FPP"
          : action === "unlockFinalEvaluation"
            ? "Final Evaluation"
            : "P2";

      const result =
        await auditAction({
          user,

          action:
            auditActionName,

          category:
            "Probationers",

          entityType:
            "trainee",

          entityId:
            trainee.id,

          targetName:
            trainee.name,

          oldData:
            traineeProgressionSnapshot(
              trainee
            ),

          newData: {
            requested_action:
              action,

            expected_training_stage:
              expectedStage,

            expected_status:
              action === "promoteToP2"
                ? "P2"
                : trainee.status,

            assigned_ftm_id:
              action === "promoteToP2"
                ? null
                : trainee.assignedFtmId,
          },

          execute:
            async () => {
              const response =
                await fetch(
                  "/api/ftp",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",

                      Authorization:
                        `Bearer ${accessToken}`,
                    },

                    body:
                      JSON.stringify({
                        action,

                        traineeId:
                          trainee.id,
                      }),
                  }
                );

              const responseBody =
                await response.json();

              if (!response.ok) {
                throw new Error(
                  responseBody?.error ??
                    "The FTP progression action failed."
                );
              }

              return responseBody;
            },
        });

      const now =
        new Date().toISOString();

      let updatedTrainee = {
        ...trainee,
      };

      if (
        action ===
        "progressToFPP"
      ) {
        updatedTrainee = {
          ...updatedTrainee,
          trainingStage: "FPP",
          fppStartedAt:
            result.fppStartedAt ??
            now,
          progressionUpdatedAt:
            result.fppStartedAt ??
            now,
          progressionUpdatedBy:
            user?.id ?? null,
        };
      }

      if (
        action ===
        "unlockFinalEvaluation"
      ) {
        updatedTrainee = {
          ...updatedTrainee,
          trainingStage:
            "Final Evaluation",
          finalEvaluationUnlockedAt:
            result.unlockedAt ??
            now,
          progressionUpdatedAt:
            result.unlockedAt ??
            now,
          progressionUpdatedBy:
            user?.id ?? null,
        };
      }

      if (
        action ===
        "promoteToP2"
      ) {
        updatedTrainee = {
          ...updatedTrainee,
          trainingStage: "P2",
          status: "P2",
          ftm: "",
          assignedFtmId: null,
          promotedToP2At:
            result.promotedAt ??
            now,
          promotedToP2By:
            user?.id ?? null,
          progressionUpdatedAt:
            result.promotedAt ??
            now,
          progressionUpdatedBy:
            user?.id ?? null,
        };
      }

      onUpdate(
        updatedTrainee
      );

      setProgressionSuccess(
        result?.message ??
          "FTP progression was updated."
      );
    } catch (actionError) {
      console.error(
        "FTP PROGRESSION ACTION ERROR",
        actionError
      );

      setProgressionError(
        actionError instanceof Error
          ? actionError.message
          : "The FTP progression action failed."
      );
    } finally {
      setProgressionBusy(false);
    }
  }

  async function refreshProgressionAfterPPOWER() {
    try {
      const {
        data,
        error,
      } = await supabase
        .from("trainees")
        .select(`
          status,
          assigned_ftm,
          training_stage,
          week_1_ppower_outcome,
          week_2_ppower_outcome,
          week_1_ppower_completed_at,
          week_2_ppower_completed_at,
          fpp_started_at,
          final_evaluation_unlocked_at,
          final_evaluation_completed_at,
          final_evaluation_dor_id,
          progression_updated_at,
          progression_updated_by,
          promoted_to_p2_at,
          promoted_to_p2_by
        `)
        .eq(
          "id",
          trainee.id
        )
        .single();

      if (error) {
        throw error;
      }

      onUpdate({
        ...trainee,
        status:
          data.status ??
          trainee.status,
        assignedFtmId:
          data.assigned_ftm ??
          null,
        trainingStage:
          (
            data.training_stage ??
            trainee.trainingStage
          ) as TrainingStage,
        week1PPOWEROutcome:
          data.week_1_ppower_outcome ??
          null,
        week2PPOWEROutcome:
          data.week_2_ppower_outcome ??
          null,
        week1PPOWERCompletedAt:
          data.week_1_ppower_completed_at ??
          null,
        week2PPOWERCompletedAt:
          data.week_2_ppower_completed_at ??
          null,
        fppStartedAt:
          data.fpp_started_at ??
          null,
        finalEvaluationUnlockedAt:
          data.final_evaluation_unlocked_at ??
          null,
        finalEvaluationCompletedAt:
          data.final_evaluation_completed_at ??
          null,
        finalEvaluationDORId:
          data.final_evaluation_dor_id ??
          null,
        progressionUpdatedAt:
          data.progression_updated_at ??
          null,
        progressionUpdatedBy:
          data.progression_updated_by ??
          null,
        promotedToP2At:
          data.promoted_to_p2_at ??
          null,
        promotedToP2By:
          data.promoted_to_p2_by ??
          null,
      });

      await loadPPOWERs();

      setActivePPOWERWeek(
        null
      );

      setProgressionSuccess(
        "The PPOWER was submitted and the FTP record was refreshed."
      );
    } catch (refreshError) {
      console.error(
        "REFRESH TRAINEE AFTER PPOWER ERROR",
        refreshError
      );

      setProgressionError(
        refreshError instanceof Error
          ? refreshError.message
          : "The PPOWER was submitted, but the FTP record could not be refreshed."
      );
    }
  }

  function openFinalEvaluationDOR() {
    sessionStorage.setItem(
      `ftp-patrol-type:${trainee.id}`,
      "Final Evaluation"
    );

    openDOR(
      trainee.id
    );
  }

  const canCompletePPOWER = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
].includes(
  user?.role ?? ""
);

const canPromoteToP2 = [
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
].includes(
  user?.role ?? ""
);

  const submittedDORs =
    dors.filter(
      (dor) =>
        dor.status ===
          "submitted" ||
        !dor.status
    );

  const cleanSubmittedDORs =
    submittedDORs.filter(
      (dor) =>
        isCleanDOR(
          dor
        )
    );

  const latestTwoDORs =
    submittedDORs.slice(
      0,
      2
    );

  const latestTwoClean =
    latestTwoDORs.length ===
      2 &&
    latestTwoDORs.every(
      (dor) =>
        isCleanDOR(dor)
    );

  const progressEligibleNotebookItems =
    notebookItems.filter(
      (item) =>
        !isMandatoryCourseItem(
          item.item_label
        )
    );

  const completedNotebookItems =
    progressEligibleNotebookItems.filter(
      (item) =>
        item.completed
    ).length;

  const checklistProgress =
    progressEligibleNotebookItems.length >
      0
      ? Math.round(
          (
            completedNotebookItems /
            progressEligibleNotebookItems.length
          ) * 100
        )
      : 0;

  const checklistComplete =
    progressEligibleNotebookItems.length >
      0 &&
    progressEligibleNotebookItems.every(
      (item) =>
        item.completed
    );

  const notebookSections =
    notebookItems.reduce(
      (
        result,
        item
      ) => {
        if (
          !result[item.section]
        ) {
          result[item.section] = [];
        }

        result[item.section].push(
          item
        );

        return result;
      },
      {} as Record<
        string,
        DatabaseNotebookItem[]
      >
    );

  const fppEligible =
    trainee.week2PPOWEROutcome ===
      "Satisfactory" &&
    checklistComplete &&
    latestTwoClean;

  const fppDORs =
    submittedDORs.filter(
      (dor) =>
        dor.patrol_type ===
        "FPP"
    );

  const latestTwoFPPDORs =
    fppDORs.slice(0, 2);

  const finalEvaluationEligible =
    latestTwoFPPDORs.length ===
      2 &&
    latestTwoFPPDORs.every(
      (dor) =>
        isCleanDOR(dor)
    );

  const currentStage =
    trainee.trainingStage ??
    "Week 1";

  const stageIndex =
    Math.max(
      0,
      progressionStages.indexOf(
        currentStage
      )
    );

  const nextAction =
    getNextAction(
      trainee,
      dors
    );

  if (activePPOWERWeek) {
    return (
      <PPOWERForm
        traineeId={
          trainee.id
        }
        weekNumber={
          activePPOWERWeek
        }
        onCancel={() =>
          setActivePPOWERWeek(
            null
          )
        }
        onSubmitted={() => {
          void refreshProgressionAfterPPOWER();
        }}
      />
    );
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

      <div style={progressionCardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <p style={eyebrowStyle}>
              FTP PROGRESSION
            </p>

            <h2 style={progressionTitleStyle}>
              {currentStage}
            </h2>
          </div>

          <span style={permissionBadgeStyle}>
            {canCompletePPOWER
              ? "FTM CONTROLS AVAILABLE"
              : "VIEW ONLY"}
          </span>
        </div>

        <div style={progressTrackerStyle}>
          {progressionStages.map(
            (stage, index) => {
              const complete =
                index <=
                stageIndex;

              return (
                <div
                  key={stage}
                  style={progressStepStyle}
                >
                  <div
                    style={{
                      ...progressDotStyle,
                      backgroundColor:
                        complete
                          ? "#2563eb"
                          : "#334155",
                      borderColor:
                        complete
                          ? "#60a5fa"
                          : "#475569",
                    }}
                  >
                    {complete
                      ? "✓"
                      : index + 1}
                  </div>

                  <span
                    style={{
                      ...progressLabelStyle,
                      color:
                        complete
                          ? "white"
                          : "#64748b",
                    }}
                  >
                    {stage}
                  </span>
                </div>
              );
            }
          )}
        </div>

        <div style={nextActionStyle}>
          <p style={nextActionLabelStyle}>
            NEXT ACTION
          </p>

          <h3 style={nextActionTitleStyle}>
            {nextAction}
          </h3>

          <p style={nextActionTextStyle}>
            Checklist: {checklistProgress}% complete
            {" • "}
            Clean submitted DORs: {cleanSubmittedDORs.length}
          </p>

          {progressionError && (
            <div style={progressionErrorStyle}>
              {progressionError}
            </div>
          )}

          {progressionSuccess && (
            <div style={progressionSuccessStyle}>
              {progressionSuccess}
            </div>
          )}

          {currentStage ===
            "Week 1" &&
            canCompletePPOWER && (
              <div style={actionPanelStyle}>
                <p style={actionHelpStyle}>
                  Complete the full Week 1 weekly evaluation. A satisfactory result progresses the probationer to Week 2; an unsatisfactory result keeps them in Week 1.
                </p>

                <button
                  type="button"
                  disabled={progressionBusy}
                  onClick={() =>
                    setActivePPOWERWeek(
                      1
                    )
                  }
                  style={buttonStyle}
                >
                  Complete Week 1 PPOWER
                </button>
              </div>
            )}

          {currentStage ===
            "Week 2" && (
              <div style={actionPanelStyle}>
                <h4 style={actionSectionTitleStyle}>
                  Week 2 PPOWER
                </h4>

                <p style={actionHelpStyle}>
                  Current outcome: {trainee.week2PPOWEROutcome ?? "Pending"}
                </p>

                {canCompletePPOWER &&
                  !trainee.week2PPOWEROutcome && (
                    <button
                      type="button"
                      disabled={progressionBusy}
                      onClick={() =>
                        setActivePPOWERWeek(
                          2
                        )
                      }
                      style={buttonStyle}
                    >
                      Complete Week 2 PPOWER
                    </button>
                  )}

                <div style={eligibilityGridStyle}>
                  <EligibilityRow
                    label="Week 2 PPOWER satisfactory"
                    met={
                      trainee.week2PPOWEROutcome ===
                      "Satisfactory"
                    }
                  />

                  <EligibilityRow
                    label="Structured learning checklist complete"
                    met={checklistComplete}
                  />

                  <EligibilityRow
                    label="Latest two submitted DORs contain no scored rating below 3"
                    met={latestTwoClean}
                  />
                </div>

                {canCompletePPOWER && (
                  <button
                    type="button"
                    disabled={
                      progressionBusy ||
                      !fppEligible
                    }
                    onClick={() =>
                      void runFTPAction(
                        "progressToFPP"
                      )
                    }
                    style={{
                      ...buttonStyle,
                      opacity:
                        fppEligible &&
                        !progressionBusy
                          ? 1
                          : 0.5,
                      cursor:
                        fppEligible &&
                        !progressionBusy
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    Progress to FPP
                  </button>
                )}
              </div>
            )}

          {currentStage ===
            "FPP" && (
              <div style={actionPanelStyle}>
                <h4 style={actionSectionTitleStyle}>
                  FPP Patrol Progress
                </h4>

                <div style={eligibilityGridStyle}>
                  <EligibilityRow
                    label="First qualifying FPP patrol"
                    met={
                      latestTwoFPPDORs.length >=
                      1 &&
                      isCleanDOR(
                        latestTwoFPPDORs[0]
                      )
                    }
                  />

                  <EligibilityRow
                    label="Second consecutive qualifying FPP patrol"
                    met={finalEvaluationEligible}
                  />
                </div>

                {canPromoteToP2 && (
                  <button
                    type="button"
                    disabled={
                      progressionBusy ||
                      !finalEvaluationEligible
                    }
                    onClick={() =>
                      void runFTPAction(
                        "unlockFinalEvaluation"
                      )
                    }
                    style={{
                      ...buttonStyle,
                      opacity:
                        finalEvaluationEligible &&
                        !progressionBusy
                          ? 1
                          : 0.5,
                      cursor:
                        finalEvaluationEligible &&
                        !progressionBusy
                          ? "pointer"
                          : "not-allowed",
                    }}
                  >
                    Unlock Final Evaluation
                  </button>
                )}
              </div>
            )}

          {currentStage ===
            "Final Evaluation" && (
              <div style={actionPanelStyle}>
                <p style={actionHelpStyle}>
                  The Final Evaluation uses the normal DOR form and must be submitted with the Final Evaluation patrol type.
                </p>

                <button
                  type="button"
                  onClick={
                    openFinalEvaluationDOR
                  }
                  style={buttonStyle}
                >
                  Open Final Evaluation DOR
                </button>
              </div>
            )}

          {currentStage ===
            "Completed" &&
            canPromoteToP2 && (
              <div style={actionPanelStyle}>
                <p style={supervisorNoteStyle}>
                  The Final Evaluation is complete. Promotion archives the FTP record and removes portal access until the officer becomes an FTO.
                </p>

                <button
                  type="button"
                  disabled={progressionBusy}
                  onClick={() =>
                    void runFTPAction(
                      "promoteToP2"
                    )
                  }
                  style={promotionButtonStyle}
                >
                  Promote to P2
                </button>
              </div>
            )}

          {currentStage ===
            "P2" && (
              <div style={completedPanelStyle}>
                FTP completed. This record is archived.
              </div>
            )}
        </div>
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
        <div style={sectionHeaderStyle}>
          <div>
            <h3
              style={{
                margin:
                  "0 0 6px",
              }}
            >
              Structured Learning
              Checklist
            </h3>

            <p
              style={{
                ...mutedStyle,
                margin: 0,
              }}
            >
              This is a read-only training record. Learning goals are completed through DORs or an audited management override.
            </p>
          </div>

          <span style={countBadgeStyle}>
            {checklistProgress}% COMPLETE
          </span>
        </div>

        {loadingNotebook ? (
          <p style={mutedStyle}>
            Loading structured learning checklist...
          </p>
        ) : notebookError ? (
          <div style={errorBoxStyle}>
            Unable to load checklist: {notebookError}
          </div>
        ) : notebookItems.length ===
          0 ? (
          <div style={emptyStateStyle}>
            No structured learning items were found.
          </div>
        ) : (
          <div style={readOnlyChecklistStyle}>
            {Object.entries(
              notebookSections
            ).map(
              ([
                section,
                sectionItems,
              ]) => (
                <section
                  key={section}
                  style={checklistSectionStyle}
                >
                  <h4 style={checklistSectionTitleStyle}>
                    {section}
                  </h4>

                  <div style={checklistRowsStyle}>
                    {sectionItems.map(
                      (item) => (
                        <div
                          key={item.id}
                          style={readOnlyChecklistItemStyle}
                        >
                          <span
                            style={
                              item.completed
                                ? completedStatusIconStyle
                                : pendingStatusIconStyle
                            }
                          >
                            {item.completed
                              ? "✓"
                              : "○"}
                          </span>

                          <div style={checklistItemCopyStyle}>
                            <strong>
                              {item.item_label}
                            </strong>

                            <span style={checklistStatusTextStyle}>
                              {item.completed
                                ? "Completed"
                                : "Outstanding"}
                            </span>

                            {item.completed &&
                              item.completion_date && (
                                <span style={checklistEvidenceStyle}>
                                  Completed {formatDate(
                                    item.completion_date
                                  )}
                                </span>
                              )}

                            {item.completed &&
                              item.evidence_link && (
                                <a
                                  href={item.evidence_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={evidenceLinkStyle}
                                >
                                  View course evidence ↗
                                </a>
                              )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3
              style={{
                margin:
                  "0 0 6px",
              }}
            >
              PPOWER History
            </h3>

            <p
              style={{
                ...mutedStyle,
                margin: 0,
              }}
            >
              Weekly evaluations,
              including remedial
              attempts.
            </p>
          </div>

          <span style={countBadgeStyle}>
            {ppowers.length} PPOWER
            {ppowers.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        {loadingPPOWERs ? (
          <p style={mutedStyle}>
            Loading PPOWER
            history...
          </p>
        ) : ppowerError ? (
          <div style={errorBoxStyle}>
            Unable to load PPOWER
            history: {ppowerError}
          </div>
        ) : ppowers.length ===
          0 ? (
          <div style={emptyStateStyle}>
            No PPOWERs have been
            submitted for this
            trainee yet.
          </div>
        ) : (
          <div style={dorListStyle}>
            {ppowers.map(
              (ppower) => (
                <button
                  key={ppower.id}
                  type="button"
                  onClick={() =>
                    setSelectedPPOWER(
                      ppower
                    )
                  }
                  style={dorCardStyle}
                >
                  <div>
                    <strong>
                      Week{" "}
                      {
                        ppower.week_number
                      }{" "}
                      —{" "}
                      {ppower.attempt_number ===
                      1
                        ? "Initial Evaluation"
                        : `Remedial Evaluation ${
                            ppower.attempt_number -
                            1
                          }`}
                    </strong>

                    <div style={dorMetaStyle}>
                      {formatDateTime(
                        ppower.created_at
                      )}
                      {" • "}
                      {ppower.ftmName}
                      {" • "}
                      {ppower.outcome}
                    </div>
                  </div>

                  <span style={viewLinkStyle}>
                    View full PPOWER
                  </span>
                </button>
              )
            )}
          </div>
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

      <CommentCardsSection
        traineeId={
          trainee.id
        }
        traineeName={
          trainee.name
        }
        traineeRank="Police Officer I"
      />

      <BBCodeRecord
        trainee={trainee}
      />

      {selectedPPOWER && (
        <div
          style={modalOverlayStyle}
          onClick={() =>
            setSelectedPPOWER(
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
                  Week{" "}
                  {
                    selectedPPOWER.week_number
                  }{" "}
                  PPOWER
                </h2>

                <p
                  style={{
                    ...mutedStyle,
                    margin: 0,
                  }}
                >
                  {selectedPPOWER.attempt_number ===
                  1
                    ? "Initial Evaluation"
                    : `Remedial Evaluation ${
                        selectedPPOWER.attempt_number -
                        1
                      }`}
                  {" • "}
                  {
                    selectedPPOWER.ftmName
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPPOWER(
                    null
                  )
                }
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <div style={modalInfoGridStyle}>
              <Detail
                label="Week"
                value={String(
                  selectedPPOWER.week_number
                )}
              />

              <Detail
                label="Attempt"
                value={
                  selectedPPOWER.attempt_number ===
                  1
                    ? "Initial Evaluation"
                    : `Remedial Evaluation ${
                        selectedPPOWER.attempt_number -
                        1
                      }`
                }
              />

              <Detail
                label="Outcome"
                value={
                  selectedPPOWER.outcome
                }
              />

              <Detail
                label="FTM"
                value={
                  selectedPPOWER.ftmName
                }
              />

              <Detail
                label="Submitted"
                value={formatDateTime(
                  selectedPPOWER.created_at
                )}
              />
            </div>

            <ReportSection
              title="Strengths Discussed"
              value={
                selectedPPOWER.strengths_discussed
                  ? "Yes"
                  : "No"
              }
            />

            <ReportSection
              title="Weaknesses Discussed"
              value={
                selectedPPOWER.weaknesses_discussed
                  ? "Yes"
                  : "No"
              }
            />

            <ReportSection
              title="Remedial Training Required"
              value={
                selectedPPOWER.remedial_required
                  ? "Yes"
                  : "No"
              }
            />

            <ReportSection
              title="Remedial Training"
              value={
                selectedPPOWER.remedial_training ||
                "N/A"
              }
            />

            <ReportSection
              title="Weekly Summary"
              value={
                selectedPPOWER.summary_comments ||
                "N/A"
              }
            />

            <div style={reportSectionStyle}>
              <h3>
                Evaluation Ratings
              </h3>

              <div style={ratingGridStyle}>
                {Object.entries(
                  selectedPPOWER.ratings ??
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
                        key={category}
                        style={ratingItemStyle}
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

                        <span style={ratingBadgeStyle}>
                          {rating}
                        </span>
                      </div>
                    )
                  )}
              </div>
            </div>

            <div style={modalButtonsStyle}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      selectedPPOWER.bbcode
                    );
                  } catch (error) {
                    console.error(
                      "COPY PPOWER BBCODE ERROR",
                      error
                    );
                  }
                }}
                style={copyButtonStyle}
              >
                Copy BBCode
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedPPOWER(
                    null
                  )
                }
                style={secondaryButtonStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

function EligibilityRow({
  label,
  met,
}: {
  label: string;
  met: boolean;
}) {
  return (
    <div style={eligibilityRowStyle}>
      <span
        style={
          met
            ? eligibilityMetStyle
            : eligibilityMissingStyle
        }
      >
        {met ? "✓" : "✕"}
      </span>

      <span>{label}</span>
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

function isMandatoryCourseItem(
  label: string
) {
  const normalised =
    label.toUpperCase();

  return (
    normalised.includes("(BFA)") ||
    normalised.includes("(EVOC)")
  );
}

function traineeProgressionSnapshot(
  trainee: Trainee
) {
  return {
    status:
      trainee.status,

    training_stage:
      trainee.trainingStage,

    assigned_ftm_id:
      trainee.assignedFtmId,

    week_1_ppower_outcome:
      trainee.week1PPOWEROutcome,

    week_2_ppower_outcome:
      trainee.week2PPOWEROutcome,

    week_1_ppower_completed_at:
      trainee.week1PPOWERCompletedAt,

    week_2_ppower_completed_at:
      trainee.week2PPOWERCompletedAt,

    fpp_started_at:
      trainee.fppStartedAt,

    final_evaluation_unlocked_at:
      trainee.finalEvaluationUnlockedAt,

    final_evaluation_completed_at:
      trainee.finalEvaluationCompletedAt,

    final_evaluation_dor_id:
      trainee.finalEvaluationDORId,

    progression_updated_at:
      trainee.progressionUpdatedAt,

    progression_updated_by:
      trainee.progressionUpdatedBy,

    promoted_to_p2_at:
      trainee.promotedToP2At,

    promoted_to_p2_by:
      trainee.promotedToP2By,
  };
}

const progressionStages: TrainingStage[] = [
  "Week 1",
  "Week 2",
  "FPP",
  "Final Evaluation",
  "Completed",
  "P2",
];

function isCleanDOR(
  dor: DORRecord
) {
  const ratings =
    Object.values(
      dor.ratings ?? {}
    );

  const scoredRatings =
    ratings
      .map((rating) =>
        Number(rating)
      )
      .filter(
        (rating) =>
          Number.isFinite(
            rating
          )
      );

  return (
    scoredRatings.length >
      0 &&
    scoredRatings.every(
      (rating) =>
        rating >= 3
    )
  );
}

function getNextAction(
  trainee: Trainee,
  dors: DORRecord[]
) {
  switch (
    trainee.trainingStage
  ) {
    case "Week 1":
      return "Complete the Week 1 PPOWER";

    case "Week 2":
      return "Complete the Week 2 PPOWER and check FPP eligibility";

    case "FPP": {
      const cleanFPPPatrols =
        dors.filter(
          (dor: any) =>
            dor.patrol_type ===
              "FPP" &&
            isCleanDOR(
              dor
            )
        ).length;

      return cleanFPPPatrols >=
        2
        ? "Final Evaluation is ready"
        : `Complete ${
            2 -
            cleanFPPPatrols
          } more clean FPP patrol${
            2 -
              cleanFPPPatrols ===
            1
              ? ""
              : "s"
          }`;
    }

    case "Final Evaluation":
      return "Complete the Final Evaluation patrol";

    case "Completed":
      return "Awaiting supervisor promotion to P2";

    case "P2":
      return "FTP completed";

    default:
      return "Review the trainee record";
  }
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
    }
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

const progressionCardStyle = {
  padding: "26px",
  marginBottom: "22px",
  backgroundColor: "#111c33",
  border: "1px solid #334155",
  borderRadius: "14px",
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const progressionTitleStyle = {
  margin: 0,
};

const permissionBadgeStyle = {
  padding: "6px 10px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.18)",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const progressTrackerStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(6, minmax(90px, 1fr))",
  gap: "10px",
  margin: "28px 0",
  overflowX: "auto" as const,
};

const progressStepStyle = {
  minWidth: "90px",
  display: "grid",
  justifyItems: "center",
  gap: "8px",
  textAlign: "center" as const,
};

const progressDotStyle = {
  width: "34px",
  height: "34px",
  display: "grid",
  placeItems: "center",
  color: "white",
  border: "2px solid",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 900,
};

const progressLabelStyle = {
  fontSize: "12px",
  fontWeight: 800,
};

const nextActionStyle = {
  padding: "20px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const nextActionLabelStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const nextActionTitleStyle = {
  margin: "0 0 8px",
};

const nextActionTextStyle = {
  margin: "0 0 16px",
  color: "#94a3b8",
  fontSize: "13px",
};

const supervisorNoteStyle = {
  margin: 0,
  color: "#fde68a",
  fontSize: "13px",
};

const actionPanelStyle = {
  display: "grid",
  gap: "14px",
  marginTop: "14px",
};

const actionHelpStyle = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "13px",
  lineHeight: 1.55,
};

const actionSectionTitleStyle = {
  margin: 0,
};

const eligibilityGridStyle = {
  display: "grid",
  gap: "8px",
  padding: "14px",
  backgroundColor: "#111827",
  border: "1px solid #334155",
  borderRadius: "9px",
};

const eligibilityRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#cbd5e1",
  fontSize: "13px",
};

const eligibilityMetStyle = {
  width: "22px",
  height: "22px",
  display: "grid",
  placeItems: "center",
  color: "#bbf7d0",
  backgroundColor: "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "999px",
  fontWeight: 900,
};

const eligibilityMissingStyle = {
  width: "22px",
  height: "22px",
  display: "grid",
  placeItems: "center",
  color: "#fecaca",
  backgroundColor: "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "999px",
  fontWeight: 900,
};

const progressionErrorStyle = {
  padding: "12px",
  marginBottom: "12px",
  color: "#fecaca",
  backgroundColor: "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  fontSize: "13px",
};

const progressionSuccessStyle = {
  padding: "12px",
  marginBottom: "12px",
  color: "#bbf7d0",
  backgroundColor: "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
  fontSize: "13px",
};

const promotionButtonStyle = {
  padding: "11px 16px",
  color: "white",
  backgroundColor: "#16a34a",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 900,
};

const completedPanelStyle = {
  padding: "14px",
  color: "#bbf7d0",
  backgroundColor: "rgba(20, 83, 45, 0.28)",
  border: "1px solid #166534",
  borderRadius: "8px",
  fontWeight: 800,
};

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

const readOnlyChecklistStyle = {
  display: "grid",
  gap: "18px",
};

const checklistSectionStyle = {
  padding: "18px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const checklistSectionTitleStyle = {
  margin: "0 0 14px",
  color: "#93c5fd",
  fontSize: "13px",
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
};

const checklistRowsStyle = {
  display: "grid",
  gap: "9px",
};

const readOnlyChecklistItemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "12px",
  backgroundColor: "#111827",
  border: "1px solid #26354b",
  borderRadius: "8px",
};

const completedStatusIconStyle = {
  width: "25px",
  height: "25px",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  color: "#bbf7d0",
  backgroundColor: "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "999px",
  fontWeight: 900,
};

const pendingStatusIconStyle = {
  width: "25px",
  height: "25px",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  color: "#94a3b8",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "999px",
  fontWeight: 900,
};

const checklistItemCopyStyle = {
  display: "grid",
  gap: "4px",
};

const checklistStatusTextStyle = {
  color: "#94a3b8",
  fontSize: "12px",
};

const checklistEvidenceStyle = {
  color: "#cbd5e1",
  fontSize: "12px",
};

const evidenceLinkStyle = {
  color: "#60a5fa",
  fontSize: "12px",
  textDecoration: "none",
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