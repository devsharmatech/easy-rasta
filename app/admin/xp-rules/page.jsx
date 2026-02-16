'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function XPRulesPage() {
    const [rules, setRules] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingRule, setEditingRule] = useState(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const fetchRules = async () => {
        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/xp-rules', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setRules(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRules()
    }, [])

    const handleEdit = (rule) => {
        setEditingRule({ ...rule })
        setDialogOpen(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('adminToken')
            const res = await fetch('/api/admin/xp-rules', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editingRule)
            })

            if (res.ok) {
                setDialogOpen(false)
                fetchRules()
            }
        } catch (error) {
            console.error(error)
        }
    }

    if (loading) return <div>Loading...</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">XP Rules Management</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Rules</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>XP Value</TableHead>
                                <TableHead>Daily Limit</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell className="font-medium">{rule.action_key}</TableCell>
                                    <TableCell>{rule.category}</TableCell>
                                    <TableCell>{rule.xp_value}</TableCell>
                                    <TableCell>{rule.max_per_day || 'Unlimited'}</TableCell>
                                    <TableCell>
                                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                            {rule.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={() => handleEdit(rule)}>Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Rule: {editingRule?.action_key}</DialogTitle>
                    </DialogHeader>
                    {editingRule && (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label>XP Value</Label>
                                <Input
                                    type="number"
                                    value={editingRule.xp_value}
                                    onChange={(e) => setEditingRule({ ...editingRule, xp_value: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Per Day</Label>
                                <Input
                                    type="number"
                                    value={editingRule.max_per_day || ''}
                                    onChange={(e) => setEditingRule({ ...editingRule, max_per_day: e.target.value ? parseInt(e.target.value) : null })}
                                    placeholder="Unlimited"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Label>Active Status</Label>
                                <input
                                    type="checkbox"
                                    checked={editingRule.is_active}
                                    onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                                    className="h-4 w-4"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save Changes</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
