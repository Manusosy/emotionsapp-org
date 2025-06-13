
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface PatientCardProps {
  title: string;
  value: string;
  unit?: string;
  change?: string;
  icon: React.ReactNode;
  color?: string;
}

const PatientCard = ({ title, value, unit, change, icon, color }: PatientCardProps) => {
  const getChangeColor = () => {
    if (!change) return "text-gray-500";
    if (change.startsWith("+")) return "text-green-500";
    if (change.startsWith("-")) return "text-red-500";
    return "text-gray-500";
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center text-sm text-gray-500 mb-1">
          <div className={`${color || "text-gray-500"} mr-2 flex-shrink-0`}>{icon}</div>
          <span className="truncate">{title}</span>
          {change && (
            <span className={`ml-auto text-xs ${getChangeColor()} flex-shrink-0`}>
              {change}
            </span>
          )}
        </div>
        <div className="flex items-end flex-wrap">
          <span className="text-2xl font-bold">{value}</span>
          {unit && <span className="text-gray-500 ml-1 text-sm">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default PatientCard;
