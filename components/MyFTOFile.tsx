"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import FTOProbationPanel from "./FTOProbationPanel";

type Props = {
  user: any;
  profileId?: string;
};

type FTOFile = {
  id: string;
  profile_id: string;
  division: string | null;
  induction_date: string | null;
  final_evaluation_date: string | null;
  probationary_passed_date: string | null;
  total_instruction_minutes: number;
  original_bbcode: string | null;
  created_at: string;
  updated_at: string;
  probation_status:
    | "probationary"
    | "qualified"
    | "archived";
};

type FTOLogEntry = {
  id: string;
  fto_file_id: string;
  entry_date: string;
  duration_minutes: number | null;
  subject_name: string;
  entry_type:
    | "training"
    | "probationary_fto_evaluation"
    | "weekly_ftm_meeting";
  source_url: string | null;
  source_month: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  name: string | null;
  rank: string | null;
  badge_number: string | null;
  work_number: string | null;
  division: string | null;
};

const managementRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

export default function MyFTOFile({
  user,
  profileId,
}: Props) {
  const [
    profile,
    setProfile,
  ] = useState<Profile | null>(
    null
  );

  const [
    ftoFile,
    setFtoFile,
  ] = useState<FTOFile | null>(
    null
  );

  const [
    entries,
    setEntries,
  ] = useState<FTOLogEntry[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    openMonths,
    setOpenMonths,
  ] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    void loadFTOFile();
  }, [user, profileId]);

  async function loadFTOFile() {
    setLoading(true);
    setError("");

    try {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          rank,
          badge_number,
          work_number,
          division
        `)
        .eq(
          "id",
          profileId ?? user.id
        )
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(
        profileData
      );

      const {
        data: fileData,
        error: fileError,
      } = await supabase
        .from("fto_files")
        .select("*")
        .eq(
          "profile_id",
          profileId ?? user.id
        )
        .maybeSingle();

      if (fileError) {
        throw fileError;
      }

      setFtoFile(
        fileData
      );

      if (!fileData) {
        setEntries([]);
        return;
      }

      const {
        data: entryData,
        error: entryError,
      } = await supabase
        .from(
          "fto_log_entries"
        )
        .select("*")
        .eq(
          "fto_file_id",
          fileData.id
        )
        .order(
          "entry_date",
          {
            ascending: false,
          }
        );

      if (entryError) {
        throw entryError;
      }

      setEntries(
        entryData ?? []
      );
    } catch (loadError) {
      console.error(
        "LOAD FTO FILE ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Your FTO file could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  const entriesByMonth =
    useMemo(() => {
      return entries.reduce(
        (
          grouped,
          entry
        ) => {
          const month =
            entry.source_month ||
            formatMonth(
              entry.entry_date
            );

          if (!grouped[month]) {
            grouped[month] = [];
          }

          grouped[month].push(
            entry
          );

          return grouped;
        },
        {} as Record<
          string,
          FTOLogEntry[]
        >
      );
    }, [entries]);

  const timedEntries =
    entries.filter(
      (entry) =>
        entry.duration_minutes !==
        null
    );

  const totalTimedMinutes =
    timedEntries.reduce(
      (
        total,
        entry
      ) =>
        total +
        (
          entry.duration_minutes ??
          0
        ),
      0
    );

  const evaluationCount =
    entries.filter(
      (entry) =>
        entry.entry_type ===
        "probationary_fto_evaluation"
    ).length;

  const meetingCount =
    entries.filter(
      (entry) =>
        entry.entry_type ===
        "weekly_ftm_meeting"
    ).length;

  const trainingCount =
    entries.filter(
      (entry) =>
        entry.entry_type ===
        "training"
    ).length;

  const averageMinutes =
    timedEntries.length > 0
      ? Math.round(
          totalTimedMinutes /
          timedEntries.length
        )
      : 0;

  const mostTrainedOfficer =
    getMostFrequentSubject(
      entries.filter(
        (entry) =>
          entry.entry_type ===
          "training"
      )
    );

  function toggleMonth(
    month: string
  ) {
    setOpenMonths(
      (current) => ({
        ...current,
        [month]:
          !current[month],
      })
    );
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        Loading FTO file...
      </div>
    );
  }

  if (error) {
    return (
      <div style={errorStyle}>
        {error}
      </div>
    );
  }

  if (!ftoFile) {
    return (
      <div style={cardStyle}>
        <h2>
          {profileId
            ? "FTO File"
            : "My FTO File"}
        </h2>

        <p style={mutedStyle}>
          No imported FTO file was
          found for this account.
        </p>

        <button
          type="button"
          onClick={() =>
            void loadFTOFile()
          }
          style={secondaryButtonStyle}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={headerCardStyle}>
        <div>
          <div style={badgeStyle}>
            FIELD TRAINING OFFICER
          </div>

          <h1 style={titleStyle}>
            {profile?.name ??
              user.name ??
              "Unknown Officer"}
          </h1>

          <p style={mutedStyle}>
            {profile?.rank ??
              "Unknown Rank"}
            {" • "}
            Badge{" "}
            {profile?.badge_number ??
              "N/A"}
            {" • "}
            {profile?.division ??
              ftoFile.division ??
              "Mission Row Division"}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadFTOFile()
          }
          style={secondaryButtonStyle}
        >
          Refresh File
        </button>
      </div>

      <FTOProbationPanel
        user={user}
        ftoFileId={ftoFile.id}
        ftoProfileId={ftoFile.profile_id}
        ftoName={
          profile?.name ??
          user.name ??
          "Unknown Officer"
        }
        ftoSerial={
          profile?.badge_number ??
          "N/A"
        }
        readOnly={
          !managementRoles.includes(
            user?.role ?? ""
          )
        }
        onChanged={() =>
          void loadFTOFile()
        }
      />

      <div style={statsGridStyle}>
        <StatCard
          label="Instruction Time"
          value={formatMinutes(
            ftoFile.total_instruction_minutes
          )}
        />

        <StatCard
          label="Training Entries"
          value={String(
            trainingCount
          )}
        />

        <StatCard
          label="FTO Evaluations"
          value={String(
            evaluationCount
          )}
        />

        <StatCard
          label="FTM Meetings"
          value={String(
            meetingCount
          )}
        />

        <StatCard
          label="Average Timed Entry"
          value={formatMinutes(
            averageMinutes
          )}
        />

        <StatCard
          label="Most Trained Officer"
          value={
            mostTrainedOfficer ||
            "N/A"
          }
        />
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>
          FTO Milestones
        </h2>

        <div style={milestoneGridStyle}>
          <Detail
            label="Induction"
            value={formatDate(
              ftoFile.induction_date
            )}
          />

          <Detail
            label="Final Evaluation"
            value={formatDate(
              ftoFile.final_evaluation_date
            )}
          />

          <Detail
            label="Probationary Passed"
            value={formatDate(
              ftoFile.probationary_passed_date
            )}
          />

          <Detail
            label="Imported Timed Total"
            value={formatMinutes(
              totalTimedMinutes
            )}
          />
        </div>
      </div>

      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>
              Monthly Logs
            </h2>

            <p style={mutedStyle}>
              Imported training,
              evaluation and meeting
              history.
            </p>
          </div>

          <span style={countBadgeStyle}>
            {entries.length} entries
          </span>
        </div>

        {Object.keys(
          entriesByMonth
        ).length === 0 ? (
          <p style={mutedStyle}>
            No historical entries were
            imported.
          </p>
        ) : (
          <div style={monthListStyle}>
            {Object.entries(
              entriesByMonth
            ).map(
              ([
                month,
                monthEntries,
              ]) => {
                const monthTotal =
                  monthEntries.reduce(
                    (
                      total,
                      entry
                    ) =>
                      total +
                      (
                        entry.duration_minutes ??
                        0
                      ),
                    0
                  );

                return (
                  <div
                    key={month}
                    style={
                      monthSectionStyle
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleMonth(
                          month
                        )
                      }
                      style={
                        monthButtonStyle
                      }
                    >
                      <span>
                        {openMonths[month]
                          ? "▼"
                          : "▶"}
                        {" "}
                        {month}
                      </span>

                      <span
                        style={
                          monthTotalStyle
                        }
                      >
                        {formatMinutes(
                          monthTotal
                        )}
                      </span>
                    </button>

                    {openMonths[month] && (
                      <div
                        style={
                          entryListStyle
                        }
                      >
                        {monthEntries.map(
                          (entry) => (
                            <div
                              key={
                                entry.id
                              }
                              style={
                                entryStyle
                              }
                            >
                              <div>
                                <div
                                  style={
                                    entryNameRowStyle
                                  }
                                >
                                  <strong>
                                    {
                                      entry.subject_name
                                    }
                                  </strong>

                                  <EntryTypeBadge
                                    type={
                                      entry.entry_type
                                    }
                                  />
                                </div>

                                <div
                                  style={
                                    entryMetaStyle
                                  }
                                >
                                  {formatDate(
                                    entry.entry_date
                                  )}
                                  {" • "}
                                  {entry.duration_minutes ===
                                  null
                                    ? "N/A"
                                    : formatMinutes(
                                        entry.duration_minutes
                                      )}
                                </div>
                              </div>

                              {entry.source_url && (
                                <a
                                  href={
                                    entry.source_url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  style={
                                    sourceLinkStyle
                                  }
                                >
                                  Open Source
                                </a>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={statCardStyle}>
      <p style={statLabelStyle}>
        {label}
      </p>

      <p style={statValueStyle}>
        {value}
      </p>
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
    <div style={detailStyle}>
      <p style={detailLabelStyle}>
        {label}
      </p>

      <p style={detailValueStyle}>
        {value}
      </p>
    </div>
  );
}

function EntryTypeBadge({
  type,
}: {
  type:
    | "training"
    | "probationary_fto_evaluation"
    | "weekly_ftm_meeting";
}) {
  const labels = {
    training: "Training",
    probationary_fto_evaluation:
      "FTO Evaluation",
    weekly_ftm_meeting:
      "FTM Meeting",
  };

  return (
    <span style={entryBadgeStyle}>
      {labels[type]}
    </span>
  );
}

function getMostFrequentSubject(
  entries: FTOLogEntry[]
) {
  if (entries.length === 0) {
    return "";
  }

  const counts =
    entries.reduce(
      (
        record,
        entry
      ) => {
        record[
          entry.subject_name
        ] =
          (
            record[
              entry.subject_name
            ] ?? 0
          ) + 1;

        return record;
      },
      {} as Record<
        string,
        number
      >
    );

  return Object.entries(
    counts
  ).sort(
    (
      first,
      second
    ) =>
      second[1] -
      first[1]
  )[0]?.[0] ?? "";
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

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Not Recorded";
  }

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

function formatMonth(
  value: string
) {
  return new Date(
    `${value}T00:00:00Z`
  )
    .toLocaleDateString(
      "en-GB",
      {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }
    )
    .toUpperCase();
}

const headerCardStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "20px",
  padding: "28px",
  marginBottom: "20px",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "12px",
  flexWrap: "wrap" as const,
};

const badgeStyle = {
  display: "inline-block",
  padding: "6px 10px",
  marginBottom: "12px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.18)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const titleStyle = {
  margin:
    "0 0 8px",
};

const mutedStyle = {
  color: "#94a3b8",
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const statCardStyle = {
  padding: "20px",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "10px",
};

const statLabelStyle = {
  margin:
    "0 0 8px",
  color: "#94a3b8",
  fontSize: "13px",
};

const statValueStyle = {
  margin: 0,
  color: "white",
  fontSize: "24px",
  fontWeight: 900,
};

const cardStyle = {
  padding: "24px",
  marginBottom: "20px",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "12px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "18px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const sectionTitleStyle = {
  margin:
    "0 0 6px",
};

const milestoneGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
};

const detailStyle = {
  padding: "16px",
  backgroundColor: "#0f172a",
  borderRadius: "8px",
};

const detailLabelStyle = {
  margin:
    "0 0 6px",
  color: "#94a3b8",
  fontSize: "13px",
};

const detailValueStyle = {
  margin: 0,
  fontWeight: 800,
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
  fontWeight: 800,
};

const monthListStyle = {
  display: "grid",
  gap: "12px",
};

const monthSectionStyle = {
  overflow: "hidden",
  backgroundColor: "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: "9px",
};

const monthButtonStyle = {
  width: "100%",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "16px",
  color: "white",
  backgroundColor: "#111827",
  border: "none",
  cursor: "pointer",
  textAlign: "left" as const,
  fontWeight: 800,
};

const monthTotalStyle = {
  color: "#93c5fd",
};

const entryListStyle = {
  display: "grid",
};

const entryStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "15px 16px",
  borderTop:
    "1px solid #334155",
};

const entryNameRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const entryMetaStyle = {
  marginTop: "5px",
  color: "#94a3b8",
  fontSize: "13px",
};

const entryBadgeStyle = {
  padding: "3px 7px",
  color: "#cbd5e1",
  backgroundColor: "#334155",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
};

const sourceLinkStyle = {
  color: "#60a5fa",
  textDecoration: "none",
  whiteSpace: "nowrap" as const,
  fontWeight: 700,
};

const secondaryButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const errorStyle = {
  padding: "14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
};