"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getSecret = () => {
    if (!process.env.JWT_SECRET)
        throw new Error("JWT_SECRET is not defined");
    return process.env.JWT_SECRET;
};
const signToken = (id) => jsonwebtoken_1.default.sign({ id }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
});
exports.signToken = signToken;
const verifyToken = (token) => jsonwebtoken_1.default.verify(token, getSecret());
exports.verifyToken = verifyToken;
