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

      if ([
        "Field Training Manager",
        "Field Training Supervisor",
        "STAFF",
      ].includes(user.role)) {
        await supabase
          .from("ftp_supervision_preferences")
          .upsert({
            profile_id: user.id,
            available_for_p1s: availableForP1s,
            max_active_p1s: Math.min(maxP1s, 4),
          });
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
      <section style={cardStyle}>
        <h2>
          Account Settings
        </h2>

        <div style={gridStyle}>
          <Field
            label="Character Name"
          >
            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              style={input}
            />
          </Field>

          <Field
            label="Badge Number"
          >
            <input
              value={badge}
              onChange={(event) =>
                setBadge(
                  event.target.value
                )
              }
              style={input}
            />
          </Field>

          {isProbationaryOfficer ? (
            <LockedProfileField
              label="Police Rank"
              value="Police Officer I"
              helpText="Your rank will become editable once you become a Field Training Officer."
            />
          ) : (
            <Field
              label="LSPD Rank"
            >
              <select
                value={rank}
                onChange={(event) =>
                  setRank(
                    event.target.value
                  )
                }
                style={input}
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
              helpText="New Probationary Officers begin in Mission Row Division."
            />
          ) : (
            <Field
              label="Division"
            >
              <select
                value={division}
                onChange={(event) =>
                  setDivision(
                    event.target.value
                  )
                }
                style={input}
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

          <Field
            label="Work Number"
          >
            <input
              value={
                workNumber
              }
              onChange={(event) =>
                setWorkNumber(
                  event.target.value
                )
              }
              style={input}
            />
          </Field>

          <Field
            label="FTP Role"
          >
            <input
              value={
                user.role ||
                "Probationary Officer"
              }
              disabled
              style={{
                ...input,
                opacity: 0.6,
              }}
            />
          </Field>
        </div>

        <section style={{ marginTop: "30px" }}>
          <h2>FTP Tools</h2>

          <div style={tabContainerStyle}>
            <button
              type="button"
              onClick={() => setFtpToolTab("availability")}
              style={ftpToolTab === "availability" ? activeTabStyle : tabStyle}
            >
              Server Availability
            </button>

            <button
              type="button"
              onClick={() => setFtpToolTab("import")}
              style={ftpToolTab === "import" ? activeTabStyle : tabStyle}
            >
              FTO BBCode Importer
            </button>
          </div>

          {ftpToolTab === "availability" && (
          <>
          <h2>Server Availability</h2>

          <p style={mutedStyle}>
            Tell FTP when you are normally available on GTA:W server time.
            Multiple availability windows are supported.
          </p>

          {availabilityWindows.map((window, index) => (
            <div key={index} style={availabilityBoxStyle}>
              <label style={labelStyle}>Available From</label>
              <input
                type="time"
                value={window.start_time}
                onChange={(event) =>
                  updateAvailabilityWindow(index, "start_time", event.target.value)
                }
                style={input}
              />

              <label style={labelStyle}>Available Until</label>
              <input
                type="time"
                value={window.end_time}
                onChange={(event) =>
                  updateAvailabilityWindow(index, "end_time", event.target.value)
                }
                style={input}
              />

              {availabilityWindows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAvailabilityWindow(index)}
                  style={requestButton}
                >
                  Remove Window
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addAvailabilityWindow}
            style={requestButton}
          >
            + Add Availability Window
          </button>

          {[
            "Field Training Manager",
            "Field Training Supervisor",
            "STAFF",
          ].includes(user.role) && (
            <>
              <h2>Probationer Supervision</h2>

              <p style={mutedStyle}>
                Enable this if you are available to take probationary officers.
              </p>

              <select
                value={availableForP1s ? "yes" : "no"}
                onChange={(event) =>
                  setAvailableForP1s(event.target.value === "yes")
                }
                style={input}
              >
                <option value="no">Not available for P1s</option>
                <option value="yes">Available for P1s</option>
              </select>

              <input
                type="number"
                min={1}
                max={4}
                value={maxP1s}
                onChange={(event) =>
                  setMaxP1s(Number(event.target.value))
                }
                style={input}
              />
            </>
          )}
          </>
          )}

          {ftpToolTab === "import" && canImportFTOFile && (
            <p style={mutedStyle}>
              Use the FTO BBCode Importer below.
            </p>
          )}
        </section>

        <button
          type="button"
          onClick={save}
          disabled={
            savingProfile
          }
          style={{
            ...button,
            opacity:
              savingProfile
                ? 0.7
                : 1,
          }}
        >
          {savingProfile
            ? "Saving..."
            : "Save Changes"}
        </button>

        {user.role ===
          "Probationary Officer" &&
          !user.requested_role && (
            <button
              type="button"
              onClick={
                requestFTO
              }
              style={
                requestButton
              }
            >
              Request Field
              Training Officer
              Status
            </button>
          )}

        {message && (
          <p style={messageStyle}>
            {message}
          </p>
        )}
      </section>

      {ftpToolTab === "import" && canImportFTOFile && (
        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2
                style={{
                  margin:
                    "0 0 6px",
                }}
              >
                Manual FTO File Import
              </h2>

              <p style={mutedStyle}>
                Import or replace your existing
                forum FTO file without leaving
                Settings.
              </p>
            </div>

            <span style={badgeStyle}>
              FTO TOOLS
            </span>
          </div>

          <div style={importSummaryStyle}>
            <div>
              <strong>
                Import an existing FTO file
              </strong>

              <p style={importSummaryTextStyle}>
                Paste your full BBCode, preview
                the parsed data and confirm the
                replacement of your imported
                history.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setImportModalOpen(true);
                setImportMessage("");
              }}
              style={openImportButtonStyle}
            >
              Import FTO File
            </button>
          </div>
        </section>
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

const aboutCardStyle = {
  padding: "28px",
  color: "white",
  background:
    "linear-gradient(145deg, #111c33 0%, #172033 58%, #172554 100%)",
  border:
    "1px solid #2b3b57",
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
  backgroundColor:
    "rgba(20, 83, 45, 0.32)",
  border:
    "1px solid #166534",
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
  backgroundColor:
    "rgba(15, 23, 42, 0.76)",
  border:
    "1px solid #334155",
  borderRadius: "9px",
};

const aboutDetailLabelStyle = {
  color: "#64748b",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform:
    "uppercase" as const,
};

const aboutDetailValueStyle = {
  color: "#dbeafe",
  fontSize: "13px",
  overflowWrap:
    "anywhere" as const,
};

const aboutFooterStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  gap: "18px",
  padding: "16px",
  marginTop: "16px",
  backgroundColor:
    "rgba(15, 23, 42, 0.62)",
  border:
    "1px solid #334155",
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
  border:
    "1px solid #3b82f6",
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