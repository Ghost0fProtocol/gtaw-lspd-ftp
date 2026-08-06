"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { getTrainees } from "../lib/trainees";
import { supabase } from "../lib/supabase";
import { auditAction } from "../lib/auditAction";
import {
  DORRating,
  generateDORBBCode,
} from "../lib/generateDORBBCode";

import { addTrainingEntryFromDOR } from "../lib/fto";

type Props = {
  traineeId?: string;
};

type PatrolType =
  | "Standard"
  | "FPP"
  | "Final Evaluation";

type Trainee = {
  id: string;
  name: string;
  rank: string;
  badgeNumber: string;
  workNumber: string;
  trainingStage: string;
  orientationCompleted: boolean;
};

type NotebookItem = {
  id: string;
  trainee_id: string;
  section: string;
  item_label: string;
  completed: boolean;
};

type LearningGoalOutcome =
  | ""
  | "yes"
  | "no";

type LearningGoalsDecision =
  | ""
  | "yes"
  | "no";

type LearningGoalAssessment = {
  itemId: string;
  outcome: LearningGoalOutcome;
  evidence: string;
};

type DORFormData = {
  probationaryOfficer: string;
  badgeNumber: string;
  rank: string;
  workNumber: string;
  fieldTrainingOfficer: string;
  ftoBadgeNumber: string;
  patrolNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  incidentsTasks: string;
  belowStandard: string;
  aboveStandard: string;
  learningGoals: string;
  roleplayRemarks: string;
};

type PendingRatingJustification = {
  categoryId: number;
  rating:
    | "1"
    | "2"
    | "4";
};

const evaluationCategories = [
  { id: 1, section: "APPEARANCE", label: "General Appearance" },
  { id: 2, section: "ATTITUDE", label: "Attitude towards the Job and Feedback" },
  { id: 3, section: "KNOWLEDGE", label: "Department Policies/Procedures" },
  { id: 4, section: "KNOWLEDGE", label: "Law, Penal Code, Search and Seizure" },
  { id: 5, section: "PERFORMANCE", label: "Driving Skill: General" },
  { id: 6, section: "PERFORMANCE", label: "Driving Skill: Orientation and Response Time to Calls" },
  { id: 7, section: "PERFORMANCE", label: "Report Writing: Accuracy/Grammar/Organisation" },
  { id: 8, section: "PERFORMANCE", label: "Field Performance" },
  { id: 9, section: "PERFORMANCE", label: "Self-Initiated Field Activities" },
  { id: 10, section: "PERFORMANCE", label: "Field Activities: Traffic Stop" },
  { id: 11, section: "PERFORMANCE", label: "Field Activities: Arrest Procedure" },
  { id: 12, section: "PERFORMANCE", label: "Officer Safety Principles" },
  { id: 13, section: "PERFORMANCE", label: "Control of Conflict: Voice Command/Physical Skill" },
  { id: 14, section: "PERFORMANCE", label: "Use of Common Sense and Good Judgement" },
  { id: 15, section: "PERFORMANCE", label: "Radio/MDC: Use of Mobile Data Computer" },
  { id: 16, section: "PERFORMANCE", label: "Radio: Articulation of Transmissions" },
  { id: 17, section: "RELATIONSHIPS", label: "With Citizens/Employees in General" },
];

const ratings: Exclude<DORRating, "">[] = [
  "1",
  "2",
  "3",
  "4",
  "N/O",
];

const ratingDefinitions = [
  {
    rating: "1",
    title: "Unacceptable",
    description:
      "Performance was substantially below the required standard and needs immediate correction.",
  },
  {
    rating: "2",
    title: "Below Standard",
    description:
      "Performance did not consistently meet the required standard and needs improvement.",
  },
  {
    rating: "3",
    title: "Meets Standard",
    description:
      "Performance met the expected standard for the probationer's current stage of training.",
  },
  {
    rating: "4",
    title: "Above Standard",
    description:
      "Performance clearly exceeded the expected standard for the probationer's current stage of training.",
  },
  {
    rating: "N/O",
    title: "Not Observed",
    description:
      "There was no suitable opportunity to assess this category during the patrol.",
  },
] as const;

const initialFormData: DORFormData = {
  probationaryOfficer: "",
  badgeNumber: "",
  rank: "",
  workNumber: "",
  fieldTrainingOfficer: "",
  ftoBadgeNumber: "",
  patrolNumber: "",
  date: "",
  startTime: "",
  endTime: "",
  duration: "",
  incidentsTasks: "",
  belowStandard: "",
  aboveStandard: "",
  learningGoals: "",
  roleplayRemarks: "",
};

function createInitialRatings() {
  return evaluationCategories.reduce(
    (record, category) => {
      record[category.id] = "";
      return record;
    },
    {} as Record<number, DORRating>
  );
}

function calculateDuration(
  startTime: string,
  endTime: string
) {
  if (!startTime || !endTime) {
    return "";
  }

  const [startHour, startMinute] =
    startTime.split(":").map(Number);

  const [endHour, endMinute] =
    endTime.split(":").map(Number);

  const startMinutes =
    startHour * 60 + startMinute;

  let endMinutes =
    endHour * 60 + endMinute;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const difference =
    endMinutes - startMinutes;

  const hours =
    Math.floor(difference / 60);

  const minutes =
    difference % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}`;
}

function buildLearningGoalsNarrative(
  items: NotebookItem[],
  assessments: Record<
    string,
    LearningGoalAssessment
  >,
  decision: LearningGoalsDecision,
  noReason: string
) {
  if (decision === "no") {
    const reason =
      noReason.trim();

    return reason
      ? `No learning goals were completed during this patrol. Reason: ${reason}`
      : "No learning goals were completed during this patrol.";
  }

  const completedItems =
    items
      .map(
        (item) => ({
          item,
          assessment:
            assessments[
              item.id
            ],
        })
      )
      .filter(
        ({
          assessment,
        }) =>
          assessment?.outcome ===
            "yes" &&
          assessment.evidence.trim()
      );

  if (
    completedItems.length ===
    0
  ) {
    return "";
  }

  return completedItems
    .map(
      ({
        item,
        assessment,
      }) =>
        `${item.item_label}: ${assessment.evidence.trim()}`
    )
    .join("\n\n");
}

function buildGeneratedRatingLines(
  ratingsRecord: Record<
    number,
    DORRating
  >,
  justifications: Record<
    number,
    string
  >,
  target:
    | "below"
    | "above"
) {
  return evaluationCategories
    .filter(
      (category) => {
        const rating =
          ratingsRecord[
            category.id
          ];

        return target ===
          "below"
          ? rating === "1" ||
              rating === "2"
          : rating === "4";
      }
    )
    .map(
      (category) => {
        const rating =
          ratingsRecord[
            category.id
          ];

        const justification =
          justifications[
            category.id
          ]?.trim();

        if (!justification) {
          return "";
        }

        return `[Rating ${rating}] ${category.label}: ${justification}`;
      }
    )
    .filter(Boolean);
}

function mergeGeneratedRatingText(
  currentValue: string,
  generatedLines: string[]
) {
  const manualLines =
    currentValue
      .split("\n")
      .filter(
        (line) =>
          !line.trim().startsWith(
            "[Rating "
          )
      )
      .join("\n")
      .trim();

  return [
    manualLines,
    generatedLines.join(
      "\n"
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

export default function DORForm({
  traineeId,
}: Props) {
  const [trainees, setTrainees] =
    useState<Trainee[]>([]);

  const [selectedTrainee, setSelectedTrainee] =
    useState("");

  const [
    patrolType,
    setPatrolType,
  ] = useState<PatrolType>(
    "Standard"
  );

  const [ftoId, setFtoId] =
    useState("");

  const [formData, setFormData] =
    useState<DORFormData>(
      initialFormData
    );

  const [
    evaluationRatings,
    setEvaluationRatings,
  ] = useState<Record<number, DORRating>>(
    createInitialRatings
  );

  const [
    ratingJustifications,
    setRatingJustifications,
  ] = useState<
    Record<number, string>
  >({});

  const [
    pendingRatingJustification,
    setPendingRatingJustification,
  ] = useState<
    PendingRatingJustification |
    null
  >(null);

  const [
    ratingJustificationDraft,
    setRatingJustificationDraft,
  ] = useState("");

  const [
    generatedBBCode,
    setGeneratedBBCode,
  ] = useState("");

  const [copied, setCopied] =
    useState(false);

  const [
    traineeLoadError,
    setTraineeLoadError,
  ] = useState("");

  const [formError, setFormError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [loadingFTO, setLoadingFTO] =
    useState(true);

  const [
    loadingPatrolNumber,
    setLoadingPatrolNumber,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    cancellingDraft,
    setCancellingDraft,
  ] = useState(false);

  const [
    draftId,
    setDraftId,
  ] = useState<string | null>(
    null
  );

  const [
    saveStatus,
    setSaveStatus,
  ] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [
    lastSavedAt,
    setLastSavedAt,
  ] = useState<string | null>(
    null
  );

  const [
    loadingDraft,
    setLoadingDraft,
  ] = useState(false);

  const [
    draftStartedBy,
    setDraftStartedBy,
  ] = useState<string | null>(
    null
  );

  const autosaveTimeout =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const draftIdRef =
    useRef<string | null>(
      null
    );

  const savingDraftRef =
    useRef(false);

  const [
    incompleteNotebookItems,
    setIncompleteNotebookItems,
  ] = useState<NotebookItem[]>([]);

  const [
    selectedNotebookItemIds,
    setSelectedNotebookItemIds,
  ] = useState<string[]>([]);

  const [
    learningGoalAssessments,
    setLearningGoalAssessments,
  ] = useState<
    Record<
      string,
      LearningGoalAssessment
    >
  >({});

  const [
    learningGoalsDecision,
    setLearningGoalsDecision,
  ] = useState<
    LearningGoalsDecision
  >("");

  const [
    noLearningGoalsReason,
    setNoLearningGoalsReason,
  ] = useState("");

  const [
    selectedGoalForModal,
    setSelectedGoalForModal,
  ] = useState<string>("");

  const [
    goalEvidenceDraft,
    setGoalEvidenceDraft,
  ] = useState("");

  const [
    showNoGoalsModal,
    setShowNoGoalsModal,
  ] = useState(false);

  const [
    loadingNotebookItems,
    setLoadingNotebookItems,
  ] = useState(false);

  const [
    notebookLoadError,
    setNotebookLoadError,
  ] = useState("");

  useEffect(() => {
    async function loadTrainees() {
      try {
        setTraineeLoadError("");

        const [
          data,
          orientationResult,
        ] = await Promise.all([
          getTrainees(),

          supabase
            .from(
              "orientation_reports"
            )
            .select(
              "trainee_id"
            ),
        ]);

        if (
          orientationResult.error
        ) {
          throw orientationResult.error;
        }

        const orientedTraineeIds =
          new Set(
            (
              orientationResult.data ??
              []
            ).map(
              (record) =>
                record.trainee_id
            )
          );

        setTrainees(
          data.map(
            (trainee: any) => ({
              id: trainee.id,
              name:
                trainee.profile?.name ??
                trainee.name ??
                "Unknown",
              rank:
                trainee.profile?.rank ??
                "Police Officer I",
              badgeNumber:
                trainee.profile?.badge_number ??
                "",
              workNumber:
                trainee.profile?.work_number ??
                "",
              trainingStage:
                trainee.training_stage ??
                "Week 1",
              orientationCompleted:
                orientedTraineeIds.has(
                  trainee.id
                ),
            })
          )
        );
      } catch (error: unknown) {
        console.error(
          "GET TRAINEES ERROR",
          error
        );

        setTraineeLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load trainees."
        );
      }
    }

    loadTrainees();
  }, []);

  useEffect(() => {
    async function loadLoggedInFTO() {
      try {
        setLoadingFTO(true);

        const {
          data: userData,
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        const user =
          userData.user;

        if (!user) {
          throw new Error(
            "No logged-in user was found."
          );
        }

        setFtoId(user.id);

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("name, badge_number")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        setFormData(
          (current) => ({
            ...current,
            fieldTrainingOfficer:
              profile?.name ?? "",
            ftoBadgeNumber:
              profile?.badge_number ?? "",
          })
        );
      } catch (error) {
        console.error(
          "LOAD FTO PROFILE ERROR",
          error
        );

        setFormError(
          error instanceof Error
            ? error.message
            : "Unable to load the logged-in FTO."
        );
      } finally {
        setLoadingFTO(false);
      }
    }

    loadLoggedInFTO();
  }, []);

  useEffect(() => {
    if (
      !traineeId ||
      trainees.length === 0
    ) {
      return;
    }

    void selectTrainee(traineeId);
  }, [traineeId, trainees]);

  useEffect(() => {
    if (
      !selectedTrainee ||
      !ftoId ||
      !formData.patrolNumber ||
      loadingDraft ||
      saving ||
      cancellingDraft
    ) {
      return;
    }

    if (
      autosaveTimeout.current
    ) {
      clearTimeout(
        autosaveTimeout.current
      );
    }

    autosaveTimeout.current =
      setTimeout(() => {
        void saveDraft(
          true
        );
      }, 1500);

    return () => {
      if (
        autosaveTimeout.current
      ) {
        clearTimeout(
          autosaveTimeout.current
        );
      }
    };
  }, [
    selectedTrainee,
    ftoId,
    formData,
    evaluationRatings,
    ratingJustifications,
    selectedNotebookItemIds,
    learningGoalAssessments,
    learningGoalsDecision,
    noLearningGoalsReason,
    loadingDraft,
    saving,
    cancellingDraft,
  ]);

  function updateField(
    field: keyof DORFormData,
    value: string
  ) {
    setFormError("");
    setSuccessMessage("");

    setFormData(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function updateTime(
    field:
      | "startTime"
      | "endTime",
    value: string
  ) {
    setFormError("");
    setSuccessMessage("");

    setFormData(
      (current) => {
        const updated = {
          ...current,
          [field]: value,
        };

        return {
          ...updated,
          duration:
            calculateDuration(
              updated.startTime,
              updated.endTime
            ),
        };
      }
    );
  }

  function applyRatingAndNarratives(
    id: number,
    rating: DORRating,
    justification:
      string | null
  ) {
    const nextRatings = {
      ...evaluationRatings,
      [id]: rating,
    };

    const nextJustifications = {
      ...ratingJustifications,
    };

    if (
      justification &&
      (
        rating === "1" ||
        rating === "2" ||
        rating === "4"
      )
    ) {
      nextJustifications[
        id
      ] = justification.trim();
    } else {
      delete nextJustifications[
        id
      ];
    }

    setEvaluationRatings(
      nextRatings
    );

    setRatingJustifications(
      nextJustifications
    );

    const belowLines =
      buildGeneratedRatingLines(
        nextRatings,
        nextJustifications,
        "below"
      );

    const aboveLines =
      buildGeneratedRatingLines(
        nextRatings,
        nextJustifications,
        "above"
      );

    setFormData(
      (current) => ({
        ...current,
        belowStandard:
          mergeGeneratedRatingText(
            current.belowStandard,
            belowLines
          ),
        aboveStandard:
          mergeGeneratedRatingText(
            current.aboveStandard,
            aboveLines
          ),
      })
    );

    setFormError("");
    setSuccessMessage("");
  }

  function updateRating(
    id: number,
    rating: DORRating
  ) {
    if (
      rating === "1" ||
      rating === "2" ||
      rating === "4"
    ) {
      setPendingRatingJustification({
        categoryId:
          id,
        rating,
      });

      setRatingJustificationDraft(
        ratingJustifications[
          id
        ] ?? ""
      );

      return;
    }

    applyRatingAndNarratives(
      id,
      rating,
      null
    );
  }

  function saveRatingJustification() {
    if (
      !pendingRatingJustification
    ) {
      return;
    }

    if (
      !ratingJustificationDraft.trim()
    ) {
      setFormError(
        "Enter a justification for this rating."
      );

      return;
    }

    applyRatingAndNarratives(
      pendingRatingJustification.categoryId,
      pendingRatingJustification.rating,
      ratingJustificationDraft
    );

    setPendingRatingJustification(
      null
    );

    setRatingJustificationDraft(
      ""
    );
  }

  async function loadIncompleteNotebookItems(
    traineeRecordId: string
  ) {
    setLoadingNotebookItems(true);
    setNotebookLoadError("");
    setSelectedNotebookItemIds([]);

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
          completed
        `)
        .eq(
          "trainee_id",
          traineeRecordId
        )
        .eq(
          "completed",
          false
        )
        .not(
          "item_label",
          "ilike",
          "%(BFA)%"
        )
        .not(
          "item_label",
          "ilike",
          "%(EVOC)%"
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

      const items =
        data ?? [];

      setIncompleteNotebookItems(
        items
      );

      setLearningGoalAssessments(
        (current) =>
          Object.entries(
            current
          ).reduce(
            (
              next,
              [
                itemId,
                assessment,
              ]
            ) => {
              if (
                items.some(
                  (item) =>
                    item.id ===
                    itemId
                )
              ) {
                next[itemId] =
                  assessment;
              }

              return next;
            },
            {} as Record<
              string,
              LearningGoalAssessment
            >
          )
      );
    } catch (error) {
      console.error(
        "LOAD INCOMPLETE NOTEBOOK ITEMS ERROR",
        error
      );

      setIncompleteNotebookItems([]);

      setNotebookLoadError(
        error instanceof Error
          ? error.message
          : "The trainee checklist could not be loaded."
      );
    } finally {
      setLoadingNotebookItems(false);
    }
  }

  function openLearningGoalModal(
    itemId: string
  ) {
    const existing =
      learningGoalAssessments[
        itemId
      ];

    setSelectedGoalForModal(
      itemId
    );

    setGoalEvidenceDraft(
      existing?.evidence ??
      ""
    );
  }

  function saveLearningGoalFromModal() {
    if (
      !selectedGoalForModal
    ) {
      return;
    }

    if (
      !goalEvidenceDraft.trim()
    ) {
      setFormError(
        "Enter evidence for the selected learning goal."
      );

      return;
    }

    const next = {
      ...learningGoalAssessments,
      [selectedGoalForModal]: {
        itemId:
          selectedGoalForModal,
        outcome:
          "yes" as const,
        evidence:
          goalEvidenceDraft.trim(),
      },
    };

    setLearningGoalAssessments(
      next
    );

    setSelectedNotebookItemIds(
      Object.values(
        next
      )
        .filter(
          (assessment) =>
            assessment.outcome ===
            "yes"
        )
        .map(
          (assessment) =>
            assessment.itemId
        )
    );

    setFormData(
      (current) => ({
        ...current,
        learningGoals:
          buildLearningGoalsNarrative(
            incompleteNotebookItems,
            next,
            "yes",
            ""
          ),
      })
    );

    setSelectedGoalForModal("");
    setGoalEvidenceDraft("");
    setFormError("");
    setSuccessMessage("");
  }

  function removeLearningGoalAssessment(
    itemId: string
  ) {
    const next = {
      ...learningGoalAssessments,
    };

    delete next[itemId];

    setLearningGoalAssessments(
      next
    );

    setSelectedNotebookItemIds(
      Object.values(
        next
      )
        .filter(
          (assessment) =>
            assessment.outcome ===
            "yes"
        )
        .map(
          (assessment) =>
            assessment.itemId
        )
    );

    setFormData(
      (current) => ({
        ...current,
        learningGoals:
          buildLearningGoalsNarrative(
            incompleteNotebookItems,
            next,
            learningGoalsDecision,
            noLearningGoalsReason
          ),
      })
    );
  }

  function chooseLearningGoalsDecision(
    decision: Exclude<
      LearningGoalsDecision,
      ""
    >
  ) {
    setLearningGoalsDecision(
      decision
    );

    setFormError("");
    setSuccessMessage("");

    if (decision === "yes") {
      setShowNoGoalsModal(
        false
      );

      setNoLearningGoalsReason(
        ""
      );

      setFormData(
        (current) => ({
          ...current,
          learningGoals:
            buildLearningGoalsNarrative(
              incompleteNotebookItems,
              learningGoalAssessments,
              "yes",
              ""
            ),
        })
      );

      return;
    }

    setLearningGoalAssessments(
      {}
    );

    setSelectedNotebookItemIds(
      []
    );

    setFormData(
      (current) => ({
        ...current,
        learningGoals: "",
      })
    );

    setShowNoGoalsModal(
      true
    );
  }

  function saveNoLearningGoalsReason() {
    if (
      !noLearningGoalsReason.trim()
    ) {
      setFormError(
        "Enter why no learning goals were completed during this patrol."
      );

      return;
    }

    setLearningGoalAssessments(
      {}
    );

    setSelectedNotebookItemIds(
      []
    );

    setFormData(
      (current) => ({
        ...current,
        learningGoals:
          buildLearningGoalsNarrative(
            incompleteNotebookItems,
            {},
            "no",
            noLearningGoalsReason
          ),
      })
    );

    setShowNoGoalsModal(
      false
    );

    setFormError("");
    setSuccessMessage("");
  }

  async function loadExistingDraft(
    traineeRecordId: string
  ) {
    setLoadingDraft(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("dors")
        .select("*")
        .eq(
          "trainee_id",
          traineeRecordId
        )
        .eq(
          "status",
          "draft"
        )
        .order(
          "last_saved_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        draftIdRef.current =
          null;

        setDraftId(null);
        setLastSavedAt(null);
        setDraftStartedBy(null);

        return false;
      }

      draftIdRef.current =
        data.id;

      setDraftId(
        data.id
      );

      setLastSavedAt(
        data.last_saved_at ??
          data.created_at ??
          null
      );

      setDraftStartedBy(
        data.started_by ??
          data.fto_id ??
          null
      );

      setPatrolType(
        normalisePatrolType(
          data.patrol_type
        )
      );

      setFormData(
        (current) => ({
          ...current,
          patrolNumber:
            data.patrol_number
              ? String(
                  data.patrol_number
                )
              : current.patrolNumber,
          date:
            data.patrol_date ??
            "",
          startTime:
            data.start_time ??
            "",
          endTime:
            data.end_time ??
            "",
          duration:
            data.duration ??
            "",
          incidentsTasks:
            data.incidents ??
            "",
          belowStandard:
            data.below_standard ??
            "",
          aboveStandard:
            data.above_standard ??
            "",
          learningGoals:
            data.learning_goals ??
            "",
          roleplayRemarks:
            data.roleplay_remarks ??
            "",
        })
      );

      setEvaluationRatings({
        ...createInitialRatings(),
        ...(
          data.ratings ??
          {}
        ),
      });

      setRatingJustifications(
        (
          data.rating_justifications ??
          {}
        ) as Record<
          number,
          string
        >
      );

      const rawAssessments =
        data.notebook_assessments &&
        typeof data.notebook_assessments ===
          "object"
          ? (
              data.notebook_assessments as Record<
                string,
                unknown
              >
            )
          : {};

      const draftDecision =
        rawAssessments.__decision ===
          "yes" ||
        rawAssessments.__decision ===
          "no"
          ? rawAssessments.__decision
          : "";

      const draftNoReason =
        typeof rawAssessments.__no_reason ===
          "string"
          ? rawAssessments.__no_reason
          : "";

      const draftAssessments =
        Object.entries(
          rawAssessments
        ).reduce(
          (
            next,
            [
              key,
              value,
            ]
          ) => {
            if (
              key.startsWith(
                "__"
              )
            ) {
              return next;
            }

            if (
              value &&
              typeof value ===
                "object"
            ) {
              next[key] =
                value as LearningGoalAssessment;
            }

            return next;
          },
          {} as Record<
            string,
            LearningGoalAssessment
          >
        );

      setLearningGoalsDecision(
        draftDecision
      );

      setNoLearningGoalsReason(
        draftNoReason
      );

      setLearningGoalAssessments(
        draftAssessments
      );

      setSelectedNotebookItemIds(
        Object.values(
          draftAssessments
        )
          .filter(
            (assessment) =>
              assessment.outcome ===
              "yes"
          )
          .map(
            (assessment) =>
              assessment.itemId
          )
      );

      setSaveStatus(
        "saved"
      );

      return true;
    } catch (error) {
      console.error(
        "LOAD DOR DRAFT ERROR",
        error
      );

      setFormError(
        error instanceof Error
          ? error.message
          : "The existing DOR draft could not be loaded."
      );

      return false;
    } finally {
      setLoadingDraft(false);
    }
  }

  async function getNextPatrolNumber(
    traineeRecordId: string
  ) {
    setLoadingPatrolNumber(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("dors")
        .select("patrol_number")
        .eq(
          "trainee_id",
          traineeRecordId
        );

      if (error) {
        throw error;
      }

      const highestPatrolNumber =
        (data ?? []).reduce(
          (highest, dor) => {
            const patrolNumber =
              Number(
                dor.patrol_number
              );

            return Number.isInteger(
              patrolNumber
            ) &&
              patrolNumber >
                highest
              ? patrolNumber
              : highest;
          },
          0
        );

      return String(
        highestPatrolNumber + 1
      );
    } finally {
      setLoadingPatrolNumber(false);
    }
  }

  async function selectTrainee(
    id: string
  ) {
    setSelectedTrainee(id);
    setFormError("");
    setSuccessMessage("");
    setGeneratedBBCode("");

    if (id === "") {
      setPatrolType(
        "Standard"
      );

      setFormData(
        (current) => ({
          ...current,
          probationaryOfficer: "",
          badgeNumber: "",
          rank: "",
          workNumber: "",
          patrolNumber: "",
        })
      );

      setIncompleteNotebookItems([]);
      setSelectedNotebookItemIds([]);
      setLearningGoalAssessments({});
      setLearningGoalsDecision("");
      setNoLearningGoalsReason("");
      setSelectedGoalForModal("");
      setGoalEvidenceDraft("");
      setShowNoGoalsModal(false);
      setNotebookLoadError("");

      return;
    }

    const trainee =
      trainees.find(
        (item) =>
          item.id === id
      );

    if (!trainee) {
      return;
    }

    if (
      !trainee.orientationCompleted
    ) {
      setSelectedTrainee("");

      setFormData(
        (current) => ({
          ...current,
          probationaryOfficer: "",
          badgeNumber: "",
          rank: "",
          workNumber: "",
          patrolNumber: "",
        })
      );

      setIncompleteNotebookItems([]);
      setSelectedNotebookItemIds([]);
      setLearningGoalAssessments({});
      setLearningGoalsDecision("");
      setNoLearningGoalsReason("");
      setSelectedGoalForModal("");
      setGoalEvidenceDraft("");
      setShowNoGoalsModal(false);
      setNotebookLoadError("");

      setFormError(
        `${trainee.name} must complete an orientation report before a DOR can be started.`
      );

      return;
    }

    const storedPatrolType =
      sessionStorage.getItem(
        `ftp-patrol-type:${id}`
      );

    const nextPatrolType =
      storedPatrolType ===
        "Final Evaluation"
        ? "Final Evaluation"
        : trainee.trainingStage ===
            "FPP"
          ? "FPP"
          : "Standard";

    setPatrolType(
      nextPatrolType
    );

    setFormData(
      (current) => ({
        ...current,
        probationaryOfficer:
          trainee.name,
        badgeNumber:
          trainee.badgeNumber,
        rank:
          trainee.rank,
        workNumber:
          trainee.workNumber,
        patrolNumber: "",
      })
    );

    void loadIncompleteNotebookItems(
      id
    );

    const loadedDraft =
      await loadExistingDraft(
        id
      );

    if (loadedDraft) {
      return;
    }

    try {
      const nextPatrolNumber =
        await getNextPatrolNumber(id);

      setFormData(
        (current) => ({
          ...current,
          patrolNumber:
            nextPatrolNumber,
        })
      );
    } catch (error: any) {
      console.warn(
        "LOAD NEXT PATROL NUMBER ERROR:",
        error?.message ?? error
      );

      setFormData(
        (current) => ({
          ...current,
          patrolNumber: "1",
        })
      );

      setFormError(
        "The saved patrol history could not be read, so the patrol number has defaulted to 1."
      );
    }
  }

  function useCurrentUTCDateAndTime() {
    const now =
      new Date();

    const year =
      now.getUTCFullYear();

    const month =
      String(
        now.getUTCMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        now.getUTCDate()
      ).padStart(2, "0");

    const hours =
      String(
        now.getUTCHours()
      ).padStart(2, "0");

    const minutes =
      String(
        now.getUTCMinutes()
      ).padStart(2, "0");

    setFormData(
      (current) => ({
        ...current,
        date:
          `${year}-${month}-${day}`,
        startTime:
          `${hours}:${minutes}`,
        endTime: "",
        duration: "",
      })
    );

    setFormError("");
    setSuccessMessage("");
  }

  async function saveDraft(
    automatic = false
  ) {
    if (
      savingDraftRef.current
    ) {
      return;
    }

    if (
      !selectedTrainee ||
      !ftoId ||
      !formData.patrolNumber
    ) {
      if (!automatic) {
        setFormError(
          "Select a trainee before saving a draft."
        );
      }

      return;
    }

    savingDraftRef.current =
      true;

    setSaveStatus(
      "saving"
    );

    if (!automatic) {
      setFormError("");
      setSuccessMessage("");
    }

    const now =
      new Date().toISOString();

    const draftPayload = {
      trainee_id:
        selectedTrainee,
      fto_id:
        ftoId,
      patrol_number:
        Number(
          formData.patrolNumber
        ),
      patrol_date:
        formData.date ||
        null,
      start_time:
        formData.startTime ||
        null,
      end_time:
        formData.endTime ||
        null,
      duration:
        formData.duration ||
        null,
      incidents:
        formData.incidentsTasks.trim() ||
        null,
      below_standard:
        formData.belowStandard.trim() ||
        null,
      above_standard:
        formData.aboveStandard.trim() ||
        null,
      learning_goals:
        buildLearningGoalsNarrative(
          incompleteNotebookItems,
          learningGoalAssessments,
          learningGoalsDecision,
          noLearningGoalsReason
        ) ||
        null,
      roleplay_remarks:
        formData.roleplayRemarks.trim() ||
        null,
      ratings:
        evaluationRatings,
      rating_justifications:
        ratingJustifications,
      completed_notebook_items:
        selectedNotebookItemIds,
      notebook_assessments: {
        ...learningGoalAssessments,
        __decision:
          learningGoalsDecision,
        __no_reason:
          noLearningGoalsReason,
      },
      patrol_type:
        patrolType,
      status:
        "draft",
      started_by:
        draftStartedBy ??
        ftoId,
      last_saved_at:
        now,
      submitted_at:
        null,
      completed_by:
        null,
    };

    const auditUser = {
      id: ftoId,
      name:
        formData.fieldTrainingOfficer ||
        null,
      role: null,
    };

    try {
      const currentDraftId =
        draftIdRef.current ??
        draftId;

      if (currentDraftId) {
        if (automatic) {
          const {
            error,
          } = await supabase
            .from("dors")
            .update(
              draftPayload
            )
            .eq(
              "id",
              currentDraftId
            );

          if (error) {
            throw error;
          }
        } else {
          await auditAction({
            user:
              auditUser,

            action:
              "SAVE_DOR_DRAFT",

            category:
              "DORs",

            entityType:
              "dor",

            entityId:
              currentDraftId,

            targetName:
              `${formData.probationaryOfficer || "Unknown trainee"} · Patrol ${formData.patrolNumber}`,

            oldData: {
              last_saved_at:
                lastSavedAt,

              status:
                "draft",
            },

            newData:
              dorAuditSnapshot(
                draftPayload,
                formData,
                selectedNotebookItemIds
              ),

            execute:
              async () => {
                const result =
                  await supabase
                    .from("dors")
                    .update(
                      draftPayload
                    )
                    .eq(
                      "id",
                      currentDraftId
                    );

                if (
                  result.error
                ) {
                  throw result.error;
                }

                return result;
              },
          });
        }
      } else {
        const createDraft =
          async () => {
            const result =
              await supabase
                .from("dors")
                .insert(
                  draftPayload
                )
                .select(
                  "id, started_by, last_saved_at"
                )
                .single();

            if (
              result.error
            ) {
              throw result.error;
            }

            return result;
          };

        const { data } =
          await auditAction({
            user:
              auditUser,

            action:
              "CREATE_DOR_DRAFT",

            category:
              "DORs",

            entityType:
              "dor",

            targetName:
              `${formData.probationaryOfficer || "Unknown trainee"} · Patrol ${formData.patrolNumber}`,

            newData:
              dorAuditSnapshot(
                draftPayload,
                formData,
                selectedNotebookItemIds
              ),

            execute:
              createDraft,
          });

        draftIdRef.current =
          data.id;

        setDraftId(
          data.id
        );

        setDraftStartedBy(
          data.started_by ??
          ftoId
        );
      }

      setLastSavedAt(
        now
      );

      setSaveStatus(
        "saved"
      );

      if (!automatic) {
        setSuccessMessage(
          `Patrol ${formData.patrolNumber} saved as a draft.`
        );
      }
    } catch (error) {
      const errorDetails =
        error &&
        typeof error === "object"
          ? JSON.stringify(
              error,
              null,
              2
            )
          : String(error);

      console.error(
        "SAVE DOR DRAFT ERROR",
        errorDetails
      );

      console.error(
        error
      );

      setSaveStatus(
        "error"
      );

      const readableMessage =
        error instanceof Error
          ? error.message
          : (
              error &&
              typeof error ===
                "object" &&
              "message" in error
            )
            ? String(
                (
                  error as {
                    message?: unknown;
                  }
                ).message ??
                errorDetails
              )
            : errorDetails ||
              "The DOR draft could not be saved.";

      if (!automatic) {
        setFormError(
          readableMessage
        );

        window.alert(
          `DOR draft save failed:\n\n${errorDetails}`
        );
      }
    } finally {
      savingDraftRef.current =
        false;
    }
  }

  function validateForm() {
    const missingItems: string[] = [];

    if (!selectedTrainee) {
      missingItems.push("Trainee");
    }

    if (!ftoId) {
      missingItems.push(
        "Logged-in FTO account"
      );
    }

    if (
      !formData.fieldTrainingOfficer
        .trim()
    ) {
      missingItems.push(
        "Field Training Officer name"
      );
    }

    if (
      !formData.ftoBadgeNumber
        .trim()
    ) {
      missingItems.push(
        "FTO badge / serial number"
      );
    }

    if (
      !formData.patrolNumber.trim()
    ) {
      missingItems.push(
        "FTP patrol number"
      );
    } else {
      const patrolNumber =
        Number(formData.patrolNumber);

      if (
        !Number.isInteger(
          patrolNumber
        ) ||
        patrolNumber < 1
      ) {
        missingItems.push(
          "Valid FTP patrol number"
        );
      }
    }

    if (!formData.date) {
      missingItems.push(
        "Patrol date"
      );
    }

    if (!formData.startTime) {
      missingItems.push(
        "Start time"
      );
    }

    if (!formData.endTime) {
      missingItems.push(
        "End time"
      );
    }

    if (
      !formData.incidentsTasks.trim()
    ) {
      missingItems.push(
        "Incidents / tasks"
      );
    }

    if (
      !learningGoalsDecision
    ) {
      missingItems.push(
        "Learning goals completed: Yes or No"
      );
    }

    if (
      learningGoalsDecision ===
        "yes" &&
      selectedNotebookItemIds.length ===
        0
    ) {
      missingItems.push(
        "At least one completed learning goal"
      );
    }

    if (
      learningGoalsDecision ===
        "no" &&
      !noLearningGoalsReason.trim()
    ) {
      missingItems.push(
        "Reason no learning goals were completed"
      );
    }

    Object.values(
      learningGoalAssessments
    ).forEach(
      (assessment) => {
        const item =
          incompleteNotebookItems.find(
            (notebookItem) =>
              notebookItem.id ===
              assessment.itemId
          );

        if (
          assessment.outcome &&
          !assessment.evidence.trim()
        ) {
          missingItems.push(
            `Evidence: ${item?.item_label ?? "Learning goal"}`
          );
        }

        if (
          !assessment.outcome &&
          assessment.evidence.trim()
        ) {
          missingItems.push(
            `Yes / No decision: ${item?.item_label ?? "Learning goal"}`
          );
        }
      }
    );

    evaluationCategories.forEach(
      (category) => {
        const rating =
          evaluationRatings[
            category.id
          ];

        if (
          (
            rating === "1" ||
            rating === "2" ||
            rating === "4"
          ) &&
          !ratingJustifications[
            category.id
          ]?.trim()
        ) {
          missingItems.push(
            `Rating justification: ${category.label}`
          );
        }
      }
    );

    const missingRatings =
      evaluationCategories.filter(
        (category) =>
          !evaluationRatings[
            category.id
          ]
      );

    missingRatings.forEach(
      (category) => {
        missingItems.push(
          `Rating: ${category.label}`
        );
      }
    );

    if (
      missingItems.length === 0
    ) {
      return "";
    }

    return (
      "Please complete the following before saving:\n\n" +
      missingItems
        .map(
          (item) => `• ${item}`
        )
        .join("\n")
    );
  }

  async function saveDOR() {
    const validationError =
      validateForm();

    if (validationError) {
      setFormError(
        validationError
      );

      setGeneratedBBCode("");
      setSuccessMessage("");

      return;
    }

    if (autosaveTimeout.current) {
      clearTimeout(
        autosaveTimeout.current
      );

      autosaveTimeout.current =
        null;
    }

    setSaving(true);
    setFormError("");
    setSuccessMessage("");

    let autosaveWaitCount = 0;

    while (
      savingDraftRef.current &&
      autosaveWaitCount < 40
    ) {
      await new Promise<void>(
        (resolve) => {
          setTimeout(
            resolve,
            50
          );
        }
      );

      autosaveWaitCount += 1;
    }

    if (
      savingDraftRef.current
    ) {
      setSaving(false);

      setFormError(
        "The DOR is still autosaving. Wait a moment and submit again."
      );

      return;
    }

    const learningGoalsNarrative =
      buildLearningGoalsNarrative(
        incompleteNotebookItems,
        learningGoalAssessments,
        learningGoalsDecision,
        noLearningGoalsReason
      );

    const bbcode =
      generateDORBBCode(
        {
          ...formData,
          learningGoals:
            learningGoalsNarrative,
        },
        evaluationRatings
      );

    const auditUser = {
      id: ftoId,
      name:
        formData.fieldTrainingOfficer ||
        null,
      role: null,
    };

    try {
      const submittedAt =
        new Date().toISOString();

      const submittedPayload = {
        trainee_id:
          selectedTrainee,
        fto_id:
          ftoId,
        patrol_number:
          Number(
            formData.patrolNumber
          ),
        patrol_date:
          formData.date,
        start_time:
          formData.startTime,
        end_time:
          formData.endTime,
        duration:
          formData.duration,
        incidents:
          formData.incidentsTasks.trim(),
        below_standard:
          formData.belowStandard.trim() ||
          null,
        above_standard:
          formData.aboveStandard.trim() ||
          null,
        learning_goals:
          buildLearningGoalsNarrative(
            incompleteNotebookItems,
            learningGoalAssessments,
            learningGoalsDecision,
            noLearningGoalsReason
          ) ||
          null,
        roleplay_remarks:
          formData.roleplayRemarks.trim() ||
          null,
        ratings:
          evaluationRatings,
        rating_justifications:
          ratingJustifications,
        completed_notebook_items:
          selectedNotebookItemIds,
        notebook_assessments: {
          ...learningGoalAssessments,
          __decision:
            learningGoalsDecision,
          __no_reason:
            noLearningGoalsReason,
        },
        bbcode,
        patrol_type:
          patrolType,
        status:
          "submitted",
        started_by:
          draftStartedBy ??
          ftoId,
        completed_by:
          ftoId,
        last_saved_at:
          submittedAt,
        submitted_at:
          submittedAt,
      };

      console.log(
        "DOR FINAL SUBMISSION PAYLOAD",
        submittedPayload
      );

      let savedDORId =
        draftId;

      const submitResult =
        await auditAction({
          user:
            auditUser,

          action:
            "SUBMIT_DOR",

          category:
            "DORs",

          entityType:
            "dor",

          entityId:
            draftId ??
            undefined,

          targetName:
            `${formData.probationaryOfficer} · Patrol ${formData.patrolNumber}`,

          oldData:
            draftId
              ? {
                  dor_id:
                    draftId,

                  status:
                    "draft",

                  last_saved_at:
                    lastSavedAt,
                }
              : null,

          newData:
            dorAuditSnapshot(
              submittedPayload,
              formData,
              selectedNotebookItemIds
            ),

          execute:
            async () => {
              const currentDraftId =
                draftIdRef.current ??
                draftId;

              if (
                currentDraftId
              ) {
                const {
                  error:
                    updateError,
                } = await supabase
                  .from("dors")
                  .update(
                    submittedPayload
                  )
                  .eq(
                    "id",
                    currentDraftId
                  )
                  .eq(
                    "trainee_id",
                    selectedTrainee
                  )
                  .eq(
                    "status",
                    "draft"
                  );

                if (
                  updateError
                ) {
                  throw updateError;
                }

                return {
                  data: {
                    id:
                      currentDraftId,
                  },
                  error:
                    null,
                };
              }

              const result =
                await supabase
                  .from("dors")
                  .insert(
                    submittedPayload
                  )
                  .select("id")
                  .single();

              if (
                result.error
              ) {
                throw result.error;
              }

              return result;
            },
        });

      savedDORId =
        submitResult.data.id;

      const savedPatrolNumber =
        formData.patrolNumber;

      let checklistUpdateWarning = "";
      let ftoFileUpdateWarning = "";
      let progressionUpdateWarning = "";

      if (
        selectedNotebookItemIds.length > 0
      ) {
        const selectedItems =
          incompleteNotebookItems
            .filter(
              (item) =>
                selectedNotebookItemIds.includes(
                  item.id
                )
            )
            .map(
              (item) => ({
                id:
                  item.id,

                section:
                  item.section,

                item_label:
                  item.item_label,
              })
            );

        try {
          await auditAction({
            user:
              auditUser,

            action:
              "COMPLETE_NOTEBOOK_ITEMS_FROM_DOR",

            category:
              "Notebook",

            entityType:
              "trainee",

            entityId:
              selectedTrainee,

            targetName:
              formData.probationaryOfficer,

            oldData: {
              completed_items:
                [],
            },

            newData: {
              dor_id:
                savedDORId,

              patrol_number:
                Number(
                  formData.patrolNumber
                ),

              completed_items:
                selectedItems,
            },

            execute:
              async () => {
                const completionRows =
                  selectedItems.map(
                    (item) => ({
                      ...item,
                      assessment:
                        learningGoalAssessments[
                          item.id
                        ],
                    })
                  );

                for (
                  const item of
                  completionRows
                ) {
                  const {
                    error,
                  } = await supabase
                    .from(
                      "notebook_items"
                    )
                    .update({
                      completed:
                        true,
                      completed_at:
                        submittedAt,
                      completed_by:
                        ftoId,
                      completion_dor_id:
                        savedDORId,
                      completion_patrol_number:
                        Number(
                          formData.patrolNumber
                        ),
                      completion_evidence:
                        item.assessment
                          ?.evidence
                          ?.trim() ||
                        null,
                    })
                    .eq(
                      "id",
                      item.id
                    )
                    .eq(
                      "trainee_id",
                      selectedTrainee
                    );

                  if (error) {
                    throw error;
                  }
                }

                return {
                  completed:
                    completionRows.length,
                };
              },
          });
        } catch (
          notebookUpdateError
        ) {
          console.error(
            "UPDATE NOTEBOOK ITEMS ERROR",
            notebookUpdateError
          );

          checklistUpdateWarning =
            " The DOR saved, but the selected checklist items could not be updated.";
        }
      }

      try {
        await addTrainingEntryFromDOR({
          ftoProfileId:
            ftoId,
          traineeName:
            formData.probationaryOfficer,
          patrolDate:
            formData.date,
          duration:
            formData.duration,
        });

        await auditAction({
          user:
            auditUser,

          action:
            "ADD_FTO_TRAINING_ENTRY_FROM_DOR",

          category:
            "FTP Files",

          entityType:
            "dor",

          entityId:
            savedDORId ??
            undefined,

          targetName:
            formData.fieldTrainingOfficer,

          newData: {
            dor_id:
              savedDORId,

            trainee_name:
              formData.probationaryOfficer,

            patrol_number:
              Number(
                formData.patrolNumber
              ),

            patrol_date:
              formData.date,

            duration:
              formData.duration,
          },

          execute:
            async () => ({
              success:
                true,
            }),
        });
      } catch (ftoFileError) {
        console.error(
          "UPDATE FTO FILE FROM DOR ERROR",
          ftoFileError
        );

        ftoFileUpdateWarning =
          " The DOR saved, but the FTO file could not be updated. Please contact FTP staff before submitting the DOR again.";
      }

      if (
        patrolType ===
          "Final Evaluation" &&
        savedDORId
      ) {
        try {
          const {
            data: sessionData,
            error: sessionError,
          } =
            await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          const accessToken =
            sessionData.session
              ?.access_token;

          if (!accessToken) {
            throw new Error(
              "The login session could not be verified for Final Evaluation completion."
            );
          }

          await auditAction({
            user:
              auditUser,

            action:
              "COMPLETE_FINAL_EVALUATION",

            category:
              "Probationers",

            entityType:
              "trainee",

            entityId:
              selectedTrainee,

            targetName:
              formData.probationaryOfficer,

            oldData: {
              progression:
                "pre-final-evaluation",
            },

            newData: {
              progression:
                "final-evaluation-completed",

              dor_id:
                savedDORId,

              patrol_number:
                Number(
                  formData.patrolNumber
                ),
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
                          action:
                            "completeFinalEvaluation",

                          traineeId:
                            selectedTrainee,

                          dorId:
                            savedDORId,
                        }),
                    }
                  );

                const result =
                  await response.json();

                if (!response.ok) {
                  throw new Error(
                    result?.error ??
                      "Final Evaluation progression could not be completed."
                  );
                }

                return result;
              },
          });
        } catch (
          progressionError
        ) {
          console.error(
            "COMPLETE FINAL EVALUATION ERROR",
            progressionError
          );

          progressionUpdateWarning =
            ` The DOR saved as the Final Evaluation, but the trainee progression could not be completed: ${
              progressionError instanceof Error
                ? progressionError.message
                : "Unknown error."
            }`;
        }
      }

      sessionStorage.removeItem(
        `ftp-patrol-type:${selectedTrainee}`
      );

      setGeneratedBBCode(
        bbcode
      );

      setSuccessMessage(
        `DOR Patrol ${savedPatrolNumber} saved successfully.${checklistUpdateWarning}${ftoFileUpdateWarning}${progressionUpdateWarning} The form has been cleared and the BBCode is ready to copy below.`
      );

      setSelectedTrainee("");
      setPatrolType(
        "Standard"
      );
      draftIdRef.current =
        null;
      setDraftId(null);
      setLastSavedAt(null);
      setDraftStartedBy(null);
      setSaveStatus("idle");

      setFormData(
        (current) => ({
          ...initialFormData,
          fieldTrainingOfficer:
            current.fieldTrainingOfficer,
          ftoBadgeNumber:
            current.ftoBadgeNumber,
        })
      );

      setEvaluationRatings(
        createInitialRatings()
      );
      setRatingJustifications({});
      setPendingRatingJustification(null);
      setRatingJustificationDraft("");

      setIncompleteNotebookItems([]);
      setSelectedNotebookItemIds([]);
      setLearningGoalAssessments({});
      setLearningGoalsDecision("");
      setNoLearningGoalsReason("");
      setSelectedGoalForModal("");
      setGoalEvidenceDraft("");
      setShowNoGoalsModal(false);
      setNotebookLoadError("");

      setCopied(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: any) {
      console.error(
        "SAVE DOR ERROR",
        error
      );

      if (
        error?.code === "23505"
      ) {
        setFormError(
          `Patrol ${formData.patrolNumber} already exists for this trainee.`
        );
      } else {
        setFormError(
          error?.message ??
          "The DOR could not be saved."
        );
      }

      setGeneratedBBCode("");
    } finally {
      setSaving(false);
    }
  }

  async function copyBBCode() {
    try {
      await navigator.clipboard.writeText(
        generatedBBCode
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "COPY BBCODE ERROR",
        error
      );

      setFormError(
        "The BBCode could not be copied."
      );
    }
  }

  async function cancelDraft() {
    const currentDraftId =
      draftIdRef.current ??
      draftId;

    if (!currentDraftId) {
      clearForm();
      return;
    }

    const confirmed =
      window.confirm(
        `Cancel Patrol ${formData.patrolNumber || ""} DOR?\n\nThis will permanently delete the draft and remove it from Outstanding DORs.`
      );

    if (!confirmed) {
      return;
    }

    if (autosaveTimeout.current) {
      clearTimeout(
        autosaveTimeout.current
      );

      autosaveTimeout.current =
        null;
    }

    setCancellingDraft(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const auditUser = {
        id:
          ftoId,
        name:
          formData.fieldTrainingOfficer ||
          null,
        role:
          null,
      };

      await auditAction({
        user:
          auditUser,

        action:
          "CANCEL_DOR_DRAFT",

        category:
          "DORs",

        entityType:
          "dor",

        entityId:
          currentDraftId,

        targetName:
          `${formData.probationaryOfficer || "Unknown trainee"} · Patrol ${formData.patrolNumber || "Unknown"}`,

        oldData: {
          dor_id:
            currentDraftId,
          status:
            "draft",
          trainee_id:
            selectedTrainee,
          patrol_number:
            formData.patrolNumber,
          last_saved_at:
            lastSavedAt,
        },

        newData: {
          deleted:
            true,
          status:
            "cancelled",
        },

        execute:
          async () => {
            const result =
              await supabase
                .from("dors")
                .delete()
                .eq(
                  "id",
                  currentDraftId
                )
                .eq(
                  "status",
                  "draft"
                );

            if (result.error) {
              throw result.error;
            }

            return result;
          },
      });

      clearForm();

      setSuccessMessage(
        "The DOR draft was cancelled and removed from Outstanding DORs."
      );
    } catch (error) {
      console.error(
        "CANCEL DOR DRAFT ERROR",
        error
      );

      setFormError(
        error instanceof Error
          ? error.message
          : "The DOR draft could not be cancelled."
      );
    } finally {
      setCancellingDraft(false);
    }
  }

  function clearForm() {
    if (selectedTrainee) {
      sessionStorage.removeItem(
        `ftp-patrol-type:${selectedTrainee}`
      );
    }

    setSelectedTrainee("");
    setPatrolType(
      "Standard"
    );
    draftIdRef.current =
      null;
    setDraftId(null);
    setLastSavedAt(null);
    setDraftStartedBy(null);
    setSaveStatus("idle");

    setFormData(
      (current) => ({
        ...initialFormData,
        fieldTrainingOfficer:
          current.fieldTrainingOfficer,
        ftoBadgeNumber:
          current.ftoBadgeNumber,
      })
    );

    setEvaluationRatings(
      createInitialRatings()
    );
    setRatingJustifications({});
    setPendingRatingJustification(null);
    setRatingJustificationDraft("");

    setIncompleteNotebookItems([]);
    setSelectedNotebookItemIds([]);
    setLearningGoalAssessments({});
    setLearningGoalsDecision("");
    setNoLearningGoalsReason("");
    setSelectedGoalForModal("");
    setGoalEvidenceDraft("");
    setShowNoGoalsModal(false);
    setNotebookLoadError("");

    setGeneratedBBCode("");
    setFormError("");
    setSuccessMessage("");
    setCopied(false);
  }

  function submitDOR(
    event: FormEvent
  ) {
    event.preventDefault();
    void saveDOR();
  }

  const completedRatings =
    Object.values(
      evaluationRatings
    ).filter(Boolean).length;

  const notebookItemsBySection =
    incompleteNotebookItems.reduce(
      (
        grouped,
        item
      ) => {
        if (
          !grouped[
            item.section
          ]
        ) {
          grouped[
            item.section
          ] = [];
        }

        grouped[
          item.section
        ].push(item);

        return grouped;
      },
      {} as Record<
        string,
        NotebookItem[]
      >
    );

  return (
    <div>
      <div
        style={{
          marginBottom: "25px",
        }}
      >
        <h2>
          Daily Observation Report
        </h2>

        <p style={subTextStyle}>
          Complete, save and
          generate the official
          forum BBCode.
        </p>
      </div>

      {(draftId || saveStatus !== "idle") && (
        <div style={draftStatusCardStyle}>
          <div>
            <strong>
              {draftId
                ? `Patrol ${formData.patrolNumber} Draft`
                : "New DOR Draft"}
            </strong>

            <p style={draftStatusTextStyle}>
              {getDraftStatusText(
                saveStatus,
                lastSavedAt
              )}
            </p>
          </div>

          {lastSavedAt && (
            <DraftAgeWarning
              lastSavedAt={
                lastSavedAt
              }
            />
          )}
        </div>
      )}

      <form
        onSubmit={submitDOR}
        style={{
          display: "grid",
          gap: "20px",
        }}
      >
        <div style={cardStyle}>
          <h3 style={headingStyle}>
            Officer Information
          </h3>

          {traineeLoadError && (
            <p style={errorStyle}>
              Unable to load
              trainees:{" "}
              {traineeLoadError}
            </p>
          )}

          <label style={labelStyle}>
            Trainee
          </label>

          <select
            value={
              selectedTrainee
            }
            onChange={(event) =>
              void selectTrainee(
                event.target.value
              )
            }
            disabled={saving}
            style={{
              ...inputStyle,
              marginBottom:
                "22px",
            }}
          >
            <option value="">
              Select Trainee
            </option>

            {trainees.map(
              (trainee) => (
                <option
                  key={trainee.id}
                  value={trainee.id}
                  disabled={
                    !trainee.orientationCompleted
                  }
                >
                  {trainee.name}
                  {!trainee.orientationCompleted
                    ? " — Orientation Required"
                    : ""}
                </option>
              )
            )}
          </select>

          <p style={orientationGateHelpStyle}>
            Probationary officers must have a submitted orientation report before a normal DOR can be started.
          </p>

          <div style={gridStyle}>
            <div>
              <label style={labelStyle}>
                Officer Name
              </label>

              <input
                value={
                  formData.probationaryOfficer
                }
                readOnly
                style={
                  readOnlyInputStyle
                }
              />
            </div>

            <div>
              <label style={labelStyle}>
                Rank
              </label>

              <input
                value={
                  formData.rank
                }
                readOnly
                style={
                  readOnlyInputStyle
                }
              />
            </div>

            <div>
              <label style={labelStyle}>
                Badge / Serial Number
              </label>

              <input
                value={
                  formData.badgeNumber
                }
                readOnly
                style={
                  readOnlyInputStyle
                }
              />
            </div>

            <div>
              <label style={labelStyle}>
                Work Number
              </label>

              <input
                value={
                  formData.workNumber
                }
                readOnly
                style={
                  readOnlyInputStyle
                }
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "18px",
            }}
          >
            <label style={labelStyle}>
              Field Training Officer
            </label>

            <input
              value={
                formData.fieldTrainingOfficer
              }
              onChange={(event) =>
                updateField(
                  "fieldTrainingOfficer",
                  event.target.value
                )
              }
              disabled={
                saving ||
                loadingFTO
              }
              placeholder={
                loadingFTO
                  ? "Loading your profile..."
                  : "Enter FTO name"
              }
              style={inputStyle}
            />
          </div>

          <div
            style={{
              marginTop: "18px",
            }}
          >
            <label style={labelStyle}>
              FTO Badge / Serial Number
            </label>

            <input
              value={
                formData.ftoBadgeNumber
              }
              readOnly
              style={
                readOnlyInputStyle
              }
            />
          </div>
        </div>

        <div style={cardStyle}>
          <div
            style={
              sectionHeaderStyle
            }
          >
            <h3
              style={{
                ...headingStyle,
                marginBottom: 0,
              }}
            >
              Patrol Details
            </h3>

            <button
              type="button"
              onClick={
                useCurrentUTCDateAndTime
              }
              disabled={saving}
              style={{
                ...smallButtonStyle,
                opacity:
                  saving ? 0.65 : 1,
              }}
            >
              Use Current UTC Date
              &amp; Time
            </button>
          </div>

          <div
            style={patrolTypeBannerStyle}
          >
            <div>
              <p style={patrolTypeLabelStyle}>
                PATROL TYPE
              </p>

              <strong>
                {patrolType}
              </strong>
            </div>

            <span
              style={{
                ...patrolTypeBadgeStyle,
                ...(patrolType ===
                "Final Evaluation"
                  ? finalEvaluationBadgeStyle
                  : patrolType ===
                      "FPP"
                    ? fppBadgeStyle
                    : standardBadgeStyle),
              }}
            >
              {patrolType}
            </span>
          </div>

          <div
            style={{
              ...gridStyle,
              marginTop: "20px",
            }}
          >
            <div>
              <label style={labelStyle}>
                FTP Patrol Number
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={
                  formData.patrolNumber
                }
                onChange={(event) =>
                  updateField(
                    "patrolNumber",
                    event.target.value
                  )
                }
                disabled={
                  saving ||
                  loadingPatrolNumber
                }
                placeholder={
                  loadingPatrolNumber
                    ? "Loading..."
                    : "Next patrol number"
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Date
              </label>

              <input
                type="date"
                value={
                  formData.date
                }
                onChange={(event) =>
                  updateField(
                    "date",
                    event.target.value
                  )
                }
                disabled={saving}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Start Time (UTC)
              </label>

              <input
                type="time"
                value={
                  formData.startTime
                }
                onChange={(event) =>
                  updateTime(
                    "startTime",
                    event.target.value
                  )
                }
                disabled={saving}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                End Time (UTC)
              </label>

              <input
                type="time"
                value={
                  formData.endTime
                }
                onChange={(event) =>
                  updateTime(
                    "endTime",
                    event.target.value
                  )
                }
                disabled={saving}
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "18px",
            }}
          >
            <label style={labelStyle}>
              Calculated Duration
            </label>

            <input
              value={
                formData.duration
              }
              readOnly
              placeholder="Calculated automatically"
              style={
                readOnlyInputStyle
              }
            />
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>
            Incidents / Tasks
          </h3>

          <textarea
            value={
              formData.incidentsTasks
            }
            onChange={(event) =>
              updateField(
                "incidentsTasks",
                event.target.value
              )
            }
            disabled={saving}
            placeholder="Describe incidents attended, tasks completed and notable activity."
            style={textareaStyle}
          />
        </div>

        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h3
                style={{
                  ...headingStyle,
                  marginBottom:
                    "6px",
                }}
              >
                Learning Goals
              </h3>

              <p
                style={{
                  ...subTextStyle,
                  margin: 0,
                }}
              >
                Confirm whether any outstanding learning goals were completed during this patrol.
              </p>
            </div>

            <span style={ratingCountStyle}>
              {
                selectedNotebookItemIds.length
              }{" "}
              completed
            </span>
          </div>

          {!selectedTrainee ? (
            <div style={emptyChecklistStyle}>
              Select a trainee to load their outstanding learning goals.
            </div>
          ) : loadingNotebookItems ? (
            <p style={subTextStyle}>
              Loading outstanding learning goals...
            </p>
          ) : notebookLoadError ? (
            <div style={errorStyle}>
              Unable to load the trainee&apos;s learning goals:{" "}
              {notebookLoadError}
            </div>
          ) : (
            <>
              <div style={learningGoalQuestionStyle}>
                <strong>
                  Did the probationer complete any learning goals during this patrol?
                </strong>

                <div style={goalDecisionRowStyle}>
                  <button
                    type="button"
                    onClick={() =>
                      chooseLearningGoalsDecision(
                        "yes"
                      )
                    }
                    disabled={
                      saving ||
                      incompleteNotebookItems.length ===
                        0
                    }
                    style={{
                      ...goalDecisionButtonStyle,
                      ...(learningGoalsDecision ===
                      "yes"
                        ? goalYesButtonStyle
                        : goalNeutralButtonStyle),
                    }}
                  >
                    ✓ Yes
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      chooseLearningGoalsDecision(
                        "no"
                      )
                    }
                    disabled={saving}
                    style={{
                      ...goalDecisionButtonStyle,
                      ...(learningGoalsDecision ===
                      "no"
                        ? goalNoButtonStyle
                        : goalNeutralButtonStyle),
                    }}
                  >
                    ✕ No
                  </button>
                </div>

                {incompleteNotebookItems.length ===
                  0 && (
                  <p style={subTextStyle}>
                    No outstanding learning goals are currently available for this trainee.
                  </p>
                )}
              </div>

              {learningGoalsDecision ===
                "yes" && (
                <div style={goalSelectorPanelStyle}>
                  <label style={labelStyle}>
                    Select an outstanding learning goal
                  </label>

                  <select
                    value=""
                    onChange={(event) => {
                      const itemId =
                        event.target.value;

                      if (itemId) {
                        openLearningGoalModal(
                          itemId
                        );
                      }
                    }}
                    disabled={
                      saving ||
                      incompleteNotebookItems.length ===
                        0
                    }
                    style={inputStyle}
                  >
                    <option value="">
                      Choose a learning goal...
                    </option>

                    {incompleteNotebookItems
                      .filter(
                        (item) =>
                          learningGoalAssessments[
                            item.id
                          ]?.outcome !==
                          "yes"
                      )
                      .map(
                        (item) => (
                          <option
                            key={item.id}
                            value={item.id}
                          >
                            {item.section} — {item.item_label}
                          </option>
                        )
                      )}
                  </select>

                  {selectedNotebookItemIds.length >
                    0 && (
                    <div style={selectedGoalsListStyle}>
                      {selectedNotebookItemIds.map(
                        (itemId) => {
                          const item =
                            incompleteNotebookItems.find(
                              (candidate) =>
                                candidate.id ===
                                itemId
                            );

                          const assessment =
                            learningGoalAssessments[
                              itemId
                            ];

                          if (
                            !item ||
                            !assessment
                          ) {
                            return null;
                          }

                          return (
                            <div
                              key={itemId}
                              style={selectedGoalCardStyle}
                            >
                              <div>
                                <strong>
                                  {item.item_label}
                                </strong>

                                <p style={selectedGoalEvidenceStyle}>
                                  {assessment.evidence}
                                </p>
                              </div>

                              <div style={selectedGoalActionsStyle}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openLearningGoalModal(
                                      itemId
                                    )
                                  }
                                  disabled={saving}
                                  style={secondaryButtonStyle}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeLearningGoalAssessment(
                                      itemId
                                    )
                                  }
                                  disabled={saving}
                                  style={cancelDraftButtonStyle}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              )}

              {learningGoalsDecision ===
                "no" &&
                noLearningGoalsReason && (
                <div style={noGoalsReasonStyle}>
                  <strong>
                    No learning goals completed
                  </strong>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                    }}
                  >
                    {noLearningGoalsReason}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setShowNoGoalsModal(
                        true
                      )
                    }
                    disabled={saving}
                    style={{
                      ...secondaryButtonStyle,
                      marginTop:
                        "12px",
                    }}
                  >
                    Edit Reason
                  </button>
                </div>
              )}

              {learningGoalsDecision && (
                <div style={narrativePreviewStyle}>
                  <h4
                    style={{
                      margin:
                        "0 0 6px",
                    }}
                  >
                    Auto-Populated Learning Goals
                  </h4>

                  <p
                    style={{
                      ...subTextStyle,
                      margin:
                        "0 0 12px",
                    }}
                  >
                    This text will be inserted into the DOR and BBCode automatically.
                  </p>

                  <textarea
                    value={buildLearningGoalsNarrative(
                      incompleteNotebookItems,
                      learningGoalAssessments,
                      learningGoalsDecision,
                      noLearningGoalsReason
                    )}
                    readOnly
                    placeholder="Complete the learning-goal flow above to generate the DOR text."
                    style={{
                      ...textareaStyle,
                      minHeight:
                        "150px",
                      backgroundColor:
                        "#172033",
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div style={cardStyle}>
          <div
            style={
              sectionHeaderStyle
            }
          >
            <h3
              style={{
                ...headingStyle,
                marginBottom: 0,
              }}
            >
              Evaluation
            </h3>

            <span
              style={
                ratingCountStyle
              }
            >
              {completedRatings}/
              {
                evaluationCategories.length
              }{" "}
              completed
            </span>
          </div>

          <div style={ratingDefinitionsStyle}>
            {ratingDefinitions.map(
              (definition) => (
                <div
                  key={
                    definition.rating
                  }
                  style={ratingDefinitionCardStyle}
                >
                  <span style={ratingDefinitionBadgeStyle}>
                    {definition.rating}
                  </span>

                  <div>
                    <strong>
                      {definition.title}
                    </strong>

                    <p style={ratingDefinitionTextStyle}>
                      {definition.description}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          {evaluationCategories.map(
            (
              category,
              index
            ) => (
              <div
                key={category.id}
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap: "20px",
                  padding:
                    "14px 0",
                  borderBottom:
                    index ===
                    evaluationCategories.length -
                      1
                      ? "none"
                      : "1px solid #334155",
                }}
              >
                <div>
                  <div
                    style={{
                      color:
                        "#94a3b8",
                      fontSize:
                        "12px",
                      fontWeight:
                        700,
                      marginBottom:
                        "4px",
                    }}
                  >
                    {
                      category.section
                    }
                  </div>

                  <span>
                    {
                      category.label
                    }
                  </span>
                </div>

                <select
                  value={
                    evaluationRatings[
                      category.id
                    ]
                  }
                  onChange={(
                    event
                  ) =>
                    updateRating(
                      category.id,
                      event.target
                        .value as DORRating
                    )
                  }
                  disabled={saving}
                  style={{
                    ...inputStyle,
                    width:
                      "120px",
                    flexShrink: 0,
                  }}
                >
                  <option value="">
                    Select
                  </option>

                  {ratings.map(
                    (rating) => (
                      <option
                        key={rating}
                        value={rating}
                      >
                        {rating}
                      </option>
                    )
                  )}
                </select>
              </div>
            )
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>
            Feedback
          </h3>

          <label style={labelStyle}>
            Below Standard
          </label>

          <textarea
            placeholder="Enter any areas below standard, or leave blank for None."
            value={
              formData.belowStandard
            }
            onChange={(event) =>
              updateField(
                "belowStandard",
                event.target.value
              )
            }
            disabled={saving}
            style={textareaStyle}
          />

          <label style={spacedLabelStyle}>
            Above Standard
          </label>

          <textarea
            placeholder="Enter any areas above standard, or leave blank for None."
            value={
              formData.aboveStandard
            }
            onChange={(event) =>
              updateField(
                "aboveStandard",
                event.target.value
              )
            }
            disabled={saving}
            style={textareaStyle}
          />

          <label style={spacedLabelStyle}>
            Roleplay Remarks
          </label>

          <textarea
            placeholder="Enter roleplay remarks without the OOC tags."
            value={
              formData.roleplayRemarks
            }
            onChange={(event) =>
              updateField(
                "roleplayRemarks",
                event.target.value
              )
            }
            disabled={saving}
            style={textareaStyle}
          />
        </div>

        {formError && (
          <div
            style={
              validationBoxStyle
            }
          >
            {formError}
          </div>
        )}

        {successMessage && (
          <div style={successBoxStyle}>
            {successMessage}
          </div>
        )}

        <div style={buttonRowStyle}>
          {draftId && (
            <button
              type="button"
              onClick={() =>
                void cancelDraft()
              }
              disabled={
                saving ||
                cancellingDraft
              }
              style={{
                ...cancelDraftButtonStyle,
                opacity:
                  saving ||
                  cancellingDraft
                    ? 0.65
                    : 1,
                cursor:
                  saving ||
                  cancellingDraft
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {cancellingDraft
                ? "Cancelling..."
                : "Cancel DOR"}
            </button>
          )}

          <button
            type="button"
            onClick={clearForm}
            disabled={
              saving ||
              cancellingDraft
            }
            style={{
              ...secondaryButtonStyle,
              opacity:
                saving ? 0.65 : 1,
            }}
          >
            Clear Form
          </button>

          <button
            type="button"
            onClick={() =>
              void saveDraft(false)
            }
            disabled={
              saving ||
              !selectedTrainee
            }
            style={{
              ...draftButtonStyle,
              opacity:
                saving ||
                !selectedTrainee
                  ? 0.65
                  : 1,
            }}
          >
            Save Draft
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              ...primaryButtonStyle,
              opacity:
                saving ? 0.7 : 1,
              cursor:
                saving
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {saving
              ? "Submitting DOR..."
              : patrolType ===
                  "Final Evaluation"
                ? "Submit Final Evaluation DOR & Generate BBCode"
                : "Submit Final DOR & Generate BBCode"}
          </button>
        </div>
      </form>

      {pendingRatingJustification && (
        <div style={modalOverlayStyle}>
          <div style={learningGoalModalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <p style={patrolTypeLabelStyle}>
                  RATING JUSTIFICATION
                </p>

                <h3
                  style={{
                    margin:
                      "5px 0 0",
                  }}
                >
                  Rating {
                    pendingRatingJustification.rating
                  }: {
                    evaluationCategories.find(
                      (category) =>
                        category.id ===
                        pendingRatingJustification.categoryId
                    )?.label
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPendingRatingJustification(
                    null
                  );
                  setRatingJustificationDraft(
                    ""
                  );
                }}
                style={modalCloseButtonStyle}
              >
                ×
              </button>
            </div>

            <p style={subTextStyle}>
              Explain the observed performance that supports this rating. Ratings 1 and 2 populate Below Standard; rating 4 populates Above Standard.
            </p>

            <textarea
              value={
                ratingJustificationDraft
              }
              onChange={(event) =>
                setRatingJustificationDraft(
                  event.target.value
                )
              }
              placeholder="Enter the evidence and reasoning for this rating."
              style={{
                ...textareaStyle,
                minHeight:
                  "180px",
              }}
            />

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() => {
                  setPendingRatingJustification(
                    null
                  );
                  setRatingJustificationDraft(
                    ""
                  );
                }}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveRatingJustification
                }
                style={primaryButtonStyle}
              >
                Save Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedGoalForModal && (
        <div style={modalOverlayStyle}>
          <div style={learningGoalModalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <p style={patrolTypeLabelStyle}>
                  LEARNING GOAL COMPLETION
                </p>

                <h3
                  style={{
                    margin:
                      "5px 0 0",
                  }}
                >
                  {
                    incompleteNotebookItems.find(
                      (item) =>
                        item.id ===
                        selectedGoalForModal
                    )?.item_label
                  }
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedGoalForModal(
                    ""
                  );
                  setGoalEvidenceDraft(
                    ""
                  );
                }}
                style={modalCloseButtonStyle}
              >
                ×
              </button>
            </div>

            <p style={subTextStyle}>
              Record what the probationer did, the standard demonstrated and any coaching or support provided.
            </p>

            <label style={spacedLabelStyle}>
              Evidence
            </label>

            <textarea
              value={
                goalEvidenceDraft
              }
              onChange={(event) =>
                setGoalEvidenceDraft(
                  event.target.value
                )
              }
              placeholder="Enter the evidence supporting completion of this learning goal."
              style={{
                ...textareaStyle,
                minHeight:
                  "180px",
              }}
            />

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() => {
                  setSelectedGoalForModal(
                    ""
                  );
                  setGoalEvidenceDraft(
                    ""
                  );
                }}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveLearningGoalFromModal
                }
                style={primaryButtonStyle}
              >
                Save Learning Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoGoalsModal && (
        <div style={modalOverlayStyle}>
          <div style={learningGoalModalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <p style={patrolTypeLabelStyle}>
                  LEARNING GOALS
                </p>

                <h3
                  style={{
                    margin:
                      "5px 0 0",
                  }}
                >
                  Why were no learning goals completed?
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowNoGoalsModal(
                    false
                  )
                }
                style={modalCloseButtonStyle}
              >
                ×
              </button>
            </div>

            <p style={subTextStyle}>
              Give a brief reason, such as no suitable opportunity arising during the patrol.
            </p>

            <textarea
              value={
                noLearningGoalsReason
              }
              onChange={(event) =>
                setNoLearningGoalsReason(
                  event.target.value
                )
              }
              placeholder="Explain why no learning goals were completed."
              style={{
                ...textareaStyle,
                minHeight:
                  "160px",
              }}
            />

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() =>
                  setShowNoGoalsModal(
                    false
                  )
                }
                style={secondaryButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveNoLearningGoalsReason
                }
                style={primaryButtonStyle}
              >
                Save Reason
              </button>
            </div>
          </div>
        </div>
      )}

      {generatedBBCode && (
        <div
          style={{
            ...cardStyle,
            marginTop:
              "25px",
          }}
        >
          <div
            style={
              sectionHeaderStyle
            }
          >
            <h3
              style={{
                ...headingStyle,
                marginBottom: 0,
              }}
            >
              Generated BBCode
            </h3>

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
          </div>

          <textarea
            value={
              generatedBBCode
            }
            readOnly
            style={{
              ...textareaStyle,
              height:
                "500px",
              marginTop:
                "18px",
              fontFamily:
                "monospace",
            }}
          />
        </div>
      )}
    </div>
  );
}

function dorAuditSnapshot(
  payload: Record<string, unknown>,
  formData: DORFormData,
  selectedNotebookItemIds: string[]
) {
  return {
    trainee_id:
      payload.trainee_id,

    trainee_name:
      formData.probationaryOfficer,

    trainee_badge_number:
      formData.badgeNumber,

    trainee_rank:
      formData.rank,

    trainee_work_number:
      formData.workNumber,

    fto_id:
      payload.fto_id,

    fto_name:
      formData.fieldTrainingOfficer,

    fto_badge_number:
      formData.ftoBadgeNumber,

    patrol_number:
      payload.patrol_number,

    patrol_type:
      payload.patrol_type,

    patrol_date:
      payload.patrol_date,

    start_time:
      payload.start_time,

    end_time:
      payload.end_time,

    duration:
      payload.duration,

    incidents:
      payload.incidents,

    below_standard:
      payload.below_standard,

    above_standard:
      payload.above_standard,

    learning_goals:
      payload.learning_goals,

    roleplay_remarks:
      payload.roleplay_remarks,

    ratings:
      payload.ratings,

    rating_justifications:
      payload.rating_justifications,

    completed_notebook_item_ids:
      selectedNotebookItemIds,

    notebook_assessments:
      payload.notebook_assessments,

    status:
      payload.status,

    started_by:
      payload.started_by,

    completed_by:
      payload.completed_by,

    last_saved_at:
      payload.last_saved_at,

    submitted_at:
      payload.submitted_at,
  };
}

function normalisePatrolType(
  value: unknown
): PatrolType {
  if (
    value === "FPP" ||
    value ===
      "Final Evaluation"
  ) {
    return value;
  }

  return "Standard";
}

function getDraftStatusText(
  status:
    | "idle"
    | "saving"
    | "saved"
    | "error",
  lastSavedAt: string | null
) {
  if (status === "saving") {
    return "Autosaving...";
  }

  if (status === "error") {
    return "Autosave failed. Use Save Draft to retry.";
  }

  if (
    status === "saved" &&
    lastSavedAt
  ) {
    return `Saved ${formatSavedTime(
      lastSavedAt
    )}`;
  }

  return "Changes will autosave after you stop typing.";
}

function formatSavedTime(
  value: string
) {
  return new Date(
    value
  ).toLocaleTimeString(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function DraftAgeWarning({
  lastSavedAt,
}: {
  lastSavedAt: string;
}) {
  const ageHours =
    (
      Date.now() -
      new Date(
        lastSavedAt
      ).getTime()
    ) /
    (
      1000 *
      60 *
      60
    );

  if (ageHours < 18) {
    return null;
  }

  const overdue =
    ageHours >= 24;

  return (
    <div
      style={
        overdue
          ? overdueDraftStyle
          : warningDraftStyle
      }
    >
      {overdue
        ? "Overdue: draft is more than 24 hours old."
        : "Warning: draft is approaching 24 hours old."}
    </div>
  );
}


const patrolTypeBannerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "14px 16px",
  marginTop: "20px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
  flexWrap: "wrap" as const,
};

const patrolTypeLabelStyle = {
  margin: "0 0 5px",
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const patrolTypeBadgeStyle = {
  padding: "6px 10px",
  border: "1px solid",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 900,
};

const standardBadgeStyle = {
  color: "#cbd5e1",
  backgroundColor: "#334155",
  borderColor: "#475569",
};

const fppBadgeStyle = {
  color: "#fde68a",
  backgroundColor:
    "rgba(120, 53, 15, 0.3)",
  borderColor: "#a16207",
};

const finalEvaluationBadgeStyle = {
  color: "#fed7aa",
  backgroundColor:
    "rgba(154, 52, 18, 0.3)",
  borderColor: "#ea580c",
};

const orientationGateHelpStyle = {
  margin:
    "-10px 0 22px",
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: 1.5,
};

const cardStyle = {
  padding: "24px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "12px",
  backgroundColor: "#0f172a",
  color: "white",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const readOnlyInputStyle = {
  ...inputStyle,
  backgroundColor: "#172033",
  color: "#cbd5e1",
  cursor: "default",
};

const textareaStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  minHeight: "120px",
  padding: "12px",
  backgroundColor: "#0f172a",
  color: "white",
  border: "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
};

const headingStyle = {
  marginTop: 0,
  marginBottom: "20px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: 600,
};

const spacedLabelStyle = {
  ...labelStyle,
  marginTop: "18px",
};

const subTextStyle = {
  color: "#94a3b8",
};

const errorStyle = {
  padding: "12px",
  marginBottom: "18px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
};

const validationBoxStyle = {
  padding: "16px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
  lineHeight: 1.6,
  whiteSpace:
    "pre-line" as const,
};

const successBoxStyle = {
  padding: "14px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border:
    "1px solid #166534",
  borderRadius: "8px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
};

const ratingCountStyle = {
  padding: "6px 10px",
  color: "#cbd5e1",
  backgroundColor: "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: "999px",
  fontSize: "13px",
  whiteSpace:
    "nowrap" as const,
};

const buttonRowStyle = {
  display: "flex",
  justifyContent:
    "flex-end",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const draftStatusCardStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "16px",
  marginBottom: "20px",
  color: "#cbd5e1",
  backgroundColor: "#172033",
  border: "1px solid #334155",
  borderRadius: "10px",
  flexWrap: "wrap" as const,
};

const draftStatusTextStyle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "13px",
};

const warningDraftStyle = {
  padding: "8px 10px",
  color: "#fde68a",
  backgroundColor:
    "rgba(120, 53, 15, 0.3)",
  border: "1px solid #a16207",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 700,
};

const overdueDraftStyle = {
  padding: "8px 10px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 700,
};

const cancelDraftButtonStyle = {
  padding: "14px 20px",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  color: "#fecaca",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#991b1b",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: 700,
};

const draftButtonStyle = {
  padding: "14px 20px",
  backgroundColor: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 600,
};

const primaryButtonStyle = {
  padding: "14px 20px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: 600,
};

const secondaryButtonStyle = {
  padding: "14px 20px",
  backgroundColor: "#334155",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
};

const copyButtonStyle = {
  padding: "9px 14px",
  backgroundColor: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 600,
};

const smallButtonStyle = {
  padding: "9px 13px",
  backgroundColor: "#475569",
  color: "white",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 600,
};

const checklistSectionsStyle = {
  display: "grid",
  gap: "18px",
  marginTop: "20px",
};

const checklistSectionStyle = {
  overflow: "hidden",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const checklistSectionHeadingStyle = {
  margin: 0,
  padding: "13px 16px",
  color: "#93c5fd",
  backgroundColor: "#111827",
  borderBottom: "1px solid #334155",
};

const checklistItemsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "10px",
  padding: "14px",
};

const checklistItemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "12px",
  backgroundColor: "#172033",
  border: "1px solid #334155",
  borderRadius: "8px",
  cursor: "pointer",
  lineHeight: 1.4,
};

const emptyChecklistStyle = {
  marginTop: "18px",
  padding: "16px",
  color: "#94a3b8",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
};

const completeChecklistStyle = {
  marginTop: "18px",
  padding: "16px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
};

const learningGoalCardsStyle = {
  display: "grid",
  gap: "14px",
  padding: "14px",
};

const learningGoalCardStyle = {
  padding: "16px",
  backgroundColor: "#172033",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const learningGoalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap" as const,
};

const goalStatusBadgeStyle = {
  padding: "5px 9px",
  border: "1px solid",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
};

const goalYesBadgeStyle = {
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  borderColor: "#166534",
};

const goalNoBadgeStyle = {
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  borderColor: "#991b1b",
};

const goalUnassessedBadgeStyle = {
  color: "#cbd5e1",
  backgroundColor: "#334155",
  borderColor: "#475569",
};

const goalDecisionRowStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
};

const goalDecisionButtonStyle = {
  minWidth: "92px",
  padding: "10px 14px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const goalNeutralButtonStyle = {
  color: "#cbd5e1",
  backgroundColor: "#0f172a",
  borderColor: "#475569",
};

const goalYesButtonStyle = {
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.45)",
  borderColor: "#16a34a",
};

const goalNoButtonStyle = {
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.45)",
  borderColor: "#dc2626",
};

const goalEvidenceStyle = {
  ...textareaStyle,
  minHeight: "110px",
};

const narrativePreviewStyle = {
  padding: "16px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};


const learningGoalQuestionStyle = {
  display: "grid",
  gap: "14px",
  padding: "16px",
  marginTop: "18px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const goalSelectorPanelStyle = {
  display: "grid",
  gap: "14px",
  padding: "16px",
  marginTop: "14px",
  backgroundColor: "#172033",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const selectedGoalsListStyle = {
  display: "grid",
  gap: "10px",
};

const selectedGoalCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  padding: "14px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
  flexWrap: "wrap" as const,
};

const selectedGoalEvidenceStyle = {
  margin: "6px 0 0",
  color: "#94a3b8",
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.5,
};

const selectedGoalActionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const noGoalsReasonStyle = {
  padding: "16px",
  marginTop: "14px",
  color: "#fde68a",
  backgroundColor:
    "rgba(120, 53, 15, 0.3)",
  border: "1px solid #a16207",
  borderRadius: "10px",
};

const modalOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 2000,
  display: "grid",
  placeItems: "center",
  padding: "24px",
  backgroundColor:
    "rgba(2, 6, 23, 0.88)",
};

const learningGoalModalStyle = {
  width: "100%",
  maxWidth: "680px",
  maxHeight: "90vh",
  overflowY: "auto" as const,
  boxSizing: "border-box" as const,
  padding: "24px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "14px",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  marginBottom: "14px",
};

const modalCloseButtonStyle = {
  padding: "0 8px",
  color: "white",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "30px",
  lineHeight: 1,
};


const ratingDefinitionsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "10px",
  padding: "14px",
  margin: "18px 0",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const ratingDefinitionCardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "10px",
  backgroundColor: "#172033",
  borderRadius: "8px",
};

const ratingDefinitionBadgeStyle = {
  minWidth: "36px",
  padding: "6px 8px",
  color: "#bfdbfe",
  textAlign: "center" as const,
  backgroundColor:
    "rgba(37, 99, 235, 0.18)",
  border: "1px solid #2563eb",
  borderRadius: "7px",
  fontWeight: 900,
};

const ratingDefinitionTextStyle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: 1.45,
};