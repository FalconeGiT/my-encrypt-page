

    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
    import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
    import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

    // Firebase config
    const firebaseConfig = {
      apiKey: "AIzaSyCNuKqEG4wQLVjPYdSnw284fW8A7epqRmA",
      authDomain: "popiram-cee4a.firebaseapp.com",
      projectId: "popiram-cee4a",
      storageBucket: "popiram-cee4a.appspot.com",
      messagingSenderId: "762606980339",
      appId: "1:762606980339:web:1c1ede281be55f48b43b86",
      measurementId: "G-QZC4073YKZ"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // UID المسموح به فقط
    const ALLOWED_UID = "S4WyLREq2Ob9QRE7NiROMn7qVYf1";

    // دالة لاشتقاق مفتاح AES-256 من كلمة المرور باستخدام PBKDF2
    async function deriveKey(password, salt) {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      const saltBuffer = encoder.encode(salt);
      
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        "PBKDF2",
        false,
        ["deriveKey"]
      );
      
      return await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: saltBuffer,
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-CBC", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    }

    // دالة التشفير باستخدام AES-256
    async function encryptData(data, password) {
      try {
        const salt = "fixed_salt_for_demo"; // في التطبيق الحقيقي، استخدم salt عشوائي
        const key = await deriveKey(password, salt);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const encrypted = await crypto.subtle.encrypt(
          { name: "AES-CBC", iv },
          key,
          dataBuffer
        );
        
        // ندمج IV مع البيانات المشفرة
        const result = new Uint8Array(iv.length + encrypted.byteLength);
        result.set(iv, 0);
        result.set(new Uint8Array(encrypted), iv.length);
        
        return btoa(String.fromCharCode(...result));
      } catch (error) {
        console.error("Encryption error:", error);
        throw error;
      }
    }

    // دالة فك التشفير
    async function decryptData(encryptedData, password) {
      try {
        const salt = "fixed_salt_for_demo"; // نفس salt المستخدم في التشفير
        const key = await deriveKey(password, salt);
        const decoder = new TextDecoder();
        
        const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        const iv = encryptedBuffer.slice(0, 16);
        const data = encryptedBuffer.slice(16);
        
        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-CBC", iv },
          key,
          data
        );
        
        return decoder.decode(decrypted);
      } catch (error) {
        console.error("Decryption error:", error);
        return null;
      }
    }

    window.login = async function() {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const msg = document.getElementById("msg");

      try {
        // تشفير بيانات الاعتماد قبل إرسالها
        const encryptionKey = password;
        const encryptedEmail = await encryptData(email, encryptionKey);
        const encryptedPassword = await encryptData(password, encryptionKey);

        // محاولة تسجيل الدخول
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (user.uid !== ALLOWED_UID) {
          msg.style.color = "red";
          msg.textContent = "❌ Access Denied!";
          await signOut(auth);
          return;
        }
        
        // نجاح تسجيل الدخول - حفظ بيانات التشفير في الجلسة
        sessionStorage.setItem('encryptionKey', encryptionKey);
        sessionStorage.setItem('encryptedEmail', encryptedEmail);
        sessionStorage.setItem('encryptedPassword', encryptedPassword);
        
        // إخفاء نموذج تسجيل الدخول وإظهار Dashboard
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        document.getElementById("welcome").textContent = "✅ مرحبا essafi!";
        
        // تحميل البيانات من Firestore
        await loadSites();
        
      } catch (error) {
        msg.style.color = "red";
        msg.textContent = "Error: " + error.message;
      }
    };

    window.logout = function(){
      signOut(auth).then(()=>{
        // مسح بيانات الجلسة
        sessionStorage.removeItem('encryptionKey');
        sessionStorage.removeItem('encryptedEmail');
        sessionStorage.removeItem('encryptedPassword');
        
        document.getElementById("dashboard").style.display = "none";
        document.getElementById("loginBox").style.display = "block";
        document.getElementById("msg").textContent = "";
      });
    }

    // وظائف إدارة المواقع في Dashboard
    window.addSite = async function() {
      const siteName = document.getElementById("siteName").value;
      const siteEmail = document.getElementById("siteEmail").value;
      const sitePassword = document.getElementById("sitePassword").value;
      
      if (!siteName || !siteEmail) {
        alert("يرجى إدخال اسم الموقع والبريد الإلكتروني");
        return;
      }
      
      try {
        const encryptionKey = sessionStorage.getItem('encryptionKey');
        
        // تشفير جميع البيانات
        const encryptedName = await encryptData(siteName, encryptionKey);
        const encryptedEmail = await encryptData(siteEmail, encryptionKey);
        const encryptedPassword = await encryptData(sitePassword, encryptionKey);
        
        await addDoc(collection(db, "sites"), {
          name: encryptedName,
          email: encryptedEmail,
          password: encryptedPassword,
          createdAt: new Date(),
          userId: ALLOWED_UID
        });
        
        // إعادة تعيين الحقول
        document.getElementById("siteName").value = "";
        document.getElementById("siteEmail").value = "";
        document.getElementById("sitePassword").value = "";
        
        // إعادة تحميل القائمة
        await loadSites();
        
        showToast("تم إضافة الموقع بنجاح!");
      } catch (error) {
        console.error("Error adding site: ", error);
        showToast("حدث خطأ أثناء إضافة الموقع", true);
      }
    }

    window.loadSites = async function() {
      const sitesList = document.getElementById("sitesList");
      sitesList.innerHTML = "<p>جاري تحميل البيانات...</p>";
      
      try {
        const querySnapshot = await getDocs(collection(db, "sites"));
        const encryptionKey = sessionStorage.getItem('encryptionKey');
        
        if (querySnapshot.empty) {
          sitesList.innerHTML = "<p>لا توجد مواقع مسجلة بعد</p>";
          return;
        }
        
        let html = `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>اسم الموقع</th>
                  <th>البريد الإلكتروني</th>
                  <th>كلمة المرور</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          
          // فك تشفير جميع البيانات
          let decryptedName = await decryptData(data.name, encryptionKey);
          let decryptedEmail = await decryptData(data.email, encryptionKey);
          let decryptedPassword = await decryptData(data.password, encryptionKey);
          
          // إذا فشل فك التشفير، نعرض رسالة خطأ
          if (!decryptedName) decryptedName = "❌ خطأ في فك التشفير";
          if (!decryptedEmail) decryptedEmail = "❌ خطأ في فك التشفير";
          if (!decryptedPassword) decryptedPassword = "❌ خطأ في فك التشفير";
          
          html += `
            <tr>
              <td>${escapeHtml(decryptedName)}</td>
              <td>
                <span class="email-field">${escapeHtml(decryptedEmail)}</span>
              </td>
              <td>
                <span class="password-field" style="font-family: monospace;">${'*'.repeat(decryptedPassword.length)}</span>
                <button class="btn-ghost small" onclick="togglePassword(this)">إظهار</button>
                <span class="actual-password hidden">${escapeHtml(decryptedPassword)}</span>
                <button class="btn-ghost small" onclick="copyPassword('${escapeHtml(decryptedPassword)}')">نسخ</button>
              </td>
              <td>
                <button class="btn-danger small" onclick="deleteSite('${doc.id}')">حذف</button>
              </td>
            </tr>
          `;
        }
        
        html += `
              </tbody>
            </table>
          </div>
        `;
        sitesList.innerHTML = html;
      } catch (error) {
        console.error("Error loading sites: ", error);
        sitesList.innerHTML = "<p>حدث خطأ أثناء تحميل البيانات</p>";
      }
    }

    window.togglePassword = function(button) {
      const row = button.closest('tr');
      const passwordField = row.querySelector('.password-field');
      const actualPassword = row.querySelector('.actual-password');
      
      if (passwordField.classList.contains('hidden')) {
        passwordField.classList.remove('hidden');
        actualPassword.classList.add('hidden');
        button.textContent = 'إظهار';
      } else {
        passwordField.classList.add('hidden');
        actualPassword.classList.remove('hidden');
        button.textContent = 'إخفاء';
      }
    }

    window.copyPassword = function(password) {
      navigator.clipboard.writeText(password).then(() => {
        showToast("تم نسخ كلمة المرور!");
      }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast("فشل نسخ كلمة المرور", true);
      });
    }

    window.deleteSite = async function(siteId) {
      if (!confirm("هل أنت متأكد من حذف هذا الموقع؟")) {
        return;
      }
      
      try {
        await deleteDoc(doc(db, "sites", siteId));
        await loadSites();
        showToast("تم حذف الموقع بنجاح!");
      } catch (error) {
        console.error("Error deleting site: ", error);
        showToast("حدث خطأ أثناء حذف الموقع", true);
      }
    }

    window.showToast = function(message, isError = false) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.style.backgroundColor = isError ? '#e53e3e' : '#38a169';
      toast.classList.remove('hidden');
      
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }

    // دالة مساعدة لمنع هجمات XSS
    function escapeHtml(unsafe) {
      if (unsafe === null || unsafe === undefined) return '';
      return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // السماح بالضغط على Enter في حقول الإدخال
    document.addEventListener('DOMContentLoaded', function() {
      // لحقل كلمة المرور في تسجيل الدخول
      document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          login();
        }
      });
      
      // لحقول الإدخال في إضافة موقع جديد
      document.getElementById('sitePassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          addSite();
        }
      });
    });
