const DEFAULT_FETCH_PAGE_SIZE = 200;

export async function fetchAllMediaItems({ listMedia, search, pageSize = DEFAULT_FETCH_PAGE_SIZE }) {
  if (typeof listMedia !== "function") {
    return [];
  }

  const firstResponse = await listMedia({
    page: 1,
    pageSize,
    search: search || undefined
  });

  const firstItems = Array.isArray(firstResponse?.items) ? firstResponse.items : [];
  const totalPages = Number(firstResponse?.totalPages || 0);
  if (totalPages <= 1) {
    return firstItems;
  }

  const requests = [];
  for (let page = 2; page <= totalPages; page += 1) {
    requests.push(listMedia({
      page,
      pageSize,
      search: search || undefined
    }));
  }

  const responses = await Promise.all(requests);
  const remainingItems = responses.flatMap((response) => (Array.isArray(response?.items) ? response.items : []));
  return [...firstItems, ...remainingItems];
}
