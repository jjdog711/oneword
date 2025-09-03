import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Send } from 'lucide-react-native';

interface InputSectionProps {
  messageText: string;
  confirmText: string;
  showConfirmation: boolean;
  sending: boolean;
  onMessageTextChange: (text: string) => void;
  onConfirmTextChange: (text: string) => void;
  onSubmit: () => void;
}

const InputSection: React.FC<InputSectionProps> = React.memo(({
  messageText,
  confirmText,
  showConfirmation,
  sending,
  onMessageTextChange,
  onConfirmTextChange,
  onSubmit,
}) => {
  const isConfirmButtonDisabled = React.useMemo(() => {
    return (confirmText?.trim() || '').toLowerCase() !== (messageText?.trim() || '').toLowerCase() || sending;
  }, [confirmText, messageText, sending]);

  const isSubmitButtonDisabled = React.useMemo(() => {
    return !(messageText?.trim() || '') || sending;
  }, [messageText, sending]);

  return (
    <View style={styles.inputSection}>
      {/* Confirmation prompt - shown above input when needed */}
      {showConfirmation && (
        <View style={styles.confirmationPrompt}>
          <Text style={styles.warningText}>
            ⚠️ you can only send one word today. please retype your word to confirm.
          </Text>
        </View>
      )}
      
      {/* Input container - always visible */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={showConfirmation ? confirmText : messageText}
          onChangeText={showConfirmation ? onConfirmTextChange : onMessageTextChange}
          placeholder={showConfirmation ? "retype your word" : "type your word"}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={50}
          accessibilityLabel={showConfirmation ? "Retype your word" : "Type your word"}
          accessibilityHint={showConfirmation ? "Retype your word exactly to confirm" : "Enter a single word to send to your friend"}
        />
        <Pressable 
          style={[
            styles.submitButton, 
            (showConfirmation ? isConfirmButtonDisabled : isSubmitButtonDisabled) && styles.submitButtonDisabled
          ]}
          onPress={onSubmit}
          disabled={showConfirmation ? isConfirmButtonDisabled : isSubmitButtonDisabled}
          accessibilityLabel="Send word"
          accessibilityRole="button"
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  inputSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    backgroundColor: '#fff',
  },
  confirmationPrompt: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
    textTransform: 'lowercase',
    lineHeight: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: 'center',
    textTransform: 'lowercase',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#333',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

InputSection.displayName = 'InputSection';

export default InputSection;
