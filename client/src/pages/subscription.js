import React, { useState, useEffect } from 'react';
import { useParams,useNavigate } from "react-router-dom";
import axios from "axios";



export default function CourseEnrollment() {
  const [enrollmentMethod, setEnrollmentMethod] = useState('request');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { courseId } = useParams();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [courseData, setCourseData] = useState({});

  const [requestData, setRequestData] = useState({
    message: ''
  });

  const [codeData, setCodeData] = useState({
    code: ''
  });
    const navigate = useNavigate();

      useEffect(() => {
    const hasToken = document.cookie
      .split("; ")
      .some(cookie => cookie.startsWith("token="));

    if (!hasToken) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    axios.get(
  `http://localhost:5001/subscription/searchSub/${courseId}`,
  {
    withCredentials: true
  }
)
      .then(res => {
        
        if (res.data.subscribed) {
          navigate(`/course/${courseId}`);
        }
      })
      .catch(err => {
        console.error(err);
      });
  }, [navigate]);
async function SendRequest() {
  try {
      await axios.post(`http://localhost:5001/subscription/request/${courseId}`,{msg:requestData.message},{
          withCredentials: true,
        })
    setSuccessMessage('تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً')
  } catch (error) {
    setErrorMessage('حدث خطأ أثناء إرسال الطلب. الرجاء المحاولة مرة أخرى');
  }
 
}
  const formatTime = (minutes) => {
    if (!minutes) return '';
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ساعة`;
    }
    return `    ${hours} ساعة و ${remainingMinutes}  دقيقة`;
    
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:5001/course/subscription/${courseId}`, {
          withCredentials: true,
        });
        setCourseData(res.data);
        console.log(courseData);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
        alert("حدث خطأ أثناء تحميل البيانات.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    try {
           await axios.post(`http://localhost:5001/subscription/request/${courseId}`,{msg:requestData.message},{
          withCredentials: true,
        })
      setSuccessMessage('تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً');
      setUserData({ name: '', email: '', phone: '' });
      setRequestData({ message: '' });
    } catch (error) {
      setErrorMessage('حدث خطأ أثناء إرسال الطلب. الرجاء المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    try {
        await axios.post(`http://localhost:5001/coupon/use`,{code:codeData.code,courseId:courseId},{
          withCredentials: true,
        })
      setSuccessMessage('تم الاشتراك ');
      setUserData({ name: '', email: '', phone: '' });
      setCodeData({ code: '' });
    } catch (error) {
      setErrorMessage('الكود غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };
const handleFreeCourse = async () => {
          await axios.post(`http://localhost:5001/subscription/free/${courseId}`,{},{
          withCredentials: true,
        })
         setSuccessMessage('تم الاشتراك بنجاح');
}
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '50px 20px',
      fontFamily: 'Cairo, sans-serif',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {successMessage && (
          <div style={{
            background: '#d1fae5',
            border: '2px solid #059669',
            color: '#065f46',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            <i className="fas fa-check-circle" style={{ fontSize: '24px' }}></i>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div style={{
            background: '#fee2e2',
            border: '2px solid #dc2626',
            color: '#991b1b',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            <i className="fas fa-exclamation-circle" style={{ fontSize: '24px' }}></i>
            {errorMessage}
          </div>
        )}

        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '10px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          display: 'flex',
          gap: '30px',
          flexWrap: 'wrap',
          alignItems: 'start'
        }}>
          
          {/* كارد معلومات الكورس */}
          <div style={{
            flex: '1 1 320px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '25px',
            color: 'white',
            boxShadow: 'rgb(116 81 170) 0px 0px 16px 1px',
          }}>
            {courseData?.image ? (
              <img 
                src={"http://localhost:5001"+courseData.image} 
                alt={courseData?.name}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight:"250px",
                  objectFit: 'cover',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '180px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                fontSize: '60px'
              }}>
                <i className="fas fa-graduation-cap"></i>
              </div>
            )}
            
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '700',
              marginBottom: '12px',
              lineHeight: '1.3'
            }}>
              {courseData?.name}
            </h2>
            
            <p style={{ 
              fontSize: '14px',
              marginBottom: '20px',
              lineHeight: '1.6',
              opacity: 0.9
            }}>
              {courseData?.description}
            </p>

            <div style={{ 
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '20px'
            }}>
               <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                background: 'rgba(255,255,255,0.12)',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <i class="fa-solid fa-chalkboard-user"></i>
                <span style={{ fontWeight: '600' }}>{courseData?.teacher} </span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                background: 'rgba(255,255,255,0.12)',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <i className="fas fa-users" style={{ fontSize: '16px' }}></i>
                <span style={{ fontWeight: '600' }}>{courseData?.students} طالب</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                background: 'rgba(255,255,255,0.12)',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <i className="fas fa-book" style={{ fontSize: '16px' }}></i>
                <span style={{ fontWeight: '600' }}>{courseData?.lessons} درس</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                background: 'rgba(255,255,255,0.12)',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <i className="fas fa-clock" style={{ fontSize: '16px' }}></i>
                <span style={{ fontWeight: '600' }}>{formatTime(courseData?.time)}</span>
              </div>
            </div>

            <div style={{
              padding: '18px',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: '12px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '6px' }}>
                سعر الكورس
              </div>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: '700'
              }}>
                {courseData?.price} جنيه
              </div>
            </div>
          </div>

          {/* قسم طرق الدفع */}
          {courseData.price === 0 ? (
            <div style={{ flex: '1 1 320px', display: 'flex', alignItems: 'center', justifyContent: 'center',   }}>
              <button
                onClick={handleFreeCourse}
                style={{
                  padding: '16px 35px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                <i className="fas fa-gift"></i>
                اشترك مجانًا
              </button>
            </div>
          ) : (
            <div style={{ flex: '1 1 550px',alignSelf:'center'  }}>
              {/* <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <i className="fas fa-credit-card" style={{ color: '#667eea' }}></i>
                طريقة الاشتراك
              </h2> */}

              {/* Tabs */}
              <div style={{
                background: '#f9fafb',
                borderRadius: '15px',
                padding: '8px',
                marginBottom: '20px',
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={() => {
                    setEnrollmentMethod('request');
                    setSuccessMessage('');
                    setErrorMessage('');
                    
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: enrollmentMethod === 'request' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'transparent',
                    color: enrollmentMethod === 'request' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                >
                  <i className="fas fa-paper-plane"></i>
                  طلب التحاق
                </button>
                
                <button
                  onClick={() => {
                    setEnrollmentMethod('code');
                    setSuccessMessage('');
                    setErrorMessage('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: enrollmentMethod === 'code' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'transparent',
                    color: enrollmentMethod === 'code' ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.3s'
                  }}
                >
                  <i className="fas fa-ticket-alt"></i>
                  كود اشتراك
                </button>
              </div>

              {/* Request Form */}
              {enrollmentMethod === 'request' && (
                <div>
                  <div style={{
                    background: '#eff6ff',
                    border: '2px solid #3b82f6',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="fas fa-info-circle"></i>
                      سيتم التواصل معك من قبل فريقنا للتأكيد والدفع
                    </p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      رسالة إضافية (اختياري)
                    </label>
                    <textarea
                      value={requestData.message}
                      onChange={(e) => setRequestData({ ...requestData, message: e.target.value })}
                      placeholder="..."
                      rows="4"
                      style={{
                        width: '100%',
                        padding: '15px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '16px',
                        resize: 'vertical',
                        transition: 'all 0.3s',
                        fontFamily: 'Cairo, sans-serif',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  <button
                    onClick={handleRequestSubmit}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '18px',
                      background: loading 
                        ? '#9ca3af' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '18px',
                      fontWeight: '700',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.3s'
                    }}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        إرسال الطلب
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Code Form */}
              {enrollmentMethod === 'code' && (
                <div>
                  <div style={{
                    background: '#f0fdf4',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '20px',
                    display:'none'
                  }}>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: '#065f46',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="fas fa-check-circle"></i>
                      الكود عبارة عن سلسلة من الحروف والأرقام
                    </p>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      كود الاشتراك *
                    </label>
                    <input
                      type="text"
                      value={codeData.code}
                      onChange={(e) => setCodeData({ ...codeData, code: e.target.value.toUpperCase() })}
                      placeholder="أدخل الكود هنا"
                      style={{
                        width: '100%',
                        padding: '15px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '18px',
                        fontFamily: 'monospace',
                        letterSpacing: '2px',
                        textAlign: 'center',
                        fontWeight: '700',
                        transition: 'all 0.3s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  <button
                    onClick={handleCodeSubmit}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '18px',
                      background: loading 
                        ? '#9ca3af' 
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '18px',
                      fontWeight: '700',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.3s'
                    }}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        جاري التحقق...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle"></i>
                        تفعيل الاشتراك
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '20px',
          padding: '30px',
          marginTop: '30px',
          textAlign: 'center'
        }}>
          <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '15px' }}>
            <i className="fas fa-question-circle" style={{ color: '#667eea' }}></i> تحتاج مساعدة؟
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>
            تواصل معنا وسنساعدك في إتمام عملية الاشتراك
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:support@example.com" style={{
              padding: '12px 25px',
              background: '#667eea',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-envelope"></i>
              البريد الإلكتروني
            </a>
            <a href="https://wa.me/1234567890" style={{
              padding: '12px 25px',
              background: '#25d366',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fab fa-whatsapp"></i>
              واتساب
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}