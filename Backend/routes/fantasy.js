const express = require("express");
const router = express.Router();
const FantasyTeam = require("../models/team");

// Save a new team
router.post("/save", async (req, res) => {
try {
    const team = new FantasyTeam(req.body);
    const saved = await team.save();
    res.json(saved);
} catch (err) {
    res.status(400).json({ error: err.message });
}
});

// Get all teams
router.get("/all", async (req, res) => {
try {
    const teams = await FantasyTeam.find().sort({ createdAt: -1 });
    res.json(teams);
} catch (err) {
    res.status(400).json({ error: err.message });
}
});

// Delete team
router.delete("/delete/:id", async (req, res) => {

try {

    await FantasyTeam.findByIdAndDelete(req.params.id);

    res.json({ success: true });

} catch (err) {

    res.status(400).json({ error: err.message });

}

});

// Update team
router.put("/update/:id", async (req, res) => {

try {

    const updated = await FantasyTeam.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
    );

    res.json(updated);

} catch (err) {

    res.status(400).json({ error: err.message });

}

});

module.exports = router;