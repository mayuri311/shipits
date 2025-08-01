import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Upload, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { useAuth, useRequireAuth } from "@/contexts/AuthContext";
import { projectsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { CreateProject as CreateProjectType } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const categories = ["Technology", "Art", "Design", "Music", "Games", "Hardware"];

export default function CreateProject() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [projectData, setProjectData] = useState<Omit<CreateProjectType, 'ownerId'>>({
    title: "",
    description: "",
    tags: [],
    status: "active",
    media: [],
  });
  const [newTag, setNewTag] = useState("");

  const handleImagesUploaded = (images: Array<{
    filename: string;
    originalName: string;
    data: string;
    size: number;
    mimetype: string;
  }>) => {
    const mediaItems = images.map((image, index) => ({
      type: 'image' as const,
      data: image.data, // Use Base64 data instead of URL
      filename: image.filename,
      mimetype: image.mimetype,
      size: image.size,
      caption: image.originalName,
      order: index
    }));
    
    setProjectData(prev => ({
      ...prev,
      media: mediaItems
    }));
  };

  const { mutate: createProject, isPending: isSubmitting } = useMutation({
    mutationFn: (newProject: CreateProjectType) => projectsApi.createProject(newProject),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: "Project Created!",
          description: "Your project has been successfully created.",
        });
        // Invalidate all project queries to refresh the forum page
        queryClient.invalidateQueries({ 
          queryKey: ['projects'],
          exact: false // This will invalidate all queries starting with 'projects'
        });
        // Small delay to ensure the invalidation completes before redirect
        setTimeout(() => {
          // Redirect to forum page to see the new project in the list
          setLocation('/forum');
        }, 100);
      } else {
        toast({
          title: "Error Creating Project",
          description: response.error || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Create project error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectData.title.trim() || !projectData.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createProject({
      ...projectData,
      ownerId: user!._id!.toString()
    });
  };

  const addTag = () => {
    if (newTag.trim() && !projectData.tags.includes(newTag.trim())) {
      setProjectData({
        ...projectData,
        tags: [...projectData.tags, newTag.trim()]
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProjectData({
      ...projectData,
      tags: projectData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-maroon"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to create a project.</p>
          <Link href="/forum">
            <Button>Go to Forum</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/forum">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Forum
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
            </div>
            <div className="text-sm text-gray-500">
              Logged in as {user?.fullName || user?.username}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <Input
                    id="title"
                    type="text"
                    required
                    value={projectData.title}
                    onChange={(e) => setProjectData({ ...projectData, title: e.target.value })}
                    placeholder="Enter your project title"
                    maxLength={200}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {projectData.title.length}/200 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Project Description *
                  </label>
                  <Textarea
                    id="description"
                    required
                    value={projectData.description}
                    onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                    placeholder="Describe your project in detail. What does it do? What problem does it solve? What makes it unique?"
                    rows={6}
                    maxLength={2000}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {projectData.description.length}/2000 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Project Status
                  </label>
                  <Select value={projectData.status} onValueChange={(value: any) => setProjectData({ ...projectData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active - Actively being developed</SelectItem>
                      <SelectItem value="inactive">Inactive - On hold</SelectItem>
                      <SelectItem value="completed">Completed - Finished project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Tags & Categories</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Tags
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter a tag (e.g., 'web-app', 'machine-learning')"
                      className="flex-1"
                    />
                    <Button type="button" onClick={addTag} disabled={!newTag.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Press Enter or click + to add a tag. Use lowercase and hyphens for multi-word tags.
                  </p>
                </div>

                {projectData.tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {projectData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-maroon/10 text-maroon px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-maroon/70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Media Upload */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Images</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload images to showcase your project. You can add up to 10 images.
              </p>
              
              <ImageUpload
                onImagesUploaded={handleImagesUploaded}
                maxImages={10}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-between items-center">
              <Link href="/forum">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              
              <Button 
                type="submit" 
                disabled={isSubmitting || !projectData.title.trim() || !projectData.description.trim()}
                className="bg-maroon hover:bg-maroon/90"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Project...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
