'use client'

import { useEffect, useState } from 'react'
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
import { Search, MapPin, RefreshCw, Eye, CheckCircle2, Ban, AlertTriangle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export default function FuelReportsPage() {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [detailReport, setDetailReport] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchReports() }, [])

    const fetchReports = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/admin/fuel-reports', { headers })
            if (res.ok) setReports(await res.json())
        } catch (e) {
            console.error(e)
            toast.error('Failed to load reports')
        } finally {
            setLoading(false)
        }
    }

    const filtered = reports.filter(r => {
        const scoutName = r.scout?.full_name?.toLowerCase() || ''
        const bunkId = r.bunk_place_id?.toLowerCase() || ''
        const matchSearch = scoutName.includes(searchTerm.toLowerCase()) || bunkId.includes(searchTerm.toLowerCase())
        const matchStatus = statusFilter === 'all' || r.status === statusFilter
        return matchSearch && matchStatus
    })

    const totalReports = reports.length
    const pendingReports = reports.filter(r => r.status === 'pending').length
    const verifiedReports = reports.filter(r => r.status === 'verified').length
    const disputedReports = reports.filter(r => r.status === 'disputed').length

    const handleAction = async (report, action) => {
        if (!confirm(`Are you sure you want to ${action} this report?`)) return
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/fuel-reports', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ report_id: report.id, action })
            })
            if (!res.ok) throw new Error()
            toast.success(`Report ${action === 'verify' ? 'verified' : 'rejected'} successfully`)
            fetchReports()
            setDetailReport(null)
        } catch {
            toast.error(`Failed to ${action} report`)
        } finally {
            setActionLoading(false)
        }
    }

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

    if (loading) return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Fuel Reports</h2>
                    <p className="text-muted-foreground">Manage community fuel price reports & verifications.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchReports} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><MapPin className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{totalReports}</p><p className="text-xs text-muted-foreground">Total Reports</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><AlertTriangle className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{pendingReports}</p><p className="text-xs text-muted-foreground">Pending</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{verifiedReports}</p><p className="text-xs text-muted-foreground">Verified</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Ban className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{disputedReports}</p><p className="text-xs text-muted-foreground">Disputed</p></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search user or bunk ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="disputed">Disputed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="font-semibold">Photo</TableHead>
                                <TableHead className="font-semibold">Scout Rider</TableHead>
                                <TableHead className="font-semibold">Bunk ID</TableHead>
                                <TableHead className="font-semibold">Prices</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold">Reported At</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((report) => (
                                <TableRow key={report.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell>
                                        <div className="h-12 w-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer" onClick={() => setDetailReport(report)}>
                                            {report.photo_url ? (
                                                <Image src={report.photo_url} alt="Bunk photo" width={48} height={48} className="object-cover h-full w-full" />
                                            ) : (
                                                <MapPin className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-sm">{report.scout?.full_name || 'Unknown'}</p>
                                        <p className="text-xs text-muted-foreground">{report.scout?.mobile || '-'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 truncate max-w-[120px] inline-block">
                                            {report.bunk_place_id || 'Unknown/GPS'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {report.price_petrol && <p className="text-xs"><span className="font-semibold text-orange-600">P:</span> ₹{report.price_petrol}</p>}
                                        {report.price_diesel && <p className="text-xs"><span className="font-semibold text-blue-600">D:</span> ₹{report.price_diesel}</p>}
                                    </TableCell>
                                    <TableCell>
                                        {report.status === 'pending' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">Pending</span>}
                                        {report.status === 'verified' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">Verified</span>}
                                        {report.status === 'disputed' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">Disputed</span>}
                                        {report.status === 'corrected' && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">Corrected</span>}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{formatDate(report.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => setDetailReport(report)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <MapPin className="h-10 w-10 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No fuel reports found</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={!!detailReport} onOpenChange={() => setDetailReport(null)}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" /> Fuel Report Details
                        </DialogTitle>
                    </DialogHeader>
                    {detailReport && (
                        <div className="space-y-4">
                            
                            {detailReport.photo_url && (
                                <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden relative">
                                    <Image src={detailReport.photo_url} alt="Bunk photo" fill className="object-cover" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Scout Rider</p>
                                    <p className="font-semibold">{detailReport.scout?.full_name}</p>
                                    <p className="text-xs text-gray-500">{detailReport.scout?.mobile}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                                    <p className="font-semibold uppercase text-sm tracking-wider">{detailReport.status}</p>
                                    {detailReport.verifier && <p className="text-xs text-gray-500 mt-1">By: {detailReport.verifier.full_name}</p>}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Reported Prices</p>
                                    {detailReport.price_petrol && <p className="font-medium text-sm text-orange-600">Petrol: ₹{detailReport.price_petrol}</p>}
                                    {detailReport.price_diesel && <p className="font-medium text-sm text-blue-600">Diesel: ₹{detailReport.price_diesel}</p>}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">GPS Location</p>
                                    <p className="font-mono text-xs">{detailReport.latitude}, {detailReport.longitude}</p>
                                    <a href={`https://www.google.com/maps?q=${detailReport.latitude},${detailReport.longitude}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">View on Map</a>
                                </div>
                            </div>

                            <DialogFooter className="mt-6 flex sm:justify-between w-full">
                                {detailReport.status === 'pending' ? (
                                    <>
                                        <Button variant="destructive" onClick={() => handleAction(detailReport, 'reject')} disabled={actionLoading} className="gap-2">
                                            <Ban className="h-4 w-4" /> {actionLoading ? 'Processing...' : 'Reject & Freeze'}
                                        </Button>
                                        <Button onClick={() => handleAction(detailReport, 'verify')} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 gap-2">
                                            <CheckCircle2 className="h-4 w-4" /> {actionLoading ? 'Processing...' : 'Approve Report'}
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" onClick={() => setDetailReport(null)} className="w-full">Close window</Button>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
