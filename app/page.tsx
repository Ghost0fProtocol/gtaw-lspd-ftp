"use client";

import { useEffect, useState } from "react";

import { getTrainees } from "../lib/trainees";
import { getCurrentUser, logout } from "../lib/auth";

import Login from "../components/Login";
import CreateAccount from "../components/CreateAccount";
import Sidebar from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
import Records from "../components/Records";
import DORForm from "../components/DORForm";


const menuItems = [
  "Dashboard",
  "Daily Observation Reports",
  "Records",
  "Tracking",
  "Training",
  "Settings",
];



export default function Home() {


  const [user, setUser] =
    useState<any>(null);


  const [creatingAccount, setCreatingAccount] =
    useState(false);


  const [activePage, setActivePage] =
    useState("Dashboard");


  const [trainees, setTrainees] =
    useState<any[]>([]);




  useEffect(() => {

    const savedUser =
      getCurrentUser();


    if(savedUser){

      setUser(savedUser);

    }



    async function load(){

      const data =
        await getTrainees();


      console.log(
        "Trainees:",
        data
      );


      setTrainees(data);

    }


    load();


  }, []);







  if(creatingAccount){

    return (

      <CreateAccount

        onBack={() =>
          setCreatingAccount(false)
        }

      />

    );

  }







  if(!user){

    return (

      <Login

        onLogin={(loggedInUser)=>{

          console.log(
            "LOGIN SUCCESS",
            loggedInUser
          );


          setUser(
            loggedInUser
          );

        }}


        onCreateAccount={()=>{

          console.log(
            "OPEN CREATE ACCOUNT"
          );


          setCreatingAccount(true);

        }}

      />

    );

  }








  function renderPage(){

    switch(activePage){


      case "Dashboard":

        return (

          <Dashboard
            trainees={trainees}
          />

        );



      case "Records":

        return <Records />;



      case "Daily Observation Reports":

        return <DORForm />;



      default:

        return (

          <div
            style={{
              padding:"32px",
              backgroundColor:"#1e293b",
              border:"1px solid #334155",
              borderRadius:"12px",
            }}
          >

            <h2>
              {activePage}
            </h2>


            <p
              style={{
                color:"#94a3b8",
              }}
            >

              Prototype page.

            </p>


          </div>

        );

    }

  }







  return (

    <main

      style={{

        minHeight:"100vh",

        display:"flex",

        backgroundColor:"#0f172a",

        color:"white",

        fontFamily:"Arial, sans-serif",

      }}

    >


      <Sidebar

        menuItems={menuItems}

        activePage={activePage}

        onPageChange={setActivePage}

      />



      <section

        style={{

          flex:1,

          padding:"40px",

        }}

      >



        <div

          style={{

            display:"flex",

            justifyContent:"space-between",

            alignItems:"center",

            marginBottom:"32px",

          }}

        >


          <div>

            <p
              style={{
                color:"#94a3b8",
              }}
            >
              Welcome back
            </p>


            <h1>
              {activePage}
            </h1>


            <p
              style={{
                color:"#94a3b8",
              }}
            >

              {user.name} - {user.role}

            </p>


          </div>




          <button

            onClick={()=>{

              logout();

              setUser(null);

              setActivePage(
                "Dashboard"
              );

            }}

            style={{

              padding:"10px 16px",

              backgroundColor:"#1e293b",

              color:"white",

              border:"1px solid #475569",

              borderRadius:"8px",

              cursor:"pointer",

            }}

          >

            Log Out

          </button>



        </div>





        {renderPage()}



      </section>


    </main>

  );

}