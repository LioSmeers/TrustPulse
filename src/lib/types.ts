export interface Business {
  id: string;
  name: string;
  logoUrl: string;
  accentColor: string;
  googleReviewUrl: string;
  phone: string;
  email: string;
  defaultSms: string;
  notifyFeedback: boolean;
}
export interface User {
  id: string;
  businessId: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
}
export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  createdAt: string;
}
export interface Invitation {
  id: string;
  customerId: string;
  businessId: string;
  token: string;
  status: 'sent' | 'opened' | 'completed';
  sentAt: string;
  openedAt?: string;
  message: string;
  channel?: 'link' | 'sms';
  deliveryStatus?: string;
  deliveryError?: string | null;
  providerId?: string | null;
}
export interface Rating {
  id: string;
  invitationId: string;
  stars: number;
  createdAt: string;
}
export interface Review {
  id: string;
  customerId: string;
  businessId: string;
  stars: number;
  text: string;
  platform: 'Google' | 'TrustPulse';
  createdAt: string;
}
export interface Feedback {
  id: string;
  ratingId: string;
  message: string;
  contactAllowed: boolean;
  status: 'open' | 'resolved';
  createdAt: string;
}
export interface Store {
  business: Business;
  customers: Customer[];
  invitations: Invitation[];
  ratings: Rating[];
  reviews: Review[];
  feedback: Feedback[];
}
