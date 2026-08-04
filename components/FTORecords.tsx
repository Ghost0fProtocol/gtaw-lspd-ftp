"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import MyFTOFile from "./MyFTOFile";

type Props = {
  user: any;
};

type FTORecord = {
  fileId: string;
  profileId: string;
  name: string;
  rank: string;
  badgeNumber: string;
  workNumber: string;
  division: string;
  totalInstructionMinutes: number;
  entryCount: number;
  updatedAt: string | null;
};

const permittedRoles = [
  "Field Training Manager",
  "Field Training Supervisor",
  "FTP Staff",
  "STAFF",
  "LSPD STAFF",
];

export default function FTORecords({
  user,
}: Props) {
  const [
    records,
    setRecords,
  ] = useState<FTORecord[]>([]);

  const [
    selectedProfileId,
    setSelectedProfileId,
  ] = useState<string | null>(
    null
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const canViewAllFiles =
    permittedRoles.includes(
      user?.role ?? ""
    );

  useEffect(() => {
    if (!canViewAllFiles) {
      setLoading(false);
      return;
    }

    void loadRecords();
  }, [
    user?.role,
  ]);

  async function loadRecords() {
    setLoading(true);
    setError("");

    try {
      const {
        data: fileRows,
        error: fileError,
      } = await supabase
        .from("fto_files")
        .select(`
          id,
          profile_id,
          division,
          total_instruction_minutes,
          updated_at
        `)
        .order(
          "updated_at",
          {
            ascending: false,
          }
        );

      if (fileError) {
        throw fileError;
      }

      const files =
        fileRows ?? [];

      if (
        files.length === 0
      ) {
        setRecords([]);
        return;
      }

      const profileIds = [
        ...new Set(
          files
            .map(
              (file) =>
                file.profile_id
            )
            .filter(Boolean)
        ),
      ];

      const fileIds =
        files.map(
          (file) =>
            file.id
        );

      const [
        profileResult,
        entryResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id,
            name,
            rank,
            badge_number,
            work_number,
            division
          `)
          .in(
            "id",
            profileIds
          ),

        supabase
          .from(
            "fto_log_entries"
          )
          .select(
            "id, fto_file_id"
          )
          .in(
            "fto_file_id",
            fileIds
          ),
      ]);

      if (
        profileResult.error
      ) {
        throw profileResult.error;
      }

      if (
        entryResult.error
      ) {
        throw entryResult.error;
      }

      const profiles =
        profileResult.data ??
        [];

      const entryCounts =
        (
          entryResult.data ??
          []
        ).reduce(
          (
            counts,
            entry
          ) => {
            counts[
              entry.fto_file_id
            ] =
              (
                counts[
                  entry.fto_file_id
                ] ?? 0
              ) + 1;

            return counts;
          },
          {} as Record<
            string,
            number
          >
        );

      const nextRecords =
        files.map(
          (
            file
          ): FTORecord => {
            const profile =
              profiles.find(
                (item) =>
                  item.id ===
                  file.profile_id
              );

            return {
              fileId:
                file.id,

              profileId:
                file.profile_id,

              name:
                profile?.name ??
                "Unknown Officer",

              rank:
                profile?.rank ??
                "Unknown Rank",

              badgeNumber:
                profile?.badge_number ??
                "N/A",

              workNumber:
                profile?.work_number ??
                "N/A",

              division:
                profile?.division ??
                file.division ??
                "Unknown Division",

              totalInstructionMinutes:
                file.total_instruction_minutes ??
                0,

              entryCount:
                entryCounts[
                  file.id
                ] ?? 0,

              updatedAt:
                file.updated_at ??
                null,
            };
          }
        );

      nextRecords.sort(
        (
          first,
          second
        ) =>
          first.name.localeCompare(
            second.name
          )
      );

      setRecords(
        nextRecords
      );
    } catch (loadError) {
      console.error(
        "LOAD ALL FTO RECORDS ERROR",
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "FTO records could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return records;
      }

      return records.filter(
        (record) => {
          const searchable =
            [
              record.name,
              record.rank,
              record.badgeNumber,
              record.workNumber,
              record.division,
            ]
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );
    }, [
      records,
      searchTerm,
    ]);

  if (!canViewAllFiles) {
    return (
      <div style={errorStyle}>
        You do not have permission to view all FTO records.
      </div>
    );
  }

  if (selectedProfileId) {
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            setSelectedProfileId(
              null
            )
          }
          style={backButtonStyle}
        >
          ← Back to FTO Records
        </button>

        <MyFTOFile
          user={user}
          profileId={
            selectedProfileId
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>
            FTP MANAGEMENT
          </p>

          <h2 style={titleStyle}>
            FTO Records
          </h2>

          <p style={subtitleStyle}>
            View every Field Training Officer file and their complete activity history.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadRecords()
          }
          disabled={loading}
          style={{
            ...refreshButtonStyle,
            opacity:
              loading
                ? 0.65
                : 1,
          }}
        >
          {loading
            ? "Refreshing..."
            : "Refresh Records"}
        </button>
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div style={summaryGridStyle}>
        <SummaryCard
          label="FTO Files"
          value={String(
            records.length
          )}
        />

        <SummaryCard
          label="Total Entries"
          value={String(
            records.reduce(
              (
                total,
                record
              ) =>
                total +
                record.entryCount,
              0
            )
          )}
        />

        <SummaryCard
          label="Combined Instruction"
          value={formatMinutes(
            records.reduce(
              (
                total,
                record
              ) =>
                total +
                record.totalInstructionMinutes,
              0
            )
          )}
        />
      </div>

      <input
        value={searchTerm}
        onChange={(event) =>
          setSearchTerm(
            event.target.value
          )
        }
        placeholder="Search by officer, rank, badge, work number or division..."
        style={searchInputStyle}
      />

      <div style={recordsCardStyle}>
        <div style={tableHeaderStyle}>
          <strong>
            Officer
          </strong>

          <strong>
            Division
          </strong>

          <strong>
            Instruction
          </strong>

          <strong>
            Entries
          </strong>

          <span />
        </div>

        {loading ? (
          <div style={emptyStyle}>
            Loading FTO records...
          </div>
        ) : filteredRecords.length ===
          0 ? (
          <div style={emptyStyle}>
            No matching FTO records were found.
          </div>
        ) : (
          filteredRecords.map(
            (record) => (
              <button
                key={
                  record.fileId
                }
                type="button"
                onClick={() =>
                  setSelectedProfileId(
                    record.profileId
                  )
                }
                style={recordRowStyle}
              >
                <div>
                  <strong>
                    {record.name}
                  </strong>

                  <p style={metaStyle}>
                    {record.rank}
                    {" • "}
                    Badge{" "}
                    {record.badgeNumber}
                    {" • "}
                    Work{" "}
                    {record.workNumber}
                  </p>
                </div>

                <div>
                  <strong>
                    {record.division}
                  </strong>

                  <p style={metaStyle}>
                    Updated{" "}
                    {formatUpdatedAt(
                      record.updatedAt
                    )}
                  </p>
                </div>

                <strong>
                  {formatMinutes(
                    record.totalInstructionMinutes
                  )}
                </strong>

                <strong>
                  {record.entryCount}
                </strong>

                <span style={openLinkStyle}>
                  Open File
                </span>
              </button>
            )
          )
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={summaryCardStyle}>
      <p style={summaryLabelStyle}>
        {label}
      </p>

      <p style={summaryValueStyle}>
        {value}
      </p>
    </div>
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

function formatUpdatedAt(
  value: string | null
) {
  if (!value) {
    return "unknown";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "20px",
  marginBottom: "22px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  margin: "0 0 7px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const titleStyle = {
  margin: "0 0 7px",
};

const subtitleStyle = {
  margin: 0,
  color: "#94a3b8",
};

const refreshButtonStyle = {
  padding: "11px 16px",
  color: "white",
  backgroundColor: "#475569",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 800,
};

const backButtonStyle = {
  padding: "10px 14px",
  marginBottom: "20px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: 700,
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const summaryCardStyle = {
  padding: "18px",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "10px",
};

const summaryLabelStyle = {
  margin: "0 0 7px",
  color: "#94a3b8",
  fontSize: "13px",
};

const summaryValueStyle = {
  margin: 0,
  color: "white",
  fontSize: "24px",
  fontWeight: 900,
};

const searchInputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "13px",
  marginBottom: "20px",
  color: "white",
  backgroundColor: "#1e293b",
  border: "1px solid #475569",
  borderRadius: "8px",
};

const recordsCardStyle = {
  overflow: "hidden",
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "12px",
};

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns:
    "2fr 1.3fr 0.8fr 0.6fr 0.7fr",
  gap: "16px",
  padding: "14px 18px",
  color: "#94a3b8",
  backgroundColor: "#0f172a",
  fontSize: "12px",
  textTransform:
    "uppercase" as const,
  letterSpacing: "0.06em",
};

const recordRowStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns:
    "2fr 1.3fr 0.8fr 0.6fr 0.7fr",
  alignItems: "center",
  gap: "16px",
  padding: "18px",
  color: "white",
  backgroundColor:
    "transparent",
  border: "none",
  borderTop:
    "1px solid #334155",
  textAlign: "left" as const,
  cursor: "pointer",
};

const metaStyle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "12px",
};

const openLinkStyle = {
  color: "#60a5fa",
  fontWeight: 800,
  textAlign: "right" as const,
};

const emptyStyle = {
  padding: "20px",
  color: "#94a3b8",
};

const errorStyle = {
  padding: "14px",
  marginBottom: "18px",
  color: "#fecaca",
  backgroundColor:
    "rgba(127, 29, 29, 0.35)",
  border: "1px solid #991b1b",
  borderRadius: "8px",
};