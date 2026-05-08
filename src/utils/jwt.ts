import jwt from "jsonwebtoken";

const getSecret = (): string => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined");
  return process.env.JWT_SECRET;
};

export const signToken = (id: string): string =>
  jwt.sign({ id }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  } as jwt.SignOptions);

export const verifyToken = (token: string): jwt.JwtPayload =>
  jwt.verify(token, getSecret()) as jwt.JwtPayload;
