import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET || "testgen_access_secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "testgen_refresh_secret";

export const generateToken = (userId, email) =>
  jwt.sign({ userId, email }, ACCESS_SECRET, { expiresIn: "15m" });

export const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });

export const verifyToken = (token) => jwt.verify(token, ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);
