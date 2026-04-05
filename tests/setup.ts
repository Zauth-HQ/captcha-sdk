// Jest setup file
// Add global mocks or setup here

// Mock crypto for consistent testing
(global as any).crypto = {
  randomUUID: () => 'test-uuid-12345',
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
};
