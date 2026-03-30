export interface SaveStorage {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  list(): Promise<string[]>;
  delete(key: string): Promise<void>;
}

const STORAGE_PREFIX = 'geomeditate:save:';

export class LocalStorageBackend implements SaveStorage {
  async save(key: string, data: string): Promise<void> {
    localStorage.setItem(STORAGE_PREFIX + key, data);
  }

  async load(key: string): Promise<string | null> {
    return localStorage.getItem(STORAGE_PREFIX + key);
  }

  async list(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keys.push(k.slice(STORAGE_PREFIX.length));
      }
    }
    return keys;
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(STORAGE_PREFIX + key);
  }

  async clearAll(): Promise<void> {
    const keys = await this.list();
    for (const key of keys) {
      await this.delete(key);
    }
  }
}

export function downloadJsonFile(data: string, filename: string): void {
  const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function uploadJsonFile(onLoaded: (data: string) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.style.display = 'none';
  document.body.appendChild(input);
  input.addEventListener('change', () => {
    document.body.removeChild(input);
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onLoaded(reader.result as string);
    reader.readAsText(file);
  });
  input.click();
}
