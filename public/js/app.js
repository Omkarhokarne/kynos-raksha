/**
 * Kynos Raksha - Main Application Controller
 * Connects UI, State, RBAC, QR Scanner/Generator, Lost Tag Recovery,
 * Medical Logger, and GIS Analytics into an integrated experience.
 */

class KynosApplication {
  constructor() {
    this.currentTab = 'home';
    this.selectedDog = null;
    this.audioCtx = null;
  }

  init() {
    console.log("Initializing Kynos Raksha Engine...");

    // Setup Sound Effects
    this.initAudio();

    // Bind Navigation & UI Events
    this.bindEvents();

    // Render Initial State
    this.updateActiveUserUI();
    this.renderHomeStats();
    this.renderDogList();
    this.renderAdoptionList();
    this.renderReportsList();

    // Apply RBAC UI Rules
    window.KynosRBAC.applyUIConstraints();

    // 2-Second Motion Graphics Splash Screen Timer
    this.splashTimer = setTimeout(() => {
      this.hideSplashScreen();
    }, 2000);

    // Listen for state changes
    window.KynosState.subscribe((event, payload) => {
      if (event === 'role_changed') {
        this.updateActiveUserUI();
        window.KynosRBAC.applyUIConstraints();
        this.renderDogList();
        this.renderReportsList();
        this.showToast(`Switched to: ${payload.roleTitle}`, 'info');
      } else if (event === 'dogs_updated') {
        this.renderDogList();
        this.renderAdoptionList();
        this.renderHomeStats();
        if (this.selectedDog && payload.id === this.selectedDog.id) {
          this.openDogProfile(payload.id);
        }
      } else if (event === 'reports_updated') {
        this.renderReportsList();
        this.renderHomeStats();
      }
    });

    console.log("Kynos Raksha Ready.");
  }

  hideSplashScreen() {
    if (this.splashTimer) {
      clearTimeout(this.splashTimer);
      this.splashTimer = null;
    }
    const splash = document.getElementById('splash-screen');
    if (splash && !splash.classList.contains('splash-exit')) {
      splash.classList.add('splash-exit');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 500);
    }
  }

  // =========================================================================
  // GATEWAY & AUTHENTICATION CONTROLLER (CENTERED LOGIN/REGISTER & SCAN QR)
  // =========================================================================
  toggleGatewayAuth(showAuth) {
    const heroView = document.getElementById('gateway-hero-view');
    const authView = document.getElementById('gateway-auth-view');
    if (showAuth) {
      if (heroView) heroView.classList.add('d-none');
      if (authView) authView.classList.remove('d-none');
      setTimeout(() => {
        document.getElementById('login-email')?.focus();
      }, 100);
      this.playSound('click');
    } else {
      if (authView) authView.classList.add('d-none');
      if (heroView) heroView.classList.remove('d-none');
      this.playSound('click');
    }
  }

  handleGatewayManualLookup() {
    const input = document.getElementById('gateway-manual-tag-input');
    const val = input ? input.value.trim() : '';
    if (!val) {
      this.showToast("Please enter a Dog ID (e.g. KYN-DEL-2025-0012) or paste a QR link.", "warning");
      if (input) input.focus();
      return;
    }
    this.handleDecodedQR(val);
  }

  switchGatewayTab(tab) {
    const btnSignin = document.getElementById('btn-tab-signin');
    const btnRegister = document.getElementById('btn-tab-register');
    const panelSignin = document.getElementById('gateway-panel-signin');
    const panelRegister = document.getElementById('gateway-panel-register');
    const loginAlert = document.getElementById('login-error-alert');
    const regAlert = document.getElementById('register-error-alert');

    if (loginAlert) loginAlert.classList.add('d-none');
    if (regAlert) regAlert.classList.add('d-none');

    if (tab === 'signin') {
      btnSignin?.classList.add('active');
      btnRegister?.classList.remove('active');
      panelSignin?.classList.remove('d-none');
      panelRegister?.classList.add('d-none');
    } else {
      btnRegister?.classList.add('active');
      btnSignin?.classList.remove('active');
      panelRegister?.classList.remove('d-none');
      panelSignin?.classList.add('d-none');
    }
  }

  switchToRegisterWithEmail(email, userType) {
    this.switchGatewayTab('register');
    const regEmail = document.getElementById('reg-user-email');
    const regRole = document.getElementById('reg-user-role');
    const regName = document.getElementById('reg-user-name');
    if (regEmail && email) regEmail.value = email;
    if (regRole && userType) {
      regRole.value = userType;
      this.toggleRegExtraFields(userType);
    }
    if (regName) regName.focus();
  }

  showLoginError(message, email, userType) {
    const alertBox = document.getElementById('login-error-alert');
    if (!alertBox) return;
    const cleanEmail = (email || '').replace(/"/g, '&quot;');
    const cleanRole = (userType || '').replace(/"/g, '&quot;');
    alertBox.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 20px; line-height: 1;">🚫</span>
        <div style="flex: 1;">
          <strong style="color: #f87171; display: block; font-size: 13px; margin-bottom: 4px;">Authentication Refused: Unregistered or Invalid Account</strong>
          <div style="color: #fca5a5; margin-bottom: 9px; font-size: 12px; line-height: 1.4;">${message}</div>
          <div>
            <button type="button" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.6); color: #fff; font-size: 11.5px; padding: 5px 12px; font-weight: 600; cursor: pointer; border-radius: 4px;" onclick="window.KynosApp.switchToRegisterWithEmail('${cleanEmail}', '${cleanRole}')">
              ✍️ Click Here to Register "${cleanEmail || 'this email'}" First →
            </button>
          </div>
        </div>
      </div>
    `;
    alertBox.classList.remove('d-none');
  }

  toggleRegExtraFields(role) {
    const vetField = document.getElementById('reg-extra-vet');
    const ngoField = document.getElementById('reg-extra-ngo');
    if (vetField) vetField.classList.toggle('d-none', role !== 'vet');
    if (ngoField) ngoField.classList.toggle('d-none', role !== 'ngo');
  }

  onLoginUserTypeChanged(userType) {
    const emailInput = document.getElementById('login-email');
    const submitBtn = document.getElementById('btn-login-submit');
    const placeholders = {
      auto: 'Enter your registered email address',
      ngo: 'e.g. contact@pawstrust.org or ngo@kynos.org',
      vet: 'e.g. dr.sharma@clinic.in or vet@kynos.org',
      volunteer: 'e.g. pooja@gmail.com or volunteer@kynos.org',
      govt: 'e.g. officer@mcd.gov.in or govt@kynos.org',
      admin: 'admin@kynos.org',
      public: 'e.g. yourname@gmail.com or citizen@kynos.org'
    };
    const roleNames = {
      auto: 'Portal',
      ngo: 'Verified NGO',
      vet: 'Veterinary Surgeon',
      volunteer: 'Community Volunteer',
      govt: 'Municipal Officer',
      admin: 'Administrator',
      public: 'Public Citizen'
    };
    if (emailInput) {
      emailInput.placeholder = placeholders[userType] || 'Enter your registered email address';
    }
    if (submitBtn) {
      submitBtn.innerHTML = `🔐 Sign In as ${roleNames[userType] || 'User'} →`;
    }
  }

  continueAsGuest() {
    window.KynosState.setActiveRole('public');
    this.playSound('success');
    this.enterAppShell();
    this.showToast("Continuing as Public Guest (Scan & View Only)", "info");
  }

  switchSessionRole(roleKey) {
    // Arbitrary role switching in an active authenticated session is strictly prohibited for security
    this.playSound('warning');
    this.showToast("🔒 Security Notice: Role switching is restricted to maintain accountability. Please Sign Out to change accounts.", "warning");
    this.openUserProfileModal();
  }

  openUserProfileModal() {
    const user = window.KynosState.getActiveUser();
    const modal = document.getElementById('user-profile-modal');
    if (!modal) return;

    const avatar = document.getElementById('session-user-avatar');
    if (avatar) avatar.src = user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";

    const nameEl = document.getElementById('session-user-name');
    if (nameEl) nameEl.textContent = user.name || "Authenticated User";

    const emailEl = document.getElementById('session-user-email');
    if (emailEl) emailEl.textContent = user.email || "user@kynos.org";

    const roleBadge = document.getElementById('session-user-role-badge');
    if (roleBadge) {
      roleBadge.textContent = (user.roleTitle || user.userTypeTitle || user.role || 'USER').toUpperCase();
      roleBadge.className = `role-pill role-pill-${user.role || 'public'}`;
    }

    const orgBadge = document.getElementById('session-org-badge');
    if (orgBadge) {
      orgBadge.textContent = user.organization || "Independent Guardian";
    }

    const lastLoginEl = document.getElementById('profile-last-login-time');
    if (lastLoginEl) {
      lastLoginEl.textContent = `Session Locked: ${(user.role || 'public').toUpperCase()}`;
    }

    // Populate active role permissions
    const permsList = document.getElementById('profile-permissions-list');
    if (permsList && window.KynosRBAC) {
      const perms = window.KynosRBAC.ROLE_PERMISSIONS[user.role] || [];
      permsList.innerHTML = perms.map(p => `
        <span style="font-size: 11px; padding: 3px 8px; border-radius: 6px; background: rgba(6, 182, 212, 0.12); color: var(--primary); border: 1px solid rgba(6, 182, 212, 0.25); font-weight: 600;">
          ✓ ${p.replace(/_/g, ' ')}
        </span>
      `).join('');
    }

    modal.classList.remove('modal-hidden');
  }

  openOtpModal(challengeData) {
    this.currentOtpChallenge = challengeData;
    const modal = document.getElementById('otp-verification-modal');
    if (!modal) return;

    // Set shield emblem and title
    const shieldEl = document.getElementById('otp-shield-emblem');
    if (shieldEl) shieldEl.textContent = challengeData.shieldIcon || '✉️';

    const titleEl = document.getElementById('otp-modal-title');
    if (titleEl) titleEl.textContent = challengeData.securityBadge || 'Email Verification Required';

    const roleBadge = document.getElementById('otp-role-badge');
    if (roleBadge) {
      roleBadge.textContent = (challengeData.userTypeTitle || challengeData.userType || 'USER').toUpperCase();
      roleBadge.className = `role-pill role-pill-${challengeData.userType || 'public'}`;
    }

    const instrEl = document.getElementById('otp-instruction-text');
    if (instrEl) instrEl.textContent = "Enter the 6-digit verification PIN sent to your registered email address.";

    const destEl = document.getElementById('otp-destination-display');
    if (destEl) destEl.textContent = challengeData.email || 'your email';

    const secEl = document.getElementById('otp-security-level-display');
    if (secEl) secEl.textContent = "Real-Time Email Security 2FA";

    // Email notification banner text
    const bannerTitle = document.getElementById('otp-banner-title');
    const bannerText = document.getElementById('otp-banner-text');

    if (bannerTitle) {
      bannerTitle.textContent = challengeData.emailSent ? "Security PIN Dispatched to Your Gmail" : "Verification PIN Ready";
    }
    if (bannerText) {
      if (challengeData.emailSent) {
        bannerText.innerHTML = `A one-time 6-digit verification PIN has been sent to <strong>${challengeData.email}</strong>. Please check your Gmail inbox to enter the code.`;
      } else if (challengeData.devOtp || challengeData.otpCode) {
        const code = challengeData.devOtp || challengeData.otpCode;
        bannerText.innerHTML = `Verification PIN for <strong>${challengeData.email}</strong>: <span style="font-family:monospace; font-weight:800; font-size:16px; color:#f97316; letter-spacing:2px; background:rgba(249,115,22,0.15); padding:2px 8px; border-radius:6px;">${code}</span><br><span style="font-size:11px; color:var(--text-muted); display:inline-block; margin-top:4px;">To send directly to Gmail inbox: configure your 16-char Google App Password in <code>data/email-config.json</code>.</span>`;
      } else {
        bannerText.textContent = `A one-time 6-digit registration verification PIN has been dispatched to ${challengeData.email}. Please check your Gmail inbox.`;
      }
    }

    // Clear previous inputs
    for (let i = 1; i <= 6; i++) {
      const inp = document.getElementById(`otp-d${i}`);
      if (inp) inp.value = '';
    }

    const errBox = document.getElementById('otp-error-alert');
    if (errBox) errBox.classList.add('d-none');

    // Attach keyboard event handlers for auto-advance, backspace, and paste
    this.setupOtpInputsListeners();

    // Start 30s countdown timer
    this.startOtpTimer(30);

    modal.classList.remove('modal-hidden');

    // Focus first input
    setTimeout(() => {
      document.getElementById('otp-d1')?.focus();
    }, 120);
  }

  autoFillCurrentOtp() {
    // Disabled: Real OTP PIN is sent exclusively to the user's email address
  }

  setupOtpInputsListeners() {
    if (this._otpListenersSetup) return;
    this._otpListenersSetup = true;

    for (let i = 1; i <= 6; i++) {
      const inp = document.getElementById(`otp-d${i}`);
      if (!inp) continue;

      inp.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val ? val[0] : '';
        if (val && i < 6) {
          const next = document.getElementById(`otp-d${i + 1}`);
          if (next) next.focus();
        }
      });

      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 1) {
          const prev = document.getElementById(`otp-d${i - 1}`);
          if (prev) {
            prev.focus();
            prev.value = '';
          }
        } else if (e.key === 'Enter') {
          this.submitOtpVerification();
        }
      });

      inp.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
        if (text) {
          for (let j = 1; j <= 6; j++) {
            const digitEl = document.getElementById(`otp-d${j}`);
            if (digitEl && text[j - 1]) {
              digitEl.value = text[j - 1];
            }
          }
          const focusIndex = Math.min(6, text.length);
          document.getElementById(`otp-d${focusIndex}`)?.focus();
        }
      });
    }
  }

  startOtpTimer(seconds) {
    clearInterval(this.otpInterval);
    let remaining = seconds;
    const timerEl = document.getElementById('otp-timer');
    const resendBtn = document.getElementById('btn-resend-otp');
    if (resendBtn) resendBtn.disabled = true;

    this.otpInterval = setInterval(() => {
      remaining--;
      if (timerEl) timerEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(this.otpInterval);
        if (resendBtn) {
          resendBtn.disabled = false;
          resendBtn.innerHTML = '🔄 Resend Code';
        }
      }
    }, 1000);
  }

  async submitOtpVerification() {
    if (!this.currentOtpChallenge) return;

    let enteredCode = '';
    for (let i = 1; i <= 6; i++) {
      const inp = document.getElementById(`otp-d${i}`);
      enteredCode += (inp ? inp.value.trim() : '');
    }

    const errBox = document.getElementById('otp-error-alert');
    const submitBtn = document.getElementById('btn-verify-otp-submit');

    if (enteredCode.length < 6) {
      this.playSound('danger');
      if (errBox) {
        errBox.textContent = "Please enter all 6 digits of the verification PIN sent to your phone and email.";
        errBox.classList.remove('d-none');
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Verifying Security PIN...';
    }

    // 1. If challenge was dispatched via Firebase Phone SMS, try Firebase confirm
    if (this.currentOtpChallenge.isFirebasePhoneAuth && window.KynosFirebase && window.KynosFirebase.confirmationResult) {
      try {
        const fbUser = await window.KynosFirebase.verifyPhoneOtp(enteredCode);
        this.playSound('success');
        this.closeModal('otp-verification-modal');
        clearInterval(this.otpInterval);
        const verifiedUser = this.currentOtpChallenge.user || {
          id: fbUser.uid,
          name: this.currentOtpChallenge.name,
          email: this.currentOtpChallenge.email,
          phone: this.currentOtpChallenge.phone,
          userType: this.currentOtpChallenge.userType,
          role: this.currentOtpChallenge.userType,
          roleTitle: this.currentOtpChallenge.userTypeTitle,
          verified: true,
          otpVerified: true
        };
        verifiedUser.otpVerified = true;
        window.KynosState.setActiveUserRecord(verifiedUser);
        this.enterAppShell();
        this.showToast(`🛡️ Phone SMS Verified! Welcome, ${verifiedUser.name}.`, 'success');
        return;
      } catch (fbErr) {
        console.warn("Firebase Phone Auth verification notice:", fbErr);
        // Fall through to backend verification
      }
    }

    // 2. Verify with backend database API /api/verify-otp
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: this.currentOtpChallenge.tempToken,
          otp: enteredCode,
          email: this.currentOtpChallenge.email
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.user) {
        this.playSound('success');
        this.closeModal('otp-verification-modal');
        clearInterval(this.otpInterval);
        data.user.otpVerified = true;

        // Update local state storage
        const existingUsers = window.KynosState.getUsers();
        const uIdx = existingUsers.findIndex(u => u.email.toLowerCase() === (data.user.email || '').toLowerCase());
        if (uIdx >= 0) {
          existingUsers[uIdx].otpVerified = true;
        } else {
          existingUsers.push(data.user);
        }
        localStorage.setItem('kynos_users_v1', JSON.stringify(existingUsers));

        // Sync to cloud Firestore
        if (window.KynosFirebase) {
          window.KynosFirebase.syncUserToCloud(data.user).catch(() => {});
        }

        window.KynosState.setActiveUserRecord(data.user);
        this.enterAppShell();
        this.showToast(`🎉 Account Activated & Verified! Welcome, ${data.user.name}.`, 'success');
        return;
      } else {
        this.playSound('danger');
        if (errBox) {
          errBox.textContent = `❌ ${data.message || "Invalid OTP PIN. Please enter the correct 6-digit code."}`;
          errBox.classList.remove('d-none');
        }
        return;
      }
    } catch(err) {
      console.warn("Backend error during verify-otp, checking fallback verification:", err);
      // Fallback verification if code matches
      if (enteredCode === String(this.currentOtpChallenge.otpCode)) {
        this.playSound('success');
        this.closeModal('otp-verification-modal');
        clearInterval(this.otpInterval);
        const fallbackUser = this.currentOtpChallenge.user || {
          name: this.currentOtpChallenge.name,
          email: this.currentOtpChallenge.email,
          userType: this.currentOtpChallenge.userType,
          role: this.currentOtpChallenge.userType,
          roleTitle: this.currentOtpChallenge.userTypeTitle
        };
        fallbackUser.otpVerified = true;

        const existingUsers = window.KynosState.getUsers();
        const uIdx = existingUsers.findIndex(u => u.email.toLowerCase() === (fallbackUser.email || '').toLowerCase());
        if (uIdx >= 0) {
          existingUsers[uIdx].otpVerified = true;
        } else {
          existingUsers.push(fallbackUser);
        }
        localStorage.setItem('kynos_users_v1', JSON.stringify(existingUsers));

        window.KynosState.setActiveUserRecord(fallbackUser);
        this.enterAppShell();
        this.showToast(`🛡️ Identity & OTP Verified! Welcome, ${fallbackUser.name}.`, 'success');
      } else {
        if (errBox) {
          errBox.textContent = "❌ Invalid OTP code. Please enter the valid 6-digit PIN.";
          errBox.classList.remove('d-none');
        }
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '🔐 Verify & Enter Secure Dashboard →';
      }
    }
  }

  async resendOtpCode() {
    if (!this.currentOtpChallenge) return;

    const resendBtn = document.getElementById('btn-resend-otp');
    if (resendBtn) {
      resendBtn.disabled = true;
      resendBtn.innerHTML = '⏳ Resending PIN...';
    }

    try {
      if (this.currentOtpChallenge.tempToken) {
        const res = await fetch('/api/resend-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempToken: this.currentOtpChallenge.tempToken })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          this.startOtpTimer(30);
          this.playSound('success');
          this.showToast(`✉️ Fresh verification PIN sent to ${this.currentOtpChallenge.email}! Check your inbox.`, "success");
          return;
        }
      }

      this.startOtpTimer(30);
      this.playSound('success');
      this.showToast(`✉️ Verification PIN re-sent to ${this.currentOtpChallenge.email}. Check your email.`, "success");

    } catch (e) {
      console.warn("Error resending OTP:", e);
      this.showToast("Could not resend OTP. Please try again in a moment.", "danger");
    } finally {
      if (resendBtn && !resendBtn.disabled) {
        resendBtn.innerHTML = '🔄 Resend Code';
      }
    }
  }

  cancelOtpVerification() {
    this.closeModal('otp-verification-modal');
    this.currentOtpChallenge = null;
    clearInterval(this.otpInterval);
  }

  async handleGatewayLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('login-email')?.value.trim().toLowerCase();
    const password = document.getElementById('login-password')?.value.trim();
    const userType = document.getElementById('login-usertype')?.value || 'auto';
    const alertBox = document.getElementById('login-error-alert');
    const submitBtn = document.getElementById('btn-login-submit');
    if (alertBox) alertBox.classList.add('d-none');

    if (!email || !password) {
      this.playSound('danger');
      this.showToast("Please enter both your registered email and password", "warning");
      this.showLoginError("Both your registered email and password are required to log in.", email, userType);
      return;
    }

    const origBtnHtml = submitBtn ? submitBtn.innerHTML : '🔐 Authenticate & Enter Dashboard →';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Verifying Credentials...';
    }

    try {
      // Call backend database API
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, userType })
      });

      const data = await res.json().catch(() => ({ success: false, message: "Invalid server response" }));

      if (res.ok && data.success && data.otpRequired) {
        this.playSound('success');
        this.openOtpModal(data);
        return;
      } else if (res.ok && data.success && data.user) {
        window.KynosState.setActiveUserRecord(data.user);
        this.playSound('success');
        this.enterAppShell();
        this.showToast(`Welcome back, ${data.user.name}!`, 'success');
        return;
      } else {
        // Backend rejected: unregistered user (404), incorrect password (401)
        this.playSound('danger');
        const errMsg = data.message || "Authentication failed. Only registered users may log in.";
        this.showToast(errMsg, "danger");
        this.showLoginError(errMsg, email, userType);
        return;
      }
    } catch(err) {
      console.warn("Backend API not reachable, checking local database fallback:", err);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
    }

    // Local database fallback (ONLY if backend server is entirely unreachable)
    const users = window.KynosState.getUsers();
    let matched = users.find(u => u.email && u.email.toLowerCase() === email);
    if (!matched) {
      this.playSound('danger');
      const msg = `Account not registered: No profile found for "${email}". Please create an account in the New Registration tab first.`;
      this.showToast(msg, "danger");
      this.showLoginError(msg, email, userType);
      return;
    }

    // Check password
    if (matched.password && matched.password !== password) {
      this.playSound('danger');
      const msg = `Incorrect password for "${email}". Please enter the password you registered with.`;
      this.showToast(msg, "danger");
      this.showLoginError(msg, email, userType);
      return;
    }

    // If user account is already verified, sign in directly without repeated OTP!
    if (matched.otpVerified) {
      window.KynosState.setActiveUserRecord(matched);
      this.playSound('success');
      this.enterAppShell();
      this.showToast(`Welcome back, ${matched.name}!`, 'success');
      return;
    }

    // Trigger one-time registration verification OTP challenge
    const localOtp = Math.floor(100000 + Math.random() * 900000).toString();
    this.openOtpModal({
      success: true,
      otpRequired: true,
      tempToken: 'local-session-' + Date.now(),
      userType: matched.userType || matched.role || 'public',
      userTypeTitle: matched.userTypeTitle || matched.roleTitle || 'Public User',
      name: matched.name,
      email: matched.email,
      phone: matched.phone || '+91 98*** **321',
      securityLevel: 'Local Safety OTP Verification',
      securityBadge: '🛡️ SAFETY 2FA VERIFICATION',
      shieldIcon: '🛡️',
      instruction: 'Enter the 6-digit safety verification code below.',
      otpCode: localOtp,
      user: matched
    });
  }

async handleGatewayRegister(e) {
    if (e) e.preventDefault();

    const name =
        document.getElementById('reg-user-name')?.value.trim();

    const role =
        document.getElementById('reg-user-role')?.value || 'public';

    const email =
        document.getElementById('reg-user-email')?.value
            .trim()
            .toLowerCase();

    const password =
        document.getElementById('reg-user-password')?.value.trim();

    const phone =
        document.getElementById('reg-user-phone')?.value.trim();

    const vetId =
        document.getElementById('reg-user-vetid')?.value.trim();

    const ngoId =
        document.getElementById('reg-user-ngoid')?.value.trim();

    const regAlert =
        document.getElementById('register-error-alert');

    if (regAlert) {
        regAlert.classList.add('d-none');
    }

    if (!name || !email || !password) {

        this.showToast(
            "Please provide your name, email, and password.",
            "warning"
        );

        if (regAlert) {
            regAlert.innerHTML =
                "⚠️ Full Name, Email, and Password are required.";

            regAlert.classList.remove('d-none');
        }

        return;
    }

    if (password.length < 6) {

        this.showToast(
            "Password must contain at least 6 characters.",
            "warning"
        );

        if (regAlert) {
            regAlert.innerHTML =
                "⚠️ Password must contain at least 6 characters.";

            regAlert.classList.remove('d-none');
        }

        return;
    }

    const roleTitles = {
        vet: 'Verified Veterinary Surgeon',
        ngo: 'Verified Animal Welfare NGO',
        govt: 'Municipal Animal Welfare Officer',
        volunteer: 'Community Feeder & Volunteer',
        public: 'Public User / Dog Guardian'
    };

    if (!phone) {
      this.playSound('danger');
      const msg = "Mobile Phone Number is required to receive your SMS verification OTP.";
      this.showToast(msg, "warning");
      if (regAlert) {
        regAlert.innerHTML = `⚠️ ${msg}`;
        regAlert.classList.remove('d-none');
      }
      return;
    }

    const submitBtn = document.querySelector('#gateway-register-form button[type="submit"]');
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : 'Create Account';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '📲 Dispatching Security OTP...';
    }

    const formattedPhone = window.KynosFirebase 
      ? window.KynosFirebase.formatPhoneToE164(phone) 
      : phone;

    const newUser = {
      id: "USR-" + Date.now(),
      name: name,
      email: email,
      password: password,
      userType: role,
      role: role,
      userTypeTitle: roleTitles[role] || 'Community Member',
      roleTitle: roleTitles[role] || 'Community Member',
      organization: ngoId || vetId || (role === 'ngo' ? 'Animal Welfare Shelter' : role === 'vet' ? 'Veterinary Clinic' : 'Community Member'),
      phone: formattedPhone,
      licenseNo: vetId || ngoId,
      verified: true,
      otpVerified: false,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Call backend REST API to register user and generate secure 6-digit OTP challenge
      let challengeData = null;
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            email: email,
            password: password,
            userType: role,
            organization: newUser.organization,
            licenseNo: newUser.licenseNo,
            phone: formattedPhone
          })
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.otpRequired) {
          challengeData = data;
          challengeData.user = newUser;
        } else if (!res.ok && data.message) {
          if (res.status === 409) {
            this.playSound('danger');
            this.showToast(data.message, "danger");
            if (regAlert) {
              regAlert.innerHTML = `⚠️ <strong>Account Notice:</strong> ${data.message}`;
              regAlert.classList.remove('d-none');
            }
            return;
          }
        }
      } catch (netErr) {
        console.warn("Backend API not reachable during register, proceeding with local challenge:", netErr);
      }

      // If backend API was not reachable, generate a resilient local OTP challenge
      if (!challengeData) {
        const localOtp = Math.floor(100000 + Math.random() * 900000).toString();
        challengeData = {
          success: true,
          otpRequired: true,
          tempToken: 'local-reg-' + Date.now(),
          otpCode: localOtp,
          userType: role,
          userTypeTitle: roleTitles[role] || 'Community Member',
          name: name,
          email: email,
          phone: formattedPhone,
          securityLevel: 'Multi-Channel Security Authentication',
          securityBadge: '📲 PHONE & EMAIL VERIFICATION',
          shieldIcon: '📲',
          instruction: `Enter the 6-digit registration verification PIN dispatched to ${formattedPhone} and ${email}.`,
          user: newUser
        };
      }

      // 2. Save user to local state storage (pending OTP verification)
      const existingUsers = window.KynosState.getUsers();
      const existingIdx = existingUsers.findIndex(u => u.email && u.email.toLowerCase() === email);
      if (existingIdx >= 0) {
        existingUsers[existingIdx] = { ...existingUsers[existingIdx], ...newUser, otpVerified: false };
      } else {
        existingUsers.push(newUser);
      }
      localStorage.setItem('kynos_users_v1', JSON.stringify(existingUsers));

      // 3. Sync profile to Cloud Firestore database
      if (window.KynosFirebase && window.KynosFirebase.isInitialized) {
        window.KynosFirebase.syncUserToCloud(newUser).catch(err => {
          console.warn("Cloud Firestore user sync note:", err);
        });

        // Register in Firebase Auth (without sending external verification link)
        if (window.KynosFirebase.auth) {
          window.KynosFirebase.auth.createUserWithEmailAndPassword(email, password)
            .then(cred => {
              console.log("Firebase Auth user created:", cred.user ? cred.user.uid : "");
            })
            .catch(authErr => {
              console.log("Firebase Auth notice:", authErr.code || authErr.message);
            });
        }

        // Attempt direct carrier SMS via Firebase Phone Auth if enabled
        window.KynosFirebase.sendPhoneOtp(formattedPhone).then(phoneRes => {
          if (phoneRes && phoneRes.success) {
            console.log("📲 Direct carrier SMS dispatched via Firebase Phone Auth!");
            challengeData.isFirebasePhoneAuth = true;
          }
        }).catch(() => {});
      }

      this.playSound('success');
      this.showToast(`✉️ Verification PIN sent to ${email}! Please check your email inbox (and spam).`, "success");

      // 4. Open OTP verification modal waiting for 6-digit PIN authentication
      this.openOtpModal(challengeData);

    } catch (err) {
      this.playSound('danger');
      console.error("Registration error:", err);
      const errorMsg = err.message || "Could not complete registration. Please check your details and try again.";
      this.showToast(errorMsg, "danger");
      if (regAlert) {
        regAlert.innerHTML = `⚠️ <strong>Registration Notice:</strong> ${errorMsg}`;
        regAlert.classList.remove('d-none');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
    }
  }

  quickScanFromGateway(dogId) {
    this.enterAppShell();
    this.playSound('success');
    this.openDogProfile(dogId);
    this.showToast(`Identified Dog: ${dogId}`, 'success');
  }

  enterAppShell() {
    this.hideSplashScreen();
    const gateway = document.getElementById('gateway-screen');
    const shell = document.getElementById('main-app-shell');
    if (gateway) {
      gateway.classList.add('gateway-hidden');
      gateway.style.display = 'none';
    }
    if (shell) {
      shell.classList.remove('d-none');
      shell.style.display = 'block';
    }
    this.updateActiveUserUI();
    window.KynosRBAC.applyUIConstraints();
    this.switchTab('home');
    this.renderHomeStats();
    this.renderDogList();
    this.renderReportsList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  exitToGateway() {
    const gateway = document.getElementById('gateway-screen');
    const shell = document.getElementById('main-app-shell');
    if (shell) {
      shell.classList.add('d-none');
      shell.style.display = 'none';
    }
    if (gateway) {
      gateway.classList.remove('gateway-hidden');
      gateway.style.display = 'flex';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.showToast("Signed out. Returned to entry gateway.", "info");
  }

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch(e) {}
  }

  playSound(type = 'beep') {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, this.audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
      } else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, this.audioCtx.currentTime);
        osc.frequency.setValueAtTime(240, this.audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(659.25, this.audioCtx.currentTime); // E5
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.15);
      }
    } catch(e) {}
  }

  bindEvents() {
    // Navigation Tabs
    const navButtons = document.querySelectorAll('[data-nav-tab]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-nav-tab');
        this.switchTab(tab);
      });
    });

    // Mobile shell toggle
    const viewToggleBtn = document.getElementById('btn-toggle-device-view');
    if (viewToggleBtn) {
      viewToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('mobile-frame-mode');
        const isMobile = document.body.classList.contains('mobile-frame-mode');
        viewToggleBtn.innerHTML = isMobile ? '📱 Mobile Frame Active (Switch to Desktop)' : '🖥️ Desktop View (Switch to Mobile Frame)';
      });
    }

    // OTP 6-Digit Keyboard Auto-Advance & Navigation
    for (let i = 1; i <= 6; i++) {
      const inp = document.getElementById(`otp-d${i}`);
      if (inp) {
        inp.addEventListener('input', (e) => {
          if (e.target.value.length >= 1 && i < 6) {
            document.getElementById(`otp-d${i + 1}`)?.focus();
          }
        });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !e.target.value && i > 1) {
            document.getElementById(`otp-d${i - 1}`)?.focus();
          } else if (e.key === 'Enter') {
            this.submitOtpVerification();
          }
        });
        inp.addEventListener('paste', (e) => {
          e.preventDefault();
          const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
          if (pasteData) {
            for (let j = 0; j < Math.min(pasteData.length, 6); j++) {
              const box = document.getElementById(`otp-d${j + 1}`);
              if (box) box.value = pasteData[j];
            }
            document.getElementById('otp-d6')?.focus();
          }
        });
      }
    }

    // Lost Tag Recovery Search Form
    const lostTagForm = document.getElementById('lost-tag-search-form');
    if (lostTagForm) {
      lostTagForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLostTagSearch();
      });
    }

    // Dog Register Form
    const registerDogForm = document.getElementById('register-dog-form');
    if (registerDogForm) {
      registerDogForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleDogRegistration();
      });

      // Live duplicate checker as user types in registration form
      const wardInput = document.getElementById('reg-dog-ward');
      const colorInput = document.getElementById('reg-dog-color');
      const genderInput = document.getElementById('reg-dog-gender');
      const earNotchInput = document.getElementById('reg-dog-earnotch');

      [wardInput, colorInput, genderInput, earNotchInput].forEach(inp => {
        if (inp) {
          inp.addEventListener('change', () => this.checkDuplicateOnRegistration());
        }
      });

      // Dog Photo File Upload / Preview
      const photoFileInput = document.getElementById('reg-dog-photo-file');
      const photoUrlInput = document.getElementById('reg-dog-photo');
      const previewWrap = document.getElementById('reg-photo-preview-wrap');
      const previewImg = document.getElementById('reg-photo-preview-img');

      if (photoFileInput) {
        photoFileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target.result;
              if (photoUrlInput) photoUrlInput.value = dataUrl;
              if (previewImg) previewImg.src = dataUrl;
              if (previewWrap) previewWrap.style.display = 'flex';
            };
            reader.readAsDataURL(file);
          }
        });
      }

      if (photoUrlInput) {
        photoUrlInput.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          if (val) {
            if (previewImg) {
              previewImg.src = val;
              previewImg.onerror = () => {
                if (previewWrap) previewWrap.style.display = 'none';
              };
            }
            if (previewWrap) previewWrap.style.display = 'flex';
          } else {
            if (previewWrap) previewWrap.style.display = 'none';
          }
        });
      }
    }

    // Citizen Emergency SOS Form
    const sosForm = document.getElementById('citizen-sos-form');
    if (sosForm) {
      sosForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSosSubmit();
      });
    }

    // GPS grabber button
    const gpsBtn = document.getElementById('btn-grab-gps');
    if (gpsBtn) {
      gpsBtn.addEventListener('click', async () => {
        gpsBtn.textContent = "Detecting GPS...";
        try {
          const loc = await window.KynosEmergency.getCurrentLocation();
          document.getElementById('sos-lat').value = loc.lat.toFixed(5);
          document.getElementById('sos-lng').value = loc.lng.toFixed(5);
          gpsBtn.textContent = `📍 GPS Acquired (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`;
          this.showToast("GPS coordinates automatically detected!", "success");
        } catch(e) {
          gpsBtn.textContent = "📍 Fallback Location Set";
        }
      });
    }
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update Nav bar highlights
    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      if (btn.getAttribute('data-nav-tab') === tabName) {
        btn.classList.add('nav-link-active');
      } else {
        btn.classList.remove('nav-link-active');
      }
    });

    // Update Mobile Dock highlights
    document.querySelectorAll('[data-dock-tab]').forEach(btn => {
      if (btn.getAttribute('data-dock-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Phone Mode Switcher Bar pills
    document.querySelectorAll('[data-mode-tab]').forEach(btn => {
      if (btn.getAttribute('data-mode-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Switch panels
    document.querySelectorAll('.app-tab-panel').forEach(panel => {
      panel.classList.add('panel-hidden');
    });

    const target = document.getElementById(`tab-${tabName}`);
    if (target) {
      target.classList.remove('panel-hidden');
    }

    // Special Tab Inits
    if (tabName === 'gis-map') {
      setTimeout(() => {
        window.KynosMapAnalytics.initMap();
      }, 150);
    } else if (tabName === 'analytics') {
      setTimeout(() => {
        window.KynosMapAnalytics.renderAnalytics();
      }, 150);
    } else if (tabName === 'admin') {
      this.renderAuditLogTable();
    }
  }

  updateActiveUserUI() {
    const user = window.KynosState.getActiveUser();
    const rolePill = document.getElementById('current-role-badge');
    if (rolePill) {
      rolePill.textContent = user.roleTitle || user.role.toUpperCase();
      rolePill.className = `role-pill role-pill-${user.role}`;
    }

    const userNameEl = document.getElementById('header-user-name');
    if (userNameEl) userNameEl.textContent = user.name;

    const userOrgEl = document.getElementById('header-user-org');
    if (userOrgEl) userOrgEl.textContent = user.organization || user.roleTitle;

    const userAvatarEl = document.getElementById('header-user-avatar');
    if (userAvatarEl && user.avatar) userAvatarEl.src = user.avatar;

    // Session Modal Elements
    const sessionName = document.getElementById('session-user-name');
    if (sessionName) sessionName.textContent = user.name;
    const sessionEmail = document.getElementById('session-user-email');
    if (sessionEmail) sessionEmail.textContent = user.email || 'user@kynos.org';
    const sessionRoleBadge = document.getElementById('session-user-role-badge');
    if (sessionRoleBadge) {
      sessionRoleBadge.textContent = user.roleTitle || user.role.toUpperCase();
      sessionRoleBadge.className = `role-pill role-pill-${user.role}`;
    }
    const sessionAvatar = document.getElementById('session-user-avatar');
    if (sessionAvatar && user.avatar) sessionAvatar.src = user.avatar;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `kynos-toast toast-${type} animate-slide-up`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '⚠️';
    if (type === 'warning') icon = '🔔';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  renderHomeStats() {
    const dogs = window.KynosState.getDogs();
    const reports = window.KynosState.getReports();

    const total = dogs.length;
    const sterilized = dogs.filter(d => d.sterilization?.status === 'Sterilized').length;
    const rabies = dogs.filter(d => d.vaccination?.rabiesStatus === 'Active').length;
    const activeRescues = reports.filter(r => r.status === 'Reported' || r.status === 'Dispatched' || r.status === 'In Treatment').length;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('stat-hero-dogs', total);
    setEl('stat-hero-sterilized', `${total ? Math.round((sterilized/total)*100) : 0}%`);
    setEl('stat-hero-rabies', `${total ? Math.round((rabies/total)*100) : 0}%`);
    setEl('stat-hero-rescues', activeRescues);
  }

  renderDogList(filterQuery = '') {
    const container = document.getElementById('dogs-grid-container');
    if (!container) return;

    let dogs = window.KynosState.getDogs();
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      dogs = dogs.filter(d => 
        d.name.toLowerCase().includes(q) || 
        d.id.toLowerCase().includes(q) || 
        d.ward.toLowerCase().includes(q) || 
        d.coatColor.toLowerCase().includes(q)
      );
    }

    if (dogs.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">🐕</div>
          <h3>No Dog Profiles Found</h3>
          <p>No matching registered dogs match your search criteria.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = dogs.map(dog => {
      const isSterilized = dog.sterilization?.status === 'Sterilized';
      const rabiesValid = dog.vaccination?.rabiesStatus === 'Active';
      const isLost = dog.tagStatus === 'Reported Lost';

      return `
        <div class="dog-card ${isLost ? 'card-lost-tag' : ''}">
          <div class="card-img-wrap">
            <img src="${dog.photo}" alt="${dog.name}" class="dog-card-img" loading="lazy" onerror="this.onerror=null; this.src=window.KynosState.getDefaultDogPhoto({ coatColor: '${(dog.coatColor || '').replace(/'/g, "\\'")}', name: '${(dog.name || '').replace(/'/g, "\\'")}' });">
            <span class="dog-id-badge">${dog.id}</span>
            ${isLost ? '<span class="dog-lost-tag-pill">⚠️ QR TAG LOST</span>' : ''}
          </div>
          <div class="dog-card-body">
            <div class="card-header-row">
              <h3 class="dog-card-name">${dog.name}</h3>
              <span class="dog-gender-badge ${dog.gender === 'Female' ? 'badge-female' : 'badge-male'}">
                ${dog.gender === 'Female' ? '♀ Female' : '♂ Male'}
              </span>
            </div>

            <p class="dog-breed-age">${dog.breed} • ${dog.approxAge}</p>
            <p class="dog-coat-color">🎨 ${dog.coatColor}</p>
            <p class="dog-territory">📍 ${dog.territory || dog.ward}</p>

            <div class="status-pill-group">
              <span class="status-badge ${isSterilized ? 'status-green' : 'status-yellow'}">
                ${isSterilized ? '✓ ABC Sterilized' : '⏳ Pending ABC'}
              </span>
              <span class="status-badge ${rabiesValid ? 'status-green' : 'status-amber'}">
                ${rabiesValid ? '✓ Anti-Rabies Active' : '⚠️ ARV Due Soon'}
              </span>
            </div>

            <div class="card-action-bar">
              <button class="btn-card-primary" onclick="window.KynosApp.openDogProfile('${dog.id}')">
                Digital Profile & Dossier →
              </button>
              <button class="btn-card-icon" title="View & Print QR Collar Tag" onclick="window.KynosApp.openPrintableTagModal('${dog.id}')">
                🏷️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Open full digital dossier for a specific dog
   */
  openDogProfile(dogId) {
    const dog = window.KynosState.getDogById(dogId);
    if (!dog) {
      this.showToast("Dog record not found", "danger");
      return;
    }

    this.selectedDog = dog;
    this.playSound('beep');

    const modal = document.getElementById('dog-profile-modal');
    if (!modal) return;

    // Populate Fields
    document.getElementById('modal-dog-name').textContent = dog.name;
    document.getElementById('modal-dog-id').textContent = dog.id;
    const modalPhoto = document.getElementById('modal-dog-photo');
    if (modalPhoto) {
      modalPhoto.src = dog.photo;
      modalPhoto.onerror = function() {
        this.onerror = null;
        this.src = window.KynosState.getDefaultDogPhoto(dog);
      };
    }
    document.getElementById('modal-dog-breed').textContent = dog.breed;
    document.getElementById('modal-dog-gender').textContent = `${dog.gender} (${dog.approxAge}, ${dog.weight || '18 kg'})`;
    document.getElementById('modal-dog-color').textContent = dog.coatColor;
    document.getElementById('modal-dog-markings').textContent = dog.distinctMarkings || "None reported";
    document.getElementById('modal-dog-notch').textContent = dog.earNotch || "None (Intact)";
    document.getElementById('modal-dog-territory').textContent = `${dog.territory}, ${dog.ward}, ${dog.city}`;
    document.getElementById('modal-dog-feeder').textContent = `${dog.caregiver?.name || 'Community Feeder'} (${dog.caregiver?.contact || 'N/A'})`;
    document.getElementById('modal-dog-temperament').textContent = dog.caregiver?.temperament || dog.behavior?.temperament || "Docile community resident";
    document.getElementById('modal-dog-registered').textContent = `${dog.registeredBy} on ${dog.registrationDate}`;

    // Tag status alert if lost
    const lostAlert = document.getElementById('modal-lost-tag-alert');
    if (lostAlert) {
      if (dog.tagStatus === 'Reported Lost') {
        lostAlert.classList.remove('d-none');
      } else {
        lostAlert.classList.add('d-none');
      }
    }

    // Sterilization Section
    const sterilEl = document.getElementById('modal-steril-info');
    if (sterilEl) {
      if (dog.sterilization && dog.sterilization.status === 'Sterilized') {
        sterilEl.innerHTML = `
          <div class="verified-box success-box">
            <div class="verified-icon">✓</div>
            <div class="verified-content">
              <strong>OFFICIALLY STERILIZED (ABC VERIFIED)</strong>
              <p>Surgery Date: ${dog.sterilization.date} | Facility: ${dog.sterilization.facility}</p>
              <p>Surgeon: ${dog.sterilization.surgeon} | Marker: ${dog.sterilization.earNotchLocation}</p>
              <p class="steril-warning-note">⚠️ <em>Do NOT re-capture for sterilization. Ear-notch verified on record.</em></p>
            </div>
          </div>
        `;
      } else {
        sterilEl.innerHTML = `
          <div class="verified-box warning-box">
            <div class="verified-icon">⏳</div>
            <div class="verified-content">
              <strong>PENDING STERILIZATION (INTACT)</strong>
              <p>Eligible for Animal Birth Control (ABC) drive.</p>
              <button class="btn btn-sm btn-outline-success mt-2" data-role-guard="vet,admin" onclick="window.KynosApp.showSterilizeModal('${dog.id}')">
                + Log ABC Sterilization & Ear Notch
              </button>
            </div>
          </div>
        `;
      }
    }

    // Vaccination Section
    const vaxEl = document.getElementById('modal-vax-history');
    if (vaxEl && dog.vaccination) {
      const rabiesCalc = window.KynosMedical.calculateVaccineStatus(dog.vaccination.nextRabiesDueDate);
      vaxEl.innerHTML = `
        <div class="vax-summary-card">
          <div class="vax-metric">
            <span class="vax-title">Anti-Rabies (ARV) Status</span>
            <span class="badge ${rabiesCalc.class}">${rabiesCalc.label}</span>
          </div>
          <div class="vax-details">
            Last Given: <strong>${dog.vaccination.lastRabiesDate || 'N/A'}</strong> | Next Due: <strong>${dog.vaccination.nextRabiesDueDate || 'N/A'}</strong>
          </div>
          <div class="vax-batch">Batch Number: <code>${dog.vaccination.rabiesBatch || 'RAV-BATCH-VERIFIED'}</code></div>
        </div>
        <div class="vax-history-list mt-3">
          <h5>Historical Vaccination Log</h5>
          ${(dog.vaccination.history || []).map(h => `
            <div class="vax-history-row">
              <span class="vax-badge-pill">${h.vaccine}</span>
              <span class="vax-hist-date">${h.date}</span>
              <span class="vax-hist-by">${h.administeredBy}</span>
              <span class="vax-hist-batch">Batch: ${h.batchNo}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Medical Dossier Timeline
    const medHistoryEl = document.getElementById('modal-med-timeline');
    if (medHistoryEl) {
      if (!dog.medicalHistory || dog.medicalHistory.length === 0) {
        medHistoryEl.innerHTML = `<p class="text-muted">No past clinical incidents recorded. Dog in good general health.</p>`;
      } else {
        medHistoryEl.innerHTML = dog.medicalHistory.map(m => `
          <div class="timeline-entry">
            <div class="timeline-dot"></div>
            <div class="timeline-card">
              <div class="timeline-header">
                <strong>${m.date} • ${m.vetName} (${m.vetReg})</strong>
                <span class="badge badge-outline">${m.healthStatus}</span>
              </div>
              <p class="timeline-diagnosis"><strong>Diagnosis:</strong> ${m.diagnosis}</p>
              <p class="timeline-treatment"><strong>Treatment:</strong> ${m.treatment}</p>
              <p class="timeline-medicines"><strong>Prescription:</strong> ${m.medicines}</p>
              ${m.notes ? `<p class="timeline-notes"><em>Notes:</em> ${m.notes}</p>` : ''}
              ${m.followUpDate && m.followUpDate !== 'None' ? `<p class="timeline-followup">📅 Follow-up: ${m.followUpDate}</p>` : ''}
            </div>
          </div>
        `).join('');
      }
    }

    // Generate Profile QR Code
    const qrContainer = document.getElementById('modal-qr-preview-box');
    if (qrContainer) {
      window.KynosQR.generateQR(qrContainer, `https://kynos.org/dog/${dog.id}`, { width: 150, height: 150 });
    }

    // Re-apply UI security guards inside modal
    window.KynosRBAC.applyUIConstraints();

    modal.classList.remove('modal-hidden');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('modal-hidden');
    }
    // Stop camera if scanner modal was closed
    if (modalId === 'qr-scanner-modal') {
      window.KynosQR.stopCamera();
    }
  }

  /**
   * High-Resilience Scanner Actions
   */
  async openScannerModal(selectedCameraId = null) {
    const modal = document.getElementById('qr-scanner-modal');
    if (!modal) return;
    modal.classList.remove('modal-hidden');

    const statusText = document.getElementById('scanner-status-text');
    const resultBox = document.getElementById('scanner-result-message');
    const cameraSelect = document.getElementById('scanner-camera-select');
    const tagInput = document.getElementById('manual-scan-tag-input');

    if (tagInput) tagInput.value = '';
    if (statusText) statusText.textContent = "Starting camera...";
    if (resultBox) {
      resultBox.innerHTML = `Align dog's collar QR tag inside the frame. The camera decodes automatically.`;
      resultBox.style.color = "var(--text-secondary)";
    }

    // Start Live Camera with Multi-Tier Fallback
    try {
      await window.KynosQR.startCamera(
        'camera-stream-viewport',
        (decodedText) => {
          this.playSound('success');
          this.handleDecodedQR(decodedText);
        },
        (error) => {
          console.warn("Scanner camera warning:", error);
          if (statusText) statusText.textContent = "Camera in Standby";
          if (resultBox) {
            resultBox.innerHTML = `
              <span style="color: #fbbf24;">⚠️ Live camera standby (no camera access or permission needed).</span><br>
              <span style="font-size: 11.5px; color: var(--text-muted);">You can upload a photo of the QR code, enter the Tag ID, or test sample profiles below.</span>
            `;
          }
        },
        selectedCameraId
      );

      // Camera started successfully
      if (window.KynosQR.isScanning) {
        if (statusText) statusText.textContent = "🟢 Live Camera Active";
      }

      // Populate camera switcher if multiple cameras detected
      if (cameraSelect && window.KynosQR.availableCameras && window.KynosQR.availableCameras.length > 1) {
        cameraSelect.innerHTML = window.KynosQR.availableCameras.map(cam => `
          <option value="${cam.id}" ${cam.id === window.KynosQR.currentCameraId ? 'selected' : ''}>
            📷 ${cam.label || `Camera ${cam.id.substr(0, 5)}`}
          </option>
        `).join('');
        cameraSelect.style.display = "inline-block";
      } else if (cameraSelect) {
        cameraSelect.style.display = "none";
      }

    } catch (err) {
      console.error("openScannerModal error:", err);
      if (statusText) statusText.textContent = "Camera in Standby";
    }
  }

  restartScannerCamera() {
    this.openScannerModal();
  }

  switchScannerCamera(cameraId) {
    if (cameraId) {
      this.openScannerModal(cameraId);
    }
  }

  async handleScannerFileUpload(file) {
    if (!file) return;
    const statusText = document.getElementById('scanner-status-text');
    const resultBox = document.getElementById('scanner-result-message');
    if (statusText) statusText.textContent = "Analyzing Image...";
    if (resultBox) resultBox.textContent = `Scanning "${file.name}" for QR code...`;

    try {
      const decodedText = await window.KynosQR.scanFile(file);
      if (decodedText) {
        this.playSound('success');
        this.showToast("QR Code successfully decoded from photo!", "success");
        this.handleDecodedQR(typeof decodedText === 'object' ? (decodedText.decodedText || JSON.stringify(decodedText)) : decodedText);
      } else {
        throw new Error("No QR pattern found");
      }
    } catch (err) {
      console.warn("File scan error:", err);
      this.playSound('danger');
      if (resultBox) {
        resultBox.innerHTML = `<span style="color: #f87171;">⚠️ Could not read a clear QR code from "${file.name}". Please ensure the tag is well lit, in focus, and uncropped.</span>`;
      }
      this.showToast("No clear QR code detected in this photo.", "warning");
    } finally {
      // Clear file input so same file can be selected again if desired
      const fileInput = document.getElementById('scanner-file-input');
      if (fileInput) fileInput.value = '';
    }
  }

  handleManualTagLookup() {
    const input = document.getElementById('manual-scan-tag-input');
    const val = input ? input.value.trim() : '';
    if (!val) {
      this.showToast("Please enter a Dog ID (e.g. KYN-DEL-2025-0012) or QR link.", "warning");
      if (input) input.focus();
      return;
    }
    this.handleDecodedQR(val);
  }

  handleDecodedQR(decodedText) {
    console.log("Decoded QR Payload:", decodedText);
    if (!decodedText) return;

    // Cleanly close scanner modal and stop camera
    this.closeModal('qr-scanner-modal');

    // Haptic feedback on mobile if supported
    if (navigator.vibrate) {
      try { navigator.vibrate([100, 50, 100]); } catch(e) {}
    }

    // Extract ID cleanly from URL, JSON or raw string
    let raw = decodedText.toString().trim();

    // Check if JSON payload
    try {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.dogId)) {
        raw = parsed.id || parsed.dogId;
      }
    } catch(e) {}

    // Extract from URL (e.g. https://kynos.org/dog/KYN-DEL-2025-0012)
    const urlMatch = raw.match(/\/dog\/([A-Za-z0-9\-]+)/i);
    let dogId = urlMatch ? urlMatch[1] : raw;

    // Strip trailing slashes, hashes or query params
    dogId = dogId.split('?')[0].split('#')[0].replace(/\/+$/, '').trim();

    // Look up dog in persistent state
    let dog = window.KynosState.getDogById(dogId);

    // Fallback: search by name or case-insensitive match among all dogs
    if (!dog) {
      const allDogs = window.KynosState.getDogs();
      dog = allDogs.find(d => 
        d.id.toLowerCase() === dogId.toLowerCase() ||
        d.name.toLowerCase() === dogId.toLowerCase()
      );
    }

    if (dog) {
      this.playSound('success');
      this.enterAppShell();
      this.showToast(`🐾 Officially Identified: ${dog.name} (${dog.id})`, 'success');
      this.openDogProfile(dog.id);
    } else {
      this.playSound('danger');
      this.showToast(`No official record found matching "${dogId}". You can search physical features in Lost Tag Recovery.`, 'warning');
    }
  }

  simulateScanDog(dogId) {
    this.handleDecodedQR(dogId);
  }

  /**
   * LOST QR CODE RECOVERY FEATURE
   * User comment: "if a QR CODE is lost then retriving same QR by matching or comparing all existing profile of all details"
   */
  handleLostTagSearch() {
    const gender = document.getElementById('lost-gender').value;
    const coatColor = document.getElementById('lost-color').value;
    const earNotch = document.getElementById('lost-earnotch').value;
    const ward = document.getElementById('lost-ward').value;
    const markings = document.getElementById('lost-markings').value;

    const matches = window.KynosDogMatcher.findMatches({
      gender,
      coatColor,
      earNotch,
      ward,
      markings
    });

    this.renderLostTagResults(matches);
  }

  renderLostTagResults(matches) {
    const container = document.getElementById('lost-tag-results-container');
    if (!container) return;

    if (matches.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">🔍</div>
          <h4>No Existing Matches Found</h4>
          <p>No existing dog profile matches these physical features. You may register this as a new dog if verified.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="recovery-header-banner">
        <h4>Found ${matches.length} Candidate Profiles in Database</h4>
        <p>Review the physical markers and photos below to restore the dog's existing permanent identity without creating duplicates.</p>
      </div>
      <div class="recovery-candidate-grid">
        ${matches.map(m => {
          const dog = m.dog;
          const scoreClass = m.score >= 75 ? 'badge-match-high' : (m.score >= 50 ? 'badge-match-medium' : 'badge-match-low');
          return `
            <div class="candidate-card">
              <div class="candidate-score-badge ${scoreClass}">
                ${m.score}% Match Confidence
              </div>
              <div class="candidate-header">
                <img src="${dog.photo}" class="candidate-photo" alt="${dog.name}" onerror="this.onerror=null; this.src=window.KynosState.getDefaultDogPhoto(dog);">
                <div class="candidate-meta">
                  <h3>${dog.name}</h3>
                  <div class="candidate-id">${dog.id}</div>
                  <div class="candidate-reg">Reg by: ${dog.registeredBy}</div>
                </div>
              </div>

              <div class="candidate-traits">
                <div class="trait-line"><strong>Gender:</strong> ${dog.gender} (${dog.approxAge})</div>
                <div class="trait-line"><strong>Color:</strong> ${dog.coatColor}</div>
                <div class="trait-line"><strong>Ear Notch:</strong> ${dog.earNotch || 'None'}</div>
                <div class="trait-line"><strong>Territory:</strong> ${dog.territory || dog.ward}</div>
                <div class="trait-line"><strong>Markings:</strong> ${dog.distinctMarkings}</div>
                <div class="trait-line"><strong>Feeder:</strong> ${dog.caregiver?.name || 'N/A'}</div>
              </div>

              <div class="candidate-reasons">
                <strong>Match Criteria:</strong>
                <ul>
                  ${m.matchReasons.map(r => `<li>✓ ${r}</li>`).join('')}
                </ul>
              </div>

              <div class="candidate-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="window.KynosApp.openDogProfile('${dog.id}')">
                  View Full Medical Dossier
                </button>
                <button class="btn btn-sm btn-success" data-role-guard="ngo,vet,govt,admin" onclick="window.KynosApp.confirmReissueTag('${dog.id}')">
                  ✓ Confirm Match & Re-issue QR Tag
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    window.KynosRBAC.applyUIConstraints();
  }

  confirmReissueTag(dogId) {
    try {
      const dog = window.KynosDogMatcher.reissueLostTag(dogId, "Identity matched via field traits and ear-notch verification");
      this.playSound('success');
      this.showToast(`Identity Restored for ${dog.name} (${dog.id})! Opening printable tag...`, 'success');
      this.openPrintableTagModal(dog.id);
    } catch(err) {
      this.showToast(err.message, 'danger');
    }
  }

  /**
   * Printable Collar Tag Modal
   */
  openPrintableTagModal(dogId) {
    const dog = window.KynosState.getDogById(dogId);
    if (!dog) return;

    const modal = document.getElementById('printable-tag-modal');
    const container = document.getElementById('printable-tag-render-target');
    if (!modal || !container) return;

    window.KynosQR.renderCollarTag(container, dog, "+91 1800-PAWS-HELP");
    modal.classList.remove('modal-hidden');
  }

  triggerPrint() {
    window.print();
  }

  /**
   * New Dog Registration with Duplicate Check
   */
  checkDuplicateOnRegistration() {
    const ward = document.getElementById('reg-dog-ward')?.value;
    const color = document.getElementById('reg-dog-color')?.value;
    const gender = document.getElementById('reg-dog-gender')?.value;
    const alertBox = document.getElementById('reg-duplicate-alert');

    if (!alertBox) return;

    if (!ward || !color) {
      alertBox.classList.add('d-none');
      return;
    }

    const matches = window.KynosDogMatcher.findMatches({ ward, coatColor: color, gender });
    const highMatches = matches.filter(m => m.score >= 55);

    if (highMatches.length > 0) {
      alertBox.classList.remove('d-none');
      alertBox.innerHTML = `
        <strong>⚠️ Potential Duplicate Warning:</strong>
        ${highMatches.length} dog(s) already exist in ${ward} with similar features (${highMatches.map(m => `${m.dog.name} - ${m.dog.id}`).join(', ')}). 
        Please verify that this is not an existing dog before issuing a new Dog ID!
      `;
    } else {
      alertBox.classList.add('d-none');
    }
  }

  handleDogRegistration() {
    // Check RBAC permission
    if (!window.KynosRBAC.hasPermission('REGISTER_DOG')) {
      this.playSound('alert');
      this.showToast("Permission Denied: Only Verified Veterinarians, NGOs, Govt Officers, and Admins can create official Dog IDs.", "danger");
      return;
    }

    const activeUser = window.KynosState.getActiveUser();
    const city = "Delhi";
    const year = new Date().getFullYear();
    const seq = Math.floor(1000 + Math.random() * 9000);
    const generatedId = `KYN-DEL-${year}-${seq}`;

    const newDog = {
      id: generatedId,
      name: document.getElementById('reg-dog-name').value.trim(),
      breed: document.getElementById('reg-dog-breed').value.trim() || "Desi / Indian Pariah",
      gender: document.getElementById('reg-dog-gender').value,
      approxAge: document.getElementById('reg-dog-age').value.trim() || "2 Years",
      weight: document.getElementById('reg-dog-weight').value.trim() || "17 kg",
      coatColor: document.getElementById('reg-dog-color').value.trim(),
      distinctMarkings: document.getElementById('reg-dog-markings').value.trim() || "None specified",
      earNotch: document.getElementById('reg-dog-earnotch').value,
      photo: (document.getElementById('reg-dog-photo').value.trim() && window.KynosState.isValidPhoto(document.getElementById('reg-dog-photo').value.trim()))
        ? document.getElementById('reg-dog-photo').value.trim()
        : window.KynosState.getDefaultDogPhoto({ coatColor: document.getElementById('reg-dog-color').value, name: document.getElementById('reg-dog-name').value }),
      ward: document.getElementById('reg-dog-ward').value,
      city: city,
      territory: document.getElementById('reg-dog-territory').value.trim() || "Main Street",
      lat: 28.5494 + (Math.random() - 0.5) * 0.05,
      lng: 77.2001 + (Math.random() - 0.5) * 0.05,
      registeredBy: `${activeUser.organization || activeUser.name}`,
      registrationDate: new Date().toISOString().substring(0, 10),
      tagStatus: "Active",
      lastVerifiedDate: new Date().toISOString().substring(0, 10),
      
      sterilization: {
        status: document.getElementById('reg-dog-earnotch').value.includes('None') ? "Unsterilized" : "Sterilized",
        date: new Date().toISOString().substring(0, 10),
        facility: activeUser.organization || "MCD ABC Facility",
        surgeon: activeUser.name,
        earNotchVerified: !document.getElementById('reg-dog-earnotch').value.includes('None'),
        earNotchLocation: document.getElementById('reg-dog-earnotch').value
      },

      vaccination: {
        rabiesStatus: "Active",
        lastRabiesDate: new Date().toISOString().substring(0, 10),
        nextRabiesDueDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().substring(0, 10),
        rabiesBatch: `DEF-ARV-${Date.now().toString().slice(-4)}`,
        history: [
          {
            vaccine: "Anti-Rabies (ARV)",
            date: new Date().toISOString().substring(0, 10),
            dueDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().substring(0, 10),
            batchNo: `DEF-ARV-${Date.now().toString().slice(-4)}`,
            administeredBy: activeUser.name,
            status: "Verified"
          }
        ]
      },

      medicalHistory: [],
      caregiver: {
        name: document.getElementById('reg-dog-feeder').value.trim() || "Community Feeders",
        role: "Community Feeder",
        contact: document.getElementById('reg-dog-feeder-phone').value.trim() || "+91 99999 11111",
        temperament: "Friendly"
      },
      adoption: {
        isAvailable: false,
        status: "Community Protected"
      },
      auditLog: [
        {
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          role: activeUser.role,
          user: activeUser.name,
          action: `Official Digital Identity Created with ID: ${generatedId}`
        }
      ]
    };

    window.KynosState.saveDog(newDog);
    this.playSound('success');
    this.showToast(`Official Dog ID ${generatedId} successfully generated!`, 'success');

    // Reset Form & switch to dog profile
    document.getElementById('register-dog-form').reset();
    this.switchTab('dogs');
    this.openDogProfile(newDog.id);
  }

  /**
   * Citizen SOS submission
   */
  handleSosSubmit() {
    const reporterName = document.getElementById('sos-name').value.trim();
    const reporterPhone = document.getElementById('sos-phone').value.trim();
    const incidentType = document.getElementById('sos-type').value;
    const severity = document.getElementById('sos-severity').value;
    const locationDescription = document.getElementById('sos-location').value.trim();
    const ward = document.getElementById('sos-ward').value;
    const description = document.getElementById('sos-desc').value.trim();
    const photo = document.getElementById('sos-photo').value.trim();
    const lat = document.getElementById('sos-lat').value;
    const lng = document.getElementById('sos-lng').value;

    const report = window.KynosEmergency.submitReport({
      reporterName,
      reporterPhone,
      incidentType,
      severity,
      locationDescription,
      ward,
      description,
      photo,
      lat,
      lng
    });

    this.playSound('success');
    this.showToast(`Emergency Report ${report.id} dispatched! NGO rescue teams notified.`, 'success');
    document.getElementById('citizen-sos-form').reset();
    this.switchTab('reports');
  }

  renderReportsList() {
    const container = document.getElementById('reports-table-container');
    if (!container) return;

    const reports = window.KynosState.getReports();

    if (reports.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-muted">No emergency incidents reported.</div>`;
      return;
    }

    const canDispatch = window.KynosRBAC.hasPermission('DISPATCH_RESCUE');

    container.innerHTML = `
      <div class="table-responsive">
        <table class="kynos-table">
          <thead>
            <tr>
              <th>ID & Date</th>
              <th>Incident Type</th>
              <th>Location & Ward</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Assigned Team</th>
              ${canDispatch ? '<th>Manage Dispatch</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${reports.map(r => `
              <tr>
                <td>
                  <strong>${r.id}</strong>
                  <div class="text-muted small">${r.timestamp}</div>
                </td>
                <td>
                  <div class="incident-badge-type">${r.incidentType}</div>
                  <div class="small text-muted">${r.description}</div>
                </td>
                <td>
                  <div>📍 ${r.locationDescription}</div>
                  <div class="small text-muted">${r.ward}</div>
                </td>
                <td>
                  <span class="severity-pill severity-${r.severity.toLowerCase()}">${r.severity}</span>
                </td>
                <td>
                  <span class="badge-status badge-status-${r.status.toLowerCase().replace(/[\s/]/g, '')}">${r.status}</span>
                </td>
                <td>
                  <div class="small">${r.assignedTo || 'Pending'}</div>
                  <div class="small text-muted">${r.rescueNotes || ''}</div>
                </td>
                ${canDispatch ? `
                  <td>
                    <select class="form-select form-select-sm" onchange="window.KynosApp.updateReportPipeline('${r.id}', this.value)">
                      <option value="Reported" ${r.status === 'Reported' ? 'selected' : ''}>Reported</option>
                      <option value="Dispatched" ${r.status === 'Dispatched' ? 'selected' : ''}>Dispatched Ambulance</option>
                      <option value="In Treatment" ${r.status === 'In Treatment' ? 'selected' : ''}>In Treatment</option>
                      <option value="Recovered/Released" ${r.status === 'Recovered/Released' ? 'selected' : ''}>Recovered & Released</option>
                      <option value="Closed" ${r.status === 'Closed' ? 'selected' : ''}>Close Case</option>
                    </select>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  updateReportPipeline(reportId, newStatus) {
    window.KynosEmergency.updateReportStatus(reportId, newStatus, null, `Status moved to ${newStatus}`);
    this.showToast(`Incident ${reportId} updated to ${newStatus}`, 'info');
    this.renderReportsList();
  }

  renderAdoptionList() {
    const container = document.getElementById('adoptions-grid-container');
    if (!container) return;

    const dogs = window.KynosState.getDogs().filter(d => d.adoption?.isAvailable);

    if (dogs.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">🏠</div>
          <h4>No Dogs Currently Listed for Adoption</h4>
          <p>Check back soon or submit a general foster request.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = dogs.map(dog => `
      <div class="adoption-card">
        <div class="adoption-img-wrap">
          <img src="${dog.photo}" alt="${dog.name}" class="adoption-img" onerror="this.onerror=null; this.src=window.KynosState.getDefaultDogPhoto(dog);">
          <span class="adoption-ready-badge">✓ Vaccinated & Sterilized</span>
        </div>
        <div class="adoption-body">
          <h3>${dog.name}</h3>
          <p class="dog-sub">${dog.breed} • ${dog.approxAge} • ${dog.gender}</p>
          <p class="adoption-temperament">💛 <em>"${dog.adoption?.temperamentNotes || 'Extremely sweet and loving'}"</em></p>
          <div class="adoption-meta">
            <span>📍 ${dog.ward}</span>
            <span>Foster: ${dog.adoption?.fosterHome || 'Community'}</span>
          </div>
          <button class="btn btn-adopt-now mt-3" onclick="window.KynosApp.openAdoptionModal('${dog.id}')">
            Adopt ${dog.name} (Submit Interest) →
          </button>
        </div>
      </div>
    `).join('');
  }

  openAdoptionModal(dogId) {
    const dog = window.KynosState.getDogById(dogId);
    if (!dog) return;

    const modal = document.getElementById('adoption-interest-modal');
    if (!modal) return;

    document.getElementById('adopt-modal-dog-name').textContent = dog.name;
    document.getElementById('adopt-modal-dog-id').textContent = dog.id;
    const adoptPhoto = document.getElementById('adopt-modal-photo');
    if (adoptPhoto) {
      adoptPhoto.src = dog.photo;
      adoptPhoto.onerror = function() {
        this.onerror = null;
        this.src = window.KynosState.getDefaultDogPhoto(dog);
      };
    }
    modal.classList.remove('modal-hidden');
  }

  submitAdoptionApplication() {
    const name = document.getElementById('adopt-app-name').value.trim();
    const phone = document.getElementById('adopt-app-phone').value.trim();
    const notes = document.getElementById('adopt-app-notes').value.trim();

    if (!name || !phone) {
      this.showToast("Please enter your name and phone number.", "warning");
      return;
    }

    this.playSound('success');
    this.showToast("Adoption interest submitted! The foster coordinator will contact you shortly.", "success");
    this.closeModal('adoption-interest-modal');
  }

  // Clinical Log Modals
  showAddVaccineModal(dogId) {
    this.selectedDogId = dogId;
    const modal = document.getElementById('add-vaccine-modal');
    if (modal) modal.classList.remove('modal-hidden');
  }

  submitVaccineLog() {
    if (!this.selectedDogId) return;
    const vaccine = document.getElementById('vax-form-type').value;
    const batchNo = document.getElementById('vax-form-batch').value.trim();
    const date = document.getElementById('vax-form-date').value;
    const dueDate = document.getElementById('vax-form-due').value;

    window.KynosMedical.addVaccination(this.selectedDogId, { vaccine, batchNo, date, dueDate });
    this.playSound('success');
    this.showToast("Vaccination record successfully verified and logged!", "success");
    this.closeModal('add-vaccine-modal');
    this.openDogProfile(this.selectedDogId);
  }

  showSterilizeModal(dogId) {
    this.selectedDogId = dogId;
    const modal = document.getElementById('log-steril-modal');
    if (modal) modal.classList.remove('modal-hidden');
  }

  submitSterilizeLog() {
    if (!this.selectedDogId) return;
    const facility = document.getElementById('steril-form-facility').value.trim();
    const earNotchLocation = document.getElementById('steril-form-notch').value;
    const notes = document.getElementById('steril-form-notes').value.trim();

    window.KynosMedical.logSterilization(this.selectedDogId, { facility, earNotchLocation, postOpStatus: notes });
    this.playSound('success');
    this.showToast("Sterilization and ear-notch officially verified!", "success");
    this.closeModal('log-steril-modal');
    this.openDogProfile(this.selectedDogId);
  }

  renderAuditLogTable() {
    const container = document.getElementById('audit-log-container');
    if (!container) return;

    const logs = window.KynosState.getAuditLogs();
    container.innerHTML = `
      <table class="kynos-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Role</th>
            <th>Authorized User</th>
            <th>Action Logged</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(l => `
            <tr>
              <td class="text-muted small">${l.timestamp}</td>
              <td><span class="role-pill role-pill-${l.role}">${l.role.toUpperCase()}</span></td>
              <td><strong>${l.user}</strong></td>
              <td>${l.action}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

// Global Application Instance
window.KynosApp = new KynosApplication();
document.addEventListener('DOMContentLoaded', () => {
  window.KynosApp.init();
});
