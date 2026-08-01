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
        setError(
          "Invalid character name or password"
        );

        return;
      }

      onLogin(user);
    } catch (loginError) {
      console.error(
        "LOGIN ERROR",
        loginError
      );

      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in."
      );
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1>
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
          <input
            autoFocus
            autoComplete="username"
            placeholder="Character Name"
            value={name}
            onChange={(event) =>
              setName(
                event.target.value
              )
            }
            disabled={
              signingIn
            }
            style={inputStyle}
          />

          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            disabled={
              signingIn
            }
            style={inputStyle}
          />

          {error && (
            <p style={errorStyle}>
              {error}
            </p>
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
            ...buttonStyle,
            marginTop:
              "12px",
            backgroundColor:
              "#475569",
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
  backgroundColor:
    "#0f172a",
  color: "white",
  fontFamily:
    "Arial, sans-serif",
  padding: "24px",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  padding: "40px",
  backgroundColor:
    "#1e293b",
  borderRadius: "16px",
  border:
    "1px solid #334155",
  textAlign:
    "center" as const,
};

const subTextStyle = {
  color: "#94a3b8",
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "13px",
  marginBottom: "14px",
  backgroundColor:
    "#0f172a",
  color: "white",
  border:
    "1px solid #475569",
  borderRadius: "8px",
};

const errorStyle = {
  color: "#f87171",
  marginTop: "0",
  marginBottom: "14px",
};

const buttonStyle = {
  width: "100%",
  padding: "13px",
  backgroundColor:
    "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight:
    "bold" as const,
};