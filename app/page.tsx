"use client";

import { useEffect, useState } from "react";
import { getTrainees } from "../lib/trainees";
import Login from "../components/Login";
import Sidebar from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
import Records from "../components/Records";
import DORForm from "../components/DORForm";

const menuItems = [
  "Dashboard",
  "Daily Observation Reports",
  "Records",
  "Tracking",
  "Training",
  "Settings",
];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [trainees, setTrainees] = useState<any[]>([]);

  useEffect(() => {
    async function loadTrainees() {
      const data = await getTrainees();

      console.log(
        "Supabase trainees:",
        data
      );

      setTrainees(data);
    }

    loadTrainees();
  }, []);

  function pageContent() {
    if (activePage === "Dashboard") {
      return (
        <Dashboard
          trainees={trainees}
        />
      );
    }

    if (activePage === "Records") {
      return <Records />;
    }

    if (
      activePage === "Daily Observation Reports"
    ) {
      return <DORForm />;
    }

    return (
      <div
        style={{
          padding: "32px",
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
        }}
      >
        <h2>{activePage}</h2>

        <p style={{ color: "#94a3b8" }}>
          This is the prototype{" "}
          {activePage.toLowerCase()} page.
        </p>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <Login
        onLogin={() => setLoggedIn(true)}
      />
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#0f172a",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <Sidebar
        menuItems={menuItems}
        activePage={activePage}
        onPageChange={setActivePage}
      />

      <section
        style={{
          flex: 1,
          minWidth: 0,
          padding: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 6px",
                color: "#94a3b8",
              }}
            >
              Welcome back
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "32px",
              }}
            >
              {activePage}
            </h1>
          </div>

          <button
            onClick={() => {
              setLoggedIn(false);
              setActivePage("Dashboard");
            }}
            style={{
              padding: "10px 16px",
              backgroundColor: "#1e293b",
              color: "white",
              border:
                "1px solid #475569",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Log Out
          </button>
        </div>

        {pageContent()}
      </section>
    </main>
  );
}