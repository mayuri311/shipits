import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, Filter, ChevronDown, Heart, MessageSquare, Share2, Bookmark, Plus, LogOut, Trash2, Crown, BarChart3, Menu, X, Users, UserCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { projectsApi, categoriesApi, tagsApi, feedApi } from "@/lib/api";
import type { Project, User } from "@shared/schema";
import { AuthModal } from "@/components/AuthModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import NotificationBell from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { YouTubeEmbed, extractYouTubeVideoId, isValidYouTubeUrl } from "@/components/YouTubeEmbed";
import TranslatedText from "@/components/TranslatedText";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";
import { truncateMarkdown } from "@/lib/markdownUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";

const sortOptions = ["Featured", "Most Recent", "Most Viewed", "Trending"];

export default function Forum() {
  const { t } = useI18n();
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showFollowingFeed, setShowFollowingFeed] = useState(false);
  
  // Format date helper
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [alternates, setAlternates] = useState<string[]>([]);
  const [acOpen, setAcOpen] = useState(false);
  const [acItems, setAcItems] = useState<{ projects: any[]; tags: any[]; users: any[] }>({ projects: [], tags: [], users: [] });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("Most Recent");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    projectId: string;
    projectTitle: string;
  }>({
    isOpen: false,
    projectId: "",
    projectTitle: "",
  });

  const getSortField = (sort: string) => {
    switch (sort) {
      case "Most Recent": return "createdAt";
      case "Most Viewed": return "analytics.views";
      case "Trending": return "analytics.views";
      case "Featured": return "featured";
      default: return "createdAt";
    }
  };

  const getSortOrder = (sort: string): 'asc' | 'desc' => {
    return sort === "Featured" ? "desc" : "desc";
  };

  // Combine category and selected tags for filtering
  const allFilterTags = [
    ...(selectedCategory !== "All" ? [selectedCategory.toLowerCase()] : []),
    ...selectedTags
  ];

  const params = {
    search: searchTerm || undefined,
    tags: allFilterTags.length > 0 ? allFilterTags : undefined,
    featured: sortBy === "Featured" ? true : undefined,
    sortBy: searchTerm ? 'relevance' : getSortField(sortBy),
    sortOrder: getSortOrder(sortBy),
    limit: 20,
  };

  // Handler for tag clicks
  const handleTagClick = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    if (selectedTags.includes(lowerTag)) {
      setSelectedTags(prev => prev.filter(t => t !== lowerTag));
    } else {
      setSelectedTags(prev => [...prev, lowerTag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedCategory("All");
    setSearchTerm("");
  };

  // Fetch projects
  const { data: projectsData, error, isLoading, isFetching } = useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.getProjects(params),
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  // Fetch popular tags
  const { data: popularTagsData } = useQuery({
    queryKey: ['popular-tags'],
    queryFn: () => tagsApi.getPopularTags(15),
  });

  const categories = ["All", ...(categoriesData?.success ? categoriesData.data.categories.map((cat: any) => cat.name) : [])];
  const popularTags = popularTagsData?.success ? popularTagsData.data.tags : [];

  const projects = projectsData?.success ? projectsData.data.items : [];
  const initialLoading = isLoading && !projectsData;

  // Trending and Recommended
  const { data: trendingData } = useQuery({
    queryKey: ['projects', 'trending'],
    queryFn: () => projectsApi.getTrendingProjects(),
  });
  const { data: recommendedData } = useQuery({
    queryKey: ['projects', 'recommended'],
    queryFn: () => projectsApi.getRecommendedProjects(8),
    enabled: !!isAuthenticated,
  });
  // Autocomplete and did-you-mean effects
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        if (!searchTerm) {
          setAcItems({ projects: [], tags: [], users: [] });
          setSuggestion(null);
          setAlternates([]);
          setAcOpen(false);
          return;
        }
        const [ac, dym] = await Promise.all([
          projectsApi.autocomplete(searchTerm, 8),
          projectsApi.didYouMean(searchTerm),
        ]);
        if (ac.success && ac.data) setAcItems(ac.data);
        if (dym.success && dym.data) {
          setSuggestion(dym.data.didYouMean || null);
          setAlternates(dym.data.alternates || []);
        }
      } catch (e) {
        // ignore
      }
    }, 200);
    return () => clearTimeout(id);
  }, [searchTerm]);


  // Check if user has any followed users
  const { data: followingData } = useQuery({
    queryKey: ['user-following', user?._id],
    queryFn: () => usersApi.getFollowing(user!._id),
    enabled: !!isAuthenticated && !!user,
  });

  // Personalized feed for followed users
  const { data: feedData, isFetching: isFeedFetching } = useQuery({
    queryKey: ['feed', { page: 1, limit: 20 }],
    queryFn: () => feedApi.getPersonalizedFeed({ page: 1, limit: 20 }),
    enabled: !!isAuthenticated && showFollowingFeed,
  });
  const displayProjects = (showFollowingFeed && feedData?.success) ? (feedData.data.items as Project[]) : projects;

  // Check if following feed is empty
  const hasFollowing = followingData?.success && followingData.data.users && followingData.data.users.length > 0;
  const isFollowingFeedEmpty = showFollowingFeed && hasFollowing && feedData?.success && (!feedData.data.items || feedData.data.items.length === 0);
  const isFollowingFeedDisabled = !hasFollowing;

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.adminDeleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Project Deleted",
        description: "The project has been successfully deleted.",
      });
      setDeleteConfirm({ isOpen: false, projectId: "", projectTitle: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProject = (project: Project) => {
    setDeleteConfirm({
      isOpen: true,
      projectId: project._id,
      projectTitle: project.title,
    });
  };

  const confirmDelete = () => {
    deleteProjectMutation.mutate(deleteConfirm.projectId);
  };



  const getProjectImageUrl = (project: Project) => {
    if (project.media && project.media.length > 0) {
      const media = project.media[0];
      // Use Base64 data if available, otherwise fall back to URL
      return media.data || media.url || "/api/placeholder/400/250";
    }
    return "/api/placeholder/400/250";
  };

  const handleProjectLike = async (projectId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to like projects.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the toggle endpoint (POST) which handles both like and unlike
      const response = await projectsApi.likeProject(projectId);

      if (response.success) {
        // Refetch projects to update the UI
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        
        toast({
          title: response.data.isLiked ? "❤️ Liked" : "💔 Unliked",
          description: response.data.isLiked 
            ? "Added your like to this project!"
            : "Removed your like from this project.",
        });
      } else {
        throw new Error(response.error || 'Failed to update like');
      }
    } catch (err) {
      console.error('Error updating project like:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to update like: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-maroon mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, projectId: "", projectTitle: "" })}
        onConfirm={confirmDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteConfirm.projectTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            {/* Left side - Navigation */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <Link href="/" className="text-foreground hover:text-maroon transition-colors duration-300 font-medium tracking-wide text-sm sm:text-base">
                <TranslatedText
                  sourceType="ui"
                  sourceId="forum-nav-home"
                  field="label"
                  text={t('homeNav', 'HOME')}
                  as="span"
                />
              </Link>
              <span className="text-maroon font-medium tracking-wide text-sm sm:text-base">
                <TranslatedText
                  sourceType="ui"
                  sourceId="forum-nav-forum"
                  field="label"
                  text={t('forumNav', 'FORUM')}
                  as="span"
                />
              </span>
              <Link href="/lists">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2 font-medium">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <TranslatedText
                    sourceType="ui"
                    sourceId="forum-nav-lists"
                    field="label"
                    text={t('listsNav', 'LISTS')}
                    as="span"
                  />
                </Button>
              </Link>
              <Link href="/#contact" className="text-foreground hover:text-maroon transition-colors duration-300 font-medium tracking-wide text-sm sm:text-base hidden sm:inline">
                <TranslatedText
                  sourceType="ui"
                  sourceId="forum-nav-contact"
                  field="label"
                  text={t('contactNav', 'CONTACT')}
                  as="span"
                />
              </Link>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              {isAuthenticated ? (
                <>
                  <NotificationBell />
                  <span className="text-xs text-muted-foreground hidden lg:inline mr-2">
                    {user?.fullName || user?.username}
                  </span>
                  
                  {/* Desktop: Show all options */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Link href="/chat">
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-nav-chat"
                          field="label"
                          text={t('chatNav', 'Chat')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    <Link href="/create-project">
                      <Button className="bg-maroon hover:bg-maroon/90 text-white" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-nav-create-project"
                          field="label"
                          text={t('createProjectNav', 'Create Project')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="outline" size="sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-nav-dashboard"
                          field="label"
                          text={t('dashboardNav', 'Dashboard')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    <Link href="/profile">
                      <Button variant="outline" size="sm">
                        <UserCircle className="w-4 h-4 mr-2" />
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-nav-profile"
                          field="label"
                          text={t('profileNav', 'Profile')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin">
                        <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                          <Crown className="w-4 h-4 mr-2" />
                          <TranslatedText
                            sourceType="ui"
                            sourceId="forum-nav-admin"
                            field="label"
                            text={t('adminNav', 'Admin')}
                            as="span"
                          />
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" size="sm" onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <LogOut className="w-4 h-4 mr-2" />
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-nav-logout"
                        field="label"
                        text={t('logoutNav', 'Logout')}
                        as="span"
                      />
                    </Button>
                  </div>

                  {/* Mobile/Tablet: Compact view with expandable menu */}
                  <div className="flex lg:hidden items-center gap-1">
                    <Link href="/chat">
                      <Button variant="outline" size="sm" className="text-xs px-2" aria-label="Go to chat">
                        <MessageSquare className="w-3 h-3" aria-hidden="true" />
                      </Button>
                    </Link>
                    <Link href="/create-project">
                      <Button className="bg-maroon hover:bg-maroon/90 text-white text-xs px-2 py-1" size="sm">
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">
                          <TranslatedText
                            sourceType="ui"
                            sourceId="forum-mobile-create"
                            field="label"
                            text={t('createProject', 'Create Project')}
                            as="span"
                          />
                        </span>
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="px-2 text-xs relative"
                      aria-label={isMenuOpen ? "Close user menu" : "Open user menu"}
                      aria-expanded={isMenuOpen}
                    >
                      {isMenuOpen ? <X className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
                      {!isMenuOpen && <span className="absolute -top-1 -right-1 w-2 h-2 bg-maroon rounded-full"></span>}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Desktop: Show all options */}
                  <div className="hidden md:flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)}>
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-login-cmu"
                        field="label"
                        text={t('loginWithCMU', 'Log in with CMU')}
                        as="span"
                      />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)}>
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-demo-login"
                        field="label"
                        text={t('demoLogin', 'Demo Login')}
                        as="span"
                      />
                    </Button>
                  </div>

                  {/* Mobile/Tablet: Compact view */}
                  <div className="flex md:hidden items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)} className="text-xs px-2">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-mobile-login"
                        field="label"
                        text={t('login', 'Login')}
                        as="span"
                      />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="px-2 text-xs relative"
                    >
                      {isMenuOpen ? <X className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
                      {!isMenuOpen && <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Expandable Menu for Mobile/Tablet only */}
          {isMenuOpen && (
            <div className="border-t border-border mt-2 pt-3 pb-2 lg:hidden">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {isAuthenticated ? (
                  <>
                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                        <BarChart3 className="w-3 h-3 mr-2" />
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-menu-dashboard"
                          field="label"
                          text={t('dashboardNav', 'Dashboard')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    <Link href="/lists" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full justify-start text-xs bg-blue-600 hover:bg-blue-700 text-white">
                        <MessageSquare className="w-3 h-3 mr-2" />
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-menu-lists"
                          field="label"
                          text={t('listsNav', 'Lists')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                        <UserCircle className="w-3 h-3 mr-2" />
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-menu-profile"
                          field="label"
                          text={t('profileNav', 'Profile')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    <Link href="/#contact" onClick={() => setIsMenuOpen(false)} className="sm:hidden">
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-menu-contact"
                          field="label"
                          text={t('contactNav', 'Contact')}
                          as="span"
                        />
                      </Button>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                          <Crown className="w-3 h-3 mr-2" />
                          <TranslatedText
                            sourceType="ui"
                            sourceId="forum-menu-admin"
                            field="label"
                            text={t('adminNav', 'Admin')}
                            as="span"
                          />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => { logout(); setIsMenuOpen(false); }}
                    >
                      <LogOut className="w-3 h-3 mr-2" />
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-menu-logout"
                        field="label"
                        text={t('logoutNav', 'Logout')}
                        as="span"
                      />
                    </Button>
                    <div className="col-span-2 sm:col-span-3 text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                      👋 {user?.fullName || user?.username}
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/#contact" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                        Contact
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setIsAuthModalOpen(true); setIsMenuOpen(false); }}>
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-menu-demo-login"
                        field="label"
                        text={t('demoLogin', 'Demo Login')}
                        as="span"
                      />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-2 sm:px-4 md:px-6">
          <div className="text-center mb-8 px-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              <TranslatedText
                sourceType="ui"
                sourceId="forum-hero-title"
                field="title"
                text={t('shipItsForum', 'ShipIts Forum')}
                as="span"
              />
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              <TranslatedText
                sourceType="ui"
                sourceId="forum-hero-description"
                field="description"
                text={t('discoverSupportProjects', 'Discover and support innovative projects from the Carnegie Mellon community. Share your creations, get feedback, and collaborate with fellow students.')}
                as="span"
              />
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-4 mb-8 border border-border">
            <div className="space-y-4">
              {/* Search Bar - Full Width */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder={t('searchProjectsTags', 'Search projects and tags...')}
                  value={searchTerm}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchTerm(v);
                    setAcOpen(!!v);
                  }}
                  className="pl-10"
                />
                {acOpen && searchTerm && (
                  <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded shadow-lg">
                    <div className="p-2 text-xs text-muted-foreground">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-suggestions"
                        field="label"
                        text={t('suggestions', 'Suggestions')}
                        as="span"
                      />
                    </div>
                    <div className="max-h-72 overflow-auto">
                      {acItems.tags?.length > 0 && (
                        <div className="p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            <TranslatedText
                              sourceType="ui"
                              sourceId="forum-autocomplete-tags"
                              field="label"
                              text={t('popularTags', 'Popular Tags')}
                              as="span"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {acItems.tags.slice(0,8).map((t:any) => (
                              <button key={t.tag} className="text-sm px-2 py-1 bg-muted rounded hover:bg-accent" onClick={() => { handleTagClick(t.tag); setAcOpen(false); }}>
                                #{t.tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {acItems.projects?.length > 0 && (
                        <div className="p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            <TranslatedText
                              sourceType="ui"
                              sourceId="forum-autocomplete-projects"
                              field="label"
                              text={t('projects', 'Projects')}
                              as="span"
                            />
                          </div>
                          <ul>
                            {acItems.projects.slice(0,5).map((p:any) => (
                              <li key={p._id} className="py-1">
                                <a href={`/project/${p._id}`} className="text-sm text-primary hover:underline" onClick={() => setAcOpen(false)}>{p.title}</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {acItems.users?.length > 0 && (
                        <div className="p-2">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            <TranslatedText
                              sourceType="ui"
                              sourceId="forum-autocomplete-users"
                              field="label"
                              text={t('users', 'Users')}
                              as="span"
                            />
                          </div>
                          <ul>
                            {acItems.users.slice(0,5).map((u:any) => (
                              <li key={u._id} className="py-1 text-sm text-foreground">{u.fullName || u.username}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {acItems.tags?.length === 0 && acItems.projects?.length === 0 && acItems.users?.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground">
                          <TranslatedText
                            sourceType="ui"
                            sourceId="forum-no-suggestions"
                            field="label"
                            text={t('noSuggestions', 'No suggestions')}
                            as="span"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {suggestion && (
                <div className="text-sm text-muted-foreground">
                  <TranslatedText
                    sourceType="ui"
                    sourceId="forum-did-you-mean"
                    field="label"
                    text={t('didYouMean', 'Did you mean')}
                    as="span"
                  />{' '}
                  <button className="text-primary hover:underline" onClick={() => setSearchTerm(suggestion!)}>{suggestion}</button>?
                  {alternates.length>0 && alternates.map((a,idx)=> (
                    <button key={idx} className="ml-2 text-primary hover:underline" onClick={() => setSearchTerm(a)}>{a}</button>
                  ))}
                </div>
              )}

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                {isAuthenticated && (
                  <div className="relative group">
                    <Button
                      variant={showFollowingFeed ? 'default' : 'outline'}
                      onClick={() => {
                        if (isFollowingFeedDisabled) {
                          // Don't allow switching if no followed users
                          return;
                        }
                        setShowFollowingFeed(!showFollowingFeed);
                      }}
                      disabled={isFollowingFeedDisabled}
                      className={`${showFollowingFeed ? 'bg-maroon hover:bg-maroon/90 text-white' : ''} ${isFollowingFeedDisabled ? 'opacity-60' : ''}`}
                      title={isFollowingFeedDisabled ? t('noFollowingUsers', 'You haven\'t followed any users yet') : undefined}
                    >
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-feed-toggle"
                        field="label"
                        text={showFollowingFeed ? t('followingFeed', 'Following Feed') : t('allProjects', 'All Projects')}
                        as="span"
                      />
                      {isFollowingFeedDisabled && (
                        <span className="ml-1 text-xs opacity-70">🔒</span>
                      )}
                    </Button>
                    {isFollowingFeedDisabled && (
                      <div className="absolute -top-8 left-0 right-0 text-xs text-muted-foreground text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-follow-users-hint"
                          field="label"
                          text={t('followUsersHint', 'Follow users to enable')}
                          as="span"
                        />
                      </div>
                    )}
                  </div>
                )}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder={t('category', 'Category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder={t('sortBy', 'Sort by')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => {
                      let translatedOption = option;
                      switch (option) {
                        case 'Featured':
                          translatedOption = t('featured', 'Featured');
                          break;
                        case 'Most Recent':
                          translatedOption = t('mostRecent', 'Most Recent');
                          break;
                        case 'Most Viewed':
                          translatedOption = t('mostViewed', 'Most Viewed');
                          break;
                        case 'Trending':
                          translatedOption = t('trending', 'Trending');
                          break;
                      }
                      return (
                        <SelectItem key={option} value={option}>
                          {translatedOption}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters */}
              {(selectedTags.length > 0 || selectedCategory !== "All" || searchTerm) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    <TranslatedText
                      sourceType="ui"
                      sourceId="forum-active-filters"
                      field="label"
                      text={t('activeFilters', 'Active filters')}
                      as="span"
                    />:
                  </span>
                  {selectedTags.map((tag) => (
                    <button
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs cursor-pointer hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag filter: ${tag}`}
                      title={`Remove tag filter: ${tag}`}
                    >
                      #{tag}
                      <span className="ml-1 hover:text-primary/80" aria-hidden="true">×</span>
                    </button>
                  ))}
                  {selectedCategory !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                      Category: {selectedCategory}
                    </span>
                  )}
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                      Search: {searchTerm}
                    </span>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-muted-foreground hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded px-1 py-1"
                    aria-label={t('clearAll', 'Clear all')}
                    title={t('clearAll', 'Clear all')}
                  >
                    <TranslatedText
                      sourceType="ui"
                      sourceId="forum-clear-all"
                      field="label"
                      text={t('clearAll', 'Clear all')}
                      as="span"
                    />
                  </button>
                </div>
              )}

              {/* Popular Tags */}
              {popularTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    <TranslatedText
                      sourceType="ui"
                      sourceId="forum-popular-tags"
                      field="label"
                      text={t('popularTags', 'Popular tags')}
                      as="span"
                    />:
                  </span>
                  {popularTags.slice(0, 10).map((tagData: any) => (
                    <button
                      key={tagData.tag}
                      onClick={() => handleTagClick(tagData.tag)}
                      className={`px-2 py-1 rounded-full text-xs transition-colors ${
                        selectedTags.includes(tagData.tag.toLowerCase())
                          ? 'bg-primary/10 text-primary hover:bg-primary/20'
                          : 'bg-muted text-muted-foreground hover:bg-accent border border-border'
                      }`}
                    >
                      #{tagData.tag} ({tagData.count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isAuthenticated && recommendedData?.success && recommendedData.data.projects.length > 0 && (
            <div className="bg-card rounded-lg shadow-sm p-4 mb-8 border border-border">
              <h2 className="text-lg font-semibold mb-3 text-foreground">Recommended for you</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedData.data.projects.map((p: Project) => (
                  <Link key={p._id} href={`/forum/project/${p._id}`} className="border border-border rounded-lg p-3 hover:shadow">
                    <div className="font-medium mb-1 text-foreground">{p.title}</div>
                    <div className="text-xs text-muted-foreground mb-2">by {typeof p.ownerId === 'object' ? (p.ownerId.fullName || p.ownerId.username) : ''}</div>
                    <div className="text-xs text-muted-foreground">{p.tags?.slice(0,3).map(t=>`#${t}`).join(' ')}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {trendingData?.success && trendingData.data.projects.length > 0 && (
            <div className="bg-card rounded-lg shadow-sm p-4 mb-8 border border-border">
              <h2 className="text-lg font-semibold mb-3 text-foreground">Trending projects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingData.data.projects.slice(0, 3).map((p: Project) => (
                  <Link key={p._id} href={`/forum/project/${p._id}`} className="border border-border rounded-lg p-3 hover:shadow">
                    <div className="font-medium mb-1 text-foreground">{p.title}</div>
                    <div className="text-xs text-muted-foreground mb-2">by {typeof p.ownerId === 'object' ? (p.ownerId.fullName || p.ownerId.username) : ''}</div>
                    <div className="text-xs text-muted-foreground">{p.tags?.slice(0,3).map(t=>`#${t}`).join(' ')}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-8">
              <p className="text-destructive">Error: {(error as Error).message}</p>
            </div>
          )}

          {(isFetching || (showFollowingFeed && isFeedFetching)) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg shadow-sm animate-pulse border border-border">
                  <div className="h-48 bg-muted rounded-t-lg"></div>
                  <div className="p-6">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayProjects.length === 0 ? (
            <div className="text-center py-12">
              {showFollowingFeed ? (
                isFollowingFeedDisabled ? (
                  <>
                    <p className="text-muted-foreground text-lg mb-4">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-no-following"
                        field="title"
                        text={t('noFollowingUsersTitle', 'No Users Followed Yet')}
                        as="span"
                      />
                    </p>
                    <p className="text-muted-foreground/70 mb-4">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-no-following-desc"
                        field="description"
                        text={t('noFollowingUsersDesc', 'You haven\'t followed any users yet. Follow users to see their projects in your Following Feed!')}
                        as="span"
                      />
                    </p>
                    <Link href="/profile">
                      <Button className="bg-maroon hover:bg-maroon/90">
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-browse-users"
                          field="label"
                          text={t('browseUsers', 'Browse Users')}
                          as="span"
                        />
                      </Button>
                    </Link>
                  </>
                ) : isFollowingFeedEmpty ? (
                  <>
                    <p className="text-muted-foreground text-lg mb-4">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-empty-following"
                        field="title"
                        text={t('emptyFollowingFeedTitle', 'No Recent Projects from Followed Users')}
                        as="span"
                      />
                    </p>
                    <p className="text-muted-foreground/70 mb-4">
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-empty-following-desc"
                        field="description"
                        text={t('emptyFollowingFeedDesc', 'Users you follow haven\'t posted any projects recently. Check back later or explore all projects!')}
                        as="span"
                      />
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowFollowingFeed(false)}
                      className="mr-2"
                    >
                      <TranslatedText
                        sourceType="ui"
                        sourceId="forum-view-all"
                        field="label"
                        text={t('viewAllProjects', 'View All Projects')}
                        as="span"
                      />
                    </Button>
                  </>
                ) : null
              ) : (
                <>
                  <p className="text-muted-foreground text-lg mb-4">
                    <TranslatedText
                      sourceType="ui"
                      sourceId="forum-no-projects"
                      field="title"
                      text={t('noProjectsFound', 'No projects found')}
                      as="span"
                    />
                  </p>
                  <p className="text-muted-foreground/70 mb-4">
                    <TranslatedText
                      sourceType="ui"
                      sourceId="forum-no-projects-desc"
                      field="description"
                      text={t('tryAdjustingSearch', 'Try adjusting your search criteria or create a new project!')}
                      as="span"
                    />
                  </p>
                  {isAuthenticated && (
                    <Link href="/create-project">
                      <Button className="bg-maroon hover:bg-maroon/90">
                        <TranslatedText
                          sourceType="ui"
                          sourceId="forum-create-project"
                          field="label"
                          text={t('createProject', 'Create Your First Project')}
                          as="span"
                        />
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          ) : (
            <section aria-label="Projects gallery">
              <h2 className="sr-only">Browse Projects</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" role="list">
                {displayProjects.map((project) => {
                  // Find the first video media, if any
                  const firstVideo = project.media?.find((media) => media.type === 'video');
                  return (
                    <li key={project._id} className="bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 relative flex flex-col h-full border border-border">
                    {user?.role === 'admin' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 z-10 h-8 w-8 p-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteProject(project);
                        }}
                        aria-label={`Delete project: ${project.title}`}
                        title={`Delete project: ${project.title}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    )}
                    <Link href={`/forum/project/${project._id}`}>
                      <div className="relative w-full">
                        {firstVideo ? (
                          firstVideo.url && isValidYouTubeUrl(firstVideo.url) ? (
                            <YouTubeEmbed
                              videoId={extractYouTubeVideoId(firstVideo.url)!}
                              title={firstVideo.caption || 'Project Video'}
                              width={400}
                              height={225}
                              showTitle={false}
                            />
                          ) : (
                            <video
                              src={firstVideo.data || firstVideo.url}
                              controls
                              className="w-full h-40 sm:h-48 object-cover rounded-lg"
                              poster={(firstVideo.data || firstVideo.url) + '#t=0.1'}
                            />
                          )
                        ) : (
                          <img
                            src={getProjectImageUrl(project)}
                            alt={`${project.title} - Project thumbnail`}
                            className="w-full h-40 sm:h-48 object-cover rounded-t-lg"
                          />
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2 line-clamp-2">
                          <TranslatedText
                            sourceType="project"
                            sourceId={project._id}
                            field="title"
                            text={project.title}
                            as="span"
                          />
                        </h3>
                        <div className="text-muted-foreground text-xs sm:text-sm mb-4 line-clamp-3">
                          <TranslatedMarkdown
                            sourceType="project"
                            sourceId={project._id}
                            field="description"
                            text={truncateMarkdown(project.description)}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-muted-foreground mb-3 gap-1 sm:gap-0">
                          <span>By {project.ownerId?.fullName || project.ownerId?.username}</span>
                          <span>{formatDate(project.createdAt)}</span>
                        </div>

                        {/* Collaboration Indicators */}
                        {project.collaborators && project.collaborators.length > 0 && (
                          <div className="mb-3">
                            {/* Collaborative Project Badge */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 w-fit">
                                <Users className="w-3 h-3" />
                                Collaborative
                              </span>
                              <span className="text-xs text-muted-foreground">
                                +{project.collaborators.length} collaborator{project.collaborators.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Collaborator Avatars - Mobile Optimized */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground hidden sm:inline">Team:</span>
                              <span className="text-xs text-muted-foreground sm:hidden">👥</span>
                              <div className="flex items-center -space-x-1">
                                {/* Owner Avatar */}
                                <Avatar className="w-6 h-6 sm:w-5 sm:h-5 border-2 border-white shadow-sm">
                                  <AvatarImage 
                                    src={project.ownerId?.profileImage} 
                                    alt={project.ownerId?.fullName || project.ownerId?.username}
                                  />
                                  <AvatarFallback className="text-xs bg-maroon text-white">
                                    {(project.ownerId?.fullName || project.ownerId?.username)?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                
                                {/* Collaborator Avatars (up to 3 on mobile, 4 on desktop) */}
                                {project.collaborators.slice(0, isMobile ? 3 : 4).map((collaborator: User) => (
                                  <Avatar key={collaborator._id} className="w-6 h-6 sm:w-5 sm:h-5 border-2 border-white shadow-sm">
                                    <AvatarImage 
                                      src={collaborator.profileImage} 
                                      alt={collaborator.fullName || collaborator.username}
                                    />
                                    <AvatarFallback className="text-xs bg-blue-500 text-white">
                                      {(collaborator.fullName || collaborator.username)?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                                
                                {/* Overflow Indicator */}
                                {project.collaborators.length > (isMobile ? 3 : 4) && (
                                  <div className="w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-gray-200 border-2 border-white shadow-sm flex items-center justify-center">
                                    <span className="text-xs text-gray-600">
                                      +{project.collaborators.length - (isMobile ? 3 : 4)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {project.tags.map((tag) => (
                              <button
                                key={tag}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleTagClick(tag);
                                }}
                                className={`px-2 py-1 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                                  selectedTags.includes(tag.toLowerCase())
                                    ? 'bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-primary'
                                    : 'bg-muted text-muted-foreground hover:bg-accent focus-visible:ring-ring'
                                }`}
                                aria-label={`${selectedTags.includes(tag.toLowerCase()) ? 'Remove' : 'Add'} tag filter: ${tag}`}
                                title={`${selectedTags.includes(tag.toLowerCase()) ? 'Remove' : 'Add'} tag filter: ${tag}`}
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Project Statistics */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <span>{project.analytics?.totalLikes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{project.analytics?.totalComments || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{project.analytics?.views || 0}</span>
                          </div>
                          {project.collaborators && project.collaborators.length > 0 && (
                            <div className="flex items-center gap-1 text-muted-foreground" title={`${project.collaborators.length + 1} team members (including owner)`}>
                              <Users className="w-4 h-4" />
                              <span>{project.collaborators.length + 1}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
