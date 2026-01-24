import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { showPopup } from "../utils/popup";
import "../style/courseDetails.css";

const CourseDetailsSkeleton = () => (
  <div className="course-details-container">
    <div className="course-header skeleton" style={{ height: '300px' }}></div>
    <div className="course-main-content">
      <div className="course-description-section">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
      </div>
      <div className="course-sidebar">
        <div className="pricing-card skeleton" style={{ height: '400px' }}></div>
      </div>
    </div>
  </div>
);

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [quizResults, setQuizResults] = useState({});

  useEffect(() => {
    const hasToken = document.cookie
      .split("; ")
      .some(cookie => cookie.startsWith("token="));

    if (!hasToken) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // favorite (مفضلة) localStorage handling
  useEffect(() => {
    try {
      const favRaw = localStorage.getItem('favorites');
      const favs = favRaw ? JSON.parse(favRaw) : [];
      setFavorite(Boolean(course && favs.includes(course._id)));
    } catch (e) {
      // ignore parse errors
    }
  }, [course?._id]);

  const toggleFavorite = () => {
    if (!course || !course._id) return;
    try {
      const favRaw = localStorage.getItem('favorites');
      const favs = favRaw ? JSON.parse(favRaw) : [];
      const idx = favs.indexOf(course._id);
      if (idx === -1) {
        favs.push(course._id);
        setFavorite(true);
      } else {
        favs.splice(idx, 1);
        setFavorite(false);
      }
      localStorage.setItem('favorites', JSON.stringify(favs));
    } catch (e) {
      console.error('favorite toggle error', e);
    }
  };

const openContentPage = (lessonId, isSubLesson = false, subLessonId = null) => {
  if (!lessonId || !courseId) return;

  const path = `/content/${lessonId}`;
  const queryParams = new URLSearchParams();

  // ✅ إضافة id الكورس
  queryParams.append('courseId', courseId);

  if (isSubLesson && subLessonId) {
    queryParams.append('subLessonId', subLessonId);
  }

  navigate(`${path}?${queryParams.toString()}`);
};


  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return hours > 0
      ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLessonIcon = (type) => {
    const icons = {
      video: "fa-video",
      pdf: "fa-file-pdf",
      image: "fa-image",
      section: "fa-folder-open",
      quiz: "fa-clipboard-check",
    };
    return icons[type] || "fa-file";
  };

  const checkLessonAccess = (lesson) => {
    if (isEnrolled || lesson.free) return true;
    if (lesson.subLessons?.some(sub => sub.free)) return true;
    return false;
  };

  const computeTotalSeconds = (lessonsArr) => {
    if (!Array.isArray(lessonsArr)) return 0;
    let total = 0;
    lessonsArr.forEach(l => {
      if (l.subLessons && Array.isArray(l.subLessons) && l.subLessons.length > 0) {
        l.subLessons.forEach(s => {
          total += Number(s.time) || 0;
        });
      } else {
        total += Number(l.time) || 0;
      }
    });
    return total;
  };

  const hideUrlIfNotEnrolled = (lesson, enrolled) => {
    if (!lesson) return lesson;
    const cloned = { ...lesson };

    if (!enrolled && !cloned.free) cloned.url = "";

    if (cloned.subLessons && Array.isArray(cloned.subLessons)) {
      cloned.subLessons = cloned.subLessons.map(sub => {
        const clonedSub = { ...sub };
        if (!enrolled && !clonedSub.free) clonedSub.url = "";
        return clonedSub;
      });
    }
    return cloned;
  };

  // جلب نتائج الاختبارات للطالب
  const fetchQuizResults = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/result/my-results`, {
        withCredentials: true,
      });
      
      const results = {};
      response.data.forEach(result => {
        if (result.lesson && result.isSubLesson && result.subLessonId) {
          results[result.subLessonId] = result;
        } else if (result.lesson) {
          results[result.lesson] = result;
        }
      });
      
      setQuizResults(results);
    } catch (err) {
      console.error("Error fetching quiz results:", err);
    }
  };

  // --- جلب البيانات ---
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        if (!mounted) return;
        setLoading(true);
        setError("");

        const [courseRes, checkEnrollRes] = await Promise.all([
          axios.get(`http://localhost:5001/course/subscription/${courseId}`, { withCredentials: true }),
          axios.get(`http://localhost:5001/course/my`, { withCredentials: true }).catch(() => ({ data: [] }))
        ]);

        const courseData = courseRes.data;
        if (!courseData) throw new Error("Course data not found");

        const userEnrolled = Array.isArray(checkEnrollRes.data) &&
          checkEnrollRes.data.some(c => c._id === courseId);

        if (!mounted) return;
        setIsEnrolled(userEnrolled);
        setCourse(courseData);

        let processedLessons = [];

        try {
          const lessonsRes = await axios.get(
            `http://localhost:5001/lesson/searchSub/${courseId}`,
            { withCredentials: true }
          );

          const lessonsData = lessonsRes.data?.course?.lessons || lessonsRes.data;

          if (lessonsData && Array.isArray(lessonsData)) {
            processedLessons = lessonsData.map((lesson, index) => {
              const baseLesson = {
                _id: lesson._id,
                name: lesson.name,
                type: lesson.type || "section",
                time: lesson.time || 0,
                free: lesson.free || false,
                active: lesson.active !== false,
                description: lesson.description || "",
                quiz: lesson.quiz || null,
                subLessons: (lesson.subLessons || []).map(sub => ({
                  ...sub,
                  quiz: sub.quiz || null,
                })),
                order: index
              };

              return baseLesson;
            });
          }
        } catch (lessonErr) {
          console.log("خطأ في جلب الدروس:", lessonErr.message);
        }

        if (processedLessons.length === 0 && Array.isArray(courseData.lessons)) {
          processedLessons = courseData.lessons.map((l, idx) => hideUrlIfNotEnrolled({
            ...l,
            order: idx
          }, userEnrolled));
        } else if (processedLessons.length === 0 && courseData.lessons) {
          console.warn('courseData.lessons is not an array, skipping fallback mapping:', courseData.lessons);
          processedLessons = [];
        }

        processedLessons = processedLessons.map(l => hideUrlIfNotEnrolled(l, userEnrolled));

        if (!mounted) return;
        setLessons(processedLessons);
        if (processedLessons.length > 0) setSelectedLesson(processedLessons[0]);

        // جلب النتائج بعد تحميل الدروس
        if (userEnrolled) {
          fetchQuizResults();
        }

      } catch (err) {
        console.error(err);
        if (!mounted) return;
        setError(err.response?.status === 401 ? "يجب تسجيل الدخول" : "حدث خطأ في جلب البيانات");
        if (err.response?.status === 401) navigate("/login");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [courseId, navigate]);

  useEffect(() => {
    if (isEnrolled && courseId) {
      fetchQuizResults();
    }
  }, [isEnrolled, courseId]);

  const handleEnroll = async () => {
    try {
      const { data } = await axios.get("http://localhost:5001/auth/me", { withCredentials: true });
      if (!data?.id) return navigate("/login");

      const enrollRes = await axios.post(`http://localhost:5001/course/enroll/${courseId}`, {}, { withCredentials: true });

      if (enrollRes.data.success) {
        setIsEnrolled(true);
        setLessons(prev => prev.map(l => hideUrlIfNotEnrolled(l, true)));
        setSelectedLesson(prev => prev || (lessons[0] || null));
        
        fetchQuizResults();
        
        showPopup("تم الاشتراك بنجاح!", { okText: 'حسناً', background: '#059669' });
      }
    } catch (err) {
      showPopup(err.response?.data?.msg || "خطأ في الاشتراك", { okText: 'حسناً', background: '#b91c1c' });
    }
  };

  const handleStartQuiz = (quiz) => {
    if (!isEnrolled && !quiz.free) {
      showPopup("يجب الاشتراك في الكورس أولاً لمحاولة الاختبار", { 
        okText: 'حسناً', 
        background: '#b91c1c' 
      });
      return;
    }

    // الانتقال لصفحة الاختبار
    navigate(`/quiz/${quiz._id}?isSubLesson=${quiz.isSubLesson || false}&subLessonId=${quiz.subLessonId || ''}`);
    
  };

  // دالة جديدة لفتح صفحة الاختبار
  const openQuizPage = (quiz) => {
    if (!isEnrolled && !quiz.free) {
      showPopup("يجب الاشتراك في الكورس أولاً لعرض صفحة الاختبار", { 
        okText: 'حسناً', 
        background: '#b91c1c' 
      });
      return;
    }

    // الانتقال لصفحة عرض الاختبار
    navigate(`/quiz/page/${quiz._id}?isSubLesson=${quiz.isSubLesson || false}&subLessonId=${quiz.subLessonId || ''}`);
  };

  const getQuizResult = (quiz) => {
    const quizId = quiz.isSubLesson ? quiz.subLessonId : quiz._id;
    return quizResults[quizId];
  };

  const getQuizStatus = (quiz) => {
    const result = getQuizResult(quiz);
    if (!result) return "not-attempted";
    if (result.status === "submitted") return "submitted";
    if (result.passed) return "passed";
    return "failed";
  };

  const getStatusColor = (status) => {
    const colors = {
      "not-attempted": "#6b7280",
      "submitted": "#f59e0b",
      "passed": "#10b981",
      "failed": "#ef4444"
    };
    return colors[status] || "#6b7280";
  };

  const getStatusText = (status) => {
    const texts = {
      "not-attempted": "لم يتم البدء",
      "submitted": "قيد التصحيح",
      "passed": "ناجح",
      "failed": "غير ناجح"
    };
    return texts[status] || "غير معروف";
  };

  // دالة لعرض معاينة الاختبار مع زر البدء
  const renderQuizPreview = (lesson, isSubLesson = false, subLesson = null) => {
    const quiz = isSubLesson ? subLesson?.quiz : lesson?.quiz;
    if (!quiz) return null;

    const quizData = {
      ...quiz,
      _id: lesson._id,
      isSubLesson,
      subLessonId: subLesson?._id,
      free: isSubLesson ? subLesson?.free : lesson?.free,
      lessonName: isSubLesson ? subLesson?.name : lesson?.name
    };

    const result = getQuizResult(quizData);
    const status = getQuizStatus(quizData);
    const isLocked = !isEnrolled && !quizData.free;

    return (
      <div className="quiz-preview">
        <div className="quiz-preview-header">
          <div className="quiz-icon">
            <i className="fa-solid fa-clipboard-check"></i>
          </div>
          <div className="quiz-info">
            <h4>{quiz.title || quizData.lessonName}</h4>
            <p className="quiz-description">{quiz.description || "اختبار تقييمي"}</p>
            <div className="quiz-meta">
              <span><i className="fa-solid fa-question-circle"></i> {quiz.questions?.length || 0} سؤال</span>
              <span><i className="fa-solid fa-clock"></i> {quiz.duration || 0} دقيقة</span>
              <span><i className="fa-solid fa-star"></i> {quiz.totalMarks || 0} درجة</span>
            </div>
          </div>
        </div>

        {result && (
          <div className="quiz-result-preview">
            <div className="result-summary">
              <span>نتيجتك:</span>
              <span className="score">{result.score}/{result.totalMarks}</span>
            </div>
          
            <div className="status-badge" style={{ color: getStatusColor(status) }}>
              <i className={`fa-solid ${status === "passed" ? "fa-check-circle" : "fa-times-circle"}`}></i>
              {getStatusText(status)}
            </div>
          </div>
        )}

        <div className="quiz-actions">
          {isLocked ? (
            <button className="quiz-locked-btn" onClick={handleEnroll}>
              <i className="fa-solid fa-lock"></i>
              اشترك للدخول
            </button>
          ) : (
            <>
              <button 
                className={`start-quiz-btn ${status !== "not-attempted" ? "retake" : ""}`}
                onClick={() => handleStartQuiz(quizData)}
              >
                {status === "not-attempted" ? (
                  <>
                    <i className="fa-solid fa-play"></i>
                    بدء الاختبار
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-redo"></i>
                    إعادة الاختبار
                  </>
                )}
              </button>
              
              <button 
                className="quiz-details-btn"
                onClick={() => openQuizPage(quizData)}
              >
                <i className="fa-solid fa-info-circle"></i>
                تفاصيل الاختبار
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // دالة لبدء الاختبار الرئيسي (للدروس من نوع quiz)
  const handleStartMainQuiz = (lesson) => {
    if (!lesson || lesson.type !== "quiz") return;
    
    const quizData = {
      ...lesson.quiz,
      _id: lesson._id,
      isSubLesson: false,
      free: lesson.free
    };
    
    handleStartQuiz(quizData);
  };

  if (loading) return <CourseDetailsSkeleton />;

  if (error) return (
    <div className="error-container">
      <i className="fa-solid fa-triangle-exclamation fa-3x" style={{ color: '#ef4444', marginBottom: '20px' }}></i>
      <h3>عذراً!</h3>
      <p>{error}</p>
      <button className="back-btn" onClick={() => navigate("/courses")}>عودة</button>
    </div>
  );

  return (
    <div className="course-details-container">
      <button className="back-btn" onClick={() => navigate("/courses")}>
        <i className="fa-solid fa-arrow-right"></i> جميع الكورسات
      </button>

      {/* Header */}
      <div className="course-header">
        <div className="course-header-content">
          <div className="title-fav-row">
            <h1 className="course-titlee">{course.name}</h1>
            <button
              className={`favorite-btn ${favorite ? 'favorited' : ''}`}
              onClick={toggleFavorite}
              aria-pressed={favorite}
              title={favorite ? 'مفضل' : 'أضف للمفضلة'}
            >
              <i className={favorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}></i>
            </button>
          </div>
          <div className="course-instructor">
            <i className="fa-solid fa-chalkboard-user"></i>
            <span>{course.teacherName || course.teacher?.name || "المدرس"}</span>
          </div>

          <div className="course-stats">
            <span className="stat-item"><i className="fa-solid fa-users"></i> {course.students || 0} طالب</span>
            <span className="stat-item"><i className="fa-solid fa-layer-group"></i> {lessons.length} درس</span>
            <span className="stat-item"><i className="fa-solid fa-clock"></i> {formatTime(computeTotalSeconds(lessons))}</span>
          </div>
        </div>

        <div className="course-header-image">
          {course.image && (
            <img
              src={`http://localhost:5001${course.image}`}
              alt={course.name}
              className="main-course-image"
              onError={(e) => e.target.src = "https://via.placeholder.com/400x250?text=Course"}
            />
          )}
        </div>
      </div>

      <div className="course-main-content">
        {/* المحتوى الرئيسي */}
        <div className="main-content-wrapper">

          {/* وصف الكورس */}
          <div className="course-description-section">
            <h2 className="section-title">
              <i className="fa-solid fa-align-right"></i> عن الكورس
            </h2>
            <p className="description-text">{course.description }</p>

            {/* <div className="info-card">
              <div className="info-item">
                <span className="info-label"><i className="fa-solid fa-language"></i> اللغة:</span>
                <span className="info-value">العربية</span>
              </div>
              <div className="info-item">
                <span className="info-label"><i className="fa-solid fa-certificate"></i> الشهادة:</span>
                <span className="info-value">متوفرة عند الإتمام</span>
              </div>
            </div> */}
          </div>

          {/* محتوى الكورس */}
          <div className="lessons-section">
            <h2 className="section-title">
              <i className="fa-solid fa-play-circle"></i> محتوى الكورس
            </h2>

            <div className="lessons-list-wrapper">
              {lessons.length > 0 ? lessons.map((lesson, idx) => {
                const isActive = selectedLesson?._id === lesson._id;
                const isLocked = !checkLessonAccess(lesson);
                const isQuiz = lesson.type === "quiz";

                return (
                  <div
                    key={lesson._id || idx}
                    className={`lesson-accordion ${isActive ? 'active' : ''} ${isQuiz ? 'quiz-lesson' : ''}`}
                  >
                    {/* رأس الدرس */}
                    <button
                      type="button"
                      className="lesson-accordion-header"
                      aria-expanded={isActive}
                      onClick={() => setSelectedLesson(isActive ? null : lesson)}
                    >
                      <div className="lesson-header-content">
                        <div className="lesson-number-badge">
                          {idx + 1}
                          {isQuiz && (
                            <i className="fa-solid fa-clipboard-check quiz-indicator"></i>
                          )}
                        </div>
                        <div className="lesson-header-info">
                          <h4 className="lesson-title">
                            {lesson.name}
                            {lesson.free && (
                              <span className="free-badge">مجاني</span>
                            )}
                            {isQuiz && (
                              <span className="quiz-label">
                                <i className="fa-solid fa-clipboard-check"></i> اختبار
                              </span>
                            )}
                          </h4>
                          <p className="lesson-meta">
                            {lesson.subLessons?.length || 0} عناصر • {formatTime(lesson.time)}
                          </p>
                        </div>
                      </div>
                      <div className="lesson-header-actions">
                        {isQuiz && !isLocked && (
                          <span className="quiz-indicator-header">
                            <i className="fa-solid fa-clipboard-check"></i>
                          </span>
                        )}
                        {isLocked && <i className="fa-solid fa-lock lock-icon" aria-hidden="true"></i>}
                        <i className={`fa-solid fa-chevron-down chevron-icon ${isActive ? 'rotated' : ''}`} aria-hidden="true"></i>
                      </div>
                    </button>

                    {/* محتوى الدرس القابل للطي */}
                    {isActive && (
                      <div className="lesson-accordion-content">
                        {/* إذا كان الدرس عبارة عن اختبار، نعرض زر بدء الاختبار مباشرة */}
                        {isQuiz && (
                          <div className="main-quiz-container">
                            <h3 className="quiz-main-title">اختبار: {lesson.name}</h3>
                            
                            {renderQuizPreview(lesson, false)}
                            
                            {/* زر بدء الاختبار الرئيسي */}
                            <div className="start-main-quiz-section">
                              {isLocked ? (
                                <button className="quiz-locked-btn main" onClick={handleEnroll}>
                                  <i className="fa-solid fa-lock"></i>
                                  اشترك لبدء الاختبار
                                </button>
                              ) : (
                                <button 
                                  className="start-main-quiz-btn"
                                  onClick={() => handleStartMainQuiz(lesson)}
                                >
                                  <i className="fa-solid fa-play-circle"></i>
                                  بدء الاختبار الآن
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* عرض الدروس الفرعية */}
                        {!isQuiz && lesson.subLessons && lesson.subLessons.length > 0 ? (
                          <div className="sub-lessons-list">
                            {lesson.subLessons.map((sub, i) => {
                              const subIsLocked = !isEnrolled && !sub.free;
                              const subIsQuiz = sub.type === "quiz";
                              
                              return (
                                <div key={i} className={`sub-lesson-item ${subIsQuiz ? "quiz-item" : ""}`}>
                                  <div className="sub-lesson-info">
                                    <span className="sub-lesson-icon">
                                      <i className={`fa-solid ${getLessonIcon(sub.type)}`} aria-hidden="true"></i>
                                      {subIsQuiz && (
                                        <span className="quiz-mini-badge">اختبار</span>
                                      )}
                                    </span>
                                    <span className="sub-lesson-name">{sub.name}</span>
                                  </div>
                                  <div className="sub-lesson-meta">
                                    {subIsLocked ? (
                                      <i className="fa-solid fa-lock" aria-hidden="true"></i>
                                    ) : subIsQuiz ? (
                                      <div className="quiz-sub-actions">
                                        <button
                                          className="start-sub-quiz-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const quizData = {
                                              ...sub.quiz,
                                              _id: lesson._id,
                                              subLessonId: sub._id,
                                              isSubLesson: true,
                                              free: sub.free
                                            };
                                            handleStartQuiz(quizData);
                                          }}
                                        >
                                          <i className="fa-solid fa-clipboard-check"></i> بدء
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span>{formatTime(sub.time)}</span>
                                        {!subIsLocked && (
                                          <button
                                            className="open-sub-btn"
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              openContentPage(
                                                lesson._id, 
                                                true, 
                                                sub._id
                                              ); 
                                            }}
                                            title="عرض المحتوى"
                                          >
                                            <i className="fa-solid fa-play-circle"></i>
                                            عرض
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : !isQuiz && (
                          <div className="empty-sub-lessons">
                            <i className="fa-solid fa-inbox"></i>
                            <p>لا توجد دروس فرعية</p>
                          </div>
                        )}

                        {/* زر فتح الدرس الرئيسي إذا لم يكن اختباراً */}
                        {/* {!isQuiz && !isLocked && (
                          <div className="open-lesson-cta">
                            <button 
                              className="open-btn" 
                              onClick={() => openContentPage(lesson._id, false, null)}
                            >
                              <i className="fa-solid fa-play-circle"></i> عرض المحتوى
                            </button>
                          </div>
                        )} */}

                        {!isQuiz && isLocked && (
                          <div className="lesson-enroll-cta">
                            <button
                              onClick={handleEnroll}
                              className="lesson-enroll-btn"
                            >
                              <i className="fa-solid fa-lock-open"></i>
                              اشترك لفتح المحتوى - {course.price} ج.م
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="empty-lessons">
                  <i className="fa-solid fa-book-open"></i>
                  <p>لا توجد دروس حالياً</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="course-sidebar">
          <div className="pricing-card">
            <span className="current-pricee">{course.price} ج.م</span>

            {isEnrolled ? (
              <button className="enrolled-btn" disabled>
                <i className="fa-solid fa-check-circle"></i> مشترك بالفعل
              </button>
            ) : (
              <button className="enroll-btn" onClick={() => navigate(`/subscription/${course._id}`)}>
                <i className="fa-solid fa-graduation-cap"></i>
                اشترك الآن
              </button>
            )}

            {/* <div className="features-list">
              <div className="feature-item">
                <i className="fa-solid fa-infinity"></i>
                <span>وصول مدى الحياة</span>
              </div>
              <div className="feature-item">
                <i className="fa-solid fa-clipboard-check"></i>
                <span>اختبارات تفاعلية</span>
              </div>
              <div className="feature-item">
                <i className="fa-solid fa-trophy"></i>
                <span>شهادة إتمام</span>
              </div>
              <div className="feature-item">
                <i className="fa-solid fa-mobile-alt"></i>
                <span>دعم للموبايل</span>
              </div>
            </div> */}
          </div>

          <div className="teacher-card">
            <div className="teacher-avatar-placeholder">
              <i className="fa-solid fa-user"></i>
            </div>
            <div className="teacher-info">
              <div className="teacher-label">المعلم </div>
              <div className="teacher-name">{course.teacherName || course.teacher?.name || "اسم المدرس"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}