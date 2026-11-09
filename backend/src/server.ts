import { createApp } from "./app.js";
import { env } from "./env.js";
import { escutar } from "./listen.js";

await escutar(createApp(), env.port);
console.log(`InfoHub API ouvindo em http://127.0.0.1:${env.port}/api/v1`);
