const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
    hostname: { type: String, required: true, unique: true },
    ip: { type: String },  // Add IP field
    cpu: Number,
    ram: Number,
    status: { type: String, enum: ['online', 'degraded', 'down'], default: 'online' },
    lastSeen: { type: Date, default: Date.now },
    lastMetrics: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Server', serverSchema);