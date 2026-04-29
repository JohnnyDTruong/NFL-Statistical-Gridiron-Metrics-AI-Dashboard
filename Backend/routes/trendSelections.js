const express = require("express");
const router = express.Router();
const TrendSelection = require("../models/trendSelection");

// Save trend selection
router.post("/save", async (req, res) => {
    try {
        const saved = await TrendSelection.create(req.body);
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: "Error saving trend selection" });
    }
});

// Get all saved trend selections
router.get("/all", async (req, res) => {
    try {
        const selections = await TrendSelection.find().sort({ createdAt: -1 });
        res.json(selections);
    } catch (err) {
        res.status(500).json({ error: "Error loading trend selections" });
    }
});

// Update trend selection
router.put("/update/:id", async (req, res) => {
    try {
        const updated = await TrendSelection.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
        );

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Error updating trend selection" });
    }
});

// Delete trend selection
router.delete("/delete/:id", async (req, res) => {
    try {
        await TrendSelection.findByIdAndDelete(req.params.id);
        res.json({ message: "Trend selection deleted" });
    } catch (err) {
        res.status(500).json({ error: "Error deleting trend selection" });
    }
});

module.exports = router;