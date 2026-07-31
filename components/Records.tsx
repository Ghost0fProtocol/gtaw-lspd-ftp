"use client";

import { useEffect, useState } from "react";
import { getTrainees } from "../lib/trainees";
import TraineeProfile from "./TraineeProfile";
import CreateTrainee from "./CreateTrainee";

import { Trainee } from "../lib/types";


function calculateProgress(
  notebook: any[] = [],
) {

  const items =
    notebook.flatMap(
      section =>
        section.items ?? []
    );


  if(items.length === 0){
    return 0;
  }


  const completed =
    items.filter(
      item => item.completed
    ).length;


  return Math.round(
    (completed / items.length) * 100
  );
}



export default function Records() {

  const [traineeRecords, setTraineeRecords] =
    useState<Trainee[]>([]);


  const [searchTerm, setSearchTerm] =
    useState("");


  const [selectedTrainee, setSelectedTrainee] =
    useState<Trainee | null>(null);


  const [creatingRecord, setCreatingRecord] =
    useState(false);



  useEffect(() => {

    async function loadTrainees() {

      const data =
        await getTrainees();



      const formatted =
        data.map((trainee:any) => ({

          id:
            trainee.id,


          name:
            trainee.profile?.name ??
            "Unknown",


          reference:
            trainee.profile?.reference ??
            "N/A",


          status:
            trainee.status ??
            "Unknown",



          progress:
            calculateProgress(
              trainee.notebook ?? []
            ),



          reports:
            0,


          lastActivity:
            "No activity",



          ftm:
            trainee.ftm?.name ??
            "",



          // IMPORTANT
          // Keep database notebook
          // fallback only if empty
          notebook:
            trainee.notebook ??
            [],

        }));


      setTraineeRecords(
        formatted
      );

    }


    loadTrainees();

  }, []);




  const filteredTrainees =
    traineeRecords.filter(
      trainee =>
        trainee.name
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          )
    );





  if(selectedTrainee){

    return (

      <TraineeProfile

        trainee={
          selectedTrainee
        }


        onBack={() =>
          setSelectedTrainee(null)
        }


        onUpdate={
          updatedTrainee => {

            setTraineeRecords(
              current =>
                current.map(
                  trainee =>
                    trainee.id ===
                    updatedTrainee.id

                    ? updatedTrainee

                    : trainee
                )
            );


            setSelectedTrainee(
              updatedTrainee
            );

          }
        }

      />

    );

  }





  if(creatingRecord){

    return (

      <CreateTrainee

        onCancel={() =>
          setCreatingRecord(false)
        }


        onCreate={
          newTrainee => {


            setTraineeRecords(
              current => [

                ...current,


                {

                  id:
                    crypto.randomUUID(),


                  ...newTrainee,


                  ftm:
                    "",


                  notebook:
                    newTrainee.notebook ??
                    [],


                  progress:
                    0,


                  reports:
                    0,


                  lastActivity:
                    "Just created",

                }

              ]
            );


            setCreatingRecord(false);

          }
        }

      />

    );

  }





  return (

    <div>

      <div
        style={{
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          marginBottom:"22px",
        }}
      >

        <div>

          <h2
            style={{
              margin:"0 0 6px",
            }}
          >
            Training Records
          </h2>


          <p
            style={{
              color:"#94a3b8",
            }}
          >
            Select a record to view its profile.
          </p>

        </div>



        <button

          onClick={() =>
            setCreatingRecord(true)
          }


          style={{
            padding:"11px 16px",
            backgroundColor:"#2563eb",
            color:"white",
            border:"none",
            borderRadius:"8px",
            cursor:"pointer",
          }}

        >
          Add Record

        </button>


      </div>





      <input

        value={searchTerm}

        onChange={
          e =>
            setSearchTerm(
              e.target.value
            )
        }


        placeholder="Search records..."


        style={{
          width:"100%",
          padding:"13px",
          marginBottom:"20px",
          backgroundColor:"#1e293b",
          color:"white",
          border:"1px solid #475569",
          borderRadius:"8px",
        }}

      />






      <div

        style={{
          backgroundColor:"#1e293b",
          border:"1px solid #334155",
          borderRadius:"12px",
        }}

      >

        {
          filteredTrainees.length === 0 ? (

            <p
              style={{
                padding:"20px",
                color:"#94a3b8",
              }}
            >
              No trainee records found.
            </p>


          ) : (


            filteredTrainees.map(
              trainee => (

                <button

                  key={
                    trainee.id
                  }


                  onClick={() =>
                    setSelectedTrainee(
                      trainee
                    )
                  }


                  style={{
                    width:"100%",
                    display:"grid",
                    gridTemplateColumns:
                      "2fr 1fr 1fr 1fr",
                    padding:"18px",
                    backgroundColor:
                      "transparent",
                    color:"white",
                    border:"none",
                    borderTop:
                      "1px solid #334155",
                    textAlign:"left",
                    cursor:"pointer",
                  }}

                >

                  <strong>
                    {trainee.name}
                  </strong>


                  <span>
                    {trainee.status}
                  </span>


                  <span>
                    {trainee.progress}%
                  </span>


                  <span>
                    {trainee.reports}
                  </span>


                </button>

              )
            )

          )
        }


      </div>


    </div>

  );

}