import { getMegaStorage } from "../config/megaClient";

export const uploadToMega = async (
  fileBuffer: Buffer,
  fileName: string,
  folderName: string = "unilibrary",
) => {
  return new Promise(async (resolve, reject) => {
    const storage = await getMegaStorage().ready;

    const file = await storage.upload(fileName, fileBuffer).complete;

    const link = await file.link({ key: file.key as Buffer });
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
      const file = getMegaStorage().files[nodeId];

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
