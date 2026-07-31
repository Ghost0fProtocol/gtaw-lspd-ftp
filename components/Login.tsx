type LoginProps = {
  onLogin: () => void;
};

export default function Login({ onLogin }: LoginProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f172a",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "40px",
          backgroundColor: "#1e293b",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
          border: "1px solid #334155",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#93c5fd",
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "2px",
            }}
          >
            TRAINING PORTAL
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "28px",
            }}
          >
            Management System
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#94a3b8",
              fontSize: "14px",
            }}
          >
            Prototype Application
          </p>
        </div>

        <input
          placeholder="Enter your username"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px 14px",
            marginBottom: "14px",
            backgroundColor: "#0f172a",
            color: "white",
            border: "1px solid #475569",
            borderRadius: "8px",
          }}
        />

        <input
          type="password"
          placeholder="Enter your password"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px 14px",
            marginBottom: "20px",
            backgroundColor: "#0f172a",
            color: "white",
            border: "1px solid #475569",
            borderRadius: "8px",
          }}
        />

        <button
          onClick={onLogin}
          style={{
            width: "100%",
            padding: "13px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Sign In
        </button>

        <p
          style={{
            margin: "20px 0 0",
            color: "#64748b",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          Prototype v0.7
        </p>
      </div>
    </main>
  );
}