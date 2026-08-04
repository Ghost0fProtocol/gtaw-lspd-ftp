"use client";

import {
  FormEvent,
  useState,
} from "react";

import { login } from "../lib/auth";

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
      <div style={cardStyle}>
        <div style={brandMarkStyle}>
          FTP
        </div>

        <h1 style={titleStyle}>
          FTP Training Portal
        </h1>

        <p style={subTextStyle}>
          Sign in to continue
        </p>

        <form
          onSubmit={
            handleLogin
          }
        >
          <label style={fieldStyle}>
            <span style={labelStyle}>
              Character Name
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
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>
              Password
            </span>

            <input
              type="password"
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
              style={inputStyle}
            />
          </label>

          {error && (
            <div
              role="alert"
              style={errorStyle}
            >
              {error}
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
                  ? 0.7
                  : 1,
              cursor:
                signingIn
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {signingIn
              ? "Signing In..."
              : "Sign In"}
          </button>
        </form>

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
                ? 0.7
                : 1,
            cursor:
              signingIn
                ? "not-allowed"
                : "pointer",
          }}
        >
          Create Account
        </button>
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  padding: "24px",
  color: "white",
  background:
    "radial-gradient(circle at top, #172554 0%, #0f172a 46%, #020617 100%)",
  fontFamily:
    "Arial, sans-serif",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  padding: "40px",
  backgroundColor:
    "rgba(30, 41, 59, 0.96)",
  borderRadius: "16px",
  border:
    "1px solid #334155",
  boxShadow:
    "0 24px 70px rgba(0, 0, 0, 0.34)",
};

const brandMarkStyle = {
  width: "48px",
  height: "48px",
  display: "grid",
  placeItems: "center",
  margin: "0 auto 18px",
  color: "#dbeafe",
  background:
    "linear-gradient(135deg, #2563eb, #1d4ed8)",
  border:
    "1px solid #60a5fa",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.08em",
};

const titleStyle = {
  margin: "0 0 8px",
  textAlign:
    "center" as const,
};

const subTextStyle = {
  margin: "0 0 24px",
  color: "#94a3b8",
  textAlign:
    "center" as const,
};

const fieldStyle = {
  display: "grid",
  gap: "7px",
  marginBottom: "14px",
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
  padding: "13px",
  backgroundColor:
    "#0f172a",
  color: "white",
  border:
    "1px solid #475569",
  borderRadius: "8px",
};

const errorStyle = {
  padding: "12px",
  marginBottom: "14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
  fontSize: "13px",
  lineHeight: 1.45,
};

const buttonStyle = {
  width: "100%",
  padding: "13px",
  backgroundColor:
    "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontWeight:
    "bold" as const,
};

const secondaryButtonStyle = {
  ...buttonStyle,
  marginTop: "12px",
  backgroundColor:
    "#475569",
};