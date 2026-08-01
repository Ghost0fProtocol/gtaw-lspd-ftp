export type DORRating =
  | "1"
  | "2"
  | "3"
  | "4"
  | "N/O"
  | "";

export type DORGeneratorFormData = {
  probationaryOfficer: string;
  badgeNumber: string;
  rank: string;
  workNumber: string;
  fieldTrainingOfficer: string;
  ftoBadgeNumber: string;
  patrolNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  incidentsTasks: string;
  belowStandard: string;
  aboveStandard: string;
  learningGoals: string;
  roleplayRemarks: string;
};

const categories = [
  ["APPEARANCE","General Appearance"],
  ["ATTITUDE","Attitude towards the Job and Feedback"],
  ["KNOWLEDGE","Department Policies/Procedures"],
  ["KNOWLEDGE","Law, Penal Code, Search and Seizure"],
  ["PERFORMANCE","Driving Skill: General"],
  ["PERFORMANCE","Driving Skill: Orientation and Response Time to Calls"],
  ["PERFORMANCE","Report Writing: Accuracy/Grammar/Organisation"],
  ["PERFORMANCE","Field Performance"],
  ["PERFORMANCE","Self-Initiated Field Activities"],
  ["PERFORMANCE","Field Activities: Traffic Stop"],
  ["PERFORMANCE","Field Activities: Arrest Procedure"],
  ["PERFORMANCE","Officer Safety Principles"],
  ["PERFORMANCE","Control of Conflict: Voice Command/Physical Skill"],
  ["PERFORMANCE","Use of Common Sense and Good Judgement"],
  ["PERFORMANCE","Radio/MDC: Use of Mobile Data Computer"],
  ["PERFORMANCE","Radio: Articulation of Transmissions"],
  ["RELATIONSHIPS","With Citizens/Employees in General"],
] as const;

const cols = ["1","2","3","4","N/O"] as const;

const box=(selected:DORRating,col:string)=>selected===col?"[cbc][/cbc]":"[cb][/cb]";

const fmtDate=(d:string)=>{
 if(!d) return "";
 const [y,m,day]=d.split("-");
 return `${day}/${m}/${y}`;
};

function evalTable(ratings:Record<number,DORRating>){
 let out=`[table]
[tr][td][font=Arial][b]Category[/b][/font][/td][td][center][b]1[/b][/center][/td][td][center][b]2[/b][/center][/td][td][center][b]3[/b][/center][/td][td][center][b]4[/b][/center][/td][td][center][b]N/O[/b][/center][/td][/tr]
`;
 let sec="";
 categories.forEach(([section,label],i)=>{
   if(section!==sec){
     sec=section;
     out+=`[tr][td colspan="6"][font=Arial][b]${section}[/b][/font][/td][/tr]\n`;
   }
   out+=`[tr]
[td][font=Arial]${i+1}. ${label}[/font][/td]
`;
   cols.forEach(c=>out+=`[td][center]${box(ratings[i+1],c)}[/center][/td]\n`);
   out+="[/tr]\n";
 });
 out+="[/table]";
 return out;
}

export function generateDORBBCode(
form:DORGeneratorFormData,
ratings:Record<number,DORRating>
){
return `[font=Arial][color=black]Page [u]1[/u] of [u]1[/u][/color][/font]
[hr][/hr]
[font=Arial][center]LOS SANTOS POLICE DEPARTMENT
[size=120][color=black][b]PROBATIONARY POLICE OFFICER
DAILY OBSERVATION REPORT[/b][/font][/color][/size][/center]

[table2=1,black,transparent,Arial]
[tr]
[tdwidth=1,black,transparent,top,left,30,5][size=87]PROBATIONARY POLICE OFFICER[/size]
${form.probationaryOfficer}[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5][size=87]SERIAL NO.[/size]
${form.badgeNumber}[/tdwidth]
[tdwidth=1,black,transparent,top,left,25,5][size=87]FIELD TRAINING OFFICER[/size]
${form.fieldTrainingOfficer}[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5][size=87]SERIAL NO.[/size]
${form.ftoBadgeNumber}[/tdwidth][/tr]
[tr]
[tdwidth=1,black,transparent,top,left,8,5][size=87]PATROL NUMBER[/size]
${form.patrolNumber}[/tdwidth]
[tdwidth=1,black,transparent,top,left,25,5][size=87]DATE[/size]
${fmtDate(form.date)}[/tdwidth]
[tdwidth=1,black,transparent,top,left,15,5][size=87]TIME[/size]
${form.startTime} - ${form.endTime}[/tdwidth]
[tdwidth=1,black,transparent,top,left,15,5][size=87]DURATION[/size]
${form.duration}[/tdwidth][/tr]
[/table2]

[font=Arial][b][size=110]INCIDENTS/TASKS[/size][/b][/font]

${form.incidentsTasks||"None"}

[font=Arial][b][size=110]BELOW STANDARD PERFORMANCE[/size][/b][/font]

${form.belowStandard||"None"}

[font=Arial][b][size=110]ABOVE STANDARD PERFORMANCE[/size][/b][/font]

${form.aboveStandard||"None"}

[font=Arial][b][size=110]LEARNING GOALS[/size][/b][/font]

${form.learningGoals||"None"}

[font=Arial][b][size=110](( ROLEPLAY REMARKS ))[/size][/b][/font]

[ooc]${form.roleplayRemarks||"None"}[/ooc]

[font=Arial][b][size=110]EVALUATION CATEGORIES[/size][/b][/font]

[b]RATING INSTRUCTIONS: Use the following scale to rate the Probationary Officer's performance. A SPECIFIC comment MUST be made if a rating of (1), (2), or (4) is given. Check NOT OBSERVED (N/O) if behavior was not observed.[/b]
[list=none]
(1) [b][u]BELOW STANDARD[/u][/b] - Inability to accomplish required tasks.
(2) [b][u]IMPROVEMENT REQUIRED[/u][/b] - Progressing but below standard.
(3) [b][u]STANDARD[/u][/b] - Adequate performance.
(4) [b][u]ABOVE STANDARD[/u][/b] - Exceeds expectations.
(N/O) [b][u]NOT OBSERVED[/u][/b] - Not observed.
[/list]

${evalTable(ratings)}`;
}