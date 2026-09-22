import Hackathon from '../models/Hackathon.js';
import HackathonTeam from '../models/HackathonTeam.js';

const GRACE_PERIOD_MS = 2000;

/**
 * Round Guard Middleware
 * Protects the mission-critical window of answer submission.
 * Enforces that the current round is Live, within its time window,
 * with a 2-second grace period past endTime.
 */
export const roundGuard = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const { resolveHackathonId } = await import('../utils/hackathonUtils.js');
        const hId = await resolveHackathonId(id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const hackathon = await Hackathon.findById(hId);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon mission not found.' });

        const team = await HackathonTeam.findOne({ 
            hackathonId: hId, 
            $or: [
                { members: userId },
                { leader: userId }
            ]
        });
        if (!team) return res.status(403).json({ message: 'Unauthorized: No squadron affiliation detected.' });

        const activeRound = hackathon.rounds.find(r => r.roundNumber === team.currentRound);
        if (!activeRound) return res.status(400).json({ message: 'Active round parameters undefined.' });

        const now = new Date();
        const startTime = new Date(activeRound.startTime);
        const endTime = new Date(activeRound.endTime);

        if (now < startTime) {
            return res.status(403).json({
                message: 'PREMATURE: Round has not started yet.',
                reason: `Round starts at ${startTime.toISOString()}`
            });
        }

        if (activeRound.status !== 'Live') {
            return res.status(403).json({
                message: 'INACTIVE: Round is not currently live.',
                reason: `Round status is "${activeRound.status}"`
            });
        }

        if (now > endTime.getTime() + GRACE_PERIOD_MS) {
            return res.status(403).json({
                message: 'TERMINATION REACHED: Submission rejected by Protocol RoundGuard.',
                reason: 'Time delta exceeded grace threshold.'
            });
        }

        req.activeRound = activeRound;
        next();
    } catch (err) {
        res.status(500).json({ message: 'Internal Server Error: RoundGuard malfunction.' });
    }
};
