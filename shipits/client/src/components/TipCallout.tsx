import React from 'react';
import { X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type TipCalloutProps = {
  id: string;
  title: string;
  description: string;
  onDismiss?: (id: string) => void;
  className?: string;
};

export function TipCallout({ id, title, description, onDismiss, className }: TipCalloutProps) {
  return (
    <Card className={`border-amber-200 bg-amber-50 ${className || ''}`}>
      <CardContent className="p-3 flex items-start gap-3">
        <div className="text-amber-600 text-lg">💡</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-amber-900">{title}</div>
          <div className="text-sm text-amber-800 leading-snug mt-0.5">{description}</div>
        </div>
        {onDismiss && (
          <Button aria-label="Dismiss tip" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDismiss(id)}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default TipCallout;


