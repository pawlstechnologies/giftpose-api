// import admin from "firebase-admin";
import * as admin from 'firebase-admin';
import serviceAccount from "../serviceAccountKey.json";



admin.initializeApp({
  // credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),

  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })

});

export default admin;


// const token = ;
// async function testPush() {
//   const message = {
//     token,
//     notification: {
//       title: "Brown Shoe",
//       body: "Brown show with lace. 1.3 miles",
//     },
//   };

//   try {
//     const response = await admin.messaging().send(message);
//     console.log("Push success:", response);
//   } catch (error) {
//     console.error("Push failed:", error);
//   }
// }
// testPush();
// export const firebaseMessaging = admin.messaging();


