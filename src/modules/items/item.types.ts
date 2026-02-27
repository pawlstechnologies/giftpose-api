export interface ItemInterface {
    name: string;
    description?: string;
    imageUrls: string[];
    category: string;
    subCategory?: string;
    city?: string;
    lng: number;
    lat: number;
    postCode: string;
    partner?: string;
    isTaken: boolean;
    visitCount: number;
    createdAt?: Date;
    updatedAt?: Date;
    url: String;
    thumbnail: String;
    type: String;
    pickup: Boolean;
    country: String;
    postId: Number;
    expiration:Date;
    status: String;
    
}