function SearchBar({search,setSearch}) {
  return (
    <div style={{ marginTop: "20px", marginBottom: "20px" }}>
      <input
        type="text"
        placeholder="Search Employee..."
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
        style={{
          width: "300px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          fontSize: "16px",
        }}
      />
    </div>
  );
}

export default SearchBar;