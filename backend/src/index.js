import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import app from "./app.js";
import { Server } from "socket.io";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

const port = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } }); 

app.set("io", io);

import initQuizSocket from "./modules/quizes/quiz.socket.js";
initQuizSocket(io);

async function start() {
  try {
    server.listen(port, () => {
      console.log(`Server running at https://quiz-app-backend-7m74.onrender.com`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
