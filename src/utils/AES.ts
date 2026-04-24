// utils/aes.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = crypto
  .createHash("sha256")
  .update(process.env.AES_SECRET!)
  .digest(); // 32 bytes

export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    iv: iv.toString("hex"),
    data: encrypted,
  };
};

export const decrypt = (encryptedData: string, ivHex: string) => {
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
