"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import {
  getRoleDisplayName as getCentralRoleDisplayName,
  normaliseRole,
} from "../lib/permissions";

type PersonnelManagementProps = {
  currentUser: any;
};

type PersonnelProfile = {
  id: string;
  name: string | null;
  rank: string | null;
  badge_number: string | null;
  work_number: string | null;
  division: string | null;
  role: string | null;
  profile_complete: boolean | null;
  requested_role: string | null;
  role_request_status: string | null;
  must_change_password: boolean | null;
};

type TraineeRecord = {
  id: string;
  profile_id: string;
  status: string | null;
  assigned_ftm: string | null;
  start_date?: string | null;
};

type FTOFileRecord = {
  id: string;
  profile_id: string;
  induction_date?: string | null;
  final_evaluation_date?: string | null;
  probationary_passed_date?: string | null;
  total_instruction_minutes?: number | null;
};

type DORRecord = {
  id: string;
  trainee_id: string;
  fto_id: string;
  status: string | null;
  patrol_date?: string | null;
  duration?: string | null;
};

type PersonnelUser = PersonnelProfile & {
  traineeRecord: TraineeRecord | null;
  ftoFile: FTOFileRecord | null;
  submittedDORCount: number;
  receivedDORCount: number;
  lastWrittenDORDate: string | null;
  lastReceivedDORDate: string | null;
};

type QuickFilter =
  | "all"
  | "probationary"
  | "fto"
  | "leadership"
  | "pending";

type DetailTab =
  | "overview"
  | "records"
  | "access";

type PersonnelAnalysis = {
  profile: {
    id: string;
    name: string | null;
    role: string | null;
    rank: string | null;
    badge_number: string | null;
    work_number: string | null;
    division: string | null;
  };
  records: {
    traineeRecordExists: boolean;
    traineeRecordId: string | null;
    traineeStatus: string | null;
    notebookItemCount: number;
    receivedDORCount: number;
    writtenDORCount: number;
    ftoFileExists: boolean;
    ftoFileId: string | null;
    ftoLogEntryCount: number;
    totalInstructionMinutes: number;
    importRequestCount: number;
    assignedTraineeCount: number;
    activeAssignedTraineeCount: number;
  };
  blockers: string[];
  safeToDelete: boolean;
};

const roleOptions = [
  "No FTP Access",
  "Probationary Officer",
  "Field Training Officer",
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "LSPD STAFF",
];

const personnelManagementRoles = [
  "STAFF",
  "LSPD STAFF",
  "FTP Staff",
  "Field Training Manager",
  "Field Training Supervisor",
];

const passwordResetRoles = [
  "Field Training Supervisor",
  "FTP Staff",
  "LSPD STAFF",
];

export default function PersonnelManagement({
  currentUser,
}: PersonnelManagementProps) {
  const canManagePersonnel =
    personnelManagementRoles.includes(
      normaliseRole(currentUser.role)
    );

  const canResetPasswords =
    passwordResetRoles.includes(
      normaliseRole(
        currentUser.role
      )
    );

  const [personnel, setPersonnel] =
    useState<PersonnelUser[]>([]);

  const [selectedUserId, setSelectedUserId] =
    useState<string | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("All Roles");

  const [quickFilter, setQuickFilter] =
    useState<QuickFilter>("all");

  const [detailTab, setDetailTab] =
    useState<DetailTab>("overview");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [editedRole, setEditedRole] =
    useState("");

  const [analysis, setAnalysis] =
    useState<PersonnelAnalysis | null>(null);

  const [analysing, setAnalysing] =
    useState(false);

  const [personnelAction, setPersonnelAction] =
    useState<
      | "deleteNotebook"
      | "deleteFTOFile"
      | "deleteAccount"
      | null
    >(null);

  const [
    resettingPassword,
    setResettingPassword,
  ] = useState(false);

  const [
    temporaryPassword,
    setTemporaryPassword,
  ] = useState("");

  const [
    temporaryPasswordUserId,
    setTemporaryPasswordUserId,
  ] = useState<string | null>(
    null
  );

  const [
    temporaryPasswordUserName,
    setTemporaryPasswordUserName,
  ] = useState("");

  const [
    passwordCopied,
    setPasswordCopied,
  ] = useState(false);

  useEffect(() => {
    void loadPersonnel();
  }, []);

  const selectedUser =
    personnel.find(
      (person) =>
        person.id === selectedUserId
    ) ?? null;

  useEffect(() => {
    setEditedRole(
      selectedUser?.role ?? ""
    );

    setDetailTab("overview");
    setAnalysis(null);
    setPersonnelAction(null);
    setError("");
    setSuccessMessage("");
    setTemporaryPassword("");
    setTemporaryPasswordUserId(
      null
    );
    setTemporaryPasswordUserName("");
    setPasswordCopied(false);
  }, [selectedUserId]);

  const filteredPersonnel =
    useMemo(() => {
      const normalisedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return personnel.filter(
        (person) => {
          const matchesRole =
            roleFilter ===
              "All Roles" ||
            normaliseRole(
              person.role
            ) ===
              roleFilter;

          const matchesQuickFilter =
            matchesPersonnelQuickFilter(
              person,
              quickFilter
            );

          const searchableText = [
            person.name,
            person.rank,
            person.badge_number,
            person.work_number,
            person.division,
            person.role,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            normalisedSearch === "" ||
            searchableText.includes(
              normalisedSearch
            );

          return (
            matchesRole &&
            matchesQuickFilter &&
            matchesSearch
          );
        }
      );
    }, [
      personnel,
      quickFilter,
      roleFilter,
      searchTerm,
    ]);

  async function loadPersonnel() {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const [
        profilesResult,
        traineesResult,
        ftoFilesResult,
        dorsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id,
            name,
            rank,
            badge_number,
            work_number,
            division,
            role,
            profile_complete,
            requested_role,
            role_request_status,
            must_change_password
          `)
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("trainees")
          .select(`
            id,
            profile_id,
            status,
            assigned_ftm,
            start_date
          `),

        supabase
          .from("fto_files")
          .select(`
            id,
            profile_id,
            induction_date,
            final_evaluation_date,
            probationary_passed_date,
            total_instruction_minutes
          `),

        supabase
          .from("dors")
          .select(`
            id,
            trainee_id,
            fto_id,
            status,
            patrol_date,
            duration
          `),
      ]);

      if (profilesResult.error) {
        throw profilesResult.error;
      }

      if (traineesResult.error) {
        throw traineesResult.error;
      }

      if (ftoFilesResult.error) {
        throw ftoFilesResult.error;
      }

      if (dorsResult.error) {
        throw dorsResult.error;
      }

      const profiles =
        profilesResult.data ?? [];

      const trainees =
        traineesResult.data ?? [];

      const ftoFiles =
        ftoFilesResult.data ?? [];

      const dors =
        dorsResult.data ?? [];

      const combinedPersonnel =
        profiles.map(
          (profile) => {
            const traineeRecord =
              trainees.find(
                (trainee) =>
                  trainee.profile_id ===
                  profile.id
              ) ?? null;

            const ftoFile =
              ftoFiles.find(
                (file) =>
                  file.profile_id ===
                  profile.id
              ) ?? null;

            const writtenDORs =
              dors.filter(
                (dor) =>
                  dor.fto_id ===
                    profile.id &&
                  dor.status ===
                    "submitted"
              );

            const receivedDORs =
              traineeRecord
                ? dors.filter(
                    (dor) =>
                      dor.trainee_id ===
                        traineeRecord.id &&
                      dor.status ===
                        "submitted"
                  )
                : [];

            return {
              ...profile,
              role:
                normaliseRole(
                  profile.role
                ),
              traineeRecord,
              ftoFile,
              submittedDORCount:
                writtenDORs.length,
              receivedDORCount:
                receivedDORs.length,
              lastWrittenDORDate:
                getLatestDate(
                  writtenDORs.map(
                    (dor) =>
                      dor.patrol_date ??
                      null
                  )
                ),
              lastReceivedDORDate:
                getLatestDate(
                  receivedDORs.map(
                    (dor) =>
                      dor.patrol_date ??
                      null
                  )
                ),
            };
          }
        );

      setPersonnel(
        combinedPersonnel
      );

      if (
        selectedUserId &&
        !combinedPersonnel.some(
          (person) =>
            person.id ===
            selectedUserId
        )
      ) {
        setSelectedUserId(null);
      }
    } catch (loadError) {
      console.error(
        "LOAD PERSONNEL ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Personnel records could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveRoleChange() {
    if (!selectedUser) {
      return;
    }

    if (!editedRole) {
      setError(
        "Select a role before saving."
      );

      return;
    }

    if (
      selectedUser.id ===
        currentUser.id &&
      editedRole !==
        selectedUser.role
    ) {
      const confirmed =
        window.confirm(
          "You are changing your own role. This may remove your access to Personnel Management. Continue?"
        );

      if (!confirmed) {
        return;
      }
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const {
        error: updateError,
      } = await supabase
        .from("profiles")
        .update({
          role:
            normaliseRole(
              editedRole
            ),
        })
        .eq(
          "id",
          selectedUser.id
        );

      if (updateError) {
        throw updateError;
      }

      setPersonnel(
        (current) =>
          current.map(
            (person) =>
              person.id ===
              selectedUser.id
                ? {
                    ...person,
                    role:
                      normaliseRole(
                        editedRole
                      ),
                  }
                : person
          )
      );

      setSuccessMessage(
        `${selectedUser.name ?? "User"} is now ${getRoleDisplayName(
          normaliseRole(
            editedRole
          )
        )}.`
      );
    } catch (saveError) {
      console.error(
        "SAVE PERSONNEL ROLE ERROR",
        saveError
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "The role change could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  async function analyseAccount() {
    if (!selectedUser) {
      return;
    }

    setAnalysing(true);
    setAnalysis(null);
    setError("");
    setSuccessMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your login session could not be found. Please log in again."
        );
      }

      const response =
        await fetch(
          "/api/personnel",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              action: "analyse",
              userId:
                selectedUser.id,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ??
          "The account analysis failed."
        );
      }

      setAnalysis(
        result as PersonnelAnalysis
      );

      setSuccessMessage(
        `${selectedUser.name ?? "Account"} analysed successfully.`
      );
    } catch (analysisError) {
      console.error(
        "ANALYSE ACCOUNT ERROR",
        analysisError
      );

      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "The account analysis failed."
      );
    } finally {
      setAnalysing(false);
    }
  }

  async function runPersonnelAction(
    action:
      | "deleteNotebook"
      | "deleteFTOFile"
      | "deleteAccount"
  ) {
    if (!selectedUser) {
      return;
    }

    const labels = {
      deleteNotebook:
        "Delete this probationary notebook and all DORs received by this trainee?",
      deleteFTOFile:
        "Delete this FTO file, its log entries and import requests?",
      deleteAccount:
        `Permanently delete ${selectedUser.name ?? "this account"}, the login account and all linked FTP data?`,
    };

    if (!window.confirm(labels[action])) {
      return;
    }

    if (
      action === "deleteAccount" &&
      !window.confirm(
        "This action cannot be undone. Confirm permanent account deletion."
      )
    ) {
      return;
    }

    setPersonnelAction(action);
    setError("");
    setSuccessMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your login session could not be found. Please log in again."
        );
      }

      const response = await fetch(
        "/api/personnel",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            action,
            userId: selectedUser.id,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ??
          "The personnel action failed."
        );
      }

      setSuccessMessage(
        result?.message ??
        "The personnel action completed successfully."
      );

      if (
        action === "deleteAccount"
      ) {
        setSelectedUserId(null);
        setAnalysis(null);
      }

      await loadPersonnel();

      if (
        action !== "deleteAccount"
      ) {
        await analyseAccount();
      }
    } catch (actionError) {
      console.error(
        "PERSONNEL ACTION ERROR",
        actionError
      );

      setError(
        actionError instanceof Error
          ? actionError.message
          : "The personnel action failed."
      );
    } finally {
      setPersonnelAction(null);
    }
  }

  async function resetSelectedPassword() {
    if (
      !selectedUser ||
      !canResetPasswords
    ) {
      return;
    }

    if (
      selectedUser.id ===
      currentUser.id
    ) {
      setError(
        "You cannot use the staff password reset tool on your own account."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Reset the password for ${selectedUser.name ?? "this account"}? Their current password will stop working immediately.`
      );

    if (!confirmed) {
      return;
    }

    setResettingPassword(true);
    setError("");
    setSuccessMessage("");
    setTemporaryPassword("");
    setTemporaryPasswordUserId(
      null
    );
    setTemporaryPasswordUserName("");
    setPasswordCopied(false);

    try {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const accessToken =
        sessionData.session
          ?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your login session could not be found. Please log in again."
        );
      }

      const response =
        await fetch(
          "/api/admin/reset-password",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${accessToken}`,
            },
            body:
              JSON.stringify({
                userId:
                  selectedUser.id,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ??
          "The password reset failed."
        );
      }

      const generatedPassword =
        typeof result
          ?.temporaryPassword ===
          "string"
          ? result.temporaryPassword
          : "";

      if (!generatedPassword) {
        throw new Error(
          "The password was reset, but no temporary password was returned."
        );
      }

      setTemporaryPassword(
        generatedPassword
      );

      setTemporaryPasswordUserId(
        selectedUser.id
      );

      setTemporaryPasswordUserName(
        result?.userName ??
        selectedUser.name ??
        "Selected User"
      );

      setPersonnel(
        (current) =>
          current.map(
            (person) =>
              person.id ===
              selectedUser.id
                ? {
                    ...person,
                    must_change_password:
                      true,
                  }
                : person
          )
      );

      setSuccessMessage(
        result?.message ??
        `A temporary password was created for ${selectedUser.name ?? "the selected account"}.`
      );
    } catch (resetError) {
      console.error(
        "RESET PERSONNEL PASSWORD ERROR",
        resetError
      );

      setError(
        resetError instanceof Error
          ? resetError.message
          : "The password reset failed."
      );
    } finally {
      setResettingPassword(false);
    }
  }

  async function copyTemporaryPassword() {
    if (!temporaryPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        temporaryPassword
      );

      setPasswordCopied(true);

      window.setTimeout(
        () => {
          setPasswordCopied(
            false
          );
        },
        2000
      );
    } catch (copyError) {
      console.error(
        "COPY TEMPORARY PASSWORD ERROR",
        copyError
      );

      setError(
        "The temporary password could not be copied. Select and copy it manually."
      );
    }
  }

  function clearTemporaryPassword() {
    setTemporaryPassword("");
    setTemporaryPasswordUserId(
      null
    );
    setTemporaryPasswordUserName("");
    setPasswordCopied(false);
  }

  function selectPerson(
    personId: string
  ) {
    setSelectedUserId(personId);
  }

  if (!canManagePersonnel) {
    return (
      <div style={cardStyle}>
        <h2 style={pageTitleStyle}>
          Personnel Management
        </h2>
        <p style={mutedStyle}>
          You do not have permission to manage personnel accounts.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={cardStyle}>
        Loading personnel records...
      </div>
    );
  }

  return (
    <div>
      <div style={pageHeaderStyle}>
        <div>
          <h2 style={pageTitleStyle}>
            Personnel Management
          </h2>

          <p style={mutedStyle}>
            Review officer accounts,
            FTP records and access roles.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadPersonnel()
          }
          style={secondaryButtonStyle}
        >
          Refresh Personnel
        </button>
      </div>

      <div style={statsGridStyle}>
        <StatCard
          label="Total Accounts"
          value={personnel.length}
        />

        <StatCard
          label="Probationary Officers"
          value={
            personnel.filter(
              (person) =>
                person.role ===
                "Probationary Officer"
            ).length
          }
        />

        <StatCard
          label="FTOs"
          value={
            personnel.filter(
              (person) =>
                person.role ===
                "Field Training Officer"
            ).length
          }
        />

        <StatCard
          label="FTP Leadership"
          value={
            personnel.filter(
              (person) =>
                isLeadershipRole(
                  person.role
                )
            ).length
          }
        />
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

      <div style={quickFilterBarStyle}>
        <QuickFilterButton
          label="All"
          active={quickFilter === "all"}
          onClick={() =>
            setQuickFilter("all")
          }
        />

        <QuickFilterButton
          label="Probationary"
          active={
            quickFilter ===
            "probationary"
          }
          onClick={() =>
            setQuickFilter(
              "probationary"
            )
          }
        />

        <QuickFilterButton
          label="FTO"
          active={quickFilter === "fto"}
          onClick={() =>
            setQuickFilter("fto")
          }
        />

        <QuickFilterButton
          label="Leadership"
          active={
            quickFilter ===
            "leadership"
          }
          onClick={() =>
            setQuickFilter(
              "leadership"
            )
          }
        />

        <QuickFilterButton
          label="Pending Requests"
          active={
            quickFilter === "pending"
          }
          onClick={() =>
            setQuickFilter("pending")
          }
        />
      </div>

      <div style={managementGridStyle}>
        <div style={cardStyle}>
          <div style={filtersStyle}>
            <div style={filterFieldStyle}>
              <label style={labelStyle}>
                Search
              </label>

              <input
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Name, badge, work number or division"
                style={inputStyle}
              />
            </div>

            <div style={roleFilterStyle}>
              <label style={labelStyle}>
                Role
              </label>

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option>
                  All Roles
                </option>

                {roleOptions.map(
                  (role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {role}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div style={listHeaderStyle}>
            <strong>
              Personnel
            </strong>

            <span style={countBadgeStyle}>
              {filteredPersonnel.length}{" "}
              shown
            </span>
          </div>

          {filteredPersonnel.length ===
          0 ? (
            <div style={emptyStyle}>
              No personnel match the
              current filters.
            </div>
          ) : (
            <div style={personnelListStyle}>
              {filteredPersonnel.map(
                (person) => {
                  const isSelected =
                    selectedUserId ===
                    person.id;

                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() =>
                        selectPerson(
                          person.id
                        )
                      }
                      style={{
                        ...personRowStyle,
                        borderColor:
                          isSelected
                            ? "#2563eb"
                            : "#334155",
                        backgroundColor:
                          isSelected
                            ? "rgba(37, 99, 235, 0.14)"
                            : "#0f172a",
                      }}
                    >
                      <div style={personMainStyle}>
                        <div style={personNameRowStyle}>
                          <strong>
                            {person.name ??
                              "Unnamed Account"}
                          </strong>

                          {person.id ===
                            currentUser.id && (
                            <span style={youBadgeStyle}>
                              YOU
                            </span>
                          )}
                        </div>

                        <p style={personMetaStyle}>
                          {person.rank ??
                            "No rank"}
                          {" • "}
                          Badge{" "}
                          {person.badge_number ??
                            "N/A"}
                          {" • "}
                          {person.division ??
                            "No division"}
                        </p>

                        <div style={recordBadgeRowStyle}>
                          <RecordBadge
                            label="Notebook"
                            exists={Boolean(
                              person.traineeRecord
                            )}
                          />

                          <RecordBadge
                            label="FTO File"
                            exists={Boolean(
                              person.ftoFile
                            )}
                          />

                          <span style={neutralBadgeStyle}>
                            {person.submittedDORCount}{" "}
                            DORs
                          </span>
                        </div>
                      </div>

                      <div style={personRoleAreaStyle}>
                        <RoleBadge
                          role={person.role}
                        />
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        <div style={detailColumnStyle}>
          {!selectedUser ? (
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>
                Select Personnel
              </h3>

              <p style={mutedStyle}>
                Choose an account from
                the list to open its full
                management profile.
              </p>
            </div>
          ) : (
            <>
              <div style={profileHeaderCardStyle}>
                <div style={detailHeaderStyle}>
                  <div>
                    <RoleBadge
                      role={selectedUser.role}
                    />

                    <h2 style={selectedNameStyle}>
                      {selectedUser.name ??
                        "Unnamed Account"}
                    </h2>

                    <p style={mutedStyle}>
                      {selectedUser.rank ??
                        "No rank"}
                      {" • "}
                      Badge{" "}
                      {selectedUser.badge_number ??
                        "N/A"}
                    </p>
                  </div>

                  {selectedUser.id ===
                    currentUser.id && (
                    <span style={youBadgeStyle}>
                      YOUR ACCOUNT
                    </span>
                  )}
                </div>

                <div style={profileTabsStyle}>
                  <TabButton
                    label="Overview"
                    active={
                      detailTab ===
                      "overview"
                    }
                    onClick={() =>
                      setDetailTab(
                        "overview"
                      )
                    }
                  />

                  <TabButton
                    label="Records"
                    active={
                      detailTab ===
                      "records"
                    }
                    onClick={() =>
                      setDetailTab(
                        "records"
                      )
                    }
                  />

                  <TabButton
                    label="Access"
                    active={
                      detailTab ===
                      "access"
                    }
                    onClick={() =>
                      setDetailTab(
                        "access"
                      )
                    }
                  />
                </div>
              </div>

              {detailTab ===
                "overview" && (
                <OverviewPanel
                  user={selectedUser}
                />
              )}

              {detailTab ===
                "records" && (
                <RecordsPanel
                  user={selectedUser}
                  analysis={analysis}
                  analysing={analysing}
                  analyseAccount={analyseAccount}
                  personnelAction={personnelAction}
                  deleteNotebook={() =>
                    runPersonnelAction(
                      "deleteNotebook"
                    )
                  }
                  deleteFTOFile={() =>
                    runPersonnelAction(
                      "deleteFTOFile"
                    )
                  }
                />
              )}

              {detailTab ===
                "access" && (
                <AccessPanel
                  selectedUser={selectedUser}
                  editedRole={editedRole}
                  setEditedRole={setEditedRole}
                  saving={saving}
                  saveRoleChange={saveRoleChange}
                  clearMessages={() => {
                    setError("");
                    setSuccessMessage("");
                  }}
                  analysis={analysis}
                  analysing={analysing}
                  analyseAccount={analyseAccount}
                  personnelAction={personnelAction}
                  deleteAccount={() =>
                    runPersonnelAction(
                      "deleteAccount"
                    )
                  }
                  canResetPassword={
                    canResetPasswords &&
                    selectedUser.id !==
                      currentUser.id
                  }
                  resettingPassword={
                    resettingPassword
                  }
                  resetPassword={
                    resetSelectedPassword
                  }
                  temporaryPassword={
                    temporaryPasswordUserId ===
                    selectedUser.id
                      ? temporaryPassword
                      : ""
                  }
                  temporaryPasswordUserName={
                    temporaryPasswordUserName
                  }
                  passwordCopied={
                    passwordCopied
                  }
                  copyTemporaryPassword={
                    copyTemporaryPassword
                  }
                  clearTemporaryPassword={
                    clearTemporaryPassword
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({
  user,
}: {
  user: PersonnelUser;
}) {
  return (
    <>
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>
          Officer Details
        </h3>

        <div style={detailsGridStyle}>
          <Detail
            label="Work Number"
            value={
              user.work_number ??
              "Not recorded"
            }
          />

          <Detail
            label="Division"
            value={
              user.division ??
              "Not recorded"
            }
          />

          <Detail
            label="Profile Status"
            value={
              user.profile_complete
                ? "Complete"
                : "Incomplete"
            }
          />

          <Detail
            label="Role Request"
            value={
              user.requested_role
                ? `${user.requested_role} — ${
                    user.role_request_status ??
                    "No status"
                  }`
                : "None"
            }
          />

          <Detail
            label="Password Status"
            value={
              user.must_change_password
                ? "Temporary password issued"
                : "Normal access"
            }
          />
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>
          FTP Activity
        </h3>

        <div style={activityGridStyle}>
          <ActivityCard
            label="DORs Written"
            value={String(
              user.submittedDORCount
            )}
            detail={
              user.lastWrittenDORDate
                ? `Last: ${formatDate(
                    user.lastWrittenDORDate
                  )}`
                : "No submitted DORs"
            }
          />

          <ActivityCard
            label="DORs Received"
            value={String(
              user.receivedDORCount
            )}
            detail={
              user.lastReceivedDORDate
                ? `Last: ${formatDate(
                    user.lastReceivedDORDate
                  )}`
                : "No received DORs"
            }
          />

          <ActivityCard
            label="Notebook"
            value={
              user.traineeRecord
                ? "Active"
                : "None"
            }
            detail={
              user.traineeRecord?.status ??
              "No linked trainee record"
            }
          />

          <ActivityCard
            label="FTO File"
            value={
              user.ftoFile
                ? "Linked"
                : "None"
            }
            detail={
              user.ftoFile
                ? `${formatMinutes(
                    user.ftoFile
                      .total_instruction_minutes ??
                      0
                  )} instruction time`
                : "No linked FTO file"
            }
          />
        </div>
      </div>
    </>
  );
}

function RecordsPanel({
  user,
  analysis,
  analysing,
  analyseAccount,
  personnelAction,
  deleteNotebook,
  deleteFTOFile,
}: {
  user: PersonnelUser;
  analysis: PersonnelAnalysis | null;
  analysing: boolean;
  analyseAccount: () => Promise<void>;
  personnelAction:
    | "deleteNotebook"
    | "deleteFTOFile"
    | "deleteAccount"
    | null;
  deleteNotebook: () => Promise<void>;
  deleteFTOFile: () => Promise<void>;
}) {
  const busy =
    analysing ||
    personnelAction !== null;

  return (
    <>
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>
          Linked FTP Records
        </h3>

        <div style={recordsGridStyle}>
          <RecordCard
            title="Probationary Notebook"
            exists={Boolean(
              user.traineeRecord
            )}
            details={
              user.traineeRecord
                ? `Status: ${
                    user.traineeRecord
                      .status ??
                    "Unknown"
                  }${
                    user.traineeRecord
                      .start_date
                      ? ` • Started ${formatDate(
                          user
                            .traineeRecord
                            .start_date
                        )}`
                      : ""
                  }`
                : "No trainee record is linked to this account."
            }
          />

          <RecordCard
            title="FTO File"
            exists={Boolean(
              user.ftoFile
            )}
            details={
              user.ftoFile
                ? `${formatMinutes(
                    user.ftoFile
                      .total_instruction_minutes ??
                      0
                  )} recorded instruction time.`
                : "No FTO file is linked to this account."
            }
          />

          <RecordCard
            title="DOR Activity"
            exists={
              user.submittedDORCount >
                0 ||
              user.receivedDORCount > 0
            }
            details={`${user.submittedDORCount} written • ${user.receivedDORCount} received`}
          />
        </div>
      </div>

      <div style={dangerCardStyle}>
        <h3 style={dangerTitleStyle}>
          Record Actions
        </h3>

        <p style={dangerTextStyle}>
          Analyse the account first to
          confirm exactly which linked
          records will be removed.
        </p>

        {!analysis && (
          <button
            type="button"
            onClick={() =>
              void analyseAccount()
            }
            disabled={busy}
            style={{
              ...analyseButtonStyle,
              opacity: busy ? 0.65 : 1,
              marginBottom: "12px",
            }}
          >
            {analysing
              ? "Analysing Account..."
              : "Analyse Account"}
          </button>
        )}

        <div style={dangerButtonGridStyle}>
          <button
            type="button"
            onClick={() =>
              void deleteNotebook()
            }
            disabled={
              busy ||
              !analysis?.records
                .traineeRecordExists
            }
            style={{
              ...dangerActionButtonStyle,
              opacity:
                busy ||
                !analysis?.records
                  .traineeRecordExists
                  ? 0.55
                  : 1,
            }}
          >
            {personnelAction ===
            "deleteNotebook"
              ? "Deleting Notebook..."
              : "Delete Notebook"}
          </button>

          <button
            type="button"
            onClick={() =>
              void deleteFTOFile()
            }
            disabled={
              busy ||
              !(
                analysis?.records
                  .ftoFileExists ||
                (analysis?.records
                  .importRequestCount ??
                  0) > 0
              )
            }
            style={{
              ...dangerActionButtonStyle,
              opacity:
                busy ||
                !(
                  analysis?.records
                    .ftoFileExists ||
                  (analysis?.records
                    .importRequestCount ??
                    0) > 0
                )
                  ? 0.55
                  : 1,
            }}
          >
            {personnelAction ===
            "deleteFTOFile"
              ? "Deleting FTO File..."
              : "Delete FTO File"}
          </button>
        </div>
      </div>
    </>
  );
}

function AccessPanel({
  selectedUser,
  editedRole,
  setEditedRole,
  saving,
  saveRoleChange,
  clearMessages,
  analysis,
  analysing,
  analyseAccount,
  personnelAction,
  deleteAccount,
  canResetPassword,
  resettingPassword,
  resetPassword,
  temporaryPassword,
  temporaryPasswordUserName,
  passwordCopied,
  copyTemporaryPassword,
  clearTemporaryPassword,
}: {
  selectedUser: PersonnelUser;
  editedRole: string;
  setEditedRole: (
    role: string
  ) => void;
  saving: boolean;
  saveRoleChange: () => Promise<void>;
  clearMessages: () => void;
  analysis: PersonnelAnalysis | null;
  analysing: boolean;
  analyseAccount: () => Promise<void>;
  personnelAction:
    | "deleteNotebook"
    | "deleteFTOFile"
    | "deleteAccount"
    | null;
  deleteAccount: () => Promise<void>;
  canResetPassword: boolean;
  resettingPassword: boolean;
  resetPassword: () => Promise<void>;
  temporaryPassword: string;
  temporaryPasswordUserName: string;
  passwordCopied: boolean;
  copyTemporaryPassword: () => Promise<void>;
  clearTemporaryPassword: () => void;
}) {
  return (
    <>
      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>
          Access Role
        </h3>

        <label style={labelStyle}>
          Current Role
        </label>

        <select
          value={editedRole}
          onChange={(event) => {
            setEditedRole(
              event.target.value
            );

            clearMessages();
          }}
          disabled={saving}
          style={inputStyle}
        >
          <option value="">
            Select role
          </option>

          {roleOptions.map(
            (role) => (
              <option
                key={role}
                value={role}
              >
                {role}
              </option>
            )
          )}
        </select>

        <button
          type="button"
          onClick={() =>
            void saveRoleChange()
          }
          disabled={
            saving ||
            !editedRole ||
            editedRole ===
              selectedUser.role
          }
          style={{
            ...primaryButtonStyle,
            marginTop: "14px",
            opacity:
              saving ||
              !editedRole ||
              editedRole ===
                selectedUser.role
                ? 0.6
                : 1,
          }}
        >
          {saving
            ? "Saving Role..."
            : "Save Role Change"}
        </button>
      </div>

      <div style={cardStyle}>
        <h3 style={sectionTitleStyle}>
          Password Access
        </h3>

        <p style={mutedStyle}>
          Issue a one-time temporary password when this user cannot access their account.
          Their current password will stop working immediately.
        </p>

        <div style={passwordStatusStyle}>
          <span>
            Current status
          </span>

          <strong>
            {selectedUser.must_change_password
              ? "Temporary password active"
              : "Normal password access"}
          </strong>
        </div>

        {!canResetPassword ? (
          <div style={passwordRestrictedStyle}>
            {selectedUser.id
              ? "Password resets require FTS, FTP Staff or LSPD Staff access. You also cannot reset your own account here."
              : "Password reset is unavailable."}
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              void resetPassword()
            }
            disabled={
              resettingPassword
            }
            style={{
              ...resetPasswordButtonStyle,
              opacity:
                resettingPassword
                  ? 0.65
                  : 1,
            }}
          >
            {resettingPassword
              ? "Generating Temporary Password..."
              : "Reset Password"}
          </button>
        )}

        {temporaryPassword && (
          <div style={temporaryPasswordCardStyle}>
            <div style={temporaryPasswordHeaderStyle}>
              <div>
                <strong>
                  Temporary Password
                </strong>

                <p style={temporaryPasswordWarningStyle}>
                  This password is shown only in this panel. Give it privately to{" "}
                  {temporaryPasswordUserName || "the user"}.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  clearTemporaryPassword
                }
                style={closeTemporaryPasswordButtonStyle}
                aria-label="Hide temporary password"
              >
                ×
              </button>
            </div>

            <div style={temporaryPasswordValueStyle}>
              {temporaryPassword}
            </div>

            <button
              type="button"
              onClick={() =>
                void copyTemporaryPassword()
              }
              style={copyPasswordButtonStyle}
            >
              {passwordCopied
                ? "Copied!"
                : "Copy Password"}
            </button>

            <p style={temporaryPasswordFooterStyle}>
              Do not put this password in an audit note, Discord message history, or any permanent record.
            </p>
          </div>
        )}
      </div>

      <div style={dangerCardStyle}>
        <h3 style={dangerTitleStyle}>
          Account Analysis
        </h3>

        <p style={dangerTextStyle}>
          Analyse the account before
          deletion to identify linked
          records and any blockers.
        </p>

        <button
          type="button"
          onClick={() =>
            void analyseAccount()
          }
          disabled={analysing}
          style={{
            ...analyseButtonStyle,
            opacity:
              analysing ? 0.65 : 1,
          }}
        >
          {analysing
            ? "Analysing Account..."
            : "Analyse Account"}
        </button>

        {analysis && (
          <div style={analysisPanelStyle}>
            <div style={analysisStatusRowStyle}>
              <strong>
                Deletion Status
              </strong>

              <span
                style={
                  analysis.safeToDelete
                    ? safeBadgeStyle
                    : blockedBadgeStyle
                }
              >
                {analysis.safeToDelete
                  ? "SAFE TO DELETE"
                  : "BLOCKED"}
              </span>
            </div>

            <div style={analysisGridStyle}>
              <AnalysisItem
                label="Notebook"
                value={
                  analysis.records
                    .traineeRecordExists
                    ? "Exists"
                    : "None"
                }
              />

              <AnalysisItem
                label="Notebook Items"
                value={String(
                  analysis.records
                    .notebookItemCount
                )}
              />

              <AnalysisItem
                label="DORs Received"
                value={String(
                  analysis.records
                    .receivedDORCount
                )}
              />

              <AnalysisItem
                label="DORs Written"
                value={String(
                  analysis.records
                    .writtenDORCount
                )}
              />

              <AnalysisItem
                label="FTO File"
                value={
                  analysis.records
                    .ftoFileExists
                    ? "Exists"
                    : "None"
                }
              />

              <AnalysisItem
                label="FTO Log Entries"
                value={String(
                  analysis.records
                    .ftoLogEntryCount
                )}
              />

              <AnalysisItem
                label="Import Requests"
                value={String(
                  analysis.records
                    .importRequestCount
                )}
              />

              <AnalysisItem
                label="Assigned Trainees"
                value={String(
                  analysis.records
                    .assignedTraineeCount
                )}
              />
            </div>

            {analysis.blockers.length > 0 && (
              <div style={blockersStyle}>
                <strong>
                  Deletion blockers
                </strong>

                <ul style={blockerListStyle}>
                  {analysis.blockers.map(
                    (blocker) => (
                      <li key={blocker}>
                        {blocker}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={dangerButtonGridStyle}>
          <button
            type="button"
            disabled
            style={disabledDangerButtonStyle}
          >
            Archive Account
          </button>

          <button
            type="button"
            onClick={() =>
              void deleteAccount()
            }
            disabled={
              personnelAction !== null ||
              !analysis?.safeToDelete
            }
            style={{
              ...dangerActionButtonStyle,
              opacity:
                personnelAction !== null ||
                !analysis?.safeToDelete
                  ? 0.55
                  : 1,
            }}
          >
            {personnelAction ===
            "deleteAccount"
              ? "Deleting Account..."
              : "Delete Account Permanently"}
          </button>
        </div>
      </div>
    </>
  );
}

function AnalysisItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={analysisItemStyle}>
      <span style={analysisItemLabelStyle}>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div style={statCardStyle}>
      <p style={statLabelStyle}>
        {label}
      </p>

      <p style={statValueStyle}>
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
    <div style={detailStyle}>
      <p style={detailLabelStyle}>
        {label}
      </p>

      <p style={detailValueStyle}>
        {value}
      </p>
    </div>
  );
}

function ActivityCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div style={activityCardStyle}>
      <p style={activityLabelStyle}>
        {label}
      </p>

      <p style={activityValueStyle}>
        {value}
      </p>

      <p style={activityDetailStyle}>
        {detail}
      </p>
    </div>
  );
}

function RecordBadge({
  label,
  exists,
}: {
  label: string;
  exists: boolean;
}) {
  return (
    <span
      style={
        exists
          ? positiveBadgeStyle
          : missingBadgeStyle
      }
    >
      {exists ? "✓" : "✕"}{" "}
      {label}
    </span>
  );
}

function RecordCard({
  title,
  exists,
  details,
}: {
  title: string;
  exists: boolean;
  details: string;
}) {
  return (
    <div style={recordCardStyle}>
      <div style={recordCardHeaderStyle}>
        <strong>
          {title}
        </strong>

        <span
          style={
            exists
              ? positiveBadgeStyle
              : missingBadgeStyle
          }
        >
          {exists
            ? "Exists"
            : "None"}
        </span>
      </div>

      <p style={recordCardTextStyle}>
        {details}
      </p>
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role: string | null;
}) {
  return (
    <span
      style={{
        ...roleBadgeStyle,
        ...getRoleBadgeStyle(role),
      }}
    >
      {getRoleDisplayName(role)}
    </span>
  );
}

function QuickFilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...quickFilterButtonStyle,
        backgroundColor: active
          ? "#2563eb"
          : "#1e293b",
        borderColor: active
          ? "#3b82f6"
          : "#334155",
      }}
    >
      {label}
    </button>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabButtonStyle,
        color: active
          ? "white"
          : "#94a3b8",
        borderBottomColor: active
          ? "#3b82f6"
          : "transparent",
      }}
    >
      {label}
    </button>
  );
}

function matchesPersonnelQuickFilter(
  person: PersonnelUser,
  filter: QuickFilter
) {
  switch (filter) {
    case "probationary":
      return (
        normaliseRole(
          person.role
        ) ===
        "Probationary Officer"
      );

    case "fto":
      return (
        normaliseRole(
          person.role
        ) ===
        "Field Training Officer"
      );

    case "leadership":
      return isLeadershipRole(
        person.role
      );

    case "pending":
      return (
        person.role_request_status ===
        "pending"
      );

    default:
      return true;
  }
}

function isLeadershipRole(
  role: string | null
) {
  return [
    "Field Training Manager",
    "Field Training Supervisor",
    "FTP Staff",
    "LSPD STAFF",
  ].includes(
    normaliseRole(role)
  );
}

function getRoleDisplayName(
  role: string | null
) {
  const normalised =
    normaliseRole(role);

  if (
    normalised ===
    "FTP Staff"
  ) {
    return "Head of FTP";
  }

  return getCentralRoleDisplayName(
    normalised
  );
}

function getRoleBadgeStyle(
  role: string | null
) {
  switch (role) {
    case "Probationary Officer":
      return {
        color: "#bbf7d0",
        backgroundColor:
          "rgba(20, 83, 45, 0.35)",
        borderColor: "#166534",
      };

    case "Field Training Officer":
      return {
        color: "#bfdbfe",
        backgroundColor:
          "rgba(30, 64, 175, 0.3)",
        borderColor: "#2563eb",
      };

    case "Field Training Manager":
      return {
        color: "#ddd6fe",
        backgroundColor:
          "rgba(91, 33, 182, 0.3)",
        borderColor: "#7c3aed",
      };

    case "Field Training Supervisor":
      return {
        color: "#fed7aa",
        backgroundColor:
          "rgba(154, 52, 18, 0.3)",
        borderColor: "#ea580c",
      };

    case "FTP Staff":
    case "STAFF":
      return {
        color: "#fecaca",
        backgroundColor:
          "rgba(127, 29, 29, 0.35)",
        borderColor: "#dc2626",
      };

    case "LSPD STAFF":
      return {
        color: "#fde68a",
        backgroundColor:
          "rgba(146, 64, 14, 0.30)",
        borderColor: "#d97706",
      };

    default:
      return {
        color: "#cbd5e1",
        backgroundColor: "#334155",
        borderColor: "#475569",
      };
  }
}

function getLatestDate(
  values: Array<string | null>
) {
  const validDates = values
    .filter(
      (value): value is string =>
        Boolean(value)
    )
    .sort((first, second) =>
      second.localeCompare(first)
    );

  return validDates[0] ?? null;
}

function formatDate(
  value: string
) {
  return new Date(
    `${value}T00:00:00Z`
  ).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  );
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

const pageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
};

const pageTitleStyle = {
  margin: "0 0 8px",
};

const mutedStyle = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.5,
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const statCardStyle = {
  padding: "18px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const statLabelStyle = {
  margin: "0 0 8px",
  color: "#94a3b8",
  fontSize: "13px",
};

const statValueStyle = {
  margin: 0,
  fontSize: "26px",
  fontWeight: 900,
};

const quickFilterBarStyle = {
  display: "flex",
  gap: "8px",
  marginBottom: "16px",
  flexWrap: "wrap" as const,
};

const quickFilterButtonStyle = {
  padding: "8px 12px",
  color: "white",
  border: "1px solid",
  borderRadius: "999px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 800,
};

const managementGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.15fr) minmax(380px, 0.85fr)",
  gap: "20px",
  alignItems: "start",
};

const detailColumnStyle = {
  display: "grid",
  gap: "20px",
  position: "sticky" as const,
  top: "20px",
};

const cardStyle = {
  padding: "22px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const profileHeaderCardStyle = {
  ...cardStyle,
  paddingBottom: 0,
};

const filtersStyle = {
  display: "flex",
  alignItems: "end",
  gap: "12px",
  marginBottom: "18px",
  flexWrap: "wrap" as const,
};

const filterFieldStyle = {
  flex: "1 1 280px",
};

const roleFilterStyle = {
  flex: "0 1 220px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  color: "#cbd5e1",
  fontSize: "13px",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  color: "white",
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const listHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "10px",
};

const countBadgeStyle = {
  padding: "5px 9px",
  color: "#bfdbfe",
  backgroundColor:
    "rgba(37, 99, 235, 0.16)",
  border: "1px solid #2563eb",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const personnelListStyle = {
  display: "grid",
  gap: "8px",
};

const personRowStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  padding: "13px 14px",
  color: "white",
  border: "1px solid",
  borderRadius: "9px",
  cursor: "pointer",
  textAlign: "left" as const,
};

const personMainStyle = {
  minWidth: 0,
};

const personNameRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const personMetaStyle = {
  margin: "4px 0 8px",
  color: "#94a3b8",
  fontSize: "12px",
};

const recordBadgeRowStyle = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap" as const,
};

const personRoleAreaStyle = {
  display: "grid",
  justifyItems: "end",
  gap: "8px",
  flexShrink: 0,
};

const roleBadgeStyle = {
  display: "inline-block",
  padding: "5px 9px",
  border: "1px solid",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
  whiteSpace: "nowrap" as const,
};

const positiveBadgeStyle = {
  display: "inline-block",
  padding: "4px 7px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 800,
};

const missingBadgeStyle = {
  display: "inline-block",
  padding: "4px 7px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.3)",
  border: "1px solid #991b1b",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 800,
};

const neutralBadgeStyle = {
  display: "inline-block",
  padding: "4px 7px",
  color: "#cbd5e1",
  backgroundColor: "#334155",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 800,
};

const youBadgeStyle = {
  display: "inline-block",
  padding: "4px 7px",
  color: "#fde68a",
  backgroundColor:
    "rgba(120, 53, 15, 0.3)",
  border: "1px solid #a16207",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const emptyStyle = {
  padding: "24px",
  color: "#94a3b8",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
  textAlign: "center" as const,
};

const detailHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "15px",
};

const selectedNameStyle = {
  margin: "12px 0 7px",
};

const profileTabsStyle = {
  display: "flex",
  gap: "6px",
  marginTop: "20px",
};

const tabButtonStyle = {
  padding: "11px 12px",
  backgroundColor: "transparent",
  border: "none",
  borderBottom: "3px solid",
  cursor: "pointer",
  fontWeight: 800,
};

const sectionTitleStyle = {
  margin: "0 0 16px",
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "12px",
};

const detailStyle = {
  padding: "13px",
  backgroundColor: "#0f172a",
  borderRadius: "8px",
};

const detailLabelStyle = {
  margin: "0 0 5px",
  color: "#94a3b8",
  fontSize: "12px",
};

const detailValueStyle = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 700,
};

const activityGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "11px",
};

const activityCardStyle = {
  padding: "14px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
};

const activityLabelStyle = {
  margin: "0 0 6px",
  color: "#94a3b8",
  fontSize: "12px",
};

const activityValueStyle = {
  margin: "0 0 6px",
  fontSize: "20px",
  fontWeight: 900,
};

const activityDetailStyle = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "11px",
};

const recordsGridStyle = {
  display: "grid",
  gap: "11px",
};

const recordCardStyle = {
  padding: "14px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "9px",
};

const recordCardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const recordCardTextStyle = {
  margin: "9px 0 0",
  color: "#94a3b8",
  fontSize: "13px",
};

const primaryButtonStyle = {
  width: "100%",
  padding: "12px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryButtonStyle = {
  padding: "10px 14px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const errorStyle = {
  padding: "13px",
  marginBottom: "18px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
};

const successStyle = {
  padding: "13px",
  marginBottom: "18px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "8px",
};

const passwordStatusStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  margin: "16px 0",
  color: "#cbd5e1",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "12px",
};

const resetPasswordButtonStyle = {
  width: "100%",
  padding: "12px",
  color: "white",
  backgroundColor: "#2563eb",
  border: "1px solid #3b82f6",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const passwordRestrictedStyle = {
  padding: "12px",
  color: "#94a3b8",
  backgroundColor: "#111827",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "12px",
  lineHeight: 1.5,
};

const temporaryPasswordCardStyle = {
  display: "grid",
  gap: "12px",
  padding: "16px",
  marginTop: "16px",
  color: "#e2e8f0",
  backgroundColor:
    "rgba(30, 64, 175, 0.18)",
  border: "1px solid #2563eb",
  borderRadius: "10px",
};

const temporaryPasswordHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const temporaryPasswordWarningStyle = {
  margin: "5px 0 0",
  color: "#93c5fd",
  fontSize: "11px",
  lineHeight: 1.5,
};

const closeTemporaryPasswordButtonStyle = {
  padding: "0 5px",
  color: "#bfdbfe",
  backgroundColor: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "22px",
  lineHeight: 1,
};

const temporaryPasswordValueStyle = {
  padding: "13px",
  color: "#f8fafc",
  backgroundColor: "#020617",
  border: "1px solid #475569",
  borderRadius: "8px",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "17px",
  fontWeight: 900,
  letterSpacing: "0.04em",
  overflowWrap: "anywhere" as const,
  userSelect: "all" as const,
};

const copyPasswordButtonStyle = {
  padding: "10px 13px",
  color: "white",
  backgroundColor: "#16a34a",
  border: "1px solid #22c55e",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const temporaryPasswordFooterStyle = {
  margin: 0,
  color: "#fca5a5",
  fontSize: "10px",
  lineHeight: 1.5,
};

const dangerCardStyle = {
  padding: "22px",
  backgroundColor:
    "rgba(69, 10, 10, 0.28)",
  border: "1px solid #991b1b",
  borderRadius: "12px",
};

const dangerTitleStyle = {
  margin: "0 0 9px",
  color: "#fecaca",
};

const dangerTextStyle = {
  margin: "0 0 16px",
  color: "#fca5a5",
  lineHeight: 1.5,
  fontSize: "13px",
};

const analyseButtonStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "14px",
  color: "white",
  backgroundColor: "#b91c1c",
  border: "1px solid #dc2626",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const analysisPanelStyle = {
  display: "grid",
  gap: "14px",
  padding: "16px",
  marginBottom: "14px",
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const analysisStatusRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
};

const analysisGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const analysisItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  padding: "10px",
  backgroundColor: "#111827",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: "12px",
};

const analysisItemLabelStyle = {
  color: "#94a3b8",
};

const safeBadgeStyle = {
  padding: "5px 8px",
  color: "#bbf7d0",
  backgroundColor:
    "rgba(20, 83, 45, 0.35)",
  border: "1px solid #166534",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const blockedBadgeStyle = {
  padding: "5px 8px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 900,
};

const blockersStyle = {
  padding: "12px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.25)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
  fontSize: "12px",
};

const blockerListStyle = {
  margin: "8px 0 0",
  paddingLeft: "18px",
};

const dangerButtonGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

const dangerActionButtonStyle = {
  padding: "11px",
  color: "white",
  backgroundColor: "#b91c1c",
  border: "1px solid #ef4444",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const disabledDangerButtonStyle = {
  padding: "11px",
  color: "#94a3b8",
  backgroundColor: "#1f2937",
  border: "1px solid #475569",
  borderRadius: "8px",
  cursor: "not-allowed",
  fontWeight: 700,
};