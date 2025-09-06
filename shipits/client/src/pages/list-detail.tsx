import { useState, useEffect } from 'react';
import { Link, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  MoreVertical,
  ThumbsUp,
  HelpCircle,
  AlertTriangle,
  Flag,
  Eye,
  Users,
  Star,
  Clock,
  Globe,
  Lock,
  ListIcon,
  MessageSquare,
  Heart,
  Bookmark,
  LogIn,
  Menu,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { listsApi, reportsApi } from '@/lib/api';
import { AuthModal } from '@/components/AuthModal';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface ListItem {
  _id: string;
  title: string;
  content: string;
  order: number;
  metadata: {
    url?: string;
    type: string;
    tags: string[];
    description?: string;
    category?: string;
    rating?: number;
    price?: {
      amount: number;
      currency: string;
      isFree: boolean;
    };
  };
  createdBy: {
    _id: string;
    username: string;
    fullName: string;
    profileImage?: string;
  };
  lastEditedBy?: {
    _id: string;
    username: string;
    fullName: string;
    profileImage?: string;
  };
  reactions: Array<{
    userId: string;
    type: 'like' | 'helpful' | 'outdated' | 'spam' | 'upvote';
    timestamp: string;
  }>;
  analytics: {
    views: number;
    clicks: number;
    likes: number;
    helpful: number;
    upvotes: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ListDetail {
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
    college?: string;
    graduationYear?: number;
  };
  isPublic: boolean;
  featured: boolean;
  settings: {
    allowAnonymousContributions: boolean;
    requireApprovalForNewItems: boolean;
    allowItemEditing: boolean;
    allowItemDeletion: boolean;
    maxItemsPerUser?: number;
  };
  analytics: {
    views: number;
    totalItems: number;
    totalContributors: number;
    lastActivity: string;
  };
  createdAt: string;
  updatedAt: string;
}

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

const typeColors: Record<string, string> = {
  'resource': 'bg-blue-100 text-blue-800 border-blue-200',
  'tool': 'bg-orange-100 text-orange-800 border-orange-200',
  'article': 'bg-green-100 text-green-800 border-green-200',
  'video': 'bg-red-100 text-red-800 border-red-200',
  'book': 'bg-purple-100 text-purple-800 border-purple-200',
  'course': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'company': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'person': 'bg-pink-100 text-pink-800 border-pink-200',
  'event': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'other': 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function ListDetail() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<ListItem | null>(null);
  const [newItem, setNewItem] = useState({
    title: '',
    content: '',
    url: '',
    type: 'resource',
    description: '',
    rating: 0
  });
  
  const [editItem, setEditItem] = useState({
    title: '',
    content: '',
    url: '',
    type: 'resource',
    description: '',
    rating: 0
  });
  
  // Real-time updates state
  const [realtimeItems, setRealtimeItems] = useState<ListItem[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [eventSourceRef, setEventSourceRef] = useState<EventSource | null>(null);
  
  // Mobile state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Report state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportingItem, setReportingItem] = useState<ListItem | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  const { data: listData, isLoading, error, refetch } = useQuery({
    queryKey: ['list', id],
    queryFn: async () => {
      const response = await fetch(`/api/lists/${id}`);
      if (!response.ok) throw new Error('Failed to fetch list');

      const result = await response.json();
      return result.data as { list: ListDetail; items: ListItem[] };
    },
    enabled: !!id,
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: 'always' // Always refetch on mount to get latest data
  });

  // Set up real-time updates
  useEffect(() => {
    if (!id || !listData) return;

    // Initialize realtime items with current items, ensuring we have the latest data
    setRealtimeItems(listData.items);

    // Set up SSE connection
    const eventSource = listsApi.stream(id, (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        switch (payload.type) {
          case 'connected':
            console.log('Connected to list stream:', payload.data.clientId);
            break;
            
          case 'viewer_count':
            setViewerCount(payload.data.count);
            break;
            
          case 'item_added':
            if (payload.data.approved) {
              setRealtimeItems(prev => [...prev, payload.data.item]);
              toast({
                title: 'New item added',
                description: `${payload.data.item.createdBy.fullName || payload.data.item.createdBy.username} added "${payload.data.item.title}"`
              });
            }
            break;
            
          case 'item_updated':
            setRealtimeItems(prev => 
              prev.map(item => 
                item._id === payload.data.item._id ? payload.data.item : item
              )
            );
            if (payload.data.editedBy._id !== user?._id) {
              toast({
                title: 'Item updated',
                description: `${payload.data.editedBy.fullName || payload.data.editedBy.username} updated an item`
              });
            }
            break;
            
          case 'item_deleted':
            setRealtimeItems(prev => 
              prev.filter(item => item._id !== payload.data.itemId)
            );
            if (payload.data.deletedBy._id !== user?._id) {
              toast({
                title: 'Item deleted',
                description: `${payload.data.deletedBy.fullName || payload.data.deletedBy.username} deleted an item`
              });
            }
            break;
            
                    case 'item_reaction_updated':
            console.log('🔄 Real-time reaction update:', payload.data);
            setRealtimeItems(prev =>
              prev.map(item => {
                if (item._id === payload.data.itemId) {
                  console.log('📝 Updating item:', item._id, 'Current likes:', item.analytics.likes);

                  // Get current reactions, ensuring it's an array
                  const currentReactions = Array.isArray(item.reactions) ? item.reactions : [];

                  let updatedReactions;
                  let updatedAnalytics = { ...item.analytics };

                  if (payload.data.action === 'added') {
                    // Remove any existing reaction of the same type from this user, then add new one
                    const filteredReactions = currentReactions.filter(r =>
                      !(r.userId === payload.data.userId && r.type === payload.data.reactionType)
                    );
                    updatedReactions = [...filteredReactions, {
                      userId: payload.data.userId,
                      type: payload.data.reactionType,
                      timestamp: new Date().toISOString()
                    }];

                    // Update analytics count
                    if (payload.data.reactionType === 'like') {
                      updatedAnalytics.likes = (updatedAnalytics.likes || 0) + 1;
                    } else if (payload.data.reactionType === 'helpful') {
                      updatedAnalytics.helpful = (updatedAnalytics.helpful || 0) + 1;
                    } else if (payload.data.reactionType === 'upvote') {
                      updatedAnalytics.upvotes = (updatedAnalytics.upvotes || 0) + 1;
                    }
                  } else {
                    // Remove the specific reaction
                    updatedReactions = currentReactions.filter(r =>
                      !(r.userId === payload.data.userId && r.type === payload.data.reactionType)
                    );

                    // Update analytics count
                    if (payload.data.reactionType === 'like') {
                      updatedAnalytics.likes = Math.max(0, (updatedAnalytics.likes || 0) - 1);
                    } else if (payload.data.reactionType === 'helpful') {
                      updatedAnalytics.helpful = Math.max(0, (updatedAnalytics.helpful || 0) - 1);
                    } else if (payload.data.reactionType === 'upvote') {
                      updatedAnalytics.upvotes = Math.max(0, (updatedAnalytics.upvotes || 0) - 1);
                    }
                  }

                  console.log('📝 Updated likes:', updatedAnalytics.likes);
                  return {
                    ...item,
                    reactions: updatedReactions,
                    analytics: updatedAnalytics
                  };
                }
                return item;
              })
            );
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    });

    setEventSourceRef(eventSource);

    return () => {
      eventSource.close();
    };
  }, [id, listData, user?._id, toast]);

  // Handle visibility change and focus to refetch data when user returns to tab/list
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && id) {
        refetch(); // Refetch data when user returns to tab
      }
    };

    const handleFocus = () => {
      if (id) {
        refetch(); // Refetch data when component regains focus
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [id, refetch]);

  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch(`/api/lists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      if (!response.ok) throw new Error('Failed to add item');
      return response.json();
    },
    onSuccess: (result) => {
      // The real-time update will handle adding the item to the list
      setIsAddingItem(false);
      setNewItem({ title: '', content: '', url: '', type: 'resource', description: '', rating: 0 });
      
      if (listData?.list.settings.requireApprovalForNewItems) {
        toast({ title: 'Success', description: 'Item submitted for approval!' });
      } else {
        toast({ title: 'Success', description: 'Item added successfully!' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const editItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const response = await fetch(`/api/lists/${id}/items/${editingItem!._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
    onSuccess: (result) => {
      // The real-time update will handle updating the item in the list
      setEditingItem(null);
      setEditItem({ title: '', content: '', url: '', type: 'resource', description: '', rating: 0 });
      toast({ title: 'Success', description: 'Item updated successfully!' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/lists/${id}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to delete item');
      return response.json();
    },
    onSuccess: (result) => {
      // The real-time update will handle removing the item from the list
      toast({ title: 'Success', description: 'Item deleted successfully!' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const reactToItemMutation = useMutation({
    mutationFn: async ({ itemId, type }: { itemId: string; type: string }) => {
      console.log('🔥 Sending reaction:', { itemId, type });
      const response = await fetch(`/api/lists/${id}/items/${itemId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      if (!response.ok) throw new Error('Failed to react to item');
      const result = await response.json();
      console.log('✅ Reaction response:', result);
      return result;
    },
    onError: (error) => {
      console.error('❌ Reaction error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const deleteListMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lists/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to delete list');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'List deleted',
        description: 'The list has been successfully deleted.',
        variant: 'default'
      });
      // Navigate to home page
      window.location.href = '/';
    },
    onError: (error: any) => {
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete the list',
        variant: 'destructive'
      });
    }
  });

  const trackItemAction = async (itemId: string, action: string) => {
    try {
      await fetch(`/api/lists/${id}/items/${itemId}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
    } catch (error) {
      console.error('Failed to track action:', error);
    }
  };

  const handleReportItem = (item: ListItem) => {
    setReportingItem(item);
    setReportReason('');
    setReportDetails('');
    setShowReportDialog(true);
  };

  const submitReport = async () => {
    if (!reportingItem || !reportReason.trim()) {
      toast({ title: 'Error', description: 'Please select a reason for reporting', variant: 'destructive' });
      return;
    }

    try {
      const result = await reportsApi.createReport({
        targetType: 'listItem',
        targetId: reportingItem._id,
        reason: reportReason,
        details: reportDetails.trim() || undefined
      });

      if (result.success) {
        toast({ title: 'Report submitted', description: 'Thank you for helping keep our community safe. Our moderators will review this report.' });
        setShowReportDialog(false);
        setReportingItem(null);
        setReportReason('');
        setReportDetails('');
      } else {
        throw new Error(result.error || 'Failed to submit report');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to submit report', variant: 'destructive' });
    }
  };

  const handleAddItem = () => {
    if (!newItem.title.trim() || !newItem.content.trim()) {
      toast({ title: 'Error', description: 'Title and content are required', variant: 'destructive' });
      return;
    }

    const itemData = {
      title: newItem.title,
      content: newItem.content,
      metadata: {
        url: newItem.url || undefined,
        type: newItem.type,
        description: newItem.description || undefined,
        rating: newItem.rating > 0 ? newItem.rating : undefined,
        tags: []
      }
    };

    addItemMutation.mutate(itemData);
  };

  const handleEditItem = () => {
    if (!editItem.title.trim() || !editItem.content.trim()) {
      toast({ title: 'Error', description: 'Title and content are required', variant: 'destructive' });
      return;
    }

    const itemData = {
      title: editItem.title,
      content: editItem.content,
      metadata: {
        url: editItem.url || undefined,
        type: editItem.type,
        description: editItem.description || undefined,
        rating: editItem.rating > 0 ? editItem.rating : undefined,
        tags: []
      }
    };

    editItemMutation.mutate(itemData);
  };

  const handleStartEdit = (item: ListItem) => {
    setEditingItem(item);
    setEditItem({
      title: item.title,
      content: item.content,
      url: item.metadata.url || '',
      type: item.metadata.type,
      description: item.metadata.description || '',
      rating: item.metadata.rating || 0
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const handleCopyUrl = async (url: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      await trackItemAction(itemId, 'copy');
      toast({ title: 'Copied!', description: 'URL copied to clipboard' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to copy URL', variant: 'destructive' });
    }
  };

  const handleExternalLink = async (url: string, itemId: string) => {
    await trackItemAction(itemId, 'click');

    // For mobile devices, try to open in same tab first, then fallback to new tab
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      try {
        // Try to open in new tab
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        // If popup is blocked, redirect current tab after a short delay
        if (!newWindow) {
          setTimeout(() => {
            window.location.href = url;
          }, 100);
        }
      } catch (error) {
        // Fallback for any errors
        window.location.href = url;
      }
    } else {
      // Desktop: open in new tab as usual
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const canContribute = () => {
    if (!listData?.list) return false;
    if (!isAuthenticated) return false;
    
    const list = listData.list;
    return list.settings.allowAnonymousContributions ||
           list.createdBy._id === user?._id ||
           list.collaborators?.some((c: any) => c.userId._id === user?._id);
  };

  const canEdit = (item: ListItem) => {
    if (!listData?.list) return false;
    if (!isAuthenticated) return false;
    
    const list = listData.list;
    // Check if item editing is allowed by list settings
    if (!list.settings.allowItemEditing) return false;
    
    // Item creator can always edit
    if (item.createdBy._id === user?._id) return true;
    
    // List owner can edit any item
    if (list.createdBy._id === user?._id) return true;
    
    // Editor collaborators can edit items
    const userCollaborator = list.collaborators?.find((c: any) => c.userId._id === user?._id);
    return userCollaborator?.role === 'editor';
  };

  const canDelete = (item: ListItem) => {
    if (!listData?.list) return false;
    if (!isAuthenticated) return false;
    
    const list = listData.list;
    
    // Admin users can delete any item
    if (user?.role === 'admin') return true;
    
    // Check if item deletion is allowed by list settings
    if (!list.settings.allowItemDeletion) return false;
    
    // Item creator can always delete
    if (item.createdBy._id === user?._id) return true;
    
    // List owner can delete any item
    if (list.createdBy._id === user?._id) return true;
    
    // Editor collaborators can delete items
    const userCollaborator = list.collaborators?.find((c: any) => c.userId._id === user?._id);
    return userCollaborator?.role === 'editor';
  };

  const ListItemCard = ({ item }: { item: ListItem }) => {
    const userLikeReaction = item.reactions?.find(r => r.userId === user?._id && r.type === 'like');
    const userHelpfulReaction = item.reactions?.find(r => r.userId === user?._id && r.type === 'helpful');
    const userUpvoteReaction = item.reactions?.find(r => r.userId === user?._id && r.type === 'upvote');
    
    return (
      <Card className="group hover:shadow-md transition-all duration-200 bg-card border border-border">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={cn('text-xs', typeColors[item.metadata.type])}>
                  {item.metadata.type}
                </Badge>
                {item.metadata.rating && (
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn('w-3 h-3',
                          i < item.metadata.rating! ? 'text-yellow-400 fill-current' : 'text-foreground/40'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <CardTitle className="text-lg font-semibold mb-2 line-clamp-2 text-foreground">
                {item.metadata.url ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleExternalLink(item.metadata.url!, item._id);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleExternalLink(item.metadata.url!, item._id);
                    }}
                    className="text-left hover:text-blue-600 transition-colors flex items-center gap-2 min-h-[44px] w-full touch-manipulation select-none"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {item.title}
                    <ExternalLink className="w-4 h-4 opacity-60" />
                  </button>
                ) : (
                  item.title
                )}
              </CardTitle>

              {item.metadata.description && (
                <CardDescription className="text-sm text-foreground/70 mb-3">
                  {item.metadata.description}
                </CardDescription>
              )}
            </div>
            
            {isAuthenticated && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.metadata.url && (
                    <DropdownMenuItem onClick={() => handleCopyUrl(item.metadata.url!, item._id)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy URL
                    </DropdownMenuItem>
                  )}
                  {canEdit(item) && (
                    <DropdownMenuItem onClick={() => handleStartEdit(item)}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete(item) && (
                    <DropdownMenuItem 
                      onClick={() => handleDeleteItem(item._id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleReportItem(item)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="prose prose-sm max-w-none mb-4">
            <MarkdownRenderer content={item.content} />
          </div>
          
          <div className="flex items-center justify-between text-sm text-foreground/60 mb-4">
            <div className="flex items-center gap-2">
              <Avatar className="w-5 h-5">
                <AvatarImage src={item.createdBy.profileImage} />
                <AvatarFallback className="text-xs">
                  {item.createdBy.fullName?.[0] || item.createdBy.username[0]}
                </AvatarFallback>
              </Avatar>
              <span>{item.createdBy.fullName || item.createdBy.username}</span>
              {item.lastEditedBy && item.lastEditedBy._id !== item.createdBy._id && (
                <span className="text-foreground/60">
                  · edited by {item.lastEditedBy.fullName || item.lastEditedBy.username}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTimeAgo(item.updatedAt)}</span>
            </div>
          </div>
          
          {isAuthenticated && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => reactToItemMutation.mutate({ itemId: item._id, type: 'upvote' })}
                  className={cn(
                    'h-8 px-2 text-xs',
                    userUpvoteReaction && 'bg-orange-50 text-orange-600'
                  )}
                >
                  <ChevronUp className="w-3 h-3 mr-1" />
                  {item.analytics.upvotes || 0}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => reactToItemMutation.mutate({ itemId: item._id, type: 'like' })}
                  className={cn(
                    'h-8 px-2 text-xs',
                    userLikeReaction && 'bg-blue-50 text-blue-600'
                  )}
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  {item.analytics.likes}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => reactToItemMutation.mutate({ itemId: item._id, type: 'helpful' })}
                  className={cn(
                    'h-8 px-2 text-xs',
                    userHelpfulReaction && 'bg-green-50 text-green-600'
                  )}
                >
                  <HelpCircle className="w-3 h-3 mr-1" />
                  {item.analytics.helpful}
                </Button>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-foreground/60">
                <Eye className="w-3 h-3" />
                {item.analytics.views}
                {item.metadata.url && (
                  <>
                    <span className="mx-1">·</span>
                    <ExternalLink className="w-3 h-3" />
                    {item.analytics.clicks}
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-foreground/70">Loading list...</p>
        </div>
      </div>
    );
  }

  if (error || !listData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">List not found</h2>
          <p className="text-foreground/70 mb-4">The list you're looking for doesn't exist or has been deleted.</p>
          <Link href="/lists">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lists
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { list, items } = listData;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-foreground hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide text-sm sm:text-base">
              HOME
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2 sm:gap-4 lg:gap-6">
              <Link href="/forum">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  FORUM
                </Button>
              </Link>
              <Link href="/lists" className="text-foreground hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide">
                LISTS
              </Link>
              <Link href="/dashboard" className="text-foreground hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide">
                DASHBOARD
              </Link>
              <Link href="/profile" className="text-foreground hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide">
                PROFILE
              </Link>
              {!isAuthenticated && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAuthModal(true)}
                  className="text-xs sm:text-sm px-2 sm:px-3"
                >
                  <LogIn className="w-4 h-4 mr-1" />
                  LOGIN
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
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="flex flex-col gap-4 pt-6">
                    <Link href="/forum" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        FORUM
                      </Button>
                    </Link>
                    <Link href="/lists" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        LISTS
                      </Button>
                    </Link>
                    <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        DASHBOARD
                      </Button>
                    </Link>
                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        PROFILE
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
                        LOGIN
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
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Link href="/lists" className="text-sm text-foreground/70 hover:text-blue-600">
              Lists
            </Link>
            <span className="text-foreground/40">/</span>
            <span className="text-sm font-medium text-foreground">{list.title}</span>
          </div>

          {/* List Header */}
          <div className="bg-card rounded-lg border border-border p-4 md:p-6 mb-6 md:mb-8">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                <Badge variant="outline" className="text-xs md:text-sm">
                  {list.category.replace('-', ' ')}
                </Badge>
                {list.featured && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-xs md:text-sm text-foreground/60">
                  {list.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {list.isPublic ? 'Public' : 'Private'}
                </div>
              </div>

              <h1 className="text-xl md:text-3xl font-bold text-foreground">{list.title}</h1>
              <p className="text-foreground/80 text-sm md:text-lg">{list.description}</p>
              
              <div className="flex flex-wrap gap-2">
                {list.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs md:text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Stats and Creator Info - Mobile Responsive */}
            <div className="mt-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
              {/* Stats */}
              <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-6 text-xs md:text-sm text-foreground/60">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{list.analytics.views} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <ListIcon className="w-4 h-4" />
                  <span>{list.analytics.totalItems} items</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{Array.isArray(list.analytics.totalContributors) ? list.analytics.totalContributors.length : list.analytics.totalContributors} contributors</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className="hidden md:inline">Updated {formatTimeAgo(list.analytics.lastActivity)}</span>
                  <span className="md:hidden">{formatTimeAgo(list.analytics.lastActivity)}</span>
                </div>
              </div>
              
              {/* Creator Info */}
              <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={list.createdBy.profileImage} />
                  <AvatarFallback>
                    {list.createdBy.fullName?.[0] || list.createdBy.username[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {list.createdBy.fullName || list.createdBy.username}
                  </p>
                  {list.createdBy.college && (
                    <p className="text-foreground/60 text-xs">
                      {list.createdBy.college}
                      {list.createdBy.graduationYear && ` '${list.createdBy.graduationYear.toString().slice(-2)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex flex-wrap gap-2">
            {isAuthenticated && canContribute() ? (
              <Button
                onClick={() => setIsAddingItem(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            ) : !isAuthenticated ? (
              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login to Add Items
              </Button>
            ) : null}

            {/* Refresh Button */}
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="ml-auto"
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh Votes
            </Button>

            {/* Delete List Button - Only for owner */}
            {isAuthenticated && list.createdBy._id === user?._id && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
                    deleteListMutation.mutate();
                  }
                }}
                disabled={deleteListMutation.isPending}
                className="ml-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteListMutation.isPending ? 'Deleting...' : 'Delete List'}
              </Button>
            )}
          </div>

          {/* Live Viewer Count */}
          {viewerCount > 1 && (
            <div className="mb-4 flex items-center gap-2 text-sm text-foreground/60">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-medium">{viewerCount} people</span>
              <span>viewing this list</span>
            </div>
          )}

          {/* Items Grid */}
          {realtimeItems.length === 0 ? (
            <div className="text-center py-12">
              <ListIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground/80 mb-2">No items yet</h3>
              <p className="text-foreground/70 mb-6">Be the first to contribute to this list!</p>
              {isAuthenticated && canContribute() && (
                <Button onClick={() => setIsAddingItem(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {realtimeItems
                .sort((a, b) => (b.analytics.upvotes || 0) - (a.analytics.upvotes || 0))
                .map((item, index) => (
                <div key={item._id} className="relative">
                  {/* Desktop: Numbers outside the card */}
                  <div className="hidden md:flex absolute -left-8 top-4 w-6 h-6 bg-blue-100 text-blue-600 rounded-full items-center justify-center text-xs font-semibold z-10">
                    {index + 1}
                  </div>

                  <ListItemCard item={item} />

                  {/* Mobile: Numbers as overlay on top of card */}
                  <div className="md:hidden absolute top-4 left-2 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold z-20 shadow-sm">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Item Dialog */}
          <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Item</DialogTitle>
                <DialogDescription>
                  Contribute a new resource, tool, or piece of information to this list.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
                  <Input
                    placeholder="Enter item title..."
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
                    <Select value={newItem.type} onValueChange={(value) => setNewItem({ ...newItem, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resource">Resource</SelectItem>
                        <SelectItem value="tool">Tool</SelectItem>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="book">Book</SelectItem>
                        <SelectItem value="course">Course</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="person">Person</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">URL (Optional)</label>
                    <Input
                      placeholder="https://..."
                      value={newItem.url}
                      onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                  <Textarea
                    placeholder="Write your content in markdown..."
                    value={newItem.content}
                    onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                    rows={6}
                  />
                  <p className="text-xs text-foreground/60 mt-1">Supports markdown formatting</p>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddingItem(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
                    {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Item Dialog */}
          <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Item</DialogTitle>
                <DialogDescription>
                  Update the information for this list item.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
                  <Input
                    placeholder="Enter item title..."
                    value={editItem.title}
                    onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
                    <Select value={editItem.type} onValueChange={(value) => setEditItem({ ...editItem, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resource">Resource</SelectItem>
                        <SelectItem value="tool">Tool</SelectItem>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="book">Book</SelectItem>
                        <SelectItem value="course">Course</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="person">Person</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">URL (Optional)</label>
                    <Input
                      placeholder="https://..."
                      value={editItem.url}
                      onChange={(e) => setEditItem({ ...editItem, url: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                  <Textarea
                    placeholder="Write your content in markdown..."
                    value={editItem.content}
                    onChange={(e) => setEditItem({ ...editItem, content: e.target.value })}
                    rows={6}
                  />
                  <p className="text-xs text-foreground/60 mt-1">Supports markdown formatting</p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingItem(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditItem} disabled={editItemMutation.isPending}>
                    {editItemMutation.isPending ? 'Updating...' : 'Update Item'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Report Item Dialog */}
          <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Report Item</DialogTitle>
                <DialogDescription>
                  Help us maintain a safe community by reporting inappropriate content.
                </DialogDescription>
              </DialogHeader>

              {reportingItem && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-foreground">{reportingItem.title}</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      by {reportingItem.createdBy.fullName || reportingItem.createdBy.username}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Reason for reporting</label>
                    <Select value={reportReason} onValueChange={setReportReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spam">Spam</SelectItem>
                        <SelectItem value="abuse">Abuse/Harassment</SelectItem>
                        <SelectItem value="hate">Hate Speech</SelectItem>
                        <SelectItem value="sexual">Sexual Content</SelectItem>
                        <SelectItem value="self-harm">Self-Harm</SelectItem>
                        <SelectItem value="copyright">Copyright Infringement</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Additional details (optional)</label>
                    <Textarea
                      placeholder="Provide more context about why you're reporting this item..."
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={submitReport}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Submit Report
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
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
