"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Props = {
  user: any;
  onSubmitted: () => void;
  onSkip?: () => void;
};

type FTOEntryMode =
  | ""
  | "legacy"
  | "new";

type Profile = {
  id: string;
  name: string | null;
  rank: string | null;
  badge_number: string | null;
  work_number: string | null;
};

export default function FTOImport({
  user,
  onSubmitted,
  onSkip,
}: Props) {
  const [
    profile,
    setProfile,
  ] = useState<Profile | null>(
    null
  );

  const [
    profileId,
    setProfileId,
  ] = useState("");

  const [
    bbcode,
    setBBCode,
  ] = useState("");

  const [
    entryMode,
    setEntryMode,
  ] = useState<FTOEntryMode>(
    ""
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    existingRequest,
    setExistingRequest,
  ] = useState<any>(null);

  useEffect(() => {
    void loadDetails();
  }, [
    user?.id,
  ]);

  async function resolveCurrentUserId() {
    const {
      data,
      error:
        authError,
    } =
      await supabase.auth.getUser();

    if (authError) {
      throw authError;
    }

    const authenticatedUserId =
      data.user?.id ?? "";

    const suppliedUserId =
      typeof user?.id ===
        "string"
        ? user.id.trim()
        : "";

    const resolvedUserId =
      authenticatedUserId ||
      suppliedUserId;

    if (!resolvedUserId) {
      throw new Error(
        "Your login account could not be identified. Please log out and sign in again."
      );
    }

    return resolvedUserId;
  }

  async function loadDetails() {
    setLoading(true);
    setError("");
    setProfile(null);
    setExistingRequest(null);

    try {
      const resolvedUserId =
        await resolveCurrentUserId();

      setProfileId(
        resolvedUserId
      );

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
          work_number
        `)
        .eq(
          "id",
          resolvedUserId
        )
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error(
          "Your FTP profile no longer exists. This can happen after a test account is deleted. Please log out and sign in with an active account."
        );
      }

      setProfile(
        profileData
      );

      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from(
          "fto_import_requests"
        )
        .select("*")
        .eq(
          "profile_id",
          resolvedUserId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (requestError) {
        throw requestError;
      }

      if (requestData) {
        setExistingRequest(
          requestData
        );

        setBBCode(
          requestData.original_bbcode ??
          ""
        );

        setEntryMode(
          requestData.request_type ===
            "new_fto"
            ? "new"
            : "legacy"
        );
      }
    } catch (loadError) {
      console.error(
        "LOAD FTO IMPORT ERROR",
        loadError
      );

      setError(
        getReadableError(
          loadError,
          "Your FTO import details could not be loaded."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest() {
    setError("");

    if (!profileId) {
      setError(
        "Your login account could not be identified. Please log out and sign in again."
      );
      return;
    }

    if (!profile) {
      setError(
        "Your FTP profile could not be loaded. Please log out and sign in again."
      );
      return;
    }

    if (!entryMode) {
      setError(
        "Choose whether you are importing an existing FTO file or starting as a new FTO."
      );
      return;
    }

    if (
      entryMode === "legacy" &&
      !bbcode.trim()
    ) {
      setError(
        "Please paste your current FTO file BBCode."
      );
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: request,
        error: requestError,
      } = await supabase
        .from(
          "fto_import_requests"
        )
        .upsert(
          {
            profile_id:
              profileId,
            request_type:
              entryMode ===
                "new"
                ? "new_fto"
                : "legacy_import",
            original_bbcode:
              entryMode ===
                "legacy"
                ? bbcode.trim()
                : "",
            parsed_data:
              {},
            status:
              "pending",
            reviewed_by:
              null,
            reviewed_at:
              null,
            reviewer_notes:
              null,
          },
          {
            onConflict:
              "profile_id",
          }
        )
        .select("*")
        .single();

      if (requestError) {
        throw requestError;
      }

      const {
        error: profileUpdateError,
      } = await supabase
        .from("profiles")
        .update({
          requested_role:
            "Field Training Officer",
          role_request_status:
            "pending",
        })
        .eq(
          "id",
          profileId
        );

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      setExistingRequest(
        request
      );

      onSubmitted();
    } catch (submitError) {
      console.error(
        "SUBMIT FTO IMPORT ERROR",
        submitError
      );

      setError(
        getReadableError(
          submitError,
          "Your FTO request could not be submitted."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <p>
          Loading FTO import...
        </p>
      </main>
    );
  }

  const isPending =
    existingRequest?.status ===
      "pending";

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={badgeStyle}>
          FTO ROLE REQUEST
        </div>

        <h1 style={titleStyle}>
          Join the Field Training Program
        </h1>

        <p style={subTextStyle}>
          Choose whether you are importing an existing qualified FTO file or starting as a new probationary FTO.
        </p>

        <div style={detailsStyle}>
          <Detail
            label="Officer"
            value={
              profile?.name ??
              user?.name ??
              "Unknown"
            }
          />

          <Detail
            label="Rank"
            value={
              profile?.rank ??
              "Not Assigned"
            }
          />

          <Detail
            label="Badge / Serial"
            value={
              profile?.badge_number ??
              "Not Assigned"
            }
          />

          <Detail
            label="Work Number"
            value={
              profile?.work_number ??
              "Not Assigned"
            }
          />
        </div>

        <div style={modeGridStyle}>
          <button
            type="button"
            onClick={() =>
              setEntryMode(
                "legacy"
              )
            }
            disabled={submitting}
            style={{
              ...modeCardStyle,
              ...(entryMode ===
              "legacy"
                ? selectedModeCardStyle
                : {}),
            }}
          >
            <strong>
              Import Existing FTO File
            </strong>

            <span style={modeDescriptionStyle}>
              For an already-qualified FTO with a legacy forum file. Approval creates a qualified FTO record.
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEntryMode(
                "new"
              );
              setBBCode("");
            }}
            disabled={submitting}
            style={{
              ...modeCardStyle,
              ...(entryMode ===
              "new"
                ? selectedModeCardStyle
                : {}),
            }}
          >
            <strong>
              Start as a New FTO
            </strong>

            <span style={modeDescriptionStyle}>
              No legacy BBCode required. Approval creates a blank FTO file and starts the three-patrol probation process.
            </span>
          </button>
        </div>

        {isPending && (
          <div style={pendingStyle}>
            Your FTO request is already
            pending review. You may
            update and resubmit the
            BBCode below if needed.
          </div>
        )}

        {entryMode ===
          "legacy" && (
          <>
            <label style={labelStyle}>
              Existing FTO File BBCode
            </label>

            <textarea
              value={bbcode}
              onChange={(event) =>
                setBBCode(
                  event.target.value
                )
              }
              placeholder="[font=Arial]Paste your complete FTO file BBCode here...[/font]"
              disabled={
                submitting ||
                !profile
              }
              style={textareaStyle}
            />

            <p style={helpTextStyle}>
              Paste the complete file, including all BBCode tags. The original text will be preserved exactly as submitted.
            </p>
          </>
        )}

        {entryMode ===
          "new" && (
          <div style={newFTOInfoStyle}>
            <strong>
              New FTO probation
            </strong>

            <p style={newFTOInfoTextStyle}>
              Your application will be reviewed without a legacy file. Once approved, a blank FTO file will be created and you will begin FTO probation with three patrols and a Final Evaluation.
            </p>
          </div>
        )}

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        <div style={buttonRowStyle}>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={submitting}
              style={skipButtonStyle}
            >
              Skip FTO Import
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              void submitRequest()
            }
            disabled={
              submitting ||
              !profile
            }
            style={{
              ...buttonStyle,
              opacity:
                submitting ||
                !profile
                  ? 0.7
                  : 1,
              cursor:
                submitting ||
                !profile
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitting
              ? "Submitting Request..."
              : isPending
                ? "Update FTO Request"
                : entryMode ===
                    "new"
                  ? "Submit New FTO Application"
                  : "Submit FTO Import Request"}
          </button>
        </div>
      </div>
    </main>
  );
}

function getReadableError(
  error: unknown,
  fallback: string
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message =
      String(
        (
          error as {
            message?: unknown;
          }
        ).message ??
          ""
      );

    if (message) {
      return message;
    }
  }

  return fallback;
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
      <p style={detailLabelStyle}>
        {label}
      </p>

      <p style={detailValueStyle}>
        {value}
      </p>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  color: "white",
  backgroundColor: "#0f172a",
  fontFamily:
    "Arial, sans-serif",
};

const cardStyle = {
  width: "100%",
  maxWidth: "760px",
  padding: "40px",
  backgroundColor: "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "16px",
};

const badgeStyle = {
  display: "inline-block",
  padding: "6px 10px",
  marginBottom: "14px",
  color: "#fbcfe8",
  backgroundColor:
    "rgba(190, 24, 93, 0.16)",
  border:
    "1px solid #db2777",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const titleStyle = {
  marginTop: 0,
  marginBottom: "12px",
};

const subTextStyle = {
  marginBottom: "24px",
  color: "#94a3b8",
  lineHeight: 1.6,
};

const detailsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "18px",
  padding: "20px",
  marginBottom: "22px",
  backgroundColor: "#0f172a",
  borderRadius: "10px",
};

const detailLabelStyle = {
  margin: "0 0 5px",
  color: "#94a3b8",
  fontSize: "13px",
};

const detailValueStyle = {
  margin: 0,
  fontWeight: 700,
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: 700,
};

const textareaStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  minHeight: "360px",
  padding: "14px",
  color: "white",
  backgroundColor: "#0f172a",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
  fontFamily: "monospace",
  lineHeight: 1.5,
};

const helpTextStyle = {
  margin:
    "10px 0 18px",
  color: "#94a3b8",
  fontSize: "13px",
};

const pendingStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#fde68a",
  backgroundColor:
    "rgba(120, 53, 15, 0.3)",
  border:
    "1px solid #a16207",
  borderRadius: "8px",
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
  lineHeight: 1.5,
};

const buttonRowStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const skipButtonStyle = {
  flex: 1,
  minWidth: "170px",
  padding: "14px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: 800,
  cursor: "pointer",
};

const buttonStyle = {
  flex: 2,
  minWidth: "220px",
  padding: "14px",
  color: "white",
  backgroundColor: "#db2777",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: 800,
};

const modeGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "12px",
  marginBottom: "22px",
};

const modeCardStyle = {
  display: "grid",
  gap: "8px",
  padding: "18px",
  color: "#cbd5e1",
  textAlign: "left" as const,
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "10px",
  cursor: "pointer",
};

const selectedModeCardStyle = {
  color: "white",
  border: "1px solid #3b82f6",
  boxShadow:
    "inset 3px 0 0 #3b82f6",
};

const modeDescriptionStyle = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: 1.5,
};

const newFTOInfoStyle = {
  padding: "16px",
  marginBottom: "18px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30, 64, 175, 0.22)",
  border: "1px solid #2563eb",
  borderRadius: "9px",
};

const newFTOInfoTextStyle = {
  margin: "7px 0 0",
  color: "#cbd5e1",
  lineHeight: 1.55,
};