const mongoose = require("mongoose");

const comparisonSelectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    season: String,
    position: String,
    player1: String,
    player2: String

}, { timestamps: true });

module.exports = mongoose.model("ComparisonSelection", comparisonSelectionSchema);