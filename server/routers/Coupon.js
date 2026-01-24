const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Course = require("../models/Course")
require("dotenv").config();
jwt = require("jsonwebtoken");
const ExcelJS = require('exceljs');
router.post('/generate', async (req, res) => {
  try {
    const { courseId, count = 1, discount, usageLimit, expiresAt } = req.body;
    if (!courseId || !expiresAt) return res.status(400).json({ msg: 'الرجاء إدخال جميع البيانات المطلوبة' });
    if (usageLimit < 1) return res.status(400).json({ msg: 'عدد الاستخدامات يجب أن يكون على الأقل 1' });
            const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;
     course = await Course.findById(courseId)

     if(course.teacher!= teacherId ){
      console.log(course.teacher);

      
        return res.status(400).json({ msg: 'حدث خطا' });
     }
    const expiryDate = new Date(expiresAt);
    if (expiryDate <= new Date()) return res.status(400).json({ msg: 'تاريخ الانتهاء يجب أن يكون في المستقبل' });

    const generateUniqueCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; 
  let code, isUnique = false;
  let attempts = 0;
  const codeLength = 8;
  const generateCodeString = () => {
    let result = '';
    for (let i = 0; i < codeLength; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  while (!isUnique && attempts < 10) {
    code = generateCodeString();
    if (!await Coupon.findOne({ code })) isUnique = true; 
    attempts++;
  }

  if (!isUnique) throw new Error('فشل في إنشاء كود فريد');
  return code;
};

    const coupons = [];
    for (let i = 0; i < Math.min(Math.max(parseInt(count), 1), 100); i++) {
      const code = await generateUniqueCode();
      coupons.push(new Coupon({
        code,
        courseId,
        expiresAt: expiryDate,
        usageLimit: usageLimit || 1,
        usedCount: 0,
        isActive: true
      }));
    }

    const savedCoupons = await Coupon.insertMany(coupons);
    res.status(201).json({ msg: `تم إنشاء ${savedCoupons.length} كود بنجاح`, coupons: savedCoupons });

  } catch (error) {
    console.error('Error generating coupons:', error);
    res.status(500).json({ msg: error || 'حدث خطأ أثناء إنشاء الأكواد' });
  }
});

// جلب أكواد كورس معين
router.get('/course/:courseId', async (req, res) => {
  try {
    
    const { courseId } = req.params;
              const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;
     course = await Course.findById(courseId)

     if(course.teacher!= teacherId ){
      console.log(course.teacher);

      
        return res.status(400).json({ msg: 'حدث خطا' });
     }
    const coupons = await Coupon.find({ courseId }).sort({ createdAt: -1 });
    res.json(coupons);

  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ msg: error.message || 'حدث خطأ أثناء جلب الأكواد' });
  }
});

// التحقق من صحة الكوبون
router.post('/validate', async (req, res) => {
  try {
    const { code, courseId } = req.body;
    if (!code || !courseId) return res.status(400).json({ msg: 'الرجاء إدخال الكود ومعرف الكورس' });

    const coupon = await Coupon.findOne({ code, courseId });
    if (!coupon) return res.status(404).json({ msg: 'الكود غير صحيح' });
    if (!coupon.isActive) return res.status(400).json({ msg: 'هذا الكود غير نشط' });
    if (new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ msg: 'انتهت صلاحية هذا الكود' });
    if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ msg: 'تم استخدام هذا الكود بالكامل' });

    res.json({ valid: true, discount: coupon.discount, msg: 'الكود صحيح' });

  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ msg: 'حدث خطأ أثناء التحقق من الكود' });
  }
});

// استخدام الكوبون
router.post('/use', async (req, res) => {
  try {
      token = req.cookies.token
   decoded = jwt.verify(token,process.env.secretJwt)
   userId= decoded.id
    const { code, courseId } = req.body;
    if (!code || !courseId || !userId) return res.status(400).json({ msg: 'الرجاء إدخال الكود ومعرف الكورس ومعرف المستخدم' });
 
    const coupon = await Coupon.findOne({ code, courseId });
    if (!coupon) return res.status(404).json({ msg: 'الكود غير صحيح' });
    if (!coupon.isActive) return res.status(400).json({ msg: 'هذا الكود غير نشط' });
    if (new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ msg: 'انتهت صلاحية هذا الكود' });
    if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ msg: 'تم استخدام هذا الكود بالكامل' });

    if (coupon.usageHistory?.some(u => u.userId.toString() === userId.toString())) {
      return res.status(400).json({ msg: 'لقد استخدمت هذا الكود من قبل' });
    }

    coupon.usedCount += 1;
    coupon.usageHistory = coupon.usageHistory || [];
    coupon.usageHistory.push({ userId, usedAt: new Date() });
    await coupon.save();
          const course = await Course.findById(courseId);
      
      if (!course.students.includes(userId)) {
        course.students.push(userId);
      }

      await course.save();



    res.json({ success: true, discount: coupon.discount, msg: 'تم تطبيق الكود بنجاح' });

  } catch (error) {
    console.error('Error using coupon:', error);
    res.status(500).json({ msg: 'حدث خطأ أثناء استخدام الكود' });
  }
});

// تحديث حالة الكوبون
router.patch('/:couponId', async (req, res) => {
  try {
    const { couponId } = req.params;
    const { isActive } = req.body;
    const coupon = await Coupon.findById(couponId);
    if (!coupon) return res.status(404).json({ msg: 'الكود غير موجود' });

    coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;
    await coupon.save();
    res.json({ msg: isActive ? 'تم تفعيل الكود بنجاح' : 'تم إيقاف الكود بنجاح', coupon });

  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ msg: error.message || 'حدث خطأ أثناء تحديث الكود' });
  }
});

// حذف الكوبون
router.delete('/:couponId', async (req, res) => {
  try {
    const { couponId } = req.params;
    const coupon = await Coupon.findById(couponId);
    if (!coupon) return res.status(404).json({ msg: 'الكود غير موجود' });

    if (coupon.usedCount > 0) return res.status(400).json({ msg: 'لا يمكن حذف كود تم استخدامه. يمكنك إيقافه بدلاً من ذلك' });

    await Coupon.findByIdAndDelete(couponId);
    res.json({ msg: 'تم حذف الكود بنجاح' });

  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ msg: error.message || 'حدث خطأ أثناء حذف الكود' });
  }
});

// إحصائيات الأكواد
router.get('/stats/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
          const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;
     course = await Course.findById(courseId)

     if(course.teacher!= teacherId ){
      console.log(course.teacher);

      
        return res.status(400).json({ msg: 'حدث خطا' });
     }
    const totalCoupons = await Coupon.countDocuments({ courseId });
    const activeCoupons = await Coupon.countDocuments({ courseId, isActive: true });
    const expiredCoupons = await Coupon.countDocuments({ courseId, expiresAt: { $lt: new Date() } });
    const fullyUsedCoupons = await Coupon.countDocuments({ courseId, $expr: { $gte: ['$usedCount', '$usageLimit'] } });

    // نستخدم courseId كسلسلة وليس ObjectId
    const totalUsage = await Coupon.aggregate([
      { $match: { courseId } },
      { $group: { _id: null, total: { $sum: '$usedCount' } } }
    ]);

    res.json({ 
      totalCoupons, 
      activeCoupons, 
      expiredCoupons, 
      fullyUsedCoupons, 
      totalUsage: totalUsage[0]?.total || 0 
    });

  } catch (error) {
    console.error('Error fetching coupon stats:', error);
    res.status(500).json({ msg: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
});

// Export coupons as Excel
router.get('/export/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.secretJwt);
    const teacherId = decoded.id;
    const course = await Course.findById(courseId);
    if (!course || course.teacher != teacherId) return res.status(403).json({ msg: 'لا تملك صلاحية الوصول لهذه الدورة' });

    const coupons = await Coupon.find({ courseId }).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Coupons');

    sheet.columns = [
      { header: 'الكود', key: 'code', width: 20 },
      { header: 'الاستخدامات المسموح بها', key: 'usageLimit', width: 20 },
      { header: 'عدد الاستخدامات', key: 'usedCount', width: 15 },
      { header: 'الحالة', key: 'isActive', width: 12 },
      { header: 'تاريخ الانتهاء', key: 'expiresAt', width: 20 },

    ];

    coupons.forEach(c => {
      sheet.addRow({
        code: c.code,
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        isActive: c.isActive ? 'نشط' : 'متوقف',
        expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : 'غير محدد',
        courseId: c.courseId.toString()
      });
    });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="codes_${courseId}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exporting coupons:', error);
    res.status(500).json({ msg: 'حدث خطأ أثناء تصدير الأكواد' });
  }
});


module.exports = router;
