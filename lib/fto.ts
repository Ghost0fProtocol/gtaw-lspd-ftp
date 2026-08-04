import { supabase } from "./supabase";

type AddTrainingEntryFromDORParams = {
  ftoProfileId: string;
  traineeName: string;
  patrolDate: string;
  duration: string;
};

function durationToMinutes(
  duration: string
) {
  const [
    hoursText,
    minutesText,
  ] = duration.split(":");

  const hours =
    Number(hoursText);

  const minutes =
    Number(minutesText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(
      `Invalid DOR duration: ${duration}`
    );
  }

  return (
    hours * 60 +
    minutes
  );
}

function formatSourceMonth(
  patrolDate: string
) {
  return new Date(
    `${patrolDate}T00:00:00Z`
  )
    .toLocaleDateString(
      "en-GB",
      {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }
    )
    .toUpperCase();
}

export async function addTrainingEntryFromDOR({
  ftoProfileId,
  traineeName,
  patrolDate,
  duration,
}: AddTrainingEntryFromDORParams) {
  const durationMinutes =
    durationToMinutes(duration);

  const {
    data: ftoFile,
    error: ftoFileError,
  } = await supabase
    .from("fto_files")
    .select("id")
    .eq(
      "profile_id",
      ftoProfileId
    )
    .maybeSingle();

  if (ftoFileError) {
    throw ftoFileError;
  }

  if (!ftoFile) {
    throw new Error(
      "No FTO file was found for the logged-in officer."
    );
  }

  const {
    data: insertedEntry,
    error: entryError,
  } = await supabase
    .from("fto_log_entries")
    .insert({
      fto_file_id:
        ftoFile.id,
      entry_date:
        patrolDate,
      duration_minutes:
        durationMinutes,
      subject_name:
        traineeName,
      entry_type:
        "training",
      source_url:
        null,
      source_month:
        formatSourceMonth(
          patrolDate
        ),
    })
    .select("id")
    .single();

  if (entryError) {
    throw entryError;
  }

  try {
    const {
      data: timedEntries,
      error: timedEntriesError,
    } = await supabase
      .from("fto_log_entries")
      .select(
        "duration_minutes"
      )
      .eq(
        "fto_file_id",
        ftoFile.id
      )
      .not(
        "duration_minutes",
        "is",
        null
      );

    if (timedEntriesError) {
      throw timedEntriesError;
    }

    const recalculatedTotal =
      (timedEntries ?? []).reduce(
        (
          total,
          entry
        ) =>
          total +
          Number(
            entry.duration_minutes ??
            0
          ),
        0
      );

    const {
      error: totalUpdateError,
    } = await supabase
      .from("fto_files")
      .update({
        total_instruction_minutes:
          recalculatedTotal,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        ftoFile.id
      );

    if (totalUpdateError) {
      throw totalUpdateError;
    }
  } catch (error) {
    const {
      error: rollbackError,
    } = await supabase
      .from("fto_log_entries")
      .delete()
      .eq(
        "id",
        insertedEntry.id
      );

    if (rollbackError) {
      console.error(
        "ROLLBACK FTO LOG ENTRY ERROR",
        rollbackError
      );
    }

    throw error;
  }
}