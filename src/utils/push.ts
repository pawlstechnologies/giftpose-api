import admin from '../config/firebase';

export const sendPushNotification = async (
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
) => {
    if (!deviceToken || !deviceToken.trim()) {
        console.log('⚠️ Empty deviceToken. Skipping push.');
        return;
    }

    try {
        await admin.messaging().send({
            token: deviceToken.trim(),
            notification: {
                title,
                body
            },
            ...(data ? { data } : {})
        });
        console.log('✅ Single push notification sent');
    } catch (err: any) {
        console.error('❌ Single push notification error:', err?.message || err);
    }
};

export const sendBulkPushNotification = async (
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
) => {
    const cleanTokens = Array.from(
        new Set((tokens || []).map((t) => t?.trim()).filter(Boolean))
    ) as string[];

    console.log('📲 Preparing to send push notifications...');
    console.log('📲 Tokens count:', cleanTokens.length);

    if (!cleanTokens.length) {
        console.log('⚠️ No tokens found. Skipping push.');
        return;
    }

    try {
        const response = await admin.messaging().sendEachForMulticast({
            tokens: cleanTokens,
            notification: { title, body },
            ...(data ? { data } : {})
        });

        console.log('✅ Push sent successfully');
        console.log('📊 Success count:', response.successCount);
        console.log('❌ Failure count:', response.failureCount);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`❌ Failed token: ${cleanTokens[idx]}`);
                    console.log(`   Error: ${resp.error?.message}`);
                }
            });
        }
    } catch (err: any) {
        console.error('❌ Push notification error:', err?.message || err);
    }
};


