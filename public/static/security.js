// Safe initialization script for app
(function() {
  // Initialize app resources
  console.log('App resources initialized');
  
  // Set up any required event listeners
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
  
  function initApp() {
    // Safe initialization code
    console.log('App initialized successfully');
  }
})(); 