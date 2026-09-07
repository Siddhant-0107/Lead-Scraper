export function shouldContinueScrolling(iteration, currentListingCount, previousListingCount, maxResults, maxScrollIterations, stagnantIterations = 0) {
  if (iteration >= maxScrollIterations) return false;
  if (currentListingCount >= maxResults) return false;
  if (iteration > 0 && stagnantIterations >= 3) return false;
  return true;
}
