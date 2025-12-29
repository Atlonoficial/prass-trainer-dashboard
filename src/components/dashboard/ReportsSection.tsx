import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Users, Award, Calendar, Download, Eye, Star, Target, FileText, Plus } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ReportsEvaluationModal } from "./ReportsEvaluationModal";

export default function ReportsSection() {
  const [selectedPeriod, setSelectedPeriod] = useState("6months");
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const { metrics, monthlyData, satisfactionData, topStudents, recentEvaluations, loading, exportData } = useReports();
  const { toast } = useToast();

  const handleExport = async () => {
    await exportData("pdf");
  };

  const handleNewEvaluation = () => {
    setIsEvaluationModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Cores para os gráficos
  const chartColors = {
    primary: "hsl(var(--primary))",
    secondary: "hsl(var(--secondary))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    info: "hsl(var(--info))",
  };

  const SATISFACTION_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avaliações e Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análise completa do desempenho da sua academia</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleNewEvaluation}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Avaliação
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Satisfação Geral</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics.generalSatisfaction > 0 ? `${metrics.generalSatisfaction}%` : "-"}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                {metrics.generalSatisfaction > 0 ? (
                  <span
                    className={`text-sm ${metrics.generalSatisfaction >= 80
                        ? "text-success"
                        : metrics.generalSatisfaction >= 60
                          ? "text-warning"
                          : "text-destructive"
                      }`}
                  >
                    {metrics.generalSatisfaction >= 80
                      ? "Excelente"
                      : metrics.generalSatisfaction >= 60
                        ? "Bom"
                        : "Precisa melhorar"}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">Sem avaliações</span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
              <Star className="w-6 h-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Taxa de Retenção</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics.retentionRate > 0 ? `${metrics.retentionRate}%` : "-"}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                {metrics.retentionRate > 0 ? (
                  <div className="flex items-center space-x-1">
                    <TrendingUp
                      className={`w-4 h-4 ${metrics.retentionRate >= 80
                          ? "text-success"
                          : metrics.retentionRate >= 60
                            ? "text-warning"
                            : "text-destructive"
                        }`}
                    />
                    <span
                      className={`text-sm ${metrics.retentionRate >= 80
                          ? "text-success"
                          : metrics.retentionRate >= 60
                            ? "text-warning"
                            : "text-destructive"
                        }`}
                    >
                      {metrics.retentionRate >= 80 ? "Ótima" : metrics.retentionRate >= 60 ? "Boa" : "Baixa"}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Sem dados</span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-info" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Avaliações Realizadas</p>
              <p className="text-2xl font-bold text-foreground">{metrics.completedEvaluations}</p>
              <div className="flex items-center space-x-2 mt-2">
                {metrics.completedEvaluations > 0 ? (
                  <span className="text-success text-sm">
                    +{Math.round(metrics.completedEvaluations / Math.max(topStudents.length, 1))} por aluno
                  </span>
                ) : (
                  <span className="text-muted-foreground text-sm">Nenhuma avaliação</span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Frequência Média</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics.averageFrequency > 0 ? `${metrics.averageFrequency}x` : "-"}
              </p>
              <div className="flex items-center space-x-2 mt-2">
                {metrics.averageFrequency > 0 ? (
                  <span className="text-info text-sm">por mês</span>
                ) : (
                  <span className="text-muted-foreground text-sm">Sem dados</span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-warning" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Performance Chart */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Performance Mensal</h3>
              <p className="text-muted-foreground text-sm">Alunos, receita e avaliações</p>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={selectedPeriod === "3months" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("3months")}
              >
                3M
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "6months" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("6months")}
              >
                6M
              </Button>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                  <Line type="monotone" dataKey="students" stroke={chartColors.success} strokeWidth={2} name="Alunos" />
                  <Line
                    type="monotone"
                    dataKey="evaluations"
                    stroke={chartColors.secondary}
                    strokeWidth={2}
                    name="Avaliações"
                  />
                  <Line type="monotone" dataKey="points" stroke={chartColors.warning} strokeWidth={2} name="Pontos" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Sem dados de performance</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Os dados aparecerão quando você tiver alunos ativos
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center space-x-8 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.success }}></div>
              <span className="text-sm text-muted-foreground">Alunos</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.secondary }}></div>
              <span className="text-sm text-muted-foreground">Avaliações</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.warning }}></div>
              <span className="text-sm text-muted-foreground">Pontos</span>
            </div>
          </div>
        </Card>

        {/* Satisfaction Chart */}
        <Card className="bg-card border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Satisfação dos Alunos</h3>
              <p className="text-muted-foreground text-sm">Distribuição das avaliações</p>
            </div>
          </div>
          {satisfactionData.some((d) => d.count > 0) ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={satisfactionData.filter((d) => d.count > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ rating, percentage }) => `${rating}★ (${(percentage * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {satisfactionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SATISFACTION_COLORS[entry.rating - 1]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Sem dados de satisfação</p>
                <p className="text-sm text-muted-foreground mt-2">Os dados aparecerão quando você tiver avaliações</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Top Students */}
      <Card className="bg-card border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Top Alunos do Mês</h3>
          <p className="text-muted-foreground text-sm">Baseado em frequência, progresso e avaliações</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Posição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Aluno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Progresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Treinos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Avaliação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Award className="w-12 h-12 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-foreground">Nenhum aluno no ranking</h3>
                      <p className="text-muted-foreground">Quando você tiver alunos ativos, o ranking aparecerá aqui</p>
                    </div>
                  </td>
                </tr>
              ) : (
                topStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0
                              ? "bg-warning/20 text-warning border-2 border-warning"
                              : index === 1
                                ? "bg-muted text-muted-foreground border-2 border-muted-foreground/30"
                                : index === 2
                                  ? "bg-secondary/20 text-secondary border-2 border-secondary"
                                  : "bg-muted text-muted-foreground"
                            }`}
                        >
                          {index + 1}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-foreground font-medium">{student.name}</div>
                        <div className="text-muted-foreground text-sm">{student.points} pontos</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-success h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, student.progress)}%` }}
                          ></div>
                        </div>
                        <span className="text-foreground text-sm">{student.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{student.workouts}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-warning fill-current" />
                        <span className="text-foreground">{student.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`${student.status === "active"
                            ? "border-success text-success"
                            : "border-muted-foreground text-muted-foreground"
                          }`}
                      >
                        {student.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Evaluations */}
      <Card className="bg-card border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Avaliações Recentes</h3>
            <Button>Ver Todas</Button>
          </div>
        </div>
        <div className="space-y-4 p-6">
          {recentEvaluations.length > 0 ? (
            <div className="space-y-3">
              {recentEvaluations.slice(0, 5).map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{evaluation.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {evaluation.type}: {evaluation.value} - {new Date(evaluation.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">
                    {new Date(evaluation.createdAt).toLocaleDateString("pt-BR")}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma avaliação recente</h3>
              <p className="text-muted-foreground">As avaliações dos seus alunos aparecerão aqui</p>
            </div>
          )}
        </div>
      </Card>

      <ReportsEvaluationModal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
      />
    </div>
  );
}
