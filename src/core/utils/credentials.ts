import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';
import { Credentials } from '../auth/types';

const execPromise = promisify(exec);

interface OnePasswordField {
  purpose: string;
  value: string;
}

interface _OnePasswordResponse {
  fields: OnePasswordField[];
}

export class CredentialManager {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private async question(query: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(query, resolve);
    });
  }

  async getCredentials(): Promise<Credentials> {
    try {
      console.log('Fetching credentials from 1Password...');
      const { stdout: credentials } = await execPromise(
        'op item get "Who\'s the umpire" --format json'
      );
      const credentialsJson = JSON.parse(credentials);

      if (!credentialsJson?.fields) {
        throw new Error('Unexpected 1Password response format');
      }

      const email = credentialsJson.fields.find(
        (f: OnePasswordField) => f.purpose === 'USERNAME'
      )?.value;
      const password = credentialsJson.fields.find(
        (f: OnePasswordField) => f.purpose === 'PASSWORD'
      )?.value;

      if (!email || !password) {
        throw new Error('Credentials not found in 1Password');
      }

      console.log('Successfully retrieved credentials from 1Password');
      return { email, password };
    } catch (error) {
      console.error('1Password error details:', error);
      console.log('Could not fetch from 1Password, falling back to manual input...');

      const email = await this.question('Enter your email: ');
      const password = await this.question('Enter your password: ');

      return { email, password };
    }
  }

  close(): void {
    this.rl.close();
  }
}
