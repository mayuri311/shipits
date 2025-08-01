import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { LoginRequest, RegisterRequest } from "@shared/schema";

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
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await register(registerData);
      toast({
        title: "Welcome to ShipIts!",
        description: "Your account has been created successfully.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Please check your information and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await login({
        email: "admin@shipits.com",
        password: "admin123"
      });
      toast({
        title: "Demo Login Successful",
        description: "You're now logged in as the demo admin user.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Demo Login Failed",
        description: "The demo account may not be available.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join ShipIts Forum</DialogTitle>
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
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-maroon hover:bg-maroon/90"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              Demo Login
            </Button>
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