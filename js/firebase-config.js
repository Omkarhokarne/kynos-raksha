/**
 * Kynos Raksha - Firebase Cloud Database Integration
 * Safe & Secure Cloud Firestore Configuration with Offline Fallback
 * 
 * Project: kynos-raksha
 */

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCaocaIBb222ADXIe7hi4r7sy5pwfQEkRo",
  authDomain: "kynos-raksha.firebaseapp.com",
  projectId: "kynos-raksha",
  storageBucket: "kynos-raksha.firebasestorage.app",
  messagingSenderId: "464605030027",
  appId: "1:464605030027:web:5b8d35db5737c626ea168e"
};

// Aliases for compatibility
const FIREBASE_CONFIG = firebaseConfig;
window.firebaseConfig = firebaseConfig;
window.FIREBASE_CONFIG = firebaseConfig;

class FirebaseService {
  constructor() {
    this.isInitialized = false;
    this.db = null;
    this.auth = null;
    this.recaptchaVerifier = null;
    this.confirmationResult = null;
    this.init();
  }

  init() {
    // Check if real keys are provided and Firebase SDK is loaded
    if (
      typeof firebase !== 'undefined' && 
      firebaseConfig.apiKey && 
      !firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY")
    ) {
      try {
        if (!firebase.apps.length) {
          this.app = firebase.initializeApp(firebaseConfig);
        } else {
          this.app = firebase.app();
        }

        if (firebase.firestore) {
          this.db = firebase.firestore();
        }

        if (firebase.auth) {
          this.auth = firebase.auth();
        }

        this.isInitialized = true;
        console.log("🔥 Firebase Cloud Database Connected successfully to project: " + firebaseConfig.projectId);
        
        // Update connection status in DOM once document is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => this.showConnectionNotice(true));
        } else {
          this.showConnectionNotice(true);
        }
      } catch (err) {
        console.warn("⚠️ Firebase initialization notice:", err.message);
        this.isInitialized = false;
        this.showConnectionNotice(false);
      }
    } else {
      // Safe offline / local database mode
      this.isInitialized = false;
      console.log("🛡️ Running in Safe Local Database Mode (data/users.json + LocalStorage).");
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.showConnectionNotice(false));
      } else {
        this.showConnectionNotice(false);
      }
    }
  }

  showConnectionNotice(isConnected) {
    const statusEls = document.querySelectorAll('.cloud-status-badge, .cloud-db-status-badge, #cloud-db-status');
    statusEls.forEach(statusEl => {
      if (isConnected) {
        statusEl.innerHTML = `🟢 Cloud Firestore Active (${firebaseConfig.projectId})`;
        statusEl.className = "cloud-status-badge cloud-active";
        statusEl.title = "Connected to Firebase Cloud Firestore: " + firebaseConfig.projectId;
      } else {
        statusEl.innerHTML = `🛡️ Local Database Mode`;
        statusEl.className = "cloud-status-badge cloud-local";
        statusEl.title = "Running locally via data/users.json + LocalStorage";
      }
    });
  }

  /**
   * Initialize invisible reCAPTCHA for Firebase Phone Authentication
   */
  setupRecaptcha(containerId = 'recaptcha-container') {
    if (!this.auth) return null;
    try {
      if (this.recaptchaVerifier) {
        try { this.recaptchaVerifier.clear(); } catch(e) {}
        this.recaptchaVerifier = null;
      }

      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
      }

      this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
        size: 'invisible',
        callback: () => {
          console.log("🛡️ Firebase reCAPTCHA solved for Phone SMS authentication");
        },
        'expired-callback': () => {
          console.warn("⚠️ Firebase reCAPTCHA expired, please retry verification");
        }
      });

      return this.recaptchaVerifier;
    } catch (e) {
      console.warn("Recaptcha setup warning:", e);
      return null;
    }
  }

  /**
   * Format phone number to E.164 (+[country code][number])
   */
  formatPhoneToE164(rawPhone) {
    let clean = (rawPhone || '').replace(/[^0-9+]/g, '');
    if (!clean.startsWith('+')) {
      if (clean.length === 10) {
        clean = '+91' + clean; // Default to India (+91)
      } else {
        clean = '+' + clean;
      }
    }
    return clean;
  }

  /**
   * Send real SMS OTP to phone via Firebase Authentication
   */
  async sendPhoneOtp(rawPhone, containerId = 'recaptcha-container') {
    if (!this.isInitialized || !this.auth) {
      throw new Error("Firebase is not connected.");
    }

    const formattedPhone = this.formatPhoneToE164(rawPhone);
    const verifier = this.setupRecaptcha(containerId);
    if (!verifier) {
      throw new Error("Could not initialize reCAPTCHA verifier.");
    }

    console.log(`📲 Executing reCAPTCHA and checking Firebase SMS gateway for ${formattedPhone}...`);
    try {
      const confirmationResult = await this.auth.signInWithPhoneNumber(formattedPhone, verifier);
      this.confirmationResult = confirmationResult;
      console.log(`✅ Direct SMS OTP dispatched to ${formattedPhone} via Firebase!`);

      return {
        success: true,
        phone: formattedPhone,
        confirmationResult: confirmationResult
      };
    } catch (err) {
      console.warn("⚠️ Firebase Phone SMS Gateway notice:", err.code || err.message);
      return {
        success: false,
        phone: formattedPhone,
        error: err,
        code: err.code || 'unknown',
        message: err.message || 'SMS delivery restricted by carrier or region policy'
      };
    }
  }

  /**
   * Verify entered 6-digit SMS OTP via Firebase ConfirmationResult
   */
  async verifyPhoneOtp(code) {
    if (!this.confirmationResult) {
      throw new Error("No active Firebase Phone SMS session. Please request a new OTP.");
    }
    const cleanCode = String(code).trim();
    const result = await this.confirmationResult.confirm(cleanCode);
    console.log("✅ Firebase Phone Authentication verified successfully!", result.user.uid);
    return result.user;
  }

  /**
   * Safe Cloud Sync for Dogs
   */
  async syncDogToCloud(dog) {
    if (!this.isInitialized || !this.db) return false;
    try {
      await this.db.collection('dogs').doc(dog.id).set(dog, { merge: true });
      console.log(`☁️ Cloud sync success for Dog ${dog.id}`);
      return true;
    } catch (e) {
      console.warn("Cloud dog sync notice:", e.message || e);
      return false;
    }
  }

  /**
   * Fetch all dogs from Cloud Firestore
   */
  async getDogsFromCloud() {
    if (!this.isInitialized || !this.db) return null;
    try {
      const snap = await this.db.collection('dogs').get();
      const dogs = [];
      snap.forEach(doc => dogs.push(doc.data()));
      return dogs;
    } catch (e) {
      console.warn("Error fetching dogs from cloud:", e.message || e);
      return null;
    }
  }

  /**
   * Safe Cloud Sync for User Registration
   */
  async syncUserToCloud(user) {
    if (!this.isInitialized || !this.db) return false;
    try {
      const safeUser = { ...user };
      delete safeUser.password; // Never push plaintext passwords to public cloud tables
      const docId = user.id || (user.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : ('user_' + Date.now()));
      await this.db.collection('users').doc(docId).set(safeUser, { merge: true });
      console.log(`☁️ Cloud sync success for User ${user.email || docId}`);
      return true;
    } catch (e) {
      console.warn("Cloud user sync notice:", e.message || e);
      return false;
    }
  }

  /**
   * Safe Cloud Sync for Emergency SOS Reports
   */
  async syncReportToCloud(report) {
    if (!this.isInitialized || !this.db) return false;
    try {
      await this.db.collection('sos_reports').doc(report.id).set(report, { merge: true });
      console.log(`☁️ Cloud sync success for SOS Report ${report.id}`);
      return true;
    } catch (e) {
      console.warn("Cloud report sync notice:", e.message || e);
      return false;
    }
  }

  /**
   * Listen to real-time dog updates across all devices
   */
  listenToDogs(callback) {
    if (!this.isInitialized || !this.db) return null;
    try {
      return this.db.collection('dogs').onSnapshot(snapshot => {
        const dogs = [];
        snapshot.forEach(doc => dogs.push(doc.data()));
        if (callback) callback(dogs);
      }, err => {
        console.warn("Live cloud dogs listener notice:", err.message || err);
      });
    } catch (e) {
      console.warn("Error setting up dogs listener:", e);
      return null;
    }
  }

  /**
   * Register user with Email/Password and create Cloud Firestore profile
   */
  async registerUser(userData) {
    if (!this.isInitialized || !this.auth || !this.db) {
      throw new Error("Firebase is not connected.");
    }

    const email = userData.email.trim().toLowerCase();
    const password = userData.password;

    const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
    const firebaseUser = userCredential.user;

    try {
      await firebaseUser.sendEmailVerification();
    } catch (e) {
      console.warn("Email verification send notice:", e.message);
    }

    const profile = {
      uid: firebaseUser.uid,
      id: userData.id || ("USR-" + Date.now()),
      name: userData.name,
      email: email,
      userType: userData.userType || "public",
      userTypeTitle: userData.userTypeTitle || "Public User / Dog Guardian",
      organization: userData.organization || "",
      phone: userData.phone || "",
      licenseNo: userData.licenseNo || "",
      verified: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await this.db.collection("users").doc(firebaseUser.uid).set(profile, { merge: true });

    return {
      success: true,
      user: profile,
      firebaseUser: firebaseUser
    };
  }
}

// Global Singleton
window.KynosFirebase = new FirebaseService();
