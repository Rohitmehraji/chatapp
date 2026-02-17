import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";
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

interface UserItem {
  id: string;
  username: string;
  email: string;
}

function getTimeLeft(scheduledAt: string): string {
  const diff = new Date(scheduledAt).getTime() - Date.now();
  if (diff <= 0) return "Delivering...";
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

export default function PendingScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: messages, isLoading } = useQuery<MessageItem[]>({
    queryKey: ["/api/messages/pending", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/messages/pending/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 3000,
  });

  const { data: users } = useQuery<UserItem[]>({
    queryKey: ["/api/users"],
  });

  const getUserName = (id: string) => {
    if (id === user?.id) return "You";
    const u = users?.find((u) => u.id === id);
    return u?.username ?? "Unknown";
  };

  const renderMessage = ({ item }: { item: MessageItem }) => {
    const isSender = item.senderId === user?.id;

    return (
      <View style={styles.messageCard}>
        <View style={styles.messageHeader}>
          <View style={styles.statusBadge}>
            <Ionicons name="time" size={12} color={Colors.light.pending} />
            <Text style={styles.statusText}>Pending</Text>
          </View>
          <Text style={styles.timeLeft}>{getTimeLeft(item.scheduledAt)}</Text>
        </View>

        <Text style={styles.messageContent} numberOfLines={3}>
          {item.content}
        </Text>

        <View style={styles.messageFooter}>
          <Text style={styles.metaText}>
            {isSender ? "To" : "From"}:{" "}
            <Text style={styles.metaBold}>
              {isSender
                ? getUserName(item.receiverId)
                : getUserName(item.senderId)}
            </Text>
          </Text>
          <Text style={styles.metaText}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>Pending</Text>
        <Text style={styles.headerSub}>
          {messages?.length ?? 0} messages waiting for delivery
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.pending} />
        </View>
      ) : !messages?.length ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={48} color={Colors.light.textSecondary} />
          <Text style={styles.emptyTitle}>No Pending Messages</Text>
          <Text style={styles.emptyText}>
            When you send a message, it will appear here until it's delivered
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 4,
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
  list: {
    padding: 16,
    gap: 10,
  },
  messageCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.pending,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.pending,
  },
  timeLeft: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.pending,
  },
  messageContent: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 10,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  metaBold: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
});
