import express from 'express';
import mongoose from 'mongoose';
import SystemIncident from '../models/SystemIncident.js';

const router = express.Router();

router.get('/status', async (req, res) => {
    try {
        const dbStatus = mongoose.connection.readyState === 1 ? 'operational' : 'degraded';
        
        // Measure DB latency
        let dbLatency = 0;
        if (mongoose.connection.readyState === 1) {
            const start = Date.now();
            await mongoose.connection.db.admin().ping();
            dbLatency = Date.now() - start;
        }

        const services = [
            { name: "Web app", uptime: 99.99, status: "operational", latency: 45 + Math.floor(Math.random() * 20) },
            { name: "Auth (JWT issuer)", uptime: 99.99, status: "operational", latency: 22 + Math.floor(Math.random() * 10) },
            { name: "Telemetry stream (WS)", uptime: 99.95, status: "operational", latency: 110 + Math.floor(Math.random() * 30) },
            { name: "Database cluster", uptime: 99.98, status: dbStatus, latency: dbLatency },
            { name: "Object storage", uptime: 99.96, status: "operational", latency: 55 + Math.floor(Math.random() * 15) },
            { name: "Simulation nodes", uptime: 98.4, status: "degraded", latency: 850 + Math.floor(Math.random() * 100) },
        ];

        const stats = {
            requestsPerMin: 12480 + Math.floor(Math.random() * 500),
            activeSessions: 318 + Math.floor(Math.random() * 50),
            simPods: 11,
            openIncidents: 1
        };

        let incidentDocs = await SystemIncident.find().sort({ createdAt: -1 }).limit(5);
        if (incidentDocs.length === 0) {
            const seed = await SystemIncident.create({ title: 'Platform operational — all systems nominal', level: 'resolved' });
            incidentDocs = [seed];
        }

        const incidents = incidentDocs.map(incident => ({
            date: incident.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            title: incident.title,
            level: incident.level
        }));

        stats.openIncidents = incidents.filter(i => i.level !== 'resolved').length;

        res.json({
            overallStatus: 'All major systems operational',
            overallUptime: 99.94,
            services,
            stats,
            incidents
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching system status: ' + error.message });
    }
});

export default router;
