"use client";

import {
  getRoleContextLabel,
  getRoleDisplayName,
  getSidebarMenuItems,
} from "../lib/permissions";

type Props = {
  activePage: string;
  onPageChange: (
    page: string
  ) => void;
  role: string;
};

const managementRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

export default function Sidebar({
  activePage,
  onPageChange,
  role,
}: Props) {
  const baseMenuItems =
    getSidebarMenuItems(
      role
    );

  const menuItems = [
    ...baseMenuItems,
  ];

  if (
    managementRoles.includes(
      role
    ) &&
    !menuItems.includes(
      "FTO Records"
    )
  ) {
    const myFTORecordIndex =
      menuItems.findIndex(
        (item) =>
          item ===
            "My FTO File" ||
          item ===
            "My FTO Record"
      );

    if (
      myFTORecordIndex >= 0
    ) {
      menuItems.splice(
        myFTORecordIndex + 1,
        0,
        "FTO Records"
      );
    } else {
      menuItems.push(
        "FTO Records"
      );
    }
  }

  if (
    managementRoles.includes(
      role
    ) &&
    !menuItems.includes(
      "Audit Centre"
    )
  ) {
    menuItems.push(
      "Audit Centre"
    );
  }

  return (
    <aside style={sidebarStyle}>
      <div style={brandBlockStyle}>
        <div style={brandMarkStyle}>
          FTP
        </div>

        <div>
          <h2 style={headingStyle}>
            LSPD FTP
          </h2>

          <p style={roleContextStyle}>
            {getRoleContextLabel(
              role
            )}
          </p>
        </div>
      </div>

      <div style={roleCardStyle}>
        <p style={roleCardLabelStyle}>
          CURRENT ACCESS
        </p>

        <strong style={roleCardValueStyle}>
          {getRoleDisplayName(
            role
          )}
        </strong>
      </div>

      <nav style={navigationStyle}>
        {menuItems.map(
          (item) => {
            const active =
              activePage ===
              item;

            return (
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
                  ...(active
                    ? activeMenuButtonStyle
                    : inactiveMenuButtonStyle),
                }}
              >
                <span
                  style={{
                    ...menuIndicatorStyle,
                    opacity:
                      active ? 1 : 0,
                  }}
                />

                <span>
                  {item}
                </span>
              </button>
            );
          }
        )}
      </nav>

      <div style={sidebarFooterStyle}>
        Field Training Portal
      </div>
    </aside>
  );
}

const sidebarStyle = {
  width: "280px",
  minHeight: "100vh",
  boxSizing:
    "border-box" as const,
  display: "flex",
  flexDirection:
    "column" as const,
  padding: "24px 18px",
  color: "white",
  backgroundColor:
    "#0b1220",
  borderRight:
    "1px solid #1e293b",
};

const brandBlockStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "0 6px",
  marginBottom: "22px",
};

const brandMarkStyle = {
  width: "44px",
  height: "44px",
  display: "grid",
  placeItems: "center",
  color: "#dbeafe",
  background:
    "linear-gradient(135deg, #2563eb, #1d4ed8)",
  border:
    "1px solid #60a5fa",
  borderRadius: "12px",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  boxShadow:
    "0 10px 30px rgba(37, 99, 235, 0.22)",
};

const headingStyle = {
  margin: "0 0 4px",
  fontSize: "19px",
  letterSpacing:
    "0.02em",
};

const roleContextStyle = {
  margin: 0,
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing:
    "0.09em",
  textTransform:
    "uppercase" as const,
};

const roleCardStyle = {
  padding: "14px",
  marginBottom: "18px",
  backgroundColor:
    "#111c2f",
  border:
    "1px solid #24324a",
  borderRadius: "11px",
};

const roleCardLabelStyle = {
  margin: "0 0 6px",
  color: "#64748b",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing:
    "0.09em",
};

const roleCardValueStyle = {
  color: "#cbd5e1",
  fontSize: "13px",
};

const navigationStyle = {
  display: "grid",
  gap: "8px",
};

const menuButtonStyle = {
  position:
    "relative" as const,
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "13px 14px",
  color: "white",
  textAlign:
    "left" as const,
  borderRadius: "9px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 700,
  transition:
    "background-color 140ms ease, border-color 140ms ease",
};

const activeMenuButtonStyle = {
  backgroundColor:
    "#1d4ed8",
  border:
    "1px solid #3b82f6",
  boxShadow:
    "0 8px 24px rgba(37, 99, 235, 0.2)",
};

const inactiveMenuButtonStyle = {
  backgroundColor:
    "#111827",
  border:
    "1px solid #1f2937",
};

const menuIndicatorStyle = {
  width: "4px",
  height: "18px",
  backgroundColor:
    "#bfdbfe",
  borderRadius: "999px",
};

const sidebarFooterStyle = {
  marginTop: "auto",
  padding: "18px 6px 4px",
  color: "#475569",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing:
    "0.06em",
  textTransform:
    "uppercase" as const,
};