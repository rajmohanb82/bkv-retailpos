import React, { useEffect, useState } from "react";
import {
  PackageCheck,
  Tag,
  Sparkles,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Percent,
  Calendar,
  Gift,
  Scale,
  RefreshCw,
  TrendingUp,
  Sliders,
  Trash2,
  Printer,
  ChevronRight,
  ShieldAlert,
  Download,
  UploadCloud,
  FileSpreadsheet,
  FileUp,
  Hash,
  ImageIcon,
  Camera,
} from "lucide-react";
import { apiFetch, formatINR } from "../api";
import { ItemSku, PromoOffer } from "../types";
import { ItemImageUploadModal } from "../components/ItemImageUploadModal";
import { getActualDishImage, BIKANERVALA_LOGO_FALLBACK } from "../utils/dishImageResolver";

interface ItemAdminModuleProps {
  initialTab?: "items" | "rates" | "promos" | "packages";
}

export const ItemAdminModule: React.FC<ItemAdminModuleProps> = ({ initialTab = "items" }) => {
  const [activeTab, setActiveTab] = useState<"items" | "rates" | "promos" | "packages">(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [items, setItems] = useState<ItemSku[]>([]);
  const [promos, setPromos] = useState<PromoOffer[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Image Upload Modal state
  const [selectedItemForImage, setSelectedItemForImage] = useState<ItemSku | null>(null);

  // Bulk Upload state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkParsedItems, setBulkParsedItems] = useState<any[]>([]);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);

  // Item Master Form Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newItemType, setNewItemType] = useState<string>("Prepared Food");
  const [newCategory, setNewCategory] = useState<string>("FG-Rest");
  const [newSubCategory, setNewSubCategory] = useState("North Indian Gravies & Paneer");
  const [newSellingPrice, setNewSellingPrice] = useState<number>(240);
  const [newCostPrice, setNewCostPrice] = useState<number>(90);
  const [newPosUom, setNewPosUom] = useState("PORTION");
  const [newGstPct, setNewGstPct] = useState<number>(5.0);
  const [newHsn, setNewHsn] = useState("210690");
  const [newStation, setNewStation] = useState("North Indian Main");
  const [newShelfLife, setNewShelfLife] = useState<number>(1);
  const [newMinPar, setNewMinPar] = useState<number>(10);

  // Rate Master Editable State
  const [rateEdits, setRateEdits] = useState<Record<string, { selling_price: number; cost_price: number; gst_pct: number }>>({});

  // Promo / Festival Offer Modal
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoName, setPromoName] = useState("");
  const [promoType, setPromoType] = useState<string>("FESTIVAL_OFFER");
  const [promoTargetAudience, setPromoTargetAudience] = useState<string>("FESTIVAL");
  const [promoIsItemWise, setPromoIsItemWise] = useState<boolean>(false);
  const [promoApplicableSkus, setPromoApplicableSkus] = useState<string[]>([]);
  const [promoApplicableItemNames, setPromoApplicableItemNames] = useState<string[]>([]);
  const [itemSearchFilter, setItemSearchFilter] = useState<string>("");
  const [promoRule, setPromoRule] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [promoValue, setPromoValue] = useState<number>(15);
  const [promoMinBill, setPromoMinBill] = useState<number>(1000);
  const [promoMaxCap, setPromoMaxCap] = useState<number>(500);
  const [promoValidFrom, setPromoValidFrom] = useState(new Date().toISOString().split("T")[0]);
  const [promoValidTo, setPromoValidTo] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );
  const [promoUsageLimit, setPromoUsageLimit] = useState<number>(500);

  // Custom Package Builder
  const [pkgSku, setPkgSku] = useState(`PKG-THAL-${Math.floor(100 + Math.random() * 900)}`);
  const [pkgName, setPkgName] = useState("Royal Dryfruit Heritage Thal");
  const [pkgPlateName, setPkgPlateName] = useState("Ornate Silver & Velvet Thal Base");
  const [pkgPlatePrice, setPkgPlatePrice] = useState<number>(180);
  const [pkgComponents, setPkgComponents] = useState<
    { item_name: string; weight_grams: number; unit_rate: number }[]
  >([
    { item_name: "California Almonds Jumbo", weight_grams: 200, unit_rate: 260 },
    { item_name: "Goan Cashews (Kaju W320)", weight_grams: 200, unit_rate: 290 },
    { item_name: "Kashmiri Walnut Kernels (Akhrot)", weight_grams: 200, unit_rate: 240 },
    { item_name: "Irani Salted Pistachios (Pista)", weight_grams: 200, unit_rate: 280 },
  ]);
  const [newCompName, setNewCompName] = useState("");
  const [newCompWeight, setNewCompWeight] = useState<number>(100);
  const [newCompRate, setNewCompRate] = useState<number>(150);

  const notify = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = async () => {
    try {
      const [itms, prms] = await Promise.all([
        apiFetch<ItemSku[]>("/api/admin/items"),
        apiFetch<PromoOffer[]>("/api/admin/promos"),
      ]);
      setItems(itms);
      setPromos(prms);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadTemplate = () => {
    // Generate CSV template with sample data
    const headers = "sku,name,category,sub_category,item_type,pos_uom,selling_price,cost_price,gst_pct,hsn_code,kitchen_station,shelf_life_days,min_par_level\n";
    const sampleRows = [
      "ITM-2001,Kaju Pista Roll 400g,FG-Sweet,Rich Dryfruit Sweets,Packed Food,PACK,480.00,290.00,12.0,210690,Mithai & Desserts,30,25\n",
      "ITM-2002,Paneer Butter Masala Special,FG-Rest,North Indian Gravies & Paneer,Prepared Food,PORTION,280.00,110.00,5.0,210690,North Indian Main,1,15\n",
      "ITM-2003,Diet Mixture Namkeen 200g,FG-Sweet,Namkeen & Bhujia,Packed Food,PACK,75.00,42.00,12.0,210690,Pantry & Bakery,90,50\n"
    ].join("");
    const blob = new Blob([headers + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "annavya_item_bulk_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(true, "Bulk Items & Rates template downloaded successfully");
  };

  const parseCsvData = (text: string) => {
    try {
      const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setBulkParsedItems([]);
        return;
      }
      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
      const itemsList: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Split by comma ignoring commas inside quotes
        const values: string[] = [];
        let curr = "";
        let inQuotes = false;
        for (let char of line) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            values.push(curr.trim().replace(/^["']|["']$/g, ""));
            curr = "";
          } else {
            curr += char;
          }
        }
        values.push(curr.trim().replace(/^["']|["']$/g, ""));

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });

        if (row["sku"] && (row["name"] || row["item_name"])) {
          const itemType = row["item_type"] || (row["category"] === "FG-Rest" ? "Prepared Food" : "Packed Food");
          itemsList.push({
            sku: row["sku"].toUpperCase(),
            name: row["name"] || row["item_name"],
            category: row["category"] || (itemType === "Prepared Food" ? "FG-Rest" : "FG-Sweet"),
            sub_category: row["sub_category"] || "General Food",
            item_type: itemType,
            pos_uom: row["pos_uom"] || row["purchase_uom"] || "PORTION",
            selling_price: parseFloat(row["selling_price"] || row["mrp"] || "0"),
            cost_price: parseFloat(row["cost_price"] || "0"),
            gst_pct: parseFloat(row["gst_pct"] || "5.0"),
            hsn_code: row["hsn_code"] || "210690",
            kitchen_station: row["kitchen_station"] || "North Indian Main",
            shelf_life_days: parseInt(row["shelf_life_days"] || "1"),
            min_par_level: parseInt(row["min_par_level"] || "10"),
          });
        }
      }
      setBulkParsedItems(itemsList);
    } catch (e: any) {
      console.error(e);
      notify(false, "Failed to parse CSV format: " + e.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkCsvText(content);
      parseCsvData(content);
    };
    reader.readAsText(file);
  };

  const handleExecuteBulkUpload = async () => {
    if (bulkParsedItems.length === 0) {
      notify(false, "No valid items parsed to upload");
      return;
    }
    setIsUploadingBulk(true);
    try {
      const res = await apiFetch<any>("/api/admin/items/bulk-upload", {
        method: "POST",
        body: JSON.stringify(bulkParsedItems),
      });
      notify(true, `Bulk Upload Successful! ${res.inserted || 0} inserted, ${res.updated || 0} updated.`);
      setShowBulkModal(false);
      setBulkCsvText("");
      setBulkParsedItems([]);
      loadData();
    } catch (err: any) {
      notify(false, err.message || "Failed to execute bulk upload");
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const fetchNextItemSku = async () => {
    try {
      const res = await apiFetch<any>("/api/admin/code-sequences/item/next", { method: "POST" });
      if (res && res.code) {
        setNewSku(res.code);
        notify(true, `Auto-assigned Next Master SKU: ${res.code}`);
      }
    } catch (e: any) {
      notify(false, "Could not fetch next sequence: " + e.message);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku || !newName) {
      notify(false, "SKU and Item Name are mandatory");
      return;
    }
    try {
      await apiFetch("/api/admin/items", {
        method: "POST",
        body: JSON.stringify({
          sku: newSku.toUpperCase().trim(),
          name: newName.trim(),
          category: newCategory,
          sub_category: newSubCategory,
          purchase_uom: newPosUom,
          inventory_uom: newPosUom,
          pos_uom: newPosUom,
          conversion_factor: 1.0,
          hsn_code: newHsn,
          gst_pct: newGstPct,
          selling_price: newSellingPrice,
          cost_price: newCostPrice,
          shelf_life_days: newShelfLife,
          min_par_level: newMinPar,
          kitchen_station: newStation,
          item_type: newItemType,
          is_custom_package: newItemType === "Custom Package",
        }),
      });
      notify(true, `Item ${newSku.toUpperCase()} created successfully in Item Master!`);
      setShowItemModal(false);
      setNewSku("");
      setNewName("");
      loadData();
    } catch (err: any) {
      notify(false, err.message || "Failed to create item");
    }
  };

  const handleSaveRate = async (sku: string) => {
    const edit = rateEdits[sku];
    if (!edit) return;
    try {
      await apiFetch(`/api/admin/items/${encodeURIComponent(sku)}/rate`, {
        method: "PUT",
        body: JSON.stringify({
          selling_price: edit.selling_price,
          cost_price: edit.cost_price,
          gst_pct: edit.gst_pct,
        }),
      });
      notify(true, `Rate updated for ${sku} (Selling: ${formatINR(edit.selling_price)}, Cost: ${formatINR(edit.cost_price)})`);
      loadData();
    } catch (err: any) {
      notify(false, err.message || "Failed to update rate");
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode || !promoName) {
      notify(false, "Code and Name are required");
      return;
    }
    try {
      await apiFetch("/api/admin/promos", {
        method: "POST",
        body: JSON.stringify({
          code: promoCode.toUpperCase().trim(),
          name: promoName.trim(),
          rule_type: promoRule,
          value: promoValue,
          min_bill: promoMinBill,
          max_cap: promoMaxCap,
          stackable: false,
          outlet_scope: "ALL",
          promo_type: promoType,
          valid_from: promoValidFrom,
          valid_to: promoValidTo,
          usage_limit: promoUsageLimit,
          target_audience: promoTargetAudience,
          is_item_wise: promoIsItemWise,
          applicable_skus: promoIsItemWise ? promoApplicableSkus : [],
          applicable_item_names: promoIsItemWise ? promoApplicableItemNames : [],
        }),
      });
      notify(true, `Offer ${promoCode.toUpperCase()} (${promoTargetAudience}) created successfully!`);
      setShowPromoModal(false);
      setPromoCode("");
      setPromoName("");
      setPromoIsItemWise(false);
      setPromoApplicableSkus([]);
      setPromoApplicableItemNames([]);
      loadData();
    } catch (err: any) {
      notify(false, err.message || "Failed to create offer");
    }
  };

  const handleTogglePromo = async (id: number) => {
    try {
      await apiFetch(`/api/admin/promos/${id}/toggle`, { method: "PATCH" });
      loadData();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  const handleDeletePromo = async (id: number) => {
    if (!confirm("Deactivate / remove this promotional offer?")) return;
    try {
      await apiFetch(`/api/admin/promos/${id}`, { method: "DELETE" });
      notify(true, "Offer removed");
      loadData();
    } catch (err: any) {
      notify(false, err.message);
    }
  };

  // Custom Package calculations
  const totalCompWeightGrams = pkgComponents.reduce((acc, c) => acc + (c.weight_grams || 0), 0);
  const totalCompCost = pkgComponents.reduce((acc, c) => acc + (c.unit_rate || 0), 0);
  const totalPackageCost = totalCompCost + pkgPlatePrice;
  const suggestedSellingPrice = Math.round(totalPackageCost * 1.35); // 35% margin markup

  const handleAddPkgComponent = () => {
    if (!newCompName) return;
    setPkgComponents([
      ...pkgComponents,
      { item_name: newCompName, weight_grams: newCompWeight, unit_rate: newCompRate },
    ]);
    setNewCompName("");
    setNewCompWeight(100);
    setNewCompRate(150);
  };

  const handleRemovePkgComponent = (idx: number) => {
    setPkgComponents(pkgComponents.filter((_, i) => i !== idx));
  };

  const handleSaveCustomPackage = async () => {
    try {
      await apiFetch("/api/admin/items/custom-package", {
        method: "POST",
        body: JSON.stringify({
          sku: pkgSku.toUpperCase().trim(),
          name: `${pkgName} (${totalCompWeightGrams}g + Thal Plate)`,
          sub_category: "Festive Gift Packages",
          plate_price: pkgPlatePrice,
          components: [
            ...pkgComponents,
            { item_name: pkgPlateName, weight_grams: 0, unit_rate: pkgPlatePrice },
          ],
          cost_price: totalPackageCost,
          selling_price: suggestedSellingPrice,
          gst_pct: 12.0,
          hsn_code: "200819",
          shelf_life_days: 90,
        }),
      });
      notify(true, `Custom Package ${pkgSku} saved successfully with ${pkgComponents.length} items + ${pkgPlateName}!`);
      loadData();
    } catch (err: any) {
      notify(false, err.message || "Failed to save custom package");
    }
  };

  // Filtered items
  const filteredItems = items.filter((it) => {
    const matchesSearch =
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.sku.toLowerCase().includes(search.toLowerCase()) ||
      it.sub_category.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (typeFilter === "ALL") return true;
    if (typeFilter === "Prepared Food") return it.item_type === "Prepared Food" || it.category === "FG-Rest";
    if (typeFilter === "Packed Food") return it.item_type === "Packed Food";
    if (typeFilter === "Custom Package") return it.is_custom_package || it.item_type === "Custom Package";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center gap-2 shadow-md transition-all ${
            toast.ok
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
          }`}
        >
          {toast.ok ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#081F5C] via-[#10307A] to-[#1E40AF] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              Enterprise Central Governance
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
              Item Admin & Commercial Governance
            </h1>
            <p className="text-sm text-slate-200">
              Prepared & Packed Food Master • Pricing & Rate Master • Customer Discounts & Festival Offers • Custom Combos (Dryfruit Thal)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-xs font-bold border border-white/20">
              Total Items: {items.length}
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold shadow-md">
              Promos Active: {promos.filter((p) => p.active).length}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition shadow-sm ${
            activeTab === "items"
              ? "bg-[#081F5C] text-white"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          Item Master (Prepared & Packed)
        </button>

        <button
          onClick={() => setActiveTab("rates")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition shadow-sm ${
            activeTab === "rates"
              ? "bg-[#081F5C] text-white"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Rate Master & Margin Governance
        </button>

        <button
          onClick={() => setActiveTab("promos")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition shadow-sm ${
            activeTab === "promos"
              ? "bg-[#081F5C] text-white"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Percent className="w-4 h-4" />
          Discounts & Festival Offers
        </button>

        <button
          onClick={() => setActiveTab("packages")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition shadow-sm ${
            activeTab === "packages"
              ? "bg-[#081F5C] text-white"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Gift className="w-4 h-4" />
          Custom Packages (Dryfruit Thal)
        </button>
      </div>

      {/* TAB 1: ITEM MASTER */}
      {activeTab === "items" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item name, SKU or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#081F5C]"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
                {["ALL", "Prepared Food", "Packed Food", "Custom Package"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setTypeFilter(f)}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      typeFilter === f
                        ? "bg-[#081F5C] text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadTemplate}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition"
                title="Download CSV template for bulk food & rate upload"
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Template (CSV)
              </button>

              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Bulk Upload Items & Rates
              </button>

              <button
                onClick={() => {
                  fetchNextItemSku();
                  setShowItemModal(true);
                }}
                className="px-4 py-2 bg-[#081F5C] hover:bg-[#10307A] text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow"
              >
                <Plus className="w-4 h-4" />
                Add New Food / Retail Item
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 text-center">Photo</th>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Kitchen Station</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">GST %</th>
                    <th className="py-3 px-4 text-center">POS UOM</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.slice(0, 100).map((it) => {
                    const { url, isBrandFallback } = getActualDishImage(it);
                    return (
                      <tr key={it.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedItemForImage(it)}
                            className="group/img relative inline-flex items-center justify-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#FAF8F5] dark:bg-slate-800 hover:border-amber-400 hover:shadow-md transition"
                            title="Click to upload or adjust photo from your system"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                              <img
                                src={url}
                                alt={it.name}
                                className={isBrandFallback ? "h-6 w-auto object-contain" : "w-full h-full object-cover"}
                              />
                            </div>
                            <span className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                              <Camera className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#081F5C] dark:text-sky-400">
                          {it.sku}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {it.name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                              it.item_type === "Packed Food"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                                : it.is_custom_package || it.item_type === "Custom Package"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            }`}
                          >
                            {it.item_type || (it.category === "FG-Rest" ? "Prepared Food" : "Retail")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {it.sub_category}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {it.kitchen_station || "Sweet Counter"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-500">
                          {formatINR(it.cost_price || 0)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatINR(it.selling_price || 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {it.gst_pct}%
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-mono">
                          {it.pos_uom}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedItemForImage(it)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800 shadow-sm transition"
                            title="Upload image from computer and auto-adjust to tile"
                          >
                            <Camera className="w-3 h-3 text-amber-600" />
                            <span>Photo</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
              <span>Showing {filteredItems.length} matching items</span>
              <span>Prepared & Packed Items catalog synchronized across all outlets</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RATE MASTER */}
      {activeTab === "rates" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Live Rate Master & Margin Optimizer
              </h2>
              <p className="text-xs text-slate-500">
                Adjust Base Cost, Selling Price (MRP), and GST slabs in real time. Changes take effect across Retail POS, Restaurant POS, and KIOSK.
              </p>
            </div>
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search items for rate update..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#081F5C]"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="max-h-[580px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Cost Price (₹)</th>
                    <th className="py-3 px-4">Selling MRP (₹)</th>
                    <th className="py-3 px-4 text-center">Gross Margin %</th>
                    <th className="py-3 px-4 text-center">GST Slab</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.slice(0, 100).map((it) => {
                    const edit = rateEdits[it.sku] || {
                      selling_price: it.selling_price || 0,
                      cost_price: it.cost_price || 0,
                      gst_pct: it.gst_pct || 5.0,
                    };
                    const margin =
                      edit.selling_price > 0
                        ? (((edit.selling_price - edit.cost_price) / edit.selling_price) * 100).toFixed(1)
                        : "0.0";
                    const isDirty =
                      rateEdits[it.sku] &&
                      (rateEdits[it.sku].selling_price !== it.selling_price ||
                        rateEdits[it.sku].cost_price !== it.cost_price ||
                        rateEdits[it.sku].gst_pct !== it.gst_pct);

                    return (
                      <tr key={it.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-[#081F5C] dark:text-sky-400">
                          {it.sku}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {it.name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600">
                            {it.item_type || "Prepared"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              value={edit.cost_price}
                              onChange={(e) =>
                                setRateEdits({
                                  ...rateEdits,
                                  [it.sku]: { ...edit, cost_price: parseFloat(e.target.value) || 0 },
                                })
                              }
                              className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 text-right focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              value={edit.selling_price}
                              onChange={(e) =>
                                setRateEdits({
                                  ...rateEdits,
                                  [it.sku]: { ...edit, selling_price: parseFloat(e.target.value) || 0 },
                                })
                              }
                              className="w-24 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right focus:outline-none"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                              parseFloat(margin) >= 40
                                ? "bg-emerald-100 text-emerald-800"
                                : parseFloat(margin) >= 20
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {margin}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={edit.gst_pct}
                            onChange={(e) =>
                              setRateEdits({
                                ...rateEdits,
                                [it.sku]: { ...edit, gst_pct: parseFloat(e.target.value) || 5.0 },
                              })
                            }
                            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                          >
                            <option value={0}>0% (Exempt)</option>
                            <option value={5}>5% (Food/Rest)</option>
                            <option value={12}>12% (Packaged/Dryfruit)</option>
                            <option value={18}>18% (Standard Retail)</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleSaveRate(it.sku)}
                            disabled={!isDirty}
                            className={`px-3 py-1 rounded-xl font-bold text-[11px] transition ${
                              isDirty
                                ? "bg-[#081F5C] text-white hover:bg-opacity-90 shadow"
                                : "bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed"
                            }`}
                          >
                            Save Rate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DISCOUNTS & FESTIVAL OFFERS */}
      {activeTab === "promos" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-500" />
                Customer Discounts & Festival Offers Governance
              </h2>
              <p className="text-xs text-slate-500">
                Configure seasonal festival offers (Diwali, Holi, New Year) and customer loyalty discounts with billing threshold and maximum cap protection.
              </p>
            </div>
            <button
              onClick={() => setShowPromoModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              Define New Festival Offer / Discount
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promos.map((p) => (
              <div
                key={p.id}
                className={`p-5 rounded-3xl border transition shadow-sm bg-white dark:bg-slate-900 ${
                  p.active
                    ? "border-amber-300 dark:border-amber-500/30"
                    : "border-slate-200 dark:border-slate-800 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
                        {p.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          p.target_audience === "DIRECTOR_OWNER"
                            ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
                            : p.target_audience === "EMPLOYEE"
                            ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                            : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                        }`}
                      >
                        {p.target_audience === "DIRECTOR_OWNER"
                          ? "👑 Director / Owner"
                          : p.target_audience === "EMPLOYEE"
                          ? "💼 Employee Perk"
                          : "🏮 Festival Offer"}
                      </span>
                      {p.is_item_wise && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          🎯 Item-Wise ({p.applicable_skus?.length || 0})
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{p.name}</h3>
                    {p.is_item_wise && p.applicable_item_names && p.applicable_item_names.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.applicable_item_names.map((itm, iIdx) => (
                          <span
                            key={iIdx}
                            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-medium text-slate-600 dark:text-slate-400"
                          >
                            {itm}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleTogglePromo(p.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                      p.active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {p.active ? "ACTIVE" : "PAUSED"}
                  </button>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Discount Value:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {p.rule_type === "PERCENT" ? `${p.value}% OFF` : `Flat ${formatINR(p.value)} OFF`}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Min Bill Amount:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      {formatINR(p.min_bill)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Max Discount Cap:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200">
                      {formatINR(p.max_cap)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Valid Dates:</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {p.valid_from || "Ongoing"} → {p.valid_to || "No expiry"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Usage Count:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {p.applied_count || 0} / {p.usage_limit || "Unlimited"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleDeletePromo(p.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Offer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOM PACKAGES (DRYFRUIT THAL) */}
      {activeTab === "packages" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-500" />
                  Custom Combo Packages & Dryfruit Thal Builder
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Bundle individual dryfruits (Almonds, Cashews, Walnuts, Pistachios) by precise grams + packaging plate (Thal / Velvet Box) with auto-calculated cost & selling price.
                </p>
              </div>

              <button
                onClick={handleSaveCustomPackage}
                className="px-5 py-2.5 bg-gradient-to-r from-[#081F5C] to-[#1E40AF] text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg hover:opacity-95"
              >
                <PackageCheck className="w-4 h-4" />
                Save & Publish Custom Thal Package
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form & Components */}
              <div className="lg:col-span-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Package SKU
                    </label>
                    <input
                      type="text"
                      value={pkgSku}
                      onChange={(e) => setPkgSku(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Package Name
                    </label>
                    <input
                      type="text"
                      value={pkgName}
                      onChange={(e) => setPkgName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Thal Base Plate details */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Packaging Base / Thal Plate Cost
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Plate / Base Type
                      </label>
                      <input
                        type="text"
                        value={pkgPlateName}
                        onChange={(e) => setPkgPlateName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Plate / Base Unit Cost (₹)
                      </label>
                      <input
                        type="number"
                        value={pkgPlatePrice}
                        onChange={(e) => setPkgPlatePrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Dryfruit Components List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Dryfruit Components Breakdown
                  </h4>
                  <div className="space-y-2">
                    {pkgComponents.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#081F5C] text-white flex items-center justify-center font-bold text-[10px]">
                            {i + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{c.item_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Weight: {c.weight_grams} grams
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatINR(c.unit_rate)}
                          </span>
                          <button
                            onClick={() => handleRemovePkgComponent(i)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Component Subform */}
                  <div className="p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center gap-2 mt-3">
                    <input
                      type="text"
                      placeholder="e.g. Kashmiri Mamra Almonds..."
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      className="flex-1 min-w-[160px] px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Grams"
                        value={newCompWeight}
                        onChange={(e) => setNewCompWeight(parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-right"
                      />
                      <span className="text-xs text-slate-500">g</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-500">₹</span>
                      <input
                        type="number"
                        placeholder="Cost Rate"
                        value={newCompRate}
                        onChange={(e) => setNewCompRate(parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-right font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPkgComponent}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Summary & Label Preview */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-[#081F5C] to-[#10307A] text-white space-y-4 shadow-lg">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Commercial Cost & Pricing Summary
                  </h3>

                  <div className="space-y-2 text-xs border-y border-white/10 py-3">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Total Net Dryfruit Wt:</span>
                      <span className="font-mono font-bold text-amber-300">{totalCompWeightGrams} grams</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Dryfruits Cost:</span>
                      <span className="font-bold">{formatINR(totalCompCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Thal / Plate Base:</span>
                      <span className="font-bold">{formatINR(pkgPlatePrice)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-white/10">
                      <span>Total Package Cost:</span>
                      <span className="text-amber-400">{formatINR(totalPackageCost)}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                    <div className="text-[11px] text-slate-300">Suggested Retail MRP (35% Margin)</div>
                    <div className="text-2xl font-extrabold text-white mt-1">
                      {formatINR(suggestedSellingPrice)}
                    </div>
                    <div className="text-[10px] text-emerald-300 mt-0.5">
                      Net Profit Margin: {formatINR(suggestedSellingPrice - totalPackageCost)} (35%)
                    </div>
                  </div>
                </div>

                {/* Packaging Tag Preview */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
                    <span>Gift Packaging Label</span>
                    <Printer className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {pkgName}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    SKU: {pkgSku} • Net Wt: {totalCompWeightGrams}g
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Includes: {pkgComponents.map((c) => `${c.item_name} (${c.weight_grams}g)`).join(", ")} + {pkgPlateName}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center font-bold">
                    <span className="text-slate-500">Retail MRP:</span>
                    <span className="text-base text-emerald-600">{formatINR(suggestedSellingPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD FOOD / RETAIL ITEM */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#081F5C]" />
                Add New Food / Retail Master Item
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      SKU Code *
                    </label>
                    <button
                      type="button"
                      onClick={fetchNextItemSku}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800"
                      title="Generate next auto-increment sequence code"
                    >
                      <Hash className="w-2.5 h-2.5" />
                      Auto-Sequence
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ITM-1061"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Item Type *
                  </label>
                  <select
                    value={newItemType}
                    onChange={(e) => {
                      setNewItemType(e.target.value);
                      if (e.target.value === "Packed Food") {
                        setNewCategory("FG-Sweet");
                        setNewSubCategory("Packed Snacks");
                        setNewPosUom("PACK");
                        setNewGstPct(12.0);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value="Prepared Food">Prepared Food (Restaurant Dish / Fresh Sweet)</option>
                    <option value="Packed Food">Packed Food (Retail Namkeen / Box)</option>
                    <option value="Custom Package">Custom Package (Combo Hamper)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shahi Paneer Special / Vacuum Packed Kaju Katli"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sub-Category
                  </label>
                  <input
                    type="text"
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kitchen Station
                  </label>
                  <select
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-medium"
                  >
                    <option value="North Indian Main">North Indian Main</option>
                    <option value="Tandoor & Breads">Tandoor & Breads</option>
                    <option value="Chaat & Snacks">Chaat & Snacks</option>
                    <option value="Mithai & Desserts">Mithai & Desserts</option>
                    <option value="South Indian">South Indian</option>
                    <option value="Continental & Fast Food">Continental & Fast Food</option>
                    <option value="Beverages & Lassi">Beverages & Lassi</option>
                    <option value="Thali & Combo">Thali & Combo</option>
                    <option value="Pantry & Bakery">Pantry & Bakery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cost Price (₹)
                  </label>
                  <input
                    type="number"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-right font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-right font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GST Rate %
                  </label>
                  <select
                    value={newGstPct}
                    onChange={(e) => setNewGstPct(parseFloat(e.target.value) || 5.0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    POS UOM
                  </label>
                  <input
                    type="text"
                    value={newPosUom}
                    onChange={(e) => setNewPosUom(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={newHsn}
                    onChange={(e) => setNewHsn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shelf Life (Days)
                  </label>
                  <input
                    type="number"
                    value={newShelfLife}
                    onChange={(e) => setNewShelfLife(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-center"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#081F5C] text-white font-bold hover:bg-opacity-90 shadow"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEFINE PROMO OFFER / FESTIVAL OFFER */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-500" />
                Define Festival Offer / Customer Discount
              </h3>
              <button
                onClick={() => setShowPromoModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Offer Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DIWALI25 / EMP20 / DIR100"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Privilege / Audience *
                  </label>
                  <select
                    value={promoTargetAudience}
                    onChange={(e) => {
                      setPromoTargetAudience(e.target.value);
                      if (e.target.value === "DIRECTOR_OWNER") {
                        setPromoValue(100);
                        setPromoMaxCap(5000);
                      } else if (e.target.value === "EMPLOYEE") {
                        setPromoValue(25);
                        setPromoMaxCap(1000);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value="FESTIVAL">🏮 Festival Offer (General Shoppers)</option>
                    <option value="EMPLOYEE">💼 Employee Perk (Staff 20-30%)</option>
                    <option value="DIRECTOR_OWNER">👑 Director / Owner Privilege</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Offer Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Maha Festive 20% Off"
                  value={promoName}
                  onChange={(e) => setPromoName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                />
              </div>

              {/* ITEM-WISE DISCOUNT ADD-ON */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promoIsItemWise}
                      onChange={(e) => setPromoIsItemWise(e.target.checked)}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <span>Enable Item-Wise Discount</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {promoIsItemWise ? `${promoApplicableSkus.length} Items Selected` : "Store-Wide (All Items)"}
                  </span>
                </div>

                {promoIsItemWise && (
                  <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search item name or SKU to add to discount (e.g. Kaju Katli, Rasgulla)..."
                        value={itemSearchFilter}
                        onChange={(e) => setItemSearchFilter(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>

                    {/* Search drop results */}
                    {itemSearchFilter.trim() && (
                      <div className="max-h-36 overflow-y-auto space-y-1 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        {items
                          .filter(
                            (it) =>
                              (it.name.toLowerCase().includes(itemSearchFilter.toLowerCase()) ||
                                it.sku.toLowerCase().includes(itemSearchFilter.toLowerCase())) &&
                              !promoApplicableSkus.includes(it.sku)
                          )
                          .slice(0, 5)
                          .map((it) => (
                            <div
                              key={it.sku}
                              className="flex items-center justify-between p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{it.name}</span>{" "}
                                <span className="font-mono text-[10px] text-slate-400">({it.sku})</span>
                                <span className="text-[10px] text-emerald-600 font-bold ml-1.5">₹{it.selling_price}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPromoApplicableSkus([...promoApplicableSkus, it.sku]);
                                  setPromoApplicableItemNames([...promoApplicableItemNames, it.name]);
                                  setItemSearchFilter("");
                                }}
                                className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700"
                              >
                                + Add
                              </button>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Selected Item Pills */}
                    {promoApplicableSkus.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {promoApplicableSkus.map((sku, idx) => (
                          <span
                            key={sku}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-[11px] text-slate-800 dark:text-slate-200"
                          >
                            <span>{promoApplicableItemNames[idx] || sku}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPromoApplicableSkus(promoApplicableSkus.filter((_, i) => i !== idx));
                                setPromoApplicableItemNames(promoApplicableItemNames.filter((_, i) => i !== idx));
                              }}
                              className="text-slate-400 hover:text-rose-600 ml-0.5"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Rule
                  </label>
                  <select
                    value={promoRule}
                    onChange={(e) => setPromoRule(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value="PERCENT">Percentage Discount (%)</option>
                    <option value="FLAT">Flat Cash Discount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Value ({promoRule === "PERCENT" ? "%" : "₹"}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={promoValue}
                    onChange={(e) => setPromoValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Min Bill Requirement (₹)
                  </label>
                  <input
                    type="number"
                    value={promoMinBill}
                    onChange={(e) => setPromoMinBill(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-right font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Maximum Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    value={promoMaxCap}
                    onChange={(e) => setPromoMaxCap(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-right font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valid From Date
                  </label>
                  <input
                    type="date"
                    value={promoValidFrom}
                    onChange={(e) => setPromoValidFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valid Till Date
                  </label>
                  <input
                    type="date"
                    value={promoValidTo}
                    onChange={(e) => setPromoValidTo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 shadow"
                >
                  Publish Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: BULK UPLOAD ITEMS & RATES */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-emerald-600" />
                  Bulk Upload Master Items & Rates
                </h3>
                <p className="text-xs text-slate-500">
                  Batch upload hundreds of Prepared Food, Packed Namkeen/Sweets & Rates via CSV / Excel
                </p>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Upload Box */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition space-y-3 bg-slate-50/50 dark:bg-slate-800/50">
                <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select CSV File from your computer
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Supports columns: sku, name, category, sub_category, item_type, pos_uom, selling_price, cost_price, gst_pct, hsn_code
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow transition">
                  <FileUp className="w-4 h-4" />
                  Browse CSV File
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Template & Direct Paste Box */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Or Paste CSV Data Directly:
                  </label>
                  <button
                    onClick={handleDownloadTemplate}
                    className="text-[11px] text-blue-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Download CSV Template
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={bulkCsvText}
                  onChange={(e) => {
                    setBulkCsvText(e.target.value);
                    parseCsvData(e.target.value);
                  }}
                  placeholder="sku,name,category,sub_category,item_type,pos_uom,selling_price,cost_price,gst_pct,hsn_code&#10;ITM-9001,Almond Biscotti 250g,FG-Sweet,Cookies & Bakery,Packed Food,PACK,180.00,95.00,12.0,190531"
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Parsed Preview Table */}
            {bulkParsedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Parsed Items Ready to Ingest: <b className="text-emerald-600">{bulkParsedItems.length}</b>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Existing SKUs will have their rates and metadata updated; new SKUs will be added to Item Master.
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-600 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3 text-right">Cost Price</th>
                        <th className="py-2 px-3 text-right">Selling Price</th>
                        <th className="py-2 px-3 text-center">GST %</th>
                        <th className="py-2 px-3 text-center">UOM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {bulkParsedItems.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 font-mono font-bold text-[#081F5C] dark:text-sky-400">
                            {row.sku}
                          </td>
                          <td className="py-2 px-3">{row.name}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 dark:bg-slate-800 font-bold">
                              {row.item_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{formatINR(row.cost_price)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">{formatINR(row.selling_price)}</td>
                          <td className="py-2 px-3 text-center">{row.gst_pct}%</td>
                          <td className="py-2 px-3 text-center font-mono">{row.pos_uom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bulkParsedItems.length > 50 && (
                  <p className="text-[11px] text-slate-400 italic text-center">
                    Showing first 50 rows of {bulkParsedItems.length} parsed items.
                  </p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkCsvText("");
                  setBulkParsedItems([]);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkParsedItems.length === 0 || isUploadingBulk}
                onClick={handleExecuteBulkUpload}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold flex items-center gap-2 shadow"
              >
                {isUploadingBulk ? (
                  <>Processing...</>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Ingest {bulkParsedItems.length} Items & Rates
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Image Uploader & Auto-Tile Adjuster Modal */}
      {selectedItemForImage && (
        <ItemImageUploadModal
          item={selectedItemForImage}
          onClose={() => setSelectedItemForImage(null)}
          onUpdated={(updated) => {
            setItems((prev) => prev.map((x) => (x.sku === updated.sku ? updated : x)));
            notify(true, `Dish image for ${updated.name} updated!`);
          }}
        />
      )}
    </div>
  );
};
