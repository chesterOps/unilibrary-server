"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMegaStorage = void 0;
const megajs_1 = require("megajs");
// Lazy-initialized: only connects to MEGA when an upload is first requested,
// not at server boot. Prevents MEGA auth delays from blocking login/register.
let _megaStorage = null;
const getMegaStorage = () => {
    if (!_megaStorage) {
        _megaStorage = new megajs_1.Storage({
            email: process.env.MEGA_EMAIL,
            password: process.env.MEGA_PASSWORD,
        });
    }
    return _megaStorage;
};
exports.getMegaStorage = getMegaStorage;
