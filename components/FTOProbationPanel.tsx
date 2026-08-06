"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type PatrolStatus =
  | "not_started"
  | "submitted"
  | "reviewed";

type Outcome =
  | "pass"
  | "extend"
  | "fail";

type Props = {
  user: any;
  ftoFileId: string;
  ftoProfileId: string;
  ftoName: string;
  ftoSerial: string;
  readOnly?: boolean;
  onChanged?: () => void;
};

type Patrol = {
  id: string;
  fto_file_id: string;
  patrol_number: number;
  status: PatrolStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
};

type ObservationReport = {
  id: string;
  fto_file_id: string;
  patrol_id: string;
  patrol_number: number;
  fto_profile_id: string;
  manager_profile_id: string;
  report_date: string;
  observations: string;
  below_standard: string;
  above_standard: string;
  probationary_officer_feedback: string;
  roleplay_remarks: string;
  bbcode: string;
  created_at: string;
};

type FTOFileState = {
  probation_status:
    | "probationary"
    | "qualified"
    | "archived";
  probation_outcome:
    | "pass"
    | "extend"
    | "fail"
    | null;
  final_evaluation_status: string | null;
  final_evaluation_notes: string | null;
  final_evaluation_completed_at: string | null;
  probationary_passed_date: string | null;
  final_evaluation_date: string | null;
  archived_at: string | null;
};

const managementRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

export default function FTOProbationPanel({
  user,
  ftoFileId,
  ftoProfileId,
  ftoName,
  ftoSerial,
  readOnly = false,
  onChanged,
}: Props) {
  const [
    patrols,
    setPatrols,
  ] = useState<Patrol[]>([]);

  const [
    reports,
    setReports,
  ] = useState<ObservationReport[]>([]);

  const [
    fileState,
    setFileState,
  ] = useState<FTOFileState | null>(
    null
  );

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
    success,
    setSuccess,
  ] = useState("");

  const [
    selectedPatrol,
    setSelectedPatrol,
  ] = useState<Patrol | null>(
    null
  );

  const [
    observations,
    setObservations,
  ] = useState("");

  const [
    belowStandard,
    setBelowStandard,
  ] = useState("");

  const [
    aboveStandard,
    setAboveStandard,
  ] = useState("");

  const [
    probationaryOfficerFeedback,
    setProbationaryOfficerFeedback,
  ] = useState("");

  const [
    roleplayRemarks,
    setRoleplayRemarks,
  ] = useState("");

  const [
    finalEvaluationOpen,
    setFinalEvaluationOpen,
  ] = useState(false);

  const [
    finalOutcome,
    setFinalOutcome,
  ] = useState<Outcome>(
    "pass"
  );

  const [
    finalEvaluationNotes,
    setFinalEvaluationNotes,
  ] = useState("");

  const [
    extensionPatrols,
    setExtensionPatrols,
  ] = useState(1);

  const [
    expanded,
    setExpanded,
  ] = useState(false);

  const canManage =
    !readOnly &&
    managementRoles.includes(
      user?.role ?? ""
    );

  useEffect(() => {
    void loadData();
  }, [ftoFileId]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        fileResult,
        patrolResult,
        reportResult,
      ] = await Promise.all([
        supabase
          .from("fto_files")
          .select(`
            probation_status,
            probation_outcome,
            final_evaluation_status,
            final_evaluation_notes,
            final_evaluation_completed_at,
            probationary_passed_date,
            final_evaluation_date,
            archived_at
          `)
          .eq(
            "id",
            ftoFileId
          )
          .single(),

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
          .eq(
            "fto_file_id",
            ftoFileId
          )
          .order(
            "patrol_number",
            {
              ascending: true,
            }
          ),

        supabase
          .from(
            "fto_observation_reports"
          )
          .select(`
            id,
            fto_file_id,
            patrol_id,
            patrol_number,
            fto_profile_id,
            manager_profile_id,
            report_date,
            observations,
            below_standard,
            above_standard,
            probationary_officer_feedback,
            roleplay_remarks,
            bbcode,
            created_at
          `)
          .eq(
            "fto_file_id",
            ftoFileId
          )
          .order(
            "patrol_number",
            {
              ascending: true,
            }
          ),
      ]);

      if (
        fileResult.error
      ) {
        throw fileResult.error;
      }

      if (
        patrolResult.error
      ) {
        throw patrolResult.error;
      }

      if (
        reportResult.error
      ) {
        throw reportResult.error;
      }

      setFileState(
        fileResult.data as FTOFileState
      );

      setPatrols(
        (patrolResult.data ??
          []) as Patrol[]
      );

      setReports(
        (reportResult.data ??
          []) as ObservationReport[]
      );
    } catch (loadError) {
      console.error(
        "LOAD FTO PROBATION PANEL ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "FTO probation information could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  const reviewedCount =
    useMemo(
      () =>
        patrols.filter(
          (patrol) =>
            patrol.status ===
            "reviewed"
        ).length,
      [patrols]
    );

  const requiredPatrolCount =
    patrols.length;

  const finalUnlocked =
    requiredPatrolCount >= 3 &&
    reviewedCount ===
      requiredPatrolCount;

  function openReport(
    patrol: Patrol
  ) {
    const report =
      reports.find(
        (item) =>
          item.patrol_id ===
          patrol.id
      );

    setSelectedPatrol(
      patrol
    );

    setObservations(
      report?.observations ??
        ""
    );

    setBelowStandard(
      report?.below_standard ??
        ""
    );

    setAboveStandard(
      report?.above_standard ??
        ""
    );

    setProbationaryOfficerFeedback(
      report?.probationary_officer_feedback ??
        ""
    );

    setRoleplayRemarks(
      report?.roleplay_remarks ??
        ""
    );

    setError("");
    setSuccess("");
  }

  function buildObservationBBCode(
    managerName: string,
    managerSerial: string
  ) {
    if (!selectedPatrol) {
      return "";
    }

    return `[font=Arial][center][size=120][color=black][b]FIELD TRAINING OFFICER OBSERVATION REPORT[/b][/font][/color][/size][/center]

[table2=1,black,transparent,Arial]
[tr]
[tdwidth=1,black,transparent,top,left,30,5]
[size=87]FIELD TRAINING OFFICER[/size]
${ftoName}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5]
[size=87]SERIAL NO.[/size]
${ftoSerial}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,25,5]
[size=87]FIELD TRAINING MANAGER[/size]
${managerName}
[/tdwidth]
[tdwidth=1,black,transparent,top,left,8,5]
[size=87]SERIAL NO.[/size]
${managerSerial}
[/tdwidth][/tr][/table2]

[font=Arial][b][size=110]PROBATION PATROL[/size][/b][/font]

Patrol ${selectedPatrol.patrol_number}

[font=Arial][b][size=110]OBSERVATIONS[/size][/b][/font]

${observations.trim()}

[font=Arial][b][size=110]BELOW STANDARD PERFORMANCE[/size][/b][/font]

${belowStandard.trim() || "None recorded."}

[font=Arial][b][size=110]ABOVE STANDARD PERFORMANCE[/size][/b][/font]

${aboveStandard.trim() || "None recorded."}

[font=Arial][b][size=110]PROBATIONARY OFFICER FEEDBACK[/size][/b][/font]

${probationaryOfficerFeedback.trim()}

[font=Arial][b][size=110](( ROLEPLAY REMARKS ))[/size][/b][/font]

[ooc]${roleplayRemarks.trim() || "None recorded."}[/ooc]`;
  }

  async function saveObservationReport() {
    if (!selectedPatrol) {
      return;
    }

    if (
      !observations.trim() ||
      !probationaryOfficerFeedback.trim()
    ) {
      setError(
        "Observations and Probationary Officer Feedback are required."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: managerProfile,
        error: managerError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          badge_number
        `)
        .eq(
          "id",
          user.id
        )
        .single();

      if (managerError) {
        throw managerError;
      }

      const now =
        new Date().toISOString();

      const bbcode =
        buildObservationBBCode(
          managerProfile.name ??
            "Unknown Manager",
          managerProfile.badge_number ??
            "N/A"
        );

      const {
        error: reportError,
      } = await supabase
        .from(
          "fto_observation_reports"
        )
        .upsert(
          {
            fto_file_id:
              ftoFileId,
            patrol_id:
              selectedPatrol.id,
            patrol_number:
              selectedPatrol.patrol_number,
            fto_profile_id:
              ftoProfileId,
            manager_profile_id:
              user.id,
            report_date:
              now,
            observations:
              observations.trim(),
            below_standard:
              belowStandard.trim() ||
              null,
            above_standard:
              aboveStandard.trim() ||
              null,
            probationary_officer_feedback:
              probationaryOfficerFeedback.trim(),
            roleplay_remarks:
              roleplayRemarks.trim() ||
              null,
            bbcode,
          },
          {
            onConflict:
              "patrol_id",
          }
        );

      if (reportError) {
        throw reportError;
      }

      const {
        error: patrolError,
      } = await supabase
        .from(
          "fto_probation_patrols"
        )
        .update({
          status:
            "reviewed",
          submitted_at:
            selectedPatrol.submitted_at ??
            now,
          reviewed_at:
            now,
          reviewed_by:
            user.id,
          review_notes:
            observations.trim(),
        })
        .eq(
          "id",
          selectedPatrol.id
        );

      if (patrolError) {
        throw patrolError;
      }

      setSuccess(
        `Patrol ${selectedPatrol.patrol_number} observation report was saved and marked reviewed.`
      );

      setSelectedPatrol(
        null
      );

      await loadData();
      onChanged?.();
    } catch (saveError) {
      console.error(
        "SAVE FTO OBSERVATION REPORT ERROR",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "The observation report could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyReportBBCode(
    patrol: Patrol
  ) {
    const report =
      reports.find(
        (item) =>
          item.patrol_id ===
          patrol.id
      );

    if (!report?.bbcode) {
      setError(
        "No saved BBCode exists for this patrol."
      );
      return;
    }

    await navigator.clipboard.writeText(
      report.bbcode
    );

    setSuccess(
      `Patrol ${patrol.patrol_number} BBCode copied.`
    );
  }

  async function completeFinalEvaluation() {
    if (!finalUnlocked) {
      setError(
        "Every probation patrol must be reviewed before the Final Evaluation can be completed."
      );
      return;
    }

    if (
      !finalEvaluationNotes.trim()
    ) {
      setError(
        "Final Evaluation notes are required."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const now =
        new Date().toISOString();

      const nextStatus =
        finalOutcome ===
        "pass"
          ? "qualified"
          : finalOutcome ===
              "fail"
            ? "archived"
            : "probationary";

      const updateData: Record<
        string,
        unknown
      > = {
        probation_status:
          nextStatus,
        probation_outcome:
          finalOutcome,
        final_evaluation_status:
          finalOutcome ===
          "extend"
            ? "extended"
            : "completed",
        final_evaluation_notes:
          finalEvaluationNotes.trim(),
        final_evaluation_completed_at:
          now,
        final_evaluation_completed_by:
          user.id,
        final_evaluation_date:
          now.slice(
            0,
            10
          ),
        updated_at:
          now,
      };

      if (
        finalOutcome ===
        "pass"
      ) {
        updateData.probation_completed_at =
          now;
        updateData.probationary_passed_date =
          now.slice(
            0,
            10
          );
        updateData.archived_at =
          null;
      }

      if (
        finalOutcome ===
        "fail"
      ) {
        updateData.archived_at =
          now;
      }

      if (
        finalOutcome ===
        "extend"
      ) {
        updateData.probation_completed_at =
          null;
        updateData.archived_at =
          null;
      }

      const {
        error: fileError,
      } = await supabase
        .from("fto_files")
        .update(
          updateData
        )
        .eq(
          "id",
          ftoFileId
        );

      if (fileError) {
        throw fileError;
      }

      if (
        finalOutcome ===
        "extend"
      ) {
        const currentMax =
          Math.max(
            0,
            ...patrols.map(
              (patrol) =>
                patrol.patrol_number
            )
          );

        const additionalRows =
          Array.from(
            {
              length:
                Math.max(
                  1,
                  extensionPatrols
                ),
            },
            (
              _,
              index
            ) => ({
              fto_file_id:
                ftoFileId,
              patrol_number:
                currentMax +
                index +
                1,
              status:
                "not_started",
            })
          );

        const {
          error:
            extensionError,
        } = await supabase
          .from(
            "fto_probation_patrols"
          )
          .insert(
            additionalRows
          );

        if (
          extensionError
        ) {
          throw extensionError;
        }
      }

      setSuccess(
        finalOutcome ===
        "pass"
          ? `${ftoName} passed FTO probation and is now qualified.`
          : finalOutcome ===
              "fail"
            ? `${ftoName} failed FTO probation and the file was archived.`
            : `${ftoName}'s probation was extended by ${Math.max(
                1,
                extensionPatrols
              )} patrol(s).`
      );

      setFinalEvaluationOpen(
        false
      );

      setFinalEvaluationNotes(
        ""
      );

      await loadData();
      onChanged?.();
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

  if (loading) {
    return (
      <div style={cardStyle}>
        Loading FTO probation...
      </div>
    );
  }

  if (!fileState) {
    return null;
  }

  const collapsedSummary =
    fileState.probation_status ===
    "qualified"
      ? "Qualified"
      : fileState.probation_status ===
          "archived"
        ? "Archived"
        : finalUnlocked
          ? "Final Evaluation Ready"
          : `${reviewedCount}/${requiredPatrolCount} Patrols Reviewed`;

  return (
    <div style={cardStyle}>
      <button
        type="button"
        onClick={() =>
          setExpanded(
            (current) =>
              !current
          )
        }
        aria-expanded={
          expanded
        }
        style={collapseButtonStyle}
      >
        <div style={collapseHeadingStyle}>
          <span style={collapseChevronStyle}>
            {expanded
              ? "▼"
              : "▶"}
          </span>

          <div>
            <p style={eyebrowStyle}>
              FTO PROBATION
            </p>

            <h2 style={titleStyle}>
              Probation Progress
            </h2>

            <p style={mutedStyle}>
              {collapsedSummary}
            </p>
          </div>
        </div>

        <StatusBadge
          status={
            fileState.probation_status
          }
        />
      </button>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      {success && (
        <div style={successStyle}>
          {success}
        </div>
      )}

      {expanded && (
        <>
          <div style={progressSummaryStyle}>
        <Detail
          label="Reviewed Patrols"
          value={`${reviewedCount}/${requiredPatrolCount}`}
        />

        <Detail
          label="Final Evaluation"
          value={
            fileState.final_evaluation_status ??
            "Locked"
          }
        />

        <Detail
          label="Outcome"
          value={
            fileState.probation_outcome
              ? formatOutcome(
                  fileState.probation_outcome
                )
              : "Pending"
          }
        />
      </div>

      <div style={patrolGridStyle}>
        {patrols.map(
          (patrol) => {
            const report =
              reports.find(
                (item) =>
                  item.patrol_id ===
                  patrol.id
              );

            return (
              <div
                key={patrol.id}
                style={patrolCardStyle}
              >
                <div style={patrolHeaderStyle}>
                  <strong>
                    Patrol {patrol.patrol_number}
                  </strong>

                  <PatrolBadge
                    status={
                      patrol.status
                    }
                  />
                </div>

                <p style={mutedStyle}>
                  {patrol.status ===
                  "reviewed"
                    ? `Reviewed ${formatDateTime(
                        patrol.reviewed_at
                      )}`
                    : patrol.status ===
                        "submitted"
                      ? `Submitted ${formatDateTime(
                          patrol.submitted_at
                        )}`
                      : "Awaiting patrol review"}
                </p>

                <div style={buttonRowStyle}>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() =>
                        openReport(
                          patrol
                        )
                      }
                      style={primaryButtonStyle}
                    >
                      {report
                        ? "Edit Observation Report"
                        : "Conduct Patrol Review"}
                    </button>
                  )}

                  {report && (
                    <button
                      type="button"
                      onClick={() =>
                        void copyReportBBCode(
                          patrol
                        )
                      }
                      style={secondaryButtonStyle}
                    >
                      Copy BBCode
                    </button>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>

      <div style={finalCardStyle}>
        <div>
          <p style={eyebrowStyle}>
            FINAL EVALUATION
          </p>

          <h3 style={finalTitleStyle}>
            {finalUnlocked
              ? "Ready"
              : `Locked · ${reviewedCount}/${requiredPatrolCount} patrols reviewed`}
          </h3>

          <p style={mutedStyle}>
            {finalUnlocked
              ? "An FTM+ may now record the final outcome."
              : "Every current probation patrol must be reviewed first."}
          </p>
        </div>

        {canManage &&
          fileState.probation_status ===
            "probationary" && (
          <button
            type="button"
            disabled={
              !finalUnlocked
            }
            onClick={() =>
              setFinalEvaluationOpen(
                true
              )
            }
            style={{
              ...primaryButtonStyle,
              opacity:
                finalUnlocked
                  ? 1
                  : 0.5,
            }}
          >
            Conduct Final Evaluation
          </button>
        )}
      </div>

          {fileState.final_evaluation_notes && (
            <div style={savedEvaluationStyle}>
              <strong>
                Saved Final Evaluation
              </strong>

              <p style={savedEvaluationTextStyle}>
                {fileState.final_evaluation_notes}
              </p>

              <span style={mutedStyle}>
                {formatDateTime(
                  fileState.final_evaluation_completed_at
                )}
              </span>
            </div>
          )}
        </>
      )}

      {selectedPatrol && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>
                  OBSERVATION REPORT
                </p>

                <h2 style={modalTitleStyle}>
                  Patrol {selectedPatrol.patrol_number}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPatrol(
                    null
                  )
                }
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <Field
              label="Observations"
              value={observations}
              onChange={
                setObservations
              }
              required
            />

            <Field
              label="Below Standard Performance"
              value={belowStandard}
              onChange={
                setBelowStandard
              }
            />

            <Field
              label="Above Standard Performance"
              value={aboveStandard}
              onChange={
                setAboveStandard
              }
            />

            <Field
              label="Probationary Officer Feedback"
              value={
                probationaryOfficerFeedback
              }
              onChange={
                setProbationaryOfficerFeedback
              }
              required
            />

            <Field
              label="(( Roleplay Remarks ))"
              value={roleplayRemarks}
              onChange={
                setRoleplayRemarks
              }
            />

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() =>
                  setSelectedPatrol(
                    null
                  )
                }
                style={secondaryButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void saveObservationReport()
                }
                style={primaryButtonStyle}
              >
                {saving
                  ? "Saving..."
                  : "Save & Mark Reviewed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {finalEvaluationOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <p style={eyebrowStyle}>
                  FINAL EVALUATION
                </p>

                <h2 style={modalTitleStyle}>
                  {ftoName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFinalEvaluationOpen(
                    false
                  )
                }
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <label style={labelStyle}>
              Outcome
            </label>

            <select
              value={finalOutcome}
              onChange={(event) =>
                setFinalOutcome(
                  event.target
                    .value as Outcome
                )
              }
              style={inputStyle}
            >
              <option value="pass">
                Pass Probation
              </option>

              <option value="extend">
                Extend Probation
              </option>

              <option value="fail">
                Fail Probation
              </option>
            </select>

            {finalOutcome ===
              "extend" && (
              <>
                <label style={labelStyle}>
                  Additional Patrols
                </label>

                <input
                  type="number"
                  min={1}
                  max={10}
                  value={
                    extensionPatrols
                  }
                  onChange={(event) =>
                    setExtensionPatrols(
                      Math.max(
                        1,
                        Number(
                          event.target.value
                        ) || 1
                      )
                    )
                  }
                  style={inputStyle}
                />
              </>
            )}

            <Field
              label="Final Evaluation Notes"
              value={
                finalEvaluationNotes
              }
              onChange={
                setFinalEvaluationNotes
              }
              required
            />

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={() =>
                  setFinalEvaluationOpen(
                    false
                  )
                }
                style={secondaryButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void completeFinalEvaluation()
                }
                style={primaryButtonStyle}
              >
                {saving
                  ? "Saving..."
                  : "Complete Final Evaluation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  required?: boolean;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>
        {label}
        {required
          ? " *"
          : ""}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={textareaStyle}
      />
    </label>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={detailStyle}>
      <span style={detailLabelStyle}>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "probationary"
    | "qualified"
    | "archived";
}) {
  const style =
    status === "qualified"
      ? qualifiedBadgeStyle
      : status === "archived"
        ? archivedBadgeStyle
        : probationaryBadgeStyle;

  return (
    <span style={style}>
      {status.toUpperCase()}
    </span>
  );
}

function PatrolBadge({
  status,
}: {
  status: PatrolStatus;
}) {
  const style =
    status === "reviewed"
      ? qualifiedBadgeStyle
      : status === "submitted"
        ? probationaryBadgeStyle
        : archivedBadgeStyle;

  return (
    <span style={style}>
      {status ===
      "not_started"
        ? "NOT STARTED"
        : status.toUpperCase()}
    </span>
  );
}

function formatOutcome(
  value:
    | "pass"
    | "extend"
    | "fail"
) {
  return (
    value.charAt(0)
      .toUpperCase() +
    value.slice(1)
  );
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(
    value
  ).toLocaleString(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

const cardStyle = {
  padding: "24px",
  marginBottom: "20px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const collapseButtonStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: 0,
  color: "white",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left" as const,
};

const collapseHeadingStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
};

const collapseChevronStyle = {
  marginTop: "4px",
  color: "#93c5fd",
  fontSize: "14px",
  flexShrink: 0,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const titleStyle = {
  margin: "0 0 6px",
};

const mutedStyle = {
  margin: "6px 0 0",
  color: "#94a3b8",
};

const progressSummaryStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
  marginTop: "18px",
};

const detailStyle = {
  display: "grid",
  gap: "5px",
  padding: "12px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
};

const detailLabelStyle = {
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
};

const patrolGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(230px, 1fr))",
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

const finalCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "16px",
  marginTop: "16px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
  flexWrap: "wrap" as const,
};

const finalTitleStyle = {
  margin: "0 0 6px",
};

const savedEvaluationStyle = {
  display: "grid",
  gap: "8px",
  padding: "15px",
  marginTop: "14px",
  backgroundColor: "#172033",
  border: "1px solid #475569",
  borderRadius: "9px",
};

const savedEvaluationTextStyle = {
  margin: 0,
  color: "#cbd5e1",
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.55,
};

const buttonRowStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "14px",
  flexWrap: "wrap" as const,
};

const primaryButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
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

const modalOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  backgroundColor:
    "rgba(2, 6, 23, 0.88)",
};

const modalStyle = {
  width: "100%",
  maxWidth: "860px",
  maxHeight: "92vh",
  overflowY: "auto" as const,
  padding: "26px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "14px",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "18px",
};

const modalTitleStyle = {
  margin: 0,
};

const closeButtonStyle = {
  padding: "0 8px",
  color: "white",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "30px",
};

const fieldStyle = {
  display: "grid",
  gap: "7px",
  marginBottom: "15px",
};

const labelStyle = {
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: 800,
};

const textareaStyle = {
  minHeight: "125px",
  padding: "12px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px",
  margin: "7px 0 15px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const errorStyle = {
  padding: "13px",
  marginTop: "14px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
};

const successStyle = {
  padding: "13px",
  marginTop: "14px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
};