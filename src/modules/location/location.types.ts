export interface LocationInterface {
    firebaseToken: string;
    deviceId: string;
    postCode: string;
    subscriptionId?: string;
    subscription?: any; // You can replace 'any' with a more specific type if you have one for Subscription
    user?: any; // You can replace 'any' with a more specific type if you have one for User
    lng: number;
    lat: number;
     location: {
        type: "Point";
        coordinates: [number, number]; // [lng, lat]
    };
    city: string;
    address: string;
    miles: number;
    adEnabled: boolean;
    isPremium: boolean;
}   