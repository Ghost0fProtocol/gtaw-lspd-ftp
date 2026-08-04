"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Props = {
  user: any;
  onComplete: (
    updatedUser: any
  ) => void;
  onLogout: () => Promise<void>;
};

type Profile = {
  id: string;
  name: string | null;
  rank: string | null;
  role: string | null;
  profile_complete: boolean | null;
  must_change_password: boolean | null;
  [key: string]: unknown;
};

export default function ForcePasswordChange({
  user,
  onComplete,
  onLogout,
}: Props) {
  const [
    profile,
    setProfile,
  ] = useState<Profile | null>(
    null
  );

  const [
    loadingProfile,
    setLoadingProfile,
  ] = useState(true);

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const passwordValid =
    newPassword.length >= 6;

  const passwordsMatch =
    newPassword.length > 0 &&
    newPassword ===
      confirmPassword;

  useEffect(() => {
    void loadCurrentProfile();
  }, []);

  async function loadCurrentProfile() {
    setLoadingProfile(true);
    setError("");

    try {
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (
        authError ||
        !authData.user
      ) {
        throw new Error(
          "Your login session could not be verified. Please log in again."
        );
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          authData.user.id
        )
        .single();

      if (
        profileError ||
        !profileData
      ) {
        throw new Error(
          "Your account profile could not be loaded. Please contact FTP Staff."
        );
      }

      setProfile(
        profileData as Profile
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Your account profile could not be loaded."
      );
    } finally {
      setLoadingProfile(false);
    }
  }

  async function submitPassword(
    event: FormEvent
  ) {
    event.preventDefault();
    setError("");

    if (!profile?.id) {
      setError(
        "Your account profile is not ready. Please reload the page or log in again."
      );
      return;
    }

    if (!passwordValid) {
      setError(
        "Your password must be at least 6 characters long."
      );
      return;
    }

    if (!passwordsMatch) {
      setError(
        "The passwords do not match."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        error: passwordError,
      } =
        await supabase.auth.updateUser({
          password:
            newPassword,
        });

      if (passwordError) {
        throw passwordError;
      }

      const {
        data: updatedProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .update({
          must_change_password:
            false,
        })
        .eq(
          "id",
          profile.id
        )
        .select("*")
        .single();

      if (
        profileError ||
        !updatedProfile
      ) {
        throw new Error(
          "Your password was changed, but the portal could not finish updating your account. Contact FTP Staff."
        );
      }

      setNewPassword("");
      setConfirmPassword("");

      onComplete({
        ...user,
        ...updatedProfile,
        must_change_password:
          false,
      });
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "";

      if (
        message
          .toLowerCase()
          .includes(
            "different from the old password"
          )
      ) {
        setError(
          "Your new password must be different from the temporary password."
        );
      } else {
        setError(
          message ||
          "Your password could not be changed."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadingProfile) {
    return (
      <main style={pageStyle}>
        <section style={cardStyle}>
          Loading account security...
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={lockMarkStyle}>
          FTP
        </div>

        <p style={eyebrowStyle}>
          ACCOUNT SECURITY
        </p>

        <h1 style={titleStyle}>
          Choose a New Password
        </h1>

        <p style={descriptionStyle}>
          You signed in using a temporary
          password issued by FTP Staff.
          You must replace it before
          accessing the portal.
        </p>

        <div style={identityStyle}>
          <span>
            Signed in as
          </span>

          <strong>
            {profile?.name ??
              "Unknown User"}
          </strong>
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        <form
          onSubmit={
            submitPassword
          }
          style={formStyle}
        >
          <label style={fieldStyle}>
            <span style={labelStyle}>
              New Password
            </span>

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={newPassword}
              onChange={(event) => {
                setNewPassword(
                  event.target.value
                );
                setError("");
              }}
              autoComplete="new-password"
              disabled={saving}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>
              Confirm New Password
            </span>

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={
                confirmPassword
              }
              onChange={(event) => {
                setConfirmPassword(
                  event.target.value
                );
                setError("");
              }}
              autoComplete="new-password"
              disabled={saving}
              style={inputStyle}
            />
          </label>

          <label style={showPasswordStyle}>
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) =>
                setShowPassword(
                  event.target.checked
                )
              }
              disabled={saving}
            />

            <span>
              Show passwords
            </span>
          </label>

          <button
            type="submit"
            disabled={
              saving ||
              !profile?.id ||
              !passwordValid ||
              !passwordsMatch
            }
            style={{
              ...primaryButtonStyle,
              opacity:
                saving ||
                !profile?.id ||
                !passwordValid ||
                !passwordsMatch
                  ? 0.55
                  : 1,
              cursor:
                saving ||
                  !profile?.id ||
                  !passwordValid ||
                  !passwordsMatch
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {saving
              ? "Changing Password..."
              : "Set New Password"}
          </button>

          <button
            type="button"
            onClick={() =>
              void onLogout()
            }
            disabled={saving}
            style={logoutButtonStyle}
          >
            Logout
          </button>
        </form>

        <p style={footerStyle}>
          Your new password must contain
          at least 6 characters.
        </p>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  color: "white",
  background:
    "radial-gradient(circle at top, #172554 0%, #0f172a 42%, #020617 100%)",
  fontFamily:
    "Arial, sans-serif",
};

const cardStyle = {
  width: "100%",
  maxWidth: "520px",
  padding: "34px",
  backgroundColor:
    "rgba(15, 23, 42, 0.96)",
  border:
    "1px solid #334155",
  borderRadius: "18px",
  boxShadow:
    "0 28px 80px rgba(0, 0, 0, 0.42)",
};

const lockMarkStyle = {
  width: "50px",
  height: "50px",
  display: "grid",
  placeItems: "center",
  marginBottom: "20px",
  color: "#dbeafe",
  background:
    "linear-gradient(135deg, #2563eb, #1d4ed8)",
  border:
    "1px solid #60a5fa",
  borderRadius: "13px",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const titleStyle = {
  margin: "0 0 10px",
  fontSize: "29px",
};

const descriptionStyle = {
  margin: "0 0 20px",
  color: "#94a3b8",
  lineHeight: 1.6,
};

const identityStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: "14px",
  padding: "13px",
  marginBottom: "18px",
  color: "#cbd5e1",
  backgroundColor: "#111827",
  border:
    "1px solid #334155",
  borderRadius: "9px",
  fontSize: "13px",
};

const formStyle = {
  display: "grid",
  gap: "15px",
};

const fieldStyle = {
  display: "grid",
  gap: "7px",
};

const labelStyle = {
  color: "#cbd5e1",
  fontSize: "13px",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "12px",
  color: "white",
  backgroundColor: "#020617",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  fontSize: "15px",
};

const showPasswordStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#94a3b8",
  fontSize: "12px",
  cursor: "pointer",
};

const primaryButtonStyle = {
  padding: "13px",
  color: "white",
  backgroundColor: "#2563eb",
  border:
    "1px solid #3b82f6",
  borderRadius: "8px",
  fontWeight: 900,
};

const logoutButtonStyle = {
  padding: "11px",
  color: "#cbd5e1",
  backgroundColor: "#1e293b",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const errorStyle = {
  padding: "13px",
  marginBottom: "16px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
  lineHeight: 1.5,
};

const footerStyle = {
  margin: "18px 0 0",
  color: "#64748b",
  textAlign:
    "center" as const,
  fontSize: "11px",
  lineHeight: 1.5,
};