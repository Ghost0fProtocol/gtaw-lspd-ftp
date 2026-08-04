import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getSupabaseAdmin,
} from "../../../lib/supabaseAdmin";

const ppowerRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "STAFF",
  "LSPD STAFF",
];

const supervisorRoles = [
  "Field Training Supervisor",
  "STAFF",
  "LSPD STAFF",
];

type FTPAction =
  | "recordWeek1PPOWER"
  | "recordWeek2PPOWER"
  | "submitPPOWER"
  | "progressToFPP"
  | "unlockFinalEvaluation"
  | "completeFinalEvaluation"
  | "promoteToP2";

type PPOWEROutcome =
  | "Satisfactory"
  | "Unsatisfactory";

type FTPRequestBody = {
  action?: FTPAction;
  traineeId?: string;
  outcome?: PPOWEROutcome;
  dorId?: string;
  weekNumber?: 1 | 2;
  ratings?: Record<string, string>;
  strengthsDiscussed?: boolean;
  weaknessesDiscussed?: boolean;
  remedialRequired?: boolean;
  remedialTraining?: string;
  summaryComments?: string;
  bbcode?: string;
};

type AuthorisedUser = {
  id: string;
  role: string;
};

type Ratings =
  | Record<string, string>
  | null;

type DORRow = {
  id: string;
  patrol_number: number | null;
  patrol_date: string | null;
  created_at: string | null;
  ratings: Ratings;
  patrol_type: string | null;
  status: string | null;
};

export async function POST(
  request: NextRequest
) {
  try {
    const actingUser =
      await verifyUser(request);

    const body =
      (await request.json()) as FTPRequestBody;

    const action =
      typeof body.action === "string"
        ? body.action
        : "";

    const traineeId =
      typeof body.traineeId === "string"
        ? body.traineeId
        : "";

    if (!action) {
      return NextResponse.json(
        {
          error:
            "No FTP action was provided.",
        },
        {
          status: 400,
        }
      );
    }

    if (!traineeId) {
      return NextResponse.json(
        {
          error:
            "No trainee record was selected.",
        },
        {
          status: 400,
        }
      );
    }

    assertActionPermission(
      action as FTPAction,
      actingUser.role
    );

    switch (action) {
      case "recordWeek1PPOWER":
        return await recordWeek1PPOWER(
          traineeId,
          normaliseOutcome(
            body.outcome
          ),
          actingUser.id
        );

      case "recordWeek2PPOWER":
        return await recordWeek2PPOWER(
          traineeId,
          normaliseOutcome(
            body.outcome
          ),
          actingUser.id
        );

      case "submitPPOWER":
        return await submitPPOWER(
          traineeId,
          body,
          actingUser.id
        );

      case "progressToFPP":
        return await progressToFPP(
          traineeId,
          actingUser.id
        );

      case "unlockFinalEvaluation":
        return await unlockFinalEvaluation(
          traineeId,
          actingUser.id
        );

      case "completeFinalEvaluation":
        return await completeFinalEvaluation(
          traineeId,
          body.dorId,
          actingUser.id
        );

      case "promoteToP2":
        return await promoteToP2(
          traineeId,
          actingUser.id
        );

      default:
        return NextResponse.json(
          {
            error:
              `Unknown FTP action: ${action}`,
          },
          {
            status: 400,
          }
        );
    }
  } catch (error) {
    console.error(
      "FTP API ERROR",
      error
    );

    const message =
      getErrorMessage(error);

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          getErrorStatus(message),
      }
    );
  }
}

async function verifyUser(
  request: NextRequest
): Promise<AuthorisedUser> {
  const supabaseAdmin =
    getSupabaseAdmin();

  const authorization =
    request.headers.get(
      "authorization"
    );

  const accessToken =
    authorization?.startsWith(
      "Bearer "
    )
      ? authorization.slice(7)
      : "";

  if (!accessToken) {
    throw new Error(
      "No access token was provided."
    );
  }

  const {
    data: authData,
    error: authError,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (
    authError ||
    !authData.user
  ) {
    console.error(
      "VERIFY FTP SESSION ERROR",
      authError
    );

    throw new Error(
      "The current login session could not be verified."
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq(
      "id",
      authData.user.id
    )
    .single();

  if (profileError) {
    throw profileError;
  }

  return {
    id: authData.user.id,
    role: profile.role,
  };
}

function assertActionPermission(
  action: FTPAction,
  role: string
) {
  if (
    action ===
      "unlockFinalEvaluation" ||
    action ===
      "completeFinalEvaluation" ||
    action ===
      "promoteToP2"
  ) {
    if (
      !supervisorRoles.includes(
        role
      )
    ) {
      throw new Error(
        "You do not have permission to complete supervisor FTP actions."
      );
    }

    return;
  }

  if (
    !ppowerRoles.includes(role)
  ) {
    throw new Error(
      "You do not have permission to manage FTP progression."
    );
  }
}

function normaliseOutcome(
  outcome: unknown
): PPOWEROutcome {
  if (
    outcome === "Satisfactory" ||
    outcome === "Unsatisfactory"
  ) {
    return outcome;
  }

  throw new Error(
    "A valid PPOWER outcome is required."
  );
}

async function submitPPOWER(
  traineeId: string,
  body: FTPRequestBody,
  actingUserId: string
) {
  const weekNumber =
    body.weekNumber;

  if (
    weekNumber !== 1 &&
    weekNumber !== 2
  ) {
    throw new Error(
      "A valid PPOWER week number is required."
    );
  }

  const outcome =
    normaliseOutcome(
      body.outcome
    );

  const ratings =
    body.ratings &&
    typeof body.ratings ===
      "object"
      ? body.ratings
      : null;

  if (
    !ratings ||
    Object.keys(ratings)
      .length === 0
  ) {
    throw new Error(
      "PPOWER ratings are required."
    );
  }

  const summaryComments =
    typeof body.summaryComments ===
      "string"
      ? body.summaryComments.trim()
      : "";

  if (!summaryComments) {
    throw new Error(
      "PPOWER summary comments are required."
    );
  }

  const bbcode =
    typeof body.bbcode ===
      "string"
      ? body.bbcode
      : "";

  if (!bbcode) {
    throw new Error(
      "Generated PPOWER BBCode is required."
    );
  }

  const trainee =
    await getTraineeOrThrow(
      traineeId
    );

  const expectedStage =
    weekNumber === 1
      ? "Week 1"
      : "Week 2";

  if (
    trainee.training_stage !==
    expectedStage
  ) {
    return conflict(
      `Week ${weekNumber} PPOWER cannot be submitted while the trainee is at ${trainee.training_stage ?? "an unknown stage"}.`
    );
  }

  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: previousAttempts,
    error: attemptsError,
  } = await supabaseAdmin
    .from("ppowers")
    .select("attempt_number")
    .eq(
      "trainee_id",
      traineeId
    )
    .eq(
      "week_number",
      weekNumber
    )
    .order(
      "attempt_number",
      {
        ascending: false,
      }
    )
    .limit(1);

  if (attemptsError) {
    throw attemptsError;
  }

  const nextAttemptNumber =
    (
      previousAttempts?.[0]
        ?.attempt_number ??
      0
    ) + 1;

  const now =
    new Date().toISOString();

  const {
    data: inserted,
    error: insertError,
  } = await supabaseAdmin
    .from("ppowers")
    .insert({
      trainee_id:
        traineeId,
      ftm_id:
        actingUserId,
      week_number:
        weekNumber,
      attempt_number:
        nextAttemptNumber,
      ratings,
      strengths_discussed:
        Boolean(
          body.strengthsDiscussed
        ),
      weaknesses_discussed:
        Boolean(
          body.weaknessesDiscussed
        ),
      remedial_required:
        Boolean(
          body.remedialRequired
        ),
      remedial_training:
        typeof body.remedialTraining ===
          "string" &&
        body.remedialTraining.trim()
          ? body.remedialTraining.trim()
          : null,
      summary_comments:
        summaryComments,
      outcome,
      bbcode,
      created_at:
        now,
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  if (weekNumber === 1) {
    await updateTrainee(
      traineeId,
      {
        week_1_ppower_outcome:
          outcome,
        week_1_ppower_completed_at:
          now,
        training_stage:
          outcome ===
            "Satisfactory"
            ? "Week 2"
            : "Week 1",
        progression_updated_at:
          now,
        progression_updated_by:
          actingUserId,
      }
    );
  } else {
    await updateTrainee(
      traineeId,
      {
        week_2_ppower_outcome:
          outcome,
        week_2_ppower_completed_at:
          now,
        training_stage:
          "Week 2",
        progression_updated_at:
          now,
        progression_updated_by:
          actingUserId,
      }
    );
  }

  const eligibility =
    weekNumber === 2 &&
    outcome ===
      "Satisfactory"
      ? await getFPPEligibility(
          traineeId
        )
      : null;

  return NextResponse.json({
    success: true,
    message:
      weekNumber === 1
        ? outcome ===
            "Satisfactory"
          ? "Week 1 PPOWER submitted as satisfactory. The trainee progressed to Week 2."
          : "Week 1 PPOWER submitted as unsatisfactory. The trainee remains in Week 1."
        : outcome ===
            "Satisfactory"
          ? eligibility?.eligible
            ? "Week 2 PPOWER submitted as satisfactory. The trainee is eligible to progress to FPP."
            : "Week 2 PPOWER submitted as satisfactory. Other FPP requirements remain outstanding."
          : "Week 2 PPOWER submitted as unsatisfactory. The trainee remains in Week 2.",
    ppowerId:
      inserted.id,
    weekNumber,
    attemptNumber:
      nextAttemptNumber,
    outcome,
    fppEligibility:
      eligibility,
  });
}

async function recordWeek1PPOWER(
  traineeId: string,
  outcome: PPOWEROutcome,
  actingUserId: string
) {
  const trainee =
    await getTraineeOrThrow(
      traineeId
    );

  if (
    ![
      "Week 1",
      "Week 2",
    ].includes(
      trainee.training_stage ??
        "Week 1"
    )
  ) {
    return conflict(
      "Week 1 PPOWER cannot be recorded at the trainee's current stage."
    );
  }

  const now =
    new Date().toISOString();

  const update: Record<
    string,
    unknown
  > = {
    week_1_ppower_outcome:
      outcome,
    week_1_ppower_completed_at:
      now,
    progression_updated_at:
      now,
    progression_updated_by:
      actingUserId,
  };

  if (
    outcome === "Satisfactory"
  ) {
    update.training_stage =
      "Week 2";
  } else {
    update.training_stage =
      "Week 1";
  }

  await updateTrainee(
    traineeId,
    update
  );

  return NextResponse.json({
    success: true,
    message:
      outcome === "Satisfactory"
        ? "Week 1 PPOWER recorded as satisfactory. The trainee progressed to Week 2."
        : "Week 1 PPOWER recorded as unsatisfactory. The trainee remains in Week 1.",
    trainingStage:
      update.training_stage,
    outcome,
    completedAt: now,
  });
}

async function recordWeek2PPOWER(
  traineeId: string,
  outcome: PPOWEROutcome,
  actingUserId: string
) {
  const trainee =
    await getTraineeOrThrow(
      traineeId
    );

  if (
    trainee.training_stage !==
    "Week 2"
  ) {
    return conflict(
      "Week 2 PPOWER can only be recorded while the trainee is in Week 2."
    );
  }

  const now =
    new Date().toISOString();

  await updateTrainee(
    traineeId,
    {
      week_2_ppower_outcome:
        outcome,
      week_2_ppower_completed_at:
        now,
      progression_updated_at:
        now,
      progression_updated_by:
        actingUserId,
      training_stage:
        "Week 2",
    }
  );

  const eligibility =
    await getFPPEligibility(
      traineeId
    );

  return NextResponse.json({
    success: true,
    message:
      outcome === "Satisfactory"
        ? eligibility.eligible
          ? "Week 2 PPOWER recorded as satisfactory. The trainee is eligible to progress to FPP."
          : "Week 2 PPOWER recorded as satisfactory, but other FPP requirements are still outstanding."
        : "Week 2 PPOWER recorded as unsatisfactory. The trainee remains in Week 2.",
    outcome,
    completedAt: now,
    fppEligibility:
      eligibility,
  });
}

async function progressToFPP(
  traineeId: string,
  actingUserId: string
) {
  const trainee =
    await getTraineeOrThrow(
      traineeId
    );

  if (
    trainee.training_stage !==
    "Week 2"
  ) {
    return conflict(
      "The trainee must be in Week 2 before progressing to FPP."
    );
  }

  const eligibility =
    await getFPPEligibility(
      traineeId
    );

  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error:
          "The trainee does not yet meet every requirement for FPP.",
        eligibility,
      },
      {
        status: 409,
      }
    );
  }

  const now =
    new Date().toISOString();

  await updateTrainee(
    traineeId,
    {
      training_stage: "FPP",
      fpp_started_at: now,
      final_evaluation_unlocked_at:
        null,
      final_evaluation_completed_at:
        null,
      final_evaluation_dor_id:
        null,
      progression_updated_at:
        now,
      progression_updated_by:
        actingUserId,
    }
  );

  return NextResponse.json({
    success: true,
    message:
      "The trainee progressed to FPP.",
    trainingStage: "FPP",
    fppStartedAt: now,
  });
}

async function unlockFinalEvaluation(
  traineeId: string,
  actingUserId: string
) {
  const trainee =
    await getTraineeOrThrow(
      traineeId
    );

  if (
    trainee.training_stage !==
    "FPP"
  ) {
    return conflict(
      "Final Evaluation can only be unlocked while the trainee is in FPP."
    );
  }

  const eligibility =
    await getFinalEvaluationEligibility(
      traineeId,
      trainee.fpp_started_at
    );

  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error:
          "The trainee has not completed two back-to-back clean FPP patrols.",
        eligibility,
      },
      {
        status: 409,
      }
    );
  }

  const now =
    new Date().toISOString();

  await updateTrainee(
    traineeId,
    {
      training_stage:
        "Final Evaluation",
      final_evaluation_unlocked_at:
        now,
      progression_updated_at:
        now,
      progression_updated_by:
        actingUserId,
    }
  );

  return NextResponse.json({
    success: true,
    message:
      "Final Evaluation has been unlocked.",
    trainingStage:
      "Final Evaluation",
    unlockedAt: now,
    qualifyingDORs:
      eligibility.qualifyingDORs,
  });
}

async function completeFinalEvaluation(
  traineeId: string,
  dorId: unknown,
  actingUserId: string
) {
  if (
    typeof dorId !== "string" ||
    !dorId
  ) {
    throw new Error(
      "A Final Evaluation DOR must be selected."
    );
  }

  const trainee =
    await getTraineeOrThrow(
      traineeId
    );

  if (
    trainee.training_stage !==
    "Final Evaluation"
  ) {
    return conflict(
      "The trainee is not currently at the Final Evaluation stage."
    );
  }

  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: dor,
    error: dorError,
  } = await supabaseAdmin
    .from("dors")
    .select(`
      id,
      trainee_id,
      status,
      patrol_type,
      ratings
    `)
    .eq("id", dorId)
    .eq(
      "trainee_id",
      traineeId
    )
    .maybeSingle();

  if (dorError) {
    throw dorError;
  }

  if (!dor) {
    return NextResponse.json(
      {
        error:
          "The selected DOR does not belong to this trainee.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    dor.status !== "submitted"
  ) {
    return conflict(
      "The Final Evaluation DOR must be submitted before it can be completed."
    );
  }

  if (
    dor.patrol_type !==
    "Final Evaluation"
  ) {
    return conflict(
      "The selected DOR is not marked as a Final Evaluation patrol."
    );
  }

  if (!isCleanDOR(dor.ratings)) {
    return conflict(
      "The Final Evaluation DOR contains a scored rating below 3."
    );
  }

  const now =
    new Date().toISOString();

  await updateTrainee(
    traineeId,
    {
      training_stage:
        "Completed",
      final_evaluation_completed_at:
        now,
      final_evaluation_dor_id:
        dor.id,
      progression_updated_at:
        now,
      progression_updated_by:
        actingUserId,
    }
  );

  return NextResponse.json({
    success: true,
    message:
      "Final Evaluation was completed successfully. The trainee is awaiting promotion to P2.",
    trainingStage:
      "Completed",
    completedAt: now,
    finalEvaluationDORId:
      dor.id,
  });
}

async function promoteToP2(
  traineeId: string,
  actingUserId: string
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const trainee =
    await getTraineeOrThrow(
      traineeId
    );

  if (
    trainee.training_stage !==
      "Completed" ||
    !trainee
      .final_evaluation_completed_at
  ) {
    return conflict(
      "The Final Evaluation must be completed before promotion to P2."
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, name")
    .eq(
      "id",
      trainee.profile_id
    )
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return NextResponse.json(
      {
        error:
          "The linked profile no longer exists.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    profile.id === actingUserId
  ) {
    return conflict(
      "You cannot promote your own account."
    );
  }

  const now =
    new Date().toISOString();

  await updateTrainee(
    traineeId,
    {
      status: "P2",
      training_stage: "P2",
      assigned_ftm: null,
      promoted_to_p2_at: now,
      promoted_to_p2_by:
        actingUserId,
      progression_updated_at:
        now,
      progression_updated_by:
        actingUserId,
    }
  );

  const {
    error: profileUpdateError,
  } = await supabaseAdmin
    .from("profiles")
    .update({
      role: "No FTP Access",
      rank: "Police Officer II",
      requested_role: null,
      role_request_status: null,
    })
    .eq(
      "id",
      profile.id
    );

  if (profileUpdateError) {
    throw profileUpdateError;
  }

  return NextResponse.json({
    success: true,
    message:
      `${profile.name ?? "The probationary officer"} was promoted to Police Officer II. Their FTP record was archived and portal access was removed.`,
    promotedAt: now,
    traineeId,
    profileId: profile.id,
  });
}

async function getFPPEligibility(
  traineeId: string
) {
  const trainee =
    await getTraineeOrThrow(
      traineeId
    );

  const checklistComplete =
    isChecklistComplete(
      trainee.notebook
    );

  const latestDORs =
    await getSubmittedDORs(
      traineeId,
      2
    );

  const twoDORsExist =
    latestDORs.length === 2;

  const latestTwoClean =
    twoDORsExist &&
    latestDORs.every(
      (dor) =>
        isCleanDOR(
          dor.ratings
        )
    );

  const week2Satisfactory =
    trainee
      .week_2_ppower_outcome ===
    "Satisfactory";

  return {
    eligible:
      checklistComplete &&
      twoDORsExist &&
      latestTwoClean &&
      week2Satisfactory,

    checklistComplete,
    twoDORsExist,
    latestTwoClean,
    week2Satisfactory,

    latestDORs:
      latestDORs.map(
        summariseDOR
      ),
  };
}

async function getFinalEvaluationEligibility(
  traineeId: string,
  fppStartedAt:
    | string
    | null
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  let query =
    supabaseAdmin
      .from("dors")
      .select(`
        id,
        patrol_number,
        patrol_date,
        created_at,
        ratings,
        patrol_type,
        status
      `)
      .eq(
        "trainee_id",
        traineeId
      )
      .eq(
        "status",
        "submitted"
      )
      .eq(
        "patrol_type",
        "FPP"
      )
      .order(
        "patrol_number",
        {
          ascending: false,
        }
      )
      .limit(2);

  if (fppStartedAt) {
    query =
      query.gte(
        "created_at",
        fppStartedAt
      );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw error;
  }

  const latestTwo =
    (data ?? []) as DORRow[];

  const twoFPPPatrolsExist =
    latestTwo.length === 2;

  const latestTwoClean =
    twoFPPPatrolsExist &&
    latestTwo.every(
      (dor) =>
        isCleanDOR(
          dor.ratings
        )
    );

  return {
    eligible:
      twoFPPPatrolsExist &&
      latestTwoClean,

    twoFPPPatrolsExist,
    latestTwoClean,

    qualifyingDORs:
      latestTwo.map(
        summariseDOR
      ),
  };
}

async function getSubmittedDORs(
  traineeId: string,
  limit: number
) {
  const {
    data,
    error,
  } = await getSupabaseAdmin()
    .from("dors")
    .select(`
      id,
      patrol_number,
      patrol_date,
      created_at,
      ratings,
      patrol_type,
      status
    `)
    .eq(
      "trainee_id",
      traineeId
    )
    .eq(
      "status",
      "submitted"
    )
    .order(
      "patrol_number",
      {
        ascending: false,
      }
    )
    .limit(limit);

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ) as DORRow[];
}

async function getTraineeOrThrow(
  traineeId: string
) {
  const {
    data,
    error,
  } = await getSupabaseAdmin()
    .from("trainees")
    .select(`
      id,
      profile_id,
      status,
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
      promoted_to_p2_at,
      promoted_to_p2_by
    `)
    .eq(
      "id",
      traineeId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "The selected trainee record no longer exists."
    );
  }

  return data;
}

async function updateTrainee(
  traineeId: string,
  update: Record<
    string,
    unknown
  >
) {
  const {
    error,
  } = await getSupabaseAdmin()
    .from("trainees")
    .update(update)
    .eq(
      "id",
      traineeId
    );

  if (error) {
    throw error;
  }
}

function isChecklistComplete(
  notebook: unknown
) {
  if (
    !Array.isArray(notebook)
  ) {
    return false;
  }

  const items =
    notebook.flatMap(
      (section: any) =>
        Array.isArray(
          section?.items
        )
          ? section.items
          : []
    );

  return (
    items.length > 0 &&
    items.every(
      (item: any) =>
        item?.completed === true
    )
  );
}

function isCleanDOR(
  ratings: Ratings
) {
  const scoredRatings =
    Object.values(
      ratings ?? {}
    )
      .map((rating) =>
        Number(rating)
      )
      .filter((rating) =>
        Number.isFinite(rating)
      );

  return (
    scoredRatings.length > 0 &&
    scoredRatings.every(
      (rating) =>
        rating >= 3
    )
  );
}

function summariseDOR(
  dor: DORRow
) {
  return {
    id: dor.id,
    patrolNumber:
      dor.patrol_number,
    patrolDate:
      dor.patrol_date,
    patrolType:
      dor.patrol_type,
    clean:
      isCleanDOR(
        dor.ratings
      ),
  };
}

function conflict(
  error: string
) {
  return NextResponse.json(
    {
      error,
    },
    {
      status: 409,
    }
  );
}

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ??
        "The FTP request failed."
    );
  }

  return "The FTP request failed.";
}

function getErrorStatus(
  message: string
) {
  if (
    message ===
      "No access token was provided." ||
    message ===
      "The current login session could not be verified."
  ) {
    return 401;
  }

  if (
    message ===
      "You do not have permission to manage FTP progression." ||
    message ===
      "You do not have permission to complete supervisor FTP actions."
  ) {
    return 403;
  }

  if (
    message ===
      "A valid PPOWER outcome is required." ||
    message ===
      "A valid PPOWER week number is required." ||
    message ===
      "PPOWER ratings are required." ||
    message ===
      "PPOWER summary comments are required." ||
    message ===
      "Generated PPOWER BBCode is required." ||
    message ===
      "A Final Evaluation DOR must be selected."
  ) {
    return 400;
  }

  return 500;
}