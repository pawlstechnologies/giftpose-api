// import admin from '../config/firebase

import admin from '../config/firebase';

export const sendPushNotification = async (
    deviceToken: string,
    title: string,
    body: string
) => {
    await admin.messaging().send({
        token: deviceToken,
        notification: {
            title,
            body
        }
    });
};

export const sendBulkPushNotification = async (
    tokens: string[],
    title: string,
    body: string
) => {

    console.log('📲 Preparing to send push notifications...');
    console.log('📲 Tokens count:', tokens.length);


    if (!tokens.length) {
        console.log('⚠️ No tokens found. Skipping push.');
        return;
    }


    try {
        const response = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: { title, body }
        });

        console.log('✅ Push sent successfully');
        console.log('📊 Success count:', response.successCount);
        console.log('❌ Failure count:', response.failureCount);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`❌ Failed token: ${tokens[idx]}`);
                    console.log(`   Error: ${resp.error?.message}`);
                }
            });
        }

    } catch (err: any) {
        console.error('❌ Push notification error:', err.message);
    }



    //   await admin.messaging().sendEachForMulticast({
    //     tokens,
    //     notification: {
    //       title,
    //       body
    //     }
    //   });
};


