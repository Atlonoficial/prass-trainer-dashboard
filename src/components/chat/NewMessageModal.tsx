import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Student {
    id: string;
    user_id: string;
    name: string;
    email: string;
    avatar_url?: string;
    avatar?: string;
}

interface NewMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectStudent: (student: any) => void;
    students: Student[];
}

export function NewMessageModal({ isOpen, onClose, onSelectStudent, students }: NewMessageModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        const query = searchQuery.toLowerCase();
        return students.filter(student =>
            student.name?.toLowerCase().includes(query) ||
            student.email?.toLowerCase().includes(query)
        );
    }, [students, searchQuery]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border text-foreground">
                <DialogHeader>
                    <DialogTitle>Nova Mensagem</DialogTitle>
                </DialogHeader>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar aluno..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-muted/50 border-border"
                    />
                </div>

                <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Nenhum aluno encontrado
                            </div>
                        ) : (
                            filteredStudents.map((student) => (
                                <div
                                    key={student.id || student.user_id}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                                    onClick={() => {
                                        onSelectStudent(student);
                                        onClose();
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={student.avatar_url || student.avatar} />
                                            <AvatarFallback>{student.name?.charAt(0) || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm text-foreground">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">{student.email}</p>
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100">
                                        <UserPlus className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
