import dotenv from "dotenv";

// Configure env
dotenv.config();

import AppError from "./utils/appError";
import errorHandler from "./utils/errorHandler";
import morgan from "morgan";
import express, { Express, Response, Request, NextFunction } from "express";
import bookRouter from "./routes/book.routes";
import { connectDB } from "./config/db";

// Create express app
const app: Express = express();

// Logging with morgan
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// Define port
const PORT: number = Number(process.env.PORT || 3000);

// Parse body
app.use(
  express.json({
    limit: "10kb",
  })
);

// Book router
app.use("/api/v1/books", bookRouter);

// Send response
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "Hello there",
  });
});

// Not found response
app.all("/{*any}", (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(errorHandler);

// Connect to database
connectDB();

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Uncaught exception
process.on("uncaughtException", (err: Error) => {
  console.log("Uncaught exception!, Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

// Unhandled rejection
process.on("unhandledRejection", (err: Error) => {
  console.log("Unhandled rejection!, Shutting down...");
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});
