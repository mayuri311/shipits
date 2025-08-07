import { useState } from "react";
import { 
  Share2, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Mail, 
  MessageCircle,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  hashtags?: string[];
  onShare?: (platform: string) => void;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

const PLATFORM_COLORS = {
  twitter: "hover:bg-blue-50 hover:text-blue-600",
  facebook: "hover:bg-blue-50 hover:text-blue-700",
  linkedin: "hover:bg-blue-50 hover:text-blue-800",
  reddit: "hover:bg-orange-50 hover:text-orange-600",
  whatsapp: "hover:bg-green-50 hover:text-green-600",
  email: "hover:bg-gray-50 hover:text-gray-700",
  copy: "hover:bg-purple-50 hover:text-purple-600"
};

export function ShareButton({
  title,
  description = "",
  url,
  imageUrl,
  hashtags = [],
  onShare,
  variant = "outline",
  size = "sm",
  className = ""
}: ShareButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Get current URL if not provided
  const shareUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const hashtagString = hashtags.length > 0 ? hashtags.join(',') : 'ShipIts,StudentProjects,CMU';

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&hashtags=${hashtagString}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
    reddit: `https://reddit.com/submit?title=${encodedTitle}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${shareUrl}`
  };

  const handleShare = async (platform: string) => {
    try {
      // Track the share
      onShare?.(platform);

      if (platform === 'copy') {
        await copyToClipboard();
        return;
      }

      if (platform === 'native' && navigator.share) {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
        return;
      }

      // Open social media share link
      const link = shareLinks[platform as keyof typeof shareLinks];
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer,width=600,height=400');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share failed",
        description: "Unable to share at this time. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link copied!",
        description: "The project link has been copied to your clipboard.",
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link copied!",
        description: "The project link has been copied to your clipboard.",
      });
    }
  };

  // Check if native sharing is available
  const hasNativeShare = typeof navigator !== 'undefined' && navigator.share;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          aria-label={`Share "${title}"`}
          title={`Share "${title}"`}
        >
          <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Native sharing if available */}
        {hasNativeShare && (
          <>
            <DropdownMenuItem
              onClick={() => handleShare('native')}
              className="cursor-pointer"
            >
              <Share2 className="w-4 h-4 mr-3" />
              Share via...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Social Media Platforms */}
        <DropdownMenuItem
          onClick={() => handleShare('twitter')}
          className={`cursor-pointer ${PLATFORM_COLORS.twitter}`}
          aria-label={`Share "${title}" on Twitter`}
        >
          <Twitter className="w-4 h-4 mr-3" aria-hidden="true" />
          Share on Twitter
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleShare('facebook')}
          className={`cursor-pointer ${PLATFORM_COLORS.facebook}`}
          aria-label={`Share "${title}" on Facebook`}
        >
          <Facebook className="w-4 h-4 mr-3" aria-hidden="true" />
          Share on Facebook
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleShare('linkedin')}
          className={`cursor-pointer ${PLATFORM_COLORS.linkedin}`}
          aria-label={`Share "${title}" on LinkedIn`}
        >
          <Linkedin className="w-4 h-4 mr-3" aria-hidden="true" />
          Share on LinkedIn
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleShare('reddit')}
          className={`cursor-pointer ${PLATFORM_COLORS.reddit}`}
          aria-label={`Share "${title}" on Reddit`}
        >
          <ExternalLink className="w-4 h-4 mr-3" aria-hidden="true" />
          Share on Reddit
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleShare('whatsapp')}
          className={`cursor-pointer ${PLATFORM_COLORS.whatsapp}`}
        >
          <MessageCircle className="w-4 h-4 mr-3" />
          Share on WhatsApp
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Email and Copy */}
        <DropdownMenuItem
          onClick={() => handleShare('email')}
          className={`cursor-pointer ${PLATFORM_COLORS.email}`}
        >
          <Mail className="w-4 h-4 mr-3" />
          Share via Email
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleShare('copy')}
          className={`cursor-pointer ${PLATFORM_COLORS.copy}`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-3 text-green-600" />
              <span className="text-green-600">Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-3" />
              Copy Link
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}