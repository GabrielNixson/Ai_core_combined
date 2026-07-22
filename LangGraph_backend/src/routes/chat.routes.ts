import { Router } from "express";
import { createChat, getUserChats } from "../controllers/chat.controller";

const router = Router();

router.post("/", createChat);
router.get("/user/:userId", getUserChats);

export default router;
