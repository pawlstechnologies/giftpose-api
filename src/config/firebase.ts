// import admin from "firebase-admin";
import * as admin from 'firebase-admin';
import serviceAccount = require('../serviceAccountKey.json');  //from "../firebase-service-account.json";



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
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


