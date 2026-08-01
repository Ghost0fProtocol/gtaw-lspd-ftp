"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Props = {
  user: any;
  onComplete: () => void;
};

const ranks = [
  "Police Officer I",
  "Police Officer II",
  "Police Officer III",
  "Sergeant I",
  "Sergeant II",
  "Lieutenant I",
  "Lieutenant II",
  "Captain I",
  "Captain II",
  "Commander",
  "Deputy Chief",
  "Assistant Chief",
  "Chief of Police",
];

const divisions = [
  "Mission Row Division",
  "Traffic Division",
  "Detectives Bureau",
  "Gang Enforcement Division",
  "Metropolitan Division",
  "Field Training Program",
  "Air Support Division",
];

const divisionSelectableRoles = [
  "Field Training Officer",
  "Field Training Manager",
  "Field Training Supervisor",
  "STAFF",
  "LSPD STAFF",
];

export default function PersonalDetails({
  user,
  onComplete,
}: Props) {
  const [
    badge,
    setBadge,
  ] = useState("");

  const [
    workNumber,
    setWorkNumber,
  ] = useState("");

  const [
    rank,
    setRank,
  ] = useState(
    "Police Officer I"
  );

  const [
    division,
    setDivision,
  ] = useState(
    "Mission Row Division"
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const canSelectDivision =
    divisionSelectableRoles.includes(
      user.role
    ) ||
    divisionSelectableRoles.includes(
      user.requested_role
    );

  useEffect(() => {
    async function loadProfile() {
      setError("");
      setLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq(
          "id",
          user.id
        )
        .single();

      if (error) {
        console.error(
          "PROFILE LOAD ERROR",
          error
        );

        setError(
          error.message
        );

        setLoading(false);

        return;
      }

      setBadge(
        data.badge_number ||
        ""
      );

      setWorkNumber(
        data.work_number ||
        ""
      );

      setRank(
        ranks.includes(
          data.rank
        )
          ? data.rank
          : "Police Officer I"
      );

      setDivision(
        divisions.includes(
          data.division
        )
          ? data.division
          : "Mission Row Division"
      );

      setLoading(false);
    }

    void loadProfile();
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

    if (
      !ranks.includes(rank)
    ) {
      setError(
        "Please select a valid police rank."
      );

      return;
    }

    const divisionToSave =
      canSelectDivision
        ? division
        : "Mission Row Division";

    if (
      !divisions.includes(
        divisionToSave
      )
    ) {
      setError(
        "Please select a valid division."
      );

      return;
    }

    setSaving(true);

    const {
      error,
    } = await supabase
      .from("profiles")
      .update({
        badge_number:
          badge.trim(),
        work_number:
          workNumber.trim(),
        rank,
        division:
          divisionToSave,
        profile_complete:
          true,
      })
      .eq(
        "id",
        user.id
      );

    if (error) {
      console.error(
        "PROFILE UPDATE ERROR",
        error
      );

      setError(
        error.message
      );

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
          Update your FTP profile
          information.
        </p>

        <label style={labelStyle}>
          Badge / Serial Number
        </label>

        <input
          placeholder="Enter badge or serial number"
          value={badge}
          onChange={(event) =>
            setBadge(
              event.target.value
            )
          }
          required
          disabled={saving}
          style={inputStyle}
        />

        <label style={labelStyle}>
          Work Number
        </label>

        <input
          placeholder="Enter work number"
          value={
            workNumber
          }
          onChange={(event) =>
            setWorkNumber(
              event.target.value
            )
          }
          required
          disabled={saving}
          style={inputStyle}
        />

        <label style={labelStyle}>
          Police Rank
        </label>

        <select
          value={rank}
          onChange={(event) =>
            setRank(
              event.target.value
            )
          }
          disabled={saving}
          style={inputStyle}
        >
          {ranks.map(
            (rankOption) => (
              <option
                key={
                  rankOption
                }
                value={
                  rankOption
                }
              >
                {
                  rankOption
                }
              </option>
            )
          )}
        </select>

        <p style={rankHelpStyle}>
          Your FTP portal role is
          selected separately. This
          field is only for your
          in-character police rank.
        </p>

        {canSelectDivision ? (
          <>
            <label style={labelStyle}>
              Division
            </label>

            <select
              value={division}
              onChange={(event) =>
                setDivision(
                  event.target.value
                )
              }
              disabled={saving}
              style={inputStyle}
            >
              {divisions.map(
                (divisionOption) => (
                  <option
                    key={
                      divisionOption
                    }
                    value={
                      divisionOption
                    }
                  >
                    {
                      divisionOption
                    }
                  </option>
                )
              )}
            </select>
          </>
        ) : (
          <div style={fixedDivisionStyle}>
            <p style={fixedDivisionLabelStyle}>
              Division
            </p>

            <p style={fixedDivisionValueStyle}>
              Mission Row Division
            </p>

            <p style={fixedDivisionHelpStyle}>
              New Probationary Officers
              begin in Mission Row
              Division.
            </p>
          </div>
        )}

        {error && (
          <p style={errorStyle}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={
            saveDetails
          }
          disabled={saving}
          style={{
            ...buttonStyle,
            opacity:
              saving
                ? 0.7
                : 1,
            cursor:
              saving
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
  backgroundColor:
    "#1e293b",
  padding: "40px",
  borderRadius: "16px",
  border:
    "1px solid #334155",
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

const buttonStyle = {
  width: "100%",
  padding: "13px",
  backgroundColor:
    "#2563eb",
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

const rankHelpStyle = {
  marginTop: "-4px",
  marginBottom: "16px",
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: 1.5,
};

const fixedDivisionStyle = {
  padding: "14px",
  marginBottom: "16px",
  backgroundColor:
    "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: "8px",
};

const fixedDivisionLabelStyle = {
  margin:
    "0 0 5px",
  color: "#94a3b8",
  fontSize: "13px",
};

const fixedDivisionValueStyle = {
  margin:
    "0 0 5px",
  fontWeight: 800,
};

const fixedDivisionHelpStyle = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: 1.5,
};

const errorStyle = {
  color: "#f87171",
  marginTop: "0",
  marginBottom: "14px",
};

const toastStyle = {
  position:
    "fixed" as const,
  bottom: "25px",
  right: "25px",
  backgroundColor:
    "#16a34a",
  color: "white",
  padding: "15px 20px",
  borderRadius: "10px",
  boxShadow:
    "0 10px 20px rgba(0,0,0,0.3)",
};