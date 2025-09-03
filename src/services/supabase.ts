// Supabase client setup
// This module exposes a configured Supabase client using Expo Constants.
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { logger } from '@/lib/logger';
import { createUserFriendlyError, handleAsyncError, AppError, ErrorCodes } from '@/lib/errors';
import { getDayKeyForUser } from '@/lib/dates';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your app.config.js or app.json file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const addWord = async (word: string, receiverId: string = '00000000-0000-0000-0000-000000000001') => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to send words.',
        true
      );
    }

    // Store with UTC timestamp - let database functions handle timezone conversion
    const { error } = await supabase.from('words').insert({
      sender_id: userData.user.id,
      receiver_id: receiverId,
      text: word,
      reveal: 'instant'
    });

    if (error) {
      logger.error('Failed to insert word', { error, word, receiverId });
      throw createUserFriendlyError(error);
    }

    logger.info('Word sent successfully', { word, receiverId });
  }, 'addWord');
};

export const addPublicWord = async (word: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to add public words.',
        true
      );
    }

    // Check if user has already sent a public word today using database function
    const { data: hasAlreadySent, error: checkError } = await supabase
      .rpc('has_user_sent_word_today', {
        user_uuid: userData.user.id,
        receiver_uuid: userData.user.id,
        is_public_param: true
      });

    if (checkError) {
      logger.error('Failed to check daily word limit', { error: checkError });
      throw createUserFriendlyError(checkError);
    }

    if (hasAlreadySent) {
      throw new AppError(
        ErrorCodes.DAILY_WORD_LIMIT_EXCEEDED,
        'Daily word limit exceeded',
        'You have already shared your word for today. Come back tomorrow to share another word!',
        true
      );
    }

    // Store with UTC timestamp - let database functions handle timezone conversion
    const { error } = await supabase.from('words').insert({
      sender_id: userData.user.id,
      receiver_id: userData.user.id, // Self-send for public words
      text: word,
      is_public: true
    });

    if (error) {
      logger.error('Failed to insert public word', { error, word });
      throw createUserFriendlyError(error);
    }

    logger.info('Public word sent successfully', { word });
  }, 'addPublicWord');
};

export const getPublicWords = async () => {
  return handleAsyncError(async () => {
    // Get user's timezone from profile
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view public words.',
        true
      );
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userData.user.id)
      .single();
    
    if (profileError) {
      logger.warn('Failed to get user timezone, using default', { error: profileError });
    }
    
    const userTimezone = profile?.timezone || 'America/New_York';
    const today = getDayKeyForUser(userTimezone);
    console.log('getPublicWords - today (user timezone):', today);

    // Use database function for proper timezone handling
    const { data, error } = await supabase.rpc('get_public_words_today');

    if (error) {
      logger.error('Failed to fetch public words', { error });
      throw createUserFriendlyError(error);
    }

    console.log('getPublicWords - raw data:', data);

    // Aggregate words by text and count occurrences
    const wordCounts = new Map<string, number>();
    data?.forEach((word: any) => {
      wordCounts.set(word.text, (wordCounts.get(word.text) || 0) + 1);
    });

    const result = Array.from(wordCounts.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log('getPublicWords - result:', result);
    logger.info('Public words fetched successfully', { count: result.length });
    return result;
  }, 'getPublicWords');
};

export const getCurrentUserPublicWord = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view your word.',
        true
      );
    }

    // Use database function for proper timezone handling
    const { data, error } = await supabase.rpc('get_user_public_word_today', {
      user_uuid: userData.user.id
    });

    if (error) {
      logger.error('Failed to fetch current user public word', { error });
      throw createUserFriendlyError(error);
    }

    const todayWord = data && data.length > 0 ? data[0] : null;
    logger.info('Current user public word fetched successfully', { hasWord: !!todayWord });
    return todayWord;
  }, 'getCurrentUserPublicWord');
};

// Get friends' public words for the current day or their most recent
export const getFriendsPublicWords = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view friends\' words.',
        true
      );
    }

    // Get user's timezone from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userData.user.id)
      .single();
    
    if (profileError) {
      logger.warn('Failed to get user timezone, using default', { error: profileError });
    }
    
    const userTimezone = profile?.timezone || 'America/New_York';
    const today = getDayKeyForUser(userTimezone);

    // First get the user's friends
    const { data: friends, error: friendsError } = await supabase
      .rpc('get_user_friends', { user_id: userData.user.id });

    if (friendsError) {
      logger.error('Failed to get friends', { error: friendsError });
      throw createUserFriendlyError(friendsError);
    }

    if (!friends || friends.length === 0) {
      logger.info('No friends found');
      return [];
    }

    // Use database function to get today's public words from friends
    const { data: todaysWords, error: todaysError } = await supabase
      .rpc('get_friends_public_words_today', {
        user_uuid: userData.user.id
      });

    if (todaysError) {
      logger.error('Failed to fetch today\'s public words', { error: todaysError });
      throw createUserFriendlyError(todaysError);
    }

    // Get most recent public words for friends who haven't posted today
    const friendsWithTodayWords = new Set(todaysWords?.map(w => w.sender_id) || []);
    const friendIds = friends.map(friend => friend.friend_id);
    const friendsWithoutTodayWords = friendIds.filter(id => !friendsWithTodayWords.has(id));

    let recentWords: any[] = [];
    if (friendsWithoutTodayWords.length > 0) {
      // Get the most recent word for each friend who hasn't posted today
      const { data: recentData, error: recentError } = await supabase
        .from('words')
        .select(`
          text,
          sender_id,
          created_at,
          profiles!words_sender_id_fkey(username, name)
        `)
        .in('sender_id', friendsWithoutTodayWords)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (recentError) {
        logger.error('Failed to fetch recent public words', { error: recentError });
        throw createUserFriendlyError(recentError);
      }

      // Get the most recent word for each friend
      const mostRecentByFriend = new Map();
      recentData?.forEach(word => {
        if (!mostRecentByFriend.has(word.sender_id)) {
          mostRecentByFriend.set(word.sender_id, word);
        }
      });

      recentWords = Array.from(mostRecentByFriend.values());
    }

    // Combine today's words and recent words
    const allWords = [...(todaysWords || []), ...recentWords];

    // Create a map of all friends for easy lookup
    const allFriendsMap = new Map();
    friends.forEach(friend => {
      allFriendsMap.set(friend.friend_id, {
        friend_name: friend.friend_name,
        friend_username: friend.friend_username,
        isToday: false
      });
    });

    // Mark friends who have words today
    todaysWords?.forEach(word => {
      if (allFriendsMap.has(word.sender_id)) {
        allFriendsMap.get(word.sender_id).isToday = true;
      }
    });

    // Transform the data to match expected format
    const transformedWords = allWords.map(word => ({
      ...word,
      friend_name: allFriendsMap.get(word.sender_id)?.friend_name || word.friend_name,
      friend_username: allFriendsMap.get(word.sender_id)?.friend_username || word.friend_username,
      isToday: allFriendsMap.get(word.sender_id)?.isToday || false
    }));

    logger.info('Friends public words fetched successfully', {
      todayCount: todaysWords?.length || 0,
      recentCount: recentWords.length,
      totalCount: transformedWords.length
    });

    return transformedWords;
  }, 'getFriendsPublicWords');
};

// Social Authentication Functions
export const signInWithGoogle = async () => {
  return handleAsyncError(async () => {
    logger.info('Starting Google OAuth with oneword:// redirect');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'oneword://',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    if (error) {
      logger.error('Google sign in error', { error });
      throw createUserFriendlyError(error);
    }
    
    logger.info('Google OAuth initiated', { hasUrl: !!data?.url });
    return data;
  }, 'signInWithGoogle');
};

// Handle OAuth callback from URL
export const handleOAuthCallback = async (url: string) => {
  return handleAsyncError(async () => {
    logger.info('Handling OAuth callback URL', { urlLength: url.length });
    
    // For OAuth callbacks, we need to let Supabase handle the session automatically
    // The OAuth flow should have already set the session when it redirects back
    
    // Check if we have a session after the OAuth flow
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Session check error', { error });
      throw createUserFriendlyError(error);
    }
    
    if (session) {
      logger.info('Session found after OAuth', { userId: session.user.id });
      return { session };
    }
    
    // If no session found, try to extract tokens from URL as fallback
    logger.info('No session found, trying to extract tokens from URL');
    
    // Check if this is a hash-based URL
    if (url.includes('#')) {
      const hashPart = url.split('#')[1];
      const params = new URLSearchParams(hashPart);
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      logger.debug('Extracted tokens from hash', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
      
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          logger.error('OAuth callback error', { error });
          throw createUserFriendlyError(error);
        }
        
        logger.info('OAuth callback successful', { userId: data.user?.id });
        return data;
      }
    }
    
    // Try URL search params as fallback
    try {
      const urlObj = new URL(url);
      const accessToken = urlObj.searchParams.get('access_token');
      const refreshToken = urlObj.searchParams.get('refresh_token');
      
      logger.debug('Extracted tokens from search params', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
      
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          logger.error('OAuth callback error', { error });
          throw createUserFriendlyError(error);
        }
        
        logger.info('OAuth callback successful', { userId: data.user?.id });
        return data;
      }
    } catch (urlError) {
      logger.warn('Could not parse URL for tokens', { urlError });
    }
    
    // If we get here, the OAuth flow might still be in progress
    logger.info('OAuth callback handled, but no session or tokens found yet');
    return null;
  }, 'handleOAuthCallback');
};

export const signInWithFacebook = async () => {
  return handleAsyncError(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: 'oneword://'
      }
    });
    
    if (error) {
      logger.error('Facebook sign in error', { error });
      throw createUserFriendlyError(error);
    }
  }, 'signInWithFacebook');
};

export const signInWithApple = async () => {
  return handleAsyncError(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: 'oneword://'
      }
    });
    
    if (error) {
      logger.error('Apple sign in error', { error });
      throw createUserFriendlyError(error);
    }
  }, 'signInWithApple');
};

export const signInWithGithub = async () => {
  return handleAsyncError(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'oneword://'
      }
    });
    
    if (error) {
      logger.error('GitHub sign in error', { error });
      throw createUserFriendlyError(error);
    }
  }, 'signInWithGithub');
};

// Contact-based friend suggestions (using phone contacts)
export const getContactSuggestions = async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.error('User not authenticated:', userError);
    throw userError ?? new Error('No user session');
  }

  // Get all users except current user, respecting privacy settings
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, username, name, profile_visibility')
    .neq('id', userData.user.id)
    .or('profile_visibility.eq.public,profile_visibility.eq.private')
    .limit(50);

  if (error) {
    console.error('Failed to get users:', error);
    throw error;
  }

  return users || [];
};

// Load user's connections from database
export const loadUserConnections = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to load connections.',
        true
      );
    }

    // Get connections where user is either user_a or user_b
    const { data: connections, error } = await supabase
      .from('connections')
      .select(`
        id,
        user_a,
        user_b,
        created_at
      `)
      .or(`user_a.eq.${userData.user.id},user_b.eq.${userData.user.id}`);

    if (error) {
      logger.error('Failed to load connections', { error });
      throw createUserFriendlyError(error);
    }

    // Get all user IDs involved in connections
    const userIds = new Set<string>();
    connections?.forEach(conn => {
      userIds.add(conn.user_a);
      userIds.add(conn.user_b);
    });

    // Get user details for all connected users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, name')
      .in('id', Array.from(userIds));

    if (usersError) {
      logger.error('Failed to load users', { error: usersError });
      throw createUserFriendlyError(usersError);
    }

    // Transform connections to match the app's format
    const transformedConnections = connections?.map(conn => ({
      id: conn.id,
      a: conn.user_a,
      b: conn.user_b,
      name: conn.user_a === userData.user.id 
        ? users?.find(u => u.id === conn.user_b)?.name || 'Unknown User'
        : users?.find(u => u.id === conn.user_a)?.name || 'Unknown User',
      createdAt: new Date(conn.created_at).getTime()
    })) || [];

    // Transform users to match the app's format
    const transformedUsers = users?.reduce((acc, user) => {
      acc[user.id] = {
        id: user.id,
        name: user.name || user.username || 'Unknown User'
      };
      return acc;
    }, {} as Record<string, { id: string; name: string }>) || {};

    logger.info('Connections loaded successfully', { 
      connectionsCount: transformedConnections.length,
      usersCount: Object.keys(transformedUsers).length 
    });

    return { connections: transformedConnections, users: transformedUsers };
  }, 'loadUserConnections');
};

// Add friend by user ID (simplified)
export const addFriendById = async (friendId: string) => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.error('User not authenticated:', userError);
    throw userError ?? new Error('No user session');
  }

  if (friendId === userData.user.id) {
    throw new Error('You cannot add yourself as a friend');
  }

  // Check if connection already exists
  const { data: existingConnection, error: checkError } = await supabase
    .from('connections')
    .select('id')
    .or(`and(user_a.eq.${userData.user.id},user_b.eq.${friendId}),and(user_a.eq.${friendId},user_b.eq.${userData.user.id})`)
    .maybeSingle();

  if (existingConnection) {
    throw new Error('You are already connected with this user');
  }

  // Create the connection
  const { error: connectionError } = await supabase.from('connections').insert({
    user_a: userData.user.id,
    user_b: friendId
  });

  if (connectionError) {
    console.error('Failed to create connection:', connectionError);
    throw connectionError;
  }

  console.log('Friend added successfully:', friendId);
};

// Find user by email (for friend requests)
export const findUserByEmail = async (email: string) => {
  return handleAsyncError(async () => {
    // Query the profiles table to find user by email
    // Note: This assumes the email is stored in user_metadata or we can query auth.users
    // For now, we'll use a direct query to auth.users (if accessible)
    
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      logger.error('Failed to query users', { error });
      throw createUserFriendlyError(error);
    }
    
    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new AppError(
        ErrorCodes.USER_NOT_FOUND,
        'User not found',
        'No user found with that email address.',
        true
      );
    }
    
    return user;
  }, 'findUserByEmail');
};

// Facebook-style friend system functions
export const sendFriendRequest = async (targetUserId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('friendships')
    .insert({
      requester_id: user.id,
      addressee_id: targetUserId,
      status: 'pending'
    });

  if (error) {
    logger.error('Failed to send friend request', { error, targetUserId });
    throw error;
  }

  return { success: true };
};

export const acceptFriendRequest = async (requestId: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to accept friend requests.',
        true
      );
    }

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .eq('addressee_id', userData.user.id);

    if (error) {
      logger.error('Failed to accept friend request', { error, requestId });
      throw createUserFriendlyError(error);
    }

    logger.info('Friend request accepted successfully', { requestId });
  }, 'acceptFriendRequest');
};

export const declineFriendRequest = async (requestId: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to decline friend requests.',
        true
      );
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId)
      .eq('addressee_id', userData.user.id);

    if (error) {
      logger.error('Failed to decline friend request', { error, requestId });
      throw createUserFriendlyError(error);
    }

    logger.info('Friend request declined successfully', { requestId });
  }, 'declineFriendRequest');
};

// Remove friend
export const removeFriend = async (friendId: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to remove friends.',
        true
      );
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${userData.user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userData.user.id})`)
      .eq('status', 'accepted');

    if (error) {
      logger.error('Failed to remove friend', { error, friendId });
      throw createUserFriendlyError(error);
    }

    logger.info('Friend removed successfully', { friendId });
  }, 'removeFriend');
};

// Get current user's profile
export const getCurrentUserProfile = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view your profile.',
        true
      );
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.user.id)
      .single();

    if (error) {
      logger.error('Failed to get current user profile', { error });
      throw createUserFriendlyError(error);
    }

    return data;
  }, 'getCurrentUserProfile');
};

// Test function to verify database connectivity
export const testDatabaseConnection = async () => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new Error('No user session');
    }

    // Test profiles table
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, name')
      .limit(1);

    if (usersError) {
      throw new Error(`Users table error: ${usersError.message}`);
    }

    // Test connections table
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('id, user_a, user_b')
      .limit(1);

    if (connectionsError) {
      throw new Error(`Connections table error: ${connectionsError.message}`);
    }

    // Test settings table
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (settingsError) {
      throw new Error(`Settings table error: ${settingsError.message}`);
    }

    console.log('✅ Database connection test successful');
    console.log('Users count:', users?.length || 0);
    console.log('Connections count:', connections?.length || 0);
    console.log('User settings:', settings ? 'Found' : 'Not found (will be created)');

    return {
      success: true,
      usersCount: users?.length || 0,
      connectionsCount: connections?.length || 0,
      hasSettings: !!settings
    };
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    throw error;
  }
};

export const ensureProfileExists = async (user: any) => {
  return handleAsyncError(async () => {
    if (!user?.id) {
      logger.error('No user ID provided for profile creation');
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid user data',
        'Unable to create profile.',
        true
      );
    }

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected if profile doesn't exist
      logger.error('Error checking profile existence', { error: checkError });
      throw createUserFriendlyError(checkError);
    }

    if (existingProfile) {
      logger.info('Profile already exists', { userId: user.id });
      return existingProfile;
    }

    // Create profile if it doesn't exist
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name: user.user_metadata?.name || 'Anonymous',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      logger.error('Failed to create profile', { error: createError, userId: user.id });
      throw createUserFriendlyError(createError);
    }

    logger.info('Profile created successfully', { userId: user.id, profile: newProfile });
    return newProfile;
  }, 'ensureProfileExists');
};

// Helper function to check if user has already sent a word today to a specific receiver
export const checkDailyWordLimit = async (receiverId: string, isPublic: boolean = false): Promise<boolean> => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to send words.',
        true
      );
    }

    // Use database function for proper timezone handling
    const { data: hasAlreadySent, error } = await supabase
      .rpc('has_user_sent_word_today', {
        user_uuid: userData.user.id,
        receiver_uuid: receiverId,
        is_public_param: isPublic
      });

    if (error) {
      logger.error('Failed to check daily word limit', { error, receiverId, isPublic });
      throw createUserFriendlyError(error);
    }

    return hasAlreadySent || false;
  }, 'checkDailyWordLimit');
};

// Journal functions for private daily entries
export const addJournalEntry = async (word: string, reflections?: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to add journal entries.',
        true
      );
    }

    // Get user's timezone from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userData.user.id)
      .single();
    
    if (profileError) {
      logger.warn('Failed to get user timezone, using default', { error: profileError });
    }
    
    const userTimezone = profile?.timezone || 'America/New_York';
    const today = getDayKeyForUser(userTimezone);
    
    // Use database function for proper timezone handling
    const { error } = await supabase.rpc('add_journal_entry', {
      p_user_id: userData.user.id,
      p_date_local: today,
      p_word: word,
      p_reflections: reflections || null
    });

    if (error) {
      logger.error('Failed to insert journal entry', { error, word });
      throw createUserFriendlyError(error);
    }

    logger.info('Journal entry added successfully', { word });
  }, 'addJournalEntry');
};

export const getJournalEntries = async (limit: number = 30) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view journal entries.',
        true
      );
    }

    // Use database function for proper timezone handling
    const { data, error } = await supabase.rpc('get_journal_entries', {
      p_user_id: userData.user.id
    });

    if (error) {
      logger.error('Failed to fetch journal entries', { error });
      throw createUserFriendlyError(error);
    }

    logger.info('Journal entries fetched successfully', { count: data?.length || 0 });
    return data || [];
  }, 'getJournalEntries');
};

export const getTodaysJournalEntry = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view today\'s journal entry.',
        true
      );
    }

    // Get user's timezone from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tz_name')
      .eq('id', userData.user.id)
      .single();

    const userTimezone = profile?.tz_name || 'America/New_York';

    // Use database function for proper timezone handling
    const { data, error } = await supabase.rpc('get_todays_journal_entry', {
      p_user_id: userData.user.id,
      p_user_timezone: userTimezone
    });

    if (error) {
      logger.error('Failed to fetch today\'s journal entry', { error });
      throw createUserFriendlyError(error);
    }

    logger.info('Today\'s journal entry fetched successfully', { entry: data });
    return data && data.length > 0 ? data[0] : null;
  }, 'getTodaysJournalEntry');
};

export const deleteJournalEntry = async (entryId: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to delete journal entries.',
        true
      );
    }

    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userData.user.id);

    if (error) {
      logger.error('Failed to delete journal entry', { error, entryId });
      throw createUserFriendlyError(error);
    }

    logger.info('Journal entry deleted successfully', { entryId });
  }, 'deleteJournalEntry');
};

export const updateJournalEntry = async (entryId: string, word: string, reflections?: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to update journal entries.',
        true
      );
    }

    const { error } = await supabase
      .from('journal_entries')
      .update({
        word,
        reflections: reflections || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)
      .eq('user_id', userData.user.id);

    if (error) {
      logger.error('Failed to update journal entry', { error, entryId });
      throw createUserFriendlyError(error);
    }

    logger.info('Journal entry updated successfully', { entryId, word });
  }, 'updateJournalEntry');
};

export const getPublicWordsByUser = async (userIdentifier: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      logger.error('User not authenticated', { error: userError });
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view user history.',
        true
      );
    }

    // First, try to find the user by username if userIdentifier is not a UUID
    let targetUserId = userIdentifier;
    
    if (!userIdentifier.includes('-')) {
      // Likely a username, find the user ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', userIdentifier)
        .single();

      if (profileError || !profileData) {
        logger.error('User not found', { username: userIdentifier, error: profileError });
        throw new AppError(
          ErrorCodes.USER_NOT_FOUND,
          'User not found',
          'The requested user could not be found.',
          true
        );
      }
      
      targetUserId = profileData.id;
    }

    // Get public words for the target user
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select(`
        id,
        text,
        date_local,
        created_at
      `)
      .eq('sender_id', targetUserId)
      .eq('is_public', true)
      .order('date_local', { ascending: false });

    if (wordsError) {
      logger.error('Failed to fetch public words', { error: wordsError });
      throw createUserFriendlyError(wordsError);
    }

    logger.info('Public words fetched successfully', { 
      userId: targetUserId,
      count: words?.length || 0
    });

    return words || [];
  }, 'getPublicWordsByUser');
};

// Get user's friends list
export const getFriends = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view friends.',
        true
      );
    }

    // Get accepted friendships where user is either requester or addressee
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at
      `)
      .or(`requester_id.eq.${userData.user.id},addressee_id.eq.${userData.user.id}`)
      .eq('status', 'accepted');

    if (friendshipsError) {
      logger.error('Failed to get friendships', { error: friendshipsError });
      throw createUserFriendlyError(friendshipsError);
    }

    // Get friend user IDs (the other person in each friendship)
    const friendIds = friendships?.map(friendship => 
      friendship.requester_id === userData.user.id 
        ? friendship.addressee_id 
        : friendship.requester_id
    ) || [];

    if (friendIds.length === 0) {
      return [];
    }

    // Get friend profiles
    const { data: friends, error: friendsError } = await supabase
      .from('profiles')
      .select('id, username, name')
      .in('id', friendIds);

    if (friendsError) {
      logger.error('Failed to get friend profiles', { error: friendsError });
      throw createUserFriendlyError(friendsError);
    }

    logger.info('Friends loaded successfully', { count: friends?.length || 0 });
    return friends || [];
  }, 'getFriends');
};

// Get user's friend requests
export const getFriendRequests = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view friend requests.',
        true
      );
    }

    // Get pending friend requests where user is the addressee
    const { data: requests, error: requestsError } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at
      `)
      .eq('addressee_id', userData.user.id)
      .eq('status', 'pending');

    if (requestsError) {
      logger.error('Failed to get friend requests', { error: requestsError });
      throw createUserFriendlyError(requestsError);
    }

    if (!requests || requests.length === 0) {
      return [];
    }

    // Get requester profiles
    const requesterIds = requests.map(request => request.requester_id);
    const { data: requesters, error: requestersError } = await supabase
      .from('profiles')
      .select('id, username, name')
      .in('id', requesterIds);

    if (requestersError) {
      logger.error('Failed to get requester profiles', { error: requestersError });
      throw createUserFriendlyError(requestersError);
    }

    // Combine requests with requester profiles
    const friendRequests = requests.map(request => {
      const requester = requesters?.find(r => r.id === request.requester_id);
      return {
        id: request.id,
        requester_id: request.requester_id,
        addressee_id: request.addressee_id,
        status: request.status,
        created_at: request.created_at,
        requester_profile: requester
      };
    });

    logger.info('Friend requests loaded successfully', { count: friendRequests.length });
    return friendRequests;
  }, 'getFriendRequests');
};

// Get user's sent friend requests
export const getSentFriendRequests = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view sent friend requests.',
        true
      );
    }

    // Get pending friend requests where user is the requester
    const { data: requests, error: requestsError } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at
      `)
      .eq('requester_id', userData.user.id)
      .eq('status', 'pending');

    if (requestsError) {
      logger.error('Failed to get sent friend requests', { error: requestsError });
      throw createUserFriendlyError(requestsError);
    }

    if (!requests || requests.length === 0) {
      return [];
    }

    // Get addressee profiles
    const addresseeIds = requests.map(request => request.addressee_id);
    const { data: addressees, error: addresseesError } = await supabase
      .from('profiles')
      .select('id, username, name')
      .in('id', addresseeIds);

    if (addresseesError) {
      logger.error('Failed to get addressee profiles', { error: addresseesError });
      throw createUserFriendlyError(addresseesError);
    }

    // Combine requests with addressee profiles
    const sentFriendRequests = requests.map(request => {
      const addressee = addressees?.find(a => a.id === request.addressee_id);
      return {
        id: request.id,
        requester_id: request.requester_id,
        addressee_id: request.addressee_id,
        status: request.status,
        created_at: request.created_at,
        addressee_profile: addressee
      };
    });

    logger.info('Sent friend requests loaded successfully', { count: sentFriendRequests.length });
    return sentFriendRequests;
  }, 'getSentFriendRequests');
};

// Search users by username or name
export const searchUsers = async (searchTerm: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to search users.',
        true
      );
    }

    if (!searchTerm.trim()) {
      return [];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, name')
      .or(`username.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
      .neq('id', userData.user.id)
      .limit(10);

    if (error) {
      logger.error('Failed to search users', { error, searchTerm });
      throw createUserFriendlyError(error);
    }

    return data || [];
  }, 'searchUsers');
};

// Get user notifications
export const getNotifications = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to view notifications.',
        true
      );
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('Failed to get notifications', { error });
      throw createUserFriendlyError(error);
    }

    return data || [];
  }, 'getNotifications');
};

// Update user profile
export const updateUserProfile = async (updates: { username?: string; name?: string; email?: string; bio?: string }) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to update your profile.',
        true
      );
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userData.user.id);

    if (error) {
      logger.error('Failed to update user profile', { error, updates });
      throw createUserFriendlyError(error);
    }

    logger.info('User profile updated successfully', { updates });
  }, 'updateUserProfile');
};

// Check and fix problematic date_local values
export const checkAndFixDateLocalValues = async () => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to perform database maintenance.',
        true
      );
    }

    // Check for words with problematic date_local values
    const { data: problematicWords, error: wordsError } = await supabase
      .from('words')
      .select('id, date_local, created_at')
      .or('date_local.is.null,date_local.eq.1970-01-01,date_local.eq.1969-12-31');

    if (wordsError) {
      logger.error('Failed to check problematic words', { error: wordsError });
      throw createUserFriendlyError(wordsError);
    }

    logger.info('Found problematic date_local values', { 
      count: problematicWords?.length || 0,
      words: problematicWords 
    });

    // Update problematic records to use created_at with timezone conversion
    if (problematicWords && problematicWords.length > 0) {
      for (const word of problematicWords) {
        if (word.created_at) {
          const createdDate = new Date(word.created_at);
          const easternDate = new Date(createdDate.getTime() - (5 * 60 * 60 * 1000)); // Convert to EST
          const dateLocal = easternDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          const { error: updateError } = await supabase
            .from('words')
            .update({ date_local: dateLocal })
            .eq('id', word.id);

          if (updateError) {
            logger.error('Failed to update word date_local', { error: updateError, wordId: word.id });
          } else {
            logger.info('Updated word date_local', { wordId: word.id, newDateLocal: dateLocal });
          }
        }
      }
    }

    return { 
      fixedWords: problematicWords?.length || 0,
      message: `Fixed ${problematicWords?.length || 0} problematic date_local values`
    };
  }, 'checkAndFixDateLocalValues');
};

// Delete a public word
export const deletePublicWord = async (wordId: string) => {
  return handleAsyncError(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'User not authenticated',
        'Please sign in to delete words.',
        true
      );
    }

    // First check if the word belongs to the current user
    const { data: word, error: checkError } = await supabase
      .from('words')
      .select('id, sender_id, is_public')
      .eq('id', wordId)
      .eq('is_public', true)
      .single();

    if (checkError) {
      logger.error('Failed to check word ownership', { error: checkError, wordId });
      throw createUserFriendlyError(checkError);
    }

    if (!word) {
      throw new AppError(
        ErrorCodes.PERMISSION_DENIED,
        'Word not found',
        'The word you are trying to delete does not exist.',
        true
      );
    }

    if (word.sender_id !== userData.user.id) {
      throw new AppError(
        ErrorCodes.PERMISSION_DENIED,
        'Not your word',
        'You can only delete your own words.',
        true
      );
    }

    // Delete the word
    const { error: deleteError } = await supabase
      .from('words')
      .delete()
      .eq('id', wordId);

    if (deleteError) {
      logger.error('Failed to delete public word', { error: deleteError, wordId });
      throw createUserFriendlyError(deleteError);
    }

    logger.info('Public word deleted successfully', { wordId });
  }, 'deletePublicWord');
};