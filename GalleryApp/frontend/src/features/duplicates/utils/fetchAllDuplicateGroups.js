const DEFAULT_FETCH_PAGE_SIZE = 100;

export async function fetchAllDuplicateGroups({ listDuplicateGroups, pageSize = DEFAULT_FETCH_PAGE_SIZE }) {
  if (typeof listDuplicateGroups !== "function") {
    return [];
  }

  const firstResponse = await listDuplicateGroups({
    page: 1,
    pageSize
  });

  const firstItems = Array.isArray(firstResponse?.items) ? firstResponse.items : [];
  const totalPages = Number(firstResponse?.totalPages || 0);
  if (totalPages <= 1) {
    return firstItems;
  }

  const requests = [];
  for (let page = 2; page <= totalPages; page += 1) {
    requests.push(listDuplicateGroups({ page, pageSize }));
  }

  const responses = await Promise.all(requests);
  const remainingItems = responses.flatMap((response) => (Array.isArray(response?.items) ? response.items : []));
  return [...firstItems, ...remainingItems];
}
