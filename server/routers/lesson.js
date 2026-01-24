const express = require('express');
const router = express.Router();
const Lesson = require("../models/Lesson");
const Course = require('../models/Course');
const User = require('../models/User');
require("dotenv").config();
const jwt = require("jsonwebtoken");

// Middleware للتحقق من الـ JWT
const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    req.user = jwt.verify(token, process.env.secretJwt);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// إضافة درس جديد (رئيسي أو مع دروس فرعية)
router.post("/:courseId", authMiddleware, async (req, res) => {
  try {
    const lessonData = req.body;
    const teacherId = req.user.id;

    const lesson = new Lesson({
      name: lessonData.name,
      type: lessonData.type || "section",
      url: lessonData.url,
      time: lessonData.time,
      course: req.params.courseId,
      teacher: teacherId,
      free: lessonData.free || false,
      active: lessonData.active !== undefined ? lessonData.active : true,
      subLessons: lessonData.subLessons || []
    });

    await lesson.save();

    const course = await Course.findById(req.params.courseId);
    course.lessons.push(lesson._id);
    await course.save();

    res.json({ msg: "تم حفظ الدرس بنجاح", lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ في الخادم", error });
  }
});

// إضافة درس فرعي لدرس موجود
router.post("/:lessonId/subLesson", authMiddleware, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const subLessonData = req.body;
    const teacherId = req.user.id;

    const lesson = await Lesson.findOne({ _id: lessonId, teacher: teacherId });
    if (!lesson) return res.status(404).json({ msg: "الدرس غير موجود أو ليس لديك صلاحية" });

    lesson.subLessons.push({
      name: subLessonData.name,
      type: subLessonData.type,
      url: subLessonData.url,
      time: subLessonData.time || 0,
      free: subLessonData.free || false,
      active: subLessonData.active !== undefined ? subLessonData.active : true,
      order: subLessonData.order || lesson.subLessons.length
    });

    await lesson.save();
    res.json({ msg: "تم إضافة الدرس الفرعي بنجاح", lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ في الخادم", error });
  }
});

// تعديل درس فرعي
router.put("/:lessonId/subLesson/:subLessonId", authMiddleware, async (req, res) => {
  try {
    const { lessonId, subLessonId } = req.params;
    const subLessonData = req.body;
    const teacherId = req.user.id;

    const lesson = await Lesson.findOne({ _id: lessonId, teacher: teacherId });
    if (!lesson) return res.status(404).json({ msg: "الدرس غير موجود أو ليس لديك صلاحية" });

    const subLesson = lesson.subLessons.id(subLessonId);
    if (!subLesson) return res.status(404).json({ msg: "الدرس الفرعي غير موجود" });

    Object.keys(subLessonData).forEach(key => {
      subLesson[key] = subLessonData[key];
    });

    await lesson.save();
    res.json({ msg: "تم تعديل الدرس الفرعي بنجاح", lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ في الخادم", error });
  }
});

// حذف درس فرعي
router.delete("/:lessonId/subLesson/:subLessonId", authMiddleware, async (req, res) => {
  try {
    const { lessonId, subLessonId } = req.params;
    const teacherId = req.user.id;

    const lesson = await Lesson.findOne({ _id: lessonId, teacher: teacherId });
    if (!lesson) return res.status(404).json({ msg: "الدرس غير موجود أو ليس لديك صلاحية" });

    lesson.subLessons.pull(subLessonId);
    await lesson.save();

    res.json({ msg: "تم حذف الدرس الفرعي بنجاح", lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ في الخادم", error });
  }
});

// جلب جميع الدروس للمعلم
router.get("/dashbord", authMiddleware, async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") return res.status(403).json({ msg: "حدث خطأ" });

    const lessons = await Lesson.find({ teacher: teacherId }).populate("course", "name");
    res.json(lessons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ في الخادم", error });
  }
});

// جلب درس محدد مع حذف quiz لو النوع مش quiz
router.get("/dashbord/:lessonId", authMiddleware, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const teacherId = req.user.id;

    const lesson = await Lesson.findOne({ _id: lessonId, teacher: teacherId }).populate("course");
    if (!lesson) return res.status(404).json({ msg: "الدرس غير موجود" });

    if (lesson.type !== "quiz") delete lesson.quiz;
    lesson.subLessons.forEach(sl => { if (sl.type !== "quiz") delete sl.quiz; });

    res.json(lesson);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ في الخادم", error });
  }
});

// تعديل درس رئيسي
router.put("/dashbord/:lessonId", async (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(403).json({ msg: "ليس لديك صلاحية" });
    }

    const lessonId = req.params.lessonId;
    const lessonData = req.body;

    const update = {
      name: lessonData.name,
      type: lessonData.type,
      url: lessonData.url,
      time: lessonData.time,
      active: lessonData.active,
      free: lessonData.free,
      course: Array.isArray(lessonData.course) ? lessonData.course : [lessonData.course],
    };

    // إذا كان هناك تحديث للدروس الفرعية
    if (lessonData.subLessons) {
      update.subLessons = lessonData.subLessons;
    }

    const updatedLesson = await Lesson.findOneAndUpdate(
      { _id: lessonId, teacher: teacherId },
      { $set: update },
      { new: true }
    ).populate("course"); 

    if (!updatedLesson) {
      return res.status(404).json({ msg: "الدرس غير موجود أو غير تابع لك" });
    }

    res.json({ msg: "تم تعديل الدرس بنجاح", lesson: updatedLesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ في الخادم", error });
  }
});

// حذف درس رئيسي
router.delete("/dashbord/:lessonId", async (req, res) => {
  try {
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(403).json({ msg: "ليس لديك صلاحية" });
    }

    const lessonId = req.params.lessonId;

    const deletedLesson = await Lesson.findOneAndDelete({
      _id: lessonId,
      teacher: teacherId
    });

    if (!deletedLesson) {
      return res.status(404).json({ msg: "الدرس غير موجود أو غير تابع لك" });
    }

    res.json({ msg: "تم حذف الدرس بنجاح", lesson: deletedLesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ في الخادم", error });
  }
});


router.put("/:lessonId", async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lessonData = req.body;

    // جلب الدرس القديم
    const oldLesson = await Lesson.findById(lessonId);
    if (!oldLesson) {
      return res.status(404).json({ msg: "الدرس غير موجود" });
    }

    // تحديث الدرس نفسه
    const updatedLesson = await Lesson.findByIdAndUpdate(
      lessonId,
      lessonData,
      { new: true }
    );

    // الكورسات القديمة بأمان - إصلاح السطر 290
    const oldCourseIds = Array.isArray(oldLesson.course)
      ? oldLesson.course
          .filter(id => id != null)
          .map(id => id.toString())
      : [];

    // الكورسات الجديدة بأمان
    const newCourseIds = Array.isArray(lessonData.course)
      ? lessonData.course
          .filter(id => id != null)
          .map(id => id.toString())
      : lessonData.course
      ? [lessonData.course.toString()]
      : [];

    // إزالة الدرس من الكورسات اللي تم حذفه منها - إصلاح السطر 295
    const removedCourses = oldCourseIds.filter(id => !newCourseIds.includes(id));
    for (const courseId of removedCourses) {
      const course = await Course.findById(courseId);
      if (course && Array.isArray(course.lessons)) {
        course.lessons = course.lessons.filter(lid => lid && lid.toString() !== lessonId);
        await course.save();
      }
    }

    // إضافة الدرس للكورسات الجديدة اللي ما كانتش موجودة
    for (const courseId of newCourseIds) {
      const course = await Course.findById(courseId);
      if (course) {
        if (!Array.isArray(course.lessons)) course.lessons = [];
        if (!course.lessons.includes(updatedLesson._id)) {
          course.lessons.push(updatedLesson._id);
          await course.save();
        }
      }
    }

    res.json({ msg: "تم تعديل الدرس بنجاح", lesson: updatedLesson });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "حدث خطأ أثناء تعديل الدرس", error: err.message });
  }
});


router.get("/searchSub/:courseId", async (req, res) => {
  try {
    const { courseId } = req.params;
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id: userId } = jwt.verify(token, process.env.secretJwt);

    const isSubscribed = await Course.exists({
      _id: courseId,
      students: userId
    });

const course = await Course.findById(courseId)
  .select("name image description lessons teacher")
  .populate({
    path: "lessons",
    select: "name type time free subLessons active",
    // يمكنك إضافة populate داخل populate إذا كان Teacher موجود في الـ Lesson
  })
  .populate({
    path: "teacher",
    select: "name", // أو أي حقول تريدها للمعلم
  });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // 🧠 تنظيف الداتا
    const sanitizedLessons = course.lessons
      .filter(lesson => lesson.active !== false) // 1. استبعاد الدروس غير النشطة
      .map(lesson => {
        
        // تحضير الـ subLessons
        const subLessons = (lesson.subLessons || [])
          .filter(sl => sl.active !== false) // 2. استبعاد الدروس الفرعية غير النشطة
          .map(sl => ({
            _id: sl._id,
            name: sl.name,
            type: sl.type,
            time: sl.time,
            free: sl.free,
            // 3. إرسال الـ URL لو مشترك "أو" لو العنصر مجاني
            ...((isSubscribed || sl.free) && { url: sl.url }) 
          }));

        return {
          _id: lesson._id,
          name: lesson.name,
          type: lesson.type,
          time: lesson.time,
          free: lesson.free,
          // 4. إرسال الـ URL للدرس الرئيسي لو مشترك أو مجاني
          ...((isSubscribed || lesson.free) && { url: lesson.url }),
          subLessons
        };
      });

    return res.json({
      subscribed: !!isSubscribed,
      course: {
        _id: course._id,
        name: course.name,
        image: course.image,
        teacher: course.teacher.name,
        description: course.description,
        lessons: sanitizedLessons
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:lessonId", async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const subLessonId = req.query.subLessonId;
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = jwt.verify(token, process.env.secretJwt);
    const userId = user.id || user._id;

    const lesson = await Lesson.findById(lessonId).populate("course", "students");

    if (!lesson) {
      return res.status(404).json({ msg: "الدرس غير موجود" });
    }

    // تحقق إذا المستخدم موجود في أي كورس من الدرس أو الدرس مجاني
    const isSubscribed = lesson.course.some(c => c.students && c.students.includes(userId));

    if (isSubscribed || lesson.free) {
      // إرجاع الدرس الفرعي إذا معرف، أو الدرس نفسه
      return res.json(subLessonId ? lesson.subLessons.id(subLessonId) || lesson : lesson);
    } else {
      return res.status(403).json({ msg: "لست مشتركا" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ في الخادم", error });
  }
});


module.exports = router;