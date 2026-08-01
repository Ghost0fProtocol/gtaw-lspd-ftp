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
    bbcode,
    setBBCode,
  ] = useState("");

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
    loadDetails();
  }, [user]);

  async function loadDetails() {
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
          work_number
        `)
        .eq(
          "id",
          user.id
        )
        .single();

      if (profileError) {
        throw profileError;
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
          user.id
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
      }
    } catch (loadError) {
      console.error(
        "LOAD FTO IMPORT ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Your FTO import details could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitRequest() {
    setError("");

    if (
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
              user.id,
            original_bbcode:
              bbcode.trim(),
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
          user.id
        );

      if (
        profileUpdateError
      ) {
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
        submitError instanceof Error
          ? submitError.message
          : "Your FTO request could not be submitted."
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
          Import Your Existing FTO
          File
        </h1>

        <p style={subTextStyle}>
          Paste the full BBCode from
          your current forum FTO file.
          It will be stored for review
          and later converted into the
          portal.
        </p>

        <div style={detailsStyle}>
          <Detail
            label="Officer"
            value={
              profile?.name ??
              user.name ??
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

        {isPending && (
          <div style={pendingStyle}>
            Your FTO request is already
            pending review. You may
            update and resubmit the
            BBCode below if needed.
          </div>
        )}

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
          disabled={submitting}
          style={textareaStyle}
        />

        <p style={helpTextStyle}>
          Paste the complete file,
          including all BBCode tags.
          The original text will be
          preserved exactly as
          submitted.
        </p>

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
            onClick={
              submitRequest
            }
            disabled={submitting}
            style={{
              ...buttonStyle,
              opacity:
                submitting
                  ? 0.7
                  : 1,
              cursor:
                submitting
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitting
              ? "Submitting Request..."
              : isPending
                ? "Update FTO Request"
                : "Submit FTO Request"}
          </button>
        </div>
      </div>
    </main>
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
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  color: "white",
  backgroundColor: "#db2777",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: 800,
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