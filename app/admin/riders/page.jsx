'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Bike, Search, Users, Trophy, MapPin, RefreshCw, Eye, Ban, CheckCircle2, ShieldAlert, Activity } from 'lucide-react'
import { toast } from 'sonner'

export default function RidersPage() {
    const [riders, setRiders] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [detailRider, setDetailRider] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchRiders() }, [])

    const fetchRiders = async () => {
        try {
            const res = await fetch('/api/admin/riders', { headers })
            if (res.ok) setRiders(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const filtered = riders.filter(r => {
        const name = r.users?.full_name?.toLowerCase() || ''
        const mobile = r.users?.mobile?.toLowerCase() || ''
        const email = r.users?.email?.toLowerCase() || ''
        const matchSearch = name.includes(searchTerm.toLowerCase()) || mobile.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase())
        const matchStatus = statusFilter === 'all' || (statusFilter === 'suspended' ? r.suspended : !r.suspended)
        return matchSearch && matchStatus
    })

    const totalRiders = riders.length
    const activeRiders = riders.filter(r => !r.suspended).length
    const suspendedRiders = riders.filter(r => r.suspended).length
    const totalXP = riders.reduce((a, r) => a + (Number(r.xp) || 0), 0)
    const totalDistance = riders.reduce((a, r) => a + (Number(r.total_distance) || 0), 0)

    const handleSuspend = async (rider, suspend) => {
        const action = suspend ? 'suspend' : 'reinstate'
        if (!confirm(`${suspend ? 'Suspend' : 'Reinstate'} ${rider.users?.full_name || 'this rider'}?`)) return
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/riders', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ rider_id: rider.id, suspended: suspend })
            })
            if (!res.ok) throw new Error()
            toast.success(`Rider ${action}d successfully`)
            fetchRiders()
            if (detailRider?.id === rider.id) {
                setDetailRider({ ...detailRider, suspended: suspend })
            }
        } catch { toast.error(`Failed to ${action} rider`) }
        finally { setActionLoading(false) }
    }

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

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
                    <h2 className="text-3xl font-bold tracking-tight">Rider Management</h2>
                    <p className="text-muted-foreground">View rider profiles, manage accounts, and monitor activity</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchRiders} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Users className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{totalRiders}</p><p className="text-xs text-muted-foreground">Total Riders</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{activeRiders}</p><p className="text-xs text-muted-foreground">Active</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Ban className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{suspendedRiders}</p><p className="text-xs text-muted-foreground">Suspended</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><MapPin className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{Math.round(totalDistance).toLocaleString()} km</p><p className="text-xs text-muted-foreground">Total Distance</p></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name, mobile, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Riders</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Riders Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="font-semibold">Rider</TableHead>
                                <TableHead className="font-semibold">Contact</TableHead>
                                <TableHead className="font-semibold">Level & XP</TableHead>
                                <TableHead className="font-semibold">Activity</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold">Joined</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((rider) => (
                                <TableRow key={rider.id} className={`hover:bg-gray-50/50 transition-colors ${rider.suspended ? 'opacity-60' : ''}`}>
                                    <TableCell>
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={rider.users?.profile_image_url || ''} />
                                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-400 text-white text-xs font-semibold">
                                                {rider.users?.full_name?.substring(0, 2).toUpperCase() || 'RD'}
                                            </AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-sm">{rider.users?.full_name || 'Unknown'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm">{rider.users?.mobile || '-'}</p>
                                        <p className="text-xs text-muted-foreground">{rider.users?.email || '-'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                                                Lv {rider.level || 1}
                                            </span>
                                            <span className="text-sm font-medium">{rider.xp || 0} XP</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm">{rider.total_rides || 0} rides</p>
                                        <p className="text-xs text-muted-foreground">{(rider.total_distance || 0).toFixed(1)} km</p>
                                    </TableCell>
                                    <TableCell>
                                        {rider.suspended ? (
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-red-50 text-red-700 border-red-200 flex items-center gap-1 w-fit">
                                                <Ban className="h-3 w-3" /> Suspended
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">
                                                Active
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{formatDate(rider.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => setDetailRider(rider)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {rider.suspended ? (
                                                <Button variant="ghost" size="sm" onClick={() => handleSuspend(rider, false)} disabled={actionLoading} className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => handleSuspend(rider, true)} disabled={actionLoading} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Ban className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                                        <Bike className="h-12 w-12 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">{searchTerm || statusFilter !== 'all' ? 'No riders match your filters' : 'No riders found'}</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Rider Detail Dialog */}
            <Dialog open={!!detailRider} onOpenChange={() => setDetailRider(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bike className="h-5 w-5 text-orange-600" /> Rider Profile
                        </DialogTitle>
                    </DialogHeader>
                    {detailRider && (
                        <div className="space-y-4">
                            {/* Avatar & Name */}
                            <div className="flex items-center gap-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4">
                                <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                                    <AvatarImage src={detailRider.users?.profile_image_url || ''} />
                                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-400 text-white text-xl font-bold">
                                        {detailRider.users?.full_name?.substring(0, 2).toUpperCase() || 'RD'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-lg font-bold">{detailRider.users?.full_name || 'Unknown'}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">Level {detailRider.level || 1}</span>
                                        {detailRider.suspended ? (
                                            <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">Suspended</span>
                                        ) : (
                                            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">Active</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <Trophy className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                                    <p className="text-lg font-bold">{detailRider.xp || 0}</p>
                                    <p className="text-[10px] text-muted-foreground">XP Points</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <Activity className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                                    <p className="text-lg font-bold">{detailRider.total_rides || 0}</p>
                                    <p className="text-[10px] text-muted-foreground">Total Rides</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 text-center">
                                    <MapPin className="h-4 w-4 mx-auto text-rose-500 mb-1" />
                                    <p className="text-lg font-bold">{(detailRider.total_distance || 0).toFixed(1)}</p>
                                    <p className="text-[10px] text-muted-foreground">KM Traveled</p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-2">
                                <div className="bg-gray-50 rounded-lg p-3 flex justify-between">
                                    <span className="text-sm text-muted-foreground">Mobile</span>
                                    <span className="text-sm font-medium">{detailRider.users?.mobile || '-'}</span>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 flex justify-between">
                                    <span className="text-sm text-muted-foreground">Email</span>
                                    <span className="text-sm font-medium">{detailRider.users?.email || '-'}</span>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 flex justify-between">
                                    <span className="text-sm text-muted-foreground">Joined</span>
                                    <span className="text-sm font-medium">{formatDate(detailRider.created_at)}</span>
                                </div>
                            </div>

                            {/* Action */}
                            <DialogFooter>
                                {detailRider.suspended ? (
                                    <Button onClick={() => handleSuspend(detailRider, false)} disabled={actionLoading} className="w-full bg-green-600 hover:bg-green-700 gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> {actionLoading ? 'Processing...' : 'Reinstate Rider'}
                                    </Button>
                                ) : (
                                    <Button variant="destructive" onClick={() => handleSuspend(detailRider, true)} disabled={actionLoading} className="w-full gap-2">
                                        <Ban className="h-4 w-4" /> {actionLoading ? 'Processing...' : 'Suspend Rider'}
                                    </Button>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
