"use client";

import {
  useMemo,
  useState,
} from "react";

import CommentCardCentre from "./CommentCardCentre";
import OrientationReviewCentre from "./OrientationReviewCentre";
import RoleRequests from "./RoleRequests";

type Props = {
  user: any;
};

type ReviewArea =
  | "comment_cards"
  | "orientations"
  | "role_requests";

export default function ReviewCentre({
  user,
}: Props) {
  const [
    activeArea,
    setActiveArea,
  ] = useState<ReviewArea>(
    "comment_cards"
  );

  const tabs =
    useMemo(
      () => [
        {
          id:
            "comment_cards" as const,
          label:
            "Comment Cards",
          description:
            "Guest and authenticated submissions",
        },
        {
          id:
            "orientations" as const,
          label:
            "Orientation Reports",
          description:
            "Public Orientation Patrol submissions",
        },
        {
          id:
            "role_requests" as const,
          label:
            "Role Requests",
          description:
            "FTO applications and imported files",
        },
      ],
      []
    );

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>
            REVIEW &amp; GOVERNANCE
          </p>

          <h2 style={heroTitleStyle}>
            Review Centre
          </h2>

          <p style={heroTextStyle}>
            Review submissions and requests before they become part of the official FTP record.
          </p>
        </div>

        <div style={accessStyle}>
          <span style={accessLabelStyle}>
            CURRENT ACCESS
          </span>

          <strong>
            {user?.role ??
              "Unknown"}
          </strong>
        </div>
      </section>

      <section style={navigationStyle}>
        {tabs.map(
          (tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveArea(
                  tab.id
                )
              }
              style={{
                ...navigationButtonStyle,
                ...(activeArea ===
                tab.id
                  ? activeNavigationButtonStyle
                  : {}),
              }}
            >
              <strong>
                {tab.label}
              </strong>

              <span style={navigationDescriptionStyle}>
                {tab.description}
              </span>
            </button>
          )
        )}
      </section>

      <section>
        {activeArea ===
          "comment_cards" && (
          <CommentCardCentre
            user={user}
            embedded
          />
        )}

        {activeArea ===
          "orientations" && (
          <OrientationReviewCentre
            user={user}
          />
        )}

        {activeArea ===
          "role_requests" && (
          <RoleRequests
            user={user}
            embedded
          />
        )}
      </section>
    </div>
  );
}

const pageStyle = {
  display: "grid",
  gap: "20px",
};

const heroStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "26px",
  background:
    "linear-gradient(135deg, #111c33, #172554)",
  border:
    "1px solid #2b3b57",
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
  border:
    "1px solid #334155",
  borderRadius: "10px",
};

const accessLabelStyle = {
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: 800,
};

const navigationStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
};

const navigationButtonStyle = {
  display: "grid",
  gap: "6px",
  padding: "17px",
  color: "#cbd5e1",
  textAlign: "left" as const,
  backgroundColor: "#111827",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#29364c",
  borderRadius: "11px",
  cursor: "pointer",
};

const activeNavigationButtonStyle = {
  color: "white",
  backgroundColor: "#172554",
  borderColor: "#3b82f6",
  boxShadow:
    "inset 3px 0 0 #3b82f6",
};

const navigationDescriptionStyle = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: 1.45,
};