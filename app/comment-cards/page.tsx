"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../../lib/supabase";

import {
  generateCommentCardBBCode,
  CommentCardBBCodeInput,
} from "../../lib/generateCommentCardBBCode";

type PublicTrainee = {
  traineeId: string;
  name: string;
  rank: string;
  serial: string;
};

type Profile = {
  id: string;
  name: string | null;
  rank: string | null;
  work_number: string | null;
};

type FormState = {
  traineeId: string;
  submitterName: string;
  submitterRank: string;
  submitterSerial: string;
  observedDate: string;
  comments: string;
};

const emptyForm: FormState = {
  traineeId: "",
  submitterName: "",
  submitterRank: "",
  submitterSerial: "",
  observedDate: "",
  comments: "",
};

export default function CommentCardsPage() {
  const [
    trainees,
    setTrainees,
  ] = useState<
    PublicTrainee[]
  >([]);

  const [
    profile,
    setProfile,
  ] = useState<
    Profile |
    null
  >(null);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    emptyForm
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    bbcode,
    setBBCode,
  ] = useState("");

  const selectedTrainee =
    useMemo(
      () =>
        trainees.find(
          (trainee) =>
            trainee.traineeId ===
            form.traineeId
        ) ?? null,
      [
        trainees,
        form.traineeId,
      ]
    );

  const authenticated =
    Boolean(profile);

  useEffect(() => {
    void initialise();
  }, []);

  async function initialise() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/comment-cards",
          {
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ??
          "The probationer list could not be loaded."
        );
      }

      setTrainees(
        Array.isArray(
          result?.trainees
        )
          ? result.trainees
          : []
      );

      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      const user =
        sessionData.session
          ?.user;

      if (user) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(`
            id,
            name,
            rank,
            work_number
          `)
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (profileData) {
          const typedProfile =
            profileData as Profile;

          setProfile(
            typedProfile
          );

          setForm(
            (current) => ({
              ...current,
              submitterName:
                typedProfile.name ??
                "",
              submitterRank:
                typedProfile.rank ??
                "",
              submitterSerial:
                typedProfile.work_number ??
                "",
            })
          );
        }
      }

      setDefaultDate();
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The Comment Card page could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  function setDefaultDate() {
    const now =
      new Date();

    const local =
      new Date(
        now.getTime() -
        now.getTimezoneOffset() *
          60000
      );

    setForm(
      (current) => ({
        ...current,
        observedDate:
          current.observedDate ||
          local
            .toISOString()
            .slice(0, 10),
      })
    );
  }

  function updateField(
    field:
      keyof FormState,
    value: string
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    setError("");
    setSuccess("");
    setBBCode("");
  }

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");
    setSuccess("");
    setBBCode("");

    if (!form.traineeId) {
      setError(
        "Select a probationary officer."
      );
      return;
    }

    if (!form.observedDate) {
      setError(
        "Enter the comment card date."
      );
      return;
    }

    if (!form.comments.trim()) {
      setError(
        "Enter the comments."
      );
      return;
    }

    if (
      !authenticated &&
      !form.submitterName.trim()
    ) {
      setError(
        "Enter your character name."
      );
      return;
    }

    if (
      !authenticated &&
      !form.submitterRank.trim()
    ) {
      setError(
        "Enter your rank."
      );
      return;
    }

    if (
      !authenticated &&
      !form.submitterSerial.trim()
    ) {
      setError(
        "Enter your serial number."
      );
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      const accessToken =
        sessionData.session
          ?.access_token;

      const observedAt =
        new Date(
          `${form.observedDate}T00:00:00`
        ).toISOString();

      const response =
        await fetch(
          "/api/comment-cards",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...(accessToken
                ? {
                    Authorization:
                      `Bearer ${accessToken}`,
                  }
                : {}),
            },
            body:
              JSON.stringify({
                traineeId:
                  form.traineeId,
                submitterName:
                  form.submitterName,
                submitterRank:
                  form.submitterRank,
                submitterSerial:
                  form.submitterSerial,
                observedAt,
                comments:
                  form.comments,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ??
          "The comment card could not be submitted."
        );
      }

      setSuccess(
        result?.message ??
        "Comment card submitted."
      );

      if (result?.card) {
        setBBCode(
          generateCommentCardBBCode(
            result.card as CommentCardBBCodeInput
          )
        );
      }

      setForm(
        (current) => ({
          ...emptyForm,
          submitterName:
            authenticated
              ? current.submitterName
              : "",
          submitterRank:
            authenticated
              ? current.submitterRank
              : "",
          submitterSerial:
            authenticated
              ? current.submitterSerial
              : "",
        })
      );

      setDefaultDate();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The comment card could not be submitted."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={panelStyle}>
          Loading Comment Cards...
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>
            FIELD TRAINING PROGRAM
          </p>

          <h1 style={titleStyle}>
            Employee Comment Sheet
          </h1>

          <p style={mutedStyle}>
            Submit a comment card for an active probationary officer.
          </p>
        </div>

        <div style={statusCardStyle}>
          <span style={eyebrowStyle}>
            SUBMISSION TYPE
          </span>

          <strong>
            {authenticated
              ? "Authenticated"
              : "Guest"}
          </strong>

          <span style={smallMutedStyle}>
            {authenticated
              ? "Your account details are verified automatically."
              : "Guest cards require review."}
          </span>
        </div>
      </section>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {success && (
        <div style={successStyle}>
          {success}
        </div>
      )}

      <form
        onSubmit={submit}
        style={formStyle}
      >
        <section style={panelStyle}>
          <SectionTitle
            eyebrow="COMMENTING EMPLOYEE"
            title="Your Details"
          />

          <div style={threeColumnStyle}>
            <Field
              label="Rank"
              value={
                form.submitterRank
              }
              disabled={
                authenticated
              }
              onChange={(value) =>
                updateField(
                  "submitterRank",
                  value
                )
              }
            />

            <Field
              label="Character Name"
              value={
                form.submitterName
              }
              disabled={
                authenticated
              }
              onChange={(value) =>
                updateField(
                  "submitterName",
                  value
                )
              }
            />

            <Field
              label="Serial"
              value={
                form.submitterSerial
              }
              disabled={
                authenticated
              }
              onChange={(value) =>
                updateField(
                  "submitterSerial",
                  value
                )
              }
            />
          </div>
        </section>

        <section style={panelStyle}>
          <SectionTitle
            eyebrow="PROBATIONARY OFFICER"
            title="Select the P1"
          />

          <label style={fieldStyle}>
            <span style={labelStyle}>
              Probationary Officer
            </span>

            <select
              value={
                form.traineeId
              }
              onChange={(event) =>
                updateField(
                  "traineeId",
                  event.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                Select a probationary officer
              </option>

              {trainees.map(
                (trainee) => (
                  <option
                    key={
                      trainee.traineeId
                    }
                    value={
                      trainee.traineeId
                    }
                  >
                    {trainee.rank}{" "}
                    {trainee.name}
                    {trainee.serial
                      ? `, ${trainee.serial}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </label>

          {selectedTrainee && (
            <div style={selectedStyle}>
              <span>
                Selected P1
              </span>

              <strong>
                {selectedTrainee.rank}{" "}
                {selectedTrainee.name}
                {selectedTrainee.serial
                  ? `, ${selectedTrainee.serial}`
                  : ""}
              </strong>
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <SectionTitle
            eyebrow="COMMENT SHEET"
            title="Date & Comments"
          />

          <label style={fieldStyle}>
            <span style={labelStyle}>
              Date
            </span>

            <input
              type="date"
              value={
                form.observedDate
              }
              onChange={(event) =>
                updateField(
                  "observedDate",
                  event.target.value
                )
              }
              style={inputStyle}
            />
          </label>

          <label style={commentsFieldStyle}>
            <span style={labelStyle}>
              Comments
            </span>

            <textarea
              value={
                form.comments
              }
              onChange={(event) =>
                updateField(
                  "comments",
                  event.target.value
                )
              }
              maxLength={5000}
              style={textareaStyle}
            />
          </label>
        </section>

        <button
          type="submit"
          disabled={submitting}
          style={submitButtonStyle}
        >
          {submitting
            ? "Submitting..."
            : "Submit Comment Card"}
        </button>
      </form>

      {bbcode && (
        <section style={panelStyle}>
          <SectionTitle
            eyebrow="GENERATED OUTPUT"
            title="Comment Card BBCode"
          />

          <textarea
            readOnly
            value={bbcode}
            style={bbcodeStyle}
          />
        </section>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>
        {label}
      </span>

      <input
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={{
          ...inputStyle,
          opacity:
            disabled
              ? 0.7
              : 1,
        }}
      />
    </label>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div style={sectionTitleStyle}>
      <p style={eyebrowStyle}>
        {eyebrow}
      </p>

      <h2 style={headingStyle}>
        {title}
      </h2>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  gap: "20px",
  padding: "32px",
  color: "white",
  background:
    "radial-gradient(circle at top, #172554, #0f172a 45%, #020617)",
  fontFamily:
    "Arial, sans-serif",
};

const formStyle = {
  width: "100%",
  maxWidth: "940px",
  display: "grid",
  gap: "18px",
  margin: "0 auto",
};

const heroStyle = {
  width: "100%",
  maxWidth: "940px",
  boxSizing:
    "border-box" as const,
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "24px",
  margin: "0 auto",
  background:
    "linear-gradient(135deg, #111c33, #172554)",
  border: "1px solid #2b3b57",
  borderRadius: "16px",
  flexWrap: "wrap" as const,
};

const panelStyle = {
  width: "100%",
  maxWidth: "940px",
  boxSizing:
    "border-box" as const,
  padding: "24px",
  margin: "0 auto",
  background:
    "linear-gradient(145deg, #172033, #111827)",
  border: "1px solid #29364c",
  borderRadius: "15px",
};

const statusCardStyle = {
  minWidth: "230px",
  display: "grid",
  gap: "6px",
  padding: "14px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const sectionTitleStyle = {
  marginBottom: "20px",
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const titleStyle = {
  margin: "0 0 8px",
  fontSize: "31px",
};

const headingStyle = {
  margin: 0,
  fontSize: "22px",
};

const mutedStyle = {
  margin: 0,
  color: "#94a3b8",
};

const smallMutedStyle = {
  color: "#64748b",
  fontSize: "11px",
};

const threeColumnStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "16px",
};

const fieldStyle = {
  display: "grid",
  gap: "7px",
};

const commentsFieldStyle = {
  ...fieldStyle,
  marginTop: "18px",
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
  padding: "12px 13px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #3b4a63",
  borderRadius: "9px",
};

const textareaStyle = {
  width: "100%",
  minHeight: "260px",
  boxSizing:
    "border-box" as const,
  padding: "13px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #3b4a63",
  borderRadius: "9px",
  resize: "vertical" as const,
};

const selectedStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: "12px",
  padding: "13px",
  marginTop: "14px",
  backgroundColor:
    "rgba(30,64,175,.18)",
  border: "1px solid #2563eb",
  borderRadius: "9px",
};

const submitButtonStyle = {
  width: "100%",
  maxWidth: "940px",
  padding: "14px",
  margin: "0 auto",
  color: "white",
  backgroundColor: "#2563eb",
  border: "1px solid #3b82f6",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 900,
};

const errorStyle = {
  width: "100%",
  maxWidth: "940px",
  boxSizing:
    "border-box" as const,
  padding: "14px",
  margin: "0 auto",
  color: "#fecaca",
  backgroundColor:
    "rgba(127,29,29,.35)",
  border: "1px solid #991b1b",
  borderRadius: "10px",
};

const successStyle = {
  width: "100%",
  maxWidth: "940px",
  boxSizing:
    "border-box" as const,
  padding: "14px",
  margin: "0 auto",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20,83,45,.35)",
  border: "1px solid #166534",
  borderRadius: "10px",
};

const bbcodeStyle = {
  width: "100%",
  minHeight: "300px",
  boxSizing:
    "border-box" as const,
  padding: "14px",
  color: "#e2e8f0",
  backgroundColor: "#020617",
  border: "1px solid #475569",
  borderRadius: "9px",
  resize: "vertical" as const,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};