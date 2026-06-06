import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import type { StorageProvider, UploadedFile } from './types'

const STORAGE_PATH = process.env.STORAGE_PATH || './storage'

export class LocalStorageProvider implements StorageProvider {
  private basePath: string

  constructor() {
    this.basePath = path.resolve(STORAGE_PATH)
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  async save(file: File, directory?: string): Promise<UploadedFile> {
    const dir = directory ? path.join(this.basePath, directory) : this.basePath
    await this.ensureDir(dir)

    const ext = file.name.split('.').pop() || ''
    const uniqueName = `${crypto.randomUUID()}.${ext}`
    const filePath = path.join(dir, uniqueName)

    const bytes = await file.arrayBuffer()
    await fs.writeFile(filePath, Buffer.from(bytes))

    return {
      fileName: file.name,
      filePath: directory ? `${directory}/${uniqueName}` : uniqueName,
      fileSize: file.size,
      fileType: file.type,
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath)
    try {
      await fs.unlink(fullPath)
    } catch (e) {
      console.error('删除文件失败:', e)
    }
  }

  getUrl(filePath: string): string {
    return `/api/files/${filePath}`
  }
}

let storageInstance: StorageProvider | null = null

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new LocalStorageProvider()
  }
  return storageInstance
}
