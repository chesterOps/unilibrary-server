import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { connectDB } from "./config/db";
import AppError from "./utils/appError";
import errorHandler from "./utils/errorHandler";

// ── Route imports ─────────────────────────────────────────────────────────────
import bookRouter from "./routes/book.routes";
import authRouter from "./routes/auth.routes";
import materialRouter from "./routes/material.routes";
import searchRouter from "./routes/search.routes";
import recommendationRouter from "./routes/recommendation.routes";
import adminRouter from "./routes/admin.routes";
import usersRouter from "./routes/users.routes";
import documentsRouter from "./routes/documents.routes";
import chatbotRouter from "./routes/chatbot.routes";

// ── App ───────────────────────────────────────────────────────────────────────
const app: Express = express();
const PORT: number = Number(process.env.PORT || 3000);

// ── Global middleware ─────────────────────────────────────────────────────────

// Security: set well-known HTTP headers (X-Frame-Options, CSP, HSTS …)
app.use(helmet());

// CORS: credentials=true enables the browser to send cookies / auth headers
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (mobile apps, curl, Postman)
      // In production, replace with an explicit allowlist from FRONT_URL env var
      if (!origin) return callback(null, true);
      callback(null, true);
    },
    credentials: true,
  }),
);

// HTTP request logging in development
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// Body parsers — 10 kb cap prevents large-payload DoS on JSON endpoints
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Cookie parser — needed by JWT-in-cookie flows and future session support
app.use(cookieParser());

// Hard 25-second ceiling per request — returns 408 instead of hanging forever
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setTimeout(25000, () => {
    if (!res.headersSent) {
      res.status(408).json({ status: "error", message: "Request timed out." });
    }
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
//
// Registration order matters only when paths could shadow each other.
// All these prefixes are disjoint, so order here is purely for readability.
//
// Route map
// ─────────────────────────────────────────────────────────────────────────────
// POST   /api/v1/auth/register
// POST   /api/v1/auth/login
// POST   /api/v1/auth/forgot-password
// PATCH  /api/v1/auth/reset-password/:token
// GET    /api/v1/auth/me                         [protect]
//
// GET    /api/v1/books
// POST   /api/v1/books                           [protect, lecturer|admin]
// GET    /api/v1/books/:id
// DELETE /api/v1/books/:id
// GET    /api/v1/books/:id/read
//
// GET    /api/v1/materials
// POST   /api/v1/materials                       [protect, lecturer|admin]
// GET    /api/v1/materials/:id
// POST   /api/v1/materials/:id/view              [protect]
//
// POST   /api/v1/search                          semantic (OpenAI)
// GET    /api/v1/search?q=term                   keyword $regex fallback
//
// GET    /api/v1/recommendations                 [protect, student]
// GET    /api/v1/recommendations/popular         public
//
// GET    /api/v1/admin/stats                     [protect, admin]
// GET    /api/v1/admin/users                     [protect, admin]
// GET    /api/v1/admin/pending-users             [protect, admin]
// PUT    /api/v1/admin/users/:id/approve         [protect, admin]
// PUT    /api/v1/admin/users/:id/reject          [protect, admin]
// PUT    /api/v1/admin/users/:id/role            [protect, admin]
// GET    /api/v1/admin/materials/pending         [protect, admin]
// PUT    /api/v1/admin/materials/:id/approve     [protect, admin]
// ─────────────────────────────────────────────────────────────────────────────

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/books", bookRouter);
app.use("/api/v1/materials", materialRouter);
app.use("/api/v1/documents", documentsRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/recommendations", recommendationRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/chatbot", chatbotRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "UniLibrary API is running" });
});

// ── 404 — must be after all valid routes ──────────────────────────────────────
app.all("/{*any}", (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404));
});

// ── Global error handler — must be last middleware ────────────────────────────
app.use(errorHandler);

// ── Process-level safety nets ─────────────────────────────────────────────────
process.on("uncaughtException", (err: Error) => {
  console.error("UNCAUGHT EXCEPTION — shutting down:", err.name, err.message);
  process.exit(1);
});

// ── Database connection + server start ───────────────────────────────────────
// Await DB before accepting requests so the first login/register never races
// against an incomplete connection.
(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error("Failed to connect to database — shutting down:", err);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV ?? "development"}]`);
  });

  process.on("unhandledRejection", (err: Error) => {
    console.error("UNHANDLED REJECTION — shutting down:", err.name, err.message);
    server.close(() => process.exit(1));
  });
})();
