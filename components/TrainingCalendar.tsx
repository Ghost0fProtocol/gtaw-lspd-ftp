"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import {
  canEditCalendar,
} from "../lib/permissions";

type Props = {
  user: any;
};

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  batch_name: string | null;
};

export default function TrainingCalendar({
  user,
}: Props) {
  const [
    events,
    setEvents,
  ] = useState<
    CalendarEvent[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    batchName,
    setBatchName,
  ] = useState("");

  const [
    inductionDate,
    setInductionDate,
  ] = useState("");

  const [
    selectedBatch,
    setSelectedBatch,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const canEdit =
    canEditCalendar(
      user?.role
    );

  useEffect(() => {
    void loadEvents();
  }, []);

  const batches =
    useMemo(
      () =>
        [
          ...new Set(
            events
              .map(
                (event) =>
                  event.batch_name
              )
              .filter(
                (
                  value
                ): value is string =>
                  Boolean(value)
              )
          ),
        ],
      [
        events,
      ]
    );

  const visibleEvents =
    useMemo(
      () =>
        events
          .filter(
            (event) =>
              !selectedBatch ||
              event.batch_name ===
                selectedBatch
          )
          .sort(
            (
              first,
              second
            ) =>
              first.event_date.localeCompare(
                second.event_date
              )
          ),
      [
        events,
        selectedBatch,
      ]
    );

  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      const {
        data,
        error:
          loadError,
      } = await supabase
        .from(
          "ftp_calendar_events"
        )
        .select(`
          id,
          title,
          description,
          event_date,
          event_type,
          batch_name
        `)
        .order(
          "event_date",
          {
            ascending: true,
          }
        );

      if (loadError) {
        throw loadError;
      }

      setEvents(
        data ?? []
      );
    } catch (loadError) {
      console.error(
        "LOAD TRAINING CALENDAR ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "The training calendar could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function callCalendarAPI(
    action:
      | "generateBatch"
      | "clearBatch"
  ) {
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
        "Your login session could not be verified."
      );
    }

    const response =
      await fetch(
        "/api/ftp-calendar",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${accessToken}`,
          },
          body:
            JSON.stringify({
              action,
              batchName:
                action ===
                "clearBatch"
                  ? selectedBatch
                  : batchName,
              inductionDate:
                action ===
                "generateBatch"
                  ? inductionDate
                  : undefined,
            }),
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ??
          "The training calendar could not be updated."
      );
    }

    return result;
  }

  async function generateCalendar(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!batchName.trim()) {
      setError(
        "Enter a batch name."
      );
      return;
    }

    if (!inductionDate) {
      setError(
        "Select the induction date."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await callCalendarAPI(
          "generateBatch"
        );

      setSuccess(
        result?.message ??
          "The training calendar was generated."
      );

      setSelectedBatch(
        batchName.trim()
      );

      await loadEvents();
    } catch (saveError) {
      console.error(
        "GENERATE TRAINING CALENDAR ERROR",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "The training calendar could not be generated."
      );
    } finally {
      setSaving(false);
    }
  }

  async function clearCalendar() {
    if (!selectedBatch) {
      return;
    }

    if (
      !window.confirm(
        `Clear the official calendar for ${selectedBatch}?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await callCalendarAPI(
          "clearBatch"
        );

      setSuccess(
        result?.message ??
          "The batch calendar was cleared."
      );

      setSelectedBatch("");

      await loadEvents();
    } catch (clearError) {
      console.error(
        "CLEAR TRAINING CALENDAR ERROR",
        clearError
      );

      setError(
        clearError instanceof Error
          ? clearError.message
          : "The batch calendar could not be cleared."
      );
    } finally {
      setSaving(false);
    }
  }

  const nextMilestone =
    visibleEvents.find(
      (event) =>
        new Date(
          `${event.event_date}T23:59:59`
        ).getTime() >=
        Date.now()
    ) ?? null;

  return (
    <div style={pageStyle}>
      <section style={headerCardStyle}>
        <div>
          <p style={eyebrowStyle}>
            FIELD TRAINING PROGRAM
          </p>

          <h2 style={titleStyle}>
            Training Period Calendar
          </h2>

          <p style={subtitleStyle}>
            The official programme
            milestones are generated
            automatically from one
            induction date.
          </p>
        </div>

        <div style={accessBadgeStyle}>
          {canEdit
            ? "FTS+ EDIT ACCESS"
            : "READ ONLY"}
        </div>
      </section>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {success && (
        <div style={successStyle}>
          {success}
        </div>
      )}

      <section style={toolbarStyle}>
        <div>
          <label style={labelStyle}>
            Batch
          </label>

          <select
            value={selectedBatch}
            onChange={(event) =>
              setSelectedBatch(
                event.target.value
              )
            }
            style={inputStyle}
          >
            <option value="">
              All batches
            </option>

            {batches.map(
              (batch) => (
                <option
                  key={batch}
                  value={batch}
                >
                  {batch}
                </option>
              )
            )}
          </select>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadEvents()
          }
          style={secondaryButtonStyle}
        >
          Refresh
        </button>
      </section>

      {nextMilestone && (
        <section style={nextCardStyle}>
          <p style={nextLabelStyle}>
            NEXT PROGRAMME MILESTONE
          </p>

          <h3 style={nextTitleStyle}>
            {nextMilestone.title}
          </h3>

          <p style={nextDateStyle}>
            {formatDate(
              nextMilestone.event_date
            )}
            {" • "}
            {formatRemaining(
              nextMilestone.event_date
            )}
          </p>
        </section>
      )}

      <section style={calendarCardStyle}>
        <div style={tableHeaderStyle}>
          <span>TASK</span>
          <span>DATE</span>
        </div>

        {loading ? (
          <div style={emptyStyle}>
            Loading calendar...
          </div>
        ) : visibleEvents.length ===
          0 ? (
          <div style={emptyStyle}>
            No training period has been
            published for this batch.
          </div>
        ) : (
          visibleEvents.map(
            (event) => (
              <div
                key={event.id}
                style={tableRowStyle}
              >
                <div>
                  <strong>
                    {event.title}
                  </strong>

                  {event.description && (
                    <p style={descriptionStyle}>
                      {event.description}
                    </p>
                  )}
                </div>

                <span style={dateStyle}>
                  {formatDate(
                    event.event_date
                  )}
                </span>
              </div>
            )
          )
        )}
      </section>

      {canEdit && (
        <section style={editorCardStyle}>
          <div style={editorHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>
                CALENDAR ADMINISTRATION
              </p>

              <h3 style={editorTitleStyle}>
                Generate Batch Calendar
              </h3>

              <p style={subtitleStyle}>
                Enter the induction date
                once. The portal creates
                the 14, 21, 43 and
                50-day milestones.
              </p>
            </div>
          </div>

          <form
            onSubmit={
              generateCalendar
            }
            style={editorFormStyle}
          >
            <div>
              <label style={labelStyle}>
                Batch Name
              </label>

              <input
                value={batchName}
                onChange={(event) =>
                  setBatchName(
                    event.target.value
                  )
                }
                placeholder="Example: Batch 57"
                disabled={saving}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Induction / Graduation
                Date
              </label>

              <input
                type="date"
                value={inductionDate}
                onChange={(event) =>
                  setInductionDate(
                    event.target.value
                  )
                }
                disabled={saving}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={primaryButtonStyle}
            >
              {saving
                ? "Generating Calendar..."
                : "Generate Official Calendar"}
            </button>
          </form>

          {selectedBatch && (
            <button
              type="button"
              onClick={() =>
                void clearCalendar()
              }
              disabled={saving}
              style={dangerButtonStyle}
            >
              Clear {selectedBatch}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function formatDate(
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

function formatRemaining(
  value: string
) {
  const target =
    new Date(
      `${value}T23:59:59Z`
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

const pageStyle = {
  display: "grid",
  gap: "20px",
};

const headerCardStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "28px",
  color: "white",
  background:
    "linear-gradient(135deg, #111c33, #172554)",
  border:
    "1px solid #263655",
  borderRadius: "16px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.11em",
};

const titleStyle = {
  margin: "0 0 8px",
  fontSize: "29px",
};

const subtitleStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.55,
};

const accessBadgeStyle = {
  padding: "7px 11px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30, 64, 175, 0.28)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const toolbarStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "end",
  gap: "14px",
  padding: "18px",
  backgroundColor: "#172033",
  border:
    "1px solid #29364c",
  borderRadius: "12px",
  flexWrap: "wrap" as const,
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#cbd5e1",
  fontSize: "12px",
  fontWeight: 800,
};

const inputStyle = {
  minWidth: "220px",
  boxSizing:
    "border-box" as const,
  padding: "11px 12px",
  color: "white",
  backgroundColor: "#0f172a",
  border:
    "1px solid #475569",
  borderRadius: "8px",
};

const nextCardStyle = {
  padding: "22px",
  color: "white",
  background:
    "linear-gradient(135deg, rgba(30, 64, 175, 0.34), rgba(15, 23, 42, 0.96))",
  border:
    "1px solid #2563eb",
  borderRadius: "14px",
};

const nextLabelStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const nextTitleStyle = {
  margin: "0 0 8px",
  fontSize: "21px",
};

const nextDateStyle = {
  margin: 0,
  color: "#bfdbfe",
};

const calendarCardStyle = {
  overflow: "hidden",
  color: "white",
  backgroundColor: "#172033",
  border:
    "1px solid #29364c",
  borderRadius: "14px",
};

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) 230px",
  gap: "18px",
  padding: "13px 18px",
  color: "#94a3b8",
  backgroundColor: "#111827",
  borderBottom:
    "1px solid #29364c",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const tableRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) 230px",
  alignItems: "center",
  gap: "18px",
  padding: "17px 18px",
  borderBottom:
    "1px solid #29364c",
};

const descriptionStyle = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.45,
};

const dateStyle = {
  color: "#bfdbfe",
  textAlign: "right" as const,
  fontWeight: 800,
};

const emptyStyle = {
  padding: "30px",
  color: "#94a3b8",
};

const editorCardStyle = {
  padding: "24px",
  color: "white",
  backgroundColor: "#172033",
  border:
    "1px solid #29364c",
  borderRadius: "14px",
};

const editorHeaderStyle = {
  marginBottom: "18px",
};

const editorTitleStyle = {
  margin: "0 0 7px",
};

const editorFormStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(220px, 1fr) minmax(220px, 1fr) auto",
  alignItems: "end",
  gap: "13px",
};

const primaryButtonStyle = {
  padding: "12px 16px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 900,
};

const secondaryButtonStyle = {
  padding: "11px 14px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const dangerButtonStyle = {
  marginTop: "16px",
  padding: "10px 14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.28)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
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

const successStyle = {
  padding: "14px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border:
    "1px solid #166534",
  borderRadius: "10px",
};