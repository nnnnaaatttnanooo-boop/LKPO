const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// إعداد CORS للسموح بجميع الطلبات والواجهات
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// الاتصال بقاعدة البيانات
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mohamadshk654_db_user:Ayhm2002@cluster0.ositygo.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("تم الاتصال بقاعدة البيانات MongoDB بنجاح"))
  .catch(err => console.error("خطأ في الاتصال بقاعدة البيانات:", err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  vipLevel: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const depositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Deposit = mongoose.model('Deposit', depositSchema);

app.get('/', (req, res) => {
  res.send("LKPO Server is Running Successfully!");
});

// فتح حساب جديد
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "يرجى تعبئة جميع الحقول" });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
    }

    const newUser = new User({ username, password, balance: 0, vipLevel: 1 });
    await newUser.save();
    return res.status(201).json({ message: "تم إنشاء الحساب بنجاح! رصيدك $0", user: newUser });
  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ في السيرفر: " + err.message });
  }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(400).json({ message: "بيانات الدخول غير صحيحة" });
    }

    return res.json({ message: "تم تسجيل الدخول بنجاح", user });
  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ في السيرفر: " + err.message });
  }
});

// طلب إيداع
app.post('/api/deposit/request', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const deposit = new Deposit({ userId, amount, status: 'pending' });
    await deposit.save();
    return res.json({ message: "تم إرسال طلب الإيداع وهو قيد المراجعة", deposit });
  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ في السيرفر: " + err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`LKPO Server running on port ${PORT}`);
});
