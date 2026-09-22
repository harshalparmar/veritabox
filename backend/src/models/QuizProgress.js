import mongoose from "mongoose";

const quizProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true
  },
  highestScore: {
    type: Number,
    default: 0
  },
  highestPercentage: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  attemptsCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["Not Started", "In Progress", "Completed"],
    default: "Not Started"
  }
}, { timestamps: true });

quizProgressSchema.index({ user: 1, quiz: 1 }, { unique: true });

export default mongoose.model("QuizProgress", quizProgressSchema);

