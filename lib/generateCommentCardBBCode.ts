export type CommentCardBBCodeInput = {
  commentingEmployeeRank: string;
  commentingEmployeeName: string;
  commentingEmployeeSerial: string;
  probationaryOfficerRank: string;
  probationaryOfficerName: string;
  probationaryOfficerSerial: string;
  observedAt: string;
  comments: string;
};

export function generateCommentCardBBCode(
  input: CommentCardBBCodeInput
) {
  const commentingEmployee =
    formatOfficer(
      input.commentingEmployeeRank,
      input.commentingEmployeeName,
      input.commentingEmployeeSerial
    );

  const probationaryOfficer =
    formatOfficer(
      input.probationaryOfficerRank,
      input.probationaryOfficerName,
      input.probationaryOfficerSerial
    );

  const date =
    formatDate(
      input.observedAt
    );

  return `[divbox2=transparent][center][lspdlogo=175][ftplogo=175]
[color=transparent]spacer[/color]
[b]EMPLOYEE COMMENT SHEET[/b][/center]
[color=transparent]spacer[/color]
[b]Commenting Employee Rank, Name & Serial:[/b] ${commentingEmployee}
[b]Probationary Officer, Name & Serial:[/b] ${probationaryOfficer}
[b]Date:[/b] ${date}

[hr][/hr]

[b]COMMENTS:[/b]
[quote]${input.comments.trim()}[/quote]`;
}

function formatOfficer(
  rank: string,
  name: string,
  serial: string
) {
  const identity =
    [rank.trim(), name.trim()]
      .filter(Boolean)
      .join(" ");

  const cleanSerial =
    serial.trim();

  return cleanSerial
    ? `${identity}, ${cleanSerial}`
    : identity;
}

function formatDate(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const day =
    String(
      date.getUTCDate()
    ).padStart(2, "0");

  const month =
    date
      .toLocaleDateString(
        "en-GB",
        {
          month: "short",
          timeZone: "UTC",
        }
      )
      .toUpperCase();

  const year =
    date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}