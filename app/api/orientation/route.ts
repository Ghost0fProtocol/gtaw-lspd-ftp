import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  generateOrientationBBCode,
  OrientationChecklist,
} from "../../../lib/generateOrientationBBCode";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient() {
  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not configured."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function getProfile(
  value: unknown
): {
  name?: string | null;
  rank?: string | null;
  badge_number?: string | null;
} | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return value as {
      name?: string | null;
      rank?: string | null;
      badge_number?: string | null;
    };
  }

  return null;
}

function isCompleteChecklist(
  value: unknown
): value is OrientationChecklist {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const checklist =
    value as Record<string, unknown>;

  const requiredKeys = [
    "divisionalNotebookCreated",
    "uniformAndEquipmentChecks",
    "missionRowFamiliarisation",
    "radioSetup",
    "vehicleChecks",
    "teamspeakBinds",
    "vehicleSpawning",
    "generalFactionCommands",
  ];

  return requiredKeys.every(
    (key) =>
      typeof checklist[key] ===
      "boolean"
  );
}

function calculateDuration(
  startTime: string,
  endTime: string
) {
  const [
    startHour,
    startMinute,
  ] = startTime
    .split(":")
    .map(Number);

  const [
    endHour,
    endMinute,
  ] = endTime
    .split(":")
    .map(Number);

  if (
    !Number.isFinite(startHour) ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endHour) ||
    !Number.isFinite(endMinute)
  ) {
    return "";
  }

  const startMinutes =
    startHour * 60 +
    startMinute;

  let endMinutes =
    endHour * 60 +
    endMinute;

  if (
    endMinutes <
    startMinutes
  ) {
    endMinutes +=
      24 * 60;
  }

  const difference =
    endMinutes -
    startMinutes;

  const hours =
    Math.floor(
      difference / 60
    );

  const minutes =
    difference % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

export async function GET() {
  try {
    const supabase =
      getAdminClient();

    const {
      data: traineeRows,
      error: traineeError,
    } = await supabase
      .from("trainees")
      .select(`
        id,
        profile_id,
        status
      `)
      .neq("status", "P2");

    if (traineeError) {
      throw traineeError;
    }

    const rows =
      traineeRows ?? [];

    const traineeIds =
      rows.map(
        (trainee) =>
          trainee.id
      );

    const profileIds =
      rows
        .map(
          (trainee) =>
            trainee.profile_id
        )
        .filter(
          (
            profileId
          ): profileId is string =>
            Boolean(
              profileId
            )
        );

    let profileRows: {
      id: string;
      name:
        | string
        | null;
      rank:
        | string
        | null;
      badge_number:
        | string
        | null;
    }[] = [];

    if (
      profileIds.length > 0
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          rank,
          badge_number
        `)
        .in(
          "id",
          profileIds
        );

      if (error) {
        throw error;
      }

      profileRows =
        data ?? [];
    }

    let orientedIds =
      new Set<string>();

    if (
      traineeIds.length > 0
    ) {
      const {
        data:
          orientationRows,
        error:
          orientationError,
      } = await supabase
        .from(
          "orientation_reports"
        )
        .select(
          "trainee_id"
        )
        .in(
          "trainee_id",
          traineeIds
        );

      if (orientationError) {
        throw orientationError;
      }

      orientedIds =
        new Set(
          (
            orientationRows ??
            []
          ).map(
            (report) =>
              report.trainee_id
          )
        );
    }

    const trainees =
      rows
        .filter(
          (trainee) =>
            !orientedIds.has(
              trainee.id
            )
        )
        .map(
          (trainee) => {
            const profile =
              profileRows.find(
                (item) =>
                  item.id ===
                  trainee.profile_id
              );

            return {
              id:
                trainee.id,

              name:
                profile?.name ??
                "Unknown",

              rank:
                profile?.rank ??
                "Police Officer I",

              badgeNumber:
                profile?.badge_number ??
                "",
            };
          }
        );

    return NextResponse.json({
      trainees,
    });
  } catch (error: any) {
    console.error(
      "PUBLIC ORIENTATION GET ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ??
          "Eligible probationary officers could not be loaded.",

        code:
          error?.code ??
          null,

        details:
          error?.details ??
          null,

        hint:
          error?.hint ??
          null,
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const traineeId =
      String(
        body?.traineeId ??
          ""
      ).trim();

    const completingOfficer =
      String(
        body?.completingOfficer ??
          ""
      ).trim();

    const completingOfficerSerial =
      String(
        body?.completingOfficerSerial ??
          ""
      ).trim();

    const date =
      String(
        body?.date ??
          ""
      ).trim();

    const startTime =
      String(
        body?.startTime ??
          ""
      ).trim();

    const endTime =
      String(
        body?.endTime ??
          ""
      ).trim();

    const incidentsTasks =
      String(
        body?.incidentsTasks ??
          ""
      ).trim();

    const checklist =
      body?.checklist;

    const missingFields:
      string[] = [];

    if (!traineeId) {
      missingFields.push(
        "Probationary officer"
      );
    }

    if (!completingOfficer) {
      missingFields.push(
        "Completing officer"
      );
    }

    if (
      !completingOfficerSerial
    ) {
      missingFields.push(
        "Completing officer serial number"
      );
    }

    if (!date) {
      missingFields.push(
        "Orientation date"
      );
    }

    if (!startTime) {
      missingFields.push(
        "Start time"
      );
    }

    if (!endTime) {
      missingFields.push(
        "End time"
      );
    }

    if (!incidentsTasks) {
      missingFields.push(
        "Incidents / tasks"
      );
    }

    if (
      !isCompleteChecklist(
        checklist
      )
    ) {
      missingFields.push(
        "All Orientation checklist answers"
      );
    }

    if (
      missingFields.length >
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete: " +
            missingFields.join(
              ", "
            ),
        },
        {
          status: 400,
        }
      );
    }

    const duration =
      calculateDuration(
        startTime,
        endTime
      );

    if (!duration) {
      return NextResponse.json(
        {
          error:
            "The patrol duration could not be calculated.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getAdminClient();

    const {
      data: trainee,
      error: traineeError,
    } = await supabase
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

    if (!trainee) {
      return NextResponse.json(
        {
          error:
            "The selected probationary officer could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      trainee.status ===
      "P2"
    ) {
      return NextResponse.json(
        {
          error:
            "The selected officer is no longer eligible for an Orientation Report.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data:
        existingOrientation,
      error:
        existingOrientationError,
    } = await supabase
      .from(
        "orientation_reports"
      )
      .select("id")
      .eq(
        "trainee_id",
        traineeId
      )
      .maybeSingle();

    if (
      existingOrientationError
    ) {
      throw existingOrientationError;
    }

    if (
      existingOrientation
    ) {
      return NextResponse.json(
        {
          error:
            "This probationary officer already has an Orientation Report.",
          code:
            "23505",
        },
        {
          status: 409,
        }
      );
    }

    let traineeProfile: {
      name:
        | string
        | null;
      badge_number:
        | string
        | null;
    } | null = null;

    if (
      trainee.profile_id
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(`
          name,
          badge_number
        `)
        .eq(
          "id",
          trainee.profile_id
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      traineeProfile =
        data;
    }

    const probationaryOfficer =
      traineeProfile?.name ??
      "Unknown";

    const probationaryOfficerSerial =
      traineeProfile?.badge_number ??
      "";

    const patrolNumber =
      String(
        body?.patrolNumber ??
          "Orientation"
      ).trim() ||
      "Orientation";

    const bbcode =
      generateOrientationBBCode({
        probationaryOfficer,
        probationaryOfficerSerial,
        completingOfficer,
        completingOfficerSerial,
        patrolNumber,
        date,
        time:
          `${startTime} - ${endTime}`,
        duration,
        checklist,
        incidentsTasks,
      });

    const {
      data:
        insertedReport,
      error:
        insertError,
    } = await supabase
      .from(
        "orientation_reports"
      )
      .insert({
        trainee_id:
          traineeId,

        completing_officer_id:
          null,

        completing_officer_name:
          completingOfficer,

        completing_officer_badge:
          completingOfficerSerial,

        patrol_date:
          date,

        start_time:
          startTime,

        end_time:
          endTime,

        duration,

        checklist,

        incidents_tasks:
          incidentsTasks,

        bbcode,

        created_by:
          null,
      })
      .select(
        "id"
      )
      .single();

    if (insertError) {
      if (
        insertError.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "This probationary officer already has an Orientation Report.",
            code:
              "23505",
          },
          {
            status: 409,
          }
        );
      }

      throw insertError;
    }

    return NextResponse.json(
      {
        id:
          insertedReport.id,

        bbcode,

        message:
          "Orientation Report submitted successfully.",
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "PUBLIC ORIENTATION POST ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ??
          "The Orientation Report could not be submitted.",

        code:
          error?.code ??
          null,

        details:
          error?.details ??
          null,

        hint:
          error?.hint ??
          null,
      },
      {
        status: 500,
      }
    );
  }
}