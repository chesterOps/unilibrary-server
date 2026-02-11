"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Configure env
dotenv_1.default.config();
const appError_1 = __importDefault(require("./utils/appError"));
const errorHandler_1 = __importDefault(require("./utils/errorHandler"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
const book_routes_1 = __importDefault(require("./routes/book.routes"));
const express_1 = __importDefault(require("express"));
const db_1 = require("./config/db");
// Create express app
const app = (0, express_1.default)();
// Logging with morgan
if (process.env.NODE_ENV === "development")
    app.use((0, morgan_1.default)("dev"));
// Define port
const PORT = Number(process.env.PORT || 3000);
// Allowed origins
const allowedOrigins = process.env.FRONT_URL?.split(" ");
// Allow all origins
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin)
            return callback(null, true);
        // Allow allowed origins
        if (allowedOrigins && allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
// Parse body
app.use(express_1.default.json({
    limit: "10kb",
}));
// Book router
app.use("/api/v1/books", book_routes_1.default);
// Send response
app.get("/", (_req, res) => {
    res.status(200).json({
        message: "Hello there",
    });
});
// Not found response
app.all("/{*any}", (req, _res, next) => {
    next(new appError_1.default(`Can't find ${req.originalUrl} on this server!`, 404));
});
// Global error handler
app.use(errorHandler_1.default);
// Connect to database
(0, db_1.connectDB)();
// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// Uncaught exception
process.on("uncaughtException", (err) => {
    console.log("Uncaught exception!, Shutting down...");
    console.error(err.name, err.message);
    process.exit(1);
});
// Unhandled rejection
process.on("unhandledRejection", (err) => {
    console.log("Unhandled rejection!, Shutting down...");
    console.error(err.name, err.message);
    server.close(() => process.exit(1));
});
