const express = require("express");
const router = express.Router();
const ComparisonSelection = require("../models/comparisonSelection");

// Save comparison
router.post("/save", async (req, res) => {
    try {
        const saved = await ComparisonSelection.create(req.body);
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: "Error saving comparison selection" });
    }
});

// Get all saved comparisons
router.get("/all", async (req, res) => {
    try {
        const selections = await ComparisonSelection.find().sort({ createdAt: -1 });
        res.json(selections);
    } catch (err) {
        res.status(500).json({ error: "Error loading comparison selections" });
    }
});

// Update comparison
router.put("/update/:id", async (req, res) => {
    try {
        const updated = await ComparisonSelection.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
        );

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Error updating comparison selection" });
    }
});

// Delete comparison
router.delete("/delete/:id", async (req, res) => {
    try {
        await ComparisonSelection.findByIdAndDelete(req.params.id);
        res.json({ message: "Comparison selection deleted" });
    } catch (err) {
        res.status(500).json({ error: "Error deleting comparison selection" });
    }
});

module.exports = router;