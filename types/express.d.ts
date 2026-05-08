import { IUser } from "../src/models/user.model";

declare global {
  namespace Express {
    export interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
      user?: IUser;
    }
  }
}
