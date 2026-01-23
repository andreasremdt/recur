import { Database } from "bun:sqlite";

const db = new Database("dev.db");

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": Bun.file(new URL("../public/index.html", import.meta.url)),
    "/api/hello": Response.json({ message: "Hello World" }),
    "/*": Response.json({ message: "Not Found" }, { status: 404 }),
  },
});

console.log(`Server running at http://localhost:${server.port}`);
