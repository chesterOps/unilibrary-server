"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
// Slugify
function slugify(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-");
}
