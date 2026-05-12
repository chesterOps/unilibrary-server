"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./config/db");
const user_model_1 = __importDefault(require("./models/user.model"));
const appError_1 = __importDefault(require("./utils/appError"));
const errorHandler_1 = __importDefault(require("./utils/errorHandler"));
// ── Route imports ─────────────────────────────────────────────────────────────
const book_routes_1 = __importDefault(require("./routes/book.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const material_routes_1 = __importDefault(require("./routes/material.routes"));
const search_routes_1 = __importDefault(require("./routes/search.routes"));
const recommendation_routes_1 = __importDefault(require("./routes/recommendation.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const documents_routes_1 = __importDefault(require("./routes/documents.routes"));
const chatbot_routes_1 = __importDefault(require("./routes/chatbot.routes"));
// ── App ───────────────────────────────────────────────────────────────────────
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || 3000);
// ── Global middleware ─────────────────────────────────────────────────────────
// Security: set well-known HTTP headers (X-Frame-Options, CSP, HSTS …)
app.use((0, helmet_1.default)());
// CORS: credentials=true enables the browser to send cookies / auth headers
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no Origin header (mobile apps, curl, Postman)
        // In production, replace with an explicit allowlist from FRONT_URL env var
        if (!origin)
            return callback(null, true);
        callback(null, true);
    },
    credentials: true,
}));
// HTTP request logging in development
if (process.env.NODE_ENV === "development")
    app.use((0, morgan_1.default)("dev"));
// Body parsers — 10 kb cap prevents large-payload DoS on JSON endpoints
app.use(express_1.default.json({ limit: "10kb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10kb" }));
// Cookie parser — needed by JWT-in-cookie flows and future session support
app.use((0, cookie_parser_1.default)());
// Hard 25-second ceiling per request — returns 408 instead of hanging forever
app.use((_req, res, next) => {
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
app.use("/api/v1/auth", auth_routes_1.default);
app.use("/api/v1/books", book_routes_1.default);
app.use("/api/v1/materials", material_routes_1.default);
app.use("/api/v1/documents", documents_routes_1.default);
app.use("/api/v1/search", search_routes_1.default);
app.use("/api/v1/recommendations", recommendation_routes_1.default);
app.use("/api/v1/admin", admin_routes_1.default);
app.use("/api/v1/users", users_routes_1.default);
app.use("/api/v1/chatbot", chatbot_routes_1.default);
// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok", message: "UniLibrary API is running" });
});
app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
// ── 404 — must be after all valid routes ──────────────────────────────────────
app.all("/{*any}", (req, _res, next) => {
    next(new appError_1.default(`Cannot find ${req.originalUrl} on this server.`, 404));
});
// ── Global error handler — must be last middleware ────────────────────────────
app.use(errorHandler_1.default);
// ── Process-level safety nets ─────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION — shutting down:", err.name, err.message);
    process.exit(1);
});
// ── Database connection + server start ───────────────────────────────────────
// Await DB before accepting requests so the first login/register never races
// against an incomplete connection.
(async () => {
    try {
        await (0, db_1.connectDB)();
    }
    catch (err) {
        console.error("Failed to connect to database — shutting down:", err);
        process.exit(1);
    }
    // Ensure a default admin account always exists
    const adminEmail = process.env.ADMIN_EMAIL ?? "admin@unilibrary.com";
    const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123";
    const existing = await user_model_1.default.findOne({ email: adminEmail });
    if (!existing) {
        await user_model_1.default.create({
            name: "Admin",
            email: adminEmail,
            password: adminPassword,
            role: "admin",
            department: "Administration",
            approved: true,
            courses: [],
        });
        console.log(`Default admin created — email: ${adminEmail}`);
    }
    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} [${process.env.NODE_ENV ?? "development"}]`);
    });
    process.on("unhandledRejection", (err) => {
        console.error("UNHANDLED REJECTION — shutting down:", err.name, err.message);
        server.close(() => process.exit(1));
    });
})();
