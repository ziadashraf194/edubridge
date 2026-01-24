import "../style/section1.css";
import Button from "./buttons";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";

export default function Section1() {
  const [token, setToken] = useState(null);
  const [loginState, setLoginState] = useState({
    btn1Text: "تسجيل الدخول",
    btn2Text: "إنشاء حساب",
    btn1Link: "/login",
    btn2Link: "/register",
  });

  const [heroText, setHeroText] = useState(
    "انضم إلى آلاف الطلاب حول العالم واستكشف دورات تعليمية متنوعة مع أفضل المعلمين"
  );

  useEffect(() => {
    const t = Cookies.get("token");
    setToken(t);

    if (t) {
      setLoginState({
        btn1Text: "كورساتي",
        btn2Text: "حسابي",
        btn1Link: "/mycourses",
        btn2Link: "/profile",
      });

      setHeroText("مرحبًا بعودتك !");
    }
  }, []);

  return (
    <>
    <section className="Section1">
      <div className="hero-content">
        <div className="hero-text">
          <h1>جسرك نحو التفوق</h1>
          <p>{heroText}</p>
          <div className="Section1-btn">
            <Button
              kind="thr"
              link={loginState.btn1Link}
              text={loginState.btn1Text}
              height="60"
              width="250"
            />
            <Button
              kind="fri"
              link={loginState.btn2Link}
              text={loginState.btn2Text}
              height="60"
              width="250"
            />
          </div>
        </div>
            <div className="hero-image">
                <svg width="500" height="400" viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="250" cy="200" r="150" fill="white" opacity="0.1"/>
                    <circle cx="250" cy="200" r="120" fill="white" opacity="0.2"/>
                    <rect x="150" y="120" width="200" height="160" rx="10" fill="white"/>
                    <circle cx="250" cy="200" r="40" fill="#667eea"/>
                    <path d="M230 200L260 180V220L230 200Z" fill="white"/>
                </svg>
            </div>
       </div>
        

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
  <defs>
    <linearGradient id="waveGradient" gradientTransform="rotate(135)">
      <stop offset="0%" stopColor="#1a1a2e" />
      <stop offset="100%" stopColor="#16213e" />
    </linearGradient>
  </defs>
  <path
    fill="url(#waveGradient)"
    fillOpacity="1"
    d="M0,96L20,106.7C40,117,80,139,120,176C160,213,200,267,240,272C280,277,320,235,360,208C400,181,440,171,480,160C520,149,560,139,600,154.7C640,171,680,213,720,218.7C760,224,800,192,840,170.7C880,149,920,139,960,138.7C1000,139,1040,149,1080,149.3C1120,149,1160,139,1200,149.3C1240,160,1280,192,1320,192C1360,192,1400,160,1420,144L1440,128L1440,320L1420,320C1400,320,1360,320,1320,320C1280,320,1240,320,1200,320C1160,320,1120,320,1080,320C1040,320,1000,320,960,320C920,320,880,320,840,320C800,320,760,320,720,320C680,320,640,320,600,320C560,320,520,320,480,320C440,320,400,320,360,320C320,320,280,320,240,320C200,320,160,320,120,320C80,320,40,320,20,320L0,320Z"
  />
</svg>

 </section>
        </>
    )
}