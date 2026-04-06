
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// export const sendVerificationEmail = async (
//   email: string,
//   code: string
// ) => {
//   await resend.emails.send({
//     from: process.env.EMAIL_FROM!,
//     to: email,
//     subject: 'Verify your email',
//     html: `
//       <h2>Email Verification</h2>
//       <p>Your verification code is:</p>
//       <h1>${code}</h1>
//       <p>This code expires in 10 minutes.</p>
//     `
//   });
// };

export const sendVerificationEmail = async (
  email: string,
  code: string
) => {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email Verification - Giftpose</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
<style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#f2f2f2;font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .email-wrap{background:#fff;border-radius:20px;max-width:520px;width:100%;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10)}
    .email-top{padding:28px 32px 24px;display:flex;align-items:center;justify-content:center;gap:9px}
    .logo-name{font-size:14px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#111}
    .body{padding:0 44px 10px;text-align:center}
    .section-title{font-size:15px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#111;margin-bottom:10px}
    .sub{font-size:13.5px;color:#6b7280;line-height:1.65;max-width:380px;margin:0 auto 28px}
    .otp-box{background:#f5f5f5;border-radius:12px;padding:24px 28px;margin:0 auto 24px;display:inline-block;width:100%}
    .otp-code{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:600;color:#1a1a1a;letter-spacing:14px;display:block;text-align:center}
    .notice{font-size:13px;color:#6b7280;line-height:1.7;max-width:400px;margin:0 auto}
    .divider{height:1px;background:#e9ecef;margin:28px 0 0}
    .footer{padding:20px 32px 28px;text-align:center}
    .f-text{font-size:12px;color:#9ca3af;margin-bottom:16px}
    .socials{display:flex;justify-content:center;gap:18px;margin-bottom:16px}
    .s-btn{width:40px;height:40px;border:1.5px solid #e0e0e0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#555;cursor:pointer;transition:all .2s;text-decoration:none}
    .s-btn:hover{border-color:#27ae60;color:#27ae60;transform:translateY(-2px)}
    .copy{font-size:11px;color:#bbb}
    @media(max-width:520px){
        .body{padding:0 22px 10px}
        .otp-code{font-size:26px;letter-spacing:10px}
    }
</style>
</head>
<body>
<div class="email-wrap">
  <div class="email-top">
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
      <path d="M20 4C20 4 14 8 14 13C14 16.31 16.69 19 20 19C23.31 19 26 16.31 26 13C26 8 20 4 20 4Z" fill="#27ae60"/>
      <path d="M20 4C20 4 23 7.5 23 11C23 13.21 21.66 15.1 19.8 16" stroke="#1a7a42" stroke-width="1.2" stroke-linecap="round" fill="none"/>
      <rect x="9" y="18" width="22" height="5" rx="2.5" fill="#27ae60"/>
      <rect x="12" y="23" width="16" height="12" rx="2" fill="#27ae60" opacity=".18"/>
      <rect x="18.5" y="18" width="3" height="17" fill="#1a7a42" opacity=".6"/>
    </svg>
    <span class="logo-name">Giftpose</span>
  </div>

  <div class="body">
    <p class="section-title">Email Verification</p>
    <p class="sub">Enter the 6-digit code sent to your email to verify your account.</p>

    <div class="otp-box">
      <span class="otp-code">${code}</span>
    </div>

    <p class="notice">
      If you did not request this verification code, please ignore this message. 
      No changes will be made to your account unless this code is entered.
    </p>
    <div class="divider"></div>
  </div>

  <div class="footer">
    <p class="f-text">Contact Giftpose for further enquiries</p>
    <div class="socials">
      <a class="s-btn" href="#" title="Instagram">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>
        </svg>
      </a>
      <a class="s-btn" href="#" title="Twitter">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
        </svg>
      </a>
      <a class="s-btn" href="#" title="Facebook">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
        </svg>
      </a>
    </div>
    <p class="copy">© 2026 GiftPose Inc. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Verify your Giftpose account',
    html: htmlTemplate,
  });
};


// export const sendResetPasswordCodeEmail = async (
//   email: string,
//   code: string
// ) => {
//   await resend.emails.send({
//     from: process.env.EMAIL_FROM!,
//     to: email,
//     subject: 'Reset your password',
//     html: `
//       <h2>Password Reset</h2>
//       <p>Your reset code is:</p>
//       <h1>${code}</h1>
//       <p>This code expires in 10 minutes.</p>
//     `
//   });
// };

export const sendResetPasswordCodeEmail = async (
  email: string,
  code: string
) => {
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Password Reset - Giftpose</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
<style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#f2f2f2;font-family:'DM Sans',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .email-wrap{background:#fff;border-radius:20px;max-width:520px;width:100%;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10)}
    .email-top{padding:28px 32px 24px;display:flex;align-items:center;justify-content:center;gap:9px}
    .logo-name{font-size:14px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#111}
    .body{padding:0 44px 10px;text-align:center}
    .section-title{font-size:15px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#111;margin-bottom:10px}
    .sub{font-size:13.5px;color:#6b7280;line-height:1.65;max-width:380px;margin:0 auto 28px}
    .otp-box{background:#f5f5f5;border-radius:12px;padding:24px 28px;margin:0 auto 24px;display:inline-block;width:100%}
    .otp-code{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:600;color:#1a1a1a;letter-spacing:14px;display:block;text-align:center}
    .notice{font-size:13px;color:#6b7280;line-height:1.7;max-width:400px;margin:0 auto}
    .divider{height:1px;background:#e9ecef;margin:28px 0 0}
    .footer{padding:20px 32px 28px;text-align:center}
    .f-text{font-size:12px;color:#9ca3af;margin-bottom:16px}
    .socials{display:flex;justify-content:center;gap:18px;margin-bottom:16px}
    .s-btn{width:40px;height:40px;border:1.5px solid #e0e0e0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#555;cursor:pointer;transition:all .2s;text-decoration:none}
    .s-btn:hover{border-color:#27ae60;color:#27ae60;transform:translateY(-2px)}
    .copy{font-size:11px;color:#bbb}
    @media(max-width:520px){
        .body{padding:0 22px 10px}
        .otp-code{font-size:26px;letter-spacing:10px}
    }
</style>
</head>
<body>
<div class="email-wrap">
  <div class="email-top">
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
      <path d="M20 4C20 4 14 8 14 13C14 16.31 16.69 19 20 19C23.31 19 26 16.31 26 13C26 8 20 4 20 4Z" fill="#27ae60"/>
      <path d="M20 4C20 4 23 7.5 23 11C23 13.21 21.66 15.1 19.8 16" stroke="#1a7a42" stroke-width="1.2" stroke-linecap="round" fill="none"/>
      <rect x="9" y="18" width="22" height="5" rx="2.5" fill="#27ae60"/>
      <rect x="12" y="23" width="16" height="12" rx="2" fill="#27ae60" opacity=".18"/>
      <rect x="18.5" y="18" width="3" height="17" fill="#1a7a42" opacity=".6"/>
    </svg>
    <span class="logo-name">Giftpose</span>
  </div>

  <div class="body">
    <p class="section-title">Password Reset</p>
    <p class="sub">Enter the 6-digit code below to reset your password. This code will expire in 10 minutes.</p>

    <div class="otp-box">
      <span class="otp-code">${code}</span>
    </div>

    <p class="notice">
      If you did not request a password reset, please ignore this email. 
      No changes will be made to your account unless this code is used.
    </p>
    <div class="divider"></div>
  </div>

  <div class="footer">
    <p class="f-text">Contact Giftpose for further enquiries</p>
    <div class="socials">
      <a class="s-btn" href="#" title="Instagram">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <circle cx="12" cy="12" r="4"/>
          <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>
        </svg>
      </a>
      <a class="s-btn" href="#" title="Twitter">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
        </svg>
      </a>
      <a class="s-btn" href="#" title="Facebook">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
        </svg>
      </a>
    </div>
    <p class="copy">© 2026 GiftPose Inc. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Reset your Giftpose password',
    html: htmlTemplate,
  });
};


export const sendPostCreatedEmail = async (email: string, item: any) => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Your item is live 🎉',
    html: `
      <h2>Your item has been posted!</h2>
      <p><strong>${item.name}</strong></p>
      <p>${item.description}</p>
      <p>Status: ${item.status}</p>
    `
  });
};



// export const sendResetPasswordEmail = async (
//   email: string,
//   token: string
// ) => {
//   const resetLink = `http://localhost:3000/reset-password?token=${token}`;

//   await resend.emails.send({
//     from: process.env.EMAIL_FROM!,
//     to: email,
//     subject: 'Reset your password',
//     html: `
//       <h2>Password Reset</h2>
//       <p>Click the link below to reset your password:</p>
//       <a href="${resetLink}">${resetLink}</a>
//       <p>This link expires in 10 minutes.</p>
//     `
//   });
// };



// export const sendVerificationEmail = async (
//   email: string,
//   code: string
// ) => {
//   console.log(`Send ${code} to ${email}`);
// };