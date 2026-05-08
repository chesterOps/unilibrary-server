"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const recommendation_controller_1 = require("../controllers/recommendation.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const recommendationRouter = express_1.default.Router();
// /popular must be registered before any /:param route to prevent Express
// from treating the literal string "popular" as a parameter value.
recommendationRouter.get("/popular", recommendation_controller_1.getPopular);
recommendationRouter.get("/", auth_middleware_1.optionalProtect, recommendation_controller_1.getRecommendations);
exports.default = recommendationRouter;
