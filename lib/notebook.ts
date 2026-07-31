import { NotebookSection } from "./types";

export const defaultNotebook: NotebookSection[] = [
  {
    section: "MANDATORY COURSES",
    items: [
      {
        id: "basic_first_aid",
        label: "(BFA) Basic First Aid",
        completed: false,
      },
      {
        id: "evoc",
        label: "(EVOC) Emergency Vehicle Operators Course",
        completed: false,
      },
    ],
  },

  {
    section: "TRAFFIC ENFORCEMENT",
    items: [
      {
        id: "enforcement_equipment",
        label: "Enforcement Equipment",
        completed: false,
      },
      {
        id: "traffic_stops",
        label: "Traffic Stops",
        completed: false,
      },
    ],
  },

  {
    section: "FIELD PROCEDURES",
    items: [
      {
        id: "police_records_database",
        label: "Police Records Database",
        completed: false,
      },
      {
        id: "departmental_radio",
        label: "Departmental Radio",
        completed: false,
      },
      {
        id: "preliminary_investigations",
        label: "Preliminary Investigations",
        completed: false,
      },
      {
        id: "pursuits",
        label: "Pursuits",
        completed: false,
      },
    ],
  },

  {
    section: "ARREST PROCEDURE",
    items: [
      {
        id: "booking",
        label: "Booking",
        completed: false,
      },
      {
        id: "report",
        label: "Report",
        completed: false,
      },
    ],
  },

  {
    section: "STATE LAW",
    items: [
      {
        id: "reasonable_suspicion",
        label: "Reasonable Suspicion / Probable Cause",
        completed: false,
      },
      {
        id: "penal_code",
        label: "Penal Code",
        completed: false,
      },
      {
        id: "search_seizure",
        label: "Search & Seizure",
        completed: false,
      },
      {
        id: "constitution",
        label: "U.S. Constitution",
        completed: false,
      },
    ],
  },
];