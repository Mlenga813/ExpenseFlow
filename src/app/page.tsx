'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';
import { AnimatePresence, motion } from 'framer-motion';
import { ROLES, CATEGORIES, URGENCY_LEVELS, PAYMENT_METHODS, REQUEST_STATUSES, WORKFLOW_STEPS, ROLE_LABELS } from '@/lib/constants';
import { canApproveAtStep, canDisburse, canManageUsers, canManageCompanies, canViewAllRequests } from '@/lib/permissions';
import type { Role } from '@/lib/constants';

// shadcn/ui imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

// Lucide icons
import {
  LayoutDashboard, FileText, Plus, Bell, User, Settings, LogOut, Menu, Building2,
  Users, FolderOpen, CheckCircle, XCircle, AlertCircle, DollarSign, Clock,
  ArrowRight, Upload, Download, Eye, ChevronRight, Search, Filter, RefreshCw,
  TrendingUp, BarChart3, PieChart, FileSpreadsheet, Send, PenTool, Ban,
  Info, CircleDollarSign, Shield, Home, ClipboardList, CreditCard, X, Image,
  ChevronLeft, Mail
} from 'lucide-react';

// Recharts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];

// ==================== UTILITY FUNCTIONS ====================
function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status: string) {
  const s = REQUEST_STATUSES[status as keyof typeof REQUEST_STATUSES];
  if (!s) return <Badge variant="outline">{status}</Badge>;
  return <Badge className={`${s.color} border-0 font-medium`}>{s.label}</Badge>;
}

function getUrgencyBadge(urgency: string) {
  const u = URGENCY_LEVELS.find(u => u.value === urgency);
  if (!u) return <Badge variant="outline">{urgency}</Badge>;
  return <Badge className={`${u.color} border-0 font-medium`}>{u.label}</Badge>;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ==================== API HELPER ====================
async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ==================== MAIN APP ====================
export default function HomePage() {
  const { currentPage, currentRequestId, navigate } = useAppStore();
  const { user, setUser, isLoading, setLoading, logout } = useAuthStore();

  // Check session on mount + auto-seed
  useEffect(() => {
    const init = async () => {
      try {
        // Auto-seed on first visit
        await fetch('/api/seed', { method: 'POST' }).catch(() => {});
        
        const session = await apiFetch('/api/auth/session');
        if (session?.user) {
          const u = session.user as any;
          setUser({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            companyId: u.companyId,
            companyName: u.companyName,
            departmentId: u.departmentId,
            signature: u.signature,
          });
          navigate('dashboard');
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };
    init();
  }, []);

  const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  const renderPage = () => {
    if (isLoading) return <LoadingScreen />;
    if (!user) {
      return currentPage === 'register' ? (
        <RegisterPage onSwitch={() => navigate('login')} onRegistered={() => navigate('login')} />
      ) : (
        <LoginPage onSwitch={() => navigate('register')} onLogin={(u) => { setUser(u); navigate('dashboard'); }} />
      );
    }

    return (
      <AppLayout>
        <AnimatePresence mode="wait">
          <motion.div key={currentPage} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }}>
            {currentPage === 'dashboard' && <DashboardPage />}
            {currentPage === 'requests' && <RequestsListPage />}
            {currentPage === 'requests-new' && <NewRequestPage />}
            {currentPage === 'request-detail' && <RequestDetailPage />}
            {currentPage === 'approvals' && <ApprovalsPage />}
            {currentPage === 'reports' && <ReportsPage />}
            {currentPage === 'admin-users' && <AdminUsersPage />}
            {currentPage === 'admin-departments' && <AdminDepartmentsPage />}
            {currentPage === 'admin-companies' && <AdminCompaniesPage />}
            {currentPage === 'notifications' && <NotificationsPage />}
            {currentPage === 'profile' && <ProfilePage />}
          </motion.div>
        </AnimatePresence>
      </AppLayout>
    );
  };

  return <div className="min-h-screen bg-gray-50">{renderPage()}</div>;
}

// ==================== LOADING SCREEN ====================
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <CircleDollarSign className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">ExpenseFlow</h2>
        <p className="text-gray-500 mt-1">Loading...</p>
      </div>
    </div>
  );
}

// ==================== LOGIN PAGE ====================
function LoginPage({ onSwitch, onLogin }: { onSwitch: () => void; onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.ok) {
        const session = await apiFetch('/api/auth/session');
        if (session?.user) {
          const u = session.user as any;
          onLogin({
            id: u.id, name: u.name, email: u.email, role: u.role,
            companyId: u.companyId, companyName: u.companyName, departmentId: u.departmentId, signature: u.signature,
          });
        } else {
          setError('Failed to retrieve session');
        }
      } else {
        setError('Invalid email or password');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <CircleDollarSign className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ExpenseFlow</h1>
          <p className="text-gray-500 mt-1">Expense Request & Claims Management</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2 rotate-180" />}
                Sign In
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={onSwitch} className="text-sm text-emerald-600 hover:underline">Don&apos;t have an account? Register</button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Demo Login */}
        <Card className="mt-4 border-0 shadow-sm bg-white/80">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Demo Login</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Employee', email: 'employee@acme.com', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                { label: 'Ops Manager', email: 'ops@acme.com', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                { label: 'Chief Accountant', email: 'accountant@acme.com', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                { label: 'General Manager', email: 'gm@acme.com', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
                { label: 'Cashier', email: 'cashier@acme.com', color: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' },
                { label: 'Admin', email: 'admin@acme.com', color: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
              ].map(demo => (
                <button
                  key={demo.email}
                  type="button"
                  className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors ${demo.color}`}
                  onClick={() => { setEmail(demo.email); setPassword('Password@123'); }}
                >
                  {demo.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Super Admin: superadmin@expenseflow.com / Admin@123</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ==================== REGISTER PAGE ====================
function RegisterPage({ onSwitch, onRegistered }: { onSwitch: () => void; onRegistered: () => void }) {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, mode, inviteCode, companyName, industry }),
      });
      onRegistered();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CircleDollarSign className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-1">Join or create a company workspace</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

              <Tabs value={mode} onValueChange={v => setMode(v as 'join' | 'create')} className="mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="join">Join Company</TabsTrigger>
                  <TabsTrigger value="create">New Company</TabsTrigger>
                </TabsList>
              </Tabs>

              {mode === 'join' && (
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <Input placeholder="Enter company invite code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} required />
                </div>
              )}

              {mode === 'create' && (
                <>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input placeholder="Your company name" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input placeholder="e.g. Technology, Finance" value={industry} onChange={e => setIndustry(e.target.value)} />
                  </div>
                </>
              )}

              <Separator />
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <User className="w-4 h-4 mr-2" />}
                Create Account
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={onSwitch} className="text-sm text-emerald-600 hover:underline">Already have an account? Sign In</button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ==================== APP LAYOUT ====================
function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { navigate, currentPage } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const role = user?.role as Role;

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await apiFetch('/api/notifications?unreadOnly=true');
        setNotifCount(data.unreadCount);
      } catch {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [ROLES.EMPLOYEE, ROLES.OPS_MANAGER, ROLES.CHIEF_ACCOUNTANT, ROLES.GENERAL_MANAGER, ROLES.CASHIER, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { key: 'requests', label: 'My Requests', icon: FileText, roles: [ROLES.EMPLOYEE, ROLES.OPS_MANAGER, ROLES.CHIEF_ACCOUNTANT, ROLES.GENERAL_MANAGER, ROLES.CASHIER, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { key: 'requests-new', label: 'New Request', icon: Plus, roles: [ROLES.EMPLOYEE, ROLES.OPS_MANAGER, ROLES.CHIEF_ACCOUNTANT, ROLES.GENERAL_MANAGER, ROLES.CASHIER, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { key: 'approvals', label: 'Approvals', icon: CheckCircle, roles: [ROLES.OPS_MANAGER, ROLES.CHIEF_ACCOUNTANT, ROLES.GENERAL_MANAGER, ROLES.CASHIER, ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { key: 'reports', label: 'Reports', icon: BarChart3, roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.OPS_MANAGER, ROLES.CHIEF_ACCOUNTANT, ROLES.GENERAL_MANAGER] },
    { key: 'admin-users', label: 'Users', icon: Users, roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { key: 'admin-departments', label: 'Departments', icon: FolderOpen, roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
    { key: 'admin-companies', label: 'Companies', icon: Building2, roles: [ROLES.SUPER_ADMIN] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <CircleDollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">ExpenseFlow</h2>
            <p className="text-xs text-gray-500 truncate max-w-[160px]">{user?.companyName}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {filteredNav.map(item => (
            <button
              key={item.key}
              onClick={() => { navigate(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                currentPage === item.key || (item.key === 'requests' && currentPage === 'request-detail')
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[role as Role] || role}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { logout(); navigate('login'); }}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Logout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r flex-col fixed h-full z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('notifications')}>
                    <Bell className="w-5 h-5" />
                    {notifCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" onClick={() => navigate('profile')}>
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ==================== DASHBOARD PAGE ====================
function DashboardPage() {
  const { user } = useAuthStore();
  const { navigate } = useAppStore();
  const [stats, setStats] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const role = user?.role as Role;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, reqData] = await Promise.all([
          apiFetch('/api/stats'),
          apiFetch('/api/requests?limit=5'),
        ]);
        setStats(statsData);
        setRecentRequests(reqData.requests || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const isEmployee = role === ROLES.EMPLOYEE;
  const isApprovalRole = [ROLES.OPS_MANAGER, ROLES.CHIEF_ACCOUNTANT, ROLES.GENERAL_MANAGER, ROLES.CASHIER].includes(role);
  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('requests-new')}>
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isEmployee ? (
          <>
            <StatCard title="My Requests" value={stats?.myRequests || 0} icon={FileText} color="emerald" />
            <StatCard title="Pending" value={stats?.myPending || 0} icon={Clock} color="amber" />
            <StatCard title="Approved" value={stats?.myApproved || 0} icon={CheckCircle} color="green" />
            <StatCard title="Total Amount" value={formatCurrency(stats?.totalAmount || 0)} icon={DollarSign} color="teal" />
          </>
        ) : isApprovalRole ? (
          <>
            <StatCard title="Pending My Approval" value={stats?.pendingMyApproval || 0} icon={AlertCircle} color="amber" onClick={() => navigate('approvals')} />
            <StatCard title="Total Processed" value={stats?.disbursed || 0} icon={CheckCircle} color="green" />
            <StatCard title="Rejected" value={stats?.rejected || 0} icon={XCircle} color="red" />
            <StatCard title="Total Amount" value={formatCurrency(stats?.totalAmount || 0)} icon={DollarSign} color="teal" />
          </>
        ) : isAdmin ? (
          <>
            <StatCard title="Total Requests" value={stats?.totalRequests || 0} icon={FileText} color="emerald" />
            <StatCard title="Pending Approval" value={(stats?.pendingOpsManager || 0) + (stats?.pendingChiefAccountant || 0) + (stats?.pendingGeneralManager || 0)} icon={Clock} color="amber" />
            <StatCard title="Disbursed" value={stats?.disbursed || 0} icon={CheckCircle} color="green" />
            <StatCard title="Total Amount" value={formatCurrency(stats?.totalAmount || 0)} icon={DollarSign} color="teal" />
          </>
        ) : null}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.categoryBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RPieChart>
                  <Pie data={stats.categoryBreakdown.map((c: any) => ({ name: c.category, value: c._sum.amount || 0 }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {stats.categoryBreakdown.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <RTooltip formatter={(v: number) => formatCurrency(v)} />
                </RPieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-500 text-center py-8">No data yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: 'Pending Ops', count: stats?.pendingOpsManager || 0 },
                { name: 'Pending Acct', count: stats?.pendingChiefAccountant || 0 },
                { name: 'Pending GM', count: stats?.pendingGeneralManager || 0 },
                { name: 'Pending Cash', count: stats?.pendingDisbursement || 0 },
                { name: 'Disbursed', count: stats?.disbursed || 0 },
                { name: 'Rejected', count: stats?.rejected || 0 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <RTooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Requests</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('requests')}>View All <ChevronRight className="w-4 h-4 ml-1" /></Button>
        </CardHeader>
        <CardContent>
          {recentRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRequests.map((req: any) => (
                    <TableRow key={req.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate('request-detail', req.id)}>
                      <TableCell className="font-mono text-sm">{req.requestNumber}</TableCell>
                      <TableCell className="font-medium">{req.title}</TableCell>
                      <TableCell>{formatCurrency(req.amount)}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-gray-500 text-sm">{formatDate(req.createdAt)}</TableCell>
                      <TableCell><Eye className="w-4 h-4 text-gray-400" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No requests yet. Create your first one!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, onClick }: { title: string; value: string | number; icon: any; color: string; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    teal: 'bg-teal-50 text-teal-600',
  };
  return (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : ''}`} onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-10 w-32" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

// ==================== REQUESTS LIST PAGE ====================
function RequestsListPage() {
  const { navigate } = useAppStore();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (search) params.set('search', search);
        const data = await apiFetch(`/api/requests?${params.toString()}`);
        setRequests(data.requests || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [statusFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Requests</h1>
          <p className="text-gray-500">View and manage all expense requests</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('requests-new')}>
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search requests..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(REQUEST_STATUSES).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('request-detail', req.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-500">{req.requestNumber}</span>
                      {getStatusBadge(req.status)}
                      {getUrgencyBadge(req.urgency)}
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{req.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{req.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(req.amount)}</p>
                    <p className="text-xs text-gray-500">{formatDate(req.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-12 text-center"><FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No requests found</p></CardContent></Card>
      )}
    </div>
  );
}

// ==================== NEW REQUEST PAGE ====================
function NewRequestPage() {
  const { navigate } = useAppStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    title: '', amount: '', category: '', description: '', date: '', urgency: 'NORMAL',
    accountCode: '', vendorPayee: '', paymentMethod: '', departmentId: '',
  });

  useEffect(() => {
    apiFetch('/api/departments').then(setDepartments).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const request = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      // Upload files if any
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        await fetch(`/api/requests/upload?id=${request.id}`, { method: 'POST', body: formData });
      }

      toast.success('Fund requisition submitted successfully');
      navigate('request-detail', request.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('requests')}><ChevronLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Fund Requisition</h1>
          <p className="text-gray-500">Submit a new expense request for approval</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <Label>Request Title *</Label>
                <Input placeholder="e.g. Office Supplies Purchase" value={form.title} onChange={e => updateForm('title', e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={e => updateForm('amount', e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => updateForm('category', v)} required>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Required *</Label>
                <Input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select value={form.urgency} onValueChange={v => updateForm('urgency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URGENCY_LEVELS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.departmentId} onValueChange={v => updateForm('departmentId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Account Code</Label>
                <Input placeholder="e.g. OPS-2026-001" value={form.accountCode} onChange={e => updateForm('accountCode', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Vendor / Payee</Label>
                <Input placeholder="e.g. Office Depot" value={form.vendorPayee} onChange={e => updateForm('vendorPayee', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={v => updateForm('paymentMethod', v)}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label>Description / Justification *</Label>
                <Textarea placeholder="Provide detailed justification for this expense..." rows={4} value={form.description} onChange={e => updateForm('description', e.target.value)} required />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label>Attachments (Receipts / Documents)</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-emerald-300 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-2">Click to upload or drag and drop</p>
                  <Input type="file" multiple className="max-w-xs mx-auto" onChange={e => setFiles(Array.from(e.target.files || []))} />
                </div>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => <p key={i} className="text-sm text-gray-600 flex items-center gap-2"><FileText className="w-3 h-3" />{f.name}</p>)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit Request
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('requests')}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== REQUEST DETAIL PAGE ====================
function RequestDetailPage() {
  const { currentRequestId, navigate } = useAppStore();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [disbRef, setDisbRef] = useState('');
  const [disbNotes, setDisbNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const sigCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const role = user?.role as Role;

  const loadRequest = useCallback(async () => {
    if (!currentRequestId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/requests/${currentRequestId}`);
      setRequest(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [currentRequestId]);

  useEffect(() => { loadRequest(); }, [loadRequest]);

  const handleApproval = async (action: 'APPROVE' | 'REJECT' | 'INFO_REQUESTED') => {
    if (!currentRequestId) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/requests/${currentRequestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action, comment, signature: signatureData }),
      });
      setComment('');
      setSignatureData(null);
      toast.success(action === 'APPROVE' ? 'Request approved successfully' : action === 'REJECT' ? 'Request rejected' : 'Additional information requested');
      loadRequest();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisbursement = async () => {
    if (!currentRequestId) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/requests/${currentRequestId}/disburse`, {
        method: 'POST',
        body: JSON.stringify({ disbursementReference: disbRef, disbursementNotes: disbNotes }),
      });
      toast.success('Disbursement processed successfully');
      loadRequest();
    } catch (err: any) {
      toast.error(err.message || 'Disbursement failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Signature pad handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d')!;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1f2937';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setDrawing(false);
    const canvas = sigCanvasRef.current;
    if (canvas) setSignatureData(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData(null);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>;
  if (!request) return <Card><CardContent className="p-12 text-center"><p className="text-gray-500">Request not found</p></CardContent></Card>;

  const canApprove = canApproveAtStep(role, request.currentStep) && ['PENDING_OPS_MANAGER', 'PENDING_CHIEF_ACCOUNTANT', 'PENDING_GENERAL_MANAGER'].includes(request.status);
  const canDisb = canDisburse(role) && request.status === 'PENDING_DISBURSEMENT';
  const isRequestor = user?.id === request.requestedById;
  const canResubmit = isRequestor && (request.status === 'REJECTED' || request.status === 'INFO_REQUESTED');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('requests')}><ChevronLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{request.requestNumber}</h1>
            {getStatusBadge(request.status)}
            {getUrgencyBadge(request.urgency)}
          </div>
          <p className="text-gray-500">{request.title}</p>
        </div>
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Request Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-500">Amount</p><p className="font-semibold text-lg">{formatCurrency(request.amount)}</p></div>
            <div><p className="text-gray-500">Category</p><p className="font-medium">{request.category}</p></div>
            <div><p className="text-gray-500">Date Required</p><p className="font-medium">{formatDate(request.date)}</p></div>
            <div><p className="text-gray-500">Vendor/Payee</p><p className="font-medium">{request.vendorPayee || 'N/A'}</p></div>
            <div><p className="text-gray-500">Payment Method</p><p className="font-medium">{request.paymentMethod || 'N/A'}</p></div>
            <div><p className="text-gray-500">Account Code</p><p className="font-medium">{request.accountCode || 'N/A'}</p></div>
            <div className="col-span-full"><p className="text-gray-500">Description</p><p className="font-medium mt-1">{request.description}</p></div>
            <div><p className="text-gray-500">Requested By</p><p className="font-medium">{request.requestedBy?.name}</p></div>
            <div><p className="text-gray-500">Department</p><p className="font-medium">{request.department?.name || 'N/A'}</p></div>
          </div>

          {request.attachments?.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {request.attachments.map((a: any) => (
                  <Badge key={a.id} variant="outline" className="gap-1"><FileText className="w-3 h-3" />{a.originalName}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval Workflow</CardTitle>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs font-medium text-emerald-600">
                {request.status === 'DISBURSED' ? 'Complete' : request.status === 'REJECTED' ? 'Rejected' : `Step ${request.currentStep} of 4`}
              </span>
            </div>
            <Progress value={
              request.status === 'DISBURSED' ? 100 :
              request.status === 'REJECTED' ? 0 :
              ((request.currentStep - 1) / 4) * 100
            } className="h-2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Submission entry */}
            <div className="flex gap-4 pb-4 border-b">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-100 text-blue-700">
                  <Send className="w-4 h-4" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-blue-700">Request Submitted</p>
                  <span className="text-xs text-gray-500">{formatDate(request.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-500">{request.requestedBy?.name} {request.requestedBy?.department ? `(${request.requestedBy.department.name})` : ''}</p>
              </div>
            </div>
            {WORKFLOW_STEPS.map((step, idx) => {
              const isCompleted = request.currentStep > step.step || request.status === 'DISBURSED';
              const isCurrent = request.currentStep === step.step && !['DISBURSED', 'REJECTED'].includes(request.status);
              const reviewer = step.step === 1 ? request.opsManager : step.step === 2 ? request.chiefAccountant : step.step === 3 ? request.generalManager : request.cashier;
              const approvedAt = step.step === 1 ? request.opsManagerApprovedAt : step.step === 2 ? request.chiefAccountantApprovedAt : step.step === 3 ? request.generalManagerApprovedAt : request.disbursedAt;
              const stepLog = request.approvalLogs?.find((l: any) => l.step === step.step && l.action === 'APPROVED');
              const rejectLog = request.approvalLogs?.find((l: any) => l.step === step.step && l.action === 'REJECTED');

              return (
                <div key={step.step} className={`flex gap-4 ${idx < WORKFLOW_STEPS.length - 1 ? 'pb-4 border-b' : ''}`}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCompleted ? 'bg-emerald-100 text-emerald-700' : isCurrent ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : step.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium ${isCurrent ? 'text-amber-700' : isCompleted ? 'text-emerald-700' : 'text-gray-400'}`}>{step.label}</p>
                      {approvedAt && <span className="text-xs text-gray-500">{formatDateTime(approvedAt)}</span>}
                    </div>
                    {reviewer && <p className="text-sm text-gray-500">{reviewer.name}</p>}
                    {stepLog?.comment && <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded p-2">{stepLog.comment}</p>}
                    {stepLog?.signature && (
                      <div className="mt-1"><img src={stepLog.signature} alt="Signature" className="h-10 border rounded" /></div>
                    )}
                    {rejectLog && <p className="text-sm text-red-600 mt-1 bg-red-50 rounded p-2">Rejected: {rejectLog.comment}</p>}
                    {step.step === 4 && request.disbursementReference && (
                      <p className="text-sm text-emerald-600 mt-1">Reference: {request.disbursementReference}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Approval Panel */}
      {canApprove && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><PenTool className="w-4 h-4" /> Your Review Required</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea placeholder="Add your comment..." value={comment} onChange={e => setComment(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Digital Signature</Label>
                <Button variant="ghost" size="sm" onClick={clearSignature}>Clear</Button>
              </div>
              <canvas
                ref={sigCanvasRef}
                width={400}
                height={120}
                className="border border-gray-300 rounded-lg bg-white cursor-crosshair w-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <p className="text-xs text-gray-400">Draw your signature above</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={actionLoading} onClick={() => handleApproval('APPROVE')}>
                <CheckCircle className="w-4 h-4 mr-2" /> Approve
              </Button>
              <Button variant="destructive" disabled={actionLoading} onClick={() => handleApproval('REJECT')}>
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button variant="outline" className="border-amber-300 text-amber-700" disabled={actionLoading} onClick={() => handleApproval('INFO_REQUESTED')}>
                <Info className="w-4 h-4 mr-2" /> Request Info
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resubmit Panel */}
      {canResubmit && (
        <Card className={request.status === 'REJECTED' ? 'border-red-200 bg-red-50/30' : 'border-orange-200 bg-orange-50/30'}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {request.status === 'REJECTED' ? <XCircle className="w-4 h-4 text-red-500" /> : <Info className="w-4 h-4 text-orange-500" />}
              {request.status === 'REJECTED' ? 'Request Rejected' : 'Additional Information Requested'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Additional Comments / Updated Justification</Label>
              <Textarea placeholder="Provide additional information or update your request..." value={comment} onChange={e => setComment(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-3">
              <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={actionLoading} onClick={async () => {
                setActionLoading(true);
                try {
                  await apiFetch(`/api/requests/${currentRequestId}/approve`, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'APPROVE', comment: `Resubmitted: ${comment}` }),
                  });
                  setComment('');
                  loadRequest();
                } catch (err: any) { alert(err.message); }
                finally { setActionLoading(false); }
              }}>
                <Send className="w-4 h-4 mr-2" /> Resubmit Request
              </Button>
              <Button variant="outline" onClick={() => navigate('requests-new')}>Create New Request Instead</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disbursement Panel */}
      {canDisb && (
        <Card className="border-cyan-200 bg-cyan-50/30">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Process Disbursement</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Disbursement Reference (Cheque/Transaction #)</Label>
              <Input placeholder="e.g. CHQ-001234" value={disbRef} onChange={e => setDisbRef(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Disbursement Notes</Label>
              <Textarea placeholder="Add any notes..." value={disbNotes} onChange={e => setDisbNotes(e.target.value)} rows={2} />
            </div>
            <Button className="bg-cyan-600 hover:bg-cyan-700" disabled={actionLoading} onClick={handleDisbursement}>
              <CircleDollarSign className="w-4 h-4 mr-2" /> Process Disbursement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Approval Log */}
      {request.approvalLogs?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Activity Log</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {request.approvalLogs.map((log: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    log.action === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                    log.action === 'REJECTED' ? 'bg-red-100 text-red-600' :
                    log.action === 'SUBMITTED' ? 'bg-blue-100 text-blue-600' :
                    log.action === 'DISBURSED' ? 'bg-cyan-100 text-cyan-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {log.action === 'APPROVED' ? <CheckCircle className="w-3 h-3" /> :
                     log.action === 'REJECTED' ? <XCircle className="w-3 h-3" /> :
                     log.action === 'SUBMITTED' ? <Send className="w-3 h-3" /> :
                     log.action === 'DISBURSED' ? <CircleDollarSign className="w-3 h-3" /> :
                     <Info className="w-3 h-3" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{log.performedBy?.name} - {log.action}</p>
                    {log.comment && <p className="text-gray-500">{log.comment}</p>}
                    <p className="text-xs text-gray-400">{formatDateTime(log.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== APPROVALS PAGE ====================
function ApprovalsPage() {
  const { navigate } = useAppStore();
  const { user } = useAuthStore();
  const role = user?.role as Role;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Get all requests and filter client-side for pending
        const data = await apiFetch('/api/requests?limit=100');
        const pending = (data.requests || []).filter((r: any) => {
          if (role === ROLES.OPS_MANAGER) return r.status === 'PENDING_OPS_MANAGER';
          if (role === ROLES.CHIEF_ACCOUNTANT) return r.status === 'PENDING_CHIEF_ACCOUNTANT';
          if (role === ROLES.GENERAL_MANAGER) return r.status === 'PENDING_GENERAL_MANAGER';
          if (role === ROLES.CASHIER) return r.status === 'PENDING_DISBURSEMENT';
          if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) {
            return ['PENDING_OPS_MANAGER', 'PENDING_CHIEF_ACCOUNTANT', 'PENDING_GENERAL_MANAGER', 'PENDING_DISBURSEMENT'].includes(r.status);
          }
          return false;
        });
        setRequests(pending);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [role]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals Queue</h1>
        <p className="text-gray-500">Requests pending your review</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('request-detail', req.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-gray-500">{req.requestNumber}</span>
                      {getStatusBadge(req.status)}
                      {getUrgencyBadge(req.urgency)}
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{req.title}</h3>
                    <p className="text-sm text-gray-500">By {req.requestedBy?.name} | {formatDate(req.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(req.amount)}</p>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Eye className="w-4 h-4 mr-1" /> Review</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-12 text-center"><CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" /><p className="text-gray-500">No pending approvals. All caught up!</p></CardContent></Card>
      )}
    </div>
  );
}

// ==================== REPORTS PAGE ====================
function ReportsPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/stats').then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    if (!stats?.categoryBreakdown) return;
    const rows = stats.categoryBreakdown.map((c: any) => `${c.category},${c._count},${c._sum?.amount || 0}`);
    const csv = `Category,Count,Amount\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'expense-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-72 rounded-xl" /></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Comprehensive expense analysis</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Requests" value={stats?.totalRequests || 0} icon={FileText} color="emerald" />
        <StatCard title="Total Amount" value={formatCurrency(stats?.totalAmount || 0)} icon={DollarSign} color="teal" />
        <StatCard title="Disbursed" value={stats?.disbursed || 0} icon={CheckCircle} color="green" />
        <StatCard title="Rejected" value={stats?.rejected || 0} icon={XCircle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Spending by Category</CardTitle></CardHeader>
          <CardContent>
            {stats?.categoryBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.categoryBreakdown.map((c: any) => ({ name: c.category, amount: c._sum?.amount || 0, count: c._count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <RTooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-500 text-center py-12">No data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RPieChart>
                <Pie
                  data={[
                    { name: 'Pending Ops', value: stats?.pendingOpsManager || 0 },
                    { name: 'Pending Acct', value: stats?.pendingChiefAccountant || 0 },
                    { name: 'Pending GM', value: stats?.pendingGeneralManager || 0 },
                    { name: 'Pending Cash', value: stats?.pendingDisbursement || 0 },
                    { name: 'Disbursed', value: stats?.disbursed || 0 },
                    { name: 'Rejected', value: stats?.rejected || 0 },
                  ]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <RTooltip />
              </RPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== ADMIN USERS PAGE ====================
function AdminUsersPage() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '' });
  const [departments, setDepartments] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [usersData, deptData] = await Promise.all([apiFetch('/api/users'), apiFetch('/api/departments')]);
      setUsers(usersData);
      setDepartments(deptData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    setFormLoading(true);
    try {
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) });
      toast.success('User created successfully');
      setShowDialog(false);
      setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '' });
      loadData();
    } catch (err: any) { alert(err.message); }
    finally { setFormLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Manage company users and roles</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '' }); }}>
              <Plus className="w-4 h-4 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New User</DialogTitle><DialogDescription>Create a new user account in your company</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'SUPER_ADMIN').map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.departmentId} onValueChange={v => setForm({ ...form, departmentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={formLoading}>
                {formLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null} Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <Skeleton className="h-64 rounded-xl" /> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7"><AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">{getInitials(u.name)}</AvatarFallback></Avatar>
                          {u.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{ROLE_LABELS[u.role as Role] || u.role}</Badge></TableCell>
                      <TableCell>{u.department?.name || 'N/A'}</TableCell>
                      <TableCell><Badge className={u.isActive ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-red-100 text-red-700 border-0'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== ADMIN DEPARTMENTS PAGE ====================
function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch('/api/departments');
      setDepartments(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await apiFetch('/api/departments', { method: 'POST', body: JSON.stringify({ name: newName }) });
      setNewName('');
      loadData();
    } catch (err: any) { alert(err.message); }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <p className="text-gray-500">Manage company departments</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input placeholder="Department name" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-xs" />
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? <Skeleton className="h-48 rounded-xl" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(d => (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-sm text-gray-500">{d._count?.users || 0} users | {d._count?.requests || 0} requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== ADMIN COMPANIES PAGE ====================
function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', industry: '', currency: 'USD' });
  const [formLoading, setFormLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch('/api/companies');
      setCompanies(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    setFormLoading(true);
    try {
      await apiFetch('/api/companies', { method: 'POST', body: JSON.stringify(form) });
      setShowDialog(false);
      setForm({ name: '', industry: '', currency: 'USD' });
      loadData();
    } catch (err: any) { alert(err.message); }
    finally { setFormLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-500">Manage organizations on the platform</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Company</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Company</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Company Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Industry</Label><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} /></div>
              <div className="space-y-2"><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={formLoading}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <Skeleton className="h-48 rounded-xl" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(c => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.industry || 'No industry'} | {c.currency}</p>
                    <div className="flex gap-3 mt-2 text-sm text-gray-500">
                      <span>{c._count?.users || 0} users</span>
                      <span>{c._count?.departments || 0} depts</span>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-400">Invite Code: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{c.inviteCode}</code></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== NOTIFICATIONS PAGE ====================
function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/notifications').then(data => setNotifications(data.notifications || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await Promise.all(notifications.filter(n => !n.read).map(n => apiFetch(`/api/notifications/${n.id}/read`, { method: 'POST' })));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'APPROVAL': case 'DISBURSEMENT': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'REJECTION': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'SUBMISSION': return <Send className="w-5 h-5 text-blue-500" />;
      case 'INFO_REQUEST': return <Info className="w-5 h-5 text-amber-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">Stay updated on your requests</p>
        </div>
        <Button variant="outline" onClick={markAllRead}><CheckCircle className="w-4 h-4 mr-2" /> Mark All Read</Button>
      </div>

      {loading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div> : (
        notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map(n => (
              <Card key={n.id} className={`cursor-pointer transition-colors ${n.read ? 'bg-white' : 'bg-emerald-50/50 border-emerald-100'}`} onClick={() => markRead(n.id)}>
                <CardContent className="p-4 flex items-start gap-3">
                  {getNotifIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-gray-500">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-12 text-center"><Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No notifications yet</p></CardContent></Card>
        )
      )}
    </div>
  );
}

// ==================== PROFILE PAGE ====================
function ProfilePage() {
  const { user } = useAuthStore();
  const role = user?.role as Role;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500">Manage your account settings</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xl">{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-gray-500">{user?.email}</p>
              <Badge className="mt-1 bg-emerald-100 text-emerald-700 border-0">{ROLE_LABELS[role] || role}</Badge>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">Company</p><p className="font-medium">{user?.companyName}</p></div>
            <div><p className="text-gray-500">Role</p><p className="font-medium">{ROLE_LABELS[role] || role}</p></div>
            <div><p className="text-gray-500">Email</p><p className="font-medium">{user?.email}</p></div>
            <div><p className="text-gray-500">User ID</p><p className="font-mono text-xs">{user?.id}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
