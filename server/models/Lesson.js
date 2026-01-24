const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["multiple-choice", "true-false", "essay", "short-answer"],
    required: true
  },
  question: {
    type: String,
    required: true
  },
  marks: {
    type: Number,
    default: 1
  },
  options: [String],
  correctAnswer: String,
  explanation: String,
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const quizSchema = new mongoose.Schema({
  title: String,
  description: String,
  duration: {
    type: Number,
    default: 30
  },
  totalMarks: {
    type: Number,
    default: 100
  },
  passingMarks: {
    type: Number,
    default: 50
  },
  questions: [questionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  attemptsAllowed: {
    type: Number,
    default: 1
  },
  showAnswersAfter: {
    type: String,
    enum: ["never", "immediately", "after-submission", "after-deadline"],
    default: "after-submission"
  },
  deadline: Date
}, { _id: false });

const subLessonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["video", "pdf", "image", "quiz"],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  time: {
    type: Number,
    default: 0
  },
  free: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  quiz: quizSchema
}, { _id: true });

const lessonSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["video", "pdf", "image", "section", "quiz"],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  url: String,
  time: Number,
  free: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  },
  course: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course"
    }
  ],
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  quiz: quizSchema,
  subLessons: [subLessonSchema]
}, { timestamps: true });

// ✨ Pre-save middleware لإزالة quiz إذا النوع ليس quiz
lessonSchema.pre("save", function(next) {
  if (this.type !== "quiz") {
    this.quiz = undefined;
  }

  this.subLessons.forEach(sub => {
    if (sub.type !== "quiz") {
      sub.quiz = undefined;
    }
  });

  next();
});

module.exports = mongoose.model("Lesson", lessonSchema);
