import { Info } from 'lucide-react';

interface WhyThisMattersContentProps {
  step: number;
}

export function WhyThisMattersContent({ step }: WhyThisMattersContentProps) {
  switch (step) {
    case 1:
      return (
        <>
          <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-white" />
            Getting Started
          </h4>
          <p className="text-xs text-white leading-relaxed">
            Your basic information helps create meaningful connections with others.
          </p>
        </>
      );
    case 2:
      return (
        <>
          <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-white" />
            Your Expertise
          </h4>
          <p className="text-xs text-white leading-relaxed">
            Share your background to connect with those who need your guidance.
          </p>
        </>
      );
    case 3:
      return (
        <>
          <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-white" />
            Almost There
          </h4>
          <p className="text-xs text-white leading-relaxed">
            Your story helps others feel understood during their journey.
          </p>
        </>
      );
    default:
      return null;
  }
} 