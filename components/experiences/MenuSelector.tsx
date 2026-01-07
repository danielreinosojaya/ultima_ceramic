import React, { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'bebidas' | 'snacks' | 'comidas';
  description?: string;
}

interface MenuSelectorProps {
  selectedItems: string[];
  onSelectionChange: (itemIds: string[]) => void;
  onTotalChange: (total: number) => void;
}

const MENU_ITEMS: MenuItem[] = [
  // Bebidas
  { id: 'agua', name: 'Agua', price: 1.5, category: 'bebidas' },
  { id: 'jugo', name: 'Jugo Natural', price: 3.5, category: 'bebidas' },
  { id: 'gaseosa', name: 'Gaseosa', price: 2.0, category: 'bebidas' },
  { id: 'cafe', name: 'Café', price: 2.5, category: 'bebidas' },
  { id: 'te', name: 'Té', price: 2.0, category: 'bebidas' },
  
  // Snacks
  { id: 'chips', name: 'Papas Fritas', price: 3.0, category: 'snacks' },
  { id: 'nachos', name: 'Nachos', price: 4.5, category: 'snacks' },
  { id: 'palomitas', name: 'Palomitas', price: 2.5, category: 'snacks' },
  { id: 'galletas', name: 'Galletas', price: 2.0, category: 'snacks' },
  { id: 'fruta', name: 'Bandeja de Frutas', price: 8.0, category: 'snacks' },
  
  // Comidas
  { id: 'sandwich', name: 'Sandwich', price: 6.5, category: 'comidas' },
  { id: 'pizza', name: 'Pizza (8 porciones)', price: 18.0, category: 'comidas' },
  { id: 'empanadas', name: 'Empanadas (6 unidades)', price: 12.0, category: 'comidas' },
  { id: 'wrap', name: 'Wrap', price: 7.0, category: 'comidas' },
  { id: 'ensalada', name: 'Ensalada', price: 5.5, category: 'comidas' }
];

export function MenuSelector({ selectedItems, onSelectionChange, onTotalChange }: MenuSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<'bebidas' | 'snacks' | 'comidas'>('bebidas');

  useEffect(() => {
    const total = selectedItems.reduce((sum, itemId) => {
      const item = MENU_ITEMS.find(m => m.id === itemId);
      return sum + (item?.price || 0);
    }, 0);
    onTotalChange(total);
  }, [selectedItems, onTotalChange]);

  const handleToggleItem = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    } else {
      onSelectionChange([...selectedItems, itemId]);
    }
  };

  const categories: Array<{ key: 'bebidas' | 'snacks' | 'comidas'; label: string }> = [
    { key: 'bebidas', label: 'Bebidas' },
    { key: 'snacks', label: 'Snacks' },
    { key: 'comidas', label: 'Comidas' }
  ];

  const filteredItems = MENU_ITEMS.filter(item => item.category === activeCategory);

  const selectedCount = selectedItems.length;
  const selectedTotal = selectedItems.reduce((sum, itemId) => {
    const item = MENU_ITEMS.find(m => m.id === itemId);
    return sum + (item?.price || 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header con resumen */}
      <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-brand-text/60">Items seleccionados</p>
            <p className="text-2xl font-bold text-brand-primary">{selectedCount}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-brand-text/60">Total menú</p>
            <p className="text-2xl font-bold text-brand-accent">${selectedTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Tabs de categorías */}
      <div className="flex gap-2 border-b border-brand-border">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 font-medium transition-all ${
              activeCategory === cat.key
                ? 'text-brand-primary border-b-2 border-brand-primary'
                : 'text-brand-text/50 hover:text-brand-text'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredItems.map(item => {
          const isSelected = selectedItems.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleToggleItem(item.id)}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-brand-border hover:border-brand-primary/30 bg-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium text-brand-text">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-brand-text/60 mt-1">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className="font-bold text-brand-accent">${item.price.toFixed(2)}</span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> No se permite traer bebidas ni alimentos de afuera. 
          Pueden traer su torta de cumpleaños si lo desean.
        </p>
      </div>
    </div>
  );
}
