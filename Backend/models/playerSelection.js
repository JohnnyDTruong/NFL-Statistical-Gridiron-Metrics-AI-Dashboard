const mongoose = require("mongoose");

const playerSelectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    team: String,
    position: String,
    season: String,
    player: String

}, { timestamps: true });

module.exports = mongoose.model("PlayerSelection", playerSelectionSchema);