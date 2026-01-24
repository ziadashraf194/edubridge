const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Course = require("../models/Course");
const User = require("../models/User");
const Lesson = require("../models/Lesson");
const Request = require("../models/subscription/request");
const ExcelJS = require('exceljs');

// التحقق من أن المستخدم معلم
const verifyTeacher = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacher = await User.findById(decoded.id).select("role");
    return teacher && teacher.role === "teacher" ? decoded.id : null;
  } catch (err) {
    return null;
  }
};

// التحقق من صلاحية المعلم على الدورة
const verifyTeacherForCourse = async (teacherId, courseId) => {
  const course = await Course.findOne({ _id: courseId, teacher: teacherId });
  return course;
};

// 1. تقديم طلب انضمام للدورة
router.post("/request/:courseId", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ msg: "يرجى تسجيل الدخول" });

    const decoded = jwt.verify(token, process.env.secretJwt);
    const userId = decoded.id;
    const courseId = req.params.courseId;

    // التحقق من وجود الطلب السابق
    const existingReq = await Request.findOne({ userId, courseId });
    if (existingReq) {
      return res.json({ msg: "جاري مراجعة طلبك" });
    }

    // إنشاء طلب جديد
    const request = new Request({
      userId,
      courseId,
      msg: req.body.msg || "طلب انضمام للدورة"
    });

    await request.save();
    res.json({
      success: true,
      msg: "تم تقديم طلب الانضمام بنجاح",
      request
    });

  } catch (err) {
    console.error("خطأ في تقديم طلب الانضمام:", err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: "رمز الدخول غير صالح" });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: "خطأ في الخادم" 
    });
  }
});

// 2. جلب طلبات الانضمام للدورة (للمعلم)
router.get("/request/:courseId", async (req, res) => {
  try {
    const token = req.cookies.token;
    const teacherId = await verifyTeacher(token);
    
    if (!teacherId) {
      return res.status(403).json({ 
        success: false, 
        msg: "يجب أن تكون معلمًا للوصول لهذه الصفحة" 
      });
    }

    const courseId = req.params.courseId;
    const course = await verifyTeacherForCourse(teacherId, courseId);
    
    if (!course) {
      return res.status(403).json({ 
        success: false, 
        msg: "لا تملك صلاحية الوصول لهذه الدورة" 
      });
    }

    // جلب طلبات الانضمام مع بيانات المستخدمين
    const requests = await Request.find({ courseId }).populate({
      path: "userId",
      select: "name email phone id"
    });

    res.json(requests);

  } catch (err) {
    console.error("خطأ في جلب طلبات الانضمام:", err);
    res.status(500).json({ 
      success: false, 
      msg: "خطأ في الخادم" 
    });
  }
});

// 3. معالجة طلب الانضمام (قبول/رفض)
router.get("/request/:requestId/:status", async (req, res) => {
  try {
    const token = req.cookies.token;
    const teacherId = await verifyTeacher(token);
    
    if (!teacherId) {
      return res.status(403).json({ 
        success: false, 
        msg: "يجب أن تكون معلمًا للوصول لهذه الصفحة" 
      });
    }

    const requestId = req.params.requestId;
    const status = req.params.status;
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        msg: "طلب الانضمام غير موجود" 
      });
    }

    // التحقق من أن المعلم هو صاحب الدورة
    const course = await verifyTeacherForCourse(teacherId, request.courseId);
    if (!course) {
      return res.status(403).json({ 
        success: false, 
        msg: "لا تملك صلاحية الوصول لهذه الدورة" 
      });
    }

    if (status === "acceptRequest") {
      // قبول الطلب وإضافة الطالب للدورة
      if (!course.students.includes(request.userId)) {
        course.students.push(request.userId);
        await course.save();
      }

      // حذف طلب الانضمام
      await Request.findByIdAndDelete(requestId);

      return res.json({ 
        success: true, 
        msg: "تم قبول الطلب بنجاح" 
      });
    }

    if (status === "rejectRequest") {
      // رفض الطلب
      await Request.findByIdAndDelete(requestId);
      return res.json({ 
        success: true, 
        msg: "تم رفض الطلب بنجاح" 
      });
    }

    return res.status(400).json({ 
      success: false, 
      msg: "حالة غير صالحة" 
    });

  } catch (err) {
    console.error("خطأ في معالجة طلب الانضمام:", err);
    res.status(500).json({ 
      success: false, 
      msg: "خطأ في الخادم" 
    });
  }
});

// 4. انضمام مجاني للدورة (إذا كانت مجانية)
router.post("/free/:courseId", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ msg: "يرجى تسجيل الدخول" });

    const decoded = jwt.verify(token, process.env.secretJwt);
    const userId = decoded.id;
    const courseId = req.params.courseId;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        msg: "الدورة غير موجودة" 
      });
    }

    if (course.price === 0) {
      if (!course.students.includes(userId)) {
        course.students.push(userId);
        await course.save();
      }
      return res.json({ 
        success: true, 
        msg: "تم الاشتراك في الدورة بنجاح" 
      });
    }

    return res.status(400).json({ 
      success: false, 
      msg: "هذه الدورة ليست مجانية" 
    });

  } catch (err) {
    console.error("خطأ في الاشتراك المجاني:", err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: "رمز الدخول غير صالح" });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: "خطأ في الخادم" 
    });
  }
});

// 5. حذف طالب من الدورة
router.delete("/:courseId/:userId", async (req, res) => {
  try {
    const token = req.cookies.token;
    const teacherId = await verifyTeacher(token);
    
    if (!teacherId) {
      return res.status(403).json({ 
        success: false, 
        msg: "يجب أن تكون معلمًا للوصول لهذه الصفحة" 
      });
    }

    const courseId = req.params.courseId;
    const userId = req.params.userId;

    const course = await verifyTeacherForCourse(teacherId, courseId);
    if (!course) {
      return res.status(403).json({ 
        success: false, 
        msg: "لا تملك صلاحية الوصول لهذه الدورة" 
      });
    }

    // إزالة الطالب من الدورة
    course.students.pull(userId);
    await course.save();

    res.json({
      success: true,
      msg: "تم حذف الطالب بنجاح",
      course: {
        _id: course._id,
        name: course.name,
        studentsCount: course.students.length
      }
    });

  } catch (err) {
    console.error("خطأ في حذف الطالب:", err);
    res.status(500).json({ 
      success: false, 
      msg: "خطأ في الخادم" 
    });
  }
});

// 6. جلب الطلاب المشتركين في الدورة
router.get("/:courseId", async (req, res) => {
  try {
    const token = req.cookies.token;
    const teacherId = await verifyTeacher(token);
    
    if (!teacherId) {
      return res.status(403).json({ 
        success: false, 
        msg: "يجب أن تكون معلمًا للوصول لهذه الصفحة" 
      });
    }

    const courseId = req.params.courseId;
    const course = await verifyTeacherForCourse(teacherId, courseId);
    
    if (!course) {
      return res.status(403).json({ 
        success: false, 
        msg: "لا تملك صلاحية الوصول لهذه الدورة" 
      });
    }

    // جلب بيانات الدورة والطلاب
    const fullCourse = await Course.findById(courseId)
      .populate({
        path: "students",
        select: "name email phone fatherPhone id createdAt",
        options: { sort: { createdAt: -1 } }
      })
      .populate({
        path: "teacher",
        select: "name email"
      });

    // تنسيق الاستجابة
    const response = {
      success: true,
      courseId: fullCourse._id,
      courseName: fullCourse.name || "غير معروف",
      teacherName: fullCourse.teacher?.name || "غير معروف",
      totalStudents: fullCourse.students.length,
      students: fullCourse.students.map(student => ({
        _id: student._id,
        id: student.id,
        name: student.name || "غير معروف",
        email: student.email || "لا يوجد",
        phone: student.phone || "لا يوجد",
        fatherPhone: student.fatherPhone || "لا يوجد",
        enrolledDate: student.createdAt ? 
          new Date(student.createdAt).toISOString().split("T")[0] : 
          "غير معروف",
        progress: 0,
        status: "active",
        lastAccess: "غير معروف"
      }))
    };

    res.json(response);

  } catch (err) {
    console.error("خطأ في جلب الطلاب:", err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        msg: "رمز الدخول غير صالح" 
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        msg: "معرف الدورة غير صالح" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: "خطأ في الخادم" 
    });
  }
});

// 7. إضافة طالب للدورة يدويًا
router.post("/add/:courseId/:userId", async (req, res) => {
  try {
    const token = req.cookies.token;
    const teacherId = await verifyTeacher(token);
    
    if (!teacherId) {
      return res.status(403).json({ 
        success: false, 
        msg: "يجب أن تكون معلمًا للوصول لهذه الصفحة" 
      });
    }

    const courseId = req.params.courseId;
    const userId = req.params.userId;

    const course = await verifyTeacherForCourse(teacherId, courseId);
    if (!course) {
      return res.status(403).json({ 
        success: false, 
        msg: "لا تملك صلاحية الوصول لهذه الدورة" 
      });
    }

    // التحقق من وجود الطالب
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        msg: "الطالب غير موجود" 
      });
    }

    // التحقق إذا كان الطالب مشترك بالفعل
    if (course.students.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        msg: "الطالب مشترك بالفعل في هذه الدورة" 
      });
    }

    // إضافة الطالب للدورة
    course.students.push(userId);
    await course.save();

    res.json({
      success: true,
      msg: "تم إضافة الطالب بنجاح",
      student: {
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        fatherPhone: user.fatherPhone
      }
    });

  } catch (err) {
    console.error("خطأ في إضافة الطالب:", err);
    res.status(500).json({ 
      success: false, 
      msg: "خطأ في الخادم" 
    });
  }
});

// 8. البحث عن طالب بكود الطالب (حقل id)
router.get("/search/:code", async (req, res) => {
  try {
    const token = req.cookies.token;
    const teacherId = await verifyTeacher(token);
    
    if (!teacherId) {
      return res.status(403).json({ 
        success: false, 
        msg: "يجب أن تكون معلمًا للوصول لهذه الصفحة" 
      });
    }

    const studentCode = parseInt(req.params.code);
    
    if (isNaN(studentCode)) {
      return res.status(400).json({ 
        success: false, 
        msg: "كود الطالب يجب أن يكون رقمًا" 
      });
    }

    // البحث عن المستخدم بكود الطالب (حقل id)
    const user = await User.findOne({ id: studentCode })
      .select("name email phone fatherPhone role id _id");

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        msg: "لم يتم العثور على طالب بهذا الكود" 
      });
    }

    // يمكنك إلغاء التعليق إذا أردت التحقق من أن المستخدم طالب
    /*
    if (user.role !== "student") {
      return res.status(400).json({ 
        success: false, 
        msg: "المستخدم ليس طالبًا" 
      });
    }
    */

    res.json({
      success: true,
      user: {
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        fatherPhone: user.fatherPhone,
        role: user.role
      }
    });

  } catch (err) {
    console.error("خطأ في البحث عن الطالب:", err);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        msg: "رمز الدخول غير صالح" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      msg: "خطأ في الخادم" 
    });
  }
});

// 9. البحث عن طالب بالاسم أو البريد أو الهاتف
router.get("/search/student/:query", async (req, res) => {
  try {
    const token = req.cookies.token;
    const teacherId = await verifyTeacher(token);
    
    if (!teacherId) {
      return res.status(403).json({ 
        success: false, 
        msg: "يجب أن تكون معلمًا للوصول لهذه الصفحة" 
      });
    }

    const query = req.params.query;
    
    // البحث عن الطلاب بمختلف الحقول
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { fatherPhone: { $regex: query, $options: 'i' } },
        { id: isNaN(query) ? null : parseInt(query) }
      ].filter(condition => condition !== null)
    })
    .select("name email phone fatherPhone role id _id")
    .limit(10);

    res.json({
      success: true,
      users: users.map(user => ({
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        fatherPhone: user.fatherPhone,
        role: user.role
      }))
    });

  } catch (err) {
    console.error("خطأ في البحث عن الطلاب:", err);
    res.status(500).json({ 
      success: false, 
      msg: "خطأ في الخادم" 
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
          let lessons = await Lesson.find({teacher: teacherId}).populate("course", "name");
          res.json(lessons);
      return
    } else {
      res.json({subscribed:true})
      return
    }
    
})

// Export students of a course as Excel (teacher only)
router.get('/export/students/:courseId', async (req, res) => {
  try {
    const token = req.cookies.token;
    const teacherId = await verifyTeacher(token);
    if (!teacherId) return res.status(403).json({ success: false, msg: 'يجب أن تكون معلمًا للوصول لهذه الصفحة' });

    const courseId = req.params.courseId;
    const course = await verifyTeacherForCourse(teacherId, courseId);
    if (!course) return res.status(403).json({ success: false, msg: 'لا تملك صلاحية الوصول لهذه الدورة' });

    const fullCourse = await Course.findById(courseId).populate({
      path: 'students',
      select: 'name email phone fatherPhone id createdAt'
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');

    sheet.columns = [
      { header: 'كود الطالب', key: 'id', width: 15 },
      { header: 'الاسم', key: 'name', width: 30 },
      { header: 'البريد', key: 'email', width: 30 },
      { header: 'الهاتف', key: 'phone', width: 20 },
      { header: 'هاتف ولي الأمر', key: 'fatherPhone', width: 20 },
      { header: 'تاريخ الانضمام', key: 'enrolledDate', width: 20 }
    ];

    fullCourse.students.forEach(s => {
      sheet.addRow({
        id: s.id || '',
        name: s.name || '',
        email: s.email || '',
        phone: s.phone || '',
        fatherPhone: s.fatherPhone || '',
        enrolledDate: s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="students_${courseId}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Error exporting students:', err);
    res.status(500).json({ success: false, msg: 'حدث خطأ أثناء تصدير بيانات الطلاب' });
  }
});

module.exports = router;