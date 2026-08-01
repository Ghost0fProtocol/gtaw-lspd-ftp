"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import DORDraftAlerts from "./dashboard/DORDraftAlerts";

type DashboardProps = {
  user: any;
  trainees: any[];
  openDOR: (
    traineeId: string
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

type DashboardStats = {
  notebookProgress: number;
  completedNotebookItems: number;
  totalNotebookItems: number;
  dorCount: number;
  instructionMinutes: number;
  trainingEntries: number;
  evaluationEntries: number;
  meetingEntries: number;
  pendingRoleRequests: number;
};

const initialStats: DashboardStats = {
  notebookProgress: 0,
  completedNotebookItems: 0,
  totalNotebookItems: 0,
  dorCount: 0,
  instructionMinutes: 0,
  trainingEntries: 0,
  evaluationEntries: 0,
  meetingEntries: 0,
  pendingRoleRequests: 0,
};

export default function Dashboard({
  user,
  trainees,
  openDOR,
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

  useEffect(() => {
    void loadDashboard();
  }, [user]);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const nextStats = {
        ...initialStats,
      };

      if (
        user.role ===
        "Probationary Officer"
      ) {
        await loadP1Stats(
          user.id,
          nextStats
        );
      }

      if (
        [
          "Field Training Officer",
          "Field Training Manager",
          "Field Training Supervisor",
          "STAFF",
          "LSPD STAFF",
        ].includes(user.role)
      ) {
        await loadFTOStats(
          user.id,
          nextStats
        );
      }

      if (
        [
          "Field Training Manager",
          "Field Training Supervisor",
          "STAFF",
          "LSPD STAFF",
        ].includes(user.role)
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

      await loadDraftAlerts();

      setStats(nextStats);
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

  async function loadDraftAlerts() {
    const managementRoles = [
      "Field Training Manager",
      "Field Training Supervisor",
      "STAFF",
      "LSPD STAFF",
    ];

    const canSeeAllDrafts =
      managementRoles.includes(
        user.role
      );

    const isFTO =
      user.role ===
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

    const alerts =
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
      );

    setDraftAlerts(
      alerts
    );
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
      .select("id")
      .eq(
        "profile_id",
        profileId
      )
      .maybeSingle();

    if (traineeError) {
      throw traineeError;
    }

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
        "trainee_id",
        trainee.id
      );

    if (dorError) {
      throw dorError;
    }

    nextStats.dorCount =
      count ?? 0;
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

    if (!ftoFile) {
      return;
    }

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

  const activeTrainees =
    trainees.filter(
      (trainee) =>
        trainee.status ===
        "Active"
    );

  const reviewTrainees =
    trainees.filter(
      (trainee) =>
        trainee.status ===
        "Review"
    );

  const unassignedTrainees =
    trainees.filter(
      (trainee) =>
        !trainee.assigned_ftm &&
        !trainee.ftm
    );

  const dashboardContent =
    useMemo(
      () =>
        getDashboardContent({
          role:
            user.role,
          stats,
          activeTrainees:
            activeTrainees.length,
          reviewTrainees:
            reviewTrainees.length,
          unassignedTrainees:
            unassignedTrainees.length,
          totalTrainees:
            trainees.length,
        }),
      [
        user.role,
        stats,
        activeTrainees.length,
        reviewTrainees.length,
        unassignedTrainees.length,
        trainees.length,
      ]
    );

  return (
    <div>
      <div style={welcomeCardStyle}>
        <div>
          <p style={eyebrowStyle}>
            {getRoleLabel(
              user.role
            )}
          </p>

          <h2 style={welcomeTitleStyle}>
            Welcome back,{" "}
            {user.name}
          </h2>

          <p style={welcomeTextStyle}>
            {dashboardContent.description}
          </p>
        </div>

        <div style={identityStyle}>
          <span>
            {user.rank ??
              "Unknown Rank"}
          </span>

          <span>
            {user.division ??
              "Mission Row Division"}
          </span>
        </div>
      </div>

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
        <div style={cardStyle}>
          Loading dashboard...
        </div>
      ) : (
        <>
          <div style={statsGridStyle}>
            {dashboardContent.cards.map(
              (card) => (
                <StatCard
                  key={
                    card.label
                  }
                  label={
                    card.label
                  }
                  value={
                    card.value
                  }
                  detail={
                    card.detail
                  }
                />
              )
            )}
          </div>

          <div style={contentGridStyle}>
            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>
                {dashboardContent.activityTitle}
              </h2>

              {trainees.length === 0 ? (
                <p style={mutedStyle}>
                  No trainee activity yet.
                </p>
              ) : (
                <div style={activityListStyle}>
                  {trainees
                    .slice(0, 6)
                    .map(
                      (trainee) => (
                        <div
                          key={
                            trainee.id
                          }
                          style={
                            activityItemStyle
                          }
                        >
                          <div>
                            <strong>
                              {trainee.profile
                                ?.name ??
                                "Unknown Officer"}
                            </strong>

                            <p style={activityMetaStyle}>
                              Status:{" "}
                              {trainee.status ??
                                "Unknown"}
                            </p>
                          </div>

                          <span style={assignmentStyle}>
                            {trainee.ftm
                              ?.name ??
                              trainee.assigned_ftm ??
                              "Unassigned"}
                          </span>
                        </div>
                      )
                    )}
                </div>
              )}
            </section>

            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>
                Quick Overview
              </h2>

              <div style={overviewListStyle}>
                {dashboardContent.overview.map(
                  (item) => (
                    <div
                      key={
                        item.label
                      }
                      style={overviewItemStyle}
                    >
                      <span style={mutedStyle}>
                        {item.label}
                      </span>

                      <strong>
                        {item.value}
                      </strong>
                    </div>
                  )
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function getDashboardContent({
  role,
  stats,
  activeTrainees,
  reviewTrainees,
  unassignedTrainees,
  totalTrainees,
}: {
  role: string;
  stats: DashboardStats;
  activeTrainees: number;
  reviewTrainees: number;
  unassignedTrainees: number;
  totalTrainees: number;
}) {
  if (
    role ===
    "Probationary Officer"
  ) {
    return {
      description:
        "Track your notebook progress and training record.",
      activityTitle:
        "FTP Programme Activity",
      cards: [
        {
          label:
            "Notebook Progress",
          value:
            `${stats.notebookProgress}%`,
          detail:
            `${stats.completedNotebookItems} of ${stats.totalNotebookItems} items completed`,
        },
        {
          label:
            "Completed Items",
          value:
            String(
              stats.completedNotebookItems
            ),
          detail:
            "Structured learning sign-offs",
        },
        {
          label:
            "DORs Received",
          value:
            String(
              stats.dorCount
            ),
          detail:
            "Daily Observation Reports",
        },
      ],
      overview: [
        {
          label:
            "Current Status",
          value: "Active P1",
        },
        {
          label:
            "Division",
          value:
            "Mission Row Division",
        },
        {
          label:
            "Remaining Items",
          value:
            String(
              Math.max(
                0,
                stats.totalNotebookItems -
                  stats.completedNotebookItems
              )
            ),
        },
      ],
    };
  }

  if (
    role ===
    "Field Training Officer"
  ) {
    return {
      description:
        "Review your instruction history and current FTP workload.",
      activityTitle:
        "Current P1 Records",
      cards: [
        {
          label:
            "Instruction Time",
          value:
            formatMinutes(
              stats.instructionMinutes
            ),
          detail:
            "Imported and recorded training time",
        },
        {
          label:
            "Training Entries",
          value:
            String(
              stats.trainingEntries
            ),
          detail:
            "Historical patrol and training logs",
        },
        {
          label:
            "FTO Evaluations",
          value:
            String(
              stats.evaluationEntries
            ),
          detail:
            "Probationary FTO evaluations",
        },
      ],
      overview: [
        {
          label:
            "Active P1s",
          value:
            String(
              activeTrainees
            ),
        },
        {
          label:
            "FTM Meetings",
          value:
            String(
              stats.meetingEntries
            ),
        },
        {
          label:
            "P1s Pending Review",
          value:
            String(
              reviewTrainees
            ),
        },
      ],
    };
  }

  if (
    role ===
    "Field Training Manager"
  ) {
    return {
      description:
        "Manage active P1s, FTO requests and programme workload.",
      activityTitle:
        "Managed P1 Activity",
      cards: [
        {
          label:
            "Active P1s",
          value:
            String(
              activeTrainees
            ),
          detail:
            "Currently progressing through FTP",
        },
        {
          label:
            "Pending Reviews",
          value:
            String(
              reviewTrainees
            ),
          detail:
            "P1 records awaiting attention",
        },
        {
          label:
            "FTO Requests",
          value:
            String(
              stats.pendingRoleRequests
            ),
          detail:
            "Pending role approvals",
        },
      ],
      overview: [
        {
          label:
            "Total P1 Records",
          value:
            String(
              totalTrainees
            ),
        },
        {
          label:
            "Unassigned P1s",
          value:
            String(
              unassignedTrainees
            ),
        },
        {
          label:
            "Personal Instruction Time",
          value:
            formatMinutes(
              stats.instructionMinutes
            ),
        },
      ],
    };
  }

  return {
    description:
      "Programme-wide oversight for field training operations.",
    activityTitle:
      "Programme Activity",
    cards: [
      {
        label:
          "Active P1s",
        value:
          String(
            activeTrainees
          ),
        detail:
          "Active programme participants",
      },
      {
        label:
          "Pending Reviews",
        value:
          String(
            reviewTrainees
          ),
        detail:
          "Records requiring review",
      },
      {
        label:
          "FTO Requests",
        value:
          String(
            stats.pendingRoleRequests
          ),
        detail:
          "Outstanding role requests",
      },
    ],
    overview: [
      {
        label:
          "Total P1 Records",
        value:
          String(
            totalTrainees
          ),
      },
      {
        label:
          "Unassigned P1s",
        value:
          String(
            unassignedTrainees
          ),
      },
      {
        label:
          "Your Instruction Time",
        value:
          formatMinutes(
            stats.instructionMinutes
          ),
      },
    ],
  };
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div style={statCardStyle}>
      <p style={statLabelStyle}>
        {label}
      </p>

      <p style={statValueStyle}>
        {value}
      </p>

      <p style={statDetailStyle}>
        {detail}
      </p>
    </div>
  );
}

function getRoleLabel(
  role: string
) {
  switch (role) {
    case "Probationary Officer":
      return "P1 DASHBOARD";

    case "Field Training Officer":
      return "FTO DASHBOARD";

    case "Field Training Manager":
      return "FTM DASHBOARD";

    case "Field Training Supervisor":
      return "FTS DASHBOARD";

    default:
      return "STAFF DASHBOARD";
  }
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

const welcomeCardStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "26px",
  marginBottom: "20px",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "12px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 8px",
  color: "#60a5fa",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const welcomeTitleStyle = {
  margin: "0 0 8px",
};

const welcomeTextStyle = {
  margin: 0,
  color: "#94a3b8",
};

const identityStyle = {
  display: "grid",
  gap: "6px",
  padding: "14px 16px",
  backgroundColor: "#0f172a",
  borderRadius: "9px",
  color: "#cbd5e1",
  textAlign: "right" as const,
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "18px",
  marginBottom: "20px",
};

const statCardStyle = {
  padding: "22px",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "12px",
};

const statLabelStyle = {
  margin: "0 0 10px",
  color: "#94a3b8",
  fontSize: "14px",
};

const statValueStyle = {
  margin: "0 0 8px",
  fontSize: "32px",
  fontWeight: 900,
};

const statDetailStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.5,
};

const contentGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 2fr) minmax(260px, 1fr)",
  gap: "20px",
};

const cardStyle = {
  padding: "24px",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "12px",
};

const sectionTitleStyle = {
  margin: "0 0 18px",
  fontSize: "20px",
};

const mutedStyle = {
  color: "#94a3b8",
};

const activityListStyle = {
  display: "grid",
  gap: "10px",
};

const activityItemStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "14px",
  padding: "14px",
  backgroundColor: "#0f172a",
  borderRadius: "8px",
};

const activityMetaStyle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "13px",
};

const assignmentStyle = {
  color: "#93c5fd",
  fontSize: "13px",
  fontWeight: 700,
  textAlign: "right" as const,
};

const overviewListStyle = {
  display: "grid",
  gap: "12px",
};

const overviewItemStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: "12px",
  paddingBottom: "12px",
  borderBottom:
    "1px solid #334155",
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