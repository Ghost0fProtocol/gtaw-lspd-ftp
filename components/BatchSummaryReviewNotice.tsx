"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Props = {
  user: any;
};

type PublishedSummary = {
  id: string;
  batch_id: string;
  title: string;
  written_summary: string | null;
  management_notes: string | null;
  bbcode: string | null;
  total_recruits: number;
  total_promotions: number;
  total_patrols: number;
  total_instruction_minutes: number;
  contribution_snapshot: unknown[];
  published_at: string | null;
  revision_number: number;
};

const FTO_PLUS_ROLES = new Set([
  "Field Training Officer",
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
]);

export default function BatchSummaryReviewNotice({
  user,
}: Props) {
  const [
    summaries,
    setSummaries,
  ] = useState<
    PublishedSummary[]
  >([]);

  const [
    selected,
    setSelected,
  ] = useState<
    PublishedSummary | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const canReview =
    FTO_PLUS_ROLES.has(
      user?.role ??
      ""
    );

  useEffect(() => {
    if (
      !canReview ||
      !user?.id
    ) {
      setLoading(false);
      return;
    }

    void loadUnreviewed();
  }, [
    user?.id,
    user?.role,
  ]);

  async function loadUnreviewed() {
    setLoading(true);
    setError("");

    try {
      const [
        summaryResult,
        reviewResult,
      ] = await Promise.all([
        supabase
          .from(
            "ftp_batch_summaries"
          )
          .select(`
            id,
            batch_id,
            title,
            written_summary,
            management_notes,
            bbcode,
            total_recruits,
            total_promotions,
            total_patrols,
            total_instruction_minutes,
            contribution_snapshot,
            published_at,
            revision_number
          `)
          .in(
            "status",
            [
              "published",
              "revised",
            ]
          )
          .order(
            "published_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "ftp_batch_summary_reviews"
          )
          .select(
            "summary_id"
          )
          .eq(
            "profile_id",
            user.id
          ),
      ]);

      if (
        summaryResult.error
      ) {
        throw summaryResult.error;
      }

      if (
        reviewResult.error
      ) {
        throw reviewResult.error;
      }

      const reviewedIds =
        new Set(
          (
            reviewResult.data ??
            []
          ).map(
            (
              review: {
                summary_id: string;
              }
            ) =>
              review.summary_id
          )
        );

      setSummaries(
        (
          summaryResult.data ??
          []
        ).filter(
          (
            summary: PublishedSummary
          ) =>
            !reviewedIds.has(
              summary.id
            )
        ) as PublishedSummary[]
      );
    } catch (
      loadError: any
    ) {
      console.error(
        "LOAD BATCH SUMMARY REVIEWS ERROR",
        loadError
      );

      setError(
        loadError?.message ??
        "Published batch summaries could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function markReviewed(
    summary: PublishedSummary
  ) {
    setSaving(true);
    setError("");

    try {
      const {
        error:
          reviewError,
      } = await supabase
        .from(
          "ftp_batch_summary_reviews"
        )
        .upsert(
          {
            summary_id:
              summary.id,
            profile_id:
              user.id,
            reviewed_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "summary_id,profile_id",
          }
        );

      if (
        reviewError
      ) {
        throw reviewError;
      }

      setSummaries(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              summary.id
          )
      );

      setSelected(
        null
      );
    } catch (
      reviewError: any
    ) {
      console.error(
        "MARK BATCH SUMMARY REVIEWED ERROR",
        reviewError
      );

      setError(
        reviewError?.message ??
        "The summary could not be marked as reviewed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyBBCode(
    summary: PublishedSummary
  ) {
    if (
      !summary.bbcode
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        summary.bbcode
      );
    } catch {
      setError(
        "The BBCode could not be copied automatically."
      );
    }
  }

  if (
    !canReview ||
    loading ||
    summaries.length === 0
  ) {
    return null;
  }

  const latest =
    summaries[0];

  return (
    <>
      <section style={noticeStyle}>
        <div style={noticeGlowStyle} />

        <div style={noticeContentStyle}>
          <div>
            <p style={eyebrowStyle}>
              NEW BATCH SUMMARY
            </p>

            <h2 style={titleStyle}>
              {latest.title}
            </h2>

            <p style={textStyle}>
              A new Field Training Program batch report has been published and requires your review.
            </p>

            <div style={metricRowStyle}>
              <Metric
                label="Recruits"
                value={String(
                  latest.total_recruits
                )}
              />

              <Metric
                label="Promotions"
                value={String(
                  latest.total_promotions
                )}
              />

              <Metric
                label="FTPs"
                value={String(
                  latest.total_patrols
                )}
              />

              <Metric
                label="Instruction"
                value={formatMinutes(
                  latest.total_instruction_minutes
                )}
              />
            </div>
          </div>

          <div style={actionColumnStyle}>
            <span style={countBadgeStyle}>
              {summaries.length} unread
            </span>

            <button
              type="button"
              onClick={() =>
                setSelected(
                  latest
                )
              }
              style={reviewButtonStyle}
            >
              Review Summary
            </button>
          </div>
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}
      </section>

      {selected && (
        <div
          style={backdropStyle}
          role="presentation"
          onMouseDown={() => {
            if (!saving) {
              setSelected(
                null
              );
            }
          }}
        >
          <section
            style={modalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-summary-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <header style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>
                  PUBLISHED BATCH SUMMARY
                </p>

                <h2
                  id="batch-summary-title"
                  style={modalTitleStyle}
                >
                  {selected.title}
                </h2>

                <p style={modalMetaStyle}>
                  Published{" "}
                  {formatDateTime(
                    selected.published_at
                  )}
                  {" • "}
                  Revision{" "}
                  {selected.revision_number}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(
                    null
                  )
                }
                disabled={saving}
                style={closeButtonStyle}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div style={modalBodyStyle}>
              <div style={modalMetricGridStyle}>
                <Metric
                  label="Recruits"
                  value={String(
                    selected.total_recruits
                  )}
                />

                <Metric
                  label="Promotions"
                  value={String(
                    selected.total_promotions
                  )}
                />

                <Metric
                  label="Recorded FTPs"
                  value={String(
                    selected.total_patrols
                  )}
                />

                <Metric
                  label="Instruction Time"
                  value={formatMinutes(
                    selected.total_instruction_minutes
                  )}
                />
              </div>

              <article style={summaryTextStyle}>
                {selected.written_summary ??
                  "No written summary was included."}
              </article>

              {selected.management_notes && (
                <article style={notesStyle}>
                  <strong>
                    Management Notes
                  </strong>

                  <p>
                    {selected.management_notes}
                  </p>
                </article>
              )}

              {selected.bbcode && (
                <details style={bbcodeDetailsStyle}>
                  <summary>
                    View published BBCode
                  </summary>

                  <pre style={bbcodeStyle}>
                    {selected.bbcode}
                  </pre>
                </details>
              )}
            </div>

            <footer style={modalFooterStyle}>
              <button
                type="button"
                onClick={() =>
                  void copyBBCode(
                    selected
                  )
                }
                disabled={
                  saving ||
                  !selected.bbcode
                }
                style={secondaryButtonStyle}
              >
                Copy BBCode
              </button>

              <button
                type="button"
                onClick={() =>
                  void markReviewed(
                    selected
                  )
                }
                disabled={saving}
                style={reviewButtonStyle}
              >
                {saving
                  ? "Saving..."
                  : "Mark as Reviewed"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={metricStyle}>
      <span style={metricLabelStyle}>
        {label}
      </span>

      <strong style={metricValueStyle}>
        {value}
      </strong>
    </div>
  );
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

  return `${hours}h ${String(
    minutes
  ).padStart(
    2,
    "0"
  )}m`;
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "date unknown";
  }

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

const noticeStyle = {
  position:
    "relative" as const,
  overflow: "hidden",
  padding: "22px",
  color: "white",
  background:
    "linear-gradient(135deg, #172554, #111827)",
  border:
    "1px solid #3b82f6",
  borderRadius: "14px",
  boxShadow:
    "0 16px 42px rgba(2, 6, 23, 0.24)",
};

const noticeGlowStyle = {
  position:
    "absolute" as const,
  width: "280px",
  height: "280px",
  right: "-100px",
  top: "-170px",
  background:
    "radial-gradient(circle, rgba(96, 165, 250, 0.30), transparent 68%)",
  pointerEvents:
    "none" as const,
};

const noticeContentStyle = {
  position:
    "relative" as const,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
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
  margin: "0 0 7px",
  fontSize: "22px",
};

const textStyle = {
  margin: 0,
  color: "#cbd5e1",
  lineHeight: 1.5,
};

const metricRowStyle = {
  display: "flex",
  gap: "9px",
  marginTop: "15px",
  flexWrap: "wrap" as const,
};

const metricStyle = {
  minWidth: "95px",
  display: "grid",
  gap: "4px",
  padding: "10px",
  backgroundColor:
    "rgba(15, 23, 42, 0.72)",
  border:
    "1px solid #334155",
  borderRadius: "9px",
};

const metricLabelStyle = {
  color: "#94a3b8",
  fontSize: "9px",
};

const metricValueStyle = {
  color: "#f8fafc",
  fontSize: "15px",
};

const actionColumnStyle = {
  display: "grid",
  justifyItems: "end",
  gap: "10px",
};

const countBadgeStyle = {
  padding: "5px 9px",
  color: "#dbeafe",
  backgroundColor:
    "rgba(30, 64, 175, 0.35)",
  border:
    "1px solid #3b82f6",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const reviewButtonStyle = {
  padding: "11px 15px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 900,
};

const secondaryButtonStyle = {
  padding: "11px 15px",
  color: "white",
  backgroundColor: "#334155",
  border:
    "1px solid #475569",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 800,
};

const errorStyle = {
  position:
    "relative" as const,
  padding: "11px",
  marginTop: "13px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
  fontSize: "12px",
};

const backdropStyle = {
  position:
    "fixed" as const,
  inset: 0,
  zIndex: 1200,
  display: "grid",
  placeItems: "center",
  padding: "22px",
  backgroundColor:
    "rgba(2, 6, 23, 0.84)",
  backdropFilter:
    "blur(6px)",
};

const modalStyle = {
  width: "min(900px, 100%)",
  maxHeight:
    "calc(100vh - 44px)",
  display: "grid",
  gridTemplateRows:
    "auto minmax(0, 1fr) auto",
  overflow: "hidden",
  color: "white",
  backgroundColor: "#0b1729",
  border:
    "1px solid #31517c",
  borderRadius: "16px",
  boxShadow:
    "0 30px 90px rgba(0, 0, 0, 0.48)",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: "20px",
  padding: "21px",
  borderBottom:
    "1px solid #263248",
};

const modalTitleStyle = {
  margin: 0,
};

const modalMetaStyle = {
  margin: "7px 0 0",
  color: "#94a3b8",
  fontSize: "11px",
};

const closeButtonStyle = {
  color: "white",
  backgroundColor:
    "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "28px",
};

const modalBodyStyle = {
  overflowY:
    "auto" as const,
  padding: "21px",
};

const modalMetricGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "17px",
};

const summaryTextStyle = {
  padding: "17px",
  color: "#dbe4f0",
  whiteSpace:
    "pre-wrap" as const,
  lineHeight: 1.65,
  backgroundColor: "#081426",
  border:
    "1px solid #263248",
  borderRadius: "11px",
};

const notesStyle = {
  padding: "15px",
  marginTop: "13px",
  color: "#fde68a",
  backgroundColor:
    "rgba(120, 53, 15, 0.22)",
  border:
    "1px solid #a16207",
  borderRadius: "10px",
};

const bbcodeDetailsStyle = {
  marginTop: "15px",
  color: "#bfdbfe",
};

const bbcodeStyle = {
  maxHeight: "340px",
  overflow: "auto",
  padding: "14px",
  color: "#dbeafe",
  whiteSpace:
    "pre-wrap" as const,
  backgroundColor: "#020617",
  border:
    "1px solid #334155",
  borderRadius: "9px",
  fontSize: "11px",
};

const modalFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  padding: "17px 21px",
  borderTop:
    "1px solid #263248",
};