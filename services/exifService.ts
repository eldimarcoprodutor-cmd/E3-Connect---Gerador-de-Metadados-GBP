
import { ImageMetadata } from "../types";

declare const EXIF: any;
declare const piexif: any;

/**
 * Converte string para array de bytes UTF-16LE (UCS-2) com terminador nulo duplo.
 * Essencial para que o Windows exiba corretamente acentos e caracteres especiais.
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
 * Converte para o formato UserComment UNICODE (Prefix + UCS-2)
 */
const toUnicodeUserComment = (str: string): number[] => {
  // Prefixo 'UNICODE\0' (8 bytes)
  const prefix = [85, 78, 73, 67, 79, 68, 69, 0];
  const ucs2: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    // UserComment UNICODE geralmente espera Big Endian ou depende da arquitetura, 
    // mas piexif lida bem com a sequência de bytes direta.
    ucs2.push((charCode >> 8) & 0xFF);
    ucs2.push(charCode & 0xFF);
  }
  return prefix.concat(ucs2);
};

/**
 * Sanitiza string para ASCII puro (remove acentos para campos legados)
 */
const toAsciiSafe = (str: string): string => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x00-\x7F]/g, "");
};

export const readExif = (file: File): Promise<ImageMetadata> => {
  return new Promise((resolve) => {
    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      resolve({});
      return;
    }
    EXIF.getData(file, function(this: any) {
      const all = EXIF.getAllTags(this);
      
      const fromXP = (bytes: any) => {
        if (!bytes || !Array.isArray(bytes)) return "";
        let str = "";
        for (let i = 0; i < bytes.length; i += 2) {
          if (i + 1 >= bytes.length || (bytes[i] === 0 && bytes[i + 1] === 0)) break;
          str += String.fromCharCode(bytes[i] + (bytes[i + 1] << 8));
        }
        return str;
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

  try {
    const cleanDataUrl = piexif.remove(dataUrl);
    const zeroth: any = {};
    const exif: any = {};

    // 1. Título e Descrição básica (Convertemos para ASCII seguro para evitar erro de Unicode inválido em leitores antigos)
    if (metadata.title) {
      zeroth[piexif.ImageIFD.ImageDescription] = toAsciiSafe(metadata.title);
      zeroth[piexif.ImageIFD.XPTitle] = toXPBytes(metadata.title);
    }

    // 2. XPComment (Descrição detalhada com suporte a acentos no Windows)
    if (metadata.description) {
      zeroth[piexif.ImageIFD.XPComment] = toXPBytes(metadata.description);
    }

    if (metadata.subject) {
      zeroth[piexif.ImageIFD.XPSubject] = toXPBytes(metadata.subject);
    }

    // 3. Estrelas
    const stars = (metadata.rating?.match(/★/g) || []).length || 5;
    zeroth[piexif.ImageIFD.Rating] = stars;
    const ratingMap: {[key: number]: number} = {1: 1, 2: 25, 3: 50, 4: 75, 5: 99};
    zeroth[piexif.ImageIFD.RatingPercent] = ratingMap[stars] || 99;

    if (metadata.artist) {
      zeroth[piexif.ImageIFD.Artist] = toAsciiSafe(metadata.artist);
      zeroth[piexif.ImageIFD.XPAuthor] = toXPBytes(metadata.artist);
    }

    // 4. Tags (Keywords) - Usando UNICODE no UserComment e XPKeywords para o Windows
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
    console.error("Erro ao gravar EXIF:", error);
    return dataUrl;
  }
};

export const downloadImage = (dataUrl: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
