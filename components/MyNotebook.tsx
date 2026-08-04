"use client";

import {
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import { supabase } from "../lib/supabase";
import { auditAction } from "../lib/auditAction";

type Props = {
  user: any;
  traineeId?: string;
};

type NotebookItem = {
  id: string;
  trainee_id: string;
  section: string;
  item_label: string;
  completed: boolean;
};

type DORRecord = {
  id: string;
  trainee_id: string;
  fto_id: string;
  patrol_number: number;
  patrol_date: string;
  start_time: string;
  end_time: string;
  duration: string;
  incidents: string;
  below_standard: string | null;
  above_standard: string | null;
  learning_goals: string | null;
  roleplay_remarks: string | null;
  ratings: Record<string, string> | null;
  bbcode: string;
  created_at: string;
  ftoName: string;
};

type SupervisingOfficer = {
  id: string;
  name: string;
  rank: string;
  role: string | null;
};

type UnguidedPatrol = {
  id: string;
  trainee_id: string;
  supervising_officer_id: string | null;
  supervising_officer_name: string;
  supervising_officer_rank: string;
  patrol_date: string;
  patrol_time: string;
  statement_bbcode: string;
  created_at: string;
};

const evaluationLabels: Record<string, string> = {
  "1": "General Appearance",
  "2": "Attitude towards the Job and Feedback",
  "3": "Department Policies/Procedures",
  "4": "Law, Penal Code, Search and Seizure",
  "5": "Driving Skill: General",
  "6": "Driving Skill: Orientation and Response Time to Calls",
  "7": "Report Writing: Accuracy/Grammar/Organisation",
  "8": "Field Performance",
  "9": "Self-Initiated Field Activities",
  "10": "Field Activities: Traffic Stop",
  "11": "Field Activities: Arrest Procedure",
  "12": "Officer Safety Principles",
  "13": "Control of Conflict: Voice Command/Physical Skill",
  "14": "Use of Common Sense and Good Judgement",
  "15": "Radio/MDC: Use of Mobile Data Computer",
  "16": "Radio: Articulation of Transmissions",
  "17": "With Citizens/Employees in General",
};

export default function MyNotebook({
  user,
  traineeId,
}: Props) {
  const [
    items,
    setItems,
  ] = useState<NotebookItem[]>([]);

  const [
    trainee,
    setTrainee,
  ] = useState<any>(null);

  const [
    profile,
    setProfile,
  ] = useState<any>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    openSections,
    setOpenSections,
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    dors,
    setDors,
  ] = useState<DORRecord[]>([]);

  const [
    selectedDOR,
    setSelectedDOR,
  ] = useState<DORRecord | null>(null);

  const [
    loadingDORs,
    setLoadingDORs,
  ] = useState(false);

  const [
    dorError,
    setDorError,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    supervisingOfficers,
    setSupervisingOfficers,
  ] = useState<SupervisingOfficer[]>([]);

  const [
    unguidedPatrols,
    setUnguidedPatrols,
  ] = useState<UnguidedPatrol[]>([]);

  const [
    selectedSupervisorId,
    setSelectedSupervisorId,
  ] = useState("");

  const [
    unguidedDate,
    setUnguidedDate,
  ] = useState("");

  const [
    unguidedTime,
    setUnguidedTime,
  ] = useState("");

  const [
    savingUnguided,
    setSavingUnguided,
  ] = useState(false);

  const [
    unguidedError,
    setUnguidedError,
  ] = useState("");

  const [
    unguidedSuccess,
    setUnguidedSuccess,
  ] = useState("");

  const [
    copiedUnguidedId,
    setCopiedUnguidedId,
  ] = useState<string | null>(null);

  useEffect(() => {
    loadNotebook();
  }, [traineeId]);

  async function loadNotebook() {
    setLoading(true);
    setLoadError("");

    let traineeData: any = null;
    let traineeError: any = null;

    if (traineeId) {
      const result =
        await supabase
          .from("trainees")
          .select("*")
          .eq(
            "id",
            traineeId
          )
          .single();

      traineeData =
        result.data;

      traineeError =
        result.error;
    } else {
      const result =
        await supabase
          .from("trainees")
          .select("*")
          .eq(
            "profile_id",
            user.id
          )
          .single();

      traineeData =
        result.data;

      traineeError =
        result.error;
    }

    if (
      traineeError ||
      !traineeData
    ) {
      console.error(
        "NOTEBOOK LOAD ERROR",
        traineeError
      );

      setLoadError(
        traineeError?.message ??
          "The FTP notebook could not be loaded."
      );

      setLoading(false);

      return;
    }

    setTrainee(
      traineeData
    );

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq(
        "id",
        traineeData.profile_id
      )
      .single();

    if (profileError) {
      console.error(
        "PROFILE LOAD ERROR",
        profileError
      );
    }

    setProfile(
      profileData
    );

    const {
      data: itemData,
      error: itemError,
    } = await supabase
      .from("notebook_items")
      .select("*")
      .eq(
        "trainee_id",
        traineeData.id
      )
      .order(
        "section"
      );

    if (itemError) {
      console.error(
        "ITEM LOAD ERROR",
        itemError
      );

      setLoadError(
        itemError.message
      );
    }

    setItems(
      itemData ?? []
    );

    await Promise.all([
      loadDORs(
        traineeData.id
      ),
      loadUnguidedPatrols(
        traineeData.id
      ),
      loadSupervisingOfficers(),
    ]);

    setLoading(false);
  }

  async function loadDORs(
    traineeRecordId: string
  ) {
    setLoadingDORs(true);
    setDorError("");

    try {
      const {
        data: dorData,
        error: dorLoadError,
      } = await supabase
        .from("dors")
        .select("*")
        .eq(
          "trainee_id",
          traineeRecordId
        )
        .order(
          "patrol_number",
          {
            ascending: false,
          }
        );

      if (dorLoadError) {
        throw dorLoadError;
      }

      const dorRows =
        dorData ?? [];

      const ftoIds = [
        ...new Set(
          dorRows
            .map(
              (dor) =>
                dor.fto_id
            )
            .filter(Boolean)
        ),
      ];

      let ftoProfiles: {
        id: string;
        name: string | null;
      }[] = [];

      if (ftoIds.length > 0) {
        const {
          data: ftoData,
          error: ftoLoadError,
        } = await supabase
          .from("profiles")
          .select("id, name")
          .in(
            "id",
            ftoIds
          );

        if (ftoLoadError) {
          throw ftoLoadError;
        }

        ftoProfiles =
          ftoData ?? [];
      }

      setDors(
        dorRows.map(
          (dor): DORRecord => ({
            ...dor,
            ftoName:
              ftoProfiles.find(
                (profile) =>
                  profile.id ===
                  dor.fto_id
              )?.name ??
              "Unknown FTO",
          })
        )
      );
    } catch (error) {
      console.error(
        "DOR HISTORY LOAD ERROR",
        error
      );

      setDorError(
        error instanceof Error
          ? error.message
          : "DOR history could not be loaded."
      );
    } finally {
      setLoadingDORs(false);
    }
  }

  async function loadSupervisingOfficers() {
    try {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          rank,
          role
        `)
        .not(
          "name",
          "is",
          null
        )
        .order(
          "name",
          {
            ascending: true,
          }
        );

      if (error) {
        throw error;
      }

      setSupervisingOfficers(
        (data ?? [])
          .filter(
            (officer) =>
              officer.id !==
              user.id
          )
          .map(
            (officer) => ({
              id:
                officer.id,

              name:
                officer.name ??
                "Unknown Officer",

              rank:
                officer.rank ??
                "Police Officer I",

              role:
                officer.role ??
                null,
            })
          )
      );
    } catch (error) {
      console.error(
        "LOAD SUPERVISING OFFICERS ERROR",
        error
      );

      setUnguidedError(
        error instanceof Error
          ? error.message
          : "The supervising-officer list could not be loaded."
      );
    }
  }

  async function loadUnguidedPatrols(
    traineeRecordId: string
  ) {
    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          "unguided_patrols"
        )
        .select("*")
        .eq(
          "trainee_id",
          traineeRecordId
        )
        .order(
          "patrol_date",
          {
            ascending: false,
          }
        )
        .order(
          "patrol_time",
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      setUnguidedPatrols(
        data ?? []
      );
    } catch (error) {
      console.error(
        "LOAD UNGUIDED PATROLS ERROR",
        error
      );

      setUnguidedError(
        error instanceof Error
          ? error.message
          : "Unguided patrols could not be loaded."
      );
    }
  }

  function buildUnguidedStatement(
    officer:
      SupervisingOfficer,
    date: string,
    time: string
  ) {
    const traineeRank =
      profile?.rank ||
      "Police Officer I";

    const traineeName =
      profile?.name ||
      user.name ||
      "Unknown Officer";

    return `I, [b]${traineeRank} ${traineeName}[/b] conducted an unguided patrol with [b]${officer.rank} ${officer.name}[/b] on ${formatDate(date)}, ${time}`;
  }

  async function saveUnguidedPatrol() {
    if (!trainee) {
      return;
    }

    const officer =
      supervisingOfficers.find(
        (item) =>
          item.id ===
          selectedSupervisorId
      );

    if (!officer) {
      setUnguidedError(
        "Select the officer who accompanied the unguided patrol."
      );
      return;
    }

    if (!unguidedDate) {
      setUnguidedError(
        "Select the patrol date."
      );
      return;
    }

    if (!unguidedTime) {
      setUnguidedError(
        "Select the patrol time."
      );
      return;
    }

    const statement =
      buildUnguidedStatement(
        officer,
        unguidedDate,
        unguidedTime
      );

    setSavingUnguided(true);
    setUnguidedError("");
    setUnguidedSuccess("");

    try {
      const { data } =
        await auditAction({
          user,

          action:
            "ADD_UNGUIDED_PATROL",

          category:
            "Notebook",

          entityType:
            "trainee",

          entityId:
            trainee.id,

          targetName:
            profile?.name ||
            user.name ||
            "Unknown Officer",

          newData: {
            trainee_id:
              trainee.id,

            supervising_officer_id:
              officer.id,

            supervising_officer_name:
              officer.name,

            supervising_officer_rank:
              officer.rank,

            patrol_date:
              unguidedDate,

            patrol_time:
              unguidedTime,

            statement_bbcode:
              statement,
          },

          execute:
            async () => {
              const result =
                await supabase
                  .from(
                    "unguided_patrols"
                  )
                  .insert({
                    trainee_id:
                      trainee.id,

                    supervising_officer_id:
                      officer.id,

                    supervising_officer_name:
                      officer.name,

                    supervising_officer_rank:
                      officer.rank,

                    patrol_date:
                      unguidedDate,

                    patrol_time:
                      unguidedTime,

                    statement_bbcode:
                      statement,

                    created_by:
                      user.id,
                  })
                  .select("*")
                  .single();

              if (
                result.error
              ) {
                throw result.error;
              }

              return result;
            },
        });

      setUnguidedPatrols(
        (current) => [
          data,
          ...current,
        ]
      );

      setSelectedSupervisorId("");
      setUnguidedDate("");
      setUnguidedTime("");

      setUnguidedSuccess(
        "Unguided patrol added to your notebook."
      );
    } catch (error) {
      console.error(
        "SAVE UNGUIDED PATROL ERROR",
        error
      );

      setUnguidedError(
        error instanceof Error
          ? error.message
          : "The unguided patrol could not be saved."
      );
    } finally {
      setSavingUnguided(false);
    }
  }

  async function copyUnguidedBBCode(
    patrol: UnguidedPatrol
  ) {
    try {
      await navigator.clipboard.writeText(
        patrol.statement_bbcode
      );

      setCopiedUnguidedId(
        patrol.id
      );

      setTimeout(() => {
        setCopiedUnguidedId(
          null
        );
      }, 2000);
    } catch (error) {
      console.error(
        "COPY UNGUIDED BBCODE ERROR",
        error
      );

      setUnguidedError(
        "The unguided patrol BBCode could not be copied."
      );
    }
  }

  async function copyBBCode() {
    if (!selectedDOR) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        selectedDOR.bbcode
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        "COPY DOR BBCODE ERROR",
        error
      );
    }
  }

  if (loading) {
    return (
      <p>
        Loading FTP Notebook...
      </p>
    );
  }

  if (loadError) {
    return (
      <div style={errorBox}>
        {loadError}
      </div>
    );
  }

  const mandatoryItems =
    items.filter(
      (item) =>
        item.item_label.includes(
          "(BFA)"
        ) ||
        item.item_label.includes(
          "(EVOC)"
        )
    );

  const trainingItems =
    items.filter(
      (item) =>
        !item.item_label.includes(
          "(BFA)"
        ) &&
        !item.item_label.includes(
          "(EVOC)"
        )
    );

  const completed =
    trainingItems.filter(
      (item) =>
        item.completed
    ).length;

  const progress =
    trainingItems.length > 0
      ? Math.round(
          (
            completed /
            trainingItems.length
          ) * 100
        )
      : 0;

  const sections =
    trainingItems.reduce(
      (
        result,
        item
      ) => {
        if (
          !result[
            item.section
          ]
        ) {
          result[
            item.section
          ] = [];
        }

        result[
          item.section
        ].push(item);

        return result;
      },
      {} as Record<
        string,
        NotebookItem[]
      >
    );

  function toggle(
    section: string
  ) {
    setOpenSections(
      (current) => ({
        ...current,
        [section]:
          !current[
            section
          ],
      })
    );
  }

  const canAddUnguidedPatrol =
    !traineeId &&
    user?.id ===
      trainee?.profile_id;

  return (
    <div>
      <div style={card}>
        <div
          style={headerGrid}
        >
          <div>
            <Image
              src="/ftp-logo.png"
              alt="FTP Logo"
              width={120}
              height={120}
            />
          </div>

          <div>
            <h1 style={title}>
              LSPD FIELD TRAINING
              PROGRAM
            </h1>

            <h2
              style={subtitle}
            >
              Probationary Officer
              Notebook
            </h2>
          </div>

          <div />
        </div>
      </div>

      <div style={card}>
        <h2 style={heading}>
          Officer Details
        </h2>

        <div style={grid}>
          <Detail
            label="Character Name"
            value={
              profile?.name ||
              user.name
            }
          />

          <Detail
            label="Rank"
            value={
              profile?.rank ||
              "Police Officer I"
            }
          />

          <Detail
            label="Badge Number"
            value={
              profile?.badge_number ||
              "Not Assigned"
            }
          />

          <Detail
            label="Work Number"
            value={
              profile?.work_number ||
              "Not Assigned"
            }
          />

          <Detail
            label="Field Training Manager"
            value={
              trainee?.assigned_ftm ||
              "Unassigned"
            }
          />

          <Detail
            label="Status"
            value={
              trainee?.status ||
              "Active"
            }
          />
        </div>
      </div>

      <div style={card}>
        <h2 style={heading}>
          Mandatory Requirements
        </h2>

        <div
          style={contentGap}
        >
          {mandatoryItems.length ===
          0 ? (
            <p style={muted}>
              No mandatory
              requirements found.
            </p>
          ) : (
            mandatoryItems.map(
              (item) => (
                <div
                  key={item.id}
                  style={
                    mandatoryBox
                  }
                >
                  <span>
                    {item.completed
                      ? "✅"
                      : "⬜"}
                  </span>

                  <b>
                    {
                      item.item_label
                    }
                  </b>
                </div>
              )
            )
          )}
        </div>
      </div>

      <div style={card}>
        <h2 style={heading}>
          Training Progress
        </h2>

        <div
          style={contentGap}
        >
          <p
            style={
              progressText
            }
          >
            <b>{completed}</b>
            {" of "}
            <b>
              {
                trainingItems.length
              }
            </b>
            {" completed"}
          </p>

          <div
            style={
              progressBackground
            }
          >
            <div
              style={{
                ...progressBar,
                width:
                  `${progress}%`,
              }}
            />
          </div>

          <p style={muted}>
            {progress}% Complete
          </p>
        </div>
      </div>

      <div style={card}>
        <h2 style={heading}>
          FTP Notebook
        </h2>

        <div
          style={contentGap}
        >
          {Object.entries(
            sections
          ).map(
            ([
              section,
              sectionItems,
            ]) => (
              <div
                key={
                  section
                }
              >
                <button
                  onClick={() =>
                    toggle(
                      section
                    )
                  }
                  style={
                    sectionButton
                  }
                >
                  {openSections[
                    section
                  ]
                    ? "▼"
                    : "▶"}
                  {" "}
                  {section}
                </button>

                {openSections[
                  section
                ] &&
                  sectionItems.map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        style={
                          itemBox
                        }
                      >
                        <span>
                          {item.completed
                            ? "✅"
                            : "⬜"}
                        </span>

                        <div>
                          <b>
                            {
                              item.item_label
                            }
                          </b>

                          <p
                            style={
                              muted
                            }
                          >
                            {item.completed
                              ? "Completed"
                              : "Pending"}
                          </p>
                        </div>
                      </div>
                    )
                  )}
              </div>
            )
          )}
        </div>
      </div>

      <div style={card}>
        <div style={sectionHeader}>
          <div>
            <h2
              style={{
                ...heading,
                marginBottom: "6px",
              }}
            >
              DOR History
            </h2>

            <p style={muted}>
              Saved Daily Observation Reports for this P1 record.
            </p>
          </div>

          <span style={countBadge}>
            {dors.length} DOR
            {dors.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        {loadingDORs ? (
          <p style={muted}>
            Loading DOR history...
          </p>
        ) : dorError ? (
          <div style={errorBox}>
            Unable to load DOR history: {dorError}
          </div>
        ) : dors.length === 0 ? (
          <div style={emptyState}>
            No DORs have been submitted for this trainee yet.
          </div>
        ) : (
          <div style={dorList}>
            {dors.map(
              (dor) => (
                <button
                  key={dor.id}
                  type="button"
                  onClick={() =>
                    setSelectedDOR(
                      dor
                    )
                  }
                  style={dorCard}
                >
                  <div>
                    <strong>
                      Patrol{" "}
                      {
                        dor.patrol_number
                      }
                    </strong>

                    <div style={dorMeta}>
                      {formatDate(
                        dor.patrol_date
                      )}
                      {" • "}
                      {dor.ftoName}
                      {" • "}
                      {dor.duration}
                    </div>
                  </div>

                  <span style={viewLink}>
                    View full DOR
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={sectionHeader}>
          <div>
            <h2
              style={{
                ...heading,
                marginBottom: "6px",
              }}
            >
              Unguided Patrols
            </h2>

            <p style={muted}>
              Record patrols completed without direct FTO guidance.
            </p>
          </div>

          <span style={countBadge}>
            {unguidedPatrols.length} patrol
            {unguidedPatrols.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        {canAddUnguidedPatrol && (
          <div style={unguidedFormCard}>
            <div style={unguidedGrid}>
              <div>
                <label style={formLabel}>
                  Accompanying Officer
                </label>

                <select
                  value={
                    selectedSupervisorId
                  }
                  onChange={(event) =>
                    setSelectedSupervisorId(
                      event.target.value
                    )
                  }
                  disabled={
                    savingUnguided
                  }
                  style={formInput}
                >
                  <option value="">
                    Select Officer
                  </option>

                  {supervisingOfficers.map(
                    (officer) => (
                      <option
                        key={officer.id}
                        value={officer.id}
                      >
                        {officer.rank}{" "}
                        {officer.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label style={formLabel}>
                  Patrol Date
                </label>

                <input
                  type="date"
                  value={
                    unguidedDate
                  }
                  onChange={(event) =>
                    setUnguidedDate(
                      event.target.value
                    )
                  }
                  disabled={
                    savingUnguided
                  }
                  style={formInput}
                />
              </div>

              <div>
                <label style={formLabel}>
                  Patrol Time
                </label>

                <input
                  type="time"
                  value={
                    unguidedTime
                  }
                  onChange={(event) =>
                    setUnguidedTime(
                      event.target.value
                    )
                  }
                  disabled={
                    savingUnguided
                  }
                  style={formInput}
                />
              </div>
            </div>

            {selectedSupervisorId &&
              unguidedDate &&
              unguidedTime && (
                <div style={previewBox}>
                  <strong>
                    BBCode Preview
                  </strong>

                  <p style={previewText}>
                    {buildUnguidedStatement(
                      supervisingOfficers.find(
                        (officer) =>
                          officer.id ===
                          selectedSupervisorId
                      )!,
                      unguidedDate,
                      unguidedTime
                    )}
                  </p>
                </div>
              )}

            {unguidedError && (
              <div style={errorBox}>
                {unguidedError}
              </div>
            )}

            {unguidedSuccess && (
              <div style={successBox}>
                {unguidedSuccess}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                void saveUnguidedPatrol()
              }
              disabled={
                savingUnguided
              }
              style={{
                ...addUnguidedButton,
                opacity:
                  savingUnguided
                    ? 0.65
                    : 1,
              }}
            >
              {savingUnguided
                ? "Saving..."
                : "Add Unguided Patrol"}
            </button>
          </div>
        )}

        {unguidedPatrols.length ===
        0 ? (
          <div style={emptyState}>
            No unguided patrols have been recorded.
          </div>
        ) : (
          <div style={unguidedList}>
            {unguidedPatrols.map(
              (patrol) => (
                <div
                  key={patrol.id}
                  style={unguidedEntry}
                >
                  <div>
                    <strong>
                      {
                        patrol.supervising_officer_rank
                      }{" "}
                      {
                        patrol.supervising_officer_name
                      }
                    </strong>

                    <div style={dorMeta}>
                      {formatDate(
                        patrol.patrol_date
                      )}
                      {" • "}
                      {
                        patrol.patrol_time
                      }
                    </div>

                    <p style={unguidedStatement}>
                      {
                        patrol.statement_bbcode
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void copyUnguidedBBCode(
                        patrol
                      )
                    }
                    style={copyUnguidedButton}
                  >
                    {copiedUnguidedId ===
                    patrol.id
                      ? "Copied!"
                      : "Copy BBCode"}
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div style={card}>
        <h2 style={heading}>
          Final Evaluation
        </h2>

        <p>
          {trainee
            ?.final_evaluation_completed
            ? "✅ Final Evaluation Completed"
            : "⏳ Awaiting Completion"}
        </p>
      </div>

      <button
        onClick={() =>
          window.print()
        }
        style={printButton}
      >
        🖨 Print / Export FTP Record
      </button>

      {selectedDOR && (
        <div
          style={modalOverlay}
          onClick={() =>
            setSelectedDOR(null)
          }
        >
          <div
            style={modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div style={modalHeader}>
              <div>
                <h2
                  style={{
                    margin: "0 0 6px",
                  }}
                >
                  DOR Patrol{" "}
                  {
                    selectedDOR.patrol_number
                  }
                </h2>

                <p
                  style={{
                    ...muted,
                    margin: 0,
                  }}
                >
                  {formatDate(
                    selectedDOR.patrol_date
                  )}
                  {" • "}
                  {
                    selectedDOR.ftoName
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDOR(null)
                }
                style={closeButton}
              >
                ×
              </button>
            </div>

            <div style={modalInfoGrid}>
              <Detail
                label="Patrol Number"
                value={String(
                  selectedDOR.patrol_number
                )}
              />

              <Detail
                label="Date"
                value={formatDate(
                  selectedDOR.patrol_date
                )}
              />

              <Detail
                label="Start Time"
                value={
                  selectedDOR.start_time
                }
              />

              <Detail
                label="End Time"
                value={
                  selectedDOR.end_time
                }
              />

              <Detail
                label="Duration"
                value={
                  selectedDOR.duration
                }
              />

              <Detail
                label="FTO"
                value={
                  selectedDOR.ftoName
                }
              />
            </div>

            <ReportSection
              title="Incidents / Tasks"
              value={
                selectedDOR.incidents
              }
            />

            <ReportSection
              title="Below Standard Performance"
              value={
                selectedDOR.below_standard ||
                "None"
              }
            />

            <ReportSection
              title="Above Standard Performance"
              value={
                selectedDOR.above_standard ||
                "None"
              }
            />

            <ReportSection
              title="Learning Goals"
              value={
                selectedDOR.learning_goals ||
                "None"
              }
            />

            <ReportSection
              title="Roleplay Remarks"
              value={
                selectedDOR.roleplay_remarks ||
                "None"
              }
            />

            <div style={reportSection}>
              <h3>
                Evaluation Ratings
              </h3>

              <div style={ratingGrid}>
                {Object.entries(
                  selectedDOR.ratings ??
                    {}
                )
                  .sort(
                    ([first], [second]) =>
                      Number(first) -
                      Number(second)
                  )
                  .map(
                    ([
                      category,
                      rating,
                    ]) => (
                      <div
                        key={category}
                        style={ratingItem}
                      >
                        <strong>
                          {category}.{" "}
                          {
                            evaluationLabels[
                              category
                            ]
                          }
                        </strong>

                        <span style={ratingBadge}>
                          {rating}
                        </span>
                      </div>
                    )
                  )}
              </div>
            </div>

            <div style={modalButtons}>
              <button
                type="button"
                onClick={copyBBCode}
                style={copyButton}
              >
                {copied
                  ? "Copied!"
                  : "Copy BBCode"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedDOR(null)
                }
                style={closeModalButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(
  date: string
) {
  if (!date) {
    return "Unknown date";
  }

  const [year, month, day] =
    date.split("-");

  return `${day}/${month}/${year}`;
}

function ReportSection({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div style={reportSection}>
      <h3>{title}</h3>

      <p style={reportText}>
        {value}
      </p>
    </div>
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
    <div style={detailBox}>
      <p style={labelStyle}>
        {label}
      </p>

      <p style={valueStyle}>
        {value}
      </p>
    </div>
  );
}

const card = {
  background: "#1e293b",
  padding: "32px",
  borderRadius: "12px",
  marginBottom: "24px",
};

const headerGrid = {
  display: "grid",
  gridTemplateColumns:
    "120px 1fr 120px",
  alignItems: "center",
  textAlign:
    "center" as const,
};

const title = {
  fontWeight: "900",
  fontSize: "28px",
  margin: 0,
};

const subtitle = {
  fontWeight: "700",
  color: "#94a3b8",
  marginTop: "8px",
};

const heading = {
  fontWeight: "900",
  fontSize: "22px",
  marginBottom: "25px",
  marginTop: 0,
};

const contentGap = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "14px",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  columnGap: "80px",
  rowGap: "25px",
};

const detailBox = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "8px",
};

const labelStyle = {
  fontWeight: "700",
  color: "#cbd5e1",
  margin: 0,
};

const valueStyle = {
  margin: 0,
  fontSize: "17px",
};

const muted = {
  color: "#94a3b8",
  fontSize: "14px",
  margin: 0,
};

const progressText = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: "4px",
  margin: 0,
};

const mandatoryBox = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  background: "#0f172a",
  padding: "14px",
  borderRadius: "8px",
};

const progressBackground = {
  height: "14px",
  background: "#0f172a",
  borderRadius: "20px",
  overflow: "hidden",
};

const progressBar = {
  height: "100%",
  background: "#2563eb",
};

const sectionButton = {
  width: "100%",
  padding: "16px",
  background: "#0f172a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  textAlign:
    "left" as const,
  fontWeight: "800",
  cursor: "pointer",
};

const itemBox = {
  display: "flex",
  gap: "15px",
  alignItems: "center",
  padding: "14px",
  marginTop: "10px",
  background: "#111827",
  borderRadius: "8px",
};

const unguidedFormCard = {
  display: "grid",
  gap: "16px",
  padding: "18px",
  marginBottom: "20px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const unguidedGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "16px",
};

const formLabel = {
  display: "block",
  marginBottom: "7px",
  color: "#cbd5e1",
  fontSize: "13px",
  fontWeight: 700,
};

const formInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  color: "white",
  background: "#111827",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const previewBox = {
  padding: "14px",
  color: "#dbeafe",
  background:
    "rgba(37, 99, 235, 0.12)",
  border: "1px solid #2563eb",
  borderRadius: "8px",
};

const previewText = {
  margin: "8px 0 0",
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.55,
};

const successBox = {
  padding: "14px",
  color: "#bbf7d0",
  background:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
};

const addUnguidedButton = {
  justifySelf: "start",
  padding: "12px 18px",
  color: "white",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const unguidedList = {
  display: "grid",
  gap: "12px",
};

const unguidedEntry = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  padding: "16px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
  flexWrap: "wrap" as const,
};

const unguidedStatement = {
  margin: "10px 0 0",
  color: "#cbd5e1",
  fontSize: "13px",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap" as const,
};

const copyUnguidedButton = {
  padding: "9px 13px",
  color: "white",
  background: "#16a34a",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 700,
};

const printButton = {
  padding: "14px 25px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
};

const errorBox = {
  padding: "14px",
  color: "#fecaca",
  background:
    "rgba(127, 29, 29, 0.35)",
  border:
    "1px solid #991b1b",
  borderRadius: "8px",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
};

const countBadge = {
  padding: "6px 10px",
  color: "#bfdbfe",
  background:
    "rgba(37, 99, 235, 0.18)",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 700,
};

const dorList = {
  display: "grid",
  gap: "10px",
};

const dorCard = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "15px",
  color: "white",
  textAlign: "left" as const,
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
  cursor: "pointer",
};

const dorMeta = {
  marginTop: "6px",
  color: "#94a3b8",
  fontSize: "13px",
};

const viewLink = {
  color: "#60a5fa",
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
};

const emptyState = {
  padding: "18px",
  color: "#94a3b8",
  background: "#0f172a",
  borderRadius: "8px",
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "24px",
  background:
    "rgba(2, 6, 23, 0.86)",
  zIndex: 1000,
};

const modal = {
  width: "100%",
  maxWidth: "950px",
  maxHeight: "90vh",
  overflowY: "auto" as const,
  padding: "28px",
  color: "white",
  background: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "14px",
  boxShadow:
    "0 24px 60px rgba(0,0,0,0.45)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "24px",
};

const closeButton = {
  padding: "0 8px",
  color: "white",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "30px",
  lineHeight: 1,
};

const modalInfoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "16px",
  padding: "18px",
  marginBottom: "20px",
  background: "#0f172a",
  borderRadius: "10px",
};

const reportSection = {
  padding: "18px 0",
  borderBottom:
    "1px solid #334155",
};

const reportText = {
  marginBottom: 0,
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.6,
};

const ratingGrid = {
  display: "grid",
  gap: "10px",
};

const ratingItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "12px",
  background: "#0f172a",
  borderRadius: "8px",
};

const ratingBadge = {
  minWidth: "48px",
  padding: "6px 9px",
  textAlign: "center" as const,
  color: "#bfdbfe",
  background:
    "rgba(37, 99, 235, 0.18)",
  border: "1px solid #2563eb",
  borderRadius: "7px",
  fontWeight: 800,
};

const modalButtons = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  marginTop: "24px",
  flexWrap: "wrap" as const,
};

const copyButton = {
  padding: "10px 16px",
  background: "#16a34a",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const closeModalButton = {
  padding: "10px 16px",
  background: "#475569",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};