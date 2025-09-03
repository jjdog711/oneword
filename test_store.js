// Simple test to check store functionality
const { useAppStore } = require('./src/store/app.ts');

console.log('Testing store...');

const store = useAppStore.getState();
console.log('Store state:', Object.keys(store));

// Check if getFriendRequests exists
if (typeof store.getFriendRequests === 'function') {
  console.log('✅ getFriendRequests function exists');
} else {
  console.log('❌ getFriendRequests function is missing');
  console.log('Available functions:', Object.keys(store).filter(key => typeof store[key] === 'function'));
}

// Check if sendFriendRequest exists
if (typeof store.sendFriendRequest === 'function') {
  console.log('✅ sendFriendRequest function exists');
} else {
  console.log('❌ sendFriendRequest function is missing');
}

console.log('Test complete');
