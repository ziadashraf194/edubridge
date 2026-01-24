import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// دالة مساعدة لضمان أن الـ options تكون مصفوفة دائماً
const ensureArray = (options) => {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') return [options];
  return [];
};

// ⭐ دالة محسنة لتنسيق سؤال واحد للباكند
const formatSingleQuestion = (question, index) => {
  console.log(`Formatting question ${index}:`, question);
  
  // التحقق من البيانات الأساسية
  if (!question) {
    console.error("Question is null or undefined");
    throw new Error(`السؤال رقم ${index + 1} غير موجود`);
  }

  // ⭐ تأكد من وجود نص السؤال
  const questionText = question.question || question.text || `سؤال ${index + 1}`;
  
  const formatted = {
    type: question.type || "multiple-choice",
    question: questionText.trim(),
    marks: Number(question.marks) || 1,
    explanation: question.explanation ? question.explanation.trim() : "",
    order: index + 1
  };

  console.log(`Question ${index} type: ${formatted.type}`);

  // ⭐ معالجة الخيارات حسب نوع السؤال
  if (formatted.type === "multiple-choice") {
    const validOptions = ensureArray(question.options).filter(opt => opt && opt.trim());
    
    if (validOptions.length < 2) {
      throw new Error(`السؤال رقم ${index + 1}: يجب أن يحتوي على خيارين على الأقل`);
    }
    
    formatted.options = validOptions;
    formatted.correctAnswer = question.correctAnswer ? question.correctAnswer.trim() : "";
    
    if (!formatted.correctAnswer || !validOptions.includes(formatted.correctAnswer)) {
      throw new Error(`السؤال رقم ${index + 1}: يجب تحديد إجابة صحيحة من الخيارات المتاحة`);
    }
  } else if (formatted.type === "true-false") {
    // ⭐ لسؤال true/false: options فارغة، correctAnswer هو "true" أو "false"
    formatted.options = [];
    
    const correctAnswer = question.correctAnswer || "";
    formatted.correctAnswer = correctAnswer.toString().toLowerCase();
    
    if (!["true", "false"].includes(formatted.correctAnswer)) {
      throw new Error(`السؤال رقم ${index + 1}: يجب تحديد إجابة صحيحة (صح أو خطأ)`);
    }
    
    console.log(`True/False question ${index}: correctAnswer = ${formatted.correctAnswer}`);
  } else {
    // ⭐ essay أو short-answer
    formatted.options = [];
    formatted.correctAnswer = question.correctAnswer ? question.correctAnswer.trim() : "";
  }

  console.log(`Formatted question ${index}:`, formatted);
  return formatted;
};

// تنسيق جميع الأسئلة للباكند
const formatQuestionsForBackend = (questions) => {
  console.log("Formatting all questions for backend:", questions);
  
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("يجب إضافة سؤال واحد على الأقل");
  }

  try {
    const formatted = questions.map((q, index) => formatSingleQuestion(q, index));
    console.log("Formatted questions for backend:", formatted);
    return formatted;
  } catch (error) {
    console.error("Error formatting questions:", error);
    throw error;
  }
};

// ⭐ دالة جديدة محسنة لتحميل الأسئلة من الباكند
const formatQuestionsFromBackend = (questions) => {
  if (!questions || !Array.isArray(questions)) {
    console.warn("No questions to format from backend");
    return [];
  }
  
  console.log("=== FORMATTING QUESTIONS FROM BACKEND ===");
  console.log("Raw questions:", questions);
  
  const formatted = questions.map((q, idx) => {
    console.log(`Processing question ${idx}:`, q);
    
    // ⭐ البحث عن نص السؤال في جميع المواقع المحتملة
    let questionText = "";
    
    if (q.question && q.question.trim()) {
      questionText = q.question;
    } else if (q.text && q.text.trim()) {
      questionText = q.text;
    } else if (q.name && q.name.trim()) {
      questionText = q.name;
    } else if (q.title && q.title.trim()) {
      questionText = q.title;
    } else {
      questionText = `سؤال ${idx + 1}`;
      console.warn(`Question ${idx} has no text, using default`);
    }
    
    // ⭐ تحديد النوع
    let questionType = q.type || "multiple-choice";
    const validTypes = ["multiple-choice", "true-false", "short-answer", "essay"];
    if (!validTypes.includes(questionType)) {
      questionType = "multiple-choice";
    }
    
    // ⭐ معالجة الخيارات
    let questionOptions = [];
    if (questionType === "multiple-choice") {
      questionOptions = ensureArray(q.options);
    }
    
    // ⭐ معالجة الإجابة الصحيحة
    let correctAnswer = q.correctAnswer || "";
    if (questionType === "true-false") {
      const answer = correctAnswer.toString().toLowerCase();
      correctAnswer = (answer === "true" || answer === "false") ? answer : "true";
    }
    
    const formattedQuestion = {
      id: q._id || q.id || `question-${idx}-${Date.now()}`,
      type: questionType,
      question: questionText,
      marks: Number(q.marks) || 1,
      options: questionOptions,
      correctAnswer: correctAnswer,
      explanation: q.explanation || "",
      order: q.order || idx + 1
    };
    
    console.log(`Formatted question ${idx}:`, formattedQuestion);
    return formattedQuestion;
  });
  
  console.log("All formatted questions:", formatted);
  return formatted;
};

// ⭐ دالة مساعدة للتحقق من صحة السؤال
const validateQuestion = (question) => {
  const errors = [];

  if (!question.question || !question.question.trim()) {
    errors.push("نص السؤال مطلوب");
  }

  if (!question.type) {
    errors.push("نوع السؤال مطلوب");
  }

  const validTypes = ["multiple-choice", "true-false", "short-answer", "essay"];
  if (!validTypes.includes(question.type)) {
    errors.push("نوع السؤال غير صالح");
  }

  if (question.type === "multiple-choice") {
    const validOptions = ensureArray(question.options).filter(opt => opt && opt.trim());
    
    if (validOptions.length < 2) {
      errors.push("يجب إضافة خيارين على الأقل");
    }
    
    if (!question.correctAnswer || !question.correctAnswer.trim()) {
      errors.push("يجب تحديد الإجابة الصحيحة");
    } else if (!validOptions.includes(question.correctAnswer)) {
      errors.push("الإجابة الصحيحة يجب أن تكون من ضمن الخيارات");
    }
  }

  if (question.type === "true-false") {
    const correctAnswer = question.correctAnswer ? question.correctAnswer.toString().toLowerCase() : "";
    if (!["true", "false"].includes(correctAnswer)) {
      errors.push("يجب تحديد الإجابة الصحيحة (صح أو خطأ)");
    }
  }

  if (!question.marks || question.marks < 1) {
    errors.push("درجة السؤال يجب أن تكون 1 على الأقل");
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// التحقق من صحة جميع الأسئلة
const validateAllQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return {
      valid: false,
      errors: ["يجب إضافة سؤال واحد على الأقل"]
    };
  }

  const allErrors = [];
  
  questions.forEach((q, idx) => {
    const validation = validateQuestion(q);
    if (!validation.valid) {
      allErrors.push(`السؤال ${idx + 1}: ${validation.errors.join(", ")}`);
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
};

// مكون سحب وإفلات للسؤال
const SortableQuestionItem = ({ question, index, onUpdate, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginBottom: "15px",
    background: isDragging ? "#fef3c7" : "white",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "15px",
    boxShadow: isDragging ? "0 5px 15px rgba(0,0,0,0.1)" : "none",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "grab" }} {...attributes} {...listeners}>
          <div style={{
            width: "30px",
            height: "30px",
            background: "#667eea",
            color: "white",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "600",
          }}>
            {index + 1}
          </div>
          <span style={{
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "600",
            background: question.type === "multiple-choice" ? "#fef3c7" : 
                       question.type === "true-false" ? "#dbeafe" : 
                       question.type === "short-answer" ? "#dcfce7" : 
                       "#f3f4f6",
            color: question.type === "multiple-choice" ? "#92400e" : 
                   question.type === "true-false" ? "#1e40af" : 
                   question.type === "short-answer" ? "#166534" : 
                   "#374151",
          }}>
            {question.type === "multiple-choice" ? "اختيار متعدد" :
             question.type === "true-false" ? "صح/خطأ" :
             question.type === "short-answer" ? "إجابة قصيرة" : "مقال"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          <button
            type="button"
            onClick={() => onDelete(index)}
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              border: "none",
              padding: "6px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <textarea
          value={question.question}
          onChange={(e) => onUpdate(index, 'question', e.target.value)}
          placeholder="نص السؤال"
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "14px",
            minHeight: "60px",
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "12px", color: "#6b7280" }}>الدرجة</label>
          <input
            type="number"
            min="1"
            value={question.marks}
            onChange={(e) => onUpdate(index, 'marks', parseInt(e.target.value) || 1)}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
        </div>
        <div style={{ flex: 3 }}>
          <label style={{ fontSize: "12px", color: "#6b7280" }}>الشرح (اختياري)</label>
          <input
            type="text"
            value={question.explanation || ""}
            onChange={(e) => onUpdate(index, 'explanation', e.target.value)}
            placeholder="شرح الإجابة الصحيحة"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
            }}
          />
        </div>
      </div>

      {/* عرض الخيارات بناءً على نوع السؤال */}
      {question.type === "multiple-choice" && (
        <div style={{ marginTop: "10px" }}>
          <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px", display: "block" }}>
            الخيارات:
          </label>
          {ensureArray(question.options).map((option, optIndex) => (
            <div key={optIndex} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" }}>
              <input
                type="radio"
                name={`correctAnswer-${index}`}
                checked={question.correctAnswer === option}
                onChange={() => onUpdate(index, 'correctAnswer', option)}
                style={{ cursor: "pointer" }}
              />
              <input
                type="text"
                value={option}
                onChange={(e) => {
                  const newOptions = [...ensureArray(question.options)];
                  newOptions[optIndex] = e.target.value;
                  onUpdate(index, 'options', newOptions);
                }}
                placeholder={`الخيار ${optIndex + 1}`}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  background: question.correctAnswer === option ? "#f0f9ff" : "white",
                  borderColor: question.correctAnswer === option ? "#0ea5e9" : "#e5e7eb",
                }}
              />
              {question.correctAnswer === option && (
                <span style={{ color: "#10b981", fontSize: "12px" }}>
                  <i className="fas fa-check-circle"></i> صحيحة
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {question.type === "true-false" && (
        <div style={{ marginTop: "10px" }}>
          <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px", display: "block" }}>
            الإجابة الصحيحة:
          </label>
          <div style={{ display: "flex", gap: "15px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
              <input
                type="radio"
                name={`trueFalse-${index}`}
                value="true"
                checked={question.correctAnswer === "true"}
                onChange={(e) => onUpdate(index, 'correctAnswer', e.target.value)}
              />
              <span style={{ fontWeight: question.correctAnswer === "true" ? "600" : "400" }}>صح</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
              <input
                type="radio"
                name={`trueFalse-${index}`}
                value="false"
                checked={question.correctAnswer === "false"}
                onChange={(e) => onUpdate(index, 'correctAnswer', e.target.value)}
              />
              <span style={{ fontWeight: question.correctAnswer === "false" ? "600" : "400" }}>خطأ</span>
            </label>
          </div>
        </div>
      )}

      {(question.type === "short-answer" || question.type === "essay") && (
        <div style={{ marginTop: "10px" }}>
          <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px", display: "block" }}>
            الإجابة النموذجية:
          </label>
          <textarea
            value={question.correctAnswer || ""}
            onChange={(e) => onUpdate(index, 'correctAnswer', e.target.value)}
            placeholder={question.type === "short-answer" ? "الإجابة القصيرة النموذجية" : "النموذج المقترح للإجابة"}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              minHeight: "80px",
              fontSize: "14px",
              resize: "vertical",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default function QuizManagement() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [parentLessons, setParentLessons] = useState([]);
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // بيانات الاختبار الجديد
  const [newExam, setNewExam] = useState({
    title: "",
    description: "",
    duration: 60,
    passingMarks: 50,
    isActive: true,
    questions: [],
    selectedCourse: "",
    selectedParentLesson: "",
    isSubLesson: false,
    attemptsAllowed: 1,
    showAnswersAfter: "after-submission",
    deadline: ""
  });

  // بيانات السؤال الجديد
  const [newQuestion, setNewQuestion] = useState({
    type: "multiple-choice", 
    question: "",
    marks: 5,
    options: ["", ""],
    correctAnswer: "",
    explanation: ""
  });

  // إعدادات السحب والإفلات
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchQuizzes();
    fetchCourses();
    fetchParentLessons();
  }, []);

  // تحديث عدد الأسئلة عند التغيير
  useEffect(() => {
    setTotalQuestions(newExam.questions.length);
  }, [newExam.questions]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5001/quiz", {
        withCredentials: true,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log("Fetched quizzes:", response.data);
      
      // ⭐ تحسين معالجة البيانات المستلمة مع تأكيد جميع الحقول
      const processedExams = response.data.map(exam => {
        // التأكد من أن attemptsAllowed و showAnswersAfter موجودة
        const attempts = exam.attemptsAllowed || exam.quiz?.attemptsAllowed || 1;
        const showAnswers = exam.showAnswersAfter || exam.quiz?.showAnswersAfter || "after-submission";
        
        return {
          _id: exam._id,
          subLessonId: exam.subLessonId || null,
          title: exam.title || exam.quiz?.title || "بدون عنوان",
          description: exam.description || exam.quiz?.description || "",
          lessonName: exam.lessonName || "",
          subLessonName: exam.subLessonName || "",
          course: exam.course || null,
          isSubLesson: exam.isSubLesson || false,
          duration: exam.duration || exam.quiz?.duration || 60,
          totalMarks: exam.totalMarks || exam.quiz?.totalMarks || 0,
          passingMarks: exam.passingMarks || exam.quiz?.passingMarks || 50,
          questions: exam.questions || exam.quiz?.questions || [],
          isActive: exam.isActive !== false,
          attemptsAllowed: attempts,
          showAnswersAfter: showAnswers,
          deadline: exam.deadline || exam.quiz?.deadline || null,
          quiz: exam.quiz || {}
        };
      });
      
      console.log("Processed exams:", processedExams);
      setExams(processedExams);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      alert("حدث خطأ أثناء جلب الاختبارات");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get("http://localhost:5001/course/names", {
        withCredentials: true,
      });
      setCourses(response.data);
    } catch (err) {
      console.error("Error fetching courses:", err);
    }
  };

  const fetchParentLessons = async () => {
    try {
      const response = await axios.get("http://localhost:5001/lesson/dashbord/", {
        withCredentials: true,
      });
      const filteredLessons = response.data.filter(lesson => 
        lesson.type === "section" && lesson.active === true
      );
      setParentLessons(filteredLessons);
    } catch (err) {
      console.error("Error fetching parent lessons:", err);
    }
  };

  // إضافة خيار جديد للاختيار من متعدد
  const addOption = () => {
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, ""]
    });
  };

  // حذف خيار
  const removeOption = (index) => {
    const newOptions = [...newQuestion.options];
    newOptions.splice(index, 1);
    setNewQuestion({
      ...newQuestion,
      options: newOptions,
      // إذا كانت الإجابة الصحيحة هي الخيار المحذوف، قم بإزالتها
      correctAnswer: newQuestion.correctAnswer === newQuestion.options[index] ? "" : newQuestion.correctAnswer
    });
  };

  // ⭐ تحديث بيانات السؤال
  const handleUpdateQuestion = (index, field, value) => {
    const updatedQuestions = [...newExam.questions];
    const currentQuestion = updatedQuestions[index];
    
    console.log(`Updating question ${index}, field: ${field}, value:`, value);
    
    let updatedQuestion = { ...currentQuestion };
    
    if (field === 'options') {
      updatedQuestion.options = ensureArray(value);
    } else if (field === 'type') {
      // ⭐ عند تغيير النوع، أعد ضبط البيانات
      updatedQuestion.type = value;
      
      if (value === "true-false") {
        // لسؤال true/false: options فارغة
        updatedQuestion.options = [];
        // احتفظ بـ correctAnswer إذا كان true/false
        if (!["true", "false"].includes(updatedQuestion.correctAnswer)) {
          updatedQuestion.correctAnswer = "true";
        }
      } else if (value === "multiple-choice") {
        // لسؤال multiple-choice: إعداد options افتراضية إذا لم تكن موجودة
        if (!updatedQuestion.options || updatedQuestion.options.length === 0) {
          updatedQuestion.options = ["", ""];
        }
        updatedQuestion.correctAnswer = "";
      } else {
        // لأسئلة أخرى: options فارغة
        updatedQuestion.options = [];
      }
    } else {
      updatedQuestion[field] = value;
    }
    
    updatedQuestions[index] = updatedQuestion;
    
    console.log(`Updated question ${index}:`, updatedQuestion);
    
    setNewExam({ 
      ...newExam, 
      questions: updatedQuestions 
    });
  };

  // ⭐ إضافة سؤال جديد
  const handleAddQuestion = () => {
    console.log("Adding new question:", newQuestion);
    
    // التحقق من صحة السؤال
    const validation = validateQuestion(newQuestion);
    
    if (!validation.valid) {
      alert("خطأ في السؤال:\n" + validation.errors.join("\n"));
      return;
    }

    try {
      let formattedQuestion = {
        id: Date.now().toString(),
        type: newQuestion.type,
        question: newQuestion.question.trim(),
        marks: Number(newQuestion.marks) || 1,
        options: [],
        correctAnswer: "",
        explanation: newQuestion.explanation ? newQuestion.explanation.trim() : "",
        order: newExam.questions.length + 1
      };

      // ⭐ معالجة حسب النوع
      if (newQuestion.type === "multiple-choice") {
        const validOptions = ensureArray(newQuestion.options).filter(opt => opt && opt.trim());
        if (validOptions.length >= 2) {
          formattedQuestion.options = validOptions;
          formattedQuestion.correctAnswer = newQuestion.correctAnswer ? newQuestion.correctAnswer.trim() : "";
        } else {
          alert("يجب إضافة خيارين على الأقل للسؤال الاختياري");
          return;
        }
      } else if (newQuestion.type === "true-false") {
        formattedQuestion.options = [];
        formattedQuestion.correctAnswer = newQuestion.correctAnswer ? newQuestion.correctAnswer.toString() : "true";
      } else {
        formattedQuestion.correctAnswer = newQuestion.correctAnswer ? newQuestion.correctAnswer.trim() : "";
      }

      console.log("Formatted new question:", formattedQuestion);
      
      // إضافة السؤال
      setNewExam({
        ...newExam,
        questions: [...newExam.questions, formattedQuestion]
      });

      // ⭐ إعادة تعيين النموذج
      setNewQuestion({
        type: newQuestion.type,
        question: "",
        marks: 5,
        options: newQuestion.type === "multiple-choice" ? ["", ""] : [],
        correctAnswer: "",
        explanation: ""
      });

      alert("✅ تم إضافة السؤال بنجاح!");
    } catch (error) {
      console.error("Error adding question:", error);
      alert("حدث خطأ أثناء إضافة السؤال: " + error.message);
    }
  };

  // حذف سؤال
  const handleDeleteQuestion = (index) => {
    if (window.confirm("هل أنت متأكد من حذف هذا السؤال؟")) {
      const updatedQuestions = [...newExam.questions];
      updatedQuestions.splice(index, 1);
      setNewExam({
        ...newExam,
        questions: updatedQuestions
      });
    }
  };

  // معالجة بدء السحب
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // معالجة نهاية السحب
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = newExam.questions.findIndex(q => q.id === active.id);
      const newIndex = newExam.questions.findIndex(q => q.id === over.id);
      
      const updatedQuestions = arrayMove(newExam.questions, oldIndex, newIndex);
      setNewExam({
        ...newExam,
        questions: updatedQuestions
      });
    }
  };

  // إنشاء اختبار جديد
  const handleCreateExam = async () => {
    console.log("=== CREATE EXAM START ===");
    console.log("Creating exam with data:", newExam);
    
    if (!newExam.title.trim()) {
      alert("الرجاء إدخال عنوان الاختبار");
      return;
    }

    if (newExam.questions.length === 0) {
      alert("الرجاء إضافة سؤال واحد على الأقل");
      return;
    }

    if (!newExam.isSubLesson && !newExam.selectedCourse) {
      alert("الرجاء اختيار كورس واحد على الأقل");
      return;
    }

    if (newExam.isSubLesson && !newExam.selectedParentLesson) {
      alert("الرجاء اختيار الدرس الرئيسي");
      return;
    }

    try {
      console.log("Questions before formatting:", newExam.questions);
      
      const formattedQuestions = formatQuestionsForBackend(newExam.questions);
      const totalMarks = formattedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      
      console.log("Formatted questions:", formattedQuestions);
      console.log("Total marks:", totalMarks);
      console.log("Attempts Allowed:", newExam.attemptsAllowed);
      console.log("Show Answers After:", newExam.showAnswersAfter);
      
      let response;
      
      if (!newExam.isSubLesson) {
        // كويز رئيسي
        response = await axios.post("http://localhost:5001/quiz", {
          course: newExam.selectedCourse,
          name: newExam.title,
          free: false,
          quiz: {
            title: newExam.title,
            description: newExam.description,
            duration: newExam.duration,
            totalMarks: totalMarks,
            passingMarks: newExam.passingMarks,
            questions: formattedQuestions,
            isActive: newExam.isActive,
            attemptsAllowed: newExam.attemptsAllowed,
            showAnswersAfter: newExam.showAnswersAfter,
            deadline: newExam.deadline || null
          }
        }, {
          withCredentials: true,
        });
      } else {
        // كويز فرعي
        response = await axios.post("http://localhost:5001/quiz/sublesson", {
          lessonId: newExam.selectedParentLesson,
          quiz: {
            title: newExam.title,
            description: newExam.description,
            duration: newExam.duration,
            totalMarks: totalMarks,
            passingMarks: newExam.passingMarks,
            questions: formattedQuestions,
            isActive: newExam.isActive,
            attemptsAllowed: newExam.attemptsAllowed,
            showAnswersAfter: newExam.showAnswersAfter,
            deadline: newExam.deadline || null
          }
        }, {
          withCredentials: true,
        });
      }

      console.log("Create response:", response.data);
      
      // إعادة تعيين واستدعاء البيانات
      setShowCreateExamModal(false);
      resetForm();
      fetchQuizzes();
      alert("تم إنشاء الاختبار بنجاح!");
      
      console.log("=== CREATE EXAM COMPLETE ===");
    } catch (err) {
      console.error("Error creating quiz:", err);
      console.error("Error response:", err.response?.data);
      alert(err.response?.data?.msg || "حدث خطأ أثناء إنشاء الاختبار");
    }
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    setNewExam({
      title: "",
      description: "",
      duration: 60,
      passingMarks: 50,
      isActive: true,
      questions: [],
      selectedCourse: "",
      selectedParentLesson: "",
      isSubLesson: false,
      attemptsAllowed: 1,
      showAnswersAfter: "after-submission",
      deadline: ""
    });
    
    setNewQuestion({
      type: "multiple-choice",
      question: "",
      marks: 5,
      options: ["", ""],
      correctAnswer: "",
      explanation: ""
    });
    setSelectedExam(null);
  };

  // ⭐ جلب تفاصيل الاختبار للتحرير - النسخة المحسنة
  const handleEditExam = async (exam) => {
    try {
      console.log("=== EDIT EXAM START ===");
      console.log("Exam object to edit:", exam);
      
      // تسجيل تفصيلي لبيانات الامتحان
      console.log("Exam attemptsAllowed:", exam.attemptsAllowed);
      console.log("Exam showAnswersAfter:", exam.showAnswersAfter);
      console.log("Exam quiz attemptsAllowed:", exam.quiz?.attemptsAllowed);
      console.log("Exam quiz showAnswersAfter:", exam.quiz?.showAnswersAfter);
      
      // ⭐ استخدام البيانات الموجودة مباشرة إذا كانت متوفرة
      if (exam.questions && Array.isArray(exam.questions) && exam.questions.length > 0) {
        console.log("Using direct questions from exam object");
        
        // تحويل التاريخ إذا كان موجوداً
        let deadlineValue = "";
        if (exam.deadline || exam.quiz?.deadline) {
          const deadlineDate = new Date(exam.deadline || exam.quiz?.deadline);
          deadlineValue = deadlineDate.toISOString().slice(0, 16);
        }
        
        // ⭐ تحضير البيانات من الكائن مباشرة مع ALL الحقول
        const examData = {
          title: exam.title || exam.quiz?.title || "",
          description: exam.description || exam.quiz?.description || "",
          duration: exam.duration || exam.quiz?.duration || 60,
          passingMarks: exam.passingMarks || exam.quiz?.passingMarks || 50,
          isActive: exam.isActive !== false,
          questions: formatQuestionsFromBackend(exam.questions),
          selectedCourse: exam.course?._id || exam.course || "",
          selectedParentLesson: exam.isSubLesson ? exam._id : "",
          isSubLesson: exam.isSubLesson || false,
          attemptsAllowed: exam.attemptsAllowed || exam.quiz?.attemptsAllowed || 1,
          showAnswersAfter: exam.showAnswersAfter || exam.quiz?.showAnswersAfter || "after-submission",
          deadline: deadlineValue
        };
        
        console.log("Prepared Exam Data from direct:", examData);
        setSelectedExam(exam);
        setNewExam(examData);
        setShowCreateExamModal(true);
        return;
      }
      
      // ⭐ جلب البيانات من السيرفر
      console.log("Fetching from server...");
      
      const params = new URLSearchParams();
      params.append('isSubLesson', exam.isSubLesson ? 'true' : 'false');
      
      if (exam.isSubLesson && exam.subLessonId) {
        params.append('subLessonId', exam.subLessonId);
      }

      const response = await axios.get(
        `http://localhost:5001/quiz/${exam._id}?${params.toString()}`,
        {
          withCredentials: true,
        }
      );
      
      const quizData = response.data;
      console.log("Quiz Data from API:", quizData);
      
      setSelectedExam(quizData);
      
      // تحويل التاريخ إذا كان موجوداً
      let deadlineValue = "";
      if (quizData.deadline) {
        const deadlineDate = new Date(quizData.deadline);
        deadlineValue = deadlineDate.toISOString().slice(0, 16);
      }
      
      // ⭐ تحضير البيانات للتعديل مع ALL الحقول
      const examData = {
        title: quizData.title || "",
        description: quizData.description || "",
        duration: quizData.duration || 60,
        passingMarks: quizData.passingMarks || 50,
        isActive: quizData.isActive !== false,
        questions: formatQuestionsFromBackend(quizData.questions || []),
        selectedCourse: quizData.course?._id || quizData.course || "",
        selectedParentLesson: quizData.isSubLesson ? quizData._id : "",
        isSubLesson: quizData.isSubLesson || false,
        attemptsAllowed: quizData.attemptsAllowed || 1,
        showAnswersAfter: quizData.showAnswersAfter || "after-submission",
        deadline: deadlineValue
      };
      
      console.log("Final Exam Data for editing:", examData);
      setNewExam(examData);
      setShowCreateExamModal(true);
      
      console.log("=== EDIT EXAM COMPLETE ===");
      
    } catch (err) {
      console.error("Error fetching quiz details:", err);
      console.error("Error response:", err.response);
      alert("حدث خطأ أثناء جلب تفاصيل الاختبار: " + (err.response?.data?.msg || err.message));
    }
  };

  // ⭐ تحديث الاختبار - النسخة المحسنة
  const handleUpdateExam = async () => {
    console.log("=== UPDATE EXAM START ===");
    console.log("Selected Exam:", selectedExam);
    console.log("New Exam Data:", newExam);
    
    if (!selectedExam) {
      alert("لم يتم تحديد اختبار للتحديث");
      return;
    }

    // التحقق من البيانات المطلوبة
    if (!newExam.title.trim()) {
      alert("الرجاء إدخال عنوان الاختبار");
      return;
    }
    
    if (newExam.questions.length === 0) {
      alert("الرجاء إضافة سؤال واحد على الأقل");
      return;
    }
    
    // التحقق من صحة جميع الأسئلة
    const validation = validateAllQuestions(newExam.questions);
    if (!validation.valid) {
      alert("يوجد أخطاء في الأسئلة:\n" + validation.errors.join("\n"));
      return;
    }
    
    if (!newExam.isSubLesson && !newExam.selectedCourse) {
      alert("الرجاء اختيار كورس واحد على الأقل");
      return;
    }
    
    if (newExam.isSubLesson && !newExam.selectedParentLesson) {
      alert("الرجاء اختيار الدرس الرئيسي");
      return;
    }

    try {
      // تنسيق الأسئلة بشكل صحيح
      console.log("Questions before formatting:", newExam.questions);
      
      const formattedQuestions = formatQuestionsForBackend(newExam.questions);
      const totalMarks = formattedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      
      console.log("Formatted questions for update:", formattedQuestions);
      console.log("Total Marks:", totalMarks);
      console.log("Attempts Allowed:", newExam.attemptsAllowed);
      console.log("Show Answers After:", newExam.showAnswersAfter);
      
      // التحقق من صحة الأسئلة المنسقة
      const invalidFormatted = formattedQuestions.filter(q => 
        !q.question || !q.type ||
        (q.type === "multiple-choice" && (!q.options || q.options.length < 2)) ||
        (q.type === "true-false" && !["true", "false"].includes(q.correctAnswer?.toString().toLowerCase()))
      );
      
      if (invalidFormatted.length > 0) {
        console.error("Invalid questions after formatting:", invalidFormatted);
        alert("حدث خطأ في تنسيق الأسئلة. الرجاء التحقق من البيانات.");
        return;
      }
      
      // ⭐ تحويل الموعد النهائي
      let deadlineValue = newExam.deadline;
      if (deadlineValue) {
        const deadlineDate = new Date(deadlineValue);
        if (isNaN(deadlineDate.getTime())) {
          deadlineValue = null;
        } else {
          deadlineValue = deadlineDate.toISOString();
        }
      }
      
      // ⭐ إعداد بيانات التحديث بشكل كامل
      const updateData = {
        quiz: {
          title: newExam.title.trim(),
          description: newExam.description.trim(),
          duration: Number(newExam.duration) || 60,
          totalMarks: totalMarks,
          passingMarks: Number(newExam.passingMarks) || 50,
          questions: formattedQuestions,
          isActive: Boolean(newExam.isActive),
          attemptsAllowed: Number(newExam.attemptsAllowed) || 1,
          showAnswersAfter: newExam.showAnswersAfter || "after-submission",
          deadline: deadlineValue
        }
      };
      
      // إضافة بيانات الكويز الفرعي إذا لزم الأمر
      if (newExam.isSubLesson) {
        updateData.isSubLesson = true;
        if (selectedExam.subLessonId) {
          updateData.subLessonId = selectedExam.subLessonId;
        } else if (selectedExam._id) {
          updateData.subLessonId = selectedExam._id;
        }
      } else {
        updateData.isSubLesson = false;
      }

      console.log("Update Data to send:", JSON.stringify(updateData, null, 2));
      
      const response = await axios.put(
        `http://localhost:5001/quiz/${selectedExam._id}`, 
        updateData, 
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log("Update response:", response.data);

      // ⭐ بناء كائن التحديث المحلي بشكل كامل
      const updatedExam = {
        ...selectedExam,
        title: newExam.title,
        description: newExam.description,
        duration: newExam.duration,
        totalMarks: totalMarks,
        passingMarks: newExam.passingMarks,
        questions: formattedQuestions,
        isActive: newExam.isActive,
        attemptsAllowed: newExam.attemptsAllowed,
        showAnswersAfter: newExam.showAnswersAfter,
        deadline: deadlineValue,
        // الحفاظ على البيانات الأخرى
        ...(newExam.isSubLesson && { 
          isSubLesson: true,
          subLessonId: selectedExam.subLessonId || selectedExam._id 
        }),
        ...(!newExam.isSubLesson && { 
          isSubLesson: false,
          selectedCourse: newExam.selectedCourse 
        })
      };

      console.log("Updated Exam for local state:", updatedExam);

      // ⭐ تحديث القائمة مباشرة
      setExams(prevExams => 
        prevExams.map(ex => {
          // المطابقة بناءً على الـ _id و subLessonId
          const isSameExam = ex._id === selectedExam._id && 
            ((ex.isSubLesson && ex.subLessonId === (selectedExam.subLessonId || selectedExam._id)) ||
             (!ex.isSubLesson && !selectedExam.isSubLesson));
          
          return isSameExam ? { ...ex, ...updatedExam } : ex;
        })
      );

      // إغلاق النافذة وإعادة التعيين
      setShowCreateExamModal(false);
      resetForm();
      
      alert("تم تحديث الاختبار بنجاح!");
      
      // ⭐ إعادة جلب البيانات للتأكد من المزامنة
      setTimeout(() => {
        fetchQuizzes();
      }, 500);
      
      console.log("=== UPDATE EXAM COMPLETE ===");
      
    } catch (err) {
      console.error("Error updating quiz:", err);
      console.error("Error response:", err.response);
      
      let errorMessage = "حدث خطأ أثناء تحديث الاختبار. الرجاء المحاولة مرة أخرى.";
      
      if (err.response?.data?.error) {
        errorMessage = `خطأ: ${err.response.data.error}`;
      } else if (err.response?.data?.msg) {
        errorMessage = `خطأ: ${err.response.data.msg}`;
      } else if (err.message) {
        errorMessage = `خطأ: ${err.message}`;
      }
      
      alert(errorMessage);
    }
  };

  // حذف اختبار
  const handleDeleteExam = async (exam) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الاختبار؟")) {
      return;
    }

    try {
      const params = new URLSearchParams({
        isSubLesson: exam.isSubLesson ? 'true' : 'false'
      });
      
      if (exam.isSubLesson && exam.subLessonId) {
        params.append('subLessonId', exam.subLessonId);
      }

      await axios.delete(`http://localhost:5001/quiz/${exam._id}?${params.toString()}`, {
        withCredentials: true,
      });
      
      fetchQuizzes();
      alert("تم حذف الاختبار بنجاح!");
    } catch (err) {
      console.error("Error deleting quiz:", err);
      alert(err.response?.data?.msg || "حدث خطأ أثناء حذف الاختبار");
    }
  };

  // تبديل حالة الاختبار
  const handleToggleExamStatus = async (exam) => {
    try {
      const updateData = {
        quiz: {
          isActive: !exam.isActive,
          attemptsAllowed: exam.attemptsAllowed || 1,
          showAnswersAfter: exam.showAnswersAfter || "after-submission"
        }
      };
      
      if (exam.isSubLesson) {
        updateData.isSubLesson = true;
        if (exam.subLessonId) {
          updateData.subLessonId = exam.subLessonId;
        }
      }
      
      await axios.put(`http://localhost:5001/quiz/${exam._id}`, updateData, {
        withCredentials: true,
      });
      
      // تحديث المحلي مباشرة
      setExams(exams.map((ex) =>
        ex._id === exam._id ? { ...ex, isActive: !ex.isActive } : ex
      ));
      
      alert("تم تغيير حالة الاختبار بنجاح!");
    } catch (err) {
      console.error("Error toggling quiz status:", err);
      alert(err.response?.data?.msg || "حدث خطأ أثناء تغيير حالة الاختبار");
    }
  };

  // معالجة تغيير نوع الكويز
  const handleExamTypeChange = (isSubLesson) => {
    setNewExam({
      ...newExam,
      isSubLesson,
      selectedCourse: isSubLesson ? "" : newExam.selectedCourse,
      selectedParentLesson: isSubLesson ? newExam.selectedParentLesson : ""
    });
  };

  // تصفية الاختبارات
  const filteredExams = exams.filter(
    (ex) =>
      (ex.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.quiz?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.quiz?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ex.course?.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) || 
       (typeof ex.course === 'string' && ex.course.toLowerCase().includes(searchTerm.toLowerCase()))))
  );

  const displayedCourses = showAllCourses ? courses : courses.slice(0, 5);

  if (loading) {
    return (
      <div
        style={{
          padding: "30px",
          background: "#f4f5fa",
          minHeight: "100vh",
          fontFamily: "'Cairo', sans-serif",
          direction: "rtl",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: "48px", color: "#667eea", marginBottom: "20px" }}></i>
          <p style={{ fontSize: "18px", color: "#6b7280" }}>جاري تحميل الاختبارات...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "30px",
        background: "#f4f5fa",
        minHeight: "100vh",
        fontFamily: "'Cairo', sans-serif",
        direction: "rtl",
      }}
    >
      {/* العنوان الرئيسي */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "30px",
          marginBottom: "30px",
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "700",
                marginBottom: "10px",
                color: "#1f2937",
              }}
            >
              <i className="fas fa-clipboard-list"></i> إدارة الاختبارات (الكويزات)
            </h1>
            <p style={{ color: "#6b7280", fontSize: "16px" }}>
              إنشاء وإدارة اختبارات الدورة التدريبية - يمكن إضافتها كدروس عادية أو كدروس فرعية
            </p>
          </div>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <div
              style={{
                padding: "15px 25px",
                background: "#f0f9ff",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#0284c7", fontSize: "14px", marginBottom: "5px" }}>
                إجمالي الاختبارات
              </p>
              <p style={{ color: "#0369a1", fontSize: "24px", fontWeight: "700" }}>
                {exams.length}
              </p>
            </div>
            <div
              style={{
                padding: "15px 25px",
                background: "#f0fdf4",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#16a34a", fontSize: "14px", marginBottom: "5px" }}>
                الاختبارات النشطة
              </p>
              <p style={{ color: "#15803d", fontSize: "24px", fontWeight: "700" }}>
                {exams.filter((ex) => ex.isActive !== false).length}
              </p>
            </div>
            <div
              style={{
                padding: "15px 25px",
                background: "#fef3c7",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "#92400e", fontSize: "14px", marginBottom: "5px" }}>
                إجمالي الأسئلة
              </p>
              <p style={{ color: "#92400e", fontSize: "24px", fontWeight: "700" }}>
                {exams.reduce((total, exam) => total + (exam.questions?.length || exam.quiz?.questions?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* شريط البحث والإضافة */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "20px",
          marginBottom: "30px",
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <input
          type="text"
          placeholder="🔍 بحث عن اختبار، وصف، أو كورس..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: "250px",
            padding: "12px 20px",
            border: "2px solid #e5e7eb",
            borderRadius: "12px",
            fontSize: "16px",
          }}
        />
        <button
          type="button"
          onClick={() => {
            setSelectedExam(null);
            resetForm();
            setShowCreateExamModal(true);
          }}
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            border: "none",
            padding: "12px 25px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "16px",
          }}
        >
          <i className="fas fa-plus"></i> إنشاء اختبار جديد
        </button>
      </div>

      {/* قائمة الاختبارات */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: "25px",
        }}
      >
        {filteredExams.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "60px",
              background: "white",
              borderRadius: "20px",
              border: "2px dashed #e5e7eb",
            }}
          >
            <i
              className="fas fa-clipboard-list"
              style={{ fontSize: "64px", color: "#9ca3af", marginBottom: "20px" }}
            ></i>
            <p style={{ fontSize: "20px", color: "#6b7280" }}>
              لا توجد اختبارات بعد
            </p>
            <p style={{ color: "#9ca3af", marginTop: "10px" }}>
              ابدأ بإنشاء اختبار جديد
            </p>
          </div>
        ) : (
          filteredExams.map((exam) => (
            <div
              key={exam._id + (exam.subLessonId || "")}
              style={{
                background: "white",
                borderRadius: "20px",
                padding: "25px",
                boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
                transition: "transform 0.3s ease",
                borderLeft: exam.isSubLesson ? "5px solid #10b981" : "5px solid #667eea",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "15px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#1f2937",
                      marginBottom: "5px",
                    }}
                  >
                    {exam.title || exam.quiz?.title || "بدون عنوان"}
                    {exam.isSubLesson && (
                      <span style={{
                        marginRight: "10px",
                        fontSize: "12px",
                        background: "#10b981",
                        color: "white",
                        padding: "3px 8px",
                        borderRadius: "12px",
                      }}>
                        <i className="fas fa-layer-group"></i> فرعي
                      </span>
                    )}
                  </h3>
                  {exam.course && (
                    <p style={{ color: "#6b7280", fontSize: "14px" }}>
                      <i className="fas fa-book"></i> {typeof exam.course === 'object' ? exam.course.name : exam.course}
                    </p>
                  )}
                  {exam.lessonName && (
                    <p style={{ color: "#6b7280", fontSize: "14px" }}>
                      <i className="fas fa-file-alt"></i> {exam.lessonName}
                      {exam.subLessonName && ` > ${exam.subLessonName}`}
                    </p>
                  )}
                  <div style={{ marginTop: "5px" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      <i className="fas fa-redo"></i> المحاولات: {exam.attemptsAllowed === 0 ? "غير محدود" : exam.attemptsAllowed}
                    </span>
                    <span style={{ fontSize: "12px", color: "#6b7280", marginRight: "10px" }}>
                      <i className="fas fa-eye"></i> عرض الإجابات: {
                        exam.showAnswersAfter === "never" ? "لا" :
                        exam.showAnswersAfter === "immediately" ? "فوري" :
                        exam.showAnswersAfter === "after-submission" ? "بعد التسليم" : "بعد الموعد"
                      }
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: "8px" }}>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: (exam.isActive !== false) ? "#dcfce7" : "#fee2e2",
                      color: (exam.isActive !== false) ? "#166534" : "#991b1b",
                    }}
                  >
                    {(exam.isActive !== false) ? "نشط" : "متوقف"}
                  </span>
                </div>
              </div>

              <p
                style={{
                  color: "#6b7280",
                  fontSize: "14px",
                  marginBottom: "20px",
                  lineHeight: "1.6",
                  minHeight: "60px",
                }}
              >
                {exam.description || exam.quiz?.description || "لا يوجد وصف"}
              </p>

              <div
                style={{
                  background: "#f9fafb",
                  borderRadius: "12px",
                  padding: "15px",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "12px" }}>المدة</p>
                    <p style={{ color: "#1f2937", fontWeight: "600" }}>
                      <i className="fas fa-clock"></i> {exam.duration || exam.quiz?.duration || 0} دقيقة
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "12px" }}>الدرجة الكلية</p>
                    <p style={{ color: "#1f2937", fontWeight: "600" }}>
                      <i className="fas fa-star"></i> {exam.totalMarks || exam.quiz?.totalMarks || 0} درجة
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "12px" }}>الأسئلة</p>
                    <p style={{ color: "#1f2937", fontWeight: "600" }}>
                      <i className="fas fa-question-circle"></i> {(exam.questions || exam.quiz?.questions || []).length} سؤال
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "#6b7280", fontSize: "12px" }}>درجة النجاح</p>
                    <p style={{ color: "#1f2937", fontWeight: "600" }}>
                      <i className="fas fa-check-circle"></i> {exam.passingMarks || exam.quiz?.passingMarks || 0} درجة
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleEditExam(exam)}
                  style={{
                    padding: "10px",
                    background: "#8b5cf6",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  <i className="fas fa-edit"></i> تعديل
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleExamStatus(exam)}
                  style={{
                    padding: "10px",
                    background: (exam.isActive !== false) ? "#f59e0b" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  <i className={`fas ${(exam.isActive !== false) ? "fa-pause" : "fa-play"}`}></i>{" "}
                  {(exam.isActive !== false) ? "إيقاف" : "تفعيل"}
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`/dashboard/quiz/results/${exam._id}?isSubLesson=${exam.isSubLesson}&subLessonId=${exam.subLessonId || ''}`, '_blank')}
                  style={{
                    padding: "10px",
                    background: "#0ea5e9",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  <i className="fas fa-chart-bar"></i> النتائج
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteExam(exam)}
                  style={{
                    padding: "10px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  <i className="fas fa-trash"></i> حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* نافذة إنشاء/تعديل اختبار */}
      {showCreateExamModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => {
            if (window.confirm("هل تريد إلغاء التعديلات؟")) {
              setShowCreateExamModal(false);
              resetForm();
            }
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "20px",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: "24px",
                fontWeight: "700",
                marginBottom: "25px",
                color: "#1f2937",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                <i className="fas fa-plus-circle"></i> {selectedExam ? "تعديل اختبار" : "إنشاء اختبار جديد"}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("هل تريد إلغاء التعديلات؟")) {
                    setShowCreateExamModal(false);
                    resetForm();
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </h3>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "#374151" }}>
                نوع الاختبار:
              </label>
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <button
                  type="button"
                  onClick={() => handleExamTypeChange(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: !newExam.isSubLesson ? "#667eea" : "#f3f4f6",
                    color: !newExam.isSubLesson ? "white" : "#6b7280",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  <i className="fas fa-file-alt"></i> اختبار عادي
                </button>
                <button
                  type="button"
                  onClick={() => handleExamTypeChange(true)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: newExam.isSubLesson ? "#10b981" : "#f3f4f6",
                    color: newExam.isSubLesson ? "white" : "#6b7280",
                    border: "none",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  <i className="fas fa-layer-group"></i> اختبار فرعي
                </button>
              </div>
            </div>

            {/* اختيار الكورسات أو الدرس الرئيسي */}
            {!newExam.isSubLesson ? (
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  <i className="fas fa-book"></i> اختر الكورس *
                </label>
                <select
                  value={newExam.selectedCourse}
                  onChange={(e) => setNewExam({ ...newExam, selectedCourse: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                  }}
                >
                  <option value="">-- اختر الكورس --</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.name}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "5px" }}>
                  اختر كورس واحد لإضافة الاختبار إليه
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  <i className="fas fa-layer-group"></i> اختر الدرس الرئيسي *
                </label>
                <select
                  value={newExam.selectedParentLesson}
                  onChange={(e) => setNewExam({ ...newExam, selectedParentLesson: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                  }}
                >
                  <option value="">-- اختر الدرس الرئيسي --</option>
                  {parentLessons.map((lesson) => (
                    <option key={lesson._id} value={lesson._id}>
                      {lesson.name} ({lesson.course?.[0]?.name || "غير محدد"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                عنوان الاختبار *
              </label>
              <input
                type="text"
                value={newExam.title}
                onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                placeholder="مثال: اختبار الوحدة الأولى"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                الوصف
              </label>
              <textarea
                value={newExam.description}
                onChange={(e) =>
                  setNewExam({ ...newExam, description: e.target.value })
                }
                placeholder="وصف مختصر للاختبار"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                  minHeight: "100px",
                  resize: "vertical",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "15px",
                marginBottom: "20px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  المدة (دقيقة)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newExam.duration}
                  onChange={(e) =>
                    setNewExam({ ...newExam, duration: parseInt(e.target.value) || 60 })
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  درجة النجاح
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newExam.passingMarks}
                  onChange={(e) =>
                    setNewExam({ ...newExam, passingMarks: parseInt(e.target.value) || 50 })
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  عدد المحاولات *
                </label>
                <select
                  value={newExam.attemptsAllowed}
                  onChange={(e) => setNewExam({ ...newExam, attemptsAllowed: parseInt(e.target.value) })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                  }}
                >
                  <option value={1}>1 محاولة</option>
                  <option value={2}>2 محاولات</option>
                  <option value={3}>3 محاولات</option>
                  <option value={0}>غير محدود</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  عرض الإجابات *
                </label>
                <select
                  value={newExam.showAnswersAfter}
                  onChange={(e) => setNewExam({ ...newExam, showAnswersAfter: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "16px",
                  }}
                >
                  <option value="never">لا تعرض أبداً</option>
                  <option value="immediately">عرض فوري</option>
                  <option value="after-submission">بعد التسليم</option>
                  <option value="after-deadline">بعد الموعد النهائي</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                الموعد النهائي (اختياري)
              </label>
              <input
                type="datetime-local"
                value={newExam.deadline}
                onChange={(e) => setNewExam({ ...newExam, deadline: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={newExam.isActive}
                  onChange={(e) =>
                    setNewExam({ ...newExam, isActive: e.target.checked })
                  }
                  style={{ width: "20px", height: "20px" }}
                />
                <span style={{ fontWeight: "600" }}>تفعيل الاختبار فوراً</span>
              </label>
            </div>

            {/* إدارة الأسئلة */}
            <div
              style={{
                background: "#f9fafb",
                borderRadius: "15px",
                padding: "20px",
                marginBottom: "25px",
                border: "2px solid #e5e7eb",
              }}
            >
              <h4
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "20px",
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span><i className="fas fa-question-circle"></i> إدارة الأسئلة ({newExam.questions.length})</span>
                <span style={{ fontSize: "14px", color: "#6b7280" }}>
                  المجموع الكلي: {newExam.questions.reduce((sum, q) => sum + (q.marks || 1), 0)} درجة
                </span>
              </h4>

              {/* قائمة الأسئلة مع السحب والإفلات */}
              {newExam.questions.length > 0 && (
                <div style={{ marginBottom: "25px" }}>
                  <div style={{
                    marginBottom: "10px",
                    padding: "10px",
                    background: "#e0e7ff",
                    borderRadius: "8px",
                    color: "#3730a3",
                    fontSize: "14px",
                    textAlign: "center",
                  }}>
                    <i className="fas fa-info-circle"></i> اسحب الأسئلة لتغيير ترتيبها
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={newExam.questions.map(q => q.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div style={{
                        background: "white",
                        borderRadius: "10px",
                        padding: "10px",
                        minHeight: "100px",
                        border: "2px solid #e5e7eb",
                      }}>
                        {newExam.questions.map((question, index) => (
                          <SortableQuestionItem
                            key={question.id}
                            question={question}
                            index={index}
                            onUpdate={handleUpdateQuestion}
                            onDelete={handleDeleteQuestion}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {activeId ? (
                        <div style={{
                          background: "#fef3c7",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          padding: "15px",
                          boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
                          opacity: 0.8,
                        }}>
                          {newExam.questions.find(q => q.id === activeId)?.question}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              )}

              {/* نموذج إضافة سؤال جديد */}
              <div style={{ background: "white", borderRadius: "10px", padding: "20px", border: "2px dashed #e5e7eb" }}>
                <h5 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "15px", color: "#374151" }}>
                  <i className="fas fa-plus-circle"></i> إضافة سؤال جديد
                </h5>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                    نوع السؤال
                  </label>
                  <select
                    value={newQuestion.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setNewQuestion({ 
                        ...newQuestion, 
                        type,
                        options: type === "multiple-choice" ? ["", ""] : [],
                        correctAnswer: ""
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <option value="multiple-choice">اختيار من متعدد</option>
                    <option value="true-false">صح أو خطأ</option>
                    <option value="short-answer">إجابة قصيرة</option>
                    <option value="essay">مقال</option>
                  </select>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                    نص السؤال *
                  </label>
                  <textarea
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    placeholder="اكتب نص السؤال هنا..."
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                      minHeight: "80px",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                    الدرجة
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newQuestion.marks}
                    onChange={(e) => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) || 1 })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  />
                </div>

                {newQuestion.type === "multiple-choice" && (
                  <>
                    <div style={{ marginBottom: "15px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <label style={{ fontWeight: "600", color: "#374151" }}>
                          الخيارات *
                        </label>
                        <button
                          type="button"
                          onClick={addOption}
                          style={{
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          <i className="fas fa-plus"></i> إضافة خيار
                        </button>
                      </div>
                      {newQuestion.options.map((opt, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "center" }}>
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={newQuestion.correctAnswer === opt}
                            onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: opt })}
                            style={{ cursor: "pointer" }}
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...newQuestion.options];
                              newOpts[idx] = e.target.value;
                              setNewQuestion({ ...newQuestion, options: newOpts });
                            }}
                            placeholder={`الخيار ${idx + 1}`}
                            style={{
                              flex: 1,
                              padding: "10px",
                              border: "2px solid #e5e7eb",
                              borderRadius: "8px",
                            }}
                          />
                          {newQuestion.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(idx)}
                              style={{
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {newQuestion.type === "true-false" && (
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                      الإجابة الصحيحة *
                    </label>
                    <div style={{ display: "flex", gap: "15px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="trueFalse"
                          value="true"
                          checked={newQuestion.correctAnswer === "true"}
                          onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span style={{ fontWeight: newQuestion.correctAnswer === "true" ? "600" : "400" }}>صح</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="trueFalse"
                          value="false"
                          checked={newQuestion.correctAnswer === "false"}
                          onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span style={{ fontWeight: newQuestion.correctAnswer === "false" ? "600" : "400" }}>خطأ</span>
                      </label>
                    </div>
                  </div>
                )}

                {(newQuestion.type === "short-answer" || newQuestion.type === "essay") && (
                  <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                      الإجابة النموذجية (اختياري)
                    </label>
                    <textarea
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                      placeholder={newQuestion.type === "short-answer" ? "الإجابة القصيرة النموذجية" : "النموذج المقترح للإجابة"}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "14px",
                        minHeight: "60px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                    الشرح (اختياري)
                  </label>
                  <input
                    type="text"
                    value={newQuestion.explanation}
                    onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                    placeholder="شرح الإجابة الصحيحة"
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={!newQuestion.question.trim() || 
                    (newQuestion.type === "multiple-choice" && 
                     (newQuestion.options.filter(opt => opt.trim()).length < 2 || !newQuestion.correctAnswer.trim())) ||
                    (newQuestion.type === "true-false" && !newQuestion.correctAnswer)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: !newQuestion.question.trim() || 
                      (newQuestion.type === "multiple-choice" && 
                       (newQuestion.options.filter(opt => opt.trim()).length < 2 || !newQuestion.correctAnswer.trim())) ||
                      (newQuestion.type === "true-false" && !newQuestion.correctAnswer)
                      ? "#9ca3af" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    cursor: !newQuestion.question.trim() || 
                      (newQuestion.type === "multiple-choice" && 
                       (newQuestion.options.filter(opt => opt.trim()).length < 2 || !newQuestion.correctAnswer.trim())) ||
                      (newQuestion.type === "true-false" && !newQuestion.correctAnswer)
                      ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    fontSize: "16px",
                  }}
                >
                  <i className="fas fa-plus"></i> إضافة السؤال
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={selectedExam ? handleUpdateExam : handleCreateExam}
                disabled={
                  !newExam.title.trim() || 
                  newExam.questions.length === 0 ||
                  (!newExam.isSubLesson && !newExam.selectedCourse) ||
                  (newExam.isSubLesson && !newExam.selectedParentLesson)
                }
                style={{
                  flex: 1,
                  padding: "14px",
                  background: !newExam.title.trim() || 
                             newExam.questions.length === 0 ||
                             (!newExam.isSubLesson && !newExam.selectedCourse) ||
                             (newExam.isSubLesson && !newExam.selectedParentLesson)
                             ? "#9ca3af" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: !newExam.title.trim() || 
                          newExam.questions.length === 0 ||
                          (!newExam.isSubLesson && !newExam.selectedCourse) ||
                          (newExam.isSubLesson && !newExam.selectedParentLesson)
                          ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                <i className="fas fa-check"></i> {selectedExam ? "تحديث الاختبار" : "إنشاء الاختبار"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("هل تريد إلغاء التعديلات؟")) {
                    setShowCreateExamModal(false);
                    resetForm();
                  }
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "16px",
                }}
              >
                <i className="fas fa-times"></i> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}