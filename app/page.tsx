"use client";

import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";
import { getTrainees } from "../lib/trainees";
import { getCurrentUser, logout } from "../lib/auth";

import Login from "../components/Login";
import CreateAccount from "../components/CreateAccount";
import Sidebar from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
import Records from "../components/Records";
import DORForm from "../components/DORForm";
import PersonalDetails from "../components/PersonalDetails";
import Settings from "../components/Settings";
import MyNotebook from "../components/MyNotebook";
import P1Records from "../components/P1Records";





export default function Home(){



const [user,setUser] =
useState<any>(null);



const [creatingAccount,setCreatingAccount] =
useState(false);



const [needsProfile,setNeedsProfile] =
useState(false);



const [activePage,setActivePage] =
useState("Dashboard");



const [trainees,setTrainees] =
useState<any[]>([]);



const [selectedTrainee,setSelectedTrainee] =
useState<string | null>(null);



const [dorTrainee,setDorTrainee] =
useState<string | null>(null);









useEffect(()=>{


async function load(){


const current =
await getCurrentUser();



if(current){

setUser(current);


if(!current.profile_complete){

setNeedsProfile(true);

}

}





const data =
await getTrainees();


setTrainees(data);



}



load();



},[]);









// WATCH ROLE CHANGES

useEffect(()=>{


if(!user) return;



const channel =

supabase

.channel("profile-role-watch")


.on(

"postgres_changes",

{

event:"UPDATE",

schema:"public",

table:"profiles",

filter:`id=eq.${user.id}`

},


(payload)=>{


if(payload.new.role !== user.role){


alert(
"Your FTP role has changed. Please log in again."
);



logout();


setUser(null);



}



}


)

.subscribe();






return ()=>{


supabase.removeChannel(channel);


};



},[user]);









function openNotebook(id:string){


setSelectedTrainee(id);


setActivePage("My Notebook");


}








function openDOR(id:string){


setDorTrainee(id);


setActivePage("Daily Observation Reports");


}









if(creatingAccount){

return (

<CreateAccount

onBack={()=>setCreatingAccount(false)}

/>

);

}








if(!user){

return (

<Login


onLogin={(loggedInUser)=>{


setUser(loggedInUser);



if(!loggedInUser.profile_complete){

setNeedsProfile(true);

}



}}



onCreateAccount={()=>{

setCreatingAccount(true);

}}

/>

);

}









if(needsProfile){

return (

<PersonalDetails

user={user}

onComplete={()=>setNeedsProfile(false)}

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







case "My Notebook":

return (

<MyNotebook

user={user}

traineeId={selectedTrainee || undefined}

/>

);







case "P1 Records":

return (

<P1Records

openNotebook={openNotebook}

openDOR={openDOR}

/>

);







case "Daily Observation Reports":

return (

<DORForm

traineeId={dorTrainee || undefined}

/>

);







case "Records":

return (

<Records/>

);







case "Settings":

return (

<Settings

user={user}

onUpdate={setUser}

/>

);







default:

return (

<div

style={{

background:"#1e293b",

padding:"30px",

borderRadius:"12px"

}}

>

<h2>

{activePage}

</h2>


<p style={{color:"#94a3b8"}}>

Coming soon.

</p>


</div>

);



}



}









return (

<main

style={{

display:"flex",

minHeight:"100vh",

background:"#0f172a",

color:"white",

fontFamily:"Arial, sans-serif"

}}

>





<Sidebar

activePage={activePage}

onPageChange={setActivePage}

role={user.role}

/>








<section

style={{

flex:1,

padding:"40px"

}}

>







<div

style={{

display:"flex",

justifyContent:"space-between",

alignItems:"center"

}}

>





<div>


<p style={{color:"#94a3b8"}}>

Welcome back

</p>


<h1>

{activePage}

</h1>


<p style={{color:"#94a3b8"}}>

{user.name} - {user.role}

</p>


</div>







<button

onClick={async()=>{


await logout();


setUser(null);


}}

style={{

padding:"10px 16px",

background:"#1e293b",

color:"white",

border:"1px solid #475569",

borderRadius:"8px"

}}

>

Logout

</button>



</div>









<div

style={{

marginTop:"30px"

}}

>


{renderPage()}


</div>







</section>







</main>

);


}