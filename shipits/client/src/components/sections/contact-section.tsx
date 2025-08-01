import { useState } from "react";
import { ParallaxSection } from "@/components/ui/parallax-section";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });
      
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative py-16 bg-gradient-to-b from-white to-gray-100">
      <div className="container mx-auto px-6 max-w-4xl">
        <ParallaxSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Get In Touch</h2>
            <p className="text-xl text-gray-600">Have questions or want to get involved?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="text-maroon mr-4" size={24} />
                  <span className="text-gray-700">hello@shipitscmu.org</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="text-maroon mr-4" size={24} />
                  <span className="text-gray-700">Carnegie Mellon University, Pittsburgh, PA</span>
                </div>
                <div className="flex items-center">
                  <MessageSquare className="text-maroon mr-4" size={24} />
                  <span className="text-gray-700">Join our Discord Community</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-6">Quick Message</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="border-2 border-gray-200 focus:border-maroon"
                />
                <Input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="border-2 border-gray-200 focus:border-maroon"
                />
                <Textarea
                  name="message"
                  placeholder="Your Message"
                  rows={4}
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  className="border-2 border-gray-200 focus:border-maroon resize-none"
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-maroon hover:bg-maroon-dark text-white py-3 font-medium tracking-wide"
                >
                  {isSubmitting ? "SENDING..." : "SEND MESSAGE"}
                </Button>
              </form>
            </div>
          </div>
        </ParallaxSection>
      </div>
    </section>
  );
}
