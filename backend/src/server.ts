import { createApp } from "./app.js";
import { env } from "./env.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`InfoHub API ouvindo em http://localhost:${env.port}/api/v1`);
});
