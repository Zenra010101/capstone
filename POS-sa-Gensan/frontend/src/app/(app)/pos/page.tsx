"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Barcode, Check, Search, Trash2, Plus, Minus, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { cachedGet, ReferenceKeys, REFERENCE_TTL_MS } from "@/lib/reference-cache";
import { formatCurrency, formatProductSpec } from "@/lib/format";
import { asList, type ListResponse } from "@/lib/api-shapes";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import type { BatchAllocationResult, CartItem, Category, Customer, Product, Sale, StoreSettings } from "@/lib/types";
import { ChequeType, PaymentMethod } from "@/lib/types";
import { BatchAllocationWarningDialog } from "@/components/pos/batch-allocation-warning-dialog";
import {
  buildCheckoutItems,
  cartItemLineTotal,
  cartItemDisplayPrice,
  mapAllocationLines,
} from "@/lib/cart-batch";
import { CartBatchBreakdown } from "@/components/pos/cart-batch-breakdown";
import { CheckoutPaymentDialog } from "@/components/pos/checkout-payment-dialog";
import {
  buildSplitPayload,
  computeSplitSummary,
  newSplitTender,
  validateSplit,
  type SplitTender,
} from "@/components/pos/split-payment-builder";
import { CartReviewDialog } from "@/components/pos/cart-review-dialog";
import { SaleReceiptDialog } from "@/components/pos/sale-receipt-dialog";
import { OrderTaxControls } from "@/components/pos/order-tax-controls";
import { SaleTaxSummary } from "@/components/pos/sale-tax-summary";
import {
  computeSaleTax,
  SaleTaxMode,
  type ManualTaxInput,
  type SaleTaxModeValue,
} from "@/lib/tax";
import { dueDateFromTermsDays, termsDaysFromDueDate } from "@/lib/credit-terms";
import { PageHeader } from "@/components/page-header";
import { ConfirmDialog } from "@/components/enterprise/confirm-dialog";
import { EmptyState } from "@/components/enterprise/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { playScanErrorBeep, playScanSuccessBeep } from "@/lib/scan-beep";
import { normalizeScannedBarcode, useBarcodeScanner } from "@/lib/use-barcode-scanner";
import { PosProductTile } from "@/components/pos/pos-product-tile";
import type { Paged } from "@/lib/types";

/** Keep POS grid small when browsing All — 766+ SKUs freezes the browser with a full render. */
const POS_ALL_PAGE_SIZE = 48;
const POS_FILTERED_PAGE_SIZE = 120;

export default function PosPage() {
  const searchParams = useSearchParams();
  const { isRole } = useAuth();
  const isOwner = isRole("Owner");
  const [products, setProducts] = useState<Product[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const scannerCaptureRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTypingRef = useRef(false);
  const searchIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barcodeProcessingRef = useRef(false);
  const processBarcodeRef = useRef<(raw: string) => void>(() => {});

  type AddToCartResult = "added" | "batch_warning" | "failed";
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);
  const [taxMode, setTaxMode] = useState<SaleTaxModeValue>(SaleTaxMode.None);
  const [manualTax, setManualTax] = useState<ManualTaxInput>({
    name: "",
    isPercent: true,
    value: 0,
    isDeduction: false,
  });
  const [paymentMethod, setPaymentMethod] = useState<number>(PaymentMethod.Cash);
  const [qrphReference, setQrphReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [senderName, setSenderName] = useState("");
  const [cartReviewOpen, setCartReviewOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [creditTermsDays, setCreditTermsDays] = useState(30);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [chequeType, setChequeType] = useState<number>(ChequeType.Current);
  const [chequeBank, setChequeBank] = useState("");
  const [chequeBranch, setChequeBranch] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeAccount, setChequeAccount] = useState("");
  const [chequeMaturity, setChequeMaturity] = useState("");
  const [splitTenders, setSplitTenders] = useState<SplitTender[]>([]);
  const [processing, setProcessing] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastReceiptTermsDays, setLastReceiptTermsDays] = useState(30);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [batchWarningOpen, setBatchWarningOpen] = useState(false);
  const [pendingAllocation, setPendingAllocation] = useState<{
    product: Product;
    allocation: BatchAllocationResult;
    discount: number;
  } | null>(null);

  const loadProducts = useCallback(
    async (page = 1, append = false) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      const filteredBrowse = Boolean(search.trim() || selectedCategory);
      params.set(
        "pageSize",
        String(filteredBrowse ? POS_FILTERED_PAGE_SIZE : POS_ALL_PAGE_SIZE)
      );
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategory) params.set("categoryId", selectedCategory);

      if (append) setLoadingMoreProducts(true);
      else setLoadingProducts(true);

      try {
        const data = await api.get<Paged<Product>>(`/api/products?${params}`);
        const inStock = data.items.filter((p) => p.isActive && p.stockQuantity > 0);
        setProductTotal(data.totalCount);
        setProductPage(page);
        setProducts((prev) => {
          if (!append) return inStock;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...inStock.filter((p) => !seen.has(p.id))];
        });
      } finally {
        setLoadingProducts(false);
        setLoadingMoreProducts(false);
      }
    },
    [search, selectedCategory]
  );

  const hasMoreProducts = products.length < productTotal;

  useEffect(() => {
    cachedGet(ReferenceKeys.categoriesActive, REFERENCE_TTL_MS, () =>
      api.get<ListResponse<Category>>("/api/categories?withActiveProductsOnly=true")
    ).then((data) => setCategories(asList(data))).catch(() => {});
    api.get<ListResponse<Customer>>("/api/customers?page=0").then((data) => setCustomers(asList(data))).catch(() => {});
    cachedGet(ReferenceKeys.settings, REFERENCE_TTL_MS, () =>
      api.get<StoreSettings>("/api/settings")
    ).then(setStoreSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const id = searchParams.get("customerId");
    if (id) setCustomerId(id);
  }, [searchParams]);

  useDebouncedEffect(() => {
    void loadProducts(1, false);
  }, [loadProducts], 300);

  const focusScannerCapture = useCallback(() => {
    if (searchTypingRef.current) return;
    requestAnimationFrame(() => {
      scannerCaptureRef.current?.focus();
      scannerCaptureRef.current?.select();
    });
  }, []);

  useEffect(() => {
    return () => {
      if (searchIdleTimerRef.current) clearTimeout(searchIdleTimerRef.current);
      if (captureIdleTimerRef.current) clearTimeout(captureIdleTimerRef.current);
      if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
    };
  }, []);

  const posDialogOpen =
    cartReviewOpen ||
    checkoutOpen ||
    receiptOpen ||
    cancelConfirmOpen ||
    batchWarningOpen;

  const scannerEnabled = !posDialogOpen;

  useBarcodeScanner(scannerEnabled, (code) => {
    processBarcodeRef.current(code);
  });

  useEffect(() => {
    if (posDialogOpen) return;
    const timer = setTimeout(() => focusScannerCapture(), 80);
    return () => clearTimeout(timer);
  }, [posDialogOpen, focusScannerCapture]);

  useEffect(() => {
    if (posDialogOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (searchTypingRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest("#pos-barcode-input")) return;
      if (target.closest('[aria-label="Search products"]')) return;
      if (target.closest("[data-pos-cart]")) return;
      if (target.closest("button, a, [role='button']")) return;
      setTimeout(() => focusScannerCapture(), 0);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [posDialogOpen, focusScannerCapture]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + cartItemLineTotal(item), 0),
    [cart]
  );
  const saleTax = useMemo(
    () =>
      computeSaleTax({
        subTotal: subtotal,
        discountPercent: orderDiscountPercent,
        taxMode,
        manualTax: taxMode === SaleTaxMode.Manual ? manualTax : undefined,
      }),
    [subtotal, orderDiscountPercent, taxMode, manualTax]
  );
  const total = saleTax.total;
  const taxAmount = saleTax.taxAmount;
  const withholdingAmount = saleTax.withholdingAmount;
  const amountPaidNum = useMemo(
    () => parseFloat(amountPaid) || 0,
    [amountPaid]
  );
  const change = useMemo(
    () => Math.max(amountPaidNum - total, 0),
    [amountPaidNum, total]
  );
  const cashShort = useMemo(
    () =>
      paymentMethod === PaymentMethod.Cash && amountPaidNum > 0 && amountPaidNum < total
        ? total - amountPaidNum
        : 0,
    [paymentMethod, amountPaidNum, total]
  );
  const splitSummary = useMemo(
    () => computeSplitSummary(splitTenders, total),
    [splitTenders, total]
  );
  const splitError = useMemo(
    () =>
      paymentMethod === PaymentMethod.Split
        ? validateSplit(splitTenders, splitSummary, customerId, customerName)
        : null,
    [paymentMethod, splitTenders, splitSummary, customerId, customerName]
  );

  const applyAllocation = useCallback(
    (product: Product, allocation: BatchAllocationResult, discount = 0) => {
        const lines = mapAllocationLines(allocation.lines ?? []);
      const qty = allocation.requestedQuantity;
      setCart((prev) => {
        const existing = prev.find((i) => i.product.id === product.id);
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: qty, batchLines: lines, discount }
              : i
          );
        }
        return [...prev, { product, quantity: qty, discount, batchLines: lines }];
      });
    },
    []
  );

  const requestAllocation = useCallback(
    async (product: Product, quantity: number, discount = 0): Promise<AddToCartResult> => {
      try {
        const allocation = await api.post<BatchAllocationResult>(
          `/api/products/${product.id}/allocate-batches`,
          { quantity }
        );
        if (allocation.insufficientStock) {
          const available = allocation.availableTotal;
          toast.error(
            available > 0
              ? `Only ${available} ${product.unitOfMeasure} available`
              : `${product.name} is out of stock`
          );
          return "failed";
        }
        if (allocation.needsWarning) {
          setPendingAllocation({ product, allocation, discount });
          setBatchWarningOpen(true);
          return "batch_warning";
        }
        applyAllocation(product, allocation, discount);
        return "added";
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Could not check stock batches");
        return "failed";
      }
    },
    [applyAllocation]
  );

  const confirmPendingAllocation = () => {
    if (!pendingAllocation) return;
    applyAllocation(
      pendingAllocation.product,
      pendingAllocation.allocation,
      pendingAllocation.discount
    );
    setPendingAllocation(null);
    setBatchWarningOpen(false);
  };

  const selectPendingBatch = async (batchId: string) => {
    if (!pendingAllocation) return;
    const { product, allocation, discount } = pendingAllocation;
    try {
      const selected = await api.post<BatchAllocationResult>(
        `/api/products/${product.id}/allocate-batches`,
        { quantity: allocation.requestedQuantity, preferredBatchId: batchId }
      );
      applyAllocation(product, selected, discount);
      setPendingAllocation(null);
      setBatchWarningOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not select stock batch");
    }
  };

  const addToCart = useCallback(
    async (product: Product): Promise<AddToCartResult> => {
      const existing = cartRef.current.find((i) => i.product.id === product.id);
      const nextQty = existing ? existing.quantity + 1 : 1;
      if (nextQty > product.stockQuantity) {
        toast.error("Not enough stock");
        return "failed";
      }
      return requestAllocation(product, nextQty, existing?.discount ?? 0);
    },
    [requestAllocation]
  );

  const updateQty = async (productId: string, delta: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;
    const qty = item.quantity + delta;
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    if (qty > item.product.stockQuantity) {
      toast.error("Not enough stock");
      return;
    }
    await requestAllocation(item.product, qty, item.discount);
  };

  const setQtyExact = async (productId: string, qty: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;
    const q = Math.floor(qty);
    if (q <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    if (q > item.product.stockQuantity) {
      toast.error(`Max stock: ${item.product.stockQuantity}`);
      await requestAllocation(item.product, item.product.stockQuantity, item.discount);
      return;
    }
    await requestAllocation(item.product, q, item.discount);
  };

  const cancelOrder = () => {
    setCart([]);
    setOrderDiscountPercent(0);
    setTaxMode(SaleTaxMode.None);
    setManualTax({
      name: "",
      isPercent: true,
      value: 0,
      isDeduction: false,
    });
    setSearch("");
    if (searchIdleTimerRef.current) {
      clearTimeout(searchIdleTimerRef.current);
      searchIdleTimerRef.current = null;
    }
    toast.message("Order cancelled — stock is unchanged until checkout completes");
    setTimeout(() => focusScannerCapture(), 100);
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const showScanFeedback = useCallback(
    (type: "success" | "error", message: string) => {
      if (scanFeedbackTimerRef.current) clearTimeout(scanFeedbackTimerRef.current);
      setScanFeedback({ type, message });
      scanFeedbackTimerRef.current = setTimeout(() => {
        setScanFeedback(null);
        scanFeedbackTimerRef.current = null;
      }, 1800);
    },
    []
  );

  const processBarcodeScan = useCallback(
    async (raw: string) => {
      const code = normalizeScannedBarcode(raw);
      if (!code || barcodeProcessingRef.current) return;

      barcodeProcessingRef.current = true;
      setLastScannedCode(code);
      setScanFeedback(null);
      try {
        const product = await api.get<Product>(
          `/api/products/barcode/${encodeURIComponent(code)}`
        );
        if (!product.isActive || product.stockQuantity <= 0) {
          playScanErrorBeep();
          showScanFeedback("error", `${product.name} is out of stock`);
          return;
        }
        const existing = cart.find((i) => i.product.id === product.id);
        const result = await addToCart(product);
        if (result === "batch_warning") {
          playScanErrorBeep();
          showScanFeedback(
            "error",
            "Multiple batches needed — tap Continue in the dialog to add to cart"
          );
          return;
        }
        if (result === "failed") {
          playScanErrorBeep();
          showScanFeedback("error", "Could not add to cart — check stock");
          return;
        }

        playScanSuccessBeep();
        showScanFeedback(
          "success",
          existing
            ? `Product scanned — ${product.name} (${existing.quantity + 1} in cart)`
            : `Product scanned successfully — ${product.name}`
        );
      } catch (err) {
        playScanErrorBeep();
        const message =
          err instanceof ApiError && err.message
            ? err.message
            : "Barcode not found";
        showScanFeedback("error", message);
      } finally {
        barcodeProcessingRef.current = false;
        setSearch("");
        if (scannerCaptureRef.current) scannerCaptureRef.current.value = "";
        focusScannerCapture();
      }
    },
    [cart, addToCart, focusScannerCapture, showScanFeedback]
  );

  processBarcodeRef.current = (raw) => {
    void processBarcodeScan(raw);
  };

  useEffect(() => {
    const el = scannerCaptureRef.current;
    if (!el || !scannerEnabled) return;

    const clearCaptureIdle = () => {
      if (captureIdleTimerRef.current) {
        clearTimeout(captureIdleTimerRef.current);
        captureIdleTimerRef.current = null;
      }
    };

    const submitCapture = (input: HTMLInputElement) => {
      const code = input.value;
      input.value = "";
      clearCaptureIdle();
      if (!code.trim()) return;
      void processBarcodeScan(code);
    };

    const onInput = () => {
      clearCaptureIdle();
      captureIdleTimerRef.current = setTimeout(() => submitCapture(el), 300);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== "Tab") return;
      e.preventDefault();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => submitCapture(el));
      });
    };

    el.addEventListener("input", onInput);
    el.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("input", onInput);
      el.removeEventListener("keydown", onKeyDown);
      clearCaptureIdle();
    };
  }, [scannerEnabled, processBarcodeScan]);

  const looksLikeProductBarcode = (raw: string) => {
    const code = normalizeScannedBarcode(raw);
    return code.length >= 10 && /^GSP\d+$/i.test(code);
  };

  const submitSearchAsBarcode = (raw: string) => {
    const code = normalizeScannedBarcode(raw);
    // Only route scanner-like values to barcode lookup.
    // Typed/pasted SKU or product names should remain normal text search.
    if (!looksLikeProductBarcode(code)) return false;
    if (searchIdleTimerRef.current) {
      clearTimeout(searchIdleTimerRef.current);
      searchIdleTimerRef.current = null;
    }
    setSearch("");
    void processBarcodeScan(code);
    return true;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (searchIdleTimerRef.current) clearTimeout(searchIdleTimerRef.current);
    searchIdleTimerRef.current = setTimeout(() => {
      if (looksLikeProductBarcode(value)) {
        submitSearchAsBarcode(value);
      }
    }, 300);
  };

  const handleBarcode = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" && e.key !== "Tab") return;
    const input = e.currentTarget;
    if (!looksLikeProductBarcode(input.value)) return;
    e.preventDefault();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        submitSearchAsBarcode(input.value);
      });
    });
  };

  const handleSearchPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted.trim()) return;
    const input = e.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const raw = pasted.trim();
    if (!raw) return;

    e.preventDefault();

    if (looksLikeProductBarcode(raw)) {
      setSearch("");
      void processBarcodeScan(raw);
      return;
    }

    // Non-barcode paste (SKU / product name): apply exactly once at cursor/selection.
    const next = `${input.value.slice(0, start)}${raw}${input.value.slice(end)}`;
    setSearch(next);
  };

  const openCheckout = () => {
    if (!cart.length) {
      toast.error("Cart is empty");
      return;
    }
    setCartReviewOpen(true);
  };

  const proceedToPayment = () => {
    if (
      paymentMethod === PaymentMethod.Charged ||
      paymentMethod === PaymentMethod.Cheque ||
      paymentMethod === PaymentMethod.Cash
    ) {
      setAmountPaid("0");
    } else {
      setAmountPaid(total > 0 ? total.toFixed(2) : "0");
    }
    setCreditTermsDays(30);
    setDueDate(dueDateFromTermsDays(30));
    setChequeMaturity(new Date().toISOString().slice(0, 10));
    setCartReviewOpen(false);
    setCheckoutOpen(true);
  };

  const handlePaymentMethodChange = (method: number) => {
    setPaymentMethod(method);
    if (method === PaymentMethod.Split && splitTenders.length === 0) {
      setSplitTenders([
        newSplitTender(PaymentMethod.Cash, ""),
        newSplitTender(PaymentMethod.OnlineBank, ""),
      ]);
    }
  };

  const completeSale = async () => {
    if (taxMode === SaleTaxMode.Manual && manualTax.value <= 0) {
      toast.error("Enter a manual tax rate or amount");
      return;
    }

    if (paymentMethod === PaymentMethod.Split) {
      const err = validateSplit(splitTenders, splitSummary, customerId, customerName);
      if (err) {
        toast.error(err);
        return;
      }
      setProcessing(true);
      try {
        const sale = await api.post<Sale>("/api/sales", {
          items: buildCheckoutItems(cart),
          discountPercent: orderDiscountPercent,
          taxMode,
          manualTaxName:
            taxMode === SaleTaxMode.Manual ? manualTax.name || "Manual Tax" : undefined,
          manualTaxIsPercent: taxMode === SaleTaxMode.Manual ? manualTax.isPercent : false,
          manualTaxValue: taxMode === SaleTaxMode.Manual ? manualTax.value : 0,
          manualTaxIsDeduction:
            taxMode === SaleTaxMode.Manual ? manualTax.isDeduction : false,
          paymentMethod: PaymentMethod.Split,
          customerName: customerName || undefined,
          customerId: customerId || undefined,
          payments: buildSplitPayload(splitTenders),
        });
        setLastSale(sale);
        setCart([]);
        setOrderDiscountPercent(0);
        setTaxMode(SaleTaxMode.None);
        setManualTax({ name: "", isPercent: true, value: 0, isDeduction: false });
        setCustomerName("");
        setCustomerId("");
        setSplitTenders([]);
        setPaymentMethod(PaymentMethod.Cash);
        setCheckoutOpen(false);
        setReceiptOpen(true);
        toast.success("Split payment sale completed!");
        loadProducts(1, false);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Sale failed");
      } finally {
        setProcessing(false);
      }
      return;
    }

    const paid = parseFloat(amountPaid);
    if (isNaN(paid)) {
      toast.error("Invalid amount");
      return;
    }
    if (paymentMethod === PaymentMethod.Cash && paid < total) {
      toast.error("Insufficient payment amount");
      return;
    }
    if (paymentMethod === PaymentMethod.Charged) {
      if (!customerId && !customerName.trim()) {
        toast.error("Select or enter customer for charge sale");
        return;
      }
      if (!dueDate) {
        toast.error("Due date is required");
        return;
      }
      if (paid < 0 || paid > total) {
        toast.error("Down payment must be between 0 and total");
        return;
      }
    } else if (paymentMethod === PaymentMethod.OnlineBank) {
      if (!bankName.trim() || !bankBranch.trim() || !bankReference.trim() || !senderName.trim()) {
        toast.error("Online bank requires bank, branch/address, reference, and sender name");
        return;
      }
    } else if (paymentMethod === PaymentMethod.Cheque) {
      if (
        !chequeBank.trim() ||
        !chequeBranch.trim() ||
        !chequeNumber.trim() ||
        !chequeAccount.trim() ||
        !chequeMaturity
      ) {
        toast.error("Complete all cheque fields including branch/address");
        return;
      }
    } else if (paymentMethod !== PaymentMethod.Cash && paid !== total) {
      toast.error("Amount must match total exactly");
      return;
    }
    setProcessing(true);
    try {
      const sale = await api.post<Sale>("/api/sales", {
        items: buildCheckoutItems(cart),
        discountPercent: orderDiscountPercent,
        taxMode,
        manualTaxName:
          taxMode === SaleTaxMode.Manual ? manualTax.name || "Manual Tax" : undefined,
        manualTaxIsPercent: taxMode === SaleTaxMode.Manual ? manualTax.isPercent : false,
        manualTaxValue: taxMode === SaleTaxMode.Manual ? manualTax.value : 0,
        manualTaxIsDeduction: taxMode === SaleTaxMode.Manual ? manualTax.isDeduction : false,
        amountPaid:
          paymentMethod === PaymentMethod.Charged
            ? paid
            : paymentMethod === PaymentMethod.Cheque
              ? 0
              : paid,
        paymentMethod,
        qrphReference: paymentMethod === PaymentMethod.QRPH ? qrphReference : undefined,
        onlineBank:
          paymentMethod === PaymentMethod.OnlineBank
            ? {
                bankName,
                branch: bankBranch,
                referenceNumber: bankReference,
                senderName,
                datePaid: new Date().toISOString(),
              }
            : undefined,
        customerName: customerName || undefined,
        customerId: customerId || undefined,
        dueDate:
          paymentMethod === PaymentMethod.Charged
            ? new Date(dueDate).toISOString()
            : undefined,
        cheque:
          paymentMethod === PaymentMethod.Cheque
            ? {
                type: chequeType,
                bankName: chequeBank,
                branch: chequeBranch || undefined,
                chequeNumber,
                accountName: chequeAccount,
                maturityDate: new Date(chequeMaturity).toISOString(),
              }
            : undefined,
      });
      setLastSale(sale);
      if (paymentMethod === PaymentMethod.Charged) {
        setLastReceiptTermsDays(creditTermsDays);
      }
      setCart([]);
      setOrderDiscountPercent(0);
      setTaxMode(SaleTaxMode.None);
      setManualTax({ name: "", isPercent: true, value: 0, isDeduction: false });
      setCustomerName("");
      setCustomerId("");
      setDueDate("");
      setCreditTermsDays(30);
      setCheckoutOpen(false);
      setReceiptOpen(true);
      toast.success(
        paymentMethod === PaymentMethod.Charged
          ? paid > 0
            ? "Charged sale with down payment recorded"
            : "Charged sale recorded - balance on receivables"
          : paymentMethod === PaymentMethod.Cheque
            ? "Sale recorded - cheque pending clearance"
            : "Sale completed!"
      );
      loadProducts(1, false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Sale failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col md:h-[calc(100dvh-4.5rem)] md:max-h-[calc(100dvh-4.5rem)] md:overflow-hidden">
      <PageHeader
        title="Point of Sale"
        description="Sell stainless pipes, sheets, fittings, and hardware"
      />

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-12 md:overflow-hidden">
        <div className="order-2 flex min-h-0 flex-col space-y-4 md:order-1 md:col-span-7 md:overflow-y-auto md:overscroll-contain xl:col-span-8">
          <div className="flex flex-wrap gap-2">
            <Button variant={selectedCategory === null ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setSelectedCategory(null)}>All</Button>
            {categories.map((c) => (
              <Button key={c.id} variant={selectedCategory === c.id ? "default" : "outline"} size="sm" className="max-w-[11rem] truncate rounded-full" onClick={() => setSelectedCategory(c.id)} title={c.name}>{c.name}</Button>
            ))}
          </div>
          <div className="relative">
            <input
              id="pos-barcode-input"
              ref={scannerCaptureRef}
              type="text"
              className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0"
              defaultValue=""
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Barcode scanner capture"
              tabIndex={-1}
            />
            {scanFeedback ? (
              <div
                className={`rounded-xl border-2 p-3 shadow-sm ${
                  scanFeedback.type === "success"
                    ? "border-green-400/80 bg-green-50/80"
                    : "border-red-400/80 bg-red-50/70"
                }`}
              >
                <p
                  className={`flex items-center gap-2 text-sm font-semibold ${
                    scanFeedback.type === "success" ? "text-green-800" : "text-red-800"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {scanFeedback.type === "success" ? (
                    <Check className="size-4 shrink-0" aria-hidden />
                  ) : (
                    <X className="size-4 shrink-0" aria-hidden />
                  )}
                  {scanFeedback.message}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                <Barcode className="size-4 shrink-0" aria-hidden />
                USB scanner ready — scan anytime (click search only to type by hand)
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              className="h-12 pl-10 text-base"
              placeholder="Search name, SKU, grade, or size..."
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleBarcode}
              onPaste={handleSearchPaste}
              onFocus={() => {
                searchTypingRef.current = true;
              }}
              onBlur={() => {
                searchTypingRef.current = false;
                focusScannerCapture();
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Search products"
            />
          </div>
          {lastScannedCode && !scanFeedback ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              Last scan: {lastScannedCode}
            </p>
          ) : null}

          {!selectedCategory && !search.trim() && productTotal > products.length ? (
            <p className="text-xs text-muted-foreground">
              Showing {products.length} of {productTotal} in-stock products — pick a category or search to
              narrow, or load more below.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {loadingProducts && !products.length ? (
              <div className="col-span-2 py-8 text-center text-sm text-muted-foreground xl:col-span-3">
                Loading products…
              </div>
            ) : null}
            {!loadingProducts && !products.length && (
              <div className="col-span-2 py-8 xl:col-span-3">
                <EmptyState
                  compact
                  title={search ? "No products match search" : "No products in stock"}
                  description={
                    search
                      ? "Try another keyword or scan a barcode."
                      : "Add stock via receiving or pick another category."
                  }
                />
              </div>
            )}
            {products.map((p) => (
              <PosProductTile key={p.id} product={p} onAdd={addToCart} />
            ))}
          </div>
          {hasMoreProducts ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loadingMoreProducts}
                onClick={() => void loadProducts(productPage + 1, true)}
              >
                {loadingMoreProducts ? "Loading…" : `Load more (${products.length} of ${productTotal})`}
              </Button>
            </div>
          ) : null}
        </div>

        <Card
          data-pos-cart
          className="relative z-20 order-1 grid max-h-[min(32rem,calc(100dvh-10rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-border/80 py-0 shadow-erp md:order-2 md:col-span-5 md:h-full md:max-h-full md:self-stretch xl:col-span-4"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-5 py-3.5">
            <span className="text-base font-semibold">Current Order</span>
            <Badge variant="secondary">{cart.length} items</Badge>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-32 items-center justify-center py-12 text-center text-sm text-muted-foreground">
                Tap products to add to cart
              </div>
            ) : (
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="rounded-lg border bg-slate-50/50 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="min-w-0 flex-1 line-clamp-2 break-words text-sm font-medium leading-snug"
                        title={item.product.name}
                      >
                        {item.product.name}
                      </p>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCurrency(cartItemLineTotal(item))}
                      </p>
                    </div>
                    <p
                      className="mt-0.5 line-clamp-2 break-words text-xs leading-snug text-muted-foreground"
                      title={
                        formatProductSpec(item.product)
                          ? `${formatCurrency(cartItemDisplayPrice(item))} / ${item.product.unitOfMeasure} — ${formatProductSpec(item.product)}`
                          : undefined
                      }
                    >
                      {formatCurrency(cartItemDisplayPrice(item))} / {item.product.unitOfMeasure}
                      {formatProductSpec(item.product)
                        ? ` — ${formatProductSpec(item.product)}`
                        : ""}
                    </p>
                    <CartBatchBreakdown item={item} />
                    <div className="mt-2 flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        aria-label={`Decrease quantity for ${item.product.name}`}
                        onClick={() => updateQty(item.product.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={item.product.stockQuantity}
                        inputMode="numeric"
                        aria-label={`Quantity for ${item.product.name}`}
                        className="h-8 w-14 shrink-0 px-1 text-center text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={item.quantity}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setQtyExact(item.product.id, 0);
                            return;
                          }
                          const v = parseInt(raw, 10);
                          if (!Number.isNaN(v)) setQtyExact(item.product.id, v);
                        }}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!v || v < 1) setQtyExact(item.product.id, 1);
                          else setQtyExact(item.product.id, v);
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 shrink-0"
                        aria-label={`Increase quantity for ${item.product.name}`}
                        onClick={() => updateQty(item.product.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto h-8 w-8 shrink-0 text-destructive"
                        aria-label={`Remove ${item.product.name} from cart`}
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative z-10 shrink-0 space-y-3 border-t bg-card px-5 pb-4 pt-3.5 shadow-[0_-6px_12px_-8px_rgba(15,23,42,0.12)] pointer-events-auto">
            <OrderTaxControls
              compact
              posSidebar
              discountPercent={orderDiscountPercent}
              onDiscountPercentChange={setOrderDiscountPercent}
              taxMode={taxMode}
              onTaxModeChange={setTaxMode}
              manualTax={manualTax}
              onManualTaxChange={(patch) =>
                setManualTax((m) => ({ ...m, ...patch }))
              }
            />
            <SaleTaxSummary subtotal={subtotal} tax={saleTax} largeTotal />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="destructive"
                className="h-11 flex-1 text-base"
                size="lg"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={!cart.length}
              >
                Cancel order
              </Button>
              <Button
                type="button"
                className="h-11 flex-1 text-base"
                size="lg"
                onClick={openCheckout}
                disabled={!cart.length}
              >
                Checkout
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <CartReviewDialog
        open={cartReviewOpen}
        onOpenChange={setCartReviewOpen}
        cart={cart}
        subtotal={subtotal}
        saleTax={saleTax}
        total={total}
        onProceed={proceedToPayment}
      />

      <CheckoutPaymentDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        processing={processing}
        cartItemCount={cart.length}
        subtotal={subtotal}
        saleTax={saleTax}
        total={total}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={handlePaymentMethodChange}
        amountPaid={amountPaid}
        onAmountPaidChange={setAmountPaid}
        amountPaidNum={amountPaidNum}
        change={change}
        cashShort={cashShort}
        qrphReference={qrphReference}
        onQrphReferenceChange={setQrphReference}
        bankName={bankName}
        onBankNameChange={setBankName}
        bankBranch={bankBranch}
        onBankBranchChange={setBankBranch}
        bankReference={bankReference}
        onBankReferenceChange={setBankReference}
        senderName={senderName}
        onSenderNameChange={setSenderName}
        chequeType={chequeType}
        onChequeTypeChange={setChequeType}
        chequeBank={chequeBank}
        onChequeBankChange={setChequeBank}
        chequeBranch={chequeBranch}
        onChequeBranchChange={setChequeBranch}
        chequeNumber={chequeNumber}
        onChequeNumberChange={setChequeNumber}
        chequeAccount={chequeAccount}
        onChequeAccountChange={setChequeAccount}
        chequeMaturity={chequeMaturity}
        onChequeMaturityChange={setChequeMaturity}
        customers={customers}
        customerId={customerId}
        onCustomerIdChange={setCustomerId}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        creditTermsDays={creditTermsDays}
        onCreditTermsDaysChange={(days) => {
          const normalized = Math.min(365, Math.max(1, Math.round(days) || 30));
          setCreditTermsDays(normalized);
          setDueDate(dueDateFromTermsDays(normalized));
        }}
        dueDate={dueDate}
        onDueDateChange={(date) => {
          setDueDate(date);
          if (date) setCreditTermsDays(termsDaysFromDueDate(date));
        }}
        splitTenders={splitTenders}
        onSplitTendersChange={setSplitTenders}
        splitSummary={splitSummary}
        splitError={splitError}
        onConfirm={completeSale}
        onCancel={() => setCheckoutOpen(false)}
      />

      <SaleReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        sale={lastSale}
        storeSettings={storeSettings}
        termsDaysOverride={lastReceiptTermsDays}
      />

      <BatchAllocationWarningDialog
        open={batchWarningOpen}
        onOpenChange={(open) => {
          setBatchWarningOpen(open);
          if (!open) setPendingAllocation(null);
        }}
        allocation={pendingAllocation?.allocation ?? null}
        onConfirm={confirmPendingAllocation}
        onSelectBatch={selectPendingBatch}
        allowManualSelection={isOwner}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Cancel order?"
        description="Remove all items from the cart. Stock is not changed until checkout completes."
        cancelLabel="Keep order"
        confirmLabel="Cancel order"
        variant="destructive"
        onConfirm={cancelOrder}
      />
    </div>
  );
}
