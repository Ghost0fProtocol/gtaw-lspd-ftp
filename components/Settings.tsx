"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

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

const supervisionRoles = [
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
      const { data: availability } = await supabase
        .from("ftp_availability_windows")
        .select("*")
        .eq("profile_id", user.id);

      if (availability?.length) {
        setAvailabilityWindows(
          availability.map((item) => ({
            start_time: item.start_time.slice(0, 5),
            end_time: item.end_time.slice(0, 5),
          }))
        );
      }

      const { data: supervision } = await supabase
        .from("ftp_supervision_preferences")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (supervision) {
        setAvailableForP1s(supervision.available_for_p1s);
        setMaxP1s(supervision.max_active_p1s ?? 4);
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

    try {
      const {
        data,
        error,
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
            isProbationaryOfficer
              ? "Police Officer I"
              : rank,
          division:
            isProbationaryOfficer
              ? "Mission Row Division"
              : division,
        })
        .eq(
          "id",
          user.id
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      const validWindows = availabilityWindows.filter(
        (window) => window.start_time && window.end_time
      );

      const { error: deleteError } = await supabase
        .from("ftp_availability_windows")
        .delete()
        .eq("profile_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      if (validWindows.length) {
        const { data: savedWindows, error: insertError } = await supabase
          .from("ftp_availability_windows")
          .insert(
            validWindows.map((window) => ({
              profile_id: user.id,
              start_time: window.start_time,
              end_time: window.end_time,
            }))
          )
          .select();

        if (insertError) {
          throw insertError;
        }

        setAvailabilityWindows(
          (savedWindows ?? []).map((window) => ({
            start_time: window.start_time.slice(0, 5),
            end_time: window.end_time.slice(0, 5),
          }))
        );
      } else {
        setAvailabilityWindows([{ start_time: "", end_time: "" }]);
      }

      if (
        supervisionRoles.includes(
          user.role
        )
      ) {
        const {
          error:
            supervisionError,
        } = await supabase
          .from(
            "ftp_supervision_preferences"
          )
          .upsert(
            {
              profile_id:
                user.id,
              available_for_p1s:
                availableForP1s,
              max_active_p1s:
                Math.min(
                  Math.max(
                    maxP1s,
                    1
                  ),
                  4
                ),
            },
            {
              onConflict:
                "profile_id",
            }
          );

        if (
          supervisionError
        ) {
          throw supervisionError;
        }
      }

      setMessage(
        "✅ Profile updated successfully."
      );

      onUpdate(data);
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
      const now =
        new Date().toISOString();

      const {
        data: ftoFile,
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

      const rows =
        parsedPreview.entries.map(
          (entry) => ({
            fto_file_id:
              ftoFile.id,
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
          .insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      if (
        divisions.includes(
          parsedPreview.division
        )
      ) {
        const {
          data:
            updatedProfile,
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

        setDivision(
          parsedPreview.division
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
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>
            ACCOUNT & FTP PREFERENCES
          </p>

          <h1 style={heroTitleStyle}>
            Settings
          </h1>

          <p style={heroSubtitleStyle}>
            Manage your officer profile, normal server availability and
            Field Training Program preferences.
          </p>
        </div>

        <div style={heroStatusStyle}>
          <span style={heroStatusLabelStyle}>
            CURRENT ACCESS
          </span>

          <strong style={heroStatusValueStyle}>
            {user.role || "Probationary Officer"}
          </strong>
        </div>
      </section>

      <section style={settingsCardStyle}>
        <SectionHeader
          eyebrow="OFFICER PROFILE"
          title="Account Details"
          description="Keep the information used throughout the FTP portal accurate."
          badge="PROFILE"
        />

        <div style={profileGridStyle}>
          <Field label="Character Name">
            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              style={input}
            />
          </Field>

          <Field label="Badge Number">
            <input
              value={badge}
              onChange={(event) =>
                setBadge(event.target.value)
              }
              style={input}
            />
          </Field>

          <Field label="Work Number">
            <input
              value={workNumber}
              onChange={(event) =>
                setWorkNumber(event.target.value)
              }
              style={input}
            />
          </Field>

          {isProbationaryOfficer ? (
            <LockedProfileField
              label="LSPD Rank"
              value="Police Officer I"
              helpText="Your rank becomes editable when you become a Field Training Officer."
            />
          ) : (
            <Field label="LSPD Rank">
              <select
                value={rank}
                onChange={(event) =>
                  setRank(event.target.value)
                }
                style={input}
              >
                {ranks.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {isProbationaryOfficer ? (
            <LockedProfileField
              label="Division"
              value="Mission Row Division"
              helpText="New Probationary Officers begin in Mission Row Division."
            />
          ) : (
            <Field label="Division">
              <select
                value={division}
                onChange={(event) =>
                  setDivision(event.target.value)
                }
                style={input}
              >
                {divisions.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <LockedProfileField
            label="FTP Role"
            value={user.role || "Probationary Officer"}
            helpText="FTP access is controlled by role approval and cannot be changed here."
          />
        </div>
      </section>

      <section style={settingsCardStyle}>
        <SectionHeader
          eyebrow="SERVER AVAILABILITY"
          title="Normal Patrol Hours"
          description="Add the GTA:W server-time windows when you are normally available."
          badge={`${availabilityWindows.length} WINDOW${
            availabilityWindows.length === 1 ? "" : "S"
          }`}
        />

        <div style={availabilityListStyle}>
          {availabilityWindows.map((window, index) => (
            <div
              key={index}
              style={availabilityRowStyle}
            >
              <div style={windowNumberStyle}>
                {index + 1}
              </div>

              <div style={timeFieldStyle}>
                <label style={compactLabelStyle}>
                  Available From
                </label>

                <input
                  type="time"
                  value={window.start_time}
                  onChange={(event) =>
                    updateAvailabilityWindow(
                      index,
                      "start_time",
                      event.target.value
                    )
                  }
                  style={compactInputStyle}
                />
              </div>

              <div style={arrowStyle}>
                →
              </div>

              <div style={timeFieldStyle}>
                <label style={compactLabelStyle}>
                  Available Until
                </label>

                <input
                  type="time"
                  value={window.end_time}
                  onChange={(event) =>
                    updateAvailabilityWindow(
                      index,
                      "end_time",
                      event.target.value
                    )
                  }
                  style={compactInputStyle}
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  removeAvailabilityWindow(index)
                }
                disabled={availabilityWindows.length === 1}
                style={{
                  ...removeWindowButtonStyle,
                  opacity:
                    availabilityWindows.length === 1
                      ? 0.4
                      : 1,
                  cursor:
                    availabilityWindows.length === 1
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addAvailabilityWindow}
          style={secondaryButtonStyle}
        >
          + Add Availability Window
        </button>
      </section>

      {supervisionRoles.includes(user.role) && (
        <section style={supervisionPanelStyle}>
          <div style={supervisionCopyStyle}>
            <p style={eyebrowStyle}>
              PROBATIONER SUPERVISION
            </p>

            <h2 style={sectionTitleStyle}>
              Accepting New P1s
            </h2>

            <p style={sectionDescriptionStyle}>
              This status is used when FTMs are ranked for a new probationary
              officer assignment.
            </p>

            <div style={supervisionMetaStyle}>
              <span
                style={{
                  ...statusPillStyle,
                  color:
                    availableForP1s
                      ? "#86efac"
                      : "#cbd5e1",
                  borderColor:
                    availableForP1s
                      ? "#15803d"
                      : "#475569",
                  backgroundColor:
                    availableForP1s
                      ? "rgba(20, 83, 45, 0.38)"
                      : "rgba(51, 65, 85, 0.38)",
                }}
              >
                {availableForP1s
                  ? "Accepting P1s"
                  : "Not Accepting P1s"}
              </span>

              <span style={supervisionHintStyle}>
                Maximum active supervision capacity: {maxP1s}
              </span>
            </div>
          </div>

          <div style={supervisionControlsStyle}>
            <button
              type="button"
              role="switch"
              aria-checked={availableForP1s}
              onClick={() =>
                setAvailableForP1s(
                  (current) => !current
                )
              }
              style={{
                ...switchButtonStyle,
                backgroundColor:
                  availableForP1s
                    ? "#2563eb"
                    : "#334155",
                borderColor:
                  availableForP1s
                    ? "#60a5fa"
                    : "#475569",
              }}
            >
              <span
                style={{
                  ...switchKnobStyle,
                  transform:
                    availableForP1s
                      ? "translateX(28px)"
                      : "translateX(0)",
                }}
              />

              <span style={switchTextStyle}>
                {availableForP1s ? "ON" : "OFF"}
              </span>
            </button>

            <Field label="Maximum Active P1s">
              <input
                type="number"
                min={1}
                max={4}
                value={maxP1s}
                onChange={(event) =>
                  setMaxP1s(
                    Number(event.target.value)
                  )
                }
                style={input}
              />
            </Field>
          </div>
        </section>
      )}

      {canImportFTOFile && (
        <section style={settingsCardStyle}>
          <SectionHeader
            eyebrow="FTP TOOLS"
            title="FTO File Importer"
            description="Import or replace the historical FTO file currently held on the forums."
            badge="BBCode"
          />

          <div style={toolRowStyle}>
            <div>
              <strong style={toolTitleStyle}>
                Import an existing FTO file
              </strong>

              <p style={toolDescriptionStyle}>
                Paste your complete forum BBCode, preview the parsed records and
                confirm before anything is replaced.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setImportModalOpen(true);
                setImportMessage("");
              }}
              style={primaryButtonStyle}
            >
              Open Importer
            </button>
          </div>
        </section>
      )}

      <section style={saveBarStyle}>
        <div>
          <strong style={saveBarTitleStyle}>
            Save your changes
          </strong>

          <p style={saveBarTextStyle}>
            Profile, availability and supervision preferences are saved together.
          </p>
        </div>

        <div style={saveActionsStyle}>
          {user.role ===
            "Probationary Officer" &&
            !user.requested_role && (
              <button
                type="button"
                onClick={requestFTO}
                style={secondaryButtonStyle}
              >
                Request FTO Status
              </button>
            )}

          <button
            type="button"
            onClick={save}
            disabled={savingProfile}
            style={{
              ...primaryButtonStyle,
              opacity:
                savingProfile
                  ? 0.65
                  : 1,
              cursor:
                savingProfile
                  ? "wait"
                  : "pointer",
            }}
          >
            {savingProfile
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </section>

      {message && (
        <div style={messageBoxStyle}>
          {message}
        </div>
      )}

      <section style={aboutCardStyle}>
        <div style={aboutHeaderStyle}>
          <div style={aboutLogoStyle}>
            <img
              src="/ftp-logo.png"
              alt="LSPD Field Training Program"
              style={aboutLogoImageStyle}
            />
          </div>

          <div>
            <p style={aboutEyebrowStyle}>
              ABOUT THIS SOFTWARE
            </p>

            <h2 style={aboutTitleStyle}>
              LSPD FTP
            </h2>

            <p style={aboutDescriptionStyle}>
              The internal Field Training Program portal for probationary records,
              training workflows and FTP administration.
            </p>
          </div>

          <span style={releaseBadgeStyle}>
            STABLE RELEASE
          </span>
        </div>

        <div style={aboutDetailsGridStyle}>
          <AboutDetail
            label="Version"
            value="1.0.0"
          />

          <AboutDetail
            label="Designed & Developed"
            value="GhostOfProtocol"
          />

          <AboutDetail
            label="Platform"
            value="LSPD Field Training Program"
          />

          <AboutDetail
            label="Public Comment Cards"
            value="gtaw-lspd-ftp.onrender.com/comment-cards"
          />
        </div>

        <div style={aboutFooterStyle}>
          <div>
            <strong style={aboutFooterTitleStyle}>
              Employee Comment Sheets
            </strong>

            <p style={aboutFooterTextStyle}>
              Officers without an FTP account can submit a Comment Card using
              the public portal.
            </p>
          </div>

          <a
            href="https://gtaw-lspd-ftp.onrender.com/comment-cards"
            target="_blank"
            rel="noreferrer"
            style={publicLinkStyle}
          >
            Open Public Form ↗
          </a>
        </div>
      </section>

      {importModalOpen && (
        <div
          style={modalOverlayStyle}
          onClick={() => {
            if (!importing) {
              setImportModalOpen(false);
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
                  Paste your complete forum BBCode
                  below, then preview it before
                  importing.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!importing) {
                    setImportModalOpen(false);
                  }
                }}
                disabled={importing}
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <div style={warningStyle}>
              Importing replaces your existing
              imported FTO log entries. A final
              confirmation will appear before
              anything is changed.
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
              disabled={importing}
              style={textareaStyle}
            />

            <div style={buttonRowStyle}>
              <button
                type="button"
                onClick={
                  previewImport
                }
                disabled={importing}
                style={
                  previewButtonStyle
                }
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
                    setImportModalOpen(false);
                  }
                }}
                disabled={importing}
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

function SectionHeader({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div style={sectionHeaderStyle}>
      <div>
        <p style={eyebrowStyle}>
          {eyebrow}
        </p>

        <h2 style={sectionTitleStyle}>
          {title}
        </h2>

        <p style={sectionDescriptionStyle}>
          {description}
        </p>
      </div>

      {badge && (
        <span style={badgeStyle}>
          {badge}
        </span>
      )}
    </div>
  );
}

function AboutDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={aboutDetailStyle}>
      <span style={aboutDetailLabelStyle}>
        {label}
      </span>

      <strong style={aboutDetailValueStyle}>
        {value}
      </strong>
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

const pageStyle = {
  display: "grid",
  gap: "20px",
  width: "100%",
  maxWidth: "1180px",
};

const heroStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "24px",
  padding: "28px",
  color: "white",
  background:
    "linear-gradient(135deg, #0f1f3d 0%, #172554 100%)",
  border: "1px solid #29406c",
  borderRadius: "16px",
  boxShadow:
    "0 18px 45px rgba(2, 6, 23, 0.25)",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const heroTitleStyle = {
  margin: 0,
  fontSize: "34px",
};

const heroSubtitleStyle = {
  maxWidth: "680px",
  margin: "10px 0 0",
  color: "#b8c5da",
  lineHeight: 1.6,
};

const heroStatusStyle = {
  minWidth: "220px",
  padding: "16px 18px",
  background: "rgba(15, 23, 42, 0.66)",
  border: "1px solid #334a72",
  borderRadius: "12px",
};

const heroStatusLabelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#7f94b5",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const heroStatusValueStyle = {
  color: "#e6efff",
  fontSize: "16px",
};

const settingsCardStyle = {
  padding: "26px",
  color: "white",
  background: "#172033",
  border: "1px solid #2c3c58",
  borderRadius: "14px",
  boxShadow:
    "0 14px 36px rgba(2, 6, 23, 0.18)",
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",
  marginBottom: "22px",
  flexWrap: "wrap" as const,
};

const sectionTitleStyle = {
  margin: 0,
  color: "white",
  fontSize: "23px",
};

const sectionDescriptionStyle = {
  maxWidth: "720px",
  margin: "8px 0 0",
  color: "#94a3b8",
  lineHeight: 1.55,
};

const badgeStyle = {
  padding: "7px 11px",
  color: "#bfdbfe",
  background: "rgba(37, 99, 235, 0.18)",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
};

const profileGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "18px",
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 13px",
  marginTop: "7px",
  color: "white",
  background: "#0f172a",
  border: "1px solid #3e4f6b",
  borderRadius: "9px",
  fontSize: "15px",
  outline: "none",
};

const labelStyle = {
  display: "block",
  color: "#d7e1f0",
  fontSize: "13px",
  fontWeight: 800,
};

const lockedFieldStyle = {
  minHeight: "80px",
  padding: "13px",
  background: "#111a2d",
  border: "1px solid #31415c",
  borderRadius: "9px",
};

const lockedFieldLabelStyle = {
  margin: "0 0 7px",
  color: "#94a3b8",
  fontSize: "12px",
  fontWeight: 800,
};

const lockedFieldValueStyle = {
  margin: "0 0 7px",
  color: "white",
  fontSize: "15px",
  fontWeight: 800,
};

const lockedFieldHelpStyle = {
  margin: 0,
  color: "#7485a0",
  fontSize: "11px",
  lineHeight: 1.45,
};

const availabilityListStyle = {
  display: "grid",
  gap: "11px",
};

const availabilityRowStyle = {
  display: "grid",
  gridTemplateColumns:
    "42px minmax(170px, 1fr) 26px minmax(170px, 1fr) auto",
  alignItems: "end",
  gap: "12px",
  padding: "15px",
  background: "#0f172a",
  border: "1px solid #31415c",
  borderRadius: "10px",
};

const windowNumberStyle = {
  display: "grid",
  placeItems: "center",
  width: "38px",
  height: "38px",
  marginBottom: "1px",
  color: "#bfdbfe",
  background: "rgba(37, 99, 235, 0.2)",
  border: "1px solid #2563eb",
  borderRadius: "9px",
  fontWeight: 900,
};

const timeFieldStyle = {
  display: "grid",
  gap: "6px",
};

const compactLabelStyle = {
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
};

const compactInputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  color: "white",
  background: "#111a2d",
  border: "1px solid #3e4f6b",
  borderRadius: "8px",
  fontSize: "15px",
};

const arrowStyle = {
  paddingBottom: "11px",
  color: "#60a5fa",
  fontSize: "20px",
  fontWeight: 900,
  textAlign: "center" as const,
};

const removeWindowButtonStyle = {
  padding: "11px 14px",
  color: "#fecaca",
  background: "rgba(127, 29, 29, 0.28)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  fontWeight: 800,
};

const primaryButtonStyle = {
  padding: "12px 18px",
  color: "white",
  background: "#2563eb",
  border: "1px solid #3b82f6",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 900,
  whiteSpace: "nowrap" as const,
};

const secondaryButtonStyle = {
  padding: "11px 16px",
  marginTop: "14px",
  color: "#dbeafe",
  background: "#24344d",
  border: "1px solid #3e5273",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 800,
};

const supervisionPanelStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.4fr) minmax(290px, 0.6fr)",
  gap: "24px",
  padding: "26px",
  color: "white",
  background:
    "linear-gradient(135deg, #111c33 0%, #172554 100%)",
  border: "1px solid #29406c",
  borderRadius: "14px",
  boxShadow:
    "0 14px 36px rgba(2, 6, 23, 0.2)",
};

const supervisionCopyStyle = {
  alignSelf: "center",
};

const supervisionMetaStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginTop: "18px",
  flexWrap: "wrap" as const,
};

const statusPillStyle = {
  padding: "7px 11px",
  border: "1px solid",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 900,
};

const supervisionHintStyle = {
  color: "#8fa0ba",
  fontSize: "12px",
};

const supervisionControlsStyle = {
  display: "grid",
  gap: "17px",
  padding: "18px",
  background: "rgba(15, 23, 42, 0.72)",
  border: "1px solid #31415c",
  borderRadius: "11px",
};

const switchButtonStyle = {
  position: "relative" as const,
  width: "92px",
  height: "42px",
  padding: "0",
  border: "1px solid",
  borderRadius: "999px",
  cursor: "pointer",
  transition: "all 160ms ease",
};

const switchKnobStyle = {
  position: "absolute" as const,
  top: "6px",
  left: "6px",
  width: "28px",
  height: "28px",
  background: "white",
  borderRadius: "999px",
  boxShadow: "0 3px 10px rgba(0, 0, 0, 0.28)",
  transition: "transform 160ms ease",
};

const switchTextStyle = {
  position: "absolute" as const,
  top: "50%",
  right: "12px",
  transform: "translateY(-50%)",
  color: "white",
  fontSize: "10px",
  fontWeight: 900,
};

const toolRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "20px",
  padding: "18px",
  background: "#0f172a",
  border: "1px solid #31415c",
  borderRadius: "10px",
  flexWrap: "wrap" as const,
};

const toolTitleStyle = {
  color: "white",
  fontSize: "15px",
};

const toolDescriptionStyle = {
  maxWidth: "680px",
  margin: "7px 0 0",
  color: "#94a3b8",
  lineHeight: 1.5,
};

const saveBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "20px",
  padding: "20px 22px",
  color: "white",
  background: "#111a2d",
  border: "1px solid #31415c",
  borderRadius: "12px",
  flexWrap: "wrap" as const,
};

const saveBarTitleStyle = {
  color: "#e6efff",
};

const saveBarTextStyle = {
  margin: "5px 0 0",
  color: "#7f90aa",
  fontSize: "12px",
};

const saveActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const messageBoxStyle = {
  padding: "14px 16px",
  color: "#e2e8f0",
  background: "#111a2d",
  border: "1px solid #31415c",
  borderRadius: "10px",
};

const mutedStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.55,
};

const warningStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#fde68a",
  background: "rgba(120, 53, 15, 0.3)",
  border: "1px solid #a16207",
  borderRadius: "8px",
};

const textareaStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  minHeight: "340px",
  marginTop: "8px",
  padding: "14px",
  color: "white",
  background: "#0f172a",
  border: "1px solid #475569",
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

const previewStyle = {
  marginTop: "22px",
  padding: "20px",
  background: "#0f172a",
  border: "1px solid #334155",
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
  background: "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
};

const parserWarningStyle = {
  padding: "14px",
  marginTop: "16px",
  color: "#fde68a",
  background: "rgba(120, 53, 15, 0.3)",
  border: "1px solid #a16207",
  borderRadius: "8px",
};

const listStyle = {
  margin: "10px 0 0",
  paddingLeft: "20px",
  lineHeight: 1.5,
};

const aboutCardStyle = {
  padding: "26px",
  color: "white",
  background:
    "linear-gradient(145deg, #111c33 0%, #172033 58%, #172554 100%)",
  border: "1px solid #2b3b57",
  borderRadius: "14px",
  boxShadow:
    "0 18px 45px rgba(2, 6, 23, 0.22)",
};

const aboutHeaderStyle = {
  display: "grid",
  gridTemplateColumns:
    "72px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "18px",
  marginBottom: "22px",
};

const aboutLogoStyle = {
  width: "72px",
  height: "72px",
  display: "grid",
  placeItems: "center",
};

const aboutLogoImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain" as const,
};

const aboutEyebrowStyle = {
  margin: "0 0 6px",
  color: "#60a5fa",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.12em",
};

const aboutTitleStyle = {
  margin: "0 0 7px",
  fontSize: "24px",
};

const aboutDescriptionStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.55,
};

const releaseBadgeStyle = {
  padding: "7px 10px",
  color: "#bbf7d0",
  backgroundColor: "rgba(20, 83, 45, 0.32)",
  border: "1px solid #166534",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  whiteSpace: "nowrap" as const,
};

const aboutDetailsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
};

const aboutDetailStyle = {
  display: "grid",
  gap: "6px",
  padding: "14px",
  backgroundColor: "rgba(15, 23, 42, 0.76)",
  border: "1px solid #334155",
  borderRadius: "9px",
};

const aboutDetailLabelStyle = {
  color: "#64748b",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const aboutDetailValueStyle = {
  color: "#dbeafe",
  fontSize: "13px",
  overflowWrap: "anywhere" as const,
};

const aboutFooterStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
  padding: "16px",
  marginTop: "16px",
  backgroundColor: "rgba(15, 23, 42, 0.62)",
  border: "1px solid #334155",
  borderRadius: "10px",
  flexWrap: "wrap" as const,
};

const aboutFooterTitleStyle = {
  color: "#e2e8f0",
};

const aboutFooterTextStyle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: 1.5,
};

const publicLinkStyle = {
  padding: "11px 15px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "1px solid #3b82f6",
  borderRadius: "8px",
  textDecoration: "none",
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
  background: "rgba(2, 6, 23, 0.88)",
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
