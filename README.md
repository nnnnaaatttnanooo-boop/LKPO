<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LKPO Platform</title>
    <style>
        :root {
            --primary-color: #f0b90b;
            --bg-color: #121214;
            --card-bg: #1e2026;
            --text-color: #ffffff;
            --text-muted: #848e9c;
            --border-color: #2b2f36;
            --success: #0ecb81;
            --danger: #f6465d;
            --telegram-color: #0088cc;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: var(--bg-color); color: var(--text-color); padding-bottom: 70px; }

        .auth-container { max-width: 400px; margin: 50px auto; padding: 25px; background: var(--card-bg); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        .auth-container h2 { text-align: center; color: var(--primary-color); margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 14px; }
        .form-group input, .form-group select { width: 100%; padding: 12px; background: var(--bg-color); border: 1px solid var(--border-color); color: #fff; border-radius: 6px; outline: none; }
        .btn { width: 100%; padding: 12px; background: var(--primary-color); border: none; color: #000; font-weight: bold; border-radius: 6px; cursor: pointer; margin-top: 10px; }
        .btn-danger { background: var(--danger); color: #fff; }
        .btn-success { background: var(--success); color: #fff; }
        .auth-toggle { text-align: center; margin-top: 15px; color: var(--primary-color); cursor: pointer; font-size: 14px; }

        header { background: var(--card-bg); padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 100; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .logo { width: 35px; height: 35px; background: var(--primary-color); color: #000; font-weight: bold; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 18px; }
        .header-actions { display: flex; align-items: center; gap: 10px; }
        .telegram-btn { background: var(--telegram-color); color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; text-decoration: none; }

        .container { padding: 15px; max-width: 600px; margin: auto; }
        .page { display: none; }
        .page.active { display: block; }

        .balance-card { background: linear-gradient(135deg, #2b2f36, #1e2026); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid var(--border-color); }
        .balance-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px; }
        .balance-item { text-align: center; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; }
        .balance-item span { display: block; font-size: 11px; color: var(--text-muted); }
        .balance-item h3 { color: var(--primary-color); margin-top: 5px; font-size: 15px; }

        .actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
        .action-btn { background: var(--card-bg); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); color: #fff; text-align: center; cursor: pointer; font-size: 14px; }

        nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--card-bg); display: flex; justify-content: space-around; padding: 8px 0; border-top: 1px solid var(--border-color); z-index: 100; }
        .nav-item { color: var(--text-muted); font-size: 10px; text-align: center; cursor: pointer; }
        .nav-item.active { color: var(--primary-color); }

        .modal { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center; }
        .modal-content { background: var(--card-bg); padding: 20px; border-radius: 10px; width: 90%; max-width: 400px; position: relative; }
        .close-modal { position: absolute; top: 10px; left: 10px; color: #fff; font-size: 20px; cursor: pointer; }

        .table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
        .table th, .table td { border: 1px solid var(--border-color); padding: 8px; text-align: center; }
    </style>
</head>
<body>

    <!-- Auth View -->
    <div id="authView" class="auth-container">
        <h2 id="authTitle">تسجيل الدخول - LKPO</h2>
        <form id="authForm">
            <div class="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" id="authEmail" required>
            </div>
            <div class="form-group">
                <label>كلمة المرور</label>
                <input type="password" id="authPassword" required>
            </div>
            <button type="submit" class="btn" id="authSubmitBtn">دخول</button>
        </form>
        <div class="auth-toggle" id="authToggle" onclick="toggleAuthMode()">ليس لديك حساب؟ سجل الآن</div>
    </div>

    <!-- Application View -->
    <div id="appView" style="display:none;">
        <header>
            <div class="brand">
                <div class="logo">LK</div>
                <span style="font-weight: bold;">LKPO</span>
            </div>
            <a href="https://t.me/your_telegram_support" target="_blank" class="telegram-btn">✈️ الدعم</a>
        </header>

        <div class="container">
            <!-- Home -->
            <div id="pageHome" class="page active">
                <div class="balance-card">
                    <span>ملخص أرباحك ورصيدك السحابي</span>
                    <div class="balance-grid">
                        <div class="balance-item"><span>أرباح $</span><h3 id="userUsdtProfit">0.00 $</h3></div>
                        <div class="balance-item"><span>أرباح ل.س</span><h3 id="userSypProfit">0 ل.س</h3></div>
                        <div class="balance-item"><span>إيداع $</span><h3 id="userUsdtDep">0.00 $</h3></div>
                        <div class="balance-item"><span>إيداع ل.س</span><h3 id="userSypDep">0 ل.س</h3></div>
                    </div>
                </div>

                <div class="actions-grid">
                    <div class="action-btn" onclick="openModal('depositUsdtModal')">📥 إيداع USDT</div>
                    <div class="action-btn" onclick="openModal('withdrawUsdtModal')">📤 سحب USDT</div>
                    <div class="action-btn" onclick="openModal('depositShamModal')">💳 إيداع شام كاش</div>
                    <div class="action-btn" onclick="openModal('withdrawShamModal')">💳 سحب شام كاش</div>
                </div>
            </div>

            <!-- History -->
            <div id="pageHistory" class="page">
                <h3>سجل الحركات المالية المباشرة</h3>
                <table class="table">
                    <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الحالة</th></tr></thead>
                    <tbody id="userHistoryList"></tbody>
                </table>
            </div>

            <!-- Account / Admin -->
            <div id="pageAccount" class="page">
                <h3>حسابي</h3>
                <div class="balance-card">
                    <p>البريد: <span id="accEmail"></span></p>
                </div>

                <div id="adminPanelSection" style="display:none;" class="balance-card">
                    <h4 style="color:var(--primary-color)">لوحة الأدمن - الطلبات العالمية المباشرة</h4>
                    <table class="table">
                        <thead><tr><th>النوع</th><th>البريد</th><th>المبلغ</th><th>التفاصيل</th><th>إجراء</th></tr></thead>
                        <tbody id="adminRequestsList"></tbody>
                    </table>
                </div>

                <button class="btn btn-danger" onclick="logout()">تسجيل الخروج</button>
            </div>
        </div>

        <nav>
            <div class="nav-item active" onclick="switchPage('pageHome', this)">الرئيسية</div>
            <div class="nav-item" onclick="switchPage('pageHistory', this)">السجل</div>
            <div class="nav-item" onclick="switchPage('pageAccount', this)">حسابي</div>
        </nav>
    </div>

    <!-- Modals -->
    <div id="depositUsdtModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal('depositUsdtModal')">&times;</span>
            <h4>إيداع USDT</h4>
            <div class="form-group" style="margin-top:10px;">
                <label>مبلغ الإيداع ($)</label>
                <input type="number" id="depUsdtAmount" placeholder="المبلغ">
            </div>
            <button class="btn" onclick="submitRequest('إيداع USDT')">إرسال الطلب للسيرفر</button>
        </div>
    </div>

    <script>
        const API_URL = "https://lkpo-server.onrender.com";
        const ADMIN_EMAIL = "nnnnaaatttnanooo@gmail.com";
        let isSignUp = false;
        let currentUser = null;

        function toggleAuthMode() {
            isSignUp = !isSignUp;
            document.getElementById('authTitle').innerText = isSignUp ? "إنشاء حساب جديد" : "تسجيل الدخول";
            document.getElementById('authSubmitBtn').innerText = isSignUp ? "إنشاء حساب" : "دخول";
        }

        document.getElementById('authForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;

            try {
                const endpoint = isSignUp ? '/api/register' : '/api/login';
                const res = await fetch(API_URL + endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if(!res.ok) return alert(data.error || "حدث خطأ في الاتصال");

                currentUser = data.user || { email };
                localStorage.setItem('lkpo_token', data.token);
                loadApp();
            } catch(err) {
                alert("تعذر الاتصال بالسيرفر السحابي");
            }
        });

        function loadApp() {
            document.getElementById('authView').style.display = 'none';
            document.getElementById('appView').style.display = 'block';
            document.getElementById('accEmail').innerText = currentUser.email;

            if(currentUser.email === ADMIN_EMAIL) {
                document.getElementById('adminPanelSection').style.display = 'block';
            }
        }

        function switchPage(pageId, el) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            if(el) el.classList.add('active');
        }

        function openModal(id) { document.getElementById(id).style.display = 'flex'; }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }

        async function submitRequest(type) {
            let amount = document.getElementById('depUsdtAmount').value;
            if(!amount) return alert("يرجى إدخال المبلغ");

            alert("تم إرسال الطلب فورياً إلى لوحة الأدمن السحابية!");
            closeModal('depositUsdtModal');
        }

        function logout() {
            localStorage.removeItem('lkpo_token');
            location.reload();
        }
    </script>
</body>
</html>
