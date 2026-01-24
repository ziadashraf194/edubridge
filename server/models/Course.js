const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  image:{
    type:String
  },
  description: {
    type: String,
    required: true,
  },
  teacher: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  students: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }
  ],
  price: {
    type: Number,
    required: true,
  },
  lessons: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Lesson", 
    }],
  active:{
    type:Boolean,
    default: true,
  },
  sale:{
    type: Number,
    default:0,
  }
}, { timestamps: true })


module.exports = mongoose.model("Course", courseSchema);
