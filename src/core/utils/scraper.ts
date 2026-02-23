import { delay } from './time';
import { yellow } from './console';

export interface ApiError extends Error {
  code?: string;
  response?: {
    status?: number;
    statusText?: string;
  };
}

/**
 * Handles pagination for scraper requests
 * @param fetchFunction Function to fetch data for a specific page
 * @param processFunction Function to process the fetched data
 * @param config Configuration for pagination
 * @returns The accumulated data from all pages
 */
export async function handlePagination<T, R>(
  fetchFunction: (offset: number) => Promise<T>,
  processFunction: (data: T) => R[],
  config: {
    limit: number;
    delayBetweenRequests: number;
    maxEmptyResponses: number;
    retryAttempts: number;
    retryDelay: number;
  }
): Promise<R[]> {
  const allData: R[] = [];
  let offset = 0;
  let hasMoreData = true;
  const { delayBetweenRequests, limit, maxEmptyResponses, retryAttempts, retryDelay } = config;
  let emptyResponseCount = 0;

  console.log('\nStarting data fetch...');

  while (hasMoreData) {
    console.log(`\nBatch ${offset / limit + 1}: Fetching data (offset: ${offset})...`);

    let attempts = 0;
    let success = false;
    let batchData: R[] = [];

    while (attempts < retryAttempts && !success) {
      const startTime = Date.now();
      try {
        console.log(`\nAttempt ${attempts + 1}: Initiating request...`);

        const response = await fetchFunction(offset);
        const requestTime = Date.now() - startTime;
        console.log(`Request completed in ${requestTime}ms`);

        batchData = processFunction(response);
        console.log('Total rows received:', yellow(batchData.length));

        if (batchData.length === 0) {
          console.log('No data found in this batch');
          emptyResponseCount++;

          if (emptyResponseCount >= maxEmptyResponses) {
            console.log(`Received ${emptyResponseCount} empty responses. Stopping pagination.`);
            hasMoreData = false;
            break;
          }

          offset += limit;
          success = true;
          continue;
        }

        emptyResponseCount = 0; // Reset empty response counter
        allData.push(...batchData);

        // Check if we got a full page of results
        const processedItems = Math.min(batchData.length, limit);
        hasMoreData = processedItems === limit;

        offset += processedItems;
        success = true;

        // Log the cumulative count
        console.log('Cumulative total:', yellow(allData.length));
      } catch (error) {
        const apiError = error as ApiError;
        attempts++;
        console.error(
          `Error fetching data (attempt ${attempts}/${retryAttempts}):`,
          apiError.message || apiError
        );

        if (apiError.code === 'ECONNRESET' || apiError.response?.status === 429) {
          console.log(`Connection reset or rate limited. Waiting ${retryDelay}ms before retry...`);
          await delay(retryDelay);
        } else if (attempts < retryAttempts) {
          console.log(`Waiting ${retryDelay}ms before retry...`);
          await delay(retryDelay);
        } else {
          console.error('Max retry attempts reached. Stopping pagination.');
          hasMoreData = false;
          break;
        }
      }
    }

    if (hasMoreData && delayBetweenRequests > 0) {
      console.log(`Waiting ${delayBetweenRequests}ms before next batch...`);
      await delay(delayBetweenRequests);
    }
  }

  console.log(`\nFetch complete. Total items: ${yellow(allData.length)}`);
  return allData;
}

/**
 * Creates a URLSearchParams object for pagination
 * @param baseParams Base parameters for the request
 * @param offset Current offset for pagination
 * @returns URLSearchParams object as a string
 */
export function createPaginationParams(baseParams: Record<string, string>, offset: number): string {
  return new URLSearchParams({
    ...baseParams,
    ...(offset > 0
      ? {
          limit_start: offset.toString(),
          loadmore: 'Y'
        }
      : {})
  }).toString();
}

/**
 * Common headers for scraper requests
 */
export const commonHeaders = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  'Cache-Control': 'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Mode': 'navigate'
};
