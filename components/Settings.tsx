"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";


const ranks = [

"Police Officer I",
"Police Officer II",
"Police Officer III",
"Police Officer III (DT)",
"Police Officer III+I",
"Sergeant I",
"Sergeant II",
"Lieutenant I",
"Lieutenant II",
"Captain I",
"Captain II",
"Captain III",
"Deputy Chief of Police",
"Assistant Chief of Police",
"Chief of Police"

];


export default function Settings({

user,

onUpdate

}:{

user:any;

onUpdate:(user:any)=>void;

}){


const [name,setName] =
useState(user.name || "");


const [badge,setBadge] =
useState(user.badge_number || "");


const [workNumber,setWorkNumber] =
useState(user.work_number || "");


const [rank,setRank] =
useState(user.rank || "Police Officer I");


const [message,setMessage] =
useState("");



async function save(){


const {data,error}=

await supabase

.from("profiles")

.update({

name,

badge_number:badge,

work_number:workNumber,

rank

})

.eq(

"id",

user.id

)

.select()

.single();



if(error){

console.error(error);

setMessage(
"❌ Failed to update profile."
);

return;

}



setMessage(
"✅ Profile updated successfully."
);


onUpdate(data);


}





async function requestFTO(){


const {error}=

await supabase

.from("profiles")

.update({

requested_role:
"Field Training Officer",

role_request_status:
"Pending"

})

.eq(

"id",

user.id

);





if(error){

console.error(error);

setMessage(
"❌ Failed to submit request."
);

return;

}



setMessage(
"✅ Field Training Officer request submitted."
);



}





return (

<div

style={{

background:"#1e293b",

padding:"30px",

borderRadius:"12px",

maxWidth:"750px"

}}

>


<h2>
Account Settings
</h2>



<div

style={{

display:"grid",

gridTemplateColumns:"1fr 1fr",

gap:"20px"

}}

>



<div>

<label>
Character Name
</label>

<input

value={name}

onChange={(e)=>setName(e.target.value)}

style={input}

/>

</div>





<div>

<label>
Badge Number
</label>

<input

value={badge}

onChange={(e)=>setBadge(e.target.value)}

style={input}

/>

</div>





<div>

<label>
LSPD Rank
</label>


<select

value={rank}

onChange={(e)=>setRank(e.target.value)}

style={input}

>


{ranks.map((item)=>(

<option

key={item}

value={item}

>

{item}

</option>

))}


</select>


</div>





<div>

<label>
Work Number
</label>

<input

value={workNumber}

onChange={(e)=>setWorkNumber(e.target.value)}

style={input}

/>

</div>





<div>

<label>
FTP Role
</label>


<input

value={user.role || "Probationary Officer"}

disabled

style={{

...input,

opacity:0.6

}}

/>


</div>



</div>





<button

onClick={save}

style={button}

>

Save Changes

</button>





{

user.role === "Probationary Officer" &&

!user.requested_role &&

(

<button

onClick={requestFTO}

style={requestButton}

>

Request Field Training Officer Status

</button>

)

}






<p>

{message}

</p>



</div>

);


}





const input = {

width:"100%",

padding:"12px",

marginTop:"6px",

background:"#0f172a",

border:"1px solid #475569",

borderRadius:"8px",

color:"white",

fontSize:"16px"

};



const button = {

marginTop:"25px",

padding:"12px 25px",

background:"#2563eb",

border:"none",

borderRadius:"8px",

color:"white",

cursor:"pointer",

fontSize:"16px"

};


const requestButton = {

marginTop:"15px",

padding:"12px 25px",

background:"#16a34a",

border:"none",

borderRadius:"8px",

color:"white",

cursor:"pointer",

fontSize:"16px"

};