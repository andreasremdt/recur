import { Database } from "bun:sqlite";

const db = new Database("dev.db");

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": Bun.file(new URL("../public/index.html", import.meta.url)),
    "/api/hello": Response.json({ message: "Hello World" }),
    "/*": Response.json({ message: "Not Found" }, { status: 404 }),
  },
});

console.log(`Server running at http://localhost:${server.port}`);
