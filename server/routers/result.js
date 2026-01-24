const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Result = require("../models/Result");
const ExcelJS = require('exceljs'); // تأكد من تثبيت: npm install exceljs
require("dotenv").config();

// جلب نتائج الطلاب لاختبار معين (للمعلم)
router.get("/teacher/:quizId/results", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ msg: "يرجى تسجيل الدخول" });

    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacher = await User.findById(decoded.id || decoded._id);

    if (!teacher || teacher.role !== "teacher") {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ msg: "الكويز غير موجود" });
    }

    const results = await Result.find({ quiz: quiz._id })
      .populate("student", "name email id fatherPhone phone")
      .sort({ score: -1 });

    const data = results.map(r => ({
      student: {
        id: r.student.id,
        name: r.student.name,
        email: r.student.email,
        phone: r.student.phone || null,
        fatherPhone: r.student.fatherPhone || null,
      },
      score: r.score,
      totalMarks: r.totalMarks,
      passed: r.passed,
      answers: r.answers.map(a => ({
        question: a.question,
        selectedAnswer: a.selectedAnswer,
        isCorrect: a.isCorrect,
        marks: a.marks,
      })),
      startedAt: r.startedAt,
      submittedAt: r.submittedAt,
    }));

    res.json({
      msg: "تم جلب نتائج الطلاب بنجاح ✅",
      quiz: {
        id: quiz._id,
        title: quiz.title,
      },
      results: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "خطأ أثناء جلب نتائج الطلاب" });
  }
});

// تصدير نتائج الطلاب كملف Excel
router.get("/export/:quizId/excel", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ msg: "يرجى تسجيل الدخول" });

    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacher = await User.findById(decoded.id || decoded._id);

    if (!teacher || teacher.role !== "teacher") {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ msg: "الكويز غير موجود" });
    }

    const results = await Result.find({ quiz: quiz._id })
      .populate("student", "name email id fatherPhone phone")
      .sort({ score: -1 });

    // إنشاء مصنف Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('نتائج الطلاب');

    // إضافة عنوان
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `نتائج اختبار: ${quiz.title}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // إعداد الرؤوس
    const headers = [
      'م', 'اسم الطالب', 'البريد الإلكتروني', 'الهاتف', 'هاتف الأب',
      'الدرجة', 'الدرجة الكلية', 'النسبة المئوية', 'الحالة',
      'وقت البدء', 'وقت التسليم'
    ];

    worksheet.addRow(headers);

    // تطبيق تنسيق على الرؤوس
    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // إضافة البيانات
    results.forEach((result, index) => {
      const percentage = (result.score / result.totalMarks * 100).toFixed(1);
      const status = result.passed ? 'ناجح' : 'راسب';
      
      const row = worksheet.addRow([
        index + 1,
        result.student?.name || 'مجهول',
        result.student?.email || 'لا يوجد بريد',
        result.student?.phone || 'لا يوجد هاتف',
        result.student?.fatherPhone || 'لا يوجد هاتف الأب',
        result.score,
        result.totalMarks,
        `${percentage}%`,
        status,
        new Date(result.startedAt).toLocaleString('ar-SA'),
        new Date(result.submittedAt).toLocaleString('ar-SA')
      ]);

      // تطبيق تنسيق على الخلايا
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // تلوين خلية الحالة
      const statusCell = row.getCell(9);
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: result.passed ? 'FFC6EFCE' : 'FFFFC7CE' }
      };
    });

    // تعديل عرض الأعمدة
    worksheet.columns = [
      { width: 5 },   // م
      { width: 25 },  // اسم الطالب
      { width: 30 },  // البريد الإلكتروني
      { width: 15 },  // الهاتف
      { width: 15 },  // هاتف الأب
      { width: 10 },  // الدرجة
      { width: 15 },  // الدرجة الكلية
      { width: 15 },  // النسبة المئوية
      { width: 10 },  // الحالة
      { width: 20 },  // وقت البدء
      { width: 20 }   // وقت التسليم
    ];

    // إعداد الاستجابة
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=نتائج_${quiz.title.replace(/\s+/g, '_')}.xlsx`);

    // كتابة الملف إلى الاستجابة
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "خطأ أثناء تصدير النتائج" });
  }
});

// جلب الاختبارات الخاصة بكورس معين (للطلاب)
router.get("/course/:courseId", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ msg: "يرجى تسجيل الدخول" });
    }

    const user = jwt.verify(token, process.env.secretJwt);
    const student = await User.findById(user.id || user._id);
    
    if (!student || student.role !== "student") {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    // جلب الدروس التي تحتوي على كويزات في هذا الكورس
    const lessons = await Lesson.find({
      course: req.params.courseId,
      $or: [
        { type: "quiz" },
        { "subLessons.type": "quiz" }
      ]
    })
    .populate("course", "name")
    .select("name type quiz subLessons course active free");

    // استخراج الكويزات من الدروس
    const quizzes = [];
    
    lessons.forEach(lesson => {
      // الكويزات الرئيسية
      if (lesson.type === "quiz" && lesson.quiz && lesson.active) {
        quizzes.push({
          _id: lesson._id,
          title: lesson.quiz.title || lesson.name,
          description: lesson.quiz.description,
          lessonName: lesson.name,
          course: lesson.course,
          isSubLesson: false,
          totalMarks: lesson.quiz.totalMarks,
          passingMarks: lesson.quiz.passingMarks,
          duration: lesson.quiz.duration,
          isActive: lesson.quiz.isActive,
          free: lesson.free || false,
          attemptsAllowed: lesson.quiz.attemptsAllowed || 1,
          questionsCount: lesson.quiz.questions?.length || 0
        });
      }

      // الكويزات الفرعية
      lesson.subLessons.forEach((subLesson, index) => {
        if (subLesson.type === "quiz" && subLesson.quiz && subLesson.active) {
          quizzes.push({
            _id: lesson._id,
            subLessonId: subLesson._id,
            title: subLesson.quiz.title || subLesson.name,
            description: subLesson.quiz.description,
            lessonName: lesson.name,
            subLessonName: subLesson.name,
            course: lesson.course,
            isSubLesson: true,
            totalMarks: subLesson.quiz.totalMarks,
            passingMarks: subLesson.quiz.passingMarks,
            duration: subLesson.quiz.duration,
            isActive: subLesson.quiz.isActive,
            free: subLesson.free || false,
            attemptsAllowed: subLesson.quiz.attemptsAllowed || 1,
            questionsCount: subLesson.quiz.questions?.length || 0
          });
        }
      });
    });

    res.json(quizzes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "خطأ أثناء جلب كويزات الكورس" });
  }
});

// جلب كويز للطالب (بدون إجابات)
router.get("/take/:id", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ msg: "يرجى تسجيل الدخول" });
    }

    const user = jwt.verify(token, process.env.secretJwt);
    const student = await User.findById(user.id || user._id);
    
    if (!student || student.role !== "student") {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    const { isSubLesson, subLessonId } = req.query;
    
    let lesson;
    if (isSubLesson === "true" && subLessonId) {
      // كويز فرعي
      lesson = await Lesson.findOne({
        _id: req.params.id,
        "subLessons._id": subLessonId,
        "subLessons.type": "quiz"
      })
      .select("name course subLessons.$");
      
      if (!lesson || !lesson.subLessons || lesson.subLessons.length === 0) {
        return res.status(404).json({ msg: "الكويز غير موجود" });
      }
      
      const subLesson = lesson.subLessons[0];
      
      // إخفاء الإجابات الصحيحة
      const quizData = { ...subLesson.quiz.toObject() };
      if (quizData.questions) {
        quizData.questions = quizData.questions.map(q => ({
          type: q.type,
          question: q.question,
          marks: q.marks,
          options: q.options,
          explanation: "", // إخفاء الشرح
          correctAnswer: undefined // إخفاء الإجابة الصحيحة
        }));
      }
      
      res.json({
        _id: lesson._id,
        subLessonId: subLesson._id,
        title: quizData.title || subLesson.name,
        description: quizData.description,
        lessonName: lesson.name,
        subLessonName: subLesson.name,
        course: lesson.course,
        isSubLesson: true,
        ...quizData
      });
    } else {
      // كويز رئيسي
      lesson = await Lesson.findOne({
        _id: req.params.id,
        type: "quiz"
      })
      .select("name course quiz");
      
      if (!lesson) {
        return res.status(404).json({ msg: "الكويز غير موجود" });
      }
      
      // إخفاء الإجابات الصحيحة
      const quizData = { ...lesson.quiz.toObject() };
      if (quizData.questions) {
        quizData.questions = quizData.questions.map(q => ({
          type: q.type,
          question: q.question,
          marks: q.marks,
          options: q.options,
          explanation: "", // إخفاء الشرح
          correctAnswer: undefined // إخفاء الإجابة الصحيحة
        }));
      }
      
      res.json({
        _id: lesson._id,
        title: quizData.title || lesson.name,
        description: quizData.description,
        lessonName: lesson.name,
        course: lesson.course,
        isSubLesson: false,
        ...quizData
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "خطأ أثناء جلب الكويز" });
  }
});

module.exports = router;