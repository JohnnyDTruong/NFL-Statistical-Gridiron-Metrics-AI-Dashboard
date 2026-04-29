const mongoose = require("mongoose");

const trendSelectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    startSeason: String,
    endSeason: String,
    team: String,
    position: String,
    player: String

}, { timestamps: true });

module.exports = mongoose.model("TrendSelection", trendSelectionSchema);