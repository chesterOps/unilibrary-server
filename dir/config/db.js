"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Queries fail immediately when there's no active connection instead of queuing
mongoose_1.default.set("bufferCommands", false);
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGO_URL || "", {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 20000,
        });
        console.log("Connected to Database");
    }
    catch (error) {
        console.error("Error connecting to Database:", error);
        throw error;
    }
};
exports.connectDB = connectDB;
