import { beforeAll, afterAll, afterEach } from '@jest/globals';
import nock from 'nock';

// Disable real HTTP requests during tests
beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

// Clear all mocks between tests
afterEach(() => {
  nock.cleanAll();
});
