import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  Filter,
  TrendingUp,
  Users,
  Eye,
  List as ListIcon,
  Star,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Briefcase,
  Lightbulb,
  Code,
  Heart,
  Zap,
  LogIn,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useI18n } from '@/contexts/I18nContext';
import TranslatedText from '@/components/TranslatedText';

interface ListData {
  _id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  createdBy: {
    _id: string;
    username: string;
    fullName: string;
    profileImage?: string;
  };
  isPublic: boolean;
  featured: boolean;
  analytics: {
    views: number;
    totalItems: number;
    totalContributors: number;
    lastActivity: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ListsResponse {
  lists: ListData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const categoryIcons: Record<string, any> = {
  'funding': Briefcase,
  'venture-capital': TrendingUp,
  'resources': BookOpen,
  'tools': Code,
  'learning': Lightbulb,
  'networking': Users,
  'jobs': Briefcase,
  'startups': Zap,
  'research': BookOpen,
  'events': Star,
  'books': BookOpen,
  'articles': BookOpen,
  'videos': BookOpen,
  'courses': BookOpen,
  'communities': Users,
  'software': Code,
  'hardware': Code,
  'design': Heart,
  'marketing': TrendingUp,
  'other': ListIcon
};

// Theme-aware category colors that adapt to light/dark mode
const getCategoryColors = (category: string): string => {
  const baseColors: Record<string, { light: string; dark: string }> = {
    'funding': {
      light: 'bg-green-100 text-green-800 border-green-200',
      dark: 'bg-green-900/20 text-green-300 border-green-800'
    },
    'venture-capital': {
      light: 'bg-blue-100 text-blue-800 border-blue-200',
      dark: 'bg-blue-900/20 text-blue-300 border-blue-800'
    },
    'resources': {
      light: 'bg-purple-100 text-purple-800 border-purple-200',
      dark: 'bg-purple-900/20 text-purple-300 border-purple-800'
    },
    'tools': {
      light: 'bg-orange-100 text-orange-800 border-orange-200',
      dark: 'bg-orange-900/20 text-orange-300 border-orange-800'
    },
    'learning': {
      light: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      dark: 'bg-yellow-900/20 text-yellow-300 border-yellow-800'
    },
    'networking': {
      light: 'bg-pink-100 text-pink-800 border-pink-200',
      dark: 'bg-pink-900/20 text-pink-300 border-pink-800'
    },
    'jobs': {
      light: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      dark: 'bg-indigo-900/20 text-indigo-300 border-indigo-800'
    },
    'startups': {
      light: 'bg-red-100 text-red-800 border-red-200',
      dark: 'bg-red-900/20 text-red-300 border-red-800'
    },
    'research': {
      light: 'bg-teal-100 text-teal-800 border-teal-200',
      dark: 'bg-teal-900/20 text-teal-300 border-teal-800'
    },
    'events': {
      light: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      dark: 'bg-cyan-900/20 text-cyan-300 border-cyan-800'
    },
    'books': {
      light: 'bg-purple-100 text-purple-800 border-purple-200',
      dark: 'bg-purple-900/20 text-purple-300 border-purple-800'
    },
    'articles': {
      light: 'bg-gray-100 text-gray-800 border-gray-200',
      dark: 'bg-gray-800/50 text-gray-200 border-gray-600'
    },
    'videos': {
      light: 'bg-red-100 text-red-800 border-red-200',
      dark: 'bg-red-900/20 text-red-300 border-red-800'
    },
    'courses': {
      light: 'bg-blue-100 text-blue-800 border-blue-200',
      dark: 'bg-blue-900/20 text-blue-300 border-blue-800'
    },
    'communities': {
      light: 'bg-green-100 text-green-800 border-green-200',
      dark: 'bg-green-900/20 text-green-300 border-green-800'
    },
    'software': {
      light: 'bg-orange-100 text-orange-800 border-orange-200',
      dark: 'bg-orange-900/20 text-orange-300 border-orange-800'
    },
    'hardware': {
      light: 'bg-gray-100 text-gray-800 border-gray-200',
      dark: 'bg-gray-800/50 text-gray-200 border-gray-600'
    },
    'design': {
      light: 'bg-pink-100 text-pink-800 border-pink-200',
      dark: 'bg-pink-900/20 text-pink-300 border-pink-800'
    },
    'marketing': {
      light: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      dark: 'bg-yellow-900/20 text-yellow-300 border-yellow-800'
    },
    'other': {
      light: 'bg-gray-100 text-gray-800 border-gray-200',
      dark: 'bg-gray-800/50 text-gray-200 border-gray-600'
    }
  };

  // Check if we're in dark mode by looking at the document class
  const isDark = document.documentElement.classList.contains('dark');
  return baseColors[category]?.[isDark ? 'dark' : 'light'] || baseColors.other[isDark ? 'dark' : 'light'];
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

export default function Lists() {
  const { t } = useI18n();
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('trending');
  const [page, setPage] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: listsData, isLoading, error } = useQuery<ListsResponse>({
    queryKey: ['lists', { page, search: searchQuery, category: selectedCategory, sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sortBy: sortBy === 'trending' ? 'popular' : sortBy
      });
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const response = await fetch(`/api/lists?${params}`);
      if (!response.ok) throw new Error('Failed to fetch lists');
      
      const result = await response.json();
      return result.data;
    }
  });

  const { data: featuredLists } = useQuery<{ lists: ListData[] }>({
    queryKey: ['featuredLists'],
    queryFn: async () => {
      const response = await fetch('/api/lists/featured');
      if (!response.ok) throw new Error('Failed to fetch featured lists');
      
      const result = await response.json();
      return result.data;
    }
  });

  const { data: categories } = useQuery<{ categories: Array<{ _id: string; count: number }> }>({
    queryKey: ['listCategories'],
    queryFn: async () => {
      const response = await fetch('/api/lists/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const result = await response.json();
      return result.data;
    }
  });

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const ListCard = ({ list }: { list: ListData }) => {
    const IconComponent = categoryIcons[list.category] || ListIcon;
    
      return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card border border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', getCategoryColors(list.category))}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <Badge variant="outline" className={cn('text-xs', getCategoryColors(list.category))}>
                {list.category.replace('-', ' ')}
              </Badge>
              {list.featured && (
                <Badge variant="default" className="ml-2 bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
          </div>
        </div>
          
          <CardTitle className="text-lg font-semibold group-hover:text-blue-600 transition-colors line-clamp-2 text-foreground">
            <Link href={`/lists/${list._id}`} className="block">
              <TranslatedText
                sourceType="list"
                sourceId={list._id}
                field="title"
                text={list.title}
                as="span"
              />
            </Link>
          </CardTitle>

          <CardDescription className="text-sm text-muted-foreground line-clamp-2">
            <TranslatedText
              sourceType="list"
              sourceId={list._id}
              field="description"
              text={list.description}
              as="span"
            />
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1 mb-4">
            {list.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-1">
                {tag}
              </Badge>
            ))}
            {list.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-1">
                +{list.tags.length - 3}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{list.analytics.views}</span>
              </div>
              <div className="flex items-center gap-1">
                <ListIcon className="w-4 h-4" />
                <span>{list.analytics.totalItems}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{list.analytics.totalContributors}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatTimeAgo(list.analytics.lastActivity)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={list.createdBy.profileImage} />
                <AvatarFallback className="text-xs">
                  {list.createdBy.fullName?.[0] || list.createdBy.username[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground">
                {list.createdBy.fullName || list.createdBy.username}
              </span>
            </div>
            
            <Link href={`/lists/${list._id}`}>
              <Button variant="ghost" size="sm" className="group-hover:bg-blue-50 group-hover:text-blue-600">
                View <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-foreground hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide text-sm sm:text-base">
              <TranslatedText
                sourceType="ui"
                sourceId="lists-nav-home"
                field="label"
                text={t('homeNav', 'HOME')}
                as="span"
              />
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2 sm:gap-4 lg:gap-6">
              <Link href="/forum">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 font-medium">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <TranslatedText
                    sourceType="ui"
                    sourceId="lists-nav-forum"
                    field="label"
                    text={t('forumNav', 'FORUM')}
                    as="span"
                  />
                </Button>
              </Link>
              <span className="text-blue-600 font-medium tracking-wide">
                <TranslatedText
                  sourceType="ui"
                  sourceId="lists-nav-lists"
                  field="label"
                  text={t('listsNav', 'LISTS')}
                  as="span"
                />
              </span>
              <Link href="/dashboard" className="text-foreground hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide">
                <TranslatedText
                  sourceType="ui"
                  sourceId="lists-nav-dashboard"
                  field="label"
                  text={t('dashboardNav', 'DASHBOARD')}
                  as="span"
                />
              </Link>
              <Link href="/profile" className="text-foreground hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide">
                <TranslatedText
                  sourceType="ui"
                  sourceId="lists-nav-profile"
                  field="label"
                  text={t('profileNav', 'PROFILE')}
                  as="span"
                />
              </Link>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  <TranslatedText
                    sourceType="ui"
                    sourceId="lists-nav-login"
                    field="label"
                    text={t('loginNav', 'Login')}
                    as="span"
                  />
                </Button>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center gap-2">
                            {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                  className="text-xs px-2"
                >
                  <LogIn className="w-4 h-4" />
                </Button>
              )}
              <Link href="/forum">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <TranslatedText
                    sourceType="ui"
                    sourceId="lists-mobile-nav-forum"
                    field="label"
                    text={t('forumNav', 'FORUM')}
                    as="span"
                  />
                </Button>
              </Link>
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col gap-4 pt-6">
                    <div className="text-blue-600 font-medium tracking-wide px-4">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="lists-menu-title"
                        field="label"
                        text={t('listsNav', 'LISTS')}
                        as="span"
                      />
                    </div>
                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-foreground">
                        <TranslatedText
                          sourceType="ui"
                          sourceId="lists-menu-dashboard"
                          field="label"
                          text={t('dashboardNav', 'DASHBOARD')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-foreground">
                        <TranslatedText
                          sourceType="ui"
                          sourceId="lists-menu-profile"
                          field="label"
                          text={t('profileNav', 'PROFILE')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    {!isAuthenticated && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAuthModal(true);
                          setIsMenuOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        <TranslatedText
                          sourceType="ui"
                          sourceId="lists-menu-login"
                          field="label"
                          text={t('loginNav', 'Login')}
                          as="span"
                        />
                      </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-8 md:mb-12 px-2">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                <TranslatedText
                  sourceType="ui"
                  sourceId="lists-hero-title"
                  field="title"
                  text={t('communityLists', 'Community Lists')}
                  as="span"
                />
              </h1>
            </div>
            <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 md:mb-8 px-4">
              <TranslatedText
                sourceType="ui"
                sourceId="lists-hero-description"
                field="description"
                text={t('discoverResources', 'Discover and contribute to curated collections of resources, tools, and opportunities. From funding sources to learning materials, build knowledge together.')}
                as="span"
              />
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {isAuthenticated ? (
                <Link href="/lists/create">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white w-full sm:w-auto">
                    <Plus className="w-5 h-5 mr-2" />
                    <TranslatedText
                      sourceType="ui"
                      sourceId="lists-create-button"
                      field="label"
                      text={t('createNewList', 'Create New List')}
                      as="span"
                    />
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  onClick={() => setShowAuthModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white w-full sm:w-auto"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  <TranslatedText
                    sourceType="ui"
                    sourceId="lists-login-button"
                    field="label"
                    text={t('loginToCreateLists', 'Login to Create Lists')}
                    as="span"
                  />
                </Button>
              )}
            </div>
          </div>

          {/* Featured Lists */}
          {featuredLists?.lists && featuredLists.lists.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-5 h-5 text-yellow-500" />
                <h2 className="text-2xl font-bold text-foreground">
                  <TranslatedText
                    sourceType="ui"
                    sourceId="lists-featured-title"
                    field="title"
                    text={t('featuredLists', 'Featured Lists')}
                    as="span"
                  />
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featuredLists.lists.slice(0, 4).map((list) => (
                  <ListCard key={list._id} list={list} />
                ))}
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="mb-6 md:mb-8">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative max-w-lg mx-auto md:mx-0">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('searchLists', 'Search lists...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              
              {/* Mobile Filter Toggle */}
              <div className="md:hidden">
                <Button
                  variant="outline"
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  <TranslatedText
                    sourceType="ui"
                    sourceId="lists-filters-button"
                    field="label"
                    text={t('filtersAndSort', 'Filters & Sort')}
                    as="span"
                  />
                </Button>
              </div>
              
              {/* Filters - Always visible on desktop, toggleable on mobile */}
              <div className={cn(
                "flex flex-col gap-4 md:flex-row md:gap-4",
                !showMobileFilters && "hidden md:flex"
              )}>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder={t('categoryFilter', 'Category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="lists-all-categories"
                        field="label"
                        text={t('allCategories', 'All Categories')}
                        as="span"
                      />
                    </SelectItem>
                    {categories?.categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat._id.replace('-', ' ')} ({cat.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder={t('sortByFilter', 'Sort by')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trending">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="lists-sort-trending"
                        field="label"
                        text={t('trending', 'Trending')}
                        as="span"
                      />
                    </SelectItem>
                    <SelectItem value="newest">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="lists-sort-newest"
                        field="label"
                        text={t('newest', 'Newest')}
                        as="span"
                      />
                    </SelectItem>
                    <SelectItem value="popular">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="lists-sort-popular"
                        field="label"
                        text={t('mostPopular', 'Most Popular')}
                        as="span"
                      />
                    </SelectItem>
                    <SelectItem value="items">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="lists-sort-items"
                        field="label"
                        text={t('mostItems', 'Most Items')}
                        as="span"
                      />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lists Grid */}
          <div className="mb-8">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                                <Card key={i} className="animate-pulse bg-card border border-border">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Failed to load lists. Please try again.</p>
              </div>
            ) : listsData?.lists.length === 0 ? (
              <div className="text-center py-12">
                <ListIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground mb-2">No lists found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your search or filters, or create the first list!</p>
                {isAuthenticated && (
                  <Link href="/lists/create">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create New List
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {listsData!.lists.map((list) => (
                  <ListCard key={list._id} list={list} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {listsData && listsData.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <TranslatedText
                  sourceType="ui"
                  sourceId="lists-pagination-previous"
                  field="label"
                  text={t('previous', 'Previous')}
                  as="span"
                />
              </Button>

              <div className="flex items-center gap-2">
                {[...Array(Math.min(5, listsData.pagination.totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                disabled={page === listsData.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <TranslatedText
                  sourceType="ui"
                  sourceId="lists-pagination-next"
                  field="label"
                  text={t('next', 'Next')}
                  as="span"
                />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultTab="login"
      />
    </div>
  );
}
