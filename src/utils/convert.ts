import { fromBuffer } from "pdf2pic";

export const convertPdfToImage = async (buffer: Buffer) => {
  const options = {
    density: 100,
    saveFilename: "cover",
    savePath: "",
    format: "png",
    width: 600,
    height: 800,
  };

  const convert = fromBuffer(buffer, options);

  // Convert page 1 of PDF
  const result = await convert(1, { responseType: "buffer" });

  // Full path to generated image
  return result.buffer;
};
