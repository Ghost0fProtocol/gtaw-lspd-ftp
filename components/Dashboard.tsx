"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import DORDraftAlerts from "./dashboard/DORDraftAlerts";

import {
  canCompletePPOWER,
  canConductFinalEvaluation,
  canEditCalendar,
  canManagePersonnel,
  canManageProgression,
  canManageRoleRequests,
  canPromoteToP2,
  canViewOwnNotebook,
  canWriteDORs,
  getRoleContextLabel,
  getRoleDisplayName,
  normaliseRole,
} from "../lib/permissions";

type DashboardProps = {
  user: any;
  trainees: any[];
  openDOR: (
    traineeId: string
  ) => void;
  onNavigate: (
    page: string
  ) => void;
};

type DORDraftAlert = {
  id: string;
  traineeId: string;
  traineeName: string;
  patrolNumber: number | null;
  startedById: string | null;
  startedByName: string;
  lastSavedAt: string | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  batch_name: string | null;
};

type DashboardBatch = {
  id: string;
  name: string;
  induction_date: string;
  minimum_upgrade_date: string | null;
  fpp_deadline: string | null;
  final_completion_deadline: string | null;
  status: string | null;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  date: string | null;
  tone:
    | "blue"
    | "green"
    | "amber"
    | "red"
    | "slate";
};

type WeeklyTrendPoint = {
  label: string;
  count: number;
};


type DashboardStats = {
  notebookProgress: number;
  completedNotebookItems: number;
  totalNotebookItems: number;
  dorCount: number;
  ppowerCount: number;
  instructionMinutes: number;
  trainingEntries: number;
  evaluationEntries: number;
  meetingEntries: number;
  pendingRoleRequests: number;
  activeTrainees: number;
  week1Trainees: number;
  week2Trainees: number;
  fppTrainees: number;
  finalEvaluationTrainees: number;
  completedTrainees: number;
  p2Trainees: number;
  readyForFPP: number;
  readyForFinalEvaluation: number;
  readyForPromotion: number;
  unassignedTrainees: number;
  reviewTrainees: number;
  submittedDORsThisWeek: number;
  mySubmittedDORsThisWeek: number;
};

const initialStats: DashboardStats = {
  notebookProgress: 0,
  completedNotebookItems: 0,
  totalNotebookItems: 0,
  dorCount: 0,
  ppowerCount: 0,
  instructionMinutes: 0,
  trainingEntries: 0,
  evaluationEntries: 0,
  meetingEntries: 0,
  pendingRoleRequests: 0,
  activeTrainees: 0,
  week1Trainees: 0,
  week2Trainees: 0,
  fppTrainees: 0,
  finalEvaluationTrainees: 0,
  completedTrainees: 0,
  p2Trainees: 0,
  readyForFPP: 0,
  readyForFinalEvaluation: 0,
  readyForPromotion: 0,
  unassignedTrainees: 0,
  reviewTrainees: 0,
  submittedDORsThisWeek: 0,
  mySubmittedDORsThisWeek: 0,
};

export default function Dashboard({
  user,
  trainees,
  openDOR,
  onNavigate,
}: DashboardProps) {
  const [
    stats,
    setStats,
  ] = useState<DashboardStats>(
    initialStats
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    draftAlerts,
    setDraftAlerts,
  ] = useState<
    DORDraftAlert[]
  >([]);

  const [
    calendarEvents,
    setCalendarEvents,
  ] = useState<
    CalendarEvent[]
  >([]);

  const [
    activity,
    setActivity,
  ] = useState<
    ActivityItem[]
  >([]);

  const [
    weeklyDorTrend,
    setWeeklyDorTrend,
  ] = useState<
    WeeklyTrendPoint[]
  >([]);

  const [
    currentTrainee,
    setCurrentTrainee,
  ] = useState<any | null>(
    null
  );

  const role =
    normaliseRole(
      user?.role
    );

  useEffect(() => {
    void loadDashboard();
  }, [
    user?.id,
    user?.role,
    trainees,
  ]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const nextStats = {
        ...initialStats,
      };

      calculateProgrammeStats(
        trainees,
        nextStats
      );

      await Promise.all([
        loadCalendarEvents(),
        loadDraftAlerts(),
        loadRecentActivity(),
        loadWeeklyDORTrend(),
        loadRoleSpecificStats(
          nextStats
        ),
      ]);

      setStats(
        nextStats
      );
    } catch (loadError) {
      console.error(
        "DASHBOARD LOAD ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Dashboard data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadRoleSpecificStats(
    nextStats: DashboardStats
  ) {
    if (
      role ===
      "Probationary Officer"
    ) {
      await loadP1Stats(
        user.id,
        nextStats
      );
    }

    if (
      canWriteDORs(role)
    ) {
      await loadFTOStats(
        user.id,
        nextStats
      );
    }

    if (
      canManageRoleRequests(role)
    ) {
      const {
        count,
        error:
          requestError,
      } = await supabase
        .from(
          "fto_import_requests"
        )
        .select(
          "id",
          {
            count:
              "exact",
            head: true,
          }
        )
        .eq(
          "status",
          "pending"
        );

      if (requestError) {
        throw requestError;
      }

      nextStats.pendingRoleRequests =
        count ?? 0;
    }

    if (
      canManageProgression(role)
    ) {
      await loadProgressionStats(
        nextStats
      );
    }
  }

  async function loadP1Stats(
    profileId: string,
    nextStats: DashboardStats
  ) {
    const {
      data: trainee,
      error: traineeError,
    } = await supabase
      .from("trainees")
      .select(`
        id,
        status,
        training_stage,
        notebook,
        assigned_ftm,
        profile_id
      `)
      .eq(
        "profile_id",
        profileId
      )
      .maybeSingle();

    if (traineeError) {
      throw traineeError;
    }

    setCurrentTrainee(
      trainee ?? null
    );

    if (!trainee) {
      return;
    }

    const {
      data: notebookItems,
      error: notebookError,
    } = await supabase
      .from("notebook_items")
      .select(
        "id, completed"
      )
      .eq(
        "trainee_id",
        trainee.id
      );

    if (notebookError) {
      throw notebookError;
    }

    const items =
      notebookItems ?? [];

    const completed =
      items.filter(
        (item) =>
          item.completed
      ).length;

    nextStats.completedNotebookItems =
      completed;

    nextStats.totalNotebookItems =
      items.length;

    nextStats.notebookProgress =
      items.length > 0
        ? Math.round(
            (
              completed /
              items.length
            ) * 100
          )
        : 0;

    const [
      dorResult,
      ppowerResult,
    ] = await Promise.all([
      supabase
        .from("dors")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "trainee_id",
          trainee.id
        )
        .eq(
          "status",
          "submitted"
        ),

      supabase
        .from("ppowers")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "trainee_id",
          trainee.id
        ),
    ]);

    if (dorResult.error) {
      throw dorResult.error;
    }

    if (ppowerResult.error) {
      throw ppowerResult.error;
    }

    nextStats.dorCount =
      dorResult.count ?? 0;

    nextStats.ppowerCount =
      ppowerResult.count ?? 0;
  }

  async function loadFTOStats(
    profileId: string,
    nextStats: DashboardStats
  ) {
    const {
      data: ftoFile,
      error: fileError,
    } = await supabase
      .from("fto_files")
      .select(`
        id,
        total_instruction_minutes
      `)
      .eq(
        "profile_id",
        profileId
      )
      .maybeSingle();

    if (fileError) {
      throw fileError;
    }

    if (ftoFile) {
      nextStats.instructionMinutes =
        ftoFile.total_instruction_minutes ??
        0;

      const {
        data: entries,
        error: entryError,
      } = await supabase
        .from(
          "fto_log_entries"
        )
        .select(
          "entry_type"
        )
        .eq(
          "fto_file_id",
          ftoFile.id
        );

      if (entryError) {
        throw entryError;
      }

      const fileEntries =
        entries ?? [];

      nextStats.trainingEntries =
        fileEntries.filter(
          (entry) =>
            entry.entry_type ===
            "training"
        ).length;

      nextStats.evaluationEntries =
        fileEntries.filter(
          (entry) =>
            entry.entry_type ===
            "probationary_fto_evaluation"
        ).length;

      nextStats.meetingEntries =
        fileEntries.filter(
          (entry) =>
            entry.entry_type ===
            "weekly_ftm_meeting"
        ).length;
    }

    const weekStart =
      getStartOfCurrentWeek();

    const {
      count,
      error: dorError,
    } = await supabase
      .from("dors")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "status",
        "submitted"
      )
      .eq(
        "fto_id",
        profileId
      )
      .gte(
        "submitted_at",
        weekStart
      );

    if (dorError) {
      throw dorError;
    }

    nextStats.mySubmittedDORsThisWeek =
      count ?? 0;
  }

  async function loadProgressionStats(
    nextStats: DashboardStats
  ) {
    const {
      data: dorRows,
      error: dorError,
    } = await supabase
      .from("dors")
      .select(`
        id,
        trainee_id,
        status,
        patrol_type,
        ratings,
        patrol_number,
        submitted_at
      `)
      .eq(
        "status",
        "submitted"
      );

    if (dorError) {
      throw dorError;
    }

    const rows =
      dorRows ?? [];

    nextStats.submittedDORsThisWeek =
      rows.filter(
        (dor) =>
          dor.submitted_at &&
          dor.submitted_at >=
            getStartOfCurrentWeek()
      ).length;

    for (
      const trainee of trainees
    ) {
      const stage =
        getTraineeStage(
          trainee
        );

      const traineeDORs =
        rows
          .filter(
            (dor) =>
              dor.trainee_id ===
              trainee.id
          )
          .sort(
            (first, second) =>
              Number(
                second.patrol_number ??
                  0
              ) -
              Number(
                first.patrol_number ??
                  0
              )
          );

      if (
        stage === "Week 2"
      ) {
        const latestTwo =
          traineeDORs.slice(
            0,
            2
          );

        const latestTwoClean =
          latestTwo.length ===
            2 &&
          latestTwo.every(
            (dor) =>
              isCleanRatings(
                dor.ratings
              )
          );

        const notebookComplete =
          calculateNotebookProgress(
            trainee.notebook
          ) === 100;

        const week2Satisfactory =
          trainee.week_2_ppower_outcome ===
            "Satisfactory" ||
          trainee.week2PPOWEROutcome ===
            "Satisfactory";

        if (
          latestTwoClean &&
          notebookComplete &&
          week2Satisfactory
        ) {
          nextStats.readyForFPP +=
            1;
        }
      }

      if (
        stage === "FPP"
      ) {
        const latestFPP =
          traineeDORs
            .filter(
              (dor) =>
                dor.patrol_type ===
                "FPP"
            )
            .slice(
              0,
              2
            );

        if (
          latestFPP.length ===
            2 &&
          latestFPP.every(
            (dor) =>
              isCleanRatings(
                dor.ratings
              )
          )
        ) {
          nextStats.readyForFinalEvaluation +=
            1;
        }
      }
    }
  }

  async function loadDraftAlerts() {
    const canSeeAllDrafts =
      canManageProgression(
        role
      );

    const isFTO =
      role ===
      "Field Training Officer";

    if (
      !canSeeAllDrafts &&
      !isFTO
    ) {
      setDraftAlerts([]);
      return;
    }

    let query =
      supabase
        .from("dors")
        .select(`
          id,
          trainee_id,
          patrol_number,
          started_by,
          last_saved_at,
          created_at,
          status
        `)
        .eq(
          "status",
          "draft"
        )
        .order(
          "last_saved_at",
          {
            ascending: true,
          }
        );

    if (isFTO) {
      query =
        query.eq(
          "started_by",
          user.id
        );
    }

    const {
      data: draftRows,
      error: draftError,
    } = await query;

    if (draftError) {
      throw draftError;
    }

    const rows =
      draftRows ?? [];

    if (
      rows.length === 0
    ) {
      setDraftAlerts([]);
      return;
    }

    const traineeIds = [
      ...new Set(
        rows.map(
          (draft) =>
            draft.trainee_id
        )
      ),
    ];

    const starterIds = [
      ...new Set(
        rows
          .map(
            (draft) =>
              draft.started_by
          )
          .filter(Boolean)
      ),
    ] as string[];

    const {
      data: traineeRows,
      error: traineeError,
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

    if (traineeError) {
      throw traineeError;
    }

    const traineeProfileIds =
      (
        traineeRows ??
        []
      ).map(
        (trainee) =>
          trainee.profile_id
      );

    const allProfileIds = [
      ...new Set([
        ...traineeProfileIds,
        ...starterIds,
      ]),
    ];

    let profileRows: {
      id: string;
      name: string | null;
    }[] = [];

    if (
      allProfileIds.length > 0
    ) {
      const {
        data,
        error:
          profileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, name"
        )
        .in(
          "id",
          allProfileIds
        );

      if (profileError) {
        throw profileError;
      }

      profileRows =
        data ?? [];
    }

    setDraftAlerts(
      rows.map(
        (draft) => {
          const trainee =
            (
              traineeRows ??
              []
            ).find(
              (item) =>
                item.id ===
                draft.trainee_id
            );

          const traineeProfile =
            profileRows.find(
              (profile) =>
                profile.id ===
                trainee?.profile_id
            );

          const starterProfile =
            profileRows.find(
              (profile) =>
                profile.id ===
                draft.started_by
            );

          return {
            id:
              draft.id,
            traineeId:
              draft.trainee_id,
            traineeName:
              traineeProfile?.name ??
              "Unknown Officer",
            patrolNumber:
              draft.patrol_number ??
              null,
            startedById:
              draft.started_by ??
              null,
            startedByName:
              starterProfile?.name ??
              "Unknown FTO",
            lastSavedAt:
              draft.last_saved_at ??
              draft.created_at ??
              null,
          };
        }
      )
    );
  }

  async function loadCalendarEvents() {
    try {
      const {
        data,
        error:
          batchError,
      } = await supabase
        .from(
          "ftp_batches"
        )
        .select(`
          id,
          name,
          induction_date,
          minimum_upgrade_date,
          fpp_deadline,
          final_completion_deadline,
          status
        `)
        .in(
          "status",
          [
            "Active",
            "Upcoming",
          ]
        )
        .order(
          "induction_date",
          {
            ascending: true,
          }
        );

      if (batchError) {
        throw batchError;
      }

      const batches =
        (
          data ??
          []
        ) as DashboardBatch[];

      const activeBatch =
        batches.find(
          (batch) =>
            batch.status ===
            "Active"
        );

      const selectedBatch =
        activeBatch ??
        batches[0] ??
        null;

      if (!selectedBatch) {
        setCalendarEvents([]);
        return;
      }

      const inductionDate =
        selectedBatch.induction_date;

      const minimumUpgradeDate =
        selectedBatch.minimum_upgrade_date ??
        addDaysUTC(
          inductionDate,
          21
        );

      const fppDeadline =
        selectedBatch.fpp_deadline ??
        addDaysUTC(
          inductionDate,
          43
        );

      const completionDate =
        selectedBatch.final_completion_deadline ??
        addDaysUTC(
          inductionDate,
          50
        );

      setCalendarEvents([
        {
          id:
            `${selectedBatch.id}-induction`,

          title:
            "Induction",

          description:
            "The official start of the FTP intake.",

          event_date:
            inductionDate,

          event_type:
            "Induction",

          batch_name:
            selectedBatch.name,
        },
        {
          id:
            `${selectedBatch.id}-minimum-upgrade`,

          title:
            "Minimum Upgrade Date",

          description:
            "The earliest scheduled point for progression beyond the initial training period.",

          event_date:
            minimumUpgradeDate,

          event_type:
            "Minimum Upgrade Date",

          batch_name:
            selectedBatch.name,
        },
        {
          id:
            `${selectedBatch.id}-fpp-deadline`,

          title:
            "FPP Deadline",

          description:
            "The target deadline for completing the Week 2 requirements and entering FPP.",

          event_date:
            fppDeadline,

          event_type:
            "FPP Deadline",

          batch_name:
            selectedBatch.name,
        },
        {
          id:
            `${selectedBatch.id}-completion`,

          title:
            "Programme Completion",

          description:
            "The target date for completing the full Field Training Programme.",

          event_date:
            completionDate,

          event_type:
            "Programme Completion",

          batch_name:
            selectedBatch.name,
        },
      ]);
    } catch (calendarError) {
      console.warn(
        "BATCH CALENDAR LOAD ERROR",
        calendarError
      );

      setCalendarEvents([]);
    }
  }

  async function loadWeeklyDORTrend() {
    const start =
      new Date();

    start.setUTCDate(
      start.getUTCDate() -
        41
    );

    start.setUTCHours(
      0,
      0,
      0,
      0
    );

    const {
      data,
      error:
        trendError,
    } = await supabase
      .from("dors")
      .select(`
        id,
        submitted_at,
        created_at,
        status
      `)
      .eq(
        "status",
        "submitted"
      )
      .gte(
        "created_at",
        start.toISOString()
      );

    if (trendError) {
      console.warn(
        "DOR TREND LOAD ERROR",
        trendError
      );

      setWeeklyDorTrend([]);
      return;
    }

    const weeks =
      Array.from(
        {
          length: 6,
        },
        (
          _,
          index
        ) => {
          const weekStart =
            getWeekStartOffset(
              index - 5
            );

          const weekEnd =
            new Date(
              weekStart
            );

          weekEnd.setUTCDate(
            weekEnd.getUTCDate() +
              7
          );

          const count =
            (
              data ?? []
            ).filter(
              (dor) => {
                const value =
                  dor.submitted_at ??
                  dor.created_at;

                if (!value) {
                  return false;
                }

                const date =
                  new Date(
                    value
                  );

                return (
                  date >=
                    weekStart &&
                  date <
                    weekEnd
                );
              }
            ).length;

          return {
            label:
              weekStart.toLocaleDateString(
                "en-GB",
                {
                  day: "2-digit",
                  month: "short",
                  timeZone:
                    "UTC",
                }
              ),
            count,
          };
        }
      );

    setWeeklyDorTrend(
      weeks
    );
  }

  async function loadRecentActivity() {
    const {
      data: dorRows,
      error: dorError,
    } = await supabase
      .from("dors")
      .select(`
        id,
        trainee_id,
        fto_id,
        patrol_number,
        patrol_type,
        status,
        submitted_at,
        created_at
      `)
      .eq(
        "status",
        "submitted"
      )
      .order(
        "submitted_at",
        {
          ascending: false,
        }
      )
      .limit(8);

    if (dorError) {
      throw dorError;
    }

    const rows =
      dorRows ?? [];

    const traineeMap =
      new Map(
        trainees.map(
          (trainee) => [
            trainee.id,
            trainee.profile?.name ??
              trainee.name ??
              "Unknown Officer",
          ]
        )
      );

    setActivity(
      rows.map(
        (dor) => ({
          id: dor.id,
          title:
            `${traineeMap.get(
              dor.trainee_id
            ) ?? "Unknown Officer"} — Patrol ${dor.patrol_number ?? "N/A"}`,
          detail:
            dor.patrol_type ===
            "Final Evaluation"
              ? "Final Evaluation DOR submitted"
              : dor.patrol_type ===
                  "FPP"
                ? "FPP DOR submitted"
                : "Daily Observation Report submitted",
          date:
            dor.submitted_at ??
            dor.created_at ??
            null,
          tone:
            dor.patrol_type ===
            "Final Evaluation"
              ? "amber"
              : dor.patrol_type ===
                  "FPP"
                ? "green"
                : "blue",
        })
      )
    );
  }

  const dashboardMode =
    getDashboardMode(
      role
    );

  const roleDescription =
    getRoleDescription(
      role
    );

  const headlineCards =
    useMemo(
      () =>
        getHeadlineCards({
          role,
          stats,
          currentTrainee,
        }),
      [
        role,
        stats,
        currentTrainee,
      ]
    );

  const attentionItems =
    useMemo(
      () =>
        getAttentionItems({
          role,
          stats,
          trainees,
        }),
      [
        role,
        stats,
        trainees,
      ]
    );

  const stageBreakdown = [
    {
      label:
        "Week 1",
      value:
        stats.week1Trainees,
      tone: "blue",
    },
    {
      label:
        "Week 2",
      value:
        stats.week2Trainees,
      tone: "violet",
    },
    {
      label:
        "FPP",
      value:
        stats.fppTrainees,
      tone: "amber",
    },
    {
      label:
        "Final Evaluation",
      value:
        stats.finalEvaluationTrainees,
      tone: "orange",
    },
    {
      label:
        "Awaiting Promotion",
      value:
        stats.completedTrainees,
      tone: "green",
    },
  ] as const;

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroGlowStyle} />

        <div style={heroContentStyle}>
          <div>
            <p style={eyebrowStyle}>
              {getRoleContextLabel(
                role
              )}{" "}
              COMMAND VIEW
            </p>

            <h1 style={heroTitleStyle}>
              Good{" "}
              {getDayPart()},
              {" "}
              {getFirstName(
                user?.name
              )}
            </h1>

            <p style={heroTextStyle}>
              {roleDescription}
            </p>
          </div>

          <div style={identityPanelStyle}>
            <div>
              <p style={identityLabelStyle}>
                ACCESS PROFILE
              </p>

              <strong style={identityValueStyle}>
                {getRoleDisplayName(
                  role
                )}
              </strong>
            </div>

            <div style={identityDividerStyle} />

            <div>
              <p style={identityLabelStyle}>
                STATUS
              </p>

              <strong style={onlineStatusStyle}>
                ● Operational
              </strong>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {!loading && (
        <DORDraftAlerts
          drafts={
            draftAlerts
          }
          openDOR={
            openDOR
          }
        />
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section style={metricGridStyle}>
            {headlineCards.map(
              (card) => (
                <MetricCard
                  key={
                    card.label
                  }
                  {...card}
                />
              )
            )}
          </section>

          <section style={mainGridStyle}>
            <div style={mainColumnStyle}>
              {dashboardMode ===
                "p1" && (
                  <P1ProgressPanel
                    currentTrainee={
                      currentTrainee
                    }
                    stats={stats}
                  />
                )}

              {dashboardMode !==
                "p1" &&
                canManageProgression(
                  role
                ) && (
                  <ProgrammeOverview
                    stageBreakdown={
                      stageBreakdown
                    }
                    total={
                      stats.activeTrainees
                    }
                  />
                )}

              {dashboardMode ===
                "fto" && (
                  <FTOOperationsPanel
                    stats={stats}
                  />
                )}

              <AttentionPanel
                title={
                  dashboardMode ===
                  "fto"
                    ? "Operational Queue"
                    : dashboardMode ===
                        "p1"
                      ? "Your Next Steps"
                      : "Needs Attention"
                }
                items={
                  attentionItems
                }
              />

              <PerformanceTrend
                points={
                  weeklyDorTrend
                }
              />

              <RecentActivity
                items={activity}
              />
            </div>

            <div style={sideColumnStyle}>
              <CalendarPanel
                events={
                  calendarEvents
                }
                canEdit={
                  canEditCalendar(
                    role
                  )
                }
                canManageOperations={
                  canManageProgression(
                    role
                  )
                }
                trainees={
                  trainees
                }
                outstandingDORs={
                  draftAlerts.length
                }
                onOpenCalendar={() =>
                  onNavigate(
                    "Batch Management"
                  )
                }
              />

              <QuickActions
                role={role}
                trainees={
                  trainees
                }
                openDOR={
                  openDOR
                }
              />

              <OfficerSpotlight
                trainees={
                  trainees
                }
              />

              <SystemSnapshot
                role={role}
                stats={stats}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function calculateProgrammeStats(
  trainees: any[],
  stats: DashboardStats
) {
  stats.activeTrainees =
    trainees.filter(
      (trainee) =>
        (
          trainee.status ??
          "Active"
        ) !== "P2"
    ).length;

  stats.reviewTrainees =
    trainees.filter(
      (trainee) =>
        trainee.status ===
        "Review"
    ).length;

  stats.unassignedTrainees =
    trainees.filter(
      (trainee) =>
        !trainee.assigned_ftm &&
        !trainee.ftm
    ).length;

  for (
    const trainee of trainees
  ) {
    const stage =
      getTraineeStage(
        trainee
      );

    switch (stage) {
      case "Week 1":
        stats.week1Trainees +=
          1;
        break;

      case "Week 2":
        stats.week2Trainees +=
          1;
        break;

      case "FPP":
        stats.fppTrainees +=
          1;
        break;

      case "Final Evaluation":
        stats.finalEvaluationTrainees +=
          1;
        break;

      case "Completed":
        stats.completedTrainees +=
          1;
        stats.readyForPromotion +=
          1;
        break;

      case "P2":
        stats.p2Trainees +=
          1;
        break;
    }
  }
}

function getDashboardMode(
  role: string
) {
  if (
    role ===
    "Probationary Officer"
  ) {
    return "p1";
  }

  if (
    role ===
    "Field Training Officer"
  ) {
    return "fto";
  }

  if (
    role ===
    "LSPD STAFF"
  ) {
    return "admin";
  }

  return "management";
}

function getRoleDescription(
  role: string
) {
  switch (role) {
    case "Probationary Officer":
      return "Your live FTP record, current stage and next training milestones.";

    case "Field Training Officer":
      return "Patrol delivery, DOR activity and your personal instruction record.";

    case "Field Training Manager":
      return "Operational oversight of PPOWERs, progression and Final Evaluations.";

    case "Field Training Supervisor":
      return "Programme supervision, promotions, risk and training delivery.";

    case "FTP Staff":
      return "Head of FTP command view across the entire training programme.";

    case "LSPD STAFF":
      return "Department administration, personnel access and programme visibility.";

    default:
      return "Field Training Programme access portal.";
  }
}

function getHeadlineCards({
  role,
  stats,
  currentTrainee,
}: {
  role: string;
  stats: DashboardStats;
  currentTrainee: any | null;
}) {
  if (
    role ===
    "Probationary Officer"
  ) {
    return [
      {
        label:
          "Current Stage",
        value:
          getTraineeStage(
            currentTrainee
          ),
        detail:
          "Your current FTP phase",
        icon: "↗",
        tone: "blue",
      },
      {
        label:
          "Notebook Progress",
        value:
          `${stats.notebookProgress}%`,
        detail:
          `${stats.completedNotebookItems} of ${stats.totalNotebookItems} items complete`,
        icon: "✓",
        tone: "green",
      },
      {
        label:
          "DORs Received",
        value:
          String(
            stats.dorCount
          ),
        detail:
          "Submitted patrol evaluations",
        icon: "≡",
        tone: "violet",
      },
      {
        label:
          "PPOWERs",
        value:
          String(
            stats.ppowerCount
          ),
        detail:
          "Weekly evaluations recorded",
        icon: "★",
        tone: "amber",
      },
    ];
  }

  if (
    role ===
    "Field Training Officer"
  ) {
    return [
      {
        label:
          "Instruction Time",
        value:
          formatMinutes(
            stats.instructionMinutes
          ),
        detail:
          "Total recorded instruction",
        icon: "◷",
        tone: "blue",
      },
      {
        label:
          "DORs This Week",
        value:
          String(
            stats.mySubmittedDORsThisWeek
          ),
        detail:
          "Your submitted reports",
        icon: "≡",
        tone: "green",
      },
      {
        label:
          "Training Entries",
        value:
          String(
            stats.trainingEntries
          ),
        detail:
          "Entries in your FTO file",
        icon: "↗",
        tone: "violet",
      },
      {
        label:
          "Open Drafts",
        value:
          "Live",
        detail:
          "See active draft alerts below",
        icon: "!",
        tone: "amber",
      },
    ];
  }

  if (
    role ===
    "LSPD STAFF"
  ) {
    return [
      {
        label:
          "Personnel Records",
        value:
          String(
            stats.activeTrainees
          ),
        detail:
          "Active FTP participants",
        icon: "◉",
        tone: "blue",
      },
      {
        label:
          "Role Requests",
        value:
          String(
            stats.pendingRoleRequests
          ),
        detail:
          "Pending FTO requests",
        icon: "!",
        tone: "amber",
      },
      {
        label:
          "Unassigned Records",
        value:
          String(
            stats.unassignedTrainees
          ),
        detail:
          "No FTM currently recorded",
        icon: "—",
        tone: "red",
      },
      {
        label:
          "Calendar",
        value:
          "Live",
        detail:
          "Official FTP schedule",
        icon: "□",
        tone: "violet",
      },
    ];
  }

  return [
    {
      label:
        "Active P1s",
      value:
        String(
          stats.activeTrainees
        ),
      detail:
        "Currently in the programme",
      icon: "◉",
      tone: "blue",
    },
    {
      label:
        "Ready for FPP",
      value:
        String(
          stats.readyForFPP
        ),
      detail:
        "All Week 2 requirements met",
      icon: "→",
      tone: "green",
    },
    {
      label:
        "Final Evaluations",
      value:
        String(
          stats.readyForFinalEvaluation
        ),
      detail:
        "Ready to be conducted",
      icon: "★",
      tone: "amber",
    },
    {
      label:
        canPromoteToP2(
          role
        )
          ? "Ready for Promotion"
          : "Pending Reviews",
      value:
        canPromoteToP2(
          role
        )
          ? String(
              stats.readyForPromotion
            )
          : String(
              stats.reviewTrainees
            ),
      detail:
        canPromoteToP2(
          role
        )
          ? "Final Evaluation completed"
          : "Records requiring attention",
      icon:
        canPromoteToP2(
          role
        )
          ? "✓"
          : "!",
      tone:
        canPromoteToP2(
          role
        )
          ? "violet"
          : "red",
    },
  ];
}

function getAttentionItems({
  role,
  stats,
  trainees,
}: {
  role: string;
  stats: DashboardStats;
  trainees: any[];
}) {
  if (
    role ===
    "Probationary Officer"
  ) {
    return [
      {
        title:
          stats.notebookProgress ===
          100
            ? "Structured learning complete"
            : `${Math.max(
                0,
                stats.totalNotebookItems -
                  stats.completedNotebookItems
              )} notebook items remaining`,
        detail:
          stats.notebookProgress ===
          100
            ? "Your checklist is fully complete."
            : "Continue completing structured learning items during patrols.",
        tone:
          stats.notebookProgress ===
          100
            ? "green"
            : "amber",
      },
      {
        title:
          "Review your latest DOR feedback",
        detail:
          "Use your record to track learning goals before your next patrol.",
        tone: "blue",
      },
    ];
  }

  if (
    role ===
    "Field Training Officer"
  ) {
    return [
      {
        title:
          "Complete outstanding DOR drafts",
        detail:
          "Draft alerts above show reports that still need submission.",
        tone: "amber",
      },
      {
        title:
          "Keep your FTO file current",
        detail:
          "Instruction time is updated automatically when DORs are submitted.",
        tone: "blue",
      },
      {
        title:
          "No assigned probationer workload",
        detail:
          "FTOs may patrol any available probationer; assignments are not used.",
        tone: "green",
      },
    ];
  }

  if (
    role ===
    "LSPD STAFF"
  ) {
    return [
      {
        title:
          `${stats.pendingRoleRequests} pending FTO role request${stats.pendingRoleRequests === 1 ? "" : "s"}`,
        detail:
          "Review access requests from Personnel or Role Requests.",
        tone:
          stats.pendingRoleRequests >
          0
            ? "amber"
            : "green",
      },
      {
        title:
          `${stats.unassignedTrainees} unassigned trainee record${stats.unassignedTrainees === 1 ? "" : "s"}`,
        detail:
          "Visible for department administration; operational allocation remains with FTP.",
        tone:
          stats.unassignedTrainees >
          0
            ? "red"
            : "green",
      },
    ];
  }

  const items = [
    {
      title:
        `${stats.readyForFPP} trainee${stats.readyForFPP === 1 ? "" : "s"} ready for FPP`,
      detail:
        "Week 2 PPOWER, notebook and DOR requirements are complete.",
      tone:
        stats.readyForFPP >
        0
          ? "green"
          : "slate",
    },
    {
      title:
        `${stats.readyForFinalEvaluation} Final Evaluation${stats.readyForFinalEvaluation === 1 ? "" : "s"} ready`,
      detail:
        "Two consecutive clean FPP patrols have been completed.",
      tone:
        stats.readyForFinalEvaluation >
        0
          ? "amber"
          : "slate",
    },
    {
      title:
        `${stats.reviewTrainees} record${stats.reviewTrainees === 1 ? "" : "s"} marked for review`,
      detail:
        "Open P1 Records to review current concerns and progress.",
      tone:
        stats.reviewTrainees >
        0
          ? "red"
          : "green",
    },
  ];

  if (
    canPromoteToP2(
      role
    )
  ) {
    items.unshift({
      title:
        `${stats.readyForPromotion} promotion${stats.readyForPromotion === 1 ? "" : "s"} ready`,
      detail:
        "Final Evaluations are complete and awaiting P2 action.",
      tone:
        stats.readyForPromotion >
        0
          ? "violet"
          : "slate",
    });
  }

  return items;
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone: string;
}) {
  const toneStyle =
    getToneStyle(
      tone
    );

  return (
    <div style={metricCardStyle}>
      <div style={metricHeaderStyle}>
        <div
          style={{
            ...metricIconStyle,
            color:
              toneStyle.text,
            backgroundColor:
              toneStyle.background,
            borderColor:
              toneStyle.border,
          }}
        >
          {icon}
        </div>

        <span style={metricLabelStyle}>
          {label}
        </span>
      </div>

      <p style={metricValueStyle}>
        {value}
      </p>

      <p style={metricDetailStyle}>
        {detail}
      </p>
    </div>
  );
}

function ProgrammeOverview({
  stageBreakdown,
  total,
}: {
  stageBreakdown: ReadonlyArray<{
    label: string;
    value: number;
    tone: string;
  }>;
  total: number;
}) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            LIVE PROGRAMME
          </p>

          <h2 style={panelTitleStyle}>
            Training Pipeline
          </h2>
        </div>

        <span style={liveBadgeStyle}>
          ● LIVE
        </span>
      </div>

      <div style={pipelineStyle}>
        {stageBreakdown.map(
          (
            stage,
            index
          ) => {
            const tone =
              getToneStyle(
                stage.tone
              );

            const percentage =
              total > 0
                ? Math.round(
                    (
                      stage.value /
                      total
                    ) * 100
                  )
                : 0;

            return (
              <div
                key={
                  stage.label
                }
                style={
                  pipelineItemStyle
                }
              >
                <div style={pipelineTopStyle}>
                  <div
                    style={{
                      ...pipelineDotStyle,
                      color:
                        tone.text,
                      backgroundColor:
                        tone.background,
                      borderColor:
                        tone.border,
                    }}
                  >
                    {stage.value}
                  </div>

                  {index <
                    stageBreakdown.length -
                      1 && (
                    <div style={pipelineLineStyle} />
                  )}
                </div>

                <strong style={pipelineLabelStyle}>
                  {stage.label}
                </strong>

                <span style={pipelineMetaStyle}>
                  {percentage}% of active
                </span>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

function P1ProgressPanel({
  currentTrainee,
  stats,
}: {
  currentTrainee: any | null;
  stats: DashboardStats;
}) {
  const stage =
    getTraineeStage(
      currentTrainee
    );

  const stages = [
    "Week 1",
    "Week 2",
    "FPP",
    "Final Evaluation",
    "Completed",
  ];

  const currentIndex =
    Math.max(
      0,
      stages.indexOf(
        stage
      )
    );

  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            YOUR TRAINING
          </p>

          <h2 style={panelTitleStyle}>
            {stage}
          </h2>
        </div>

        <span style={progressBadgeStyle}>
          {stats.notebookProgress}%
          notebook
        </span>
      </div>

      <div style={p1TimelineStyle}>
        {stages.map(
          (
            item,
            index
          ) => {
            const active =
              index <=
              currentIndex;

            return (
              <div
                key={item}
                style={p1StageStyle}
              >
                <div
                  style={{
                    ...p1StageDotStyle,
                    backgroundColor:
                      active
                        ? "#2563eb"
                        : "#1e293b",
                    borderColor:
                      active
                        ? "#60a5fa"
                        : "#475569",
                    color:
                      active
                        ? "white"
                        : "#64748b",
                  }}
                >
                  {active
                    ? "✓"
                    : index + 1}
                </div>

                <span
                  style={{
                    ...p1StageLabelStyle,
                    color:
                      active
                        ? "#e2e8f0"
                        : "#64748b",
                  }}
                >
                  {item}
                </span>
              </div>
            );
          }
        )}
      </div>

      <div style={progressBarBlockStyle}>
        <div style={progressBarHeaderStyle}>
          <span>
            Structured Learning
          </span>

          <strong>
            {stats.completedNotebookItems}/
            {stats.totalNotebookItems}
          </strong>
        </div>

        <div style={progressTrackStyle}>
          <div
            style={{
              ...progressFillStyle,
              width:
                `${stats.notebookProgress}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}

function FTOOperationsPanel({
  stats,
}: {
  stats: DashboardStats;
}) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            PERSONAL DELIVERY
          </p>

          <h2 style={panelTitleStyle}>
            FTO Operations
          </h2>
        </div>

        <span style={liveBadgeStyle}>
          CURRENT
        </span>
      </div>

      <div style={operationsGridStyle}>
        <MiniMetric
          label="Instruction Time"
          value={formatMinutes(
            stats.instructionMinutes
          )}
          detail="Recorded total"
        />

        <MiniMetric
          label="DORs This Week"
          value={String(
            stats.mySubmittedDORsThisWeek
          )}
          detail="Submitted by you"
        />

        <MiniMetric
          label="Training Entries"
          value={String(
            stats.trainingEntries
          )}
          detail="FTO file entries"
        />

        <MiniMetric
          label="FTM Meetings"
          value={String(
            stats.meetingEntries
          )}
          detail="Logged meetings"
        />
      </div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div style={miniMetricStyle}>
      <span style={miniMetricLabelStyle}>
        {label}
      </span>

      <strong style={miniMetricValueStyle}>
        {value}
      </strong>

      <span style={miniMetricDetailStyle}>
        {detail}
      </span>
    </div>
  );
}

function AttentionPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{
    title: string;
    detail: string;
    tone: string;
  }>;
}) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            PRIORITY VIEW
          </p>

          <h2 style={panelTitleStyle}>
            {title}
          </h2>
        </div>

        <span style={countPillStyle}>
          {items.length}
        </span>
      </div>

      <div style={attentionListStyle}>
        {items.map(
          (
            item,
            index
          ) => {
            const tone =
              getToneStyle(
                item.tone
              );

            return (
              <div
                key={`${item.title}-${index}`}
                style={attentionItemStyle}
              >
                <div
                  style={{
                    ...attentionMarkerStyle,
                    backgroundColor:
                      tone.background,
                    borderColor:
                      tone.border,
                    color:
                      tone.text,
                  }}
                >
                  {item.tone ===
                  "green"
                    ? "✓"
                    : item.tone ===
                        "red"
                      ? "!"
                      : "•"}
                </div>

                <div>
                  <strong>
                    {item.title}
                  </strong>

                  <p style={attentionDetailStyle}>
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

function PerformanceTrend({
  points,
}: {
  points: WeeklyTrendPoint[];
}) {
  const maximum =
    Math.max(
      1,
      ...points.map(
        (point) =>
          point.count
      )
    );

  const current =
    points[
      points.length - 1
    ]?.count ?? 0;

  const previous =
    points[
      points.length - 2
    ]?.count ?? 0;

  const change =
    current - previous;

  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            DELIVERY TREND
          </p>

          <h2 style={panelTitleStyle}>
            DORs Submitted
          </h2>
        </div>

        <span
          style={{
            ...trendChangeBadgeStyle,
            color:
              change >= 0
                ? "#86efac"
                : "#fecaca",
            borderColor:
              change >= 0
                ? "#166534"
                : "#991b1b",
            backgroundColor:
              change >= 0
                ? "rgba(20, 83, 45, 0.28)"
                : "rgba(127, 29, 29, 0.28)",
          }}
        >
          {change >= 0
            ? "↑"
            : "↓"}{" "}
          {Math.abs(
            change
          )} vs last week
        </span>
      </div>

      {points.length ===
      0 ? (
        <div style={emptyStateStyle}>
          No DOR trend data is
          available yet.
        </div>
      ) : (
        <div style={trendChartStyle}>
          {points.map(
            (point) => (
              <div
                key={
                  point.label
                }
                style={trendColumnStyle}
              >
                <div style={trendValueStyle}>
                  {point.count}
                </div>

                <div style={trendTrackStyle}>
                  <div
                    style={{
                      ...trendBarStyle,
                      height:
                        `${Math.max(
                          8,
                          Math.round(
                            (
                              point.count /
                              maximum
                            ) *
                              100
                          )
                        )}%`,
                    }}
                  />
                </div>

                <span style={trendLabelStyle}>
                  {point.label}
                </span>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function OfficerSpotlight({
  trainees,
}: {
  trainees: any[];
}) {
  const spotlight =
    trainees
      .filter(
        (trainee) =>
          getTraineeStage(
            trainee
          ) !== "P2"
      )
      .sort(
        (
          first,
          second
        ) =>
          calculateNotebookProgress(
            second.notebook
          ) -
          calculateNotebookProgress(
            first.notebook
          )
      )[0];

  if (!spotlight) {
    return (
      <section style={sidePanelStyle}>
        <div style={panelHeaderStyle}>
          <div>
            <p style={panelEyebrowStyle}>
              OFFICER IN FOCUS
            </p>

            <h2 style={sidePanelTitleStyle}>
              No Active Record
            </h2>
          </div>
        </div>

        <div style={emptyStateStyle}>
          No active probationer is
          available for the spotlight.
        </div>
      </section>
    );
  }

  const progress =
    calculateNotebookProgress(
      spotlight.notebook
    );

  return (
    <section style={sidePanelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            OFFICER IN FOCUS
          </p>

          <h2 style={sidePanelTitleStyle}>
            {spotlight.profile?.name ??
              spotlight.name ??
              "Unknown Officer"}
          </h2>
        </div>

        <span style={focusStageBadgeStyle}>
          {getTraineeStage(
            spotlight
          )}
        </span>
      </div>

      <div style={focusMetricGridStyle}>
        <MiniMetric
          label="Notebook"
          value={`${progress}%`}
          detail="Structured learning"
        />

        <MiniMetric
          label="Status"
          value={
            spotlight.status ??
            "Active"
          }
          detail="Current record"
        />
      </div>

      <div style={focusProgressTrackStyle}>
        <div
          style={{
            ...focusProgressFillStyle,
            width:
              `${progress}%`,
          }}
        />
      </div>

      <p style={focusFooterStyle}>
        FTM:{" "}
        {spotlight.ftm?.name ??
          spotlight.ftm ??
          "Not assigned"}
      </p>
    </section>
  );
}

function RecentActivity({
  items,
}: {
  items: ActivityItem[];
}) {
  return (
    <section style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            AUDIT TRAIL
          </p>

          <h2 style={panelTitleStyle}>
            Recent Activity
          </h2>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={emptyStateStyle}>
          No recent activity has been
          recorded.
        </div>
      ) : (
        <div style={activityListStyle}>
          {items.map(
            (item) => {
              const tone =
                getToneStyle(
                  item.tone
                );

              return (
                <div
                  key={item.id}
                  style={activityRowStyle}
                >
                  <div
                    style={{
                      ...activityIconStyle,
                      backgroundColor:
                        tone.background,
                      borderColor:
                        tone.border,
                      color:
                        tone.text,
                    }}
                  >
                    ✓
                  </div>

                  <div style={activityTextStyle}>
                    <strong>
                      {item.title}
                    </strong>

                    <p style={activityDetailStyle}>
                      {item.detail}
                    </p>
                  </div>

                  <time style={activityTimeStyle}>
                    {formatRelativeDate(
                      item.date
                    )}
                  </time>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

function CalendarPanel({
  events,
  canEdit,
  canManageOperations,
  trainees,
  outstandingDORs,
  onOpenCalendar,
}: {
  events: CalendarEvent[];
  canEdit: boolean;
  canManageOperations: boolean;
  trainees: any[];
  outstandingDORs: number;
  onOpenCalendar: () => void;
}) {
  const orderedEvents =
    [...events].sort(
      (first, second) =>
        first.event_date.localeCompare(
          second.event_date
        )
    );

  const utcToday =
    new Date();

  utcToday.setUTCHours(
    0,
    0,
    0,
    0
  );

  const minimumFPPEvent =
    orderedEvents.find(
      (event) =>
        event.event_type ===
          "Minimum FPP Date" ||
        event.title
          .toLowerCase()
          .includes(
            "minimum date for fpp"
          )
    );

  const overduePPOWERs =
    canManageOperations &&
    minimumFPPEvent &&
    new Date(
      `${minimumFPPEvent.event_date}T00:00:00Z`
    ).getTime() <
      utcToday.getTime()
      ? trainees.filter(
          (trainee) => {
            const stage =
              getTraineeStage(
                trainee
              );

            const week2Outcome =
              trainee.week_2_ppower_outcome ??
              trainee.week2PPOWEROutcome ??
              null;

            return (
              (
                stage ===
                  "Week 1" ||
                stage ===
                  "Week 2"
              ) &&
              week2Outcome !==
                "Satisfactory"
            );
          }
        ).length
      : 0;

  const nextMilestone =
    orderedEvents.find(
      (event) =>
        new Date(
          `${event.event_date}T00:00:00Z`
        ).getTime() >=
        utcToday.getTime()
    ) ?? null;

  return (
    <section style={sidePanelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            TRAINING PERIOD
          </p>

          <h2 style={sidePanelTitleStyle}>
            Official Calendar
          </h2>
        </div>

        <button
          type="button"
          onClick={
            onOpenCalendar
          }
          style={calendarActionButtonStyle}
        >
          {canEdit
            ? "Edit Calendar"
            : "View Calendar"}
        </button>
      </div>

      {nextMilestone && (
        <div style={nextMilestoneStyle}>
          <p style={nextMilestoneLabelStyle}>
            NEXT MILESTONE
          </p>

          <strong style={nextMilestoneTitleStyle}>
            {nextMilestone.title}
          </strong>

          {nextMilestone.batch_name && (
            <span style={nextMilestoneBatchStyle}>
              {nextMilestone.batch_name}
            </span>
          )}

          <span style={nextMilestoneDateStyle}>
            {formatCalendarDate(
              nextMilestone.event_date
            )}
            {" • "}
            {formatDaysRemaining(
              nextMilestone.event_date
            )}
          </span>
        </div>
      )}

      {canManageOperations && (
        <div style={operationsAlertGridStyle}>
          <div
            style={{
              ...operationsAlertStyle,
              borderColor:
                overduePPOWERs > 0
                  ? "#a16207"
                  : "#166534",
              backgroundColor:
                overduePPOWERs > 0
                  ? "rgba(120, 53, 15, 0.28)"
                  : "rgba(20, 83, 45, 0.24)",
            }}
          >
            <span style={operationsAlertLabelStyle}>
              OVERDUE PPOWERS
            </span>

            <strong style={operationsAlertValueStyle}>
              {overduePPOWERs}
            </strong>
          </div>

          <div
            style={{
              ...operationsAlertStyle,
              borderColor:
                outstandingDORs > 0
                  ? "#991b1b"
                  : "#166534",
              backgroundColor:
                outstandingDORs > 0
                  ? "rgba(127, 29, 29, 0.28)"
                  : "rgba(20, 83, 45, 0.24)",
            }}
          >
            <span style={operationsAlertLabelStyle}>
              OUTSTANDING DORS
            </span>

            <strong style={operationsAlertValueStyle}>
              {outstandingDORs}
            </strong>
          </div>
        </div>
      )}

      {orderedEvents.length === 0 ? (
        <div style={emptyCalendarStyle}>
          <strong>
            No training period set
          </strong>

          <p style={emptyCalendarTextStyle}>
            Create an active or
            upcoming intake in Batch
            Management to publish its
            programme milestones here.
          </p>
        </div>
      ) : (
        <div style={milestoneTableStyle}>
          <div style={milestoneHeaderStyle}>
            <span>MILESTONE</span>
            <span>DATE</span>
          </div>

          {orderedEvents.map(
            (event) => (
              <div
                key={event.id}
                style={milestoneRowStyle}
              >
                <div>
                  <strong>
                    {event.title}
                  </strong>

                  {event.batch_name && (
                    <p style={milestoneBatchStyle}>
                      {event.batch_name}
                    </p>
                  )}

                  {event.description && (
                    <p style={milestoneDescriptionStyle}>
                      {event.description}
                    </p>
                  )}
                </div>

                <span style={milestoneDateStyle}>
                  {formatCalendarDate(
                    event.event_date
                  )}
                </span>
              </div>
            )
          )}
        </div>
      )}

      <div style={calendarFooterStyle}>
        <span>
          These milestones are generated
          automatically from the selected
          batch induction date.
        </span>
      </div>
    </section>
  );
}

function QuickActions({
  role,
  trainees,
  openDOR,
}: {
  role: string;
  trainees: any[];
  openDOR: (
    traineeId: string
  ) => void;
}) {
  const firstTrainee =
    trainees[0];

  const actions: Array<{
    label: string;
    detail: string;
    enabled: boolean;
    onClick?: () => void;
  }> = [];

  if (
    canWriteDORs(
      role
    )
  ) {
    actions.push({
      label:
        "Start a DOR",
      detail:
        "Open the Daily Observation Report workflow",
      enabled:
        Boolean(
          firstTrainee?.id
        ),
      onClick:
        firstTrainee?.id
          ? () =>
              openDOR(
                firstTrainee.id
              )
          : undefined,
    });
  }

  if (
    canCompletePPOWER(
      role
    )
  ) {
    actions.push({
      label:
        "Review P1 Records",
      detail:
        "Open a trainee record to manage progression",
      enabled: true,
    });
  }

  if (
    canConductFinalEvaluation(
      role
    )
  ) {
    actions.push({
      label:
        "Final Evaluation Queue",
      detail:
        "Review trainees who have completed FPP requirements",
      enabled: true,
    });
  }

  if (
    canManagePersonnel(
      role
    )
  ) {
    actions.push({
      label:
        "Personnel Management",
      detail:
        "Review accounts, access and linked records",
      enabled: true,
    });
  }

  if (
    role ===
    "Probationary Officer"
  ) {
    actions.push({
      label:
        "Open My Notebook",
      detail:
        "Review your structured learning progress",
      enabled:
        canViewOwnNotebook(
          role
        ),
    });
  }

  return (
    <section style={sidePanelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            SHORTCUTS
          </p>

          <h2 style={sidePanelTitleStyle}>
            Quick Actions
          </h2>
        </div>
      </div>

      <div style={quickActionListStyle}>
        {actions.length ===
        0 ? (
          <div style={emptyStateStyle}>
            No quick actions are
            available for this role.
          </div>
        ) : (
          actions.map(
            (action) => (
              <button
                key={action.label}
                type="button"
                onClick={
                  action.onClick
                }
                disabled={
                  !action.enabled
                }
                style={{
                  ...quickActionButtonStyle,
                  opacity:
                    action.enabled
                      ? 1
                      : 0.5,
                  cursor:
                    action.enabled
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                <div>
                  <strong>
                    {action.label}
                  </strong>

                  <p style={quickActionDetailStyle}>
                    {action.detail}
                  </p>
                </div>

                <span style={quickActionArrowStyle}>
                  →
                </span>
              </button>
            )
          )
        )}
      </div>
    </section>
  );
}

function SystemSnapshot({
  role,
  stats,
}: {
  role: string;
  stats: DashboardStats;
}) {
  const rows = [
    {
      label:
        "Role Requests",
      value:
        canManageRoleRequests(
          role
        )
          ? String(
              stats.pendingRoleRequests
            )
          : "—",
    },
    {
      label:
        "Calendar Access",
      value:
        canEditCalendar(
          role
        )
          ? "Editor"
          : "Viewer",
    },
    {
      label:
        "Personnel Access",
      value:
        canManagePersonnel(
          role
        )
          ? "Enabled"
          : "Restricted",
    },
    {
      label:
        "Promotion Access",
      value:
        canPromoteToP2(
          role
        )
          ? "Enabled"
          : "Restricted",
    },
  ];

  return (
    <section style={sidePanelStyle}>
      <div style={panelHeaderStyle}>
        <div>
          <p style={panelEyebrowStyle}>
            ACCESS CONTROL
          </p>

          <h2 style={sidePanelTitleStyle}>
            System Snapshot
          </h2>
        </div>
      </div>

      <div style={snapshotListStyle}>
        {rows.map(
          (row) => (
            <div
              key={row.label}
              style={snapshotRowStyle}
            >
              <span style={snapshotLabelStyle}>
                {row.label}
              </span>

              <strong>
                {row.value}
              </strong>
            </div>
          )
        )}
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div style={skeletonGridStyle}>
      {Array.from({
        length: 8,
      }).map(
        (
          _,
          index
        ) => (
          <div
            key={index}
            style={skeletonCardStyle}
          />
        )
      )}
    </div>
  );
}

function getTraineeStage(
  trainee: any
) {
  return (
    trainee?.training_stage ??
    trainee?.trainingStage ??
    "Week 1"
  );
}

function calculateNotebookProgress(
  notebook: any
) {
  if (
    !Array.isArray(
      notebook
    )
  ) {
    return 0;
  }

  const items =
    notebook.flatMap(
      (section: any) =>
        Array.isArray(
          section?.items
        )
          ? section.items
          : []
    );

  if (
    items.length === 0
  ) {
    return 0;
  }

  return Math.round(
    (
      items.filter(
        (item: any) =>
          item?.completed ===
          true
      ).length /
      items.length
    ) * 100
  );
}

function isCleanRatings(
  ratings: unknown
) {
  if (
    !ratings ||
    typeof ratings !==
      "object"
  ) {
    return false;
  }

  const values =
    Object.values(
      ratings as Record<
        string,
        unknown
      >
    )
      .map(
        (value) =>
          Number(value)
      )
      .filter(
        (value) =>
          Number.isFinite(
            value
          )
      );

  return (
    values.length > 0 &&
    values.every(
      (value) =>
        value >= 3
    )
  );
}

function getWeekStartOffset(
  offset: number
) {
  const date =
    new Date();

  const day =
    date.getUTCDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  date.setUTCDate(
    date.getUTCDate() +
      difference +
      offset * 7
  );

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function getStartOfCurrentWeek() {
  const date =
    new Date();

  const day =
    date.getUTCDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  date.setUTCDate(
    date.getUTCDate() +
      difference
  );

  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date.toISOString();
}

function getFirstName(
  name: unknown
) {
  if (
    typeof name !==
      "string" ||
    !name.trim()
  ) {
    return "Officer";
  }

  return (
    name.trim().split(
      /\s+/
    )[0] ??
    "Officer"
  );
}

function getDayPart() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "morning";
  }

  if (hour < 18) {
    return "afternoon";
  }

  return "evening";
}

function formatMinutes(
  totalMinutes: number
) {
  const safeMinutes =
    Math.max(
      0,
      Math.floor(
        totalMinutes || 0
      )
    );

  const hours =
    Math.floor(
      safeMinutes / 60
    );

  const minutes =
    safeMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function formatRelativeDate(
  value: string | null
) {
  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(value);

  const difference =
    Date.now() -
    date.getTime();

  const minutes =
    Math.floor(
      difference /
        60000
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
    }
  );
}

function formatCalendarDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00Z`
  ).toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}

function formatDaysRemaining(
  value: string
) {
  const target =
    new Date(
      `${value}T00:00:00Z`
    );

  const today =
    new Date();

  today.setUTCHours(
    0,
    0,
    0,
    0
  );

  const days =
    Math.round(
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

function getDay(
  value: string
) {
  return new Date(
    `${value}T00:00:00Z`
  )
    .getUTCDate()
    .toString()
    .padStart(
      2,
      "0"
    );
}

function getMonth(
  value: string
) {
  return new Date(
    `${value}T00:00:00Z`
  )
    .toLocaleDateString(
      "en-GB",
      {
        month: "short",
        timeZone: "UTC",
      }
    )
    .toUpperCase();
}

function addDaysUTC(
  value: string,
  days: number
) {
  const date =
    new Date(
      `${value}T00:00:00Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
    days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function getToneStyle(
  tone: string
) {
  switch (tone) {
    case "green":
      return {
        text: "#bbf7d0",
        background:
          "rgba(20, 83, 45, 0.34)",
        border: "#166534",
      };

    case "amber":
      return {
        text: "#fde68a",
        background:
          "rgba(120, 53, 15, 0.34)",
        border: "#a16207",
      };

    case "orange":
      return {
        text: "#fed7aa",
        background:
          "rgba(154, 52, 18, 0.32)",
        border: "#ea580c",
      };

    case "red":
      return {
        text: "#fecaca",
        background:
          "rgba(127, 29, 29, 0.34)",
        border: "#991b1b",
      };

    case "violet":
      return {
        text: "#ddd6fe",
        background:
          "rgba(91, 33, 182, 0.30)",
        border: "#7c3aed",
      };

    case "slate":
      return {
        text: "#cbd5e1",
        background:
          "#1e293b",
        border: "#475569",
      };

    default:
      return {
        text: "#bfdbfe",
        background:
          "rgba(30, 64, 175, 0.30)",
        border: "#2563eb",
      };
  }
}

const pageStyle = {
  display: "grid",
  gap: "20px",
};

const heroStyle = {
  position:
    "relative" as const,
  overflow: "hidden",
  padding: "32px",
  background:
    "linear-gradient(135deg, #111c33 0%, #0f172a 58%, #172554 100%)",
  border:
    "1px solid #263655",
  borderRadius: "18px",
  boxShadow:
    "0 22px 60px rgba(2, 6, 23, 0.28)",
};

const heroGlowStyle = {
  position:
    "absolute" as const,
  width: "360px",
  height: "360px",
  right: "-140px",
  top: "-200px",
  background:
    "radial-gradient(circle, rgba(59, 130, 246, 0.32), transparent 68%)",
  pointerEvents:
    "none" as const,
};

const heroContentStyle = {
  position:
    "relative" as const,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "28px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 9px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const heroTitleStyle = {
  margin: "0 0 10px",
  fontSize: "34px",
  lineHeight: 1.12,
};

const heroTextStyle = {
  maxWidth: "720px",
  margin: 0,
  color: "#a8b4c8",
  lineHeight: 1.65,
};

const identityPanelStyle = {
  minWidth: "270px",
  display: "flex",
  alignItems: "center",
  gap: "18px",
  padding: "16px 18px",
  backgroundColor:
    "rgba(15, 23, 42, 0.72)",
  border:
    "1px solid #31415f",
  borderRadius: "13px",
  backdropFilter:
    "blur(10px)",
};

const identityLabelStyle = {
  margin: "0 0 5px",
  color: "#64748b",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.11em",
};

const identityValueStyle = {
  color: "#e2e8f0",
  fontSize: "13px",
};

const identityDividerStyle = {
  width: "1px",
  height: "34px",
  backgroundColor:
    "#334155",
};

const onlineStatusStyle = {
  color: "#86efac",
  fontSize: "13px",
};

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "16px",
};

const metricCardStyle = {
  padding: "20px",
  background:
    "linear-gradient(145deg, #182235, #111827)",
  border:
    "1px solid #29364c",
  borderRadius: "14px",
  boxShadow:
    "0 12px 32px rgba(2, 6, 23, 0.18)",
};

const metricHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const metricIconStyle = {
  width: "34px",
  height: "34px",
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: "10px",
  fontWeight: 900,
};

const metricLabelStyle = {
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: 700,
};

const metricValueStyle = {
  margin: "18px 0 7px",
  color: "#f8fafc",
  fontSize: "30px",
  fontWeight: 900,
  letterSpacing: "-0.03em",
};

const metricDetailStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: "11px",
  lineHeight: 1.5,
};

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.7fr) minmax(300px, 0.8fr)",
  gap: "20px",
  alignItems: "start",
};

const mainColumnStyle = {
  display: "grid",
  gap: "20px",
};

const sideColumnStyle = {
  display: "grid",
  gap: "20px",
};

const panelStyle = {
  padding: "24px",
  background:
    "linear-gradient(145deg, #172033, #111827)",
  border:
    "1px solid #29364c",
  borderRadius: "15px",
  boxShadow:
    "0 14px 38px rgba(2, 6, 23, 0.16)",
};

const sidePanelStyle = {
  ...panelStyle,
  padding: "21px",
};

const panelHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "20px",
};

const panelEyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.11em",
};

const panelTitleStyle = {
  margin: 0,
  fontSize: "20px",
};

const sidePanelTitleStyle = {
  margin: 0,
  fontSize: "17px",
};

const liveBadgeStyle = {
  padding: "5px 8px",
  color: "#86efac",
  backgroundColor:
    "rgba(20, 83, 45, 0.28)",
  border:
    "1px solid #166534",
  borderRadius: "999px",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const progressBadgeStyle = {
  padding: "6px 10px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30, 64, 175, 0.25)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const countPillStyle = {
  minWidth: "28px",
  height: "28px",
  display: "grid",
  placeItems: "center",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.18)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 900,
};

const pipelineStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(105px, 1fr))",
  gap: "12px",
  overflowX: "auto" as const,
  paddingBottom: "4px",
};

const pipelineItemStyle = {
  minWidth: "105px",
  textAlign: "center" as const,
};

const pipelineTopStyle = {
  display: "flex",
  alignItems: "center",
  marginBottom: "10px",
};

const pipelineDotStyle = {
  flexShrink: 0,
  width: "38px",
  height: "38px",
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 900,
};

const pipelineLineStyle = {
  flex: 1,
  height: "2px",
  marginLeft: "8px",
  background:
    "linear-gradient(90deg, #334155, #1e293b)",
};

const pipelineLabelStyle = {
  display: "block",
  minHeight: "32px",
  color: "#dbe4f0",
  fontSize: "11px",
};

const pipelineMetaStyle = {
  color: "#64748b",
  fontSize: "9px",
};

const p1TimelineStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(90px, 1fr))",
  gap: "12px",
  overflowX: "auto" as const,
  marginBottom: "24px",
};

const p1StageStyle = {
  display: "grid",
  justifyItems: "center",
  gap: "8px",
  textAlign: "center" as const,
};

const p1StageDotStyle = {
  width: "35px",
  height: "35px",
  display: "grid",
  placeItems: "center",
  border: "2px solid",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 900,
};

const p1StageLabelStyle = {
  fontSize: "10px",
  fontWeight: 800,
};

const progressBarBlockStyle = {
  padding: "16px",
  backgroundColor:
    "#0f172a",
  border:
    "1px solid #263248",
  borderRadius: "11px",
};

const progressBarHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: "15px",
  marginBottom: "10px",
  color: "#cbd5e1",
  fontSize: "11px",
};

const progressTrackStyle = {
  height: "8px",
  overflow: "hidden",
  backgroundColor:
    "#263248",
  borderRadius: "999px",
};

const progressFillStyle = {
  height: "100%",
  background:
    "linear-gradient(90deg, #2563eb, #60a5fa)",
  borderRadius: "999px",
};

const operationsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const miniMetricStyle = {
  display: "grid",
  gap: "7px",
  padding: "16px",
  backgroundColor:
    "#0f172a",
  border:
    "1px solid #263248",
  borderRadius: "11px",
};

const miniMetricLabelStyle = {
  color: "#94a3b8",
  fontSize: "10px",
};

const miniMetricValueStyle = {
  color: "#f8fafc",
  fontSize: "22px",
};

const miniMetricDetailStyle = {
  color: "#64748b",
  fontSize: "9px",
};

const attentionListStyle = {
  display: "grid",
  gap: "10px",
};

const attentionItemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "14px",
  backgroundColor:
    "#0f172a",
  border:
    "1px solid #263248",
  borderRadius: "10px",
};

const attentionMarkerStyle = {
  flexShrink: 0,
  width: "26px",
  height: "26px",
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: "8px",
  fontWeight: 900,
};

const attentionDetailStyle = {
  margin: "5px 0 0",
  color: "#7c8ba1",
  fontSize: "11px",
  lineHeight: 1.5,
};

const activityListStyle = {
  display: "grid",
};

const activityRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "13px 0",
  borderBottom:
    "1px solid #263248",
};

const activityIconStyle = {
  flexShrink: 0,
  width: "30px",
  height: "30px",
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: "9px",
  fontSize: "10px",
  fontWeight: 900,
};

const activityTextStyle = {
  minWidth: 0,
  flex: 1,
};

const activityDetailStyle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "10px",
};

const activityTimeStyle = {
  color: "#64748b",
  fontSize: "9px",
  whiteSpace: "nowrap" as const,
};

const nextMilestoneStyle = {
  display: "grid",
  gap: "6px",
  padding: "15px",
  marginBottom: "13px",
  background:
    "linear-gradient(135deg, rgba(30, 64, 175, 0.28), rgba(15, 23, 42, 0.84))",
  border:
    "1px solid #2563eb",
  borderRadius: "11px",
};

const nextMilestoneLabelStyle = {
  margin: 0,
  color: "#60a5fa",
  fontSize: "8px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const nextMilestoneTitleStyle = {
  color: "#e2e8f0",
  fontSize: "12px",
  lineHeight: 1.4,
};

const nextMilestoneBatchStyle = {
  color: "#94a3b8",
  fontSize: "9px",
  fontWeight: 700,
};

const nextMilestoneDateStyle = {
  color: "#93c5fd",
  fontSize: "9px",
};

const operationsAlertGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "9px",
  marginBottom: "13px",
};

const operationsAlertStyle = {
  display: "grid",
  gap: "7px",
  padding: "12px",
  border: "1px solid",
  borderRadius: "10px",
};

const operationsAlertLabelStyle = {
  color: "#94a3b8",
  fontSize: "8px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const operationsAlertValueStyle = {
  color: "#f8fafc",
  fontSize: "22px",
};

const milestoneTableStyle = {
  overflow: "hidden",
  backgroundColor: "#0f172a",
  border: "1px solid #263248",
  borderRadius: "11px",
};

const milestoneHeaderStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) 120px",
  gap: "12px",
  padding: "10px 12px",
  color: "#64748b",
  backgroundColor: "#111827",
  borderBottom: "1px solid #263248",
  fontSize: "8px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const milestoneRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) 120px",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  borderBottom: "1px solid #263248",
  fontSize: "10px",
};

const milestoneBatchStyle = {
  margin: "3px 0 0",
  color: "#93c5fd",
  fontSize: "8px",
  fontWeight: 800,
};

const milestoneDescriptionStyle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "8px",
  lineHeight: 1.4,
};

const milestoneDateStyle = {
  color: "#bfdbfe",
  textAlign: "right" as const,
  fontWeight: 800,
};

const calendarListStyle = {
  display: "grid",
  gap: "10px",
};

const calendarItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  backgroundColor:
    "#0f172a",
  border:
    "1px solid #263248",
  borderRadius: "10px",
};

const calendarDateStyle = {
  flexShrink: 0,
  width: "47px",
  display: "grid",
  justifyItems: "center",
  padding: "8px 5px",
  backgroundColor:
    "#172554",
  border:
    "1px solid #1d4ed8",
  borderRadius: "9px",
};

const calendarDayStyle = {
  color: "#dbeafe",
  fontSize: "17px",
  fontWeight: 900,
};

const calendarMonthStyle = {
  color: "#60a5fa",
  fontSize: "8px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const calendarTextStyle = {
  minWidth: 0,
};

const calendarMetaStyle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "9px",
};

const calendarActionButtonStyle = {
  padding: "7px 11px",
  color: "#dbeafe",
  backgroundColor:
    "rgba(30, 64, 175, 0.28)",
  border:
    "1px solid #2563eb",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "9px",
  fontWeight: 900,
};

const emptyCalendarStyle = {
  padding: "17px",
  color: "#cbd5e1",
  backgroundColor:
    "#0f172a",
  border:
    "1px dashed #334155",
  borderRadius: "10px",
};

const emptyCalendarTextStyle = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "10px",
  lineHeight: 1.5,
};

const calendarFooterStyle = {
  marginTop: "13px",
  color: "#475569",
  fontSize: "8px",
  lineHeight: 1.5,
};

const quickActionListStyle = {
  display: "grid",
  gap: "9px",
};

const quickActionButtonStyle = {
  width: "100%",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "13px",
  color: "white",
  textAlign: "left" as const,
  backgroundColor:
    "#0f172a",
  border:
    "1px solid #263248",
  borderRadius: "10px",
};

const quickActionDetailStyle = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "9px",
  lineHeight: 1.4,
};

const quickActionArrowStyle = {
  color: "#60a5fa",
  fontSize: "17px",
};

const snapshotListStyle = {
  display: "grid",
  gap: "9px",
};

const snapshotRowStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: "12px",
  paddingBottom: "9px",
  borderBottom:
    "1px solid #263248",
  fontSize: "10px",
};

const snapshotLabelStyle = {
  color: "#64748b",
};

const emptyStateStyle = {
  padding: "17px",
  color: "#64748b",
  backgroundColor:
    "#0f172a",
  border:
    "1px dashed #334155",
  borderRadius: "10px",
  fontSize: "10px",
};

const trendChangeBadgeStyle = {
  padding: "6px 10px",
  border: "1px solid",
  borderRadius: "999px",
  fontSize: "9px",
  fontWeight: 900,
};

const trendChartStyle = {
  minHeight: "230px",
  display: "grid",
  gridTemplateColumns:
    "repeat(6, minmax(52px, 1fr))",
  alignItems: "end",
  gap: "12px",
  padding: "18px 8px 4px",
  backgroundColor: "#0f172a",
  border: "1px solid #263248",
  borderRadius: "12px",
};

const trendColumnStyle = {
  height: "190px",
  display: "grid",
  gridTemplateRows:
    "20px 1fr 22px",
  alignItems: "end",
  gap: "8px",
};

const trendValueStyle = {
  color: "#bfdbfe",
  textAlign: "center" as const,
  fontSize: "10px",
  fontWeight: 900,
};

const trendTrackStyle = {
  height: "100%",
  display: "flex",
  alignItems: "flex-end",
  overflow: "hidden",
  backgroundColor: "#172033",
  borderRadius: "8px",
};

const trendBarStyle = {
  width: "100%",
  background:
    "linear-gradient(180deg, #60a5fa, #2563eb)",
  borderRadius: "8px 8px 0 0",
  boxShadow:
    "0 0 18px rgba(59, 130, 246, 0.25)",
};

const trendLabelStyle = {
  color: "#64748b",
  textAlign: "center" as const,
  fontSize: "8px",
};

const focusStageBadgeStyle = {
  padding: "5px 8px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30, 64, 175, 0.24)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "8px",
  fontWeight: 900,
};

const focusMetricGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const focusProgressTrackStyle = {
  height: "7px",
  overflow: "hidden",
  marginTop: "14px",
  backgroundColor: "#263248",
  borderRadius: "999px",
};

const focusProgressFillStyle = {
  height: "100%",
  background:
    "linear-gradient(90deg, #2563eb, #22c55e)",
  borderRadius: "999px",
};

const focusFooterStyle = {
  margin: "12px 0 0",
  color: "#64748b",
  fontSize: "9px",
};

const miniCalendarStyle = {
  padding: "13px",
  marginBottom: "14px",
  backgroundColor: "#0f172a",
  border: "1px solid #263248",
  borderRadius: "11px",
};

const miniCalendarHeaderStyle = {
  marginBottom: "10px",
  color: "#dbe4f0",
  fontSize: "11px",
};

const weekdaysStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(7, 1fr)",
  marginBottom: "5px",
  color: "#475569",
  textAlign: "center" as const,
  fontSize: "8px",
  fontWeight: 900,
};

const monthGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(7, 1fr)",
  gap: "3px",
};

const monthCellStyle = {
  position:
    "relative" as const,
  minHeight: "25px",
  display: "grid",
  placeItems: "center",
  color: "#94a3b8",
  borderRadius: "6px",
  fontSize: "8px",
};

const todayCellStyle = {
  color: "white",
  backgroundColor: "#1d4ed8",
  fontWeight: 900,
};

const eventDotStyle = {
  position:
    "absolute" as const,
  width: "4px",
  height: "4px",
  bottom: "3px",
  backgroundColor: "#f59e0b",
  borderRadius: "999px",
};

const errorStyle = {
  padding: "14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "10px",
};

const skeletonGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "16px",
};

const skeletonCardStyle = {
  minHeight: "135px",
  background:
    "linear-gradient(90deg, #172033, #1e293b, #172033)",
  backgroundSize:
    "200% 100%",
  border:
    "1px solid #29364c",
  borderRadius: "14px",
};