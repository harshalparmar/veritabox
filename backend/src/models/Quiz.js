import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  subtopic: {
    type: String,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    default: "Beginner"
  },
  passingPercentage: {
    type: Number,
    default: 60
  },
  timeLimitMinutes: {
    type: Number,
    default: 0 // 0 means no time limit
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  status: {
    type: String,
    enum: ["Draft", "Published", "Archived"],
    default: "Draft"
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question"
  }]
}, { timestamps: true });

export default mongoose.model("Quiz", quizSchema);

