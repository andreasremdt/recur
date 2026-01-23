import { getAllVocabulary } from "./db";

const PUBLIC_DIR = new URL("../public", import.meta.url).pathname;

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": Bun.file(`${PUBLIC_DIR}/index.html`),
    "/api/vocabulary": Response.json(getAllVocabulary()),
    "/*": async (request) => {
      const url = new URL(request.url);
      const file = Bun.file(`${PUBLIC_DIR}${url.pathname}`);

      if (await file.exists()) {
        return new Response(file);
      }

      return Response.json({ message: "Not Found" }, { status: 404 });
    },
  },
});

console.log(`Server running at http://localhost:${server.port}`);
