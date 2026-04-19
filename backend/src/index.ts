import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { consultancyRouter } from "./routes/consultancy";
import { essayRouter } from "./routes/essays";
import { healthRouter } from "./routes/health";
import { legalRouter } from "./routes/legal";
import { mockTestRouter } from "./routes/mockTests";
import { paymentRouter } from "./routes/payments";
import { studentRouter } from "./routes/student";
import { setSocketServer } from "./lib/socket";

const app = express();
const server = http.createServer(app);
const socketServer = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
  },
});
setSocketServer(socketServer);

socketServer.on("connection", (socket) => {
  socket.on("join:user", (userId: string) => {
    socket.join(userId);
  });
});

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

const ipLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(ipLimiter);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/legal", legalRouter);
app.use("/api/student", studentRouter);
app.use("/api/mock-tests", mockTestRouter);
app.use("/api/essays", essayRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/consultancy", consultancyRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

server.listen(env.PORT, () => {
  console.log(`Ascend backend listening on port ${env.PORT}`);
});
