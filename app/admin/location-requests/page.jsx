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
import { Textarea } from '@/components/ui/textarea'
import {
    MapPin, Search, Eye, CheckCircle, XCircle, Clock, Loader2, RefreshCw,
    Droplets, Fuel, Image as ImageIcon, MessageSquare, AlertCircle, IndianRupee
} from 'lucide-react'
import { toast } from 'sonner'

const STATUSES = ['pending', 'approved', 'rejected']
const TYPES = ['washroom', 'petrol_pump']

export default function LocationRequestsPage() {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [refreshing, setRefreshing] = useState(false)

    // Detail Dialog
    const [detailOpen, setDetailOpen] = useState(false)
    const [activeRequest, setActiveRequest] = useState(null)
    const [adminRemark, setAdminRemark] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchRequests() }, [])

    const fetchRequests = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        try {
            const res = await fetch('/api/admin/location-requests', { headers })
            if (!res.ok) throw new Error()
            setRequests((await res.json()).data)
        } catch { toast.error('Failed to load location requests') }
        finally { setLoading(false); setRefreshing(false) }
    }

    const openDetail = (req) => {
        setActiveRequest(req)
        setAdminRemark(req.admin_remark || '')
        setDetailOpen(true)
    }

    const handleAction = async (status) => {
        if (status === 'rejected' && !adminRemark.trim()) {
            toast.error('Please provide a remark for rejection.')
            return
        }

        setActionLoading(true)
        try {
            const res = await fetch(`/api/admin/location-requests/${activeRequest.id}/status`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ status, admin_remark: adminRemark })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Failed to update status')
            
            toast.success(data.message || `Request ${status} successfully`)
            setDetailOpen(false)
            fetchRequests()
        } catch (err) { 
            toast.error(err.message || 'Failed to update request') 
        } finally { 
            setActionLoading(false) 
        }
    }

    // Filters
    const filtered = requests.filter(r => {
        const name = r.name?.toLowerCase() || ''
        const riderName = r.rider?.users?.full_name?.toLowerCase() || ''
        const term = searchTerm.toLowerCase()
        const matchSearch = name.includes(term) || riderName.includes(term)
        const matchStatus = statusFilter === 'all' || r.status === statusFilter
        const matchType = typeFilter === 'all' || r.type === typeFilter
        return matchSearch && matchStatus && matchType
    })

    // Stats
    const pendingCount = requests.filter(r => r.status === 'pending').length
    const approvedCount = requests.filter(r => r.status === 'approved').length
    const rejectedCount = requests.filter(r => r.status === 'rejected').length

    // UI Helpers
    const statusBadge = (s) => ({
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
        approved: 'bg-green-50 text-green-700 border-green-200',
        rejected: 'bg-red-50 text-red-700 border-red-200',
    }[s] || 'bg-gray-50 text-gray-700 border-gray-200')

    const typeBadge = (t) => ({
        washroom: 'bg-blue-50 text-blue-700 border-blue-200',
        petrol_pump: 'bg-orange-50 text-orange-700 border-orange-200',
    }[t] || 'bg-gray-50 text-gray-700 border-gray-200')

    const typeIcon = (t) => ({
        washroom: <Droplets className="h-3 w-3" />,
        petrol_pump: <Fuel className="h-3 w-3" />,
    }[t] || <MapPin className="h-3 w-3" />)

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

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
                    <h2 className="text-3xl font-bold tracking-tight">Location Requests</h2>
                    <p className="text-muted-foreground">Review and approve locations submitted by riders</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchRequests(true)} disabled={refreshing} className="gap-2">
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total Requests', value: requests.length, icon: MapPin, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
                    { label: 'Pending', value: pendingCount, icon: Clock, gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600' },
                    { label: 'Approved', value: approvedCount, icon: CheckCircle, gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
                    { label: 'Rejected', value: rejectedCount, icon: XCircle, gradient: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-600' },
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
                    <Input placeholder="Search by location name or rider..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="font-semibold">Location</TableHead>
                                <TableHead className="font-semibold">Type</TableHead>
                                <TableHead className="font-semibold">Coordinates</TableHead>
                                <TableHead className="font-semibold">Pricing</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold">Submitted By</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((req) => (
                                <TableRow key={req.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                                    <TableCell onClick={() => openDetail(req)}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-md bg-gray-100 border overflow-hidden flex-shrink-0">
                                                {req.image_url ? (
                                                    <img src={req.image_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <ImageIcon className="h-5 w-5 text-gray-400 m-auto mt-2.5" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{req.name}</p>
                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <Clock className="h-3 w-3" /> {formatDate(req.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell onClick={() => openDetail(req)}>
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1 capitalize ${typeBadge(req.type)}`}>
                                            {typeIcon(req.type)} {req.type.replace('_', ' ')}
                                        </span>
                                    </TableCell>
                                    <TableCell onClick={() => openDetail(req)} className="font-mono text-xs text-muted-foreground">
                                        {Number(req.latitude).toFixed(4)}, {Number(req.longitude).toFixed(4)}
                                    </TableCell>
                                    <TableCell onClick={() => openDetail(req)}>
                                        {req.type === 'washroom' ? (
                                            req.is_paid ? (
                                                <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                                    <IndianRupee className="h-3 w-3" /> {req.price}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-green-700">Free</span>
                                            )
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell onClick={() => openDetail(req)}>
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border inline-flex items-center gap-1 capitalize ${statusBadge(req.status)}`}>
                                            {req.status === 'pending' && <Clock className="h-3 w-3" />}
                                            {req.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                                            {req.status === 'rejected' && <XCircle className="h-3 w-3" />}
                                            {req.status}
                                        </span>
                                    </TableCell>
                                    <TableCell onClick={() => openDetail(req)}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                                                    {req.rider?.users?.full_name?.substring(0, 2)?.toUpperCase() || 'R'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{req.rider?.users?.full_name || 'Unknown'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" onClick={() => openDetail(req)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                                        <MapPin className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No location requests found</p>
                                        <p className="text-xs mt-1">Try adjusting your filters</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* DETAIL MODAL */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            Location Request Review
                        </DialogTitle>
                    </DialogHeader>

                    {activeRequest && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                            {/* Left Column: Image and Map Link */}
                            <div className="space-y-4">
                                <div className="rounded-xl overflow-hidden border bg-gray-100 aspect-[4/3] relative group">
                                    {activeRequest.image_url ? (
                                        <img src={activeRequest.image_url} alt={activeRequest.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                                            <span>No Image Provided</span>
                                        </div>
                                    )}
                                </div>
                                
                                <a 
                                    href={`https://www.google.com/maps?q=${activeRequest.latitude},${activeRequest.longitude}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border bg-blue-50/50 hover:bg-blue-50 text-blue-600 font-medium text-sm transition-colors"
                                >
                                    <MapPin className="h-4 w-4" /> Open Coordinates in Google Maps
                                </a>
                            </div>

                            {/* Right Column: Details & Actions */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold">{activeRequest.name}</h3>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(activeRequest.status)}`}>
                                            {activeRequest.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1 capitalize ${typeBadge(activeRequest.type)}`}>
                                            {typeIcon(activeRequest.type)} {activeRequest.type.replace('_', ' ')}
                                        </span>
                                        {activeRequest.type === 'washroom' && (
                                            activeRequest.is_paid ? (
                                                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                    Paid: ₹{activeRequest.price}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                    Free Washroom
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border text-sm space-y-1">
                                    <div className="flex items-start gap-2 text-gray-600">
                                        <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <p className="leading-relaxed">{activeRequest.message || 'No description provided.'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 py-3 border-y border-dashed">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                                            {activeRequest.rider?.users?.full_name?.substring(0, 2)?.toUpperCase() || 'R'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium">Submitted by {activeRequest.rider?.users?.full_name || 'Unknown'}</p>
                                        <p className="text-xs text-muted-foreground">{formatDate(activeRequest.created_at)}</p>
                                    </div>
                                </div>

                                {/* Actions area */}
                                {activeRequest.status === 'pending' ? (
                                    <div className="space-y-3 pt-2">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-700">Admin Remark (Optional for approve, required for reject)</label>
                                            <Textarea 
                                                placeholder="Add your public remark..." 
                                                className="resize-none h-20 text-sm"
                                                value={adminRemark}
                                                onChange={(e) => setAdminRemark(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button 
                                                variant="outline" 
                                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleAction('rejected')}
                                                disabled={actionLoading}
                                            >
                                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} 
                                                Reject Location
                                            </Button>
                                            <Button 
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => handleAction('approved')}
                                                disabled={actionLoading}
                                            >
                                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} 
                                                Approve & Add
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 flex items-start gap-1">
                                            <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                            Approving this will automatically create a public business entry in the system. The system checks for duplicates within 100 meters.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 pt-2">
                                        <p className="text-xs font-medium text-gray-500 uppercase">Review Status</p>
                                        <div className={`p-3 rounded-lg border text-sm ${activeRequest.status === 'approved' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                            <div className="font-semibold mb-1 flex items-center gap-1.5">
                                                {activeRequest.status === 'approved' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                {activeRequest.status === 'approved' ? 'Request Approved' : 'Request Rejected'}
                                            </div>
                                            <p className="opacity-90">{activeRequest.admin_remark || 'No remark provided by admin.'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
