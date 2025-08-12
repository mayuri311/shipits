import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle, Clock, Edit3, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { commentsApi, projectsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ThreadSummaryProps {
  projectId: string;
  commentCount: number;
  onSummaryUpdate?: (summary: string) => void;
}

export function ThreadSummary({ projectId, commentCount, onSummaryUpdate }: ThreadSummaryProps) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  
  const [summary, setSummary] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSummary, setHasSummary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');

  useEffect(() => {
    if (commentCount > 0) {
      fetchSummary();
    }
  }, [projectId, commentCount]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await commentsApi.getThreadSummary(projectId);
      
      if (response.success) {
        setSummary(response.data.summary);
        setLastUpdated(response.data.lastUpdated ? new Date(response.data.lastUpdated) : null);
        setHasSummary(response.data.hasSummary);
        setDraftSummary(response.data.summary || '');
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate summaries.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      
      const response = await commentsApi.generateThreadSummary(projectId);
      
      if (response.success) {
        setSummary(response.data.summary);
        setLastUpdated(new Date(response.data.lastUpdated));
        setHasSummary(true);
        setDraftSummary(response.data.summary || '');
        
        if (onSummaryUpdate) {
          onSummaryUpdate(response.data.summary);
        }
        
        toast({
          title: response.data.generated ? "Summary Generated" : "Summary Retrieved",
          description: response.data.generated 
            ? "AI has generated a new summary of this discussion."
            : "Retrieved existing summary from cache.",
        });
      }
    } catch (err: any) {
      console.error('Error generating summary:', err);
      const errorMessage = err.message || 'Failed to generate summary';
      setError(errorMessage);
      
      toast({
        title: "Summary Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const canEdit = (projectOwnerId?: string) => {
    if (!user) return false;
    if (!projectOwnerId) return false;
    return user._id === projectOwnerId || user.role === 'admin';
  };

  const onEditClick = () => {
    setDraftSummary(summary || '');
    setIsEditing(true);
  };

  const onCancelEdit = () => {
    setIsEditing(false);
    setDraftSummary(summary || '');
  };

  const onSaveEdit = async () => {
    if (!draftSummary.trim()) return;
    try {
      const resp = await projectsApi.saveAISummary(projectId, draftSummary.trim());
      if (resp.success) {
        setSummary(draftSummary.trim());
        setIsEditing(false);
        toast({ title: 'Saved', description: 'Summary updated.' });
        onSummaryUpdate?.(draftSummary.trim());
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save summary', variant: 'destructive' });
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 30) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Don't show the component if there are no comments
  if (commentCount === 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Discussion Summary</h3>
          {lastUpdated && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{formatLastUpdated(lastUpdated)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateSummary}
            disabled={generating || loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : hasSummary ? 'Refresh' : 'Generate'}
          </Button>
          {/* Edit button is conditionally rendered by parent with ownerId via onSummaryUpdate or pass-in as needed */}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading summary...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded border border-red-200">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {summary && !loading && !error && !isEditing && (
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 leading-relaxed mb-2">{summary}</p>
          {/* Consumers can conditionally show edit button. For simplicity, expose via CSS hook. */}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-2 hidden [data-can-edit='true']:inline-flex" onClick={onEditClick}>
              <Edit3 className="w-4 h-4 mr-1" /> Edit
            </Button>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="space-y-2">
          <textarea
            value={draftSummary}
            onChange={(e) => setDraftSummary(e.target.value)}
            rows={4}
            className="w-full border rounded p-2 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSaveEdit} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {!summary && !loading && !error && commentCount > 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500 mb-3">
            Get an AI-powered summary of this {commentCount} comment discussion.
          </p>
          <Button
            onClick={generateSummary}
            disabled={generating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Sparkles className="w-4 h-4" />
            Generate Summary
          </Button>
        </div>
      )}
    </div>
  );
}