"use client";

import { useState } from "react";

import { Trainee } from "../lib/types";

type BBCodeRecordProps = {
  trainee: Trainee;
};

export default function BBCodeRecord({ trainee }: BBCodeRecordProps) {
  const [copied, setCopied] = useState(false);

  const bbcode = `[center][size=150][b]FIELD TRAINING RECORD[/b][/size][/center]

[b]Trainee:[/b] ${trainee.name}
[b]Reference:[/b] ${trainee.reference}
[b]Status:[/b] ${trainee.status}
[b]Overall Progress:[/b] ${trainee.progress}%
[b]Reports Completed:[/b] ${trainee.reports}
[b]Last Activity:[/b] ${trainee.lastActivity}

[hr]

[size=120][b]TRAINING SUMMARY[/b][/size]

[b]Current Progress:[/b] ${trainee.progress}%

[b]Completed Reports:[/b] ${trainee.reports}

[b]Trainer Comments:[/b]
No trainer comments have been added.

[hr]

[size=120][b]SIGN-OFF[/b][/size]

[b]Trainee Signature:[/b]

[b]Trainer Signature:[/b]

[b]Date:[/b]`;

  async function copyBBCode() {
    try {
      await navigator.clipboard.writeText(bbcode);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      alert("The BBCode could not be copied. Please select it manually.");
    }
  }

  return (
    <div
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
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3
            style={{
              margin: "0 0 6px",
            }}
          >
            BBCode Record
          </h3>

          <p
            style={{
              margin: 0,
              color: "#94a3b8",
              fontSize: "14px",
            }}
          >
            Generated from the trainee&apos;s current record.
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
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "Copied!" : "Copy BBCode"}
        </button>
      </div>

      <textarea
        value={bbcode}
        readOnly
        spellCheck={false}
        style={{
          width: "100%",
          minHeight: "420px",
          boxSizing: "border-box",
          padding: "16px",
          resize: "vertical",
          backgroundColor: "#0f172a",
          color: "#e2e8f0",
          border: "1px solid #475569",
          borderRadius: "8px",
          outline: "none",
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: "1.6",
        }}
      />
    </div>
  );
}