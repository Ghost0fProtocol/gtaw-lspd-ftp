"use client";

import { useState } from "react";

type CreateTraineeProps = {
  onCreate: (trainee: {
    name: string;
    reference: string;
    division: string;
  }) => void;

  onCancel: () => void;
};

export default function CreateTrainee({
  onCreate,
  onCancel,
}: CreateTraineeProps) {
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [division, setDivision] = useState("");

  function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!name || !serial) {
      return;
    }

    onCreate({
      name,
      reference: serial,
      division,
    });
  }

  return (
    <div
      style={{
        padding: "28px",
        backgroundColor: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "12px",
      }}
    >
      <h2>
        Create Probationer Notebook
      </h2>

      <p style={{ color: "#94a3b8" }}>
        Field Training Manager can be assigned later.
      </p>


      <form onSubmit={handleSubmit}>

        <input
          placeholder="Probationary Officer"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          style={inputStyle}
        />


        <input
          placeholder="Serial Number"
          value={serial}
          onChange={(e) =>
            setSerial(e.target.value)
          }
          style={inputStyle}
        />


        <input
          placeholder="Division"
          value={division}
          onChange={(e) =>
            setDivision(e.target.value)
          }
          style={inputStyle}
        />


        <div
          style={{
            display:"flex",
            gap:"12px",
          }}
        >

          <button
            type="submit"
            style={buttonStyle}
          >
            Create Notebook
          </button>


          <button
            type="button"
            onClick={onCancel}
            style={{
              ...buttonStyle,
              backgroundColor:"#475569",
            }}
          >
            Cancel
          </button>

        </div>

      </form>

    </div>
  );
}



const inputStyle = {
  width:"100%",
  boxSizing:"border-box" as const,
  padding:"12px",
  marginBottom:"14px",
  backgroundColor:"#0f172a",
  color:"white",
  border:"1px solid #475569",
  borderRadius:"8px",
};


const buttonStyle = {
  padding:"12px 18px",
  backgroundColor:"#2563eb",
  color:"white",
  border:"none",
  borderRadius:"8px",
  cursor:"pointer",
};