import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  description?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function MetricCard({
  title,
  value,
  change,
  changeType,
  description,
  icon,
  trend = "neutral"
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4" />;
      case "down":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case "increase":
        return "text-success";
      case "decrease":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-glow border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
        {icon && (
          <div className="flex items-center justify-center rounded-lg bg-secondary p-1.5">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-xl font-bold text-gray-100">{value}</div>
        <div className="flex items-center space-x-1 text-xs">
          <Badge
            variant="outline"
            className={cn("border-none px-2 py-1", getChangeColor())}
          >
            {getTrendIcon()}
            <span className="ml-1">
              {changeType === "increase" ? "+" : changeType === "decrease" ? "-" : ""}
              {Math.abs(change)}%
            </span>
          </Badge>
          {description && (
            <span className="text-muted-foreground">{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}