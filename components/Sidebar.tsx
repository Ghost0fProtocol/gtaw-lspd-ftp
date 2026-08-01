"use client";


type Props = {

  activePage:string;

  onPageChange:(page:string)=>void;

  role:string;

};





export default function Sidebar({

  activePage,

  onPageChange,

  role

}:Props){



let menuItems:string[] = [];






switch(role){



// PROBATIONARY OFFICER

case "Probationary Officer":

menuItems = [

"Dashboard",

"My Notebook",

"My File",

"Settings"

];

break;






// FIELD TRAINING OFFICER

case "Field Training Officer":

menuItems = [

"Dashboard",

"Daily Observation Reports",

"P1 Records",

"Settings"

];

break;






// FIELD TRAINING MANAGER

case "Field Training Manager":

menuItems = [

"Dashboard",

"Daily Observation Reports",

"P1 Records",

"FTP Management",

"Settings"

];

break;






// FIELD TRAINING SUPERVISOR

case "Field Training Supervisor":

menuItems = [

"Dashboard",

"Daily Observation Reports",

"P1 Records",

"FTP Management",

"Role Requests",

"Settings"

];

break;






// STAFF

case "STAFF":

menuItems = [

"Dashboard",

"Daily Observation Reports",

"P1 Records",

"FTP Management",

"Role Requests",

"Settings"

];

break;






default:

menuItems = [

"Dashboard",

"Settings"

];

break;



}









return (

<aside

style={{

width:"260px",

background:"#111827",

minHeight:"100vh",

padding:"20px"

}}

>


<h2

style={{

color:"white",

marginBottom:"30px"

}}

>

LSPD FTP

</h2>








{

menuItems.map(item=>(


<button

key={item}

onClick={()=>onPageChange(item)}

style={{

width:"100%",

padding:"14px",

marginBottom:"10px",

textAlign:"left",

border:"none",

borderRadius:"8px",

cursor:"pointer",

background:

activePage === item

?

"#2563eb"

:

"#1e293b",

color:"white",

fontSize:"16px"

}}

>


{item}


</button>



))


}





</aside>

);


}