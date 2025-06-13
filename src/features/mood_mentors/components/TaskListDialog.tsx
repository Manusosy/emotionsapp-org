import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Circle, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  action?: {
    label: string;
    url: string;
  };
}

interface TaskListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onTaskComplete: (taskId: string) => void;
}

export function TaskListDialog({
  isOpen,
  onClose,
  tasks,
  onTaskComplete,
}: TaskListDialogProps) {
  const [animatingOut, setAnimatingOut] = useState(false);
  
  if (!isOpen) return null;

  const completedTasks = tasks.filter(task => task.completed);
  const completionPercentage = tasks.length > 0 
    ? Math.round((completedTasks.length / tasks.length) * 100) 
    : 0;
  
  const handleClose = () => {
    setAnimatingOut(true);
    setTimeout(() => {
      setAnimatingOut(false);
      onClose();
    }, 300);
  };

  const priorityColors = {
    high: {
      bg: 'bg-red-50',
      border: 'border-red-100',
      text: 'text-red-800',
    },
    medium: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      text: 'text-amber-800',
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      text: 'text-blue-800',
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-6 left-6 z-50 w-96 bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#0078FF]" />
              <h3 className="font-semibold text-gray-800">Get Started</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 text-gray-400 hover:bg-gray-100"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-4">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-gray-600">Your progress</span>
                <span className="text-sm font-semibold text-gray-800">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
            
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onComplete={() => onTaskComplete(task.id)} 
                />
              ))}
            </div>
          </div>
          
          <div className="bg-gray-50 p-3 border-t border-gray-100">
            <Button
              variant="link"
              className="w-full text-[#0078FF] hover:text-blue-700 flex items-center justify-center"
              onClick={handleClose}
            >
              View all tasks
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TaskItem({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const priorityStyle = {
    high: {
      indicator: 'bg-red-500',
      text: 'text-red-600 font-medium',
    },
    medium: {
      indicator: 'bg-amber-500',
      text: 'text-amber-600 font-medium',
    },
    low: {
      indicator: 'bg-blue-500',
      text: 'text-blue-600 font-medium',
    },
  };

  return (
    <motion.div
      className={`p-3 rounded-lg border ${task.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onComplete}
          className="mt-0.5 flex-shrink-0"
        >
          {task.completed ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-gray-300" />
          )}
        </button>
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h4 className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
              {task.title}
            </h4>
            <div className={`h-2 w-2 rounded-full ${priorityStyle[task.priority].indicator}`} />
          </div>
          
          <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
            {task.description}
          </p>
          
          {task.action && !task.completed && (
            <a
              href={task.action.url}
              className="inline-flex items-center text-sm text-[#0078FF] hover:text-blue-700 mt-2 font-medium"
            >
              {task.action.label}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
} 