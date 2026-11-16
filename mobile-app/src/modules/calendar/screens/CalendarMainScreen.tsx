import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import {
  CalendarService,
  CalendarEvent,
  CalendarCategory,
  MeetingRoom,
} from '../../../core/services/calendarService';

export const CalendarMainScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 10, 16)); // Nov 16, 2026
  const [viewMode, setViewMode] = useState<'month' | 'agenda' | 'week'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // New Event Modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Meetings');
  const [newStartDate, setNewStartDate] = useState('2026-11-16');
  const [newEndDate, setNewEndDate] = useState('2026-11-16');
  const [newStartTime, setNewStartTime] = useState('10:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [newAllDay, setNewAllDay] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [evts, cats, rms] = await Promise.all([
        CalendarService.getEvents(),
        CalendarService.getCategories(),
        CalendarService.getRooms(),
      ]);
      setEvents(evts);
      setCategories(cats);
      setRooms(rms);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrev = () => {
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    setCurrentDate(prev);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 10, 16));
  };

  const handleCreateEvent = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter an event title.');
      return;
    }

    try {
      setCreating(true);
      // Room conflict check if a room is chosen
      if (newRoom) {
        const conflict = await CalendarService.checkConflicts(
          newRoom,
          `${newStartDate}T${newStartTime}`,
          `${newEndDate}T${newEndTime}`
        );
        if (conflict.hasConflict) {
          Alert.alert('Room Conflict', 'The selected meeting room is booked during this time.');
          setCreating(false);
          return;
        }
      }

      const created = await CalendarService.createEvent({
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        startDate: newStartDate,
        endDate: newEndDate,
        startTime: newAllDay ? undefined : newStartTime,
        endTime: newAllDay ? undefined : newEndTime,
        allDay: newAllDay,
        location: newLocation.trim(),
        room: newRoom || undefined,
      });

      setCreateModalVisible(false);
      setNewTitle('');
      setNewDescription('');
      loadData();
      Alert.alert('Event Created', created ? 'Event scheduled successfully.' : 'Event saved.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create event';
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const handleRsvp = async (status: 'accepted' | 'declined' | 'tentative') => {
    if (!selectedEvent) return;
    try {
      await CalendarService.rsvpEvent(selectedEvent.id, status);
      Alert.alert('RSVP Confirmed', `Marked as ${status}`);
      setSelectedEvent(null);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to update RSVP');
    }
  };

  const handleCancelEvent = async () => {
    if (!selectedEvent) return;
    Alert.alert('Cancel Event', 'Are you sure you want to cancel this event?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          await CalendarService.cancelEvent(selectedEvent.id, 'User cancelled');
          setSelectedEvent(null);
          loadData();
        },
      },
    ]);
  };

  const filteredEvents = events.filter((e) =>
    selectedCategory === 'all' ? true : e.category.toLowerCase() === selectedCategory.toLowerCase()
  );

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // November 2026 calendar days
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Calendar</Text>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Add event"
        >
          <Text style={styles.addBtnText}>+ Event</Text>
        </TouchableOpacity>
      </View>

      {/* Date Navigation & View Mode Toggles */}
      <View style={styles.topControlSection}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={handlePrev} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthName}</Text>
          <TouchableOpacity onPress={handleNext} style={styles.navBtn}>
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToday} style={styles.todayPill}>
            <Text style={styles.todayText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* View Switcher: Month / Agenda / Week */}
        <View style={styles.viewTabs}>
          {(['month', 'agenda', 'week'] as const).map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.viewTab, viewMode === v && styles.viewTabActive]}
              onPress={() => setViewMode(v)}
            >
              <Text style={[styles.viewTabText, viewMode === v && styles.viewTabTextActive]}>
                {v.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <TouchableOpacity
            style={[styles.catChip, selectedCategory === 'all' && styles.catChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.catChipText, selectedCategory === 'all' && styles.catChipTextActive]}>
              All Categories
            </Text>
          </TouchableOpacity>
          {(categories.length > 0
            ? categories.map((c) => c.name)
            : ['Meetings', 'Project', 'Holiday', 'Training']
          ).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat.toLowerCase() && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat.toLowerCase())}
            >
              <Text
                style={[
                  styles.catChipText,
                  selectedCategory === cat.toLowerCase() && styles.catChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color="#4F46E5" style={styles.loader} />
        ) : viewMode === 'month' ? (
          /* Month Grid View */
          <View style={styles.monthCard}>
            <View style={styles.weekHeaders}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={i} style={styles.weekHeaderText}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {daysInMonth.map((day) => {
                const dayDateStr = `2026-11-${day < 10 ? '0' : ''}${day}`;
                const hasEvent = filteredEvents.some(
                  (e) => e.startDate?.startsWith(dayDateStr) || e.endDate?.startsWith(dayDateStr)
                );
                const isToday = day === 16;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayCell, isToday && styles.todayCell]}
                    onPress={() => setViewMode('agenda')}
                  >
                    <Text style={[styles.dayCellNum, isToday && styles.todayNum]}>{day}</Text>
                    {hasEvent && <View style={styles.eventDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Agenda / Upcoming Events List */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>
            {viewMode === 'month' ? 'Upcoming Schedules' : 'Scheduled Events'} ({filteredEvents.length})
          </Text>

          {filteredEvents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No events scheduled for this period.</Text>
            </View>
          ) : (
            filteredEvents.map((evt) => (
              <TouchableOpacity
                key={evt.id}
                style={styles.eventCard}
                onPress={() => setSelectedEvent(evt)}
                accessibilityRole="button"
                accessibilityLabel={evt.title}
              >
                <View
                  style={[
                    styles.eventColorBar,
                    evt.category === 'Holiday'
                      ? styles.barBlue
                      : evt.category === 'Meetings'
                      ? styles.barIndigo
                      : styles.barGreen,
                  ]}
                />
                <View style={styles.eventContent}>
                  <View style={styles.eventTopRow}>
                    <Text style={styles.eventTitle}>{evt.title}</Text>
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>{evt.category}</Text>
                    </View>
                  </View>

                  <Text style={styles.eventTiming}>
                    🕒 {evt.allDay ? 'All Day' : `${evt.startTime || '09:00'} – ${evt.endTime || '10:00'}`} •{' '}
                    {evt.startDate}
                  </Text>

                  {evt.room && <Text style={styles.eventRoom}>🏢 Room: {evt.room}</Text>}
                  {evt.location && <Text style={styles.eventLocation}>📍 {evt.location}</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Event Details Modal */}
      <Modal visible={!!selectedEvent} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEvent && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                  <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date & Time:</Text>
                  <Text style={styles.detailValue}>
                    {selectedEvent.startDate} (
                    {selectedEvent.allDay
                      ? 'All Day'
                      : `${selectedEvent.startTime || ''} - ${selectedEvent.endTime || ''}`}
                    )
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category:</Text>
                  <Text style={styles.detailValue}>{selectedEvent.category}</Text>
                </View>

                {selectedEvent.room && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Conference Room:</Text>
                    <Text style={styles.detailValue}>{selectedEvent.room}</Text>
                  </View>
                )}

                {selectedEvent.description && (
                  <View style={styles.descBox}>
                    <Text style={styles.descText}>{selectedEvent.description}</Text>
                  </View>
                )}

                {/* RSVP Actions */}
                <Text style={styles.fieldLabel}>Your RSVP Response</Text>
                <View style={styles.rsvpRow}>
                  <TouchableOpacity
                    style={[styles.rsvpBtn, styles.rsvpBtnGreen]}
                    onPress={() => handleRsvp('accepted')}
                  >
                    <Text style={styles.rsvpBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rsvpBtn, styles.rsvpBtnAmber]}
                    onPress={() => handleRsvp('tentative')}
                  >
                    <Text style={styles.rsvpBtnText}>Tentative</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rsvpBtn, styles.rsvpBtnRed]}
                    onPress={() => handleRsvp('declined')}
                  >
                    <Text style={styles.rsvpBtnText}>Decline</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.cancelEvtBtn} onPress={handleCancelEvent}>
                  <Text style={styles.cancelEvtText}>Cancel This Event</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Event Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule New Event</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Event Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Q4 Strategy Review"
                placeholderTextColor="#94A3B8"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Date Inputs */}
              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>Start Date</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newStartDate}
                    onChangeText={setNewStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.fieldLabel}>End Date</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newEndDate}
                    onChangeText={setNewEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>All-Day Event</Text>
                <Switch value={newAllDay} onValueChange={setNewAllDay} />
              </View>

              {!newAllDay && (
                <View style={styles.timeRow}>
                  <View style={styles.timeCol}>
                    <Text style={styles.fieldLabel}>Start Time</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={newStartTime}
                      onChangeText={setNewStartTime}
                    />
                  </View>
                  <View style={styles.timeCol}>
                    <Text style={styles.fieldLabel}>End Time</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={newEndTime}
                      onChangeText={setNewEndTime}
                    />
                  </View>
                </View>
              )}

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.catGrid}>
                {['Meetings', 'Project', 'Holiday', 'Training'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catPickBtn, newCategory === c && styles.catPickBtnActive]}
                    onPress={() => setNewCategory(c)}
                  >
                    <Text style={[styles.catPickText, newCategory === c && styles.catPickTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Location (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Headquarters, 3rd Floor"
                placeholderTextColor="#94A3B8"
                value={newLocation}
                onChangeText={setNewLocation}
              />

              <Text style={styles.fieldLabel}>Meeting Room (Optional)</Text>
              {rooms.length > 0 && (
                <View style={styles.catGrid}>
                  {rooms.slice(0, 3).map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.catPickBtn, newRoom === r.id && styles.catPickBtnActive]}
                      onPress={() => setNewRoom(r.id)}
                    >
                      <Text style={[styles.catPickText, newRoom === r.id && styles.catPickTextActive]}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TextInput
                style={styles.modalInput}
                placeholder="Or type custom room name"
                placeholderTextColor="#94A3B8"
                value={newRoom}
                onChangeText={setNewRoom}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Agenda, conference link, or notes"
                placeholderTextColor="#94A3B8"
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateEvent}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm & Schedule</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1E1B4B',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topControlSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    padding: 6,
  },
  navBtnText: {
    fontSize: 24,
    color: '#1E1B4B',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  todayPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  todayText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 10,
  },
  viewTabActive: {
    backgroundColor: '#FFFFFF',
  },
  viewTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  viewTabTextActive: {
    color: '#1E1B4B',
  },
  categoryScrollContainer: {
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryScroll: {
    paddingHorizontal: 16,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 40,
  },
  monthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  weekHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  weekHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    width: 38,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    borderRadius: 12,
  },
  todayCell: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  dayCellNum: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  todayNum: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4F46E5',
    marginTop: 2,
  },
  eventsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  eventColorBar: {
    width: 6,
  },
  barIndigo: {
    backgroundColor: '#4F46E5',
  },
  barBlue: {
    backgroundColor: '#3B82F6',
  },
  barGreen: {
    backgroundColor: '#10B981',
  },
  eventContent: {
    flex: 1,
    padding: 14,
  },
  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  catBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  eventTiming: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  eventRoom: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
  },
  eventLocation: {
    fontSize: 11,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  descBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  descText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 6,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  rsvpBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  rsvpBtnGreen: {
    backgroundColor: '#D1FAE5',
  },
  rsvpBtnAmber: {
    backgroundColor: '#FEF3C7',
  },
  rsvpBtnRed: {
    backgroundColor: '#FEE2E2',
  },
  rsvpBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  cancelEvtBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
  },
  cancelEvtText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCol: {
    flex: 1,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  catPickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  catPickBtnActive: {
    backgroundColor: '#4F46E5',
  },
  catPickText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catPickTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
