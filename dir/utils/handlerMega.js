"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOne = exports.uploadToMega = void 0;
const megaClient_1 = require("../config/megaClient");
const uploadToMega = async (fileBuffer, fileName, folderName = "unilibrary") => {
    return new Promise(async (resolve, reject) => {
        const storage = await (0, megaClient_1.getMegaStorage)().ready;
        const file = await storage.upload(fileName, fileBuffer).complete;
        const link = await file.link({ key: file.key });
        resolve({
            megaFileId: file.nodeId,
            url: link,
            size: file.size,
            name: file.name,
        });
    });
};
exports.uploadToMega = uploadToMega;
const deleteOne = async (nodeId) => {
    return new Promise((resolve, reject) => {
        try {
            const file = (0, megaClient_1.getMegaStorage)().files[nodeId];
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
