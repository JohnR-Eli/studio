"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { clothingCategories, clothingStyles } from '@/lib/constants';

interface TagSelectorProps {
  onSelectionChange: (selectedTags: string[]) => void;
}

export default function TagSelector({ onSelectionChange }: TagSelectorProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    onSelectionChange(selectedTags);
  }, [selectedTags, onSelectionChange]);

  const handleTagChange = (tag: string, checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setSelectedTags(prev =>
        checked ? [...prev, tag] : prev.filter(t => t !== tag)
      );
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Item Types</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {clothingCategories.map(category => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`cat-${category}`}
                onCheckedChange={(checked) => handleTagChange(category, checked)}
                checked={selectedTags.includes(category)}
              />
              <Label htmlFor={`cat-${category}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                {category}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Select Styles</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {clothingStyles.map(style => (
            <div key={style} className="flex items-center space-x-2">
              <Checkbox
                id={`style-${style}`}
                onCheckedChange={(checked) => handleTagChange(style, checked)}
                checked={selectedTags.includes(style)}
              />
              <Label htmlFor={`style-${style}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                {style}
              </Label>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
