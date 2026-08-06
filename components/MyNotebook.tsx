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

  completion_date?: string | null;
  completed_at?: string | null;

  evidence_link?: string | null;
  completion_evidence?: string | null;

  completed_by?: string | null;
  completion_source?: string | null;

  completion_patrol_number?: number | null;
  completion_dor_id?: string | null;
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
    assignedFTMName,
    setAssignedFTMName,
  ] = useState("Unassigned");

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
    openHistoryItems,
    setOpenHistoryItems,
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
    unguidedPatrols,
    setUnguidedPatrols,
  ] = useState<UnguidedPatrol[]>([]);

  const [
    accompanyingOfficerName,
    setAccompanyingOfficerName,
  ] = useState("");

  const [
    accompanyingOfficerRank,
    setAccompanyingOfficerRank,
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

  const [
    courseEvidence,
    setCourseEvidence,
  ] = useState<
    Record<
      string,
      {
        date: string;
        link: string;
      }
    >
  >({});

  const [
    savingCourseItemId,
    setSavingCourseItemId,
  ] = useState<string | null>(null);

  const [
    courseError,
    setCourseError,
  ] = useState("");

  const [
    courseSuccess,
    setCourseSuccess,
  ] = useState("");

  useEffect(() => {
    loadNotebook();
  }, [traineeId]);

  async function loadNotebook() {
    setLoading(true);
    setLoadError("");
    setAssignedFTMName("Unassigned");

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

    const assignedFTMId =
      typeof traineeData.assigned_ftm ===
      "string"
        ? traineeData.assigned_ftm.trim()
        : "";

    if (assignedFTMId) {
      const {
        data:
          assignedFTMProfile,
        error:
          assignedFTMError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          rank,
          badge_number,
          role
        `)
        .eq(
          "id",
          assignedFTMId
        )
        .maybeSingle();

      if (
        assignedFTMError
      ) {
        console.error(
          "ASSIGNED FTM LOAD ERROR",
          {
            assignedFTMId,
            message:
              assignedFTMError.message,
            details:
              assignedFTMError.details,
            hint:
              assignedFTMError.hint,
            code:
              assignedFTMError.code,
          }
        );

        setAssignedFTMName(
          "Unknown FTM"
        );
      } else if (
        !assignedFTMProfile
      ) {
        console.warn(
          "ASSIGNED FTM PROFILE NOT FOUND",
          {
            assignedFTMId,
          }
        );

        setAssignedFTMName(
          "Unknown FTM"
        );
      } else if (
        assignedFTMProfile.id !==
        assignedFTMId
      ) {
        console.error(
          "ASSIGNED FTM PROFILE MISMATCH",
          {
            expected:
              assignedFTMId,
            received:
              assignedFTMProfile.id,
          }
        );

        setAssignedFTMName(
          "Unknown FTM"
        );
      } else {
        const ftmRank =
          assignedFTMProfile.rank?.trim() ||
          "";

        const ftmName =
          assignedFTMProfile.name?.trim() ||
          "Unknown FTM";

        const ftmBadge =
          assignedFTMProfile.badge_number
            ?.trim() ||
          "";

        const ftmDetails = [
          ftmRank,
          ftmName,
          ftmBadge
            ? `#${ftmBadge}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");

        setAssignedFTMName(
          ftmDetails
        );
      }
    } else {
      setAssignedFTMName(
        "Unassigned"
      );
    }

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
        .eq(
          "status",
          "submitted"
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
    officerName: string,
    officerRank: string,
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

    return `I, [b]${traineeRank} ${traineeName}[/b] conducted an unguided patrol with [b]${officerRank} ${officerName}[/b] on ${formatDate(date)}, ${time}`;
  }

  async function saveUnguidedPatrol() {
    if (!trainee) {
      return;
    }

    const officerName =
      accompanyingOfficerName.trim();

    const officerRank =
      accompanyingOfficerRank.trim();

    if (!officerName) {
      setUnguidedError(
        "Enter the accompanying officer's name."
      );
      return;
    }

    if (!officerRank) {
      setUnguidedError(
        "Enter the accompanying officer's rank."
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
        officerName,
        officerRank,
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
              null,

            supervising_officer_name:
              officerName,

            supervising_officer_rank:
              officerRank,

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
                      null,

                    supervising_officer_name:
                      officerName,

                    supervising_officer_rank:
                      officerRank,

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

      setAccompanyingOfficerName("");
      setAccompanyingOfficerRank("");
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

  async function completeMandatoryCourse(
    item: NotebookItem
  ) {
    if (
      !trainee ||
      user?.id !==
        trainee.profile_id
    ) {
      setCourseError(
        "Only the probationary officer can submit their own temporary course evidence."
      );
      return;
    }

    const evidence =
      courseEvidence[item.id] ?? {
        date: "",
        link: "",
      };

    const completionDate =
      evidence.date.trim();

    const evidenceLink =
      evidence.link.trim();

    if (!completionDate) {
      setCourseError(
        "Enter the date the course was completed."
      );
      return;
    }

    if (!evidenceLink) {
      setCourseError(
        "Enter the forum link for the completed course."
      );
      return;
    }

    if (
      !/^https?:\/\//i.test(
        evidenceLink
      )
    ) {
      setCourseError(
        "The forum evidence must be a complete http:// or https:// link."
      );
      return;
    }

    setSavingCourseItemId(
      item.id
    );
    setCourseError("");
    setCourseSuccess("");

    try {
      const {
        data,
      } = await auditAction({
        user,

        action:
          "SELF_COMPLETE_MANDATORY_COURSE",

        category:
          "Notebook",

        entityType:
          "notebook_item",

        entityId:
          item.id,

        targetName:
          profile?.name ||
          user.name ||
          "Unknown Officer",

        oldData: {
          completed:
            item.completed,
          completion_date:
            item.completion_date ??
            null,
          evidence_link:
            item.evidence_link ??
            null,
          completion_source:
            item.completion_source ??
            null,
        },

        newData: {
          completed: true,
          completion_date:
            completionDate,
          evidence_link:
            evidenceLink,
          completed_by:
            user.id,
          completion_source:
            "P1_SELF_SERVICE",
        },

        execute:
          async () => {
            const result =
              await supabase
                .from(
                  "notebook_items"
                )
                .update({
                  completed: true,
                  completion_date:
                    completionDate,
                  evidence_link:
                    evidenceLink,
                  completed_by:
                    user.id,
                  completion_source:
                    "P1_SELF_SERVICE",
                })
                .eq(
                  "id",
                  item.id
                )
                .eq(
                  "trainee_id",
                  trainee.id
                )
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

      setItems(
        (current) =>
          current.map(
            (currentItem) =>
              currentItem.id ===
              item.id
                ? {
                    ...currentItem,
                    ...data,
                  }
                : currentItem
          )
      );

      setCourseEvidence(
        (current) => {
          const next = {
            ...current,
          };

          delete next[item.id];

          return next;
        }
      );

      setCourseSuccess(
        `${item.item_label} has been marked complete.`
      );
    } catch (error) {
      console.error(
        "MANDATORY COURSE COMPLETION ERROR",
        error
      );

      setCourseError(
        error instanceof Error
          ? error.message
          : "The mandatory course could not be marked complete."
      );
    } finally {
      setSavingCourseItemId(
        null
      );
    }
  }

  function toggleHistoryItem(
    itemId: string
  ) {
    setOpenHistoryItems(
      (current) => ({
        ...current,
        [itemId]:
          !current[
            itemId
          ],
      })
    );
  }

  function getCompletionDOR(
    item: NotebookItem
  ) {
    if (
      item.completion_dor_id
    ) {
      return (
        dors.find(
          (dor) =>
            dor.id ===
            item.completion_dor_id
        ) ?? null
      );
    }

    if (
      item.completion_patrol_number
    ) {
      return (
        dors.find(
          (dor) =>
            dor.patrol_number ===
            item.completion_patrol_number
        ) ?? null
      );
    }

    return null;
  }

  function openCompletionDOR(
    item: NotebookItem
  ) {
    const dor =
      getCompletionDOR(
        item
      );

    if (!dor) {
      setDorError(
        "The DOR linked to this learning goal could not be found."
      );

      return;
    }

    setDorError("");
    setSelectedDOR(
      dor
    );
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
  user?.id === trainee?.profile_id;

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
              assignedFTMName
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
        <div style={sectionHeader}>
          <div>
            <h2
              style={{
                ...heading,
                marginBottom:
                  "6px",
              }}
            >
              Mandatory Requirements
            </h2>

            <p style={muted}>
              Temporary self-service completion is available for BFA and EVOC until the dedicated course systems are connected.
            </p>
          </div>

          <span style={countBadge}>
            {
              mandatoryItems.filter(
                (item) =>
                  item.completed
              ).length
            }
            /{mandatoryItems.length} COMPLETE
          </span>
        </div>

        {courseError && (
          <div
            style={{
              ...errorBox,
              marginBottom:
                "14px",
            }}
          >
            {courseError}
          </div>
        )}

        {courseSuccess && (
          <div
            style={{
              ...successBox,
              marginBottom:
                "14px",
            }}
          >
            {courseSuccess}
          </div>
        )}

        <div style={mandatoryCourseListStyle}>
          {mandatoryItems.length ===
          0 ? (
            <p style={muted}>
              No mandatory requirements found.
            </p>
          ) : (
            mandatoryItems.map(
              (item) => {
                const evidence =
                  courseEvidence[item.id] ?? {
                    date: "",
                    link: "",
                  };

                const canSelfComplete =
                  user?.id ===
                    trainee?.profile_id &&
                  !item.completed;

                return (
                  <div
                    key={item.id}
                    style={mandatoryCourseCardStyle}
                  >
                    <div style={mandatoryCourseHeaderStyle}>
                      <span
                        style={
                          item.completed
                            ? mandatoryCompleteIconStyle
                            : mandatoryPendingIconStyle
                        }
                      >
                        {item.completed
                          ? "✓"
                          : "○"}
                      </span>

                      <div>
                        <strong>
                          {item.item_label}
                        </strong>

                        <p style={mandatoryStatusTextStyle}>
                          {item.completed
                            ? "Completed"
                            : "Outstanding"}
                        </p>
                      </div>
                    </div>

                    {item.completed ? (
                      <div style={courseEvidenceSummaryStyle}>
                        {item.completion_date && (
                          <span>
                            Completed:{" "}
                            {formatDate(
                              item.completion_date
                            )}
                          </span>
                        )}

                        {item.evidence_link && (
                          <a
                            href={
                              item.evidence_link
                            }
                            target="_blank"
                            rel="noreferrer"
                            style={courseEvidenceLinkStyle}
                          >
                            Open forum evidence ↗
                          </a>
                        )}

                        {item.completion_source && (
                          <span>
                            Source:{" "}
                            {
                              item.completion_source
                            }
                          </span>
                        )}
                      </div>
                    ) : canSelfComplete ? (
                      <div style={courseFormStyle}>
                        <div>
                          <label style={formLabel}>
                            Completion Date
                          </label>

                          <input
                            type="date"
                            value={
                              evidence.date
                            }
                            onChange={(event) =>
                              setCourseEvidence(
                                (current) => ({
                                  ...current,
                                  [item.id]: {
                                    ...evidence,
                                    date:
                                      event.target.value,
                                  },
                                })
                              )
                            }
                            disabled={
                              savingCourseItemId ===
                              item.id
                            }
                            style={formInput}
                          />
                        </div>

                        <div>
                          <label style={formLabel}>
                            Forum Evidence Link
                          </label>

                          <input
                            type="url"
                            value={
                              evidence.link
                            }
                            onChange={(event) =>
                              setCourseEvidence(
                                (current) => ({
                                  ...current,
                                  [item.id]: {
                                    ...evidence,
                                    link:
                                      event.target.value,
                                  },
                                })
                              )
                            }
                            placeholder="https://..."
                            disabled={
                              savingCourseItemId ===
                              item.id
                            }
                            style={formInput}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void completeMandatoryCourse(
                              item
                            )
                          }
                          disabled={
                            savingCourseItemId ===
                            item.id
                          }
                          style={{
                            ...courseCompleteButtonStyle,
                            opacity:
                              savingCourseItemId ===
                              item.id
                                ? 0.65
                                : 1,
                          }}
                        >
                          {savingCourseItemId ===
                          item.id
                            ? "Saving..."
                            : `Mark ${
                                item.item_label.includes(
                                  "BFA"
                                )
                                  ? "BFA"
                                  : "EVOC"
                              } Complete`}
                        </button>
                      </div>
                    ) : (
                      <p style={muted}>
                        Awaiting course completion evidence from the probationary officer.
                      </p>
                    )}
                  </div>
                );
              }
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
                    ) => {
                      const completionDOR =
                        getCompletionDOR(
                          item
                        );

                      const completionDate =
                        item.completed_at ??
                        item.completion_date ??
                        completionDOR?.patrol_date ??
                        null;

                      const completingFTO =
                        completionDOR?.ftoName ??
                        (
                          item.completed_by
                            ? "Recorded officer"
                            : null
                        );

                      const hasHistory =
                        Boolean(
                          item.completion_evidence ||
                          item.completion_patrol_number ||
                          completionDate ||
                          completionDOR
                        );

                      const historyOpen =
                        Boolean(
                          openHistoryItems[
                            item.id
                          ]
                        );

                      const statusLabel =
                        item.completed
                          ? "Completed"
                          : "Outstanding";

                      return (
                        <div
                          key={
                            item.id
                          }
                          style={{
                            ...itemHistoryCardStyle,
                            ...(historyOpen
                              ? expandedItemCardStyle
                              : {}),
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              toggleHistoryItem(
                                item.id
                              )
                            }
                            aria-expanded={
                              historyOpen
                            }
                            style={
                              itemAccordionButtonStyle
                            }
                          >
                            <div style={itemHistoryTitleStyle}>
                              <span
                                style={{
                                  ...itemStatusIconStyle,
                                  ...(item.completed
                                    ? completedIconStyle
                                    : outstandingIconStyle),
                                }}
                              >
                                {item.completed
                                  ? "✓"
                                  : "○"}
                              </span>

                              <div style={itemTitleCopyStyle}>
                                <b>
                                  {
                                    item.item_label
                                  }
                                </b>

                                <span
                                  style={{
                                    ...itemStatusPillStyle,
                                    ...(item.completed
                                      ? completedStatusPillStyle
                                      : outstandingStatusPillStyle),
                                  }}
                                >
                                  {statusLabel}
                                </span>
                              </div>
                            </div>

                            <span style={itemChevronStyle}>
                              {historyOpen
                                ? "▲"
                                : "▼"}
                            </span>
                          </button>

                          {historyOpen && (
                            <div style={historyPanelStyle}>
                              {item.completed ? (
                                <>
                                  <div style={historyGridStyle}>
                                    <HistoryDetail
                                      label="Status"
                                      value="Completed"
                                    />

                                    <HistoryDetail
                                      label="Patrol"
                                      value={
                                        item.completion_patrol_number
                                          ? `Patrol ${item.completion_patrol_number}`
                                          : completionDOR
                                            ? `Patrol ${completionDOR.patrol_number}`
                                            : "Not recorded"
                                      }
                                    />

                                    <HistoryDetail
                                      label="Completed By"
                                      value={
                                        completingFTO ??
                                        "Not recorded"
                                      }
                                    />

                                    <HistoryDetail
                                      label="Completion Date"
                                      value={
                                        completionDate
                                          ? formatCompletionDate(
                                              completionDate
                                            )
                                          : "Not recorded"
                                      }
                                    />

                                    <HistoryDetail
                                      label="Source"
                                      value={
                                        item.completion_source ??
                                        (
                                          completionDOR
                                            ? "DOR"
                                            : "Notebook"
                                        )
                                      }
                                    />
                                  </div>

                                  <div style={historyEvidenceStyle}>
                                    <strong>
                                      Evidence
                                    </strong>

                                    <p style={historyEvidenceTextStyle}>
                                      {item.completion_evidence ??
                                        "No written evidence was recorded for this learning goal."}
                                    </p>
                                  </div>

                                  {completionDOR && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openCompletionDOR(
                                          item
                                        )
                                      }
                                      style={viewDORButtonStyle}
                                    >
                                      View DOR Patrol {completionDOR.patrol_number}
                                    </button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div style={historyGridStyle}>
                                    <HistoryDetail
                                      label="Status"
                                      value="Outstanding"
                                    />

                                    <HistoryDetail
                                      label="Section"
                                      value={
                                        item.section
                                      }
                                    />

                                    <HistoryDetail
                                      label="Completion"
                                      value="Not yet signed off"
                                    />
                                  </div>

                                  <div style={outstandingDetailStyle}>
                                    <strong>
                                      Learning Goal
                                    </strong>

                                    <p style={historyEvidenceTextStyle}>
                                      This learning goal remains outstanding. It can be assessed and completed from a submitted DOR when the probationary officer demonstrates the required standard.
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
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
                  Accompanying Officer Name
                </label>

                <input
                  type="text"
                  value={
                    accompanyingOfficerName
                  }
                  onChange={(event) =>
                    setAccompanyingOfficerName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Hayden Blackwood"
                  disabled={
                    savingUnguided
                  }
                  style={formInput}
                />
              </div>

              <div>
                <label style={formLabel}>
                  Accompanying Officer Rank
                </label>

                <input
                  type="text"
                  value={
                    accompanyingOfficerRank
                  }
                  onChange={(event) =>
                    setAccompanyingOfficerRank(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Police Officer III"
                  disabled={
                    savingUnguided
                  }
                  style={formInput}
                />
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

            {accompanyingOfficerName.trim() &&
              accompanyingOfficerRank.trim() &&
              unguidedDate &&
              unguidedTime && (
                <div style={previewBox}>
                  <strong>
                    BBCode Preview
                  </strong>

                  <p style={previewText}>
                    {buildUnguidedStatement(
                      accompanyingOfficerName.trim(),
                      accompanyingOfficerRank.trim(),
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

function HistoryDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={historyDetailStyle}>
      <span style={historyDetailLabelStyle}>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function formatCompletionDate(
  value: string
) {
  const date =
    value.includes("T")
      ? new Date(value)
      : new Date(
          `${value}T00:00:00Z`
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
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

const mandatoryCourseListStyle = {
  display: "grid",
  gap: "14px",
};

const mandatoryCourseCardStyle = {
  display: "grid",
  gap: "14px",
  padding: "18px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const mandatoryCourseHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const mandatoryCompleteIconStyle = {
  width: "28px",
  height: "28px",
  display: "grid",
  placeItems: "center",
  color: "#bbf7d0",
  background:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "999px",
  fontWeight: 900,
};

const mandatoryPendingIconStyle = {
  width: "28px",
  height: "28px",
  display: "grid",
  placeItems: "center",
  color: "#94a3b8",
  background: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "999px",
  fontWeight: 900,
};

const mandatoryStatusTextStyle = {
  margin: "4px 0 0",
  color: "#94a3b8",
  fontSize: "12px",
};

const courseFormStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  alignItems: "end",
  gap: "14px",
};

const courseCompleteButtonStyle = {
  padding: "12px 16px",
  color: "white",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const courseEvidenceSummaryStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "#cbd5e1",
  fontSize: "12px",
  flexWrap: "wrap" as const,
};

const courseEvidenceLinkStyle = {
  color: "#60a5fa",
  textDecoration: "none",
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

const itemHistoryCardStyle = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  marginTop: "10px",
  background: "#111827",
  border: "1px solid #253247",
  borderRadius: "8px",
};

const expandedItemCardStyle = {
  borderColor: "#3b82f6",
  boxShadow:
    "0 0 0 1px rgba(59, 130, 246, 0.15)",
};

const itemAccordionButtonStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  padding: 0,
  color: "white",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left" as const,
};

const itemHistoryTitleStyle = {
  display: "flex",
  gap: "13px",
  alignItems: "center",
  minWidth: 0,
};

const itemStatusIconStyle = {
  width: "30px",
  height: "30px",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  border: "1px solid",
  borderRadius: "999px",
  fontWeight: 900,
};

const completedIconStyle = {
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.42)",
  borderColor: "#16a34a",
};

const outstandingIconStyle = {
  color: "#cbd5e1",
  backgroundColor: "#172033",
  borderColor: "#475569",
};

const itemTitleCopyStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
  minWidth: 0,
};

const itemStatusPillStyle = {
  padding: "4px 8px",
  border: "1px solid",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
  whiteSpace: "nowrap" as const,
};

const completedStatusPillStyle = {
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  borderColor: "#166534",
};

const outstandingStatusPillStyle = {
  color: "#cbd5e1",
  backgroundColor: "#334155",
  borderColor: "#475569",
};

const itemChevronStyle = {
  color: "#93c5fd",
  fontSize: "12px",
  flexShrink: 0,
};

const historyPanelStyle = {
  display: "grid",
  gap: "14px",
  padding: "14px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
};

const historyGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const historyDetailStyle = {
  display: "grid",
  gap: "5px",
  padding: "10px",
  background: "#172033",
  borderRadius: "7px",
};

const historyDetailLabelStyle = {
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};

const historyEvidenceStyle = {
  display: "grid",
  gap: "7px",
};

const outstandingDetailStyle = {
  display: "grid",
  gap: "7px",
  padding: "14px",
  backgroundColor: "#172033",
  border: "1px solid #334155",
  borderRadius: "8px",
};

const historyEvidenceTextStyle = {
  margin: 0,
  color: "#cbd5e1",
  whiteSpace: "pre-wrap" as const,
  lineHeight: 1.55,
};

const viewDORButtonStyle = {
  justifySelf: "start",
  padding: "9px 13px",
  color: "white",
  background: "#2563eb",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontWeight: 800,
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