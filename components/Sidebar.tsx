"use client";

import {
  useState,
} from "react";

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

type MenuSection = {
  label: string;
  items: string[];
};

const managementRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

const auditRoles = [
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

const reviewCentreRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

const menuSections: MenuSection[] = [
  {
    label: "Overview",
    items: [
      "Dashboard",
    ],
  },
  {
    label: "Training Operations",
    items: [
      "Daily Observation Reports",
      "P1 Records",
      "My Notebook",
      "My FTO File",
      "FTO Records",
    ],
  },
  {
    label: "FTP Management",
    items: [
      "Field Training Management Dashboard",
      "FTP Management",
      "Batch Management",
      "Personnel Management",
      "Review Centre",
    ],
  },
  {
    label: "Administration",
    items: [
      "Audit Centre",
      "Training Calendar",
      "Settings",
    ],
  },
];

const menuIcons:
  Record<string, string> = {
    Dashboard: "⌂",
    "Daily Observation Reports": "▣",
    "P1 Records": "◎",
    "My Notebook": "▤",
    "My FTO File": "▱",
    "FTO Records": "▥",
    "Review Centre": "▧",
    "Field Training Management Dashboard": "⌁",
    "FTP Management": "⌁",
    "Batch Management": "▦",
    "Personnel Management": "♙",
    "Audit Centre": "◈",
    "Training Calendar": "□",
    Settings: "⚙",
  };

export default function Sidebar({
  activePage,
  onPageChange,
  role,
}: Props) {
  const [
    logoFailed,
    setLogoFailed,
  ] = useState(false);

  const baseMenuItems =
    getSidebarMenuItems(
      role
    );

  const menuItems = [
    ...baseMenuItems,
  ].filter(
    (item) =>
      item !==
        "Comment Card Centre" &&
      item !==
        "Role Requests"
  );

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
    reviewCentreRoles.includes(
      role
    ) &&
    !menuItems.includes(
      "Review Centre"
    )
  ) {
    menuItems.push(
      "Review Centre"
    );
  }

  if (
    auditRoles.includes(
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

  const visibleSections =
    menuSections
      .map(
        (section) => ({
          ...section,
          items:
            section.items.filter(
              (item) =>
                menuItems.includes(
                  item
                )
            ),
        })
      )
      .filter(
        (section) =>
          section.items.length >
          0
      );

  const ungroupedItems =
    menuItems.filter(
      (item) =>
        !menuSections.some(
          (section) =>
            section.items.includes(
              item
            )
        )
    );

  return (
    <aside style={sidebarStyle}>
      <div style={brandBlockStyle}>
        <div style={logoShellStyle}>
          {!logoFailed ? (
            <img
              src="/ftp-logo.png"
              alt="LSPD Field Training Program"
              onError={() =>
                setLogoFailed(
                  true
                )
              }
              style={logoImageStyle}
            />
          ) : (
            <span style={fallbackLogoStyle}>
              FTP
            </span>
          )}
        </div>

        <div style={brandTextStyle}>
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
        {visibleSections.map(
          (section) => (
            <div
              key={
                section.label
              }
              style={sectionStyle}
            >
              <p style={sectionLabelStyle}>
                {section.label}
              </p>

              <div style={sectionItemsStyle}>
                {section.items.map(
                  (item) => (
                    <MenuButton
                      key={item}
                      item={item}
                      active={
                        activePage ===
                        item
                      }
                      onClick={() =>
                        onPageChange(
                          item
                        )
                      }
                    />
                  )
                )}
              </div>
            </div>
          )
        )}

        {ungroupedItems.length >
          0 && (
          <div style={sectionStyle}>
            <p style={sectionLabelStyle}>
              Other
            </p>

            <div style={sectionItemsStyle}>
              {ungroupedItems.map(
                (item) => (
                  <MenuButton
                    key={item}
                    item={item}
                    active={
                      activePage ===
                      item
                    }
                    onClick={() =>
                      onPageChange(
                        item
                      )
                    }
                  />
                )
              )}
            </div>
          </div>
        )}
      </nav>

      <div style={sidebarFooterStyle}>
        <div style={footerContentStyle}>
          <strong style={footerTitleStyle}>
            LSPD FTP
          </strong>

          <span style={footerVersionStyle}>
            Version 1.0.0
          </span>

          <span style={footerSubtitleStyle}>
            Designed &amp; Developed
          </span>

          <span style={footerAuthorStyle}>
            GhostOfProtocol
          </span>
        </div>
      </div>
    </aside>
  );
}

function MenuButton({
  item,
  active,
  onClick,
}: {
  item: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...menuButtonStyle,
        ...(active
          ? activeMenuButtonStyle
          : inactiveMenuButtonStyle),
      }}
    >
      <span
        aria-hidden="true"
        style={{
          ...menuIconStyle,
          color:
            active
              ? "#bfdbfe"
              : "#60a5fa",
        }}
      >
        {menuIcons[item] ??
          "•"}
      </span>

      <span style={menuTextStyle}>
        {item}
      </span>

      {active && (
        <span
          aria-hidden="true"
          style={activeIndicatorStyle}
        />
      )}
    </button>
  );
}

const sidebarStyle = {
  width: "300px",
  minHeight: "100vh",
  maxHeight: "100vh",
  position: "sticky" as const,
  top: 0,
  boxSizing:
    "border-box" as const,
  display: "flex",
  flexDirection:
    "column" as const,
  padding: "22px 16px",
  color: "white",
  background:
    "linear-gradient(180deg, #081221 0%, #0b1424 52%, #08111f 100%)",
  borderRight:
    "1px solid #1e2c43",
  overflowY: "auto" as const,
};

const brandBlockStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "0 5px",
  marginBottom: "20px",
};

const logoShellStyle = {
  width: "78px",
  height: "78px",
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "visible",
  backgroundColor:
    "transparent",
  borderWidth: "0",
  borderStyle: "solid",
  borderColor:
    "transparent",
  borderRadius: "0",
  boxShadow: "none",
};

const logoImageStyle = {
  width: "78px",
  height: "78px",
  display: "block",
  objectFit: "contain" as const,
  padding: "0",
  margin: "0",
  backgroundColor:
    "transparent",
  borderRadius: "0",
  boxSizing:
    "border-box" as const,
};

const fallbackLogoStyle = {
  color: "#dbeafe",
  fontSize: "15px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const brandTextStyle = {
  minWidth: 0,
};

const headingStyle = {
  margin: "0 0 5px",
  fontSize: "22px",
  fontWeight: 800,
  letterSpacing:
    "0.01em",
};

const roleContextStyle = {
  margin: 0,
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing:
    "0.12em",
  textTransform:
    "uppercase" as const,
};

const roleCardStyle = {
  padding: "15px",
  marginBottom: "20px",
  backgroundColor:
    "rgba(17, 28, 47, 0.92)",
  border:
    "1px solid #263750",
  borderRadius: "12px",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.025)",
};

const roleCardLabelStyle = {
  margin: "0 0 7px",
  color: "#7186a6",
  fontSize: "10px",
  fontWeight: 900,
  letterSpacing:
    "0.12em",
};

const roleCardValueStyle = {
  color: "#dbeafe",
  fontSize: "14px",
};

const navigationStyle = {
  display: "grid",
  gap: "21px",
};

const sectionStyle = {
  display: "grid",
  gap: "9px",
};

const sectionLabelStyle = {
  margin: "0 8px",
  color: "#64748b",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing:
    "0.13em",
  textTransform:
    "uppercase" as const,
};

const sectionItemsStyle = {
  display: "grid",
  gap: "7px",
};

const menuButtonStyle = {
  position:
    "relative" as const,
  width: "100%",
  minHeight: "48px",
  display: "grid",
  gridTemplateColumns:
    "24px minmax(0, 1fr)",
  alignItems: "center",
  gap: "10px",
  padding: "11px 13px",
  color: "white",
  textAlign:
    "left" as const,
  borderWidth: "1px",
  borderStyle: "solid",
  borderRadius: "10px",
  cursor: "pointer",
  fontFamily: "inherit",
  transition:
    "background-color 140ms ease, border-color 140ms ease, transform 140ms ease",
};

const activeMenuButtonStyle = {
  background:
    "linear-gradient(135deg, #1d4ed8, #2859df)",
  borderColor:
    "#3b82f6",
  boxShadow:
    "0 8px 24px rgba(37, 99, 235, 0.2)",
};

const inactiveMenuButtonStyle = {
  backgroundColor:
    "rgba(15, 23, 42, 0.72)",
  borderColor:
    "#1f3048",
};

const menuIconStyle = {
  width: "24px",
  display: "grid",
  placeItems: "center",
  fontSize: "17px",
  fontWeight: 700,
};

const menuTextStyle = {
  lineHeight: 1.35,
  fontSize: "13px",
  fontWeight: 700,
};

const activeIndicatorStyle = {
  position: "absolute" as const,
  left: "-1px",
  top: "12px",
  bottom: "12px",
  width: "4px",
  backgroundColor:
    "#bfdbfe",
  borderRadius: "0 999px 999px 0",
};

const sidebarFooterStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  marginTop: "auto",
  padding: "22px 7px 4px",
  color: "#475569",
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing:
    "0.06em",
  textTransform:
    "uppercase" as const,
};

const footerContentStyle = {
  display: "grid",
  gap: "3px",
};

const footerTitleStyle = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: 800,
};

const footerVersionStyle = {
  color: "#94a3b8",
  fontSize: "10px",
  fontWeight: 700,
};

const footerSubtitleStyle = {
  color: "#475569",
  fontSize: "9px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const footerAuthorStyle = {
  color: "#cbd5e1",
  fontSize: "11px",
  fontWeight: 700,
};

const footerMarkStyle = {
  width: "28px",
  height: "28px",
  display: "grid",
  placeItems: "center",
  color: "#60a5fa",
  border:
    "1px solid #294165",
  borderRadius: "7px",
  fontSize: "8px",
};