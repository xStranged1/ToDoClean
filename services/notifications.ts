export const sendPushNotification = async (
    exponentPushToken: string,
    title: string,
    body: string
) => {
    try {
        const message = {
            to: exponentPushToken,
            sound: 'default',
            title,
            body,
        };
        console.log("message");
        console.log(message);

        const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Accept-encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        });

        const data = await response.json();
        console.log("Response:", data);

        return data;
    } catch (error) {
        console.error("Error sending push notification:", error);
        throw error;
    }
};

type PushMessage = {
    to: string | string[];
    title?: string;
    body: string;
    sound?: string;
    badge?: number;
};

export const sendMultiplePushNotifications = async (
    messages: PushMessage[]
) => {
    try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messages),
        });

        const data = await response.json();
        console.log("Response:", data);

        return data;
    } catch (error) {
        console.error("Error sending multiple notifications:", error);
        throw error;
    }
};