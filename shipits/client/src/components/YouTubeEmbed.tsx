import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  showTitle?: boolean;
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate if a URL is a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Generate YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault', 
    high: 'hqdefault',
    maxres: 'maxresdefault'
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

export function YouTubeEmbed({ 
  videoId, 
  title = 'YouTube Video',
  width = 560, 
  height = 315,
  autoplay = false,
  muted = false,
  controls = true,
  showTitle = true
}: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const embedUrl = new URL('https://www.youtube.com/embed/' + videoId);
  
  // Configure embed parameters
  const params = new URLSearchParams();
  if (autoplay) params.set('autoplay', '1');
  if (muted) params.set('mute', '1');
  if (!controls) params.set('controls', '0');
  params.set('rel', '0'); // Don't show related videos from other channels
  params.set('modestbranding', '1'); // Minimize YouTube branding
  
  embedUrl.search = params.toString();

  const thumbnailUrl = getYouTubeThumbnail(videoId, 'high');
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoaded(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div 
        className="relative bg-gray-100 border border-gray-300 rounded-lg overflow-hidden"
        style={{ width, height }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
          <Play className="w-8 h-8 mb-2" />
          <p className="text-sm font-medium">Failed to load video</p>
          <a 
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
          >
            Watch on YouTube <ExternalLink className="w-3 h3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showTitle && title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      
      <div 
        className="relative bg-gray-100 rounded-lg overflow-hidden shadow-sm"
        style={{ width, height }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Show thumbnail while loading */}
            <img 
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="bg-red-600 rounded-full p-3">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
          </div>
        )}
        
        <iframe
          src={embedUrl.toString()}
          title={title}
          width={width}
          height={height}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>YouTube Video</span>
        <a 
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          Watch on YouTube <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

/**
 * Compact YouTube embed for smaller spaces
 */
export function YouTubeEmbedCompact({ 
  videoId, 
  title = 'YouTube Video',
  width = 320, 
  height = 180
}: Omit<YouTubeEmbedProps, 'autoplay' | 'muted' | 'controls' | 'showTitle'>) {
  return (
    <YouTubeEmbed
      videoId={videoId}
      title={title}
      width={width}
      height={height}
      autoplay={false}
      muted={false}
      controls={true}
      showTitle={false}
    />
  );
}