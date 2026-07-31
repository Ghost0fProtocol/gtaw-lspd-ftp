type SidebarProps = {
  menuItems: string[];
  activePage: string;
  onPageChange: (page: string) => void;
};

export default function Sidebar({
  menuItems,
  activePage,
  onPageChange,
}: SidebarProps) {
  return (
    <aside
      style={{
        width: "240px",
        flexShrink: 0,
        backgroundColor: "#111827",
        borderRight: "1px solid #334155",
        padding: "24px",
      }}
    >
      <p
        style={{
          margin: "0 0 6px",
          color: "#93c5fd",
          fontSize: "12px",
          fontWeight: "bold",
          letterSpacing: "1.5px",
        }}
      >
        TRAINING PORTAL
      </p>

      <h2 style={{ margin: "0 0 32px", fontSize: "20px" }}>
        Management System
      </h2>

      <nav>
        {menuItems.map((item) => (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "10px",
              textAlign: "left",
              backgroundColor:
                activePage === item ? "#2563eb" : "transparent",
              color: "white",
              border:
                activePage === item
                  ? "1px solid #3b82f6"
                  : "1px solid transparent",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}