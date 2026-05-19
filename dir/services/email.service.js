"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPasswordResetUrl = buildPasswordResetUrl;
exports.sendEmail = sendEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
function getFrontendBaseUrl() {
    const configured = process.env.RESET_PASSWORD_URL ||
        process.env.CLIENT_URL ||
        process.env.FRONT_URL ||
        "http://localhost:5173";
    return configured.split(/\s+/)[0].replace(/\/$/, "");
}
function buildPasswordResetUrl(token) {
    return `${getFrontendBaseUrl()}/reset-password/${token}`;
}
function createTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        return null;
    }
    return nodemailer_1.default.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });
}
async function sendEmail(options) {
    const transport = createTransport();
    if (!transport) {
        console.warn("[Email] SMTP is not configured; email was not sent.");
        if (process.env.NODE_ENV === "production") {
            throw new Error("SMTP is not configured.");
        }
        return false;
    }
    await transport.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        ...options,
    });
    return true;
}
