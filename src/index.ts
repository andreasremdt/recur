import controller from "./controller";

const server = Bun.serve({
  port: process.env.PORT || 3000,
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
    "/api/languages": {
      GET: controller.languages.index,
      POST: controller.languages.create,
    },
    "/api/languages/:id": {
      DELETE: controller.languages.delete,
    },
    "/api/auth/register": {
      POST: controller.auth.register,
    },
    "/api/auth/login": {
      POST: controller.auth.login,
    },
    "/api/auth/logout": {
      POST: controller.auth.logout,
    },
    "/api/auth/me": {
      GET: controller.auth.me,
    },
    "/*": controller.static,
  },
});

console.log(`Server running at http://localhost:${server.port}`);
