const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  Main: String,
  Discuss: String,
  clicks: { type: Number, default: 0 }
});

module.exports = mongoose.model('Click', clickSchema);