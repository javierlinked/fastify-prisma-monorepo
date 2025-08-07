export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Creates a standardized paginated response structure
 * @param items - Array of items for the current page
 * @param total - Total number of items across all pages
 * @param page - Current page number
 * @param limit - Number of items per page
 * @returns Standardized pagination response with metadata
 */
export function paginateResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
