import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Folder, FolderOpen, FileText, Upload, Plus, Trash2, Edit2, Search, X, UtensilsCrossed, UploadCloud, MoreVertical, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useMenuLibrary } from '@/hooks/useMenuLibrary';
import { CreateMenuModal } from './CreateMenuModal';
import { ViewMenuModal } from './ViewMenuModal';
import { cn } from '@/lib/utils';

interface MenuLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MenuLibraryModal = ({ isOpen, onClose }: MenuLibraryModalProps) => {
  const {
    menus,
    folders,
    loading,
    uploading,
    createFolder,
    uploadPDF,
    saveMenu,
    deleteMenu,
    updateMenu,
  } = useMenuLibrary();

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [folderName, setFolderName] = useState('');
  const [menuName, setMenuName] = useState('');
  const [menuDescription, setMenuDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [viewingMenu, setViewingMenu] = useState<any | null>(null);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    
    await createFolder(folderName);
    setFolderName('');
    setShowCreateFolder(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.includes('pdf')) {
      setSelectedFile(file);
    }
  };

  const handleUploadMenu = async () => {
    if (!selectedFile || !menuName.trim() || !selectedFolder) return;
    
    await uploadPDF(selectedFile, selectedFolder, menuName, menuDescription);
    setSelectedFile(null);
    setMenuName('');
    setMenuDescription('');
    setShowUploadMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMenu(id);
  };

  const filteredMenus = menus.filter(menu => {
    if (!searchTerm) return true;
    return menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           menu.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           menu.folder_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const folderMenus = selectedFolder 
    ? filteredMenus.filter(menu => menu.folder_name === selectedFolder && !menu.name.startsWith('_folder_'))
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40">
          <DialogTitle className="text-lg font-semibold">Biblioteca de Cardápios</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 px-5 pb-5 pt-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cardápios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-1 top-1 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCreateFolder(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova Pasta
            </Button>
            <Button
              onClick={() => setShowCreateMenu(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={folders.length === 0}
            >
              <UtensilsCrossed className="h-4 w-4" />
              Criar Cardápio
            </Button>
            <Button
              onClick={() => setShowUploadMenu(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={folders.length === 0}
            >
              <Upload className="h-4 w-4" />
              Enviar PDF
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Create Folder Form */}
              {showCreateFolder && (
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <h3 className="font-medium">Criar Nova Pasta</h3>
                    <Input
                      placeholder="Nome da pasta"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleCreateFolder} size="sm">
                        Criar
                      </Button>
                      <Button
                        onClick={() => setShowCreateFolder(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upload Menu Form */}
              {showUploadMenu && (
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <h3 className="font-medium">Enviar Cardápio PDF</h3>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pasta de Destino</label>
                      <select
                        value={selectedFolder}
                        onChange={(e) => setSelectedFolder(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Selecionar pasta...</option>
                        {folders.map((folder) => (
                          <option key={folder} value={folder}>
                            {folder}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Input
                      placeholder="Nome do cardápio"
                      value={menuName}
                      onChange={(e) => setMenuName(e.target.value)}
                    />

                    <Textarea
                      placeholder="Descrição (opcional)"
                      value={menuDescription}
                      onChange={(e) => setMenuDescription(e.target.value)}
                      rows={2}
                    />

                    {/* File Drop Zone */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          {selectedFile.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(null)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Arraste um PDF aqui ou clique para selecionar
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Selecionar Arquivo
                          </Button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept=".pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleUploadMenu}
                        disabled={!selectedFile || !menuName || !selectedFolder || uploading}
                        size="sm"
                      >
                        {uploading ? <LoadingSpinner /> : 'Enviar'}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowUploadMenu(false);
                          setSelectedFile(null);
                          setMenuName('');
                          setMenuDescription('');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Folder View */}
              {!selectedFolder ? (
                <div>
                  <h3 className="font-medium mb-3">Pastas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {folders.map((folder) => {
                      const folderMenuCount = menus.filter(
                        menu => menu.folder_name === folder && !menu.name.startsWith('_folder_')
                      ).length;

                      return (
                        <Card
                          key={folder}
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => setSelectedFolder(folder)}
                        >
                          <CardContent className="p-3 text-center">
                            <Folder className="h-8 w-8 mx-auto mb-2 text-primary" />
                            <p className="font-medium text-sm truncate">{folder}</p>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {folderMenuCount} item{folderMenuCount !== 1 ? 's' : ''}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFolder('')}
                      className="p-0 h-auto font-medium text-primary"
                    >
                      ← Voltar
                    </Button>
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedFolder}</span>
                  </div>

                  {folderMenus.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum cardápio encontrado nesta pasta</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {folderMenus.map((menu) => (
                        <Card 
                          key={menu.id}
                          className={cn(
                            "group relative overflow-hidden",
                            "border border-border/40 bg-card/50 backdrop-blur-sm",
                            "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
                            "transition-all duration-300 ease-out"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                                    menu.file_type === 'menu' 
                                      ? "bg-primary/10 border border-primary/20"
                                      : "bg-red-500/10 border border-red-500/20"
                                  )}>
                                    {menu.file_type === 'menu' ? (
                                      <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
                                    ) : (
                                      <FileText className="h-3.5 w-3.5 text-red-500" />
                                    )}
                                  </div>
                                  <h3 className="font-semibold text-lg text-foreground leading-tight line-clamp-1">
                                    {menu.name}
                                  </h3>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] px-2 py-0.5 h-5",
                                    menu.file_type === 'menu'
                                      ? "border-primary/30 text-primary"
                                      : "border-red-500/30 text-red-600 dark:text-red-400"
                                  )}
                                >
                                  {menu.file_type === 'menu' ? 'Cardápio' : 'PDF'}
                                </Badge>
                              </div>
                              
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-muted"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                      <span className="sr-only">Abrir menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    {menu.file_type === 'menu' && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setViewingMenu(menu);
                                            setShowViewMenu(true);
                                          }}
                                          className="cursor-pointer"
                                        >
                                          <Eye className="h-4 w-4 mr-2 text-emerald-500" />
                                          <span>Visualizar cardápio</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const menuToEdit = menus.find(m => m.id === menu.id);
                                        if (menuToEdit) {
                                          setEditingItem(menu.id);
                                          setShowCreateMenu(true);
                                        }
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Edit2 className="h-4 w-4 mr-2 text-primary" />
                                      <span>Editar cardápio</span>
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          className="cursor-pointer text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          <span>Excluir cardápio</span>
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Excluir cardápio</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Tem certeza que deseja excluir o cardápio "{menu.name}"? Esta ação não pode ser desfeita.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDelete(menu.id)}
                                            className="bg-destructive hover:bg-destructive/90"
                                          >
                                            Excluir
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            {menu.description && (
                              <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3 leading-relaxed">
                                {menu.description}
                              </p>
                            )}
                            
                            {menu.file_type === 'pdf' && menu.file_url && (
                              <div className="pt-3 border-t border-border/40">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(menu.file_url, '_blank')}
                                  className="w-full text-xs h-8"
                                >
                                  <FileText className="w-3.5 h-3.5 mr-2" />
                                  Visualizar PDF
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {folders.length === 0 && !showCreateFolder && (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma pasta encontrada</p>
                  <p className="text-sm">Crie sua primeira pasta para organizar os cardápios</p>
                </div>
              )}
            </>
          )}
        </div>

        <CreateMenuModal
          isOpen={showCreateMenu}
          onClose={() => {
            setShowCreateMenu(false);
            setEditingItem(null);
          }}
          folders={folders}
          onSave={async (menuData) => {
            console.log('MenuLibraryModal - Saving with data:', menuData); // ✅ Debug
            
            if (editingItem) {
              await updateMenu(editingItem, menuData);
            } else {
              await saveMenu(menuData);
            }
            setShowCreateMenu(false);
            setEditingItem(null);
          }}
          editingMenu={editingItem ? menus.find(m => m.id === editingItem) : null}
        />

        <ViewMenuModal
          open={showViewMenu}
          onClose={() => {
            setShowViewMenu(false);
            setViewingMenu(null);
          }}
          menu={viewingMenu}
        />
      </DialogContent>
    </Dialog>
  );
};