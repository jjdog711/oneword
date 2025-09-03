const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Check for required environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL');
  console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test user data
const testUsers = [
  { email: 'jjdog@example.com', password: 'password', name: 'jjdog', username: 'jjdog' },
  { email: 'skye@example.com', password: 'password', name: 'skye', username: 'skye' },
  { email: 'sadie@example.com', password: 'password', name: 'sadie', username: 'sadie' }
];

// Sample word data for the past 10 days
const wordData = {
  // Direct messages between users
  messages: [
    // jjdog ↔ skye
    { date: '2025-08-15', sender: 'jjdog', receiver: 'skye', word: 'reach', time: '20:15' },
    { date: '2025-08-15', sender: 'skye', receiver: 'jjdog', word: 'quiet', time: '21:30' },
    { date: '2025-08-16', sender: 'skye', receiver: 'jjdog', word: 'pull', time: '19:45' },
    { date: '2025-08-17', sender: 'jjdog', receiver: 'skye', word: 'burn', time: '20:20' },
    { date: '2025-08-19', sender: 'jjdog', receiver: 'skye', word: 'grip', time: '18:30' },
    { date: '2025-08-19', sender: 'skye', receiver: 'jjdog', word: 'let go', time: '22:15' },
    { date: '2025-08-20', sender: 'jjdog', receiver: 'skye', word: 'flow', time: '20:00' },
    { date: '2025-08-20', sender: 'skye', receiver: 'jjdog', word: 'pause', time: '21:45' },
    { date: '2025-08-21', sender: 'jjdog', receiver: 'skye', word: 'rise', time: '19:30' },
    { date: '2025-08-22', sender: 'jjdog', receiver: 'skye', word: 'stillness', time: '20:45' },
    { date: '2025-08-22', sender: 'skye', receiver: 'jjdog', word: 'echo', time: '21:20' },
    { date: '2025-08-24', sender: 'jjdog', receiver: 'skye', word: 'anchor', time: '18:15' },
    { date: '2025-08-24', sender: 'skye', receiver: 'jjdog', word: 'hope', time: '20:30' },

    // jjdog ↔ sadie
    { date: '2025-08-15', sender: 'jjdog', receiver: 'sadie', word: 'grit', time: '19:20' },
    { date: '2025-08-15', sender: 'sadie', receiver: 'jjdog', word: 'slow', time: '21:00' },
    { date: '2025-08-16', sender: 'jjdog', receiver: 'sadie', word: 'ache', time: '20:30' },
    { date: '2025-08-16', sender: 'sadie', receiver: 'jjdog', word: 'heal', time: '22:15' },
    { date: '2025-08-17', sender: 'sadie', receiver: 'jjdog', word: 'echo', time: '19:45' },
    { date: '2025-08-19', sender: 'jjdog', receiver: 'sadie', word: 'wake', time: '20:00' },
    { date: '2025-08-19', sender: 'sadie', receiver: 'jjdog', word: 'drift', time: '21:30' },
    { date: '2025-08-20', sender: 'jjdog', receiver: 'sadie', word: 'breathe', time: '18:45' },
    { date: '2025-08-21', sender: 'jjdog', receiver: 'sadie', word: 'shine', time: '20:15' },
    { date: '2025-08-21', sender: 'sadie', receiver: 'jjdog', word: 'glow', time: '21:00' },
    { date: '2025-08-22', sender: 'sadie', receiver: 'jjdog', word: 'stillness', time: '19:30' },
    { date: '2025-08-23', sender: 'jjdog', receiver: 'sadie', word: 'peace', time: '20:45' },
    { date: '2025-08-23', sender: 'sadie', receiver: 'jjdog', word: 'calm', time: '21:15' },

    // skye ↔ sadie
    { date: '2025-08-15', sender: 'skye', receiver: 'sadie', word: 'gentle', time: '20:45' },
    { date: '2025-08-15', sender: 'sadie', receiver: 'skye', word: 'kind', time: '21:30' },
    { date: '2025-08-16', sender: 'skye', receiver: 'sadie', word: 'soft', time: '19:15' },
    { date: '2025-08-17', sender: 'skye', receiver: 'sadie', word: 'warm', time: '20:30' },
    { date: '2025-08-17', sender: 'sadie', receiver: 'skye', word: 'cozy', time: '21:45' },
    { date: '2025-08-19', sender: 'sadie', receiver: 'skye', word: 'dream', time: '18:30' },
    { date: '2025-08-20', sender: 'skye', receiver: 'sadie', word: 'light', time: '20:00' },
    { date: '2025-08-20', sender: 'sadie', receiver: 'skye', word: 'bright', time: '21:30' },
    { date: '2025-08-21', sender: 'skye', receiver: 'sadie', word: 'spark', time: '19:45' },
    { date: '2025-08-22', sender: 'skye', receiver: 'sadie', word: 'glow', time: '20:15' },
    { date: '2025-08-22', sender: 'sadie', receiver: 'skye', word: 'shine', time: '21:00' },
    { date: '2025-08-24', sender: 'skye', receiver: 'sadie', word: 'hope', time: '18:45' },
    { date: '2025-08-24', sender: 'sadie', receiver: 'skye', word: 'faith', time: '20:15' }
  ],

  // Public words
  publicWords: [
    { date: '2025-08-15', user: 'jjdog', word: 'grit' },
    { date: '2025-08-15', user: 'skye', word: 'slow' },
    { date: '2025-08-15', user: 'sadie', word: 'gentle' },
    { date: '2025-08-16', user: 'jjdog', word: 'ache' },
    { date: '2025-08-16', user: 'skye', word: 'pull' },
    { date: '2025-08-17', user: 'jjdog', word: 'still' },
    { date: '2025-08-17', user: 'skye', word: 'echo' },
    { date: '2025-08-17', user: 'sadie', word: 'warm' },
    { date: '2025-08-19', user: 'jjdog', word: 'wake' },
    { date: '2025-08-19', user: 'skye', word: 'drift' },
    { date: '2025-08-19', user: 'sadie', word: 'dream' },
    { date: '2025-08-20', user: 'skye', word: 'light' },
    { date: '2025-08-20', user: 'sadie', word: 'bright' },
    { date: '2025-08-21', user: 'jjdog', word: 'rise' },
    { date: '2025-08-21', user: 'skye', word: 'spark' },
    { date: '2025-08-21', user: 'sadie', word: 'glow' },
    { date: '2025-08-22', user: 'jjdog', word: 'stillness' },
    { date: '2025-08-22', user: 'skye', word: 'glow' },
    { date: '2025-08-22', user: 'sadie', word: 'shine' },
    { date: '2025-08-23', user: 'jjdog', word: 'peace' },
    { date: '2025-08-23', user: 'sadie', word: 'calm' },
    { date: '2025-08-24', user: 'jjdog', word: 'anchor' },
    { date: '2025-08-24', user: 'skye', word: 'hope' },
    { date: '2025-08-24', user: 'sadie', word: 'faith' },
    { date: '2025-08-25', user: 'skye', word: 'mine' },
    { date: '2025-08-25', user: 'sadie', word: 'today' }
  ]
};

async function checkOrCreateUser(userData) {
  try {
    // First, try to sign in to see if user exists
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: userData.password
    });

    if (signInData.user) {
      console.log(`✅ User ${userData.username} already exists (${signInData.user.id})`);
      // Sign out after checking
      await supabase.auth.signOut();
      return signInData.user.id;
    }

    // If sign in fails, create the user
    console.log(`Creating user ${userData.username}...`);
    
    // For development, we'll use a simple approach
    // In production, you'd use the admin API
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          username: userData.username
        }
      }
    });

    if (signUpError) {
      console.error(`Error creating user ${userData.username}:`, signUpError);
      return null;
    }

    console.log(`✅ Created user: ${userData.username} (${signUpData.user.id})`);
    return signUpData.user.id;
  } catch (error) {
    console.error(`Error with user ${userData.username}:`, error);
    return null;
  }
}

async function createFriendship(user1Id, user2Id) {
  try {
    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user1Id,
        addressee_id: user2Id,
        status: 'accepted'
      });

    if (error) {
      console.error('Error creating friendship:', error);
      return false;
    }

    console.log(`✅ Created friendship between users`);
    return true;
  } catch (error) {
    console.error('Error creating friendship:', error);
    return false;
  }
}

async function createMessage(senderId, receiverId, content, date, time) {
  try {
    const [hours, minutes] = time.split(':');
    const created_at = new Date(`${date}T${hours}:${minutes}:00.000Z`);

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content.toLowerCase()
      });

    if (error) {
      console.error('Error creating message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating message:', error);
    return false;
  }
}

async function createPublicWord(userId, word, date) {
  try {
    const { error } = await supabase
      .from('words')
      .insert({
        sender_id: userId,
        receiver_id: userId, // Self-send for public words
        date_local: date,
        text: word.toLowerCase(),
        is_public: true
      });

    if (error) {
      console.error('Error creating public word:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating public word:', error);
    return false;
  }
}

async function seedData() {
  console.log('🌱 Starting OneWord dev data seeding...\n');

  // Step 1: Create users
  const userIds = {};
  for (const userData of testUsers) {
    const userId = await checkOrCreateUser(userData);
    if (userId) {
      userIds[userData.username] = userId;
    }
  }

  if (Object.keys(userIds).length !== 3) {
    console.error('❌ Failed to create all users. Aborting.');
    return;
  }

  console.log('\n👥 Users ready!\n');

  // Step 2: Create friendships
  const friendships = [
    ['jjdog', 'skye'],
    ['jjdog', 'sadie'],
    ['skye', 'sadie']
  ];

  for (const [user1, user2] of friendships) {
    await createFriendship(userIds[user1], userIds[user2]);
  }

  console.log('\n🤝 Friendships created successfully!\n');

  // Step 3: Create messages
  console.log('💬 Creating direct messages...');
  let messageCount = 0;
  for (const message of wordData.messages) {
    const success = await createMessage(
      userIds[message.sender],
      userIds[message.receiver],
      message.word,
      message.date,
      message.time
    );
    if (success) messageCount++;
  }
  console.log(`✅ Created ${messageCount} direct messages\n`);

  // Step 4: Create public words
  console.log('📢 Creating public words...');
  let publicWordCount = 0;
  for (const publicWord of wordData.publicWords) {
    const success = await createPublicWord(
      userIds[publicWord.user],
      publicWord.word,
      publicWord.date
    );
    if (success) publicWordCount++;
  }
  console.log(`✅ Created ${publicWordCount} public words\n`);

  console.log('🎉 Seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${Object.keys(userIds).length}`);
  console.log(`- Friendships: ${friendships.length}`);
  console.log(`- Direct Messages: ${messageCount}`);
  console.log(`- Public Words: ${publicWordCount}`);
  console.log('\n🔑 Login credentials:');
  testUsers.forEach(user => {
    console.log(`  ${user.username}: ${user.email} / ${user.password}`);
  });
}

// Run the seeding
seedData().catch(console.error);
