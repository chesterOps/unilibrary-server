"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const adminRouter = express_1.default.Router();
// Every route in this file requires a valid JWT *and* the admin role.
// Applying the middleware once at the router level is cleaner than
// repeating it on every route definition.
adminRouter.use(auth_middleware_1.protect, (0, auth_middleware_1.authorize)("admin"));
adminRouter.get("/stats", admin_controller_1.getStats);
adminRouter.get("/users", admin_controller_1.getUsers);
adminRouter.get("/pending-users", admin_controller_1.getPendingUsers);
adminRouter.put("/users/:id/approve", admin_controller_1.approveUser);
adminRouter.put("/users/:id/reject", admin_controller_1.rejectUser);
adminRouter.put("/users/:id/role", admin_controller_1.updateUserRole);
// /materials/pending must be registered before /materials/:id so Express
// does not treat the literal string "pending" as a value for :id.
adminRouter.get("/materials/pending", admin_controller_1.getPendingMaterials);
adminRouter.put("/materials/:id/approve", admin_controller_1.approveMaterial);
adminRouter.put("/materials/:id/reject", admin_controller_1.rejectMaterial);
exports.default = adminRouter;
