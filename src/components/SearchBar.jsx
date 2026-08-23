function SearchBar({ search, setSearch }) {
  return (
    <div
      style={{
        width: "100%",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "15px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#596579",
            fontSize: "16px",
            pointerEvents: "none",
          }}
        >
          🔍
        </span>

        <input
          type="text"
          placeholder="Search employee, department or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            height: "48px",
            padding: "0 45px",
            background: "#0D1524",
            border: "1px solid #273449",
            borderRadius: "9px",
            color: "#f5f7fb",
            outline: "none",
            fontSize: "13px",
            boxSizing: "border-box",
            transition: "0.2s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#3b82f6";
            e.target.style.boxShadow =
              "0 0 0 3px rgba(59, 130, 246, 0.12)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#273449";
            e.target.style.boxShadow = "none";
          }}
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              color: "#8994a8",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;