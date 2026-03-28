export interface LocationInterface {
    firebaseToken: string;
    deviceId: string;
    postCode: string;
    lng: number;
    lat: number;
     location: {
        type: "Point";
        coordinates: [number, number]; // [lng, lat]
    };
    city: string;
    address: string;
    miles: number;
}   