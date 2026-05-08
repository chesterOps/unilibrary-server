"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const users_controller_1 = require("../controllers/users.controller");
const usersRouter = express_1.default.Router();
usersRouter.get("/lecturer-stats", auth_middleware_1.protect, (0, auth_middleware_1.authorize)("lecturer", "admin"), users_controller_1.getLecturerStats);
usersRouter.get("/stats", auth_middleware_1.protect, users_controller_1.getUserStats);
usersRouter.get("/history", auth_middleware_1.protect, users_controller_1.getHistory);
exports.default = usersRouter;
