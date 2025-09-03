// Debug script to test store functionality
console.log('Starting store debug...');

// Try to import the store
try {
  // This is a simple test to see if the store can be imported
  console.log('✅ Store import successful');
  
  // Check if we can access the store
  const { useAppStore } = require('./src/store/app.ts');
  console.log('✅ useAppStore imported');
  
  // Try to get the store state
  const store = useAppStore.getState();
  console.log('✅ Store state accessed');
  
  // Check what functions are available
  const functions = Object.keys(store).filter(key => typeof store[key] === 'function');
  console.log('Available functions:', functions);
  
  // Check specifically for getFriendRequests
  if (typeof store.getFriendRequests === 'function') {
    console.log('✅ getFriendRequests function exists');
  } else {
    console.log('❌ getFriendRequests function is missing');
    console.log('Type of getFriendRequests:', typeof store.getFriendRequests);
  }
  
} catch (error) {
  console.error('❌ Store debug failed:', error.message);
  console.error('Stack:', error.stack);
}
