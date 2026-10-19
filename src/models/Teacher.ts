import { model, Schema } from 'mongoose';

const teacherSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  specialization: { type: String, required: true, trim: true },
  experience: { type: Number, required: true, min: 0 }
}, { timestamps: true });

export default model('Teacher', teacherSchema);
