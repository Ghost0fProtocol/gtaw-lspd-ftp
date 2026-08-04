"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import {
  canManageFTP,
  normaliseRole,
} from "../lib/permissions";

type Props = {
  user: any;
};

type ProfileRow = {
  id: string;
  name: string | null;
  role: string | null;
  rank: string | null;
};

type TraineeRow = {
  id: string;
  profile_id: string;
  status: string | null;
  training_stage: string | null;
  start_date: string | null;
  promoted_to_p2_at: string | null;
  notebook: any;
};

type DORRow = {
  id: string;
  trainee_id: string;
  fto_id: string | null;
  status: string | null;
  patrol_date: string | null;
  duration: string | null;
  submitted_at: string | null;
  created_at: string | null;
  ratings: Record<
    string,
    unknown
  > | null;
  patrol_type: string | null;
};

type PPOWERRow = {
  id: string;
  trainee_id: string;
  ftm_id: string | null;
  week_number: number | null;
  attempt_number: number | null;
  outcome: string | null;
  created_at: string | null;
};

type FTOFileRow = {
  id: string;
  profile_id: string;
  total_instruction_minutes:
    | number
    | null;
};

type CalendarEventRow = {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  batch_name: string | null;
};

type BatchWindow = {
  name: string;
  startDate: string;
  endDate: string;
};

type ContributionRow = {
  profileId: string;
  name: string;
  role: string;
  patrols: number;
  submittedPatrols: number;
  minutes: number;
  averageMinutes: number;
  fileMinutes: number;
  uniqueTrainees: number;
  belowQuota: boolean;
  exempt: boolean;
};

type WeeklyPoint = {
  label: string;
  dors: number;
  ppowers: number;
  promotions: number;
};

const FTO_ROLES = [
  "Field Training Officer",
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
];

export default function FieldTrainingManagementDashboard({
  user,
}: Props) {
  const [
    profiles,
    setProfiles,
  ] = useState<
    ProfileRow[]
  >([]);

  const [
    trainees,
    setTrainees,
  ] = useState<
    TraineeRow[]
  >([]);

  const [
    dors,
    setDors,
  ] = useState<
    DORRow[]
  >([]);

  const [
    ppowers,
    setPpowers,
  ] = useState<
    PPOWERRow[]
  >([]);

  const [
    ftoFiles,
    setFtoFiles,
  ] = useState<
    FTOFileRow[]
  >([]);

  const [
    calendarEvents,
    setCalendarEvents,
  ] = useState<
    CalendarEventRow[]
  >([]);

  const [
    selectedBatch,
    setSelectedBatch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    contributionMetric,
    setContributionMetric,
  ] = useState<
    "patrols" | "hours"
  >("hours");

  const role =
    normaliseRole(
      user?.role
    );

  const canView =
    canManageFTP(
      role
    );

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    void loadDashboard();
  }, [
    canView,
  ]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [
        profileResult,
        traineeResult,
        dorResult,
        ppowerResult,
        ftoFileResult,
        calendarResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id,
            name,
            role,
            rank
          `),

        supabase
          .from("trainees")
          .select(`
            id,
            profile_id,
            status,
            training_stage,
            start_date,
            promoted_to_p2_at,
            notebook
          `),

        supabase
          .from("dors")
          .select(`
            id,
            trainee_id,
            fto_id,
            status,
            patrol_date,
            duration,
            submitted_at,
            created_at,
            ratings,
            patrol_type
          `),

        supabase
          .from("ppowers")
          .select(`
            id,
            trainee_id,
            ftm_id,
            week_number,
            attempt_number,
            outcome,
            created_at
          `),

        supabase
          .from("fto_files")
          .select(`
            id,
            profile_id,
            total_instruction_minutes
          `),

        supabase
          .from("ftp_calendar_events")
          .select(`
            id,
            title,
            event_date,
            event_type,
            batch_name
          `)
          .order(
            "event_date",
            {
              ascending: true,
            }
          ),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (traineeResult.error) {
        throw traineeResult.error;
      }

      if (dorResult.error) {
        throw dorResult.error;
      }

      if (ppowerResult.error) {
        throw ppowerResult.error;
      }

      if (ftoFileResult.error) {
        throw ftoFileResult.error;
      }

      if (calendarResult.error) {
        throw calendarResult.error;
      }

      setProfiles(
        (
          profileResult.data ??
          []
        ) as ProfileRow[]
      );

      setTrainees(
        (
          traineeResult.data ??
          []
        ) as TraineeRow[]
      );

      setDors(
        (
          dorResult.data ??
          []
        ) as DORRow[]
      );

      setPpowers(
        (
          ppowerResult.data ??
          []
        ) as PPOWERRow[]
      );

      setFtoFiles(
        (
          ftoFileResult.data ??
          []
        ) as FTOFileRow[]
      );


      const nextCalendarEvents =
        (
          calendarResult.data ??
          []
        ) as CalendarEventRow[];

      setCalendarEvents(
        nextCalendarEvents
      );

      const windows =
        buildBatchWindows(
          nextCalendarEvents
        );

      if (
        !selectedBatch &&
        windows.length > 0
      ) {
        setSelectedBatch(
          windows[
            windows.length - 1
          ].name
        );
      }
    } catch (loadError) {
      console.error(
        "LOAD FIELD TRAINING MANAGEMENT DASHBOARD ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "The management dashboard could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  const batchWindows =
    useMemo(
      () =>
        buildBatchWindows(
          calendarEvents
        ),
      [
        calendarEvents,
      ]
    );

  const selectedBatchWindow =
    useMemo(
      () =>
        batchWindows.find(
          (batch) =>
            batch.name ===
            selectedBatch
        ) ?? null,
      [
        batchWindows,
        selectedBatch,
      ]
    );

  const filteredTrainees =
    useMemo(
      () =>
        trainees.filter(
          (trainee) =>
            isTraineeInBatch(
              trainee,
              selectedBatchWindow
            )
        ),
      [
        trainees,
        selectedBatchWindow,
      ]
    );

  const filteredDORs =
    useMemo(
      () =>
        dors.filter(
          (dor) =>
            isWithinBatchWindow(
              dor.submitted_at ??
                dor.created_at ??
                dor.patrol_date,
              selectedBatchWindow
            )
        ),
      [
        dors,
        selectedBatchWindow,
      ]
    );

  const filteredPPOWERs =
    useMemo(
      () =>
        ppowers.filter(
          (ppower) =>
            isWithinBatchWindow(
              ppower.created_at,
              selectedBatchWindow
            )
        ),
      [
        ppowers,
        selectedBatchWindow,
      ]
    );

  const submittedDORs =
    filteredDORs.filter(
      (dor) =>
        dor.status ===
        "submitted"
    );

  const draftDORs =
    filteredDORs.filter(
      (dor) =>
        dor.status ===
        "draft"
    );

  const profileMap =
    useMemo(
      () =>
        new Map(
          profiles.map(
            (profile) => [
              profile.id,
              profile,
            ]
          )
        ),
      [
        profiles,
      ]
    );

  const contributionRows =
    useMemo(
      () =>
        buildContributionRows({
          profiles,
          dors:
            submittedDORs,
          ftoFiles,
        }),
      [
        profiles,
        submittedDORs,
        ftoFiles,
      ]
    );

  const totalInstructionMinutes =
    contributionRows.reduce(
      (
        total,
        officer
      ) =>
        total +
        officer.minutes,
      0
    );

  const totalFileMinutes =
    contributionRows.reduce(
      (
        total,
        officer
      ) =>
        total +
        officer.fileMinutes,
      0
    );

  const activeTrainees =
    filteredTrainees.filter(
      (trainee) =>
        ![
          "P2",
          "Completed",
          "Terminated",
          "Resigned",
        ].includes(
          trainee.status ??
          ""
        )
    );

  const promoted =
    filteredTrainees.filter(
      (trainee) =>
        trainee.status ===
          "P2" ||
        Boolean(
          trainee.promoted_to_p2_at
        )
    );

  const terminated =
    filteredTrainees.filter(
      (trainee) =>
        trainee.status ===
        "Terminated"
    );

  const resigned =
    filteredTrainees.filter(
      (trainee) =>
        trainee.status ===
        "Resigned"
    );

  const stageCounts =
    getStageCounts(
      filteredTrainees
    );

  const ppowerOutcomes =
    getPPOWEROutcomes(
      filteredPPOWERs
    );

  const cleanDORCount =
    submittedDORs.filter(
      (dor) =>
        isCleanDOR(
          dor.ratings
        )
    ).length;

  const cleanDORRate =
    submittedDORs.length > 0
      ? Math.round(
          (
            cleanDORCount /
            submittedDORs.length
          ) * 100
        )
      : 0;

  const belowQuota =
    contributionRows.filter(
      (row) =>
        row.belowQuota
    );

  const zeroPatrolNonExempt =
    contributionRows.filter(
      (row) =>
        !row.exempt &&
        row.patrols === 0
    );

  const completionRate =
    filteredTrainees.length > 0
      ? Math.round(
          (
            promoted.length /
            filteredTrainees.length
          ) * 100
        )
      : 0;

  const averagePatrolMinutes =
    submittedDORs.length > 0
      ? Math.round(
          totalInstructionMinutes /
            submittedDORs.length
        )
      : 0;

  const weeklyTrend =
    useMemo(
      () =>
        buildWeeklyTrend({
          dors:
            submittedDORs,
          ppowers:
            filteredPPOWERs,
          trainees:
            filteredTrainees,
        }),
      [
        submittedDORs,
        filteredPPOWERs,
        trainees,
      ]
    );

  const topContribution =
    contributionRows[0];

  const operationalAlerts =
    [
      {
        label:
          "Outstanding DOR drafts",
        value:
          draftDORs.length,
        detail:
          "Draft reports awaiting submission",
        tone:
          draftDORs.length > 0
            ? "red"
            : "green",
      },
      {
        label:
          "FTOs below quota",
        value:
          belowQuota.length,
        detail:
          "Non-exempt officers below three patrols",
        tone:
          belowQuota.length > 0
            ? "amber"
            : "green",
      },
      {
        label:
          "Zero-patrol FTOs",
        value:
          zeroPatrolNonExempt.length,
        detail:
          "No recorded patrols in the selected period",
        tone:
          zeroPatrolNonExempt.length >
          0
            ? "red"
            : "green",
      },
      {
        label:
          "Remedial PPOWERs",
        value:
          ppowerOutcomes.unsatisfactory,
        detail:
          "Unsatisfactory outcomes in the selected period",
        tone:
          ppowerOutcomes.unsatisfactory >
          0
            ? "amber"
            : "green",
      },
    ];

  if (!canView) {
    return (
      <div style={errorBoxStyle}>
        You do not have permission to
        view Field Training Management
        statistics.
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardSkeleton />
    );
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div style={heroGlowStyle} />

        <div style={heroContentStyle}>
          <div>
            <p style={eyebrowStyle}>
              FIELD TRAINING PROGRAM
            </p>

            <h1 style={heroTitleStyle}>
              Field Training Management
              Dashboard
            </h1>

            <p style={heroTextStyle}>
              Live operational analytics,
              instructor contributions and
              current batch health.
            </p>
          </div>

          <div style={heroControlsStyle}>
            <label style={controlLabelStyle}>
              REPORTING BATCH
            </label>

            <select
              value={
                selectedBatch
              }
              onChange={(event) =>
                setSelectedBatch(
                  event.target.value
                )
              }
              style={batchSelectStyle}
            >
              {batchWindows.length ===
              0 ? (
                <option value="">
                  No published batches
                </option>
              ) : (
                batchWindows.map(
                  (batch) => (
                    <option
                      key={
                        batch.name
                      }
                      value={
                        batch.name
                      }
                    >
                      {batch.name} —{" "}
                      {formatShortDate(
                        batch.startDate
                      )} to{" "}
                      {formatShortDate(
                        batch.endDate
                      )}
                    </option>
                  )
                )
              )}
            </select>

            {selectedBatchWindow && (
              <div style={batchWindowSummaryStyle}>
                <span>
                  Batch start
                  <strong>
                    {formatLongDate(
                      selectedBatchWindow.startDate
                    )}
                  </strong>
                </span>

                <span>
                  Batch end
                  <strong>
                    {formatLongDate(
                      selectedBatchWindow.endDate
                    )}
                  </strong>
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                void loadDashboard()
              }
              style={refreshButtonStyle}
            >
              Refresh Live Data
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div style={errorBoxStyle}>
          {error}
        </div>
      )}

      <section style={kpiGridStyle}>
        <KPI
          label="Recorded FTPs"
          value={String(
            submittedDORs.length
          )}
          detail="Submitted DORs in range"
          tone="blue"
          icon="≡"
        />

        <KPI
          label="Portal Patrol Hours"
          value={formatMinutes(
            totalInstructionMinutes
          )}
          detail="Calculated from DOR durations"
          tone="green"
          icon="◷"
        />

        <KPI
          label="FTO File Hours"
          value={formatMinutes(
            totalFileMinutes
          )}
          detail="All imported and recorded file time"
          tone="violet"
          icon="↗"
        />

        <KPI
          label="Active P1s"
          value={String(
            activeTrainees.length
          )}
          detail={`${filteredTrainees.length} records in selected batch`}
          tone="amber"
          icon="◉"
        />

        <KPI
          label="Promotions"
          value={String(
            promoted.length
          )}
          detail={`${completionRate}% completion rate`}
          tone="green"
          icon="✓"
        />

        <KPI
          label="Clean DOR Rate"
          value={`${cleanDORRate}%`}
          detail="All scored ratings at standard or above"
          tone="blue"
          icon="★"
        />
      </section>

      <section style={mainGridStyle}>
        <div style={mainColumnStyle}>
          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>
                  CURRENT PROGRAMME
                </p>

                <h2 style={panelTitleStyle}>
                  Batch Summary
                </h2>
              </div>

              <span style={liveBadgeStyle}>
                {selectedBatch ||
                  "NO BATCH"}
              </span>
            </div>

            <div style={batchSummaryGridStyle}>
              <SummaryMetric
                label="Total Records"
                value={
                  filteredTrainees.length
                }
              />

              <SummaryMetric
                label="Active"
                value={
                  activeTrainees.length
                }
              />

              <SummaryMetric
                label="Promoted"
                value={
                  promoted.length
                }
              />

              <SummaryMetric
                label="Resigned"
                value={
                  resigned.length
                }
              />

              <SummaryMetric
                label="Terminated"
                value={
                  terminated.length
                }
              />
            </div>

            <div style={progressTrackStyle}>
              <div
                style={{
                  ...progressFillStyle,
                  width:
                    `${completionRate}%`,
                }}
              />
            </div>

            <div style={progressCaptionStyle}>
              <span>
                Promotion conversion
              </span>

              <strong>
                {completionRate}%
              </strong>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>
                  TRAINING PIPELINE
                </p>

                <h2 style={panelTitleStyle}>
                  Stage Distribution
                </h2>
              </div>
            </div>

            <StageDistribution
              stageCounts={
                stageCounts
              }
            />
          </section>

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>
                  SIX-WEEK VIEW
                </p>

                <h2 style={panelTitleStyle}>
                  Delivery Trend
                </h2>
              </div>
            </div>

            <WeeklyTrendChart
              points={
                weeklyTrend
              }
            />
          </section>

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>
                  FIELD TRAINING OFFICERS
                </p>

                <h2 style={panelTitleStyle}>
                  Contributions
                </h2>
              </div>

              <div style={metricToggleStyle}>
                <button
                  type="button"
                  onClick={() =>
                    setContributionMetric(
                      "hours"
                    )
                  }
                  style={{
                    ...metricToggleButtonStyle,
                    ...(contributionMetric ===
                    "hours"
                      ? activeMetricToggleStyle
                      : {}),
                  }}
                >
                  Hours
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setContributionMetric(
                      "patrols"
                    )
                  }
                  style={{
                    ...metricToggleButtonStyle,
                    ...(contributionMetric ===
                    "patrols"
                      ? activeMetricToggleStyle
                      : {}),
                  }}
                >
                  Patrols
                </button>
              </div>
            </div>

            <ContributionChart
              rows={
                contributionRows.slice(
                  0,
                  12
                )
              }
              metric={
                contributionMetric
              }
            />
          </section>

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>
                  FULL RANKING
                </p>

                <h2 style={panelTitleStyle}>
                  Instructor Data
                </h2>
              </div>

              <span style={countBadgeStyle}>
                {
                  contributionRows.length
                }{" "}
                officers
              </span>
            </div>

            <ContributionTable
              rows={
                contributionRows
              }
            />
          </section>
        </div>

        <div style={sideColumnStyle}>
          <section style={sidePanelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>
                  MANAGEMENT QUEUE
                </p>

                <h2 style={sideTitleStyle}>
                  Operational Alerts
                </h2>
              </div>
            </div>

            <div style={alertListStyle}>
              {operationalAlerts.map(
                (alert) => (
                  <AlertCard
                    key={
                      alert.label
                    }
                    {...alert}
                  />
                )
              )}
            </div>
          </section>

          <section style={sidePanelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>
                  PPOWER ANALYTICS
                </p>

                <h2 style={sideTitleStyle}>
                  Weekly Outcomes
                </h2>
              </div>
            </div>

            <PPOWEROutcomes
              outcomes={
                ppowerOutcomes
              }
            />
          </section>

          <section style={sidePanelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>
                  LEADING CONTRIBUTOR
                </p>

                <h2 style={sideTitleStyle}>
                  Officer Spotlight
                </h2>
              </div>
            </div>

            {topContribution ? (
              <div style={spotlightStyle}>
                <div style={spotlightAvatarStyle}>
                  {getInitials(
                    topContribution.name
                  )}
                </div>

                <h3 style={spotlightNameStyle}>
                  {topContribution.name}
                </h3>

                <p style={spotlightRoleStyle}>
                  {topContribution.role}
                </p>

                <div style={spotlightGridStyle}>
                  <SpotlightMetric
                    label="Patrols"
                    value={String(
                      topContribution.patrols
                    )}
                  />

                  <SpotlightMetric
                    label="Hours"
                    value={formatMinutes(
                      topContribution.minutes
                    )}
                  />

                  <SpotlightMetric
                    label="Average"
                    value={formatMinutes(
                      topContribution.averageMinutes
                    )}
                  />

                  <SpotlightMetric
                    label="P1s"
                    value={String(
                      topContribution.uniqueTrainees
                    )}
                  />
                </div>
              </div>
            ) : (
              <div style={emptyStateStyle}>
                No contribution data is
                available.
              </div>
            )}
          </section>

          <section style={sidePanelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <p style={panelEyebrowStyle}>
                  SOURCE COVERAGE
                </p>

                <h2 style={sideTitleStyle}>
                  Data Availability
                </h2>
              </div>
            </div>

            <DataAvailabilityRow
              label="DORs and patrols"
              available
            />

            <DataAvailabilityRow
              label="PPOWER outcomes"
              available
            />

            <DataAvailabilityRow
              label="Trainee stages"
              available
            />

            <DataAvailabilityRow
              label="FTO file hours"
              available
            />

            <DataAvailabilityRow
              label="LOAs"
              available={false}
              detail="Forum / DRDB source"
            />

            <DataAvailabilityRow
              label="Exemption requests"
              available={false}
              detail="Forum / DRDB source"
            />
          </section>
        </div>
      </section>
    </div>
  );
}

function buildBatchWindows(
  events: CalendarEventRow[]
) {
  const grouped =
    new Map<
      string,
      CalendarEventRow[]
    >();

  for (
    const event of events
  ) {
    if (!event.batch_name) {
      continue;
    }

    const current =
      grouped.get(
        event.batch_name
      ) ?? [];

    current.push(event);

    grouped.set(
      event.batch_name,
      current
    );
  }

  return [
    ...grouped.entries(),
  ]
    .map(
      ([
        name,
        batchEvents,
      ]) => {
        const sorted =
          [...batchEvents].sort(
            (
              first,
              second
            ) =>
              first.event_date.localeCompare(
                second.event_date
              )
          );

        const startEvent =
          sorted.find(
            (event) =>
              event.event_type ===
                "Induction / Graduation" ||
              event.title
                .toLowerCase()
                .includes(
                  "graduation"
                )
          ) ??
          sorted[0];

        const endEvent =
          sorted.find(
            (event) =>
              event.event_type ===
                "50-Day Deadline" ||
              event.title
                .toLowerCase()
                .includes(
                  "50-day"
                )
          ) ??
          sorted[
            sorted.length - 1
          ];

        return {
          name,
          startDate:
            startEvent.event_date,
          endDate:
            endEvent.event_date,
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        first.startDate.localeCompare(
          second.startDate
        )
    );
}

function isTraineeInBatch(
  trainee: TraineeRow,
  batch: BatchWindow | null
) {
  if (!batch) {
    return true;
  }

  if (!trainee.start_date) {
    return false;
  }

  return (
    trainee.start_date >=
      batch.startDate &&
    trainee.start_date <=
      batch.endDate
  );
}

function isWithinBatchWindow(
  value: string | null,
  batch: BatchWindow | null
) {
  if (!batch) {
    return true;
  }

  if (!value) {
    return false;
  }

  const date =
    value.slice(
      0,
      10
    );

  return (
    date >=
      batch.startDate &&
    date <=
      batch.endDate
  );
}

function formatShortDate(
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

function formatLongDate(
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

function buildContributionRows({
  profiles,
  dors,
  ftoFiles,
}: {
  profiles: ProfileRow[];
  dors: DORRow[];
  ftoFiles: FTOFileRow[];
}) {
  return profiles
    .filter(
      (profile) =>
        FTO_ROLES.includes(
          normaliseRole(
            profile.role
          )
        )
    )
    .map(
      (profile) => {
        const officerDORs =
          dors.filter(
            (dor) =>
              dor.fto_id ===
              profile.id
          );

        const minutes =
          officerDORs.reduce(
            (
              total,
              dor
            ) =>
              total +
              parseDurationMinutes(
                dor.duration
              ),
            0
          );

        const fileMinutes =
          ftoFiles.find(
            (file) =>
              file.profile_id ===
              profile.id
          )
            ?.total_instruction_minutes ??
          0;

        const role =
          normaliseRole(
            profile.role
          );

        const exempt =
          role !==
          "Field Training Officer";

        return {
          profileId:
            profile.id,
          name:
            profile.name ??
            "Unknown Officer",
          role,
          patrols:
            officerDORs.length,
          submittedPatrols:
            officerDORs.length,
          minutes,
          averageMinutes:
            officerDORs.length >
            0
              ? Math.round(
                  minutes /
                    officerDORs.length
                )
              : 0,
          fileMinutes,
          uniqueTrainees:
            new Set(
              officerDORs.map(
                (dor) =>
                  dor.trainee_id
              )
            ).size,
          belowQuota:
            !exempt &&
            officerDORs.length <
              3,
          exempt,
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        second.minutes -
        first.minutes ||
        second.patrols -
          first.patrols
    );
}

function getStageCounts(
  trainees: TraineeRow[]
) {
  const stages = [
    "Week 1",
    "Week 2",
    "FPP",
    "Final Evaluation",
    "Completed",
    "P2",
  ];

  return stages.map(
    (stage) => ({
      stage,
      count:
        trainees.filter(
          (trainee) =>
            (
              trainee.training_stage ??
              trainee.status ??
              "Week 1"
            ) === stage
        ).length,
    })
  );
}

function getPPOWEROutcomes(
  ppowers: PPOWERRow[]
) {
  const satisfactory =
    ppowers.filter(
      (ppower) =>
        ppower.outcome ===
        "Satisfactory"
    ).length;

  const unsatisfactory =
    ppowers.filter(
      (ppower) =>
        ppower.outcome ===
        "Unsatisfactory"
    ).length;

  return {
    satisfactory,
    unsatisfactory,
    total:
      satisfactory +
      unsatisfactory,
  };
}

function buildWeeklyTrend({
  dors,
  ppowers,
  trainees,
}: {
  dors: DORRow[];
  ppowers: PPOWERRow[];
  trainees: TraineeRow[];
}) {
  return Array.from(
    {
      length: 6,
    },
    (
      _,
      index
    ) => {
      const start =
        getWeekStart(
          index - 5
        );

      const end =
        new Date(start);

      end.setUTCDate(
        end.getUTCDate() +
          7
      );

      return {
        label:
          start.toLocaleDateString(
            "en-GB",
            {
              day: "2-digit",
              month: "short",
              timeZone: "UTC",
            }
          ),
        dors:
          dors.filter(
            (dor) =>
              isDateBetween(
                dor.submitted_at ??
                  dor.created_at ??
                  dor.patrol_date,
                start,
                end
              )
          ).length,
        ppowers:
          ppowers.filter(
            (ppower) =>
              isDateBetween(
                ppower.created_at,
                start,
                end
              )
          ).length,
        promotions:
          trainees.filter(
            (trainee) =>
              isDateBetween(
                trainee.promoted_to_p2_at,
                start,
                end
              )
          ).length,
      };
    }
  );
}

function KPI({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: string;
}) {
  const colours =
    getTone(
      tone
    );

  return (
    <div style={kpiCardStyle}>
      <div style={kpiTopStyle}>
        <span
          style={{
            ...kpiIconStyle,
            color:
              colours.text,
            backgroundColor:
              colours.background,
            borderColor:
              colours.border,
          }}
        >
          {icon}
        </span>

        <span style={kpiLabelStyle}>
          {label}
        </span>
      </div>

      <strong style={kpiValueStyle}>
        {value}
      </strong>

      <span style={kpiDetailStyle}>
        {detail}
      </span>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div style={summaryMetricStyle}>
      <span style={summaryLabelStyle}>
        {label}
      </span>

      <strong style={summaryValueStyle}>
        {value}
      </strong>
    </div>
  );
}

function StageDistribution({
  stageCounts,
}: {
  stageCounts: Array<{
    stage: string;
    count: number;
  }>;
}) {
  const total =
    Math.max(
      1,
      stageCounts.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.count,
        0
      )
    );

  const colours = [
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#f97316",
    "#22c55e",
    "#14b8a6",
  ];

  let running = 0;

  const segments =
    stageCounts.map(
      (
        item,
        index
      ) => {
        const start =
          running;

        running +=
          (
            item.count /
            total
          ) * 100;

        return `${colours[index]} ${start}% ${running}%`;
      }
    );

  return (
    <div style={stageLayoutStyle}>
      <div
        style={{
          ...donutStyle,
          background:
            `conic-gradient(${segments.join(
              ", "
            )})`,
        }}
      >
        <div style={donutHoleStyle}>
          <strong style={donutValueStyle}>
            {total}
          </strong>

          <span style={donutLabelStyle}>
            records
          </span>
        </div>
      </div>

      <div style={stageLegendStyle}>
        {stageCounts.map(
          (
            item,
            index
          ) => (
            <div
              key={
                item.stage
              }
              style={stageLegendRowStyle}
            >
              <span
                style={{
                  ...legendDotStyle,
                  backgroundColor:
                    colours[index],
                }}
              />

              <span style={stageLegendLabelStyle}>
                {item.stage}
              </span>

              <strong>
                {item.count}
              </strong>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function WeeklyTrendChart({
  points,
}: {
  points: WeeklyPoint[];
}) {
  const maximum =
    Math.max(
      1,
      ...points.flatMap(
        (point) => [
          point.dors,
          point.ppowers,
          point.promotions,
        ]
      )
    );

  return (
    <div style={weeklyChartStyle}>
      {points.map(
        (point) => (
          <div
            key={point.label}
            style={weeklyGroupStyle}
          >
            <div style={weeklyBarsStyle}>
              <TrendBar
                value={point.dors}
                maximum={
                  maximum
                }
                tone="blue"
                title={`${point.dors} DORs`}
              />

              <TrendBar
                value={point.ppowers}
                maximum={
                  maximum
                }
                tone="violet"
                title={`${point.ppowers} PPOWERs`}
              />

              <TrendBar
                value={point.promotions}
                maximum={
                  maximum
                }
                tone="green"
                title={`${point.promotions} promotions`}
              />
            </div>

            <span style={weeklyLabelStyle}>
              {point.label}
            </span>
          </div>
        )
      )}
    </div>
  );
}

function TrendBar({
  value,
  maximum,
  tone,
  title,
}: {
  value: number;
  maximum: number;
  tone: string;
  title: string;
}) {
  const colours =
    getTone(
      tone
    );

  return (
    <div
      title={title}
      style={{
        ...trendBarStyle,
        height:
          `${Math.max(
            5,
            Math.round(
              (
                value /
                maximum
              ) * 100
            )
          )}%`,
        background:
          colours.solid,
      }}
    />
  );
}

function ContributionChart({
  rows,
  metric,
}: {
  rows: ContributionRow[];
  metric:
    | "hours"
    | "patrols";
}) {
  const maximum =
    Math.max(
      1,
      ...rows.map(
        (row) =>
          metric ===
          "hours"
            ? row.minutes
            : row.patrols
      )
    );

  return (
    <div style={contributionChartStyle}>
      {rows.map(
        (row) => {
          const value =
            metric ===
            "hours"
              ? row.minutes
              : row.patrols;

          return (
            <div
              key={
                row.profileId
              }
              style={contributionRowStyle}
            >
              <div style={contributionNameStyle}>
                <strong>
                  {row.name}
                </strong>

                <span>
                  {row.role}
                </span>
              </div>

              <div style={contributionTrackStyle}>
                <div
                  style={{
                    ...contributionFillStyle,
                    width:
                      `${Math.max(
                        2,
                        Math.round(
                          (
                            value /
                            maximum
                          ) * 100
                        )
                      )}%`,
                  }}
                />
              </div>

              <strong style={contributionValueStyle}>
                {metric ===
                "hours"
                  ? formatMinutes(
                      row.minutes
                    )
                  : row.patrols}
              </strong>
            </div>
          );
        }
      )}
    </div>
  );
}

function ContributionTable({
  rows,
}: {
  rows: ContributionRow[];
}) {
  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>
              Officer
            </th>
            <th style={thStyle}>
              Role
            </th>
            <th style={thNumberStyle}>
              FTPs
            </th>
            <th style={thNumberStyle}>
              Portal Hours
            </th>
            <th style={thNumberStyle}>
              File Hours
            </th>
            <th style={thNumberStyle}>
              Average
            </th>
            <th style={thNumberStyle}>
              P1s
            </th>
            <th style={thStyle}>
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (
              row,
              index
            ) => (
              <tr
                key={
                  row.profileId
                }
                style={tableRowStyle}
              >
                <td style={tdStyle}>
                  <strong>
                    {index + 1}.{" "}
                    {row.name}
                  </strong>
                </td>

                <td style={tdMutedStyle}>
                  {row.role}
                </td>

                <td style={tdNumberStyle}>
                  {row.patrols}
                </td>

                <td style={tdNumberStyle}>
                  {formatMinutes(
                    row.minutes
                  )}
                </td>

                <td style={tdNumberStyle}>
                  {formatMinutes(
                    row.fileMinutes
                  )}
                </td>

                <td style={tdNumberStyle}>
                  {formatMinutes(
                    row.averageMinutes
                  )}
                </td>

                <td style={tdNumberStyle}>
                  {row.uniqueTrainees}
                </td>

                <td style={tdStyle}>
                  <StatusBadge
                    row={row}
                  />
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({
  row,
}: {
  row: ContributionRow;
}) {
  if (row.exempt) {
    return (
      <span style={exemptBadgeStyle}>
        Exempt
      </span>
    );
  }

  if (row.belowQuota) {
    return (
      <span style={warningBadgeStyle}>
        Attention
      </span>
    );
  }

  return (
    <span style={goodBadgeStyle}>
      Quota Met
    </span>
  );
}

function AlertCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  const colours =
    getTone(
      tone
    );

  return (
    <div
      style={{
        ...alertCardStyle,
        borderColor:
          colours.border,
        backgroundColor:
          colours.background,
      }}
    >
      <div>
        <strong>
          {label}
        </strong>

        <p style={alertDetailStyle}>
          {detail}
        </p>
      </div>

      <span
        style={{
          ...alertValueStyle,
          color:
            colours.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PPOWEROutcomes({
  outcomes,
}: {
  outcomes: {
    satisfactory: number;
    unsatisfactory: number;
    total: number;
  };
}) {
  const satisfactoryPercent =
    outcomes.total > 0
      ? Math.round(
          (
            outcomes.satisfactory /
            outcomes.total
          ) * 100
        )
      : 0;

  const unsatisfactoryPercent =
    outcomes.total > 0
      ? 100 -
        satisfactoryPercent
      : 0;

  return (
    <div>
      <div style={outcomeTotalsStyle}>
        <div>
          <span style={outcomeLabelStyle}>
            Satisfactory
          </span>

          <strong style={outcomeGoodValueStyle}>
            {outcomes.satisfactory}
          </strong>
        </div>

        <div>
          <span style={outcomeLabelStyle}>
            Unsatisfactory
          </span>

          <strong style={outcomeBadValueStyle}>
            {outcomes.unsatisfactory}
          </strong>
        </div>
      </div>

      <div style={outcomeTrackStyle}>
        <div
          style={{
            ...outcomeGoodFillStyle,
            width:
              `${satisfactoryPercent}%`,
          }}
        />

        <div
          style={{
            ...outcomeBadFillStyle,
            width:
              `${unsatisfactoryPercent}%`,
          }}
        />
      </div>

      <p style={outcomeCaptionStyle}>
        {outcomes.total === 0
          ? "No PPOWER outcomes recorded in this period."
          : `${satisfactoryPercent}% satisfactory outcome rate`}
      </p>
    </div>
  );
}

function SpotlightMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={spotlightMetricStyle}>
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function DataAvailabilityRow({
  label,
  available,
  detail,
}: {
  label: string;
  available: boolean;
  detail?: string;
}) {
  return (
    <div style={availabilityRowStyle}>
      <div>
        <strong>
          {label}
        </strong>

        {detail && (
          <p style={availabilityDetailStyle}>
            {detail}
          </p>
        )}
      </div>

      <span
        style={
          available
            ? availableBadgeStyle
            : unavailableBadgeStyle
        }
      >
        {available
          ? "LIVE"
          : "EXTERNAL"}
      </span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={skeletonGridStyle}>
      {Array.from({
        length: 12,
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

function parseDurationMinutes(
  value: string | null
) {
  if (!value) {
    return 0;
  }

  const trimmed =
    value.trim();

  const hhmm =
    trimmed.match(
      /^(\d{1,3}):(\d{2})$/
    );

  if (hhmm) {
    return (
      Number(
        hhmm[1]
      ) *
        60 +
      Number(
        hhmm[2]
      )
    );
  }

  const hours =
    trimmed.match(
      /(\d+(?:\.\d+)?)\s*h/i
    );

  const minutes =
    trimmed.match(
      /(\d+)\s*m/i
    );

  if (
    hours ||
    minutes
  ) {
    return Math.round(
      Number(
        hours?.[1] ??
        0
      ) *
        60 +
      Number(
        minutes?.[1] ??
        0
      )
    );
  }

  const numeric =
    Number(trimmed);

  return Number.isFinite(
    numeric
  )
    ? Math.round(
        numeric
      )
    : 0;
}

function isCleanDOR(
  ratings: Record<
    string,
    unknown
  > | null
) {
  if (!ratings) {
    return false;
  }

  const values =
    Object.values(
      ratings
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

function getWeekStart(
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

function isDateBetween(
  value: string | null,
  start: Date,
  end: Date
) {
  if (!value) {
    return false;
  }

  const date =
    new Date(value);

  return (
    date >= start &&
    date < end
  );
}

function formatMinutes(
  minutes: number
) {
  const safe =
    Math.max(
      0,
      Math.round(
        minutes
      )
    );

  return `${Math.floor(
    safe / 60
  )}h ${String(
    safe % 60
  ).padStart(
    2,
    "0"
  )}m`;
}

function getInitials(
  name: string
) {
  return name
    .split(
      /\s+/
    )
    .slice(
      0,
      2
    )
    .map(
      (part) =>
        part[0] ??
        ""
    )
    .join("")
    .toUpperCase();
}

function getTone(
  tone: string
) {
  switch (tone) {
    case "green":
      return {
        text: "#bbf7d0",
        background:
          "rgba(20,83,45,.30)",
        border: "#166534",
        solid:
          "linear-gradient(180deg,#4ade80,#16a34a)",
      };

    case "amber":
      return {
        text: "#fde68a",
        background:
          "rgba(120,53,15,.30)",
        border: "#a16207",
        solid:
          "linear-gradient(180deg,#fbbf24,#d97706)",
      };

    case "red":
      return {
        text: "#fecaca",
        background:
          "rgba(127,29,29,.30)",
        border: "#991b1b",
        solid:
          "linear-gradient(180deg,#f87171,#dc2626)",
      };

    case "violet":
      return {
        text: "#ddd6fe",
        background:
          "rgba(91,33,182,.28)",
        border: "#7c3aed",
        solid:
          "linear-gradient(180deg,#a78bfa,#7c3aed)",
      };

    default:
      return {
        text: "#bfdbfe",
        background:
          "rgba(30,64,175,.28)",
        border: "#2563eb",
        solid:
          "linear-gradient(180deg,#60a5fa,#2563eb)",
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
  padding: "30px",
  background:
    "linear-gradient(135deg,#111c33 0%,#0f172a 55%,#172554 100%)",
  border:
    "1px solid #263655",
  borderRadius: "18px",
};

const heroGlowStyle = {
  position:
    "absolute" as const,
  width: "420px",
  height: "420px",
  right: "-150px",
  top: "-230px",
  background:
    "radial-gradient(circle,rgba(59,130,246,.32),transparent 68%)",
};

const heroContentStyle = {
  position:
    "relative" as const,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "24px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 8px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: ".12em",
};

const heroTitleStyle = {
  margin: "0 0 9px",
  fontSize: "31px",
};

const heroTextStyle = {
  margin: 0,
  color: "#94a3b8",
};

const heroControlsStyle = {
  minWidth: "320px",
  display: "grid",
  gap: "10px",
};

const controlLabelStyle = {
  color: "#64748b",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: ".1em",
};

const batchSelectStyle = {
  width: "100%",
  padding: "10px 12px",
  color: "white",
  backgroundColor: "#0f172a",
  border:
    "1px solid #475569",
  borderRadius: "9px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 800,
};

const batchWindowSummaryStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  gap: "8px",
};

const refreshButtonStyle = {
  padding: "10px",
  color: "white",
  backgroundColor: "#1e293b",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const kpiGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",
  gap: "14px",
};

const kpiCardStyle = {
  display: "grid",
  gap: "12px",
  padding: "19px",
  background:
    "linear-gradient(145deg,#172033,#111827)",
  border:
    "1px solid #29364c",
  borderRadius: "14px",
};

const kpiTopStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const kpiIconStyle = {
  width: "32px",
  height: "32px",
  display: "grid",
  placeItems: "center",
  border: "1px solid",
  borderRadius: "9px",
  fontWeight: 900,
};

const kpiLabelStyle = {
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: 700,
};

const kpiValueStyle = {
  fontSize: "29px",
};

const kpiDetailStyle = {
  color: "#64748b",
  fontSize: "10px",
};

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0,1.65fr) minmax(300px,.75fr)",
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
  padding: "22px",
  background:
    "linear-gradient(145deg,#172033,#111827)",
  border:
    "1px solid #29364c",
  borderRadius: "15px",
};

const sidePanelStyle = {
  ...panelStyle,
  padding: "20px",
};

const panelHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "15px",
  marginBottom: "18px",
};

const panelEyebrowStyle = {
  margin: "0 0 5px",
  color: "#60a5fa",
  fontSize: "8px",
  fontWeight: 900,
  letterSpacing: ".11em",
};

const panelTitleStyle = {
  margin: 0,
  fontSize: "19px",
};

const sideTitleStyle = {
  margin: 0,
  fontSize: "16px",
};

const liveBadgeStyle = {
  padding: "5px 8px",
  color: "#86efac",
  backgroundColor:
    "rgba(20,83,45,.28)",
  border:
    "1px solid #166534",
  borderRadius: "999px",
  fontSize: "8px",
  fontWeight: 900,
};

const batchSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5,minmax(0,1fr))",
  gap: "10px",
};

const summaryMetricStyle = {
  display: "grid",
  gap: "6px",
  padding: "13px",
  backgroundColor: "#0f172a",
  border:
    "1px solid #263248",
  borderRadius: "10px",
};

const summaryLabelStyle = {
  color: "#64748b",
  fontSize: "9px",
};

const summaryValueStyle = {
  fontSize: "21px",
};

const progressTrackStyle = {
  height: "8px",
  overflow: "hidden",
  marginTop: "16px",
  backgroundColor: "#263248",
  borderRadius: "999px",
};

const progressFillStyle = {
  height: "100%",
  background:
    "linear-gradient(90deg,#2563eb,#22c55e)",
};

const progressCaptionStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  marginTop: "8px",
  color: "#94a3b8",
  fontSize: "10px",
};

const stageLayoutStyle = {
  display: "grid",
  gridTemplateColumns:
    "220px minmax(0,1fr)",
  alignItems: "center",
  gap: "28px",
};

const donutStyle = {
  width: "190px",
  height: "190px",
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
};

const donutHoleStyle = {
  width: "118px",
  height: "118px",
  display: "grid",
  placeItems: "center",
  alignContent: "center",
  gap: "3px",
  backgroundColor: "#111827",
  border:
    "1px solid #334155",
  borderRadius: "50%",
};

const donutValueStyle = {
  fontSize: "29px",
};

const donutLabelStyle = {
  color: "#64748b",
  fontSize: "9px",
};

const stageLegendStyle = {
  display: "grid",
  gap: "10px",
};

const stageLegendRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "12px 1fr auto",
  alignItems: "center",
  gap: "10px",
  paddingBottom: "9px",
  borderBottom:
    "1px solid #263248",
};

const legendDotStyle = {
  width: "8px",
  height: "8px",
  borderRadius: "999px",
};

const stageLegendLabelStyle = {
  color: "#94a3b8",
  fontSize: "11px",
};

const weeklyChartStyle = {
  height: "250px",
  display: "grid",
  gridTemplateColumns:
    "repeat(6,minmax(70px,1fr))",
  alignItems: "end",
  gap: "15px",
  padding: "18px",
  backgroundColor: "#0f172a",
  border:
    "1px solid #263248",
  borderRadius: "12px",
};

const weeklyGroupStyle = {
  height: "210px",
  display: "grid",
  gridTemplateRows:
    "1fr 20px",
  gap: "8px",
};

const weeklyBarsStyle = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: "5px",
};

const trendBarStyle = {
  width: "18px",
  minHeight: "5px",
  borderRadius: "5px 5px 0 0",
};

const weeklyLabelStyle = {
  color: "#64748b",
  textAlign: "center" as const,
  fontSize: "8px",
};

const metricToggleStyle = {
  display: "flex",
  padding: "3px",
  backgroundColor: "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: "8px",
};

const metricToggleButtonStyle = {
  padding: "7px 10px",
  color: "#94a3b8",
  backgroundColor:
    "transparent",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "9px",
  fontWeight: 800,
};

const activeMetricToggleStyle = {
  color: "white",
  backgroundColor: "#2563eb",
};

const contributionChartStyle = {
  display: "grid",
  gap: "10px",
};

const contributionRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "180px minmax(0,1fr) 80px",
  alignItems: "center",
  gap: "12px",
};

const contributionNameStyle = {
  display: "grid",
  gap: "3px",
  fontSize: "10px",
};

const contributionTrackStyle = {
  height: "11px",
  overflow: "hidden",
  backgroundColor: "#263248",
  borderRadius: "999px",
};

const contributionFillStyle = {
  height: "100%",
  background:
    "linear-gradient(90deg,#2563eb,#60a5fa)",
  borderRadius: "999px",
};

const contributionValueStyle = {
  textAlign: "right" as const,
  fontSize: "10px",
};

const tableWrapStyle = {
  overflowX: "auto" as const,
};

const tableStyle = {
  width: "100%",
  borderCollapse:
    "collapse" as const,
  fontSize: "10px",
};

const thStyle = {
  padding: "10px",
  color: "#64748b",
  textAlign: "left" as const,
  borderBottom:
    "1px solid #334155",
};

const thNumberStyle = {
  ...thStyle,
  textAlign: "right" as const,
};

const tableRowStyle = {
  borderBottom:
    "1px solid #263248",
};

const tdStyle = {
  padding: "11px 10px",
};

const tdMutedStyle = {
  ...tdStyle,
  color: "#94a3b8",
};

const tdNumberStyle = {
  ...tdStyle,
  textAlign: "right" as const,
};

const countBadgeStyle = {
  padding: "5px 8px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30,64,175,.24)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "8px",
  fontWeight: 900,
};

const exemptBadgeStyle = {
  display: "inline-block",
  padding: "4px 7px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30,64,175,.24)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "8px",
  fontWeight: 900,
};

const warningBadgeStyle = {
  ...exemptBadgeStyle,
  color: "#fde68a",
  backgroundColor:
    "rgba(120,53,15,.28)",
  border:
    "1px solid #a16207",
};

const goodBadgeStyle = {
  ...exemptBadgeStyle,
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20,83,45,.28)",
  border:
    "1px solid #166534",
};

const alertListStyle = {
  display: "grid",
  gap: "9px",
};

const alertCardStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "13px",
  border: "1px solid",
  borderRadius: "10px",
};

const alertDetailStyle = {
  margin: "4px 0 0",
  color: "#94a3b8",
  fontSize: "8px",
  lineHeight: 1.4,
};

const alertValueStyle = {
  fontSize: "22px",
};

const outcomeTotalsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  gap: "10px",
  marginBottom: "12px",
};

const outcomeLabelStyle = {
  display: "block",
  color: "#64748b",
  fontSize: "8px",
  marginBottom: "5px",
};

const outcomeGoodValueStyle = {
  color: "#86efac",
  fontSize: "24px",
};

const outcomeBadValueStyle = {
  color: "#fca5a5",
  fontSize: "24px",
};

const outcomeTrackStyle = {
  display: "flex",
  height: "9px",
  overflow: "hidden",
  backgroundColor: "#263248",
  borderRadius: "999px",
};

const outcomeGoodFillStyle = {
  height: "100%",
  backgroundColor: "#22c55e",
};

const outcomeBadFillStyle = {
  height: "100%",
  backgroundColor: "#ef4444",
};

const outcomeCaptionStyle = {
  margin: "9px 0 0",
  color: "#64748b",
  fontSize: "9px",
};

const spotlightStyle = {
  display: "grid",
  justifyItems: "center",
  textAlign: "center" as const,
};

const spotlightAvatarStyle = {
  width: "58px",
  height: "58px",
  display: "grid",
  placeItems: "center",
  color: "#dbeafe",
  background:
    "linear-gradient(135deg,#2563eb,#1d4ed8)",
  border:
    "2px solid #60a5fa",
  borderRadius: "16px",
  fontWeight: 900,
};

const spotlightNameStyle = {
  margin: "12px 0 4px",
};

const spotlightRoleStyle = {
  margin: "0 0 14px",
  color: "#64748b",
  fontSize: "9px",
};

const spotlightGridStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  gap: "9px",
};

const spotlightMetricStyle = {
  display: "grid",
  gap: "5px",
  padding: "11px",
  color: "#64748b",
  backgroundColor: "#0f172a",
  border:
    "1px solid #263248",
  borderRadius: "9px",
  fontSize: "8px",
};

const availabilityRowStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "10px 0",
  borderBottom:
    "1px solid #263248",
  fontSize: "9px",
};

const availabilityDetailStyle = {
  margin: "3px 0 0",
  color: "#64748b",
  fontSize: "8px",
};

const availableBadgeStyle = {
  padding: "4px 7px",
  color: "#86efac",
  backgroundColor:
    "rgba(20,83,45,.28)",
  border:
    "1px solid #166534",
  borderRadius: "999px",
  fontSize: "7px",
  fontWeight: 900,
};

const unavailableBadgeStyle = {
  ...availableBadgeStyle,
  color: "#fde68a",
  backgroundColor:
    "rgba(120,53,15,.28)",
  border:
    "1px solid #a16207",
};

const emptyStateStyle = {
  padding: "16px",
  color: "#64748b",
  backgroundColor: "#0f172a",
  border:
    "1px dashed #334155",
  borderRadius: "10px",
  fontSize: "9px",
};

const errorBoxStyle = {
  padding: "14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127,29,29,.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "10px",
};

const skeletonGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3,minmax(0,1fr))",
  gap: "14px",
};

const skeletonCardStyle = {
  minHeight: "160px",
  background:
    "linear-gradient(90deg,#172033,#1e293b,#172033)",
  backgroundSize:
    "200% 100%",
  border:
    "1px solid #29364c",
  borderRadius: "14px",
};