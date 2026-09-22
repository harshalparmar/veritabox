import mongoose from 'mongoose';

const channelReadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  lastReadAt: { type: Date, default: () => new Date(0) }
}, { timestamps: true });

channelReadSchema.index({ userId: 1, channelId: 1 }, { unique: true });

const ChannelRead = mongoose.model('ChannelRead', channelReadSchema);
export default ChannelRead;
