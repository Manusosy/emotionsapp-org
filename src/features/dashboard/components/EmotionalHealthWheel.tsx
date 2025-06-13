import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, HeartPulse } from "lucide-react"; // Added HeartPulse icon
// import { Brain } from "lucide-react"; // Not used directly in this component anymore
// import StressAssessmentModal from "./StressAssessmentModal"; // Assuming this is handled by the parent page

type EmotionalHealthWheelProps = {
  stressLevel?: number; // Optional: only present if hasAssessments is true
  lastCheckIn?: string; // Optional: only present if hasAssessments is true
  onViewDetails: () => void;
  hasAssessments: boolean;
  statusText?: string; // e.g., "Fair", "Good", "Excellent" - pass this from parent
  onTakeAssessment: () => void; // Added prop for navigation/modal opening
};

export default function EmotionalHealthWheel({
  stressLevel,
  lastCheckIn,
  onViewDetails,
  hasAssessments,
  statusText,
  onTakeAssessment,
}: EmotionalHealthWheelProps) {
  const displayLastCheckIn = hasAssessments && lastCheckIn ? lastCheckIn : "-";

  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  let calculatedHealthPercentage = 0;
  if (hasAssessments && typeof stressLevel === 'number') {
    // raw_score (stressLevel prop) is 1-5. 1 is low stress (good), 5 is high stress (bad).
    // Health percentage: 1 -> 100%, 5 -> 0%.
    calculatedHealthPercentage = Math.max(0, Math.min(100, ((5 - stressLevel) / 4) * 100));
  } else {
    // Default to 0% health if no assessments or invalid stressLevel
    calculatedHealthPercentage = 0;
  }

  const strokeDashoffset = circumference - (calculatedHealthPercentage / 100) * circumference;

  const getWheelColor = () => {
    if (!hasAssessments) return "#e5e7eb"; 
    // Colors based on the calculatedHealthPercentage (0-100 scale)
    if (calculatedHealthPercentage >= 75) return "#22c55e"; // Green (Excellent)
    if (calculatedHealthPercentage >= 50) return "#84cc16"; // Lime (Good)
    if (calculatedHealthPercentage >= 25) return "#facc15"; // Yellow (Fair/Concerning lower end)
    return "#ef4444"; // Red (Concerning upper end/Worrying)
  };

  const getStatusTextColor = () => {
    if (!hasAssessments) return "text-slate-500";
    // Colors based on the calculatedHealthPercentage to match wheel arc logic
    if (calculatedHealthPercentage >= 75) return "text-green-600";
    if (calculatedHealthPercentage >= 50) return "text-lime-600";
    if (calculatedHealthPercentage >= 25) return "text-yellow-500";
    return "text-red-600";
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          {/* Reduced title size */}
          <CardTitle className="text-lg font-semibold">Stress Analytics</CardTitle>
          <Button 
            variant="outline" 
            className="bg-[#20C0F3] hover:bg-[#1ab3e6] text-white border-none h-10 px-6 rounded-md flex items-center gap-2"
            onClick={onTakeAssessment}
          >
            <HeartPulse className="h-4 w-4" />
            Take Assessment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-6">
        <div className="relative w-52 h-52 flex items-center justify-center mb-4">
          <svg 
            className="w-full h-full"
            viewBox="0 0 120 120" 
          >
            {/* Background circle - always visible */}
            <circle 
              cx="60" 
              cy="60" 
              r={radius} 
              strokeWidth="10"
              stroke="#f3f4f6" // Light gray background
              fill="none" 
            />
            {/* Progress circle - only rendered if assessments exist */}
            {hasAssessments && (
              <circle 
                cx="60" 
                cy="60" 
                r={radius} 
                strokeWidth="10"
                stroke={getWheelColor()} 
                fill="none" 
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-in-out"
                // Rotate to start at 6 o'clock position and fill clockwise
                // Default 0 angle is 3 o'clock. -90 is 12 o'clock. +90 is 6 o'clock.
                transform="rotate(90 60 60)" 
              />
            )}
          </svg>
          
          {/* Center text */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            {hasAssessments ? (
              <>
                <p className="text-sm text-slate-600 mb-0.5">Last assessment</p>
                <p className="text-lg font-medium text-slate-800">{displayLastCheckIn}</p>
              </>
            ) : (
              <p className="text-md font-medium text-slate-500 px-4">
                You have not taken any assessment yet.
              </p>
            )}
          </div>
        </div>
        
        {/* Status Text and View Details Button - Conditionally Rendered */}
        {hasAssessments && statusText && (
          <div className="text-center mt-2 mb-4">
            <p className={`text-lg font-medium ${getStatusTextColor()}`}>
              {statusText}
            </p>
            <p className="text-sm text-slate-600 mt-1">Your assessment result</p>
          </div>
        )}

        {hasAssessments && (
          <Button 
            variant="default" // Changed to default for solid blue
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center group"
            onClick={onViewDetails}
          >
            <BarChart3 className="w-4 h-4 mr-2 transition-transform duration-200 ease-in-out group-hover:scale-110" />
            View Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 