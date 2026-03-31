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
import { Search, MapPin, RefreshCw, Eye, CheckCircle2, Ban, ShieldCheck, Tag, Zap } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export default function BunkVerificationsPage() {
    const [amenities, setAmenities] = useState([])
    const [offers, setOffers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState('all') // 'all', 'amenity', 'offer'
    const [detailItem, setDetailItem] = useState(null)
    const [actionLoading, setActionLoading] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/admin/bunk-verifications', { headers })
            if (res.ok) {
                const data = await res.json()
                setAmenities(data.amenities || [])
                setOffers(data.offers || [])
            }
        } catch (e) {
            console.error(e)
            toast.error('Failed to load bunk data')
        } finally {
            setLoading(false)
        }
    }

    // Unify items into a single sortable array
    const allItems = [
        ...amenities.map(a => ({ ...a, __type: 'amenity', __title: a.amenity_type?.replace('_', ' ') || 'Amenity' })),
        ...offers.map(o => ({ ...o, __type: 'offer', __title: 'Bunk Offer' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const filtered = allItems.filter(item => {
        const scoutName = item.scout?.full_name?.toLowerCase() || ''
        const placeName = item.profile?.display_name?.toLowerCase() || item.profile?.place_id?.toLowerCase() || ''
        const matchSearch = scoutName.includes(searchTerm.toLowerCase()) || placeName.includes(searchTerm.toLowerCase())
        const matchType = typeFilter === 'all' || item.__type === typeFilter
        return matchSearch && matchType
    })

    const totalItems = allItems.length
    const totalAmenities = amenities.length
    const totalOffers = offers.length

    const handleAction = async (item, action) => {
        if (!confirm(`Are you sure you want to ${action} this ${item.__type}? ${action === 'reject' ? 'This will freeze their reward.' : ''}`)) return
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/bunk-verifications', {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ item_id: item.id, item_type: item.__type, action })
            })
            if (!res.ok) throw new Error()
            toast.success(`${item.__type} ${action === 'verify' ? 'verified' : 'rejected and deleted'} successfully`)
            fetchData()
            setDetailItem(null)
        } catch {
            toast.error(`Failed to ${action} ${item.__type}`)
        } finally {
            setActionLoading(false)
        }
    }

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

    if (loading) return (
        <div className="space-y-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => <Card key={i} className="border-0 shadow-sm"><CardContent className="pt-5 pb-4"><div className="h-16 bg-gray-100 rounded animate-pulse" /></CardContent></Card>)}
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Bunks & Offers</h2>
                    <p className="text-muted-foreground">Verify community amenity photos & submitted offers.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><MapPin className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{totalItems}</p><p className="text-xs text-muted-foreground">Total Submissions</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Zap className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{totalAmenities}</p><p className="text-xs text-muted-foreground">Amenities Found</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><Tag className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{totalOffers}</p><p className="text-xs text-muted-foreground">Offers Spotted</p></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search user or bunk name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Submissions</SelectItem>
                        <SelectItem value="amenity">Amenities</SelectItem>
                        <SelectItem value="offer">Offers</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="font-semibold">Photo</TableHead>
                                <TableHead className="font-semibold">Scout Rider</TableHead>
                                <TableHead className="font-semibold">Bunk & Type</TableHead>
                                <TableHead className="font-semibold">Details</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold">Reported At</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? filtered.map((item) => (
                                <TableRow key={item.__type + item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell>
                                        <div className="h-12 w-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer" onClick={() => setDetailItem(item)}>
                                            {item.photo_url ? (
                                                <Image src={item.photo_url} alt="Submission photo" width={48} height={48} className="object-cover h-full w-full" />
                                            ) : (
                                                <MapPin className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-sm">{item.scout?.full_name || 'Unknown'}</p>
                                        <p className="text-xs text-muted-foreground">{item.scout?.mobile || '-'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm font-medium w-48 truncate">{item.profile?.display_name || item.profile?.place_id}</p>
                                        <span className={`inline-block mt-1 px-1.5 py-0.5 border rounded text-[10px] font-bold capitalize ${item.__type === 'offer' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                            {item.__title}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs max-w-[200px] truncate text-gray-600">
                                            {item.__type === 'offer' ? item.offer_text : 'Visual Verification Required'}
                                        </p>
                                    </TableCell>
                                    <TableCell>
                                        {item.__type === 'amenity' && (
                                            item.verified 
                                                ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">Verified</span> 
                                                : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">Pending</span>
                                        )}
                                        {item.__type === 'offer' && (
                                            item.source === 'admin' 
                                                ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">Approved</span> 
                                                : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">Review</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{formatDate(item.created_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => setDetailItem(item)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        <MapPin className="h-10 w-10 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No Bunk submissions found</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-600" /> Verify {detailItem?.__title}
                        </DialogTitle>
                    </DialogHeader>
                    {detailItem && (
                        <div className="space-y-4">
                            
                            {detailItem.photo_url && (
                                <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden relative">
                                    <Image src={detailItem.photo_url} alt="Submission photo" fill className="object-cover" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Submitted By</p>
                                    <p className="font-semibold">{detailItem.scout?.full_name}</p>
                                    <p className="text-xs text-gray-500">{detailItem.scout?.mobile}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                                    <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-xs font-bold uppercase ${
                                        detailItem.__type === 'amenity' && detailItem.verified ? 'bg-blue-100 text-blue-700' :
                                        detailItem.__type === 'offer' && detailItem.source === 'admin' ? 'bg-blue-100 text-blue-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                        {detailItem.__type === 'amenity' && detailItem.verified ? 'Verified' :
                                         detailItem.__type === 'offer' && detailItem.source === 'admin' ? 'Approved' : 'Pending Review'}
                                    </span>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                                    <p className="text-xs text-muted-foreground mb-1">{detailItem.__type === 'offer' ? 'Spotted Offer Details' : 'Amenity Type'}</p>
                                    {detailItem.__type === 'offer' ? (
                                        <p className="font-medium text-sm whitespace-pre-wrap">{detailItem.offer_text}</p>
                                    ) : (
                                        <p className="font-semibold text-lg capitalize">{detailItem.__title}</p>
                                    )}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                                    <p className="text-xs text-muted-foreground mb-1">Bunk Profile</p>
                                    <p className="font-medium text-sm">{detailItem.profile?.display_name || 'N/A'}</p>
                                    <p className="font-mono text-[10px] mt-0.5 text-gray-500">{detailItem.profile?.place_id}</p>
                                </div>
                            </div>

                            <DialogFooter className="mt-6 flex sm:justify-between w-full">
                                {((detailItem.__type === 'amenity' && !detailItem.verified) || (detailItem.__type === 'offer' && detailItem.source !== 'admin')) ? (
                                    <>
                                        <Button variant="destructive" onClick={() => handleAction(detailItem, 'reject')} disabled={actionLoading} className="gap-2">
                                            <Ban className="h-4 w-4" /> {actionLoading ? 'Processing...' : 'Reject & Freeze'}
                                        </Button>
                                        <Button onClick={() => handleAction(detailItem, 'verify')} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 gap-2">
                                            <CheckCircle2 className="h-4 w-4" /> {actionLoading ? 'Processing...' : 'Verify Content'}
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" onClick={() => setDetailItem(null)} className="w-full">Close window</Button>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
