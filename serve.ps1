# Kynos Raksha - HTTP Server & REST API Backend with JSON Database
$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  KYNOS RAKSHA Web Application & API Backend Running      " -ForegroundColor Green
Write-Host "  Web App: http://localhost:$port/                        " -ForegroundColor Yellow
Write-Host "  Backend Database: data/users.json                       " -ForegroundColor Magenta
Write-Host "  REST API: /api/login, /api/register, /api/users         " -ForegroundColor White
Write-Host "  Real Email Engine: data/email-config.json               " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server.`n"

$baseDir = $PSScriptRoot
$dbPath = Join-Path $baseDir "data\users.json"
$OtpChallenges = @{}

function Get-RoleSecurityInfo($userType) {
    switch ($userType) {
        "vet" {
            return @{
                securityLevel = "Clinical Surgery & Rabies Vaccine Authorization 2FA";
                securityBadge = "🩺 VETERINARY SURGEON 2FA";
                shieldIcon = "🩺";
                instruction = "Enter the 6-digit clinical security key dispatched to your licensed veterinary contact."
            }
        }
        "govt" {
            return @{
                securityLevel = "Municipal Ward Access & Civic Authority Clearance 2FA";
                securityBadge = "️ MUNICIPAL OFFICER CLEARANCE";
                shieldIcon = "️";
                instruction = "Enter the 6-digit government clearance passcode dispatched to your official municipal officer mobile."
            }
        }
        "ngo" {
            return @{
                securityLevel = "Animal Welfare Organization Dispatch & QR Issuance Security Token";
                securityBadge = " NGO DISPATCH VERIFICATION";
                shieldIcon = "";
                instruction = "Enter the 6-digit NGO authorization pin dispatched to your registered organization coordinator."
            }
        }
        "volunteer" {
            return @{
                securityLevel = "Community Feeder & Pack Territory Safety Pin";
                securityBadge = " COMMUNITY FEEDER SAFETY PIN";
                shieldIcon = "";
                instruction = "Enter the 6-digit feeder security code dispatched to your volunteer phone number."
            }
        }
        "admin" {
            return @{
                securityLevel = "Central System Administrator Root 2FA Authentication";
                securityBadge = "️ ADMIN ROOT SECURITY 2FA";
                shieldIcon = "️";
                instruction = "Enter the 6-digit master root security PIN dispatched to central administrator device."
            }
        }
        default {
            return @{
                securityLevel = "Citizen Safety & Dog Guardian Identity Authentication";
                securityBadge = " CITIZEN SAFETY VERIFICATION";
                shieldIcon = "";
                instruction = "Enter the 6-digit citizen verification code dispatched to your registered phone & email."
            }
        }
    }
}

function Send-JsonResponse($response, $statusCode, $obj) {
    $response.StatusCode = $statusCode
    $response.ContentType = "application/json; charset=utf-8"
    $response.AddHeader("Access-Control-Allow-Origin", "*")
    $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")
    $json = $obj | ConvertTo-Json -Depth 5
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.OutputStream.Close()
}

function Read-RequestBody($request) {
    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
    $body = $reader.ReadToEnd()
    $reader.Close()
    if ([string]::IsNullOrWhiteSpace($body)) { return @{} }
    try {
        return ($body | ConvertFrom-Json)
    } catch {
        return @{}
    }
}

function Send-OtpEmail($toEmail, $recipientName, $otpCode, $userRoleTitle) {
    $emailConfigPath = Join-Path $baseDir "data\email-config.json"
    $config = $null
    if (Test-Path $emailConfigPath) {
        try {
            $config = Get-Content -Raw -Encoding UTF8 $emailConfigPath | ConvertFrom-Json
        } catch {
            Write-Host " [EMAIL CONFIG ERROR] Could not read email-config.json: $_" -ForegroundColor Red
        }
    }

    $smtpServer = if ($config -and $config.smtpServer) { $config.smtpServer } else { $env:SMTP_SERVER }
    $smtpPort = if ($config -and $config.smtpPort) { [int]$config.smtpPort } else { 587 }
    $enableSsl = if ($config -and $null -ne $config.enableSsl) { [bool]$config.enableSsl } else { $true }
    $senderEmail = if ($config -and $config.senderEmail) { $config.senderEmail.Trim() } else { "$env:SMTP_USER".Trim() }
    $rawPass = if ($config -and $config.senderPassword) { $config.senderPassword } else { $env:SMTP_PASS }
    $senderPass = if (-not [string]::IsNullOrWhiteSpace($rawPass)) { "$rawPass".Replace(" ", "").Trim() } else { "" }
    $senderName = if ($config -and $config.senderName) { $config.senderName } else { "Kynos Raksha Safety Team" }

    $subject = "[Kynos Raksha] Your Verification PIN: $otpCode"
    $displayName = if ([string]::IsNullOrWhiteSpace($recipientName)) { "Community Guardian" } else { $recipientName }
    $roleName = if ([string]::IsNullOrWhiteSpace($userRoleTitle)) { "Registered User" } else { $userRoleTitle }

    $htmlBody = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kynos Raksha Security Verification</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #c2410c 0%, #ea580c 100%); padding: 26px 20px; text-align: center; color: #ffffff;">
      <div style="font-size: 38px; margin-bottom: 6px;">🐕🛡️</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">KYNOS RAKSHA</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.92; font-weight: 500;">Digital Dog Identity & Stray Safety Platform</p>
    </div>
    
    <div style="padding: 30px 26px;">
      <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #0f172a;">Account Registration Verification</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px 0;">
        Hello <strong>$displayName</strong>,<br><br>
        Thank you for registering on <strong>Kynos Raksha</strong> as a <strong>$roleName</strong>. To activate your account and verify your email address, please use the following one-time verification PIN:
      </p>

      <div style="background: #fff7ed; border: 2px dashed #f97316; border-radius: 10px; padding: 20px; text-align: center; margin: 22px 0;">
        <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; color: #c2410c; display: block; margin-bottom: 6px;">Your 6-Digit Email Verification PIN</span>
        <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #c2410c; font-family: monospace;">$otpCode</div>
        <span style="font-size: 12px; color: #9a3412; display: block; margin-top: 8px;">⏱️ Valid for <strong>10 minutes</strong></span>
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 20px 0;">
        🔒 <strong>Security Warning:</strong> Never share this code with anyone. Kynos Raksha administrators will never ask for your verification PIN.
      </p>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11.5px; color: #94a3b8; text-align: center;">
        If you did not request this registration, please ignore this email.<br>
        © 2026 Kynos Raksha Identity & Safety Collective.
      </div>
    </div>
  </div>
</body>
</html>
"@

    if (-not [string]::IsNullOrWhiteSpace($senderEmail) -and -not [string]::IsNullOrWhiteSpace($senderPass)) {
        try {
            Write-Host " [EMAIL ENGINE] ✉️ Sending real OTP email to $toEmail via $smtpServer port $smtpPort..." -ForegroundColor Cyan
            $smtp = New-Object System.Net.Mail.SmtpClient($smtpServer, $smtpPort)
            $smtp.EnableSsl = $enableSsl
            $smtp.Credentials = New-Object System.Net.NetworkCredential($senderEmail, $senderPass)
            $smtp.Timeout = 15000

            $mail = New-Object System.Net.Mail.MailMessage
            $mail.From = New-Object System.Net.Mail.MailAddress($senderEmail, $senderName)
            $mail.To.Add($toEmail)
            $mail.Subject = $subject
            $mail.Body = $htmlBody
            $mail.IsBodyHtml = $true

            $smtp.Send($mail)
            $mail.Dispose()
            $smtp.Dispose()

            Write-Host " [EMAIL ENGINE] ✅ REAL OTP EMAIL SUCCESSFULLY SENT to $toEmail!" -ForegroundColor Green
            return @{ success = $true; message = "Email dispatched successfully" }
        } catch {
            Write-Host " [EMAIL ENGINE] ❌ SMTP send failed to $toEmail - $($_.Exception.Message)" -ForegroundColor Red
            return @{ success = $false; error = $_.Exception.Message }
        }
    } else {
        Write-Host "==========================================================================" -ForegroundColor Yellow
        Write-Host " [EMAIL ENGINE NOTICE] Real OTP for $toEmail is: $otpCode" -ForegroundColor Yellow
        Write-Host " To deliver real emails directly to this user's inbox:" -ForegroundColor White
        Write-Host " 1. Open data\email-config.json" -ForegroundColor White
        Write-Host " 2. Put your Gmail in 'senderEmail' and your Google App Password in 'senderPassword'" -ForegroundColor White
        Write-Host "    (Or use any Brevo/SendGrid/Outlook SMTP credentials)" -ForegroundColor White
        Write-Host "==========================================================================" -ForegroundColor Yellow
        return @{ success = $false; message = "SMTP credentials not configured in data/email-config.json" }
    }
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

    # CORS Preflight
    if ($request.HttpMethod -eq "OPTIONS") {
        $response.StatusCode = 204
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")
        $response.OutputStream.Close()
        continue
    }

    $urlPath = $request.Url.LocalPath.TrimStart('/')

    # =========================================================================
    # BACKEND API ROUTES
    # =========================================================================

    # 1. POST /api/login - Check Credentials & Generate Role-Specific OTP Challenge
    if ($urlPath -eq "api/login" -and $request.HttpMethod -eq "POST") {
        $payload = Read-RequestBody $request
        $email = "$($payload.email)".Trim().ToLower()
        $password = "$($payload.password)".Trim()
        $selectedUserType = "$($payload.userType)".Trim().ToLower()

        if ([string]::IsNullOrWhiteSpace($email)) {
            Send-JsonResponse $response 400 @{ success = $false; message = "Email is required" }
            continue
        }

        $users = @()
        if (Test-Path $dbPath) {
            $users = (Get-Content -Raw $dbPath | ConvertFrom-Json)
        }

        $matched = $null
        foreach ($u in $users) {
            if ($u.email.Trim().ToLower() -eq $email) {
                $matched = $u
                break
            }
        }

        if ($null -eq $matched) {
            # User is not registered - strictly reject login
            Send-JsonResponse $response 404 @{ 
                success = $false; 
                message = "Account not registered: No user found for '$email'. You must register first before signing in." 
            }
            continue
        }

        # Check password
        if (-not [string]::IsNullOrWhiteSpace($matched.password)) {
            if ([string]::IsNullOrWhiteSpace($password) -or $matched.password -ne $password) {
                Send-JsonResponse $response 401 @{ 
                    success = $false; 
                    message = "Incorrect password for $email. Please enter your valid registered password." 
                }
                continue
            }
        }

        # Check if user account is already verified (OTP is only required on first-time registration)
        $isVerified = ($matched.PSObject.Properties['otpVerified'] -and $matched.otpVerified -eq $true)

        if ($isVerified) {
            # Direct Login - No repeated OTP required!
            $matched.lastLogin = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            $users | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $dbPath

            $safeUser = $matched | Select-Object * -ExcludeProperty password
            Send-JsonResponse $response 200 @{ 
                success = $true; 
                otpRequired = $false;
                user = $safeUser;
                message = "Welcome back, $($matched.name)! Authenticated directly via registered credentials."
            }
            continue
        }

        # First-time verification challenge for unverified accounts
        $otp = (Get-Random -Minimum 100000 -Maximum 999999).ToString()
        $tempToken = [System.Guid]::NewGuid().ToString()
        $roleKey = if ([string]::IsNullOrWhiteSpace($matched.userType)) { "public" } else { $matched.userType.ToLower() }
        $secInfo = Get-RoleSecurityInfo $roleKey

        $OtpChallenges[$tempToken] = @{
            otp = $otp;
            email = $matched.email;
            userId = $matched.id;
            userType = $roleKey;
            expiresAt = ([DateTime]::UtcNow.AddMinutes(10));
        }

        # Mask phone number for privacy display
        $rawPhone = if ([string]::IsNullOrWhiteSpace($matched.phone)) { "+91 98765 43210" } else { $matched.phone }
        $maskedPhone = $rawPhone
        if ($rawPhone.Length -gt 6) {
            $maskedPhone = $rawPhone.Substring(0, [Math]::Min(5, $rawPhone.Length - 4)) + " *** " + $rawPhone.Substring($rawPhone.Length - 3)
        }

        Write-Host " [KYNOS RAKSHA 2FA OTP] Generated for $($matched.name) ($($matched.email)) -> PIN: $otp" -ForegroundColor Yellow

        # Dispatch real email to user
        Send-OtpEmail $matched.email $matched.name $otp $matched.userTypeTitle

        Send-JsonResponse $response 200 @{ 
            success = $true; 
            otpRequired = $true; 
            tempToken = $tempToken;
            userType = $roleKey;
            userTypeTitle = $matched.userTypeTitle;
            name = $matched.name;
            email = $matched.email;
            phone = $rawPhone;
            maskedPhone = $maskedPhone;
            securityLevel = $secInfo.securityLevel;
            securityBadge = $secInfo.securityBadge;
            shieldIcon = $secInfo.shieldIcon;
            instruction = "Enter the 6-digit first-time activation PIN sent to your registered email ($($matched.email)).";
            message = "First-time security verification PIN dispatched to $($matched.email). Please check your email inbox and spam folder."
        }
        continue
    }

    # 1B. POST /api/verify-otp - Validate 6-digit OTP & Issue Verified Session
    if ($urlPath -eq "api/verify-otp" -and $request.HttpMethod -eq "POST") {
        $payload = Read-RequestBody $request
        $tempToken = "$($payload.tempToken)".Trim()
        $enteredOtp = "$($payload.otp)".Trim()
        $email = "$($payload.email)".Trim().ToLower()

        if ([string]::IsNullOrWhiteSpace($tempToken) -or -not $OtpChallenges.ContainsKey($tempToken)) {
            Send-JsonResponse $response 400 @{ 
                success = $false; 
                message = "Invalid or expired security session. Please return to login." 
            }
            continue
        }

        $challenge = $OtpChallenges[$tempToken]
        if ([DateTime]::UtcNow -gt $challenge.expiresAt) {
            $OtpChallenges.Remove($tempToken)
            Send-JsonResponse $response 400 @{ 
                success = $false; 
                message = "Security OTP has expired. Please request a new code." 
            }
            continue
        }

        if ($challenge.otp -ne $enteredOtp) {
            Send-JsonResponse $response 401 @{ 
                success = $false; 
                message = "Incorrect OTP code. Please enter the valid 6-digit verification code." 
            }
            continue
        }

        # Verification successful!
        $OtpChallenges.Remove($tempToken)

        $users = @()
        if (Test-Path $dbPath) {
            $users = (Get-Content -Raw $dbPath | ConvertFrom-Json)
        }

        $matched = $null
        foreach ($u in $users) {
            if ($u.email.Trim().ToLower() -eq $challenge.email.Trim().ToLower()) {
                $matched = $u
                break
            }
        }

        if ($null -eq $matched) {
            Send-JsonResponse $response 404 @{ success = $false; message = "User account not found." }
            continue
        }

        $matched.lastLogin = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        if ($matched.PSObject.Properties['otpVerified']) {
            $matched.otpVerified = $true
        } else {
            $matched | Add-Member -NotePropertyName "otpVerified" -NotePropertyValue $true -Force
        }
        if ($matched.PSObject.Properties['lastOtpVerification']) {
            $matched.lastOtpVerification = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        } else {
            $matched | Add-Member -NotePropertyName "lastOtpVerification" -NotePropertyValue (Get-Date -Format "yyyy-MM-dd HH:mm:ss") -Force
        }
        $users | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $dbPath

        $safeUser = $matched | Select-Object * -ExcludeProperty password
        Write-Host " [KYNOS RAKSHA VERIFIED] Account activated: $($matched.name) ($($matched.email))" -ForegroundColor Green
        Send-JsonResponse $response 200 @{ 
            success = $true; 
            user = $safeUser; 
            message = "Identity & OTP Verified! Access granted." 
        }
        continue
    }

    # 1C. POST /api/resend-otp - Dispatches fresh OTP code
    if ($urlPath -eq "api/resend-otp" -and $request.HttpMethod -eq "POST") {
        $payload = Read-RequestBody $request
        $tempToken = "$($payload.tempToken)".Trim()

        if ([string]::IsNullOrWhiteSpace($tempToken) -or -not $OtpChallenges.ContainsKey($tempToken)) {
            Send-JsonResponse $response 400 @{ success = $false; message = "Invalid session token." }
            continue
        }

        $newOtp = (Get-Random -Minimum 100000 -Maximum 999999).ToString()
        $OtpChallenges[$tempToken].otp = $newOtp
        $OtpChallenges[$tempToken].expiresAt = ([DateTime]::UtcNow.AddMinutes(10))

        Write-Host " [KYNOS RAKSHA OTP RESEND] Fresh PIN for $($OtpChallenges[$tempToken].email) -> PIN: $newOtp" -ForegroundColor Magenta

        # Dispatch real email to user
        Send-OtpEmail $OtpChallenges[$tempToken].email "User" $newOtp $OtpChallenges[$tempToken].userType

        Send-JsonResponse $response 200 @{ 
            success = $true; 
            message = "Fresh verification PIN dispatched to $($OtpChallenges[$tempToken].email). Please check your email." 
        }
        continue
    }

    # 2. POST /api/register - User Registration + OTP Safety Challenge
    if ($urlPath -eq "api/register" -and $request.HttpMethod -eq "POST") {
        $payload = Read-RequestBody $request
        $name = "$($payload.name)".Trim()
        $email = "$($payload.email)".Trim().ToLower()
        $password = "$($payload.password)".Trim()
        $userType = "$($payload.userType)".Trim().ToLower()
        $organization = "$($payload.organization)".Trim()
        $licenseNo = "$($payload.licenseNo)".Trim()
        $phone = "$($payload.phone)".Trim()

        if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($email)) {
            Send-JsonResponse $response 400 @{ success = $false; message = "Name and Email are required." }
            continue
        }

        $users = @()
        if (Test-Path $dbPath) {
            $users = (Get-Content -Raw $dbPath | ConvertFrom-Json)
        }

        $matchedExisting = $null
        foreach ($u in $users) {
            if ($u.email.Trim().ToLower() -eq $email) {
                $matchedExisting = $u
                break
            }
        }

        if ($null -ne $matchedExisting) {
            # If user already verified their OTP, reject duplicate registration and instruct to sign in
            if ($matchedExisting.PSObject.Properties['otpVerified'] -and $matchedExisting.otpVerified -eq $true) {
                Send-JsonResponse $response 409 @{ success = $false; message = "An account with this email ($email) is already registered and verified. Please sign in directly." }
                continue
            } else {
                # Account was registered but pending OTP verification: update profile with latest submitted details
                $matchedExisting.name = $name
                if (-not [string]::IsNullOrWhiteSpace($password)) { $matchedExisting.password = $password }
                if (-not [string]::IsNullOrWhiteSpace($userType)) { $matchedExisting.userType = $userType }
                if (-not [string]::IsNullOrWhiteSpace($organization)) { $matchedExisting.organization = $organization }
                if (-not [string]::IsNullOrWhiteSpace($licenseNo)) { $matchedExisting.licenseNo = $licenseNo }
                if (-not [string]::IsNullOrWhiteSpace($phone)) { $matchedExisting.phone = $phone }
                $newUser = $matchedExisting
            }
        } else {
            $roleTitles = @{
                "ngo" = "Verified Animal Welfare NGO";
                "vet" = "Verified Veterinary Surgeon";
                "volunteer" = "Community Feeder & Volunteer";
                "govt" = "Municipal Animal Welfare Officer";
                "admin" = "System Administrator";
                "public" = "Public User / Dog Guardian"
            }

            $newUser = [PSCustomObject]@{
                id = "USR-" + (Get-Date -Format "yyyyMMdd-HHmmss");
                name = $name;
                email = $email;
                password = if ([string]::IsNullOrWhiteSpace($password)) { "password123" } else { $password };
                userType = if ([string]::IsNullOrWhiteSpace($userType)) { "public" } else { $userType };
                userTypeTitle = if ($roleTitles.ContainsKey($userType)) { $roleTitles[$userType] } else { "Community Member" };
                organization = if ([string]::IsNullOrWhiteSpace($organization)) { "Animal Welfare Collective" } else { $organization };
                licenseNo = $licenseNo;
                phone = if ([string]::IsNullOrWhiteSpace($phone)) { "+91 99999 00000" } else { $phone };
                avatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                verified = $true;
                otpVerified = $false;
                createdAt = (Get-Date -Format "yyyy-MM-dd HH:mm:ss");
                lastLogin = (Get-Date -Format "yyyy-MM-dd HH:mm:ss");
            }
            $users += $newUser
        }

        $users | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $dbPath

        # Issue registration OTP challenge
        $otp = (Get-Random -Minimum 100000 -Maximum 999999).ToString()
        $tempToken = [System.Guid]::NewGuid().ToString()
        $roleKey = $newUser.userType.ToLower()
        $secInfo = Get-RoleSecurityInfo $roleKey

        $OtpChallenges[$tempToken] = @{
            otp = $otp;
            email = $newUser.email;
            userId = $newUser.id;
            userType = $roleKey;
            expiresAt = ([DateTime]::UtcNow.AddMinutes(10));
        }

        Write-Host " [KYNOS RAKSHA SECURITY OTP] Generated for $($newUser.name) ($($newUser.email)) -> PIN: $otp" -ForegroundColor Green

        # Dispatch real email to user's respective email
        Send-OtpEmail $newUser.email $newUser.name $otp $newUser.userTypeTitle

        $rawPhone = $newUser.phone
        $maskedPhone = if ($rawPhone.Length -gt 6) { $rawPhone.Substring(0, [Math]::Min(5, $rawPhone.Length - 4)) + " *** " + $rawPhone.Substring($rawPhone.Length - 3) } else { $rawPhone }

        Send-JsonResponse $response 201 @{ 
            success = $true; 
            otpRequired = $true; 
            tempToken = $tempToken;
            userType = $roleKey;
            userTypeTitle = $newUser.userTypeTitle;
            name = $newUser.name;
            email = $newUser.email;
            phone = $newUser.phone;
            maskedPhone = $maskedPhone;
            securityLevel = $secInfo.securityLevel;
            securityBadge = $secInfo.securityBadge;
            shieldIcon = $secInfo.shieldIcon;
            instruction = "Enter the 6-digit registration verification PIN sent to your registered email address ($($newUser.email)).";
            message = "Registration verification PIN dispatched to $($newUser.email). Please enter the 6-digit code to activate your account." 
        }
        continue
    }

    # 3. GET /api/users
    if ($urlPath -eq "api/users" -and $request.HttpMethod -eq "GET") {
        $users = @()
        if (Test-Path $dbPath) {
            $users = (Get-Content -Raw $dbPath | ConvertFrom-Json)
        }
        $safeUsers = $users | Select-Object * -ExcludeProperty password
        Send-JsonResponse $response 200 @{ success = $true; users = $safeUsers }
        continue
    }

    # 4. GET & POST /api/email-config
    if ($urlPath -eq "api/email-config") {
        $emailConfigPath = Join-Path $baseDir "data\email-config.json"
        if ($request.HttpMethod -eq "GET") {
            $conf = $null
            if (Test-Path $emailConfigPath) {
                try { $conf = Get-Content -Raw -Encoding UTF8 $emailConfigPath | ConvertFrom-Json } catch {}
            }
            $isConfigured = ($conf -and -not [string]::IsNullOrWhiteSpace($conf.senderEmail) -and -not [string]::IsNullOrWhiteSpace($conf.senderPassword))
            Send-JsonResponse $response 200 @{
                success = $true;
                configured = $isConfigured;
                smtpServer = if ($conf -and $conf.smtpServer) { $conf.smtpServer } else { "smtp.gmail.com" };
                smtpPort = if ($conf -and $conf.smtpPort) { $conf.smtpPort } else { 587 };
                senderEmail = if ($conf -and $conf.senderEmail) { $conf.senderEmail } else { "" };
                senderName = if ($conf -and $conf.senderName) { $conf.senderName } else { "Kynos Raksha Safety Team" }
            }
            continue
        }
        if ($request.HttpMethod -eq "POST") {
            $payload = Read-RequestBody $request
            $newConf = @{
                provider = "smtp";
                smtpServer = if ($payload.smtpServer) { "$($payload.smtpServer)".Trim() } else { "smtp.gmail.com" };
                smtpPort = if ($payload.smtpPort) { [int]$payload.smtpPort } else { 587 };
                enableSsl = $true;
                senderEmail = if ($payload.senderEmail) { "$($payload.senderEmail)".Trim() } else { "" };
                senderPassword = if ($payload.senderPassword) { "$($payload.senderPassword)".Trim() } else { "" };
                senderName = if ($payload.senderName) { "$($payload.senderName)".Trim() } else { "Kynos Raksha Safety Team" }
            }
            $newConf | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $emailConfigPath
            Send-JsonResponse $response 200 @{ success = $true; message = "Email configuration saved successfully." }
            continue
        }
    }

    # =========================================================================
    # STATIC FILE SERVING
    # =========================================================================
    if ([string]::IsNullOrWhiteSpace($urlPath)) {
        $urlPath = "index.html"
    }

    $filePath = Join-Path $baseDir $urlPath

    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = switch ($ext) {
            ".html" { "text/html; charset=utf-8" }
            ".css"  { "text/css; charset=utf-8" }
            ".js"   { "application/javascript; charset=utf-8" }
            ".json" { "application/json; charset=utf-8" }
            ".png"  { "image/png" }
            ".jpg"  { "image/jpeg" }
            ".jpeg" { "image/jpeg" }
            ".svg"  { "image/svg+xml" }
            default { "application/octet-stream" }
        }

        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentType = $contentType
        $response.ContentLength64 = $bytes.Length
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        if ($request.HttpMethod -ne "HEAD") {
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        if ($request.HttpMethod -ne "HEAD") {
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
    }

    $response.OutputStream.Close()
    } catch {
        Write-Host "Request error: $_" -ForegroundColor DarkYellow
    }
}

