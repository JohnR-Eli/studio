"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';

export type WardrobeItem = {
  category: string;
  brand: string;
};

interface WardrobeTableProps {
  wardrobe: WardrobeItem[];
  setWardrobe: (wardrobe: WardrobeItem[]) => void;
}

export default function WardrobeTable({ wardrobe, setWardrobe }: WardrobeTableProps) {
  const addRow = () => {
    setWardrobe([...wardrobe, { category: '', brand: '' }]);
  };

  const removeRow = (index: number) => {
    const newWardrobe = [...wardrobe];
    newWardrobe.splice(index, 1);
    setWardrobe(newWardrobe);
  };

  const updateRow = (index: number, field: keyof WardrobeItem, value: string) => {
    const newWardrobe = [...wardrobe];
    newWardrobe[index][field] = value;
    setWardrobe(newWardrobe);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <ScrollArea className="h-72 w-full rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wardrobe.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Input
                    type="text"
                    value={item.category}
                    onChange={(e) => updateRow(index, 'category', e.target.value)}
                    placeholder="e.g., Top"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={item.brand}
                    onChange={(e) => updateRow(index, 'brand', e.target.value)}
                    placeholder="e.g., NIKE"
                  />
                </TableCell>
                <TableCell>
                  {index > 0 && (
                    <Button variant="ghost" size="icon" onClick={() => removeRow(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="flex justify-center mt-4">
        <Button onClick={addRow}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </div>
    </div>
  );
}
