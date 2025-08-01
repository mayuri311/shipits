import { useState } from "react";
import { Heart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Comment } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { commentsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CommentThreadProps {
  comment: Comment;
  allComments: Comment[];
  onReply: (parentId: string, content: string) => void;
  onDelete: (comment: Comment) => void;
  submittingReply: boolean;
  formatDate: (date: string | Date) => string;
  depth?: number;
  onReactionUpdate?: (commentId: string, reactions: any[]) => void;
}

export function CommentThread({
  comment,
  allComments,
  onReply,
  onDelete,
  submittingReply,
  formatDate,
  depth = 0,
  onReactionUpdate
}: CommentThreadProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [liking, setLiking] = useState(false);

  // Get replies to this comment
  const replies = allComments.filter(c => c.parentCommentId === comment._id);

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply(comment._id, replyContent);
      setReplyContent("");
      setShowReplyForm(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to react to comments.",
        variant: "destructive",
      });
      return;
    }

    setLiking(true);

    try {
      const userReaction = comment.reactions?.find(r => r.userId === user?._id);
      console.log('Current user reaction:', userReaction, 'User ID:', user?._id);
      
      const response = userReaction 
        ? await commentsApi.removeReaction(comment._id)
        : await commentsApi.addReaction(comment._id, 'like');

      console.log('Reaction API response:', response);

      if (response.success && onReactionUpdate) {
        onReactionUpdate(comment._id, response.data.reactions);
        toast({
          title: userReaction ? "❤️ Removed" : "❤️ Liked",
          description: userReaction 
            ? "Removed your heart from this comment."
            : "Hearted this comment!",
        });
      } else {
        throw new Error(response.error || 'Failed to update reaction');
      }
    } catch (err) {
      console.error('Error updating reaction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to update reaction: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLiking(false);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-4' : ''}`}>
      <div className="bg-gray-50 rounded-lg p-4 relative">
        {user?.role === 'admin' && (
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
            onClick={() => onDelete(comment)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
        <div className="flex items-start justify-between mb-2 pr-8">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {comment.authorId?.fullName || comment.authorId?.username}
            </span>
            {comment.type === 'question' && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                Question
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {formatDate(comment.createdAt)}
          </span>
        </div>
        <p className="text-gray-700 whitespace-pre-line mb-3">
          {comment.content}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <button 
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center gap-1 transition-colors hover:text-red-500 ${
              comment.reactions?.some(r => r.userId === user?._id) ? 'text-red-500' : 'text-gray-500'
            } ${liking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Heart className={`w-4 h-4 ${comment.reactions?.some(r => r.userId === user?._id) ? 'fill-current' : ''}`} />
            <span>{comment.reactions?.length || 0}</span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-gray-600 hover:text-gray-900 h-auto p-0"
          >
            Reply
          </Button>
        </div>

        {showReplyForm && (
          <div className="mt-4 p-3 bg-white rounded border">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              rows={3}
              className="mb-3"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={submittingReply || !replyContent.trim()}
                className="bg-maroon hover:bg-maroon/90"
              >
                {submittingReply ? "Posting..." : "Reply"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Render replies recursively */}
      {replies.length > 0 && (
        <div className="mt-2">
          {replies.map((reply) => (
            <CommentThread
              key={reply._id}
              comment={reply}
              allComments={allComments}
              onReply={onReply}
              onDelete={onDelete}
              submittingReply={submittingReply}
              formatDate={formatDate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}