"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";


export default function MyNotebook({

user,

traineeId

}:{

user:any;

traineeId?:string;

}){


const [items,setItems] =
useState<any[]>([]);


const [trainee,setTrainee] =
useState<any>(null);


const [profile,setProfile] =
useState<any>(null);


const [loading,setLoading] =
useState(true);


const [openSections,setOpenSections] =
useState<any>({});






useEffect(()=>{

loadNotebook();

},[traineeId]);









async function loadNotebook(){


setLoading(true);





let traineeData:any = null;

let traineeError:any = null;






// FTO VIEWING SOMEONE ELSE

if(traineeId){


const result = await supabase

.from("trainees")

.select("*")

.eq(

"id",

traineeId

)

.single();



traineeData = result.data;

traineeError = result.error;


}

else{


// P1 VIEWING OWN NOTEBOOK

const result = await supabase

.from("trainees")

.select("*")

.eq(

"profile_id",

user.id

)

.single();



traineeData = result.data;

traineeError = result.error;


}









if(traineeError || !traineeData){


console.error(

"NOTEBOOK LOAD ERROR",

traineeError

);


setLoading(false);

return;


}







setTrainee(traineeData);









// LOAD PROFILE DETAILS

const {

data: profileData

}= await supabase

.from("profiles")

.select("*")

.eq(

"id",

traineeData.profile_id

)

.single();





setProfile(profileData);









// LOAD NOTEBOOK ITEMS

const {

data:itemData,

error:itemError

}= await supabase

.from("notebook_items")

.select("*")

.eq(

"trainee_id",

traineeData.id

)

.order(

"section"

);






if(itemError){

console.error(

"ITEM LOAD ERROR",

itemError

);

}





setItems(itemData || []);


setLoading(false);



}









if(loading){

return (

<p>

Loading FTP Notebook...

</p>

);

}









const mandatoryItems = items.filter(

(item)=>

item.item_label.includes("(BFA)") ||

item.item_label.includes("(EVOC)")

);






const trainingItems = items.filter(

(item)=>

!item.item_label.includes("(BFA)") &&

!item.item_label.includes("(EVOC)")

);








const completed =

trainingItems.filter(

x=>x.completed

).length;







const progress =

trainingItems.length

?

Math.round(

(completed / trainingItems.length) * 100

)

:

0;








const sections =

trainingItems.reduce(

(acc,item)=>{


if(!acc[item.section]){

acc[item.section]=[];

}


acc[item.section].push(item);


return acc;


},{}

);








function toggle(section:string){


setOpenSections({

...openSections,

[section]:

!openSections[section]

});


}









return (

<div>





<div style={card}>


<div style={headerGrid}>


<div>

<Image

src="/ftp-logo.png"

alt="FTP Logo"

width={120}

height={120}

/>

</div>





<div>


<h1 style={title}>

LSPD FIELD TRAINING PROGRAM

</h1>



<h2 style={subtitle}>

Probationary Officer Notebook

</h2>


</div>




<div/>




</div>


</div>









<div style={card}>


<h2 style={heading}>

Officer Details

</h2>




<div style={grid}>


<Detail

label="Character Name"

value={profile?.name || user.name}

/>



<Detail

label="Rank"

value={profile?.rank || "Police Officer I"}

/>



<Detail

label="Badge Number"

value={profile?.badge_number || "Not Assigned"}

/>



<Detail

label="Work Number"

value={profile?.work_number || "Not Assigned"}

/>



<Detail

label="Field Training Manager"

value={trainee?.assigned_ftm || "Unassigned"}

/>



<Detail

label="Status"

value={trainee?.status || "Active"}

/>



</div>


</div>









<div style={card}>


<h2 style={heading}>

Mandatory Requirements

</h2>




<div style={contentGap}>


{

mandatoryItems.length === 0

?

<p style={muted}>

No mandatory requirements found.

</p>


:

mandatoryItems.map(item=>(


<div

key={item.id}

style={mandatoryBox}

>


<span>

{item.completed ? "✅":"⬜"}

</span>


<b>

{item.item_label}

</b>


</div>


))


}



</div>


</div>









<div style={card}>


<h2 style={heading}>

Training Progress

</h2>





<div style={contentGap}>


<p>

<b>{completed}</b>

of

<b>

{" "}{trainingItems.length}

</b>

completed

</p>





<div style={progressBackground}>


<div

style={{

...progressBar,

width:`${progress}%`

}}

/>


</div>





<p style={muted}>

{progress}% Complete

</p>



</div>


</div>









<div style={card}>


<h2 style={heading}>

FTP Notebook

</h2>





<div style={contentGap}>


{

Object.entries(sections).map(

([section,sectionItems]:any)=>(



<div key={section}>


<button

onClick={()=>toggle(section)}

style={sectionButton}

>


{openSections[section] ? "▼":"▶"}

{" "}

{section}


</button>







{

openSections[section] &&


sectionItems.map((item:any)=>(


<div

key={item.id}

style={itemBox}

>


<span>

{item.completed ? "✅":"⬜"}

</span>



<div>


<b>

{item.item_label}

</b>




<p style={muted}>

{item.completed ? "Completed":"Pending"}

</p>



</div>


</div>


))


}



</div>


)


)


}



</div>


</div>









<div style={card}>


<h2 style={heading}>

Final Evaluation

</h2>




<p>

{

trainee?.final_evaluation_completed

?

"✅ Final Evaluation Completed"

:

"⏳ Awaiting Completion"

}

</p>


</div>







<button

onClick={()=>window.print()}

style={printButton}

>

🖨 Print / Export FTP Record

</button>







</div>

);


}









function Detail({

label,

value

}:{

label:string;

value:string;

}){


return (

<div style={detailBox}>


<p style={labelStyle}>

{label}

</p>


<p style={valueStyle}>

{value}

</p>


</div>

);

}









const card={

background:"#1e293b",

padding:"32px",

borderRadius:"12px",

marginBottom:"24px"

};





const headerGrid={

display:"grid",

gridTemplateColumns:"120px 1fr 120px",

alignItems:"center",

textAlign:"center" as const

};





const title={

fontWeight:"900",

fontSize:"28px",

margin:0

};





const subtitle={

fontWeight:"700",

color:"#94a3b8",

marginTop:"8px"

};





const heading={

fontWeight:"900",

fontSize:"22px",

marginBottom:"25px",

marginTop:0

};





const contentGap={

display:"flex",

flexDirection:"column" as const,

gap:"14px"

};





const grid={

display:"grid",

gridTemplateColumns:"1fr 1fr",

columnGap:"80px",

rowGap:"25px"

};





const detailBox={

display:"flex",

flexDirection:"column" as const,

gap:"8px"

};





const labelStyle={

fontWeight:"700",

color:"#cbd5e1",

margin:0

};





const valueStyle={

margin:0,

fontSize:"17px"

};





const muted={

color:"#94a3b8",

fontSize:"14px",

margin:0

};





const mandatoryBox={

display:"flex",

gap:"12px",

alignItems:"center",

background:"#0f172a",

padding:"14px",

borderRadius:"8px"

};





const progressBackground={

height:"14px",

background:"#0f172a",

borderRadius:"20px",

overflow:"hidden"

};





const progressBar={

height:"100%",

background:"#2563eb"

};





const sectionButton={

width:"100%",

padding:"16px",

background:"#0f172a",

color:"white",

border:"none",

borderRadius:"8px",

textAlign:"left" as const,

fontWeight:"800",

cursor:"pointer"

};





const itemBox={

display:"flex",

gap:"15px",

alignItems:"center",

padding:"14px",

marginTop:"10px",

background:"#111827",

borderRadius:"8px"

};





const printButton={

padding:"14px 25px",

background:"#2563eb",

color:"white",

border:"none",

borderRadius:"8px",

cursor:"pointer",

fontSize:"16px"

};