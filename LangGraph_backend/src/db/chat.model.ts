import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  responseTime: { type: Number },
});

const chatSchema = new mongoose.Schema({
  chatId: String,
  userId: { type: String, required: true }, // Linked to User
  title: { type: String, default: "New Chat" },
  messages: [messageSchema],
}, { timestamps: true });

export const Chat = mongoose.model("Chat", chatSchema);