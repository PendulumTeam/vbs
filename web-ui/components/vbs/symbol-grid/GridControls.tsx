'use client';

import React, { useContext } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SymbolGridContext } from './SymbolGridContext';
import type { GridControlsProps } from './types';

export function GridControls({ className }: GridControlsProps) {
  const context = useContext(SymbolGridContext);
  
  if (!context) {
    throw new Error('GridControls must be used within a SymbolGridProvider');
  }

  const { state, actions } = context;
  const { settings } = state;

  const handleLogicChange = (value: string) => {
    actions.updateSettings({ searchLogic: value as 'AND' | 'OR' });
  };

  const handleGridToggle = (checked: boolean) => {
    actions.updateSettings({ showGrid: checked });
  };

  const handleEnabledToggle = (checked: boolean) => {
    actions.updateSettings({ isEnabled: checked });
  };

  return (
    <Card className={cn('border-gray-200 shadow-sm', className)}>
      <CardContent className="p-4 space-y-4">
        {/* Search Logic */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Search Logic</Label>
          <RadioGroup
            value={settings.searchLogic}
            onValueChange={handleLogicChange}
            className="flex flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="AND" id="logic-and" />
              <Label htmlFor="logic-and" className="text-sm text-gray-600 cursor-pointer">
                AND
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="OR" id="logic-or" />
              <Label htmlFor="logic-or" className="text-sm text-gray-600 cursor-pointer">
                OR
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-gray-500">
            {settings.searchLogic === 'AND' 
              ? 'Find images containing ALL selected objects'
              : 'Find images containing ANY selected objects'
            }
          </p>
        </div>

        <Separator />

        {/* Visual Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Visual Settings</Label>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="show-grid" className="text-sm text-gray-600 cursor-pointer">
              Show Grid
            </Label>
            <Switch
              id="show-grid"
              checked={settings.showGrid}
              onCheckedChange={handleGridToggle}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-search" className="text-sm text-gray-600 cursor-pointer">
                Enable Search
              </Label>
              <p className="text-xs text-gray-500">
                Allow visual search execution
              </p>
            </div>
            <Switch
              id="enable-search"
              checked={settings.isEnabled}
              onCheckedChange={handleEnabledToggle}
            />
          </div>
        </div>

        {!settings.isEnabled && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            Visual search is disabled. Enable to perform searches.
          </div>
        )}
      </CardContent>
    </Card>
  );
}