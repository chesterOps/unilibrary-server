import { megaStorage } from "../config/megaClient";

export const uploadToMega = async (
  fileBuffer: Buffer,
  fileName: string,
  folderName: string = "unilibrary",
) => {
  return new Promise(async (resolve, reject) => {
    // Check for folder

    const storage = await megaStorage.ready;

    const file = await storage.upload(fileName, fileBuffer).complete;

    const link = await file.link({ key: file.key as Buffer });
    // On successful upload
    resolve({
      megaFileId: file.nodeId,
      url: link,
      size: file.size,
      name: file.name,
    });
  });
};

export const deleteOne = async (nodeId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Find file
      const file = megaStorage.files[nodeId];

      // Check if file was found
      if (!file) return reject(new Error("File not found"));

      // Delete file
      file.delete(true, (err: any) => {
        if (err) return reject(err);
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
};
