
export interface PaymentIntent {  
    deviceId: string;
    userId?: string;
    paymentIntentId?: string;
    clientSecret?: string;
    amount: number;
    currency: string;
    status: "pending" | "success" | "failed";
    payment_method_types: string[];
    description?: string;
    metadata?: Record<string, string>;
} 
