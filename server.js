const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://mohamadshk654_db_user:Ayhm2002@cluster0.ositygo.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
  .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// 1. مخطط المستخدم المعدل (إضافة مستويات الباقات وتتبع الاشتراكات)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // أرصدة الدولار
  capitalUSD: { type: Number, default: 0 },
  profitUSD: { type: Number, default: 0 },
  activeVipUSD: { type: Number, default: 0 }, // مستوى VIP النشط بالدولار (0 يعني غير مشترك)
  
  // أرصدة الليرة السورية
  capitalSYP: { type: Number, default: 0 },
  profitSYP: { type: Number, default: 0 },
  activeVipSYP: { type: Number, default: 0 }, // مستوى VIP النشط بالليرة (0 يعني غير مشترك)
  
  lastBotRunUSD: { type: Date },
  lastBotRunSYP: { type: Date },
  referralCode: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// 2. مخطط المعاملات والطلبات
const TransactionSchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  type: String,        // 'إيداع' أو 'سحب' أو 'ربح مهمة' أو 'اشتراك VIP'
  method: String,
  network: String,
  amount: Number,
  addressOrCode: String,
  status: { type: String, default: 'قيد الانتظار' },
  createdAt: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', TransactionSchema);

// أسعار ونسب باقات VIP
const VIP_USD_PACKS = [
  { level: 1, price: 5, rate: 0.15 },
  { level: 2, price: 20, rate: 0.17 },
  { level: 3, price: 50, rate: 0.19 },
  { level: 4, price: 100, rate: 0.21 },
  { level: 5, price: 300, rate: 0.23 },
  { level: 6, price: 500, rate: 0.25 },
  { level: 7, price: 1000, rate: 0.27 },
  { level: 8, price: 2000, rate: 0.30 }
];

const VIP_SYP_PACKS = [
  { level: 1, price: 675, rate: 0.15 },
  { level: 2, price: 2700, rate: 0.17 },
  { level: 3, price: 6750, rate: 0.19 },
  { level: 4, price: 13500, rate: 0.21 },
  { level: 5, price: 40500, rate: 0.23 },
  { level: 6, price: 67500, rate: 0.25 },
  { level: 7, price: 135000, rate: 0.27 },
  { level: 8, price: 270000, rate: 0.30 }
];

// === مسارات الحسابات ===

app.post('/api/register', async (req, res) => {
  try {
    const { username, password, referralCode } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ success: false, message: 'اسم المستخدم مسجل بالفعل' });

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

app.get('/api/user/:email', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.email });
    if (user) res.json(user);
    else res.status(404).json({});
  } catch (err) {
    res.status(500).json({});
  }
});

// === طلب اشتراك في باقة VIP ===
app.post('/api/vip/subscribe', async (req, res) => {
  try {
    const { email, level, type } = req.body;
    const user = await User.findOne({ username: email });
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    const packs = type === 'usd' ? VIP_USD_PACKS : VIP_SYP_PACKS;
    const pack = packs.find(p => p.level === level);

    if (!pack) return res.status(400).json({ success: false, message: 'الباقة غير موجودة' });

    if (type === 'usd') {
      if (user.capitalUSD < pack.price) return res.status(400).json({ success: false, message: `رأس المال غير كافٍ! تحتاج إلى إيداع $${pack.price}` });
      user.activeVipUSD = level;
    } else {
      if (user.capitalSYP < pack.price) return res.status(400).json({ success: false, message: `رأس المال غير كافٍ! تحتاج إلى إيداع ${pack.price} L.S` });
      user.activeVipSYP = level;
    }

    await user.save();

    const tx = new Transaction({
      userId: user._id,
      userEmail: user.username,
      type: 'اشتراك VIP',
      method: type === 'usd' ? 'دولار (USDT)' : 'شام كاش',
      amount: pack.price,
      status: 'مقبول'
    });
    await tx.save();

    res.json({ success: true, message: `تم تفعيل اشتراك VIP ${level} بنجاح! يمكنك الآن تشغيل الروبوت اليومي.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء الاشتراك' });
  }
});

// === تشغيل الروبوت مع التحقق من اشتراك VIP ===
app.post('/api/bot/run', async (req, res) => {
  try {
    const { email, type } = req.body;
    const user = await User.findOne({ username: email });
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    // 1. التحقق من وجود اشتراك VIP نشط
    if (type === 'usd' && (!user.activeVipUSD || user.activeVipUSD === 0)) {
      return res.status(400).json({ success: false, message: 'عذراً! لا يمكنك تشغيل روبوت الدولار بدون الاشتراك في إحدى باقات VIP الخاصة بالدولار أولاً.' });
    }
    if (type === 'syp' && (!user.activeVipSYP || user.activeVipSYP === 0)) {
      return res.status(400).json({ success: false, message: 'عذراً! لا يمكنك تشغيل روبوت الليرة بدون الاشتراك في إحدى باقات VIP الخاصة بالليرة السورية أولاً.' });
    }

    const now = new Date();
    const lastRun = type === 'usd' ? user.lastBotRunUSD : user.lastBotRunSYP;

    // 2. التحقق من شرط الـ 24 ساعة
    if (lastRun && (now - new Date(lastRun)) < 24 * 60 * 60 * 1000) {
      const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now - new Date(lastRun))) / (1000 * 60 * 60));
      return res.status(400).json({ success: false, message: `لقد نفذت المهمة اليوم! يمكنك التشغيل مجدداً بعد ${hoursLeft} ساعة` });
    }

    // 3. حساب الأرباح القائمة على مستوى VIP للمستخدم
    let profit = 0;
    if (type === 'usd') {
      const pack = VIP_USD_PACKS.find(p => p.level === user.activeVipUSD);
      profit = parseFloat((pack.price * pack.rate).toFixed(2));
      user.profitUSD += profit;
      user.lastBotRunUSD = now;
    } else {
      const pack = VIP_SYP_PACKS.find(p => p.level === user.activeVipSYP);
      profit = Math.round(pack.price * pack.rate);
      user.profitSYP += profit;
      user.lastBotRunSYP = now;
    }

    await user.save();

    const tx = new Transaction({
      userId: user._id,
      userEmail: user.username,
      type: 'ربح مهمة',
      method: type === 'usd' ? 'دولار (USDT)' : 'شام كاش',
      amount: profit,
      status: 'مقبول'
    });
    await tx.save();

    res.json({ success: true, message: `تم تنفيذ المهمة اليومية بنجاح! تم إضافة ${profit} ${type === 'usd' ? '$' : 'L.S'} إلى رصيد الأرباح المتاح للسحب.`, profit });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تشغيل الروبوت' });
  }
});

// === طلبات الإيداع والسحب ===

app.post('/api/transactions/request', async (req, res) => {
  try {
    const { userId, userEmail, type, method, network, amount, addressOrCode } = req.body;
    
    if (type === 'سحب') {
      const user = await User.findOne({ username: userEmail });
      if (method.includes('دولار') && user.profitUSD < amount) {
        return res.status(400).json({ success: false, message: `رصيد الأرباح المتاح للسحب هو $${user.profitUSD} فقط!` });
      }
      if (method.includes('شام كاش') && user.profitSYP < amount) {
        return res.status(400).json({ success: false, message: `رصيد الأرباح المتاح للسحب هو ${user.profitSYP} L.S فقط!` });
      }
    }

    const tx = new Transaction({ userId, userEmail, type, method, network, amount, addressOrCode });
    await tx.save();
    res.json({ success: true, message: 'تم إرسال الطلب بنجاح، وهو قيد المراجعة' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء إرسال الطلب' });
  }
});

app.get('/api/transactions/user/:email', async (req, res) => {
  try {
    const txs = await Transaction.find({ userEmail: req.params.email }).sort({ createdAt: -1 });
    res.json(txs);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.get('/api/transactions/admin', async (req, res) => {
  try {
    const txs = await Transaction.find({ status: 'قيد الانتظار' }).sort({ createdAt: -1 });
    res.json(txs);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.post('/api/transactions/admin/update', async (req, res) => {
  try {
    const { txId, status } = req.body;
    const tx = await Transaction.findById(txId);
    if (!tx) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    if (tx.status === 'قيد الانتظار' && status === 'مقبول') {
      const user = await User.findOne({ username: tx.userEmail });
      
      if (user) {
        if (tx.type === 'إيداع') {
          if (tx.method.includes('دولار')) user.capitalUSD += tx.amount;
          else if (tx.method.includes('شام كاش')) user.capitalSYP += tx.amount;
        } else if (tx.type === 'سحب') {
          if (tx.method.includes('دولار')) user.profitUSD -= tx.amount;
          else if (tx.method.includes('شام كاش')) user.profitSYP -= tx.amount;
        }
        await user.save();
      }
    }

    tx.status = status;
    await tx.save();

    res.json({ success: true, message: `تم تحديث الطلب بنجاح (${status})` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'حدث خطأ في التحديث' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
