import {
  createVocabulary,
  deleteVocabulary,
  getAllVocabulary,
  getScheduledVocabulary,
  updateVocabulary,
  updateVocabularyBox,
  createUser,
  findUserByEmail,
  createSession,
  getSessionWithUser,
  deleteSession,
  updateLastLogin,
} from "./db";
import type { User } from "./types";

const PUBLIC_DIR = new URL("../public", import.meta.url).pathname;
const SESSION_COOKIE_NAME = "recur_session";

// Helper to extract session ID from cookies
function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  return cookies[SESSION_COOKIE_NAME] ?? null;
}

// Helper to get authenticated user from request
function getAuthenticatedUser(request: Request): Omit<User, "password"> | null {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return null;

  const result = getSessionWithUser(sessionId);
  return result?.user ?? null;
}

// Helper to create session cookie
function createSessionCookie(sessionId: string, rememberMe: boolean): string {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 24 hours
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}

// Helper to create expired cookie (for logout)
function createExpiredSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

const controller = {
  index: (request: Bun.BunRequest<"/">) => {
    const user = getAuthenticatedUser(request);
    if (!user) {
      return Response.redirect("/login.html", 302);
    }
    return new Response(Bun.file(`${PUBLIC_DIR}/index.html`));
  },

  vocabulary: {
    index: (request: Bun.BunRequest<"/api/vocabulary">) => {
      const user = getAuthenticatedUser(request);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const url = new URL(request.url);
      const sortBy = url.searchParams.get("sortBy") as
        | "front"
        | "box"
        | "next_review"
        | null;
      const sortDir = url.searchParams.get("sortDir") as
        | "ASC"
        | "DESC"
        | null;
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
      const page = parseInt(url.searchParams.get("page") ?? "1", 10);
      const offset = (page - 1) * limit;

      return Response.json(
        getAllVocabulary(
          user.id,
          sortBy ?? undefined,
          sortDir ?? undefined,
          limit,
          offset,
        ),
      );
    },
    create: async (request: Bun.BunRequest<"/api/vocabulary">) => {
      const user = getAuthenticatedUser(request);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

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

      const vocabulary = createVocabulary(front, back, user.id);

      return Response.json(vocabulary, { status: 201 });
    },
    update: async (request: Bun.BunRequest<"/api/vocabulary/:id">) => {
      const user = getAuthenticatedUser(request);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

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
      const user = getAuthenticatedUser(request);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = request.params.id;
      const deleted = deleteVocabulary(id);

      if (!deleted) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      return new Response(null, { status: 204 });
    },
  },

  training: {
    scheduled: (request: Bun.BunRequest<"/api/training">) => {
      const user = getAuthenticatedUser(request);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      return Response.json(getScheduledVocabulary(user.id));
    },
    review: async (request: Bun.BunRequest<"/api/training/:id">) => {
      const user = getAuthenticatedUser(request);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const id = request.params.id;
      const body = (await request.json()) as { correct?: boolean };

      if (typeof body.correct !== "boolean") {
        return Response.json(
          { error: "correct (boolean) is required" },
          { status: 400 },
        );
      }

      const vocabulary = updateVocabularyBox(id, body.correct);

      if (!vocabulary) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      return Response.json(vocabulary);
    },
  },

  auth: {
    register: async (request: Bun.BunRequest<"/api/auth/register">) => {
      const body = (await request.json()) as {
        name?: string;
        email?: string;
        password?: string;
      };

      const { name, email, password } = body;

      if (!name || !email || !password) {
        return Response.json(
          { error: "name, email, and password are required" },
          { status: 400 },
        );
      }

      if (password.length < 8) {
        return Response.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 },
        );
      }

      const user = await createUser(name, email, password);

      if (!user) {
        return Response.json(
          { error: "Email already exists" },
          { status: 409 },
        );
      }

      // Automatically log in the user after registration
      const session = createSession(user.id, false);

      return new Response(JSON.stringify(user), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": createSessionCookie(session.id, false),
        },
      });
    },

    login: async (request: Bun.BunRequest<"/api/auth/login">) => {
      const body = (await request.json()) as {
        email?: string;
        password?: string;
        rememberMe?: boolean;
      };

      const { email, password, rememberMe = false } = body;

      if (!email || !password) {
        return Response.json(
          { error: "email and password are required" },
          { status: 400 },
        );
      }

      const user = findUserByEmail(email);

      if (!user) {
        return Response.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }

      const isValidPassword = await Bun.password.verify(password, user.password);

      if (!isValidPassword) {
        return Response.json(
          { error: "Invalid email or password" },
          { status: 401 },
        );
      }

      // Update last login timestamp
      updateLastLogin(user.id);

      // Create session
      const session = createSession(user.id, rememberMe);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      return new Response(JSON.stringify(userWithoutPassword), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": createSessionCookie(session.id, rememberMe),
        },
      });
    },

    logout: (request: Bun.BunRequest<"/api/auth/logout">) => {
      const sessionId = getSessionIdFromRequest(request);

      if (sessionId) {
        deleteSession(sessionId);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": createExpiredSessionCookie(),
        },
      });
    },

    me: (request: Bun.BunRequest<"/api/auth/me">) => {
      const user = getAuthenticatedUser(request);

      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      return Response.json(user);
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
