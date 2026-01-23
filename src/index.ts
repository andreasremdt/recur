import controller from "./controller";

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": controller.index,
    "/api/vocabulary": {
      GET: controller.vocabulary.index,
      POST: controller.vocabulary.create,
    },
    "/api/vocabulary/:id": {
      PATCH: controller.vocabulary.update,
      DELETE: controller.vocabulary.delete,
    },
    "/api/training": {
      GET: controller.training.scheduled,
    },
    "/api/training/:id": {
      POST: controller.training.review,
    },
    "/*": controller.static,
  },
});

console.log(`Server running at http://localhost:${server.port}`);
