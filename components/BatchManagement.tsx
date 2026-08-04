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
type WorkspaceTab = "overview" | "probationers" | "settings";

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

const MANAGEMENT_ROLES = new Set([
  "Field Training Manager",
  "Field Training Supervisor",
  "FTM",
  "FTS",
  "STAFF",
  "FTP Staff",
  "LSPD STAFF",
]);

const FTM_ROLES = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTM",
  "FTS",
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
      const [batchResult, traineeResult, ftmResult, availabilityResult, preferenceResult] =
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
        ]);

      const firstError = [
        batchResult.error,
        traineeResult.error,
        ftmResult.error,
        availabilityResult.error,
        preferenceResult.error,
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
                <TabButton label="Batch settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
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
        .bm-mini-stat-grid, .bm-milestone-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        .bm-form-grid { grid-template-columns: 1fr; }
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
        .bm-mini-stat-grid, .bm-milestone-grid { grid-template-columns: 1fr; }
        .bm-exception-row, .bm-modal-person, .bm-ranking-topline, .bm-modal-footer { flex-direction: column; align-items: stretch; }
        .bm-load-row { grid-template-columns: 1fr; }
        .bm-modal-backdrop { padding: 0; }
        .bm-modal { max-height: 100vh; height: 100vh; border-radius: 0; }
        .bm-modal-footer-actions { display: grid; }
      }
    `}</style>
  );
}