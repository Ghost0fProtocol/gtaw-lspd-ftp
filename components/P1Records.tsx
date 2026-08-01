"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Props = {
  openNotebook: (
    id: string
  ) => void;

  openDOR: (
    id: string
  ) => void;
};

type DraftRecord = {
  id: string;
  trainee_id: string;
  patrol_number: number | null;
  started_by: string | null;
  last_saved_at: string | null;
  created_at: string | null;
  starter_name?: string | null;
};

export default function P1Records({
  openNotebook,
  openDOR,
}: Props) {
  const [
    trainees,
    setTrainees,
  ] = useState<any[]>([]);

  const [
    drafts,
    setDrafts,
  ] = useState<
    Record<string, DraftRecord>
  >({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    setError("");

    try {
      const {
        data: traineeData,
        error: traineeError,
      } = await supabase
        .from("trainees")
        .select("*")
        .eq(
          "status",
          "Active"
        );

      if (traineeError) {
        throw traineeError;
      }

      const traineeRows =
        traineeData ?? [];

      const profileIds =
        traineeRows.map(
          (trainee: any) =>
            trainee.profile_id
        );

      let profiles: any[] =
        [];

      if (
        profileIds.length > 0
      ) {
        const {
          data,
          error:
            profileError,
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
          .in(
            "id",
            profileIds
          );

        if (profileError) {
          throw profileError;
        }

        profiles =
          data ?? [];
      }

      const combined =
        traineeRows.map(
          (trainee: any) => ({
            ...trainee,
            profiles:
              profiles.find(
                (profile: any) =>
                  profile.id ===
                  trainee.profile_id
              ),
          })
        );

      setTrainees(combined);

      if (
        traineeRows.length > 0
      ) {
        await loadDrafts(
          traineeRows.map(
            (trainee: any) =>
              trainee.id
          )
        );
      } else {
        setDrafts({});
      }
    } catch (loadError) {
      console.error(
        "P1 RECORDS LOAD ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "P1 records could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDrafts(
    traineeIds: string[]
  ) {
    const {
      data: draftData,
      error: draftError,
    } = await supabase
      .from("dors")
      .select(`
        id,
        trainee_id,
        patrol_number,
        started_by,
        last_saved_at,
        created_at
      `)
      .in(
        "trainee_id",
        traineeIds
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
      );

    if (draftError) {
      throw draftError;
    }

    const rows =
      draftData ?? [];

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

    let starterProfiles: any[] =
      [];

    if (
      starterIds.length > 0
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(
          "id, name"
        )
        .in(
          "id",
          starterIds
        );

      if (error) {
        throw error;
      }

      starterProfiles =
        data ?? [];
    }

    const latestByTrainee =
      rows.reduce(
        (
          record,
          draft
        ) => {
          if (
            !record[
              draft.trainee_id
            ]
          ) {
            record[
              draft.trainee_id
            ] = {
              ...draft,
              starter_name:
                starterProfiles.find(
                  (profile) =>
                    profile.id ===
                    draft.started_by
                )?.name ??
                null,
            };
          }

          return record;
        },
        {} as Record<
          string,
          DraftRecord
        >
      );

    setDrafts(
      latestByTrainee
    );
  }

  if (loading) {
    return (
      <div style={card}>
        Loading P1 Records...
      </div>
    );
  }

  return (
    <div>
      <div style={headerRowStyle}>
        <div>
          <h1 style={title}>
            P1 Records
          </h1>

          <p style={subtitle}>
            All active Probationary
            Officers currently in FTP.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadRecords()
          }
          style={refreshButton}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {trainees.length === 0 ? (
        <div style={card}>
          No active P1 officers
          found.
        </div>
      ) : (
        trainees.map(
          (trainee) => {
            const draft =
              drafts[
                trainee.id
              ];

            return (
              <div
                key={trainee.id}
                style={card}
              >
                <div style={recordHeaderStyle}>
                  <div>
                    <h2
                      style={{
                        margin:
                          "0 0 6px",
                      }}
                    >
                      {trainee
                        .profiles
                        ?.name ||
                        "Unknown Officer"}
                    </h2>

                    <p style={recordMetaStyle}>
                      {trainee
                        .profiles
                        ?.division ||
                        "Mission Row Division"}
                    </p>
                  </div>

                  {draft && (
                    <DraftStatusBadge
                      lastSavedAt={
                        draft.last_saved_at ??
                        draft.created_at
                      }
                    />
                  )}
                </div>

                <div style={details}>
                  <Detail
                    label="Rank"
                    value={
                      trainee
                        .profiles
                        ?.rank ||
                      "Unknown"
                    }
                  />

                  <Detail
                    label="Badge Number"
                    value={
                      trainee
                        .profiles
                        ?.badge_number ||
                      "N/A"
                    }
                  />

                  <Detail
                    label="Work Number"
                    value={
                      trainee
                        .profiles
                        ?.work_number ||
                      "N/A"
                    }
                  />

                  <Detail
                    label="FTP Status"
                    value={
                      trainee.status ||
                      "Active"
                    }
                  />

                  <Detail
                    label="Field Training Manager"
                    value={
                      trainee.assigned_ftm ||
                      "Unassigned"
                    }
                  />
                </div>

                {draft && (
                  <div style={draftCardStyle}>
                    <div style={draftHeaderStyle}>
                      <div>
                        <p style={draftEyebrowStyle}>
                          ACTIVE DOR DRAFT
                        </p>

                        <h3 style={draftTitleStyle}>
                          Patrol{" "}
                          {draft.patrol_number ??
                            "?"}
                        </h3>
                      </div>

                      <DraftAgeText
                        lastSavedAt={
                          draft.last_saved_at ??
                          draft.created_at
                        }
                      />
                    </div>

                    <div style={draftDetailsStyle}>
                      <Detail
                        label="Started By"
                        value={
                          draft.starter_name ||
                          "Unknown FTO"
                        }
                      />

                      <Detail
                        label="Last Saved"
                        value={formatDateTime(
                          draft.last_saved_at ??
                          draft.created_at
                        )}
                      />
                    </div>

                    <div style={draftActionRowStyle}>
                      <button
                        type="button"
                        onClick={() =>
                          openDOR(
                            trainee.id
                          )
                        }
                        style={continueDraftButton}
                      >
                        Continue DOR
                      </button>
                    </div>
                  </div>
                )}

                <div style={buttons}>
                  <button
                    type="button"
                    onClick={() =>
                      openNotebook(
                        trainee.id
                      )
                    }
                    style={
                      primaryButton
                    }
                  >
                    View Notebook
                  </button>

                  {!draft && (
                    <button
                      type="button"
                      onClick={() =>
                        openDOR(
                          trainee.id
                        )
                      }
                      style={
                        secondaryButton
                      }
                    >
                      Create DOR
                    </button>
                  )}
                </div>
              </div>
            );
          }
        )
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
      <p style={labelStyle}>
        {label}
      </p>

      <p style={valueStyle}>
        {value}
      </p>
    </div>
  );
}

function DraftStatusBadge({
  lastSavedAt,
}: {
  lastSavedAt: string | null;
}) {
  const state =
    getDraftAgeState(
      lastSavedAt
    );

  const style =
    state === "overdue"
      ? overdueBadgeStyle
      : state === "warning"
        ? warningBadgeStyle
        : activeBadgeStyle;

  const label =
    state === "overdue"
      ? "OVERDUE DRAFT"
      : state === "warning"
        ? "DRAFT AGING"
        : "DRAFT ACTIVE";

  return (
    <span style={style}>
      {label}
    </span>
  );
}

function DraftAgeText({
  lastSavedAt,
}: {
  lastSavedAt: string | null;
}) {
  const state =
    getDraftAgeState(
      lastSavedAt
    );

  if (
    state === "fresh"
  ) {
    return (
      <span style={freshTextStyle}>
        Saved recently
      </span>
    );
  }

  if (
    state === "warning"
  ) {
    return (
      <span style={warningTextStyle}>
        Approaching 24 hours
      </span>
    );
  }

  return (
    <span style={overdueTextStyle}>
      Over 24 hours old
    </span>
  );
}

function getDraftAgeState(
  value: string | null
) {
  if (!value) {
    return "fresh";
  }

  const ageHours =
    (
      Date.now() -
      new Date(
        value
      ).getTime()
    ) /
    (
      1000 *
      60 *
      60
    );

  if (ageHours >= 24) {
    return "overdue";
  }

  if (ageHours >= 18) {
    return "warning";
  }

  return "fresh";
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "Unknown";
  }

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

const headerRowStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "25px",
  flexWrap: "wrap" as const,
};

const card = {
  background: "#1e293b",
  padding: "25px",
  border:
    "1px solid #334155",
  borderRadius: "12px",
  marginBottom: "20px",
};

const title = {
  margin: 0,
  fontSize: "28px",
  fontWeight: "900",
};

const subtitle = {
  color: "#94a3b8",
  margin:
    "8px 0 0",
};

const refreshButton = {
  padding: "10px 14px",
  color: "white",
  background: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const recordHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "18px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
};

const recordMetaStyle = {
  margin: 0,
  color: "#94a3b8",
};

const details = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "20px",
};

const labelStyle = {
  color: "#94a3b8",
  fontSize: "14px",
  margin:
    "0 0 5px",
};

const valueStyle = {
  margin: 0,
  fontSize: "16px",
};

const buttons = {
  display: "flex",
  gap: "12px",
  marginTop: "25px",
  flexWrap: "wrap" as const,
};

const primaryButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton = {
  background: "#475569",
  color: "white",
  border: "none",
  padding: "12px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const draftCardStyle = {
  marginTop: "22px",
  padding: "18px",
  background:
    "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: "10px",
};

const draftHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap" as const,
};

const draftEyebrowStyle = {
  margin:
    "0 0 5px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const draftTitleStyle = {
  margin: 0,
};

const draftDetailsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  marginTop: "16px",
};

const draftActionRowStyle = {
  display: "flex",
  justifyContent:
    "flex-end",
  marginTop: "18px",
};

const continueDraftButton = {
  padding: "11px 16px",
  color: "white",
  background: "#16a34a",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const activeBadgeStyle = {
  padding: "6px 10px",
  color: "#bbf7d0",
  background:
    "rgba(20, 83, 45, 0.35)",
  border:
    "1px solid #166534",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
};

const warningBadgeStyle = {
  padding: "6px 10px",
  color: "#fde68a",
  background:
    "rgba(120, 53, 15, 0.3)",
  border:
    "1px solid #a16207",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
};

const overdueBadgeStyle = {
  padding: "6px 10px",
  color: "#fecaca",
  background:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
};

const freshTextStyle = {
  color: "#94a3b8",
  fontSize: "12px",
};

const warningTextStyle = {
  color: "#fde68a",
  fontSize: "12px",
  fontWeight: 700,
};

const overdueTextStyle = {
  color: "#fca5a5",
  fontSize: "12px",
  fontWeight: 800,
};

const errorStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#fecaca",
  background:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
};