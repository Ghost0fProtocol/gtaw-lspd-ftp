import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  randomInt,
} from "crypto";

import {
  getSupabaseAdmin,
} from "../../../../lib/supabaseAdmin";

const PASSWORD_RESET_ROLES = [
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

type ResetPasswordBody = {
  userId?: string;
};

type ActingProfile = {
  id: string;
  role: string | null;
};

type TargetProfile = {
  id: string;
  name: string | null;
  must_change_password:
    | boolean
    | null;
};

export async function POST(
  request: NextRequest
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  let targetProfile:
    | TargetProfile
    | null = null;

  try {
    const actingProfile =
      await verifyActingUser(
        request
      );

    if (
      !PASSWORD_RESET_ROLES.includes(
        actingProfile.role ?? ""
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to reset account passwords.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as ResetPasswordBody;

    const targetUserId =
      typeof body.userId ===
        "string"
        ? body.userId.trim()
        : "";

    if (!targetUserId) {
      return NextResponse.json(
        {
          error:
            "No user account was selected.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      targetUserId ===
      actingProfile.id
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot use the staff reset tool on your own account.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data,
      error:
        targetProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        name,
        must_change_password
      `)
      .eq(
        "id",
        targetUserId
      )
      .maybeSingle();

    if (targetProfileError) {
      throw targetProfileError;
    }

    targetProfile =
      data as TargetProfile | null;

    if (!targetProfile) {
      return NextResponse.json(
        {
          error:
            "The selected account no longer exists.",
        },
        {
          status: 404,
        }
      );
    }

    const temporaryPassword =
      generateTemporaryPassword();

    const {
      error:
        profileUpdateError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        must_change_password:
          true,
      })
      .eq(
        "id",
        targetUserId
      );

    if (profileUpdateError) {
      throw profileUpdateError;
    }

    const {
      error:
        passwordUpdateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        {
          password:
            temporaryPassword,
        }
      );

    if (passwordUpdateError) {
      const {
        error:
          rollbackError,
      } = await supabaseAdmin
        .from("profiles")
        .update({
          must_change_password:
            Boolean(
              targetProfile
                .must_change_password
            ),
        })
        .eq(
          "id",
          targetUserId
        );

      if (rollbackError) {
        console.error(
          "PASSWORD RESET FLAG ROLLBACK ERROR",
          rollbackError
        );
      }

      throw passwordUpdateError;
    }

    return NextResponse.json({
      success: true,

      message:
        `A temporary password was created for ${targetProfile.name ?? "the selected account"}.`,

      temporaryPassword,

      userId:
        targetUserId,

      userName:
        targetProfile.name ??
        "Unknown User",
    });
  } catch (error) {
    console.error(
      "ADMIN PASSWORD RESET ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          getErrorMessage(
            error
          ),
      },
      {
        status: 500,
      }
    );
  }
}

async function verifyActingUser(
  request: NextRequest
): Promise<ActingProfile> {
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
    throw new Error(
      "The current login session could not be verified."
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      role
    `)
    .eq(
      "id",
      authData.user.id
    )
    .single();

  if (profileError) {
    throw profileError;
  }

  return {
    id:
      profile.id,

    role:
      profile.role ??
      null,
  };
}

function generateTemporaryPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

  const symbols =
    "!@#$%";

  let password =
    "FTP-";

  for (
    let index = 0;
    index < 10;
    index += 1
  ) {
    password +=
      alphabet[
        randomInt(
          0,
          alphabet.length
        )
      ];
  }

  password +=
    symbols[
      randomInt(
        0,
        symbols.length
      )
    ];

  return password;
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
        "The password reset failed."
    );
  }

  return "The password reset failed.";
}