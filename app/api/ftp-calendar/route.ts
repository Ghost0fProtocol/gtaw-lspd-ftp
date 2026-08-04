import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

type CalendarAction =
  | "generateBatch"
  | "clearBatch";

type CalendarRequestBody = {
  action?: CalendarAction;
  batchName?: string;
  inductionDate?: string;
};

const editorRoles = [
  "Field Training Supervisor",
  "FTP Staff",
  "LSPD STAFF",
];

function getSupabaseAdmin() {
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
    getSupabaseAdmin();

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
      "Only FTS+ may update the official FTP calendar."
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

function validateDate(
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
      ) as CalendarRequestBody;

    const action =
      body.action;

    const batchName =
      typeof body.batchName ===
        "string"
        ? body.batchName.trim()
        : "";

    if (!batchName) {
      return NextResponse.json(
        {
          error:
            "A batch name is required.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      getSupabaseAdmin();

    if (
      action ===
      "clearBatch"
    ) {
      const {
        error,
      } = await admin
        .from(
          "ftp_calendar_events"
        )
        .delete()
        .eq(
          "batch_name",
          batchName
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message:
          `${batchName} calendar cleared.`,
      });
    }

    if (
      action !==
      "generateBatch"
    ) {
      return NextResponse.json(
        {
          error:
            "Unknown calendar action.",
        },
        {
          status: 400,
        }
      );
    }

    const inductionDate =
      validateDate(
        body.inductionDate
      );

    const milestones = [
      {
        title:
          "P1: Graduation",
        description:
          "Induction and graduation date for the incoming probationary officer batch.",
        event_date:
          inductionDate,
        event_type:
          "Induction / Graduation",
      },
      {
        title:
          "P1/FTM: Minimum date for FPP progression",
        description:
          "The earliest date probationers may progress into FPP.",
        event_date:
          addDays(
            inductionDate,
            14
          ),
        event_type:
          "Minimum FPP Date",
      },
      {
        title:
          "P1/FTM: Minimum upgrade date for Probationers",
        description:
          "The earliest standard upgrade date for the batch.",
        event_date:
          addDays(
            inductionDate,
            21
          ),
        event_type:
          "Minimum Upgrade Date",
      },
      {
        title:
          "FTM: 43-day FPP deadline",
        description:
          "Probationers should be at FPP stage by this date or face termination.",
        event_date:
          addDays(
            inductionDate,
            43
          ),
        event_type:
          "43-Day Deadline",
      },
      {
        title:
          "FTM: 50-day final completion deadline",
        description:
          "Final cut-off before termination for inability to complete the programme.",
        event_date:
          addDays(
            inductionDate,
            50
          ),
        event_type:
          "50-Day Deadline",
      },
    ];

    const {
      error: deleteError,
    } = await admin
      .from(
        "ftp_calendar_events"
      )
      .delete()
      .eq(
        "batch_name",
        batchName
      );

    if (deleteError) {
      throw deleteError;
    }

    const {
      data,
      error: insertError,
    } = await admin
      .from(
        "ftp_calendar_events"
      )
      .insert(
        milestones.map(
          (milestone) => ({
            ...milestone,
            batch_name:
              batchName,
            created_by:
              actingUser.id,
          })
        )
      )
      .select("*")
      .order(
        "event_date",
        {
          ascending: true,
        }
      );

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message:
        `${batchName} calendar generated successfully.`,
      events:
        data ?? [],
    });
  } catch (error) {
    console.error(
      "FTP CALENDAR API ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The FTP calendar could not be updated.",
      },
      {
        status: 500,
      }
    );
  }
}