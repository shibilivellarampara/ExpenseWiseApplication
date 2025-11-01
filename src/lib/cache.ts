
'use client';

export function setCache<T>(key: string, data: T, ttlMinutes: number): void {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const item = {
    data: data,
    expiry: now.getTime() + ttlMinutes * 60 * 1000,
  };

  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.error("Error saving to localStorage", error);
  }
}

export function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return null;
    }

    const item = JSON.parse(itemStr);
    const now = new Date();

    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.data;
  } catch (error) {
    console.error("Error reading from localStorage", error);
    return null;
  }
}

export function clearCache(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing from localStorage", error);
  }
}

    