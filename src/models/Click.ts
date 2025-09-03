import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link',
    required: [true, 'Link ID is required'],
  },
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: [true, 'Domain ID is required'],
  },
  targetUrl: {
    type: String,
    required: [true, 'Target URL is required'],
  },
  ip: {
    type: String,
    required: [true, 'IP address is required'],
  },
  userAgent: {
    type: String,
    required: [true, 'User Agent is required'],
  },
  referer: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Per il futuro sistema anti-bot
  isSuspicious: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes per performance
clickSchema.index({ linkId: 1, timestamp: -1 });
clickSchema.index({ domainId: 1, timestamp: -1 });
clickSchema.index({ ip: 1, timestamp: -1 });
clickSchema.index({ timestamp: -1 });

export default mongoose.models.Click || mongoose.model('Click', clickSchema);
