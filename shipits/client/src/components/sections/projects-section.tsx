import { useState, useEffect } from "react";
import { ParallaxSection } from "@/components/ui/parallax-section";
import { Heart, Smartphone, Brain, Cpu, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { projectsApi } from "@/lib/api";
import { YouTubeEmbed, extractYouTubeVideoId, isValidYouTubeUrl } from "@/components/YouTubeEmbed";
import type { Project } from "@shared/schema";

export function ProjectsSection() {
  const [isForumOpen, setIsForumOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent projects on component mount
  useEffect(() => {
    const fetchRecentProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch recent projects - get active projects sorted by creation date
        const response = await projectsApi.getProjects({
          status: 'active',
          limit: 6,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });

        if (response.data?.items) {
          setProjects(response.data.items);
        } else {
          // Fallback to mock data if no projects are available
          setProjects([
            {
              _id: 'mock1' as any,
              title: 'EcoTracker App',
              description: 'A mobile app that helps students track their carbon footprint and find sustainable alternatives on campus.',
              tags: ['mobile', 'sustainability'],
              analytics: { totalLikes: 24, views: 150 },
              status: 'active' as any,
              featured: false,
              ownerId: 'mock' as any,
              createdAt: new Date(),
              updatedAt: new Date(),
              media: [{
                type: 'image' as const,
                url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0E0QUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==",
                uploadedAt: new Date()
              }]
            },
            {
              _id: 'mock2' as any,
              title: 'StudyBuddy AI Demo',
              description: 'Watch our AI study companion in action - personalized learning schedules and practice problems.',
              tags: ['ai', 'education', 'demo'],
              analytics: { totalLikes: 31, views: 200 },
              status: 'active' as any,
              featured: false,
              ownerId: 'mock' as any,
              createdAt: new Date(),
              updatedAt: new Date(),
              media: [{
                type: 'video' as const,
                url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Example YouTube URL
                uploadedAt: new Date()
              }]
            },
            {
              _id: 'mock3' as any,
              title: 'Smart Dorm System',
              description: 'IoT sensors and automation to optimize energy usage and comfort in dormitory rooms.',
              tags: ['hardware', 'iot'],
              analytics: { totalLikes: 18, views: 120 },
              status: 'active' as any,
              featured: false,
              ownerId: 'mock' as any,
              createdAt: new Date(),
              updatedAt: new Date(),
              media: [{
                type: 'image' as const,
                url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0E0QUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==",
                uploadedAt: new Date()
              }]
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch recent projects:', err);
        setError('Failed to load recent projects');
        // Fallback to mock data on error
        setProjects([
          {
            _id: 'mock1' as any,
            title: 'EcoTracker App',
            description: 'A mobile app that helps students track their carbon footprint and find sustainable alternatives on campus.',
            tags: ['mobile', 'sustainability'],
            analytics: { totalLikes: 24, views: 150 },
            status: 'active' as any,
            featured: false,
            ownerId: 'mock' as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            media: [{
              type: 'image' as const,
              url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0E0QUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZSBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==",
              uploadedAt: new Date()
            }]
          },
          {
            _id: 'mock2' as any,
            title: 'StudyBuddy AI Demo',
            description: 'Watch our AI study companion in action - personalized learning schedules and practice problems.',
            tags: ['ai', 'education', 'demo'],
            analytics: { totalLikes: 31, views: 200 },
            status: 'active' as any,
            featured: false,
            ownerId: 'mock' as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            media: [{
              type: 'video' as const,
              url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Example YouTube URL
              uploadedAt: new Date()
            }]
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentProjects();
  }, []);

  // Duplicate projects for continuous scroll effect
  const duplicatedProjects = [...projects, ...projects];

  return (
    <section id="projects" className="relative py-16 bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-6 max-w-6xl">
        <ParallaxSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Recent Projects</h2>
            <p className="text-xl text-muted-foreground">Discover what our community is building</p>
          </div>

          {/* Horizontal Scrolling Project Carousel */}
          <div className="relative overflow-hidden">
            {loading ? (
              <div className="flex space-x-6">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="flex-none w-80 bg-card border-2 border-border p-6 animate-pulse"
                  >
                    <div className="bg-muted h-48 rounded-lg mb-4 flex items-center justify-center">
                      <div className="w-16 h-16 bg-muted-foreground/20 rounded-full"></div>
                    </div>
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded mb-1"></div>
                    <div className="h-4 bg-muted rounded mb-3 w-3/4"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-5 bg-muted rounded w-16"></div>
                      <div className="h-4 bg-muted rounded w-8"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-maroon text-white px-6 py-2 rounded hover:bg-maroon/90 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="flex space-x-6 animate-scroll hover:pause">
                {duplicatedProjects.map((project, index) => {
                // Get category from tags (first tag or default)
                const category = project.tags?.[0] || 'project';

                // Get likes count from analytics
                const likes = project.analytics?.totalLikes || 0;

                // Simple icon selection based on category/tag
                const getIconForCategory = (cat: string) => {
                  if (cat.includes('mobile') || cat.includes('app')) return Smartphone;
                  if (cat.includes('ai') || cat.includes('ml') || cat.includes('machine')) return Brain;
                  if (cat.includes('hardware') || cat.includes('iot')) return Cpu;
                  return Globe; // default
                };

                const IconComponent = getIconForCategory(category.toLowerCase());

                // Simple gradient selection based on index
                const gradients = [
                  'from-blue-50 to-indigo-100',
                  'from-green-50 to-emerald-100',
                  'from-purple-50 to-violet-100',
                  'from-orange-50 to-red-100'
                ];
                const gradient = gradients[index % gradients.length];

                // Simple icon color selection
                const iconColors = [
                  'text-indigo-600',
                  'text-emerald-600',
                  'text-violet-600',
                  'text-red-600'
                ];
                const iconColor = iconColors[index % iconColors.length];

                // Get the first media item (image or video)
                const firstMedia = project.media?.[0];
                const isVideo = firstMedia?.type === 'video';
                const isYouTubeVideo = isVideo && firstMedia.url && isValidYouTubeUrl(firstMedia.url);
                const isRegularVideo = isVideo && !isYouTubeVideo;

                // For images
                const imageUrl = (!isVideo && firstMedia?.type === 'image') ? (firstMedia.data || firstMedia.url) : null;
                const fallbackImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0E0QUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBNZWRpYSBBdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==";

                return (
                  <div
                    key={`${project._id}-${index}`}
                    className="flex-none w-80 bg-card border-2 border-border p-6 hover:border-maroon transition-colors duration-300 group"
                  >
                    <div className="h-48 rounded-lg mb-4 overflow-hidden border border-border relative">
                      {isYouTubeVideo ? (
                        <YouTubeEmbed
                          videoId={extractYouTubeVideoId(firstMedia.url!)!}
                          title={firstMedia.caption || project.title}
                          width={320}
                          height={192}
                          showTitle={false}
                          autoplay={false}
                          muted={true}
                          controls={false}
                        />
                      ) : isRegularVideo ? (
                        <video
                          src={firstMedia.data || firstMedia.url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          poster={(firstMedia.data || firstMedia.url) + '#t=0.1'}
                          onError={() => {
                            // Fallback to placeholder if video fails to load
                          }}
                        />
                      ) : imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.src = fallbackImage;
                          }}
                        />
                      ) : (
                        <div className={`bg-gradient-to-br ${gradient} w-full h-full flex items-center justify-center`}>
                          <IconComponent className={`${iconColor}`} size={64} />
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-maroon transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-3">
                      {project.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded capitalize">
                        {category.replace('-', ' ')}
                      </span>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Heart className="mr-1" size={16} />
                        <span>{likes}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <Dialog open={isForumOpen} onOpenChange={setIsForumOpen}>
              <DialogTrigger asChild>
                <button className="bg-maroon text-white px-8 py-4 hover:bg-maroon-dark transition-colors duration-300 font-medium tracking-wide">
                  ACCESS FULL FORUM
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Osprey @ CMU Forum</DialogTitle>
                </DialogHeader>
                <div className="py-6">
                  <p className="text-muted-foreground mb-4">
                    The Osprey @ CMU forum is currently under development. Here you'll be able to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Browse all student projects with detailed descriptions</li>
                    <li>Submit your own projects for community feedback</li>
                    <li>Connect with project creators and collaborators</li>
                    <li>Join discussion threads about development challenges</li>
                    <li>Find teammates for new project ideas</li>
                  </ul>
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Coming Soon:</strong> Full forum functionality with user authentication,
                      project submissions, and community features.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </ParallaxSection>
      </div>
    </section>
  );
}
