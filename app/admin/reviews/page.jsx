'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Star, Search, Trash2, Eye, RefreshCw, AlertTriangle, CheckCircle2, XCircle, ShieldAlert, MessageSquare, Flag } from 'lucide-react'
import { toast } from 'sonner'

export default function ReviewsPage() {
    const [reviews, setReviews] = useState([])
    const [reported, setReported] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [ratingFilter, setRatingFilter] = useState('all')
    const [reportStatusFilter, setReportStatusFilter] = useState('all')
    const [activeTab, setActiveTab] = useState('all')

    // Action dialog state
    const [actionReport, setActionReport] = useState(null)
    const [actionType, setActionType] = useState('')
    const [noticeMessage, setNoticeMessage] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [detailReview, setDetailReview] = useState(null)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchAll() }, [])

    const fetchAll = () => { fetchReviews(); fetchReported() }

    const fetchReviews = async () => {
        try {
            const res = await fetch('/api/admin/reviews', { headers })
            if (res.ok) {
                const json = await res.json()
                setReviews(json.data || json || [])
            }
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const fetchReported = async () => {
        try {
            const res = await fetch('/api/admin/reviews?reported=true', { headers })
            if (res.ok) {
                const json = await res.json()
                setReported(json.data || json || [])
            }
        } catch (e) { console.error(e) }
    }

    // Delete review
    const handleDelete = async (id) => {
        if (!confirm('Delete this review permanently?')) return
        try {
            const res = await fetch(`/api/admin/reviews?id=${id}`, { method: 'DELETE', headers })
            if (!res.ok) throw new Error()
            toast.success('Review deleted')
            fetchAll()
        } catch { toast.error('Failed to delete') }
    }

    // Take action on reported review
    const handleReportAction = async () => {
        if (!actionReport || !actionType) return
        setActionLoading(true)
        try {
            const body = { report_id: actionReport.report_id, action: actionType }
            if (noticeMessage.trim()) body.notice_message = noticeMessage.trim()
            const res = await fetch('/api/admin/reviews', {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
            })
            if (!res.ok) throw new Error()
            toast.success(actionType === 'delete' ? 'Review deleted & rider notified' : `Report marked as ${actionType}`)
            setActionReport(null)
            setActionType('')
            setNoticeMessage('')
            fetchAll()
        } catch { toast.error('Action failed') }
        finally { setActionLoading(false) }
    }

    // Filters
    const filteredReviews = reviews.filter(r => {
        const matchSearch = (r.vendor_businesses?.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.review || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.rider_profiles?.users?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchRating = ratingFilter === 'all' || r.rating === Number(ratingFilter)
        return matchSearch && matchRating
    })

    const filteredReported = reported.filter(r => {
        const matchSearch = (r.review?.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.reason || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchStatus = reportStatusFilter === 'all' || r.report_status === reportStatusFilter
        return matchSearch && matchStatus
    })

    const totalReviews = reviews.length
    const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length).toFixed(1) : 0
    const pendingReports = reported.filter(r => r.report_status === 'pending').length

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        ))
    }

    const reportStatusBadge = (status) => {
        const map = {
            pending: 'bg-amber-50 text-amber-700 border-amber-200',
            reviewed: 'bg-blue-50 text-blue-700 border-blue-200',
            dismissed: 'bg-gray-50 text-gray-700 border-gray-200',
        }
        return map[status] || 'bg-gray-50 text-gray-700 border-gray-200'
    }

    if (loading) return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-3">
                {[1, 2, 3].map(i => <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Review Management</h2>
                    <p className="text-muted-foreground">Moderate reviews and handle vendor reports</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Star className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{totalReviews}</p><p className="text-xs text-muted-foreground">Total Reviews</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><Star className="h-5 w-5 fill-green-600" /></div>
                            <div><p className="text-2xl font-bold">{avgRating}</p><p className="text-xs text-muted-foreground">Average Rating</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Flag className="h-5 w-5" /></div>
                            <div>
                                <p className="text-2xl font-bold">{pendingReports}</p>
                                <p className="text-xs text-muted-foreground">Pending Reports</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-gray-100">
                    <TabsTrigger value="all" className="gap-2">
                        <MessageSquare className="h-4 w-4" /> All Reviews
                        <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">{totalReviews}</span>
                    </TabsTrigger>
                    <TabsTrigger value="reported" className="gap-2">
                        <Flag className="h-4 w-4" /> Reported
                        {pendingReports > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">{pendingReports}</span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* All Reviews Tab */}
                <TabsContent value="all" className="space-y-4 mt-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search business, review, or reviewer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                        </div>
                        <Select value={ratingFilter} onValueChange={setRatingFilter}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Rating" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Ratings</SelectItem>
                                {[5, 4, 3, 2, 1].map(r => <SelectItem key={r} value={String(r)}>{r} Star{r > 1 ? 's' : ''}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Business</TableHead>
                                        <TableHead className="font-semibold">Reviewer</TableHead>
                                        <TableHead className="font-semibold">Rating</TableHead>
                                        <TableHead className="font-semibold">Review</TableHead>
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReviews.length > 0 ? filteredReviews.map((review) => (
                                        <TableRow key={review.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="font-medium text-sm">{review.vendor_businesses?.business_name || '-'}</TableCell>
                                            <TableCell className="text-sm">{review.rider_profiles?.users?.full_name || 'Anonymous'}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-0.5">{renderStars(review.rating)}</div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px]">
                                                <p className="text-sm truncate">{review.review || '-'}</p>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => setDetailReview(review)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(review.id)} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                                                <Star className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                                <p className="font-medium">{searchTerm || ratingFilter !== 'all' ? 'No reviews match your filters' : 'No reviews found'}</p>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Reported Reviews Tab */}
                <TabsContent value="reported" className="space-y-4 mt-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search reported reviews..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                        </div>
                        <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
                            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Report Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Reports</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="dismissed">Dismissed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold">Business</TableHead>
                                        <TableHead className="font-semibold">Reported By</TableHead>
                                        <TableHead className="font-semibold">Reason</TableHead>
                                        <TableHead className="font-semibold">Review</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="font-semibold text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReported.length > 0 ? filteredReported.map((report) => (
                                        <TableRow key={report.report_id} className={`hover:bg-gray-50/50 transition-colors ${report.report_status === 'pending' ? 'bg-amber-50/20' : ''}`}>
                                            <TableCell className="font-medium text-sm">{report.review?.business_name || '-'}</TableCell>
                                            <TableCell className="text-sm">{report.reported_by || 'Unknown'}</TableCell>
                                            <TableCell>
                                                <p className="text-sm text-red-600 max-w-[150px] truncate">{report.reason || '-'}</p>
                                            </TableCell>
                                            <TableCell className="max-w-[150px]">
                                                <p className="text-sm truncate">{report.review?.review || '-'}</p>
                                                <div className="flex items-center gap-0.5 mt-1">{renderStars(report.review?.rating || 0)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${reportStatusBadge(report.report_status)}`}>
                                                    {report.report_status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {report.report_status === 'pending' ? (
                                                    <Button size="sm" variant="outline" onClick={() => { setActionReport(report); setActionType(''); setNoticeMessage('') }} className="gap-1 text-xs">
                                                        <ShieldAlert className="h-3.5 w-3.5" /> Take Action
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Handled</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                                                <Flag className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                                <p className="font-medium">{searchTerm || reportStatusFilter !== 'all' ? 'No reports match your filters' : 'No reported reviews'}</p>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Review Detail Dialog */}
            <Dialog open={!!detailReview} onOpenChange={() => setDetailReview(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-amber-500" /> Review Details
                        </DialogTitle>
                    </DialogHeader>
                    {detailReview && (
                        <div className="space-y-4">
                            <div className="bg-amber-50 rounded-xl p-4">
                                <p className="font-semibold text-sm">{detailReview.vendor_businesses?.business_name || 'Unknown Business'}</p>
                                <div className="flex items-center gap-1 mt-1">{renderStars(detailReview.rating)}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground mb-1">Reviewer</p>
                                <p className="text-sm font-medium">{detailReview.rider_profiles?.users?.full_name || 'Anonymous'}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground mb-1">Review</p>
                                <p className="text-sm">{detailReview.review || 'No text review'}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground mb-1">Posted</p>
                                <p className="text-sm">{new Date(detailReview.created_at).toLocaleString('en-IN')}</p>
                            </div>
                            <DialogFooter>
                                <Button variant="destructive" size="sm" onClick={() => { handleDelete(detailReview.id); setDetailReview(null) }} className="gap-2">
                                    <Trash2 className="h-4 w-4" /> Delete Review
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Report Action Dialog */}
            <Dialog open={!!actionReport} onOpenChange={() => setActionReport(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-600" /> Take Action on Report
                        </DialogTitle>
                        <DialogDescription>Manage this reported review</DialogDescription>
                    </DialogHeader>
                    {actionReport && (
                        <div className="space-y-4">
                            {/* Report Info */}
                            <div className="bg-red-50 rounded-xl p-4 space-y-2">
                                <p className="text-xs font-medium text-red-800">Reported by: {actionReport.reported_by}</p>
                                <p className="text-sm text-red-700">&ldquo;{actionReport.reason}&rdquo;</p>
                            </div>

                            {/* The Review */}
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground mb-1">The Review ({actionReport.review?.business_name})</p>
                                <div className="flex items-center gap-1 mb-1">{renderStars(actionReport.review?.rating || 0)}</div>
                                <p className="text-sm">{actionReport.review?.review || 'No text'}</p>
                                <p className="text-xs text-muted-foreground mt-1">By: {actionReport.review?.reviewer_name}</p>
                            </div>

                            {/* Action Selection */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Select Action</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setActionType('dismissed')}
                                        className={`p-3 rounded-lg border-2 text-center transition-all ${actionType === 'dismissed' ? 'border-gray-500 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <XCircle className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                                        <p className="text-xs font-medium">Dismiss</p>
                                    </button>
                                    <button
                                        onClick={() => setActionType('reviewed')}
                                        className={`p-3 rounded-lg border-2 text-center transition-all ${actionType === 'reviewed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
                                    >
                                        <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                                        <p className="text-xs font-medium">Reviewed</p>
                                    </button>
                                    <button
                                        onClick={() => setActionType('delete')}
                                        className={`p-3 rounded-lg border-2 text-center transition-all ${actionType === 'delete' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}
                                    >
                                        <Trash2 className="h-5 w-5 mx-auto mb-1 text-red-500" />
                                        <p className="text-xs font-medium">Delete</p>
                                    </button>
                                </div>
                            </div>

                            {/* Optional Notice */}
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Send Notice to Reviewer (optional)</label>
                                <Textarea
                                    placeholder="e.g. Your review was removed due to policy violations..."
                                    value={noticeMessage}
                                    onChange={(e) => setNoticeMessage(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setActionReport(null)}>Cancel</Button>
                                <Button
                                    onClick={handleReportAction}
                                    disabled={!actionType || actionLoading}
                                    className={actionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
                                >
                                    {actionLoading ? 'Processing...' : actionType === 'delete' ? 'Delete & Notify' : 'Confirm Action'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
