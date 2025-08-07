import { useState } from "react";
import { Link } from "wouter";
import { Search, Filter, ChevronDown, Heart, MessageSquare, Share2, Bookmark, User, Plus, LogOut, Trash2, Crown, BarChart3, Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { projectsApi, categoriesApi, tagsApi } from "@/lib/api";
import type { Project } from "@shared/schema";
import { AuthModal } from "@/components/AuthModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import NotificationBell from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { YouTubeEmbed, extractYouTubeVideoId, isValidYouTubeUrl } from "@/components/YouTubeEmbed";

const sortOptions = ["Featured", "Most Recent", "Most Viewed", "Trending"];

export default function Forum() {
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
    sortBy: getSortField(sortBy),
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
    <div className="min-h-screen bg-gray-50">
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            {/* Left side - Navigation */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <Link href="/" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide text-sm sm:text-base">
                HOME
              </Link>
              <span className="text-maroon font-medium tracking-wide text-sm sm:text-base">FORUM</span>
              <Link href="/#contact" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide text-sm sm:text-base hidden sm:inline">
                CONTACT
              </Link>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle />
              {isAuthenticated ? (
                <>
                  <NotificationBell />
                  <span className="text-xs text-gray-600 hidden lg:inline mr-2">
                    {user?.fullName || user?.username}
                  </span>
                  
                  {/* Desktop: Show all options */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Link href="/create-project">
                      <Button className="bg-maroon hover:bg-maroon/90 text-white" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Project
                      </Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="outline" size="sm">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/profile">
                      <Button variant="outline" size="sm">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin">
                        <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                          <Crown className="w-4 h-4 mr-2" />
                          Admin
                        </Button>
                      </Link>
                    )}
                    <Button variant="outline" size="sm" onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>

                  {/* Mobile/Tablet: Compact view with expandable menu */}
                  <div className="flex lg:hidden items-center gap-1">
                    <Link href="/create-project">
                      <Button className="bg-maroon hover:bg-maroon/90 text-white text-xs px-2 py-1" size="sm">
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">Create</span>
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="px-2 text-xs relative"
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
                      Log in with CMU
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)}>
                      Demo Login
                    </Button>
                  </div>

                  {/* Mobile/Tablet: Compact view */}
                  <div className="flex md:hidden items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)} className="text-xs px-2">
                      Login
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
            <div className="border-t border-gray-200 mt-2 pt-3 pb-2 lg:hidden">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {isAuthenticated ? (
                  <>
                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                        <BarChart3 className="w-3 h-3 mr-2" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                        <User className="w-3 h-3 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Link href="/#contact" onClick={() => setIsMenuOpen(false)} className="sm:hidden">
                      <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                        Contact
                      </Button>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                          <Crown className="w-3 h-3 mr-2" />
                          Admin
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
                      Logout
                    </Button>
                    <div className="col-span-2 sm:col-span-3 text-xs text-gray-600 px-2 py-1 bg-gray-50 rounded">
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
                      Demo Login
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
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              ShipIts Forum
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Discover and support innovative projects from the Carnegie Mellon community.
              Share your creations, get feedback, and collaborate with fellow students.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
            <div className="space-y-4">
              {/* Search Bar - Full Width */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search projects and tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active Filters */}
              {(selectedTags.length > 0 || selectedCategory !== "All" || searchTerm) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {selectedTags.map((tag) => (
                    <button
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs cursor-pointer hover:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag filter: ${tag}`}
                      title={`Remove tag filter: ${tag}`}
                    >
                      #{tag}
                      <span className="ml-1 hover:text-blue-900" aria-hidden="true">×</span>
                    </button>
                  ))}
                  {selectedCategory !== "All" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      Category: {selectedCategory}
                    </span>
                  )}
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                      Search: {searchTerm}
                    </span>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 rounded px-1 py-1"
                    aria-label="Clear all filters"
                    title="Clear all active filters"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Popular Tags */}
              {popularTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600">Popular tags:</span>
                  {popularTags.slice(0, 10).map((tagData: any) => (
                    <button
                      key={tagData.tag}
                      onClick={() => handleTagClick(tagData.tag)}
                      className={`px-2 py-1 rounded-full text-xs transition-colors ${
                        selectedTags.includes(tagData.tag.toLowerCase())
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      #{tagData.tag} ({tagData.count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">Error: {(error as Error).message}</p>
            </div>
          )}

          {(isFetching) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">No projects found</p>
              <p className="text-gray-400">Try adjusting your search criteria or create a new project!</p>
              {isAuthenticated && (
                <Link href="/create-project">
                  <Button className="mt-4 bg-maroon hover:bg-maroon/90">
                    Create Your First Project
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <section aria-label="Projects gallery">
              <h2 className="sr-only">Browse Projects</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" role="list">
                {projects.map((project) => {
                  // Find the first video media, if any
                  const firstVideo = project.media?.find((media) => media.type === 'video');
                  return (
                    <li key={project._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 relative flex flex-col h-full">
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
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {project.title}
                        </h3>
                        <p className="text-gray-600 text-xs sm:text-sm mb-4 line-clamp-3">
                          {project.description}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-500 mb-3 gap-1 sm:gap-0">
                          <span>By {project.ownerId?.fullName || project.ownerId?.username}</span>
                          <span>{formatDate(project.createdAt)}</span>
                        </div>

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
                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 focus-visible:ring-blue-500'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-gray-500'
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
                        <div className="flex items-center gap-4 text-xs text-gray-500">
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
