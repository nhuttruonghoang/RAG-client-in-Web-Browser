// Helper to encode string to base64 - used for legacy fixed knowledge base, might be useful later.
export const toBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)));


/**
 * Reads a File object and returns its content as a base64 encoded string.
 * @param file The File object to read.
 * @returns A promise that resolves with the base64 data string (without the data URL prefix).
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // result is a data URL like "data:image/jpeg;base64,LzlqLzRBQ...""
      // We only want the part after the comma.
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}
