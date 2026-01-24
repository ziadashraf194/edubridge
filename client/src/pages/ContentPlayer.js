import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import { showPopup } from "../utils/popup";
import "../style/contentPlayer.css";

export default function ContentPlayer() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const subLessonId = searchParams.get("subLessonId");
  const courseId = searchParams.get("courseId");
  const navigate = useNavigate();

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentContent, setCurrentContent] = useState(null);
  const [course, setCourse] = useState(null);
  const [allLessons, setAllLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [completedItems, setCompletedItems] = useState([]);
  
  const videoRef = useRef(null);
  const plyrInstance = useRef(null);

  // Check authentication
  useEffect(() => {
    const hasToken = document.cookie
      .split("; ")
      .some(cookie => cookie.startsWith("token="));

    if (!hasToken) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Initialize Plyr when video content is loaded
  useEffect(() => {

  if (!videoRef.current) return;

  // لو فيه Plyr قديم امسحه
  if (plyrInstance.current) {
    plyrInstance.current.destroy();
    plyrInstance.current = null;
  }

  // أنشئ واحد جديد بعد ما DOM يجهز
  setTimeout(() => {
    if (!videoRef.current) return;
    
    if (currentContent?.type === 'video' && videoRef.current && !plyrInstance.current) {
      plyrInstance.current = new Plyr(videoRef.current, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'settings',
          'pip',
          'fullscreen'
        ],
        settings: ['quality', 'speed'],
        quality: {
          default: 720,
          options: [1080, 720, 480, 360]
        },
        speed: {
          selected: 1,
          options: [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]
        },
        i18n: {
          restart: 'إعادة',
          rewind: 'الرجوع {seektime}s',
          play: 'تشغيل',
          pause: 'إيقاف',
          fastForward: 'التقديم {seektime}s',
          seek: 'بحث',
          seekLabel: '{currentTime} من {duration}',
          played: 'تم تشغيله',
          buffered: 'المخزن مؤقتاً',
          currentTime: 'الوقت الحالي',
          duration: 'المدة',
          volume: 'الصوت',
          mute: 'كتم',
          unmute: 'إلغاء الكتم',
          enableCaptions: 'تفعيل الترجمة',
          disableCaptions: 'إلغاء الترجمة',
          download: 'تحميل',
          enterFullscreen: 'ملء الشاشة',
          exitFullscreen: 'خروج من ملء الشاشة',
          frameTitle: 'مشغل لـ {title}',
          captions: 'الترجمة',
          settings: 'الإعدادات',
          pip: 'صورة داخل صورة',
          menuBack: 'عودة للقائمة السابقة',
          speed: 'السرعة',
          normal: 'عادي',
          quality: 'الجودة',
          loop: 'تكرار',
        },
        youtube: {
          noCookie: false,
          rel: 0,
          showinfo: 0,
          controls: 1,
          modestbranding: 1
        }
      });
    }}, 0);

      return ;

  }, [currentContent?._id]);

  // Fetch data from single API
  useEffect(() => {
    let mounted = true;

    const fetchCourseData = async () => {
      try {
        if (!mounted) return;
        setLoading(true);
        setError("");

        // Fetch course data from single API
        const response = await axios.get(
          `http://localhost:5001/lesson/searchSub/${courseId}`,
          { withCredentials: true }
        );

        const data = response.data;
        
        if (!mounted) return;

        // Check subscription
        if (!data.subscribed) {
          setError("لست مشتركاً في هذا الكورس");
          return;
        }

        // Set course data
        setCourse(data.course);

        // Process lessons
        const processedLessons = data.course.lessons.map((lesson, index) => ({
          _id: lesson._id,
          name: lesson.name,
          type: lesson.type || "section",
          url: lesson.url,
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
        }));

        if (!mounted) return;
        setAllLessons(processedLessons);

        // Set current content based on URL params
        let foundContent = null;
        let foundLesson = null;

        if (subLessonId) {
          // Search for sub-lesson
          for (const lesson of processedLessons) {
            if (lesson.subLessons) {
              const subLesson = lesson.subLessons.find(sub => sub._id === subLessonId);
              if (subLesson) {
                foundContent = subLesson;
                foundLesson = lesson;
                break;
              }
            }
          }
        } else if (lessonId) {
          // Search for main lesson
          const lesson = processedLessons.find(l => l._id === lessonId);
          if (lesson) {
            foundContent = lesson;
            foundLesson = lesson;
          }
        }

        // If no content found, use first available content
        if (!foundContent && processedLessons.length > 0) {
          const firstLesson = processedLessons[0];
          if (firstLesson.subLessons && firstLesson.subLessons.length > 0) {
            foundContent = firstLesson.subLessons[0];
            foundLesson = firstLesson;
          } else {
            foundContent = firstLesson;
            foundLesson = firstLesson;
          }
        }

        if (!mounted) return;
        setCurrentContent(foundContent);
        setSelectedLesson(foundLesson);

        // Get favorites
        try {
          const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
          setFavorite(favs.includes(data.course._id));
        } catch (e) {
          console.error('Error loading favorites:', e);
        }

        // Get completed items
        try {
          const completed = JSON.parse(localStorage.getItem(`completed_${data.course._id}`) || '[]');
          setCompletedItems(completed);
        } catch (e) {
          console.error('Error loading completed items:', e);
        }

      } catch (err) {
        console.error(err);
        if (!mounted) return;
        
        if (err.response?.status === 401) {
          navigate("/login");
          return;
        }
        if (err.response?.status === 403) {
          setError("لست مشتركاً في هذا الكورس");
          return;
        }
        setError(err.response?.data?.msg || "حدث خطأ   ");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCourseData();

    return () => {
      mounted = false;
    };
  }, [lessonId, subLessonId, navigate]);

  // Toggle Favorite
  const toggleFavorite = () => {
    if (!course) return;
    try {
      const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
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
      console.error('Error toggling favorite:', e);
    }
  };

  // Mark as Complete
  const markAsComplete = () => {
    if (!course || !currentContent) return;
    
    const itemId = subLessonId || lessonId || currentContent._id;
    const storageKey = `completed_${course._id}`;
    
    try {
      const completed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!completed.includes(itemId)) {
        completed.push(itemId);
        localStorage.setItem(storageKey, JSON.stringify(completed));
        setCompletedItems(completed);
        showPopup("تم وضع علامة كمكتمل ✓", { okText: 'حسناً', background: '#10b981' });
      }
    } catch (e) {
      console.error('Error marking complete:', e);
    }
  };

  const isCompleted = (itemId) => {
    return completedItems.includes(itemId);
  };

  // Navigate to content
const navigateToContent = (targetLessonId, isSubLesson = false, targetSubLessonId = null) => {
  if (!courseId) return;

  const params = new URLSearchParams();
  params.append("courseId", courseId);

  if (isSubLesson && targetSubLessonId) {
    params.append("subLessonId", targetSubLessonId);
  }

  navigate(`/content/${targetLessonId}?${params.toString()}`);
};

  // Utility Functions
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

  // Get YouTube ID from URL
  const getYouTubeId = (url) => {
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  };

  // Render Content Based on Type
  const renderContent = () => {
    if (!currentContent) return null;

    const contentType = currentContent.type || 'video';
    const contentUrl = currentContent.url ? `${currentContent.url}` : null;

    switch (contentType) {
      case 'video':
        if (!contentUrl) {
          return (
            <div className="cp-video-error">
              <i className="fa-solid fa-video-slash fa-3x"></i>
              <h3>الفيديو غير متوفر</h3>
            </div>
          );
        }

        const youtubeId = getYouTubeId(contentUrl);
        const isYouTube = !!youtubeId;

        return (
         <div
  key={youtubeId}
  ref={videoRef}
  data-plyr-provider="youtube"
  data-plyr-embed-id={youtubeId}
></div>
        );

      case 'pdf':
        if (!contentUrl) {
          return (
            <div className="cp-unsupported-content">
              <i className="fa-solid fa-file-pdf fa-3x"></i>
              <h3>ملف PDF غير متوفر</h3>
            </div>
          );
        }
        return (
          <div className="cp-pdf-wrapper">
            <iframe
              src={`${contentUrl}#toolbar=0`}
              title={currentContent.name}
            ></iframe>
          </div>
        );

      case 'image':
        if (!contentUrl) {
          return (
            <div className="cp-unsupported-content">
              <i className="fa-solid fa-image fa-3x"></i>
              <h3>الصورة غير متوفرة</h3>
            </div>
          );
        }
        return (
          <div className="cp-image-wrapper">
            <img
              className="cp-image"
              src={contentUrl}
              alt={currentContent.name}
              onError={(e) => {
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (parent) {
                  parent.innerHTML = '<p style="color: #ef4444;">فشل تحميل الصورة</p>';
                }
              }}
            />
          </div>
        );

      case 'quiz':
        return (
          <div className="cp-quiz-wrapper">
            <i className="fa-solid fa-clipboard-check fa-4x"></i>
            <h2>اختبار: {currentContent.name}</h2>
            {/* <p>هذا الدرس يحتوي على اختبار تقييمي</p> */}
           <button 
  className="cp-open-btn" 
  onClick={() => navigate(`/quiz/${lessonId}?isSubLesson=${subLessonId? true : false}&subLessonId=${subLessonId || ''}`)}
>
  <i className="fa-solid fa-play"></i>
  بدء الاختبار
</button>
          </div>
        );

      case 'section':
        return (
          <div className="cp-section-container">
            <i className="fa-solid fa-folder-open fa-4x"></i>
            <h2>{currentContent.name}</h2>
            <p></p>
          </div>
        );

      default:
        return (
          <div className="cp-unsupported-content">
            <i className="fa-solid fa-exclamation-triangle fa-3x"></i>
            <h3>نوع محتوى غير مدعوم</h3>
            <p>نوع الملف: {contentType}</p>
            {contentUrl && (
              <a href={contentUrl} className="cp-open-btn" download>
                <i className="fa-solid fa-download"></i>
                تحميل الملف
              </a>
            )}
          </div>
        );
    }
  };

  // Calculate Progress
  const calculateProgress = () => {
    if (!course || allLessons.length === 0) return 0;
    
    let totalItems = 0;
    let completedCount = 0;
    
    allLessons.forEach(lesson => {
      if (lesson.subLessons && lesson.subLessons.length > 0) {
        lesson.subLessons.forEach(sub => {
          totalItems++;
          if (isCompleted(sub._id)) completedCount++;
        });
      } else {
        totalItems++;
        if (isCompleted(lesson._id)) completedCount++;
      }
    });
    
    return totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
  };

  const progress = calculateProgress();

  // Loading State
  if (loading) {
    return (
      <div className="cp-container">
        <div className="cp-skeleton" style={{ height: '60vh', marginBottom: '20px' }}></div>
        <div className="cp-skeleton" style={{ height: '100px' }}></div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="cp-error-overlay">
        <div className="cp-error-container">
          <i className="fa-solid fa-exclamation-circle fa-4x"></i>
          <h2>عذراً!</h2>
          <p>{error}</p>
          <div className="cp-error-actions">
            <button className="cp-retry-btn" onClick={() => window.location.reload()}>
              <i className="fa-solid fa-refresh"></i>
              إعادة المحاولة
            </button>
            <button className="cp-back-btn-error" onClick={() => navigate("/courses")}>
              <i className="fa-solid fa-arrow-right"></i>
              العودة للكورسات
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentContent) {
    return (
      <div className="cp-container">
        <p>لم يتم العثور على المحتوى</p>
      </div>
    );
  }

  return (
    <div className="cp-container">
      {/* Back Button */}
      <button className="cp-back-btn" onClick={() => navigate(-1)}>
        <i className="fa-solid fa-arrow-right"></i>
        العودة
      </button>

      {/* Course Header */}
      {course && (
        <div className="cp-header">
          <div className="cp-title-row">
            <h1 className="cp-title">{course.name}</h1>
            <button
              className={`cp-fav-btn ${favorite ? 'favorited' : ''}`}
              onClick={toggleFavorite}
              title={favorite ? 'مفضل' : 'أضف للمفضلة'}
            >
              <i className={favorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}></i>
            </button>
          </div>
          <div className="cp-instructor">
            <i className="fa-solid fa-chalkboard-user"></i>
            <span>{course.teacher}</span>
          </div>
          <div className="cp-stats">
            <span className="cp-stat-item">
              <i className="fa-solid fa-layer-group"></i> {allLessons.length} درس
            </span>
          
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="cp-main">
        {/* Content Player Section */}
        <div className="cp-content-wrapper">
          <div className="cp-player-section">
            {/* Content Box */}
            <div className="cp-content-box">
 
              
              <div className="cp-content-display">
                {renderContent()}
              </div>

            </div>

         
          </div>
        </div>

        {/* Sidebar - Lessons List */}
        <div className="cp-sidebar">
          <div className="cp-lessons-card">
            <div className="cp-lesson-counter">
              <span> الكورس</span>
              <span>{allLessons.length} درس</span>
            </div>

            <div className="cp-lessons-list">
              {allLessons.length > 0 ? allLessons.map((lesson, idx) => {
                const isActive = selectedLesson?._id === lesson._id;
                const isCurrentLesson = lesson._id === lessonId;
                const lessonCompleted = isCompleted(lesson._id);

                return (
                  <div
                    key={lesson._id || idx}
                    className={`cp-lesson-item ${isActive ? 'active' : ''}`}
                  >
                    <button
                      className="cp-lesson-header"
                      onClick={() => setSelectedLesson(isActive ? null : lesson)}
                    >
                      <div className="cp-lesson-header-content">
                        <div className={`cp-lesson-number ${lessonCompleted ? 'completed' : ''}`}>
                          {lessonCompleted ? (
                            <i className="fa-solid fa-check"></i>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="cp-lesson-info">
                          <h4 className="cp-lesson-title">
                            {lesson.name}
                            {lesson.free && (
                              <span className="cp-free-badge">مجاني</span>
                            )}
                          </h4>
                          <p className="cp-lesson-meta">
                            {lesson.subLessons?.length || 0} درس • {formatTime(lesson.time)}
                          </p>
                        </div>
                      </div>
                      <div className="cp-lesson-actions">
                        {isCurrentLesson && !subLessonId && (
                          <div className="cp-playing-indicator">
                            <div className="cp-playing-dot"></div>
                          </div>
                        )}
                        <i className={`fa-solid fa-chevron-down cp-chevron ${isActive ? 'rotated' : ''}`}></i>
                      </div>
                    </button>

                    {isActive && (
                      <div className="cp-lesson-content">
                        {lesson.subLessons && lesson.subLessons.length > 0 ? (
                          <div className="cp-sub-lessons">
                            {lesson.subLessons.map((sub, i) => {
                              const isCurrentSub = subLessonId === sub._id;
                              const subCompleted = isCompleted(sub._id);

                              return (
                                <button
                                  key={i}
                                  className={`cp-sub-lesson ${isCurrentSub ? 'active' : ''}`}
                                  onClick={() => navigateToContent(lesson._id, true, sub._id)}
                                >
                                  <div className="cp-sub-info">
                                    <span className={`cp-sub-icon ${subCompleted ? 'completed' : ''}`}>
                                      {subCompleted ? (
                                        <i className="fa-solid fa-check-circle"></i>
                                      ) : (
                                        <i className={`fa-solid ${getLessonIcon(sub.type)}`}></i>
                                      )}
                                    </span>
                                    <span className="cp-sub-name">{sub.name}</span>
                                  </div>
                                  <div className="cp-sub-meta">
                                    {isCurrentSub && (
                                      <div className="cp-playing-indicator">
                                        <div className="cp-playing-dot"></div>
                                      </div>
                                    )}
                                    <span>{formatTime(sub.time)}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="cp-empty-sub-lessons">
                            <button
                              className="cp-open-btn"
                              onClick={() => lesson.type=="quiz" ? navigate(`/quiz/${lessonId}?isSubLesson=${subLessonId? true : false}&subLessonId=${subLessonId || ''}`) : navigateToContent(lesson._id, false, null)}
                            >
                              <i className="fa-solid fa-play-circle"></i>
                            فتح
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="cp-empty-lessons">
                  <i className="fa-solid fa-inbox"></i>
                  <p>لا توجد دروس</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}