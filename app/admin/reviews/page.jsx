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
import { Star, Search, Trash2, Eye, RefreshCw, AlertTriangle, CheckCircle2, XCircle, ShieldAlert, MessageSquare, Flag, Loader2, Calendar, User, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function ReviewsPage() {
    const [reviews, setReviews] = useState([])
    const [reported, setReported] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [ratingFilter, setRatingFilter] = useState('all')
    const [reportStatusFilter, setReportStatusFilter] = useState('all')
    const [activeTab, setActiveTab] = useState('all')
    const [refreshing, setRefreshing] = useState(false)

    // Action dialog state
    const [actionReport, setActionReport] = useState(null)
    const [actionType, setActionType] = useState('')
    const [noticeMessage, setNoticeMessage] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [detailReview, setDetailReview] = useState(null)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchAll() }, [])

    const fetchAll = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        setLoading(true)
        await Promise.all([fetchReviews(), fetchReported()])
        setLoading(false)
        setRefreshing(false)
    }

    const fetchReviews = async () => {
        try {
            const res = await fetch('/api/admin/reviews', { headers })
            if (res.ok) {
                const json = await res.json()
                setReviews(json.data || json || [])
            }
        } catch (e) { console.error(e) }
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
        const businessName = (r.vendor_businesses?.business_name || '').toLowerCase()
        const reviewText = (r.review || '').toLowerCase()
        const reviewerName = (r.rider_profiles?.users?.full_name || '').toLowerCase()
        const searchQuery = searchTerm.toLowerCase()
        
        const matchSearch = businessName.includes(searchQuery) || 
                            reviewText.includes(searchQuery) || 
                            reviewerName.includes(searchQuery)
        const matchRating = ratingFilter === 'all' || r.rating === Number(ratingFilter)
        return matchSearch && matchRating
    })

    const filteredReported = reported.filter(r => {
        const businessName = (r.review?.business_name || '').toLowerCase()
        const reason = (r.reason || '').toLowerCase()
        const searchQuery = searchTerm.toLowerCase()
        
        const matchSearch = businessName.includes(searchQuery) || reason.includes(searchQuery)
        const matchStatus = reportStatusFilter === 'all' || r.report_status === reportStatusFilter
        return matchSearch && matchStatus
    })

    const totalReviews = reviews.length
    const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0'
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

    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

    if (loading && !refreshing) return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}
            </div>
            <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
        </div>
    )

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Review Management</h2>
                    <p className="text-sm text-muted-foreground">Moderate reviews and handle reported content</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchAll(true)} disabled={refreshing} className="gap-2 self-start sm:self-auto">
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                {[
                    { label: 'Total Reviews', value: totalReviews, icon: MessageSquare, color: 'amber' },
                    { label: 'Avg Rating', value: avgRating, icon: Star, color: 'green', fill: true },
                    { label: 'Pending Reports', value: pendingReports, icon: Flag, color: 'red' },
                ].map((stat, i) => (
                    <Card key={i} className="border-0 shadow-sm overflow-hidden">
                        <div className={`h-1 bg-${stat.color}-500`} />
                        <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600`}>
                                    <stat.icon className={`h-4.5 w-4.5 ${stat.fill ? 'fill-current' : ''}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xl font-bold leading-none">{stat.value}</p>
                                    <p className="text-[11px] text-muted-foreground mt-1 truncate">{stat.label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs & Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-gray-100/80 p-1 rounded-xl h-auto flex overflow-x-auto scroller-none">
                    <TabsTrigger value="all" className="rounded-lg py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <MessageSquare className="h-4 w-4 mr-2 hidden sm:inline" />
                        All Reviews
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-200 text-[10px] font-bold">{totalReviews}</span>
                    </TabsTrigger>
                    <TabsTrigger value="reported" className="rounded-lg py-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Flag className="h-4 w-4 mr-2 hidden sm:inline" />
                        Reported
                        {pendingReports > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">{pendingReports}</span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder={activeTab === 'all' ? "Search business, text, or reviewer..." : "Search reported reviews..."} 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="pl-10 h-10 w-full" 
                        />
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'all' ? (
                            <Select value={ratingFilter} onValueChange={setRatingFilter}>
                                <SelectTrigger className="w-[140px] h-10"><SelectValue placeholder="Rating" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Ratings</SelectItem>
                                    {[5, 4, 3, 2, 1].map(r => <SelectItem key={r} value={String(r)}>{r} Stars</SelectItem>)}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
                                <SelectTrigger className="w-[160px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="reviewed">Reviewed</SelectItem>
                                    <SelectItem value="dismissed">Dismissed</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* ALL REVIEWS CONTENT */}
                <TabsContent value="all" className="space-y-3">
                    {/* Desktop Table */}
                    <Card className="border-0 shadow-sm hidden md:block overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
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
                                        <TableCell className="font-medium">{review.vendor_businesses?.business_name || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={review.rider_profiles?.users?.profile_image_url} />
                                                    <AvatarFallback className="text-[10px] bg-slate-100">{review.rider_profiles?.users?.full_name?.substring(0, 2).toUpperCase() || 'NA'}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{review.rider_profiles?.users?.full_name || 'Anonymous'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell><div className="flex items-center">{renderStars(review.rating)}</div></TableCell>
                                        <TableCell className="max-w-[250px]"><p className="text-sm truncate">{review.review || '-'}</p></TableCell>
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(review.created_at)}</TableCell>
                                        <TableCell className="text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => setDetailReview(review)} className="h-8 w-8 p-0 text-blue-600"><Eye className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(review.id)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground"><MessageSquare className="h-10 w-10 mx-auto opacity-20 mb-3" />No reviews found</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredReviews.length > 0 ? filteredReviews.map((review) => (
                            <Card key={review.id} className="border-0 shadow-sm overflow-hidden" onClick={() => setDetailReview(review)}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600"><Building2 className="h-4 w-4" /></div>
                                            <div>
                                                <p className="font-semibold text-sm leading-tight">{review.vendor_businesses?.business_name || 'Unknown'}</p>
                                                <div className="flex items-center gap-1 mt-0.5">{renderStars(review.rating)}</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(review.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 italic border-l-2 border-orange-200 pl-3 mb-4 line-clamp-2">&ldquo;{review.review || 'No text'}&rdquo;</p>
                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarFallback className="text-[8px]">{review.rider_profiles?.users?.full_name?.substring(0, 2).toUpperCase() || 'NA'}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[11px] text-muted-foreground font-medium">{review.rider_profiles?.users?.full_name || 'Anonymous'}</span>
                                        </div>
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="sm" onClick={() => setDetailReview(review)} className="h-8 px-2 text-xs text-blue-600 gap-1.5"><Eye className="h-3.5 w-3.5" /> View</Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(review.id)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <Card className="border-0 shadow-sm"><CardContent className="py-20 text-center text-muted-foreground"><MessageSquare className="h-10 w-10 mx-auto opacity-20 mb-3" />No reviews found</CardContent></Card>
                        )}
                    </div>
                </TabsContent>

                {/* REPORTED REVIEWS CONTENT */}
                <TabsContent value="reported" className="space-y-3">
                    {/* Desktop Table */}
                    <Card className="border-0 shadow-sm hidden md:block overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-semibold">Business</TableHead>
                                    <TableHead className="font-semibold">Reported By</TableHead>
                                    <TableHead className="font-semibold">Reason</TableHead>
                                    <TableHead className="font-semibold">Review Snippet</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredReported.length > 0 ? filteredReported.map((report) => (
                                    <TableRow key={report.report_id} className={`hover:bg-gray-50/50 transition-colors ${report.report_status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                                        <TableCell className="font-medium whitespace-nowrap">{report.review?.business_name || '-'}</TableCell>
                                        <TableCell className="text-sm whitespace-nowrap">{report.reported_by || 'Unknown'}</TableCell>
                                        <TableCell className="max-w-[150px]"><p className="text-sm text-red-600 font-medium truncate">{report.reason || '-'}</p></TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <p className="text-sm truncate opacity-70 italic">&ldquo;{report.review?.review || '-'}&rdquo;</p>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${reportStatusBadge(report.report_status)} uppercase tracking-wider`}>
                                                {report.report_status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {report.report_status === 'pending' ? (
                                                <Button size="sm" variant="default" onClick={() => { setActionReport(report); setActionType(''); setNoticeMessage('') }} className="h-8 bg-orange-600 hover:bg-orange-700 text-xs gap-1.5">
                                                    <ShieldAlert className="h-3.5 w-3.5" /> Action
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground bg-gray-100 px-2.5 py-1 rounded-md">Handled</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground"><Flag className="h-10 w-10 mx-auto opacity-20 mb-3" />No reports found</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredReported.length > 0 ? filteredReported.map((report) => (
                            <Card key={report.report_id} className={`border-0 shadow-sm overflow-hidden ${report.report_status === 'pending' ? 'border-l-4 border-amber-500' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle className="h-3.5 w-3.5" /></div>
                                            <p className="font-bold text-sm tracking-tight">{report.review?.business_name || 'Business'}</p>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${reportStatusBadge(report.report_status)} uppercase`}>
                                            {report.report_status}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-red-50/50 rounded-lg mb-4">
                                        <p className="text-[10px] uppercase font-bold text-red-800 tracking-wider mb-1">Reason for report</p>
                                        <p className="text-sm font-medium text-red-900 leading-snug">{report.reason || 'No reason specified'}</p>
                                        <p className="text-[10px] text-red-600 mt-2">By: {report.reported_by || 'Unknown'}</p>
                                    </div>
                                    <div className="opacity-60 mb-4 bg-gray-50 p-2 rounded border border-dashed text-sm italic">
                                        &ldquo;{report.review?.review || 'No text snippet'}&rdquo;
                                    </div>
                                    <div className="flex justify-end pt-3 border-t border-gray-100 mt-auto">
                                        {report.report_status === 'pending' ? (
                                            <Button size="sm" onClick={() => { setActionReport(report); setActionType(''); setNoticeMessage('') }} className="w-full bg-orange-600 hover:bg-orange-700 text-xs font-bold gap-2 py-5">
                                                <ShieldAlert className="h-4 w-4" /> TAKE ACTION ON REPORT
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-2 text-muted-foreground py-2 text-xs font-medium">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" /> This report has been handled
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <Card className="border-0 shadow-sm"><CardContent className="py-20 text-center text-muted-foreground"><Flag className="h-10 w-10 mx-auto opacity-20 mb-3" />No reports found</CardContent></Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ========== DIALOGS ========== */}

            {/* Review Detail Dialog */}
            <Dialog open={!!detailReview} onOpenChange={() => setDetailReview(null)}>
                <DialogContent className="w-[95%] sm:max-w-md p-5 rounded-2xl overflow-y-auto">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <MessageSquare className="h-5 w-5 text-orange-600" /> Review Details
                        </DialogTitle>
                    </DialogHeader>
                    {detailReview && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center text-orange-500 flex-shrink-0">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 leading-none mb-1.5">{detailReview.vendor_businesses?.business_name || 'Unknown'}</p>
                                    <div className="flex gap-0.5">{renderStars(detailReview.rating)}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><User className="h-3 w-3" /> Reviewer</p>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]">{detailReview.rider_profiles?.users?.full_name?.substring(0,2)}</AvatarFallback></Avatar>
                                        <p className="text-sm font-semibold">{detailReview.rider_profiles?.users?.full_name || 'Anonymous'}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-orange-50/30 rounded-xl border border-orange-100/50">
                                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">Comment</p>
                                    <p className="text-sm leading-relaxed text-slate-700 italic font-medium">&ldquo;{detailReview.review || 'No comment provided'}&rdquo;</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Posted At</p>
                                    <p className="text-sm font-medium">{new Date(detailReview.created_at).toLocaleString('en-IN')}</p>
                                </div>
                                {detailReview.image_url && (
                                    <div className="rounded-xl overflow-hidden border">
                                        <img src={detailReview.image_url} alt="Review attachment" className="w-full h-auto object-cover max-h-48" />
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="flex flex-row gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setDetailReview(null)}>Close</Button>
                                <Button variant="destructive" className="flex-1 gap-2" onClick={() => { handleDelete(detailReview.id); setDetailReview(null) }}>
                                    <Trash2 className="h-4 w-4" /> Delete
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Report Action Dialog */}
            <Dialog open={!!actionReport} onOpenChange={() => setActionReport(null)}>
                <DialogContent className="w-[95%] sm:max-w-md p-5 rounded-2xl overflow-y-auto max-h-[95vh]">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="flex items-center gap-2 text-lg text-red-700">
                            <ShieldAlert className="h-5 w-5" /> Moderation Action
                        </DialogTitle>
                        <DialogDescription className="text-xs">Take action on this reported review after verification</DialogDescription>
                    </DialogHeader>
                    {actionReport && (
                        <div className="space-y-4 py-2">
                            {/* Report Context */}
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Flag className="h-3 w-3 text-red-600" />
                                    <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest leading-none">Report Reason</p>
                                </div>
                                <p className="text-sm font-bold text-red-950 leading-tight mb-2">{actionReport.reason}</p>
                                <p className="text-[10px] text-red-700/60 font-medium">By: {actionReport.reported_by} • {formatDate(actionReport.reported_at)}</p>
                            </div>

                            {/* Original Review Snippet */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Original Review</p>
                                    <div className="flex">{renderStars(actionReport.review?.rating || 0)}</div>
                                </div>
                                <p className="text-xs text-slate-700 italic border-l-2 border-slate-300 pl-3 leading-relaxed mb-2">&ldquo;{actionReport.review?.review}&rdquo;</p>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                    <span>By: {actionReport.review?.reviewer_name}</span>
                                    <span className="bg-white border rounded px-1.5 py-0.5">{actionReport.review?.business_name}</span>
                                </div>
                            </div>

                            {/* Action Chooser */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Outcome</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'dismissed', label: 'Dismiss', icon: XCircle, color: 'slate' },
                                        { id: 'reviewed', label: 'Mark Appr.', icon: CheckCircle2, color: 'blue' },
                                        { id: 'delete', label: 'Delete', icon: Trash2, color: 'red' },
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActionType(item.id)}
                                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all gap-1 ${actionType === item.id ? `border-${item.color}-500 bg-${item.color}-50` : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200'}`}
                                        >
                                            <item.icon className={`h-4.5 w-4.5 ${actionType === item.id ? `text-${item.color}-600` : 'text-slate-400'}`} />
                                            <span className={`text-[10px] font-bold ${actionType === item.id ? `text-${item.color}-700` : 'text-slate-500'}`}>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Optional Notice */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reviewer Notice (Optional)</label>
                                    {actionType === 'delete' && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded">Recommended</span>}
                                </div>
                                <Textarea
                                    placeholder="Enter a message to the reviewer explaining the action..."
                                    className="text-sm rounded-xl resize-none min-h-[80px]"
                                    value={noticeMessage}
                                    onChange={(e) => setNoticeMessage(e.target.value)}
                                />
                                <p className="text-[9px] text-muted-foreground leading-tight">This message will be sent as a push notification and system notice to the rider.</p>
                            </div>

                            <DialogFooter className="flex flex-row gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setActionReport(null)}>Cancel</Button>
                                <Button
                                    className={`flex-1 font-bold ${actionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                                    disabled={!actionType || actionLoading}
                                    onClick={handleReportAction}
                                >
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    {actionType === 'delete' ? 'DELETE & NOTIFY' : 'CONFIRM ACTION'}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
