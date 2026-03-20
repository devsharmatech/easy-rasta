'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    LogOut, LayoutDashboard, Store, Bike, Calendar, ShieldCheck, Star,
    Settings, Menu, Package, Bell, Mail, ChevronRight, Sparkles, MapPin, Receipt
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const navSections = [
    {
        title: null,
        items: [
            { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        ]
    },
    {
        title: 'Management',
        items: [
            { href: '/admin/vendors', icon: Store, label: 'Vendors' },
            { href: '/admin/businesses', icon: Store, label: 'Businesses' },
            { href: '/admin/riders', icon: Bike, label: 'Riders' },
            { href: '/admin/products', icon: Package, label: 'Products' },
            { href: '/admin/events', icon: Calendar, label: 'Events' },
            { href: '/admin/messages', icon: Mail, label: 'Messages' },
            { href: '/admin/location-requests', icon: MapPin, label: 'Location Requests' },
            { href: '/admin/expenses', icon: Receipt, label: 'Expenses' },
        ]
    },
    {
        title: 'System',
        items: [
            { href: '/admin/amenities', icon: Settings, label: 'Amenities' },
            { href: '/admin/xp-rules', icon: Sparkles, label: 'XP Rules' },
            { href: '/admin/expense-settings', icon: Receipt, label: 'Expense Settings' },
            { href: '/admin/reviews', icon: Star, label: 'Reviews' },
            { href: '/admin/push-tester', icon: Bell, label: 'Push Tester' },
        ]
    }
]

const SidebarLink = ({ href, icon: Icon, label, active }) => (
    <Link href={href}>
        <div
            className={`
                group flex items-center gap-2.5 px-3 py-[7px] mx-2 rounded-lg text-[13px] font-medium
                transition-all duration-150 cursor-pointer relative
                ${active
                    ? 'bg-white/[0.08] text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }
            `}
        >
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-orange-400 rounded-r-full" />
            )}
            <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-orange-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
            <span className="truncate">{label}</span>
        </div>
    </Link>
)

export default function AdminLayout({ children }) {
    const router = useRouter()
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)
    const [user, setUser] = useState(null)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
        const token = localStorage.getItem('adminToken')
        const storedUser = localStorage.getItem('adminUser')
        if (!token) {
            router.push('/admin/login')
        } else {
            setUser(storedUser ? JSON.parse(storedUser) : { email: 'Admin' })
        }
    }, [router])

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    const handleLogout = () => {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        router.push('/admin/login')
    }

    if (pathname === '/admin/login') return <>{children}</>

    // Prevent hydration error: Don't return null unconditionally for the entire layout.
    // Instead, return a loading placeholder with the EXACT same root structure.
    if (!mounted) {
        return (
            <div className="flex min-h-screen bg-[#f8f9fb]">
                <div className="flex-1 flex flex-col min-h-screen items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <ShieldCheck className="h-10 w-10 text-orange-400 mb-4 opacity-50" />
                        <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    const isActive = (href) => {
        if (href === '/admin/dashboard') return pathname === href
        return pathname.startsWith(href)
    }

    const pageTitle = pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[#0c0d12] text-white select-none">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-4 h-14 flex-shrink-0 border-b border-white/[0.06]">
                <div className="h-8 w-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <div className="leading-tight">
                    <h1 className="text-sm font-bold text-white tracking-tight">EasyRasta</h1>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-[0.12em]">Admin Panel</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 pt-3 pb-2 overflow-y-auto scrollbar-thin">
                {navSections.map((section, si) => (
                    <div key={si} className={si > 0 ? 'mt-4' : ''}>
                        {section.title && (
                            <div className="px-5 mb-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-[0.14em]">
                                {section.title}
                            </div>
                        )}
                        <div className="space-y-[2px]">
                            {section.items.map(item => (
                                <SidebarLink
                                    key={item.href}
                                    {...item}
                                    active={isActive(item.href)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User Footer */}
            <div className="flex-shrink-0 px-3 py-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/[0.03]">
                    <Avatar className="h-7 w-7 border border-orange-500/30">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white text-[10px] font-bold">
                            {user?.email?.charAt(0)?.toUpperCase() || 'A'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-300 truncate">{user?.email || 'Admin'}</p>
                        <p className="text-[9px] text-slate-600 font-medium">Super Admin</p>
                    </div>
                    <button
                        className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        onClick={handleLogout}
                        title="Logout"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="flex min-h-screen bg-[#f8f9fb]">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-[240px] fixed inset-y-0 z-50">
                <SidebarContent />
            </aside>

            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${mobileOpen ? 'visible' : 'invisible'}`}
            >
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setMobileOpen(false)}
                />
                {/* Drawer */}
                <div
                    className={`relative w-[260px] h-full shadow-2xl transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <SidebarContent />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100/80">
                    <div className="h-14 flex items-center justify-between px-4 md:px-6">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden h-8 w-8 text-gray-600 hover:bg-gray-100 rounded-lg"
                                onClick={() => setMobileOpen(true)}
                            >
                                <Menu className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center gap-1.5 text-sm">
                                <span className="text-gray-400 hidden md:inline text-xs">Admin</span>
                                <ChevronRight className="h-3 w-3 text-gray-300 hidden md:inline" />
                                <span className="font-semibold text-gray-800 capitalize text-sm">{pageTitle}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                onClick={handleLogout}
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>

                            <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-gray-100">
                                <Avatar className="h-7 w-7 border border-orange-200">
                                    <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 text-[10px] font-bold">
                                        {user?.email?.charAt(0)?.toUpperCase() || 'A'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="leading-tight">
                                    <p className="text-[12px] font-medium text-gray-700">{user?.full_name || 'Admin'}</p>
                                    <p className="text-[10px] text-gray-400">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>

                {/* Footer */}
                <footer className="h-10 border-t border-gray-100 bg-white flex items-center justify-center px-6 text-[11px] text-gray-400">
                    &copy; {new Date().getFullYear()} EasyRasta
                </footer>
            </div>
        </div>
    )
}
