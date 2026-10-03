import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { ArrowDown } from 'lucide-react';

export interface KanbanStage {
  id: string;
  title: string;
  dotColor?: string;
  headerBg?: string;
  badgeBg?: string;
  colBg?: string;
}

export interface KanbanBoardProps<T> {
  stages: KanbanStage[];
  items: T[];
  getStatus: (item: T) => string;
  getId: (item: T) => string | number;
  onDragEnd: (result: DropResult) => void;
  renderCard: (item: T, index: number, snapshot: { isDragging: boolean }) => React.ReactNode;
  minHeight?: string;
  gridColsClass?: string;
  emptyPlaceholderText?: string;
}

export function KanbanBoard<T>({
  stages,
  items,
  getStatus,
  getId,
  onDragEnd,
  renderCard,
  minHeight = 'min-h-[650px]',
  gridColsClass = '',
  emptyPlaceholderText = 'Drop tasks here'
}: KanbanBoardProps<T>) {
  const isGrid = stages.length <= 4;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="w-full overflow-x-auto pb-4 pt-1 scrollbar-thin">
        <div
          className={
            isGrid
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full'
              : 'flex gap-4 w-max min-w-full'
          }
        >
          {stages.map((stage) => {
            const stageItems = items.filter((item) => getStatus(item) === stage.id);

            return (
              <div
                key={stage.id}
                className={`flex flex-col rounded-2xl border ${stage.colBg || 'bg-slate-50/40 dark:bg-slate-950/10 border-gray-300 dark:border-gray-700'
                  } pt-3.5 pb-2.5 h-[calc(100vh-230px)] max-h-[calc(100vh-230px)] min-h-[500px] ${
                    isGrid ? 'w-full' : 'w-[320px] min-w-[300px] shrink-0'
                  }`}
              >
              <div className="flex items-center gap-2 px-4 pb-3 mb-3 font-semibold text-sm border-b border-gray-300 dark:border-gray-600 shrink-0">
                {stage.dotColor && <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${stage.dotColor}`} />}
                <span className="text-gray-800 dark:text-gray-200 font-bold">{stage.title}</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full h-5 min-w-5 px-1.5 text-xs font-semibold ${stage.badgeBg || 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                >
                  {stageItems.length}
                </span>
              </div>

              {/* Droppable Area */}
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 transition-colors rounded-xl space-y-3 pl-3.5 pr-1.5 overflow-y-auto ${snapshot.isDraggingOver ? 'bg-primary/5 ring-2 ring-primary/20 ring-dashed' : ''
                      }`}
                  >
                    {stageItems.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-gray-300 dark:text-gray-600 select-none">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center mb-2">
                          <span className="text-sm font-bold opacity-60"><ArrowDown className='size-5' /></span>
                        </div>
                        <span className="text-xs font-medium text-gray-400/80 dark:text-gray-500/80">
                          {emptyPlaceholderText}
                        </span>
                      </div>
                    ) : (
                      stageItems.map((item, index) => {
                        const id = String(getId(item));
                        return (
                          <Draggable key={id} draggableId={id} index={index}>
                            {(providedDrag, snapshotDrag) => (
                              <div
                                ref={providedDrag.innerRef}
                                {...providedDrag.draggableProps}
                                {...providedDrag.dragHandleProps}
                              >
                                {renderCard(item, index, snapshotDrag)}
                              </div>
                            )}
                          </Draggable>
                        );
                      })
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
        </div>
      </div>
    </DragDropContext>
  );
}
