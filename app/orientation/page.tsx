import OrientationForm from "../../components/OrientationForm";

export default function PublicOrientationPage() {
  return (
    <main style={pageStyle}>
      <div style={contentStyle}>
        <div style={introStyle}>
          <p style={eyebrowStyle}>
            LSPD FIELD TRAINING PROGRAM
          </p>

          <h1 style={titleStyle}>
            Public Orientation Report
          </h1>

          <p style={subtitleStyle}>
            This page allows officers without an FTP Portal account to submit an Introductory and Orientation Report.
          </p>
        </div>

        <OrientationForm publicMode />
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  padding: "32px",
  color: "white",
  backgroundColor: "#0f172a",
};

const contentStyle = {
  width: "100%",
  maxWidth: "1100px",
  margin: "0 auto",
};

const introStyle = {
  marginBottom: "28px",
  paddingBottom: "22px",
  borderBottom:
    "1px solid #334155",
};

const eyebrowStyle = {
  margin: "0 0 8px",
  color: "#60a5fa",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "0.1em",
};

const titleStyle = {
  margin: "0 0 10px",
};

const subtitleStyle = {
  maxWidth: "720px",
  margin: 0,
  color: "#94a3b8",
  lineHeight: 1.6,
};