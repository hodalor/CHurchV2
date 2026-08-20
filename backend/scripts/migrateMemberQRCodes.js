const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const connectDatabase = require("../src/config/db");
const { migrateMemberQRCodes } = require("../src/services/memberQrService");

async function run() {
  await connectDatabase();
  const summary = await migrateMemberQRCodes();
  console.log(`Member QR migration complete. Updated ${summary.updatedCount} records.`);
  process.exit(0);
}

run().catch((error) => {
  console.error("Member QR migration failed:", error.message);
  process.exit(1);
});
