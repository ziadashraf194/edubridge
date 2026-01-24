const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
   role: {
    type: String,
    enum: ["student", "teacher", "admin"],
    default: "student", 
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
    phone: {
    type: String,
    required: true,
  },
      fatherPhone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true
  },
  id:{
    type:Number,
    required:true,
  }
});

module.exports = mongoose.model("User", userSchema);
