"use client";

import { supabase } from "./supabase";

export type User = {
  id: string;
  name: string;
  rank: string;
  role: string;
  profile_complete: boolean;
  must_change_password?: boolean;
};

// CREATE ACCOUNT

export async function createAccount(
  name: string,
  password: string
) {
  const {
    data: existingProfile,
    error:
      existingProfileError,
  } = await supabase
    .from("profiles")
    .select("id")
    .ilike(
      "name",
      name
    )
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(
      "The account could not be checked. Please try again."
    );
  }

  if (existingProfile) {
    throw new Error(
      "An account already exists for that character name."
    );
  }

  const email =
    name
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      ) +
    Date.now() +
    "@gmail.com";

  const {
    data,
    error,
  } =
    await supabase.auth.signUp({
      email,
      password,
    });

  if (error) {
    throw new Error(
      "The account could not be created. Please try again."
    );
  }

  if (!data.user) {
    throw new Error(
      "The account could not be created."
    );
  }

  const {
    error: profileError,
  } = await supabase
    .from("profiles")
    .insert({
      id:
        data.user.id,

      name,

      email,

      rank:
        "Police Officer I",

      role:
        "Probationary Officer",

      requested_role:
        null,

      role_request_status:
        null,

      profile_complete:
        false,

      must_change_password:
        false,
    });

  if (profileError) {
    await supabase.auth.signOut();

    throw new Error(
      "The account was created, but the profile could not be saved."
    );
  }

  return data.user;
}

// LOGIN

export async function login(
  name: string,
  password: string
): Promise<User | null> {
  const cleanName =
    name.trim();

  if (
    !cleanName ||
    !password
  ) {
    return null;
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("*")
    .ilike(
      "name",
      cleanName
    )
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    return null;
  }

  const {
    error: signInError,
  } =
    await supabase.auth.signInWithPassword({
      email:
        profile.email,
      password,
    });

  if (signInError) {
    return null;
  }

  return profile as User;
}

// CURRENT USER

export async function getCurrentUser(): Promise<User | null> {
  const {
    data,
    error: authError,
  } =
    await supabase.auth.getUser();

  if (
    authError ||
    !data.user
  ) {
    return null;
  }

  const {
    data: profile,
    error,
  } = await supabase
    .from("profiles")
    .select("*")
    .eq(
      "id",
      data.user.id
    )
    .maybeSingle();

  if (
    error ||
    !profile
  ) {
    await supabase.auth.signOut();
    return null;
  }

  return profile as User;
}

// LOGOUT

export async function logout() {
  await supabase.auth.signOut();
}