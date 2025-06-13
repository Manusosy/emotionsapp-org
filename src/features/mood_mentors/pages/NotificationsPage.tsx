import NotificationsPageComponent from '@/components/notifications/NotificationsPage';
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";

/**
 * Mood Mentor dashboard notifications page
 */
export default function NotificationsPage() {
  return <NotificationsPageComponent userRole="mood_mentor" dashboardLayout={DashboardLayout} />;
} 