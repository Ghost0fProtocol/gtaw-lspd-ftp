import { supabase } from "./supabase";

import type {
  NotebookSection,
  PPOWEROutcome,
  TrainingStage,
} from "./types";

// ================================
// UPDATE TYPES
// ================================

type TraineeUpdates = {
  status?: string;
  notebook?: NotebookSection[];

  training_stage?: TrainingStage;

  week_1_ppower_outcome?:
    | PPOWEROutcome;

  week_2_ppower_outcome?:
    | PPOWEROutcome;

  week_1_ppower_completed_at?:
    | string
    | null;

  week_2_ppower_completed_at?:
    | string
    | null;

  fpp_started_at?:
    | string
    | null;

  final_evaluation_unlocked_at?:
    | string
    | null;

  final_evaluation_completed_at?:
    | string
    | null;

  final_evaluation_dor_id?:
    | string
    | null;

  progression_updated_at?:
    | string
    | null;

  progression_updated_by?:
    | string
    | null;

  promoted_to_p2_at?:
    | string
    | null;

  promoted_to_p2_by?:
    | string
    | null;

  assigned_ftm?:
    | string
    | null;
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
      profile_id,
      status,
      start_date,
      notebook,
      assigned_ftm,

      training_stage,

      week_1_ppower_outcome,
      week_2_ppower_outcome,

      week_1_ppower_completed_at,
      week_2_ppower_completed_at,

      fpp_started_at,

      final_evaluation_unlocked_at,
      final_evaluation_completed_at,
      final_evaluation_dor_id,

      progression_updated_at,
      progression_updated_by,

      promoted_to_p2_at,
      promoted_to_p2_by,

      profile:profiles!trainees_profile_id_fkey (
        id,
        name,
        reference,
        role,
        badge_number,
        work_number,
        rank,
        division
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
    "TRAINEES WITH PROFILE AND PROGRESSION DATA:",
    data
  );

  return data ?? [];
}

// ================================
// GET ONE TRAINEE
// ================================

export async function getTrainee(
  traineeId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("trainees")
    .select(`
      id,
      profile_id,
      status,
      start_date,
      notebook,
      assigned_ftm,

      training_stage,

      week_1_ppower_outcome,
      week_2_ppower_outcome,

      week_1_ppower_completed_at,
      week_2_ppower_completed_at,

      fpp_started_at,

      final_evaluation_unlocked_at,
      final_evaluation_completed_at,
      final_evaluation_dor_id,

      progression_updated_at,
      progression_updated_by,

      promoted_to_p2_at,
      promoted_to_p2_by,

      profile:profiles!trainees_profile_id_fkey (
        id,
        name,
        reference,
        role,
        badge_number,
        work_number,
        rank,
        division
      ),

      ftm:profiles!trainees_assigned_ftm_fkey (
        id,
        name
      )
    `)
    .eq(
      "id",
      traineeId
    )
    .single();

  if (error) {
    console.error(
      "GET TRAINEE ERROR",
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
// UPDATE TRAINEE
// ================================

export async function updateTrainee(
  traineeId: string,
  updates: TraineeUpdates
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
    role?: string;
    division?: string;
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
      assigned_ftm:
        ftmId,
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