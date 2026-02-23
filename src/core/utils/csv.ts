import { createHash } from 'crypto';
import { createWriteStream } from 'fs';

export interface CsvWriterOptions {
  generateId?: boolean;
  idFields?: string[];
  chunkSize?: number;
}

// Add type for the record
type CsvRecord = {
  [key: string]: string | number;
};

export class CsvWriter {
  private static readonly DEFAULT_CHUNK_SIZE = 1000;

  private generateHash(item: CsvRecord, fields: string[]): string {
    const str = fields.map((field) => item[field]).join('-');
    return createHash('md5').update(str).digest('hex');
  }

  async writeToFile<T extends Record<string, string | number>>(
    data: T[],
    filename: string,
    options: CsvWriterOptions = {
      generateId: true,
      chunkSize: CsvWriter.DEFAULT_CHUNK_SIZE
    }
  ): Promise<void> {
    if (data.length === 0) {
      throw new Error('No data to save');
    }

    const writeStream = createWriteStream(filename);
    const seen = new Map<string, T>();
    let duplicateCount = 0;
    const initialCount = data.length;

    // Process data in memory-efficient chunks
    for (let i = 0; i < data.length; i += options.chunkSize!) {
      const chunk = data.slice(i, i + options.chunkSize!);

      chunk.forEach((item) => {
        if (!options.generateId) {
          seen.set(JSON.stringify(item), item);
          return;
        }

        const id = this.generateHash(item, options.idFields || Object.keys(item));

        if (seen.has(id)) {
          duplicateCount++;
          this.logDuplicate(seen.get(id)!, item);
        } else {
          seen.set(id, item);
        }
      });
    }

    const uniqueData = Array.from(seen.values()).map((item) => ({
      ID: options.generateId
        ? this.generateHash(item, options.idFields || Object.keys(item))
        : null,
      ...item
    }));

    if (duplicateCount > 0) {
      console.log(`Found ${initialCount} total appointments`);
      console.log(`Removed ${duplicateCount} duplicate entries`);
      console.log(`Saving ${uniqueData.length} unique appointments`);
    }

    // Add null check before accessing data
    if (!uniqueData || uniqueData.length === 0) {
      console.log('No data to write to CSV');
      return;
    }

    // Write headers
    const headers = Object.keys(uniqueData[0]).join(',') + '\n';
    writeStream.write(headers);

    // Write data in chunks
    for (let i = 0; i < uniqueData.length; i += options.chunkSize!) {
      const chunk = uniqueData.slice(i, i + options.chunkSize!);
      const rows =
        chunk
          .map((row) =>
            Object.values(row)
              .map((value) => `"${value}"`)
              .join(',')
          )
          .join('\n') + '\n';

      writeStream.write(rows);
    }

    writeStream.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  private logDuplicate(
    _original: Record<string, string | number>,
    _duplicate: Record<string, string | number>
  ): void {
    // console.log('  Original:', this.formatLogEntry(original));
    // console.log('  Duplicate:', this.formatLogEntry(duplicate));
  }

  private formatLogEntry(item: Record<string, string | number>): string {
    return Object.entries(item)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }
}
