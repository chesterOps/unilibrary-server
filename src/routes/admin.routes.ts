import express from "express";
import {
  getStats,
  getUsers,
  updateUserRole,
  getPendingMaterials,
  approveMaterial,
} from "../controllers/admin.controller";
import { protect, authorize } from "../middlewares/auth.middleware";

const adminRouter = express.Router();

// Every route in this file requires a valid JWT *and* the admin role.
// Applying the middleware once at the router level is cleaner than
// repeating it on every route definition.
adminRouter.use(protect, authorize("admin"));

adminRouter.get("/stats", getStats);

adminRouter.get("/users", getUsers);
adminRouter.put("/users/:id/role", updateUserRole);

// /materials/pending must be registered before /materials/:id so Express
// does not treat the literal string "pending" as a value for :id.
adminRouter.get("/materials/pending", getPendingMaterials);
adminRouter.put("/materials/:id/approve", approveMaterial);

export default adminRouter;
