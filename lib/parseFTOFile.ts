export type FTOEntryType =
  | "training"
  | "probationary_fto_evaluation"
  | "weekly_ftm_meeting";

export type ParsedFTOLogEntry = {
  date: string;
  durationMinutes: number | null;
  durationText: string;
  subjectName: string;
  entryType: FTOEntryType;
  sourceUrl: string | null;
  sourceMonth: string;
};

export type ParsedFTOMonth = {
  label: string;
  statedTotalMinutes: number;
  statedTotalText: string;
  calculatedTotalMinutes: number;
  resolvedTotalMinutes: number;
  resolvedTotalText: string;
  entries: ParsedFTOLogEntry[];
};

export type ParsedFTOFile = {
  officerName: string;
  serialNumber: string;
  division: string;

  statedTotalInstructionMinutes: number;
  statedTotalInstructionText: string;

  calculatedTotalInstructionMinutes: number;

  resolvedTotalInstructionMinutes: number;
  resolvedTotalInstructionText: string;

  inductionDate: string | null;
  finalEvaluationDate: string | null;
  probationaryPassedDate: string | null;

  monthlyLogs: ParsedFTOMonth[];
  entries: ParsedFTOLogEntry[];

  warnings: string[];
  repairs: string[];
};

const monthNumbers: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

function normaliseWhitespace(
  value: string
) {
  return value
    .replace(/\r/g, "")
    .replace(
      /[\u200e\u200f\u202a\u202b\u202c\u202d\u202e]/g,
      ""
    )
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normaliseBBCode(
  value: string,
  repairs: string[]
) {
  let output = value
    .replace(/\r/g, "")
    .replace(
      /[\u200e\u200f\u202a\u202b\u202c\u202d\u202e]/g,
      ""
    );

  const original = output;

  output = output
    .replace(
      /\[url\s*=\s*/gi,
      "[url="
    )
    .replace(
      /\s+\]/g,
      "]"
    )
    .replace(
      /\[\/\s*url\s*\]/gi,
      "[/url]"
    )
    .replace(
      /\[\/\s*list\s*\]/gi,
      "[/list]"
    )
    .replace(
      /\[\s*list\s*\]/gi,
      "[list]"
    )
    .replace(
      /\[\s*\*\s*\]/g,
      "[*]"
    );

  if (output !== original) {
    repairs.push(
      "Normalised malformed BBCode spacing and URL/list tags."
    );
  }

  return output;
}

function parseDurationToMinutes(
  value: string
) {
  const cleanValue =
    normaliseWhitespace(value);

  if (
    !cleanValue ||
    cleanValue.toUpperCase() ===
      "N/A"
  ) {
    return null;
  }

  const match =
    cleanValue.match(
      /^(\d{1,3}):(\d{2})$/
    );

  if (!match) {
    return null;
  }

  const hours =
    Number(match[1]);

  const minutes =
    Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return (
    hours * 60 +
    minutes
  );
}

function parseForumDate(
  value: string
) {
  const cleanValue =
    normaliseWhitespace(
      value
    ).toUpperCase();

  const match =
    cleanValue.match(
      /^(\d{1,2})\/([A-Z]{3})\/(\d{4})$/
    );

  if (!match) {
    return null;
  }

  const day =
    match[1].padStart(
      2,
      "0"
    );

  const month =
    monthNumbers[match[2]];

  const year =
    match[3];

  if (!month) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function getEntryType(
  subjectText: string
): FTOEntryType {
  const lower =
    subjectText.toLowerCase();

  if (
    lower.includes(
      "probationary field training officer evaluation"
    )
  ) {
    return "probationary_fto_evaluation";
  }

  if (
    lower.includes(
      "weekly ftm meeting"
    )
  ) {
    return "weekly_ftm_meeting";
  }

  return "training";
}

function cleanSubjectName(
  value: string
) {
  return normaliseWhitespace(
    value
  )
    .replace(
      /\s*\(Probationary Field Training Officer Evaluation\)\s*/i,
      ""
    )
    .replace(
      /\s*\(Weekly FTM meeting\)\s*/i,
      ""
    )
    .trim();
}

function extractHeaderValue(
  bbcode: string,
  label: string
) {
  const escapedLabel =
    label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const regex =
    new RegExp(
      `\\[size=87\\]\\s*${escapedLabel}\\s*\\[/size\\]\\s*([\\s\\S]*?)(?=\\[/tdwidth\\])`,
      "i"
    );

  const match =
    bbcode.match(regex);

  return match
    ? normaliseWhitespace(
        match[1]
      )
    : "";
}

function extractMilestoneDate(
  bbcode: string,
  label: string
) {
  const escapedLabel =
    label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const regex =
    new RegExp(
      `${escapedLabel}\\s*\\[cbc\\]\\s*(\\d{1,2}\\/[A-Z]{3}\\/\\d{4})`,
      "i"
    );

  const match =
    bbcode.match(regex);

  return match
    ? parseForumDate(
        match[1]
      )
    : null;
}

function extractMonthlySections(
  bbcode: string
) {
  const sections: {
    label: string;
    statedTotalText: string;
    body: string;
  }[] = [];

  const monthHeaderRegex =
    /\[b\]\s*([A-Z]{3}\s+\d{4})\s*-\s*Total Time:\s*\[\/b\]\s*([0-9]{1,3}:[0-9]{2})/gi;

  const matches = [
    ...bbcode.matchAll(
      monthHeaderRegex
    ),
  ];

  matches.forEach(
    (match, index) => {
      const currentStart =
        (match.index ?? 0) +
        match[0].length;

      const nextStart =
        matches[index + 1]
          ?.index ??
        bbcode.length;

      sections.push({
        label:
          normaliseWhitespace(
            match[1]
          ).toUpperCase(),
        statedTotalText:
          normaliseWhitespace(
            match[2]
          ),
        body:
          bbcode.slice(
            currentStart,
            nextStart
          ),
      });
    }
  );

  return sections;
}

function extractEntryBody(
  monthLabel: string,
  body: string,
  repairs: string[]
) {
  const listMatch =
    body.match(
      /\[list(?:=[^\]]*)?\]([\s\S]*?)\[\/list\]/i
    );

  if (listMatch) {
    return listMatch[1];
  }

  const looksLikeEntries =
    /\d{1,2}\/[A-Z]{3}\/\d{4}\s*-\s*(?:\d{1,3}:\d{2}|N\/A)\s*-/i.test(
      body
    );

  if (looksLikeEntries) {
    repairs.push(
      `${monthLabel}: imported entries despite a missing or malformed [list] wrapper.`
    );

    return body;
  }

  return "";
}

function parseEntriesForMonth(
  monthLabel: string,
  body: string,
  warnings: string[],
  repairs: string[]
) {
  const entries:
    ParsedFTOLogEntry[] =
    [];

  const listBody =
    extractEntryBody(
      monthLabel,
      body,
      repairs
    );

  if (!listBody) {
    warnings.push(
      `No parseable entries were found for ${monthLabel}.`
    );

    return entries;
  }

  const rawEntries =
    listBody
      .split(/\[\*\]/i)
      .map(
        normaliseWhitespace
      )
      .filter(Boolean);

  rawEntries.forEach(
    (rawEntry) => {
      const entryMatch =
        rawEntry.match(
          /^(\d{1,2}\/[A-Z]{3}\/\d{4})\s*-\s*([0-9]{1,3}:[0-9]{2}|N\/A)\s*-\s*\[url\s*=\s*([^\]]*?)\s*\]([\s\S]*?)\[\/url\]/i
        );

      if (!entryMatch) {
        warnings.push(
          `Could not parse an entry in ${monthLabel}: ${rawEntry.slice(
            0,
            140
          )}`
        );

        return;
      }

      const date =
        parseForumDate(
          entryMatch[1]
        );

      if (!date) {
        warnings.push(
          `Invalid date in ${monthLabel}: ${entryMatch[1]}`
        );

        return;
      }

      const durationText =
        normaliseWhitespace(
          entryMatch[2]
        ).toUpperCase();

      const rawSubject =
        normaliseWhitespace(
          entryMatch[4]
        );

      entries.push({
        date,
        durationMinutes:
          parseDurationToMinutes(
            durationText
          ),
        durationText,
        subjectName:
          cleanSubjectName(
            rawSubject
          ),
        entryType:
          getEntryType(
            rawSubject
          ),
        sourceUrl:
          normaliseWhitespace(
            entryMatch[3]
          ) || null,
        sourceMonth:
          monthLabel,
      });
    }
  );

  return entries;
}

export function parseFTOFile(
  bbcode: string
): ParsedFTOFile {
  const warnings: string[] =
    [];

  const repairs: string[] =
    [];

  const cleanBBCode =
    normaliseBBCode(
      bbcode,
      repairs
    );

  const officerName =
    extractHeaderValue(
      cleanBBCode,
      "FIELD TRAINING OFFICER"
    );

  const serialNumber =
    extractHeaderValue(
      cleanBBCode,
      "SERIAL NO."
    );

  const division =
    extractHeaderValue(
      cleanBBCode,
      "DIVISION"
    );

  const statedTotalInstructionText =
    extractHeaderValue(
      cleanBBCode,
      "TOTAL INSTRUCTION TIME"
    );

  const statedTotalInstructionMinutes =
    parseDurationToMinutes(
      statedTotalInstructionText
    ) ?? 0;

  if (!officerName) {
    warnings.push(
      "The Field Training Officer name could not be found."
    );
  }

  if (!serialNumber) {
    warnings.push(
      "The serial number could not be found."
    );
  }

  if (!division) {
    warnings.push(
      "The division could not be found."
    );
  }

  const monthlySections =
    extractMonthlySections(
      cleanBBCode
    );

  const monthlyLogs =
    monthlySections.map(
      (section) => {
        const entries =
          parseEntriesForMonth(
            section.label,
            section.body,
            warnings,
            repairs
          );

        const statedTotalMinutes =
          parseDurationToMinutes(
            section.statedTotalText
          ) ?? 0;

        const calculatedTotalMinutes =
          entries.reduce(
            (
              total,
              entry
            ) =>
              total +
              (
                entry.durationMinutes ??
                0
              ),
            0
          );

        if (
          statedTotalMinutes !==
          calculatedTotalMinutes
        ) {
          repairs.push(
            `${section.label}: corrected total from ${section.statedTotalText} to ${formatMinutes(
              calculatedTotalMinutes
            )}.`
          );
        }

        return {
          label:
            section.label,
          statedTotalMinutes,
          statedTotalText:
            section.statedTotalText,
          calculatedTotalMinutes,
          resolvedTotalMinutes:
            calculatedTotalMinutes,
          resolvedTotalText:
            formatMinutes(
              calculatedTotalMinutes
            ),
          entries,
        };
      }
    );

  const entries =
    monthlyLogs.flatMap(
      (month) =>
        month.entries
    );

  const calculatedTotalInstructionMinutes =
    entries.reduce(
      (
        total,
        entry
      ) =>
        total +
        (
          entry.durationMinutes ??
          0
        ),
      0
    );

  if (
    statedTotalInstructionMinutes !==
    calculatedTotalInstructionMinutes
  ) {
    repairs.push(
      `Corrected total instruction time from ${
        statedTotalInstructionText ||
        "unknown"
      } to ${formatMinutes(
        calculatedTotalInstructionMinutes
      )}.`
    );
  }

  return {
    officerName,
    serialNumber,
    division,

    statedTotalInstructionMinutes,
    statedTotalInstructionText,

    calculatedTotalInstructionMinutes,

    resolvedTotalInstructionMinutes:
      calculatedTotalInstructionMinutes,
    resolvedTotalInstructionText:
      formatMinutes(
        calculatedTotalInstructionMinutes
      ),

    inductionDate:
      extractMilestoneDate(
        cleanBBCode,
        "INDUCTION"
      ),

    finalEvaluationDate:
      extractMilestoneDate(
        cleanBBCode,
        "FINAL EVALUATION"
      ),

    probationaryPassedDate:
      extractMilestoneDate(
        cleanBBCode,
        "PROBATIONARY PASSED"
      ),

    monthlyLogs,
    entries,
    warnings,
    repairs,
  };
}

export function formatMinutes(
  totalMinutes: number
) {
  const safeMinutes =
    Number.isFinite(
      totalMinutes
    ) &&
    totalMinutes > 0
      ? Math.floor(
          totalMinutes
        )
      : 0;

  const hours =
    Math.floor(
      safeMinutes / 60
    );

  const minutes =
    safeMinutes % 60;

  return `${String(
    hours
  ).padStart(
    2,
    "0"
  )}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )}`;
}