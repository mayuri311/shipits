import { useState } from "react";
import { Heart, Trash2, Edit3, Save, X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";
import MarkdownEditor from "@/components/MarkdownEditor";
import type { Comment } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { commentsApi, reportsApi } from "@/lib/api";
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
  onEdit?: (commentId: string, newContent: string) => void;
}

export function CommentThread({
  comment,
  allComments,
  onReply,
  onDelete,
  submittingReply,
  formatDate,
  depth = 0,
  onReactionUpdate,
  onEdit
}: CommentThreadProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [liking, setLiking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState<'spam' | 'abuse' | 'harassment' | 'hate' | 'sexual' | 'self-harm' | 'copyright' | 'other'>('spam');
  const [reportDetails, setReportDetails] = useState('');

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

  const handleEdit = () => {
    setEditing(true);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const result = await commentsApi.updateComment(comment._id, editContent.trim());
      if (result.success) {
        setEditing(false);
        if (onEdit) {
          onEdit(comment._id, editContent.trim());
        }
        toast({
          title: "Success",
          description: "Comment updated successfully"
        });
      } else {
        throw new Error(result.error || "Failed to update comment");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update comment",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditContent(comment.content);
  };

  const submitReport = async () => {
    if (!isAuthenticated) {
      toast({ title: 'Authentication Required', description: 'Please log in to report content.', variant: 'destructive' });
      return;
    }
    setReporting(true);
    try {
      const res = await reportsApi.createReport({ targetType: 'comment', targetId: comment._id, reason: reportReason, details: reportDetails || undefined });
      if (res.success) {
        toast({ title: 'Reported', description: 'Thank you. Our moderators will review this comment.' });
        setShowReportDialog(false);
        setReportDetails('');
      } else {
        throw new Error(res.error || 'Failed to report');
      }
    } catch (e: any) {
      toast({ title: 'Report Failed', description: e.message || 'Please try again later.', variant: 'destructive' });
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-4' : ''}`}>
      <div className="bg-gray-50 rounded-lg p-4 relative">
        {/* Edit/Delete controls for owner and admin */}
        {isAuthenticated && (
          (comment.authorId._id === user?._id || user?.role === 'admin') && (
            <div className="absolute top-2 right-2 flex items-center gap-1">
              {comment.authorId._id === user?._id && !editing && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleEdit}
                    title="Edit comment"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(comment)}
                    title="Delete comment"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
              {user?.role === 'admin' && comment.authorId._id !== user?._id && !editing && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onDelete(comment)}
                  title="Admin delete"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          )
        )}
        
        <div className="flex items-start justify-between mb-2 pr-16">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">
              {comment.authorId?.fullName || comment.authorId?.username}
            </span>
            {comment.type === 'question' && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                Question
              </span>
            )}
            {comment.edited && (
              <span className="text-xs text-gray-500 italic">(edited)</span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {formatDate(comment.createdAt)}
          </span>
        </div>
        
        {editing ? (
          <div className="mb-3 space-y-2">
            <MarkdownEditor value={editContent} onChange={setEditContent} />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveEdit}
                size="sm"
                disabled={saving || !editContent.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? (
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
                disabled={saving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <TranslatedMarkdown
            sourceType="comment"
            sourceId={comment._id}
            field="content"
            text={comment.content}
            className="mb-3"
          />
        )}
        <div className="flex items-center gap-4 text-sm">
          <button 
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center gap-1 transition-colors hover:text-red-500 ${
              comment.reactions?.some(r => r.userId === user?._id) ? 'text-red-500' : 'text-gray-500'
            } ${liking ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={comment.reactions?.some(r => r.userId === user?._id) ? 
              `Unlike comment (${comment.reactions?.length || 0} likes)` : 
              `Like comment (${comment.reactions?.length || 0} likes)`}
            title={comment.reactions?.some(r => r.userId === user?._id) ? 'Unlike comment' : 'Like comment'}
          >
            <Heart className={`w-4 h-4 ${comment.reactions?.some(r => r.userId === user?._id) ? 'fill-current' : ''}`} aria-hidden="true" />
            <span>{comment.reactions?.length || 0}</span>
          </button>
          <button
            onClick={() => setShowReportDialog(true)}
            className="flex items-center gap-1 text-gray-500 hover:text-orange-600"
            aria-label="Report comment"
            title="Report comment"
          >
            <Flag className="w-4 h-4" /> Report
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-gray-600 hover:text-gray-900 h-auto p-0"
            aria-label={showReplyForm ? 'Cancel reply' : 'Reply to comment'}
            title={showReplyForm ? 'Cancel reply' : 'Reply to comment'}
          >
            Reply
          </Button>
        </div>

        {showReplyForm && (
          <div className="mt-4 p-3 bg-white rounded border">
            <MarkdownEditor value={replyContent} onChange={setReplyContent} />
            <div className="flex justify-end gap-2 mt-3">
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
              onReactionUpdate={onReactionUpdate}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
      {showReportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 space-y-3">
            <div className="text-lg font-semibold">Report Comment</div>
            <div className="text-sm text-gray-600">Select a reason and optionally add details.</div>
            <div>
              <select
                className="w-full border rounded px-2 py-2"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value as any)}
              >
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
              <Textarea
                placeholder="Additional details (optional)"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
              <Button onClick={submitReport} disabled={reporting} className="bg-orange-600 hover:bg-orange-700">
                {reporting ? 'Reporting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}