import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const StudentQuiz = () => {
  const { quizId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const courseId = queryParams.get("courseId");
  const isSubLesson = queryParams.get("isSubLesson") === "true";
  const subLessonId = queryParams.get("subLessonId");
  
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);

  // دالة مساعدة لاستخراج بيانات السؤال من كائن Mongoose
  const extractQuestionData = (question) => {
    if (!question) return null;
    
    const questionData = question._doc || question;
    
    return {
      _id: questionData._id || Math.random().toString(),
      type: questionData.type || "multiple-choice",
      question: questionData.question || `سؤال ${questionData.order || 0}`,
      marks: Number(questionData.marks) || 1,
      options: Array.isArray(questionData.options) ? questionData.options : [],
      correctAnswer: questionData.correctAnswer || "",
      explanation: questionData.explanation || "",
      order: questionData.order || 0
    };
  };

  // جلب بيانات الكويز
  useEffect(() => {
    fetchQuiz();
  }, [quizId, isSubLesson, subLessonId]);

  // بدء المؤقت
  useEffect(() => {
    if (quiz && quiz.duration > 0 && !submitted) {
      setTimeLeft(quiz.duration * 60);
    }
  }, [quiz, submitted]);

  // تشغيل المؤقت
  useEffect(() => {
    let timer;
    if (timeLeft > 0 && !submitted) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            handleAutoSubmit();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // بناء معاملات URL بناءً على نوع الاختبار
      const params = new URLSearchParams();
      
      if (isSubLesson) {
        params.append('isSubLesson', 'true');
        if (subLessonId) {
          params.append('subLessonId', subLessonId);
        }
      } else {
        params.append('isSubLesson', 'false');
      }
      
      const url = `http://localhost:5001/quiz/${quizId}?${params.toString()}`;
      
      const response = await axios.get(url, {
        withCredentials: true,
      });
      
      const quizData = response.data;
      
      console.log("Quiz data loaded:", {
        title: quizData.title,
        questionsCount: quizData.questions?.length,
        canTakeQuiz: quizData.canTakeQuiz,
        remainingAttempts: quizData.remainingAttempts,
        myAttempts: quizData.myAttempts?.length
      });
      
      // ⭐ التحقق مما إذا كان يمكن للطالب تقديم الاختبار
      if (quizData.canTakeQuiz === false) {
        if (quizData.remainingAttempts <= 0) {
          setError(`لقد استنفذت جميع المحاولات المسموح بها (${quizData.attemptsAllowed})`);
        } else if (quizData.deadline && new Date(quizData.deadline) < new Date()) {
          setError("انتهى موعد الاختبار");
        } else {
          setError("لا يمكنك أداء الاختبار حالياً");
        }
        setLoading(false);
        return;
      }
      
      // معالجة البيانات: استخراج الأسئلة من _doc
      const processedQuestions = (quizData.questions || []).map(extractQuestionData);
      
      const processedQuiz = {
        ...quizData,
        questions: processedQuestions
      };
      
      setQuiz(processedQuiz);
      setQuizQuestions(processedQuestions);
      
      // تهيئة الإجابات
      const initialAnswers = processedQuestions.map((question) => ({
        questionId: question._id,
        selectedAnswer: "",
        type: question.type,
      }));
      setAnswers(initialAnswers);
      
      console.log(`Quiz initialized with ${processedQuestions.length} questions`);
      
    } catch (err) {
      console.error("Error fetching quiz:", err.response?.data || err);
      setError(err.response?.data?.msg || "فشل في تحميل الاختبار");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, value) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex].selectedAnswer = value;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleAutoSubmit = () => {
    if (!submitted) {
      alert("انتهى وقت الاختبار! سيتم تقديم إجاباتك تلقائياً.");
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    // ⭐ التحقق من الإجابات الفارغة
    const unanswered = answers.filter(a => !a.selectedAnswer || a.selectedAnswer.trim() === "").length;
    if (unanswered > 0 && !window.confirm(`لديك ${unanswered} سؤال لم تتم الإجابة عليه. هل تريد المتابعة؟`)) {
      return;
    }

    if (window.confirm(`هل أنت متأكد من تسليم الاختبار؟ 
المحاولة الحالية: ${(quiz.myAttempts?.length || 0) + 1} من ${quiz.attemptsAllowed || 1}
لا يمكنك التراجع بعد التسليم.`)) {
      try {
        setIsSubmitting(true);
        
        // حساب الوقت المستغرق
        const timeSpent = quiz.duration * 60 - timeLeft;
        
        // إعداد بيانات التسليم
        const submissionData = {
          lessonId: quizId,
          answers: answers.map((answer, index) => ({
            questionIndex: index,
            selectedAnswer: answer.selectedAnswer || "",
          })),
          timeSpent,
          isSubLesson: isSubLesson,
          subLessonId: isSubLesson ? subLessonId : null,
        };

        console.log("Submitting quiz data:", submissionData);

        const response = await axios.post(
          "http://localhost:5001/quiz/submit",
          submissionData,
          { 
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        console.log("Submit response:", response.data);
        
        // ⭐ حفظ النتيجة وبيانات الأسئلة الإضافية
        setResult(response.data.result);
        
        // ⭐ حفظ الأسئلة مع الإجابات إذا كانت متاحة
        if (response.data.questions) {
          setQuizQuestions(response.data.questions.map((q, index) => ({
            ...q,
            _id: quiz.questions[index]?._id || Math.random().toString()
          })));
        }
        
        setSubmitted(true);
        
        // ⭐ إذا كان يمكن عرض الإجابات فوراً
        if (response.data.result.showExplanation) {
          setShowExplanation(true);
        }
        
      } catch (err) {
        console.error("Error submitting quiz:", err.response?.data || err);
        alert(err.response?.data?.msg || "فشل في تسليم الاختبار");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateProgress = () => {
    if (!quiz || !quiz.questions) return 0;
    const answered = answers.filter(a => a.selectedAnswer && a.selectedAnswer.trim() !== "").length;
    return (answered / quiz.questions.length) * 100;
  };

  const getQuizTypeText = () => {
    if (isSubLesson) {
      return "اختبار فرعي";
    }
    return "اختبار رئيسي";
  };

  const getNavigationUrl = () => {
    if (courseId) {
      return `/course/${courseId}`;
    }
    return "/dashboard";
  };

  // ⭐ دالة لفحص ما إذا كان يمكن عرض الشرح
  const canShowExplanation = () => {
    if (!result) return false;
    
    // إذا كانت الإجابة تسمح بالعرض فوراً
    if (result.showExplanation) return true;
    
    // التحقق من إعدادات الاختبار
    if (!quiz) return false;
    
    const now = new Date();
    const deadline = quiz.deadline ? new Date(quiz.deadline) : null;
    
    switch (quiz.showAnswersAfter) {
      case "immediately":
      case "after-submission":
        return true;
      case "after-deadline":
        return deadline && now > deadline;
      case "never":
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>جاري تحميل الاختبار...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2>خطأ</h2>
        <p>{error}</p>
        <div style={styles.errorActions}>
          <button 
            onClick={() => navigate(-1)}
            style={styles.backButton}
          >
            الرجوع
          </button>
          <button 
            onClick={fetchQuiz}
            style={styles.retryButton}
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={styles.errorContainer}>
        <h2>الاختبار غير موجود</h2>
        <button 
          onClick={() => navigate(-1)}
          style={styles.backButton}
        >
          الرجوع
        </button>
      </div>
    );
  }

  // ⭐ عرض النتيجة بعد التسليم
  if (submitted && result) {
    const shouldShowExplanation = canShowExplanation();
    
    return (
      <div style={styles.container}>
        <div style={styles.resultContainer}>
          <h1 style={styles.title}>نتيجة الاختبار</h1>
          
          <div style={styles.resultCard}>
            <div style={styles.scoreSection}>
              <div style={styles.quizTypeBadge}>
                <span style={styles.quizTypeText}>{getQuizTypeText()}</span>
              </div>
              <h2 style={styles.quizTitle}>{quiz.title}</h2>
              {quiz.lessonName && (
                <p style={styles.lessonName}>
                  <i className="fa-solid fa-book"></i> {quiz.lessonName}
                  {quiz.subLessonName && ` > ${quiz.subLessonName}`}
                </p>
              )}
              
              <div style={styles.scoreCircle}>
                <span style={styles.scorePercentage}>
                  {result.percentage}%
                </span>
                <div style={styles.scoreDetails}>
                  <span>{result.score} / {result.totalMarks}</span>
                </div>
              </div>
              
              <div style={{
                ...styles.statusBadge,
                backgroundColor: result.passed ? "#10b981" : "#ef4444"
              }}>
                {result.passed ? "ناجح ✓" : "راسب ✗"}
              </div>
              
              <div style={styles.attemptInfo}>
                <span style={styles.attemptText}>
                  المحاولة: {result.attemptNumber} من {quiz.attemptsAllowed === 0 ? 'غير محدود' : quiz.attemptsAllowed}
                </span>
                {quiz.attemptsAllowed > 0 && result.remainingAttempts > 0 && (
                  <span style={styles.remainingAttempts}>
                    (المحاولات المتبقية: {result.remainingAttempts})
                  </span>
                )}
              </div>
            </div>

            <div style={styles.resultDetails}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>الدرجة الكلية:</span>
                <span style={styles.detailValue}>{result.totalMarks}</span>
              </div>
              
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>درجة النجاح:</span>
                <span style={styles.detailValue}>{quiz.passingMarks || 50}</span>
              </div>
              
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>الأسئلة الصحيحة:</span>
                <span style={styles.detailValue}>
                  {result.correctAnswersCount || 0} من {result.totalQuestions || 0}
                </span>
              </div>
              
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>الوقت المستغرق:</span>
                <span style={styles.detailValue}>
                  {Math.floor(result.timeSpent / 60)}:{(result.timeSpent % 60).toString().padStart(2, '0')}
                </span>
              </div>
              
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>تاريخ التسليم:</span>
                <span style={styles.detailValue}>
                  {new Date(result.submittedAt).toLocaleString('ar-SA')}
                </span>
              </div>

              {/* ⭐ زر عرض الشرح - يظهر فقط إذا كان مسموحاً */}
              {shouldShowExplanation && (
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  style={styles.explanationButton}
                >
                  {showExplanation ? "إخفاء الشرح ✗" : "عرض الإجابات الصحيحة ✓"}
                </button>
              )}
              
              {!shouldShowExplanation && quiz.showAnswersAfter === "after-deadline" && quiz.deadline && (
                <div style={styles.infoMessage}>
                  <i className="fa-solid fa-clock"></i>
                  <span>سيتم عرض الإجابات الصحيحة بعد: {new Date(quiz.deadline).toLocaleString('ar-SA')}</span>
                </div>
              )}
              
              {!shouldShowExplanation && quiz.showAnswersAfter === "never" && (
                <div style={styles.infoMessage}>
                  <i className="fa-solid fa-ban"></i>
                  <span>لن يتم عرض الإجابات الصحيحة لهذا الاختبار</span>
                </div>
              )}
            </div>

            {/* ⭐ قسم عرض الإجابات الصحيحة */}
            {showExplanation && shouldShowExplanation && (
              <div style={styles.explanationsSection}>
                <h3 style={styles.explanationsTitle}>
                  <i className="fa-solid fa-lightbulb"></i> الإجابات الصحيحة والشرح
                </h3>
                
                {quizQuestions.map((question, index) => {
                  const userAnswer = answers[index]?.selectedAnswer || "لم تجب";
                  const isCorrect = result.answers?.[index]?.isCorrect || false;
                  const questionData = extractQuestionData(question);
                  
                  return (
                    <div key={index} style={styles.explanationItem}>
                      <div style={styles.questionHeader}>
                        <span style={styles.questionNumber}>سؤال {index + 1}</span>
                        <span style={{
                          ...styles.answerStatus,
                          backgroundColor: isCorrect ? "#10b981" : "#ef4444",
                          color: "white"
                        }}>
                          {isCorrect ? "صحيح" : "خطأ"}
                        </span>
                      </div>
                      
                      <p style={styles.questionText}>{questionData.question}</p>
                      
                      <div style={styles.answerComparison}>
                        <div style={{
                          ...styles.answerBox,
                          borderColor: isCorrect ? "#10b981" : "#ef4444"
                        }}>
                          <span style={styles.answerLabel}>إجابتك:</span>
                          <span style={{
                            ...styles.answerValue,
                            color: isCorrect ? "#10b981" : "#ef4444"
                          }}>
                            {userAnswer}
                          </span>
                        </div>
                        
                        <div style={styles.answerBox}>
                          <span style={styles.answerLabel}>الإجابة الصحيحة:</span>
                          <span style={{
                            ...styles.answerValue,
                            color: "#10b981",
                            fontWeight: "bold"
                          }}>
                            {questionData.correctAnswer || "لا توجد إجابة محددة"}
                          </span>
                        </div>
                      </div>
                      
                      {questionData.explanation && questionData.explanation.trim() !== "" && (
                        <div style={styles.explanationBox}>
                          <span style={styles.explanationLabel}>
                            <i className="fa-solid fa-info-circle"></i> الشرح:
                          </span>
                          <p style={styles.explanationText}>{questionData.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={styles.resultActions}>
              <button
                onClick={() => navigate(getNavigationUrl())}
                style={styles.returnButton}
              >
                <i className="fa-solid fa-arrow-right"></i> العودة للدورة
              </button>
              
              {/* ⭐ زر المحاولة الأخرى - يظهر فقط إذا كانت هناك محاولات متبقية */}
              {quiz.attemptsAllowed === 0 || result.remainingAttempts > 0 ? (
                <button
                  onClick={() => window.location.reload()}
                  style={styles.retryButton}
                >
                  <i className="fa-solid fa-redo"></i> محاولة أخرى
                </button>
              ) : (
                <div style={styles.noMoreAttempts}>
                  <i className="fa-solid fa-exclamation-circle"></i>
                  <span>لا توجد محاولات متبقية</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // استخراج بيانات السؤال الحالي
  const currentQuestionData = quiz.questions[currentQuestion];

  return (
    <div style={styles.container}>
      {/* شريط المعلومات العلوي */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <div style={styles.quizTypeIndicator}>
            {/* <span style={styles.quizTypeTextHeader}>{getQuizTypeText()}</span> */}
            {/* {quiz.remainingAttempts !== undefined && (
              <span style={styles.attemptsRemaining}>
                المحاولات المتبقية: {quiz.remainingAttempts === Infinity ? 'غير محدود' : quiz.remainingAttempts}
              </span>
            )} */}
          </div>
          <h1 style={styles.quizTitle}>{quiz.title}</h1>
          <p style={styles.quizDescription}>{quiz.description}</p>
          {quiz.lessonName && (
            <div style={styles.lessonInfo}>
              <i className="fa-solid fa-book"></i>
              <span>{quiz.lessonName}</span>
              {quiz.subLessonName && (
                <>
                  <i className="fa-solid fa-angle-left"></i>
                  <span>{quiz.subLessonName}</span>
                </>
              )}
            </div>
          )}
        </div>
        
        <div style={styles.headerStats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>الوقت المتبقي:</span>
            <span style={{
              ...styles.statValue,
              color: timeLeft < 300 ? "#ef4444" : "#1f2937"
            }}>
              {formatTime(timeLeft)}
            </span>
          </div>
          
          <div style={styles.statItem}>
            <span style={styles.statLabel}>الأسئلة:</span>
            <span style={styles.statValue}>
              {currentQuestion + 1} / {quiz.questions.length}
            </span>
          </div>
          
          <div style={styles.statItem}>
            <span style={styles.statLabel}>التقدم:</span>
            <span style={styles.statValue}>
              {Math.round(calculateProgress())}%
            </span>
          </div>
        </div>
      </div>

      {/* شريط التقدم */}
      <div style={styles.progressContainer}>
        <div 
          style={{
            ...styles.progressBar,
            width: `${calculateProgress()}%`
          }}
        ></div>
      </div>

      {/* السؤال الحالي */}
      <div style={styles.questionContainer}>
        <div style={styles.questionHeader}>
          <div style={styles.questionMeta}>
            <span style={styles.questionNumber}>
              السؤال {currentQuestion + 1}
            </span>
            <span style={styles.questionMarks}>
              ({currentQuestionData.marks || 1} درجة)
            </span>
          </div>
          
          <span style={styles.questionType}>
            {currentQuestionData.type === "multiple-choice" ? "اختيار متعدد" :
             currentQuestionData.type === "true-false" ? "صح/خطأ" :
             currentQuestionData.type === "short-answer" ? "إجابة قصيرة" : "مقال"}
          </span>
        </div>

        <div style={styles.questionContent}>
          <p style={styles.questionText}>{currentQuestionData.question}</p>
          
          {/* عرض الخيارات بناءً على نوع السؤال */}
          {currentQuestionData.type === "multiple-choice" && (
            <div style={styles.optionsContainer}>
              {Array.isArray(currentQuestionData.options) && currentQuestionData.options.map((option, index) => (
                <label key={index} style={{
                  ...styles.optionLabel,
                  borderColor: answers[currentQuestion]?.selectedAnswer === option ? "#667eea" : "#e5e7eb",
                  backgroundColor: answers[currentQuestion]?.selectedAnswer === option ? "#f0f9ff" : "#f9fafb"
                }}>
                  <input
                    type="radio"
                    name={`question-${currentQuestion}`}
                    value={option}
                    checked={answers[currentQuestion]?.selectedAnswer === option}
                    onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                    style={styles.radioInput}
                  />
                  <span style={styles.optionText}>{option}</span>
                </label>
              ))}
            </div>
          )}

          {currentQuestionData.type === "true-false" && (
            <div style={styles.trueFalseContainer}>
              <label style={{
                ...styles.trueFalseLabel,
                borderColor: answers[currentQuestion]?.selectedAnswer === "true" ? "#10b981" : "#e5e7eb",
                backgroundColor: answers[currentQuestion]?.selectedAnswer === "true" ? "#f0f9ff" : "#f9fafb"
              }}>
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  value="true"
                  checked={answers[currentQuestion]?.selectedAnswer === "true"}
                  onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                  style={styles.radioInput}
                />
                <span style={styles.trueFalseText}>صح</span>
              </label>
              
              <label style={{
                ...styles.trueFalseLabel,
                borderColor: answers[currentQuestion]?.selectedAnswer === "false" ? "#ef4444" : "#e5e7eb",
                backgroundColor: answers[currentQuestion]?.selectedAnswer === "false" ? "#fef2f2" : "#f9fafb"
              }}>
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  value="false"
                  checked={answers[currentQuestion]?.selectedAnswer === "false"}
                  onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                  style={styles.radioInput}
                />
                <span style={styles.trueFalseText}>خطأ</span>
              </label>
            </div>
          )}

          {(currentQuestionData.type === "short-answer" || currentQuestionData.type === "essay") && (
            <div style={styles.textAnswerContainer}>
              <textarea
                value={answers[currentQuestion]?.selectedAnswer || ""}
                onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                placeholder={
                  currentQuestionData.type === "short-answer" 
                    ? "اكتب إجابتك القصيرة هنا..." 
                    : "اكتب مقالك هنا..."
                }
                style={styles.textArea}
                rows={currentQuestionData.type === "essay" ? 8 : 4}
              />
              {currentQuestionData.type === "essay" && (
                <p style={styles.hintText}>
                  <i className="fa-solid fa-info-circle"></i> ملاحظة: سيتم تصحيح المقال يدوياً من قبل المعلم
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* التحكم في الأسئلة */}
      <div style={styles.navigationContainer}>
        <div style={styles.questionButtons}>
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              style={{
                ...styles.questionButton,
                backgroundColor: currentQuestion === index ? "#667eea" : 
                               answers[index]?.selectedAnswer ? "#10b981" : "#e5e7eb",
                color: currentQuestion === index ? "white" : 
                      answers[index]?.selectedAnswer ? "white" : "#374151",
                border: currentQuestion === index ? "2px solid #4f46e5" : "none"
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <div style={styles.controlButtons}>
          <button
            onClick={handlePrevQuestion}
            disabled={currentQuestion === 0}
            style={{
              ...styles.controlButton,
              backgroundColor: "#6b7280",
              opacity: currentQuestion === 0 ? 0.5 : 1
            }}
          >
            <i className="fa-solid fa-arrow-right"></i> السابق
          </button>
          
          {currentQuestion < quiz.questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              style={{
                ...styles.controlButton,
                backgroundColor: "#667eea"
              }}
            >
              التالي <i className="fa-solid fa-arrow-left"></i>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                ...styles.controlButton,
                backgroundColor: "#10b981",
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> جاري التسليم...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i> تسليم الاختبار
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* معلومات إضافية */}
      <div style={styles.footerInfo}>
        <div style={styles.infoBox}>
          <h4 style={styles.infoTitle}><i className="fa-solid fa-list"></i> تعليمات:</h4>
          <ul style={styles.infoList}>
            {/* <li>اختر إجابة واحدة فقط لكل سؤال اختيار متعدد</li> */}
            <li>لا يمكنك التراجع بعد تسليم الاختبار</li>
            <li>سيتم إغلاق الاختبار تلقائياً عند انتهاء الوقت</li>
            <li>عدد المحاولات المسموحة: {quiz.attemptsAllowed === 0 ? 'غير محدود' : quiz.attemptsAllowed}</li>
            {/* <li>المحاولات المتبقية: {quiz.remainingAttempts === Infinity ? 'غير محدود' : quiz.remainingAttempts}</li> */}
            {/* <li>نوع الاختبار: {getQuizTypeText()}</li> */}
            {quiz.deadline && (
              <li>موعد الانتهاء: {new Date(quiz.deadline).toLocaleString('ar-SA')}</li>
            )}
          </ul>
        </div>
        
        <div style={styles.warningBox}>
          <p style={styles.warningText}>
            <i className="fa-solid fa-exclamation-triangle"></i> تأكد من إجابتك على جميع الأسئلة قبل التسليم
          </p>
        </div>
      </div>
    </div>
  );
};

// الأنماط
const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f4f5fa",
    fontFamily: "'Cairo', sans-serif",
    direction: "rtl",
    padding: "20px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  spinner: {
    width: "50px",
    height: "50px",
    border: "5px solid #f3f3f3",
    borderTop: "5px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    textAlign: "center",
    padding: "20px",
  },
  errorActions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },
  backButton: {
    padding: "10px 20px",
    backgroundColor: "#667eea",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  retryButton: {
    padding: "10px 20px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  header: {
    backgroundColor: "white",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  headerInfo: {
    flex: 1,
    minWidth: "300px",
  },
  quizTypeIndicator: {
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  quizTypeTextHeader: {
    display: "inline-block",
    padding: "4px 12px",
    backgroundColor:  "#667eea",
    color: "white",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  attemptsRemaining: {
    display: "inline-block",
    padding: "4px 12px",
    backgroundColor: "#f59e0b",
    color: "white",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  quizTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "5px",
  },
  quizDescription: {
    color: "#6b7280",
    fontSize: "16px",
    marginBottom: "10px",
  },
  lessonInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#6b7280",
  },
  headerStats: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: "10px 15px",
    borderRadius: "10px",
    minWidth: "100px",
  },
  statLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "5px",
  },
  statValue: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
  },
  progressContainer: {
    height: "8px",
    backgroundColor: "#e5e7eb",
    borderRadius: "4px",
    marginBottom: "20px",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#10b981",
    transition: "width 0.3s ease",
  },
  questionContainer: {
    backgroundColor: "white",
    borderRadius: "15px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "15px",
    borderBottom: "2px solid #f3f4f6",
  },
  questionMeta: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  questionNumber: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
  },
  questionMarks: {
    fontSize: "14px",
    color: "#6b7280",
  },
  questionType: {
    padding: "5px 10px",
    backgroundColor: "#e0e7ff",
    color: "#3730a3",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  questionContent: {
    marginTop: "20px",
  },
  questionText: {
    fontSize: "18px",
    color: "#1f2937",
    marginBottom: "25px",
    lineHeight: "1.6",
  },
  optionsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  optionLabel: {
    display: "flex",
    alignItems: "center",
    padding: "15px",
    backgroundColor: "#f9fafb",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "2px solid #e5e7eb",
  },
  radioInput: {
    marginLeft: "10px",
    width: "20px",
    height: "20px",
    cursor: "pointer",
  },
  optionText: {
    flex: 1,
    fontSize: "16px",
    color: "#374151",
  },
  trueFalseContainer: {
    display: "flex",
    gap: "20px",
  },
  trueFalseLabel: {
    display: "flex",
    alignItems: "center",
    padding: "15px 25px",
    backgroundColor: "#f9fafb",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "2px solid #e5e7eb",
    flex: 1,
  },
  trueFalseText: {
    fontSize: "18px",
    fontWeight: "600",
    marginRight: "10px",
  },
  textAnswerContainer: {
    marginTop: "20px",
  },
  textArea: {
    width: "100%",
    padding: "15px",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "16px",
    resize: "vertical",
    minHeight: "120px",
    fontFamily: "'Cairo', sans-serif",
  },
  hintText: {
    fontSize: "14px",
    color: "#6b7280",
    marginTop: "10px",
    fontStyle: "italic",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  navigationContainer: {
    backgroundColor: "white",
    borderRadius: "15px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  questionButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "20px",
    justifyContent: "center",
  },
  questionButton: {
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  controlButtons: {
    display: "flex",
    justifyContent: "space-between",
  },
  controlButton: {
    padding: "12px 30px",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  footerInfo: {
    backgroundColor: "white",
    borderRadius: "15px",
    padding: "20px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  infoBox: {
    marginBottom: "20px",
  },
  infoTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  infoList: {
    paddingRight: "20px",
    color: "#6b7280",
    lineHeight: "1.8",
  },
  warningBox: {
    backgroundColor: "#fef3c7",
    padding: "15px",
    borderRadius: "10px",
    border: "1px solid #f59e0b",
  },
  warningText: {
    color: "#92400e",
    fontSize: "16px",
    fontWeight: "600",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  resultContainer: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
  },
  title: {
    textAlign: "center",
    color: "#1f2937",
    marginBottom: "30px",
    fontSize: "32px",
  },
  resultCard: {
    backgroundColor: "white",
    borderRadius: "20px",
    padding: "30px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  },
  scoreSection: {
    textAlign: "center",
    marginBottom: "30px",
  },
  quizTypeBadge: {
    marginBottom: "10px",
  },
  quizTypeText: {
    display: "inline-block",
    padding: "6px 15px",
    backgroundColor:  "#667eea",
    color: "white",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "600",
  },
  quizTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "10px",
  },
  lessonName: {
    color: "#6b7280",
    fontSize: "14px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  scoreCircle: {
    width: "200px",
    height: "200px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    margin: "20px auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    position: "relative",
  },
  scorePercentage: {
    fontSize: "48px",
    fontWeight: "700",
  },
  scoreDetails: {
    fontSize: "18px",
    marginTop: "10px",
  },
  statusBadge: {
    display: "inline-block",
    padding: "8px 20px",
    borderRadius: "20px",
    color: "white",
    fontSize: "16px",
    fontWeight: "600",
    marginTop: "15px",
  },
  attemptInfo: {
    marginTop: "15px",
    color: "#6b7280",
    fontSize: "14px",
  },
  attemptText: {
    marginRight: "5px",
  },
  remainingAttempts: {
    color: "#f59e0b",
    fontWeight: "600",
  },
  resultDetails: {
    borderTop: "2px solid #f3f4f6",
    borderBottom: "2px solid #f3f4f6",
    padding: "20px 0",
    margin: "20px 0",
  },
  detailItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
  },
  detailLabel: {
    color: "#6b7280",
    fontSize: "16px",
  },
  detailValue: {
    color: "#1f2937",
    fontSize: "18px",
    fontWeight: "600",
  },
  explanationButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    marginTop: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  },
  infoMessage: {
    backgroundColor: "#f0f9ff",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#0369a1",
    fontSize: "14px",
  },
  explanationsSection: {
    marginTop: "30px",
    paddingTop: "20px",
    borderTop: "2px solid #f3f4f6",
  },
  explanationsTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  explanationItem: {
    backgroundColor: "#f9fafb",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "15px",
  },
  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  questionNumber: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
  },
  answerStatus: {
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  questionText: {
    color: "#374151",
    marginBottom: "15px",
    fontSize: "16px",
    lineHeight: "1.6",
  },
  answerComparison: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
    marginBottom: "15px",
  },
  answerBox: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "8px",
    border: "2px solid #e5e7eb",
  },
  answerLabel: {
    display: "block",
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "5px",
  },
  answerValue: {
    fontSize: "14px",
    color: "#1f2937",
    fontWeight: "500",
  },
  explanationBox: {
    backgroundColor: "white",
    padding: "15px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    marginTop: "10px",
  },
  explanationLabel: {
    display: "block",
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "5px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  explanationText: {
    fontSize: "14px",
    color: "#374151",
    lineHeight: "1.6",
  },
  resultActions: {
    display: "flex",
    gap: "15px",
    marginTop: "30px",
  },
  returnButton: {
    flex: 1,
    padding: "15px",
    backgroundColor: "#6b7280",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  },
  retryButton: {
    flex: 1,
    padding: "15px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  },
  noMoreAttempts: {
    flex: 1,
    padding: "15px",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "16px",
  },
};

// إضافة أنيميشن للـ spinner
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
}

export default StudentQuiz;