import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

type BatchStatus =
  | "Upcoming"
  | "Active"
  | "Completed"
  | "Archived";

type BatchAction =
  | "create"
  | "update"
  | "delete"
  | "assignTrainee"
  | "unassignTrainee";

type RequestBody = {
  action?: BatchAction;

  batchId?: string;
  traineeId?: string;

  name?: string;
  inductionDate?: string;
  intakeSize?: number | null;
  status?: BatchStatus;
  notes?: string | null;
};

const editorRoles = [
  "Field Training Supervisor",
  "FTP Staff",
  "LSPD STAFF",
];

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !url ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Supabase server credentials are missing."
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

async function getActingUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  const token =
    authorization?.startsWith(
      "Bearer "
    )
      ? authorization.slice(7)
      : "";

  if (!token) {
    throw new Error(
      "Your login session could not be verified."
    );
  }

  const admin =
    getAdminClient();

  const {
    data: authData,
    error: authError,
  } =
    await admin.auth.getUser(
      token
    );

  if (
    authError ||
    !authData.user
  ) {
    throw new Error(
      "Your login session could not be verified."
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await admin
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

  const role =
    profile.role === "STAFF"
      ? "FTP Staff"
      : profile.role;

  if (
    !editorRoles.includes(
      role
    )
  ) {
    throw new Error(
      "Only FTS+ may manage FTP batches."
    );
  }

  return {
    id:
      authData.user.id,
    role,
  };
}

function addDays(
  value: string,
  days: number
) {
  const date =
    new Date(
      `${value}T00:00:00Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function requireString(
  value: unknown,
  label: string
) {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${label} is required.`
    );
  }

  return value.trim();
}

function requireDate(
  value: unknown
) {
  if (
    typeof value !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    throw new Error(
      "A valid induction date is required."
    );
  }

  return value;
}

export async function POST(
  request: NextRequest
) {
  try {
    const actingUser =
      await getActingUser(
        request
      );

    const body =
      (
        await request.json()
      ) as RequestBody;

    const action =
      body.action;

    const admin =
      getAdminClient();

    if (
      action ===
        "assignTrainee" ||
      action ===
        "unassignTrainee"
    ) {
      const traineeId =
        requireString(
          body.traineeId,
          "Trainee"
        );

      const batchId =
        action ===
        "assignTrainee"
          ? requireString(
              body.batchId,
              "Batch"
            )
          : null;

      const {
        error,
      } = await admin
        .from("trainees")
        .update({
          batch_id:
            batchId,
        })
        .eq(
          "id",
          traineeId
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message:
          action ===
          "assignTrainee"
            ? "Trainee assigned to batch."
            : "Trainee removed from batch.",
      });
    }

    if (
      action ===
      "delete"
    ) {
      const batchId =
        requireString(
          body.batchId,
          "Batch"
        );

      const {
        error,
      } = await admin
        .from("ftp_batches")
        .delete()
        .eq(
          "id",
          batchId
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message:
          "Batch deleted.",
      });
    }

    if (
      action !==
        "create" &&
      action !==
        "update"
    ) {
      return NextResponse.json(
        {
          error:
            "Unknown batch action.",
        },
        {
          status: 400,
        }
      );
    }

    const name =
      requireString(
        body.name,
        "Batch name"
      );

    const inductionDate =
      requireDate(
        body.inductionDate
      );

    const status =
      body.status ??
      "Upcoming";

    const payload = {
      name,
      induction_date:
        inductionDate,
      minimum_fpp_date:
        addDays(
          inductionDate,
          14
        ),
      minimum_upgrade_date:
        addDays(
          inductionDate,
          21
        ),
      fpp_deadline:
        addDays(
          inductionDate,
          43
        ),
      final_completion_deadline:
        addDays(
          inductionDate,
          50
        ),
      intake_size:
        typeof body.intakeSize ===
          "number"
          ? Math.max(
              0,
              Math.floor(
                body.intakeSize
              )
            )
          : null,
      status,
      notes:
        typeof body.notes ===
          "string" &&
        body.notes.trim()
          ? body.notes.trim()
          : null,
      created_by:
        actingUser.id,
    };

    if (
      action ===
      "create"
    ) {
      const {
        data,
        error,
      } = await admin
        .from("ftp_batches")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message:
          `${name} created.`,
        batch: data,
      });
    }

    const batchId =
      requireString(
        body.batchId,
        "Batch"
      );

    const {
      data,
      error,
    } = await admin
      .from("ftp_batches")
      .update({
        ...payload,
        created_by:
          undefined,
      })
      .eq(
        "id",
        batchId
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message:
        `${name} updated.`,
      batch: data,
    });
  } catch (error) {
    console.error(
      "FTP BATCH API ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The batch action failed.",
      },
      {
        status: 500,
      }
    );
  }
}