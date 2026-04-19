import { Server } from "socket.io";

export let io: Server | null = null;

export const setSocketServer = (server: Server) => {
  io = server;
};
