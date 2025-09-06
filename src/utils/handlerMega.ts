import { megaStorage } from "../config/megaClient";

export const uploadToMega = async (
  fileBuffer: Buffer,
  fileName: string,
  folderName: string = "unilibrary"
) => {
  return new Promise(async (resolve, reject) => {
    // Check for folder
    let folder;
    folder = megaStorage.root.children?.find((f) => f.name === folderName);

    // Create folder if it doesn't exist
    if (!folder) folder = await megaStorage.mkdir(folderName);

    // Upload file to MEGA
    const upload = folder.upload(fileName, fileBuffer);

    // Handle upload errors
    upload.on("error", (err) => reject(err));

    // On successful upload
    upload.on("complete", async (file) => {
      try {
        // Get file link
        const link = await file.link({ key: file.key as Buffer });

        // Return file details
        resolve({
          megaFileId: file.nodeId,
          url: link,
          size: file.size,
          name: file.name,
        });
      } catch (err) {
        reject(err);
      }
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
