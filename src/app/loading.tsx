"use client";

import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
    </div>
  );
}
