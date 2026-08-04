"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import { auditAction } from "../lib/auditAction";
import { addFTMMeetingEntryFromPPOWER } from "../lib/fto";
import type {
  DORRating,
} from "../lib/generateDORBBCode";
import {
  generatePPOWERBBCode,
  PPOWERFormData,
  PPOWEROutcome,
} from "../lib/generatePPOWERBBCode";

type Props = {
  traineeId: string;
  weekNumber: 1 | 2;
  onCancel: () => void;
  onSubmitted: () => void;
};

type PersonDetails = {
  name: string;
  serial: string;
};

const evaluationCategories = [
  { id: 1, section: "APPEARANCE", label: "General Appearance" },
  { id: 2, section: "ATTITUDE", label: "Attitude towards the Job and Feedback" },
  { id: 3, section: "KNOWLEDGE", label: "Department Policies/Procedures" },
  { id: 4, section: "KNOWLEDGE", label: "Law, Penal Code, Search and Seizure" },
  { id: 5, section: "PERFORMANCE", label: "Driving Skill: General" },
  { id: 6, section: "PERFORMANCE", label: "Driving Skill: Orientation and Response Time to Calls" },
  { id: 7, section: "PERFORMANCE", label: "Report Writing: Accuracy/Grammar/Organisation" },
  { id: 8, section: "PERFORMANCE", label: "Field Performance" },
  { id: 9, section: "PERFORMANCE", label: "Self-Initiated Field Activities" },
  { id: 10, section: "PERFORMANCE", label: "Field Activities: Traffic Stop" },
  { id: 11, section: "PERFORMANCE", label: "Field Activities: Arrest Procedure" },
  { id: 12, section: "PERFORMANCE", label: "Officer Safety Principles" },
  { id: 13, section: "PERFORMANCE", label: "Control of Conflict: Voice Command/Physical Skill" },
  { id: 14, section: "PERFORMANCE", label: "Use of Common Sense and Good Judgement" },
  { id: 15, section: "PERFORMANCE", label: "Radio/MDC: Use of Mobile Data Computer" },
  { id: 16, section: "PERFORMANCE", label: "Radio: Articulation of Transmissions" },
  { id: 17, section: "RELATIONSHIPS", label: "With Citizens/Employees in General" },
];

const ratingOptions: Exclude<
  DORRating,
  ""
>[] = [
  "1",
  "2",
  "3",
  "4",
  "N/O",
];

function createInitialRatings() {
  return evaluationCategories.reduce(
    (record, category) => {
      record[category.id] = "";
      return record;
    },
    {} as Record<
      number,
      DORRating
    >
  );
}

export default function PPOWERForm({
  traineeId,
  weekNumber,
  onCancel,
  onSubmitted,
}: Props) {
  const [
    trainee,
    setTrainee,
  ] = useState<PersonDetails>({
    name: "",
    serial: "",
  });

  const [
    manager,
    setManager,
  ] = useState<PersonDetails>({
    name: "",
    serial: "",
  });

  const [
    managerId,
    setManagerId,
  ] = useState("");

  const [
    ratings,
    setRatings,
  ] = useState<
    Record<number, DORRating>
  >(
    createInitialRatings
  );

  const [
    strengthsDiscussed,
    setStrengthsDiscussed,
  ] = useState(false);

  const [
    weaknessesDiscussed,
    setWeaknessesDiscussed,
  ] = useState(false);

  const [
    remedialRequired,
    setRemedialRequired,
  ] = useState(false);

  const [
    remedialTraining,
    setRemedialTraining,
  ] = useState("");

  const [
    summaryComments,
    setSummaryComments,
  ] = useState("");

  const [
    outcome,
    setOutcome,
  ] =
    useState<PPOWEROutcome>(
      "Satisfactory"
    );

  const [
    generatedBBCode,
    setGeneratedBBCode,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
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
    ftoRecordWarning,
    setFtoRecordWarning,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  useEffect(() => {
    void loadPeople();
  }, [
    traineeId,
  ]);

  async function loadPeople() {
    setLoading(true);
    setError("");

    try {
      const {
        data: userData,
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!userData.user) {
        throw new Error(
          "No logged-in user was found."
        );
      }

      setManagerId(
        userData.user.id
      );

      const [
        traineeResult,
        managerResult,
      ] = await Promise.all([
        supabase
          .from("trainees")
          .select(`
            id,
            profile:profiles!trainees_profile_id_fkey (
              name,
              badge_number,
              work_number
            )
          `)
          .eq(
            "id",
            traineeId
          )
          .single(),

        supabase
          .from("profiles")
          .select(`
            name,
            badge_number,
            work_number
          `)
          .eq(
            "id",
            userData.user.id
          )
          .single(),
      ]);

      if (traineeResult.error) {
        throw traineeResult.error;
      }

      if (managerResult.error) {
        throw managerResult.error;
      }

      const traineeProfile =
        Array.isArray(
          traineeResult.data.profile
        )
          ? traineeResult.data
              .profile[0]
          : traineeResult.data
              .profile;

      setTrainee({
        name:
          traineeProfile?.name ??
          "Unknown Officer",
        serial:
          traineeProfile
            ?.badge_number ??
          traineeProfile
            ?.work_number ??
          "N/A",
      });

      setManager({
        name:
          managerResult.data
            ?.name ??
          "Unknown Manager",
        serial:
          managerResult.data
            ?.badge_number ??
          managerResult.data
            ?.work_number ??
          "N/A",
      });
    } catch (loadError) {
      console.error(
        "LOAD PPOWER PEOPLE ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "The PPOWER details could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  const completedRatings =
    useMemo(
      () =>
        Object.values(
          ratings
        ).filter(Boolean)
          .length,
      [
        ratings,
      ]
    );

  function updateRating(
    id: number,
    value: DORRating
  ) {
    setRatings(
      (current) => ({
        ...current,
        [id]: value,
      })
    );

    setError("");
  }

  function validate() {
    const missing =
      evaluationCategories
        .filter(
          (category) =>
            !ratings[
              category.id
            ]
        )
        .map(
          (category) =>
            category.label
        );

    if (missing.length > 0) {
      return (
        "Complete every rating before submitting:\n\n" +
        missing
          .map(
            (label) =>
              `• ${label}`
          )
          .join("\n")
      );
    }

    if (
      !summaryComments.trim()
    ) {
      return "Enter the weekly summary comments.";
    }

    if (
      remedialRequired &&
      !remedialTraining.trim()
    ) {
      return "Describe the remedial training provided.";
    }

    return "";
  }

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    const validationError =
      validate();

    if (validationError) {
      setError(
        validationError
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    setFtoRecordWarning("");

    const formData:
      PPOWERFormData = {
      probationaryOfficer:
        trainee.name,
      probationarySerial:
        trainee.serial,
      fieldTrainingManager:
        manager.name,
      managerSerial:
        manager.serial,
      strengthsDiscussed,
      weaknessesDiscussed,
      remedialRequired,
      remedialTraining,
      summaryComments,
      outcome,
    };

    const bbcode =
      generatePPOWERBBCode(
        formData,
        ratings
      );

    try {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData.session
          ?.access_token;

      if (!accessToken) {
        throw new Error(
          "The login session could not be verified."
        );
      }

      const result =
        await auditAction({
          user: {
            id:
              managerId ||
              sessionData.session
                ?.user.id ||
              "",

            name:
              manager.name,

            role:
              null,
          },

          action:
            "SUBMIT_PPOWER",

          category:
            "PPOWERs",

          entityType:
            "trainee",

          entityId:
            traineeId,

          targetName:
            trainee.name,

          oldData: {
            week_number:
              weekNumber,

            previous_outcome:
              null,

            previous_attempt:
              null,
          },

          newData: {
            trainee_name:
              trainee.name,

            trainee_serial:
              trainee.serial,

            ftm_name:
              manager.name,

            ftm_serial:
              manager.serial,

            week_number:
              weekNumber,

            ratings,

            completed_rating_count:
              completedRatings,

            strengths_discussed:
              strengthsDiscussed,

            weaknesses_discussed:
              weaknessesDiscussed,

            remedial_required:
              remedialRequired,

            remedial_training:
              remedialTraining.trim() ||
              null,

            summary_comments:
              summaryComments.trim(),

            outcome,

            bbcode_generated:
              true,

            expected_progression:
              getExpectedPPOWERProgression(
                weekNumber,
                outcome
              ),
          },

          execute:
            async () => {
              const response =
                await fetch(
                  "/api/ftp",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",

                      Authorization:
                        `Bearer ${accessToken}`,
                    },

                    body:
                      JSON.stringify({
                        action:
                          "submitPPOWER",

                        traineeId,

                        weekNumber,

                        ratings,

                        strengthsDiscussed,

                        weaknessesDiscussed,

                        remedialRequired,

                        remedialTraining,

                        summaryComments,

                        outcome,

                        bbcode,
                      }),
                  }
                );

              const responseBody =
                await response.json();

              if (!response.ok) {
                throw new Error(
                  responseBody?.error ??
                    "The PPOWER could not be submitted."
                );
              }

              return responseBody;
            },
        });

      try {
        const meetingDate =
          new Date()
            .toISOString()
            .slice(0, 10);

        await addFTMMeetingEntryFromPPOWER({
          ftmProfileId:
            managerId ||
            sessionData.session
              ?.user.id ||
            "",

          traineeName:
            trainee.name,

          meetingDate,
        });
      } catch (ftoRecordError) {
        console.error(
          "ADD PPOWER TO FTO RECORD ERROR",
          ftoRecordError
        );

        setFtoRecordWarning(
          ftoRecordError instanceof Error
            ? `The PPOWER was submitted, but the FTM Meeting entry could not be added to your FTO record: ${ftoRecordError.message}`
            : "The PPOWER was submitted, but the FTM Meeting entry could not be added to your FTO record."
        );
      }

      setGeneratedBBCode(
        bbcode
      );

      setSuccess(
        result?.message ??
          `Week ${weekNumber} PPOWER submitted.`
      );

      onSubmitted();
    } catch (submitError) {
      console.error(
        "SUBMIT PPOWER ERROR",
        submitError
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "The PPOWER could not be submitted."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyBBCode() {
    try {
      await navigator.clipboard.writeText(
        generatedBBCode
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "The BBCode could not be copied."
      );
    }
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        Loading PPOWER...
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onCancel}
        style={backButtonStyle}
      >
        ← Back to FTP Record
      </button>

      <form
        onSubmit={submit}
        style={formStyle}
      >
        <div style={headerCardStyle}>
          <p style={eyebrowStyle}>
            WEEK {weekNumber}
          </p>

          <h2 style={titleStyle}>
            Probationary Police Officer
            Weekly Evaluation Report
          </h2>

          <p style={mutedStyle}>
            Complete the weekly
            evaluation and generate
            the official forum BBCode.
          </p>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>
            Officer Information
          </h3>

          <div style={detailsGridStyle}>
            <ReadOnlyField
              label="Probationary Police Officer"
              value={trainee.name}
            />

            <ReadOnlyField
              label="Serial Number"
              value={trainee.serial}
            />

            <ReadOnlyField
              label="Field Training Manager"
              value={manager.name}
            />

            <ReadOnlyField
              label="Serial Number"
              value={manager.serial}
            />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h3 style={sectionTitleStyle}>
                Weekly Ratings
              </h3>

              <p style={mutedStyle}>
                A specific comment must
                appear on a DOR during
                the reviewed week for
                ratings 1, 2 or 4.
              </p>
            </div>

            <span style={countBadgeStyle}>
              {completedRatings}/
              {
                evaluationCategories.length
              }
            </span>
          </div>

          {evaluationCategories.map(
            (
              category,
              index
            ) => (
              <div
                key={category.id}
                style={{
                  ...ratingRowStyle,
                  borderBottom:
                    index ===
                    evaluationCategories.length -
                      1
                      ? "none"
                      : "1px solid #334155",
                }}
              >
                <div>
                  <p style={categoryStyle}>
                    {category.section}
                  </p>

                  <span>
                    {category.id}.{" "}
                    {category.label}
                  </span>
                </div>

                <select
                  value={
                    ratings[
                      category.id
                    ]
                  }
                  onChange={(event) =>
                    updateRating(
                      category.id,
                      event.target
                        .value as DORRating
                    )
                  }
                  disabled={saving}
                  style={ratingSelectStyle}
                >
                  <option value="">
                    Select
                  </option>

                  {ratingOptions.map(
                    (rating) => (
                      <option
                        key={rating}
                        value={rating}
                      >
                        {rating}
                      </option>
                    )
                  )}
                </select>
              </div>
            )
          )}
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>
            Weekly Review
          </h3>

          <BooleanField
            label="I have discussed the probationer's most significant strengths."
            checked={
              strengthsDiscussed
            }
            onChange={
              setStrengthsDiscussed
            }
          />

          <BooleanField
            label="I have discussed the probationer's most significant weaknesses."
            checked={
              weaknessesDiscussed
            }
            onChange={
              setWeaknessesDiscussed
            }
          />

          <BooleanField
            label="The probationer's significant weaknesses required remedial training."
            checked={
              remedialRequired
            }
            onChange={
              setRemedialRequired
            }
          />

          <label style={labelStyle}>
            Remedial Training
          </label>

          <textarea
            value={remedialTraining}
            onChange={(event) =>
              setRemedialTraining(
                event.target.value
              )
            }
            disabled={saving}
            placeholder="Describe remedial retraining, or enter N/A."
            style={textareaStyle}
          />

          <label style={spacedLabelStyle}>
            Comments Regarding Strengths,
            Weaknesses and Progress
          </label>

          <textarea
            value={summaryComments}
            onChange={(event) =>
              setSummaryComments(
                event.target.value
              )
            }
            disabled={saving}
            placeholder="Summarise the probationer's weekly performance."
            style={{
              ...textareaStyle,
              minHeight: "180px",
            }}
          />
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>
            Weekly Performance
          </h3>

          <div style={outcomeGridStyle}>
            {[
              "Satisfactory",
              "Unsatisfactory",
            ].map(
              (option) => (
                <label
                  key={option}
                  style={{
                    ...outcomeOptionStyle,
                    borderColor:
                      outcome ===
                      option
                        ? "#3b82f6"
                        : "#475569",
                    backgroundColor:
                      outcome ===
                      option
                        ? "rgba(37, 99, 235, 0.16)"
                        : "#0f172a",
                  }}
                >
                  <input
                    type="radio"
                    name="outcome"
                    value={option}
                    checked={
                      outcome ===
                      option
                    }
                    onChange={() =>
                      setOutcome(
                        option as PPOWEROutcome
                      )
                    }
                    disabled={saving}
                  />

                  <strong>
                    {option}
                  </strong>
                </label>
              )
            )}
          </div>
        </div>

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

        {ftoRecordWarning && (
          <div style={warningStyle}>
            {ftoRecordWarning}
          </div>
        )}

        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={secondaryButtonStyle}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            style={primaryButtonStyle}
          >
            {saving
              ? "Submitting PPOWER..."
              : `Submit Week ${weekNumber} PPOWER`}
          </button>
        </div>
      </form>

      {generatedBBCode && (
        <div style={bbcodeCardStyle}>
          <div style={sectionHeaderStyle}>
            <h3 style={sectionTitleStyle}>
              Generated BBCode
            </h3>

            <button
              type="button"
              onClick={
                copyBBCode
              }
              style={copyButtonStyle}
            >
              {copied
                ? "Copied!"
                : "Copy BBCode"}
            </button>
          </div>

          <textarea
            value={generatedBBCode}
            readOnly
            style={bbcodeStyle}
          />
        </div>
      )}
    </div>
  );
}

function getExpectedPPOWERProgression(
  weekNumber: 1 | 2,
  outcome: PPOWEROutcome
) {
  if (
    outcome !==
    "Satisfactory"
  ) {
    return {
      progression:
        "remain_in_current_week",

      target_stage:
        weekNumber === 1
          ? "Week 1"
          : "Week 2",
    };
  }

  return {
    progression:
      weekNumber === 1
        ? "progress_to_week_2"
        : "week_2_satisfactory",

    target_stage:
      weekNumber === 1
        ? "Week 2"
        : "Week 2",
  };
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        value={value}
        readOnly
        style={readOnlyInputStyle}
      />
    </div>
  );
}

function BooleanField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (
    checked: boolean
  ) => void;
}) {
  return (
    <label style={booleanFieldStyle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
      />

      <span>{label}</span>
    </label>
  );
}

const formStyle = {
  display: "grid",
  gap: "20px",
};

const headerCardStyle = {
  padding: "26px",
  color: "white",
  backgroundColor: "#111c33",
  border: "1px solid #334155",
  borderRadius: "14px",
};

const cardStyle = {
  padding: "24px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const bbcodeCardStyle = {
  ...cardStyle,
  marginTop: "24px",
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const titleStyle = {
  margin: "0 0 8px",
};

const mutedStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.5,
};

const sectionTitleStyle = {
  margin: "0 0 16px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#cbd5e1",
  fontSize: "13px",
  fontWeight: 700,
};

const spacedLabelStyle = {
  ...labelStyle,
  marginTop: "18px",
};

const readOnlyInputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  color: "#cbd5e1",
  backgroundColor: "#172033",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  minHeight: "120px",
  padding: "12px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
};

const ratingRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "14px 0",
};

const categoryStyle = {
  margin: "0 0 5px",
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: 900,
};

const ratingSelectStyle = {
  width: "120px",
  padding: "10px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const countBadgeStyle = {
  padding: "6px 10px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.18)",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const booleanFieldStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "13px",
  marginBottom: "10px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  cursor: "pointer",
};

const outcomeGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const outcomeOptionStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "16px",
  border: "1px solid",
  borderRadius: "9px",
  cursor: "pointer",
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const primaryButtonStyle = {
  padding: "13px 18px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryButtonStyle = {
  padding: "13px 18px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const backButtonStyle = {
  padding: "10px 14px",
  marginBottom: "20px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "8px",
  cursor: "pointer",
};

const errorStyle = {
  padding: "14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  whiteSpace: "pre-line" as const,
};

const warningStyle = {
  padding: "14px",
  color: "#fde68a",
  backgroundColor:
    "rgba(120, 53, 15, 0.3)",
  border: "1px solid #a16207",
  borderRadius: "8px",
};

const successStyle = {
  padding: "14px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
};

const copyButtonStyle = {
  padding: "9px 14px",
  color: "white",
  backgroundColor: "#16a34a",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 700,
};

const bbcodeStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  minHeight: "520px",
  padding: "12px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "8px",
  fontFamily: "monospace",
};