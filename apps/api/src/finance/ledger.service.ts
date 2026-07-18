import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateLedgerCategoryInput,
  CreateLedgerEntryInput,
  LedgerEntryType,
  UpdateLedgerCategoryInput,
  UpdateLedgerEntryInput,
} from '@cyberpedia/shared';
import { PrismaService } from '../prisma/prisma.service';

const entryInclude = {
  category: { select: { id: true, name: true, type: true } },
  currency: { select: { code: true, symbol: true, decimals: true } },
  createdBy: { select: { id: true, name: true } },
};

export interface LedgerEntryFilters {
  type?: LedgerEntryType;
  categoryId?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Categories ---

  findCategories() {
    return this.prisma.ledgerCategory.findMany({
      include: { _count: { select: { entries: true } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(input: CreateLedgerCategoryInput) {
    await this.ensureCategoryNameAvailable(input.name);
    return this.prisma.ledgerCategory.create({ data: input });
  }

  async updateCategory(id: string, input: UpdateLedgerCategoryInput) {
    const category = await this.prisma.ledgerCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (input.name && input.name !== category.name) {
      await this.ensureCategoryNameAvailable(input.name);
    }
    return this.prisma.ledgerCategory.update({ where: { id }, data: input });
  }

  // --- Entries ---

  findEntries(filters: LedgerEntryFilters) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.from || filters.to
          ? {
              date: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: entryInclude,
      orderBy: { date: 'desc' },
      take: 300,
    });
  }

  async createEntry(input: CreateLedgerEntryInput, currentUserId: string) {
    const category = await this.getUsableCategory(input.categoryId);
    const currency = await this.getUsableCurrency(input.currencyCode);

    return this.prisma.ledgerEntry.create({
      data: {
        type: category.type,
        categoryId: category.id,
        amountMinor: input.amountMinor,
        currencyCode: currency.code,
        ratePerBase: currency.ratePerBase,
        date: input.date ?? new Date(),
        note: input.note,
        createdById: currentUserId,
      },
      include: entryInclude,
    });
  }

  async updateEntry(id: string, input: UpdateLedgerEntryInput) {
    const entry = await this.prisma.ledgerEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Ledger entry not found');
    }

    let type = entry.type;
    if (input.categoryId && input.categoryId !== entry.categoryId) {
      const category = await this.getUsableCategory(input.categoryId);
      type = category.type;
    }

    let ratePerBase = undefined;
    if (input.currencyCode && input.currencyCode !== entry.currencyCode) {
      const currency = await this.getUsableCurrency(input.currencyCode);
      ratePerBase = currency.ratePerBase;
    }

    return this.prisma.ledgerEntry.update({
      where: { id },
      data: {
        ...input,
        type,
        ...(ratePerBase !== undefined ? { ratePerBase } : {}),
      },
      include: entryInclude,
    });
  }

  async deleteEntry(id: string) {
    const entry = await this.prisma.ledgerEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Ledger entry not found');
    }
    await this.prisma.ledgerEntry.delete({ where: { id } });
  }

  // --- helpers ---

  private async ensureCategoryNameAvailable(name: string) {
    const existing = await this.prisma.ledgerCategory.findUnique({
      where: { name },
    });
    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }
  }

  private async getUsableCategory(id: string) {
    const category = await this.prisma.ledgerCategory.findUnique({
      where: { id },
    });
    if (!category || !category.isActive) {
      throw new BadRequestException('Unknown or inactive category');
    }
    return category;
  }

  private async getUsableCurrency(code: string) {
    const currency = await this.prisma.currency.findUnique({ where: { code } });
    if (!currency || !currency.isActive) {
      throw new BadRequestException('Unknown or inactive currency');
    }
    return currency;
  }
}
