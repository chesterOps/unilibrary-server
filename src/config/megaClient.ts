import { Storage } from "megajs";

// Create MEGA storage instance
export const megaStorage = new Storage({
  email: process.env.MEGA_EMAIL!,
  password: process.env.MEGA_PASSWORD!,
});
