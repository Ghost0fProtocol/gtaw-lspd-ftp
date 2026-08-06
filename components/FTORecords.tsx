"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import MyFTOFile from "./MyFTOFile";

type Props = {
  user: any;
};

type FTORecordsTab =
  | "probationary"
  | "qualified"
  | "archived";

type FTOProbationStatus =
  | "probationary"
  | "qualified"
  | "archived";

type FTOProbationOutcome =
  | "pass"
  | "extend"
  | "fail"
  | null;

type PatrolStatus =
  | "not_started"
  | "submitted"
  | "reviewed";

type FTOProbationPatrol = {
  id: string;
  fto_file_id: string;
  patrol_number: number;
  status: PatrolStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
};

type FTORecord = {
  fileId: string;
  profileId: string;
  name: string;
  rank: string;
  badgeNumber: string;
  workNumber: string;
  division: string;
  totalInstructionMinutes: number;
  entryCount: number;
  updatedAt: string | null;

  probationStatus: FTOProbationStatus;
  probationOutcome: FTOProbationOutcome;
  probationStartedAt: string | null;
  probationCompletedAt: string | null;
  archivedAt: string | null;

  probationStatusChangedAt:
    | string
    | null;
  probationStatusChangedBy:
    | string
    | null;
  probationOverrideReason:
    | string
    | null;

  finalEvaluationStatus: string;
  finalEvaluationNotes: string | null;
  finalEvaluationCompletedAt: string | null;
  finalEvaluationCompletedBy: string | null;

  patrols: FTOProbationPatrol[];
};

const permittedRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

export default function FTORecords({
  user,
}: Props) {
  const [
    records,
    setRecords,
  ] = useState<FTORecord[]>([]);

  const [
    selectedProfileId,
    setSelectedProfileId,
  ] = useState<string | null>(
    null
  );

  const [
    activeTab,
    setActiveTab,
  ] = useState<FTORecordsTab>(
    "probationary"
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const canViewAllFiles =
    permittedRoles.includes(
      user?.role ?? ""
    );

  useEffect(() => {
    if (!canViewAllFiles) {
      setLoading(false);
      return;
    }

    void loadRecords();
  }, [
    user?.role,
  ]);

  async function loadRecords() {
    setLoading(true);
    setError("");

    try {
      const {
        data: fileRows,
        error: fileError,
      } = await supabase
        .from("fto_files")
        .select(`
          id,
          profile_id,
          division,
          total_instruction_minutes,
          updated_at,
          probation_status,
          probation_outcome,
          probation_started_at,
          probation_completed_at,
          archived_at,
          probation_status_changed_at,
          probation_status_changed_by,
          probation_override_reason,
          final_evaluation_status,
          final_evaluation_notes,
          final_evaluation_completed_at,
          final_evaluation_completed_by
        `)
        .order(
          "updated_at",
          {
            ascending: false,
          }
        );

      if (fileError) {
        throw fileError;
      }

      const files =
        fileRows ?? [];

      if (
        files.length === 0
      ) {
        setRecords([]);
        return;
      }

      const profileIds = [
        ...new Set(
          files
            .map(
              (file) =>
                file.profile_id
            )
            .filter(Boolean)
        ),
      ];

      const fileIds =
        files.map(
          (file) =>
            file.id
        );

      const [
        profileResult,
        entryResult,
        patrolResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id,
            name,
            rank,
            badge_number,
            work_number,
            division
          `)
          .in(
            "id",
            profileIds
          ),

        supabase
          .from(
            "fto_log_entries"
          )
          .select(
            "id, fto_file_id"
          )
          .in(
            "fto_file_id",
            fileIds
          ),

        supabase
          .from(
            "fto_probation_patrols"
          )
          .select(`
            id,
            fto_file_id,
            patrol_number,
            status,
            submitted_at,
            reviewed_at,
            reviewed_by,
            review_notes
          `)
          .in(
            "fto_file_id",
            fileIds
          )
          .order(
            "patrol_number",
            {
              ascending: true,
            }
          ),
      ]);

      if (
        profileResult.error
      ) {
        throw profileResult.error;
      }

      if (
        entryResult.error
      ) {
        throw entryResult.error;
      }

      if (
        patrolResult.error
      ) {
        throw patrolResult.error;
      }

      const profiles =
        profileResult.data ??
        [];

      const entryCounts =
        (
          entryResult.data ??
          []
        ).reduce(
          (
            counts,
            entry
          ) => {
            counts[
              entry.fto_file_id
            ] =
              (
                counts[
                  entry.fto_file_id
                ] ?? 0
              ) + 1;

            return counts;
          },
          {} as Record<
            string,
            number
          >
        );

      const patrolsByFile =
        (
          patrolResult.data ??
          []
        ).reduce(
          (
            grouped,
            patrol
          ) => {
            if (
              !grouped[
                patrol.fto_file_id
              ]
            ) {
              grouped[
                patrol.fto_file_id
              ] = [];
            }

            grouped[
              patrol.fto_file_id
            ].push(
              patrol as FTOProbationPatrol
            );

            return grouped;
          },
          {} as Record<
            string,
            FTOProbationPatrol[]
          >
        );

      const nextRecords =
        files.map(
          (
            file
          ): FTORecord => {
            const profile =
              profiles.find(
                (item) =>
                  item.id ===
                  file.profile_id
              );

            return {
              fileId:
                file.id,

              profileId:
                file.profile_id,

              name:
                profile?.name ??
                "Unknown Officer",

              rank:
                profile?.rank ??
                "Unknown Rank",

              badgeNumber:
                profile?.badge_number ??
                "N/A",

              workNumber:
                profile?.work_number ??
                "N/A",

              division:
                profile?.division ??
                file.division ??
                "Unknown Division",

              totalInstructionMinutes:
                file.total_instruction_minutes ??
                0,

              entryCount:
                entryCounts[
                  file.id
                ] ?? 0,

              updatedAt:
                file.updated_at ??
                null,

              probationStatus:
                normaliseProbationStatus(
                  file.probation_status
                ),

              probationOutcome:
                normaliseProbationOutcome(
                  file.probation_outcome
                ),

              probationStartedAt:
                file.probation_started_at ??
                null,

              probationCompletedAt:
                file.probation_completed_at ??
                null,

              archivedAt:
                file.archived_at ??
                null,

              probationStatusChangedAt:
                file.probation_status_changed_at ??
                null,

              probationStatusChangedBy:
                file.probation_status_changed_by ??
                null,

              probationOverrideReason:
                file.probation_override_reason ??
                null,

              finalEvaluationStatus:
                file.final_evaluation_status ??
                "locked",

              finalEvaluationNotes:
                file.final_evaluation_notes ??
                null,

              finalEvaluationCompletedAt:
                file.final_evaluation_completed_at ??
                null,

              finalEvaluationCompletedBy:
                file.final_evaluation_completed_by ??
                null,

              patrols:
                patrolsByFile[
                  file.id
                ] ?? [],
            };
          }
        );

      nextRecords.sort(
        (
          first,
          second
        ) =>
          first.name.localeCompare(
            second.name
          )
      );

      setRecords(
        nextRecords
      );
    } catch (loadError) {
      console.error(
        "LOAD ALL FTO RECORDS ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "FTO records could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function updatePatrolStatus(
    patrol: FTOProbationPatrol,
    status: PatrolStatus
  ) {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const now =
        new Date().toISOString();

      const updateData: Record<
        string,
        unknown
      > = {
        status,
      };

      if (
        status ===
        "submitted"
      ) {
        updateData.submitted_at =
          patrol.submitted_at ??
          now;

        updateData.reviewed_at =
          null;

        updateData.reviewed_by =
          null;
      }

      if (
        status ===
        "reviewed"
      ) {
        updateData.submitted_at =
          patrol.submitted_at ??
          now;

        updateData.reviewed_at =
          now;

        updateData.reviewed_by =
          user.id;
      }

      if (
        status ===
        "not_started"
      ) {
        updateData.submitted_at =
          null;

        updateData.reviewed_at =
          null;

        updateData.reviewed_by =
          null;

        updateData.review_notes =
          null;
      }

      const {
        error:
          updateError,
      } = await supabase
        .from(
          "fto_probation_patrols"
        )
        .update(
          updateData
        )
        .eq(
          "id",
          patrol.id
        );

      if (
        updateError
      ) {
        throw updateError;
      }

      setSuccessMessage(
        `Patrol ${patrol.patrol_number} updated to ${formatPatrolStatus(
          status
        )}.`
      );

      await loadRecords();
    } catch (updateError) {
      console.error(
        "UPDATE FTO PROBATION PATROL ERROR",
        updateError
      );

      setError(
        updateError instanceof Error
          ? updateError.message
          : "The patrol status could not be updated."
      );
    } finally {
      setSaving(false);
    }
  }

  async function completeFinalEvaluation(
    record: FTORecord,
    outcome:
      | "pass"
      | "extend"
      | "fail"
  ) {
    const completedPatrols =
      record.patrols.filter(
        (patrol) =>
          patrol.status ===
            "submitted" ||
          patrol.status ===
            "reviewed"
      ).length;

    if (
      completedPatrols < 3
    ) {
      setError(
        "All three probation patrols must be submitted before the Final Evaluation can be completed."
      );

      return;
    }

    const notes =
      window.prompt(
        `Enter Final Evaluation notes for ${record.name}:`,
        record.finalEvaluationNotes ??
          ""
      );

    if (
      notes === null
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const now =
        new Date().toISOString();

      const nextStatus:
        FTOProbationStatus =
        outcome === "pass"
          ? "qualified"
          : outcome === "fail"
            ? "archived"
            : "probationary";

      const {
        error:
          updateError,
      } = await supabase
        .from("fto_files")
        .update({
          probation_status:
            nextStatus,

          probation_outcome:
            outcome,

          final_evaluation_status:
            outcome ===
            "extend"
              ? "extended"
              : "completed",

          final_evaluation_notes:
            notes.trim() ||
            null,

          final_evaluation_completed_at:
            now,

          final_evaluation_completed_by:
            user.id,

          probation_completed_at:
            outcome ===
            "pass"
              ? now
              : null,

          archived_at:
            outcome ===
            "fail"
              ? now
              : null,

          updated_at:
            now,
        })
        .eq(
          "id",
          record.fileId
        );

      if (
        updateError
      ) {
        throw updateError;
      }

      setSuccessMessage(
        outcome === "pass"
          ? `${record.name} passed FTO probation and is now a qualified FTO.`
          : outcome === "fail"
            ? `${record.name} failed FTO probation and the file was archived.`
            : `${record.name}'s FTO probation was extended.`
      );

      await loadRecords();
    } catch (evaluationError) {
      console.error(
        "COMPLETE FTO FINAL EVALUATION ERROR",
        evaluationError
      );

      setError(
        evaluationError instanceof Error
          ? evaluationError.message
          : "The Final Evaluation could not be completed."
      );
    } finally {
      setSaving(false);
    }
  }

  async function manuallySetProbation(
    record: FTORecord,
    placeOnProbation: boolean
  ) {
    const reason =
      window.prompt(
        placeOnProbation
          ? `Why is ${record.name} being placed on FTO probation?`
          : `Why is ${record.name} being removed from FTO probation?`
      );

    if (
      reason === null
    ) {
      return;
    }

    if (!reason.trim()) {
      setError(
        "A reason is required for a manual probation status change."
      );
      return;
    }

    const confirmed =
      window.confirm(
        placeOnProbation
          ? `Place ${record.name} on FTO probation and reset Patrols 1–3?`
          : `Remove ${record.name} from FTO probation and mark them qualified?`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const now =
        new Date().toISOString();

      const {
        error:
          fileUpdateError,
      } = await supabase
        .from("fto_files")
        .update({
          probation_status:
            placeOnProbation
              ? "probationary"
              : "qualified",
          probation_outcome:
            placeOnProbation
              ? null
              : "pass",
          probation_started_at:
            placeOnProbation
              ? now
              : record.probationStartedAt,
          probation_completed_at:
            placeOnProbation
              ? null
              : now,
          archived_at:
            null,
          final_evaluation_status:
            placeOnProbation
              ? "locked"
              : "completed",
          final_evaluation_notes:
            placeOnProbation
              ? null
              : `Management override: ${reason.trim()}`,
          final_evaluation_completed_at:
            placeOnProbation
              ? null
              : now,
          final_evaluation_completed_by:
            placeOnProbation
              ? null
              : user.id,
          probation_status_changed_at:
            now,
          probation_status_changed_by:
            user.id,
          probation_override_reason:
            reason.trim(),
          updated_at:
            now,
        })
        .eq(
          "id",
          record.fileId
        );

      if (
        fileUpdateError
      ) {
        throw fileUpdateError;
      }

      if (placeOnProbation) {
        const {
          error:
            deleteError,
        } = await supabase
          .from(
            "fto_probation_patrols"
          )
          .delete()
          .eq(
            "fto_file_id",
            record.fileId
          );

        if (deleteError) {
          throw deleteError;
        }

        const {
          error:
            insertError,
        } = await supabase
          .from(
            "fto_probation_patrols"
          )
          .insert(
            [1, 2, 3].map(
              (patrolNumber) => ({
                fto_file_id:
                  record.fileId,
                patrol_number:
                  patrolNumber,
                status:
                  "not_started",
              })
            )
          );

        if (insertError) {
          throw insertError;
        }
      }

      setSuccessMessage(
        placeOnProbation
          ? `${record.name} was placed on FTO probation. Patrols 1–3 were reset.`
          : `${record.name} was removed from FTO probation and marked qualified.`
      );

      await loadRecords();
    } catch (overrideError) {
      console.error(
        "MANUAL FTO PROBATION UPDATE ERROR",
        overrideError
      );

      setError(
        overrideError instanceof Error
          ? overrideError.message
          : "The FTO probation status could not be changed."
      );
    } finally {
      setSaving(false);
    }
  }

  const tabCounts =
    useMemo(
      () => ({
        probationary:
          records.filter(
            (record) =>
              record.probationStatus ===
              "probationary"
          ).length,

        qualified:
          records.filter(
            (record) =>
              record.probationStatus ===
              "qualified"
          ).length,

        archived:
          records.filter(
            (record) =>
              record.probationStatus ===
              "archived"
          ).length,
      }),
      [records]
    );

  const filteredRecords =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      return records
        .filter(
          (record) =>
            record.probationStatus ===
            activeTab
        )
        .filter(
          (record) => {
            if (!query) {
              return true;
            }

            const searchable =
              [
                record.name,
                record.rank,
                record.badgeNumber,
                record.workNumber,
                record.division,
                record.probationOutcome,
              ]
                .join(" ")
                .toLowerCase();

            return searchable.includes(
              query
            );
          }
        );
    }, [
      records,
      searchTerm,
      activeTab,
    ]);

  const selectedRecord =
    selectedProfileId
      ? records.find(
          (record) =>
            record.profileId ===
            selectedProfileId
        ) ?? null
      : null;

  if (!canViewAllFiles) {
    return (
      <div style={errorStyle}>
        You do not have permission to view all FTO records.
      </div>
    );
  }

  if (
    selectedProfileId &&
    selectedRecord
  ) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setSelectedProfileId(
              null
            );

            setError("");
            setSuccessMessage("");
          }}
          style={backButtonStyle}
        >
          ← Back to FTO Records
        </button>

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={successStyle}>
            {successMessage}
          </div>
        )}

        <MyFTOFile
          user={user}
          profileId={
            selectedProfileId
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            FTP MANAGEMENT
          </p>

          <h2 style={titleStyle}>
            FTO Records
          </h2>

          <p style={subtitleStyle}>
            Review probationary, qualified and archived Field Training Officer files.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadRecords()
          }
          disabled={loading}
          style={{
            ...refreshButtonStyle,
            opacity:
              loading
                ? 0.65
                : 1,
          }}
        >
          {loading
            ? "Refreshing..."
            : "Refresh Records"}
        </button>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={successStyle}>
          {successMessage}
        </div>
      )}

      <div style={tabsStyle}>
        <TabButton
          label="Probationary FTOs"
          count={
            tabCounts.probationary
          }
          active={
            activeTab ===
            "probationary"
          }
          onClick={() =>
            setActiveTab(
              "probationary"
            )
          }
        />

        <TabButton
          label="Qualified FTOs"
          count={
            tabCounts.qualified
          }
          active={
            activeTab ===
            "qualified"
          }
          onClick={() =>
            setActiveTab(
              "qualified"
            )
          }
        />

        <TabButton
          label="Archived FTOs"
          count={
            tabCounts.archived
          }
          active={
            activeTab ===
            "archived"
          }
          onClick={() =>
            setActiveTab(
              "archived"
            )
          }
        />
      </div>

      <div style={summaryGridStyle}>
        <SummaryCard
          label="Probationary"
          value={String(
            tabCounts.probationary
          )}
        />

        <SummaryCard
          label="Qualified"
          value={String(
            tabCounts.qualified
          )}
        />

        <SummaryCard
          label="Archived"
          value={String(
            tabCounts.archived
          )}
        />

        <SummaryCard
          label="Combined Instruction"
          value={formatMinutes(
            records.reduce(
              (
                total,
                record
              ) =>
                total +
                record.totalInstructionMinutes,
              0
            )
          )}
        />
      </div>

      <input
        value={searchTerm}
        onChange={(event) =>
          setSearchTerm(
            event.target.value
          )
        }
        placeholder="Search by officer, rank, badge, work number or division..."
        style={searchInputStyle}
      />

      <div style={recordsCardStyle}>
        <div style={tableHeaderStyle}>
          <strong>
            Officer
          </strong>

          <strong>
            Status
          </strong>

          <strong>
            Probation Progress
          </strong>

          <strong>
            Entries
          </strong>

          <span />
        </div>

        {loading ? (
          <div style={emptyStyle}>
            Loading FTO records...
          </div>
        ) : filteredRecords.length ===
          0 ? (
          <div style={emptyStyle}>
            No matching FTO records were found.
          </div>
        ) : (
          filteredRecords.map(
            (record) => {
              const completed =
                record.patrols.filter(
                  (patrol) =>
                    patrol.status ===
                      "submitted" ||
                    patrol.status ===
                      "reviewed"
                ).length;

              return (
                <button
                  key={
                    record.fileId
                  }
                  type="button"
                  onClick={() =>
                    setSelectedProfileId(
                      record.profileId
                    )
                  }
                  style={recordRowStyle}
                >
                  <div>
                    <strong>
                      {record.name}
                    </strong>

                    <p style={metaStyle}>
                      {record.rank}
                      {" • "}
                      Badge{" "}
                      {record.badgeNumber}
                      {" • "}
                      {record.division}
                    </p>
                  </div>

                  <div>
                    <StatusBadge
                      status={
                        record.probationStatus
                      }
                    />

                    <p style={metaStyle}>
                      {record.probationOutcome
                        ? `Outcome: ${formatOutcome(
                            record.probationOutcome
                          )}`
                        : "No final outcome"}
                    </p>
                  </div>

                  <div>
                    <strong>
                      {record.probationStatus ===
                      "probationary"
                        ? `${completed}/3 patrols completed`
                        : record.probationStatus ===
                            "qualified"
                          ? "Probation completed"
                          : "File archived"}
                    </strong>

                    <div style={progressTrackStyle}>
                      <div
                        style={{
                          ...progressFillStyle,
                          width:
                            record.probationStatus ===
                            "qualified"
                              ? "100%"
                              : `${Math.min(
                                  100,
                                  (
                                    completed /
                                    3
                                  ) *
                                    100
                                )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <strong>
                    {record.entryCount}
                  </strong>

                  <span style={openLinkStyle}>
                    Open File
                  </span>
                </button>
              );
            }
          )
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabButtonStyle,
        ...(active
          ? activeTabButtonStyle
          : {}),
      }}
    >
      {label}

      <span style={tabCountStyle}>
        {count}
      </span>
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: FTOProbationStatus;
}) {
  const style =
    status ===
    "probationary"
      ? probationaryBadgeStyle
      : status ===
          "qualified"
        ? qualifiedBadgeStyle
        : archivedBadgeStyle;

  return (
    <span style={style}>
      {status ===
      "probationary"
        ? "PROBATIONARY"
        : status ===
            "qualified"
          ? "QUALIFIED"
          : "ARCHIVED"}
    </span>
  );
}

function PatrolStatusBadge({
  status,
}: {
  status: PatrolStatus;
}) {
  const style =
    status ===
    "reviewed"
      ? reviewedPatrolBadgeStyle
      : status ===
          "submitted"
        ? submittedPatrolBadgeStyle
        : notStartedPatrolBadgeStyle;

  return (
    <span style={style}>
      {formatPatrolStatus(
        status
      )}
    </span>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={summaryCardStyle}>
      <p style={summaryLabelStyle}>
        {label}
      </p>

      <p style={summaryValueStyle}>
        {value}
      </p>
    </div>
  );
}

function normaliseProbationStatus(
  value: unknown
): FTOProbationStatus {
  if (
    value ===
      "probationary" ||
    value ===
      "archived"
  ) {
    return value;
  }

  return "qualified";
}

function normaliseProbationOutcome(
  value: unknown
): FTOProbationOutcome {
  if (
    value === "pass" ||
    value === "extend" ||
    value === "fail"
  ) {
    return value;
  }

  return null;
}

function formatPatrolStatus(
  status: PatrolStatus
) {
  if (
    status ===
    "not_started"
  ) {
    return "Not Started";
  }

  if (
    status ===
    "submitted"
  ) {
    return "Submitted";
  }

  return "Reviewed";
}

function formatOutcome(
  outcome:
    | "pass"
    | "extend"
    | "fail"
) {
  return outcome
    .charAt(0)
    .toUpperCase() +
    outcome.slice(1);
}

function formatMinutes(
  totalMinutes: number
) {
  const safeMinutes =
    Math.max(
      0,
      Math.floor(
        totalMinutes || 0
      )
    );

  const hours =
    Math.floor(
      safeMinutes / 60
    );

  const minutes =
    safeMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "date unknown";
  }

  return new Date(
    value
  ).toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

const tabsStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const tabButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  padding: "10px 14px",
  color: "#cbd5e1",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const activeTabButtonStyle = {
  color: "white",
  backgroundColor: "#2563eb",
  border: "1px solid #3b82f6",
};

const tabCountStyle = {
  minWidth: "24px",
  padding: "3px 7px",
  textAlign: "center" as const,
  backgroundColor:
    "rgba(15, 23, 42, 0.55)",
  borderRadius: "999px",
  fontSize: "12px",
};

const probationPanelStyle = {
  padding: "22px",
  marginBottom: "22px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const probationHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap" as const,
};

const probationTitleStyle = {
  margin: "0 0 6px",
};

const patrolGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
  marginTop: "18px",
};

const patrolCardStyle = {
  padding: "15px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
};

const patrolHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const patrolActionsStyle = {
  display: "flex",
  gap: "8px",
  marginTop: "14px",
  flexWrap: "wrap" as const,
};

const submitPatrolButtonStyle = {
  padding: "9px 11px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const reviewPatrolButtonStyle = {
  padding: "9px 11px",
  color: "white",
  backgroundColor: "#16a34a",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const resetPatrolButtonStyle = {
  padding: "9px 11px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const finalEvaluationCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "18px",
  marginTop: "16px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
  flexWrap: "wrap" as const,
};

const finalEvaluationTitleStyle = {
  margin: "0 0 6px",
};

const finalOutcomeButtonsStyle = {
  display: "flex",
  gap: "9px",
  flexWrap: "wrap" as const,
};

const passButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#16a34a",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 900,
};

const extendButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#d97706",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 900,
};

const failButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#dc2626",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 900,
};

const completedProbationStyle = {
  display: "grid",
  gap: "8px",
  padding: "16px",
  marginTop: "18px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
};

const completedProbationTextStyle = {
  margin: 0,
  color: "#cbd5e1",
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.55,
};

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "20px",
  marginBottom: "22px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const titleStyle = {
  margin: "0 0 7px",
};

const subtitleStyle = {
  margin: 0,
  color: "#94a3b8",
};

const refreshButtonStyle = {
  padding: "11px 16px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const backButtonStyle = {
  padding: "10px 14px",
  marginBottom: "20px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const summaryCardStyle = {
  padding: "18px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const summaryLabelStyle = {
  margin: "0 0 7px",
  color: "#94a3b8",
  fontSize: "13px",
};

const summaryValueStyle = {
  margin: 0,
  color: "white",
  fontSize: "24px",
  fontWeight: 900,
};

const searchInputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "13px",
  marginBottom: "20px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const recordsCardStyle = {
  overflow: "hidden",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns:
    "2fr 1fr 1.3fr 0.6fr 0.7fr",
  gap: "16px",
  padding: "14px 18px",
  color: "#94a3b8",
  backgroundColor: "#0f172a",
  fontSize: "12px",
  textTransform:
    "uppercase" as const,
  letterSpacing: "0.06em",
};

const recordRowStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns:
    "2fr 1fr 1.3fr 0.6fr 0.7fr",
  alignItems: "center",
  gap: "16px",
  padding: "18px",
  color: "white",
  backgroundColor:
    "transparent",
  border: "none",
  borderTop:
    "1px solid #334155",
  textAlign: "left" as const,
  cursor: "pointer",
};

const metaStyle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "12px",
};

const openLinkStyle = {
  color: "#60a5fa",
  fontWeight: 800,
  textAlign: "right" as const,
};

const progressTrackStyle = {
  width: "100%",
  maxWidth: "180px",
  height: "6px",
  marginTop: "8px",
  overflow: "hidden",
  backgroundColor: "#334155",
  borderRadius: "999px",
};

const progressFillStyle = {
  height: "100%",
  backgroundColor: "#3b82f6",
  borderRadius: "999px",
};

const probationaryBadgeStyle = {
  display: "inline-block",
  padding: "5px 9px",
  color: "#fde68a",
  backgroundColor:
    "rgba(120, 53, 15, 0.3)",
  border: "1px solid #a16207",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 900,
};

const qualifiedBadgeStyle = {
  display: "inline-block",
  padding: "5px 9px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 900,
};

const archivedBadgeStyle = {
  display: "inline-block",
  padding: "5px 9px",
  color: "#cbd5e1",
  backgroundColor: "#334155",
  border: "1px solid #475569",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 900,
};

const notStartedPatrolBadgeStyle = {
  ...archivedBadgeStyle,
};

const submittedPatrolBadgeStyle = {
  ...probationaryBadgeStyle,
};

const reviewedPatrolBadgeStyle = {
  ...qualifiedBadgeStyle,
};

const emptyStyle = {
  padding: "20px",
  color: "#94a3b8",
};

const errorStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
};

const successStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
};


const managementOverrideStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "14px",
  marginTop: "16px",
  backgroundColor: "#172033",
  border: "1px solid #475569",
  borderRadius: "9px",
  flexWrap: "wrap" as const,
};

const managementOverrideTextStyle = {
  margin: "6px 0 0",
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: 1.5,
};

const placeProbationButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#d97706",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 900,
};

const removeProbationButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 900,
};