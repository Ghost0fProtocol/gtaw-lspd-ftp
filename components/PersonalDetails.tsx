"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Props = {
  user: any;
  onComplete: () => void;
};

type AvailabilityWindow = {
  start_time: string;
  end_time: string;
};

const ranks = [
  "Police Officer I",
  "Police Officer II",
  "Police Officer III",
  "Detective I",
  "Detective II",
  "Detective III",
  "Sergeant I",
  "Sergeant II",
  "Lieutenant I",
  "Lieutenant II",
  "Captain",
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

const supervisionRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "STAFF",
];

export default function PersonalDetails({
  user,
  onComplete,
}: Props) {
  const [badge, setBadge] = useState("");
  const [workNumber, setWorkNumber] = useState("");
  const [rank, setRank] = useState("Police Officer I");
  const [division, setDivision] = useState("Mission Row Division");

  const [availabilityWindows, setAvailabilityWindows] =
    useState<AvailabilityWindow[]>([
      {
        start_time: "",
        end_time: "",
      },
    ]);

  const [availableForP1s, setAvailableForP1s] =
    useState(false);

  const [maxP1s, setMaxP1s] =
    useState(4);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canSelectDivision =
    divisionSelectableRoles.includes(user.role) ||
    divisionSelectableRoles.includes(user.requested_role);

  const canSelectRank = canSelectDivision;

  const canSupervise =
    supervisionRoles.includes(user.role);

  useEffect(() => {
    async function loadProfile() {
      const { data, error } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setBadge(data.badge_number || "");
      setWorkNumber(data.work_number || "");

      setRank(
        canSelectRank && ranks.includes(data.rank)
          ? data.rank
          : "Police Officer I"
      );

      setDivision(
        divisions.includes(data.division)
          ? data.division
          : "Mission Row Division"
      );

      const { data: windows } =
        await supabase
          .from("ftp_availability_windows")
          .select("start_time,end_time")
          .eq("profile_id", user.id);

      if (windows && windows.length > 0) {
        setAvailabilityWindows(
          windows.map((window) => ({
            start_time:
              window.start_time.slice(0, 5),
            end_time:
              window.end_time.slice(0, 5),
          }))
        );
      }

      const { data: supervision } =
        await supabase
          .from("ftp_supervision_preferences")
          .select("*")
          .eq("profile_id", user.id)
          .maybeSingle();

      if (supervision) {
        setAvailableForP1s(
          supervision.available_for_p1s
        );

        setMaxP1s(
          supervision.max_active_p1s || 4
        );
      }

      setLoading(false);
    }

    void loadProfile();
  }, [user]);

  function updateWindow(
    index: number,
    field: keyof AvailabilityWindow,
    value: string
  ) {
    setAvailabilityWindows((current) =>
      current.map((window, i) =>
        i === index
          ? {
              ...window,
              [field]: value,
            }
          : window
      )
    );
  }

  function addWindow() {
    setAvailabilityWindows((current) => [
      ...current,
      {
        start_time: "",
        end_time: "",
      },
    ]);
  }

  function removeWindow(index: number) {
    setAvailabilityWindows((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function saveDetails(event?: FormEvent) {
    event?.preventDefault();

    setError("");
    setSuccess("");

    if (!badge.trim()) {
      setError("Please enter your badge number.");
      return;
    }

    if (!workNumber.trim()) {
      setError("Please enter your work number.");
      return;
    }

    setSaving(true);

    const { error: profileError } =
      await supabase
        .from("profiles")
        .update({
          badge_number: badge.trim(),
          work_number: workNumber.trim(),
          rank: canSelectRank
            ? rank
            : "Police Officer I",
          division: canSelectDivision
            ? division
            : "Mission Row Division",
          profile_complete: true,
        })
        .eq("id", user.id);

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    await supabase
      .from("ftp_availability_windows")
      .delete()
      .eq("profile_id", user.id);

    const validWindows =
      availabilityWindows.filter(
        (window) =>
          window.start_time &&
          window.end_time
      );

    if (validWindows.length > 0) {
      await supabase
        .from("ftp_availability_windows")
        .insert(
          validWindows.map((window) => ({
            profile_id: user.id,
            start_time: window.start_time,
            end_time: window.end_time,
          }))
        );
    }

    if (canSupervise) {
      await supabase
        .from("ftp_supervision_preferences")
        .upsert({
          profile_id: user.id,
          available_for_p1s: availableForP1s,
          max_active_p1s: maxP1s,
        });
    }

    setSuccess("Profile updated successfully!");
    setSaving(false);

    setTimeout(() => {
      setSuccess("");
    }, 3000);

    onComplete();
  }

  if (loading) {
    return <main style={pageStyle}>Loading profile...</main>;
  }

  return (
    <main style={pageStyle}>
      <form onSubmit={saveDetails} style={formStyle}>
        <div style={cardStyle}>
          <h1>Personal Details</h1>

          <p style={subTextStyle}>
            Update your FTP profile information.
          </p>

          <label style={labelStyle}>Badge / Serial Number</label>
          <input
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            style={inputStyle}
            disabled={saving}
          />

          <label style={labelStyle}>Work Number</label>
          <input
            value={workNumber}
            onChange={(e) => setWorkNumber(e.target.value)}
            style={inputStyle}
            disabled={saving}
          />

          <div style={sectionHeaderStyle}>
            <h2>Server Availability</h2>
            <p>
              Tell the FTP system when you are normally available on GTA:W server time.
            </p>
          </div>

          {availabilityWindows.map((window, index) => (
            <div key={index}>
              <input
                type="time"
                value={window.start_time}
                onChange={(e) =>
                  updateWindow(
                    index,
                    "start_time",
                    e.target.value
                  )
                }
                style={inputStyle}
              />

              <input
                type="time"
                value={window.end_time}
                onChange={(e) =>
                  updateWindow(
                    index,
                    "end_time",
                    e.target.value
                  )
                }
                style={inputStyle}
              />

              {availabilityWindows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWindow(index)}
                >
                  Remove Window
                </button>
              )}
            </div>
          ))}

          <button type="button" style={secondaryButtonStyle} onClick={addWindow}>
            + Add Availability Window
          </button>

          {canSupervise && (
            <>
              <h2>FTP Supervision</h2>

              <label style={labelStyle}>
                Available for P1 assignment?
              </label>

              <select
                value={availableForP1s ? "yes" : "no"}
                onChange={(e) =>
                  setAvailableForP1s(
                    e.target.value === "yes"
                  )
                }
                style={inputStyle}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>

              <label style={labelStyle}>
                Maximum P1s
              </label>

              <input
                type="number"
                value={maxP1s}
                onChange={(e) =>
                  setMaxP1s(Number(e.target.value))
                }
                style={inputStyle}
              />
            </>
          )}

          {error && <p style={errorStyle}>{error}</p>}

          <button
            type="submit"
            disabled={saving}
            style={buttonStyle}
          >
            {saving ? "Saving..." : "Save Details"}
          </button>
        </div>
      </form>

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
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#0f172a",
  color: "white",
  padding: "24px",
};

const formStyle = {
  width: "100%",
  maxWidth: "420px",
};

const cardStyle = {
  backgroundColor: "#111827",
  padding: "40px",
  borderRadius: "20px",
  border: "1px solid #334155",
  boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px",
  marginBottom: "14px",
  backgroundColor: "#0b1220",
  color: "white",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
};

const subTextStyle = {
  color: "#94a3b8",
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  backgroundColor: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "10px",
  fontWeight: 700,
  cursor: "pointer",
};

const errorStyle = {
  color: "#f87171",
};

const toastStyle = {
  position: "fixed" as const,
  bottom: "25px",
  right: "25px",
};


const sectionHeaderStyle = {
  marginTop: "28px",
  marginBottom: "16px",
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "12px",
  backgroundColor: "#1e40af",
  color: "white",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  marginBottom: "16px",
};