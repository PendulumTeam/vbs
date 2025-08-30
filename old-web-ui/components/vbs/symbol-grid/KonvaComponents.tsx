'use client';

import React, { useContext, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { SymbolGridContext } from './SymbolGridContext';
import type { PositionedSymbol } from './types';

// Grid Layer Component for showing grid lines
const GridLayer = React.memo(({ 
  cellSize, 
  gridSize 
}: { 
  cellSize: number; 
  gridSize: number; 
}) => {
  const lines = [];
  
  // Vertical lines
  for (let i = 1; i < gridSize; i++) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[
          i * cellSize, 0,
          i * cellSize, cellSize * gridSize
        ]}
        stroke="rgba(156, 163, 175, 0.5)" // gray-400 with opacity
        strokeWidth={0.5}
        dash={[5, 5]}
      />
    );
  }
  
  // Horizontal lines  
  for (let i = 1; i < gridSize; i++) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[
          0, i * cellSize,
          cellSize * gridSize, i * cellSize
        ]}
        stroke="rgba(156, 163, 175, 0.5)" // gray-400 with opacity
        strokeWidth={0.5}
        dash={[5, 5]}
      />
    );
  }

  return <Layer>{lines}</Layer>;
});

GridLayer.displayName = 'GridLayer';

// Individual symbol component for Konva canvas
const PlacedSymbol = React.memo(({
  symbol,
  isSelected,
  onSelect,
  onChange,
}: {
  symbol: PositionedSymbol;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<PositionedSymbol>) => void;
}) => {
  const [image] = useImage(symbol.src);
  const shapeRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Setup transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragStart = () => {
    if (shapeRef.current) {
      shapeRef.current.moveToTop();
      if (transformerRef.current) {
        transformerRef.current.moveToTop();
      }
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      position: {
        x: e.target.x(),
        y: e.target.y(),
      },
    });
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (node) {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      // Reset scale and apply to dimensions
      node.scaleX(1);
      node.scaleY(1);
      
      onChange({
        position: {
          x: node.x(),
          y: node.y(),
        },
        dimensions: {
          width: Math.max(20, symbol.dimensions.width * scaleX),
          height: Math.max(20, symbol.dimensions.height * scaleY),
        },
        rotation: node.rotation(),
      });
    }
  };

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={image}
        x={symbol.position.x}
        y={symbol.position.y}
        width={symbol.dimensions.width}
        height={symbol.dimensions.height}
        rotation={symbol.rotation}
        offsetX={symbol.dimensions.width / 2}
        offsetY={symbol.dimensions.height / 2}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            // Minimum size constraint
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
});

PlacedSymbol.displayName = 'PlacedSymbol';

// Main Konva Components
export default function KonvaComponents() {
  const context = useContext(SymbolGridContext);
  const stageRef = useRef<Konva.Stage>(null);

  if (!context) {
    throw new Error('KonvaComponents must be used within a SymbolGridProvider');
  }

  const { state, actions } = context;

  // Handle clicking outside symbols to deselect
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      actions.selectSymbol(null);
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={state.dimensions.width}
      height={state.dimensions.height}
      onMouseDown={handleStageClick}
      onTouchStart={handleStageClick}
    >
      {/* Grid lines layer */}
      {state.settings.showGrid && (
        <GridLayer
          cellSize={state.dimensions.cellSize}
          gridSize={8}
        />
      )}
      
      {/* Symbols layer */}
      <Layer>
        {state.symbols.map((symbol) => (
          <PlacedSymbol
            key={symbol.id}
            symbol={symbol}
            isSelected={symbol.id === state.selectedSymbolId}
            onSelect={() => actions.selectSymbol(symbol.id)}
            onChange={(updates) => actions.updateSymbol(symbol.id, updates)}
          />
        ))}
      </Layer>
    </Stage>
  );
}