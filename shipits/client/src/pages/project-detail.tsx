import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { 
  Play, Heart, Share2, Bookmark, ArrowLeft, MessageSquare, 
  Calendar, Users, Eye, Send, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { projectsApi, commentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CommentThread } from "@/components/CommentThread";
import { ThreadSummary } from "@/components/ThreadSummary";
import { ShareButton } from "@/components/ShareButton";
import type { Project, Comment } from "@shared/schema";

export default function ProjectDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
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

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await projectsApi.getProject(id!);
      if (response.success) {
        setProject(response.data.project);
        // Check if current user has liked this project
        if (isAuthenticated && user && response.data.project.likes) {
          setIsLiked(response.data.project.likes.includes(user._id));
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
      const response = await commentsApi.getProjectComments(id!);
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
        toast({
          title: "Comment Posted",
          description: "Your comment has been posted successfully.",
        });
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
      const response = await commentsApi.adminDeleteComment(deleteConfirm.commentId);
      
      if (response.success) {
        setComments(comments.filter(c => c._id !== deleteConfirm.commentId));
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
      const response = isLiked 
        ? await projectsApi.unlikeProject(id!)
        : await projectsApi.likeProject(id!);

      if (response.success) {
        setIsLiked(!isLiked);
        // Update the project state with new like count
        setProject(prev => prev ? {
          ...prev,
          analytics: {
            ...prev.analytics,
            totalLikes: response.data.totalLikes
          }
        } : null);
        
        toast({
          title: isLiked ? "Unliked" : "Liked",
          description: isLiked 
            ? "Removed your like from this project."
            : "Added your like to this project.",
        });
      }
    } catch (err) {
      console.error('Error updating like:', err);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
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
        toast({
          title: "Reply Posted",
          description: "Your reply has been posted successfully.",
        });
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/forum">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Forum
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              {isAuthenticated && project && project.ownerId._id !== user?._id && (
                <Button 
                  variant={isSubscribed ? "default" : "outline"} 
                  size="sm"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className={isSubscribed ? "bg-maroon hover:bg-maroon/90" : ""}
                >
                  {subscribing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  ) : (
                    <Bookmark className="w-4 h-4 mr-2" />
                  )}
                  {isSubscribed ? "Subscribed" : "Subscribe"}
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Project Header */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {project.title}
                    </h1>
                    <p className="text-gray-600">
                      By {project.ownerId?.fullName || project.ownerId?.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
                  <img 
                    src={getProjectImageUrl(project)}
                    alt={project.title}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                  {project.media && project.media.some(m => m.type === 'video') && (
                    <button className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg hover:bg-opacity-40 transition-opacity">
                      <Play className="w-16 h-16 text-white" />
                    </button>
                  )}
                </div>

                {/* Project Stats */}
                <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={handleLike}
                      disabled={liking}
                      className={`flex items-center gap-2 transition-colors hover:text-red-500 ${
                        isLiked ? 'text-red-500' : 'text-gray-600'
                      } ${liking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                      <span>{project.analytics?.totalLikes || 0} likes</span>
                    </button>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MessageSquare className="w-5 h-5" />
                      <span>{project.analytics?.totalComments || 0} comments</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Eye className="w-5 h-5" />
                      <span>{project.analytics?.views || 0} views</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Share2 className="w-5 h-5" />
                      <span>{project.analytics?.shares || 0} shares</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Created {formatDate(project.createdAt)}
                  </div>
                </div>

                {/* Project Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="updates">Updates ({project.updates?.length || 0})</TabsTrigger>
                    <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="mt-6">
                    <div className="prose max-w-none">
                      <h3 className="text-lg font-semibold mb-4">About This Project</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {project.description}
                      </p>
                      
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

                      {/* Media Gallery */}
                      {project.media && project.media.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-md font-semibold mb-3">Project Gallery</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {project.media.map((media, index) => (
                              <div key={index} className="relative group">
                                {media.type === 'image' ? (
                                  <img
                                    src={media.data || media.url}
                                    alt={media.caption || `Project media ${index + 1}`}
                                    className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => {
                                      const imageUrl = media.data || media.url;
                                      if (imageUrl) window.open(imageUrl, '_blank');
                                    }}
                                  />
                                ) : media.type === 'video' ? (
                                  <video
                                    src={media.data || media.url}
                                    controls
                                    className="w-full h-48 object-cover rounded-lg"
                                    poster={(media.data || media.url) + '#t=0.1'}
                                  />
                                ) : null}
                                {media.caption && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-sm">{media.caption}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="updates" className="mt-6">
                    {project.updates && project.updates.length > 0 ? (
                      <div className="space-y-6">
                        {project.updates.map((update, index) => (
                          <div key={index} className="border-l-4 border-maroon pl-4">
                            <h4 className="font-semibold text-gray-900">{update.title}</h4>
                            <p className="text-sm text-gray-500 mb-2">
                              {formatDate(update.createdAt)}
                            </p>
                            <p className="text-gray-700">{update.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No updates yet.</p>
                        {isAuthenticated && user?._id === project.ownerId._id && (
                          <p className="text-sm text-gray-400 mt-2">
                            Project updates will appear here when you post them.
                          </p>
                        )}
                      </div>
                    )}
                                    </TabsContent>

                  <TabsContent value="updates" className="mt-6">
                    {/* Post Update Form - Only for project owner */}
                    {isAuthenticated && project && project.ownerId._id === user?._id && (
                      <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4">Post New Update</h3>
                        <form onSubmit={handleSubmitUpdate} className="space-y-4">
                          <div>
                            <label htmlFor="update-title" className="block text-sm font-medium text-gray-700 mb-2">
                              Update Title
                            </label>
                            <input
                              id="update-title"
                              type="text"
                              value={newUpdate.title}
                              onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                              placeholder="What's new in your project?"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="update-content" className="block text-sm font-medium text-gray-700 mb-2">
                              Update Details
                            </label>
                            <Textarea
                              id="update-content"
                              value={newUpdate.content}
                              onChange={(e) => setNewUpdate({ ...newUpdate, content: e.target.value })}
                              placeholder="Describe the new features, improvements, or changes..."
                              rows={4}
                              className="w-full"
                              required
                            />
                          </div>
                          <Button 
                            type="submit" 
                            disabled={submittingUpdate || !newUpdate.title.trim() || !newUpdate.content.trim()}
                            className="bg-maroon hover:bg-maroon/90"
                          >
                            {submittingUpdate ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Posting Update...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Post Update
                              </>
                            )}
                          </Button>
                        </form>
                      </div>
                    )}

                    {/* Updates List */}
                    <div className="space-y-6">
                      {updates.length > 0 ? (
                        updates.map((update, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {update.title}
                              </h4>
                              <span className="text-sm text-gray-500">
                                {formatDate(update.createdAt)}
                              </span>
                            </div>
                            <div className="prose max-w-none">
                              <p className="text-gray-700 whitespace-pre-line">
                                {update.content}
                              </p>
                            </div>
                            {update.media && update.media.length > 0 && (
                              <div className="mt-4 grid grid-cols-2 gap-2">
                                {update.media.map((media: any, mediaIndex: number) => (
                                  <img
                                    key={mediaIndex}
                                    src={media.data || media.url}
                                    alt={media.caption || `Update media ${mediaIndex + 1}`}
                                    className="rounded-lg object-cover w-full h-32"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-gray-500 text-lg mb-2">No updates yet</p>
                          <p className="text-sm text-gray-400">
                            {project && project.ownerId._id === user?._id 
                              ? "Share your progress and new features with the community!"
                              : "Check back later for project updates."
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="comments" className="mt-6">
                    {/* Thread Summary */}
                    <ThreadSummary 
                      projectId={id!}
                      commentCount={comments.length}
                    />

                    {/* Comment Form */}
                    {isAuthenticated ? (
                      <form onSubmit={handleSubmitComment} className="mb-6">
                        <Textarea
                          placeholder="Share your thoughts about this project..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="mb-3"
                          rows={3}
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
            </div>

            {/* Sidebar */}
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Project Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">{formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium">{formatDate(project.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Views</span>
                    <span className="font-medium">{project.analytics?.views || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comments</span>
                    <span className="font-medium">{project.analytics?.totalComments || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subscribers</span>
                    <span className="font-medium">{project.analytics?.subscribers || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}