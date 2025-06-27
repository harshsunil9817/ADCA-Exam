"use client";

import { CircleNotch } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <CircleNotch className="w-12 h-12 animate-spin text-primary" />
    </div>
  );
}
