import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  type ListRenderItem,
  ScrollView,
} from 'react-native';
import { useTheme, Text, IconButton, Surface, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

import { createChatSession, sendMessage, generateChatTitle, getChatSession } from '@/services/ai';
import type { ChatMessage, ChatSession } from '@/types/ai';
import { generateUUIDSync } from '@/utils/uuid';

interface AIChatProps {
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
}

export function AIChat({ sessionId, onSessionChange }: AIChatProps) {
  const theme = useTheme();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (sessionId) {
      const existingSession = getChatSession(sessionId);
      if (existingSession) {
        setSession(existingSession);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, [sessionId]);

  const createNewSession = () => {
    const newSession = createChatSession('New Chat');
    setSession(newSession);
    onSessionChange?.(newSession.id);
  };

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !session || isLoading) return;

    const message = inputText.trim();
    setInputText('');
    setIsLoading(true);

    if (session.messages.length === 0) {
      const title = await generateChatTitle(message);
      session.title = title;
    }

    const response = await sendMessage(session.id, message);
    setIsLoading(false);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, session, isLoading]);

  const markdownStyles = {
    body: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 15,
      lineHeight: 22,
    },
    heading1: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 20,
      fontWeight: '700' as const,
      marginTop: 12,
      marginBottom: 8,
    },
    heading2: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 10,
      marginBottom: 6,
    },
    heading3: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 16,
      fontWeight: '600' as const,
      marginTop: 8,
      marginBottom: 4,
    },
    paragraph: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 4,
      marginBottom: 4,
    },
    list_item: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 15,
      lineHeight: 22,
    },
    bullet_list: {
      marginVertical: 4,
    },
    ordered_list: {
      marginVertical: 4,
    },
    code_inline: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.primary,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontSize: 14,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    code_block: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.onSurface,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontSize: 14,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    fence: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.onSurface,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
      fontSize: 14,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    blockquote: {
      backgroundColor: theme.colors.primaryContainer,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginVertical: 8,
      borderRadius: 4,
    },
    link: {
      color: theme.colors.primary,
      textDecorationLine: 'underline' as const,
    },
    strong: {
      fontWeight: '700' as const,
      color: theme.colors.onSurfaceVariant,
    },
    em: {
      fontStyle: 'italic' as const,
      color: theme.colors.onSurfaceVariant,
    },
    table: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      marginVertical: 8,
    },
    thead: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    th: {
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      fontWeight: '600' as const,
    },
    td: {
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    hr: {
      backgroundColor: theme.colors.outline,
      height: 1,
      marginVertical: 12,
    },
  };

  const renderMessage: ListRenderItem<ChatMessage> = useCallback(({ item }) => {
    const isUser = item.role === 'user';
    
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        {!isUser && (
          <Avatar.Icon
            size={32}
            icon="robot"
            style={[styles.aiAvatar, { backgroundColor: theme.colors.primaryContainer }]}
            color={theme.colors.primary}
          />
        )}
        
        <Surface
          style={[
            styles.messageBubble,
            {
              backgroundColor: isUser 
                ? theme.colors.primary 
                : theme.colors.surfaceVariant,
              borderBottomRightRadius: isUser ? 4 : 16,
              borderBottomLeftRadius: isUser ? 16 : 4,
            },
          ]}
        >
          {isUser ? (
            // User message - plain text
            <Text
              style={[
                styles.messageText,
                { color: theme.colors.onPrimary },
              ]}
            >
              {item.content}
            </Text>
          ) : (
            // AI message - Markdown support
            <View style={styles.markdownContainer}>
              <Markdown
                style={markdownStyles}
              >
                {item.content}
              </Markdown>
            </View>
          )}
          
          <Text
            style={[
              styles.timestamp,
              { color: isUser ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
            ]}
          >
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Surface>

        {isUser && (
          <Avatar.Icon
            size={32}
            icon="account"
            style={[styles.userAvatar, { backgroundColor: theme.colors.secondaryContainer }]}
            color={theme.colors.secondary}
          />
        )}
      </View>
    );
  }, [theme, markdownStyles]);

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text variant="bodySmall" style={[styles.quickActionsTitle, { color: theme.colors.onSurfaceVariant }]}>
        Quick Questions
      </Text>
      <View style={styles.quickActionsGrid}>
        {[
          'What deductions can I claim?',
          'How much tax will I owe?',
          'Explain Section 40 income',
          'What is withholding tax?',
        ].map((question, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              setInputText(question);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            style={[styles.quickActionButton, { backgroundColor: theme.colors.surfaceVariant }]}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.primary }} numberOfLines={2}>
              {question}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <MaterialCommunityIcons
            name="robot"
            size={24}
            color={theme.colors.primary}
          />
          <Text variant="titleMedium" style={styles.headerTitle}>
            Taxify AI Assistant
          </Text>
        </View>
        <IconButton
          icon="plus"
          size={20}
          onPress={createNewSession}
          iconColor={theme.colors.primary}
        />
      </Surface>

      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={session?.messages || []}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={renderQuickActions}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
            AI is thinking...
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        enabled
      >
        <Surface style={styles.inputContainer} elevation={2}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outline,
                },
              ]}
              placeholder="Ask about Thai taxes..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
              textAlignVertical="center"
              autoCapitalize="sentences"
              autoCorrect={true}
              underlineColorAndroid="transparent"
            />
          </View>
          <IconButton
            icon="send"
            size={24}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            iconColor={inputText.trim() ? theme.colors.primary : theme.colors.onSurfaceDisabled}
            style={styles.sendButton}
          />
        </Surface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    gap: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  markdownContainer: {
    // Ensure markdown content wraps properly
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  aiAvatar: {
    marginBottom: 4,
  },
  userAvatar: {
    marginBottom: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputWrapper: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 22,
    lineHeight: 22,
  },
  sendButton: {
    margin: 0,
  },
  quickActionsContainer: {
    padding: 16,
  },
  quickActionsTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  quickActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 140,
    maxWidth: '48%',
    alignItems: 'center',
  },
});
