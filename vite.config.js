import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { WebSocketServer } from "ws";

function controllerRelay() {
  return {
    name: "sao-controller-relay",
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });
      const rooms = new Map();
      server.httpServer.on("upgrade", (request, socket, head) => {
        const url = new URL(request.url, "http://localhost");
        if (url.pathname !== "/controller-socket") return;
        wss.handleUpgrade(request, socket, head, (client) => {
          const token = url.searchParams.get("token");
          const role = url.searchParams.get("role");
          if (!token || !["host", "controller"].includes(role)) return client.close();
          client.room = token;
          client.role = role;
          const room = rooms.get(token) || new Set();
          room.add(client);
          rooms.set(token, room);
          const publishStatus = () => {
            const peers = [...room].filter((peer) => peer.readyState === 1);
            const connected = peers.some((peer) => peer.role === "host") && peers.some((peer) => peer.role === "controller");
            peers.forEach((peer) => peer.send(JSON.stringify({ type: "status", connected })));
          };
          publishStatus();
          client.on("message", (data) => {
            for (const peer of room)
              if (peer !== client && peer.readyState === 1) peer.send(data.toString());
          });
          client.on("close", () => {
            room.delete(client);
            if (!room.size) rooms.delete(token);
            else publishStatus();
          });
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), controllerRelay()],
  server: { host: "0.0.0.0" },
});
