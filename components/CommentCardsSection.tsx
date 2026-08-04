"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import {
  generateCommentCardBBCode,
} from "../lib/generateCommentCardBBCode";

type Props = {
  traineeId: string;
  traineeName?: string;
  traineeRank?: string;
  traineeSerial?: string;
};

type Card = {
  id: string;
  submission_type: string;
  submitter_name: string;
  submitter_rank: string | null;
  submitter_work_number: string | null;
  observed_at: string;
  overall_comments: string;
  created_at: string;
};

export default function CommentCardsSection({
  traineeId,
  traineeName =
    "Probationary Officer",
  traineeRank =
    "Police Officer I",
  traineeSerial =
    "",
}: Props) {
  const [
    cards,
    setCards,
  ] = useState<Card[]>(
    []
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
    copiedId,
    setCopiedId,
  ] = useState<
    string |
    null
  >(null);

  useEffect(() => {
    void loadCards();
  }, [traineeId]);

  async function loadCards() {
    setLoading(true);
    setError("");

    try {
      const {
        data,
      } =
        await supabase.auth.getSession();

      const token =
        data.session
          ?.access_token;

      if (!token) {
        throw new Error(
          "Your login session could not be found."
        );
      }

      const response =
        await fetch(
          `/api/comment-cards/review?traineeId=${encodeURIComponent(
            traineeId
          )}`,
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

  async function copyBBCode(
    card: Card
  ) {
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
          traineeRank,
        probationaryOfficerName:
          traineeName,
        probationaryOfficerSerial:
          traineeSerial,
        observedAt:
          card.observed_at,
        comments:
          card.overall_comments,
      });

    await navigator.clipboard.writeText(
      bbcode
    );

    setCopiedId(
      card.id
    );

    window.setTimeout(
      () =>
        setCopiedId(
          null
        ),
      1800
    );
  }

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            EMPLOYEE COMMENT SHEETS
          </p>

          <h3 style={titleStyle}>
            Comment Cards
          </h3>

          <p style={mutedStyle}>
            Approved comment cards attached to this probationary record.
          </p>
        </div>

        <span style={countStyle}>
          {cards.length}
        </span>
      </div>

      {loading ? (
        <div style={emptyStyle}>
          Loading comment cards...
        </div>
      ) : error ? (
        <div style={errorStyle}>
          {error}
        </div>
      ) : cards.length ===
        0 ? (
        <div style={emptyStyle}>
          No approved comment cards have been added yet.
        </div>
      ) : (
        <div style={listStyle}>
          {cards.map(
            (card) => (
              <article
                key={card.id}
                style={cardStyle}
              >
                <div style={cardHeaderStyle}>
                  <div>
                    <strong>
                      {card.submitter_rank}{" "}
                      {card.submitter_name}
                    </strong>

                    <p style={mutedStyle}>
                      {formatDate(
                        card.observed_at
                      )}
                      {" · "}
                      {card.submission_type ===
                      "guest"
                        ? "Guest submission"
                        : "Authenticated submission"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void copyBBCode(
                        card
                      )
                    }
                    style={copyButtonStyle}
                  >
                    {copiedId ===
                    card.id
                      ? "Copied!"
                      : "Copy BBCode"}
                  </button>
                </div>

                <blockquote style={quoteStyle}>
                  {card.overall_comments}
                </blockquote>
              </article>
            )
          )}
        </div>
      )}
    </section>
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

const panelStyle = {
  padding: "22px",
  marginTop: "20px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "16px",
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const titleStyle = {
  margin: "0 0 5px",
};

const mutedStyle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "12px",
};

const countStyle = {
  width: "34px",
  height: "34px",
  display: "grid",
  placeItems: "center",
  color: "#dbeafe",
  backgroundColor: "#1e3a8a",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontWeight: 900,
};

const listStyle = {
  display: "grid",
  gap: "12px",
};

const cardStyle = {
  padding: "15px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  alignItems: "flex-start",
};

const quoteStyle = {
  padding: "13px",
  margin: "13px 0 0",
  color: "#dbeafe",
  backgroundColor: "#111827",
  borderLeft: "3px solid #3b82f6",
  borderRadius: "7px",
  whiteSpace: "pre-wrap" as const,
};

const copyButtonStyle = {
  padding: "8px 10px",
  color: "#e2e8f0",
  backgroundColor: "#334155",
  border: "1px solid #475569",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const emptyStyle = {
  padding: "22px",
  color: "#64748b",
  textAlign: "center" as const,
};

const errorStyle = {
  padding: "12px",
  color: "#fecaca",
  backgroundColor: "rgba(127,29,29,.3)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
};