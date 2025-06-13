// This file re-exports useAuth from the authContext file to maintain backward compatibility
// while fixing the Fast Refresh error that occurs when default exporting a hook

import { useAuth } from '../contexts/authContext';

export { useAuth }; 