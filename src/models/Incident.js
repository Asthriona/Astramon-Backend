const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    hostname: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['degraded', 'down'], required: true },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date }
});

module.exports = mongoose.model('Incident', incidentSchema);