import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const createAccessToken = (userId: string) =>
  jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "30d" });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as { sub: string };
