import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/app';
import { supabase } from '@/services/supabase';
import { ArrowLeft, User, Bell, Shield, HelpCircle, LogOut, Mail, Edit3 } from 'lucide-react-native';
import { createUserFriendlyError } from '@/lib/errors';

export default function SettingsScreen() {
  const router = useRouter();
  const me = useAppStore(s => s.me);
  const clearUserData = useAppStore(s => s.clearUserData);
  const updateCurrentUserProfile = useAppStore(s => s.updateCurrentUserProfile);
  const loadCurrentUserProfile = useAppStore(s => s.loadCurrentUserProfile);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: '',
    name: '',
    email: '',
    bio: ''
  });

  // Load user profile when component mounts
  useEffect(() => {
    loadCurrentUserProfile();
  }, [loadCurrentUserProfile]);

  // Update form when user data changes
  useEffect(() => {
    setProfileForm({
      username: me.username || '',
      name: me.name || '',
      email: me.email || '',
      bio: me.bio || ''
    });
  }, [me]);

  const handleBack = () => {
    router.back();
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim() || !profileForm.username.trim()) {
      Alert.alert('Error', 'Display name and username are required');
      return;
    }

    setIsLoading(true);
    try {
      await updateCurrentUserProfile(profileForm);
      setIsEditingProfile(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      const appError = createUserFriendlyError(error);
      Alert.alert('Error', appError.userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              clearUserData();
              router.push('/');
            } catch (error) {
              console.error('Failed to sign out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>ONEWORD</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#333" />
        </Pressable>
        <Text style={styles.title}>settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#333" />
            <Text style={styles.sectionTitle}>profile</Text>
          </View>
          
          {!isEditingProfile ? (
            <View style={styles.profileCard}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(me.username || me.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.profileName}>{me.name || 'User'}</Text>
              <Text style={styles.profileSubtext}>
                {me.username ? `@${me.username}` : 'no username set'}
              </Text>
              {me.bio && (
                <Text style={styles.profileBio}>{me.bio}</Text>
              )}
              <Pressable
                style={styles.editProfileButton}
                onPress={() => setIsEditingProfile(true)}
              >
                <Edit3 size={16} color="#333" />
                <Text style={styles.editProfileText}>edit profile</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.editProfileSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>username</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.username}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, username: text }))}
                  placeholder="enter username"
                  autoCapitalize="none"
                  maxLength={30}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>display name</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.name}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, name: text }))}
                  placeholder="enter display name"
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>email</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.email}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, email: text }))}
                  placeholder="enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>bio</Text>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={profileForm.bio}
                  onChangeText={(text) => setProfileForm(prev => ({ ...prev, bio: text }))}
                  placeholder="tell us about yourself..."
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </View>

              <View style={styles.profileActions}>
                <Pressable
                  style={[styles.profileButton, styles.cancelButton]}
                  onPress={() => {
                    setIsEditingProfile(false);
                    setProfileForm({
                      username: me.username || '',
                      name: me.name || '',
                      email: me.email || '',
                      bio: me.bio || ''
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.profileButton, styles.saveButton, isLoading && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={isLoading}
                >
                  <Text style={styles.saveButtonText}>
                    {isLoading ? 'saving...' : 'save'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Mail size={20} color="#333" />
            <Text style={styles.sectionTitle}>account</Text>
          </View>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>change password</Text>
              <Text style={styles.settingSubtitle}>update your account password</Text>
            </View>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>delete account</Text>
              <Text style={styles.settingSubtitle}>permanently delete your account and data</Text>
            </View>
          </Pressable>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color="#333" />
            <Text style={styles.sectionTitle}>privacy</Text>
          </View>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>profile visibility</Text>
              <Text style={styles.settingSubtitle}>control who can see your profile</Text>
            </View>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>word privacy</Text>
              <Text style={styles.settingSubtitle}>manage who can see your words</Text>
            </View>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>blocked users</Text>
              <Text style={styles.settingSubtitle}>manage blocked users</Text>
            </View>
          </Pressable>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color="#333" />
            <Text style={styles.sectionTitle}>notifications</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>push notifications</Text>
              <Text style={styles.settingSubtitle}>receive notifications for new messages</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#e1e5e9', true: '#333' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>daily reminders</Text>
              <Text style={styles.settingSubtitle}>get reminded to write your word</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#e1e5e9', true: '#333' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>friend requests</Text>
              <Text style={styles.settingSubtitle}>notifications for new friend requests</Text>
            </View>
            <Switch
              value={true}
              onValueChange={() => {}}
              trackColor={{ false: '#e1e5e9', true: '#333' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HelpCircle size={20} color="#333" />
            <Text style={styles.sectionTitle}>help & support</Text>
          </View>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>help center</Text>
              <Text style={styles.settingSubtitle}>get help with using oneword</Text>
            </View>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>contact support</Text>
              <Text style={styles.settingSubtitle}>reach out to our support team</Text>
            </View>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>about oneword</Text>
              <Text style={styles.settingSubtitle}>version 1.0.0</Text>
            </View>
          </Pressable>
        </View>

        {/* Sign Out Section */}
        <View style={styles.section}>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#FF3B30" />
            <Text style={styles.signOutText}>sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  appHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textTransform: 'lowercase',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    textTransform: 'lowercase',
    marginLeft: 8,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  profileSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    textTransform: 'lowercase',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    textTransform: 'lowercase',
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  editProfileText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  editProfileSection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textTransform: 'lowercase',
    color: '#333',
  },
  bioInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  profileButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  saveButton: {
    backgroundColor: '#333',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    textTransform: 'lowercase',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    textTransform: 'lowercase',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    textTransform: 'lowercase',
  },
});

