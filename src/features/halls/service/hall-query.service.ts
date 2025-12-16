import { AppDataSource } from "../../../config/database";
import { HallService } from "./hall.service";
import { MediaService } from "../../media/service/media.service";
import { HallStatus } from "../model/hall-status.enum";
import { Hall } from "../model/hall.entity";
import {
  PublicHallCardDTO,
  PublicHallDetailDTO,
  PublicHallProductDTO,
  PublicHallRateDTO,
  PublicHallAddonDTO,
  HallSearchFilters,
} from "../interfaces/hall.interface";
import { MediaType } from "../../media/model/media-type.enum";
import { NotFoundError } from "../../../core/errors/AppError";
import { PricingService } from "../../pricing/service/pricing.service";
import {
  HallProductDTO,
  HallProductRateDTO,
  HallAddonDTO,
} from "../../pricing/interfaces/pricing.interface";
import { HallProduct } from "../../pricing/model/hall-product.entity";
import { HallProductRate } from "../../pricing/model/hall-product-rate.entity";

/**
 * HallQueryService
 *
 * Read-side service that composes data from:
 * - HallService
 * - MediaService
 *
 * to produce:
 * - PublicHallCardDTO for the hall list
 * - PublicHallDetailDTO for the hall detail page
 *
 * It is intentionally separate from HallService so that
 * HallService stays focused on core Hall business logic.
 */
export class HallQueryService {
  private readonly hallService: HallService;
  private readonly mediaService: MediaService;
  private readonly pricingService: PricingService;

  constructor() {
    this.hallService = new HallService();
    this.mediaService = new MediaService();
    this.pricingService = new PricingService();
  }

  /**
   * Search/list public halls with filters (Airbnb-style).
   *
   * Supports (already wired in controller):
   *  - q?: string               // keyword on hall name/city/description + product name
   *  - city?: string
   *  - eventType?: string       // WEDDING, CIVIL, MEETING, CONCERT, OTHER
   *  - date?: string            // YYYY-MM-DD (basic availability via HallBlockedDate)
   *  - capacityMin?: number
   *  - capacityMax?: number
   *  - priceMin?: number        // on "starting from" price
   *  - priceMax?: number
   *  - isPremium?: boolean
   *  - features?: string[]      // TODO: can be wired to HallFeature via EXISTS subquery
   *  - sortBy?: HallSortBy
   *  - page, limit
   *
   * NOTE:
   *  - We are using a single QueryBuilder with GROUP BY and MIN(rate.price)
   *    to get both filtering and "startingFromPrice".
   *  - For very large datasets, you'll eventually want a denormalized
   *    `halls.starting_from_price` or a materialized view, but this is
   *    perfectly fine and clean for v1.
   */
  async getPublicHallList(filters: HallSearchFilters): Promise<{
    data: PublicHallCardDTO[];
    page: number;
    limit: number;
    total: number;
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const hallRepo = AppDataSource.getRepository(Hall);

    // Base query: ACTIVE halls only
    const qb = hallRepo
      .createQueryBuilder("h")
      .where("h.status = :status", { status: HallStatus.ACTIVE });

    // ---------------------------------------------------
    // Joins for products & rates to compute min price
    // ---------------------------------------------------
    qb.leftJoin(HallProduct, "hp", "hp.hall_id = h.id AND hp.isActive = true");
    qb.leftJoin(HallProductRate, "hpr", "hpr.hall_product_id = hp.id");

    // We select the hall + the minimum price & a "main" currency
    qb.select("h");
    qb.addSelect("MIN(hpr.price)", "min_price");
    qb.addSelect("MIN(hpr.currency)", "min_currency");

    // ---------------------------------------------------
    // Apply filters
    // ---------------------------------------------------

    // City
    if (filters.city) {
      qb.andWhere("h.city = :city", { city: filters.city });
    }

    // Premium
    if (filters.isPremium !== undefined) {
      qb.andWhere("h.isPremium = :isPremium", {
        isPremium: filters.isPremium,
      });
    }

    // Capacity
    if (filters.capacityMin !== undefined) {
      qb.andWhere("h.capacity >= :capMin", {
        capMin: filters.capacityMin,
      });
    }

    if (filters.capacityMax !== undefined) {
      qb.andWhere("h.capacity <= :capMax", {
        capMax: filters.capacityMax,
      });
    }

    // Keyword search (basic version: ILIKE)
    if (filters.q) {
      const q = `%${filters.q}%`;
      qb.andWhere(
        `(h.name ILIKE :q OR h.city ILIKE :q OR h.description ILIKE :q OR hp.name ILIKE :q)`,
        { q }
      );
    }

    // Event type (via HallProduct.category)
    if (filters.eventType) {
      qb.andWhere("hp.category = :eventType", {
        eventType: filters.eventType,
      });
    }

    // Date availability (basic: no HallBlockedDate overlapping that date)
    if (filters.date) {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM hall_blocked_dates hbd
          WHERE hbd.hall_id = h.id
            AND hbd.start_date <= :date
            AND (hbd.end_date IS NULL OR hbd.end_date >= :date)
        )`,
        { date: filters.date }
      );
      // Later, we also add a NOT EXISTS on bookings here.
    }

    // Price range on "starting from" price
    // We use HAVING because we group by hall and compute MIN(hpr.price).
    if (filters.priceMin !== undefined) {
      qb.having("MIN(hpr.price) >= :priceMin", {
        priceMin: filters.priceMin,
      });
    }

    if (filters.priceMax !== undefined) {
      qb.andHaving("MIN(hpr.price) <= :priceMax", {
        priceMax: filters.priceMax,
      });
    }

    // TODO (optional): Features filter using EXISTS on hall_features/hall_feature_types
    // if (filters.features && filters.features.length > 0) {
    //   qb.andWhere(
    //     `EXISTS (
    //        SELECT 1
    //        FROM hall_features hf
    //        JOIN hall_feature_types hft ON hft.id = hf.feature_type_id
    //        WHERE hf.hall_id = h.id
    //          AND hft.name IN (:...featureNames)
    //      )`,
    //     { featureNames: filters.features }
    //   );
    // }

    // ---------------------------------------------------
    // Group by hall.id for MIN(price)
    // ---------------------------------------------------
    qb.groupBy("h.id");

    // ---------------------------------------------------
    // Sorting
    // ---------------------------------------------------
    const sortBy = filters.sortBy ?? "featured";

    switch (sortBy) {
      case "price_asc":
        // Halls without price will have NULL; they'll naturally go last or first
        qb.orderBy("min_price", "ASC", "NULLS LAST");
        break;

      case "price_desc":
        qb.orderBy("min_price", "DESC", "NULLS LAST");
        break;

      case "capacity_desc":
        qb.orderBy("h.capacity", "DESC", "NULLS LAST");
        break;

      case "relevance":
        // For now, "relevance" is approximated as:
        //  - premium first
        //  - then lower starting price
        //  - then newest
        qb.orderBy("h.isPremium", "DESC")
          .addOrderBy("min_price", "ASC", "NULLS LAST")
          .addOrderBy("h.createdAt", "DESC");
        break;

      case "featured":
      default:
        qb.orderBy("h.isPremium", "DESC").addOrderBy("h.createdAt", "DESC");
        break;
    }

    // ---------------------------------------------------
    // Pagination: count total then fetch page with raw+entities
    // ---------------------------------------------------

    // Clone for count (without pagination)
    const countQb = qb.clone();
    const total = await countQb.getCount(); // counts grouped halls

    // Apply pagination to main query
    qb.skip(offset).take(limit);

    const { entities: halls, raw } = await qb.getRawAndEntities();

    // ---------------------------------------------------
    // Map to PublicHallCardDTO (with hero image and min price)
    // ---------------------------------------------------
    const data: PublicHallCardDTO[] = [];

    for (let i = 0; i < halls.length; i++) {
      const hall = halls[i];
      const row = raw[i] as any;

      // Safety guard for TypeScript (and weird cases)
      if (!hall) {
        continue;
      }

      const minPriceStr = row["min_price"] as string | null | undefined;
      const minCurrency = row["min_currency"] as string | null | undefined;

      const startingFromPrice =
        minPriceStr !== null && minPriceStr !== undefined
          ? Number(minPriceStr)
          : null;

      const startingFromCurrency =
        startingFromPrice !== null ? minCurrency ?? null : null;

      // HERO image (still through MediaService)
      const hero = await this.mediaService.getPrimaryMediaForHall({
        hallId: hall.id,
        tagName: "HERO",
      });

      data.push({
        id: hall.id,
        name: hall.name,
        slug: hall.slug,
        city: hall.city,
        capacity: hall.capacity,
        isPremium: hall.isPremium,
        heroImageUrl: hero ? hero.fileUrl : null,
        startingFromPrice,
        startingFromCurrency,
      });
    }

    return {
      data,
      page,
      limit,
      total,
    };
  }

  /**
   * Public hall detail by slug.
   *
   * - Loads hall by slug (must be ACTIVE)
   * - Loads HERO image
   * - Loads full image gallery
   */
  async getPublicHallDetail(slug: string): Promise<PublicHallDetailDTO> {
    // 1) Get hall by slug
    const hall = await this.hallService.getHallBySlug(slug);

    // Only allow ACTIVE halls to be shown publicly
    if (hall.status !== HallStatus.ACTIVE) {
      throw new NotFoundError("Hall not found");
    }

    // 2) Get hero image
    const hero = await this.mediaService.getPrimaryMediaForHall({
      hallId: hall.id,
      tagName: "HERO",
    });

    // 3) Get gallery (for now: all IMAGE media)
    const gallery = await this.mediaService.listMediaForHall({
      hallId: hall.id,
      mediaType: MediaType.IMAGE,
    });

    // 4) Get active products for this hall
    const productDTOs: HallProductDTO[] =
      await this.pricingService.getActiveProductsForHall(hall.id);

    const publicProducts: PublicHallProductDTO[] = [];

    for (const product of productDTOs) {
      const rateDTOs: HallProductRateDTO[] =
        await this.pricingService.listHallProductRates(product.id);

      const publicRates: PublicHallRateDTO[] = rateDTOs.map((r) => ({
        id: r.id,
        label: r.label,
        currency: r.currency,
        price: r.price,
        billingUnit: r.billingUnit,
        minHours: r.minHours,
        maxHours: r.maxHours,
        extraUnitPrice: r.extraUnitPrice,
        dayOfWeekMask: r.dayOfWeekMask,
        seasonStart: r.seasonStart,
        seasonEnd: r.seasonEnd,
        isDefault: r.isDefault,
      }));

      publicProducts.push({
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        isPrimary: product.isPrimary,
        rates: publicRates,
      });
    }

    // 5) Get active addons for this hall
    const addonDTOs: HallAddonDTO[] = await this.pricingService.listHallAddons({
      hallId: hall.id,
      isActive: true,
    });

    const publicAddons: PublicHallAddonDTO[] = addonDTOs.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      pricingModel: a.pricingModel,
      currency: a.currency,
      unitPrice: a.unitPrice,
      packSize: a.packSize,
      isActive: a.isActive,
    }));

    // 6) Compose final DTO
    return {
      id: hall.id,
      name: hall.name,
      slug: hall.slug,
      address: hall.address,
      city: hall.city,
      capacity: hall.capacity,
      description: hall.description,
      cancellationPolicy: hall.cancellationPolicy,
      isPremium: hall.isPremium,
      heroImageUrl: hero ? hero.fileUrl : null,
      gallery,
      products: publicProducts,
      addons: publicAddons,
    };
  }
}
