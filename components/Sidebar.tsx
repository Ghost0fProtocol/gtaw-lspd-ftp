"use client";

type Props = {
  activePage: string;
  onPageChange: (
    page: string
  ) => void;
  role: string;
};

export default function Sidebar({
  activePage,
  onPageChange,
  role,
}: Props) {
  let menuItems: string[] =
    [];

  switch (role) {
    case "Probationary Officer":
      menuItems = [
        "Dashboard",
        "My Notebook",
        "Settings",
      ];
      break;

    case "Field Training Officer":
      menuItems = [
        "Dashboard",
        "Daily Observation Reports",
        "P1 Records",
        "My FTO File",
        "Settings",
      ];
      break;

    case "Field Training Manager":
      menuItems = [
        "Dashboard",
        "Daily Observation Reports",
        "P1 Records",
        "My FTO File",
        "FTP Management",
        "Role Requests",
        "Settings",
      ];
      break;

    case "Field Training Supervisor":
      menuItems = [
        "Dashboard",
        "Daily Observation Reports",
        "P1 Records",
        "My FTO File",
        "FTP Management",
        "Role Requests",
        "Settings",
      ];
      break;

    case "STAFF":
    case "LSPD STAFF":
      menuItems = [
        "Dashboard",
        "Daily Observation Reports",
        "P1 Records",
        "My FTO File",
        "FTP Management",
        "Role Requests",
        "Settings",
      ];
      break;

    default:
      menuItems = [
        "Dashboard",
        "Settings",
      ];
      break;
  }

  return (
    <aside style={sidebarStyle}>
      <h2 style={headingStyle}>
        LSPD FTP
      </h2>

      {menuItems.map(
        (item) => (
          <button
            key={item}
            type="button"
            onClick={() =>
              onPageChange(
                item
              )
            }
            style={{
              ...menuButtonStyle,
              backgroundColor:
                activePage ===
                item
                  ? "#2563eb"
                  : "#1e293b",
            }}
          >
            {item}
          </button>
        )
      )}
    </aside>
  );
}

const sidebarStyle = {
  width: "260px",
  minHeight: "100vh",
  padding: "20px",
  backgroundColor:
    "#111827",
};

const headingStyle = {
  marginBottom: "30px",
  color: "white",
};

const menuButtonStyle = {
  width: "100%",
  padding: "14px",
  marginBottom: "10px",
  color: "white",
  textAlign:
    "left" as const,
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "16px",
};