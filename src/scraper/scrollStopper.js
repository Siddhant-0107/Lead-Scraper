export function shouldContinueScrolling(iteration, currentListingCount, previousListingCount, maxResults, maxScrollIterations) {
  if (iteration >= maxScrollIterations) return false;
  if (currentListingCount >= maxResults) return false;
  if (iteration > 0 && currentListingCount === previousListingCount) return false;
  return true;
}
