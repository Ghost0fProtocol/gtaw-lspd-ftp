"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Props = {
  openNotebook: (
    id: string
  ) => void;

  openDOR: (
    id: string
  ) => void;
};

export default function P1Records({
  openNotebook,
  openDOR,
}: Props) {
  const [
    trainees,
    setTrainees,
  ] = useState<any[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    loadTrainees();
  }, []);

  async function loadTrainees() {
    const {
      data: traineeData,
      error,
    } = await supabase
      .from("trainees")
      .select("*")
      .eq(
        "status",
        "Active"
      );

    if (error) {
      console.error(
        "TRAINEE LOAD ERROR:",
        error
      );

      setLoading(false);

      return;
    }

    const profileIds =
      (traineeData ?? []).map(
        (trainee: any) =>
          trainee.profile_id
      );

    let profiles: any[] =
      [];

    if (
      profileIds.length > 0
    ) {
      const {
        data,
        error:
          profileError,
      } = await supabase
        .from("profiles")
        .select("*")
        .in(
          "id",
          profileIds
        );

      if (profileError) {
        console.error(
          "PROFILE LOAD ERROR:",
          profileError
        );
      }

      profiles =
        data ?? [];
    }

    const combined =
      (traineeData ?? []).map(
        (trainee: any) => ({
          ...trainee,

          profiles:
            profiles.find(
              (profile: any) =>
                profile.id ===
                trainee.profile_id
            ),
        })
      );

    setTrainees(combined);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={card}>
        Loading P1 Records...
      </div>
    );
  }

  return (
    <div>
      <h1 style={title}>
        P1 Records
      </h1>

      <p style={subtitle}>
        All active Probationary
        Officers currently in FTP.
      </p>

      {trainees.length === 0 ? (
        <div style={card}>
          No active P1 officers
          found.
        </div>
      ) : (
        trainees.map(
          (trainee) => (
            <div
              key={trainee.id}
              style={card}
            >
              <h2>
                {trainee
                  .profiles
                  ?.name ||
                  "Unknown Officer"}
              </h2>

              <div style={details}>
                <Detail
                  label="Rank"
                  value={
                    trainee
                      .profiles
                      ?.rank ||
                    "Unknown"
                  }
                />

                <Detail
                  label="Badge Number"
                  value={
                    trainee
                      .profiles
                      ?.badge_number ||
                    "N/A"
                  }
                />

                <Detail
                  label="Work Number"
                  value={
                    trainee
                      .profiles
                      ?.work_number ||
                    "N/A"
                  }
                />

                <Detail
                  label="FTP Status"
                  value={
                    trainee.status ||
                    "Active"
                  }
                />

                <Detail
                  label="Field Training Manager"
                  value={
                    trainee.assigned_ftm ||
                    "Unassigned"
                  }
                />
              </div>

              <div style={buttons}>
                <button
                  onClick={() =>
                    openNotebook(
                      trainee.id
                    )
                  }
                  style={
                    primaryButton
                  }
                >
                  View Notebook
                </button>

                <button
                  onClick={() =>
                    openDOR(
                      trainee.id
                    )
                  }
                  style={
                    secondaryButton
                  }
                >
                  Create DOR
                </button>
              </div>
            </div>
          )
        )
      )}
    </div>
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
      <p style={labelStyle}>
        {label}
      </p>

      <p style={valueStyle}>
        {value}
      </p>
    </div>
  );
}

const card = {
  background: "#1e293b",
  padding: "25px",
  borderRadius: "12px",
  marginBottom: "20px",
};

const title = {
  fontSize: "28px",
  fontWeight: "900",
};

const subtitle = {
  color: "#94a3b8",
  marginBottom: "25px",
};

const details = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "20px",
};

const labelStyle = {
  color: "#94a3b8",
  fontSize: "14px",
  marginBottom: "5px",
};

const valueStyle = {
  margin: 0,
  fontSize: "16px",
};

const buttons = {
  display: "flex",
  gap: "12px",
  marginTop: "25px",
  flexWrap: "wrap" as const,
};

const primaryButton = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "12px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButton = {
  background: "#475569",
  color: "white",
  border: "none",
  padding: "12px 20px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
};