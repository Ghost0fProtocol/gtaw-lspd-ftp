export default function Dashboard() {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        {[
          ["Open Items", "6"],
          ["In Progress", "2"],
          ["Pending Review", "3"],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: "24px",
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
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
          border: "1px solid #334155",
          borderRadius: "12px",
        }}
      >
        <h2 style={{ margin: "0 0 18px", fontSize: "20px" }}>
          Recent Activity
        </h2>

        <div style={{ display: "grid", gap: "12px" }}>
          {["Item updated", "Report submitted", "Review completed"].map(
            (activity) => (
              <div
                key={activity}
                style={{
                  padding: "14px",
                  backgroundColor: "#0f172a",
                  borderRadius: "8px",
                  color: "#cbd5e1",
                  fontSize: "14px",
                }}
              >
                {activity}
              </div>
            ),
          )}
        </div>
      </div>
    </>
  );
}