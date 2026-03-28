
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (
  email: string,
  code: string
) => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Verify your email',
    html: `
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <h1>${code}</h1>
      <p>This code expires in 10 minutes.</p>
    `
  });
};

export const sendResetPasswordCodeEmail = async (
  email: string,
  code: string
) => {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Reset your password',
    html: `
      <h2>Password Reset</h2>
      <p>Your reset code is:</p>
      <h1>${code}</h1>
      <p>This code expires in 10 minutes.</p>
    `
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