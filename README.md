# Kynos Raksha (क्यूनोस रक्षा)
### QR-Based Digital Identity & Welfare Management System for Stray and Community Dogs

> **“Identify. Protect. Track. Care.”**  
> *ONE DOG → ONE UNIQUE ID → ONE QR CODE → ONE DIGITAL HISTORY*

---

## 📌 Project Overview
**Kynos Raksha** is a modern, responsive web application engineered to solve critical problems in community animal welfare:
1. **Dog Artwork Background Theme**: Features the warm creamy aesthetic and ultra-sharp resting street dogs photo (`assets/creamy_pet_bg.jpg`) across all pages, panels, splash screen, and gateway card.
2. **2-Second Motion Graphics Opening Screen**: Starts with a glowing animated geometric canine/QR shield, pulsating radar scan rings, app title **KYNOS RAKSHA**, and tagline **“Identify. Protect. Track. Care.”** with a 2-second progress timer and smooth transition.
3. **Centered Entry Gateway with User Type Selection & QR Scanner**:
   - **Instant Dog Identification**: Scan dog QR code with live camera or 1-click test buttons (*Sheru*, *Bella*, *Kaalu*, *Rocky*) — completely accessible without needing to sign in.
   - **User Type & Email Authentication**: No hardcoded demo users! Users select their User Type (NGO, Veterinarian, Volunteer, Municipal Officer, Citizen, Admin) and log in with their email and password.
   - **Backend JSON Database**: User accounts and credentials are encrypted and stored in `data/users.json` via backend REST API endpoints (`/api/login`, `/api/register`, `/api/users`). Any number of people can register and log in with their respective user types!
4. **Preventing Repeated Surgeries (ABC)**: Prevents community dogs from being repeatedly captured and undergoing unnecessary repeat surgeries by verifying ear-notch markers (Left ear = Female sterilized; Right ear = Male sterilized) and official surgical history.
5. **Eliminating Duplicate Anti-Rabies Vaccinations**: Provides instant digital verification of vaccine type, manufacturer batch number, and expiration/booster dates.
6. **Lost QR Tag Recovery & Duplicate Prevention**: If a dog loses its collar or ear tag in the field, authorized personnel can search by physical traits (coat pattern, markings, ear-notch, and ward) to retrieve the original permanent profile and re-issue the tag without creating duplicate identities.
7. **Emergency Citizen SOS & Rescue Dispatch**: Citizens can report injured or sick dogs with GPS location, photo evidence, and emergency severity levels. Animal welfare NGOs manage a live ambulance dispatch pipeline.
8. **Municipal Health & Census Monitoring**: Ward-level territorial mapping, census monitoring, and automated tracking of WHO's 70%+ rabies herd immunity targets.
6. **Community Adoption Portal**: Showcases sterilized, vaccinated, and temperament-verified dogs looking for foster or adoptive homes.

---

## 👥 Role-Based Access Control (RBAC)
The platform enforces strict role capabilities across 6 distinct user profiles:

| Feature / Permission | Public User | Volunteer | Veterinarian | Verified NGO | Municipal Officer | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Scan Dog QR Code** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Public Safety Info** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **File Citizen SOS Report** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Apply for Adoption** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Update Feeder / Territory Info** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Upload Field Sighting Photos** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Full Clinical Dossier** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Log Diagnoses & Prescriptions** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Log Vaccines & Batch Numbers** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Log ABC Sterilization & Ear Notch** | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| **Issue Official Dog ID & QR** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Print Official Collar Tags** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Recover Lost Tag / Re-issue** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Manage Ambulance Dispatch** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **View Ward Census Analytics** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **System Governance & Audit Trail** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🚀 How to Run Locally

### Option 1: Direct Browser Opening
Simply double-click [`index.html`](file:///c:/Users/HP/Desktop/kynos%20raksha/index.html) or open it directly in Google Chrome, Microsoft Edge, or Firefox.

### Option 2: Local HTTP Server (Zero Dependencies)
Run the included PowerShell server:
```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```
Then visit: `http://localhost:8080/`

---

## ✉️ Real Email OTP Verification Configuration
Every newly registered user receives their one-time 6-digit verification code directly in their respective email inbox. The system does not reveal the code on screen or offer auto-fill buttons.

To enable live email delivery to any registered email inbox:
1. Open [`data/email-config.json`](file:///c:/Users/HP/Desktop/kynos%20raksha/data/email-config.json)
2. Configure your SMTP provider credentials:
   - **Gmail** (Recommended):
     - `"smtpServer": "smtp.gmail.com"`
     - `"smtpPort": 587`
     - `"senderEmail": "yourgmail@gmail.com"`
     - `"senderPassword": "xxxx xxxx xxxx xxxx"` *(16-character Google App Password from [Google Account Security](https://myaccount.google.com/apppasswords))*
   - **Brevo / SendGrid / Outlook / Custom SMTP**: Enter your provider's SMTP host, port 587, and credentials.
3. When users register, `serve.ps1` dispatches a branded HTML email containing the 6-digit OTP code directly to their email.
4. If credentials are not yet entered, the server console displays a helpful notice with the generated OTP so development and testing can proceed seamlessly.

---

## 📱 Mobile Frame Mode
Click the floating button in the bottom-right corner to toggle between:
- **🖥️ Full Responsive Desktop View**
- **📱 Mobile Phone App Frame** (simulates an iPhone/Android app shell with rounded glass borders and native look-and-feel).

---

## 🏷️ Testing Scenarios

1. **Lost Tag Recovery Feature**:
   - Go to **🔍 Lost Tag Recovery**.
   - Click **⚡ Test Scenario: Search for "Rocky" (Tag Lost in Saket)**.
   - Observe how the engine matches physical traits (dark brown brindle, right ear notch, male, Saket ward) with high confidence.
   - Click **✓ Confirm Match & Re-issue QR Tag** to restore the identity and open the printable collar badge studio!

2. **Strict RBAC Security Testing**:
   - Click the user capsule in the top-right navbar (**⇄ Switch Role**).
   - Switch to **Public User**: Notice that the "Register Dog" button and clinical logging options disappear or become disabled.
   - Switch to **Veterinarian**: Open any dog profile and click **+ Log Vaccine** to enter batch numbers and booster dates.
   - Switch to **NGO / Welfare Org**: Open **Register Dog** to issue a brand new official dog ID (`KYN-DEL-2026-XXXX`).

3. **Emergency SOS Incident Dispatch**:
   - Go to **Emergency SOS** tab.
   - File a new incident report or click **Detect My GPS**.
   - As an NGO or Admin, change report status in the live table from `Reported` → `Dispatched` → `In Treatment` → `Recovered & Released`.

4. **Printable Tag Studio**:
   - On any dog card, click the **🏷️ Tag icon**.
   - View the formatted dog collar tag with metallic ring hole, verified QR code, ID, ear notch verification, and 24x7 emergency rescue helpline.
   - Click **🖨️ Print Collar Tag (PDF)**.
