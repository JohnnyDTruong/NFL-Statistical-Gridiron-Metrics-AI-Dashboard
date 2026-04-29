const express = require("express");
const router = express.Router();
const PlayerSelection = require("../models/playerSelection");

// Save selection
router.post("/save", async (req, res) => {
    try {
        const saved = await PlayerSelection.create(req.body);
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: "Error saving player selection" });
    }
});

// Get all saved selections
router.get("/all", async (req, res) => {
    try {
        const selections = await PlayerSelection.find().sort({ createdAt: -1 });
        res.json(selections);
    } catch (err) {
        res.status(500).json({ error: "Error loading saved selections" });
    }
});

// Update saved selection
router.put("/update/:id", async (req, res) => {
    try {
        const updated = await PlayerSelection.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
        );

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Error updating player selection" });
    }
});

// Delete saved selection
router.delete("/delete/:id", async (req, res) => {
    try {
        await PlayerSelection.findByIdAndDelete(req.params.id);
        res.json({ message: "Selection deleted" });
    } catch (err) {
        res.status(500).json({ error: "Error deleting player selection" });
    }
});

module.exports = router;