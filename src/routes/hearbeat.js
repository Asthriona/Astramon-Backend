const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const Incident = require('../models/Incident');

// Client sends metrics
router.post('/heartbeat', async (req, res) => {
    const { hostname, ip, cpu, ram, timestamp } = req.body;
    
    try {
        const server = await Server.findOneAndUpdate(
            { hostname },
            {
                hostname,
                ip,
                cpu,
                ram,
                lastMetrics: new Date(timestamp * 1000),
            },
            { upsert: true, new: true }
        );
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all servers
router.get('/servers', async (req, res) => {
    try {
        const servers = await Server.find({}).sort({ hostname: 1 });
        res.json(servers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get active incidents
router.get('/incidents/active', async (req, res) => {
    try {
        const incidents = await Incident.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get incident history
router.get('/incidents/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const incidents = await Incident.find({})
            .sort({ createdAt: -1 })
            .limit(limit);
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get incidents for specific server
router.get('/incidents/:hostname', async (req, res) => {
    try {
        const incidents = await Incident.find({ hostname: req.params.hostname })
            .sort({ createdAt: -1 });
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;