"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

type DORDraftAlert = {
  id: string;
  traineeId: string;
  traineeName: string;
  patrolNumber: number | null;
  startedById: string | null;
  startedByName: string;
  lastSavedAt: string | null;
};

type Props = {
  drafts: DORDraftAlert[];
  openDOR: (
    traineeId: string
  ) => void;
  user?: any;
};

export default function DORDraftAlerts({
  drafts,
  openDOR,
  user,
}: Props) {
  const [
    dismissedIds,
    setDismissedIds,
  ] = useState<Set<string>>(
    new Set()
  );

  const [
    clearingId,
    setClearingId,
  ] = useState<string | null>(
    null
  );

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    void loadDismissedDrafts();
  }, [drafts]);

  async function loadDismissedDrafts() {
    const ids =
      drafts.map(
        (draft) =>
          draft.id
      );

    if (ids.length === 0) {
      setDismissedIds(
        new Set()
      );
      return;
    }

    const {
      data,
      error:
        loadError,
    } = await supabase
      .from("dors")
      .select(
        "id, alert_dismissed_at"
      )
      .in(
        "id",
        ids
      );

    if (loadError) {
      console.error(
        "LOAD DISMISSED DOR ALERTS ERROR",
        loadError
      );
      return;
    }

    setDismissedIds(
      new Set(
        (data ?? [])
          .filter(
            (row) =>
              Boolean(
                row.alert_dismissed_at
              )
          )
          .map(
            (row) =>
              row.id
          )
      )
    );
  }

  async function clearAlert(
    draft: DORDraftAlert
  ) {
    const confirmed =
      window.confirm(
        `Clear the overdue alert for Patrol ${draft.patrolNumber ?? "?"} belonging to ${draft.traineeName}? The draft itself will not be deleted.`
      );

    if (!confirmed) {
      return;
    }

    setClearingId(
      draft.id
    );
    setError("");

    try {
      const now =
        new Date().toISOString();

      const {
        error:
          updateError,
      } = await supabase
        .from("dors")
        .update({
          alert_dismissed_at:
            now,
          alert_dismissed_by:
            user?.id ??
            null,
        })
        .eq(
          "id",
          draft.id
        );

      if (updateError) {
        throw updateError;
      }

      setDismissedIds(
        (current) => {
          const next =
            new Set(
              current
            );

          next.add(
            draft.id
          );

          return next;
        }
      );
    } catch (clearError) {
      console.error(
        "CLEAR DOR ALERT ERROR",
        clearError
      );

      setError(
        clearError instanceof Error
          ? clearError.message
          : "The draft alert could not be cleared."
      );
    } finally {
      setClearingId(
        null
      );
    }
  }

  const urgentDrafts =
    useMemo(
      () =>
        drafts
          .filter(
            (draft) =>
              !dismissedIds.has(
                draft.id
              )
          )
          .map(
            (draft) => ({
              ...draft,
              ageMinutes:
                getAgeMinutes(
                  draft.lastSavedAt
                ),
            })
          )
          .filter(
            (draft) =>
              draft.ageMinutes >=
              18 * 60
          )
          .sort(
            (
              first,
              second
            ) =>
              second.ageMinutes -
              first.ageMinutes
          ),
      [
        drafts,
        dismissedIds,
      ]
    );

  if (
    urgentDrafts.length === 0
  ) {
    return null;
  }

  const overdueCount =
    urgentDrafts.filter(
      (draft) =>
        draft.ageMinutes >=
        24 * 60
    ).length;

  const warningCount =
    urgentDrafts.length -
    overdueCount;

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            DOR DRAFT ALERTS
          </p>

          <h2 style={titleStyle}>
            Paperwork Requiring Attention
          </h2>

          <p style={subtitleStyle}>
            FTP management can open or safely clear amber and overdue draft alerts.
          </p>
        </div>

        <div style={countRowStyle}>
          {overdueCount > 0 && (
            <span style={overdueCountStyle}>
              {overdueCount} overdue
            </span>
          )}

          {warningCount > 0 && (
            <span style={warningCountStyle}>
              {warningCount} approaching
            </span>
          )}
        </div>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div style={listStyle}>
        {urgentDrafts.map(
          (draft) => {
            const overdue =
              draft.ageMinutes >=
              24 * 60;

            return (
              <div
                key={draft.id}
                style={
                  overdue
                    ? overdueCardStyle
                    : warningCardStyle
                }
              >
                <div>
                  <div style={itemHeaderStyle}>
                    <span
                      style={
                        overdue
                          ? overdueBadgeStyle
                          : warningBadgeStyle
                      }
                    >
                      {overdue
                        ? "OVERDUE"
                        : "APPROACHING"}
                    </span>

                    <strong>
                      Patrol{" "}
                      {draft.patrolNumber ??
                        "?"}
                    </strong>
                  </div>

                  <p style={traineeStyle}>
                    {draft.traineeName}
                  </p>

                  <p style={metaStyle}>
                    Started by{" "}
                    {draft.startedByName}
                    {" • "}
                    {getDeadlineText(
                      draft.ageMinutes
                    )}
                  </p>
                </div>

                <div style={buttonRowStyle}>
                  <button
                    type="button"
                    onClick={() =>
                      openDOR(
                        draft.traineeId
                      )
                    }
                    style={openButtonStyle}
                  >
                    Open Draft
                  </button>

                  <button
                    type="button"
                    disabled={
                      clearingId ===
                      draft.id
                    }
                    onClick={() =>
                      void clearAlert(
                        draft
                      )
                    }
                    style={clearButtonStyle}
                  >
                    {clearingId ===
                    draft.id
                      ? "Clearing..."
                      : "Clear Alert"}
                  </button>
                </div>
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

function getAgeMinutes(
  value: string | null
) {
  if (!value) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        new Date(
          value
        ).getTime()
      ) /
      (
        1000 *
        60
      )
    )
  );
}

function getDeadlineText(
  ageMinutes: number
) {
  const deadlineMinutes =
    24 * 60;

  if (
    ageMinutes >=
    deadlineMinutes
  ) {
    return `overdue by ${formatMinutes(
      ageMinutes -
      deadlineMinutes
    )}`;
  }

  return `due in ${formatMinutes(
    deadlineMinutes -
    ageMinutes
  )}`;
}

function formatMinutes(
  totalMinutes: number
) {
  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

const panelStyle = {
  padding: "22px",
  marginBottom: "20px",
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#fca5a5",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const titleStyle = {
  margin: "0 0 6px",
};

const subtitleStyle = {
  margin: 0,
  color: "#94a3b8",
};

const countRowStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const overdueCountStyle = {
  padding: "6px 10px",
  color: "#fecaca",
  background:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const warningCountStyle = {
  padding: "6px 10px",
  color: "#fde68a",
  background:
    "rgba(120, 53, 15, 0.3)",
  border: "1px solid #a16207",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const listStyle = {
  display: "grid",
  gap: "12px",
};

const overdueCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "16px",
  background:
    "rgba(127, 29, 29, 0.22)",
  border: "1px solid #991b1b",
  borderRadius: "10px",
  flexWrap: "wrap" as const,
};

const warningCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "16px",
  background:
    "rgba(120, 53, 15, 0.2)",
  border: "1px solid #a16207",
  borderRadius: "10px",
  flexWrap: "wrap" as const,
};

const itemHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const overdueBadgeStyle = {
  padding: "4px 7px",
  color: "#fecaca",
  background:
    "rgba(127, 29, 29, 0.5)",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 900,
};

const warningBadgeStyle = {
  padding: "4px 7px",
  color: "#fde68a",
  background:
    "rgba(120, 53, 15, 0.5)",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 900,
};

const traineeStyle = {
  margin: "8px 0 4px",
  fontSize: "16px",
  fontWeight: 800,
};

const metaStyle = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "13px",
};

const buttonRowStyle = {
  display: "flex",
  gap: "9px",
  flexWrap: "wrap" as const,
};

const openButtonStyle = {
  padding: "10px 14px",
  color: "white",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const clearButtonStyle = {
  padding: "10px 14px",
  color: "#fecaca",
  background:
    "rgba(127, 29, 29, 0.28)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const errorStyle = {
  padding: "12px",
  marginBottom: "14px",
  color: "#fecaca",
  background:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  fontSize: "13px",
};