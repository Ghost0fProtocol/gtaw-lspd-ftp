import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getSupabaseAdmin,
} from "../../../lib/supabaseAdmin";

const personnelManagementRoles = [
  "STAFF",
  "LSPD STAFF",
  "FTP Staff",
  "Field Training Manager",
  "Field Training Supervisor",
];

const promotionRoles = [
  "FTP Staff",
  "Field Training Manager",
  "Field Training Supervisor",
  "STAFF",
  "LSPD STAFF",
];

type PersonnelAction =
  | "analyse"
  | "deleteNotebook"
  | "deleteFTOFile"
  | "deleteAccount"
  | "promoteToP2";

type PersonnelRequestBody = {
  action?: PersonnelAction;
  userId?: string;
};

type AuthorisedUser = {
  id: string;
  role: string;
};

export async function POST(
  request: NextRequest
) {
  try {
    const actingUser =
      await verifyAuthorisedUser(
        request
      );

    const body =
      (await request.json()) as PersonnelRequestBody;

    const action =
      typeof body.action ===
      "string"
        ? body.action
        : "";

    const targetUserId =
      typeof body.userId ===
      "string"
        ? body.userId
        : "";

    if (!action) {
      return NextResponse.json(
        {
          error:
            "No personnel action was provided.",
        },
        {
          status: 400,
        }
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          error:
            "No personnel account was selected.",
        },
        {
          status: 400,
        }
      );
    }

    assertActionPermission(
      action as PersonnelAction,
      actingUser.role
    );

    switch (action) {
      case "analyse":
        return await analysePersonnelAccount(
          targetUserId,
          actingUser.id
        );

      case "deleteNotebook":
        return await deleteNotebook(
          targetUserId
        );

      case "deleteFTOFile":
        return await deleteFTOFile(
          targetUserId
        );

      case "promoteToP2":
        return await promoteToP2(
          targetUserId,
          actingUser.id
        );

      case "deleteAccount":
        return await deleteAccount(
          targetUserId,
          actingUser.id
        );

      default:
        return NextResponse.json(
          {
            error: `Unknown personnel action: ${action}`,
          },
          {
            status: 400,
          }
        );
    }
  } catch (error) {
    console.error(
      "PERSONNEL API ERROR",
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

async function verifyAuthorisedUser(
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
      "VERIFY PERSONNEL SESSION ERROR",
      authError
    );

    throw new Error(
      "The current login session could not be verified."
    );
  }

  const {
    data: actingProfile,
    error: actingProfileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq(
      "id",
      authData.user.id
    )
    .single();

  if (actingProfileError) {
    throw actingProfileError;
  }

  return {
    id: authData.user.id,
    role: actingProfile.role,
  };
}

function assertActionPermission(
  action: PersonnelAction,
  actingRole: string
) {
  if (action === "promoteToP2") {
    if (
      !promotionRoles.includes(
        actingRole
      )
    ) {
      throw new Error(
        "You do not have permission to promote probationary officers."
      );
    }

    return;
  }

  if (
    !personnelManagementRoles.includes(
      actingRole
    )
  ) {
    throw new Error(
      "You do not have permission to manage personnel accounts."
    );
  }
}

async function analysePersonnelAccount(
  targetUserId: string,
  actingUserId: string
) {
  const analysis =
    await buildPersonnelAnalysis(
      targetUserId,
      actingUserId
    );

  if (!analysis) {
    return NextResponse.json(
      {
        error:
          "The selected profile no longer exists.",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json(
    analysis
  );
}

async function buildPersonnelAnalysis(
  targetUserId: string,
  actingUserId: string
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: targetProfile,
    error: targetProfileError,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      name,
      role,
      rank,
      badge_number,
      work_number,
      division
    `)
    .eq(
      "id",
      targetUserId
    )
    .maybeSingle();

  if (targetProfileError) {
    throw targetProfileError;
  }

  if (!targetProfile) {
    return null;
  }

  const {
    data: traineeRecord,
    error: traineeError,
  } = await supabaseAdmin
    .from("trainees")
    .select(`
      id,
      status,
      assigned_ftm
    `)
    .eq(
      "profile_id",
      targetUserId
    )
    .maybeSingle();

  if (traineeError) {
    throw traineeError;
  }

  const {
    data: assignedTrainees,
    error: assignedTraineesError,
  } = await supabaseAdmin
    .from("trainees")
    .select(`
      id,
      profile_id,
      status
    `)
    .eq(
      "assigned_ftm",
      targetUserId
    );

  if (assignedTraineesError) {
    throw assignedTraineesError;
  }

  const {
    data: ftoFile,
    error: ftoFileError,
  } = await supabaseAdmin
    .from("fto_files")
    .select(`
      id,
      total_instruction_minutes
    `)
    .eq(
      "profile_id",
      targetUserId
    )
    .maybeSingle();

  if (ftoFileError) {
    throw ftoFileError;
  }

  let notebookItemCount = 0;
  let receivedDORCount = 0;

  if (traineeRecord) {
    const [
      notebookItemsResult,
      receivedDORsResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("notebook_items")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "trainee_id",
          traineeRecord.id
        ),

      supabaseAdmin
        .from("dors")
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "trainee_id",
          traineeRecord.id
        ),
    ]);

    if (
      notebookItemsResult.error
    ) {
      throw notebookItemsResult.error;
    }

    if (
      receivedDORsResult.error
    ) {
      throw receivedDORsResult.error;
    }

    notebookItemCount =
      notebookItemsResult.count ??
      0;

    receivedDORCount =
      receivedDORsResult.count ??
      0;
  }

  const {
    count: writtenDORCount,
    error: writtenDORError,
  } = await supabaseAdmin
    .from("dors")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "fto_id",
      targetUserId
    );

  if (writtenDORError) {
    throw writtenDORError;
  }

  let ftoLogEntryCount = 0;

  if (ftoFile) {
    const {
      count,
      error: ftoLogEntryError,
    } = await supabaseAdmin
      .from("fto_log_entries")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "fto_file_id",
        ftoFile.id
      );

    if (ftoLogEntryError) {
      throw ftoLogEntryError;
    }

    ftoLogEntryCount =
      count ?? 0;
  }

  const {
    count: importRequestCount,
    error: importRequestError,
  } = await supabaseAdmin
    .from(
      "fto_import_requests"
    )
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .eq(
      "profile_id",
      targetUserId
    );

  if (importRequestError) {
    throw importRequestError;
  }

  const activeAssignedTrainees =
    (
      assignedTrainees ?? []
    ).filter(
      (trainee) =>
        ![
          "Archived",
          "P2",
          "Completed",
        ].includes(
          trainee.status ?? ""
        )
    );

  const blockers: string[] =
    [];

  if (
    targetUserId ===
    actingUserId
  ) {
    blockers.push(
      "You cannot delete your own account while logged in."
    );
  }

  if (
    activeAssignedTrainees.length >
    0
  ) {
    blockers.push(
      `${activeAssignedTrainees.length} active trainee${
        activeAssignedTrainees.length ===
        1
          ? " is"
          : "s are"
      } currently assigned to this FTM.`
    );
  }

  return {
    profile: targetProfile,

    records: {
      traineeRecordExists:
        Boolean(
          traineeRecord
        ),

      traineeRecordId:
        traineeRecord?.id ??
        null,

      traineeStatus:
        traineeRecord?.status ??
        null,

      notebookItemCount,
      receivedDORCount,

      writtenDORCount:
        writtenDORCount ?? 0,

      ftoFileExists:
        Boolean(ftoFile),

      ftoFileId:
        ftoFile?.id ?? null,

      ftoLogEntryCount,

      totalInstructionMinutes:
        ftoFile
          ?.total_instruction_minutes ??
        0,

      importRequestCount:
        importRequestCount ?? 0,

      assignedTraineeCount:
        assignedTrainees
          ?.length ?? 0,

      activeAssignedTraineeCount:
        activeAssignedTrainees.length,
    },

    blockers,

    safeToDelete:
      blockers.length === 0,
  };
}

async function deleteNotebook(
  targetUserId: string
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: traineeRecord,
    error: traineeError,
  } = await supabaseAdmin
    .from("trainees")
    .select("id")
    .eq(
      "profile_id",
      targetUserId
    )
    .maybeSingle();

  if (traineeError) {
    throw traineeError;
  }

  if (!traineeRecord) {
    return NextResponse.json({
      message:
        "No probationary notebook was linked to this account.",
    });
  }

  await deleteWhere(
    "notebook_items",
    "trainee_id",
    traineeRecord.id
  );

  await deleteWhere(
    "dors",
    "trainee_id",
    traineeRecord.id
  );

  await deleteWhere(
    "trainees",
    "id",
    traineeRecord.id
  );

  return NextResponse.json({
    message:
      "The probationary notebook and its linked DOR history were deleted.",
  });
}

async function deleteFTOFile(
  targetUserId: string
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: ftoFile,
    error: ftoFileError,
  } = await supabaseAdmin
    .from("fto_files")
    .select("id")
    .eq(
      "profile_id",
      targetUserId
    )
    .maybeSingle();

  if (ftoFileError) {
    throw ftoFileError;
  }

  if (ftoFile) {
    await deleteWhere(
      "fto_log_entries",
      "fto_file_id",
      ftoFile.id
    );

    await deleteWhere(
      "fto_files",
      "id",
      ftoFile.id
    );
  }

  await deleteWhere(
    "fto_import_requests",
    "profile_id",
    targetUserId
  );

  return NextResponse.json({
    message:
      ftoFile
        ? "The FTO file, log entries and import requests were deleted."
        : "No FTO file was linked; any import requests were removed.",
  });
}

async function promoteToP2(
  targetUserId: string,
  actingUserId: string
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  if (
    targetUserId ===
    actingUserId
  ) {
    return NextResponse.json(
      {
        error:
          "You cannot promote your own account.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: targetProfile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      name,
      role,
      rank
    `)
    .eq(
      "id",
      targetUserId
    )
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!targetProfile) {
    return NextResponse.json(
      {
        error:
          "The selected profile no longer exists.",
      },
      {
        status: 404,
      }
    );
  }

  const {
    data: trainee,
    error: traineeError,
  } = await supabaseAdmin
    .from("trainees")
    .select(`
      id,
      status
    `)
    .eq(
      "profile_id",
      targetUserId
    )
    .maybeSingle();

  if (traineeError) {
    throw traineeError;
  }

  if (!trainee) {
    return NextResponse.json(
      {
        error:
          "This officer does not have a probationary notebook.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    [
      "P2",
      "Archived",
      "Completed",
    ].includes(
      trainee.status ?? ""
    )
  ) {
    return NextResponse.json(
      {
        error:
          "This probationary notebook is already archived or completed.",
      },
      {
        status: 400,
      }
    );
  }

  const promotedAt =
    new Date().toISOString();

  const {
    error: traineeUpdateError,
  } = await supabaseAdmin
    .from("trainees")
    .update({
      status: "P2",
      assigned_ftm: null,
      promoted_to_p2_at:
        promotedAt,
      promoted_to_p2_by:
        actingUserId,
    })
    .eq(
      "id",
      trainee.id
    );

  if (traineeUpdateError) {
    throw traineeUpdateError;
  }

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
      targetUserId
    );

  if (profileUpdateError) {
    throw profileUpdateError;
  }

  return NextResponse.json({
    success: true,
    message:
      `${targetProfile.name ?? "The probationary officer"} was promoted to Police Officer II. Their notebook was archived and FTP portal access was removed.`,
    promotedUserId:
      targetUserId,
    promotedAt,
  });
}

async function deleteAccount(
  targetUserId: string,
  actingUserId: string
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  const analysis =
    await buildPersonnelAnalysis(
      targetUserId,
      actingUserId
    );

  if (!analysis) {
    return NextResponse.json(
      {
        error:
          "The selected profile no longer exists.",
      },
      {
        status: 404,
      }
    );
  }

  if (!analysis.safeToDelete) {
    return NextResponse.json(
      {
        error:
          analysis.blockers.join(
            " "
          ),
        blockers:
          analysis.blockers,
      },
      {
        status: 409,
      }
    );
  }

  if (
    analysis.records
      .traineeRecordId
  ) {
    await deleteWhere(
      "notebook_items",
      "trainee_id",
      analysis.records
        .traineeRecordId
    );

    await deleteWhere(
      "dors",
      "trainee_id",
      analysis.records
        .traineeRecordId
    );
  }

  await deleteWhere(
    "dors",
    "fto_id",
    targetUserId
  );

  await deleteWhere(
    "dors",
    "started_by",
    targetUserId
  );

  await deleteWhere(
    "dors",
    "completed_by",
    targetUserId
  );

  if (
    analysis.records.ftoFileId
  ) {
    await deleteWhere(
      "fto_log_entries",
      "fto_file_id",
      analysis.records.ftoFileId
    );
  }

  await deleteWhere(
    "fto_import_requests",
    "profile_id",
    targetUserId
  );

  await updateWhere(
    "fto_import_requests",
    "reviewed_by",
    targetUserId,
    {
      reviewed_by: null,
    }
  );

  await updateWhere(
    "notebook_items",
    "completed_by",
    targetUserId,
    {
      completed_by: null,
    }
  );

  await updateWhere(
    "trainees",
    "assigned_ftm",
    targetUserId,
    {
      assigned_ftm: null,
    }
  );

  if (
    analysis.records.ftoFileId
  ) {
    await deleteWhere(
      "fto_files",
      "id",
      analysis.records.ftoFileId
    );
  }

  if (
    analysis.records
      .traineeRecordId
  ) {
    await deleteWhere(
      "trainees",
      "id",
      analysis.records
        .traineeRecordId
    );
  }

  await deleteWhere(
    "profiles",
    "id",
    targetUserId
  );

  const {
    error: authDeleteError,
  } =
    await supabaseAdmin.auth.admin.deleteUser(
      targetUserId
    );

  if (authDeleteError) {
    const authDeleteMessage =
      authDeleteError.message ??
      "Unknown authentication error.";

    const authUserAlreadyMissing =
      authDeleteMessage
        .toLowerCase()
        .includes(
          "user not found"
        );

    if (!authUserAlreadyMissing) {
      console.error(
        "DELETE AUTH USER ERROR",
        authDeleteError
      );

      throw new Error(
        `The FTP profile was deleted, but the login account could not be removed: ${authDeleteMessage}`
      );
    }

    console.info(
      "DELETE AUTH USER NOTICE",
      "The authentication user was already absent."
    );
  }

  return NextResponse.json({
    success: true,
    message:
      `${analysis.profile.name ?? "The account"} and all linked FTP data were permanently deleted.`,
    deletedUserId:
      targetUserId,
  });
}

async function deleteWhere(
  table: string,
  column: string,
  value: string
) {
  const {
    error,
  } = await getSupabaseAdmin()
    .from(table)
    .delete()
    .eq(
      column,
      value
    );

  if (error) {
    throw error;
  }
}

async function updateWhere(
  table: string,
  column: string,
  value: string,
  update: Record<
    string,
    unknown
  >
) {
  const {
    error,
  } = await getSupabaseAdmin()
    .from(table)
    .update(update)
    .eq(
      column,
      value
    );

  if (error) {
    throw error;
  }
}

function getErrorMessage(
  error: unknown
) {
  if (error instanceof Error) {
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
        "The personnel request failed."
    );
  }

  return "The personnel request failed.";
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
      "You do not have permission to manage personnel accounts." ||
    message ===
      "You do not have permission to promote probationary officers."
  ) {
    return 403;
  }

  return 500;
}