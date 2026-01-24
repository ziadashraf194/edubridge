const express = require('express');
const User = require("../models/User")
const Course = require("../models/Course");
const Result = require("../models/Result");
const Counter = require("../models/Counter")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
require("dotenv").config();
const path = require("path");
const { decode } = require('querystring');

router = express.Router()

router.post("/register", async (req, res) => {
      try {
    const { name, email, password, phone , fatherPhone} = req.body;

   
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
      return res.status(400).json({ error: "البريد الاكتروني غير صحيح" });
    }

    
    if (await User.findOne({email:email})) {
   res.status(400).json({ error: "البريد الاكتروني مستخدم من قبل" });
       return
    }

    // تحقق من قوة كلمة المرور
    if (
      !password ||
      !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 0,
        minUppercase: 0,
        minNumbers: 0,
        minSymbols: 0,
      })
    ) {
      return res.status(400).json({ error: "كلمة المرور ضعيفة جدا" });
    }

    if (await User.findOne({phone:phone})) {
      return res.status(400).json({ error: " رقم الهاتف موجود بالفعل" });
    }



    const hashedPassword = await bcrypt.hash(password, 10);
       async function getNextSequence(name) {
    const counter = await Counter.findOneAndUpdate(
      { name },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    return counter.value;
  }
  
  const id = await getNextSequence('user');
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      fatherPhone,
      id,
    });
    await newUser.save();

 
    const token = jwt.sign({ id: newUser._id , name:newUser.name , phone:newUser.phone }, process.env.secretJwt, { expiresIn: "365d" });

    res.cookie("token", token, {
  httpOnly: false, 
  secure: process.env.NODE_ENV === "production", 
  sameSite: "strict",
  maxAge: 1000 * 60 * 60 * 24 * 365, 
});


    
    return res.status(201).json({ message: "تم التسجيل بنجاح", user: { id: newUser._id, name, email } });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: " حدث خطا تواصل مع الدعم " });
  }

});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;


    if (!email || !password) {
      return res.status(400).json({ error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" });
    }


    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "المستخدم غير موجود" });
    }

 
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "كلمة المرور غير صحيحة" });
    }

    
      const token = jwt.sign({
         id: user._id ,
          name:user.name ,
           phone:user.phone 
          }, process.env.secretJwt, { expiresIn: "365d" });


    res.cookie("token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 365, 
    });

    return res.status(200).json({
      message: "تم تسجيل الدخول بنجاح",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ msg: "No token found" });
    }


   let decode = jwt.verify(token, process.env.secretJwt)
    user = await User.findById(decode.id).select("name role phone image")

    res.json({ msg: " success ", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error " });
  }
});


const verifyUser = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.secretJwt);
    const user = await User.findById(decoded.id || decoded._id);
    return user;
  } catch (err) {
    console.error("Token verification error:", err);
    return null;
  }
};

// ⭐ إندبوينت تجميع البيانات
router.get("/profile", async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        msg: "يجب تسجيل الدخول أولاً" 
      });
    }

    const user = await verifyUser(token);
    
    if (!user) {
      return res.status(403).json({ 
        success: false,
        msg: "مستخدم غير موجود أو غير مصرح" 
      });
    }

    // ⭐ 1. بيانات المستخدم الأساسية
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      fatherPhone: user.fatherPhone,
      role: user.role,
      id: user.id,
      image: user.image || null,
      createdAt: user.createdAt,
      roleText: user.role === 'student' ? 'طالب' : 
                user.role === 'teacher' ? 'معلم' : 'مدير'
    };

    // ⭐ 2. الكورسات المنتشرة (لجميع المستخدمين)
    const popularCourses = await Course.find({ active: true })
      .populate("teacher", "name image")
      .sort({ students: -1, createdAt: -1 })
      .limit(6)
      .select("name image description price students teacher")
      .lean();

    const formattedPopularCourses = popularCourses.map(course => ({
      _id: course._id,
      name: course.name,
      image: course.image || '/default-course.jpg',
      description: course.description || 'لا يوجد وصف',
      price: course.price || 0,
      studentsCount: course.students?.length || 0,
      teacherName: course.teacher?.name || 'غير معروف',
      teacherImage: course.teacher?.image || null
    }));

    // ⭐ 3. إذا كان المستخدم طالباً: جلب بيانات إضافية
    let studentData = {};
    
    if (user.role === 'student') {
      // أ) الكورسات المسجل فيها
      const myCourses = await Course.find({ 
        students: user._id,
        active: true 
      })
      .populate("teacher", "name")
      .select("name image description price teacher createdAt")
      .lean();

      const formattedMyCourses = myCourses.map(course => ({
        _id: course._id,
        name: course.name,
        image: course.image || '/default-course.jpg',
        description: course.description || 'لا يوجد وصف',
        price: course.price || 0,
        teacherName: course.teacher?.name || 'غير معروف',
        enrollmentDate: course.createdAt,
        progress: 0 // يمكن حساب التقدم من بيانات أخرى
      }));

      // ب) نتائج الاختبارات
      const myResults = await Result.find({ student: user._id })
        .populate({
          path: 'lesson',
          select: 'name type course',
          populate: {
            path: 'course',
            select: 'name'
          }
        })
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean();

      const formattedResults = myResults.map(result => {
        const isPassed = result.passed;
        const percentage = ((result.score / result.totalMarks) * 100).toFixed(1);
        
        return {
          _id: result._id,
          lessonName: result.lesson?.name || 'اختبار غير معروف',
          courseName: result.lesson?.course?.name || 'دورة غير معروفة',
          score: result.score,
          totalMarks: result.totalMarks,
          percentage: percentage,
          passed: isPassed,
          status: result.status || 'graded',
          attemptNumber: result.attemptNumber || 1,
          timeSpent: result.timeSpent || 0,
          submittedAt: result.submittedAt,
          isSubLesson: result.isSubLesson || false,
          quizType: result.lesson?.type === 'quiz' ? 'اختبار ' : 'اختبار '
        };
      });

      const totalQuizzes = myResults.length;
      const passedQuizzes = myResults.filter(r => r.passed).length;
      const averageScore = myResults.length > 0 
        ? (myResults.reduce((sum, r) => sum + r.score, 0) / myResults.length).toFixed(1)
        : 0;
      const totalCourses = myCourses.length;

      studentData = {
        myCourses: formattedMyCourses,
        quizResults: formattedResults,
        statistics: {
          totalCourses,
          totalQuizzes,
          passedQuizzes,
          failedQuizzes: totalQuizzes - passedQuizzes,
          averageScore,
          successRate: totalQuizzes > 0 ? ((passedQuizzes / totalQuizzes) * 100).toFixed(1) : 0,
          learningHours: 0, // يمكن حسابها من بيانات أخرى
          achievements: 0
        }
      };
    } 
    // ⭐ 4. إذا كان المستخدم معلماً: جلب بيانات إضافية
    else if (user.role === 'teacher') {
      const myCourses = await Course.find({ teacher: user._id })
        .select("name image description price students active createdAt")
        .lean();

      const formattedMyCourses = myCourses.map(course => ({
        _id: course._id,
        name: course.name,
        image: course.image || '/default-course.jpg',
        description: course.description || 'لا يوجد وصف',
        price: course.price || 0,
        studentsCount: course.students?.length || 0,
        active: course.active,
        createdAt: course.createdAt
      }));

      const totalStudents = myCourses.reduce((sum, course) => sum + (course.students?.length || 0), 0);
      const totalRevenue = myCourses.reduce((sum, course) => sum + (course.sale || 0), 0);

      studentData = {
        myCourses: formattedMyCourses,
        statistics: {
          totalCourses: myCourses.length,
          totalStudents,
          totalRevenue,
          activeCourses: myCourses.filter(c => c.active).length,
          inactiveCourses: myCourses.filter(c => !c.active).length
        }
      };
    }

    // ⭐ 5. تجهيز الرد النهائي
    const response = {
      success: true,
      message: "تم جلب البيانات بنجاح",
      data: {
        user: userData,
        popularCourses: formattedPopularCourses,
        ...studentData,
        timestamp: new Date(),
      }
    };

    res.json(response);

  } catch (err) {
    console.error("Error in dashboard endpoint:", err);
    res.status(500).json({ 
      success: false,
      msg: "حدث خطأ في الخادم",
      error: err.message 
    });
  }
});

module.exports = router