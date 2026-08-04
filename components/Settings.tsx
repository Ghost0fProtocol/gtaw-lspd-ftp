"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import { auditAction } from "../lib/auditAction";

import {
  formatMinutes,
  parseFTOFile,
  ParsedFTOFile,
} from "../lib/parseFTOFile";

const ranks = [
  "Police Officer I",
  "Police Officer II",
  "Police Officer III",
  "Police Officer III (DT)",
  "Police Officer III+I",
  "Sergeant I",
  "Sergeant II",
  "Lieutenant I",
  "Lieutenant II",
  "Captain I",
  "Captain II",
  "Captain III",
  "Deputy Chief of Police",
  "Assistant Chief of Police",
  "Chief of Police",
];

const divisions = [
  "Mission Row Division",
  "Traffic Division",
  "Detectives Bureau",
  "Gang Enforcement Division",
  "Metropolitan Division",
  "Field Training Program",
  "Air Support Division",
];

const ftoFileRoles = [
  "Field Training Officer",
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

export default function Settings({
  user,
  onUpdate,
}: {
  user: any;
  onUpdate: (user: any) => void;
}) {
  const [
    name,
    setName,
  ] = useState(
    user.name || ""
  );

  const [
    badge,
    setBadge,
  ] = useState(
    user.badge_number || ""
  );

  const [
    workNumber,
    setWorkNumber,
  ] = useState(
    user.work_number || ""
  );

  const [
    rank,
    setRank,
  ] = useState(
    user.rank ||
      "Police Officer I"
  );

  const [
    division,
    setDivision,
  ] = useState(
    divisions.includes(
      user.division
    )
      ? user.division
      : "Mission Row Division"
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    importBBCode,
    setImportBBCode,
  ] = useState("");

  const [
    parsedPreview,
    setParsedPreview,
  ] = useState<
    ParsedFTOFile | null
  >(null);

  const [
    importMessage,
    setImportMessage,
  ] = useState("");

  const [
    importing,
    setImporting,
  ] = useState(false);

  const [
    importModalOpen,
    setImportModalOpen,
  ] = useState(false);

  const [availabilityWindows, setAvailabilityWindows] = useState([
    {
      start_time: "",
      end_time: "",
    },
  ]);

  const [availableForP1s, setAvailableForP1s] = useState(false);
  const [maxP1s, setMaxP1s] = useState(4);

  const [
    initialAvailabilityWindows,
    setInitialAvailabilityWindows,
  ] = useState<
    Array<{
      start_time: string;
      end_time: string;
    }>
  >([]);

  const [
    initialAvailableForP1s,
    setInitialAvailableForP1s,
  ] = useState(false);

  const [
    initialMaxP1s,
    setInitialMaxP1s,
  ] = useState(4);

  const [ftpToolTab, setFtpToolTab] =
    useState<"availability" | "import">("availability");

  const canImportFTOFile =
    ftoFileRoles.includes(
      user.role
    );

  const isProbationaryOfficer =
    user.role ===
    "Probationary Officer";

  const previewHasBlockingErrors =
    useMemo(() => {
      if (!parsedPreview) {
        return true;
      }

      return (
        !parsedPreview.officerName ||
        !parsedPreview.serialNumber ||
        parsedPreview.entries.length ===
          0
      );
    }, [parsedPreview]);

  useEffect(() => {
    async function loadFTPSettings() {
      const {
        data: availability,
        error: availabilityError,
      } = await supabase
        .from("ftp_availability_windows")
        .select("*")
        .eq("profile_id", user.id);

      if (availabilityError) {
        console.error(
          "LOAD AVAILABILITY ERROR",
          availabilityError
        );
      }

      const loadedWindows =
        availability?.length
          ? availability.map((item) => ({
              start_time:
                item.start_time.slice(0, 5),
              end_time:
                item.end_time.slice(0, 5),
            }))
          : [
              {
                start_time: "",
                end_time: "",
              },
            ];

      setAvailabilityWindows(
        loadedWindows
      );

      setInitialAvailabilityWindows(
        loadedWindows.filter(
          (window) =>
            window.start_time &&
            window.end_time
        )
      );

      const {
        data: supervision,
        error: supervisionError,
      } = await supabase
        .from("ftp_supervision_preferences")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (supervisionError) {
        console.error(
          "LOAD SUPERVISION SETTINGS ERROR",
          supervisionError
        );
      }

      if (supervision) {
        const loadedAvailable =
          Boolean(
            supervision.available_for_p1s
          );

        const loadedMaximum =
          supervision.max_active_p1s ??
          4;

        setAvailableForP1s(
          loadedAvailable
        );

        setMaxP1s(
          loadedMaximum
        );

        setInitialAvailableForP1s(
          loadedAvailable
        );

        setInitialMaxP1s(
          loadedMaximum
        );
      } else {
        setInitialAvailableForP1s(
          false
        );

        setInitialMaxP1s(
          4
        );
      }
    }

    void loadFTPSettings();
  }, [user.id]);

  function updateAvailabilityWindow(index: number, field: "start_time" | "end_time", value: string) {
    setAvailabilityWindows((current) =>
      current.map((window, i) =>
        i === index ? { ...window, [field]: value } : window
      )
    );
  }

  function addAvailabilityWindow() {
    setAvailabilityWindows((current) => [
      ...current,
      { start_time: "", end_time: "" },
    ]);
  }

  function removeAvailabilityWindow(index: number) {
    setAvailabilityWindows((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function save() {
    setMessage("");
    setSavingProfile(true);

    const validWindows =
      availabilityWindows.filter(
        (window) =>
          window.start_time &&
          window.end_time
      );

    const nextRank =
      isProbationaryOfficer
        ? "Police Officer I"
        : rank;

    const nextDivision =
      isProbationaryOfficer
        ? "Mission Row Division"
        : division;

    const cappedMaxP1s =
      Math.min(
        Math.max(maxP1s, 1),
        4
      );

    const supervisionEnabled =
      [
        "Field Training Manager",
        "Field Training Supervisor",
        "STAFF",
      ].includes(user.role);

    try {
      const saveResult =
        await auditAction({
          user,

          action:
            "UPDATE_SETTINGS",

          category:
            "Settings",

          entityType:
            "profile",

          entityId:
            user.id,

          targetName:
            name.trim() ||
            user.name ||
            "Unknown Officer",

          oldData: {
            profile: {
              name:
                user.name ??
                null,
              badge_number:
                user.badge_number ??
                null,
              work_number:
                user.work_number ??
                null,
              rank:
                user.rank ??
                null,
              division:
                user.division ??
                null,
            },

            availability_windows:
              initialAvailabilityWindows,

            supervision_preferences:
              supervisionEnabled
                ? {
                    available_for_p1s:
                      initialAvailableForP1s,

                    max_active_p1s:
                      initialMaxP1s,
                  }
                : null,
          },

          newData: {
            profile: {
              name:
                name.trim(),

              badge_number:
                badge.trim(),

              work_number:
                workNumber.trim(),

              rank:
                nextRank,

              division:
                nextDivision,
            },

            availability_windows:
              validWindows,

            supervision_preferences:
              supervisionEnabled
                ? {
                    available_for_p1s:
                      availableForP1s,

                    max_active_p1s:
                      cappedMaxP1s,
                  }
                : null,
          },

          execute: async () => {
            const {
              data:
                updatedProfile,
              error:
                profileError,
            } = await supabase
              .from("profiles")
              .update({
                name:
                  name.trim(),

                badge_number:
                  badge.trim(),

                work_number:
                  workNumber.trim(),

                rank:
                  nextRank,

                division:
                  nextDivision,
              })
              .eq(
                "id",
                user.id
              )
              .select()
              .single();

            if (profileError) {
              throw profileError;
            }

            const {
              error:
                deleteError,
            } = await supabase
              .from(
                "ftp_availability_windows"
              )
              .delete()
              .eq(
                "profile_id",
                user.id
              );

            if (deleteError) {
              throw deleteError;
            }

            let savedWindows:
              Array<{
                start_time: string;
                end_time: string;
              }> = [];

            if (
              validWindows.length
            ) {
              const {
                data:
                  insertedWindows,
                error:
                  insertError,
              } = await supabase
                .from(
                  "ftp_availability_windows"
                )
                .insert(
                  validWindows.map(
                    (window) => ({
                      profile_id:
                        user.id,

                      start_time:
                        window.start_time,

                      end_time:
                        window.end_time,
                    })
                  )
                )
                .select();

              if (insertError) {
                throw insertError;
              }

              savedWindows =
                (
                  insertedWindows ??
                  []
                ).map(
                  (window) => ({
                    start_time:
                      window.start_time.slice(
                        0,
                        5
                      ),

                    end_time:
                      window.end_time.slice(
                        0,
                        5
                      ),
                  })
                );
            }

            if (
              supervisionEnabled
            ) {
              const {
                error:
                  supervisionError,
              } = await supabase
                .from(
                  "ftp_supervision_preferences"
                )
                .upsert({
                  profile_id:
                    user.id,

                  available_for_p1s:
                    availableForP1s,

                  max_active_p1s:
                    cappedMaxP1s,
                });

              if (
                supervisionError
              ) {
                throw supervisionError;
              }
            }

            return {
              data:
                updatedProfile,

              savedWindows,
            };
          },
        });

      const nextWindows =
        saveResult.savedWindows.length
          ? saveResult.savedWindows
          : [
              {
                start_time: "",
                end_time: "",
              },
            ];

      setAvailabilityWindows(
        nextWindows
      );

      setInitialAvailabilityWindows(
        saveResult.savedWindows
      );

      setInitialAvailableForP1s(
        availableForP1s
      );

      setInitialMaxP1s(
        cappedMaxP1s
      );

      setMaxP1s(
        cappedMaxP1s
      );

      setMessage(
        "✅ Profile updated successfully."
      );

      onUpdate(
        saveResult.data
      );
    } catch (error) {
      console.error(
        "PROFILE UPDATE ERROR",
        error
      );

      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Failed to update profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function requestFTO() {
    setMessage("");

    try {
      await auditAction({
        user,

        action:
          "SUBMIT_FTO_REQUEST",

        category:
          "Permissions",

        entityType:
          "profile",

        entityId:
          user.id,

        targetName:
          user.name ??
          "Unknown Officer",

        oldData: {
          requested_role:
            user.requested_role ??
            null,

          role_request_status:
            user.role_request_status ??
            null,
        },

        newData: {
          requested_role:
            "Field Training Officer",

          role_request_status:
            "pending",
        },

        execute: async () => {
          const {
            error,
          } = await supabase
            .from("profiles")
            .update({
              requested_role:
                "Field Training Officer",

              role_request_status:
                "pending",
            })
            .eq(
              "id",
              user.id
            );

          if (error) {
            throw error;
          }

          return {
            requested_role:
              "Field Training Officer",

            role_request_status:
              "pending",
          };
        },
      });

      setMessage(
        "✅ Field Training Officer request submitted."
      );
    } catch (error) {
      console.error(
        "FTO REQUEST ERROR",
        error
      );

      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Failed to submit request."
      );
    }
  }

  function previewImport() {
    setImportMessage("");

    if (
      !importBBCode.trim()
    ) {
      setParsedPreview(
        null
      );

      setImportMessage(
        "❌ Paste your full FTO file BBCode first."
      );

      return;
    }

    try {
      const parsed =
        parseFTOFile(
          importBBCode
        );

      setParsedPreview(
        parsed
      );

      setImportMessage(
        parsed.entries.length > 0
          ? "✅ Preview generated. Review the details below before importing."
          : "❌ No FTO log entries could be parsed."
      );
    } catch (error) {
      console.error(
        "FTO PREVIEW ERROR",
        error
      );

      setParsedPreview(
        null
      );

      setImportMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ The FTO file could not be parsed."
      );
    }
  }

  async function importFTOFile() {
    if (
      !parsedPreview
    ) {
      setImportMessage(
        "❌ Generate a preview before importing."
      );

      return;
    }

    if (
      previewHasBlockingErrors
    ) {
      setImportMessage(
        "❌ The file is missing the officer name, serial number or log entries."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "This will replace your existing imported FTO file and historical log entries. Continue?"
      );

    if (!confirmed) {
      return;
    }

    setImporting(true);
    setImportMessage("");

    try {
      const {
        data:
          existingFTOFile,
        error:
          existingFileError,
      } = await supabase
        .from("fto_files")
        .select(`
          id,
          division,
          induction_date,
          final_evaluation_date,
          probationary_passed_date,
          total_instruction_minutes
        `)
        .eq(
          "profile_id",
          user.id
        )
        .maybeSingle();

      if (
        existingFileError
      ) {
        throw existingFileError;
      }

      const action =
        existingFTOFile
          ? "REPLACE_FTO_FILE"
          : "IMPORT_FTO_FILE";

      const rows =
        parsedPreview.entries.map(
          (entry) => ({
            entry_date:
              entry.date,

            duration_minutes:
              entry.durationMinutes,

            subject_name:
              entry.subjectName,

            entry_type:
              entry.entryType,

            source_url:
              entry.sourceUrl,

            source_month:
              entry.sourceMonth,
          })
        );

      const {
        updatedProfile,
      } = await auditAction({
        user,

        action,

        category:
          "Imports",

        entityType:
          "fto_file",

        entityId:
          existingFTOFile?.id ??
          undefined,

        targetName:
          user.name ??
          parsedPreview.officerName ??
          "Unknown Officer",

        oldData: {
          existing_file:
            existingFTOFile ??
            null,

          profile_division:
            user.division ??
            null,
        },

        newData: {
          import_mode:
            existingFTOFile
              ? "replace"
              : "create",

          parsed_officer_name:
            parsedPreview.officerName,

          parsed_serial_number:
            parsedPreview.serialNumber,

          division:
            parsedPreview.division ||
            null,

          induction_date:
            parsedPreview.inductionDate,

          final_evaluation_date:
            parsedPreview.finalEvaluationDate,

          probationary_passed_date:
            parsedPreview.probationaryPassedDate,

          total_instruction_minutes:
            parsedPreview.resolvedTotalInstructionMinutes,

          entry_count:
            rows.length,

          monthly_section_count:
            parsedPreview.monthlyLogs.length,

          parser_repairs:
            parsedPreview.repairs,

          parser_warnings:
            parsedPreview.warnings,
        },

        execute: async () => {
          const now =
            new Date().toISOString();

          const {
            data:
              ftoFile,
            error:
              ftoFileError,
          } = await supabase
            .from("fto_files")
            .upsert(
              {
                profile_id:
                  user.id,

                division:
                  parsedPreview.division ||
                  null,

                induction_date:
                  parsedPreview.inductionDate,

                final_evaluation_date:
                  parsedPreview.finalEvaluationDate,

                probationary_passed_date:
                  parsedPreview.probationaryPassedDate,

                total_instruction_minutes:
                  parsedPreview.resolvedTotalInstructionMinutes,

                original_bbcode:
                  importBBCode.trim(),

                updated_at:
                  now,
              },
              {
                onConflict:
                  "profile_id",
              }
            )
            .select("id")
            .single();

          if (ftoFileError) {
            throw ftoFileError;
          }

          const {
            error:
              deleteError,
          } = await supabase
            .from(
              "fto_log_entries"
            )
            .delete()
            .eq(
              "fto_file_id",
              ftoFile.id
            );

          if (deleteError) {
            throw deleteError;
          }

          if (
            rows.length > 0
          ) {
            const {
              error:
                insertError,
            } = await supabase
              .from(
                "fto_log_entries"
              )
              .insert(
                rows.map(
                  (row) => ({
                    ...row,

                    fto_file_id:
                      ftoFile.id,
                  })
                )
              );

            if (insertError) {
              throw insertError;
            }
          }

          let updatedProfile:
            any = null;

          if (
            divisions.includes(
              parsedPreview.division
            )
          ) {
            const {
              data:
                profileData,
              error:
                profileDivisionError,
            } = await supabase
              .from("profiles")
              .update({
                division:
                  parsedPreview.division,
              })
              .eq(
                "id",
                user.id
              )
              .select()
              .single();

            if (
              profileDivisionError
            ) {
              throw profileDivisionError;
            }

            updatedProfile =
              profileData;
          }

          return {
            ftoFile,
            updatedProfile,
          };
        },
      });

      if (
        updatedProfile
      ) {
        setDivision(
          updatedProfile.division
        );

        onUpdate(
          updatedProfile
        );
      }

      setImportMessage(
        `✅ FTO file imported successfully with ${rows.length} log entries and a corrected total of ${parsedPreview.resolvedTotalInstructionText}.`
      );

      setTimeout(() => {
        setImportModalOpen(false);
        setImportBBCode("");
        setParsedPreview(null);
        setImportMessage("");
      }, 1200);
    } catch (error) {
      console.error(
        "MANUAL FTO IMPORT ERROR",
        error
      );

      setImportMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ The FTO file could not be imported."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={settingsPageStyle}>
      <section style={settingsHeroStyle}>
        <div>
          <p style={settingsEyebrowStyle}>
            ACCOUNT & FTP TOOLS
          </p>

          <h2 style={settingsHeroTitleStyle}>
            Settings
          </h2>

          <p style={settingsHeroTextStyle}>
            Manage your profile, availability and FTP tools from one place.
          </p>
        </div>

        <div style={settingsIdentityStyle}>
          <span style={settingsIdentityLabelStyle}>
            CURRENT ACCESS
          </span>

          <strong style={settingsIdentityValueStyle}>
            {user.role || "Probationary Officer"}
          </strong>
        </div>
      </section>

      {message && (
        <div
          style={
            message.startsWith("✅")
              ? settingsSuccessStyle
              : settingsErrorStyle
          }
        >
          {message}
        </div>
      )}

      <section style={settingsPanelStyle}>
        <div style={settingsSectionHeaderStyle}>
          <div>
            <p style={settingsSectionEyebrowStyle}>
              PROFILE
            </p>

            <h3 style={settingsSectionTitleStyle}>
              Account Information
            </h3>

            <p style={settingsSectionTextStyle}>
              Keep your character and departmental details accurate.
            </p>
          </div>

          <span style={settingsRoleBadgeStyle}>
            {user.role || "Probationary Officer"}
          </span>
        </div>

        <div style={settingsProfileGridStyle}>
          <Field label="Character Name">
            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              style={settingsInputStyle}
            />
          </Field>

          <Field label="Badge Number">
            <input
              value={badge}
              onChange={(event) =>
                setBadge(
                  event.target.value
                )
              }
              style={settingsInputStyle}
            />
          </Field>

          <Field label="Work Number">
            <input
              value={workNumber}
              onChange={(event) =>
                setWorkNumber(
                  event.target.value
                )
              }
              style={settingsInputStyle}
            />
          </Field>

          {isProbationaryOfficer ? (
            <LockedProfileField
              label="LSPD Rank"
              value="Police Officer I"
              helpText="Your rank becomes editable once you become a Field Training Officer."
            />
          ) : (
            <Field label="LSPD Rank">
              <select
                value={rank}
                onChange={(event) =>
                  setRank(
                    event.target.value
                  )
                }
                style={settingsInputStyle}
              >
                {ranks.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </Field>
          )}

          {isProbationaryOfficer ? (
            <LockedProfileField
              label="Division"
              value="Mission Row Division"
              helpText="Probationary Officers begin in Mission Row Division."
            />
          ) : (
            <Field label="Division">
              <select
                value={division}
                onChange={(event) =>
                  setDivision(
                    event.target.value
                  )
                }
                style={settingsInputStyle}
              >
                {divisions.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </Field>
          )}

          <div style={settingsLockedRoleStyle}>
            <span style={settingsLockedLabelStyle}>
              FTP Role
            </span>

            <strong style={settingsLockedValueStyle}>
              {user.role || "Probationary Officer"}
            </strong>

            <span style={settingsLockedHelpStyle}>
              Access roles are managed through Personnel Management.
            </span>
          </div>
        </div>
      </section>

      <section style={settingsPanelStyle}>
        <div style={settingsSectionHeaderStyle}>
          <div>
            <p style={settingsSectionEyebrowStyle}>
              FTP TOOLS
            </p>

            <h3 style={settingsSectionTitleStyle}>
              Training Utilities
            </h3>

            <p style={settingsSectionTextStyle}>
              Open the tools linked to your FTP responsibilities.
            </p>
          </div>
        </div>

        <div style={settingsToolsGridStyle}>
          <button
            type="button"
            onClick={() =>
              setFtpToolTab(
                "availability"
              )
            }
            style={{
              ...settingsToolCardStyle,
              ...(ftpToolTab ===
              "availability"
                ? settingsToolCardActiveStyle
                : {}),
            }}
          >
            <span style={settingsToolIconStyle}>
              ◷
            </span>

            <span style={settingsToolTextStyle}>
              <strong>
                Server Availability
              </strong>

              <span>
                Set your normal GTA:W patrol hours and P1 capacity.
              </span>
            </span>

            <span style={settingsToolArrowStyle}>
              →
            </span>
          </button>

          {canImportFTOFile && (
            <button
              type="button"
              onClick={() =>
                setFtpToolTab(
                  "import"
                )
              }
              style={{
                ...settingsToolCardStyle,
                ...(ftpToolTab ===
                "import"
                  ? settingsToolCardActiveStyle
                  : {}),
              }}
            >
              <span style={settingsToolIconStyle}>
                ⇧
              </span>

              <span style={settingsToolTextStyle}>
                <strong>
                  FTO BBCode Importer
                </strong>

                <span>
                  Import or replace your historical forum FTO file.
                </span>
              </span>

              <span style={settingsToolArrowStyle}>
                →
              </span>
            </button>
          )}
        </div>
      </section>

      {ftpToolTab ===
        "availability" && (
        <section style={settingsPanelStyle}>
          <div style={settingsSectionHeaderStyle}>
            <div>
              <p style={settingsSectionEyebrowStyle}>
                AVAILABILITY
              </p>

              <h3 style={settingsSectionTitleStyle}>
                Server Availability
              </h3>

              <p style={settingsSectionTextStyle}>
                Set the times you are normally available using GTA:W server time.
              </p>
            </div>

            <span style={settingsCountBadgeStyle}>
              {availabilityWindows.filter(
                (window) =>
                  window.start_time &&
                  window.end_time
              ).length}{" "}
              window
              {availabilityWindows.filter(
                (window) =>
                  window.start_time &&
                  window.end_time
              ).length === 1
                ? ""
                : "s"}
            </span>
          </div>

          <div style={settingsAvailabilityListStyle}>
            {availabilityWindows.map(
              (
                window,
                index
              ) => (
                <div
                  key={index}
                  style={settingsAvailabilityRowStyle}
                >
                  <div style={settingsWindowNumberStyle}>
                    {index + 1}
                  </div>

                  <div style={settingsTimeGridStyle}>
                    <Field label="Available From">
                      <input
                        type="time"
                        value={
                          window.start_time
                        }
                        onChange={(event) =>
                          updateAvailabilityWindow(
                            index,
                            "start_time",
                            event.target.value
                          )
                        }
                        style={settingsInputStyle}
                      />
                    </Field>

                    <div style={settingsTimeArrowStyle}>
                      →
                    </div>

                    <Field label="Available Until">
                      <input
                        type="time"
                        value={
                          window.end_time
                        }
                        onChange={(event) =>
                          updateAvailabilityWindow(
                            index,
                            "end_time",
                            event.target.value
                          )
                        }
                        style={settingsInputStyle}
                      />
                    </Field>
                  </div>

                  {availabilityWindows.length >
                    1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeAvailabilityWindow(
                          index
                        )
                      }
                      style={settingsRemoveButtonStyle}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )
            )}
          </div>

          <button
            type="button"
            onClick={
              addAvailabilityWindow
            }
            style={settingsAddButtonStyle}
          >
            + Add Availability Window
          </button>

          {[
            "Field Training Manager",
            "Field Training Supervisor",
            "STAFF",
          ].includes(
            user.role
          ) && (
            <div style={settingsSupervisionCardStyle}>
              <div style={settingsSupervisionHeaderStyle}>
                <div>
                  <p style={settingsSectionEyebrowStyle}>
                    PROBATIONER SUPERVISION
                  </p>

                  <h3 style={settingsSubsectionTitleStyle}>
                    P1 Availability
                  </h3>

                  <p style={settingsSectionTextStyle}>
                    Control whether you can take probationary officers and how many active P1s you can supervise.
                  </p>
                </div>

                <span
                  style={{
                    ...settingsAvailabilityStatusStyle,
                    color:
                      availableForP1s
                        ? "#86efac"
                        : "#cbd5e1",
                    borderColor:
                      availableForP1s
                        ? "#166534"
                        : "#475569",
                    backgroundColor:
                      availableForP1s
                        ? "rgba(20, 83, 45, 0.3)"
                        : "#1e293b",
                  }}
                >
                  {availableForP1s
                    ? "AVAILABLE"
                    : "UNAVAILABLE"}
                </span>
              </div>

              <div style={settingsSupervisionGridStyle}>
                <Field label="Supervision Status">
                  <select
                    value={
                      availableForP1s
                        ? "yes"
                        : "no"
                    }
                    onChange={(event) =>
                      setAvailableForP1s(
                        event.target.value ===
                          "yes"
                      )
                    }
                    style={settingsInputStyle}
                  >
                    <option value="no">
                      Not available for P1s
                    </option>

                    <option value="yes">
                      Available for P1s
                    </option>
                  </select>
                </Field>

                <Field label="Maximum Active P1s">
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={maxP1s}
                    onChange={(event) =>
                      setMaxP1s(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    disabled={
                      !availableForP1s
                    }
                    style={{
                      ...settingsInputStyle,
                      opacity:
                        availableForP1s
                          ? 1
                          : 0.55,
                    }}
                  />
                </Field>
              </div>
            </div>
          )}
        </section>
      )}

      {ftpToolTab ===
        "import" &&
        canImportFTOFile && (
          <section style={settingsPanelStyle}>
            <div style={settingsSectionHeaderStyle}>
              <div>
                <p style={settingsSectionEyebrowStyle}>
                  FTO FILE
                </p>

                <h3 style={settingsSectionTitleStyle}>
                  Manual FTO File Import
                </h3>

                <p style={settingsSectionTextStyle}>
                  Import or replace your existing forum FTO file without leaving Settings.
                </p>
              </div>

              <span style={settingsRoleBadgeStyle}>
                FTO TOOL
              </span>
            </div>

            <div style={settingsImportCardStyle}>
              <div style={settingsImportIconStyle}>
                ⇧
              </div>

              <div style={settingsImportTextStyle}>
                <strong>
                  Import an existing FTO file
                </strong>

                <span>
                  Paste your full BBCode, preview the parsed data and confirm the replacement.
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(
                    true
                  );
                  setImportMessage("");
                }}
                style={settingsPrimaryButtonStyle}
              >
                Open Importer
              </button>
            </div>
          </section>
        )}

      {user.role ===
        "Probationary Officer" &&
        !user.requested_role && (
          <section style={settingsRequestCardStyle}>
            <div>
              <p style={settingsSectionEyebrowStyle}>
                ROLE REQUEST
              </p>

              <h3 style={settingsSubsectionTitleStyle}>
                Become a Field Training Officer
              </h3>

              <p style={settingsSectionTextStyle}>
                Submit a request to begin the FTO approval process.
              </p>
            </div>

            <button
              type="button"
              onClick={
                requestFTO
              }
              style={settingsRequestButtonStyle}
            >
              Request FTO Status
            </button>
          </section>
        )}

      <section style={settingsSaveBarStyle}>
        <div>
          <strong>
            Save your changes
          </strong>

          <p style={settingsSaveTextStyle}>
            Profile, availability and supervision preferences are saved together.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={
            savingProfile
          }
          style={{
            ...settingsPrimaryButtonStyle,
            minWidth: "160px",
            opacity:
              savingProfile
                ? 0.65
                : 1,
            cursor:
              savingProfile
                ? "not-allowed"
                : "pointer",
          }}
        >
          {savingProfile
            ? "Saving..."
            : "Save Changes"}
        </button>
      </section>

      {importModalOpen && (
        <div
          style={modalOverlayStyle}
          onClick={() => {
            if (!importing) {
              setImportModalOpen(
                false
              );
            }
          }}
        >
          <div
            style={modalStyle}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div style={modalHeaderStyle}>
              <div>
                <h2
                  style={{
                    margin:
                      "0 0 6px",
                  }}
                >
                  Import FTO File
                </h2>

                <p style={mutedStyle}>
                  Paste your complete forum BBCode below, then preview it before importing.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!importing) {
                    setImportModalOpen(
                      false
                    );
                  }
                }}
                disabled={
                  importing
                }
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <div style={warningStyle}>
              Importing replaces your existing imported FTO log entries. A final confirmation will appear before anything is changed.
            </div>

            <label style={labelStyle}>
              FTO File BBCode
            </label>

            <textarea
              value={importBBCode}
              onChange={(event) => {
                setImportBBCode(
                  event.target.value
                );

                setParsedPreview(
                  null
                );

                setImportMessage(
                  ""
                );
              }}
              placeholder="[font=Arial]Paste your complete FTO file BBCode here...[/font]"
              disabled={
                importing
              }
              style={textareaStyle}
            />

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={
                  previewImport
                }
                disabled={
                  importing
                }
                style={previewButtonStyle}
              >
                Preview Import
              </button>

              <button
                type="button"
                onClick={
                  importFTOFile
                }
                disabled={
                  importing ||
                  !parsedPreview ||
                  previewHasBlockingErrors
                }
                style={{
                  ...importButtonStyle,
                  opacity:
                    importing ||
                    !parsedPreview ||
                    previewHasBlockingErrors
                      ? 0.6
                      : 1,
                  cursor:
                    importing ||
                    !parsedPreview ||
                    previewHasBlockingErrors
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {importing
                  ? "Importing..."
                  : "Import / Replace My FTO File"}
              </button>
            </div>

            {importMessage && (
              <div style={messageBoxStyle}>
                {importMessage}
              </div>
            )}

            {parsedPreview && (
              <ImportPreview
                preview={
                  parsedPreview
                }
              />
            )}

            <div style={modalFooterStyle}>
              <button
                type="button"
                onClick={() => {
                  if (!importing) {
                    setImportModalOpen(
                      false
                    );
                  }
                }}
                disabled={
                  importing
                }
                style={cancelButtonStyle}
              >
                Cancel
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
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      {children}
    </div>
  );
}

function LockedProfileField({
  label,
  value,
  helpText,
}: {
  label: string;
  value: string;
  helpText: string;
}) {
  return (
    <div style={lockedFieldStyle}>
      <p style={lockedFieldLabelStyle}>
        {label}
      </p>

      <p style={lockedFieldValueStyle}>
        {value}
      </p>

      <p style={lockedFieldHelpStyle}>
        🔒 {helpText}
      </p>
    </div>
  );
}

function ImportPreview({
  preview,
}: {
  preview:
    ParsedFTOFile;
}) {
  return (
    <div style={previewStyle}>
      <h3
        style={{
          marginTop: 0,
        }}
      >
        Import Preview
      </h3>

      <div style={previewGridStyle}>
        <PreviewDetail
          label="Officer"
          value={
            preview.officerName ||
            "Not found"
          }
        />

        <PreviewDetail
          label="Serial"
          value={
            preview.serialNumber ||
            "Not found"
          }
        />

        <PreviewDetail
          label="Division"
          value={
            preview.division ||
            "Not found"
          }
        />

        <PreviewDetail
          label="Imported Entries"
          value={String(
            preview.entries.length
          )}
        />

        <PreviewDetail
          label="Original Total"
          value={
            preview.statedTotalInstructionText ||
            "Not found"
          }
        />

        <PreviewDetail
          label="Corrected Total"
          value={
            preview.resolvedTotalInstructionText
          }
        />

        <PreviewDetail
          label="Training Entries"
          value={String(
            preview.entries.filter(
              (entry) =>
                entry.entryType ===
                "training"
            ).length
          )}
        />

        <PreviewDetail
          label="Evaluations / Meetings"
          value={String(
            preview.entries.filter(
              (entry) =>
                entry.entryType !==
                "training"
            ).length
          )}
        />
      </div>

      {preview.repairs.length >
        0 && (
          <div style={repairStyle}>
            <strong>
              Automatic repairs
            </strong>

            <ul style={listStyle}>
              {preview.repairs.map(
                (
                  repair,
                  index
                ) => (
                  <li key={index}>
                    {repair}
                  </li>
                )
              )}
            </ul>
          </div>
        )}

      {preview.warnings.length >
        0 && (
          <div
            style={
              parserWarningStyle
            }
          >
            <strong>
              Parser warnings
            </strong>

            <ul style={listStyle}>
              {preview.warnings.map(
                (
                  warning,
                  index
                ) => (
                  <li key={index}>
                    {warning}
                  </li>
                )
              )}
            </ul>
          </div>
        )}
    </div>
  );
}

function PreviewDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={previewDetailStyle}>
      <p
        style={{
          margin:
            "0 0 5px",
          color:
            "#94a3b8",
          fontSize: "13px",
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: 0,
          fontWeight: 800,
        }}
      >
        {value}
      </p>
    </div>
  );
}

const settingsPageStyle = {
  display: "grid",
  gap: "20px",
  maxWidth: "1180px",
};

const settingsHeroStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "24px",
  padding: "28px",
  background:
    "linear-gradient(135deg, #111c33 0%, #0f172a 58%, #172554 100%)",
  border: "1px solid #263655",
  borderRadius: "16px",
  boxShadow:
    "0 18px 48px rgba(2, 6, 23, 0.22)",
  flexWrap: "wrap" as const,
};

const settingsEyebrowStyle = {
  margin: "0 0 8px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const settingsHeroTitleStyle = {
  margin: "0 0 8px",
  fontSize: "30px",
};

const settingsHeroTextStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.55,
};

const settingsIdentityStyle = {
  minWidth: "220px",
  display: "grid",
  gap: "5px",
  padding: "15px 17px",
  backgroundColor:
    "rgba(15, 23, 42, 0.72)",
  border: "1px solid #31415f",
  borderRadius: "11px",
};

const settingsIdentityLabelStyle = {
  color: "#64748b",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const settingsIdentityValueStyle = {
  color: "#dbeafe",
  fontSize: "13px",
};

const settingsPanelStyle = {
  padding: "24px",
  background:
    "linear-gradient(145deg, #172033, #111827)",
  border: "1px solid #29364c",
  borderRadius: "15px",
  boxShadow:
    "0 14px 38px rgba(2, 6, 23, 0.16)",
};

const settingsSectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  marginBottom: "22px",
  flexWrap: "wrap" as const,
};

const settingsSectionEyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.11em",
};

const settingsSectionTitleStyle = {
  margin: "0 0 6px",
  fontSize: "20px",
};

const settingsSubsectionTitleStyle = {
  margin: "0 0 6px",
  fontSize: "17px",
};

const settingsSectionTextStyle = {
  margin: 0,
  color: "#7c8ba1",
  fontSize: "12px",
  lineHeight: 1.5,
};

const settingsRoleBadgeStyle = {
  padding: "6px 10px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30, 64, 175, 0.25)",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const settingsProfileGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "16px",
};

const settingsInputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 13px",
  marginTop: "7px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #3b4a63",
  borderRadius: "9px",
  fontSize: "14px",
};

const settingsLockedRoleStyle = {
  display: "grid",
  gap: "6px",
  padding: "13px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
};

const settingsLockedLabelStyle = {
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: 700,
};

const settingsLockedValueStyle = {
  color: "#e2e8f0",
  fontSize: "15px",
};

const settingsLockedHelpStyle = {
  color: "#64748b",
  fontSize: "10px",
  lineHeight: 1.4,
};

const settingsToolsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "14px",
};

const settingsToolCardStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns:
    "42px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "13px",
  padding: "17px",
  color: "white",
  textAlign: "left" as const,
  backgroundColor: "#0f172a",
  backgroundImage: "none",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#2c3b52",
  borderRadius: "12px",
  cursor: "pointer",
};

const settingsToolCardActiveStyle = {
  backgroundColor: "#0f172a",
  backgroundImage:
    "linear-gradient(135deg, rgba(30,64,175,.34), #0f172a)",
  borderColor: "#2563eb",
  boxShadow:
    "0 0 0 1px rgba(59,130,246,.14)",
};

const settingsToolIconStyle = {
  width: "42px",
  height: "42px",
  display: "grid",
  placeItems: "center",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30, 64, 175, 0.28)",
  border: "1px solid #2563eb",
  borderRadius: "10px",
  fontSize: "18px",
  fontWeight: 900,
};

const settingsToolTextStyle = {
  minWidth: 0,
  display: "grid",
  gap: "5px",
};

const settingsToolArrowStyle = {
  color: "#60a5fa",
  fontSize: "19px",
};

const settingsCountBadgeStyle = {
  padding: "6px 10px",
  color: "#cbd5e1",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 800,
};

const settingsAvailabilityListStyle = {
  display: "grid",
  gap: "11px",
};

const settingsAvailabilityRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "36px minmax(0, 1fr) auto",
  alignItems: "end",
  gap: "14px",
  padding: "15px",
  backgroundColor: "#0f172a",
  border: "1px solid #2c3b52",
  borderRadius: "11px",
};

const settingsWindowNumberStyle = {
  width: "34px",
  height: "34px",
  display: "grid",
  placeItems: "center",
  alignSelf: "center",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30, 64, 175, 0.25)",
  border: "1px solid #2563eb",
  borderRadius: "9px",
  fontSize: "11px",
  fontWeight: 900,
};

const settingsTimeGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) 28px minmax(0, 1fr)",
  alignItems: "end",
  gap: "10px",
};

const settingsTimeArrowStyle = {
  display: "grid",
  placeItems: "center",
  height: "42px",
  color: "#60a5fa",
  fontSize: "18px",
};

const settingsRemoveButtonStyle = {
  padding: "11px 13px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.28)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const settingsAddButtonStyle = {
  marginTop: "13px",
  padding: "11px 14px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.28)",
  border: "1px solid #166534",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const settingsSupervisionCardStyle = {
  marginTop: "20px",
  padding: "18px",
  background:
    "linear-gradient(135deg, rgba(37,99,235,.12), #0f172a)",
  border: "1px solid #31517c",
  borderRadius: "12px",
};

const settingsSupervisionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
  flexWrap: "wrap" as const,
};

const settingsSupervisionGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "14px",
};

const settingsAvailabilityStatusStyle = {
  padding: "6px 9px",
  border: "1px solid",
  borderRadius: "999px",
  fontSize: "9px",
  fontWeight: 900,
};

const settingsImportCardStyle = {
  display: "grid",
  gridTemplateColumns:
    "52px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "16px",
  padding: "18px",
  backgroundColor: "#0f172a",
  border: "1px solid #2c3b52",
  borderRadius: "12px",
};

const settingsImportIconStyle = {
  width: "50px",
  height: "50px",
  display: "grid",
  placeItems: "center",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(30, 64, 175, 0.28)",
  border: "1px solid #2563eb",
  borderRadius: "11px",
  fontSize: "21px",
  fontWeight: 900,
};

const settingsImportTextStyle = {
  display: "grid",
  gap: "6px",
};

const settingsPrimaryButtonStyle = {
  padding: "12px 16px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "1px solid #3b82f6",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 900,
};

const settingsRequestCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "22px",
  background:
    "linear-gradient(135deg, rgba(91,33,182,.18), #111827)",
  border: "1px solid #6d28d9",
  borderRadius: "14px",
  flexWrap: "wrap" as const,
};

const settingsRequestButtonStyle = {
  padding: "12px 16px",
  color: "white",
  backgroundColor: "#7c3aed",
  border: "1px solid #8b5cf6",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 900,
};

const settingsSaveBarStyle = {
  position: "sticky" as const,
  bottom: "16px",
  zIndex: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "17px 20px",
  backgroundColor:
    "rgba(15, 23, 42, 0.94)",
  border: "1px solid #334155",
  borderRadius: "13px",
  boxShadow:
    "0 16px 45px rgba(2, 6, 23, 0.38)",
  backdropFilter: "blur(12px)",
  flexWrap: "wrap" as const,
};

const settingsSaveTextStyle = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: "11px",
};

const settingsSuccessStyle = {
  padding: "13px 15px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.34)",
  border: "1px solid #166534",
  borderRadius: "10px",
};

const settingsErrorStyle = {
  padding: "13px 15px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.34)",
  border: "1px solid #991b1b",
  borderRadius: "10px",
};

const lockedFieldStyle = {
  padding: "14px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
};

const lockedFieldLabelStyle = {
  margin: "0 0 7px",
  color: "#94a3b8",
  fontSize: "13px",
  fontWeight: 700,
};

const lockedFieldValueStyle = {
  margin: "0 0 7px",
  color: "white",
  fontSize: "17px",
  fontWeight: 800,
};

const lockedFieldHelpStyle = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: 1.5,
};

const pageStyle = {
  display: "grid",
  gap: "22px",
  maxWidth: "900px",
};

const cardStyle = {
  background: "#1e293b",
  padding: "30px",
  borderRadius: "12px",
  border:
    "1px solid #334155",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
};

const input = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "12px",
  marginTop: "6px",
  background: "#0f172a",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  color: "white",
  fontSize: "16px",
};

const button = {
  marginTop: "25px",
  padding: "12px 25px",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  color: "white",
  cursor: "pointer",
  fontSize: "16px",
};

const requestButton = {
  marginTop: "15px",
  marginLeft: "12px",
  padding: "12px 25px",
  background: "#16a34a",
  border: "none",
  borderRadius: "8px",
  color: "white",
  cursor: "pointer",
  fontSize: "16px",
};

const messageStyle = {
  marginBottom: 0,
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: "18px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
};

const mutedStyle = {
  margin: 0,
  color: "#94a3b8",
};

const badgeStyle = {
  padding: "6px 10px",
  color: "#bfdbfe",
  background:
    "rgba(37, 99, 235, 0.18)",
  border:
    "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const warningStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#fde68a",
  background:
    "rgba(120, 53, 15, 0.3)",
  border:
    "1px solid #a16207",
  borderRadius: "8px",
};

const labelStyle = {
  display: "block",
  color: "#cbd5e1",
  fontSize: "14px",
  fontWeight: 700,
};

const textareaStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  minHeight: "340px",
  marginTop: "8px",
  padding: "14px",
  color: "white",
  background: "#0f172a",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  resize: "vertical" as const,
  fontFamily: "monospace",
  lineHeight: 1.5,
};

const buttonRowStyle = {
  display: "flex",
  gap: "12px",
  marginTop: "16px",
  flexWrap: "wrap" as const,
};

const previewButtonStyle = {
  flex: 1,
  minWidth: "170px",
  padding: "13px",
  color: "white",
  background: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const importButtonStyle = {
  flex: 2,
  minWidth: "230px",
  padding: "13px",
  color: "white",
  background: "#16a34a",
  border: "none",
  borderRadius: "8px",
  fontWeight: 800,
};

const messageBoxStyle = {
  padding: "14px",
  marginTop: "18px",
  color: "#e2e8f0",
  background: "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: "8px",
};

const previewStyle = {
  marginTop: "22px",
  padding: "20px",
  background: "#0f172a",
  border:
    "1px solid #334155",
  borderRadius: "10px",
};

const previewGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "12px",
};

const previewDetailStyle = {
  padding: "14px",
  background: "#172033",
  borderRadius: "8px",
};

const repairStyle = {
  padding: "14px",
  marginTop: "16px",
  color: "#bbf7d0",
  background:
    "rgba(20, 83, 45, 0.35)",
  border:
    "1px solid #166534",
  borderRadius: "8px",
};

const parserWarningStyle = {
  padding: "14px",
  marginTop: "16px",
  color: "#fde68a",
  background:
    "rgba(120, 53, 15, 0.3)",
  border:
    "1px solid #a16207",
  borderRadius: "8px",
};

const listStyle = {
  margin:
    "10px 0 0",
  paddingLeft: "20px",
  lineHeight: 1.5,
};


const importSummaryStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "18px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
  flexWrap: "wrap" as const,
};

const importSummaryTextStyle = {
  margin: "6px 0 0",
  color: "#94a3b8",
  lineHeight: 1.5,
};

const openImportButtonStyle = {
  padding: "12px 18px",
  color: "white",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
  whiteSpace: "nowrap" as const,
};

const modalOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "24px",
  background:
    "rgba(2, 6, 23, 0.88)",
  zIndex: 1000,
};

const modalStyle = {
  width: "100%",
  maxWidth: "920px",
  maxHeight: "92vh",
  overflowY: "auto" as const,
  padding: "28px",
  color: "white",
  background: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "14px",
  boxShadow:
    "0 24px 60px rgba(0, 0, 0, 0.45)",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "20px",
};

const closeButtonStyle = {
  padding: "0 8px",
  color: "white",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "30px",
  lineHeight: 1,
};

const modalFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: "20px",
};

const cancelButtonStyle = {
  padding: "11px 16px",
  color: "white",
  background: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};


const tabContainerStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "20px",
};

const tabStyle = {
  padding: "12px 18px",
  background: "#334155",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const activeTabStyle = {
  padding: "12px 18px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const availabilityBoxStyle = {
  marginTop: "15px",
  padding: "18px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};