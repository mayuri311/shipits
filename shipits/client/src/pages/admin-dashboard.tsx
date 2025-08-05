import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area, DonutChart
} from 'recharts';
import { 
  Users, FolderPlus, MessageSquare, TrendingUp, Activity, Calendar, 
  Zap, Crown, Shield, AlertTriangle, Send, Bot, Sparkles, ChevronRight,
  Eye, Heart, Share2, Download, Filter, Search, RefreshCw, Settings, Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/api';
import { Link, useLocation } from 'wouter';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalProjects: number;
    totalComments: number;
    totalEvents: number;
    activeUsers: number;
    newUsersToday: number;
    newProjectsToday: number;
    engagementRate: number;
  };
  userGrowth: Array<{ date: string; users: number; activeUsers: number }>;
  projectStats: Array<{ category: string; count: number; color: string }>;
  engagementData: Array<{ month: string; comments: number; likes: number; shares: number }>;
  topProjects: Array<{ title: string; views: number; likes: number; owner: string }>;
  userActivity: Array<{ hour: string; activity: number }>;
  collegeDistribution: Array<{ college: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: 'user' | 'project' | 'comment' | 'event';
    description: string;
    timestamp: string;
    user: string;
  }>;
}

interface AIAgentMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  // Admin access check
  console.log('👤 Current user in admin dashboard:', user);
  
  if (!user || user.role !== 'admin') {
    console.log('❌ Admin access denied - User:', user ? { role: user.role, username: user.username } : 'null');
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-600">Access Denied</CardTitle>
            <CardDescription>
              Admin privileges required to access this page.
              {user && <div className="mt-2 text-sm">Current role: {user.role}</div>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/forum')} className="w-full">
              Return to Forum
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  console.log('✅ Admin access granted for:', user.username);

  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [aiMessages, setAiMessages] = useState<AIAgentMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your ShipIts AI Analytics Agent. I can help you analyze platform data, user engagement, project trends, and much more. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Fetch analytics data
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-analytics', selectedTimeframe],
    queryFn: async () => {
      console.log('🔍 Fetching admin analytics for timeframe:', selectedTimeframe);
      try {
        const result = await adminApi.getAnalytics(selectedTimeframe);
        console.log('📊 Analytics data received:', result);
        return result;
      } catch (err) {
        console.error('❌ Analytics fetch error:', err);
        throw err;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error) => {
      console.log('🔄 Query retry attempt:', failureCount, 'Error:', error);
      return failureCount < 3;
    },
    onError: (error) => {
      console.error('❌ Query error:', error);
      toast({
        title: "Analytics Error",
        description: error instanceof Error ? error.message : "Failed to load analytics data",
        variant: "destructive",
      });
    }
  });

  // AI Agent mutation
  const aiQueryMutation = useMutation({
    mutationFn: (query: string) => adminApi.queryAI(query),
    onMutate: () => {
      setIsAiTyping(true);
    },
    onSuccess: (response) => {
      setAiMessages(prev => [
        ...prev.filter(msg => !msg.isLoading),
        {
          id: Date.now().toString(),
          type: 'assistant',
          content: response.data.answer,
          timestamp: new Date()
        }
      ]);
      setIsAiTyping(false);
    },
    onError: (error) => {
      setIsAiTyping(false);
      toast({
        title: "AI Query Failed",
        description: error instanceof Error ? error.message : "Failed to get AI response",
        variant: "destructive",
      });
    }
  });

  const handleAiQuery = () => {
    if (!aiInput.trim()) return;
    
    const userMessage: AIAgentMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: aiInput,
      timestamp: new Date()
    };
    
    setAiMessages(prev => [...prev, userMessage]);
    aiQueryMutation.mutate(aiInput);
    setAiInput('');
  };

  const analytics = analyticsData?.data || null;
  console.log('📊 Analytics data for UI:', analytics);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-700">Loading Analytics...</h2>
          <p className="text-gray-500 mt-2">Gathering comprehensive platform data</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('❌ Dashboard error:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-2xl text-red-600">Error Loading Dashboard</CardTitle>
            <CardDescription>
              Failed to load analytics data.
              <div className="mt-2 text-sm text-gray-600">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => refetch()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  const testResult = await adminApi.testAccess();
                  console.log('🧪 Admin test result:', testResult);
                  toast({
                    title: "Admin Test",
                    description: testResult.success ? "Admin access working" : "Admin access failed",
                    variant: testResult.success ? "default" : "destructive"
                  });
                } catch (err) {
                  console.error('Admin test failed:', err);
                  toast({
                    title: "Admin Test Failed",
                    description: err instanceof Error ? err.message : "Unknown error",
                    variant: "destructive"
                  });
                }
              }} 
              className="w-full"
            >
              Test Admin Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 animate-gradient-x">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50 animate-fade-in-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4 animate-slide-in-left">
              <div className="relative">
                <Crown className="h-8 w-8 text-indigo-600 animate-pulse" />
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur opacity-30 animate-ping"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">ShipIts Forum Analytics & Control Center</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 animate-slide-in-right">
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-32 transition-all duration-300 hover:shadow-lg hover:border-indigo-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                className="transition-all duration-300 hover:shadow-lg hover:border-indigo-300 hover:text-indigo-600"
              >
                <RefreshCw className="h-4 w-4 mr-2 transition-transform duration-300 hover:rotate-180" />
                Refresh
              </Button>
              <Link href="/forum">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="transition-all duration-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50"
                >
                  Back to Forum
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-slide-up">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 glass-effect hover-lift">
            <TabsTrigger value="overview" className="flex items-center gap-2 transition-all duration-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2 transition-all duration-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50">
              <FolderPlus className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="engagement" className="flex items-center gap-2 transition-all duration-300 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50">
              <Activity className="h-4 w-4" />
              Engagement
            </TabsTrigger>
            <TabsTrigger value="ai-agent" className="flex items-center gap-2 transition-all duration-300 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50">
              <Bot className="h-4 w-4" />
              AI Agent
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-bounce-in animate-stagger-1 hover-glow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Users</p>
                      <p className="text-3xl font-bold animate-glow">{analytics?.overview.totalUsers.toLocaleString() || '0'}</p>
                      <p className="text-blue-100 text-sm">+{analytics?.overview.newUsersToday || 0} today</p>
                    </div>
                    <div className="relative">
                      <Users className="h-12 w-12 text-blue-200 animate-pulse" />
                      <div className="absolute -inset-2 bg-blue-400/30 rounded-full blur-sm animate-pulse-glow"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-bounce-in animate-stagger-2 hover-glow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Projects</p>
                      <p className="text-3xl font-bold animate-glow">{analytics?.overview.totalProjects.toLocaleString() || '0'}</p>
                      <p className="text-green-100 text-sm">+{analytics?.overview.newProjectsToday || 0} today</p>
                    </div>
                    <div className="relative">
                      <FolderPlus className="h-12 w-12 text-green-200 animate-pulse" />
                      <div className="absolute -inset-2 bg-green-400/30 rounded-full blur-sm animate-pulse-glow"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-bounce-in animate-stagger-3 hover-glow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Comments</p>
                      <p className="text-3xl font-bold animate-glow">{analytics?.overview.totalComments.toLocaleString() || '0'}</p>
                      <p className="text-purple-100 text-sm">Discussions</p>
                    </div>
                    <div className="relative">
                      <MessageSquare className="h-12 w-12 text-purple-200 animate-pulse" />
                      <div className="absolute -inset-2 bg-purple-400/30 rounded-full blur-sm animate-pulse-glow"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 animate-bounce-in animate-stagger-4 hover-glow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Engagement</p>
                      <p className="text-3xl font-bold animate-glow">{analytics?.overview.engagementRate.toFixed(1) || '0'}%</p>
                      <p className="text-orange-100 text-sm">Active rate</p>
                    </div>
                    <div className="relative">
                      <Zap className="h-12 w-12 text-orange-200 animate-pulse" />
                      <div className="absolute -inset-2 bg-orange-400/30 rounded-full blur-sm animate-pulse-glow"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* User Growth Chart */}
              <Card className="shadow-xl border-0 bg-white/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    User Growth Trend
                  </CardTitle>
                  <CardDescription>New users and active users over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analytics?.userGrowth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="users" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="activeUsers" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Project Categories */}
              <Card className="shadow-xl border-0 bg-white/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderPlus className="h-5 w-5 text-green-600" />
                    Project Categories
                  </CardTitle>
                  <CardDescription>Distribution by project type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics?.projectStats || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {(analytics?.projectStats || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="shadow-xl border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  Recent Platform Activity
                </CardTitle>
                <CardDescription>Latest user interactions and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {analytics?.recentActivity?.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                      <div className="flex-shrink-0">
                        {activity.type === 'user' && <Users className="h-5 w-5 text-blue-500" />}
                        {activity.type === 'project' && <FolderPlus className="h-5 w-5 text-green-500" />}
                        {activity.type === 'comment' && <MessageSquare className="h-5 w-5 text-purple-500" />}
                        {activity.type === 'event' && <Calendar className="h-5 w-5 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-sm text-gray-500">{activity.user} • {activity.timestamp}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-center py-8">No recent activity data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* User Management Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Active Users</p>
                      <p className="text-3xl font-bold">{analytics?.overview.activeUsers.toLocaleString() || '0'}</p>
                      <p className="text-emerald-100 text-xs">Currently online</p>
                    </div>
                    <div className="p-3 bg-emerald-400/30 rounded-full">
                      <Users className="h-8 w-8 text-emerald-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-sm font-medium">User Retention</p>
                      <p className="text-3xl font-bold">{((analytics?.overview.activeUsers / analytics?.overview.totalUsers) * 100).toFixed(1) || '0'}%</p>
                      <p className="text-cyan-100 text-xs">7-day retention</p>
                    </div>
                    <div className="p-3 bg-cyan-400/30 rounded-full">
                      <TrendingUp className="h-8 w-8 text-cyan-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-violet-500 to-violet-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm font-medium">New Today</p>
                      <p className="text-3xl font-bold">{analytics?.overview.newUsersToday || '0'}</p>
                      <p className="text-violet-100 text-xs">New registrations</p>
                    </div>
                    <div className="p-3 bg-violet-400/30 rounded-full">
                      <Sparkles className="h-8 w-8 text-violet-100" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Growth and College Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-md hover:shadow-3xl transition-all duration-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    User Growth Trajectory
                  </CardTitle>
                  <CardDescription>Daily active users and cumulative registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={analytics?.userGrowth || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: 'none', 
                          borderRadius: '12px', 
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        dot={{ fill: '#6366f1', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 8, stroke: '#6366f1', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="activeUsers" 
                        stroke="#8b5cf6" 
                        strokeWidth={3}
                        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 8, stroke: '#8b5cf6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-md hover:shadow-3xl transition-all duration-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    College Distribution
                  </CardTitle>
                  <CardDescription>User distribution across CMU colleges</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics?.collegeDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="college" 
                        stroke="#64748b" 
                        fontSize={10} 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: 'none', 
                          borderRadius: '12px', 
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
                        }} 
                      />
                      <Bar 
                        dataKey="count" 
                        fill="url(#collegeGradient)"
                        radius={[4, 4, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="collegeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            {/* Project Management Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-sm font-medium">Total Projects</p>
                      <p className="text-3xl font-bold">{analytics?.overview.totalProjects.toLocaleString() || '0'}</p>
                    </div>
                    <FolderPlus className="h-10 w-10 text-indigo-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm font-medium">Featured</p>
                      <p className="text-3xl font-bold">{analytics?.projectStats?.reduce((sum, cat) => sum + cat.count, 0) || '0'}</p>
                    </div>
                    <Crown className="h-10 w-10 text-amber-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-rose-500 to-rose-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm font-medium">Total Views</p>
                      <p className="text-3xl font-bold">{analytics?.topProjects?.reduce((sum, proj) => sum + proj.views, 0).toLocaleString() || '0'}</p>
                    </div>
                    <Eye className="h-10 w-10 text-rose-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-teal-100 text-sm font-medium">New Today</p>
                      <p className="text-3xl font-bold">{analytics?.overview.newProjectsToday || '0'}</p>
                    </div>
                    <Plus className="h-10 w-10 text-teal-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Categories and Top Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-md hover:shadow-3xl transition-all duration-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    Project Categories Distribution
                  </CardTitle>
                  <CardDescription>Popular project types and their frequency</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={analytics?.projectStats || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {(analytics?.projectStats || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-md hover:shadow-3xl transition-all duration-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    Top Performing Projects
                  </CardTitle>
                  <CardDescription>Most viewed and liked projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.topProjects?.map((project, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-300">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 truncate max-w-xs">{project.title}</p>
                            <p className="text-sm text-gray-600">by {project.owner}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center text-gray-600">
                            <Eye className="h-4 w-4 mr-1" />
                            {project.views.toLocaleString()}
                          </div>
                          <div className="flex items-center text-red-500">
                            <Heart className="h-4 w-4 mr-1" />
                            {project.likes}
                          </div>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500 text-center py-8">No project data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            {/* Engagement Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-pink-100 text-sm font-medium">Total Comments</p>
                      <p className="text-3xl font-bold">{analytics?.overview.totalComments.toLocaleString() || '0'}</p>
                      <p className="text-pink-100 text-xs">Community discussions</p>
                    </div>
                    <MessageSquare className="h-10 w-10 text-pink-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Engagement Rate</p>
                      <p className="text-3xl font-bold">{analytics?.overview.engagementRate.toFixed(1) || '0'}%</p>
                      <p className="text-emerald-100 text-xs">User participation</p>
                    </div>
                    <Zap className="h-10 w-10 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Shares</p>
                      <p className="text-3xl font-bold">{analytics?.engagementData?.reduce((sum, data) => sum + data.shares, 0) || '0'}</p>
                      <p className="text-blue-100 text-xs">Content sharing</p>
                    </div>
                    <Share2 className="h-10 w-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Engagement Trends */}
            <Card className="shadow-2xl border-0 bg-white/70 backdrop-blur-md hover:shadow-3xl transition-all duration-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  Community Engagement Trends
                </CardTitle>
                <CardDescription>Monthly engagement metrics showing community activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analytics?.engagementData || []}>
                    <defs>
                      <linearGradient id="commentsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="likesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="sharesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="comments" 
                      stackId="1" 
                      stroke="#8b5cf6" 
                      fill="url(#commentsGradient)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="likes" 
                      stackId="1" 
                      stroke="#06b6d4" 
                      fill="url(#likesGradient)" 
                      strokeWidth={2}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="shares" 
                      stackId="1" 
                      stroke="#10b981" 
                      fill="url(#sharesGradient)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Agent Tab */}
          <TabsContent value="ai-agent">
            <Card className="shadow-xl border-0 bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  ShipIts AI Analytics Agent
                  <Sparkles className="h-5 w-5 text-purple-500" />
                </CardTitle>
                <CardDescription>
                  Ask questions about your platform data, user behavior, trends, and get AI-powered insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col h-[600px]">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-white/50 rounded-lg">
                    {aiMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.type === 'user' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-white border shadow-sm'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.type === 'user' ? 'text-indigo-100' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white border shadow-sm px-4 py-2 rounded-lg">
                          <div className="flex space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Ask about user trends, project analytics, engagement metrics..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !aiQueryMutation.isPending && handleAiQuery()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleAiQuery} 
                      disabled={!aiInput.trim() || aiQueryMutation.isPending}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quick Questions */}
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Quick Questions:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "What are the most popular project categories?",
                        "How is user engagement trending?",
                        "Which projects have the highest activity?",
                        "What's the user retention rate?",
                        "Show me today's key metrics"
                      ].map((question) => (
                        <Button
                          key={question}
                          variant="outline"
                          size="sm"
                          onClick={() => setAiInput(question)}
                          className="text-xs"
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}