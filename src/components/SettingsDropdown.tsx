import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, 
  Bell, 
  Shield, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronRight 
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';

interface SettingsDropdownProps {
  visible: boolean;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
}

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  visible,
  onClose,
  anchorPosition,
}) => {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const menuItems = [
    {
      id: 'profile',
      title: 'profile',
      icon: User,
      onPress: () => {
        onClose();
        router.push('/settings');
      },
    },
    {
      id: 'notifications',
      title: 'notifications',
      icon: Bell,
      onPress: () => {
        onClose();
        router.push('/settings');
      },
    },
    {
      id: 'privacy',
      title: 'privacy',
      icon: Shield,
      onPress: () => {
        onClose();
        router.push('/settings');
      },
    },
    {
      id: 'settings',
      title: 'all settings',
      icon: Settings,
      onPress: () => {
        onClose();
        router.push('/settings');
      },
    },
    {
      id: 'help',
      title: 'help & support',
      icon: HelpCircle,
      onPress: () => {
        onClose();
        router.push('/settings');
      },
    },
    {
      id: 'signout',
      title: 'sign out',
      icon: LogOut,
      onPress: handleSignOut,
      destructive: true,
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.dropdown, anchorPosition && {
              top: anchorPosition.y + 40,
              right: 20,
            }]}>
              {menuItems.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.lastMenuItem,
                    item.destructive && styles.destructiveItem,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemContent}>
                    <item.icon 
                      size={18} 
                      color={item.destructive ? '#FF3B30' : '#333'} 
                    />
                    <Text style={[
                      styles.menuItemText,
                      item.destructive && styles.destructiveText,
                    ]}>
                      {item.title}
                    </Text>
                  </View>
                  {item.id !== 'signout' && (
                    <ChevronRight size={16} color="#999" />
                  )}
                </Pressable>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdown: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  lastMenuItem: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    textTransform: 'lowercase',
    fontWeight: '400',
  },
  destructiveItem: {
    // Additional styling for destructive actions
  },
  destructiveText: {
    color: '#FF3B30',
  },
});

export default SettingsDropdown;
