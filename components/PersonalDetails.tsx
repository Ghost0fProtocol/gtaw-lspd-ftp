"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  user: any;
  onComplete: () => void;
};

const ranks = [
  "Police Officer I",
  "Field Training Officer",
  "Field Training Manager",
  "Field Training Supervisor",
  "LSPD STAFF",
];

export default function PersonalDetails({
  user,
  onComplete,
}: Props) {
  const [badge, setBadge] = useState("");
  const [workNumber, setWorkNumber] = useState("");
  const [rank, setRank] = useState("Police Officer I");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setError("");
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(
          "PROFILE LOAD ERROR",
          error
        );

        setError(error.message);
        setLoading(false);

        return;
      }

      setBadge(
        data.badge_number || ""
      );

      setWorkNumber(
        data.work_number || ""
      );

      setRank(
        data.rank || "Police Officer I"
      );

      setLoading(false);
    }

    loadProfile();
  }, [user]);

  async function saveDetails() {
    setError("");
    setSuccess("");

    if (!badge.trim()) {
      setError(
        "Please enter your badge or serial number."
      );

      return;
    }

    if (!workNumber.trim()) {
      setError(
        "Please enter your work number."
      );

      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        badge_number: badge.trim(),
        work_number: workNumber.trim(),
        rank,
        profile_complete: true,
      })
      .eq("id", user.id);

    if (error) {
      console.error(
        "PROFILE UPDATE ERROR",
        error
      );

      setError(error.message);
      setSaving(false);

      return;
    }

    setSuccess(
      "Personal details updated successfully!"
    );

    setSaving(false);

    setTimeout(() => {
      setSuccess("");
    }, 3000);

    onComplete();
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <p>
          Loading profile...
        </p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1>
          Personal Details
        </h1>

        <p style={subTextStyle}>
          Update your FTP profile information.
        </p>

        <label style={labelStyle}>
          Badge / Serial Number
        </label>

        <input
          placeholder="Enter badge or serial number"
          value={badge}
          onChange={(e) =>
            setBadge(e.target.value)
          }
          required
          style={inputStyle}
        />

        <label style={labelStyle}>
          Work Number
        </label>

        <input
          placeholder="Enter work number"
          value={workNumber}
          onChange={(e) =>
            setWorkNumber(e.target.value)
          }
          required
          style={inputStyle}
        />

        <label style={labelStyle}>
          Rank
        </label>

        <select
          value={rank}
          onChange={(e) =>
            setRank(e.target.value)
          }
          style={inputStyle}
        >
          {ranks.map((r) => (
            <option
              key={r}
              value={r}
            >
              {r}
            </option>
          ))}
        </select>

        {error && (
          <p style={errorStyle}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={saveDetails}
          disabled={saving}
          style={{
            ...buttonStyle,
            opacity: saving ? 0.7 : 1,
            cursor: saving
              ? "not-allowed"
              : "pointer",
          }}
        >
          {saving
            ? "Saving..."
            : "Save Details"}
        </button>
      </div>

      {success && (
        <div style={toastStyle}>
          ✅ {success}
        </div>
      )}
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#0f172a",
  color: "white",
  fontFamily: "Arial, sans-serif",
  padding: "24px",
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  backgroundColor: "#1e293b",
  padding: "40px",
  borderRadius: "16px",
  border: "1px solid #334155",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px",
  marginBottom: "14px",
  backgroundColor: "#0f172a",
  color: "white",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const buttonStyle = {
  width: "100%",
  padding: "13px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
};

const subTextStyle = {
  color: "#94a3b8",
  marginBottom: "20px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: 600,
};

const errorStyle = {
  color: "#f87171",
  marginTop: "0",
  marginBottom: "14px",
};

const toastStyle = {
  position: "fixed" as const,
  bottom: "25px",
  right: "25px",
  backgroundColor: "#16a34a",
  color: "white",
  padding: "15px 20px",
  borderRadius: "10px",
  boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
};