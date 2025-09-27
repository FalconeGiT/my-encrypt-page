// إظهار/إخفاء كلمة السر
document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', function() {
    const targetId = this.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);
    const icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
});

// قياس قوة كلمة السر
document.getElementById('passEnc').addEventListener('input', function() {
  const password = this.value;
  const strengthBar = document.getElementById('passStrength');
  let strength = 0;
  
  if (password.length > 0) strength += 25;
  if (password.length >= 8) strength += 25;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^A-Za-z0-9]/.test(password)) strength += 10;
  
  strengthBar.style.width = strength + '%';
  
  if (strength < 50) {
    strengthBar.style.background = '#f44336';
  } else if (strength < 75) {
    strengthBar.style.background = '#ff9800';
  } else {
    strengthBar.style.background = '#4caf50';
  }
});

// إشعارات
function showNotification(message, type) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification ' + type;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 4000);
}

// التشفير
function encryptText(){
  const text = document.getElementById("plain").value;
  const pass = document.getElementById("passEnc").value;
  
  if(!text){
    showNotification("يرجى إدخال النص الذي تريد تشفيره", "error");
    return;
  }
  
  if(!pass){
    showNotification("يرجى إدخال كلمة السر", "error");
    return;
  }
  
  if(pass.length < 4){
    showNotification("كلمة السر يجب أن تكون 4 أحرف على الأقل", "warning");
    return;
  }
  
  try {
    const cipher = CryptoJS.AES.encrypt(text, pass).toString();
    document.getElementById("cipher").value = cipher;
    showNotification("تم تشفير النص بنجاح", "success");
  } catch (error) {
    showNotification("حدث خطأ أثناء التشفير", "error");
    console.error(error);
  }
}

// فك التشفير
function decryptText(){
  const cipher = document.getElementById("cipherInput").value;
  const pass = document.getElementById("passDec").value;
  
  if(!cipher){
    showNotification("يرجى إدخال النص المشفر", "error");
    return;
  }
  
  if(!pass){
    showNotification("يرجى إدخال كلمة السر", "error");
    return;
  }
  
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, pass);
    const plain = bytes.toString(CryptoJS.enc.Utf8);
    
    if(!plain){
      showNotification("كلمة السر خاطئة أو النص غير صالح", "error");
      return;
    }
    
    document.getElementById("plainOut").value = plain;
    showNotification("تم فك التشفير بنجاح", "success");
  } catch (error) {
    showNotification("حدث خطأ أثناء فك التشفير", "error");
    console.error(error);
  }
}

// نسخ النص المشفر عند النقر عليه
document.getElementById('cipher').addEventListener('click', function() {
  if (this.value) {
    this.select();
    document.execCommand('copy');
    showNotification("تم نسخ النص المشفر", "success");
  }
});
