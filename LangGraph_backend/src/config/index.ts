import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  mongoUri: process.env.MONGO_URI!,
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret",
};