import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '../../../components/common/Text';
import { UserAvatar } from '../../../components/common/UserAvatar';
import {
  ArrowLeft,
  User,
  Phone,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react-native';
import { EmployeeService } from '../../../core/services/employeeService';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useNavigation } from '@react-navigation/native';

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const updateUserAvatar = useAuthStore((state) => state.updateUserAvatar);
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.profile?.avatarUrl || null);
  const [fullName, setFullName] = useState(user?.profile?.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  useEffect(() => {
    async function fetchCurrent() {
      try {
        const data = await EmployeeService.getMyProfile();
        if (data) {
          const fn = `${data.firstName || ''} ${data.lastName || ''}`.trim();
          if (fn) setFullName(fn);
          if (data.dateOfBirth) setDateOfBirth(data.dateOfBirth);
          if (data.phone) setPhone(data.phone);
          if (data.email) setEmail(data.email);
          if (data.address) setAddress(data.address);
          if (data.emergencyContactName) setEmergencyName(data.emergencyContactName);
          if (data.emergencyContactRelation) setEmergencyRelation(data.emergencyContactRelation);
          if (data.emergencyContactPhone) setEmergencyPhone(data.emergencyContactPhone);
          if (data.gender) setGender(data.gender);
          if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        } else if (user?.profile?.fullName) {
          setFullName(user.profile.fullName);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    void fetchCurrent();
  }, [user]);

  const handleUploadPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow photo library access in Settings to choose a profile image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.35,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const dataUri = asset.base64
        ? `data:${mimeType};base64,${asset.base64}`
        : asset.uri;

      setAvatarUrl(dataUri);
      updateUserAvatar(dataUri);
    } catch (err: any) {
      Alert.alert('Photo Error', err?.message || 'Unable to pick photo.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parts = fullName.trim().split(' ');
      const fName = parts[0] || 'Employee';
      const lName = parts.slice(1).join(' ') || '';

      await EmployeeService.updateMyProfile({
        firstName: fName,
        lastName: lName,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        emergencyContactName: emergencyName.trim() || undefined,
        emergencyContactPhone: emergencyPhone.trim() || undefined,
        emergencyContactRelation: emergencyRelation.trim() || undefined,
        ...(avatarUrl ? { avatarUrl } : {}),
      });

      if (avatarUrl) {
        updateUserAvatar(avatarUrl);
      }

      Alert.alert('Profile Updated', 'Your profile details and photo have been saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const inputThemeStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={theme.colors.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Edit Personal Information
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <User size={18} color="#2563EB" />
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  Basic Information
                </Text>
              </View>
            </View>

            <View style={styles.avatarRow}>
              <UserAvatar
                uri={avatarUrl}
                entity={user}
                name={fullName}
                email={email}
                size={64}
              />
              <TouchableOpacity
                style={{ marginLeft: 16 }}
                onPress={handleUploadPhoto}
              >
                <Text style={styles.uploadPhotoLink}>↑ Upload / Change Photo</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.inputBox, inputThemeStyle]}
              value={fullName}
              onChangeText={setFullName}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Date of Birth
                </Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border, color: theme.colors.textSecondary },
                  ]}
                  value={dateOfBirth}
                  editable={false}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Gender</Text>
                <TextInput
                  style={[styles.inputBox, inputThemeStyle]}
                  value={gender}
                  onChangeText={setGender}
                />
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Phone size={18} color="#2563EB" />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Contact Information
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Phone Number
            </Text>
            <View style={[styles.phoneInputRow, { borderColor: theme.colors.border }]}>
              <View style={[styles.countryCodeBadge, { borderRightColor: theme.colors.border }]}>
                <Text style={[styles.countryFlagText, { color: theme.colors.text }]}>+91</Text>
                <ChevronDown size={14} color={theme.colors.textSecondary} />
              </View>
              <TextInput
                style={[styles.phoneTextInput, { color: theme.colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="98765 43210"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Work Email</Text>
            <TextInput
              style={[styles.inputBox, inputThemeStyle]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Residential Address
            </Text>
            <TextInput
              style={[styles.textAreaBox, inputThemeStyle]}
              value={address}
              onChangeText={setAddress}
              multiline
              maxLength={200}
              placeholderTextColor={theme.colors.textMuted}
            />
            <Text style={styles.charCountText}>{address.length}/200</Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ShieldCheck size={18} color="#2563EB" />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Emergency Contact
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Contact Name
            </Text>
            <TextInput
              style={[styles.inputBox, inputThemeStyle]}
              value={emergencyName}
              onChangeText={setEmergencyName}
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Relationship
            </Text>
            <TextInput
              style={[styles.inputBox, inputThemeStyle]}
              value={emergencyRelation}
              onChangeText={setEmergencyRelation}
              placeholder="Spouse / Parent / Sibling"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
              Phone Number
            </Text>
            <View style={[styles.phoneInputRow, { borderColor: theme.colors.border }]}>
              <View style={[styles.countryCodeBadge, { borderRightColor: theme.colors.border }]}>
                <Text style={[styles.countryFlagText, { color: theme.colors.text }]}>+91</Text>
                <ChevronDown size={14} color={theme.colors.textSecondary} />
              </View>
              <TextInput
                style={[styles.phoneTextInput, { color: theme.colors.text }]}
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                placeholder="98765 43210"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveChangesBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveChangesBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.cancelBtnText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadPhotoLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  phoneInputRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRightWidth: 1,
    paddingRight: 10,
    marginRight: 10,
    paddingVertical: 10,
  },
  countryFlagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  textAreaBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCountText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 10,
  },
  saveChangesBtn: {
    backgroundColor: '#2563EB',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 10,
  },
  saveChangesBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    borderWidth: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
