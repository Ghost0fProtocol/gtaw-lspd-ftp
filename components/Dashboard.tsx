type DashboardProps = {
  trainees: any[];
};

export default function Dashboard({
  trainees,
}: DashboardProps) {
  const openItems = trainees.length;

  const inProgress = trainees.filter(
    (trainee) =>
      trainee.status === "Active",
  ).length;

  const pendingReview = trainees.filter(
    (trainee) =>
      trainee.status === "Review",
  ).length;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        {[
          ["Open Items", openItems],
          ["In Progress", inProgress],
          ["Pending Review", pendingReview],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: "24px",
              backgroundColor: "#1e293b",
              border:
                "1px solid #334155",
              borderRadius: "12px",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              {label}
            </p>

            <p
              style={{
                margin: 0,
                fontSize: "34px",
                fontWeight: "bold",
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "24px",
          backgroundColor: "#1e293b",
          border:
            "1px solid #334155",
          borderRadius: "12px",
        }}
      >
        <h2
          style={{
            margin: "0 0 18px",
            fontSize: "20px",
          }}
        >
          Recent Activity
        </h2>

        {trainees.length === 0 ? (
          <p
            style={{
              color: "#94a3b8",
            }}
          >
            No trainee activity yet.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {trainees.map((trainee) => (
              <div
                key={trainee.id}
                style={{
                  padding: "14px",
                  backgroundColor: "#0f172a",
                  borderRadius: "8px",
                  color: "#cbd5e1",
                  fontSize: "14px",
                }}
              >
                <strong>
                  {trainee.profile?.name ??
                    "Unknown"}
                </strong>

                <br />

                Status:
                {" "}
                {trainee.status}

                <br />

                FTM:
                {" "}
                {trainee.ftm?.name ??
                  "Unassigned"}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}