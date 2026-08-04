"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import { getTrainees } from "../lib/trainees";
import {
  getCurrentUser,
  logout,
} from "../lib/auth";

import Login from "../components/Login";
import CreateAccount from "../components/CreateAccount";
import ChooseInitialRole from "../components/ChooseInitialRole";
import PersonalDetails from "../components/PersonalDetails";
import CreateNotebook from "../components/CreateNotebook";
import FTOImport from "../components/FTOImport";
import Sidebar from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
import Records from "../components/Records";
import DORForm from "../components/DORForm";
import Settings from "../components/Settings";
import MyNotebook from "../components/MyNotebook";
import RoleRequests from "../components/RoleRequests";
import MyFTOFile from "../components/MyFTOFile";
import FTORecords from "../components/FTORecords";
import PersonnelManagement from "../components/PersonnelManagement";
import TrainingCalendar from "../components/TrainingCalendar";
import FieldTrainingManagementDashboard from "../components/FieldTrainingManagementDashboard";
import BatchManagement from "../components/BatchManagement";
import AuditLog from "../components/AuditLog";

type InitialRole =
  | "Probationary Officer"
  | "Field Training Officer";

const onboardingBypassRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "LSPD STAFF",
];

export default function Home() {
  const [
    user,
    setUser,
  ] = useState<any>(null);

  const [
    creatingAccount,
    setCreatingAccount,
  ] = useState(false);

  const [
    checkingOnboarding,
    setCheckingOnboarding,
  ] = useState(true);

  const [
    needsInitialRole,
    setNeedsInitialRole,
  ] = useState(false);

  const [
    needsProfile,
    setNeedsProfile,
  ] = useState(false);

  const [
    needsNotebook,
    setNeedsNotebook,
  ] = useState(false);

  const [
    needsFTOImport,
    setNeedsFTOImport,
  ] = useState(false);

  const [
    awaitingFTOApproval,
    setAwaitingFTOApproval,
  ] = useState(false);

  const [
    activePage,
    setActivePage,
  ] = useState("Dashboard");

  const [
    trainees,
    setTrainees,
  ] = useState<any[]>([]);

  const [
    selectedTrainee,
    setSelectedTrainee,
  ] = useState<string | null>(
    null
  );

  const [
    dorTrainee,
    setDorTrainee,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function load() {
      setCheckingOnboarding(
        true
      );

      const current =
        await getCurrentUser();

      if (current) {
        setUser(current);

        await checkOnboarding(
          current
        );
      }

      await refreshTrainees();

      setCheckingOnboarding(
        false
      );
    }

    void load();
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const channel =
      supabase
        .channel(
          "profile-role-watch"
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter:
              `id=eq.${user.id}`,
          },
          (payload) => {
            if (
              payload.new.role !==
              user.role
            ) {
              alert(
                "Your FTP role has changed. Please log in again."
              );

              void logout();

              resetSession();
            }
          }
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }, [user]);

  async function refreshTrainees() {
    try {
      const data =
        await getTrainees();

      setTrainees(data);
    } catch (error) {
      console.error(
        "LOAD TRAINEES ERROR",
        error
      );
    }
  }

  function resetOnboardingFlags() {
    setNeedsInitialRole(false);
    setNeedsProfile(false);
    setNeedsNotebook(false);
    setNeedsFTOImport(false);
    setAwaitingFTOApproval(false);
  }

  function resetSession() {
    setUser(null);
    setCreatingAccount(false);
    setCheckingOnboarding(false);
    resetOnboardingFlags();
    setSelectedTrainee(null);
    setDorTrainee(null);
    setActivePage("Dashboard");
  }

  async function getFreshProfile(
    userId: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq(
        "id",
        userId
      )
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async function checkOnboarding(
    currentUser: any
  ) {
    resetOnboardingFlags();

    let currentProfile =
      currentUser;

    try {
      currentProfile =
        await getFreshProfile(
          currentUser.id
        );

      setUser(
        (existing: any) => ({
          ...existing,
          ...currentProfile,
        })
      );
    } catch (error) {
      console.error(
        "REFRESH ONBOARDING PROFILE ERROR",
        error
      );
    }

    const requestedRole =
      currentProfile.requested_role;

    const requestStatus =
      currentProfile.role_request_status;

    const isFirstTimeUser =
      !currentProfile.profile_complete &&
      !requestedRole;

    if (isFirstTimeUser) {
      setNeedsInitialRole(true);
      return;
    }

    if (
      !currentProfile.profile_complete
    ) {
      setNeedsProfile(true);
      return;
    }

    const canBypassFTOOnboarding =
      onboardingBypassRoles.includes(
        currentProfile.role
      );

    const isFTOPath =
      !canBypassFTOOnboarding &&
      requestedRole ===
        "Field Training Officer" &&
      currentProfile.role !==
        "Field Training Officer";

    if (isFTOPath) {
      if (
        requestStatus ===
        "pending"
      ) {
        setAwaitingFTOApproval(true);
      } else {
        setNeedsFTOImport(true);
      }

      return;
    }

    const isP1Path =
      requestedRole ===
        "Probationary Officer" ||
      currentProfile.role ===
        "Probationary Officer";

    if (!isP1Path) {
      return;
    }

    const {
      data: trainee,
      error,
    } = await supabase
      .from("trainees")
      .select("id")
      .eq(
        "profile_id",
        currentProfile.id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "CHECK NOTEBOOK ERROR",
        error
      );

      setNeedsNotebook(true);
      return;
    }

    if (!trainee) {
      setNeedsNotebook(true);
      return;
    }

    setSelectedTrainee(
      trainee.id
    );
  }

  async function handleInitialRoleComplete(
    selectedRole: InitialRole
  ) {
    setNeedsInitialRole(false);
    setNeedsProfile(true);

    setUser(
      (current: any) => ({
        ...current,
        requested_role:
          selectedRole,
        role_request_status:
          selectedRole ===
          "Probationary Officer"
            ? "approved"
            : "draft",
      })
    );
  }

  async function handleProfileComplete() {
    try {
      const refreshedProfile =
        await getFreshProfile(
          user.id
        );

      const updatedUser = {
        ...user,
        ...refreshedProfile,
      };

      setUser(updatedUser);
      setNeedsProfile(false);

      if (
        updatedUser.requested_role ===
        "Field Training Officer"
      ) {
        setNeedsFTOImport(true);
        return;
      }

      setNeedsNotebook(true);
    } catch (error) {
      console.error(
        "REFRESH PROFILE ERROR",
        error
      );
    }
  }

  function openNotebook(
    id: string
  ) {
    setSelectedTrainee(id);
    setActivePage(
      "My Notebook"
    );
  }

  function openDOR(
    id: string
  ) {
    setDorTrainee(id);
    setActivePage(
      "Daily Observation Reports"
    );
  }

  if (
    checkingOnboarding
  ) {
    return (
      <main style={loadingStyle}>
        Loading FTP Portal...
      </main>
    );
  }

  if (
    creatingAccount
  ) {
    return (
      <CreateAccount
        onBack={() =>
          setCreatingAccount(
            false
          )
        }
      />
    );
  }

  if (!user) {
    return (
      <Login
        onLogin={async (
          loggedInUser
        ) => {
          setUser(
            loggedInUser
          );

          setCheckingOnboarding(
            true
          );

          await checkOnboarding(
            loggedInUser
          );

          setCheckingOnboarding(
            false
          );
        }}
        onCreateAccount={() =>
          setCreatingAccount(
            true
          )
        }
      />
    );
  }

  if (needsInitialRole) {
    return (
      <ChooseInitialRole
        user={user}
        onComplete={
          handleInitialRoleComplete
        }
      />
    );
  }

  if (needsProfile) {
    return (
      <PersonalDetails
        user={user}
        onComplete={
          handleProfileComplete
        }
      />
    );
  }

  if (needsNotebook) {
    return (
      <CreateNotebook
        user={user}
        onComplete={async (
          traineeId
        ) => {
          setNeedsNotebook(
            false
          );

          setSelectedTrainee(
            traineeId
          );

          setActivePage(
            "My Notebook"
          );

          await refreshTrainees();
        }}
      />
    );
  }

  if (needsFTOImport) {
    return (
      <FTOImport
        user={user}
        onSubmitted={() => {
          setNeedsFTOImport(
            false
          );

          setAwaitingFTOApproval(
            true
          );

          setUser(
            (current: any) => ({
              ...current,
              requested_role:
                "Field Training Officer",
              role_request_status:
                "pending",
            })
          );
        }}
        onSkip={
          onboardingBypassRoles.includes(
            user.role
          )
            ? () => {
                setNeedsFTOImport(
                  false
                );

                setAwaitingFTOApproval(
                  false
                );

                setActivePage(
                  "Dashboard"
                );
              }
            : undefined
        }
      />
    );
  }

  if (
    awaitingFTOApproval
  ) {
    return (
      <PendingFTOApproval
        user={user}
        onEditRequest={() => {
          setAwaitingFTOApproval(
            false
          );

          setNeedsFTOImport(
            true
          );
        }}
        onSkip={
          onboardingBypassRoles.includes(
            user.role
          )
            ? () => {
                setAwaitingFTOApproval(
                  false
                );

                setNeedsFTOImport(
                  false
                );

                setActivePage(
                  "Dashboard"
                );
              }
            : undefined
        }
        onLogout={async () => {
          await logout();
          resetSession();
        }}
      />
    );
  }

  function renderPage() {
    switch (activePage) {
      case "Dashboard":
        return (
          <Dashboard
            user={user}
            trainees={
              trainees
            }
            openDOR={
              openDOR
            }
            onNavigate={
              setActivePage
            }
          />
        );

      case "My Notebook":
        return (
          <MyNotebook
            user={user}
            traineeId={
              selectedTrainee ||
              undefined
            }
          />
        );

      case "P1 Records":
        return (
          <Records
            user={user}
            openDOR={openDOR}
          />
        );

      case "Daily Observation Reports":
        return (
          <DORForm
            traineeId={
              dorTrainee ||
              undefined
            }
          />
        );

      case "Records":
        return (
          <Records
            user={user}
            openDOR={openDOR}
          />
        );

      case "Role Requests":
        return (
          <RoleRequests
            user={user}
          />
        );

      case "My FTO File":
        return (
          <MyFTOFile
            user={user}
          />
        );

      case "FTO Records":
        return (
          <FTORecords
            user={user}
          />
        );

      case "Personnel Management":
        return (
          <PersonnelManagement
            currentUser={user}
          />
        );

      case "Field Training Management Dashboard":
        return (
          <FieldTrainingManagementDashboard
            user={user}
          />
        );

      case "FTP Management":
        return (
          <FieldTrainingManagementDashboard
            user={user}
          />
        );

      case "Batch Management":
        return (
          <BatchManagement
            user={user}
          />
        );

      case "Training Calendar":
        return (
          <TrainingCalendar
            user={user}
          />
        );

      case "Settings":
        return (
          <Settings
            user={user}
            onUpdate={
              setUser
            }
          />
        );

      case "Audit Centre":
        return (
          <AuditLog
            user={user}
          />
        );

      default:
        return (
          <div style={comingSoonStyle}>
            <h2>
              {activePage}
            </h2>

            <p
              style={{
                color:
                  "#94a3b8",
              }}
            >
              Coming soon.
            </p>
          </div>
        );
    }
  }

  return (
    <main style={appStyle}>
      <Sidebar
        activePage={
          activePage
        }
        onPageChange={
          setActivePage
        }
        role={user.role}
      />

      <section
        style={
          contentStyle
        }
      >
        <div
          style={
            headerStyle
          }
        >
          <div>
            <p
              style={{
                color:
                  "#94a3b8",
              }}
            >
              Welcome back
            </p>

            <h1>
              {activePage}
            </h1>

            <p
              style={{
                color:
                  "#94a3b8",
              }}
            >
              {user.name} -{" "}
              {user.role}
            </p>
          </div>

          <button
            onClick={async () => {
              await logout();
              resetSession();
            }}
            style={
              logoutButtonStyle
            }
          >
            Logout
          </button>
        </div>

        <div
          style={{
            marginTop:
              "30px",
          }}
        >
          {renderPage()}
        </div>
      </section>
    </main>
  );
}

function PendingFTOApproval({
  user,
  onEditRequest,
  onSkip,
  onLogout,
}: {
  user: any;
  onEditRequest: () => void;
  onSkip?: () => void;
  onLogout: () => void;
}) {
  return (
    <main style={loadingStyle}>
      <div style={pendingCardStyle}>
        <div style={pendingBadgeStyle}>
          REQUEST SUBMITTED
        </div>

        <h1>
          FTO Access Awaiting Review
        </h1>

        <p style={pendingTextStyle}>
          Your Field Training Officer
          role request and existing FTO
          file have been submitted.
          You will receive access after
          an authorised reviewer
          approves the request.
        </p>

        <div style={pendingDetailsStyle}>
          <div>
            <p style={pendingLabelStyle}>
              Officer
            </p>

            <p style={pendingValueStyle}>
              {user.name}
            </p>
          </div>

          <div>
            <p style={pendingLabelStyle}>
              Requested Role
            </p>

            <p style={pendingValueStyle}>
              Field Training Officer
            </p>
          </div>

          <div>
            <p style={pendingLabelStyle}>
              Status
            </p>

            <p style={pendingValueStyle}>
              Pending Review
            </p>
          </div>
        </div>

        <div style={pendingButtonsStyle}>
          <button
            type="button"
            onClick={
              onEditRequest
            }
            style={
              editRequestButtonStyle
            }
          >
            Edit Submitted File
          </button>

          {onSkip && (
            <button
              type="button"
              onClick={
                onSkip
              }
              style={
                skipButtonStyle
              }
            >
              Skip FTO Import
            </button>
          )}

          <button
            type="button"
            onClick={
              onLogout
            }
            style={
              pendingLogoutButtonStyle
            }
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  padding: "24px",
  color: "white",
  background:
    "#0f172a",
  fontFamily:
    "Arial, sans-serif",
};

const appStyle = {
  display: "flex",
  minHeight: "100vh",
  color: "white",
  background:
    "#0f172a",
  fontFamily:
    "Arial, sans-serif",
};

const contentStyle = {
  flex: 1,
  padding: "40px",
};

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
};

const logoutButtonStyle = {
  padding: "10px 16px",
  color: "white",
  background:
    "#1e293b",
  border:
    "1px solid #475569",
  borderRadius: "8px",
  cursor: "pointer",
};

const comingSoonStyle = {
  padding: "30px",
  background:
    "#1e293b",
  borderRadius: "12px",
};

const pendingCardStyle = {
  width: "100%",
  maxWidth: "620px",
  padding: "40px",
  background:
    "#1e293b",
  border:
    "1px solid #334155",
  borderRadius: "16px",
};

const pendingBadgeStyle = {
  display: "inline-block",
  padding: "6px 10px",
  marginBottom: "14px",
  color: "#fde68a",
  background:
    "rgba(120, 53, 15, 0.3)",
  border:
    "1px solid #a16207",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const pendingTextStyle = {
  color: "#94a3b8",
  lineHeight: 1.6,
};

const pendingDetailsStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "18px",
  padding: "20px",
  margin: "24px 0",
  background:
    "#0f172a",
  borderRadius: "10px",
};

const pendingLabelStyle = {
  margin: "0 0 5px",
  color: "#94a3b8",
  fontSize: "13px",
};

const pendingValueStyle = {
  margin: 0,
  fontWeight: 700,
};

const pendingButtonsStyle = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const editRequestButtonStyle = {
  flex: 1,
  minWidth: "180px",
  padding: "13px",
  color: "white",
  background:
    "#db2777",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const pendingLogoutButtonStyle = {
  flex: 1,
  minWidth: "140px",
  padding: "13px",
  color: "white",
  background:
    "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};


const skipButtonStyle = {
  flex: 1,
  minWidth: "170px",
  padding: "13px",
  color: "white",
  background: "#2563eb",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};