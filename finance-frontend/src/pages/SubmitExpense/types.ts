export interface UploadedReceiptItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface SubmitSuccessState {
  isOpen: boolean;
  claimId: string;
}
