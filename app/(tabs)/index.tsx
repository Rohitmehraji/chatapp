import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import * as Linking from "expo-linking";
import { getApiUrl } from "@/lib/query-client";

interface Stats {
  totalContacts: number;
  totalSmsScheduled: number;
  totalSent: number;
  totalFailed: number;
  totalPending: number;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  const { data: stats, isLoading, refetch } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

  const handleExport = () => {
    const url = `${getApiUrl()}/api/stats/export`;
    Linking.openURL(url);
  };

  const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) => (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
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
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSub}>SMS Campaign Overview</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
          <View style={styles.statsGrid}>
            <StatCard title="Total Contacts" value={stats?.totalContacts || 0} icon="people" color="#4F46E5" />
            <StatCard title="Scheduled" value={stats?.totalSmsScheduled || 0} icon="calendar" color="#8B5CF6" />
            <StatCard title="Sent" value={stats?.totalSent || 0} icon="checkmark-circle" color="#10B981" />
            <StatCard title="Failed" value={stats?.totalFailed || 0} icon="alert-circle" color="#EF4444" />
            <StatCard title="Pending" value={stats?.totalPending || 0} icon="time" color="#F59E0B" />
          </View>

          <Pressable style={styles.exportButton} onPress={handleExport}>
            <Ionicons name="download-outline" size={20} color="#FFF" />
            <Text style={styles.exportButtonText}>Export Report (CSV)</Text>
          </Pressable>

          <Pressable style={styles.refreshButton} onPress={() => refetch()}>
            <Ionicons name="refresh-outline" size={20} color={Colors.light.tint} />
            <Text style={styles.refreshButtonText}>Refresh Stats</Text>
          </Pressable>
        </ScrollView>
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
  content: {
    padding: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  exportButton: {
    backgroundColor: Colors.light.tint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  exportButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  refreshButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
