import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  Plus,
  Users,
  Search,
  MoreVertical,
  FolderKanban,
  UserPlus,
  KeyRound,
  X,
  CheckCircle2,
  Sparkles,
  Copy,
  Archive,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common';
import { useNavigation } from '@react-navigation/native';
import { useCallStore } from '../../../store/callStore';
import { ManagerService } from '../../../core/services/managerService';

interface TeamMemberItem {
  id: string;
  name: string;
  role: 'Lead' | 'Member' | 'Reviewer';
  designation: string;
  online: boolean;
}

interface TeamProjectItem {
  id: string;
  name: string;
  client: string;
  priority: 'Critical' | 'High' | 'Medium';
  progress: number;
  tasksCount: number;
  archived?: boolean;
}

interface TeamWorkspace {
  id: string;
  name: string;
  department: string;
  description: string;
  color: string;
  inviteCode: string;
  isJoined: boolean;
  members: TeamMemberItem[];
  projects: TeamProjectItem[];
}

const TEAM_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

const INITIAL_TEAMS: TeamWorkspace[] = [
  {
    id: 'team-1',
    name: 'Mobile Engineering',
    department: 'Product & Engineering',
    description: 'Core iOS, Android & React Native experience for Master HRMS.',
    color: '#4F46E5',
    inviteCode: 'MOB-2026',
    isJoined: true,
    members: [
      { id: 'm1', name: 'Sarah Connor', role: 'Lead', designation: 'Staff Mobile Engineer', online: true },
      { id: 'm2', name: 'James Rodriguez', role: 'Member', designation: 'UI/UX Architect', online: true },
      { id: 'm3', name: 'Priya Sharma', role: 'Reviewer', designation: 'QA Automation Lead', online: false },
    ],
    projects: [
      { id: 'p1', name: 'HRMS Unified Mobile App', client: 'Webfamily Global', priority: 'High', progress: 85, tasksCount: 18 },
      { id: 'p2', name: 'Dynamic Island & Widgets Pack', client: 'Core Platform', priority: 'High', progress: 70, tasksCount: 9 },
    ],
  },
  {
    id: 'team-2',
    name: 'Platform Security',
    department: 'Infrastructure',
    description: 'Multi-tenant isolation, RBAC, Turnstile, and compliance audits.',
    color: '#10B981',
    inviteCode: 'SEC-9941',
    isJoined: true,
    members: [
      { id: 'm4', name: 'David Kim', role: 'Lead', designation: 'Principal Security Eng', online: true },
      { id: 'm5', name: 'Elena Rostova', role: 'Member', designation: 'Backend Architect', online: true },
    ],
    projects: [
      { id: 'p3', name: 'Enterprise Multi-Tenant Security Engine', client: 'Core Platform', priority: 'Critical', progress: 100, tasksCount: 14 },
    ],
  },
  {
    id: 'team-3',
    name: 'People & HR Ops',
    department: 'Human Resources',
    description: 'Global payroll compliance, onboarding workflows, and employee engagement.',
    color: '#F59E0B',
    inviteCode: 'HRO-4410',
    isJoined: false,
    members: [
      { id: 'm6', name: 'Ananya Verma', role: 'Lead', designation: 'HR Operations Manager', online: true },
    ],
    projects: [
      { id: 'p4', name: 'Q4 Appraisal & OKR Cycle', client: 'Internal HR', priority: 'Medium', progress: 60, tasksCount: 11 },
    ],
  },
];

/**
 * Full Teams & Projects Hub
 * Implements all 8 task/Teams Screen*.png mockups (Teams List, Create Team,
 * Join Team, Team Open Action, Team Details, Project List Action, Team Members).
 */
export const TeamProjectsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const showDynamicIsland = useCallStore((s) => s.showDynamicIsland);

  const [teams, setTeams] = useState<TeamWorkspace[]>(INITIAL_TEAMS);
  const [search, setSearch] = useState('');
  const [scopeTab, setScopeTab] = useState<'my' | 'all'>('my');

  useEffect(() => {
    let active = true;
    ManagerService.getTeams()
      .then((res) => {
        if (active && Array.isArray(res) && res.length > 0) {
          setTeams(res as TeamWorkspace[]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Modals & Action Sheets
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = useState(false);
  const [teamActionTarget, setTeamActionTarget] = useState<TeamWorkspace | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'projects' | 'members'>('projects');
  const [detailActionOpen, setDetailActionOpen] = useState(false);
  const [projectActionTarget, setProjectActionTarget] = useState<TeamProjectItem | null>(null);

  // Create Team Form
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDept, setNewTeamDept] = useState('Engineering');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0]);

  // Join Team Form
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  // Invite Member Form
  const [inviteMemberName, setInviteMemberName] = useState('');

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (scopeTab === 'my' && !t.isJoined) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [teams, scopeTab, search]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert('Team Name Required', 'Please enter a team name.');
      return;
    }
    try {
      const created = await ManagerService.createTeam({
        name: newTeamName.trim(),
        department: newTeamDept.trim() || 'General',
        description: newTeamDesc.trim() || 'Collaborative workspace team.',
        color: newTeamColor,
      });
      setTeams((prev) => [created as TeamWorkspace, ...prev]);
      setNewTeamName('');
      setNewTeamDesc('');
      setCreateTeamOpen(false);
      Alert.alert('Team Created', `${created.name} created with invite code ${created.inviteCode}.`);
    } catch (err: any) {
      Alert.alert('Create Team Error', err?.message || 'Unable to create team.');
    }
  };

  const handleJoinByCode = async (codeOverride?: string) => {
    const code = (codeOverride || inviteCodeInput).trim().toUpperCase();
    if (!code) {
      Alert.alert('Invite Code Required', 'Enter a valid team invite code.');
      return;
    }
    try {
      const joined = await ManagerService.joinTeam(code);
      setTeams((prev) => {
        const exists = prev.some((t) => t.id === joined.id);
        return exists
          ? prev.map((t) => (t.id === joined.id ? (joined as TeamWorkspace) : t))
          : [joined as TeamWorkspace, ...prev];
      });
      setInviteCodeInput('');
      setJoinTeamOpen(false);
      Alert.alert('Joined Team', `You are now a member of ${joined.name}.`);
    } catch (err: any) {
      Alert.alert('Join Team Error', err?.message || 'Invalid team invite code.');
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !inviteMemberName.trim()) return;
    try {
      const member = await ManagerService.inviteTeamMember(selectedTeam.id, {
        name: inviteMemberName.trim(),
        role: 'Member',
      });
      setTeams((prev) =>
        prev.map((t) =>
          t.id === selectedTeam.id
            ? { ...t, members: [...t.members, member as TeamMemberItem] }
            : t
        )
      );
      setInviteMemberName('');
    } catch (err: any) {
      Alert.alert('Invite Error', err?.message || 'Unable to invite member.');
    }
  };

  const handleBumpProjectProgress = async (proj: TeamProjectItem) => {
    if (!selectedTeam) return;
    const nextProgress = Math.min(100, proj.progress + 10);
    setProjectActionTarget(null);
    setTeams((prev) =>
      prev.map((t) =>
        t.id === selectedTeam.id
          ? {
              ...t,
              projects: t.projects.map((p) =>
                p.id === proj.id ? { ...p, progress: nextProgress } : p
              ),
            }
          : t
      )
    );
    await ManagerService.updateProjectProgress(proj.id, nextProgress).catch(() => {});
  };

  const handleArchiveProject = async (proj: TeamProjectItem) => {
    if (!selectedTeam) return;
    setProjectActionTarget(null);
    setTeams((prev) =>
      prev.map((t) =>
        t.id === selectedTeam.id
          ? { ...t, projects: t.projects.filter((p) => p.id !== proj.id) }
          : t
      )
    );
    await ManagerService.archiveProject(proj.id).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teams & Projects</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.joinPillBtn}
            onPress={() => setJoinTeamOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Join Team"
          >
            <KeyRound size={14} color="#4F46E5" />
            <Text style={styles.joinPillText}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createPillBtn}
            onPress={() => setCreateTeamOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Create Team"
          >
            <Plus size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Scope Tabs */}
      <View style={styles.controlsBar}>
        <View style={styles.searchBox}>
          <Search size={15} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teams, departments, projects..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, scopeTab === 'my' && styles.segmentBtnActive]}
            onPress={() => setScopeTab('my')}
          >
            <Text style={[styles.segmentText, scopeTab === 'my' && styles.segmentTextActive]}>
              My Teams ({teams.filter((t) => t.isJoined).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, scopeTab === 'all' && styles.segmentBtnActive]}
            onPress={() => setScopeTab('all')}
          >
            <Text style={[styles.segmentText, scopeTab === 'all' && styles.segmentTextActive]}>
              All Teams ({teams.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredTeams.map((team) => {
          const avgProgress =
            team.projects.length > 0
              ? Math.round(
                  team.projects.reduce((sum, p) => sum + p.progress, 0) / team.projects.length
                )
              : 0;
          return (
            <TouchableOpacity
              key={team.id}
              style={styles.teamCard}
              activeOpacity={0.86}
              onPress={() => {
                setSelectedTeamId(team.id);
                setDetailTab('projects');
              }}
            >
              <View style={styles.teamCardHeader}>
                <View style={[styles.teamBadge, { backgroundColor: `${team.color}1F` }]}>
                  <Users size={18} color={team.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projectName}>{team.name}</Text>
                  <Text style={styles.projectMeta}>
                    {team.department} • Code: {team.inviteCode}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.moreBtn}
                  onPress={() => setTeamActionTarget(team)}
                  accessibilityRole="button"
                  accessibilityLabel={`Actions for ${team.name}`}
                >
                  <MoreVertical size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.teamDesc} numberOfLines={2}>
                {team.description}
              </Text>

              <View style={styles.teamStatsRow}>
                <View style={styles.avatarRow}>
                  {team.members.slice(0, 4).map((m) => (
                    <View key={m.id} style={[styles.miniAvatar, { borderColor: '#FFFFFF' }]}>
                      <Text style={styles.miniAvatarText}>{m.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                  ))}
                  <Text style={styles.memberCountText}>{team.members.length} members</Text>
                </View>
                <View style={styles.projectCountBadge}>
                  <FolderKanban size={12} color="#4F46E5" />
                  <Text style={styles.projectCountText}>{team.projects.length} projects</Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${avgProgress}%`, backgroundColor: team.color },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{avgProgress}% Avg Progress</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Create Team Modal (Matches Teams Screen - Create Team.png) ─── */}
      <Modal visible={createTeamOpen} animationType="slide" transparent onRequestClose={() => setCreateTeamOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Team</Text>
              <TouchableOpacity onPress={() => setCreateTeamOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Team Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Growth Engineering"
              value={newTeamName}
              onChangeText={setNewTeamName}
            />
            <Text style={styles.inputLabel}>Department</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Engineering, HR, Finance"
              value={newTeamDept}
              onChangeText={setNewTeamDept}
            />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, { minHeight: 68, textAlignVertical: 'top' }]}
              placeholder="What does this team own?"
              value={newTeamDesc}
              onChangeText={setNewTeamDesc}
              multiline
            />
            <Text style={styles.inputLabel}>Team Color</Text>
            <View style={styles.swatchRow}>
              {TEAM_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    newTeamColor === c && styles.swatchActive,
                  ]}
                  onPress={() => setNewTeamColor(c)}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.primaryFullBtn} onPress={handleCreateTeam}>
              <Text style={styles.primaryFullBtnText}>Create Team</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Join Team Modal (Matches Teams Screen - Join Team.png) ─── */}
      <Modal visible={joinTeamOpen} animationType="slide" transparent onRequestClose={() => setJoinTeamOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Join a Team</Text>
              <TouchableOpacity onPress={() => setJoinTeamOpen(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Team Invite Code</Text>
            <TextInput
              style={[styles.input, { fontWeight: '700', letterSpacing: 1.5 }]}
              placeholder="e.g. HRO-4410"
              autoCapitalize="characters"
              value={inviteCodeInput}
              onChangeText={setInviteCodeInput}
            />
            <TouchableOpacity style={styles.primaryFullBtn} onPress={() => handleJoinByCode()}>
              <Text style={styles.primaryFullBtnText}>Join with Code</Text>
            </TouchableOpacity>
            {teams.filter((t) => !t.isJoined).length > 0 && (
              <View style={{ marginTop: 14, gap: 8 }}>
                <Text style={styles.inputLabel}>Open Workspace Teams</Text>
                {teams
                  .filter((t) => !t.isJoined)
                  .map((openTeam) => (
                    <View key={openTeam.id} style={styles.openTeamRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.openTeamName}>{openTeam.name}</Text>
                        <Text style={styles.projectMeta}>{openTeam.department}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.joinSmallBtn}
                        onPress={() => handleJoinByCode(openTeam.inviteCode)}
                      >
                        <Text style={styles.joinSmallBtnText}>Join</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Teams Open Action Sheet (Matches Teams Screen - Open Action.png) ─── */}
      <Modal
        visible={!!teamActionTarget}
        animationType="fade"
        transparent
        onRequestClose={() => setTeamActionTarget(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setTeamActionTarget(null)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{teamActionTarget?.name}</Text>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                if (teamActionTarget) setSelectedTeamId(teamActionTarget.id);
                setTeamActionTarget(null);
              }}
            >
              <FolderKanban size={18} color="#4F46E5" />
              <Text style={styles.actionRowText}>Open Team Details & Projects</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                const target = teamActionTarget;
                setTeamActionTarget(null);
                if (target) {
                  showDynamicIsland({
                    type: 'goal_progress',
                    title: target.name,
                    subtitle: `${target.projects.length} Projects • ${target.members.length} Members`,
                    metricValue: target.inviteCode,
                    progress: 78,
                    mode: 'expanded',
                    targetRoute: 'TeamProjects',
                  });
                }
              }}
            >
              <Sparkles size={18} color="#F59E0B" />
              <Text style={styles.actionRowText}>Pin Team Progress to Dynamic Island</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                Alert.alert('Invite Code', `Share code: ${teamActionTarget?.inviteCode}`);
                setTeamActionTarget(null);
              }}
            >
              <Copy size={18} color="#0EA5E9" />
              <Text style={styles.actionRowText}>Share Invite Code ({teamActionTarget?.inviteCode})</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── Team Details Modal (Projects & Members Tabs) ─── */}
      <Modal
        visible={!!selectedTeam}
        animationType="slide"
        onRequestClose={() => setSelectedTeamId(null)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedTeamId(null)} style={styles.backButton}>
              <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedTeam?.name}
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setDetailActionOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Team Settings"
            >
              <MoreVertical size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.controlsBar}>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segmentBtn, detailTab === 'projects' && styles.segmentBtnActive]}
                onPress={() => setDetailTab('projects')}
              >
                <Text
                  style={[styles.segmentText, detailTab === 'projects' && styles.segmentTextActive]}
                >
                  Projects ({selectedTeam?.projects.length || 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, detailTab === 'members' && styles.segmentBtnActive]}
                onPress={() => setDetailTab('members')}
              >
                <Text
                  style={[styles.segmentText, detailTab === 'members' && styles.segmentTextActive]}
                >
                  Team Members ({selectedTeam?.members.length || 0})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {detailTab === 'projects' ? (
              selectedTeam?.projects.map((proj) => (
                <View key={proj.id} style={styles.projectCard}>
                  <View style={styles.teamCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.projectName}>{proj.name}</Text>
                      <Text style={styles.projectMeta}>
                        Client: {proj.client} • Priority: {proj.priority} • {proj.tasksCount} tasks
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.moreBtn}
                      onPress={() => setProjectActionTarget(proj)}
                    >
                      <MoreVertical size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${proj.progress}%`,
                            backgroundColor: proj.progress >= 100 ? '#16A34A' : '#2563EB',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{proj.progress}% Complete</Text>
                  </View>
                </View>
              ))
            ) : (
              <>
                <View style={styles.inviteMemberRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Invite teammate by name or email..."
                    value={inviteMemberName}
                    onChangeText={setInviteMemberName}
                  />
                  <TouchableOpacity style={styles.inviteBtn} onPress={handleAddMember}>
                    <UserPlus size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {selectedTeam?.members.map((m) => (
                  <View key={m.id} style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{m.name.slice(0, 2).toUpperCase()}</Text>
                      <View
                        style={[
                          styles.onlineDot,
                          { backgroundColor: m.online ? '#10B981' : '#94A3B8' },
                        ]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.openTeamName}>{m.name}</Text>
                      <Text style={styles.projectMeta}>{m.designation}</Text>
                    </View>
                    <View style={styles.rolePill}>
                      <Text style={styles.rolePillText}>{m.role}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          {/* Project List Open Action Sheet */}
          <Modal
            visible={!!projectActionTarget}
            animationType="fade"
            transparent
            onRequestClose={() => setProjectActionTarget(null)}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setProjectActionTarget(null)}
            >
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>{projectActionTarget?.name}</Text>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    setProjectActionTarget(null);
                    setSelectedTeamId(null);
                    navigation.navigate('TodoList');
                  }}
                >
                  <FolderKanban size={18} color="#4F46E5" />
                  <Text style={styles.actionRowText}>Open Project Tasks Board</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => projectActionTarget && handleBumpProjectProgress(projectActionTarget)}
                >
                  <CheckCircle2 size={18} color="#16A34A" />
                  <Text style={styles.actionRowText}>Advance Progress (+10%)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => projectActionTarget && handleArchiveProject(projectActionTarget)}
                >
                  <Archive size={18} color="#DC2626" />
                  <Text style={[styles.actionRowText, { color: '#DC2626' }]}>Archive Project</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Team Details Open Action Sheet */}
          <Modal
            visible={detailActionOpen}
            animationType="fade"
            transparent
            onRequestClose={() => setDetailActionOpen(false)}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setDetailActionOpen(false)}
            >
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Team Actions</Text>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    setDetailActionOpen(false);
                    setDetailTab('members');
                  }}
                >
                  <UserPlus size={18} color="#4F46E5" />
                  <Text style={styles.actionRowText}>Manage & Invite Members</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    setDetailActionOpen(false);
                    Alert.alert('Invite Code', `Team Code: ${selectedTeam?.inviteCode}`);
                  }}
                >
                  <Copy size={18} color="#0EA5E9" />
                  <Text style={styles.actionRowText}>Copy Team Invite Code</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </Modal>

      <AppBottomNav activeRoute="ManagerHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joinPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  joinPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  createPillBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 90,
  },
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamDesc: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  teamStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  miniAvatarText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4F46E5',
  },
  memberCountText: {
    fontSize: 11.5,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '600',
  },
  projectCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  projectCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  projectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  projectMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 7,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 5,
    textAlign: 'right',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#0F172A',
  },
  primaryFullBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryFullBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  openTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  openTeamName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  joinSmallBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  joinSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  inviteMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  inviteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  memberAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  rolePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
});
