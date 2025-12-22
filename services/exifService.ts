
import { ImageMetadata } from "../types";

declare const EXIF: any;
declare const piexif: any;

/**
 * Converte string para array de bytes UTF-16LE (UCS-2) com terminador nulo duplo.
 * Padrão Windows XP/7/10/11 para metadados.
 */
const toXPBytes = (str: string): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    bytes.push(charCode & 0xFF);
    bytes.push((charCode >> 8) & 0xFF);
  }
  bytes.push(0, 0);
  return bytes;
};

/**
 * Converte para o formato UserComment UNICODE (Prefix + UTF-16LE)
 * Resolve o erro de "Unicode inválido" em visualizadores de fotos.
 */
const toUnicodeUserComment = (str: string): number[] => {
  // Cabeçalho de 8 bytes conforme especificação EXIF 2.3
  const prefix = [85, 78, 73, 67, 79, 68, 69, 0]; // "UNICODE\0"
  const bytes: number[] = [...prefix];
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    // Grava em Little Endian (padrão mais compatível)
    bytes.push(charCode & 0xFF);
    bytes.push((charCode >> 8) & 0xFF);
  }
  return bytes;
};

/**
 * Sanitiza string para ASCII puro (remove acentos para campos legados de compatibilidade)
 */
const toAsciiSafe = (str: string): string => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x00-\x7F]/g, "");
};

export const readExif = (file: File): Promise<ImageMetadata> => {
  return new Promise((resolve) => {
    if (typeof EXIF === 'undefined') {
      console.warn("EXIF library not loaded");
      resolve({});
      return;
    }

    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      resolve({});
      return;
    }

    EXIF.getData(file, function(this: any) {
      const all = EXIF.getAllTags(this);
      
      const fromXP = (bytes: any) => {
        if (!bytes || !Array.isArray(bytes)) return "";
        try {
          let str = "";
          for (let i = 0; i < bytes.length; i += 2) {
            if (i + 1 >= bytes.length || (bytes[i] === 0 && bytes[i + 1] === 0)) break;
            str += String.fromCharCode(bytes[i] + (bytes[i + 1] << 8));
          }
          return str;
        } catch (e) {
          return "";
        }
      };

      resolve({
        title: fromXP(all.XPTitle) || all.ImageDescription || "",
        subject: fromXP(all.XPSubject) || "",
        rating: all.Rating ? "★".repeat(all.Rating) : "★★★★★",
        description: fromXP(all.XPComment) || all.ImageDescription || "",
        artist: fromXP(all.XPAuthor) || all.Artist || "",
        copyright: all.Copyright || "",
        software: all.Software || "MetaMorph SEO",
        dateTime: all.DateTime || "",
        userComment: fromXP(all.XPKeywords) || "",
      });
    });
  });
};

export const writeExif = (dataUrl: string, metadata: ImageMetadata): string => {
  if (!dataUrl.startsWith("data:image/jpeg")) return dataUrl;
  if (typeof piexif === 'undefined') {
    console.error("piexif library not loaded");
    return dataUrl;
  }

  try {
    const cleanDataUrl = piexif.remove(dataUrl);
    const zeroth: any = {};
    const exif: any = {};

    if (metadata.title) {
      zeroth[piexif.ImageIFD.ImageDescription] = toAsciiSafe(metadata.title);
      zeroth[piexif.ImageIFD.XPTitle] = toXPBytes(metadata.title);
    }

    if (metadata.description) {
      zeroth[piexif.ImageIFD.XPComment] = toXPBytes(metadata.description);
    }

    if (metadata.subject) {
      zeroth[piexif.ImageIFD.XPSubject] = toXPBytes(metadata.subject);
    }

    const stars = (metadata.rating?.match(/★/g) || []).length || 5;
    zeroth[piexif.ImageIFD.Rating] = stars;
    const ratingMap: {[key: number]: number} = {1: 1, 2: 25, 3: 50, 4: 75, 5: 99};
    zeroth[piexif.ImageIFD.RatingPercent] = ratingMap[stars] || 99;

    if (metadata.artist) {
      zeroth[piexif.ImageIFD.Artist] = toAsciiSafe(metadata.artist);
      zeroth[piexif.ImageIFD.XPAuthor] = toXPBytes(metadata.artist);
    }

    if (metadata.userComment) {
      const formattedTags = metadata.userComment.split(/[,;]/).map(t => t.trim()).filter(t => t).join("; ");
      zeroth[piexif.ImageIFD.XPKeywords] = toXPBytes(formattedTags);
      exif[piexif.ExifIFD.UserComment] = toUnicodeUserComment(formattedTags);
    }

    if (metadata.software) zeroth[piexif.ImageIFD.Software] = toAsciiSafe(metadata.software);
    if (metadata.copyright) zeroth[piexif.ImageIFD.Copyright] = toAsciiSafe(metadata.copyright);
    
    const now = new Date();
    const dateStr = now.toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/-/g, ':');
    zeroth[piexif.ImageIFD.DateTime] = metadata.dateTime || dateStr;

    const exifObj = { "0th": zeroth, "Exif": exif };
    const exifBytes = piexif.dump(exifObj);
    return piexif.insert(exifBytes, cleanDataUrl);
  } catch (error) {
    console.error("Erro crítico ao gravar EXIF:", error);
    // Fallback: retorna a imagem original sem metadados se houver erro de Unicode
    return dataUrl;
  }
};

export const downloadImage = (dataUrl: string, fileName: string) => {
  try {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error("Download failed:", e);
  }
};
