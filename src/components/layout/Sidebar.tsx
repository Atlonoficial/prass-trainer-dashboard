import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Brain, 
  Database, 
  Settings, 
  Activity,
  Zap,
  TrendingUp,
  FileText,
  Users,
  Shield
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
}

const navigation = [
  { name: "Dashboard", icon: BarChart3, href: "#", current: true },
  { name: "Models", icon: Brain, href: "#", current: false },
  { name: "Performance", icon: Activity, href: "#", current: false },
  { name: "Analytics", icon: TrendingUp, href: "#", current: false },
  { name: "Data Sources", icon: Database, href: "#", current: false },
  { name: "Automation", icon: Zap, href: "#", current: false },
  { name: "Reports", icon: FileText, href: "#", current: false },
  { name: "Team", icon: Users, href: "#", current: false },
  { name: "Security", icon: Shield, href: "#", current: false },
  { name: "Settings", icon: Settings, href: "#", current: false },
];

export function Sidebar({ className, isOpen = true }: SidebarProps) {
  const [activeItem, setActiveItem] = useState("Dashboard");

  return (
    <div className={cn(
      "flex h-full w-64 flex-col bg-card border-r transition-all duration-300",
      !isOpen && "w-16",
      className
    )}>
      <div className="flex h-14 items-center border-b px-4">
        {isOpen ? (
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
              Atlon AI
            </span>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>
      
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = activeItem === item.name;
          return (
            <Button
              key={item.name}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-left",
                isActive && "bg-secondary shadow-glow",
                !isOpen && "justify-center px-2"
              )}
              onClick={() => setActiveItem(item.name)}
            >
              <item.icon className={cn("h-4 w-4", isOpen && "mr-3")} />
              {isOpen && item.name}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}