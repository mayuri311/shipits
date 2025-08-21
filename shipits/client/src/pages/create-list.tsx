import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Plus, 
  X,
  Globe,
  Lock,
  Users,
  Settings,
  Info,
  Sparkles,
  CheckCircle,
  AlertCircle,
  LogIn,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const categories = [
  { value: 'funding', label: 'Funding & Grants', description: 'Funding sources, grants, scholarships' },
  { value: 'venture-capital', label: 'Venture Capital', description: 'VC firms, investors, accelerators' },
  { value: 'resources', label: 'Resources', description: 'General resources and references' },
  { value: 'tools', label: 'Tools & Software', description: 'Software tools, platforms, services' },
  { value: 'learning', label: 'Learning', description: 'Educational content and materials' },
  { value: 'networking', label: 'Networking', description: 'Networking opportunities and communities' },
  { value: 'jobs', label: 'Jobs & Careers', description: 'Job boards, career resources' },
  { value: 'startups', label: 'Startups', description: 'Startup resources and companies' },
  { value: 'research', label: 'Research', description: 'Research papers, studies, data' },
  { value: 'events', label: 'Events', description: 'Conferences, meetups, workshops' },
  { value: 'books', label: 'Books', description: 'Recommended reading' },
  { value: 'articles', label: 'Articles', description: 'Articles and blog posts' },
  { value: 'videos', label: 'Videos', description: 'Video content and tutorials' },
  { value: 'courses', label: 'Courses', description: 'Online courses and training' },
  { value: 'communities', label: 'Communities', description: 'Online communities and forums' },
  { value: 'software', label: 'Software', description: 'Software applications and code' },
  { value: 'hardware', label: 'Hardware', description: 'Hardware and physical products' },
  { value: 'design', label: 'Design', description: 'Design resources and inspiration' },
  { value: 'marketing', label: 'Marketing', description: 'Marketing tools and strategies' },
  { value: 'other', label: 'Other', description: 'Other categories not listed above' }
];

export default function CreateList() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: [] as string[],
    isPublic: true,
    settings: {
      allowAnonymousContributions: true,
      requireApprovalForNewItems: false,
      allowItemEditing: true,
      allowItemDeletion: false,
      maxItemsPerUser: 0
    }
  });
  
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Mobile state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const createListMutation = useMutation({
    mutationFn: async (listData: any) => {
      const response = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create list');
      }
      return response.json();
    },
    onSuccess: (result) => {
      toast({ 
        title: 'Success!', 
        description: 'Your list has been created successfully.' 
      });
      setLocation(`/lists/${result.data.list._id}`);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({ 
        title: 'Authentication Required', 
        description: 'Please log in to create a list',
        variant: 'destructive'
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    const listData = {
      ...formData,
      settings: {
        ...formData.settings,
        maxItemsPerUser: formData.settings.maxItemsPerUser > 0 ? formData.settings.maxItemsPerUser : undefined
      }
    };
    
    createListMutation.mutate(listData);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag) && formData.tags.length < 10) {
        setFormData({ ...formData, tags: [...formData.tags, newTag] });
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ 
      ...formData, 
      tags: formData.tags.filter(tag => tag !== tagToRemove) 
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl md:text-2xl">Authentication Required</CardTitle>
            <CardDescription>
              Please log in to create a new list
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setShowAuthModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login to Continue
            </Button>
            <Link href="/lists">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Lists
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* Auth Modal */}
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          defaultTab="login"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-black hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide text-sm sm:text-base">
              HOME
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2 sm:gap-4 lg:gap-6">
              <Link href="/forum">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  FORUM
                </Button>
              </Link>
              <Link href="/lists" className="text-black hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide">
                LISTS
              </Link>
              <Link href="/dashboard" className="text-black hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide">
                DASHBOARD
              </Link>
              <Link href="/profile" className="text-black hover:text-blue-600 transition-colors duration-300 font-medium tracking-wide">
                PROFILE
              </Link>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden">
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
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8 px-2">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Create New List
              </h1>
            </div>
            <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Build a curated collection that helps the community discover valuable resources, tools, and opportunities.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Provide the essential details about your list
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Top Venture Capital Firms for Early Stage Startups"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className={cn(errors.title && 'border-red-500')}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.title}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {formData.title.length}/200 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this list contains and who it's for..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className={cn(errors.description && 'border-red-500')}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {formData.description.length}/1000 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger className={cn(errors.category && 'border-red-500')}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div>
                            <div className="font-medium">{cat.label}</div>
                            <div className="text-sm text-gray-500">{cat.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.category}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="Type a tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">
                    {formData.tags.length}/10 tags
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Privacy & Settings
                </CardTitle>
                <CardDescription>
                  Configure who can see and contribute to your list
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {formData.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      <Label htmlFor="isPublic">Public List</Label>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formData.isPublic 
                        ? 'Anyone can view and discover this list'
                        : 'Only you and invited collaborators can see this list'
                      }
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Contribution Settings</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="allowContributions">Allow Community Contributions</Label>
                      <p className="text-sm text-gray-500">
                        Let anyone add new items to your list
                      </p>
                    </div>
                    <Switch
                      id="allowContributions"
                      checked={formData.settings.allowAnonymousContributions}
                      onCheckedChange={(checked) => 
                        setFormData({ 
                          ...formData, 
                          settings: { ...formData.settings, allowAnonymousContributions: checked }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="requireApproval">Require Approval for New Items</Label>
                      <p className="text-sm text-gray-500">
                        Review new contributions before they appear on the list
                      </p>
                    </div>
                    <Switch
                      id="requireApproval"
                      checked={formData.settings.requireApprovalForNewItems}
                      onCheckedChange={(checked) => 
                        setFormData({ 
                          ...formData, 
                          settings: { ...formData.settings, requireApprovalForNewItems: checked }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="allowEditing">Allow Item Editing</Label>
                      <p className="text-sm text-gray-500">
                        Let contributors edit existing items
                      </p>
                    </div>
                    <Switch
                      id="allowEditing"
                      checked={formData.settings.allowItemEditing}
                      onCheckedChange={(checked) => 
                        setFormData({ 
                          ...formData, 
                          settings: { ...formData.settings, allowItemEditing: checked }
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="allowDeletion">Allow Item Deletion</Label>
                      <p className="text-sm text-gray-500">
                        Let contributors delete items (use with caution)
                      </p>
                    </div>
                    <Switch
                      id="allowDeletion"
                      checked={formData.settings.allowItemDeletion}
                      onCheckedChange={(checked) => 
                        setFormData({ 
                          ...formData, 
                          settings: { ...formData.settings, allowItemDeletion: checked }
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxItems">Maximum Items per User (0 = unlimited)</Label>
                    <Input
                      id="maxItems"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.settings.maxItemsPerUser}
                      onChange={(e) => 
                        setFormData({ 
                          ...formData, 
                          settings: { 
                            ...formData.settings, 
                            maxItemsPerUser: parseInt(e.target.value) || 0 
                          }
                        })
                      }
                      className="w-32"
                    />
                    <p className="text-sm text-gray-500">
                      Prevent spam by limiting how many items each user can contribute
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <Link href="/lists">
                <Button type="button" variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </Link>
              
              <Button 
                type="submit" 
                disabled={createListMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {createListMutation.isPending ? (
                  <>Creating...</>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create List
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
