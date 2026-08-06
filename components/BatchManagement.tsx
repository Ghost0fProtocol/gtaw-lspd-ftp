"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import { auditAction } from "../lib/auditAction";

type Props = {
  user: any;
};

type BatchStatus = "Upcoming" | "Active" | "Completed" | "Archived";
type WorkspaceTab = "overview" | "probationers" | "calendar" | "summary" | "settings";

type Batch = {
  id: string;
  name: string;
  induction_date: string;
  minimum_upgrade_date?: string | null;
  fpp_deadline?: string | null;
  final_completion_deadline?: string | null;
  status: BatchStatus;
  intake_size: number | null;
  notes: string | null;
  created_at: string;
  created_by?: string | null;
};

type Profile = {
  id: string;
  name: string | null;
  badge_number: string | null;
  rank: string | null;
  role: string | null;
  division?: string | null;
};

type Trainee = {
  id: string;
  profile_id: string;
  batch_id: string | null;
  status: string | null;
  training_stage: string | null;
  start_date: string | null;
  assigned_ftm: string | null;
  profile: Profile | null;
};

type AvailabilityWindow = {
  id?: string;
  profile_id: string;
  start_time: string;
  end_time: string;
};

type SupervisionPreference = {
  profile_id: string;
  available_for_p1s: boolean;
  max_active_p1s: number | null;
};

type BatchForm = {
  name: string;
  inductionDate: string;
  intakeSize: string;
  status: BatchStatus;
  notes: string;
};

type FtmAssignmentMode = "add" | "change";

type FtmAssignmentTarget = {
  trainee: Trainee;
  mode: FtmAssignmentMode;
};

type SuitabilityResult = {
  profile: Profile;
  score: number;
  band: "Excellent" | "Strong" | "Workable" | "Limited";
  reasons: string[];
  warnings: string[];
  currentLoad: number;
  capacity: number;
  atCapacity: boolean;
  accepting: boolean;
  overlapMinutes: number;
  ftmAvailabilityMinutes: number;
};

type BatchDOR = {
  id: string;
  trainee_id: string;
  fto_id: string;
  duration: string | null;
  patrol_date: string | null;
  submitted_at: string | null;
  status: string;
};

type BatchSummaryStatus =
  | "draft"
  | "published"
  | "revised";

type ContributionSnapshot = {
  profileId: string;
  name: string;
  rank: string;
  badgeNumber: string;
  patrols: number;
  minutes: number;
  exempt: boolean;
  note: string;
};

type BatchSummary = {
  id: string;
  batch_id: string;
  title: string;
  status: BatchSummaryStatus;
  quota_required: number;
  total_recruits: number;
  total_reinstatements: number;
  total_promotions: number;
  total_resignations: number;
  total_terminations: number;
  total_patrols: number;
  total_instruction_minutes: number;
  officers_below_quota: number;
  zero_patrol_officers: number;
  active_loa_count: number;
  exemption_request_count: number;
  contribution_snapshot: ContributionSnapshot[];
  written_summary: string | null;
  management_notes: string | null;
  signoff_name: string | null;
  signoff_rank: string | null;
  bbcode: string | null;
  published_at: string | null;
  published_by: string | null;
  revision_number: number;
  created_at: string;
  updated_at: string;
};

type SummaryDraft = {
  title: string;
  quotaRequired: string;
  totalRecruits: string;
  totalReinstatements: string;
  totalPromotions: string;
  totalResignations: string;
  totalTerminations: string;
  activeLoaCount: string;
  exemptionRequestCount: string;
  writtenSummary: string;
  managementNotes: string;
  signoffName: string;
  signoffRank: string;
};

const MANAGEMENT_ROLES = new Set([
  "Field Training Manager",
  "Field Training Supervisor",
  "FTM",
  "FTS",
  "STAFF",
  "FTP Staff",
  "LSPD STAFF",
]);

const CONTRIBUTION_ROLES = [
  "Field Training Officer",
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

const FTM_ROLES = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTM",
  "FTS",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

const MAX_ACTIVE_P1S_PER_FTM = 4;

const FTP_MILESTONES = {
  minimumUpgrade: 21,
  fppDeadline: 43,
  completion: 50,
} as const;

const EMPTY_FORM: BatchForm = {
  name: "",
  inductionDate: "",
  intakeSize: "",
  status: "Upcoming",
  notes: "",
};

export default function BatchManagement({ user }: Props) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [ftms, setFtms] = useState<Profile[]>([]);
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);
  const [preferences, setPreferences] = useState<SupervisionPreference[]>([]);

  const [batchDors, setBatchDors] = useState<BatchDOR[]>([]);
  const [contributionProfiles, setContributionProfiles] = useState<Profile[]>([]);
  const [batchSummaries, setBatchSummaries] = useState<BatchSummary[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [form, setForm] = useState<BatchForm>(EMPTY_FORM);
  const [batchSearch, setBatchSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | BatchStatus>("All");
  const [traineeSearch, setTraineeSearch] = useState("");

  const [ftmAssignmentTarget, setFtmAssignmentTarget] = useState<FtmAssignmentTarget | null>(null);
  const [selectedFtmId, setSelectedFtmId] = useState("");
  const [capacityOverride, setCapacityOverride] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canEdit = MANAGEMENT_ROLES.has(user?.role ?? "");

  useEffect(() => {
    void loadData();
  }, []);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === selectedBatchId) ?? null,
    [batches, selectedBatchId]
  );

  const selectedSummary = useMemo(
    () =>
      batchSummaries.find(
        (summary) =>
          summary.batch_id ===
          selectedBatchId
      ) ?? null,
    [
      batchSummaries,
      selectedBatchId,
    ]
  );

  const publishedSummaryArchive = useMemo(
    () =>
      batchSummaries
        .filter(
          (summary) =>
            summary.status ===
              "published" ||
            summary.status ===
              "revised"
        )
        .sort(
          (first, second) =>
            String(
              second.published_at ??
              second.updated_at
            ).localeCompare(
              String(
                first.published_at ??
                first.updated_at
              )
            )
        ),
    [batchSummaries]
  );

  const assignedTrainees = useMemo(
    () => trainees.filter((trainee) => trainee.batch_id === selectedBatchId),
    [trainees, selectedBatchId]
  );

  const availableTrainees = useMemo(() => {
    const needle = traineeSearch.trim().toLowerCase();

    return trainees
      .filter((trainee) => !trainee.batch_id)
      .filter((trainee) => {
        if (!needle) return true;

        return [
          trainee.profile?.name,
          trainee.profile?.badge_number,
          trainee.profile?.rank,
          trainee.training_stage,
          trainee.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }, [trainees, traineeSearch]);

  const filteredBatches = useMemo(() => {
    const needle = batchSearch.trim().toLowerCase();

    return batches.filter((batch) => {
      const statusMatches = statusFilter === "All" || batch.status === statusFilter;
      const textMatches =
        !needle ||
        [batch.name, batch.status, batch.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return statusMatches && textMatches;
    });
  }, [batches, batchSearch, statusFilter]);

  const programmeStats = useMemo(() => {
    const activeP1s = trainees.filter((trainee) => trainee.batch_id).length;
    const needsFtm = trainees.filter(
      (trainee) => trainee.batch_id && !trainee.assigned_ftm
    ).length;

    return {
      activeBatches: batches.filter((batch) => batch.status === "Active").length,
      upcomingBatches: batches.filter((batch) => batch.status === "Upcoming").length,
      activeP1s,
      needsFtm,
    };
  }, [batches, trainees]);

  const selectedBatchHealth = useMemo(() => {
    const assigned = assignedTrainees.filter((trainee) => trainee.assigned_ftm).length;
    const unassigned = assignedTrainees.length - assigned;
    const overCapacityFtms = ftms.filter((ftm) => activeLoadFor(ftm.id, trainees) > MAX_ACTIVE_P1S_PER_FTM).length;

    return {
      assigned,
      unassigned,
      overCapacityFtms,
      complete: assignedTrainees.length > 0 && unassigned === 0,
    };
  }, [assignedTrainees, ftms, preferences, trainees]);

  const ftmRecommendations = useMemo<SuitabilityResult[]>(() => {
    if (!ftmAssignmentTarget) return [];

    return rankFtmsForTrainee(
      ftmAssignmentTarget.trainee,
      ftms,
      trainees,
      availability,
      preferences
    );
  }, [ftmAssignmentTarget, ftms, trainees, availability, preferences]);

  const selectedRecommendation = useMemo(
    () => ftmRecommendations.find((result) => result.profile.id === selectedFtmId) ?? null,
    [ftmRecommendations, selectedFtmId]
  );

  const milestones = useMemo(() => {
    if (!selectedBatch) return [];

    return [
      {
        label: "Induction",
        date: selectedBatch.induction_date,
        day: 0,
      },
      {
        label: "Minimum upgrade",
        date:
          selectedBatch.minimum_upgrade_date ||
          addDays(selectedBatch.induction_date, FTP_MILESTONES.minimumUpgrade),
        day: FTP_MILESTONES.minimumUpgrade,
      },
      {
        label: "FPP deadline",
        date:
          selectedBatch.fpp_deadline ||
          addDays(selectedBatch.induction_date, FTP_MILESTONES.fppDeadline),
        day: FTP_MILESTONES.fppDeadline,
      },
      {
        label: "Completion",
        date:
          selectedBatch.final_completion_deadline ||
          addDays(selectedBatch.induction_date, FTP_MILESTONES.completion),
        day: FTP_MILESTONES.completion,
      },
    ];
  }, [selectedBatch]);

  async function loadData(preferredBatchId?: string) {
    setLoading(true);
    setError("");

    try {
      const [
        batchResult,
        traineeResult,
        ftmResult,
        availabilityResult,
        preferenceResult,
        dorResult,
        contributionProfileResult,
        summaryResult,
      ] =
        await Promise.all([
          supabase
            .from("ftp_batches")
            .select("*")
            .order("induction_date", { ascending: false }),
          supabase
            .from("trainees")
            .select(`
              id,
              profile_id,
              batch_id,
              status,
              training_stage,
              start_date,
              assigned_ftm,
              profile:profiles!trainees_profile_id_fkey(
                id,
                name,
                badge_number,
                rank,
                role,
                division
              )
            `),
          supabase
            .from("profiles")
            .select("id,name,badge_number,rank,role,division")
            .in("role", FTM_ROLES)
            .order("name", { ascending: true }),
          supabase
            .from("ftp_availability_windows")
            .select("id,profile_id,start_time,end_time"),
          supabase
            .from("ftp_supervision_preferences")
            .select("profile_id,available_for_p1s,max_active_p1s"),
          supabase
            .from("dors")
            .select(
              "id,trainee_id,fto_id,duration,patrol_date,submitted_at,status"
            )
            .eq("status", "submitted"),
          supabase
            .from("profiles")
            .select(
              "id,name,badge_number,rank,role,division"
            )
            .in("role", CONTRIBUTION_ROLES)
            .order("name", { ascending: true }),
          supabase
            .from("ftp_batch_summaries")
            .select("*")
            .order("updated_at", { ascending: false }),
        ]);

      const firstError = [
        batchResult.error,
        traineeResult.error,
        ftmResult.error,
        availabilityResult.error,
        preferenceResult.error,
        dorResult.error,
        contributionProfileResult.error,
        summaryResult.error,
      ].find(Boolean);

      if (firstError) throw firstError;

      const loadedBatches = (batchResult.data ?? []) as Batch[];
      const loadedTrainees = (traineeResult.data ?? []).map((item: any) => ({
        ...item,
        profile: normaliseRelation<Profile>(item.profile),
      })) as Trainee[];

      setBatches(loadedBatches);
      setTrainees(loadedTrainees);
      setFtms((ftmResult.data ?? []) as Profile[]);
      setAvailability((availabilityResult.data ?? []) as AvailabilityWindow[]);
      setPreferences((preferenceResult.data ?? []) as SupervisionPreference[]);

      setBatchDors(
        (dorResult.data ?? []) as BatchDOR[]
      );
      setContributionProfiles(
        (contributionProfileResult.data ?? []) as Profile[]
      );
      setBatchSummaries(
        (summaryResult.data ?? []).map(
          (summary: any) => ({
            ...summary,
            contribution_snapshot:
              Array.isArray(
                summary.contribution_snapshot
              )
                ? summary.contribution_snapshot
                : [],
          })
        ) as BatchSummary[]
      );

      const desiredId =
        preferredBatchId ||
        selectedBatchId ||
        loadedBatches.find((batch) => batch.status === "Active")?.id ||
        loadedBatches[0]?.id ||
        "";

      setSelectedBatchId(desiredId);

      const chosen = loadedBatches.find((batch) => batch.id === desiredId);
      if (chosen) setForm(batchToForm(chosen));
    } catch (loadError: any) {
      console.error("BATCH MANAGEMENT LOAD ERROR", loadError);
      setError(loadError?.message ?? "Batch management data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  function selectBatch(batch: Batch) {
    setSelectedBatchId(batch.id);
    setForm(batchToForm(batch));
    setActiveTab("overview");
    setTraineeSearch("");
    clearMessages();
  }


  function openArchivedSummary(
    summary: BatchSummary
  ) {
    const batch =
      batches.find(
        (item) =>
          item.id ===
          summary.batch_id
      );

    if (!batch) {
      return;
    }

    setSelectedBatchId(
      batch.id
    );
    setForm(
      batchToForm(
        batch
      )
    );
    setActiveTab(
      "summary"
    );
    clearMessages();
  }

  function startNewBatch() {
    setSelectedBatchId("");
    setForm(EMPTY_FORM);
    setActiveTab("settings");
    clearMessages();
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function openFtmAssignment(trainee: Trainee, mode: FtmAssignmentMode) {
    setFtmAssignmentTarget({ trainee, mode });
    setSelectedFtmId(trainee.assigned_ftm ?? "");
    setCapacityOverride(false);
    clearMessages();
  }

  function closeFtmAssignment() {
    if (saving) return;
    setFtmAssignmentTarget(null);
    setSelectedFtmId("");
    setCapacityOverride(false);
  }

  async function saveBatch(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return;

    if (!form.name.trim() || !form.inductionDate) {
      setError("Batch name and induction date are required.");
      return;
    }

    setSaving(true);
    clearMessages();

    const payload = {
      name: form.name.trim(),
      induction_date: form.inductionDate,
      minimum_upgrade_date: addDays(
        form.inductionDate,
        FTP_MILESTONES.minimumUpgrade
      ),
      fpp_deadline: addDays(form.inductionDate, FTP_MILESTONES.fppDeadline),
      final_completion_deadline: addDays(
        form.inductionDate,
        FTP_MILESTONES.completion
      ),
      intake_size: form.intakeSize ? Number(form.intakeSize) : null,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    try {
      if (selectedBatch) {
        const oldData = batchAuditSnapshot(selectedBatch);

        const { data } =
          await auditAction({
            user,

            action: "UPDATE_BATCH",
            category: "Intakes",

            entityType: "ftp_batch",
            entityId: selectedBatch.id,
            targetName: payload.name,

            oldData,
            newData: payload,

            execute: async () => {
              const result = await supabase
                .from("ftp_batches")
                .update(payload)
                .eq("id", selectedBatch.id)
                .select()
                .single();

              if (result.error) {
                throw result.error;
              }

              return result;
            },
          });

        setSuccess("Batch details updated.");
        await loadData(data.id);
      } else {
        const { data } =
          await auditAction({
            user,

            action: "CREATE_BATCH",
            category: "Intakes",

            entityType: "ftp_batch",
            targetName: form.name.trim(),

            newData: payload,

            execute: async () => {
              const result = await supabase
                .from("ftp_batches")
                .insert({
                  ...payload,
                  created_by: user?.id ?? null,
                })
                .select()
                .single();

              if (result.error) {
                throw result.error;
              }

              return result;
            },
          });
        setSuccess("New FTP intake created.");
        setActiveTab("overview");
        await loadData(data.id);
      }
    } catch (saveError: any) {
      console.error("SAVE BATCH ERROR", saveError);
      setError(saveError?.message ?? "The batch could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBatch() {
    if (!selectedBatch || !canEdit) return;

    const confirmed = window.confirm(
      `Delete ${selectedBatch.name}? Its probationers will be returned to the available pool.`
    );
    if (!confirmed) return;

    setSaving(true);
    clearMessages();

    try {
      const affectedTrainees = trainees
        .filter((trainee) => trainee.batch_id === selectedBatch.id)
        .map((trainee) => ({
          trainee_id: trainee.id,
          trainee_name: trainee.profile?.name ?? "Unnamed probationer",
          assigned_ftm_id: trainee.assigned_ftm,
          assigned_ftm_name:
            ftms.find((profile) => profile.id === trainee.assigned_ftm)?.name ??
            null,
        }));

      const { error: traineeError } = await supabase
        .from("trainees")
        .update({
          batch_id: null,
          assigned_ftm: null,
        })
        .eq("batch_id", selectedBatch.id);

      if (traineeError) {
        throw traineeError;
      }

      await auditAction({
        user,

        action: "DELETE_BATCH",
        category: "Intakes",

        entityType: "ftp_batch",
        entityId: selectedBatch.id,
        targetName: selectedBatch.name,

        oldData: {
          ...batchAuditSnapshot(selectedBatch),
          removed_probationers: affectedTrainees,
        },

        execute: async () => {
          const result = await supabase
            .from("ftp_batches")
            .delete()
            .eq("id", selectedBatch.id);

          if (result.error) {
            throw result.error;
          }

          return result;
        },
      });

      setSelectedBatchId("");
      setForm(EMPTY_FORM);
      setSuccess("Batch deleted.");
      await loadData();
    } catch (deleteError: any) {
      setError(deleteError?.message ?? "The batch could not be deleted.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmFtmAssignment() {
    if (!ftmAssignmentTarget || !selectedBatch || !canEdit) return;

    const selected = ftmRecommendations.find(
      (result) => result.profile.id === selectedFtmId
    );

    if (!selected) {
      setError("Choose an FTM before continuing.");
      return;
    }

    if (selected.atCapacity && !capacityOverride) {
      setError("This FTM is at capacity. Enable the manual override to continue.");
      return;
    }

    setSaving(true);
    clearMessages();

    const trainee = ftmAssignmentTarget.trainee;
    const isAdding = ftmAssignmentTarget.mode === "add";
    const previousFtm =
      ftms.find((profile) => profile.id === trainee.assigned_ftm) ?? null;

    const payload: Record<string, string | null> = {
      assigned_ftm: selectedFtmId,
    };

    if (isAdding) {
      payload.batch_id = selectedBatch.id;
      payload.start_date = selectedBatch.induction_date;
    }

    try {
      await auditAction({
        user,

        action: isAdding
          ? "ADD_P1_TO_BATCH"
          : trainee.assigned_ftm
            ? "CHANGE_FTM"
            : "ASSIGN_FTM",

        category: "Probationers",

        entityType: "trainee",
        entityId: trainee.id,
        targetName: trainee.profile?.name ?? "Unnamed probationer",

        oldData: isAdding
          ? {
              batch_id: trainee.batch_id,
              batch_name: null,
              assigned_ftm_id: trainee.assigned_ftm,
              assigned_ftm_name: previousFtm?.name ?? null,
              start_date: trainee.start_date,
            }
          : {
              batch_id: selectedBatch.id,
              batch_name: selectedBatch.name,
              assigned_ftm_id: trainee.assigned_ftm,
              assigned_ftm_name: previousFtm?.name ?? null,
            },

        newData: {
          batch_id: selectedBatch.id,
          batch_name: selectedBatch.name,
          assigned_ftm_id: selected.profile.id,
          assigned_ftm_name: selected.profile.name,
          start_date: isAdding
            ? selectedBatch.induction_date
            : trainee.start_date,
          capacity_override_used:
            selected.atCapacity && capacityOverride,
          selected_ftm_current_load: selected.currentLoad,
          selected_ftm_capacity: selected.capacity,
          selected_ftm_accepting_p1s: selected.accepting,
          suitability_score: selected.score,
          suitability_band: selected.band,
        },

        execute: async () => {
          const result = await supabase
            .from("trainees")
            .update(payload)
            .eq("id", trainee.id);

          if (result.error) {
            throw result.error;
          }

          return result;
        },
      });

      setSuccess(
        isAdding
          ? "Probationer added and FTM assigned."
          : "FTM assignment updated."
      );

      closeFtmAssignment();
      await loadData(selectedBatch.id);
    } catch (assignmentError: any) {
      setError(
        assignmentError?.message ??
          "The FTM assignment could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeTrainee(trainee: Trainee) {
    if (!selectedBatch || !canEdit) return;

    const confirmed = window.confirm(
      `Remove ${trainee.profile?.name ?? "this probationer"} from ${selectedBatch.name}?`
    );
    if (!confirmed) return;

    setSaving(true);
    clearMessages();

    const previousFtm =
      ftms.find((profile) => profile.id === trainee.assigned_ftm) ?? null;

    try {
      await auditAction({
        user,

        action: "REMOVE_P1_FROM_BATCH",
        category: "Probationers",

        entityType: "trainee",
        entityId: trainee.id,
        targetName: trainee.profile?.name ?? "Unnamed probationer",

        oldData: {
          batch_id: selectedBatch.id,
          batch_name: selectedBatch.name,
          assigned_ftm_id: trainee.assigned_ftm,
          assigned_ftm_name: previousFtm?.name ?? null,
          start_date: trainee.start_date,
        },

        newData: {
          batch_id: null,
          batch_name: null,
          assigned_ftm_id: null,
          assigned_ftm_name: null,
          start_date: trainee.start_date,
        },

        execute: async () => {
          const result = await supabase
            .from("trainees")
            .update({
              batch_id: null,
              assigned_ftm: null,
            })
            .eq("id", trainee.id);

          if (result.error) {
            throw result.error;
          }

          return result;
        },
      });

      setSuccess("Probationer removed from the intake.");
      await loadData(selectedBatch.id);
    } catch (removeError: any) {
      setError(
        removeError?.message ??
          "The probationer could not be removed."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bm-loading">
        <div className="bm-spinner" />
        <div>
          <strong>Preparing Batch Command Centre</strong>
          <span>Loading intakes, probationers and FTM availability…</span>
        </div>
        <Styles />
      </div>
    );
  }

  return (
    <div className="bm-page">
      <Styles />

      <header className="bm-hero">
        <div>
          <div className="bm-eyebrow">FIELD TRAINING PROGRAM</div>
          <h1>Batch Command Centre</h1>
          <p>
            Build each intake, place probationers and assign the right FTM to every
            individual from one operational workspace.
          </p>
        </div>

        <div className="bm-hero-actions">
          <button className="bm-button bm-button-secondary" onClick={() => void loadData(selectedBatchId)}>
            Refresh data
          </button>
          {canEdit && (
            <button className="bm-button bm-button-primary" onClick={startNewBatch}>
              + New intake
            </button>
          )}
        </div>
      </header>

      <section className="bm-stat-grid">
        <StatCard label="Active intakes" value={programmeStats.activeBatches} hint="Currently in programme" />
        <StatCard label="Upcoming" value={programmeStats.upcomingBatches} hint="Awaiting induction" />
        <StatCard label="Active P1s" value={programmeStats.activeP1s} hint="Across all batches" />
        <StatCard
          label="Needs FTM"
          value={programmeStats.needsFtm}
          hint={programmeStats.needsFtm ? "Action recommended" : "All allocated"}
          alert={programmeStats.needsFtm > 0}
        />
      </section>

      {error && (
        <Notice tone="error" title="Something needs attention" onClose={() => setError("")}>
          {error}
        </Notice>
      )}

      {success && (
        <Notice tone="success" title="Update complete" onClose={() => setSuccess("")}>
          {success}
        </Notice>
      )}

      <section className="bm-shell">
        <aside className="bm-sidebar">
          <div className="bm-sidebar-heading">
            <div>
              <div className="bm-eyebrow">INTAKE REGISTER</div>
              <h2>Batches</h2>
            </div>
            <span className="bm-count-pill">{batches.length}</span>
          </div>

          <div className="bm-sidebar-filters">
            <input
              value={batchSearch}
              onChange={(event) => setBatchSearch(event.target.value)}
              placeholder="Search batches…"
              className="bm-input"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "All" | BatchStatus)}
              className="bm-select"
            >
              <option value="All">All</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div className="bm-batch-list">
            {filteredBatches.map((batch) => {
              const members = trainees.filter((trainee) => trainee.batch_id === batch.id);
              const needsFtm = members.filter((trainee) => !trainee.assigned_ftm).length;

              return (
                <button
                  key={batch.id}
                  className={`bm-batch-item ${selectedBatchId === batch.id ? "is-selected" : ""}`}
                  onClick={() => selectBatch(batch)}
                >
                  <div className="bm-batch-item-top">
                    <strong>{batch.name}</strong>
                    <StatusBadge status={batch.status} />
                  </div>
                  <span>Induction {formatDate(batch.induction_date)}</span>
                  <div className="bm-batch-meta">
                    <span>{members.length} P1{members.length === 1 ? "" : "s"}</span>
                    <span className={needsFtm ? "is-warning" : ""}>
                      {needsFtm ? `${needsFtm} needs FTM` : "All allocated"}
                    </span>
                  </div>
                </button>
              );
            })}

            {!filteredBatches.length && (
              <EmptyState title="No matching batches" text="Try a different search or status filter." compact />
            )}
          </div>
        </aside>

        <main className="bm-workspace">
          {!selectedBatch ? (
            <BatchSettings
              title="Create a new intake"
              form={form}
              setForm={setForm}
              saving={saving}
              canEdit={canEdit}
              onSubmit={saveBatch}
            />
          ) : (
            <>
              <div className="bm-workspace-header">
                <div>
                  <div className="bm-title-row">
                    <h2>{selectedBatch.name}</h2>
                    <StatusBadge status={selectedBatch.status} />
                  </div>
                  <p>
                    Inducted {formatDate(selectedBatch.induction_date)} · {assignedTrainees.length}
                    {" "}of {selectedBatch.intake_size ?? "unlimited"} probationers assigned
                  </p>
                </div>

                {canEdit && (
                  <button
                    className="bm-button bm-button-secondary"
                    onClick={() => setActiveTab("settings")}
                  >
                    Edit intake
                  </button>
                )}
              </div>

              <nav className="bm-tabs" aria-label="Batch workspace">
                <TabButton label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
                <TabButton
                  label="Probationers"
                  count={assignedTrainees.length}
                  active={activeTab === "probationers"}
                  onClick={() => setActiveTab("probationers")}
                />
                <TabButton
                  label="Calendar"
                  active={activeTab === "calendar"}
                  onClick={() => setActiveTab("calendar")}
                />
                <TabButton
                  label="Batch summary"
                  active={activeTab === "summary"}
                  onClick={() => setActiveTab("summary")}
                />
                <TabButton
                  label="Batch settings"
                  active={activeTab === "settings"}
                  onClick={() => setActiveTab("settings")}
                />
              </nav>

              <div className="bm-workspace-body">
                {activeTab === "overview" && (
                  <OverviewTab
                    batch={selectedBatch}
                    trainees={assignedTrainees}
                    ftms={ftms}
                    health={selectedBatchHealth}
                    milestones={milestones}
                    onOpenProbationers={() => setActiveTab("probationers")}
                    onOpenFtmAssignment={(trainee) => openFtmAssignment(trainee, "change")}
                  />
                )}

                {activeTab === "probationers" && (
                  <ProbationersTab
                    batch={selectedBatch}
                    assigned={assignedTrainees}
                    available={availableTrainees}
                    ftms={ftms}
                    search={traineeSearch}
                    setSearch={setTraineeSearch}
                    canEdit={canEdit}
                    saving={saving}
                    onAdd={(trainee) => openFtmAssignment(trainee, "add")}
                    onChangeFtm={(trainee) => openFtmAssignment(trainee, "change")}
                    onRemove={(trainee) => void removeTrainee(trainee)}
                  />
                )}

                {activeTab === "calendar" && (
                  <BatchCalendar
                    batch={selectedBatch}
                    milestones={milestones}
                  />
                )}

                {activeTab === "summary" && (
                  <BatchSummaryWorkspace
                    batch={selectedBatch}
                    trainees={assignedTrainees}
                    dors={batchDors}
                    contributionProfiles={contributionProfiles}
                    existingSummary={selectedSummary}
                    archive={publishedSummaryArchive}
                    user={user}
                    canEdit={canEdit}
                    saving={saving}
                    setSaving={setSaving}
                    setError={setError}
                    setSuccess={setSuccess}
                    onReload={() =>
                      loadData(
                        selectedBatch.id
                      )
                    }
                    onOpenArchivedSummary={
                      openArchivedSummary
                    }
                  />
                )}

                {activeTab === "settings" && (
                  <BatchSettings
                    title="Batch settings"
                    form={form}
                    setForm={setForm}
                    saving={saving}
                    canEdit={canEdit}
                    onSubmit={saveBatch}
                    onDelete={deleteBatch}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </section>

      {ftmAssignmentTarget && selectedBatch && (
        <FtmAssignmentModal
          target={ftmAssignmentTarget}
          batch={selectedBatch}
          results={ftmRecommendations}
          selectedFtmId={selectedFtmId}
          setSelectedFtmId={setSelectedFtmId}
          selectedResult={selectedRecommendation}
          override={capacityOverride}
          setOverride={setCapacityOverride}
          saving={saving}
          onClose={closeFtmAssignment}
          onConfirm={() => void confirmFtmAssignment()}
        />
      )}
    </div>
  );
}

function OverviewTab({
  batch,
  trainees,
  ftms,
  health,
  milestones,
  onOpenProbationers,
  onOpenFtmAssignment,
}: {
  batch: Batch;
  trainees: Trainee[];
  ftms: Profile[];
  health: {
    assigned: number;
    unassigned: number;
    overCapacityFtms: number;
    complete: boolean;
  };
  milestones: Array<{ label: string; date: string; day: number }>;
  onOpenProbationers: () => void;
  onOpenFtmAssignment: (trainee: Trainee) => void;
}) {
  const needsFtm = trainees.filter((trainee) => !trainee.assigned_ftm);
  const capacity = batch.intake_size ?? 0;
  const fill = capacity ? Math.min(100, Math.round((trainees.length / capacity) * 100)) : 0;

  return (
    <div className="bm-stack">
      <section className="bm-overview-grid">
        <div className="bm-panel bm-panel-large">
          <PanelHeading eyebrow="BATCH HEALTH" title="FTM coverage" />

          <div className="bm-health-summary">
            <div className={`bm-health-icon ${health.complete ? "is-good" : "is-warning"}`}>
              {health.complete ? "✓" : "!"}
            </div>
            <div>
              <strong>
                {health.complete
                  ? "Every P1 has an FTM"
                  : `${health.unassigned} P1${health.unassigned === 1 ? "" : "s"} still ${health.unassigned === 1 ? "needs" : "need"} an FTM`}
              </strong>
              <span>
                {health.complete
                  ? "This intake is ready from an FTM assignment perspective."
                  : "Open the probationer workspace to assign an FTM to each outstanding probationer."}
              </span>
            </div>
          </div>

          <div className="bm-mini-stat-grid">
            <MiniStat label="Probationers" value={trainees.length} />
            <MiniStat label="P1s with an FTM" value={health.assigned} />
            <MiniStat label="P1s without an FTM" value={health.unassigned} alert={health.unassigned > 0} />
            <MiniStat label="FTMs above 4 P1s" value={health.overCapacityFtms} alert={health.overCapacityFtms > 0} />
          </div>

          <button className="bm-button bm-button-primary bm-inline-action" onClick={onOpenProbationers}>
            Manage probationers
          </button>
        </div>

        <div className="bm-panel">
          <PanelHeading eyebrow="INTAKE CAPACITY" title="Places filled" />
          <div className="bm-capacity-number">
            <strong>{trainees.length}</strong>
            <span>/ {capacity || "∞"}</span>
          </div>
          {capacity > 0 ? (
            <>
              <div className="bm-progress"><span style={{ width: `${fill}%` }} /></div>
              <p>{Math.max(capacity - trainees.length, 0)} spaces remaining</p>
            </>
          ) : (
            <p>No intake limit has been set.</p>
          )}
        </div>
      </section>

      <section className="bm-panel">
        <PanelHeading eyebrow="PROGRAMME TIMELINE" title="Key dates" />
        <div className="bm-milestone-grid">
          {milestones.map((milestone) => (
            <div key={milestone.label} className="bm-milestone-card">
              <span>{milestone.label}</span>
              <strong>{formatDate(milestone.date)}</strong>
              <small>{milestone.day === 0 ? "Programme start" : `Day ${milestone.day}`}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="bm-panel">
        <div className="bm-panel-title-row">
          <PanelHeading eyebrow="FTM ASSIGNMENTS" title="Needs attention" />
          <span className="bm-count-pill">{needsFtm.length}</span>
        </div>

        {needsFtm.length ? (
          <div className="bm-exception-list">
            {needsFtm.map((trainee) => (
              <div key={trainee.id} className="bm-exception-row">
                <PersonIdentity profile={trainee.profile} subline="This P1 does not currently have an FTM" />
                <button className="bm-button bm-button-primary" onClick={() => onOpenFtmAssignment(trainee)}>
                  Assign FTM
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No missing FTM assignments" text="Every P1 in this intake currently has one FTM." compact />
        )}
      </section>
    </div>
  );
}

function ProbationersTab({
  batch,
  assigned,
  available,
  ftms,
  search,
  setSearch,
  canEdit,
  saving,
  onAdd,
  onChangeFtm,
  onRemove,
}: {
  batch: Batch;
  assigned: Trainee[];
  available: Trainee[];
  ftms: Profile[];
  search: string;
  setSearch: (value: string) => void;
  canEdit: boolean;
  saving: boolean;
  onAdd: (trainee: Trainee) => void;
  onChangeFtm: (trainee: Trainee) => void;
  onRemove: (trainee: Trainee) => void;
}) {
  const capacity = batch.intake_size ?? 0;
  const spacesLeft = capacity ? Math.max(capacity - assigned.length, 0) : null;

  return (
    <div className="bm-stack">
      <section className="bm-panel">
        <div className="bm-panel-title-row">
          <PanelHeading
            eyebrow="CURRENT INTAKE"
            title={`${assigned.length} probationer${assigned.length === 1 ? "" : "s"} in ${batch.name}`}
          />
          <span className="bm-count-pill">
            {spacesLeft === null ? "No limit" : `${spacesLeft} spaces left`}
          </span>
        </div>

        {assigned.length ? (
          <div className="bm-trainee-grid">
            {assigned.map((trainee) => {
              const ftm = ftms.find((profile) => profile.id === trainee.assigned_ftm) ?? null;

              return (
                <article key={trainee.id} className="bm-trainee-card">
                  <div className="bm-trainee-card-main">
                    <PersonIdentity profile={trainee.profile} />
                    <div className="bm-chip-row">
                      <span className="bm-chip">{trainee.training_stage || "Stage not set"}</span>
                      <span className="bm-chip">{trainee.status || "Status not set"}</span>
                    </div>
                  </div>

                  <div className={`bm-ftm-assignment ${ftm ? "" : "is-missing"}`}>
                    <span>Current FTM</span>
                    <strong>{ftm?.name ?? "Not assigned"}</strong>
                    <small>
                      {ftm
                        ? [ftm.rank, ftm.badge_number ? `#${ftm.badge_number}` : null]
                            .filter(Boolean)
                            .join(" · ")
                        : "FTM required"}
                    </small>
                  </div>

                  {canEdit && (
                    <div className="bm-card-actions">
                      <button
                        className="bm-button bm-button-primary"
                        disabled={saving}
                        onClick={() => onChangeFtm(trainee)}
                      >
                        {ftm ? "Change FTM" : "Assign FTM"}
                      </button>
                      <button
                        className="bm-button bm-button-danger-ghost"
                        disabled={saving}
                        onClick={() => onRemove(trainee)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No probationers in this intake" text="Add somebody from the available P1 pool below." compact />
        )}
      </section>

      <section className="bm-panel">
        <PanelHeading eyebrow="AVAILABLE P1 POOL" title="Place probationers into this intake" />

        <div className="bm-search-wrap">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, badge, rank or stage…"
            className="bm-input"
          />
        </div>

        {available.length ? (
          <div className="bm-available-grid">
            {available.map((trainee) => (
              <div key={trainee.id} className="bm-available-row">
                <PersonIdentity profile={trainee.profile} />
                <div className="bm-chip-row">
                  <span className="bm-chip">{trainee.training_stage || "Stage not set"}</span>
                  <span className="bm-chip">{trainee.status || "Status not set"}</span>
                </div>
                {canEdit && (
                  <button
                    className="bm-button bm-button-secondary"
                    disabled={saving || (spacesLeft !== null && spacesLeft <= 0)}
                    onClick={() => onAdd(trainee)}
                  >
                    Add to intake
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={search ? "No matching probationers" : "No probationers available"}
            text={search ? "Try a different search." : "Every probationer is already attached to a batch."}
            compact
          />
        )}
      </section>
    </div>
  );
}

function FtmAssignmentModal({
  target,
  batch,
  results,
  selectedFtmId,
  setSelectedFtmId,
  selectedResult,
  override,
  setOverride,
  saving,
  onClose,
  onConfirm,
}: {
  target: FtmAssignmentTarget;
  batch: Batch;
  results: SuitabilityResult[];
  selectedFtmId: string;
  setSelectedFtmId: (value: string) => void;
  selectedResult: SuitabilityResult | null;
  override: boolean;
  setOverride: (value: boolean) => void;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const personName = target.trainee.profile?.name ?? "Probationer";
  const isAdd = target.mode === "add";

  return (
    <div className="bm-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="bm-modal-header">
          <div>
            <div className="bm-eyebrow">FTM ASSIGNMENT</div>
            <h2 id="assignment-title">
              {isAdd ? `Add ${personName} to ${batch.name}` : `Change ${personName}’s FTM`}
            </h2>
            <p>
              Choose the single FTM who will currently oversee this P1. Recommendations use availability overlap, current workload and whether the FTM is accepting P1s. The assignment can be changed later.
            </p>
          </div>
          <button className="bm-close-button" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="bm-modal-body">
          <div className="bm-modal-person">
            <PersonIdentity profile={target.trainee.profile} />
            <div className="bm-chip-row">
              <span className="bm-chip">{target.trainee.training_stage || "Stage not set"}</span>
              <span className="bm-chip">{target.trainee.status || "Status not set"}</span>
            </div>
          </div>

          <div className="bm-assignment-rule">One P1 can have one current FTM. Changing the FTM replaces the existing assignment.</div>

          <div className="bm-ranking-heading">
            <div>
              <div className="bm-eyebrow">RANKED BY SUITABILITY</div>
              <h3>Choose this P1’s FTM</h3>
            </div>
            <span className="bm-count-pill">{results.length} FTMs ranked</span>
          </div>

          <div className="bm-ranking-list">
            {results.map((result, index) => {
              const selected = selectedFtmId === result.profile.id;
              const disabled = result.atCapacity && !override;

              return (
                <button
                  key={result.profile.id}
                  type="button"
                  className={`bm-ranking-card ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
                  onClick={() => {
                    if (disabled) return;
                    setSelectedFtmId(result.profile.id);
                  }}
                >
                  <div className="bm-ranking-position">{index + 1}</div>
                  <div className="bm-ranking-content">
                    <div className="bm-ranking-topline">
                      <div>
                        <strong>{result.profile.name ?? "Unnamed FTM"}</strong>
                        <span>
                          {[result.profile.rank, result.profile.badge_number ? `#${result.profile.badge_number}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <div className="bm-score-block">
                        <strong>{result.score}%</strong>
                        <span className={`bm-band bm-band-${result.band.toLowerCase()}`}>{result.band}</span>
                      </div>
                    </div>

                    <div className="bm-reason-grid">
                      {result.reasons.map((reason) => (
                        <span key={reason} className="bm-reason is-positive">✓ {reason}</span>
                      ))}
                      {result.warnings.map((warning) => (
                        <span key={warning} className="bm-reason is-warning">! {warning}</span>
                      ))}
                    </div>

                    <div className="bm-load-row">
                      <span>Current load</span>
                      <strong>{result.currentLoad} of {result.capacity} P1s</strong>
                      <div className="bm-load-bar">
                        <span style={{ width: `${Math.min(100, (result.currentLoad / Math.max(result.capacity, 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {!results.length && (
              <EmptyState title="No FTM records found" text="Check profile roles and supervision settings." compact />
            )}
          </div>

          {results.some((result) => result.atCapacity) && (
            <label className="bm-override-box">
              <input
                type="checkbox"
                checked={override}
                onChange={(event) => {
                  setOverride(event.target.checked);
                  if (!event.target.checked && selectedResult?.atCapacity) {
                    setSelectedFtmId("");
                  }
                }}
              />
              <span>
                <strong>Allow manual capacity override</strong>
                <small>
                  FTMs with four active P1s remain visible but cannot be selected unless this override is enabled.
                </small>
              </span>
            </label>
          )}
        </div>

        <footer className="bm-modal-footer">
          <div className="bm-modal-footer-actions">
            <button className="bm-button bm-button-secondary" disabled={saving} onClick={onClose}>
              Cancel
            </button>
            <button
              className="bm-button bm-button-primary"
              disabled={saving || !selectedFtmId || (selectedResult?.atCapacity === true && !override)}
              onClick={onConfirm}
            >
              {saving
                ? "Saving…"
                : isAdd
                ? "Add P1 with selected FTM"
                : "Change FTM"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}


function BatchSummaryWorkspace({
  batch,
  trainees,
  dors,
  contributionProfiles,
  existingSummary,
  archive,
  user,
  canEdit,
  saving,
  setSaving,
  setError,
  setSuccess,
  onReload,
  onOpenArchivedSummary,
}: {
  batch: Batch;
  trainees: Trainee[];
  dors: BatchDOR[];
  contributionProfiles: Profile[];
  existingSummary: BatchSummary | null;
  archive: BatchSummary[];
  user: any;
  canEdit: boolean;
  saving: boolean;
  setSaving: (value: boolean) => void;
  setError: (value: string) => void;
  setSuccess: (value: string) => void;
  onReload: () => Promise<void>;
  onOpenArchivedSummary: (
    summary: BatchSummary
  ) => void;
}) {
  const computed =
    useMemo(
      () =>
        calculateBatchSummary({
          batch,
          trainees,
          dors,
          contributionProfiles,
        }),
      [
        batch,
        trainees,
        dors,
        contributionProfiles,
      ]
    );

  const [draft, setDraft] =
    useState<SummaryDraft>(() =>
      summaryToDraft(
        existingSummary,
        batch,
        computed,
        user
      )
    );

  const [previewOpen, setPreviewOpen] =
    useState(false);

  useEffect(() => {
    setDraft(
      summaryToDraft(
        existingSummary,
        batch,
        computed,
        user
      )
    );
  }, [
    existingSummary?.id,
    existingSummary?.updated_at,
    batch.id,
    computed.totalPatrols,
    computed.totalInstructionMinutes,
  ]);

  const contributionSnapshot =
    existingSummary &&
    (
      existingSummary.status ===
        "published" ||
      existingSummary.status ===
        "revised"
    )
      ? existingSummary.contribution_snapshot
      : computed.contributions;

  const bbcode =
    buildBatchSummaryBBCode({
      batch,
      draft,
      totalPatrols:
        existingSummary &&
        (
          existingSummary.status ===
            "published" ||
          existingSummary.status ===
            "revised"
        )
          ? existingSummary.total_patrols
          : computed.totalPatrols,
      totalInstructionMinutes:
        existingSummary &&
        (
          existingSummary.status ===
            "published" ||
          existingSummary.status ===
            "revised"
        )
          ? existingSummary.total_instruction_minutes
          : computed.totalInstructionMinutes,
      contributions:
        contributionSnapshot,
    });

  const published =
    existingSummary?.status ===
      "published" ||
    existingSummary?.status ===
      "revised";

  async function saveSummary(
    publish: boolean
  ) {
    if (!canEdit) {
      return;
    }

    if (
      !draft.title.trim() ||
      !draft.writtenSummary.trim()
    ) {
      setError(
        "A summary title and written summary are required."
      );
      return;
    }

    if (
      publish &&
      !window.confirm(
        `Publish and close ${batch.name}? The figures and contribution ranking will be permanently snapshotted for review.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const now =
        new Date().toISOString();

      const status:
        BatchSummaryStatus =
        publish
          ? existingSummary &&
            (
              existingSummary.status ===
                "published" ||
              existingSummary.status ===
                "revised"
            )
            ? "revised"
            : "published"
          : "draft";

      const payload = {
        batch_id:
          batch.id,
        title:
          draft.title.trim(),
        status,
        quota_required:
          safeInteger(
            draft.quotaRequired,
            3
          ),
        total_recruits:
          safeInteger(
            draft.totalRecruits,
            trainees.length
          ),
        total_reinstatements:
          safeInteger(
            draft.totalReinstatements,
            0
          ),
        total_promotions:
          safeInteger(
            draft.totalPromotions,
            computed.totalPromotions
          ),
        total_resignations:
          safeInteger(
            draft.totalResignations,
            computed.totalResignations
          ),
        total_terminations:
          safeInteger(
            draft.totalTerminations,
            computed.totalTerminations
          ),
        total_patrols:
          computed.totalPatrols,
        total_instruction_minutes:
          computed.totalInstructionMinutes,
        officers_below_quota:
          contributionSnapshot.filter(
            (entry) =>
              !entry.exempt &&
              entry.patrols <
                safeInteger(
                  draft.quotaRequired,
                  3
                )
          ).length,
        zero_patrol_officers:
          contributionProfiles.filter(
            (profile) =>
              !contributionSnapshot.some(
                (entry) =>
                  entry.profileId ===
                  profile.id
              )
          ).length,
        active_loa_count:
          safeInteger(
            draft.activeLoaCount,
            0
          ),
        exemption_request_count:
          safeInteger(
            draft.exemptionRequestCount,
            0
          ),
        contribution_snapshot:
          contributionSnapshot,
        written_summary:
          draft.writtenSummary.trim(),
        management_notes:
          draft.managementNotes.trim() ||
          null,
        signoff_name:
          draft.signoffName.trim() ||
          null,
        signoff_rank:
          draft.signoffRank.trim() ||
          null,
        bbcode,
        published_at:
          publish
            ? now
            : existingSummary?.published_at ??
              null,
        published_by:
          publish
            ? user?.id ??
              null
            : existingSummary?.published_by ??
              null,
        revision_number:
          publish &&
          existingSummary
            ? (
                existingSummary.revision_number ??
                1
              ) + 1
            : existingSummary?.revision_number ??
              1,
        updated_at:
          now,
      };

      await auditAction({
        user,
        action:
          publish
            ? "PUBLISH_BATCH_SUMMARY"
            : "SAVE_BATCH_SUMMARY_DRAFT",
        category:
          "Intakes",
        entityType:
          "ftp_batch_summary",
        entityId:
          existingSummary?.id,
        targetName:
          draft.title.trim(),
        oldData:
          existingSummary ??
          null,
        newData:
          payload,
        execute:
          async () => {
            const result =
              await supabase
                .from(
                  "ftp_batch_summaries"
                )
                .upsert(
                  payload,
                  {
                    onConflict:
                      "batch_id",
                  }
                )
                .select()
                .single();

            if (result.error) {
              throw result.error;
            }

            if (publish) {
              const batchResult =
                await supabase
                  .from(
                    "ftp_batches"
                  )
                  .update({
                    status:
                      "Completed",
                  })
                  .eq(
                    "id",
                    batch.id
                  );

              if (
                batchResult.error
              ) {
                throw batchResult.error;
              }
            }

            return result;
          },
      });

      setSuccess(
        publish
          ? "Batch summary published, archived and distributed to all FTOs+ for review."
          : "Batch summary draft saved."
      );

      await onReload();
    } catch (
      summaryError: any
    ) {
      console.error(
        "SAVE BATCH SUMMARY ERROR",
        summaryError
      );

      setError(
        summaryError?.message ??
        "The batch summary could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyBBCode() {
    try {
      await navigator.clipboard.writeText(
        bbcode
      );

      setSuccess(
        "Batch summary BBCode copied."
      );
    } catch {
      setError(
        "The BBCode could not be copied automatically."
      );
    }
  }

  return (
    <div className="bm-stack">
      <section className="bm-summary-hero">
        <div>
          <div className="bm-eyebrow">
            END OF BATCH REPORTING
          </div>

          <h3>
            Batch Summary & Archive
          </h3>

          <p>
            Generate the official written summary, permanently snapshot the figures and distribute the published report to every FTO+ dashboard for acknowledgement.
          </p>
        </div>

        <div className="bm-summary-status">
          <span>
            STATUS
          </span>

          <strong>
            {published
              ? "Published"
              : existingSummary
                ? "Draft"
                : "Not started"}
          </strong>

          {existingSummary?.published_at && (
            <small>
              {formatDateTime(
                existingSummary.published_at
              )}
            </small>
          )}
        </div>
      </section>

      <section className="bm-summary-stat-grid">
        <SummaryMetric
          label="Recruits"
          value={
            safeInteger(
              draft.totalRecruits,
              trainees.length
            )
          }
        />

        <SummaryMetric
          label="Promotions"
          value={
            safeInteger(
              draft.totalPromotions,
              computed.totalPromotions
            )
          }
        />

        <SummaryMetric
          label="Recorded FTPs"
          value={
            computed.totalPatrols
          }
        />

        <SummaryMetric
          label="Instruction Time"
          value={
            formatDurationLong(
              computed.totalInstructionMinutes
            )
          }
        />

        <SummaryMetric
          label="Below Quota"
          value={
            contributionSnapshot.filter(
              (entry) =>
                !entry.exempt &&
                entry.patrols <
                  safeInteger(
                    draft.quotaRequired,
                    3
                  )
            ).length
          }
          alert
        />
      </section>

      <section className="bm-panel">
        <div className="bm-panel-title-row">
          <PanelHeading
            eyebrow="OFFICIAL REPORT"
            title="Written summary"
          />

          <div className="bm-summary-actions">
            <button
              type="button"
              className="bm-button bm-button-secondary"
              onClick={() =>
                setPreviewOpen(
                  !previewOpen
                )
              }
            >
              {previewOpen
                ? "Hide BBCode"
                : "Preview BBCode"}
            </button>

            <button
              type="button"
              className="bm-button bm-button-secondary"
              onClick={() =>
                void copyBBCode()
              }
            >
              Copy BBCode
            </button>
          </div>
        </div>

        <div className="bm-summary-form-grid">
          <Field label="Report title">
            <input
              className="bm-input"
              value={draft.title}
              disabled={
                !canEdit ||
                saving
              }
              onChange={(event) =>
                setDraft({
                  ...draft,
                  title:
                    event.target.value,
                })
              }
            />
          </Field>

          <Field label="Minimum FTO patrol quota">
            <input
              className="bm-input"
              type="number"
              min="0"
              value={
                draft.quotaRequired
              }
              disabled={
                !canEdit ||
                saving
              }
              onChange={(event) =>
                setDraft({
                  ...draft,
                  quotaRequired:
                    event.target.value,
                })
              }
            />
          </Field>
        </div>

        <Field label="Management written summary">
          <textarea
            className="bm-textarea bm-summary-commentary"
            value={
              draft.writtenSummary
            }
            disabled={
              !canEdit ||
              saving
            }
            onChange={(event) =>
              setDraft({
                ...draft,
                writtenSummary:
                  event.target.value,
              })
            }
          />
        </Field>

        <div className="bm-summary-count-grid">
          <SummaryNumberField
            label="Recruits"
            value={
              draft.totalRecruits
            }
            disabled={
              !canEdit ||
              saving
            }
            onChange={(value) =>
              setDraft({
                ...draft,
                totalRecruits:
                  value,
              })
            }
          />

          <SummaryNumberField
            label="Reinstatements"
            value={
              draft.totalReinstatements
            }
            disabled={
              !canEdit ||
              saving
            }
            onChange={(value) =>
              setDraft({
                ...draft,
                totalReinstatements:
                  value,
              })
            }
          />

          <SummaryNumberField
            label="Promotions"
            value={
              draft.totalPromotions
            }
            disabled={
              !canEdit ||
              saving
            }
            onChange={(value) =>
              setDraft({
                ...draft,
                totalPromotions:
                  value,
              })
            }
          />

          <SummaryNumberField
            label="Resignations"
            value={
              draft.totalResignations
            }
            disabled={
              !canEdit ||
              saving
            }
            onChange={(value) =>
              setDraft({
                ...draft,
                totalResignations:
                  value,
              })
            }
          />

          <SummaryNumberField
            label="Terminations"
            value={
              draft.totalTerminations
            }
            disabled={
              !canEdit ||
              saving
            }
            onChange={(value) =>
              setDraft({
                ...draft,
                totalTerminations:
                  value,
              })
            }
          />

          <SummaryNumberField
            label="Active LOAs"
            value={
              draft.activeLoaCount
            }
            disabled={
              !canEdit ||
              saving
            }
            onChange={(value) =>
              setDraft({
                ...draft,
                activeLoaCount:
                  value,
              })
            }
          />

          <SummaryNumberField
            label="Exemption requests"
            value={
              draft.exemptionRequestCount
            }
            disabled={
              !canEdit ||
              saving
            }
            onChange={(value) =>
              setDraft({
                ...draft,
                exemptionRequestCount:
                  value,
              })
            }
          />
        </div>

        <Field label="Additional management notes">
          <textarea
            className="bm-textarea"
            value={
              draft.managementNotes
            }
            disabled={
              !canEdit ||
              saving
            }
            onChange={(event) =>
              setDraft({
                ...draft,
                managementNotes:
                  event.target.value,
              })
            }
            placeholder="Extensions, late joiners, exemptions or other context..."
          />
        </Field>

        <div className="bm-summary-form-grid">
          <Field label="Sign-off name">
            <input
              className="bm-input"
              value={
                draft.signoffName
              }
              disabled={
                !canEdit ||
                saving
              }
              onChange={(event) =>
                setDraft({
                  ...draft,
                  signoffName:
                    event.target.value,
                })
              }
            />
          </Field>

          <Field label="Sign-off rank/title">
            <input
              className="bm-input"
              value={
                draft.signoffRank
              }
              disabled={
                !canEdit ||
                saving
              }
              onChange={(event) =>
                setDraft({
                  ...draft,
                  signoffRank:
                    event.target.value,
                })
              }
            />
          </Field>
        </div>

        {previewOpen && (
          <pre className="bm-bbcode-preview">
            {bbcode}
          </pre>
        )}

        {canEdit && (
          <div className="bm-summary-publish-row">
            <button
              type="button"
              className="bm-button bm-button-secondary"
              disabled={saving}
              onClick={() =>
                void saveSummary(
                  false
                )
              }
            >
              {saving
                ? "Saving…"
                : "Save draft"}
            </button>

            <button
              type="button"
              className="bm-button bm-button-primary"
              disabled={saving}
              onClick={() =>
                void saveSummary(
                  true
                )
              }
            >
              {published
                ? "Publish revision"
                : "Publish & close batch"}
            </button>
          </div>
        )}
      </section>

      <section className="bm-panel">
        <div className="bm-panel-title-row">
          <PanelHeading
            eyebrow="FTO CONTRIBUTIONS"
            title="Ranked contribution table"
          />

          <span className="bm-count-pill">
            {contributionSnapshot.length}
          </span>
        </div>

        <div className="bm-contribution-table">
          <div className="bm-contribution-header">
            <span>#</span>
            <span>Officer</span>
            <span>FTPs</span>
            <span>Hours</span>
            <span>Status</span>
          </div>

          {contributionSnapshot.map(
            (
              contribution,
              index
            ) => {
              const below =
                !contribution.exempt &&
                contribution.patrols <
                  safeInteger(
                    draft.quotaRequired,
                    3
                  );

              return (
                <div
                  key={
                    contribution.profileId
                  }
                  className={`bm-contribution-row ${
                    below
                      ? "is-below"
                      : ""
                  }`}
                >
                  <span>
                    {index + 1}
                  </span>

                  <div>
                    <strong>
                      {contribution.name}
                    </strong>

                    <small>
                      {contribution.rank}
                    </small>
                  </div>

                  <strong>
                    {contribution.patrols}
                  </strong>

                  <span>
                    {formatDurationLong(
                      contribution.minutes
                    )}
                  </span>

                  <span>
                    {contribution.exempt
                      ? "Exempt"
                      : below
                        ? "Below quota"
                        : "Met quota"}
                  </span>
                </div>
              );
            }
          )}

          {!contributionSnapshot.length && (
            <EmptyState
              title="No documented FTO contributions"
              text="Submitted DORs within the batch period will appear here."
              compact
            />
          )}
        </div>
      </section>

      <section className="bm-panel">
        <div className="bm-panel-title-row">
          <PanelHeading
            eyebrow="PERMANENT RECORD"
            title="Summary archive"
          />

          <span className="bm-count-pill">
            {archive.length}
          </span>
        </div>

        <div className="bm-summary-archive">
          {archive.map(
            (summary) => (
              <button
                key={summary.id}
                type="button"
                className="bm-summary-archive-row"
                onClick={() =>
                  onOpenArchivedSummary(
                    summary
                  )
                }
              >
                <div>
                  <strong>
                    {summary.title}
                  </strong>

                  <span>
                    {summary.total_patrols} patrols ·{" "}
                    {formatDurationLong(
                      summary.total_instruction_minutes
                    )} ·{" "}
                    {summary.total_promotions} promotions
                  </span>
                </div>

                <div>
                  <span>
                    {summary.published_at
                      ? formatDateTime(
                          summary.published_at
                        )
                      : "Draft"}
                  </span>

                  <strong>
                    View →
                  </strong>
                </div>
              </button>
            )
          )}

          {!archive.length && (
            <EmptyState
              title="No published summaries yet"
              text="Published batch reports will remain available here permanently."
              compact
            />
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string | number;
  alert?: boolean;
}) {
  return (
    <div
      className={`bm-summary-metric ${
        alert
          ? "is-alert"
          : ""
      }`}
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function SummaryNumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        className="bm-input"
        type="number"
        min="0"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
      />
    </Field>
  );
}

function calculateBatchSummary({
  batch,
  trainees,
  dors,
  contributionProfiles,
}: {
  batch: Batch;
  trainees: Trainee[];
  dors: BatchDOR[];
  contributionProfiles: Profile[];
}) {
  const periodEnd =
    batch.final_completion_deadline ??
    addDays(
      batch.induction_date,
      FTP_MILESTONES.completion
    );

  const eligibleDors =
    dors.filter(
      (dor) => {
        const date =
          (
            dor.patrol_date ??
            dor.submitted_at ??
            ""
          ).slice(
            0,
            10
          );

        return (
          dor.status ===
            "submitted" &&
          date >=
            batch.induction_date &&
          date <=
            periodEnd
        );
      }
    );

  const contributionMap =
    new Map<
      string,
      {
        patrols: number;
        minutes: number;
      }
    >();

  for (
    const dor of eligibleDors
  ) {
    const current =
      contributionMap.get(
        dor.fto_id
      ) ?? {
        patrols: 0,
        minutes: 0,
      };

    current.patrols += 1;
    current.minutes +=
      parseDurationMinutes(
        dor.duration
      );

    contributionMap.set(
      dor.fto_id,
      current
    );
  }

  const contributions =
    contributionProfiles
      .map(
        (
          profile
        ): ContributionSnapshot => {
          const totals =
            contributionMap.get(
              profile.id
            ) ?? {
              patrols: 0,
              minutes: 0,
            };

          const role =
            profile.role ??
            "";

          const exempt =
            role ===
              "Field Training Manager" ||
            role ===
              "Field Training Supervisor" ||
            role ===
              "FTP Staff" ||
            role ===
              "STAFF" ||
            role ===
              "LSPD STAFF";

          return {
            profileId:
              profile.id,
            name:
              profile.name ??
              "Unnamed FTO",
            rank:
              profile.rank ??
              "Rank not set",
            badgeNumber:
              profile.badge_number ??
              "N/A",
            patrols:
              totals.patrols,
            minutes:
              totals.minutes,
            exempt,
            note:
              exempt
                ? "Management exempt"
                : "",
          };
        }
      )
      .filter(
        (entry) =>
          entry.patrols > 0
      )
      .sort(
        (
          first,
          second
        ) =>
          second.minutes -
            first.minutes ||
          second.patrols -
            first.patrols ||
          first.name.localeCompare(
            second.name
          )
      );

  return {
    totalPatrols:
      eligibleDors.length,
    totalInstructionMinutes:
      eligibleDors.reduce(
        (
          total,
          dor
        ) =>
          total +
          parseDurationMinutes(
            dor.duration
          ),
        0
      ),
    totalPromotions:
      trainees.filter(
        (trainee) =>
          trainee.status ===
            "P2" ||
          trainee.status ===
            "Completed"
      ).length,
    totalResignations:
      trainees.filter(
        (trainee) =>
          String(
            trainee.status
          ).toLowerCase() ===
          "resigned"
      ).length,
    totalTerminations:
      trainees.filter(
        (trainee) =>
          String(
            trainee.status
          ).toLowerCase() ===
          "terminated"
      ).length,
    contributions,
  };
}

function summaryToDraft(
  summary: BatchSummary | null,
  batch: Batch,
  computed: ReturnType<
    typeof calculateBatchSummary
  >,
  user: any
): SummaryDraft {
  if (summary) {
    return {
      title:
        summary.title,
      quotaRequired:
        String(
          summary.quota_required
        ),
      totalRecruits:
        String(
          summary.total_recruits
        ),
      totalReinstatements:
        String(
          summary.total_reinstatements
        ),
      totalPromotions:
        String(
          summary.total_promotions
        ),
      totalResignations:
        String(
          summary.total_resignations
        ),
      totalTerminations:
        String(
          summary.total_terminations
        ),
      activeLoaCount:
        String(
          summary.active_loa_count
        ),
      exemptionRequestCount:
        String(
          summary.exemption_request_count
        ),
      writtenSummary:
        summary.written_summary ??
        "",
      managementNotes:
        summary.management_notes ??
        "",
      signoffName:
        summary.signoff_name ??
        user?.name ??
        "",
      signoffRank:
        summary.signoff_rank ??
        user?.rank ??
        "",
    };
  }

  const monthLabel =
    new Date(
      `${batch.final_completion_deadline ?? addDays(batch.induction_date, FTP_MILESTONES.completion)}T00:00:00`
    )
      .toLocaleDateString(
        "en-GB",
        {
          month:
            "short",
          year:
            "numeric",
        }
      )
      .toUpperCase();

  return {
    title:
      `${monthLabel} CONTRIBUTIONS AND SUMMARY`,
    quotaRequired:
      "3",
    totalRecruits:
      String(
        batch.intake_size ??
        0
      ),
    totalReinstatements:
      "0",
    totalPromotions:
      String(
        computed.totalPromotions
      ),
    totalResignations:
      String(
        computed.totalResignations
      ),
    totalTerminations:
      String(
        computed.totalTerminations
      ),
    activeLoaCount:
      "0",
    exemptionRequestCount:
      "0",
    writtenSummary:
      `The ${batch.name} intake has now reached the end of its scheduled Field Training Programme. This summary records the outcomes of the intake and the documented contributions made by Field Training Officers during the batch period.\n\nField Training Management thanks every officer who contributed patrol time, feedback and supervision throughout the intake. Any recruits who remain extended or joined later than the main intake should continue through the programme under the direction of FTP leadership.`,
    managementNotes:
      "",
    signoffName:
      user?.name ??
      "",
    signoffRank:
      user?.rank ??
      "Field Training Program",
  };
}

function buildBatchSummaryBBCode({
  batch,
  draft,
  totalPatrols,
  totalInstructionMinutes,
  contributions,
}: {
  batch: Batch;
  draft: SummaryDraft;
  totalPatrols: number;
  totalInstructionMinutes: number;
  contributions: ContributionSnapshot[];
}) {
  const contributionLines =
    contributions
      .filter(
        (entry) =>
          entry.patrols >
          0
      )
      .map(
        (
          entry,
          index
        ) =>
          `[b]${index + 1}.[/b] ${entry.name} — [i]${formatDurationWords(
            entry.minutes
          )}[/i]`
      )
      .join("\n");

  return `[center][ftplogo=180][/ftplogo]
[b][size=175]${draft.title.toUpperCase()}[/size]
[size=125]FIELD TRAINING PROGRAM[/size][/b][/center]
[hr]
[justify]${draft.writtenSummary.trim()}[/justify][br][/br]
[b]TOTAL NUMBER OF RECRUITS:[/b] ${safeInteger(
    draft.totalRecruits,
    0
  )}
[b]TOTAL NUMBER OF REINSTATEMENTS:[/b] ${safeInteger(
    draft.totalReinstatements,
    0
  )}
[b]TOTAL NUMBER OF PROMOTIONS:[/b] ${safeInteger(
    draft.totalPromotions,
    0
  )}
[b]TOTAL NUMBER OF RESIGNATIONS:[/b] ${safeInteger(
    draft.totalResignations,
    0
  )}
[b]TOTAL NUMBER OF TERMINATIONS:[/b] ${safeInteger(
    draft.totalTerminations,
    0
  )}
[br][/br]
[hr]
[br][/br]
[justify]The following chart shows documented Field Training Officer contributions for ${batch.name}. Officers are listed by total recorded instruction time. Only submitted Daily Observation Reports within the batch period are included.[/justify]
[b]TOTAL RECORDED FTPS:[/b] ${totalPatrols}
[b]TOTAL INSTRUCTION TIME:[/b] ${formatDurationWords(
    totalInstructionMinutes
  )}
${contributionLines || "No documented contributions were recorded."}
[br]
[center][size=125][b]OFFICERS NOT LISTED ABOVE HAVE NO DOCUMENTED FIELD TRAINING PATROL CONTRIBUTION FOR THIS BATCH.[/b][/size][/center]
${draft.managementNotes.trim()
  ? `[br][/br][justify]${draft.managementNotes.trim()}[/justify]`
  : ""}
Respectfully,
${draft.signoffName.trim()}
${draft.signoffRank.trim()}`;
}

function safeInteger(
  value: string,
  fallback: number
) {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  return Number.isFinite(
    parsed
  )
    ? Math.max(
        0,
        parsed
      )
    : fallback;
}

function parseDurationMinutes(
  value: string | null
) {
  if (!value) {
    return 0;
  }

  const clean =
    value.trim();

  const clockMatch =
    clean.match(
      /^(\d{1,3}):(\d{2})$/
    );

  if (clockMatch) {
    return (
      Number(
        clockMatch[1]
      ) *
        60 +
      Number(
        clockMatch[2]
      )
    );
  }

  const hourMatch =
    clean.match(
      /(\d+(?:\.\d+)?)\s*h/i
    );

  const minuteMatch =
    clean.match(
      /(\d+)\s*m/i
    );

  return Math.round(
    (
      hourMatch
        ? Number(
            hourMatch[1]
          ) * 60
        : 0
    ) +
      (
        minuteMatch
          ? Number(
              minuteMatch[1]
            )
          : 0
      )
  );
}

function formatDurationLong(
  minutes: number
) {
  const hours =
    Math.floor(
      minutes / 60
    );

  const remainder =
    minutes % 60;

  return `${hours}h ${String(
    remainder
  ).padStart(
    2,
    "0"
  )}m`;
}

function formatDurationWords(
  minutes: number
) {
  const hours =
    Math.floor(
      minutes / 60
    );

  const remainder =
    minutes % 60;

  if (
    hours &&
    remainder
  ) {
    return `${hours} hour${
      hours === 1
        ? ""
        : "s"
    } ${remainder} minute${
      remainder === 1
        ? ""
        : "s"
    }`;
  }

  if (hours) {
    return `${hours} hour${
      hours === 1
        ? ""
        : "s"
    }`;
  }

  return `${remainder} minute${
    remainder === 1
      ? ""
      : "s"
  }`;
}

function formatDateTime(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "en-GB",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  );
}


function BatchCalendar({
  batch,
  milestones,
}: {
  batch: Batch;
  milestones: Array<{
    label: string;
    date: string;
    day: number;
  }>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const induction = new Date(
    `${batch.induction_date}T00:00:00`
  );

  const currentDay = Math.max(
    0,
    Math.floor(
      (
        today.getTime() -
        induction.getTime()
      ) /
        86400000
    )
  );

  const nextMilestone =
    milestones.find(
      (milestone) =>
        new Date(
          `${milestone.date}T23:59:59`
        ).getTime() >=
        today.getTime()
    ) ?? null;

  return (
    <div className="bm-stack">
      <section className="bm-panel bm-calendar-summary">
        <div>
          <div className="bm-eyebrow">
            PROGRAMME CALENDAR
          </div>

          <h3>
            {batch.name}
          </h3>

          <p>
            All dates are generated automatically from the intake induction date.
            Edit the induction date in Batch Settings and this calendar updates instantly.
          </p>
        </div>

        <div className="bm-calendar-day-card">
          <span>Current programme day</span>
          <strong>Day {currentDay}</strong>
        </div>
      </section>

      {nextMilestone && (
        <section className="bm-panel bm-calendar-next">
          <div className="bm-eyebrow">
            NEXT MILESTONE
          </div>

          <h3>
            {nextMilestone.label}
          </h3>

          <p>
            {formatDate(nextMilestone.date)}
            {" · "}
            {formatMilestoneRemaining(nextMilestone.date)}
          </p>
        </section>
      )}

      <section className="bm-panel">
        <PanelHeading
          eyebrow="OFFICIAL TIMELINE"
          title="Programme milestones"
        />

        <div className="bm-calendar-timeline">
          {milestones.map(
            (milestone, index) => {
              const milestoneDate =
                new Date(
                  `${milestone.date}T23:59:59`
                );

              const complete =
                milestoneDate.getTime() <
                today.getTime();

              const current =
                nextMilestone?.label ===
                milestone.label;

              return (
                <div
                  key={milestone.label}
                  className={`bm-calendar-step ${
                    complete
                      ? "is-complete"
                      : current
                        ? "is-current"
                        : ""
                  }`}
                >
                  <div className="bm-calendar-step-marker">
                    {complete
                      ? "✓"
                      : index + 1}
                  </div>

                  <div className="bm-calendar-step-content">
                    <span>
                      {milestone.label}
                    </span>

                    <strong>
                      {formatDate(
                        milestone.date
                      )}
                    </strong>

                    <small>
                      {milestone.day === 0
                        ? "Programme start"
                        : `Day ${milestone.day}`}
                    </small>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      <section className="bm-panel">
        <PanelHeading
          eyebrow="SINGLE SOURCE OF TRUTH"
          title="How this calendar works"
        />

        <div className="bm-calendar-info-grid">
          <div>
            <strong>Induction</strong>
            <span>
              Stored directly on the batch record.
            </span>
          </div>

          <div>
            <strong>Minimum upgrade</strong>
            <span>
              Calculated at Day {FTP_MILESTONES.minimumUpgrade}.
            </span>
          </div>

          <div>
            <strong>FPP deadline</strong>
            <span>
              Calculated at Day {FTP_MILESTONES.fppDeadline}.
            </span>
          </div>

          <div>
            <strong>Completion</strong>
            <span>
              Calculated at Day {FTP_MILESTONES.completion}.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatMilestoneRemaining(
  value: string
) {
  const target =
    new Date(
      `${value}T23:59:59`
    );

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const days =
    Math.ceil(
      (
        target.getTime() -
        today.getTime()
      ) /
        86400000
    );

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  if (days > 1) {
    return `${days} days remaining`;
  }

  const overdue =
    Math.abs(days);

  return overdue === 1
    ? "1 day overdue"
    : `${overdue} days overdue`;
}

function BatchSettings({
  title,
  form,
  setForm,
  saving,
  canEdit,
  onSubmit,
  onDelete,
}: {
  title: string;
  form: BatchForm;
  setForm: (value: BatchForm) => void;
  saving: boolean;
  canEdit: boolean;
  onSubmit: (event: FormEvent) => void;
  onDelete?: () => void;
}) {
  return (
    <section className="bm-panel bm-settings-panel">
      <PanelHeading eyebrow="INTAKE CONFIGURATION" title={title} />

      <form className="bm-form" onSubmit={onSubmit}>
        <Field label="Batch name">
          <input
            className="bm-input"
            value={form.name}
            disabled={!canEdit || saving}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="e.g. September Intake"
          />
        </Field>

        <div className="bm-form-grid">
          <Field label="Induction date">
            <input
              className="bm-input"
              type="date"
              value={form.inductionDate}
              disabled={!canEdit || saving}
              onChange={(event) => setForm({ ...form, inductionDate: event.target.value })}
            />
          </Field>

          <Field label="Expected intake size">
            <input
              className="bm-input"
              type="number"
              min="1"
              value={form.intakeSize}
              disabled={!canEdit || saving}
              onChange={(event) => setForm({ ...form, intakeSize: event.target.value })}
              placeholder="Optional"
            />
          </Field>

          <Field label="Status">
            <select
              className="bm-select"
              value={form.status}
              disabled={!canEdit || saving}
              onChange={(event) => setForm({ ...form, status: event.target.value as BatchStatus })}
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            className="bm-textarea"
            value={form.notes}
            disabled={!canEdit || saving}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            placeholder="Operational notes for this intake…"
          />
        </Field>

        {form.inductionDate && (
          <div className="bm-date-preview">
            <strong>Calculated programme dates</strong>
            <div>
              <span>Minimum upgrade</span>
              <b>{formatDate(addDays(form.inductionDate, FTP_MILESTONES.minimumUpgrade))}</b>
            </div>
            <div>
              <span>FPP deadline</span>
              <b>{formatDate(addDays(form.inductionDate, FTP_MILESTONES.fppDeadline))}</b>
            </div>
            <div>
              <span>Completion</span>
              <b>{formatDate(addDays(form.inductionDate, FTP_MILESTONES.completion))}</b>
            </div>
          </div>
        )}

        {canEdit && (
          <div className="bm-form-actions">
            {onDelete && (
              <button type="button" className="bm-button bm-button-danger-ghost" disabled={saving} onClick={onDelete}>
                Delete intake
              </button>
            )}
            <button type="submit" className="bm-button bm-button-primary" disabled={saving}>
              {saving ? "Saving…" : "Save intake"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

function Notice({
  tone,
  title,
  children,
  onClose,
}: {
  tone: "error" | "success";
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className={`bm-notice bm-notice-${tone}`}>
      <div>
        <strong>{title}</strong>
        <span>{children}</span>
      </div>
      <button onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  alert = false,
}: {
  label: string;
  value: number;
  hint: string;
  alert?: boolean;
}) {
  return (
    <div className={`bm-stat-card ${alert ? "is-alert" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function MiniStat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className={`bm-mini-stat ${alert ? "is-alert" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={active ? "is-active" : ""} onClick={onClick}>
      {label}
      {typeof count === "number" && <span>{count}</span>}
    </button>
  );
}

function PanelHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="bm-panel-heading">
      <div className="bm-eyebrow">{eyebrow}</div>
      <h3>{title}</h3>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="bm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PersonIdentity({ profile, subline }: { profile: Profile | null; subline?: string }) {
  const initials = getInitials(profile?.name ?? "P1");

  return (
    <div className="bm-person">
      <div className="bm-avatar">{initials}</div>
      <div>
        <strong>{profile?.name ?? "Unnamed probationer"}</strong>
        <span>
          {subline ||
            [
              profile?.badge_number ? `#${profile.badge_number}` : "No badge number",
              profile?.rank || "Rank not set",
            ].join(" · ")}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BatchStatus }) {
  return <span className={`bm-status bm-status-${status.toLowerCase()}`}>{status}</span>;
}

function EmptyState({
  title,
  text,
  compact = false,
}: {
  title: string;
  text: string;
  compact?: boolean;
}) {
  return (
    <div className={`bm-empty ${compact ? "is-compact" : ""}`}>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function rankFtmsForTrainee(
  trainee: Trainee,
  ftms: Profile[],
  trainees: Trainee[],
  availability: AvailabilityWindow[],
  preferences: SupervisionPreference[]
): SuitabilityResult[] {
  const traineeWindows = availability.filter((window) => window.profile_id === trainee.profile_id);

  return ftms
    .map((profile) => {
      const ftmWindows = availability.filter((window) => window.profile_id === profile.id);
      const preference = preferences.find((item) => item.profile_id === profile.id) ?? null;
      const currentLoad = activeLoadFor(profile.id, trainees, trainee.id);
      const capacity = MAX_ACTIVE_P1S_PER_FTM;
      const atCapacity = currentLoad >= capacity;
      const accepting = preference?.available_for_p1s ?? false;
      const overlapMinutes = calculateOverlapMinutes(traineeWindows, ftmWindows);
      const ftmAvailabilityMinutes = calculateWindowCoverage(ftmWindows);

      let score = 0;
      const reasons: string[] = [];
      const warnings: string[] = [];

      if (accepting) {
        score += 25;
        reasons.push("Accepting new P1s");
      } else {
        warnings.push("Not marked as accepting new P1s");
      }

      const remaining = Math.max(capacity - currentLoad, 0);
      if (remaining > 0) {
        score += Math.min(30, remaining * 10);
        reasons.push(`${remaining} supervision slot${remaining === 1 ? "" : "s"} remaining`);
      } else {
        warnings.push(`At capacity with ${currentLoad} active P1s`);
      }

      if (traineeWindows.length && ftmWindows.length) {
        if (overlapMinutes > 0) {
          const overlapScore = Math.min(35, Math.round(overlapMinutes / 60) * 5);
          score += overlapScore;
          reasons.push(`${formatDuration(overlapMinutes)} availability overlap`);
        } else {
          warnings.push("No recorded availability overlap with this P1");
        }
      } else if (ftmWindows.length) {
        score += Math.min(20, Math.round(ftmAvailabilityMinutes / 60) * 2);
        reasons.push(`${formatDuration(ftmAvailabilityMinutes)} weekly availability recorded`);
        warnings.push("P1 has no availability recorded, so direct overlap cannot be measured");
      } else {
        warnings.push("No FTM availability recorded");
      }

      if (profile.role === "Field Training Manager" || profile.role === "FTM") {
        score += 10;
        reasons.push("Dedicated FTM role");
      } else if (profile.role === "Field Training Supervisor" || profile.role === "FTS") {
        score += 7;
        reasons.push("Training supervisor role");
      }

      if (trainee.assigned_ftm === profile.id) {
        score += 5;
        reasons.push("Currently assigned to this P1");
      }

      if (atCapacity) score = Math.min(score, 55);
      if (!accepting) score = Math.min(score, 70);

      score = Math.max(0, Math.min(100, score));

      let band: SuitabilityResult["band"] = "Limited";
      if (score >= 85) band = "Excellent";
      else if (score >= 70) band = "Strong";
      else if (score >= 50) band = "Workable";

      return {
        profile,
        score,
        band,
        reasons,
        warnings,
        currentLoad,
        capacity,
        atCapacity,
        accepting,
        overlapMinutes,
        ftmAvailabilityMinutes,
      };
    })
    .sort((a, b) => {
      if (a.atCapacity !== b.atCapacity) return a.atCapacity ? 1 : -1;
      if (a.accepting !== b.accepting) return a.accepting ? -1 : 1;
      return b.score - a.score || a.currentLoad - b.currentLoad;
    });
}

function activeLoadFor(ftmId: string, trainees: Trainee[], excludeTraineeId?: string) {
  return trainees.filter(
    (trainee) =>
      trainee.id !== excludeTraineeId &&
      trainee.assigned_ftm === ftmId &&
      trainee.batch_id &&
      !["Completed", "P2", "Archived"].includes(trainee.status ?? "")
  ).length;
}

function calculateOverlapMinutes(
  first: AvailabilityWindow[],
  second: AvailabilityWindow[]
) {
  let total = 0;

  for (const a of first) {
    const aStart = toMinutes(a.start_time);
    const aEnd = toMinutes(a.end_time);

    for (const b of second) {
      const bStart = toMinutes(b.start_time);
      const bEnd = toMinutes(b.end_time);
      total += Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
    }
  }

  return total;
}

function calculateWindowCoverage(windows: AvailabilityWindow[]) {
  return windows.reduce((total, window) => {
    return total + Math.max(0, toMinutes(window.end_time) - toMinutes(window.start_time));
  }, 0);
}

function toMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.slice(0, 5).split(":");
  return Number(hours) * 60 + Number(minutes);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  if (!remainder) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function batchAuditSnapshot(batch: Batch) {
  return {
    name: batch.name,
    induction_date: batch.induction_date,
    minimum_upgrade_date: batch.minimum_upgrade_date ?? null,
    fpp_deadline: batch.fpp_deadline ?? null,
    final_completion_deadline:
      batch.final_completion_deadline ?? null,
    intake_size: batch.intake_size,
    status: batch.status,
    notes: batch.notes,
  };
}

function batchToForm(batch: Batch): BatchForm {
  return {
    name: batch.name,
    inductionDate: batch.induction_date,
    intakeSize: batch.intake_size ? String(batch.intake_size) : "",
    status: batch.status,
    notes: batch.notes ?? "",
  };
}

function normaliseRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P1";
}

function Styles() {
  return (
    <style>{`
      :root {
        --bm-bg: #071120;
        --bm-panel: #0d1a2d;
        --bm-panel-2: #101f35;
        --bm-border: #223653;
        --bm-border-strong: #31517c;
        --bm-text: #f7f9fc;
        --bm-muted: #91a8c9;
        --bm-blue: #3184ff;
        --bm-blue-soft: rgba(49,132,255,.14);
        --bm-green: #34d399;
        --bm-amber: #f59e0b;
        --bm-red: #fb7185;
      }

      * { box-sizing: border-box; }
      button, input, select, textarea { font: inherit; }
      button { color: inherit; }

      .bm-page {
        display: grid;
        gap: 16px;
        color: var(--bm-text);
        background: var(--bm-bg);
        min-height: 100%;
      }

      .bm-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        padding: 26px 28px;
        border: 1px solid #2b4b77;
        border-radius: 18px;
        background:
          radial-gradient(circle at 88% 20%, rgba(56,189,248,.15), transparent 22%),
          linear-gradient(135deg, #172e5f 0%, #10284c 55%, #0d2038 100%);
        overflow: hidden;
      }

      .bm-hero h1 { margin: 4px 0 6px; font-size: clamp(27px, 3vw, 38px); }
      .bm-hero p { margin: 0; max-width: 760px; color: #c6d5eb; line-height: 1.55; }
      .bm-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }
      .bm-eyebrow { color: #67b2ff; font-size: 11px; font-weight: 900; letter-spacing: .13em; }

      .bm-stat-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .bm-stat-card {
        min-height: 92px;
        padding: 16px 18px;
        border: 1px solid var(--bm-border);
        border-radius: 14px;
        background: linear-gradient(145deg, var(--bm-panel-2), var(--bm-panel));
        display: grid;
        align-content: center;
        gap: 3px;
      }

      .bm-stat-card.is-alert { border-color: rgba(245,158,11,.5); background: linear-gradient(145deg, rgba(88,55,16,.46), var(--bm-panel)); }
      .bm-stat-card span, .bm-stat-card small { color: var(--bm-muted); }
      .bm-stat-card strong { font-size: 25px; }
      .bm-stat-card small { font-size: 11px; }

      .bm-notice {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        padding: 16px 18px;
        border: 1px solid;
        border-radius: 13px;
      }

      .bm-notice > div { display: grid; gap: 6px; }
      .bm-notice span { line-height: 1.45; }
      .bm-notice button { border: 0; background: transparent; font-size: 21px; cursor: pointer; }
      .bm-notice-error { background: #3b1522; border-color: #82283e; }
      .bm-notice-success { background: #103126; border-color: #1b6a4c; }

      .bm-shell {
        display: grid;
        grid-template-columns: 270px minmax(0, 1fr);
        min-height: 670px;
        border: 1px solid var(--bm-border);
        border-radius: 18px;
        overflow: hidden;
        background: #081426;
      }

      .bm-sidebar {
        padding: 22px 14px;
        border-right: 1px solid var(--bm-border);
        background: #0b1729;
      }

      .bm-sidebar-heading, .bm-panel-title-row, .bm-title-row, .bm-ranking-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .bm-sidebar-heading h2 { margin: 4px 0 0; font-size: 16px; }
      .bm-sidebar-filters { display: grid; grid-template-columns: 1fr 82px; gap: 8px; margin: 15px 0; }
      .bm-batch-list { display: grid; gap: 9px; }

      .bm-batch-item {
        width: 100%;
        padding: 14px;
        text-align: left;
        border: 1px solid var(--bm-border);
        border-radius: 12px;
        background: #0c192d;
        cursor: pointer;
        transition: .18s ease;
      }

      .bm-batch-item:hover { border-color: var(--bm-border-strong); transform: translateY(-1px); }
      .bm-batch-item.is-selected { border-color: #4c9aff; box-shadow: inset 3px 0 0 #4c9aff; background: linear-gradient(135deg, rgba(49,132,255,.18), #0c192d); }
      .bm-batch-item-top { display: flex; justify-content: space-between; gap: 10px; align-items: center; }
      .bm-batch-item > span { display: block; margin: 9px 0; color: var(--bm-muted); font-size: 11px; }
      .bm-batch-meta { display: flex; gap: 12px; color: #7891b5; font-size: 10px; }
      .bm-batch-meta .is-warning { color: #fbbf24; }

      .bm-workspace { min-width: 0; }
      .bm-workspace-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 24px 26px 14px; }
      .bm-workspace-header h2 { margin: 0; font-size: 24px; }
      .bm-workspace-header p { margin: 8px 0 0; color: var(--bm-muted); }

      .bm-tabs { display: flex; gap: 4px; padding: 0 18px; border-bottom: 1px solid var(--bm-border); }
      .bm-tabs button { border: 0; background: transparent; padding: 14px 13px 12px; color: #8ea5c8; font-weight: 800; cursor: pointer; border-bottom: 2px solid transparent; }
      .bm-tabs button.is-active { color: white; border-bottom-color: #59a7ff; }
      .bm-tabs button span { margin-left: 6px; display: inline-grid; place-items: center; min-width: 19px; height: 19px; border-radius: 999px; background: #263a59; font-size: 10px; }

      .bm-workspace-body { padding: 20px; }
      .bm-stack { display: grid; gap: 16px; }
      .bm-panel { padding: 20px; border: 1px solid var(--bm-border); border-radius: 15px; background: linear-gradient(145deg, #101f35, #0b182b); }
      .bm-panel-large { min-height: 245px; }
      .bm-panel-heading h3 { margin: 6px 0 0; font-size: 18px; }
      .bm-overview-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(260px, .7fr); gap: 16px; }

      .bm-health-summary { display: flex; align-items: center; gap: 15px; margin: 18px 0; padding: 16px; border: 1px solid var(--bm-border); border-radius: 13px; background: rgba(3,10,21,.35); }
      .bm-health-summary > div:last-child { display: grid; gap: 4px; }
      .bm-health-summary span { color: var(--bm-muted); }
      .bm-health-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; font-weight: 900; }
      .bm-health-icon.is-good { background: rgba(52,211,153,.15); color: var(--bm-green); }
      .bm-health-icon.is-warning { background: rgba(245,158,11,.15); color: #fbbf24; }

      .bm-mini-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 9px; }
      .bm-mini-stat { display: grid; gap: 5px; padding: 12px; border: 1px solid var(--bm-border); border-radius: 11px; background: #0b1729; }
      .bm-mini-stat span { color: var(--bm-muted); font-size: 11px; }
      .bm-mini-stat strong { font-size: 20px; }
      .bm-mini-stat.is-alert { border-color: rgba(245,158,11,.45); }
      .bm-inline-action { margin-top: 16px; }

      .bm-capacity-number { margin: 20px 0 12px; }
      .bm-capacity-number strong { font-size: 42px; }
      .bm-capacity-number span { color: var(--bm-muted); font-size: 19px; }
      .bm-progress, .bm-load-bar { height: 8px; border-radius: 999px; background: #07111f; overflow: hidden; }
      .bm-progress span, .bm-load-bar span { display: block; height: 100%; background: linear-gradient(90deg, #2f7df0, #4db5ff); border-radius: inherit; }
      .bm-panel p { color: var(--bm-muted); }

      .bm-milestone-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 11px; margin-top: 16px; }
      .bm-milestone-card { display: grid; gap: 6px; padding: 15px; border: 1px solid var(--bm-border); border-radius: 11px; background: #0a1729; }
      .bm-milestone-card span, .bm-milestone-card small { color: var(--bm-muted); }
      .bm-milestone-card small { font-size: 10px; }

      .bm-exception-list { display: grid; gap: 9px; margin-top: 15px; }
      .bm-exception-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 13px; border: 1px solid rgba(245,158,11,.38); border-radius: 12px; background: rgba(85,53,13,.18); }

      .bm-trainee-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin-top: 17px; }
      .bm-trainee-card { display: grid; grid-template-columns: minmax(0,1fr) minmax(190px,.7fr) auto; align-items: center; gap: 15px; padding: 15px; border: 1px solid var(--bm-border); border-radius: 13px; background: #0a1729; }
      .bm-trainee-card-main { display: grid; gap: 10px; }
      .bm-ftm-assignment { display: grid; gap: 3px; padding: 11px; border-left: 2px solid #3b82f6; }
      .bm-ftm-assignment > span, .bm-ftm-assignment small { color: var(--bm-muted); font-size: 10px; }
      .bm-ftm-assignment.is-missing { border-color: var(--bm-amber); background: rgba(245,158,11,.07); border-radius: 8px; }
      .bm-card-actions { display: flex; flex-direction: column; gap: 8px; }

      .bm-search-wrap { display: flex; align-items: center; gap: 8px; margin: 16px 0; padding-left: 12px; border: 1px solid var(--bm-border); border-radius: 10px; background: #091528; color: var(--bm-muted); }
      .bm-search-wrap .bm-input { border: 0; background: transparent; }
      .bm-available-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
      .bm-available-row { display: grid; grid-template-columns: minmax(0,1fr) auto auto; gap: 12px; align-items: center; padding: 13px; border: 1px solid var(--bm-border); border-radius: 12px; background: #0a1729; }

      .bm-person { display: flex; align-items: center; gap: 11px; min-width: 0; }
      .bm-person > div:last-child { display: grid; gap: 4px; min-width: 0; }
      .bm-person strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .bm-person span { color: var(--bm-muted); font-size: 11px; }
      .bm-avatar { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; font-weight: 900; background: linear-gradient(145deg, #2f7df0, #1587b8); border: 1px solid #54a2ff; }
      .bm-chip-row { display: flex; gap: 6px; flex-wrap: wrap; }
      .bm-chip { padding: 4px 7px; border-radius: 999px; background: #182a43; color: #9bb2d2; font-size: 9px; }

      .bm-calendar-summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
      }

      .bm-calendar-summary h3,
      .bm-calendar-next h3 {
        margin: 6px 0 8px;
      }

      .bm-calendar-summary p,
      .bm-calendar-next p {
        margin: 0;
      }

      .bm-calendar-day-card {
        min-width: 180px;
        display: grid;
        gap: 5px;
        padding: 16px;
        text-align: center;
        border: 1px solid #31517c;
        border-radius: 12px;
        background: rgba(49,132,255,.1);
      }

      .bm-calendar-day-card span {
        color: var(--bm-muted);
        font-size: 11px;
      }

      .bm-calendar-day-card strong {
        font-size: 25px;
      }

      .bm-calendar-next {
        border-color: #315f9a;
        background:
          linear-gradient(
            145deg,
            rgba(49,132,255,.16),
            #0b182b
          );
      }

      .bm-calendar-timeline {
        position: relative;
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0,1fr));
        gap: 14px;
        margin-top: 18px;
      }

      .bm-calendar-timeline::before {
        content: "";
        position: absolute;
        top: 22px;
        left: 7%;
        right: 7%;
        height: 2px;
        background: var(--bm-border);
      }

      .bm-calendar-step {
        position: relative;
        display: grid;
        justify-items: center;
        gap: 11px;
        text-align: center;
      }

      .bm-calendar-step-marker {
        position: relative;
        z-index: 1;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border: 2px solid var(--bm-border-strong);
        border-radius: 999px;
        background: #0a1729;
        color: var(--bm-muted);
        font-weight: 900;
      }

      .bm-calendar-step.is-complete
      .bm-calendar-step-marker {
        border-color: #34d399;
        background: rgba(16,185,129,.18);
        color: #8ff0c9;
      }

      .bm-calendar-step.is-current
      .bm-calendar-step-marker {
        border-color: #60a5fa;
        background: rgba(49,132,255,.22);
        color: white;
        box-shadow:
          0 0 0 5px rgba(49,132,255,.1);
      }

      .bm-calendar-step-content {
        display: grid;
        gap: 5px;
      }

      .bm-calendar-step-content span,
      .bm-calendar-step-content small {
        color: var(--bm-muted);
      }

      .bm-calendar-step-content span {
        font-size: 11px;
        font-weight: 800;
      }

      .bm-calendar-step-content small {
        font-size: 10px;
      }

      .bm-calendar-info-grid {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0,1fr));
        gap: 10px;
        margin-top: 16px;
      }

      .bm-calendar-info-grid > div {
        display: grid;
        gap: 6px;
        padding: 14px;
        border: 1px solid var(--bm-border);
        border-radius: 11px;
        background: #0a1729;
      }

      .bm-calendar-info-grid span {
        color: var(--bm-muted);
        font-size: 11px;
        line-height: 1.45;
      }


      .bm-summary-hero {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        padding: 22px;
        border: 1px solid #31517c;
        border-radius: 15px;
        background:
          radial-gradient(circle at 88% 20%, rgba(56,189,248,.13), transparent 24%),
          linear-gradient(145deg, #142a4d, #0b182b);
      }

      .bm-summary-hero h3 {
        margin: 6px 0 8px;
        font-size: 24px;
      }

      .bm-summary-hero p {
        max-width: 780px;
        margin: 0;
        color: var(--bm-muted);
        line-height: 1.5;
      }

      .bm-summary-status {
        min-width: 180px;
        display: grid;
        gap: 5px;
        padding: 14px;
        border: 1px solid var(--bm-border);
        border-radius: 11px;
        background: #081426;
      }

      .bm-summary-status span,
      .bm-summary-status small {
        color: var(--bm-muted);
        font-size: 10px;
      }

      .bm-summary-stat-grid {
        display: grid;
        grid-template-columns:
          repeat(5, minmax(0,1fr));
        gap: 10px;
      }

      .bm-summary-metric {
        display: grid;
        gap: 6px;
        padding: 15px;
        border: 1px solid var(--bm-border);
        border-radius: 12px;
        background: #0a1729;
      }

      .bm-summary-metric span {
        color: var(--bm-muted);
        font-size: 10px;
      }

      .bm-summary-metric strong {
        font-size: 22px;
      }

      .bm-summary-metric.is-alert {
        border-color: rgba(245,158,11,.5);
        background: rgba(85,53,13,.18);
      }

      .bm-summary-actions,
      .bm-summary-publish-row {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
      }

      .bm-summary-form-grid {
        display: grid;
        grid-template-columns:
          minmax(0,2fr) minmax(180px,.6fr);
        gap: 12px;
        margin: 16px 0;
      }

      .bm-summary-commentary {
        min-height: 220px;
      }

      .bm-summary-count-grid {
        display: grid;
        grid-template-columns:
          repeat(4, minmax(0,1fr));
        gap: 10px;
        margin: 16px 0;
      }

      .bm-summary-publish-row {
        justify-content: flex-end;
        margin-top: 17px;
      }

      .bm-bbcode-preview {
        max-height: 430px;
        overflow: auto;
        padding: 16px;
        margin: 17px 0 0;
        color: #dbeafe;
        white-space: pre-wrap;
        background: #050d19;
        border: 1px solid #31517c;
        border-radius: 11px;
        font: 12px/1.55 Consolas, monospace;
      }

      .bm-contribution-table {
        overflow: hidden;
        margin-top: 15px;
        border: 1px solid var(--bm-border);
        border-radius: 12px;
      }

      .bm-contribution-header,
      .bm-contribution-row {
        display: grid;
        grid-template-columns:
          50px minmax(200px,1fr) 80px 130px 130px;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
      }

      .bm-contribution-header {
        color: var(--bm-muted);
        background: #081426;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .08em;
      }

      .bm-contribution-row {
        border-top: 1px solid var(--bm-border);
        background: #0a1729;
      }

      .bm-contribution-row.is-below {
        background: rgba(85,53,13,.18);
      }

      .bm-contribution-row > div {
        display: grid;
        gap: 4px;
      }

      .bm-contribution-row small {
        color: var(--bm-muted);
      }

      .bm-summary-archive {
        display: grid;
        gap: 9px;
        margin-top: 15px;
      }

      .bm-summary-archive-row {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        padding: 14px;
        text-align: left;
        border: 1px solid var(--bm-border);
        border-radius: 11px;
        background: #0a1729;
        cursor: pointer;
      }

      .bm-summary-archive-row > div {
        display: grid;
        gap: 5px;
      }

      .bm-summary-archive-row > div:last-child {
        justify-items: end;
      }

      .bm-summary-archive-row span {
        color: var(--bm-muted);
        font-size: 10px;
      }

      .bm-settings-panel { max-width: 880px; }
      .bm-form { display: grid; gap: 16px; margin-top: 18px; }
      .bm-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
      .bm-field { display: grid; gap: 7px; }
      .bm-field > span { color: #aabbd3; font-size: 12px; font-weight: 700; }
      .bm-input, .bm-select, .bm-textarea { width: 100%; padding: 11px 12px; color: white; border: 1px solid var(--bm-border); border-radius: 9px; background: #081426; outline: none; }
      .bm-input:focus, .bm-select:focus, .bm-textarea:focus { border-color: #4c9aff; box-shadow: 0 0 0 3px rgba(76,154,255,.12); }
      .bm-textarea { min-height: 120px; resize: vertical; }
      .bm-date-preview { display: grid; grid-template-columns: 1.2fr repeat(3,1fr); gap: 10px; align-items: center; padding: 13px; border: 1px solid var(--bm-border); border-radius: 11px; background: #0a1729; }
      .bm-date-preview > div { display: grid; gap: 4px; }
      .bm-date-preview span { color: var(--bm-muted); font-size: 10px; }
      .bm-form-actions { display: flex; justify-content: space-between; gap: 12px; }

      .bm-button { border: 1px solid transparent; border-radius: 9px; padding: 10px 13px; font-weight: 800; cursor: pointer; transition: .15s ease; white-space: nowrap; }
      .bm-button:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
      .bm-button:disabled { opacity: .45; cursor: not-allowed; }
      .bm-button-primary { background: linear-gradient(145deg, #3388ff, #2465cc); border-color: #4b96ff; }
      .bm-button-secondary { background: #152944; border-color: #2d486c; }
      .bm-button-ghost { background: transparent; border-color: var(--bm-border); color: #b7c7dc; }
      .bm-button-danger-ghost { background: rgba(127,29,29,.24); border-color: rgba(251,113,133,.35); color: #fecdd3; }

      .bm-status, .bm-count-pill, .bm-band { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; white-space: nowrap; font-weight: 800; }
      .bm-status { padding: 4px 8px; font-size: 9px; }
      .bm-status-active { color: #8ff0c9; background: rgba(16,185,129,.14); border: 1px solid rgba(52,211,153,.25); }
      .bm-status-upcoming { color: #93c5fd; background: rgba(59,130,246,.14); border: 1px solid rgba(96,165,250,.25); }
      .bm-status-completed { color: #c4b5fd; background: rgba(139,92,246,.14); border: 1px solid rgba(167,139,250,.25); }
      .bm-status-archived { color: #cbd5e1; background: rgba(100,116,139,.16); border: 1px solid rgba(148,163,184,.25); }
      .bm-count-pill { min-width: 26px; min-height: 26px; padding: 4px 9px; font-size: 10px; border: 1px solid var(--bm-border); background: #0a1729; color: #c4d2e5; }

      .bm-empty { display: grid; place-items: center; gap: 8px; min-height: 180px; text-align: center; color: var(--bm-muted); }
      .bm-empty strong { color: #d8e2ef; }
      .bm-empty.is-compact { min-height: 90px; }

      .bm-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 22px; background: rgba(2,8,18,.82); backdrop-filter: blur(5px); }
      .bm-modal { width: min(980px, 100%); max-height: calc(100vh - 44px); display: grid; grid-template-rows: auto minmax(0,1fr) auto; border: 1px solid #31517c; border-radius: 18px; background: #091526; box-shadow: 0 28px 80px rgba(0,0,0,.45); overflow: hidden; }
      .bm-modal-header, .bm-modal-footer { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 20px 22px; border-color: var(--bm-border); }
      .bm-modal-header { border-bottom: 1px solid var(--bm-border); }
      .bm-modal-header h2 { margin: 5px 0 7px; }
      .bm-modal-header p { margin: 0; max-width: 760px; color: var(--bm-muted); line-height: 1.5; }
      .bm-close-button { border: 0; background: transparent; font-size: 26px; cursor: pointer; }
      .bm-modal-body { overflow-y: auto; padding: 20px 22px; }
      .bm-modal-person { display: flex; justify-content: space-between; gap: 15px; align-items: center; padding: 13px; margin-bottom: 20px; border: 1px solid var(--bm-border); border-radius: 12px; background: #0d1b30; }
      .bm-ranking-heading h3 { margin: 5px 0 0; }
      .bm-ranking-list { display: grid; gap: 10px; margin-top: 13px; }
      .bm-ranking-card { width: 100%; display: grid; grid-template-columns: 36px minmax(0,1fr); gap: 12px; padding: 14px; text-align: left; border: 1px solid var(--bm-border); border-radius: 13px; background: #0b192c; cursor: pointer; }
      .bm-ranking-card:hover { border-color: #3f6596; }
      .bm-ranking-card.is-selected { border-color: #4c9aff; box-shadow: 0 0 0 2px rgba(76,154,255,.12); background: linear-gradient(145deg, rgba(49,132,255,.13), #0b192c); }
      .bm-ranking-card.is-disabled { opacity: .46; filter: grayscale(.55); cursor: not-allowed; }
      .bm-ranking-position { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: #172b47; color: #8fc4ff; font-weight: 900; }
      .bm-ranking-content { display: grid; gap: 11px; }
      .bm-ranking-topline { display: flex; justify-content: space-between; gap: 16px; }
      .bm-ranking-topline > div:first-child { display: grid; gap: 4px; }
      .bm-ranking-topline span { color: var(--bm-muted); font-size: 11px; }
      .bm-score-block { display: flex; align-items: center; gap: 8px; }
      .bm-score-block > strong { font-size: 21px; }
      .bm-band { padding: 4px 7px; font-size: 9px; }
      .bm-band-excellent { background: rgba(52,211,153,.14); color: #8ff0c9; }
      .bm-band-strong { background: rgba(59,130,246,.16); color: #9bc7ff; }
      .bm-band-workable { background: rgba(245,158,11,.14); color: #fbc96a; }
      .bm-band-limited { background: rgba(251,113,133,.14); color: #fda4af; }
      .bm-reason-grid { display: flex; flex-wrap: wrap; gap: 7px; }
      .bm-reason { padding: 5px 7px; border-radius: 7px; font-size: 10px; }
      .bm-reason.is-positive { color: #9fe7cc; background: rgba(16,185,129,.09); }
      .bm-reason.is-warning { color: #f7c96d; background: rgba(245,158,11,.09); }
      .bm-load-row { display: grid; grid-template-columns: auto auto minmax(90px,1fr); gap: 10px; align-items: center; color: var(--bm-muted); font-size: 10px; }
      .bm-load-row strong { color: #dce6f3; }
      .bm-override-box { display: flex; align-items: flex-start; gap: 10px; margin-top: 15px; padding: 13px; border: 1px solid rgba(245,158,11,.4); border-radius: 11px; background: rgba(82,49,7,.17); }
      .bm-override-box > span { display: grid; gap: 4px; }
      .bm-override-box small { color: var(--bm-muted); }
      .bm-modal-footer { align-items: center; border-top: 1px solid var(--bm-border); }
      .bm-modal-footer-actions { display: flex; gap: 9px; }

      .bm-loading { min-height: 320px; display: flex; align-items: center; justify-content: center; gap: 14px; color: white; background: #081426; }
      .bm-loading > div:last-of-type { display: grid; gap: 5px; }
      .bm-loading span { color: var(--bm-muted); }
      .bm-spinner { width: 28px; height: 28px; border: 3px solid #28415f; border-top-color: #4c9aff; border-radius: 50%; animation: bm-spin .7s linear infinite; }
      @keyframes bm-spin { to { transform: rotate(360deg); } }

      @media (max-width: 1180px) {
        .bm-stat-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .bm-shell { grid-template-columns: 235px minmax(0,1fr); }
        .bm-trainee-grid, .bm-available-grid { grid-template-columns: 1fr; }
        .bm-trainee-card { grid-template-columns: minmax(0,1fr) minmax(170px,.7fr); }
        .bm-card-actions { grid-column: 1 / -1; flex-direction: row; }
      }

      @media (max-width: 850px) {
        .bm-hero, .bm-workspace-header { flex-direction: column; align-items: stretch; }
        .bm-shell { grid-template-columns: 1fr; }
        .bm-sidebar { border-right: 0; border-bottom: 1px solid var(--bm-border); }
        .bm-batch-list { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .bm-overview-grid { grid-template-columns: 1fr; }
        .bm-mini-stat-grid,
        .bm-milestone-grid,
        .bm-calendar-info-grid,
        .bm-calendar-timeline {
          grid-template-columns: repeat(2, minmax(0,1fr));
        }
        .bm-form-grid,
        .bm-summary-form-grid {
          grid-template-columns: 1fr;
        }
        .bm-summary-stat-grid {
          grid-template-columns:
            repeat(2, minmax(0,1fr));
        }
        .bm-summary-count-grid {
          grid-template-columns:
            repeat(2, minmax(0,1fr));
        }
        .bm-date-preview { grid-template-columns: 1fr; }
      }

      @media (max-width: 620px) {
        .bm-page { gap: 10px; }
        .bm-hero { padding: 20px; border-radius: 13px; }
        .bm-stat-grid { grid-template-columns: 1fr 1fr; }
        .bm-batch-list { grid-template-columns: 1fr; }
        .bm-workspace-body { padding: 12px; }
        .bm-tabs { overflow-x: auto; }
        .bm-trainee-card, .bm-available-row { grid-template-columns: 1fr; }
        .bm-card-actions { flex-direction: column; }
        .bm-mini-stat-grid,
        .bm-milestone-grid,
        .bm-calendar-info-grid,
        .bm-calendar-timeline {
          grid-template-columns: 1fr;
        }

        .bm-calendar-summary {
          flex-direction: column;
          align-items: stretch;
        }

        .bm-calendar-timeline::before {
          display: none;
        }
        .bm-summary-hero,
        .bm-summary-archive-row,
        .bm-exception-row,
        .bm-modal-person,
        .bm-ranking-topline,
        .bm-modal-footer {
          flex-direction: column;
          align-items: stretch;
        }
        .bm-summary-stat-grid,
        .bm-summary-count-grid {
          grid-template-columns: 1fr;
        }
        .bm-contribution-header {
          display: none;
        }
        .bm-contribution-row {
          grid-template-columns:
            34px minmax(0,1fr);
        }
        .bm-contribution-row > *:nth-child(n+3) {
          grid-column: 2;
        }
        .bm-load-row { grid-template-columns: 1fr; }
        .bm-modal-backdrop { padding: 0; }
        .bm-modal { max-height: 100vh; height: 100vh; border-radius: 0; }
        .bm-modal-footer-actions { display: grid; }
      }
    `}</style>
  );
}