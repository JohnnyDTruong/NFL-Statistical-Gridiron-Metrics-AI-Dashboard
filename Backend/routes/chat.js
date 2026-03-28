// routes/chat.js
const express = require("express");
const router = express.Router();
const Chat = require("../models/chat");

// GET all chats (optional filter by player)
router.get("/", async (req, res) => {
  try {
    const player = req.query.player;
    const filter = player ? { player } : {};
    const chats = await Chat.find(filter).sort({ createdAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chats." });
  }
});

// POST a new chat
router.post("/", async (req, res) => {
  try {
    const { player, message, response } = req.body;
    if (!player || !message || !response) {
      return res.status(400).json({ error: "Player, message, and response are required." });
    }

    const newChat = new Chat({ player, message, response });
    await newChat.save();
    res.status(201).json(newChat);
  } catch (err) {
    res.status(500).json({ error: "Failed to save chat." });
  }
});

// DELETE a chat by ID (optional)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Chat.findByIdAndDelete(id);
    res.json({ message: "Chat deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete chat." });
  }
});

module.exports = router;
