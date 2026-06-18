import { loadConfig } from "./config.js";
import { buildServer } from "./api/server.js";

const config = loadConfig();
const app = buildServer(config);

app
  .listen({ port: config.port, host: config.host })
  .then(() => {
    console.log(`[speckit-dashboard] backend listening on http://${config.host}:${config.port}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
