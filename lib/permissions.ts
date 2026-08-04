export const FTP_ROLES = {
  PROBATIONARY_OFFICER:
    "Probationary Officer",
  FIELD_TRAINING_OFFICER:
    "Field Training Officer",
  FIELD_TRAINING_MANAGER:
    "Field Training Manager",
  FIELD_TRAINING_SUPERVISOR:
    "Field Training Supervisor",
  FTP_STAFF:
    "FTP Staff",
  LSPD_STAFF:
    "LSPD STAFF",
  NO_FTP_ACCESS:
    "No FTP Access",
} as const;

export type FTPRole =
  typeof FTP_ROLES[
    keyof typeof FTP_ROLES
  ];

export type Permission =
  | "viewOwnNotebook"
  | "viewOwnDORs"
  | "writeDORs"
  | "viewTrainingRecords"
  | "manageNotebook"
  | "completePPOWER"
  | "manageProgression"
  | "conductFinalEvaluation"
  | "promoteToP2"
  | "viewCalendar"
  | "editCalendar"
  | "managePersonnel"
  | "manageRoleRequests"
  | "manageFTP"
  | "administerWebsite";

const allRoles =
  Object.values(
    FTP_ROLES
  ) as FTPRole[];

const permissionMap:
  Record<
    FTPRole,
    Permission[]
  > = {
  [FTP_ROLES.PROBATIONARY_OFFICER]:
    [
      "viewOwnNotebook",
      "viewOwnDORs",
      "viewCalendar",
    ],

  [FTP_ROLES.FIELD_TRAINING_OFFICER]:
    [
      "writeDORs",
      "viewTrainingRecords",
      "manageNotebook",
      "viewCalendar",
    ],

  [FTP_ROLES.FIELD_TRAINING_MANAGER]:
    [
      "writeDORs",
      "viewTrainingRecords",
      "manageNotebook",
      "completePPOWER",
      "manageProgression",
      "conductFinalEvaluation",
      "viewCalendar",
      "manageRoleRequests",
      "manageFTP",
    ],

  [FTP_ROLES.FIELD_TRAINING_SUPERVISOR]:
    [
      "writeDORs",
      "viewTrainingRecords",
      "manageNotebook",
      "completePPOWER",
      "manageProgression",
      "conductFinalEvaluation",
      "promoteToP2",
      "viewCalendar",
      "editCalendar",
      "managePersonnel",
      "manageRoleRequests",
      "manageFTP",
    ],

  [FTP_ROLES.FTP_STAFF]:
    [
      "writeDORs",
      "viewTrainingRecords",
      "manageNotebook",
      "completePPOWER",
      "manageProgression",
      "conductFinalEvaluation",
      "promoteToP2",
      "viewCalendar",
      "editCalendar",
      "managePersonnel",
      "manageRoleRequests",
      "manageFTP",
    ],

  [FTP_ROLES.LSPD_STAFF]:
    [
      "viewCalendar",
      "editCalendar",
      "managePersonnel",
      "manageRoleRequests",
      "administerWebsite",
    ],

  [FTP_ROLES.NO_FTP_ACCESS]:
    [
      "viewCalendar",
    ],
};

export function normaliseRole(
  role: unknown
): FTPRole {
  if (
    role === "STAFF"
  ) {
    return FTP_ROLES.FTP_STAFF;
  }

  if (
    typeof role === "string" &&
    allRoles.includes(
      role as FTPRole
    )
  ) {
    return role as FTPRole;
  }

  return FTP_ROLES.NO_FTP_ACCESS;
}

export function hasPermission(
  role: unknown,
  permission: Permission
) {
  const normalisedRole =
    normaliseRole(role);

  return permissionMap[
    normalisedRole
  ].includes(permission);
}

export function canViewOwnNotebook(
  role: unknown
) {
  return hasPermission(
    role,
    "viewOwnNotebook"
  );
}

export function canViewOwnDORs(
  role: unknown
) {
  return hasPermission(
    role,
    "viewOwnDORs"
  );
}

export function canWriteDORs(
  role: unknown
) {
  return hasPermission(
    role,
    "writeDORs"
  );
}

export function canViewTrainingRecords(
  role: unknown
) {
  return hasPermission(
    role,
    "viewTrainingRecords"
  );
}

export function canManageNotebook(
  role: unknown
) {
  return hasPermission(
    role,
    "manageNotebook"
  );
}

export function canCompletePPOWER(
  role: unknown
) {
  return hasPermission(
    role,
    "completePPOWER"
  );
}

export function canManageProgression(
  role: unknown
) {
  return hasPermission(
    role,
    "manageProgression"
  );
}

export function canConductFinalEvaluation(
  role: unknown
) {
  return hasPermission(
    role,
    "conductFinalEvaluation"
  );
}

export function canPromoteToP2(
  role: unknown
) {
  return hasPermission(
    role,
    "promoteToP2"
  );
}

export function canViewCalendar(
  role: unknown
) {
  return hasPermission(
    role,
    "viewCalendar"
  );
}

export function canEditCalendar(
  role: unknown
) {
  return hasPermission(
    role,
    "editCalendar"
  );
}

export function canManagePersonnel(
  role: unknown
) {
  return hasPermission(
    role,
    "managePersonnel"
  );
}

export function canManageRoleRequests(
  role: unknown
) {
  return hasPermission(
    role,
    "manageRoleRequests"
  );
}

export function canManageFTP(
  role: unknown
) {
  return hasPermission(
    role,
    "manageFTP"
  );
}

export function canAdministerWebsite(
  role: unknown
) {
  return hasPermission(
    role,
    "administerWebsite"
  );
}

export function getRoleDisplayName(
  role: unknown
) {
  switch (
    normaliseRole(role)
  ) {
    case FTP_ROLES.PROBATIONARY_OFFICER:
      return "Probationary Officer";

    case FTP_ROLES.FIELD_TRAINING_OFFICER:
      return "Field Training Officer";

    case FTP_ROLES.FIELD_TRAINING_MANAGER:
      return "Field Training Manager";

    case FTP_ROLES.FIELD_TRAINING_SUPERVISOR:
      return "Field Training Supervisor";

    case FTP_ROLES.FTP_STAFF:
      return "FTP Staff";

    case FTP_ROLES.LSPD_STAFF:
      return "LSPD Staff";

    case FTP_ROLES.NO_FTP_ACCESS:
      return "No FTP Access";
  }
}

export function getRoleContextLabel(
  role: unknown
) {
  switch (
    normaliseRole(role)
  ) {
    case FTP_ROLES.PROBATIONARY_OFFICER:
      return "P1";

    case FTP_ROLES.FIELD_TRAINING_OFFICER:
      return "FTO";

    case FTP_ROLES.FIELD_TRAINING_MANAGER:
      return "FTM";

    case FTP_ROLES.FIELD_TRAINING_SUPERVISOR:
      return "FTS";

    case FTP_ROLES.FTP_STAFF:
      return "Head of FTP";

    case FTP_ROLES.LSPD_STAFF:
      return "LSPD Administration";

    case FTP_ROLES.NO_FTP_ACCESS:
      return "Former FTP Member";
  }
}

export function getSidebarMenuItems(
  role: unknown
) {
  const menuItems = [
    "Dashboard",
  ];

  if (
    canViewOwnNotebook(role)
  ) {
    menuItems.push(
      "My Notebook"
    );
  }

  if (
    canWriteDORs(role)
  ) {
    menuItems.push(
      "Daily Observation Reports"
    );
  }

  if (
    canViewTrainingRecords(role)
  ) {
    menuItems.push(
      "P1 Records"
    );
  }

  if (
    canWriteDORs(role)
  ) {
    menuItems.push(
      "My FTO File"
    );
  }

  if (
    canManageFTP(role)
  ) {
    menuItems.push(
      "Field Training Management Dashboard"
    );
  }

  if (
    canEditCalendar(role)
  ) {
    menuItems.push(
      "Batch Management"
    );
  }

  if (
    canManagePersonnel(role)
  ) {
    menuItems.push(
      "Personnel Management"
    );
  }

  if (
    canManageRoleRequests(role)
  ) {
    menuItems.push(
      "Role Requests"
    );
  }

  menuItems.push(
    "Settings"
  );

  return menuItems;
}