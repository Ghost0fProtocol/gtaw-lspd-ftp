export type OrientationChecklist = {
  divisionalNotebookCreated: boolean;
  uniformAndEquipmentChecks: boolean;
  missionRowFamiliarisation: boolean;
  radioSetup: boolean;
  vehicleChecks: boolean;
  teamspeakBinds: boolean;
  vehicleSpawning: boolean;
  generalFactionCommands: boolean;
};

export type OrientationBBCodeData = {
  probationaryOfficer: string;
  probationaryOfficerSerial: string;
  completingOfficer: string;
  completingOfficerSerial: string;
  patrolNumber: string;
  date: string;
  time: string;
  duration: string;
  checklist: OrientationChecklist;
  incidentsTasks: string;
};

function yesCheckbox(
  completed: boolean
) {
  return completed
    ? "[cb=1][/cb]"
    : "[cb=][/cb]";
}

function noCheckbox(
  completed: boolean
) {
  return completed
    ? "[cb=][/cb]"
    : "[cb=1][/cb]";
}

function formatForumDate(
  value: string
) {
  if (!value) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = value.split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function buildIncidentsList(
  value: string
) {
  const items =
    value
      .split("\n")
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean);

  if (
    items.length === 0
  ) {
    return "[list][*]None[/list]";
  }

  return `[list]${items
    .map(
      (item) =>
        `[*]${item}`
    )
    .join("\n")}[/list]`;
}

function checklistRow(
  label: string,
  completed: boolean
) {
  return `[tr]
[td][font=Arial]${label}[/td]
[td][center]${yesCheckbox(completed)}[/center][/td]
[td][center]${noCheckbox(completed)}[/center][/td]
[/tr]`;
}

export function generateOrientationBBCode(
  data: OrientationBBCodeData
) {
  return `[font=Arial][color=black]Page [u]1[/u] of [u]1[/u][/color][/font]
[hr][/hr]
[font=Arial][center]LOS SANTOS POLICE DEPARTMENT
[size=120][color=black][b]PROBATIONARY POLICE OFFICER 
INTRODUCTORY AND ORIENTATION REPORT[/b][/font][/color][/size][/center]

[table2=1,black,transparent,Arial]
[tr]
[tdwidth=1,black,transparent,top,left,30,5]
[size=87]PROBATIONARY POLICE OFFICER[/size]
${data.probationaryOfficer}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5]
[size=87]SERIAL NO.[/size]
${data.probationaryOfficerSerial}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,25,5]
[size=87]FIELD TRAINING OFFICER[/size]
${data.completingOfficer}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5]
[size=87]SERIAL NO.[/size]
${data.completingOfficerSerial}
[/tdwidth][/tr]

[tr]
[tdwidth=1,black,transparent,top,left,8,5]
[size=87]PATROL NUMBER[/size]
${data.patrolNumber}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,25,5]
[size=87]DATE[/size]
${formatForumDate(data.date)}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,15,5]
[size=87]TIME[/size]
${data.time}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,15,5]
[size=87]DURATION[/size]
${data.duration}
[/tdwidth][/tr]
[/table2]

[font=Arial][b][size=110]ORIENTATION CHECKLIST[/size][/b]


[table]
[tr]
[td][font=Arial][b]ADMINISTRATIVE[/b][/td]
[td][font=Arial][center][b]✓[/b][/center][/td]
[td][font=Arial][center][b]✗[/b][/center][/td]
[/tr]
${checklistRow(
  "1. Probationer's Divisional Notebook Created",
  data.checklist.divisionalNotebookCreated
)}
[tr]
[td][font=Arial][b]FIELD[/b][/td]
[/tr]
${checklistRow(
  "3. Uniform and Equipment Checks",
  data.checklist.uniformAndEquipmentChecks
)}
${checklistRow(
  "4. Mission Row Familiarization",
  data.checklist.missionRowFamiliarisation
)}
${checklistRow(
  "5. Radio Setup",
  data.checklist.radioSetup
)}
${checklistRow(
  "6. Vehicle Checks (ELS, Maintenance Forms etc.)",
  data.checklist.vehicleChecks
)}
[tr]
[td][font=Arial][ooc][b]OUT OF CHARACTER[/b][/ooc][/td]
[/tr]
${checklistRow(
  "7. Teamspeak Binds (Central / TACs)",
  data.checklist.teamspeakBinds
)}
${checklistRow(
  "8. Vehicle Spawning",
  data.checklist.vehicleSpawning
)}
${checklistRow(
  "9. General Faction Commands",
  data.checklist.generalFactionCommands
)}
[/table]
[br][/br]
[font=Arial][b][size=110]INCIDENTS/TASKS[/size][/b][/font]

${buildIncidentsList(
  data.incidentsTasks
)}`;
}