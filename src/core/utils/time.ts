export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    if (timeout.unref) timeout.unref(); // Prevent hanging in tests
  });
};
