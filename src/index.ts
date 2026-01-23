import {
  createVocabulary,
  deleteVocabulary,
  getAllVocabulary,
  updateVocabulary,
} from "./db";

const PUBLIC_DIR = new URL("../public", import.meta.url).pathname;

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": Bun.file(`${PUBLIC_DIR}/index.html`),
    "/api/vocabulary": {
      GET: () => Response.json(getAllVocabulary()),
      POST: async (request) => {
        const body = (await request.json()) as { front?: string; back?: string };
        const { front, back } = body;

        if (!front || !back) {
          return Response.json(
            { error: "front and back are required" },
            { status: 400 }
          );
        }

        const vocabulary = createVocabulary(front, back);
        return Response.json(vocabulary, { status: 201 });
      },
    },
    "/api/vocabulary/:id": {
      PATCH: async (request) => {
        const id = request.params.id;
        const body = (await request.json()) as { front?: string; back?: string };

        const vocabulary = updateVocabulary(id, body);

        if (!vocabulary) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        return Response.json(vocabulary);
      },
      DELETE: (request) => {
        const id = request.params.id;
        const deleted = deleteVocabulary(id);

        if (!deleted) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }

        return new Response(null, { status: 204 });
      },
    },
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
