export const sendVerificationEmail = async (
  email: string,
  code: string
) => {
  console.log(`Send ${code} to ${email}`);
};