import { firebaseMessaging } from "../config/firebase";

interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

