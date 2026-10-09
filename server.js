const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// رابط قاعدة البيانات
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mohamadshk654_db_user:Ayhm2002@cluster0.ositygo.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
  .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// 1. مخطط المستخدم
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balanceUSD: { type: Number, default: 0 },
  balanceSYP: { type: Number, default: 0 },
  vipLevel: { type: Number, default: 1 },
  referralCode: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 2. مخطط المعاملات والطلبات (إيداع وسحب)
const TransactionSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  type: String,        // 'إيداع' أو 'سحب'
  method: String,      // 'دولار (USDT)' أو 'شام كاش'
  network: String,     // 'TRC20', 'BEP20', إلخ
  amount: Number,
  addressOrCode: String, // عنوان محفظة المستخدم للسحب
  status: { type: String, default: 'قيد الانتظار' },
  createdAt: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', TransactionSchema);

// === مسارات المستخدمين (Auth) ===

app.post('/api/register', async (req, res) => {
  try {
    const { username, password, referralCode } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ success: false, message: 'اسم المستخدم/البريد مسجل بالفعل' });

    const newUser = new User({ username, password, referralCode: referralCode || '' });
    await newUser.save();
    res.json({ success: true, message: 'تم فتح الحساب بنجاح!', user: newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(400).json({ success: false, message: 'بيانات الدخول غير صحيحة' });

    res.json({ success: true, message: 'تم تسجيل الدخول بنجاح!', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر' });
  }
});

// جلب بيانات حساب المستخدم الحالي والأرصدة
app.get('/api/user/:email', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.email });
    if (user) res.json(user);
    else res.status(404).json({});
  } catch (err) {
    res.status(500).json({});
  }
});

// === مسارات المعاملات والطلبات ===

// إرسال طلب جديد (إيداع أو سحب)
app.post('/api/transactions/request', async (req, res) => {
  try {
    const { userId, userEmail, type, method, network, amount, addressOrCode } = req.body;
    const tx = new Transaction({ userId, userEmail, type, method, network, amount, addressOrCode });
    await tx.save();
    res.json({ success: true, message: 'تم إرسال الطلب بنجاح، وهو قيد المراجعة' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حفظ الطلب' });
  }
});

// جلب سجل المعاملات لمستخدم معين
app.get('/api/transactions/user/:email', async (req, res) => {
  try {
    const txs = await Transaction.find({ userEmail: req.params.email }).sort({ createdAt: -1 });
    res.json(txs);
  } catch (err) {
    res.status(500).json([]);
  }
});

// جلب جميع الطلبات المعلقة للأدمن
app.get('/api/transactions/admin', async (req, res) => {
  try {
    const txs = await Transaction.find({ status: 'قيد الانتظار' }).sort({ createdAt: -1 });
    res.json(txs);
  } catch (err) {
    res.status(500).json([]);
  }
});

// تحديث حالة الطلب من الأدمن + تحديث رصيد المستخدم تلقائياً عند الموافقة
app.post('/api/transactions/admin/update', async (req, res) => {
  try {
    const { txId, status } = req.body;

    const tx = await Transaction.findById(txId);
    if (!tx) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    if (tx.status === 'قيد الانتظار' && status === 'مقبول') {
      const user = await User.findOne({ username: tx.userEmail });
      
      if (user) {
        if (tx.type === 'إيداع') {
          if (tx.method.includes('دولار')) {
            user.balanceUSD += tx.amount;
          } else if (tx.method.includes('شام كاش')) {
            user.balanceSYP += tx.amount;
          }
        } else if (tx.type === 'سحب') {
          if (tx.method.includes('دولار')) {
            if (user.balanceUSD < tx.amount) {
              return res.status(400).json({ success: false, message: 'رصيد المستخدم غير كافٍ للسحب' });
            }
            user.balanceUSD -= tx.amount;
          } else if (tx.method.includes('شام كاش')) {
            if (user.balanceSYP < tx.amount) {
              return res.status(400).json({ success: false, message: 'رصيد المستخدم غير كافٍ للسحب' });
            }
            user.balanceSYP -= tx.amount;
          }
        }
        await user.save();
      }
    }

    tx.status = status;
    await tx.save();

    res.json({ success: true, message: `تمت تحديث حالة الطلب إلى (${status}) وتحديث رصيد المستخدم تلقائياً` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث الحساب' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`)); 
