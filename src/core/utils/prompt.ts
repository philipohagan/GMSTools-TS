import * as readline from 'readline';

/**
 * Interface for an option in a selection list
 */
export interface SelectionOption<T> {
  /**
   * The display name of the option
   */
  name: string;

  /**
   * The value of the option
   */
  value: T;
}

/**
 * Prompts the user to select an option from a list
 * @param rl The readline interface to use for prompting
 * @param options The options to select from
 * @param prompt The prompt to display
 * @param defaultIndex The default index to select (1-based)
 * @returns The selected option value
 */
export async function selectFromList<T>(
  rl: readline.Interface,
  options: SelectionOption<T>[],
  prompt: string,
  defaultIndex = 1
): Promise<T> {
  // Display options
  options.forEach((option, index) => {
    console.log(`${index + 1}. ${option.name}`);
  });

  // Prompt for selection
  let selectedValue: T | undefined;
  do {
    const selection = await question(rl, `${prompt} (default: ${defaultIndex}): `);
    const num = selection ? parseInt(selection) : defaultIndex;

    if (num >= 1 && num <= options.length) {
      selectedValue = options[num - 1].value;
      break;
    }
    console.log('Invalid selection. Please enter a number from the list.');
  } while (selectedValue === undefined);

  return selectedValue;
}

/**
 * Prompts the user for input
 * @param rl The readline interface to use for prompting
 * @param query The query to display
 * @returns The user's response
 */
export async function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Validates input against a regular expression
 * @param rl The readline interface to use for prompting
 * @param query The query to display
 * @param regex The regular expression to validate against
 * @param errorMessage The error message to display if validation fails
 * @returns The validated input
 */
export async function validateInput(
  rl: readline.Interface,
  query: string,
  regex: RegExp,
  errorMessage: string
): Promise<string> {
  let input: string;
  do {
    input = await question(rl, query);
    if (!regex.test(input)) {
      console.log(errorMessage);
    }
  } while (!regex.test(input));

  return input;
}
