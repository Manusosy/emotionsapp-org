import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  DollarSign,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  FileText,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Activity,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/authContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const navigation = [
  {
    name: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Executive dashboard and KPIs',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'Patient and mentor analytics',
  },
  {
    name: 'Sessions',
    href: '/admin/sessions',
    icon: Calendar,
    description: 'Appointment intelligence',
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Platform performance metrics',
  },
  {
    name: 'Finance',
    href: '/admin/finance',
    icon: DollarSign,
    description: 'Revenue and financial insights',
  },
  {
    name: 'Content',
    href: '/admin/content',
    icon: FileText,
    description: 'Resources and content management',
  },
  {
    name: 'Communications',
    href: '/admin/communications',
    icon: MessageSquare,
    description: 'Messages and notifications',
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: TrendingUp,
    description: 'Export and reporting tools',
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Verify admin access
  useEffect(() => {
    if (!user) {
      navigate('/admin/signin');
      return;
    }

    // Check if user has admin role and valid email domain
    const isAdmin = user.user_metadata?.role === 'admin';
    const hasValidEmail = user.email?.endsWith('@emotionsapp.org');

    if (!isAdmin || !hasValidEmail) {
      toast.error('Access denied. Admin privileges required.');
      signOut();
      navigate('/admin/signin');
    }
  }, [user, navigate, signOut]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/admin/signin');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getCurrentPageName = () => {
    const currentNav = navigation.find(nav => nav.href === location.pathname);
    return currentNav?.name || 'Dashboard';
  };

  if (!user) {
    return null; // Loading or redirecting
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-full max-w-sm flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4 bg-blue-600 flex-shrink-0">
            <div className="flex items-center min-w-0">
              <Shield className="h-8 w-8 text-white flex-shrink-0" />
              <span className="ml-2 text-lg font-semibold text-white truncate">EmotionsApp</span>
            </div>
            <button
              type="button"
              className="text-white hover:text-gray-200 p-1 rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</div>
                  </div>
                  {isActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l"></div>
                  )}
                </Link>
              );
            })}
          </nav>
          
          {/* Mobile user info */}
          <div className="p-3 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                  {getInitials(user.user_metadata?.full_name || user.email || 'A')}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.user_metadata?.full_name || 'Admin User'}
                </div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-2 py-0.5">
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 z-30",
        sidebarCollapsed ? "lg:w-16" : "lg:w-72"
      )}>
        <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-sm">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 bg-blue-600 relative flex-shrink-0">
            <Shield className="h-8 w-8 text-white flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="ml-3 min-w-0 flex-1">
                <div className="text-lg font-semibold text-white truncate">EmotionsApp</div>
                <div className="text-xs text-blue-100 truncate">Admin Dashboard</div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:text-blue-200 transition-colors p-1 rounded"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                    sidebarCollapsed && "justify-center px-2"
                  )}
                  title={sidebarCollapsed ? `${item.name} - ${item.description}` : ''}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-700",
                    !sidebarCollapsed && "mr-3"
                  )} />
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</div>
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-600 rounded-l"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-3 border-t border-gray-200 flex-shrink-0">
            <div className={cn(
              "flex items-center",
              sidebarCollapsed && "justify-center"
            )}>
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                  {getInitials(user.user_metadata?.full_name || user.email || 'A')}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {user.user_metadata?.full_name || 'Admin User'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-2 py-0.5">
                    Admin
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-72"
      )}>
        {/* Top header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="ml-4 lg:ml-0">
                <h1 className="text-xl font-semibold text-gray-900">
                  {getCurrentPageName()}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden sm:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(user.user_metadata?.full_name || user.email || 'A')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || 'Admin User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
