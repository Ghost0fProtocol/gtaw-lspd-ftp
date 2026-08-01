"use client";

import {
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type InitialRole =
  | "Probationary Officer"
  | "Field Training Officer";

type Props = {
  user: any;
  onComplete: (
    selectedRole: InitialRole
  ) => void;
};

export default function ChooseInitialRole({
  user,
  onComplete,
}: Props) {
  const [
    selectedRole,
    setSelectedRole,
  ] = useState<
    InitialRole | null
  >(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function continueWithRole() {
    if (!selectedRole) {
      setError(
        "Please choose how you are joining the FTP Portal."
      );

      return;
    }

    setSaving(true);
    setError("");

    try {
      if (
        selectedRole ===
        "Probationary Officer"
      ) {
        const {
          error:
            updateError,
        } = await supabase
          .from("profiles")
          .update({
            role:
              "Probationary Officer",
            requested_role:
              "Probationary Officer",
            role_request_status:
              "approved",
          })
          .eq(
            "id",
            user.id
          );

        if (updateError) {
          throw updateError;
        }
      } else {
        const {
          error:
            updateError,
        } = await supabase
          .from("profiles")
          .update({
            requested_role:
              "Field Training Officer",
            role_request_status:
              "draft",
          })
          .eq(
            "id",
            user.id
          );

        if (updateError) {
          throw updateError;
        }
      }

      onComplete(
        selectedRole
      );
    } catch (saveError) {
      console.error(
        "INITIAL ROLE SELECTION ERROR",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Your role selection could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={badgeStyle}>
          FIRST-TIME SETUP
        </div>

        <h1 style={titleStyle}>
          How are you joining the
          FTP Portal?
        </h1>

        <p style={subTextStyle}>
          Choose the option that
          matches your current role.
          This determines the next
          stage of your setup.
        </p>

        <div style={optionsStyle}>
          <button
            type="button"
            onClick={() => {
              setSelectedRole(
                "Probationary Officer"
              );

              setError("");
            }}
            disabled={saving}
            style={{
              ...roleCardStyle,
              ...(selectedRole ===
              "Probationary Officer"
                ? selectedRoleCardStyle
                : {}),
            }}
          >
            <div style={iconStyle}>
              P1
            </div>

            <div>
              <h2 style={roleTitleStyle}>
                Probationary Officer
              </h2>

              <p
                style={
                  roleDescriptionStyle
                }
              >
                Create your official
                FTP notebook and begin
                recording your field
                training progress.
              </p>

              <div style={pathStyle}>
                Personal Details
                {" → "}
                Create Notebook
                {" → "}
                My Notebook
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole(
                "Field Training Officer"
              );

              setError("");
            }}
            disabled={saving}
            style={{
              ...roleCardStyle,
              ...(selectedRole ===
              "Field Training Officer"
                ? selectedRoleCardStyle
                : {}),
            }}
          >
            <div style={iconStyle}>
              FTO
            </div>

            <div>
              <h2 style={roleTitleStyle}>
                Field Training Officer
              </h2>

              <p
                style={
                  roleDescriptionStyle
                }
              >
                Request FTO access and
                import your existing
                forum FTO file using
                its BBCode.
              </p>

              <div style={pathStyle}>
                Personal Details
                {" → "}
                Import FTO File
                {" → "}
                Await Approval
              </div>
            </div>
          </button>
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={
            continueWithRole
          }
          disabled={
            saving ||
            !selectedRole
          }
          style={{
            ...continueButtonStyle,
            opacity:
              saving ||
              !selectedRole
                ? 0.6
                : 1,
            cursor:
              saving ||
              !selectedRole
                ? "not-allowed"
                : "pointer",
          }}
        >
          {saving
            ? "Saving Selection..."
            : selectedRole
              ? `Continue as ${selectedRole}`
              : "Choose a Role to Continue"}
        </button>

        <p style={helpTextStyle}>
          FTO access is not granted
          automatically. Existing
          FTOs must submit their file
          for review before receiving
          FTO permissions.
        </p>
      </div>
    </main>
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
  maxWidth: "820px",
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
  marginTop: 0,
  marginBottom: "12px",
};

const subTextStyle = {
  maxWidth: "650px",
  marginBottom: "26px",
  color: "#94a3b8",
  lineHeight: 1.6,
};

const optionsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const roleCardStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "16px",
  padding: "22px",
  color: "white",
  textAlign: "left" as const,
  backgroundColor: "#0f172a",
  border:
    "2px solid #334155",
  borderRadius: "12px",
  cursor: "pointer",
};

const selectedRoleCardStyle = {
  borderColor: "#3b82f6",
  backgroundColor:
    "rgba(37, 99, 235, 0.12)",
  boxShadow:
    "0 0 0 3px rgba(59, 130, 246, 0.15)",
};

const iconStyle = {
  minWidth: "54px",
  height: "54px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.2)",
  border:
    "1px solid #2563eb",
  borderRadius: "10px",
  fontWeight: 900,
};

const roleTitleStyle = {
  margin:
    "0 0 8px",
  fontSize: "20px",
};

const roleDescriptionStyle = {
  margin:
    "0 0 14px",
  color: "#cbd5e1",
  lineHeight: 1.5,
};

const pathStyle = {
  color: "#93c5fd",
  fontSize: "13px",
  fontWeight: 700,
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

const continueButtonStyle = {
  width: "100%",
  padding: "14px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: 800,
};

const helpTextStyle = {
  margin:
    "16px 0 0",
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: 1.5,
  textAlign: "center" as const,
};