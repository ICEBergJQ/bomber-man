import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { initializeGame } from "./serverUtils/gameUtils.js";
import { initWS } from "./serverUtils/WsUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const requestHandler = (req, res) => {
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  };
  const contentType = mimeTypes[extname] || "application/octet-stream";
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        fs.readFile(path.join(__dirname, "index.html"), (err, content) => {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(content, "utf-8");
        });
      } else {
        res.writeHead(500);
        res.end("Server error: " + err.code);
      }
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content, "utf-8");
    }
  });
};

const server = http.createServer(requestHandler);
initializeGame();
initWS(server);

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
