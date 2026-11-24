import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowRight,
  ShieldCheck,
  Receipt,
  Wallet,
  Users,
  Award,
  Sparkles,
  TrendingUp,
  Target,
  CheckCircle2,
  Calendar,
  Building2,
} from 'lucide-react-native';
import { Text } from '../../../components/common/Text';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { localStorage } from '../../../core/storage/localStorage';
import { STORAGE_KEYS } from '../../../config/constants';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  badge: string;
  badgeIcon: React.ReactNode;
  title: string;
  subtitle: string;
  themeColor: string;
  renderIllustration: (isDark: boolean) => React.ReactNode;
}

export const OnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp<'Onboarding'>>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const completeOnboarding = async () => {
    localStorage.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, 'true');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login', params: {} }],
    });
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      void completeOnboarding();
    }
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems[0] && viewableItems[0].index !== null && viewableItems[0].index !== undefined) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const SLIDES: OnboardingSlide[] = [
    {
      id: 'payslips',
      badge: 'Payroll & Compensation',
      badgeIcon: <Wallet size={14} color="#0d6efd" />,
      title: 'Access Your\nMonthly Payslips',
      subtitle:
        'View detailed salary breakdowns, allowances, and deductions securely with instant tax receipts.',
      themeColor: '#0d6efd',
      renderIllustration: (isDark) => (
        <View style={[styles.illustrationCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
          {/* Header pill */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#0d6efd15' }]}>
              <Receipt size={18} color="#0d6efd" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardHeaderTitle}>November 2026 Payslip</Text>
              <Text style={styles.cardHeaderSub}>Direct Deposit • Verified</Text>
            </View>
            <View style={[styles.pillBadge, { backgroundColor: '#10b98115', borderColor: '#10b98130' }]}>
              <ShieldCheck size={12} color="#10b981" />
              <Text style={[styles.pillText, { color: '#10b981', marginLeft: 4 }]}>Paid</Text>
            </View>
          </View>

          {/* Salary Highlight */}
          <View style={[styles.amountHeroBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
            <Text style={styles.amountLabel}>NET TAKE-HOME PAY</Text>
            <Text style={styles.amountValue}>$8,450.00</Text>
            <View style={styles.amountSubRow}>
              <Sparkles size={13} color="#0d6efd" />
              <Text style={[styles.amountSubText, { color: '#0d6efd' }]}>Base: $6,200  •  Allowances: +$2,250</Text>
            </View>
          </View>

          {/* Breakdown Mini Rows */}
          <View style={styles.breakdownList}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Medical & Provident Fund</Text>
              <Text style={styles.breakdownPositive}>-$450.00</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Federal & State Withholding</Text>
              <Text style={styles.breakdownPositive}>-$800.00</Text>
            </View>
          </View>

          {/* Security stamp */}
          <View style={styles.stampFooter}>
            <ShieldCheck size={13} color="#64748b" />
            <Text style={styles.stampText}>256-bit AES Financial Encryption</Text>
          </View>
        </View>
      ),
    },
    {
      id: 'team',
      badge: 'Workforce Collaboration',
      badgeIcon: <Users size={14} color="#06b6d4" />,
      title: 'Stay Connected with\nHR & Team',
      subtitle:
        'Earn ratings, complete training, and unlock badges to attract more recognition across your enterprise.',
      themeColor: '#06b6d4',
      renderIllustration: (isDark) => (
        <View style={[styles.illustrationCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
          {/* Header pill */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#06b6d415' }]}>
              <Building2 size={18} color="#06b6d4" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardHeaderTitle}>Global Workforce Hub</Text>
              <Text style={styles.cardHeaderSub}>42 Peers Active Now</Text>
            </View>
            <View style={[styles.pillBadge, { backgroundColor: '#06b6d415', borderColor: '#06b6d430' }]}>
              <Text style={[styles.pillText, { color: '#06b6d4' }]}>Online</Text>
            </View>
          </View>

          {/* Team Message Cards */}
          <View style={[styles.activityTile, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
            <View style={[styles.tileIconCircle, { backgroundColor: '#10b98115' }]}>
              <CheckCircle2 size={16} color="#10b981" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.tileTitle}>Annual Leave Approved</Text>
              <Text style={styles.tileDesc}>HR Manager approved Dec 24 - Jan 2</Text>
            </View>
          </View>

          <View style={[styles.activityTile, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
            <View style={[styles.tileIconCircle, { backgroundColor: '#8b5cf615' }]}>
              <Calendar size={16} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.tileTitle}>Sprint Planning & Demo</Text>
              <Text style={styles.tileDesc}>Today at 10:30 AM • Conf Room B</Text>
            </View>
          </View>

          {/* Achievement badge */}
          <View style={[styles.achievementPill, { backgroundColor: '#f59e0b10', borderColor: '#f59e0b30' }]}>
            <Award size={15} color="#f59e0b" />
            <Text style={[styles.achievementText, { color: '#f59e0b' }]}>Top Performer • HR Certified Leader</Text>
          </View>
        </View>
      ),
    },
    {
      id: 'performance',
      badge: 'Insights & Growth',
      badgeIcon: <TrendingUp size={14} color="#8b5cf6" />,
      title: 'Track Your\nPerformance',
      subtitle:
        'Receive feedback, monitor progress, and achieve career growth with transparent real-time insights.',
      themeColor: '#8b5cf6',
      renderIllustration: (isDark) => (
        <View style={[styles.illustrationCard, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
          {/* Header pill */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#8b5cf615' }]}>
              <Target size={18} color="#8b5cf6" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardHeaderTitle}>Quarterly Growth Matrix</Text>
              <Text style={styles.cardHeaderSub}>Q4 2026 Evaluation Cycle</Text>
            </View>
            <View style={[styles.pillBadge, { backgroundColor: '#8b5cf615', borderColor: '#8b5cf630' }]}>
              <Text style={[styles.pillText, { color: '#8b5cf6' }]}>Tier 1</Text>
            </View>
          </View>

          {/* Goal highlight */}
          <View style={[styles.goalScoreBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
            <View style={styles.goalScoreLeft}>
              <Text style={styles.goalScoreLabel}>OVERALL KPI RATING</Text>
              <Text style={styles.goalScoreValue}>94.8%</Text>
              <Text style={styles.goalScoreSub}>Exceeds Targets (+4.8%)</Text>
            </View>
            <View style={[styles.scoreBadgeCircle, { backgroundColor: '#8b5cf615' }]}>
              <Award size={26} color="#8b5cf6" />
            </View>
          </View>

          {/* Progress Bars */}
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Project Deliveries</Text>
              <Text style={styles.progressValue}>98%</Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
              <View style={[styles.progressBarFill, { width: '98%', backgroundColor: '#8b5cf6' }]} />
            </View>

            <View style={[styles.progressRow, { marginTop: 8 }]}>
              <Text style={styles.progressLabel}>Team Leadership & Mentoring</Text>
              <Text style={styles.progressValue}>92%</Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
              <View style={[styles.progressBarFill, { width: '92%', backgroundColor: '#06b6d4' }]} />
            </View>
          </View>
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: theme.isDark ? '#0b1120' : '#f8fafc' },
      ]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
      />

      {/* Top Bar with Skip */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>M</Text>
          </View>
          <Text style={[styles.brandTitle, { color: theme.colors.text }]}>
            Master<Text style={{ color: '#0d6efd' }}>HRMS</Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => void completeOnboarding()}
          style={[styles.skipButton, { backgroundColor: theme.isDark ? '#1e293b' : '#edf2f7' }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Slide Pages */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={styles.slideContainer}>
            {/* Illustration Graphic Area */}
            <View style={styles.illustrationWrapper}>
              {/* Background ambient glow circle */}
              <View
                style={[
                  styles.ambientGlow,
                  {
                    backgroundColor: item.themeColor,
                    opacity: theme.isDark ? 0.12 : 0.08,
                  },
                ]}
              />
              {item.renderIllustration(theme.isDark)}
            </View>

            {/* Slide Text Content */}
            <View style={styles.textContainer}>
              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor: theme.isDark ? '#1e293b' : '#e0e7ff',
                    borderColor: theme.isDark ? '#334155' : '#c7d2fe',
                  },
                ]}
              >
                {item.badgeIcon}
                <Text
                  style={[
                    styles.categoryBadgeText,
                    { color: item.themeColor },
                  ]}
                >
                  {item.badge}
                </Text>
              </View>

              <Text style={[styles.slideTitle, { color: theme.colors.text }]}>
                {item.title}
              </Text>
              <Text
                style={[
                  styles.slideSubtitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {item.subtitle}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Bottom Footer: Indicators & Action Button */}
      <View style={styles.bottomFooter}>
        {/* Animated Pagination Dots */}
        <View style={styles.paginationRow}>
          {SLIDES.map((_, index) => {
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            const activeColor = SLIDES[currentIndex]?.themeColor || '#0d6efd';

            return (
              <Animated.View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    width: dotWidth,
                    opacity,
                    backgroundColor:
                      currentIndex === index
                        ? activeColor
                        : theme.isDark
                        ? '#334155'
                        : '#cbd5e1',
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor:
                SLIDES[currentIndex]?.themeColor || '#0d6efd',
            },
          ]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0d6efd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandBadgeText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  illustrationWrapper: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_HEIGHT * 0.42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    borderRadius: (SCREEN_WIDTH * 0.75) / 2,
  },
  illustrationCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardHeaderSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  amountHeroBox: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#64748b',
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0d6efd',
    marginVertical: 4,
  },
  amountSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountSubText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  breakdownList: {
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  breakdownPositive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e11d48',
  },
  stampFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  stampText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    marginLeft: 5,
  },
  activityTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  tileIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  tileDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  achievementPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  achievementText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  goalScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  goalScoreLeft: {
    flex: 1,
  },
  goalScoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#64748b',
  },
  goalScoreValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#8b5cf6',
    marginVertical: 2,
  },
  goalScoreSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  scoreBadgeCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  slideSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  bottomFooter: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    shadowColor: '#0d6efd',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
