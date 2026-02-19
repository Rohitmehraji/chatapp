import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import Colors from "@/constants/colors";
import { getApiUrl } from "@/lib/query-client";

interface Contact {
  id: string;
  phoneNumber: string;
  name: string | null;
}

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const addContactMutation = useMutation({
    mutationFn: async (newContact: { name: string; phoneNumber: string }) => {
      const response = await fetch(`${getApiUrl()}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to add contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setName("");
      setPhone("");
      Alert.alert("Success", "Contact added successfully");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"],
      });

      if (result.canceled) return;

      setIsUploading(true);
      const file = result.assets[0];
      const formData = new FormData();

      // Handle file for different platforms
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append("file", blob, file.name);
      } else {
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        } as any);
      }

      const response = await fetch(`${getApiUrl()}/api/contacts/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Upload failed");
      }

      const resData = await response.json();
      Alert.alert("Success", resData.message);
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {(item.name || "U").charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name || "Unnamed"}</Text>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
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
        <Text style={styles.headerTitle}>Contacts</Text>
        <Text style={styles.headerSub}>Manage your recipients</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Add Contact Manually</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number (e.g. +1234567890)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Pressable
          style={styles.addButton}
          onPress={() => addContactMutation.mutate({ name, phoneNumber: phone })}
          disabled={addContactMutation.isPending}
        >
          {addContactMutation.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.addButtonText}>Add Contact</Text>
          )}
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Upload Contacts</Text>
        <Pressable
          style={styles.uploadButton}
          onPress={handleFileUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color={Colors.light.tint} />
          ) : (
            <>
              <Ionicons name="document-attach-outline" size={20} color={Colors.light.tint} />
              <Text style={styles.uploadButtonText}>Choose Excel or CSV File</Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { marginLeft: 24, marginTop: 16 }]}>
        Contact List ({contacts?.length || 0})
      </Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={Colors.light.tint} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No contacts yet</Text>
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
  form: {
    padding: 24,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    fontFamily: "Inter_400Regular",
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 20,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderStyle: "dashed",
    gap: 8,
  },
  uploadButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    padding: 24,
    gap: 12,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  contactPhone: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
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
