"use client";

import { supabase } from "./supabase";


export type User = {

  id: string;

  name: string;

  rank: string;

  role: string;

  profile_complete: boolean;

};




// CREATE ACCOUNT

export async function createAccount(

  name: string,

  password: string

) {



  const {
    data: existingProfile
  } =
    await supabase

      .from("profiles")

      .select("id")

      .ilike(
        "name",
        name
      )

      .maybeSingle();





  if(existingProfile){

    throw new Error(
      "Account already exists"
    );

  }







  const email =

    name

      .toLowerCase()

      .replace(/[^a-z0-9]/g, "")

      +

      Date.now()

      +

      "@gmail.com";








  const {
    data,
    error
  }
  =
    await supabase.auth.signUp({

      email,

      password,

    });






  if(error){

    throw error;

  }







  if(!data.user){

    throw new Error(
      "User creation failed"
    );

  }








  const {
    error: profileError
  }
  =
    await supabase

      .from("profiles")

      .insert({

        id:
          data.user.id,


        name,


        email,



        // LSPD rank

        rank:

          "Police Officer I",



        // FTP role

        role:

          "Probationary Officer",



        // Role request system

        requested_role:

          null,


        role_request_status:

          null,



        profile_complete:

          false,


      });







  if(profileError){

    throw profileError;

  }







  return data.user;


}









// LOGIN

export async function login(

  name:string,

  password:string

) {



  const {
    data: profile,
    error: profileError
  }
  =
    await supabase

      .from("profiles")

      .select("*")

      .ilike(

        "name",

        name

      )

      .single();






  if(profileError || !profile){

    return null;

  }








  const {
    error
  }
  =
    await supabase.auth.signInWithPassword({

      email:

        profile.email,


      password,


    });






  if(error){

    console.error(

      "LOGIN ERROR",

      error

    );


    return null;


  }






  return profile;


}









// CURRENT USER

export async function getCurrentUser(){



  const {
    data
  }
  =
    await supabase.auth.getUser();






  if(!data.user){

    return null;

  }








  const {
    data: profile,
    error
  }
  =
    await supabase

      .from("profiles")

      .select("*")

      .eq(

        "id",

        data.user.id

      )

      .single();







  if(error || !profile){


    await supabase.auth.signOut();


    return null;


  }







  return profile;



}









// LOGOUT

export async function logout(){


  await supabase.auth.signOut();


}