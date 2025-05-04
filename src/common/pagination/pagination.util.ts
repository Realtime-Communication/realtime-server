
// export function genPaginationResponse<T extends { id: number }>({
//   items,
//   query,
//   total,
// }: {
//   items: T[];
//   query: PaginationQueryDto;
//   total: number;
// }): [
//   T[],
//   {
//     total: number;
//     limit: number;
//     next_page: number | null;
//     next_cursor: number | null;
//   },
// ] {
//   const parsedPagination = parsePaginationQuery(query);
//   const hasNext = items.length > parsedPagination.limit;

//   return [
//     items.slice(0, parsedPagination.limit),
//     {
//       total,
//       limit: parsedPagination.limit,
//       next_page:
//         !parsedPagination.cursor && hasNext ? parsedPagination.page + 1 : null,
//       next_cursor: hasNext
//         ? items[items.length - 1 - 1].id
//         : null,
//     },
//   ];
// }

// export function genPaginationParams<T extends Record<string, any>>(
//   paginationQuery: PaginationQueryDto,
//   conditions = {} as T,
// ) {
//   const parsedPagination = parsePaginationQuery(paginationQuery);

//   const searchOrderOptions = {
//     orderBy: Object.fromEntries(
//       parsedPagination.sort.map((sort) => [sort.field, sort.by]),
//     ),
//     where: {
//       AND: [
//         parsedPagination.search.length
//           ? {
//               OR: parsedPagination.search.map((search) => ({
//                 [search.field]: {
//                   contains: search.value,
//                 },
//               })),
//             }
//           : {},
//         conditions,
//       ],
//     },
//   };

//   if (parsedPagination.cursor) {
//     return {
//       take: parsedPagination.limit + 1,
//       skip: 1,
//       cursor: {
//         id: parsedPagination.cursor,
//       },
//       ...searchOrderOptions,
//     };
//   } else {
//     return {
//       take: parsedPagination.limit + 1,
//       skip: (parsedPagination.page - 1) * parsedPagination.limit,
//       ...searchOrderOptions,
//     };
//   }
// }

// export function parsePaginationQuery(pagination: PaginationQueryDto): {
//   page: number;
//   cursor?: number;
//   limit: number;
//   sort: { field: string; by: 'asc' | 'desc' }[];
//   search: { field: string; value: string }[];
// } {
//   return {
//     page: pagination.page,
//     cursor: pagination.cursor,
//     limit: pagination.limit,
//     sort: pagination.sort
//       ? pagination.sort.split(',').map((sortItem) => {
//           const sortBy = sortItem[0];
//           switch (sortBy) {
//             case '-':
//               return {
//                 field: sortItem.slice(1),
//                 by: 'asc',
//               };
//             case '+':
//               return {
//                 field: sortItem.slice(1),
//                 by: 'asc',
//               };
//             default:
//               return {
//                 field: sortItem.trim(),
//                 by: 'desc',
//               };
//           }
//         })
//       : [],
//     search: pagination.search
//       ? pagination.search.split(',').map((searchItem) => {
//           const field = searchItem.split(':')[0];
//           const value = searchItem.split(':')[1];
//           return {
//             field,
//             value,
//           };
//         })
//       : [],
//   };
// }
