"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getTrainees } from "../lib/trainees";
import { supabase } from "../lib/supabase";
import { auditAction } from "../lib/auditAction";

import {
  generateOrientationBBCode,
  OrientationChecklist,
} from "../lib/generateOrientationBBCode";

type Props = {
  traineeId?: string;
  publicMode?: boolean;
};

type TraineeOption = {
  id: string;
  name: string;
  rank: string;
  badgeNumber: string;
  orientationCompleted: boolean;
};

type ChecklistKey =
  keyof OrientationChecklist;

type ChecklistAnswers =
  Record<
    ChecklistKey,
    boolean | null
  >;

type OrientationFormData = {
  probationaryOfficer: string;
  probationaryOfficerSerial: string;
  completingOfficer: string;
  completingOfficerSerial: string;
  patrolNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  incidentsTasks: string;
};

const checklistGroups: {
  title: string;
  ooc?: boolean;
  items: {
    key: ChecklistKey;
    label: string;
  }[];
}[] = [
  {
    title: "Administrative",
    items: [
      {
        key:
          "divisionalNotebookCreated",
        label:
          "1. Probationer's Divisional Notebook Created",
      },
    ],
  },
  {
    title: "Field",
    items: [
      {
        key:
          "uniformAndEquipmentChecks",
        label:
          "3. Uniform and Equipment Checks",
      },
      {
        key:
          "missionRowFamiliarisation",
        label:
          "4. Mission Row Familiarisation",
      },
      {
        key:
          "radioSetup",
        label:
          "5. Radio Setup",
      },
      {
        key:
          "vehicleChecks",
        label:
          "6. Vehicle Checks (ELS, Maintenance Forms etc.)",
      },
    ],
  },
  {
    title: "Out of Character",
    ooc: true,
    items: [
      {
        key:
          "teamspeakBinds",
        label:
          "7. TeamSpeak Binds (Central / TACs)",
      },
      {
        key:
          "vehicleSpawning",
        label:
          "8. Vehicle Spawning",
      },
      {
        key:
          "generalFactionCommands",
        label:
          "9. General Faction Commands",
      },
    ],
  },
];

const initialChecklist: ChecklistAnswers = {
  divisionalNotebookCreated: null,
  uniformAndEquipmentChecks: null,
  missionRowFamiliarisation: null,
  radioSetup: null,
  vehicleChecks: null,
  teamspeakBinds: null,
  vehicleSpawning: null,
  generalFactionCommands: null,
};

const initialFormData: OrientationFormData = {
  probationaryOfficer: "",
  probationaryOfficerSerial: "",
  completingOfficer: "",
  completingOfficerSerial: "",
  patrolNumber: "Orientation",
  date: "",
  startTime: "",
  endTime: "",
  duration: "",
  incidentsTasks: "",
};

function calculateDuration(
  startTime: string,
  endTime: string
) {
  if (
    !startTime ||
    !endTime
  ) {
    return "";
  }

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

  return `${String(
    hours
  ).padStart(
    2,
    "0"
  )}:${String(
    minutes
  ).padStart(
    2,
    "0"
  )}`;
}

export default function OrientationForm({
  traineeId,
  publicMode = false,
}: Props) {
  const [
    trainees,
    setTrainees,
  ] = useState<
    TraineeOption[]
  >([]);

  const [
    selectedTraineeId,
    setSelectedTraineeId,
  ] = useState("");

  const [
    officerId,
    setOfficerId,
  ] = useState("");

  const [
    formData,
    setFormData,
  ] = useState<
    OrientationFormData
  >(initialFormData);

  const [
    checklist,
    setChecklist,
  ] = useState<
    ChecklistAnswers
  >(initialChecklist);

  const [
    generatedBBCode,
    setGeneratedBBCode,
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
    formError,
    setFormError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    submissionComplete,
    setSubmissionComplete,
  ] = useState(false);


  useEffect(() => {
    if (publicMode) {
      const now =
        new Date();

      const year =
        now.getUTCFullYear();

      const month =
        String(
          now.getUTCMonth() +
            1
        ).padStart(
          2,
          "0"
        );

      const day =
        String(
          now.getUTCDate()
        ).padStart(
          2,
          "0"
        );

      setFormData(
        (current) => ({
          ...current,
          date:
            `${year}-${month}-${day}`,
        })
      );

      void loadPublicTrainees();
      return;
    }

    void loadInitialData();
  }, [publicMode]);

  useEffect(() => {
    if (
      !traineeId ||
      trainees.length === 0
    ) {
      return;
    }

    void selectTrainee(
      traineeId
    );
  }, [
    traineeId,
    trainees,
  ]);

  async function loadPublicTrainees() {
    setLoading(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          "/api/orientation",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const responseText =
        await response.text();

      let responseBody: any = {};

      if (responseText) {
        try {
          responseBody =
            JSON.parse(
              responseText
            );
        } catch {
          responseBody = {};
        }
      }

      if (!response.ok) {
        throw new Error(
          responseBody?.error ??
            `Eligible probationary officers could not be loaded. Server returned ${response.status}.`
        );
      }

      const rows =
        Array.isArray(
          responseBody?.trainees
        )
          ? responseBody.trainees
          : [];

      setTrainees(
        rows.map(
          (
            trainee: any
          ): TraineeOption => ({
            id:
              trainee.id,

            name:
              trainee.name ??
              "Unknown",

            rank:
              trainee.rank ??
              "Police Officer I",

            badgeNumber:
              trainee.badgeNumber ??
              trainee.badge_number ??
              "",

            orientationCompleted:
              false,
          })
        )
      );

    } catch (error) {
      console.error(
        "PUBLIC ORIENTATION TRAINEE LOAD ERROR",
        error
      );

      setTrainees([]);

      setFormError(
        error instanceof Error
          ? error.message
          : "Eligible probationary officers could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadInitialData() {
    setLoading(true);
    setFormError("");

    try {
      const [
        traineeRows,
        userResult,
        orientationResult,
      ] = await Promise.all([
        getTrainees(),

        supabase.auth.getUser(),

        supabase
          .from(
            "orientation_reports"
          )
          .select(
            "trainee_id"
          ),
      ]);

      if (
        userResult.error
      ) {
        throw userResult.error;
      }

      if (
        orientationResult.error
      ) {
        throw orientationResult.error;
      }

      const user =
        userResult.data.user;

      if (!user) {
        throw new Error(
          "No logged-in user was found."
        );
      }

      setOfficerId(
        user.id
      );

      const {
        data:
          officerProfile,
        error:
          officerProfileError,
      } = await supabase
        .from("profiles")
        .select(
          "name, badge_number"
        )
        .eq(
          "id",
          user.id
        )
        .single();

      if (
        officerProfileError
      ) {
        throw officerProfileError;
      }

      setFormData(
        (current) => ({
          ...current,
          completingOfficer:
            officerProfile?.name ??
            "",
          completingOfficerSerial:
            officerProfile
              ?.badge_number ??
            "",
        })
      );

      const orientedTraineeIds =
        new Set(
          (
            orientationResult.data ??
            []
          ).map(
            (record) =>
              record.trainee_id
          )
        );

      setTrainees(
        traineeRows.map(
          (
            trainee: any
          ): TraineeOption => ({
            id:
              trainee.id,

            name:
              trainee.profile
                ?.name ??
              trainee.name ??
              "Unknown",

            rank:
              trainee.profile
                ?.rank ??
              "Police Officer I",

            badgeNumber:
              trainee.profile
                ?.badge_number ??
              "",

            orientationCompleted:
              orientedTraineeIds.has(
                trainee.id
              ),
          })
        )
      );
    } catch (error) {
      console.error(
        "ORIENTATION INITIAL LOAD ERROR",
        error
      );

      setFormError(
        error instanceof Error
          ? error.message
          : "The orientation form could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function selectTrainee(
    id: string
  ) {
    setSelectedTraineeId(
      id
    );

    setFormError("");
    setSuccessMessage("");
    setGeneratedBBCode("");
    setChecklist({
      ...initialChecklist,
    });

    if (!id) {
      setFormData(
        (current) => ({
          ...current,
          probationaryOfficer:
            "",
          probationaryOfficerSerial:
            "",
          date: "",
          startTime: "",
          endTime: "",
          duration: "",
          incidentsTasks: "",
        })
      );

      return;
    }

    const trainee =
      trainees.find(
        (item) =>
          item.id === id
      );

    if (!trainee) {
      return;
    }

    if (
      trainee.orientationCompleted
    ) {
      setFormError(
        "This probationary officer already has an orientation report."
      );

      return;
    }

    setFormData(
      (current) => ({
        ...current,
        probationaryOfficer:
          trainee.name,
        probationaryOfficerSerial:
          trainee.badgeNumber,
        date:
          publicMode
            ? current.date
            : "",
        startTime: "",
        endTime: "",
        duration: "",
        incidentsTasks: "",
      })
    );
  }

  function updateField(
    field:
      keyof OrientationFormData,
    value: string
  ) {
    setFormError("");
    setSuccessMessage("");

    setFormData(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function updateTime(
    field:
      | "startTime"
      | "endTime",
    value: string
  ) {
    setFormError("");
    setSuccessMessage("");

    setFormData(
      (current) => {
        const updated = {
          ...current,
          [field]: value,
        };

        return {
          ...updated,
          duration:
            calculateDuration(
              updated.startTime,
              updated.endTime
            ),
        };
      }
    );
  }

  function setChecklistAnswer(
    key: ChecklistKey,
    value: boolean
  ) {
    setFormError("");
    setSuccessMessage("");

    setChecklist(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  function useCurrentUTCDateAndTime() {
    const now =
      new Date();

    const year =
      now.getUTCFullYear();

    const month =
      String(
        now.getUTCMonth() +
          1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        now.getUTCDate()
      ).padStart(
        2,
        "0"
      );

    const hours =
      String(
        now.getUTCHours()
      ).padStart(
        2,
        "0"
      );

    const minutes =
      String(
        now.getUTCMinutes()
      ).padStart(
        2,
        "0"
      );

    setFormData(
      (current) => ({
        ...current,
        date:
          `${year}-${month}-${day}`,
        startTime:
          `${hours}:${minutes}`,
        endTime: "",
        duration: "",
      })
    );

    setFormError("");
    setSuccessMessage("");
  }

  function validateForm() {
    const missingItems:
      string[] = [];

    if (
      !selectedTraineeId
    ) {
      missingItems.push(
        "Probationary officer"
      );
    }

    const selectedTrainee =
      trainees.find(
        (item) =>
          item.id ===
          selectedTraineeId
      );

    if (
      selectedTrainee
        ?.orientationCompleted
    ) {
      missingItems.push(
        "A probationary officer without an existing orientation report"
      );
    }

    if (
      !publicMode &&
      !officerId
    ) {
      missingItems.push(
        "Logged-in officer account"
      );
    }

    if (
      !formData
        .completingOfficer
        .trim()
    ) {
      missingItems.push(
        "Completing officer name"
      );
    }

    if (
      !formData
        .completingOfficerSerial
        .trim()
    ) {
      missingItems.push(
        "Completing officer serial number"
      );
    }

    if (!formData.date) {
      missingItems.push(
        "Orientation date"
      );
    }

    if (
      !formData.startTime
    ) {
      missingItems.push(
        "Start time"
      );
    }

    if (!formData.endTime) {
      missingItems.push(
        "End time"
      );
    }

    if (
      !formData.duration
    ) {
      missingItems.push(
        "Calculated duration"
      );
    }

    if (
      !formData
        .incidentsTasks
        .trim()
    ) {
      missingItems.push(
        "Incidents / tasks"
      );
    }

    checklistGroups.forEach(
      (group) => {
        group.items.forEach(
          (item) => {
            if (
              checklist[
                item.key
              ] === null
            ) {
              missingItems.push(
                `Checklist: ${item.label}`
              );
            }
          }
        );
      }
    );

    if (
      missingItems.length ===
      0
    ) {
      return "";
    }

    return (
      "Please complete the following before submitting:\n\n" +
      missingItems
        .map(
          (item) =>
            `• ${item}`
        )
        .join("\n")
    );
  }

  async function submitOrientation(
    event: FormEvent
  ) {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setFormError(
        validationError
      );
      setSuccessMessage("");
      setGeneratedBBCode("");

      return;
    }

    setSaving(true);
    setFormError("");
    setSuccessMessage("");

    const completedChecklist =
      checklist as OrientationChecklist;

    const bbcode =
      generateOrientationBBCode({
        probationaryOfficer:
          formData.probationaryOfficer,

        probationaryOfficerSerial:
          formData.probationaryOfficerSerial,

        completingOfficer:
          formData.completingOfficer,

        completingOfficerSerial:
          formData.completingOfficerSerial,

        patrolNumber:
          formData.patrolNumber,

        date:
          formData.date,

        time:
          `${formData.startTime} - ${formData.endTime}`,

        duration:
          formData.duration,

        checklist:
          completedChecklist,

        incidentsTasks:
          formData.incidentsTasks,
      });

    const auditUser = {
      id:
        officerId,
      name:
        formData.completingOfficer,
      role:
        null,
    };

    let submittedBBCode =
      bbcode;

    try {
      if (publicMode) {
        const response =
          await fetch(
            "/api/orientation",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  traineeId:
                    selectedTraineeId,

                  probationaryOfficer:
                    formData.probationaryOfficer,

                  probationaryOfficerSerial:
                    formData.probationaryOfficerSerial,

                  completingOfficer:
                    formData.completingOfficer.trim(),

                  completingOfficerSerial:
                    formData.completingOfficerSerial.trim(),

                  patrolNumber:
                    formData.patrolNumber,

                  date:
                    formData.date,

                  startTime:
                    formData.startTime,

                  endTime:
                    formData.endTime,

                  duration:
                    formData.duration,

                  checklist:
                    completedChecklist,

                  incidentsTasks:
                    formData.incidentsTasks.trim(),
                }),
            }
          );

        const responseText =
          await response.text();

        let responseBody: any = {};

        if (responseText) {
          try {
            responseBody =
              JSON.parse(
                responseText
              );
          } catch {
            responseBody = {};
          }
        }

        if (!response.ok) {
          const publicError =
            new Error(
              responseBody?.error ??
                `The orientation report could not be saved. Server returned ${response.status}.`
            ) as Error & {
              code?: string;
            };

          publicError.code =
            responseBody?.code;

          throw publicError;
        }

        const publicBBCode =
          responseBody?.bbcode ??
          bbcode;

        submittedBBCode =
          publicBBCode;

        setGeneratedBBCode(
          publicBBCode
        );
      } else {
        const {
          data,
        } = await auditAction({
        user:
          auditUser,

        action:
          "SUBMIT_ORIENTATION_REPORT",

        category:
          "Orientations",

        entityType:
          "trainee",

        entityId:
          selectedTraineeId,

        targetName:
          formData.probationaryOfficer,

        newData: {
          trainee_id:
            selectedTraineeId,

          completing_officer_id:
            officerId,

          completing_officer_name:
            formData.completingOfficer,

          completing_officer_badge:
            formData.completingOfficerSerial,

          patrol_date:
            formData.date,

          start_time:
            formData.startTime,

          end_time:
            formData.endTime,

          duration:
            formData.duration,

          checklist:
            completedChecklist,

          incidents_tasks:
            formData.incidentsTasks.trim(),
        },

        execute:
          async () => {
            const result =
              await supabase
                .from(
                  "orientation_reports"
                )
                .insert({
                  trainee_id:
                    selectedTraineeId,

                  completing_officer_id:
                    officerId,

                  completing_officer_name:
                    formData.completingOfficer.trim(),

                  completing_officer_badge:
                    formData.completingOfficerSerial.trim(),

                  patrol_date:
                    formData.date,

                  start_time:
                    formData.startTime,

                  end_time:
                    formData.endTime,

                  duration:
                    formData.duration,

                  checklist:
                    completedChecklist,

                  incidents_tasks:
                    formData.incidentsTasks.trim(),

                  bbcode,

                  created_by:
                    officerId,
                })
                .select(
                  "id"
                )
                .single();

            if (
              result.error
            ) {
              throw result.error;
            }

            return result;
          },
        });

        void data;

        setGeneratedBBCode(
          bbcode
        );
      }

      const finalBBCode =
        submittedBBCode;

      if (
        publicMode &&
        finalBBCode
      ) {
        try {
          await navigator.clipboard.writeText(
            finalBBCode
          );

          setCopied(true);
        } catch (copyError) {
          console.error(
            "AUTO COPY ORIENTATION BBCODE ERROR",
            copyError
          );
        }

        setSubmissionComplete(
          true
        );
      }

      setSuccessMessage(
        publicMode
          ? "Orientation report submitted successfully."
          : "Orientation report saved successfully. The BBCode is ready to copy below."
      );

      setTrainees(
        (current) =>
          current.map(
            (trainee) =>
              trainee.id ===
              selectedTraineeId
                ? {
                    ...trainee,
                    orientationCompleted:
                      true,
                  }
                : trainee
          )
      );

    } catch (error: any) {
      console.error(
        "SAVE ORIENTATION REPORT ERROR",
        error
      );

      if (
        error?.code ===
        "23505"
      ) {
        setFormError(
          "This probationary officer already has an orientation report."
        );
      } else {
        setFormError(
          error?.message ??
            "The orientation report could not be saved."
        );
      }

      setGeneratedBBCode("");
    } finally {
      setSaving(false);
    }
  }

  async function copyBBCode() {
    if (
      !generatedBBCode
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        generatedBBCode
      );

      setCopied(true);

      setTimeout(
        () => {
          setCopied(false);
        },
        2000
      );
    } catch (error) {
      console.error(
        "COPY ORIENTATION BBCODE ERROR",
        error
      );

      setFormError(
        "The orientation BBCode could not be copied."
      );
    }
  }

  function clearForm() {
    setSelectedTraineeId(
      ""
    );

    setChecklist({
      ...initialChecklist,
    });

    setFormData(
      (current) => ({
        ...initialFormData,
        completingOfficer:
          publicMode
            ? ""
            : current.completingOfficer,
        completingOfficerSerial:
          publicMode
            ? ""
            : current.completingOfficerSerial,
      })
    );

    setGeneratedBBCode("");
    setFormError("");
    setSuccessMessage("");
    setCopied(false);
  }

  function submitAnotherReport() {
    const now =
      new Date();

    const year =
      now.getUTCFullYear();

    const month =
      String(
        now.getUTCMonth() +
          1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        now.getUTCDate()
      ).padStart(
        2,
        "0"
      );

    setSelectedTraineeId(
      ""
    );

    setChecklist({
      ...initialChecklist,
    });

    setFormData({
      ...initialFormData,
      date:
        `${year}-${month}-${day}`,
    });

    setGeneratedBBCode("");
    setFormError("");
    setSuccessMessage("");
    setCopied(false);
    setSubmissionComplete(
      false
    );

    void loadPublicTrainees();
  }

  if (loading) {
    return (
      <p>
        Loading orientation form...
      </p>
    );
  }

  const answeredCount =
    Object.values(
      checklist
    ).filter(
      (answer) =>
        answer !== null
    ).length;

  const totalChecklistItems =
    Object.keys(
      checklist
    ).length;

  return (
    <div>
      <div style={pageHeaderStyle}>
        <p style={eyebrowStyle}>
          PROBATIONARY OFFICER
        </p>

        <h2 style={pageTitleStyle}>
          Introductory and Orientation Report
        </h2>

        <p style={pageSubtitleStyle}>
          {publicMode
            ? "Submit an introductory and orientation report without signing into the FTP portal."
            : "Complete this report before the probationary officer begins normal DOR patrols."}
        </p>
      </div>

      <form
        onSubmit={
          submitOrientation
        }
        style={formStyle}
      >
        {publicMode && (
          <div style={cardStyle}>
            <h3 style={headingStyle}>
              Public Orientation Submission
            </h3>

            <p style={helperTextStyle}>
              This form is for officers completing an Orientation Patrol who do not have an FTP Portal account.
            </p>
          </div>
        )}

        <div style={cardStyle}>
          <h3 style={headingStyle}>
            Officer Information
          </h3>

          <label style={labelStyle}>
            Probationary Officer
          </label>

          <select
            value={
              selectedTraineeId
            }
            onChange={(event) =>
              void selectTrainee(
                event.target.value
              )
            }
            disabled={
              saving ||
              loading
            }
            style={{
              ...inputStyle,
              marginBottom:
                "20px",
            }}
          >
            <option value="">
              Select Probationary Officer
            </option>

            {trainees.map(
              (trainee) => (
                <option
                  key={trainee.id}
                  value={trainee.id}
                  disabled={
                    trainee.orientationCompleted
                  }
                >
                  {trainee.name}
                  {trainee.orientationCompleted
                    ? " — Orientation Complete"
                    : ""}
                </option>
              )
            )}
          </select>

          <div style={gridStyle}>
            <Field
              label="Probationary Officer"
              value={
                formData.probationaryOfficer
              }
            />

            <Field
              label="P1 Serial Number"
              value={
                formData.probationaryOfficerSerial
              }
            />

            {publicMode ? (
              <div>
                <label style={labelStyle}>
                  Completing Officer
                </label>

                <input
                  value={
                    formData.completingOfficer
                  }
                  onChange={(event) =>
                    updateField(
                      "completingOfficer",
                      event.target.value
                    )
                  }
                  disabled={saving}
                  style={inputStyle}
                />
              </div>
            ) : (
              <Field
                label="Completing Officer"
                value={
                  formData.completingOfficer
                }
              />
            )}

            {publicMode ? (
              <div>
                <label style={labelStyle}>
                  Officer Serial Number
                </label>

                <input
                  value={
                    formData.completingOfficerSerial
                  }
                  onChange={(event) =>
                    updateField(
                      "completingOfficerSerial",
                      event.target.value
                    )
                  }
                  disabled={saving}
                  style={inputStyle}
                />
              </div>
            ) : (
              <Field
                label="Officer Serial Number"
                value={
                  formData.completingOfficerSerial
                }
              />
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <h3
              style={{
                ...headingStyle,
                marginBottom: 0,
              }}
            >
              Orientation Details
            </h3>

            <button
              type="button"
              onClick={
                useCurrentUTCDateAndTime
              }
              disabled={saving}
              style={secondaryButtonStyle}
            >
              Use Current UTC Date &amp; Time
            </button>
          </div>

          <div
            style={{
              ...gridStyle,
              marginTop: "20px",
            }}
          >
            {!publicMode && (
              <Field
                label="Patrol Number"
                value={
                  formData.patrolNumber
                }
              />
            )}

            <div>
              <label style={labelStyle}>
                Date
              </label>

              <input
                type="date"
                value={
                  formData.date
                }
                onChange={(event) =>
                  updateField(
                    "date",
                    event.target.value
                  )
                }
                disabled={saving}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Start Time (UTC)
              </label>

              <input
                type="time"
                value={
                  formData.startTime
                }
                onChange={(event) =>
                  updateTime(
                    "startTime",
                    event.target.value
                  )
                }
                disabled={saving}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                End Time (UTC)
              </label>

              <input
                type="time"
                value={
                  formData.endTime
                }
                onChange={(event) =>
                  updateTime(
                    "endTime",
                    event.target.value
                  )
                }
                disabled={saving}
                style={inputStyle}
              />
            </div>

            <Field
              label="Calculated Duration"
              value={
                formData.duration
              }
            />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h3
                style={{
                  ...headingStyle,
                  marginBottom:
                    "6px",
                }}
              >
                Orientation Checklist
              </h3>

              <p style={helperTextStyle}>
                Every item requires a Yes or No answer.
              </p>
            </div>

            <span style={countBadgeStyle}>
              {answeredCount}/
              {totalChecklistItems} answered
            </span>
          </div>

          <div style={checklistGroupsStyle}>
            {checklistGroups.map(
              (group) => (
                <section
                  key={group.title}
                  style={checklistGroupStyle}
                >
                  <h4
                    style={{
                      ...checklistGroupTitleStyle,
                      color:
                        group.ooc
                          ? "#fbbf24"
                          : "#93c5fd",
                    }}
                  >
                    {group.title}
                  </h4>

                  <div style={checklistItemsStyle}>
                    {group.items.map(
                      (item) => (
                        <div
                          key={item.key}
                          style={checklistItemStyle}
                        >
                          <span style={checklistLabelStyle}>
                            {item.label}
                          </span>

                          <div style={answerButtonsStyle}>
                            <button
                              type="button"
                              onClick={() =>
                                setChecklistAnswer(
                                  item.key,
                                  true
                                )
                              }
                              disabled={saving}
                              style={{
                                ...answerButtonStyle,
                                ...(checklist[
                                  item.key
                                ] === true
                                  ? yesSelectedStyle
                                  : answerUnselectedStyle),
                              }}
                            >
                              ✓ Yes
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setChecklistAnswer(
                                  item.key,
                                  false
                                )
                              }
                              disabled={saving}
                              style={{
                                ...answerButtonStyle,
                                ...(checklist[
                                  item.key
                                ] === false
                                  ? noSelectedStyle
                                  : answerUnselectedStyle),
                              }}
                            >
                              ✕ No
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>
            Incidents / Tasks
          </h3>

          <p style={helperTextStyle}>
            Enter one incident or task per line. Each line becomes a separate BBCode list item.
          </p>

          <textarea
            value={
              formData.incidentsTasks
            }
            onChange={(event) =>
              updateField(
                "incidentsTasks",
                event.target.value
              )
            }
            disabled={saving}
            placeholder={
              "Introduced probationer to Mission Row procedures\nCompleted vehicle and equipment checks"
            }
            style={textareaStyle}
          />
        </div>

        {formError && (
          <div style={validationBoxStyle}>
            {formError}
          </div>
        )}

        {successMessage && (
          <div style={successBoxStyle}>
            <strong>
              {publicMode
                ? "Orientation Report Submitted"
                : successMessage}
            </strong>

            {publicMode && (
              <p
                style={{
                  margin:
                    "8px 0 0",
                }}
              >
                The BBCode has been copied to your clipboard. You can copy it again below if required.
              </p>
            )}
          </div>
        )}

        {publicMode &&
        submissionComplete ? (
          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={() =>
                void copyBBCode()
              }
              style={copyButtonStyle}
            >
              {copied
                ? "Copied!"
                : "Copy Again"}
            </button>

            <button
              type="button"
              onClick={
                submitAnotherReport
              }
              style={primaryButtonStyle}
            >
              Submit Another Report
            </button>
          </div>
        ) : (
          <div style={buttonRowStyle}>
            <button
              type="button"
              onClick={clearForm}
              disabled={saving}
              style={secondaryButtonStyle}
            >
              Clear Form
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...primaryButtonStyle,
                opacity:
                  saving
                    ? 0.65
                    : 1,
                cursor:
                  saving
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {saving
                ? "Submitting Orientation..."
                : "Submit Orientation & Generate BBCode"}
            </button>
          </div>
        )}
      </form>

      {generatedBBCode && (
        <div
          style={{
            ...cardStyle,
            marginTop: "22px",
          }}
        >
          <div style={sectionHeaderStyle}>
            <div>
              <h3
                style={{
                  ...headingStyle,
                  marginBottom:
                    "6px",
                }}
              >
                Generated BBCode
              </h3>

              <p style={helperTextStyle}>
                Copy this into the probationary officer's forum file.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void copyBBCode()
              }
              style={copyButtonStyle}
            >
              {copied
                ? "Copied!"
                : "Copy BBCode"}
            </button>
          </div>

          <textarea
            value={
              generatedBBCode
            }
            readOnly
            style={{
              ...textareaStyle,
              minHeight:
                "520px",
              marginTop:
                "18px",
              fontFamily:
                "monospace",
            }}
          />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        value={value}
        readOnly
        style={readOnlyInputStyle}
      />
    </div>
  );
}

const pageHeaderStyle = {
  marginBottom: "24px",
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const pageTitleStyle = {
  margin: "0 0 8px",
};

const pageSubtitleStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.55,
};

const formStyle = {
  display: "grid",
  gap: "20px",
};

const cardStyle = {
  padding: "24px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const headingStyle = {
  marginTop: 0,
  marginBottom: "20px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap" as const,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const readOnlyInputStyle = {
  ...inputStyle,
  color: "#cbd5e1",
  backgroundColor: "#172033",
  cursor: "default",
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  minHeight: "150px",
  padding: "12px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
};

const helperTextStyle = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: 1.5,
};

const countBadgeStyle = {
  padding: "6px 10px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.18)",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const checklistGroupsStyle = {
  display: "grid",
  gap: "18px",
  marginTop: "20px",
};

const checklistGroupStyle = {
  overflow: "hidden",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const checklistGroupTitleStyle = {
  margin: 0,
  padding: "13px 16px",
  backgroundColor: "#111827",
  borderBottom: "1px solid #334155",
  fontSize: "13px",
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};

const checklistItemsStyle = {
  display: "grid",
};

const checklistItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "14px 16px",
  borderBottom: "1px solid #26354b",
  flexWrap: "wrap" as const,
};

const checklistLabelStyle = {
  flex: 1,
  minWidth: "240px",
  lineHeight: 1.45,
};

const answerButtonsStyle = {
  display: "flex",
  gap: "8px",
};

const answerButtonStyle = {
  minWidth: "78px",
  padding: "9px 12px",
  border: "1px solid",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const answerUnselectedStyle = {
  color: "#cbd5e1",
  backgroundColor: "#172033",
  borderColor: "#475569",
};

const yesSelectedStyle = {
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.42)",
  borderColor: "#16a34a",
};

const noSelectedStyle = {
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.42)",
  borderColor: "#dc2626",
};

const buttonRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const primaryButtonStyle = {
  padding: "13px 18px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "8px",
  fontWeight: 800,
};

const secondaryButtonStyle = {
  padding: "11px 15px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const copyButtonStyle = {
  padding: "10px 15px",
  color: "white",
  backgroundColor: "#16a34a",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const validationBoxStyle = {
  padding: "16px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  lineHeight: 1.6,
  whiteSpace: "pre-line" as const,
};

const successBoxStyle = {
  padding: "14px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
};