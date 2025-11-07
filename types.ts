
export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  data: string; // base64 encoded data
}
