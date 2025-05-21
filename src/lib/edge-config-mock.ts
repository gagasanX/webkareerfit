// src/lib/edge-config-mock.ts
export const EdgeConfig = {
    get: async (key: string) => {
      console.log('Using mock Edge Config, key:', key);
      
      // Default values berdasarkan key
      if (key === 'login_enabled') return true;
      
      // Default return null untuk key lain
      return null;
    }
  };