/**
 * Authentic Pure-Vegetarian Image Resolution Engine for Bikanervala
 * Strictly Pure Vegetarian & Heritage Indian Confectionery.
 *
 * Rules:
 * 1. If an item has an explicit admin-uploaded image (item.image_url), use it.
 * 2. All Sweets (Rasgulla, Kaju Katli, Ladoos, Gulab Jamun, Halwa, Peda) and Namkeen (Bhujia, Sev)
 *    default to the official Bikanervala Heritage Brand Logo (/bikanervala-customer-logo.png)
 *    unless an authentic photo is uploaded by admin.
 * 3. NO random or unverified external image IDs. Zero animals, fish, or non-veg images allowed.
 * 4. Fallback is ALWAYS the official Bikanervala Brand Logo.
 */

export const BIKANERVALA_LOGO_FALLBACK = "/bikanervala-customer-logo.png";

// Verified Pure-Vegetarian Restaurant Delicacies
const VERIFIED_VEG_DISH_MATCHERS: Array<{
  keywords: string[];
  url: string;
}> = [
  // South Indian Idli & Sambhar
  {
    keywords: ["idli", "button idli", "thatte idli", "idli sambhar"],
    url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80",
  },
  // South Indian Crisp Dosa
  {
    keywords: ["dosa", "masala dosa", "benne dosa", "mysore dosa", "rava dosa", "paper dosa"],
    url: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&auto=format&fit=crop&q=80",
  },
  // Medu Vada
  {
    keywords: ["vada", "medu vada", "vada sambhar"],
    url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80",
  },
  // Chole Bhature (Delhi Classic)
  {
    keywords: ["bhature", "bhatura", "chole bhature"],
    url: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=800&auto=format&fit=crop&q=80",
  },
  // Raj Kachori & Dilli Chaat
  {
    keywords: ["raj kachori", "kachori", "khasta kachori"],
    url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80",
  },
  // Aloo Tikki & Papdi Chaat
  {
    keywords: ["aloo tikki", "tikki", "chaat", "papdi chaat", "dahi bhalla", "golgappa", "pani puri"],
    url: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&auto=format&fit=crop&q=80",
  },
  // Pure Veg Samosa
  {
    keywords: ["samosa", "punjabi samosa"],
    url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80",
  },
  // Amritsari / Royal Veg Thali
  {
    keywords: ["thali", "amritsari thali", "delux thali", "executive thali", "royal thali"],
    url: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=800&auto=format&fit=crop&q=80",
  },
  // Paneer Butter Masala / Shahi Paneer
  {
    keywords: ["paneer", "paneer lababdar", "shahi paneer", "paneer butter masala", "kadhai paneer", "matar paneer"],
    url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=80",
  },
  // Dal Makhani & Dal Tadka
  {
    keywords: ["dal makhani", "dal bukhara", "dal tadka", "yellow dal"],
    url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80",
  },
  // Kulhad Lassi & Thandai
  {
    keywords: ["lassi", "mango lassi", "kesariya lassi", "thandai", "badam milk"],
    url: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format&fit=crop&q=80",
  },
  // Veg Hakka Noodles
  {
    keywords: ["noodle", "noodles", "chowmein", "hakka noodles"],
    url: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80",
  },
  // Veg Fried Rice
  {
    keywords: ["fried rice", "schezwan rice"],
    url: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80",
  },
  // Veg Spring Roll
  {
    keywords: ["spring roll", "veg roll"],
    url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
  },
  // Fresh Brewed Filter Coffee
  {
    keywords: ["coffee", "filter coffee", "cappuccino", "latte"],
    url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
  },
  // Cold Beverages / Soft Drink Cans
  {
    keywords: ["pepsi", "7up", "mirinda", "mountain dew"],
    url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80",
  },
];

/**
 * Resolves the actual photograph of an item.
 * 1. Checks if an explicit admin image has been uploaded (item.image_url).
 * 2. Checks verified vegetarian restaurant food matchers.
 * 3. Sweets and Namkeen default to the official Bikanervala Brand Logo.
 * 4. Fallback is ALWAYS Bikanervala Brand Logo.
 */
export function getActualDishImage(item: {
  sku?: string;
  name?: string;
  image_url?: string | null;
  category?: string;
  sub_category?: string;
}): {
  url: string;
  isBrandFallback: boolean;
} {
  // 1. Explicit admin configured image URL
  if (item?.image_url && item.image_url.trim().length > 5) {
    return { url: item.image_url.trim(), isBrandFallback: false };
  }

  const name = (item?.name || "").toLowerCase();
  const cat = (item?.category || "").toLowerCase();
  const subCat = (item?.sub_category || "").toLowerCase();

  // 2. All Sweets & Namkeen default strictly to official Bikanervala logo unless admin uploaded
  const isSweetOrNamkeen =
    cat.includes("sweet") ||
    subCat.includes("sweet") ||
    subCat.includes("namkeen") ||
    subCat.includes("mithai") ||
    name.includes("rasgulla") ||
    name.includes("kaju") ||
    name.includes("katli") ||
    name.includes("laddu") ||
    name.includes("ladoo") ||
    name.includes("gulab jamun") ||
    name.includes("jamun") ||
    name.includes("jalebi") ||
    name.includes("bhujia") ||
    name.includes("sev") ||
    name.includes("mathri") ||
    name.includes("halwa") ||
    name.includes("barfi") ||
    name.includes("peda");

  if (isSweetOrNamkeen) {
    return {
      url: BIKANERVALA_LOGO_FALLBACK,
      isBrandFallback: true,
    };
  }

  // 3. Match against verified pure vegetarian hot kitchen foods
  for (const matcher of VERIFIED_VEG_DISH_MATCHERS) {
    for (const kw of matcher.keywords) {
      if (name.includes(kw)) {
        return { url: matcher.url, isBrandFallback: false };
      }
    }
  }

  // 4. Default Fallback: Always the official Bikanervala Brand Logo
  return {
    url: BIKANERVALA_LOGO_FALLBACK,
    isBrandFallback: true,
  };
}

/**
 * Auto-adjusts an uploaded image file to standard tile dimensions (4:3 aspect ratio, 800x600 px)
 * Uses client-side HTML5 canvas for center-crop (object-fit: cover) and compression.
 */
export function autoAdjustImageToTile(
  file: File,
  targetWidth = 800,
  targetHeight = 600,
  quality = 0.88
): Promise<{
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  fileSizeKb: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const origW = img.width;
        const origH = img.height;

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Unable to initialize canvas context"));
          return;
        }

        // Calculate center crop (object-fit: cover)
        const targetRatio = targetWidth / targetHeight;
        const sourceRatio = origW / origH;
        let sWidth = origW;
        let sHeight = origH;
        let sx = 0;
        let sy = 0;

        if (sourceRatio > targetRatio) {
          sWidth = origH * targetRatio;
          sx = (origW - sWidth) / 2;
        } else {
          sHeight = origW / targetRatio;
          sy = (origH - sHeight) / 2;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        const fileSizeKb = Math.round(approxBytes / 1024);

        resolve({
          dataUrl,
          originalWidth: origW,
          originalHeight: origH,
          fileSizeKb,
        });
      };
      img.onerror = () => reject(new Error("Failed to load image file"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
