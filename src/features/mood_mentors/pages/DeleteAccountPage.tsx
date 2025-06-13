import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/authContext';

export default function DeleteAccountPage() {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, signOut, deleteUser } = useAuth();
  const navigate = useNavigate();
  
  // Check if the confirmation text matches "DELETE"
  const isFormValid = confirmationText === 'DELETE';
  
  const handleDeleteAccount = async () => {
    if (!isFormValid) return;
    
    try {
      setIsDeleting(true);
      
      // Call the auth service to delete the user account
      if (user?.id) {
        const result = await deleteUser(user.id);
        if (result.error) throw new Error(result.error);
      }
      
      toast.success("Account deletion initiated");
      
      // Log out the user
      await signOut();
      
      // Navigate to home
      navigate("/", { replace: true });
      
      toast.success("Your account has been deleted successfully");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Delete Account</h1>
        
        <div className="space-y-6">
          <div className="bg-red-50 p-4 rounded-md border border-red-200">
            <h2 className="text-lg font-medium text-red-800 mb-2">Warning: This action cannot be undone</h2>
            <p className="text-red-700">
              Deleting your account will permanently remove all your data, including:
            </p>
            <ul className="list-disc list-inside mt-2 text-red-700 space-y-1">
              <li>Your profile information</li>
              <li>Your appointment history</li>
              <li>Your messages and conversations</li>
              <li>Your patient/mentor relationships</li>
            </ul>
          </div>
          
          <div>
            <p className="text-gray-700 mb-4">
              To confirm deletion, please type <strong>DELETE</strong> in the field below:
            </p>
            <Input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="max-w-xs"
              placeholder="Type DELETE to confirm"
            />
          </div>
          
          <div className="flex space-x-4">
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!isFormValid || isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete My Account"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 