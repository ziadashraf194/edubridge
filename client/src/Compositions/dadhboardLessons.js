import React, { useState, useEffect } from "react";
import axios from "axios";
import { showConfirm } from "../utils/popup";
import "../style/dashboardLessons.css"

export default function DashboardLessons() {
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]); 
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("cards");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  
  // لإدارة الدروس الفرعية
  const [showSubLessonModal, setShowSubLessonModal] = useState(false);
  const [currentSubLesson, setCurrentSubLesson] = useState({
    name: "",
    type: "video",
    url: "",
    time: 0,
    free: false,
    active: true,
  });
  const [editingSubLessonIndex, setEditingSubLessonIndex] = useState(null);
  
  const [currentLesson, setCurrentLesson] = useState({
    name: "",
    type: "section",
    url: "",
    time: 0,
    active: true,
    course: [],
    _id: null,
    subLessons: [],
    selectedQuizId: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resLessons = await axios.get("http://localhost:5001/lesson/dashbord/", {
          withCredentials: true,
        });
        const resCourses = await axios.get("http://localhost:5001/course/names", {
          withCredentials: true,
        });
        const resQuizzes = await axios.get("http://localhost:5001/quiz", {
          withCredentials: true,
        });

        const Courses = resCourses.data;
        const Lessons = resLessons.data;
        const Quizzes = resQuizzes.data;

        setLessons(Lessons);
        setCourses(Courses);
        setQuizzes(Quizzes);

        // Calculate stats
        const totalLessons = Lessons.length;
        const activeLessons = Lessons.filter(l => l.active).length;
        const totalSubLessons = Lessons.reduce((sum, l) => sum + (l.subLessons?.length || 0), 0);
        const totalQuizzes = Lessons.filter(l => l.type === "quiz").length;
        
        setStats({
          totalLessons,
          activeLessons,
          totalSubLessons,
          totalQuizzes,
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        alert("حدث خطأ أثناء تحميل البيانات.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getLessonId = (lesson) => lesson._id || lesson.id;

  const handleDeleteLesson = async (lesson) => {
    const id = getLessonId(lesson);
    if (!id) return;
    const ok = await showConfirm("هل أنت متأكد من حذف هذا الدرس؟");
    if (!ok) return;

    try {
      const res = await axios.delete(`http://localhost:5001/lesson/dashbord/${id}`, {
        withCredentials: true,
      });

      setLessons(lessons.filter((l) => getLessonId(l) !== id));
      alert(res.data.msg);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || "حدث خطأ أثناء الحذف");
    }
  };

  const handleAddLesson = () => {
    setModalMode("add");
    setCurrentLesson({
      name: "",
      type: "section",
      url: "",
      time: 0,
      active: true,
      course: [],
      _id: null,
      subLessons: [],
      selectedQuizId: "",
    });
    setShowModal(true);
  };

  const handleEditLesson = (lesson) => {
    setModalMode("edit");
    const courseIds = lesson.course?.map(c => c._id) || [];
    
    // استخراج quizId من الـ URL إذا كان النوع quiz
    let selectedQuizId = "";
    if (lesson.type === "quiz" && lesson.url) {
      // إذا كان الـ URL يحتوي على pattern quiz-{id}
      const match = lesson.url.match(/quiz-(.*)/);
      if (match && match[1]) {
        selectedQuizId = match[1];
      } else {
        // أو إذا كان هناك quiz object
        selectedQuizId = lesson.quiz?._id || "";
      }
    } else if (lesson.quiz?._id) {
      selectedQuizId = lesson.quiz._id;
    }
    
    setCurrentLesson({
      name: lesson.name || "",
      type: lesson.type || "section",
      url: lesson.type === "quiz" ? "" : lesson.url || "", // إخفاء الـ URL إذا كان quiz
      time: lesson.time || 0,
      active: lesson.active !== undefined ? lesson.active : true,
      course: courseIds,
      _id: getLessonId(lesson),
      subLessons: lesson.subLessons || [],
      selectedQuizId: selectedQuizId,
    });
    setShowModal(true);
  };

  const handleShowDetails = (lesson) => {
    setSelectedLesson(lesson);
    setShowDetailsModal(true);
  };

  const handleSaveLesson = async () => {
    if (!currentLesson.course || currentLesson.course.length === 0) {
      alert("يرجى اختيار كورس واحد على الأقل!");
      return;
    }

    if (!currentLesson.name.trim()) {
      alert("يرجى إدخال اسم الدرس!");
      return;
    }

    // إذا كان النوع كويز، يجب اختيار كويز
    if (currentLesson.type === "quiz" && !currentLesson.selectedQuizId) {
      alert("يرجى اختيار كويز من القائمة!");
      return;
    }

    // إعداد بيانات الدرس بناءً على النوع
    const lessonData = {
      name: currentLesson.name,
      type: currentLesson.type,
      time: currentLesson.time,
      active: currentLesson.active,
      course: currentLesson.course,
      subLessons: currentLesson.subLessons,
    };

    // تحديد الـ URL بناءً على نوع الدرس
    if (currentLesson.type === "quiz") {
      lessonData.url = `quiz-${currentLesson.selectedQuizId}`;
      
      // البحث عن الكويز المختار وإضافته
      const selectedQuiz = quizzes.find(q => q._id === currentLesson.selectedQuizId);
      if (selectedQuiz) {
        lessonData.quiz = selectedQuiz;
      }
    } else {
      lessonData.url = currentLesson.url;
    }

    try {
      if (modalMode === "add") {
        const res = await axios.post(`http://localhost:5001/lesson/${currentLesson.course[0]}`, lessonData, { 
          withCredentials: true 
        });
        setLessons([...lessons, res.data.lesson]);
        alert("تم إضافة الدرس بنجاح!");
      } else {
        const res = await axios.put(`http://localhost:5001/lesson/${currentLesson._id}`, lessonData, { 
          withCredentials: true 
        });
        const updatedLesson = res.data.lesson;
        setLessons(lessons.map(l => getLessonId(l) === updatedLesson._id ? updatedLesson : l));
        alert("تم تعديل الدرس بنجاح!");
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || "حدث خطأ أثناء الحفظ");
    }
  };

  // إضافة درس فرعي جديد
  const handleAddSubLesson = () => {
    setEditingSubLessonIndex(null);
    setCurrentSubLesson({
      name: "",
      type: "video",
      url: "",
      time: 0,
      free: false,
      active: true,
      selectedQuizId: "",
    });
    setShowSubLessonModal(true);
  };

  // تعديل درس فرعي
  const handleEditSubLesson = (subLesson, index) => {
    setEditingSubLessonIndex(index);
    
    // استخراج quizId من الـ URL إذا كان النوع quiz
    let selectedQuizId = "";
    if (subLesson.type === "quiz" && subLesson.url) {
      const match = subLesson.url.match(/quiz-(.*)/);
      if (match && match[1]) {
        selectedQuizId = match[1];
      } else {
        selectedQuizId = subLesson.quiz?._id || "";
      }
    }
    
    setCurrentSubLesson({ 
      name: subLesson.name || "",
      type: subLesson.type || "video",
      url: subLesson.type === "quiz" ? "" : subLesson.url || "",
      time: subLesson.time || 0,
      free: subLesson.free || false,
      active: subLesson.active !== undefined ? subLesson.active : true,
      selectedQuizId: selectedQuizId,
    });
    setShowSubLessonModal(true);
  };

  // حفظ الدرس الفرعي
  const handleSaveSubLesson = () => {
    if (!currentSubLesson.name.trim()) {
      alert("يرجى إدخال اسم الدرس!");
      return;
    }

    // إذا كان النوع كويز، يجب اختيار كويز
    if (currentSubLesson.type === "quiz" && !currentSubLesson.selectedQuizId) {
      alert("يرجى اختيار كويز من القائمة!");
      return;
    }

    // إعداد البيانات النهائية للدرس الفرعي
    const subLessonData = {
      name: currentSubLesson.name,
      type: currentSubLesson.type,
      time: currentSubLesson.time,
      free: currentSubLesson.free,
      active: currentSubLesson.active,
    };

    // تحديد الـ URL بناءً على النوع
    if (currentSubLesson.type === "quiz") {
      subLessonData.url = `quiz-${currentSubLesson.selectedQuizId}`;
      
      // البحث عن الكويز المختار وإضافته
      const selectedQuiz = quizzes.find(q => q._id === currentSubLesson.selectedQuizId);
      if (selectedQuiz) {
        subLessonData.quiz = selectedQuiz;
      }
    } else {
      if (!currentSubLesson.url.trim()) {
        alert("يرجى إدخال رابط الملف!");
        return;
      }
      subLessonData.url = currentSubLesson.url;
    }

    const updatedSubLessons = [...currentLesson.subLessons];
    
    if (editingSubLessonIndex !== null) {
      // تعديل درس فرعي موجود
      updatedSubLessons[editingSubLessonIndex] = subLessonData;
    } else {
      // إضافة درس فرعي جديد
      updatedSubLessons.push({ ...subLessonData, order: updatedSubLessons.length });
    }

    setCurrentLesson({ ...currentLesson, subLessons: updatedSubLessons });
    setShowSubLessonModal(false);
  };

  // حذف درس فرعي
  const handleDeleteSubLesson = (index) => {
    (async () => {
      const ok = await showConfirm("هل أنت متأكد من حذف هذا الدرس الفرعي؟");
      if (!ok) return;

      const updatedSubLessons = currentLesson.subLessons.filter((_, i) => i !== index);
      setCurrentLesson({ ...currentLesson, subLessons: updatedSubLessons });
    })();
  };

  const handleCourseSelection = (courseId) => {
    const currentCourses = [...currentLesson.course];
    const index = currentCourses.indexOf(courseId);
    
    if (index > -1) {
      currentCourses.splice(index, 1);
    } else {
      currentCourses.push(courseId);
    }
    
    setCurrentLesson({ ...currentLesson, course: currentCourses });
  };

  // معالجة تغيير نوع الدرس
  const handleLessonTypeChange = (type) => {
    setCurrentLesson({ 
      ...currentLesson, 
      type,
      // إذا تغير النوع من quiz إلى آخر، احذف selectedQuizId
      ...(type !== "quiz" ? { selectedQuizId: "" } : {})
    });
  };

  // معالجة اختيار الكويز
  const handleQuizSelection = (quizId) => {
    setCurrentLesson({ ...currentLesson, selectedQuizId: quizId });
  };

  // معالجة تغيير نوع الدرس الفرعي
  const handleSubLessonTypeChange = (type) => {
    setCurrentSubLesson({ 
      ...currentSubLesson, 
      type,
      // إذا تغير النوع من quiz إلى آخر، احذف selectedQuizId
      ...(type !== "quiz" ? { selectedQuizId: "" } : {})
    });
  };

  // معالجة اختيار الكويز للدرس الفرعي
  const handleSubLessonQuizSelection = (quizId) => {
    setCurrentSubLesson({ ...currentSubLesson, selectedQuizId: quizId });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "video":
        return "fa-video";
      case "pdf":
        return "fa-file-pdf";
      case "image":
        return "fa-image";
      case "section":
        return "fa-folder";
      case "quiz":
        return "fa-clipboard-check";
      default:
        return "fa-file";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "video":
        return "فيديو";
      case "pdf":
        return "PDF";
      case "image":
        return "صورة";
      case "section":
        return "قسم";
      case "quiz":
        return "اختبار";
      default:
        return "ملف";
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // دالة لعرض تفاصيل الكويز
  const renderQuizDetails = (lesson) => {
    if (lesson.type !== "quiz" || !lesson.quiz) return null;

    const quiz = lesson.quiz;
    return (
      <div style={{
        background: "#f0f9ff",
        borderRadius: "10px",
        padding: "15px",
        marginTop: "10px",
        border: "1px solid #bae6fd"
      }}>
        <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#0369a1", marginBottom: "10px" }}>
          <i className="fas fa-clipboard-check"></i> تفاصيل الاختبار
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>عدد الأسئلة</p>
            <p style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
              {quiz.questions?.length || 0} سؤال
            </p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>الدرجة الكلية</p>
            <p style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
              {quiz.totalMarks || 0} درجة
            </p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>المدة</p>
            <p style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
              {quiz.duration || 0} دقيقة
            </p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "#6b7280" }}>درجة النجاح</p>
            <p style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
              {quiz.passingMarks || 0} درجة
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          fontWeight: "600",
        }}
      >
        جاري تحميل البيانات...
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          padding: "30px",
          background: "#f4f5fa",
          minHeight: "100vh",
          fontFamily: "Cairo, sans-serif",
        }}
      >
        <h2
          style={{ fontSize: "28px", fontWeight: "700", marginBottom: "20px" }}
        >
          إدارة الدروس 📚
        </h2>

        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "20px",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "25px",
                borderRadius: "20px",
                boxShadow: "0 10px 30px rgba(102,126,234,0.3)",
              }}
            >
              <h4>إجمالي الدروس</h4>
              <h3 style={{ fontSize: "26px", fontWeight: "700" }}>
                {stats.totalLessons}
              </h3>
            </div>
            <div
              style={{
                background:
                  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
                padding: "25px",
                borderRadius: "20px",
                boxShadow: "0 10px 30px rgba(245,87,108,0.3)",
              }}
            >
              <h4>الدروس النشطة</h4>
              <h3 style={{ fontSize: "26px", fontWeight: "700" }}>
                {stats.activeLessons}
              </h3>
            </div>
            <div
              style={{
                background:
                  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "white",
                padding: "25px",
                borderRadius: "20px",
                boxShadow: "0 10px 30px rgba(79,172,254,0.3)",
              }}
            >
              <h4>الدروس الفرعية</h4>
              <h3 style={{ fontSize: "26px", fontWeight: "700" }}>
                {stats.totalSubLessons}
              </h3>
            </div>
            <div
              style={{
                background:
                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                padding: "25px",
                borderRadius: "20px",
                boxShadow: "0 10px 30px rgba(16,185,129,0.3)",
              }}
            >
              <h4>اختبارات الكويز</h4>
              <h3 style={{ fontSize: "26px", fontWeight: "700" }}>
                {stats.totalQuizzes}
              </h3>
            </div>
          </div>
        )}

        <div
          style={{
            background: "#fff",
            padding: "25px",
            borderRadius: "20px",
            boxShadow: "0 5px 20px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              flexWrap: "wrap",
              gap: "15px",
            }}
          >
            <h3 style={{ fontWeight: "700", fontSize: "20px" }}>دروسي 📚</h3>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  background: "#f3f4f6",
                  borderRadius: "12px",
                  padding: "4px",
                  gap: "4px",
                }}
              >
                <button
                  onClick={() => setViewMode("cards")}
                  style={{
                    background: viewMode === "cards" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                    color: viewMode === "cards" ? "white" : "#6b7280",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <i className="fas fa-th-large"></i> بطاقات
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  style={{
                    background: viewMode === "table" ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                    color: viewMode === "table" ? "white" : "#6b7280",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <i className="fas fa-table"></i> جدول
                </button>
              </div>
              <button
                onClick={handleAddLesson}
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <i className="fas fa-plus"></i> إضافة درس
              </button>
            </div>
          </div>

          {viewMode === "cards" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "20px",
              }}
            >
              {lessons.map((lesson) => (
                <div key={getLessonId(lesson)} className="modern-card">
                  <div className="modern-card-image">
                    <i className={`fas ${getTypeIcon(lesson.type)}`}></i>
                    <span
                      className={`status-badge ${
                        lesson.active ? "active" : "inactive"
                      }`}
                    >
                      {lesson.active ? "🟢 نشط" : "🔴 غير نشط"}
                    </span>
                  </div>
                  <div className="modern-card-body">
                    <h3
                      className="lesson-title"
                      style={{
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                      }}
                    >
                      {lesson.name}
                    </h3>
                    <div className="course-details">
                      <p>
                        <i className="fas fa-book"></i> 
                        {lesson.course?.length > 0 
                          ? lesson.course.length === 1
                            ? lesson.course[0]?.name
                            : `${lesson.course.length} كورس`
                          : "غير محدد"}
                      </p>
                      {lesson.subLessons && lesson.subLessons.length > 0 && (
                        <p>
                          <i className="fas fa-layer-group"></i> 
                          {lesson.subLessons.length} درس فرعي
                        </p>
                      )}
                      {lesson.time > 0 && (
                        <p>
                          <i className="fas fa-clock"></i> 
                          {formatTime(lesson.time)}
                        </p>
                      )}
                      {lesson.type === "quiz" && (
                        <p style={{ color: "#10b981", fontWeight: "600" }}>
                          <i className="fas fa-clipboard-check"></i> اختبار
                        </p>
                      )}
                    </div>
                    
                    {/* عرض تفاصيل الكويز */}
                    {lesson.type === "quiz" && renderQuizDetails(lesson)}
                    
                    <div className="modern-card-actions">
                      <button className="details" onClick={() => handleShowDetails(lesson)}>
                        <i className="fas fa-info-circle"></i> تفاصيل
                      </button>
                      <button className="edit" onClick={() => handleEditLesson(lesson)}>
                        <i className="fas fa-edit"></i> تعديل
                      </button>
                      <button className="delete" onClick={() => handleDeleteLesson(lesson)}>
                        <i className="fas fa-trash"></i> حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="courses-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th><i className="fas fa-book"></i> الكورس</th>
                    <th><i className="fas fa-layer-group"></i> الدروس الفرعية</th>
                    <th><i className="fas fa-clock"></i> المدة</th>
                    <th><i className="fas fa-clipboard-check"></i> النوع</th>
                    <th><i className="fas fa-toggle-on"></i> الحالة</th>
                    <th><i className="fas fa-cogs"></i> الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson) => (
                    <tr key={getLessonId(lesson)}>
                      <td data-label="الاسم">
                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <i className={`fas ${getTypeIcon(lesson.type)}`} style={{ color: lesson.type === "quiz" ? "#10b981" : "#667eea" }}></i>
                          <span style={{ fontWeight: "600" }}>{lesson.name || "درس بدون اسم"}</span>
                        </span>
                      </td>
                      <td data-label="الكورس" style={{ fontWeight: "600" }}>
                        {lesson.course && Array.isArray(lesson.course) && lesson.course.length > 0 
                          ? lesson.course.length === 1
                            ? (lesson.course[0]?.name || "كورس بدون اسم")
                            : `${lesson.course.length} كورس`
                          : "غير محدد"}
                      </td>
                      <td data-label="الدروس الفرعية">
                        <span style={{ color: "#667eea", fontWeight: "600" }}>
                          {lesson.subLessons?.length || 0} درس
                        </span>
                      </td>
                      <td data-label="المدة">
                        <span style={{ color: "#667eea", fontWeight: "600" }}>
                          <i className="fas fa-clock"></i> {formatTime(lesson.time)}
                        </span>
                      </td>
                      <td data-label="النوع">
                        <span style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: lesson.type === "quiz" ? "white" : "#1f2937",
                          background: lesson.type === "quiz" ? "#10b981" : "#f3f4f6",
                        }}>
                          {getTypeLabel(lesson.type)}
                        </span>
                      </td>
                      <td data-label="الحالة">
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "white",
                            background: lesson.active ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {lesson.active ? "🟢 نشط" : "🔴 غير نشط"}
                        </span>
                      </td>
                      <td data-label="الإجراءات">
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleEditLesson(lesson)}
                            style={{
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <i className="fas fa-edit"></i> تعديل
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson)}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <i className="fas fa-trash"></i> حذف
                          </button>
                          <button
                            onClick={() => handleShowDetails(lesson)}
                            style={{
                              background: "#10b981",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <i className="fas fa-info-circle"></i> تفاصيل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal إضافة/تعديل درس رئيسي */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              <i className={`fas ${modalMode === "add" ? "fa-plus-circle" : "fa-edit"}`}></i>{" "}
              {modalMode === "add" ? "إضافة درس جديد" : "تعديل الدرس"}
            </h3>
            
            <input
              type="text"
              className="form-input"
              placeholder="اسم الدرس *"
              value={currentLesson.name}
              onChange={(e) => setCurrentLesson({ ...currentLesson, name: e.target.value })}
              required
            />

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                <i className="fas fa-book"></i> اختر الكورسات *
              </label>
              <div style={{ 
                maxHeight: "150px", 
                overflowY: "auto", 
                border: "2px solid #e5e7eb", 
                borderRadius: "10px",
                padding: "10px",
                background: "#f9fafb"
              }}>
                {courses.map((course) => (
                  <label 
                    key={course._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px",
                      cursor: "pointer",
                      borderRadius: "8px",
                      marginBottom: "5px",
                      background: currentLesson.course.includes(course._id) ? "#e0e7ff" : "white",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={currentLesson.course.includes(course._id)}
                      onChange={() => handleCourseSelection(course._id)}
                      style={{
                        marginLeft: "10px",
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                    <span style={{ fontWeight: currentLesson.course.includes(course._id) ? "600" : "400" }}>
                      {course.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* نوع الدرس مع خيار الكويز */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                <i className="fas fa-file-alt"></i> نوع الدرس *
              </label>
              <select
                className="form-input"
                value={currentLesson.type}
                onChange={(e) => handleLessonTypeChange(e.target.value)}
              >
                <option value="section">📁 قسم (يحتوي على دروس فرعية)</option>
                <option value="video">🎥 فيديو</option>
                <option value="pdf">📄 PDF</option>
                <option value="image">🖼️ صورة</option>
                <option value="quiz">📝 اختبار (كويز)</option>
              </select>
            </div>

            {/* عرض حقل اختيار الكويز إذا كان النوع "quiz" */}
            {currentLesson.type === "quiz" && (
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                  <i className="fas fa-clipboard-check"></i> اختر كويز *
                </label>
                {quizzes.length === 0 ? (
                  <div style={{
                    padding: "15px",
                    background: "#fef3c7",
                    borderRadius: "10px",
                    textAlign: "center",
                    color: "#92400e",
                  }}>
                    <i className="fas fa-exclamation-triangle"></i> لا توجد كويزات، يجب إنشاء كويز أولاً من صفحة إدارة الكويزات
                  </div>
                ) : (
                  <select
                    className="form-input"
                    value={currentLesson.selectedQuizId || ""}
                    onChange={(e) => handleQuizSelection(e.target.value)}
                  >
                    <option value="">-- اختر كويز --</option>
                    {quizzes.map((quiz) => (
                      <option key={quiz._id} value={quiz._id}>
                        {quiz.title} ({quiz.questions?.length || 0} سؤال، {quiz.totalMarks || 0} درجة)
                      </option>
                    ))}
                  </select>
                )}
                
                {/* عرض تفاصيل الكويز المختار */}
                {currentLesson.selectedQuizId && (
                  <div style={{
                    marginTop: "10px",
                    padding: "12px",
                    background: "#f0f9ff",
                    borderRadius: "8px",
                    border: "1px solid #bae6fd",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "14px", color: "#0369a1" }}>عدد الأسئلة:</span>
                      <span style={{ fontWeight: "600" }}>
                        {quizzes.find(q => q._id === currentLesson.selectedQuizId)?.questions?.length || 0}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "14px", color: "#0369a1" }}>الدرجة الكلية:</span>
                      <span style={{ fontWeight: "600" }}>
                        {quizzes.find(q => q._id === currentLesson.selectedQuizId)?.totalMarks || 0}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "14px", color: "#0369a1" }}>المدة:</span>
                      <span style={{ fontWeight: "600" }}>
                        {quizzes.find(q => q._id === currentLesson.selectedQuizId)?.duration || 0} دقيقة
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* إخفاء حقل الرابط إذا كان النوع "quiz" */}
            {currentLesson.type !== "quiz" && (
              <input
                type="url"
                className="form-input"
                placeholder="رابط الملف (اختياري للقسم)"
                value={currentLesson.url}
                onChange={(e) => setCurrentLesson({ ...currentLesson, url: e.target.value })}
              />
            )}

            <input
              type="number"
              className="form-input"
              placeholder="المدة (بالثواني)"
              value={currentLesson.time}
              onChange={(e) => setCurrentLesson({ ...currentLesson, time: parseInt(e.target.value) || 0 })}
            />

            <select
              className="form-input"
              value={currentLesson.active ? "نشط" : "متوقف"}
              onChange={(e) => setCurrentLesson({ ...currentLesson, active: e.target.value === "نشط" })}
            >
              <option value="نشط">نشط</option>
              <option value="متوقف">متوقف</option>
            </select>

            {/* إدارة الدروس الفرعية */}
            <div style={{ marginTop: "20px", marginBottom: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h4 style={{ fontWeight: "700", fontSize: "16px" }}>
                  <i className="fas fa-layer-group"></i> الدروس الفرعية ({currentLesson.subLessons.length})
                </h4>
                <button
                  onClick={handleAddSubLesson}
                  style={{
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <i className="fas fa-plus"></i> إضافة درس فرعي
                </button>
              </div>

              {currentLesson.subLessons.length > 0 ? (
                <div style={{ 
                  maxHeight: "200px", 
                  overflowY: "auto", 
                  border: "2px solid #e5e7eb", 
                  borderRadius: "10px",
                  padding: "10px",
                  background: "#f9fafb"
                }}>
                  {currentLesson.subLessons.map((subLesson, index) => (
                    <div 
                      key={index}
                      style={{
                        background: "white",
                        padding: "12px",
                        borderRadius: "8px",
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: "600", marginBottom: "4px" }}>
                          <i className={`fas ${getTypeIcon(subLesson.type)}`} style={{ 
                            color: subLesson.type === "quiz" ? "#10b981" : "#667eea", 
                            marginLeft: "6px" 
                          }}></i>
                          {subLesson.name}
                          {subLesson.type === "quiz" && (
                            <span style={{
                              marginRight: "8px",
                              fontSize: "12px",
                              background: "#10b981",
                              color: "white",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}>
                              اختبار
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: "12px", color: "#6b7280" }}>
                          {getTypeLabel(subLesson.type)} • {formatTime(subLesson.time)} • {subLesson.free ? "مجاني" : "مدفوع"}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => handleEditSubLesson(subLesson, index)}
                          style={{
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteSubLesson(index)}
                          style={{
                            background: "#ef4444",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "#6b7280", padding: "20px", background: "#f9fafb", borderRadius: "10px" }}>
                  <i className="fas fa-info-circle"></i> لا توجد دروس فرعية بعد
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button className="save-btn" onClick={handleSaveLesson}>
                <i className="fas fa-save"></i> حفظ
              </button>
              <button className="cancel-btn" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal إضافة/تعديل درس فرعي */}
      {showSubLessonModal && (
        <div className="modal-overlay" onClick={() => setShowSubLessonModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              <i className={`fas ${editingSubLessonIndex !== null ? "fa-edit" : "fa-plus-circle"}`}></i>{" "}
              {editingSubLessonIndex !== null ? "تعديل درس فرعي" : "إضافة درس فرعي"}
            </h3>
            
            <input
              type="text"
              className="form-input"
              placeholder="اسم الدرس الفرعي *"
              value={currentSubLesson.name}
              onChange={(e) => setCurrentSubLesson({ ...currentSubLesson, name: e.target.value })}
              required
            />

            {/* نوع الدرس الفرعي مع خيار الكويز */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                <i className="fas fa-file-alt"></i> نوع الدرس الفرعي *
              </label>
              <select
                className="form-input"
                value={currentSubLesson.type}
                onChange={(e) => handleSubLessonTypeChange(e.target.value)}
              >
                <option value="video">🎥 فيديو</option>
                <option value="pdf">📄 PDF</option>
                <option value="image">🖼️ صورة</option>
                <option value="quiz">📝 اختبار (كويز)</option>
              </select>
            </div>

            {/* عرض حقل اختيار الكويز إذا كان النوع "quiz" */}
            {currentSubLesson.type === "quiz" ? (
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>
                  <i className="fas fa-clipboard-check"></i> اختر كويز *
                </label>
                {quizzes.length === 0 ? (
                  <div style={{
                    padding: "15px",
                    background: "#fef3c7",
                    borderRadius: "10px",
                    textAlign: "center",
                    color: "#92400e",
                  }}>
                    <i className="fas fa-exclamation-triangle"></i> لا توجد كويزات، يجب إنشاء كويز أولاً من صفحة إدارة الكويزات
                  </div>
                ) : (
                  <select
                    className="form-input"
                    value={currentSubLesson.selectedQuizId || ""}
                    onChange={(e) => handleSubLessonQuizSelection(e.target.value)}
                  >
                    <option value="">-- اختر كويز --</option>
                    {quizzes.map((quiz) => (
                      <option key={quiz._id} value={quiz._id}>
                        {quiz.title} ({quiz.questions?.length || 0} سؤال، {quiz.totalMarks || 0} درجة)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <input
                type="url"
                className="form-input"
                placeholder="رابط الملف *"
                value={currentSubLesson.url}
                onChange={(e) => setCurrentSubLesson({ ...currentSubLesson, url: e.target.value })}
                required
              />
            )}

            <input
              type="number"
              className="form-input"
              placeholder="المدة (بالثواني)"
              value={currentSubLesson.time}
              onChange={(e) => setCurrentSubLesson({ ...currentSubLesson, time: parseInt(e.target.value) || 0 })}
            />

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={currentSubLesson.free}
                  onChange={(e) => setCurrentSubLesson({ ...currentSubLesson, free: e.target.checked })}
                  style={{ marginLeft: "10px", width: "18px", height: "18px" }}
                />
                <span style={{ fontWeight: "600" }}>درس مجاني</span>
              </label>
            </div>

            <select
              className="form-input"
              value={currentSubLesson.active ? "نشط" : "متوقف"}
              onChange={(e) => setCurrentSubLesson({ ...currentSubLesson, active: e.target.value === "نشط" })}
            >
              <option value="نشط">نشط</option>
              <option value="متوقف">متوقف</option>
            </select>

            <div className="modal-actions">
              <button className="save-btn" onClick={handleSaveSubLesson}>
                <i className="fas fa-save"></i> حفظ
              </button>
              <button className="cancel-btn" onClick={() => setShowSubLessonModal(false)}>
                <i className="fas fa-times"></i> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal تفاصيل الدرس */}
      {showDetailsModal && selectedLesson && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="details-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-details-btn"
              onClick={() => setShowDetailsModal(false)}
            >
              <i className="fas fa-times"></i>
            </button>
            
            <div className="details-header">
              <i className={`fas ${getTypeIcon(selectedLesson.type)}`} style={{ 
                color: selectedLesson.type === "quiz" ? "#10b981" : "#667eea",
                fontSize: "48px" 
              }}></i>
              <div className="details-badge">
                <span className={selectedLesson.active ? "badge-active" : "badge-inactive"}>
                  {selectedLesson.active ? "🟢 نشط" : "🔴 غير نشط"}
                </span>
              </div>
            </div>

            <div className="details-body">
              <h3
                className="lesson-title"
                style={{
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "normal",
                  fontSize: "24px",
                  marginBottom: "20px",
                }}
              >
                {selectedLesson.name}
              </h3>

              <div className="details-info-grid">
                <div className="info-item">
                  <i className="fas fa-book"></i>
                  <div>
                    <span className="info-label">الكورسات</span>
                    <span className="info-value">
                      {selectedLesson.course?.length > 0 
                        ? `${selectedLesson.course.length} كورس`
                        : "غير محدد"}
                    </span>
                  </div>
                </div>

                <div className="info-item">
                  <i className="fas fa-layer-group"></i>
                  <div>
                    <span className="info-label">الدروس الفرعية</span>
                    <span className="info-value">{selectedLesson.subLessons?.length || 0} درس</span>
                  </div>
                </div>

                <div className="info-item">
                  <i className="fas fa-clock"></i>
                  <div>
                    <span className="info-label">المدة</span>
                    <span className="info-value">{formatTime(selectedLesson.time)}</span>
                  </div>
                </div>

                <div className="info-item">
                  <i className="fas fa-file"></i>
                  <div>
                    <span className="info-label">نوع الملف</span>
                    <span className="info-value" style={{ 
                      color: selectedLesson.type === "quiz" ? "#10b981" : "#374151",
                      fontWeight: "600" 
                    }}>
                      {getTypeLabel(selectedLesson.type)}
                    </span>
                  </div>
                </div>
              </div>

              {/* عرض تفاصيل الكويز إذا كان النوع كويز */}
              {selectedLesson.type === "quiz" && selectedLesson.quiz && (
                <div style={{
                  background: "#f0f9ff",
                  borderRadius: "15px",
                  padding: "20px",
                  marginTop: "20px",
                  marginBottom: "20px",
                  border: "2px solid #bae6fd",
                }}>
                  <h4 style={{ 
                    fontSize: "18px", 
                    fontWeight: "700", 
                    marginBottom: "15px", 
                    color: "#0369a1",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px"
                  }}>
                    <i className="fas fa-clipboard-check"></i> تفاصيل الاختبار
                  </h4>
                  
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
                    gap: "15px",
                    marginBottom: "20px"
                  }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        background: "#dcfce7",
                        color: "#166534",
                        padding: "15px",
                        borderRadius: "10px",
                        marginBottom: "8px"
                      }}>
                        <i className="fas fa-question-circle" style={{ fontSize: "24px" }}></i>
                      </div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px" }}>عدد الأسئلة</p>
                      <p style={{ fontSize: "18px", fontWeight: "700", color: "#1f2937" }}>
                        {selectedLesson.quiz.questions?.length || 0}
                      </p>
                    </div>
                    
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        background: "#dbeafe",
                        color: "#1e40af",
                        padding: "15px",
                        borderRadius: "10px",
                        marginBottom: "8px"
                      }}>
                        <i className="fas fa-star" style={{ fontSize: "24px" }}></i>
                      </div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px" }}>الدرجة الكلية</p>
                      <p style={{ fontSize: "18px", fontWeight: "700", color: "#1f2937" }}>
                        {selectedLesson.quiz.totalMarks || 0}
                      </p>
                    </div>
                    
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        background: "#fef3c7",
                        color: "#92400e",
                        padding: "15px",
                        borderRadius: "10px",
                        marginBottom: "8px"
                      }}>
                        <i className="fas fa-clock" style={{ fontSize: "24px" }}></i>
                      </div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px" }}>المدة</p>
                      <p style={{ fontSize: "18px", fontWeight: "700", color: "#1f2937" }}>
                        {selectedLesson.quiz.duration || 0} دقيقة
                      </p>
                    </div>
                    
                    <div style={{ textAlign: "center" }}>
                      <div style={{
                        background: "#dcfce7",
                        color: "#166534",
                        padding: "15px",
                        borderRadius: "10px",
                        marginBottom: "8px"
                      }}>
                        <i className="fas fa-check-circle" style={{ fontSize: "24px" }}></i>
                      </div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px" }}>درجة النجاح</p>
                      <p style={{ fontSize: "18px", fontWeight: "700", color: "#1f2937" }}>
                        {selectedLesson.quiz.passingMarks || 0}
                      </p>
                    </div>
                  </div>
                  
                  {selectedLesson.quiz.questions && selectedLesson.quiz.questions.length > 0 && (
                    <div>
                      <h5 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "10px", color: "#374151" }}>
                        <i className="fas fa-list"></i> الأسئلة:
                      </h5>
                      <div style={{ 
                        maxHeight: "200px", 
                        overflowY: "auto",
                        background: "white",
                        borderRadius: "10px",
                        padding: "10px"
                      }}>
                        {selectedLesson.quiz.questions.slice(0, 5).map((q, idx) => (
                          <div key={idx} style={{
                            padding: "10px",
                            marginBottom: "8px",
                            background: "#f9fafb",
                            borderRadius: "8px",
                            borderLeft: "3px solid #10b981"
                          }}>
                            <p style={{ fontWeight: "600", marginBottom: "5px" }}>
                              {idx + 1}. {q.question}
                            </p>
                            <p style={{ fontSize: "12px", color: "#6b7280" }}>
                              النوع: {q.type} • الدرجة: {q.marks || 1}
                            </p>
                          </div>
                        ))}
                        {selectedLesson.quiz.questions.length > 5 && (
                          <p style={{ textAlign: "center", color: "#6b7280", padding: "10px" }}>
                            + {selectedLesson.quiz.questions.length - 5} أسئلة أخرى
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedLesson.course?.length > 0 && (
                <div style={{ marginTop: "20px", marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px", color: "#374151" }}>
                    <i className="fas fa-list"></i> الكورسات المرتبطة:
                  </h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    {selectedLesson.course.map((course) => (
                      <span 
                        key={course._id}
                        style={{
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          padding: "8px 16px",
                          borderRadius: "20px",
                          fontSize: "14px",
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <i className="fas fa-book"></i> {course.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedLesson.subLessons && selectedLesson.subLessons.length > 0 && (
                <div style={{ marginTop: "20px", marginBottom: "20px" }}>
                  <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px", color: "#374151" }}>
                    <i className="fas fa-layer-group"></i> الدروس الفرعية ({selectedLesson.subLessons.length}):
                  </h4>
                  <div style={{ 
                    maxHeight: "300px", 
                    overflowY: "auto",
                    border: "2px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "10px",
                    background: "#f9fafb"
                  }}>
                    {selectedLesson.subLessons.map((subLesson, index) => (
                      <div 
                        key={index}
                        style={{
                          background: "white",
                          padding: "15px",
                          borderRadius: "10px",
                          marginBottom: "10px",
                          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                          <h5 style={{ fontWeight: "600", fontSize: "15px", margin: 0 }}>
                            <i className={`fas ${getTypeIcon(subLesson.type)}`} style={{ 
                              color: subLesson.type === "quiz" ? "#10b981" : "#667eea", 
                              marginLeft: "6px" 
                            }}></i>
                            {subLesson.name}
                            {subLesson.type === "quiz" && (
                              <span style={{
                                marginRight: "8px",
                                fontSize: "11px",
                                background: "#10b981",
                                color: "white",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}>
                                اختبار
                              </span>
                            )}
                          </h5>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {subLesson.free && (
                              <span style={{
                                background: "#10b981",
                                color: "white",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "600",
                              }}>
                                مجاني
                              </span>
                            )}
                            <span style={{
                              background: subLesson.active ? "#22c55e" : "#ef4444",
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: "600",
                            }}>
                              {subLesson.active ? "نشط" : "متوقف"}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: "13px", color: "#6b7280" }}>
                          <p style={{ margin: "4px 0" }}>
                            <i className="fas fa-file"></i> النوع: {getTypeLabel(subLesson.type)}
                          </p>
                          <p style={{ margin: "4px 0" }}>
                            <i className="fas fa-clock"></i> المدة: {formatTime(subLesson.time)}
                          </p>
                          {subLesson.url && subLesson.type !== "quiz" && (
                            <a 
                              href={subLesson.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                color: "#667eea",
                                textDecoration: "none",
                                fontSize: "12px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                marginTop: "6px",
                              }}
                            >
                              <i className="fas fa-external-link-alt"></i> فتح الملف
                            </a>
                          )}
                          {subLesson.type === "quiz" && subLesson.quiz && (
                            <div style={{ marginTop: "8px", padding: "8px", background: "#f0f9ff", borderRadius: "6px" }}>
                              <p style={{ margin: "0", fontSize: "12px", color: "#0369a1" }}>
                                <i className="fas fa-clipboard-check"></i> اختبار: {subLesson.quiz.title} ({subLesson.quiz.questions?.length || 0} سؤال)
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLesson.url && selectedLesson.type !== "quiz" && (
                <div style={{ marginTop: "20px" }}>
                  <a 
                    href={selectedLesson.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      background: "#667eea",
                      color: "white",
                      borderRadius: "10px",
                      textDecoration: "none",
                      fontWeight: "600",
                    }}
                  >
                    <i className="fas fa-external-link-alt"></i> فتح الملف الرئيسي
                  </a>
                </div>
              )}

              {selectedLesson.type === "quiz" && (
                <div style={{ marginTop: "20px" }}>
                  <button
                    onClick={() => {
                      // يمكن إضافة وظيفة معاينة الاختبار هنا
                      alert("يمكن معاينة الاختبار من صفحة الدورة للطلاب");
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      background: "#10b981",
                      color: "white",
                      borderRadius: "10px",
                      textDecoration: "none",
                      fontWeight: "600",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <i className="fas fa-eye"></i> معاينة الاختبار
                  </button>
                </div>
              )}

              <div className="details-actions">
                <button 
                  className="btn-edit-details"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEditLesson(selectedLesson);
                  }}
                >
                  <i className="fas fa-edit"></i> تعديل الدرس
                </button>
                <button 
                  className="btn-delete-details"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleDeleteLesson(selectedLesson);
                  }}
                >
                  <i className="fas fa-trash"></i> حذف الدرس
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}