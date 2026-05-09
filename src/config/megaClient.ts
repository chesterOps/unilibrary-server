import { Storage } from "megajs";

// Lazy-initialized: only connects to MEGA when an upload is first requested,
// not at server boot. Prevents MEGA auth delays from blocking login/register.
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
