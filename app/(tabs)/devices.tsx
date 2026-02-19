import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Device from "expo-device";
import Constants from "expo-constants";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface DeviceItem {
  id: string;
  deviceId: string;
  name: string;
  status: string;
  lastSeen: string;
}

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery<DeviceItem[]>({
    queryKey: ["/api/devices"],
  });

  const registerDeviceMutation = useMutation({
    mutationFn: async (deviceData: { deviceId: string; name: string }) => {
      const response = await fetch(`${getApiUrl()}/api/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceData),
      });
      if (!response.ok) {
        throw new Error("Failed to register device");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    },
  });

  useEffect(() => {
    const registerCurrentDevice = async () => {
      const deviceId = Constants.sessionId || "browser-" + Math.random().toString(36).substring(7);
      const name = Device.deviceName || (Platform.OS === 'web' ? 'Web Browser' : 'Mobile Device');

      registerDeviceMutation.mutate({ deviceId, name });
    };

    registerCurrentDevice();
  }, []);

  const renderDevice = ({ item }: { item: DeviceItem }) => (
    <View style={styles.deviceCard}>
      <View style={[styles.statusIndicator, { backgroundColor: item.status === 'online' ? '#10B981' : '#6B7280' }]} />
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceId}>ID: {item.deviceId}</Text>
        <Text style={styles.lastSeen}>Last seen: {new Date(item.lastSeen).toLocaleString()}</Text>
      </View>
      <Ionicons
        name={Platform.OS === 'ios' ? 'phone-portrait' : 'hardware-chip'}
        size={24}
        color={Colors.light.textSecondary}
      />
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
        <Text style={styles.headerTitle}>Devices</Text>
        <Text style={styles.headerSub}>Registered sending devices</Text>
      </View>

      <View style={styles.currentDeviceBanner}>
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        <Text style={styles.currentDeviceText}>This device is registered and online</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={renderDevice}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No devices registered</Text>
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
  currentDeviceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  currentDeviceText: {
    color: "#065F46",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  deviceId: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  lastSeen: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
