export const logger = {
  info: (message: string, meta?: unknown) => {
    console.log(`[nowly] ${message}`, meta ?? "");
  },
  error: (message: string, meta?: unknown) => {
    console.error(`[nowly:error] ${message}`, meta ?? "");
  }
};
