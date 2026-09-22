import HackathonTeam from '../models/HackathonTeam.js';

const ENTROPY_THRESHOLD_MS = parseInt(process.env.ANTICHEAT_THRESHOLD_MS || '800', 10);

/**
 * Entropy-Based Anti-Cheat Middleware
 * Analyzes the time delta between submissions to detect inhumanly fast solve rates.
 * Configurable via ANTICHEAT_THRESHOLD_MS env var (default 800ms).
 */
export const entropyAudit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const { resolveHackathonId } = await import('../utils/hackathonUtils.js');
        const hId = await resolveHackathonId(id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const team = await HackathonTeam.findOne({
            hackathonId: hId,
            $or: [
                { members: userId },
                { leader: userId }
            ]
        });

        if (!team) return res.status(404).json({ message: 'Squad not found.' });

        const now = new Date();
        const lastSubmission = team.lastSubmissionTimestamp;

        if (lastSubmission) {
            const delta = now - new Date(lastSubmission);

            if (delta > 0 && delta < ENTROPY_THRESHOLD_MS) {
                team.isFlagged = true;
                team.warnings = (team.warnings || 0) + 1;

                // Broadcast flag to admin proctor room via socket
                const io = req.app.get('io');
                if (io) {
                    io.to(`admin_proctor_${id}`).emit('team_flagged', {
                        teamId: team._id,
                        teamName: team.teamName,
                        delta,
                        reason: `Inhuman solving speed (${delta}ms < ${ENTROPY_THRESHOLD_MS}ms threshold)`
                    });
                }
            }
        }

        team.lastSubmissionTimestamp = now;

        // 3B — Block submission at 6+ warnings (disqualify threshold)
        if (team.warnings >= 6) {
            team.isDisqualified = true;
            team.disqualificationReason = 'Security strikes exceeded threshold — automated disqualification.';
            await team.save();

            // Notify all participants
            const io = req.app.get('io');
            if (io) {
                io.to(`hackathon_${id}`).emit('team_eliminated', team._id);
                io.to(`admin_proctor_${id}`).emit('team_flagged', {
                    teamId: team._id,
                    teamName: team.teamName,
                    reason: 'DISQUALIFIED: 3 entropy violations exceeded threshold.'
                });
            }

            return res.status(403).json({ message: 'DISQUALIFIED: Entropy violations exceeded the allowed threshold. Mission access revoked.' });
        }

        await team.save();
        next();
    } catch (err) {
        next();
    }
};
