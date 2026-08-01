import { supabase } from "./supabase";


// ================================
// TYPES
// ================================

export type NotebookItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type NotebookSection = {
  section: string;
  items: NotebookItem[];
};


// ================================
// GET ALL TRAINEES
// ================================

export async function getTrainees() {

  const {
    data,
    error,
  } = await supabase
    .from("trainees")
    .select(`
      id,
      status,
      start_date,
      notebook,

      profile:profiles!trainees_profile_id_fkey (
        id,
        name,
        reference,
        role,
        badge_number,
        work_number,
        rank
      ),

      ftm:profiles!trainees_assigned_ftm_fkey (
        id,
        name
      )
    `);

  if (error) {

    console.error(
      "GET TRAINEES ERROR",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;

  }

  console.log(
    "TRAINEES WITH PROFILE DATA:",
    data
  );

  return data ?? [];

}


// ================================
// UPDATE TRAINEE
// ================================

export async function updateTrainee(
  traineeId: string,
  updates: {
    status?: string;
    notebook?: NotebookSection[];
  }
) {

  console.log(
    "UPDATING TRAINEE:",
    traineeId
  );

  console.log(
    "UPDATE DATA:",
    updates
  );

  const {
    data,
    error,
  } = await supabase
    .from("trainees")
    .update(updates)
    .eq(
      "id",
      traineeId
    )
    .select()
    .single();

  if (error) {

    console.error(
      "UPDATE TRAINEE ERROR",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;

  }

  console.log(
    "UPDATED TRAINEE RESULT:",
    data
  );

  return data;

}


// ================================
// UPDATE PROFILE
// ================================

export async function updateTraineeProfile(
  profileId: string,
  updates: {
    name?: string;
    reference?: string;
    badge_number?: string;
    work_number?: string;
    rank?: string;
  }
) {

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .update(updates)
    .eq(
      "id",
      profileId
    )
    .select()
    .single();

  if (error) {

    console.error(
      "UPDATE PROFILE ERROR",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;

  }

  return data;

}


// ================================
// ASSIGN FTM
// ================================

export async function assignFTM(
  traineeId: string,
  ftmId: string | null
) {

  const {
    data,
    error,
  } = await supabase
    .from("trainees")
    .update({
      assigned_ftm: ftmId,
    })
    .eq(
      "id",
      traineeId
    )
    .select()
    .single();

  if (error) {

    console.error(
      "ASSIGN FTM ERROR",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    throw error;

  }

  return data;

}