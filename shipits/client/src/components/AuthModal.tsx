import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { LoginRequest, RegisterRequest } from "@shared/schema";
import HCaptcha from "@hcaptcha/react-hcaptcha";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

const colleges = [
  "School of Computer Science",
  "Carnegie Institute of Technology", 
  "College of Engineering",
  "College of Fine Arts",
  "Dietrich College of Humanities and Social Sciences",
  "Heinz College of Information Systems and Public Policy",
  "Mellon College of Science",
  "Tepper School of Business",
  "Other"
];

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const { login, register } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetSending, setIsResetSending] = useState(false);
  
  const [loginData, setLoginData] = useState<LoginRequest>({
    email: "",
    password: ""
  });
  
  const [registerData, setRegisterData] = useState<RegisterRequest>({
    username: "",
    email: "",
    password: "",
    fullName: "",
    college: undefined,
    graduationYear: undefined
  });
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(loginData);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please check your credentials and try again.';
      if (message.toLowerCase().includes('not verified')) {
        toast({
          title: 'Email not verified',
          description: 'We re-sent the verification email. Please check your inbox.',
        });
      } else {
        toast({
          title: 'Login Failed',
          description: message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Client-side validation
    if (!registerData.username || !registerData.email || !registerData.password || !registerData.fullName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (registerData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (registerData.username.length < 3) {
      toast({
        title: "Username Too Short",
        description: "Username must be at least 3 characters long.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    try {
      await register({ ...registerData, captchaToken });
      toast({
        title: "Verify your email",
        description: "We sent a verification link to your email. Please verify before logging in.",
      });
      onClose();
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast({ title: 'Enter your email', description: 'Please enter your email above first.' });
      return;
    }
    setIsResetSending(true);
    try {
      await authApi.requestPasswordReset(loginData.email);
      toast({ title: 'Check your email', description: 'If an account exists, a reset link has been sent.' });
    } catch (err) {
      toast({ title: 'Request failed', description: 'Please try again shortly.', variant: 'destructive' });
    } finally {
      setIsResetSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Osprey @ CMU Forum</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  placeholder="your.email@andrew.cmu.edu"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  placeholder="Enter your password"
                />
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-maroon hover:underline disabled:opacity-50"
                    disabled={isResetSending}
                  >
                    {isResetSending ? 'Sending…' : 'Forgot password?'}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-maroon hover:bg-maroon/90"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    required
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({...registerData, fullName: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    required
                    value={registerData.username}
                    onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                    placeholder="johndoe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="registerEmail">Email *</Label>
                <Input
                  id="registerEmail"
                  type="email"
                  required
                  value={registerData.email}
                  onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                  placeholder="your.email@andrew.cmu.edu"
                />
              </div>
              
              <div>
                <Label htmlFor="registerPassword">Password *</Label>
                <Input
                  id="registerPassword"
                  type="password"
                  required
                  value={registerData.password}
                  onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                  placeholder="At least 6 characters"
                  minLength={6}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="college">College</Label>
                  <Select value={registerData.college} onValueChange={(value) => setRegisterData({...registerData, college: value as any})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select college" />
                    </SelectTrigger>
                    <SelectContent>
                      {colleges.map((college) => (
                        <SelectItem key={college} value={college}>
                          {college}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="graduationYear">Grad Year</Label>
                  <Input
                    id="graduationYear"
                    type="number"
                    min="2020"
                    max="2035"
                    value={registerData.graduationYear || ""}
                    onChange={(e) => setRegisterData({...registerData, graduationYear: e.target.value ? parseInt(e.target.value) : undefined})}
                    placeholder="2025"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-maroon hover:bg-maroon/90"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}