import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getSupabaseAdmin,
} from "../../../lib/supabaseAdmin";

type SubmissionBody = {
  traineeId?: string;
  submitterName?: string;
  submitterRank?: string;
  submitterSerial?: string;
  observedAt?: string;
  comments?: string;
};

type AuthenticatedProfile = {
  id: string;
  name: string | null;
  rank: string | null;
  work_number: string | null;
};

export async function GET() {
  const supabaseAdmin =
    getSupabaseAdmin();

  try {
    const {
      data: trainees,
      error: traineeError,
    } = await supabaseAdmin
      .from("trainees")
      .select(`
        id,
        profile_id,
        status
      `)
      .neq(
        "status",
        "P2"
      );

    if (traineeError) {
      throw traineeError;
    }

    const profileIds =
      [
        ...new Set(
          (trainees ?? [])
            .map(
              (trainee) =>
                trainee.profile_id
            )
            .filter(Boolean)
        ),
      ];

    if (
      profileIds.length === 0
    ) {
      return NextResponse.json({
        trainees: [],
      });
    }

    const {
      data: profiles,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        name,
        rank,
        role,
        work_number
      `)
      .in(
        "id",
        profileIds
      )
      .eq(
        "role",
        "Probationary Officer"
      );

    if (profileError) {
      throw profileError;
    }

    const publicTrainees =
      (trainees ?? [])
        .map(
          (trainee) => {
            const profile =
              (profiles ?? []).find(
                (item) =>
                  item.id ===
                  trainee.profile_id
              );

            if (
              !profile ||
              !profile.name
            ) {
              return null;
            }

            return {
              traineeId:
                trainee.id,
              name:
                profile.name,
              rank:
                profile.rank ??
                "Police Officer I",
              serial:
                profile.work_number ??
                "",
            };
          }
        )
        .filter(Boolean)
        .sort(
          (
            first: any,
            second: any
          ) =>
            first.name.localeCompare(
              second.name
            )
        );

    return NextResponse.json({
      trainees:
        publicTrainees,
    });
  } catch (error) {
    return serverError(
      "LOAD COMMENT CARD TRAINEES ERROR",
      error
    );
  }
}

export async function POST(
  request: NextRequest
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  try {
    const body =
      (await request.json()) as SubmissionBody;

    const traineeId =
      clean(
        body.traineeId
      );

    const observedAt =
      clean(
        body.observedAt
      );

    const comments =
      clean(
        body.comments
      );

    if (!traineeId) {
      return clientError(
        "Select a probationary officer."
      );
    }

    if (!observedAt) {
      return clientError(
        "Enter the comment card date."
      );
    }

    if (!comments) {
      return clientError(
        "Enter the comments."
      );
    }

    if (
      comments.length >
      5000
    ) {
      return clientError(
        "Comments must be 5,000 characters or fewer."
      );
    }

    const observationDate =
      new Date(
        observedAt
      );

    if (
      Number.isNaN(
        observationDate.getTime()
      )
    ) {
      return clientError(
        "The comment card date is invalid."
      );
    }

    const {
      data: trainee,
      error: traineeError,
    } = await supabaseAdmin
      .from("trainees")
      .select(`
        id,
        profile_id,
        status
      `)
      .eq(
        "id",
        traineeId
      )
      .maybeSingle();

    if (traineeError) {
      throw traineeError;
    }

    if (
      !trainee ||
      trainee.status === "P2"
    ) {
      return NextResponse.json(
        {
          error:
            "That probationary officer is not available for comment cards.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      data: traineeProfile,
      error: traineeProfileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        name,
        rank,
        role,
        work_number
      `)
      .eq(
        "id",
        trainee.profile_id
      )
      .maybeSingle();

    if (traineeProfileError) {
      throw traineeProfileError;
    }

    if (
      !traineeProfile ||
      traineeProfile.role !==
        "Probationary Officer"
    ) {
      return NextResponse.json(
        {
          error:
            "That probationary officer is not available for comment cards.",
        },
        {
          status: 404,
        }
      );
    }

    const authenticatedProfile =
      await getAuthenticatedProfile(
        request
      );

    const authenticated =
      Boolean(
        authenticatedProfile
      );

    const submitterName =
      authenticated
        ? clean(
            authenticatedProfile?.name
          )
        : clean(
            body.submitterName
          );

    const submitterRank =
      authenticated
        ? clean(
            authenticatedProfile?.rank
          )
        : clean(
            body.submitterRank
          );

    const submitterSerial =
      authenticated
        ? clean(
            authenticatedProfile?.work_number
          )
        : clean(
            body.submitterSerial
          );

    if (!submitterName) {
      return clientError(
        "Enter your character name."
      );
    }

    if (!submitterRank) {
      return clientError(
        "Enter your rank."
      );
    }

    if (!submitterSerial) {
      return clientError(
        "Enter your serial number."
      );
    }

    const status =
      authenticated
        ? "approved"
        : "pending";

    const now =
      new Date().toISOString();

    const {
      data: insertedCard,
      error: insertError,
    } = await supabaseAdmin
      .from("comment_cards")
      .insert({
        trainee_id:
          traineeId,
        submission_type:
          authenticated
            ? "authenticated"
            : "guest",
        submitted_by_profile_id:
          authenticatedProfile?.id ??
          null,
        submitter_name:
          submitterName,
        submitter_rank:
          submitterRank,
        submitter_badge_number:
          null,
        submitter_work_number:
          submitterSerial,
        observed_at:
          observationDate.toISOString(),
        positive_comments:
          null,
        development_comments:
          null,
        overall_comments:
          comments,
        status,
        reviewed_by_profile_id:
          authenticated
            ? authenticatedProfile?.id ??
              null
            : null,
        reviewed_at:
          authenticated
            ? now
            : null,
        rejection_reason:
          null,
      })
      .select(`
        id,
        status
      `)
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      status:
        insertedCard.status,
      commentCardId:
        insertedCard.id,
      message:
        authenticated
          ? "Comment card added successfully."
          : "Comment card submitted for review.",
      card: {
        commentingEmployeeRank:
          submitterRank,
        commentingEmployeeName:
          submitterName,
        commentingEmployeeSerial:
          submitterSerial,
        probationaryOfficerRank:
          traineeProfile.rank ??
          "Police Officer I",
        probationaryOfficerName:
          traineeProfile.name ??
          "Unknown Officer",
        probationaryOfficerSerial:
          traineeProfile.work_number ??
          "",
        observedAt:
          observationDate.toISOString(),
        comments,
      },
    });
  } catch (error) {
    return serverError(
      "SUBMIT COMMENT CARD ERROR",
      error
    );
  }
}

async function getAuthenticatedProfile(
  request: NextRequest
): Promise<
  AuthenticatedProfile |
  null
> {
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
    return null;
  }

  const supabaseAdmin =
    getSupabaseAdmin();

  const {
    data: authData,
    error: authError,
  } =
    await supabaseAdmin.auth.getUser(
      token
    );

  if (
    authError ||
    !authData.user
  ) {
    return null;
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select(`
      id,
      name,
      rank,
      work_number
    `)
    .eq(
      "id",
      authData.user.id
    )
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return profile as
    | AuthenticatedProfile
    | null;
}

function clean(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function clientError(
  message: string
) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status: 400,
    }
  );
}

function serverError(
  label: string,
  error: unknown
) {
  const details =
    extractError(
      error
    );

  console.error(
    label,
    {
      message:
        details.message,
      code:
        details.code,
      details:
        details.details,
      hint:
        details.hint,
      original:
        error,
    }
  );

  return NextResponse.json(
    {
      error:
        details.display,
    },
    {
      status: 500,
    }
  );
}

function extractError(
  error: unknown
) {
  const object =
    error &&
    typeof error ===
      "object"
      ? (
          error as {
            message?: unknown;
            code?: unknown;
            details?: unknown;
            hint?: unknown;
          }
        )
      : null;

  const message =
    error instanceof Error
      ? error.message
      : object?.message
        ? String(
            object.message
          )
        : "Unknown server error";

  const code =
    object?.code
      ? String(
          object.code
        )
      : "";

  const details =
    object?.details
      ? String(
          object.details
        )
      : "";

  const hint =
    object?.hint
      ? String(
          object.hint
        )
      : "";

  return {
    message,
    code,
    details,
    hint,
    display: [
      message,
      code
        ? `Code: ${code}`
        : "",
      details,
      hint
        ? `Hint: ${hint}`
        : "",
    ]
      .filter(Boolean)
      .join(" — "),
  };
}