'use client';

import React, { useState, useCallback, useId } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { QuestaoOrdenacao, RespostaAluno, FragmentoMandarim } from '../../../../../types/atividades';
import MandarinFragment from './MandarinFragment';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

interface OrderingQuestionProps {
  questao: QuestaoOrdenacao;
  resposta: RespostaAluno;
  onAnswer: (resposta: RespostaAluno) => void;
}

type ItemType = QuestaoOrdenacao['itens_para_ordenar'][0];

function shuffleOnce<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface SortableItemRowProps {
  id: string;
  item: ItemType;
  index: number;
  total: number;
  moveItem: (index: number, direction: 'up' | 'down') => void;
}

function SortableItemRow({ id, item, index, total, moveItem }: SortableItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    touchAction: 'pan-y',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-full select-none flex items-center gap-3 p-4 bg-white border-2 rounded-xl transition-colors duration-150 ${
        isDragging
          ? 'border-dashed border-tcm-red/60 bg-red-50/10'
          : 'border-slate-200 hover:border-tcm-red/40 shadow-xs'
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-2 shrink-0 cursor-grab active:cursor-grabbing p-1 -m-1 touch-none"
        title="Arraste para reordenar"
      >
        <GripVertical className="w-5 h-5 text-slate-300 hover:text-slate-500 transition-colors" />
        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs bg-tcm-red/10 text-tcm-red">
          {index + 1}
        </div>
      </div>

      {/* Content */}
      <div
        {...attributes}
        {...listeners}
        className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
      >
        {item.conteudo_mandarim ? (
          <MandarinFragment fragment={item.conteudo_mandarim as FragmentoMandarim} size="sm" />
        ) : (
          <span className="text-sm sm:text-[15px] font-medium text-slate-800 leading-snug">
            {item.texto_simples}
          </span>
        )}
      </div>

      {/* Manual arrows */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            moveItem(index, 'up');
          }}
          disabled={index === 0}
          aria-label={`Mover item ${index + 1} para cima`}
          className="p-1 rounded-md text-slate-400 hover:text-tcm-red hover:bg-tcm-red/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            moveItem(index, 'down');
          }}
          disabled={index === total - 1}
          aria-label={`Mover item ${index + 1} para baixo`}
          className="p-1 rounded-md text-slate-400 hover:text-tcm-red hover:bg-tcm-red/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ItemOverlayPreview({ item, index }: { item: ItemType; index: number }) {
  return (
    <div className="w-full select-none flex items-center gap-3 p-4 bg-white border-2 border-tcm-red rounded-xl shadow-2xl ring-2 ring-tcm-red/20 cursor-grabbing bg-red-50/20">
      <div className="flex items-center gap-2 shrink-0">
        <GripVertical className="w-5 h-5 text-tcm-red" />
        <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs bg-tcm-red text-white shadow-xs">
          {index + 1}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {item.conteudo_mandarim ? (
          <MandarinFragment fragment={item.conteudo_mandarim as FragmentoMandarim} size="sm" />
        ) : (
          <span className="text-sm sm:text-[15px] font-medium text-slate-800 leading-snug">
            {item.texto_simples}
          </span>
        )}
      </div>
    </div>
  );
}

export default function OrderingQuestion({ questao, resposta, onAnswer }: OrderingQuestionProps) {
  const dndId = useId();

  const [items] = useState<ItemType[]>(() => {
    if (resposta.opcao_ids && resposta.opcao_ids.length > 0) {
      return resposta.opcao_ids
        .map((id) => questao.itens_para_ordenar.find((i) => i.id === id)!)
        .filter(Boolean);
    }
    return shuffleOnce(questao.itens_para_ordenar);
  });

  const [orderedItems, setOrderedItems] = useState<ItemType[]>(items);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Desktop Mouse sensor: immediate 4px activation
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 4,
    },
  });

  // Mobile Touch sensor: 220ms hold threshold, cancels on scroll movement >6px
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 220,
      tolerance: 6,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch (_) {}
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = orderedItems.findIndex((it) => it.id === active.id);
      const newIndex = orderedItems.findIndex((it) => it.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(orderedItems, oldIndex, newIndex);
        setOrderedItems(newItems);
        onAnswer({ ...resposta, opcao_ids: newItems.map((i) => i.id) });
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...orderedItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setOrderedItems(newItems);
    onAnswer({ ...resposta, opcao_ids: newItems.map((i) => i.id) });
  };

  const activeItem = activeId ? orderedItems.find((it) => it.id === activeId) : null;
  const activeIndex = activeItem ? orderedItems.indexOf(activeItem) : -1;

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Arraste ou use as setas para ordenar
        </p>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          (No celular, segure o bloco para arrastar)
        </span>
      </div>

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={orderedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 w-full">
            {orderedItems.map((item, idx) => (
              <SortableItemRow
                key={item.id}
                id={item.id}
                item={item}
                index={idx}
                total={orderedItems.length}
                moveItem={moveItem}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeItem && activeIndex !== -1 ? (
            <ItemOverlayPreview item={activeItem} index={activeIndex} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
