import { useParams } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { showConfirm } from "../utils/popup";
import axios from "axios";

export default function CourseDetails() {
  const [activeTab, setActiveTab] = useState("students");
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false);
  const [showFoundStudentModal, setShowFoundStudentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [codeCount, setCodeCount] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [studentCodeSearch, setStudentCodeSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [couponStats, setCouponStats] = useState(null);
  const [courseInfo, setCourseInfo] = useState(null);
  const [foundStudent, setFoundStudent] = useState(null);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);

  const API_BASE_URL = "http://localhost:5001/coupon";
  const SUBSCRIPTION_API = "http://localhost:5001/subscription";
  const USERS_API = "http://localhost:5001/users";
  const COURSES_API = "http://localhost:5001/courses";
  const { courseId } = useParams();
  const token = localStorage.getItem("token") || "";

  // تهيئة الطلاب كمصفوفة فارغة
  const [students, setStudents] = useState([]);
  const [codes, setCodes] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [newStudent, setNewStudent] = useState({ 
    name: "", 
    email: "", 
    phone: "",
    fatherPhone: ""
  });
  
  const [newCode, setNewCode] = useState({ discount: 50, maxUses: 10, expiryDate: "" });

  const headers = { 
    "Content-Type": "application/json", 
    "Authorization": `Bearer ${token}` 
  };

  // دالة جلب أكواد الخصم
  const fetchCoupons = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`${API_BASE_URL}/course/${courseId}`, {
        headers,
        withCredentials: true,
      });

      const data = res.data;

      setCodes(data.map(c => ({
        _id: c._id,
        code: c.code,
        courseId: c.courseId,
        maxUses: c.usageLimit,
        usedCount: c.usedCount,
        isActive: c.isActive,
        expiryDate: c.expiresAt ? new Date(c.expiresAt).toISOString().split("T")[0] : "غير محدد",
        status:
          !c.isActive
            ? "inactive"
            : c.expiresAt && new Date(c.expiresAt) < new Date()
              ? "expired"
              : c.usedCount >= c.usageLimit
                ? "used"
                : "active",
      })));

    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // دالة جلب إحصائيات الأكواد
  const fetchCouponStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/stats/${courseId}`, {
        headers,
        withCredentials: true,
      });
      setCouponStats(res.data);
    } catch (err) {
      console.error("خطأ في جلب إحصائيات الأكواد:", err);
    }
  };

  // دالة جلب معلومات الدورة
  const fetchCourseInfo = async () => {
    try {
      const res = await axios.get(`${COURSES_API}/${courseId}`, {
        headers,
        withCredentials: true,
      });
      setCourseInfo(res.data);
    } catch (err) {
      console.error("خطأ في جلب معلومات الدورة:", err);
    }
  };

  // دالة جلب طلبات الالتحاق
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await axios.get(`${SUBSCRIPTION_API}/request/${courseId}`, {
        headers,
        withCredentials: true,
      });
      
      // التحقق من تنسيق الرد
      if (Array.isArray(res.data)) {
        setJoinRequests(res.data);
      } else {
        console.error('تنسيق الرد غير متوقع:', res.data);
        setJoinRequests([]);
      }
    } catch (err) {
      console.error('خطأ في جلب طلبات الالتحاق:', err);
      setJoinRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  // دالة جلب الطلاب المشتركين
  const fetchUsers = async () => {
    setLoadingStudents(true);
    try {
      const res = await axios.get(`${SUBSCRIPTION_API}/${courseId}`, {
        headers,
        withCredentials: true,
      });
      
      // التحقق من تنسيق الرد
      if (res.data && res.data.success && Array.isArray(res.data.students)) {
        setStudents(res.data.students);
      } else {
        console.error('تنسيق الرد غير متوقع:', res.data);
        setStudents([]);
      }
    } catch (err) {
      console.error('خطأ في جلب الطلاب:', err.response?.data || err.message);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // دالة البحث عن طالب بكود الطالب (حقل id الرقمي)
  const handleSearchStudentByCode = async () => {
    if (!studentCodeSearch.trim()) {
      alert("الرجاء إدخال كود الطالب");
      return;
    }

    // تحويل إلى رقم للتأكد
    const studentCode = parseInt(studentCodeSearch);
    if (isNaN(studentCode)) {
      alert("كود الطالب يجب أن يكون رقم");
      return;
    }

    setSearchingStudent(true);
    try {
      // البحث عن الطالب بكود الطالب (حقل id الرقمي)
      const res = await axios.get(`${SUBSCRIPTION_API}/search/${studentCode}`, {
        headers,
        withCredentials: true,
      });

      if (res.data && res.data.success && res.data.user) {
        setFoundStudent(res.data.user);
        setShowFoundStudentModal(true);
      } else {
        alert("لم يتم العثور على طالب بهذا الكود");
      }
    } catch (err) {
      console.error("خطأ في البحث عن الطالب:", err);
      if (err.response?.status === 404) {
        alert("لم يتم العثور على طالب بهذا الكود");
      } else {
        alert(err.response?.data?.msg || "حدث خطأ أثناء البحث عن الطالب");
      }
    } finally {
      setSearchingStudent(false);
    }
  };

  // دالة إضافة طالب حقيقي للدورة
  const handleAddRealStudent = async () => {
    if (!foundStudent || !foundStudent._id) {
      alert("لم يتم تحديد طالب للإضافة");
      return;
    }

    setAddingStudent(true);
    try {
      // إضافة الطالب للدورة
      const res = await axios.post(`${SUBSCRIPTION_API}/add/${courseId}/${foundStudent._id}`, {}, {
        headers,
        withCredentials: true,
      });

      if (res.data && res.data.success) {
        alert("تم إضافة الطالب إلى الدورة بنجاح!");
        setShowAddStudentModal(false);
        setShowFoundStudentModal(false);
        setStudentCodeSearch("");
        setFoundStudent(null);
        
        // تحديث قائمة الطلاب
        fetchUsers();
      } else {
        alert(res.data?.msg || "حدث خطأ أثناء إضافة الطالب");
      }
    } catch (err) {
      console.error("خطأ في إضافة الطالب:", err);
      
      if (err.response?.status === 400) {
        alert("الطالب مشترك بالفعل في هذه الدورة");
      } else {
        alert(err.response?.data?.msg || "حدث خطأ أثناء إضافة الطالب");
      }
    } finally {
      setAddingStudent(false);
    }
  };

  useEffect(() => {
    fetchCourseInfo();
    fetchCoupons();
    fetchCouponStats();
    fetchRequests();
    fetchUsers();
  }, [courseId]);

  // دالة إنشاء أكواد متعددة
  const handleGenerateMultipleCodes = async () => {
    if (!newCode.expiryDate)
      return alert("الرجاء تحديد تاريخ الانتهاء");

    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/generate`,
        {
          courseId,
          count: parseInt(codeCount),
          discount: newCode.discount,
          usageLimit: newCode.maxUses,
          expiresAt: newCode.expiryDate,
        },
        { headers, withCredentials: true }
      );

      alert(`تم إنشاء ${res.data.coupons.length} كود بنجاح!`);
      setShowGenerateCodeModal(false);
      setNewCode({ discount: 50, maxUses: 10, expiryDate: "" });
      setCodeCount(1);

      fetchCoupons();
      fetchCouponStats();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // تحميل الأكواد كملف Excel
  const downloadCodesExcel = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/export/course/${courseId}`, {
        headers,
        withCredentials: true,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codes_${courseId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('خطأ في تحميل الاكواد:', err);
      alert(err.response?.data?.msg || 'فشل في تنزيل ملف الأكواد');
    } finally {
      setLoading(false);
    }
  };

  // تحميل بيانات الطلاب كملف Excel
  const downloadStudentsExcel = async () => {
    try {
      setLoadingStudents(true);
      const res = await axios.get(`${SUBSCRIPTION_API}/export/students/${courseId}`, {
        headers,
        withCredentials: true,
        responseType: 'blob'
      });

      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_${courseId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('خطأ في تحميل طلاب الدورة:', err);
      alert(err.response?.data?.msg || 'فشل في تنزيل ملف الطلاب');
    } finally {
      setLoadingStudents(false);
    }
  };

  // دالة إيقاف الكود
  const handleDeactivateCode = async (codeId) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/${codeId}`,
        {},
        { headers, withCredentials: true }
      );

      alert("تم إيقاف الكود بنجاح!");
      fetchCoupons();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // دالة حذف الكود
  const handleDeleteCode = async (codeId) => {
    const ok = await showConfirm("هل أنت متأكد من حذف هذا الكود؟");
    if (!ok) return;

    try {
      await axios.delete(`${API_BASE_URL}/${codeId}`, {
        headers,
        withCredentials: true,
      });

      alert("تم حذف الكود بنجاح!");
      fetchCoupons();
      fetchCouponStats();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  // دالة حذف طالب
  const handleRemoveStudent = async (studentId) => {
    const ok = await showConfirm("هل أنت متأكد من حذف هذا الطالب من الدورة؟");
    if (!ok) return;
    
    try {
      // إرسال طلب حذف للـ Backend
      await axios.delete(`${SUBSCRIPTION_API}/${courseId}/${studentId}`, {
        headers,
        withCredentials: true,
      });
      
      alert("تم حذف الطالب بنجاح!");
      // تحديث القائمة محليًا
      fetchUsers();
    } catch (err) {
      console.error("خطأ في حذف الطالب:", err);
      alert(err.response?.data?.msg || "حدث خطأ أثناء حذف الطالب");
    }
  };

  // دالة قبول طلب الالتحاق
  const handleAcceptRequest = async (requestId) => {
    try {
      await axios.get(`${SUBSCRIPTION_API}/request/${requestId}/acceptRequest`, { 
        headers,
        withCredentials: true 
      });
      
      alert("تم قبول الطلب بنجاح!");
      fetchRequests(); // تحديث قائمة الطلبات
      fetchUsers(); // تحديث قائمة الطلاب
    } catch (err) {
      console.error("خطأ في قبول الطلب:", err);
      alert(err.response?.data?.msg || "حدث خطأ أثناء قبول الطلب");
    }
  };

  // دالة رفض طلب الالتحاق
  const handleRejectRequest = async (requestId) => {
    const ok = await showConfirm("هل أنت متأكد من رفض هذا الطلب؟");
    if (!ok) return;
    
    try {
      await axios.get(`${SUBSCRIPTION_API}/request/${requestId}/rejectRequest`, { 
        headers,
        withCredentials: true 
      });
      
      setJoinRequests(joinRequests.filter((r) => r._id !== requestId));
      alert("تم رفض الطلب بنجاح!");
    } catch (err) {
      console.error("خطأ في رفض الطلب:", err);
      alert(err.response?.data?.msg || "حدث خطأ أثناء رفض الطلب");
    }
  };

  // تصفية الطلاب حسب البحث
  const filteredStudents = Array.isArray(students) 
    ? students.filter((s) => 
        (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone || "").includes(searchTerm) ||
        (s.fatherPhone || "").includes(searchTerm) ||
        (s.id || "").toString().includes(searchTerm)
      )
    : [];

  // تصفية الأكواد حسب البحث
  const filteredCodes = codes.filter((c) => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // تنسيق أزرار التبويب
  const btnStyle = (active) => ({
    flex: 1, 
    minWidth: "150px", 
    padding: "15px 20px",
    background: active ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
    color: active ? "white" : "#6b7280", 
    border: "none", 
    borderRadius: "12px",
    cursor: "pointer", 
    fontWeight: "600", 
    fontSize: "16px",
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: "8px"
  });

  return (
    <div style={{ 
      padding: "30px", 
      background: "#f4f5fa", 
      minHeight: "100vh", 
      fontFamily: "'Cairo', sans-serif", 
      direction: "rtl" 
    }}>
      
      {/* معلومات الدورة */}
      {courseInfo && (
        <div style={{ 
          background: "white", 
          borderRadius: "20px", 
          padding: "30px", 
          marginBottom: "30px", 
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)" 
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "start", 
            flexWrap: "wrap", 
            gap: "20px" 
          }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ 
                fontSize: "32px", 
                fontWeight: "700", 
                marginBottom: "10px", 
                color: "#1f2937" 
              }}>
                {courseInfo.name || "اسم الدورة"}
              </h1>
              <p style={{ 
                color: "#6b7280", 
                fontSize: "16px", 
                marginBottom: "20px" 
              }}>
                {courseInfo.description || "وصف الدورة"}
              </p>
              <div style={{ 
                display: "flex", 
                gap: "20px", 
                flexWrap: "wrap" 
              }}>
                <span style={{ color: "#667eea", fontWeight: "600" }}>
                  <i className="fas fa-user-friends"></i> {students.length} طالب
                </span>
                <span style={{ color: "#667eea", fontWeight: "600" }}>
                  <i className="fas fa-ticket-alt"></i> {codes.length} كود خصم
                </span>
                <span style={{ color: "#667eea", fontWeight: "600" }}>
                  <i className="fas fa-clock"></i> {courseInfo.duration || "غير محدد"}
                </span>
                <span style={{ color: "#667eea", fontWeight: "600" }}>
                  <i className="fas fa-money-bill-wave"></i> {courseInfo.price || 0} جنيه
                </span>
              </div>
            </div>
            <span style={{ 
              padding: "10px 20px", 
              borderRadius: "20px", 
              fontSize: "16px", 
              fontWeight: "600", 
              color: "white", 
              background: courseInfo.active ? "#22c55e" : "#ef4444" 
            }}>
              <i className={`fas ${courseInfo.active ? "fa-circle" : "fa-ban"}`}></i> 
              {courseInfo.active ? "نشط" : "متوقف"}
            </span>
          </div>
        </div>
      )}

      {/* التبويبات */}
      <div style={{ 
        background: "white", 
        borderRadius: "20px", 
        padding: "10px", 
        marginBottom: "30px", 
        boxShadow: "0 5px 20px rgba(0,0,0,0.1)", 
        display: "flex", 
        gap: "10px", 
        flexWrap: "wrap" 
      }}>
        <button 
          onClick={() => setActiveTab("students")} 
          style={btnStyle(activeTab === "students")}
        >
          <i className="fas fa-users"></i> الطلاب ({students.length})
        </button>
        <button 
          onClick={() => setActiveTab("codes")} 
          style={btnStyle(activeTab === "codes")}
        >
          <i className="fas fa-ticket-alt"></i> الأكواد ({codes.length})
        </button>
        <button 
          onClick={() => setActiveTab("requests")} 
          style={btnStyle(activeTab === "requests")}
        >
          <i className="fas fa-hourglass-half"></i> الطلبات ({joinRequests.length})
        </button>
      </div>

      {/* المحتوى */}
      <div style={{ 
        background: "white", 
        borderRadius: "20px", 
        padding: "30px", 
        boxShadow: "0 5px 20px rgba(0,0,0,0.1)" 
      }}>
        {error && (
          <div style={{ 
            background: "#fee2e2", 
            color: "#dc2626", 
            padding: "15px", 
            borderRadius: "10px", 
            marginBottom: "20px" 
          }}>
            {error}
          </div>
        )}

        {/* تبويب الأكواد */}
        {activeTab === "codes" && (
          <>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "25px", 
              flexWrap: "wrap", 
              gap: "15px" 
            }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937" }}>
                  <i className="fa-solid fa-ticket"></i> أكواد الاشتراك
                </h2>
                {couponStats && (
                  <p style={{ color: "#6b7280", marginTop: "8px" }}>
                    إجمالي: {couponStats.totalCoupons} | نشط: {couponStats.activeCoupons} | منتهي: {couponStats.expiredCoupons} | استخدامات: {couponStats.totalUsage}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input 
                  type="text" 
                  placeholder=" بحث..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    padding: "10px 15px", 
                    border: "2px solid #e5e7eb", 
                    borderRadius: "10px", 
                    fontSize: "14px", 
                    width: "200px" 
                  }} 
                />
                <button 
                  onClick={fetchCoupons} 
                  style={{ 
                    background: "#3b82f6", 
                    color: "white", 
                    border: "none", 
                    padding: "10px 15px", 
                    borderRadius: "10px", 
                    cursor: "pointer", 
                    fontWeight: "600" 
                  }}
                >
                  <i className="fa-solid fa-arrow-rotate-right"></i> تحديث
                </button>
                <button
                  onClick={downloadCodesExcel}
                  style={{
                    background: "#0ea5e9",
                    color: "white",
                    border: "none",
                    padding: "10px 15px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  <i className="fa-solid fa-file-excel"></i> تنزيل Excel
                </button>
                <button 
                  onClick={() => setShowGenerateCodeModal(true)}
                  style={{ 
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                    color: "white", 
                    border: "none", 
                    padding: "10px 20px", 
                    borderRadius: "10px", 
                    cursor: "pointer", 
                    fontWeight: "600" 
                  }}
                >
                  <i className="fa-solid fa-plus"></i> إنشاء كود
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                ⏳ جاري التحميل...
              </div>
            ) : filteredCodes.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "60px", 
                background: "#f9fafb", 
                borderRadius: "15px", 
                border: "2px dashed #e5e7eb" 
              }}>
                <p style={{ fontSize: "20px", color: "#6b7280" }}>
                  <i className="fa-solid fa-ticket"></i> لا توجد أكواد
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
                gap: "20px" 
              }}>
                {filteredCodes.map((code) => (
                  <div 
                    key={code._id} 
                    style={{ 
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                      borderRadius: "15px", 
                      padding: "25px", 
                      color: "white" 
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                      <div>
                        <p style={{ fontSize: "12px", opacity: 0.9 }}>كود الاشتراك</p>
                        <h3 style={{ fontSize: "18px", fontWeight: "700", fontFamily: "monospace" }}>
                          {code.code}
                        </h3>
                      </div>
                      <span style={{ 
                        padding: "6px 12px", 
                        borderRadius: "20px", 
                        fontSize: "12px", 
                        fontWeight: "600",
                        background: code.status === "active" ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)" 
                      }}>
                        {code.status === "active" ? "نشط" : code.status === "expired" ? "منتهي" : "متوقف"}
                      </span>
                    </div>
                    <div style={{ 
                      background: "rgba(255,255,255,0.15)", 
                      borderRadius: "12px", 
                      padding: "15px", 
                      marginBottom: "15px" 
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                          <p style={{ fontSize: "12px", opacity: 0.9 }}>الاستخدامات</p>
                          <p style={{ fontSize: "18px", fontWeight: "700" }}>
                            {code.usedCount}/{code.maxUses}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: "12px", opacity: 0.9 }}>الانتهاء</p>
                          <p style={{ fontSize: "14px" }}>{code.expiryDate}</p>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        onClick={() => { 
                          navigator.clipboard.writeText(code.code); 
                          alert("تم نسخ الكود!"); 
                        }}
                        style={{ 
                          flex: 1, 
                          padding: "10px", 
                          background: "rgba(255,255,255,0.2)", 
                          color: "white", 
                          border: "none", 
                          borderRadius: "8px", 
                          cursor: "pointer", 
                          fontWeight: "600" 
                        }}
                      >
                        <i className="fa-regular fa-copy"></i> نسخ
                      </button>
                      {code.status === "active" && (
                        <button 
                          onClick={() => handleDeactivateCode(code._id)}
                          style={{ 
                            flex: 1, 
                            padding: "10px", 
                            background: "rgba(239,68,68,0.9)", 
                            color: "white", 
                            border: "none", 
                            borderRadius: "8px", 
                            cursor: "pointer", 
                            fontWeight: "600" 
                          }}
                        >
                          <i className="fa-solid fa-ban"></i> إيقاف
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteCode(code._id)}
                        style={{ 
                          padding: "10px 15px", 
                          background: "rgba(239,68,68,0.9)", 
                          color: "white", 
                          border: "none", 
                          borderRadius: "8px", 
                          cursor: "pointer" 
                        }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* تبويب الطلاب */}
        {activeTab === "students" && (
          <>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "25px", 
              flexWrap: "wrap", 
              gap: "15px" 
            }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937" }}>
                  <i className="fa-solid fa-people-line"></i> الطلاب المشتركين
                </h2>
                <p style={{ color: "#6b7280", marginTop: "5px" }}>
                  إجمالي الطلاب: {students.length}
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input 
                  type="text" 
                  placeholder=" بحث بالاسم، البريد، الهاتف أو الكود..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    padding: "10px 15px", 
                    border: "2px solid #e5e7eb", 
                    borderRadius: "10px", 
                    width: "250px" 
                  }} 
                />
                <button 
                  onClick={fetchUsers}
                  style={{ 
                    background: "#3b82f6", 
                    color: "white", 
                    border: "none", 
                    padding: "10px 15px", 
                    borderRadius: "10px", 
                    cursor: "pointer", 
                    fontWeight: "600" 
                  }}
                >
                  <i className="fa-solid fa-arrow-rotate-right"></i> تحديث
                </button>
                <button
                  onClick={downloadStudentsExcel}
                  style={{
                    background: "#0ea5e9",
                    color: "white",
                    border: "none",
                    padding: "10px 15px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  <i className="fa-solid fa-file-excel"></i> تنزيل Excel
                </button>
                <button 
                  onClick={() => setShowAddStudentModal(true)}
                  style={{ 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                    color: "white", 
                    border: "none", 
                    padding: "10px 20px", 
                    borderRadius: "10px", 
                    cursor: "pointer", 
                    fontWeight: "600" 
                  }}
                >
                  <i className="fa-solid fa-plus"></i> إضافة طالب
                </button>
              </div>
            </div>
            
            {loadingStudents ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "24px", color: "#667eea", marginBottom: "15px" }}></i>
                <p style={{ fontSize: "16px", color: "#6b7280" }}>جاري تحميل بيانات الطلاب...</p>
              </div>
            ) : !Array.isArray(students) ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#ef4444" }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "32px", marginBottom: "15px" }}></i>
                <p style={{ fontSize: "16px" }}>⚠️ خطأ في تحميل بيانات الطلاب</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "60px", 
                background: "#f9fafb", 
                borderRadius: "15px", 
                border: "2px dashed #e5e7eb" 
              }}>
                <i className="fa-solid fa-users-slash" style={{ fontSize: "48px", color: "#9ca3af", marginBottom: "20px" }}></i>
                <p style={{ fontSize: "20px", color: "#6b7280", marginBottom: "10px" }}>
                  📭 لا توجد بيانات طلاب
                </p>
                <p style={{ color: "#6b7280", fontSize: "16px" }}>
                  استخدم زر "إضافة طالب" لإضافة طلاب جدد
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
                gap: "20px" 
              }}>
                {filteredStudents.map((student) => (
                  <div 
                    key={student._id} 
                    style={{ 
                      background: "#f9fafb", 
                      border: "2px solid #e5e7eb", 
                      borderRadius: "15px", 
                      padding: "20px",
                      transition: "all 0.3s ease",
                      ":hover": {
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        transform: "translateY(-5px)"
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
                      <div style={{ 
                        width: "50px", 
                        height: "50px", 
                        borderRadius: "50%", 
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        color: "white", 
                        fontSize: "20px", 
                        fontWeight: "700" 
                      }}>
                        {(student.name || "ط").charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1f2937" }}>
                          {student.name || "طالب"}
                        </h3>
                        <p style={{ fontSize: "12px", color: "#6b7280" }}>
                          <i className="fa-solid fa-id-card"></i> كود: {student.id || "غير معروف"}
                        </p>
                        <p style={{ fontSize: "12px", color: "#6b7280" }}>
                          <i className="fa-solid fa-calendar"></i> {student.enrolledDate || "غير معروف"}
                        </p>
                      </div>
                    </div>
                    <div style={{ marginBottom: "15px", color: "#6b7280", fontSize: "14px" }}>
                      <p style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <i className="fa-solid fa-envelope" style={{ width: "20px" }}></i>
                        <span>{student.email || "لا يوجد"}</span>
                      </p>
                      <p style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <i className="fa-solid fa-phone" style={{ width: "20px" }}></i>
                        <span>{student.phone || "لا يوجد"}</span>
                      </p>
                      {student.fatherPhone && (
                        <p style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <i className="fa-solid fa-phone-volume" style={{ width: "20px" }}></i>
                          <span>ولي الأمر: {student.fatherPhone}</span>
                        </p>
                      )}
                    </div>
                    <div style={{ marginBottom: "15px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "600" }}>التقدم</span>
                        <span style={{ color: "#667eea", fontWeight: "600" }}>
                          {student.progress || 0}%
                        </span>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: "#e5e7eb", borderRadius: "10px" }}>
                        <div style={{ 
                          width: `${student.progress || 0}%`, 
                          height: "100%", 
                          background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)", 
                          borderRadius: "10px" 
                        }}></div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveStudent(student._id)}
                      style={{ 
                        width: "100%", 
                        padding: "10px", 
                        background: "#ef4444", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "8px", 
                        cursor: "pointer", 
                        fontWeight: "600",
                        transition: "background 0.3s ease",
                        ":hover": {
                          background: "#dc2626"
                        }
                      }}
                    >
                      <i className="fa-solid fa-trash"></i> حذف من الدورة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* تبويب الطلبات */}
        {activeTab === "requests" && (
          <>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937", marginBottom: "25px" }}>
              <i className="fa-solid fa-hourglass"></i> طلبات الالتحاق
            </h2>
            
            {loadingRequests ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "24px", color: "#667eea", marginBottom: "15px" }}></i>
                <p style={{ fontSize: "16px", color: "#6b7280" }}>جاري تحميل الطلبات...</p>
              </div>
            ) : joinRequests.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "60px", 
                background: "#f9fafb", 
                borderRadius: "15px", 
                border: "2px dashed #e5e7eb" 
              }}>
                <i className="fa-regular fa-envelope" style={{ fontSize: "48px", color: "#9ca3af", marginBottom: "20px" }}></i>
                <p style={{ fontSize: "20px", color: "#6b7280" }}>
                  لا توجد طلبات جديدة
                </p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", 
                gap: "20px" 
              }}>
                {joinRequests.map((req) => (
                  <div 
                    key={req._id} 
                    style={{ 
                      background: "white", 
                      border: "2px solid #e5e7eb", 
                      borderRadius: "15px", 
                      padding: "25px",
                      transition: "all 0.3s ease",
                      ":hover": {
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
                      }
                    }}
                  >
                    <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "15px" }}>
                      {req.userId?.name || "طالب"}
                    </h3>
                    <div style={{ 
                      background: "#f9fafb", 
                      borderRadius: "12px", 
                      padding: "15px", 
                      marginBottom: "15px", 
                      whiteSpace: "normal", 
                      overflowWrap: "break-word" 
                    }}>
                      <p style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <i className="fa-solid fa-envelope" style={{ width: "20px" }}></i>
                        <span>{req.userId?.email || "لا يوجد"}</span>
                      </p>
                      <p style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <i className="fa-solid fa-phone" style={{ width: "20px" }}></i>
                        <span>{req.userId?.phone || "لا يوجد"}</span>
                      </p>
                      <p style={{ marginTop: "10px" }}>
                        <i className="fa-regular fa-message" style={{ marginRight: "8px" }}></i> 
                        {req.msg || "لا توجد رسالة"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        onClick={() => handleAcceptRequest(req._id)}
                        style={{ 
                          flex: 1, 
                          padding: "12px", 
                          background: "#10b981", 
                          color: "white", 
                          border: "none", 
                          borderRadius: "10px", 
                          cursor: "pointer", 
                          fontWeight: "600",
                          transition: "background 0.3s ease",
                          ":hover": {
                            background: "#059669"
                          }
                        }}
                      >
                        <i className="fa-solid fa-check"></i> قبول
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(req._id)}
                        style={{ 
                          flex: 1, 
                          padding: "12px", 
                          background: "#ef4444", 
                          color: "white", 
                          border: "none", 
                          borderRadius: "10px", 
                          cursor: "pointer", 
                          fontWeight: "600",
                          transition: "background 0.3s ease",
                          ":hover": {
                            background: "#dc2626"
                          }
                        }}
                      >
                        <i className="fa-solid fa-xmark"></i> رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* نافذة إنشاء الأكواد */}
      {showGenerateCodeModal && (
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
            padding: "20px" 
          }}
          onClick={() => setShowGenerateCodeModal(false)}
        >
          <div 
            style={{ 
              background: "white", 
              padding: "30px", 
              borderRadius: "20px", 
              maxWidth: "500px", 
              width: "100%" 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "20px" }}>
              <i className="fa-solid fa-ticket"></i> إنشاء كود اشتراك جديد
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                عدد الأكواد
              </label>
              <input 
                type="number" 
                min="1" 
                max="100" 
                value={codeCount} 
                onChange={(e) => setCodeCount(e.target.value)}
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  border: "2px solid #e5e7eb", 
                  borderRadius: "10px" 
                }} 
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                عدد الاستخدامات
              </label>
              <input 
                type="number" 
                min="1" 
                value={newCode.maxUses} 
                onChange={(e) => setNewCode({ ...newCode, maxUses: parseInt(e.target.value) || 1 })}
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  border: "2px solid #e5e7eb", 
                  borderRadius: "10px" 
                }} 
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                تاريخ الانتهاء *
              </label>
              <input 
                type="date" 
                value={newCode.expiryDate} 
                onChange={(e) => setNewCode({ ...newCode, expiryDate: e.target.value })}
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  border: "2px solid #e5e7eb", 
                  borderRadius: "10px" 
                }} 
              />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={handleGenerateMultipleCodes} 
                disabled={loading}
                style={{ 
                  flex: 1, 
                  padding: "12px", 
                  background: loading ? "#9ca3af" : "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "10px", 
                  cursor: loading ? "not-allowed" : "pointer", 
                  fontWeight: "600" 
                }}
              >
                {loading ? "⏳ جاري الإنشاء..." : "✨ إنشاء"}
              </button>
              <button 
                onClick={() => setShowGenerateCodeModal(false)}
                style={{ 
                  flex: 1, 
                  padding: "12px", 
                  background: "#ef4444", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "10px", 
                  cursor: "pointer", 
                  fontWeight: "600" 
                }}
              >
                <i className="fa-solid fa-xmark"></i> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة طالب (البحث بكود الطالب) */}
      {showAddStudentModal && (
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
            padding: "20px" 
          }}
          onClick={() => setShowAddStudentModal(false)}
        >
          <div 
            style={{ 
              background: "white", 
              padding: "30px", 
              borderRadius: "20px", 
              maxWidth: "500px", 
              width: "100%" 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
              <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#1f2937" }}>
                <i className="fa-solid fa-user-plus"></i> إضافة طالب جديد
              </h3>
              <button 
                onClick={() => setShowAddStudentModal(false)}
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  color: "#6b7280", 
                  fontSize: "20px", 
                  cursor: "pointer"
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div style={{ 
              background: "#f9fafb", 
              borderRadius: "12px", 
              padding: "20px", 
              marginBottom: "25px",
              border: "2px solid #e5e7eb" 
            }}>
              <h4 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "15px", color: "#374151" }}>
                <i className="fa-solid fa-magnifying-glass"></i> البحث عن طالب
              </h4>
              
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#4b5563" }}>
                  كود الطالب (رقم)
                </label>
                <input 
                  type="number"
                  placeholder="أدخل كود الطالب (رقم)..." 
                  value={studentCodeSearch} 
                  onChange={(e) => setStudentCodeSearch(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleSearchStudentByCode();
                  }}
                  style={{ 
                    width: "100%",
                    padding: "12px 15px", 
                    border: "2px solid #e5e7eb", 
                    borderRadius: "10px", 
                    fontSize: "16px"
                  }} 
                />
                <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "8px" }}>
                  ⓘ أدخل كود الطالب (رقم) للبحث عنه وإضافته للدورة
                </p>
              </div>
              
              <button 
                onClick={handleSearchStudentByCode}
                disabled={searchingStudent}
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  background: searchingStudent ? "#9ca3af" : "linear-gradient(135deg, #059669 0%, #047857 100%)", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "10px", 
                  cursor: searchingStudent ? "not-allowed" : "pointer", 
                  fontWeight: "600",
                  fontSize: "16px"
                }}
              >
                {searchingStudent ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> جاري البحث...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-magnifying-glass"></i> بحث عن الطالب
                  </>
                )}
              </button>
            </div>
            
            <div style={{ 
              background: "#f0f9ff", 
              borderRadius: "12px", 
              padding: "15px", 
              marginBottom: "20px",
              border: "1px solid #bae6fd" 
            }}>
              <div style={{ display: "flex", alignItems: "start", gap: "10px" }}>
                <i className="fa-solid fa-info-circle" style={{ color: "#0284c7", fontSize: "18px", marginTop: "2px" }}></i>
                <div>
                  <p style={{ color: "#0369a1", fontSize: "14px", margin: 0, fontWeight: "600" }}>
                    طريقة إضافة الطالب:
                  </p>
                  <ol style={{ color: "#0369a1", fontSize: "14px", margin: "5px 0 0 0", paddingRight: "20px" }}>
                    <li>أدخل كود الطالب (رقم) في الحقل أعلاه</li>
                    <li>اضغط على زر "بحث عن الطالب"</li>
                    <li>عند العثور على الطالب، سيتم عرض معلوماته</li>
                    <li>تأكد من إضافة الطالب للدورة</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button 
                onClick={() => setShowAddStudentModal(false)}
                style={{ 
                  padding: "12px 30px", 
                  background: "#6b7280", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "10px", 
                  cursor: "pointer", 
                  fontWeight: "600",
                  fontSize: "16px"
                }}
              >
                <i className="fa-solid fa-arrow-left"></i> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة عرض الطالب الموجود */}
      {showFoundStudentModal && foundStudent && (
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
            zIndex: 1001, 
            padding: "20px" 
          }}
          onClick={() => setShowFoundStudentModal(false)}
        >
          <div 
            style={{ 
              background: "white", 
              padding: "30px", 
              borderRadius: "20px", 
              maxWidth: "500px", 
              width: "100%" 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ 
                width: "80px", 
                height: "80px", 
                borderRadius: "50%", 
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                color: "white", 
                fontSize: "28px", 
                fontWeight: "700",
                margin: "0 auto 15px"
              }}>
                {(foundStudent.name || "ط").charAt(0)}
              </div>
              <h3 style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937", marginBottom: "5px" }}>
                {foundStudent.name}
              </h3>
              <p style={{ color: "#6b7280", fontSize: "16px" }}>
                <i className="fa-solid fa-id-card"></i> كود الطالب: {foundStudent.id || "غير معروف"}
              </p>
            </div>
            
            <div style={{ 
              background: "#f9fafb", 
              borderRadius: "12px", 
              padding: "20px", 
              marginBottom: "25px" 
            }}>
              <h4 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "15px", color: "#374151" }}>
                <i className="fa-solid fa-circle-info"></i> معلومات الطالب
              </h4>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "5px" }}>البريد الإلكتروني</p>
                  <p style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>{foundStudent.email}</p>
                </div>
                <div>
                  <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "5px" }}>رقم الهاتف</p>
                  <p style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>{foundStudent.phone}</p>
                </div>
              </div>
              
              <div>
                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "5px" }}>رقم هاتف ولي الأمر</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>{foundStudent.fatherPhone}</p>
              </div>
            </div>
            
            <div style={{ 
              background: "#f0f9ff", 
              borderRadius: "12px", 
              padding: "15px", 
              marginBottom: "25px",
              border: "1px solid #bae6fd" 
            }}>
              <div style={{ display: "flex", alignItems: "start", gap: "10px" }}>
                <i className="fa-solid fa-info-circle" style={{ color: "#0284c7", fontSize: "18px", marginTop: "2px" }}></i>
                <p style={{ color: "#0369a1", fontSize: "14px", margin: 0 }}>
                  سيتم إضافة هذا الطالب إلى الدورة "<strong>{courseInfo?.name || "هذه الدورة"}</strong>". 
                  يمكن للطالب بعد ذلك الوصول للمحتوى التعليمي.
                </p>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={handleAddRealStudent}
                disabled={addingStudent}
                style={{ 
                  flex: 2, 
                  padding: "15px", 
                  background: addingStudent ? "#9ca3af" : "linear-gradient(135deg, #059669 0%, #047857 100%)", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "10px", 
                  cursor: addingStudent ? "not-allowed" : "pointer", 
                  fontWeight: "600",
                  fontSize: "16px"
                }}
              >
                {addingStudent ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> جاري الإضافة...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-check"></i> تأكيد إضافة الطالب
                  </>
                )}
              </button>
              <button 
                onClick={() => {
                  setShowFoundStudentModal(false);
                  setFoundStudent(null);
                }}
                style={{ 
                  flex: 1, 
                  padding: "15px", 
                  background: "#ef4444", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "10px", 
                  cursor: "pointer", 
                  fontWeight: "600",
                  fontSize: "16px"
                }}
              >
                <i className="fa-solid fa-xmark"></i> إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}