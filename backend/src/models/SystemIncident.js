import mongoose from 'mongoose';

const systemIncidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  level: { type: String, enum: ['investigating', 'monitoring', 'resolved'], default: 'resolved' },
  service: { type: String, default: 'Platform' }
}, { timestamps: true });

export default mongoose.model('SystemIncident', systemIncidentSchema);
