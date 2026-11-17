import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  RefreshCw,
  Crop,
  Layers,
  Save,
  Trash2,
  Search,
  Lock,
  FolderOpen,
} from "lucide-react";
import { apiFetch } from "../api";
import { ItemSku } from "../types";
import { autoAdjustImageToTile, getActualDishImage, BIKANERVALA_LOGO_FALLBACK } from "../utils/dishImageResolver";

interface ItemImageUploadModalProps {
  item: ItemSku;
  allItems?: ItemSku[];
  onClose: () => void;
  onUpdated: (updatedItem: ItemSku) => void;
}

export const ItemImageUploadModal: React.FC<ItemImageUploadModalProps> = ({
  item: initialItem,
  allItems = [],
  onClose,
  onUpdated,
}) => {
  const [selectedItem, setSelectedItem] = useState<ItemSku>(initialItem);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const currentResolved = getActualDishImage(selectedItem);
  const [previewUrl, setPreviewUrl] = useState<string>(selectedItem.image_url || currentResolved.url);
  const [customUrlInput, setCustomUrlInput] = useState<string>(selectedItem.image_url || "");
  const [imageMeta, setImageMeta] = useState<{
    origW: number;
    origH: number;
    fileSizeKb: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync when initialItem changes
  useEffect(() => {
    setSelectedItem(initialItem);
    const resolved = getActualDishImage(initialItem);
    setPreviewUrl(initialItem.image_url || resolved.url);
    setCustomUrlInput(initialItem.image_url || "");
    setImageMeta(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialItem]);

  const handleSelectItem = (it: ItemSku) => {
    setSelectedItem(it);
    const resolved = getActualDishImage(it);
    setPreviewUrl(it.image_url || resolved.url);
    setCustomUrlInput(it.image_url || "");
    setImageMeta(null);
    setShowItemDropdown(false);
    setItemSearchQuery("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Auto-adjust image to standard kiosk/POS tile size (800x600 px, 4:3 cover crop)
      const adjusted = await autoAdjustImageToTile(file, 800, 600, 0.88);
      setPreviewUrl(adjusted.dataUrl);
      setImageMeta({
        origW: adjusted.originalWidth,
        origH: adjusted.originalHeight,
        fileSizeKb: adjusted.fileSizeKb,
      });
      setSuccessMsg(`Image auto-adjusted to tile aspect ratio (800 × 600 px, ${adjusted.fileSizeKb} KB)!`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process image file");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveImage = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const finalUrl = previewUrl;
      await apiFetch<ItemSku>(`/api/admin/items/${selectedItem.sku}/image`, {
        method: "PUT",
        body: JSON.stringify({ image_url: finalUrl }),
      });
      const updated = { ...selectedItem, image_url: finalUrl };
      setSelectedItem(updated);
      onUpdated(updated);
      setSuccessMsg(`Image for "${selectedItem.name}" saved to Database & Kiosk Menu!`);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update item image in database");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToLogo = async () => {
    setSaving(true);
    try {
      await apiFetch<ItemSku>(`/api/admin/items/${selectedItem.sku}/image`, {
        method: "PUT",
        body: JSON.stringify({ image_url: "" }),
      });
      setPreviewUrl(BIKANERVALA_LOGO_FALLBACK);
      setImageMeta(null);
      const updated = { ...selectedItem, image_url: "" };
      setSelectedItem(updated);
      onUpdated(updated);
      setSuccessMsg(`Reset to Bikanervala official logo default!`);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset image");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = allItems.filter((i) =>
    (i.name || "").toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    (i.sku || "").toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-xs max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-700">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#081F5C] dark:text-white flex items-center gap-2">
                Edit Item Photo & Tile Image (KIOSK & Catalog)
              </h3>
              <p className="text-[11px] text-slate-500">
                Browse local system • Auto-adjusts to exact 4:3 tile • Pure Vegetarian Bikanervala Standard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item Selector / Search if multiple items provided */}
        {allItems.length > 0 && (
          <div className="relative">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Search & Switch Dish to Edit
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search any dish or SKU (e.g. Idli, Dosa, Rasgulla, Kaju Katli)..."
                value={itemSearchQuery}
                onFocus={() => setShowItemDropdown(true)}
                onChange={(e) => {
                  setItemSearchQuery(e.target.value);
                  setShowItemDropdown(true);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {showItemDropdown && itemSearchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20 p-1 space-y-0.5">
                {filteredItems.slice(0, 10).map((it) => (
                  <button
                    key={it.sku}
                    type="button"
                    onClick={() => handleSelectItem(it)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-700 flex items-center justify-between transition"
                  >
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">{it.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{it.sku} • {it.sub_category}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-600">₹{it.selling_price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Item Info Capsule (Strictly locked price) */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-slate-800/60 border border-amber-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <div className="font-extrabold text-slate-900 dark:text-white text-sm">
              {selectedItem.name}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              SKU: <code className="font-mono font-bold text-amber-700">{selectedItem.sku}</code> • Category: <b>{selectedItem.sub_category || selectedItem.category}</b>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Price (Locked):</span>
            </div>
            <span className="px-3 py-0.5 rounded-full bg-amber-400 text-[#081F5C] font-black text-xs inline-block mt-0.5">
              ₹{Number(selectedItem.selling_price || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notice: No Price Modification Allowed */}
        <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 border border-slate-200 dark:border-slate-700">
          <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span><b>Price Lock Guardrail:</b> Pricing cannot be modified in Kiosk mode. Only high-resolution food photo updates and tile cropping are permitted.</span>
        </div>

        {/* Live Tile Preview Box (Visual Representation of Kiosk / POS Tile) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block">
            Live Kiosk Tile Preview (4:3 Aspect Ratio)
          </label>
          <div className="relative h-52 w-full rounded-2xl overflow-hidden bg-[#FAF8F5] dark:bg-slate-800 border-2 border-dashed border-amber-300 dark:border-amber-700 flex items-center justify-center shadow-inner group">
            {previewUrl === BIKANERVALA_LOGO_FALLBACK ? (
              <div className="p-6 text-center space-y-2">
                <img
                  src={BIKANERVALA_LOGO_FALLBACK}
                  alt="Bikanervala Brand"
                  className="h-20 w-auto max-w-[200px] object-contain mx-auto drop-shadow"
                />
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                  Bikanervala Official Heritage Logo (Default)
                </span>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt={selectedItem.name}
                className="w-full h-full object-cover"
                onError={() => setPreviewUrl(BIKANERVALA_LOGO_FALLBACK)}
              />
            )}

            {/* Overlay Tile Metadata */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
              <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                <Crop className="w-3 h-3 text-amber-400" />
                <span>Tile Dimension: 800 × 600 px (Cover)</span>
              </span>
              {imageMeta && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold">
                  Optimized: {imageMeta.fileSizeKb} KB
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Feedback / Alert Banners */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Browse Local System / Upload Section */}
        <div className="space-y-3 pt-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Direct Browse Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="flex-1 py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#081F5C] font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 border border-amber-500"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing & Auto-Adjusting...</span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-4 h-4" />
                  <span>Browse From Computer / System</span>
                </>
              )}
            </button>

            {/* Reset to Logo Button */}
            <button
              type="button"
              onClick={handleResetToLogo}
              disabled={saving}
              className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Use Bikanervala Logo</span>
            </button>
          </div>

          {/* Or Paste Direct Image URL */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">
              Or paste high-resolution vegetarian photo URL:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://... (JPG, PNG, WebP)"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (customUrlInput.trim()) {
                    setPreviewUrl(customUrlInput.trim());
                    setSuccessMsg("Image URL applied to preview!");
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-bold text-xs"
              >
                Preview URL
              </button>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveImage}
            disabled={saving || processing}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-lg transition flex items-center gap-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Image & Update KIOSK</span>
          </button>
        </div>
      </div>
    </div>
  );
};
