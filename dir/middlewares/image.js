"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteImage = exports.uploadImage = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const streamifier_1 = __importDefault(require("streamifier"));
const uploadToCloudinary = (buffer, folder = "unilibrary", public_id) => new Promise((resolve, reject) => {
    const stream = cloudinary_1.default.uploader.upload_stream({ folder, public_id, resource_type: "auto" }, (err, result) => (err ? reject(err) : resolve(result)));
    streamifier_1.default.createReadStream(buffer).pipe(stream);
});
const uploadImage = (field) => async (req, _res, next) => {
    // Check for single image file
    if (req.files) {
        try {
            // Split file name by "." to remove extension
            const file = req.files[field]?.[0];
            if (!file) {
                return next();
            }
            const fileName = file.originalname.split(".");
            // Remove the last part (extension)
            fileName.pop();
            // Sanitize filename - remove special characters
            const sanitizedName = fileName.join("").replace(/[^a-zA-Z0-9]/g, "_");
            // Create timestamp
            const timestamp = Date.now();
            // Create public_id
            const public_id = `${timestamp}-${sanitizedName}`;
            // Upload to Cloudinary
            const result = (await uploadToCloudinary(file.buffer, "unilibrary", public_id));
            const image = {
                public_id: result.public_id,
                url: result.secure_url,
            };
            // Attach to request body
            req.body[field] = image;
        }
        catch (error) {
            // Log error but don't block the request
            console.error(`Image upload failed for field "${field}":`, error.message);
        }
    }
    // Next middleware
    next();
};
exports.uploadImage = uploadImage;
const deleteImage = async (image) => {
    try {
        // Delete image from cloudinary
        await cloudinary_1.default.api.delete_resources([image]);
    }
    catch (err) {
        console.log("Error deleting image:", err);
    }
};
exports.deleteImage = deleteImage;
