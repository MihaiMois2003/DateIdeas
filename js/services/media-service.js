import { ref, uploadBytes, getDownloadURL, deleteObject } from '../core/sdk.js';

/** Micșorează pozele de pe telefon înainte de upload (upload rapid, spațiu mai puțin, cost mai mic). */
export class ImageCompressor {
  constructor({ maxSide = 1800, quality = 0.84 } = {}) {
    this.maxSide = maxSide;
    this.quality = quality;
  }

  async compress(file) {
    try {
      const image = await ImageCompressor.#load(file);
      const scale = Math.min(1, this.maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', this.quality));
      return blob && blob.size < file.size ? blob : file;
    } catch {
      return file;
    }
  }

  static #load(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      image.src = url;
    });
  }
}

export class MediaService {
  #storage;
  #compressor;

  constructor({ storage, compressor }) {
    this.#storage = storage;
    this.#compressor = compressor;
  }

  async upload(file, folder) {
    const blob = await this.#compressor.compress(file);
    const type = blob.type || 'image/jpeg';
    const extension = (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const fileRef = ref(this.#storage, path);
    await uploadBytes(fileRef, blob, { contentType: type });
    return { url: await getDownloadURL(fileRef), path };
  }

  async remove(path) {
    if (!path) return;
    try {
      await deleteObject(ref(this.#storage, path));
    } catch (error) {
      console.warn('[media] remove', error);
    }
  }
}
