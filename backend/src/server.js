const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const connectDatabase = require("./config/db");
const attachRequestScope = require("./middleware/attachRequestScope");
const { applySecurityHeaders } = require("./middleware/security");
const { runWithRequestContext } = require("./lib/requestContext");
const { bootstrapApplicationData } = require("./seed/bootstrap");
const auditRoutes = require("./routes/auditRoutes");
const aiAssistRoutes = require("./routes/aiAssistRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const authRoutes = require("./routes/authRoutes");
const churchRoutes = require("./routes/churchRoutes");
const communicationRoutes = require("./routes/communicationRoutes");
const careRoutes = require("./routes/careRoutes");
const discipleshipRoutes = require("./routes/discipleshipRoutes");
const evangelismRoutes = require("./routes/evangelismRoutes");
const financeRoutes = require("./routes/financeRoutes");
const groupRoutes = require("./routes/groupRoutes");
const importRoutes = require("./routes/importRoutes");
const leadershipRoutes = require("./routes/leadershipRoutes");
const lookupRoutes = require("./routes/lookupRoutes");
const mediaRoutes = require("./routes/mediaRoutes");
const ministryRoutes = require("./routes/ministryRoutes");
const memberRoutes = require("./routes/memberRoutes");
const familyRoutes = require("./routes/familyRoutes");
const pendingActionRoutes = require("./routes/pendingActionRoutes");
const setupRoutes = require("./routes/setupRoutes");
const spiritualHealthRoutes = require("./routes/spiritualHealthRoutes");
const strategicRoutes = require("./routes/strategicRoutes");
const userRoutes = require("./routes/userRoutes");
const visitorRoutes = require("./routes/visitorRoutes");

const app = express();
const PORT = process.env.PORT || 5100;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = getAllowedOrigins();

      if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS origin not allowed."));
    },
  })
);
app.use(applySecurityHeaders);
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) =>
  runWithRequestContext(
    {
      scope: "master",
      churchId: "",
      tenantDbName: "",
    },
    next
  )
);
app.use(attachRequestScope);

app.get("/api/health", (req, res) => {
  res.json({
    message: "Church management backend is running.",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/ai-assist", aiAssistRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/churches", churchRoutes);
app.use("/api/communication", communicationRoutes);
app.use("/api/care", careRoutes);
app.use("/api/discipleship", discipleshipRoutes);
app.use("/api/evangelism", evangelismRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/leadership", leadershipRoutes);
app.use("/api/lookups", lookupRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/ministries", ministryRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/pending-actions", pendingActionRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/spiritual-health", spiritualHealthRoutes);
app.use("/api/strategic", strategicRoutes);
app.use("/api/users", userRoutes);
app.use("/api/visitors", visitorRoutes);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Something went wrong.",
  });
});

startServer();

async function startServer() {
  try {
    await connectDatabase();
    await bootstrapApplicationData();
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start backend:", error.message);
    process.exit(1);
  }
}

function getAllowedOrigins() {
  return String(process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
