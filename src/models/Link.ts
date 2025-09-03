import mongoose from 'mongoose';

const targetUrlSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'Target URL is required'],
    trim: true,
  },
  weight: {
    type: Number,
    default: 1,
    min: [0, 'Weight cannot be negative'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const linkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  domainId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: [true, 'Domain ID is required'],
  },
  shortPath: {
    type: String,
    required: [true, 'Short path is required'],
    trim: true,
    lowercase: true,
  },
  targetUrls: {
    type: [targetUrlSchema],
    required: [true, 'At least one target URL is required'],
    validate: {
      validator: function(targetUrls: unknown[]) {
        return targetUrls && targetUrls.length > 0;
      },
      message: 'At least one target URL is required',
    },
  },
  totalClicks: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
linkSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Compound index for unique short paths per domain
linkSchema.index({ domainId: 1, shortPath: 1 }, { unique: true });
linkSchema.index({ userId: 1 });

export default mongoose.models.Link || mongoose.model('Link', linkSchema);
