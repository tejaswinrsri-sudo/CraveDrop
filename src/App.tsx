import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { Toaster } from 'react-hot-toast';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { ConflictModal } from './components/cart/ConflictModal';
import { AuthSync, RequireAuth, RequireAdmin } from './components/common/AuthSync';

import { HomePage } from './pages/HomePage';
import { RestaurantsPage } from './pages/RestaurantsPage';
import { RestaurantDetailPage } from './pages/RestaurantDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { ProfilePage } from './pages/ProfilePage';

import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminRestaurantsPage } from './pages/admin/AdminRestaurantsPage';
import { AdminMenuItemsPage } from './pages/admin/AdminMenuItemsPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Customer layout with Header and Footer
const MainStorefrontLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen min-w-0 w-full flex-col">
      <Header />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthSync />
          <CartDrawer />
          <ConflictModal />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#0F172A',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '14px',
              },
            }}
          />

          <Routes>
            {/* Customer Storefront Routes */}
            <Route element={<MainStorefrontLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/restaurants" element={<RestaurantsPage />} />
              <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
              <Route
                path="/checkout"
                element={
                  <RequireAuth>
                    <CheckoutPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/orders"
                element={
                  <RequireAuth>
                    <MyOrdersPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <RequireAuth>
                    <OrderDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/bookings"
                element={
                  <RequireAuth>
                    <MyBookingsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
            </Route>

            {/* Admin Management Routes */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="restaurants" element={<AdminRestaurantsPage />} />
              <Route path="menu-items" element={<AdminMenuItemsPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
