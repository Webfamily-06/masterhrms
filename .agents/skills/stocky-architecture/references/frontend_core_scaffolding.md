# Frontend Core Scaffolding, Stores & Logic Reference

This manual provides the production-ready frontend architecture, Pinia state stores, Vue Router configuration, universal CRUD table composable, and the mathematical line-calculation engine needed to build or port Stocky's client SPA with zero missing components.

---

## 1. Vue Router & Guard Architecture (`src/router/index.js`)

```javascript
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/auth/Login.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../pages/dashboard/Dashboard.vue'),
        meta: { permission: null }
      },
      {
        path: 'products',
        name: 'ProductsList',
        component: () => import('../pages/products/ProductsList.vue'),
        meta: { permission: 'products_view' }
      },
      {
        path: 'products/create',
        name: 'ProductCreate',
        component: () => import('../pages/products/ProductForm.vue'),
        meta: { permission: 'products_add' }
      },
      {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        component: () => import('../pages/products/ProductForm.vue'),
        meta: { permission: 'products_edit' }
      },
      {
        path: 'sales',
        name: 'SalesList',
        component: () => import('../pages/sales/SalesList.vue'),
        meta: { permission: 'Sales_view' }
      },
      {
        path: 'sales/create',
        name: 'SaleCreate',
        component: () => import('../pages/sales/SaleForm.vue'),
        meta: { permission: 'Sales_add' }
      },
      {
        path: 'purchases',
        name: 'PurchasesList',
        component: () => import('../pages/purchases/PurchasesList.vue'),
        meta: { permission: 'Purchases_view' }
      },
      {
        path: 'customers',
        name: 'CustomersList',
        component: () => import('../pages/people/CustomersList.vue'),
        meta: { permission: 'Customers_view' }
      },
      {
        path: 'suppliers',
        name: 'SuppliersList',
        component: () => import('../pages/people/SuppliersList.vue'),
        meta: { permission: 'Suppliers_view' }
      },
      {
        path: 'accounting/v2/journal-entries',
        name: 'JournalEntries',
        component: () => import('../pages/accounting/JournalEntriesList.vue'),
        meta: { permission: 'journal_entries' }
      },
      {
        path: 'settings/system',
        name: 'SystemSettings',
        component: () => import('../pages/settings/SystemSettings.vue'),
        meta: { permission: 'setting_system' }
      }
    ]
  },
  {
    path: '/pos',
    name: 'POS',
    component: () => import('../pages/pos/PosPage.vue'),
    meta: { requiresAuth: true, permission: 'Pos_view' }
  },
  {
    path: '/customer-display',
    name: 'CustomerDisplay',
    component: () => import('../customer-display/CustomerDisplay.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/errors/404.vue')
  }
];

const router = createRouter({
  history: createWebHistory('/next'),
  routes
});

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    const ok = await auth.checkAuth();
    if (!ok) return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return next({ name: 'Dashboard' });
  }

  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return next({ name: 'Dashboard' });
  }

  next();
});

export default router;
```

---

## 2. Core Pinia State Stores

### 2.1 Authentication & Permissions Store (`src/stores/auth.js`)
```javascript
import { defineStore } from 'pinia';
import http from '../lib/http';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    permissions: [],
    isAuthenticated: false,
    token: localStorage.getItem('Stocky_token') || null,
    lastActivityAt: Date.now()
  }),

  getters: {
    can: (state) => (permissionSlug) => {
      if (!permissionSlug) return true;
      if (state.user?.role_id === 1) return true; // Superadmin bypass
      return state.permissions.includes(permissionSlug);
    },
    isAllWarehouses: (state) => Boolean(state.user?.is_all_warehouses),
    recordView: (state) => Boolean(state.user?.record_view)
  },

  actions: {
    recordActivity() {
      this.lastActivityAt = Date.now();
    },

    async login(credentials) {
      const { data } = await http.post('/getAccessToken', credentials);
      if (data.status === true && data.Stocky_token) {
        this.token = data.Stocky_token;
        localStorage.setItem('Stocky_token', data.Stocky_token);
        await this.fetchUser();
        return { success: true };
      }
      return { success: false, message: data.message || 'Invalid credentials' };
    },

    async fetchUser() {
      try {
        const { data } = await http.get('/user');
        this.user = data.user;
        this.permissions = data.permissions || [];
        this.isAuthenticated = true;
      } catch (err) {
        this.logout();
      }
    },

    async checkAuth() {
      if (!this.token) return false;
      if (!this.user) {
        await this.fetchUser();
      }
      return this.isAuthenticated;
    },

    async logout() {
      try {
        if (this.token) await http.post('/logout');
      } catch (_) {}
      this.user = null;
      this.permissions = [];
      this.token = null;
      this.isAuthenticated = false;
      localStorage.removeItem('Stocky_token');
    }
  }
});
```

---

### 2.2 Point of Sale Cart Store (`src/stores/pos.js`)
```javascript
import { defineStore } from 'pinia';
import { calculateLineTotals, calculateOrderTotals } from '../lib/lineCalc';
import http from '../lib/http';

export const usePosStore = defineStore('pos', {
  state: () => ({
    warehouseId: 1,
    client: { id: 1, name: 'Walk-In Customer' },
    cart: [],
    discount: 0,
    discountMethod: '2', // 1 = %, 2 = Fixed
    taxRate: 0,
    shipping: 0,
    payments: [],
    cashRegister: null,
    activeDraftId: null
  }),

  getters: {
    totals(state) {
      return calculateOrderTotals(state.cart, {
        discount: state.discount,
        discountMethod: state.discountMethod,
        taxRate: state.taxRate,
        shipping: state.shipping
      });
    },

    totalPayable() {
      return this.totals.grandTotal;
    },

    paidTotal(state) {
      return state.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    },

    changeDue() {
      return Math.max(0, this.paidTotal - this.totalPayable);
    }
  },

  actions: {
    addToCart(product, variant = null) {
      const existing = this.cart.find(
        (i) => i.product_id === product.id && i.product_variant_id === (variant?.id || null)
      );

      if (existing) {
        existing.quantity += 1;
        this.recalculateLine(existing);
      } else {
        const item = {
          product_id: product.id,
          product_variant_id: variant?.id || null,
          name: product.name,
          code: variant?.code || product.code,
          unit_price: Number(variant?.price || product.price),
          quantity: 1,
          sale_unit_id: product.unit_sale_id || product.unit_id,
          tax_percent: Number(product.TaxNet) || 0,
          tax_method: String(product.tax_method || '1'),
          discount: 0,
          discount_method: '2',
          imei_number: '',
          batches: []
        };
        this.recalculateLine(item);
        this.cart.unshift(item);
      }
      this.broadcastToCustomerDisplay();
    },

    recalculateLine(item) {
      const calc = calculateLineTotals(item);
      item.subtotal = calc.subtotal;
      item.tax_amount = calc.taxAmount;
      item.discount_amount = calc.discountAmount;
    },

    removeLine(index) {
      this.cart.splice(index, 1);
      this.broadcastToCustomerDisplay();
    },

    resetCart() {
      this.cart = [];
      this.discount = 0;
      this.shipping = 0;
      this.payments = [];
      this.activeDraftId = null;
      this.broadcastToCustomerDisplay();
    },

    broadcastToCustomerDisplay() {
      if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('pos-cart.1');
        channel.postMessage({
          cart: this.cart,
          totals: this.totals,
          client: this.client
        });
      }
    }
  }
});
```

---

## 3. Mathematical Line Calculation Engine (`src/lib/lineCalc.js`)

This calculation engine mirrors backend tax and discount rules with exact 3-decimal precision:

```javascript
/**
 * Computes net price, line discount, line tax, and line subtotal.
 */
export function calculateLineTotals(item) {
  const qty = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const taxPercent = Number(item.tax_percent) || 0;
  const taxMethod = String(item.tax_method || '1'); // 1 = Exclusive, 2 = Inclusive
  const discountVal = Number(item.discount) || 0;
  const discountMethod = String(item.discount_method || '2'); // 1 = %, 2 = Fixed

  // 1. Calculate base line price before tax
  let basePrice = unitPrice;
  if (taxMethod === '2') {
    // Inclusive tax: strip tax out of unit price
    basePrice = unitPrice / (1 + taxPercent / 100);
  }

  // 2. Line Discount
  let lineDiscount = 0;
  if (discountMethod === '1') {
    lineDiscount = (basePrice * discountVal) / 100;
  } else {
    lineDiscount = discountVal;
  }
  const netPrice = Math.max(0, basePrice - lineDiscount);

  // 3. Line Tax
  let lineTax = 0;
  if (taxMethod === '2') {
    lineTax = unitPrice - basePrice;
  } else {
    lineTax = (netPrice * taxPercent) / 100;
  }

  // 4. Line Subtotal
  const subtotal = (netPrice + lineTax) * qty;

  return {
    basePrice: round3(basePrice),
    netPrice: round3(netPrice),
    discountAmount: round3(lineDiscount * qty),
    taxAmount: round3(lineTax * qty),
    subtotal: round3(subtotal)
  };
}

/**
 * Computes order-level grand total including order tax, discount, and shipping.
 */
export function calculateOrderTotals(items, options = {}) {
  const lineSubtotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  const discountVal = Number(options.discount) || 0;
  const discountMethod = String(options.discountMethod || '2');
  const taxRate = Number(options.taxRate) || 0;
  const shipping = Number(options.shipping) || 0;

  let orderDiscount = 0;
  if (discountMethod === '1') {
    orderDiscount = (lineSubtotal * discountVal) / 100;
  } else {
    orderDiscount = discountVal;
  }

  const discountedTotal = Math.max(0, lineSubtotal - orderDiscount);
  const orderTax = (discountedTotal * taxRate) / 100;
  const grandTotal = discountedTotal + orderTax + shipping;

  return {
    lineSubtotal: round3(lineSubtotal),
    orderDiscount: round3(orderDiscount),
    orderTax: round3(orderTax),
    shipping: round3(shipping),
    grandTotal: round3(grandTotal)
  };
}

function round3(num) {
  return Math.round((num + Number.EPSILON) * 1000) / 1000;
}
```

---

## 4. Universal CRUD Table Composable (`src/composables/useCrudTable.js`)

Implements **Universal Query Contract (Rule 0)** with Ant Design Vue tables:

```javascript
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import http from '../lib/http';

export function useCrudTable({
  endpoint,
  resourceKey,
  defaultSortField = 'id',
  defaultSortType = 'desc',
  initialFilters = {}
}) {
  const loading = ref(false);
  const data = ref([]);
  const selectedRowKeys = ref([]);
  const totalRows = ref(0);

  const query = reactive({
    page: 1,
    limit: 10,
    SortField: defaultSortField,
    SortType: defaultSortType,
    search: '',
    ...initialFilters
  });

  const fetchData = async () => {
    loading.value = true;
    try {
      const { data: res } = await http.get(endpoint, { params: query });
      data.value = res[resourceKey] || [];
      totalRows.value = res.totalRows || 0;
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to load records');
    } finally {
      loading.value = false;
    }
  };

  const handleTableChange = (pagination, filters, sorter) => {
    query.page = pagination.current;
    query.limit = pagination.pageSize;
    if (sorter.field) {
      query.SortField = sorter.field;
      query.SortType = sorter.order === 'ascend' ? 'asc' : 'desc';
    }
    fetchData();
  };

  const onSearch = (value) => {
    query.search = value;
    query.page = 1;
    fetchData();
  };

  const deleteRecord = async (id) => {
    try {
      await http.delete(`${endpoint}/${id}`);
      message.success('Record deleted successfully');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'Delete operation failed');
    }
  };

  const deleteBySelection = async () => {
    if (!selectedRowKeys.value.length) return;
    try {
      await http.post(`${endpoint}/delete/by_selection`, {
        selectedIds: selectedRowKeys.value
      });
      message.success('Selected records deleted');
      selectedRowKeys.value = [];
      fetchData();
    } catch (err) {
      message.error('Bulk deletion failed');
    }
  };

  onMounted(() => {
    fetchData();
  });

  return {
    loading,
    data,
    totalRows,
    query,
    selectedRowKeys,
    fetchData,
    handleTableChange,
    onSearch,
    deleteRecord,
    deleteBySelection
  };
}
```

---

## 5. Universal HTTP Client Wrapper (`src/lib/http.js`)

```javascript
import axios from 'axios';
import { message } from 'ant-design-vue';

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Attach CSRF Token on all mutation requests
http.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (token) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
  }

  // Fallback for Bearer token if stored in localStorage
  const bearer = localStorage.getItem('Stocky_token');
  if (bearer && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${bearer}`;
  }

  return config;
});

// Response interceptor handling session expiration
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('Stocky_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      message.error(error.response?.data?.message || 'Access Denied: You lack required permissions.');
    }
    return Promise.reject(error);
  }
);

export default http;
```
