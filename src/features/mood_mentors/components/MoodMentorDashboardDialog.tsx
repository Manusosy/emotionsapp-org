import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2, BellRing, Calendar, Users, MessageSquare } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  notificationType: z.enum(['all', 'important', 'none'], {
    required_error: 'Please select a notification preference',
  }),
});

interface MoodMentorDashboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoodMentorDashboardDialog({
  isOpen,
  onClose,
}: MoodMentorDashboardDialogProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notificationType: 'all',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      // Here you would save the settings to your database
      console.log('Form values:', values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast.success('Preferences saved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to save preferences');
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0,
      y: -20,
      transition: { duration: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const statCards = [
    {
      id: 1,
      title: 'Upcoming Sessions',
      value: 12,
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      color: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      id: 2,
      title: 'Total Clients',
      value: 48,
      icon: <Users className="h-5 w-5 text-purple-500" />,
      color: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      id: 3,
      title: 'Unread Messages',
      value: 5,
      icon: <MessageSquare className="h-5 w-5 text-emerald-500" />,
      color: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-xl">
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
        >
          <DialogHeader className="space-y-3 pb-2">
            <DialogTitle className="text-2xl text-center font-bold text-gray-800">
              Welcome to Your Dashboard
            </DialogTitle>
            <p className="text-center text-gray-600">
              Here's a quick overview of your current status
            </p>
          </DialogHeader>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 my-6">
            {statCards.map((card) => (
              <motion.div
                key={card.id}
                variants={itemVariants}
                className={`${card.color} p-4 rounded-lg text-center`}
              >
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 rounded-full bg-white">
                    {card.icon}
                  </div>
                </div>
                <p className={`text-xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
                <p className="text-xs font-medium text-gray-600 mt-1">
                  {card.title}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Notification Preferences */}
          <div className="border border-gray-100 rounded-lg p-5 bg-gray-50 mb-6">
            <h3 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-gray-600" />
              Notification Preferences
            </h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="notificationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="space-y-3"
                        >
                          <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-gray-200">
                            <RadioGroupItem value="all" id="all" />
                            <Label htmlFor="all" className="cursor-pointer">All notifications</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-gray-200">
                            <RadioGroupItem value="important" id="important" />
                            <Label htmlFor="important" className="cursor-pointer">Important only</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-gray-200">
                            <RadioGroupItem value="none" id="none" />
                            <Label htmlFor="none" className="cursor-pointer">No notifications</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <motion.div 
                  className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="mr-3 mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Get more from your dashboard</p>
                    <p>Complete your profile to unlock all features and maximize your success.</p>
                  </div>
                </motion.div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="mr-2"
                    disabled={isSubmitting}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Maybe Later
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-[#0078FF] hover:bg-blue-700"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
} 