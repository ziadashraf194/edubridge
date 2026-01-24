const mongoose = require('mongoose');

const subscriptionReqSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  msg:String,
});

const subscriptionReq = mongoose.model('subscriptionReq', subscriptionReqSchema);
module.exports = subscriptionReq
