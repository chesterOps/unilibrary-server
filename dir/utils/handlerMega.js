"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOne = exports.uploadToMega = void 0;
const megaClient_1 = require("../config/megaClient");
const uploadToMega = async (fileBuffer, fileName, folderName = "unilibrary") => {
    return new Promise(async (resolve, reject) => {
        // Check for folder
        let folder;
        folder = megaClient_1.megaStorage.root.children?.find((f) => f.name === folderName);
        // Create folder if it doesn't exist
        if (!folder)
            folder = await megaClient_1.megaStorage.mkdir(folderName);
        // Upload file to MEGA
        const upload = folder.upload(fileName, fileBuffer);
        // Handle upload errors
        upload.on("error", (err) => reject(err));
        // On successful upload
        upload.on("complete", async (file) => {
            try {
                // Get file link
                const link = await file.link({ key: file.key });
                // Return file details
                resolve({
                    megaFileId: file.nodeId,
                    url: link,
                    size: file.size,
                    name: file.name,
                });
            }
            catch (err) {
                reject(err);
            }
        });
    });
};
exports.uploadToMega = uploadToMega;
const deleteOne = async (nodeId) => {
    return new Promise((resolve, reject) => {
        try {
            // Find file
            const file = megaClient_1.megaStorage.files[nodeId];
            // Check if file was found
            if (!file)
                return reject(new Error("File not found"));
            // Delete file
            file.delete(true, (err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        }
        catch (err) {
            reject(err);
        }
    });
};
exports.deleteOne = deleteOne;
