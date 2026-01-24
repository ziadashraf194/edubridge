const express = require('express');
const router = express.Router();
const Lesson = require("../models/Lesson");
const Course = require('../models/Course');
const User = require('../models/User');
const jwt = require("jsonwebtoken");
require("dotenv").config();

// دالة للتحقق من الاشتراك
const verifyEnrollment = async (userId, courseId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) return false;
    
    // التحقق إذا كان المستخدم طالباً في الكورس
    const isStudent = course.students.some(student => 
      student.toString() === userId.toString()
    );
    
    // التحقق إذا كان المستخدم معلم الكورس
    const isTeacher = course.teacher.toString() === userId.toString();
    
    return isStudent || isTeacher;
  } catch (error) {
    console.error("Error verifying enrollment:", error);
    return false;
  }
};

// 🔹 الحصول على دروس الكورس مع التحقق من الاشتراك
router.get("/course/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        msg: "يرجى تسجيل الدخول" 
      });
    }

    // فك التشفير
    const decoded = jwt.verify(token, process.env.secretJwt);
    const userId = decoded.id;
    
    // الحصول على الكورس للتحقق
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        msg: "الكورس غير موجود" 
      });
    }

    // التحقق من الاشتراك
    const isEnrolled = await verifyEnrollment(userId, courseId);
    
    // جلب جميع دروس الكورس
    const lessons = await Lesson.find({ 
      $or: [
        { course: courseId },
        { course: { $in: [courseId] } }
      ]
    }).populate("course", "name").sort({ order: 1 });

    // معالجة البيانات بناءً على الاشتراك
    const processedLessons = lessons.map(lesson => {
      const lessonObj = lesson.toObject();
      
      // إذا لم يكن مشتركاً، إخفاء URL للدروس غير المجانية
      if (!isEnrolled && !lessonObj.free) {
        lessonObj.url = "";
        
        // إخفاء URL للدروس الفرعية غير المجانية أيضاً
        if (lessonObj.subLessons && Array.isArray(lessonObj.subLessons)) {
          lessonObj.subLessons = lessonObj.subLessons.map(subLesson => ({
            ...subLesson,
            url: subLesson.free ? subLesson.url : ""
          }));
        }
      }
      
      return lessonObj;
    });

    res.json({
      success: true,
      isEnrolled,
      lessons: processedLessons,
      totalLessons: processedLessons.length,
      courseInfo: {
        _id: course._id,
        name: course.name,
        teacher: course.teacher
      }
    });

  } catch (error) {
    console.error("Error fetching secure lessons:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        msg: "رمز الدخول غير صالح" 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        msg: "انتهت صلاحية الجلسة" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: "حدث خطأ في الخادم" 
    });
  }
});

// 🔹 الحصول على درس معين مع التحقق من الاشتراك
router.get("/:lessonId", async (req, res) => {
  try {
    const { lessonId } = req.params;
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        msg: "يرجى تسجيل الدخول" 
      });
    }

    const decoded = jwt.verify(token, process.env.secretJwt);
    const userId = decoded.id;

    // جلب الدرس
    const lesson = await Lesson.findById(lessonId).populate("course", "name _id");
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        msg: "الدرس غير موجود" 
      });
    }

    // الحصول على courseId من الدرس
    let courseId;
    if (Array.isArray(lesson.course) && lesson.course.length > 0) {
      courseId = lesson.course[0]._id || lesson.course[0];
    } else if (typeof lesson.course === 'object') {
      courseId = lesson.course._id;
    } else {
      courseId = lesson.course;
    }

    // التحقق من الاشتراك
    const isEnrolled = await verifyEnrollment(userId, courseId);
    
    const lessonObj = lesson.toObject();
    
    // إذا لم يكن مشتركاً، إخفاء URL للدروس غير المجانية
    if (!isEnrolled && !lessonObj.free) {
      lessonObj.url = "";
      
      // إخفاء URL للدروس الفرعية غير المجانية أيضاً
      if (lessonObj.subLessons && Array.isArray(lessonObj.subLessons)) {
        lessonObj.subLessons = lessonObj.subLessons.map(subLesson => ({
          ...subLesson,
          url: subLesson.free ? subLesson.url : ""
        }));
      }
    }

    res.json({
      success: true,
      isEnrolled,
      lesson: lessonObj
    });

  } catch (error) {
    console.error("Error fetching secure lesson:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        msg: "رمز الدخول غير صالح" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: "حدث خطأ في الخادم" 
    });
  }
});

router.get("/searchSub/:courseId", async (req, res) => {
    const courseId = req.params.courseId
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.secretJwt);
    const userId = decoded.id;
    course = await Course.findOne({_id:courseId,students:userId})
    if (!course) {
      res.json({subscribed:false})
      return
    } else {
      res.json({subscribed:true})
      return
    }
    
})




module.exports = router;