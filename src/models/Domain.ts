import mongoose from 'mongoose';

const domainSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  verificationToken: {
    type: String,
    required: [true, 'Verification token is required'],
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  // Vercel integration fields
  vercelDomainId: {
    type: String,
    default: null,
  },
  vercelStatus: {
    type: String,
    enum: ['pending', 'verified', 'error', 'removed'],
    default: 'pending',
  },
  vercelError: {
    type: String,
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
domainSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster lookups
domainSchema.index({ userId: 1 });

export default mongoose.models.Domain || mongoose.model('Domain', domainSchema);
