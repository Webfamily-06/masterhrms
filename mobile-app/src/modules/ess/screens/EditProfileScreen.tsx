import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  User,
  Phone,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react-native';
import { EmployeeService } from '../../../core/services/employeeService';
import { useAuthStore } from '../../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import { Config } from '../../../config/environment';

const normalizeAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
  let normalized = url.trim();
  if (!normalized) return null;
  if (normalized.includes('api.dicebear.com') && normalized.includes('/svg?')) {
    normalized = normalized.replace('/svg?', '/png?');
  }
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }
  if (normalized.startsWith('/')) {
    return `${Config.API_BASE_URL}${normalized}`;
  }
  return normalized;
};

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        } else if (user?.profile?.fullName) {
          setFullName(user.profile.fullName);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    fetchCurrent();
  }, [user]);

  const avatarUri = normalizeAvatarUrl(user?.profile?.avatarUrl);

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
      });

      Alert.alert('Profile Updated', 'Your profile details have been saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Personal Information</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ─────────────────────────────────────────────────────────── */}
          {/* Basic Information Card (Matches 83)                         */}
          {/* ─────────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <User size={18} color="#2563EB" />
                <Text style={styles.cardTitle}>Basic Information</Text>
              </View>
              <View style={styles.readOnlyBadge}>
                <Text style={styles.readOnlyBadgeText}>Read-only</Text>
              </View>
            </View>

            <View style={styles.avatarRow}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarImg, styles.avatarFallback]}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 18 }}>
                    {fullName.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={{ marginLeft: 16 }}
                onPress={() => Alert.alert('Upload Photo', 'Select image from gallery or camera.')}
              >
                <Text style={styles.uploadPhotoLink}>↑ Upload Photo</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={[styles.inputBox, styles.readOnlyInput]}
              value={fullName}
              editable={false}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                <TextInput
                  style={[styles.inputBox, styles.readOnlyInput]}
                  value={dateOfBirth}
                  editable={false}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Gender</Text>
                <TextInput
                  style={[styles.inputBox, styles.readOnlyInput]}
                  value={gender}
                  onChangeText={setGender}
                  editable={false}
                />
              </View>
            </View>
          </View>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* Contact Information Card (Matches 83)                       */}
          {/* ─────────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Phone size={18} color="#2563EB" />
              <Text style={styles.cardTitle}>Contact Information</Text>
            </View>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryFlagText}>🇺🇸 +1</Text>
                <ChevronDown size={14} color="#64748B" />
              </View>
              <TextInput
                style={styles.phoneTextInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
              />
            </View>

            <Text style={styles.fieldLabel}>Personal Email</Text>
            <TextInput
              style={styles.inputBox}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Residential Address</Text>
            <TextInput
              style={styles.textAreaBox}
              value={address}
              onChangeText={setAddress}
              multiline
              maxLength={200}
            />
            <Text style={styles.charCountText}>{address.length}/200</Text>
          </View>

          {/* ─────────────────────────────────────────────────────────── */}
          {/* Emergency Contact Card (Matches 83)                         */}
          {/* ─────────────────────────────────────────────────────────── */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ShieldCheck size={18} color="#2563EB" />
              <Text style={styles.cardTitle}>Emergency Contact</Text>
            </View>

            <Text style={styles.fieldLabel}>Contact Name</Text>
            <TextInput
              style={styles.inputBox}
              value={emergencyName}
              onChangeText={setEmergencyName}
            />

            <Text style={styles.fieldLabel}>Relationship</Text>
            <View style={styles.dropdownPickerBox}>
              <Text style={styles.dropdownPickerText}>{emergencyRelation}</Text>
              <ChevronDown size={16} color="#64748B" />
            </View>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryFlagText}>🇺🇸 +1</Text>
                <ChevronDown size={14} color="#64748B" />
              </View>
              <TextInput
                style={styles.phoneTextInput}
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                placeholder="(555) 987-6543"
              />
            </View>
          </View>

          {/* Bottom Buttons: Save Changes & Cancel */}
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
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    color: '#0F172A',
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    color: '#0F172A',
  },
  readOnlyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarFallback: {
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPhotoLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  readOnlyInput: {
    backgroundColor: '#F8FAFC',
    color: '#475569',
  },
  phoneInputRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderRightColor: '#E2E8F0',
    paddingRight: 10,
    marginRight: 10,
    paddingVertical: 10,
  },
  countryFlagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 10,
  },
  textAreaBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
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
  dropdownPickerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  dropdownPickerText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },

  /* Buttons */
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
});
