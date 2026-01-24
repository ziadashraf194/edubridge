import { Link, useNavigate } from "react-router";
import React, { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import "../style/header.css";
import logo from "../logo.png";
import defaultAvatar from "../avatar-default.svg";
import axios from "axios";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [notifications] = useState([]);
  const [userInfo, setUserInfo] = useState({}); 
  const dropdownRef = useRef(null);
  const dashboardRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const userToken = Cookies.get("token");
      if (!userToken) return; 

      try {
        const res = await axios.get("http://localhost:5001/auth/me", {
          withCredentials: true,
        });
        setUserInfo(res.data);
      } catch (err) {
        console.error(" Error fetching user info:", err);
      }
    };

    fetchUser();
  }, []);

 
  useEffect(() => {
    const userToken = Cookies.get("token");
    setToken(userToken || null);

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        dashboardRef.current && !dashboardRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
        setShowDashboardMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
    setShowDropdown(false);
    setShowDashboardMenu(false);
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown((prev) => !prev);
    setShowDashboardMenu(false);
  };

  const toggleDashboardMenu = (e) => {
    e.stopPropagation();
    setShowDashboardMenu((prev) => !prev);
    setShowDropdown(false);
  };

  const handleLogout = () => {
    Cookies.remove("token");
    setToken(null);
    setShowDropdown(false);
    setUserInfo({});
    navigate("/login");
  };

  const closeMenuOnNavigate = () => {
    setIsOpen(false);
    setShowDropdown(false);
    setShowDashboardMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ====== JSX ======
  return (
    <header className="header">
      <div className="logo">
        <Link to="/" onClick={closeMenuOnNavigate}>
          <img src={logo} alt="شعار المنصة" />
        </Link>
      </div>

      <div className="humburger" onClick={toggleMenu} aria-label="القائمة">
        <i className={`fa-solid fa-bars ${!isOpen ? "active" : ""}`}></i>
        <i className={`fa-solid fa-xmark ${isOpen ? "active" : ""}`}></i>
      </div>

      <nav className={`navbar ${isOpen ? "active" : ""}`}>
        <ul>
        
               {userInfo?.user?.role === "teacher" && (
            <div
                className="dashboard-link"
                onClick={toggleDashboardMenu}
                role="button"
                aria-expanded={showDashboardMenu}
              >
                لوحة التحكم <i className="fa-solid fa-chevron-down"></i>
              </div>
          )}

          {token && (
            
            <li className="dashboard-menu" ref={dashboardRef}>
      

              {showDashboardMenu && (
                <ul className="dashboard-dropdown">
                  <li>
                    <Link to="/dashboard/course" onClick={closeMenuOnNavigate}>
                       الكورسات
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/quiz" onClick={closeMenuOnNavigate}>
                       الاختبارات
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard/lesson" onClick={closeMenuOnNavigate}>
                      الدروس
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          )}

          <li>
            <Link to="/contact" onClick={closeMenuOnNavigate}>
              تواصل معنا
            </Link>
          </li>
          <li>
            <Link to="/courses" onClick={closeMenuOnNavigate}>
              الكورسات
            </Link>
          </li>
          {/* <li>
            <Link to="/teachers" onClick={closeMenuOnNavigate}>
              المعلمون
            </Link>
          </li> */}
          <li>
            <Link to="/" onClick={closeMenuOnNavigate}>
              الرئيسية
            </Link>
          </li>

        
     
          {token ? (
            <>
              <li className="notification-icon" aria-label="الإشعارات">
                <i className="fa-solid fa-bell"></i>
                {notifications.length > 0 && (
                  <span className="notif-count">{notifications.length}</span>
                )}
              </li>

              <li className="avatar-container" ref={dropdownRef}>
                <div
                  className="avatar-link"
                  onClick={toggleDropdown}
                  role="button"
                  aria-label="قائمة الحساب"
                  aria-expanded={showDropdown}
                >
                  <img
                    src={userInfo?.user?.image || defaultAvatar}
                    alt="صورة المستخدم"
                    className="avatar-img"
                  />
                  <i
                    className={`fa-solid fa-chevron-${
                      showDropdown ? "up" : "down"
                    } dropdown-arrow`}
                  ></i>
                </div>

                {showDropdown && (
                  <div className="account-dropdown">
                    <div className="dropdown-header">
                      <img
                        src={userInfo?.user?.image || defaultAvatar}
                        alt="صورة المستخدم"
                        className="dropdown-avatar"
                      />
                      <div>
                        <h4>مرحباً {userInfo?.user?.name}</h4>
                        <p className="user-email">{userInfo?.user?.phone}</p>
                      </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={closeMenuOnNavigate}
                    >
                      حسابي <i className="fa-solid fa-user"></i>
                    </Link>

                    <Link
                      to="/profile"
                      className="dropdown-item"
                      onClick={closeMenuOnNavigate}
                    >
                      الإعدادات <i className="fa-solid fa-gear"></i>
                    </Link>

                    <Link
                      to="/notifications"
                      className="dropdown-item"
                      onClick={closeMenuOnNavigate}
                    >
                      الإشعارات <i className="fa-solid fa-bell"></i>
                    </Link>

                    <div className="dropdown-divider"></div>

                    <button
                      className="dropdown-item logout"
                      onClick={handleLogout}
                    >
                      <i className="fa-solid fa-right-from-bracket"></i>
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </li>
            </>
          ) : (
            <li>
              <Link to="/login" onClick={closeMenuOnNavigate}>
                تسجيل الدخول
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="progress-container">
        <div className="progress-bar"></div>
      </div>
    </header>
  );
}
