const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. الاتصال بقاعدة البيانات (ضع كلمة المرور الخاصة بك بدلاً من كلمة: ضع_كلمة_المرور_هنا)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mohamadshk654_db_user:U4QMfaokmmmO61QE@cluster0.ositygo.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("تم الاتصال بقاعدة البيانات MongoDB بنجاح"))
  .catch(err => console.error("خطأ في الاتصال بقاعدة البيانات:", err));

// 2. نموذج المستخدم (الرصيد يبدأ بـ 0 والمستوى vip1)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  vipLevel: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 3. نموذج الإيداعات
const depositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Deposit = mongoose.model('Deposit', depositSchema);

// --- المسارات البرمجية ---

app.get('/', (req, res) => {
  res.send("LKPO Server is Running Successfully!");
});

// فتح حساب جديد (رصيد 0)
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });

    const newUser = new User({ username, password, balance: 0, vipLevel: 1 });
    await newUser.save();
    res.status(201).json({ message: "تم إنشاء الحساب بنجاح. رصيدك الحالي 0$", user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(400).json({ message: "بيانات الدخول غير صحيحة" });

    res.json({ message: "تم تسجيل الدخول بنجاح", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// طلب إيداع
app.post('/api/deposit/request', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const deposit = new Deposit({ userId, amount, status: 'pending' });
    await deposit.save();
    res.json({ message: "تم إرسال طلب الإيداع وهو قيد المراجعة", deposit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// تأكيد الإيداع (إضافة المبلغ للرصيد وفتح VIP2)
app.post('/api/admin/approve-deposit', async (req, res) => {
  try {
    const { depositId } = req.body;
    const deposit = await Deposit.findById(depositId);
    if (!deposit || deposit.status !== 'pending') {
      return res.status(400).json({ message: "الطلب غير موجود أو تمت معالجته سابقاً" });
    }

    deposit.status = 'approved';
    await deposit.save();

    const user = await User.findById(deposit.userId);
    if (user) {
      user.balance += deposit.amount;
      if (user.vipLevel < 2) {
        user.vipLevel = 2; // فتح مستوى vip2
      }
      await user.save();
    }

    res.json({ message: "تم تأكيد الإيداع وإضافة المبلغ للرصيد وتفعيل VIP2", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`LKPO Server running on port ${PORT}`);
});
