import {
  createVocabulary,
  deleteVocabulary,
  getAllVocabulary,
  updateVocabulary,
} from "./db";

const PUBLIC_DIR = new URL("../public", import.meta.url).pathname;

const controller = {
  index: Bun.file(`${PUBLIC_DIR}/index.html`),

  vocabulary: {
    index: () => Response.json(getAllVocabulary()),
    create: async (request: Bun.BunRequest<"/api/vocabulary">) => {
      const body = (await request.json()) as {
        front?: string;
        back?: string;
      };
      const { front, back } = body;

      if (!front || !back) {
        return Response.json(
          { error: "front and back are required" },
          { status: 400 },
        );
      }

      const vocabulary = createVocabulary(front, back);

      return Response.json(vocabulary, { status: 201 });
    },
    update: async (request: Bun.BunRequest<"/api/vocabulary/:id">) => {
      const id = request.params.id;
      const body = (await request.json()) as {
        front?: string;
        back?: string;
      };

      const vocabulary = updateVocabulary(id, body);

      if (!vocabulary) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      return Response.json(vocabulary);
    },
    delete: async (request: Bun.BunRequest<"/api/vocabulary/:id">) => {
      const id = request.params.id;
      const deleted = deleteVocabulary(id);

      if (!deleted) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      return new Response(null, { status: 204 });
    },
  },

  static: async (request: Bun.BunRequest) => {
    const url = new URL(request.url);
    const file = Bun.file(`${PUBLIC_DIR}${url.pathname}`);

    if (await file.exists()) {
      return new Response(file);
    }

    return Response.json({ message: "Not Found" }, { status: 404 });
  },
};

export default controller;
