import type {
  DORRating,
} from "./generateDORBBCode";

export type PPOWEROutcome =
  | "Satisfactory"
  | "Unsatisfactory";

export type PPOWERFormData = {
  probationaryOfficer: string;
  probationarySerial: string;
  fieldTrainingManager: string;
  managerSerial: string;

  strengthsDiscussed: boolean;
  weaknessesDiscussed: boolean;
  remedialRequired: boolean;

  remedialTraining: string;
  summaryComments: string;

  outcome: PPOWEROutcome;
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
  { id: 9, section: "PERFORMANCE", label: "Self-Initiated Field Activites" },
  { id: 10, section: "PERFORMANCE", label: "Field Activities: Traffic Stop" },
  { id: 11, section: "PERFORMANCE", label: "Field Activities: Arrest Procedure" },
  { id: 12, section: "PERFORMANCE", label: "Officer Safety Principles" },
  { id: 13, section: "PERFORMANCE", label: "Control of Conflict: Voice Command/Physical Skill" },
  { id: 14, section: "PERFORMANCE", label: "Use of Common Sense and Good Judgement" },
  { id: 15, section: "PERFORMANCE", label: "Radio/MDC: Use of Mobile Data Computer" },
  { id: 16, section: "PERFORMANCE", label: "Radio: Articulation of Transmissions" },
  { id: 17, section: "RELATIONSHIPS", label: "With Citizens/Employees in General" },
];

function checkbox(
  selected: boolean
) {
  return selected
    ? "[cb=1][/cb]"
    : "[cb][/cb]";
}

function ratingCells(
  rating: DORRating
) {
  return [
    checkbox(rating === "1"),
    checkbox(rating === "2"),
    checkbox(rating === "3"),
    checkbox(rating === "4"),
    checkbox(rating === "N/O"),
  ]
    .map(
      (box) =>
        `[td][center]${box}[/center][/td]`
    )
    .join("\n");
}

function yesNoText(
  value: boolean
) {
  return value
    ? "have"
    : "have not";
}

function hasHasNotText(
  value: boolean
) {
  return value
    ? "has"
    : "has not";
}

export function generatePPOWERBBCode(
  data: PPOWERFormData,
  ratings: Record<
    number,
    DORRating
  >
) {
  const ratingRows =
    evaluationCategories
      .map((category) => {
        const sectionRow =
          category.id === 1 ||
          category.id === 2 ||
          category.id === 3 ||
          category.id === 5 ||
          category.id === 17
            ? `[tr]\n[td][font=Arial][b]${category.section}[/b][/td]\n[/tr]\n`
            : "";

        return `${sectionRow}[tr]
[td][font=Arial]${category.id}. ${category.label}[/td]
${ratingCells(
  ratings[category.id] ?? ""
)}
[/tr]`;
      })
      .join("\n");

  return `[font=Arial][color=black]Page [u]1[/u] of [u]1[/u][/color][/font]
[hr][/hr]
[font=Arial][center]LOS SANTOS POLICE DEPARTMENT
[size=120][color=black][b]PROBATIONARY POLICE OFFICER WEEKLY EVALUATION REPORT[/b][/font][/color][/size][/center]

[table2=1,black,transparent,Arial]
[tr]
[tdwidth=1,black,transparent,top,left,30,5]
[size=87]PROBATIONARY POLICE OFFICER[/size]
${data.probationaryOfficer}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5]
[size=87]SERIAL NO.[/size]
${data.probationarySerial}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,25,5]
[size=87]FIELD TRAINING MANAGER[/size]
${data.fieldTrainingManager}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5]
[size=87]SERIAL NO.[/size]
${data.managerSerial}
[/tdwidth][/tr]
[/table2]
[font=Arial]
[b]RATING INSTRUCTIONS: Use the following scale to summarize the probationary police officer's performance throughout the week. A SPECIFIC comment MUST have been made on a Daily Observation Report during the week being reviewed if a rating of (1) BELOW STANDARD, (2) IMPROVEMENT REQUIRED, or (4) ABOVE STANDARD is given. Check NOT OBSERVED (N/O) if behavior is not observed throughout the week.[/b]
[list=none](1) [b][u]BELOW STANDARD:[/u][/b] - The behavior demonstrates an inability to accomplish required tasks.
(2) [b][u]IMPROVEMENT REQUIRED:[/u][/b] - Performance is progressing towards acceptable, but does not yet meet the agency's standard.
(3) [b][u]STANDARD:[/u][/b] - The behavior demonstrates an adequate ability to accomplish required tasks.
(4) [b][u]ABOVE STANDARD:[/u][/b] - The behavior demonstrates a more than adequate ability to accomplish required tasks.
(N/O) [b][u]NOT OBSERVED:[/u][/b] - The behavior was not observed.[/list]
[table]
[tr]
[td][font=Arial][b]CATEGORY[/b][/td]
[td][font=Arial][center][b]1[/b][/center][/td]
[td][font=Arial][center][b]2[/b][/center][/td]
[td][font=Arial][center][b]3[/b][/center][/td]
[td][font=Arial][center][b]4[/b][/center][/td]
[td][font=Arial][center][b]N/O[/b][/center][/td]
[/tr]
${ratingRows}
[/table]
[table2=1,black,transparent,Arial]
[tr][tdwidth=1,black,transparent,top,left,100,5][b]Regarding the Probationer's performance:[/b]
[list][*]I ${yesNoText(
  data.strengthsDiscussed
)} discussed the Probationer's most significant strengths with him/her.
[*]I ${yesNoText(
  data.weaknessesDiscussed
)} discussed the Probationer's most significant weaknesses with him/her.
[*]The Probationer's significant weaknesses ${hasHasNotText(
  data.remedialRequired
)} required remedial training.[/list]

[b]Remedial training, if provided, consisted of:[/b]
[list][*]${data.remedialTraining.trim() || "N/A"}[/list]
[b]Comments regarding significant strengths, weaknesses, and progress to date:[/b]
[list][*]${data.summaryComments.trim() || "N/A"}[/list]

[/tdwidth][/tr][/table2]
[aligntable=left,30,0,0,0,0,0]
[table2=1,black,transparent,Arial]
[tr]
[tdwidth=1,black,transparent,top,left,100,5]
[size=87]SIGNATURE OF FIELD TRAINING MANAGER[/size]
${data.fieldTrainingManager}[/tr]

[/aligntable]
[aligntable=right,0,0,0,0,0,0]
[center][font=Arial][size=110][b]Weekly Performance[/b][/center]


A continuation of an unsatisfactory weekly duty performance 
evaluation may lead to termination of employment with the
Los Santos Police Department.

${checkbox(
  data.outcome ===
    "Satisfactory"
)} Satisfactory [space=200] ${checkbox(
    data.outcome ===
      "Unsatisfactory"
  )}Unsatisfactory[/aligntable]`;
}