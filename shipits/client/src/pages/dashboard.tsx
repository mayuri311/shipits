import { useState } from "react";
import { Link } from "wouter";
import { 
  BarChart3, Bell, Calendar, Eye, Heart, MessageSquare, 
  Plus, Settings, TrendingUp, Users, ChevronRight, Trash2,
  ExternalLink, Clock, Star, User as UserIcon, Activity, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardApi, notificationsApi } from "@/lib/api";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import type { User, Project, Comment } from "@shared/schema";

// Helper function to validate date values
function isValidDate(date: any): boolean {
  if (!date) return false;
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

interface DashboardData {
  user: User;
  projects: {
    owned: Project[];
    liked: Project[];
    subscribed: Project[];
  };
  recentComments: Comment[];
  statistics: {
    totalProjectsCreated: number;
    totalCommentsPosted: number;
    totalLikesReceived: number;
    totalProjectViews: number;
    unreadNotifications: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: Date;
    type: string;
  }>;
}

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedUser?: {
    username: string;
    fullName?: string;
    profileImage?: string;
  };
  relatedProject?: {
    title: string;
  };
  relatedEvent?: {
    title: string;
    startDateTime: string;
  };
}

export default function Dashboard() {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Get dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getDashboardData(),
    enabled: isAuthenticated,
  });

  // Get notifications
  const { data: notificationsData, isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['notifications-dashboard'],
    queryFn: () => notificationsApi.getNotifications({ limit: 10, includeRead: true }),
    enabled: isAuthenticated && activeTab === "notifications",
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to view your dashboard.</p>
          <Link href="/forum">
            <Button>Go to Forum</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isDashboardLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const dashboard = dashboardData?.success ? dashboardData.data : null;
  const notifications = notificationsData?.success ? notificationsData.data.notifications : [];

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-6">We couldn't load your dashboard data. Please try again.</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const { user, projects, statistics, recentActivity } = dashboard;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'project_like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment_like':
        return <Heart className="h-4 w-4 text-pink-500" />;
      case 'new_comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'comment_reply':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'project_update':
        return <Activity className="h-4 w-4 text-purple-500" />;
      case 'new_subscriber':
        return <Users className="h-4 w-4 text-orange-500" />;
      case 'event_registration':
        return <Calendar className="h-4 w-4 text-indigo-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide text-sm sm:text-base">
              HOME
            </Link>
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <Link href="/forum">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  FORUM
                </Button>
              </Link>
              
              {/* Desktop: Show all navigation options */}
              <div className="hidden md:flex items-center gap-2">
                <span className="text-maroon font-medium tracking-wide">DASHBOARD</span>
                <Link href="/profile" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                  PROFILE
                </Link>
                <Link href="/#contact" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                  CONTACT
                </Link>
              </div>

              {/* Mobile: More options button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="px-2 text-xs relative md:hidden"
              >
                {isMenuOpen ? <X className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
                {!isMenuOpen && <span className="absolute -top-1 -right-1 w-2 h-2 bg-maroon rounded-full"></span>}
              </Button>
            </div>
          </div>
          
          {/* Mobile Extended Menu */}
          {isMenuOpen && (
            <div className="border-t border-gray-200 mt-2 pt-3 pb-2 md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 text-xs text-maroon font-medium px-2 py-1 bg-red-50 rounded mb-2">
                  📊 Dashboard
                </div>
                <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    PROFILE
                  </Button>
                </Link>
                <Link href="/#contact" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    CONTACT
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-2">Welcome back, {user.fullName || user.username}!</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Link href="/create-project" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    {isMobile ? "New" : "New Project"}
                  </Button>
                </Link>
                <Link href="/profile" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Settings className="h-4 w-4 mr-2" />
                    {isMobile ? "Settings" : "Settings"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Projects Created</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalProjectsCreated}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalProjectViews.toLocaleString()}</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Likes Received</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalLikesReceived}</p>
                  </div>
                  <Heart className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Comments Posted</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalCommentsPosted}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">My Projects</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="notifications">
                Notifications
                {statistics.unreadNotifications > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {statistics.unreadNotifications}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Projects */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Recent Projects</CardTitle>
                    <CardDescription>Your latest projects and their performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {projects.owned.slice(0, 3).map((project: Project) => (
                        <div key={project._id?.toString()} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <Link href={`/forum/project/${project._id}`} className="font-medium hover:text-blue-600">
                              {project.title}
                            </Link>
                            <p className="text-sm text-gray-600 mt-1">
                              {project.description?.substring(0, 100)}...
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {project.analytics?.views || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {project.analytics?.totalLikes || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {project.analytics?.totalComments || 0}
                              </span>
                            </div>
                          </div>
                          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status}
                          </Badge>
                        </div>
                      ))}
                      {projects.owned.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No projects yet</p>
                          <p className="text-xs mt-1">Create your first project to get started!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                    <CardDescription>Your engagement overview</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Projects Liked</span>
                      <span className="font-medium">{projects.liked.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Subscriptions</span>
                      <span className="font-medium">{projects.subscribed.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Unread Notifications</span>
                      <Badge variant={statistics.unreadNotifications > 0 ? "destructive" : "secondary"}>
                        {statistics.unreadNotifications}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="projects" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.owned.map((project: Project) => (
                  <Card key={project._id?.toString()}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {project.description?.substring(0, 120)}...
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {project.analytics?.views || 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {project.analytics?.totalLikes || 0} likes
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          {project.analytics?.totalComments || 0} comments
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/forum/project/${project._id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {projects.owned.length === 0 && (
                  <div className="lg:col-span-2 xl:col-span-3 text-center py-12 text-gray-500">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-600 mb-4">Create your first project to showcase your work!</p>
                    <Link href="/create-project">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent actions and interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {recentActivity.map((activity, index) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="p-2 bg-gray-100 rounded-full">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                            <p className="text-xs text-gray-600">{activity.details}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {activity.timestamp && isValidDate(activity.timestamp) 
                                ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
                                : 'Unknown time'
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                      {recentActivity.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No recent activity</p>
                          <p className="text-xs mt-1">Start creating and engaging to see your activity here!</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>Stay updated on your projects and interactions</CardDescription>
                    </div>
                    {notifications.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          notifications.forEach((notification: Notification) => {
                            if (!notification.read) {
                              markAsReadMutation.mutate(notification._id);
                            }
                          });
                        }}
                      >
                        Mark All Read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {isNotificationsLoading ? (
                        <div className="text-center py-8 text-gray-500">Loading notifications...</div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No notifications yet</p>
                          <p className="text-xs mt-1">We'll notify you when something happens!</p>
                        </div>
                      ) : (
                        notifications.map((notification: Notification) => (
                          <div
                            key={notification._id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              !notification.read ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              if (!notification.read) {
                                markAsReadMutation.mutate(notification._id);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              {getNotificationIcon(notification.type)}
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm">{notification.title}</p>
                                  {!notification.read && (
                                    <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                {notification.relatedUser && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    by {notification.relatedUser.fullName || notification.relatedUser.username}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-2">
                                  {notification.createdAt && isValidDate(notification.createdAt)
                                    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                                    : 'Unknown time'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}