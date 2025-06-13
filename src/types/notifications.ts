export type NotificationType = 'appointment' | 'message' | 'review' | 'system' | 'reminder';

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    link?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationCount {
    total: number;
    unread: number;
}

export interface NotificationFilters {
    type?: NotificationType;
    isRead?: boolean;
    startDate?: string;
    endDate?: string;
}

export interface CreateNotificationParams {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
    metadata?: Record<string, unknown>;
}

export interface UpdateNotificationParams {
    id: string;
    isRead?: boolean;
    metadata?: Record<string, unknown>;
} 