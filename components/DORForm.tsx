"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getTrainees } from "../lib/trainees";


const cardStyle = {
  padding: "24px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};


const inputStyle = {
  width: "100%",
  padding: "12px",
  backgroundColor: "#0f172a",
  color: "white",
  border: "1px solid #475569",
  borderRadius: "8px",
};


const textareaStyle = {
  width: "100%",
  minHeight: "120px",
  padding: "12px",
  backgroundColor: "#0f172a",
  color: "white",
  border: "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
};

type Rating =
  | "1"
  | "2"
  | "3"
  | "4"
  | "N/O"
  | "";


type Trainee = {
  id: string;
  name: string;
  reference: string;
};


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
    label:
      "Law, Penal Code, Search and Seizure",
  },
  {
    id: 5,
    section: "PERFORMANCE",
    label:
      "Driving Skill: General",
  },
  {
    id: 6,
    section: "PERFORMANCE",
    label:
      "Driving Skill: Orientation and Response Time to Calls",
  },
  {
    id: 7,
    section: "PERFORMANCE",
    label:
      "Report Writing: Accuracy/Grammar/Organisation",
  },
  {
    id: 8,
    section: "PERFORMANCE",
    label:
      "Field Performance",
  },
  {
    id: 9,
    section: "PERFORMANCE",
    label:
      "Self-Initiated Field Activities",
  },
  {
    id: 10,
    section: "PERFORMANCE",
    label:
      "Field Activities: Traffic Stop",
  },
  {
    id: 11,
    section: "PERFORMANCE",
    label:
      "Field Activities: Arrest Procedure",
  },
  {
    id: 12,
    section: "PERFORMANCE",
    label:
      "Officer Safety Principles",
  },
  {
    id: 13,
    section: "PERFORMANCE",
    label:
      "Control of Conflict: Voice Command/Physical Skill",
  },
  {
    id: 14,
    section: "PERFORMANCE",
    label:
      "Use of Common Sense and Good Judgement",
  },
  {
    id: 15,
    section: "PERFORMANCE",
    label:
      "Radio/MDC: Use of Mobile Data Computer",
  },
  {
    id: 16,
    section: "PERFORMANCE",
    label:
      "Radio: Articulation of Transmissions",
  },
  {
    id: 17,
    section: "RELATIONSHIPS",
    label:
      "With Citizens/Employees in General",
  },
];


const ratings: Exclude<Rating, "">[] = [
  "1",
  "2",
  "3",
  "4",
  "N/O",
];


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
  return evaluationCategories.reduce(
    (ratings, category) => {
      ratings[category.id] = "";
      return ratings;
    },
    {} as Record<number, Rating>,
  );
}


export default function DORForm() {

  const [trainees, setTrainees] =
    useState<Trainee[]>([]);


  const [formData, setFormData] =
    useState<DORFormData>(
      initialFormData,
    );


  const [selectedTrainee, setSelectedTrainee] =
    useState("");


  const [evaluationRatings, setEvaluationRatings] =
    useState<Record<number, Rating>>(
      createInitialRatings,
    );


  const [generatedBBCode, setGeneratedBBCode] =
    useState("");


  const [copied, setCopied] =
    useState(false);


  const [errorMessage, setErrorMessage] =
    useState("");


  useEffect(() => {

    async function loadTrainees() {

      const data = await getTrainees();


      const formatted: Trainee[] =
        data.map((trainee: any) => ({
          id: trainee.id,
          name:
            trainee.profile?.name ??
            trainee.name ??
            "Unknown",

          reference:
            trainee.profile?.reference ??
            trainee.reference ??
            "N/A",
        }));


      setTrainees(formatted);

    }


    loadTrainees();

  }, []);
    function updateField(
    field: keyof DORFormData,
    value: string,
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }


  function updateRating(
    id: number,
    rating: Rating,
  ) {
    setEvaluationRatings((current) => ({
      ...current,
      [id]: rating,
    }));
  }


  function selectTrainee(
    traineeId: string,
  ) {

    const trainee =
      trainees.find(
        (item) =>
          item.id === traineeId,
      );


    if (!trainee) return;


    setSelectedTrainee(
      trainee.id,
    );


    setFormData((current) => ({
      ...current,

      probationaryOfficer:
        trainee.name,

      probationarySerial:
        trainee.reference,
    }));

  }


  function generateBBCode() {

    const traineeName =
      formData.probationaryOfficer ||
      "Unknown";


    let output = "";

    output +=
      `[b]DAILY OBSERVATION REPORT[/b]\n\n`;


    output +=
      `[b]Probationary Officer:[/b] ${traineeName}\n`;

    output +=
      `[b]Serial:[/b] ${formData.probationarySerial}\n`;

    output +=
      `[b]Field Training Officer:[/b] ${formData.fieldTrainingOfficer}\n`;

    output +=
      `[b]FTO Serial:[/b] ${formData.ftoSerial}\n\n`;


    output +=
      `[b]Patrol Number:[/b] ${formData.patrolNumber}\n`;

    output +=
      `[b]Date:[/b] ${formData.date}\n`;

    output +=
      `[b]Time:[/b] ${formData.time}\n`;

    output +=
      `[b]Duration:[/b] ${formData.duration}\n\n`;


    output +=
      `[b]Incidents / Tasks Completed[/b]\n`;

    output +=
      `${formData.incidentsTasks || "N/A"}\n\n`;


    output +=
      `[b]Evaluation[/b]\n\n`;


    evaluationCategories.forEach(
      (category) => {

        output +=
          `${category.section} - ${category.label}: `;


        output +=
          evaluationRatings[
            category.id
          ] || "N/O";


        output += "\n";

      },
    );


    output += "\n";


    output +=
      `[b]Below Standard[/b]\n`;

    output +=
      `${formData.belowStandard || "None"}\n\n`;


    output +=
      `[b]Above Standard[/b]\n`;

    output +=
      `${formData.aboveStandard || "None"}\n\n`;


    output +=
      `[b]Learning Goals[/b]\n`;

    output +=
      `${formData.learningGoals || "None"}\n\n`;


    output +=
      `[b]Roleplay Remarks[/b]\n`;

    output +=
      `${formData.roleplayRemarks || "None"}\n`;


    setGeneratedBBCode(output);

  }


  async function copyBBCode() {

    await navigator.clipboard.writeText(
      generatedBBCode,
    );


    setCopied(true);


    setTimeout(() => {
      setCopied(false);
    }, 2000);

  }


  function submitDOR(
    event: FormEvent,
  ) {

    event.preventDefault();

    generateBBCode();

  }
    return (
    <div>

      <div
        style={{
          marginBottom: "25px",
        }}
      >

        <h2>
          Daily Observation Report
        </h2>

        <p
          style={{
            color: "#94a3b8",
          }}
        >
          Create and generate a formatted DOR report.
        </p>

      </div>



      <form
        onSubmit={submitDOR}
        style={{
          display: "grid",
          gap: "20px",
        }}
      >


        {/* TRAINEE SELECT */}

        <div
          style={cardStyle}
        >

          <h3>
            Trainee Information
          </h3>


          <select
            value={selectedTrainee}
            onChange={(e) =>
              selectTrainee(
                e.target.value,
              )
            }
            style={inputStyle}
          >

            <option value="">
              Select Trainee
            </option>


            {trainees.map(
              (trainee) => (

                <option
                  key={trainee.id}
                  value={trainee.id}
                >
                  {trainee.name}
                </option>

              ),
            )}

          </select>



          <input
            placeholder="Probationary Serial"
            value={
              formData.probationarySerial
            }
            onChange={(e) =>
              updateField(
                "probationarySerial",
                e.target.value,
              )
            }
            style={inputStyle}
          />


          <input
            placeholder="Field Training Officer"
            value={
              formData.fieldTrainingOfficer
            }
            onChange={(e) =>
              updateField(
                "fieldTrainingOfficer",
                e.target.value,
              )
            }
            style={inputStyle}
          />


          <input
            placeholder="FTO Serial"
            value={
              formData.ftoSerial
            }
            onChange={(e) =>
              updateField(
                "ftoSerial",
                e.target.value,
              )
            }
            style={inputStyle}
          />


        </div>





        {/* PATROL DETAILS */}

        <div
          style={cardStyle}
        >

          <h3>
            Patrol Details
          </h3>


          <input
            placeholder="Patrol Number"
            value={
              formData.patrolNumber
            }
            onChange={(e) =>
              updateField(
                "patrolNumber",
                e.target.value,
              )
            }
            style={inputStyle}
          />

          <input
            placeholder="Date"
            value={
              formData.date
            }
            onChange={(e) =>
              updateField(
                "date",
                e.target.value,
              )
            }
            style={inputStyle}
          />


          <input
            placeholder="Time"
            value={
              formData.time
            }
            onChange={(e) =>
              updateField(
                "time",
                e.target.value,
              )
            }
            style={inputStyle}
          />


          <input
            placeholder="Duration"
            value={
              formData.duration
            }
            onChange={(e) =>
              updateField(
                "duration",
                e.target.value,
              )
            }
            style={inputStyle}
          />

        </div>





        {/* INCIDENTS */}

        <div
          style={cardStyle}
        >

          <h3>
            Incidents / Tasks
          </h3>


          <textarea
            value={
              formData.incidentsTasks
            }
            onChange={(e) =>
              updateField(
                "incidentsTasks",
                e.target.value,
              )
            }
            style={textareaStyle}
          />

        </div>






        {/* RATINGS */}

        <div
          style={cardStyle}
        >

          <h3>
            Evaluation
          </h3>


          {
            evaluationCategories.map(
              (category) => (

                <div
                  key={category.id}
                  style={{
                    display:"flex",
                    justifyContent:
                      "space-between",
                    padding:
                      "12px 0",
                    borderBottom:
                      "1px solid #334155",
                  }}
                >

                  <span>
                    {category.label}
                  </span>


                  <select
                    value={
                      evaluationRatings[
                        category.id
                      ]
                    }
                    onChange={(e) =>
                      updateRating(
                        category.id,
                        e.target.value as Rating,
                      )
                    }
                    style={{
                      ...inputStyle,
                      width:"120px",
                    }}
                  >

                    <option value="">
                      -
                    </option>


                    {
                      ratings.map(
                        (rating) => (

                          <option
                            key={rating}
                            value={rating}
                          >
                            {rating}
                          </option>

                        ),
                      )
                    }

                  </select>


                </div>

              ),
            )
          }


        </div>







        {/* COMMENTS */}

        <div
          style={cardStyle}
        >

          <h3>
            Feedback
          </h3>


          <textarea
            placeholder="Below Standard"
            value={
              formData.belowStandard
            }
            onChange={(e)=>
              updateField(
                "belowStandard",
                e.target.value,
              )
            }
            style={textareaStyle}
          />


          <textarea
            placeholder="Above Standard"
            value={
              formData.aboveStandard
            }
            onChange={(e)=>
              updateField(
                "aboveStandard",
                e.target.value,
              )
            }
            style={textareaStyle}
          />


          <textarea
            placeholder="Learning Goals"
            value={
              formData.learningGoals
            }
            onChange={(e)=>
              updateField(
                "learningGoals",
                e.target.value,
              )
            }
            style={textareaStyle}
          />


          <textarea
            placeholder="Roleplay Remarks"
            value={
              formData.roleplayRemarks
            }
            onChange={(e)=>
              updateField(
                "roleplayRemarks",
                e.target.value,
              )
            }
            style={textareaStyle}
          />

        </div>






        <button
          type="submit"
          style={{
            padding:"14px",
            background:"#2563eb",
            color:"white",
            border:"none",
            borderRadius:"8px",
            cursor:"pointer",
            fontSize:"16px",
          }}
        >
          Generate DOR BBCode
        </button>


      </form>






      {
        generatedBBCode && (

          <div
            style={{
              ...cardStyle,
              marginTop:"25px",
            }}
          >

            <div
              style={{
                display:"flex",
                justifyContent:
                  "space-between",
              }}
            >

              <h3>
                Generated BBCode
              </h3>


              <button
                onClick={copyBBCode}
                style={{
                  background:"#16a34a",
                  color:"white",
                  border:"none",
                  padding:"8px 14px",
                  borderRadius:"6px",
                  cursor:"pointer",
                }}
              >
                {
                  copied
                  ? "Copied!"
                  : "Copy"
                }
              </button>

            </div>



            <textarea
              value={generatedBBCode}
              readOnly
              style={{
                ...textareaStyle,
                height:"350px",
                fontFamily:
                  "monospace",
              }}
            />

          </div>

        )
      }


    </div>
  );
}