import { Storage } from "megajs";

let _megaStorage: Storage | null = null;

export const getMegaStorage = (): Storage => {
  if (!_megaStorage) {
    _megaStorage = new Storage({
      email: process.env.MEGA_EMAIL!,
      password: process.env.MEGA_PASSWORD!,
    });
    // Reset cached instance on any error so the next request gets a fresh connection
    (_megaStorage as any).on?.("error", () => { _megaStorage = null; });
  }
  return _megaStorage;
};
