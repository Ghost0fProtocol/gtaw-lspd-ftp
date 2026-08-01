"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { getTrainees } from "../lib/trainees";
import { supabase } from "../lib/supabase";
import {
  DORRating,
  generateDORBBCode,
} from "../lib/generateDORBBCode";

type Props = {
  traineeId?: string;
};

type Trainee = {
  id: string;
  name: string;
  rank: string;
  badgeNumber: string;
  workNumber: string;
};

type NotebookItem = {
  id: string;
  trainee_id: string;
  section: string;
  item_label: string;
  completed: boolean;
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

export default function DORForm({
  traineeId,
}: Props) {
  const [trainees, setTrainees] =
    useState<Trainee[]>([]);

  const [selectedTrainee, setSelectedTrainee] =
    useState("");

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

        const data =
          await getTrainees();

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
      saving
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
    selectedNotebookItemIds,
    loadingDraft,
    saving,
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

  function updateRating(
    id: number,
    rating: DORRating
  ) {
    setFormError("");
    setSuccessMessage("");

    setEvaluationRatings(
      (current) => ({
        ...current,
        [id]: rating,
      })
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

      setIncompleteNotebookItems(
        data ?? []
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

  function toggleNotebookItemSelection(
    itemId: string
  ) {
    setFormError("");
    setSuccessMessage("");

    setSelectedNotebookItemIds(
      (current) =>
        current.includes(itemId)
          ? current.filter(
              (id) => id !== itemId
            )
          : [
              ...current,
              itemId,
            ]
    );
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

      setSelectedNotebookItemIds(
        Array.isArray(
          data.completed_notebook_items
        )
          ? data.completed_notebook_items
          : []
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
        formData.learningGoals.trim() ||
        null,
      roleplay_remarks:
        formData.roleplayRemarks.trim() ||
        null,
      ratings:
        evaluationRatings,
      completed_notebook_items:
        selectedNotebookItemIds,
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

    try {
      const currentDraftId =
        draftIdRef.current ??
        draftId;

      if (currentDraftId) {
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
        const {
          data,
          error,
        } = await supabase
          .from("dors")
          .insert(
            draftPayload
          )
          .select(
            "id, started_by, last_saved_at"
          )
          .single();

        if (error) {
          throw error;
        }

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

    setSaving(true);
    setFormError("");
    setSuccessMessage("");

    const bbcode =
      generateDORBBCode(
        formData,
        evaluationRatings
      );

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
          formData.learningGoals.trim() ||
          null,
        roleplay_remarks:
          formData.roleplayRemarks.trim() ||
          null,
        ratings:
          evaluationRatings,
        completed_notebook_items:
          selectedNotebookItemIds,
        bbcode,
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

      if (draftId) {
        const {
          error,
        } = await supabase
          .from("dors")
          .update(
            submittedPayload
          )
          .eq(
            "id",
            draftId
          );

        if (error) {
          throw error;
        }
      } else {
        const {
          error,
        } = await supabase
          .from("dors")
          .insert(
            submittedPayload
          );

        if (error) {
          throw error;
        }
      }

      const savedPatrolNumber =
        formData.patrolNumber;

      let checklistUpdateWarning = "";

      if (
        selectedNotebookItemIds.length > 0
      ) {
        const {
          error:
            notebookUpdateError,
        } = await supabase
          .from("notebook_items")
          .update({
            completed: true,
          })
          .in(
            "id",
            selectedNotebookItemIds
          )
          .eq(
            "trainee_id",
            selectedTrainee
          );

        if (notebookUpdateError) {
          console.error(
            "UPDATE NOTEBOOK ITEMS ERROR",
            notebookUpdateError
          );

          checklistUpdateWarning =
            " The DOR saved, but the selected checklist items could not be updated.";
        }
      }

      setGeneratedBBCode(
        bbcode
      );

      setSuccessMessage(
        `DOR Patrol ${savedPatrolNumber} saved successfully.${checklistUpdateWarning} The form has been cleared and the BBCode is ready to copy below.`
      );

      setSelectedTrainee("");
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

      setIncompleteNotebookItems([]);
      setSelectedNotebookItemIds([]);
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

  function clearForm() {
    setSelectedTrainee("");
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

    setIncompleteNotebookItems([]);
    setSelectedNotebookItemIds([]);
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
                >
                  {trainee.name}
                </option>
              )
            )}
          </select>

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
          <div
            style={
              sectionHeaderStyle
            }
          >
            <div>
              <h3
                style={{
                  ...headingStyle,
                  marginBottom: "6px",
                }}
              >
                Checklist Items Completed This Patrol
              </h3>

              <p
                style={{
                  ...subTextStyle,
                  margin: 0,
                }}
              >
                Select incomplete notebook items completed during this patrol.
                They will be checked off after the DOR saves successfully.
              </p>
            </div>

            <span
              style={
                ratingCountStyle
              }
            >
              {
                selectedNotebookItemIds.length
              }{" "}
              selected
            </span>
          </div>

          {loadingNotebookItems ? (
            <p style={subTextStyle}>
              Loading incomplete checklist items...
            </p>
          ) : notebookLoadError ? (
            <div style={errorStyle}>
              Unable to load the trainee checklist:{" "}
              {notebookLoadError}
            </div>
          ) : !selectedTrainee ? (
            <div style={emptyChecklistStyle}>
              Select a trainee to load their incomplete checklist items.
            </div>
          ) : incompleteNotebookItems.length === 0 ? (
            <div style={completeChecklistStyle}>
              All available checklist items are already complete.
            </div>
          ) : (
            <div style={checklistSectionsStyle}>
              {Object.entries(
                notebookItemsBySection
              ).map(
                ([
                  section,
                  sectionItems,
                ]) => (
                  <div
                    key={section}
                    style={
                      checklistSectionStyle
                    }
                  >
                    <h4
                      style={
                        checklistSectionHeadingStyle
                      }
                    >
                      {section}
                    </h4>

                    <div
                      style={
                        checklistItemsStyle
                      }
                    >
                      {sectionItems.map(
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
                                selectedNotebookItemIds.includes(
                                  item.id
                                )
                              }
                              onChange={() =>
                                toggleNotebookItemSelection(
                                  item.id
                                )
                              }
                              disabled={
                                saving
                              }
                            />

                            <span>
                              {
                                item.item_label
                              }
                            </span>
                          </label>
                        )
                      )}
                    </div>
                  </div>
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
            Learning Goals
          </label>

          <textarea
            placeholder="Enter learning goals for the trainee, or leave blank for None."
            value={
              formData.learningGoals
            }
            onChange={(event) =>
              updateField(
                "learningGoals",
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
          <button
            type="button"
            onClick={clearForm}
            disabled={saving}
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
              : "Submit Final DOR & Generate BBCode"}
          </button>
        </div>
      </form>

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