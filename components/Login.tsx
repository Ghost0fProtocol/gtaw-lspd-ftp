"use client";

import {
  FormEvent,
  useState,
} from "react";

import { login } from "../lib/auth";
import AppVersion from "./AppVersion";

type LoginProps = {
  onLogin: (
    user: any
  ) => void;

  onCreateAccount: () => void;
};

export default function Login({
  onLogin,
  onCreateAccount,
}: LoginProps) {
  const [
    name,
    setName,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    signingIn,
    setSigningIn,
  ] = useState(false);

  async function handleLogin(
    event?: FormEvent
  ) {
    event?.preventDefault();

    if (signingIn) {
      return;
    }

    setError("");

    if (!name.trim()) {
      setError(
        "Please enter your character name."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    setSigningIn(true);

    try {
      const user =
        await login(
          name.trim(),
          password
        );

      if (!user) {
        setPassword("");

        setError(
          "Incorrect character name or password."
        );

        return;
      }

      onLogin(user);
    } catch (loginError) {
      console.error(
        "LOGIN REQUEST ERROR",
        loginError
      );

      setPassword("");

      setError(
        "Unable to sign in right now. Please try again."
      );
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={backgroundGlowOneStyle} />
      <div style={backgroundGlowTwoStyle} />

      <section style={shellStyle}>
        <aside style={brandPanelStyle}>
          <div style={brandContentStyle}>
            <div style={logoWrapStyle}>
              <img
                src="/ftp-logo.png"
                alt="LSPD Field Training Program"
                style={logoStyle}
              />
            </div>

            <div>
              <p style={eyebrowStyle}>
                LOS SANTOS POLICE DEPARTMENT
              </p>

              <h1 style={brandTitleStyle}>
                Field Training Program
              </h1>

              <p style={brandTextStyle}>
                Secure access to training records, Daily Observation Reports, probation files and FTP management tools.
              </p>
            </div>

            <div style={brandFooterStyle}>
              <div style={brandDividerStyle} />

              <p style={brandMottoStyle}>
                FTP TRAINING PORTAL
              </p>

              <AppVersion
                style={brandVersionStyle}
              />
            </div>
          </div>
        </aside>

        <section style={loginPanelStyle}>
          <div style={loginHeaderStyle}>
            <p style={loginEyebrowStyle}>
              SECURE PORTAL
            </p>

            <h2 style={loginTitleStyle}>
              Welcome back
            </h2>

            <p style={loginTextStyle}>
              Sign in with your character account to continue.
            </p>
          </div>

          <form
            onSubmit={
              handleLogin
            }
            style={formStyle}
          >
            <label style={fieldStyle}>
              <span style={labelStyle}>
                Character Name
              </span>

              <div style={inputWrapStyle}>
                <span
                  aria-hidden="true"
                  style={inputIconStyle}
                >
                  ◇
                </span>

                <input
                  autoFocus
                  autoComplete="username"
                  value={name}
                  onChange={(event) => {
                    setName(
                      event.target.value
                    );

                    setError("");
                  }}
                  disabled={
                    signingIn
                  }
                  placeholder="e.g. Hayden Blackwood"
                  style={inputStyle}
                />
              </div>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>
                Password
              </span>

              <div style={inputWrapStyle}>
                <span
                  aria-hidden="true"
                  style={inputIconStyle}
                >
                  ◈
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(
                      event.target.value
                    );

                    setError("");
                  }}
                  disabled={
                    signingIn
                  }
                  placeholder="Enter your password"
                  style={{
                    ...inputStyle,
                    paddingRight: "58px",
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  disabled={
                    signingIn
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  style={passwordToggleStyle}
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>
              </div>
            </label>

            {error && (
              <div
                role="alert"
                style={errorStyle}
              >
                <strong>
                  Sign-in failed
                </strong>

                <span>
                  {error}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                signingIn
              }
              style={{
                ...buttonStyle,
                opacity:
                  signingIn
                    ? 0.72
                    : 1,
                cursor:
                  signingIn
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              <span>
                {signingIn
                  ? "Signing In..."
                  : "Sign In"}
              </span>

              {!signingIn && (
                <span
                  aria-hidden="true"
                  style={buttonArrowStyle}
                >
                  →
                </span>
              )}
            </button>
          </form>

          <div style={dividerRowStyle}>
            <div style={dividerLineStyle} />

            <span style={dividerTextStyle}>
              NEW TO FTP?
            </span>

            <div style={dividerLineStyle} />
          </div>

          <button
            type="button"
            onClick={
              onCreateAccount
            }
            disabled={
              signingIn
            }
            style={{
              ...secondaryButtonStyle,
              opacity:
                signingIn
                  ? 0.72
                  : 1,
              cursor:
                signingIn
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Create Account
          </button>

          <p style={supportTextStyle}>
            Access is restricted to authorised FTP personnel and probationary officers.
          </p>
        </section>
      </section>
    </main>
  );
}

const pageStyle = {
  position: "relative" as const,
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  padding: "32px",
  color: "white",
  background:
    "linear-gradient(145deg, #020617 0%, #0b1324 42%, #111c33 100%)",
  fontFamily:
    "Arial, sans-serif",
};

const backgroundGlowOneStyle = {
  position: "absolute" as const,
  top: "-180px",
  left: "-130px",
  width: "520px",
  height: "520px",
  background:
    "radial-gradient(circle, rgba(37, 99, 235, 0.2), transparent 68%)",
  pointerEvents: "none" as const,
};

const backgroundGlowTwoStyle = {
  position: "absolute" as const,
  right: "-220px",
  bottom: "-240px",
  width: "640px",
  height: "640px",
  background:
    "radial-gradient(circle, rgba(14, 165, 233, 0.12), transparent 70%)",
  pointerEvents: "none" as const,
};

const shellStyle = {
  position: "relative" as const,
  zIndex: 1,
  width: "100%",
  maxWidth: "980px",
  display: "grid",
  gridTemplateColumns:
    "minmax(300px, 0.9fr) minmax(380px, 1.1fr)",
  overflow: "hidden",
  backgroundColor:
    "rgba(15, 23, 42, 0.94)",
  border:
    "1px solid #334155",
  borderRadius: "20px",
  boxShadow:
    "0 34px 100px rgba(0, 0, 0, 0.48)",
  backdropFilter:
    "blur(18px)",
};

const brandPanelStyle = {
  minHeight: "610px",
  padding: "38px",
  background:
    "linear-gradient(160deg, rgba(17, 28, 51, 0.98), rgba(23, 37, 84, 0.98))",
  borderRight:
    "1px solid #334155",
};

const brandContentStyle = {
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent:
    "space-between",
  gap: "30px",
};

const logoWrapStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "flex-start",
};

const logoStyle = {
  width: "100%",
  maxWidth: "290px",
  height: "auto",
  objectFit: "contain" as const,
  filter:
    "drop-shadow(0 14px 28px rgba(0, 0, 0, 0.34))",
};

const eyebrowStyle = {
  margin: "0 0 10px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.14em",
};

const brandTitleStyle = {
  maxWidth: "420px",
  margin: "0 0 14px",
  fontSize: "32px",
  lineHeight: 1.08,
};

const brandTextStyle = {
  maxWidth: "430px",
  margin: 0,
  color: "#a8b6ca",
  fontSize: "15px",
  lineHeight: 1.7,
};

const brandFooterStyle = {
  display: "grid",
  gap: "8px",
};

const brandDividerStyle = {
  width: "58px",
  height: "2px",
  marginBottom: "5px",
  backgroundColor: "#3b82f6",
};

const brandMottoStyle = {
  margin: 0,
  color: "#dbeafe",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.13em",
};

const brandVersionStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: "12px",
};

const loginPanelStyle = {
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  padding: "48px",
  background:
    "linear-gradient(180deg, rgba(30, 41, 59, 0.88), rgba(15, 23, 42, 0.96))",
};

const loginHeaderStyle = {
  marginBottom: "30px",
};

const loginEyebrowStyle = {
  margin: "0 0 8px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.13em",
};

const loginTitleStyle = {
  margin: "0 0 9px",
  fontSize: "30px",
};

const loginTextStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.55,
};

const formStyle = {
  display: "grid",
  gap: "18px",
};

const fieldStyle = {
  display: "grid",
  gap: "8px",
};

const labelStyle = {
  color: "#dbe4f0",
  fontSize: "13px",
  fontWeight: 800,
};

const inputWrapStyle = {
  position: "relative" as const,
  display: "flex",
  alignItems: "center",
};

const inputIconStyle = {
  position: "absolute" as const,
  left: "14px",
  zIndex: 1,
  color: "#60a5fa",
  fontSize: "14px",
  pointerEvents: "none" as const,
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding:
    "14px 14px 14px 42px",
  color: "white",
  backgroundColor:
    "rgba(2, 6, 23, 0.58)",
  border:
    "1px solid #475569",
  borderRadius: "10px",
  outline: "none",
  fontSize: "14px",
};

const passwordToggleStyle = {
  position: "absolute" as const,
  right: "10px",
  padding: "7px 9px",
  color: "#93c5fd",
  backgroundColor:
    "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 800,
};

const errorStyle = {
  display: "grid",
  gap: "4px",
  padding: "13px 14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.3)",
  border:
    "1px solid #991b1b",
  borderRadius: "9px",
  fontSize: "13px",
  lineHeight: 1.45,
};

const buttonStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  gap: "10px",
  padding: "14px",
  marginTop: "2px",
  color: "white",
  background:
    "linear-gradient(135deg, #2563eb, #1d4ed8)",
  border: "none",
  borderRadius: "10px",
  boxShadow:
    "0 12px 24px rgba(37, 99, 235, 0.22)",
  fontSize: "15px",
  fontWeight: 900,
};

const buttonArrowStyle = {
  fontSize: "17px",
  lineHeight: 1,
};

const dividerRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  margin: "26px 0 16px",
};

const dividerLineStyle = {
  height: "1px",
  flex: 1,
  backgroundColor: "#334155",
};

const dividerTextStyle = {
  color: "#64748b",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.1em",
  whiteSpace: "nowrap" as const,
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "13px",
  color: "#e2e8f0",
  backgroundColor:
    "rgba(71, 85, 105, 0.66)",
  border:
    "1px solid #64748b",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: 900,
};

const supportTextStyle = {
  margin: "18px 0 0",
  color: "#64748b",
  textAlign: "center" as const,
  fontSize: "11px",
  lineHeight: 1.55,
};