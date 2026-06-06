export interface UploadedFile {
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
}

export interface StorageProvider {
  save(file: File, directory?: string): Promise<UploadedFile>
  delete(filePath: string): Promise<void>
  getUrl(filePath: string): string
}
