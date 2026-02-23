import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CsvWriter } from '../../core/utils/csv';
import { createWriteStream } from 'fs';

interface MockWriteStream {
  write: jest.Mock;
  end: jest.Mock;
  on: jest.Mock;
}

jest.mock('fs/promises');
jest.mock('fs', () => ({
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn((event: string, cb: () => void) => {
      if (event === 'finish') cb();
      return this;
    })
  }))
}));

describe('CsvWriter', () => {
  let csvWriter: CsvWriter;

  beforeEach(() => {
    csvWriter = new CsvWriter();
  });

  it('should handle empty data array', async () => {
    await expect(csvWriter.writeToFile([], 'test.csv')).rejects.toThrow('No data to save');
  });

  it('should detect and remove duplicates', async () => {
    const data = [
      { id: 1, name: 'Test 1' },
      { id: 1, name: 'Test 1' }, // Duplicate
      { id: 2, name: 'Test 2' }
    ];

    await csvWriter.writeToFile(data, 'test.csv');

    const writeStream = createWriteStream as jest.Mock;
    expect(writeStream).toHaveBeenCalledWith('test.csv');

    const mockStream = writeStream.mock.results[0].value as MockWriteStream;
    expect(mockStream.write).toHaveBeenCalledTimes(2); // Headers + one data chunk
  });
});
