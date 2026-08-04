"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import {
  generateCommentCardBBCode,
} from "../lib/generateCommentCardBBCode";

type Props = {
  user: any;
};

type CommentCard = {
  id: string;
  trainee_id: string;
  submission_type: string;
  submitter_name: string;
  submitter_rank: string | null;
  submitter_work_number: string | null;
  observed_at: string;
  overall_comments: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  trainees?: {
    profiles?: {
      name?: string | null;
      rank?: string | null;
      work_number?: string | null;
    } | null;
  } | null;
};

type Tab =
  | "pending"
  | "approved"
  | "rejected";

export default function CommentCardCentre({
  user,
}: Props) {
  const [
    activeTab,
    setActiveTab,
  ] = useState<Tab>(
    "pending"
  );

  const [
    cards,
    setCards,
  ] = useState<
    CommentCard[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processingId,
    setProcessingId,
  ] = useState<
    string |
    null
  >(null);

  const [
    selectedCard,
    setSelectedCard,
  ] = useState<
    CommentCard |
    null
  >(null);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const visibleCards =
    useMemo(
      () =>
        cards.filter(
          (card) =>
            card.status ===
            activeTab
        ),
      [
        cards,
        activeTab,
      ]
    );

  useEffect(() => {
    void loadCards();
  }, []);

  async function getToken() {
    const {
      data,
      error:
        sessionError,
    } =
      await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const token =
      data.session
        ?.access_token;

    if (!token) {
      throw new Error(
        "Your login session could not be found."
      );
    }

    return token;
  }

  async function loadCards() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getToken();

      const response =
        await fetch(
          "/api/comment-cards/review",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ??
          "Comment cards could not be loaded."
        );
      }

      setCards(
        Array.isArray(
          result?.cards
        )
          ? result.cards
          : []
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Comment cards could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function reviewCard(
    card: CommentCard,
    action:
      | "approve"
      | "reject"
  ) {
    if (
      action === "reject" &&
      !rejectionReason.trim()
    ) {
      setError(
        "Enter a reason for rejecting the card."
      );
      return;
    }

    setProcessingId(
      card.id
    );
    setError("");
    setMessage("");

    try {
      const token =
        await getToken();

      const response =
        await fetch(
          "/api/comment-cards/review",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify({
                cardId:
                  card.id,
                action,
                rejectionReason:
                  action === "reject"
                    ? rejectionReason
                    : "",
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ??
          "The comment card could not be reviewed."
        );
      }

      setCards(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              card.id
                ? {
                    ...item,
                    status:
                      action ===
                      "approve"
                        ? "approved"
                        : "rejected",
                    rejection_reason:
                      action ===
                      "reject"
                        ? rejectionReason.trim()
                        : null,
                  }
                : item
          )
      );

      setSelectedCard(
        null
      );
      setRejectionReason("");
      setMessage(
        result?.message ??
        "Comment card updated."
      );
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "The comment card could not be reviewed."
      );
    } finally {
      setProcessingId(
        null
      );
    }
  }

  async function copyBBCode(
    card: CommentCard
  ) {
    const p1 =
      card.trainees
        ?.profiles;

    const bbcode =
      generateCommentCardBBCode({
        commentingEmployeeRank:
          card.submitter_rank ??
          "",
        commentingEmployeeName:
          card.submitter_name,
        commentingEmployeeSerial:
          card.submitter_work_number ??
          "",
        probationaryOfficerRank:
          p1?.rank ??
          "Police Officer I",
        probationaryOfficerName:
          p1?.name ??
          "Unknown Officer",
        probationaryOfficerSerial:
          p1?.work_number ??
          "",
        observedAt:
          card.observed_at,
        comments:
          card.overall_comments,
      });

    await navigator.clipboard.writeText(
      bbcode
    );

    setMessage(
      "Comment-card BBCode copied."
    );
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>
            REVIEW & GOVERNANCE
          </p>

          <h2 style={heroTitleStyle}>
            Comment Card Centre
          </h2>

          <p style={heroTextStyle}>
            Review guest submissions before they become part of the official probationary record.
          </p>
        </div>

        <div style={accessStyle}>
          <span>
            CURRENT ACCESS
          </span>

          <strong>
            {user.role}
          </strong>
        </div>
      </section>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {message && (
        <div style={successStyle}>
          {message}
        </div>
      )}

      <section style={panelStyle}>
        <div style={tabsStyle}>
          {(
            [
              "pending",
              "approved",
              "rejected",
            ] as Tab[]
          ).map(
            (tab) => {
              const count =
                cards.filter(
                  (card) =>
                    card.status ===
                    tab
                ).length;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab
                    )
                  }
                  style={{
                    ...tabStyle,
                    ...(activeTab ===
                    tab
                      ? activeTabStyle
                      : {}),
                  }}
                >
                  {capitalise(
                    tab
                  )}
                  <span style={countStyle}>
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {loading ? (
          <div style={emptyStyle}>
            Loading comment cards...
          </div>
        ) : visibleCards.length ===
          0 ? (
          <div style={emptyStyle}>
            No {activeTab} comment cards.
          </div>
        ) : (
          <div style={listStyle}>
            {visibleCards.map(
              (card) => {
                const p1 =
                  card.trainees
                    ?.profiles;

                return (
                  <article
                    key={card.id}
                    style={cardStyle}
                  >
                    <div style={cardHeaderStyle}>
                      <div>
                        <span style={metaStyle}>
                          {card.submission_type ===
                          "guest"
                            ? "GUEST SUBMISSION"
                            : "AUTHENTICATED"}
                        </span>

                        <h3 style={cardTitleStyle}>
                          {card.submitter_rank}{" "}
                          {card.submitter_name}
                        </h3>

                        <p style={secondaryStyle}>
                          For:{" "}
                          {p1?.rank ??
                            "Police Officer I"}{" "}
                          {p1?.name ??
                            "Unknown Officer"}
                        </p>
                      </div>

                      <span style={statusStyle}>
                        {capitalise(
                          card.status
                        )}
                      </span>
                    </div>

                    <div style={detailsGridStyle}>
                      <Detail
                        label="Date"
                        value={
                          formatDate(
                            card.observed_at
                          )
                        }
                      />

                      <Detail
                        label="Serial"
                        value={
                          card.submitter_work_number ??
                          "Not supplied"
                        }
                      />

                      <Detail
                        label="Submitted"
                        value={
                          formatDateTime(
                            card.created_at
                          )
                        }
                      />
                    </div>

                    <blockquote style={quoteStyle}>
                      {card.overall_comments}
                    </blockquote>

                    {card.rejection_reason && (
                      <div style={rejectionStyle}>
                        <strong>
                          Rejection reason
                        </strong>

                        <span>
                          {card.rejection_reason}
                        </span>
                      </div>
                    )}

                    <div style={buttonRowStyle}>
                      <button
                        type="button"
                        onClick={() =>
                          void copyBBCode(
                            card
                          )
                        }
                        style={secondaryButtonStyle}
                      >
                        Copy BBCode
                      </button>

                      {card.status ===
                        "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              void reviewCard(
                                card,
                                "approve"
                              )
                            }
                            disabled={
                              processingId ===
                              card.id
                            }
                            style={approveButtonStyle}
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCard(
                                card
                              );
                              setRejectionReason("");
                            }}
                            disabled={
                              processingId ===
                              card.id
                            }
                            style={rejectButtonStyle}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {selectedCard && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h3>
              Reject Comment Card
            </h3>

            <p style={secondaryStyle}>
              Explain why this guest submission should not be added to the probationary record.
            </p>

            <textarea
              value={
                rejectionReason
              }
              onChange={(event) =>
                setRejectionReason(
                  event.target.value
                )
              }
              style={textareaStyle}
            />

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() =>
                  setSelectedCard(
                    null
                  )
                }
                style={secondaryButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void reviewCard(
                    selectedCard,
                    "reject"
                  )
                }
                disabled={
                  processingId ===
                  selectedCard.id
                }
                style={rejectButtonStyle}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
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
    <div style={detailStyle}>
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function capitalise(
  value: string
) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function formatDate(
  value: string
) {
  return new Date(
    value
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

function formatDateTime(
  value: string
) {
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
      timeZone: "UTC",
    }
  );
}

const pageStyle = {
  display: "grid",
  gap: "20px",
};

const heroStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "26px",
  background:
    "linear-gradient(135deg, #111c33, #172554)",
  border: "1px solid #2b3b57",
  borderRadius: "15px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.11em",
};

const heroTitleStyle = {
  margin: "0 0 7px",
  fontSize: "27px",
};

const heroTextStyle = {
  margin: 0,
  color: "#94a3b8",
};

const accessStyle = {
  minWidth: "220px",
  display: "grid",
  gap: "5px",
  padding: "14px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const panelStyle = {
  padding: "22px",
  backgroundColor: "#111827",
  border: "1px solid #29364c",
  borderRadius: "14px",
};

const tabsStyle = {
  display: "flex",
  gap: "9px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const tabStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 14px",
  color: "#cbd5e1",
  backgroundColor: "#1e293b",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#334155",
  borderRadius: "8px",
  cursor: "pointer",
};

const activeTabStyle = {
  color: "white",
  backgroundColor: "#1d4ed8",
  borderColor: "#3b82f6",
};

const countStyle = {
  minWidth: "22px",
  padding: "2px 6px",
  backgroundColor: "rgba(15,23,42,.5)",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const listStyle = {
  display: "grid",
  gap: "14px",
};

const cardStyle = {
  padding: "18px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "14px",
};

const metaStyle = {
  color: "#60a5fa",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const cardTitleStyle = {
  margin: "6px 0",
};

const secondaryStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.5,
};

const statusStyle = {
  height: "fit-content",
  padding: "5px 9px",
  color: "#dbeafe",
  backgroundColor: "#1e3a8a",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const detailStyle = {
  display: "grid",
  gap: "5px",
  padding: "11px",
  backgroundColor: "#111827",
  borderRadius: "8px",
  fontSize: "11px",
};

const quoteStyle = {
  padding: "14px",
  margin: "14px 0",
  color: "#dbeafe",
  backgroundColor: "#111827",
  borderLeft: "3px solid #3b82f6",
  borderRadius: "7px",
  whiteSpace: "pre-wrap" as const,
};

const rejectionStyle = {
  display: "grid",
  gap: "5px",
  padding: "12px",
  marginBottom: "14px",
  color: "#fecaca",
  backgroundColor: "rgba(127,29,29,.25)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
};

const buttonRowStyle = {
  display: "flex",
  gap: "9px",
  justifyContent: "flex-end",
  flexWrap: "wrap" as const,
};

const secondaryButtonStyle = {
  padding: "9px 12px",
  color: "#e2e8f0",
  backgroundColor: "#334155",
  border: "1px solid #475569",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const approveButtonStyle = {
  padding: "9px 12px",
  color: "#bbf7d0",
  backgroundColor: "rgba(20,83,45,.35)",
  border: "1px solid #166534",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const rejectButtonStyle = {
  padding: "9px 12px",
  color: "#fecaca",
  backgroundColor: "rgba(127,29,29,.3)",
  border: "1px solid #991b1b",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const emptyStyle = {
  padding: "28px",
  color: "#64748b",
  textAlign: "center" as const,
};

const errorStyle = {
  padding: "13px",
  color: "#fecaca",
  backgroundColor: "rgba(127,29,29,.3)",
  border: "1px solid #991b1b",
  borderRadius: "9px",
};

const successStyle = {
  padding: "13px",
  color: "#bbf7d0",
  backgroundColor: "rgba(20,83,45,.3)",
  border: "1px solid #166534",
  borderRadius: "9px",
};

const modalOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 1000,
  display: "grid",
  placeItems: "center",
  padding: "24px",
  backgroundColor: "rgba(2,6,23,.86)",
};

const modalStyle = {
  width: "100%",
  maxWidth: "560px",
  padding: "24px",
  backgroundColor: "#111827",
  border: "1px solid #475569",
  borderRadius: "13px",
};

const textareaStyle = {
  width: "100%",
  minHeight: "130px",
  boxSizing: "border-box" as const,
  padding: "12px",
  margin: "14px 0",
  color: "white",
  backgroundColor: "#020617",
  border: "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
};