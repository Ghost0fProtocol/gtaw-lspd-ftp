"use client";

import { FormEvent, useState } from "react";
const trainees = [
  {
    id: 1,
    name: "Alex Smith",
    serial: "TRN-001",
  },
  {
    id: 2,
    name: "Jordan Lee",
    serial: "TRN-002",
  },
  {
    id: 3,
    name: "Taylor Brown",
    serial: "TRN-003",
  },
];

type Rating = "1" | "2" | "3" | "4" | "N/O" | "";

type EvaluationCategory = {
  id: number;
  section: string;
  label: string;
};

type DORFormData = {
  probationaryOfficer: string;
  probationarySerial: string;
  fieldTrainingOfficer: string;
  ftoSerial: string;
  patrolNumber: string;
  date: string;
  time: string;
  duration: string;
  incidentsTasks: string;
  belowStandard: string;
  aboveStandard: string;
  learningGoals: string;
  roleplayRemarks: string;
};

const evaluationCategories: EvaluationCategory[] = [
  {
    id: 1,
    section: "APPEARANCE",
    label: "General Appearance",
  },
  {
    id: 2,
    section: "ATTITUDE",
    label: "Attitude towards the Job and Feedback",
  },
  {
    id: 3,
    section: "KNOWLEDGE",
    label: "Department Policies/Procedures",
  },
  {
    id: 4,
    section: "KNOWLEDGE",
    label: "Law, Penal Code, Search and Seizure",
  },
  {
    id: 5,
    section: "PERFORMANCE",
    label: "Driving Skill: General",
  },
  {
    id: 6,
    section: "PERFORMANCE",
    label: "Driving Skill: Orientation and Response Time to Calls",
  },
  {
    id: 7,
    section: "PERFORMANCE",
    label: "Report Writing: Accuracy/Grammar/Organisation",
  },
  {
    id: 8,
    section: "PERFORMANCE",
    label: "Field Performance",
  },
  {
    id: 9,
    section: "PERFORMANCE",
    label: "Self-Initiated Field Activities",
  },
  {
    id: 10,
    section: "PERFORMANCE",
    label: "Field Activities: Traffic Stop",
  },
  {
    id: 11,
    section: "PERFORMANCE",
    label: "Field Activities: Arrest Procedure",
  },
  {
    id: 12,
    section: "PERFORMANCE",
    label: "Officer Safety Principles",
  },
  {
    id: 13,
    section: "PERFORMANCE",
    label: "Control of Conflict: Voice Command/Physical Skill",
  },
  {
    id: 14,
    section: "PERFORMANCE",
    label: "Use of Common Sense and Good Judgement",
  },
  {
    id: 15,
    section: "PERFORMANCE",
    label: "Radio/MDC: Use of Mobile Data Computer",
  },
  {
    id: 16,
    section: "PERFORMANCE",
    label: "Radio: Articulation of Transmissions",
  },
  {
    id: 17,
    section: "RELATIONSHIPS",
    label: "With Citizens/Employees in General",
  },
];

const ratings: Exclude<Rating, "">[] = ["1", "2", "3", "4", "N/O"];

const initialFormData: DORFormData = {
  probationaryOfficer: "",
  probationarySerial: "",
  fieldTrainingOfficer: "",
  ftoSerial: "",
  patrolNumber: "",
  date: "",
  time: "",
  duration: "",
  incidentsTasks: "",
  belowStandard: "",
  aboveStandard: "",
  learningGoals: "",
  roleplayRemarks: "",
};

function createInitialRatings(): Record<number, Rating> {
  return evaluationCategories.reduce<Record<number, Rating>>(
    (currentRatings, category) => {
      currentRatings[category.id] = "";
      return currentRatings;
    },
    {},
  );
}

export default function DORForm() {
  const [formData, setFormData] = useState<DORFormData>(initialFormData);
  const [selectedTrainee, setSelectedTrainee] = useState("");
  const [evaluationRatings, setEvaluationRatings] = useState<
    Record<number, Rating>
  >(createInitialRatings);
  const [generatedBBCode, setGeneratedBBCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(
    field: keyof DORFormData,
    value: string,
  ) {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));

    setErrorMessage("");
  }

  function updateRating(categoryId: number, rating: Rating) {
    setEvaluationRatings((currentRatings) => ({
      ...currentRatings,
      [categoryId]: rating,
    }));

    setErrorMessage("");
  }

  function checkboxForRating(
    categoryId: number,
    rating: Exclude<Rating, "">,
  ) {
    return evaluationRatings[categoryId] === rating
      ? "[cb=1][/cb]"
      : "[cb][/cb]";
  }

  function buildEvaluationRows() {
    let currentSection = "";

    return evaluationCategories
      .map((category) => {
        let sectionRow = "";

        if (category.section !== currentSection) {
          currentSection = category.section;

          sectionRow = `[tr][td colspan="6"][font=Arial][b]${category.section}[/b][/font][/td][/tr]
`;
        }

        return `${sectionRow}[tr]
[td][font=Arial]${category.id}. ${category.label}[/font][/td]
[td][center]${checkboxForRating(category.id, "1")}[/center][/td]
[td][center]${checkboxForRating(category.id, "2")}[/center][/td]
[td][center]${checkboxForRating(category.id, "3")}[/center][/td]
[td][center]${checkboxForRating(category.id, "4")}[/center][/td]
[td][center]${checkboxForRating(category.id, "N/O")}[/center][/td]
[/tr]`;
      })
      .join("\n");
  }

  function buildBBCode() {
    return `[font=Arial][color=black]Page [u]1[/u] of [u]1[/u][/color][/font]
[hr][/hr]
[font=Arial][center]LOS SANTOS POLICE DEPARTMENT
[size=120][color=black][b]PROBATIONARY POLICE OFFICER
DAILY OBSERVATION REPORT[/b][/font][/color][/size][/center]

[table2=1,black,transparent,Arial]
[tr]
[tdwidth=1,black,transparent,top,left,30,5][size=87]PROBATIONARY POLICE OFFICER
${formData.probationaryOfficer}[/size]
[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5][size=87]SERIAL NO.
${formData.probationarySerial}[/size]
[/tdwidth]
[tdwidth=1,black,transparent,top,left,25,5][size=87]FIELD TRAINING OFFICER
${formData.fieldTrainingOfficer}[/size]
[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5][size=87]SERIAL NO.
${formData.ftoSerial}[/size]
[/tdwidth][/tr]
[tr]
[tdwidth=1,black,transparent,top,left,8,5][size=87]PATROL NUMBER
${formData.patrolNumber}[/size]
[/tdwidth]
[tdwidth=1,black,transparent,top,left,25,5][size=87]DATE
${formData.date}[/size]
[/tdwidth]
[tdwidth=1,black,transparent,top,left,15,5][size=87]TIME
${formData.time}[/size]
[/tdwidth]
[tdwidth=1,black,transparent,top,left,15,5][size=87]DURATION
${formData.duration}[/size]
[/tdwidth][/tr]
[/table2]

[font=Arial][b][size=110]INCIDENTS/TASKS[/size][/b][/font]

${formData.incidentsTasks}

[font=Arial][b][size=110]BELOW STANDARD PERFORMANCE[/size][/b][/font]

${formData.belowStandard || "None."}

[font=Arial][b][size=110]ABOVE STANDARD PERFORMANCE[/size][/b][/font]

${formData.aboveStandard || "None."}

[font=Arial][b][size=110]LEARNING GOALS[/size][/b][/font]

${formData.learningGoals || "None."}

[font=Arial][b][size=110](( ROLEPLAY REMARKS ))[/size][/b][/font]

[ooc]${formData.roleplayRemarks || "None."}[/ooc]

[font=Arial][b][size=110]EVALUATION CATEGORIES[/size][/b][/font]

[b]RATING INSTRUCTIONS: Use the following scale to rate the Probationary Officer's performance. A SPECIFIC comment MUST be made if a rating of (1), (2), or (4) is given. Check NOT OBSERVED (N/O) if behavior was not observed.[/b]
[list=none]
(1) [b][u]BELOW STANDARD[/u][/b] - Inability to accomplish required tasks.
(2) [b][u]IMPROVEMENT REQUIRED[/u][/b] - Progressing but below standard.
(3) [b][u]STANDARD[/u][/b] - Adequate performance.
(4) [b][u]ABOVE STANDARD[/u][/b] - Exceeds expectations.
(N/O) [b][u]NOT OBSERVED[/u][/b] - Not observed.
[/list]

[table]
[tr][td][font=Arial][b]Category[/b][/font][/td][td][center][b]1[/b][/center][/td][td][center][b]2[/b][/center][/td][td][center][b]3[/b][/center][/td][td][center][b]4[/b][/center][/td][td][center][b]N/O[/b][/center][/td][/tr]
${buildEvaluationRows()}
[/table]`;
  }

  function validateForm() {
    const requiredFields = [
      formData.probationaryOfficer,
      formData.probationarySerial,
      formData.fieldTrainingOfficer,
      formData.ftoSerial,
      formData.patrolNumber,
      formData.date,
      formData.time,
      formData.duration,
      formData.incidentsTasks,
    ];

    if (requiredFields.some((field) => field.trim() === "")) {
      setErrorMessage(
        "Please complete every required field marked with an asterisk.",
      );
      return false;
    }

    const unratedCategories = evaluationCategories.filter(
      (category) => !evaluationRatings[category.id],
    );

    if (unratedCategories.length > 0) {
      setErrorMessage(
        `Please select a rating for all 17 categories. ${unratedCategories.length} still need a rating.`,
      );
      return false;
    }

    const needsBelowStandardComment = evaluationCategories.some(
      (category) =>
        evaluationRatings[category.id] === "1" ||
        evaluationRatings[category.id] === "2",
    );

    if (
      needsBelowStandardComment &&
      formData.belowStandard.trim() === ""
    ) {
      setErrorMessage(
        "A below-standard performance comment is required when rating a category 1 or 2.",
      );
      return false;
    }

    const needsAboveStandardComment = evaluationCategories.some(
      (category) => evaluationRatings[category.id] === "4",
    );

    if (
      needsAboveStandardComment &&
      formData.aboveStandard.trim() === ""
    ) {
      setErrorMessage(
        "An above-standard performance comment is required when rating a category 4.",
      );
      return false;
    }

    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setGeneratedBBCode(buildBBCode());
    setErrorMessage("");
    setCopied(false);

    window.setTimeout(() => {
      document
        .getElementById("generated-dor-bbcode")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function resetForm() {
    const confirmed = window.confirm(
      "Start a new report? All information currently entered will be cleared.",
    );

    if (!confirmed) {
      return;
    }

    setFormData(initialFormData);
    setEvaluationRatings(createInitialRatings());
    setGeneratedBBCode("");
    setErrorMessage("");
    setCopied(false);
  }

  async function copyBBCode() {
    try {
      await navigator.clipboard.writeText(generatedBBCode);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      alert(
        "The BBCode could not be copied automatically. Please select and copy it manually.",
      );
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px 13px",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    border: "1px solid #475569",
    borderRadius: "7px",
    outline: "none",
    fontSize: "14px",
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: "130px",
    resize: "vertical" as const,
    fontFamily: "Arial, sans-serif",
    lineHeight: "1.5",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    color: "#e2e8f0",
    fontSize: "14px",
    fontWeight: "bold" as const,
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            margin: "0 0 7px",
            fontSize: "26px",
          }}
        >
          Daily Observation Report
        </h2>

        <p
          style={{
            margin: 0,
            color: "#94a3b8",
            lineHeight: "1.5",
          }}
        >
          Complete the report below and generate a forum-ready BBCode version.
        </p>
      </div>

      <section
        style={{
          padding: "24px",
          marginBottom: "22px",
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px",
            fontSize: "18px",
          }}
        >
          Patrol Information
        </h3>
        <div
  style={{
    marginBottom: "20px",
  }}
>
  <label style={labelStyle}>
    Select Probationary Officer:
  </label>

  <select
    value={selectedTrainee}
    onChange={(event) => {
      const trainee = trainees.find(
        (person) => person.id.toString() === event.target.value,
      );

      if (!trainee) {
        return;
      }

      setSelectedTrainee(event.target.value);

      setFormData((currentData) => ({
        ...currentData,
        probationaryOfficer: trainee.name,
        probationarySerial: trainee.serial,
      }));
    }}
    style={inputStyle}
  >
    <option value="">
      Select trainee...
    </option>

    {trainees.map((trainee) => (
      <option
        key={trainee.id}
        value={trainee.id}
      >
        {trainee.name}
      </option>
    ))}
  </select>
</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "18px",
          }}
        >
          <div>
            <label style={labelStyle}>
              Probationary Police Officer: *
            </label>

            <input
              required
              value={formData.probationaryOfficer}
              onChange={(event) =>
                updateField("probationaryOfficer", event.target.value)
              }
              placeholder="Officer name"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Serial No.: *</label>

            <input
              required
              value={formData.probationarySerial}
              onChange={(event) =>
                updateField("probationarySerial", event.target.value)
              }
              placeholder="Serial number"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Field Training Officer: *</label>

            <input
              required
              value={formData.fieldTrainingOfficer}
              onChange={(event) =>
                updateField("fieldTrainingOfficer", event.target.value)
              }
              placeholder="FTO name"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>FTO Serial No.: *</label>

            <input
              required
              value={formData.ftoSerial}
              onChange={(event) =>
                updateField("ftoSerial", event.target.value)
              }
              placeholder="Serial number"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Patrol Number: *</label>

            <input
              required
              value={formData.patrolNumber}
              onChange={(event) =>
                updateField("patrolNumber", event.target.value)
              }
              placeholder="Patrol number"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Date: *</label>

            <input
              required
              type="date"
              value={formData.date}
              onChange={(event) =>
                updateField("date", event.target.value)
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Time: *</label>

            <input
              required
              type="time"
              value={formData.time}
              onChange={(event) =>
                updateField("time", event.target.value)
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Duration: *</label>

            <input
              required
              type="time"
              value={formData.duration}
              onChange={(event) =>
                updateField("duration", event.target.value)
              }
              style={inputStyle}
            />
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "24px",
          marginBottom: "22px",
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px",
            fontSize: "18px",
          }}
        >
          Observation Details
        </h3>

        <div
          style={{
            display: "grid",
            gap: "20px",
          }}
        >
          <div>
            <label style={labelStyle}>Incidents/Tasks: *</label>

            <textarea
              required
              value={formData.incidentsTasks}
              onChange={(event) =>
                updateField("incidentsTasks", event.target.value)
              }
              placeholder="Describe the incidents attended and tasks completed during the patrol."
              style={textareaStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Below Standard Performance:
            </label>

            <textarea
              value={formData.belowStandard}
              onChange={(event) =>
                updateField("belowStandard", event.target.value)
              }
              placeholder="Describe any performance rated below standard or requiring improvement."
              style={textareaStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Above Standard Performance:
            </label>

            <textarea
              value={formData.aboveStandard}
              onChange={(event) =>
                updateField("aboveStandard", event.target.value)
              }
              placeholder="Describe any performance that exceeded the expected standard."
              style={textareaStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              If you checked any learning goals, explain what you taught
              to complete that goal:
            </label>

            <textarea
              value={formData.learningGoals}
              onChange={(event) =>
                updateField("learningGoals", event.target.value)
              }
              placeholder="Explain the training or coaching provided."
              style={textareaStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Roleplay Remarks:</label>

            <textarea
              value={formData.roleplayRemarks}
              onChange={(event) =>
                updateField("roleplayRemarks", event.target.value)
              }
              placeholder="Enter any out-of-character roleplay remarks."
              style={textareaStyle}
            />
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "24px",
          marginBottom: "22px",
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: "20px",
          }}
        >
          Evaluation Categories
        </h3>

        <div
          style={{
            padding: "18px",
            marginBottom: "22px",
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "9px",
            color: "#cbd5e1",
            fontSize: "14px",
            lineHeight: "1.7",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontWeight: "bold",
              color: "#f8fafc",
            }}
          >
            Rating instructions
          </p>

          <p style={{ margin: "5px 0" }}>
            <strong>(1) Below Standard</strong> — Inability to
            accomplish required tasks.
          </p>

          <p style={{ margin: "5px 0" }}>
            <strong>(2) Improvement Required</strong> — Progressing,
            but below standard.
          </p>

          <p style={{ margin: "5px 0" }}>
            <strong>(3) Standard</strong> — Adequate performance.
          </p>

          <p style={{ margin: "5px 0" }}>
            <strong>(4) Above Standard</strong> — Exceeds expectations.
          </p>

          <p style={{ margin: "5px 0" }}>
            <strong>(N/O) Not Observed</strong> — The behaviour was not
            observed.
          </p>

          <p
            style={{
              margin: "12px 0 0",
              color: "#fbbf24",
            }}
          >
            A specific comment must be entered when a rating of 1, 2 or
            4 is selected.
          </p>
        </div>

        <div
          style={{
            overflowX: "auto",
            border: "1px solid #475569",
            borderRadius: "9px",
          }}
        >
          <div
            style={{
              minWidth: "760px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(360px, 1fr) repeat(5, 70px)",
                alignItems: "center",
                padding: "13px 16px",
                backgroundColor: "#0f172a",
                color: "#cbd5e1",
                fontSize: "13px",
                fontWeight: "bold",
              }}
            >
              <span>Category</span>

              {ratings.map((rating) => (
                <span
                  key={rating}
                  style={{
                    textAlign: "center",
                  }}
                >
                  {rating}
                </span>
              ))}
            </div>

            {evaluationCategories.map((category, index) => {
              const previousCategory = evaluationCategories[index - 1];
              const showSection =
                !previousCategory ||
                previousCategory.section !== category.section;

              return (
                <div key={category.id}>
                  {showSection && (
                    <div
                      style={{
                        padding: "11px 16px",
                        backgroundColor: "#172033",
                        borderTop:
                          index === 0
                            ? "none"
                            : "1px solid #475569",
                        color: "#93c5fd",
                        fontSize: "13px",
                        fontWeight: "bold",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {category.section}
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(360px, 1fr) repeat(5, 70px)",
                      alignItems: "center",
                      minHeight: "58px",
                      padding: "0 16px",
                      backgroundColor: "#1e293b",
                      borderTop: "1px solid #334155",
                    }}
                  >
                    <span
                      style={{
                        paddingRight: "16px",
                        color: "#f1f5f9",
                        fontSize: "14px",
                      }}
                    >
                      {category.id}. {category.label}
                    </span>

                    {ratings.map((rating) => (
                      <label
                        key={rating}
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name={`evaluation-${category.id}`}
                          value={rating}
                          checked={
                            evaluationRatings[category.id] === rating
                          }
                          onChange={() =>
                            updateRating(category.id, rating)
                          }
                          style={{
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "#2563eb",
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: "14px 16px",
            marginBottom: "18px",
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
            border: "1px solid #b91c1c",
            borderRadius: "8px",
            lineHeight: "1.5",
          }}
        >
          {errorMessage}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: generatedBBCode ? "28px" : 0,
        }}
      >
        <button
          type="button"
          onClick={resetForm}
          style={{
            padding: "12px 18px",
            backgroundColor: "#1e293b",
            color: "white",
            border: "1px solid #475569",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          New Report
        </button>

        <button
          type="submit"
          style={{
            padding: "12px 18px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Generate DOR BBCode
        </button>
      </div>

      {generatedBBCode && (
        <section
          id="generated-dor-bbcode"
          style={{
            padding: "24px",
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: "16px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 6px",
                }}
              >
                Generated DOR BBCode
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#94a3b8",
                  fontSize: "14px",
                }}
              >
                Copy this code and paste it into the forum post.
              </p>
            </div>

            <button
              type="button"
              onClick={copyBBCode}
              style={{
                padding: "10px 16px",
                backgroundColor: copied ? "#15803d" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {copied ? "Copied!" : "Copy BBCode"}
            </button>
          </div>

          <textarea
            value={generatedBBCode}
            readOnly
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: "500px",
              boxSizing: "border-box",
              padding: "16px",
              resize: "vertical",
              backgroundColor: "#0f172a",
              color: "#e2e8f0",
              border: "1px solid #475569",
              borderRadius: "8px",
              outline: "none",
              fontFamily: "monospace",
              fontSize: "13px",
              lineHeight: "1.55",
            }}
          />
        </section>
      )}
    </form>
  );
}