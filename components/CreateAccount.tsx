"use client";

import { useState } from "react";
import { createAccount } from "../lib/auth";


type Props = {
  onBack: () => void;
};


export default function CreateAccount({
  onBack,
}: Props) {


  const [name, setName] =
    useState("");

  const [reference, setReference] =
    useState("");

  const [password, setPassword] =
    useState("");



  function submit() {

    console.log(
      "Create account clicked"
    );


    if (
      name.trim() === "" ||
      reference.trim() === "" ||
      password.trim() === ""
    ) {

      alert(
        "Please fill in all fields"
      );

      return;

    }



    const newUser = {

      id:
        crypto.randomUUID(),

      name:
        name.trim(),

      reference:
        reference.trim(),

      password,

      role:
        "P1",

    };



    console.log(
      "Creating:",
      newUser
    );



    createAccount(
      newUser
    );



    alert(
      "Account created!"
    );



    onBack();

  }




  return (

    <main

      style={{
        minHeight:"100vh",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        backgroundColor:"#0f172a",
        color:"white",
        padding:"24px",
      }}

    >

      <div

        style={{
          width:"100%",
          maxWidth:"420px",
          padding:"40px",
          backgroundColor:"#1e293b",
          borderRadius:"16px",
          border:"1px solid #334155",
        }}

      >

        <h1>
          Create Account
        </h1>


        <p
          style={{
            color:"#94a3b8",
          }}
        >
          New users start as P1.
        </p>



        <input

          placeholder="Name"

          value={name}

          onChange={(e) =>
            setName(
              e.target.value
            )
          }

          style={inputStyle}

        />



        <input

          placeholder="Reference"

          value={reference}

          onChange={(e) =>
            setReference(
              e.target.value
            )
          }

          style={inputStyle}

        />



        <input

          type="password"

          placeholder="Password"

          value={password}

          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }

          style={inputStyle}

        />



        <button

          type="button"

          onClick={submit}

          style={buttonStyle}

        >

          Create Account

        </button>



        <button

          type="button"

          onClick={onBack}

          style={{
            ...buttonStyle,
            marginTop:"12px",
            backgroundColor:"#475569",
          }}

        >

          Back

        </button>


      </div>


    </main>

  );

}




const inputStyle = {

  width:"100%",

  boxSizing:"border-box" as const,

  padding:"13px",

  marginBottom:"14px",

  backgroundColor:"#0f172a",

  color:"white",

  border:"1px solid #475569",

  borderRadius:"8px",

};



const buttonStyle = {

  width:"100%",

  padding:"13px",

  backgroundColor:"#2563eb",

  color:"white",

  border:"none",

  borderRadius:"8px",

  cursor:"pointer",

};