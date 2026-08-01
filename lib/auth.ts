"use client";


export type User = {
  id: string;
  name: string;
  password: string;
  role: string;
};



const STORAGE_KEY = "ftp_users";

const CURRENT_USER_KEY = "ftp_current_user";





export function createAccount(
  user: User
) {

  const existingUsers =
    getUsers();


  const exists =
    existingUsers.find(
      existing =>
        existing.name.toLowerCase() ===
        user.name.toLowerCase()
    );


  if(exists){

    throw new Error(
      "User already exists"
    );

  }



  existingUsers.push(
    user
  );


  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(existingUsers)
  );

}







export function getUsers(): User[] {

  if(
    typeof window === "undefined"
  ){

    return [];

  }


  const data =
    localStorage.getItem(
      STORAGE_KEY
    );


  if(!data){

    return [];

  }


  return JSON.parse(data);

}







export function login(
  name: string,
  password: string
) {


  const users =
    getUsers();



  const user =
    users.find(
      item =>
        item.name.toLowerCase() ===
        name.toLowerCase() &&
        item.password === password
    );



  if(!user){

    return null;

  }



  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify(user)
  );



  return user;

}







export function getCurrentUser() {


  if(
    typeof window === "undefined"
  ){

    return null;

  }



  const data =
    localStorage.getItem(
      CURRENT_USER_KEY
    );



  if(!data){

    return null;

  }



  return JSON.parse(data);

}







export function logout(){

  localStorage.removeItem(
    CURRENT_USER_KEY
  );

}