require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDatabase = require("./config/db");
const groupRoutes = require("./routes/groupRoutes");
const ministryRoutes = require("./routes/ministryRoutes");
const memberRoutes = require("./routes/memberRoutes");
const setupRoutes = require("./routes/setupRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

connectDatabase();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    message: "Church management backend is running.",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/groups", groupRoutes);
app.use("/api/ministries", ministryRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/setup", setupRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Something went wrong.",
  });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
