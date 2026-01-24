const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require("cookie-parser");
dotenv.config();

const AuthRouter = require('./server/routers/auth');
const CourseRouter = require('./server/routers/course');
const LessonRouter = require('./server/routers/lesson');
const SubscriptionRouter = require('./server/routers/subscription');
const CouponRouter = require("./server/routers/Coupon")
const secureLessonsRouter = require('./server/routers/secureLessons');
const QuizRouter = require("./server/routers/quiz.js");
const ResultRouter = require("./server/routers/result.js");

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('Failed to connect to MongoDB:', error);
});


app.use(cors({
  origin: "http://localhost:3000", 
  credentials: true,
}));
app.use('/secure/lesson', secureLessonsRouter);
app.use(express.json());
app.use(cookieParser());
app.use("/courses_image", express.static("courses_image"));
app.use("/auth",AuthRouter);
app.use("/course",CourseRouter);
app.use("/lesson",LessonRouter);
app.use("/subscription",SubscriptionRouter);
app.use("/coupon",CouponRouter);
app.use('/secure/lesson', secureLessonsRouter);
app.use("/quiz",QuizRouter);
app.use("/result",ResultRouter);





app.listen(5001, () => {
    console.log('Server is running on port 5001');
});
