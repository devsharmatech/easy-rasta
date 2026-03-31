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
import { Badge } from '@/components/ui/badge'
import { Coins, RefreshCw, Edit3, Save, CheckCircle2, XCircle, Info } from 'lucide-react'
import { toast } from 'sonner'

export default function RewardConfigPage() {
    const [configs, setConfigs] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editValue, setEditValue] = useState('')
    const [actionLoading, setActionLoading] = useState(false)

    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/admin/reward-config', { headers })
            if (res.ok) setConfigs(await res.json())
        } catch (e) {
            console.error(e)
            toast.error('Failed to load reward config')
        } finally {
            setLoading(false)
        }
    }

    const totalConfigs = configs.length
    const activeConfigs = configs.filter(c => c.is_active).length
    const avgPayout = configs.length > 0 ? (configs.reduce((acc, curr) => acc + (curr.reward_paise || 0), 0) / configs.length / 100).toFixed(1) : 0
    const highValue = configs.filter(c => c.reward_paise >= 1500).length

    const handleUpdate = async (id, updates) => {
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/reward-config', {
                method: 'PUT',
                headers,
                body: JSON.stringify({ id, ...updates })
            })
            if (!res.ok) throw new Error()
            toast.success('Configuration updated successfully')
            fetchData()
            setEditingId(null)
        } catch {
            toast.error('Failed to update config')
        } finally {
            setActionLoading(false)
        }
    }

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
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Coins className="h-8 w-8 text-amber-500" /> Reward Payout Config
                    </h2>
                    <p className="text-muted-foreground mt-1">Adjust Rupee (₹) amounts for all community earning activities.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Coins className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{totalConfigs}</p><p className="text-xs text-muted-foreground">Total Actions</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{activeConfigs}</p><p className="text-xs text-muted-foreground">Active Payouts</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Info className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">₹{avgPayout}</p><p className="text-xs text-muted-foreground">Avg. Reward</p></div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
                    <CardContent className="pt-5 pb-4 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Edit3 className="h-5 w-5" /></div>
                            <div><p className="text-2xl font-bold">{highValue}</p><p className="text-xs text-muted-foreground">High Value ({'>='}₹15)</p></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800 font-medium">
                    <p><strong>Note:</strong> Reward values specified here are in <strong>Rupees</strong>. The system automatically converts them to <strong>Paise</strong> for precise database storage. Changes are applied instantly to all new submissions.</p>
                </div>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="font-semibold">Action Key</TableHead>
                                <TableHead className="font-semibold">Category</TableHead>
                                <TableHead className="font-semibold">Current Pay (₹)</TableHead>
                                <TableHead className="font-semibold">Daily Cap?</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {configs.length > 0 ? configs.map((config) => (
                                <TableRow key={config.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell>
                                        <p className="font-bold text-sm text-slate-700 uppercase tracking-tight">{config.action_key.replace(/_/g, ' ')}</p>
                                        <p className="text-[10px] text-muted-foreground">{config.description}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize text-[10px]">{config.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {editingId === config.id ? (
                                            <div className="flex items-center gap-2 max-w-[100px]">
                                                <span className="text-sm font-bold text-slate-400">₹</span>
                                                <Input 
                                                    type="number" 
                                                    value={editValue} 
                                                    onChange={(e) => setEditValue(e.target.value)} 
                                                    className="h-8 text-center font-bold"
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-base font-black text-green-700">₹{config.reward_paise / 100}</p>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {config.daily_cap_applicable ? (
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase">Applicable</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 uppercase">None</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {config.is_active ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Active</Badge>
                                        ) : (
                                            <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Paused</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {editingId === config.id ? (
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0 text-gray-400">
                                                    <XCircle className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleUpdate(config.id, { reward_paise: parseFloat(editValue) * 100 })} disabled={actionLoading} className="h-8 w-8 p-0 text-green-600">
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => { setEditingId(config.id); setEditValue(config.reward_paise / 100); }} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleUpdate(config.id, { is_active: !config.is_active })} disabled={actionLoading} className={`h-8 w-8 p-0 ${config.is_active ? 'text-amber-600' : 'text-green-600'}`}>
                                                    {config.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <Coins className="h-10 w-10 mx-auto text-gray-200 mb-3" />
                                        <p className="font-medium">No reward configurations found</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
