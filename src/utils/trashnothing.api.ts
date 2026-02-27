import axios, { AxiosInstance } from 'axios';


class TrashNothingApi {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: 'https://trashnothing.com/api/v1.4',
            timeout: 10000
        });
    }

    async fetchUKOffers(params?: {
        dateMin?: string;
        dateMax?: string;
        page?: number;
        perPage?: number;
    }) {
        try {
            const response = await this.client.get('/posts/all', {
                params: {
                    types: 'offer',
                    country: 'UK',
                    date_min: params?.dateMin,
                    date_max: params?.dateMax,
                    per_page: params?.perPage || 20,
                    page: params?.page || 1,
                    device_pixel_ratio: 1,
                    api_key:process.env.TRASHNOTHING_API_KEY//'P4MHIWvgU7A7gnZR4wM2t9cFTEUSAGmgla6B3ZXx'
                }
            });

            return response.data.posts || [];
        } catch (error: any) {
            console.error('TrashNothing FULL error:', {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error.message
            });

            throw {
                statusCode: error?.response?.status || 500,
                message:
                    error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    error.message ||
                    'Unknown TrashNothing API error'
            };
        }
    }
}

export default new TrashNothingApi();