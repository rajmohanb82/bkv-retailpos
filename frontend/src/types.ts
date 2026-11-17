export type ModuleId =
  | "executive"
  | "pos"
  | "rest_pos"
  | "order_taking"
  | "kiosk"
  | "shop"
  | "oms"
  | "stores"
  | "factory"
  | "kot"
  | "vendor"
  | "admin"
  | "item_admin"
  | "reports"
  | "walkie_talkie";

export interface Outlet {
  id: number;
  code: string;
  name: string;
  legal_name: string;
  trade_name: string;
  ownership_type: "CO" | "Franchised" | "DO";
  outlet_type: "Restaurant" | "Sweet Shop" | "Restaurant + Sweet Shop" | "Manufacturing";
  gstin: string;
  gstn_verified: boolean;
  gstn_reg_type: string;
  fssai_no: string;
  fssai_expiry: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  property_type: string;
  royalty_pct: number;
  active: boolean;
  service_modes?: string[];
  floors?: string[];
  kitchen_counters?: string[];
  custom_categories?: string[];
  cash_counters?: string[];
  estimate_counters?: string[];
}

export interface ItemSku {
  id: number;
  sku: string;
  name: string;
  category: "RM" | "WIP" | "FG-Sweet" | "FG-Rest" | "Packaging";
  sub_category: string;
  purchase_uom: string;
  inventory_uom: string;
  pos_uom: string;
  conversion_factor: number;
  hsn_code: string;
  gst_pct: number;
  selling_price: number;
  cost_price: number;
  shelf_life_days: number;
  min_par_level: number;
  is_loose_weighed: boolean;
  default_tare_grams: number;
  kitchen_station: string | null;
  active: boolean;
  image_url?: string | null;
  item_type?: "Prepared Food" | "Packed Food" | "Custom Package" | string;
  is_custom_package?: boolean;
  package_components?: any[];
}

export interface PromoOffer {
  id: number;
  code: string;
  name: string;
  rule_type: "PERCENT" | "FLAT";
  value: number;
  min_bill: number;
  max_cap: number;
  stackable: boolean;
  outlet_scope: string;
  active: boolean;
  promo_type: "FESTIVAL_OFFER" | "CUSTOMER_DISCOUNT" | "HAPPY_HOUR" | string;
  valid_from?: string;
  valid_to?: string;
  usage_limit?: number;
  applied_count?: number;
  target_audience?: "FESTIVAL" | "EMPLOYEE" | "DIRECTOR_OWNER" | string;
  is_item_wise?: boolean;
  applicable_skus?: string[];
  applicable_item_names?: string[];
}

export interface MaterialRequisition {
  id: number;
  req_no: string;
  prod_no: string;
  factory_code: string;
  fg_sku: string;
  fg_name: string;
  planned_qty: number;
  uom: string;
  store_code: string;
  status: string;
  bom_items: Array<{
    rm_sku: string;
    rm_name: string;
    required_qty: number;
    uom: string;
    line_cost_est?: number;
  }>;
  issued_batches?: Array<{
    rm_sku: string;
    rm_name?: string;
    batch_no: string;
    qty: number;
    uom: string;
    unit_cost?: number;
  }>;
  requested_by: string;
  issued_by?: string;
  issued_at?: string;
  created_at: string;
}

export interface KettleStatus {
  id: string;
  name: string;
  type: string;
  capacity: string;
  temp_c: number;
  target_temp_c: number;
  pressure_bar: number;
  status: string;
  operator: string;
  active_batch: string;
  progress_pct: number;
  rpm: number;
}

export interface WorkflowStage {
  stage: number;
  key: string;
  label: string;
  title: string;
  desc: string;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING" | "ALERT";
  completed_at?: string | null;
  badge: string;
}

export interface OrderWorkflowTrack {
  order_ref: string;
  prod_no: string | null;
  source_ref: string;
  fg_sku: string;
  fg_name: string;
  qty: number;
  uom: string;
  factory_code: string;
  target_outlet_code: string;
  current_status: string;
  progress_pct: number;
  stages: WorkflowStage[];
}

export interface DiningTable {
  id: number;
  outlet_code: string;
  table_code: string;
  floor_name?: string;
  section: string;
  capacity: number;
  status: string;
  current_pax?: number;
  merged_with?: string | null;
}

export interface MasterCodeSequence {
  id: number;
  entity_type: "location" | "item" | "employee" | "vendor" | string;
  prefix: string;
  current_number: number;
  padding_length: number;
  reset_frequency: "NEVER" | "FINANCIAL_YEAR" | "ANNUAL" | "MONTHLY" | string;
  last_reset_date?: string;
  description: string;
}

export interface VendorDocument {
  id?: string;
  doc_type: "GST_CERTIFICATE" | "FSSAI_LICENSE" | "PAN_CARD" | "MSME_UDYAM" | "CANCELLED_CHEQUE" | "QUALITY_AUDIT" | string;
  doc_name: string;
  doc_number: string;
  file_url: string;
  valid_until?: string;
  verified: boolean;
  uploaded_at: string;
}

export interface VendorLetterheadPO {
  company: {
    legal_name: string;
    trade_name: string;
    corporate_office: string;
    cin: string;
    gstin: string;
    pan: string;
    fssai_no: string;
    state: string;
    state_code: string;
    email: string;
    phone: string;
  };
  doc_title: string;
  po: {
    id: number;
    po_no: string;
    po_date: string;
    delivery_date: string;
    status: string;
    vendor_code: string;
    vendor_name: string;
    total_amount: number;
    tax_amount: number;
    terms?: string;
    billing_address?: string;
    shipping_address?: string;
  };
  vendor: {
    vendor_code: string;
    legal_name: string;
    trade_name?: string;
    gstin: string;
    pan: string;
    fssai_no?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    contact_person?: string;
    mobile?: string;
    email?: string;
    msme?: boolean;
    msme_reg_no?: string;
  };
  items: Array<{
    item_code: string;
    item_name: string;
    hsn_code: string;
    quantity: number;
    uom: string;
    unit_price: number;
    gst_rate: number;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    total_amount: number;
  }>;
  tax_summary: {
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    total_tax: number;
    grand_total: number;
    amount_in_words: string;
  };
  statutory_clauses: string[];
  digital_signature: {
    authorized_signatory: string;
    designation: string;
    timestamp: string;
    signature_hash: string;
  };
}

export interface VendorPortalDashboard {
  vendor: {
    id: number;
    vendor_code: string;
    legal_name: string;
    trade_name: string;
    contact_person: string;
    mobile: string;
    email: string;
    pan: string;
    gstin: string;
    gstn_verified: boolean;
    fssai_no: string;
    fssai_expiry: string;
    bank_name?: string;
    bank_branch?: string;
    bank_account: string;
    ifsc: string;
    msme: boolean;
    msme_reg_no?: string;
    msme_category?: string;
    payment_terms: string;
    status: string;
    regions: string[];
    quality_rating: number;
    lead_time_days: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    documents?: VendorDocument[];
  };
  inbox: Array<{
    id: string;
    type: "PO_RELEASED" | "TENDER_INVITE" | "PAYMENT_ADVICE" | "QUALITY_ALERT" | string;
    title: string;
    reference_no: string;
    message: string;
    date: string;
    status: "UNREAD" | "READ";
    action_required?: boolean;
    action_type?: string;
    po_id?: number;
  }>;
  contract_rates: Array<{
    id: number;
    vendor_code: string;
    rm_sku: string;
    rate_per_uom: number;
    min_order_qty: number;
    valid_from: string;
    valid_to: string;
    active: boolean;
  }>;
  purchase_orders: any[];
  tenders: any[];
  multi_location_inventory?: Array<{
    outlet_code: string;
    outlet_name: string;
    store_code: string;
    store_name: string;
    item_sku: string;
    item_name: string;
    current_stock: number;
    inventory_uom: string;
    par_level: number;
  }>;
  inventory_levels: Array<{
    outlet_code: string;
    outlet_name: string;
    store_code: string;
    store_name: string;
    item_sku: string;
    item_name: string;
    current_stock: number;
    inventory_uom: string;
    par_level: number;
  }>;
  pending_bills: Array<{
    po_no: string;
    invoice_no?: string;
    invoice_amount?: number;
    total_amount: number;
    status: string;
    three_way_match_status?: string;
    created_at: string;
  }>;
}

export interface UserAccount {
  id: number;
  username: string;
  display_name: string;
  role: string;
  roles?: string[];
  outlet_code: string;
  allowed_outlets?: string[];
  active: boolean;
  is_locked?: boolean;
  failed_attempts?: number;
  pin?: string;
  created_at?: string;
}

export interface BrandingConfig {
  customer_name: string;
  customer_trade_name?: string;
  customer_logo_url: string;
  customer_logo_dark_url?: string;
  customer_logo_base64?: string;
  dual_logo_mode: boolean;
  customer_logo_height_px: number;
  brand_tagline?: string;
  show_annavya_powered_by?: boolean;
}

export interface AggregatorOrder {
  id: number;
  platform: "ZOMATO" | "SWIGGY";
  aggregator_order_id: string;
  display_order_no: string;
  outlet_code: string;
  customer_name: string;
  customer_mobile: string;
  delivery_address: string;
  items: Array<{ name: string; qty: number; price: number }>;
  item_total: number;
  taxes: number;
  delivery_fee: number;
  packing_charge: number;
  grand_total: number;
  status: "PLACED" | "ACCEPTED" | "FOOD_READY" | "PICKED_UP" | "DELIVERED" | "DECLINED";
  prep_time_mins: number;
  decline_reason?: string;
  decline_comment?: string;
  rider_name?: string;
  rider_mobile?: string;
  otp_code?: string;
  placed_at: string;
  accepted_at?: string;
  ready_at?: string;
  picked_up_at?: string;
  created_at: string;
}

export interface PaymentGatewaysConfig {
  upi: {
    provider: string;
    vpa: string;
    merchant_id: string;
    soundbox_enabled: boolean;
    dynamic_qr_enabled: boolean;
  };
  edc_card: {
    provider: string;
    tid: string;
    connection_type: string;
    device_ip: string;
    port: number;
    auto_settlement: boolean;
  };
  food_coupons: {
    sodexo_pluxee_enabled: boolean;
    edenred_enabled: boolean;
    merchant_code: string;
    food_only_restriction: boolean;
  };
}
