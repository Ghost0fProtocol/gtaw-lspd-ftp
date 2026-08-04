import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getSupabaseAdmin,
} from "../../../../lib/supabaseAdmin";

const REVIEW_ROLES = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

type ReviewBody = {
  cardId?: string;
  action?: "approve" | "reject";
  rejectionReason?: string;
};

type ActingProfile = {
  id: string;
  role: string | null;
};

type CommentCardRow = {
  id: string;
  trainee_id: string;
  submission_type: string;
  submitter_name: string;
  submitter_rank: string | null;
  submitter_work_number: string | null;
  observed_at: string;
  overall_comments: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

type TraineeRow = {
  id: string;
  profile_id: string;
};

type ProfileRow = {
  id: string;
  name: string | null;
  rank: string | null;
  work_number: string | null;
};

export async function GET(
  request: NextRequest
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  try {
    const actingProfile =
      await requireProfile(
        request
      );

    const url =
      new URL(
        request.url
      );

    const traineeId =
      url.searchParams.get(
        "traineeId"
      );

    if (traineeId) {
      const {
        data,
        error,
      } = await supabaseAdmin
        .from("comment_cards")
        .select(`
          id,
          trainee_id,
          submission_type,
          submitter_name,
          submitter_rank,
          submitter_work_number,
          observed_at,
          overall_comments,
          status,
          rejection_reason,
          created_at
        `)
        .eq(
          "trainee_id",
          traineeId
        )
        .eq(
          "status",
          "approved"
        )
        .order(
          "observed_at",
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        cards:
          data ?? [],
      });
    }

    if (
      !REVIEW_ROLES.includes(
        actingProfile.role ??
        ""
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to review comment cards.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: cardRows,
      error: cardError,
    } = await supabaseAdmin
      .from("comment_cards")
      .select(`
        id,
        trainee_id,
        submission_type,
        submitter_name,
        submitter_rank,
        submitter_work_number,
        observed_at,
        overall_comments,
        status,
        rejection_reason,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (cardError) {
      throw cardError;
    }

    const cards =
      (
        cardRows ??
        []
      ) as CommentCardRow[];

    if (
      cards.length === 0
    ) {
      return NextResponse.json({
        cards: [],
      });
    }

    const traineeIds = [
      ...new Set(
        cards
          .map(
            (card) =>
              card.trainee_id
          )
          .filter(Boolean)
      ),
    ];

    const {
      data: traineeRows,
      error: traineeError,
    } = await supabaseAdmin
      .from("trainees")
      .select(`
        id,
        profile_id
      `)
      .in(
        "id",
        traineeIds
      );

    if (traineeError) {
      throw traineeError;
    }

    const trainees =
      (
        traineeRows ??
        []
      ) as TraineeRow[];

    const profileIds = [
      ...new Set(
        trainees
          .map(
            (trainee) =>
              trainee.profile_id
          )
          .filter(Boolean)
      ),
    ];

    let profiles:
      ProfileRow[] = [];

    if (
      profileIds.length > 0
    ) {
      const {
        data: profileRows,
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          name,
          rank,
          work_number
        `)
        .in(
          "id",
          profileIds
        );

      if (profileError) {
        throw profileError;
      }

      profiles =
        (
          profileRows ??
          []
        ) as ProfileRow[];
    }

    const combinedCards =
      cards.map(
        (card) => {
          const trainee =
            trainees.find(
              (item) =>
                item.id ===
                card.trainee_id
            );

          const profile =
            trainee
              ? profiles.find(
                  (item) =>
                    item.id ===
                    trainee.profile_id
                )
              : null;

          return {
            ...card,

            trainees: {
              id:
                trainee?.id ??
                card.trainee_id,

              profile_id:
                trainee?.profile_id ??
                null,

              profiles: profile
                ? {
                    name:
                      profile.name,
                    rank:
                      profile.rank,
                    work_number:
                      profile.work_number,
                  }
                : null,
            },
          };
        }
      );

    return NextResponse.json({
      cards:
        combinedCards,
    });
  } catch (error) {
    return apiError(
      "LOAD COMMENT CARD REVIEW ERROR",
      error
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  const supabaseAdmin =
    getSupabaseAdmin();

  try {
    const actingProfile =
      await requireProfile(
        request
      );

    if (
      !REVIEW_ROLES.includes(
        actingProfile.role ??
        ""
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to review comment cards.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      (await request.json()) as ReviewBody;

    const cardId =
      clean(
        body.cardId
      );

    const action =
      body.action;

    const rejectionReason =
      clean(
        body.rejectionReason
      );

    if (!cardId) {
      return badRequest(
        "No comment card was selected."
      );
    }

    if (
      action !== "approve" &&
      action !== "reject"
    ) {
      return badRequest(
        "Choose whether to approve or reject the card."
      );
    }

    if (
      action === "reject" &&
      !rejectionReason
    ) {
      return badRequest(
        "Enter a reason for rejecting the card."
      );
    }

    const {
      data: existingCard,
      error: existingError,
    } = await supabaseAdmin
      .from("comment_cards")
      .select(`
        id,
        status
      `)
      .eq(
        "id",
        cardId
      )
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingCard) {
      return NextResponse.json(
        {
          error:
            "The selected comment card no longer exists.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      existingCard.status !==
      "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "Only pending comment cards can be reviewed.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: updatedCard,
      error: updateError,
    } = await supabaseAdmin
      .from("comment_cards")
      .update({
        status:
          action === "approve"
            ? "approved"
            : "rejected",

        reviewed_by_profile_id:
          actingProfile.id,

        reviewed_at:
          new Date().toISOString(),

        rejection_reason:
          action === "reject"
            ? rejectionReason
            : null,
      })
      .eq(
        "id",
        cardId
      )
      .select(`
        id,
        status
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,

      card:
        updatedCard,

      message:
        action === "approve"
          ? "Comment card approved."
          : "Comment card rejected.",
    });
  } catch (error) {
    return apiError(
      "REVIEW COMMENT CARD ERROR",
      error
    );
  }
}

async function requireProfile(
  request: NextRequest
): Promise<ActingProfile> {
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
    throw new Error(
      "Your login session could not be verified."
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

  return profile as ActingProfile;
}

function clean(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function badRequest(
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

function apiError(
  label: string,
  error: unknown
) {
  const message =
    error instanceof Error
      ? error.message
      : (
          error &&
          typeof error ===
            "object" &&
          "message" in error
        )
        ? String(
            (
              error as {
                message?: unknown;
              }
            ).message
          )
        : "The comment-card request failed.";

  console.error(
    label,
    error
  );

  return NextResponse.json(
    {
      error: message,
    },
    {
      status: 500,
    }
  );
}