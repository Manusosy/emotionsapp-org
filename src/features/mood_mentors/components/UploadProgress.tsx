import React from 'react';
import { motion } from 'framer-motion';
import { Check, Upload, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface UploadProgressProps {
  progress: number;
  fileName: string;
  fileSize: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
  onCancel?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  fileName,
  fileSize,
  isComplete,
  hasError,
  errorMessage,
  onCancel
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full"
    >
      <Card className={`border ${hasError ? 'border-red-200 bg-red-50' : isComplete ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${hasError ? 'bg-red-100' : isComplete ? 'bg-green-100' : 'bg-blue-100'}`}>
                {hasError ? (
                  <X className="h-4 w-4 text-red-600" />
                ) : isComplete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Upload className="h-4 w-4 text-blue-600" />
                  </motion.div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {fileName}
                </p>
                <p className="text-xs text-gray-500">
                  {fileSize}
                </p>
              </div>
            </div>
            
            {!isComplete && !hasError && onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {hasError ? (
            <div className="text-sm text-red-600">
              {errorMessage || 'Upload failed'}
            </div>
          ) : isComplete ? (
            <div className="text-sm text-green-600 font-medium">
              Upload complete!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress 
                value={progress} 
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}; 