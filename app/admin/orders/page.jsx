'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    ShoppingCart, Search, IndianRupee, Clock, XCircle, Trash2, Eye, RefreshCw,
    Package, MapPin, User, Truck, FileText, ChevronRight, CheckCircle2, AlertTriangle,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded', 'failed']

export default function OrdersPage() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [paymentFilter, setPaymentFilter] = useState('all')
    const [selected, setSelected] = useState(new Set())

    // Detail / Edit
    const [detailOrder, setDetailOrder] = useState(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailLoading, setDetailLoading] = useState(false)
    const [editOrder, setEditOrder] = useState(null)
    const [editStatus, setEditStatus] = useState('')
    const [editPayment, setEditPayment] = useState('')
    const [editTracking, setEditTracking] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [activeDetailTab, setActiveDetailTab] = useState('info')
    const [deletingId, setDeletingId] = useState(null)
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchOrders() }, [])

    const fetchOrders = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        try {
            const res = await fetch('/api/admin/orders', { headers })
            if (!res.ok) throw new Error()
            setOrders(await res.json())
        } catch { toast.error('Failed to load orders') }
        finally { setLoading(false); setRefreshing(false) }
    }

    // Fetch single order full detail — opens modal immediately with spinner
    const fetchOrderDetail = async (orderId) => {
        setDetailOpen(true)
        setDetailLoading(true)
        setDetailOrder(null)
        setActiveDetailTab('info')
        try {
            const res = await fetch(`/api/admin/orders?id=${orderId}`, { headers })
            if (!res.ok) throw new Error()
            setDetailOrder(await res.json())
        } catch { toast.error('Failed to load order details') }
        finally { setDetailLoading(false) }
    }

    // Filters
    const filtered = orders.filter(o => {
        const id = o.id?.toLowerCase() || ''
        const buyerName = o.rider_profiles?.users?.full_name?.toLowerCase() || ''
        const term = searchTerm.toLowerCase()
        const matchSearch = id.includes(term) || buyerName.includes(term)
        const matchStatus = statusFilter === 'all' || o.status === statusFilter
        const matchPayment = paymentFilter === 'all' || o.payment_status === paymentFilter
        return matchSearch && matchStatus && matchPayment
    })

    // Stats
    const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((a, o) => a + (Number(o.total_amount) || 0), 0)
    const pendingCount = orders.filter(o => o.status === 'pending').length
    const cancelledCount = orders.filter(o => o.status === 'cancelled').length
    const deliveredCount = orders.filter(o => o.status === 'delivered').length

    // Selection
    const toggleSelect = (id) => {
        const next = new Set(selected)
        next.has(id) ? next.delete(id) : next.add(id)
        setSelected(next)
    }
    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set())
        else setSelected(new Set(filtered.map(o => o.id)))
    }

    // Update order
    const handleUpdate = async () => {
        setActionLoading(true)
        try {
            const body = { id: editOrder.id }
            if (editStatus && editStatus !== editOrder.status) body.status = editStatus
            if (editPayment && editPayment !== editOrder.payment_status) body.payment_status = editPayment
            if (editTracking !== (editOrder.tracking_number || '')) body.tracking_number = editTracking
            const res = await fetch('/api/admin/orders', { method: 'PATCH', headers, body: JSON.stringify(body) })
            if (!res.ok) throw new Error()
            toast.success('Order updated & buyer notified')
            setEditOrder(null)
            fetchOrders()
        } catch { toast.error('Failed to update') }
        finally { setActionLoading(false) }
    }

    // Delete
    const handleDelete = async (id) => {
        if (!confirm('Delete this order permanently?')) return
        setDeletingId(id)
        try {
            const res = await fetch(`/api/admin/orders?id=${id}`, { method: 'DELETE', headers })
            if (!res.ok) throw new Error()
            toast.success('Order deleted')
            setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
            fetchOrders()
        } catch { toast.error('Failed to delete') }
        finally { setDeletingId(null) }
    }

    const handleBulkDelete = async () => {
        if (selected.size === 0) return
        if (!confirm(`Delete ${selected.size} order(s) permanently?`)) return
        setBulkDeleting(true)
        try {
            const ids = Array.from(selected).join(',')
            const res = await fetch(`/api/admin/orders?ids=${ids}`, { method: 'DELETE', headers })
            if (!res.ok) throw new Error()
            toast.success(`${selected.size} orders deleted`)
            setSelected(new Set())
            fetchOrders()
        } catch { toast.error('Failed to delete') }
        finally { setBulkDeleting(false) }
    }

    // Badge helpers
    const statusBadge = (s) => ({
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
        confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
        processing: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        shipped: 'bg-purple-50 text-purple-700 border-purple-200',
        delivered: 'bg-green-50 text-green-700 border-green-200',
        cancelled: 'bg-red-50 text-red-700 border-red-200',
    }[s] || 'bg-gray-50 text-gray-700 border-gray-200')

    const paymentBadge = (s) => ({
        paid: 'bg-green-50 text-green-700 border-green-200',
        unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
        refunded: 'bg-blue-50 text-blue-700 border-blue-200',
        failed: 'bg-red-50 text-red-700 border-red-200',
    }[s] || 'bg-gray-50 text-gray-700 border-gray-200')

    const logIcon = (action) => ({
        status_change: <RefreshCw className="h-3.5 w-3.5 text-blue-500" />,
        payment_update: <IndianRupee className="h-3.5 w-3.5 text-green-500" />,
        tracking_added: <Truck className="h-3.5 w-3.5 text-purple-500" />,
        note_added: <FileText className="h-3.5 w-3.5 text-gray-500" />,
    }[action] || <Clock className="h-3.5 w-3.5 text-gray-400" />)

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    const formatDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

    if (loading) return (
        <div className="space-y-6">
            <div className="h-8 w-52 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}
            </div>
            <Card className="border-0 shadow-sm"><CardContent className="py-20"><div className="h-8 bg-gray-100 rounded animate-pulse max-w-md mx-auto" /></CardContent></Card>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
                    <p className="text-muted-foreground">View details, update status, track deliveries, and manage all orders</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchOrders(true)} disabled={refreshing} className="gap-2">
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total Orders', value: orders.length, icon: ShoppingCart, gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-600' },
                    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
                    { label: 'Delivered', value: deliveredCount, icon: CheckCircle2, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
                    { label: 'Pending', value: pendingCount, icon: Clock, gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600' },
                ].map((card, i) => (
                    <Card key={i} className="border-0 shadow-sm overflow-hidden">
                        <div className={`h-1 bg-gradient-to-r ${card.gradient}`} />
                        <CardContent className="pt-5 pb-4 px-5">
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.bg} ${card.text}`}>
                                    <card.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{card.value}</p>
                                    <p className="text-xs text-muted-foreground">{card.label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by order ID or buyer name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {ORDER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Payment" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Payments</SelectItem>
                        {PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                {selected.size > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-2">
                        {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete {selected.size}
                    </Button>
                )}
            </div>

            {/* Orders Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="w-[40px]">
                                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300 accent-orange-600" />
                                </TableHead>
                                <TableHead className="font-semibold">Order</TableHead>
                                <TableHead className="font-semibold">Buyer</TableHead>
                                <TableHead className="font-semibold">Items</TableHead>
                                <TableHead className="font-semibold">Amount</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold">Payment</TableHead>
                                <TableHead className="font-semibold">Date</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((order) => {
                                const buyer = order.rider_profiles?.users
                                const addr = order.delivery_addresses
                                const itemCount = order.order_items?.length || 0
                                const itemPreview = order.order_items?.map(i => i.product_name).join(', ') || '-'

                                return (
                                    <TableRow key={order.id} className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selected.has(order.id) ? 'bg-blue-50/30' : ''}`}>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={selected.has(order.id)} onChange={() => toggleSelect(order.id)} className="h-4 w-4 rounded border-gray-300 accent-orange-600" />
                                        </TableCell>
                                        <TableCell onClick={() => fetchOrderDetail(order.id)}>
                                            <p className="font-mono text-sm font-medium text-blue-600">#{order.id?.slice(0, 8)}</p>
                                            {order.tracking_number && (
                                                <p className="text-[10px] text-purple-600 mt-0.5 flex items-center gap-1">
                                                    <Truck className="h-3 w-3" /> {order.tracking_number}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell onClick={() => fetchOrderDetail(order.id)}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-7 w-7">
                                                    <AvatarImage src={buyer?.profile_image_url || ''} />
                                                    <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">{buyer?.full_name?.substring(0, 2)?.toUpperCase() || 'NA'}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">{buyer?.full_name || 'Unknown'}</p>
                                                    <p className="text-[10px] text-muted-foreground">{addr?.city ? `${addr.city}, ${addr.state || ''}` : '-'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchOrderDetail(order.id)}>
                                            <p className="text-sm">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                                            <p className="text-[10px] text-muted-foreground max-w-[120px] truncate">{itemPreview}</p>
                                        </TableCell>
                                        <TableCell onClick={() => fetchOrderDetail(order.id)} className="font-semibold">₹{Number(order.total_amount || 0).toLocaleString()}</TableCell>
                                        <TableCell onClick={() => fetchOrderDetail(order.id)}>
                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge(order.status)}`}>
                                                {order.status || 'pending'}
                                            </span>
                                        </TableCell>
                                        <TableCell onClick={() => fetchOrderDetail(order.id)}>
                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${paymentBadge(order.payment_status)}`}>
                                                {order.payment_status || 'unpaid'}
                                            </span>
                                        </TableCell>
                                        <TableCell onClick={() => fetchOrderDetail(order.id)} className="text-muted-foreground text-sm">
                                            {formatDate(order.created_at)}
                                            <span className="block text-[10px]">{formatTime(order.created_at)}</span>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => fetchOrderDetail(order.id)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"><Eye className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => { setEditOrder(order); setEditStatus(order.status || 'pending'); setEditPayment(order.payment_status || 'unpaid'); setEditTracking(order.tracking_number || '') }} className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-50"><RefreshCw className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(order.id)} disabled={deletingId === order.id} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                                                    {deletingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                                        <ShoppingCart className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No orders found</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ========== ORDER DETAIL DIALOG ========== */}
            <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setDetailOrder(null) }}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <ShoppingCart className="h-5 w-5 text-purple-600" />
                            {detailLoading ? 'Loading Order...' : `Order #${detailOrder?.id?.slice(0, 12) || ''}`}
                        </DialogTitle>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="py-16 flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                            <div className="text-center">
                                <p className="font-medium text-gray-700">Fetching order details</p>
                                <p className="text-sm text-muted-foreground mt-1">Loading buyer info, products, and activity logs...</p>
                            </div>
                        </div>
                    ) : detailOrder && (
                        <div className="space-y-5">
                            {/* Tab Navigation */}
                            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                {[
                                    { key: 'info', label: 'Overview', icon: Eye },
                                    { key: 'items', label: 'Products', icon: Package },
                                    { key: 'logs', label: 'Activity Log', icon: FileText },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveDetailTab(tab.key)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeDetailTab === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <tab.icon className="h-4 w-4" /> {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* INFO TAB */}
                            {activeDetailTab === 'info' && (
                                <div className="space-y-4">
                                    {/* Status Row */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${statusBadge(detailOrder.status)}`}>
                                            {detailOrder.status || 'pending'}
                                        </span>
                                        <span className={`text-xs font-medium px-3 py-1.5 rounded-full border ${paymentBadge(detailOrder.payment_status)}`}>
                                            {detailOrder.payment_status || 'unpaid'}
                                        </span>
                                        <span className="text-sm font-bold text-green-600 ml-auto">₹{Number(detailOrder.total_amount || 0).toLocaleString()}</span>
                                    </div>

                                    {/* Tracking */}
                                    {detailOrder.tracking_number && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-purple-600" />
                                            <span className="text-sm font-medium text-purple-700">Tracking: {detailOrder.tracking_number}</span>
                                        </div>
                                    )}

                                    {/* Buyer Info */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5" /> Buyer Information
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={detailOrder.rider_profiles?.users?.profile_image_url || ''} />
                                                <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold">
                                                    {detailOrder.rider_profiles?.users?.full_name?.substring(0, 2)?.toUpperCase() || 'NA'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{detailOrder.rider_profiles?.users?.full_name || 'Unknown'}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {detailOrder.rider_profiles?.users?.mobile || '-'} • {detailOrder.rider_profiles?.users?.email || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delivery Address */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" /> Delivery Address
                                        </p>
                                        {detailOrder.delivery_addresses ? (
                                            <div>
                                                <p className="font-medium">{detailOrder.delivery_addresses.full_name}</p>
                                                <p className="text-sm text-muted-foreground">{detailOrder.delivery_addresses.mobile}</p>
                                                <p className="text-sm mt-1">{detailOrder.delivery_addresses.address_line}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {[detailOrder.delivery_addresses.city, detailOrder.delivery_addresses.state, detailOrder.delivery_addresses.pincode].filter(Boolean).join(', ')}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No address on file</p>
                                        )}
                                    </div>

                                    {/* Payment Info */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <IndianRupee className="h-3.5 w-3.5" /> Payment Details
                                        </p>
                                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                                            <span className="text-muted-foreground">Amount</span>
                                            <span className="font-semibold text-right">₹{Number(detailOrder.total_amount || 0).toLocaleString()}</span>
                                            {detailOrder.razorpay_order_id && (
                                                <>
                                                    <span className="text-muted-foreground">Razorpay Order</span>
                                                    <span className="font-mono text-xs text-right">{detailOrder.razorpay_order_id}</span>
                                                </>
                                            )}
                                            {detailOrder.razorpay_payment_id && (
                                                <>
                                                    <span className="text-muted-foreground">Payment ID</span>
                                                    <span className="font-mono text-xs text-right">{detailOrder.razorpay_payment_id}</span>
                                                </>
                                            )}
                                            <span className="text-muted-foreground">Created</span>
                                            <span className="text-right">{new Date(detailOrder.created_at).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ITEMS TAB */}
                            {activeDetailTab === 'items' && (
                                <div className="space-y-3">
                                    {detailOrder.order_items?.length > 0 ? detailOrder.order_items.map((item, idx) => (
                                        <div key={item.id || idx} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                            <div className="h-12 w-12 rounded-lg bg-white border flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {item.products?.image_url ? (
                                                    <img src={item.products.image_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <Package className="h-5 w-5 text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{item.product_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    ₹{Number(item.price).toLocaleString()} × {item.quantity}
                                                </p>
                                            </div>
                                            <p className="font-semibold text-sm">₹{Number(item.total).toLocaleString()}</p>
                                        </div>
                                    )) : (
                                        <p className="text-center text-muted-foreground py-8">No items in this order</p>
                                    )}
                                    {detailOrder.order_items?.length > 0 && (
                                        <div className="flex justify-between items-center pt-3 border-t">
                                            <span className="font-medium text-muted-foreground">Total ({detailOrder.order_items.length} items)</span>
                                            <span className="text-lg font-bold text-green-600">₹{Number(detailOrder.total_amount || 0).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LOGS TAB */}
                            {activeDetailTab === 'logs' && (
                                <div className="space-y-0">
                                    {detailOrder.logs?.length > 0 ? (
                                        <div className="relative">
                                            <div className="absolute left-[15px] top-3 bottom-3 w-[2px] bg-gray-200" />
                                            {detailOrder.logs.map((log, idx) => (
                                                <div key={log.id || idx} className="flex items-start gap-3 py-3 relative">
                                                    <div className="h-8 w-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center z-10 flex-shrink-0">
                                                        {logIcon(log.action)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium">{log.message}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] text-muted-foreground">{formatDateTime(log.created_at)}</span>
                                                            {log.users?.full_name && (
                                                                <span className="text-[10px] text-muted-foreground">by {log.users.full_name}</span>
                                                            )}
                                                        </div>
                                                        {log.old_value && log.new_value && (
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{log.old_value}</span>
                                                                <ChevronRight className="h-3 w-3 text-gray-400" />
                                                                <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">{log.new_value}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <FileText className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                                            <p className="text-sm">No activity logged for this order yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quick Actions */}
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => { setDetailOpen(false); setDetailOrder(null); setEditOrder(detailOrder); setEditStatus(detailOrder.status || 'pending'); setEditPayment(detailOrder.payment_status || 'unpaid'); setEditTracking(detailOrder.tracking_number || '') }} className="gap-2">
                                    <RefreshCw className="h-4 w-4" /> Update Order
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => { handleDelete(detailOrder.id); setDetailOpen(false); setDetailOrder(null) }} className="gap-2">
                                    <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ========== EDIT ORDER DIALOG ========== */}
            <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-orange-600" /> Update Order
                        </DialogTitle>
                        <DialogDescription>Changes will notify the buyer automatically</DialogDescription>
                    </DialogHeader>
                    {editOrder && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="font-mono text-sm font-medium">#{editOrder.id?.slice(0, 12)}</p>
                                <p className="text-lg font-bold mt-1">₹{Number(editOrder.total_amount || 0).toLocaleString()}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Order Status</label>
                                <Select value={editStatus} onValueChange={setEditStatus}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{ORDER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Payment Status</label>
                                <Select value={editPayment} onValueChange={setEditPayment}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                                    <Truck className="h-3.5 w-3.5" /> Tracking Number
                                </label>
                                <Input
                                    placeholder="e.g. SHIP123456789"
                                    value={editTracking}
                                    onChange={(e) => setEditTracking(e.target.value)}
                                />
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>Status & tracking changes will send a push notification to the buyer.</span>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditOrder(null)}>Cancel</Button>
                                <Button onClick={handleUpdate} disabled={actionLoading} className="bg-orange-600 hover:bg-orange-700 gap-2">
                                    {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {actionLoading ? 'Saving...' : 'Save & Notify'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
