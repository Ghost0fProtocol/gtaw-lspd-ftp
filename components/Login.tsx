"use client";

import { useState } from "react";
import { login } from "../lib/auth";


type LoginProps = {
  onLogin: (user:any)=>void;
  onCreateAccount: ()=>void;
};



export default function Login({
  onLogin,
  onCreateAccount,
}: LoginProps) {


  const [name, setName] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");





  async function handleLogin(){

    setError("");


    const user =
      await login(
        name,
        password
      );



    if(!user){

      setError(
        "Invalid character name or password"
      );

      return;

    }



    onLogin(user);

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
        fontFamily:"Arial, sans-serif",
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
          textAlign:"center",
        }}

      >

        <h1>
          FTP Training Portal
        </h1>


        <p
          style={{
            color:"#94a3b8",
          }}
        >
          Sign in to continue
        </p>





        <input

          placeholder="Character Name"

          value={name}

          onChange={(e)=>
            setName(
              e.target.value
            )
          }

          style={inputStyle}

        />





        <input

          type="password"

          placeholder="Password"

          value={password}

          onChange={(e)=>
            setPassword(
              e.target.value
            )
          }

          style={inputStyle}

        />





        {
          error &&

          <p
            style={{
              color:"#f87171",
            }}
          >
            {error}
          </p>

        }





        <button

          onClick={handleLogin}

          style={buttonStyle}

        >

          Sign In

        </button>





        <button

          onClick={onCreateAccount}

          style={{
            ...buttonStyle,
            marginTop:"12px",
            backgroundColor:"#475569",
          }}

        >

          Create Account

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

  fontWeight:"bold" as const,

};