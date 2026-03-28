// models/chat.js
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  player: { type: String, required: true },       // Player name
  message: { type: String, required: true },      // Chat message content
  response: { type: String, required: true },     // AI response
  createdAt: { type: Date, default: Date.now }    // Timestamp
});

module.exports = mongoose.model("Chat", chatSchema);
