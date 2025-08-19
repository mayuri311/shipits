import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { 
  Play, Heart, Share2, Bookmark, ArrowLeft, MessageSquare, 
  Calendar, Users, Eye, Send, Trash2, Edit3, Save, X, Download, File as FileIcon, Flag, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { projectsApi, commentsApi, reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CommentThread } from "@/components/CommentThread";
import { ThreadSummary } from "@/components/ThreadSummary";
import { ShareButton } from "@/components/ShareButton";
import { YouTubeEmbed, extractYouTubeVideoId, isValidYouTubeUrl } from "@/components/YouTubeEmbed";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";
import MarkdownEditor from "@/components/MarkdownEditor";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQueryClient } from "@tanstack/react-query";
import type { Project, Comment, User } from "@shared/schema";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CollaboratorManager } from "@/components/CollaboratorManager";

// Utility function to filter out placeholder/invalid updates
const isValidUpdate = (update: any) => {
  return update && 
    update.title && 
    update.title.trim() !== '' && 
    update.content && 
    update.content.trim() !== '' &&
    !update.title.toLowerCase().includes('users can make updates') &&
    !update.title.toLowerCase().includes('placeholder') &&
    !update.title.toLowerCase().includes('sample') &&
    !update.title.toLowerCase().includes('test update');
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [newUpdate, setNewUpdate] = useState({ title: "", content: "" });
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    commentId: string;
    commentContent: string;
  }>({
    isOpen: false,
    commentId: "",
    commentContent: "",
  });
  
  // Project edit/delete state
  const [editingProject, setEditingProject] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState({
    title: "",
    description: "",
    tags: [] as string[],
    status: "active" as "active" | "inactive" | "archived" | "completed"
  });
  const [savingProject, setSavingProject] = useState(false);
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  // AI helpers state
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [aiTagSuggestions, setAiTagSuggestions] = useState<Array<{ tag: string; confidence?: number; reason?: string }>>([]);
  const [improvingDesc, setImprovingDesc] = useState(false);
  const [improvedDesc, setImprovedDesc] = useState<string | null>(null);
  // Top-of-page AI summary edit/regenerate
  const [editingAISummary, setEditingAISummary] = useState(false);
  const [draftAISummary, setDraftAISummary] = useState('');
  const [savingAISummary, setSavingAISummary] = useState(false);
  const [regeneratingAISummary, setRegeneratingAISummary] = useState(false);
  const [showProjectReport, setShowProjectReport] = useState(false);
  const [projectReportReason, setProjectReportReason] = useState<'spam' | 'abuse' | 'harassment' | 'hate' | 'sexual' | 'self-harm' | 'copyright' | 'other'>('spam');
  const [projectReportDetails, setProjectReportDetails] = useState('');

  // Get filtered valid updates
  const validUpdates = updates.filter(isValidUpdate);

  const handleShare = async (platform: string) => {
    if (!project) return;
    
    try {
      await projectsApi.recordShare(project._id, platform);
      
      // Update the project's share count in local state
      setProject(prev => prev ? {
        ...prev,
        analytics: {
          ...prev.analytics,
          shares: (prev.analytics?.shares || 0) + 1
        }
      } : null);
    } catch (error) {
      console.error('Failed to record share:', error);
      // Don't show error to user since sharing still works
    }
  };



  const handleReportProject = async () => {
    if (!isAuthenticated || !project) {
      toast({ title: 'Authentication Required', description: 'Please log in to report.', variant: 'destructive' });
      return;
    }
    try {
      const res = await reportsApi.createReport({ targetType: 'project', targetId: project._id, reason: projectReportReason, details: projectReportDetails || undefined });
      if (res.success) {
        toast({ title: 'Reported', description: 'Thanks. Moderators will review this project.' });
        setShowProjectReport(false);
        setProjectReportDetails('');
      } else {
        throw new Error(res.error || 'Failed to report');
      }
    } catch (e: any) {
      toast({ title: 'Report Failed', description: e.message || 'Please try again later.', variant: 'destructive' });
    }
  };

  // Comment edit handler
  const handleEditComment = (commentId: string, newContent: string) => {
    setComments(prevComments => 
      prevComments.map(comment => 
        comment._id === commentId 
          ? { ...comment, content: newContent, edited: true }
          : comment
      )
    );
    // Invalidate user metrics to refresh progress
    if (user?._id) {
      queryClient.invalidateQueries({ queryKey: ['userMetrics', user._id] });
    }
  };

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchComments();
      fetchUpdates();
      if (isAuthenticated) {
        fetchSubscriptionStatus();
      }
    }
  }, [id, isAuthenticated]);

  // After comments load, support deep-link to a specific comment via ?commentId=
  useEffect(() => {
    const url = new URL(window.location.href);
    const jumpToCommentId = url.searchParams.get('commentId');
    if (jumpToCommentId) {
      // slight delay to ensure DOM is rendered
      setTimeout(() => {
        const el = document.getElementById(`comment-${jumpToCommentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-orange-400');
          setTimeout(() => el.classList.remove('ring-2', 'ring-orange-400'), 2000);
        }
      }, 300);
    }
  }, [comments.length]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await projectsApi.getProject(id!);
      if (response.success) {
        setProject(response.data.project);
        // Check if current user has liked this project
        if (isAuthenticated && user && response.data.project.likes) {
          const userLiked = response.data.project.likes.some(likeUserId => 
            likeUserId.toString() === user._id.toString()
          );
          setIsLiked(userLiked);
          console.log('User like status:', { 
            userId: user._id, 
            projectLikes: response.data.project.likes, 
            isLiked: userLiked 
          });
        }
      }
    } catch (err) {
      console.error('Error fetching project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      // Fetch top-level comments only; replies will be fetched per parent below
      const response = await commentsApi.getProjectComments(id!, { parentCommentId: '' });
      if (response.success) {
        const topLevelComments = response.data.comments;

        // Fetch replies for each top-level comment
        const repliesPromises = topLevelComments.map(async (comment) => {
          const repliesResponse = await commentsApi.getProjectComments(id!, { parentCommentId: comment._id });
          return repliesResponse.success ? repliesResponse.data.comments : [];
        });

        const replies = await Promise.all(repliesPromises);
        const allComments = topLevelComments.concat(...replies);

        setComments(allComments);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const fetchUpdates = async () => {
    try {
      const response = await projectsApi.getProjectUpdates(id!);
      if (response.success) {
        setUpdates(response.data.updates);
      }
    } catch (err) {
      console.error('Error fetching updates:', err);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await projectsApi.getSubscriptionStatus(id!);
      if (response.success) {
        setIsSubscribed(response.data.isSubscribed);
      }
    } catch (err) {
      console.error('Error fetching subscription status:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to post a comment.",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await commentsApi.createComment(id!, {
        content: newComment.trim(),
        type: 'general'
      });

      if (response.success) {
        setComments([response.data.comment, ...comments]);
        setNewComment("");
        
        // Update project analytics in local state
        setProject(prev => prev ? {
          ...prev,
          analytics: {
            ...prev.analytics,
            totalComments: (prev.analytics?.totalComments || 0) + 1
          }
        } : null);
        
        toast({
          title: "Comment Posted",
          description: "Your comment has been posted successfully.",
        });

        // Invalidate user metrics so profile progress updates
        if (user?._id) {
          queryClient.invalidateQueries({ queryKey: ['userMetrics', user._id] });
        }
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getProjectImageUrl = (project: Project) => {
    if (project.media && project.media.length > 0) {
      const media = project.media[0];
      // Use Base64 data if available, otherwise fall back to URL
      return media.data || media.url || "/api/placeholder/640/400";
    }
    return "/api/placeholder/640/400";
  };

  const handleDeleteComment = (comment: Comment) => {
    setDeleteConfirm({
      isOpen: true,
      commentId: comment._id,
      commentContent: comment.content.substring(0, 50) + (comment.content.length > 50 ? "..." : ""),
    });
  };

  const confirmDeleteComment = async () => {
    try {
      // Capture authorId before deleting for potential targeted invalidation
      const deleted = comments.find(c => c._id === deleteConfirm.commentId);
      // Use general delete endpoint; server allows authors and admins appropriately
      const response = await commentsApi.deleteComment(deleteConfirm.commentId);
      
      if (response.success) {
        setComments(comments.filter(c => c._id !== deleteConfirm.commentId));
        
        // Update project analytics in local state (decrement comment count)
        setProject(prev => prev ? {
          ...prev,
          analytics: {
            ...prev.analytics,
            totalComments: Math.max((prev.analytics?.totalComments || 0) - 1, 0)
          }
        } : null);
        
        // Invalidate metrics for current user and (if available) comment author
        if (user?._id) {
          queryClient.invalidateQueries({ queryKey: ['userMetrics', user._id] });
        }
        if (deleted?.authorId && (deleted.authorId as any)._id) {
          queryClient.invalidateQueries({ queryKey: ['userMetrics', (deleted.authorId as any)._id.toString()] });
        }
        
        toast({
          title: "Comment Deleted",
          description: "The comment has been successfully deleted.",
        });
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirm({ isOpen: false, commentId: "", commentContent: "" });
    }
  };

  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !project || project.ownerId._id !== user?._id) {
      return;
    }

    if (!newUpdate.title.trim() || !newUpdate.content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both title and content.",
        variant: "destructive",
      });
      return;
    }

    if (newUpdate.title.length > 200) {
      toast({
        title: "Title Too Long",
        description: "Update title must be 200 characters or less.",
        variant: "destructive",
      });
      return;
    }

    if (newUpdate.content.length > 5000) {
      toast({
        title: "Content Too Long", 
        description: "Update content must be 5000 characters or less.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingUpdate(true);

    try {
      const response = await projectsApi.createProjectUpdate(id!, newUpdate);

      if (response.success) {
        setUpdates([response.data.update, ...updates]);
        setNewUpdate({ title: "", content: "" });
        toast({
          title: "Update Posted",
          description: "Your project update has been posted successfully.",
        });
        
        // Scroll to the updates section to show the new update
        setTimeout(() => {
          const updatesSection = document.querySelector('[value="updates"]');
          if (updatesSection) {
            updatesSection.click();
          }
        }, 100);
      }
    } catch (err) {
      console.error('Error posting update:', err);
      toast({
        title: "Error",
        description: "Failed to post update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      return;
    }

    setSubscribing(true);

    try {
      const response = isSubscribed 
        ? await projectsApi.unsubscribeFromProject(id!)
        : await projectsApi.subscribeToProject(id!);

      if (response.success) {
        setIsSubscribed(!isSubscribed);
        toast({
          title: isSubscribed ? "Unsubscribed" : "Subscribed",
          description: isSubscribed 
            ? "You will no longer receive updates for this project."
            : "You will now receive notifications for project updates.",
        });
      }
    } catch (err) {
      console.error('Error updating subscription:', err);
      toast({
        title: "Error",
        description: "Failed to update subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to like projects.",
        variant: "destructive",
      });
      return;
    }

    setLiking(true);

    try {
      console.log('Project like action:', { projectId: id, currentlyLiked: isLiked, action: isLiked ? 'unlike' : 'like' });
      
      // Use the toggle endpoint (POST) which handles both like and unlike
      const response = await projectsApi.likeProject(id!);

      console.log('Project like response:', response);

      if (response.success) {
        setIsLiked(response.data.isLiked);
        // Update the project state with new like count
        setProject(prev => prev ? {
          ...prev,
          analytics: {
            ...prev.analytics,
            totalLikes: response.data.totalLikes
          }
        } : null);
        
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
    } finally {
      setLiking(false);
    }
  };

  const handleReactionUpdate = (commentId: string, reactions: any[]) => {
    setComments(prev => prev.map(comment => 
      comment._id === commentId 
        ? { ...comment, reactions }
        : comment
    ));
  };

  const handleReply = async (parentCommentId: string, content: string) => {
    if (!isAuthenticated || !content.trim()) {
      return;
    }

    setSubmittingComment(true);

    try {
      const response = await commentsApi.createComment(id!, {
        content,
        type: 'general',
        parentCommentId
      });

      if (response.success) {
        // Add the reply to the comments list
        setComments([...comments, response.data.comment]);
        
        // Update project analytics in local state (replies count as comments)
        setProject(prev => prev ? {
          ...prev,
          analytics: {
            ...prev.analytics,
            totalComments: (prev.analytics?.totalComments || 0) + 1
          }
        } : null);
        
        toast({
          title: "Reply Posted",
          description: "Your reply has been posted successfully.",
        });

        // Invalidate user metrics so profile progress updates
        if (user?._id) {
          queryClient.invalidateQueries({ queryKey: ['userMetrics', user._id] });
        }
      }
    } catch (err) {
      console.error('Error posting reply:', err);
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const isOwnerOrCollaborator = () => {
    if (!project || !user) return false;
    const isOwner = project.ownerId?._id === user._id;
    const isCollaborator = project.collaborators?.some(c => (c as User)?._id === user._id);
    return isOwner || isCollaborator;
  };

  const canManageProject = isOwnerOrCollaborator();

  // Project editing handlers
  const handleEditProject = () => {
    setProjectEditForm({
      title: project?.title || "",
      description: project?.description || "",
      tags: project?.tags || [],
      status: project?.status || "active"
    });
    setEditingProject(true);
  };

  const handleSaveProject = async () => {
    if (!project || !isAuthenticated) return;
    
    setSavingProject(true);
    try {
      const response = await projectsApi.updateProject(project._id, projectEditForm);
      if (response.success) {
        setProject(prev => prev ? { ...prev, ...projectEditForm } : null);
        setEditingProject(false);
        toast({
          title: "Project Updated",
          description: "Your project has been updated successfully.",
        });
      } else {
        throw new Error(response.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Update project error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProject(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingProject(false);
    setProjectEditForm({
      title: "",
      description: "",
      tags: [],
      status: "active"
    });
  };

  const handleDeleteProject = async () => {
    if (!project || !isAuthenticated) return;
    
    setDeletingProject(true);
    try {
      const response = await projectsApi.deleteProject(project._id);
      if (response.success) {
        toast({
          title: "Project Deleted",
          description: "Your project has been deleted successfully.",
        });
        // Redirect to forum after deletion
        setTimeout(() => {
          setLocation('/forum');
        }, 1000);
      } else {
        throw new Error(response.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete project error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingProject(false);
      setDeleteProjectConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-maroon mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
          <p className="text-gray-600 mb-6">{error || "The project you're looking for doesn't exist."}</p>
          <Link href="/forum">
            <Button>Back to Forum</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, commentId: "", commentContent: "" })}
        onConfirm={confirmDeleteComment}
        title="Delete Comment"
        description={`Are you sure you want to delete this comment: "${deleteConfirm.commentContent}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
      <ConfirmDialog
        isOpen={deleteProjectConfirm}
        onClose={() => setDeleteProjectConfirm(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description={`Are you sure you want to delete "${project?.title}"? This action cannot be undone and will permanently remove the project and all its comments.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="destructive"
        loading={deletingProject}
      />
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/forum">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="w-4 h-4" />
                {!isMobile && <span className="ml-2">Back to Forum</span>}
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              {isAuthenticated && project && project.ownerId._id !== user?._id && (
                <Button 
                  variant={isSubscribed ? "default" : "outline"} 
                  size="sm"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className={`${isSubscribed ? "bg-maroon hover:bg-maroon/90" : ""} ${isMobile ? "px-2" : ""}`}
                >
                  {subscribing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                  {!isMobile && (
                    <span className="ml-2">{isSubscribed ? "Subscribed" : "Subscribe"}</span>
                  )}
                </Button>
              )}
              <ShareButton
                title={project.title}
                description={project.description}
                hashtags={project.tags}
                onShare={handleShare}
                variant="outline"
                size="sm"
              />
              {isAuthenticated && project && project.ownerId._id !== user?._id && (
                <Button variant="outline" size="sm" onClick={() => setShowProjectReport(true)} title="Report project">
                  <Flag className="w-4 h-4 mr-1" /> Report
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Project Header */}
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6 mb-6">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-2 sm:gap-0">
                  <div className="flex-1">
                    {editingProject ? (
                      <div className="space-y-4">
                        <div>
                          <Input
                            value={projectEditForm.title}
                            onChange={(e) => setProjectEditForm(prev => ({ ...prev, title: e.target.value }))}
                            className="text-2xl sm:text-3xl font-bold"
                            placeholder="Project title"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={projectEditForm.status}
                            onChange={(e) => setProjectEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                            className="px-3 py-1 rounded-full text-sm font-medium border border-gray-300"
                          >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                          </select>
                          <Button 
                            onClick={handleSaveProject} 
                            disabled={savingProject}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {savingProject ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Save
                          </Button>
                          <Button 
                            onClick={handleCancelEdit} 
                            variant="outline" 
                            size="sm"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                            {project.title}
                          </h1>
                          {/* Edit/Delete buttons for project owner and collaborators */}
                          {isAuthenticated && canManageProject && (
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                onClick={handleEditProject}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Edit project"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => setDeleteProjectConfirm(true)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">
                          By {project.ownerId?.fullName || project.ownerId?.username}
                        </p>
                        
                        {/* Collaborators Display */}
                        {project.collaborators && project.collaborators.length > 0 && (
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="text-xs text-gray-500">Collaborators:</span>
                            <div className="flex items-center -space-x-2">
                              {project.collaborators.slice(0, 5).map((collaborator: User) => (
                                <Avatar key={collaborator._id} className="w-6 h-6 border-2 border-white">
                                  <AvatarImage 
                                    src={collaborator.profileImage} 
                                    alt={collaborator.fullName || collaborator.username}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {(collaborator.fullName || collaborator.username)?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {project.collaborators.length > 5 && (
                                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                  <span className="text-xs text-gray-600">+{project.collaborators.length - 5}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 text-xs text-gray-600 max-w-xs">
                              {project.collaborators.slice(0, 3).map((collaborator: User, index: number) => (
                                <span key={collaborator._id}>
                                  {collaborator.fullName || collaborator.username}
                                  {index < Math.min(2, project.collaborators.length - 1) && ", "}
                                </span>
                              ))}
                              {project.collaborators.length > 3 && (
                                <span>and {project.collaborators.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-row flex-wrap items-center gap-2 mt-2 sm:mt-0">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      project.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : project.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {project.status}
                    </span>
                    {project.featured && (
                      <span className="bg-maroon text-white px-3 py-1 rounded-full text-sm font-medium">
                        Featured
                      </span>
                    )}
                  </div>
                </div>

                {/* Project Image/Video */}
                <div className="relative mb-6">
                  {project.media && project.media.length > 1 ? (
                    // Sort media so videos come first
                    (() => {
                      const sortedMedia = [...project.media].sort((a, b) => {
                        if (a.type === b.type) return 0;
                        if (a.type === 'video') return -1;
                        if (b.type === 'video') return 1;
                        return 0;
                      });
                      return (
                        <Carousel className="w-full">
                          <CarouselContent>
                            {sortedMedia.map((media, index) => (
                              <CarouselItem key={index}>
                                <div className="relative group">
                                  {media.type === 'image' ? (
                                    <img
                                      src={media.data || media.url}
                                      alt={media.caption || `Project media ${index + 1}`}
                                      className="w-full h-48 sm:h-96 object-cover rounded-lg"
                                    />
                                  ) : media.type === 'video' ? (
                                    media.url && isValidYouTubeUrl(media.url) ? (
                                      <YouTubeEmbed
                                        videoId={extractYouTubeVideoId(media.url)!}
                                        title={media.caption || 'Project Video'}
                                        width={320}
                                        height={180}
                                        showTitle={false}
                                      />
                                    ) : (
                                      <video
                                        src={media.data || media.url}
                                        controls
                                        className="w-full h-48 sm:h-96 object-cover rounded-lg"
                                        poster={(media.data || media.url) + '#t=0.1'}
                                      />
                                    )
                                  ) : null}
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious />
                          <CarouselNext />
                        </Carousel>
                      );
                    })()
                  ) : (
                    (() => {
                      const firstVideo = project.media?.find((media) => media.type === 'video');
                      if (firstVideo) {
                        if (firstVideo.url && isValidYouTubeUrl(firstVideo.url)) {
                          return (
                            <YouTubeEmbed
                              videoId={extractYouTubeVideoId(firstVideo.url)!}
                              title={firstVideo.caption || 'Project Video'}
                              width={320}
                              height={180}
                              showTitle={false}
                            />
                          );
                        } else {
                          return (
                            <video
                              src={firstVideo.data || firstVideo.url}
                              controls
                              className="w-full h-48 sm:h-96 object-cover rounded-lg"
                              poster={(firstVideo.data || firstVideo.url) + '#t=0.1'}
                            />
                          );
                        }
                      } else {
                        return (
                          <img 
                            src={getProjectImageUrl(project)}
                            alt={`${project.title} - Main project image`}
                            className="w-full h-48 sm:h-96 object-cover rounded-lg"
                          />
                        );
                      }
                    })()
                  )}
                </div>

                {/* Project Stats */}
                <section className="flex flex-col sm:flex-row items-center justify-between mb-6 p-3 sm:p-4 md:p-6 bg-gray-50 rounded-lg gap-2 sm:gap-0" aria-label="Project engagement statistics">
                  <dl className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <dt className="sr-only">Project likes</dt>
                      <dd>
                        <button 
                          onClick={handleLike}
                          disabled={liking}
                          className={`flex items-center gap-2 transition-colors hover:text-red-500 ${
                            isLiked ? 'text-red-500' : 'text-gray-600'
                          } ${liking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          aria-label={isLiked ? 
                            `Unlike project (${project.analytics?.totalLikes || 0} likes)` : 
                            `Like project (${project.analytics?.totalLikes || 0} likes)`}
                          title={isLiked ? 'Unlike project' : 'Like project'}
                        >
                          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} aria-hidden="true" />
                          <span>{project.analytics?.totalLikes || 0} likes</span>
                        </button>
                      </dd>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <dt className="sr-only">Comments count</dt>
                      <dd className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" aria-hidden="true" />
                        <span>{project.analytics?.totalComments || 0} comments</span>
                      </dd>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <dt className="sr-only">Views count</dt>
                      <dd className="flex items-center gap-2">
                        <Eye className="w-5 h-5" aria-hidden="true" />
                        <span>{project.analytics?.views || 0} views</span>
                      </dd>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <dt className="sr-only">Shares count</dt>
                      <dd className="flex items-center gap-2">
                        <Share2 className="w-5 h-5" aria-hidden="true" />
                        <span>{project.analytics?.shares || 0} shares</span>
                      </dd>
                    </div>
                  </dl>
                  <div className="text-sm text-gray-500">
                    Created {formatDate(project.createdAt)}
                  </div>
                </section>

                {/* AI Project Summary (top of page) */}
                {project.aiSummary && (
                  <div className="mb-4 bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">AI Project Summary</div>
                      {isAuthenticated && (canManageProject || user?.role === 'admin') && (
                        <div className="flex gap-2">
                          {!editingAISummary && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => { setEditingAISummary(true); setDraftAISummary(project.aiSummary || ''); }}>
                                <Edit3 className="w-4 h-4 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="outline" onClick={async () => {
                                try {
                                  setRegeneratingAISummary(true);
                                  const gen = await commentsApi.generateThreadSummary(project._id);
                                  if (gen.success) {
                                    const newSummary = gen.data.summary;
                                    setDraftAISummary(newSummary);
                                    // Save to project
                                    setSavingAISummary(true);
                                    const saved = await projectsApi.saveAISummary(project._id, newSummary);
                                    if (saved.success) {
                                      setProject(prev => prev ? { ...prev, aiSummary: newSummary, aiSummaryUpdatedAt: new Date() as any } : prev);
                                      toast({ title: 'Regenerated', description: 'AI summary updated.' });
                                    }
                                  }
                                } catch (e: any) {
                                  toast({ title: 'Error', description: e.message || 'Failed to regenerate', variant: 'destructive' });
                                } finally {
                                  setSavingAISummary(false);
                                  setRegeneratingAISummary(false);
                                }
                              }} disabled={regeneratingAISummary}>
                                {regeneratingAISummary ? 'Regenerating…' : 'Regenerate'}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {!editingAISummary ? (
                      <>
                        <div className="text-sm text-gray-700 mt-2">{project.aiSummary}</div>
                        <div className="text-xs text-gray-500 mt-2">Updated {project.aiSummaryUpdatedAt ? formatDate(project.aiSummaryUpdatedAt) : 'recently'}</div>
                      </>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <Textarea value={draftAISummary} onChange={(e) => setDraftAISummary(e.target.value)} rows={4} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => {
                            if (!draftAISummary.trim()) return;
                            try {
                              setSavingAISummary(true);
                              const saved = await projectsApi.saveAISummary(project._id, draftAISummary.trim());
                              if (saved.success) {
                                setProject(prev => prev ? { ...prev, aiSummary: draftAISummary.trim(), aiSummaryUpdatedAt: new Date() as any } : prev);
                                setEditingAISummary(false);
                                toast({ title: 'Saved', description: 'AI summary updated.' });
                              }
                            } catch (e: any) {
                              toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
                            } finally {
                              setSavingAISummary(false);
                            }
                          }} disabled={savingAISummary}>
                            {savingAISummary ? 'Saving…' : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingAISummary(false)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {(!project.aiSummary && isAuthenticated && (canManageProject || user?.role === 'admin')) && (
                  <div className="mb-4 bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">AI Project Summary</div>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">No summary yet. Generate one based on the project and its discussion.</p>
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          setRegeneratingAISummary(true);
                          const gen = await commentsApi.generateThreadSummary(project._id);
                          if (gen.success) {
                            const newSummary = gen.data.summary;
                            const saved = await projectsApi.saveAISummary(project._id, newSummary);
                            if (saved.success) {
                              setProject(prev => prev ? { ...prev, aiSummary: newSummary, aiSummaryUpdatedAt: new Date() as any } : prev);
                              toast({ title: 'Generated', description: 'AI summary created.' });
                            }
                          }
                        } catch (e: any) {
                          toast({ title: 'Error', description: e.message || 'Failed to generate', variant: 'destructive' });
                        } finally {
                          setRegeneratingAISummary(false);
                        }
                      }} disabled={regeneratingAISummary}>
                        {regeneratingAISummary ? 'Generating…' : 'Generate Summary'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Project Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                                                    <TabsTrigger value="updates">
                                  Updates ({validUpdates.length})
                                </TabsTrigger>
                    <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="mt-6">
                    <div className="prose max-w-none">
                      <h3 className="text-lg font-semibold mb-4">About This Project</h3>
                      {editingProject ? (
                        <div className="space-y-4">
                          <MarkdownEditor
                            value={projectEditForm.description}
                            onChange={(v) => setProjectEditForm(prev => ({ ...prev, description: v }))}
                            placeholder="Project description (Markdown supported)"
                            withUploads
                          />
                          <div className="flex gap-2 items-center">
                            <Button type="button" size="sm" variant="outline" onClick={() => handleImproveDescription('shorten')} disabled={improvingDesc}>
                              {improvingDesc ? 'Working…' : 'AI Shorten'}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => handleImproveDescription('clarify')} disabled={improvingDesc}>
                              {improvingDesc ? 'Working…' : 'AI Clarify'}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => handleImproveDescription('improve')} disabled={improvingDesc}>
                              {improvingDesc ? 'Working…' : 'AI Improve'}
                            </Button>
                          </div>
                          {improvedDesc && (
                            <div className="p-3 border rounded bg-gray-50">
                              <div className="text-sm font-medium mb-2">AI Suggestion</div>
                              <div className="prose prose-sm max-w-none">
                                <MarkdownRenderer content={improvedDesc} />
                              </div>
                              <div className="mt-2">
                                <Button size="sm" onClick={() => setProjectEditForm(prev => ({ ...prev, description: improvedDesc }))}>Apply</Button>
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                            <Input
                              value={projectEditForm.tags.join(', ')}
                              onChange={(e) => setProjectEditForm(prev => ({ 
                                ...prev, 
                                tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) 
                              }))}
                              placeholder="e.g., web development, react, javascript"
                            />
                            <div className="flex gap-2 mt-2">
                              <Button type="button" size="sm" variant="outline" onClick={handleSuggestTags} disabled={suggestingTags}>
                                {suggestingTags ? 'Suggesting…' : 'AI Suggest Tags'}
                              </Button>
                            </div>
                            {aiTagSuggestions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {aiTagSuggestions.map((s, i) => (
                                  <button key={i} type="button" className="px-2 py-1 rounded-full border text-sm hover:bg-gray-100" onClick={() => addSuggestedTag(s.tag)} title={s.reason || ''}>
                                    {s.tag}{typeof s.confidence === 'number' ? ` (${Math.round(s.confidence * 100)}%)` : ''}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <TranslatedMarkdown
                          sourceType="project"
                          sourceId={project._id}
                          field="description"
                          text={project.description}
                        />
                      )}
                      
                      {project.tags && project.tags.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-md font-semibold mb-3">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {project.tags.map((tag, index) => (
                              <span 
                                key={index}
                                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Media Gallery & File Attachments */}
                      {project.media && project.media.length > 0 && (
                        <div className="mt-6 space-y-6">
                          {/* Images and Videos */}
                          {project.media.some(media => media.type === 'image' || media.type === 'video') && (
                            <section aria-labelledby="media-gallery-heading">
                              <h4 id="media-gallery-heading" className="text-md font-semibold mb-3">Project Gallery</h4>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list">
                                {project.media
                                  .filter(media => media.type === 'image' || media.type === 'video')
                                  .map((media, index) => (
                                    <li key={index} className="relative group">
                                      {media.type === 'image' ? (
                                        <img
                                          src={media.data || media.url}
                                          alt={media.caption || `${project.title} - Project image ${index + 1}`}
                                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => {
                                            const imageUrl = media.data || media.url;
                                            if (imageUrl) window.open(imageUrl, '_blank');
                                          }}
                                        />
                                      ) : media.type === 'video' ? (
                                        // Check if it's a YouTube URL or regular video
                                        media.url && isValidYouTubeUrl(media.url) ? (
                                          <div className="w-full">
                                            <YouTubeEmbed
                                              videoId={extractYouTubeVideoId(media.url)!}
                                              title={media.caption || 'Project Video'}
                                              width={400}
                                              height={225}
                                              showTitle={false}
                                            />
                                            {media.caption && (
                                              <p className="text-sm text-gray-600 mt-2 px-2">
                                                {media.caption}
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          // Regular video file
                                          <video
                                            src={media.data || media.url}
                                            controls
                                            className="w-full h-48 object-cover rounded-lg"
                                            poster={(media.data || media.url) + '#t=0.1'}
                                          />
                                        )
                                      ) : null}
                                      
                                      {/* Caption overlay for non-YouTube videos */}
                                      {media.type !== 'video' || !media.url || !isValidYouTubeUrl(media.url) ? (
                                        media.caption && (
                                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-sm">{media.caption}</p>
                                          </div>
                                        )
                                      ) : null}
                                    </li>
                                  ))}
                              </ul>
                            </section>
                          )}

                          {/* File Attachments */}
                          {project.media.some(media => media.type === 'document' || media.type === 'archive' || media.type === 'other') && (
                            <section aria-labelledby="file-attachments-heading">
                              <h4 id="file-attachments-heading" className="text-md font-semibold mb-3">File Attachments</h4>
                              <div className="space-y-2">
                                {project.media
                                  .filter(media => media.type === 'document' || media.type === 'archive' || media.type === 'other')
                                  .map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <div className="text-2xl">
                                          {file.mimetype?.includes('pdf') ? '📄' :
                                           file.mimetype?.includes('word') || file.mimetype?.includes('document') ? '📝' :
                                           file.mimetype?.includes('excel') || file.mimetype?.includes('spreadsheet') ? '📊' :
                                           file.mimetype?.includes('powerpoint') || file.mimetype?.includes('presentation') ? '📋' :
                                           file.mimetype?.includes('zip') || file.mimetype?.includes('rar') || file.mimetype?.includes('7z') ? '🗜️' :
                                           file.mimetype?.includes('text') ? '📋' : '📎'}
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-900">
                                            {file.originalName || file.filename}
                                          </p>
                                          <p className="text-sm text-gray-500">
                                            {file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''} 
                                            {file.size && file.mimetype && ' • '} 
                                            {file.mimetype}
                                          </p>
                                          {file.description && (
                                            <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {(file.url || file.data) && (
                                        <a
                                          href={file.url || file.data}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 px-3 py-2 bg-maroon text-white rounded-lg hover:bg-maroon/90 transition-colors"
                                          title={`Download ${file.originalName || file.filename}`}
                                        >
                                          <Download className="w-4 h-4" />
                                          <span className="text-sm">Download</span>
                                        </a>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </section>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  
                  
                  <TabsContent value="updates" className="mt-6">
                    {/* Post Update Form - For project owner and collaborators */}
                    {isAuthenticated && project && canManageProject && (
                      <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <MessageSquare className="w-5 h-5 text-maroon" />
                          <h3 className="text-lg font-semibold text-gray-900">Share an Update</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Keep your community engaged by sharing progress, milestones, or new features.
                        </p>
                        
                        <form onSubmit={handleSubmitUpdate} className="space-y-4">
                          <div>
                            <label htmlFor="update-title" className="block text-sm font-medium text-gray-700 mb-2">
                              Update Title <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="update-title"
                              type="text"
                              value={newUpdate.title}
                              onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                              placeholder="What's new in your project?"
                              maxLength={200}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon focus:border-transparent transition-colors"
                              required
                            />
                            <div className="flex justify-between items-center mt-1">
                              <div className="text-xs text-gray-500">
                                Keep it concise and descriptive
                              </div>
                              <div className="text-xs text-gray-400">
                                {newUpdate.title.length}/200
                              </div>
                            </div>
                          </div>
                          
                          <div>
                          <label htmlFor="update-content" className="block text-sm font-medium text-gray-700 mb-2">
                            Update Details <span className="text-red-500">*</span>
                          </label>
                          <MarkdownEditor
                            value={newUpdate.content}
                            onChange={(v) => setNewUpdate({ ...newUpdate, content: v })}
                            placeholder="Describe the new features, improvements, changes, or progress you've made..."
                            withUploads
                          />
                            <div className="flex justify-between items-center mt-1">
                              <div className="text-xs text-gray-500">
                                Share details that will help others understand your progress
                              </div>
                            <div className="text-xs text-gray-400">{newUpdate.content.length}/5000</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2">
                            <div className="text-xs text-gray-500">
                              💡 <strong>Tip:</strong> Include screenshots, demos, or links to showcase your work
                            </div>
                            <Button 
                              type="submit" 
                              disabled={
                                submittingUpdate || 
                                !newUpdate.title.trim() || 
                                !newUpdate.content.trim() || 
                                newUpdate.title.length > 200 || 
                                newUpdate.content.length > 5000
                              }
                              className="bg-maroon hover:bg-maroon/90 disabled:opacity-50 disabled:cursor-not-allowed px-6"
                            >
                              {submittingUpdate ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Publishing...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Publish Update
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Updates List */}
                    <div className="space-y-6">
                      {validUpdates.length > 0 ? (
                        validUpdates.map((update, index) => (
                          <div key={update._id || index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {update.title}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {formatDate(update.createdAt)}
                                </span>
                                {/* Show edit/delete options for project owner and collaborators */}
                                {isAuthenticated && project && canManageProject && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Future: Add edit/delete functionality */}
                                  </div>
                                )}
                              </div>
                            </div>
                            <TranslatedMarkdown
                              sourceType="project_update"
                              sourceId={update._id}
                              field="content"
                              text={update.content}
                            />
                            {update.media && update.media.length > 0 && (
                              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {update.media.map((media: any, mediaIndex: number) => (
                                  <img
                                    key={mediaIndex}
                                    src={media.data || media.url}
                                    alt={media.caption || `Update media ${mediaIndex + 1}`}
                                    className="rounded-lg object-cover w-full h-32 hover:scale-105 transition-transform cursor-pointer"
                                    onClick={() => {
                                      // Future: Add lightbox/modal for image viewing
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No updates yet</h3>
                          <p className="text-gray-500 mb-4 max-w-sm mx-auto">
                            {project && canManageProject 
                              ? "Share your progress, new features, and milestones with the community!"
                              : `Stay tuned for updates from ${project?.ownerId?.fullName || project?.ownerId?.username || 'the project owner'}.`
                            }
                          </p>
                          {project && canManageProject && (
                            <p className="text-sm text-gray-400">
                              👆 Use the form above to post your first update
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="comments" className="mt-6">
                    {/* Thread Summary */}
                    <div data-can-edit={(isAuthenticated && project && (canManageProject || user?.role === 'admin')) ? 'true' : 'false'}>
                      <ThreadSummary 
                        projectId={id!}
                        commentCount={comments.length}
                      />
                    </div>

                    {/* Comment Form */}
                    {isAuthenticated ? (
                      <form onSubmit={handleSubmitComment} className="mb-6">
                        <MarkdownEditor
                          value={newComment}
                          onChange={setNewComment}
                          placeholder="Share your thoughts... Use Markdown, code blocks, images, and emoji."
                          withUploads
                        />
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-500">
                            Posting as {user?.fullName || user?.username}
                          </p>
                          <Button 
                            type="submit" 
                            disabled={!newComment.trim() || submittingComment}
                            size="sm"
                          >
                            {submittingComment ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Posting...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Post Comment
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
                        <p className="text-gray-600">Please log in to post a comment.</p>
                      </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-4">
                      {comments.length > 0 ? (
                        // Only render top-level comments, replies are handled recursively
                        comments
                          .filter(comment => !comment.parentCommentId)
                          .map((comment) => (
                            <CommentThread
                              key={comment._id}
                              comment={comment}
                              allComments={comments}
                              onReply={handleReply}
                              onDelete={handleDeleteComment}
                              submittingReply={submittingComment}
                              formatDate={formatDate}
                              onReactionUpdate={handleReactionUpdate}
                              onEdit={handleEditComment}
                            />
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No comments yet.</p>
                          <p className="text-sm text-gray-400">Be the first to share your thoughts!</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Collaborator Manager for Owner */}
              {isOwnerOrCollaborator() && project.ownerId?._id === user?._id && (
                <div className="mt-8">
                  <CollaboratorManager project={project} />
                </div>
              )}

            </div>
            <div className="lg:col-span-1">
              {/* Creator Info */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Project Creator</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {project.ownerId?.fullName || project.ownerId?.username}
                    </p>
                    {project.ownerId?.college && (
                      <p className="text-sm text-gray-500">{project.ownerId.college}</p>
                    )}
                  </div>
                </div>
                
                {project.ownerId?.bio && (
                  <p className="text-sm text-gray-600 mb-4">{project.ownerId.bio}</p>
                )}
                
                <Link href={`/profile/${project.ownerId?._id}`}>
                <Button variant="outline" className="w-full">
                  View Profile
                </Button>
                </Link>
              </div>

              {/* Project Stats */}
              <section className="bg-white rounded-lg shadow-sm p-6" aria-labelledby="project-stats-heading">
                <h3 id="project-stats-heading" className="text-lg font-semibold mb-4">Project Statistics</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Created</dt>
                    <dd className="font-medium">{formatDate(project.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Last Updated</dt>
                    <dd className="font-medium">{formatDate(project.updatedAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Views</dt>
                    <dd className="font-medium">{project.analytics?.views || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Comments</dt>
                    <dd className="font-medium">{project.analytics?.totalComments || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Subscribers</dt>
                    <dd className="font-medium">{project.analytics?.subscribers || 0}</dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        </div>
      </div>
      {showProjectReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 space-y-3">
            <div className="text-lg font-semibold">Report Project</div>
            <div className="text-sm text-gray-600">Select a reason and optionally add details.</div>
            <div>
              <select className="w-full border rounded px-2 py-2" value={projectReportReason} onChange={(e) => setProjectReportReason(e.target.value as any)}>
                <option value="spam">Spam</option>
                <option value="abuse">Abuse</option>
                <option value="harassment">Harassment</option>
                <option value="hate">Hate</option>
                <option value="sexual">Sexual</option>
                <option value="self-harm">Self-harm</option>
                <option value="copyright">Copyright</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Textarea placeholder="Additional details (optional)" value={projectReportDetails} onChange={(e) => setProjectReportDetails(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowProjectReport(false)}>Cancel</Button>
              <Button onClick={handleReportProject} className="bg-orange-600 hover:bg-orange-700">Submit Report</Button>
            </div>
          </div>
        </div>
      )}

      {/* Project Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteProjectConfirm}
        onClose={() => setDeleteProjectConfirm(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description={`Are you sure you want to delete "${project?.title}"? This action cannot be undone and will permanently remove the project and all its comments.`}
        confirmText="Delete Project"
        isDestructive={true}
        isLoading={deletingProject}
      />

      {/* Comment Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, commentId: "", commentContent: "" })}
        onConfirm={confirmDeleteComment}
        title="Delete Comment"
        description={`Are you sure you want to delete this comment? This action cannot be undone.`}
        confirmText="Delete Comment"
        isDestructive={true}
      />
    </div>
  );
}