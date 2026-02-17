import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, getApiUrl, queryClient } from "@/lib/query-client";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";

interface MessageItem {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  scheduledAt: string;
  status: string;
}

function MessageBubble({ item, isMe }: { item: MessageItem; isMe: boolean }) {
  const isPending = item.status === "pending";

  return (
    <View
      style={[
        styles.bubbleRow,
        isMe ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMe ? styles.bubbleSent : styles.bubbleReceived,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isMe ? styles.bubbleTextSent : styles.bubbleTextReceived,
          ]}
        >
          {item.content}
        </Text>
        <View style={styles.bubbleMeta}>
          <Text
            style={[
              styles.bubbleTime,
              isMe ? styles.bubbleTimeSent : styles.bubbleTimeReceived,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          {isMe && (
            <Ionicons
              name={isPending ? "time-outline" : "checkmark-done"}
              size={14}
              color={
                isPending
                  ? isMe
                    ? "rgba(255,255,255,0.7)"
                    : Colors.light.pending
                  : isMe
                    ? "rgba(255,255,255,0.9)"
                    : Colors.light.delivered
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { userId, name } = useLocalSearchParams<{
    userId: string;
    name: string;
  }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const { data: messages, isLoading } = useQuery<MessageItem[]>({
    queryKey: ["/api/messages", user?.id, userId],
    queryFn: async () => {
      if (!user?.id || !userId) return [];
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/messages/${user.id}/${userId}`);
      return res.json();
    },
    enabled: !!user?.id && !!userId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        senderId: user?.id,
        receiverId: userId,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/messages", user?.id, userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/pending", user?.id],
      });
    },
  });

  const handleSend = useCallback(() => {
    const content = text.trim();
    if (!content) return;
    setText("");
    sendMutation.mutate(content);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    inputRef.current?.focus();
  }, [text]);

  const reversedMessages = [...(messages ?? [])].reverse();

  const renderMessage = useCallback(
    ({ item }: { item: MessageItem }) => (
      <MessageBubble item={item} isMe={item.senderId === user?.id} />
    ),
    [user?.id]
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: name ?? "Chat",
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 17,
          },
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
          </View>
        ) : !messages?.length ? (
          <View style={styles.center}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.light.textSecondary} />
            <Text style={styles.emptyTitle}>Start a Conversation</Text>
            <Text style={styles.emptyText}>
              Messages will be delivered after 5 minutes
            </Text>
          </View>
        ) : (
          <FlatList
            data={reversedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.messageList}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom:
                Platform.OS === "web" ? 34 : Math.max(insets.bottom, 8),
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              maxLength={1000}
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
            style={({ pressed }) => [
              styles.sendBtn,
              (!text.trim() || sendMutation.isPending) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  bubbleRow: {
    flexDirection: "row",
    marginVertical: 2,
  },
  bubbleRowRight: {
    justifyContent: "flex-end",
  },
  bubbleRowLeft: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleSent: {
    backgroundColor: Colors.light.bubbleSent,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: Colors.light.bubbleReceived,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  bubbleTextSent: {
    color: Colors.light.bubbleSentText,
  },
  bubbleTextReceived: {
    color: Colors.light.bubbleReceivedText,
  },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  bubbleTimeSent: {
    color: "rgba(255,255,255,0.7)",
  },
  bubbleTimeReceived: {
    color: Colors.light.textSecondary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.light.inputBg,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
