export type PlanStatus = 'PAID' | 'UNPAID';
export type DeviceTypeDisplay = 'Mobile (iOS)' | 'Mobile (Android)' | 'Desktop' | 'Tablet';

export interface AdminUserListItem {
  id: string;
  fullname: string;
  username: string;
  email: string;
  isVerified: boolean;
  avatarUrl?: string;
  postCode: string;
  location: string;
  primaryDevice: DeviceTypeDisplay;
  plan: PlanStatus;
  subscriptionStatus?: string;
  createdAt: string;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserSubscriptionDetail {
  planType: string;
  status: string;
  price: string;
  renewalDate: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface UserItemInterest {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  imageUrl?: string;
  type?: string;
}

export interface UserActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'view' | 'update' | 'auth' | 'subscription' | 'other';
}

export interface AdminUserDetail {
  id: string;
  fullname: string;
  username: string;
  email: string;
  isVerified: boolean;
  avatarUrl?: string;
  deviceId?: string;
  location: {
    city: string;
    address?: string;
    postCode: string;
  };
  subscription: UserSubscriptionDetail;
  notificationPreferences: {
    activeKeywords: string[];
  };
  itemsOfInterest: UserItemInterest[];
  recentActivity: UserActivityItem[];
}
