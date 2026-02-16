'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
    Store, Search, Star, Eye, Users, ShieldCheck, ShieldX, RefreshCw, Trash2,
    MapPin, Phone, Mail, Clock, FileText, ChevronRight, ExternalLink, Loader2,
    CheckCircle, XCircle, AlertTriangle, Building2, Package, IndianRupee, Ban, UserCheck
} from 'lucide-react'
import { toast } from 'sonner'

const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected']

export default function VendorsPage() {
    const [vendors, setVendors] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState(new Set())

    // Detail
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailVendor, setDetailVendor] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('info')

    // Actions
    const [actionLoading, setActionLoading] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchVendors() }, [])

    const fetchVendors = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        try {
            const res = await fetch('/api/admin/vendors', { headers })
            if (!res.ok) throw new Error()
            setVendors(await res.json())
        } catch { toast.error('Failed to load vendors') }
        finally { setLoading(false); setRefreshing(false) }
    }

    const fetchVendorDetail = async (vendorId) => {
        setDetailOpen(true)
        setDetailLoading(true)
        setDetailVendor(null)
        setActiveTab('info')
        try {
            const res = await fetch(`/api/admin/vendors?id=${vendorId}`, { headers })
            if (!res.ok) throw new Error()
            setDetailVendor(await res.json())
        } catch { toast.error('Failed to load vendor details') }
        finally { setDetailLoading(false) }
    }

    // Filters
    const filtered = vendors.filter(v => {
        const name = v.users?.full_name?.toLowerCase() || ''
        const mobile = v.users?.mobile?.toLowerCase() || ''
        const email = v.users?.email?.toLowerCase() || ''
        const gst = v.gst_number?.toLowerCase() || ''
        const term = searchTerm.toLowerCase()
        const matchSearch = name.includes(term) || mobile.includes(term) || email.includes(term) || gst.includes(term)
        const matchStatus = statusFilter === 'all' || v.verification_status === statusFilter
        return matchSearch && matchStatus
    })

    // Stats
    const approvedCount = vendors.filter(v => v.verification_status === 'approved').length
    const pendingCount = vendors.filter(v => v.verification_status === 'pending').length
    const rejectedCount = vendors.filter(v => v.verification_status === 'rejected').length
    const suspendedCount = vendors.filter(v => !v.users?.is_active).length

    // Selection
    const toggleSelect = (id) => {
        const next = new Set(selected)
        next.has(id) ? next.delete(id) : next.add(id)
        setSelected(next)
    }
    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set())
        else setSelected(new Set(filtered.map(v => v.id)))
    }

    // Approve/Reject
    const handleVerification = async (id, status) => {
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/vendors', {
                method: 'PUT', headers,
                body: JSON.stringify({ id, verification_status: status })
            })
            if (!res.ok) throw new Error()
            toast.success(`Vendor ${status}`)
            fetchVendors()
            // Refresh detail if open
            if (detailVendor?.id === id) fetchVendorDetail(id)
        } catch { toast.error('Failed to update vendor') }
        finally { setActionLoading(false) }
    }

    // Suspend/Unsuspend
    const handleSuspend = async (id, suspend) => {
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/vendors', {
                method: 'PATCH', headers,
                body: JSON.stringify({ id, suspended: suspend })
            })
            if (!res.ok) throw new Error()
            toast.success(`Vendor ${suspend ? 'suspended' : 'reactivated'}`)
            fetchVendors()
            if (detailVendor?.id === id) fetchVendorDetail(id)
        } catch { toast.error('Failed to update vendor') }
        finally { setActionLoading(false) }
    }

    // Delete
    const handleDelete = async (id) => {
        if (!confirm('Delete this vendor permanently? This removes the user and all associated data.')) return
        setDeletingId(id)
        try {
            const res = await fetch(`/api/admin/vendors?id=${id}`, { method: 'DELETE', headers })
            if (!res.ok) throw new Error()
            toast.success('Vendor deleted')
            setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
            if (detailVendor?.id === id) { setDetailOpen(false); setDetailVendor(null) }
            fetchVendors()
        } catch { toast.error('Failed to delete') }
        finally { setDeletingId(null) }
    }

    const handleBulkDelete = async () => {
        if (selected.size === 0) return
        if (!confirm(`Delete ${selected.size} vendor(s) permanently? This removes users and all associated data.`)) return
        setBulkDeleting(true)
        try {
            const ids = Array.from(selected).join(',')
            const res = await fetch(`/api/admin/vendors?ids=${ids}`, { method: 'DELETE', headers })
            if (!res.ok) throw new Error()
            toast.success(`${selected.size} vendors deleted`)
            setSelected(new Set())
            fetchVendors()
        } catch { toast.error('Failed to delete') }
        finally { setBulkDeleting(false) }
    }

    const handleBulkSuspend = async () => {
        if (selected.size === 0) return
        if (!confirm(`Suspend ${selected.size} vendor account(s)?`)) return
        setActionLoading(true)
        try {
            for (const id of selected) {
                await fetch('/api/admin/vendors', {
                    method: 'PATCH', headers,
                    body: JSON.stringify({ id, suspended: true })
                })
            }
            toast.success(`${selected.size} vendors suspended`)
            setSelected(new Set())
            fetchVendors()
        } catch { toast.error('Failed to suspend') }
        finally { setActionLoading(false) }
    }

    // Badges
    const verifyBadge = (s) => ({
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
        approved: 'bg-green-50 text-green-700 border-green-200',
        rejected: 'bg-red-50 text-red-700 border-red-200',
    }[s] || 'bg-gray-50 text-gray-700 border-gray-200')

    const verifyIcon = (s) => ({
        pending: <Clock className="h-3 w-3" />,
        approved: <CheckCircle className="h-3 w-3" />,
        rejected: <XCircle className="h-3 w-3" />,
    }[s] || null)

    const logIcon = (action) => ({
        verification_change: <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />,
        account_status: <Ban className="h-3.5 w-3.5 text-red-500" />,
        note_added: <FileText className="h-3.5 w-3.5 text-gray-500" />,
    }[action] || <Clock className="h-3.5 w-3.5 text-gray-400" />)

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const formatDateTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

    if (loading) return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}</div>
            <Card className="border-0 shadow-sm"><CardContent className="py-20"><div className="h-8 bg-gray-100 rounded animate-pulse max-w-md mx-auto" /></CardContent></Card>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Vendor Management</h2>
                    <p className="text-muted-foreground">Review applications, manage accounts, and monitor businesses</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchVendors(true)} disabled={refreshing} className="gap-2">
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total Vendors', value: vendors.length, icon: Store, gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-600' },
                    { label: 'Approved', value: approvedCount, icon: CheckCircle, gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
                    { label: 'Pending', value: pendingCount, icon: Clock, gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600' },
                    { label: 'Suspended', value: suspendedCount, icon: Ban, gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-600' },
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
                    <Input placeholder="Search by name, mobile, email, or GST..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Verification" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {VERIFICATION_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                {selected.size > 0 && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleBulkSuspend} disabled={actionLoading} className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50">
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Suspend {selected.size}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-2">
                            {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete {selected.size}
                        </Button>
                    </div>
                )}
            </div>

            {/* Vendors Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="w-[40px]">
                                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300 accent-orange-600" />
                                </TableHead>
                                <TableHead className="font-semibold">Vendor</TableHead>
                                <TableHead className="font-semibold">Contact</TableHead>
                                <TableHead className="font-semibold">GST</TableHead>
                                <TableHead className="font-semibold">Verification</TableHead>
                                <TableHead className="font-semibold">Businesses</TableHead>
                                <TableHead className="font-semibold">Rating</TableHead>
                                <TableHead className="font-semibold">Joined</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((vendor) => {
                                const user = vendor.users
                                const isSuspended = !user?.is_active

                                return (
                                    <TableRow key={vendor.id} className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selected.has(vendor.id) ? 'bg-blue-50/30' : ''} ${isSuspended ? 'opacity-60' : ''}`}>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={selected.has(vendor.id)} onChange={() => toggleSelect(vendor.id)} className="h-4 w-4 rounded border-gray-300 accent-orange-600" />
                                        </TableCell>
                                        <TableCell onClick={() => fetchVendorDetail(vendor.id)}>
                                            <div className="flex items-center gap-2.5">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={user?.profile_image_url || ''} />
                                                    <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                                                        {user?.full_name?.substring(0, 2)?.toUpperCase() || <Store className="h-4 w-4" />}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">{user?.full_name || 'Unknown'}</p>
                                                    {isSuspended && (
                                                        <span className="text-[10px] text-red-600 font-medium flex items-center gap-0.5">
                                                            <Ban className="h-2.5 w-2.5" /> Suspended
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchVendorDetail(vendor.id)}>
                                            <p className="text-sm">{user?.mobile || '-'}</p>
                                            <p className="text-[10px] text-muted-foreground">{user?.email || '-'}</p>
                                        </TableCell>
                                        <TableCell onClick={() => fetchVendorDetail(vendor.id)} className="font-mono text-xs">
                                            {vendor.gst_number || <span className="text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell onClick={() => fetchVendorDetail(vendor.id)}>
                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${verifyBadge(vendor.verification_status)}`}>
                                                {verifyIcon(vendor.verification_status)}
                                                {vendor.verification_status}
                                            </span>
                                        </TableCell>
                                        <TableCell onClick={() => fetchVendorDetail(vendor.id)}>
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm font-medium">{vendor.business_count || 0}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchVendorDetail(vendor.id)}>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                <span className="text-sm font-medium">{Number(vendor.average_rating || 0).toFixed(1)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchVendorDetail(vendor.id)} className="text-muted-foreground text-sm">
                                            {formatDate(vendor.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => fetchVendorDetail(vendor.id)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {vendor.verification_status === 'pending' && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleVerification(vendor.id, 'approved')} className="h-8 w-8 p-0 text-green-600 hover:bg-green-50">
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => handleSuspend(vendor.id, !isSuspended)} className={`h-8 w-8 p-0 ${isSuspended ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'}`}>
                                                    {isSuspended ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(vendor.id)} disabled={deletingId === vendor.id} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                                                    {deletingId === vendor.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                                        <Store className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No vendors found</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ========== VENDOR DETAIL DIALOG ========== */}
            <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setDetailVendor(null) }}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Store className="h-5 w-5 text-orange-600" />
                            {detailLoading ? 'Loading Vendor...' : (detailVendor?.users?.full_name || 'Vendor Profile')}
                        </DialogTitle>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="py-16 flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                            <div className="text-center">
                                <p className="font-medium text-gray-700">Fetching vendor details</p>
                                <p className="text-sm text-muted-foreground mt-1">Loading profile, businesses, and activity logs...</p>
                            </div>
                        </div>
                    ) : detailVendor && (
                        <div className="space-y-5">
                            {/* Tab Navigation */}
                            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                {[
                                    { key: 'info', label: 'Profile', icon: Users },
                                    { key: 'businesses', label: `Businesses (${detailVendor.businesses?.length || 0})`, icon: Building2 },
                                    { key: 'logs', label: 'Activity Log', icon: FileText },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <tab.icon className="h-4 w-4" /> {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* PROFILE TAB */}
                            {activeTab === 'info' && (
                                <div className="space-y-4">
                                    {/* Account Status Banner */}
                                    {!detailVendor.users?.is_active && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                                            <Ban className="h-4 w-4" /> This vendor account is currently <strong>suspended</strong>
                                        </div>
                                    )}

                                    {/* Status badges */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`text-xs font-medium px-3 py-1.5 rounded-full border inline-flex items-center gap-1 ${verifyBadge(detailVendor.verification_status)}`}>
                                            {verifyIcon(detailVendor.verification_status)}
                                            {detailVendor.verification_status}
                                        </span>
                                        <div className="flex items-center gap-1 text-sm">
                                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                            <span className="font-medium">{Number(detailVendor.average_rating || 0).toFixed(1)}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground ml-auto">
                                            {detailVendor.total_views || 0} views
                                        </span>
                                    </div>

                                    {/* Vendor Profile */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" /> Vendor Information
                                        </p>
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-14 w-14">
                                                <AvatarImage src={detailVendor.users?.profile_image_url || ''} />
                                                <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold text-lg">
                                                    {detailVendor.users?.full_name?.substring(0, 2)?.toUpperCase() || 'NA'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1.5">
                                                <p className="text-lg font-semibold">{detailVendor.users?.full_name || 'Unknown'}</p>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {detailVendor.users?.mobile || '-'}</span>
                                                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {detailVendor.users?.email || '-'}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Joined {formatDate(detailVendor.users?.created_at || detailVendor.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* GST & Documents */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <FileText className="h-3.5 w-3.5" /> Documents & GST
                                        </p>
                                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                            <div>
                                                <span className="text-muted-foreground text-xs">GST Number</span>
                                                <p className="font-mono font-medium">{detailVendor.gst_number || 'Not provided'}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground text-xs">Businesses</span>
                                                <p className="font-medium">{detailVendor.businesses?.length || 0} registered</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { label: 'GST Certificate', url: detailVendor.gst_document_url },
                                                { label: 'PAN Document', url: detailVendor.pan_document_url },
                                                { label: 'Other Document', url: detailVendor.other_document_url },
                                            ].map((doc, i) => (
                                                doc.url ? (
                                                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-white transition-colors text-xs font-medium text-blue-600">
                                                        <ExternalLink className="h-3.5 w-3.5" /> {doc.label}
                                                    </a>
                                                ) : (
                                                    <div key={i} className="p-2.5 border rounded-lg border-dashed text-xs text-gray-400">
                                                        No {doc.label}
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BUSINESSES TAB */}
                            {activeTab === 'businesses' && (
                                <div className="space-y-3">
                                    {detailVendor.businesses?.length > 0 ? detailVendor.businesses.map((biz) => (
                                        <div key={biz.id} className="bg-gray-50 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="h-14 w-14 rounded-lg bg-white border flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {biz.logo_url ? (
                                                        <img src={biz.logo_url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Building2 className="h-6 w-6 text-gray-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-semibold">{biz.business_name}</p>
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 capitalize">
                                                            {biz.category}
                                                        </span>
                                                        {!biz.is_active && (
                                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Inactive</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                                        {biz.landmark && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {biz.landmark}</span>}
                                                        {(biz.open_time || biz.close_time) && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {biz.open_time?.slice(0, 5)} - {biz.close_time?.slice(0, 5)}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {biz.services_count} services</span>
                                                    </div>

                                                    {/* Services list */}
                                                    {biz.services?.length > 0 && (
                                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                            {biz.services.slice(0, 5).map(svc => (
                                                                <span key={svc.id} className="text-[10px] bg-white border rounded-md px-2 py-1 inline-flex items-center gap-1">
                                                                    {svc.name} <span className="text-green-600 font-medium">₹{Number(svc.price).toLocaleString()}</span>
                                                                </span>
                                                            ))}
                                                            {biz.services.length > 5 && (
                                                                <span className="text-[10px] text-muted-foreground py-1">+{biz.services.length - 5} more</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <Building2 className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                                            <p className="text-sm">No businesses registered yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LOGS TAB */}
                            {activeTab === 'logs' && (
                                <div className="space-y-0">
                                    {detailVendor.logs?.length > 0 ? (
                                        <div className="relative">
                                            <div className="absolute left-[15px] top-3 bottom-3 w-[2px] bg-gray-200" />
                                            {detailVendor.logs.map((log, idx) => (
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
                                            <p className="text-sm">No activity logged for this vendor yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <DialogFooter className="gap-2 flex-wrap">
                                {detailVendor.verification_status === 'pending' && (
                                    <>
                                        <Button onClick={() => handleVerification(detailVendor.id, 'approved')} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 gap-2">
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Approve
                                        </Button>
                                        <Button variant="outline" onClick={() => handleVerification(detailVendor.id, 'rejected')} disabled={actionLoading} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Reject
                                        </Button>
                                    </>
                                )}
                                <Button variant="outline" onClick={() => handleSuspend(detailVendor.id, detailVendor.users?.is_active)} disabled={actionLoading}
                                    className={`gap-2 ${detailVendor.users?.is_active ? 'text-amber-700 border-amber-200 hover:bg-amber-50' : 'text-green-700 border-green-200 hover:bg-green-50'}`}>
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (detailVendor.users?.is_active ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />)}
                                    {detailVendor.users?.is_active ? 'Suspend' : 'Reactivate'}
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(detailVendor.id)} className="gap-2">
                                    <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
