import {
  Home,
  Calendar,
  Heart,
  Settings,
  Inbox,
  FileText,
  Users,
  Bell,
  BookOpen,
  Activity,
  User,
  BadgeHelp,
  MessageSquare,
  BarChart2,
  UserCheck,
  Star,
  LayoutDashboard,
  CalendarClock
} from "lucide-react";
import { NavigationSection, SearchResult } from "./types";

/**
 * Patient navigation sections
 */
export const patientNavigation: NavigationSection[] = [
  { 
    section: "Main",
    items: [
      { name: "Overview", href: "/patient-dashboard", icon: Home },
      { name: "Appointments", href: "/patient-dashboard/appointments", icon: Calendar },
      { name: "Messages", href: "/patient-dashboard/messages", icon: Inbox },
      { name: "Notifications", href: "/patient-dashboard/notifications", icon: Bell },
      { name: "Journal", href: "/patient-dashboard/journal", icon: BookOpen },
    ]
  },
  {
    section: "Wellbeing",
    items: [
      { name: "Mood Tracker", href: "/patient-dashboard/mood-tracker", icon: Activity },
      { name: "Reports", href: "/patient-dashboard/reports", icon: FileText }, 
      { name: "Resources", href: "/patient-dashboard/resources", icon: BookOpen },
    ]
  },
  {
    section: "Account",
    items: [
      { name: "Profile", href: "/patient-dashboard/profile", icon: User },
      { name: "Settings", href: "/patient-dashboard/settings", icon: Settings },
      { name: "Help Center", href: "/patient-dashboard/help", icon: BadgeHelp },
    ]
  }
];

/**
 * Mood Mentor navigation sections
 */
export const moodMentorNavigation: NavigationSection[] = [
  {
    section: "Main",
    items: [
      { name: "Overview", href: "/mood-mentor-dashboard", icon: LayoutDashboard },
      { name: "Appointments", href: "/mood-mentor-dashboard/appointments", icon: Calendar },
      { name: "Availability", href: "/mood-mentor-dashboard/availability", icon: CalendarClock },
      { name: "Patients", href: "/mood-mentor-dashboard/patients", icon: Users },
      { name: "Support Groups", href: "/mood-mentor-dashboard/groups", icon: UserCheck },
      { name: "Messages", href: "/mood-mentor-dashboard/messages", icon: MessageSquare },
    ]
  },
  {
    section: "Professional",
    items: [
      { name: "Resources", href: "/mood-mentor-dashboard/resources", icon: BookOpen },
      { name: "Reviews", href: "/mood-mentor-dashboard/reviews", icon: Star },
      { name: "Analytics", href: "/mood-mentor-dashboard/analytics", icon: BarChart2 },
    ]
  },
  {
    section: "Account",
    items: [
      { name: "Profile", href: "/mood-mentor-dashboard/profile", icon: User },
      { name: "Notifications", href: "/mood-mentor-dashboard/notifications", icon: Bell },
      { name: "Settings", href: "/mood-mentor-dashboard/settings", icon: Settings },
      { name: "Help Center", href: "/mood-mentor-dashboard/help", icon: BadgeHelp },
    ]
  }
];

/**
 * Patient searchable items
 */
export const patientSearchableItems: SearchResult[] = [
  // Overview
  {
    title: "Dashboard Overview",
    description: "View your dashboard summary and upcoming activities",
    icon: Home,
    href: "/patient-dashboard",
    category: "Pages"
  },
  // Appointments
  {
    title: "Appointments",
    description: "View and manage your therapy appointments",
    icon: Calendar,
    href: "/patient-dashboard/appointments",
    category: "Pages"
  },
  {
    title: "Schedule Session",
    description: "Book a new therapy session",
    icon: Calendar,
    href: "/patient-dashboard/appointments/schedule",
    category: "Appointments"
  },
  // Messages
  {
    title: "Messages",
    description: "Chat with your therapist and support team",
    icon: Inbox,
    href: "/patient-dashboard/messages",
    category: "Communication"
  },
  // Journal
  {
    title: "Journal",
    description: "Write and manage your therapy journal entries",
    icon: BookOpen,
    href: "/patient-dashboard/journal",
    category: "Wellbeing"
  },
  {
    title: "New Journal Entry",
    description: "Create a new journal entry",
    icon: FileText,
    href: "/patient-dashboard/journal/new",
    category: "Wellbeing"
  },
  // Mood Tracking
  {
    title: "Mood Tracker",
    description: "Track and analyze your daily mood patterns",
    icon: Activity,
    href: "/patient-dashboard/mood-tracker",
    category: "Wellbeing"
  },
  {
    title: "Mood Reports",
    description: "View your mood tracking history and insights",
    icon: FileText,
    href: "/patient-dashboard/reports",
    category: "Wellbeing"
  },
  // Resources
  {
    title: "Resource Library",
    description: "Access therapeutic resources and materials",
    icon: BookOpen,
    href: "/patient-dashboard/resources",
    category: "Support"
  },
  // Profile & Settings
  {
    title: "My Profile",
    description: "View and update your profile information",
    icon: User,
    href: "/patient-dashboard/profile",
    category: "Account"
  },
  {
    title: "Favorite Items",
    description: "Access your saved resources and content",
    icon: Heart,
    href: "/patient-dashboard/favorites",
    category: "Account"
  },
  {
    title: "Account Settings",
    description: "Manage your account preferences",
    icon: Settings,
    href: "/patient-dashboard/settings",
    category: "Account"
  },
  {
    title: "Help Center",
    description: "Get help and support",
    icon: BadgeHelp,
    href: "/patient-dashboard/help",
    category: "Support"
  }
];

/**
 * Mood Mentor searchable items
 */
export const mentorSearchableItems: SearchResult[] = [
  // Overview
  {
    title: "Dashboard Overview",
    description: "View your dashboard summary and upcoming activities",
    icon: LayoutDashboard,
    href: "/mood-mentor-dashboard",
    category: "Pages"
  },
  // Appointments
  {
    title: "Appointments",
    description: "View and manage your therapy sessions",
    icon: Calendar,
    href: "/mood-mentor-dashboard/appointments",
    category: "Pages"
  },
  // Patients
  {
    title: "My Patients",
    description: "View and manage your patients",
    icon: Users,
    href: "/mood-mentor-dashboard/patients",
    category: "Pages"
  },
  // Groups
  {
    title: "Support Groups",
    description: "Manage therapy and support groups",
    icon: UserCheck,
    href: "/mood-mentor-dashboard/groups",
    category: "Pages"
  },
  // Messages
  {
    title: "Messages",
    description: "Chat with patients and colleagues",
    icon: MessageSquare,
    href: "/mood-mentor-dashboard/messages",
    category: "Communication"
  },
  // Resources
  {
    title: "Resources",
    description: "Access and share therapeutic resources",
    icon: BookOpen,
    href: "/mood-mentor-dashboard/resources",
    category: "Professional"
  },
  // Reviews
  {
    title: "My Reviews",
    description: "View patient feedback and reviews",
    icon: Star,
    href: "/mood-mentor-dashboard/reviews",
    category: "Professional"
  },
  // Analytics
  {
    title: "Analytics",
    description: "View patient progress and outcomes data",
    icon: BarChart2,
    href: "/mood-mentor-dashboard/analytics",
    category: "Professional"
  },
  // Profile & Settings
  {
    title: "My Profile",
    description: "View and update your professional profile",
    icon: User,
    href: "/mood-mentor-dashboard/profile",
    category: "Account"
  },
  {
    title: "Account Settings",
    description: "Manage your account preferences",
    icon: Settings,
    href: "/mood-mentor-dashboard/settings",
    category: "Account"
  },
  {
    title: "Help Center",
    description: "Get help and support",
    icon: BadgeHelp,
    href: "/mood-mentor-dashboard/help",
    category: "Support"
  }
]; 