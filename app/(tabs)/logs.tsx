import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface SmsTask {
  id: string;
  content: string;
  status: string;
  scheduledAt: string;
  error: string | null;
  contact: { name: string; phoneNumber: string } | null;
  device: { name: string } | null;
}

export default function LogsScreen() {
  const insets = useSafeAreaInsets();

  const { data: tasks, isLoading } = useQuery<SmsTask[]>({
    queryKey: ["/api/schedules"],
    refetchInterval: 5000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "#10B981";
      case "failed": return "#EF4444";
      case "pending": return "#F59E0B";
      default: return "#6B7280";
    }
  };

  const renderTask = ({ item }: { item: SmsTask }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.logTime}>{new Date(item.scheduledAt).toLocaleString()}</Text>
      </View>

      <Text style={styles.logContent}>{item.content}</Text>

      <View style={styles.logFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="person-outline" size={14} color={Colors.light.textSecondary} />
          <Text style={styles.footerText}>{item.contact?.name || item.contact?.phoneNumber || "Unknown"}</Text>
        </View>
        {item.device && (
          <View style={styles.footerItem}>
            <Ionicons name="phone-portrait-outline" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.footerText}>{item.device.name}</Text>
          </View>
        )}
      </View>
      {item.error && (
        <Text style={styles.errorText}>Error: {item.error}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>SMS Logs</Text>
        <Text style={styles.headerSub}>History of all message tasks</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={Colors.light.textSecondary} />
              <Text style={styles.emptyText}>No logs found</Text>
            </View>
          }
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
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  logCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  logTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  logContent: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  logFooter: {
    flexDirection: "row",
    gap: 16,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
});
