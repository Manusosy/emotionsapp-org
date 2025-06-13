import NotificationsPageComponent from '@/components/notifications/NotificationsPage';
import DashboardLayout from "../components/DashboardLayout";

/**
 * Patient dashboard notifications page
 */
export default function NotificationsPage() {
  return <NotificationsPageComponent userRole="patient" dashboardLayout={DashboardLayout} />;
} 