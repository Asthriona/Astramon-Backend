const ping = require('ping');
const Server = require('../models/Server');
const Incident = require('../models/Incident');

class HealthCheckService {
    constructor() {
        this.checkInterval = 60000; // 1 minute
        this.metricsTimeout = 120000; // 2 minutes
    }

    async checkServer(server) {
        const now = new Date();
        const timeSinceMetrics = now - server.lastMetrics;
        
        // Try to ping the server
        const pingResult = await ping.promise.probe(server.hostname, {
            timeout: 5,
            extra: ['-c', '1']
        });

        let newStatus = 'online';
        
        if (!pingResult.alive) {
            // Server doesn't respond to ping at all
            newStatus = 'down';
        } else if (timeSinceMetrics > this.metricsTimeout) {
            // Ping works but no metrics received (services down)
            newStatus = 'degraded';
        }

        // Check if status changed
        if (newStatus !== server.status) {
            await this.handleStatusChange(server, newStatus);
        }

        // Update server status
        server.status = newStatus;
        
        // If degraded or down, clear metrics
        if (newStatus !== 'online') {
            server.cpu = null;
            server.ram = null;
        }
        
        server.lastSeen = now;
        await server.save();

        return { hostname: server.hostname, status: newStatus, alive: pingResult.alive };
    }

    async handleStatusChange(server, newStatus) {
        const oldStatus = server.status;

        if (oldStatus === 'online' && (newStatus === 'degraded' || newStatus === 'down')) {
            // Create new incident
            await Incident.create({
                hostname: server.hostname,
                status: newStatus,
                isActive: true
            });
            console.log(`🚨 NEW INCIDENT: ${server.hostname} is now ${newStatus}`);
        } 
        else if ((oldStatus === 'degraded' || oldStatus === 'down') && newStatus === 'online') {
            // Resolve active incident
            await Incident.updateMany(
                { hostname: server.hostname, isActive: true },
                { isActive: false, resolvedAt: new Date() }
            );
            console.log(`✅ RESOLVED: ${server.hostname} is back online`);
        }
        else if (oldStatus === 'degraded' && newStatus === 'down') {
            // Update existing incident to worse status
            await Incident.updateOne(
                { hostname: server.hostname, isActive: true },
                { status: 'down' }
            );
            console.log(`⚠️ ESCALATED: ${server.hostname} degraded → down`);
        }
        else if (oldStatus === 'down' && newStatus === 'degraded') {
            // Update existing incident to better status (but still problematic)
            await Incident.updateOne(
                { hostname: server.hostname, isActive: true },
                { status: 'degraded' }
            );
            console.log(`📈 IMPROVING: ${server.hostname} down → degraded`);
        }
    }

    async checkAllServers() {
        try {
            const servers = await Server.find({});
            console.log(`[${new Date().toISOString()}] Checking ${servers.length} servers...`);
            
            const results = await Promise.all(
                servers.map(server => this.checkServer(server))
            );

            const summary = results.reduce((acc, r) => {
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            }, {});

            console.log(`Status: Online=${summary.online || 0}, Degraded=${summary.degraded || 0}, Down=${summary.down || 0}`);
        } catch (error) {
            console.error('Health check error:', error);
        }
    }

    start() {
        console.log('🏥 Health check service started');
        // Run immediately
        this.checkAllServers();
        
        // Then run every minute
        this.interval = setInterval(() => {
            this.checkAllServers();
        }, this.checkInterval);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            console.log('Health check service stopped');
        }
    }
}

module.exports = new HealthCheckService();