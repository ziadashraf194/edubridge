const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Lesson = require("../models/Lesson");
const User = require("../models/User");
const Result = require("../models/Result");
const ExcelJS = require('exceljs');
require("dotenv").config();

// ⭐ دالة جديدة للتحقق من دور المستخدم
const verifyUser = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.secretJwt);
    const user = await User.findById(decoded.id || decoded._id);
    return user ? { user, role: user.role } : null;
  } catch (err) {
    console.error("Token verification error:", err);
    return null;
  }
};

// دالة مساعدة للتحقق من المعلم فقط
const verifyTeacher = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacher = await User.findById(decoded.id || decoded._id);
    return (teacher && teacher.role === "teacher") ? teacher : null;
  } catch (err) {
    console.error("Token verification error:", err);
    return null;
  }
};

// ⭐ دالة محسنة لتنظيف بيانات الأسئلة (تعريف واحد فقط)
const cleanQuestionsData = (questions) => {
  if (!questions) return [];
  
  console.log("Cleaning questions data, count:", questions.length);
  
  return questions.map((q, index) => {
    console.log(`Cleaning question ${index}:`, q);
    
    // استخراج البيانات من _doc إذا كانت موجودة
    const qData = q._doc || q;
    
    const cleanedQuestion = {
      _id: qData._id || new mongoose.Types.ObjectId(),
      type: qData.type || "multiple-choice",
      question: qData.question || qData.text || qData.name || qData.title || `سؤال ${index + 1}`,
      marks: Number(qData.marks) || 1,
      correctAnswer: qData.correctAnswer || "",
      explanation: qData.explanation || "",
      order: qData.order || index + 1
    };
    
    // ⭐ تأكد من أن النوع صحيح
    const validTypes = ["multiple-choice", "true-false", "short-answer", "essay"];
    if (!validTypes.includes(cleanedQuestion.type)) {
      cleanedQuestion.type = "multiple-choice";
    }
    
    // ⭐ معالجة الخيارات بناءً على النوع
    if (cleanedQuestion.type === "true-false") {
      // لسؤال true/false: options فارغة
      cleanedQuestion.options = [];
      
      // ⭐ تأكد من أن correctAnswer هو "true" أو "false"
      if (qData.correctAnswer) {
        const correctAnswer = qData.correctAnswer.toString().toLowerCase();
        cleanedQuestion.correctAnswer = (correctAnswer === "true" || correctAnswer === "false") 
          ? correctAnswer 
          : "true";
      } else {
        cleanedQuestion.correctAnswer = "true";
      }
      
      console.log(`Question ${index}: True/False - correctAnswer = ${cleanedQuestion.correctAnswer}`);
    } 
    else if (cleanedQuestion.type === "multiple-choice") {
      // لسؤال multiple-choice: تأكد من وجود options
      cleanedQuestion.options = Array.isArray(qData.options) 
        ? qData.options.filter(opt => opt !== null && opt !== undefined && opt.toString().trim() !== "") 
        : [];
      
      // إذا كان هناك أقل من خيارين، حاول تصحيحه
      if (cleanedQuestion.options.length < 2) {
        console.log(`Question ${index}: Not enough options (${cleanedQuestion.options.length}), checking if it's actually true/false`);
        
        // إذا كان correctAnswer هو true/false، فاجعل النوع true-false
        const answer = cleanedQuestion.correctAnswer.toString().toLowerCase();
        if (answer === "true" || answer === "false") {
          cleanedQuestion.type = "true-false";
          cleanedQuestion.options = [];
          cleanedQuestion.correctAnswer = answer;
          console.log(`Converted question ${index} to true/false`);
        } else {
          // أضف خيارات افتراضية
          cleanedQuestion.options = ["الخيار الأول", "الخيار الثاني"];
          if (cleanedQuestion.correctAnswer && !cleanedQuestion.options.includes(cleanedQuestion.correctAnswer)) {
            cleanedQuestion.correctAnswer = cleanedQuestion.options[0];
          }
        }
      }
    } 
    else {
      // لـ short-answer و essay: options فارغة
      cleanedQuestion.options = [];
    }
    
    console.log(`Cleaned question ${index}:`, {
      type: cleanedQuestion.type,
      question: cleanedQuestion.question.substring(0, 50) + "...",
      optionsCount: cleanedQuestion.options.length,
      correctAnswer: cleanedQuestion.correctAnswer
    });
    
    return cleanedQuestion;
  });
};

// ⭐ دالة لتصفية الأسئلة للطلاب (إخفاء الإجابات الحساسة)
const filterQuestionsForStudent = (questions, showAnswers = false) => {
  if (!questions) return [];
  
  return questions.map((q, index) => {
    const qData = q._doc || q;
    
    // ⭐ بناء السؤال المصفى
    const filteredQuestion = {
      _id: qData._id || null,
      type: qData.type || "multiple-choice",
      question: qData.question || qData.text || qData.name || qData.title || `سؤال ${index + 1}`,
      marks: Number(qData.marks) || 1,
      order: qData.order || index + 1
    };
    
    // معالجة الخيارات
    if (filteredQuestion.type === "true-false") {
      filteredQuestion.options = ["true", "false"];
    } 
    else if (filteredQuestion.type === "multiple-choice") {
      filteredQuestion.options = Array.isArray(qData.options) 
        ? qData.options.filter(opt => opt !== null && opt !== undefined && opt.toString().trim() !== "") 
        : [];
      
      if (filteredQuestion.options.length < 2) {
        filteredQuestion.options = ["الخيار الأول", "الخيار الثاني"];
      }
    } 
    else {
      filteredQuestion.options = [];
    }
    
    // ⭐ إضافة الإجابة الصحيحة فقط إذا كان مسموحاً
    if (showAnswers) {
      filteredQuestion.correctAnswer = qData.correctAnswer || "";
      filteredQuestion.explanation = qData.explanation || "";
    }
    
    return filteredQuestion;
  });
};

// ⭐ دوال مساعدة جديدة

// حساب متوسط الدرجات
const calculateAverageScore = async (lessonId, isSubLesson, subLessonId) => {
  try {
    const results = await Result.find({
      lesson: lessonId,
      ...(isSubLesson && subLessonId ? { 
        isSubLesson: true, 
        subLessonId 
      } : { isSubLesson: false })
    });
    
    if (results.length === 0) return 0;
    
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    return (totalScore / results.length).toFixed(2);
  } catch (err) {
    console.error("Error calculating average score:", err);
    return 0;
  }
};

// عد الطلاب المميزين
const countUniqueStudents = async (lessonId, isSubLesson, subLessonId) => {
  try {
    const results = await Result.find({
      lesson: lessonId,
      ...(isSubLesson && subLessonId ? { 
        isSubLesson: true, 
        subLessonId 
      } : { isSubLesson: false })
    }).distinct('student');
    
    return results.length;
  } catch (err) {
    console.error("Error counting unique students:", err);
    return 0;
  }
};

// جلب محاولات الطالب
const getMyAttempts = async (studentId, lessonId, isSubLesson, subLessonId) => {
  try {
    return await Result.find({
      student: studentId,
      lesson: lessonId,
      ...(isSubLesson && subLessonId ? { 
        isSubLesson: true, 
        subLessonId 
      } : { isSubLesson: false })
    })
    .sort({ submittedAt: -1 })
    .select('score totalMarks passed attemptNumber submittedAt status')
    .lean();
  } catch (err) {
    console.error("Error getting student attempts:", err);
    return [];
  }
};

// ⭐ دالة لجلب كويز مع تصفية بناءً على دور المستخدم - النسخة المحسنة
const getQuizWithRoleBasedQuestions = async (req, res, isSubLesson, subLessonId) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    const userInfo = await verifyUser(token);
    
    if (!userInfo) {
      return res.status(403).json({ msg: "يجب تسجيل الدخول أولاً" });
    }

    console.log(`Getting quiz ${req.params.id}, user role: ${userInfo.role}, isSubLesson: ${isSubLesson}, subLessonId: ${subLessonId}`);
    
    let lesson, quizData, lessonName = "";
    let isTeacherOwner = false;
    
    if (isSubLesson === "true" && subLessonId) {
      // كويز فرعي
      lesson = await Lesson.findOne({
        _id: req.params.id
      })
      .populate("course", "name");
      
      if (!lesson) {
        return res.status(404).json({ msg: "الدرس غير موجود" });
      }
      
      // التحقق إذا كان المستخدم هو المدرس المالك
      isTeacherOwner = userInfo.role === "teacher" && 
        lesson.teacher.toString() === userInfo.user._id.toString();
      
      const subLesson = lesson.subLessons.id(subLessonId);
      if (!subLesson || subLesson.type !== "quiz") {
        return res.status(404).json({ msg: "الكويز الفرعي غير موجود" });
      }
      
      quizData = subLesson.quiz;
      lessonName = subLesson.name || subLesson.quiz?.title || "";
      
    } else {
      // كويز رئيسي
      lesson = await Lesson.findOne({
        _id: req.params.id,
        type: "quiz"
      })
      .populate("course", "name");
      
      if (!lesson) {
        return res.status(404).json({ msg: "الكويز غير موجود" });
      }
      
      // التحقق إذا كان المستخدم هو المدرس المالك
      isTeacherOwner = userInfo.role === "teacher" && 
        lesson.teacher.toString() === userInfo.user._id.toString();
      
      quizData = lesson.quiz;
      lessonName = lesson.name || lesson.quiz?.title || "";
    }
    
    if (!quizData) {
      return res.status(400).json({ msg: "بيانات الكويز غير صحيحة" });
    }
    
    // ⭐ التحقق من المحاولات للطلاب
    const now = new Date();
    const deadline = quizData.deadline ? new Date(quizData.deadline) : null;
    const isDeadlinePassed = deadline && now > deadline;
    
    let canTakeQuiz = true;
    let remainingAttempts = 0;
    
    if (userInfo.role === "student") {
      const previousAttempts = await Result.countDocuments({
        student: userInfo.user._id,
        lesson: req.params.id,
        ...(isSubLesson === "true" && subLessonId ? { 
          isSubLesson: true, 
          subLessonId 
        } : { isSubLesson: false })
      });
      
      const attemptsAllowed = quizData.attemptsAllowed || 1;
      remainingAttempts = attemptsAllowed === 0 ? Infinity : Math.max(0, attemptsAllowed - previousAttempts);
      
      canTakeQuiz = remainingAttempts > 0 && 
                   quizData.isActive !== false && 
                   !(deadline && isDeadlinePassed);
      
      console.log(`Student ${userInfo.user._id} - Attempts: ${previousAttempts}/${attemptsAllowed}, Can take: ${canTakeQuiz}`);
    }
    
    // ⭐ تنظيف الأسئلة بناءً على دور المستخدم
    let questions;
    let showAnswers = false;
    
    if (userInfo.role === "teacher" && isTeacherOwner) {
      // للمعلم المالك: عرض كل شيء
      questions = cleanQuestionsData(quizData.questions || []);
    } else {
      // تحديد ما إذا كان يجب عرض الإجابات
      switch (quizData.showAnswersAfter) {
        case "immediately":
          showAnswers = true;
          break;
        case "after-submission":
          showAnswers = false; // سيتم عرضها بعد التسليم
          break;
        case "after-deadline":
          showAnswers = isDeadlinePassed;
          break;
        case "never":
          showAnswers = false;
          break;
        default:
          showAnswers = false;
      }
      
      // للطلاب أو المعلمين الآخرين: إخفاء البيانات الحساسة
      questions = filterQuestionsForStudent(quizData.questions || [], showAnswers);
    }
    
    console.log(`Returning ${questions.length} questions for ${userInfo.role}, showAnswers: ${showAnswers}`);
    
    // ⭐ تحضير البيانات الأساسية المشتركة مع ALL الحقول
    const baseData = {
      _id: lesson._id,
      subLessonId: isSubLesson === "true" ? subLessonId : null,
      title: quizData.title || lessonName || "",
      description: quizData.description || "",
      lessonName: lessonName,
      course: lesson.course,
      isSubLesson: isSubLesson === "true",
      duration: quizData.duration || 30,
      totalMarks: quizData.totalMarks || 100,
      passingMarks: quizData.passingMarks || 50,
      questions: questions,
      attemptsAllowed: quizData.attemptsAllowed || 1,
      showAnswersAfter: quizData.showAnswersAfter || "after-submission",
      deadline: quizData.deadline || null,
      isActive: quizData.isActive !== false,
      canTakeQuiz: canTakeQuiz,
      remainingAttempts: remainingAttempts,
      showAnswers: showAnswers
    };
    
    // ⭐ إضافة بيانات إضافية للمعلم المالك فقط
    if (userInfo.role === "teacher" && isTeacherOwner) {
      const teacherData = {
        ...baseData,
        teacher: lesson.teacher,
        // إحصائيات للمعلم
        stats: {
          totalAttempts: await Result.countDocuments({
            lesson: req.params.id,
            ...(isSubLesson === "true" && subLessonId ? { 
              isSubLesson: true, 
              subLessonId 
            } : { isSubLesson: false })
          }),
          averageScore: await calculateAverageScore(req.params.id, 
            isSubLesson === "true", subLessonId),
          totalStudents: await countUniqueStudents(req.params.id,
            isSubLesson === "true", subLessonId)
        }
      };
      
      res.json(teacherData);
    } else {
      // ⭐ للطلاب: إضافة محاولاتهم السابقة
      const studentData = {
        ...baseData,
        myAttempts: await getMyAttempts(userInfo.user._id, req.params.id,
          isSubLesson === "true", subLessonId)
      };
      
      res.json(studentData);
    }
    
  } catch (err) {
    console.error("Error in getQuizWithRoleBasedQuestions:", err);
    throw err;
  }
};

// إنشاء/تحديث كويز داخل درس
router.post("/", async (req, res) => {
  try {
    console.log("=== CREATE QUIZ REQUEST ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    const teacher = await verifyTeacher(token);

    if (!teacher) {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    const { course, name, free, quiz } = req.body;

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({ msg: "الكويز والأسئلة مطلوبة" });
    }

    console.log("Questions before cleaning:", quiz.questions);
    
    // تنظيف بيانات الأسئلة
    quiz.questions = cleanQuestionsData(quiz.questions);
    
    console.log("Questions after cleaning:", quiz.questions);

    // حساب مجموع الدرجات
    quiz.totalMarks = quiz.questions.reduce(
      (sum, q) => sum + (q.marks || 1),
      0
    );

    // ⭐ تعيين القيم الافتراضية لجميع الحقول
    quiz.attemptsAllowed = quiz.attemptsAllowed || 1;
    quiz.showAnswersAfter = quiz.showAnswersAfter || "after-submission";
    quiz.isActive = quiz.isActive !== false;
    
    // تحويل deadline إذا كان موجوداً
    if (quiz.deadline) {
      const deadlineDate = new Date(quiz.deadline);
      quiz.deadline = isNaN(deadlineDate.getTime()) ? null : deadlineDate;
    }

    console.log("Final quiz data to save:", {
      title: quiz.title,
      questionsCount: quiz.questions.length,
      totalMarks: quiz.totalMarks,
      attemptsAllowed: quiz.attemptsAllowed,
      showAnswersAfter: quiz.showAnswersAfter,
      isActive: quiz.isActive,
      deadline: quiz.deadline
    });

    const lesson = await Lesson.create({
      type: "quiz",
      name: name || quiz.title,
      time: quiz.duration || 0,
      free: free || false,
      course: Array.isArray(course) ? course : [course],
      teacher: teacher._id,
      quiz
    });

    console.log("Lesson created successfully:", lesson._id);

    res.status(201).json({
      msg: "تم إنشاء درس كويز جديد بنجاح ✅",
      lesson
    });

  } catch (err) {
    console.error("Error creating quiz:", err);
    res.status(500).json({ 
      msg: "خطأ أثناء إنشاء درس الكويز",
      error: err.message 
    });
  }
});

// إضافة كويز كدرس فرعي
router.post("/sublesson", async (req, res) => {
  try {
    console.log("=== CREATE SUBLESSON QUIZ REQUEST ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    const teacher = await verifyTeacher(token);

    if (!teacher) {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    const { lessonId, quiz } = req.body;

    if (!lessonId) {
      return res.status(400).json({ msg: "معرف الدرس مطلوب" });
    }

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({ msg: "بيانات الكويز غير مكتملة" });
    }

    const lesson = await Lesson.findOne({
      _id: lessonId,
      teacher: teacher._id
    });

    if (!lesson) {
      return res.status(404).json({ msg: "الدرس غير موجود أو لا تملك صلاحية التعديل" });
    }

    console.log("Questions before cleaning:", quiz.questions);
    
    // تنظيف بيانات الأسئلة
    quiz.questions = cleanQuestionsData(quiz.questions);
    
    console.log("Questions after cleaning:", quiz.questions);

    // حساب مجموع الدرجات
    quiz.totalMarks = quiz.questions.reduce(
      (sum, q) => sum + (q.marks || 1),
      0
    );

    // ⭐ تعيين القيم الافتراضية لجميع الحقول
    quiz.attemptsAllowed = quiz.attemptsAllowed || 1;
    quiz.showAnswersAfter = quiz.showAnswersAfter || "after-submission";
    quiz.isActive = quiz.isActive !== false;
    
    // تحويل deadline إذا كان موجوداً
    if (quiz.deadline) {
      const deadlineDate = new Date(quiz.deadline);
      quiz.deadline = isNaN(deadlineDate.getTime()) ? null : deadlineDate;
    }

    const newSubLesson = {
      name: quiz.title || "Quiz",
      type: "quiz",
      url: `quiz-${Date.now()}`,
      quiz,
      time: quiz.duration || 0,
      order: lesson.subLessons.length,
      active: true,
      free: false
    };

    console.log("New sublesson to add:", {
      name: newSubLesson.name,
      questionsCount: newSubLesson.quiz.questions.length,
      attemptsAllowed: newSubLesson.quiz.attemptsAllowed,
      showAnswersAfter: newSubLesson.quiz.showAnswersAfter
    });

    lesson.subLessons.push(newSubLesson);
    await lesson.save();

    const addedSubLesson = lesson.subLessons[lesson.subLessons.length - 1];

    res.status(201).json({
      msg: "تم إنشاء كويز كدرس فرعي بنجاح ✅",
      subLesson: addedSubLesson
    });

  } catch (err) {
    console.error("Error creating sublesson quiz:", err);
    res.status(500).json({
      msg: "خطأ أثناء إنشاء الكويز الفرعي",
      error: err.message
    });
  }
});

// جلب جميع كويزات المعلم
router.get("/", async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    const teacher = await verifyTeacher(token);
    
    if (!teacher) {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    // جلب الدروس التي تحتوي على كويزات (رئيسية أو فرعية)
    const lessons = await Lesson.find({
      teacher: teacher._id,
      $or: [
        { type: "quiz" },
        { "subLessons.type": "quiz" }
      ]
    })
    .populate("course", "name")
    .select("name type quiz subLessons course");

    // استخراج الكويزات من الدروس
    const quizzes = [];
    
    lessons.forEach(lesson => {
      // الكويزات الرئيسية
      if (lesson.type === "quiz" && lesson.quiz) {
        const cleanedQuestions = cleanQuestionsData(lesson.quiz.questions);
        
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
          attemptsAllowed: lesson.quiz.attemptsAllowed,
          showAnswersAfter: lesson.quiz.showAnswersAfter,
          deadline: lesson.quiz.deadline,
          questions: cleanedQuestions
        });
      }

      // الكويزات الفرعية
      if (lesson.subLessons) {
        lesson.subLessons.forEach((subLesson) => {
          if (subLesson.type === "quiz" && subLesson.quiz) {
            const cleanedQuestions = cleanQuestionsData(subLesson.quiz.questions);
            
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
              attemptsAllowed: subLesson.quiz.attemptsAllowed,
              showAnswersAfter: subLesson.quiz.showAnswersAfter,
              deadline: subLesson.quiz.deadline,
              questions: cleanedQuestions
            });
          }
        });
      }
    });

    console.log(`Returning ${quizzes.length} quizzes`);
    res.json(quizzes);
  } catch (err) {
    console.error("Error fetching quizzes:", err);
    res.status(500).json({ 
      msg: "خطأ أثناء جلب الكويزات",
      error: err.message 
    });
  }
});

// ⭐ جلب كويز محدد - النسخة المحسنة مع تصفية للطلاب
router.get("/:id", async (req, res) => {
  try {
    const { isSubLesson, subLessonId } = req.query;
    
    // استخدام الدالة المساعدة الجديدة
    await getQuizWithRoleBasedQuestions(req, res, isSubLesson, subLessonId);
    
  } catch (err) {
    console.error("Error fetching quiz:", err);
    res.status(500).json({ 
      msg: "خطأ أثناء جلب الكويز",
      error: err.message 
    });
  }
});

// ⭐ تحديث كويز (للمعلمين فقط) - النسخة المحسنة
router.put("/:id", async (req, res) => {
  try {
    console.log("=== UPDATE QUIZ REQUEST ===");
    console.log("Quiz ID:", req.params.id);
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    const teacher = await verifyTeacher(token);
    
    if (!teacher) {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    const { isSubLesson, subLessonId, ...quizData } = req.body;
    
    console.log("Update data received:", {
      isSubLesson,
      subLessonId,
      hasQuiz: !!quizData.quiz,
      questionsCount: quizData.quiz?.questions?.length || 0,
      attemptsAllowed: quizData.quiz?.attemptsAllowed,
      showAnswersAfter: quizData.quiz?.showAnswersAfter,
      deadline: quizData.quiz?.deadline
    });
    
    let lesson;
    if (isSubLesson && subLessonId) {
      // تحديث كويز فرعي
      lesson = await Lesson.findOne({
        _id: req.params.id,
        teacher: teacher._id
      });

      if (!lesson) {
        return res.status(404).json({ msg: "الدرس غير موجود" });
      }

      const subLesson = lesson.subLessons.id(subLessonId);
      if (!subLesson || subLesson.type !== "quiz") {
        return res.status(404).json({ msg: "الكويز الفرعي غير موجود" });
      }

      // تنظيف بيانات الأسئلة وتنسيقها بشكل صحيح
      if (quizData.quiz && quizData.quiz.questions) {
        console.log("Questions before cleaning:", quizData.quiz.questions);
        quizData.quiz.questions = cleanQuestionsData(quizData.quiz.questions);
        console.log("Questions after cleaning:", quizData.quiz.questions);
        
        quizData.quiz.totalMarks = quizData.quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      }

      // ⭐ استبدال الـ quiz بالكامل مع تحديث ALL الحقول
      if (quizData.quiz) {
        // ⭐ تحويل deadline إذا كان موجوداً
        let deadlineValue = null;
        if (quizData.quiz.deadline) {
          const deadlineDate = new Date(quizData.quiz.deadline);
          deadlineValue = isNaN(deadlineDate.getTime()) ? null : deadlineDate;
        }
        
        // إنشاء quiz object جديد
        const newQuiz = {
          title: quizData.quiz.title || subLesson.quiz.title || "",
          description: quizData.quiz.description || subLesson.quiz.description || "",
          duration: Number(quizData.quiz.duration) || subLesson.quiz.duration || 30,
          totalMarks: Number(quizData.quiz.totalMarks) || subLesson.quiz.totalMarks || 100,
          passingMarks: Number(quizData.quiz.passingMarks) || subLesson.quiz.passingMarks || 50,
          questions: quizData.quiz.questions || subLesson.quiz.questions || [],
          isActive: quizData.quiz.isActive !== undefined ? quizData.quiz.isActive : subLesson.quiz.isActive,
          attemptsAllowed: Number(quizData.quiz.attemptsAllowed) || subLesson.quiz.attemptsAllowed || 1,
          showAnswersAfter: quizData.quiz.showAnswersAfter || subLesson.quiz.showAnswersAfter || "after-submission",
          deadline: deadlineValue || subLesson.quiz.deadline || null
        };

        console.log("New quiz data for sublesson:", {
          title: newQuiz.title,
          questionsCount: newQuiz.questions.length,
          totalMarks: newQuiz.totalMarks,
          attemptsAllowed: newQuiz.attemptsAllowed,
          showAnswersAfter: newQuiz.showAnswersAfter,
          isActive: newQuiz.isActive,
          deadline: newQuiz.deadline
        });

        // استبدال الـ quiz بالكامل
        subLesson.quiz = newQuiz;
        
        // إخبار Mongoose بأن هناك تغييرات
        lesson.markModified(`subLessons.${lesson.subLessons.indexOf(subLesson)}.quiz`);
      }

      // تحديث اسم الـ sublesson إذا كان العنوان تغير
      if (quizData.quiz && quizData.quiz.title) {
        subLesson.name = quizData.quiz.title;
        lesson.markModified(`subLessons.${lesson.subLessons.indexOf(subLesson)}.name`);
      }

      // حفظ التغييرات
      await lesson.save();

      console.log("Sub-quiz updated successfully");

      res.json({
        msg: "تم تحديث الكويز الفرعي بنجاح ✨",
        quiz: subLesson.quiz
      });
    } else {
      // تحديث كويز رئيسي
      lesson = await Lesson.findOne({
        _id: req.params.id,
        teacher: teacher._id,
        type: "quiz"
      });

      if (!lesson) {
        return res.status(404).json({ msg: "الكويز غير موجود" });
      }

      // تنظيف بيانات الأسئلة وتنسيقها بشكل صحيح
      if (quizData.quiz && quizData.quiz.questions) {
        console.log("Questions before cleaning:", quizData.quiz.questions);
        quizData.quiz.questions = cleanQuestionsData(quizData.quiz.questions);
        console.log("Questions after cleaning:", quizData.quiz.questions);
        
        quizData.quiz.totalMarks = quizData.quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      }

      // ⭐ استبدال الـ quiz بالكامل مع تحديث ALL الحقول
      if (quizData.quiz) {
        // ⭐ تحويل deadline إذا كان موجوداً
        let deadlineValue = null;
        if (quizData.quiz.deadline) {
          const deadlineDate = new Date(quizData.quiz.deadline);
          deadlineValue = isNaN(deadlineDate.getTime()) ? null : deadlineDate;
        }
        
        // إنشاء quiz object جديد
        const newQuiz = {
          title: quizData.quiz.title || lesson.quiz.title || "",
          description: quizData.quiz.description || lesson.quiz.description || "",
          duration: Number(quizData.quiz.duration) || lesson.quiz.duration || 30,
          totalMarks: Number(quizData.quiz.totalMarks) || lesson.quiz.totalMarks || 100,
          passingMarks: Number(quizData.quiz.passingMarks) || lesson.quiz.passingMarks || 50,
          questions: quizData.quiz.questions || lesson.quiz.questions || [],
          isActive: quizData.quiz.isActive !== undefined ? quizData.quiz.isActive : lesson.quiz.isActive,
          attemptsAllowed: Number(quizData.quiz.attemptsAllowed) || lesson.quiz.attemptsAllowed || 1,
          showAnswersAfter: quizData.quiz.showAnswersAfter || lesson.quiz.showAnswersAfter || "after-submission",
          deadline: deadlineValue || lesson.quiz.deadline || null
        };

        console.log("New quiz data for main quiz:", {
          title: newQuiz.title,
          questionsCount: newQuiz.questions.length,
          totalMarks: newQuiz.totalMarks,
          attemptsAllowed: newQuiz.attemptsAllowed,
          showAnswersAfter: newQuiz.showAnswersAfter,
          isActive: newQuiz.isActive,
          deadline: newQuiz.deadline
        });

        // استبدال الـ quiz بالكامل
        lesson.quiz = newQuiz;
        
        // إخبار Mongoose بأن هناك تغييرات
        lesson.markModified('quiz');
      }

      // تحديث اسم الدرس إذا كان العنوان تغير
      if (quizData.quiz && quizData.quiz.title) {
        lesson.name = quizData.quiz.title;
      }

      // حفظ التغييرات
      await lesson.save();

      console.log("Main quiz updated successfully");

      res.json({
        msg: "تم تحديث الكويز بنجاح ✨",
        quiz: lesson.quiz
      });
    }
  } catch (err) {
    console.error("Error updating quiz:", err);
    res.status(500).json({ 
      msg: "خطأ أثناء تحديث الكويز",
      error: err.message 
    });
  }
});

// حذف كويز (للمعلمين فقط)
router.delete("/:id", async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    const teacher = await verifyTeacher(token);
    
    if (!teacher) {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    const { isSubLesson, subLessonId } = req.query;
    
    if (isSubLesson === "true" && subLessonId) {
      // حذف كويز فرعي
      const lesson = await Lesson.findOne({
        _id: req.params.id,
        teacher: teacher._id
      });

      if (!lesson) {
        return res.status(404).json({ msg: "الدرس غير موجود" });
      }

      lesson.subLessons = lesson.subLessons.filter(
        sub => !(sub._id.toString() === subLessonId && sub.type === "quiz")
      );

      await lesson.save();

      res.json({ msg: "تم حذف الكويز الفرعي بنجاح 🗑️" });
    } else {
      // حذف كويز رئيسي (تحويل النوع)
      const lesson = await Lesson.findOne({
        _id: req.params.id,
        teacher: teacher._id
      });

      if (!lesson) {
        return res.status(404).json({ msg: "الكويز غير موجود" });
      }

      lesson.type = "section"; // تحويل إلى قسم عادي
      lesson.quiz = undefined;
      await lesson.save();

      res.json({ msg: "تم حذف الكويز بنجاح 🗑️" });
    }
  } catch (err) {
    console.error("Error deleting quiz:", err);
    res.status(500).json({ 
      msg: "خطأ أثناء حذف الكويز",
      error: err.message 
    });
  }
});

// ⭐ تقديم إجابات الكويز (للطلاب فقط) - النسخة المحسنة والمصححة
router.post("/submit", async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ msg: "يرجى تسجيل الدخول" });

    const decoded = jwt.verify(token, process.env.secretJwt);
    const student = await User.findById(decoded.id || decoded._id);
    
 

    const { lessonId, answers, timeSpent, isSubLesson, subLessonId } = req.body;

    console.log("Quiz submission data:", {
      studentId: student._id,
      lessonId,
      isSubLesson,
      subLessonId,
      answersCount: answers?.length || 0
    });

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ msg: "الدرس غير موجود" });
    }

    // تحديد مصدر الكويز
    let quizData, quizSource;
    if (isSubLesson && subLessonId) {
      const subLesson = lesson.subLessons.id(subLessonId);
      if (!subLesson || subLesson.type !== "quiz") {
        return res.status(404).json({ msg: "الكويز الفرعي غير موجود" });
      }
      quizData = subLesson.quiz;
      quizSource = "sublesson";
    } else {
      if (lesson.type !== "quiz") {
        return res.status(400).json({ msg: "هذا الدرس ليس كويز" });
      }
      quizData = lesson.quiz;
      quizSource = "main";
    }

    if (!quizData || !quizData.questions) {
      return res.status(400).json({ msg: "بيانات الكويز غير صحيحة" });
    }

    // التحقق من أن الاختبار مفعل
    if (quizData.isActive === false) {
      return res.status(400).json({ msg: "الاختبار غير مفعل حالياً" });
    }

    // التحقق من موعد انتهاء الاختبار
    const now = new Date();
    const deadline = quizData.deadline ? new Date(quizData.deadline) : null;
    if (deadline && now > deadline) {
      return res.status(400).json({ msg: "انتهى موعد الاختبار" });
    }

    // ⭐ التحقق من عدد المحاولات
    const previousAttempts = await Result.countDocuments({
      student: student._id,
      lesson: lessonId,
      ...(isSubLesson && subLessonId ? { 
        isSubLesson: true, 
        subLessonId 
      } : { isSubLesson: false })
    });

    console.log(`Student ${student._id} has ${previousAttempts} previous attempts`);

    const attemptsAllowed = quizData.attemptsAllowed || 1;
    
    // إذا كان attemptsAllowed = 0 يعني غير محدود - السماح دائماً
    if (attemptsAllowed > 0 && previousAttempts >= attemptsAllowed) {
      return res.status(400).json({ 
        msg: `لقد استنفذت جميع محاولاتك (${attemptsAllowed})`,
        attemptsAllowed,
        previousAttempts
      });
    }

    // تنظيف أسئلة الكويز
    const cleanedQuestions = cleanQuestionsData(quizData.questions);
    quizData.questions = cleanedQuestions;

    // ⭐ تصحيح الإجابات بشكل محسن
    let score = 0;
    let correctAnswersCount = 0;
    const correctedAnswers = answers.map((answer, index) => {
      const question = quizData.questions[index];
      let isCorrect = false;
      let marks = 0;
      let correctAnswer = "";
      let studentAnswer = "";

      if (!question) {
        return {
          questionIndex: index,
          selectedAnswer: answer.selectedAnswer || "",
          isCorrect: false,
          marks: 0,
          correctAnswer: "سؤال غير موجود",
          questionText: "سؤال غير موجود",
          questionType: "unknown"
        };
      }

      if (answer.selectedAnswer !== null && answer.selectedAnswer !== undefined) {
        studentAnswer = answer.selectedAnswer.toString().trim();
        
        if (question.type === "multiple-choice" || question.type === "true-false") {
          correctAnswer = question.correctAnswer ? question.correctAnswer.toString().trim() : "";
          isCorrect = studentAnswer === correctAnswer;
          marks = isCorrect ? (question.marks || 1) : 0;
          if (isCorrect) {
            score += marks;
            correctAnswersCount++;
          }
        } else if (question.type === "short-answer") {
          // ⭐ لأسئلة الإجابة القصيرة: تحقق من التطابق الجزئي
          correctAnswer = question.correctAnswer ? question.correctAnswer.toString().trim().toLowerCase() : "";
          const studentAnswerLower = studentAnswer.toLowerCase();
          
          // تطابق جزئي
          isCorrect = studentAnswerLower.includes(correctAnswer) || correctAnswer.includes(studentAnswerLower);
          marks = isCorrect ? (question.marks || 1) : 0;
          if (isCorrect) {
            score += marks;
            correctAnswersCount++;
          }
        } else {
          // الأسئلة المقالية
          marks = 0;
          isCorrect = false;
          correctAnswer = question.correctAnswer || "سيتم التصحيح يدوياً";
        }
      }

      return {
        questionIndex: index,
        selectedAnswer: studentAnswer,
        isCorrect,
        marks,
        correctAnswer,
        questionText: question.question,
        questionType: question.type
      };
    });

    // حساب النسبة المئوية
    const totalMarks = quizData.totalMarks || cleanedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const passingMarks = quizData.passingMarks || Math.floor(totalMarks * 0.5);
    const passed = score >= passingMarks;
    const percentage = ((score / totalMarks) * 100).toFixed(1);

    // ⭐ حفظ النتيجة
    const result = await Result.create({
      student: student._id,
      lesson: lessonId,
      isSubLesson: isSubLesson || false,
      subLessonId: isSubLesson ? subLessonId : null,
      answers: correctedAnswers,
      score,
      totalMarks,
      passingMarks,
      passed,
      correctAnswersCount,
      attemptNumber: previousAttempts + 1,
      timeSpent: timeSpent || 0,
      percentage: percentage,
      status: "graded",
      submittedAt: new Date(),
      quizTitle: quizData.title,
      lessonName: lesson.name,
      ...(isSubLesson && { subLessonName: lesson.subLessons.id(subLessonId)?.name })
    });

    console.log(`Result saved: ${result._id}, Score: ${score}/${totalMarks}`);

    // ⭐ تحديد ما إذا كان يجب عرض الإجابات الصحيحة
    let showCorrectAnswers = false;
    let showExplanation = false;
    
    switch (quizData.showAnswersAfter) {
      case "immediately":
        showCorrectAnswers = true;
        showExplanation = true;
        break;
      case "after-submission":
        showCorrectAnswers = true;
        showExplanation = true;
        break;
      case "after-deadline":
        showCorrectAnswers = deadline && now > deadline;
        showExplanation = showCorrectAnswers;
        break;
      case "never":
      default:
        showCorrectAnswers = false;
        showExplanation = false;
    }

    // ⭐ تحضير البيانات للاستجابة
    const responseData = {
      msg: "تم تسليم الكويز بنجاح ✅",
      result: {
        id: result._id,
        score: result.score,
        totalMarks: result.totalMarks,
        passingMarks: result.passingMarks,
        passed: result.passed,
        correctAnswersCount: result.correctAnswersCount,
        attemptNumber: result.attemptNumber,
        timeSpent: result.timeSpent,
        percentage: result.percentage,
        status: result.status,
        showCorrectAnswers: showCorrectAnswers,
        showExplanation: showExplanation,
        remainingAttempts: attemptsAllowed === 0 ? Infinity : Math.max(0, attemptsAllowed - result.attemptNumber),
        totalQuestions: correctedAnswers.length,
        submittedAt: result.submittedAt,
        quizTitle: quizData.title,
        lessonName: lesson.name
      }
    };

    // ⭐ إضافة الإجابات الصحيحة إذا كان مسموحاً
    if (showCorrectAnswers) {
      responseData.correctAnswers = correctedAnswers.map(ans => ({
        questionIndex: ans.questionIndex,
        correctAnswer: ans.correctAnswer,
        isCorrect: ans.isCorrect,
        marks: ans.marks,
        questionText: ans.questionText
      }));
    }

    // ⭐ إضافة الأسئلة مع التفسير إذا كان مسموحاً
    if (showExplanation) {
      responseData.questions = cleanedQuestions.map((q, index) => ({
        index,
        question: q.question,
        type: q.type,
        explanation: q.explanation || "",
        correctAnswer: q.correctAnswer || ""
      }));
    }

    res.status(201).json(responseData);
    
  } catch (err) {
    console.error("Error submitting quiz:", err);
    res.status(500).json({ 
      msg: "خطأ أثناء تسليم الكويز",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// ⭐ جلب نتائج كويز محدد (للمعلم المالك فقط)
router.get("/results/:id", async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    const teacher = await verifyTeacher(token);
    
    if (!teacher) {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    const { isSubLesson, subLessonId } = req.query;
    
    // التحقق من أن المعلم هو مالك الدرس
    const lesson = await Lesson.findOne({
      _id: req.params.id,
      teacher: teacher._id
    });

    if (!lesson) {
      return res.status(403).json({ msg: "ليس لديك صلاحية لمشاهدة نتائج هذا الاختبار" });
    }

    const results = await Result.find({
      lesson: req.params.id,
      ...(isSubLesson && subLessonId ? { isSubLesson: true, subLessonId } : { isSubLesson: false })
    })
    .populate("student", "name email")
    .sort({ submittedAt: -1 });

    res.json(results);
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ 
      msg: "خطأ أثناء جلب النتائج",
      error: err.message 
    });
  }
});

// ⭐ جلب نتائج الطالب الخاصة به فقط
router.get("/my-results/:id", async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ msg: "يرجى تسجيل الدخول" });

    const decoded = jwt.verify(token, process.env.secretJwt);
    const user = await User.findById(decoded.id || decoded._id);
    
    if (!user || user.role !== "student") {
      return res.status(403).json({ msg: "هذه الخدمة للطلاب فقط" });
    }

    const { isSubLesson, subLessonId } = req.query;
    
    const results = await Result.find({
      student: user._id,
      lesson: req.params.id,
      ...(isSubLesson === "true" && subLessonId ? { 
        isSubLesson: true, 
        subLessonId 
      } : { isSubLesson: false })
    })
    .sort({ submittedAt: -1 })
    .lean();

    // ⭐ إخفاء الإجابات الصحيحة بناءً على إعدادات الاختبار
    let lesson, quizData;
    
    if (isSubLesson === "true" && subLessonId) {
      lesson = await Lesson.findById(req.params.id);
      if (lesson) {
        const subLesson = lesson.subLessons.id(subLessonId);
        if (subLesson && subLesson.quiz) {
          quizData = subLesson.quiz;
        }
      }
    } else {
      lesson = await Lesson.findById(req.params.id);
      if (lesson && lesson.quiz) {
        quizData = lesson.quiz;
      }
    }
    
    const showAnswers = quizData ? 
      (quizData.showAnswersAfter === "after-submission" || 
       quizData.showAnswersAfter === "after-deadline") : 
      true;
    
    // إخفاء الإجابات إذا كان الطالب لا يجب أن يراها
    if (!showAnswers) {
      results.forEach(result => {
        if (result.answers) {
          result.answers = result.answers.map(answer => ({
            questionIndex: answer.questionIndex,
            selectedAnswer: answer.selectedAnswer,
            isCorrect: answer.isCorrect,
            marks: answer.marks
          }));
        }
      });
    }

    res.json({
      results: results,
      showAnswers: showAnswers,
      totalAttempts: results.length,
      bestScore: results.length > 0 ? 
        Math.max(...results.map(r => r.score)) : 0
    });
    
  } catch (err) {
    console.error("Error fetching student results:", err);
    res.status(500).json({ 
      msg: "خطأ أثناء جلب النتائج",
      error: err.message 
    });
  }
});

// ⭐ تصدير نتائج كويز إلى Excel (للمعلم المالك فقط)
router.get("/export/:id", async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    const teacher = await verifyTeacher(token);
    
    if (!teacher) {
      return res.status(403).json({ msg: "غير مصرح لك" });
    }

    const { isSubLesson, subLessonId } = req.query;
    
    // التحقق من أن المعلم هو مالك الدرس
    const lesson = await Lesson.findOne({
      _id: req.params.id,
      teacher: teacher._id
    });

    if (!lesson) {
      return res.status(403).json({ msg: "ليس لديك صلاحية لتصدير نتائج هذا الاختبار" });
    }

    const results = await Result.find({
      lesson: req.params.id,
      ...(isSubLesson && subLessonId ? { isSubLesson: true, subLessonId } : { isSubLesson: false })
    })
    .populate("student", "name email")
    .populate("lesson")
    .sort({ submittedAt: -1 });

    if (results.length === 0) {
      return res.status(404).json({ msg: "لا توجد نتائج للتصدير" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('نتائج الاختبار');

    // إضافة العناوين
    worksheet.columns = [
      { header: 'الطالب', key: 'student', width: 30 },
      { header: 'البريد الإلكتروني', key: 'email', width: 30 },
      { header: 'الدرجة', key: 'score', width: 15 },
      { header: 'الدرجة الكلية', key: 'totalMarks', width: 15 },
      { header: 'النسبة المئوية', key: 'percentage', width: 15 },
      { header: 'حالة النجاح', key: 'passed', width: 15 },
      { header: 'رقم المحاولة', key: 'attemptNumber', width: 15 },
      { header: 'الوقت المستغرق (ثانية)', key: 'timeSpent', width: 20 },
      { header: 'تاريخ التسليم', key: 'submittedAt', width: 25 }
    ];

    // إضافة البيانات
    results.forEach(result => {
      worksheet.addRow({
        student: result.student?.name || 'غير معروف',
        email: result.student?.email || 'غير معروف',
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: ((result.score / result.totalMarks) * 100).toFixed(1) + '%',
        passed: result.passed ? 'ناجح' : 'راسب',
        attemptNumber: result.attemptNumber,
        timeSpent: result.timeSpent,
        submittedAt: result.submittedAt.toLocaleString('ar-SA')
      });
    });

    // إضافة صيغة للعناوين
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: 'center' };

    // إعداد الاستجابة
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=quiz-results-${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exporting results:", err);
    res.status(500).json({ 
      msg: "خطأ أثناء تصدير النتائج",
      error: err.message 
    });
  }
});

module.exports = router;