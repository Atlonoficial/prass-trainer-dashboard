import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { ComprehensiveEvaluationModal } from "@/components/consulting/ComprehensiveEvaluationModal";
import { useComprehensiveEvaluations, CreateEvaluationData } from "@/hooks/useComprehensiveEvaluations";
import { useToast } from "@/hooks/use-toast";

interface ReportsEvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ReportsEvaluationModal({ isOpen, onClose }: ReportsEvaluationModalProps) {
    const { students, loading } = useStudents();
    const { createEvaluation } = useComprehensiveEvaluations();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
    const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStudentSelect = (student: { user_id: string; name: string }) => {
        setSelectedStudent({ id: student.user_id, name: student.name });
        setIsEvaluationModalOpen(true);
    };

    const handleEvaluationSubmit = async (data: CreateEvaluationData) => {
        try {
            await createEvaluation(data);
            // Success toast is handled inside createEvaluation
            setIsEvaluationModalOpen(false);
            onClose(); // Close the main modal too
        } catch (error) {
            // Error toast is handled inside createEvaluation
            console.error("Error submitting evaluation:", error);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-border">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                        <DialogTitle className="text-xl font-semibold">Nova Avaliação</DialogTitle>
                        <DialogDescription className="text-muted-foreground mt-1.5">
                            Selecione um aluno para iniciar uma nova avaliação completa.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar aluno..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 bg-muted/30 border-border/50 focus:bg-background transition-colors"
                            />
                        </div>

                        <div className="h-[300px] overflow-y-auto pr-2 -mr-2 space-y-2 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <p className="text-sm">Carregando alunos...</p>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                                    <User className="h-10 w-10 opacity-20" />
                                    <p className="text-sm">Nenhum aluno encontrado</p>
                                </div>
                            ) : (
                                filteredStudents.map((student) => (
                                    <Button
                                        key={student.user_id}
                                        variant="ghost"
                                        className="w-full justify-start h-auto py-3 px-3 hover:bg-muted/50 border border-transparent hover:border-border/50 rounded-lg transition-all group"
                                        onClick={() => handleStudentSelect(student)}
                                    >
                                        <Avatar className="h-10 w-10 mr-3 border border-border/50 group-hover:border-border transition-colors">
                                            <AvatarImage src={student.avatar || undefined} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                {student.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                                {student.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {student.email}
                                            </div>
                                        </div>
                                    </Button>
                                ))
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {selectedStudent && (
                <ComprehensiveEvaluationModal
                    open={isEvaluationModalOpen}
                    onOpenChange={setIsEvaluationModalOpen}
                    studentId={selectedStudent.id}
                    studentName={selectedStudent.name}
                    onSubmit={handleEvaluationSubmit}
                />
            )}
        </>
    );
}
