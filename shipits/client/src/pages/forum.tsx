import { useState } from "react";
import { Link } from "wouter";
import { Search, Filter, ChevronDown, Heart, MessageSquare, Share2, Bookmark, User, Plus, LogOut, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { projectsApi } from "@/lib/api";
import type { Project } from "@shared/schema";
import { AuthModal } from "@/components/AuthModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const categories = ["All", "Technology", "Art", "Design", "Music", "Games", "Hardware"];
const sortOptions = ["Featured", "Most Recent", "Most Viewed", "Trending"];

export default function Forum() {
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
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

  const params = {
    search: searchTerm || undefined,
    tags: selectedCategory !== "All" ? [selectedCategory.toLowerCase()] : undefined,
    featured: sortBy === "Featured" ? true : undefined,
    sortBy: getSortField(sortBy),
    sortOrder: getSortOrder(sortBy),
    limit: 20,
  };

  const { data: projectsData, error, isLoading, isFetching } = useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectsApi.getProjects(params),
  });

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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getProjectImageUrl = (project: Project) => {
    if (project.media && project.media.length > 0) {
      const media = project.media[0];
      // Use Base64 data if available, otherwise fall back to URL
      return media.data || media.url || "/api/placeholder/400/250";
    }
    return "/api/placeholder/400/250";
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
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                HOME
              </Link>
              <span className="text-maroon font-medium tracking-wide">FORUM</span>
              <Link href="/#contact" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                CONTACT
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600">
                    Welcome, {user?.fullName || user?.username}
                  </span>
                  <Link href="/create-project">
                    <Button className="bg-maroon hover:bg-maroon/90 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)}>
                    Log in with CMU
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsAuthModalOpen(true)}>
                    Demo Login
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ShipIts Forum
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover and support innovative projects from the Carnegie Mellon community.
              Share your creations, get feedback, and collaborate with fellow students.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
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
                  <SelectTrigger className="w-40">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 relative">
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
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Link href={`/forum/project/${project._id}`}>
                    <div className="relative">
                      <img
                        src={getProjectImageUrl(project)}
                        alt={project.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      {project.featured && (
                        <div className="absolute top-3 left-3">
                          <span className="bg-maroon text-white px-2 py-1 rounded-full text-xs font-medium">
                            Featured
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {project.title}
                      </h3>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {project.description}
                      </p>

                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>By {project.ownerId?.fullName || project.ownerId?.username}</span>
                        <span>{formatDate(project.createdAt)}</span>
                      </div>

                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {project.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="text-gray-500 text-xs">
                              +{project.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {project.analytics?.totalLikes || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {project.analytics?.totalComments || 0}
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          👁️ {project.analytics?.views || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
