import React, { createContext, useContext, useState, useCallback } from 'react';

interface DragItem {
  id: string;
  type: string;
  data: any;
}

interface DragDropContextType {
  draggedItem: DragItem | null;
  isDragging: boolean;
  dragStart: (item: DragItem) => void;
  dragEnd: () => void;
  drop: (targetId: string, position?: 'before' | 'after' | 'inside') => void;
  onDrop?: (draggedItem: DragItem, targetId: string, position?: string) => void;
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined);

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

interface DragDropProviderProps {
  children: React.ReactNode;
  onDrop?: (draggedItem: DragItem, targetId: string, position?: string) => void;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({ 
  children, 
  onDrop 
}) => {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragStart = useCallback((item: DragItem) => {
    setDraggedItem(item);
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
  }, []);

  const dragEnd = useCallback(() => {
    setDraggedItem(null);
    setIsDragging(false);
    document.body.style.cursor = 'default';
  }, []);

  const drop = useCallback((targetId: string, position?: 'before' | 'after' | 'inside') => {
    if (draggedItem && onDrop) {
      onDrop(draggedItem, targetId, position);
    }
    dragEnd();
  }, [draggedItem, onDrop, dragEnd]);

  return (
    <DragDropContext.Provider
      value={{
        draggedItem,
        isDragging,
        dragStart,
        dragEnd,
        drop,
        onDrop
      }}
    >
      {children}
    </DragDropContext.Provider>
  );
};

// Draggable wrapper component
export const Draggable: React.FC<{
  id: string;
  type: string;
  data: any;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}> = ({ id, type, data, children, className = '', disabled = false }) => {
  const { dragStart, dragEnd } = useDragDrop();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (disabled) return;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    
    // Add visual feedback
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.5';
    dragImage.style.transform = 'rotate(5deg)';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    dragStart({ id, type, data });
  };

  const handleDragEnd = () => {
    if (disabled) return;
    dragEnd();
    setIsDragOver(false);
  };

  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`${className} ${
        !disabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${isDragOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
      style={{ 
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s ease'
      }}
    >
      {children}
    </div>
  );
};

// Drop zone wrapper component
export const DropZone: React.FC<{
  id: string;
  acceptTypes?: string[];
  children: React.ReactNode;
  className?: string;
  position?: 'before' | 'after' | 'inside';
  onHover?: (isHovering: boolean) => void;
}> = ({ 
  id, 
  acceptTypes = [], 
  children, 
  className = '', 
  position = 'inside',
  onHover 
}) => {
  const { drop, draggedItem, isDragging } = useDragDrop();
  const [isHovering, setIsHovering] = useState(false);

  const canAccept = !acceptTypes.length || 
    (draggedItem && acceptTypes.includes(draggedItem.type));

  const handleDragOver = (e: React.DragEvent) => {
    if (!canAccept || !isDragging) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!isHovering) {
      setIsHovering(true);
      onHover?.(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger leave if actually leaving the drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsHovering(false);
      onHover?.(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!canAccept || !isDragging) return;
    
    setIsHovering(false);
    onHover?.(false);
    drop(id, position);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${className} ${
        isHovering && canAccept ? 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-50' : ''
      }`}
      style={{
        transition: 'all 0.2s ease'
      }}
    >
      {children}
      {isHovering && canAccept && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-30 rounded-lg pointer-events-none">
          <div className="flex items-center justify-center h-full">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Drop here
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DragDropProvider;