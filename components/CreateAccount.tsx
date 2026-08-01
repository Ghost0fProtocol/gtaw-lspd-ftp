"use client";

import { useState } from "react";
import { createAccount } from "../lib/auth";


type Props = {

  onBack: () => void;

};




export default function CreateAccount({

  onBack,

}: Props) {



const [name,setName] =
useState("");

const [password,setPassword] =
useState("");

const [error,setError] =
useState("");






async function submit(){


setError("");





if(
name.trim() === "" ||
password.trim() === ""
){

setError(
"Please fill in all fields."
);

return;

}





if(password.length < 6){

setError(
"Password is too short. Please use at least 6 characters."
);

return;

}





try{


await createAccount(

name.trim(),

password

);




alert(

"Account created!"

);




onBack();




}

catch(error){



console.error(

"CREATE ACCOUNT ERROR",

JSON.stringify(

error,

null,

2

)

);





setError(

error instanceof Error

?

error.message

:

"Account creation failed. Please try again."

);



}



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

Create Account

</h1>





<p

style={{

color:"#94a3b8",

}}

>

New users start as Probationary Officers.

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