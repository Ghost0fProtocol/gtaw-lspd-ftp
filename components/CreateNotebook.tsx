"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Props = {
  user: any;
  onComplete: (
    traineeId: string
  ) => void;
};

type Profile = {
  id: string;
  name: string | null;
  rank: string | null;
  badge_number: string | null;
  work_number: string | null;
};

type TemplateItem = {
  id: string;
  section: string;
  item_label: string;
  sort_order: number;
};

type NotebookSection = {
  section: string;
  items: {
    id: string;
    label: string;
    completed: boolean;
  }[];
};

export default function CreateNotebook({
  user,
  onComplete,
}: Props) {
  const [
    profile,
    setProfile,
  ] = useState<Profile | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    loadProfileAndCheckNotebook();
  }, [user]);

  async function loadProfileAndCheckNotebook() {
    setLoading(true);
    setError("");

    try {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          rank,
          badge_number,
          work_number
        `)
        .eq(
          "id",
          user.id
        )
        .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(
        profileData
      );

      const {
        data: existingTrainee,
        error: traineeError,
      } = await supabase
        .from("trainees")
        .select("id")
        .eq(
          "profile_id",
          user.id
        )
        .maybeSingle();

      if (traineeError) {
        throw traineeError;
      }

      if (existingTrainee) {
        onComplete(
          existingTrainee.id
        );

        return;
      }
    } catch (loadError) {
      console.error(
        "CREATE NOTEBOOK LOAD ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Your FTP enrolment details could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createNotebook() {
    if (!profile) {
      setError(
        "Your profile could not be loaded."
      );

      return;
    }

    setCreating(true);
    setError("");

    try {
      const {
        data: existingTrainee,
        error: existingError,
      } = await supabase
        .from("trainees")
        .select("id")
        .eq(
          "profile_id",
          user.id
        )
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingTrainee) {
        onComplete(
          existingTrainee.id
        );

        return;
      }

      const {
        data: templateItems,
        error: templateError,
      } = await supabase
        .from(
          "notebook_template_items"
        )
        .select(`
          id,
          section,
          item_label,
          sort_order
        `)
        .order(
          "sort_order",
          {
            ascending: true,
          }
        );

      if (templateError) {
        throw templateError;
      }

      if (
        !templateItems ||
        templateItems.length === 0
      ) {
        throw new Error(
          "The notebook template is empty."
        );
      }

      const notebook =
        buildNotebookJSON(
          templateItems
        );

      const {
        data: trainee,
        error: traineeError,
      } = await supabase
        .from("trainees")
        .insert({
          profile_id:
            user.id,
          assigned_ftm:
            null,
          status:
            "Active",
          start_date:
            new Date().toISOString(),
          notebook,
        })
        .select("id")
        .single();

      if (traineeError) {
        throw traineeError;
      }

      const notebookRows =
        templateItems.map(
          (item) => ({
            trainee_id:
              trainee.id,
            section:
              item.section,
            item_label:
              item.item_label,
            completed:
              false,
          })
        );

      const {
        error: notebookItemsError,
      } = await supabase
        .from("notebook_items")
        .insert(
          notebookRows
        );

      if (
        notebookItemsError
      ) {
        await supabase
          .from("trainees")
          .delete()
          .eq(
            "id",
            trainee.id
          );

        throw notebookItemsError;
      }

      onComplete(
        trainee.id
      );
    } catch (createError: any) {
      console.error(
        "CREATE NOTEBOOK ERROR",
        createError
      );

      if (
        createError?.code ===
        "23505"
      ) {
        setError(
          "An FTP notebook already exists for this account."
        );
      } else {
        setError(
          createError?.message ??
            "Your FTP notebook could not be created."
        );
      }
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <p>
          Checking FTP enrolment...
        </p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <div style={badgeStyle}>
          FTP ENROLMENT
        </div>

        <h1 style={titleStyle}>
          Join the Field Training
          Program
        </h1>

        <p style={subTextStyle}>
          Your personal details are
          complete. Create your
          official P1 notebook to
          begin FTP.
        </p>

        <div style={detailsStyle}>
          <Detail
            label="Officer"
            value={
              profile?.name ??
              user.name ??
              "Unknown"
            }
          />

          <Detail
            label="Rank"
            value={
              profile?.rank ??
              "Police Officer I"
            }
          />

          <Detail
            label="Badge / Serial"
            value={
              profile?.badge_number ??
              "Not Assigned"
            }
          />

          <Detail
            label="Work Number"
            value={
              profile?.work_number ??
              "Not Assigned"
            }
          />
        </div>

        <div style={informationStyle}>
          <h3
            style={{
              marginTop: 0,
            }}
          >
            Creating your notebook
            will:
          </h3>

          <p style={itemStyle}>
            ✓ Enrol you as an active
            P1
          </p>

          <p style={itemStyle}>
            ✓ Create the standard FTP
            checklist
          </p>

          <p style={itemStyle}>
            ✓ Enable DOR submissions
            and sign-offs
          </p>

          <p style={itemStyle}>
            ✓ Begin your training
            record at 0% progress
          </p>
        </div>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={createNotebook}
          disabled={creating}
          style={{
            ...buttonStyle,
            opacity:
              creating ? 0.7 : 1,
            cursor:
              creating
                ? "not-allowed"
                : "pointer",
          }}
        >
          {creating
            ? "Creating Notebook..."
            : "Create My FTP Notebook"}
        </button>
      </div>
    </main>
  );
}

function buildNotebookJSON(
  templateItems: TemplateItem[]
) {
  const sections =
    templateItems.reduce(
      (
        grouped,
        item
      ) => {
        if (
          !grouped[
            item.section
          ]
        ) {
          grouped[
            item.section
          ] = [];
        }

        grouped[
          item.section
        ].push(item);

        return grouped;
      },
      {} as Record<
        string,
        TemplateItem[]
      >
    );

  return Object.entries(
    sections
  ).map(
    ([
      section,
      items,
    ]): NotebookSection => ({
      section,
      items:
        items.map(
          (item) => ({
            id: item.id,
            label:
              item.item_label,
            completed:
              false,
          })
        ),
    })
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
  maxWidth: "620px",
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
};

const subTextStyle = {
  marginBottom: "24px",
  color: "#94a3b8",
  lineHeight: 1.6,
};

const detailsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "18px",
  padding: "20px",
  marginBottom: "22px",
  backgroundColor: "#0f172a",
  borderRadius: "10px",
};

const labelStyle = {
  margin: "0 0 5px",
  color: "#94a3b8",
  fontSize: "13px",
};

const valueStyle = {
  margin: 0,
  fontWeight: 700,
};

const informationStyle = {
  padding: "20px",
  marginBottom: "22px",
  backgroundColor: "#172033",
  border:
    "1px solid #334155",
  borderRadius: "10px",
};

const itemStyle = {
  margin: "10px 0",
  color: "#cbd5e1",
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

const buttonStyle = {
  width: "100%",
  padding: "14px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: 800,
};