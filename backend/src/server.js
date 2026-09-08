const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const connectDatabase = require("./config/db");
const { bootstrapApplicationData } = require("./seed/bootstrap");
const { createApp } = require("./app");
const PORT = process.env.PORT || 5100;
const app = createApp();

async function startServer() {
  await connectDatabase();
  await bootstrapApplicationData();

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Unable to start backend:", error.message);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
};
