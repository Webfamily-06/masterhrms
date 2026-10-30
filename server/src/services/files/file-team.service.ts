import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { OutboxService } from "../outbox.service";
import { NotificationService } from "../notification.service";
import { broadcastToTenant, broadcastToUser } from "../../socket";

const prisma = rawPrisma || proxiedPrisma;

export type TeamMemberRole = "MANAGER" | "CONTRIBUTOR" | "VIEWER";

export class FileTeamService {
  /**
   * Creates a new collaborative team and its associated team root folder.
   */
  public static async createTeam(options: {
    tenantId: string;
    name: string;
    description?: string;
    createdBy: string;
  }) {
    const { tenantId, name, description, createdBy } = options;
    if (!name || !name.trim()) {
      const err: any = new Error("Team name cannot be empty.");
      err.status = 400;
      throw err;
    }

    const team = await prisma.$transaction(async (tx) => {
      // 1. Create Team record
      const newTeam = await tx.fileTeam.create({
        data: {
          tenantId,
          name: name.trim(),
          description: description?.trim() || null,
          createdBy,
        },
      });

      // 2. Create dedicated team root folder
      const rootFolder = await tx.mediaFile.create({
        data: {
          tenantId,
          fileName: name.trim(),
          isFolder: true,
          type: "FOLDER",
          category: "Team",
          ownerType: "TEAM",
          ownerId: newTeam.id,
          folder: "team",
          uploadedBy: createdBy,
          materializedPath: "/",
          depth: 0,
          fileSize: 0,
          mimeType: "inode/directory",
          checksumSha: "",
          filePath: "",
          url: "",
        },
      });

      // 3. Link rootFolderId to Team
      const updatedTeam = await tx.fileTeam.update({
        where: { id: newTeam.id },
        data: { rootFolderId: rootFolder.id },
      });

      // 4. Add creator as team MANAGER
      await tx.fileTeamMember.create({
        data: {
          teamId: updatedTeam.id,
          userId: createdBy,
          role: "MANAGER",
        },
      });

      // 5. Grant Team ACL on the root folder with inheritance
      await tx.fileAcl.create({
        data: {
          fileId: rootFolder.id,
          principalType: "TEAM",
          principalId: updatedTeam.id,
          permission: "MANAGER",
          inherit: true,
          createdBy,
        },
      });

      // 6. Outbox Event
      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "file:team:created",
          entityType: "FILE_TEAM",
          entityId: updatedTeam.id,
          actorId: createdBy,
          payload: {
            teamId: updatedTeam.id,
            name: updatedTeam.name,
            rootFolderId: rootFolder.id,
          },
        },
        tx
      );

      return { ...updatedTeam, rootFolder };
    });

    broadcastToTenant(tenantId, "file:team:created", {
      teamId: team.id,
      name: team.name,
    });

    return team;
  }

  /**
   * Lists teams for a tenant. If not an administrator, filters to teams the user belongs to.
   */
  public static async listTeams(options: {
    tenantId: string;
    userId: string;
    isSuper?: boolean;
    isAdmin?: boolean;
  }) {
    const { tenantId, userId, isSuper = false, isAdmin = false } = options;

    const whereClause: any = { tenantId };
    if (!isSuper && !isAdmin) {
      whereClause.members = {
        some: { userId },
      };
    }

    const teams = await prisma.fileTeam.findMany({
      where: whereClause,
      include: {
        members: {
          include: {
            team: false,
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Populate user profile info for members
    const allUserIds = Array.from(new Set(teams.flatMap((t) => t.members.map((m) => m.userId))));
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true, avatarUrl: true } },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return teams.map((team) => {
      const userMembership = team.members.find((m) => m.userId === userId);
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        rootFolderId: team.rootFolderId,
        memberCount: team._count.members,
        userRole: userMembership?.role || (isAdmin || isSuper ? "MANAGER" : null),
        createdAt: team.createdAt,
        members: team.members.map((m) => {
          const u = userMap.get(m.userId);
          return {
            userId: m.userId,
            role: m.role,
            name: u?.profile?.fullName || u?.email || "Unknown",
            email: u?.email,
            avatarUrl: u?.profile?.avatarUrl,
            joinedAt: m.createdAt,
          };
        }),
      };
    });
  }

  /**
   * Retrieves single team details with membership verification.
   */
  public static async getTeam(options: {
    teamId: string;
    tenantId: string;
    userId: string;
    isSuper?: boolean;
    isAdmin?: boolean;
  }) {
    const { teamId, tenantId, userId, isSuper = false, isAdmin = false } = options;

    const team = await prisma.fileTeam.findFirst({
      where: { id: teamId, tenantId },
      include: {
        members: true,
      },
    });

    if (!team) {
      const err: any = new Error("Team not found.");
      err.status = 404;
      throw err;
    }

    const isMember = team.members.some((m) => m.userId === userId);
    if (!isSuper && !isAdmin && !isMember) {
      const err: any = new Error("You do not have access to this team.");
      err.status = 403;
      throw err;
    }

    const userIds = team.members.map((m) => m.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        profile: { select: { fullName: true, avatarUrl: true } },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      id: team.id,
      name: team.name,
      description: team.description,
      rootFolderId: team.rootFolderId,
      createdAt: team.createdAt,
      members: team.members.map((m) => {
        const u = userMap.get(m.userId);
        return {
          userId: m.userId,
          role: m.role,
          name: u?.profile?.fullName || u?.email || "Unknown",
          email: u?.email,
          avatarUrl: u?.profile?.avatarUrl,
          joinedAt: m.createdAt,
        };
      }),
    };
  }

  /**
   * Adds or updates a member in a team.
   */
  public static async addMember(options: {
    teamId: string;
    tenantId: string;
    actorId: string;
    userId: string;
    role: TeamMemberRole;
    isSuper?: boolean;
    isAdmin?: boolean;
  }) {
    const { teamId, tenantId, actorId, userId, role, isSuper = false, isAdmin = false } = options;

    // 1. Verify actor is Team MANAGER or Tenant Admin
    const team = await prisma.fileTeam.findFirst({
      where: { id: teamId, tenantId },
      include: { members: true },
    });
    if (!team) {
      const err: any = new Error("Team not found.");
      err.status = 404;
      throw err;
    }

    const actorMembership = team.members.find((m) => m.userId === actorId);
    const canManage = isSuper || isAdmin || actorMembership?.role === "MANAGER";
    if (!canManage) {
      const err: any = new Error("Only team managers or administrators can add team members.");
      err.status = 403;
      throw err;
    }

    // 2. Validate user belongs to the tenant
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        profile: { tenantId },
      },
    });
    if (!targetUser) {
      const err: any = new Error("User does not exist in this organization.");
      err.status = 400;
      throw err;
    }

    // 3. Upsert member
    const member = await prisma.fileTeamMember.upsert({
      where: {
        teamId_userId: { teamId, userId },
      },
      create: {
        teamId,
        userId,
        role,
      },
      update: {
        role,
      },
    });

    // 4. Outbox & Notification
    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "file:team:member_added",
      entityType: "FILE_TEAM_MEMBER",
      entityId: `${teamId}:${userId}`,
      actorId,
      payload: { teamId, userId, role },
    });

    try {
      await NotificationService.createNotification({
        tenantId,
        userId,
        title: "Added to team folder",
        message: `You were added to team "${team.name}" as ${role}.`,
        type: "TEAM_ADDED",
        actionUrl: `/me/files`,
      });
    } catch {}

    broadcastToTenant(tenantId, "file:team:updated", { teamId, userId, role });

    return member;
  }

  /**
   * Removes a member from a team.
   */
  public static async removeMember(options: {
    teamId: string;
    tenantId: string;
    actorId: string;
    userId: string;
    isSuper?: boolean;
    isAdmin?: boolean;
  }) {
    const { teamId, tenantId, actorId, userId, isSuper = false, isAdmin = false } = options;

    const team = await prisma.fileTeam.findFirst({
      where: { id: teamId, tenantId },
      include: { members: true },
    });
    if (!team) {
      const err: any = new Error("Team not found.");
      err.status = 404;
      throw err;
    }

    const actorMembership = team.members.find((m) => m.userId === actorId);
    const canManage = isSuper || isAdmin || actorMembership?.role === "MANAGER" || actorId === userId;
    if (!canManage) {
      const err: any = new Error("Only team managers can remove members.");
      err.status = 403;
      throw err;
    }

    // Check if removing the sole manager
    if (actorMembership?.role === "MANAGER" && actorId === userId) {
      const managerCount = team.members.filter((m) => m.role === "MANAGER").length;
      if (managerCount <= 1 && team.members.length > 1) {
        const err: any = new Error("Please designate another team manager before leaving the team.");
        err.status = 400;
        throw err;
      }
    }

    await prisma.fileTeamMember.deleteMany({
      where: { teamId, userId },
    });

    await OutboxService.createOutboxEvent({
      tenantId,
      eventType: "file:team:member_removed",
      entityType: "FILE_TEAM_MEMBER",
      entityId: `${teamId}:${userId}`,
      actorId,
      payload: { teamId, userId },
    });

    broadcastToTenant(tenantId, "file:team:updated", { teamId, userId, action: "removed" });

    return { success: true, teamId, userId };
  }

  /**
   * Deletes a team safely without purging underlying files and folders.
   */
  public static async deleteTeam(options: {
    teamId: string;
    tenantId: string;
    actorId: string;
    isSuper?: boolean;
    isAdmin?: boolean;
  }) {
    const { teamId, tenantId, actorId, isSuper = false, isAdmin = false } = options;

    const team = await prisma.fileTeam.findFirst({
      where: { id: teamId, tenantId },
      include: { members: true },
    });
    if (!team) {
      const err: any = new Error("Team not found.");
      err.status = 404;
      throw err;
    }

    const actorMembership = team.members.find((m) => m.userId === actorId);
    const canDelete = isSuper || isAdmin || actorMembership?.role === "MANAGER";
    if (!canDelete) {
      const err: any = new Error("Only team managers or administrators can delete a team.");
      err.status = 403;
      throw err;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete team memberships
      await tx.fileTeamMember.deleteMany({ where: { teamId } });

      // 2. Remove Team ACL grants
      await tx.fileAcl.deleteMany({
        where: { principalType: "TEAM", principalId: teamId },
      });

      // 3. Preserve root folder: transfer ownership to actor so files are never deleted!
      if (team.rootFolderId) {
        await tx.mediaFile.update({
          where: { id: team.rootFolderId },
          data: {
            ownerType: "USER",
            ownerId: actorId,
            category: "Documents",
          },
        });
      }

      // 4. Delete FileTeam record
      await tx.fileTeam.delete({ where: { id: teamId } });

      // 5. Outbox Event
      await OutboxService.createOutboxEvent(
        {
          tenantId,
          eventType: "file:team:deleted",
          entityType: "FILE_TEAM",
          entityId: teamId,
          actorId,
          payload: { teamId, rootFolderId: team.rootFolderId },
        },
        tx
      );
    });

    broadcastToTenant(tenantId, "file:team:deleted", { teamId });

    return { success: true, teamId };
  }
}

