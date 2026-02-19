import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface Contact {
  id: string;
  phoneNumber: string;
  name: string | null;
}

interface DeviceItem {
  id: string;
  name: string;
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [delayMinutes, setDelayMinutes] = useState("5");

  const { data: contacts } = useQuery<Contact[]>({ queryKey: ["/api/contacts"] });
  const { data: devices } = useQuery<DeviceItem[]>({ queryKey: ["/api/devices"] });

  const wordCount = useMemo(() => {
    return content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  }, [content]);

  const scheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${getApiUrl()}/api/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to schedule SMS");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setContent("");
      setSelectedContactId("");
      Alert.alert("Success", "SMS scheduled successfully");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleSchedule = () => {
    if (!selectedContactId) return Alert.alert("Error", "Please select a contact");
    if (!content) return Alert.alert("Error", "Please write a message");
    if (wordCount > 20) return Alert.alert("Error", "Message exceeds 20 words");

    const scheduledAt = new Date(Date.now() + parseInt(delayMinutes || "0") * 60000).toISOString();

    scheduleMutation.mutate({
      contactId: selectedContactId,
      deviceId: selectedDeviceId || undefined,
      content,
      scheduledAt,
    });
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>Schedule SMS</Text>
        <Text style={styles.headerSub}>Create a new message task</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <Text style={styles.label}>Select Contact</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
          {contacts?.map((c) => (
            <Pressable
              key={c.id}
              style={[styles.chip, selectedContactId === c.id && styles.chipSelected]}
              onPress={() => setSelectedContactId(c.id)}
            >
              <Text style={[styles.chipText, selectedContactId === c.id && styles.chipTextSelected]}>
                {c.name || c.phoneNumber}
              </Text>
            </Pressable>
          ))}
          {(!contacts || contacts.length === 0) && (
            <Text style={styles.emptyText}>No contacts found. Add some first!</Text>
          )}
        </ScrollView>

        <Text style={styles.label}>Select Sending Device (Optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelect}>
          {devices?.map((d) => (
            <Pressable
              key={d.id}
              style={[styles.chip, selectedDeviceId === d.id && styles.chipSelected]}
              onPress={() => setSelectedDeviceId(d.id)}
            >
              <Text style={[styles.chipText, selectedDeviceId === d.id && styles.chipTextSelected]}>
                {d.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.messageContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Message</Text>
            <Text style={[styles.wordCount, wordCount > 20 && styles.wordCountError]}>
              {wordCount}/20 words
            </Text>
          </View>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Write your message here (max 20 words)..."
            value={content}
            onChangeText={setContent}
          />
        </View>

        <Text style={styles.label}>Schedule (minutes from now)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={delayMinutes}
          onChangeText={setDelayMinutes}
          placeholder="5"
        />

        <Pressable
          style={[styles.scheduleButton, (wordCount > 20 || !selectedContactId) && styles.scheduleButtonDisabled]}
          onPress={handleSchedule}
          disabled={scheduleMutation.isPending || wordCount > 20 || !selectedContactId}
        >
          {scheduleMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFF" />
              <Text style={styles.scheduleButtonText}>Schedule Message</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
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
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 8,
    marginTop: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  horizontalSelect: {
    flexDirection: "row",
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  chipTextSelected: {
    color: "#FFF",
  },
  messageContainer: {
    marginTop: 8,
  },
  wordCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  wordCountError: {
    color: "#EF4444",
    fontFamily: "Inter_700Bold",
  },
  textArea: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    height: 120,
    textAlignVertical: "top",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  scheduleButton: {
    backgroundColor: Colors.light.tint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 32,
  },
  scheduleButtonDisabled: {
    backgroundColor: Colors.light.textSecondary,
    opacity: 0.6,
  },
  scheduleButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptyText: {
    color: Colors.light.textSecondary,
    fontFamily: "Inter_400Regular",
    padding: 8,
  },
});
