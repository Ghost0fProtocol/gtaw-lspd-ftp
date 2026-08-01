"use client";

import {
  FormEvent,
  useState,
} from "react";

import { createAccount } from "../lib/auth";

type Props = {
  onBack: () => void;
};

export default function CreateAccount({
  onBack,
}: Props) {
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
    creating,
    setCreating,
  ] = useState(false);

  async function submit(
    event?: FormEvent
  ) {
    event?.preventDefault();

    if (creating) {
      return;
    }

    setError("");

    if (
      name.trim() === "" ||
      password.trim() === ""
    ) {
      setError(
        "Please fill in all fields."
      );

      return;
    }

    if (
      password.length < 6
    ) {
      setError(
        "Password is too short. Please use at least 6 characters."
      );

      return;
    }

    setCreating(true);

    try {
      await createAccount(
        name.trim(),
        password
      );

      alert(
        "Account created!"
      );

      onBack();
    } catch (error) {
      console.error(
        "CREATE ACCOUNT ERROR",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Account creation failed. Please try again."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1>
          Create Account
        </h1>

        <p style={subTextStyle}>
          Choose whether you are
          joining as a Probationary
          Officer or requesting Field
          Training Officer access
          after creating your account.
        </p>

        <form
          onSubmit={
            submit
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
            disabled={creating}
            style={inputStyle}
          />

          <input
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            disabled={creating}
            style={inputStyle}
          />

          {error && (
            <p style={errorStyle}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              ...buttonStyle,
              opacity:
                creating
                  ? 0.7
                  : 1,
              cursor:
                creating
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {creating
              ? "Creating Account..."
              : "Create Account"}
          </button>
        </form>

        <button
          type="button"
          onClick={onBack}
          disabled={creating}
          style={{
            ...buttonStyle,
            marginTop: "12px",
            backgroundColor:
              "#475569",
            opacity:
              creating
                ? 0.7
                : 1,
            cursor:
              creating
                ? "not-allowed"
                : "pointer",
          }}
        >
          Back
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
  lineHeight: 1.5,
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
};