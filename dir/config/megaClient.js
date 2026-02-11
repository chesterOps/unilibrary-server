"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.megaStorage = void 0;
const megajs_1 = require("megajs");
// Create MEGA storage instance
exports.megaStorage = new megajs_1.Storage({
    email: process.env.MEGA_EMAIL,
    password: process.env.MEGA_PASSWORD,
}, () => {
    console.log("Connected to MEGA");
});
