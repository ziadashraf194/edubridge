const express = require('express');
const User = require("../models/User");
const Course = require("../models/Course");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs")
;
const imageDir = "./courses_image";

if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "courses_image/"); 
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); 
  },
});
const upload = multer({ storage });


router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, content, active } = req.body;
    const teacherToken = req.cookies.token;

    if (!teacherToken) {
      return res.status(401).json({ msg: "سجل الدخول اولا" });
    }

    const decoded = jwt.verify(teacherToken, process.env.secretJwt);
    const teacherId = decoded.id;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(403).json({ msg: "يجب أن تكون معلمًا لنشر الكورسات" });
    }

    const imagePath = req.file ? `/courses_image/${req.file.filename}` : "";

    const newCourse = new Course({
      name,
      image: imagePath, 
      description,
      price,
      content,
      active,
      teacher: teacherId,
    });

    await newCourse.save();

    res.json({ msg: "تم حفظ الكورس بنجاح ", course: newCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ أثناء حفظ الكورس" });
  }
});


router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";

    let query = { active: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
      ];
    }

    let totalCourses = await Course.countDocuments(query);

    let courses = await Course.find(query)
      .populate("teacher", "name")
      .skip(skip)
      .limit(limit)
      .sort({ _id: -1 }).select("-lessons -students -sale -active"); 

    if (search && courses.length === 0) {
      const allCourses = await Course.find({ active: true })
        .populate({
          path: "teacher",
          match: { name: { $regex: search, $options: "i" } },
          select: "name",
        })
        .sort({ _id: -1 });

      const filtered = allCourses.filter((c) => c.teacher !== null);

      totalCourses = filtered.length; 
      courses = filtered.slice(skip, skip + limit);
    }

    const totalPages = Math.ceil(totalCourses / limit) || 1;

    return res.json({
      page,
      totalCourses,
      totalPages,
      courses,
    });
  } catch (error) {
    console.error(" خطأ أثناء جلب الكورسات:", error);
    res.status(500).json({ msg: "حدث خطأ في السيرفر" });
  }
});




router.get("/my", async (req, res) => {
  try {
    token = req.cookies.token
       const decoded = jwt.verify(token, process.env.secretJwt);
       const userId = decoded.id;
  
       const courses = await Course.find({students:userId,active:true}).populate("teacher","name").select("-lessons -students -sale -active")
            if (courses.length===0) {
        res.status(404).json({msg:"لم تشترك في اي كورسات بعد"})
        return
       }
        res.status(200).json(courses)
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ" });
  }
});
router.get("/recommended", async (req, res) => {
  try {
    const courses = await Course.find({active:true})
      .populate("teacher", "name")
      .sort({ 
        students: -1,   
        createdAt: -1   
      })
      .limit(10).select("-lessons -students -sale"); 

    if (courses.length === 0) {
      return res.status(404).json({ msg: "لا توجد كورسات مقترحة حالياً" });
    }

    res.status(200).json({
      msg: "تم جلب الكورسات المقترحة بنجاح",
      courses,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "حدث خطأ أثناء جلب الكورسات المقترحة" });
  }
});

router.get("/teacher", async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ msg: "لا يوجد توكن" });
    }

    const decoded = jwt.verify(token, process.env.secretJwt);

    const user = await User.findById(decoded.id).select("name role phone image");

    if (!user) {
      return res.status(404).json({ msg: "المستخدم غير موجود" });
    }

    if (user.role !== "teacher") {
      return res.status(403).json({ msg: "غير مصرح لك بالدخول" });
    }

    const courses = await Course.find({ teacher: user._id })
      .populate("teacher", "name image")
      .lean();

    res.status(200).json({
      msg: "تم جلب الكورسات بنجاح ✅",
      teacher: user,
      courses,
    });
  } catch (error) {
    console.error("Error fetching teacher courses:", error);
    res.status(500).json({ msg: "حدث خطأ في السيرفر " });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ msg: "يجب تسجيل الدخول أولاً" });
    }

    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(403).json({ msg: "غير مصرح لك بالوصول" });
    }

    // 📚 جلب الكورسات الخاصة بالمدرس
    const courses = await Course.find({ teacher: teacherId }).lean();

    // ✨ تجهيز بيانات كل كورس
    const coursesData = courses.map((course) => ({
      id: course._id,
      name: course.name,
      students: course.students.length,
      price: course.price,
      sale: course.sale,
      category: course.description || "بدون تصنيف",
      status: course.active ? "نشط" : "متوقف",
      image: course.image || "📚",
      description:course.description
    }));

    const totalStudents = coursesData.reduce(
      (sum, c) => sum + c.students,
      0
    );
    const totalCourses = coursesData.length;
    const totalRevenue = coursesData.reduce(
      (sum, c) => sum + c.sale,
      0
    );

    const monthlyData = [
      { month: "يناير", revenue: 3200 },
      { month: "فبراير", revenue: 3800 },
      { month: "مارس", revenue: 4200 },
      { month: "أبريل", revenue: 3900 },
      { month: "مايو", revenue: 4800 },
      { month: "يونيو", revenue: 5200 },
    ];

    res.json({
      stats: {
        totalStudents,
        totalCourses,
        totalRevenue,
      },
      monthlyData,
      courses: coursesData,
    });
  } catch (err) {
    console.error("❌ Error in /teacher/dashboard:", err);
    res.status(500).json({ msg: "حدث خطأ في الخادم" });
  }
});
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ msg: "يجب تسجيل الدخول أولاً" });

    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ msg: "الكورس غير موجود" });

    if (course.teacher.toString() !== teacherId)
      return res.status(403).json({ msg: "غير مصرح لك بتعديل هذا الكورس" });

    const { name, description, price, active } = req.body;

    // تحديث البيانات
    course.name = name || course.name;
    course.description = description || course.description;
    course.price = price ?? course.price;
    course.active = active !== undefined ? active : course.active;

    if (req.file) {
      // حذف الصورة القديمة إذا كانت موجودة
      if (course.image) {
        const oldPath = path.join(__dirname, "..", course.image);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      course.image = `/courses_image/${req.file.filename}`;
    }

    await course.save();
    res.json({ msg: "✅ تم تعديل الكورس بنجاح", course });
  } catch (err) {
    console.error("Error updating course:", err);
    res.status(500).json({ msg: "حدث خطأ أثناء تعديل الكورس" });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ msg: "يجب تسجيل الدخول أولاً" });

    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ msg: "الكورس غير موجود" });

    if (course.teacher.toString() !== teacherId)
      return res.status(403).json({ msg: "غير مصرح لك بحذف هذا الكورس" });

    await course.deleteOne();
    res.json({ msg: " تم حذف الكورس بنجاح" });
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ msg: "حدث خطأ أثناء حذف الكورس" });
  }
});

router.get("/names", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ msg: "يجب تسجيل الدخول أولاً" });

    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;

    const courses = await Course.find({ teacher: teacherId }).select("name");

    if (!courses || courses.length === 0) {
      return res.status(404).json({ msg: "لا توجد كورسات لهذا المعلم" });
    }

    

    res.status(200).json( courses );
  } catch (err) {
    console.error("Error fetching teacher course names:", err);
    res.status(500).json({ msg: "حدث خطأ أثناء جلب أسماء الكورسات" });
  }
});

router.get("/subscription/:id", async (req, res) => {
 courseId = req.params.id
 course = await Course.findById(courseId).populate("teacher","name").populate("lessons")
let mainTime = 0, supTime = 0;

if (Array.isArray(course.lessons)) {
  for (let lesson of course.lessons) {
    mainTime += Number(lesson.time) || 0;

    if (Array.isArray(lesson.subLessons)) {
      for (let sub of lesson.subLessons) {
        supTime += Number(sub.time) || 0;
      }
    }
  }
}

let allTime = mainTime + supTime;

 res.json({
  _id:course._id,
  lessons:course.lessons.length,
  lessons:course.lessons.length,
  students:course.students.length,
  time: allTime,
  price:course.price,
  teacherName:course.teacher.name,
  name:course.name,
  description:course.description,
  image:course.image,
  teacher:course.teacher.name,
 })
})


module.exports = router;
