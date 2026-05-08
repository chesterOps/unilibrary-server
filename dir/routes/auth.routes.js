"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const authRouter = express_1.default.Router();
authRouter.post("/register", auth_controller_1.register);
authRouter.post("/login", auth_controller_1.login);
authRouter.post("/forgot-password", auth_controller_1.forgotPassword);
authRouter.patch("/reset-password/:token", auth_controller_1.resetPassword);
// Protected routes — must be logged in
authRouter.use(auth_middleware_1.protect);
authRouter.get("/me", auth_controller_1.getMe);
exports.default = authRouter;
