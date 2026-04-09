const mongoose = require("mongoose");
const teamSchema = new mongoose.Schema({

name: {
    type: String,
    required: true
},

qb: String,
rb: [String],
wr: [String],
te: String,
fantasyPoints: Number,
prediction: Number

}, { timestamps: true });

module.exports = mongoose.model("FantasyTeam", teamSchema);