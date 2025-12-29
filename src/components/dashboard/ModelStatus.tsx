import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Activity, 
  Zap, 
  Play, 
  Pause, 
  MoreHorizontal,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  name: string;
  status: "active" | "training" | "inactive" | "error";
  accuracy: number;
  performance: number;
  lastUpdated: string;
  requests: number;
}

const models: Model[] = [
  {
    id: "1",
    name: "GPT-4 Turbo",
    status: "active",
    accuracy: 94.2,
    performance: 87.5,
    lastUpdated: "2 min ago",
    requests: 1247
  },
  {
    id: "2",
    name: "Claude-3 Sonnet",
    status: "training",
    accuracy: 91.8,
    performance: 92.1,
    lastUpdated: "15 min ago",
    requests: 892
  },
  {
    id: "3",
    name: "Llama-2 70B",
    status: "active",
    accuracy: 89.3,
    performance: 95.2,
    lastUpdated: "5 min ago",
    requests: 634
  },
  {
    id: "4",
    name: "Custom Model-v2",
    status: "error",
    accuracy: 76.4,
    performance: 45.8,
    lastUpdated: "1 hour ago",
    requests: 23
  }
];

export function ModelStatus() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success text-success-foreground";
      case "training":
        return "bg-warning text-warning-foreground";
      case "inactive":
        return "bg-muted text-muted-foreground";
      case "error":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Activity className="h-3 w-3" />;
      case "training":
        return <Zap className="h-3 w-3" />;
      case "error":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Pause className="h-3 w-3" />;
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-glow">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>Model Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {models.map((model) => (
          <div
            key={model.id}
            className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center space-x-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium">{model.name}</h4>
                  <Badge className={cn("text-xs", getStatusColor(model.status))}>
                    {getStatusIcon(model.status)}
                    <span className="ml-1 capitalize">{model.status}</span>
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last updated: {model.lastUpdated}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm">
                  <span className="text-muted-foreground">Acc:</span>{" "}
                  <span className="font-medium">{model.accuracy}%</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Perf:</span>{" "}
                  <span className="font-medium">{model.performance}%</span>
                </div>
              </div>
              
              <div className="w-20">
                <Progress value={model.performance} className="h-2" />
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium">{model.requests}</div>
                <div className="text-xs text-muted-foreground">requests</div>
              </div>
              
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}