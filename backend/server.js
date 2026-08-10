const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Insider Threat BI Backend is running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK"
  });
});

app.get("/api/stats", (req, res) => {
  res.json({
    monitoredUsers: 248,
    activeThreats: 17,
    highRiskUsers: 8,
    threatsResolved: 136
  });
});
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});