import { MetricCard } from "@/components/dashboard/MetricCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { ModelStatus } from "@/components/dashboard/ModelStatus";
import { 
  Brain, 
  Activity, 
  Zap, 
  Users, 
  TrendingUp,
  Clock,
  Server,
  DollarSign
} from "lucide-react";

// Sample data for charts
const performanceData = [
  { time: "00:00", accuracy: 92, latency: 120 },
  { time: "04:00", accuracy: 94, latency: 110 },
  { time: "08:00", accuracy: 91, latency: 135 },
  { time: "12:00", accuracy: 95, latency: 105 },
  { time: "16:00", accuracy: 93, latency: 125 },
  { time: "20:00", accuracy: 96, latency: 98 },
];

const usageData = [
  { date: "Mon", requests: 1200, cost: 45 },
  { date: "Tue", requests: 1500, cost: 52 },
  { date: "Wed", requests: 1800, cost: 61 },
  { date: "Thu", requests: 1350, cost: 48 },
  { date: "Fri", requests: 2100, cost: 73 },
  { date: "Sat", requests: 900, cost: 32 },
  { date: "Sun", requests: 750, cost: 28 },
];

export default function Dashboard() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your AI models performance and analytics
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Models"
          value="12"
          change={2}
          changeType="increase"
          description="from last month"
          icon={<Brain className="h-4 w-4 text-primary" />}
          trend="up"
        />
        <MetricCard
          title="Active Users"
          value="2,847"
          change={12}
          changeType="increase"
          description="from last week"
          icon={<Users className="h-4 w-4 text-info" />}
          trend="up"
        />
        <MetricCard
          title="API Requests"
          value="45,231"
          change={8}
          changeType="increase"
          description="from yesterday"
          icon={<Activity className="h-4 w-4 text-success" />}
          trend="up"
        />
        <MetricCard
          title="Avg Response Time"
          value="127ms"
          change={5}
          changeType="decrease"
          description="improvement"
          icon={<Clock className="h-4 w-4 text-warning" />}
          trend="down"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ChartCard
            title="Model Performance"
            description="Accuracy and latency over the last 24 hours"
            data={performanceData}
            dataKey="accuracy"
            xAxisKey="time"
            type="area"
            color="hsl(var(--primary))"
          />
        </div>
        <div className="lg:col-span-3">
          <ChartCard
            title="API Usage"
            description="Daily requests for the past week"
            data={usageData}
            dataKey="requests"
            xAxisKey="date"
            type="line"
            color="hsl(var(--accent))"
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="GPU Utilization"
          value="78%"
          change={3}
          changeType="increase"
          description="current usage"
          icon={<Server className="h-4 w-4 text-accent" />}
          trend="up"
        />
        <MetricCard
          title="Daily Cost"
          value="$284.50"
          change={15}
          changeType="decrease"
          description="vs yesterday"
          icon={<DollarSign className="h-4 w-4 text-success" />}
          trend="down"
        />
        <MetricCard
          title="Success Rate"
          value="99.2%"
          change={0.1}
          changeType="increase"
          description="uptime"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          trend="up"
        />
      </div>

      {/* Model Status */}
      <ModelStatus />
    </div>
  );
}