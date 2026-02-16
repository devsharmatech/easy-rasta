'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Calendar, MapPin, Users, Clock, X, Map, Search, Eye, RefreshCw, Loader2,
    IndianRupee, Bike, Trophy, Shield, ChevronRight, ExternalLink,
    CheckCircle, XCircle, CreditCard, Route, Navigation, Gauge, Mountain
} from 'lucide-react'
import { toast } from 'sonner'

export default function EventsPage() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    // Detail modal
    const [detailOpen, setDetailOpen] = useState(false)
    const [detailEvent, setDetailEvent] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}` }

    useEffect(() => { fetchEvents() }, [])

    const fetchEvents = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        try {
            const res = await fetch('/api/admin/events', { headers })
            if (!res.ok) throw new Error()
            setEvents(await res.json())
        } catch { toast.error('Failed to load events') }
        finally { setLoading(false); setRefreshing(false) }
    }

    const fetchEventDetail = async (eventId) => {
        setDetailOpen(true)
        setDetailLoading(true)
        setDetailEvent(null)
        setActiveTab('overview')
        try {
            const res = await fetch(`/api/admin/events?id=${eventId}`, { headers })
            if (!res.ok) throw new Error()
            setDetailEvent(await res.json())
        } catch { toast.error('Failed to load event details') }
        finally { setDetailLoading(false) }
    }

    const updateStatus = async (id, status) => {
        if (!confirm(`Are you sure you want to ${status === 'closed' ? 'close' : status === 'published' ? 'publish' : 'update'} this event?`)) return
        try {
            const res = await fetch('/api/admin/events', {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            })
            if (!res.ok) throw new Error()
            toast.success(`Event ${status === 'closed' ? 'closed' : 'updated'} successfully`)
            fetchEvents()
            if (detailEvent?.id === id) fetchEventDetail(id)
        } catch { toast.error('Failed to update status') }
    }

    // Filtering
    const filtered = events.filter(e => {
        const matchSearch = !searchTerm || e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.host_name?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchStatus = statusFilter === 'all' || e.status === statusFilter
        return matchSearch && matchStatus
    })

    // Stats
    const totalEvents = events.length
    const activeEvents = events.filter(e => e.status === 'published').length
    const totalParticipants = events.reduce((a, b) => a + (b.participant_count || 0), 0)
    const totalRevenue = events.reduce((a, b) => a + (b.total_revenue || 0), 0)

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
    const formatDateTime = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'

    const statusColor = (status) => {
        switch (status) {
            case 'published': return 'bg-green-50 text-green-700 border-green-200'
            case 'closed': return 'bg-red-50 text-red-700 border-red-200'
            case 'draft': return 'bg-amber-50 text-amber-700 border-amber-200'
            default: return 'bg-gray-50 text-gray-700 border-gray-200'
        }
    }

    const difficultyColor = (d) => {
        switch (d) {
            case 'easy': return 'bg-green-50 text-green-700 border-green-200'
            case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'hard': return 'bg-red-50 text-red-700 border-red-200'
            case 'extreme': return 'bg-purple-50 text-purple-700 border-purple-200'
            default: return 'bg-gray-50 text-gray-700 border-gray-200'
        }
    }

    if (loading) return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-xl border shadow-sm h-72 animate-pulse">
                        <div className="h-40 bg-gray-100 rounded-t-xl" />
                        <div className="p-4 space-y-2">
                            <div className="h-4 bg-gray-100 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Events Management</h2>
                    <p className="text-muted-foreground">View events, track participants, and manage ride details</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchEvents(true)} disabled={refreshing} className="gap-2">
                    {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total Events', value: totalEvents, icon: Calendar, gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-600' },
                    { label: 'Active Events', value: activeEvents, icon: CheckCircle, gradient: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
                    { label: 'Total Riders', value: totalParticipants.toLocaleString(), icon: Users, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
                    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', text: 'text-purple-600' },
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
                    <Input placeholder="Search events or host..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground ml-auto">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Event Grid */}
            {filtered.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <CardContent className="text-center py-16 text-muted-foreground">
                        <Map className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                        <p className="font-medium text-gray-900">No events found</p>
                        <p className="text-xs mt-1">Try adjusting your search or filters</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filtered.map((event) => (
                        <div
                            key={event.id}
                            onClick={() => fetchEventDetail(event.id)}
                            className="group bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col h-full"
                        >
                            {/* Image */}
                            <div className="relative h-40 bg-gray-100 overflow-hidden">
                                {event.featured_image ? (
                                    <img src={event.featured_image} alt={event.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
                                        <Map className="h-10 w-10 mb-1" />
                                        <span className="text-[10px]">No Image</span>
                                    </div>
                                )}
                                {/* Status Badge */}
                                <div className="absolute top-2.5 right-2.5">
                                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm capitalize ${statusColor(event.status)}`}>
                                        {event.status}
                                    </span>
                                </div>
                                {/* Participant count */}
                                {event.participant_count > 0 && (
                                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                                        <Users className="h-3 w-3" /> {event.participant_count}
                                    </div>
                                )}
                                {/* Title overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
                                    <h3 className="font-semibold text-white text-sm truncate">{event.title}</h3>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3.5 flex-1 flex flex-col space-y-2">
                                <div className="flex items-center text-xs text-gray-600 gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                                    <span>{formatDate(event.date)}</span>
                                    {event.time && <><span className="text-gray-300">•</span><Clock className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" /><span>{event.time}</span></>}
                                </div>
                                <div className="flex items-center text-xs text-gray-600 gap-1.5">
                                    <div className="h-5 w-5 rounded-full bg-gray-100 border flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {event.host_image ? (
                                            <img src={event.host_image} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-[8px] font-bold text-gray-400">{event.host_name?.charAt(0)}</span>
                                        )}
                                    </div>
                                    <span className="truncate">{event.host_name || 'Unknown'}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
                                    {event.event_type && (
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border capitalize ${event.event_type === 'paid' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                            {event.event_type === 'paid' ? `₹${event.fee}` : 'Free'}
                                        </span>
                                    )}
                                    {event.difficulty && (
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border capitalize ${difficultyColor(event.difficulty)}`}>
                                            {event.difficulty}
                                        </span>
                                    )}
                                    {event.ride_type && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 capitalize">
                                            {event.ride_type}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-3.5 pb-3.5 pt-0 mt-auto flex items-center justify-between">
                                {event.total_revenue > 0 && (
                                    <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
                                        <IndianRupee className="h-3 w-3" /> {event.total_revenue.toLocaleString()}
                                    </span>
                                )}
                                <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-blue-600 hover:bg-blue-50 gap-1 px-2">
                                    View <ChevronRight className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ========== EVENT DETAIL DIALOG ========== */}
            <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setDetailEvent(null) }}>
                <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto p-0 gap-0">
                    <DialogTitle className="sr-only">Event Details</DialogTitle>
                    {detailLoading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                            <div className="text-center">
                                <p className="font-medium text-gray-700">Loading event details</p>
                                <p className="text-sm text-muted-foreground mt-1">Fetching participants, payments, and track info...</p>
                            </div>
                        </div>
                    ) : detailEvent && (
                        <>
                            {/* Hero banner */}
                            <div className="relative h-44 sm:h-56 bg-gray-100 shrink-0">
                                {detailEvent.featured_image ? (
                                    <img src={detailEvent.featured_image} alt={detailEvent.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
                                        <Map className="h-16 w-16" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                <div className="absolute bottom-4 left-5 right-5 sm:left-6 sm:right-6">
                                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-1.5">{detailEvent.title}</h2>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm capitalize ${statusColor(detailEvent.status)}`}>
                                            {detailEvent.status}
                                        </span>
                                        {detailEvent.event_type && (
                                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm text-white capitalize">
                                                {detailEvent.event_type === 'paid' ? `₹${detailEvent.fee} entry` : 'Free Entry'}
                                            </span>
                                        )}
                                        {detailEvent.difficulty && (
                                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm capitalize ${difficultyColor(detailEvent.difficulty)}`}>
                                                {detailEvent.difficulty}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost" size="icon"
                                    className="absolute top-3 right-3 text-white hover:bg-white/20 rounded-full h-8 w-8"
                                    onClick={() => setDetailOpen(false)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="p-5 sm:p-6 space-y-5">
                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Participants', value: detailEvent.stats?.total_participants || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                                        { label: 'Revenue', value: `₹${(detailEvent.stats?.total_revenue || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' },
                                        { label: 'Paid', value: detailEvent.stats?.paid_count || 0, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
                                    ].map((s, i) => (
                                        <div key={i} className={`rounded-xl p-3 ${s.bg}`}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                                                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{s.label}</span>
                                            </div>
                                            <p className={`text-lg sm:text-xl font-bold ${s.color}`}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Tab Navigation */}
                                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
                                    {[
                                        { key: 'overview', label: 'Overview', icon: Eye },
                                        { key: 'participants', label: `Participants (${detailEvent.participants?.length || 0})`, shortLabel: `Riders (${detailEvent.participants?.length || 0})`, icon: Users },
                                        { key: 'track', label: 'Track & Route', shortLabel: 'Track', icon: Route },
                                    ].map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <tab.icon className="h-4 w-4" />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                            <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* ─── OVERVIEW TAB ─── */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-5">
                                        {/* Event Info Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                                                <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-orange-500" /> {formatDate(detailEvent.date)}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Time</label>
                                                <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-orange-500" /> {detailEvent.time || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ride Type</label>
                                                <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5">
                                                    <Bike className="h-3.5 w-3.5 text-orange-500" /> {detailEvent.ride_type || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Distance</label>
                                                <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5">
                                                    <Route className="h-3.5 w-3.5 text-orange-500" /> {detailEvent.total_distance ? `${detailEvent.total_distance} km` : 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {detailEvent.description && (
                                            <div>
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                                                <p className="text-sm text-gray-700 leading-relaxed mt-1 whitespace-pre-wrap">{detailEvent.description}</p>
                                            </div>
                                        )}

                                        {/* Route Image (Overview) */}
                                        {detailEvent.route_image && (
                                            <div>
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Route Map</label>
                                                <div className="rounded-xl overflow-hidden border bg-gray-50">
                                                    <img src={detailEvent.route_image} alt="Route" className="w-full max-h-72 object-contain" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Host Info */}
                                        <div className="border-t pt-4">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">Host / Organizer</label>
                                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                                <Avatar className="h-12 w-12">
                                                    <AvatarImage src={detailEvent.host?.profile_image_url || ''} />
                                                    <AvatarFallback className="bg-orange-100 text-orange-700 font-bold">
                                                        {detailEvent.host?.full_name?.substring(0, 2)?.toUpperCase() || 'UN'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm">{detailEvent.host?.full_name || 'Unknown'}</p>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap mt-0.5">
                                                        {detailEvent.host?.mobile && <span>📞 {detailEvent.host.mobile}</span>}
                                                        {detailEvent.host?.email && <span>📧 {detailEvent.host.email}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right space-y-0.5">
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Trophy className="h-3 w-3 text-amber-500" /> Level {detailEvent.host?.level || 1}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Bike className="h-3 w-3 text-blue-500" /> {detailEvent.host?.total_rides || 0} rides
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ─── PARTICIPANTS TAB ─── */}
                                {activeTab === 'participants' && (
                                    <div className="space-y-3">
                                        {detailEvent.participants?.length > 0 ? (
                                            <>
                                                {/* Desktop table */}
                                                <div className="border rounded-xl overflow-hidden hidden sm:block">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-gray-50/50">
                                                                <TableHead className="text-xs font-semibold">Rider</TableHead>
                                                                <TableHead className="text-xs font-semibold">Vehicle</TableHead>
                                                                <TableHead className="text-xs font-semibold">Payment</TableHead>
                                                                <TableHead className="text-xs font-semibold">Consents</TableHead>
                                                                <TableHead className="text-xs font-semibold">Joined</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {detailEvent.participants.map((p) => (
                                                                <TableRow key={p.id} className="text-sm">
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2.5">
                                                                            <Avatar className="h-8 w-8">
                                                                                <AvatarImage src={p.rider?.profile_image_url || ''} />
                                                                                <AvatarFallback className="text-[10px] bg-gray-100 font-semibold">
                                                                                    {p.rider?.full_name?.substring(0, 2)?.toUpperCase() || '??'}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <div>
                                                                                <p className="text-xs font-semibold">{p.rider?.full_name || 'Unknown'}</p>
                                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                                                    {p.rider?.mobile && <span>{p.rider.mobile}</span>}
                                                                                    {p.rider?.email && <span className="truncate max-w-[120px]">{p.rider.email}</span>}
                                                                                </div>
                                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                                    <span className="flex items-center gap-0.5"><Trophy className="h-2.5 w-2.5 text-amber-500" /> Lv{p.rider?.level || 1}</span>
                                                                                    <span className="flex items-center gap-0.5"><Bike className="h-2.5 w-2.5 text-blue-500" /> {p.rider?.total_rides || 0} rides</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {p.vehicle ? (
                                                                            <div className="flex items-center gap-2">
                                                                                {p.vehicle.image_url && (
                                                                                    <div className="h-8 w-8 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                                                                                        <img src={p.vehicle.image_url} alt="" className="h-full w-full object-cover" />
                                                                                    </div>
                                                                                )}
                                                                                <div>
                                                                                    <p className="text-xs font-medium">{p.vehicle.nickname || `${p.vehicle.make} ${p.vehicle.model}`}</p>
                                                                                    <p className="text-[10px] text-muted-foreground capitalize">{p.vehicle.type}</p>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground">—</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {p.payment ? (
                                                                            <div>
                                                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${p.payment.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : p.payment.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                                    ₹{p.payment.amount} • {p.payment.status}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">Free</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span title="Safety Consent">{p.consent_safety ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}</span>
                                                                            <span title="Liability Consent">{p.consent_liability ? <Shield className="h-3.5 w-3.5 text-green-500" /> : <Shield className="h-3.5 w-3.5 text-red-400" />}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                                        {formatDateTime(p.joined_at)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                {/* Mobile cards */}
                                                <div className="sm:hidden space-y-2.5">
                                                    {detailEvent.participants.map((p) => (
                                                        <div key={p.id} className="border rounded-xl p-3 space-y-2.5">
                                                            {/* Rider header */}
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar className="h-10 w-10">
                                                                    <AvatarImage src={p.rider?.profile_image_url || ''} />
                                                                    <AvatarFallback className="text-xs bg-orange-100 text-orange-700 font-bold">
                                                                        {p.rider?.full_name?.substring(0, 2)?.toUpperCase() || '??'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold">{p.rider?.full_name || 'Unknown'}</p>
                                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                                                                        {p.rider?.mobile && <span>📞 {p.rider.mobile}</span>}
                                                                        <span className="flex items-center gap-0.5"><Trophy className="h-2.5 w-2.5 text-amber-500" /> Lv{p.rider?.level || 1}</span>
                                                                        <span className="flex items-center gap-0.5"><Bike className="h-2.5 w-2.5 text-blue-500" /> {p.rider?.total_rides || 0}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Vehicle + Payment row */}
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0">
                                                                    <Bike className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                                    <span className="truncate">{p.vehicle ? (p.vehicle.nickname || `${p.vehicle.make} ${p.vehicle.model}`) : 'No vehicle'}</span>
                                                                </div>
                                                                {p.payment ? (
                                                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize whitespace-nowrap ${p.payment.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                                        ₹{p.payment.amount} • {p.payment.status}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">Free</span>
                                                                )}
                                                            </div>
                                                            {/* Footer */}
                                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span title="Safety">{p.consent_safety ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-400" />}</span>
                                                                    <span title="Liability">{p.consent_liability ? <Shield className="h-3 w-3 text-green-500" /> : <Shield className="h-3 w-3 text-red-400" />}</span>
                                                                    <span>Consents</span>
                                                                </div>
                                                                <span>{formatDateTime(p.joined_at)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Users className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                                                <p className="text-sm font-medium">No participants yet</p>
                                                <p className="text-xs">No riders have joined this event</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─── TRACK & ROUTE TAB ─── */}
                                {activeTab === 'track' && (
                                    <div className="space-y-4">
                                        {/* Route Image */}
                                        {detailEvent.route_image && (
                                            <div>
                                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Route Map</label>
                                                <div className="rounded-xl overflow-hidden border bg-gray-50">
                                                    <img src={detailEvent.route_image} alt="Route" className="w-full max-h-72 object-contain" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Coordinates */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Meeting Point */}
                                            {(detailEvent.meeting_lat || detailEvent.meeting_long) && (
                                                <div className="bg-green-50 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                                            <Navigation className="h-4 w-4 text-green-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-green-800">Meeting Point</p>
                                                            <p className="text-[10px] text-green-600">Start location</p>
                                                        </div>
                                                    </div>
                                                    <code className="text-xs bg-white/60 border border-green-200 px-2 py-1 rounded block select-all">
                                                        {detailEvent.meeting_lat}, {detailEvent.meeting_long}
                                                    </code>
                                                    <a
                                                        href={`https://www.google.com/maps?q=${detailEvent.meeting_lat},${detailEvent.meeting_long}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-green-700 font-medium flex items-center gap-1 mt-2 hover:underline"
                                                    >
                                                        <ExternalLink className="h-3 w-3" /> Open in Google Maps
                                                    </a>
                                                </div>
                                            )}

                                            {/* End Point */}
                                            {(detailEvent.end_lat || detailEvent.end_long) && (
                                                <div className="bg-red-50 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                                                            <MapPin className="h-4 w-4 text-red-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-red-800">End Point</p>
                                                            <p className="text-[10px] text-red-600">Destination</p>
                                                        </div>
                                                    </div>
                                                    <code className="text-xs bg-white/60 border border-red-200 px-2 py-1 rounded block select-all">
                                                        {detailEvent.end_lat}, {detailEvent.end_long}
                                                    </code>
                                                    <a
                                                        href={`https://www.google.com/maps?q=${detailEvent.end_lat},${detailEvent.end_long}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="text-[10px] text-red-700 font-medium flex items-center gap-1 mt-2 hover:underline"
                                                    >
                                                        <ExternalLink className="h-3 w-3" /> Open in Google Maps
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ride Details */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Route className="h-3.5 w-3.5 text-blue-500" />
                                                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Distance</span>
                                                </div>
                                                <p className="text-lg font-bold text-blue-600">{detailEvent.total_distance ? `${detailEvent.total_distance} km` : 'N/A'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Gauge className="h-3.5 w-3.5 text-amber-500" />
                                                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Difficulty</span>
                                                </div>
                                                <p className="text-lg font-bold text-amber-600 capitalize">{detailEvent.difficulty || 'N/A'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Bike className="h-3.5 w-3.5 text-orange-500" />
                                                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">Ride Type</span>
                                                </div>
                                                <p className="text-lg font-bold text-orange-600 capitalize">{detailEvent.ride_type || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* No track info fallback */}
                                        {!detailEvent.route_image && !detailEvent.meeting_lat && !detailEvent.end_lat && (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Route className="h-10 w-10 mx-auto text-gray-200 mb-2" />
                                                <p className="text-sm font-medium">No track information</p>
                                                <p className="text-xs">Route details not provided for this event</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="border-t pt-4 flex flex-col sm:flex-row gap-2">
                                    {detailEvent.status !== 'published' && detailEvent.status !== 'closed' && (
                                        <Button onClick={() => updateStatus(detailEvent.id, 'published')} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                            <CheckCircle className="h-4 w-4" /> Publish
                                        </Button>
                                    )}
                                    {detailEvent.status !== 'closed' && (
                                        <Button variant="destructive" onClick={() => updateStatus(detailEvent.id, 'closed')} className="gap-2">
                                            <XCircle className="h-4 w-4" /> Close Event
                                        </Button>
                                    )}
                                    <Button variant="outline" onClick={() => setDetailOpen(false)} className="sm:ml-auto">Close</Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
