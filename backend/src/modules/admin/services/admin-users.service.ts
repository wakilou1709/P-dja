import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetUsersDto, UpdateUserRoleDto, UpdateUserStatusDto } from '../dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async findAllWithFilters(filters: GetUsersDto) {
    const { page = 1, limit = 10, search, role, status } = filters;
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subscription: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Remove password from response
    const sanitizedUsers = users.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return {
      users: sanitizedUsers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserStats() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      studentCount,
      adminCount,
      moderatorCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth,
          },
        },
      }),
      this.prisma.user.count({
        where: { role: UserRole.STUDENT },
      }),
      this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      }),
      this.prisma.user.count({
        where: { role: UserRole.MODERATOR },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      byRole: {
        students: studentCount,
        admins: adminCount,
        moderators: moderatorCount,
      },
    };
  }

  async getUserDetails(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUserRole(id: string, dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      include: {
        subscription: true,
      },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async updateUserStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Validate status is a valid AccountStatus enum value
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'DELETED'];
    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException(`Invalid status: ${dto.status}`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status as any },
      include: {
        subscription: true,
      },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async getUserActivity(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Get user's quiz attempts and subscription history
    const [quizAttempts, transactions] = await Promise.all([
      this.prisma.quizAttempt.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          quiz: true,
        },
      }),
      this.prisma.transaction.findMany({
        where: {
          subscription: {
            userId: id,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      quizAttempts,
      transactions,
    };
  }
}
