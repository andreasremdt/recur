import { getAllVocabulary } from "./db";

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": Bun.file(new URL("../public/index.html", import.meta.url)),
    "/api/vocabulary": Response.json(getAllVocabulary()),
    "/*": Response.json({ message: "Not Found" }, { status: 404 }),
  },
});

console.log(`Server running at http://localhost:${server.port}`);
