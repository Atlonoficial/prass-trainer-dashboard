import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { CommandErrorBoundary } from "./command-error-boundary"

// Interface para props com validação
interface SafeCommandProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive> {
  children?: React.ReactNode;
  isReady?: boolean;
}

const SafeCommand = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  SafeCommandProps
>(({ className, children, isReady = true, ...props }, ref) => {
  console.log('🔧 SafeCommand: Renderizando com isReady:', isReady);
  
  if (!isReady) {
    return (
      <div className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className
      )}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <CommandErrorBoundary>
      <CommandPrimitive
        ref={ref}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
          className
        )}
        {...props}
      >
        {children}
      </CommandPrimitive>
    </CommandErrorBoundary>
  );
});

SafeCommand.displayName = "SafeCommand";

interface CommandDialogProps extends DialogProps {
  isReady?: boolean;
}

const SafeCommandDialog = ({ children, isReady = true, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <SafeCommand 
          isReady={isReady}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          {children}
        </SafeCommand>
      </DialogContent>
    </Dialog>
  );
};

// Re-export dos componentes originais para compatibilidade
const SafeCommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
));
SafeCommandInput.displayName = CommandPrimitive.Input.displayName;

const SafeCommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));
SafeCommandList.displayName = CommandPrimitive.List.displayName;

const SafeCommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
));
SafeCommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const SafeCommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
));
SafeCommandGroup.displayName = CommandPrimitive.Group.displayName;

const SafeCommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
));
SafeCommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const SafeCommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
));
SafeCommandItem.displayName = CommandPrimitive.Item.displayName;

const SafeCommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  );
};
SafeCommandShortcut.displayName = "SafeCommandShortcut";

export {
  SafeCommand as Command,
  SafeCommandDialog as CommandDialog,
  SafeCommandInput as CommandInput,
  SafeCommandList as CommandList,
  SafeCommandEmpty as CommandEmpty,
  SafeCommandGroup as CommandGroup,
  SafeCommandItem as CommandItem,
  SafeCommandShortcut as CommandShortcut,
  SafeCommandSeparator as CommandSeparator,
};