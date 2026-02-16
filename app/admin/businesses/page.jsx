'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Building2, Search, Star, Eye, Clock, RefreshCw, Trash2, MapPin, Package,
    CheckCircle, XCircle, Loader2, Users, Phone, Mail, FileText, ExternalLink,
    ShieldCheck, ToggleLeft, ToggleRight
} from 'lucide-react'
import { toast } from 'sonner'

export default function BusinessesPage() {
    const [businesses, setBusinesses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [selected, setSelected] = useState(new Set())

    // Detail
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailBiz, setDetailBiz] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('info')

    // Actions
    const [togglingId, setTogglingId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [bulkDeleting, setBulkDeleting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchBusinesses() }, [])

    const fetchBusinesses = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        try {
            const res = await fetch('/api/admin/businesses', { headers })
            if (!res.ok) throw new Error()
            setBusinesses(await res.json())
        } catch { toast.error('Failed to load businesses') }
        finally { setLoading(false); setRefreshing(false) }
    }

    const fetchBizDetail = async (bizId) => {
        setDetailOpen(true)
        setDetailLoading(true)
        setDetailBiz(null)
        setActiveTab('info')
        try {
            const res = await fetch(`/api/admin/businesses?id=${bizId}`, { headers })
            if (!res.ok) throw new Error()
            setDetailBiz(await res.json())
        } catch { toast.error('Failed to load business details') }
        finally { setDetailLoading(false) }
    }

    // Filters
    const categories = [...new Set(businesses.map(b => b.category).filter(Boolean))]
    const filtered = businesses.filter(b => {
        const name = b.business_name?.toLowerCase() || ''
        const vendor = b.vendor_profiles?.users?.full_name?.toLowerCase() || ''
        const landmark = b.landmark?.toLowerCase() || ''
        const term = searchTerm.toLowerCase()
        const matchSearch = name.includes(term) || vendor.includes(term) || landmark.includes(term)
        const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? b.is_active : !b.is_active)
        const matchCategory = categoryFilter === 'all' || b.category === categoryFilter
        return matchSearch && matchStatus && matchCategory
    })

    // Stats
    const activeCount = businesses.filter(b => b.is_active).length
    const inactiveCount = businesses.filter(b => !b.is_active).length
    const totalServices = businesses.reduce((a, b) => a + (b.services_count || 0), 0)
    const avgRating = businesses.length > 0 ? (businesses.reduce((a, b) => a + Number(b.avg_rating || 0), 0) / businesses.length).toFixed(1) : '0.0'

    // Selection
    const toggleSelect = (id) => {
        const next = new Set(selected)
        next.has(id) ? next.delete(id) : next.add(id)
        setSelected(next)
    }
    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set())
        else setSelected(new Set(filtered.map(b => b.id)))
    }

    // Toggle active
    const handleToggle = async (id, newActive) => {
        setTogglingId(id)
        try {
            const res = await fetch('/api/admin/businesses', { method: 'PUT', headers, body: JSON.stringify({ id, is_active: newActive }) })
            if (!res.ok) throw new Error()
            toast.success(`Business ${newActive ? 'activated' : 'deactivated'}`)
            fetchBusinesses()
            if (detailBiz?.id === id) fetchBizDetail(id)
        } catch { toast.error('Failed to update') }
        finally { setTogglingId(null) }
    }

    // Delete
    const handleDelete = async (id) => {
        if (!confirm('Delete this business? This performs a soft delete.')) return
        setDeletingId(id)
        try {
            const res = await fetch(`/api/admin/businesses?id=${id}`, { method: 'DELETE', headers })
            if (!res.ok) throw new Error()
            toast.success('Business deleted')
            setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
            if (detailBiz?.id === id) { setDetailOpen(false); setDetailBiz(null) }
            fetchBusinesses()
        } catch { toast.error('Failed to delete') }
        finally { setDeletingId(null) }
    }

    const handleBulkDelete = async () => {
        if (selected.size === 0) return
        if (!confirm(`Delete ${selected.size} business(es)?`)) return
        setBulkDeleting(true)
        try {
            const ids = Array.from(selected).join(',')
            const res = await fetch(`/api/admin/businesses?ids=${ids}`, { method: 'DELETE', headers })
            if (!res.ok) throw new Error()
            toast.success(`${selected.size} businesses deleted`)
            setSelected(new Set())
            fetchBusinesses()
        } catch { toast.error('Failed to delete') }
        finally { setBulkDeleting(false) }
    }

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const formatTime = (t) => t?.slice(0, 5) || '-'

    if (loading) return (
        <div className="space-y-6">
            <div className="h-8 w-56 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}</div>
            <Card className="border-0 shadow-sm"><CardContent className="py-20"><div className="h-8 bg-gray-100 rounded animate-pulse max-w-md mx-auto" /></CardContent></Card>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Business Directory</h2>
                    <p className="text-muted-foreground">Manage registered businesses, services, and reviews</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchBusinesses(true)} disabled={refreshing} className="gap-2">
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total Businesses', value: businesses.length, icon: Building2, gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-600' },
                    { label: 'Active', value: activeCount, icon: CheckCircle, gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
                    { label: 'Total Services', value: totalServices, icon: Package, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
                    { label: 'Avg Rating', value: avgRating, icon: Star, gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600' },
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
                    <Input placeholder="Search by name, vendor, or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                {selected.size > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-2">
                        {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete {selected.size}
                    </Button>
                )}
            </div>

            {/* Businesses Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="w-[40px]">
                                    <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300 accent-orange-600" />
                                </TableHead>
                                <TableHead className="font-semibold">Business</TableHead>
                                <TableHead className="font-semibold">Vendor</TableHead>
                                <TableHead className="font-semibold">Category</TableHead>
                                <TableHead className="font-semibold">Services</TableHead>
                                <TableHead className="font-semibold">Rating</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold">Hours</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((biz) => {
                                const vendor = biz.vendor_profiles?.users

                                return (
                                    <TableRow key={biz.id} className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selected.has(biz.id) ? 'bg-blue-50/30' : ''} ${!biz.is_active ? 'opacity-60' : ''}`}>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox" checked={selected.has(biz.id)} onChange={() => toggleSelect(biz.id)} className="h-4 w-4 rounded border-gray-300 accent-orange-600" />
                                        </TableCell>
                                        <TableCell onClick={() => fetchBizDetail(biz.id)}>
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-9 w-9 rounded-lg bg-orange-50 border flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {biz.logo_url ? (
                                                        <img src={biz.logo_url} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Building2 className="h-4 w-4 text-orange-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{biz.business_name}</p>
                                                    {biz.landmark && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {biz.landmark}</p>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchBizDetail(biz.id)}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={vendor?.profile_image_url || ''} />
                                                    <AvatarFallback className="text-[8px] bg-gray-100">{vendor?.full_name?.substring(0, 2)?.toUpperCase() || 'NA'}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{vendor?.full_name || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchBizDetail(biz.id)}>
                                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 capitalize">{biz.category || '-'}</span>
                                        </TableCell>
                                        <TableCell onClick={() => fetchBizDetail(biz.id)}>
                                            <div className="flex items-center gap-1.5">
                                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm font-medium">{biz.services_count || 0}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchBizDetail(biz.id)}>
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                <span className="text-sm font-medium">{biz.avg_rating}</span>
                                                {biz.review_count > 0 && <span className="text-[10px] text-muted-foreground">({biz.review_count})</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell onClick={() => fetchBizDetail(biz.id)}>
                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${biz.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                {biz.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                {biz.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                        <TableCell onClick={() => fetchBizDetail(biz.id)} className="text-xs text-muted-foreground">
                                            {biz.open_time && biz.close_time ? `${formatTime(biz.open_time)} - ${formatTime(biz.close_time)}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => fetchBizDetail(biz.id)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleToggle(biz.id, !biz.is_active)} disabled={togglingId === biz.id}
                                                    className={`h-8 w-8 p-0 ${biz.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                    {togglingId === biz.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (biz.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />)}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(biz.id)} disabled={deletingId === biz.id} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                                                    {deletingId === biz.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                                        <Building2 className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No businesses found</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ========== BUSINESS DETAIL DIALOG ========== */}
            <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setDetailBiz(null) }}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="h-5 w-5 text-orange-600" />
                            {detailLoading ? 'Loading Business...' : (detailBiz?.business_name || 'Business Details')}
                        </DialogTitle>
                    </DialogHeader>

                    {detailLoading ? (
                        <div className="py-16 flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                            <div className="text-center">
                                <p className="font-medium text-gray-700">Fetching business details</p>
                                <p className="text-sm text-muted-foreground mt-1">Loading services, reviews, and vendor info...</p>
                            </div>
                        </div>
                    ) : detailBiz && (
                        <div className="space-y-5">
                            {/* Tab Navigation */}
                            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                {[
                                    { key: 'info', label: 'Overview', icon: Eye },
                                    { key: 'services', label: `Services (${detailBiz.services?.length || 0})`, icon: Package },
                                    { key: 'reviews', label: `Reviews (${detailBiz.reviews?.length || 0})`, icon: Star },
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

                            {/* OVERVIEW TAB */}
                            {activeTab === 'info' && (
                                <div className="space-y-4">
                                    {/* Header with image */}
                                    {detailBiz.featured_image_url && (
                                        <div className="h-40 rounded-xl overflow-hidden">
                                            <img src={detailBiz.featured_image_url} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    {/* Status + Category */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`text-xs font-medium px-3 py-1.5 rounded-full border inline-flex items-center gap-1 ${detailBiz.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {detailBiz.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                            {detailBiz.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 capitalize">{detailBiz.category}</span>
                                        {detailBiz.restroom_available && (
                                            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">🚻 Restroom</span>
                                        )}
                                    </div>

                                    {/* Business Info */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Building2 className="h-3.5 w-3.5" /> Business Details
                                        </p>
                                        <div className="flex items-start gap-4">
                                            <div className="h-14 w-14 rounded-lg bg-white border flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {detailBiz.logo_url ? (
                                                    <img src={detailBiz.logo_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <Building2 className="h-6 w-6 text-gray-300" />
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <p className="text-lg font-semibold">{detailBiz.business_name}</p>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                                    {detailBiz.landmark && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {detailBiz.landmark}</span>}
                                                    {detailBiz.open_time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(detailBiz.open_time)} - {formatTime(detailBiz.close_time)}</span>}
                                                </div>
                                                <p className="text-xs text-muted-foreground">Created {formatDate(detailBiz.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Vendor Info */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" /> Vendor (Owner)
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={detailBiz.vendor_profiles?.users?.profile_image_url || ''} />
                                                <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold">
                                                    {detailBiz.vendor_profiles?.users?.full_name?.substring(0, 2)?.toUpperCase() || 'NA'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{detailBiz.vendor_profiles?.users?.full_name || 'Unknown'}</p>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {detailBiz.vendor_profiles?.users?.mobile || '-'}</span>
                                                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {detailBiz.vendor_profiles?.users?.email || '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${detailBiz.vendor_profiles?.verification_status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                        {detailBiz.vendor_profiles?.verification_status}
                                                    </span>
                                                    {detailBiz.vendor_profiles?.gst_number && (
                                                        <span className="text-[10px] font-mono text-muted-foreground">GST: {detailBiz.vendor_profiles.gst_number}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amenities */}
                                    {detailBiz.amenities?.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Amenities</p>
                                            <div className="flex flex-wrap gap-2">
                                                {detailBiz.amenities.map((a, i) => (
                                                    <span key={a.id || i} className="text-xs bg-white border rounded-md px-2.5 py-1.5 inline-flex items-center gap-1.5">
                                                        {a.icon && <img src={a.icon} alt="" className="h-4 w-4" />} {a.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SERVICES TAB */}
                            {activeTab === 'services' && (
                                <div className="space-y-3">
                                    {detailBiz.services?.length > 0 ? detailBiz.services.map((svc) => (
                                        <div key={svc.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                <Package className="h-5 w-5 text-blue-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm">{svc.name}</p>
                                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${svc.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        {svc.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                {svc.description && <p className="text-xs text-muted-foreground truncate">{svc.description}</p>}
                                            </div>
                                            <p className="font-semibold text-green-600">₹{Number(svc.price).toLocaleString()}</p>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <Package className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                                            <p className="text-sm">No services registered</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* REVIEWS TAB */}
                            {activeTab === 'reviews' && (
                                <div className="space-y-3">
                                    {detailBiz.reviews?.length > 0 ? detailBiz.reviews.map((rev) => (
                                        <div key={rev.id} className="bg-gray-50 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={rev.users?.profile_image_url || ''} />
                                                    <AvatarFallback className="text-[10px] bg-amber-50 text-amber-700">
                                                        {rev.users?.full_name?.substring(0, 2)?.toUpperCase() || '??'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-medium text-sm">{rev.users?.full_name || 'Anonymous'}</p>
                                                        <span className="text-[10px] text-muted-foreground">{formatDate(rev.created_at)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 mt-0.5">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star key={i} className={`h-3.5 w-3.5 ${i < rev.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}`} />
                                                        ))}
                                                    </div>
                                                    {rev.comment && <p className="text-sm text-muted-foreground mt-1.5">{rev.comment}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <Star className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                                            <p className="text-sm">No reviews yet</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => handleToggle(detailBiz.id, !detailBiz.is_active)}
                                    className={`gap-2 ${detailBiz.is_active ? 'text-amber-700 border-amber-200 hover:bg-amber-50' : 'text-green-700 border-green-200 hover:bg-green-50'}`}>
                                    {detailBiz.is_active ? <><ToggleRight className="h-4 w-4" /> Deactivate</> : <><ToggleLeft className="h-4 w-4" /> Activate</>}
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(detailBiz.id)} className="gap-2">
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
