import { Storage } from "megajs";

// Single persistent connection — created once, never reset
let _megaStorage: Storage | null = null;

export const getMegaStorage = (): Storage => {
  if (!_megaStorage) {
    _megaStorage = new Storage({
      email: process.env.MEGA_EMAIL!,
      password: process.env.MEGA_PASSWORD!,
    });
  }
  return _megaStorage;
};
