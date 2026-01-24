const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // بدلاً من الـ Quiz المنفصل، نربط بالـ Lesson
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },

    // لتحديد إذا كان Quiz رئيسي أو فرعي
    isSubLesson: {
      type: Boolean,
      default: false
    },

    // معرف الـ subLesson إذا كان فرعي
    subLessonId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    answers: [
      {
        questionIndex: {
          type: Number,
          required: true,
        },
        selectedAnswer: {
          type: String,
          default: null
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
        marks: {
          type: Number,
          default: 0,
        },
        feedback: {
          type: String,
          default: ""
        }
      },
    ],

    score: {
      type: Number,
      required: true,
    },

    totalMarks: {
      type: Number,
      required: true,
    },

    passed: {
      type: Boolean,
      required: true,
    },

    attemptNumber: {
      type: Number,
      default: 1
    },

    timeSpent: {
      type: Number, // بالثواني
      default: 0
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["in-progress", "submitted", "graded", "reviewed"],
      default: "submitted"
    }
  },
  { timestamps: true }
);

// يمكننا جعل الطالب يحاول نفس الكويز أكثر من مرة إذا سمح
ResultSchema.index({ student: 1, lesson: 1, attemptNumber: 1 }, { unique: true });

module.exports = mongoose.model("Result", ResultSchema);